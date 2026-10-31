"use client";

import { useMemo, useState, useEffect } from "react";
import type { OlympiaState } from "@/lib/olympia/types";

export interface OlympiaCameraState {
  camAngle: number;
  transitionMode: "CUT" | "MORPH";
  isOverlayHidden: boolean;
  pushInProgress: number;
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

  // 100ms ticker for smooth timer-driven camera transitions (e.g. VCNV 15s round robin & push-in)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % 100000), 100);
    return () => clearInterval(id);
  }, []);

  return useMemo(() => {
    // Default fallback
    const defaultState: OlympiaCameraState = {
      camAngle: 1,
      transitionMode: "CUT",
      isOverlayHidden: false,
      pushInProgress: 0,
    };

    if (!state) return defaultState;

    // 1. Host manual camera override
    if (state.studioCameraManual && state.studioCamera != null) {
      return {
        camAngle: state.studioCamera,
        transitionMode: "CUT",
        isOverlayHidden: false,
        pushInProgress: 0,
      };
    }

    const now = getNow();
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
      return {
        camAngle: 1,
        transitionMode: "CUT",
        isOverlayHidden: false,
        pushInProgress: 0,
      };
    }

    // Opening show intro
    if (state.introTimer) {
      return {
        camAngle: 1,
        transitionMode: "MORPH",
        isOverlayHidden: false,
        pushInProgress: 0.3,
      };
    }

    // ── 3. KHỞI ĐỘNG ──────────────────────────────────────────────────────────
    if (round === "khoiDong" && state.khoiDong) {
      const kd = state.khoiDong;

      // When Right/Wrong is pressed:
      // USER REQUIREMENT: "Khi nhấn đúng/sai, đồ hoạ đè lên trường quay tạm ẩn và chuyển qua góc MC"
      if (kd.phase === "result" || kd.lastVerdict != null) {
        return {
          camAngle: 3, // Bục MC
          transitionMode: "CUT",
          isOverlayHidden: true, // Tạm ẩn đồ hoạ 1/3 dưới
          pushInProgress: 0,
        };
      }

      // During question:
      // USER REQUIREMENT: "zoom vào bục thí sinh đang trả lời, duy trì zoom trong khi đang ở câu hỏi nhưng tốc độ chậm hơn và có điểm dừng"
      if (kd.phase === "question") {
        const seg = kd.segments?.[kd.segIdx];
        const isSolo = seg?.kind === "solo";
        const seatId = isSolo ? (seg?.seat ?? 0) : (kd.buzzedSeat ?? 0);

        // Calculate push-in progress (0.0 -> 1.0 capped) based on timer elapsed
        let push = 0;
        if (kd.timer?.startedAt) {
          const duration = kd.timer.totalMs || 5000;
          const elapsed = (now - kd.timer.startedAt) / duration;
          push = Math.min(1.0, Math.max(0, elapsed * 1.1));
        }

        const validSeat = typeof seatId === "number" && seatId >= 0 && seatId < 4;
        return {
          camAngle: validSeat ? 5 + seatId : 2,
          transitionMode: "CUT",
          isOverlayHidden: false,
          pushInProgress: push,
        };
      }

      // Idle / between questions
      return {
        camAngle: 2, // Bục thí sinh
        transitionMode: "CUT",
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
        if (fastestSeat >= 0 && fastestSeat < 4) {
          return {
            camAngle: 5 + fastestSeat,
            transitionMode: "CUT",
            isOverlayHidden: false,
            pushInProgress: 0.2,
          };
        }
      }

      // USER REQUIREMENT:
      // "Ở VCNV: Bảng ô chữ, background full màn và đồ hoạ câu hỏi hiện toàn màn hình sau khi MC/host chọn hàng ngang,
      // cho tới khi bắt đầu 15s, bảng ô chữ, background full màn ẩn đi, trong 4s đầu, hiện góc quay toàn cảnh và zoom nhẹ về khu vực thí sinh,
      // trong 11s còn lại và vài giây sau khi hết giờ, hệ thống tự động chuyển camera giữa các đội/thí sinh đảm bảo mỗi người phải có trên màn hình ít nhất 1 lần"
      const startedAt = v.timer?.startedAt;
      const isTimerRunning = startedAt != null;

      if (!isTimerRunning || v.phase !== "question") {
        // Row selecting / grid phase
        return {
          camAngle: 1, // Toàn cảnh
          transitionMode: "CUT",
          isOverlayHidden: false,
          pushInProgress: 0,
        };
      }

      const elapsed = Math.max(0, (now - startedAt) / 1000);

      // First 4s: Toàn cảnh wide + zoom nhẹ về khu vực thí sinh
      if (elapsed < 4.0) {
        const push = Math.min(1.0, elapsed / 4.0);
        return {
          camAngle: 1,
          transitionMode: "MORPH",
          isOverlayHidden: false,
          pushInProgress: push * 0.4,
        };
      }

      // Remaining 11s (4s -> 15s) and 3s after time-up (until ~18s):
      // Cycle through all active contestant seats
      const activeSeats = state.seats.filter((s) => s.name);
      const count = Math.max(1, activeSeats.length);
      const timeWindow = 14.0; // 14s total cycle window
      const perSeat = timeWindow / count;
      const cycleIdx = Math.floor((elapsed - 4.0) / perSeat) % count;
      const targetSeat = activeSeats[cycleIdx]?.id ?? cycleIdx;

      return {
        camAngle: 5 + Math.min(3, targetSeat),
        transitionMode: "CUT",
        isOverlayHidden: false,
        pushInProgress: 0.15,
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

      // If someone steals the turn:
      if (vd.steal?.buzzedSeat != null) {
        const stealSeat = vd.steal.buzzedSeat;
        return {
          camAngle: 5 + Math.min(3, stealSeat),
          transitionMode: "CUT",
          isOverlayHidden: false,
          pushInProgress: 0.2,
        };
      }

      // During 5s bell stealing countdown (nobody buzzed yet):
      if (vd.phase === "stealing") {
        return {
          camAngle: 9, // Jib Crane High-Angle Wide
          transitionMode: "MORPH",
          isOverlayHidden: false,
          pushInProgress: 0.2,
        };
      }

      // During thinking / result:
      if (vd.phase === "thinking" || vd.phase === "result") {
        const startedAt = vd.timer?.startedAt || now;
        const elapsed = Math.max(0, (now - startedAt) / 1000);

        // First 3.5s: Góc cao overhead / cẩu quay (CAM 9)
        if (elapsed < 3.5) {
          return {
            camAngle: 9,
            transitionMode: "MORPH",
            isOverlayHidden: false,
            pushInProgress: (elapsed / 3.5) * 0.5,
          };
        }

        // Then: Thu trực diện mặt thí sinh chính (CAM 5 + owner) and slow zoom
        const push = Math.min(1.0, (elapsed - 3.5) / 10.0);
        return {
          camAngle: 5 + Math.min(3, owner),
          transitionMode: "MORPH",
          isOverlayHidden: false,
          pushInProgress: push * 0.6,
        };
      }

      if (vd.phase === "choosing" || vd.phase === "packageReady") {
        return {
          camAngle: 5 + Math.min(3, owner),
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

    // ── 7. CÂU HỎI PHỤ ───────────────────────────────────────────────────────
    if (round === "cauHoiPhu" && state.cauHoiPhu) {
      const chp = state.cauHoiPhu;
      if (chp.buzzedSeat != null && chp.buzzedSeat >= 0 && chp.buzzedSeat < 4) {
        return {
          camAngle: 5 + chp.buzzedSeat,
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
    state?.studioCameraManual,
    state?.studioCamera,
    state?.introTimer,
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
