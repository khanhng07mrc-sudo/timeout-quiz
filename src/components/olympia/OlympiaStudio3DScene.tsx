"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { OlympiaState, StudioCameraPTZ } from "@/lib/olympia/types";

export interface OlympiaPerfStats {
  fps: number;
  drawCalls: number;
  triangles: number;
}

declare global {
  interface Window {
    __OLYMPIA_PERF__?: OlympiaPerfStats;
  }
}

function OlympiaTelemetryHook({
  onPerfUpdate,
}: {
  onPerfUpdate: (stats: OlympiaPerfStats) => void;
}) {
  const { gl } = useThree();
  const lastTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);

  useFrame(() => {
    frameCountRef.current++;
    const now = performance.now();
    const elapsed = now - lastTimeRef.current;

    // Sample every 500ms for stable metrics and minimal overhead
    if (elapsed >= 500) {
      const currentFps = Math.round((frameCountRef.current * 1000) / elapsed);
      frameCountRef.current = 0;
      lastTimeRef.current = now;

      const calls = gl.info.render.calls;
      const triangles = gl.info.render.triangles;

      const stats: OlympiaPerfStats = {
        fps: currentFps,
        drawCalls: calls,
        triangles: triangles,
      };

      if (typeof window !== "undefined") {
        window.__OLYMPIA_PERF__ = stats;
      }

      onPerfUpdate(stats);
    }
  });

  return null;
}

const DEFAULT_PTZ: StudioCameraPTZ = {
  yaw: 0,
  pitch: 0,
  zoom: 1.0,
  panX: 0,
  panY: 0,
};
import { useOlympiaLightingState } from "./studio/useOlympiaLightingState";
import {
  CameraController,
  OLYMPIA_CAM_PRESETS,
  isRoundPostIntroStandby,
} from "./studio/CameraController";
import { CentralLedWall } from "./studio/CentralLedWall";
import { Podiums } from "./studio/Podiums";
import { VictoryPodium3D } from "./studio/VictoryPodium3D";
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
  defaultQuality?: "HIGH" | "MEDIUM" | "LIGHT";
  isSandbox?: boolean;
  isPaused?: boolean;
  qIdx?: number;
  questionRevealed?: boolean;
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
  showDirectorBar = false,
  defaultQuality,
  isSandbox = false,
  isPaused = false,
  qIdx,
  questionRevealed,
}: OlympiaStudio3DSceneProps) {
  // Staggered multi-zone lighting state
  const {
    targetMode,
    screenFadeProgress,
    stageFadeProgress,
    audienceFadeProgress,
    isIdle,
    idleFadeProgress = 0,
    isContestantDimmed,
    isVeDichDimmed,
    activeMainContestantSeat,
    is5sBuzzerChasing,
    spotlightChaseIndex,
    spotlightChaseIndices,
    lockedSpotlightSeat,
  } = useOlympiaLightingState(state, serverNow);

  // Real-time telemetry performance stats
  const [perfStats, setPerfStats] = useState<OlympiaPerfStats>({
    fps: 60,
    drawCalls: 0,
    triangles: 0,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__OLYMPIA_PERF__ = {
        fps: 60,
        drawCalls: 0,
        triangles: 0,
      };
    }
  }, []);

  const liveFactor = 1.0 - (idleFadeProgress ?? 0);
  const isGrandstandFullLit = Boolean(
    state?.entranceState?.active ||
      state?.entranceCompleted ||
      (state?.stage === "playing" && !state?.introTimer && Boolean(state?.currentRound))
  );

  // Camera vision mixer state
  const isIframe = typeof window !== "undefined" && window.self !== window.top;
  const isSandboxEnv =
    isSandbox ||
    (typeof window !== "undefined" &&
      (window.location.search.includes("sandbox=1") ||
        window.location.search.includes("perf=light")));
  const [internalCam, setInternalCam] = useState<number>(activeCamera ?? 1);
  const effectiveCam = activeCamera !== undefined ? activeCamera : internalCam;
  const [internalTransitionMode, setInternalTransitionMode] = useState<"CUT" | "MORPH">("MORPH");
  const transitionMode = propTransitionMode || internalTransitionMode;
  const [quality, setQuality] = useState<"HIGH" | "MEDIUM" | "LIGHT">(
    defaultQuality || (isSandboxEnv ? "LIGHT" : isIframe ? "MEDIUM" : "HIGH")
  );

  // PTZ interactive controls (Per-Camera Orbit Yaw/Pitch + Pan X/Y + Zoom Isolation)
  const [ptzPerCam, setPtzPerCam] = useState<Record<number, StudioCameraPTZ>>({});
  const activeCamPtz = state?.studioCameraPtz?.[effectiveCam] ?? ptzPerCam[effectiveCam] ?? DEFAULT_PTZ;
  const ptzYaw = activeCamPtz.yaw;
  const ptzPitch = activeCamPtz.pitch;
  const ptzZoom = activeCamPtz.zoom;
  const ptzPanX = activeCamPtz.panX;
  const ptzPanY = activeCamPtz.panY;

  const isDraggingRef = useRef(false);
  const dragModeRef = useRef<"orbit" | "pan">("orbit");
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStartDistRef = useRef<number>(0);
  const touchStartCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (activeCamera && activeCamera !== internalCam) {
      setInternalCam(activeCamera);
    }
  }, [activeCamera]);

  useEffect(() => {
    if (!state?.studioCameraPtz) {
      setPtzPerCam({});
    }
  }, [state?.studioCameraPtz]);

  const handleSelectCam = (camId: number) => {
    setInternalCam(camId);
    onCameraChange?.(camId);
  };

  const cycleQuality = () => {
    setQuality((prev) => (prev === "HIGH" ? "MEDIUM" : prev === "MEDIUM" ? "LIGHT" : "HIGH"));
  };

  const updateCurrentPTZ = useCallback(
    (updater: (prev: StudioCameraPTZ) => StudioCameraPTZ) => {
      setPtzPerCam((prevMap) => {
        const prev = state?.studioCameraPtz?.[effectiveCam] ?? prevMap[effectiveCam] ?? DEFAULT_PTZ;
        const next = updater(prev);
        if (typeof window !== "undefined") {
          (window as any).__OLYMPIA_CALL__?.("studio:camera:ptz", {
            cam: effectiveCam,
            ptz: next,
          });
        }
        return { ...prevMap, [effectiveCam]: next };
      });
    },
    [effectiveCam, state?.studioCameraPtz]
  );

  const resetPTZ = useCallback(
    (all?: boolean) => {
      if (all) {
        setPtzPerCam({});
        if (typeof window !== "undefined") {
          (window as any).__OLYMPIA_CALL__?.("studio:camera:reset", { all: true });
          (window as any).__OLYMPIA_CALL__?.("studio:camera:auto");
        }
      } else {
        setPtzPerCam((prev) => {
          const next = { ...prev };
          delete next[effectiveCam];
          return next;
        });
        if (typeof window !== "undefined") {
          (window as any).__OLYMPIA_CALL__?.("studio:camera:reset", { cam: effectiveCam });
        }
      }
    },
    [effectiveCam]
  );

  // Mouse drag handlers for PTZ Orbit & Pan Controls
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!allowPTZ) return;
      isDraggingRef.current = true;
      const isPan = e.button === 2 || e.button === 1 || e.shiftKey;
      dragModeRef.current = isPan ? "pan" : "orbit";
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    },
    [allowPTZ]
  );

  useEffect(() => {
    if (!allowPTZ) return;
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };

      if (dragModeRef.current === "pan") {
        const panFactor = 0.005 * (1.0 / ptzZoom);
        updateCurrentPTZ((prev) => ({
          ...prev,
          panX: prev.panX - dx * panFactor,
          panY: prev.panY + dy * panFactor,
        }));
      } else {
        updateCurrentPTZ((prev) => ({
          ...prev,
          yaw: prev.yaw - dx * 0.0035,
          pitch: Math.max(-0.65, Math.min(0.65, prev.pitch - dy * 0.0035)),
        }));
      }
    };

    const handleGlobalPointerUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener("pointermove", handleGlobalPointerMove, { passive: true });
    window.addEventListener("pointerup", handleGlobalPointerUp);
    return () => {
      window.removeEventListener("pointermove", handleGlobalPointerMove);
      window.removeEventListener("pointerup", handleGlobalPointerUp);
    };
  }, [allowPTZ, ptzZoom, updateCurrentPTZ]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!allowPTZ || !isDraggingRef.current) return;
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };

      if (dragModeRef.current === "pan") {
        // Pan horizontally & vertically scaled inversely with zoom
        const panFactor = 0.005 * (1.0 / ptzZoom);
        updateCurrentPTZ((prev) => ({
          ...prev,
          panX: prev.panX - dx * panFactor,
          panY: prev.panY + dy * panFactor,
        }));
      } else {
        // Orbit rotate yaw & pitch
        updateCurrentPTZ((prev) => ({
          ...prev,
          yaw: prev.yaw - dx * 0.0035,
          pitch: Math.max(-0.65, Math.min(0.65, prev.pitch - dy * 0.0035)),
        }));
      }
    },
    [allowPTZ, ptzZoom, updateCurrentPTZ]
  );

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!allowPTZ) return;
      e.stopPropagation();
      updateCurrentPTZ((prev) => ({
        ...prev,
        zoom: Math.max(0.65, Math.min(3.5, prev.zoom - e.deltaY * 0.0015)),
      }));
    },
    [allowPTZ, updateCurrentPTZ]
  );

  // Touch gesture support: 1 finger orbit, 2 finger pinch-zoom & pan
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!allowPTZ) return;
      if (e.touches.length === 1) {
        isDraggingRef.current = true;
        dragModeRef.current = "orbit";
        lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        isDraggingRef.current = true;
        dragModeRef.current = "pan";
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchStartDistRef.current = Math.hypot(dx, dy);
        touchStartCenterRef.current = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        };
      }
    },
    [allowPTZ]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!allowPTZ || !isDraggingRef.current) return;
      if (e.touches.length === 1 && dragModeRef.current === "orbit") {
        const dx = e.touches[0].clientX - lastMousePosRef.current.x;
        const dy = e.touches[0].clientY - lastMousePosRef.current.y;
        lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        updateCurrentPTZ((prev) => ({
          ...prev,
          yaw: prev.yaw - dx * 0.004,
          pitch: Math.max(-0.65, Math.min(0.65, prev.pitch - dy * 0.004)),
        }));
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        if (touchStartDistRef.current > 0) {
          const ratio = dist / touchStartDistRef.current;
          touchStartDistRef.current = dist;
          updateCurrentPTZ((prev) => ({
            ...prev,
            zoom: Math.max(0.65, Math.min(3.5, prev.zoom * ratio)),
          }));
        }
        const curCenter = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        };
        const panDx = curCenter.x - touchStartCenterRef.current.x;
        const panDy = curCenter.y - touchStartCenterRef.current.y;
        touchStartCenterRef.current = curCenter;
        const panFactor = 0.005 * (1.0 / ptzZoom);
        updateCurrentPTZ((prev) => ({
          ...prev,
          panX: prev.panX - panDx * panFactor,
          panY: prev.panY + panDy * panFactor,
        }));
      }
    },
    [allowPTZ, ptzZoom, updateCurrentPTZ]
  );

  const handleTouchEnd = useCallback(() => {
    isDraggingRef.current = false;
    touchStartDistRef.current = 0;
  }, []);

  const isPtzActive =
    Math.abs(ptzZoom - 1.0) > 0.02 ||
    Math.abs(ptzYaw) > 0.02 ||
    Math.abs(ptzPitch) > 0.02 ||
    Math.abs(ptzPanX) > 0.02 ||
    Math.abs(ptzPanY) > 0.02;

  return (
    <div
      className={`relative w-full h-full overflow-hidden select-none bg-[#020510] pointer-events-auto ${className}`}
      style={{ touchAction: "none" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onContextMenu={(e) => {
        if (allowPTZ) e.preventDefault();
      }}
    >
      {/* ── 1. THREE.JS R3F CANVAS ── */}
      <Canvas
        shadows="soft"
        frameloop={isPaused ? "never" : "always"}
        performance={{ min: 0.5 }}
        camera={{ position: [0.0, 3.2, 6.8], fov: 46 }}
        gl={{
          powerPreference: isSandboxEnv || quality === "LIGHT" ? "low-power" : "high-performance",
          antialias: !isSandboxEnv && quality === "HIGH",
          alpha: false,
          stencil: false,
          depth: true,
          precision: isSandboxEnv || quality === "LIGHT" ? "mediump" : "highp",
        }}
        dpr={isSandboxEnv ? 0.5 : quality === "LIGHT" ? 0.5 : isIframe ? 0.75 : quality === "HIGH" ? (typeof window !== "undefined" ? (window.innerWidth >= 3840 || window.innerHeight >= 2160 ? Math.min(window.devicePixelRatio || 1, 1.0) : Math.min(window.devicePixelRatio || 1, 1.25)) : 1) : 1}
      >
        <CameraController
          camAngle={effectiveCam}
          totalSeats={state?.seats?.length || 4}
          activeSeat={
            state?.summaryState?.active
              ? (state.summaryState.orderedSeats[state.summaryState.currentIndex] ?? 0)
              : (activeMainContestantSeat ?? (state?.khoiDong?.segments?.[state?.khoiDong?.segIdx ?? 0]?.seat ?? 0))
          }
          transitionMode={transitionMode}
          pushInProgress={pushInProgress}
          ptzYaw={ptzYaw}
          ptzPitch={ptzPitch}
          ptzZoom={ptzZoom}
          ptzPanX={ptzPanX}
          ptzPanY={ptzPanY}
          introStartedAt={state?.entranceState?.active ? null : (state?.introTimer?.startedAt ?? null)}
          roundIntroDoneAt={state?.roundIntroDoneAt ?? null}
          kdStartCooldownUntil={state?.khoiDong?.startCooldownUntil ?? null}
          isIdleLobby={Boolean(isIdle && !state?.studioCameraManual && !state?.entranceState?.active)}
          isPostIntroStandby={isRoundPostIntroStandby(state, serverNow ? serverNow() : Date.now())}
          isManualCamera={Boolean(state?.studioCameraManual)}
          serverNow={serverNow}
          qIdx={qIdx ?? state?.khoiDong?.qIdx ?? -1}
          questionRevealed={questionRevealed ?? Boolean(state?.khoiDong?.questionRevealed)}
        />

        <StudioLighting
          screenFadeProgress={screenFadeProgress}
          stageFadeProgress={stageFadeProgress}
          audienceFadeProgress={audienceFadeProgress}
          isIdle={isIdle}
          idleFadeProgress={idleFadeProgress}
          isGrandstandFullLit={isGrandstandFullLit}
          totalSeats={state?.seats?.length || 4}
          quality={quality}
          isVeDichDimmed={isContestantDimmed}
          activeMainContestantSeat={activeMainContestantSeat}
          is5sBuzzerChasing={is5sBuzzerChasing}
          spotlightChaseIndex={spotlightChaseIndex}
          spotlightChaseIndices={spotlightChaseIndices}
          lockedSpotlightSeat={lockedSpotlightSeat}
          introStartedAt={state?.entranceState?.active ? null : (state?.introTimer?.startedAt ?? null)}
          serverNow={serverNow}
          camAngle={internalCam}
          ptzZoom={ptzZoom}
          pushInProgress={pushInProgress}
          isEntranceActive={Boolean(state?.entranceState?.active)}
          kdStartCooldownUntil={state?.khoiDong?.startCooldownUntil ?? null}
          currentRound={state?.currentRound ?? null}
        />

        <CentralLedWall
          state={state}
          screenFadeProgress={screenFadeProgress}
          quality={quality}
          liveFactor={liveFactor}
        />

        <Podiums
          state={state}
          quality={quality}
          screenFadeProgress={screenFadeProgress}
          serverNow={serverNow}
          liveFactor={liveFactor}
          introStartedAt={state?.entranceState?.active ? null : (state?.introTimer?.startedAt ?? null)}
          isIdle={isIdle}
          isContestantDimmed={isContestantDimmed}
          activeMainContestantSeat={activeMainContestantSeat}
        />

        <VictoryPodium3D
          awardsState={state?.awardsState}
          totalSeats={state?.seats?.length ?? 4}
        />

        <LaurelWreathVitrine
          position={[1.8, 0.18, 2.6]}
          quality={quality}
          screenFadeProgress={screenFadeProgress}
          liveFactor={liveFactor}
          introStartedAt={state?.entranceState?.active ? null : (state?.introTimer?.startedAt ?? null)}
          isIdle={isIdle}
          serverNow={serverNow}
        />

        <OlympiaTelemetryHook onPerfUpdate={setPerfStats} />
      </Canvas>

      {/* ── 2. PTZ RESET FLOATING BADGE (Tự động làm mờ khi ở vị trí mặc định, sáng rõ khi bị lệch góc) ── */}
      {allowPTZ && (
        <button
          type="button"
          disabled={!isPtzActive}
          onClick={(e) => resetPTZ(e.shiftKey)}
          className={`absolute top-3 right-3 z-40 px-3 py-1.5 rounded-full backdrop-blur-md border text-xs font-bold flex items-center gap-1.5 shadow-xl transition-all ${
            isPtzActive
              ? "bg-slate-950/90 hover:bg-slate-900 border-cyan-400 text-cyan-300 cursor-pointer pointer-events-auto opacity-100 shadow-[0_0_15px_rgba(34,211,238,0.35)]"
              : "bg-slate-950/40 border-white/10 text-slate-500 cursor-not-allowed pointer-events-none opacity-30"
          }`}
          title={
            isPtzActive
              ? `Bấm để đặt lại góc máy C${effectiveCam} về chuẩn (Shift+Click để đặt lại tất cả máy)`
              : `Máy quay C${effectiveCam} đang ở vị trí mặc định chuẩn`
          }
        >
          <span>
            🎥 {Math.abs(ptzZoom - 1.0) > 0.02 ? `Zoom ${ptzZoom.toFixed(1)}x ` : ""}
            {Math.abs(ptzPanX) > 0.02 || Math.abs(ptzPanY) > 0.02 ? "Pan " : ""}
            {Math.abs(ptzYaw) > 0.02 || Math.abs(ptzPitch) > 0.02 ? "Xoay " : ""}
          </span>
          <span className={isPtzActive ? "text-white font-black" : "text-slate-500 font-semibold"}>
            ↺ Đặt lại góc
          </span>
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
          <div>FPS: {perfStats.fps}</div>
          <div>Draw Calls: {perfStats.drawCalls}</div>
          <div>Triangles: {perfStats.triangles.toLocaleString()}</div>
        </div>
      )}
    </div>
  );
}

export default React.memo(OlympiaStudio3DScene);
