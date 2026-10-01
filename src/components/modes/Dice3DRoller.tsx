"use client";

import React, { useEffect, useState } from "react";

interface Dice3DRollerProps {
  value: number; // Final target value (1 to 6)
  isRolling: boolean;
  durationMs?: number; // Rolling duration in ms (default: 2200ms)
  onComplete?: () => void;
  className?: string;
  size?: number; // Size of dice in px (default: 80)
}

/**
 * Realistic 3D Cube Dice Roller
 * Features:
 * - 6-sided 3D perspective cube rendered via CSS 3D transforms
 * - Multi-axis tumbling roll animation with bounce & deceleration physics
 * - Dynamic scaling ground shadow that expands and contracts as the dice tumbles
 * - Dramatic face reveal with golden impact burst when it lands
 */
export default function Dice3DRoller({
  value,
  isRolling,
  durationMs = 2200,
  onComplete,
  className = "",
  size = 76,
}: Dice3DRollerProps) {
  const [phase, setPhase] = useState<"idle" | "rolling" | "landed">("idle");
  const [displayValue, setDisplayValue] = useState<number>(value || 6);

  // Rotation angles for each face to look directly at the camera
  // Face mapping:
  // 1: front (rotateX(0deg) rotateY(0deg))
  // 6: back (rotateX(180deg) rotateY(0deg))
  // 2: right (rotateY(-90deg))
  // 5: left (rotateY(90deg))
  // 3: top (rotateX(-90deg))
  // 4: bottom (rotateX(90deg))
  const faceRotations: Record<number, { x: number; y: number; z: number }> = {
    1: { x: 0, y: 0, z: 0 },
    2: { x: 0, y: -90, z: 0 },
    3: { x: -90, y: 0, z: 0 },
    4: { x: 90, y: 0, z: 0 },
    5: { x: 0, y: 90, z: 0 },
    6: { x: 180, y: 0, z: 0 },
  };

  const [currentRotation, setCurrentRotation] = useState<{ x: number; y: number; z: number }>({
    x: 0,
    y: 0,
    z: 0,
  });

  useEffect(() => {
    if (!isRolling) {
      const target = faceRotations[value] || faceRotations[1];
      setCurrentRotation(target);
      setDisplayValue(value);
      setPhase("idle");
      return;
    }

    setPhase("rolling");

    // Random extra spins (multiples of 360) + target face angle
    const target = faceRotations[value] || faceRotations[1];
    const extraSpinsX = (3 + Math.floor(Math.random() * 3)) * 360;
    const extraSpinsY = (3 + Math.floor(Math.random() * 3)) * 360;
    const extraSpinsZ = (1 + Math.floor(Math.random() * 2)) * 360;

    setCurrentRotation({
      x: target.x + extraSpinsX,
      y: target.y + extraSpinsY,
      z: target.z + extraSpinsZ,
    });

    const timer = setTimeout(() => {
      setPhase("landed");
      setDisplayValue(value);
      if (onComplete) onComplete();
    }, durationMs);

    return () => clearTimeout(timer);
  }, [isRolling, value, durationMs]);

  // Dot layout for each face (3x3 grid)
  const dotPositions: Record<number, number[]> = {
    1: [4],
    2: [2, 6],
    3: [2, 4, 6],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };

  const half = size / 2;

  const renderFace = (faceNumber: number, transformStyle: string) => {
    const dots = dotPositions[faceNumber] || [];
    const isPrimaryPip = faceNumber === 1 || faceNumber === 4;

    return (
      <div
        className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white via-[#f4f5f8] to-[#d8dce6] p-2.5 flex items-center justify-center border-2 border-[#b0b7c8] select-none"
        style={{
          transform: transformStyle,
          boxShadow: "inset 0 2px 4px rgba(255,255,255,0.9), inset 0 -3px 6px rgba(0,0,0,0.25), 0 0 4px rgba(0,0,0,0.15)",
          backfaceVisibility: "hidden",
        }}
      >
        <div className="grid grid-cols-3 grid-rows-3 w-full h-full gap-1 p-0.5">
          {Array.from({ length: 9 }).map((_, idx) => {
            const hasDot = dots.includes(idx);
            return (
              <div key={idx} className="flex items-center justify-center">
                {hasDot && (
                  <div
                    className={`rounded-full shadow-inner ${
                      isPrimaryPip && faceNumber === 1
                        ? "w-4 h-4 bg-gradient-to-br from-rose-500 to-red-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
                        : isPrimaryPip && faceNumber === 4
                        ? "w-3 h-3 bg-gradient-to-br from-rose-500 to-red-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
                        : "w-3 h-3 bg-gradient-to-br from-slate-800 to-black shadow-[inset_0_2px_3px_rgba(255,255,255,0.2)]"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      {/* 3D Perspective Canvas */}
      <div
        className="relative"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          perspective: "900px",
        }}
      >
        {/* Tumbling Cube */}
        <div
          className="w-full h-full relative"
          style={{
            transformStyle: "preserve-3d",
            transform: `rotateX(${currentRotation.x}deg) rotateY(${currentRotation.y}deg) rotateZ(${currentRotation.z}deg)`,
            transition: phase === "rolling"
              ? `transform ${durationMs}ms cubic-bezier(0.18, 0.89, 0.32, 1.15)`
              : "transform 400ms ease-out",
          }}
        >
          {/* Face 1: Front */}
          {renderFace(1, `translateZ(${half}px)`)}
          {/* Face 6: Back */}
          {renderFace(6, `rotateY(180deg) translateZ(${half}px)`)}
          {/* Face 2: Right */}
          {renderFace(2, `rotateY(90deg) translateZ(${half}px)`)}
          {/* Face 5: Left */}
          {renderFace(5, `rotateY(-90deg) translateZ(${half}px)`)}
          {/* Face 3: Top */}
          {renderFace(3, `rotateX(90deg) translateZ(${half}px)`)}
          {/* Face 4: Bottom */}
          {renderFace(4, `rotateX(-90deg) translateZ(${half}px)`)}
        </div>
      </div>

      {/* Dynamic Ground Shadow */}
      <div
        className="mt-3 h-3 rounded-full bg-black/60 filter blur-sm transition-all duration-300 pointer-events-none"
        style={{
          width: phase === "rolling" ? `${size * 0.7}px` : `${size * 0.9}px`,
          opacity: phase === "rolling" ? 0.35 : 0.75,
          transform: phase === "rolling" ? "scale(0.85)" : "scale(1)",
        }}
      />

      {/* Landed Celebration Banner */}
      {phase === "landed" && (
        <div className="absolute -bottom-7 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black text-xs shadow-lg border border-yellow-200 animate-bounce whitespace-nowrap z-30">
          🎲 {displayValue} NÚT!
        </div>
      )}
    </div>
  );
}
