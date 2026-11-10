"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import type { OlympiaState } from "@/lib/olympia/types";

export interface OlympiaCameraState {
  camAngle: number;
  transitionMode: "CUT" | "MORPH";
  isOverlayHidden: boolean;
  pushInProgress: number;
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
 * - Anticipatory early cut to CAM 11 at t = 1.2s (~0.6s early) for Contestant N > 0.
 * - Gentle optical zoom push (0.0 -> 0.25) during center landing pose (1.8s -> 3.0s).
 */
export function evaluateEntranceCameraState(
  currentSeat: number,
  activeCount: number,
  elapsedSec: number
): OlympiaCameraState {
  const isFirstSeat = currentSeat === 0;
  const isLastSeat = currentSeat >= activeCount - 1;
  const targetCam = getCameraForSeat(currentSeat, activeCount);

  // Broadcast Choreography:
  // For Contestant 0 (first contestant):
  // - 0.0s -> 3.8s: CAM 11 (MCU direct greeting on center landing, with push zoom 0.25 during pose 1.8s - 3.0s)
  // - >= 3.8s: CAM 10 (Wide podiums view)
  // For Contestant N > 0:
  // - 0.0s -> 1.2s: CAM 10 (Wide view while previous contestant settles)
  // - 1.2s -> 3.8s: CAM 11 (Cut ~0.6s early while descending last 2 steps onto center landing, with push zoom 0.25 during pose 1.8s - 3.0s)
  // - >= 3.8s:
  //     If !isLastSeat: CAM 10 (continues wide view until next contestant reaches landing)
  //     If isLastSeat: CAM 10 from 3.8s -> 6.2s, then targetCam (desk close-up) from 6.2s -> 6.8s
  const isCam11Phase = isFirstSeat
    ? elapsedSec < 3.8
    : elapsedSec >= 1.2 && elapsedSec < 3.8;

  if (isCam11Phase) {
    // Optical zoom push (0.25) during pose greeting on center landing (1.8s -> 3.0s)
    const pushInProgress = elapsedSec < 1.8 ? 0.0 : Math.min(1.0, (elapsedSec - 1.8) / 1.2) * 0.25;
    return {
      camAngle: 11,
      transitionMode: "CUT",
      isOverlayHidden: false,
      pushInProgress,
    };
  }

  if (isLastSeat && elapsedSec >= 6.2) {
    // Last contestant has arrived behind their assigned desk: frame desk close-up
    return {
      camAngle: targetCam,
      transitionMode: "CUT",
      isOverlayHidden: false,
      pushInProgress: 0.0,
    };
  }

  // Default to CAM 10 (Toàn Cảnh Bục Thí Sinh)
  return {
    camAngle: 10,
    transitionMode: "CUT",
    isOverlayHidden: false,
    pushInProgress: 0.0,
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

  useEffect(() => {
    if (state?.currentRound && state.currentRound !== lastRoundRef.current) {
      lastRoundRef.current = state.currentRound;
      roundEnteredAtRef.current = getNow();
    }
  }, [state?.currentRound]);

  const wasIntroOrEntranceRef = useRef<boolean>(false);
  useEffect(() => {
    const active = Boolean(state?.introTimer) || Boolean(state?.entranceState?.active);
    if (wasIntroOrEntranceRef.current && !active) {
      roundEnteredAtRef.current = getNow();
    }
    wasIntroOrEntranceRef.current = active;
  }, [state?.introTimer, state?.entranceState?.active]);

  useEffect(() => {
    const curPhase = state?.khoiDong?.phase || state?.veDich?.phase || "";
    if (curPhase && curPhase !== lastPhaseRef.current) {
      lastPhaseRef.current = curPhase;
      phaseEnteredAtRef.current = getNow();
    }
  }, [state?.khoiDong?.phase, state?.veDich?.phase]);

  // Only run 100ms ticker when a time-varying camera transition is actively running (eliminates idle 10Hz re-renders)
  const needsTimedCameraTicker = Boolean(
    state?.entranceState?.active ||
      state?.introTimer ||
      state?.introStandby ||
      (state?.currentRound === "khoiDong" &&
        state?.khoiDong &&
        (!state.khoiDong.started ||
          Boolean(state.khoiDong.startCooldownUntil) ||
          Boolean(state.khoiDong.timer?.startedAt) ||
          state.khoiDong.phase === "segmentDone")) ||
      (state?.currentRound === "vcnv" && Boolean(state?.vcnv?.timer?.startedAt)) ||
      (state?.currentRound === "veDich" && Boolean(state?.veDich?.timer?.startedAt))
  );

  useEffect(() => {
    if (!needsTimedCameraTicker) return;
    const id = setInterval(() => setTick((t) => (t + 1) % 100000), 100);
    return () => clearInterval(id);
  }, [needsTimedCameraTicker]);

  return useMemo(() => {
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
      if (state.summaryState.isFullscreen) {
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
      const targetCam = getCameraForSeat(currentSeat, activeCount);
      return {
        camAngle: targetCam,
        transitionMode: "CUT",
        isOverlayHidden: false,
        pushInProgress: 0.08,
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

      // 3.2. Khi chưa nhấn Bắt đầu (hết intro Khởi động):
      // USER REQUIREMENT: "cơ mà hết intro Khởi động, nó chưa tự zoom in bục MC, sau đó quay toàn cảnh"
      if (!kd.started && (kd.phase === "intro" || kd.qIdx < 0)) {
        const introElapsed = Math.max(0, (now - roundEnteredAtRef.current) / 1000);
        if (introElapsed < 2.5) {
          return {
            camAngle: 3, // Zoom in bục MC
            transitionMode: "MORPH",
            isOverlayHidden: false,
            pushInProgress: Math.min(1.0, introElapsed / 2.5),
          };
        }
        return {
          camAngle: 1, // Quay toàn cảnh
          transitionMode: "MORPH",
          isOverlayHidden: false,
          pushInProgress: 0,
        };
      }

      // 3.3. Khi nhấn Bắt đầu (trong 3.5s đầu):
      // Smooth continuous sweep from floor level left of Laurel Vitrine up towards stage/contestant
      if (kd.startCooldownUntil && now < kd.startCooldownUntil) {
        return {
          camAngle: 14,
          transitionMode: "MORPH",
          isOverlayHidden: false,
          pushInProgress: 0,
        };
      }

      // 3.4. Khi đồ hoạ câu hỏi hiện lên (trống nội dung / sẵn sàng):
      // USER REQUIREMENT: "sau 3.5s nhấn bắt đầu, cut ngay từ góc toàn cảnh sang góc các thí sinh, tránh giật lag vô cớ"
      if (!kd.questionRevealed) {
        return {
          camAngle: targetContestantCam, // CUT dứt khoát sang thí sinh dự thi
          transitionMode: "CUT",
          isOverlayHidden: false,
          pushInProgress: 0,
        };
      }

      // 3.5. Trong mỗi câu hỏi:
      // USER REQUIREMENT: "và ở mỗi câu hỏi, hệ thống tiếp tục zoom smooth trong vòng 5s từ 100% lên 115%"
      // USER REQUIREMENT: "sau khi nhấn câu tiếp, chuyển lại về thí sinh và zoom smooth tiếp, và hiện lại đồ hoạ câu hỏi (không có hiệu ứng fade nữa)"
      if (kd.phase === "question") {
        if (isSolo) {
          let push = 0;
          if (kd.timer?.startedAt) {
            const duration = kd.timer.totalMs || 5000;
            const elapsed = Math.max(0, now - kd.timer.startedAt);
            push = Math.min(1.0, elapsed / duration);
          }

          return {
            camAngle: targetContestantCam,
            transitionMode: kd.qIdx === 0 ? "MORPH" : "CUT",
            isOverlayHidden: false,
            pushInProgress: push, // Zoom smooth 100% -> 115%
          };
        } else {
          // Lượt chung:
          if (kd.buzzedSeat != null) {
            return {
              camAngle: getCameraForSeat(kd.buzzedSeat, activeCount),
              transitionMode: "CUT",
              isOverlayHidden: false,
              pushInProgress: 0.20,
            };
          }
          return {
            camAngle: 10,
            transitionMode: "MORPH",
            isOverlayHidden: false,
            pushInProgress: 0.1,
          };
        }
      }

      // 3.6. Sau khi nhấn Kết thúc lượt (sau một lượt khởi động riêng):
      // USER REQUIREMENT: "sau khi nhấn kết thúc lượt (sau một lượt khởi động riêng), hệ thống cut ngay sang góc quay thí sinh đó, zoom in nhẹ, rồi cut sang zoom out camera toàn cảnh"
      if (kd.phase === "segmentDone") {
        const segDoneElapsed = Math.max(0, (now - phaseEnteredAtRef.current) / 1000);
        if (segDoneElapsed < 2.5) {
          // Giai đoạn 1 (0 - 2.5s): CUT ngay sang góc quay thí sinh đó, zoom in nhẹ
          const pushIn = Math.min(1.0, segDoneElapsed / 2.5) * 0.15;
          return {
            camAngle: targetContestantCam,
            transitionMode: "CUT",
            isOverlayHidden: false,
            pushInProgress: pushIn,
          };
        }
        // Giai đoạn 2 (2.5s - 5.5s): CUT sang toàn cảnh 3 màn hình chính và zoom out nhẹ
        const zoomOutProgress = Math.max(0, 1.0 - (segDoneElapsed - 2.5) / 3.0) * 0.15;
        return {
          camAngle: 1,
          transitionMode: "CUT",
          isOverlayHidden: false,
          pushInProgress: zoomOutProgress,
        };
      }

      if (isSolo) {
        return {
          camAngle: targetContestantCam,
          transitionMode: "MORPH",
          isOverlayHidden: false,
          pushInProgress: 0,
        };
      }

      return {
        camAngle: 10,
        transitionMode: "MORPH",
        isOverlayHidden: false,
        pushInProgress: 0,
      };
    }

    // ── 4. VƯỢT CHƯỚNG NGẠI VẬT (VCNV) ───────────────────────────────────────
    if (round === "vcnv" && state.vcnv) {
      const v = state.vcnv;

      // If someone rang the obstacle bell:
      if (v.bells && v.bells.length > 0) {
        const fastestSeat = v.bells[0].seat;
        if (fastestSeat >= 0 && fastestSeat < activeCount) {
          return {
            camAngle: getCameraForSeat(fastestSeat, activeCount),
            transitionMode: "CUT",
            isOverlayHidden: false,
            pushInProgress: 0.2,
          };
        }
      }

      // Camera VCNV: Idle/pre-15s defaults to CAM 10 (wide) or CAM 3 (MC).
      // Only during 15s timer does it cycle contestants every 3.5s; returns to CAM 10 afterwards.
      const startedAt = v.timer?.startedAt;
      const isTimerRunning = startedAt != null;
      const elapsed = startedAt ? Math.max(0, (now - startedAt) / 1000) : 0;

      if (isTimerRunning && elapsed <= 15.0) {
        const cycleSeat = Math.floor(elapsed / 3.5) % activeCount;
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
      const vd = state.veDich;
      const owner = vd.order?.[vd.turnIdx] ?? 0;
      const targetOwnerCam = getCameraForSeat(owner, activeCount);

      // 6.1. Khi Đúng / Sai:
      // USER REQUIREMENT: Cắt ngay sang góc thẳng bục MC (CAM 3), tạm gác khung câu hỏi, hiện đồ hoạ đáp án
      if (vd.phase === "result") {
        return {
          camAngle: 3, // Bục MC
          transitionMode: "CUT",
          isOverlayHidden: false,
          pushInProgress: 0,
        };
      }

      // 6.2. Khi mở chuông cướp điểm (5s stealing):
      // USER REQUIREMENT: Cắt sang góc toàn cảnh 4 bục (CAM 10); khi có người bấm chuông: Cắt ngay vào thí sinh cướp chuông
      if (vd.phase === "stealing") {
        if (vd.steal?.buzzedSeat != null) {
          const stealSeat = vd.steal.buzzedSeat;
          return {
            camAngle: getCameraForSeat(stealSeat, activeCount),
            transitionMode: "CUT",
            isOverlayHidden: false,
            pushInProgress: 0.2,
          };
        }
        return {
          camAngle: 10, // Toàn cảnh 4 bục thí sinh
          transitionMode: "CUT",
          isOverlayHidden: false,
          pushInProgress: 0,
        };
      }

      // 6.3. Giai đoạn thí sinh bước lên sân khấu & chọn gói:
      // USER REQUIREMENT: Camera Dolly điện ảnh mượt lia theo bước chân thí sinh hướng về bục giữa (CAM 15)
      if (vd.phase === "choosing") {
        return {
          camAngle: 15, // Cận cảnh chính diện bục giữa Về Đích
          transitionMode: "MORPH", // Smooth dolly tracking camera
          isOverlayHidden: false,
          pushInProgress: 0,
        };
      }

      if (vd.phase === "packageReady") {
        return {
          camAngle: 15, // Cận cảnh chính diện bục giữa Về Đích
          transitionMode: "CUT",
          isOverlayHidden: false,
          pushInProgress: 0,
        };
      }

      // 6.4. Trong thời gian suy nghĩ câu hỏi Về Đích:
      // USER REQUIREMENT: Camera cận chính diện thí sinh tại bục giữa (CAM 15) và zoom smooth chậm vào mặt thí sinh
      if (vd.phase === "thinking") {
        let push = 0;
        if (vd.timer?.startedAt) {
          const duration = vd.timer.totalMs || 20000;
          const elapsed = Math.max(0, now - vd.timer.startedAt);
          push = Math.min(1.0, elapsed / duration);
        }

        return {
          camAngle: 15, // Cận cảnh chính diện bục giữa Về Đích
          transitionMode: "MORPH",
          isOverlayHidden: false,
          pushInProgress: push, // Zoom smooth chậm từ 100% lên 115%
        };
      }

      // 6.5. Hoàn thành lượt thi: Thí sinh bước về bục bảng điểm, camera toàn cảnh bao quát
      if (vd.phase === "seatDone") {
        return {
          camAngle: 1, // Toàn cảnh sân khấu khi thí sinh bước về bục
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

    // ── 7. CÂU HỎI PHỤ ───────────────────────────────────────────────────────
    if (round === "cauHoiPhu" && state.cauHoiPhu) {
      const chp = state.cauHoiPhu;
      if (chp.buzzedSeat != null && chp.buzzedSeat >= 0 && chp.buzzedSeat < activeCount) {
        return {
          camAngle: getCameraForSeat(chp.buzzedSeat, activeCount),
          transitionMode: "CUT",
          isOverlayHidden: false,
          pushInProgress: 0.3,
        };
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
    state?.veDich?.timer?.startedAt,
    state?.veDich?.steal?.buzzedSeat,
    state?.cauHoiPhu?.buzzedSeat,
    tick,
  ]);
}
