"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import type { OlympiaState } from "@/lib/olympia/types";
import { useOlympiaLightingState } from "./studio/useOlympiaLightingState";
import { CameraController, OLYMPIA_CAM_PRESETS } from "./studio/CameraController";
import { CentralLedWall } from "./studio/CentralLedWall";
import { Podiums } from "./studio/Podiums";
import { LaurelWreathVitrine } from "./studio/LaurelWreathVitrine";
import { StudioLighting } from "./studio/StudioLighting";

export interface OlympiaStudio3DSceneProps {
  state?: OlympiaState | null;
  activeCamera?: number;
  transitionMode?: "CUT" | "MORPH";
  pushInProgress?: number;
  onCameraChange?: (cam: number) => void;
  debugMode?: boolean;
  className?: string;
  serverNow?: () => number;
  allowPTZ?: boolean;
  showDirectorBar?: boolean;
}

export function OlympiaStudio3DScene({
  state,
  activeCamera = 1,
  transitionMode: propTransitionMode,
  pushInProgress = 0,
  onCameraChange,
  debugMode = false,
  className = "",
  serverNow,
  allowPTZ = true,
  showDirectorBar = true,
}: OlympiaStudio3DSceneProps) {
  // Staggered multi-zone lighting state
  const {
    targetMode,
    screenFadeProgress,
    stageFadeProgress,
    audienceFadeProgress,
    isVeDichDimmed,
    activeMainContestantSeat,
    is5sBuzzerChasing,
    spotlightChaseIndex,
    lockedSpotlightSeat,
  } = useOlympiaLightingState(state, serverNow);

  // Camera vision mixer state
  const [internalCam, setInternalCam] = useState<number>(activeCamera);
  const [internalTransitionMode, setInternalTransitionMode] = useState<"CUT" | "MORPH">("CUT");
  const transitionMode = propTransitionMode || internalTransitionMode;
  const [quality, setQuality] = useState<"HIGH" | "MEDIUM" | "LIGHT">("HIGH");

  // PTZ interactive controls
  const [ptzYaw, setPtzYaw] = useState(0);
  const [ptzPitch, setPtzPitch] = useState(0);
  const [ptzZoom, setPtzZoom] = useState(1.0);
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (activeCamera && activeCamera !== internalCam) {
      setInternalCam(activeCamera);
    }
  }, [activeCamera]);

  const handleSelectCam = (camId: number) => {
    setInternalCam(camId);
    onCameraChange?.(camId);
  };

  const cycleQuality = () => {
    setQuality((prev) => (prev === "HIGH" ? "MEDIUM" : prev === "MEDIUM" ? "LIGHT" : "HIGH"));
  };

  const resetPTZ = () => {
    setPtzYaw(0);
    setPtzPitch(0);
    setPtzZoom(1.0);
  };

  // Mouse drag handlers for PTZ Orbit Controls
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!allowPTZ) return;
      isDraggingRef.current = true;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    },
    [allowPTZ]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!allowPTZ || !isDraggingRef.current) return;
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };

      setPtzYaw((prev) => prev - dx * 0.0035);
      setPtzPitch((prev) => Math.max(-0.45, Math.min(0.45, prev - dy * 0.0035)));
    },
    [allowPTZ]
  );

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!allowPTZ) return;
      e.stopPropagation();
      setPtzZoom((prev) => Math.max(1.0, Math.min(2.5, prev - e.deltaY * 0.0012)));
    },
    [allowPTZ]
  );

  const isPtzActive = ptzZoom > 1.02 || Math.abs(ptzYaw) > 0.02 || Math.abs(ptzPitch) > 0.02;

  return (
    <div
      className={`relative w-full h-full overflow-hidden select-none bg-[#020510] ${className}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* ── 1. THREE.JS R3F CANVAS ── */}
      <Canvas
        camera={{ position: [0.0, 3.2, 6.8], fov: 46 }}
        gl={{
          powerPreference: "high-performance",
          antialias: quality !== "LIGHT",
          alpha: false,
        }}
        dpr={quality === "HIGH" ? [1, 1.5] : 1}
      >
        <CameraController
          camAngle={internalCam}
          transitionMode={transitionMode}
          pushInProgress={pushInProgress}
          ptzYaw={ptzYaw}
          ptzPitch={ptzPitch}
          ptzZoom={ptzZoom}
        />

        <StudioLighting
          screenFadeProgress={screenFadeProgress}
          stageFadeProgress={stageFadeProgress}
          audienceFadeProgress={audienceFadeProgress}
          quality={quality}
          isVeDichDimmed={isVeDichDimmed}
          activeMainContestantSeat={activeMainContestantSeat}
          is5sBuzzerChasing={is5sBuzzerChasing}
          spotlightChaseIndex={spotlightChaseIndex}
          lockedSpotlightSeat={lockedSpotlightSeat}
        />

        <CentralLedWall
          screenFadeProgress={screenFadeProgress}
          quality={quality}
        />

        <Podiums
          state={state}
          quality={quality}
          screenFadeProgress={screenFadeProgress}
        />

        <LaurelWreathVitrine
          position={[0.0, 0, 2.6]}
          quality={quality}
          screenFadeProgress={screenFadeProgress}
        />
      </Canvas>

      {/* ── 2. PTZ RESET FLOATING BADGE ── */}
      {allowPTZ && isPtzActive && (
        <button
          type="button"
          onClick={resetPTZ}
          className="absolute top-3 right-3 z-40 px-3 py-1.5 rounded-full bg-slate-950/85 hover:bg-slate-900 backdrop-blur-md border border-amber-400/50 text-amber-300 text-xs font-bold flex items-center gap-1.5 shadow-xl transition-all cursor-pointer animate-fade-in"
          title="Bấm để khôi phục góc quay ban đầu"
        >
          <span>🎥 Zoom {ptzZoom.toFixed(1)}x</span>
          <span className="text-white/60 hover:text-white">↺ Đặt lại</span>
        </button>
      )}

      {/* ── 3. BROADCAST CAMERA DIRECTOR BAR ── */}
      {showDirectorBar && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 p-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/15 shadow-2xl opacity-40 hover:opacity-100 transition-opacity duration-300">
          {Object.values(OLYMPIA_CAM_PRESETS).map((c) => {
            const isActive = internalCam === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelectCam(c.id)}
                title={c.label}
                className={`w-6 h-6 rounded-md text-[11px] font-black transition-all flex items-center justify-center cursor-pointer ${
                  isActive
                    ? "bg-amber-400 text-slate-950 shadow-[0_0_10px_#f59e0b]"
                    : "bg-white/10 hover:bg-white/25 text-white/80 hover:text-white"
                }`}
              >
                {c.id}
              </button>
            );
          })}

          <div className="h-4 w-px bg-white/20 mx-1" />

          {/* Hard Cut vs Morph Switcher */}
          <button
            type="button"
            onClick={() => setInternalTransitionMode((prev: "CUT" | "MORPH") => (prev === "CUT" ? "MORPH" : "CUT"))}
            className={`px-2 h-6 rounded-md text-[10px] font-bold transition-all flex items-center justify-center cursor-pointer border ${
              transitionMode === "CUT"
                ? "bg-amber-500/25 text-amber-300 border-amber-400/50"
                : "bg-cyan-500/25 text-cyan-300 border-cyan-400/50"
            }`}
            title={transitionMode === "CUT" ? "CẮT NHANH (0ms)" : "LƯỚT MƯỢT (Morph)"}
          >
            {transitionMode === "CUT" ? "✂ CẮT" : "🎥 MƯỢT"}
          </button>

          {/* Quality Switcher */}
          <button
            type="button"
            onClick={cycleQuality}
            className="px-2 h-6 rounded-md text-[10px] font-bold transition-all flex items-center justify-center cursor-pointer bg-white/10 hover:bg-white/25 text-amber-300 border border-amber-400/30"
            title={`Chất lượng đồ họa: ${quality}`}
          >
            {quality === "HIGH" ? "HQ" : quality === "MEDIUM" ? "MD" : "LT"}
          </button>

          {/* Mode Indicator Pill (Blue / Red) */}
          <div
            className={`px-2 h-6 rounded-md text-[10px] font-black flex items-center justify-center border transition-all ${
              targetMode === "RED"
                ? "bg-red-500/30 text-red-300 border-red-500/60 shadow-[0_0_8px_#ef4444]"
                : "bg-blue-500/30 text-blue-300 border-blue-500/60 shadow-[0_0_8px_#3b82f6]"
            }`}
            title={`Trạng thái ánh sáng trường quay: ${targetMode}`}
          >
            {targetMode === "RED" ? "🔴 THI ĐẤU" : "🔵 CHỜ"}
          </div>
        </div>
      )}

      {/* Debug Overlay */}
      {debugMode && (
        <div className="absolute top-2 left-2 z-50 p-2 rounded bg-black/80 text-[10px] font-mono text-cyan-300 border border-cyan-500/30">
          <div>Mode: {targetMode}</div>
          <div>Screen Fade: {screenFadeProgress.toFixed(2)}</div>
          <div>Stage Fade: {stageFadeProgress.toFixed(2)}</div>
          <div>Audience Fade: {audienceFadeProgress.toFixed(2)}</div>
          <div>Cam: {internalCam}</div>
        </div>
      )}
    </div>
  );
}

export default React.memo(OlympiaStudio3DScene);
