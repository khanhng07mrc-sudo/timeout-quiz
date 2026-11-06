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
  // 4 Visual States:
  // 1. Initial deep blue: !isOpened && !isWrong && !isCurrentRow
  // 2. Currently selected row: isCurrentRow && !isOpened && !isWrong (pulsating amber ring)
  // 3. Revealed/opened: isOpened (bright luminous cyan with white letter)
  // 4. Sẫm màu khi không ai trả lời đúng: isWrong (darkened charcoal slate, no letter)
  const isSelecting = isCurrentRow && !isOpened && !isWrong;

  const bgGradient = isWrong
    ? "radial-gradient(circle at 35% 30%, #374151 0%, #1f2937 55%, #111827 100%)"
    : isOpened
    ? "radial-gradient(circle at 35% 30%, #67e8f9 0%, #06b6d4 40%, #0891b2 75%, #164e63 100%)"
    : isSelecting
    ? "radial-gradient(circle at 35% 30%, #fef08a 0%, #f59e0b 45%, #b45309 80%, #78350f 100%)"
    : "radial-gradient(circle at 35% 30%, #93c5fd 0%, #38bdf8 25%, #0284c7 55%, #03487f 80%, #02203d 100%)";

  const borderColor = isWrong
    ? "1.5px solid rgba(107, 114, 128, 0.4)"
    : isOpened
    ? "1.5px solid rgba(165, 243, 252, 0.95)"
    : isSelecting
    ? "2px solid rgba(254, 240, 138, 0.95)"
    : "1.5px solid rgba(224, 242, 254, 0.85)";

  return (
    <div
      className={`relative w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 ${
        isSelecting
          ? "ring-2 ring-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.9)] animate-pulse scale-105"
          : isOpened
          ? "shadow-[0_0_15px_rgba(6,182,212,0.6)]"
          : isWrong
          ? "shadow-[0_2px_4px_rgba(0,0,0,0.5)] opacity-60"
          : "shadow-[0_4px_10px_rgba(0,0,0,0.65)]"
      }`}
      style={{
        background: bgGradient,
        border: borderColor,
        boxShadow: isWrong
          ? "inset 0 1px 2px rgba(0,0,0,0.5)"
          : "0 4px 10px rgba(0,0,0,0.7), inset 0 2px 4px rgba(255,255,255,0.7), inset 0 -2px 4px rgba(0,0,0,0.8)",
      }}
    >
      {/* Specular White Glint Spot at top-left for ultra-glossy 3D glass illusion */}
      {!isWrong && (
        <div className="absolute top-1 left-1.5 w-2 h-1.5 sm:w-2.5 sm:h-2 rounded-full bg-white/80 blur-[0.3px] pointer-events-none" />
      )}

      {/* Letter text when opened and not wrong */}
      {isOpened && !isWrong && letter ? (
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

  const QUAD_PIECES = [
    {
      index: 0,
      label: "1",
      clipPath: "polygon(0% 0%, 100% 0%, 100% 64%, 64% 64%, 64% 100%, 0% 100%)",
      svgPoints: "0.5,0.5 99.5,0.5 99.5,64 64,64 64,99.5 0.5,99.5",
      labelPos: "left-[33%] top-[33%]",
    },
    {
      index: 1,
      label: "2",
      clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 36% 100%, 36% 64%, 0% 64%)",
      svgPoints: "0.5,0.5 99.5,0.5 99.5,99.5 36,99.5 36,64 0.5,64",
      labelPos: "left-[67%] top-[33%]",
    },
    {
      index: 3,
      label: "4",
      clipPath: "polygon(0% 0%, 64% 0%, 64% 36%, 100% 36%, 100% 100%, 0% 100%)",
      svgPoints: "0.5,0.5 64,0.5 64,36 99.5,36 99.5,99.5 0.5,99.5",
      labelPos: "left-[33%] top-[67%]",
    },
    {
      index: 2,
      label: "3",
      clipPath: "polygon(36% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 36%, 36% 36%)",
      svgPoints: "36,0.5 99.5,0.5 99.5,99.5 0.5,99.5 0.5,36 36,36",
      labelPos: "left-[67%] top-[67%]",
    },
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

          {/* 4 L-Shaped Corner Quadrants (1, 2, 4, 3) — Zero Overlap with Center Piece 5 */}
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
            {QUAD_PIECES.map((piece) => {
              const isRevealed = v.piecesRevealed[piece.index];
              const isSelectedPiece = curIdx === piece.index;
              return (
                <div
                  key={piece.index}
                  className={`relative transition-all duration-700 ${
                    isRevealed
                      ? "opacity-0 pointer-events-none"
                      : isSelectedPiece
                      ? "bg-gradient-to-br from-[#0f3178] to-[#081d4a] opacity-100"
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
                      stroke={isSelectedPiece ? "#fbbf24" : "rgba(34, 211, 238, 0.45)"}
                      strokeWidth={isSelectedPiece ? "2.2" : "1.2"}
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                  <span
                    className={`absolute -translate-x-1/2 -translate-y-1/2 ${piece.labelPos} text-3xl sm:text-5xl md:text-6xl font-black select-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.85)] ${
                      isSelectedPiece ? "text-amber-300" : "text-white"
                    }`}
                  >
                    {piece.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Center Tile (Piece 5): Fits flush into the 36% x 36% center cutout without overlapping pieces 1-4 */}
          <div
            className={`absolute left-[32%] top-[32%] w-[36%] h-[36%] border-2 flex items-center justify-center transition-all duration-700 z-10 ${
              v.piecesRevealed[4]
                ? "opacity-0 pointer-events-none"
                : isCenter
                ? "bg-gradient-to-br from-[#0c2866] to-[#04153a] border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.85)] animate-pulse opacity-100 ring-2 ring-amber-300/70"
                : "bg-[#071739] border-cyan-400/80 shadow-[0_0_16px_rgba(6,182,212,0.4)] opacity-100"
            }`}
          >
            <span
              className={`text-3xl sm:text-5xl md:text-6xl font-black select-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.85)] ${
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
            {v.phase === "selecting" ? null : v.phase === "done" ? (
              <div className="w-full flex flex-col items-center justify-center h-full text-center gap-2 animate-fade-in">
                <div className="px-4 py-1.5 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300 text-xs sm:text-sm font-black uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                  CHƯỚNG NGẠI VẬT ĐÃ ĐƯỢC GIẢI MÃ
                </div>
                <div className="text-2xl sm:text-4xl md:text-5xl font-black text-amber-300 tracking-wider drop-shadow-[0_4px_16px_rgba(245,158,11,0.8)]">
                  {v.keyword || "—"}
                </div>
                {v.solvedBy != null && state.seats[v.solvedBy] && (
                  <div className="text-sm sm:text-base text-cyan-200 font-bold">
                    Chúc mừng thí sinh <span className="text-white font-black underline">{state.seats[v.solvedBy].name}</span>!
                  </div>
                )}
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
                {questionHint || ""}
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
                  width: "0%",
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
  genZigzagShape,
  genVeDichGridCells,
  type ZigzagShape,
  type GridCell,
  type ArrowShell,
  type Pt,
} from "./v3Geometry";
import { V3ArrowShell, V3ScaledStage, V3_COLORS } from "./V3ArrowShell";
import { HopeStarBadge } from "./HopeStarBadge";

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
export function VcnvAnswerRevealGraphic({ state }: { state: OlympiaState }) {
  const v = state.vcnv;
  if (!v) return null;
  const seats = activeSeats(state);
  const isV3Arrow = state.themeMode !== "o26_classic";

  if (isV3Arrow) {
    const W = 940;
    const H = 72;
    const thick = 22;
    const cThick = 18;
    const pad = Math.round(cThick * 1.5);
    const shell = buildArrowShell({ W, H, slantRatio: 0.3571, thick, cThick, pad });
    const cols = buildRowColumns(shell, [48, 52]);
    const dc = shell.canvasW / 2 - shell.startX / 2;

    return (
      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 z-20 pointer-events-auto bg-[#040e24]/90 backdrop-blur-md animate-fade-in select-none">
        <style>{`
          @keyframes v3-row-wing-l-g1 {
            0% { transform: translateX(calc(var(--dc))); opacity: 0.35; }
            15% { transform: translateX(calc(var(--dc))); opacity: 0.35; }
            50% { transform: translateX(-24px); opacity: 0.35; }
            100% { transform: translateX(0); opacity: 0.35; }
          }
          @keyframes v3-row-wing-l-g2 {
            0% { transform: translateX(calc(var(--dc))); opacity: 0.65; }
            15% { transform: translateX(calc(var(--dc))); opacity: 0.65; }
            50% { transform: translateX(-12px); opacity: 0.65; }
            100% { transform: translateX(0); opacity: 0.65; }
          }
          @keyframes v3-row-wing-l-l3 {
            0% { transform: translateX(calc(var(--dc))); opacity: 1; }
            15% { transform: translateX(calc(var(--dc))); opacity: 1; }
            100% { transform: translateX(0); opacity: 1; }
          }
          @keyframes v3-row-wing-r-g1 {
            0% { transform: translateX(calc(var(--dc) * -1)); opacity: 0.35; }
            15% { transform: translateX(calc(var(--dc) * -1)); opacity: 0.35; }
            50% { transform: translateX(24px); opacity: 0.35; }
            100% { transform: translateX(0); opacity: 0.35; }
          }
          @keyframes v3-row-wing-r-g2 {
            0% { transform: translateX(calc(var(--dc) * -1)); opacity: 0.65; }
            15% { transform: translateX(calc(var(--dc) * -1)); opacity: 0.65; }
            50% { transform: translateX(12px); opacity: 0.65; }
            100% { transform: translateX(0); opacity: 0.65; }
          }
          @keyframes v3-row-wing-r-l3 {
            0% { transform: translateX(calc(var(--dc) * -1)); opacity: 1; }
            15% { transform: translateX(calc(var(--dc) * -1)); opacity: 1; }
            100% { transform: translateX(0); opacity: 1; }
          }
          @keyframes v3-row-hex {
            0% { clip-path: inset(0 50% 0 50%); opacity: 0; }
            15% { opacity: 1; }
            100% { clip-path: inset(0 0% 0 0%); opacity: 1; }
          }
          @keyframes v3-row-text {
            0% { opacity: 0; transform: translateY(4px); }
            100% { opacity: 1; transform: translateY(0); }
          }
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
          .v3-row-text {
            animation: v3-row-text 0.22s ease-out both;
          }
        `}</style>
        {/* Only pure graphic bars - Strictly no header pill text */}
        <div className="w-full max-w-5xl flex flex-col gap-4 items-center justify-center py-2">
          {seats.map((seat, idx) => {
            const answerText = v.answers?.[seat.id]?.text || "";
            const rowDelay = 0;
            const textDelay = "0.440";

            return (
              <div
                key={seat.id}
                className="w-full max-w-4xl flex items-center justify-center"
                style={{ ["--dc" as string]: `${dc}px` }}
              >
                <V3ScaledStage designW={shell.canvasW} designH={H}>
                  <svg
                    width={shell.canvasW}
                    height={H}
                    viewBox={`0 0 ${shell.canvasW} ${H}`}
                    className="overflow-visible"
                  >
                    <defs>
                      <linearGradient id={`vcnvWing-${idx}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#1fd1ff" />
                        <stop offset="100%" stopColor="#2ee6ff" />
                      </linearGradient>
                      <linearGradient id={`vcnvName-${idx}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#051433" />
                        <stop offset="100%" stopColor="#0d2c54" />
                      </linearGradient>
                      <linearGradient id={`vcnvAns-${idx}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#09408f" />
                        <stop offset="100%" stopColor="#0072ff" />
                      </linearGradient>
                    </defs>

                    {/* Left 3-layer cyan wings + navy chevron */}
                    <g className="v3-row-wing-l-g1" style={{ animationDelay: `${rowDelay.toFixed(3)}s` }}>
                      <path d={toSvgPath(shell.alcPts)} fill={`url(#vcnvWing-${idx})`} opacity={0.35} />
                    </g>
                    <g className="v3-row-wing-l-g2" style={{ animationDelay: `${rowDelay.toFixed(3)}s` }}>
                      <path d={toSvgPath(shell.alcPts)} fill={`url(#vcnvWing-${idx})`} opacity={0.65} />
                    </g>
                    <g className="v3-row-wing-l-l3" style={{ animationDelay: `${rowDelay.toFixed(3)}s` }}>
                      <path d={toSvgPath(shell.alcPts)} fill={`url(#vcnvWing-${idx})`} opacity={1.0} />
                      <path d={toSvgPath(shell.alnPts)} fill="#0d2c54" stroke="#d1d5db" strokeWidth={1.5} />
                    </g>

                    {/* Right navy chevron + 3-layer cyan wings */}
                    <g className="v3-row-wing-r-l3" style={{ animationDelay: `${rowDelay.toFixed(3)}s` }}>
                      <path d={toSvgPath(shell.arnPts)} fill="#0d2c54" stroke="#d1d5db" strokeWidth={1.5} />
                      <path d={toSvgPath(shell.arcPts)} fill={`url(#vcnvWing-${idx})`} opacity={1.0} />
                    </g>
                    <g className="v3-row-wing-r-g2" style={{ animationDelay: `${rowDelay.toFixed(3)}s` }}>
                      <path d={toSvgPath(shell.arcPts)} fill={`url(#vcnvWing-${idx})`} opacity={0.65} />
                    </g>
                    <g className="v3-row-wing-r-g1" style={{ animationDelay: `${rowDelay.toFixed(3)}s` }}>
                      <path d={toSvgPath(shell.arcPts)} fill={`url(#vcnvWing-${idx})`} opacity={0.35} />
                    </g>

                    {/* Hexagon Body (Expands from center) */}
                    <g className="v3-row-hex" style={{ animationDelay: `${rowDelay.toFixed(3)}s` }}>
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
                    </g>

                    {/* Text Overlay: Fades in when row animation reaches ~80% */}
                    <g className="v3-row-text" style={{ animationDelay: `${textDelay}s` }}>
                      <text
                        x={cols.cells[0].cx}
                        y={cols.cells[0].cy + 8}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontWeight="900"
                        fontSize="24"
                        letterSpacing="0.05em"
                        className="uppercase font-sans"
                        style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.85))" }}
                      >
                        {seat.name}
                      </text>

                      <text
                        x={cols.cells[1].cx}
                        y={cols.cells[1].cy + 8}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontWeight="900"
                        fontSize="24"
                        letterSpacing="0.1em"
                        className="uppercase font-sans"
                        style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.9))" }}
                      >
                        {answerText || "—"}
                      </text>
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
    <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 z-20 pointer-events-auto">
      <Vtv3ChalkboardBackdrop />
      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center gap-4 py-6">
        {seats.map((seat) => {
          const answerText = v.answers[seat.id]?.text || "";
          return (
            <div
              key={seat.id}
              className="relative w-full max-w-3xl h-16 sm:h-20 flex items-center shadow-2xl rounded-2xl border-2 border-amber-400/80 bg-slate-900/90 overflow-hidden"
            >
              <div className="h-full w-48 sm:w-60 px-4 bg-amber-400 text-slate-950 flex items-center justify-center font-black text-sm sm:text-base uppercase tracking-wider truncate">
                {seat.name}
              </div>
              <div className="flex-1 px-6 text-center text-white font-black text-xl sm:text-3xl uppercase tracking-widest truncate">
                {answerText}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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

  if (isV3Arrow) {
    const W = 940;
    const H = 72;
    const thick = 22;
    const cThick = 18;
    const pad = Math.round(cThick * 1.5);
    const shell = buildArrowShell({ W, H, slantRatio: 0.3571, thick, cThick, pad });
    const cols = buildRowColumns(shell, [38, 42, 20]);
    const dc = shell.canvasW / 2 - shell.startX;

    return (
      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 z-20 pointer-events-auto bg-[#040e24]/90 backdrop-blur-md animate-fade-in select-none">
        <style>{`
          @keyframes v3-tt-wing-l-g1 {
            0% { transform: translateX(calc(var(--dc))) scale(0.6); opacity: 0; }
            15% { opacity: 0.35; }
            40% { transform: translateX(-24px) scale(1); opacity: 0.35; }
            100% { transform: translateX(0); opacity: 0.35; }
          }
          @keyframes v3-tt-wing-l-g2 {
            0% { transform: translateX(calc(var(--dc))) scale(0.7); opacity: 0; }
            15% { opacity: 0.65; }
            40% { transform: translateX(-12px) scale(1); opacity: 0.65; }
            100% { transform: translateX(0); opacity: 0.65; }
          }
          @keyframes v3-tt-wing-l-l3 {
            0% { transform: translateX(calc(var(--dc))); opacity: 0; }
            15% { opacity: 1; }
            100% { transform: translateX(0); opacity: 1; }
          }
          @keyframes v3-tt-wing-r-g1 {
            0% { transform: translateX(calc(var(--dc) * -1)) scale(0.6); opacity: 0; }
            15% { opacity: 0.35; }
            40% { transform: translateX(24px) scale(1); opacity: 0.35; }
            100% { transform: translateX(0); opacity: 0.35; }
          }
          @keyframes v3-tt-wing-r-g2 {
            0% { transform: translateX(calc(var(--dc) * -1)) scale(0.7); opacity: 0; }
            15% { opacity: 0.65; }
            40% { transform: translateX(12px) scale(1); opacity: 0.65; }
            100% { transform: translateX(0); opacity: 0.65; }
          }
          @keyframes v3-tt-wing-r-l3 {
            0% { transform: translateX(calc(var(--dc) * -1)); opacity: 0; }
            15% { opacity: 1; }
            100% { transform: translateX(0); opacity: 1; }
          }
          @keyframes v3-tt-hex {
            0% { clip-path: inset(0 50% 0 50%); opacity: 0; }
            15% { opacity: 1; }
            100% { clip-path: inset(0 0% 0 0%); opacity: 1; }
          }
          @keyframes v3-tt-text {
            0% { opacity: 0; transform: translateY(4px); }
            100% { opacity: 1; transform: translateY(0); }
          }
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
          .v3-tt-text {
            animation: v3-tt-text 0.22s ease-out both;
          }
        `}</style>
        {/* Only pure graphic bars - Strictly no header pill text */}
        <div className="w-full max-w-5xl flex flex-col gap-4 items-center justify-center py-2">
          {(tt.ranking || []).map((item, idx) => {
            const seat = state.seats[item.seat];
            const sec = item.noAnswer ? "—" : (item.ms / 1000).toFixed(2);
            const answerText = item.noAnswer ? "" : (item.answer || "");
            const rowDelay = 0;
            const textDelay = "0.440";

            return (
              <div
                key={item.seat}
                className="w-full max-w-4xl flex items-center justify-center"
                style={{ ["--dc" as string]: `${dc}px` }}
              >
                <V3ScaledStage designW={shell.canvasW} designH={H}>
                  <svg
                    width={shell.canvasW}
                    height={H}
                    viewBox={`0 0 ${shell.canvasW} ${H}`}
                    className="overflow-visible"
                  >
                    <defs>
                      <linearGradient id={`ttWing-${idx}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#1fd1ff" />
                        <stop offset="100%" stopColor="#2ee6ff" />
                      </linearGradient>
                      <linearGradient id={`ttName-${idx}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#051433" />
                        <stop offset="100%" stopColor="#0d2c54" />
                      </linearGradient>
                      <linearGradient id={`ttAns-${idx}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#09408f" />
                        <stop offset="100%" stopColor="#0072ff" />
                      </linearGradient>
                      <linearGradient id={`ttTime-${idx}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#08203f" />
                        <stop offset="100%" stopColor="#051433" />
                      </linearGradient>
                    </defs>

                    {/* Left 3-layer cyan wings + navy chevron */}
                    <g className="v3-tt-wing-l-g1" style={{ animationDelay: `${rowDelay.toFixed(3)}s` }}>
                      <path d={toSvgPath(shell.alcPts)} fill={`url(#ttWing-${idx})`} opacity={0.35} />
                    </g>
                    <g className="v3-tt-wing-l-g2" style={{ animationDelay: `${rowDelay.toFixed(3)}s` }}>
                      <path d={toSvgPath(shell.alcPts)} fill={`url(#ttWing-${idx})`} opacity={0.65} />
                    </g>
                    <g className="v3-tt-wing-l-l3" style={{ animationDelay: `${rowDelay.toFixed(3)}s` }}>
                      <path d={toSvgPath(shell.alcPts)} fill={`url(#ttWing-${idx})`} opacity={1.0} />
                      <path d={toSvgPath(shell.alnPts)} fill="#0d2c54" stroke="#d1d5db" strokeWidth={1.5} />
                    </g>

                    {/* Right navy chevron + 3-layer cyan wings */}
                    <g className="v3-tt-wing-r-l3" style={{ animationDelay: `${rowDelay.toFixed(3)}s` }}>
                      <path d={toSvgPath(shell.arnPts)} fill="#0d2c54" stroke="#d1d5db" strokeWidth={1.5} />
                      <path d={toSvgPath(shell.arcPts)} fill={`url(#ttWing-${idx})`} opacity={1.0} />
                    </g>
                    <g className="v3-tt-wing-r-g2" style={{ animationDelay: `${rowDelay.toFixed(3)}s` }}>
                      <path d={toSvgPath(shell.arcPts)} fill={`url(#ttWing-${idx})`} opacity={0.65} />
                    </g>
                    <g className="v3-tt-wing-r-g1" style={{ animationDelay: `${rowDelay.toFixed(3)}s` }}>
                      <path d={toSvgPath(shell.arcPts)} fill={`url(#ttWing-${idx})`} opacity={0.35} />
                    </g>

                    {/* Hexagon Body (Expands from center) */}
                    <g className="v3-tt-hex" style={{ animationDelay: `${rowDelay.toFixed(3)}s` }}>
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
                    </g>

                    {/* Text Overlays: Fades in when row reaches ~80% */}
                    <g className="v3-tt-text" style={{ animationDelay: `${textDelay}s` }}>
                      <text
                        x={cols.cells[0].cx}
                        y={cols.cells[0].cy + 8}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontWeight="900"
                        fontSize="24"
                        letterSpacing="0.05em"
                        className="uppercase font-sans"
                        style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.85))" }}
                      >
                        {seat?.name || `Thí sinh ${item.seat + 1}`}
                      </text>

                      <text
                        x={cols.cells[1].cx}
                        y={cols.cells[1].cy + 8}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontWeight="900"
                        fontSize="24"
                        letterSpacing="0.1em"
                        className="uppercase font-sans"
                        style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.9))" }}
                      >
                        {answerText || "—"}
                      </text>

                      <text
                        x={cols.cells[2].cx}
                        y={cols.cells[2].cy + 8}
                        textAnchor="middle"
                        fill="#67e8f9"
                        fontWeight="900"
                        fontSize="22"
                        fontFamily="monospace"
                        letterSpacing="0.05em"
                        style={{ filter: "drop-shadow(0 2px 6px rgba(0,207,255,0.7))" }}
                      >
                        {sec}
                      </text>
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
    <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 z-20 pointer-events-auto">
      <Vtv3ChalkboardBackdrop />
      <CentralVerticalBrassRail />
      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center gap-4 py-8 scale-[0.88] sm:scale-100 origin-center">
        {tt.ranking.map((item) => {
          const seat = state.seats[item.seat];
          const sec = item.noAnswer ? "0.00" : (item.ms / 1000).toFixed(2);
          const answerText = item.noAnswer ? "" : item.answer;
          const awardedPts = tt.phase === "graded" && item.points ? item.points : 0;

          return (
            <div key={item.seat} className="relative flex items-center w-full max-w-[92vw] md:max-w-3xl h-16 sm:h-20 animate-fade-in my-1 px-2">
              <div className="absolute left-4 z-30">
                <RedConnectionRivet />
              </div>
              <div
                className="w-full rounded-full h-16 sm:h-20 pl-10 pr-6 sm:pr-8 flex items-center justify-between shadow-2xl relative overflow-hidden"
                style={{
                  background: item.wrong
                    ? "linear-gradient(180deg, #3b1116 0%, #1f080b 60%, #0d0305 100%)"
                    : "linear-gradient(180deg, #1e293b 0%, #0f172a 60%, #060a12 100%)",
                  border: item.wrong
                    ? "2.5px solid #ef4444"
                    : "2.5px solid rgba(203, 213, 225, 0.85)",
                }}
              >
                <div className="flex items-center gap-2 z-10 w-36 sm:w-48 shrink-0 overflow-hidden">
                  <span className="font-bold text-sm sm:text-lg text-slate-100 truncate block max-w-full">
                    {seat?.name || `Thí sinh ${item.seat + 1}`}
                  </span>
                </div>
                <div className="flex-1 min-w-0 text-center z-10 px-4 overflow-hidden">
                  <span className="font-black text-xl sm:text-3xl text-white tracking-widest uppercase drop-shadow truncate block max-w-full">
                    {answerText}
                  </span>
                </div>
                {awardedPts > 0 && (
                  <div className="shrink-0 z-10 pl-2">
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full font-black text-sm uppercase">
                      +{awardedPts}
                    </span>
                  </div>
                )}
                <div className="shrink-0 z-10 pl-3 border-l border-white/20">
                  <span className="font-mono text-cyan-300 font-black text-base sm:text-xl">
                    {sec}s
                  </span>
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
  hopeStarActive = false,
  roundLabel = "ĐÁP ÁN",
}: {
  answerText: string;
  points?: number;
  hopeStarActive?: boolean;
  roundLabel?: string;
}) {
  const W = 920;
  const H = 68;
  const thick = 20;
  const cThick = 16;
  const pad = Math.round(cThick * 1.5);
  const shell = buildArrowShell({ W, H, slantRatio: 0.3571, thick, cThick, pad });
  const dc = shell.canvasW / 2 - shell.startX / 2;
  const fullText = points ? `${answerText} (${points}đ)` : answerText;
  const fs = fullText.length > 45 ? "19" : fullText.length > 30 ? "22" : "25";

  return (
    <div className="w-full flex items-center justify-center p-2 select-none">
      <style>{`
        @keyframes v3-ans-wing-l-g1 {
          0% { transform: translateX(calc(var(--dc))); opacity: 0.35; }
          15% { transform: translateX(calc(var(--dc))); opacity: 0.35; }
          50% { transform: translateX(-24px); opacity: 0.35; }
          100% { transform: translateX(0); opacity: 0.35; }
        }
        @keyframes v3-ans-wing-l-g2 {
          0% { transform: translateX(calc(var(--dc))); opacity: 0.65; }
          15% { transform: translateX(calc(var(--dc))); opacity: 0.65; }
          50% { transform: translateX(-12px); opacity: 0.65; }
          100% { transform: translateX(0); opacity: 0.65; }
        }
        @keyframes v3-ans-wing-l-l3 {
          0% { transform: translateX(calc(var(--dc))); opacity: 1; }
          15% { transform: translateX(calc(var(--dc))); opacity: 1; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes v3-ans-wing-r-g1 {
          0% { transform: translateX(calc(var(--dc) * -1)); opacity: 0.35; }
          15% { transform: translateX(calc(var(--dc) * -1)); opacity: 0.35; }
          50% { transform: translateX(24px); opacity: 0.35; }
          100% { transform: translateX(0); opacity: 0.35; }
        }
        @keyframes v3-ans-wing-r-g2 {
          0% { transform: translateX(calc(var(--dc) * -1)); opacity: 0.65; }
          15% { transform: translateX(calc(var(--dc) * -1)); opacity: 0.65; }
          50% { transform: translateX(12px); opacity: 0.65; }
          100% { transform: translateX(0); opacity: 0.65; }
        }
        @keyframes v3-ans-wing-r-l3 {
          0% { transform: translateX(calc(var(--dc) * -1)); opacity: 1; }
          15% { transform: translateX(calc(var(--dc) * -1)); opacity: 1; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes v3-ans-hex {
          0% { clip-path: inset(0 50% 0 50%); opacity: 0; }
          15% { opacity: 1; }
          100% { clip-path: inset(0 0% 0 0%); opacity: 1; }
        }
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
        {hopeStarActive && (
          <div
            className="absolute z-30 pointer-events-none"
            style={{
              top: -24,
              right: 20,
              filter: "drop-shadow(0 4px 14px rgba(0,0,0,0.9))",
            }}
          >
            <HopeStarBadge size={72} />
          </div>
        )}
        <V3ScaledStage designW={shell.canvasW} designH={H}>
          <svg
            width={shell.canvasW}
            height={H}
            viewBox={`0 0 ${shell.canvasW} ${H}`}
            className="overflow-visible"
          >
            <defs>
              <linearGradient id="v3SingleAnsWing" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#1fd1ff" />
                <stop offset="100%" stopColor="#2ee6ff" />
              </linearGradient>
              <linearGradient id="v3SingleAnsBg" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#064e3b" />
                <stop offset="50%" stopColor="#047857" />
                <stop offset="100%" stopColor="#065f46" />
              </linearGradient>
            </defs>

            {/* Left 3-layer cyan wings + navy chevron */}
            <g className="v3-ans-wing-l-g1">
              <path d={toSvgPath(shell.alcPts)} fill="url(#v3SingleAnsWing)" opacity={0.35} />
            </g>
            <g className="v3-ans-wing-l-g2">
              <path d={toSvgPath(shell.alcPts)} fill="url(#v3SingleAnsWing)" opacity={0.65} />
            </g>
            <g className="v3-ans-wing-l-l3">
              <path d={toSvgPath(shell.alcPts)} fill="url(#v3SingleAnsWing)" opacity={1.0} />
              <path d={toSvgPath(shell.alnPts)} fill="#0d2c54" stroke="#d1d5db" strokeWidth={1.5} />
            </g>

            {/* Right navy chevron + 3-layer cyan wings */}
            <g className="v3-ans-wing-r-l3">
              <path d={toSvgPath(shell.arnPts)} fill="#0d2c54" stroke="#d1d5db" strokeWidth={1.5} />
              <path d={toSvgPath(shell.arcPts)} fill="url(#v3SingleAnsWing)" opacity={1.0} />
            </g>
            <g className="v3-ans-wing-r-g2">
              <path d={toSvgPath(shell.arcPts)} fill="url(#v3SingleAnsWing)" opacity={0.65} />
            </g>
            <g className="v3-ans-wing-r-g1">
              <path d={toSvgPath(shell.arcPts)} fill="url(#v3SingleAnsWing)" opacity={0.35} />
            </g>

            {/* Hexagon Body (Expands from center) */}
            <g className="v3-ans-hex">
              <path d={toSvgPath(shell.bgPts)} fill="url(#v3SingleAnsBg)" stroke="#10b981" strokeWidth={2.5} />
            </g>

            {/* Text Content (Pure white text centered across full bar, zero label collision) */}
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

export function SummaryLowerThirdGraphic({
  state,
  onNext,
  onPrev,
  onClose,
}: SummaryLowerThirdGraphicProps) {
  const sm = state.summaryState;
  if (!sm || !sm.active || sm.orderedSeats.length === 0) return null;

  // 1. Sort ascending by score (lowest to highest), tie-break by seatId ascending
  const sorted = [...sm.orderedSeats].sort((a, b) => {
    const sa = state.seats[a]?.score ?? 0;
    const sb = state.seats[b]?.score ?? 0;
    if (sa !== sb) return sa - sb;
    return a - b;
  });

  const [localIdx, setLocalIdx] = useState(sm.currentIndex ?? 0);

  useEffect(() => {
    if (sm.currentIndex != null) {
      setLocalIdx(sm.currentIndex);
    }
  }, [sm.currentIndex]);

  const currentIdx = Math.min(localIdx, sorted.length - 1);
  const currentSeatId = sorted[currentIdx];
  const currentSeat = state.seats[currentSeatId];
  const currentScore = currentSeat?.score ?? 0;
  const currentName = currentSeat?.name || `THÍ SINH ${currentSeatId + 1}`;
  const isLast = currentIdx >= sorted.length - 1;

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

  const W = 1000;
  const H = 268;
  const shell = buildArrowShell({ W, H, slantRatio: 0.15, thick: 28, cThick: 20 });

  const isFs = Boolean(sm.isFullscreen || state.overlayMode === "FULLSCREEN");

  return (
    <div
      className={
        isFs
          ? "absolute inset-0 z-50 flex flex-col items-center justify-center p-4 bg-[#040e24]/85 backdrop-blur-md animate-fade-in pointer-events-auto select-none cursor-pointer"
          : "absolute inset-0 z-50 flex flex-col items-center justify-end pb-8 sm:pb-12 bg-transparent pointer-events-auto select-none cursor-pointer"
      }
      onClick={handleNext}
    >
      <V3ScaledStage designW={shell.canvasW} designH={H}>
        <div className="relative w-full h-full shadow-[0_20px_60px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden">
          {/* Authentic V3 Arrow Frame */}
          <svg
            width={shell.canvasW}
            height={H}
            viewBox={`0 0 ${shell.canvasW} ${H}`}
            className="absolute inset-0 overflow-visible pointer-events-none"
          >
            <defs>
              <linearGradient id="smCyanWing" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#1fd1ff" />
                <stop offset="100%" stopColor="#2ee6ff" />
              </linearGradient>
              <linearGradient id="smBodyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#081e4a" />
                <stop offset="45%" stopColor="#051433" />
                <stop offset="100%" stopColor="#030b1e" />
              </linearGradient>
            </defs>

            {/* Left cyan wing & navy chevron */}
            <path d={toSvgPath(shell.alcPts)} fill="url(#smCyanWing)" stroke="#ffffff" strokeWidth="2" />
            <path d={toSvgPath(shell.alnPts)} fill="#0d2c54" stroke="#d1d5db" strokeWidth="2" />

            {/* Right navy chevron & cyan wing */}
            <path d={toSvgPath(shell.arnPts)} fill="#0d2c54" stroke="#d1d5db" strokeWidth="2" />
            <path d={toSvgPath(shell.arcPts)} fill="url(#smCyanWing)" stroke="#ffffff" strokeWidth="2" />

            {/* Hexagon Body */}
            <path d={toSvgPath(shell.bgPts)} fill="url(#smBodyGrad)" stroke="#d1d5db" strokeWidth="2.5" />
          </svg>

          {/* Dòng xanh phía trên: Hiện TÊN THÍ SINH ĐƠN NHẤT */}
          <div
            className="relative z-10 w-full h-[64px] flex items-center justify-center border-b border-cyan-400/50 px-12"
            style={{
              clipPath: `polygon(${toPoly(shell.bgPts)})`,
              background:
                "linear-gradient(90deg, #07265a 0%, #0d47a1 20%, #00b4ff 50%, #0d47a1 80%, #07265a 100%)",
            }}
          >
            <span className="font-black text-2xl sm:text-3xl text-white tracking-[0.2em] uppercase drop-shadow-[0_2px_10px_rgba(0,195,255,0.85)] truncate">
              {currentName}
            </span>
          </div>

          {/* Khoang bên dưới: ĐIỂM SỐ (chỉ có số, không có từ gì kèm theo, cỡ cực lớn) */}
          <div
            className="relative z-10 flex-1 flex items-center justify-center"
            style={{ clipPath: `polygon(${toPoly(shell.bgPts)})` }}
          >
            <span
              key={`${currentSeatId}-${currentScore}`}
              className="font-black font-mono text-[130px] sm:text-[150px] leading-none text-white tracking-tight animate-in zoom-in-75 duration-300"
              style={{
                filter:
                  "drop-shadow(0 6px 20px rgba(0, 180, 255, 0.45)) drop-shadow(0 10px 30px rgba(0,0,0,0.95))",
              }}
            >
              {currentScore}
            </span>
          </div>
        </div>
      </V3ScaledStage>

      {/* Host Controls & Status Pill below graphic */}
      <div
        className="mt-6 flex items-center gap-4 z-20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-1.5 rounded-full bg-slate-900/90 border border-cyan-400/40 text-cyan-200 text-xs sm:text-sm font-bold tracking-wider shadow-lg">
          Thí sinh {currentIdx + 1} / {sorted.length} (Bấm Space / Click để chuyển)
        </div>
        {onClose && isLast && (
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 rounded-full bg-red-600/90 hover:bg-red-500 border border-red-300 text-white text-xs sm:text-sm font-black uppercase tracking-wider shadow-xl transition-transform active:scale-95"
          >
            Đóng đồ họa (ESC)
          </button>
        )}
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
              <span
                className={`text-[12px] sm:text-[14px] font-black uppercase tracking-wider truncate px-3 ${textClass}`}
                style={{
                  display: "inline-block",
                  textShadow:
                    isBuzzed || isActive
                      ? "0 2px 8px rgba(0,0,0,0.9)"
                      : "0 1px 3px rgba(0,0,0,0.8)",
                }}
              >
                {displayText}
              </span>
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
  runAnim = true,
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
  runAnim?: boolean;
  children?: React.ReactNode;
}) {
  const isFs = overlayMode === "FULLSCREEN";
  const isVeDich = state.currentRound === "veDich";
  const W = 1000;
  const H = isVeDich ? 200 : 186;
  const cThick = Math.round(H * 0.16);
  const pad = Math.round(cThick * 1.5);
  const shell = buildArrowShell({ W, H, slantRatio: 0.3571, pad });
  const seats = activeSeats(state);
  const n = seats.length;
  const lt = buildLowerThirdLayout(shell, n, isVeDich ? "VE_DICH" : "KHOI_DONG", { tabH: 42 });
  const packStrip = isVeDich ? buildClusterPackStrip(shell, lt, 3, 36) : null;

  const targetSeatId = buzzedSeatId ?? activeSeatId;
  const activeSeat = targetSeatId != null ? state.seats[targetSeatId] : null;
  const displayScore = activeSeat ? activeSeat.score : 0;
  const vd = state.veDich;
  const currentPkg = vd && vd.packages[activeSeatId ?? 0];

  const fillRef = useRef<HTMLDivElement>(null);
  const [countdownSec, setCountdownSec] = useState<number | null>(null);

  useEffect(() => {
    if (!timer || timer.startedAt == null) {
      if (fillRef.current) fillRef.current.style.width = "100%";
      setCountdownSec(null);
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

      const sec = Math.ceil(rem / 1000);
      setCountdownSec(rem > 0 ? sec : null);

      if (fillRef.current) {
        fillRef.current.style.width = `${pct}%`;
        fillRef.current.style.background =
          pct <= 25
            ? "linear-gradient(90deg, #dc2626, #ef4444)"
            : "linear-gradient(90deg, #0284c7, #38bdf8)";
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

  const strLen = typeof questionText === "string" ? questionText.length : 60;
  const fontSizeClass =
    strLen > 220
      ? "text-[18px] sm:text-[19px] md:text-[20px] leading-normal font-bold"
      : strLen > 140
      ? "text-[21px] sm:text-[22px] md:text-[23px] leading-snug font-extrabold"
      : strLen > 75
      ? "text-[24px] sm:text-[26px] md:text-[27px] leading-snug font-black"
      : "text-[28px] sm:text-[31px] md:text-[33px] leading-snug font-black";

  const qLeft = shell.startX + shell.pS + 12;
  const qRight = isVeDich && lt.clusterLine ? lt.clusterLine.x0 - 16 : shell.endX - shell.pS - 12;
  const qWidth = qRight - qLeft;
  const dc = shell.canvasW / 2 - shell.startX / 2;

  return (
    <div
      className={
        isFs
          ? "absolute inset-0 z-30 flex flex-col items-center justify-center p-4 sm:p-8 bg-[#051126]/90 backdrop-blur-md pointer-events-auto"
          : "w-full max-w-[94vw] 2xl:max-w-[95vw] mx-auto px-1 sm:px-2 pb-2 pt-1 z-20 pointer-events-auto relative"
      }
    >
      {countdownSec != null && countdownSec > 0 && (
        <div className="absolute -top-12 sm:-top-16 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex items-center justify-center animate-fade-in">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-red-500 to-rose-700 border-2 border-white shadow-[0_0_25px_rgba(239,68,68,0.95)] flex items-center justify-center text-white font-black text-2xl sm:text-3xl font-sans drop-shadow animate-pulse">
            {countdownSec}
          </div>
        </div>
      )}

      {extraTopBanner && <div className="mb-2 w-full max-w-[94vw] 2xl:max-w-[95vw] mx-auto">{extraTopBanner}</div>}

      <div className="relative w-full flex items-center justify-center select-none" style={{ ["--dc" as string]: `${dc}px` }}>
        <style>{`
          /* --- ECONOVA LOWER THIRD MASTER TIMELINE --- */
          /* Left direction keyframes (Pointing <) - Fly from right (+50vw) across to center */
          @keyframes v3-eco-l-g1 {
            0%   { transform: translateX(calc(var(--dc) + 50vw)) scale(0.1); opacity: 0; }
            1%   { opacity: 0.35; }
            25%  { transform: translateX(calc(var(--dc) - 24px)) scale(1); opacity: 0.35; }
            35%  { transform: translateX(var(--dc)) scale(1); opacity: 0.35; }
            45%  { transform: translateX(var(--dc)) scale(1); opacity: 0.35; }
            80%  { transform: translateX(0) scale(1); opacity: 0.35; }
            100% { transform: translateX(0) scale(1); opacity: 0.35; }
          }
          @keyframes v3-eco-l-g2 {
            0%   { transform: translateX(calc(var(--dc) + 50vw)) scale(0.1); opacity: 0; }
            5%   { opacity: 0.65; }
            30%  { transform: translateX(calc(var(--dc) - 12px)) scale(1); opacity: 0.65; }
            35%  { transform: translateX(var(--dc)) scale(1); opacity: 0.65; }
            45%  { transform: translateX(var(--dc)) scale(1); opacity: 0.65; }
            80%  { transform: translateX(0) scale(1); opacity: 0.65; }
            100% { transform: translateX(0) scale(1); opacity: 0.65; }
          }
          @keyframes v3-eco-l-l3 {
            0%   { transform: translateX(calc(var(--dc) + 50vw)) scale(0.1); opacity: 0; }
            10%  { opacity: 1; }
            35%  { transform: translateX(var(--dc)) scale(1); opacity: 1; }
            45%  { transform: translateX(var(--dc)) scale(1); opacity: 1; }
            80%  { transform: translateX(0) scale(1); opacity: 1; }
            100% { transform: translateX(0) scale(1); opacity: 1; }
          }
          @keyframes v3-eco-l-navy {
            0%   { transform: translateX(calc(var(--dc) + 50vw)) scale(0.1); opacity: 0; }
            10%  { opacity: 1; }
            35%  { transform: translateX(var(--dc)) scale(1); opacity: 1; }
            45%  { transform: translateX(var(--dc)) scale(1); opacity: 1; }
            80%  { transform: translateX(0) scale(1); opacity: 1; }
            100% { transform: translateX(0) scale(1); opacity: 1; }
          }

          /* Right direction keyframes (Pointing >) - Fly from left (-50vw) across to center */
          @keyframes v3-eco-r-g1 {
            0%   { transform: translateX(calc(var(--dc) * -1 - 50vw)) scale(0.1); opacity: 0; }
            1%   { opacity: 0.35; }
            25%  { transform: translateX(calc(var(--dc) * -1 + 24px)) scale(1); opacity: 0.35; }
            35%  { transform: translateX(calc(var(--dc) * -1)) scale(1); opacity: 0.35; }
            45%  { transform: translateX(calc(var(--dc) * -1)) scale(1); opacity: 0.35; }
            80%  { transform: translateX(0) scale(1); opacity: 0.35; }
            100% { transform: translateX(0) scale(1); opacity: 0.35; }
          }
          @keyframes v3-eco-r-g2 {
            0%   { transform: translateX(calc(var(--dc) * -1 - 50vw)) scale(0.1); opacity: 0; }
            5%   { opacity: 0.65; }
            30%  { transform: translateX(calc(var(--dc) * -1 + 12px)) scale(1); opacity: 0.65; }
            35%  { transform: translateX(calc(var(--dc) * -1)) scale(1); opacity: 0.65; }
            45%  { transform: translateX(calc(var(--dc) * -1)) scale(1); opacity: 0.65; }
            80%  { transform: translateX(0) scale(1); opacity: 0.65; }
            100% { transform: translateX(0) scale(1); opacity: 0.65; }
          }
          @keyframes v3-eco-r-l3 {
            0%   { transform: translateX(calc(var(--dc) * -1 - 50vw)) scale(0.1); opacity: 0; }
            10%  { opacity: 1; }
            35%  { transform: translateX(calc(var(--dc) * -1)) scale(1); opacity: 1; }
            45%  { transform: translateX(calc(var(--dc) * -1)) scale(1); opacity: 1; }
            80%  { transform: translateX(0) scale(1); opacity: 1; }
            100% { transform: translateX(0) scale(1); opacity: 1; }
          }
          @keyframes v3-eco-r-navy {
            0%   { transform: translateX(calc(var(--dc) * -1 - 50vw)) scale(0.1); opacity: 0; }
            10%  { opacity: 1; }
            35%  { transform: translateX(calc(var(--dc) * -1)) scale(1); opacity: 1; }
            45%  { transform: translateX(calc(var(--dc) * -1)) scale(1); opacity: 1; }
            80%  { transform: translateX(0) scale(1); opacity: 1; }
            100% { transform: translateX(0) scale(1); opacity: 1; }
          }

          /* Hexagon Body Expand from center at 45% to 80% */
          @keyframes v3-eco-hex-body {
            0%, 44.9% { clip-path: inset(0 50% 0 50%); opacity: 0; }
            45%       { clip-path: inset(0 50% 0 50%); opacity: 1; animation-timing-function: cubic-bezier(0.25, 1, 0.5, 1); }
            80%       { clip-path: inset(0 0% 0 0%); opacity: 1; }
            100%      { clip-path: inset(0 0% 0 0%); opacity: 1; }
          }

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
        `}</style>
        <V3ScaledStage designW={shell.canvasW} designH={H}>
          {/* Authentic Floating Hope Star Badge at top-right of score cluster */}
          {hopeStarActive && (
            <div
              className="absolute z-30 pointer-events-none transition-all duration-300 animate-in zoom-in-50"
              style={{
                top: -24,
                right: 12,
                filter: "drop-shadow(0 4px 14px rgba(0,0,0,0.9))",
              }}
            >
              <HopeStarBadge size={76} />
            </div>
          )}

          {/* Broadcast Question Counter Badge (0/6 .. 6/6) & Subject Header */}
          {(questionNumberBadge || headerBadge) && (
            <div
              className={`absolute z-30 pointer-events-none flex items-center gap-2 select-none ${
                runAnim ? "v3-anim-content" : ""
              }`}
              style={{
                top: -26,
                left: qLeft,
              }}
            >
              {questionNumberBadge && (
                <div
                  className="px-3 py-0.5 rounded-t-lg font-black text-xs sm:text-sm tracking-widest uppercase flex items-center gap-1.5 shadow-[0_0_15px_rgba(251,191,36,0.5)] border-t border-x border-amber-300/60"
                  style={{
                    background: "linear-gradient(135deg, #091a42 0%, #061129 100%)",
                    color: "#fbbf24",
                  }}
                >
                  <span>🎯</span>
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
          )}

          {/* Master SVG Arrow Frame & Geometry */}
          <svg
            width={shell.canvasW}
            height={H}
            viewBox={`0 0 ${shell.canvasW} ${H}`}
            className="absolute inset-0 overflow-visible pointer-events-none"
          >
            <defs>
              <linearGradient id="ltCyanWing" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#1fd1ff" />
                <stop offset="100%" stopColor="#2ee6ff" />
              </linearGradient>
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
                <stop offset="0%" stopColor="#1fd1ff" />
                <stop offset="100%" stopColor="#2ee6ff" />
              </linearGradient>
              <linearGradient id="ltTabBuzzed" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ff3838" />
                <stop offset="100%" stopColor="#b30000" />
              </linearGradient>
            </defs>

            {/* Left cyan wing & navy chevron with Econova motion cushion */}
            <g className={runAnim ? "v3-anim-l-g1" : ""} opacity={runAnim ? undefined : 0.3}>
              <path d={toSvgPath(shell.alcPts)} fill="url(#ltCyanWing)" />
            </g>
            <g className={runAnim ? "v3-anim-l-g2" : ""} opacity={runAnim ? undefined : 0.65}>
              <path d={toSvgPath(shell.alcPts)} fill="url(#ltCyanWing)" />
            </g>
            <g className={runAnim ? "v3-anim-l-l3" : ""}>
              <path d={toSvgPath(shell.alcPts)} fill="url(#ltCyanWing)" />
            </g>
            <g className={runAnim ? "v3-anim-l-navy" : ""}>
              <path d={toSvgPath(shell.alnPts)} fill="#0d2c54" stroke="#d1d5db" strokeWidth={2} />
            </g>

            {/* Right navy chevron & cyan wing with Econova motion cushion */}
            <g className={runAnim ? "v3-anim-r-navy" : ""}>
              <path d={toSvgPath(shell.arnPts)} fill="#0d2c54" stroke="#d1d5db" strokeWidth={2} />
            </g>
            <g className={runAnim ? "v3-anim-r-l3" : ""}>
              <path d={toSvgPath(shell.arcPts)} fill="url(#ltCyanWing)" />
            </g>
            <g className={runAnim ? "v3-anim-r-g2" : ""} opacity={runAnim ? undefined : 0.65}>
              <path d={toSvgPath(shell.arcPts)} fill="url(#ltCyanWing)" />
            </g>
            <g className={runAnim ? "v3-anim-r-g1" : ""} opacity={runAnim ? undefined : 0.3}>
              <path d={toSvgPath(shell.arcPts)} fill="url(#ltCyanWing)" />
            </g>

            {/* Hexagon Body Background (Expands from center) */}
            <g className={runAnim ? "v3-anim-body" : ""}>
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

                  const displayText =
                    isVeDich && isActive ? seat.name : `${seat.name} (${seat.score})`;

                  return (
                    <g key={seat.id} className={isBuzzed ? "v3a-buzz" : ""}>
                      <path
                        d={toSvgPath(tab.pts)}
                        fill={fillUrl}
                        stroke="rgba(0, 207, 255, 0.35)"
                        strokeWidth="1"
                      />
                      <text
                        x={tab.cx}
                        y={tab.cy + 6}
                        textAnchor="middle"
                        fill={isLocked ? "#64748b" : "#ffffff"}
                        fontWeight="900"
                        fontSize="16"
                        letterSpacing="0.04em"
                        className="uppercase font-sans"
                        style={{
                          filter: isBuzzed || isActive ? "drop-shadow(0 2px 6px rgba(0,0,0,0.9))" : "none",
                        }}
                      >
                        {displayText}
                      </text>
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

                  {/* Big Score Display */}
                  <text
                    x={(lt.clusterLine.x0 + shell.endX) / 2}
                    y={82}
                    textAnchor="middle"
                    fill="#fbbf24"
                    fontWeight="900"
                    fontSize="42"
                    fontFamily="monospace"
                    letterSpacing="-0.03em"
                    style={{ filter: "drop-shadow(0 0 16px rgba(251,191,36,0.7))" }}
                  >
                    {displayScore}
                  </text>

                  {/* Package strip at bottom */}
                  {packStrip &&
                    packStrip.cells.map((cell, pIdx) => {
                      const qPoints = currentPkg?.[pIdx]?.points ?? (pIdx === 0 ? 20 : 30);
                      const isCurQ = vd?.qIdx === pIdx;

                      return (
                        <g key={`pack-${pIdx}`}>
                          <path
                            d={toSvgPath(cell.pts)}
                            fill={isCurQ ? "#0284c7" : "rgba(5, 20, 51, 0.9)"}
                            stroke="rgba(255,255,255,0.4)"
                            strokeWidth="1"
                          />
                          <text
                            x={cell.cx}
                            y={cell.cy + 5}
                            textAnchor="middle"
                            fill={isCurQ ? "#ffffff" : "#cbd5e1"}
                            fontWeight="900"
                            fontSize="13"
                            fontFamily="sans-serif"
                          >
                            {qPoints}
                          </text>
                        </g>
                      );
                    })}
                </g>
              )}
            </g>
          </svg>

          {/* HTML Question Chamber: TOP-LEFT ALIGNED (items-start, text-left) */}
          <div
            className={`absolute flex flex-col justify-start items-start text-left z-20 overflow-hidden ${
              runAnim ? "v3-anim-content" : ""
            }`}
            style={{
              left: qLeft,
              top: showScoreTab ? 48 : 16,
              width: qWidth,
              height: H - (showScoreTab ? 62 : 30),
            }}
          >
            {questionText ? (
              <div
                key={typeof questionText === "string" ? questionText.slice(0, 40) : undefined}
                className={`text-white text-left tracking-normal ${fontSizeClass} drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] max-h-full w-full pt-1 pr-3 v3-anim-swap select-none`}
              >
                {questionText}
              </div>
            ) : null}
            {mediaElement && <div className="mt-1">{mediaElement}</div>}
            {children}
          </div>

          {/* Timer bar at bottom of hexagon */}
          {timer && timer.startedAt != null && (
            <div
              className="absolute bottom-1 z-30 h-1.5 rounded-full overflow-hidden"
              style={{
                left: qLeft,
                width: qWidth,
                background: "rgba(255,255,255,0.15)",
              }}
            >
              <div ref={fillRef} className="h-full transition-all duration-100 ease-linear" />
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

  const spec = resolveVeDichGridSpec(state.rulesetId, state.o22Quarter);
  if (pointOptions && pointOptions.length > 0 && spec.mode === "columns") {
    spec.values = [...pointOptions];
    spec.rows = pointOptions.length;
  }

  const isV3Arrow = state.themeMode !== "o26_classic";
  const W = 1080;
  const H = 360;
  const shell = buildArrowShell({ W, H, slantRatio: 0.25, thick: 36, cThick: 28 });
  const cells = buildVeDichGrid(shell, spec);

  if (!isV3Arrow) {
    return (
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 pointer-events-auto">
        <Vtv3ChalkboardBackdrop />
        <div className="relative z-10 w-full max-w-4xl flex flex-col items-center gap-6 animate-fade-in">
          <div className="px-8 py-2.5 rounded-full bg-slate-900/90 border-2 border-amber-400 text-amber-300 font-black text-base sm:text-xl uppercase tracking-widest shadow-xl">
            GÓI CÂU HỎI VỀ ĐÍCH — {owner?.name || `Thí sinh ${resolvedOwnerId + 1}`}
          </div>
          <div className="flex items-center justify-center gap-5 sm:gap-8">
            {Array.from({ length: spec.cols }).map((_, cIdx) => {
              const pt = resolvedSelected?.[cIdx];
              return (
                <div
                  key={cIdx}
                  className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl border-4 border-amber-400 bg-gradient-to-b from-slate-800 to-slate-950 flex flex-col items-center justify-center shadow-2xl"
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

  const colW = W / spec.cols;
  const slope = shell.slope;
  const midY = shell.midY;
  const L = shell.startX;
  const xDiv = (k: number, y: number) => L + k * colW + slope * (midY - y);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-4 z-20 pointer-events-auto animate-fade-in flex flex-col items-center gap-3 select-none">
      {/* Contestant Header Pill */}
      <div className="px-6 py-1.5 rounded-full bg-[#08203f]/95 border border-cyan-400/80 text-cyan-200 font-black text-xs sm:text-sm uppercase tracking-widest shadow-lg">
        LỰA CHỌN GÓI CÂU HỎI — {owner?.name || `THÍ SINH ${resolvedOwnerId + 1}`}
      </div>

      {/* Main Hexagonal Grid Chamber: 100% Geometry Parity with Olympia 26 Wiki */}
      <div className="relative w-full max-w-4xl flex items-center justify-center">
        <V3ScaledStage designW={shell.canvasW} designH={H}>
          <svg
            width={shell.canvasW}
            height={H}
            viewBox={`0 0 ${shell.canvasW} ${H}`}
            className="overflow-visible"
          >
            <defs>
              <linearGradient id="vdGridCyanWing" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#1fd1ff" />
                <stop offset="100%" stopColor="#2ee6ff" />
              </linearGradient>
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

            {/* Left cyan wing & navy chevron */}
            <path d={toSvgPath(shell.alcPts)} fill="url(#vdGridCyanWing)" stroke="#ffffff" strokeWidth="2" />
            <path d={toSvgPath(shell.alnPts)} fill="#0d2c54" stroke="#c5d0db" strokeWidth="2.5" />

            {/* Right navy chevron & cyan wing */}
            <path d={toSvgPath(shell.arnPts)} fill="#0d2c54" stroke="#c5d0db" strokeWidth="2.5" />
            <path d={toSvgPath(shell.arcPts)} fill="url(#vdGridCyanWing)" stroke="#ffffff" strokeWidth="2" />

            {/* Base Hexagon Background */}
            <path d={toSvgPath(shell.bgPts)} fill="#051433" />

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
          </svg>
        </V3ScaledStage>
      </div>
    </div>
  );
}
