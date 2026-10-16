"use client";

import React, { useState, useEffect, useRef } from "react";
import { MysteryQuestState, MysteryTile, MysteryMiniGameType } from "@/types";
import { MYSTERY_THEMES, getPerkType, getEffectiveTarotWheelSegments, evaluateTeamRiskTier, getTarotSegmentDisplayLabel } from "@/lib/game-engine/mystery-quest";
import { TarotArcanaSvgIcon, renderTarotArcanaVectorNodes, getPureArcanaNameVi } from "./TarotArcanaIcons";
import { DoorClipPathDefinition, RealisticDoorArtwork } from "./DoorGraphic";
import { MinigameSvgIcon } from "./MinigameSvgIcon";
import { soundManager } from "@/lib/sound-manager";

/**
 * 3-Phase Physics Speed Curve for Tarot Wheel:
 * - 0s to 3s: Smooth sinusoidal acceleration from 0 to V_max
 * - 3s to 10s: Constant MAXIMUM velocity V_max (FASTEST PHASE)
 * - 10s to T: Smooth friction deceleration to 0 at T
 * Returns normalized progress in [0, 1].
 */
function evaluateThreePhaseWheelProgress(elapsedMs: number, totalDurationMs: number): number {
  if (elapsedMs <= 0) return 0;
  if (elapsedMs >= totalDurationMs) return 1;

  const t = elapsedMs / 1000;
  const T = Math.max(12, totalDurationMs / 1000);
  const t1 = 3.0; // Acceleration ends at 3s
  const t2 = Math.min(10.0, T - 2.5); // Cruise ends at 10s

  const D1 = 0.5 * t1; // 1.5 * V_max
  const D2 = t2 - t1; // 7.0 * V_max
  const D3 = (T - t2) / 3; // (T - 10) / 3 * V_max
  const D_total = D1 + D2 + D3;

  if (t < t1) {
    const d = 0.5 * (t - (t1 / Math.PI) * Math.sin((Math.PI * t) / t1));
    return Math.max(0, Math.min(1, d / D_total));
  } else if (t < t2) {
    const d = D1 + (t - t1);
    return Math.max(0, Math.min(1, d / D_total));
  } else {
    const u = (t - t2) / (T - t2);
    const uClamped = Math.max(0, Math.min(1, u));
    const dDecel = ((T - t2) * (1 - Math.pow(1 - uClamped, 3))) / 3;
    const d = D1 + D2 + dDecel;
    return Math.max(0, Math.min(1, d / D_total));
  }
}

interface Props {
  mysteryState?: MysteryQuestState;
  isDisplay?: boolean;
  isAdmin?: boolean;
  isSandbox?: boolean;
  myTeamId?: string;
  onFlipCard?: (tileId: number) => void;
  onCashOut?: () => void;
  onStealBuzz?: () => void;
  onAdvanceTurn?: () => void;
  onSelectMiniGame?: (miniGameType: MysteryMiniGameType) => void;
  onChooseAction?: (action: "TAKE_BASE_POINTS" | "PLAY_MINIGAME") => void;
  onPairsDecision?: (choice: "CASH_OUT" | "PLAY_ROUND_2") => void;
  onChooseStealTarget?: (targetTeamId: string) => void;
  onDoorsDecision?: (payload: {
    decision: "SAFE_EXIT" | "RISK_OPEN" | "SWAP_DOOR" | "TAKE_BASE_MINUS_HEART" | "TAKE_100_BASE" | "PROCEED_TO_SELECT_2";
    chosenDoorId?: number;
    swapRemovedDoorId?: number;
    swapAddedDoorId?: number;
  }) => void;
  onTarotRedraw?: () => void;
  onTarotConfirmKeep?: () => void;
  onUsePeek?: () => void;
  onTarotProphecyDecision?: (choice: "KEEP" | "DISCARD") => void;
  onAdjustScore?: (teamId: string, delta?: number, setScore?: number) => void;
  onDrawTarot?: () => void;
  onSpinTarotWheel?: (powerPercent: number) => void;
  onTarotReveal?: () => void;
  onTarotRespin?: () => void;
  onTarotGamblePrepare?: () => void;
  onTarotGambleDecision?: (spinAgain: boolean, powerPercent?: number) => void;
  onSurvivalChoice?: (choice: "SACRIFICE_HEART" | "RISK_SURVIVAL") => void;
  teams?: Array<{ id: string; name: string; color: string; score: number; hearts?: number }>;
}

export default function MysteryQuestBoard({
  mysteryState,
  isDisplay = false,
  isAdmin = false,
  isSandbox = false,
  myTeamId,
  onFlipCard,
  onCashOut,
  onStealBuzz: _onStealBuzz,
  onAdvanceTurn,
  onSelectMiniGame,
  onChooseAction,
  onPairsDecision,
  onChooseStealTarget,
  onDoorsDecision,
  onTarotRedraw: _onTarotRedraw,
  onTarotConfirmKeep: _onTarotConfirmKeep,
  onUsePeek,
  onTarotProphecyDecision: _onTarotProphecyDecision,
  onAdjustScore,
  onDrawTarot,
  onSpinTarotWheel,
  onTarotReveal,
  onTarotRespin,
  onTarotGamblePrepare,
  onTarotGambleDecision,
  onSurvivalChoice,
  teams = [],
}: Props) {
  const [optimisticOpenedIds, setOptimisticOpenedIds] = useState<Set<number>>(new Set());
  const [optimisticMatchedPairKey, setOptimisticMatchedPairKey] = useState<string | null>(null);
  const [optimisticSelectedDoorIds, setOptimisticSelectedDoorIds] = useState<number[]>([]);
  const [isDrawingAnimation, setIsDrawingAnimation] = useState<boolean>(false);
  const [isCashingOut, setIsCashingOut] = useState<boolean>(false);
  const [showScoreEditModal, setShowScoreEditModal] = useState<boolean>(false);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [rulesModalTab, setRulesModalTab] = useState<MysteryMiniGameType>(mysteryState?.miniGameType || "PUSH_YOUR_LUCK");
  const [swapStep, setSwapStep] = useState<"IDLE" | "SELECT_REMOVE" | "SELECT_ADD">("IDLE");
  const [swapRemovedId, setSwapRemovedId] = useState<number | null>(null);
  const [wheelPower, setWheelPower] = useState<number>(50);
  const [isPowerIncreasing, setIsPowerIncreasing] = useState<boolean>(true);
  const [isWheelSpinningOptimistic, setIsWheelSpinningOptimistic] = useState<boolean>(false);
  const [isLocalGambleArming, setIsLocalGambleArming] = useState<boolean>(false);
  const [lockedPower, setLockedPower] = useState<number | null>(null);
  const [clientWheelAngle, setClientWheelAngle] = useState<number>(0);
  const [needleDeflectionDeg, setNeedleDeflectionDeg] = useState<number>(0);
  const [isWheelZoomedIn, setIsWheelZoomedIn] = useState<boolean>(false);
  const [wheelZoomDurationMs, setWheelZoomDurationMs] = useState<number>(7000);
  const [tarotFlyPhase, setTarotFlyPhase] = useState<"IDLE" | "STOPPED" | "FLYING" | "ATTACHED" | "REVEALED">("IDLE");
  const wheelRef = useRef<HTMLDivElement>(null);
  const needleRef = useRef<HTMLDivElement>(null);
  const wheelPrevAngleRef = useRef<number>(0);
  const wheelSpinAudioTargetRef = useRef<number | null>(null);
  const lastSnapTimeRef = useRef<number>(0);
  const localDoorActionTimeRef = useRef<number>(0);
  const hasLocalDoorActionRef = useRef<boolean>(false);
  const isFlippingRef = useRef<boolean>(false);
  const flippingTileIdRef = useRef<number | null>(null);
  const lastClickedTileIdRef = useRef<number | null>(null);
  const pendingFlippedIdsRef = useRef<Set<number>>(new Set());
  const prevServerActiveFlipRef = useRef<boolean>(false);

  if (!mysteryState) {
    return (
      <div className="glass rounded-2xl p-8 text-center text-muted-foreground border border-white/10">
        <p className="text-4xl mb-3 animate-pulse">🗝️</p>
        <p className="text-lg font-bold text-white/80">Hành Trình Bí Ẩn đang được khởi tạo...</p>
      </div>
    );
  }

  const {
    currentTurnTeamId,
    currentTurnTeamName,
    currentTurnTeamColor,
    currentTurnIndex,
    totalTurns,
    currentRound,
    theme,
    miniGameType,
    themeNameVi,
    themeBgGradient,
    tiles,
    phase,
    baseQuestionPoints,
    promoPerk,
    potPoints,
    potMultiplier,
    cardsFlippedCount,
    bombExploded,
    turnFinishedReason,
    storyResult,
    lastFlippedTile,
    memoryPairsState,
    oneShotState,
    tarotState,
    nextCardPeek,
    peekUsesRemaining,
    isPenaltySurvivalMode,
    survivalDilemmaPending,
  } = mysteryState;

  // Synchronize optimistic selection for ONE_SHOT_DOORS Phase 1 (Chống nháy/lệch nhịp khi click nhanh)
  useEffect(() => {
    if (oneShotState?.selectedDoorIds) {
      const now = Date.now();
      if (hasLocalDoorActionRef.current && now - localDoorActionTimeRef.current < 350) {
        return;
      }
      hasLocalDoorActionRef.current = false;
      setOptimisticSelectedDoorIds(oneShotState.selectedDoorIds);
    }
  }, [oneShotState?.selectedDoorIds]);

  // Sync optimistic set with actual opened tiles from server without redundant re-renders or flickering
  useEffect(() => {
    const serverOpened = new Set(tiles.filter((t) => t.isOpened).map((t) => t.id));
    const matchedKey = memoryPairsState?.matchedPairKey || optimisticMatchedPairKey;
    if (matchedKey) {
      tiles.forEach((t) => {
        if (t.pairKey === matchedKey) {
          serverOpened.add(t.id);
        }
      });
    }

    setOptimisticOpenedIds((prev) => {
      if (miniGameType === "MEMORY_PAIRS") {
        if (isPenaltySurvivalMode) {
          const kept = new Set((memoryPairsState?.keptBombTileIds || []).map(Number));
          return new Set([...serverOpened, ...kept, ...pendingFlippedIdsRef.current]);
        }

        const serverHasActiveFlip = Boolean(
          memoryPairsState?.firstFlippedTileId ||
          memoryPairsState?.secondFlippedTileId ||
          memoryPairsState?.thirdFlippedTileId ||
          memoryPairsState?.isMismatchResolving ||
          memoryPairsState?.isBombRescueActive
        );

        // Chỉ xóa danh sách lật tạm khi server thực sự chuyển từ trạng thái ĐANG LẬT sang ĐÃ ÚP LẠI (sau khi giải quyết mismatch xong).
        // Nếu người chơi vừa bấm lá đầu tiên và gói tin room:state trễ từ choose_action gửi về (khi serverHasActiveFlip vẫn = false),
        // tuyệt đối giữ nguyên pendingFlippedIdsRef để lá bài đầu tiên không bao giờ bị chớp nháy đóng-mở!
        if (prevServerActiveFlipRef.current && !serverHasActiveFlip) {
          prevServerActiveFlipRef.current = false;
          pendingFlippedIdsRef.current.clear();
          lastClickedTileIdRef.current = null;
          const kept = new Set((memoryPairsState?.keptBombTileIds || []).map(Number));
          return new Set([...serverOpened, ...kept]);
        }
        prevServerActiveFlipRef.current = serverHasActiveFlip;

        const currentAttemptIds = new Set<number>();
        if (memoryPairsState?.firstFlippedTileId) currentAttemptIds.add(Number(memoryPairsState.firstFlippedTileId));
        if (memoryPairsState?.secondFlippedTileId) currentAttemptIds.add(Number(memoryPairsState.secondFlippedTileId));
        if (memoryPairsState?.thirdFlippedTileId) currentAttemptIds.add(Number(memoryPairsState.thirdFlippedTileId));
        if (lastClickedTileIdRef.current) currentAttemptIds.add(Number(lastClickedTileIdRef.current));
        const kept = new Set((memoryPairsState?.keptBombTileIds || []).map(Number));

        const merged = new Set([
          ...serverOpened,
          ...kept,
          ...currentAttemptIds,
          ...pendingFlippedIdsRef.current,
        ]);
        if (merged.size === prev.size) {
          let same = true;
          for (const id of merged) {
            if (!prev.has(id)) {
              same = false;
              break;
            }
          }
          if (same) return prev;
        }
        return merged;
      }

      // Đối với ONE_SHOT_DOORS, PUSH_YOUR_LUCK, TAROT_DESTINY:
      // Luôn merge serverOpened với prev (không reset khi server gửi state trung gian).
      // Triệt tiêu 100% hiện tượng chớp nháy thẻ đóng lại rồi mở ra!
      if (phase === "TURN_SUMMARY" && tiles.every((t) => t.isOpened)) {
        return serverOpened;
      }

      const merged = new Set([...serverOpened, ...prev]);
      if (merged.size === prev.size) {
        let same = true;
        for (const id of merged) {
          if (!prev.has(id)) {
            same = false;
            break;
          }
        }
        if (same) return prev;
      }
      return merged;
    });
  }, [tiles, memoryPairsState?.matchedPairKey, memoryPairsState?.firstFlippedTileId, memoryPairsState?.secondFlippedTileId, memoryPairsState?.thirdFlippedTileId, memoryPairsState?.isMismatchResolving, memoryPairsState?.isBombRescueActive, memoryPairsState?.keptBombTileIds, memoryPairsState?.promptSecondChance, phase, optimisticMatchedPairKey, miniGameType]);

  useEffect(() => {
    if (memoryPairsState?.matchedPairKey) {
      setOptimisticMatchedPairKey(memoryPairsState.matchedPairKey);
    } else if (!memoryPairsState?.firstFlippedTileId && !lastClickedTileIdRef.current) {
      setOptimisticMatchedPairKey(null);
    }
  }, [memoryPairsState?.matchedPairKey, memoryPairsState?.firstFlippedTileId]);

  useEffect(() => {
    prevServerActiveFlipRef.current = false;
    pendingFlippedIdsRef.current.clear();
    lastClickedTileIdRef.current = null;
    setOptimisticMatchedPairKey(null);
    setOptimisticOpenedIds(new Set());
    setOptimisticSelectedDoorIds([]);
    setSwapStep("IDLE");
    setSwapRemovedId(null);
  }, [currentTurnIndex, miniGameType, phase, memoryPairsState?.round ?? 1]);

  useEffect(() => {
    setIsCashingOut(false);
  }, [phase, potPoints]);

  useEffect(() => {
    setSwapStep("IDLE");
    setSwapRemovedId(null);
  }, [currentTurnIndex, miniGameType, oneShotState?.phase]);

  // Reset optimistic spin state when turn changes or gamble round changes
  useEffect(() => {
    setIsWheelSpinningOptimistic(false);
    setLockedPower(null);
    setIsLocalGambleArming(false);
    setTarotFlyPhase("IDLE");
    setIsWheelZoomedIn(false);
    setWheelZoomDurationMs(800);
  }, [currentTurnIndex, miniGameType, tarotState?.isGamblingWaitingSpin]);

  useEffect(() => {
    if (tarotState?.isWheelSpinning) {
      setIsLocalGambleArming(false);
    }
  }, [tarotState?.isWheelSpinning]);

  // Fallback safety timeout for optimistic spin state (25s for 17.5s-22.5s spin)
  useEffect(() => {
    if (!isWheelSpinningOptimistic) return;
    const fallbackTimer = setTimeout(() => {
      setIsWheelSpinningOptimistic(false);
      setLockedPower(null);
    }, 25000);
    return () => clearTimeout(fallbackTimer);
  }, [isWheelSpinningOptimistic]);

  // Ensure wheel BGM stops when component unmounts
  useEffect(() => {
    return () => {
      soundManager.stopWheelSpinMusic(0);
    };
  }, []);

  // Tarot Fly -> Attached -> Revealed animation pipeline (immune to isWheelSpinning cleanup)
  useEffect(() => {
    // Tuân thủ quy tắc sandbox: chỉ phát âm thanh trên Display, máy thí sinh tắt âm; trong game thật phát tất cả
    const shouldPlaySound = !isSandbox || isDisplay;

    if (tarotFlyPhase === "FLYING") {
      if (shouldPlaySound) {
        soundManager.playTarotIconWhoosh();
      }
      const flyTimer = setTimeout(() => {
        setTarotFlyPhase("ATTACHED");
        if (shouldPlaySound) {
          soundManager.playTarotSealImpact();
        }
      }, 750);
      return () => clearTimeout(flyTimer);
    }
    if (tarotFlyPhase === "ATTACHED") {
      const attachedTimer = setTimeout(() => {
        setTarotFlyPhase("REVEALED");
        setIsWheelSpinningOptimistic(false);
        if (shouldPlaySound) {
          soundManager.playTarotCardFlip();
        }
        onTarotReveal?.();
      }, 1200);
      return () => clearTimeout(attachedTimer);
    }
  }, [tarotFlyPhase, onTarotReveal, isSandbox, isDisplay]);

  // Fallback for late joiners or already drawn pending cards
  useEffect(() => {
    if (
      tarotState?.isDrawn &&
      tarotState?.isRevealPending &&
      tarotFlyPhase === "IDLE" &&
      !tarotState?.isWheelSpinning &&
      !isWheelSpinningOptimistic
    ) {
      setTarotFlyPhase("ATTACHED");
    }
  }, [tarotState?.isDrawn, tarotState?.isRevealPending, tarotFlyPhase, tarotState?.isWheelSpinning, isWheelSpinningOptimistic]);

  // Synchronize REVEALED state if phase moves to TURN_SUMMARY
  useEffect(() => {
    if (phase === "TURN_SUMMARY" && (miniGameType === "TAROT_DESTINY" || miniGameType === "TAROT_CARDS")) {
      setTarotFlyPhase("REVEALED");
      setIsWheelSpinningOptimistic(false);
    }
  }, [phase, miniGameType]);

  // Synchronize Tarot Wheel angle, Chiếc Nón Kỳ Diệu BGM & peg-click audio ("tạch-tạch-tạch")
  useEffect(() => {
    const target = tarotState?.targetAngle;
    if (target === undefined || target === null) {
      wheelPrevAngleRef.current = 0;
      setClientWheelAngle(0);
      lastSnapTimeRef.current = 0;
      setNeedleDeflectionDeg(0);
      if (wheelRef.current) {
        wheelRef.current.style.transform = "rotate(0deg)";
      }
      if (needleRef.current) {
        needleRef.current.style.transform = "rotate(0deg) scale(1.06) translateZ(0)";
      }
      soundManager.stopWheelSpinMusic(150);
      return;
    }

    const startAngle =
      typeof tarotState?.startAngle === "number" && tarotState.startAngle < target
        ? tarotState.startAngle
        : wheelPrevAngleRef.current;

    if (!tarotState?.isWheelSpinning || target <= startAngle) {
      wheelPrevAngleRef.current = target;
      setClientWheelAngle(target);
      if (wheelRef.current) {
        wheelRef.current.style.transform = `rotate(${target}deg)`;
      }
      wheelSpinAudioTargetRef.current = null;
      if (!tarotState?.isWheelSpinning && !isWheelSpinningOptimistic && tarotFlyPhase === "IDLE") {
        setIsWheelZoomedIn(false);
        setWheelZoomDurationMs(800);
        lastSnapTimeRef.current = 0;
        setNeedleDeflectionDeg(0);
        if (needleRef.current) {
          needleRef.current.style.transform = "rotate(0deg) scale(1.06) translateZ(0)";
        }
      }
      return;
    }

    const durationMs = tarotState?.spinDurationMs ?? 20000;
    const segAngle = isPenaltySurvivalMode ? 18 : 360 / 22;
    const totalDelta = target - startAngle;
    const startTime = performance.now();
    let lastPegIndex = Math.floor(startAngle / segAngle);
    let rafId = 0;
    let zoomStartTimer: ReturnType<typeof setTimeout> | null = null;
    let stopTimer: ReturnType<typeof setTimeout> | null = null;
    let finishedChimePlayed = false;

    // 1. Khởi tạo kim thẳng đứng 0 độ tuyệt đối và bánh xe ở góc startAngle
    lastSnapTimeRef.current = 0;
    setNeedleDeflectionDeg(0);
    if (wheelRef.current) {
      wheelRef.current.style.transform = `rotate(${startAngle}deg)`;
    }
    if (needleRef.current) {
      needleRef.current.style.transform = "rotate(0deg) scale(1.06) translateZ(0)";
    }

    // Tiếng gõ chốt khởi động nhẹ nhàng
    soundManager.playWheelPegTick(0.05);

    // 2. Dynamic Camera Zoom Rig (Phóng to 1.65x cận cảnh chuẩn 12h kịch tính):
    // Phóng dần từ giây thứ 3 đến giây thứ 10
    setIsWheelZoomedIn(false);
    setWheelZoomDurationMs(7000);
    zoomStartTimer = setTimeout(() => {
      setIsWheelZoomedIn(true);
      setWheelZoomDurationMs(7000); // Phóng dần từ 3s đến 10s (chính xác 7000ms)
    }, 3000);

    // 3. Start VTV3 Chiếc Nón Kỳ Diệu wheel spin background music (chỉ kích hoạt 1 lần duy nhất trên màn hình Display)
    if (isDisplay && wheelSpinAudioTargetRef.current !== target) {
      wheelSpinAudioTargetRef.current = target;
      soundManager.playWheelSpinMusic(durationMs);
    }

    // 4. RequestAnimationFrame loop driving the exact 3-phase physics curve & Hooke's Law needle physics
    // Using direct DOM refs to avoid 1200+ React re-renders for 60fps silky smooth rendering!
    const step = (now: number) => {
      const elapsed = now - startTime;
      const rawProgress = Math.min(1, Math.max(0, elapsed / durationMs));
      // Tốc độ nhanh nhất ở 3s - 10s, 10s rồi mới chậm dần (đường cong 3 pha)
      const threePhaseProgress = evaluateThreePhaseWheelProgress(elapsed, durationMs);
      const currentLiveAngle = startAngle + totalDelta * threePhaseProgress;

      if (wheelRef.current) {
        wheelRef.current.style.transform = `rotate(${currentLiveAngle}deg)`;
      }

      // Kiểm tra chốt đi qua kim
      const currentPegIndex = Math.floor(currentLiveAngle / segAngle);
      if (currentPegIndex > lastPegIndex) {
        lastPegIndex = currentPegIndex;
        lastSnapTimeRef.current = now;
        soundManager.playWheelPegTick(rawProgress);
      }

      // ── Vật lý Kim Flipper chân thật chuẩn cơ khí "Chiếc nón kỳ diệu" ──
      let needleAngle = 0;
      if (elapsed < 60) {
        // 60ms đầu tiên: Kim luôn giữ thẳng đứng 0° tuyệt đối để bắt đầu mượt mà
        needleAngle = 0;
      } else {
        const pegDistToSnap = segAngle - (currentLiveAngle % segAngle);
        const contactWindow = 3.6;

        if (pegDistToSnap <= contactWindow) {
          // Pha 1: 1/3 thân dưới kim tiếp xúc chốt, chốt bánh xe (quay theo chiều kim đồng hồ từ trái sang phải)
          // đẩy đầu kim nghiêng dần sang PHẢI (-deg trong hệ tọa độ CSS/SVG với pivot ở đỉnh)
          const contactProgress = 1.0 - (pegDistToSnap / contactWindow);
          needleAngle = -22.0 * Math.pow(contactProgress, 1.15);
        } else if (lastSnapTimeRef.current > 0) {
          // Pha 2: Ngay khi trượt khỏi chốt, lực đàn hồi bật giật kim cực nhanh sang TRÁI (+14°),
          // rồi nảy nhẹ sang PHẢI (-2.3°), sau đó tắt dần về trạng thái CÂN BẰNG (0°) trong ~80ms
          const dt = (now - lastSnapTimeRef.current) / 1000;
          if (dt < 0.085) {
            needleAngle = 14.0 * Math.exp(-32.0 * dt) * Math.cos(50.0 * dt);
          } else {
            needleAngle = 0;
          }
        } else {
          // Chưa có chốt nào trượt qua: Luôn giữ thẳng đứng 0° cân bằng tuyệt đối
          needleAngle = 0;
        }
      }

      if (needleRef.current) {
        needleRef.current.style.transform = `rotate(${needleAngle}deg) scale(1.06) translateZ(0)`;
      }

      if (rawProgress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        if (wheelRef.current) {
          wheelRef.current.style.transform = `rotate(${target}deg)`;
        }
        setClientWheelAngle(target);
        wheelPrevAngleRef.current = target;
        wheelSpinAudioTargetRef.current = null;

        // Khi bánh xe dừng hẳn: Kim luôn hồi về thẳng đứng 0° cân bằng tuyệt đối
        // (đảm bảo trước và khi bắt đầu quay của lượt kế tiếp kim luôn ngay ngắn 100%)
        const finalNeedle = 0;
        if (needleRef.current) {
          needleRef.current.style.transform = "rotate(0deg) scale(1.06) translateZ(0)";
        }
        setNeedleDeflectionDeg(finalNeedle);

        if (!finishedChimePlayed) {
          finishedChimePlayed = true;
          soundManager.playWheelStopChime();
        }

        // ── DỪNG 0.8S TẠI Ô TRÚNG: Giữ nguyên cận cảnh 12h để mọi người nhìn rõ kim đang chỉ vào ô nào ──
        setTarotFlyPhase("STOPPED");
        stopTimer = setTimeout(() => {
          setTarotFlyPhase("FLYING");
        }, 800);
      }
    };

    rafId = requestAnimationFrame(step);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (zoomStartTimer) clearTimeout(zoomStartTimer);
      if (stopTimer) clearTimeout(stopTimer);
    };
  }, [tarotState?.startAngle, tarotState?.targetAngle, tarotState?.isWheelSpinning, tarotState?.spinDurationMs, isPenaltySurvivalMode]);

  // Ping-pong power gauge loop (0% -> 100% -> 0%) - freezes immediately when spun
  useEffect(() => {
    const isSpinning = Boolean(tarotState?.isWheelSpinning || isWheelSpinningOptimistic);
    const isGambleWaiting = Boolean(tarotState?.isGamblingWaitingSpin || isLocalGambleArming);
    if (miniGameType !== "TAROT_DESTINY" || phase !== "PUSH_YOUR_LUCK" || isSpinning || (tarotState?.isDrawn && !isGambleWaiting)) {
      return;
    }
    const interval = setInterval(() => {
      setWheelPower((prev) => {
        if (isPowerIncreasing) {
          const next = prev + 3;
          if (next >= 100) {
            setIsPowerIncreasing(false);
            return 100;
          }
          return next;
        } else {
          const next = prev - 3;
          if (next <= 5) {
            setIsPowerIncreasing(true);
            return 5;
          }
          return next;
        }
      });
    }, 35);
    return () => clearInterval(interval);
  }, [miniGameType, phase, tarotState?.isWheelSpinning, isWheelSpinningOptimistic, tarotState?.isDrawn, tarotState?.isGamblingWaitingSpin, isLocalGambleArming, isPowerIncreasing]);

  const themeMeta = MYSTERY_THEMES[theme] || {
    accentColor: "#a855f7",
    emoji: "🗝️",
    taglineVi: "Hành Trình Bí Ẩn",
  };

  const isMyTurn = Boolean(myTeamId && myTeamId === currentTurnTeamId);
  const canInteract = Boolean((isMyTurn || isAdmin) && phase === "PUSH_YOUR_LUCK");
  const canInteractDecision = Boolean((isMyTurn || isAdmin) && phase === "DECISION_CHOICE");
  const canCashOut = Boolean(canInteract && (miniGameType === "PUSH_YOUR_LUCK" || miniGameType === "RADAR_WINDOWS") && potPoints > 0);

  // Việc chuyển lượt / chuyển câu hỏi diễn ra thủ công bởi Admin/MC, không tự động


  const handleTileClick = (tile: MysteryTile) => {
    if (!canInteract || tile.isOpened || optimisticOpenedIds.has(tile.id)) return;
    if (phase === "TURN_SUMMARY") return;

    if (miniGameType === "MEMORY_PAIRS") {
      if (memoryPairsState?.isMismatchResolving) return;
      if (memoryPairsState?.promptSecondChance) return;
      if (memoryPairsState?.matchedPairKey || optimisticMatchedPairKey) return;
      if (
        !isPenaltySurvivalMode &&
        (memoryPairsState?.attemptsUsed ?? 0) >= (memoryPairsState?.maxAttempts ?? 4) &&
        !memoryPairsState?.isBombRescueActive
      ) {
        return;
      }

      // Check if this move was already attempted in this round (anti-abuse rule)
      const isHazardKey = (k?: string | null) =>
        Boolean(k && (k.startsWith("PAIR_BOMB") || k.startsWith("PAIR_TRAP") || k === "PAIR_THE_TOWER" || k === "PAIR_THE_KNIGHT" || k === "PAIR_THE_DEVIL" || k === "PAIR_THE_HANGED_MAN"));

      if (isPenaltySurvivalMode) {
        // Trong chế độ Sinh Tử (Board Persistence): kiểm tra xem thẻ này có khớp với bất kỳ thẻ nào đã mở trên bàn không
        const matchingPrior = tiles.find(
          (t) => (t.isOpened || optimisticOpenedIds.has(t.id)) && Number(t.id) !== Number(tile.id) && t.pairKey && t.pairKey === tile.pairKey
        );
        if (matchingPrior?.pairKey) {
          setOptimisticMatchedPairKey(matchingPrior.pairKey);
        }
      } else if (!memoryPairsState?.isBombRescueActive) {
        const priorFlippedId = memoryPairsState?.firstFlippedTileId;
        if (priorFlippedId && Number(priorFlippedId) !== Number(tile.id)) {
          const fId = Number(priorFlippedId);
          const sId = Number(tile.id);
          const pairMoveKey = `${Math.min(fId, sId)}-${Math.max(fId, sId)}`;
          if ((memoryPairsState?.attemptedPairs || []).includes(pairMoveKey)) {
            return;
          }

          const first = tiles.find((t) => Number(t.id) === Number(priorFlippedId));
          // Set optimistic matched pair key for any matching pair (rewards, The Fool, etc.) except hazards!
          if (first && first.pairKey && first.pairKey === tile.pairKey && !isHazardKey(first.pairKey)) {
            setOptimisticMatchedPairKey(first.pairKey);
          }
        }
      } else {
        // Trong lượt giải cứu: lá 3 có thể trùng khớp với lá 1 HOẶC lá 2!
        const priorIds = [memoryPairsState?.firstFlippedTileId, memoryPairsState?.secondFlippedTileId].filter(Boolean);
        const matchingPrior = tiles.find(
          (t) => priorIds.some((id) => Number(id) === Number(t.id)) && t.pairKey && t.pairKey === tile.pairKey && !isHazardKey(t.pairKey)
        );
        if (matchingPrior?.pairKey) {
          setOptimisticMatchedPairKey(matchingPrior.pairKey);
        }
      }
      lastClickedTileIdRef.current = tile.id;
      pendingFlippedIdsRef.current.add(Number(tile.id));

      // Trong Lật Cặp, chỉ chặn click đúp vào đúng cùng một lá bài trong vòng 200ms
      if (flippingTileIdRef.current === tile.id) return;
      flippingTileIdRef.current = tile.id;
      setTimeout(() => {
        if (flippingTileIdRef.current === tile.id) {
          flippingTileIdRef.current = null;
        }
      }, 200);

      // Cooldown click giữa 2 thẻ khác nhau cực ngắn (80ms) để không làm mất lượt click thứ 2
      if (isFlippingRef.current) return;
      isFlippingRef.current = true;
      setTimeout(() => {
        isFlippingRef.current = false;
      }, 80);
    } else {
      const isOneShot = miniGameType === "ONE_SHOT_DOORS" || miniGameType === "DOORS" || miniGameType === "CHESTS";
      // Trong Chọn Cửa Giai Đoạn 1: Cung cấp phản hồi thị giác siêu tốc (<16ms) và cooldown ngắn 80ms!
      if (isOneShot && (oneShotState?.phase === "SELECTING" || !oneShotState?.phase) && !isPenaltySurvivalMode) {
        hasLocalDoorActionRef.current = true;
        localDoorActionTimeRef.current = Date.now();
        setOptimisticSelectedDoorIds((prev) => {
          if (prev.includes(tile.id)) {
            return prev.filter((id) => id !== tile.id);
          }
          if (prev.length < 3) {
            return [...prev, tile.id];
          }
          return prev;
        });

        if (isFlippingRef.current) return;
        isFlippingRef.current = true;
        setTimeout(() => {
          isFlippingRef.current = false;
        }, 80);

        onFlipCard?.(tile.id);
        return;
      }

      if (isFlippingRef.current) return;
      isFlippingRef.current = true;
      setTimeout(() => {
        isFlippingRef.current = false;
      }, 250);
    }

    // Instant optimistic visual feedback (<16ms) - Trong ONE_SHOT_DOORS Giai đoạn 1 thì chỉ chọn để ra riêng (vẫn úp, không lật)
    const isOneShot = miniGameType === "ONE_SHOT_DOORS" || miniGameType === "DOORS" || miniGameType === "CHESTS";
    if (!isOneShot || oneShotState?.phase === "STAGE_2_PICK" || oneShotState?.phase === "SCANNED") {
      setOptimisticOpenedIds((prev) => new Set(prev).add(tile.id));
    }
    if (miniGameType === "PUSH_YOUR_LUCK" || miniGameType === "RADAR_WINDOWS") {
      setIsDrawingAnimation(true);
      setTimeout(() => setIsDrawingAnimation(false), 450);
    }

    onFlipCard?.(tile.id);
  };

  const MINIGAME_RULES: Record<string, {
    title: string;
    badge: string;
    icon: string;
    steps: Array<{ step: string; desc: string; icon: string }>;
    rewardMechanic: string;
    riskMechanic: string;
    survivalMechanic: string;
  }> = {
    MEMORY_PAIRS: {
      title: "🃏 LẬT CẶP TRÙNG NHAU (16 THẺ - 8 CẶP)",
      badge: "Memory Pairs",
      icon: "🃏",
      steps: [
        { step: "1. Lật tìm cặp", desc: "Mỗi lượt chọn lật 2 thẻ bí mật (5 lượt ở Vòng 1). Không được lặp lại chính xác nước đi đã thử trong vòng.", icon: "🎯" },
        { step: "2. Bẫy giữ mở", desc: "Thẻ Bẫy Khói / Kíp Nổ bị giữ ngửa trên bàn. Mở thẻ sinh đôi của thẻ phạt đã mở kích hoạt lượt giải cứu (lá thứ 3).", icon: "💣" },
        { step: "3. Nhận thưởng", desc: "Ghép trúng cặp thưởng bất kỳ để nhận điểm an toàn. Hết 5 lượt Vòng 1: chọn Nhận 1/2 điểm (-1 ❤️) hoặc Sang Vòng 2 (giữ khiên).", icon: "🏆" },
      ],
      rewardMechanic: "Nhân đôi x2, Cướp đối thủ, Kho Báu lớn, Tinh Tú may mắn (+10đ đến +60đ).",
      riskMechanic: "Thất bại sau cả 2 vòng: Trừ 100% Điểm Gốc và trừ 1 ❤️ Tim.",
      survivalMechanic: "Khi vào Sinh Tử: Bàn 16 thẻ Sudden Death không giới hạn lượt. Lật đến khi gặp cặp đầu tiên: 25% An toàn (Thoát/Khờ) vs 75% Bom/Phạt. Toàn bộ Perk bị vô hiệu hóa.",
    },
    ONE_SHOT_DOORS: {
      title: "🚪 8 CÁNH CỬA BÍ MẬT (8 ➔ 4 ➔ 2 ➔ 1)",
      badge: "8 Secret Doors",
      icon: "🚪",
      steps: [
        { step: "1. Chọn 4 & Radar 1", desc: "Chọn 4 trong 8 cánh cửa. Radar 1 quét số bẫy. Chọn nhận 100% điểm gốc hoặc tiếp tục.", icon: "🚪" },
        { step: "2. Chọn 2 & Radar 2", desc: "Giữ lại 2 trong 4 cửa. Radar 2 quét số bẫy trong 2 cửa.", icon: "📡" },
        { step: "3. Đổi & Chốt mở", desc: "Đèn Xanh: Mở nhận thưởng. Đèn Vàng: Tự do mở liều 50/50, Đổi cửa hoặc Rút lui (-1 ❤️). Đèn Đỏ: Bắt buộc Đổi 1 cửa hoặc Rút lui!", icon: "✨" },
      ],
      rewardMechanic: "Cửa Thưởng: Đại Thưởng (+2x điểm), Cướp đối thủ (+1x), Kho Báu (+1.5x), May Mắn (+1x).",
      riskMechanic: "Cửa Bẫy: Trừ điểm gốc (-1x), Bom Khói, Bom Hắc Ám, Bom Từ Thiện.",
      survivalMechanic: "Khi vào Sinh Tử: Chọn 4 cửa (Radar báo an toàn/bẫy) ➔ Mở trực tiếp 1 trong 4 cửa (25% An toàn vs 75% Phạt). Toàn bộ Perk bị vô hiệu hóa.",
    },
    PUSH_YOUR_LUCK: {
      title: "📚 LẬT LIỀU TÍCH LŨY NÉ BOM (CHỒNG BÀI VÔ HẠN)",
      badge: "Push Your Luck",
      icon: "📚",
      steps: [
        { step: "1. Rút tích lũy", desc: "Lá đầu tiên 100% an toàn. Rút tiếp để tích lũy cộng dồn hoặc kích hoạt hiệu ứng Tarot đặc biệt.", icon: "💰" },
        { step: "2. Tỷ lệ bom tăng", desc: "Càng rút sâu nguy cơ dính Bom (Khói, Hắc Ám, Từ Thiện) càng tăng cao.", icon: "⚠️" },
        { step: "3. Chốt điểm dừng", desc: "Bấm 'CHỐT ĐIỂM' bất kỳ lúc nào để bảo toàn toàn bộ điểm Hũ về tài khoản.", icon: "🛑" },
      ],
      rewardMechanic: "Cộng dồn điểm thưởng theo câu hỏi (+10đ đến +60đ), Cướp đối thủ, Động cơ Nhân đôi x2, Thẻ Tarot trợ lực.",
      riskMechanic: "Dính Bom sẽ mất sạch điểm Hũ của câu này. Bom Hắc Ám / Từ Thiện còn phạt trừ thêm điểm tổng.",
      survivalMechanic: "Khi vào Sinh Tử: Bốc đúng 1 lá duy nhất và thực thi ngay lập tức: 25% An toàn (Thoát/Khờ) vs 75% Sụp Đổ/Bom. Toàn bộ Perk bị vô hiệu hóa.",
    },
    TAROT_DESTINY: {
      title: "🔮 VÒNG QUAY TAROT 22 MAJOR ARCANA",
      badge: "Tarot 22 Arcana",
      icon: "🔮",
      steps: [
        { step: "1. Chốt lực quay", desc: "Canh thanh lực Ping-pong để xoay vòng quay 22 Ấn Cổ (17.5s – 22.5s tùy lực quay chuẩn Chiếc Nón Kỳ Diệu).", icon: "🎡" },
        { step: "2. Lật bài định mệnh", desc: "Mặt vòng quay ẩn giấu toàn bộ hiệu ứng cộng/trừ. Bấm 'Lật Bài Định Mệnh' để khai mở quẻ bài!", icon: "✨" },
        { step: "3. Đánh cược & Lật kèo", desc: "Trúng Ngôi Sao / Mặt Trăng mở Cánh Cổng Đánh Cược: Dừng lại nhận an toàn +1x điểm gốc hoặc Quay Tiếp để săn phần thưởng lớn hơn!", icon: "🔄" },
      ],
      rewardMechanic: "Điềm Lành (+1x, +1.5x, +2x điểm), Bánh Xe Vận Mệnh (Ngẫu nhiên x1/x1.5/x2), Chiến Xa & Thần Chết (Cướp tối đa 2x từ Top 1, chống cướp liên hoàn).",
      riskMechanic: "Ác Quỷ (Bom Hắc Ám chia +5đ cho đối thủ), Tháp Sét (Bẫy Sập -1x điểm gốc), Người Treo Ngược (Bom Từ Thiện tặng Top 1), Kẻ Khờ & Công Lý (±0đ).",
      survivalMechanic: "Khi vào Sinh Tử: 20% quay trúng Ấn Bình Yên thoát hiểm & 80% Ấn Bẫy/Phạt.",
    },
  };

  const getVariantLabel = () => {
    switch (miniGameType) {
      case "MEMORY_PAIRS":
        return { title: "🃏 Lật Cặp Trùng Nhau", badge: "Memory Pair", key: "MEMORY_PAIRS" };
      case "ONE_SHOT_DOORS":
      case "DOORS":
      case "CHESTS":
        return { title: "🚪 8 Cánh Cửa Bí Mật (2 Giai Đoạn)", badge: "8 Secret Doors", key: "ONE_SHOT_DOORS" };
      case "TAROT_DESTINY":
      case "TAROT_CARDS":
        return { title: "🔮 BÀI TAROT (Định Mệnh Chọn Lá)", badge: "Tarot", key: "TAROT_DESTINY" };
      case "PUSH_YOUR_LUCK":
      case "RADAR_WINDOWS":
      default:
        return { title: "💣 Lật Liều Tích Lũy Né Bom", badge: "Push-Your-Luck", key: "PUSH_YOUR_LUCK" };
    }
  };

  const variantInfo = getVariantLabel();
  const currentMiniGameRules = MINIGAME_RULES[variantInfo.key] || MINIGAME_RULES.PUSH_YOUR_LUCK;

  return (
    <div
      className={`w-full rounded-2xl p-2.5 sm:p-4 bg-gradient-to-b ${themeBgGradient} border-2 border-white/15 shadow-2xl relative overflow-hidden transition-all duration-700`}
      style={{
        boxShadow: `0 20px 60px -15px ${themeMeta.accentColor}33`,
      }}
    >
      {/* Ambient background glow */}
      <div
        className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-25 pointer-events-none"
        style={{ backgroundColor: themeMeta.accentColor }}
      />
      <div
        className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ backgroundColor: currentTurnTeamColor || "#3b82f6" }}
      />

      {/* ── Top Header: Theme, Turn, Team, and Minigame Selector ── */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-xl sm:text-2xl shadow-lg border border-white/20 shrink-0"
            style={{ backgroundColor: `${themeMeta.accentColor}33` }}
          >
            {themeMeta.emoji}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase font-black tracking-widest px-2 py-0.2 rounded-full bg-white/10 text-white/90 border border-white/15">
                {themeNameVi}
              </span>
              <span className="text-[10px] font-bold text-amber-300 px-2 py-0.2 rounded-full bg-amber-500/20 border border-amber-400/40">
                {variantInfo.title}
              </span>
            </div>
            <p className="text-[11px] text-white/60 mt-0.5 line-clamp-1">{themeMeta.taglineVi}</p>
          </div>
        </div>

        {/* Turn, Active Team Badge & Quick Rules Button */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Nút Phổ Biến Luật Chơi */}
          <button
            type="button"
            onClick={() => {
              setRulesModalTab(variantInfo.key as MysteryMiniGameType);
              setShowRulesModal(true);
            }}
            className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 border border-amber-400/50 shadow-md font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            title="Xem hướng dẫn chi tiết luật chơi Minigame"
          >
            <span>📖</span>
            <span className="hidden sm:inline">Luật Chơi</span>
          </button>

          <div className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-[11px] font-mono font-bold text-white/80">
            LƯỢT <span className="text-amber-400 font-black">{currentTurnIndex + 1}</span> / {totalTurns}
            <span className="mx-1.5 opacity-40">|</span>
            VÒNG <span className="text-cyan-400 font-black">{currentRound}</span>
          </div>

          <div
            className="flex items-center gap-2 px-2.5 py-1 rounded-xl border-2 shadow-xl"
            style={{
              borderColor: currentTurnTeamColor,
              backgroundColor: `${currentTurnTeamColor}22`,
            }}
          >
            <div
              className="w-2.5 h-2.5 rounded-full ring-2 ring-white/50 shrink-0 animate-pulse"
              style={{ backgroundColor: currentTurnTeamColor }}
            />
            <div className="text-left">
              <span className="text-[8px] uppercase font-black tracking-wider text-white/70 block leading-tight">
                ĐỘI THI ĐẤU
              </span>
              <span className="text-xs font-black text-white truncate max-w-[120px] block leading-tight">
                {currentTurnTeamName}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Host / Sandbox Minigame Switcher Pills ── */}
      {(isAdmin || isSandbox) && (
        <div className="relative z-10 pt-2 pb-1 flex flex-wrap items-center gap-1 text-[11px]">
          <span className="text-[10px] font-bold text-slate-400 mr-1">🎮 Đổi Minigame:</span>
          {[
            { key: "MEMORY_PAIRS", label: "🃏 Lật Cặp", icon: "🃏" },
            { key: "ONE_SHOT_DOORS", label: "🚪 8 Cửa", icon: "🚪" },
            { key: "PUSH_YOUR_LUCK", label: "💣 Lật Liều", icon: "💣" },
            { key: "TAROT_DESTINY", label: "🔮 Tarot", icon: "🔮" },
          ].map((v) => {
            const isActive = miniGameType === v.key;
            return (
              <button
                key={v.key}
                type="button"
                onClick={() => onSelectMiniGame?.(v.key as MysteryMiniGameType)}
                className={`px-2 py-0.5 rounded-md font-bold text-[10px] transition border cursor-pointer ${
                  isActive
                    ? "bg-purple-600 text-white border-purple-400 shadow-md ring-1 ring-purple-300"
                    : "bg-black/40 text-slate-300 border-white/10 hover:border-white/30 hover:bg-white/10"
                }`}
              >
                {v.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Quick Rules Banner (3 Bước Cốt Lõi) - Ẩn trên màn hình Hội trường (Display) để tối ưu hiển thị ── */}
      {!isDisplay && (
        <div className="relative z-10 my-2 p-2 sm:p-2.5 rounded-xl bg-black/50 border border-amber-400/30 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-sm">📖</span>
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-300">
              Luật Chơi Nhanh:
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2 flex-1 text-[11px] text-white/90">
            {currentMiniGameRules.steps.map((s, idx) => (
              <div key={idx} className="flex items-start gap-1.5 p-1 sm:p-1.5 rounded-lg bg-white/5 border border-white/5">
                <span className="text-amber-400 font-bold shrink-0">{s.icon}</span>
                <div className="leading-tight">
                  <strong className="text-white block text-[10px] font-bold">{s.step}</strong>
                  <span className="text-white/75 text-[10px] line-clamp-2">{s.desc}</span>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setRulesModalTab(variantInfo.key as MysteryMiniGameType);
              setShowRulesModal(true);
            }}
            className="shrink-0 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/80 to-orange-500/80 hover:from-amber-400 hover:to-orange-400 text-white font-extrabold text-[11px] border border-amber-300/50 shadow cursor-pointer active:scale-95 transition flex items-center justify-center gap-1"
          >
            <span>📜</span>
            <span>Chi Tiết Luật</span>
          </button>
        </div>
      )}

      {/* ── Phase HUD / Alerts ── */}
      <div className="relative z-10 py-2 sm:py-2.5">
        {/* Phase: QUESTION_ACTIVE */}
        {phase === "QUESTION_ACTIVE" && (
          <div className="p-4 rounded-2xl bg-black/40 border border-cyan-500/30 text-center animate-slide-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2">
              <span>🎯</span> VÒNG CÂU HỎI BẢN ĐỒ
            </div>
            <h3 className="text-base sm:text-lg font-black text-white">
              Đội <span style={{ color: currentTurnTeamColor }}>{currentTurnTeamName}</span> đang trả lời câu hỏi!
            </h3>
            <p className="text-xs text-white/70 mt-1 max-w-xl mx-auto">
              Trả lời đúng sẽ mở khóa thử thách Minigame{" "}
              <strong className="text-amber-300">{variantInfo.title}</strong>!
            </p>
          </div>
        )}

        {/* Phase: DECISION_CHOICE (Team chooses between Safe Base Points or Gamble Minigame OR Survival Dilemma) */}
        {phase === "DECISION_CHOICE" && (
          survivalDilemmaPending ? (
            /* ─────────────────────────────────────────────────────────────
               SURVIVAL DILEMMA CHOICE (Trả lời sai, đội có điểm & còn tim)
               ───────────────────────────────────────────────────────────── */
            <div className="w-full max-w-4xl mx-auto space-y-2 sm:space-y-3 animate-slide-up">
              <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-red-950/80 via-black/80 to-purple-950/80 border border-red-500/50 text-center shadow-xl">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[10px] sm:text-xs font-black uppercase tracking-wider mb-1 animate-pulse">
                  <span>💀</span> TRẢ LỜI CHƯA CHÍNH XÁC! LỰA CHỌN ĐÁNH ĐỔI SINH TỬ
                </div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  Lượt thi của Đội <span style={{ color: currentTurnTeamColor }}>{currentTurnTeamName}</span>
                </h3>
                {(() => {
                  const activeTeamObj = teams.find((t) => t.id === currentTurnTeamId);
                  const currentHearts = mysteryState?.teamHearts?.[currentTurnTeamId] ?? activeTeamObj?.hearts ?? mysteryState?.initialHeartsPerTeam ?? 0;
                  const currentScore = activeTeamObj?.score ?? 0;
                  return (
                    <p className="text-[11px] sm:text-xs text-white/80 mt-0.5 max-w-xl mx-auto line-clamp-2">
                      Đội bạn đang có <strong className="text-amber-300">{currentScore} điểm</strong> và còn <strong className="text-rose-400">❤️ {currentHearts}</strong>. Hãy đưa ra quyết định sinh tử:
                    </p>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {/* Phương Án 1: Mất Hết Tim để Bảo Toàn Điểm Số */}
                {(() => {
                  const activeTeamObj = teams.find((t) => t.id === currentTurnTeamId);
                  const currentHearts = mysteryState?.teamHearts?.[currentTurnTeamId] ?? activeTeamObj?.hearts ?? mysteryState?.initialHeartsPerTeam ?? 0;
                  const currentScore = activeTeamObj?.score ?? 0;

                  return (
                    <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-rose-950/80 via-black/80 to-slate-950/80 border-2 border-rose-500/60 hover:border-rose-400 shadow-xl flex flex-col justify-between text-center relative overflow-hidden group transition-all">
                      <div className="space-y-1 sm:space-y-1.5">
                        <div className="text-2xl sm:text-3xl">💔</div>
                        <h4 className="text-xs sm:text-sm font-black text-rose-300 uppercase tracking-wide">
                          Phương Án 1: Mất Hết Tim
                        </h4>
                        <div className="py-0.5">
                          <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                            Giữ {currentScore}đ
                          </span>
                        </div>
                        <p className="text-[10px] sm:text-xs text-white/80 leading-snug line-clamp-3">
                          Đánh đổi toàn bộ <strong className="text-rose-400">{currentHearts} ❤️</strong> (về 0 ❤️) để kết thúc lượt ngay bây giờ. Toàn bộ <strong>{currentScore} điểm</strong> được bảo toàn nguyên vẹn.
                        </p>
                      </div>

                      <div className="pt-2 sm:pt-3">
                        {canInteractDecision ? (
                          <button
                            type="button"
                            onClick={() => onSurvivalChoice?.("SACRIFICE_HEART")}
                            className="w-full py-2 sm:py-2.5 px-2 rounded-xl bg-gradient-to-r from-rose-700 to-red-600 hover:from-rose-600 hover:to-red-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-rose-950/60 border border-rose-400 hover:scale-[1.02] active:scale-95 transition cursor-pointer"
                          >
                            💔 Mất Hết Tim (Giữ {currentScore}đ)
                          </button>
                        ) : (
                          <div className="py-1.5 px-2 rounded-lg bg-black/40 border border-white/10 text-[10px] sm:text-xs text-slate-400 italic">
                            Đang đợi Đội {currentTurnTeamName}...
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Phương Án 2: Minigame Sinh Tử */}
                {(() => {
                  const activeTeamObj = teams.find((t) => t.id === currentTurnTeamId);
                  const currentHearts = mysteryState?.teamHearts?.[currentTurnTeamId] ?? activeTeamObj?.hearts ?? mysteryState?.initialHeartsPerTeam ?? 0;

                  return (
                    <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-purple-950/90 via-black/80 to-red-950/90 border-2 border-purple-500/60 hover:border-purple-400 shadow-xl flex flex-col justify-between text-center relative overflow-hidden group transition-all">
                      <div className="space-y-1 sm:space-y-1.5">
                        <div className="text-2xl sm:text-3xl">💀</div>
                        <h4 className="text-xs sm:text-sm font-black text-purple-300 uppercase tracking-wide">
                          Phương Án 2: Minigame Sinh Tử
                        </h4>
                        <div className="py-0.5">
                          <span className="text-xs sm:text-sm font-black font-mono text-amber-300">
                            Bảo Toàn ❤️ {currentHearts}
                          </span>
                        </div>
                        <p className="text-[10px] sm:text-xs text-white/80 leading-snug line-clamp-3">
                          Không mất tim trước, bước vào <strong>Minigame Sinh Tử</strong>: Tỷ lệ <span className="text-emerald-400 font-bold">25% An Toàn 🕊️/🃏</span> - <span className="text-rose-400 font-bold">75% Bẫy & Bom 💀</span>. Nếu an toàn: giữ trọn điểm và tim; nếu dính ô trừ điểm: trừ điểm và mất -1 ❤️!
                        </p>
                      </div>

                      <div className="pt-2 sm:pt-3">
                        {canInteractDecision ? (
                          <button
                            type="button"
                            onClick={() => onSurvivalChoice?.("RISK_SURVIVAL")}
                            className="w-full py-2 sm:py-2.5 px-2 rounded-xl bg-gradient-to-r from-purple-700 via-indigo-700 to-rose-700 hover:from-purple-600 hover:to-rose-600 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-purple-950/60 border border-purple-400 hover:scale-[1.02] active:scale-95 transition cursor-pointer animate-pulse"
                          >
                            💀 Đối Mặt Minigame Sinh Tử (Giữ ❤️)
                          </button>
                        ) : (
                          <div className="py-1.5 px-2 rounded-lg bg-black/40 border border-white/10 text-[10px] sm:text-xs text-slate-400 italic">
                            Đang đợi Đội {currentTurnTeamName}...
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Admin / MC override prompt for Survival Dilemma */}
              {(isAdmin || isSandbox) && (
                <div className="p-2 rounded-xl bg-black/60 border border-white/10 flex items-center justify-between gap-2 text-[11px] text-slate-300">
                  <span className="font-bold flex items-center gap-1 truncate">
                    <span>👑</span> Quyền Admin / MC:
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onSurvivalChoice?.("SACRIFICE_HEART")}
                      className="px-2.5 py-1 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-bold cursor-pointer transition text-[11px]"
                    >
                      MC chọn Hy sinh 1 ❤️
                    </button>
                    <button
                      type="button"
                      onClick={() => onSurvivalChoice?.("RISK_SURVIVAL")}
                      className="px-2.5 py-1 rounded-lg bg-purple-700 hover:bg-purple-600 text-white font-bold cursor-pointer transition text-[11px]"
                    >
                      MC chọn Minigame Sinh Tử
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
          <div className="w-full max-w-4xl mx-auto space-y-2 sm:space-y-3 animate-slide-up">
            <div className="p-2.5 sm:p-3 rounded-xl bg-black/60 border border-amber-500/40 text-center shadow-xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] sm:text-xs font-black uppercase tracking-wider mb-1">
                <span>⭐</span> TRẢ LỜI CHÍNH XÁC! LỰA CHỌN QUYẾT ĐỊNH
              </div>
              <h3 className="text-base sm:text-lg font-black text-white">
                Chúc mừng Đội <span style={{ color: currentTurnTeamColor }}>{currentTurnTeamName}</span>!
              </h3>
              <p className="text-[11px] sm:text-xs text-white/80 mt-0.5 max-w-xl mx-auto line-clamp-2">
                Bạn muốn nhận chắc chắn số điểm gốc của câu hỏi hay đem số điểm này vào quỹ để mạo hiểm cùng Minigame?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {/* Option A: Nhận điểm an toàn */}
              {(() => {
                const activeTeamObj = teams.find((t) => t.id === currentTurnTeamId);
                const teamHeartsVal = mysteryState?.teamHearts?.[currentTurnTeamId] ?? activeTeamObj?.hearts ?? mysteryState?.initialHeartsPerTeam ?? 0;
                const hasHearts = teamHeartsVal > 0;

                return (
                  <div className={`p-3 sm:p-4 rounded-2xl bg-gradient-to-b ${hasHearts ? "from-emerald-950/80 via-black/80 to-emerald-950/80 border-emerald-400/60 hover:border-emerald-300" : "from-gray-950/80 via-black/80 to-gray-950/80 border-rose-500/30 opacity-80"} border-2 shadow-xl flex flex-col justify-between text-center relative overflow-hidden group transition-all`}>
                    <div className="space-y-1 sm:space-y-1.5">
                      <div className="text-2xl sm:text-3xl">{hasHearts ? "🛡️" : "🔒"}</div>
                      <h4 className={`text-xs sm:text-sm font-black uppercase tracking-wide ${hasHearts ? "text-emerald-300" : "text-rose-400"}`}>
                        Phương Án 1: Nhận An Toàn
                      </h4>
                      <div className="py-0.5">
                        <span className={`text-2xl sm:text-4xl font-black font-mono ${hasHearts ? "text-emerald-400" : "text-slate-400"}`}>
                          +{baseQuestionPoints || 10}
                        </span>
                        <span className={`font-bold ml-1 text-xs sm:text-sm ${hasHearts ? "text-emerald-300" : "text-slate-500"}`}>điểm</span>
                      </div>
                      {hasHearts ? (
                        <p className="text-[10px] sm:text-xs text-white/70 leading-snug line-clamp-2">
                          Tiêu hao 1 ❤️ để nhận trọn vẹn điểm số câu hỏi (Hiện có: <strong className="text-rose-400">❤️ {teamHeartsVal}</strong>).
                        </p>
                      ) : (
                        <p className="text-[10px] sm:text-xs text-rose-300/90 leading-snug line-clamp-2 font-medium">
                          🔒 Đội đã hết Tim (0 ❤️)! Khóa quyền ăn điểm an toàn, bắt buộc phải vào Minigame né bom!
                        </p>
                      )}
                    </div>

                    <div className="pt-2 sm:pt-3">
                      {canInteractDecision ? (
                        hasHearts ? (
                          <button
                            type="button"
                            onClick={() => onChooseAction?.("TAKE_BASE_POINTS")}
                            className="w-full py-2 sm:py-2.5 px-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-emerald-900/50 border border-emerald-300 hover:scale-[1.02] active:scale-95 transition cursor-pointer"
                          >
                            🛡️ Chốt +{baseQuestionPoints || 10}đ An Toàn (-1 ❤️)
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="w-full py-2 sm:py-2.5 px-2 rounded-xl bg-slate-800/80 text-rose-300/80 font-black text-xs sm:text-sm uppercase tracking-wider border border-rose-500/30 cursor-not-allowed opacity-75"
                          >
                            🔒 Đã hết Tim! Bắt buộc vào Minigame
                          </button>
                        )
                      ) : (
                        <div className="py-1.5 px-2 rounded-lg bg-black/40 border border-white/10 text-[10px] sm:text-xs text-slate-400 italic">
                          Đang đợi Đội {currentTurnTeamName}...
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Option B: Chơi Minigame */}
              <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-purple-950/80 via-black/80 to-amber-950/80 border-2 border-amber-400/60 shadow-xl flex flex-col justify-between text-center relative overflow-hidden group hover:border-amber-300 transition-all">
                <div className="space-y-1 sm:space-y-1.5">
                  <div className="text-2xl sm:text-3xl">🎲</div>
                  <h4 className="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-wide">
                    Phương Án 2: Vào Minigame
                  </h4>
                  <div className="text-[10px] sm:text-xs font-bold text-indigo-300 flex items-center justify-center gap-1 truncate">
                    <span>Thử thách:</span>
                    <strong className="text-amber-200 truncate">{variantInfo.title}</strong>
                  </div>

                  {/* Starting Pot */}
                  <div className="py-0.5">
                    <span className="text-2xl sm:text-4xl font-black font-mono text-amber-400">
                      {(() => {
                        const perkType = typeof promoPerk === "string" ? promoPerk : promoPerk?.type;
                        return `+${(baseQuestionPoints || 10) + (perkType === "EXTRA_POT_PROMO" ? 5 : 0)}`;
                      })()}
                    </span>
                    <span className="text-amber-300 font-bold ml-1 text-xs sm:text-sm">điểm</span>
                  </div>

                  {/* Promo Perk Badge */}
                  {(() => {
                    const perkType = typeof promoPerk === "string" ? promoPerk : promoPerk?.type;
                    if (!perkType) return null;
                    return (
                      <div className="py-1 px-1.5 rounded-lg bg-purple-900/40 border border-purple-400/40 text-[10px] text-purple-200 font-bold flex items-center justify-center gap-1 truncate">
                        {perkType === "SHIELD_PROMO" && (
                          <>
                            <span>🛡️</span>
                            <span className="truncate">Khiên Chặn Bom 1 Lần (Cứu nguy & cho chơi tiếp)!</span>
                          </>
                        )}
                        {perkType === "EXTRA_POT_PROMO" && (
                          <>
                            <span>🎁</span>
                            <span className="truncate">Quỹ thưởng +5đ!</span>
                          </>
                        )}
                        {perkType === "STEAL_5_PROMO" && (
                          <>
                            <span>🗡️</span>
                            <span className="truncate">Đạo Tặc (Đánh cắp 5đ từ đội cao nhất)!</span>
                          </>
                        )}
                        {perkType === "DOUBLE_PROMO" && (
                          <>
                            <span>⚡</span>
                            <span className="truncate">Nhân đôi x2 điểm thưởng!</span>
                          </>
                        )}
                        {perkType === "PEEK_PROMO" && (
                          <>
                            <span>👁️</span>
                            <span className="truncate">Mắt Thần Soi Bài!</span>
                          </>
                        )}
                        {perkType === "EXTRA_ATTEMPT_PROMO" && (
                          <>
                            <span>🔄</span>
                            <span className="truncate">Thêm lượt / Cơ hội thứ hai!</span>
                          </>
                        )}
                        {perkType === "SAFETY_NET_PROMO" && (
                          <>
                            <span>🧲</span>
                            <span className="truncate">Két Sắt Bảo Lưu (giữ 50% quỹ)!</span>
                          </>
                        )}
                        {perkType === "SUN_MAGNET_PROMO" && (
                          <>
                            <span>☀️</span>
                            <span className="truncate">Nam Châm Thái Dương (Hóa 1 ô Kẻ Khờ thành Mặt Trời)!</span>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div className="pt-2 sm:pt-3">
                  {canInteractDecision ? (
                    <button
                      type="button"
                      onClick={() => onChooseAction?.("PLAY_MINIGAME")}
                      className="w-full py-2 sm:py-2.5 px-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-pink-600 hover:from-amber-400 hover:to-pink-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-orange-900/50 border border-amber-300 hover:scale-[1.02] active:scale-95 transition cursor-pointer"
                    >
                      🎲 Vào Chơi Minigame
                    </button>
                  ) : (
                    <div className="py-1.5 px-2 rounded-lg bg-black/40 border border-white/10 text-[10px] sm:text-xs text-slate-400 italic">
                      Đang đợi Đội {currentTurnTeamName}...
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Admin / Sandbox override prompt */}
            {(isAdmin || isSandbox) && (
              <div className="p-2 rounded-xl bg-black/60 border border-white/10 flex items-center justify-between gap-2 text-[11px] text-slate-300">
                <span className="font-bold flex items-center gap-1 truncate">
                  <span>👑</span> Quyền Admin / MC:
                </span>
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={() => onChooseAction?.("TAKE_BASE_POINTS")}
                    className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold cursor-pointer transition text-[11px]"
                  >
                    MC chọn Nhận An Toàn (+{baseQuestionPoints || 10}đ)
                  </button>
                  <button
                    type="button"
                    onClick={() => onChooseAction?.("PLAY_MINIGAME")}
                    className="px-2.5 py-1 rounded-lg bg-purple-700 hover:bg-purple-600 text-white font-bold cursor-pointer transition text-[11px]"
                  >
                    MC chọn Chơi Minigame
                  </button>
                  {onAdvanceTurn && (
                    <button
                      type="button"
                      onClick={onAdvanceTurn}
                      className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold cursor-pointer transition text-[11px]"
                    >
                      MC Bỏ qua lượt ➔
                    </button>
                  )}
                  {onAdjustScore && (
                    <button
                      type="button"
                      onClick={() => setShowScoreEditModal(true)}
                      className="px-2.5 py-1 rounded-lg bg-amber-600/80 hover:bg-amber-500 text-white font-bold cursor-pointer transition text-[11px] flex items-center gap-1 shadow"
                    >
                      <span>✏️</span>
                      <span>Sửa điểm</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          )
        )}

        {/* Phase: PUSH_YOUR_LUCK / MINIGAME_ACTIVE */}
        {phase === "PUSH_YOUR_LUCK" && (
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            {/* Survival Mode Banner */}
            {isPenaltySurvivalMode && (
              <div className="w-full max-w-2xl mx-auto p-2.5 rounded-2xl bg-gradient-to-r from-red-950/90 via-purple-950/90 to-red-950/90 border-2 border-red-500 shadow-2xl text-center space-y-1 animate-pulse">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/25 text-red-300 text-[10px] sm:text-xs font-black uppercase tracking-wider">
                  <span>💀</span> CHẾ ĐỘ MINIGAME SINH TỬ <span>💀</span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-white flex items-center justify-center gap-2 flex-wrap">
                  <span className="text-emerald-400 font-black">🕊️ 20% Thoát Hiểm / Giữ Điểm</span>
                  <span>•</span>
                  <span className="text-rose-400 font-black">💀 80% Bẫy Phạt & Bom</span>
                  <span>•</span>
                  <span className="text-yellow-300 font-bold">🚫 Toàn bộ Perk bị phong ấn</span>
                </div>
              </div>
            )}
            {/* VARIANT 1: MEMORY PAIRS HUD */}
            {miniGameType === "MEMORY_PAIRS" && (
              <div className="w-full max-w-xl mx-auto p-2 sm:p-2.5 rounded-xl bg-black/60 border border-indigo-400/50 shadow-xl">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-black text-indigo-300 uppercase tracking-wider text-[11px]">
                    {isPenaltySurvivalMode
                      ? "💀 LẬT CẶP SINH TỬ (16 THẺ - 8 CẶP - SUDDEN DEATH)"
                      : "🃏 THỬ THÁCH LẬT CẶP TRÙNG NHAU (16 THẺ - 8 CẶP - 5 LƯỢT)"}
                  </span>
                  <div className="flex items-center gap-2">
                    {memoryPairsState?.isBombRescueActive ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-500/30 text-amber-300 border border-amber-400 animate-pulse">
                        ⚠️ LƯỢT GIẢI CỨU (LẬT 3 LÁ)
                      </span>
                    ) : (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          isPenaltySurvivalMode
                            ? "bg-rose-500/30 text-rose-300 border border-rose-500/50 animate-pulse"
                            : memoryPairsState?.round === 2
                            ? "bg-rose-500/30 text-rose-300 border border-rose-500/50 animate-pulse"
                            : "bg-indigo-500/30 text-indigo-200 border border-indigo-500/40"
                        }`}
                      >
                        {isPenaltySurvivalMode
                          ? "💀 SUDDEN DEATH"
                          : memoryPairsState?.round === 2
                          ? "🔥 VÒNG 2 SINH TỬ"
                          : "✨ VÒNG 1"}
                      </span>
                    )}
                    <span className="font-mono font-bold text-amber-300 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-[11px]">
                      {isPenaltySurvivalMode
                        ? `Thẻ đã mở: ${memoryPairsState?.attemptsUsed ?? 0}`
                        : `Lượt lật: ${memoryPairsState?.attemptsUsed ?? 0}/${memoryPairsState?.maxAttempts ?? 5}`}
                    </span>
                  </div>
                </div>
                {memoryPairsState?.isBombRescueActive ? (
                  <p className="text-[11px] text-amber-200 font-bold leading-snug animate-pulse">
                    {memoryPairsState?.secondFlippedTileId ? (
                      <>🔥 Dính lá tiêu cực cùng loại ở lá thứ 2! Được thêm 1 lần lật: Hãy lật lá thứ 3 — Nếu lá 3 trùng khớp lá 1 thì theo chức năng cặp 1 - 3, nếu khác nhau thì theo cặp tiêu cực trước đó!</>
                    ) : (
                      <>🔥 Dính lá tiêu cực cùng loại ở lá thứ 1! Được thêm 1 lần lật (lật 3 lá): Hãy lật 2 lá tiếp theo — Nếu lá 2 và 3 trùng khớp nhau thì theo chức năng cặp 2 - 3, nếu khác nhau thì theo cặp tiêu cực trước đó!</>
                    )}
                  </p>
                ) : isPenaltySurvivalMode ? (
                  <p className="text-[11px] text-rose-300 font-bold leading-snug">
                    💀 SUDDEN DEATH: Không giới hạn số lượt! Hãy lật các thẻ để tìm kiếm cơ hội sống sót. Cặp thẻ trùng đầu tiên trên bàn cờ sẽ định đoạt: 🕊️ Thoát Hiểm / 🃏 Chàng Khờ (bảo toàn điểm & tim) vs 💀 Bẫy & Bom (nhận hình phạt)!
                  </p>
                ) : (memoryPairsState?.keptBombTileIds && memoryPairsState.keptBombTileIds.length > 0) ? (
                  <p className="text-[11px] text-rose-300 font-bold leading-snug">
                    💣 Cảnh báo: Đã có {memoryPairsState.keptBombTileIds.length} lá phạt/trung lập lộ diện (#{memoryPairsState.keptBombTileIds.join(", #")}) và giữ ngửa trên bàn! Tránh lặp lại chính xác nước đi đã thử!
                  </p>
                ) : (
                  <p className="text-[11px] text-white/80 leading-snug">
                    {memoryPairsState?.round === 2
                      ? "Cảnh báo sinh tử: Đang ở Vòng 2! Nếu sau 5 lượt vẫn không tìm được cặp trùng sẽ bị Trừ 100% Điểm Gốc + Trừ 1 Tim!"
                      : "Lật 2 thẻ để tìm cặp giống nhau. Cặp trùng đầu tiên sẽ nhận thưởng. Nếu hết 5 lượt Vòng 1 sẽ được chọn kết thúc an toàn hoặc chơi tiếp Vòng 2!"}
                  </p>
                )}
              </div>
            )}

            {/* MEMORY PAIRS SECOND CHANCE MODAL */}
            {miniGameType === "MEMORY_PAIRS" && !isPenaltySurvivalMode && memoryPairsState?.promptSecondChance && (
              <div className="w-full max-w-xl mx-auto p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-indigo-950/95 via-purple-950/95 to-black/95 border-2 border-amber-400/90 shadow-2xl animate-bounce-in text-center space-y-2 z-30">
                <div className="text-3xl animate-pulse">🔀</div>
                <h4 className="text-sm sm:text-base font-black text-amber-300 uppercase tracking-wider">
                  HẾT 5 LƯỢT VÒNG 1 — QUYẾT ĐỊNH VÒNG 2
                </h4>
                <p className="text-[11px] text-white/90 max-w-md mx-auto leading-relaxed">
                  Bạn chưa ghép được cặp nào trong Vòng 1. Không bị mất điểm!
                  <br />
                  Bạn có cơ hội <strong className="text-yellow-300">chơi tiếp Vòng 2 với 5 lượt mới</strong> (giữ nguyên Khiên Thần nếu có; nhưng nếu trượt cả 5 lượt Vòng 2 sẽ bị <strong className="text-rose-400">Trừ 100% Điểm Gốc và trừ 1 ❤️ Tim</strong>), hoặc <strong className="text-emerald-300">dừng chơi và nhận 50% điểm câu hỏi (+{Math.round((baseQuestionPoints || 10) * 0.5)}đ, tiêu hao 1 ❤️)</strong>!
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => (onPairsDecision ? onPairsDecision("CASH_OUT") : onCashOut?.())}
                    disabled={!canInteract}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-xs border border-emerald-300 shadow-lg cursor-pointer transition hover:scale-105 active:scale-95"
                  >
                    💰 DỪNG LẠI & NHẬN +{Math.round((baseQuestionPoints || 10) * 0.5)}Đ (50% GỐC, -1 ❤️)
                  </button>
                  <button
                    type="button"
                    onClick={() => onPairsDecision?.("PLAY_ROUND_2")}
                    disabled={!canInteract}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white font-black text-xs border border-rose-300 shadow-lg cursor-pointer transition hover:scale-105 active:scale-95"
                  >
                    🔥 CHƠI TIẾP VÒNG 2 (5 LƯỢT MỚI)
                  </button>
                </div>
              </div>
            )}

            {/* VARIANT 2: ONE SHOT DOORS HUD */}
            {(miniGameType === "ONE_SHOT_DOORS" || miniGameType === "DOORS" || miniGameType === "CHESTS") && (
              <div className="w-full max-w-xl mx-auto p-2 sm:p-2.5 rounded-xl bg-black/60 border border-amber-400/50 shadow-xl text-center space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-amber-300 uppercase tracking-wider text-[11px]">
                    🚪 8 CÁNH CỬA BÍ MẬT (8 ➔ 4 ➔ 2 ➔ 1)
                  </span>
                  <span className="font-mono font-bold text-amber-300 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-[10px]">
                    {oneShotState?.phase === "OPEN_FINAL" || oneShotState?.phase === "STAGE_2_PICK" || oneShotState?.phase === "SCANNED"
                      ? "✨ BƯỚC 4: MỞ 1 TRONG 2 CỬA ĐÃ CHỌN"
                      : oneShotState?.phase === "FINAL_DECISION" || oneShotState?.phase === "PENALTY_DECISION"
                      ? "⚠️ BƯỚC 3: QUYẾT ĐỊNH MỞ CỬA / ĐỔI CỬA / RÚT LUI"
                      : oneShotState?.phase === "STAGE_1_DECISION"
                      ? "💰 BƯỚC 2: CHỐT 100% GỐC HOẶC CHỌN TIẾP"
                      : oneShotState?.phase === "SELECT_2"
                      ? `Bước 2: Chọn 2 trong 4 cửa (${oneShotState?.selectedDoorIds?.length || 0}/2)`
                      : `Bước 1: Chọn 4 trong 8 cửa (${oneShotState?.selectedDoorIds?.length || 0}/4)`}
                  </span>
                </div>
                {oneShotState?.phase === "STAGE_1_DECISION" ? (
                  <p className="text-[11px] text-yellow-300 font-bold leading-snug">
                    Radar Tầng 1 đã quét! Bạn có quyền chốt nhận 100% điểm gốc ngay (-1 ❤️) hoặc tiếp tục chọn 2 trong 4 cửa!
                  </p>
                ) : oneShotState?.phase === "SELECT_2" ? (
                  <p className="text-[11px] text-yellow-300 font-bold leading-snug">
                    Hãy bấm chọn 2 trong 4 cánh cửa đã giữ lại. 4 cánh cửa bị loại trước đó đã được làm mờ!
                  </p>
                ) : oneShotState?.phase === "FINAL_DECISION" || oneShotState?.phase === "PENALTY_DECISION" ? (
                  <p className="text-[11px] text-yellow-300 font-bold leading-snug">
                    {oneShotState?.radarLight === "GREEN"
                      ? "🟢 Radar báo Xanh: Cả 2 cửa đều AN TOÀN TUYỆT ĐỐI! Hãy mở cửa hoặc rút lui an toàn."
                      : oneShotState?.radarLight === "YELLOW"
                      ? "🟡 Radar báo Vàng: Có 1 cửa tiêu cực (50/50)! Có thể Mở liều, Đổi cửa hoặc Rút lui an toàn."
                      : "🔴 Radar báo Đỏ: Cả 2 cửa đều là Bẫy & Bom! BẮT BUỘC ĐỔI CỬA trước khi mở!"}
                  </p>
                ) : oneShotState?.phase === "OPEN_FINAL" ? (
                  <p className="text-[11px] text-yellow-300 font-bold leading-snug">
                    👉 Hãy chọn mở 1 trong 2 cánh cửa đang sáng (#{(oneShotState?.selectedDoorIds || []).join(", #")}) bên dưới để nhận kết quả!
                  </p>
                ) : (
                  <p className="text-[11px] text-white/85 leading-snug">
                    Bước 1: Hãy chọn 4 trong 8 cánh cửa để giữ lại. Hệ thống sẽ kích hoạt Radar quét số lượng lá bẫy trước khi bạn quyết định tiếp!
                  </p>
                )}
              </div>
            )}

            {/* VARIANT 4: TAROT DESTINY HUD */}
            {(miniGameType === "TAROT_DESTINY" || miniGameType === "TAROT_CARDS") && (
              <div className="w-full max-w-xl mx-auto p-2 sm:p-2.5 rounded-xl bg-black/60 border border-purple-400/50 shadow-xl text-center">
                <div className="text-xs font-black text-purple-300 uppercase tracking-wider mb-0.5">
                  🔮 BÀI TAROT — ĐỊNH MỆNH CHỌN LÁ
                </div>
                <p className="text-[11px] text-white/80 leading-snug">
                  5 Thực Thể Cổ Xưa: Mặt Trời (+{baseQuestionPoints || 10}đ), Kẻ Khờ (0đ), Hoàng Đế (chia đều), Hiệp Sĩ (-50%), Thần Chết (Tặng/Cướp)!
                </p>
              </div>
            )}

            {/* VARIANT 3: PUSH YOUR LUCK HUD (The Classic Pot) */}
            {(miniGameType === "PUSH_YOUR_LUCK" || miniGameType === "RADAR_WINDOWS") && (
              <div className="w-full max-w-xl mx-auto p-2 sm:p-2.5 rounded-xl bg-black/60 border-2 border-amber-400/50 shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-300">
                    <span>💰</span> HŨ ĐIỂM TÍCH LŨY HIỆN TẠI
                  </div>
                  {potMultiplier > 1 && (
                    <div className="px-2 py-0.2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-[10px] uppercase tracking-widest border border-white/20 animate-pulse">
                      ⚡ X{potMultiplier}
                    </div>
                  )}
                </div>

                <div className="flex items-baseline justify-center gap-1.5 py-0.5">
                  <span className="text-2xl sm:text-3xl font-black bg-gradient-to-b from-yellow-200 via-amber-300 to-amber-500 bg-clip-text text-transparent drop-shadow-md font-mono">
                    +{potPoints.toLocaleString()}
                  </span>
                  <span className="text-xs font-black text-amber-300">điểm</span>
                </div>

                {mysteryState?.stolenPointsPot && mysteryState.stolenPointsPot > 0 ? (
                  <div className="flex justify-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-400/50 text-rose-300 text-[10px] sm:text-[11px] font-black animate-pulse shadow-sm">
                      <span>🗡️</span>
                      <span>
                        Gồm +{mysteryState.stolenPointsPot}đ nhắm cướp từ {mysteryState.pendingStealVictimName || "đối thủ"} (Chốt để nhận!)
                      </span>
                    </span>
                  </div>
                ) : null}

                <div className="flex items-center justify-between text-[10px] text-white/70 pt-1 border-t border-white/10 mt-0.5">
                  <span>Đã lật: <strong className="text-white">{cardsFlippedCount}</strong> ô</span>
                  <span>Còn lại: <strong className="text-white">{tiles.filter((t) => !t.isOpened).length}</strong> ô bí ẩn</span>
                </div>
              </div>
            )}

            {/* Admin / MC Control Bar during active minigame */}
            {(isAdmin || isSandbox) && (
              <div className="w-full max-w-xl mx-auto p-2 rounded-xl bg-black/60 border border-white/10 flex items-center justify-between gap-2 text-[11px] text-slate-300">
                <span className="font-bold flex items-center gap-1 truncate">
                  <span>👑</span> Quyền Admin / MC:
                </span>
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  {potPoints > 0 && onCashOut && (
                    <button
                      type="button"
                      onClick={() => onCashOut()}
                      className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold cursor-pointer transition text-[11px]"
                    >
                      MC Chốt hũ (+{potPoints}đ)
                    </button>
                  )}
                  {onAdvanceTurn && (
                    <button
                      type="button"
                      onClick={onAdvanceTurn}
                      className="px-2.5 py-1 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white font-bold cursor-pointer transition text-[11px]"
                    >
                      MC Chuyển lượt ➔
                    </button>
                  )}
                  {onAdjustScore && (
                    <button
                      type="button"
                      onClick={() => setShowScoreEditModal(true)}
                      className="px-2.5 py-1 rounded-lg bg-amber-600/80 hover:bg-amber-500 text-white font-bold cursor-pointer transition text-[11px] flex items-center gap-1 shadow"
                    >
                      <span>✏️</span>
                      <span>Sửa điểm</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Phase: TURN_SUMMARY */}
        {phase === "TURN_SUMMARY" && (
          <div className="w-full max-w-xl mx-auto text-center animate-slide-up space-y-2">
            {/* Targeted Private Notice for current player's team */}
            {myTeamId && mysteryState.teamNotices && mysteryState.teamNotices[myTeamId] && (
              <div
                className={`p-4 rounded-2xl border-2 shadow-2xl text-left animate-slide-up space-y-1.5 ${
                  mysteryState.teamNotices[myTeamId].delta > 0
                    ? "bg-gradient-to-r from-emerald-950/90 via-slate-900/90 to-emerald-950/90 border-emerald-400 text-emerald-100"
                    : mysteryState.teamNotices[myTeamId].delta < 0
                    ? "bg-gradient-to-r from-rose-950/90 via-slate-900/90 to-rose-950/90 border-rose-400 text-rose-100"
                    : "bg-gradient-to-r from-cyan-950/90 via-slate-900/90 to-indigo-950/90 border-cyan-400 text-cyan-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">
                      {mysteryState.teamNotices[myTeamId].delta > 0
                        ? "🎉"
                        : mysteryState.teamNotices[myTeamId].delta < 0
                        ? "⚠️"
                        : "🛡️"}
                    </span>
                    <span className="text-xs font-black uppercase tracking-wider">
                      {mysteryState.teamNotices[myTeamId].title}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-black px-2 py-0.5 rounded-full bg-black/50 border border-white/10">
                    {mysteryState.teamNotices[myTeamId].delta > 0
                      ? `+${mysteryState.teamNotices[myTeamId].delta}đ`
                      : mysteryState.teamNotices[myTeamId].delta < 0
                      ? `${mysteryState.teamNotices[myTeamId].delta}đ`
                      : "±0đ"}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-medium leading-relaxed">
                  {mysteryState.teamNotices[myTeamId].message}
                </p>
              </div>
            )}

            {turnFinishedReason === "QUESTION_FAILED" ? (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-slate-900/95 to-black/95 border-2 border-rose-500/80 shadow-2xl space-y-1.5">
                <div className="text-3xl sm:text-4xl animate-bounce">❌</div>
                <h3 className="text-lg sm:text-xl font-black text-rose-400">TRẢ LỜI CHƯA CHÍNH XÁC!</h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  Đội <strong className="text-white">{currentTurnTeamName}</strong> chưa trả lời đúng câu hỏi. Lượt thi kết thúc với 0 điểm tích lũy.
                </p>
              </div>
            ) : (turnFinishedReason === "BOMB_HIT" || (storyResult && storyResult.scoreDelta < 0)) ? (
              <div
                className={`p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b border-2 shadow-2xl space-y-2 ${
                  bombExploded?.type === "CHARITY" || bombExploded?.type === "GIFT"
                    ? "from-amber-950/95 via-yellow-950/90 to-black/95 border-amber-400"
                    : bombExploded?.type === "DARK" || bombExploded?.type === "DOOM"
                    ? "from-purple-950/95 via-zinc-950/90 to-black/95 border-purple-500"
                    : bombExploded?.type === "SMOKE"
                    ? "from-slate-900/95 via-gray-950/90 to-black/95 border-slate-400"
                    : "from-rose-950/95 via-red-950/90 to-black/95 border-rose-500"
                }`}
              >
                <div className="text-3xl sm:text-4xl animate-bounce">
                  {bombExploded?.type === "CHARITY" || bombExploded?.type === "GIFT"
                    ? "🎁"
                    : bombExploded?.type === "DARK" || bombExploded?.type === "DOOM"
                    ? "🌑"
                    : bombExploded?.type === "SMOKE"
                    ? "💨"
                    : "⚡"}
                </div>
                <h3
                  className={`text-lg sm:text-xl font-black ${
                    bombExploded?.type === "CHARITY" || bombExploded?.type === "GIFT"
                      ? "text-amber-300"
                      : bombExploded?.type === "DARK" || bombExploded?.type === "DOOM"
                      ? "text-purple-300"
                      : bombExploded?.type === "SMOKE"
                      ? "text-slate-200"
                      : "text-rose-400"
                  }`}
                >
                  {bombExploded?.title || "BẪY PHẠT KÍCH HOẠT!"}
                </h3>
                <p className="text-xs text-white/80 max-w-md mx-auto">
                  {bombExploded?.description || `Đội ${currentTurnTeamName} đã kích hoạt bẫy phạt của minigame!`}
                </p>
                <div
                  className={`p-2 rounded-xl border font-bold text-[11px] ${
                    bombExploded?.type === "CHARITY" || bombExploded?.type === "GIFT"
                      ? "bg-amber-900/40 border-amber-400/50 text-amber-200"
                      : bombExploded?.type === "DARK" || bombExploded?.type === "DOOM"
                      ? "bg-purple-900/40 border-purple-500/50 text-purple-200"
                      : bombExploded?.type === "SMOKE"
                      ? "bg-slate-800/50 border-slate-500/50 text-slate-200"
                      : "bg-rose-900/40 border-rose-500/50 text-rose-200"
                  }`}
                >
                  ⚠️ Hậu quả: {bombExploded?.penaltyText || storyResult?.rewardText || "Bị trừ điểm phạt!"}
                </div>

                {/* Danh sách các đội nhận điểm thưởng từ Bom Hắc Ám hoặc Bom Từ Thiện */}
                {bombExploded?.recipients && bombExploded.recipients.length > 0 && (
                  <div className="pt-0.5 flex flex-wrap items-center justify-center gap-1.5">
                    <span className="text-[10px] font-bold text-purple-300/80 uppercase">Đội nhận điểm:</span>
                    {bombExploded.recipients.map((rec, idx) => (
                      <span
                        key={rec.teamId || idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-200 text-[11px] font-black shadow-sm"
                      >
                        <span>🎁</span>
                        <span>{rec.teamName}</span>
                        <span className="text-emerald-300 font-mono">+{rec.points}đ</span>
                      </span>
                    ))}
                  </div>
                )}

                {bombExploded?.recipientTeamName && (bombExploded.type === "CHARITY" || bombExploded.type === "GIFT") && (
                  <div className="pt-0.5 flex items-center justify-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-200 text-[11px] font-black shadow-sm">
                      <span>🏆</span>
                      <span>{bombExploded.recipientTeamName} (Đội cao điểm nhất)</span>
                      <span className="text-emerald-300 font-mono">+{bombExploded.giftedPoints || bombExploded.deductedPoints}đ</span>
                    </span>
                  </div>
                )}
              </div>
            ) : turnFinishedReason === "ALL_CLEARED" ? (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-amber-950/90 to-black/90 border-2 border-amber-400 shadow-2xl space-y-1.5">
                <div className="text-3xl sm:text-4xl animate-bounce">🏆</div>
                <h3 className="text-lg sm:text-xl font-black text-amber-300">ĐẠI THẮNG QUÉT SẠCH TẤT CẢ Ô!</h3>
                <p className="text-xs text-amber-100 max-w-md mx-auto">
                  Tuyệt đỉnh! Đội {currentTurnTeamName} đã lật hết toàn bộ phần thưởng mà không dính bom!
                </p>
                <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-400/50 text-amber-300 font-black text-xs">
                  {storyResult?.rewardText || "Cộng thưởng an toàn trọn vẹn!"}
                </div>
              </div>
            ) : turnFinishedReason === "PAIR_MATCHED" ? (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-indigo-950/90 to-black/90 border-2 border-indigo-400 shadow-2xl space-y-1.5">
                <div className="text-3xl sm:text-4xl animate-bounce">🎉</div>
                <h3 className="text-lg sm:text-xl font-black text-indigo-300">GHÉP CẶP THÀNH CÔNG!</h3>
                <p className="text-xs text-indigo-100 max-w-md mx-auto">
                  {storyResult?.rewardText || "Đã ghép chính xác cặp thẻ đầu tiên!"}
                </p>
              </div>
            ) : turnFinishedReason === "DOOR_CHOSEN" ? (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-amber-950/90 to-black/90 border-2 border-amber-400 shadow-2xl space-y-1.5">
                <div className="text-3xl sm:text-4xl animate-bounce">🚪</div>
                <h3 className="text-lg sm:text-xl font-black text-amber-300">CÁNH CỬA ĐÃ MỞ!</h3>
                <p className="text-xs text-amber-100 max-w-md mx-auto">
                  {storyResult?.rewardText || "Nhận thưởng thành công từ cánh cửa đã chọn!"}
                </p>
              </div>
            ) : (turnFinishedReason === "TAROT_DRAWN" || turnFinishedReason === "TAROT_WHEEL_SPUN") ? (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-purple-950/90 to-black/90 border-2 border-purple-400 shadow-2xl space-y-1.5">
                <div className="text-3xl sm:text-4xl animate-bounce">🔮</div>
                <h3 className="text-lg sm:text-xl font-black text-purple-300">QUẺ BÀI ĐỊNH MỆNH ĐÃ KHAI MỞ!</h3>
                <p className="text-xs text-purple-100 max-w-md mx-auto">
                  {storyResult?.rewardText || "Đã rút bài Tarot vận mệnh thành công!"}
                </p>
              </div>
            ) : turnFinishedReason === "MAX_ATTEMPTS" ? (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-slate-900/90 to-black/90 border-2 border-amber-500 shadow-2xl space-y-1.5">
                <div className="text-3xl sm:text-4xl animate-bounce">⏳</div>
                <h3 className="text-lg sm:text-xl font-black text-amber-400">HẾT LƯỢT LẬT THỬ!</h3>
                <p className="text-xs text-white/80 max-w-md mx-auto">
                  Đã sử dụng hết số lượt lật bài mà chưa mở được cặp trùng nhau. Lượt kết thúc với 0 điểm.
                </p>
              </div>
            ) : turnFinishedReason === "TOOK_BASE_POINTS" ? (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-teal-950/90 to-black/90 border-2 border-teal-400 shadow-2xl space-y-1.5">
                <div className="text-3xl sm:text-4xl animate-bounce">🛡️</div>
                <h3 className="text-lg sm:text-xl font-black text-teal-300">RÚT LUI BẢO TOÀN ĐIỂM GỐC (-1 ❤️)!</h3>
                <p className="text-xs text-teal-100 max-w-md mx-auto">
                  Đội {currentTurnTeamName} đã chủ động tiêu hao 1 ❤️ để nhận an toàn trọn vẹn điểm câu hỏi!
                </p>
                <div className="p-2 rounded-xl bg-teal-500/20 border border-teal-400/50 text-teal-300 font-black text-sm font-mono">
                  {storyResult?.rewardText || "Bảo toàn thành công!"}
                </div>
              </div>
            ) : turnFinishedReason === "SURVIVAL_ESCAPE" ? (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-emerald-950/90 to-black/90 border-2 border-emerald-400 shadow-2xl space-y-1.5">
                <div className="text-3xl sm:text-4xl animate-bounce">🕊️</div>
                <h3 className="text-lg sm:text-xl font-black text-emerald-300">THOÁT HIỂM SINH TỬ THÀNH CÔNG!</h3>
                <p className="text-xs text-emerald-100 max-w-md mx-auto">
                  Kỳ tích xuất hiện! Đội <strong className="text-white">{currentTurnTeamName}</strong> đã lật trúng cặp Thoát Hiểm, bảo toàn nguyên vẹn điểm số và tim (0đ)!
                </p>
                <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-black text-xs font-mono">
                  {storyResult?.rewardText || "0đ (Bảo toàn điểm số)"}
                </div>
              </div>
            ) : turnFinishedReason === "SURVIVAL_FAILED" ? (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-rose-950/90 to-black/90 border-2 border-rose-500 shadow-2xl space-y-1.5">
                <div className="text-3xl sm:text-4xl animate-bounce">💀</div>
                <h3 className="text-lg sm:text-xl font-black text-rose-400">HÌNH PHẠT SINH TỬ KÍCH HOẠT!</h3>
                <p className="text-xs text-rose-100 max-w-md mx-auto">
                  Đội <strong className="text-white">{currentTurnTeamName}</strong> không thể né bẫy phạt của Chế độ Sinh Tử!
                </p>
                <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-400/50 text-rose-300 font-black text-xs font-mono">
                  {storyResult?.rewardText || "Bị trừ điểm phạt!"}
                </div>
              </div>
            ) : (
              <div className={`p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b border-2 shadow-2xl space-y-1.5 ${
                (storyResult?.scoreDelta ?? 0) < 0
                  ? "from-rose-950/90 to-black/90 border-rose-500"
                  : (storyResult?.scoreDelta ?? 0) > 0
                  ? "from-emerald-950/90 to-black/90 border-emerald-400"
                  : "from-slate-900/90 to-black/90 border-amber-400"
              }`}>
                <div className="text-3xl sm:text-4xl animate-bounce">
                  {(storyResult?.scoreDelta ?? 0) < 0 ? "⚠️" : (storyResult?.scoreDelta ?? 0) > 0 ? "💰" : "🛡️"}
                </div>
                <h3 className={`text-lg sm:text-xl font-black ${
                  (storyResult?.scoreDelta ?? 0) < 0 ? "text-rose-400" : (storyResult?.scoreDelta ?? 0) > 0 ? "text-emerald-300" : "text-amber-300"
                }`}>
                  {(storyResult?.scoreDelta ?? 0) < 0
                    ? "BỊ PHẠT TRỪ ĐIỂM!"
                    : (storyResult?.scoreDelta ?? 0) > 0
                    ? "BẢO TOÀN ĐIỂM THÀNH CÔNG!"
                    : "KẾT THÚC LƯỢT THI!"}
                </h3>
                <p className="text-xs text-white/80 max-w-md mx-auto">
                  {(storyResult?.scoreDelta ?? 0) < 0
                    ? `Đội ${currentTurnTeamName} đã kích hoạt bẫy phạt và bị trừ điểm.`
                    : (storyResult?.scoreDelta ?? 0) > 0
                    ? `Lựa chọn sáng suốt! Đội ${currentTurnTeamName} đã bảo toàn an toàn quỹ điểm về tài khoản!`
                    : `Lượt thi của Đội ${currentTurnTeamName} đã kết thúc an toàn mà không thay đổi điểm số.`}
                </p>
                <div className={`p-2 rounded-xl border font-black text-sm font-mono ${
                  (storyResult?.scoreDelta ?? 0) < 0
                    ? "bg-rose-500/20 border-rose-400/50 text-rose-300"
                    : (storyResult?.scoreDelta ?? 0) > 0
                    ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-300"
                    : "bg-amber-500/20 border-amber-400/50 text-amber-300"
                }`}>
                  {storyResult?.rewardText || ((storyResult?.scoreDelta ?? 0) < 0 ? "Bị trừ điểm!" : "Bảo toàn thành công!")}
                </div>
              </div>
            )}

            {/* Host Advance Bar & Status */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-black/60 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <span className="text-xs text-slate-300 flex items-center gap-2 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                {isAdmin || isSandbox ? (
                  <span>Lượt thi đã kết thúc. Vui lòng bấm nút bên cạnh để chuyển sang lượt tiếp theo.</span>
                ) : (
                  <span>Đang chờ Admin / Quản trò chuyển sang lượt hoặc câu hỏi tiếp theo...</span>
                )}
              </span>

              {(isAdmin || isSandbox) && (
                <button
                  type="button"
                  onClick={onAdvanceTurn}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg border border-white/20 hover:scale-105 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                >
                  CHUYỂN SANG LƯỢT TIẾP THEO ➔
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Minigame Specific Interactive Grids ── */}
      {(phase === "PUSH_YOUR_LUCK" || phase === "TURN_SUMMARY") && (
        <div className="relative z-10 mt-2">
        {/* ════════════════════════════════════════════════════════════════════
            1. VARIANT: ONE_SHOT_DOORS (4 Cánh Cửa Bí Mật - Radar Scan)
        ════════════════════════════════════════════════════════════════════ */}
        {(miniGameType === "ONE_SHOT_DOORS" || miniGameType === "DOORS" || miniGameType === "CHESTS") && (
          <div className="max-w-4xl mx-auto py-1">
            {/* Stage 1 / Stage 2 / Final Decision / Survival Prompts */}
            {(() => {
              const osPhase = oneShotState?.phase;
              const radarLight1 = oneShotState?.radarLightStep1;
              const radarLight2 = oneShotState?.radarLight;
              const activeTeamObj = teams.find((t) => t.id === currentTurnTeamId);
              const activeTeamHearts = mysteryState.teamHearts?.[currentTurnTeamId] ?? activeTeamObj?.hearts ?? mysteryState.initialHeartsPerTeam ?? 1;
              const hasHeartsToSafelyExit = activeTeamHearts > 0;

              // ── CHẾ ĐỘ SINH TỬ (SURVIVAL MODE) ──
              if (isPenaltySurvivalMode) {
                if (osPhase === "SELECT_4" || osPhase === "SELECTING" || !osPhase) {
                  return (
                    <div className="mb-3 p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-rose-950/95 via-purple-950/90 to-black/95 border-2 border-rose-500 shadow-2xl text-center space-y-2 animate-bounce-in max-w-xl mx-auto">
                      <div className="text-3xl animate-pulse">💀🚪</div>
                      <h4 className="text-xs sm:text-sm font-black text-rose-300 uppercase tracking-wider">
                        CỬA SINH TỬ - BƯỚC 1: CHỌN 4 TRONG 8 CÁNH CỬA
                      </h4>
                      <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-rose-500/50 text-rose-200 text-xs font-bold flex items-center justify-center gap-2">
                        <span className="text-emerald-400 font-bold">🕊️ 25% An Toàn (Thoát Hiểm / Chàng Khờ)</span>
                        <span>•</span>
                        <span className="text-rose-400 font-bold">💀 75% Bẫy & Bom</span>
                      </div>
                      <p className="text-[11px] text-white/80 max-w-md mx-auto">
                        Hãy chọn 4 cánh cửa bạn tin tưởng nhất. Radar sẽ quét xem có cửa an toàn nào trong đó không! (Đã chọn: <strong className="text-amber-300">{(oneShotState?.selectedDoorIds || []).length}/4</strong>)
                      </p>
                    </div>
                  );
                }

                if (osPhase === "STAGE_2_PICK") {
                  const isGreen = radarLight1 === "GREEN";
                  return (
                    <div className="mb-3 p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-rose-950/95 via-purple-950/90 to-black/95 border-2 border-rose-500 shadow-2xl text-center space-y-2.5 animate-bounce-in max-w-xl mx-auto">
                      <div className="text-3xl animate-pulse">{isGreen ? "🟢✨" : "🔴💥"}</div>
                      <h4 className="text-xs sm:text-sm font-black text-rose-300 uppercase tracking-wider">
                        CỬA SINH TỬ - BƯỚC 2: MỞ 1 TRONG 4 CỬA ĐÃ GIỮ!
                      </h4>
                      <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 shadow-inner ${
                        isGreen
                          ? "bg-emerald-950/80 border-emerald-400 text-emerald-200 animate-pulse"
                          : "bg-red-950/80 border-red-500 text-red-200 animate-pulse"
                      }`}>
                        {isGreen ? (
                          <span>🟢 RADAR BÁO ĐÈN XANH: Có ít nhất 1 Cửa An Toàn (🕊️ Thoát Hiểm / 🃏 Chàng Khờ) trong 4 cửa bạn giữ!</span>
                        ) : (
                          <span>🔴 RADAR BÁO ĐÈN ĐỎ: Cả 4 cửa đều là Bẫy & Bom! Hãy chọn 1 cửa ít thiệt hại nhất!</span>
                        )}
                      </div>
                      <p className="text-[11px] text-white/90 max-w-md mx-auto">
                        Bấm trực tiếp vào <strong className="text-yellow-300 underline">1 trong 4 cánh cửa đang sáng</strong> (#{(oneShotState?.selectedDoorIds || []).join(", #")}) bên dưới để mở ngay lập tức!
                      </p>
                    </div>
                  );
                }
                return null;
              }

              // ── CHẾ ĐỘ BÌNH THƯỜNG (NORMAL MODE - 4 BƯỚC) ──
              // Bước 1: Chọn 4 trong 8 cửa
              if (osPhase === "SELECT_4" || osPhase === "SELECTING" || !osPhase) {
                return (
                  <div className="mb-3 p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-indigo-950/90 via-slate-950/90 to-black/95 border-2 border-indigo-500/60 shadow-xl text-center space-y-1.5 max-w-xl mx-auto">
                    <div className="text-2xl animate-pulse">🚪🔍</div>
                    <h4 className="text-xs sm:text-sm font-black text-indigo-300 uppercase tracking-wider">
                      BƯỚC 1: CHỌN 4 TRONG 8 CÁNH CỬA ĐỊNH MỆNH
                    </h4>
                    <p className="text-[11px] text-white/80 max-w-md mx-auto">
                      Hãy bấm chọn 4 cánh cửa bạn muốn giữ lại. Radar sẽ quét tín hiệu kíp nổ sau khi chọn đủ 4 cửa! (Đã chọn: <strong className="text-amber-300">{(oneShotState?.selectedDoorIds || []).length}/4</strong>)
                    </p>
                  </div>
                );
              }

              // Bước 2: Quyết định giữa Nhận 100% Điểm Gốc ngay HOẶC Tiếp tục chọn 2 cửa
              if (osPhase === "STAGE_1_DECISION") {
                const isGreen = radarLight1 === "GREEN";
                const isYellow = radarLight1 === "YELLOW";
                return (
                  <div className="mb-3 p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-amber-950/95 via-yellow-950/90 to-black/95 border-2 border-yellow-400 shadow-2xl text-center space-y-2.5 animate-bounce-in max-w-xl mx-auto">
                    <div className="text-3xl animate-bounce">{isGreen ? "🟢" : isYellow ? "🟡" : "🔴"}</div>
                    <h4 className="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-wider">
                      RADAR QUÉT BƯỚC 1: KẾT QUẢ 4 CỬA ĐÃ CHỌN
                    </h4>
                    <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 shadow-inner ${
                      isGreen
                        ? "bg-emerald-950/90 border-emerald-400 text-emerald-200"
                        : isYellow
                        ? "bg-amber-950/90 border-amber-400 text-amber-200"
                        : "bg-red-950/90 border-red-500 text-red-200"
                    }`}>
                      {isGreen && <span>🟢 ĐÈN XANH: Cả 4 cửa đều hoàn toàn an toàn (0 kíp nổ)!</span>}
                      {isYellow && <span>🟡 ĐÈN VÀNG: Radar phát hiện có 1 kíp nổ / bẫy trong 4 cửa này!</span>}
                      {!isGreen && !isYellow && <span>🔴 ĐÈN ĐỎ: Radar phát hiện có từ 2 kíp nổ trở lên trong 4 cửa này!</span>}
                    </div>
                    <p className="text-[11px] text-white/90 max-w-md mx-auto leading-relaxed">
                      Bạn có thể chọn <strong>Nhận ngay 100% điểm gốc (-1 ❤️)</strong> và kết thúc lượt an toàn, HOẶC <strong>Tiếp tục chọn 2 cửa</strong> để tiến vào vòng trong!
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onDoorsDecision?.({ decision: "TAKE_100_BASE" })}
                        disabled={!canInteract}
                        className="px-3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg border border-emerald-400 active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span>💰</span>
                        <span>Nhận 100% Điểm (+{baseQuestionPoints || 10}đ | -1 ❤️)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDoorsDecision?.({ decision: "PROCEED_TO_SELECT_2" })}
                        disabled={!canInteract}
                        className="px-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg border border-amber-400 active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5 animate-pulse"
                      >
                        <span>🚪</span>
                        <span>Tiếp Tục Chọn 2 Cửa ➔</span>
                      </button>
                    </div>
                  </div>
                );
              }

              // Bước 3: Chọn 2 trong 4 cửa
              if (osPhase === "SELECT_2") {
                return (
                  <div className="mb-3 p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-indigo-950/90 via-slate-950/90 to-black/95 border-2 border-indigo-500/60 shadow-xl text-center space-y-1.5 max-w-xl mx-auto">
                    <div className="text-2xl animate-pulse">🚪⚡</div>
                    <h4 className="text-xs sm:text-sm font-black text-yellow-300 uppercase tracking-wider">
                      BƯỚC 2: CHỌN 2 TRONG 4 CÁNH CỬA ĐANG SÁNG
                    </h4>
                    <p className="text-[11px] text-white/80 max-w-md mx-auto">
                      Hãy chọn 2 cánh cửa để tiến hành Radar quét vòng quyết định! 2 cánh cửa không chọn sẽ bị loại bỏ vào khu vực bài bỏ. (Đã chọn: <strong className="text-amber-300">{(oneShotState?.selectedDoorIds || []).length}/2</strong>)
                    </p>
                  </div>
                );
              }

              // Bước 3/4: Quyết định vòng chung cuộc
              if (osPhase === "FINAL_DECISION") {
                const isGreen = radarLight2 === "GREEN";
                const isYellow = radarLight2 === "YELLOW";
                return (
                  <div className="mb-3 p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-amber-950/95 via-yellow-950/90 to-black/95 border-2 border-yellow-400 shadow-2xl text-center space-y-2.5 animate-bounce-in max-w-xl mx-auto">
                    <div className="text-3xl animate-bounce">{isGreen ? "🟢✨" : isYellow ? "🟡⚠️" : "🔴💥"}</div>
                    <h4 className="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-wider">
                      RADAR QUÉT CHUNG CUỘC: 2 CỬA CUỐI CÙNG
                    </h4>
                    <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 shadow-inner ${
                      isGreen
                        ? "bg-emerald-950/90 border-emerald-400 text-emerald-200"
                        : isYellow
                        ? "bg-amber-950/90 border-amber-400 text-amber-200"
                        : "bg-red-950/90 border-red-500 text-red-200"
                    }`}>
                      {isGreen && <span>🟢 ĐÈN XANH: Cả 2 cửa đều hoàn toàn an toàn! Hãy chọn 1 cửa để mở!</span>}
                      {isYellow && <span>🟡 ĐÈN VÀNG: Có 1 ô tiêu cực trong 2 cửa này (Tỷ lệ 50/50)! Tự do lựa chọn: Mở liều, Đổi 1 cửa hoặc Rút lui an toàn!</span>}
                      {!isGreen && !isYellow && <span>🔴 ĐÈN ĐỎ: Cả 2 cửa đều là Bẫy & Bom (100% Tiêu cực)! BẮT BUỘC ĐỔI CỬA hoặc Rút lui an toàn!</span>}
                    </div>

                    {swapStep === "IDLE" ? (
                      isGreen ? (
                        <>
                          <p className="text-[11px] sm:text-xs text-white/90 max-w-md mx-auto leading-relaxed">
                            Cả 2 cánh cửa hiện tại đều an toàn (100% không bẫy)! Bạn có thể bấm trực tiếp vào <strong className="text-yellow-300 underline">1 trong 2 cánh cửa đang sáng</strong> (#{(oneShotState?.selectedDoorIds || []).join(", #")}) bên dưới để mở nhận thưởng, HOẶC có thể <strong>Đổi 1 cửa</strong> để thử thách vận may!
                          </p>
                          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1 max-w-md mx-auto">
                            <button
                              type="button"
                              onClick={() => setSwapStep("SELECT_REMOVE")}
                              disabled={!canInteract || Boolean(oneShotState?.hasSwapped)}
                              className={`w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black text-xs uppercase tracking-wider shadow-lg border border-amber-400 active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5 ${
                                oneShotState?.hasSwapped ? "opacity-50 cursor-not-allowed" : "animate-pulse"
                              }`}
                            >
                              <span>🔄</span>
                              <span>{oneShotState?.hasSwapped ? "Đã Đổi Cửa" : "Đổi 1 Cửa (Thử Vận May)"}</span>
                            </button>
                          </div>
                          <p className="text-[10px] text-amber-200/90 italic pt-0.5 max-w-md mx-auto">
                            ⚠️ Lưu ý: Khi đổi cửa từ Đèn Xanh, hệ thống sẽ KHÔNG báo trước cửa mới có bẫy hay không, và đội bạn BUỘC PHẢI mở chính cánh cửa vừa đổi vào (cửa an toàn cũ sẽ bị khóa)!
                          </p>
                        </>
                      ) : isYellow ? (
                        <>
                          <p className="text-[11px] sm:text-xs text-white/90 max-w-md mx-auto leading-relaxed">
                            Đèn Vàng (50% An Toàn / 50% Tiêu Cực)! Đội bạn <strong>không bị ép buộc phải đổi cửa</strong>. Hãy chọn 1 trong 3 phương án:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                            {/* Phương án 1: Mở liều 1 trong 2 cửa */}
                            <button
                              type="button"
                              onClick={() => onDoorsDecision?.({ decision: "RISK_OPEN" })}
                              disabled={!canInteract}
                              className="px-3 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-black text-xs uppercase tracking-wider shadow-lg border border-yellow-300 active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5 animate-pulse"
                            >
                              <span>🎲</span>
                              <span>Mở Liều (50/50)</span>
                            </button>

                            {/* Phương án 2: Đổi 1 cửa */}
                            <button
                              type="button"
                              onClick={() => setSwapStep("SELECT_REMOVE")}
                              disabled={!canInteract || Boolean(oneShotState?.hasSwapped)}
                              className={`px-3 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black text-xs uppercase tracking-wider shadow-lg border border-amber-400 active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5 ${
                                oneShotState?.hasSwapped ? "opacity-50 cursor-not-allowed" : ""
                              }`}
                            >
                              <span>🔄</span>
                              <span>{oneShotState?.hasSwapped ? "Đã Đổi Cửa" : "Đổi 1 Cửa"}</span>
                            </button>

                            {/* Phương án 3: Rút lui an toàn */}
                            {hasHeartsToSafelyExit ? (
                              <button
                                type="button"
                                onClick={() => onDoorsDecision?.({ decision: "SAFE_EXIT" })}
                                disabled={!canInteract}
                                className="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider shadow-lg border border-emerald-400 active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                <span>🛡️</span>
                                <span>Rút Lui (+{Math.round((baseQuestionPoints || 10) * 0.5)}đ, -1 ❤️)</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled
                                className="px-3 py-2 rounded-xl bg-stone-800 text-stone-400 font-bold text-xs uppercase border border-stone-700 cursor-not-allowed opacity-60 flex items-center justify-center gap-1.5"
                              >
                                <span>🔒</span>
                                <span>Hết Tim</span>
                              </button>
                            )}
                          </div>
                          <p className="text-[10.5px] text-amber-200/90 italic pt-0.5">
                            * Bạn cũng có thể bấm trực tiếp vào 1 trong 2 cánh cửa đang sáng (#{(oneShotState?.selectedDoorIds || []).join(", #")}) bên dưới để Mở Liều!
                          </p>
                        </>
                      ) : (
                        /* ĐÈN ĐỎ (RED) - Cả 2 cửa đều tiêu cực */
                        <>
                          <p className="text-[11px] sm:text-xs text-rose-200 font-bold max-w-md mx-auto leading-relaxed">
                            ⚠️ Đèn Đỏ: Cả 2 cửa đều là Bẫy & Bom (100% Tiêu cực)! BẮT BUỘC ĐỔI CỬA sang 1 trong 6 cửa đã loại hoặc RÚT LUI AN TOÀN!
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {/* Rút lui an toàn */}
                            {hasHeartsToSafelyExit ? (
                              <button
                                type="button"
                                onClick={() => onDoorsDecision?.({ decision: "SAFE_EXIT" })}
                                disabled={!canInteract}
                                className="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider shadow-lg border border-emerald-400 active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                <span>🛡️</span>
                                <span>Rút Lui (+{Math.round((baseQuestionPoints || 10) * 0.5)}đ, -1 ❤️)</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled
                                className="px-3 py-2 rounded-xl bg-stone-800 text-stone-400 font-bold text-xs uppercase border border-stone-700 cursor-not-allowed opacity-60 flex items-center justify-center gap-1.5"
                              >
                                <span>🔒</span>
                                <span>Hết Tim - Bắt Buộc Đổi Cửa</span>
                              </button>
                            )}

                            {/* Đổi 1 cửa */}
                            <button
                              type="button"
                              onClick={() => setSwapStep("SELECT_REMOVE")}
                              disabled={!canInteract || Boolean(oneShotState?.hasSwapped)}
                              className={`px-3 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black text-xs uppercase tracking-wider shadow-lg border border-amber-400 active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5 ${
                                oneShotState?.hasSwapped ? "opacity-50 cursor-not-allowed" : "animate-pulse"
                              }`}
                            >
                              <span>🔄</span>
                              <span>{oneShotState?.hasSwapped ? "Đã Đổi Cửa" : "Bắt Buộc Đổi 1 Cửa"}</span>
                            </button>
                          </div>
                        </>
                      )
                    ) : swapStep === "SELECT_REMOVE" ? (
                      <div className="p-2.5 rounded-xl bg-black/60 border border-amber-400/50 space-y-2">
                        <p className="text-xs text-amber-200 font-bold animate-pulse">
                          👉 BƯỚC 1: Bấm vào 1 trong 2 cánh cửa bạn đã chọn (#{(oneShotState?.selectedDoorIds || []).join(", #")}) bên dưới để BỎ RA.
                        </p>
                        <button
                          type="button"
                          onClick={() => setSwapStep("IDLE")}
                          className="px-3 py-1 rounded-lg bg-stone-800 text-stone-300 hover:text-white text-[11px] font-bold border border-white/20 transition cursor-pointer"
                        >
                          Hủy đổi cửa
                        </button>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-black/60 border border-cyan-400/50 space-y-2">
                        <p className="text-xs text-cyan-200 font-bold animate-pulse">
                          👉 BƯỚC 2: Bấm vào 1 trong các cánh cửa đã bị loại (#{(oneShotState?.discardedDoorIds || []).join(", #")}) bên dưới để THAY VÀO (thay thế Cửa #{swapRemovedId}).
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setSwapStep("SELECT_REMOVE");
                            setSwapRemovedId(null);
                          }}
                          className="px-3 py-1 rounded-lg bg-stone-800 text-stone-300 hover:text-white text-[11px] font-bold border border-white/20 transition cursor-pointer"
                        >
                          Chọn lại cửa bỏ
                        </button>
                      </div>
                    )}
                  </div>
                );
              }

              if (osPhase === "OPEN_FINAL") {
                const isForcedFromGreen = Boolean(oneShotState?.swappedFromGreen && oneShotState?.forcedOpenDoorId);
                return (
                  <div className={`mb-3 p-3 sm:p-4 rounded-2xl bg-gradient-to-b shadow-2xl text-center space-y-1.5 animate-bounce-in max-w-xl mx-auto border-2 ${
                    isForcedFromGreen
                      ? "from-amber-950/95 via-red-950/90 to-black/95 border-amber-400"
                      : "from-amber-950/95 via-yellow-950/90 to-black/95 border-yellow-400"
                  }`}>
                    <div className="text-2xl animate-pulse">{isForcedFromGreen ? "🎲🚪" : "🚪✨"}</div>
                    <h4 className="text-xs sm:text-sm font-black text-yellow-300 uppercase tracking-wider">
                      {isForcedFromGreen ? `MỞ CỬA BẮT BUỘC #${oneShotState?.forcedOpenDoorId}` : "MỞ CÁNH CỬA QUYẾT ĐỊNH!"}
                    </h4>
                    {isForcedFromGreen ? (
                      <p className="text-[11px] text-amber-200 font-semibold max-w-md mx-auto leading-relaxed">
                        Đội bạn đã đổi cửa từ Đèn Xanh: Cửa mới không được báo trước bẫy và bạn <strong className="text-yellow-300 underline">BUỘC PHẢI MỞ CHÍNH CỬA VỪA ĐỔI #{oneShotState?.forcedOpenDoorId}</strong> (cửa an toàn cũ đã bị khóa lại)!
                      </p>
                    ) : (
                      <p className="text-[11px] text-white/90 max-w-md mx-auto">
                        Hãy bấm trực tiếp vào <strong className="text-yellow-300 underline">1 trong các cánh cửa đang sáng</strong> (#{(oneShotState?.selectedDoorIds || []).join(", #")}) bên dưới để mở và khám phá kết quả!
                      </p>
                    )}
                  </div>
                );
              }

              return null;
            })()}

            {/* Global SVG ClipPath for realistic door shape: arched top, pointed shield bottom */}
            <DoorClipPathDefinition />

            <div className="grid grid-cols-4 gap-2 sm:gap-3.5 max-w-2xl sm:max-w-3xl md:max-w-4xl mx-auto py-2">
              {tiles.map((tile) => {
                const effectiveSelectedDoorIds = hasLocalDoorActionRef.current
                  ? optimisticSelectedDoorIds
                  : (oneShotState?.selectedDoorIds || optimisticSelectedDoorIds);
                const isSelected = Boolean(effectiveSelectedDoorIds.includes(tile.id));
                const isDiscarded = Boolean((oneShotState?.discardedDoorIds || []).includes(tile.id));
                const osPhase = oneShotState?.phase;
                const isChosenFinal = oneShotState?.chosenFinalDoorId === tile.id;
                const isBomb = tile.type !== "REWARD" && tile.type !== "ESCAPE_SAFE";
                const isSteal = tile.effectType === "STEAL_POINTS";
                const isEscapeSafe = tile.type === "ESCAPE_SAFE" || tile.effectType === "ESCAPE_SAFE";
                const isStage2 = osPhase === "STAGE_2_PICK" || osPhase === "SELECT_2" || osPhase === "OPEN_FINAL";
                const isPenaltyDecision = osPhase === "FINAL_DECISION" || osPhase === "PENALTY_DECISION";

                const isCardOpened = tile.isOpened || ((osPhase === "STAGE_2_PICK" || isPenaltySurvivalMode) && optimisticOpenedIds.has(tile.id));

                const handleDoorClick = () => {
                  if (!canInteract || tile.isOpened) return;

                  if (isPenaltySurvivalMode) {
                    if (osPhase === "SELECT_4" || osPhase === "SELECTING" || !osPhase) {
                      handleTileClick(tile);
                      return;
                    }
                    if (osPhase === "STAGE_2_PICK") {
                      if (isSelected) {
                        handleTileClick(tile);
                      }
                      return;
                    }
                    return;
                  }

                  // Normal Mode
                  if (osPhase === "SELECT_4" || osPhase === "SELECTING" || !osPhase) {
                    if (tile.isPeeked) return;
                    handleTileClick(tile);
                    return;
                  }

                  if (osPhase === "SELECT_2") {
                    if (!isDiscarded) {
                      handleTileClick(tile);
                    }
                    return;
                  }

                  if (osPhase === "FINAL_DECISION") {
                    if (swapStep === "SELECT_REMOVE") {
                      if (isSelected) {
                        setSwapRemovedId(tile.id);
                        setSwapStep("SELECT_ADD");
                      }
                      return;
                    }
                    if (swapStep === "SELECT_ADD") {
                      if (isDiscarded && swapRemovedId) {
                        onDoorsDecision?.({
                          decision: "SWAP_DOOR",
                          swapRemovedDoorId: swapRemovedId,
                          swapAddedDoorId: tile.id,
                        });
                        setSwapStep("IDLE");
                        setSwapRemovedId(null);
                      }
                      return;
                    }
                    // Green or Yellow light: open directly
                    if (swapStep === "IDLE" && (oneShotState?.radarLight === "GREEN" || oneShotState?.radarLight === "YELLOW") && isSelected) {
                      handleTileClick(tile);
                      return;
                    }
                    return;
                  }

                  if (osPhase === "OPEN_FINAL") {
                    if (oneShotState?.forcedOpenDoorId) {
                      if (tile.id === oneShotState.forcedOpenDoorId) {
                        handleTileClick(tile);
                      }
                      return;
                    }
                    if (isSelected) {
                      handleTileClick(tile);
                    }
                    return;
                  }
                };

                if (!isCardOpened) {
                  return (
                    <button
                      key={tile.id}
                      type="button"
                      onClick={handleDoorClick}
                      disabled={
                        !canInteract ||
                        (isPenaltySurvivalMode && osPhase === "STAGE_2_PICK" && !isSelected) ||
                        (!isPenaltySurvivalMode && (
                          (osPhase === "SELECT_2" && isDiscarded) ||
                          (osPhase === "STAGE_1_DECISION") ||
                          (osPhase === "FINAL_DECISION" && swapStep === "IDLE" && oneShotState?.radarLight !== "GREEN" && oneShotState?.radarLight !== "YELLOW") ||
                          (osPhase === "FINAL_DECISION" && swapStep === "SELECT_REMOVE" && !isSelected) ||
                          (osPhase === "FINAL_DECISION" && swapStep === "SELECT_ADD" && (!isDiscarded || tile.isPeeked)) ||
                          (osPhase === "OPEN_FINAL" && (!isSelected || (Boolean(oneShotState?.forcedOpenDoorId) && tile.id !== oneShotState?.forcedOpenDoorId))) ||
                          (osPhase === "SELECT_4" && tile.isPeeked)
                        ))
                      }
                      style={{ clipPath: "url(#realisticDoorClip)" }}
                      className={`relative aspect-[3/4] max-h-[17vh] sm:max-h-[21vh] p-1 sm:p-2 flex flex-col items-center justify-between transition-all duration-300 overflow-hidden ${
                        isPenaltySurvivalMode
                          ? osPhase === "STAGE_2_PICK"
                            ? isSelected
                              ? "scale-105 shadow-[0_0_35px_rgba(239,68,68,0.8)] cursor-pointer animate-pulse hover:scale-108 ring-2 ring-rose-400"
                              : "opacity-25 grayscale-80 scale-95 pointer-events-none cursor-not-allowed"
                            : isSelected
                            ? "scale-102 shadow-xl ring-2 ring-rose-400 cursor-pointer"
                            : canInteract
                            ? "hover:scale-105 shadow-xl hover:shadow-rose-600/50 cursor-pointer group ring-1 ring-rose-500/40"
                            : "opacity-60 cursor-default"
                          : osPhase === "SELECT_2"
                          ? isDiscarded
                            ? "opacity-25 grayscale-80 scale-95 pointer-events-none cursor-not-allowed"
                            : isSelected
                            ? "scale-105 shadow-[0_0_30px_rgba(250,204,21,0.8)] ring-2 ring-yellow-400 cursor-pointer animate-pulse"
                            : "hover:scale-103 shadow-lg hover:shadow-yellow-500/50 cursor-pointer ring-1 ring-yellow-400/50"
                          : osPhase === "FINAL_DECISION"
                          ? swapStep === "SELECT_REMOVE"
                            ? isSelected
                              ? "scale-105 shadow-[0_0_25px_rgba(239,68,68,0.8)] ring-2 ring-red-400 cursor-pointer animate-pulse hover:scale-108"
                              : "opacity-35 pointer-events-none cursor-not-allowed"
                            : swapStep === "SELECT_ADD"
                            ? tile.id === swapRemovedId
                              ? "opacity-40 ring-1 ring-red-400 grayscale cursor-not-allowed"
                              : isDiscarded && !tile.isPeeked
                              ? "scale-105 shadow-[0_0_25px_rgba(16,185,129,0.8)] ring-2 ring-emerald-400 cursor-pointer animate-pulse hover:scale-108"
                              : "opacity-35 pointer-events-none cursor-not-allowed"
                            : isSelected && (oneShotState?.radarLight === "GREEN" || oneShotState?.radarLight === "YELLOW")
                            ? `scale-105 shadow-[0_0_30px_${oneShotState?.radarLight === "GREEN" ? "rgba(16,185,129,0.8)" : "rgba(245,158,11,0.8)"}] ring-2 ${oneShotState?.radarLight === "GREEN" ? "ring-emerald-400" : "ring-amber-400"} cursor-pointer animate-pulse`
                            : isSelected
                            ? "scale-102 shadow-xl ring-2 ring-rose-500 cursor-default"
                            : isDiscarded
                            ? "opacity-30 grayscale cursor-not-allowed"
                            : "opacity-60 cursor-default"
                          : osPhase === "OPEN_FINAL"
                          ? oneShotState?.forcedOpenDoorId
                            ? tile.id === oneShotState.forcedOpenDoorId
                              ? "scale-105 shadow-[0_0_35px_rgba(250,204,21,0.8)] cursor-pointer animate-pulse hover:scale-108 ring-2 ring-amber-400"
                              : isSelected
                              ? "opacity-30 grayscale cursor-not-allowed pointer-events-none scale-95 ring-1 ring-stone-600"
                              : "opacity-25 grayscale-80 scale-95 pointer-events-none cursor-not-allowed"
                            : isSelected
                            ? "scale-105 shadow-[0_0_35px_rgba(250,204,21,0.8)] cursor-pointer animate-pulse hover:scale-108 ring-2 ring-yellow-400"
                            : "opacity-25 grayscale-80 scale-95 pointer-events-none cursor-not-allowed"
                          : isSelected
                          ? "scale-102 shadow-xl ring-2 ring-amber-400 cursor-pointer"
                          : isDiscarded
                          ? "opacity-30 grayscale cursor-not-allowed"
                          : tile.isPeeked
                          ? "scale-98 opacity-90 ring-2 ring-cyan-400 cursor-not-allowed"
                          : canInteract
                          ? "hover:scale-103 shadow-lg hover:shadow-amber-500/50 cursor-pointer group"
                          : "opacity-60 cursor-default"
                      }`}
                    >
                      {/* Realistic Arched Door Artwork SVG */}
                      <RealisticDoorArtwork
                        doorNumber={tile.id}
                        isSelected={isSelected}
                        isStage2={osPhase === "STAGE_2_PICK" || osPhase === "SELECT_2" || osPhase === "OPEN_FINAL"}
                        isPeeked={tile.isPeeked}
                        isOpened={false}
                        canInteract={canInteract}
                        hasBombDetected={oneShotState?.hasBombDetected}
                      />

                      {/* Overlay Header: Door # and Peek Badge */}
                      <div className="w-full flex items-center justify-between z-10 px-1 sm:px-2 pt-1 sm:pt-2">
                        <span className="w-4.5 h-4.5 sm:w-5.5 sm:h-5.5 rounded-full bg-black/85 border border-amber-400 text-[8.5px] sm:text-[10.5px] font-black text-amber-200 flex items-center justify-center font-mono shadow-md shrink-0">
                          #{tile.id}
                        </span>
                        {tile.isPeeked && (
                          <span className="text-[7.5px] sm:text-[9.5px] font-black text-cyan-200 px-1.5 py-0.5 rounded-full bg-cyan-950/95 border border-cyan-400 animate-pulse shadow-md flex items-center gap-0.5 whitespace-nowrap">
                            <span>👁️</span>
                            <span>KHÓA BẪY</span>
                          </span>
                        )}
                        {!tile.isPeeked && (
                          <>
                            {isPenaltySurvivalMode ? (
                              osPhase === "STAGE_2_PICK" ? (
                                isSelected ? (
                                  <span className="text-[7.5px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full bg-yellow-400 text-black animate-pulse shadow whitespace-nowrap">
                                    MỞ ✨
                                  </span>
                                ) : (
                                  <span className="text-[7px] sm:text-[9px] font-black px-1.5 sm:px-2 py-0.5 rounded-full bg-stone-800 text-stone-400 whitespace-nowrap">
                                    LOẠI ❌
                                  </span>
                                )
                              ) : isSelected ? (
                                <span className="text-[7.5px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full bg-rose-500 text-white font-extrabold shadow whitespace-nowrap">
                                  CHỌN 📦
                                </span>
                              ) : null
                            ) : osPhase === "OPEN_FINAL" ? (
                              oneShotState?.forcedOpenDoorId ? (
                                tile.id === oneShotState.forcedOpenDoorId ? (
                                  <span className="text-[7.5px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-black animate-pulse shadow whitespace-nowrap">
                                    BẮT BUỘC MỞ 🚪
                                  </span>
                                ) : isSelected ? (
                                  <span className="text-[7px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-full bg-stone-700 text-stone-300 border border-stone-500 whitespace-nowrap">
                                    CỬA CŨ (KHÓA) 🔒
                                  </span>
                                ) : (
                                  <span className="text-[7px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-full bg-stone-800 text-stone-400 whitespace-nowrap">
                                    LOẠI ❌
                                  </span>
                                )
                              ) : isSelected ? (
                                <span className="text-[7.5px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full bg-yellow-400 text-black animate-pulse shadow whitespace-nowrap">
                                  MỞ ✨
                                </span>
                              ) : (
                                <span className="text-[7px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-full bg-stone-800 text-stone-400 whitespace-nowrap">
                                  LOẠI ❌
                                </span>
                              )
                            ) : (osPhase === "FINAL_DECISION" && (oneShotState?.radarLight === "GREEN" || oneShotState?.radarLight === "YELLOW")) ? (
                              isSelected ? (
                                <span className={`text-[7.5px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full ${
                                  oneShotState?.radarLight === "YELLOW" ? "bg-amber-400 text-black" : "bg-yellow-400 text-black"
                                } animate-pulse shadow whitespace-nowrap`}>
                                  {oneShotState?.radarLight === "YELLOW" ? "MỞ 🎲" : "MỞ ✨"}
                                </span>
                              ) : (
                                <span className="text-[7px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-full bg-stone-800 text-stone-400 whitespace-nowrap">
                                  LOẠI ❌
                                </span>
                              )
                            ) : osPhase === "FINAL_DECISION" ? (
                              swapStep === "SELECT_REMOVE" ? (
                                isSelected ? (
                                  <span className="text-[7px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-full bg-red-600 text-white animate-pulse shadow whitespace-nowrap">
                                    BỎ ❌
                                  </span>
                                ) : null
                              ) : swapStep === "SELECT_ADD" ? (
                                tile.id === swapRemovedId ? (
                                  <span className="text-[7px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-full bg-stone-700 text-stone-300 whitespace-nowrap">
                                    BỎ RA 📤
                                  </span>
                                ) : isDiscarded && !tile.isPeeked ? (
                                  <span className="text-[7px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500 text-black font-extrabold animate-pulse shadow whitespace-nowrap">
                                    THAY ➕
                                  </span>
                                ) : null
                              ) : isSelected ? (
                                <span className="text-[7.5px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500 text-black font-extrabold shadow whitespace-nowrap">
                                  #{tile.id} 📦
                                </span>
                              ) : isDiscarded ? (
                                <span className="text-[7px] sm:text-[8.5px] font-black px-1.5 py-0.5 rounded-full bg-stone-800/80 text-stone-400 whitespace-nowrap">
                                  BỎ
                                </span>
                              ) : null
                            ) : isSelected ? (
                              <span className="text-[7.5px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500 text-black font-extrabold shadow whitespace-nowrap">
                                ĐÃ CHỌN 📦
                              </span>
                            ) : isDiscarded ? (
                              <span className="text-[7px] sm:text-[8.5px] font-black px-1.5 py-0.5 rounded-full bg-stone-800/80 text-stone-400 whitespace-nowrap">
                                LOẠI
                              </span>
                            ) : canInteract ? (
                              <span className="text-[7.5px] sm:text-[9.5px] font-black text-yellow-300 animate-pulse whitespace-nowrap">
                                CHỌN ✨
                              </span>
                            ) : null}
                          </>
                        )}
                      </div>

                      {/* Middle Center Emblem / Peek Indicator */}
                      <div className="z-10 my-auto text-center flex flex-col items-center">
                        {tile.isPeeked ? (
                          <div className="text-xl sm:text-3xl animate-bounce drop-shadow-md">
                            ⚠️
                          </div>
                        ) : (
                          <div className={`text-xl sm:text-3xl transition-transform duration-300 drop-shadow-md ${
                            isStage2 && isSelected && (!oneShotState?.forcedOpenDoorId || tile.id === oneShotState.forcedOpenDoorId) ? "scale-110 animate-pulse text-amber-300" : "group-hover:scale-110"
                          }`}>
                            {isStage2 && isSelected ? (oneShotState?.forcedOpenDoorId && tile.id !== oneShotState.forcedOpenDoorId ? "🔒" : "🗝️✨") : "🔒"}
                          </div>
                        )}
                        {tile.isPeeked && (
                          <span className="text-[7px] sm:text-[9px] font-black uppercase text-cyan-200 whitespace-nowrap block px-1 py-0.5 bg-black/75 rounded border border-cyan-400/60 mt-0.5">
                            BẪY TRỪ GỐC
                          </span>
                        )}
                      </div>

                      {/* Bottom Footer: Label and State */}
                      <div className="w-full text-center pb-1.5 sm:pb-2.5 z-10 px-1">
                        <span className="text-[9.5px] sm:text-[12px] font-black text-white block drop-shadow-md truncate">
                          {tile.label}
                        </span>
                        <span className="text-[7px] sm:text-[9px] uppercase tracking-wider text-amber-300 font-extrabold block drop-shadow-sm truncate">
                          {isStage2
                            ? isSelected
                              ? oneShotState?.forcedOpenDoorId && tile.id !== oneShotState.forcedOpenDoorId
                                ? "Cửa cũ · Đã khóa"
                                : "Đang sáng · Mở!"
                              : "Đã bị loại"
                            : isPenaltyDecision
                            ? swapStep === "SELECT_REMOVE"
                              ? isSelected
                                ? "Bấm để bỏ"
                                : "Không đổi"
                              : swapStep === "SELECT_ADD"
                              ? tile.id === swapRemovedId
                                ? "Đã bỏ ra"
                                : !isSelected && !tile.isPeeked
                                ? "Bấm thay vào"
                                : "Khóa"
                              : isSelected
                              ? "Đã chọn"
                              : "Chưa chọn"
                            : isSelected
                            ? "Đã để ra riêng"
                            : tile.isPeeked
                            ? "Mắt thần khóa"
                            : "Cửa Bí Ẩn"}
                        </span>
                      </div>
                    </button>
                  );
                }

                // Revealed Door (Tròn ở trên, nhọn ở dưới)
                return (
                  <div
                    key={tile.id}
                    style={{ clipPath: "url(#realisticDoorClip)" }}
                    className={`relative aspect-[3/4] max-h-[17vh] sm:max-h-[21vh] p-1 sm:p-2 flex flex-col items-center justify-between shadow-2xl transition-all duration-300 overflow-hidden ${
                      isChosenFinal ? "scale-104 z-10 ring-4 ring-yellow-400" : isSelected ? "opacity-90 ring-2 ring-white/30" : "opacity-70"
                    }`}
                  >
                    {/* Realistic Arched Door Artwork SVG with Opened status */}
                    <RealisticDoorArtwork
                      doorNumber={tile.id}
                      isSelected={isSelected}
                      isStage2={isStage2}
                      isOpened={true}
                      isBomb={isBomb}
                      isSteal={isSteal}
                      isChosenFinal={isChosenFinal}
                    />

                    {/* Overlay Header: Door # and Result Badge */}
                    <div className="w-full flex items-center justify-between z-10 px-1 sm:px-2 pt-1 sm:pt-2">
                      <span className="w-4.5 h-4.5 sm:w-5.5 sm:h-5.5 rounded-full bg-black/85 border border-white/40 text-[8.5px] sm:text-[10.5px] font-mono font-bold text-white flex items-center justify-center shadow-md shrink-0">
                        #{tile.id}
                      </span>
                      <span
                        className={`text-[7.5px] sm:text-[10px] font-black uppercase px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap shadow-md ${
                          isEscapeSafe
                            ? "bg-emerald-400 text-black font-extrabold ring-1 ring-white"
                            : isChosenFinal
                            ? isSteal
                              ? "bg-rose-500 text-white font-extrabold ring-1 ring-white"
                              : isBomb
                              ? "bg-red-500 text-white font-extrabold ring-1 ring-white"
                              : "bg-yellow-400 text-black font-extrabold ring-1 ring-white"
                            : isSelected
                            ? "bg-stone-700 text-stone-200"
                            : isBomb
                            ? "bg-red-500/50 text-red-200 border border-red-500/60"
                            : isSteal
                            ? "bg-rose-500/50 text-rose-200 border border-rose-500/60"
                            : "bg-emerald-500/50 text-emerald-200 border border-emerald-500/60"
                        }`}
                      >
                        {isEscapeSafe
                          ? "THOÁT HIỂM 🕊️"
                          : isChosenFinal
                          ? isSteal
                            ? "CƯỚP 🗡️"
                            : isBomb
                            ? "BOM 💥"
                            : "MỞ ⭐"
                          : isSelected
                          ? "ĐỂ RIÊNG 📦"
                          : isBomb
                          ? "BOM (LOẠI) 💥"
                          : isSteal
                          ? "CƯỚP (LOẠI) 🗡️"
                          : "THƯỞNG (LOẠI) ⭐"}
                      </span>
                    </div>

                    {/* Prize Icon */}
                    <div className="my-auto text-center drop-shadow-2xl z-10 animate-scale-in flex items-center justify-center">
                      <MinigameSvgIcon
                        nameOrEmoji={isEscapeSafe ? "🕊️" : isBomb ? "💥" : tile.icon || "👑"}
                        className="w-7 h-7 sm:w-10 sm:h-10"
                      />
                    </div>

                    {/* Bottom: Story title and Points delta */}
                    <div className="w-full text-center pb-1.5 sm:pb-2.5 z-10 px-1">
                      <p className="text-[9px] sm:text-[11px] font-black text-white leading-tight truncate drop-shadow-md">
                        {tile.storyTitle}
                      </p>
                      <p
                        className={`text-[10px] sm:text-[12px] font-black font-mono mt-0.5 drop-shadow-md ${
                          isEscapeSafe ? "text-emerald-300 font-bold" : isBomb ? "text-red-400" : isSteal ? "text-rose-300" : "text-amber-300"
                        }`}
                      >
                        {isEscapeSafe
                          ? "0đ (Bảo Toàn Điểm)"
                          : isBomb
                          ? (tile.type === "BOMB_SMOKE" || tile.pairKey === "PAIR_TRAP" || tile.deltaPoints === 0)
                            ? "0đ (Mất câu)"
                            : `-${Math.abs(tile.deltaPoints || baseQuestionPoints || 10)}đ`
                          : isSteal
                          ? `Cướp +${tile.deltaPoints}đ`
                          : `+${tile.deltaPoints}đ`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            2. VARIANT: BÀI TAROT (Định Mệnh Chọn Lá - 5 Thực Thể Cổ Xưa)
        ════════════════════════════════════════════════════════════════════ */}
        {(miniGameType === "TAROT_DESTINY" || miniGameType === "TAROT_CARDS") && (() => {
          const isGambleWaiting = Boolean(tarotState?.isGamblingWaitingSpin || isLocalGambleArming);
          const isDrawn = Boolean(
            phase === "TURN_SUMMARY" ||
            tarotFlyPhase === "FLYING" ||
            tarotFlyPhase === "ATTACHED" ||
            tarotFlyPhase === "REVEALED" ||
            (tarotState?.isDrawn &&
              tarotState?.drawnCard &&
              !tarotState?.isWheelSpinning &&
              !isWheelSpinningOptimistic &&
              !isGambleWaiting &&
              tarotFlyPhase !== "STOPPED")
          );
          const drawnCard = tarotState?.drawnCard;

          // Color & Glow scheme for the 22 Major Arcana Entities
          const getEntityVisuals = (cardKey?: string) => {
            if (drawnCard && drawnCard.scoreDelta < 0) {
              return {
                gradient: "from-rose-950/50 via-red-950/40 to-black/95",
                border: "border-rose-500",
                glow: "rgba(244, 63, 94, 0.6)",
                tagColor: "bg-red-500/20 text-red-300 border-red-500/40",
                textColor: "text-rose-400",
              };
            }
            switch (cardKey) {
              case "THE_PEACE":
                return {
                  gradient: "from-emerald-950/40 via-teal-900/30 to-black/90",
                  border: "border-emerald-400",
                  glow: "rgba(52, 211, 153, 0.5)",
                  tagColor: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40",
                  textColor: "text-emerald-300",
                };
              case "THE_SUN":
              case "THE_WORLD":
              case "THE_LOVERS":
              case "TEMPERANCE":
                return {
                  gradient: "from-amber-600/30 via-yellow-500/20 to-amber-950/80",
                  border: "border-amber-400",
                  glow: "rgba(251, 191, 36, 0.65)",
                  tagColor: "bg-amber-500/20 text-amber-300 border-amber-400/40",
                  textColor: "text-amber-300",
                };
              case "THE_STAR":
              case "THE_MOON":
                return {
                  gradient: "from-fuchsia-950/40 via-purple-900/30 to-black/90",
                  border: "border-fuchsia-400",
                  glow: "rgba(232, 121, 249, 0.6)",
                  tagColor: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-400/40",
                  textColor: "text-fuchsia-300",
                };
              case "WHEEL_OF_FORTUNE":
                return {
                  gradient: "from-teal-950/40 via-cyan-900/30 to-black/90",
                  border: "border-cyan-400",
                  glow: "rgba(6, 182, 212, 0.6)",
                  tagColor: "bg-cyan-500/20 text-cyan-300 border-cyan-400/40",
                  textColor: "text-cyan-300",
                };
              case "THE_EMPRESS":
              case "THE_EMPEROR":
              case "STRENGTH":
              case "JUDGEMENT":
                return {
                  gradient: "from-blue-950/40 via-sky-900/30 to-black/90",
                  border: "border-sky-400",
                  glow: "rgba(56, 189, 248, 0.6)",
                  tagColor: "bg-sky-500/20 text-sky-300 border-sky-400/40",
                  textColor: "text-sky-300",
                };
              case "THE_FOOL":
                return {
                  gradient: "from-purple-950/40 via-violet-900/30 to-black/90",
                  border: "border-purple-500",
                  glow: "rgba(168, 85, 247, 0.5)",
                  tagColor: "bg-purple-500/20 text-purple-300 border-purple-400/40",
                  textColor: "text-purple-300",
                };
              case "JUSTICE":
                return {
                  gradient: "from-amber-950/40 via-yellow-900/30 to-black/90",
                  border: "border-amber-400",
                  glow: "rgba(251, 191, 36, 0.6)",
                  tagColor: "bg-amber-500/20 text-amber-300 border-amber-400/40",
                  textColor: "text-amber-300",
                };
              case "THE_CHARIOT":
              case "THE_DEATH":
              case "DEATH":
                return {
                  gradient: "from-indigo-950/45 via-purple-950/35 to-black/90",
                  border: "border-indigo-400",
                  glow: "rgba(99, 102, 241, 0.6)",
                  tagColor: "bg-indigo-500/20 text-indigo-300 border-indigo-400/40",
                  textColor: "text-indigo-300",
                };
              case "THE_DEVIL":
              case "THE_TOWER":
              case "THE_HANGED_MAN":
              case "THE_KNIGHT":
                return {
                  gradient: "from-rose-950/50 via-red-950/40 to-black/95",
                  border: "border-rose-500",
                  glow: "rgba(244, 63, 94, 0.6)",
                  tagColor: "bg-red-500/20 text-red-300 border-red-500/40",
                  textColor: "text-rose-400",
                };
              default:
                return {
                  gradient: "from-amber-950/30 via-yellow-900/20 to-black/90",
                  border: "border-amber-400",
                  glow: "rgba(245, 158, 11, 0.5)",
                  tagColor: "bg-amber-500/20 text-amber-300 border-amber-400/40",
                  textColor: "text-amber-300",
                };
            }
          };

          const cardVisual = getEntityVisuals(drawnCard?.key);
          const isPendingReveal = Boolean(tarotState?.isRevealPending && phase !== "TURN_SUMMARY" && tarotFlyPhase !== "REVEALED");
          const canActOnTarot = Boolean(isMyTurn || isAdmin);

          return (
            <div className={`w-full ${isDisplay ? "max-w-3xl" : "max-w-2xl"} mx-auto py-1.5`}>
              <style>{`
                @keyframes tarotFlyForward360 {
                  0% {
                    top: 20%;
                    left: 50%;
                    transform: translate(-50%, -50%) scale(0.7) rotate(0deg);
                    opacity: 0;
                    filter: drop-shadow(0 0 10px rgba(251, 191, 36, 0.7));
                  }
                  20% {
                    opacity: 1;
                  }
                  50% {
                    top: 36%;
                    left: 50%;
                    transform: translate(-50%, -50%) scale(2.2) rotate(180deg);
                    filter: drop-shadow(0 0 40px rgba(251, 191, 36, 1)) drop-shadow(0 0 60px rgba(168, 85, 247, 0.95));
                  }
                  85% {
                    top: 48%;
                    left: 50%;
                    transform: translate(-50%, -50%) scale(1.15) rotate(340deg);
                    opacity: 1;
                  }
                  100% {
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%) scale(1.0) rotate(360deg);
                    opacity: 1;
                    filter: drop-shadow(0 0 35px rgba(251, 191, 36, 1));
                  }
                }
                @keyframes tarotSealImpactPulse {
                  0% {
                    transform: scale(0.6);
                    opacity: 1;
                  }
                  100% {
                    transform: scale(2.4);
                    opacity: 0;
                  }
                }
                @keyframes tarotSealGlow {
                  0%, 100% {
                    transform: scale(1.0);
                    filter: drop-shadow(0 0 15px rgba(251, 191, 36, 0.7));
                  }
                  50% {
                    transform: scale(1.06);
                    filter: drop-shadow(0 0 35px rgba(251, 191, 36, 1)) drop-shadow(0 0 50px rgba(168, 85, 247, 0.9));
                  }
                }
                @keyframes tarotCardFlyOutFrom12h {
                  0% {
                    transform: translateY(-40%) scale(0.18) rotate(-6deg);
                    opacity: 0;
                    filter: drop-shadow(0 0 15px rgba(251, 191, 36, 0.9));
                  }
                  15% {
                    opacity: 1;
                  }
                  75% {
                    transform: translateY(0%) scale(1.05) rotate(1deg);
                  }
                  100% {
                    transform: translateY(0%) scale(1.0) rotate(0deg);
                    opacity: 1;
                    filter: drop-shadow(0 0 35px rgba(251, 191, 36, 0.8)) drop-shadow(0 0 50px rgba(168, 85, 247, 0.6));
                  }
                }
              `}</style>
              {!isDrawn ? (
                /* ── Trạng thái CHƯA RÚT / ĐANG QUAY: Vòng Quay Tarot 3D Chiếc Nón Kỳ Diệu ── */
                <div className={`flex flex-col items-center justify-center ${isDisplay ? "p-3 sm:p-5 space-y-2.5" : "p-4 sm:p-6 space-y-3"} rounded-3xl bg-gradient-to-b from-[#06040d]/95 via-[#0d081d]/95 to-[#040308]/98 border-2 border-purple-500/40 shadow-[0_0_55px_rgba(88,28,135,0.45)] relative overflow-hidden group`}>
                  {/* Mystical Starfield & Astral Nebula Aura */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(139,92,246,0.22),rgba(15,10,35,0.6)_55%,transparent_80%)] pointer-events-none" />
                  <div className="absolute inset-0 opacity-35 pointer-events-none" style={{ backgroundImage: "radial-gradient(#fde68a 0.75px, transparent 0.75px), radial-gradient(#e0e7ff 0.6px, transparent 0.6px)", backgroundSize: "36px 36px, 24px 24px", backgroundPosition: "0 0, 14px 18px" }} />

                  {/* Header Title */}
                  {(() => {
                    const hasSunMagnet = !isPenaltySurvivalMode && getPerkType(promoPerk) === "SUN_MAGNET_PROMO";
                    const isGambleRound = Boolean(tarotState?.isGambling || tarotState?.isGamblingWaitingSpin || isLocalGambleArming);
                    return (
                      <div className="text-center z-10 space-y-0.5">
                        <h3 className={`${isDisplay ? "text-base sm:text-lg md:text-xl" : "text-base sm:text-lg md:text-xl"} font-black ${isGambleRound ? "text-fuchsia-300 drop-shadow-[0_0_15px_rgba(232,121,249,0.7)] animate-pulse" : "text-amber-200 drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]"} uppercase tracking-[0.18em]`}>
                          {isGambleRound
                            ? "✦ CÁNH CỔNG ĐÁNH CƯỢC: LƯỢT QUAY TIẾP THEO ✦"
                            : isPenaltySurvivalMode
                            ? "💀 VÒNG QUAY TAROT SINH TỬ"
                            : "✦ VÒNG QUAY TAROT ĐỊNH MỆNH ✦"}
                        </h3>
                        <p className="text-[11px] sm:text-xs text-purple-200/80 font-medium tracking-wider">
                          {isGambleRound
                            ? "Canh thanh lực Ping-pong (5% - 100%) và bấm Chốt Lực & Quay để săn phần thưởng lớn hơn!"
                            : isPenaltySurvivalMode
                            ? "20 Ô Sinh Tử • Phân Tách Bằng Chốt Kim Loại Bạc Crom"
                            : "22 Ô Major Arcana • Phân Tách Bằng Chốt Kim Loại Bạc Crom"}
                        </p>
                        {hasSunMagnet && !isGambleRound && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/80 text-amber-200 text-[11px] font-bold shadow-lg animate-pulse mt-1">
                            <span>☀️</span>
                            <span>Nam Châm Thái Dương: Ấn Mặt Trời đã được cường hóa (+{baseQuestionPoints || 10}đ)!</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* ── SVG 3D Tarot Wheel (Chiếc Nón Kỳ Diệu) with 12 o'clock Flipper Pointer ── */}
                  <div className={`relative aspect-square w-full ${isDisplay ? "max-w-[320px] sm:max-w-[380px] md:max-w-[430px] lg:max-w-[460px] my-1" : "max-w-[280px] sm:max-w-[330px] md:max-w-[380px] lg:max-w-[410px] my-1"} mx-auto flex items-center justify-center z-10 p-0 overflow-visible transition-all duration-700 ${tarotFlyPhase === "FLYING" ? "opacity-0 pointer-events-none scale-95" : "opacity-100"}`}>
                    {/* ── Broadcast Royal Wheel Rig: Tròn đều 100%, 3s-10s phóng to 1.65x neo đỉnh 12h (50% 0%) & đẩy 68px để trọn vẹn kim và nan quạt trúng ── */}
                    <div
                      className="w-full h-full aspect-square relative flex items-center justify-center select-none"
                      style={{
                        transformOrigin: "50% 0%",
                        transform: isWheelZoomedIn
                          ? "scale(1.65) translateY(68px)"
                          : "scale(1.0) translateY(0px)",
                        transitionProperty: "transform",
                        transitionDuration: `${wheelZoomDurationMs}ms`,
                        transitionTimingFunction: "cubic-bezier(0.25, 1, 0.4, 1)",
                        willChange: "transform",
                      }}
                    >
                    {/* Flipper Pointer Needle at 12 o'clock with Hooke's Law & Damped Harmonic Oscillation (Responsive % Sizing) */}
                    <div
                      ref={needleRef}
                      className="absolute -top-[4.2%] left-1/2 -translate-x-1/2 w-[11.4%] aspect-[44/48] z-30 pointer-events-none"
                      style={{
                        transformOrigin: "50% 22.92%",
                        transform: `rotate(${needleDeflectionDeg}deg) scale(1.06) translateZ(0)`,
                        filter: "drop-shadow(0px 4px 8px rgba(0,0,0,0.85))",
                        willChange: "transform",
                      }}
                    >
                      {/* 3D Chrome & Ruby Flipper Pointer - Scaled 100% proportionally to wheel */}
                      <svg viewBox="0 0 44 48" className="w-full h-full">
                        <defs>
                          <linearGradient id="chromeNeedleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#ffffff" />
                            <stop offset="30%" stopColor="#e2e8f0" />
                            <stop offset="60%" stopColor="#94a3b8" />
                            <stop offset="100%" stopColor="#334155" />
                          </linearGradient>
                          <linearGradient id="needleFacetLeft" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#fef08a" />
                            <stop offset="50%" stopColor="#f59e0b" />
                            <stop offset="100%" stopColor="#d97706" />
                          </linearGradient>
                          <linearGradient id="needleFacetRight" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#d97706" />
                            <stop offset="60%" stopColor="#b45309" />
                            <stop offset="100%" stopColor="#78350f" />
                          </linearGradient>
                        </defs>
                        {/* Left Beveled Facet */}
                        <path
                          d="M22 45 L11 8 Q22 13 22 8 Z"
                          fill="url(#needleFacetLeft)"
                          stroke="#fef08a"
                          strokeWidth="1.2"
                          strokeLinejoin="round"
                        />
                        {/* Right Beveled Facet (Shadowed) */}
                        <path
                          d="M22 45 L33 8 Q22 13 22 8 Z"
                          fill="url(#needleFacetRight)"
                          stroke="#b45309"
                          strokeWidth="1.2"
                          strokeLinejoin="round"
                        />
                        {/* Chrome Center Spine Rib */}
                        <path
                          d="M22 44 L22 10"
                          stroke="url(#chromeNeedleGrad)"
                          strokeWidth="2.8"
                          strokeLinecap="round"
                        />
                        {/* Pivot Mount Bolt */}
                        <circle cx="22" cy="11" r="5.5" fill="#0f172a" stroke="#fef08a" strokeWidth="1.8" />
                        <circle cx="22" cy="11" r="3.6" fill="url(#chromeNeedleGrad)" />
                        <circle cx="20.6" cy="9.6" r="1.2" fill="#ffffff" />
                      </svg>
                    </div>

                    {/* ── Stage Floor Shadow ── */}
                    <div className="absolute -inset-4 rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.95)_45%,rgba(15,8,30,0.7)_70%,transparent_85%)] blur-md pointer-events-none -z-10" />

                    {/* ── Royal Beveled Gold & Bronze Outer Frame (100% Tròn xoe chuẩn tuyệt đối, không méo squircle) ── */}
                    <div className="absolute inset-0 aspect-square rounded-full border-[10px] sm:border-[12px] border-[#d97706] shadow-[0_16px_40px_rgba(0,0,0,0.9),0_0_35px_rgba(245,158,11,0.45),inset_0_2px_4px_rgba(254,240,138,0.9),inset_0_-3px_8px_rgba(69,26,3,0.95)] pointer-events-none z-20">
                      <div className="w-full h-full rounded-full border border-amber-950/70 shadow-[inset_0_2px_6px_rgba(0,0,0,0.9)]" />
                    </div>

                    {/* Spinning Wheel */}
                    <div
                      ref={wheelRef}
                      className="w-full h-full aspect-square rounded-full overflow-hidden shadow-2xl relative"
                      style={{
                        transform: `rotate(${clientWheelAngle}deg)`,
                      }}
                    >
                      <svg viewBox="0 0 440 440" className="w-full h-full select-none">
                        <defs>
                          {/* 3D Chrome Vertical Stem Gradient */}
                          <linearGradient id="chromeStemGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#64748b" />
                            <stop offset="30%" stopColor="#f8fafc" />
                            <stop offset="60%" stopColor="#cbd5e1" />
                            <stop offset="85%" stopColor="#94a3b8" />
                            <stop offset="100%" stopColor="#334155" />
                          </linearGradient>

                          {/* 3D Chrome Collar Base Gradient */}
                          <linearGradient id="chromeCollarGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#cbd5e1" />
                            <stop offset="50%" stopColor="#64748b" />
                            <stop offset="100%" stopColor="#1e293b" />
                          </linearGradient>

                          {/* 3D Chrome Ball Cap Radial Gradient */}
                          <radialGradient id="chromeCapGrad" cx="35%" cy="30%" r="65%">
                            <stop offset="0%" stopColor="#ffffff" />
                            <stop offset="35%" stopColor="#e2e8f0" />
                            <stop offset="70%" stopColor="#64748b" />
                            <stop offset="100%" stopColor="#1e293b" />
                          </radialGradient>

                          {/* 3D Royal Gold Rim Gradient */}
                          <linearGradient id="goldRimGrad3D" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#fef08a" />
                            <stop offset="25%" stopColor="#f59e0b" />
                            <stop offset="50%" stopColor="#78350f" />
                            <stop offset="75%" stopColor="#fbbf24" />
                            <stop offset="100%" stopColor="#b45309" />
                          </linearGradient>

                          {/* Obsidian Dome Core Gradient */}
                          <radialGradient id="hubObsidianGrad" cx="45%" cy="40%" r="55%">
                            <stop offset="0%" stopColor="#312e81" />
                            <stop offset="40%" stopColor="#1e1b4b" />
                            <stop offset="80%" stopColor="#0f0720" />
                            <stop offset="100%" stopColor="#05030a" />
                          </radialGradient>

                          {/* Center Hub Outer Drop Shadow */}
                          <filter id="hubDropShadow" x="-30%" y="-30%" width="160%" height="160%">
                            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000000" floodOpacity="0.85" />
                          </filter>

                          {/* Arcana Icon Glow Filter */}
                          <filter id="arcanaSymbolGlow" x="-30%" y="-30%" width="160%" height="160%">
                            <feDropShadow dx="0" dy="0" stdDeviation="2.2" floodColor="#fde68a" floodOpacity="0.8" />
                          </filter>

                          {/* Winning Landed Slice 3D Pulsing Glow */}
                          <filter id="winningSliceGlow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#fbbf24" floodOpacity="0.95" />
                            <feDropShadow dx="0" dy="0" stdDeviation="16" floodColor="#f59e0b" floodOpacity="0.8" />
                          </filter>
                        </defs>

                        {/* 22 Segments (360/22 deg each in normal, 18 deg in survival) */}
                        {(() => {
                          const currentTurnTeam = teams?.find((t) => t.id === currentTurnTeamId);
                          const activeRiskTier = currentTurnTeam && teams
                            ? evaluateTeamRiskTier({ team: currentTurnTeam, allTeams: teams, currentRound })
                            : "NEUTRAL";
                          return getEffectiveTarotWheelSegments(
                            !isPenaltySurvivalMode && getPerkType(promoPerk) === "SUN_MAGNET_PROMO",
                            Boolean(isPenaltySurvivalMode),
                            {
                              riskTier: activeRiskTier,
                              currentRound,
                              teamScore: currentTurnTeam?.score,
                              shieldTransformedCardKey: tarotState?.shieldTransformedCardKey,
                            }
                          );
                        })().map((seg, i, arr) => {
                          const segCount = arr.length;
                          const degPerSeg = 360 / segCount;
                          const theta1 = (i * degPerSeg * Math.PI) / 180;
                          const theta2 = ((i + 1) * degPerSeg * Math.PI) / 180;
                          // Lòng vòng quay khớp sát mép trong viền vàng (r = 196)
                          const r = 196;
                          const cx = 220;
                          const cy = 220;
                          const x1 = cx + r * Math.sin(theta1);
                          const y1 = cy - r * Math.cos(theta1);
                          const x2 = cx + r * Math.sin(theta2);
                          const y2 = cy - r * Math.cos(theta2);
                          const midDeg = (i + 0.5) * degPerSeg;
                          const symbolColor = seg.isShieldTransformed ? "#6ee7b7" : seg.isMagnetized ? "#fef08a" : seg.textColor;

                          const isLandedWinner = !tarotState?.isWheelSpinning && (tarotState?.landedIndex === i || tarotState?.selectedSegmentIndex === i);
                          const displayInfo = getTarotSegmentDisplayLabel(
                            seg,
                            baseQuestionPoints || 10,
                            Boolean(isPenaltySurvivalMode)
                          );

                          // Chốt kim loại crom 3D nổi bật 100% ở rPeg = 190, không bị viền che
                          const rPeg = 190;
                          const pegX = cx + rPeg * Math.sin(theta1);
                          const pegY = cy - rPeg * Math.cos(theta1);

                          // Wedge Content Formatting:
                          const cleanLabel = displayInfo.mainLabel.trim();
                          const hasSign = cleanLabel.startsWith("+") || cleanLabel.startsWith("-");
                          const signChar = hasSign ? cleanLabel[0] : "";
                          const numericPart = hasSign ? cleanLabel.slice(1) : cleanLabel;
                          const isNumeric = /^\d+$/.test(numericPart);
                          const numericDigits = isNumeric ? numericPart.split("") : [];
                          const labelLen = cleanLabel.length;
                          const radialMainFontSize = labelLen <= 5 ? "11" : labelLen <= 9 ? "9.5" : "8";
                          const ySpokeCenter = cy - 106;

                          return (
                            <g key={seg.index}>
                              {/* Wedge Slice Path */}
                              <path
                                d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
                                fill={seg.isShieldTransformed ? "#064e3b" : seg.isMagnetized ? "#3b1d06" : isLandedWinner ? "#4c1d95" : seg.bgColor}
                                stroke={isLandedWinner ? "#fbbf24" : seg.isShieldTransformed ? "#10b981" : seg.isMagnetized ? "#fef08a" : seg.borderColor}
                                strokeWidth={isLandedWinner ? "3.5" : seg.isShieldTransformed || seg.isMagnetized ? "2.5" : "1.2"}
                                filter={isLandedWinner ? "url(#winningSliceGlow)" : undefined}
                              />

                              {/* Subtle 3D Inset Edge Highlight */}
                              <line
                                x1={cx}
                                y1={cy}
                                x2={x1}
                                y2={y1}
                                stroke="#ffffff"
                                strokeWidth="0.6"
                                strokeOpacity="0.25"
                              />

                              {/* Wedge Content (Icon & Radial Upright Stacked Digits or Single Text Line) */}
                              <g transform={`rotate(${midDeg} ${cx} ${cy})`}>
                                {/* Outer Accent Pin */}
                                <circle cx={cx} cy={cy - 182} r="1.3" fill={symbolColor} opacity="0.8" />

                                {/* Arcana Vector Line-Art Icon + Sign Badge (nếu có dấu + hoặc -) */}
                                {hasSign ? (
                                  <g>
                                    {/* Icon lệch trái một chút để nhường chỗ cho badge dấu */}
                                    <svg
                                      x={cx - 18}
                                      y={cy - 169}
                                      width="19"
                                      height="19"
                                      viewBox="0 0 32 32"
                                      filter="url(#arcanaSymbolGlow)"
                                    >
                                      {renderTarotArcanaVectorNodes(seg.key, symbolColor)}
                                    </svg>
                                    {/* Hình tròn màu sáng bọc dấu màu tối nằm ngay cạnh icon Tarot */}
                                    <circle
                                      cx={cx + 9}
                                      cy={cy - 159.5}
                                      r="6.8"
                                      fill={signChar === "+" ? "#ffffff" : "#fee2e2"}
                                      stroke="#0f172a"
                                      strokeWidth="0.8"
                                      filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.6))"
                                    />
                                    {/* Vector nét chuẩn tâm 100% không phụ thuộc font chữ */}
                                    {signChar === "+" ? (
                                      <path
                                        d={`M ${cx + 9 - 3.2} ${cy - 159.5} L ${cx + 9 + 3.2} ${cy - 159.5} M ${cx + 9} ${cy - 159.5 - 3.2} L ${cx + 9} ${cy - 159.5 + 3.2}`}
                                        stroke="#0f172a"
                                        strokeWidth="2.2"
                                        strokeLinecap="round"
                                        className="pointer-events-none"
                                      />
                                    ) : (
                                      <path
                                        d={`M ${cx + 9 - 3.2} ${cy - 159.5} L ${cx + 9 + 3.2} ${cy - 159.5}`}
                                        stroke="#0f172a"
                                        strokeWidth="2.2"
                                        strokeLinecap="round"
                                        className="pointer-events-none"
                                      />
                                    )}
                                  </g>
                                ) : (
                                  <svg
                                    x={cx - 10}
                                    y={cy - 169}
                                    width="20"
                                    height="20"
                                    viewBox="0 0 32 32"
                                    filter="url(#arcanaSymbolGlow)"
                                  >
                                    {renderTarotArcanaVectorNodes(seg.key, symbolColor)}
                                  </svg>
                                )}

                                {/* Wedge Content: Stacked Upright Digits (1 0 hoặc 1 5) or Single Rotated Text Line */}
                                {isNumeric ? (
                                  /* Các ô có số: Chữ số đứng thẳng, xếp chồng dọc từ ngoài vào rốn, cỡ chữ nhỏ gọn, không còn chứa dấu + / - */
                                  <g className="font-black select-none pointer-events-none">
                                    {numericDigits.map((ch, chIdx) => {
                                      const charStep = 16;
                                      const startY = ySpokeCenter - ((numericDigits.length - 1) * charStep) / 2;
                                      const charY = startY + chIdx * charStep;
                                      return (
                                        <text
                                          key={chIdx}
                                          x={cx}
                                          y={charY}
                                          textAnchor="middle"
                                          dominantBaseline="central"
                                          fontSize="14"
                                          fontWeight="900"
                                          fill={seg.isShieldTransformed ? "#a7f3d0" : isLandedWinner ? "#fef08a" : seg.isMagnetized ? "#fef08a" : "#ffffff"}
                                          stroke="#000000"
                                          strokeWidth="2.0"
                                          style={{ paintOrder: "stroke fill" }}
                                          className="font-black select-none pointer-events-none tracking-normal"
                                        >
                                          {ch}
                                        </text>
                                      );
                                    })}
                                  </g>
                                ) : (
                                  /* Các ô chữ (THÊM LƯỢT, MẤT LƯỢT, CƯỚP 10, MAY MẮN...): Duy nhất 1 dòng chữ in đậm xoay 90° dọc nan quạt, cỡ chữ nhỏ lại */
                                  <g transform={`rotate(90 ${cx} ${ySpokeCenter})`}>
                                    <text
                                      x={cx}
                                      y={ySpokeCenter}
                                      textAnchor="middle"
                                      fontSize={radialMainFontSize}
                                      fontWeight="900"
                                      fill={seg.isShieldTransformed ? "#a7f3d0" : isLandedWinner ? "#fef08a" : "#ffffff"}
                                      stroke="#000000"
                                      strokeWidth="2.0"
                                      style={{ paintOrder: "stroke fill" }}
                                      dominantBaseline="central"
                                      className="font-black select-none pointer-events-none tracking-tight uppercase"
                                    >
                                      {cleanLabel}
                                    </text>
                                  </g>
                                )}

                                {/* Inner Accent Dot near Hub */}
                                <circle cx={cx} cy={cy - 56} r="1.1" fill={symbolColor} opacity="0.5" />
                              </g>

                              {/* ── 3D Radial Outward Chrome Peg (Tỏa tròn chuẩn nan quạt) ── */}
                              <g transform={`rotate(${i * degPerSeg} ${pegX} ${pegY})`}>
                                {/* Cast Shadow onto Wheel Surface */}
                                <ellipse cx={pegX + 1.5} cy={pegY + 1.8} rx="3.8" ry="2" fill="#000000" opacity="0.65" />
                                {/* Peg Base Collar */}
                                <ellipse cx={pegX} cy={pegY} rx="3.6" ry="2.2" fill="url(#chromeCollarGrad)" stroke="#0f172a" strokeWidth="0.5" />
                                {/* Radial Standing Chrome Post */}
                                <rect x={pegX - 1.8} y={pegY - 8.5} width="3.6" height="8.5" rx="1.8" fill="url(#chromeStemGrad)" stroke="#1e293b" strokeWidth="0.5" />
                                {/* Spherical Chrome Ball Cap */}
                                <circle cx={pegX} cy={pegY - 8.5} r="3.6" fill="url(#chromeCapGrad)" stroke="#1e293b" strokeWidth="0.6" />
                                {/* Specular Highlight Gleam */}
                                <circle cx={pegX - 1.1} cy={pegY - 9.8} r="1" fill="#ffffff" opacity="0.95" />
                              </g>
                            </g>
                          );
                        })}

                        {/* ── Outer & Inner Sacred Geometry Rings ── */}
                        <circle cx="220" cy="220" r="186" fill="none" stroke="#fde68a" strokeWidth="0.7" strokeDasharray="3 4" opacity="0.5" />
                        <circle cx="220" cy="220" r="88" fill="none" stroke="#c084fc" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.35" />

                        {/* ── 3D Center Hub (Elevated Tiered Obsidian Dome) ── */}
                        <g filter="url(#hubDropShadow)">
                          {/* Chrome Hub Bezel */}
                          <circle cx="220" cy="220" r="48" fill="url(#chromeCollarGrad)" stroke="#0f172a" strokeWidth="1.5" />
                          {/* Gold Step Ring */}
                          <circle cx="220" cy="220" r="44" fill="url(#goldRimGrad3D)" stroke="#451a03" strokeWidth="1" />
                          {/* Obsidian Dome Core */}
                          <circle cx="220" cy="220" r="39" fill="url(#hubObsidianGrad)" stroke="#fde68a" strokeWidth="1.8" />
                          {/* 8-Pointed Celestial Star & Sun/Moon Emblem */}
                          <g transform="translate(202, 202)">
                            <svg width="36" height="36" viewBox="0 0 32 32">
                              <polygon points="16,2 19,13 30,16 19,19 16,30 13,19 2,16 13,13" fill="none" stroke="#fde68a" strokeWidth="1.3" opacity="0.75" />
                              <polygon points="6,6 14,13 26,6 19,16 26,26 16,19 6,26 13,16" fill="none" stroke="#c084fc" strokeWidth="1" opacity="0.5" />
                              <circle cx="16" cy="16" r="8" fill="#090514" stroke="#fde68a" strokeWidth="1.6" />
                              <path d="M17.5 10 A6 6 0 1 0 17.5 22 A4.5 4.5 0 1 1 17.5 10 Z" fill="#fde68a" />
                              <circle cx="19.5" cy="16" r="1.8" fill="#f5d0fe" />
                              {/* Center Chrome Screw/Rivet Pin */}
                              <circle cx="16" cy="16" r="2.8" fill="url(#chromeCapGrad)" stroke="#0f172a" strokeWidth="0.5" />
                              <circle cx="15.2" cy="15.2" r="0.8" fill="#ffffff" />
                            </svg>
                          </g>
                        </g>
                      </svg>
                    </div>
                    {/* End 3D Camera Rig */}
                  </div>
                </div>

                  {/* ── Ping-pong Power Gauge ── */}
                  {(() => {
                    const effectivePower = Math.min(100, Math.max(0, lockedPower ?? wheelPower));
                    const isSpinningActive = Boolean(tarotState?.isWheelSpinning || isWheelSpinningOptimistic);

                    const isGambleRound = Boolean(tarotState?.isGambling || tarotState?.isGamblingWaitingSpin || isLocalGambleArming);
                    const gambleTriggerCard = mysteryState?.tarotGambleState?.triggerCardKey || tarotState?.drawnCard?.key;
                    const isStarGamble = isGambleRound && gambleTriggerCard === "THE_STAR";
                    const isMoonGamble = isGambleRound && gambleTriggerCard === "THE_MOON";
                    const activeTeamHearts = teams.find((t) => t.id === currentTurnTeamId)?.hearts ?? mysteryState?.teamHearts?.[currentTurnTeamId] ?? mysteryState?.initialHeartsPerTeam ?? 0;
                    const isStarDisabled = isStarGamble && activeTeamHearts < 1;

                    const handleTriggerSpin = () => {
                      if (isSpinningActive) return;
                      const powerToLock = Math.min(100, Math.max(0, wheelPower));
                      setLockedPower(powerToLock);
                      setIsWheelSpinningOptimistic(true);
                      if (isGambleRound && onTarotGambleDecision) {
                        setIsLocalGambleArming(false);
                        onTarotGambleDecision(true, powerToLock);
                      } else if (onSpinTarotWheel) {
                        onSpinTarotWheel(powerToLock);
                      } else if (onDrawTarot) {
                        onDrawTarot();
                      } else {
                        onFlipCard?.(0);
                      }
                    };

                    return (
                      <>


                        {/* Controls container - smoothly collapsed when spinning to free space for the wheel */}
                        <div
                          className={`w-full max-w-sm mx-auto space-y-2 z-10 transition-all duration-500 ease-in-out overflow-hidden ${
                            isSpinningActive
                              ? "opacity-0 max-h-0 pointer-events-none -translate-y-3 my-0 py-0"
                              : "opacity-100 max-h-[500px] translate-y-0 pt-1"
                          }`}
                        >
                          <div className="w-full space-y-1 px-2">
                            <div className="flex items-center justify-between text-xs font-black">
                              <span className="text-purple-200 uppercase tracking-wider text-[11px] flex items-center gap-1">
                                ⚡ LỰC QUAY ĐỊNH MỆNH:
                              </span>
                              <span
                                className={`font-mono text-xs px-2 py-0.5 rounded font-black border transition-colors ${
                                  effectivePower > 75
                                    ? "bg-fuchsia-500/30 text-fuchsia-200 border-fuchsia-400"
                                    : effectivePower > 40
                                    ? "bg-amber-500/30 text-amber-200 border-amber-400"
                                    : "bg-indigo-500/30 text-indigo-200 border-indigo-400"
                                }`}
                              >
                                {effectivePower}%
                              </span>
                            </div>

                            {/* Gauge track */}
                            <div className="w-full h-3.5 rounded-full bg-[#05030a] border border-purple-400/30 p-0.5 relative overflow-hidden shadow-inner">
                              <div className="absolute inset-0 flex justify-between px-2 pointer-events-none z-10 opacity-35 text-[8px] font-mono font-bold text-amber-100 items-center">
                                <span>0</span>
                                <span>25</span>
                                <span>50</span>
                                <span>75</span>
                                <span>100</span>
                              </div>
                              <div
                                style={{ width: `${effectivePower}%` }}
                                className="h-full rounded-full transition-all duration-75 bg-gradient-to-r from-indigo-600 via-purple-500 to-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.65)]"
                              />
                            </div>

                            {!isDisplay && (
                              <div className="flex items-center justify-between text-[10px] text-white/70 pt-0.5">
                                <span className="flex items-center gap-1 font-sans">
                                  <span>✦</span>
                                  <span className="text-amber-200/90 font-medium">Chủ động chốt lực khi sẵn sàng</span>
                                </span>
                                <span className="text-[10px] text-purple-300/70 font-mono">
                                  {isSpinningActive ? "Đã khóa lực" : "Dao động Ping-pong"}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* ── Spin Action Buttons ── */}
                          <div className="text-center space-y-1.5 z-10 w-full pt-0.5">
                            {canActOnTarot && !isDisplay ? (
                              <button
                                type="button"
                                onClick={handleTriggerSpin}
                                disabled={isSpinningActive}
                                className={`w-full py-2.5 sm:py-3 px-6 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider shadow-2xl transition-all cursor-pointer border-2 ${
                                  isSpinningActive
                                    ? "bg-purple-950/80 text-purple-300 border-purple-500/40 cursor-wait animate-pulse"
                                    : isGambleRound
                                    ? "bg-gradient-to-r from-[#4a044e] via-[#c026d3] to-[#f59e0b] hover:from-[#701a75] hover:to-[#fbbf24] text-white border-fuchsia-300 shadow-[0_0_25px_rgba(217,70,239,0.65)] hover:scale-[1.02] active:scale-95 animate-pulse"
                                    : "bg-gradient-to-r from-[#2e1065] via-[#7e22ce] to-[#d97706] hover:from-[#3b0764] hover:to-[#f59e0b] text-amber-100 border-amber-300/90 shadow-[0_0_25px_rgba(147,51,234,0.55)] hover:scale-[1.02] active:scale-95"
                                }`}
                              >
                                {isSpinningActive
                                  ? "🌀 ĐANG XOAY VÒNG TAROT..."
                                  : isGambleRound
                                  ? `✦ CHỐT LỰC & QUAY TIẾP (${effectivePower}%) ✦`
                                  : `✦ CHỐT LỰC & QUAY (${effectivePower}%) ✦`}
                              </button>
                            ) : (
                              <div className="py-2 px-4 rounded-xl bg-black/60 border border-purple-400/20 text-xs text-purple-200/80 italic text-center">
                                {isSpinningActive
                                  ? "🌀 Vòng quay Major Arcana đang xoay..."
                                  : isGambleRound
                                  ? `Đang đợi Đội ${currentTurnTeamName} chốt lực quay tiếp...`
                                  : `Đang đợi Đội ${currentTurnTeamName} chốt lực quay...`}
                              </div>
                            )}

                            {isGambleRound && canActOnTarot && !isSpinningActive && !isDisplay && (
                              <button
                                type="button"
                                disabled={isStarDisabled}
                                onClick={() => {
                                  if (isStarDisabled) return;
                                  setIsLocalGambleArming(false);
                                  onTarotGambleDecision?.(false);
                                }}
                                className={`w-full py-1.5 px-3 rounded-xl border text-xs font-bold transition ${
                                  isStarDisabled
                                    ? "bg-slate-900/80 border-rose-500/30 text-rose-300/60 cursor-not-allowed opacity-60"
                                    : isStarGamble
                                    ? "bg-amber-950/80 hover:bg-amber-900 border-amber-400/60 text-amber-200 cursor-pointer shadow-md"
                                    : isMoonGamble
                                    ? "bg-indigo-950/80 hover:bg-indigo-900 border-indigo-400/60 text-indigo-200 cursor-pointer shadow-md"
                                    : "bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-400/60 text-emerald-200 cursor-pointer"
                                }`}
                                title={isStarDisabled ? "Cần tối thiểu 1 ❤️ để dừng lại đổi lấy Max Tim" : undefined}
                              >
                                {isStarDisabled
                                  ? "🛑 Dừng Lại (Khóa: Cần tối thiểu 1 ❤️ để đổi Max Tim)"
                                  : isStarGamble
                                  ? `🛑 Dừng Lại (+${baseQuestionPoints || 10}đ & Đổi 1 ❤️ lấy +1 Max Tim)`
                                  : isMoonGamble
                                  ? `🛑 Dừng Lại (+${baseQuestionPoints || 10}đ & Bùa Miễn Nhiễm 🌙)`
                                  : `🛑 Hoặc: Dừng Lại An Toàn (+${baseQuestionPoints || 10}đ)`}
                              </button>
                            )}

                            {(isAdmin || isSandbox) && !isSpinningActive && !isDisplay && (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={handleTriggerSpin}
                                  className="flex-1 py-1.5 px-3 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 border border-purple-400/50 text-amber-200 text-xs font-bold transition cursor-pointer"
                                >
                                  ⚡ Admin {isGambleRound ? "Quay Tiếp Hộ" : "Quay Hộ"} ({effectivePower}%)
                                </button>
                                {isGambleRound && (
                                  <button
                                    type="button"
                                    disabled={isStarDisabled}
                                    onClick={() => {
                                      if (isStarDisabled) return;
                                      setIsLocalGambleArming(false);
                                      onTarotGambleDecision?.(false);
                                    }}
                                    className={`py-1 px-3 rounded-xl border text-xs font-bold transition ${
                                      isStarDisabled
                                        ? "bg-slate-900/80 border-rose-500/30 text-rose-300/60 cursor-not-allowed opacity-60"
                                        : isStarGamble
                                        ? "bg-amber-950/70 hover:bg-amber-900 border-amber-400/50 text-amber-200 cursor-pointer"
                                        : isMoonGamble
                                        ? "bg-indigo-950/70 hover:bg-indigo-900 border-indigo-400/50 text-indigo-200 cursor-pointer"
                                        : "bg-emerald-950/60 hover:bg-emerald-900/80 border-emerald-400/50 text-emerald-200 cursor-pointer"
                                    }`}
                                    title={isStarDisabled ? "Cần tối thiểu 1 ❤️ để dừng lại đổi lấy Max Tim" : undefined}
                                  >
                                    {isStarDisabled
                                      ? "⚡ Admin Dừng Lại (Khóa: Cần ≥ 1 ❤️)"
                                      : isStarGamble
                                      ? `⚡ Admin Dừng Lại (+${baseQuestionPoints || 10}đ & Đổi Max Tim)`
                                      : isMoonGamble
                                      ? `⚡ Admin Dừng Lại (+${baseQuestionPoints || 10}đ & Bùa 🌙)`
                                      : `⚡ Admin Dừng Lại (+${baseQuestionPoints || 10}đ)`}
                                  </button>
                                )}
                              </div>
                            )}

                            <p className="text-[10px] text-purple-200/60 tracking-wide">
                              {isPenaltySurvivalMode
                                ? "20 Ấn Sinh Tử: Ẩn giấu cơ hội Thoát Nạn Hòa Bình giữa các Ấn Phạt Cổ Xưa"
                                : "22 Lá Major Arcana (0 – XXI): Điềm Lành, Đánh Cược, Cướp Điểm & Bẫy Phạt ẩn sau mỗi ấn cổ"}
                            </p>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : (
                /* ── Trạng thái ĐÃ DỪNG KIM: Hiển thị Lá Bài Tarot Cổ Xưa (Suspense Hoặc Đã Mở) ── */
                <div className={`flex flex-col items-center justify-center ${isDisplay ? "p-3 sm:p-4" : "p-4 sm:p-6"} rounded-3xl bg-gradient-to-b from-[#070410]/95 via-[#110924]/95 to-[#050309]/98 border-2 border-purple-500/50 shadow-[0_0_55px_rgba(88,28,135,0.5)] animate-fade-in relative overflow-hidden`}>
                  {/* Ambient constellation backdrop */}
                  <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ backgroundImage: "radial-gradient(#fde68a 0.75px, transparent 0.75px)", backgroundSize: "28px 28px" }} />

                  {/* ── Mystical Astral Glow Aura while FLYING / ATTACHED ── */}
                  {(tarotFlyPhase === "FLYING" || tarotFlyPhase === "ATTACHED") && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-80 h-80 rounded-full bg-gradient-to-r from-amber-500/20 via-purple-600/25 to-fuchsia-500/20 blur-3xl animate-pulse" />
                    </div>
                  )}

                  {/* Header Badge */}
                  <div className="text-center mb-2 sm:mb-3 z-10">
                    {isPendingReveal ? (
                      <span className="inline-block px-3.5 py-1 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] border bg-purple-950/80 text-amber-200 border-amber-400/60 shadow-[0_0_15px_rgba(251,191,36,0.3)] animate-pulse">
                        {tarotFlyPhase === "ATTACHED"
                          ? "✦ ẤN CHỨNG ĐÃ PHONG ẤN LÊN LÁ BÀI • ĐANG KHAI MỞ (1.2S) ✦"
                          : tarotFlyPhase === "FLYING"
                          ? "✦ LÁ BÀI TAROT 3D • ĐANG PHÓNG RA TỪ ĐỈNH 12H ✦"
                          : "✦ ĐỊNH MỆNH MAJOR ARCANA ✦"}
                      </span>
                    ) : (
                      <span className={`inline-block px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${cardVisual.tagColor}`}>
                        {drawnCard?.key === "THE_PEACE"
                          ? "🕊️ THOÁT NẠN SINH TỬ (20%)"
                          : isPenaltySurvivalMode
                          ? "💀 TRỪNG PHẠT SINH TỬ (80%)"
                          : drawnCard?.group === "COMMON"
                          ? "✨ ĐỊNH MỆNH THƯỜNG"
                          : drawnCard?.group === "MUTATION"
                          ? "⚡ ĐỊNH MỆNH ĐỘT BIẾN"
                          : "💀 ĐỊNH MỆNH CHÍ MẠNG"}
                      </span>
                    )}
                  </div>

                  {/* ── 3D Card Container (Perspective Flip 180deg & 12h Fly-out) ── */}
                  <div
                    onClick={() => {
                      if (isPendingReveal && canActOnTarot) {
                        onTarotReveal?.();
                      }
                    }}
                    className={`relative z-10 ${isDisplay ? "w-44 h-64 sm:w-48 sm:h-72" : "w-52 h-76 sm:w-60 sm:h-84"} [perspective:1200px] select-none ${canActOnTarot && isPendingReveal ? "cursor-pointer" : ""}`}
                    style={
                      tarotFlyPhase === "FLYING"
                        ? { animation: "tarotCardFlyOutFrom12h 0.75s cubic-bezier(0.2, 0.8, 0.25, 1) forwards" }
                        : undefined
                    }
                  >
                    <div
                      className={`w-full h-full relative transition-transform duration-700 [transform-style:preserve-3d] ${
                        tarotFlyPhase === "REVEALED" ? "[transform:rotateY(180deg)]" : "[transform:rotateY(0deg)]"
                      }`}
                    >
                      {/* ── MẶT SAU (LƯNG BÀI ÚP) ── */}
                      <div
                        className="absolute inset-0 w-full h-full rounded-2xl flex flex-col items-center justify-between p-3.5 sm:p-4 border-2 border-amber-400/85 shadow-2xl [backface-visibility:hidden] bg-gradient-to-b from-[#0c0720] via-[#160d32] to-[#06030e] overflow-hidden"
                        style={{
                          boxShadow:
                            tarotFlyPhase === "ATTACHED"
                              ? "0 0 50px rgba(251, 191, 36, 0.75), 0 0 30px rgba(168, 85, 247, 0.55), inset 0 0 25px rgba(251, 191, 36, 0.2)"
                              : "0 0 40px rgba(168, 85, 247, 0.45), inset 0 0 20px rgba(251, 191, 36, 0.12)",
                        }}
                      >
                        {/* Viền Ornate Hoàng Kim */}
                        <div className="absolute inset-2 rounded-xl border border-amber-300/30 pointer-events-none" />
                        <div className="absolute inset-3 rounded-lg border border-purple-500/20 pointer-events-none" />

                        {/* Header Lưng Bài */}
                        <div className="w-full flex items-center justify-between border-b border-amber-300/20 pb-1 px-1 z-10">
                          <span className="font-serif font-black text-xs text-amber-300/80 tracking-wider">
                            ✦ TAROT ✦
                          </span>
                          <span className="text-[10px] font-bold text-amber-200/60 tracking-widest uppercase">
                            MAJOR ARCANA
                          </span>
                        </div>

                        {/* Trung tâm: Vòng tròn Mandala phong ấn & sóng chấn động */}
                        <div className="my-auto flex flex-col items-center justify-center relative py-2 z-10">
                          <div className="absolute w-28 h-28 sm:w-32 sm:h-32 rounded-full border border-amber-300/25 animate-spin-slow pointer-events-none" />
                          <div className="absolute w-20 h-20 sm:w-24 sm:h-24 rounded-full border border-purple-400/30 pointer-events-none" />

                          {/* Sóng chấn động khi đính ấn hoàng kim */}
                          {tarotFlyPhase === "ATTACHED" && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div
                                className="w-24 h-24 rounded-full border-2 border-amber-300"
                                style={{ animation: "tarotSealImpactPulse 1.2s ease-out infinite" }}
                              />
                              <div
                                className="w-32 h-32 rounded-full border border-purple-400"
                                style={{ animation: "tarotSealImpactPulse 1.2s ease-out infinite 0.2s" }}
                              />
                            </div>
                          )}

                          {/* Con dấu phong ấn lên lưng lá bài */}
                          <div
                            className={`relative p-3 rounded-full transition-all duration-500 ${
                              tarotFlyPhase === "ATTACHED" || tarotFlyPhase === "FLYING"
                                ? "bg-amber-500/25 border-2 border-amber-300 shadow-[0_0_35px_rgba(251,191,36,0.95)]"
                                : "bg-purple-950/60 border border-amber-400/30 opacity-40"
                            }`}
                            style={
                              tarotFlyPhase === "ATTACHED" || tarotFlyPhase === "FLYING"
                                ? { animation: "tarotSealGlow 1.5s ease-in-out infinite" }
                                : undefined
                            }
                          >
                            {tarotFlyPhase === "ATTACHED" || tarotFlyPhase === "FLYING" ? (
                              <TarotArcanaSvgIcon
                                cardKey={drawnCard?.key || "THE_FOOL"}
                                strokeColor="#fde68a"
                                className={`${isDisplay ? "w-16 h-16 sm:w-20 sm:h-20" : "w-18 h-18 sm:w-22 sm:h-22"} drop-shadow-[0_0_12px_rgba(251,191,36,0.95)]`}
                              />
                            ) : (
                              <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center text-amber-300/60">
                                <span className="text-xl animate-pulse">✦</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Footer Lưng Bài */}
                        <div className="w-full text-center z-10">
                          <span className="text-[10px] font-black uppercase tracking-widest text-amber-300/90 bg-black/60 px-3 py-1 rounded-full border border-amber-400/40 shadow">
                            {tarotFlyPhase === "ATTACHED"
                              ? "✦ ĐÃ PHONG ẤN • ĐANG KHAI MỞ (1.2S) ✦"
                              : tarotFlyPhase === "FLYING"
                              ? "✦ ĐANG TIẾP ĐẤT TRUNG TÂM ✦"
                              : "✦ ĐANG TIẾP NHẬN ẤN MAJOR ARCANA ✦"}
                          </span>
                        </div>
                      </div>

                      {/* ── MẶT TRƯỚC (LẬT 180 ĐỘ KHI REVEALED) ── */}
                      <div
                        className={`absolute inset-0 w-full h-full rounded-2xl flex flex-col items-center justify-between p-3.5 sm:p-4 border-2 shadow-2xl [backface-visibility:hidden] [transform:rotateY(180deg)] bg-gradient-to-b ${cardVisual.gradient} ${cardVisual.border}`}
                        style={{
                          boxShadow: `0 0 38px ${cardVisual.glow}, 0 0 12px rgba(255,255,255,0.2)`,
                        }}
                      >
                        {/* Inner Classic Tarot Frame Border */}
                        <div className="absolute inset-2 rounded-xl border border-amber-300/25 pointer-events-none" />

                        {/* Roman Numeral & English name */}
                        <div className="w-full flex items-center justify-between border-b border-amber-300/20 pb-1.5 px-1 z-10">
                          <span className="font-serif font-black text-sm sm:text-base text-amber-300 tracking-wider drop-shadow">
                            {drawnCard?.roman}
                          </span>
                          <span className="text-[10px] font-bold text-amber-100/90 tracking-widest uppercase">
                            {drawnCard?.nameEn}
                          </span>
                        </div>

                        {/* Central Esoteric Vector Line-Art Emblem */}
                        <div className="my-auto flex flex-col items-center justify-center relative py-2 z-10">
                          <div className="absolute w-28 h-28 sm:w-32 sm:h-32 rounded-full border border-amber-300/20 animate-pulse pointer-events-none" />
                          <div className="absolute w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-purple-500/10 blur-md pointer-events-none" />
                          <div className="relative p-2.5 rounded-full">
                            <TarotArcanaSvgIcon
                              cardKey={drawnCard?.key || "THE_FOOL"}
                              strokeColor="#fde68a"
                              className={`${isDisplay ? "w-20 h-20 sm:w-24 sm:h-24" : "w-24 h-24 sm:w-28 sm:h-28"} animate-bounce-in`}
                            />
                          </div>
                        </div>

                        {/* Footer: Card Name and Revealed Delta */}
                        <div className="w-full text-center space-y-1.5 z-10">
                          <h3 className={`text-base sm:text-lg font-black uppercase tracking-wider ${cardVisual.textColor}`}>
                            {drawnCard?.nameVi}
                          </h3>
                          <div className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs sm:text-sm font-black font-mono shadow-lg bg-black/75 border border-white/25">
                            {drawnCard?.key === "THE_PEACE" ? (
                              <span className="text-emerald-400">0đ (Thoát Nạn Thành Công 🕊️)</span>
                            ) : drawnCard && (drawnCard.key === "THE_STAR" || drawnCard.key === "THE_MOON") ? (
                              tarotState?.isGambling ? (
                                <span className="text-fuchsia-300">
                                  {drawnCard.key === "THE_STAR"
                                    ? `⭐ Đánh Cược (Dừng: +${baseQuestionPoints || 10}đ & Đổi 1 ❤️ lấy +1 Max Tim)`
                                    : `🌑 Đánh Cược (Dừng: +${baseQuestionPoints || 10}đ & Bùa Miễn Nhiễm 🌙)`}
                                </span>
                              ) : (
                                <span className="text-emerald-400">
                                  +{drawnCard.scoreDelta || baseQuestionPoints || 10}đ {drawnCard.key === "THE_STAR" ? "(Đổi 1 ❤️ lấy +1 Max Tim ⭐)" : "(Nhận Bùa Miễn Nhiễm 🌙)"}
                                </span>
                              )
                            ) : drawnCard && drawnCard.stolenPoints && drawnCard.stolenPoints > 0 ? (
                              <span className="text-indigo-300">
                                +{drawnCard.stolenPoints}đ ➔ Cướp từ {drawnCard.victimTeamName || "Top 1"}
                              </span>
                            ) : drawnCard && drawnCard.giftedPoints && drawnCard.giftedPoints > 0 ? (
                              <span className="text-rose-400">
                                -{Math.abs(drawnCard.scoreDelta)}đ ➔ Tặng {drawnCard.victimTeamName || "Top 1"}
                              </span>
                            ) : drawnCard && drawnCard.darkBombRecipients && drawnCard.darkBombRecipients.length > 0 && drawnCard.scoreDelta <= 0 ? (
                              <span className="text-rose-400">
                                -{Math.abs(drawnCard.scoreDelta)}đ (Bom Hắc Ám Chia Đối Thủ 😈)
                              </span>
                            ) : drawnCard && drawnCard.scoreDelta < 0 ? (
                              <span className="text-rose-400">
                                -{Math.abs(drawnCard.scoreDelta)}đ ({isPenaltySurvivalMode ? "Phạt Sinh Tử" : "Bẫy Sập Phạt Điểm ⚡"})
                              </span>
                            ) : drawnCard && drawnCard.scoreDelta === 0 ? (
                              <span className="text-purple-300">±0đ (Bảo toàn điểm)</span>
                            ) : (
                              <span className="text-emerald-400">+{drawnCard?.scoreDelta || 0}đ (Điềm Lành ✨)</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Reveal Button when isRevealPending ── */}
                  {isPendingReveal && (
                    <div className="mt-3.5 text-center space-y-2 z-10 w-full max-w-xs">
                      {canActOnTarot && !isDisplay ? (
                        <button
                          type="button"
                          onClick={() => onTarotReveal?.()}
                          className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-fuchsia-600 to-purple-700 hover:from-amber-400 hover:to-purple-600 text-white font-black text-sm uppercase tracking-wider shadow-[0_0_30px_rgba(234,179,8,0.55)] border-2 border-amber-300 hover:scale-105 active:scale-95 transition-all cursor-pointer animate-pulse"
                        >
                          ✨ LẬT BÀI ĐỊNH MỆNH ✨
                        </button>
                      ) : (
                        <div className="py-2.5 px-4 rounded-xl bg-black/60 border border-purple-400/25 text-xs text-purple-200/85 italic">
                          Đang chờ Đội {currentTurnTeamName} lật mở ấn chứng...
                        </div>
                      )}

                      {(isAdmin || isSandbox) && !isDisplay && (
                        <button
                          type="button"
                          onClick={() => onTarotReveal?.()}
                          className="w-full py-1.5 px-3 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 border border-purple-400/50 text-amber-200 text-xs font-bold transition cursor-pointer"
                        >
                          ⚡ Admin Lật Bài Hộ
                        </button>
                      )}
                    </div>
                  )}

                  {/* ── Shield Respin Option when isShieldRespin (after reveal) ── */}
                  {!isPendingReveal && tarotState?.isShieldRespin && (
                    <div className="mt-4 p-4 rounded-2xl bg-emerald-950/85 border-2 border-emerald-400/80 shadow-[0_0_30px_rgba(16,185,129,0.35)] text-center space-y-3 max-w-md w-full animate-fade-in z-10">
                      <div className="space-y-1">
                        <h4 className="text-sm font-black text-emerald-300 uppercase tracking-wider flex items-center justify-center gap-1.5">
                          <span>🛡️</span>
                          <span>KHIÊN THẦN ĐÃ HẤP THỤ Ô TRỪ (0đ)</span>
                          <span>🛡️</span>
                        </h4>
                        <p className="text-xs text-emerald-100/90 font-medium leading-relaxed">
                          Bẫy trừ điểm đã bị vô hiệu hóa an toàn! Đội bạn được thưởng <strong>1 lượt quay mới</strong>.<br />
                          Đặc biệt: Toàn bộ ô <strong>{drawnCard?.nameVi}</strong> trên vòng quay đã được chuyển hóa thành <strong>ô cộng điểm (+{baseQuestionPoints || 10}đ ✨)</strong>!
                        </p>
                      </div>

                      <div className="flex items-center justify-center gap-3 pt-1">
                        {canActOnTarot && !isDisplay ? (
                          <button
                            type="button"
                            onClick={() => onTarotRespin?.()}
                            className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-700 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider shadow-lg border border-emerald-300 hover:scale-105 active:scale-95 transition cursor-pointer animate-pulse"
                          >
                            ✨ BƯỚC VÀO LƯỢT QUAY MỚI (LƯỢT 2) ✨
                          </button>
                        ) : (
                          <div className="py-2 px-3 text-xs text-slate-300 italic">
                            Đang đợi Đội {currentTurnTeamName} bắt đầu lượt quay mới...
                          </div>
                        )}
                      </div>

                      {(isAdmin || isSandbox) && !isDisplay && (
                        <div className="pt-2 border-t border-emerald-500/20">
                          <button
                            type="button"
                            onClick={() => onTarotRespin?.()}
                            className="py-1 px-3 rounded-lg bg-emerald-900/50 hover:bg-emerald-800/60 border border-emerald-500/40 text-emerald-200 text-[11px] font-bold transition cursor-pointer"
                          >
                            ⚡ Admin Bắt Đầu Lượt Quay Mới
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Gamble Options when isGambling (after reveal) ── */}
                  {!isPendingReveal && tarotState?.isGambling && (() => {
                    const gambleTriggerCard = mysteryState?.tarotGambleState?.triggerCardKey || tarotState?.drawnCard?.key;
                    const isStarGambleModal = gambleTriggerCard === "THE_STAR";
                    const isMoonGambleModal = gambleTriggerCard === "THE_MOON";
                    const activeTeamHearts = teams.find((t) => t.id === currentTurnTeamId)?.hearts ?? mysteryState?.teamHearts?.[currentTurnTeamId] ?? mysteryState?.initialHeartsPerTeam ?? 0;
                    const isStarDisabledModal = isStarGambleModal && activeTeamHearts < 1;

                    return (
                      <div className="mt-4 p-4 rounded-2xl bg-purple-950/75 border-2 border-fuchsia-500/60 shadow-2xl text-center space-y-3 max-w-md w-full animate-fade-in z-10">
                        <div className="space-y-1">
                          <h4 className="text-sm font-black text-fuchsia-300 uppercase tracking-wider flex items-center justify-center gap-1.5">
                            <span>✦</span>
                            <span>CÁNH CỔNG ĐÁNH CƯỢC ĐỊNH MỆNH</span>
                            <span>✦</span>
                          </h4>
                          <p className="text-xs text-purple-200/90 font-medium">
                            {isStarGambleModal
                              ? `Bạn có muốn Quay Tiếp để săn phần thưởng lớn hơn, hay Dừng Lại (+${baseQuestionPoints || 10}đ) để đổi 1 ❤️ lấy +1 Giới hạn Tim tối đa?`
                              : isMoonGambleModal
                              ? `Bạn có muốn Quay Tiếp để săn phần thưởng lớn hơn, hay Dừng Lại (+${baseQuestionPoints || 10}đ) để kích hoạt Bùa Miễn Nhiễm 🌙 trọn vẹn 1 vòng đấu (sẽ vô hiệu hóa Khiên nếu có)?`
                              : `Bạn có muốn Quay Tiếp để săn phần thưởng lớn hơn, hay Dừng Lại An Toàn nhận ngay +${baseQuestionPoints || 10}đ (1x điểm gốc câu hỏi)?`}
                          </p>
                          {isStarDisabledModal && (
                            <div className="p-2 rounded-xl bg-rose-950/70 border border-rose-500/50 text-[11px] text-rose-300 font-bold mt-2">
                              ⚠️ Đội bạn đang có 0 ❤️ nên không đủ điều kiện Dừng Lại để đổi Max Tim. Bạn buộc phải bấm Quay Tiếp!
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-center gap-3 pt-1">
                          {canActOnTarot && !isDisplay ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsLocalGambleArming(true);
                                  onTarotGamblePrepare?.();
                                }}
                                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-amber-500 hover:from-fuchsia-500 hover:to-amber-400 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg border border-amber-300 hover:scale-105 active:scale-95 transition cursor-pointer animate-pulse"
                              >
                                🎲 QUYẾT ĐỊNH QUAY TIẾP ➔
                              </button>
                              <button
                                type="button"
                                disabled={isStarDisabledModal}
                                onClick={() => {
                                  if (isStarDisabledModal) return;
                                  onTarotGambleDecision?.(false);
                                }}
                                className={`flex-1 py-3 px-4 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider border transition ${
                                  isStarDisabledModal
                                    ? "bg-slate-900/80 border-rose-500/30 text-rose-300/50 cursor-not-allowed opacity-60"
                                    : isStarGambleModal
                                    ? "bg-amber-900/85 hover:bg-amber-800 text-amber-100 border-amber-400/60 hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
                                    : isMoonGambleModal
                                    ? "bg-indigo-900/85 hover:bg-indigo-800 text-indigo-100 border-indigo-400/60 hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
                                    : "bg-emerald-900/75 hover:bg-emerald-800/85 text-emerald-100 border-emerald-400/50 hover:scale-105 active:scale-95 cursor-pointer"
                                }`}
                              >
                                {isStarDisabledModal
                                  ? "🛑 KHÓA (CẦN ≥ 1 ❤️)"
                                  : isStarGambleModal
                                  ? `🛑 DỪNG LẠI (+${baseQuestionPoints || 10}đ & ĐỔI MAX TIM)`
                                  : isMoonGambleModal
                                  ? `🛑 DỪNG LẠI (+${baseQuestionPoints || 10}đ & BÙA 🌙)`
                                  : `🛑 DỪNG LẠI (+${baseQuestionPoints || 10}đ)`}
                              </button>
                            </>
                          ) : (
                            <div className="py-2 px-3 text-xs text-slate-300 italic">
                              Đang đợi Đội {currentTurnTeamName} quyết định cược...
                            </div>
                          )}
                        </div>

                        {(isAdmin || isSandbox) && !isDisplay && (
                          <div className="flex gap-2 justify-center pt-2 border-t border-white/10">
                            <button
                              type="button"
                              onClick={() => {
                                setIsLocalGambleArming(true);
                                onTarotGamblePrepare?.();
                              }}
                              className="py-1 px-3 rounded-lg bg-fuchsia-900/40 hover:bg-fuchsia-900/70 border border-fuchsia-400/40 text-fuchsia-200 text-[11px] font-bold transition cursor-pointer"
                            >
                              ⚡ Admin Quay Tiếp ➔
                            </button>
                            <button
                              type="button"
                              disabled={isStarDisabledModal}
                              onClick={() => {
                                if (isStarDisabledModal) return;
                                onTarotGambleDecision?.(false);
                              }}
                              className={`py-1 px-3 rounded-lg border text-[11px] font-bold transition ${
                                isStarDisabledModal
                                  ? "bg-slate-900/70 border-rose-500/30 text-rose-300/50 cursor-not-allowed opacity-60"
                                  : isStarGambleModal
                                  ? "bg-amber-900/60 hover:bg-amber-800/70 border-amber-500/50 text-amber-200 cursor-pointer"
                                  : isMoonGambleModal
                                  ? "bg-indigo-900/60 hover:bg-indigo-800/70 border-indigo-500/50 text-indigo-200 cursor-pointer"
                                  : "bg-emerald-900/50 hover:bg-emerald-800/60 border-emerald-500/40 text-emerald-200 cursor-pointer"
                              }`}
                            >
                              {isStarDisabledModal
                                ? "⚡ Admin Dừng Lại (Khóa: Cần ≥ 1 ❤️)"
                                : isStarGambleModal
                                ? `⚡ Admin Dừng Lại (+${baseQuestionPoints || 10}đ & Đổi Max Tim)`
                                : isMoonGambleModal
                                ? `⚡ Admin Dừng Lại (+${baseQuestionPoints || 10}đ & Bùa 🌙)`
                                : `⚡ Admin Dừng Lại (+${baseQuestionPoints || 10}đ)`}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })()}

        {/* ════════════════════════════════════════════════════════════════════
            3. VARIANT: MEMORY_PAIRS (12 Cards / 6 Pairs)
        ════════════════════════════════════════════════════════════════════ */}
        {miniGameType === "MEMORY_PAIRS" && (() => {
          const effectiveMatchedPairKey = memoryPairsState?.matchedPairKey || optimisticMatchedPairKey;
          const isPairsLocked = Boolean(
            !canInteract ||
            memoryPairsState?.isMismatchResolving ||
            memoryPairsState?.promptSecondChance ||
            effectiveMatchedPairKey ||
            phase === "TURN_SUMMARY" ||
            (!isPenaltySurvivalMode && (memoryPairsState?.attemptsUsed ?? 0) >= (memoryPairsState?.maxAttempts ?? 4) && !memoryPairsState?.isBombRescueActive)
          );

          const shouldDimBoard = Boolean(memoryPairsState?.promptSecondChance);

          return (
            <div className={`grid grid-cols-4 gap-2 sm:gap-2.5 max-w-xl mx-auto py-1 transition-opacity duration-300 ${
              shouldDimBoard ? "opacity-40 pointer-events-none grayscale-30" : ""
            }`}>
              {tiles.map((tile) => {
                const isMatched = effectiveMatchedPairKey === tile.pairKey;
                const isEscapeSafe = tile.type === "ESCAPE_SAFE" || tile.pairKey === "PAIR_ESCAPE";
                const isBomb = !isEscapeSafe && tile.type !== "REWARD";

                const isKeptPenalty = Boolean((memoryPairsState?.keptBombTileIds || []).map(Number).includes(Number(tile.id)));
                const isCurrentFlipped =
                  Number(memoryPairsState?.firstFlippedTileId) === Number(tile.id) ||
                  Number(memoryPairsState?.secondFlippedTileId) === Number(tile.id) ||
                  Number(memoryPairsState?.thirdFlippedTileId) === Number(tile.id);
                const isCardOpened = tile.isOpened || optimisticOpenedIds.has(tile.id) || isKeptPenalty || isCurrentFlipped;

                const priorFlippedId = memoryPairsState?.firstFlippedTileId;
                let isAlreadyAttemptedPair = false;
                if (!isPenaltySurvivalMode && priorFlippedId && Number(priorFlippedId) !== Number(tile.id)) {
                  const fId = Number(priorFlippedId);
                  const sId = Number(tile.id);
                  const pairMoveKey = `${Math.min(fId, sId)}-${Math.max(fId, sId)}`;
                  if ((memoryPairsState?.attemptedPairs || []).includes(pairMoveKey)) {
                    isAlreadyAttemptedPair = true;
                  }
                }
                const isTileDisabled = isPairsLocked || isAlreadyAttemptedPair;

                if (!isCardOpened) {
                  return (
                    <button
                      key={tile.id}
                      type="button"
                      onClick={() => handleTileClick(tile)}
                      disabled={isTileDisabled}
                      className={`relative aspect-[4/3] max-h-[10.5vh] sm:max-h-[12.5vh] rounded-xl p-1.5 flex flex-col items-center justify-between border-2 transition-all duration-300 ${
                        !isTileDisabled
                          ? tile.isPeeked
                            ? "bg-gradient-to-b from-indigo-900/90 to-slate-950 border-emerald-400/80 ring-2 ring-emerald-400/40 hover:scale-102 shadow-xl group cursor-pointer"
                            : "bg-gradient-to-b from-indigo-900/80 to-slate-950 border-indigo-400/60 hover:border-amber-400 hover:scale-102 shadow-xl group cursor-pointer"
                          : isAlreadyAttemptedPair
                          ? "bg-rose-950/30 border-rose-500/40 opacity-45 cursor-not-allowed pointer-events-none"
                          : "bg-black/40 border-white/10 opacity-75 cursor-not-allowed pointer-events-none"
                      }`}
                    >
                      <div className="w-full flex items-center justify-between">
                        <span className="w-4 h-4 rounded-full bg-black/60 border border-white/20 text-[9px] font-black text-white flex items-center justify-center font-mono">
                          #{tile.id}
                        </span>
                        {isAlreadyAttemptedPair ? (
                          <span className="text-[7.5px] font-black text-rose-300 px-1 py-0.2 rounded bg-rose-950/90 border border-rose-500 shadow-md">
                            🔒 ĐÃ THỬ
                          </span>
                        ) : tile.isPeeked ? (
                          <span className="text-[7px] font-black text-emerald-300 px-1.5 py-0.2 rounded bg-emerald-950/90 border border-emerald-400 animate-pulse shadow-md">
                            👁️ {tile.peekLabel || "AN TOÀN"} ✨
                          </span>
                        ) : null}
                      </div>

                      <div className={`text-xl sm:text-2xl my-auto transition-transform duration-300 drop-shadow-md ${isAlreadyAttemptedPair ? "opacity-30 grayscale" : "group-hover:scale-110"}`}>
                        🃏
                      </div>

                      <div className="w-full text-center">
                        <span className={`text-[9px] sm:text-[10px] font-black block truncate ${isAlreadyAttemptedPair ? "text-rose-400/70" : "text-white"}`}>
                          {isAlreadyAttemptedPair ? "ĐÃ THỬ" : tile.label}
                        </span>
                      </div>
                    </button>
                  );
                }

                // Revealed Tile
                const isSteal = tile.effectType === "STEAL_POINTS";
                const isFool = tile.tarotCardKey === "THE_FOOL" || tile.pairKey === "PAIR_THE_FOOL";
                return (
                  <div
                    key={tile.id}
                    className={`relative aspect-[4/3] max-h-[10.5vh] sm:max-h-[12.5vh] rounded-xl p-1.5 flex flex-col items-center justify-between border-2 shadow-2xl transition-all duration-200 ${
                      isMatched ? "ring-2 ring-yellow-400 scale-102 z-10" : ""
                    } ${
                      isEscapeSafe
                        ? "bg-gradient-to-b from-emerald-950 via-teal-950 to-black border-emerald-400 text-emerald-200"
                        : isFool
                        ? "bg-gradient-to-b from-amber-950 via-stone-950 to-black border-amber-500 text-amber-200"
                        : isBomb
                        ? "bg-gradient-to-b from-red-950 via-stone-950 to-black border-red-500 text-red-200"
                        : isSteal
                        ? "bg-gradient-to-b from-rose-950 via-purple-950 to-black border-rose-400 text-rose-200"
                        : "bg-gradient-to-b from-indigo-950 via-purple-950 to-black border-emerald-400 text-emerald-200"
                    }`}
                  >
                    <div className="w-full flex items-center justify-between">
                      <span className="text-[9px] font-mono font-bold opacity-70">#{tile.id}</span>
                      <span
                        className={`text-[8px] font-black uppercase px-1 py-0.2 rounded ${
                          isMatched
                            ? isEscapeSafe
                              ? "bg-emerald-400 text-black font-extrabold"
                              : isFool
                              ? "bg-amber-400 text-black font-extrabold"
                              : isSteal
                              ? "bg-rose-500 text-white font-extrabold"
                              : "bg-yellow-400 text-black font-extrabold"
                            : isEscapeSafe
                            ? "bg-emerald-400 text-black font-extrabold"
                            : isFool
                            ? "bg-amber-500/30 text-amber-300 border border-amber-500/40"
                            : isBomb
                            ? "bg-red-500/30 text-red-300"
                            : isSteal
                            ? "bg-rose-500/30 text-rose-300"
                            : "bg-emerald-500/30 text-emerald-300"
                        }`}
                      >
                        {isMatched
                          ? isEscapeSafe
                            ? "THOÁT! 🕊️"
                            : isFool
                            ? "BẪY KHỜ! 🃏"
                            : isSteal
                            ? "CƯỚP! 🗡️"
                            : "CẶP! ⭐"
                          : isEscapeSafe
                          ? "THOÁT HIỂM 🕊️"
                          : isFool
                          ? "BẪY 🃏"
                          : isBomb
                          ? "BOM"
                          : isSteal
                          ? "CƯỚP 🗡️"
                          : "THƯỞNG"}
                      </span>
                    </div>

                  <div className="my-auto text-center drop-shadow-xl flex items-center justify-center">
                    <MinigameSvgIcon nameOrEmoji={tile.icon} className="w-7 h-7 sm:w-9 sm:h-9" />
                  </div>

                  <div className="w-full text-center">
                    <p className="text-[9px] sm:text-[10px] font-black text-white leading-tight truncate">
                      {tile.storyTitle}
                    </p>
                    <p
                      className={`text-[9px] sm:text-[10px] font-black font-mono mt-0.2 ${
                        isEscapeSafe
                          ? "text-emerald-300"
                          : isBomb
                          ? "text-red-400"
                          : isSteal
                          ? "text-rose-300"
                          : "text-amber-300"
                      }`}
                    >
                      {isEscapeSafe
                        ? "0đ (Thoát Hiểm)"
                        : isBomb
                        ? (tile.type === "BOMB_SMOKE" || tile.pairKey === "PAIR_TRAP" || tile.deltaPoints === 0)
                          ? (tile.deltaPoints && tile.deltaPoints < 0 ? `${tile.deltaPoints}đ` : "0đ (Mất câu)")
                          : `-${Math.abs(tile.deltaPoints || baseQuestionPoints || 10)}đ`
                        : isSteal
                        ? `Cướp +${tile.deltaPoints}đ`
                        : `+${tile.deltaPoints}đ`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

        {/* ════════════════════════════════════════════════════════════════════
            4. VARIANT: PUSH_YOUR_LUCK (Chồng Bài Xếp Lớp Vô Hạn Né Bom)
        ════════════════════════════════════════════════════════════════════ */}
        {(miniGameType === "PUSH_YOUR_LUCK" || miniGameType === "RADAR_WINDOWS") && phase === "PUSH_YOUR_LUCK" && (() => {
          const unopenedTile = tiles.find((t) => !t.isOpened && !optimisticOpenedIds.has(t.id));
          const openedTiles = tiles.filter((t) => t.isOpened || optimisticOpenedIds.has(t.id));
          const latestCard = lastFlippedTile || (openedTiles.length > 0 ? openedTiles[openedTiles.length - 1] : undefined);
          const nextCardNum = unopenedTile?.id ?? (cardsFlippedCount + 1);

          return (
            <div className="flex flex-col items-center justify-center space-y-2 sm:space-y-2.5 max-w-lg mx-auto py-1">
              {nextCardPeek && (() => {
                const displayTitle = (nextCardPeek.cleanTitle || nextCardPeek.storyTitle || "")
                  .replace(new RegExp(`^${nextCardPeek.icon}\\s*`), "")
                  .replace(/^[\p{Extended_Pictographic}\p{Emoji}\uFE0F\u200D\s]+/u, "")
                  .trim() || nextCardPeek.storyTitle;

                const displayBadge = nextCardPeek.pointBadge || (
                  nextCardPeek.deltaPoints !== undefined && nextCardPeek.deltaPoints > 0
                    ? `+${nextCardPeek.deltaPoints}đ`
                    : nextCardPeek.isBomb
                    ? "BẪY BOM"
                    : "AN TOÀN"
                );

                return (
                  <div className="w-full max-w-md px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-950/95 via-slate-900/95 to-cyan-950/95 border-2 border-cyan-400 text-cyan-200 text-xs shadow-xl animate-pulse">
                    {/* Hàng 1: Tiêu đề Mắt Thần + Badge Điểm Số Rõ Ràng + Badge An Toàn / Bẫy */}
                    <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-cyan-500/30">
                      <div className="flex items-center gap-1.5 font-black text-cyan-300 text-[11px] uppercase tracking-wider">
                        <span className="text-sm">👁️</span>
                        <span>Mắt Thần Soi Đỉnh Bài</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* BADGE SỐ ĐIỂM NỔI BẬT */}
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-black font-mono shadow-md border ${
                          nextCardPeek.isBomb
                            ? "bg-red-500/30 text-red-200 border-red-400/70"
                            : "bg-amber-400/25 text-amber-300 border-amber-300/80 shadow-amber-500/20"
                        }`}>
                          {displayBadge}
                        </span>
                        {/* BADGE AN TOÀN / BẪY BOM */}
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                          nextCardPeek.isBomb
                            ? "bg-red-600/40 text-red-100 border-red-400"
                            : "bg-emerald-600/40 text-emerald-100 border-emerald-400"
                        }`}>
                          {nextCardPeek.isBomb ? "💥 BẪY BOM!" : "✨ AN TOÀN!"}
                        </span>
                      </div>
                    </div>

                    {/* Hàng 2: Tên Lá Bài Soi Được - Không cắt ba chấm, không lặp icon */}
                    <div className="flex items-center gap-2 pt-1 text-white font-extrabold text-xs sm:text-sm">
                      <span className="text-base sm:text-lg leading-none shrink-0 drop-shadow">{nextCardPeek.icon}</span>
                      <span className="leading-snug break-words flex-1 text-cyan-50 drop-shadow-sm">
                        {displayTitle}
                      </span>
                    </div>
                  </div>
                );
              })()}
              {(peekUsesRemaining ?? 0) > 0 && !nextCardPeek && (
                <div className="w-full max-w-md px-3 py-1 rounded-xl bg-cyan-950/80 border border-cyan-400 text-cyan-200 text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-md">
                  <span>👁️ Mắt Thần Chủ Động:</span>
                  <span className="text-white">Bạn có {peekUsesRemaining} lượt chủ động bấm soi trước lá bài trên đỉnh!</span>
                </div>
              )}
              {getPerkType(promoPerk) === "SAFETY_NET_PROMO" && (
                <div className="w-full max-w-md px-3 py-1 rounded-xl bg-blue-950/80 border border-blue-400 text-blue-200 text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-md">
                  <span>🧲 Két Sắt Bảo Lưu:</span>
                  <span className="text-white">Bảo lưu 50% quỹ điểm nếu không may dính bom!</span>
                </div>
              )}
              {/* ── 2 Main Card Areas: Deck & Latest Drawn Card ── */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4 items-center justify-center w-full max-w-md">
                {/* ── LEFT: CHỒNG BÀI RÚT (STACKED DECK) ── */}
                <div className="flex flex-col items-center">
                  <div className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-300 mb-1 flex items-center gap-1">
                    <span>📚</span> BÀI RÚT (VÔ HẠN)
                  </div>

                  {/* 3D Stack container */}
                  <div
                    className="relative group cursor-pointer"
                    onClick={() => {
                      if (unopenedTile) {
                        handleTileClick(unopenedTile);
                      } else {
                        handleTileClick({
                          id: nextCardNum,
                          label: `Lá #${nextCardNum}`,
                          icon: "🃏",
                          isOpened: false,
                          type: "REWARD",
                          storyTitle: "Rút bài bí ẩn",
                          storyDescription: "",
                          effectType: "BONUS_POINTS",
                          deltaPoints: 20,
                        });
                      }
                    }}
                  >
                    {/* Depth shadow layer 3 */}
                    <div className="absolute inset-0 translate-x-2 translate-y-2 rounded-xl bg-indigo-950/70 border border-white/10 shadow-lg pointer-events-none" />
                    {/* Depth shadow layer 2 */}
                    <div className="absolute inset-0 translate-x-1 translate-y-1 rounded-xl bg-purple-950/80 border border-white/15 shadow-xl pointer-events-none" />

                    {/* Top card of the stack */}
                    <div
                      className={`relative w-28 sm:w-36 aspect-[3/4] max-h-[19vh] sm:max-h-[23vh] rounded-xl sm:rounded-2xl p-2 flex flex-col items-center justify-between border-2 transition-all duration-300 shadow-2xl ${
                        canInteract
                          ? "bg-gradient-to-b from-indigo-900 via-purple-950 to-slate-950 border-amber-400/80 hover:border-yellow-300 hover:-translate-y-1 hover:shadow-amber-500/40 active:scale-95 group-hover:scale-102"
                          : "bg-black/60 border-white/10 opacity-70 cursor-default"
                      } ${isDrawingAnimation ? "-translate-y-4 rotate-2 scale-105 ring-4 ring-amber-300" : ""}`}
                    >
                      <div className="w-full flex items-center justify-between text-[10px] font-mono font-bold text-amber-300">
                        <span>#{nextCardNum}</span>
                        <span className={`text-[8px] uppercase font-bold px-1 py-0.2 rounded border ${
                          nextCardPeek
                            ? "bg-cyan-500/30 text-cyan-200 border-cyan-400"
                            : "text-white/70 bg-black/40 border-white/10"
                        }`}>
                          {nextCardPeek ? "👁️ Đã soi" : "Chồng bài"}
                        </span>
                      </div>

                      {nextCardPeek ? (
                        <div className="my-auto flex flex-col items-center justify-center animate-pulse">
                          <span className="text-3xl sm:text-4xl drop-shadow-xl">{nextCardPeek.icon}</span>
                          <span className={`mt-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-black border shadow-sm ${
                            nextCardPeek.isBomb
                              ? "bg-red-500/40 text-red-200 border-red-400"
                              : "bg-amber-400/30 text-amber-200 border-amber-300"
                          }`}>
                            {nextCardPeek.pointBadge || (nextCardPeek.deltaPoints ? `+${nextCardPeek.deltaPoints}đ` : "✨")}
                          </span>
                        </div>
                      ) : (
                        <div className="text-2xl sm:text-3xl my-auto text-center drop-shadow-xl transition-transform duration-300 group-hover:scale-110 animate-pulse">
                          🃏
                        </div>
                      )}

                      <div className="w-full text-center">
                        <span className="text-[11px] sm:text-xs font-black text-white block">
                          Lá #{nextCardNum}
                        </span>
                        {canInteract && (
                          <span className="text-[8px] font-extrabold text-amber-300 uppercase tracking-widest mt-0.5 block animate-bounce">
                            CLICK RÚT ✨
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── RIGHT: LÁ BÀI VỪA RÚT (DRAWN CARD) ── */}
                <div className="flex flex-col items-center">
                  <div className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-emerald-300 mb-1 flex items-center gap-1">
                    <span>✨</span> LÁ VỪA RÚT
                  </div>

                  {latestCard ? (
                    <div
                      className={`w-28 sm:w-36 aspect-[3/4] max-h-[19vh] sm:max-h-[23vh] rounded-xl sm:rounded-2xl p-2 flex flex-col items-center justify-between border-2 shadow-2xl animate-fade-in relative ${
                        latestCard.type === "BOMB_DARK" || latestCard.type === "BOMB_DOOM"
                          ? "bg-gradient-to-b from-purple-950 via-black to-red-950 border-purple-500 text-purple-200 ring-2 ring-purple-500/40"
                          : latestCard.type === "BOMB_CHARITY" || latestCard.type === "BOMB_GIFT"
                          ? "bg-gradient-to-b from-amber-950 via-yellow-950 to-black border-amber-400 text-amber-200 ring-2 ring-amber-400/40"
                          : latestCard.type === "BOMB_SMOKE" || latestCard.type === "BOMB_MINOR"
                          ? "bg-gradient-to-b from-slate-900 via-stone-950 to-black border-slate-500 text-slate-200 ring-2 ring-slate-500/40"
                          : latestCard.effectType === "STEAL_POINTS"
                          ? "bg-gradient-to-b from-rose-950 via-purple-950 to-black border-rose-400 text-rose-200 ring-2 ring-rose-500/40"
                          : "bg-gradient-to-b from-amber-950/90 via-emerald-950/80 to-black border-emerald-400 text-emerald-200 ring-2 ring-emerald-400/30"
                      }`}
                    >
                      <div className="w-full flex items-center justify-between text-[10px]">
                        <span className="font-mono font-bold opacity-75">#{latestCard.id}</span>
                        <span
                          className={`text-[7px] font-black uppercase px-1.5 py-0.2 rounded-full ${
                            latestCard.type === "BOMB_DARK" || latestCard.type === "BOMB_DOOM"
                              ? "bg-purple-500/30 text-purple-300 border border-purple-400/50"
                              : latestCard.type === "BOMB_CHARITY" || latestCard.type === "BOMB_GIFT"
                              ? "bg-amber-500/30 text-amber-300 border border-amber-400/50"
                              : latestCard.type === "BOMB_SMOKE" || latestCard.type === "BOMB_MINOR"
                              ? "bg-slate-500/30 text-slate-300 border border-slate-400/50"
                              : latestCard.effectType === "STEAL_POINTS"
                              ? "bg-rose-500/30 text-rose-300 border border-rose-400/50"
                              : "bg-emerald-500/30 text-emerald-300 border border-emerald-400/50"
                          }`}
                        >
                          {latestCard.type === "BOMB_DARK" || latestCard.type === "BOMB_DOOM"
                            ? "BOM HẮC ÁM"
                            : latestCard.type === "BOMB_CHARITY" || latestCard.type === "BOMB_GIFT"
                            ? "BOM TỪ THIỆN"
                            : latestCard.type === "BOMB_SMOKE" || latestCard.type === "BOMB_MINOR"
                            ? "BOM KHÓI"
                            : latestCard.effectType === "STEAL_POINTS"
                            ? "CƯỚP 🗡️"
                            : "THƯỞNG"}
                        </span>
                      </div>

                      <div className="text-2xl sm:text-3xl my-auto text-center drop-shadow-xl">
                        {latestCard.icon}
                      </div>

                      <div className="w-full text-center">
                        <p className="text-[10px] sm:text-xs font-black text-white leading-tight truncate">
                          {latestCard.storyTitle}
                        </p>
                        <p
                          className={`text-[10px] sm:text-xs font-black font-mono mt-0.2 ${
                            latestCard.type === "BOMB_DARK" || latestCard.type === "BOMB_DOOM"
                              ? "text-purple-300"
                              : latestCard.type === "BOMB_CHARITY" || latestCard.type === "BOMB_GIFT"
                              ? "text-amber-300"
                              : latestCard.type === "BOMB_SMOKE" || latestCard.type === "BOMB_MINOR"
                              ? "text-slate-300"
                              : latestCard.effectType === "MULTIPLY_X2"
                              ? "text-purple-300"
                              : latestCard.effectType === "STEAL_POINTS"
                              ? "text-rose-300"
                              : "text-amber-300"
                          }`}
                        >
                          {latestCard.type === "BOMB_DARK" || latestCard.type === "BOMB_DOOM"
                            ? "Trừ Điểm Chia Đều"
                            : latestCard.type === "BOMB_CHARITY" || latestCard.type === "BOMB_GIFT"
                            ? "Tặng 50% Cho #1"
                            : latestCard.type === "BOMB_SMOKE" || latestCard.type === "BOMB_MINOR"
                            ? "Mất Hũ (0đ)"
                            : latestCard.effectType === "MULTIPLY_X2"
                            ? "X2 HŨ ĐIỂM"
                            : latestCard.effectType === "STEAL_POINTS"
                            ? `Cướp +${latestCard.deltaPoints}đ`
                            : `+${latestCard.deltaPoints}đ`}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-28 sm:w-36 aspect-[3/4] max-h-[19vh] sm:max-h-[23vh] rounded-xl sm:rounded-2xl p-2 border-2 border-dashed border-white/20 flex flex-col items-center justify-center text-center text-white/50 bg-black/20">
                      <span className="text-2xl mb-1">📭</span>
                      <span className="text-[11px] font-bold text-white/80">Chưa rút lá nào</span>
                      <span className="text-[9px] text-white/40 mt-0.5">
                        Rút lá đầu tiên!
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── ACTION BUTTONS: RÚT TIẾP & CHỐT ĐIỂM ── */}
              {canInteract && (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (unopenedTile) {
                        handleTileClick(unopenedTile);
                      } else {
                        handleTileClick({
                          id: nextCardNum,
                          label: `Lá #${nextCardNum}`,
                          icon: "🃏",
                          isOpened: false,
                          type: "REWARD",
                          storyTitle: "Rút bài bí ẩn",
                          storyDescription: "",
                          effectType: "BONUS_POINTS",
                          deltaPoints: 20,
                        });
                      }
                    }}
                    className="px-4 sm:px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm shadow-xl border border-purple-400 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>🃏</span>
                    <span>RÚT 1 LÁ (#{nextCardNum})</span>
                  </button>

                  {canCashOut && (
                    <button
                      type="button"
                      disabled={isCashingOut}
                      onClick={() => {
                        if (isCashingOut) return;
                        setIsCashingOut(true);
                        onCashOut?.();
                      }}
                      className={`px-4 sm:px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-green-500 to-emerald-600 hover:from-emerald-500 hover:to-green-400 text-white font-black text-xs sm:text-sm shadow-xl border border-emerald-300 transition-all flex items-center gap-1.5 ${
                        isCashingOut
                          ? "opacity-60 cursor-not-allowed scale-95"
                          : "hover:scale-105 active:scale-95 cursor-pointer animate-pulse"
                      }`}
                    >
                      <span>{isCashingOut ? "⏳" : "💰"}</span>
                      <span>{isCashingOut ? "ĐANG CHỐT..." : `CHỐT ĐIỂM (+${potPoints}Đ)`}</span>
                    </button>
                  )}

                  {canInteract && (peekUsesRemaining ?? 0) > 0 && !nextCardPeek && (
                    <button
                      type="button"
                      onClick={() => onUsePeek?.()}
                      className="px-4 sm:px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 via-teal-600 to-cyan-600 hover:from-cyan-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-xl border border-cyan-300 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer animate-pulse"
                    >
                      <span>👁️</span>
                      <span>SOI ĐỈNH BÀI ({peekUsesRemaining})</span>
                    </button>
                  )}
                </div>
              )}

              {/* ── DRAW HISTORY TRAIL ── */}
              {openedTiles.length > 0 && (
                <div className="w-full max-w-md mx-auto p-2 rounded-xl bg-black/40 border border-white/10 text-left max-h-16 overflow-y-auto">
                  <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider block mb-1">
                    📜 LỊCH SỬ ({openedTiles.length} lá):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {openedTiles.map((t, idx) => (
                      <span
                        key={t.id || idx}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                          t.type !== "REWARD"
                            ? "bg-red-950/60 border-red-500/50 text-red-300"
                            : "bg-emerald-950/60 border-emerald-500/50 text-emerald-300"
                        }`}
                      >
                        <MinigameSvgIcon nameOrEmoji={t.icon} className="w-3.5 h-3.5" glow={false} />
                        <span>#{t.id}:</span>
                        <span>
                          {t.type !== "REWARD"
                            ? t.type === "BOMB_DARK" || t.type === "BOMB_DOOM"
                              ? "Hắc Ám"
                              : t.type === "BOMB_CHARITY" || t.type === "BOMB_GIFT"
                              ? "Từ Thiện"
                              : "Khói"
                            : t.effectType === "MULTIPLY_X2"
                            ? "x2"
                            : `+${t.deltaPoints}đ`}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
        </div>
      )}

      {/* ── Modal Chọn Đội Cướp Điểm (STEAL_TARGET_SELECT) ── */}
      {phase === "STEAL_TARGET_SELECT" && mysteryState.pendingSteal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 animate-fade-in">
          <div className="glass bg-gradient-to-br from-rose-950/95 via-purple-950/95 to-slate-950/95 border-2 border-rose-500 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center shadow-[0_0_60px_rgba(244,63,94,0.4)] animate-bounce-in space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center text-3xl shadow-inner animate-pulse">
              {mysteryState.pendingSteal.tileIcon || "🗡️"}
            </div>

            <div className="space-y-1">
              <span className="px-3 py-1 rounded-full bg-rose-500/30 border border-rose-400/50 text-rose-300 font-black text-xs uppercase tracking-widest">
                {mysteryState.pendingSteal.sourceCardKey ? "THỰC THI LÁ BÀI TAROT" : "KÍCH HOẠT THẺ CƯỚP ĐIỂM"}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white pt-1">
                {mysteryState.pendingSteal.tileTitle || "Đoạt Bảo Thành Công!"}
              </h2>
              <div className="text-sm text-rose-200/90 font-medium space-y-1">
                <p>
                  {mysteryState.pendingSteal.baseBonusPoints && mysteryState.pendingSteal.baseBonusPoints > 0 ? (
                    <>
                      Nhận thưởng <strong className="text-emerald-300 font-mono font-black">+{mysteryState.pendingSteal.baseBonusPoints}đ</strong> và được quyền cướp <strong className="text-yellow-300 font-mono font-black">+{mysteryState.pendingSteal.stolenPoints}đ</strong> từ đối thủ!
                    </>
                  ) : (
                    <>
                      Được quyền cướp <strong className="text-yellow-300 font-mono text-base font-black">+{mysteryState.pendingSteal.stolenPoints}đ</strong> từ một đối thủ đủ điều kiện!
                    </>
                  )}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                  {mysteryState.pendingSteal.healHeartSelf && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-300 text-xs font-bold">
                      ❤️ Hồi 1 Tim
                    </span>
                  )}
                  {mysteryState.pendingSteal.grantShieldSelf && (
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-bold">
                      🛡️ Nhận Khiên Thần
                    </span>
                  )}
                  {mysteryState.pendingSteal.grantShieldVictim && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 text-xs font-bold">
                      🛡️ Đối Thủ Cũng Nhận Khiên
                    </span>
                  )}
                  {mysteryState.pendingSteal.breakVictimShield && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold">
                      ⚡ Phá Khiên Đối Thủ
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Danh sách các đội đủ điều kiện để cướp */}
            <div className="space-y-2 max-h-56 overflow-y-auto pt-2">
              <p className="text-xs font-bold text-white/60 uppercase tracking-wider text-left">
                CHỌN ĐỐI THỦ ĐỂ CƯỚP (ĐIỂM ≥ {mysteryState.pendingSteal.stolenPoints}Đ):
              </p>
              {(() => {
                const eligibleTeams = (teams || []).filter((t) =>
                  mysteryState.pendingSteal?.eligibleTeamIds?.includes(t.id)
                );
                if (eligibleTeams.length === 0) {
                  return (
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white/70">
                      Không có đối thủ nào đủ điều kiện cướp điểm.
                    </div>
                  );
                }
                return eligibleTeams.map((t) => {
                  const afterScore = Math.max(0, t.score - (mysteryState.pendingSteal?.stolenPoints || 0));
                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-white/10 border border-white/15 hover:border-rose-400/60 transition group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow"
                          style={{ backgroundColor: t.color }}
                        />
                        <div className="text-left min-w-0">
                          <p className="font-bold text-sm text-white truncate">{t.name}</p>
                          <p className="text-xs text-slate-300 font-mono">
                            Hiện có: <strong className="text-amber-300">{t.score}đ</strong> ➔ Còn: <span className="text-rose-300 font-bold">{afterScore}đ</span>
                          </p>
                        </div>
                      </div>

                      {(isMyTurn || isAdmin) ? (
                        <button
                          type="button"
                          onClick={() => onChooseStealTarget?.(t.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs shadow-md border border-rose-400 hover:scale-105 active:scale-95 transition cursor-pointer shrink-0"
                        >
                          CƯỚP 🗡️
                        </button>
                      ) : (
                        <span className="text-xs text-white/40 italic">Đang chờ chọn...</span>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            {!(isMyTurn || isAdmin) && (
              <p className="text-xs text-slate-400 italic animate-pulse">
                Đang chờ Đội {currentTurnTeamName} lựa chọn đối thủ để cướp điểm...
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Footer Standings / Quick Score Bar ── */}
      {teams && teams.length > 0 && (
        <div className="relative z-10 mt-2 pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-white/60 font-semibold uppercase tracking-wider text-[11px]">
              BẢNG ĐIỂM TRẬN ĐẤU:
            </span>
            {(isAdmin || isSandbox) && onAdjustScore && (
              <button
                type="button"
                onClick={() => setShowScoreEditModal(true)}
                className="px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[10px] font-bold cursor-pointer transition flex items-center gap-1"
                title="Chỉnh sửa điểm thủ công cho các đội thi"
              >
                <span>✏️</span>
                <span>Sửa điểm</span>
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {teams.map((t) => {
              const currentHearts = t.hearts ?? mysteryState?.teamHearts?.[t.id] ?? mysteryState?.initialHeartsPerTeam ?? 0;
              const maxHearts = mysteryState?.teamMaxHearts?.[t.id] ?? mysteryState?.initialHeartsPerTeam ?? 3;
              const curTurn = mysteryState?.currentTurnIndex || 0;
              const immunity = mysteryState?.teamImmunities?.[t.id];
              const isImmuneActive = Boolean(immunity && curTurn >= immunity.activeFromTurnIndex && curTurn <= immunity.expiresAfterTurnIndex);
              const shield = mysteryState?.teamShields?.[t.id];
              const isShieldActive = Boolean(shield && curTurn >= shield.activeFromTurnIndex && curTurn <= shield.expiresAfterTurnIndex);

              // Calculate specific score delta for this team if Tarot was drawn
              let tarotDelta: number | null = null;
              if (miniGameType === "TAROT_DESTINY" && tarotState?.isDrawn && tarotState?.drawnCard) {
                const dc = tarotState.drawnCard;
                if (t.id === currentTurnTeamId) {
                  if (dc.key === "THE_FOOL") {
                    tarotDelta = 0;
                  } else {
                    tarotDelta = dc.scoreDelta ?? null;
                  }
                } else {
                  if (t.id === dc.victimTeamId && dc.stolenPoints) {
                    tarotDelta = -dc.stolenPoints;
                  } else if (t.id === dc.recipientTeamId && dc.giftedPoints) {
                    tarotDelta = dc.giftedPoints;
                  } else if (dc.hierophantPenalties) {
                    const pen = dc.hierophantPenalties.find((p: any) => p.teamId === t.id);
                    if (pen) tarotDelta = -pen.points;
                  } else if (dc.temperanceBonusRecipients) {
                    const rec = dc.temperanceBonusRecipients.find((r: any) => r.teamId === t.id);
                    if (rec) tarotDelta = rec.points;
                  } else if (dc.darkBombRecipients) {
                    const rec = dc.darkBombRecipients.find((r: any) => r.teamId === t.id);
                    if (rec) tarotDelta = rec.points;
                  }
                }
              }

              return (
                <div
                  key={t.id}
                  onClick={() => {
                    if ((isAdmin || isSandbox) && onAdjustScore) {
                      setShowScoreEditModal(true);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border transition relative ${
                    (isAdmin || isSandbox) && onAdjustScore ? "cursor-pointer hover:border-amber-400/60" : ""
                  } ${
                    t.id === currentTurnTeamId
                      ? "bg-white/15 border-white/40 text-white font-bold"
                      : "bg-black/30 border-white/10 text-white/70"
                  }`}
                  title={(isAdmin || isSandbox) && onAdjustScore ? `Nhấp để sửa điểm cho ${t.name}` : undefined}
                >
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                  <span>{t.name}:</span>
                  <span className="font-mono font-bold text-amber-300">{t.score.toLocaleString()}đ</span>
                  <span className="flex items-center gap-0.5 text-xs text-rose-400 font-bold ml-1 bg-rose-950/40 px-1.5 py-0.5 rounded-md border border-rose-500/30" title={`${currentHearts}/${maxHearts} Tim`}>
                    ❤️ {currentHearts}/{maxHearts}
                  </span>
                  {isImmuneActive && (
                    <span
                      className="flex items-center gap-0.5 text-[10px] text-amber-200 font-bold ml-1 bg-amber-950/70 px-1.5 py-0.5 rounded-md border border-amber-400/50 shadow-[0_0_8px_rgba(245,158,11,0.35)] animate-pulse"
                      title="Bùa Miễn Nhiễm 🌙: Miễn nhiễm cướp điểm và bẫy phạt trọn vòng thi đấu"
                    >
                      🌙 Bùa Miễn Nhiễm
                    </span>
                  )}
                  {isShieldActive && !isImmuneActive && (
                    <span
                      className="flex items-center gap-0.5 text-[10px] text-cyan-200 font-bold ml-1 bg-cyan-950/70 px-1.5 py-0.5 rounded-md border border-cyan-400/50 shadow-[0_0_8px_rgba(6,182,212,0.35)]"
                      title="Khiên Thần Hộ Thể 🛡️: Hấp thụ đòn tấn công / bẫy phạt tiếp theo"
                    >
                      🛡️ Khiên
                    </span>
                  )}
                  {/* Floating brief score delta indicator for Divine Eye / Mắt Thần */}
                  {tarotDelta !== null && tarotDelta !== 0 && (
                    <span
                      className={`ml-1 font-mono font-black text-xs px-1.5 py-0.5 rounded-md border animate-bounce ${
                        tarotDelta > 0
                          ? "bg-emerald-500/30 text-emerald-300 border-emerald-400"
                          : "bg-rose-500/30 text-rose-300 border-rose-400"
                      }`}
                    >
                      {tarotDelta > 0 ? `+${tarotDelta}` : `${tarotDelta}`}
                    </span>
                  )}
                  {(isAdmin || isSandbox) && onAdjustScore && (
                    <span className="text-[9px] text-amber-400/80 ml-0.5">✏️</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Modal Chỉnh Sửa Điểm Thủ Công (Admin / MC) ── */}
      {showScoreEditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#14162a] border border-amber-400/50 rounded-2xl p-5 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">✏️</span>
                <h3 className="font-black text-sm uppercase tracking-wider text-amber-300">
                  Chỉnh sửa điểm thủ công (Admin / MC)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowScoreEditModal(false)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-white/70 leading-relaxed">
              Tính năng can thiệp trực tiếp dành cho Host/MC để điều chỉnh hoặc khắc phục điểm số ngay lập tức khi phát sinh sự cố.
            </p>

            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {teams.map((t) => (
                <div
                  key={t.id}
                  className="p-3 rounded-xl bg-black/40 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                    <div>
                      <span className="font-bold text-xs">{t.name}</span>
                      <span className="block font-mono font-black text-amber-300 text-sm">{t.score}đ</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onAdjustScore?.(t.id, 10)}
                      className="px-2 py-1 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-white font-mono font-bold text-xs cursor-pointer active:scale-95 transition"
                    >
                      +10
                    </button>
                    <button
                      type="button"
                      onClick={() => onAdjustScore?.(t.id, 20)}
                      className="px-2 py-1 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-white font-mono font-bold text-xs cursor-pointer active:scale-95 transition"
                    >
                      +20
                    </button>
                    <button
                      type="button"
                      onClick={() => onAdjustScore?.(t.id, -10)}
                      className="px-2 py-1 rounded-lg bg-rose-700/80 hover:bg-rose-600 text-white font-mono font-bold text-xs cursor-pointer active:scale-95 transition"
                    >
                      -10
                    </button>
                    <button
                      type="button"
                      onClick={() => onAdjustScore?.(t.id, -20)}
                      className="px-2 py-1 rounded-lg bg-rose-700/80 hover:bg-rose-600 text-white font-mono font-bold text-xs cursor-pointer active:scale-95 transition"
                    >
                      -20
                    </button>

                    <div className="flex items-center gap-1 ml-1">
                      <input
                        type="number"
                        min={0}
                        step={5}
                        defaultValue={t.score}
                        id={`mystery-score-input-${t.id}`}
                        className="w-16 px-1.5 py-1 rounded-lg bg-black/60 border border-amber-400/50 text-amber-200 text-xs font-mono font-bold text-center focus:outline-none focus:ring-1 focus:ring-amber-400"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.getElementById(`mystery-score-input-${t.id}`) as HTMLInputElement;
                          if (input) {
                            const val = parseInt(input.value, 10);
                            if (!isNaN(val)) onAdjustScore?.(t.id, undefined, val);
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs cursor-pointer shadow active:scale-95 transition"
                      >
                        Đặt
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowScoreEditModal(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Modal Chi Tiết Luật Chơi Minigame ── */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-5 animate-fade-in">
          <div className="w-full max-w-2xl bg-gradient-to-b from-slate-900 via-indigo-950/95 to-slate-950 border-2 border-amber-400/80 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📖</span>
                <div>
                  <h3 className="font-black text-sm sm:text-base uppercase tracking-wider text-amber-300">
                    Cẩm Nang Luật Chơi Minigame
                  </h3>
                  <p className="text-[11px] text-white/60">
                    Nắm vững cơ chế thưởng phạt để tối ưu hóa điểm số và tránh bẫy bom
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white cursor-pointer transition text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Minigame Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10 shrink-0 overflow-x-auto">
              {[
                { key: "MEMORY_PAIRS", label: "🃏 Lật Cặp", icon: "🃏" },
                { key: "ONE_SHOT_DOORS", label: "🚪 8 Cửa", icon: "🚪" },
                { key: "PUSH_YOUR_LUCK", label: "📚 Lật Liều", icon: "📚" },
                { key: "TAROT_DESTINY", label: "🔮 Tarot", icon: "🔮" },
              ].map((tab) => {
                const isActive = rulesModalTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setRulesModalTab(tab.key as MysteryMiniGameType)}
                    className={`flex-1 min-w-[90px] py-1.5 px-2 rounded-lg font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      isActive
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/30 scale-[1.02]"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Details (Scrollable) */}
            {(() => {
              const ruleData = MINIGAME_RULES[rulesModalTab] || MINIGAME_RULES.PUSH_YOUR_LUCK;
              return (
                <div className="space-y-3.5 overflow-y-auto pr-1 flex-1 text-left text-xs">
                  {/* Minigame Title Banner */}
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2">
                    <span className="font-black text-sm text-amber-200 flex items-center gap-2">
                      <span className="text-xl">{ruleData.icon}</span>
                      <span>{ruleData.title}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      {ruleData.badge}
                    </span>
                  </div>

                  {/* 3 Core Steps */}
                  <div className="space-y-2">
                    <h4 className="font-black text-[11px] text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🎯</span> QUY TRÌNH THỰC HIỆN (3 BƯỚC):
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {ruleData.steps.map((st, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1 hover:border-amber-400/30 transition"
                        >
                          <div className="flex items-center gap-1.5">
                            <MinigameSvgIcon nameOrEmoji={st.icon} className="w-4 h-4 shrink-0" glow={false} />
                            <strong className="text-white font-bold text-xs">{st.step}</strong>
                          </div>
                          <p className="text-[11px] text-white/75 leading-relaxed">{st.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 4 Detail Boxes: Rewards, Risks, Survival, Protection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {/* Rewards */}
                    <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-300 font-black text-xs uppercase">
                        <span>🎁</span> Cơ Cấu Thưởng
                      </div>
                      <p className="text-[11px] text-white/80 leading-relaxed">{ruleData.rewardMechanic}</p>
                    </div>

                    {/* Risks */}
                    <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 space-y-1">
                      <div className="flex items-center gap-1.5 text-rose-300 font-black text-xs uppercase">
                        <span>⚠️</span> Rủi Ro & Bẫy Bom
                      </div>
                      <p className="text-[11px] text-white/80 leading-relaxed">{ruleData.riskMechanic}</p>
                    </div>

                    {/* Survival Mode */}
                    <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 space-y-1">
                      <div className="flex items-center gap-1.5 text-purple-300 font-black text-xs uppercase">
                        <span>💀</span> Chế Độ Sinh Tử (Khi Trả Lời Sai)
                      </div>
                      <p className="text-[11px] text-white/80 leading-relaxed">{ruleData.survivalMechanic}</p>
                    </div>

                    {/* Shield & Protection */}
                    <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 space-y-1">
                      <div className="flex items-center gap-1.5 text-blue-300 font-black text-xs uppercase">
                        <span>🛡️</span> Khiên Thần & Bảo Hộ
                      </div>
                      <p className="text-[11px] text-white/80 leading-relaxed">
                        Khi đội sở hữu Khiên Thần (SHIELD_PROMO), nếu dính phải bẫy bom bất kỳ sẽ tự động hấp thụ toàn bộ hình phạt và bảo toàn điểm gốc câu hỏi!
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10 shrink-0">
              <span className="text-[11px] text-white/50 italic">
                * Áp dụng đồng bộ cho cả trận thi đấu chính thức và chế độ Sandbox Studio.
              </span>
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs shadow-lg shadow-amber-500/30 cursor-pointer active:scale-95 transition"
              >
                ✓ Đã Hiểu / Bắt Đầu Ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
