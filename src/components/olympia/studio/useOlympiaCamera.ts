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
      roundEnteredAtRef.current = Date.now();
    }
  }, [state?.currentRound]);
  useEffect(() => {
    const curPhase = state?.khoiDong?.phase || state?.veDich?.phase || "";
    if (curPhase && curPhase !== lastPhaseRef.current) {
      lastPhaseRef.current = curPhase;
      phaseEnteredAtRef.current = Date.now();
    }
  }, [state?.khoiDong?.phase, state?.veDich?.phase]);

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

    // 1.5. Sequential Contestant Entrance Cinematic Sequence (Manual Trigger by Host/MC with Skip)
    if (state.entranceState?.active) {
      // User Requirement: "về phần giới thiệu thí sinh sẽ lia camera từ bục đầu tiên cho tới bục cuối cùng bên phải, phụ thuộc số thí sinh thực"
      const activeCount = Math.max(1, state.seats.length);
      const currentSeat = Math.min(activeCount - 1, Math.max(0, state.entranceState.currentSeatIdx ?? 0));
      const targetCam = 5 + Math.min(3, currentSeat);

      return {
        camAngle: targetCam,
        transitionMode: "CUT",
        isOverlayHidden: false,
        pushInProgress: 0.05,
      };
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
      return {
        camAngle: 1,
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
      const validSeat = typeof seatId === "number" && seatId >= 0 && seatId < 4;
      const targetContestantCam = validSeat ? 5 + seatId : 1;

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
      // USER REQUIREMENT: "khi nhấn Bắt đầu, hệ thống tự đi từ bên trái dưới vòng nguyệt quế đi ra toàn cảnh trong 3,5s đầu"
      if (kd.startCooldownUntil && now < kd.startCooldownUntil) {
        const remainingCooldown = (kd.startCooldownUntil - now) / 1000;
        const elapsedCooldown = Math.max(0, 3.5 - remainingCooldown);
        return {
          camAngle: elapsedCooldown < 1.0 ? 14 : 1, // Đi từ CAM 14 (dưới nguyệt quế) ra CAM 1 (toàn cảnh)
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
              camAngle: 5 + Math.min(3, Math.max(0, kd.buzzedSeat)),
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
          camAngle: 10, // Toàn cảnh
          transitionMode: "CUT",
          isOverlayHidden: false,
          pushInProgress: 0,
        };
      }

      const elapsed = Math.max(0, (now - startedAt) / 1000);

      // First 4s: Toàn cảnh bục thí sinh
      if (elapsed < 4.0) {
        const push = Math.min(1.0, elapsed / 4.0);
        return {
          camAngle: 10,
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
      const targetOwnerCam = 5 + Math.min(3, Math.max(0, owner));

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
            camAngle: 5 + Math.min(3, Math.max(0, stealSeat)),
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

      // 6.3. Giai đoạn thí sinh bước lên sân khấu:
      // USER REQUIREMENT: "Giai đoạn thí sinh bước lên sân khấu, cam sẽ quay từ khu vực nửa bên trái sân khấu zoom out nhẹ ra toàn cảnh. Khi chốt gói thì phải hiển thị ở góc quay thí sinh, đổi linh hoạt giữa bục MC và khu vực thí sinh chính"
      if (vd.phase === "choosing") {
        return {
          camAngle: 14, // Khu vực nửa bên trái sân khấu dưới vòng nguyệt quế
          transitionMode: "MORPH",
          isOverlayHidden: false,
          pushInProgress: 0,
        };
      }

      if (vd.phase === "packageReady") {
        return {
          camAngle: targetOwnerCam, // Góc quay thí sinh chính
          transitionMode: "CUT",
          isOverlayHidden: false,
          pushInProgress: 0,
        };
      }

      // 6.4. Trong thời gian suy nghĩ câu hỏi Về Đích:
      // USER REQUIREMENT: "Trong thời gian suy nghĩ: Camera cận thí sinh chính và zoom smooth chậm vào mặt thí sinh."
      if (vd.phase === "thinking") {
        let push = 0;
        if (vd.timer?.startedAt) {
          const duration = vd.timer.totalMs || 20000;
          const elapsed = Math.max(0, now - vd.timer.startedAt);
          push = Math.min(1.0, elapsed / duration);
        }

        return {
          camAngle: targetOwnerCam,
          transitionMode: "MORPH",
          isOverlayHidden: false,
          pushInProgress: push, // Zoom smooth chậm từ 100% lên 115%
        };
      }

      return {
        camAngle: targetOwnerCam,
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
