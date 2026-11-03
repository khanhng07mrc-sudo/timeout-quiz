"use client";

import React, { useRef, useState, useEffect } from "react";
import type { OlympiaState, Seat, TimerState } from "@/lib/olympia/types";
import { parseVcnvAnswer, cleanVcnvWord } from "@/lib/olympia/engine";
import { activeSeats, seatName, SEAT_COLORS } from "./ui";

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
    <div className="absolute top-1/2 -translate-y-1/2 -left-10 -right-10 flex items-center pointer-events-none z-0">
      {/* Left turned finial cap */}
      <div
        className="w-8 h-9 shrink-0 rounded-l-full border border-amber-300/80 shadow-lg"
        style={{
          background: "linear-gradient(180deg, #78350f 0%, #fef08a 35%, #d97706 70%, #451a03 100%)",
        }}
      />
      {/* Central brass horizontal pipe */}
      <div
        className="flex-1 h-4 sm:h-5 shadow-xl"
        style={{
          background:
            "linear-gradient(180deg, #92400e 0%, #fef08a 30%, #d97706 65%, #78350f 100%)",
          boxShadow: "0 4px 15px rgba(0,0,0,0.85), inset 0 1px 2px rgba(255,255,255,0.7)",
        }}
      />
      {/* Right turned finial cap */}
      <div
        className="w-8 h-9 shrink-0 rounded-r-full border border-amber-300/80 shadow-lg"
        style={{
          background: "linear-gradient(180deg, #78350f 0%, #fef08a 35%, #d97706 70%, #451a03 100%)",
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
 * Auto font-size clamp for question text to prevent overflow in fixed box
 */
function clampQuestionFont(text: string) {
  const len = text ? text.length : 0;
  if (len <= 50) return "text-sm sm:text-xl md:text-2xl lg:text-3xl font-black";
  if (len <= 90) return "text-xs sm:text-lg md:text-xl lg:text-2xl font-black";
  if (len <= 140) return "text-xs sm:text-base md:text-lg lg:text-xl font-bold";
  return "text-[11px] sm:text-sm md:text-base lg:text-lg font-bold";
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
export function Vtv3ChalkboardQuestionFrame({
  headerBadge,
  questionText,
  mediaElement,
  timer,
  serverNow,
  timerSecondsOverride,
  children,
}: {
  headerBadge?: React.ReactNode;
  questionText?: string | null;
  mediaElement?: React.ReactNode;
  timer?: TimerState | null;
  serverNow: () => number;
  timerSecondsOverride?: number;
  children?: React.ReactNode;
}) {
  const [now, setNow] = useState(serverNow);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!timer || timer.startedAt == null) return;
    let active = true;
    const loop = () => {
      if (!active) return;
      setNow(serverNow());
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      active = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [timer?.startedAt, timer?.remainingMs, serverNow]);

  // Compute countdown metrics
  const isRunning = timer?.startedAt != null;
  let remainingSec = timerSecondsOverride ?? 0;
  let elapsedPct = 0;

  if (timer && timer.startedAt != null) {
    const total = timer.totalMs || 15000;
    const elapsed = Math.max(0, now - timer.startedAt);
    const remMs = Math.max(0, timer.remainingMs - elapsed);
    remainingSec = Math.ceil(remMs / 1000);
    elapsedPct = Math.max(0, Math.min(100, (elapsed / total) * 100));
  }

  return (
    <div className="relative w-full max-w-5xl lg:max-w-6xl mx-auto flex items-center justify-center pointer-events-auto">
      {/* ── 1. Horizontal Brass Rod (Passing behind) ── */}
      <HorizontalBrassRod />

      {/* ── 2. Chalkboard Question Banner (Fixed height 185-215px) ── */}
      <div
        className="relative w-full z-10 rounded-2xl flex flex-col justify-between overflow-hidden shadow-2xl transition-all"
        style={{
          minHeight: "clamp(100px, 18vh, 180px)",
          maxHeight: "clamp(150px, 28vh, 230px)",
          height: "auto",
          background: "linear-gradient(175deg, #101c2e 0%, #0b1320 60%, #070d16 100%)",
          border: "3.5px solid #d4af37",
          boxShadow:
            "0 12px 40px rgba(0,0,0,0.92), 0 0 20px rgba(212,175,55,0.35), inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 6px rgba(0,0,0,0.8)",
          outline: "2.5px solid #78350f",
          outlineOffset: "-6px",
        }}
      >
        {/* Subtle chalkboard SVG background inside box */}
        <Vtv3ChalkboardBackdrop className="opacity-30" />

        {/* Top-Left Glowing Red Indicator Rivet with Header Badge */}
        {headerBadge && (
          <div className="absolute top-2.5 left-3 z-20 flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full border border-white shadow-[0_0_10px_#ef4444]"
              style={{
                background: "radial-gradient(circle at 35% 30%, #f87171 0%, #dc2626 50%, #7f1d1d 100%)",
              }}
            />
            <div className="text-xs font-black text-amber-300 drop-shadow">{headerBadge}</div>
          </div>
        )}

        {/* Center: Question Prompt Text */}
        <div className="relative z-10 flex-1 px-4 sm:px-8 md:px-12 py-2 sm:py-3 flex flex-col items-center justify-center text-center">
          {questionText ? (
            <div
              className={`text-white font-black leading-normal pt-1 pb-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] max-w-4xl select-text ${clampQuestionFont(
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

        {/* Bottom: Integrated Progress Timer Bar with Glowing Red Pearl */}
        <div className="relative z-10 w-full px-4 pb-2.5 pt-0.5 flex items-center gap-3">
          {/* Digital Timer Clock Display (e.g. 09:22 or 15s) */}
          {(isRunning || remainingSec > 0) && (
            <div className="px-2.5 py-0.5 rounded-lg bg-black/75 border border-amber-500/40 font-mono font-black text-xs sm:text-sm text-amber-300 tabular-nums shrink-0 shadow-inner">
              {remainingSec}s
            </div>
          )}

          {/* Horizontal Progress Track */}
          <div className="flex-1 relative h-2.5 rounded-full bg-slate-950/80 border border-amber-600/50 overflow-visible shadow-inner flex items-center">
            {/* Progress Fill */}
            <div
              className="h-full rounded-full transition-all duration-100"
              style={{
                width: `${elapsedPct}%`,
                background:
                  remainingSec <= 5
                    ? "linear-gradient(90deg, #ef4444, #f43f5e)"
                    : "linear-gradient(90deg, #d97706, #f59e0b, #ef4444)",
                boxShadow: remainingSec <= 5 ? "0 0 12px #ef4444" : "0 0 8px #f59e0b",
              }}
            />
            {/* Glowing Red/Amber Pearl Head */}
            {isRunning && elapsedPct > 0 && elapsedPct < 100 && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow-[0_0_12px_#ef4444] pointer-events-none"
                style={{
                  left: `${elapsedPct}%`,
                  background:
                    "radial-gradient(circle at 35% 30%, #f87171 0%, #dc2626 50%, #991b1b 100%)",
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
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
}: {
  letter?: string;
  isOpened?: boolean;
  isCurrentRow?: boolean;
  isWrong?: boolean;
}) {
  return (
    <div
      className={`relative w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 ${
        isCurrentRow
          ? "ring-2 ring-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.8)] scale-105"
          : "shadow-[0_4px_10px_rgba(0,0,0,0.65)]"
      }`}
      style={{
        background: isWrong
          ? "radial-gradient(circle at 35% 30%, #b91c1c 0%, #7f1d1d 50%, #450a0a 100%)"
          : "radial-gradient(circle at 35% 30%, #93c5fd 0%, #38bdf8 25%, #0284c7 55%, #03487f 80%, #02203d 100%)",
        border: "1.5px solid rgba(224, 242, 254, 0.85)",
        boxShadow:
          "0 4px 10px rgba(0,0,0,0.7), inset 0 2px 4px rgba(255,255,255,0.7), inset 0 -2px 4px rgba(0,0,0,0.8)",
      }}
    >
      {/* Specular White Glint Spot at top-left for ultra-glossy 3D glass illusion */}
      <div className="absolute top-1 left-1.5 w-2 h-1.5 sm:w-2.5 sm:h-2 rounded-full bg-white/80 blur-[0.3px] pointer-events-none" />

      {/* Letter text when opened */}
      {isOpened && letter ? (
        <span className="font-black text-sm sm:text-lg md:text-xl uppercase tracking-wider text-white select-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
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
  const questionHint = isCenter ? v.centerQuestion?.q : curRow?.hint;

  // Keyword character count (excluding spaces, bracket notes)
  const cleanKeyword = cleanVcnvWord(v.keyword || "");
  const keywordLen = cleanKeyword.length || 13;

  // Countdown timer metrics
  const timer = v.timer;
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    if (!timer || timer.startedAt == null) return;
    let active = true;
    const loop = () => {
      if (!active) return;
      setNow(serverNow());
      requestAnimationFrame(loop);
    };
    const id = requestAnimationFrame(loop);
    return () => {
      active = false;
      cancelAnimationFrame(id);
    };
  }, [timer?.startedAt, timer?.remainingMs, serverNow]);

  let remainingSec = 15;
  let remainingMs = 15000;
  if (timer && timer.startedAt != null) {
    const elapsed = Math.max(0, now - timer.startedAt);
    remainingMs = Math.max(0, timer.remainingMs - elapsed);
    remainingSec = Math.ceil(remainingMs / 1000);
  }
  const progressPercent = timer && timer.startedAt != null ? Math.max(0, Math.min(100, (remainingMs / 15000) * 100)) : 100;

  // Piece mapping in VTV3 layout:
  // Top-Left: Piece 0 (Row 1, label "1")
  // Top-Right: Piece 1 (Row 2, label "2")
  // Bottom-Left: Piece 3 (Row 4, label "4")
  // Bottom-Right: Piece 2 (Row 3, label "3")
  const QUAD_PIECES = [
    { index: 0, label: "1" },
    { index: 1, label: "2" },
    { index: 3, label: "4" },
    { index: 2, label: "3" },
  ];

  const hasBell = v.bells && v.bells.length > 0;
  const fastestBell = hasBell ? v.bells[0] : null;

  return (
    <div className="absolute inset-0 z-20 pointer-events-auto flex flex-col p-3 sm:p-5 md:p-6 overflow-hidden">
      {/* ── Solid Royal Blue Broadcast Masks (Cutout for Bottom-Right 3D Studio) ── */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-[52%] bg-[#061e47] border-b border-cyan-500/20" />
        <div className="absolute bottom-0 left-0 w-[50.5%] h-[48%] bg-[#061e47] border-r border-cyan-500/20" />
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: "radial-gradient(#38bdf8 1.5px, transparent 1.5px)",
            backgroundSize: "24px 24px",
            maskImage: "linear-gradient(to right, black 0%, black 40%, transparent 70%)",
            WebkitMaskImage: "linear-gradient(to right, black 0%, black 40%, transparent 70%)",
          }}
        />
      </div>

      {/* ── 4-QUADRANT GRID LAYOUT (2 Columns x 2 Rows) ── */}
      <div className="grid grid-cols-2 grid-rows-2 gap-3 sm:gap-4 md:gap-5 w-full h-full max-w-[98vw] max-h-[96vh] mx-auto">

        {/* ═══════════════════════════════════════════════════════════════════
            QUADRANT 1: TOP-LEFT (MYSTERY PUZZLE GRID: 1, 2, 4, 3 + CENTER 5)
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-cyan-400/60 shadow-[0_0_25px_rgba(6,182,212,0.3)] bg-[#071739] flex items-center justify-center">
          {/* Mystery image behind */}
          {v.mysteryImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={v.mysteryImage}
              alt="Chướng ngại vật"
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          {/* 4 Corner Quadrants (1, 2, 4, 3) */}
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
            {QUAD_PIECES.map((piece) => {
              const isRevealed = v.piecesRevealed[piece.index];
              return (
                <div
                  key={piece.index}
                  className={`relative flex items-center justify-center border border-cyan-500/30 transition-opacity duration-700 ${
                    isRevealed ? "opacity-0 pointer-events-none" : "bg-[#0b1b3d] opacity-100"
                  }`}
                >
                  <span className="text-4xl sm:text-6xl md:text-7xl font-black text-white select-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]">
                    {piece.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Center Tile: Bold Number 5 with Glow when Selected */}
          <div
            className={`absolute w-[44%] h-[40%] rounded-xl border-2 flex items-center justify-center transition-all duration-700 z-10 ${
              v.piecesRevealed[4]
                ? "opacity-0 pointer-events-none"
                : isCenter
                ? "bg-gradient-to-br from-[#0c2866] to-[#04153a] border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.85)] animate-pulse opacity-100 ring-2 ring-amber-300/70"
                : "bg-[#071739] border-cyan-400/80 shadow-[0_0_20px_rgba(6,182,212,0.5)] opacity-100"
            }`}
          >
            <span
              className={`text-4xl sm:text-6xl md:text-7xl font-black select-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] ${
                isCenter ? "text-amber-300" : "text-white"
              }`}
            >
              5
            </span>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            QUADRANT 2: TOP-RIGHT (ROWS BOARD WITH 3D GLOSSY BLUE DOMES)
           ═══════════════════════════════════════════════════════════════════ */}
        <div
          className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-cyan-400/60 shadow-[0_0_25px_rgba(6,182,212,0.3)] bg-gradient-to-br from-[#071a3d] via-[#05132d] to-[#030c1d] flex flex-col justify-between p-3 sm:p-4 md:p-5"
          style={{
            clipPath: "polygon(0 0, calc(100% - 24px) 0, 100% 24px, 100% 100%, 0 100%)",
          }}
        >
          {/* Top Chamfer Accent Border */}
          <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none border-t-2 border-r-2 border-cyan-300" />

          {/* Header Badge: CHƯỚNG NGẠI VẬT CÓ X CHỮ CÁI */}
          <div className="flex items-center justify-center w-full pt-1 pb-2">
            <div className="px-5 sm:px-8 py-1.5 sm:py-2 rounded-full border-2 border-cyan-400/80 bg-gradient-to-r from-cyan-950 via-[#0a2e66] to-cyan-950 shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center justify-center">
              <span className="font-black text-xs sm:text-sm md:text-base uppercase tracking-wider text-cyan-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                CHƯỚNG NGẠI VẬT CÓ {keywordLen} CHỮ CÁI
              </span>
            </div>
          </div>

          {/* 4 Rows of 3D Glossy Blue Dome Buttons */}
          <div className="flex-1 flex flex-col justify-around py-1 w-full max-w-full">
            {v.rows.map((row, rIdx) => {
              const isCurrent = curIdx === rIdx;
              const cleanAns = cleanVcnvWord(row.answer || "");
              const letterCount = row.letterCount || cleanAns.length || 7;
              const letters = cleanAns.split("");

              return (
                <div
                  key={rIdx}
                  className={`flex items-center justify-between gap-2 px-2 sm:px-4 py-1.5 rounded-xl transition-all duration-300 ${
                    isCurrent
                      ? "bg-cyan-500/20 border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.5)] scale-[1.01]"
                      : "border border-transparent"
                  }`}
                >
                  {/* Dome Buttons */}
                  <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
                    {Array.from({ length: letterCount }).map((_, cIdx) => (
                      <GlossyBlueDomeButton
                        key={cIdx}
                        letter={letters[cIdx]}
                        isOpened={row.opened}
                        isCurrentRow={isCurrent}
                        isWrong={row.wrong}
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
            })}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            QUADRANT 3: BOTTOM-LEFT (QUESTION FRAME TOP-LEFT + BOTTOM PROGRESS BAR)
           ═══════════════════════════════════════════════════════════════════ */}
        <div
          className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-cyan-400/80 shadow-[0_0_30px_rgba(6,182,212,0.35)] bg-gradient-to-br from-[#061838] via-[#041026] to-[#020914] flex flex-col justify-between p-4 sm:p-5 md:p-6"
          style={{
            clipPath: "polygon(0 0, calc(100% - 24px) 0, 100% 24px, 100% 100%, 24px 100%, 0 calc(100% - 24px))",
          }}
        >
          {/* Chamfer Accents */}
          <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none border-t-2 border-r-2 border-cyan-300" />
          <div className="absolute bottom-0 left-0 w-8 h-8 pointer-events-none border-b-2 border-l-2 border-cyan-300" />

          {/* Question Text Body: Aligned Top-Left without clutter */}
          <div className="flex-1 flex flex-col items-start justify-start py-2 px-1 text-left overflow-y-auto">
            <p className="font-extrabold text-base sm:text-xl md:text-2xl lg:text-3xl text-white leading-relaxed select-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              {questionHint || "Đang chờ chọn hàng ngang…"}
            </p>
          </div>

          {/* Integrated Sleek Progress Bar across bottom */}
          <div className="w-full flex flex-col gap-1.5 pt-2">
            <div className="w-full h-2.5 rounded-full bg-slate-950/80 border border-cyan-500/30 overflow-hidden p-0.5 shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-100 ${
                  remainingSec <= 5
                    ? "bg-gradient-to-r from-red-600 to-amber-500 shadow-[0_0_12px_#ef4444]"
                    : "bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 shadow-[0_0_10px_#38bdf8]"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-400 uppercase">
                {timer?.startedAt != null ? "15s" : ""}
              </span>
              <span
                className={`text-xs sm:text-sm font-mono font-black tabular-nums ${
                  remainingSec <= 5 ? "text-red-400 animate-pulse" : "text-cyan-300"
                }`}
              >
                {remainingSec < 10 ? `0${remainingSec}` : remainingSec}s
              </span>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            QUADRANT 4: BOTTOM-RIGHT (3D STUDIO CAMERA WINDOW + BELL NOTIFIER)
           ═══════════════════════════════════════════════════════════════════ */}
        <div
          className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-cyan-400/80 shadow-[0_0_30px_rgba(6,182,212,0.35)] bg-transparent flex flex-col justify-between"
          style={{
            clipPath: "polygon(24px 0, 100% 0, 100% calc(100% - 24px), calc(100% - 24px) 100%, 0 100%, 0 24px)",
          }}
        >
          {/* Inner Vignette / Broadcast Camera Overlay */}
          <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_25px_rgba(0,0,0,0.7)] border border-white/10 rounded-2xl" />

          {/* Bell Notification Banner when someone rings bell */}
          {hasBell && (
            <div className="relative z-20 mx-3 mt-3 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600/95 via-yellow-500/95 to-amber-600/95 border-2 border-yellow-200 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(234,179,8,0.8)] animate-bounce">
              <span className="text-base sm:text-lg">🔔</span>
              <span className="uppercase tracking-wide truncate">
                {(fastestBell ? (state.seats[fastestBell.seat]?.name || `Thí sinh ${fastestBell.seat + 1}`) : "Thí sinh")} BẤM CHUÔNG XIN TRẢ LỜI CNV!
              </span>
            </div>
          )}

          {/* Bottom Candidate Quick Score Strip inside Studio Window */}
          <div className="mt-auto relative z-10 flex items-center justify-around bg-gradient-to-t from-black/90 via-black/60 to-transparent p-2 border-t border-cyan-500/20">
            {activeSeats(state).map((seat) => (
              <div key={seat.id} className="flex flex-col items-center">
                <span className="text-[9px] sm:text-[10px] text-slate-300 font-bold uppercase truncate max-w-[70px]">
                  {seat.name}
                </span>
                <span className="text-xs sm:text-sm font-black text-amber-300 drop-shadow">
                  {seat.score}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

export function VcnvAnswerRevealGraphic({ state }: { state: OlympiaState }) {
  const v = state.vcnv!;
  const seats = activeSeats(state);

  return (
    <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 z-20 pointer-events-auto">
      {/* Full chalkboard backdrop */}
      <Vtv3ChalkboardBackdrop />

      {/* ── Central Vertical Brass Column ── */}
      <CentralVerticalBrassRail />

      {/* ── 4 Staggered Horizontal Capsule Plaques (2 Left, 2 Right) ── */}
      <div className="relative z-10 w-full max-w-5xl h-[70vh] flex flex-col justify-between py-4 scale-[0.85] sm:scale-100 origin-center">
        {seats.map((seat, idx) => {
          const isRight = idx % 2 === 0; // 0 & 2 on Right, 1 & 3 on Left
          const answerText = v.answers[seat.id]?.text || "";

          return (
            <div
              key={seat.id}
              className="relative flex items-center w-full animate-fade-in my-1.5"
            >
              {/* Connection Rivet pinned directly on central vertical rail */}
              <div className="absolute left-1/2 -translate-x-1/2 z-30">
                <RedConnectionRivet />
              </div>

              {/* Capsule Plaque extending left or right from central rod */}
              <div
                className={`w-1/2 flex items-center ${
                  isRight ? "ml-auto pl-3 justify-start" : "mr-auto pr-3 justify-end"
                }`}
              >
                <div className="relative flex flex-col items-center">
                  {/* Contestant Name Badge mounted on top edge */}
                  <div className="absolute -top-3.5 px-4 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-slate-900 font-black text-xs sm:text-sm tracking-wider uppercase shadow-md z-10">
                    {seat.name}
                  </div>

                  {/* Main Capsule Body */}
                  <div
                    className="h-16 sm:h-20 min-w-[260px] sm:min-w-[360px] max-w-[420px] px-8 rounded-full flex items-center justify-center shadow-2xl"
                    style={{
                      background:
                        "linear-gradient(180deg, #1e293b 0%, #0f172a 50%, #060a12 100%)",
                      border: "2.5px solid rgba(203, 213, 225, 0.85)",
                      outline: "2px solid rgba(100, 116, 139, 0.6)",
                      outlineOffset: "-5px",
                      boxShadow:
                        "0 10px 30px rgba(0,0,0,0.85), inset 0 2px 4px rgba(255,255,255,0.3)",
                    }}
                  >
                    <span className="font-black text-xl sm:text-3xl text-white tracking-widest uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] truncate max-w-full">
                      {answerText}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * COMPONENT 4: TĂNG TỐC QUESTION PICTURE FRAME (Image 4 & User Attachment)
 * - Mounted on horizontal brass rod.
 * - Top attached header plaque: Dark bronze/slate with question prompt.
 * - Ornate gold picture frame with heavy gold metallic border.
 * - Inside: 2x3 grid of puzzle pieces (A, B, C, D, E, F) or clue media.
 * - Bottom left: digital clock box.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function TangTocQuestionGraphic({
  state,
  serverNow,
}: {
  state: OlympiaState;
  serverNow: () => number;
}) {
  const tt = state.tangToc!;
  const q = tt.questions[tt.qIdx];
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const isVideo =
    q?.type === "video" ||
    (Boolean(q?.media) && /\.(mp4|webm|mov|m4v|ogv|mpeg)$/i.test(q?.media || ""));
  const isTiming = tt.timer?.startedAt != null;

  useEffect(() => {
    if (!videoRef.current || !isVideo) return;
    if (isTiming) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
      if (tt.phase === "idle" || tt.phase === "question") {
        videoRef.current.currentTime = 0;
      }
    }
  }, [isTiming, isVideo, tt.phase]);

  return (
    <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-8 z-20 pointer-events-auto">
      {/* Chalkboard backdrop */}
      <Vtv3ChalkboardBackdrop />

      {/* Main framed container */}
      <div className="relative w-full max-w-4xl z-10 flex flex-col items-center animate-fade-in">
        {/* ── 1. Horizontal Brass Rod (Passing behind) ── */}
        <HorizontalBrassRod />

        {/* ── 2. Top Header Plaque (Attached directly above frame) ── */}
        <div
          className="relative z-10 px-8 py-2.5 rounded-t-2xl border-2 border-amber-500/80 shadow-lg max-w-2xl text-center"
          style={{
            background: "linear-gradient(180deg, #2a1815 0%, #170d0b 60%, #0a0504 100%)",
            boxShadow: "0 6px 18px rgba(0,0,0,0.85), inset 0 1px 2px rgba(255,255,255,0.25)",
          }}
        >
          <div className="font-black text-sm sm:text-base md:text-lg text-white leading-snug drop-shadow">
            {q?.q || "Sắp xếp các miếng ghép sau để có được bức hình hoàn chỉnh."}
          </div>
        </div>

        {/* ── 3. Majestic Ornate Gold Picture Frame ── */}
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
          {q?.clueImages && q.clueImages.length > 0 ? (
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
            <video
              ref={videoRef}
              src={q.media}
              playsInline
              preload="auto"
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

        {/* Digital Clock Box at Bottom-Left */}
        {tt.timer?.startedAt != null && (
          <div className="absolute -bottom-4 left-4 z-20 px-3 py-1 rounded-lg bg-black/80 border border-amber-500/50 font-mono font-black text-sm text-amber-300 shadow-md">
            {`${Math.max(0, Math.ceil((tt.timer.remainingMs - (serverNow() - tt.timer.startedAt)) / 1000))}s`}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * COMPONENT 5: TĂNG TỐC RANKED ANSWERS REVEAL (Image 5)
 * - Central vertical brass column.
 * - 4 vertically stacked capsule plaques (ranked fastest to slowest).
 * - White oval pill showing response seconds in bold bronze typography.
 * - Points badges (+40, +30, +20, +10) with glowing borders.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function TangTocRankedAnswersGraphic({ state }: { state: OlympiaState }) {
  const tt = state.tangToc!;

  return (
    <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 z-20 pointer-events-auto">
      {/* Chalkboard backdrop */}
      <Vtv3ChalkboardBackdrop />

      {/* Central Vertical Brass Rail */}
      <CentralVerticalBrassRail />

      {/* Correct answer banner at top - Only displayed when MC clicks "Hiện Đáp Án Đúng" */}
      {tt.correctAnswer && Boolean(tt.revealedCorrectAnswer) && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 px-8 py-2.5 rounded-2xl bg-emerald-950/95 border-2 border-emerald-400 text-emerald-300 font-black text-lg sm:text-2xl shadow-[0_0_30px_rgba(16,185,129,0.6)] animate-fade-in">
          ✔ ĐÁP ÁN: {tt.correctAnswer}
        </div>
      )}

      {/* 4 Vertically Stacked Capsule Plaques */}
      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center gap-4 py-8 scale-[0.88] sm:scale-100 origin-center">
        {tt.ranking.map((item) => {
          const seat = state.seats[item.seat];
          // User requirement: If no answer entered, system shows 0.00 (numeric only, no 's' unit)
          const sec = item.noAnswer ? "0.00" : (item.ms / 1000).toFixed(2);
          const answerText = item.noAnswer ? "" : item.answer;

          return (
            <div key={item.seat} className="relative flex items-center w-full max-w-3xl animate-fade-in my-1">
              {/* Central connection rivet pinned directly on vertical rail */}
              <div className="absolute left-1/2 -translate-x-1/2 z-30">
                <RedConnectionRivet />
              </div>

              {/* Main Capsule Plaque */}
              <div
                className="w-full rounded-full h-16 sm:h-20 px-6 sm:px-10 flex items-center justify-between shadow-2xl relative"
                style={{
                  background: item.wrong
                    ? "linear-gradient(180deg, #3b1116 0%, #1f080b 60%, #0d0305 100%)"
                    : "linear-gradient(180deg, #1e293b 0%, #0f172a 60%, #060a12 100%)",
                  border: item.wrong
                    ? "2.5px solid #ef4444"
                    : "2.5px solid rgba(203, 213, 225, 0.85)",
                  boxShadow: item.wrong
                    ? "0 10px 30px rgba(239,68,68,0.4)"
                    : "0 10px 30px rgba(0,0,0,0.85), inset 0 2px 4px rgba(255,255,255,0.3)",
                }}
              >
                {/* Contestant Name */}
                <div className="flex items-center gap-2 z-10 w-48">
                  <span className="font-bold text-sm sm:text-lg text-slate-100 truncate">
                    {seat?.name || `Thí sinh ${item.seat + 1}`}
                  </span>
                </div>

                {/* Uppercase Answer (Empty string if no answer, no dash) */}
                <div className="flex-1 text-center z-10 px-4">
                  <span className="font-black text-xl sm:text-3xl text-white tracking-widest uppercase drop-shadow">
                    {answerText}
                  </span>
                </div>

                {/* Response Time Pill (No point badges +40/+30, purely numeric) */}
                <div className="flex items-center z-10">
                  {/* White Oval Time Pill with Bronze Numbers */}
                  <div className="px-4 py-1.5 rounded-full bg-white border border-slate-300 shadow-md font-mono font-black text-sm sm:text-base text-amber-700 tabular-nums">
                    {sec}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
