"use client";

import React, { useEffect, useRef } from "react";
import { getServerClockOffset } from "@/lib/clock-sync";

interface ContinuousTimerBarProps {
  endsAt?: number;
  total: number;
  color?: string;
  className?: string;
  heightClassName?: string;
  isPaused?: boolean;
}

/**
 * 60fps Hardware-Accelerated Smooth Timer Progress Bar
 * Runs continuously based on authoritative epoch ms without 1-second step-jumps.
 */
export function ContinuousTimerBar({
  endsAt,
  total,
  color = "#06b6d4",
  className = "",
  heightClassName = "h-2",
  isPaused = false,
}: ContinuousTimerBarProps) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!barRef.current) return;
    if (!endsAt || endsAt <= 0 || total <= 0 || isPaused) {
      if (!endsAt || endsAt <= 0) {
        barRef.current.style.width = "100%";
      }
      return;
    }

    let animId: number;

    const tick = () => {
      if (!barRef.current) return;
      const now = Date.now() + getServerClockOffset();
      const msRemaining = Math.max(0, endsAt - now);
      const pct = Math.max(0, Math.min(100, (msRemaining / (total * 1000)) * 100));

      barRef.current.style.width = `${pct}%`;

      if (msRemaining > 0 && !isPaused) {
        animId = requestAnimationFrame(tick);
      }
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [endsAt, total, isPaused]);

  return (
    <div className={`w-full bg-slate-800/80 rounded-full overflow-hidden ${heightClassName} ${className}`}>
      <div
        ref={barRef}
        className="h-full rounded-full transition-none will-change-[width]"
        style={{
          width: "100%",
          background: color,
        }}
      />
    </div>
  );
}

interface ContinuousTimerRingProps {
  endsAt?: number;
  total: number;
  radius?: number;
  strokeWidth?: number;
  color?: string;
  remainingText?: number | string;
  className?: string;
  isPaused?: boolean;
}

/**
 * 60fps Smooth Circular SVG Timer Ring
 * Rotates smoothly without 1-second stepped jumps.
 */
export function ContinuousTimerRing({
  endsAt,
  total,
  radius = 28,
  strokeWidth = 6,
  color = "#06b6d4",
  remainingText,
  className = "",
  isPaused = false,
}: ContinuousTimerRingProps) {
  const circleRef = useRef<SVGCircleElement>(null);
  const circumference = 2 * Math.PI * radius;
  const size = (radius + strokeWidth) * 2;
  const center = radius + strokeWidth;

  useEffect(() => {
    if (!circleRef.current) return;
    if (!endsAt || endsAt <= 0 || total <= 0 || isPaused) {
      if (!endsAt || endsAt <= 0) {
        circleRef.current.style.strokeDashoffset = "0";
      }
      return;
    }

    let animId: number;

    const tick = () => {
      if (!circleRef.current) return;
      const now = Date.now() + getServerClockOffset();
      const msRemaining = Math.max(0, endsAt - now);
      const pct = Math.max(0, Math.min(100, (msRemaining / (total * 1000)) * 100));

      circleRef.current.style.strokeDashoffset = `${circumference * (1 - pct / 100)}`;

      if (msRemaining > 0 && !isPaused) {
        animId = requestAnimationFrame(tick);
      }
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [endsAt, total, circumference, isPaused]);

  return (
    <svg className={`shrink-0 ${className}`} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#2d2d5a"
        strokeWidth={strokeWidth}
      />
      <circle
        ref={circleRef}
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${circumference}`}
        strokeDashoffset="0"
        strokeLinecap="round"
        className="transition-none will-change-[stroke-dashoffset]"
      />
      {remainingText !== undefined && (
        <text
          x={center}
          y={center + Math.round(radius * 0.35)}
          textAnchor="middle"
          fill="white"
          fontSize={Math.round(radius * 0.7)}
          fontWeight="bold"
        >
          {remainingText}
        </text>
      )}
    </svg>
  );
}
