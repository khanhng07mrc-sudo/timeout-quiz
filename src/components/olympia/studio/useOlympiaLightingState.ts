import { useState, useEffect, useRef } from "react";
import type { OlympiaState } from "@/lib/olympia/types";

export type LightingMode = "BLUE" | "RED";

export interface StudioLightingState {
  targetMode: LightingMode;
  screenFadeProgress: number;   // 0.0 (Blue) to 1.0 (Red), t_delay = 0.0s
  stageFadeProgress: number;    // 0.0 (Blue) to 1.0 (Red), t_delay = 0.5s
  audienceFadeProgress: number; // 0.0 (Blue) to 1.0 (Red), t_delay = 0.7s
  // Về Đích Special Lighting Behaviors
  isVeDichDimmed: boolean;
  activeMainContestantSeat: number | null;
  is5sBuzzerChasing: boolean;
  spotlightChaseIndex: number;
  lockedSpotlightSeat: number | null;
}

/**
 * Checks whether a given contestant seat's buzzer is actively ringing in 3D.
 * - Khởi động, Về đích, Câu hỏi phụ: Any buzzed seat lights up Red.
 * - Vượt chướng ngại vật: Strictly the fastest (first) buzzer lights up Red. Subsequent buzzers remain unlit.
 */
export function isSeatBuzzedIn3D(seatId: number, state: OlympiaState | null | undefined): boolean {
  if (!state) return false;
  switch (state.currentRound) {
    case "khoiDong":
      return state.khoiDong?.buzzedSeat === seatId;
    case "vcnv":
      // Strictly the fastest (first) bell rings red:
      return state.vcnv?.bells?.[0]?.seat === seatId;
    case "veDich":
      return state.veDich?.steal?.buzzedSeat === seatId;
    case "cauHoiPhu":
      return state.cauHoiPhu?.buzzedSeat === seatId;
    default:
      return false;
  }
}

/**
 * Computes whether the lighting should be BLUE (outside competition / standby)
 * or RED (competition active) based on current round rules and elapsed timers.
 */
export function computeTargetLightingMode(
  state: OlympiaState | null | undefined,
  nowMs: number = Date.now()
): LightingMode {
  if (!state || state.stage !== "playing" || !state.currentRound) {
    return "BLUE";
  }

  switch (state.currentRound) {
    case "khoiDong": {
      const kd = state.khoiDong;
      if (!kd) return "BLUE";
      // Turns Red on start until segment/turn finishes:
      if (kd.started && kd.phase !== "segmentDone" && kd.phase !== "idle") {
        return "RED";
      }
      return "BLUE";
    }

    case "vcnv": {
      const v = state.vcnv;
      if (!v || v.phase !== "question") return "BLUE";
      // Turns Red after 2.5s timer running delay; reverts to Blue upon answer reveal / grid return
      const startedAt = v.timer?.startedAt;
      if (startedAt != null) {
        const elapsedSec = Math.max(0, nowMs - startedAt) / 1000;
        if (elapsedSec >= 2.5) {
          return "RED";
        }
      }
      return "BLUE";
    }

    case "tangToc": {
      const tt = state.tangToc;
      if (!tt || tt.phase !== "question") return "BLUE";
      // Turns Red after 2.5s timer running delay; reverts to Blue upon ranking / idle
      const startedAt = tt.timer?.startedAt;
      if (startedAt != null) {
        const elapsedSec = Math.max(0, nowMs - startedAt) / 1000;
        if (elapsedSec >= 2.5) {
          return "RED";
        }
      }
      return "BLUE";
    }

    case "veDich": {
      const vd = state.veDich;
      if (!vd) return "BLUE";
      // Turns Red on contestant onStage / package selection through turn finish:
      // (phases: "choosing", "packageReady", "thinking", "stealing", "result")
      if (vd.phase !== "idle" && vd.phase !== "seatDone") {
        return "RED";
      }
      return "BLUE";
    }

    case "cauHoiPhu": {
      const chp = state.cauHoiPhu;
      if (chp && chp.phase === "question") {
        return "RED";
      }
      return "BLUE";
    }

    default:
      return "BLUE";
  }
}

/**
 * Hermite cubic smoothstep: S(t) = 3t^2 - 2t^3 for t in [0, 1]
 */
export function hermiteSmoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

/**
 * Multi-zone staggered fade configuration:
 * Screen: delay 0.0s, duration 0.9s
 * Stage:  delay 0.5s, duration 1.2s
 * Audience: delay 0.7s, duration 1.2s
 */
export const STAGGER_CONFIG = {
  screen: { delay: 0.0, duration: 0.9 },
  stage: { delay: 0.5, duration: 1.2 },
  audience: { delay: 0.7, duration: 1.2 },
};

/**
 * Calculates the animated fade progress for a zone given transition start time and current time.
 */
export function calculateZoneFade(
  fromVal: number,
  toVal: number,
  elapsedSec: number,
  delaySec: number,
  durationSec: number
): number {
  if (elapsedSec <= delaySec) {
    return fromVal;
  }
  const rawProgress = (elapsedSec - delaySec) / Math.max(0.001, durationSec);
  const smoothed = hermiteSmoothstep(rawProgress);
  return fromVal + (toVal - fromVal) * smoothed;
}

/**
 * Custom hook managing staggered multi-zone studio lighting transitions.
 */
export function useOlympiaLightingState(
  state: OlympiaState | null | undefined,
  serverNow?: () => number
): StudioLightingState & { isSeatBuzzed: (seatId: number) => boolean } {
  const getNow = serverNow || (() => Date.now());
  const [currentMode, setCurrentMode] = useState<LightingMode>("BLUE");

  // Zone values: 0.0 (Blue) to 1.0 (Red)
  const [screenVal, setScreenVal] = useState(0);
  const [stageVal, setStageVal] = useState(0);
  const [audienceVal, setAudienceVal] = useState(0);

  // Ticker for Về Đích 5s chase effect
  const [chaseTick, setChaseTick] = useState(0);
  useEffect(() => {
    if (state?.currentRound !== "veDich") return;
    const iv = setInterval(() => setChaseTick((c) => (c + 1) % 4), 160);
    return () => clearInterval(iv);
  }, [state?.currentRound]);

  // Current values ref to eliminate missing dependencies and stale closures
  const currentValsRef = useRef({ screen: 0, stage: 0, audience: 0 });

  // Transition tracking
  const transitionRef = useRef<{
    startTime: number;
    fromScreen: number;
    fromStage: number;
    fromAudience: number;
    targetVal: number;
    targetMode: LightingMode;
  }>({
    startTime: 0,
    fromScreen: 0,
    fromStage: 0,
    fromAudience: 0,
    targetVal: 0,
    targetMode: "BLUE",
  });

  // Evaluate target mode on state change / ticks
  useEffect(() => {
    let animId: number;
    const checkAndUpdate = () => {
      const nowMs = getNow();
      const target = computeTargetLightingMode(state, nowMs);

      if (target !== transitionRef.current.targetMode) {
        const perfNow = typeof performance !== "undefined" ? performance.now() : Date.now();
        const tr = transitionRef.current;
        // Snapshot current values at moment of target change
        tr.startTime = perfNow;
        tr.fromScreen = currentValsRef.current.screen;
        tr.fromStage = currentValsRef.current.stage;
        tr.fromAudience = currentValsRef.current.audience;
        tr.targetVal = target === "RED" ? 1 : 0;
        tr.targetMode = target;
        setCurrentMode(target);
      }
    };

    checkAndUpdate();
    const interval = setInterval(checkAndUpdate, 200);

    // Animation loop for 60fps smooth fade
    const updateFades = () => {
      const perfNow = typeof performance !== "undefined" ? performance.now() : Date.now();
      const tr = transitionRef.current;
      const elapsedSec = tr.startTime > 0 ? (perfNow - tr.startTime) / 1000 : 999;

      const s = calculateZoneFade(
        tr.fromScreen,
        tr.targetVal,
        elapsedSec,
        STAGGER_CONFIG.screen.delay,
        STAGGER_CONFIG.screen.duration
      );
      const st = calculateZoneFade(
        tr.fromStage,
        tr.targetVal,
        elapsedSec,
        STAGGER_CONFIG.stage.delay,
        STAGGER_CONFIG.stage.duration
      );
      const a = calculateZoneFade(
        tr.fromAudience,
        tr.targetVal,
        elapsedSec,
        STAGGER_CONFIG.audience.delay,
        STAGGER_CONFIG.audience.duration
      );

      currentValsRef.current = { screen: s, stage: st, audience: a };
      setScreenVal(s);
      setStageVal(st);
      setAudienceVal(a);

      // Continue animating until all zones reach target
      const maxTime = STAGGER_CONFIG.audience.delay + STAGGER_CONFIG.audience.duration;
      if (elapsedSec < maxTime + 0.1) {
        animId = requestAnimationFrame(updateFades);
      }
    };

    animId = requestAnimationFrame(updateFades);

    return () => {
      clearInterval(interval);
      if (animId) cancelAnimationFrame(animId);
    };
  }, [state, getNow]);

  // Về Đích Special Behaviors
  const isVeDich = state?.stage === "playing" && state?.currentRound === "veDich";
  const vd = isVeDich ? state?.veDich : null;
  const isVeDichDimmed = Boolean(
    isVeDich && vd && vd.phase !== "idle" && vd.phase !== "seatDone"
  );
  const activeMainContestantSeat = vd ? (vd.order?.[vd.turnIdx] ?? 0) : null;
  const is5sBuzzerChasing = Boolean(
    isVeDich && vd?.phase === "stealing" && vd?.steal?.buzzedSeat == null
  );
  const lockedSpotlightSeat =
    isVeDich && vd?.steal?.buzzedSeat != null ? vd.steal.buzzedSeat : null;

  return {
    targetMode: currentMode,
    screenFadeProgress: screenVal,
    stageFadeProgress: stageVal,
    audienceFadeProgress: audienceVal,
    isSeatBuzzed: (seatId: number) => isSeatBuzzedIn3D(seatId, state),
    isVeDichDimmed,
    activeMainContestantSeat,
    is5sBuzzerChasing,
    spotlightChaseIndex: chaseTick,
    lockedSpotlightSeat,
  };
}
