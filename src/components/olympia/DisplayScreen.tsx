"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { ROUND_LABELS, type OlympiaState, type RulesetId, type AudioSeason } from "@/lib/olympia/types";
import { RULESETS } from "@/lib/olympia/rulesets";
import { parseVcnvAnswer, stripVcnvLetterCount, cleanVcnvWord } from "@/lib/olympia/engine";
import { useOlympiaAudio, useOlympiaSocket } from "./hooks";
import { CircularTimer, MediaView, ScoreStrip, SEAT_COLORS, Timer, activeSeats, seatName, resolveMediaUrl } from "./ui";
import { getCurrentQuestionMedia } from "./HostConsole";
import { useOlympiaCameraState } from "./studio/useOlympiaCamera";
import {
  Vtv3ChalkboardBackdrop,
  Vtv3ChalkboardQuestionFrame,
  ClassicUnifiedLowerThird,
  UnifiedOlympiaAnswerOverlay,
  Vtv3ClassicSingleAnswerBar,
  Vtv3ClassicSummaryGraphic,
  VcnvCountdownGraphic,
  VcnvAnswerRevealGraphic,
  TangTocQuestionGraphic,
  TangTocRankedAnswersGraphic,
  GlossyBlackDomeButton,
  BlueSquareNumberBadge,
  SummaryLowerThirdGraphic,
  EconovaLowerThirdV3,
  VeDichSlantedGridGraphic,
  V3SingleAnswerBar,
  Olympia22BackgroundBackdrop,
  BroadcastRoundIntroOverlay,
} from "./Vtv3BroadcastGraphics";
import { preloadOlympiaIntroVideos } from "@/lib/olympia/assetCache";
import {
  isTtsEnabled,
  setTtsEnabled,
  speakTTS,
  cancelTTS,
  speakSmartQuestion,
  smoothStopOlympiaTTS,
  speakOlympiaResult,
  speakRoundIntroTTS,
  summarizeOlympiaAnswer,
  handleBuzzerInterrupt,
  scheduleDramaticStealCall,
  cancelDramaticStealCall,
  speakCnvBells,
  groupContestantAnswers,
  generateGroupedAnswerCommentary,
  generateTangTocTimeCallout,
  resolveTurnHosts,
} from "@/lib/olympia/tts";

const OlympiaStudio3DScene = dynamic(() => import("./OlympiaStudio3DScene"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-[#020510] text-amber-300 text-sm font-bold">
      Đang kết nối Trường quay 3D…
    </div>
  ),
});

function hasActiveRoundContent(state: OlympiaState): boolean {
  if (
    state.stage !== "playing" ||
    !state.currentRound ||
    state.summaryState?.active ||
    state.roundStatus[state.currentRound] === "done"
  ) {
    return false;
  }

  switch (state.currentRound) {
    case "khoiDong": {
      const kd = state.khoiDong;
      if (!kd || !kd.started || kd.phase === "segmentDone" || kd.phase === "intro") return false;
      // Trong 3.5s đầu khi âm ready đang phát (kdIntroTimer đang chạy), đồ hoạ hạ 1/3 CHƯA HIỆN.
      // Hết 3.5s, kdIntroTimer biến mất và âm open_question phát, đồ hoạ mới bung mở ở trạng thái Câu 0/6 ruột trống.
      if (state.kdIntroTimer && (state.kdIntroTimer.remainingMs > 0 || state.kdIntroTimer.startedAt)) return false;
      return true;
    }
    case "vcnv": {
      const v = state.vcnv;
      if (!v) return false;
      return (
        v.phase === "grid" ||
        v.phase === "selecting" ||
        v.phase === "question" ||
        v.phase === "waitingAnswer" ||
        v.phase === "answers" ||
        v.phase === "done" ||
        Boolean(v.answersRevealed)
      );
    }
    case "tangToc": {
      const tt = state.tangToc;
      if (!tt) return false;
      return tt.phase === "question" || tt.phase === "ranking" || tt.phase === "graded";
    }
    case "veDich": {
      const vd = state.veDich;
      if (!vd || vd.phase === "seatDone" || vd.phase === "idle") return false;
      return (
        vd.phase === "choosing" ||
        vd.phase === "packageReady" ||
        vd.phase === "thinking" ||
        vd.phase === "stealing" ||
        vd.phase === "result"
      );
    }
    case "cauHoiPhu": {
      const chp = state.cauHoiPhu;
      if (!chp) return false;
      return chp.phase === "question" || chp.phase === "result";
    }
    default:
      return false;
  }
}


function ContestantIntroChyron({ state }: { state: OlympiaState }) {
  if (!state.entranceState?.active) return null;
  const currentIdx = Math.min(
    Math.max(0, state.entranceState.currentSeatIdx ?? 0),
    Math.max(0, state.seats.length - 1)
  );
  const currentSeat = state.seats[currentIdx];
  if (!currentSeat) return null;

  const seatName = (currentSeat.name || `Thí sinh ${currentIdx + 1}`).toUpperCase();
  const seatSchool = currentSeat.school?.trim();
  const seatNumber = currentIdx + 1;
  const seatColor = SEAT_COLORS[currentIdx] || "#00f0ff";

  return (
    <div className="absolute bottom-6 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
      <div className="w-full max-w-2xl rounded-2xl border border-white/20 shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-xl bg-gradient-to-r from-slate-950/95 via-[#0b1636]/95 to-slate-950/95 overflow-hidden flex items-stretch">
        {/* Seat Number Tag */}
        <div
          className="w-16 sm:w-20 shrink-0 flex flex-col items-center justify-center font-black border-r border-white/10"
          style={{ background: `linear-gradient(135deg, ${seatColor}33, ${seatColor}11)` }}
        >
          <span className="text-[10px] sm:text-xs text-slate-300 uppercase tracking-widest">Vị trí</span>
          <span className="text-2xl sm:text-3xl font-black" style={{ color: seatColor }}>
            {seatNumber}
          </span>
        </div>

        {/* Contestant Name & School */}
        <div className="flex-1 py-3 px-4 sm:px-6 flex flex-col justify-center min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 text-sm sm:text-base">👑</span>
            <h3
              className="text-lg sm:text-2xl font-black tracking-wide truncate text-white"
              style={{
                textShadow: "0 2px 8px rgba(0,0,0,0.8)",
              }}
            >
              {seatName}
            </h3>
          </div>
          {seatSchool && (
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-cyan-300 font-bold text-xs sm:text-sm tracking-wide truncate flex items-center gap-1.5">
                <span>🏫</span>
                <span>{seatSchool}</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DisplayScreen({ code }: { code: string }) {
  const { state, join, connected, emit, serverNow } = useOlympiaSocket({ code, role: "display" });
  const isExplicitMuteParam =
    typeof window !== "undefined" &&
    (new URLSearchParams(window.location.search).get("mute") === "1" ||
      new URLSearchParams(window.location.search).get("audio") === "0");
  const isSandboxParam =
    typeof window !== "undefined" &&
    (window.location.search.includes("sandbox=1") ||
      window.location.search.includes("preview=1") ||
      window.self !== window.top);
  const [audioOn, setAudioOn] = useState(!isExplicitMuteParam);
  const [ttsActive, setTtsActive] = useState<boolean>(() => isTtsEnabled());

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "UNLOCK_AUDIO") {
        if (!isExplicitMuteParam) {
          setAudioOn(true);
        }
        if (typeof (window as any).__OLYMPIA_UNLOCK_AUDIO__ === "function") {
          (window as any).__OLYMPIA_UNLOCK_AUDIO__();
        }
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          try {
            if (window.speechSynthesis.paused) window.speechSynthesis.resume();
          } catch {}
        }
      } else if (e.data?.type === "SET_TTS") {
        setTtsActive(Boolean(e.data.enabled));
        setTtsEnabled(Boolean(e.data.enabled));
      }
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "olympia_tts_enabled") {
        setTtsActive(e.newValue !== "false" && e.newValue !== "0");
      }
    };
    window.addEventListener("message", handleMessage);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("storage", handleStorage);
    };
  }, [isExplicitMuteParam]);

  useEffect(() => {
    (window as any).__OLYMPIA_CALL__ = (actionType: string, payload?: any) => {
      emit("action", { type: actionType, ...(payload || {}) });
    };
    return () => {
      if ((window as any).__OLYMPIA_CALL__) {
        delete (window as any).__OLYMPIA_CALL__;
      }
    };
  }, [emit]);

  useEffect(() => {
    preloadOlympiaIntroVideos();
  }, []);

  const handleUserUnlock = useCallback(() => {
    if (typeof (window as any).__OLYMPIA_UNLOCK_AUDIO__ === "function") {
      (window as any).__OLYMPIA_UNLOCK_AUDIO__();
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      } catch {}
    }
    if (!audioOn && !isExplicitMuteParam) {
      setAudioOn(true);
    }
  }, [audioOn, isExplicitMuteParam]);

  const urlRuleset =
    typeof window !== "undefined"
      ? (new URLSearchParams(window.location.search).get("ruleset") as RulesetId | null)
      : null;
  const urlSeason =
    typeof window !== "undefined"
      ? (urlRuleset && RULESETS[urlRuleset]?.audioSeason) ||
        (new URLSearchParams(window.location.search).get("season") as AudioSeason | null)
      : null;

  const effectiveAudioSeason =
    (state?.rulesetId && RULESETS[state.rulesetId]?.audioSeason) ||
    join?.audioSeason ||
    urlSeason ||
    "O26";

  useOlympiaAudio(state, effectiveAudioSeason, audioOn);

  // Auto-camera and question overlay visibility state
  const cameraState = useOlympiaCameraState(state, serverNow);

  // Camera Reset & Auto-Director Handler (R3)
  const handleResetCamera = useCallback(() => {
    emit("action", { type: "studio:camera:auto" });
    emit("action", { type: "studio:camera:reset", all: true });
  }, [emit]);

  // Studio 3D Pure View Toggle Handler (R1)
  const handleToggleStudio = useCallback(() => {
    emit("action", { type: "studio:toggle" });
  }, [emit]);

  // Global Keyboard Shortcuts 'R' for Camera Reset, 'H' for Studio 3D Toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        handleResetCamera();
      }
      if (e.key === "h" || e.key === "H") {
        e.preventDefault();
        handleToggleStudio();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleResetCamera, handleToggleStudio]);

  const isCameraManual = Boolean(state?.studioCameraManual);
  const isCameraPtzActive = Boolean(
    state?.studioCameraPtz && Object.keys(state.studioCameraPtz).length > 0
  );
  const isCameraOverridden = isCameraManual || isCameraPtzActive;

  // Automated Vietnamese Smart TTS question reading with season speed calibration & role alternation
  const lastQuestionRef = useRef<string>("");
  useEffect(() => {
    if (!state || !ttsActive) return;
    let currentQ = "";
    let questionSeatId: number | undefined;

    if (
      state.currentRound === "khoiDong" &&
      state.khoiDong?.started &&
      state.khoiDong?.questionRevealed &&
      state.khoiDong.phase !== "intro" &&
      state.khoiDong.phase !== "segmentDone" &&
      state.khoiDong.current?.q
    ) {
      currentQ = state.khoiDong.current.q;
      const curSeg = state.khoiDong.segments?.[state.khoiDong.segIdx];
      questionSeatId = curSeg?.kind === "solo" ? curSeg.seat : undefined;
    } else if (state.currentRound === "vcnv" && state.vcnv?.phase === "question") {
      const curIdx = state.vcnv.currentRow;
      const isCenter = curIdx === 4;
      const rawQ = isCenter ? (state.vcnv.centerQuestion?.q || "") : (state.vcnv.rows[curIdx]?.hint || "");
      currentQ = stripVcnvLetterCount(rawQ);
    } else if (state.currentRound === "tangToc" && state.tangToc?.phase === "question") {
      const tt = state.tangToc;
      currentQ = tt.questions[tt.qIdx]?.q || "";
    } else if (
      state.currentRound === "veDich" &&
      state.veDich?.current?.q?.q &&
      (state.veDich.phase === "thinking" || state.veDich.phase === "stealing")
    ) {
      currentQ = state.veDich.current.q.q;
      questionSeatId = state.veDich.order[state.veDich.turnIdx];
    } else if (state.currentRound === "cauHoiPhu" && state.cauHoiPhu?.phase === "question") {
      const cp = state.cauHoiPhu;
      currentQ = cp.questions[cp.qIdx]?.q || "";
    }

    if (currentQ && currentQ !== lastQuestionRef.current) {
      lastQuestionRef.current = currentQ;
      speakSmartQuestion(currentQ, {
        season: effectiveAudioSeason,
        round: state.currentRound || undefined,
        seatId: questionSeatId,
        segIdx: state.currentRound === "khoiDong" ? state.khoiDong?.segIdx : undefined,
        rowIdx: state.currentRound === "vcnv" ? state.vcnv?.currentRow : undefined,
      });
    } else if (!currentQ) {
      lastQuestionRef.current = "";
      cancelTTS();
    }
  }, [
    ttsActive,
    effectiveAudioSeason,
    state?.currentRound,
    state?.khoiDong?.started,
    state?.khoiDong?.questionRevealed,
    state?.khoiDong?.phase,
    state?.khoiDong?.current?.q,
    state?.khoiDong?.segIdx,
    state?.vcnv?.phase,
    state?.vcnv?.currentRow,
    state?.tangToc?.phase,
    state?.tangToc?.qIdx,
    state?.veDich?.phase,
    state?.veDich?.current?.q?.q,
    state?.veDich?.order,
    state?.veDich?.turnIdx,
    state?.cauHoiPhu?.phase,
    state?.cauHoiPhu?.qIdx,
  ]);

  // VCNV chronological CNV buzzer sequence announcement
  const prevCnvBellsLenRef = useRef<number>(0);
  useEffect(() => {
    if (!state || state.currentRound !== "vcnv") {
      prevCnvBellsLenRef.current = 0;
      return;
    }
    const bells = state.vcnv?.bells || [];
    if (bells.length > prevCnvBellsLenRef.current) {
      prevCnvBellsLenRef.current = bells.length;
      if (ttsActive) {
        const bellNames = bells.map(
          (b) => state.seats[b.seat]?.name || `Thí sinh ${b.seat + 1}`
        );
        speakCnvBells(bellNames, {
          season: effectiveAudioSeason,
          round: "vcnv",
          rowIdx: state.vcnv?.currentRow,
        });
      } else {
        smoothStopOlympiaTTS(30);
      }
    } else if (bells.length < prevCnvBellsLenRef.current) {
      prevCnvBellsLenRef.current = bells.length;
    }
  }, [
    state?.currentRound,
    state?.vcnv?.bells,
    state?.vcnv?.currentRow,
    state?.seats,
    ttsActive,
    effectiveAudioSeason,
  ]);

  // Cancel dramatic Về Đích steal call if stealing phase/round ends, TTS disables, or component unmounts
  useEffect(() => {
    if (
      !state ||
      !ttsActive ||
      state.currentRound !== "veDich" ||
      state.veDich?.phase !== "stealing" ||
      state.veDich?.steal?.buzzedSeat == null
    ) {
      cancelDramaticStealCall();
    }
  }, [
    ttsActive,
    state?.currentRound,
    state?.veDich?.phase,
    state?.veDich?.steal?.buzzedSeat,
  ]);

  useEffect(() => {
    return () => {
      cancelDramaticStealCall();
    };
  }, []);

  // Natural speech stop on contestant buzzer activation & reflex callout (Khởi Động, Về Đích, Câu Hỏi Phụ)
  const prevBuzzKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!state) return;
    const buzzerSeat =
      state.currentRound === "khoiDong"
        ? state.khoiDong?.buzzedSeat
        : state.currentRound === "veDich" && state.veDich?.phase === "stealing"
        ? state.veDich?.steal?.buzzedSeat
        : state.currentRound === "cauHoiPhu"
        ? state.cauHoiPhu?.buzzedSeat
        : null;

    const currentBuzzKey = buzzerSeat != null ? `${state.currentRound}:${buzzerSeat}` : null;

    if (currentBuzzKey && currentBuzzKey !== prevBuzzKeyRef.current) {
      if (ttsActive && buzzerSeat != null) {
        const contestantName = state.seats[buzzerSeat]?.name || `Thí sinh ${buzzerSeat + 1}`;
        if (state.currentRound === "veDich") {
          // 2.0s - 3.0s dramatic delay before host calls name
          smoothStopOlympiaTTS(30);
          scheduleDramaticStealCall(contestantName, {
            season: effectiveAudioSeason,
            dramaticDelayMs: 2500,
          });
        } else {
          let readingHost: "khanh_vy" | "ngoc_huy" = "khanh_vy";
          let coHost: "khanh_vy" | "ngoc_huy" = "ngoc_huy";

          if (state.currentRound === "khoiDong") {
            const hosts = resolveTurnHosts("khoiDong", state.khoiDong?.segIdx ?? 0);
            readingHost = hosts.readingHost;
            coHost = hosts.coHost;
          } else {
            readingHost = "ngoc_huy";
            coHost = "khanh_vy";
          }

          handleBuzzerInterrupt(contestantName, {
            readingHost,
            coHost,
            season: effectiveAudioSeason,
            round: state.currentRound || undefined,
            reflexPauseMs: 500,
          });
        }
      } else {
        smoothStopOlympiaTTS(30);
      }
    }
    prevBuzzKeyRef.current = currentBuzzKey;
  }, [
    state?.khoiDong?.buzzedSeat,
    state?.veDich?.phase,
    state?.veDich?.steal?.buzzedSeat,
    state?.cauHoiPhu?.buzzedSeat,
    ttsActive,
    effectiveAudioSeason,
    state?.currentRound,
    state?.khoiDong?.segIdx,
    state?.seats,
  ]);

  // Vocalize grouped answers and speed callouts when answers are revealed
  const prevRevealKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!state || !ttsActive) return;

    if (state.currentRound === "vcnv" && state.vcnv?.answersRevealed && state.vcnv.phase === "answers") {
      const rKey = `vcnv-reveal-${state.vcnv.currentRow}`;
      if (rKey !== prevRevealKeyRef.current) {
        prevRevealKeyRef.current = rKey;
        const targetAns = state.vcnv.currentRow === 4
          ? state.vcnv.centerQuestion?.a
          : state.vcnv.rows[state.vcnv.currentRow]?.answer;
        const subs = state.seats.map((s, idx) => ({
          seat: idx,
          name: s.name || `Thí sinh ${idx + 1}`,
          answer: state.vcnv?.answers?.[idx]?.text || "",
          noAnswer: !state.vcnv?.answers?.[idx]?.text,
        }));
        const groups = groupContestantAnswers(subs, targetAns);
        const commentary = generateGroupedAnswerCommentary(groups, {
          round: "vcnv",
          totalContestants: state.seats.length || 4,
        });
        if (commentary) {
          speakTTS(commentary);
        }
      }
    } else if (state.currentRound === "tangToc" && (state.tangToc?.phase === "ranking" || state.tangToc?.phase === "graded")) {
      const rKey = `tt-reveal-${state.tangToc.qIdx}`;
      if (rKey !== prevRevealKeyRef.current) {
        prevRevealKeyRef.current = rKey;
        const targetAns = state.tangToc.correctAnswer || state.tangToc.questions[state.tangToc.qIdx]?.answer;
        const subs = state.seats.map((s, idx) => ({
          seat: idx,
          name: s.name || `Thí sinh ${idx + 1}`,
          answer: state.tangToc?.submissions?.[idx]?.answer || "",
          ms: state.tangToc?.submissions?.[idx]?.ms,
          noAnswer: !state.tangToc?.submissions?.[idx]?.answer,
        }));
        const groups = groupContestantAnswers(subs, targetAns);
        const answerCommentary = generateGroupedAnswerCommentary(groups, {
          round: "tangToc",
          totalContestants: state.seats.length || 4,
        });
        const speedCommentary = generateTangTocTimeCallout(subs);
        const fullCommentary = [answerCommentary, speedCommentary].filter(Boolean).join(" ");
        if (fullCommentary) {
          speakTTS(fullCommentary);
        }
      }
    }
  }, [
    state?.currentRound,
    state?.vcnv?.answersRevealed,
    state?.vcnv?.phase,
    state?.vcnv?.currentRow,
    state?.vcnv?.answers,
    state?.vcnv?.rows,
    state?.vcnv?.centerQuestion,
    state?.tangToc?.phase,
    state?.tangToc?.qIdx,
    state?.tangToc?.submissions,
    state?.tangToc?.questions,
    state?.tangToc?.correctAnswer,
    ttsActive,
    state?.seats,
  ]);

  // Vocalize result confirmation ("Chính xác!") or concise summarized answer
  const prevVerdictRef = useRef<string | null>(null);
  useEffect(() => {
    if (!state || !ttsActive) return;

    // Khởi Động verdict
    if (state.currentRound === "khoiDong" && state.khoiDong?.lastVerdict) {
      const segIdx = state.khoiDong.segIdx ?? 0;
      const vKey = `kd-${segIdx}-${state.khoiDong.qIdx}-${state.khoiDong.lastVerdict}`;
      if (vKey !== prevVerdictRef.current) {
        prevVerdictRef.current = vKey;
        smoothStopOlympiaTTS(20);
        if (state.khoiDong.lastVerdict === "correct") {
          speakOlympiaResult(true, undefined, {
            season: effectiveAudioSeason,
            round: "khoiDong",
            segIdx: state.khoiDong.segIdx,
          });
        } else if (state.khoiDong.lastVerdict === "wrong" && state.khoiDong.current?.a) {
          speakOlympiaResult(false, state.khoiDong.current.a, {
            season: effectiveAudioSeason,
            round: "khoiDong",
            segIdx: state.khoiDong.segIdx,
          });
        }
      }
    }

    // Về Đích verdict
    if (state.currentRound === "veDich" && state.veDich?.phase === "result" && state.veDich.lastVerdict) {
      const vKey = `vd-${state.veDich.qIdx}-${state.veDich.lastVerdict}`;
      if (vKey !== prevVerdictRef.current) {
        prevVerdictRef.current = vKey;
        smoothStopOlympiaTTS(20);
        if (state.veDich.lastVerdict === "correct" || state.veDich.lastVerdict === "stealCorrect") {
          speakOlympiaResult(true, undefined, { season: effectiveAudioSeason, round: "veDich" });
        } else if (state.veDich.current?.q?.a) {
          speakOlympiaResult(false, state.veDich.current.q.a, { season: effectiveAudioSeason, round: "veDich" });
        }
      }
    }

    // Câu Hỏi Phụ verdict
    if (state.currentRound === "cauHoiPhu" && state.cauHoiPhu?.phase === "result") {
      const vKey = `chp-${state.cauHoiPhu.qIdx}-${state.cauHoiPhu.buzzedSeat}`;
      if (vKey !== prevVerdictRef.current) {
        prevVerdictRef.current = vKey;
        smoothStopOlympiaTTS(20);
        speakOlympiaResult(true, undefined, { season: effectiveAudioSeason, round: "cauHoiPhu" });
      }
    }
  }, [
    ttsActive,
    state?.currentRound,
    state?.khoiDong?.segIdx,
    state?.khoiDong?.lastVerdict,
    state?.khoiDong?.qIdx,
    state?.khoiDong?.current?.a,
    state?.veDich?.phase,
    state?.veDich?.lastVerdict,
    state?.veDich?.qIdx,
    state?.veDich?.current?.q?.a,
    state?.cauHoiPhu?.phase,
    state?.cauHoiPhu?.qIdx,
    state?.cauHoiPhu?.buzzedSeat,
    effectiveAudioSeason,
  ]);

  // Vocalize round intro greeting when transitioning into a new competition round
  const prevRoundRef = useRef<string | null>(null);
  useEffect(() => {
    if (!state || !ttsActive || state.stage !== "playing" || !state.currentRound) return;
    if (state.currentRound !== prevRoundRef.current) {
      prevRoundRef.current = state.currentRound;
      speakRoundIntroTTS(state.currentRound, { season: effectiveAudioSeason });
    }
  }, [state?.stage, state?.currentRound, ttsActive, effectiveAudioSeason]);

  if (join && !join.ok) {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-black p-10 text-rose-300 text-2xl">
        {join.error}
      </div>
    );
  }

  if (!state) {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-gradient-to-b from-[#060814] via-[#0a0f24] to-[#03040a] text-violet-300 text-2xl font-bold">
        Đang kết nối…
      </div>
    );
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const isVcnvReveal = state.currentRound === "vcnv" && Boolean(state.vcnv?.answersRevealed);
  const isTangTocReveal =
    state.currentRound === "tangToc" &&
    (state.tangToc?.phase === "ranking" || state.tangToc?.phase === "graded");
  const isTangTocQuestion = state.currentRound === "tangToc" && state.tangToc?.phase === "question";
  const isVcnvFullscreen = state.currentRound === "vcnv";

  const showFullscreen =
    isVcnvReveal ||
    isTangTocReveal ||
    isTangTocQuestion ||
    isVcnvFullscreen ||
    state.overlayMode === "FULLSCREEN";

  const isLowerThird = !showFullscreen;
  const isOverlayHidden = cameraState.isOverlayHidden;
  const activeRoundContent = hasActiveRoundContent(state);
  const isVcnvPureStudio = Boolean(state.showStageGraphics);
  const isVcnvQuadView =
    state.stage === "playing" &&
    !state.banner &&
    !isOverlayHidden &&
    !state.summaryState?.active &&
    activeRoundContent &&
    state.currentRound === "vcnv" &&
    Boolean(state.vcnv) &&
    !state.vcnv?.answersRevealed &&
    state.vcnv?.phase !== "waitingAnswer" &&
    !isVcnvPureStudio;

  const is3DPaused = Boolean(
    Boolean(state.banner) ||
      Boolean(state.summaryState?.isFullscreen) ||
      (showFullscreen &&
        state.stage === "playing" &&
        !isOverlayHidden &&
        !isVcnvQuadView &&
        !(state.currentRound === "vcnv" && isVcnvPureStudio))
  );

  return (
    <div
      onPointerDown={handleUserUnlock}
      onClick={handleUserUnlock}
      className="fixed inset-0 w-full h-full max-h-full overflow-hidden bg-gradient-to-b from-[#060818] via-[#090d24] to-[#040612] text-white flex flex-col select-none"
    >
      {/* ── 2. BROADCAST SCOREBOARD OVERLAY (Z-50) ── */}
      {state.showScoreboard && (
        <div className="absolute inset-0 z-50 bg-[#0d0820]/95 flex flex-col items-center justify-center p-6 animate-fade-in backdrop-blur-md pointer-events-auto">
          <h2
            className="text-3xl sm:text-4xl font-black mb-6 tracking-wider"
            style={{
              background: "linear-gradient(90deg,#f59e0b,#ef4444,#7c3aed)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            BẢNG ĐIỂM HIỆN TẠI
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-4xl">
            {activeSeats(state).map((s) => (
              <div
                key={s.id}
                className="rounded-2xl border border-cyan-500/35 p-5 text-center flex flex-col items-center gap-2 bg-gradient-to-b from-[#091536]/90 to-slate-950/90 backdrop-blur shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
              >
                <div className="w-9 h-9 rounded-full border-2 border-cyan-400 bg-cyan-500/20 flex items-center justify-center font-black text-sm text-cyan-300">
                  {s.id + 1}
                </div>
                <span className="text-base font-bold truncate max-w-full text-slate-100">{s.name}</span>
                {s.school && (
                  <span className="text-xs text-amber-300 font-medium truncate max-w-full bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                    {s.school}
                  </span>
                )}
                <span className="text-5xl font-black drop-shadow text-amber-300">
                  {s.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 3. BROADCAST TOP HEADER BAR (Z-30) ── */}
      <div className="shrink-0 flex items-center justify-between px-3 py-1.5 border-b border-white/10 bg-black/40 backdrop-blur-md z-30">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏔️</span>
          <span
            className="text-sm sm:text-base font-black tracking-wide"
            style={{
              background: "linear-gradient(90deg,#fffbd0 0%, #ffd700 50%, #f59e0b 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            ĐƯỜNG LÊN ĐỈNH OLYMPIA
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-violet-300/70">
          {state.currentRound && (
            <span className="px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-400/30 text-violet-200 font-bold">
              {ROUND_LABELS[state.currentRound]}
            </span>
          )}
          <button
            type="button"
            className={`px-2 py-1 border rounded-lg transition text-xs cursor-pointer flex items-center gap-1 ${
              ttsActive
                ? "border-cyan-400/50 bg-cyan-500/20 text-cyan-200 shadow-[0_0_8px_rgba(6,182,212,0.4)]"
                : "border-white/10 text-slate-400 hover:bg-white/5"
            }`}
            onClick={() => {
              const next = !ttsActive;
              setTtsActive(next);
              setTtsEnabled(next);
              if (!next) cancelTTS();
            }}
            title="Bật/Tắt đọc câu hỏi tự động (TTS tiếng Việt)"
          >
            <span>🎙️</span>
            <span className="hidden sm:inline">{ttsActive ? "TTS" : "TẮT"}</span>
          </button>
          <button
            type="button"
            className="px-2 py-1 border border-violet-400/30 rounded-lg hover:bg-violet-500/15 transition text-xs cursor-pointer"
            onClick={() => setAudioOn((v) => !v)}
          >
            {audioOn ? "🔊" : "🔈"}
          </button>
          {/* Quick Camera Auto/Reset Button (R3) */}
          <button
            type="button"
            onClick={handleResetCamera}
            className={`px-2 py-1 border rounded-lg transition text-xs cursor-pointer flex items-center gap-1 ${
              isCameraOverridden
                ? "border-amber-400/60 bg-amber-500/20 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.4)] animate-pulse"
                : "border-white/10 text-slate-400 hover:bg-white/5 hover:text-slate-200"
            }`}
            title={
              isCameraOverridden
                ? "Camera đang chỉnh thủ công / lệch góc. Bấm hoặc nhấn phím 'R' để đặt lại về Auto Director"
                : "Đặt lại camera về Auto Director (Phím R)"
            }
          >
            <span>🎥</span>
            <span className="hidden sm:inline">↺ Auto (R)</span>
          </button>
          {/* Quick Studio 3D Pure View Toggle Button (H) */}
          <button
            type="button"
            onClick={handleToggleStudio}
            className={`px-2 py-1 border rounded-lg transition text-xs cursor-pointer flex items-center gap-1 ${
              state?.showStageGraphics
                ? "border-cyan-400/60 bg-cyan-500/20 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                : "border-white/10 text-slate-400 hover:bg-white/5 hover:text-slate-200"
            }`}
            title="Bật/Tắt chế độ Trường quay 3D thuần (Phím H)"
          >
            <span>🏛️</span>
            <span className="hidden sm:inline">3D (H)</span>
          </button>
          <span>{connected ? "🟢" : "🔴"}</span>
        </div>
      </div>

      {/* ── 3.5. ACCESSIBLE CAMERA AUTO & RESET FLOATING BADGE (R3) ── */}
      <div className="fixed top-13 right-3 sm:top-14 sm:right-4 z-40 pointer-events-auto flex items-center gap-1.5 animate-fade-in">
        <button
          type="button"
          onClick={handleResetCamera}
          className={`px-3 py-1.5 rounded-full backdrop-blur-md border text-xs font-bold flex items-center gap-2 shadow-2xl transition-all cursor-pointer ${
            isCameraOverridden
              ? "bg-slate-950/95 hover:bg-amber-950/80 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)] animate-pulse"
              : "bg-slate-950/70 hover:bg-slate-900/90 border-white/15 text-slate-300 hover:border-cyan-400/60 hover:text-cyan-200 opacity-60 hover:opacity-100"
          }`}
          title={
            isCameraOverridden
              ? `Góc C${cameraState.camAngle} (${isCameraManual ? "Thủ công" : "Lệch PTZ"}). Bấm hoặc nhấn phím 'R' để đặt lại Auto Director`
              : `Góc C${cameraState.camAngle} đang ở chế độ Tự động chuẩn. Bấm hoặc nhấn 'R' để đặt lại`
          }
        >
          <span className="flex items-center gap-1">
            <span>🎥</span>
            <span className="font-mono text-[11px] text-cyan-300">C{cameraState.camAngle}</span>
            {isCameraOverridden && (
              <span className="text-[10px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40 uppercase">
                {isCameraManual ? "Thủ công" : "PTZ"}
              </span>
            )}
          </span>
          <span className="h-3 w-px bg-white/20" />
          <span className="flex items-center gap-1 text-[11px] font-black text-white">
            <span>↺</span>
            <span>Đặt lại (R)</span>
          </span>
        </button>
      </div>

      {/* ── 4.5. BROADCAST CONTESTANT INTRO LOWER-THIRD CHYRON (Z-40) ── */}
      {state.entranceState?.active && <ContestantIntroChyron state={state} />}

      {/* ── 4. BROADCAST STAGE BANNER & ROUND INTRO (Z-50) ── */}
      <BroadcastRoundIntroOverlay
        state={state}
        serverNow={serverNow}
        onDismiss={(opts) => {
          if (typeof window !== "undefined" && (window.self !== window.top || isSandboxParam)) {
            // Embedded preview/sandbox iframes must not trigger global banner dismissal
            return;
          }
          if (opts?.isSkip) {
            emit("action", { type: "banner:skip" });
          } else {
            emit("action", { type: "banner:hide", seq: opts?.seq ?? state.bannerSeq });
          }
        }}
      />

      {/* ── 4.8. BROADCAST MANUAL VIDEO OVERLAY (KD, VCNV, VD, CHP) ── */}
      {(() => {
        if (!state.manualMediaState?.isOpen || state.currentRound === "tangToc") return null;
        const curMedia = getCurrentQuestionMedia(state);
        if (!curMedia?.url || !curMedia.isVideo) return null;
        const resolvedUrl = resolveMediaUrl(curMedia.url);
        if (!resolvedUrl) return null;

        return (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/75 backdrop-blur-md animate-fade-in pointer-events-auto">
            <div className="relative w-full max-w-4xl aspect-video rounded-3xl overflow-hidden border-2 border-cyan-400 shadow-[0_0_50px_rgba(0,191,255,0.4)] bg-black flex items-center justify-center">
              <video
                src={resolvedUrl}
                controls
                autoPlay={state.manualMediaState.isPlaying}
                playsInline
                className="w-full h-full object-contain"
                ref={(el) => {
                  if (el) {
                    if (state.manualMediaState?.isPlaying && el.paused) el.play().catch(() => {});
                    else if (!state.manualMediaState?.isPlaying && !el.paused) el.pause();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    (window as any).__OLYMPIA_CALL__?.("media:close");
                  }
                }}
                className="absolute top-3 right-3 z-50 px-3.5 py-1.5 rounded-full bg-slate-950/85 hover:bg-rose-600 text-white text-xs font-black border border-white/20 transition cursor-pointer flex items-center gap-1 shadow-xl"
                title="Đóng cửa sổ video"
              >
                <span>✕ Đóng video</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* ── 5. GAME STAGE LAYERS (Z-20) ── */}
      <div className="flex-1 min-h-0 relative z-20 flex flex-col justify-end overflow-hidden">
        {/* ── 1. 3D BROADCAST STUDIO (FULLSCREEN OR VCNV BOTTOM-RIGHT QUADRANT WINDOW) ── */}
        <div
          className={
            isVcnvQuadView
              ? "absolute z-[35] rounded-2xl border-2 border-cyan-400/80 shadow-[0_0_30px_rgba(6,182,212,0.35)] overflow-hidden pointer-events-none top-[calc(50%+0.375rem)] left-[calc(50%+0.375rem)] right-3 bottom-3 sm:top-[calc(50%+0.5rem)] sm:left-[calc(50%+0.5rem)] sm:right-5 sm:bottom-5 md:top-[calc(50%+0.625rem)] md:left-[calc(50%+0.625rem)] md:right-6 md:bottom-6"
              : "fixed inset-0 w-full h-full z-0 overflow-hidden pointer-events-none"
          }
        >
          <OlympiaStudio3DScene
            state={state}
            serverNow={serverNow}
            activeCamera={cameraState.camAngle}
            transitionMode={cameraState.transitionMode}
            pushInProgress={cameraState.pushInProgress}
            showDirectorBar={false}
            allowPTZ={true}
            defaultQuality={isSandboxParam ? "LIGHT" : undefined}
            isSandbox={isSandboxParam}
            isPaused={is3DPaused}
            qIdx={cameraState.qIdx ?? state?.khoiDong?.qIdx ?? -1}
            questionRevealed={cameraState.questionRevealed ?? Boolean(state?.khoiDong?.questionRevealed)}
          />
        </div>

        {/* Sảnh chờ / Lobby */}
        {state.stage === "lobby" && !state.entranceState?.active && (
          <div className="absolute inset-0 flex items-center justify-center p-4 z-20 pointer-events-auto animate-fade-in">
            <div className="bg-slate-950/80 backdrop-blur-md rounded-3xl border border-white/15 p-6 shadow-2xl max-w-3xl w-full">
              <Lobby state={state} code={code} origin={origin} />
            </div>
          </div>
        )}

        {/* Kết thúc trận chung cuộc */}
        {state.stage === "finished" && (
          <div className="absolute inset-0 flex items-center justify-center p-4 z-20 pointer-events-auto animate-fade-in">
            <div className="bg-slate-950/85 backdrop-blur-md rounded-3xl border border-amber-400/30 p-8 shadow-2xl max-w-2xl w-full">
              <Podium state={state} />
            </div>
          </div>
        )}

        {/* In-Game Round Overlays */}
        {state.stage === "playing" && !state.banner && !isOverlayHidden && !state.summaryState?.active && activeRoundContent && !(state.currentRound === "vcnv" && isVcnvPureStudio) && (
          isLowerThird ? (
            /* ── LOWER-THIRD BROADCAST OVERLAY (20 - 25% BOTTOM) ── */
            <div className="w-full px-2 sm:px-6 pb-3.5 sm:pb-5 pt-1 pointer-events-auto flex flex-col justify-end z-20">
              <div className="w-full max-w-[94vw] 2xl:max-w-[95vw] mx-auto flex flex-col justify-end">
                {state.currentRound === "khoiDong" && <KhoiDong state={state} serverNow={serverNow} />}
                {state.currentRound === "vcnv" && <Vcnv state={state} serverNow={serverNow} isLowerThird={true} />}
                {state.currentRound === "tangToc" && <TangToc state={state} serverNow={serverNow} />}
                {state.currentRound === "veDich" && <VeDich state={state} serverNow={serverNow} />}
                {state.currentRound === "cauHoiPhu" && <Chp state={state} serverNow={serverNow} />}
              </div>
            </div>
          ) : (
            /* ── FULLSCREEN BROADCAST OVERLAY (AUTHENTIC VTV3 GRAPHICS) ── */
            <div className="absolute inset-0 pointer-events-auto z-30 flex items-center justify-center overflow-hidden bg-[#070b14]">
              {/* Opaque Broadcast Backdrop: Chalkboard with formulas for Classic, or Olympia22 for V3 */}
              {state.themeMode === "o26_classic" ? (
                <Vtv3ChalkboardBackdrop className="opacity-95" />
              ) : (
                <Olympia22BackgroundBackdrop />
              )}
              <div className="relative z-10 w-full h-full flex flex-col items-center justify-center px-4 sm:px-8 py-4 sm:py-6 overflow-hidden">
                {state.currentRound === "khoiDong" && <KhoiDong state={state} serverNow={serverNow} isFullscreen={true} />}
                {state.currentRound === "vcnv" && <Vcnv state={state} serverNow={serverNow} isLowerThird={false} />}
                {state.currentRound === "tangToc" && <TangToc state={state} serverNow={serverNow} />}
                {state.currentRound === "veDich" && <VeDich state={state} serverNow={serverNow} isFullscreen={true} />}
                {state.currentRound === "cauHoiPhu" && <Chp state={state} serverNow={serverNow} isFullscreen={true} />}
              </div>
            </div>
          )
        )}

        {/* ── 6. SUMMARY LOWER-THIRD / FULLSCREEN GRAPHIC (Suppressed in cinematic_o27 mode) ── */}
        {state.summaryState?.active && state.summaryState.mode !== "cinematic_o27" && state.summaryMode !== "cinematic_o27" && (
          state.themeMode === "o26_classic" ? (
            <Vtv3ClassicSummaryGraphic state={state} />
          ) : (
            <SummaryLowerThirdGraphic state={state} />
          )
        )}
      </div>
    </div>
  );
}

function highlightSeats(s: OlympiaState): (number | null)[] {
  if (s.khoiDong && s.currentRound === "khoiDong") {
    const kd = s.khoiDong;
    const seg = kd.segments[kd.segIdx];
    return [kd.buzzedSeat ?? (seg.kind === "solo" ? (seg.seat ?? null) : null)];
  }
  if (s.veDich && s.currentRound === "veDich") return [s.veDich.order[s.veDich.turnIdx], s.veDich.steal?.buzzedSeat ?? null];
  if (s.cauHoiPhu && s.currentRound === "cauHoiPhu") return s.cauHoiPhu.tied;
  return [];
}

type P = { state: OlympiaState; serverNow: () => number; isLowerThird?: boolean; isFullscreen?: boolean };

function Lobby({ state, code, origin }: { state: OlympiaState; code: string; origin: string }) {
  const seats = state.seats;
  const count = seats.length;
  const gridClass =
    count === 2 ? "grid-cols-2 max-w-sm" :
    count === 3 ? "grid-cols-3 max-w-lg" :
    count === 4 ? "grid-cols-4 max-w-xl" :
    count <= 6 ? "grid-cols-3 sm:grid-cols-6 max-w-2xl" :
    "grid-cols-4 max-w-2xl";

  return (
    <div className="text-center space-y-4 max-w-4xl mx-auto w-full px-3">
      <div className="text-sm text-violet-300/60">Vào <span className="text-violet-200 font-bold">{origin}/play</span> và nhập mã</div>
      <div
        className="text-5xl sm:text-7xl font-black tracking-[0.2em] select-all"
        style={{ background: "linear-gradient(90deg,#fffbd0,#ffd700,#f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
      >
        {code}
      </div>
      <div className={`grid ${gridClass} gap-2 mx-auto w-full`}>
        {seats.map((s) => (
          <div
            key={s.id}
            className="rounded-xl border bg-gradient-to-b from-white/5 to-transparent p-2 text-sm font-semibold truncate"
            style={{ borderLeft: `4px solid ${SEAT_COLORS[s.id]}`, borderTop: "1px solid rgba(255,255,255,0.1)", borderRight: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
          >
            {s.name || <span className="text-violet-400/50">Ghế {s.id + 1}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Podium({ state }: { state: OlympiaState }) {
  const r = [...activeSeats(state)].sort((a, b) => b.score - a.score);
  return (
    <div className="text-center space-y-4">
      <div
        className="text-4xl font-black"
        style={{ background: "linear-gradient(90deg,#fffbd0,#ffd700,#f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
      >
        KẾT QUẢ CHUNG CUỘC
      </div>
      {r.map((s, i) => (
        <div key={s.id} className="text-3xl" style={{ color: i === 0 ? "#ffd700" : "white" }}>
          {["🥇", "🥈", "🥉"][i] ?? `${i + 1}.`} {s.name} — <b>{s.score}</b>
        </div>
      ))}
    </div>
  );
}

function autoQuestionFontSize(text: string) {
  const len = text ? text.length : 0;
  if (len <= 45) return "text-xl sm:text-2xl md:text-3xl lg:text-4xl leading-relaxed font-black";
  if (len <= 85) return "text-lg sm:text-xl md:text-2xl lg:text-3xl leading-relaxed font-black";
  if (len <= 140) return "text-base sm:text-lg md:text-xl lg:text-2xl leading-normal font-extrabold";
  return "text-sm sm:text-base md:text-lg lg:text-xl leading-normal font-bold";
}

function DisplayTimerBar({ timer, serverNow }: { timer: any; serverNow: () => number }) {
  const barRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!timer || timer.startedAt == null) return;
    let active = true;
    const total = timer.totalMs || 60000;

    const loop = () => {
      if (!active) return;
      const now = serverNow();
      const elapsed = Math.max(0, now - timer.startedAt);
      const remaining = Math.max(0, timer.remainingMs - elapsed);
      const elapsedPct = Math.max(0, Math.min(100, ((total - remaining) / total) * 100));

      if (barRef.current) {
        barRef.current.style.width = `${elapsedPct}%`;
        const isEnd = remaining <= 3000;
        barRef.current.className = `h-full rounded-full will-change-[width] ${
          isEnd
            ? "bg-gradient-to-r from-red-600 via-rose-500 to-amber-400 shadow-[0_0_12px_rgba(239,68,68,0.9)]"
            : "bg-gradient-to-r from-violet-600 via-sky-400 to-amber-300 shadow-[0_0_10px_rgba(56,189,248,0.6)]"
        }`;
      }
      if (pinRef.current) {
        pinRef.current.style.left = `${elapsedPct}%`;
      }

      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(loop);
      }
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      active = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [timer?.startedAt, timer?.remainingMs, timer?.totalMs, serverNow]);

  const running = timer?.startedAt != null;
  if (!running || !timer) return null;

  return (
    <div className="w-full relative py-1 flex items-center animate-fade-in">
      <div className="w-full h-2 rounded-full bg-violet-950/80 border border-violet-500/30 overflow-hidden shadow-inner relative">
        <div
          ref={barRef}
          className="h-full rounded-full will-change-[width] bg-gradient-to-r from-violet-600 via-sky-400 to-amber-300 shadow-[0_0_10px_rgba(56,189,248,0.6)]"
          style={{ width: "0%" }}
        />
      </div>
      <div
        ref={pinRef}
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none rounded-full border will-change-[left] w-3 h-3 bg-amber-300 border-amber-100 shadow-[0_0_8px_#f59e0b]"
        style={{ left: "0%" }}
      />
    </div>
  );
}

function KhoiDong({ state, serverNow, isFullscreen }: P) {
  const kd = state.khoiDong!;
  const seg = kd.segments[kd.segIdx];
  const isSolo = seg.kind === "solo";

  const isUnlimitedQ = seg.questions >= 50 || Boolean(seg.globalMs && seg.questions >= 30);
  const totalQ = isUnlimitedQ ? "" : `/${seg.questions}`;
  const qNum = Math.max(1, kd.qIdx + 1);
  const questionBadge = `Câu ${qNum}${totalQ}`;

  if (!kd.started || kd.phase === "segmentDone" || kd.phase === "intro") {
    return null;
  }

  const currentBuzzedSeat = kd.buzzedSeat;
  const currentSoloSeat = isSolo ? (seg.seat ?? null) : null;
  const hasRevealedQ = Boolean(kd.questionRevealed && kd.current);
  const isGlobalClockRule = Boolean(seg.globalMs && kd.globalTimer);
  const isO23ToO26 = !isGlobalClockRule;
  const kdActiveTimer = isGlobalClockRule ? kd.globalTimer : null;
  const isTimerRunning = Boolean(kd.timer && kd.timer.startedAt != null);
  const kdSecondsBadgeTimer = isO23ToO26 && hasRevealedQ && isTimerRunning ? kd.timer : null;

  const containerClass = isFullscreen
    ? "w-full max-w-[94vw] 2xl:max-w-[1540px] mx-auto flex flex-col justify-center items-center h-full min-h-0 py-4 gap-3 my-auto animate-fade-in"
    : "w-full max-w-[94vw] 2xl:max-w-[95vw] mx-auto flex flex-col justify-end h-full min-h-0 py-1 gap-1.5";

  if (state.themeMode === "o26_classic") {
    return (
      <div className={containerClass}>
        <ClassicUnifiedLowerThird
          state={state}
          round="khoiDong"
          isFullscreen={isFullscreen}
          activeSeatId={currentSoloSeat}
          buzzedSeatId={currentBuzzedSeat}
          lockedSeats={kd.lockedSeats}
          badgeLabel={kd.started ? (hasRevealedQ ? questionBadge : `Câu 0${totalQ}`) : null}
          questionText={hasRevealedQ ? kd.current?.q : ""}
          mediaElement={
            hasRevealedQ && kd.current?.media ? (
              <MediaView
                url={kd.current.media}
                type={kd.current.mediaType}
                className="max-h-20 sm:max-h-24 rounded-lg mx-auto mt-1"
              />
            ) : null
          }
          timer={kdActiveTimer}
          timerBadge={kdSecondsBadgeTimer}
          serverNow={serverNow}
          answerReveal={
            kd.phase === "result"
              ? {
                  show: true,
                  text: kd.current?.a || "(Chưa có đáp án)",
                  label: "ĐÁP ÁN",
                  verdict: kd.lastVerdict,
                  points: kd.lastVerdict === "correct" ? 10 : undefined,
                  actorName: kd.buzzedSeat != null ? state.seats[kd.buzzedSeat]?.name : undefined,
                }
              : null
          }
        />
      </div>
    );
  }

  return (
    <div className={containerClass}>
      {/* Main question card / Result answer overlay */}
      {kd.phase === "result" ? (
        <div className={`w-full max-w-3xl sm:max-w-4xl mx-auto px-2 sm:px-4 flex flex-col ${isFullscreen ? "justify-center items-center my-auto" : "justify-end"} animate-fade-in`}>
          <UnifiedOlympiaAnswerOverlay
            answerText={kd.current?.a || "(Chưa có đáp án)"}
            roundLabel="ĐÁP ÁN"
            verdict={kd.lastVerdict}
            pointsAwarded={kd.lastVerdict === "correct" ? 10 : undefined}
            actorName={kd.buzzedSeat != null ? state.seats[kd.buzzedSeat]?.name : undefined}
            themeMode={state.themeMode}
          />
        </div>
      ) : (
        <EconovaLowerThirdV3
          state={state}
          serverNow={serverNow}
          activeSeatId={currentSoloSeat}
          buzzedSeatId={currentBuzzedSeat}
          lockedSeats={kd.lockedSeats}
          questionNumberBadge={kd.started ? (hasRevealedQ ? questionBadge : `Câu 0${totalQ}`) : null}
          headerBadge={hasRevealedQ && Boolean(kd.showSubject) && kd.current?.subject ? `${kd.current.subject.toUpperCase()}` : null}
          questionText={hasRevealedQ ? kd.current?.q : ""}
          mediaElement={
            hasRevealedQ && kd.current?.media ? (
              <MediaView
                url={kd.current.media}
                type={kd.current.mediaType}
                className="max-h-20 sm:max-h-24 rounded-lg mx-auto mt-1"
              />
            ) : null
          }
          timer={kdActiveTimer}
          timerBadge={null}
          showTimerClock={isGlobalClockRule}
          showScoreTab={true}
          runAnim={kd.started && kd.qIdx <= 0 && !hasRevealedQ}
        />
      )}
    </div>
  );
}

function Vcnv({ state, serverNow, isLowerThird }: P) {
  const v = state.vcnv!;
  if (!v) return null;

  // Candidate Answers Revealed OR Waiting Answer Background -> Fullscreen VTV3 Answer Graphic
  // Nền chờ ĐA: nền xanh Olympia công nghệ cho Theme Mũi tên V3, nền blur cho Theme cổ điển
  if (v.phase === "waitingAnswer" && !v.answersRevealed) {
    return state.themeMode !== "o26_classic" ? (
      <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
        <Olympia22BackgroundBackdrop />
      </div>
    ) : (
      <div className="absolute inset-0 bg-[#040e24]/75 backdrop-blur-sm animate-fade-in pointer-events-none" />
    );
  }
  if (v.answersRevealed) {
    return <VcnvAnswerRevealGraphic state={state} isWaitingAnswer={false} />;
  }

  // Authentic VTV3 Lower-Third Mode for VCNV
  if (isLowerThird && state.themeMode === "o26_classic") {
    const curIdx = v.currentRow;
    const isCenter = curIdx === 4;
    const row = curIdx >= 0 && curIdx < 4 ? v.rows[curIdx] : null;
    const cleanAns = cleanVcnvWord(row?.answer || "");
    const letterCount = row?.letterCount || cleanAns.length || 0;
    const badge = isCenter
      ? "CÂU TRUNG TÂM"
      : curIdx >= 0
      ? `HÀNG NGANG ${curIdx + 1} (${letterCount} CHỮ CÁI)`
      : `CHƯỚNG NGẠI VẬT (${v.keyword?.length || "?"} CHỮ CÁI)`;
    const questionText = isCenter ? v.centerQuestion?.q || "" : row?.hint || "";
    const buzzedSeat = v.bells && v.bells.length > 0 ? v.bells[0].seat : null;

    return (
      <ClassicUnifiedLowerThird
        state={state}
        round="vcnv"
        badgeLabel={badge}
        questionText={questionText}
        timer={v.timer}
        buzzedSeatId={buzzedSeat}
        serverNow={serverNow}
      />
    );
  }

  // Authentic VTV3 4-Quadrant Broadcast Layout (Grid, Question & 15s Countdown Phases)
  return <VcnvCountdownGraphic state={state} serverNow={serverNow} />;
}

function TangToc({ state, serverNow }: P) {
  const tt = state.tangToc!;
  if (!tt || tt.phase === "idle") return null;

  // 0. Nền chờ ĐA (W): Nền xanh Olympia công nghệ cho Theme Mũi tên V3, nền xám theme cổ điển
  if (tt.showWaitingBg || (tt as any).phase === "waitingAnswer") {
    return state.themeMode !== "o26_classic" ? (
      <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
        <Olympia22BackgroundBackdrop />
      </div>
    ) : (
      <div className="absolute inset-0 bg-gradient-to-b from-[#262930] via-[#191b22] to-[#0c0e12] backdrop-blur-md animate-fade-in pointer-events-none flex items-center justify-center">
        <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-600/20 via-transparent to-black/85" />
      </div>
    );
  }

  // Tạm ẩn đồ hoạ câu hỏi/đáp án (H): trả về null để lộ 100% trường quay 3D thực tế mà không ảnh hưởng timer hay đáp án
  if (tt.hideOverlay) {
    return null;
  }

  // 1. Candidate Answers Revealed & Graded -> Fullscreen Ranked Layout (unless Host switched to view question)
  if ((tt.phase === "ranking" || tt.phase === "graded") && tt.viewMode !== "question") {
    return <TangTocRankedAnswersGraphic state={state} />;
  }

  // 2. Question Clue Frame -> Fullscreen Frame (silent return if in ranking/graded)
  return <TangTocQuestionGraphic state={state} serverNow={serverNow} isSilent={tt.phase === "ranking" || tt.phase === "graded"} />;
}

function VeDich({ state, serverNow, isFullscreen }: P) {
  const vd = state.veDich!;
  const owner = vd.order[vd.turnIdx];
  const cur = vd.current;

  if (vd.phase === "seatDone" || vd.phase === "idle") return null;

  const isChoosing = vd.phase === "choosing";
  const isPackageReady = vd.phase === "packageReady";

  // Hiển thị gói điểm đã chọn trong 3 giây sau khi chốt, sau đó tự đóng đồ hoạ gói điểm chuyển sang sẵn sàng mở Câu 1
  const [closing, setClosing] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (isChoosing) {
      setClosing(false);
      setClosed(false);
    } else if (isPackageReady) {
      const readyAt = vd.packageReadyAt || serverNow();
      const elapsed = Math.max(0, serverNow() - readyAt);
      if (elapsed >= 3450) {
        setClosing(true);
        setClosed(true);
      } else {
        const remainingVisible = Math.max(0, 3000 - elapsed);
        const closeTimer = setTimeout(() => {
          setClosing(true);
        }, remainingVisible);
        const hideTimer = setTimeout(() => {
          setClosed(true);
        }, remainingVisible + 450);
        return () => {
          clearTimeout(closeTimer);
          clearTimeout(hideTimer);
        };
      }
    } else {
      setClosing(false);
      setClosed(true);
    }
  }, [isChoosing, isPackageReady, vd.packageReadyAt, serverNow]);

  const showPackageGrid = (isChoosing || (isPackageReady && !closed)) && vd.phase !== "thinking" && vd.phase !== "stealing" && vd.phase !== "result";

  const isEarlyLowerThird = isPackageReady && closed;
  const isVdResult = vd.phase === "result";
  const lastVdEntry = isVdResult
    ? (state.transcript || [])
        .slice()
        .reverse()
        .find(
          (e) =>
            e.round === "veDich" &&
            e.entryKind === "question" &&
            (e.questionNumber === vd.qIdx + 1 || !e.questionNumber)
        )
    : null;
  const vdAnswer = lastVdEntry?.correctAnswer || "";
  const vdVerdict: "correct" | "wrong" | "neutral" =
    vd.lastVerdict === "correct" || vd.lastVerdict === "stealCorrect"
      ? "correct"
      : vd.lastVerdict === "wrong" || vd.lastVerdict === "stealWrong"
      ? "wrong"
      : "neutral";
  const vdPoints =
    vdVerdict === "correct" && cur?.points ? cur.points : undefined;
  const vdActorName =
    vd.steal?.buzzedSeat != null
      ? state.seats[vd.steal.buzzedSeat]?.name
      : state.seats[owner]?.name;

  const showQuestionFrame =
    isEarlyLowerThird ||
    Boolean(cur && (vd.phase === "thinking" || vd.phase === "stealing"));

  return (
    <div key={`vd-turn-${owner}-${vd.turnIdx}`} className={isFullscreen ? "w-full max-w-[94vw] 2xl:max-w-[1540px] mx-auto flex flex-col justify-center items-center my-auto animate-fade-in" : "w-full max-w-[94vw] 2xl:max-w-[95vw] mx-auto flex flex-col justify-end"}>
      {/* While choosing package or viewing confirmed package: show slanted hexagonal package grid */}
      {showPackageGrid && (
        <div key={`pkg-grid-${owner}-${vd.turnIdx}`} className={isFullscreen ? "fixed inset-0 z-30 flex items-center justify-center pointer-events-none px-4" : "fixed inset-x-0 bottom-2 sm:bottom-3 z-30 flex items-end justify-center pointer-events-none px-4"}>
          <div className="pointer-events-auto w-full max-w-4xl flex items-center justify-center">
            <VeDichSlantedGridGraphic state={state} animate={true} closing={closing} />
          </div>
        </div>
      )}

      {/* When in result phase: unmount question graphics completely and show independent answer overlay at 1/3 lower screen */}
      {state.themeMode === "o26_classic" ? (
        (showQuestionFrame || isVdResult) ? (
          <ClassicUnifiedLowerThird
            state={state}
            round="veDich"
            isFullscreen={isFullscreen}
            activeSeatId={owner}
            buzzedSeatId={vd.steal?.buzzedSeat ?? null}
            badgeLabel={cur?.points ? `${cur.points} ĐIỂM` : `CÂU ${vd.qIdx + 1}/3`}
            hopeStarActive={vd.hopeStarActive}
            questionText={cur?.q?.q || ""}
            mediaElement={
              cur?.q?.media ? (
                <MediaView
                  url={cur.q.media}
                  type={cur.q.mediaType}
                  className="max-h-20 sm:max-h-24 rounded-xl mx-auto border border-violet-500/20 mt-1"
                />
              ) : null
            }
            timer={
              cur?.q?.type === "practice"
                ? null
                : cur && (vd.phase === "thinking" || vd.phase === "stealing")
                ? vd.timer
                : null
            }
            serverNow={serverNow}
            answerReveal={null}
          />
        ) : null
      ) : showQuestionFrame ? (
          <EconovaLowerThirdV3
            key={`vd-lower-third-${owner}-${vd.turnIdx}`}
            state={state}
            serverNow={serverNow}
            activeSeatId={owner}
            buzzedSeatId={vd.steal?.buzzedSeat ?? null}
            questionNumberBadge={null}
            headerBadge={null}
            questionText={cur?.q?.q || ""}
            mediaElement={
              cur?.q?.media ? (
                <MediaView
                  url={cur.q.media}
                  type={cur.q.mediaType}
                  className="max-h-20 sm:max-h-24 rounded-xl mx-auto border border-violet-500/20 mt-1"
                />
              ) : null
            }
            timer={
              cur?.q?.type === "practice"
                ? null
                : cur && (vd.phase === "thinking" || vd.phase === "stealing")
                ? vd.timer
                : null
            }
            hopeStarActive={vd.hopeStarActive}
            showScoreTab={true}
            runAnim={isEarlyLowerThird}
            arrowFromCenter={true}
            expandFromCenter={true}
          />
        ) : null}
    </div>
  );
}

function Chp({ state, serverNow, isFullscreen }: P) {
  const cp = state.cauHoiPhu!;
  const q = cp.questions[cp.qIdx];
  const isChpResult = cp.phase === "result";
  const lastChpEntry = isChpResult
    ? (state.transcript || [])
        .slice()
        .reverse()
        .find((e) => e.round === "cauHoiPhu" && e.entryKind === "question")
    : null;
  const chpAnswer = q?.a || lastChpEntry?.correctAnswer || "";
  const chpWinner = cp.winner != null ? state.seats[cp.winner]?.name : undefined;
  const chpLimitLabel = state.chpQuestionLimit === "unlimited" ? "∞" : "3";
  const chpBadgeLabel =
    cp.qIdx >= 0 ? `CÂU HỎI PHỤ ${cp.qIdx + 1}/${chpLimitLabel}` : "CÂU HỎI PHỤ";

  return (
    <div className={isFullscreen ? "w-full max-w-[94vw] 2xl:max-w-[1540px] mx-auto text-center space-y-2 my-auto flex flex-col justify-center items-center animate-fade-in" : "w-full max-w-[94vw] 2xl:max-w-[95vw] mx-auto text-center space-y-2 animate-fade-in"}>
      {state.themeMode === "o26_classic" ? (
        (q || isChpResult) ? (
          <ClassicUnifiedLowerThird
            state={state}
            round="cauHoiPhu"
            isFullscreen={isFullscreen}
            tiedSeats={cp.tied}
            buzzedSeatId={cp.buzzedSeat || cp.winner}
            badgeLabel={chpBadgeLabel}
            questionText={q?.q || ""}
            timer={cp.timer}
            serverNow={serverNow}
            answerReveal={null}
          />
        ) : null
      ) : q ? (
        <EconovaLowerThirdV3
          state={state}
          serverNow={serverNow}
          buzzedSeatId={cp.buzzedSeat || cp.winner}
          headerBadge={chpBadgeLabel}
          questionText={q.q}
          timer={cp.timer}
          showScoreTab={true}
        />
      ) : null}
    </div>
  );
}
