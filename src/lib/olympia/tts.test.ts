import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  normalizePitch,
  validateAndNormalizeTtsInput,
  buildEdgeSsml,
  synthesizeEdgeTtsStream,
  detectTtsLanguage,
  resetTtsCacheForTesting,
  populateTtsCacheForTesting,
  TtsValidationError,
} from "./server-tts";
import {
  normalizeVietnameseTTS,
  summarizeOlympiaAnswer,
  getSeasonReadingRate,
  getTtsBaseRate,
  setTtsBaseRate,
  getTtsSpeedCategory,
  TTS_BASE_RATE_DEFAULT,
  resolveMCRole,
  resolveMCVoiceConfig,
  refreshOlympiaVoices,
  ROUND_INTRO_LINES,
  resolveTurnHosts,
  pickRandomMCRole,
  getContestantSpokenName,
  generateBuzzerCallout,
  resetBuzzerTurnState,
  getLastBuzzedContestant,
  detectSpellingError,
  normalizeAnswerForGrouping,
  groupContestantAnswers,
  generateGroupedAnswerCommentary,
  generateTangTocTimeCallout,
  generateCnvBellsAnnouncement,
  generateSingleCnvBellAnnouncement,
  formatCnvVerdictSpoken,
  speakOlympiaResult,
  speakCnvBells,
  speakOlympiaTTS,
  speakOlympiaTTSAsync,
  speakSmartQuestion,
  speakDualMcScriptAsync,
  speakRoundIntroTTS,
  smoothStopOlympiaTTS,
  skipOlympiaTTS,
  cancelTTS,
  cancelQuestionTTS,
  getActivePlaybackSegment,
  hasPendingIntroOrBridgeSpeech,
  cancelBuzzerInterrupt,
  handleBuzzerInterrupt,
  resetOlympiaTtsSession,
  unlockOlympiaTTS,
  pauseOlympiaTTS,
  resumeOlympiaTTS,
  isOlympiaTtsPaused,
  setTtsEnabled,
  getTtsEngineMode,
  getTtsEngineStatus,
  resetTtsServerFallback,
  configureTtsTransport,
  onTtsEngineStatusChange,
  detectTextLanguage,
  segmentMixedLanguageText,
  estimateWordBoundaryOffsetsMs,
  computeBoundaryStopDelayMs,
  KD_CHP_REFLEX_PAUSE_MS,
  KD_CHP_POST_BELL_CALLOUT_MS,
  VE_DICH_DRAMATIC_STEAL_DELAY_MS,
  VE_DICH_STEAL_PROMPT_VARIANTS,
  generateVeDichStealPrompt,
  HYPE_FILLER_BANK,
  pickHypeFiller,
  shouldTriggerAutoHypeFiller,
  buildAnswerExplanation,
  buildKhoiDongTurnExplanations,
  buildLobbyGreetingScript,
  buildOpeningDuoScript,
  buildEntranceOpeningBridge,
  buildContestantIntroStepSegment,
  buildContestantIntroContinuousScript,
  buildPostIntroBreatherScript,
  buildKhoiDongTurnBridgeSegment,
  buildVcnvRowBridgeSegment,
  buildTangTocBridgeSegment,
  buildVeDichBridgeSegment,
  buildRoundCompleteBridgeSegment,
  buildScoreSummaryStepSegment,
  buildScoreSummaryCommentary,
  buildScoreSummaryScript,
  computeOlympiaMatchRankings,
  buildPostMatchMcOpeningSegment,
  buildPostMatchContestantSummarySegment,
  computeFinalAwardPlan,
  buildFinalAwardCeremonyScript,
  buildClosingFarewellScript,
  buildAwardTierScript,
  speakAwardTierAsync,
} from "./tts";

// Helper to create deterministic RNG sequence
function makeSeqRng(values: number[]): () => number {
  let idx = 0;
  return () => {
    const v = values[idx % values.length];
    idx++;
    return v;
  };
}

// Helper for full browser-like mock environment in Node 24
function withMockBrowserEnv<T>(
  setup: {
    spoken?: Array<{ text: string; pitch: number; rate: number; lang: string; voiceName?: string }>;
    speakerEvents?: Array<"khanh_vy" | "ngoc_huy" | null>;
    voices?: Array<{ name: string; lang: string }>;
    withAudioContext?: boolean;
    failDecodeAudio?: boolean;
    withHtmlAudio?: boolean;
    autoFireEnd?: boolean;
    origin?: string;
    onLine?: boolean;
  },
  fn: (controls: {
    gainRamps: Array<{ value: number; time: number }>;
    sourceStops: number;
    cancelCalls: number;
    lastUtterance: () => any;
  }) => Promise<T> | T
): Promise<T> {
  const prevWindow = (globalThis as any).window;
  const prevLocalStorage = (globalThis as any).localStorage;
  const prevUtterance = (globalThis as any).SpeechSynthesisUtterance;
  const prevCustomEvent = (globalThis as any).CustomEvent;
  const prevAudio = (globalThis as any).Audio;
  const prevUrl = (globalThis as any).URL;
  const origNavDesc = Object.getOwnPropertyDescriptor(globalThis, "navigator");

  const spoken = setup.spoken ?? [];
  const speakerEvents = setup.speakerEvents ?? [];
  const gainRamps: Array<{ value: number; time: number }> = [];
  let sourceStops = 0;
  let cancelCalls = 0;
  let latestUtterance: any = null;
  const mockNavigator = { onLine: setup.onLine ?? true };

  class MockUtterance {
    text: string;
    lang = "";
    pitch = 1;
    rate = 1;
    voice: any = null;
    onboundary: any = null;
    onend: any = null;
    onerror: any = null;
    constructor(text: string) {
      this.text = text;
    }
  }

  class MockCustomEvent {
    type: string;
    detail: any;
    constructor(type: string, init?: { detail?: any }) {
      this.type = type;
      this.detail = init?.detail;
    }
  }

  const storageMap = new Map<string, string>([["olympia_tts_enabled", "true"]]);
  const mockStorage = {
    getItem: (k: string) => storageMap.get(k) ?? null,
    setItem: (k: string, v: string) => storageMap.set(k, v),
  };

  class MockAudioContext {
    currentTime = 1.0;
    state = "running";
    destination = {};
    async resume() {}
    async decodeAudioData() {
      if (setup.failDecodeAudio) {
        throw new Error("decodeAudioData failed");
      }
      return { duration: 1.2 };
    }
    createGain() {
      return {
        gain: {
          value: 1.0,
          setValueAtTime: () => {},
          linearRampToValueAtTime: (val: number, time: number) => {
            gainRamps.push({ value: val, time });
          },
        },
        connect: () => {},
        disconnect: () => {},
      };
    }
    createBufferSource() {
      const src: any = {
        buffer: null,
        onended: null,
        connect: () => {},
        start: () => {
          if (setup.autoFireEnd !== false) {
            queueMicrotask(() => {
              src.onended?.();
            });
          }
        },
        stop: () => {
          sourceStops++;
        },
      };
      return src;
    }
  }

  class MockHtmlAudio {
    src: string;
    currentTime = 0;
    duration = 1.0;
    onended: any = null;
    onerror: any = null;
    constructor(src: string) {
      this.src = src;
    }
    play() {
      if (setup.autoFireEnd !== false) {
        queueMicrotask(() => {
          this.onended?.();
        });
      }
      return Promise.resolve();
    }
    pause() {}
  }

  const mockWindow: any = {
    localStorage: mockStorage,
    location: setup.origin ? { origin: setup.origin } : undefined,
    navigator: mockNavigator,
    AudioContext: setup.withAudioContext ? MockAudioContext : undefined,
    Audio: setup.withHtmlAudio ? MockHtmlAudio : undefined,
    dispatchEvent: (evt: any) => {
      if (evt?.type === "olympia:tts-speaker") {
        speakerEvents.push(evt.detail?.speaker ?? null);
      }
      return true;
    },
    speechSynthesis: {
      speaking: false,
      pending: false,
      paused: false,
      getVoices: () => setup.voices ?? [],
      resume: () => {},
      cancel: () => {
        cancelCalls++;
        mockWindow.speechSynthesis.speaking = false;
      },
      speak: (u: MockUtterance) => {
        latestUtterance = u;
        mockWindow.speechSynthesis.speaking = true;
        spoken.push({
          text: u.text,
          pitch: u.pitch,
          rate: u.rate,
          lang: u.lang,
          voiceName: u.voice?.name,
        });
        if (setup.autoFireEnd !== false) {
          queueMicrotask(() => {
            mockWindow.speechSynthesis.speaking = false;
            u.onend?.();
          });
        }
      },
    },
  };

  (globalThis as any).SpeechSynthesisUtterance = MockUtterance;
  (globalThis as any).CustomEvent = MockCustomEvent;
  (globalThis as any).localStorage = mockStorage;
  (globalThis as any).window = mockWindow;
  try {
    Object.defineProperty(globalThis, "navigator", {
      value: mockNavigator,
      configurable: true,
      writable: true,
    });
  } catch {}
  if (setup.withHtmlAudio) {
    (globalThis as any).Audio = MockHtmlAudio;
    (globalThis as any).URL = {
      createObjectURL: () => "blob:mock-audio",
      revokeObjectURL: () => {},
    };
  }

  refreshOlympiaVoices();

  return Promise.resolve()
    .then(() =>
      fn({
        gainRamps,
        sourceStops,
        cancelCalls,
        lastUtterance: () => latestUtterance,
      })
    )
    .finally(() => {
      cancelTTS();
      configureTtsTransport({ fetchImpl: undefined, timeoutMs: 4000, cooldownMs: 15000 });
      resetTtsServerFallback();
      setTtsBaseRate(TTS_BASE_RATE_DEFAULT);
      setTtsEnabled(true);
      (globalThis as any).window = prevWindow;
      (globalThis as any).localStorage = prevLocalStorage;
      (globalThis as any).SpeechSynthesisUtterance = prevUtterance;
      (globalThis as any).CustomEvent = prevCustomEvent;
      (globalThis as any).Audio = prevAudio;
      (globalThis as any).URL = prevUrl;
      if (origNavDesc) {
        try {
          Object.defineProperty(globalThis, "navigator", origNavDesc);
        } catch {}
      }
      refreshOlympiaVoices();
    });
}

// ============================================================================
// Legacy + Upgraded Core Tests
// ============================================================================

test("TTS: normalizeVietnameseTTS expands broadcast abbreviations while preserving dates like 2/9/1945", () => {
  const input = "**Câu hỏi (10 điểm):** TP. HCM là trung tâm kinh tế lớn của VN, phát sóng trên VTV3 ngày 2/9/1945.";
  const normalized = normalizeVietnameseTTS(input);

  assert.ok(!normalized.includes("**"), "Markdown bold must be stripped");
  assert.ok(!normalized.includes("(10 điểm)"), "Score cue must be stripped");
  assert.ok(normalized.includes("Thành phố "), "TP. must be expanded to Thành phố ");
  assert.ok(normalized.includes("Việt Nam"), "VN must be expanded to Việt Nam");
  assert.ok(normalized.includes("Vê Tê Vê Ba"), "VTV3 must be expanded to Vê Tê Vê Ba");
  assert.ok(normalized.includes("2/9/1945"), "Date 2/9/1945 must NOT be mangled into 2 phần 9/1945");

  const unitsInput = "Tốc độ 100 km/h, gia tốc 9.8 m/s, nhiệt độ 25 °C, độ ẩm 80% tại trường THPT.";
  const unitsNorm = normalizeVietnameseTTS(unitsInput);
  assert.ok(unitsNorm.includes("ki lô mét một giờ"), "km/h must be expanded");
  assert.ok(unitsNorm.includes("mét một giây"), "m/s must be expanded");
  assert.ok(unitsNorm.includes("độ xê"), "°C must be expanded");
  assert.ok(unitsNorm.includes("phần trăm"), "% must be expanded");
  assert.ok(unitsNorm.includes("Trung học phổ thông"), "THPT must be expanded");
});

test("TTS: summarizeOlympiaAnswer handles dates, multi-parentheticals, alternatives, and phrase-boundary cuts", () => {
  assert.equal(summarizeOlympiaAnswer("Đáp án: Isaac Newton"), "Isaac Newton");
  assert.equal(summarizeOlympiaAnswer("Từ khóa: Mặt Trời"), "Mặt Trời");
  assert.equal(summarizeOlympiaAnswer("Đáp án là: 120 km/h"), "120 ki lô mét một giờ");
  assert.equal(summarizeOlympiaAnswer("Đáp án là: 9.8 m/s"), "9.8 mét một giây");
  assert.equal(summarizeOlympiaAnswer("Đáp án đúng là: 1/2"), "1 phần 2");
  assert.equal(summarizeOlympiaAnswer("Đáp án là: 120 km/h / 150 km/h"), "120 ki lô mét một giờ");
  assert.equal(summarizeOlympiaAnswer("2/9/1945 (Quốc khánh)"), "2/9/1945");

  assert.equal(summarizeOlympiaAnswer("Thành phố Hồ Chí Minh (Sài Gòn)"), "Thành phố Hồ Chí Minh");
  assert.equal(summarizeOlympiaAnswer("Định luật I Newton (Định luật quán tính)"), "Định luật I Newton");
  assert.equal(summarizeOlympiaAnswer("Ampe (đơn vị đo) (A)"), "Ampe");

  assert.equal(summarizeOlympiaAnswer("Nguyễn Tất Thành / Nguyễn Ái Quốc / Hồ Chí Minh"), "Nguyễn Tất Thành");
  assert.equal(summarizeOlympiaAnswer("Khí Oxy; O2"), "Khí Oxy");
  assert.equal(summarizeOlympiaAnswer("Văn Miếu - Quốc Tử Giám (10 điểm) (7 chữ cái)"), "Văn Miếu - Quốc Tử Giám");

  const longAnswer = "Đây là một cuộc khởi nghĩa nổi tiếng của Hai Bà Trưng nhằm chống lại quân Đông Hán xâm lược.";
  const summarized = summarizeOlympiaAnswer(longAnswer);
  const words = summarized.split(/\s+/).filter(Boolean);
  assert.ok(words.length <= 8, `Summarized words (${words.length}) must be <= 8 words`);
  assert.ok(!/^(và|của|là|tại|nhằm)$/i.test(words[words.length - 1]), "Must not end on dangling stopword");
});

test("TTS: getSeasonReadingRate separates question vs narration speed and scales by baseRate", () => {
  setTtsBaseRate(TTS_BASE_RATE_DEFAULT);

  // Legacy question rate contracts
  assert.equal(getSeasonReadingRate("O20"), 1.40);
  assert.equal(getSeasonReadingRate("O21"), 1.40);
  assert.equal(getSeasonReadingRate("O22"), 1.40);
  assert.equal(getSeasonReadingRate("O23"), 1.08);
  assert.equal(getSeasonReadingRate("O24-25"), 1.08);
  assert.equal(getSeasonReadingRate("O26"), 1.08);
  assert.equal(getSeasonReadingRate("O27"), 1.08);

  const normalRate = getSeasonReadingRate("O26", 15);
  const boostedRate = getSeasonReadingRate("O26", 30);
  assert.ok(boostedRate > normalRate);
  assert.equal(boostedRate, +(1.08 * 1.12).toFixed(2));

  // Speed separation: narration in O20 stays lively natural (~1.04-1.06), NOT 1.40 sprint
  assert.equal(getTtsSpeedCategory("question"), "question");
  assert.equal(getTtsSpeedCategory("result"), "narration");
  assert.equal(getTtsSpeedCategory("opening_duo"), "narration");
  const o20Narration = getSeasonReadingRate("O20", 12, "opening_duo");
  assert.ok(o20Narration >= 1.0 && o20Narration <= 1.10, `Expected natural narration speed, got ${o20Narration}`);

  // Host baseRate slider scaling & clamping [0.5, 2.0]
  try {
    setTtsBaseRate(1.25);
    assert.equal(getTtsBaseRate(), 1.25);
    assert.equal(getSeasonReadingRate("O26", 10, "question"), +(1.08 * 1.25).toFixed(2));

    setTtsBaseRate(1.5);
    assert.equal(getSeasonReadingRate("O20", 10, "question"), 2.0, "Should clamp upper bound at 2.0");

    setTtsBaseRate(0.5); // clamped to min 0.75
    assert.equal(getTtsBaseRate(), 0.75);
  } finally {
    setTtsBaseRate(TTS_BASE_RATE_DEFAULT);
  }
});

test("TTS: resolveMCRole and resolveTurnHosts enforce strict 6-mode per-turn alternation", () => {
  // Legacy baseline contracts
  assert.equal(resolveMCRole({ segment: "intro_greeting" }), "khanh_vy");
  assert.equal(resolveMCRole({ segment: "round_intro", round: "khoiDong" }), "ngoc_huy");
  assert.equal(resolveMCRole({ segment: "round_intro", round: "vcnv" }), "khanh_vy");
  assert.equal(resolveMCRole({ segment: "round_intro", round: "tangToc" }), "ngoc_huy");
  assert.equal(resolveMCRole({ segment: "round_intro", round: "veDich" }), "khanh_vy");
  assert.equal(resolveMCRole({ segment: "round_intro", round: "cauHoiPhu" }), "ngoc_huy");
  assert.equal(resolveMCRole({ segment: "question", round: "khoiDong", seatId: 0 }), "khanh_vy");
  assert.equal(resolveMCRole({ segment: "question", round: "khoiDong", seatId: 1 }), "ngoc_huy");
  assert.equal(resolveMCRole({ segment: "question", round: "vcnv" }), "khanh_vy");
  assert.equal(resolveMCRole({ segment: "question", round: "tangToc" }), "ngoc_huy");
  assert.equal(resolveMCRole({ segment: "question", round: "veDich" }), "ngoc_huy");
  assert.equal(resolveMCRole({ segment: "question", round: "cauHoiPhu" }), "ngoc_huy");
  assert.equal(resolveMCRole({ role: "khanh_vy", round: "tangToc" }), "khanh_vy");
  assert.equal(resolveMCRole({ role: "ngoc_huy", round: "vcnv" }), "ngoc_huy");

  // Mode 1 & 2: Khởi động solo alternates per segIdx; shared stays locked & flips vs last solo
  assert.deepEqual(resolveTurnHosts("khoiDong", 0), { readingHost: "khanh_vy", coHost: "ngoc_huy" });
  assert.deepEqual(resolveTurnHosts("khoiDong", 3), { readingHost: "ngoc_huy", coHost: "khanh_vy" });
  const sharedTurnA = resolveTurnHosts("khoiDong", 4, { segKind: "shared", sharedStartSegIdx: 4 });
  const sharedTurnB = resolveTurnHosts("khoiDong", 5, { segKind: "shared", sharedStartSegIdx: 4 });
  assert.deepEqual(sharedTurnA, { readingHost: "khanh_vy", coHost: "ngoc_huy" });
  assert.deepEqual(sharedTurnB, sharedTurnA, "Khởi động shared must stay locked on one MC pair");
  assert.equal(
    resolveMCRole({ round: "khoiDong", segIdx: 5, segKind: "shared", lastSoloSegIdx: 3, segment: "question" }),
    "khanh_vy"
  );

  // Mode 3: VCNV rows 0..3 + center row 4 alternate per row, same MC does row prompt/question/summary/result
  for (let row = 0; row <= 4; row++) {
    const expectedReading = row % 2 === 0 ? "khanh_vy" : "ngoc_huy";
    assert.equal(resolveMCRole({ round: "vcnv", rowIdx: row, segment: "vcnv_row_prompt" }), expectedReading);
    assert.equal(resolveMCRole({ round: "vcnv", rowIdx: row, segment: "question" }), expectedReading);
    assert.equal(resolveMCRole({ round: "vcnv", rowIdx: row, segment: "answers_summary" }), expectedReading);
    assert.equal(resolveMCRole({ round: "vcnv", rowIdx: row, segment: "result" }), expectedReading);
  }
  assert.equal(resolveMCRole({ round: "vcnv", rowIdx: 0, segIdx: 4, segment: "cnv_bell" }), "ngoc_huy");
  assert.equal(resolveMCRole({ round: "vcnv", rowIdx: 1, segIdx: 4, segment: "cnv_bell" }), "khanh_vy");

  // Mode 4: Tăng Tốc alternates per qIdx
  assert.equal(resolveMCRole({ round: "tangToc", qIdx: 0, segment: "question" }), "ngoc_huy");
  assert.equal(resolveMCRole({ round: "tangToc", qIdx: 0, segment: "answers_summary" }), "khanh_vy");
  assert.equal(resolveMCRole({ round: "tangToc", qIdx: 1, segment: "question" }), "khanh_vy");
  assert.equal(resolveMCRole({ round: "tangToc", qIdx: 1, segment: "answers_summary" }), "ngoc_huy");

  // Mode 5: Về Đích alternates per turnIdx (package), NOT qIdx
  assert.equal(resolveMCRole({ round: "veDich", turnIdx: 0, qIdx: 0, segment: "question" }), "ngoc_huy");
  assert.equal(resolveMCRole({ round: "veDich", turnIdx: 0, qIdx: 2, segment: "question" }), "ngoc_huy");
  assert.equal(resolveMCRole({ round: "veDich", turnIdx: 0, qIdx: 2, segment: "result" }), "khanh_vy");
  assert.equal(resolveMCRole({ round: "veDich", turnIdx: 1, qIdx: 0, segment: "question" }), "khanh_vy");
  assert.equal(resolveMCRole({ round: "veDich", turnIdx: 1, qIdx: 0, segment: "steal_callout" }), "ngoc_huy");

  // Mode 6: Câu hỏi phụ alternates per qIdx
  assert.equal(resolveMCRole({ round: "cauHoiPhu", qIdx: 0, segment: "question" }), "ngoc_huy");
  assert.equal(resolveMCRole({ round: "cauHoiPhu", qIdx: 0, segment: "result" }), "khanh_vy");
  assert.equal(resolveMCRole({ round: "cauHoiPhu", qIdx: 1, segment: "question" }), "khanh_vy");
  assert.equal(resolveMCRole({ round: "cauHoiPhu", qIdx: 1, segment: "result" }), "ngoc_huy");

  // Random MC role helper
  assert.equal(pickRandomMCRole(() => 0.1), "khanh_vy");
  assert.equal(pickRandomMCRole(() => 0.9), "ngoc_huy");
});

test("TTS: resolveMCVoiceConfig preserves pitches and picks English voices when lang='en'", () => {
  const kvConfig = resolveMCVoiceConfig("khanh_vy");
  const nhConfig = resolveMCVoiceConfig("ngoc_huy");
  assert.equal(kvConfig.pitch, 1.12);
  assert.equal(nhConfig.pitch, 0.88);

  return withMockBrowserEnv(
    {
      voices: [
        { name: "Microsoft HoaiMy Online", lang: "vi-VN" },
        { name: "Microsoft NamMinh Online", lang: "vi-VN" },
        { name: "Microsoft Jenny Online", lang: "en-US" },
        { name: "Microsoft Guy Online", lang: "en-US" },
      ],
    },
    () => {
      assert.equal(resolveMCVoiceConfig("khanh_vy", "en").voice?.name, "Microsoft Jenny Online");
      assert.equal(resolveMCVoiceConfig("ngoc_huy", "en").voice?.name, "Microsoft Guy Online");
      assert.equal(resolveMCVoiceConfig("khanh_vy", "vi").voice?.name, "Microsoft HoaiMy Online");
      assert.equal(resolveMCVoiceConfig("ngoc_huy", "vi").voice?.name, "Microsoft NamMinh Online");
    }
  );
});

test("TTS: ROUND_INTRO_LINES has complete script lines for all 5 rounds", () => {
  const rounds = ["khoiDong", "vcnv", "tangToc", "veDich", "cauHoiPhu"];
  for (const r of rounds) {
    assert.ok(ROUND_INTRO_LINES[r]);
    assert.ok(ROUND_INTRO_LINES[r].text.length > 5);
  }
});

test("TTS: getContestantSpokenName cleans broadcast prefixes", () => {
  assert.equal(getContestantSpokenName("Thí sinh Nguyễn Hoàng"), "Nguyễn Hoàng");
  assert.equal(getContestantSpokenName("Ghế 1: Trần Văn Nam"), "Trần Văn Nam");
  assert.equal(getContestantSpokenName("Bạn Lê Minh"), "Lê Minh");
  assert.equal(getContestantSpokenName("TS. Phạm Quốc"), "Phạm Quốc");
  assert.equal(getContestantSpokenName("Hoàng Minh"), "Hoàng Minh");
  assert.equal(getContestantSpokenName(""), "");
});

test("TTS: generateBuzzerCallout produces all 3 base variants, probabilistic consecutive blend, and resets cleanly", () => {
  resetBuzzerTurnState();
  const name = "Thí sinh Minh Quân";

  // All 3 base non-consecutive variants
  assert.equal(generateBuzzerCallout(name, false, () => 0.05), "Minh Quân!");
  assert.equal(generateBuzzerCallout(name, false, () => 0.5), "Xin mời Minh Quân!");
  assert.equal(generateBuzzerCallout(name, false, () => 0.9), "Mời Minh Quân!");

  // Consecutive buzzers blend "Tiếp tục là ..." (~65%) and base variants (~35%)
  const consecutiveOutputs = new Set<string>();
  const seqRng = makeSeqRng([0.1, 0.4, 0.7, 0.85, 0.98]);
  for (let i = 0; i < 10; i++) {
    consecutiveOutputs.add(generateBuzzerCallout(name, true, seqRng));
  }
  assert.ok(consecutiveOutputs.has("Tiếp tục là Minh Quân!"));
  assert.ok(consecutiveOutputs.size >= 2, "Consecutive buzzers should vary probabilistically");

  resetBuzzerTurnState();
});

test("TTS: detectTextLanguage and segmentMixedLanguageText handle EN, VI, mixed, and protected abbreviations", () => {
  assert.equal(detectTextLanguage("What is the capital of Australia?"), "en");
  assert.equal(detectTextLanguage("Trong vật lý, định luật bảo toàn năng lượng nói về điều gì?"), "vi");
  assert.equal(detectTextLanguage("VTV3 phát sóng tại TP. HCM năm 1945 với GDP tăng 8%"), "vi");
  assert.equal(detectTextLanguage("1945"), "vi");
  assert.equal(detectTextLanguage("GDP"), "vi");
  assert.equal(detectTextLanguage("Nguyen Van A"), "vi");

  const mixed1 = segmentMixedLanguageText(
    "Câu hỏi tiếng Anh: What is the largest planet in our solar system?"
  );
  assert.equal(mixed1.length, 2);
  assert.equal(mixed1[0].lang, "vi");
  assert.equal(mixed1[1].lang, "en");
  assert.ok(mixed1[1].text.includes("What is the largest planet"));

  const mixed2 = segmentMixedLanguageText(
    "Trong sinh học, quá trình photosynthesis giúp cây xanh tổng hợp chất hữu cơ."
  );
  assert.ok(mixed2.some((s) => s.lang === "en" && s.text.includes("photosynthesis")));
  assert.ok(mixed2.some((s) => s.lang === "vi"));
});

test("TTS: word-boundary stop estimation and KD/CHP vs Về Đích timing constants", () => {
  assert.equal(KD_CHP_REFLEX_PAUSE_MS, 500);
  assert.equal(KD_CHP_POST_BELL_CALLOUT_MS, 500);
  assert.equal(VE_DICH_DRAMATIC_STEAL_DELAY_MS, 2500);

  const offsets = estimateWordBoundaryOffsetsMs("Một hai ba bốn năm", 1000);
  assert.equal(offsets.length, 5);
  assert.ok(offsets[0] > 0 && offsets[4] === 1000);

  const delay = computeBoundaryStopDelayMs("Một hai ba bốn năm", 220, 1000, 160);
  assert.ok(delay >= 0 && delay <= 160);
  assert.equal(computeBoundaryStopDelayMs("Một hai", 1100, 1000, 160), 0);
});

test("TTS: server TTS + WebAudio GainNode, 3D lip-sync event, 503 fallback & AbortController cancellation", async () => {
  const spoken: Array<{ text: string; pitch: number; rate: number; lang: string }> = [];
  const speakerEvents: Array<"khanh_vy" | "ngoc_huy" | null> = [];

  await withMockBrowserEnv(
    {
      spoken,
      speakerEvents,
      withAudioContext: true,
      origin: "http://localhost:3000",
    },
    async (controls) => {
      const fetchCalls: Array<{ url: string; body: any }> = [];
      configureTtsTransport({
        fetchImpl: (async (url: string, init?: RequestInit) => {
          fetchCalls.push({ url, body: JSON.parse(String(init?.body || "{}")) });
          return {
            ok: true,
            status: 200,
            arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer,
          } as unknown as Response;
        }) as unknown as typeof fetch,
      });

      // 1. Server TTS success path + 3D lip-sync event
      const ok = await speakOlympiaTTSAsync("Chào mừng các bạn!", {
        role: "khanh_vy",
        segment: "opening_duo",
      });
      assert.equal(ok, true);
      assert.equal(getTtsEngineMode(), "server");
      assert.equal(fetchCalls.length, 1);
      assert.equal(fetchCalls[0].url, "/api/olympia/tts");
      assert.equal(fetchCalls[0].body.role, "khanh_vy");
      assert.equal(fetchCalls[0].body.lang, "vi");
      assert.ok(speakerEvents.includes("khanh_vy"), "3D lip-sync event must emit active speaker");
      assert.equal((globalThis as any).window.__olympiaTtsSpeaker, null, "Must reset speaker to null on end");

      // 2. 503 error triggers automatic Web Speech fallback + status notification
      const statusChanges: string[] = [];
      const unsub = onTtsEngineStatusChange((s) => statusChanges.push(s.mode));
      configureTtsTransport({
        fetchImpl: (async () =>
          ({
            ok: false,
            status: 503,
            arrayBuffer: async () => new ArrayBuffer(0),
          }) as unknown as Response) as unknown as typeof fetch,
      });

      const fallbackOk = await speakOlympiaTTSAsync("Ngọc Huy tiếp lời!", {
        role: "ngoc_huy",
        segment: "round_intro",
      });
      unsub();
      assert.equal(fallbackOk, true);
      assert.equal(getTtsEngineMode(), "webspeech");
      assert.ok(getTtsEngineStatus().lastFallbackReason?.includes("503"));
      assert.ok(statusChanges.includes("webspeech"));
      assert.equal(spoken.length, 1);
      assert.equal(spoken[0].pitch, 0.88);
      assert.ok(speakerEvents.includes("ngoc_huy"), "Fallback Web Speech must also emit 3D lip-sync event");
      assert.equal((globalThis as any).window.__olympiaTtsSpeaker, null);

      // 3. AbortController cancellation on cancelTTS()
      resetTtsServerFallback();
      let signalAborted = false;
      configureTtsTransport({
        fetchImpl: ((_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              signalAborted = true;
              reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
            });
          })) as unknown as typeof fetch,
      });

      const pending = speakOlympiaTTSAsync("Câu hỏi đang tải...", {
        role: "khanh_vy",
        segment: "question",
      });
      cancelTTS();
      const pendingResult = await pending;
      assert.equal(signalAborted, true, "cancelTTS() must abort in-flight fetch");
      assert.equal(pendingResult, false);
      assert.equal((globalThis as any).window.__olympiaTtsSpeaker, null);
      assert.equal(controls.gainRamps.length, 0);
    }
  );
});

test("TTS: smoothStopOlympiaTTS ramps GainNode and resets lip-sync speaker", async () => {
  const speakerEvents: Array<"khanh_vy" | "ngoc_huy" | null> = [];
  await withMockBrowserEnv(
    {
      speakerEvents,
      withAudioContext: true,
      autoFireEnd: false,
      origin: "http://localhost:3000",
    },
    async (controls) => {
      configureTtsTransport({
        fetchImpl: (async () =>
          ({
            ok: true,
            status: 200,
            arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
          }) as unknown as Response) as unknown as typeof fetch,
      });

      const p = speakOlympiaTTSAsync("Đây là một câu hỏi rất dài trong phần thi Về đích", {
        role: "ngoc_huy",
        segment: "question",
      });
      // Wait microtasks for decodeAudioData + source.start
      await new Promise((r) => setTimeout(r, 20));
      assert.equal((globalThis as any).window.__olympiaTtsSpeaker, "ngoc_huy");

      const waitMs = smoothStopOlympiaTTS(40, 140);
      assert.ok(waitMs >= 40 && waitMs <= 190);
      assert.ok(controls.gainRamps.some((r) => r.value <= 0.001), "GainNode must ramp down smoothly");
      const done = await p;
      assert.equal(done, false);
      assert.equal((globalThis as any).window.__olympiaTtsSpeaker, null);
    }
  );
});

test("TTS: R2 Lobby, Opening Duo, 2-8 Contestant Intro (3D stepped & continuous) & Post-Intro Breather", () => {
  const lobby = buildLobbyGreetingScript({ roomName: "Chung kết Tuần 1" });
  assert.ok(lobby.length >= 1 && lobby[0].text.includes("Chung kết Tuần 1"));

  const openingNamed = buildOpeningDuoScript({ roomName: "Tuần 2 Tháng 1" });
  assert.equal(openingNamed[0].role, "khanh_vy");
  assert.equal(openingNamed[1].role, "ngoc_huy");
  assert.ok(openingNamed[0].text.includes("Tuần 2 Tháng 1"));

  const openingEmpty = buildOpeningDuoScript({ roomName: "   " });
  assert.ok(!openingEmpty[0].text.includes("trận đấu !"));
  assert.ok(openingEmpty[0].text.includes("Đường lên đỉnh Olympia"));

  const sample8Seats = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    name: `Thí sinh ${["An", "Bình", "Chi", "Dũng", "Em", "Giang", "Hà", "Khánh"][i]}`,
    school: i % 2 === 0 ? `THPT Số ${i + 1}` : "",
    score: 100 - i * 10,
  }));

  for (const count of [2, 4, 6, 8]) {
    const subset = sample8Seats.slice(0, count);

    // 3D stepped mode
    for (let idx = 0; idx < count; idx++) {
      const step = buildContestantIntroStepSegment(subset, idx)!;
      assert.equal(step.pauseAfterMs, 0);
      assert.equal(step.role, idx % 2 === 0 ? "khanh_vy" : "ngoc_huy");
      if (idx === count - 1) {
        assert.ok(step.text.startsWith("Và ở vị trí số"), "Last contestant must start with 'Và'");
      }
      if (!subset[idx].school) {
        assert.ok(!step.text.includes("đến từ"), "Empty school must omit 'đến từ'");
      } else {
        assert.ok(step.text.includes("đến từ Trung học phổ thông"));
      }
    }

    // Continuous skip/fast mode includes breather lines strictly before ready_check -> round_transition
    const cont = buildContestantIntroContinuousScript(subset, { firstRound: "khoiDong" });
    const breatherIdxs = cont
      .map((s, i) => (s.kind === "breather" ? i : -1))
      .filter((i) => i >= 0);
    const readyIdx = cont.findIndex((s) => s.kind === "ready_check");
    const transIdx = cont.findIndex((s) => s.kind === "round_transition");

    assert.ok(breatherIdxs.length >= 2, "Must have at least 2 breather lines before ready check");
    assert.ok(readyIdx > breatherIdxs[breatherIdxs.length - 1]);
    assert.ok(cont[readyIdx].text.includes("Các bạn đã sẵn sàng chưa?"));
    assert.ok(transIdx > readyIdx);
  }

  const standaloneBreather = buildPostIntroBreatherScript({ seatCount: 4, firstRound: "khoiDong" });
  assert.equal(standaloneBreather.filter((s) => s.kind === "breather").length, 2);
});

test("TTS: R2 Inter-round Summary + R6 Manual TS1->TSX Post-Match Summary + R8 Modular Award Tiers (never Giải Tư)", async () => {
  const seats = [
    { id: 0, name: "An", school: "THPT A", score: 140 },
    { id: 1, name: "Bình", school: "THPT B", score: 260 },
    { id: 2, name: "Chi", school: "THPT C", score: 180 },
    { id: 3, name: "Dũng", school: "THPT D", score: 90 },
    { id: 4, name: "Em", school: "", score: 70 },
    { id: 5, name: "Giang", school: "THPT F", score: 50 },
    { id: 6, name: "Hà", school: "THPT G", score: 40 },
    { id: 7, name: "Khánh", school: "THPT H", score: 20 },
  ];

  // Inter-round summary sorts ascending
  const interRound = buildScoreSummaryScript(seats.slice(0, 4), {
    completedRound: "khoiDong",
    nextRound: "vcnv",
  });
  assert.equal(interRound[0].seatId, 3); // 90
  assert.equal(interRound[3].seatId, 1); // 260
  assert.ok(interRound.some((s) => s.kind === "summary_commentary" && s.text.includes("Vượt Chướng Ngại Vật")));

  // Post-match manual summary: strictly seat order TS1->TS2->...->TS8, never sorted by score
  const opening = buildPostMatchMcOpeningSegment({ roomName: "Chung kết" });
  assert.equal(opening.length, 2);

  for (let i = 0; i < seats.length; i++) {
    const seg = buildPostMatchContestantSummarySegment(seats, seats[i].id)!;
    assert.equal(seg.seatId, seats[i].id, "Must address exact seat in TS1->TSX order");
    assert.equal(seg.pauseAfterMs, 0, "Manual post-match step must never auto-advance");
    assert.ok(!/giải tư/i.test(seg.text) && !/giải tư/i.test(seg.awardLabel || ""), "NEVER say Giải Tư");
  }

  // Exact audioTrack & playbackRate mapping for 8 seats
  const ts2Champ = buildPostMatchContestantSummarySegment(seats, 1)!; // 260 pts -> Rank 1
  assert.equal(ts2Champ.audioTrack, "6_NhacKhac/summary_rank_1");
  assert.equal(ts2Champ.playbackRate, 1.0);

  const ts3Second = buildPostMatchContestantSummarySegment(seats, 2)!; // 180 pts -> Rank 2
  assert.equal(ts3Second.audioTrack, "6_NhacKhac/summary_rank_2");
  assert.equal(ts3Second.playbackRate, 1.0);

  const ts1Third = buildPostMatchContestantSummarySegment(seats, 0)!; // 140 pts -> Rank 3
  assert.equal(ts1Third.audioTrack, "6_NhacKhac/summary_rank_3");
  assert.equal(ts1Third.playbackRate, 1.0);

  const ts4Fourth = buildPostMatchContestantSummarySegment(seats, 3)!; // 90 pts -> Rank 4
  assert.equal(ts4Fourth.audioTrack, "6_NhacKhac/summary_rank_4");
  assert.equal(ts4Fourth.playbackRate, 1.0);

  const expectedRates = [
    { id: 4, rate: 0.98 },
    { id: 5, rate: 0.96 },
    { id: 6, rate: 0.94 },
    { id: 7, rate: 0.92 },
  ];
  for (const exp of expectedRates) {
    const seg = buildPostMatchContestantSummarySegment(seats, exp.id)!;
    assert.equal(seg.audioTrack, "6_NhacKhac/summary_rank_4");
    assert.equal(seg.playbackRate, exp.rate);
    assert.equal(seg.pitchRate, exp.rate);
  }

  // Top tie without CHP -> tie notice
  const tiedSeats = [
    { id: 0, name: "An", score: 200 },
    { id: 1, name: "Bình", score: 200 },
    { id: 2, name: "Chi", score: 150 },
    { id: 3, name: "Dũng", score: 100 },
  ];
  const tiePlan = computeFinalAwardPlan(tiedSeats);
  assert.equal(tiePlan.isTieForFirst, true);
  assert.deepEqual(tiePlan.tiedLeaderIds, [0, 1]);
  assert.ok(tiePlan.segments.some((s) => s.text.includes("Câu hỏi phụ")));

  // Resolved by chpWinnerSeatId -> crowns CHP winner
  const resolvedPlan = computeFinalAwardPlan(tiedSeats, { chpWinnerSeatId: 1 });
  assert.equal(resolvedPlan.isTieForFirst, false);
  assert.equal(resolvedPlan.rankings[0].seat.id, 1);
  assert.equal(resolvedPlan.rankings[0].awardLabel, "Quán quân");

  // Full ceremony script: low-to-high + prize_award + ending_music + zero "Giải Tư"
  const fullCeremony = buildFinalAwardCeremonyScript(seats);
  assert.ok(fullCeremony.every((s) => !/giải tư/i.test(s.text)));
  assert.ok(fullCeremony.some((s) => s.audioTrack === "6_NhacKhac/prize_award"));
  assert.ok(fullCeremony.some((s) => s.audioTrack === "6_NhacKhac/ending_music"));

  // Modular per-tier builders & speakAwardTierAsync
  const thirdTier = buildAwardTierScript("third", seats.slice(0, 4), {
    tiers: { first: [1], second: [2], third: [0, 3] },
  });
  assert.ok(thirdTier.some((s) => s.text.includes("Đồng Giải Ba") || s.text.includes("đồng Giải Ba")));
  assert.ok(thirdTier.every((s) => !/giải tư/i.test(s.text)));

  const firstTier = buildAwardTierScript("first", seats.slice(0, 4), {
    tiers: { first: [1], second: [2], third: [0, 3] },
  });
  assert.ok(firstTier.some((s) => s.text.includes("Bình") && s.text.includes("Vòng Nguyệt Quế")));

  const closingTier = buildAwardTierScript("closing", seats.slice(0, 4));
  assert.equal(closingTier.length, 2);
  assert.equal(closingTier[0].audioTrack, "6_NhacKhac/ending_music");

  await withMockBrowserEnv({ spoken: [] }, async () => {
    const spokeClosing = await speakAwardTierAsync("closing", seats.slice(0, 4));
    assert.equal(spokeClosing, true);
  });
});

test("TTS: R3 Hype fillers, data-grounded explanations (VCNV hint guard) & Ve Dich steal variants", () => {
  assert.ok(Object.keys(HYPE_FILLER_BANK).length === 5);
  const filler = pickHypeFiller("streak", () => 0.25);
  assert.ok(HYPE_FILLER_BANK.streak.includes(filler));

  assert.equal(
    shouldTriggerAutoHypeFiller({ round: "khoiDong", isCorrect: true, streak: 3 }, () => 0.2),
    true
  );
  assert.equal(
    shouldTriggerAutoHypeFiller({ round: "khoiDong", isCorrect: true, streak: 1 }, () => 0.2),
    false
  );
  assert.equal(
    shouldTriggerAutoHypeFiller({ round: "veDich", isCorrect: true, points: 30, cooldownOk: false }, () => 0.2),
    false
  );

  // VCNV hint IS the row question -> must be ignored as explanation!
  assert.equal(
    buildAnswerExplanation({
      round: "vcnv",
      questionText: "Đây là câu hỏi hàng ngang số 1",
      hint: "Đây là câu hỏi hàng ngang số 1",
      answer: "Hà Nội",
    }),
    null
  );
  assert.equal(
    buildAnswerExplanation({
      round: "tangToc",
      questionText: "Ai là tác giả?",
      answer: "Nguyễn Du",
    }),
    null,
    "Must return null instead of hallucinating facts when explanation is absent"
  );
  assert.equal(
    buildAnswerExplanation({
      round: "veDich",
      explanation: "Quá trình quang hợp diễn ra tại lục lạp của tế bào thực vật.",
      answer: "Lục lạp",
    }),
    "Quá trình quang hợp diễn ra tại lục lạp của tế bào thực vật."
  );

  const kdExp = buildKhoiDongTurnExplanations([
    { q: "Q1", a: "O2", explanation: "Oxy chiếm khoảng 21% thể tích khí quyển" },
    { q: "Q2", a: "Hà Nội" },
  ]);
  assert.ok(kdExp?.includes("O2") && kdExp.includes("21 phần trăm"));

  assert.ok(VE_DICH_STEAL_PROMPT_VARIANTS.includes("Xin mời các bạn còn lại!"));
  assert.ok(
    VE_DICH_STEAL_PROMPT_VARIANTS.includes("Cơ hội bấm chuông dành cho các bạn còn lại, xin mời!")
  );
  const stealLine = generateVeDichStealPrompt(() => 0.3);
  assert.ok((VE_DICH_STEAL_PROMPT_VARIANTS as readonly string[]).includes(stealLine));
});

test("TTS: detectSpellingError accurately identifies diacritics, typos, gibberish, alternates & exemptions", () => {
  assert.equal(detectSpellingError("Hồ Chí Minh", "Hồ Chí Minh").isError, false);
  assert.equal(detectSpellingError("PARIS", "Paris").isError, false);

  // Target alternates
  assert.equal(detectSpellingError("CH4", "Methane (hoặc CH4)").isError, false);
  assert.equal(detectSpellingError("QUAN HỌ", "QUAN HỌ (5 chữ cái)").isError, false);

  // Diacritic & distance errors
  const diacritic1 = detectSpellingError("QUAN HO", "QUAN HỌ");
  assert.equal(diacritic1.isError, true);
  assert.equal(diacritic1.reason, "diacritic");

  const dist1 = detectSpellingError("PARISS", "PARIS");
  assert.equal(dist1.isError, true);
  assert.equal(dist1.reason, "distance");

  const shortDist = detectSpellingError("huee", "Hue");
  assert.equal(shortDist.isError, true);
  assert.equal(detectSpellingError("HUEE", "Huế").isError, true);

  // Distinct wrong real answer is NOT a spelling error
  assert.equal(detectSpellingError("Hà Nội", "Sài Gòn").isError, false);

  // Expanded mashes, repeated chars, stray symbols, awkward mixed digits
  for (const bad of ["sdkjfh", "kkk", "asdfgh", "qwrty", "zxcvb", "hjkl", "yuiop", "Ha@Noi", "Qu4ng", "aaaa"]) {
    const res = detectSpellingError(bad, "Quang hợp");
    assert.equal(res.isError, true, `Expected '${bad}' to be flagged`);
  }

  // Exemptions preserved: Roman numerals, numbers, units, acronyms
  assert.equal(detectSpellingError("III", "III").isError, false);
  for (const num of ["1945", "100", "1/2", "3.14", "100%"]) {
    assert.equal(detectSpellingError(num, num).isError, false);
    assert.equal(detectSpellingError(num).isError, false);
    assert.equal(detectSpellingError(num, "9999").isError, false);
  }
  assert.deepEqual(detectSpellingError("120 km/h", "100 km/h"), { isError: false });
  assert.deepEqual(detectSpellingError("25 °C", "30 °C"), { isError: false });
  assert.deepEqual(detectSpellingError("GDP", "GNP"), { isError: false });
  assert.deepEqual(detectSpellingError("HTTP", "HTML"), { isError: false });
  assert.deepEqual(detectSpellingError("TNT", "C4"), { isError: false });
});

test("TTS: groupContestantAnswers normalizes NFC/whitespace/punctuation and groups plural spelling errors", () => {
  assert.equal(normalizeAnswerForGrouping("  Quang   Hợp! "), "quang hợp");
  assert.notEqual(normalizeAnswerForGrouping("ma"), normalizeAnswerForGrouping("má"));
  assert.equal(normalizeAnswerForGrouping("9.8"), "9.8");

  const subsAllSame = [
    { seat: 0, name: "Thí sinh A", answer: "Quang hợp" },
    { seat: 1, name: "Thí sinh B", answer: "  quang hợp! " },
    { seat: 2, name: "Thí sinh C", answer: "QUANG HỢP" },
    { seat: 3, name: "Thí sinh D", answer: "Quang   hợp" },
  ];
  const groups1 = groupContestantAnswers(subsAllSame, "Quang hợp");
  assert.equal(groups1.length, 1);
  assert.equal(groups1[0].contestantNames.length, 4);
  assert.equal(
    generateGroupedAnswerCommentary(groups1, { round: "vcnv", totalContestants: 4 }),
    "Cả 4 bạn cùng có đáp án là Quang hợp."
  );

  // Plural spelling errors grouped together
  const subsMultiTypo = [
    { seat: 0, name: "Thí sinh Hoàng", answer: "QUANG HOP" },
    { seat: 1, name: "Thí sinh Linh", answer: "Qu4ng hợp" },
    { seat: 2, name: "Thí sinh Mai", answer: "Quang hợp" },
  ];
  const groupsTypos = groupContestantAnswers(subsMultiTypo, "Quang hợp");
  const commTypos = generateGroupedAnswerCommentary(groupsTypos, { round: "vcnv", totalContestants: 3 });
  assert.ok(commTypos.includes("Các bạn Hoàng, Linh viết sai chính tả."));
  assert.ok(commTypos.includes("Bạn Mai có đáp án là Quang hợp."));
});

test("TTS: generateTangTocTimeCallout handles <2000ms, tied times, and >=2 sharing fastest normalized answer", () => {
  // Fast < 2000ms (e.g. 1850ms)
  const fastSubs = [
    { seat: 0, name: "Thí sinh Huy", answer: "120", ms: 1850 },
    { seat: 1, name: "Thí sinh Lan", answer: "120", ms: 3400 },
  ];
  const fastCallout = generateTangTocTimeCallout(fastSubs);
  assert.ok(fastCallout?.includes("Bạn Huy trả lời rất nhanh, chỉ 1.85 giây!"));

  // Identical response times
  const tiedSubs = [
    { seat: 0, name: "Thí sinh Nam", answer: "A", ms: 2400 },
    { seat: 1, name: "Thí sinh Hoa", answer: "A", ms: 2400 },
    { seat: 2, name: "Thí sinh Kiên", answer: "B", ms: 4100 },
  ];
  const tiedCallout = generateTangTocTimeCallout(tiedSubs);
  assert.ok(tiedCallout?.includes("Hai bạn Nam và Hoa có cùng thời gian trả lời là 2.40 giây!"));

  // >= 2 sharing fastest normalized answer at distinct times >= 2000ms
  const sharedFastestSubs = [
    { seat: 0, name: "Thí sinh Minh", answer: "Quang hợp", ms: 2300 },
    { seat: 1, name: "Thí sinh Ngọc", answer: "quang hợp!", ms: 2650 },
    { seat: 2, name: "Thí sinh Sơn", answer: "Hô hấp", ms: 3100 },
  ];
  const sharedCallout = generateTangTocTimeCallout(sharedFastestSubs);
  assert.ok(sharedCallout?.includes("Minh") && sharedCallout.includes("2.30 giây"));
  assert.ok(sharedCallout?.includes("Ngọc") && sharedCallout.includes("2.65 giây"));

  // Distinct answers >= 2000ms with distinct times return null
  const normalSubs = [
    { seat: 0, name: "Thí sinh A", answer: "X", ms: 2100 },
    { seat: 1, name: "Thí sinh B", answer: "Y", ms: 3500 },
  ];
  assert.equal(generateTangTocTimeCallout(normalSubs), null);
});

test("TTS: VCNV CNV announcements & verdicts (batch + single)", () => {
  assert.equal(
    generateCnvBellsAnnouncement(["Thí sinh Quân"]),
    "Tín hiệu chuông xin trả lời Chướng ngại vật từ bạn Quân."
  );
  assert.equal(
    generateCnvBellsAnnouncement(["Thí sinh Quân", "Thí sinh Linh", "Thí sinh Phúc"]),
    "Tín hiệu chuông xin trả lời Chướng ngại vật từ bạn Quân, tiếp theo là Linh, Phúc."
  );
  assert.ok(generateSingleCnvBellAnnouncement("Thí sinh Quân", () => 0.1).includes("Quân"));

  const singleElim = formatCnvVerdictSpoken(false, "Thí sinh Nguyễn Văn A");
  assert.equal(
    singleElim,
    "Rất tiếc câu trả lời chưa chính xác. Bạn Nguyễn Văn A mất quyền chơi phần thi Vượt chướng ngại vật. Các bạn còn lại tiếp tục phần thi."
  );
  const multiElim = formatCnvVerdictSpoken(false, ["Thí sinh Nguyễn Văn A", "Bạn Trần Thị B"]);
  assert.equal(
    multiElim,
    "Rất tiếc các câu trả lời chưa chính xác. Các bạn Nguyễn Văn A, Trần Thị B đều đã bỏ lỡ cơ hội và dừng lại tại đây. Các bạn còn lại tiếp tục phần thi Vượt chướng ngại vật."
  );
  const correct = formatCnvVerdictSpoken(true, "Thí sinh Lê Văn C", "VĂN MIẾU");
  assert.equal(
    correct,
    "Chúc mừng bạn Lê Văn C đã trả lời chính xác Chướng ngại vật! Từ khóa là: VĂN MIẾU!"
  );
});

test("TTS: speakOlympiaResult, speakCnvBells, handleBuzzerInterrupt & cancelBuzzerInterrupt", async () => {
  const spoken: Array<{ text: string; pitch: number; rate: number; lang: string }> = [];
  await withMockBrowserEnv({ spoken, autoFireEnd: false }, async () => {
    setTtsEnabled(true);

    speakOlympiaResult(true, undefined, { round: "khoiDong", segIdx: 0 });
    speakOlympiaResult(false, "Hà Nội", { round: "khoiDong", segIdx: 0 });
    speakOlympiaResult(true, undefined, { round: "khoiDong", segIdx: 1 });
    speakOlympiaResult(false, "Sài Gòn", { round: "khoiDong", segIdx: 1 });

    assert.equal(spoken.length, 4);
    assert.ok(spoken[0].text.length > 0);
    assert.equal(spoken[0].pitch, 0.88);
    assert.ok(spoken[1].text.includes("Hà Nội"));
    assert.equal(spoken[1].pitch, 0.88);
    assert.ok(spoken[2].text.length > 0);
    assert.equal(spoken[2].pitch, 1.12);
    assert.ok(spoken[3].text.includes("Sài Gòn"));
    assert.equal(spoken[3].pitch, 1.12);

    speakCnvBells(["An", "Bình"], { round: "vcnv", rowIdx: 1 });
    assert.equal(spoken.length, 5);
    assert.equal(
      spoken[4].text,
      "Tín hiệu chuông xin trả lời Chướng ngại vật từ bạn An, tiếp theo là Bình."
    );
    assert.equal(spoken[4].pitch, 1.12);

    // Buzzer interrupt cancels cleanly with cancelBuzzerInterrupt()
    handleBuzzerInterrupt("Thí sinh Minh", {
      readingHost: "khanh_vy",
      coHost: "ngoc_huy",
      reflexPauseMs: 40,
    });
    cancelBuzzerInterrupt();
    await new Promise((r) => setTimeout(r, 60));
    assert.equal(spoken.length, 5, "Cancelled buzzer interrupt must not speak");
  });
});

test("TTS: dual-MC script async sequencing plays segments in order with pauses", async () => {
  const spoken: Array<{ text: string; pitch: number; rate: number; lang: string }> = [];
  await withMockBrowserEnv({ spoken, autoFireEnd: true }, async () => {
    const script = buildOpeningDuoScript({ roomName: "Tháng 3" });
    const ok = await speakDualMcScriptAsync(
      script.map((s) => ({ ...s, pauseAfterMs: 10 }))
    );
    assert.equal(ok, true);
    assert.equal(spoken.length, 2);
    assert.equal(spoken[0].pitch, 1.12);
    assert.equal(spoken[1].pitch, 0.88);
  });
});

// ============================================================================
// Milestone 1: Zero-File Streaming, Dual MC Separation & Offline Fallback Tests
// ============================================================================

test("TTS M1: zero disk writes during Edge TTS synthesis and streaming", async () => {
  let writeCalls = 0;
  const originalWriteFile = fs.writeFile;
  const originalWriteFileSync = fs.writeFileSync;
  const originalPromisesWriteFile = fs.promises.writeFile;
  const originalCreateWriteStream = fs.createWriteStream;

  try {
    (fs as any).writeFile = () => {
      writeCalls++;
      throw new Error("Disallowed disk write");
    };
    (fs as any).writeFileSync = () => {
      writeCalls++;
      throw new Error("Disallowed disk write");
    };
    (fs.promises as any).writeFile = async () => {
      writeCalls++;
      throw new Error("Disallowed disk write");
    };
    (fs as any).createWriteStream = () => {
      writeCalls++;
      throw new Error("Disallowed disk write");
    };

    resetTtsCacheForTesting();
    const mockAudio = Buffer.from([0xff, 0xfb, 0x90, 0x64, 0x01, 0x02, 0x03, 0x04]);
    const input = {
      text: "Xin chào quý vị khán giả!",
      role: "khanh_vy" as const,
      pitch: 1.12,
    };
    populateTtsCacheForTesting(input, mockAudio);

    // Call synthesizeEdgeTtsStream with pre-cached chunk
    const streamResult = await synthesizeEdgeTtsStream(input);
    assert.equal(streamResult.cacheHit, true);
    assert.ok(streamResult.stream instanceof ReadableStream);
    const reader = streamResult.stream.getReader();
    const chunk = await reader.read();
    assert.equal(chunk.done, false);
    assert.equal(chunk.value?.byteLength, mockAudio.byteLength);

    // Ensure 0 disk writes occurred
    assert.equal(writeCalls, 0, "No disk write should occur during streaming synthesis");
  } finally {
    fs.writeFile = originalWriteFile;
    fs.writeFileSync = originalWriteFileSync;
    fs.promises.writeFile = originalPromisesWriteFile;
    fs.createWriteStream = originalCreateWriteStream;
    resetTtsCacheForTesting();
  }
});

test("TTS M1: SSML prosody pitch generation, relative conversions & voice override validation", () => {
  // Numeric pitch conversions
  assert.equal(normalizePitch(1.12), "+12%");
  assert.equal(normalizePitch(0.88), "-12%");
  assert.equal(normalizePitch(1.16), "+16%");
  assert.equal(normalizePitch(0.84), "-16%");
  assert.equal(normalizePitch(1.0), "+0%");
  assert.equal(normalizePitch(1), "+0%");

  // Numeric string conversions
  assert.equal(normalizePitch("1.12"), "+12%");
  assert.equal(normalizePitch("0.88"), "-12%");

  // Explicit relative pitch units
  assert.equal(normalizePitch("+12%"), "+12%");
  assert.equal(normalizePitch("-12%"), "-12%");
  assert.equal(normalizePitch("12%"), "+12%");
  assert.equal(normalizePitch("-8Hz"), "-8Hz");
  assert.equal(normalizePitch("+5st"), "+5st");

  // Defaults
  assert.equal(normalizePitch(""), "+0Hz");
  assert.equal(normalizePitch(undefined), "+0Hz");

  // Invalid pitch
  assert.throws(() => normalizePitch("invalid_format"), TtsValidationError);
  assert.throws(() => normalizePitch(NaN), TtsValidationError);

  // Safe voice name override
  const validOverride = validateAndNormalizeTtsInput({
    text: "Thí sinh trả lời rất nhanh!",
    role: "khanh_vy",
    voice: "vi-VN-DaatNeural",
    pitch: 1.12,
  });
  assert.equal(validOverride.voice, "vi-VN-DaatNeural");
  assert.equal(validOverride.pitch, "+12%");

  // Unsafe voice name override rejected
  assert.throws(
    () =>
      validateAndNormalizeTtsInput({
        text: "Chào",
        role: "khanh_vy",
        voice: "vi-VN-Voice<script>",
      }),
    TtsValidationError
  );

  // SSML generation
  const ssml = buildEdgeSsml("Xin chào khán giả!", "vi-VN-HoaiMyNeural", "+5%", "+12%");
  assert.ok(
    ssml.includes("<prosody pitch='+12%' rate='+5%' volume='+0%'>Xin chào khán giả!</prosody>")
  );
  assert.ok(ssml.includes("<voice name='vi-VN-HoaiMyNeural'>"));
});

test("TTS M1: streaming response & in-memory cache accumulation (zero static files)", async () => {
  resetTtsCacheForTesting();

  // Validate cache hit stream yields Uint8Array chunks from memory
  const mockAudio = Buffer.from([0xff, 0xfb, 0x90, 0x64, 0x11, 0x22, 0x33, 0x44]);
  const input = {
    text: "Chào mừng các bạn đến với S14",
    role: "khanh_vy" as const,
    pitch: "+12%",
  };
  populateTtsCacheForTesting(input, mockAudio);

  const streamResult = await synthesizeEdgeTtsStream(input);
  assert.equal(streamResult.cacheHit, true);
  assert.equal(streamResult.voice, "vi-VN-HoaiMyNeural");
  assert.equal(streamResult.pitch, "+12%");
  assert.ok(streamResult.stream instanceof ReadableStream);

  const reader = streamResult.stream.getReader();
  const { value, done } = await reader.read();
  assert.equal(done, false);
  assert.ok(value instanceof Uint8Array);
  assert.deepEqual(Array.from(value!), Array.from(mockAudio));
  const next = await reader.read();
  assert.equal(next.done, true);

  resetTtsCacheForTesting();
});

test("TTS M1: instant offline fallback when navigator.onLine === false (0ms delay, no fetch)", async () => {
  const spoken: Array<{ text: string; pitch: number; rate: number; lang: string }> = [];
  const speakerEvents: Array<"khanh_vy" | "ngoc_huy" | null> = [];
  const fetchCalls: Array<{ url: string }> = [];

  await withMockBrowserEnv(
    {
      spoken,
      speakerEvents,
      onLine: false, // Disconnected from network
      origin: "http://localhost:3000",
      withAudioContext: true,
    },
    async () => {
      configureTtsTransport({
        fetchImpl: (async (url: string) => {
          fetchCalls.push({ url });
          throw new Error("Network request should never be made when offline");
        }) as unknown as typeof fetch,
      });

      const start = Date.now();
      const ok = await speakOlympiaTTSAsync("Thử nghiệm ngoại tuyến", {
        role: "khanh_vy",
        segment: "round_intro",
      });
      const elapsed = Date.now() - start;

      assert.equal(ok, true);
      assert.equal(fetchCalls.length, 0, "Must not attempt fetch when navigator.onLine === false");
      assert.ok(elapsed < 100, `Must fail over instantly with 0ms delay, took ${elapsed}ms`);
      assert.equal(spoken.length, 1);
      assert.equal(spoken[0].text, "Thử nghiệm ngoại tuyến");
      assert.ok(speakerEvents.includes("khanh_vy"), "Must emit 3D lip-sync speaker even when offline");
      assert.equal((globalThis as any).window.__olympiaTtsSpeaker, null);
    }
  );
});

test("TTS M1: strict dual MC voice separation and mutual exclusion in Web Speech", async () => {
  // Case A: 2 voices where voice 0 is male -> Khánh Vy must NOT pick male voice!
  await withMockBrowserEnv(
    {
      voices: [
        { name: "Microsoft NamMinh Online (Natural) - Vietnamese", lang: "vi-VN" },
        { name: "Google Tiếng Việt", lang: "vi-VN" },
      ],
    },
    () => {
      const kv = resolveMCVoiceConfig("khanh_vy", "vi");
      const nh = resolveMCVoiceConfig("ngoc_huy", "vi");

      assert.ok(kv.voice !== null);
      assert.ok(nh.voice !== null);
      assert.equal(kv.voice?.name, "Google Tiếng Việt", "Khánh Vy must reject male voice and pick alternative");
      assert.equal(nh.voice?.name, "Microsoft NamMinh Online (Natural) - Vietnamese", "Ngọc Huy picks male voice");
      assert.notEqual(kv.voice?.name, nh.voice?.name, "MCs must never share the same voice");
    }
  );

  // Case B: 2 genderless voices -> must assign distinct voices (index 0 vs 1)
  await withMockBrowserEnv(
    {
      voices: [
        { name: "Vietnamese Neutral Voice A", lang: "vi-VN" },
        { name: "Vietnamese Neutral Voice B", lang: "vi-VN" },
      ],
    },
    () => {
      const kv = resolveMCVoiceConfig("khanh_vy", "vi");
      const nh = resolveMCVoiceConfig("ngoc_huy", "vi");

      assert.notEqual(kv.voice?.name, nh.voice?.name, "Genderless voices must still be mutually exclusive");
    }
  );

  // Case C: English voices separation
  await withMockBrowserEnv(
    {
      voices: [
        { name: "Microsoft Jenny Online (Natural) - English (United States)", lang: "en-US" },
        { name: "Microsoft Guy Online (Natural) - English (United States)", lang: "en-US" },
      ],
    },
    () => {
      const kv = resolveMCVoiceConfig("khanh_vy", "en");
      const nh = resolveMCVoiceConfig("ngoc_huy", "en");

      assert.equal(kv.voice?.name, "Microsoft Jenny Online (Natural) - English (United States)");
      assert.equal(nh.voice?.name, "Microsoft Guy Online (Natural) - English (United States)");
      assert.notEqual(kv.voice?.name, nh.voice?.name);
    }
  );
});

test("TTS M1: single-voice fallback acoustic differentiation (pitch 1.16 vs 0.84, rate 1.05 vs 1.00)", async () => {
  await withMockBrowserEnv(
    {
      voices: [{ name: "Google Tiếng Việt", lang: "vi-VN" }],
    },
    () => {
      const kv = resolveMCVoiceConfig("khanh_vy", "vi");
      const nh = resolveMCVoiceConfig("ngoc_huy", "vi");

      // Both voices are identical because only 1 voice is installed on machine
      assert.equal(kv.voice?.name, "Google Tiếng Việt");
      assert.equal(nh.voice?.name, "Google Tiếng Việt");

      // BUT acoustic timbre separation must enforce strong contrast
      assert.equal(kv.pitch, 1.16, "Khánh Vy must have high-timbre pitch 1.16 when sharing single voice");
      assert.equal(nh.pitch, 0.84, "Ngọc Huy must have deep-timbre pitch 0.84 when sharing single voice");
      assert.equal(kv.rate, 1.05, "Khánh Vy must have brisk broadcast rate 1.05");
      assert.equal(nh.rate, 1.00, "Ngọc Huy must have steady cadence rate 1.00");
    }
  );
});

test("TTS M1: forwarding custom voice, pitch, and voiceConfig in SpeakTTSOptions to server fetch", async () => {
  const fetchCalls: Array<any> = [];

  await withMockBrowserEnv(
    {
      withAudioContext: true,
      origin: "http://localhost:3000",
    },
    async () => {
      configureTtsTransport({
        fetchImpl: (async (_url: string, init?: RequestInit) => {
          fetchCalls.push(JSON.parse(String(init?.body || "{}")));
          return {
            ok: true,
            status: 200,
            arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer,
          } as unknown as Response;
        }) as unknown as typeof fetch,
      });

      // 1. Direct options override: voice and numeric pitch
      await speakOlympiaTTSAsync("Thử giọng trực tiếp", {
        role: "khanh_vy",
        voice: "vi-VN-DaatNeural",
        pitch: 1.16,
      });
      assert.equal(fetchCalls.length, 1);
      assert.equal(fetchCalls[0].role, "khanh_vy");
      assert.equal(fetchCalls[0].voice, "vi-VN-DaatNeural");
      assert.equal(fetchCalls[0].pitch, 1.16);

      // 2. Custom voiceConfig object override
      await speakOlympiaTTSAsync("Kiểm tra cấu hình giọng", {
        role: "ngoc_huy",
        voiceConfig: {
          voiceName: "vi-VN-NamMinhNeural",
          pitch: 0.84,
          rate: 1.02,
        },
      });
      assert.equal(fetchCalls.length, 2);
      assert.equal(fetchCalls[1].role, "ngoc_huy");
      assert.equal(fetchCalls[1].voice, "vi-VN-NamMinhNeural");
      assert.equal(fetchCalls[1].pitch, 0.84);
    }
  );
});

test("TTS M1: immediate voiceConfig override in resolveMCVoiceConfig", () => {
  const custom = resolveMCVoiceConfig("khanh_vy", "vi", {
    pitch: 1.35,
    rate: 1.15,
  });
  assert.equal(custom.pitch, 1.35);
  assert.equal(custom.rate, 1.15);
});

test("TTS M1 remediation: language suffix stripping and word boundary token separation", async () => {
  await withMockBrowserEnv(
    {
      voices: [
        { name: "Microsoft Thanh - Vietnamese (Vietnam)", lang: "vi-VN" },
        { name: "Microsoft HoaiMy - Vietnamese (Vietnam)", lang: "vi-VN" },
      ],
    },
    () => {
      const kv = resolveMCVoiceConfig("khanh_vy", "vi");
      const nh = resolveMCVoiceConfig("ngoc_huy", "vi");

      assert.ok(kv.voice !== null);
      assert.ok(nh.voice !== null);
      assert.equal(
        kv.voice?.name,
        "Microsoft HoaiMy - Vietnamese (Vietnam)",
        "Khánh Vy must be assigned female voice HoaiMy, not Thanh"
      );
      assert.equal(
        nh.voice?.name,
        "Microsoft Thanh - Vietnamese (Vietnam)",
        "Ngọc Huy must be assigned male voice Thanh, not HoaiMy"
      );
      assert.notEqual(kv.voice?.name, nh.voice?.name);
    }
  );
});

test("TTS M1 remediation: single male voice pool assigns null to Khánh Vy (does not cross-assign male voice)", async () => {
  await withMockBrowserEnv(
    {
      voices: [
        { name: "Microsoft NamMinh Online (Natural) - Vietnamese", lang: "vi-VN" },
      ],
    },
    () => {
      const kv = resolveMCVoiceConfig("khanh_vy", "vi");
      const nh = resolveMCVoiceConfig("ngoc_huy", "vi");

      assert.equal(kv.voice, null, "Khánh Vy must NOT be cross-assigned a male voice");
      assert.equal(
        nh.voice?.name,
        "Microsoft NamMinh Online (Natural) - Vietnamese",
        "Ngọc Huy receives the male voice"
      );
      assert.equal(kv.pitch, 1.16, "Khánh Vy maintains acoustic differentiation pitch 1.16");
      assert.equal(nh.pitch, 0.84, "Ngọc Huy maintains acoustic differentiation pitch 0.84");
      assert.equal(kv.rate, 1.05, "Khánh Vy maintains acoustic differentiation rate 1.05");
      assert.equal(nh.rate, 1.00, "Ngọc Huy maintains acoustic differentiation rate 1.00");
    }
  );
});

test("TTS M1 remediation: single female voice pool assigns null to Ngọc Huy (does not cross-assign female voice)", async () => {
  await withMockBrowserEnv(
    {
      voices: [
        { name: "Microsoft HoaiMy Online (Natural) - Vietnamese", lang: "vi-VN" },
      ],
    },
    () => {
      const kv = resolveMCVoiceConfig("khanh_vy", "vi");
      const nh = resolveMCVoiceConfig("ngoc_huy", "vi");

      assert.equal(
        kv.voice?.name,
        "Microsoft HoaiMy Online (Natural) - Vietnamese",
        "Khánh Vy receives the female voice"
      );
      assert.equal(nh.voice, null, "Ngọc Huy must NOT be cross-assigned a female voice");
      assert.equal(kv.pitch, 1.16, "Khánh Vy maintains acoustic differentiation pitch 1.16");
      assert.equal(nh.pitch, 0.84, "Ngọc Huy maintains acoustic differentiation pitch 0.84");
      assert.equal(kv.rate, 1.05, "Khánh Vy maintains acoustic differentiation rate 1.05");
      assert.equal(nh.rate, 1.00, "Ngọc Huy maintains acoustic differentiation rate 1.00");
    }
  );
});

test("TTS M1 remediation: pool of duplicate male voices assigns null to Khánh Vy with acoustic differentiation", async () => {
  await withMockBrowserEnv(
    {
      voices: [
        { name: "Microsoft NamMinh", lang: "vi-VN" },
        { name: "Microsoft NamMinh", lang: "vi-VN" },
        { name: "Microsoft Thanh", lang: "vi-VN" },
      ],
    },
    () => {
      const kv = resolveMCVoiceConfig("khanh_vy", "vi");
      const nh = resolveMCVoiceConfig("ngoc_huy", "vi");

      assert.equal(kv.voice, null, "Khánh Vy must not be cross-assigned a male voice in all-male pool");
      assert.ok(nh.voice !== null);
      assert.equal(kv.pitch, 1.16, "Khánh Vy pitch remains 1.16 in mono-gender male pool");
      assert.equal(nh.pitch, 0.84, "Ngọc Huy pitch remains 0.84 in mono-gender male pool");
    }
  );
});

test("TTS M1 remediation: smoothStopOlympiaTTS during in-flight server fetch halts cleanly without Web Speech fallback", async () => {
  const spoken: Array<{ text: string; pitch: number; rate: number; lang: string }> = [];
  const speakerEvents: Array<"khanh_vy" | "ngoc_huy" | null> = [];

  await withMockBrowserEnv(
    {
      spoken,
      speakerEvents,
      withAudioContext: true,
      origin: "http://localhost:3000",
    },
    async () => {
      resetTtsServerFallback();
      let fetchAborted = false;

      configureTtsTransport({
        fetchImpl: ((_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              fetchAborted = true;
              reject(Object.assign(new Error("The user aborted a request."), { name: "AbortError" }));
            });
          })) as unknown as typeof fetch,
      });

      const speechPromise = speakOlympiaTTSAsync("Câu hỏi số 1 đang phát...", {
        role: "khanh_vy",
        segment: "question",
      });

      // Stop while fetch is still in flight
      const stopDelay = smoothStopOlympiaTTS(45, 160);
      assert.ok(stopDelay >= 0);

      const result = await speechPromise;

      assert.equal(result, false, "Must resolve to false when stopped during fetch");
      assert.equal(fetchAborted, true, "Active fetch must be aborted");
      assert.equal(spoken.length, 0, "Must NOT speak via Web Speech fallback after smoothStop");
      assert.equal(getTtsEngineMode(), "server", "Engine mode must remain 'server', NOT fall back to 'webspeech'");
      assert.equal(getTtsEngineStatus().serverCooldownUntil, 0, "Must NOT enter 15-second cooldown on smoothStop");
      assert.equal((globalThis as any).window.__olympiaTtsSpeaker, null, "Speaker event must be cleared");
    }
  );
});

test("TTS R5: Turn & round bridging builders produce alternating Vietnamese MC lines and cancelQuestionTTS preserves bridging speech", async () => {
  const kdSolo = buildKhoiDongTurnBridgeSegment({ segKind: "solo", segIdx: 1, seatId: 1, name: "Minh Anh" });
  assert.equal(kdSolo.role, "khanh_vy");
  assert.ok(kdSolo.text.includes("Minh Anh"));

  const kdShared = buildKhoiDongTurnBridgeSegment({ segKind: "shared", segIdx: 4, seatCount: 4 });
  assert.equal(kdShared.role, "ngoc_huy");
  assert.ok(kdShared.text.includes("Khởi Động chung") && kdShared.text.includes("4"));

  const vcnvRow = buildVcnvRowBridgeSegment({ mode: "selecting", rowIdx: 0, letterCount: 7 });
  assert.ok(vcnvRow.text.includes("Hàng ngang số 1") && vcnvRow.text.includes("7 chữ cái"));
  const vcnvCenter = buildVcnvRowBridgeSegment({ mode: "selecting", rowIdx: 4 });
  assert.ok(vcnvCenter.text.includes("ô trung tâm"));

  const ttBridge = buildTangTocBridgeSegment({ qIdx: 3, totalQuestions: 4, timeSec: 40 });
  assert.ok(ttBridge.text.includes("40 giây") && ttBridge.text.includes("cuối cùng"));

  const vdStage = buildVeDichBridgeSegment({ kind: "on_stage", seatId: 0, name: "Gia Khánh", score: 150, turnIdx: 0, totalTurns: 4 });
  assert.ok(vdStage.text.includes("Gia Khánh") && vdStage.text.includes("150 điểm"));
  const vdPkg = buildVeDichBridgeSegment({ kind: "package_ready", seatId: 0, name: "Gia Khánh", score: 150, turnIdx: 0, totalTurns: 4, packagePoints: [20, 20, 30] });
  assert.ok(vdPkg.text.includes("20 - 20 - 30"));

  const roundDone = buildRoundCompleteBridgeSegment("tangToc");
  assert.ok(roundDone.text.includes("Tăng Tốc"));

  // cancelQuestionTTS() must NOT cancel active breather / bridging playback
  await withMockBrowserEnv({ spoken: [], speakerEvents: [], origin: "http://localhost:3000" }, async () => {
    setTtsEnabled(true);
    let aborted = false;
    configureTtsTransport({
      fetchImpl: ((_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            aborted = true;
            reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
          });
        })) as unknown as typeof fetch,
    });

    const p = speakOlympiaTTSAsync("Lời dẫn đệm...", { role: "khanh_vy", segment: "breather" });
    assert.equal(getActivePlaybackSegment(), "breather");
    cancelQuestionTTS();
    assert.equal(aborted, false, "cancelQuestionTTS must NOT abort active breather speech");
    cancelTTS();
    assert.equal(aborted, true, "cancelTTS aborts breather speech when explicitly requested");
    await p;
  });
});

test("TTS R1.4: queueAfterActive chains DualMC scripts & speakRoundIntroTTS in strict FIFO without cancelling, and aborts on cancelTTS", async () => {
  const spoken: Array<{ text: string; pitch: number; rate: number; lang: string }> = [];
  await withMockBrowserEnv({ spoken, autoFireEnd: false }, async (controls) => {
    setTtsEnabled(true);
    let synthCancelCount = 0;
    const synth = (globalThis as any).window.speechSynthesis;
    const origCancel = synth.cancel;
    synth.cancel = () => {
      synthCancelCount++;
      return origCancel();
    };

    // 1. speakRoundIntroTTS returns Promise<boolean> and queues cleanly into KhoiDong segIdx=0
    const introPromise = speakRoundIntroTTS("khoiDong", { engine: "webspeech" });
    assert.equal(spoken.length, 1, "Non-queued speakRoundIntroTTS must still invoke speechSynthesis.speak synchronously");
    assert.equal(synthCancelCount, 1, "Initial non-queued call triggered cancelPlaybackOnly");

    const kd0 = buildKhoiDongTurnBridgeSegment({
      segKind: "solo",
      segIdx: 0,
      seatId: 0,
      name: "Minh Quân",
    });
    assert.ok(!/bàn phím chuông|bấm chuông/i.test(kd0.text), "Khởi Động solo segIdx=0 must never mention buzzers");
    assert.ok(kd0.text.includes("Minh Quân"));

    const queuedKd0Promise = speakDualMcScriptAsync([kd0], {
      engine: "webspeech",
      queueAfterActive: true,
    });
    const queuedThirdPromise = speakOlympiaTTSAsync("Lời dẫn thứ ba", {
      engine: "webspeech",
      queueAfterActive: true,
    });

    // Neither queued call has cancelled or interrupted the active intro yet
    assert.equal(spoken.length, 1);
    assert.equal(synthCancelCount, 1, "Queued calls must NOT call speechSynthesis.cancel");

    // Finish segment 1 -> segment 2 fires
    controls.lastUtterance().onend();
    const introResult = await introPromise;
    assert.equal(introResult, true);
    await new Promise((r) => setTimeout(r, 5));
    assert.equal(spoken.length, 2);
    assert.ok(spoken[1].text.includes("Minh Quân"));

    // Finish segment 2 -> segment 3 fires
    controls.lastUtterance().onend();
    const kd0Result = await queuedKd0Promise;
    assert.equal(kd0Result, true);
    await new Promise((r) => setTimeout(r, 5));
    assert.equal(spoken.length, 3);
    assert.equal(spoken[2].text, "Lời dẫn thứ ba");

    controls.lastUtterance().onend();
    assert.equal(await queuedThirdPromise, true);

    // 2. cancelTTS() aborts pending queued continuation
    const pActive = speakOlympiaTTSAsync("Đang phát", { engine: "webspeech" });
    const pQueuedAborted = speakDualMcScriptAsync([kd0], {
      engine: "webspeech",
      queueAfterActive: true,
    });
    const prevCount = spoken.length;
    cancelTTS();
    assert.equal(await pActive, false);
    assert.equal(await pQueuedAborted, false);
    assert.equal(spoken.length, prevCount, "Aborted queued script must never speak");

    // 3. Unknown round intro returns Promise.resolve(false)
    assert.equal(await speakRoundIntroTTS("nonExistentRound"), false);

    // 4. speakRoundIntroTTS itself supports queueAfterActive: true without cancelling active playback
    const firstActive = speakOlympiaTTSAsync("Lời dẫn trước", { engine: "webspeech" });
    const queuedIntro = speakRoundIntroTTS("veDich", {
      engine: "webspeech",
      queueAfterActive: true,
    });
    const countBeforeEnd = spoken.length;
    controls.lastUtterance().onend();
    assert.equal(await firstActive, true);
    await new Promise((r) => setTimeout(r, 5));
    assert.equal(spoken.length, countBeforeEnd + 1);
    controls.lastUtterance().onend();
    assert.equal(await queuedIntro, true);
  });
});

test("TTS R1.4: speakDualMcScriptAsync resolves false promptly when cancelled, reset, stopped, or interrupted during pauseAfterMs", async () => {
  const raceTimeout = <T,>(promise: Promise<T>, label: string): Promise<T> =>
    Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timed out waiting for ${label}`)), 250)
      ),
    ]);

  const twoSegScript = [
    { role: "khanh_vy" as const, kind: "greeting" as const, text: "Câu đầu tiên", pauseAfterMs: 5000 },
    { role: "ngoc_huy" as const, kind: "hype" as const, text: "Câu thứ hai", pauseAfterMs: 0 },
  ];

  // 1. cancelTTS() during pauseAfterMs
  await withMockBrowserEnv({ autoFireEnd: false }, async (controls) => {
    setTtsEnabled(true);
    const p = speakDualMcScriptAsync(twoSegScript, { engine: "webspeech" });
    controls.lastUtterance().onend();
    await new Promise((r) => setTimeout(r, 15));
    cancelTTS();
    assert.equal(await raceTimeout(p, "cancelTTS during pauseAfterMs"), false);
  });

  // 2. resetOlympiaTtsSession() during pauseAfterMs
  await withMockBrowserEnv({ autoFireEnd: false }, async (controls) => {
    setTtsEnabled(true);
    const p = speakDualMcScriptAsync(twoSegScript, { engine: "webspeech" });
    controls.lastUtterance().onend();
    await new Promise((r) => setTimeout(r, 15));
    resetOlympiaTtsSession();
    assert.equal(await raceTimeout(p, "resetOlympiaTtsSession during pauseAfterMs"), false);
  });

  // 3. smoothStopOlympiaTTS() during pauseAfterMs
  await withMockBrowserEnv({ autoFireEnd: false }, async (controls) => {
    setTtsEnabled(true);
    const p = speakDualMcScriptAsync(twoSegScript, { engine: "webspeech" });
    controls.lastUtterance().onend();
    await new Promise((r) => setTimeout(r, 15));
    smoothStopOlympiaTTS();
    assert.equal(await raceTimeout(p, "smoothStopOlympiaTTS during pauseAfterMs"), false);
  });

  // 4. Non-queued speakOlympiaTTSAsync() interrupting during pauseAfterMs
  const spoken: Array<{ text: string; pitch: number; rate: number; lang: string }> = [];
  await withMockBrowserEnv({ spoken, autoFireEnd: false }, async (controls) => {
    setTtsEnabled(true);
    const p1 = speakDualMcScriptAsync(twoSegScript, { engine: "webspeech" });
    controls.lastUtterance().onend();
    await new Promise((r) => setTimeout(r, 15));
    const p2 = speakOlympiaTTSAsync("Ngắt lời ngay", { engine: "webspeech" });
    assert.equal(await raceTimeout(p1, "non-queued speakOlympiaTTSAsync interrupt during pauseAfterMs"), false);
    controls.lastUtterance().onend();
    assert.equal(await p2, true);
    assert.equal(spoken.filter((s) => s.text === "Câu thứ hai").length, 0);
  });
});

test("TTS R1.4: buildEntranceOpeningBridge, buildKhoiDongTurnBridgeSegment (segIdx=0), and buildVeDichBridgeSegment (pre_stage vs on_stage)", () => {
  const seats = [
    { id: 0, name: "An", school: "THPT A", score: 0 },
    { id: 1, name: "Bình", school: "THPT B", score: 0 },
  ];
  const entranceBridge = buildEntranceOpeningBridge(seats);
  assert.ok(entranceBridge !== null);
  assert.equal(entranceBridge.role, "ngoc_huy");
  assert.ok(entranceBridge.text.includes("2 nhà leo núi"));
  assert.equal(buildEntranceOpeningBridge([]), null);

  // buildContestantIntroStepSegment(seats, 0) remains preserved
  const step0 = buildContestantIntroStepSegment(seats, 0)!;
  assert.equal(step0.pauseAfterMs, 0);
  assert.equal(step0.role, "khanh_vy");
  assert.ok(step0.text.startsWith("Ở vị trí số 1"));

  // KhoiDong segIdx === 0 variants
  const kdSolo0 = buildKhoiDongTurnBridgeSegment({ segKind: "solo", segIdx: 0, seatId: 0, name: "An" });
  assert.equal(kdSolo0.role, "ngoc_huy");
  assert.ok(kdSolo0.text.includes("thí sinh đầu tiên") && kdSolo0.text.includes("An"));
  assert.ok(!/bàn phím chuông|bấm chuông/i.test(kdSolo0.text));

  const kdShared0 = buildKhoiDongTurnBridgeSegment({ segKind: "shared", segIdx: 0, seatCount: 4 });
  assert.ok(kdShared0.text.includes("Khởi Động chung đầu tiên") && kdShared0.text.includes("4"));

  const kdTurn0 = buildKhoiDongTurnBridgeSegment({ segKind: "turn", segIdx: 0, seatCount: 4 });
  assert.ok(kdTurn0.text.includes("Khởi Động đầu tiên") && kdTurn0.text.includes("4"));

  // VeDich pre_stage vs on_stage
  const vdPre0 = buildVeDichBridgeSegment({
    kind: "pre_stage",
    seatId: 0,
    name: "Gia Khánh",
    score: 150,
    turnIdx: 0,
    totalTurns: 4,
  });
  assert.ok(vdPre0.text.includes("thí sinh đầu tiên") && vdPre0.text.includes("Gia Khánh") && vdPre0.text.includes("150 điểm"));

  const vdPre1 = buildVeDichBridgeSegment({
    kind: "pre_stage",
    seatId: 1,
    name: "Minh Anh",
    score: 180,
    turnIdx: 1,
    totalTurns: 4,
  });
  assert.ok(vdPre1.text.includes("thí sinh tiếp theo") && vdPre1.text.includes("Minh Anh"));

  const vdOnStage0 = buildVeDichBridgeSegment({
    kind: "on_stage",
    seatId: 0,
    name: "Gia Khánh",
    score: 150,
    turnIdx: 0,
    totalTurns: 4,
  });
  assert.ok(vdOnStage0.text.includes("Gia Khánh") && vdOnStage0.text.includes("150 điểm"));
});

test("TTS R3.4 Core: resetOlympiaTtsSession, >600ms server fetch tolerance, suspended AudioContext fallback, single-shot unlock & Web Speech watchdog", async () => {
  // 1. Server fetch >600ms succeeds on default engine without premature timeout
  await withMockBrowserEnv(
    { withAudioContext: true, origin: "http://localhost:3000" },
    async () => {
      resetOlympiaTtsSession();
      configureTtsTransport({
        fetchImpl: (async (_url: string, init?: RequestInit) => {
          await new Promise<void>((resolve, reject) => {
            const t = setTimeout(resolve, 650);
            init?.signal?.addEventListener("abort", () => {
              clearTimeout(t);
              reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
            });
          });
          return {
            ok: true,
            status: 200,
            arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
          } as unknown as Response;
        }) as unknown as typeof fetch,
      });

      const ok = await speakOlympiaTTSAsync("Kiểm tra độ trễ server 650ms", { role: "khanh_vy" });
      assert.equal(ok, true, "Default engine must tolerate >600ms server TTS responses");
      assert.equal(getTtsEngineMode(), "server");
    }
  );

  // 2. Suspended AudioContext (where resume() leaves state === 'suspended') falls through to HTMLAudioElement
  let htmlAudioPlayed = false;
  await withMockBrowserEnv(
    {
      withAudioContext: true,
      withHtmlAudio: true,
      origin: "http://localhost:3000",
    },
    async () => {
      resetOlympiaTtsSession();
      (globalThis as any).window.AudioContext = class SuspendedAudioContext {
        state = "suspended";
        async resume() {
          // Remains suspended (simulates unclicked iframe #2)
        }
        async decodeAudioData() {
          throw new Error("should not decode suspended context");
        }
      };
      const OrigAudio = (globalThis as any).window.Audio;
      (globalThis as any).window.Audio = class TrackedHtmlAudio extends OrigAudio {
        play() {
          htmlAudioPlayed = true;
          return super.play();
        }
      };
      (globalThis as any).Audio = (globalThis as any).window.Audio;

      configureTtsTransport({
        fetchImpl: (async () =>
          ({
            ok: true,
            status: 200,
            arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
          }) as unknown as Response) as unknown as typeof fetch,
      });

      const ok = await speakOlympiaTTSAsync("Phát qua HTMLAudio", { role: "ngoc_huy" });
      assert.equal(ok, true);
      assert.equal(htmlAudioPlayed, true, "Must fall through to HTMLAudioElement when AudioContext stays suspended");
    }
  );

  // 3. Single-shot unlockOlympiaTTS & resetOlympiaTtsSession resets all session state
  const spokenUnlock: Array<{ text: string; pitch: number; rate: number; lang: string }> = [];
  await withMockBrowserEnv({ spoken: spokenUnlock }, async () => {
    resetOlympiaTtsSession();
    unlockOlympiaTTS();
    unlockOlympiaTTS();
    unlockOlympiaTTS();
    assert.equal(spokenUnlock.length, 1, "Repeated unlock clicks must only speak one silent utterance per session");

    // Simulate dirty session state
    pauseOlympiaTTS();
    assert.equal(isOlympiaTtsPaused(), true);
    handleBuzzerInterrupt("Thí sinh An", { readingHost: "khanh_vy" });
    cancelBuzzerInterrupt();
    assert.equal(getLastBuzzedContestant(), "An");

    resetOlympiaTtsSession();
    assert.equal(isOlympiaTtsPaused(), false);
    assert.equal(getTtsEngineMode(), "server");
    assert.equal(getTtsEngineStatus().serverCooldownUntil, 0);
    assert.equal(getLastBuzzedContestant(), null);

    // After session reset, unlock works once more for the new run
    (globalThis as any).window.speechSynthesis.speaking = false;
    unlockOlympiaTTS();
    assert.equal(spokenUnlock.length, 2, "New run after resetOlympiaTtsSession can unlock once cleanly");
  });

  // 4. Web Speech resumes accidentally paused speechSynthesis (when !isOlympiaTtsPaused) & watchdog settles stuck utterance
  const spokenWatchdog: Array<{ text: string; pitch: number; rate: number; lang: string }> = [];
  await withMockBrowserEnv({ spoken: spokenWatchdog, autoFireEnd: false }, async () => {
    resetOlympiaTtsSession();
    let resumeCalls = 0;
    (globalThis as any).window.speechSynthesis.paused = true;
    (globalThis as any).window.speechSynthesis.resume = () => {
      resumeCalls++;
      (globalThis as any).window.speechSynthesis.paused = false;
    };

    const p = speakOlympiaTTSAsync("Ngắn", { engine: "webspeech", role: "khanh_vy" });
    assert.equal(resumeCalls, 1, "Must resume paused speechSynthesis when host did not pause TTS");
    const result = await p;
    assert.equal(result, true, "Web Speech watchdog must settle stuck utterance when onend never fires");
  });
});

test("TTS R4.1–R4.3: getContestantSpokenName, normalizeVietnameseTTS, and false-English protection", () => {
  // R4.1: Protect standalone TS. and dotted initials while still stripping title prefix
  assert.equal(getContestantSpokenName("TS."), "TS.");
  assert.equal(getContestantSpokenName("TS"), "TS");
  assert.equal(getContestantSpokenName("TS.A"), "TS.A");
  assert.equal(getContestantSpokenName("T.S.A"), "T.S.A");
  assert.equal(getContestantSpokenName("TS1"), "TS1");
  assert.equal(getContestantSpokenName("TS. Phạm Quốc"), "Phạm Quốc");
  assert.equal(getContestantSpokenName("Ghế 1: Trần Văn Nam"), "Trần Văn Nam");

  // R4.2: Vietnamese TTS pronunciation for dotted initials & abbreviations
  assert.equal(normalizeVietnameseTTS("N.V.A"), "En-nờ Vê A");
  assert.equal(normalizeVietnameseTTS("H.A"), "Hát A");
  assert.equal(normalizeVietnameseTTS("T.S"), "Tê Ét");
  assert.equal(normalizeVietnameseTTS("Đ.T.M"), "Đê Tê Em-mờ");
  assert.equal(normalizeVietnameseTTS("L.H.P"), "E-lờ Hát Pê");
  assert.equal(normalizeVietnameseTTS("T.S.A"), "Tê Ét A");
  assert.equal(normalizeVietnameseTTS("TS.A"), "Tê Ét A");
  assert.equal(normalizeVietnameseTTS("bạn TS."), "bạn Tê Ét");
  assert.equal(normalizeVietnameseTTS("TS. Ngô Bảo Châu"), "Tiến sĩ Ngô Bảo Châu");
  assert.equal(normalizeVietnameseTTS("ĐTV"), "Đê Tê Vê");
  assert.equal(normalizeVietnameseTTS("NBTV"), "En-nờ Bê Tê Vê");
  assert.equal(normalizeVietnameseTTS("QRT"), "Quy E-rờ Tê");
  assert.equal(normalizeVietnameseTTS("PTNK"), "Phổ thông Năng khiếu");
  assert.equal(normalizeVietnameseTTS("KHTN"), "Khoa học Tự nhiên");
  assert.equal(normalizeVietnameseTTS("XHNV"), "Xã hội Nhân văn");
  assert.equal(normalizeVietnameseTTS("BKHN"), "Bách khoa Hà Nội");
  assert.equal(normalizeVietnameseTTS("CNTT"), "Công nghệ thông tin");
  assert.equal(normalizeVietnameseTTS("TPHCM"), "Thành phố Hồ Chí Minh");
  assert.equal(normalizeVietnameseTTS("TP. HCM"), "Thành phố Hồ Chí Minh");
  assert.equal(normalizeVietnameseTTS("UBND"), "Ủy ban nhân dân");
  assert.equal(normalizeVietnameseTTS("ĐH"), "Đại học");
  assert.equal(normalizeVietnameseTTS("CĐ"), "Cao đẳng");
  assert.equal(normalizeVietnameseTTS("ĐHQG"), "Đại học Quốc gia");
  assert.equal(normalizeVietnameseTTS("THPT"), "Trung học phổ thông");

  // R4.3: Block false English voice classification in client & server detectors while keeping real English
  for (const viToken of [
    "N.V.A",
    "H.A",
    "Đ.T.M",
    "N.V.B.D",
    "TS.",
    "TS.A",
    "TS.A.",
    "TS.B.",
    "TS.B. TS.D.",
    "ĐTV",
    "NBTV",
    "QRT",
    "PTNK",
    "KHTN",
    "THPT",
    "ĐH",
    "TPHCM",
    "PTNK NBTV",
    "Bạn N.V.B đến từ PTNK",
  ]) {
    assert.equal(detectTextLanguage(viToken), "vi", `Client detectTextLanguage('${viToken}') must be 'vi'`);
    assert.equal(detectTtsLanguage(viToken), "vi", `Server detectTtsLanguage('${viToken}') must be 'vi'`);
    const segs = segmentMixedLanguageText(viToken);
    assert.ok(segs.every((s) => s.lang === "vi"), `segmentMixedLanguageText('${viToken}') must stay 'vi'`);
  }

  assert.equal(detectTextLanguage("WHAT IS THE CAPITAL?"), "en");
  assert.equal(detectTtsLanguage("WHAT IS THE CAPITAL?"), "en");
});

test("TTS R4.4: detectSpellingError exempts abbreviations, chemical formulas, doubled-consonant names & distinct Vietnamese answers", () => {
  // Valid abbreviations even when targetAnswer is regular Vietnamese
  for (const abbr of ["THPT", "TPHCM", "TP.HCM", "TP. HCM", "Tp.HCM", "Tp. HCM", "ĐTV", "KHTN", "PTNK", "QRT", "T.P.H.C.M"]) {
    assert.equal(
      detectSpellingError(abbr, "Trung học phổ thông").isError,
      false,
      `Abbreviation '${abbr}' must not be flagged as spelling error`
    );
  }
  assert.equal(detectSpellingError("Tp.HCM", "Thành phố Hồ Chí Minh").isError, false);
  assert.equal(detectSpellingError("Tp. HCM", "Thành phố Hồ Chí Minh").isError, false);
  assert.equal(detectSpellingError("UNESCO", "Tổ chức Giáo dục").isError, false);
  assert.equal(detectSpellingError("ASEAN", "Hiệp hội các quốc gia Đông Nam Á").isError, false);

  // Chemical formulas (including parenthesized, hydrated & sibling formula differences)
  for (const formula of ["Ca(OH)2", "Fe(OH)3", "Al2(SO4)3", "(NH4)2SO4", "MgCl2", "CaCO3", "CO2", "CuSO4.5H2O", "CuSO4·5H2O"]) {
    assert.equal(
      detectSpellingError(formula, "Canxi hiđroxit").isError,
      false,
      `Chemical formula '${formula}' must not be flagged`
    );
  }
  assert.equal(detectSpellingError("CuSO4.5H2O", "Đồng(II) sunfat ngậm nước").isError, false);
  assert.equal(detectSpellingError("Fe(OH)3", "Fe(OH)2").isError, false);

  // Known doubled-consonant proper names when targetAnswer is omitted
  for (const proper of ["Gauss", "Glenn", "Planck", "Higgs", "Mann", "Watt", "Bell", "Cross"]) {
    assert.equal(detectSpellingError(proper).isError, false, `'${proper}' must not be flagged`);
  }

  // Distinct valid Vietnamese answers must not be flagged by Levenshtein distance
  assert.equal(detectSpellingError("Hà Nam", "Hà Nội").isError, false);
  assert.equal(detectSpellingError("Quảng Nam", "Quảng Ngãi").isError, false);
  assert.equal(detectSpellingError("Sông Mã", "Sông Đà").isError, false);
  assert.equal(detectSpellingError("Nam Định", "Nam Đàn").isError, false);

  // Real typos & gibberish must still be caught
  assert.deepEqual(detectSpellingError("QUAN HO", "QUAN HỌ"), { isError: true, reason: "diacritic" });
  assert.deepEqual(detectSpellingError("PARISS", "PARIS"), { isError: true, reason: "distance" });
  assert.deepEqual(detectSpellingError("HUEE", "Huế"), { isError: true, reason: "distance" });
  assert.deepEqual(detectSpellingError("Hà Nộii", "Hà Nội"), { isError: true, reason: "distance" });
  assert.equal(detectSpellingError("Qu4ng", "Quang hợp").isError, true);
  assert.equal(detectSpellingError("sdkjfh", "Quang hợp").isError, true);
  assert.equal(detectSpellingError("SDKJFH", "Quang hợp").isError, true);
  assert.equal(detectSpellingError("QWRT", "Quang hợp").isError, true);
  assert.equal(detectSpellingError("QWRTY", "Quang hợp").isError, true);
  assert.equal(detectSpellingError("Ha.Noi", "Hà Nội").isError, true);
  assert.equal(detectSpellingError("KKK", "Quang hợp").isError, true);
  assert.equal(detectSpellingError("quann").isError, true);
});

test("TTS R2: speakRoundIntroTTS -> kd-seg-0 -> speakSmartQuestion Q1 strict FIFO chaining, microtask/pause gaps & Q2 cancel", async () => {
  const spoken: Array<{ text: string; pitch: number; rate: number; lang: string }> = [];
  await withMockBrowserEnv({ spoken, autoFireEnd: false }, async (controls) => {
    setTtsEnabled(true);
    let synthCancelCount = 0;
    const synth = (globalThis as any).window.speechSynthesis;
    const origCancel = synth.cancel;
    synth.cancel = () => {
      synthCancelCount++;
      return origCancel();
    };

    // 1. Start round_intro + queue kd-seg-0 + call speakSmartQuestion Q1 while round_intro is still active
    const pIntro = speakRoundIntroTTS("khoiDong", { engine: "webspeech" });
    assert.equal(hasPendingIntroOrBridgeSpeech(), true);
    const kd0 = buildKhoiDongTurnBridgeSegment({
      segKind: "solo",
      segIdx: 0,
      seatId: 0,
      name: "Minh Quân",
    });
    const pKd0 = speakDualMcScriptAsync([kd0], {
      engine: "webspeech",
      queueAfterActive: true,
    });
    assert.equal(hasPendingIntroOrBridgeSpeech(), true);

    speakSmartQuestion("Câu hỏi 1: Thủ đô của Việt Nam là gì?", {
      engine: "webspeech",
      round: "khoiDong",
      seatId: 0,
      segIdx: 0,
    });

    // Q1 must NOT cancel round_intro or kd-seg-0
    assert.equal(spoken.length, 1);
    assert.equal(synthCancelCount, 1);

    // Finish round_intro -> check microtask handoff where activePlaybackSegment is transiently null
    controls.lastUtterance().onend();
    assert.equal(getActivePlaybackSegment(), null);
    assert.equal(hasPendingIntroOrBridgeSpeech(), true, "Microtask handoff between round_intro and kd-seg-0 must keep pendingIntroBridge true");
    assert.equal(await pIntro, true);

    await new Promise((r) => setTimeout(r, 10));
    assert.equal(spoken.length, 2);
    assert.ok(spoken[1].text.includes("Minh Quân"));

    // Finish kd-seg-0 -> Q1 speaks
    controls.lastUtterance().onend();
    assert.equal(await pKd0, true);
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(spoken.length, 3);
    assert.ok(spoken[2].text.includes("Thủ đô của Việt Nam"));
    assert.equal(hasPendingIntroOrBridgeSpeech(), false, "Once Q1 is speaking and intro/bridge finished, pendingIntroBridge is false");

    // 2. Q2 must immediately cancel Q1 (no intro/bridge pending)
    speakSmartQuestion("Câu hỏi 2: Sông nào dài nhất Việt Nam?", {
      engine: "webspeech",
      round: "khoiDong",
      seatId: 0,
      segIdx: 0,
    });
    assert.equal(synthCancelCount, 2, "Q2 must cancel Q1 immediately");
    assert.equal(spoken.length, 4);
    assert.ok(spoken[3].text.includes("Sông nào dài nhất"));
    controls.lastUtterance().onend();
    await new Promise((r) => setTimeout(r, 5));

    // 3. pauseAfterMs gap between two intro/bridge segments preserves hasPendingIntroOrBridgeSpeech()
    const twoSegBridge = [
      { role: "khanh_vy" as const, kind: "greeting" as const, text: "Chào mừng", pauseAfterMs: 120 },
      { role: "ngoc_huy" as const, kind: "round_transition" as const, text: "Bước vào Khởi Động", pauseAfterMs: 0 },
    ];
    const pBridge = speakDualMcScriptAsync(twoSegBridge, { engine: "webspeech" });
    controls.lastUtterance().onend();
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(getActivePlaybackSegment(), null);
    assert.equal(hasPendingIntroOrBridgeSpeech(), true, "pauseAfterMs gap must keep pendingIntroBridge true");
    speakSmartQuestion("Câu hỏi mở trong lúc nghỉ nhịp", {
      engine: "webspeech",
      round: "khoiDong",
    });
    assert.equal(spoken.filter((s) => s.text.includes("Câu hỏi mở trong lúc nghỉ nhịp")).length, 0);
    await new Promise((r) => setTimeout(r, 130));
    assert.equal(spoken.filter((s) => s.text.includes("Bước vào Khởi Động")).length, 1);
    controls.lastUtterance().onend();
    assert.equal(await pBridge, true);
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(spoken.filter((s) => s.text.includes("Câu hỏi mở trong lúc nghỉ nhịp")).length, 1);
    controls.lastUtterance().onend();

    // 4. skipOlympiaTTS() / cancelTTS() clears full chained queue & hasPendingIntroOrBridgeSpeech()
    const pAbortIntro = speakRoundIntroTTS("khoiDong", { engine: "webspeech" });
    const pAbortKd0 = speakDualMcScriptAsync([kd0], { engine: "webspeech", queueAfterActive: true });
    skipOlympiaTTS();
    assert.equal(hasPendingIntroOrBridgeSpeech(), false);
    assert.equal(await pAbortIntro, false);
    assert.equal(await pAbortKd0, false);
  });
});

test("TTS R2: smoothStopOlympiaTTS followed immediately by speakDualMcScriptAsync is not killed by stale boundaryCleanupTimer", async () => {
  const spoken: Array<{ text: string; pitch: number; rate: number; lang: string }> = [];
  await withMockBrowserEnv({ spoken, autoFireEnd: false }, async (controls) => {
    setTtsEnabled(true);
    const pOld = speakOlympiaTTSAsync("Câu hỏi cũ đang đọc dở rất dài...", {
      engine: "webspeech",
      segment: "question",
    });
    assert.equal(spoken.length, 1);

    // Trigger smoothStopOlympiaTTS (arms 30ms boundaryCleanupTimer) and immediately start new segment
    smoothStopOlympiaTTS(30, 80);
    const kd1 = buildKhoiDongTurnBridgeSegment({
      segKind: "solo",
      segIdx: 1,
      seatId: 1,
      name: "Lan Anh",
    });
    const pNew = speakDualMcScriptAsync([kd1], {
      engine: "webspeech",
      queueAfterActive: true,
    });

    assert.equal(spoken.length, 2);
    assert.ok(spoken[1].text.includes("Lan Anh"));

    // Wait past 30-80ms smoothStop window: old boundaryCleanupTimer must NOT cancel pNew
    await new Promise((r) => setTimeout(r, 100));
    assert.equal((globalThis as any).window.speechSynthesis.speaking, true, "New speech must remain active past old smoothStop delay");

    controls.lastUtterance().onend();
    assert.equal(await pOld, false);
    assert.equal(await pNew, true);
  });
});

test("TTS R2: NotAllowedError + suspended AudioContext does not trigger 15s serverCooldownUntil and clears cleanly on unlockOlympiaTTS", async () => {
  const spoken: Array<{ text: string; pitch: number; rate: number; lang: string }> = [];
  await withMockBrowserEnv(
    {
      spoken,
      withAudioContext: true,
      withHtmlAudio: true,
      origin: "http://localhost:3000",
    },
    async () => {
      resetOlympiaTtsSession();
      (globalThis as any).window.AudioContext = class SuspendedAudioContext {
        state = "suspended";
        async resume() {}
        async decodeAudioData() {
          throw new Error("should not decode suspended context");
        }
      };
      const OrigAudio = (globalThis as any).window.Audio;
      (globalThis as any).window.Audio = class BlockedHtmlAudio extends OrigAudio {
        play() {
          return Promise.reject(Object.assign(new Error("play() failed because the user didn't interact"), { name: "NotAllowedError" }));
        }
      };
      (globalThis as any).Audio = (globalThis as any).window.Audio;

      // Simulate browser blocking speechSynthesis pre-unlock with not-allowed onerror
      const synth = (globalThis as any).window.speechSynthesis;
      synth.speak = (u: any) => {
        queueMicrotask(() => u.onerror?.({ error: "not-allowed" }));
      };

      configureTtsTransport({
        fetchImpl: (async () =>
          ({
            ok: true,
            status: 200,
            arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
          }) as unknown as Response) as unknown as typeof fetch,
      });

      const ok = await speakRoundIntroTTS("khoiDong");
      assert.equal(ok, false);
      assert.equal(getTtsEngineStatus().serverCooldownUntil, 0, "Autoplay NotAllowedError must NOT set 15s serverCooldownUntil");
      assert.equal(getTtsEngineMode(), "server", "Engine mode must remain 'server' after autoplay block");

      unlockOlympiaTTS();
      assert.equal(getTtsEngineStatus().lastFallbackReason, null, "unlockOlympiaTTS clears autoplay fallback reason");
      assert.equal(getTtsEngineStatus().serverCooldownUntil, 0);
    }
  );
});
