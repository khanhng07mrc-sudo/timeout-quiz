import { useState, useEffect, useRef } from "react";
import type { OlympiaState } from "@/lib/olympia/types";

export type LightingMode = "BLUE" | "RED";

export interface StudioLightingState {
  targetMode: LightingMode;
  screenFadeProgress: number;   // 0.0 (Blue) to 1.0 (Red), t_delay = 0.0s
  stageFadeProgress: number;    // 0.0 (Blue) to 1.0 (Red), t_delay = 0.5s
  audienceFadeProgress: number; // 0.0 (Blue) to 1.0 (Red), t_delay = 0.7s
  // Pre-match Idle State (R4)
  isIdle: boolean;
  idleFadeProgress: number;     // 1.0 (Dark Pre-Match Idle) to 0.0 (Active Broadcast)
  // Khởi Động Riêng & Về Đích Special Lighting Behaviors
  isContestantDimmed: boolean;  // True when solo Khởi Động or Về Đích turn is active
  isVeDichDimmed: boolean;      // Kept for backwards compatibility
  activeMainContestantSeat: number | null;
  is5sBuzzerChasing: boolean;
  spotlightChaseIndex: number;
  spotlightChaseIndices?: number[];
  lockedSpotlightSeat: number | null;
}

/**
 * Evaluates whether the studio is in the deep atmospheric pre-match idle state (R4).
 * Returns true when in lobby, uninitialized, or before match intro & rounds commence.
 */
export function isPreMatchIdle(state: OlympiaState | null | undefined): boolean {
  if (!state) return true;
  if (state.stage === "lobby") return true;
  if (state.stage === "finished") return false;
  if (state.stage === "playing") {
    // True prior to match opening / rounds:
    if (!state.currentRound && !state.introTimer && !state.entranceState?.active) {
      return true;
    }
  }
  return false;
}

/**
 * Checks whether a given contestant seat's buzzer or active turn is actively lit up Red in 3D.
 * - Khởi động riêng: Active contestant's entire podium glows Red during their turn.
 * - Khởi động chung, Về đích, Câu hỏi phụ, VCNV: The fastest buzzed seat lights up Red.
 * - Switches off when question advances or round ends.
 */
export function isSeatBuzzedIn3D(seatId: number, state: OlympiaState | null | undefined): boolean {
  if (!state || state.stage === "lobby" || state.stage === "finished") return false;
  switch (state.currentRound) {
    case "khoiDong": {
      const kd = state.khoiDong;
      if (!kd || kd.phase === "segmentDone" || kd.phase === "idle") return false;
      // In Khởi động chung: fastest buzzed seat glows red
      return kd.buzzedSeat === seatId;
    }
    case "vcnv": {
      // Strictly the fastest active (non-eliminated) bell rings red while VCNV is active
      if (!state.vcnv || state.vcnv.phase === "done") return false;
      const activeBell = state.vcnv.bells?.find((b) => !b.judgedWrong);
      return activeBell?.seat === seatId;
    }
    case "veDich":
      return (
        state.veDich?.phase !== "seatDone" &&
        state.veDich?.phase !== "idle" &&
        state.veDich?.steal?.buzzedSeat === seatId
      );
    case "cauHoiPhu":
      return (
        state.cauHoiPhu?.phase !== "done" &&
        state.cauHoiPhu?.phase !== "idle" &&
        state.cauHoiPhu?.buzzedSeat === seatId
      );
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
      // When turn finishes ("seatDone"), lighting transitions back to sapphire blue immediately:
      if (vd.phase === "seatDone") {
        return "BLUE";
      }
      if (vd.onStage || vd.phase !== "idle") {
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
 * 5s Steal Ceiling Chasing Spotlights Oracle & Runtime Calculation
 * - 0.5s step per light, sequential cyclic sweep
 * - Maximum 2 lights active simultaneously (active current + trailing decay)
 * - Buzz completes current 0.5s cycle before locking steady spotlight on buzzed seat
 */
export function evaluate5sStealSpotlights(
  elapsedSec: number,
  totalSeats: number = 4,
  buzzedSeat: number | null = null,
  buzzElapsedSec: number | null = null
): {
  isChasing: boolean;
  activeLightIndices: number[];
  lockedSeat: number | null;
  activeLightCount: number;
} {
  const t = Math.max(0, elapsedSec);
  const seats = Math.min(8, Math.max(1, totalSeats));

  // If buzz happened, check if buzz completed its current 0.5s step before locking:
  if (buzzedSeat != null && buzzElapsedSec != null && t >= buzzElapsedSec) {
    const stepAtBuzz = Math.floor(buzzElapsedSec / 0.5);
    const stepCompletionTime = (stepAtBuzz + 1) * 0.5;
    if (t < stepCompletionTime) {
      // Still completing active 0.5s step:
      const curSeat = stepAtBuzz % seats;
      const prevSeat = (stepAtBuzz - 1 + seats) % seats;
      return {
        isChasing: true,
        activeLightIndices: [curSeat, prevSeat].filter((s, idx, arr) => arr.indexOf(s) === idx),
        lockedSeat: null,
        activeLightCount: 2,
      };
    } else {
      // Completed active step -> locks steady spotlight on buzzing contestant:
      return {
        isChasing: false,
        activeLightIndices: [buzzedSeat],
        lockedSeat: buzzedSeat,
        activeLightCount: 1,
      };
    }
  }

  // 5s countdown expired without buzz -> all spotlights turn off:
  if (t >= 5.0) {
    return {
      isChasing: false,
      activeLightIndices: [],
      lockedSeat: null,
      activeLightCount: 0,
    };
  }

  // Active chasing sweep: 0.5s step
  const stepIdx = Math.floor(t / 0.5);
  const currentSeat = stepIdx % seats;
  const trailingSeat = (stepIdx - 1 + seats) % seats;
  const stepFraction = (t % 0.5) / 0.5;

  // Max 2 lights simultaneously active: current seat (rising) + trailing seat (falling)
  const activeLights = stepFraction < 0.35 ? [trailingSeat, currentSeat] : [currentSeat];
  const uniqueActive = Array.from(new Set(activeLights));

  return {
    isChasing: true,
    activeLightIndices: uniqueActive,
    lockedSeat: null,
    activeLightCount: uniqueActive.length,
  };
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

  // Pre-match idle state (R4)
  const initialIdle = isPreMatchIdle(state);
  const [isIdle, setIsIdle] = useState(initialIdle);
  const [idleFadeVal, setIdleFadeVal] = useState(initialIdle ? 1.0 : 0.0);
  const currentIdleValRef = useRef(initialIdle ? 1.0 : 0.0);

  const idleTransitionRef = useRef<{
    startTime: number;
    fromVal: number;
    targetVal: number;
    targetIdle: boolean;
  }>({
    startTime: 0,
    fromVal: initialIdle ? 1.0 : 0.0,
    targetVal: initialIdle ? 1.0 : 0.0,
    targetIdle: initialIdle,
  });

  // Zone values: 0.0 (Blue) to 1.0 (Red)
  const [screenVal, setScreenVal] = useState(0);
  const [stageVal, setStageVal] = useState(0);
  const [audienceVal, setAudienceVal] = useState(0);

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
    let animId: number = 0;
    let delayTimer: NodeJS.Timeout | null = null;

    const startTransitionAnimation = () => {
      if (animId) cancelAnimationFrame(animId);

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

        // Smooth Hermite fade for pre-match idle transition (1.2s duration)
        const itr = idleTransitionRef.current;
        const idleElapsedSec = itr.startTime > 0 ? (perfNow - itr.startTime) / 1000 : 999;
        const rawIdleProgress = Math.min(1, Math.max(0, idleElapsedSec / 1.2));
        const idleSmoothed = hermiteSmoothstep(rawIdleProgress);
        const curIdle = itr.fromVal + (itr.targetVal - itr.fromVal) * idleSmoothed;
        currentIdleValRef.current = curIdle;
        setIdleFadeVal(curIdle);

        // Stop animating once all zones and idle transitions reach target values
        const maxTime = STAGGER_CONFIG.audience.delay + STAGGER_CONFIG.audience.duration;
        if (elapsedSec < maxTime + 0.05 || idleElapsedSec < 1.25) {
          animId = requestAnimationFrame(updateFades);
        } else {
          // Snap strictly to targets to prevent floating point residual drift
          currentValsRef.current = { screen: tr.targetVal, stage: tr.targetVal, audience: tr.targetVal };
          setScreenVal(tr.targetVal);
          setStageVal(tr.targetVal);
          setAudienceVal(tr.targetVal);
          currentIdleValRef.current = itr.targetVal;
          setIdleFadeVal(itr.targetVal);
        }
      };

      animId = requestAnimationFrame(updateFades);
    };

    const checkAndUpdate = () => {
      const nowMs = getNow();
      const target = computeTargetLightingMode(state, nowMs);
      let needsAnimation = false;

      const perfNow = typeof performance !== "undefined" ? performance.now() : Date.now();
      const tr = transitionRef.current;
      const curVals = currentValsRef.current;
      const isStillFading =
        Math.abs(curVals.screen - tr.targetVal) > 0.001 ||
        Math.abs(curVals.stage - tr.targetVal) > 0.001 ||
        Math.abs(curVals.audience - tr.targetVal) > 0.001;

      if (target !== tr.targetMode) {
        tr.startTime = perfNow;
        tr.fromScreen = curVals.screen;
        tr.fromStage = curVals.stage;
        tr.fromAudience = curVals.audience;
        tr.targetVal = target === "RED" ? 1 : 0;
        tr.targetMode = target;
        setCurrentMode(target);
        needsAnimation = true;
      } else if (isStillFading) {
        // Continue animation towards targetVal if interrupted by a state update
        needsAnimation = true;
      }

      // Check pre-match idle transitions
      const targetIdle = isPreMatchIdle(state);
      const itr = idleTransitionRef.current;
      const isIdleStillFading = Math.abs(currentIdleValRef.current - itr.targetVal) > 0.001;

      if (targetIdle !== itr.targetIdle) {
        itr.startTime = perfNow;
        itr.fromVal = currentIdleValRef.current;
        itr.targetVal = targetIdle ? 1.0 : 0.0;
        itr.targetIdle = targetIdle;
        setIsIdle(targetIdle);
        needsAnimation = true;
      } else if (isIdleStillFading) {
        needsAnimation = true;
      }

      if (needsAnimation) {
        startTransitionAnimation();
      }

      // If in VCNV or Tăng Tốc question phase with startedAt, schedule exact one-shot timeout for 2.5s delay
      if (target === "BLUE" && state?.stage === "playing") {
        let startedAt: number | undefined;
        if (state.currentRound === "vcnv" && state.vcnv?.phase === "question") {
          startedAt = state.vcnv.timer?.startedAt ?? undefined;
        } else if (state.currentRound === "tangToc" && state.tangToc?.phase === "question") {
          startedAt = state.tangToc.timer?.startedAt ?? undefined;
        }
        if (startedAt != null) {
          const remainingMs = Math.max(10, Math.ceil(2500 - (nowMs - startedAt)));
          if (remainingMs > 0 && remainingMs <= 2500) {
            delayTimer = setTimeout(checkAndUpdate, remainingMs + 10);
          }
        }
      }
    };

    checkAndUpdate();

    return () => {
      if (delayTimer) clearTimeout(delayTimer);
      if (animId) cancelAnimationFrame(animId);
    };
  }, [state, getNow]);

  // Khởi Động Riêng & Về Đích Special Behaviors
  const isVeDich = state?.stage === "playing" && state?.currentRound === "veDich";
  const vd = isVeDich ? state?.veDich : null;
  const isVeDichDimmed = Boolean(
    isVeDich && vd && (vd.onStage || (vd.phase !== "idle" && vd.phase !== "seatDone"))
  );

  const kd = state?.stage === "playing" && state?.currentRound === "khoiDong" ? state?.khoiDong : null;
  const curKdSeg = kd?.segments?.[kd.segIdx ?? 0];
  const isSoloKd = Boolean(
    kd &&
    kd.started &&
    curKdSeg?.kind === "solo" &&
    kd.phase !== "idle" &&
    kd.phase !== "segmentDone"
  );
  const soloKdSeat = isSoloKd ? (curKdSeg?.seat ?? 0) : null;

  const isContestantDimmed = isVeDichDimmed || isSoloKd;
  const activeMainContestantSeat = isVeDich
    ? (vd ? (vd.order?.[vd.turnIdx] ?? 0) : null)
    : isSoloKd
      ? soloKdSeat
      : null;

  const isStealPhase = Boolean(isVeDich && vd?.phase === "stealing");
  const rawBuzzedSeat = isVeDich && vd?.steal?.buzzedSeat != null ? vd.steal.buzzedSeat : null;
  const isStealActive = isStealPhase || (isVeDich && vd?.phase === "result" && rawBuzzedSeat != null);
  const totalSeats = state?.seats?.length || 4;

  const [chaseState, setChaseState] = useState<{
    isChasing: boolean;
    activeIndices: number[];
    lockedSeat: number | null;
  }>({
    isChasing: isStealPhase && rawBuzzedSeat == null,
    activeIndices: [0],
    lockedSeat: rawBuzzedSeat,
  });

  const buzzTimestampRef = useRef<number | null>(null);
  const stealStartedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isStealActive) {
      buzzTimestampRef.current = null;
      stealStartedAtRef.current = null;
      setChaseState({
        isChasing: false,
        activeIndices: [0],
        lockedSeat: null,
      });
      return;
    }

    if (stealStartedAtRef.current == null) {
      stealStartedAtRef.current = vd?.steal?.timer?.startedAt ?? getNow();
    }

    if (rawBuzzedSeat != null && buzzTimestampRef.current == null) {
      buzzTimestampRef.current = getNow();
    }

    const updateChase = () => {
      const now = getNow();
      const startedAt = stealStartedAtRef.current ?? now;
      const elapsedSec = Math.max(0, (now - startedAt) / 1000);
      const buzzElapsedSec =
        buzzTimestampRef.current != null ? Math.max(0, (buzzTimestampRef.current - startedAt) / 1000) : null;
      const res = evaluate5sStealSpotlights(elapsedSec, totalSeats, rawBuzzedSeat, buzzElapsedSec);
      setChaseState({
        isChasing: res.isChasing,
        activeIndices: res.activeLightIndices.length > 0 ? res.activeLightIndices : [0],
        lockedSeat: res.lockedSeat,
      });
    };

    updateChase();
    const interval = setInterval(updateChase, 40);
    return () => clearInterval(interval);
  }, [isStealActive, rawBuzzedSeat, totalSeats, getNow, vd?.steal?.timer?.startedAt]);

  const is5sBuzzerChasing = chaseState.isChasing || (isStealPhase && rawBuzzedSeat == null);
  const lockedSpotlightSeat = chaseState.lockedSeat ?? rawBuzzedSeat;

  return {
    targetMode: currentMode,
    screenFadeProgress: screenVal,
    stageFadeProgress: stageVal,
    audienceFadeProgress: audienceVal,
    isIdle,
    idleFadeProgress: idleFadeVal,
    isSeatBuzzed: (seatId: number) => isSeatBuzzedIn3D(seatId, state),
    isContestantDimmed,
    isVeDichDimmed,
    activeMainContestantSeat,
    is5sBuzzerChasing,
    spotlightChaseIndex: chaseState.activeIndices[0] ?? 0,
    spotlightChaseIndices: chaseState.activeIndices,
    lockedSpotlightSeat,
  };
}
