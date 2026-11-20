"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import type { OlympiaState } from "@/lib/olympia/types";
import { getEntranceSeatTiming } from "@/lib/olympia/entrance-geometry";
import { isRoundPostIntroStandby } from "./CameraController";

export interface OlympiaCameraState {
  camAngle: number;
  transitionMode: "CUT" | "MORPH";
  isOverlayHidden: boolean;
  pushInProgress: number;
  qIdx?: number;
  questionRevealed?: boolean;
}

/**
 * Maps seat index (0..N-1) to camera preset:
 * Seats 0..3 -> CAM 5..8 (TS 1..4)
 * Seats 4..7 -> CAM 25..28 (TS 5..8: dải an toàn, không xung đột góc studio C11..C15)
 */
export function getCameraForSeat(seatId: number, totalSeats: number = 4): number {
  if (seatId < 0) return 1;
  const count = Math.max(1, totalSeats);
  const clamped = Math.min(count - 1, seatId);
  return clamped < 4 ? 5 + clamped : 25 + (clamped - 4);
}

/**
 * Evaluates the broadcast camera preset for the contestant entrance sequence:
 * Alternating dual-door entrance (Left door: seats 0, 2, 4...; Right door: seats 1, 3, 5...):
 * 1. 0.0s -> 0.8s: Tight close-up aimed directly at the corresponding door (CAM 11 for Left door, CAM 12 for Right door).
 * 2. 0.8s -> 1.8s: Gentle zoom out and downwards (CAM 13 with morph) as contestant walks down upper stairs to center dais landing.
 * 3. 1.8s -> 3.0s: Holds completely still at center dais landing (CAM 13 with cut, pushInProgress: 0) while contestant poses/greets.
 * 4. 3.0s -> 4.0s: High-right overhead camera (CAM 19) pointing downward along stairs following contestant descending to dais floor.
 * 5. >= 4.0s: For seat < activeCount - 1: Seamless cut straight to next contestant's door (never cuts to CAM 10 in between!).
 *             For last seat: Tracks desk arrival, then cuts to targetCam close-up before completing entrance.
 */
export function evaluateEntranceCameraState(
  currentSeat: number,
  activeCount: number,
  elapsedSec: number
): OlympiaCameraState {
  const count = Math.max(1, activeCount);
  const clampedSeat = Math.min(count - 1, Math.max(0, currentSeat));
  const isLastSeat = clampedSeat >= count - 1;
  const isDoorLeft = clampedSeat % 2 === 0;
  const doorCam = isDoorLeft ? 11 : 12;
  const targetCam = getCameraForSeat(clampedSeat, count);
  const seatTiming = getEntranceSeatTiming(clampedSeat, count);

  // Phase 1 (0.0s -> 0.8s): Tight close-up right at the corresponding door
  if (elapsedSec < 0.8) {
    return {
      camAngle: doorCam,
      transitionMode: "CUT",
      isOverlayHidden: false,
      pushInProgress: 0.0,
    };
  }

  // Phase 2 (0.8s -> 1.8s): Zoom out down slightly towards center landing
  if (elapsedSec < 1.8) {
    return {
      camAngle: 13,
      transitionMode: "MORPH",
      isOverlayHidden: false,
      pushInProgress: 0.0,
    };
  }

  // Phase 3 (1.8s -> 3.0s): Stand completely still at pose position on center landing
  if (elapsedSec < 3.0) {
    return {
      camAngle: 13,
      transitionMode: "CUT",
      isOverlayHidden: false,
      pushInProgress: 0.0,
    };
  }

  // Phase 4 (3.0s -> 4.0s): High-right angle above head pointing downwards following movement
  if (elapsedSec < 4.0) {
    return {
      camAngle: 19,
      transitionMode: "CUT",
      isOverlayHidden: false,
      pushInProgress: 0.0,
    };
  }

  // Phase 5 (>= 4.0s):
  // If NOT the last seat: Next seat begins at 4.0s. If still evaluating before engine advances:
  // Pre-frame the next contestant's door directly! NEVER cut to CAM 10!
  if (!isLastSeat) {
    const nextDoorCam = ((clampedSeat + 1) % 2 === 0) ? 11 : 12;
    return {
      camAngle: nextDoorCam,
      transitionMode: "CUT",
      isOverlayHidden: false,
      pushInProgress: 0.0,
    };
  }

  // For the last seat:
  // When last seat reaches desk arrival, frame desk close-up
  if (elapsedSec >= seatTiming.arrivalSec) {
    return {
      camAngle: targetCam,
      transitionMode: "CUT",
      isOverlayHidden: false,
      pushInProgress: 0.0,
    };
  }

  // While last contestant is walking to desk along corridor:
  return {
    camAngle: 10,
    transitionMode: "CUT",
    isOverlayHidden: false,
    pushInProgress: 0.0,
  };
}

/**
 * Computes evenly partitioned VCNV 15s contestant camera slot (0..slots-1) with >= 3.0s dwell
 * and zero <2s sliver cuts right before returning to wide CAM 10 at t = 15s.
 */
export function evaluateVcnvTimerSeat(elapsedSec: number, activeCount: number): number {
  const count = Math.max(1, activeCount);
  const slots = count <= 4 ? count : 5;
  const slotDur = 15.0 / slots;
  const slotIdx = Math.min(slots - 1, Math.max(0, Math.floor(elapsedSec / slotDur)));
  return slotIdx % count;
}

/**
 * Evaluates Về Đích stage camera state with anti-early-cut dwell:
 * - Holds CAM 10 for the first 2.0s of walking out around the rear corridor before morphing to CAM 15.
 * - CAM 15: Over-The-Shoulder (OTS) looking up at large LED screen ([0.32, 1.55, 1.55], target [0.0, 2.30, -4.50], fov 38).
 * - CAM 17: Dramatic 3/4 Profile of active contestant ([-1.45, 1.45, -0.45], target [0.0, 1.35, 0.55], fov 36).
 * - R5: Practical countdown auto cuts to CAM 2 (Right Screen 3D Flip Clock), returning to CAM 1 on completion.
 * - Holds reaction shot for 1.5s on result before cutting to MC CAM 3.
 */
export function evaluateVeDichCameraState(
  vd: NonNullable<OlympiaState["veDich"]>,
  now: number,
  phaseEnteredAt: number,
  onStageEnteredAt: number,
  activeCount: number,
  lastVdBuzzedSeatRef?: { current: number | null },
  vdBuzzedAtRef?: { current: number }
): OlympiaCameraState {
  if (vd.phase === "result") {
    const resultElapsed = Math.max(0, (now - phaseEnteredAt) / 1000);
    if (resultElapsed < 1.5) {
      const reactionCam =
        vd.steal?.buzzedSeat != null
          ? getCameraForSeat(vd.steal.buzzedSeat, activeCount)
          : 15;
      return {
        camAngle: reactionCam,
        transitionMode: "CUT",
        isOverlayHidden: false,
        pushInProgress: 0.12,
      };
    }
    return {
      camAngle: 3,
      transitionMode: "CUT",
      isOverlayHidden: false,
      pushInProgress: 0,
    };
  }

  if (vd.phase === "stealing") {
    // R5: Practical question buzzer steal countdown active -> Auto cut to CAM 2 (Right Screen)
    if (vd.current?.q?.type === "practice") {
      if (vd.steal?.timer?.startedAt) {
        return {
          camAngle: 2,
          transitionMode: "CUT",
          isOverlayHidden: false,
          pushInProgress: 0,
        };
      }
      return {
        camAngle: 1,
        transitionMode: "CUT",
        isOverlayHidden: false,
        pushInProgress: 0,
      };
    }

    if (vd.steal?.buzzedSeat != null) {
      if (lastVdBuzzedSeatRef && vdBuzzedAtRef) {
        if (lastVdBuzzedSeatRef.current !== vd.steal.buzzedSeat) {
          lastVdBuzzedSeatRef.current = vd.steal.buzzedSeat;
          vdBuzzedAtRef.current = now;
        }
        const elapsedSinceBuzz = (now - vdBuzzedAtRef.current) / 1000;
        if (elapsedSinceBuzz < 1.0) {
          return {
            camAngle: 10,
            transitionMode: "CUT",
            isOverlayHidden: false,
            pushInProgress: 0.1,
          };
        }
      }
      return {
        camAngle: getCameraForSeat(vd.steal.buzzedSeat, activeCount),
        transitionMode: "CUT",
        isOverlayHidden: false,
        pushInProgress: 0.2,
      };
    }
    if (lastVdBuzzedSeatRef) lastVdBuzzedSeatRef.current = null;
    if (vdBuzzedAtRef) vdBuzzedAtRef.current = 0;
    return {
      camAngle: 10,
      transitionMode: "CUT",
      isOverlayHidden: false,
      pushInProgress: 0,
    };
  }

  if (vd.phase === "idle") {
    if (vd.onStage) {
      const onStageElapsed = Math.max(0, (now - onStageEnteredAt) / 1000);
      if (onStageElapsed < 3.8) {
        return {
          camAngle: 1,
          transitionMode: "MORPH",
          isOverlayHidden: false,
          pushInProgress: 0,
        };
      }
      return {
        camAngle: 15,
        transitionMode: "MORPH",
        isOverlayHidden: false,
        pushInProgress: 0,
      };
    }
    return {
      camAngle: 1,
      transitionMode: "MORPH",
      isOverlayHidden: false,
      pushInProgress: 0,
    };
  }

  if (vd.phase === "choosing") {
    const onStageElapsed = Math.max(0, (now - onStageEnteredAt) / 1000);
    if (onStageElapsed < 3.8) {
      return {
        camAngle: 1,
        transitionMode: "MORPH",
        isOverlayHidden: false,
        pushInProgress: 0,
      };
    }
    return {
      camAngle: 15,
      transitionMode: "MORPH",
      isOverlayHidden: false,
      pushInProgress: 0,
    };
  }

  if (vd.phase === "packageReady") {
    return {
      camAngle: 15,
      transitionMode: "MORPH",
      isOverlayHidden: false,
      pushInProgress: 0,
    };
  }

  if (vd.phase === "thinking") {
    // R5: Practical question main candidate countdown active -> Auto cut to CAM 2 (Right Screen)
    if (vd.current?.q?.type === "practice") {
      if (vd.timer?.startedAt) {
        return {
          camAngle: 2,
          transitionMode: "CUT",
          isOverlayHidden: false,
          pushInProgress: 0,
        };
      }
      return {
        camAngle: 1,
        transitionMode: "CUT",
        isOverlayHidden: false,
        pushInProgress: 0,
      };
    }

    let push = 0;
    const duration = vd.timer?.totalMs || 20000;
    const elapsedSec = vd.timer?.startedAt ? Math.max(0, (now - vd.timer.startedAt) / 1000) : 0;
    if (vd.timer?.startedAt) {
      push = Math.min(1.0, (now - vd.timer.startedAt) / duration);
    }
    // Dynamic Director Pacing during Về Đích thinking countdown:
    // For 15s/20s/30s questions:
    // 0.0s -> 4.5s: Tight OTS shot on contestant looking up at LED screen (CAM 15) pushing in smoothly
    // 4.5s -> 7.5s: Cut to MC (CAM 3) intently watching the contestant
    // 7.5s onwards: Cut back to OTS (CAM 15) as countdown reaches climax
    let cam = 15;
    if (duration >= 14000 && elapsedSec >= 4.5 && elapsedSec < 7.5) {
      cam = 3;
    }
    return {
      camAngle: cam,
      transitionMode: "CUT",
      isOverlayHidden: false,
      pushInProgress: push,
    };
  }

  if (vd.phase === "seatDone") {
    return {
      camAngle: 1,
      transitionMode: "MORPH",
      isOverlayHidden: false,
      pushInProgress: 0,
    };
  }

  return {
    camAngle: 15,
    transitionMode: "CUT",
    isOverlayHidden: false,
    pushInProgress: 0,
  };
}

/**
 * Auto-camera logic for Olympia 3D Broadcast Studio.
 * Computes camera angles, cuts/morphs, dolly pushes, and overlay suppression based on round state.
 */
export function useOlympiaCameraState(
  state: OlympiaState | null | undefined,
  serverNow?: () => number
): OlympiaCameraState {
  const getNow = serverNow || (() => Date.now());
  const [tick, setTick] = useState(0);

  const lastRoundRef = useRef<string | null>(null);
  const roundEnteredAtRef = useRef<number>(Date.now());
  const lastPhaseRef = useRef<string | null>(null);
  const phaseEnteredAtRef = useRef<number>(Date.now());
  const lastVdRef = useRef<{ turnIdx: number; mode: string }>({ turnIdx: -1, mode: "idle" });
  const vdOnStageEnteredAtRef = useRef<number>(Date.now());
  const lastKdBuzzedSeatRef = useRef<number | null>(null);
  const kdBuzzedAtRef = useRef<number>(0);
  const lastVcnvBuzzedSeatRef = useRef<number | null>(null);
  const vcnvBuzzedAtRef = useRef<number>(0);
  const lastVdBuzzedSeatRef = useRef<number | null>(null);
  const vdBuzzedAtRef = useRef<number>(0);
  const lastChpBuzzedSeatRef = useRef<number | null>(null);
  const chpBuzzedAtRef = useRef<number>(0);

  const lastKdQIdxRef = useRef<number>(-1);
  const lastKdRevealedRef = useRef<boolean>(false);
  const kdQuestionEnteredAtRef = useRef<number>(0);
  const kdFrozenPushRef = useRef<number | null>(null);

  // Synchronously update question entered timestamp on render frame 0 of a new question
  const kdQIdx = state?.khoiDong?.qIdx ?? -1;
  const kdRevealed = Boolean(state?.khoiDong?.questionRevealed);
  if (kdQIdx !== lastKdQIdxRef.current || (kdRevealed && !lastKdRevealedRef.current)) {
    lastKdQIdxRef.current = kdQIdx;
    lastKdRevealedRef.current = kdRevealed;
    kdQuestionEnteredAtRef.current = getNow();
    kdFrozenPushRef.current = null;
  } else if (!kdRevealed) {
    lastKdRevealedRef.current = false;
  }

  useEffect(() => {
    if (state?.currentRound && state.currentRound !== lastRoundRef.current) {
      lastRoundRef.current = state.currentRound;
      roundEnteredAtRef.current = getNow();
    }
  }, [state?.currentRound]);

  const wasIntroOrEntranceRef = useRef<boolean>(false);
  useEffect(() => {
    const active =
      Boolean(state?.introTimer) ||
      Boolean(state?.entranceState?.active) ||
      Boolean(state?.banner);
    if (wasIntroOrEntranceRef.current && !active) {
      roundEnteredAtRef.current = getNow();
    }
    wasIntroOrEntranceRef.current = active;
  }, [state?.introTimer, state?.entranceState?.active, state?.banner]);

  useEffect(() => {
    const curPhase = state?.khoiDong?.phase || state?.veDich?.phase || "";
    if (curPhase && curPhase !== lastPhaseRef.current) {
      lastPhaseRef.current = curPhase;
      phaseEnteredAtRef.current = getNow();
    }
  }, [state?.khoiDong?.phase, state?.veDich?.phase]);

  useEffect(() => {
    const vd = state?.veDich;
    const turnIdx = vd?.turnIdx ?? 0;
    const p = vd?.phase ?? "idle";
    const mode = vd?.onStage ? "onStage" : p === "seatDone" ? "seatDone" : "idle";
    if (turnIdx !== lastVdRef.current.turnIdx || mode !== lastVdRef.current.mode) {
      lastVdRef.current = { turnIdx, mode };
      vdOnStageEnteredAtRef.current = getNow();
    }
  }, [state?.veDich?.turnIdx, state?.veDich?.phase, state?.veDich?.onStage]);

  // Run 100ms ticker when a time-critical camera transition is active:
  // - Entrance sequence, intro video / post-intro hold
  // - Active buzzer press across any round (held for 1.0s before auto-cutting to contestant)
  // - Active thinking countdown with dynamic camera director pacing
  // - Về Đích stage walk / package ready
  const hasActiveBuzzer = Boolean(
    state?.khoiDong?.buzzedSeat != null ||
      state?.veDich?.steal?.buzzedSeat != null ||
      Boolean(state?.vcnv?.bells && state.vcnv.bells.length > 0) ||
      state?.cauHoiPhu?.buzzedSeat != null
  );

  const isThinking = Boolean(
    (state?.currentRound === "veDich" && state?.veDich?.phase === "thinking" && state?.veDich?.timer?.startedAt) ||
      (state?.currentRound === "vcnv" && state?.vcnv?.timer?.startedAt)
  );

  const needsTimedCameraTicker = Boolean(
    state?.entranceState?.active ||
      state?.introTimer ||
      isRoundPostIntroStandby(state, getNow()) ||
      hasActiveBuzzer ||
      isThinking ||
      (state?.currentRound === "khoiDong" &&
        state?.khoiDong &&
        (Boolean(state.khoiDong.startCooldownUntil && getNow() < state.khoiDong.startCooldownUntil + 2500) ||
          state.khoiDong.phase === "segmentDone")) ||
      Boolean(state?.summaryState?.active) ||
      (state?.currentRound === "veDich" &&
        state?.veDich &&
        ((state.veDich.phase === "idle" && state.veDich.onStage) ||
          state.veDich.phase === "choosing" ||
          state.veDich.phase === "packageReady"))
  );

  useEffect(() => {
    if (!needsTimedCameraTicker) return;
    const id = setInterval(() => setTick((t) => (t + 1) % 100000), 100);
    return () => clearInterval(id);
  }, [needsTimedCameraTicker]);

  const baseCameraState = useMemo<OlympiaCameraState>(() => {
    // Default fallback
    const defaultState: OlympiaCameraState = {
      camAngle: 3,
      transitionMode: "CUT",
      isOverlayHidden: false,
      pushInProgress: 0,
    };

    if (!state) return defaultState;

    const now = getNow();
    const activeCount = Math.max(1, state.seats.length);

    // 1. Olympia End-of-Round Score Summary Sequence:
    // Cleanly drives contestant close-ups (CAM 5..8 or CAM 25..28) or wide podium view (CAM 10 in fullscreen)
    // unless the director explicitly clicks a manual camera button AFTER summary started.
    if (state.summaryState?.active) {
      const isGraphic = state.summaryState.mode === "graphic" || state.summaryState.isFullscreen;
      if (isGraphic) {
        return {
          camAngle: 10,
          transitionMode: "CUT",
          isOverlayHidden: false,
          pushInProgress: 0,
        };
      }
      const idx = state.summaryState.currentIndex ?? 0;
      const ordered = state.summaryState.orderedSeats ?? [];
      const currentSeat = ordered[idx] ?? idx;
      const seatStart = state.summaryState.seatEnteredAt || state.summaryState.lastAdvanceAt || now;
      const elapsedOnSeat = Math.max(0, (now - seatStart) / 1000);

      // O27 Choreography:
      // - 0.0s -> 1.5s: Từ trạng thái thấy cả người + bảng điểm (0.75x - 0.8x) zoom lên 1.25x
      // - Sau 1.5s: Đứng im tại 1.25x (trong 1.5s với 2-4 TS, 1.0s với 5-6 TS, 0.5s với 7-8 TS)
      const push = Math.min(1.0, elapsedOnSeat / 1.5);
      const isO27 = state.summaryState.mode === "cinematic_o27" || state.summaryMode === "cinematic_o27";
      return {
        camAngle: 18, // Preset 18: wide_with_podium for activeSeat (zooms 0.75x -> 1.50x aimed at torso)
        transitionMode: "CUT",
        isOverlayHidden: isO27,
        pushInProgress: push,
      };
    }

    // 1.2. Host manual camera override (pinned until next gameplay transition or "TỰ ĐỘNG")
    if (state.studioCameraManual && state.studioCamera != null) {
      return {
        camAngle: state.studioCamera,
        transitionMode: "CUT",
        isOverlayHidden: false,
        pushInProgress: 0,
      };
    }

    // 1.5. Sequential Contestant Entrance Cinematic Sequence (Broadcast Smooth Directing)
    if (state.entranceState?.active) {
      const currentSeat = Math.min(activeCount - 1, Math.max(0, state.entranceState.currentSeatIdx ?? 0));
      const seatStart = state.entranceState.seatStartedAt || state.entranceState.startedAt || getNow();
      const elapsedSec = Math.max(0, (getNow() - seatStart) / 1000);
      return evaluateEntranceCameraState(currentSeat, activeCount, elapsedSec);
    }
    const round = state.currentRound;

    // 2. Stage transitions (Lobby / Finished)
    if (state.stage !== "playing") {
      if (state.stage === "finished") {
        // Match ended: camera moves to Laurel Wreath Vitrine
        return {
          camAngle: 4,
          transitionMode: "MORPH",
          isOverlayHidden: false,
          pushInProgress: 0,
        };
      }
      // Idle / Lobby / Pre-match: Frame MCs tightly with CAM 3
      return {
        camAngle: 3,
        transitionMode: "CUT",
        isOverlayHidden: false,
        pushInProgress: 0,
      };
    }

    // MC/Host manual trigger: Bật Đồ hoạ trường quay 3D / Hexagonal bất kỳ lúc nào
    if (state.showStageGraphics) {
      return {
        camAngle: 1, // CAM 1 Toàn Cảnh S14
        transitionMode: "MORPH",
        isOverlayHidden: true, // Tạm ẩn overlay để thưởng thức trọn vẹn trường quay 3D
        pushInProgress: 0,
      };
    }

    // Opening show intro or standby waiting for Host to begin Khởi Động:
    // Focus directly on MCs (CAM 3) with dignified broadcaster framing
    if (state.introTimer || state.introStandby) {
      return {
        camAngle: 3,
        transitionMode: "MORPH",
        isOverlayHidden: false,
        pushInProgress: 0.15,
      };
    }

    // 2.8. Post-Intro Opening Round Camera Sequence (applies to all 4 rounds: Khởi Động, VCNV, Tăng Tốc, Về Đích):
    // Tối giản 2 giai đoạn: Bục MC (CAM 3, trong 3s) -> Toàn cảnh trường quay (CAM 1) chờ Host bắt đầu thi
    if (isRoundPostIntroStandby(state, now)) {
      const baseTime = state?.roundIntroDoneAt ?? roundEnteredAtRef.current;
      const postIntroElapsed = Math.max(0, (now - baseTime) / 1000);
      if (postIntroElapsed < 3.0) {
        return {
          camAngle: 3,
          transitionMode: "CUT",
          isOverlayHidden: false,
          pushInProgress: Math.min(1.0, postIntroElapsed / 3.0) * 0.15,
        };
      }
      return {
        camAngle: 1, // Hết 3s chuyển thẳng về toàn cảnh trường quay chờ Host bắt đầu
        transitionMode: "MORPH",
        isOverlayHidden: false,
        pushInProgress: 0,
      };
    }

    // ── 3. KHỞI ĐỘNG ──────────────────────────────────────────────────────────
    if (round === "khoiDong" && state.khoiDong) {
      const kd = state.khoiDong;

      // 3.1. Khi nhấn Đúng / Sai:
      // USER REQUIREMENT: "mỗi khi nhấn đúng/sai, hệ thống chuyển sang góc quay thẳng bục MC và chỉ hiện đáp án Khởi động, đồ hoạ câu hỏi tạm gác"
      if (kd.phase === "result" || kd.lastVerdict != null) {
        return {
          camAngle: 3, // Góc quay thẳng bục MC
          transitionMode: "CUT",
          isOverlayHidden: false, // Hiển thị thanh đáp án trên màn hình
          pushInProgress: 0,
        };
      }

      const seg = kd.segments?.[kd.segIdx];
      const isSolo = seg?.kind === "solo";
      const seatId = isSolo ? (seg?.seat ?? 0) : (kd.buzzedSeat ?? 0);
      const validSeat = typeof seatId === "number" && seatId >= 0 && seatId < activeCount;
      const targetContestantCam = isSolo
        ? (validSeat ? getCameraForSeat(seatId, activeCount) : 1)
        : (kd.buzzedSeat != null ? getCameraForSeat(kd.buzzedSeat, activeCount) : 10);

      // 3.2. Khi chưa nhấn Bắt đầu (màn chờ Khởi Động):
      // Giữ zoom in bục MC 2.8s để MC dẫn trọn lời trước khi zoom out toàn cảnh (CAM 1)
      if (!kd.started && (kd.phase === "intro" || kd.phase === "idle" || kd.qIdx < 0)) {
        const introElapsed = Math.max(0, (now - (state.roundIntroDoneAt ?? roundEnteredAtRef.current)) / 1000);
        if (introElapsed < 2.8) {
          return {
            camAngle: 3, // Zoom in bục MC
            transitionMode: "CUT",
            isOverlayHidden: false,
            pushInProgress: Math.min(1.0, introElapsed / 2.8) * 0.15,
          };
        }
        return {
          camAngle: 1, // Toàn cảnh trường quay bao quát toàn bộ bục thí sinh
          transitionMode: "MORPH",
          isOverlayHidden: false,
          pushInProgress: 0,
        };
      }

      // 3.3. Khi nhấn Bắt đầu (trong 3.5s đầu):
      // Smooth continuous sweep từ góc toàn cảnh CAM 14
      if (kd.startCooldownUntil && now < kd.startCooldownUntil) {
        return {
          camAngle: 14,
          transitionMode: "MORPH",
          isOverlayHidden: false,
          pushInProgress: 0.15,
        };
      }

      // 3.3b. Sau 3.5s đầu: CUT sang CAM 10 rồi lướt zoom (morph) về đúng góc thí sinh tương ứng trong 2.5s
      if (kd.startCooldownUntil && now < kd.startCooldownUntil + 2500) {
        return {
          camAngle: targetContestantCam,
          transitionMode: "MORPH",
          isOverlayHidden: false,
          pushInProgress: 0.25,
        };
      }

      // 3.4. Khi đồ hoạ câu hỏi hiện lên nhưng chưa mở nội dung:
      if (!kd.questionRevealed) {
        return {
          camAngle: targetContestantCam,
          transitionMode: "CUT",
          isOverlayHidden: false,
          pushInProgress: 0,
        };
      }

      // 3.5. Trong mỗi câu hỏi Khởi Động:
      // USER REQUIREMENT:
      // - Ở mỗi câu hỏi, ngay khi nhấn câu tiếp (qIdx thay đổi), tự động zoom in lên tối đa 1.25x lên cận mặt trong khoảng 7.5s
      // - Zoom in xong trong 7.5s thì đứng yên ở mức zoom tối đa (1.25x / push=1.0), không tự hoàn lại nữa
      // - Khi chuyển câu tiếp theo: tự quay về mức cũ (1.0x / push=0.0) rồi mới zoom in tiếp
      // - Khi nhấn tính giờ (isTimerRunning): tạm dừng zoom, đứng yên tại mức hiện tại để tránh xung đột
      if (kd.phase === "question" || kd.started) {
        if (isSolo) {
          const isTimerRunning = Boolean(
            kd.timer?.startedAt &&
            now >= kd.timer.startedAt &&
            (!kd.timer.totalMs || (now - kd.timer.startedAt < kd.timer.totalMs))
          );

          let push = 0;
          if (isTimerRunning) {
            // Đóng băng zoom khi timer đang chạy (nhấn tính giờ)
            if (kdFrozenPushRef.current === null) {
              const qStart = kdQuestionEnteredAtRef.current || now;
              const elapsedSec = Math.max(0, ((kd.timer?.startedAt || now) - qStart) / 1000);
              kdFrozenPushRef.current = Math.min(1.0, elapsedSec / 7.5);
            }
            push = kdFrozenPushRef.current;
          } else {
            kdFrozenPushRef.current = null;
            const qStart = kdQuestionEnteredAtRef.current || now;
            const elapsedSec = Math.max(0, (now - qStart) / 1000);
            // 7.5s từ 1.0x (push=0.0) lên 1.25x (push=1.0)
            // Sau 7.5s: Math.min(1.0, ...) giữ chặt ở mức tối đa 1.25x (push=1.0), không tự hoàn lại
            push = Math.min(1.0, elapsedSec / 7.5);
          }

          return {
            camAngle: targetContestantCam,
            transitionMode: "CUT",
            isOverlayHidden: false,
            pushInProgress: push, // 0.0 (1.0x) -> 1.0 (1.25x)
          };
        } else {
          // Lượt chung / O22 / O23: Khi có thí sinh bấm chuông, giữ CAM 10 toàn cảnh trong 0.8s để khán giả quan sát đèn đỏ bục trước khi CUT sang cận cảnh thí sinh
          if (kd.buzzedSeat != null) {
            if (lastKdBuzzedSeatRef.current !== kd.buzzedSeat) {
              lastKdBuzzedSeatRef.current = kd.buzzedSeat;
              kdBuzzedAtRef.current = now;
            }
            const elapsedSinceBuzz = (now - kdBuzzedAtRef.current) / 1000;
            if (elapsedSinceBuzz < 1.0) {
              return {
                camAngle: 10,
                transitionMode: "CUT",
                isOverlayHidden: false,
                pushInProgress: 0.1,
              };
            }
            return {
              camAngle: getCameraForSeat(kd.buzzedSeat, activeCount),
              transitionMode: "CUT",
              isOverlayHidden: false,
              pushInProgress: 0.20,
            };
          } else {
            lastKdBuzzedSeatRef.current = null;
            kdBuzzedAtRef.current = 0;
            return {
              camAngle: 10,
              transitionMode: "CUT",
              isOverlayHidden: false,
              pushInProgress: 0.1,
            };
          }
        }
      }

      // 3.6. Khi nhấn Kết thúc lượt (ở lượt riêng, hoặc O13 - O21):
      // - Giai đoạn 1 (0.0s -> 1.5s): Chuyển sang đúng camera thí sinh đó ở góc rộng (0.75x - 0.8x, hiện đủ cả người lẫn bảng điểm), zoom lên 1.25x trong 1.5s
      // - Giai đoạn 2 (1.5s): CUT ngay sang toàn cảnh CAM 1 (không morph), bắt đầu ở trạng thái nghiêng về bên trái (khu vực bục thí sinh, CAM 19)
      // - Giai đoạn 3 (1.5s -> 4.5s): Quay êm ái từ góc nghiêng trái về góc toàn cảnh mặc định trong 3.0s (không giật)
      if (kd.phase === "segmentDone") {
        const segDoneElapsed = Math.max(0, (now - phaseEnteredAtRef.current) / 1000);
        if (segDoneElapsed < 2.0) {
          const pushIn = Math.min(1.0, segDoneElapsed / 2.0);
          return {
            camAngle: 18, // Preset 18: Wide framing showing both contestant body & podium scoreboard
            transitionMode: "CUT",
            isOverlayHidden: false,
            pushInProgress: pushIn, // 0.0 -> 1.0 (zoom up to 1.25x)
          };
        }
        if (segDoneElapsed < 4.5) {
          const isImmediateCut = segDoneElapsed < 2.08;
          return {
            camAngle: segDoneElapsed < 2.5 ? 29 : 1,
            transitionMode: isImmediateCut ? "CUT" : "MORPH",
            isOverlayHidden: false,
            pushInProgress: 0,
          };
        }
        return {
          camAngle: 1,
          transitionMode: "CUT",
          isOverlayHidden: false,
          pushInProgress: 0,
        };
      }

      if (isSolo) {
        return {
          camAngle: targetContestantCam,
          transitionMode: "CUT",
          isOverlayHidden: false,
          pushInProgress: 0,
        };
      }

      return {
        camAngle: 10,
        transitionMode: "CUT",
        isOverlayHidden: false,
        pushInProgress: 0,
      };
    }

    // ── 4. VƯỢT CHƯỚNG NGẠI VẬT (VCNV) ───────────────────────────────────────
    if (round === "vcnv" && state.vcnv) {
      const v = state.vcnv;

      // If someone rang the obstacle bell:
      // USER REQUIREMENT: Hệ thống luôn ưu tiên đưa code xử lý tín hiệu đỏ bục lên trước việc hiện tín hiệu lên đồ hoạ.
      // Giữ CAM 10 toàn cảnh bục trong 0.8s để khán giả quan sát bục sáng đỏ rực trước khi CUT sang cận cảnh thí sinh.
      if (v.bells && v.bells.length > 0) {
        const fastestSeat = v.bells[0].seat;
        if (fastestSeat >= 0 && fastestSeat < activeCount) {
          if (lastVcnvBuzzedSeatRef.current !== fastestSeat) {
            lastVcnvBuzzedSeatRef.current = fastestSeat;
            vcnvBuzzedAtRef.current = now;
          }
          const elapsed = (now - vcnvBuzzedAtRef.current) / 1000;
          if (elapsed < 1.0) {
            return {
              camAngle: 10,
              transitionMode: "CUT",
              isOverlayHidden: false,
              pushInProgress: 0.1,
            };
          }
          return {
            camAngle: getCameraForSeat(fastestSeat, activeCount),
            transitionMode: "CUT",
            isOverlayHidden: false,
            pushInProgress: 0.2,
          };
        }
      } else {
        lastVcnvBuzzedSeatRef.current = null;
        vcnvBuzzedAtRef.current = 0;
      }

      // Camera VCNV: Divide 15s evenly so each shot gets >= 3.0s–7.5s dwell and ZERO <2s tail sliver cut at 14s
      const startedAt = v.timer?.startedAt;
      const isTimerRunning = startedAt != null;
      const elapsed = startedAt ? Math.max(0, (now - startedAt) / 1000) : 0;

      if (isTimerRunning && elapsed <= 15.0) {
        const cycleSeat = evaluateVcnvTimerSeat(elapsed, activeCount);
        return {
          camAngle: getCameraForSeat(cycleSeat, activeCount),
          transitionMode: "CUT",
          isOverlayHidden: false,
          pushInProgress: 0.1,
        };
      }

      if (v.phase === "selecting") {
        return {
          camAngle: 3, // Bục MC
          transitionMode: "CUT",
          isOverlayHidden: false,
          pushInProgress: 0,
        };
      }

      return {
        camAngle: 10, // Toàn cảnh
        transitionMode: "CUT",
        isOverlayHidden: false,
        pushInProgress: 0,
      };
    }

    // ── 5. TĂNG TỐC ──────────────────────────────────────────────────────────
    if (round === "tangToc") {
      // USER REQUIREMENT: "Tăng tốc: Chủ yếu hiện nội dung câu hỏi full màn hình và đáp án, nên không có tự chuyển cảnh"
      return {
        camAngle: 1, // Toàn cảnh
        transitionMode: "CUT",
        isOverlayHidden: false,
        pushInProgress: 0,
      };
    }

    // ── 6. VỀ ĐÍCH ───────────────────────────────────────────────────────────
    if (round === "veDich" && state.veDich) {
      return evaluateVeDichCameraState(
        state.veDich,
        now,
        phaseEnteredAtRef.current,
        vdOnStageEnteredAtRef.current,
        activeCount,
        lastVdBuzzedSeatRef,
        vdBuzzedAtRef
      );
    }

    // ── 7. CÂU HỎI PHỤ ───────────────────────────────────────────────────────
    if (round === "cauHoiPhu" && state.cauHoiPhu) {
      const chp = state.cauHoiPhu;
      if (chp.buzzedSeat != null && chp.buzzedSeat >= 0 && chp.buzzedSeat < activeCount) {
        if (lastChpBuzzedSeatRef.current !== chp.buzzedSeat) {
          lastChpBuzzedSeatRef.current = chp.buzzedSeat;
          chpBuzzedAtRef.current = now;
        }
        const elapsed = (now - chpBuzzedAtRef.current) / 1000;
        if (elapsed < 1.0) {
          return {
            camAngle: 10,
            transitionMode: "CUT",
            isOverlayHidden: false,
            pushInProgress: 0.1,
          };
        }
        return {
          camAngle: getCameraForSeat(chp.buzzedSeat, activeCount),
          transitionMode: "CUT",
          isOverlayHidden: false,
          pushInProgress: 0.3,
        };
      } else {
        lastChpBuzzedSeatRef.current = null;
        chpBuzzedAtRef.current = 0;
      }
      return {
        camAngle: 2,
        transitionMode: "CUT",
        isOverlayHidden: false,
        pushInProgress: 0,
      };
    }

    return defaultState;
  }, [
    state,
    state?.banner,
    state?.stage,
    state?.currentRound,
    state?.seats?.length,
    state?.studioCameraManual,
    state?.studioCamera,
    state?.showStageGraphics,
    state?.introTimer,
    state?.entranceState?.active,
    state?.entranceState?.currentSeatIdx,
    state?.entranceState?.seatStartedAt,
    state?.summaryState?.active,
    state?.summaryState?.currentIndex,
    state?.summaryState?.isFullscreen,
    state?.khoiDong?.started,
    state?.khoiDong?.questionRevealed,
    state?.khoiDong?.startCooldownUntil,
    state?.khoiDong?.phase,
    state?.khoiDong?.buzzedSeat,
    state?.khoiDong?.lastVerdict,
    state?.khoiDong?.segIdx,
    state?.khoiDong?.qIdx,
    state?.khoiDong?.timer?.startedAt,
    state?.vcnv?.phase,
    state?.vcnv?.currentRow,
    state?.vcnv?.timer?.startedAt,
    state?.vcnv?.bells,
    state?.veDich?.phase,
    state?.veDich?.turnIdx,
    state?.veDich?.onStage,
    state?.veDich?.timer?.startedAt,
    state?.veDich?.steal?.buzzedSeat,
    state?.cauHoiPhu?.buzzedSeat,
    tick,
  ]);

  return useMemo(() => ({
    ...baseCameraState,
    qIdx: state?.khoiDong?.qIdx ?? -1,
    questionRevealed: Boolean(state?.khoiDong?.questionRevealed),
  }), [baseCameraState, state?.khoiDong?.qIdx, state?.khoiDong?.questionRevealed]);
}
