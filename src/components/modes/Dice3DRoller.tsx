"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface Dice3DRollerProps {
  value: number; // Final target value (1 to 6)
  isRolling: boolean;
  durationMs?: number; // Rolling duration in ms (default: 2200ms)
  onComplete?: () => void;
  className?: string;
  size?: number; // Size of dice in px (default: 68)
  simulateToss?: boolean;
  landingPos?: { x: number; y: number }; // Percentage 0-100 on board, guaranteed >20% away from edges
  originCorner?: 0 | 1 | 2 | 3; // 0: Top-Left, 1: Top-Right, 2: Bottom-Left, 3: Bottom-Right
}

/**
 * Realistic 3D Cube Dice Roller with Corner Toss Physics Simulation
 * Features:
 * - 6-sided 3D perspective cube rendered via CSS 3D transforms with rounded edges & pips
 * - Corner Toss Physics: Flung onto board from random outer corner (TL, TR, BL, BR)
 * - 2-3 Physical ground bounces with realistic inertia and scaling shadow
 * - Lands randomly on board while staying strictly >20% away from outer boundaries
 * - Authoritative Synchronized Roll: stops exactly on target value face
 * - Remains sitting on the gameboard at its landing spot after rolling completes
 */
export default function Dice3DRoller({
  value,
  isRolling,
  durationMs = 2300,
  onComplete,
  className = "",
  size = 68,
  simulateToss = false,
  landingPos = { x: 50, y: 50 },
  originCorner = 0,
}: Dice3DRollerProps) {
  const [phase, setPhase] = useState<"idle" | "rolling" | "landed">("idle");
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

  const [currentRotation, setCurrentRotation] = useState<{ x: number; y: number; z: number }>({
    x: 0,
    y: 0,
    z: 0,
  });

  // Clamp target coordinates to guarantee >20% clearance from board edges
  const safeTarget = useMemo(() => {
    const x = Math.min(76, Math.max(22, landingPos.x));
    const y = Math.min(72, Math.max(24, landingPos.y));
    return { x, y };
  }, [landingPos.x, landingPos.y]);

  // Corner start coordinates
  const cornerStarts = useMemo(() => [
    { x: -15, y: -15 },       // 0: Top-Left
    { x: 115, y: -15 },       // 1: Top-Right
    { x: -15, y: 115 },       // 2: Bottom-Left
    { x: 115, y: 115 },       // 3: Bottom-Right
  ], []);

  const startCoord = cornerStarts[originCorner] || cornerStarts[0];

  // Intermediate bounce trajectory points
  const bounce1 = useMemo(() => ({
    x: startCoord.x + (safeTarget.x - startCoord.x) * 0.7,
    y: startCoord.y + (safeTarget.y - startCoord.y) * 0.7,
  }), [startCoord, safeTarget]);

  const bounce2 = useMemo(() => ({
    x: startCoord.x + (safeTarget.x - startCoord.x) * 0.9,
    y: startCoord.y + (safeTarget.y - startCoord.y) * 0.9,
  }), [startCoord, safeTarget]);

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
    const extraSpinsZ = (2 + Math.floor(Math.random() * 2)) * 360;

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

  const cubeCore = (
    <div className="relative flex flex-col items-center justify-center select-none pointer-events-none">
      {/* 3D Perspective Canvas */}
      <div
        className="relative"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          perspective: "850px",
        }}
      >
        {/* Tumbling Cube */}
        <div
          className="w-full h-full relative"
          style={{
            transformStyle: "preserve-3d",
            transform: `rotateX(${currentRotation.x}deg) rotateY(${currentRotation.y}deg) rotateZ(${currentRotation.z}deg)`,
            transition: phase === "rolling"
              ? `transform ${durationMs}ms cubic-bezier(0.16, 0.88, 0.3, 1.12)`
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
        className="mt-2.5 h-2.5 rounded-full bg-black/75 filter blur-[3px] transition-all duration-300 pointer-events-none"
        style={{
          width: phase === "rolling" ? `${size * 0.75}px` : `${size * 0.95}px`,
          opacity: phase === "rolling" ? 0.35 : 0.85,
          transform: phase === "rolling" ? "scale(0.85)" : "scale(1)",
        }}
      />

      {/* Landed Celebration Badge */}
      {phase === "landed" && (
        <div className="absolute -bottom-8 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black font-black text-xs shadow-xl border-2 border-white animate-bounce whitespace-nowrap z-40">
          🎲 {displayValue} NÚT!
        </div>
      )}
    </div>
  );

  // If simulateToss is enabled, animate physical trajectory across board
  if (simulateToss) {
    const isCurrentlyRolling = phase === "rolling";

    return (
      <motion.div
        className={`absolute z-30 pointer-events-none ${className}`}
        initial={{
          left: `${startCoord.x}%`,
          top: `${startCoord.y}%`,
          scale: 1.5,
          opacity: 0,
        }}
        animate={
          isCurrentlyRolling
            ? {
                left: [`${startCoord.x}%`, `${bounce1.x}%`, `${bounce2.x}%`, `${safeTarget.x}%`],
                top: [`${startCoord.y}%`, `${bounce1.y}%`, `${bounce2.y}%`, `${safeTarget.y}%`],
                scale: [1.5, 1.25, 1.1, 1.0],
                opacity: [1, 1, 1, 1],
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
                times: [0, 0.45, 0.75, 1],
                ease: "easeOut",
              }
            : { duration: 0.3 }
        }
        style={{
          transform: "translate(-50%, -50%)",
        }}
      >
        {cubeCore}
      </motion.div>
    );
  }

  return (
    <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      {cubeCore}
    </div>
  );
}
