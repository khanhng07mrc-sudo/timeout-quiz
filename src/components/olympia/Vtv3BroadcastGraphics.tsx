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
    if (!timer || timer.startedAt == null) {
      lastStartRef.current = null;
      lastPctRef.current = 0;
      if (fillRef.current) fillRef.current.style.width = "0%";
      if (pearlRef.current) pearlRef.current.style.display = "none";
      return;
    }

    if (lastStartRef.current !== timer.startedAt) {
      lastStartRef.current = timer.startedAt;
      lastPctRef.current = 0;
    }

    let rafId: number;
    let active = true;

    const tick = () => {
      if (!active) return;
      const total = timer.totalMs || 15000;
      const elapsed = Math.max(0, serverNow() - (timer.startedAt ?? 0));
      const remMs = Math.max(0, timer.remainingMs - elapsed);
      const remSec = Math.ceil(remMs / 1000);
      const rawPct = Math.max(0, Math.min(100, (elapsed / total) * 100));
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

export function Vtv3ChalkboardQuestionFrame({
  headerBadge,
  questionText,
  mediaElement,
  timer,
  serverNow,
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
  return (
    <div className="relative w-full max-w-5xl lg:max-w-6xl mx-auto flex items-center justify-center pointer-events-auto">
      {/* ── 1. Horizontal Brass Rod (Passing behind) ── */}
      <HorizontalBrassRod />

      {/* ── 2. Chalkboard Question Banner (Shape Layer) ── */}
      <div
        className="relative w-full z-10 rounded-2xl flex flex-col justify-between overflow-visible shadow-2xl"
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
            <div className="text-xs font-black text-amber-300 drop-shadow">{headerBadge}</div>
          </div>
        )}

        {/* Center: Question Prompt Text (Separated cleanly from shape) */}
        <div className="relative z-10 flex-1 px-4 sm:px-8 md:px-12 py-3 sm:py-4 flex flex-col items-center justify-center text-center">
          {questionText ? (
            <div
              className={`text-white font-black leading-normal pt-1 pb-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] max-w-4xl select-text animate-fade-in ${clampQuestionFont(
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

        {/* Bottom: Integrated Progress Timer Bar & Glowing Red Pearl touching bottom border (No padding, no numeric clock) */}
        <Vtv3BottomEdgeTimerBar timer={timer} serverNow={serverNow} />
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
    if (!timer || timer.startedAt == null) {
      if (fillRef.current) fillRef.current.style.width = isV3Arrow ? "100%" : "0%";
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
          fillRef.current.style.width = `${remPct}%`;
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

  const QUAD_PIECES = [
    { index: 0, label: "1" },
    { index: 1, label: "2" },
    { index: 3, label: "4" },
    { index: 2, label: "3" },
  ];

  const hasBell = v.bells && v.bells.length > 0;

  return (
    <div className="absolute inset-0 z-20 pointer-events-auto flex flex-col p-3 sm:p-5 md:p-6 overflow-hidden bg-[#061e47]">
      {/* ── Background Subtle Broadcast Dot Pattern ── */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: "radial-gradient(#38bdf8 1.5px, transparent 1.5px)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      {/* ── 4-QUADRANT GRID LAYOUT (2 Columns x 2 Rows) ── */}
      <div className="relative z-10 grid grid-cols-2 grid-rows-2 gap-3 sm:gap-4 md:gap-5 w-full h-full">

        {/* ═══════════════════════════════════════════════════════════════════
            QUADRANT 1: TOP-LEFT (MYSTERY PUZZLE GRID: 1, 2, 4, 3 + CENTER 5)
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-cyan-400/60 shadow-[0_0_25px_rgba(6,182,212,0.3)] bg-[#071739] flex items-center justify-center">
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
            QUADRANT 2: TOP-RIGHT (ROWS BOARD: V3 CHEVRON ARROWS OR O26 DOMES)
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-cyan-400/60 shadow-[0_0_25px_rgba(6,182,212,0.3)] bg-gradient-to-br from-[#071a3d] via-[#05132d] to-[#030c1d] flex flex-col justify-between p-3 sm:p-4 md:p-5">
          {/* Header Badge: CHƯỚNG NGẠI VẬT CÓ X CHỮ CÁI */}
          <div className="flex items-center justify-center w-full pt-1 pb-2">
            <div className="px-5 sm:px-8 py-1.5 sm:py-2 rounded-full border-2 border-cyan-400/80 bg-gradient-to-r from-cyan-950 via-[#0a2e66] to-cyan-950 shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center justify-center">
              <span className="font-black text-xs sm:text-sm md:text-base uppercase tracking-wider text-cyan-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                CHƯỚNG NGẠI VẬT CÓ {keywordLen} CHỮ CÁI
              </span>
            </div>
          </div>

          {/* 4 Rows */}
          <div className="flex-1 flex flex-col justify-around py-1 w-full max-w-full">
            {v.rows.map((row, rIdx) => {
              const isCurrent = curIdx === rIdx;
              const cleanAns = cleanVcnvWord(row.answer || "");
              const letterCount = row.letterCount || cleanAns.length || 1;
              const letters = cleanAns.split("");

              if (isV3Arrow) {
                return (
                  <div
                    key={rIdx}
                    className={`relative flex items-center justify-between gap-2 pl-3 pr-5 py-1.5 transition-all duration-300 ${
                      isCurrent
                        ? "bg-gradient-to-r from-cyan-900/80 via-[#0d2c54] to-cyan-500/30 border-l-4 border-cyan-300 shadow-[0_0_20px_rgba(46,230,255,0.45)]"
                        : "bg-[#08203f]/80 border-l-2 border-cyan-700/40"
                    }`}
                    style={{
                      clipPath: "polygon(0 0, calc(100% - 18px) 0, 100% 50%, calc(100% - 18px) 100%, 0 100%)",
                    }}
                  >
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
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] font-mono font-bold text-cyan-300/80 hidden sm:inline">
                        ({letterCount})
                      </span>
                      <Vtv3RowNumberBadge number={rIdx + 1} isActive={isCurrent} isOpened={row.opened} />
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={rIdx}
                  className={`flex items-center justify-between gap-2 px-2 sm:px-4 py-1.5 rounded-xl transition-all duration-300 ${
                    isCurrent
                      ? "bg-cyan-500/20 border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.5)] scale-[1.01]"
                      : "border border-transparent"
                  }`}
                >
                  {/* Dome Buttons with exact letterCount */}
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
            QUADRANT 3: BOTTOM-LEFT (QUESTION FRAME + BOTTOM PROGRESS BAR + CNV BELL PILLS)
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="relative w-full h-full rounded-2xl overflow-visible border-2 border-cyan-400/80 shadow-[0_0_30px_rgba(6,182,212,0.35)] bg-gradient-to-br from-[#061838] via-[#041026] to-[#020914] flex flex-col justify-between p-4 sm:p-5 pb-0">
          {/* Question Text Body / Selecting Announcement */}
          <div className="flex-1 flex flex-col items-start justify-start py-1 px-1 text-left overflow-hidden">
            {v.phase === "selecting" ? (
              <div className="w-full flex flex-col items-center justify-center h-full text-center gap-2">
                <div className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 text-xs sm:text-sm font-bold uppercase tracking-wider animate-pulse">
                  Đang chọn hàng ngang
                </div>
                <div className="text-xl sm:text-2xl md:text-3xl font-black text-amber-300 drop-shadow-[0_2px_8px_rgba(245,158,11,0.5)]">
                  {isCenter
                    ? "Ô TRUNG TÂM"
                    : `HÀNG NGANG SỐ ${curIdx + 1} (${curRow?.letterCount || cleanVcnvWord(curRow?.answer || "").length} CHỮ CÁI)`}
                </div>
                <div className="text-xs sm:text-sm text-slate-300 font-medium">
                  Chờ MC nhấn &quot;Mở Câu Hỏi&quot; để hiển thị nội dung...
                </div>
              </div>
            ) : (
              <p
                className={`font-extrabold text-white leading-relaxed select-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${
                  (questionHint || "").length > 180
                    ? "text-xs sm:text-sm md:text-base leading-snug"
                    : (questionHint || "").length > 120
                    ? "text-sm sm:text-base md:text-lg leading-normal"
                    : (questionHint || "").length > 70
                    ? "text-base sm:text-lg md:text-xl leading-relaxed"
                    : "text-lg sm:text-xl md:text-2xl lg:text-3xl leading-relaxed"
                }`}
              >
                {questionHint || "Đang chờ mở câu hỏi…"}
              </p>
            )}
          </div>

          {/* CNV Bell Red Shapes (Bottom-Left Only) */}
          {hasBell && (
            <div className="w-full flex flex-col gap-1.5 pt-1 pb-2">
              <div className="flex items-center gap-1.5 flex-wrap min-h-[28px]">
                {v.bells.map((b, bIdx) => {
                  const s = state.seats[b.seat];
                  return (
                    <div
                      key={`${b.seat}-${bIdx}`}
                      className="bg-gradient-to-r from-red-600 to-rose-600 rounded-lg px-3 py-1 text-white font-black text-xs sm:text-sm shadow-[0_0_15px_rgba(239,68,68,0.7)] border border-red-300 flex items-center gap-1.5 animate-fade-in"
                    >
                      <span className="px-1.5 py-0.2 rounded bg-white text-red-700 font-black text-[10px]">
                        #{bIdx + 1}
                      </span>
                      <span>🔔 {s?.name || `Thí sinh ${b.seat + 1}`}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bottom Edge Timer Bar (Flush against bottom border for O26, or sleek bar for V3) */}
          <div className="w-full pb-0 m-0">
            <div className="w-full relative h-2 rounded-full bg-slate-950/90 border border-cyan-500/40 overflow-visible shadow-inner flex items-center">
              <div
                ref={fillRef}
                className="h-full rounded-full will-change-[width]"
                style={{
                  width: isV3Arrow ? "100%" : "0%",
                  background: isV3Arrow
                    ? "linear-gradient(90deg, #1fd1ff, #2ee6ff)"
                    : "linear-gradient(90deg, #d97706, #f59e0b, #ef4444)",
                }}
              />
              {!isV3Arrow && (
                <div
                  ref={pearlRef}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow-[0_0_12px_#ef4444] pointer-events-none will-change-[left] z-30"
                  style={{
                    display: "none",
                    left: "0%",
                    background: "radial-gradient(circle at 35% 30%, #f87171 0%, #dc2626 50%, #991b1b 100%)",
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            QUADRANT 4: BOTTOM-RIGHT (3D STUDIO CAMERA WINDOW SLOT)
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="relative w-full h-full rounded-2xl overflow-hidden pointer-events-none" />

      </div>
    </div>
  );
}

export function VcnvAnswerRevealGraphic({ state }: { state: OlympiaState }) {
  const v = state.vcnv!;
  const seats = activeSeats(state);
  const isV3Arrow = state.themeMode !== "o26_classic";

  if (isV3Arrow) {
    return (
      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 z-20 pointer-events-auto bg-[#06152d]/95 backdrop-blur-md">
        <div className="relative z-10 w-full max-w-4xl flex flex-col items-center gap-4 py-6">
          <div className="px-6 py-1.5 rounded-full bg-cyan-500/20 border border-cyan-400 text-cyan-200 font-black text-xs sm:text-sm uppercase tracking-widest">
            ĐÁP ÁN HÀNG NGANG CỦA THÍ SINH
          </div>
          {seats.map((seat) => {
            const answerText = v.answers[seat.id]?.text || "";
            return (
              <div
                key={seat.id}
                className="relative w-full max-w-3xl h-16 sm:h-20 flex items-center shadow-[0_10px_30px_rgba(0,0,0,0.8)] animate-fade-in"
                style={{
                  background: "linear-gradient(90deg, #08203f 0%, #0d2c54 70%, #15457a 100%)",
                  borderLeft: "5px solid #2ee6ff",
                  clipPath: "polygon(0 0, calc(100% - 28px) 0, 100% 50%, calc(100% - 28px) 100%, 0 100%)",
                }}
              >
                {/* Left Contestant Name Block */}
                <div
                  className="h-full w-44 sm:w-56 px-4 flex items-center justify-center shrink-0"
                  style={{
                    background: "linear-gradient(90deg, #1fd1ff 0%, #0ea5e9 100%)",
                    clipPath: "polygon(0 0, calc(100% - 16px) 0, 100% 50%, calc(100% - 16px) 100%, 0 100%)",
                  }}
                >
                  <span className="font-black text-sm sm:text-base text-[#08203f] uppercase tracking-wider truncate">
                    {seat.name}
                  </span>
                </div>

                {/* Center Answer Text (Fixed & Unobstructed) */}
                <div className="flex-1 min-w-0 px-6 text-center overflow-hidden">
                  <span className="font-black text-xl sm:text-3xl text-white tracking-widest uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] truncate block">
                    {answerText}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 z-20 pointer-events-auto">
      {/* Full chalkboard backdrop */}
      <Vtv3ChalkboardBackdrop />

      {/* ── Central Vertical Brass Column ── */}
      <CentralVerticalBrassRail />

      {/* ── 4 Staggered Horizontal Capsule Plaques (Fixed Dimensions, No Overlapping Badges) ── */}
      <div className="relative z-10 w-full max-w-5xl flex flex-col justify-center gap-5 py-6 scale-[0.88] sm:scale-100 origin-center">
        {seats.map((seat, idx) => {
          const isRight = idx % 2 === 0; // 0 & 2 on Right, 1 & 3 on Left
          const answerText = v.answers[seat.id]?.text || "";

          return (
            <div
              key={seat.id}
              className="relative flex items-center w-full h-[68px] sm:h-[76px] animate-fade-in"
            >
              {/* Connection Rivet pinned directly on central vertical rail */}
              <div className="absolute left-1/2 -translate-x-1/2 z-30">
                <RedConnectionRivet />
              </div>

              {/* Capsule Plaque extending left or right from central rod with FIXED width/height */}
              <div
                className={`w-1/2 flex items-center ${
                  isRight ? "ml-auto pl-5 justify-start" : "mr-auto pr-5 justify-end"
                }`}
              >
                <div
                  className="w-[360px] sm:w-[430px] h-[64px] sm:h-[72px] px-4 sm:px-6 rounded-full flex items-center justify-between gap-3 shadow-2xl overflow-hidden shrink-0"
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
                  {/* Integrated Contestant Name Pill inside Left of Capsule (Never overlaps row above) */}
                  <div className="px-3 py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-900 font-black text-xs sm:text-sm tracking-wide uppercase shadow shrink-0 max-w-[140px] truncate">
                    {seat.name}
                  </div>

                  {/* Center/Right Answer Text */}
                  <div className="flex-1 min-w-0 text-center overflow-hidden">
                    <span className="font-black text-lg sm:text-2xl text-white tracking-widest uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] truncate block">
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
export function TangTocRankedAnswersGraphic({ state }: { state: OlympiaState }) {
  const tt = state.tangToc!;
  const isV3Arrow = state.themeMode !== "o26_classic";

  if (isV3Arrow) {
    return (
      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 z-20 pointer-events-auto bg-[#06152d]/95 backdrop-blur-md">
        {tt.correctAnswer && Boolean(tt.revealedCorrectAnswer) && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 px-8 py-2.5 rounded-2xl bg-emerald-950/95 border-2 border-emerald-400 text-emerald-300 font-black text-lg sm:text-2xl shadow-[0_0_30px_rgba(16,185,129,0.6)] animate-fade-in">
            ✔ ĐÁP ÁN: {tt.correctAnswer}
          </div>
        )}

        <div className="relative z-10 w-full max-w-4xl flex flex-col items-center gap-4 py-8 scale-[0.9] sm:scale-100 origin-center">
          {tt.ranking.map((item, idx) => {
            const seat = state.seats[item.seat];
            const sec = item.noAnswer ? "0.00" : (item.ms / 1000).toFixed(2);
            const answerText = item.noAnswer ? "" : item.answer;
            const awardedPts = tt.phase === "graded" && item.points ? item.points : 0;

            return (
              <div
                key={item.seat}
                className="relative flex items-center w-full max-w-3xl h-16 sm:h-20 shadow-[0_12px_35px_rgba(0,0,0,0.85)] animate-fade-in"
                style={{
                  background: item.wrong
                    ? "linear-gradient(90deg, #3b1116 0%, #5c1922 70%, #7f1d1d 100%)"
                    : "linear-gradient(90deg, #08203f 0%, #0d2c54 70%, #15457a 100%)",
                  borderLeft: item.wrong ? "5px solid #ef4444" : "5px solid #2ee6ff",
                  clipPath: "polygon(0 0, calc(100% - 28px) 0, 100% 50%, calc(100% - 28px) 100%, 0 100%)",
                }}
              >
                {/* Left Contestant Name Block */}
                <div
                  className="h-full w-44 sm:w-56 px-4 flex items-center gap-2 shrink-0"
                  style={{
                    background: item.wrong
                      ? "linear-gradient(90deg, #ef4444 0%, #b91c1c 100%)"
                      : "linear-gradient(90deg, #1fd1ff 0%, #0ea5e9 100%)",
                    clipPath: "polygon(0 0, calc(100% - 16px) 0, 100% 50%, calc(100% - 16px) 100%, 0 100%)",
                  }}
                >
                  <span className="px-1.5 py-0.5 rounded bg-black/25 text-white font-black text-xs">
                    #{idx + 1}
                  </span>
                  <span className="font-black text-sm sm:text-base text-[#051329] uppercase tracking-wider truncate">
                    {seat?.name || `Thí sinh ${item.seat + 1}`}
                  </span>
                </div>

                {/* Center Answer Text (100% Unobstructed) */}
                <div className="flex-1 min-w-0 px-4 text-center overflow-hidden">
                  <span className="font-black text-xl sm:text-3xl text-white tracking-widest uppercase drop-shadow truncate block">
                    {answerText}
                  </span>
                </div>

                {/* Right Chevron Tip: Response Time & Points */}
                <div className="flex items-center gap-2 pr-8 pl-3 shrink-0">
                  {awardedPts > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs sm:text-sm shadow">
                      +{awardedPts}
                    </span>
                  )}
                  <div className="px-4 py-1.5 rounded-lg bg-[#051329]/90 border border-cyan-400/60 font-mono font-black text-sm sm:text-lg text-[#2ee6ff] tabular-nums shadow-inner">
                    {sec}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

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

      {/* 4 Vertically Stacked Capsule Plaques (Fixed Dimensions, Rivet moved off center text!) */}
      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center gap-4 py-8 scale-[0.88] sm:scale-100 origin-center">
        {tt.ranking.map((item) => {
          const seat = state.seats[item.seat];
          const sec = item.noAnswer ? "0.00" : (item.ms / 1000).toFixed(2);
          const answerText = item.noAnswer ? "" : item.answer;
          const awardedPts = tt.phase === "graded" && item.points ? item.points : 0;

          return (
            <div key={item.seat} className="relative flex items-center w-full max-w-[92vw] md:max-w-3xl h-16 sm:h-20 animate-fade-in my-1 px-2">
              {/* Connection Rivet mounted at left anchor (NEVER overlapping center answer text) */}
              <div className="absolute left-4 z-30">
                <RedConnectionRivet />
              </div>

              {/* Main Capsule Plaque (Fixed Dimensions) */}
              <div
                className="w-full rounded-full h-16 sm:h-20 pl-10 pr-6 sm:pr-8 flex items-center justify-between shadow-2xl relative overflow-hidden"
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
                <div className="flex items-center gap-2 z-10 w-36 sm:w-48 shrink-0 overflow-hidden">
                  <span className="font-bold text-sm sm:text-lg text-slate-100 truncate block max-w-full">
                    {seat?.name || `Thí sinh ${item.seat + 1}`}
                  </span>
                </div>

                {/* Uppercase Answer (100% unobstructed center space) */}
                <div className="flex-1 min-w-0 text-center z-10 px-4 overflow-hidden">
                  <span className="font-black text-xl sm:text-3xl text-white tracking-widest uppercase drop-shadow truncate block max-w-full">
                    {answerText}
                  </span>
                </div>

                {/* Response Time Pill & Awarded Points */}
                <div className="flex items-center gap-2 z-10 shrink-0">
                  {awardedPts > 0 && (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-slate-950 font-black text-xs sm:text-sm shadow">
                      +{awardedPts}
                    </span>
                  )}
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

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * COMPONENT 6: TỔNG KẾT ĐIỂM (LOWER-THIRD CHYRON & FULLSCREEN)
 * - Lower-Third Chyron: Ranks contestants from lowest to highest.
 * - Displays Rank/Position, Name, School/City, and Score with golden neon styling.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function SummaryLowerThirdGraphic({ state }: { state: OlympiaState }) {
  const sm = state.summaryState;
  if (!sm || !sm.active || sm.orderedSeats.length === 0) return null;

  const curSeatId = sm.orderedSeats[sm.currentIndex] ?? sm.orderedSeats[0];
  const curSeat = state.seats[curSeatId];
  if (!curSeat) return null;

  const total = sm.orderedSeats.length;
  const ranks = sm.orderedSeats.map((seatId) => {
    const myScore = state.seats[seatId]?.score ?? 0;
    const higherCount = sm.orderedSeats.filter(
      (otherId) => (state.seats[otherId]?.score ?? 0) > myScore
    ).length;
    return higherCount + 1;
  });
  const curRank = ranks[sm.currentIndex] ?? (total - sm.currentIndex);
  const maxScore = Math.max(...sm.orderedSeats.map((sId) => state.seats[sId]?.score ?? 0));
  const isLeader = curSeat.score === maxScore && (maxScore > 0 || sm.currentIndex === total - 1);

  if (sm.isFullscreen) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in pointer-events-auto">
        <div className="relative w-full max-w-2xl rounded-3xl p-8 border-2 border-amber-400/80 bg-gradient-to-b from-[#131b3b] via-[#0b1026] to-[#060814] shadow-[0_0_50px_rgba(245,158,11,0.5)] flex flex-col items-center text-center gap-4">
          <div className="px-6 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-sm uppercase tracking-widest shadow-lg">
            {isLeader ? "👑 DẪN ĐẦU ĐOÀN LEO NÚI" : `TỔNG KẾT ĐIỂM (HẠNG #${curRank})`}
          </div>
          <div className="text-3xl sm:text-5xl font-black text-white tracking-wide uppercase drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]">
            {curSeat.name}
          </div>
          {curSeat.school && (
            <div className="text-base sm:text-lg text-cyan-200 font-semibold flex items-center gap-2">
              <span>🏫</span>
              <span>{curSeat.school}</span>
            </div>
          )}
          <div className="text-5xl sm:text-7xl font-black text-amber-300 font-mono tracking-tight drop-shadow-[0_0_20px_rgba(252,211,77,0.7)] pt-2">
            {curSeat.score} <span className="text-2xl sm:text-3xl font-sans text-amber-200/80">điểm</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-4xl px-4 animate-slide-in-up pointer-events-auto">
      <div
        className="rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 border-2 shadow-[0_10px_40px_rgba(0,0,0,0.85)]"
        style={{
          background: isLeader
            ? "linear-gradient(90deg, rgba(20,15,5,0.96) 0%, rgba(45,30,8,0.96) 50%, rgba(20,15,5,0.96) 100%)"
            : "linear-gradient(90deg, rgba(6,15,35,0.96) 0%, rgba(12,28,68,0.96) 50%, rgba(6,15,35,0.96) 100%)",
          borderColor: isLeader ? "#f59e0b" : "#38bdf8",
          boxShadow: isLeader
            ? "0 0 35px rgba(245,158,11,0.5), inset 0 1px 2px rgba(255,255,255,0.3)"
            : "0 0 30px rgba(56,189,248,0.4), inset 0 1px 2px rgba(255,255,255,0.2)",
        }}
      >
        {/* Left: Position Badge */}
        <div className="flex flex-col items-center justify-center px-4 py-2 rounded-xl bg-black/50 border border-white/10 shrink-0">
          <span className="text-xs uppercase font-bold text-slate-400">Vị trí</span>
          <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
            {isLeader ? "👑 1" : `#${curRank}`}
          </span>
        </div>

        {/* Center: Contestant Name & School */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="text-xl sm:text-3xl font-black text-white uppercase tracking-wider truncate drop-shadow">
            {curSeat.name}
          </div>
          <div className="text-xs sm:text-sm text-cyan-200/90 font-medium truncate flex items-center gap-1.5 mt-0.5">
            <span>🏫</span>
            <span>{curSeat.school || "Thí sinh"}</span>
          </div>
        </div>

        {/* Right: Score Numerals */}
        <div className="flex flex-col items-end justify-center shrink-0 pl-2">
          <div className="text-3xl sm:text-5xl font-black text-amber-300 font-mono tabular-nums drop-shadow-[0_0_15px_rgba(252,211,77,0.6)]">
            {curSeat.score}
          </div>
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-amber-200/70">
            ĐIỂM
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * REUSABLE UNIFIED CONTESTANT SCORE TAB BAR (Khởi Động, Về Đích, Câu Hỏi Phụ)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function EconovaContestantScoreTabBar({
  state,
  activeSeatId,
  buzzedSeatId,
  lockedSeats = [],
  questionNumberBadge,
}: {
  state: OlympiaState;
  activeSeatId?: number | null;
  buzzedSeatId?: number | null;
  lockedSeats?: number[];
  questionNumberBadge?: string | null;
}) {
  const seats = activeSeats(state);
  return (
    <div className="flex items-stretch w-full bg-[#091a32] border-t border-cyan-400/30">
      {questionNumberBadge && (
        <div className="shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-amber-500/30 to-red-500/30 border-r border-amber-400/40 text-amber-300 font-black text-xs sm:text-sm md:text-base uppercase tracking-wider flex items-center justify-center whitespace-nowrap">
          {questionNumberBadge}
        </div>
      )}
      <div
        className="flex-1 grid gap-0.5 min-w-0"
        style={{ gridTemplateColumns: `repeat(${Math.max(1, seats.length)}, minmax(0, 1fr))` }}
      >
        {seats.map((s) => {
          const isBuzzed = buzzedSeatId != null && buzzedSeatId === s.id;
          const isCurrent = !isBuzzed && activeSeatId != null && activeSeatId === s.id;
          const isLocked = lockedSeats.includes(s.id);
          return (
            <div
              key={s.id}
              className={`px-3 py-1.5 sm:py-2 text-center font-extrabold text-xs sm:text-sm md:text-base tracking-wide uppercase transition-all flex items-center justify-center gap-1.5 truncate ${
                isBuzzed
                  ? "bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.85)] font-black animate-pulse"
                  : isCurrent
                  ? "bg-gradient-to-r from-[#1fd1ff] to-[#3be8ff] text-[#051329] shadow-[0_0_16px_rgba(46,230,255,0.65)] font-black"
                  : isLocked
                  ? "bg-slate-900/90 text-slate-500 line-through"
                  : "bg-[#0d2240] text-slate-200/85"
              }`}
            >
              {isBuzzed && <span>🔔</span>}
              <span className="truncate">{s.name}</span>
              <span
                className={`text-[11px] sm:text-xs font-mono px-1.5 py-0.2 rounded ${
                  isBuzzed
                    ? "bg-black/30 text-amber-200 font-black"
                    : isCurrent
                    ? "bg-black/20 text-slate-950 font-black"
                    : "bg-black/40 text-cyan-300"
                }`}
              >
                {s.score}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * COMPONENT 7: ECONOVA LOWER-THIRD V3 ARROW (Khởi Động, Về Đích, Câu Hỏi Phụ)
 * - Layer 1: Contestant Name Strip (4 seats, active/buzzed seat highlighted in glowing cyan/red)
 * - Layer 2: Chevron Arrow Question Box + Category/Round Badge
 * - Layer 3: Direct-DOM 60 FPS Timer Progress Bar
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
  children?: React.ReactNode;
}) {
  const fillRef = useRef<HTMLDivElement>(null);
  const resolvedBadge = categoryBadge ?? headerBadge ?? "OLYMPIA";

  useEffect(() => {
    if (!timer || timer.startedAt == null) {
      if (fillRef.current) fillRef.current.style.width = "100%";
      return;
    }

    let rafId: number;
    let active = true;

    const tick = () => {
      if (!active) return;
      const total = Math.max(1, timer.totalMs || 5000);
      const elapsed = Math.max(0, serverNow() - (timer.startedAt ?? 0));
      const rem = Math.max(0, timer.remainingMs - elapsed);
      const pct = Math.max(0, Math.min(100, (rem / total) * 100));

      if (fillRef.current) {
        fillRef.current.style.width = `${pct}%`;
        fillRef.current.style.background =
          pct <= 25
            ? "linear-gradient(90deg, #dc2626, #f59e0b)"
            : "linear-gradient(90deg, #1fd1ff, #2ee6ff)";
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
  }, [timer?.startedAt, timer?.remainingMs, timer?.totalMs, serverNow]);

  const isFs = overlayMode === "FULLSCREEN";
  const strLen = typeof questionText === "string" ? questionText.length : 60;
  const fontSizeClass = isFs
    ? strLen > 240
      ? "text-lg sm:text-xl md:text-2xl leading-snug"
      : strLen > 140
      ? "text-xl sm:text-2xl md:text-3xl leading-normal"
      : "text-2xl sm:text-3xl md:text-4xl leading-relaxed"
    : strLen > 240
    ? "text-xs sm:text-sm md:text-base leading-snug"
    : strLen > 140
    ? "text-sm sm:text-base md:text-lg leading-snug"
    : strLen > 80
    ? "text-base sm:text-lg md:text-xl leading-normal"
    : "text-lg sm:text-xl md:text-2xl leading-relaxed";

  return (
    <div
      className={
        isFs
          ? "absolute inset-0 z-30 flex flex-col items-center justify-center p-4 sm:p-8 bg-[#051126]/90 backdrop-blur-md pointer-events-auto"
          : "w-full max-w-6xl mx-auto px-3 sm:px-6 pb-2 sm:pb-3 pt-1 z-20 pointer-events-auto"
      }
    >
      {extraTopBanner && <div className="mb-2 w-full max-w-5xl mx-auto">{extraTopBanner}</div>}

      <div className="w-full max-w-6xl mx-auto flex flex-col shadow-[0_14px_40px_rgba(0,0,0,0.85)]">
        {/* LAYER 1: 4 Contestant Tabs */}
        {showScoreTab && (
          <EconovaContestantScoreTabBar
            state={state}
            activeSeatId={activeSeatId}
            buzzedSeatId={buzzedSeatId}
            lockedSeats={lockedSeats}
            questionNumberBadge={questionNumberBadge}
          />
        )}

        {/* LAYER 2: Main Chevron Question Bar + Category Block */}
        <div className="grid grid-cols-[1fr_140px] sm:grid-cols-[1fr_210px] items-stretch bg-[#07182f] border-y border-cyan-400/40 relative">
          {/* Question Chevron Box */}
          <div
            className={`relative px-5 sm:px-8 flex flex-col justify-center ${
              isFs ? "min-h-[220px] sm:min-h-[280px] py-6" : "min-h-[96px] sm:min-h-[118px] py-3"
            }`}
            style={{
              background: "linear-gradient(90deg, #08203f 0%, #0d2c54 70%, #15457a 100%)",
              borderLeft: "5px solid #2ee6ff",
              clipPath: "polygon(0 0, calc(100% - 26px) 0, 100% 50%, calc(100% - 26px) 100%, 0 100%)",
            }}
          >
            {hopeStarActive && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-300 text-amber-300 text-[10px] sm:text-xs font-black uppercase tracking-wider w-fit mb-1 animate-pulse">
                <span>⭐</span>
                <span>Ngôi Sao Hy Vọng</span>
              </div>
            )}

            <div className={`font-bold text-white select-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] pr-4 ${fontSizeClass}`}>
              {questionText}
            </div>

            {mediaElement && <div className="mt-1">{mediaElement}</div>}
            {children && <div className="mt-1">{children}</div>}

            {answerText && (
              <div className="mt-2 pt-1.5 border-t border-cyan-400/30 flex items-center gap-2 text-emerald-300 font-black text-sm sm:text-lg animate-fade-in">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400 text-[10px] sm:text-xs uppercase tracking-wider">
                  ĐÁP ÁN
                </span>
                <span>{answerText}</span>
              </div>
            )}
          </div>

          {/* Right Category / Point Block */}
          <div className="flex flex-col items-center justify-center px-3 py-2 text-center bg-gradient-to-b from-[#0b2548] to-[#06152b] border-l border-cyan-400/30">
            <span className="font-black text-xs sm:text-base md:text-lg text-[#2ee6ff] uppercase tracking-wider leading-tight drop-shadow-[0_0_10px_rgba(46,230,255,0.4)]">
              {resolvedBadge}
            </span>
          </div>
        </div>

        {/* LAYER 3: Bottom Direct-DOM Progress Bar */}
        <div className="h-2.5 w-full bg-[#061426] overflow-hidden border-b border-cyan-500/40">
          <div
            ref={fillRef}
            className="h-full will-change-[width]"
            style={{
              width: "100%",
              background: "linear-gradient(90deg, #1fd1ff, #2ee6ff)",
              boxShadow: "0 0 12px rgba(46,230,255,0.7)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * COMPONENT 8: VỀ ĐÍCH SLANTED HEXAGONAL PACKAGE GRID (Matches Reference Image)
 * - Displays the 3-column slanted package grid (e.g. 20 / 30 rows x 3 columns).
 * - Selected cells in each column light up in glowing Crimson Red (#e11d48).
 * - Unselected cells remain Deep Navy (#0c2a55).
 * - Supports both V3 Arrow (Slanted Hexagonal Grid) and O26 Classic.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function VeDichSlantedGridGraphic({
  state,
  ownerSeatId,
  selectedPoints,
  pointOptions,
}: {
  state: OlympiaState;
  ownerSeatId?: number;
  selectedPoints?: number[];
  pointOptions?: number[];
}) {
  const vd = state.veDich;
  const resolvedOwnerId = ownerSeatId ?? (vd ? vd.order[vd.turnIdx] : 0);
  const owner = state.seats[resolvedOwnerId];
  const resolvedSelected =
    selectedPoints ?? (vd?.packages[resolvedOwnerId] ? vd.packages[resolvedOwnerId].map((p) => p.points) : undefined);
  const isO22Q1 = state.rulesetId === "O22" && (state.o22Quarter ?? 1) === 1;
  const defaultCols = isO22Q1 ? 2 : 3;
  const defaultRows = isO22Q1 ? [20, 40] : [20, 30];
  const cols = resolvedSelected && resolvedSelected.length > 0 ? resolvedSelected.length : defaultCols;
  const rows = pointOptions && pointOptions.length > 0 ? pointOptions : defaultRows;
  const isV3Arrow = state.themeMode !== "o26_classic";

  if (!isV3Arrow) {
    return (
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 pointer-events-auto">
        <Vtv3ChalkboardBackdrop />
        <div className="relative z-10 w-full max-w-4xl flex flex-col items-center gap-6 animate-fade-in">
          <div className="px-8 py-2.5 rounded-full bg-slate-900/90 border-2 border-amber-400 text-amber-300 font-black text-base sm:text-xl uppercase tracking-widest shadow-xl">
            GÓI CÂU HỎI VỀ ĐÍCH — {owner?.name || `Thí sinh ${resolvedOwnerId + 1}`}
          </div>
          <div className="flex items-center justify-center gap-5 sm:gap-8">
            {Array.from({ length: cols }).map((_, cIdx) => {
              const pt = resolvedSelected?.[cIdx];
              return (
                <div
                  key={cIdx}
                  className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl border-4 border-amber-400 bg-gradient-to-b from-slate-800 to-slate-950 flex flex-col items-center justify-center shadow-[0_15px_35px_rgba(0,0,0,0.85)]"
                >
                  <span className="text-xs font-bold text-slate-400 uppercase">Câu {cIdx + 1}</span>
                  <span className="text-4xl sm:text-5xl font-black text-amber-300 font-mono mt-1">
                    {pt ?? "?"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-4 z-20 pointer-events-auto animate-fade-in flex flex-col items-center gap-3">
      {/* Contestant Header Pill */}
      <div className="px-6 py-1.5 rounded-full bg-[#08203f]/95 border border-cyan-400/70 text-cyan-200 font-black text-xs sm:text-sm uppercase tracking-widest shadow-lg">
        LỰA CHỌN GÓI CÂU HỎI — {owner?.name || `THÍ SINH ${resolvedOwnerId + 1}`}
      </div>

      {/* Main Hexagonal Frame with Left/Right Cyan Chevron Wings */}
      <div className="relative w-full max-w-3xl flex items-center justify-center py-2">
        {/* Left Cyan Wing (<) */}
        <div
          className="w-7 sm:w-10 h-28 sm:h-36 -mr-3 z-0 shrink-0"
          style={{
            background: "linear-gradient(180deg, #00b4ff 0%, #0077ff 100%)",
            clipPath: "polygon(100% 0, 45% 0, 0 50%, 45% 100%, 100% 100%, 60% 50%)",
            boxShadow: "0 0 20px rgba(0,180,255,0.7)",
          }}
        />

        {/* Outer Silver/Navy Hexagonal Bezel */}
        <div
          className="relative z-10 w-full p-1.5 sm:p-2 shadow-[0_15px_45px_rgba(0,0,0,0.9)]"
          style={{
            background: "linear-gradient(180deg, #e2e8f0 0%, #94a3b8 50%, #cbd5e1 100%)",
            clipPath: "polygon(24px 0, calc(100% - 24px) 0, 100% 50%, calc(100% - 24px) 100%, 24px 100%, 0 50%)",
          }}
        >
          <div
            className="w-full bg-[#071f46] px-6 sm:px-10 py-2 overflow-hidden relative"
            style={{
              clipPath: "polygon(21px 0, calc(100% - 21px) 0, 100% 50%, calc(100% - 21px) 100%, 21px 100%, 0 50%)",
            }}
          >
            {/* Slanted Rows x Columns Grid */}
            <div className="flex flex-col divide-y-[3px] divide-slate-300/80 -skew-x-12">
              {rows.map((ptValue) => (
                <div
                  key={ptValue}
                  className="grid divide-x-[3px] divide-slate-300/80"
                  style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
                >
                  {Array.from({ length: cols }).map((_, colIdx) => {
                    const isSelected = resolvedSelected?.[colIdx] === ptValue;
                    return (
                      <div
                        key={colIdx}
                        className="h-16 sm:h-22 flex items-center justify-center transition-all duration-300 relative overflow-hidden"
                        style={{
                          background: isSelected
                            ? "linear-gradient(90deg, #881337 0%, #be123c 35%, #e11d48 75%, #f43f5e 100%)"
                            : "linear-gradient(180deg, #0a2654 0%, #071b3e 100%)",
                          boxShadow: isSelected
                            ? "inset 0 0 25px rgba(255,255,255,0.25)"
                            : "inset 0 0 15px rgba(0,0,0,0.45)",
                        }}
                      >
                        <span className="skew-x-12 font-black text-3xl sm:text-5xl text-white tracking-tight select-none drop-shadow-[0_3px_6px_rgba(0,0,0,0.75)]">
                          {ptValue}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Cyan Wing (>) */}
        <div
          className="w-7 sm:w-10 h-28 sm:h-36 -ml-3 z-0 shrink-0"
          style={{
            background: "linear-gradient(180deg, #00b4ff 0%, #0077ff 100%)",
            clipPath: "polygon(0 0, 55% 0, 100% 50%, 55% 100%, 0 100%, 40% 50%)",
            boxShadow: "0 0 20px rgba(0,180,255,0.7)",
          }}
        />
      </div>
    </div>
  );
}

