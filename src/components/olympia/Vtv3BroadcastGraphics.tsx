"use client";

import React, { useRef, useState, useEffect, useLayoutEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ROUND_LABELS, type HostAction, type OlympiaState, type Seat, type TimerState } from "@/lib/olympia/types";
import { parseVcnvAnswer, cleanVcnvWord, stripVcnvLetterCount, getVcnvUnit } from "@/lib/olympia/engine";
import { activeSeats, seatName, SEAT_COLORS } from "./ui";
import { OlympiaBroadcastVideo } from "./OlympiaBroadcastVideo";
import { getPreloadedVideoUrl } from "@/lib/olympia/assetCache";
import { HopeStarBadge } from "./HopeStarBadge";

/**
 * BLUFFTITLER-STYLE BOUNDED TEXT (Scales horizontally to fit without ellipsis / truncation)
 */
export function BoundedText({
  text,
  className = "",
  style = {},
  align = "center",
}: {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  align?: "center" | "left" | "right";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [scaleX, setScaleX] = useState<number>(1);

  useLayoutEffect(() => {
    const update = () => {
      if (containerRef.current && textRef.current) {
        const cW = containerRef.current.clientWidth;
        const sW = textRef.current.scrollWidth;
        if (sW > cW && cW > 0) {
          setScaleX(Math.max(0.25, cW / sW));
        } else {
          setScaleX(1);
        }
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [text]);

  const origin = align === "left" ? "left center" : align === "right" ? "right center" : "center center";

  return (
    <div
      ref={containerRef}
      className={`w-full overflow-hidden flex items-center ${
        align === "left" ? "justify-start" : align === "right" ? "justify-end" : "justify-center"
      } ${className}`}
      style={style}
    >
      <span
        ref={textRef}
        style={{
          display: "inline-block",
          whiteSpace: "nowrap",
          transformOrigin: origin,
          transform: scaleX < 1 ? `scaleX(${scaleX})` : "none",
        }}
      >
        {text}
      </span>
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AUTHENTIC VTV3 CHALKBOARD BACKGROUND WITH SCIENCE & MATH DOODLES
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function Vtv3ChalkboardBackdrop({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden select-none z-0 ${className}`}>
      {/* Deep blue slate chalkboard background */}
      <div className="absolute inset-0 bg-[#080d19]" />

      {/* Radial lighting vignette (faint illumination in the center) */}
      <div
        className="absolute inset-0 opacity-85"
        style={{
          background:
            "radial-gradient(ellipse at 50% 48%, #101c30 0%, #0a1322 50%, #040810 100%)",
        }}
      />

      {/* Fine chalk dust noise texture simulation */}
      <div
        className="absolute inset-0 opacity-25 mix-blend-overlay"
        style={{
          backgroundImage:
            "radial-gradient(#ffffff 0.75px, transparent 0.75px), radial-gradient(#ffffff 0.75px, #080d19 0.75px)",
          backgroundSize: "30px 30px",
          backgroundPosition: "0 0, 15px 15px",
        }}
      />

      {/* Chalk-drawn mathematical formulas, physics constants, & scientific apparatus */}
      <svg
        className="absolute inset-0 w-full h-full opacity-20 text-slate-200"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Top Region Formulas */}
        <text x="3%" y="9%" fontFamily="monospace" fontSize="22" fontWeight="bold" fill="currentColor">
          cos(-x) = cos(x)
        </text>
        <text x="35%" y="8%" fontFamily="monospace" fontSize="21" fontWeight="bold" fill="currentColor">
          cos(-x) = cos(x)
        </text>
        <text x="68%" y="9%" fontFamily="monospace" fontSize="25" fontWeight="bold" fill="currentColor">
          cos(-x) = cos(x)
        </text>
        <text x="89%" y="11%" fontFamily="monospace" fontSize="20" fill="currentColor">
          E = mc²
        </text>

        {/* Mid-Upper Region Formulas */}
        <text x="4%" y="38%" fontFamily="monospace" fontSize="20" fill="currentColor">
          cos(-x) = cos(x)
        </text>
        <text x="88%" y="32%" fontFamily="monospace" fontSize="21" fill="currentColor">
          π ≈ 3.14159
        </text>
        <text x="86%" y="46%" fontFamily="monospace" fontSize="20" fill="currentColor">
          F = G·(m₁m₂)/r²
        </text>

        {/* Lower Region Formulas */}
        <text x="3%" y="68%" fontFamily="monospace" fontSize="21" fill="currentColor">
          cos(-x) = cos(x)
        </text>
        <text x="32%" y="93%" fontFamily="monospace" fontSize="19" fill="currentColor">
          a² + 2ab + b² = (a+b)²
        </text>
        <text x="76%" y="82%" fontFamily="monospace" fontSize="24" fill="currentColor">
          Δ = b² - 4ac
        </text>

        {/* Left Side: Microscope Sketch */}
        <g transform="translate(45, 175) scale(0.68)" stroke="currentColor" strokeWidth="2.4" fill="none">
          <line x1="80" y1="20" x2="60" y2="80" />
          <line x1="90" y1="23" x2="70" y2="83" />
          <rect x="75" y="10" width="20" height="15" rx="3" />
          <circle cx="50" cy="110" r="16" />
          <line x1="45" y1="125" x2="38" y2="155" />
          <line x1="55" y1="125" x2="62" y2="155" />
          <line x1="18" y1="170" x2="92" y2="170" strokeWidth="4" />
          <path d="M 65 110 C 100 130, 100 210, 60 230" />
          <rect x="15" y="230" width="90" height="12" rx="4" />
        </g>

        {/* Chemical Flask & Graduated Cylinder */}
        <g transform="translate(95, 340) scale(0.62)" stroke="currentColor" strokeWidth="2.4" fill="none">
          <path d="M 30 10 L 30 40 L 10 110 A 10 10 0 0 0 20 120 L 70 120 A 10 10 0 0 0 80 110 L 60 40 L 60 10 Z" />
          <line x1="25" y1="10" x2="65" y2="10" strokeWidth="3" />
          <path d="M 22 90 Q 45 80, 68 90" strokeDasharray="4 4" />
          <circle cx="35" cy="105" r="3" fill="currentColor" />
          <circle cx="52" cy="98" r="4" fill="currentColor" />
        </g>

        {/* Artist Palette & Brush */}
        <g transform="translate(50, 480) scale(0.58)" stroke="currentColor" strokeWidth="2.4" fill="none">
          <path d="M 50 10 C 80 10, 100 35, 95 65 C 90 90, 60 100, 40 85 C 25 75, 10 50, 20 30 C 25 15, 35 10, 50 10 Z" />
          <circle cx="35" cy="35" r="5" />
          <circle cx="55" cy="30" r="5" />
          <circle cx="75" cy="45" r="5" />
          <circle cx="70" cy="70" r="5" />
          <ellipse cx="40" cy="65" rx="8" ry="12" />
        </g>

        {/* Right Side: Geometric Triangle & Angle */}
        <g transform="translate(1730, 230) scale(0.7)" stroke="currentColor" strokeWidth="2.4" fill="none">
          <polygon points="30,140 130,140 130,30" />
          <rect x="110" y="120" width="20" height="20" />
          <path d="M 50 140 A 25 25 0 0 0 45 125" />
          <text x="60" y="132" fontSize="16" fill="currentColor" stroke="none">
            θ
          </text>
        </g>

        {/* Right Side: Atom Model */}
        <g transform="translate(1760, 460) scale(0.65)" stroke="currentColor" strokeWidth="2.4" fill="none">
          <circle cx="60" cy="60" r="8" fill="currentColor" />
          <ellipse cx="60" cy="60" rx="48" ry="18" strokeDasharray="3 3" />
          <ellipse cx="60" cy="60" rx="18" ry="48" strokeDasharray="3 3" />
          <ellipse cx="60" cy="60" rx="42" ry="42" transform="rotate(45 60 60)" />
        </g>

        {/* Right Side: Globe / Sphere */}
        <g transform="translate(1740, 640) scale(0.6)" stroke="currentColor" strokeWidth="2.4" fill="none">
          <circle cx="60" cy="60" r="45" />
          <ellipse cx="60" cy="60" rx="45" ry="18" strokeDasharray="3 3" />
          <ellipse cx="60" cy="60" rx="18" ry="45" />
          <line x1="15" y1="60" x2="105" y2="60" />
          <line x1="60" y1="15" x2="60" y2="105" />
        </g>
      </svg>
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * HORIZONTAL MOUNTING BRASS ROD (Mounted behind VTV3 broadcast frames)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function HorizontalBrassRod() {
  return (
    <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-[120vw] min-w-[2200px] flex items-center pointer-events-none z-0 overflow-visible">
      {/* Left turned finial cap (extends beyond screen edge in 3D perspective) */}
      <div
        className="w-12 h-10 shrink-0 rounded-l-full border-2 border-amber-300/80 shadow-2xl"
        style={{
          background: "linear-gradient(180deg, #5c2c10 0%, #d97706 30%, #fef08a 50%, #b45309 75%, #3b1a06 100%)",
          boxShadow: "0 6px 20px rgba(0,0,0,0.95), inset 0 2px 3px rgba(255,255,255,0.7)",
        }}
      />
      {/* Central continuous wooden / brass mounting beam spanning edge-to-edge */}
      <div
        className="flex-1 h-5 sm:h-6 shadow-2xl"
        style={{
          background:
            "linear-gradient(180deg, #451a03 0%, #78350f 18%, #fef08a 38%, #ca8a04 55%, #713f12 75%, #291003 100%)",
          boxShadow: "0 8px 30px rgba(0,0,0,0.95), inset 0 1.5px 2.5px rgba(255,255,255,0.75), inset 0 -2px 4px rgba(0,0,0,0.9)",
        }}
      />
      {/* Right turned finial cap (extends beyond screen edge in 3D perspective) */}
      <div
        className="w-12 h-10 shrink-0 rounded-r-full border-2 border-amber-300/80 shadow-2xl"
        style={{
          background: "linear-gradient(180deg, #5c2c10 0%, #d97706 30%, #fef08a 50%, #b45309 75%, #3b1a06 100%)",
          boxShadow: "0 6px 20px rgba(0,0,0,0.95), inset 0 2px 3px rgba(255,255,255,0.7)",
        }}
      />
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CENTRAL VERTICAL BRASS RAIL (Mounted behind answer reveal graphics)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function CentralVerticalBrassRail() {
  return (
    <div className="absolute top-8 bottom-8 left-1/2 -translate-x-1/2 w-6 sm:w-8 flex flex-col items-center pointer-events-none z-0">
      {/* Top brass cap */}
      <div
        className="w-9 h-7 rounded-t-full border border-amber-300/80 shrink-0 shadow-lg"
        style={{
          background: "linear-gradient(90deg, #78350f 0%, #fef08a 40%, #d97706 70%, #451a03 100%)",
        }}
      />
      {/* Vertical brass column */}
      <div
        className="flex-1 w-5 sm:w-6 shadow-2xl"
        style={{
          background:
            "linear-gradient(90deg, #78350f 0%, #fef08a 35%, #d97706 70%, #451a03 100%)",
          boxShadow: "0 0 20px rgba(0,0,0,0.85), inset 1px 0 2px rgba(255,255,255,0.6)",
        }}
      />
      {/* Bottom brass cap */}
      <div
        className="w-9 h-7 rounded-b-full border border-amber-300/80 shrink-0 shadow-lg"
        style={{
          background: "linear-gradient(90deg, #78350f 0%, #fef08a 40%, #d97706 70%, #451a03 100%)",
        }}
      />
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AUTHENTIC RED RIVET CONNECTOR (Ruby jewel connection with white ring)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function RedConnectionRivet() {
  return (
    <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 z-10 shadow-lg">
      {/* Outer chrome ring */}
      <div className="absolute inset-0 rounded-full border-2 border-slate-200 bg-slate-300 shadow-md" />
      {/* Inner glowing ruby dome */}
      <div
        className="relative w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-red-200"
        style={{
          background: "radial-gradient(circle at 35% 30%, #f87171 0%, #dc2626 50%, #991b1b 100%)",
          boxShadow: "0 0 10px #ef4444, inset 0 1px 2px rgba(255,255,255,0.8)",
        }}
      />
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CLASSIC WOODEN BACKING BEAM (Mounted vertically behind answer reveal graphics)
 * Deep dark oak / mahogany timber grain, brass edging, and bronze rivet mountings.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function ClassicWoodenBackingBeam({ className = "" }: { className?: string }) {
  return (
    <div
      className={`absolute top-4 bottom-4 left-1/2 -translate-x-1/2 w-12 sm:w-16 flex flex-col items-center pointer-events-none z-0 ${className}`}
      style={{
        boxShadow: "0 0 40px rgba(0,0,0,0.95)",
      }}
    >
      {/* Top brass mounting bracket & finial */}
      <div
        className="w-16 sm:w-20 h-7 rounded-t-lg border-2 border-amber-300/80 shrink-0 shadow-2xl relative flex items-center justify-center"
        style={{
          background: "linear-gradient(90deg, #5c2c10 0%, #d97706 30%, #fef08a 50%, #b45309 75%, #3b1a06 100%)",
        }}
      >
        <div className="w-2.5 h-2.5 rounded-full bg-amber-200 border border-amber-800 shadow" />
      </div>

      {/* Main vertical timber beam body */}
      <div
        className="flex-1 w-10 sm:w-14 border-x-2 border-amber-600/70 relative shadow-2xl overflow-hidden"
        style={{
          background: "linear-gradient(90deg, #1c0d03 0%, #3a1a06 18%, #572809 38%, #6b320d 50%, #572809 62%, #3a1a06 82%, #140801 100%)",
          boxShadow: "inset 1px 0 2px rgba(254,240,138,0.4), inset -1px 0 2px rgba(0,0,0,0.8), 0 0 25px rgba(0,0,0,0.95)",
        }}
      >
        {/* Subtle longitudinal wood grain lines */}
        <div
          className="absolute inset-0 opacity-25 pointer-events-none"
          style={{
            backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(0,0,0,0.4) 3px, rgba(0,0,0,0.4) 5px)",
          }}
        />
      </div>

      {/* Bottom brass mounting bracket & finial */}
      <div
        className="w-16 sm:w-20 h-7 rounded-b-lg border-2 border-amber-300/80 shrink-0 shadow-2xl relative flex items-center justify-center"
        style={{
          background: "linear-gradient(90deg, #5c2c10 0%, #d97706 30%, #fef08a 50%, #b45309 75%, #3b1a06 100%)",
        }}
      >
        <div className="w-2.5 h-2.5 rounded-full bg-amber-200 border border-amber-800 shadow" />
      </div>
    </div>
  );
}

export const ROUND_VIDEOS: Record<string, string> = {
  khoiDong: "/olympia-intro/khoi_dong.webm",
  vcnv: "/olympia-intro/vuot_chuong_ngai_vat.webm",
  tangToc: "/olympia-intro/tang_toc.webm",
  veDich: "/olympia-intro/ve_dich.webm",
};

export const ROUND_MP4_VIDEOS: Record<string, string> = {
  khoiDong: "/olympia-intro/khoi_dong.mp4",
  vcnv: "/olympia-intro/vuot_chuong_ngai_vat.mp4",
  tangToc: "/olympia-intro/tang_toc.mp4",
  veDich: "/olympia-intro/ve_dich.mp4",
};

export const ROUND_FALLBACK_VIDEOS: Record<string, string> = {
  khoiDong: "/olympia-intro/intro_khoiDong.webm",
  vcnv: "/olympia-intro/intro_vcnv.webm",
  tangToc: "/olympia-intro/intro_tangToc.webm",
  veDich: "/olympia-intro/intro_veDich.webm",
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * BROADCAST ROUND INTRO OVERLAY (Official 7.66s VTV3 3D Video)
 * GPU Hardware Accelerated Dual-Source (MP4 H.264 & WebM VP9 BT.709) with 0% CPU lag.
 * Features an elegant Animated Title Card fallback holding for the full 7.66s duration
 * of section_intro.mp3 on any decode error, preventing premature dismissals or flashing.
 * Plays uniformly across all themes (o26_classic, o26_modern, v3_arrow).
 * Câu Hỏi Phụ (cauHoiPhu) has no intro video or banner.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function BroadcastRoundIntroOverlay({
  state,
  serverNow,
  onDismiss,
}: {
  state: OlympiaState;
  serverNow?: () => number;
  onDismiss?: (opts?: { seq?: number; isSkip?: boolean }) => void;
}) {
  const round = state.currentRound;
  const isChp = round === "cauHoiPhu";
  const isValidRound = Boolean(round && !isChp);

  const mp4Src = isValidRound && round ? (getPreloadedVideoUrl(round, "mp4") || ROUND_MP4_VIDEOS[round] || null) : null;
  const webmSrc = isValidRound && round ? (getPreloadedVideoUrl(round, "webm") || ROUND_VIDEOS[round] || null) : null;

  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const dismissedRef = useRef(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    setIsPlaying(false);
    setHasError(false);
    dismissedRef.current = false;
  }, [round, state.bannerSeq]);

  const handleDismiss = useCallback(
    (opts?: { isSkip?: boolean }) => {
      if (dismissedRef.current && !opts?.isSkip) return;
      dismissedRef.current = true;
      onDismissRef.current?.({ seq: state.bannerSeq, isSkip: opts?.isSkip });
      // Allow retry if server rejected early dismissal (e.g. clock drift guard)
      if (!opts?.isSkip) {
        setTimeout(() => {
          dismissedRef.current = false;
        }, 1500);
      }
    },
    [state.bannerSeq]
  );

  // Video playback timer: counts down once video actually starts playing (onPlaying)
  // Matching 7.66s video duration + 200ms graceful hold
  useEffect(() => {
    if (!isPlaying || hasError || state.stage !== "playing" || !state.banner) return;
    const timer = setTimeout(() => {
      handleDismiss();
    }, 7860);
    return () => clearTimeout(timer);
  }, [isPlaying, hasError, handleDismiss, state.banner, state.stage]);

  // Title Card fallback hold timer: holds for the remainder of 7.86s
  useEffect(() => {
    if (!hasError || state.stage !== "playing" || !state.banner) return;
    const nowMs = serverNow ? serverNow() : Date.now();
    const elapsed = state.bannerStartedAt ? Math.max(0, nowMs - state.bannerStartedAt) : 0;
    const remaining = Math.max(1000, 7860 - elapsed);
    const timer = setTimeout(() => {
      handleDismiss();
    }, remaining);
    return () => clearTimeout(timer);
  }, [hasError, handleDismiss, state.banner, state.stage, state.bannerStartedAt, serverNow]);

  // Safety mount fallback: if video stalls or fails to trigger onPlaying for 9.5s
  useEffect(() => {
    if (state.stage !== "playing" || !state.banner) return;
    const fallbackTimer = setTimeout(() => {
      handleDismiss();
    }, 9500);
    return () => clearTimeout(fallbackTimer);
  }, [state.bannerSeq, state.banner, state.stage, handleDismiss]);

  if (state.stage !== "playing" || !state.banner || isChp || (!mp4Src && !webmSrc)) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black overflow-hidden select-none pointer-events-none">
      {!hasError ? (
        <video
          key={`round-intro-video-${state.bannerSeq ?? 0}`}
          autoPlay
          playsInline
          muted
          loop={false}
          className={`w-full h-full object-cover pointer-events-none transition-opacity duration-300 ${
            isPlaying ? "opacity-100" : "opacity-0"
          }`}
          onPlaying={() => setIsPlaying(true)}
          onEnded={() => handleDismiss()}
          onError={() => {
            console.warn("[BroadcastRoundIntroOverlay] Video decode error detected, engaging broadcast title card fallback");
            setHasError(true);
          }}
        >
          {mp4Src && <source src={mp4Src} type="video/mp4" />}
          {webmSrc && <source src={webmSrc} type="video/webm" />}
        </video>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#020b22] via-[#010410] to-[#000000] z-20 text-center px-4 overflow-hidden pointer-events-none">
          {/* Ambient luminous aura */}
          <div className="absolute w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-[120px] pointer-events-none animate-pulse" />
          <div className="absolute w-[400px] h-[400px] rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none" />

          {/* Laurel & Shield Badge */}
          <div className="relative mb-6 flex items-center justify-center">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-amber-400/60 bg-gradient-to-b from-amber-500/20 to-transparent flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.3)]">
              <img
                src="/brand/olympia_laurel_2016.webp"
                alt="Olympia"
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            </div>
          </div>

          {/* Sub-label */}
          <div className="text-amber-400/90 uppercase tracking-[0.35em] text-xs sm:text-sm font-semibold mb-3 drop-shadow">
            ĐƯỜNG LÊN ĐỈNH OLYMPIA
          </div>

          {/* Main Round Title */}
          <h1
            className="text-4xl sm:text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-amber-100 to-amber-300 tracking-wider uppercase drop-shadow-[0_5px_25px_rgba(245,158,11,0.4)]"
            style={{
              fontFamily: "var(--font-heading, Arial, sans-serif)",
              letterSpacing: "0.06em",
            }}
          >
            {state.banner || (round ? ROUND_LABELS[round] : "")}
          </h1>

          {/* Elegant metallic divider & progress shimmer */}
          <div className="mt-6 w-64 sm:w-96 h-1 rounded-full bg-slate-800 relative overflow-hidden shadow-inner">
            <div
              className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500 rounded-full"
              style={{
                animation: "shimmerSweep 2s ease-in-out infinite, pulse-gold 2s ease-in-out infinite",
                width: "100%",
              }}
            />
          </div>
        </div>
      )}

      {/* Explicit skip button for operators / testing without accidental clicks */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleDismiss({ isSkip: true });
        }}
        className="absolute top-6 right-6 opacity-40 hover:opacity-100 transition-opacity text-white text-xs font-mono bg-black/60 px-3.5 py-1.5 rounded-full border border-white/20 pointer-events-auto cursor-pointer z-30"
        title="Bỏ qua video intro"
      >
        Bỏ qua intro ⏭
      </button>
    </div>
  );
}

/**
 * Fixed standard broadcast question font-size with auto-shrink fallback for very long questions.
 * Guarantees uniform text size across all normal questions (<= 200 chars), smoothly stepping down
 * only when length threatens to overflow graphics boundaries.
 */
export function clampQuestionFont(text: string) {
  const len = text ? text.length : 0;
  // Standard broadcast question font size with Arial Bold (700) to avoid Arial Black substitution
  if (len <= 200) {
    return "text-xl sm:text-2xl md:text-[27px] lg:text-[29px] xl:text-[31px] 2xl:text-[33px] font-bold leading-snug";
  }
  // Auto-shrink when question is very long to prevent overflowing graphics
  if (len <= 320) {
    return "text-lg sm:text-xl md:text-[22px] lg:text-[24px] xl:text-[26px] 2xl:text-[28px] font-bold leading-normal";
  }
  // Safe minimal broadcast floor for extreme essay-length questions
  return "text-base sm:text-lg md:text-[19px] lg:text-[21px] xl:text-[22px] 2xl:text-[24px] font-bold leading-normal";
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * COMPONENT 1: VTV3 CHALKBOARD QUESTION FRAME (Fixed Bottom 1/3 Lower-Third)
 * As seen in Image 1 & Image 2:
 * - Mounted on a horizontal brass rod extending on both sides.
 * - Double gold/bronze metallic border with dark slate chalkboard body.
 * - Glowing red indicator rivet at top left.
 * - Integrated bottom timer progress bar with glowing red pearl tracker.
 * - Fixed height: ~180-210px, fixed width: max-w-5xl/6xl.
 * ─────────────────────────────────────────────────────────────────────────────
 */
function Vtv3BottomEdgeTimerBar({
  timer,
  serverNow,
}: {
  timer?: TimerState | null;
  serverNow: () => number;
}) {
  const fillRef = useRef<HTMLDivElement>(null);
  const pearlRef = useRef<HTMLDivElement>(null);
  const lastPctRef = useRef<number>(0);
  const lastStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (!timer) {
      lastStartRef.current = null;
      lastPctRef.current = 0;
      if (fillRef.current) fillRef.current.style.width = "0%";
      if (pearlRef.current) pearlRef.current.style.display = "none";
      return;
    }

    const total = timer.totalMs || 15000;

    // Timer is paused (buzzer pressed by contestant in CHP or Solo KD)
    if (timer.startedAt == null) {
      lastStartRef.current = null;
      const remMs = Math.max(0, timer.remainingMs ?? 0);
      // Unstarted timer
      if (remMs >= total) {
        lastPctRef.current = 0;
        if (fillRef.current) fillRef.current.style.width = "0%";
        if (pearlRef.current) pearlRef.current.style.display = "none";
        return;
      }
      // Paused timer: FREEZE progress bar and pearl at current position!
      const totalElapsed = Math.max(0, total - remMs);
      const frozenPct = Math.max(0, Math.min(100, (totalElapsed / total) * 100));
      lastPctRef.current = frozenPct;
      const remSec = Math.ceil(remMs / 1000);
      if (fillRef.current) {
        fillRef.current.style.width = `${frozenPct}%`;
        fillRef.current.style.background =
          remSec <= 5
            ? "linear-gradient(90deg, #ef4444, #f43f5e)"
            : "linear-gradient(90deg, #d97706, #f59e0b, #ef4444)";
        fillRef.current.style.boxShadow = remSec <= 5 ? "0 0 12px #ef4444" : "0 0 8px #f59e0b";
      }
      if (pearlRef.current) {
        if (frozenPct > 0 && frozenPct < 100 && remMs > 0) {
          pearlRef.current.style.display = "block";
          pearlRef.current.style.left = `${frozenPct}%`;
        } else {
          pearlRef.current.style.display = "none";
        }
      }
      return;
    }

    if (lastStartRef.current !== timer.startedAt) {
      lastStartRef.current = timer.startedAt;
      const remMs = Math.max(0, timer.remainingMs ?? total);
      const totalElapsed = Math.max(0, total - remMs);
      lastPctRef.current = Math.max(0, Math.min(100, (totalElapsed / total) * 100));
    }

    let rafId: number;
    let active = true;

    const tick = () => {
      if (!active) return;
      const elapsedSinceStart = Math.max(0, serverNow() - (timer.startedAt ?? 0));
      const remMs = Math.max(0, (timer.remainingMs ?? total) - elapsedSinceStart);
      const remSec = Math.ceil(remMs / 1000);
      const totalElapsed = Math.max(0, total - remMs);
      const rawPct = Math.max(0, Math.min(100, (totalElapsed / total) * 100));
      const safePct = Math.max(lastPctRef.current, rawPct);
      lastPctRef.current = safePct;

      if (fillRef.current) {
        fillRef.current.style.width = `${safePct}%`;
        fillRef.current.style.background =
          remSec <= 5
            ? "linear-gradient(90deg, #ef4444, #f43f5e)"
            : "linear-gradient(90deg, #d97706, #f59e0b, #ef4444)";
        fillRef.current.style.boxShadow = remSec <= 5 ? "0 0 12px #ef4444" : "0 0 8px #f59e0b";
      }
      if (pearlRef.current) {
        if (safePct > 0 && safePct < 100 && remMs > 0) {
          pearlRef.current.style.display = "block";
          pearlRef.current.style.left = `${safePct}%`;
        } else {
          pearlRef.current.style.display = "none";
        }
      }

      if (remMs > 0) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      active = false;
      cancelAnimationFrame(rafId);
    };
  }, [timer?.startedAt, timer?.remainingMs, timer?.totalMs, serverNow]);

  return (
    <div className="relative z-30 w-full px-2 pb-0 pt-0 m-0 flex items-center">
      {/* Horizontal Progress Track flush against bottom border */}
      <div className="w-full relative h-2 rounded-full bg-slate-950/90 border border-amber-600/60 overflow-visible shadow-inner flex items-center">
        {/* Progress Fill */}
        <div
          ref={fillRef}
          className="h-full rounded-full will-change-[width]"
          style={{
            width: "0%",
            background: "linear-gradient(90deg, #d97706, #f59e0b, #ef4444)",
            boxShadow: "0 0 8px #f59e0b",
          }}
        />
        {/* Glowing Red/Amber Pearl Head touching bottom edge */}
        <div
          ref={pearlRef}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow-[0_0_12px_#ef4444] pointer-events-none will-change-[left]"
          style={{
            display: "none",
            left: "0%",
            background: "radial-gradient(circle at 35% 30%, #f87171 0%, #dc2626 50%, #991b1b 100%)",
          }}
        />
      </div>
    </div>
  );
}

/** Format remaining milliseconds as compact MM:SS digital clock (e.g. 01:00, 01:30, 00:15). */
export function formatClockMMSS(remMs: number): string {
  const totalSec = Math.max(0, Math.ceil(remMs / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * Specialized Econova Show backdrop (Olympia_22_background) for fullscreen V3 broadcast stages
 * (VCNV onward & fullscreen score summary).
 */
export function Olympia22BackgroundBackdrop({ className = "" }: { className?: string }) {
  return (
    <div
      className={`absolute inset-0 z-0 pointer-events-none select-none overflow-hidden bg-[#040d21] ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/olympia/olympia_22_background.png"
        alt=""
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-[#041028]/25" />
    </div>
  );
}

/**
 * Shared Econova silver trapezoid timer housing (#d1d5db -> #6b7280) with #000 track,
 * #ff0000 0% -> 100% left-to-right progress fill, and pulsing white leading dot.
 */
export function EconovaSpecializedTimerBar({
  timer,
  serverNow,
  defaultTotalMs = 15000,
  height = 22,
  trackMargin = "0 20px",
  clipPath = "polygon(10px 0, calc(100% - 10px) 0, 100% 100%, 0 100%)",
  className = "w-full",
  style,
  clockRef,
  clockFormat = "mmss",
}: {
  timer?: TimerState | null;
  serverNow: () => number;
  defaultTotalMs?: number;
  height?: number;
  trackMargin?: string;
  clipPath?: string;
  className?: string;
  style?: React.CSSProperties;
  clockRef?: React.RefObject<HTMLSpanElement | null>;
  clockFormat?: "mmss" | "sec";
}) {
  const fillRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const formatClock = (remMs: number) => {
      if (clockFormat === "sec") {
        const s = Math.max(0, Math.ceil(remMs / 1000));
        return `${s < 10 ? `0${s}` : s}s`;
      }
      return formatClockMMSS(remMs);
    };

    if (!timer || timer.startedAt == null) {
      const total = Math.max(1, timer?.totalMs || defaultTotalMs);
      const rem = timer ? Math.max(0, Math.min(total, timer.remainingMs ?? total)) : total;
      const pct = timer ? Math.max(0, Math.min(100, ((total - rem) / total) * 100)) : 0;
      if (fillRef.current) fillRef.current.style.width = `${pct}%`;
      if (handleRef.current) handleRef.current.style.display = pct > 0 && rem > 0 ? "block" : "none";
      if (clockRef?.current) clockRef.current.textContent = formatClock(rem);
      return;
    }

    let rafId: number;
    let active = true;

    const tick = () => {
      if (!active) return;
      const total = Math.max(1, timer.totalMs || defaultTotalMs);
      const elapsed = Math.max(0, serverNow() - (timer.startedAt ?? 0));
      const rem = Math.max(0, timer.remainingMs - elapsed);
      const pct = Math.max(0, Math.min(100, ((total - rem) / total) * 100));

      if (fillRef.current) {
        fillRef.current.style.width = `${pct}%`;
      }
      if (handleRef.current) {
        handleRef.current.style.display = pct > 0 && rem > 0 ? "block" : "none";
      }
      if (clockRef?.current) {
        const nextText = formatClock(rem);
        if (clockRef.current.textContent !== nextText) {
          clockRef.current.textContent = nextText;
        }
      }

      if (rem > 0) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      active = false;
      cancelAnimationFrame(rafId);
    };
  }, [timer?.startedAt, timer?.remainingMs, timer?.totalMs, defaultTotalMs, serverNow, clockRef, clockFormat]);

  return (
    <div
      className={`flex items-center pointer-events-none ${className}`}
      style={{
        height,
        background: "linear-gradient(to bottom, #d1d5db, #6b7280)",
        clipPath,
        borderTop: "1px solid rgba(255,255,255,0.45)",
        boxShadow: "0 5px 15px rgba(0,0,0,0.5)",
        ...style,
      }}
    >
      <style>{`
        @keyframes pulse-timer-v3 {
          from { box-shadow: 0 0 6px #fff, 0 0 12px #ff0000; transform: scale(1); }
          to   { box-shadow: 0 0 12px #fff, 0 0 22px #ff0000; transform: scale(1.22); }
        }
      `}</style>
      <div
        className="relative w-full"
        style={{
          height: 8,
          background: "#000000",
          borderRadius: 4,
          margin: trackMargin,
          overflow: "visible",
        }}
      >
        <div
          ref={fillRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "0%",
            height: "100%",
            background: "#ff0000",
            borderRadius: "4px",
          }}
        >
          <div
            ref={handleRef}
            style={{
              display: "none",
              position: "absolute",
              right: "-7px",
              top: "-3px",
              width: "14px",
              height: "14px",
              background: "#ffffff",
              borderRadius: "50%",
              boxShadow: "0 0 8px rgba(255, 0, 0, 0.85)",
              animation: "pulse-timer-v3 0.6s infinite alternate",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function EconovaSecondsBadge({
  timer,
  serverNow,
  className = "",
}: {
  timer: TimerState;
  serverNow: () => number;
  className?: string;
}) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const getSeconds = useCallback(() => {
    const now = serverNow ? serverNow() : Date.now();
    const rem = timer.startedAt != null ? Math.max(0, timer.remainingMs - (now - timer.startedAt)) : timer.remainingMs;
    return Math.ceil(rem / 1000);
  }, [timer, serverNow]);

  useEffect(() => {
    let animId: number;
    const update = () => {
      if (spanRef.current) {
        const s = getSeconds();
        spanRef.current.textContent = `${s}`;
      }
      if (timer.startedAt != null) {
        animId = requestAnimationFrame(update);
      }
    };
    update();
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [timer, getSeconds]);

  // Only display when active timer is running ("Tính giờ" pressed)
  if (timer.startedAt == null) {
    return null;
  }

  return (
    <div
      className={`w-[44px] h-[30px] rounded-lg font-black text-sm tracking-normal tabular-nums flex items-center justify-center border-2 border-amber-400 text-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.6)] shrink-0 ${className}`}
      style={{
        background: "linear-gradient(135deg, #091a42 0%, #061129 100%)",
        fontFamily: "'UTM Avo', 'Montserrat', 'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      <span ref={spanRef}>{getSeconds()}</span>
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * HANGING BRASS SUBJECT PLACARD (Tab Biển Đồng Treo Chủ Đề O26)
 * Mounted at Center-Left directly onto the HorizontalBrassRod atop the classic
 * chalkboard question frame. Features two solid bronze hanging brackets/rivets,
 * beveled gold metallic rim, dark antique enamel plate, and glowing gold typography.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function HangingBrassSubjectPlacard({
  subject,
  className = "",
}: {
  subject: string;
  className?: string;
}) {
  if (!subject) return null;

  return (
    <motion.div
      initial={{ y: -16, opacity: 0, scale: 0.94 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -16, opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className={`absolute -top-[34px] sm:-top-[38px] left-6 sm:left-10 z-40 flex items-center pointer-events-none select-none ${className}`}
    >
      {/* 2 Hanging Brass Brackets connecting to rod */}
      <div className="absolute -top-2 left-3 w-1.5 h-3 bg-gradient-to-b from-amber-400 to-amber-700 rounded-sm shadow-sm z-0" />
      <div className="absolute -top-2 right-3 w-1.5 h-3 bg-gradient-to-b from-amber-400 to-amber-700 rounded-sm shadow-sm z-0" />

      {/* Main Brass Placard */}
      <div
        className="relative z-10 px-3 sm:px-4 py-1 sm:py-1.5 rounded-t-lg rounded-b-md flex items-center gap-1.5 shadow-[0_6px_20px_rgba(0,0,0,0.95)]"
        style={{
          background: "linear-gradient(180deg, #2b1f14 0%, #17110b 45%, #0d0a07 100%)",
          border: "2px solid #d4af37",
          boxShadow:
            "0 6px 18px rgba(0,0,0,0.92), 0 0 10px rgba(212,175,55,0.4), inset 0 1px 2px rgba(255,255,255,0.4), inset 0 -1px 3px rgba(0,0,0,0.8)",
          outline: "1.5px solid #78350f",
          outlineOffset: "-3.5px",
        }}
      >
        {/* Left Miniature Bronze Rivet */}
        <div className="w-2.5 h-2.5 rounded-full classic-rivet-bronze shrink-0 shadow-sm" />

        {/* Tag Icon & Subject Name */}
        <div className="flex items-center gap-1.5 font-black tracking-wider uppercase text-xs sm:text-sm">
          <span className="text-amber-400 drop-shadow-[0_1px_4px_rgba(245,158,11,0.6)]">
            🏷️ CHỦ ĐỀ:
          </span>
          <span className="text-amber-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] font-extrabold tracking-wide">
            {subject}
          </span>
        </div>

        {/* Right Miniature Bronze Rivet */}
        <div className="w-2.5 h-2.5 rounded-full classic-rivet-bronze shrink-0 shadow-sm" />
      </div>
    </motion.div>
  );
}

export function Vtv3ChalkboardQuestionFrame({
  headerBadge,
  subjectBadge,
  questionText,
  mediaElement,
  timer,
  serverNow,
  timerBadge,
  children,
}: {
  headerBadge?: React.ReactNode;
  subjectBadge?: string | null;
  questionText?: string | null;
  mediaElement?: React.ReactNode;
  timer?: TimerState | null;
  serverNow: () => number;
  timerSecondsOverride?: number;
  timerBadge?: TimerState | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative w-full max-w-[94vw] 2xl:max-w-[1540px] mx-auto flex items-center justify-center pointer-events-auto">
      {/* ── 1. Horizontal Brass Rod (Passing behind) ── */}
      <HorizontalBrassRod />

      {/* ── HANGING BRASS SUBJECT PLACARD (Top Center-Left) ── */}
      {subjectBadge && <HangingBrassSubjectPlacard subject={subjectBadge} />}

      {/* ── 2. Chalkboard Question Banner (Shape Layer) ── */}
      <div
        className="relative w-full z-10 rounded-2xl flex flex-col justify-between overflow-visible shadow-2xl"
        style={{
          minHeight: "clamp(120px, 19vh, 200px)",
          maxHeight: "clamp(160px, 30vh, 260px)",
          height: "auto",
          background: "linear-gradient(175deg, #101c2e 0%, #0b1320 60%, #070d16 100%)",
          border: "3.5px solid #d4af37",
          boxShadow:
            "0 12px 40px rgba(0,0,0,0.92), 0 0 20px rgba(212,175,55,0.35), inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 6px rgba(0,0,0,0.8)",
          outline: "2.5px solid #78350f",
          outlineOffset: "-6px",
        }}
      >
        {/* Subtle chalkboard SVG background inside box (clipped to rounded-2xl) */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <Vtv3ChalkboardBackdrop className="opacity-30" />
        </div>

        {/* Top-Left Glowing Red Indicator Rivet with Header Badge */}
        {headerBadge && (
          <div className="absolute top-2.5 left-3 z-20 flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full border border-white shadow-[0_0_10px_#ef4444]"
              style={{
                background: "radial-gradient(circle at 35% 30%, #f87171 0%, #dc2626 50%, #7f1d1d 100%)",
              }}
            />
            <div className="text-sm font-black text-amber-300 drop-shadow">{headerBadge}</div>
          </div>
        )}

        {/* Center: Question Prompt Text (Top-Left Aligned Broadcast Standard, Instant Swap) */}
        <div className="relative z-10 flex-1 px-4 sm:px-6 md:px-7 py-2 sm:py-2.5 flex flex-col items-start justify-start text-left font-classic-arial">
          {questionText ? (
            <div
              className={`text-white font-bold leading-normal pt-1 pb-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] w-full max-w-[1440px] text-left select-text font-classic-arial ${clampQuestionFont(
                questionText
              )}`}
            >
              {questionText}
            </div>
          ) : (
            children
          )}
          {mediaElement && <div className="mt-1">{mediaElement}</div>}
        </div>

        {/* Top-Right Seconds Badge (O23-O26 Khởi Động) */}
        {timerBadge && (
          <div className="absolute top-2.5 right-3 z-20">
            <EconovaSecondsBadge timer={timerBadge} serverNow={serverNow} />
          </div>
        )}

        {/* Bottom: Integrated Progress Timer Bar & Glowing Red Pearl touching bottom border */}
        {timer && <Vtv3BottomEdgeTimerBar timer={timer} serverNow={serverNow} />}
      </div>
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PROCEDURAL CLASSIC BROADCAST SFX (Web Audio API)
 * Zero-latency mechanical sound synthesis for classic Olympia theme animations
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function playClassicShutterOpenSFX() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const t = ctx.currentTime;

    // Metallic latch click (crisp mechanical release)
    const latchOsc = ctx.createOscillator();
    const latchGain = ctx.createGain();
    latchOsc.type = "triangle";
    latchOsc.frequency.setValueAtTime(1400, t);
    latchOsc.frequency.exponentialRampToValueAtTime(280, t + 0.04);
    latchGain.gain.setValueAtTime(0.2, t);
    latchGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    latchOsc.connect(latchGain);
    latchGain.connect(ctx.destination);
    latchOsc.start(t);
    latchOsc.stop(t + 0.06);

    // Mechanical brass sliding friction
    const slideOsc = ctx.createOscillator();
    const slideGain = ctx.createGain();
    slideOsc.type = "sine";
    slideOsc.frequency.setValueAtTime(240, t + 0.02);
    slideOsc.frequency.exponentialRampToValueAtTime(480, t + 0.16);
    slideOsc.frequency.exponentialRampToValueAtTime(160, t + 0.32);
    slideGain.gain.setValueAtTime(0.001, t);
    slideGain.gain.linearRampToValueAtTime(0.14, t + 0.05);
    slideGain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    slideOsc.connect(slideGain);
    slideGain.connect(ctx.destination);
    slideOsc.start(t + 0.02);
    slideOsc.stop(t + 0.4);

    // Resonant golden shimmer (harmonic chime)
    const chime = ctx.createOscillator();
    const chimeGain = ctx.createGain();
    chime.type = "sine";
    chime.frequency.setValueAtTime(880, t + 0.1);
    chime.frequency.exponentialRampToValueAtTime(1318.51, t + 0.38); // E6
    chimeGain.gain.setValueAtTime(0.001, t + 0.1);
    chimeGain.gain.linearRampToValueAtTime(0.12, t + 0.16);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, t + 0.52);
    chime.connect(chimeGain);
    chimeGain.connect(ctx.destination);
    chime.start(t + 0.1);
    chime.stop(t + 0.55);
  } catch {}
}

export function playClassicTabletFlipSFX(index: number = 0) {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const t = ctx.currentTime;
    const baseFreq = 440 + index * 110; // 440Hz, 550Hz, 660Hz

    // Percussive wooden/brass tablet drop clack
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(baseFreq * 2, t);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 0.6, t + 0.07);
    gain1.gain.setValueAtTime(0.24, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.14);

    // Warm resonant body chime
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(baseFreq, t);
    osc2.frequency.exponentialRampToValueAtTime(baseFreq * 1.2, t + 0.1);
    gain2.gain.setValueAtTime(0.14, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t);
    osc2.stop(t + 0.28);
  } catch {}
}

export interface UnifiedOlympiaAnswerOverlayProps {
  answerText: string;
  roundLabel?: string;
  verdict?: "correct" | "wrong" | "neutral" | null;
  pointsAwarded?: number;
  actorName?: string;
  themeMode?: "v3_arrow" | "o26_classic";
  className?: string;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * UNIFIED OLYMPIA ANSWER OVERLAY (F1, F2)
 * Authentic broadcast aspect ratio (max-w-3xl to max-w-4xl), 3-chamber layout:
 * 1. Left Pill: Classification badge (✔ CHÍNH XÁC / ✘ CHƯA ĐÚNG / ĐÁP ÁN) + glowing rivet
 * 2. Center Plaque: Large drop-shadowed answer typography clamped by string length
 * 3. Right Accent: Points badge (+10đ, +20đ, etc.), contestant name, or bronze rivet
 * Multi-layer metallic gold borders, Framer Motion spring physics, and goldSheenSweep.
 * When in Theme Cổ Điển (o26_classic): Opens with signature Dual Brass Mechanical Shutters
 * and procedural metallic slide SFX.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function UnifiedOlympiaAnswerOverlay({
  answerText,
  roundLabel = "ĐÁP ÁN",
  verdict = null,
  pointsAwarded,
  actorName,
  themeMode = "o26_classic",
  className = "",
}: UnifiedOlympiaAnswerOverlayProps) {
  const isClassic = themeMode === "o26_classic";
  const [shuttersOpen, setShuttersOpen] = useState(!isClassic);

  useEffect(() => {
    if (!isClassic) return;
    const timer = setTimeout(() => {
      setShuttersOpen(true);
      playClassicShutterOpenSFX();
    }, 45);
    return () => clearTimeout(timer);
  }, [isClassic]);

  const cleanText = (answerText || "").replace(/^✔\s*/, "");
  const len = cleanText.length;
  const fontSizeClass =
    len > 60
      ? "text-sm sm:text-base md:text-lg"
      : len > 35
      ? "text-base sm:text-lg md:text-xl lg:text-[22px]"
      : len > 20
      ? "text-lg sm:text-xl md:text-2xl lg:text-[26px]"
      : "text-xl sm:text-2xl md:text-3xl lg:text-[32px]";

  const isCorrect = verdict === "correct";
  const isWrong = verdict === "wrong";

  // Multi-layer metallic gold borders & state-driven glows
  const frameBorder = isCorrect
    ? "3.5px solid #10b981"
    : isWrong
    ? "3.5px solid #f43f5e"
    : "3.5px solid #d4af37";

  const frameOutline = isCorrect
    ? "1.5px solid #064e3b"
    : isWrong
    ? "1.5px solid #881337"
    : "1.5px solid #78350f";

  const frameShadow = isCorrect
    ? "0 16px 45px rgba(0,0,0,0.92), 0 0 35px rgba(16,185,129,0.5), inset 0 2px 4px rgba(255,255,255,0.4), inset 0 -2px 6px rgba(0,0,0,0.85)"
    : isWrong
    ? "0 16px 45px rgba(0,0,0,0.92), 0 0 32px rgba(244,63,94,0.45), inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 6px rgba(0,0,0,0.85)"
    : "0 16px 45px rgba(0,0,0,0.92), 0 0 28px rgba(212,175,55,0.4), inset 0 2px 4px rgba(255,255,255,0.4), inset 0 -2px 6px rgba(0,0,0,0.85)";

  return (
    <div
      className={`relative w-full max-w-4xl sm:max-w-5xl 2xl:max-w-6xl mx-auto flex items-center justify-center pointer-events-auto select-none p-1 sm:p-2 ${
        isClassic ? "font-classic-arial" : "font-v3-avo"
      } ${className}`}
    >
      <HorizontalBrassRod />
      <motion.div
        initial={{ opacity: 0, y: 22, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        className="relative w-full z-10 rounded-2xl flex items-center justify-between px-4 sm:px-7 py-3 sm:py-4 overflow-hidden shadow-2xl min-h-[68px] sm:min-h-[76px]"
        style={{
          background: "linear-gradient(180deg, #1c2029 0%, #12151c 50%, #0a0c10 100%)",
          border: frameBorder,
          boxShadow: frameShadow,
          outline: frameOutline,
          outlineOffset: "-5px",
        }}
      >
        {/* Subtle chalkboard SVG background inside box */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <Vtv3ChalkboardBackdrop className="opacity-25" />
        </div>

        {/* Specular metallic sheen sweep beam across the frame on reveal */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div className="sheen-sweep-beam" />
        </div>

        {/* Bronze Corner Rivets */}
        <div className="absolute top-2 left-2 z-20 w-2.5 h-2.5 rounded-full classic-rivet-bronze" />
        <div className="absolute top-2 right-2 z-20 w-2.5 h-2.5 rounded-full classic-rivet-bronze" />
        <div className="absolute bottom-2 left-2 z-20 w-2.5 h-2.5 rounded-full classic-rivet-bronze" />
        <div className="absolute bottom-2 right-2 z-20 w-2.5 h-2.5 rounded-full classic-rivet-bronze" />

        {/* ── CLASSIC THEME SIGNATURE: Dual Brass Mechanical Shutters ── */}
        {isClassic && (
          <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden rounded-2xl">
            {/* Left Brass Shutter Wing */}
            <motion.div
              initial={{ x: "0%" }}
              animate={{ x: shuttersOpen ? "-102%" : "0%" }}
              transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
              className="absolute top-0 bottom-0 left-0 w-1/2 flex items-center justify-end overflow-hidden"
              style={{
                background:
                  "linear-gradient(135deg, #1e150b 0%, #5a280b 22%, #92400e 45%, #b45309 60%, #d4af37 80%, #78350f 100%)",
                borderRight: "2.5px solid #fde047",
                boxShadow:
                  "inset 0 2px 4px rgba(255,255,255,0.4), inset 0 -2px 6px rgba(0,0,0,0.85), 4px 0 16px rgba(0,0,0,0.7)",
              }}
            >
              {/* Etched horizontal brass louvers / grooves */}
              <div className="absolute inset-0 opacity-25 bg-[repeating-linear-gradient(0deg,transparent,transparent_6px,rgba(0,0,0,0.6)_6px,rgba(0,0,0,0.6)_8px)]" />
              {/* Bronze corner rivets on shutter */}
              <div className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full classic-rivet-bronze" />
              <div className="absolute bottom-2 left-2 w-2.5 h-2.5 rounded-full classic-rivet-bronze" />
              {/* Half-medallion lock crest on the seam */}
              <div className="relative -mr-3.5 w-7 h-14 rounded-l-full bg-gradient-to-r from-amber-700 to-yellow-500 border-2 border-r-0 border-amber-300 flex items-center justify-center shadow-lg">
                <div className="w-1.5 h-6 rounded-full bg-amber-950/80" />
              </div>
            </motion.div>

            {/* Right Brass Shutter Wing */}
            <motion.div
              initial={{ x: "0%" }}
              animate={{ x: shuttersOpen ? "102%" : "0%" }}
              transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
              className="absolute top-0 bottom-0 right-0 w-1/2 flex items-center justify-start overflow-hidden"
              style={{
                background:
                  "linear-gradient(225deg, #1e150b 0%, #5a280b 22%, #92400e 45%, #b45309 60%, #d4af37 80%, #78350f 100%)",
                borderLeft: "2.5px solid #fde047",
                boxShadow:
                  "inset 0 2px 4px rgba(255,255,255,0.4), inset 0 -2px 6px rgba(0,0,0,0.85), -4px 0 16px rgba(0,0,0,0.7)",
              }}
            >
              {/* Etched horizontal brass louvers / grooves */}
              <div className="absolute inset-0 opacity-25 bg-[repeating-linear-gradient(0deg,transparent,transparent_6px,rgba(0,0,0,0.6)_6px,rgba(0,0,0,0.6)_8px)]" />
              {/* Bronze corner rivets on shutter */}
              <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full classic-rivet-bronze" />
              <div className="absolute bottom-2 right-2 w-2.5 h-2.5 rounded-full classic-rivet-bronze" />
              {/* Half-medallion lock crest on the seam */}
              <div className="relative -ml-3.5 w-7 h-14 rounded-r-full bg-gradient-to-l from-amber-700 to-yellow-500 border-2 border-l-0 border-amber-300 flex items-center justify-center shadow-lg">
                <div className="w-1.5 h-6 rounded-full bg-amber-950/80" />
              </div>
            </motion.div>

            {/* Center seam flash burst when shutters part */}
            <motion.div
              initial={{ opacity: 1, scaleY: 1 }}
              animate={{ opacity: shuttersOpen ? 0 : 1, scaleY: shuttersOpen ? 1.4 : 1 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-4 z-40 bg-gradient-to-r from-transparent via-amber-200 to-transparent blur-[2px] shadow-[0_0_20px_#fde047]"
            />
          </div>
        )}

        {/* ── 1. LEFT CHAMBER: Minimal Icon Pill (No Text Badges) ── */}
        <div className="relative z-10 flex items-center shrink-0">
          {isCorrect ? (
            <div
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-emerald-300 flex items-center justify-center text-white text-base sm:text-lg font-black shadow-[0_0_14px_#10b981]"
              style={{
                background:
                  "radial-gradient(circle at 35% 30%, #34d399 0%, #059669 60%, #064e3b 100%)",
              }}
            >
              ✓
            </div>
          ) : isWrong ? (
            <div
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-rose-400 flex items-center justify-center text-white text-base sm:text-lg font-black shadow-[0_0_14px_#f43f5e]"
              style={{
                background:
                  "radial-gradient(circle at 35% 30%, #f43f5e 0%, #e11d48 60%, #881337 100%)",
              }}
            >
              ✕
            </div>
          ) : (
            <div
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-amber-300 flex items-center justify-center text-amber-200 text-sm sm:text-base font-black shadow-[0_0_14px_#f59e0b]"
              style={{
                background:
                  "radial-gradient(circle at 35% 30%, #fbbf24 0%, #d97706 60%, #78350f 100%)",
              }}
            >
              ★
            </div>
          )}
        </div>

        {/* ── 2. CENTER CHAMBER: Expanded Answer Typography (No truncation on readable answers) ── */}
        <div className="relative z-10 flex-1 px-3 sm:px-6 py-1 text-center min-w-0">
          {isCorrect ? (
            <div
              className={`text-emerald-300 font-black uppercase tracking-wider drop-shadow-[0_0_24px_rgba(52,211,153,0.85)] break-words leading-normal ${fontSizeClass}`}
            >
              {cleanText}
            </div>
          ) : isWrong ? (
            <div
              className={`text-amber-200 font-black uppercase tracking-wider drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] break-words leading-normal ${fontSizeClass}`}
            >
              <span className="text-amber-400/80 text-xs sm:text-sm font-bold mr-2 uppercase tracking-widest">
                ĐÁP ÁN:
              </span>
              {cleanText}
            </div>
          ) : (
            <div
              className={`text-yellow-100 font-black uppercase tracking-wider drop-shadow-[0_2px_14px_rgba(212,175,55,0.7)] break-words leading-normal ${fontSizeClass}`}
            >
              {cleanText}
            </div>
          )}
        </div>

        {/* ── 3. RIGHT CHAMBER: Points / Contestant / Bronze Balance Rivet ── */}
        <div className="relative z-10 flex items-center gap-2 shrink-0">
          {pointsAwarded && pointsAwarded > 0 ? (
            <div className="px-2.5 sm:px-3 py-1 rounded-lg bg-gradient-to-r from-amber-600/90 to-yellow-500/90 border border-amber-300 text-slate-950 font-black text-xs sm:text-sm md:text-base uppercase tracking-wider shadow-[0_0_14px_rgba(251,191,36,0.9)] animate-pulse">
              +{pointsAwarded}đ
            </div>
          ) : actorName ? (
            <div className="px-2.5 py-1 rounded-lg bg-slate-900/90 border border-amber-400/50 text-amber-200 text-xs sm:text-sm font-bold truncate max-w-[140px]">
              {actorName}
            </div>
          ) : (
            <div className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center opacity-0 pointer-events-none">
              {/* Invisible spacer balancing the left circular jewel icon */}
              •
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export interface ClassicUnifiedLowerThirdProps {
  state: OlympiaState;
  round: "khoiDong" | "vcnv" | "tangToc" | "veDich" | "cauHoiPhu";
  questionText?: string | null;
  badgeLabel?: string | null;
  subjectBadge?: string | null;
  mediaElement?: React.ReactNode;
  timer?: TimerState | null;
  activeSeatId?: number | null;
  buzzedSeatId?: number | null;
  lockedSeats?: number[];
  hopeStarActive?: boolean;
  answerReveal?: {
    show: boolean;
    text: string;
    label?: string;
    verdict?: "correct" | "wrong" | "neutral" | null;
    points?: number;
    actorName?: string;
  } | null;
  serverNow: () => number;
  timerBadge?: TimerState | null;
  tiedSeats?: number[];
  isFullscreen?: boolean;
  children?: React.ReactNode;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AUTHENTIC O26 CLASSIC CHAMBER ANSWER VIEW
 * Embedded smoothly inside the lower chamber of ClassicUnifiedLowerThird.
 * Features dual mechanical brass shutters sliding open with sound,
 * a glowing status icon jewel, crisp answer typography, and points/actor pill.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function ClassicChamberAnswerView({
  answerText,
  roundLabel = "ĐÁP ÁN",
  verdict = null,
  pointsAwarded,
  actorName,
}: {
  answerText: string;
  roundLabel?: string;
  verdict?: "correct" | "wrong" | "neutral" | null;
  pointsAwarded?: number;
  actorName?: string;
}) {
  const [shuttersOpen, setShuttersOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShuttersOpen(true);
      playClassicShutterOpenSFX();
    }, 40);
    return () => clearTimeout(timer);
  }, []);

  const cleanText = (answerText || "").replace(/^✔\s*/, "");
  const len = cleanText.length;
  const fontSizeClass =
    len > 60
      ? "text-base sm:text-lg md:text-xl lg:text-2xl"
      : len > 35
      ? "text-lg sm:text-xl md:text-2xl lg:text-3xl"
      : len > 20
      ? "text-xl sm:text-2xl md:text-3xl lg:text-[34px]"
      : "text-2xl sm:text-3xl md:text-4xl lg:text-[40px]";

  const isCorrect = verdict === "correct";
  const isWrong = verdict === "wrong";

  return (
    <div className="relative w-full h-full flex-1 flex items-center justify-between min-h-[140px] px-2 sm:px-6 overflow-hidden select-none">
      {/* Specular metallic sheen sweep beam across the chamber */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="sheen-sweep-beam" />
      </div>

      {/* ── Dual Brass Mechanical Shutters ── */}
      <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden rounded-xl">
        {/* Left Shutter Wing */}
        <motion.div
          initial={{ x: "0%" }}
          animate={{ x: shuttersOpen ? "-102%" : "0%" }}
          transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
          className="absolute top-0 bottom-0 left-0 w-1/2 flex items-center justify-end overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, #1e150b 0%, #5a280b 22%, #92400e 45%, #b45309 60%, #d4af37 80%, #78350f 100%)",
            borderRight: "2.5px solid #fde047",
            boxShadow:
              "inset 0 2px 4px rgba(255,255,255,0.4), inset 0 -2px 6px rgba(0,0,0,0.85), 4px 0 16px rgba(0,0,0,0.7)",
          }}
        >
          <div className="absolute inset-0 opacity-25 bg-[repeating-linear-gradient(0deg,transparent,transparent_6px,rgba(0,0,0,0.6)_6px,rgba(0,0,0,0.6)_8px)]" />
          <div className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full classic-rivet-bronze" />
          <div className="absolute bottom-2 left-2 w-2.5 h-2.5 rounded-full classic-rivet-bronze" />
          <div className="relative -mr-3.5 w-7 h-14 rounded-l-full bg-gradient-to-r from-amber-700 to-yellow-500 border-2 border-r-0 border-amber-300 flex items-center justify-center shadow-lg">
            <div className="w-1.5 h-6 rounded-full bg-amber-950/80" />
          </div>
        </motion.div>

        {/* Right Shutter Wing */}
        <motion.div
          initial={{ x: "0%" }}
          animate={{ x: shuttersOpen ? "102%" : "0%" }}
          transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
          className="absolute top-0 bottom-0 right-0 w-1/2 flex items-center justify-start overflow-hidden"
          style={{
            background:
              "linear-gradient(225deg, #1e150b 0%, #5a280b 22%, #92400e 45%, #b45309 60%, #d4af37 80%, #78350f 100%)",
            borderLeft: "2.5px solid #fde047",
            boxShadow:
              "inset 0 2px 4px rgba(255,255,255,0.4), inset 0 -2px 6px rgba(0,0,0,0.85), -4px 0 16px rgba(0,0,0,0.7)",
          }}
        >
          <div className="absolute inset-0 opacity-25 bg-[repeating-linear-gradient(0deg,transparent,transparent_6px,rgba(0,0,0,0.6)_6px,rgba(0,0,0,0.6)_8px)]" />
          <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full classic-rivet-bronze" />
          <div className="absolute bottom-2 right-2 w-2.5 h-2.5 rounded-full classic-rivet-bronze" />
          <div className="relative -ml-3.5 w-7 h-14 rounded-r-full bg-gradient-to-l from-amber-700 to-yellow-500 border-2 border-l-0 border-amber-300 flex items-center justify-center shadow-lg">
            <div className="w-1.5 h-6 rounded-full bg-amber-950/80" />
          </div>
        </motion.div>

        {/* Center seam flash burst */}
        <motion.div
          initial={{ opacity: 1, scaleY: 1 }}
          animate={{ opacity: shuttersOpen ? 0 : 1, scaleY: shuttersOpen ? 1.4 : 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-4 z-40 bg-gradient-to-r from-transparent via-amber-200 to-transparent blur-[2px] shadow-[0_0_20px_#fde047]"
        />
      </div>

      {/* 1. Left: Status Icon Jewel */}
      <div className="relative z-10 flex items-center shrink-0">
        {isCorrect ? (
          <div
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-emerald-300 flex items-center justify-center text-white text-lg sm:text-xl font-black shadow-[0_0_18px_#10b981]"
            style={{
              background:
                "radial-gradient(circle at 35% 30%, #34d399 0%, #059669 60%, #064e3b 100%)",
            }}
          >
            ✓
          </div>
        ) : isWrong ? (
          <div
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-rose-400 flex items-center justify-center text-white text-lg sm:text-xl font-black shadow-[0_0_18px_#f43f5e]"
            style={{
              background:
                "radial-gradient(circle at 35% 30%, #f43f5e 0%, #e11d48 60%, #881337 100%)",
            }}
          >
            ✕
          </div>
        ) : (
          <div
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-amber-300 flex items-center justify-center text-amber-200 text-base sm:text-lg font-black shadow-[0_0_18px_#f59e0b]"
            style={{
              background:
                "radial-gradient(circle at 35% 30%, #fbbf24 0%, #d97706 60%, #78350f 100%)",
            }}
          >
            ★
          </div>
        )}
      </div>

      {/* 2. Center: Answer Typography */}
      <div className="relative z-10 flex-1 px-4 sm:px-8 text-center min-w-0">
        {isCorrect ? (
          <div
            className={`text-emerald-300 font-black uppercase tracking-wider drop-shadow-[0_0_28px_rgba(52,211,153,0.9)] break-words leading-tight ${fontSizeClass}`}
          >
            {cleanText}
          </div>
        ) : isWrong ? (
          <div
            className={`text-amber-200 font-black uppercase tracking-wider drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] break-words leading-tight ${fontSizeClass}`}
          >
            <span className="text-amber-400/80 text-xs sm:text-sm font-bold mr-2 uppercase tracking-widest block sm:inline">
              ĐÁP ÁN:
            </span>
            {cleanText}
          </div>
        ) : (
          <div
            className={`text-yellow-100 font-black uppercase tracking-wider drop-shadow-[0_2px_16px_rgba(212,175,55,0.7)] break-words leading-tight ${fontSizeClass}`}
          >
            {cleanText}
          </div>
        )}
      </div>

      {/* 3. Right: Points / Actor Name */}
      <div className="relative z-10 flex items-center gap-2 shrink-0">
        {pointsAwarded && pointsAwarded > 0 ? (
          <div className="px-3 sm:px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-600/90 to-yellow-500/90 border border-amber-300 text-slate-950 font-black text-sm sm:text-base md:text-lg uppercase tracking-wider shadow-[0_0_16px_rgba(251,191,36,0.9)] animate-pulse">
            +{pointsAwarded}đ
          </div>
        ) : actorName ? (
          <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-amber-400/50 text-amber-200 text-xs sm:text-sm font-bold truncate max-w-[150px]">
            {actorName}
          </div>
        ) : (
          <div className="w-10 sm:w-12 opacity-0 pointer-events-none">•</div>
        )}
      </div>
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AUTHENTIC O26 CLASSIC UNIFIED LOWER-THIRD PLAQUE
 * Cohesive single-frame broadcast graphic for Olympia O26 Classic theme.
 * Integrates candidate score shelf, round status badge, full-width question
 * chamber (broadcast typography), and flush bottom gold timer bar.
 * Eliminates all awkward vertical gaps, mismatched widths, and modern cyan elements.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function ClassicUnifiedLowerThird({
  state,
  round,
  questionText,
  badgeLabel,
  subjectBadge,
  mediaElement,
  timer,
  activeSeatId,
  buzzedSeatId,
  lockedSeats = [],
  hopeStarActive = false,
  answerReveal,
  serverNow,
  timerBadge,
  tiedSeats,
  isFullscreen = false,
  children,
}: ClassicUnifiedLowerThirdProps) {
  const hasOpenedRef = useRef(false);
  useEffect(() => {
    hasOpenedRef.current = true;
  }, []);

  const allSeats = activeSeats(state);
  const seatsToDisplay =
    tiedSeats && tiedSeats.length > 0
      ? allSeats.filter((s) => tiedSeats.includes(s.id))
      : allSeats;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="relative w-full max-w-[94vw] 2xl:max-w-[1540px] mx-auto flex items-center justify-center pointer-events-auto select-none py-1 overflow-visible font-classic-arial"
      style={{ perspective: 1600, fontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif" }}
    >
      {/* ── 1. Horizontal Continuous Mounting Beam (Edge-to-Edge) ── */}
      <HorizontalBrassRod />

      {/* ── HANGING BRASS SUBJECT PLACARD (Top Center-Left) ── */}
      {subjectBadge && <HangingBrassSubjectPlacard subject={subjectBadge} />}

      {/* Floating Hope Star Badge rising above question board */}
      {hopeStarActive && (
        <div
          className="absolute -top-10 right-6 sm:right-10 z-40 pointer-events-none transition-all duration-300 animate-in zoom-in-50"
          style={{
            filter: "drop-shadow(0 4px 14px rgba(0,0,0,0.9))",
          }}
        >
          <HopeStarBadge size={76} />
        </div>
      )}

      {/* ── 2. 6-SIDED 3D VOLUMETRIC PRISM (Rotates 3D around center wooden rod axis: rotateX 90° -> 0°) ── */}
      <motion.div
        initial={hasOpenedRef.current ? false : { rotateX: 90, opacity: 0 }}
        animate={{ rotateX: 0, opacity: 1 }}
        exit={{ rotateX: -90, opacity: 0 }}
        transition={{
          rotateX: { duration: 0.46, ease: [0.16, 1, 0.3, 1] },
          opacity: { duration: 0.22 },
        }}
        className="relative w-full z-10 overflow-visible"
        style={{
          transformOrigin: "50% 50%",
          transformStyle: "preserve-3d",
        }}
      >
        {/* ── 3D PRISM BACK FACE (Z = -12px, rotateY: 180deg) - Solid dark polished mahogany with embossed seal ── */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none shadow-2xl flex items-center justify-center border-4 border-amber-600/70"
          style={{
            transform: "rotateY(180deg) translateZ(12px)",
            backfaceVisibility: "hidden",
            background:
              "linear-gradient(135deg, #1c100b 0%, #2e1a12 25%, #3f2318 50%, #2a150e 75%, #140b08 100%)",
            boxShadow: "inset 0 0 50px rgba(0,0,0,0.95), 0 16px 40px rgba(0,0,0,0.9)",
          }}
        >
          {/* Subtle wood grain linear texture */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, rgba(254,240,138,0.06) 0px, transparent 3px, rgba(0,0,0,0.35) 7px)",
            }}
          />
          {/* Embossed Bronze Seal */}
          <div className="relative z-10 flex flex-col items-center justify-center p-6 border-2 border-amber-500/30 rounded-full w-28 h-28 bg-amber-950/40 shadow-inner">
            <div className="text-amber-400 font-black text-xs tracking-widest uppercase opacity-80 text-center">
              OLYMPIA
            </div>
            <div className="w-8 h-0.5 bg-amber-400/50 my-1" />
            <div className="text-amber-500 text-[10px] tracking-wider opacity-60">S14</div>
          </div>
        </div>

        {/* ── 3D PRISM TOP RIM (Height 24px, rotateX: 90deg, translateZ: 12px) - Beveled gilded brass edge ── */}
        <div
          className="absolute top-0 left-3 right-3 h-[24px] pointer-events-none rounded-t-sm"
          style={{
            transform: "translateY(-12px) rotateX(90deg)",
            transformOrigin: "center center",
            background:
              "linear-gradient(90deg, #78350f 0%, #d4af37 20%, #fef08a 50%, #d4af37 80%, #78350f 100%)",
            boxShadow:
              "inset 0 1px 2px rgba(255,255,255,0.8), inset 0 -1px 3px rgba(0,0,0,0.7), 0 -2px 6px rgba(212,175,55,0.4)",
          }}
        />

        {/* ── 3D PRISM BOTTOM RIM (Height 24px, rotateX: -90deg, translateZ: 12px) - Beveled gilded brass edge ── */}
        <div
          className="absolute bottom-0 left-3 right-3 h-[24px] pointer-events-none rounded-b-sm"
          style={{
            transform: "translateY(12px) rotateX(-90deg)",
            transformOrigin: "center center",
            background:
              "linear-gradient(90deg, #451a03 0%, #b45309 25%, #fde047 50%, #b45309 75%, #451a03 100%)",
            boxShadow:
              "inset 0 1px 3px rgba(255,255,255,0.5), inset 0 -2px 6px rgba(0,0,0,0.9), 0 4px 10px rgba(0,0,0,0.9)",
          }}
        />

        {/* ── 3D PRISM LEFT RIM (Width 24px, rotateY: -90deg, translateZ: 12px) ── */}
        <div
          className="absolute top-3 bottom-3 left-0 w-[24px] pointer-events-none rounded-l-sm"
          style={{
            transform: "translateX(-12px) rotateY(-90deg)",
            transformOrigin: "center center",
            background:
              "linear-gradient(180deg, #451a03 0%, #92400e 30%, #fef08a 50%, #78350f 75%, #291003 100%)",
            boxShadow: "inset 1px 0 3px rgba(255,255,255,0.7), inset -1px 0 4px rgba(0,0,0,0.9)",
          }}
        />

        {/* ── 3D PRISM RIGHT RIM (Width 24px, rotateY: 90deg, translateZ: 12px) ── */}
        <div
          className="absolute top-3 bottom-3 right-0 w-[24px] pointer-events-none rounded-r-sm"
          style={{
            transform: "translateX(12px) rotateY(90deg)",
            transformOrigin: "center center",
            background:
              "linear-gradient(180deg, #451a03 0%, #92400e 30%, #fef08a 50%, #78350f 75%, #291003 100%)",
            boxShadow: "inset -1px 0 3px rgba(255,255,255,0.7), inset 1px 0 4px rgba(0,0,0,0.9)",
          }}
        />

        {/* ── 3D PRISM FRONT FACE (Z = +12px) ── */}
        <div
          className="relative w-full z-10 rounded-2xl flex flex-col justify-between overflow-hidden shadow-2xl"
          style={{
            transform: "translateZ(12px)",
            transformStyle: "preserve-3d",
            background: "linear-gradient(180deg, #1e222a 0%, #15181f 50%, #0d0f14 100%)",
            border: "3px solid #d4af37",
            boxShadow:
              "0 14px 44px rgba(0,0,0,0.94), 0 0 24px rgba(212,175,55,0.35), inset 0 2px 4px rgba(255,255,255,0.25), inset 0 -2px 6px rgba(0,0,0,0.85)",
            outline: "1.5px solid #78350f",
            outlineOffset: "-5px",
          }}
        >
        {/* Subtle chalkboard SVG background inside box */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <Vtv3ChalkboardBackdrop className="opacity-25" />
        </div>

        {/* Bronze Corner Rivets */}
        <div className="absolute top-2 left-2 z-30 w-2.5 h-2.5 rounded-full classic-rivet-bronze pointer-events-none" />
        <div className="absolute top-2 right-2 z-30 w-2.5 h-2.5 rounded-full classic-rivet-bronze pointer-events-none" />
        <div className="absolute bottom-2 left-2 z-30 w-2.5 h-2.5 rounded-full classic-rivet-bronze pointer-events-none" />
        <div className="absolute bottom-2 right-2 z-30 w-2.5 h-2.5 rounded-full classic-rivet-bronze pointer-events-none" />

        {/* ── UPPER SHELF: Candidate Score Bar & Status Badges (Optimized Padding & Cell Area) ── */}
        <div className="relative z-20 w-full h-[46px] sm:h-[50px] min-h-[46px] sm:min-h-[50px] max-h-[50px] bg-black/60 border-b border-amber-500/35 px-2 sm:px-3 py-1 flex items-center justify-between gap-1 sm:gap-1.5 flex-nowrap">
          {/* 1. Left Zone: Round / Question Status Badge (Compact Width) */}
          <div className="w-[100px] sm:w-[115px] shrink-0 flex items-center justify-start gap-1 overflow-hidden">
            <div className="w-3.5 h-3.5 rounded-full classic-rivet-red shrink-0" />
            {badgeLabel ? (
              <div className="px-1.5 sm:px-2 py-0.5 rounded-md bg-amber-950/90 border border-amber-400/80 text-amber-300 font-black text-xs sm:text-sm tracking-wider uppercase drop-shadow shadow-sm max-w-[85px] sm:max-w-[100px] overflow-hidden">
                <BoundedText text={badgeLabel} align="center" />
              </div>
            ) : null}
          </div>

          {/* 2. Center Zone: All-Candidate Score Shelf across All Rounds (including Về Đích) */}
          <div
            className="flex-1 min-w-0 h-full grid gap-1 sm:gap-1.5 px-0.5 items-center"
            style={{
              gridTemplateColumns: `repeat(${Math.max(1, seatsToDisplay.length)}, minmax(0, 1fr))`,
            }}
          >
            {seatsToDisplay.map((seat) => {
              const isTurn = activeSeatId === seat.id;
              const isBuzzed = buzzedSeatId === seat.id;
              const isLocked = lockedSeats?.includes(seat.id);

              return (
                <div
                  key={seat.id}
                  className={`h-[36px] sm:h-[40px] flex items-center justify-between gap-1 px-2 py-0.5 rounded-md transition-colors duration-200 min-w-0 overflow-hidden ${
                    isBuzzed
                      ? "ring-2 ring-red-500 bg-red-950/95 border border-red-500 text-white shadow-[0_0_16px_rgba(239,68,68,0.95)] animate-pulse"
                      : isTurn
                      ? round === "veDich"
                        ? "ring-2 ring-yellow-400 bg-amber-500/30 border border-yellow-400 text-yellow-100 shadow-[0_0_14px_rgba(250,204,21,0.9)]"
                        : "ring-2 ring-amber-400 bg-amber-950/90 text-white shadow-[0_0_10px_rgba(245,158,11,0.6)]"
                      : isLocked
                      ? "bg-slate-900/60 border border-slate-700/50 text-slate-500 opacity-60"
                      : "bg-[#181c24]/90 border border-amber-500/40 text-slate-100 shadow-inner"
                  }`}
                >
                  <span className="font-black truncate uppercase text-xs sm:text-sm md:text-base tracking-tight">
                    {seat.name || `TS ${seat.id + 1}`}
                  </span>
                  <span
                    className={`font-black shrink-0 text-xs sm:text-sm md:text-base font-mono ${
                      isBuzzed
                        ? "text-red-200"
                        : isTurn
                        ? round === "veDich"
                          ? "text-yellow-300"
                          : "text-amber-200"
                        : "text-amber-300"
                    }`}
                  >
                    {seat.score}
                  </span>
                </div>
              );
            })}
          </div>

          {/* 3. Right Zone: Seconds Badge (Compact Width) */}
          <div className="w-[100px] sm:w-[115px] shrink-0 flex items-center justify-end gap-1">
            {timerBadge && (
              <div className="shrink-0">
                <EconovaSecondsBadge timer={timerBadge} serverNow={serverNow} />
              </div>
            )}
          </div>
        </div>

        {/* ── LOWER CHAMBER: Fixed Broadcast Height, Top-Left Aligned Question or Integrated Shutter Answer Reveal ── */}
        <div className={`relative z-10 w-full flex-1 min-h-0 px-4 sm:px-6 md:px-7 py-2 sm:py-2.5 flex flex-col items-start justify-start text-left overflow-y-auto ${
          isFullscreen
            ? "min-h-[180px] sm:min-h-[220px] md:min-h-[260px] max-h-[400px]"
            : "min-h-[140px] sm:min-h-[155px] md:min-h-[175px] max-h-[210px]"
        }`}>
          {round === "khoiDong" && answerReveal?.show ? (
            <ClassicChamberAnswerView
              answerText={answerReveal.text}
              roundLabel={answerReveal.label}
              verdict={answerReveal.verdict}
              pointsAwarded={answerReveal.points}
              actorName={answerReveal.actorName}
            />
          ) : questionText ? (
            <div
              className={`text-white font-bold leading-snug pt-1 pb-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] w-full max-w-[1440px] text-left select-text font-classic-arial ${
                isFullscreen
                  ? "text-xl sm:text-2xl md:text-3xl"
                  : clampQuestionFont(questionText)
              }`}
            >
              {questionText}
            </div>
          ) : (
            children
          )}
          {!answerReveal?.show && mediaElement && <div className="mt-2">{mediaElement}</div>}
        </div>

        {/* ── BOTTOM FLUSH TIMER BAR (Dedicated unclipped container with guaranteed clearance) ── */}
        {timer && (
          <div className="w-full shrink-0 h-[18px] px-4 pb-2.5 pt-0.5 relative z-20 flex items-center">
            <Vtv3BottomEdgeTimerBar timer={timer} serverNow={serverNow} />
          </div>
        )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AUTHENTIC VTV3 CLASSIC SINGLE ANSWER BAR
 * Replaces modern cyan arrow V3SingleAnswerBar in Classic theme.
 * Uses metallic slate body, double gold border, and emerald answer typography.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function Vtv3ClassicSingleAnswerBar({
  answerText,
  points,
  roundLabel = "ĐÁP ÁN",
  verdict = null,
  actorName,
  className = "",
}: {
  answerText: string;
  points?: number;
  roundLabel?: string;
  verdict?: "correct" | "wrong" | "neutral" | null;
  actorName?: string;
  className?: string;
}) {
  return (
    <UnifiedOlympiaAnswerOverlay
      answerText={answerText}
      pointsAwarded={points}
      roundLabel={roundLabel}
      verdict={verdict}
      actorName={actorName}
      themeMode="o26_classic"
      className={className}
    />
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 3D GLOSSY BLACK DOME CROSSWORD BUTTON (As seen in Image 1)
 * Features:
 * - Radial gradient with chrome specular glint.
 * - 3D spherical dome illusion.
 * - Displays golden bold letter if opened, or blank dark dome if hidden.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AUTHENTIC VTV3 3D GLOSSY BLUE DOME BUTTON
 * As seen in the official VTV3 broadcast layout:
 * - Spherical glossy dome with sky-blue specular glare at top-left.
 * - Deep royal blue body with metallic rim.
 * - Displays white bold letter when revealed.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function GlossyBlueDomeButton({
  letter,
  isOpened = false,
  isCurrentRow = false,
  isWrong = false,
  sizeClass = "w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9",
  letterSizeClass = "text-xs sm:text-sm md:text-base",
}: {
  letter?: string;
  isOpened?: boolean;
  isCurrentRow?: boolean;
  isWrong?: boolean;
  sizeClass?: string;
  letterSizeClass?: string;
}) {
  // 4 Visual States:
  // 1. Initial deep blue: !isOpened && !isWrong && !isCurrentRow
  // 2. Currently selected row: isCurrentRow && !isOpened && !isWrong (pulsating amber ring)
  // 3. Revealed/opened: isOpened (bright icy pearl-cyan dome with dark navy letter)
  // 4. Sẫm màu khi không ai trả lời đúng: isWrong (darkened charcoal slate, no letter)
  const isSelecting = isCurrentRow && !isOpened && !isWrong;

  const bgGradient = isWrong
    ? "radial-gradient(circle at 35% 30%, #374151 0%, #1f2937 55%, #111827 100%)"
    : isOpened
    ? "radial-gradient(circle at 35% 30%, #ffffff 0%, #e0f2fe 28%, #7dd3fc 68%, #38bdf8 100%)"
    : isSelecting
    ? "radial-gradient(circle at 35% 30%, #fef08a 0%, #f59e0b 45%, #b45309 80%, #78350f 100%)"
    : "radial-gradient(circle at 35% 30%, #93c5fd 0%, #38bdf8 25%, #0284c7 55%, #03487f 80%, #02203d 100%)";

  const borderColor = isWrong
    ? "1.5px solid rgba(107, 114, 128, 0.4)"
    : isOpened
    ? "1.5px solid rgba(224, 242, 254, 0.98)"
    : isSelecting
    ? "2px solid rgba(254, 240, 138, 0.95)"
    : "1.5px solid rgba(224, 242, 254, 0.85)";

  return (
    <div
      className={`relative ${sizeClass} rounded-full flex items-center justify-center transition-all duration-300 shrink-0 ${
        isSelecting
          ? "ring-2 ring-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.9)] animate-pulse scale-105"
          : isOpened
          ? "shadow-[0_0_12px_rgba(125,211,252,0.75)]"
          : isWrong
          ? "shadow-[0_2px_4px_rgba(0,0,0,0.5)] opacity-60"
          : "shadow-[0_4px_10px_rgba(0,0,0,0.65)]"
      }`}
      style={{
        background: bgGradient,
        border: borderColor,
        boxShadow: isWrong
          ? "inset 0 1px 2px rgba(0,0,0,0.5)"
          : isOpened
          ? "0 3px 8px rgba(0,0,0,0.45), inset 0 2px 4px rgba(255,255,255,0.95), inset 0 -2px 4px rgba(14,116,144,0.45)"
          : "0 4px 10px rgba(0,0,0,0.7), inset 0 2px 4px rgba(255,255,255,0.7), inset 0 -2px 4px rgba(0,0,0,0.8)",
      }}
    >
      {/* Specular White Glint Spot at top-left for ultra-glossy 3D glass illusion */}
      {!isWrong && (
        <div className="absolute top-1 left-1.5 w-2 h-1 sm:w-2.5 sm:h-1.5 rounded-full bg-white/80 blur-[0.3px] pointer-events-none" />
      )}

      {/* Dark deep navy letter text when opened and not wrong */}
      {isOpened && !isWrong && letter ? (
        <span
          className={`font-black ${letterSizeClass} uppercase tracking-normal text-[#04183d] select-none leading-none`}
          style={{ textShadow: "0 1px 0 rgba(255,255,255,0.5)" }}
        >
          {letter}
        </span>
      ) : null}
    </div>
  );
}

/**
 * 3D Beveled Square Row Number Badge on the right of each row (1..4)
 */
export function Vtv3RowNumberBadge({
  number,
  isActive = false,
  isOpened = false,
}: {
  number: number;
  isActive?: boolean;
  isOpened?: boolean;
}) {
  return (
    <div
      className={`relative w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center font-black text-sm sm:text-base md:text-lg text-white select-none transition-all duration-300 shadow-lg shrink-0 ${
        isActive
          ? "ring-2 ring-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.85)] scale-105"
          : "border border-cyan-400/40"
      }`}
      style={{
        background: isActive
          ? "linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #075985 100%)"
          : isOpened
          ? "linear-gradient(135deg, #0f766e 0%, #115e59 50%, #134e4a 100%)"
          : "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #172554 100%)",
        boxShadow: "inset 0 1px 2px rgba(255,255,255,0.45), 0 4px 8px rgba(0,0,0,0.6)",
      }}
    >
      {number}
    </div>
  );
}

export function GlossyBlackDomeButton({
  letter,
  isOpened = false,
  isCurrentRow = false,
}: {
  letter?: string;
  isOpened?: boolean;
  isCurrentRow?: boolean;
}) {
  return (
    <div
      className={`relative w-10 h-10 sm:w-12 sm:h-12 md:w-13 md:h-13 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 ${
        isCurrentRow
          ? "ring-2 ring-amber-400 shadow-[0_0_18px_rgba(245,158,11,0.55)] scale-105"
          : "shadow-[0_6px_14px_rgba(0,0,0,0.85)]"
      }`}
      style={{
        background:
          "radial-gradient(circle at 35% 30%, #526075 0%, #1e293b 35%, #0b111c 75%, #020408 100%)",
        border: "2px solid rgba(148, 163, 184, 0.75)",
        boxShadow:
          "0 6px 14px rgba(0,0,0,0.85), inset 0 2px 4px rgba(255,255,255,0.45), inset 0 -3px 6px rgba(0,0,0,0.9)",
      }}
    >
      {/* Chrome rim reflection */}
      <div className="absolute inset-0.5 rounded-full border border-white/15 pointer-events-none" />

      {/* Letter text when opened */}
      {isOpened && letter ? (
        <span
          className="font-black text-xl sm:text-2xl md:text-3xl uppercase tracking-wider select-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
          style={{
            background: "linear-gradient(180deg, #ffffff 0%, #ffd700 50%, #f59e0b 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {letter}
        </span>
      ) : null}
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 3D BLUE SQUARE ROW NUMBER BADGE (As seen in Image 1 right end of each row)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function BlueSquareNumberBadge({
  number,
  isActive = false,
}: {
  number: number | string;
  isActive?: boolean;
}) {
  return (
    <div
      className={`w-10 h-10 sm:w-12 sm:h-12 md:w-13 md:h-13 rounded-xl flex items-center justify-center font-black text-xl sm:text-2xl text-white shrink-0 transition-all ${
        isActive
          ? "border-2 border-amber-300 shadow-[0_0_18px_#f59e0b] scale-110"
          : "border-2 border-sky-300 shadow-[0_4px_14px_rgba(2,132,199,0.55)]"
      }`}
      style={{
        background: isActive
          ? "linear-gradient(180deg, #0284c7 0%, #0369a1 50%, #075985 100%)"
          : "linear-gradient(180deg, #38bdf8 0%, #0284c7 50%, #0369a1 100%)",
        boxShadow:
          "0 6px 14px rgba(0,0,0,0.7), inset 0 2px 3px rgba(255,255,255,0.6), inset 0 -2px 4px rgba(0,0,0,0.6)",
      }}
    >
      <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{number}</span>
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * COMPONENT 2: VCNV 15-SECOND COUNTDOWN GRAPHIC (Image 1)
 * - Upper area: 4 rows of 3D glossy black dome buttons + 3D blue row number badges.
 * - Bottom area: Vtv3ChalkboardQuestionFrame in bottom 1/3 with row hint & 15s timer.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function VcnvCountdownGraphic({
  state,
  serverNow,
}: {
  state: OlympiaState;
  serverNow: () => number;
}) {
  const v = state.vcnv!;
  const curIdx = v.currentRow;
  const isCenter = curIdx === 4;
  const curRow = curIdx >= 0 && curIdx < 4 ? v.rows[curIdx] : null;
  const isQuestionActive = (v.phase === "question" || v.phase === "waitingAnswer") && curIdx >= 0;
  const rawQuestionHint = isQuestionActive ? (isCenter ? v.centerQuestion?.q : curRow?.hint) : "";
  const questionHint = stripVcnvLetterCount(rawQuestionHint || "");
  const isV3Arrow = state.themeMode !== "o26_classic";

  // Keyword character count (exact length from server or clean word)
  const cleanKeyword = cleanVcnvWord(v.keyword || "");
  const keywordLen = v.keywordLength || cleanKeyword.length;

  // Direct-DOM 60 FPS Countdown timer
  const timer = v.timer;
  const fillRef = useRef<HTMLDivElement>(null);
  const pearlRef = useRef<HTMLDivElement>(null);
  const secTextRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (isV3Arrow) return;
    if (!timer || timer.startedAt == null) {
      if (fillRef.current) fillRef.current.style.width = "0%";
      if (pearlRef.current) pearlRef.current.style.display = "none";
      if (secTextRef.current) secTextRef.current.textContent = "15s";
      return;
    }

    let rafId: number;
    let active = true;

    const tick = () => {
      if (!active) return;
      const total = timer.totalMs || 15000;
      const elapsed = Math.max(0, serverNow() - (timer.startedAt ?? 0));
      const remMs = Math.max(0, timer.remainingMs - elapsed);
      const remSec = Math.ceil(remMs / 1000);
      const elapsedPct = Math.max(0, Math.min(100, (elapsed / total) * 100));
      const remPct = Math.max(0, Math.min(100, (remMs / total) * 100));

      if (fillRef.current) {
        if (isV3Arrow) {
          fillRef.current.style.width = `${elapsedPct}%`;
          fillRef.current.style.background =
            remSec <= 5
              ? "linear-gradient(90deg, #dc2626, #f59e0b)"
              : "linear-gradient(90deg, #1fd1ff, #2ee6ff)";
        } else {
          fillRef.current.style.width = `${elapsedPct}%`;
          fillRef.current.style.background =
            remSec <= 5
              ? "linear-gradient(90deg, #ef4444, #f43f5e)"
              : "linear-gradient(90deg, #d97706, #f59e0b, #ef4444)";
        }
      }
      if (pearlRef.current && !isV3Arrow) {
        if (elapsedPct > 0 && elapsedPct < 100 && remMs > 0) {
          pearlRef.current.style.display = "block";
          pearlRef.current.style.left = `${elapsedPct}%`;
        } else {
          pearlRef.current.style.display = "none";
        }
      }
      if (secTextRef.current && isV3Arrow) {
        const label = `${remSec < 10 ? `0${remSec}` : remSec}s`;
        if (secTextRef.current.textContent !== label) secTextRef.current.textContent = label;
      }

      if (remMs > 0) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      active = false;
      cancelAnimationFrame(rafId);
    };
  }, [timer?.startedAt, timer?.remainingMs, timer?.totalMs, isV3Arrow, serverNow]);

  // Balanced 5-piece puzzle proportions (~20% area each: 45%x45% center piece = 20.25%, each L-piece = 19.94%)
  const QUAD_PIECES = [
    {
      index: 0,
      label: "1",
      clipPath: "polygon(0% 0%, 100% 0%, 100% 55%, 55% 55%, 55% 100%, 0% 100%)",
      svgPoints: "0.5,0.5 99.5,0.5 99.5,55 55,55 55,99.5 0.5,99.5",
      labelPos: "left-[28%] top-[28%]",
    },
    {
      index: 1,
      label: "2",
      clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 45% 100%, 45% 55%, 0% 55%)",
      svgPoints: "0.5,0.5 99.5,0.5 99.5,99.5 45,99.5 45,55 0.5,55",
      labelPos: "left-[72%] top-[28%]",
    },
    {
      index: 3,
      label: "4",
      clipPath: "polygon(0% 0%, 55% 0%, 55% 45%, 100% 45%, 100% 100%, 0% 100%)",
      svgPoints: "0.5,0.5 55,0.5 55,45 99.5,45 99.5,99.5 0.5,99.5",
      labelPos: "left-[28%] top-[72%]",
    },
    {
      index: 2,
      label: "3",
      clipPath: "polygon(45% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 45%, 45% 45%)",
      svgPoints: "45,0.5 99.5,0.5 99.5,99.5 0.5,99.5 0.5,45 45,45",
      labelPos: "left-[72%] top-[72%]",
    },
  ];

  const hasBell = v.bells && v.bells.length > 0;

  return (
    <div className="absolute inset-0 z-20 pointer-events-auto flex flex-col p-3 sm:p-5 md:p-6 overflow-hidden bg-[#040d21]">
      {/* ── Specialized Econova Backdrop for V3, or Subtle Dot Pattern for Classic ── */}
      {isV3Arrow ? (
        <Olympia22BackgroundBackdrop />
      ) : (
        <div className="absolute inset-0 z-0 pointer-events-none bg-[#061e47]">
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage: "radial-gradient(#38bdf8 1.5px, transparent 1.5px)",
              backgroundSize: "24px 24px",
            }}
          />
        </div>
      )}

      {/* ── 4-QUADRANT GRID LAYOUT (2 Columns x 2 Rows) ── */}
      <div className="relative z-10 grid grid-cols-2 grid-rows-2 gap-3 sm:gap-4 md:gap-5 w-full h-full">

        {/* ═══════════════════════════════════════════════════════════════════
            QUADRANT 1: TOP-LEFT (MYSTERY PUZZLE GRID: 1, 2, 4, 3 + CENTER 5)
           ═══════════════════════════════════════════════════════════════════ */}
        <div
          className={`relative w-full h-full rounded-2xl overflow-hidden border-2 ${
            !isV3Arrow
              ? "border-amber-400/80 shadow-[0_0_25px_rgba(245,158,11,0.25)] bg-[#0d131f]"
              : "border-cyan-400/60 shadow-[0_0_25px_rgba(6,182,212,0.3)] bg-[#071739]"
          } flex items-center justify-center`}
        >
          {v.mysteryImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={v.mysteryImage}
              alt="Chướng ngại vật"
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          {/* 4 L-Shaped Corner Quadrants (1, 2, 4, 3) — Zero Overlap with Center Piece 5 */}
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
            {QUAD_PIECES.map((piece) => {
              const isRevealed = v.piecesRevealed[piece.index];
              const isSelectedPiece = curIdx === piece.index;
              return (
                <div
                  key={piece.index}
                  className={`relative ${!isV3Arrow ? "bg-[#111622]" : "bg-[#0b1b3d]"} ${
                    isRevealed
                      ? "opacity-0 pointer-events-none transition-opacity duration-700"
                      : isSelectedPiece
                      ? !isV3Arrow
                        ? "bg-gradient-to-br from-[#3b2406] to-[#1a0f02] opacity-100"
                        : "bg-gradient-to-br from-[#0f3178] to-[#081d4a] opacity-100"
                      : !isV3Arrow
                      ? "bg-[#141924] opacity-100"
                      : "bg-[#0b1b3d] opacity-100"
                  }`}
                  style={{ clipPath: piece.clipPath }}
                >
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  >
                    <polygon
                      points={piece.svgPoints}
                      fill="none"
                      stroke={
                        isSelectedPiece
                          ? "#fbbf24"
                          : !isV3Arrow
                          ? "rgba(212, 175, 55, 0.45)"
                          : "rgba(34, 211, 238, 0.45)"
                      }
                      strokeWidth={isSelectedPiece ? "2.2" : "1.2"}
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                  <span
                    className={`absolute -translate-x-1/2 -translate-y-1/2 ${piece.labelPos} text-2xl sm:text-4xl md:text-5xl font-black select-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.85)] ${
                      isSelectedPiece ? "text-amber-300" : "text-white"
                    }`}
                  >
                    {piece.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Center Tile (Piece 5): Fits flush into the balanced 45% x 45% center cutout without overlapping pieces 1-4 */}
          <div
            className={`absolute left-[27.5%] top-[27.5%] w-[45%] h-[45%] border-2 flex items-center justify-center z-10 ${
              v.piecesRevealed[4]
                ? "opacity-0 pointer-events-none transition-opacity duration-700"
                : isCenter
                ? "bg-gradient-to-br from-[#0c2866] to-[#04153a] border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.85)] opacity-100 ring-2 ring-amber-300"
                : !isV3Arrow
                ? "bg-[#15181f] border-amber-400/80 shadow-[0_0_16px_rgba(245,158,11,0.4)] opacity-100"
                : "bg-[#071739] border-cyan-400/80 shadow-[0_0_16px_rgba(6,182,212,0.4)] opacity-100"
            }`}
          >
            {isCenter && !v.piecesRevealed[4] && (
              <div className="absolute inset-0 pointer-events-none ring-4 ring-amber-300 animate-pulse rounded-none" />
            )}
            <span
              className={`text-2xl sm:text-4xl md:text-5xl font-black select-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.85)] relative z-10 ${
                isCenter ? "text-amber-300" : "text-white"
              }`}
            >
              5
            </span>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            QUADRANT 2: TOP-RIGHT (ROWS BOARD: SINGLE-LINE DOME ROWS 1..4)
           ═══════════════════════════════════════════════════════════════════ */}
        <div
          className={`relative w-full h-full rounded-2xl overflow-hidden border-2 ${
            !isV3Arrow
              ? "border-amber-400/80 shadow-[0_0_25px_rgba(245,158,11,0.25)] bg-gradient-to-br from-[#1e222a] via-[#15181f] to-[#0d0f14]"
              : "border-cyan-400/60 shadow-[0_0_25px_rgba(6,182,212,0.3)] bg-gradient-to-br from-[#071a3d] via-[#05132d] to-[#030c1d]"
          } flex flex-col justify-between p-2 sm:p-2.5 md:p-3`}
        >
          {/* Header Badge: CHƯỚNG NGẠI VẬT CÓ X CHỮ CÁI */}
          <div className="flex items-center justify-center w-full pb-1.5 shrink-0">
            <div
              className={`px-4 sm:px-6 py-1 rounded-full border-2 ${
                !isV3Arrow
                  ? "border-amber-400/80 bg-gradient-to-r from-amber-950 via-[#2e1d05] to-amber-950 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                  : "border-cyan-400/80 bg-gradient-to-r from-cyan-950 via-[#0a2e66] to-cyan-950 shadow-[0_0_20px_rgba(6,182,212,0.4)]"
              } flex items-center justify-center`}
            >
              <span
                className={`font-black text-[11px] sm:text-xs md:text-sm uppercase tracking-wider ${
                  !isV3Arrow ? "text-amber-100" : "text-cyan-100"
                } drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]`}
              >
                CHƯỚNG NGẠI VẬT CÓ {keywordLen} {getVcnvUnit(v.keyword || "").toUpperCase()}
              </span>
            </div>
          </div>

          {/* 4 Rows — strictly 1 single horizontal line per row */}
          <div className="flex-1 min-h-0 flex flex-col justify-evenly gap-1 py-0.5 w-full max-w-full">
            {(() => {
              const maxRowLen = Math.max(
                8,
                ...v.rows.map((r) => r.letterCount || cleanVcnvWord(r.answer || "").length || 1)
              );
              const domeSize =
                maxRowLen >= 13
                  ? "w-5 h-5 sm:w-5 sm:h-5 md:w-6 md:h-6"
                  : maxRowLen >= 10
                  ? "w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7"
                  : "w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8";
              const domeLetterSize =
                maxRowLen >= 13
                  ? "text-[10px] sm:text-[11px] md:text-xs"
                  : "text-xs sm:text-sm md:text-base";

              return v.rows.map((row, rIdx) => {
                const isCurrent = curIdx === rIdx;
                const cleanAns = cleanVcnvWord(row.answer || "");
                const letterCount = row.letterCount || cleanAns.length || 1;
                const letters = cleanAns.split("");

                if (isV3Arrow) {
                  return (
                    <div
                      key={rIdx}
                      className={`relative flex items-center justify-between gap-2 pl-2.5 pr-4 py-1 transition-all duration-300 ${
                        isCurrent
                          ? "bg-gradient-to-r from-cyan-900/80 via-[#0d2c54] to-cyan-500/30 border-l-4 border-cyan-300 shadow-[0_0_20px_rgba(46,230,255,0.45)]"
                          : "bg-[#08203f]/80 border-l-2 border-cyan-700/40"
                      }`}
                      style={{
                        clipPath: "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)",
                      }}
                    >
                      <div className="flex-1 min-w-0 flex items-center flex-nowrap gap-1 sm:gap-1.5">
                        {Array.from({ length: letterCount }).map((_, cIdx) => (
                          <GlossyBlueDomeButton
                            key={cIdx}
                            letter={letters[cIdx]}
                            isOpened={row.opened}
                            isCurrentRow={isCurrent}
                            isWrong={row.wrong}
                            sizeClass={domeSize}
                            letterSizeClass={domeLetterSize}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Vtv3RowNumberBadge number={rIdx + 1} isActive={isCurrent} isOpened={row.opened} />
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={rIdx}
                    className={`flex items-center justify-between gap-2 px-2 sm:px-3 py-1 rounded-xl transition-all duration-300 ${
                      isCurrent
                        ? !isV3Arrow
                          ? "bg-amber-500/25 border-2 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)] scale-[1.01]"
                          : "bg-cyan-500/20 border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.5)] scale-[1.01]"
                        : "border border-transparent"
                    }`}
                  >
                    {/* Dome Buttons with exact letterCount on a single line */}
                    <div className="flex-1 min-w-0 flex items-center flex-nowrap gap-1 sm:gap-1.5">
                      {Array.from({ length: letterCount }).map((_, cIdx) => (
                        <GlossyBlueDomeButton
                          key={cIdx}
                          letter={letters[cIdx]}
                          isOpened={row.opened}
                          isCurrentRow={isCurrent}
                          isWrong={row.wrong}
                          sizeClass={domeSize}
                          letterSizeClass={domeLetterSize}
                        />
                      ))}
                    </div>

                    {/* Row Number Badge (1..4) */}
                    <Vtv3RowNumberBadge
                      number={rIdx + 1}
                      isActive={isCurrent}
                      isOpened={row.opened}
                    />
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            QUADRANT 3: BOTTOM-LEFT (UNIFORM ROUNDED QUESTION BOX + FLUSH BOTTOM TIMER)
           ═══════════════════════════════════════════════════════════════════ */}
        <div
          className={`relative w-full h-full rounded-2xl overflow-hidden border-2 ${
            !isV3Arrow
              ? "border-amber-400/80 shadow-[0_0_30px_rgba(245,158,11,0.3)] bg-gradient-to-br from-[#1e222a] via-[#15181f] to-[#0d0f14]"
              : "border-cyan-400/80 shadow-[0_0_30px_rgba(6,182,212,0.35)] bg-gradient-to-br from-[#061838] via-[#041026] to-[#020914]"
          } flex flex-col justify-between`}
        >
          {/* Question Text Body (Top-Left Aligned) / Done Celebration */}
          <div className="flex-1 min-h-0 flex flex-col items-start justify-start px-4 sm:px-5 pt-3 sm:pt-4 pb-4 text-left overflow-hidden">
            {v.phase === "selecting" || v.phase === "grid" || curIdx < 0 ? null : v.phase === "done" ? (
              <div className="w-full flex flex-col items-center justify-center h-full text-center gap-2 animate-fade-in">
                <div className="px-4 py-1 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300 text-xs sm:text-sm font-black uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                  CHƯỚNG NGẠI VẬT ĐÃ ĐƯỢC GIẢI MÃ
                </div>
                <BoundedText
                  text={v.keyword || "—"}
                  className="text-2xl sm:text-4xl md:text-5xl font-black text-amber-300 tracking-wider drop-shadow-[0_4px_16px_rgba(245,158,11,0.8)]"
                  align="center"
                />
                {v.solvedBy != null && state.seats[v.solvedBy] && (
                  <div className="text-sm sm:text-lg text-cyan-200 font-bold">
                    Chúc mừng thí sinh <span className="text-white font-black underline">{state.seats[v.solvedBy].name}</span>!
                  </div>
                )}
              </div>
            ) : (
              <p
                className={`w-full font-bold text-white select-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.92)] tracking-wide ${
                  (questionHint || "").length > 260
                    ? "text-[16px] sm:text-[18px] md:text-[20px] lg:text-[22px] leading-[1.36]"
                    : (questionHint || "").length > 170
                    ? "text-[18px] sm:text-[21px] md:text-[23px] lg:text-[25px] leading-[1.36]"
                    : "text-[21px] sm:text-[24px] md:text-[27px] lg:text-[30px] xl:text-[33px] leading-[1.38]"
                }`}
              >
                {questionHint || ""}
              </p>
            )}
          </div>

          {/* Reserve bottom space when CNV bell badges are visible at fixed bottom-left */}
          {hasBell && <div className="w-full h-9 shrink-0" />}

          {/* Bottom Edge Timer Bar — docked flush at absolute bottom-0 & aligned inside rounded pill corners */}
          {isV3Arrow ? (
            <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
              <EconovaSpecializedTimerBar
                timer={v.timer}
                serverNow={serverNow}
                defaultTotalMs={15000}
                height={20}
                clipPath="none"
                trackMargin="0 22px"
              />
            </div>
          ) : (
            <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-1 pointer-events-none">
              <div className={`w-full relative h-2 rounded-full ${!isV3Arrow ? "bg-black/90 border border-amber-500/50" : "bg-slate-950/90 border border-cyan-500/40"} overflow-visible shadow-inner flex items-center`}>
                <div
                  ref={fillRef}
                  className="h-full rounded-full will-change-[width]"
                  style={{
                    width: "0%",
                    background: !isV3Arrow
                      ? "linear-gradient(90deg, #d4af37, #fef08a, #f59e0b)"
                      : "linear-gradient(90deg, #d97706, #f59e0b, #ef4444)",
                  }}
                />
                <div
                  ref={pearlRef}
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 ${!isV3Arrow ? "border-amber-200 shadow-[0_0_12px_#f59e0b]" : "border-white shadow-[0_0_12px_#ef4444]"} pointer-events-none will-change-[left] z-30`}
                  style={{
                    display: "none",
                    left: "0%",
                    background: !isV3Arrow
                      ? "radial-gradient(circle at 35% 30%, #fef08a 0%, #f59e0b 50%, #b45309 100%)"
                      : "radial-gradient(circle at 35% 30%, #f87171 0%, #dc2626 50%, #991b1b 100%)",
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            QUADRANT 4: BOTTOM-RIGHT (3D STUDIO CAMERA WINDOW SLOT)
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="relative w-full h-full rounded-2xl overflow-hidden pointer-events-none" />

      </div>

      {/* Fixed VCNV Bell Signal Overlay (Shared coordinate with VcnvAnswerRevealGraphic) */}
      <VcnvCnvBellSignalOverlay state={state} />
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * FIXED VCNV CNV BELL SIGNAL OVERLAY
 * Renders CNV bell badges at an identical fixed screen coordinate across BOTH
 * the main VCNV graphic (`VcnvCountdownGraphic`) and the VCNV Answer Reveal
 * graphic (`VcnvAnswerRevealGraphic`).
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function VcnvCnvBellSignalOverlay({ state }: { state: OlympiaState }) {
  const v = state.vcnv;
  if (!v || !v.bells || v.bells.length === 0) return null;
  const sortedBells = [...v.bells].sort((a, b) => (a.atMs ?? 0) - (b.atMs ?? 0));

  return (
    <div
      data-testid="vcnv-fixed-bell-overlay"
      className="absolute bottom-5 left-6 sm:bottom-7 sm:left-9 z-40 pointer-events-none flex items-center justify-start gap-2.5 flex-wrap max-w-[46%]"
    >
      {sortedBells.map((b, bIdx) => {
        const s = state.seats[b.seat];
        return (
          <div
            key={`${b.seat}-${bIdx}`}
            className="bg-gradient-to-r from-red-600 to-rose-600 rounded-lg px-3.5 py-1.5 text-white font-black text-xs sm:text-sm md:text-base leading-normal shadow-[0_0_15px_rgba(239,68,68,0.75)] border border-red-300 flex items-center gap-1.5 animate-fade-in"
          >
            <span>{s?.name || `Thí sinh ${b.seat + 1}`}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTIC ECONOVA V3 UNIFIED GEOMETRY ENGINE (script5.js)
// ─────────────────────────────────────────────────────────────────────────────
import {
  buildArrowShell,
  buildLowerThirdLayout,
  buildClusterPackStrip,
  buildRowColumns,
  buildVeDichGrid,
  resolveVeDichGridSpec,
  isGridCellSelected,
  toPoly,
  toSvgPath,
  buildHexClipKeyframes,
  getHexClipPoints,
  genZigzagShape,
  genVeDichGridCells,
  type ZigzagShape,
  type GridCell,
  type ArrowShell,
  type Pt,
} from "./v3Geometry";

import { V3ArrowShell, V3ScaledStage, V3_COLORS } from "./V3ArrowShell";

export { toPoly, toSvgPath, genZigzagShape, genVeDichGridCells, HopeStarBadge };
export type { ZigzagShape, GridCell, ArrowShell };

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * DELIVERABLE 2: VCNV ANSWER REVEAL GRAPHIC
 * 4 Chevron bars generated with buildArrowShell & buildRowColumns.
 * Pure contestant names (NO seat number prefix).
 * Uniform typography, zero header pill text.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function VcnvAnswerRevealGraphic({
  state,
  isWaitingAnswer = false,
}: {
  state: OlympiaState;
  isWaitingAnswer?: boolean;
}) {
  const v = state.vcnv;
  if (!v) return null;
  const seats = activeSeats(state);
  const isV3Arrow = state.themeMode !== "o26_classic";
  const curRow = v.currentRow >= 0 && v.currentRow < 4 ? v.rows[v.currentRow] : null;
  const rawRowAns = curRow ? curRow.answer : (v.currentRow === 4 ? (v.centerQuestion?.a || "") : "");
  const cleanRowAns = stripVcnvLetterCount(rawRowAns || "");
  const vcnvRowLabel =
    v.currentRow === 4
      ? "ĐÁP ÁN CÂU TRUNG TÂM"
      : v.currentRow >= 0
      ? `ĐÁP ÁN HÀNG NGANG ${v.currentRow + 1}`
      : "ĐÁP ÁN CHƯỚNG NGẠI VẬT";

  if (isV3Arrow) {
    const seatCount = Math.max(1, seats.length);
    const W = 1420;
    const H = seatCount <= 4 ? 110 : seatCount === 5 ? 96 : seatCount === 6 ? 84 : 74;
    const thick = seatCount <= 5 ? 28 : 22;
    const cThick = seatCount <= 5 ? 22 : 18;
    const pad = Math.round(cThick * 1.5);
    const shell = buildArrowShell({ W, H, slantRatio: 0.34, thick, cThick, pad });
    const cols = buildRowColumns(shell, [44, 56]);
    const dc = shell.W / 2;
    const nameFontSize = seatCount <= 4 ? 34 : seatCount === 5 ? 32 : seatCount === 6 ? 28 : 25;
    const ansFontSize = seatCount <= 4 ? 38 : seatCount === 5 ? 36 : seatCount === 6 ? 31 : 27;
    const textBaselineOffset = Math.round(ansFontSize * 0.34);
    const rowGapClass = seatCount <= 4 ? "gap-5" : seatCount === 5 ? "gap-4" : "gap-2.5";
    const rowClipCss = buildHexClipKeyframes(shell, {
      name: "v3-row-hex",
      closeEndPercent: 14.9,
      openStartPercent: 15,
      openEndPercent: 100,
      timingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
    });
    const skipAnimation = Boolean(v.revealCount && v.revealCount > 1);

    return (
      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 z-20 pointer-events-auto bg-[#040d21] overflow-hidden select-none">
        <Olympia22BackgroundBackdrop />
        <style>{`
          @keyframes v3-row-wing-l-g1 {
            0%   { transform: translateX(calc(var(--dc))); opacity: 0; }
            15%  { transform: translateX(calc(var(--dc))); opacity: 0.35; }
            85%  { transform: translateX(-14px); opacity: 0.35; }
            100% { transform: translateX(0); opacity: 0.35; }
          }
          @keyframes v3-row-wing-l-g2 {
            0%   { transform: translateX(calc(var(--dc))); opacity: 0; }
            15%  { transform: translateX(calc(var(--dc))); opacity: 0.65; }
            85%  { transform: translateX(-7px); opacity: 0.65; }
            100% { transform: translateX(0); opacity: 0.65; }
          }
          @keyframes v3-row-wing-l-l3 {
            0%   { transform: translateX(calc(var(--dc))); opacity: 0; }
            15%  { transform: translateX(calc(var(--dc))); opacity: 1; }
            100% { transform: translateX(0); opacity: 1; }
          }
          @keyframes v3-row-wing-r-g1 {
            0%   { transform: translateX(calc(var(--dc) * -1)); opacity: 0; }
            15%  { transform: translateX(calc(var(--dc) * -1)); opacity: 0.35; }
            85%  { transform: translateX(14px); opacity: 0.35; }
            100% { transform: translateX(0); opacity: 0.35; }
          }
          @keyframes v3-row-wing-r-g2 {
            0%   { transform: translateX(calc(var(--dc) * -1)); opacity: 0; }
            15%  { transform: translateX(calc(var(--dc) * -1)); opacity: 0.65; }
            85%  { transform: translateX(7px); opacity: 0.65; }
            100% { transform: translateX(0); opacity: 0.65; }
          }
          @keyframes v3-row-wing-r-l3 {
            0%   { transform: translateX(calc(var(--dc) * -1)); opacity: 0; }
            15%  { transform: translateX(calc(var(--dc) * -1)); opacity: 1; }
            100% { transform: translateX(0); opacity: 1; }
          }
          ${rowClipCss}
          @keyframes v3-row-content {
            0% { opacity: 0; transform: translateY(-8px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          ${skipAnimation ? `
            .v3-row-wing-l-g1, .v3-row-wing-l-g2, .v3-row-wing-l-l3,
            .v3-row-wing-r-g1, .v3-row-wing-r-g2, .v3-row-wing-r-l3,
            .v3-row-hex, .v3-row-content {
              animation: none !important;
              opacity: 1 !important;
              transform: none !important;
            }
          ` : `
          .v3-row-wing-l-g1 {
            animation: v3-row-wing-l-g1 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
          }
          .v3-row-wing-l-g2 {
            animation: v3-row-wing-l-g2 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
          }
          .v3-row-wing-l-l3 {
            animation: v3-row-wing-l-l3 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
          }
          .v3-row-wing-r-g1 {
            animation: v3-row-wing-r-g1 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
          }
          .v3-row-wing-r-g2 {
            animation: v3-row-wing-r-g2 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
          }
          .v3-row-wing-r-l3 {
            animation: v3-row-wing-r-l3 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
          }
          .v3-row-hex {
            animation: v3-row-hex 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
          }
          .v3-row-content {
            animation: v3-row-content 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) both;
          }
          `}
        `}</style>
        {/* Only pure graphic bars - Expanded to ~86-88% broadcast viewport width */}
        <div className={`relative z-10 w-[88%] max-w-[1640px] flex flex-col ${rowGapClass} items-center justify-center py-2`}>
          {seats.map((seat, idx) => {
            const answerText = v.answers?.[seat.id]?.text || "";
            const rowDelay = idx * 0.14;

            const isCorrect = state.vcnv?.revealedCorrectAnswer && rawRowAns
              ? (() => {
                  const primaryClean = cleanVcnvWord(rawRowAns).toLowerCase();
                  const userClean = cleanVcnvWord(answerText).toLowerCase();
                  const parsed = parseVcnvAnswer(rawRowAns);
                  if (userClean && userClean === primaryClean) return true;
                  return parsed.acceptedAnswers.some(
                    (cand) => cleanVcnvWord(cand).toLowerCase() === userClean
                  );
                })()
              : false;
            const isDimmed = Boolean(state.vcnv?.revealedCorrectAnswer && !isCorrect);
            const isHighlighted = Boolean(state.vcnv?.revealedCorrectAnswer && isCorrect);

            return (
              <div
                key={seat.id}
                className="w-full flex items-center justify-center transition-all duration-500 ease-in-out"
                style={{
                  ["--dc" as string]: `${dc}px`,
                  opacity: isDimmed ? 0.35 : 1,
                  filter: isDimmed ? "brightness(0.5) contrast(0.85)" : "none",
                }}
              >
                <V3ScaledStage designW={shell.canvasW} designH={H}>
                  {/* Tier 1 (Bottom / z-0): Cyan sliding wings */}
                  <svg
                    width={shell.canvasW}
                    height={H}
                    viewBox={`0 0 ${shell.canvasW} ${H}`}
                    className="absolute inset-0 overflow-visible"
                    style={{ zIndex: 0 }}
                  >
                    <defs>
                      <linearGradient id={`vcnvWing-${idx}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#1fd1ff" />
                        <stop offset="100%" stopColor="#2ee6ff" />
                      </linearGradient>
                    </defs>

                    {/* Left 3-layer cyan wings */}
                    <g className="v3-row-wing-l-g1" style={{ animationDelay: `${rowDelay}s` }}>
                      <path d={toSvgPath(shell.alcPts)} fill={`url(#vcnvWing-${idx})`} opacity={0.35} />
                    </g>
                    <g className="v3-row-wing-l-g2" style={{ animationDelay: `${rowDelay}s` }}>
                      <path d={toSvgPath(shell.alcPts)} fill={`url(#vcnvWing-${idx})`} opacity={0.65} />
                    </g>
                    <g className="v3-row-wing-l-l3" style={{ animationDelay: `${rowDelay}s` }}>
                      <path d={toSvgPath(shell.alcPts)} fill={`url(#vcnvWing-${idx})`} opacity={1.0} />
                    </g>

                    {/* Right 3-layer cyan wings */}
                    <g className="v3-row-wing-r-l3" style={{ animationDelay: `${rowDelay}s` }}>
                      <path d={toSvgPath(shell.arcPts)} fill={`url(#vcnvWing-${idx})`} opacity={1.0} />
                    </g>
                    <g className="v3-row-wing-r-g2" style={{ animationDelay: `${rowDelay}s` }}>
                      <path d={toSvgPath(shell.arcPts)} fill={`url(#vcnvWing-${idx})`} opacity={0.65} />
                    </g>
                    <g className="v3-row-wing-r-g1" style={{ animationDelay: `${rowDelay}s` }}>
                      <path d={toSvgPath(shell.arcPts)} fill={`url(#vcnvWing-${idx})`} opacity={0.35} />
                    </g>
                  </svg>

                  {/* Tier 2 (Middle / z-10): Unified wrapper containing BOTH hexagon SVG body AND content, clipped by 6-vertex polygon */}
                  <div
                    className="v3-row-hex absolute inset-0"
                    style={{
                      zIndex: 10,
                      animationDelay: `${rowDelay}s`,
                      clipPath: `polygon(${toPoly(shell.bgPts)})`,
                    }}
                  >
                    <svg
                      width={shell.canvasW}
                      height={H}
                      viewBox={`0 0 ${shell.canvasW} ${H}`}
                      className="absolute inset-0 overflow-visible"
                    >
                      <defs>
                        <linearGradient id={`vcnvName-${idx}`} x1="0" y1="0" x2="1" y2="0">
                          {isHighlighted ? (
                            <>
                              <stop offset="0%" stopColor="#047857" />
                              <stop offset="100%" stopColor="#10b981" />
                            </>
                          ) : (
                            <>
                              <stop offset="0%" stopColor="#051433" />
                              <stop offset="100%" stopColor="#0d2c54" />
                            </>
                          )}
                        </linearGradient>
                        <linearGradient id={`vcnvAns-${idx}`} x1="0" y1="0" x2="1" y2="0">
                          {isHighlighted ? (
                            <>
                              <stop offset="0%" stopColor="#065f46" />
                              <stop offset="100%" stopColor="#059669" />
                            </>
                          ) : (
                            <>
                              <stop offset="0%" stopColor="#09408f" />
                              <stop offset="100%" stopColor="#0072ff" />
                            </>
                          )}
                        </linearGradient>
                      </defs>

                      {/* Cell 0 (48%): Contestant Pure Name - No Seat Number Prefix */}
                      <path d={toSvgPath(cols.cells[0].pts)} fill={`url(#vcnvName-${idx})`} />

                      {/* Cell 1 (52%): Contestant Answer - Uniform Font Size */}
                      <path d={toSvgPath(cols.cells[1].pts)} fill={`url(#vcnvAns-${idx})`} />

                      {/* Slanted seam divider */}
                      {cols.seams.map((s, sIdx) => (
                        <line
                          key={sIdx}
                          x1={s.x0}
                          y1={s.y0}
                          x2={s.x1}
                          y2={s.y1}
                          stroke="#ffffff"
                          strokeWidth={2.5}
                        />
                      ))}

                      {/* Hexagon outer border */}
                      <path d={toSvgPath(shell.bgPts)} fill="none" stroke="#d1d5db" strokeWidth={2} />

                      {/* Unified Content Overlay: Name & Answer fade in together from top down */}
                      <g className="v3-row-content" style={{ animationDelay: `${rowDelay}s` }}>
                        {(() => {
                          const maxNameW = cols.cells[0].width * 0.86;
                          const approxNameW = (seat.name || "").length * (nameFontSize * 0.62);
                          const isLongName = approxNameW > maxNameW;
                          return (
                            <text
                              x={cols.cells[0].cx}
                              y={cols.cells[0].cy + textBaselineOffset}
                              textAnchor="middle"
                              fill="#ffffff"
                              fontWeight="900"
                              fontSize={nameFontSize}
                              letterSpacing={isLongName ? "0.01em" : "0.05em"}
                              textLength={isLongName ? maxNameW : undefined}
                              lengthAdjust={isLongName ? "spacingAndGlyphs" : undefined}
                              className="uppercase font-sans"
                              style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.85))" }}
                            >
                              {seat.name}
                            </text>
                          );
                        })()}

                        {!isWaitingAnswer && (() => {
                          const maxAnsW = cols.cells[1].width * 0.88;
                          const approxAnsW = (answerText || "").length * (ansFontSize * 0.62);
                          const isLongAns = approxAnsW > maxAnsW;
                          return (
                            <text
                              x={cols.cells[1].cx}
                              y={cols.cells[1].cy + textBaselineOffset}
                              textAnchor="middle"
                              fill={isHighlighted ? "#a7f3d0" : "#ffffff"}
                              fontWeight="900"
                              fontSize={ansFontSize}
                              letterSpacing={isLongAns ? "0.01em" : "0.08em"}
                              textLength={isLongAns ? maxAnsW : undefined}
                              lengthAdjust={isLongAns ? "spacingAndGlyphs" : undefined}
                              className="uppercase font-sans"
                              style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.9))" }}
                            >
                              {answerText || ""}
                            </text>
                          );
                        })()}
                      </g>
                    </svg>
                  </div>

                  {/* Tier 3 (Top / z-30): Navy chevrons + crisp white accent lines cutting the hex wedge */}
                  <svg
                    width={shell.canvasW}
                    height={H}
                    viewBox={`0 0 ${shell.canvasW} ${H}`}
                    className="absolute inset-0 overflow-visible pointer-events-none"
                    style={{ zIndex: 30 }}
                  >
                    <g className="v3-row-wing-l-l3" style={{ animationDelay: `${rowDelay.toFixed(3)}s` }}>
                      <path d={toSvgPath(shell.alnPts)} fill="#0d2c54" stroke="#d1d5db" strokeWidth={1.5} />
                      <path d={toSvgPath(shell.alnPts)} fill="none" stroke="#ffffff" strokeWidth={1.2} opacity={0.9} />
                    </g>
                    <g className="v3-row-wing-r-l3" style={{ animationDelay: `${rowDelay.toFixed(3)}s` }}>
                      <path d={toSvgPath(shell.arnPts)} fill="#0d2c54" stroke="#d1d5db" strokeWidth={1.5} />
                      <path d={toSvgPath(shell.arnPts)} fill="none" stroke="#ffffff" strokeWidth={1.2} opacity={0.9} />
                    </g>
                  </svg>
                </V3ScaledStage>
              </div>
            );
          })}

        </div>
        <VcnvCnvBellSignalOverlay state={state} />
      </div>
    );
  }

  // Classic Chalkboard fallback
  return (
    <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 z-20 pointer-events-auto overflow-hidden">
      <Vtv3ChalkboardBackdrop />
      <ClassicWoodenBackingBeam />
      <div
        className="relative z-10 w-[88%] max-w-[1600px] flex flex-col items-center gap-3 sm:gap-4 py-4"
        style={{ perspective: "1200px" }}
      >
        {seats.map((seat, idx) => {
          const answerText = v.answers[seat.id]?.text || "";
          const isCorrect = state.vcnv?.revealedCorrectAnswer && rawRowAns
            ? (() => {
                const primaryClean = cleanVcnvWord(rawRowAns).toLowerCase();
                const userClean = cleanVcnvWord(answerText).toLowerCase();
                const parsed = parseVcnvAnswer(rawRowAns);
                if (userClean && userClean === primaryClean) return true;
                return parsed.acceptedAnswers.some(
                  (cand) => cleanVcnvWord(cand).toLowerCase() === userClean
                );
              })()
            : false;
          const isDimmed = Boolean(state.vcnv?.revealedCorrectAnswer && !isCorrect);
          const isHighlighted = Boolean(state.vcnv?.revealedCorrectAnswer && isCorrect);

          return (
            <motion.div
              key={seat.id}
              initial={{ rotateX: -65, opacity: 0, y: -25 }}
              animate={{
                rotateX: 0,
                opacity: isDimmed ? 0.35 : 1,
                y: 0,
              }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 22,
                delay: 0.08 + idx * 0.12,
              }}
              style={{
                transformOrigin: "top center",
                transformStyle: "preserve-3d",
                filter: isDimmed ? "brightness(0.5) contrast(0.85)" : "none",
                border: isHighlighted
                  ? "2.5px solid #10b981"
                  : "2px solid rgba(251, 191, 36, 0.8)",
                boxShadow: isHighlighted
                  ? "0 0 28px rgba(16, 185, 129, 0.55), 0 12px 35px rgba(0,0,0,0.9)"
                  : "0 12px 35px rgba(0,0,0,0.9)",
                background: isHighlighted
                  ? "linear-gradient(180deg, #064e3b 0%, #022c22 100%)"
                  : "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
              }}
              className="relative w-full h-16 sm:h-20 md:h-[82px] flex items-center shadow-2xl rounded-2xl overflow-hidden select-none"
            >
              {/* Sheen sweep effect on open */}
              <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                <div
                  className="sheen-sweep-beam"
                  style={{ animationDelay: `${0.25 + idx * 0.12}s` }}
                />
              </div>

              {/* Name column */}
              <div
                className={`h-full w-56 sm:w-72 md:w-80 px-4 sm:px-6 py-1 flex items-center justify-center font-black text-base sm:text-xl md:text-2xl uppercase tracking-wider shrink-0 leading-normal overflow-hidden ${
                  isHighlighted ? "bg-emerald-400 text-slate-950" : "bg-amber-400 text-slate-950"
                }`}
              >
                <BoundedText text={seat.name} />
              </div>

              {/* Answer column */}
              <div
                className={`flex-1 px-4 sm:px-8 py-1.5 text-center font-black text-xl sm:text-3xl md:text-4xl uppercase tracking-widest leading-normal overflow-hidden ${
                  isHighlighted ? "text-emerald-300 drop-shadow-[0_0_16px_rgba(52,211,153,0.8)]" : "text-white"
                }`}
              >
                {isWaitingAnswer ? "" : <BoundedText text={answerText || ""} />}
              </div>
            </motion.div>
          );
        })}
      </div>
      <VcnvCnvBellSignalOverlay state={state} />
    </div>
  );
}

export function TangTocQuestionGraphic({
  state,
  serverNow,
  isSilent = false,
}: {
  state: OlympiaState;
  serverNow: () => number;
  isSilent?: boolean;
}) {
  const tt = state.tangToc!;
  const q = tt.questions[tt.qIdx];
  const isV3Arrow = state.themeMode !== "o26_classic";

  const isVideo =
    q?.type === "video" ||
    (Boolean(q?.media) && /\.(mp4|webm|mov|m4v|ogv|mpeg)$/i.test(q?.media || ""));
  const isTiming = tt.timer?.startedAt != null;

  if (isV3Arrow) {
    const qText = q?.q || "Sắp xếp các miếng ghép sau để có được bức hình hoàn chỉnh.";
    return (
      <div
        className="absolute inset-0 flex items-center justify-center px-6 py-4 sm:px-10 sm:py-6 md:px-12 md:py-7 z-20 pointer-events-auto bg-[#040d21] overflow-hidden font-v3-avo"
        style={{ fontFamily: "'UTM Avo', 'Montserrat', 'Be Vietnam Pro', system-ui, -apple-system, sans-serif" }}
      >
        <Olympia22BackgroundBackdrop />

        <div
          className="relative z-10 w-full h-full flex items-center justify-center"
          style={{ containerType: "size" }}
        >
          {/* Unified width column so Question Box and 16:9 Media Box always share exact width */}
          <div
            className="flex flex-col items-stretch justify-center gap-2 max-h-full"
            style={{
              width: "min(96cqw, calc((96cqh - 84px) * 16 / 9))",
            }}
          >
            {/* Full-width rounded rectangle Question Box matching exact width of 16:9 box below */}
            <div
              className="relative z-10 w-full shrink-0 px-5 sm:px-7 py-2 sm:py-2.5 rounded-2xl border-2 border-cyan-400/75 text-center"
              style={{
                background: "linear-gradient(180deg, #0b2b59 0%, #061838 65%, #041026 100%)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.8), inset 0 1px 2px rgba(103,232,249,0.35)",
              }}
            >
              <div
                className={`font-black text-white leading-snug drop-shadow ${
                  qText.length > 130
                    ? "text-xs sm:text-[13px] md:text-sm"
                    : "text-xs sm:text-sm md:text-base"
                }`}
              >
                {qText}
              </div>
            </div>

            {/* Strict 16:9 Media + Flush Bottom Timer Container matching Question Box width */}
            <div
              className="relative w-full aspect-video rounded-2xl overflow-hidden border-2 border-cyan-400/80 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_28px_rgba(34,211,238,0.28)]"
              style={{
                background: "linear-gradient(160deg, #071a3d 0%, #041026 65%, #020914 100%)",
              }}
            >
              {/* Full-height media slot above the 20px flush bottom timer bar */}
              <div className="w-full h-full pb-[20px] flex items-center justify-center overflow-hidden">
                {tt.showAnswerImage && q?.answerImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={q.answerImage}
                    alt="Đáp án câu hỏi"
                    className="w-full h-full object-contain"
                  />
                ) : q?.clueImages && q.clueImages.length > 0 ? (
                  <div className="grid grid-cols-3 grid-rows-2 gap-2 w-full h-full p-2">
                    {q.clueImages.map((clue, idx) => {
                      const label = ["A", "B", "C", "D", "E", "F"][idx] || `${idx + 1}`;
                      return (
                        <div
                          key={idx}
                          className="relative w-full h-full rounded-lg overflow-hidden border border-cyan-400/30 bg-slate-950 shadow-md flex items-center justify-center"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={clue.url} alt="" className="w-full h-full object-contain" />
                          <div className="absolute top-1 left-1 px-2 py-0.5 rounded bg-black/85 text-white font-black text-xs">
                            {label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : isVideo && q?.media ? (
                  <OlympiaBroadcastVideo
                    src={q.media}
                    isTiming={isTiming}
                    className="w-full h-full object-contain"
                  />
                ) : q?.media ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={q.media}
                    alt=""
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-xl sm:text-2xl font-black text-white text-center px-8 py-6 max-w-3xl">
                    {q?.q}
                  </div>
                )}
              </div>

              {/* Flush bottom Econova silver timer bar clipped seamlessly inside rounded-2xl */}
              <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
                <EconovaSpecializedTimerBar
                  timer={tt.timer}
                  serverNow={serverNow}
                  defaultTotalMs={30000}
                  height={20}
                  clipPath="none"
                  trackMargin="0 22px"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const classicQText = q?.q || "Sắp xếp các miếng ghép sau để có được bức hình hoàn chỉnh.";
  const classicQFontSizeClass =
    classicQText.length > 170
      ? "text-sm sm:text-base md:text-lg"
      : classicQText.length > 105
      ? "text-base sm:text-lg md:text-xl"
      : "text-lg sm:text-xl md:text-[22px]";

  return (
    <div
      className="absolute inset-0 flex items-center justify-center p-4 sm:p-8 z-20 pointer-events-auto font-classic-arial"
      style={{ fontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif" }}
    >
      {/* Classic Chalkboard backdrop */}
      <Vtv3ChalkboardBackdrop />

      {/* Main framed container */}
      <div className="relative w-full max-w-5xl lg:max-w-6xl z-10 flex flex-col items-center">
        {/* ── 1. Horizontal Brass Rod (Classic only) ── */}
        <HorizontalBrassRod />

        {/* ── 2. Top Header Plaque (Attached directly above frame, responsive sizing) ── */}
        <div
          className="relative z-10 px-6 sm:px-8 py-2.5 sm:py-3 rounded-t-2xl border-2 border-amber-500/80 shadow-lg w-full max-w-4xl text-center"
          style={{
            background: "linear-gradient(180deg, #2a1815 0%, #170d0b 60%, #0a0504 100%)",
            boxShadow: "0 6px 18px rgba(0,0,0,0.85), inset 0 1px 2px rgba(255,255,255,0.25)",
          }}
        >
          <div className={`font-bold text-white leading-snug drop-shadow font-classic-arial ${classicQFontSizeClass}`}>
            {classicQText}
          </div>
        </div>

        {/* ── 3. Ornate Gold Picture Frame (Classic) ── */}
        <div
          className="relative z-10 w-full rounded-b-2xl p-4 sm:p-6 flex flex-col items-center justify-center shadow-2xl"
          style={{
            background: "#080e1a",
            border: "10px solid #d4af37",
            outline: "3px solid #78350f",
            outlineOffset: "-12px",
            boxShadow:
              "0 20px 50px rgba(0,0,0,0.95), 0 0 30px rgba(212,175,55,0.4), inset 0 2px 4px rgba(255,255,255,0.4), inset 0 -3px 6px rgba(0,0,0,0.9)",
            minHeight: "420px",
          }}
        >
          {/* Inside Picture Frame Content */}
          {tt.showAnswerImage && q?.answerImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={q.answerImage}
              alt="Đáp án câu hỏi"
              className="max-h-[50vh] w-auto mx-auto rounded-lg shadow-xl object-contain"
            />
          ) : q?.clueImages && q.clueImages.length > 0 ? (
            <div className="grid grid-cols-3 grid-rows-2 gap-3 w-full max-w-2xl mx-auto">
              {q.clueImages.map((clue, idx) => {
                const label = ["A", "B", "C", "D", "E", "F"][idx] || `${idx + 1}`;
                return (
                  <div
                    key={idx}
                    className="relative rounded-lg overflow-hidden border border-slate-700 bg-white shadow-md aspect-square flex flex-col items-center justify-center"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={clue.url} alt="" className="w-full h-full object-cover" />
                    {/* Letter badge tab */}
                    <div className="absolute top-1 left-1 px-2 py-0.5 rounded bg-black/85 text-white font-black text-xs">
                      {label}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : isVideo && q?.media ? (
            <OlympiaBroadcastVideo
              src={q.media}
              isTiming={isTiming}
              className="max-h-[50vh] w-auto mx-auto rounded-lg shadow-xl object-contain"
            />
          ) : q?.media ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={q.media}
              alt=""
              className="max-h-[50vh] w-auto mx-auto rounded-lg shadow-xl object-contain"
            />
          ) : (
            <div className="text-xl sm:text-2xl font-black text-white text-center py-10 max-w-2xl">
              {q?.q}
            </div>
          )}
        </div>

        {/* Bottom Edge Timer Bar (Flush against bottom border, no numeric clock) */}
        <div className="w-full -mt-1 z-20">
          <Vtv3BottomEdgeTimerBar timer={tt.timer} serverNow={serverNow} />
        </div>
      </div>
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * COMPONENT 5: TĂNG TỐC RANKED ANSWERS REVEAL (Supports Both V3 Arrow & O26 Classic)
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERABLE 3: TĂNG TỐC RANKED ANSWERS GRAPHIC (ATTACHMENT 3)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * DELIVERABLE 3: TĂNG TỐC RANKED ANSWERS GRAPHIC
 * 4 Chevron bars generated with buildArrowShell & buildRowColumns.
 * Pure contestant names (NO seat number prefix).
 * Time: numeric string only xx.xx, STRICTLY NO 's' suffix.
 * Uniform typography, zero header pill text.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function TangTocRankedAnswersGraphic({ state }: { state: OlympiaState }) {
  const tt = state.tangToc;
  if (!tt) return null;
  const isV3Arrow = state.themeMode !== "o26_classic";
  const officialAnswer =
    tt.correctAnswer || tt.questions[tt.qIdx]?.answer || (tt.questions[tt.qIdx] as any)?.a || "";
  const showOfficialAnswer = Boolean(
    (tt.revealedCorrectAnswer || tt.phase === "graded") && officialAnswer
  );

  if (isV3Arrow) {
    const rankCount = Math.max(1, (tt.ranking || []).length || activeSeats(state).length);
    const W = 1420;
    const H = rankCount <= 4 ? 110 : rankCount === 5 ? 96 : rankCount === 6 ? 84 : 74;
    const thick = rankCount <= 5 ? 28 : 22;
    const cThick = rankCount <= 5 ? 22 : 18;
    const pad = Math.round(cThick * 1.5);
    const shell = buildArrowShell({ W, H, slantRatio: 0.34, thick, cThick, pad });
    const cols = buildRowColumns(shell, [36, 46, 18]);
    const dc = shell.W / 2;
    const nameFontSize = rankCount <= 4 ? 34 : rankCount === 5 ? 32 : rankCount === 6 ? 28 : 25;
    const ansFontSize = rankCount <= 4 ? 38 : rankCount === 5 ? 36 : rankCount === 6 ? 31 : 27;
    const timeFontSize = rankCount <= 4 ? 42 : rankCount === 5 ? 38 : rankCount === 6 ? 33 : 29;
    const textBaselineOffset = Math.round(ansFontSize * 0.34);
    const timeBaselineOffset = Math.round(timeFontSize * 0.35);
    const rowGapClass = rankCount <= 4 ? "gap-5" : rankCount === 5 ? "gap-4" : "gap-2.5";
    const ttClipCss = buildHexClipKeyframes(shell, {
      name: "v3-tt-hex",
      closeEndPercent: 14.9,
      openStartPercent: 15,
      openEndPercent: 100,
      timingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
    });
    const skipAnimation = Boolean(tt.revealCount && tt.revealCount > 1);

    return (
      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 z-20 pointer-events-auto bg-[#040d21] overflow-hidden select-none">
        <Olympia22BackgroundBackdrop />
        <style>{`
          @keyframes v3-tt-wing-l-g1 {
            0%   { transform: translateX(calc(var(--dc))) scale(0.6); opacity: 0; }
            15%  { transform: translateX(calc(var(--dc))) scale(1); opacity: 0.35; }
            85%  { transform: translateX(-14px) scale(1); opacity: 0.35; }
            100% { transform: translateX(0) scale(1); opacity: 0.35; }
          }
          @keyframes v3-tt-wing-l-g2 {
            0%   { transform: translateX(calc(var(--dc))) scale(0.7); opacity: 0; }
            15%  { transform: translateX(calc(var(--dc))) scale(1); opacity: 0.65; }
            85%  { transform: translateX(-7px) scale(1); opacity: 0.65; }
            100% { transform: translateX(0) scale(1); opacity: 0.65; }
          }
          @keyframes v3-tt-wing-l-l3 {
            0%   { transform: translateX(calc(var(--dc))); opacity: 0; }
            15%  { transform: translateX(calc(var(--dc))); opacity: 1; }
            100% { transform: translateX(0); opacity: 1; }
          }
          @keyframes v3-tt-wing-r-g1 {
            0%   { transform: translateX(calc(var(--dc) * -1)) scale(0.6); opacity: 0; }
            15%  { transform: translateX(calc(var(--dc) * -1)) scale(1); opacity: 0.35; }
            85%  { transform: translateX(14px) scale(1); opacity: 0.35; }
            100% { transform: translateX(0) scale(1); opacity: 0.35; }
          }
          @keyframes v3-tt-wing-r-g2 {
            0%   { transform: translateX(calc(var(--dc) * -1)) scale(0.7); opacity: 0; }
            15%  { transform: translateX(calc(var(--dc) * -1)) scale(1); opacity: 0.65; }
            85%  { transform: translateX(7px) scale(1); opacity: 0.65; }
            100% { transform: translateX(0) scale(1); opacity: 0.65; }
          }
          @keyframes v3-tt-wing-r-l3 {
            0%   { transform: translateX(calc(var(--dc) * -1)); opacity: 0; }
            15%  { transform: translateX(calc(var(--dc) * -1)); opacity: 1; }
            100% { transform: translateX(0); opacity: 1; }
          }
          ${ttClipCss}
          @keyframes v3-tt-text {
            0% { opacity: 0; transform: translateY(4px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes v3-tt-answer {
            0% { opacity: 0; transform: translateY(6px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          ${skipAnimation ? `
            .v3-tt-wing-l-g1, .v3-tt-wing-l-g2, .v3-tt-wing-l-l3,
            .v3-tt-wing-r-g1, .v3-tt-wing-r-g2, .v3-tt-wing-r-l3,
            .v3-tt-hex, .v3-tt-content, .v3-tt-text, .v3-tt-answer {
              animation: none !important;
              opacity: 1 !important;
              transform: none !important;
            }
          ` : `
          .v3-tt-wing-l-g1 {
            animation: v3-tt-wing-l-g1 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
          }
          .v3-tt-wing-l-g2 {
            animation: v3-tt-wing-l-g2 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
          }
          .v3-tt-wing-l-l3 {
            animation: v3-tt-wing-l-l3 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
          }
          .v3-tt-wing-r-g1 {
            animation: v3-tt-wing-r-g1 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
          }
          .v3-tt-wing-r-g2 {
            animation: v3-tt-wing-r-g2 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
          }
          .v3-tt-wing-r-l3 {
            animation: v3-tt-wing-r-l3 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
          }
          .v3-tt-hex {
            animation: v3-tt-hex 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
          }
          @keyframes v3-tt-content {
            0% { opacity: 0; transform: translateY(-8px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .v3-tt-content {
            animation: v3-tt-content 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) both;
          }
          `}
        `}</style>
        {/* Only pure graphic bars - Expanded to ~86-88% broadcast viewport width */}
        <div className={`relative z-10 w-[88%] max-w-[1640px] flex flex-col ${rowGapClass} items-center justify-center py-2`}>
          {(tt.ranking || []).map((item, idx) => {
            const seat = state.seats[item.seat];
            const sec = item.noAnswer ? "0.00" : (item.ms / 1000).toFixed(2);
            const answerText = item.noAnswer ? "" : (item.answer || "");
            const rowDelay = idx * 0.14;

            const isGradedOrRevealed = Boolean(tt.revealedCorrectAnswer || tt.phase === "graded");
            const isCorrect = isGradedOrRevealed
              ? (() => {
                  if (item.points != null && item.points > 0) return true;
                  if (item.wrong) return false;
                  if (tt.correctAnswer) {
                    const normAns = (item.answer || "").trim().toLowerCase().replace(/[\s-]/g, "");
                    const targetCandidates = tt.correctAnswer
                      .split(/[/|()]/)
                      .map((s) => s.trim().toLowerCase().replace(/[\s-]/g, ""))
                      .filter(Boolean);
                    if (targetCandidates.includes(normAns)) return true;
                  }
                  return false;
                })()
              : true;
            const isDimmed = Boolean(isGradedOrRevealed && !isCorrect);
            const isHighlighted = Boolean(isGradedOrRevealed && isCorrect && !item.wrong);

            return (
              <div
                key={item.seat}
                className="w-full flex items-center justify-center transition-all duration-500 ease-in-out"
                style={{
                  ["--dc" as string]: `${dc}px`,
                  opacity: isDimmed ? 0.35 : 1,
                  filter: isDimmed ? "brightness(0.5) contrast(0.85)" : "none",
                }}
              >
                <V3ScaledStage designW={shell.canvasW} designH={H}>
                  {/* Tier 1 (Bottom / z-0): Cyan sliding wings */}
                  <svg
                    width={shell.canvasW}
                    height={H}
                    viewBox={`0 0 ${shell.canvasW} ${H}`}
                    className="absolute inset-0 overflow-visible"
                    style={{ zIndex: 0 }}
                  >
                    <defs>
                      <linearGradient id={`ttWing-${idx}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#1fd1ff" />
                        <stop offset="100%" stopColor="#2ee6ff" />
                      </linearGradient>
                    </defs>

                    {/* Left 3-layer cyan wings */}
                    <g className="v3-tt-wing-l-g1" style={{ animationDelay: `${rowDelay}s` }}>
                      <path d={toSvgPath(shell.alcPts)} fill={`url(#ttWing-${idx})`} opacity={0.35} />
                    </g>
                    <g className="v3-tt-wing-l-g2" style={{ animationDelay: `${rowDelay}s` }}>
                      <path d={toSvgPath(shell.alcPts)} fill={`url(#ttWing-${idx})`} opacity={0.65} />
                    </g>
                    <g className="v3-tt-wing-l-l3" style={{ animationDelay: `${rowDelay}s` }}>
                      <path d={toSvgPath(shell.alcPts)} fill={`url(#ttWing-${idx})`} opacity={1.0} />
                    </g>

                    {/* Right 3-layer cyan wings */}
                    <g className="v3-tt-wing-r-l3" style={{ animationDelay: `${rowDelay}s` }}>
                      <path d={toSvgPath(shell.arcPts)} fill={`url(#ttWing-${idx})`} opacity={1.0} />
                    </g>
                    <g className="v3-tt-wing-r-g2" style={{ animationDelay: `${rowDelay}s` }}>
                      <path d={toSvgPath(shell.arcPts)} fill={`url(#ttWing-${idx})`} opacity={0.65} />
                    </g>
                    <g className="v3-tt-wing-r-g1" style={{ animationDelay: `${rowDelay}s` }}>
                      <path d={toSvgPath(shell.arcPts)} fill={`url(#ttWing-${idx})`} opacity={0.35} />
                    </g>
                  </svg>

                  {/* Tier 2 (Middle / z-10): Unified wrapper containing BOTH hexagon SVG body AND content, clipped by 6-vertex polygon */}
                  <div
                    className="v3-tt-hex absolute inset-0"
                    style={{
                      zIndex: 10,
                      animationDelay: `${rowDelay}s`,
                      clipPath: `polygon(${toPoly(shell.bgPts)})`,
                    }}
                  >
                    <svg
                      width={shell.canvasW}
                      height={H}
                      viewBox={`0 0 ${shell.canvasW} ${H}`}
                      className="absolute inset-0 overflow-visible"
                    >
                      <defs>
                        <linearGradient id={`ttName-${idx}`} x1="0" y1="0" x2="1" y2="0">
                          {isHighlighted ? (
                            <>
                              <stop offset="0%" stopColor="#047857" />
                              <stop offset="100%" stopColor="#10b981" />
                            </>
                          ) : (
                            <>
                              <stop offset="0%" stopColor="#051433" />
                              <stop offset="100%" stopColor="#0d2c54" />
                            </>
                          )}
                        </linearGradient>
                        <linearGradient id={`ttAns-${idx}`} x1="0" y1="0" x2="1" y2="0">
                          {isHighlighted ? (
                            <>
                              <stop offset="0%" stopColor="#065f46" />
                              <stop offset="100%" stopColor="#059669" />
                            </>
                          ) : (
                            <>
                              <stop offset="0%" stopColor="#09408f" />
                              <stop offset="100%" stopColor="#0072ff" />
                            </>
                          )}
                        </linearGradient>
                        <linearGradient id={`ttTime-${idx}`} x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#08203f" />
                          <stop offset="100%" stopColor="#051433" />
                        </linearGradient>
                      </defs>

                      {/* Cell 0 (38%): Contestant Pure Name - No Seat Number Prefix */}
                      <path d={toSvgPath(cols.cells[0].pts)} fill={`url(#ttName-${idx})`} />

                      {/* Cell 1 (42%): Contestant Answer - Uniform Font Size */}
                      <path d={toSvgPath(cols.cells[1].pts)} fill={`url(#ttAns-${idx})`} />

                      {/* Cell 2 (20%): Enter Time - Number Only, STRICTLY NO 's' SUFFIX */}
                      <path d={toSvgPath(cols.cells[2].pts)} fill={`url(#ttTime-${idx})`} />

                      {/* Slanted seam dividers */}
                      {cols.seams.map((s, sIdx) => (
                        <line
                          key={sIdx}
                          x1={s.x0}
                          y1={s.y0}
                          x2={s.x1}
                          y2={s.y1}
                          stroke="#ffffff"
                          strokeWidth={2.5}
                        />
                      ))}

                      {/* Hexagon outer border */}
                      <path d={toSvgPath(shell.bgPts)} fill="none" stroke="#d1d5db" strokeWidth={2} />

                      {/* Unified Content Overlay: Name, Answer & Time all fade in together from top down */}
                      <g className="v3-tt-content" style={{ animationDelay: `${rowDelay}s` }}>
                        {(() => {
                          const candName = seat?.name || `Thí sinh ${item.seat + 1}`;
                          const maxNameW = cols.cells[0].width * 0.86;
                          const approxNameW = candName.length * (nameFontSize * 0.62);
                          const isLongName = approxNameW > maxNameW;
                          return (
                            <text
                              x={cols.cells[0].cx}
                              y={cols.cells[0].cy + textBaselineOffset}
                              textAnchor="middle"
                              fill="#ffffff"
                              fontWeight="900"
                              fontSize={nameFontSize}
                              letterSpacing={isLongName ? "0.01em" : "0.05em"}
                              textLength={isLongName ? maxNameW : undefined}
                              lengthAdjust={isLongName ? "spacingAndGlyphs" : undefined}
                              className="uppercase font-sans"
                              style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.85))" }}
                            >
                              {candName}
                            </text>
                          );
                        })()}

                        {(() => {
                          const maxAnsW = cols.cells[1].width * 0.88;
                          const approxAnsW = (answerText || "").length * (ansFontSize * 0.62);
                          const isLongAns = approxAnsW > maxAnsW;
                          return (
                            <text
                              x={cols.cells[1].cx}
                              y={cols.cells[1].cy + textBaselineOffset}
                              textAnchor="middle"
                              fill={isHighlighted ? "#a7f3d0" : "#ffffff"}
                              fontWeight="900"
                              fontSize={ansFontSize}
                              letterSpacing={isLongAns ? "0.01em" : "0.08em"}
                              textLength={isLongAns ? maxAnsW : undefined}
                              lengthAdjust={isLongAns ? "spacingAndGlyphs" : undefined}
                              className="uppercase font-sans"
                              style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.9))" }}
                            >
                              {answerText || ""}
                            </text>
                          );
                        })()}

                        <text
                          x={cols.cells[2].cx}
                          y={cols.cells[2].cy + timeBaselineOffset}
                          textAnchor="middle"
                          fill={isHighlighted ? "#a7f3d0" : "#67e8f9"}
                          fontWeight="900"
                          fontSize={timeFontSize}
                          fontFamily="'Arial', 'Helvetica Neue', sans-serif"
                          letterSpacing="0.03em"
                          style={{ filter: "drop-shadow(0 2px 6px rgba(0,207,255,0.7))" }}
                        >
                          {sec}
                        </text>
                      </g>
                    </svg>
                  </div>

                  {/* Tier 3 (Top / z-30): Navy chevrons + crisp white accent lines cutting the hex wedge */}
                  <svg
                    width={shell.canvasW}
                    height={H}
                    viewBox={`0 0 ${shell.canvasW} ${H}`}
                    className="absolute inset-0 overflow-visible pointer-events-none"
                    style={{ zIndex: 30 }}
                  >
                    <g className="v3-tt-wing-l-l3" style={{ animationDelay: `${rowDelay.toFixed(3)}s` }}>
                      <path d={toSvgPath(shell.alnPts)} fill="#0d2c54" stroke="#d1d5db" strokeWidth={1.5} />
                      <path d={toSvgPath(shell.alnPts)} fill="none" stroke="#ffffff" strokeWidth={1.2} opacity={0.9} />
                    </g>
                    <g className="v3-tt-wing-r-l3" style={{ animationDelay: `${rowDelay.toFixed(3)}s` }}>
                      <path d={toSvgPath(shell.arnPts)} fill="#0d2c54" stroke="#d1d5db" strokeWidth={1.5} />
                      <path d={toSvgPath(shell.arnPts)} fill="none" stroke="#ffffff" strokeWidth={1.2} opacity={0.9} />
                    </g>
                  </svg>
                </V3ScaledStage>
              </div>
            );
          })}

        </div>
      </div>
    );
  }

  // Classic Chalkboard fallback
  return (
    <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 z-20 pointer-events-auto overflow-hidden">
      <Vtv3ChalkboardBackdrop />
      <ClassicWoodenBackingBeam />
      <div
        className="relative z-10 w-[88%] max-w-[1600px] flex flex-col items-center gap-3 sm:gap-4 py-6"
        style={{ perspective: "1200px" }}
      >
        {(tt.ranking || []).map((item, idx) => {
          const seat = state.seats[item.seat];
          const sec = item.noAnswer ? "0.00" : (item.ms / 1000).toFixed(2);
          const answerText = item.noAnswer ? "" : item.answer;
          const awardedPts = tt.phase === "graded" && item.points ? item.points : 0;
          const isRevealed = Boolean(tt.revealedCorrectAnswer || tt.phase === "graded");
          const isCorrect = isRevealed
            ? (() => {
                if (item.points != null && item.points > 0) return true;
                if (item.wrong) return false;
                if (tt.correctAnswer) {
                  const normAns = (item.answer || "").trim().toLowerCase().replace(/[\s-]/g, "");
                  const targetCandidates = tt.correctAnswer
                    .split(/[/|()]/)
                    .map((s) => s.trim().toLowerCase().replace(/[\s-]/g, ""))
                    .filter(Boolean);
                  if (targetCandidates.includes(normAns)) return true;
                }
                return false;
              })()
            : false;
          const isHighlighted = isRevealed && !item.wrong && ((item.points ?? 0) > 0 || isCorrect);
          const isDimmed = isRevealed && !isHighlighted;

          return (
            <motion.div
              key={item.seat}
              initial={{ rotateX: -65, opacity: 0, y: -25 }}
              animate={{
                rotateX: 0,
                opacity: isDimmed ? 0.35 : 1,
                y: 0,
              }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 22,
                delay: 0.08 + idx * 0.12,
              }}
              style={{
                transformOrigin: "top center",
                transformStyle: "preserve-3d",
                filter: isDimmed ? "brightness(0.5) contrast(0.85)" : "none",
              }}
              className="relative flex items-center w-full h-16 sm:h-20 md:h-[82px] my-1 px-1 select-none"
            >
              <div className="absolute left-4 z-30">
                <RedConnectionRivet />
              </div>
              <div
                className="w-full rounded-full h-full pl-10 pr-5 flex items-center justify-between shadow-2xl relative overflow-hidden transition-all duration-500 ease-in-out"
                style={{
                  background: isHighlighted
                    ? "linear-gradient(180deg, #064e3b 0%, #022c22 100%)"
                    : item.wrong
                    ? "linear-gradient(180deg, #3b1116 0%, #1f080b 60%, #0d0305 100%)"
                    : "linear-gradient(180deg, #1e293b 0%, #0f172a 60%, #060a12 100%)",
                  border: isHighlighted
                    ? "2.5px solid #10b981"
                    : item.wrong
                    ? "2.5px solid #ef4444"
                    : "2.5px solid rgba(203, 213, 225, 0.85)",
                  boxShadow: isHighlighted
                    ? "0 0 28px rgba(16, 185, 129, 0.55), 0 12px 35px rgba(0,0,0,0.9)"
                    : "0 12px 35px rgba(0,0,0,0.9)",
                }}
              >
                {/* Sheen sweep effect on open */}
                <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
                  <div
                    className="sheen-sweep-beam"
                    style={{ animationDelay: `${0.25 + idx * 0.12}s` }}
                  />
                </div>

                <div className="flex items-center gap-2 z-10 w-56 sm:w-72 shrink-0 overflow-hidden py-1">
                  <BoundedText
                    text={seat?.name || `Thí sinh ${item.seat + 1}`}
                    align="left"
                    className={`font-bold text-lg sm:text-2xl leading-normal ${
                      isHighlighted ? "text-emerald-300" : "text-slate-100"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0 text-center z-10 px-4 py-1.5 overflow-hidden">
                  <BoundedText
                    text={answerText || ""}
                    align="center"
                    className={`font-black text-2xl sm:text-4xl tracking-widest uppercase leading-normal ${
                      isHighlighted
                        ? "text-emerald-300 drop-shadow-[0_0_16px_rgba(52,211,153,0.8)]"
                        : "text-white drop-shadow"
                    }`}
                  />
                </div>
                {awardedPts > 0 && (
                  <div className="shrink-0 z-10 pl-2">
                    <span className="px-4 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full font-black text-base uppercase">
                      +{awardedPts}
                    </span>
                  </div>
                )}
                <div className="shrink-0 z-10 pl-4 border-l border-white/20">
                  <span
                    className={`font-mono font-black text-xl sm:text-2xl ${
                      isHighlighted ? "text-emerald-300" : "text-cyan-300"
                    }`}
                  >
                    {sec}s
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AUTHENTIC ECONOVA V3 SINGLE ANSWER BAR
 * - 3-layer cyan wings + navy chevrons on left & right.
 * - Expanding hexagon center.
 * - Text fades in at ~80% of entrance animation.
 * - Strictly NO contestant score tab bar.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function V3SingleAnswerBar({
  answerText,
  points,
  roundLabel = "ĐÁP ÁN",
}: {
  answerText: string;
  points?: number;
  roundLabel?: string;
}) {
  const W = 920;
  const H = 68;
  const thick = 20;
  const cThick = 16;
  const pad = Math.round(cThick * 1.5);
  const shell = buildArrowShell({ W, H, slantRatio: 0.3571, thick, cThick, pad });
  const dc = shell.W / 2;
  const fullText = points ? `${answerText} (${points}đ)` : answerText;
  const fs = fullText.length > 45 ? "19" : fullText.length > 30 ? "22" : "25";

  const ansClipCss = buildHexClipKeyframes(shell, {
    name: "v3-ans-hex",
    closeEndPercent: 14.9,
    openStartPercent: 15,
    openEndPercent: 100,
    timingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
  });

  return (
    <div className="w-full flex items-center justify-center p-2 select-none">
      <style>{`
        @keyframes v3-ans-wing-l-g1 {
          0%   { transform: translateX(calc(var(--dc))); opacity: 0; }
          15%  { transform: translateX(calc(var(--dc))); opacity: 0.35; }
          85%  { transform: translateX(-14px); opacity: 0.35; }
          100% { transform: translateX(0); opacity: 0.35; }
        }
        @keyframes v3-ans-wing-l-g2 {
          0%   { transform: translateX(calc(var(--dc))); opacity: 0; }
          15%  { transform: translateX(calc(var(--dc))); opacity: 0.65; }
          85%  { transform: translateX(-7px); opacity: 0.65; }
          100% { transform: translateX(0); opacity: 0.65; }
        }
        @keyframes v3-ans-wing-l-l3 {
          0%   { transform: translateX(calc(var(--dc))); opacity: 0; }
          15%  { transform: translateX(calc(var(--dc))); opacity: 1; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes v3-ans-wing-r-g1 {
          0%   { transform: translateX(calc(var(--dc) * -1)); opacity: 0; }
          15%  { transform: translateX(calc(var(--dc) * -1)); opacity: 0.35; }
          85%  { transform: translateX(14px); opacity: 0.35; }
          100% { transform: translateX(0); opacity: 0.35; }
        }
        @keyframes v3-ans-wing-r-g2 {
          0%   { transform: translateX(calc(var(--dc) * -1)); opacity: 0; }
          15%  { transform: translateX(calc(var(--dc) * -1)); opacity: 0.65; }
          85%  { transform: translateX(7px); opacity: 0.65; }
          100% { transform: translateX(0); opacity: 0.65; }
        }
        @keyframes v3-ans-wing-r-l3 {
          0%   { transform: translateX(calc(var(--dc) * -1)); opacity: 0; }
          15%  { transform: translateX(calc(var(--dc) * -1)); opacity: 1; }
          100% { transform: translateX(0); opacity: 1; }
        }
        ${ansClipCss}
        @keyframes v3-ans-text {
          0% { opacity: 0; transform: translateY(4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .v3-ans-wing-l-g1 {
          animation: v3-ans-wing-l-g1 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .v3-ans-wing-l-g2 {
          animation: v3-ans-wing-l-g2 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .v3-ans-wing-l-l3 {
          animation: v3-ans-wing-l-l3 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .v3-ans-wing-r-g1 {
          animation: v3-ans-wing-r-g1 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .v3-ans-wing-r-g2 {
          animation: v3-ans-wing-r-g2 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .v3-ans-wing-r-l3 {
          animation: v3-ans-wing-r-l3 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .v3-ans-hex {
          animation: v3-ans-hex 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .v3-ans-text {
          animation: v3-ans-text 0.22s ease-out 0.44s both;
        }
      `}</style>
      <div className="w-full max-w-4xl flex items-center justify-center relative" style={{ ["--dc" as string]: `${dc}px` }}>
        <V3ScaledStage designW={shell.canvasW} designH={H}>
          {/* Tier 1 (Bottom / z-0): Cyan sliding wings */}
          <svg
            width={shell.canvasW}
            height={H}
            viewBox={`0 0 ${shell.canvasW} ${H}`}
            className="absolute inset-0 overflow-visible"
            style={{ zIndex: 0 }}
          >
            <defs>
              <linearGradient id="v3SingleAnsWing" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#1fd1ff" />
                <stop offset="100%" stopColor="#2ee6ff" />
              </linearGradient>
            </defs>

            {/* Left 3-layer cyan wings */}
            <g className="v3-ans-wing-l-g1">
              <path d={toSvgPath(shell.alcPts)} fill="url(#v3SingleAnsWing)" opacity={0.35} />
            </g>
            <g className="v3-ans-wing-l-g2">
              <path d={toSvgPath(shell.alcPts)} fill="url(#v3SingleAnsWing)" opacity={0.65} />
            </g>
            <g className="v3-ans-wing-l-l3">
              <path d={toSvgPath(shell.alcPts)} fill="url(#v3SingleAnsWing)" opacity={1.0} />
            </g>

            {/* Right 3-layer cyan wings */}
            <g className="v3-ans-wing-r-l3">
              <path d={toSvgPath(shell.arcPts)} fill="url(#v3SingleAnsWing)" opacity={1.0} />
            </g>
            <g className="v3-ans-wing-r-g2">
              <path d={toSvgPath(shell.arcPts)} fill="url(#v3SingleAnsWing)" opacity={0.65} />
            </g>
            <g className="v3-ans-wing-r-g1">
              <path d={toSvgPath(shell.arcPts)} fill="url(#v3SingleAnsWing)" opacity={0.35} />
            </g>
          </svg>

          {/* Tier 2 (Middle / z-10): Unified wrapper containing BOTH hexagon SVG body AND content, clipped by 6-vertex polygon */}
          <div
            className="v3-ans-hex absolute inset-0"
            style={{
              zIndex: 10,
              clipPath: `polygon(${toPoly(shell.bgPts)})`,
            }}
          >
            <svg
              width={shell.canvasW}
              height={H}
              viewBox={`0 0 ${shell.canvasW} ${H}`}
              className="absolute inset-0 overflow-visible"
            >
              <defs>
                <linearGradient id="v3SingleAnsBg" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#064e3b" />
                  <stop offset="50%" stopColor="#047857" />
                  <stop offset="100%" stopColor="#065f46" />
                </linearGradient>
              </defs>

              {/* Hexagon Body (Expands from center) */}
              <path d={toSvgPath(shell.bgPts)} fill="url(#v3SingleAnsBg)" stroke="#10b981" strokeWidth={2.5} />

              {/* Text Content */}
              <g className="v3-ans-text">
                <text
                  x={shell.startX + (shell.endX - shell.startX) * 0.5}
                  y={shell.H / 2 + 8}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontWeight="900"
                  fontSize={fs}
                  letterSpacing="0.05em"
                  className="uppercase font-sans"
                  style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.95))" }}
                >
                  {fullText}
                </text>
              </g>
            </svg>
          </div>

          {/* Tier 3 (Top / z-30): Navy chevrons + crisp white accent lines cutting the hex wedge */}
          <svg
            width={shell.canvasW}
            height={H}
            viewBox={`0 0 ${shell.canvasW} ${H}`}
            className="absolute inset-0 overflow-visible pointer-events-none"
            style={{ zIndex: 30 }}
          >
            <g className="v3-ans-wing-l-l3">
              <path d={toSvgPath(shell.alnPts)} fill="#0d2c54" stroke="#d1d5db" strokeWidth={1.5} />
              <path d={toSvgPath(shell.alnPts)} fill="none" stroke="#ffffff" strokeWidth={1.2} opacity={0.9} />
            </g>
            <g className="v3-ans-wing-r-l3">
              <path d={toSvgPath(shell.arnPts)} fill="#0d2c54" stroke="#d1d5db" strokeWidth={1.5} />
              <path d={toSvgPath(shell.arnPts)} fill="none" stroke="#ffffff" strokeWidth={1.2} opacity={0.9} />
            </g>
          </svg>
        </V3ScaledStage>
      </div>
    </div>
  );
}


/**
 * ─────────────────────────────────────────────────────────────────────────────
 * DELIVERABLE 5: TỔNG KẾT ĐIỂM (1000x268 Banner Graphic)
 * Unified Arrow Frame, top title banner, progressive reveal of seats.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export interface SummaryLowerThirdGraphicProps {
  state: OlympiaState;
  onNext?: () => void;
  onPrev?: () => void;
  onClose?: () => void;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AUTHENTIC VTV3 CLASSIC SUMMARY SCOREBOARD GRAPHIC
 * Replaces modern cyan chevron arrow summary graphic when in Classic theme.
 * Displays metallic stone plaque, double gold border, bronze rivets,
 * all candidate scores preview shelf, and prominent active candidate card.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function Vtv3ClassicSummaryGraphic({
  state,
  onNext,
  onPrev,
  onClose,
}: SummaryLowerThirdGraphicProps) {
  const sm = state.summaryState;
  if (!sm || !sm.active || sm.orderedSeats.length === 0) return null;

  const isPostMatch = Boolean(sm.isPostMatch);
  const isMcIntro = isPostMatch && (sm.focusTarget === "mc" || sm.currentIndex === -1);

  // 1. Sort ascending by score for inter-round, or preserve seat order 1->X for post-match
  const sorted = isPostMatch
    ? [...sm.orderedSeats]
    : [...sm.orderedSeats].sort((a, b) => {
        const sa = state.seats[a]?.score ?? 0;
        const sb = state.seats[b]?.score ?? 0;
        if (sa !== sb) return sa - sb;
        return a - b;
      });

  const [localIdx, setLocalIdx] = useState(sm.currentIndex >= 0 ? sm.currentIndex : 0);

  useEffect(() => {
    if (sm.currentIndex != null && sm.currentIndex >= 0) {
      setLocalIdx(sm.currentIndex);
    }
  }, [sm.currentIndex]);

  if (isMcIntro) {
    return (
      <div className="absolute inset-x-0 bottom-6 z-50 flex flex-col items-center justify-end px-4 pointer-events-none select-none animate-fade-in">
        <div
          className="rounded-2xl px-8 py-4 flex items-center gap-4 shadow-2xl backdrop-blur-md"
          style={{
            background: "linear-gradient(180deg, #1e222a 0%, #15181f 50%, #0d0f14 100%)",
            border: "3px solid #d4af37",
            boxShadow: "0 16px 50px rgba(0,0,0,0.95), 0 0 25px rgba(212,175,55,0.4)",
          }}
        >
          <span className="text-3xl">🏆</span>
          <div className="text-center">
            <div className="text-xs sm:text-sm font-bold text-amber-400 uppercase tracking-widest">
              ĐƯỜNG LÊN ĐỈNH OLYMPIA
            </div>
            <div className="text-xl sm:text-2xl md:text-3xl font-black text-white uppercase drop-shadow">
              TỔNG KẾT ĐIỂM CHUNG CUỘC
            </div>
          </div>
          <span className="text-3xl">🏆</span>
        </div>
      </div>
    );
  }

  const currentIdx = Math.min(localIdx, sorted.length - 1);
  const currentSeatId = sorted[currentIdx];
  const currentSeat = state.seats[currentSeatId];
  const currentScore = currentSeat?.score ?? 0;
  const currentName = currentSeat?.name || `THÍ SINH ${currentSeatId + 1}`;
  const rank = isPostMatch ? (sm.seatRanks?.[currentSeatId] ?? (currentIdx + 1)) : (sorted.length - currentIdx);
  const isLast = isPostMatch ? (rank === 1) : (currentIdx >= sorted.length - 1);

  const handleNext = useCallback(() => {
    if (onNext) {
      onNext();
    } else {
      setLocalIdx((prev) => Math.min(prev + 1, sorted.length - 1));
    }
  }, [onNext, sorted.length]);

  const handlePrev = useCallback(() => {
    if (onPrev) {
      onPrev();
    } else {
      setLocalIdx((prev) => Math.max(0, prev - 1));
    }
  }, [onPrev]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space" || e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "Escape" && onClose) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev, onClose]);

  const isFs = Boolean(sm.isFullscreen || state.overlayMode === "FULLSCREEN");

  return (
    <div
      className={
        isFs
          ? "absolute inset-0 z-50 flex flex-col items-center justify-center p-6 bg-[#070b14] overflow-hidden pointer-events-auto select-none cursor-pointer"
          : "absolute inset-x-0 bottom-0 z-50 flex flex-col items-center justify-end pb-4 sm:pb-5 bg-transparent pointer-events-auto select-none cursor-pointer"
      }
      onClick={handleNext}
    >
      {isFs && <Vtv3ChalkboardBackdrop className="opacity-95" />}
      <div className="relative w-full max-w-[94vw] 2xl:max-w-[1540px] mx-auto flex items-center justify-center">
        <HorizontalBrassRod />
        <div
          className="relative w-full z-10 rounded-2xl flex flex-col justify-between overflow-hidden shadow-2xl p-3 sm:p-4 md:p-5"
          style={{
            background: "linear-gradient(180deg, #1e222a 0%, #15181f 50%, #0d0f14 100%)",
            border: "3.5px solid #d4af37",
            boxShadow:
              "0 16px 50px rgba(0,0,0,0.95), 0 0 25px rgba(212,175,55,0.4), inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -3px 6px rgba(0,0,0,0.9)",
            outline: "2px solid #78350f",
            outlineOffset: "-6px",
          }}
        >
          {/* Chalkboard Texture */}
          <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
            <Vtv3ChalkboardBackdrop className="opacity-30" />
          </div>

          {/* Bronze Corner Rivets */}
          <div className="absolute top-2.5 left-2.5 z-20 w-3 h-3 rounded-full classic-rivet-bronze" />
          <div className="absolute top-2.5 right-2.5 z-20 w-3 h-3 rounded-full classic-rivet-bronze" />
          <div className="absolute bottom-2.5 left-2.5 z-20 w-3 h-3 rounded-full classic-rivet-bronze" />
          <div className="absolute bottom-2.5 right-2.5 z-20 w-3 h-3 rounded-full classic-rivet-bronze" />

          {/* Top Header Shelf: All Candidate Score Tabs */}
          <div className="relative z-10 flex items-center justify-between border-b border-amber-500/30 pb-3 mb-4 gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full classic-rivet-red shrink-0" />
              <span className="font-black text-xs sm:text-sm uppercase tracking-widest text-amber-300">
                TỔNG KẾT ĐIỂM SỐ
              </span>
            </div>
            {/* Contestant tabs preview */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {sorted.map((seatId, sIdx) => {
                const s = state.seats[seatId];
                const isSelected = sIdx === currentIdx;
                return (
                  <div
                    key={seatId}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                      isSelected
                        ? "classic-glow-active text-white scale-105"
                        : "bg-black/50 border border-amber-500/30 text-slate-300"
                    }`}
                  >
                    <span className="uppercase truncate max-w-[80px] sm:max-w-[120px]">
                      {s?.name || `Thí sinh ${seatId + 1}`}
                    </span>
                    <span className={`font-black ${isSelected ? "text-amber-200" : "text-amber-400"}`}>
                      {s?.score ?? 0}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main Focus Row: Candidate Name, School & Huge Gold Score */}
          <div className="relative z-10 flex items-center justify-between gap-6 py-2 px-2 sm:px-6">
            <div className="flex-1 min-w-0">
              <div className="text-xs sm:text-sm font-bold text-amber-400 uppercase tracking-widest">
                {isLast ? "🏆 ĐIỂM SỐ CAO NHẤT" : `THÍ SINH ${currentIdx + 1}/${sorted.length}`}
              </div>
              <div className="text-3xl sm:text-4xl md:text-5xl font-black text-white uppercase truncate drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                {currentName}
              </div>
              {currentSeat?.school && (
                <div className="text-sm sm:text-lg text-amber-200/80 font-bold truncate mt-0.5">
                  {currentSeat.school}
                </div>
              )}
            </div>

            <div className="shrink-0 text-right">
              <div className="text-xs sm:text-sm font-bold text-amber-400/80 uppercase tracking-widest">
                ĐIỂM HIỆN TẠI
              </div>
              <div className="text-5xl sm:text-6xl md:text-7xl font-black text-amber-300 drop-shadow-[0_4px_16px_rgba(245,158,11,0.85)] tracking-tight">
                {currentScore}
              </div>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
}

export function SummaryLowerThirdGraphic({
  state,
  onNext,
  onPrev,
  onClose,
}: SummaryLowerThirdGraphicProps) {
  const sm = state.summaryState;
  if (!sm || !sm.active || sm.orderedSeats.length === 0) return null;

  if (state.themeMode === "o26_classic") {
    return (
      <Vtv3ClassicSummaryGraphic
        state={state}
        onNext={onNext}
        onPrev={onPrev}
        onClose={onClose}
      />
    );
  }

  const isPostMatch = Boolean(sm.isPostMatch);
  const isMcIntro = isPostMatch && (sm.focusTarget === "mc" || sm.currentIndex === -1);

  // 1. Sort ascending by score for inter-round, or preserve seat order 1->X for post-match
  const sorted = isPostMatch
    ? [...sm.orderedSeats]
    : [...sm.orderedSeats].sort((a, b) => {
        const sa = state.seats[a]?.score ?? 0;
        const sb = state.seats[b]?.score ?? 0;
        if (sa !== sb) return sa - sb;
        return a - b;
      });

  const [localIdx, setLocalIdx] = useState(sm.currentIndex >= 0 ? sm.currentIndex : 0);

  useEffect(() => {
    if (sm.currentIndex != null && sm.currentIndex >= 0) {
      setLocalIdx(sm.currentIndex);
    }
  }, [sm.currentIndex]);

  if (isMcIntro) {
    return (
      <div className="absolute inset-x-0 bottom-6 z-50 flex flex-col items-center justify-end px-4 pointer-events-none select-none animate-fade-in">
        <div
          className="rounded-2xl px-8 py-4 flex items-center gap-4 shadow-2xl backdrop-blur-md"
          style={{
            background: "linear-gradient(180deg, #1e222a 0%, #15181f 50%, #0d0f14 100%)",
            border: "3px solid #d4af37",
            boxShadow: "0 16px 50px rgba(0,0,0,0.95), 0 0 25px rgba(212,175,55,0.4)",
          }}
        >
          <span className="text-3xl">🏆</span>
          <div className="text-center">
            <div className="text-xs sm:text-sm font-bold text-amber-400 uppercase tracking-widest">
              ĐƯỜNG LÊN ĐỈNH OLYMPIA
            </div>
            <div className="text-xl sm:text-2xl md:text-3xl font-black text-white uppercase drop-shadow">
              TỔNG KẾT ĐIỂM CHUNG CUỘC
            </div>
          </div>
          <span className="text-3xl">🏆</span>
        </div>
      </div>
    );
  }

  const currentIdx = Math.min(localIdx, sorted.length - 1);
  const currentSeatId = sorted[currentIdx];
  const currentSeat = state.seats[currentSeatId];
  const currentScore = currentSeat?.score ?? 0;
  const currentName = currentSeat?.name || `THÍ SINH ${currentSeatId + 1}`;
  const rank = isPostMatch ? (sm.seatRanks?.[currentSeatId] ?? (currentIdx + 1)) : (sorted.length - currentIdx);
  const isLast = isPostMatch ? (rank === 1) : (currentIdx >= sorted.length - 1);

  const handleNext = () => {
    if (onNext) {
      onNext();
    } else {
      setLocalIdx((prev) => Math.min(prev + 1, sorted.length - 1));
    }
  };

  const handlePrev = () => {
    if (onPrev) {
      onPrev();
    } else {
      setLocalIdx((prev) => Math.max(0, prev - 1));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space" || e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "Escape" && onClose) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev, onClose]);

  const isFs = Boolean(sm.isFullscreen || state.overlayMode === "FULLSCREEN");
  const W = isFs ? 1120 : 1000;
  const H = isFs ? 224 : 158;
  const thick = Math.round(H * 0.21);
  const cThick = Math.round(H * 0.16);
  const pad = Math.round(cThick * 1.5);
  const shell = buildArrowShell({ W, H, slantRatio: 0.3571, thick, cThick, pad });
  const dcConverge = shell.W / 2;
  const stepPulseClassL =
    currentIdx === 0 ? "" : currentIdx % 2 === 1 ? "sm-pulse-l-odd" : "sm-pulse-l-even";
  const stepPulseClassR =
    currentIdx === 0 ? "" : currentIdx % 2 === 1 ? "sm-pulse-r-odd" : "sm-pulse-r-even";

  const smClipCss = buildHexClipKeyframes(shell, {
    name: "sm-v3-hex",
    closeEndPercent: 44,
    openStartPercent: 45,
    openEndPercent: 82,
    timingFunction: "cubic-bezier(0.25, 1, 0.5, 1)",
  });

  return (
    <div
      className={
        isFs
          ? "absolute inset-0 z-50 flex flex-col items-center justify-center p-6 pointer-events-auto select-none cursor-pointer bg-[#040d21] overflow-hidden"
          : "absolute inset-x-0 bottom-0 z-50 flex flex-col items-center justify-end pb-4 sm:pb-5 bg-transparent pointer-events-auto select-none cursor-pointer"
      }
      onClick={handleNext}
    >
      {isFs && <Olympia22BackgroundBackdrop />}
      <style>{`
        /* Authentic Econova V3 3-layer arrow sweep-to-center & hexagon-expand on Summary open */
        @keyframes sm-v3-wing-l-g1 {
          0%   { transform: translateX(calc(var(--sm-dc) + 45vw)) scale(0.2); opacity: 0; }
          3%   { opacity: 0.35; }
          25%  { transform: translateX(calc(var(--sm-dc) - 24px)) scale(1); opacity: 0.35; }
          35%  { transform: translateX(var(--sm-dc)) scale(1); opacity: 0.35; }
          45%  { transform: translateX(var(--sm-dc)) scale(1); opacity: 0.35; }
          78%  { transform: translateX(-14px) scale(1); opacity: 0.35; }
          100% { transform: translateX(-8px) scale(1); opacity: 0.35; }
        }
        @keyframes sm-v3-wing-l-g2 {
          0%   { transform: translateX(calc(var(--sm-dc) + 45vw)) scale(0.2); opacity: 0; }
          6%   { opacity: 0.65; }
          30%  { transform: translateX(calc(var(--sm-dc) - 12px)) scale(1); opacity: 0.65; }
          35%  { transform: translateX(var(--sm-dc)) scale(1); opacity: 0.65; }
          45%  { transform: translateX(var(--sm-dc)) scale(1); opacity: 0.65; }
          78%  { transform: translateX(-7px) scale(1); opacity: 0.65; }
          100% { transform: translateX(-4px) scale(1); opacity: 0.65; }
        }
        @keyframes sm-v3-wing-l-l3 {
          0%   { transform: translateX(calc(var(--sm-dc) + 45vw)) scale(0.2); opacity: 0; }
          10%  { opacity: 1; }
          35%  { transform: translateX(var(--sm-dc)) scale(1); opacity: 1; }
          45%  { transform: translateX(var(--sm-dc)) scale(1); opacity: 1; }
          80%  { transform: translateX(0) scale(1); opacity: 1; }
          100% { transform: translateX(0) scale(1); opacity: 1; }
        }
        @keyframes sm-v3-wing-r-g1 {
          0%   { transform: translateX(calc(var(--sm-dc) * -1 - 45vw)) scale(0.2); opacity: 0; }
          3%   { opacity: 0.35; }
          25%  { transform: translateX(calc(var(--sm-dc) * -1 + 24px)) scale(1); opacity: 0.35; }
          35%  { transform: translateX(calc(var(--sm-dc) * -1)) scale(1); opacity: 0.35; }
          45%  { transform: translateX(calc(var(--sm-dc) * -1)) scale(1); opacity: 0.35; }
          78%  { transform: translateX(14px) scale(1); opacity: 0.35; }
          100% { transform: translateX(8px) scale(1); opacity: 0.35; }
        }
        @keyframes sm-v3-wing-r-g2 {
          0%   { transform: translateX(calc(var(--sm-dc) * -1 - 45vw)) scale(0.2); opacity: 0; }
          6%   { opacity: 0.65; }
          30%  { transform: translateX(calc(var(--sm-dc) * -1 + 12px)) scale(1); opacity: 0.65; }
          35%  { transform: translateX(calc(var(--sm-dc) * -1)) scale(1); opacity: 0.65; }
          45%  { transform: translateX(calc(var(--sm-dc) * -1)) scale(1); opacity: 0.65; }
          78%  { transform: translateX(7px) scale(1); opacity: 0.65; }
          100% { transform: translateX(4px) scale(1); opacity: 0.65; }
        }
        @keyframes sm-v3-wing-r-l3 {
          0%   { transform: translateX(calc(var(--sm-dc) * -1 - 45vw)) scale(0.2); opacity: 0; }
          10%  { opacity: 1; }
          35%  { transform: translateX(calc(var(--sm-dc) * -1)) scale(1); opacity: 1; }
          45%  { transform: translateX(calc(var(--sm-dc) * -1)) scale(1); opacity: 1; }
          80%  { transform: translateX(0) scale(1); opacity: 1; }
          100% { transform: translateX(0) scale(1); opacity: 1; }
        }
        ${smClipCss}
        @keyframes sm-v3-content-open {
          0%, 68%  { opacity: 0; transform: translateY(6px); }
          100%     { opacity: 1; transform: translateY(0); }
        }
        @keyframes sm-v3-step-pulse-l-a {
          0%   { transform: translateX(0); }
          40%  { transform: translateX(-12px); }
          100% { transform: translateX(0); }
        }
        @keyframes sm-v3-step-pulse-l-b {
          0%   { transform: translateX(0); }
          40%  { transform: translateX(-12px); }
          100% { transform: translateX(0); }
        }
        @keyframes sm-v3-step-pulse-r-a {
          0%   { transform: translateX(0); }
          40%  { transform: translateX(12px); }
          100% { transform: translateX(0); }
        }
        @keyframes sm-v3-step-pulse-r-b {
          0%   { transform: translateX(0); }
          40%  { transform: translateX(12px); }
          100% { transform: translateX(0); }
        }
        @keyframes sm-v3-flip {
          0%   { opacity: 0; transform: translateY(10px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .sm-wing-l-g1 { animation: sm-v3-wing-l-g1 1.05s cubic-bezier(0.25, 1, 0.5, 1) both; }
        .sm-wing-l-g2 { animation: sm-v3-wing-l-g2 1.05s cubic-bezier(0.25, 1, 0.5, 1) both; }
        .sm-wing-l-l3 { animation: sm-v3-wing-l-l3 1.05s cubic-bezier(0.25, 1, 0.5, 1) both; }
        .sm-wing-r-g1 { animation: sm-v3-wing-r-g1 1.05s cubic-bezier(0.25, 1, 0.5, 1) both; }
        .sm-wing-r-g2 { animation: sm-v3-wing-r-g2 1.05s cubic-bezier(0.25, 1, 0.5, 1) both; }
        .sm-wing-r-l3 { animation: sm-v3-wing-r-l3 1.05s cubic-bezier(0.25, 1, 0.5, 1) both; }
        .sm-hex-open  { animation: sm-v3-hex 1.05s cubic-bezier(0.25, 1, 0.5, 1) both; }
        .sm-content-open { animation: sm-v3-content-open 1.05s ease-out both; }
        .sm-pulse-l-odd  { animation: sm-v3-step-pulse-l-a 0.36s ease-out both; }
        .sm-pulse-l-even { animation: sm-v3-step-pulse-l-b 0.36s ease-out both; }
        .sm-pulse-r-odd  { animation: sm-v3-step-pulse-r-a 0.36s ease-out both; }
        .sm-pulse-r-even { animation: sm-v3-step-pulse-r-b 0.36s ease-out both; }
        .sm-flip-item { animation: sm-v3-flip 0.32s cubic-bezier(0.22, 1, 0.36, 1) both; }
      `}</style>

      <div
        className={isFs ? "relative z-10 w-[78%] max-w-[1480px]" : "w-[68%] max-w-[1300px]"}
        style={{ ["--sm-dc" as string]: `${dcConverge}px` }}
      >
        <V3ScaledStage designW={shell.canvasW} designH={H}>
          {/* Tier 1 (Bottom / z-0): Cyan sliding wings */}
          <svg
            width={shell.canvasW}
            height={H}
            viewBox={`0 0 ${shell.canvasW} ${H}`}
            className="absolute inset-0 overflow-visible pointer-events-none"
            style={{ filter: "drop-shadow(0 14px 36px rgba(0,0,0,0.92))", zIndex: 0 }}
          >
            <defs>
              <linearGradient id="smCyanWingL" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#1fd1ff" />
                <stop offset="100%" stopColor="#2ee6ff" />
              </linearGradient>
              <linearGradient id="smCyanWingR" x1="1" y1="0" x2="0" y2="0">
                <stop offset="0%" stopColor="#1fd1ff" />
                <stop offset="100%" stopColor="#2ee6ff" />
              </linearGradient>
            </defs>

            {/* Left 3-layer cyan wings */}
            <g className={stepPulseClassL}>
              <g className="sm-wing-l-g1">
                <path d={toSvgPath(shell.alcPts)} fill="url(#smCyanWingL)" />
              </g>
              <g className="sm-wing-l-g2">
                <path d={toSvgPath(shell.alcPts)} fill="url(#smCyanWingL)" />
              </g>
              <g className="sm-wing-l-l3">
                <path d={toSvgPath(shell.alcPts)} fill="url(#smCyanWingL)" />
              </g>
            </g>

            {/* Right 3-layer cyan wings */}
            <g className={stepPulseClassR}>
              <g className="sm-wing-r-g1">
                <path d={toSvgPath(shell.arcPts)} fill="url(#smCyanWingR)" />
              </g>
              <g className="sm-wing-r-g2">
                <path d={toSvgPath(shell.arcPts)} fill="url(#smCyanWingR)" />
              </g>
              <g className="sm-wing-r-l3">
                <path d={toSvgPath(shell.arcPts)} fill="url(#smCyanWingR)" />
              </g>
            </g>
          </svg>

          {/* Tier 2 (Middle / z-10): Unified wrapper containing BOTH hexagon SVG body AND HTML content */}
          <div
            className="sm-hex-open absolute inset-0"
            style={{
              zIndex: 10,
              clipPath: `polygon(${toPoly(shell.bgPts)})`,
            }}
          >
            <svg
              width={shell.canvasW}
              height={H}
              viewBox={`0 0 ${shell.canvasW} ${H}`}
              className="absolute inset-0 overflow-visible pointer-events-none"
            >
              <defs>
                <linearGradient id="smBodyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0a226b" />
                  <stop offset="45%" stopColor="#05164d" />
                  <stop offset="100%" stopColor="#030d30" />
                </linearGradient>
              </defs>
              <path d={toSvgPath(shell.bgPts)} fill="url(#smBodyGrad)" stroke="#e2e8f0" strokeWidth={2.2} />
            </svg>

            {/* HTML Interior: Name Header + Score Value */}
            <div className="sm-content-open relative w-full h-full flex flex-col overflow-hidden">
              {/* Top Cyan-Royal Header Band: Contestant Name */}
              <div
                className={`w-full ${isFs ? "h-[58px]" : "h-[44px]"} flex items-center justify-center border-b border-cyan-300/55 px-16 shrink-0`}
                style={{
                  background:
                    "linear-gradient(90deg, #07265a 0%, #0d47a1 22%, #00a8ff 50%, #0d47a1 78%, #07265a 100%)",
                }}
              >
                <span
                  key={`name-${currentSeatId}-${currentName}`}
                  className={`sm-flip-item font-black ${isFs ? "text-[30px]" : "text-[24px]"} text-white tracking-[0.16em] uppercase drop-shadow-[0_2px_8px_rgba(0,195,255,0.85)] truncate`}
                >
                  {currentName}
                </span>
              </div>

              {/* Lower Score Chamber: Pure Numeric Score */}
              <div className="flex-1 flex items-center justify-center">
                <span
                  key={`score-${currentSeatId}-${currentScore}`}
                  className={`sm-flip-item font-black font-mono ${isFs ? "text-[128px]" : "text-[88px]"} leading-none text-white tracking-tight`}
                  style={{
                    filter:
                      "drop-shadow(0 4px 16px rgba(0, 180, 255, 0.5)) drop-shadow(0 8px 22px rgba(0,0,0,0.95))",
                  }}
                >
                  {currentScore}
                </span>
              </div>
            </div>
          </div>

          {/* Tier 3 (Top / z-30): Navy chevrons + crisp white accent lines cutting the hex wedge */}
          <svg
            width={shell.canvasW}
            height={H}
            viewBox={`0 0 ${shell.canvasW} ${H}`}
            className="absolute inset-0 overflow-visible pointer-events-none"
            style={{ zIndex: 30 }}
          >
            <g className={stepPulseClassL}>
              <g className="sm-wing-l-l3">
                <path d={toSvgPath(shell.alnPts)} fill="#0d2c54" stroke="#e2e8f0" strokeWidth={2} />
                <path d={toSvgPath(shell.alnPts)} fill="none" stroke="#ffffff" strokeWidth={1.2} opacity={0.9} />
              </g>
            </g>
            <g className={stepPulseClassR}>
              <g className="sm-wing-r-l3">
                <path d={toSvgPath(shell.arnPts)} fill="#0d2c54" stroke="#e2e8f0" strokeWidth={2} />
                <path d={toSvgPath(shell.arnPts)} fill="none" stroke="#ffffff" strokeWidth={1.2} opacity={0.9} />
              </g>
            </g>
          </svg>
        </V3ScaledStage>
      </div>
    </div>
  );
}


/**
 * ─────────────────────────────────────────────────────────────────────────────
 * HORIZONTAL-ONLY AUTO-FIT TAB LABELS (Keep height 100% constant, scaleX only)
 * ─────────────────────────────────────────────────────────────────────────────
 */
function SlantedTabLabel({
  text,
  cx,
  cy,
  maxWidth,
  fontSize,
  fill,
  textShadow,
}: {
  text: string;
  cx: number;
  cy: number;
  maxWidth: number;
  fontSize: number;
  fill: string;
  textShadow?: string;
}) {
  const ref = useRef<SVGTextElement>(null);
  const [sx, setSx] = useState(1);

  useLayoutEffect(() => {
    let active = true;
    const fit = () => {
      if (!active || !ref.current) return;
      const len = ref.current.getComputedTextLength();
      if (len > 0 && maxWidth > 0) {
        const next = len > maxWidth ? Math.max(0.22, maxWidth / len) : 1;
        setSx((prev) => (Math.abs(prev - next) > 0.005 ? next : prev));
      } else {
        setSx(1);
      }
    };
    fit();
    if (typeof document !== "undefined" && (document as any).fonts?.ready) {
      (document as any).fonts.ready.then(fit).catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [text, maxWidth, fontSize]);

  const baselineY = cy + Math.round(fontSize * 0.35);

  return (
    <text
      ref={ref}
      x={cx}
      y={baselineY}
      dominantBaseline="alphabetic"
      textAnchor="middle"
      fill={fill}
      fontWeight="900"
      fontSize={fontSize}
      transform={
        sx < 0.999
          ? `translate(${cx}, ${baselineY}) scale(${sx}, 1) translate(${-cx}, ${-baselineY})`
          : undefined
      }
      className="uppercase font-sans"
      style={{
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
        filter: textShadow,
      }}
    >
      {text}
    </text>
  );
}

function FlexAutoFitTabLabel({
  text,
  className,
  textShadow,
}: {
  text: string;
  className: string;
  textShadow?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [sx, setSx] = useState(1);

  useLayoutEffect(() => {
    let active = true;
    const fit = () => {
      if (!active || !ref.current) return;
      const parent = ref.current.parentElement;
      if (!parent) return;
      const maxW = Math.max(24, parent.clientWidth - 20);
      const naturalW = ref.current.scrollWidth;
      if (naturalW > 0) {
        const next = naturalW > maxW ? Math.max(0.25, maxW / naturalW) : 1;
        setSx((prev) => (Math.abs(prev - next) > 0.005 ? next : prev));
      } else {
        setSx(1);
      }
    };
    fit();
    if (typeof document !== "undefined" && (document as any).fonts?.ready) {
      (document as any).fonts.ready.then(fit).catch(() => {});
    }
    if (typeof ResizeObserver !== "undefined" && ref.current?.parentElement) {
      const ro = new ResizeObserver(fit);
      ro.observe(ref.current.parentElement);
      return () => {
        active = false;
        ro.disconnect();
      };
    }
    return () => {
      active = false;
    };
  }, [text]);

  return (
    <span
      ref={ref}
      className={`text-[15px] sm:text-[18px] font-black uppercase tracking-wide whitespace-nowrap leading-none ${className}`}
      style={{
        display: "inline-block",
        transformOrigin: "center center",
        transform: sx < 0.999 ? `scaleX(${sx})` : undefined,
        textShadow,
      }}
    >
      {text}
    </span>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AWARDS CEREMONY LOWER-THIRD (LỄ TRAO GIẢI THƯỞNG)
 * Renders television broadcast graphic during Victory Podium ceremony
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function AwardsCeremonyLowerThird({ state }: { state: OlympiaState }) {
  const aw = state.awardsState;
  if (!aw || !aw.active) return null;

  const { activeTier, tiers, laurelCrowned } = aw;

  return (
    <div className="absolute inset-x-0 bottom-6 z-50 flex flex-col items-center justify-end px-4 pointer-events-none select-none animate-fade-in">
      <div
        className="w-full max-w-5xl rounded-2xl p-4 sm:p-5 flex flex-col gap-2 shadow-2xl backdrop-blur-md"
        style={{
          background: "linear-gradient(180deg, #1e222a 0%, #15181f 50%, #0d0f14 100%)",
          border: "3px solid #d4af37",
          boxShadow: "0 16px 50px rgba(0,0,0,0.95), 0 0 25px rgba(212,175,55,0.4)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🥇</span>
            <span className="font-black text-xs sm:text-sm uppercase tracking-widest text-amber-300">
              LỄ TRAO GIẢI THƯỞNG — ĐƯỜNG LÊN ĐỈNH OLYMPIA
            </span>
          </div>
          {laurelCrowned && (
            <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/30 border border-amber-400/60 text-amber-200 text-xs font-black animate-pulse">
              <span>👑</span> VÒNG NGUYỆT QUẾ VINH QUANG
            </div>
          )}
        </div>

        {/* Content based on activeTier */}
        <div className="py-1">
          {activeTier === "first" ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs sm:text-sm font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                  <span>👑</span> QUÁN QUÂN ĐƯỜNG LÊN ĐỈNH OLYMPIA
                </div>
                <div className="text-2xl sm:text-4xl font-black text-white uppercase mt-0.5 drop-shadow">
                  {tiers.first.map((id) => state.seats[id]?.name || `Thí sinh ${id + 1}`).join(", ")}
                </div>
                {tiers.first[0] != null && state.seats[tiers.first[0]]?.school && (
                  <div className="text-sm sm:text-base text-amber-200/80 font-bold">
                    {state.seats[tiers.first[0]].school}
                  </div>
                )}
              </div>
              <div className="shrink-0 text-right">
                <div className="text-xs font-bold text-amber-400/80 uppercase">ĐIỂM CHUNG CUỘC</div>
                <div className="text-3xl sm:text-4xl font-black text-amber-300">
                  {tiers.first[0] != null ? (state.seats[tiers.first[0]]?.score ?? 0) : 0}
                </div>
              </div>
            </div>
          ) : activeTier === "second" ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs sm:text-sm font-black text-cyan-300 uppercase tracking-widest flex items-center gap-1.5">
                  <span>🥈</span> GIẢI NHÌ
                </div>
                <div className="text-xl sm:text-3xl font-black text-white uppercase mt-0.5 drop-shadow">
                  {tiers.second.map((id) => state.seats[id]?.name || `Thí sinh ${id + 1}`).join(", ")}
                </div>
                {tiers.second[0] != null && state.seats[tiers.second[0]]?.school && (
                  <div className="text-sm sm:text-base text-cyan-200/80 font-bold">
                    {state.seats[tiers.second[0]].school}
                  </div>
                )}
              </div>
              <div className="shrink-0 text-right">
                <div className="text-xs font-bold text-cyan-300/80 uppercase">ĐIỂM CHUNG CUỘC</div>
                <div className="text-2xl sm:text-3xl font-black text-cyan-300">
                  {tiers.second[0] != null ? (state.seats[tiers.second[0]]?.score ?? 0) : 0}
                </div>
              </div>
            </div>
          ) : activeTier === "third" ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs sm:text-sm font-black text-blue-300 uppercase tracking-widest flex items-center gap-1.5">
                  <span>🥉</span> ĐỒNG GIẢI BA
                </div>
                <div className="text-xl sm:text-3xl font-black text-white uppercase mt-0.5 drop-shadow">
                  {tiers.third.map((id) => state.seats[id]?.name || `Thí sinh ${id + 1}`).join(", ")}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-xs font-bold text-blue-300/80 uppercase">SỐ THÍ SINH</div>
                <div className="text-2xl sm:text-3xl font-black text-blue-300">
                  {tiers.third.length}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-2">
              <div className="text-lg sm:text-xl font-black text-amber-200 uppercase tracking-wider">
                CHÀO MỪNG ĐOÀN LEO NÚI BƯỚC VÀO LỄ TRAO GIẢI THƯỞNG
              </div>
              <div className="text-xs sm:text-sm text-slate-300">
                Host chuẩn bị gọi tên các vị trí Giải Ba, Giải Nhì và Quán quân bước lên Bục Vinh Quang
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * STANDALONE CONTESTANT SCORE TAB BAR
 * Used for standalone displays or answer boxes in DisplayScreen.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function EconovaContestantScoreTabBar({
  state,
  activeSeatId,
  buzzedSeatId,
  lockedSeats = [],
  questionNumberBadge,
  roundType = "KHOI_DONG",
}: {
  state: OlympiaState;
  activeSeatId?: number | null;
  buzzedSeatId?: number | null;
  lockedSeats?: number[];
  questionNumberBadge?: string | null;
  roundType?: "KHOI_DONG" | "VE_DICH";
}) {
  const seats = activeSeats(state);
  const n = seats.length;
  if (n === 0) return null;

  const isVeDich = roundType === "VE_DICH";
  const pBoxSlant = 12;
  const skewDeg = 16.7;

  return (
    <div className="relative w-full h-[38px] sm:h-[42px] flex items-center overflow-visible select-none z-20">
      <style>{`
        @keyframes buzz-flash-v3 {
          from {
            box-shadow: inset 0 0 15px rgba(255, 255, 255, 0.4), 0 0 15px rgba(255, 0, 0, 0.6);
          }
          to {
            box-shadow: inset 0 0 15px rgba(255, 255, 255, 0.6), 0 0 30px rgba(255, 0, 0, 1.0);
            background: linear-gradient(135deg, #ff5c5c 0%, #d60000 100%);
          }
        }
        .v3-tab-poly {
          position: relative;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.25s ease;
          box-sizing: border-box;
        }
        .v3-tab-buzzed {
          animation: buzz-flash-v3 0.3s infinite alternate;
          z-index: 15 !important;
        }
      `}</style>

      {seats.map((seat, idx) => {
        const isBuzzed = buzzedSeatId === seat.id;
        const isActive = activeSeatId === seat.id;
        const isLocked = lockedSeats.includes(seat.id);

        const isLastSlotKhoiDong = !isVeDich && idx === n - 1;
        const clipPathStyle = isLastSlotKhoiDong
          ? `polygon(${pBoxSlant}px 0, calc(100% - ${pBoxSlant}px) 0, 100% 100%, 0 100%)`
          : `polygon(${pBoxSlant}px 0, 100% 0, calc(100% - ${pBoxSlant}px) 100%, 0 100%)`;

        let bg = "rgba(5, 20, 51, 0.75)";
        let textClass = "text-slate-200";
        let shadow = "none";
        let extraClasses = "";

        if (isBuzzed) {
          bg = "linear-gradient(135deg, #ff3838 0%, #b30000 100%)";
          textClass = "text-white font-black drop-shadow-md";
          extraClasses = "v3-tab-buzzed";
        } else if (isActive) {
          if (isVeDich) {
            bg = "linear-gradient(135deg, #00cfff 0%, #0072ff 100%)";
            textClass = "text-white font-black drop-shadow-md";
            shadow = "inset 0 0 12px rgba(0, 207, 255, 0.6), 0 0 20px rgba(0, 114, 255, 0.5)";
          } else {
            bg = "linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)";
            textClass = "text-white font-black drop-shadow-md";
            shadow = "inset 0 0 12px rgba(255, 255, 255, 0.3), 0 0 20px rgba(231, 76, 60, 0.6)";
          }
        } else if (isLocked) {
          bg = "rgba(0, 0, 0, 0.6)";
          textClass = "text-slate-500 line-through";
        }

        const displayText =
          isVeDich && isActive ? seat.name : `${seat.name} (${seat.score})`;

        return (
          <React.Fragment key={seat.id}>
            <div
              className={`v3-tab-poly flex-1 ${extraClasses}`}
              style={{
                clipPath: clipPathStyle,
                marginLeft: idx === 0 ? "0px" : `-${pBoxSlant}px`,
                background: bg,
                boxShadow: shadow,
                borderTop: "1px solid rgba(0, 207, 255, 0.3)",
                borderBottom: "1px solid rgba(0, 207, 255, 0.3)",
                zIndex: isBuzzed ? 15 : isActive ? 12 : 5,
              }}
            >
              <FlexAutoFitTabLabel
                text={displayText}
                className={textClass}
                textShadow={
                  isBuzzed || isActive
                    ? "0 2px 8px rgba(0,0,0,0.9)"
                    : "0 1px 3px rgba(0,0,0,0.8)"
                }
              />
            </div>

            {idx < n - 1 && (
              <div
                className="pointer-events-none shrink-0"
                style={{
                  width: "3.5px",
                  height: "75%",
                  background: "#ffffff",
                  borderRadius: "99px",
                  transformOrigin: "bottom center",
                  transform: `skewX(-${skewDeg}deg)`,
                  zIndex: 20,
                  boxShadow: "0 0 8px rgba(0, 207, 255, 0.8), 0 0 2px #fff",
                  marginLeft: "-1.75px",
                  marginRight: "-1.75px",
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * DELIVERABLES 1 & 4b: ECONOVA LOWER THIRD V3 (Khởi Động & Về Đích Question Box)
 * - Exact Unified Arrow Shell Geometry (S = 0.3571 * H)
 * - Khởi Động: slots 0..2 are parallelograms; slot 3 is an isosceles trapezoid
 *   touching the right navy chevron with zero gap.
 * - Về Đích: all slots are parallelograms ending at slanted score cluster divider.
 * - Question text: LEFT-ALIGNED and TOP-ALIGNED (items-start, text-left).
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function EconovaLowerThirdV3({
  state,
  categoryBadge,
  headerBadge,
  questionNumberBadge,
  questionText,
  answerText,
  mediaElement,
  timer,
  serverNow,
  activeSeatId,
  buzzedSeatId,
  lockedSeats = [],
  hopeStarActive = false,
  overlayMode = "LOWER_THIRD",
  extraTopBanner,
  showScoreTab = true,
  showTimerClock = false,
  timerBadge,
  runAnim = true,
  arrowFromCenter = false,
  expandFromCenter = false,
  children,
}: {
  state: OlympiaState;
  categoryBadge?: string | null;
  headerBadge?: string | null;
  questionNumberBadge?: string | null;
  questionText?: string | React.ReactNode;
  answerText?: string | null;
  mediaElement?: React.ReactNode;
  timer?: TimerState | null;
  serverNow: () => number;
  activeSeatId?: number | null;
  buzzedSeatId?: number | null;
  lockedSeats?: number[];
  hopeStarActive?: boolean;
  overlayMode?: "LOWER_THIRD" | "FULLSCREEN";
  extraTopBanner?: React.ReactNode;
  showScoreTab?: boolean;
  showTimerClock?: boolean;
  timerBadge?: TimerState | null;
  runAnim?: boolean;
  arrowFromCenter?: boolean;
  expandFromCenter?: boolean;
  children?: React.ReactNode;
}) {
  const fromCenter = Boolean(arrowFromCenter || expandFromCenter);
  const isFs = overlayMode === "FULLSCREEN";
  const isVeDich = state.currentRound === "veDich";
  const W = 1000;
  const baseH = isVeDich ? 200 : 186;
  const isKhoiDongO23ToO26 = state.currentRound === "khoiDong" && !showTimerClock;
  const shouldShowTimerBar = !isKhoiDongO23ToO26 && (isVeDich || Boolean(timer));
  const topReserve = showScoreTab ? 48 : 16;
  const bottomReserve = shouldShowTimerBar ? 28 : 14;

  const strLen = typeof questionText === "string" ? questionText.length : 60;
  // Standard broadcast typography with auto-scaling for long questions (UTM Avo / Montserrat)
  const fontSizeClass =
    strLen > 300
      ? "text-[17px] sm:text-[18px] md:text-[19px] leading-snug font-bold"
      : strLen > 200
      ? "text-[20px] sm:text-[21px] md:text-[22px] leading-snug font-extrabold"
      : "text-[23px] sm:text-[25px] md:text-[27px] leading-snug font-black";

  const approxCharsPerLine = isVeDich ? 34 : 46;
  const estLines =
    questionText && typeof questionText === "string"
      ? Math.max(1, Math.ceil(strLen / approxCharsPerLine))
      : 1;
  const estLineH = strLen > 300 ? 27 : strLen > 200 ? 31 : 38;
  const estQHeight = answerText
    ? 88
    : estLines * estLineH + (mediaElement ? 96 : 16);

  const [measuredQuestionH, setMeasuredQuestionH] = useState(0);
  const questionMeasureRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = questionMeasureRef.current;
    if (!el) {
      setMeasuredQuestionH((prev) => (prev !== 0 ? 0 : prev));
      return;
    }
    const measure = () => {
      // offsetHeight / scrollHeight stays in untransformed design pixels inside V3ScaledStage
      const next = Math.ceil(Math.max(el.offsetHeight || 0, el.scrollHeight || 0));
      setMeasuredQuestionH((prev) => (Math.abs(prev - next) >= 2 ? next : prev));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [questionText, answerText, mediaElement, showScoreTab, shouldShowTimerBar]);

  const effectiveQHeight = Math.max(estQHeight, measuredQuestionH);
  const H = Math.max(baseH, topReserve + Math.ceil(effectiveQHeight) + bottomReserve);
  const cThick = Math.round(baseH * 0.16);
  const pad = Math.round(cThick * 1.5);
  const shell = buildArrowShell({ W, H, slantRatio: 0.3571, cThick, pad });
  const seats = activeSeats(state);
  const n = seats.length;
  const vd = state.veDich;
  const currentPkg = vd && vd.packages[activeSeatId ?? 0];
  const qCount = currentPkg?.length ?? ((state.rulesetId === "O13" || state.rulesetId === "O14") ? 4 : 3);
  const lt = buildLowerThirdLayout(shell, n, isVeDich ? "VE_DICH" : "KHOI_DONG", {
    tabH: 42,
    clusterBottomW: isVeDich && qCount >= 4 ? 228 : 206,
  });

  const packStrip = isVeDich ? buildClusterPackStrip(shell, lt, qCount, 46) : null;

  // In Về Đích: Right score cluster strictly preserves the on-stage main contestant's score
  // (the buzzed stealing contestant is clearly highlighted with their score in the top shelf tabs)
  const targetSeatId = isVeDich ? (activeSeatId ?? (vd ? vd.order[vd.turnIdx] : 0)) : (buzzedSeatId ?? activeSeatId);
  const activeSeat = targetSeatId != null ? state.seats[targetSeatId] : null;
  const displayScore = activeSeat ? activeSeat.score : 0;

  const timerH = 22;
  const qTop = topReserve;
  const qHeight = H - topReserve - bottomReserve;
  const qBottom = qTop + qHeight;
  const safeClusterX = isVeDich && lt.clusterX
    ? Math.min(lt.clusterX(qTop), lt.clusterX(qBottom)) - 18
    : shell.endX - shell.pS - 12;

  const qLeft = shell.startX + shell.pS + 12;
  const qRight = isVeDich && lt.clusterLine ? safeClusterX : shell.endX - shell.pS - 12;
  const qWidth = Math.max(100, qRight - qLeft);
  const dc = shell.W / 2;
  const travelDist = Math.max(shell.canvasW, 1400);

  // Trapezoid geometry for the Econova bottom silver timer housing
  const tY0 = H - timerH;
  const tY1 = H;
  const tLx0 = shell.edgeL(tY0);
  const tLx1 = shell.edgeL(tY1);
  const tRx0 = isVeDich && lt.clusterX ? lt.clusterX(tY0) : shell.edgeR(tY0);
  const tRx1 = isVeDich && lt.clusterX ? lt.clusterX(tY1) : shell.edgeR(tY1);
  const timerMinX = Math.min(tLx0, tLx1);
  const timerMaxX = Math.max(tRx0, tRx1);
  const timerBarW = Math.max(120, timerMaxX - timerMinX);
  const timerClipPath = `polygon(${(tLx0 - timerMinX).toFixed(1)}px 0, ${(tRx0 - timerMinX).toFixed(1)}px 0, ${(tRx1 - timerMinX).toFixed(1)}px 100%, ${(tLx1 - timerMinX).toFixed(1)}px 100%)`;

  const starSize = 164;
  const starCx = isVeDich && lt?.clusterX ? (lt.clusterX(0) + shell.edgeR(0)) / 2 : (shell.endX - 70);
  const starLeft = Math.round(starCx - starSize / 2);
  const starTop = -Math.round(starSize * 0.72);
  const { closedClip, openClip } = getHexClipPoints(shell);
  const ecoHexClipCss = buildHexClipKeyframes(shell, {
    name: "v3-eco-hex-body",
    closeEndPercent: 44.9,
    openStartPercent: 45,
    openEndPercent: 80,
    timingFunction: "cubic-bezier(0.25, 1, 0.5, 1)",
  });

  return (
    <div
      className={
        isFs
          ? "absolute inset-0 z-30 flex flex-col items-center justify-center p-4 sm:p-8 bg-[#051126]/90 backdrop-blur-md pointer-events-auto font-v3-avo"
          : "w-full max-w-[94vw] 2xl:max-w-[95vw] mx-auto px-1 sm:px-2 pb-2 pt-1 z-20 pointer-events-auto relative font-v3-avo"
      }
      style={{ fontFamily: "'UTM Avo', 'Montserrat', 'Be Vietnam Pro', system-ui, -apple-system, sans-serif" }}
    >
      {extraTopBanner && <div className="mb-2 w-full max-w-[94vw] 2xl:max-w-[95vw] mx-auto">{extraTopBanner}</div>}

      <div
        className={`relative w-full flex items-center justify-center select-none ${fromCenter ? "v3-fc" : ""}`}
        style={{
          ["--dc" as string]: `${dc}px`,
          ["--v3-travel" as string]: `${travelDist}px`,
        }}
      >
        <style>{`
          /* SVG Transform Box & Centroid Anchoring for Layer Zoom */
          .v3-anim-l-g1, .v3-anim-l-g2, .v3-anim-l-l3, .v3-anim-l-navy,
          .v3-anim-r-g1, .v3-anim-r-g2, .v3-anim-r-l3, .v3-anim-r-navy {
            transform-box: fill-box;
            transform-origin: center;
          }

          /* Left direction keyframes (Pointing <) - Fly from right (+travel) across to center */
          @keyframes v3-eco-l-g1 {
            0%   { transform: translateX(calc(var(--dc) + var(--v3-travel))) scale(0.10); opacity: 0; }
            1%   { opacity: 0.35; }
            25%  { transform: translateX(calc(var(--dc) - 24px)) scale(0.85); opacity: 0.35; }
            35%  { transform: translateX(var(--dc)) scale(1.20); opacity: 0.35; }
            45%  { transform: translateX(var(--dc)) scale(1.15); opacity: 0.35; }
            80%  { transform: translateX(0) scale(1.0); opacity: 0.35; }
            100% { transform: translateX(0) scale(1.0); opacity: 0.35; }
          }
          @keyframes v3-eco-l-g2 {
            0%   { transform: translateX(calc(var(--dc) + var(--v3-travel))) scale(0.15); opacity: 0; }
            5%   { opacity: 0.65; }
            30%  { transform: translateX(calc(var(--dc) - 12px)) scale(0.90); opacity: 0.65; }
            35%  { transform: translateX(var(--dc)) scale(1.15); opacity: 0.65; }
            45%  { transform: translateX(var(--dc)) scale(1.10); opacity: 0.65; }
            80%  { transform: translateX(0) scale(1.0); opacity: 0.65; }
            100% { transform: translateX(0) scale(1.0); opacity: 0.65; }
          }
          @keyframes v3-eco-l-l3 {
            0%   { transform: translateX(calc(var(--dc) + var(--v3-travel))) scale(0.20); opacity: 0; }
            10%  { opacity: 1; }
            35%  { transform: translateX(var(--dc)) scale(1.08); opacity: 1; }
            45%  { transform: translateX(var(--dc)) scale(1.04); opacity: 1; }
            80%  { transform: translateX(0) scale(1.0); opacity: 1; }
            100% { transform: translateX(0) scale(1.0); opacity: 1; }
          }
          @keyframes v3-eco-l-navy {
            0%   { transform: translateX(calc(var(--dc) + var(--v3-travel))) scale(0.25); opacity: 0; }
            10%  { opacity: 1; }
            35%  { transform: translateX(var(--dc)) scale(1.02); opacity: 1; }
            45%  { transform: translateX(var(--dc)) scale(1.0); opacity: 1; }
            80%  { transform: translateX(0) scale(1.0); opacity: 1; }
            100% { transform: translateX(0) scale(1.0); opacity: 1; }
          }

          /* Right direction keyframes (Pointing >) - Fly from left (-travel) across to center */
          @keyframes v3-eco-r-g1 {
            0%   { transform: translateX(calc(var(--dc) * -1 - var(--v3-travel))) scale(0.10); opacity: 0; }
            1%   { opacity: 0.35; }
            25%  { transform: translateX(calc(var(--dc) * -1 + 24px)) scale(0.85); opacity: 0.35; }
            35%  { transform: translateX(calc(var(--dc) * -1)) scale(1.20); opacity: 0.35; }
            45%  { transform: translateX(calc(var(--dc) * -1)) scale(1.15); opacity: 0.35; }
            80%  { transform: translateX(0) scale(1.0); opacity: 0.35; }
            100% { transform: translateX(0) scale(1.0); opacity: 0.35; }
          }
          @keyframes v3-eco-r-g2 {
            0%   { transform: translateX(calc(var(--dc) * -1 - var(--v3-travel))) scale(0.15); opacity: 0; }
            5%   { opacity: 0.65; }
            30%  { transform: translateX(calc(var(--dc) * -1 + 12px)) scale(0.90); opacity: 0.65; }
            35%  { transform: translateX(calc(var(--dc) * -1)) scale(1.15); opacity: 0.65; }
            45%  { transform: translateX(calc(var(--dc) * -1)) scale(1.10); opacity: 0.65; }
            80%  { transform: translateX(0) scale(1.0); opacity: 0.65; }
            100% { transform: translateX(0) scale(1.0); opacity: 0.65; }
          }
          @keyframes v3-eco-r-l3 {
            0%   { transform: translateX(calc(var(--dc) * -1 - var(--v3-travel))) scale(0.20); opacity: 0; }
            10%  { opacity: 1; }
            35%  { transform: translateX(calc(var(--dc) * -1)) scale(1.08); opacity: 1; }
            45%  { transform: translateX(calc(var(--dc) * -1)) scale(1.04); opacity: 1; }
            80%  { transform: translateX(0) scale(1.0); opacity: 1; }
            100% { transform: translateX(0) scale(1.0); opacity: 1; }
          }
          @keyframes v3-eco-r-navy {
            0%   { transform: translateX(calc(var(--dc) * -1 - var(--v3-travel))) scale(0.25); opacity: 0; }
            10%  { opacity: 1; }
            35%  { transform: translateX(calc(var(--dc) * -1)) scale(1.02); opacity: 1; }
            45%  { transform: translateX(calc(var(--dc) * -1)) scale(1.0); opacity: 1; }
            80%  { transform: translateX(0) scale(1.0); opacity: 1; }
            100% { transform: translateX(0) scale(1.0); opacity: 1; }
          }

          /* Hexagon Body Expand from center with 6-vertex hex clip at 45% to 80% */
          ${ecoHexClipCss}

          /* Content reveal: Hidden until 70%, 100% at 85% */
          @keyframes v3-eco-content-fade {
            0%, 70%  { opacity: 0; }
            85%      { opacity: 1; }
            100%     { opacity: 1; }
          }

          @keyframes v3-eco-text-swap {
            0%       { opacity: 0; transform: translateY(4px); }
            100%     { opacity: 1; transform: translateY(0); }
          }

          @keyframes pulse-timer-v3 {
            from { box-shadow: 0 0 6px #fff, 0 0 12px #ff0000; transform: scale(1); }
            to   { box-shadow: 0 0 12px #fff, 0 0 22px #ff0000; transform: scale(1.22); }
          }

          @keyframes buzz-pulse-v3a {
            from { filter: brightness(1.0); }
            to   { filter: brightness(1.35) drop-shadow(0 0 10px rgba(255, 56, 56, 0.9)); }
          }

          /* Master Animation Classes: 2.4s duration */
          .v3-anim-l-g1   { animation: v3-eco-l-g1 2.4s both cubic-bezier(0.25, 1, 0.5, 1); }
          .v3-anim-l-g2   { animation: v3-eco-l-g2 2.4s both cubic-bezier(0.25, 1, 0.5, 1); }
          .v3-anim-l-l3   { animation: v3-eco-l-l3 2.4s both cubic-bezier(0.25, 1, 0.5, 1); }
          .v3-anim-l-navy { animation: v3-eco-l-navy 2.4s both cubic-bezier(0.25, 1, 0.5, 1); }

          .v3-anim-r-g1   { animation: v3-eco-r-g1 2.4s both cubic-bezier(0.25, 1, 0.5, 1); }
          .v3-anim-r-g2   { animation: v3-eco-r-g2 2.4s both cubic-bezier(0.25, 1, 0.5, 1); }
          .v3-anim-r-l3   { animation: v3-eco-r-l3 2.4s both cubic-bezier(0.25, 1, 0.5, 1); }
          .v3-anim-r-navy { animation: v3-eco-r-navy 2.4s both cubic-bezier(0.25, 1, 0.5, 1); }

          .v3-anim-body   { animation: v3-eco-hex-body 2.4s both; }
          .v3-anim-content{ animation: v3-eco-content-fade 2.4s ease-out both; }
          .v3-anim-swap   { animation: v3-eco-text-swap 0.35s ease-out both; }
          .v3a-buzz       { animation: buzz-pulse-v3a 0.35s infinite alternate; }

          /* Direct Expand from Center (Continuous transition from package grid collapse) */
          @keyframes v3-eco-fc-l {
            0%   { transform: translateX(var(--dc)) scale(1.05); opacity: 1; }
            15%  { transform: translateX(var(--dc)) scale(1.02); opacity: 1; }
            80%  { transform: translateX(0) scale(1.0); opacity: 1; }
            100% { transform: translateX(0) scale(1.0); opacity: 1; }
          }
          @keyframes v3-eco-fc-r {
            0%   { transform: translateX(calc(var(--dc) * -1)) scale(1.05); opacity: 1; }
            15%  { transform: translateX(calc(var(--dc) * -1)) scale(1.02); opacity: 1; }
            80%  { transform: translateX(0) scale(1.0); opacity: 1; }
            100% { transform: translateX(0) scale(1.0); opacity: 1; }
          }
          @keyframes v3-eco-fc-body {
            0%   { clip-path: ${closedClip}; opacity: 1; }
            15%  { clip-path: ${closedClip}; opacity: 1; }
            80%  { clip-path: ${openClip}; opacity: 1; }
            100% { clip-path: ${openClip}; opacity: 1; }
          }

          .v3-fc .v3-anim-l-g1,
          .v3-fc .v3-anim-l-g2,
          .v3-fc .v3-anim-l-l3,
          .v3-fc .v3-anim-l-navy {
            animation: v3-eco-fc-l 0.85s both cubic-bezier(0.2, 0.8, 0.2, 1);
          }
          .v3-fc .v3-anim-r-g1,
          .v3-fc .v3-anim-r-g2,
          .v3-fc .v3-anim-r-l3,
          .v3-fc .v3-anim-r-navy {
            animation: v3-eco-fc-r 0.85s both cubic-bezier(0.2, 0.8, 0.2, 1);
          }
          .v3-fc .v3-anim-body {
            animation: v3-eco-fc-body 0.85s both cubic-bezier(0.2, 0.8, 0.2, 1);
          }
          .v3-fc .v3-anim-content {
            animation: v3-eco-content-fade 0.85s ease-out both;
          }
        `}</style>
        <V3ScaledStage designW={shell.canvasW} designH={H}>
          {/* Tier 1 (Bottom / z-0): Cyan sliding wings with Econova motion cushion */}
          <svg
            width={shell.canvasW}
            height={H}
            viewBox={`0 0 ${shell.canvasW} ${H}`}
            className="absolute inset-0 overflow-visible pointer-events-none"
            style={{ zIndex: 0 }}
          >
            <defs>
              <linearGradient id="ltCyanWing" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#1fd1ff" />
                <stop offset="100%" stopColor="#2ee6ff" />
              </linearGradient>
            </defs>

            {/* Left cyan wing trailing glows */}
            <g className={runAnim ? "v3-anim-l-g1" : ""} opacity={runAnim ? undefined : 0.3}>
              <path d={toSvgPath(shell.alcPts)} fill="url(#ltCyanWing)" />
            </g>
            <g className={runAnim ? "v3-anim-l-g2" : ""} opacity={runAnim ? undefined : 0.65}>
              <path d={toSvgPath(shell.alcPts)} fill="url(#ltCyanWing)" />
            </g>
            <g className={runAnim ? "v3-anim-l-l3" : ""}>
              <path d={toSvgPath(shell.alcPts)} fill="url(#ltCyanWing)" />
            </g>

            {/* Right cyan wing trailing glows */}
            <g className={runAnim ? "v3-anim-r-l3" : ""}>
              <path d={toSvgPath(shell.arcPts)} fill="url(#ltCyanWing)" />
            </g>
            <g className={runAnim ? "v3-anim-r-g2" : ""} opacity={runAnim ? undefined : 0.65}>
              <path d={toSvgPath(shell.arcPts)} fill="url(#ltCyanWing)" />
            </g>
            <g className={runAnim ? "v3-anim-r-g1" : ""} opacity={runAnim ? undefined : 0.3}>
              <path d={toSvgPath(shell.arcPts)} fill="url(#ltCyanWing)" />
            </g>
          </svg>

          {/* Tier 2 (Middle / z-10): Unified wrapper containing BOTH hexagon SVG body AND HTML question/timer layers, clipped by 6-vertex polygon */}
          <div
            className={runAnim ? "v3-anim-body absolute inset-0" : "absolute inset-0"}
            style={{
              zIndex: 10,
              clipPath: `polygon(${toPoly(shell.bgPts)})`,
            }}
          >
            <svg
              width={shell.canvasW}
              height={H}
              viewBox={`0 0 ${shell.canvasW} ${H}`}
              className="absolute inset-0 overflow-visible pointer-events-none"
            >
              <defs>
                <linearGradient id="ltBodyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0a226b" />
                  <stop offset="45%" stopColor="#05164d" />
                  <stop offset="100%" stopColor="#030d30" />
                </linearGradient>
                <linearGradient id="ltTabActiveKd" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#e74c3c" />
                  <stop offset="100%" stopColor="#c0392b" />
                </linearGradient>
                <linearGradient id="ltTabActiveVd" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#eab308" />
                </linearGradient>
                <linearGradient id="ltTabBuzzed" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ff3838" />
                  <stop offset="100%" stopColor="#b30000" />
                </linearGradient>
              </defs>

              <path d={toSvgPath(shell.bgPts)} fill="url(#ltBodyGrad)" stroke="#d1d5db" strokeWidth={2.5} />

              {/* Top Shelf Contestant Tabs */}
              {showScoreTab &&
                lt.tabs.cells.map((tab) => {
                  const seat = seats[tab.i];
                  if (!seat) return null;
                  const isBuzzed = buzzedSeatId === seat.id;
                  const isActive = activeSeatId === seat.id;
                  const isLocked = lockedSeats.includes(seat.id);

                  let fillUrl = "rgba(5, 20, 51, 0.75)";
                  if (isBuzzed) fillUrl = "url(#ltTabBuzzed)";
                  else if (isActive) fillUrl = isVeDich ? "url(#ltTabActiveVd)" : "url(#ltTabActiveKd)";
                  else if (isLocked) fillUrl = "rgba(0, 0, 0, 0.7)";

                  const displayText = `${seat.name} (${seat.score})`;

                  const tabSafeW = tab.width;
                  const maxLabelW = Math.max(16, tabSafeW - (n <= 4 ? 14 : 10));
                  const baseTabFontSize = n <= 4 ? 24 : 21;

                  return (
                    <g key={seat.id} className={isBuzzed ? "v3a-buzz" : ""}>
                      <path
                        d={toSvgPath(tab.pts)}
                        fill={fillUrl}
                        stroke="rgba(0, 207, 255, 0.35)"
                        strokeWidth="1"
                      />
                      <SlantedTabLabel
                        text={displayText}
                        cx={tab.cx}
                        cy={tab.cy}
                        maxWidth={maxLabelW}
                        fontSize={baseTabFontSize}
                        fill={isLocked ? "#64748b" : "#ffffff"}
                        textShadow={
                          isBuzzed || isActive
                            ? "drop-shadow(0 2px 6px rgba(0,0,0,0.9))"
                            : undefined
                        }
                      />
                    </g>
                  );
                })}

              {/* White slanted dividers between tabs */}
              {showScoreTab &&
                lt.tabs.seams.map((s, idx) => (
                  <line
                    key={`tab-seam-${idx}`}
                    x1={s.x0}
                    y1={s.y0}
                    x2={s.x1}
                    y2={s.y1}
                    stroke="#ffffff"
                    strokeWidth="2.5"
                  />
                ))}

              {/* Về Đích Right Score Cluster */}
              {isVeDich && lt.clusterPoly && lt.clusterLine && (
                <g>
                  {/* Cluster chamber fill */}
                  <path d={toSvgPath(lt.clusterPoly)} fill="rgba(6, 24, 66, 0.85)" />

                  {/* Cluster left slanted divider line */}
                  <line
                    x1={lt.clusterLine.x0}
                    y1={lt.clusterLine.y0}
                    x2={lt.clusterLine.x1}
                    y2={lt.clusterLine.y1}
                    stroke="#ffffff"
                    strokeWidth="2.5"
                  />

                  {/* Big Score Display (Pure white geometric sans, vertically & horizontally centered inside cluster) */}
                  {(() => {
                    const stripH = packStrip ? 46 : 36;
                    const scoreCy = (H - stripH) / 2 + 7;
                    const scoreCx = lt.clusterX
                      ? (lt.clusterX(scoreCy) + shell.edgeR(scoreCy)) / 2
                      : (lt.clusterLine.x0 + shell.endX) / 2;
                    const scoreDigits = String(displayScore).length;
                    const scoreFontSize =
                      scoreDigits >= 4
                        ? qCount >= 4
                          ? "38"
                          : "42"
                        : scoreDigits >= 3
                        ? qCount >= 4
                          ? "46"
                          : "50"
                        : qCount >= 4
                        ? "52"
                        : "58";
                    return (
                      <text
                        x={scoreCx}
                        y={scoreCy}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#ffffff"
                        fontWeight="900"
                        fontSize={scoreFontSize}
                        className="font-sans font-black"
                        style={{
                          fontFamily: "'UTM Avo', 'Montserrat', 'Be Vietnam Pro', system-ui, -apple-system, sans-serif",
                          filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.85)) drop-shadow(0 4px 14px rgba(0,0,0,0.9))",
                        }}
                      >
                        {displayScore}
                      </text>
                    );
                  })()}

                  {/* Package strip at bottom */}
                  {packStrip &&
                    packStrip.cells.map((cell, pIdx) => {
                      const qPoints = currentPkg?.[pIdx]?.points ?? (pIdx === 0 ? 20 : 30);
                      const isCurQ = vd?.qIdx === pIdx;

                      return (
                        <g key={`pack-${pIdx}`}>
                          <path
                            d={toSvgPath(cell.pts)}
                            fill={isCurQ ? "#0284c7" : "rgba(5, 20, 51, 0.92)"}
                            stroke="rgba(255,255,255,0.45)"
                            strokeWidth="1.2"
                          />
                          <text
                            x={cell.cx}
                            y={cell.cy}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill={isCurQ ? "#ffffff" : "#e2e8f0"}
                            fontWeight="900"
                            fontSize={qCount >= 4 ? "22" : "25"}
                            className="font-sans font-black"
                            style={{
                              fontFamily: "'UTM Avo', 'Montserrat', 'Be Vietnam Pro', system-ui, -apple-system, sans-serif",
                              filter: isCurQ ? "drop-shadow(0 0 8px rgba(56,189,248,0.9))" : "drop-shadow(0 1px 3px rgba(0,0,0,0.85))",
                            }}
                          >
                            {qPoints}
                          </text>
                        </g>
                      );
                    })}
                </g>
              )}
            </svg>

            {/* Exact Econova Show Silver Trapezoid Timer Housing (screen.html: 22px height, #d1d5db->#6b7280 housing, 8px black track, red left-to-right progress bar + pulsing white handle) */}
            {shouldShowTimerBar && (
              <EconovaSpecializedTimerBar
                timer={timer || { totalMs: 15000, remainingMs: 15000, startedAt: null }}
                serverNow={serverNow}
                defaultTotalMs={5000}
                height={timerH}
                trackMargin="0 24px"
                clipPath={timerClipPath}
                clockFormat="mmss"
                className="absolute z-20 pointer-events-none"
                style={{
                  left: timerMinX,
                  bottom: 0,
                  width: timerBarW,
                }}
              />
            )}
          </div>

          {/* Decoupled Independent Question Bounding Box (outside Tier-2 SVG clipPath, zero bottom clipping on 3+ lines, instant swap without fade) */}
          <div
            data-testid="v3-question-bounding-box"
            className={`absolute flex flex-col justify-start items-start text-left font-v3-avo ${
              runAnim ? "v3-anim-content" : ""
            }`}
            style={{
              zIndex: 25,
              left: qLeft,
              top: qTop,
              width: qWidth,
              minHeight: qHeight,
              maxWidth: qWidth,
              overflow: "visible",
              clipPath: "none",
              fontFamily: "'UTM Avo', 'Montserrat', 'Be Vietnam Pro', system-ui, -apple-system, sans-serif",
            }}
          >
            <div ref={questionMeasureRef} className="w-full flex flex-col items-start justify-start text-left">
              {answerText ? (
                <div className="flex flex-col items-start justify-center gap-1 w-full pt-1 pr-3 select-none">
                  <div className="text-xs sm:text-sm font-bold tracking-widest text-cyan-300 uppercase">
                    ĐÁP ÁN CHÍNH XÁC
                  </div>
                  <div className="text-2xl sm:text-3xl md:text-4xl font-black text-emerald-400 drop-shadow-[0_0_18px_rgba(52,211,153,0.7)] tracking-wide">
                    ✔ {answerText}
                  </div>
                </div>
              ) : questionText ? (
                <div
                  className={`text-white text-left tracking-normal ${fontSizeClass} drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] w-full pt-1 pb-1.5 pr-3 select-none break-words`}
                >
                  {questionText}
                </div>
              ) : null}
              {mediaElement && <div className="mt-1">{mediaElement}</div>}
              {children}
            </div>
          </div>

          {/* Tier 3 (Top / z-30): Navy chevrons + crisp white accent lines cutting the hex wedge */}
          <svg
            width={shell.canvasW}
            height={H}
            viewBox={`0 0 ${shell.canvasW} ${H}`}
            className="absolute inset-0 overflow-visible pointer-events-none"
            style={{ zIndex: 30 }}
          >
            <g className={runAnim ? "v3-anim-l-navy" : ""}>
              <path d={toSvgPath(shell.alnPts)} fill="#0d2c54" stroke="#d1d5db" strokeWidth={2} />
              <path d={toSvgPath(shell.alnPts)} fill="none" stroke="#ffffff" strokeWidth={1.2} opacity={0.9} />
            </g>
            <g className={runAnim ? "v3-anim-r-navy" : ""}>
              <path d={toSvgPath(shell.arnPts)} fill="#0d2c54" stroke="#d1d5db" strokeWidth={2} />
              <path d={toSvgPath(shell.arnPts)} fill="none" stroke="#ffffff" strokeWidth={1.2} opacity={0.9} />
            </g>
          </svg>

          {/* Tier 4 (Floating / z-40): Hope Star & Top Badges anchored above y=0 */}
          {hopeStarActive && (
            <div
              className="absolute z-40 pointer-events-none transition-all duration-300 animate-in zoom-in-50"
              style={{
                position: "absolute",
                left: `${starLeft}px`,
                top: `${starTop}px`,
                width: `${starSize}px`,
                height: `${starSize}px`,
                zIndex: 40,
                pointerEvents: "none",
                filter: "drop-shadow(0 4px 14px rgba(0,0,0,0.9))",
              }}
            >
              <HopeStarBadge size={starSize} />
            </div>
          )}

          {(questionNumberBadge || headerBadge || timerBadge) && (
            <div
              className={`absolute z-40 pointer-events-none flex items-center justify-between select-none ${
                runAnim ? "v3-anim-content" : ""
              }`}
              style={{
                top: -30,
                left: qLeft,
                width: qWidth,
              }}
            >
              <div className="flex items-center gap-2">
                {questionNumberBadge && (
                  <div
                    className="w-[120px] min-w-[120px] max-w-[120px] h-[30px] px-2 rounded-t-lg font-black text-xs sm:text-sm tracking-widest uppercase flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.5)] border-t border-x border-amber-300/60 shrink-0"
                    style={{
                      background: "linear-gradient(135deg, #091a42 0%, #061129 100%)",
                      color: "#fbbf24",
                      boxSizing: "border-box",
                    }}
                  >
                    <span>{questionNumberBadge}</span>
                  </div>
                )}
                {headerBadge && (
                  <div
                    className="px-2.5 py-0.5 rounded-t-lg font-black text-xs sm:text-sm tracking-wider uppercase border-t border-x border-cyan-400/40 text-cyan-200"
                    style={{
                      background: "linear-gradient(135deg, #05264a 0%, #031427 100%)",
                    }}
                  >
                    {headerBadge}
                  </div>
                )}
              </div>

              {timerBadge && (
                <EconovaSecondsBadge
                  timer={timerBadge}
                  serverNow={serverNow}
                />
              )}
            </div>
          )}
        </V3ScaledStage>
      </div>
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * DELIVERABLE 4a: VỀ ĐÍCH SLANTED GRID GRAPHIC
 * - Exact Unified Arrow Geometry (Olympia 26 / Econova Wiki parity)
 * - Ruleset-driven: O24–O26 = 2 rows (20, 30) x 3 cols
 *   O22 Q1 = 2 rows (20, 40) x 2 cols, O20–O21 = 3 rows (10, 20, 30) x 3 cols
 *   O13–O19 = 1 row (40, 60, 80)
 * - Cells are authentic parallelograms with straight slanted divider lines.
 * - Selection: Exactly 1 red cell per column in custom mode; 1 red cell in preset mode.
 * - Text: Pure bold white point numbers centered at cell centroids (cx, cy).
 * ─────────────────────────────────────────────────────────────────────────────
 */
/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AUTHENTIC O26 CLASSIC VỀ ĐÍCH GOLDEN TABLETS (Phiến Kim Bài Cổ Điển)
 * Signature 3D staggered flip entrance, mun-wood & brass inlay header,
 * and procedural mechanical drop SFX.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function ClassicVeDichGoldenTabletsGraphic({
  state,
  ownerSeatId,
  selectedPoints,
  closing = false,
}: {
  state: OlympiaState;
  ownerSeatId?: number;
  selectedPoints?: number[];
  closing?: boolean;
}) {
  const vd = state.veDich;
  const resolvedOwnerId = ownerSeatId ?? (vd ? vd.order[vd.turnIdx] : 0);
  const owner = state.seats[resolvedOwnerId];
  const resolvedSelected =
    selectedPoints ?? (vd?.packages[resolvedOwnerId] ? vd.packages[resolvedOwnerId].map((p) => p.points) : undefined);
  const spec = resolveVeDichGridSpec(state.rulesetId, state.o22Quarter);

  // Trigger procedural audio clacks when each tablet flips down into place
  useEffect(() => {
    if (closing) return;
    const t0 = setTimeout(() => playClassicTabletFlipSFX(0), 120);
    const t1 = setTimeout(() => playClassicTabletFlipSFX(1), 270);
    const t2 = setTimeout(() => playClassicTabletFlipSFX(2), 420);
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [closing]);

  return (
    <div
      className={`relative w-full max-w-4xl mx-auto px-2 py-1.5 z-20 pointer-events-auto flex flex-col items-center gap-2 select-none transition-all duration-400 ease-in-out ${
        closing ? "transform scale-90 opacity-0" : "animate-fade-in transform scale-100 opacity-100"
      }`}
    >
      <HorizontalBrassRod />

      {/* Mun-wood & Brass Inlay Header Plaque */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: "easeOut" }}
        className="relative z-10 px-6 sm:px-8 py-2 rounded-xl flex items-center justify-center gap-3 overflow-hidden shadow-2xl"
        style={{
          background: "linear-gradient(180deg, #1f242d 0%, #15181f 50%, #0d0f14 100%)",
          border: "2.5px solid #d4af37",
          outline: "1.5px solid #78350f",
          outlineOffset: "-4px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.9), 0 0 20px rgba(212,175,55,0.25)",
        }}
      >
        <div className="w-2.5 h-2.5 rounded-full classic-rivet-bronze" />
        <span className="text-amber-200 font-black text-xs sm:text-sm md:text-base uppercase tracking-widest drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
          LỰA CHỌN GÓI CÂU HỎI VỀ ĐÍCH — {owner?.name || `THÍ SINH ${resolvedOwnerId + 1}`}
        </span>
        <div className="w-2.5 h-2.5 rounded-full classic-rivet-bronze" />
      </motion.div>

      {/* 3 Staggered 3D Brass/Gold Tablets */}
      <div
        className="relative z-10 w-full flex items-center justify-center gap-4 sm:gap-7 pt-1"
        style={{ perspective: "1200px" }}
      >
        {Array.from({ length: spec.cols }).map((_, cIdx) => {
          const pt = resolvedSelected?.[cIdx];
          const isChosen = pt != null;
          return (
            <motion.div
              key={cIdx}
              initial={{ rotateX: -90, opacity: 0, y: -30 }}
              animate={{ rotateX: 0, opacity: 1, y: 0 }}
              exit={{ rotateX: 90, opacity: 0, scale: 0.95 }}
              transition={{
                type: "spring",
                stiffness: 280,
                damping: 22,
                delay: 0.12 + cIdx * 0.15,
              }}
              style={{
                transformOrigin: "top center",
                background: "linear-gradient(180deg, #222834 0%, #171b23 50%, #0b0d12 100%)",
                border: "3.5px solid #d4af37",
                outline: "1.5px solid #78350f",
                outlineOffset: "-5px",
                boxShadow: isChosen
                  ? "0 16px 45px rgba(0,0,0,0.92), 0 0 32px rgba(212,175,55,0.6), inset 0 2px 4px rgba(255,255,255,0.4)"
                  : "0 12px 35px rgba(0,0,0,0.85), inset 0 1px 3px rgba(255,255,255,0.25)",
              }}
              className="relative w-28 sm:w-36 md:w-44 h-32 sm:h-40 md:h-44 rounded-2xl flex flex-col items-center justify-between p-2 sm:p-3 overflow-hidden shadow-2xl select-none"
            >
              {/* Subtle chalkboard SVG background inside tablet */}
              <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden rounded-2xl">
                <Vtv3ChalkboardBackdrop />
              </div>

              {/* Specular metallic sheen sweep on confirmed tablet */}
              {isChosen && (
                <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                  <div className="sheen-sweep-beam" />
                </div>
              )}

              {/* Bronze Corner Rivets */}
              <div className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full classic-rivet-bronze" />
              <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full classic-rivet-bronze" />
              <div className="absolute bottom-1.5 left-1.5 w-2 h-2 rounded-full classic-rivet-bronze" />
              <div className="absolute bottom-1.5 right-1.5 w-2 h-2 rounded-full classic-rivet-bronze" />

              {/* Tablet Top Brass Header */}
              <div className="relative z-10 w-full py-0.5 rounded-lg bg-gradient-to-r from-amber-950/80 via-amber-900/90 to-amber-950/80 border border-amber-500/40 text-center">
                <span className="text-[10px] sm:text-xs font-black text-amber-300 uppercase tracking-widest drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                  CÂU {cIdx + 1}
                </span>
              </div>

              {/* Tablet Center Points Display */}
              <div className="relative z-10 flex flex-col items-center justify-center my-auto">
                <span className="text-3xl sm:text-4xl md:text-5xl font-black text-amber-300 font-mono tracking-tight drop-shadow-[0_2px_14px_rgba(251,191,36,0.85)]">
                  {pt ?? "?"}
                </span>
                <span className="text-[9px] sm:text-[11px] font-bold text-amber-400 uppercase tracking-wider mt-0.5 opacity-90">
                  {pt != null ? "ĐIỂM" : "LỰA CHỌN"}
                </span>
              </div>

              {/* Tablet Bottom Brass Medallion Accent */}
              <div className="relative z-10 flex items-center justify-center">
                <div className="px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-500/30 text-[9px] sm:text-[10px] text-amber-300 font-bold tracking-widest flex items-center gap-1">
                  <span>★</span>
                  <span>O26</span>
                  <span>★</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export function VeDichSlantedGridGraphic({
  state,
  ownerSeatId,
  selectedPoints,
  pointOptions,
  animate = false,
  closing = false,
}: {
  state: OlympiaState;
  ownerSeatId?: number;
  selectedPoints?: number[];
  pointOptions?: number[];
  animate?: boolean;
  closing?: boolean;
}) {
  const vd = state.veDich;
  const resolvedOwnerId = ownerSeatId ?? (vd ? vd.order[vd.turnIdx] : 0);
  const owner = state.seats[resolvedOwnerId];
  const resolvedSelected =
    selectedPoints ?? (vd?.packages[resolvedOwnerId] ? vd.packages[resolvedOwnerId].map((p) => p.points) : undefined);

  const spec = resolveVeDichGridSpec(state.rulesetId, state.o22Quarter);
  if (pointOptions && pointOptions.length > 0 && spec.mode === "columns") {
    spec.values = [...pointOptions];
    spec.rows = pointOptions.length;
  }

  const isV3Arrow = state.themeMode !== "o26_classic";
  const W = 1000;
  const H = 280;
  const cThick = Math.round(200 * 0.16);
  const pad = Math.round(cThick * 1.5);
  const shell = buildArrowShell({ W, H, slantRatio: 0.3571, thick: 32, cThick: 32, pad });
  const cells = buildVeDichGrid(shell, spec);

  if (!isV3Arrow) {
    return (
      <ClassicVeDichGoldenTabletsGraphic
        state={state}
        ownerSeatId={resolvedOwnerId}
        selectedPoints={resolvedSelected}
        closing={closing}
      />
    );
  }

  const colW = W / spec.cols;
  const slope = shell.slope;
  const midY = shell.midY;
  const L = shell.startX;
  const xDiv = (k: number, y: number) => L + k * colW + slope * (midY - y);

  return (
    <div className="w-full max-w-4xl mx-auto px-2 py-1 z-20 pointer-events-auto flex flex-col items-center gap-1.5 select-none">
      {/* Contestant Header Pill */}
      <div className={`px-5 py-1 rounded-full bg-[#08203f]/95 border border-cyan-400/80 text-cyan-200 font-black text-[11px] sm:text-xs uppercase tracking-widest shadow-lg transition-opacity duration-300 ${
        closing ? "opacity-0" : "opacity-100 animate-fade-in"
      }`}>
        LỰA CHỌN GÓI CÂU HỎI — {owner?.name || `THÍ SINH ${resolvedOwnerId + 1}`}
      </div>

      {/* Main Hexagonal Grid Chamber: 100% Geometry Parity with Olympia 26 Wiki */}
      <div className="relative w-full max-w-4xl flex items-center justify-center">
        <V3ArrowShell
          shell={shell}
          animate={animate}
          closing={closing}
          bodySvg={
            <>
              <defs>
                <linearGradient id="vdGridNavyCell" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1a385c" />
                  <stop offset="45%" stopColor="#102d4f" />
                  <stop offset="100%" stopColor="#062243" />
                </linearGradient>
                <linearGradient id="vdGridRedCell" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c51442" />
                  <stop offset="50%" stopColor="#a30d36" />
                  <stop offset="100%" stopColor="#7a0624" />
                </linearGradient>
              </defs>

              {/* Grid Cells (Parallelograms and boundary trapezoids) */}
              {cells.map((cell, idx) => {
                const isSelected = isGridCellSelected(spec, cell, resolvedSelected);
                return (
                  <path
                    key={idx}
                    d={toSvgPath(cell.pts)}
                    fill={isSelected ? "url(#vdGridRedCell)" : "url(#vdGridNavyCell)"}
                    stroke="none"
                  />
                );
              })}

              {/* Center Horizontal Divider Line(s) */}
              {Array.from({ length: spec.rows - 1 }).map((_, rIdx) => {
                const y = ((rIdx + 1) * H) / spec.rows;
                return (
                  <line
                    key={`h-div-${rIdx}`}
                    x1={shell.edgeL(y)}
                    y1={y}
                    x2={shell.edgeR(y)}
                    y2={y}
                    stroke="#c5d0db"
                    strokeWidth="3.5"
                  />
                );
              })}

              {/* Slanted Column Divider Lines (Continuous straight lines from top to bottom) */}
              {Array.from({ length: spec.cols - 1 }).map((_, cIdx) => {
                const col = cIdx + 1;
                return (
                  <line
                    key={`v-div-${cIdx}`}
                    x1={xDiv(col, 0)}
                    y1={0}
                    x2={xDiv(col, H)}
                    y2={H}
                    stroke="#c5d0db"
                    strokeWidth="3.5"
                  />
                );
              })}

              {/* Outer Hexagon Chamber Stroke */}
              <path d={toSvgPath(shell.bgPts)} fill="none" stroke="#c5d0db" strokeWidth="3" />

              {/* Text Numbers at Centroids (Clean, bold white, exactly like Image 2) */}
              {cells.map((cell, idx) => {
                const fontSize = spec.rows === 1 ? 58 : 52;
                return (
                  <text
                    key={`txt-${idx}`}
                    x={cell.cx}
                    y={cell.cy + (spec.rows === 1 ? 20 : 18)}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontWeight="900"
                    fontSize={fontSize}
                    fontFamily="sans-serif"
                    style={{
                      filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.85))",
                    }}
                  >
                    {cell.ptsValue}
                  </text>
                );
              })}
            </>
          }
        />
      </div>
    </div>
  );
}
