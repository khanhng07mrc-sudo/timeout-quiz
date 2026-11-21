import assert from "node:assert/strict";
import test from "node:test";
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
  ROUND_INTRO_LINES,
  resolveTurnHosts,
  pickRandomMCRole,
  getContestantSpokenName,
  generateBuzzerCallout,
  resetBuzzerTurnState,
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
  speakDualMcScriptAsync,
  smoothStopOlympiaTTS,
  cancelTTS,
  cancelBuzzerInterrupt,
  handleBuzzerInterrupt,
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
  buildContestantIntroStepSegment,
  buildContestantIntroContinuousScript,
  buildPostIntroBreatherScript,
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

  const spoken = setup.spoken ?? [];
  const speakerEvents = setup.speakerEvents ?? [];
  const gainRamps: Array<{ value: number; time: number }> = [];
  let sourceStops = 0;
  let cancelCalls = 0;
  let latestUtterance: any = null;

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
  if (setup.withHtmlAudio) {
    (globalThis as any).Audio = MockHtmlAudio;
    (globalThis as any).URL = {
      createObjectURL: () => "blob:mock-audio",
      revokeObjectURL: () => {},
    };
  }

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
    assert.equal(spoken[0].text, "Chính xác!");
    assert.equal(spoken[0].pitch, 0.88);
    assert.equal(spoken[1].text, "Đáp án chính xác là: Hà Nội");
    assert.equal(spoken[1].pitch, 0.88);
    assert.equal(spoken[2].text, "Chính xác!");
    assert.equal(spoken[2].pitch, 1.12);
    assert.equal(spoken[3].text, "Đáp án chính xác là: Sài Gòn");
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
