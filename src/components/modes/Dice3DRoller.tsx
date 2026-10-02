"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";

export interface Dice3DRollerProps {
  value: number; // Final target value (1 to 6)
  isRolling: boolean;
  durationMs?: number; // Rolling duration in ms (default: 2100ms)
  onComplete?: () => void;
  className?: string;
  size?: number; // Size of dice in px (default: 68)
  simulateToss?: boolean;
  landingPos?: { x: number; y: number }; // Percentage 0-100 on board, guaranteed >20% away from edges
  originCorner?: 0 | 1 | 2 | 3; // 0: Top-Left, 1: Top-Right, 2: Bottom-Left, 3: Bottom-Right
  isDismissed?: boolean;
  onDismiss?: () => void;
}

/**
 * Realistic 3D Cube Dice Roller with Synchronized Mid-Air Flight Physics
 * Features:
 * - 6-sided 3D perspective cube rendered via CSS 3D transforms with rounded edges & pips
 * - Physical Flight Trajectory: Wild tumbling occurs in mid-air while flying into the board
 * - Impact & Ground Settle: Bounces twice, decelerates rotation, and comes to a dead stop on the table
 * - No Post-Landing Spinning: The dice stops spinning BEFORE settling; does NOT spin after landing
 * - Authoritative Synchronized Roll: Stops exactly on target value face
 * - Remains sitting on the gameboard at its landing spot after rolling completes
 */
export default function Dice3DRoller({
  value,
  isRolling,
  durationMs = 2100,
  onComplete,
  className = "",
  size = 68,
  simulateToss = false,
  landingPos = { x: 50, y: 50 },
  originCorner = 0,
  isDismissed = false,
  onDismiss,
}: Dice3DRollerProps) {
  const [phase, setPhase] = useState<"rolling" | "landed">(isRolling ? "rolling" : "landed");
  const [displayValue, setDisplayValue] = useState<number>(value || 6);

  // Rotation angles for each face to look directly at the camera
  const faceRotations: Record<number, { x: number; y: number; z: number }> = {
    1: { x: 0, y: 0, z: 0 },
    2: { x: 0, y: -90, z: 0 },
    3: { x: -90, y: 0, z: 0 },
    4: { x: 90, y: 0, z: 0 },
    5: { x: 0, y: 90, z: 0 },
    6: { x: 180, y: 0, z: 0 },
  };

  const targetRotation = useMemo(() => {
    return faceRotations[value] || faceRotations[1];
  }, [value]);

  // Clamp target coordinates to guarantee >20% clearance from board edges
  const safeTarget = useMemo(() => {
    const x = Math.min(75, Math.max(24, landingPos.x));
    const y = Math.min(70, Math.max(25, landingPos.y));
    return { x, y };
  }, [landingPos.x, landingPos.y]);

  // Corner start coordinates
  const cornerStarts = useMemo(
    () => [
      { x: -12, y: -12 }, // 0: Top-Left
      { x: 112, y: -12 }, // 1: Top-Right
      { x: -12, y: 112 }, // 2: Bottom-Left
      { x: 112, y: 112 }, // 3: Bottom-Right
    ],
    []
  );

  const startCoord = cornerStarts[originCorner] || cornerStarts[0];

  // Intermediate physical flight trajectory points
  // Mid-flight (t=0.38): High parabolic arc
  const midFlight = useMemo(
    () => ({
      x: startCoord.x + (safeTarget.x - startCoord.x) * 0.52,
      y: startCoord.y + (safeTarget.y - startCoord.y) * 0.48 - 6,
    }),
    [startCoord, safeTarget]
  );

  // Ground Impact 1 (t=0.68): Strikes table just 6% before destination
  const impact1 = useMemo(
    () => ({
      x: startCoord.x + (safeTarget.x - startCoord.x) * 0.94,
      y: startCoord.y + (safeTarget.y - startCoord.y) * 0.94,
    }),
    [startCoord, safeTarget]
  );

  // Rebound Bounce 1 Apex (t=0.80): Hops 2.5% up in air while flipping onto final face
  const bounceApex = useMemo(
    () => ({
      x: startCoord.x + (safeTarget.x - startCoord.x) * 0.98,
      y: startCoord.y + (safeTarget.y - startCoord.y) * 0.98 - 2.5,
    }),
    [startCoord, safeTarget]
  );

  // Mid-air rapid forward rotation keyframes:
  // All rapid tumble (1350 deg out of 1440 deg) happens 100% IN FLIGHT (0s to 1.36s).
  // During first bounce (1.36s to 1.6s), it flips the remaining 90 deg onto the target face.
  // After 1.6s (when settling and flat on the table), rotation is 100% STOPPED!
  const spinKeyframes = useMemo(() => {
    return {
      x: [
        targetRotation.x - 1440,
        targetRotation.x - 540,
        targetRotation.x - 90,
        targetRotation.x,
        targetRotation.x,
        targetRotation.x,
      ],
      y: [
        targetRotation.y - 1080,
        targetRotation.y - 360,
        targetRotation.y - 90,
        targetRotation.y,
        targetRotation.y,
        targetRotation.y,
      ],
      z: [
        targetRotation.z - 720,
        targetRotation.z - 180,
        targetRotation.z - 45,
        targetRotation.z,
        targetRotation.z,
        targetRotation.z,
      ],
    };
  }, [targetRotation]);

  useEffect(() => {
    if (!isRolling) {
      setPhase("landed");
      setDisplayValue(value);
      return;
    }

    setPhase("rolling");
    const timer = setTimeout(() => {
      setPhase("landed");
      setDisplayValue(value);
      if (onComplete) onComplete();
    }, durationMs);

    return () => clearTimeout(timer);
  }, [isRolling, value, durationMs, onComplete]);

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
        className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white via-[#f3f5f9] to-[#d3d8e5] p-2 flex items-center justify-center border-2 border-[#a4adbe] select-none shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),inset_0_-3px_6px_rgba(0,0,0,0.3)]"
        style={{
          transform: transformStyle,
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
                        ? "w-3.5 h-3.5 bg-gradient-to-br from-rose-500 to-red-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
                        : isPrimaryPip && faceNumber === 4
                        ? "w-2.5 h-2.5 bg-gradient-to-br from-rose-500 to-red-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
                        : "w-2.5 h-2.5 bg-gradient-to-br from-slate-800 to-black shadow-[inset_0_2px_3px_rgba(255,255,255,0.2)]"
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

  // Cube element with Framer Motion 3D rotation synchronized directly to flight timeline
  const cubeMesh = (
    <div
      className="relative select-none pointer-events-none"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        perspective: "900px",
      }}
    >
      <motion.div
        className="w-full h-full relative"
        style={{
          transformStyle: "preserve-3d",
        }}
        animate={
          phase === "rolling"
            ? {
                rotateX: spinKeyframes.x,
                rotateY: spinKeyframes.y,
                rotateZ: spinKeyframes.z,
              }
            : {
                rotateX: targetRotation.x,
                rotateY: targetRotation.y,
                rotateZ: targetRotation.z,
              }
        }
        transition={
          phase === "rolling"
            ? {
                duration: durationMs / 1000,
                times: [0, 0.38, 0.68, 0.80, 0.92, 1.0],
                ease: [0.22, 1, 0.36, 1],
              }
            : { duration: 0.1 }
        }
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
      </motion.div>
    </div>
  );

  // If simulateToss is enabled, animate flight across the gameboard
  if (simulateToss) {
    const isCurrentlyRolling = phase === "rolling";

    return (
      <motion.div
        className={`absolute z-30 pointer-events-none flex flex-col items-center justify-center ${className}`}
        initial={
          isCurrentlyRolling
            ? {
                left: `${startCoord.x}%`,
                top: `${startCoord.y}%`,
                scale: 1.85,
                opacity: 0.95,
              }
            : {
                left: `${safeTarget.x}%`,
                top: `${safeTarget.y}%`,
                scale: 1.0,
                opacity: 1,
              }
        }
        animate={
          isCurrentlyRolling
            ? {
                left: [
                  `${startCoord.x}%`,
                  `${midFlight.x}%`,
                  `${impact1.x}%`,
                  `${bounceApex.x}%`,
                  `${safeTarget.x}%`,
                  `${safeTarget.x}%`,
                ],
                top: [
                  `${startCoord.y}%`,
                  `${midFlight.y}%`,
                  `${impact1.y}%`,
                  `${bounceApex.y}%`,
                  `${safeTarget.y}%`,
                  `${safeTarget.y}%`,
                ],
                scale: [1.85, 1.55, 1.0, 1.1, 1.0, 1.0],
                opacity: [1, 1, 1, 1, 1, 1],
              }
            : isDismissed
            ? {
                left: "108%",
                top: "-12%",
                scale: 0.25,
                opacity: 0,
              }
            : {
                left: `${safeTarget.x}%`,
                top: `${safeTarget.y}%`,
                scale: 1.0,
                opacity: 1,
              }
        }
        transition={
          isCurrentlyRolling
            ? {
                duration: durationMs / 1000,
                times: [0, 0.38, 0.68, 0.80, 0.92, 1.0],
              }
            : isDismissed
            ? { duration: 0.45, ease: "easeInOut" }
            : { duration: 0.4, type: "spring", stiffness: 260, damping: 20 }
        }
        style={{
          transform: "translate(-50%, -50%)",
        }}
      >
        {cubeMesh}

        {/* Dynamic Ground Shadow that matches height & impacts */}
        <motion.div
          className="mt-2.5 h-2.5 rounded-full bg-black/80 filter blur-[3px] pointer-events-none"
          animate={
            isCurrentlyRolling
              ? {
                  width: [
                    `${size * 0.4}px`,
                    `${size * 0.65}px`,
                    `${size * 1.0}px`,
                    `${size * 0.8}px`,
                    `${size * 0.95}px`,
                    `${size * 0.95}px`,
                  ],
                  opacity: [0.15, 0.35, 0.85, 0.5, 0.8, 0.8],
                  scale: [0.5, 0.7, 1.0, 0.85, 1.0, 1.0],
                }
              : isDismissed
              ? {
                  width: "0px",
                  opacity: 0,
                  scale: 0,
                }
              : {
                  width: `${size * 0.95}px`,
                  opacity: 0.8,
                  scale: 1.0,
                }
          }
          transition={
            isCurrentlyRolling
              ? {
                  duration: durationMs / 1000,
                  times: [0, 0.38, 0.68, 0.80, 0.92, 1.0],
                }
              : { duration: 0.25 }
          }
        />

        {/* Landed Celebration Badge with Quick Dismiss (Appears ONLY after complete dead stop) */}
        {phase === "landed" && !isDismissed && (
          <div className="absolute -bottom-9 flex items-center gap-1.5 z-40 pointer-events-auto">
            <div className="px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black font-black text-xs shadow-xl border-2 border-white animate-bounce whitespace-nowrap">
              🎲 {displayValue} NÚT!
            </div>
            {onDismiss && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss();
                }}
                className="px-2 py-0.5 rounded-full bg-black/90 hover:bg-black text-slate-200 hover:text-white border border-amber-400/50 text-[10px] font-black shadow-lg transition flex items-center gap-1 active:scale-95 cursor-pointer whitespace-nowrap"
                title="Đẩy xúc xắc ra ngoài bàn cờ để nhìn rõ bàn"
              >
                <span>↗</span>
                <span>Đẩy ra</span>
              </button>
            )}
          </div>
        )}
      </motion.div>
    );
  }

  // Standalone inline version
  return (
    <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      {cubeMesh}
      <div
        className="mt-2.5 h-2.5 rounded-full bg-black/75 filter blur-[3px] pointer-events-none"
        style={{ width: `${size * 0.9}px` }}
      />
      {phase === "landed" && (
        <div className="absolute -bottom-8 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black font-black text-xs shadow-xl border-2 border-white animate-bounce whitespace-nowrap z-40">
          🎲 {displayValue} NÚT!
        </div>
      )}
    </div>
  );
}
