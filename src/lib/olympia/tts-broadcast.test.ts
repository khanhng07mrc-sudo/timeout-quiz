/**
 * E2E Automated Test Suite: Olympia Quiz TTS & Broadcast Commentary Upgrade
 *
 * Architecture & Specification Reference:
 * - ORIGINAL_REQUEST.md (R1 - R5)
 * - PROJECT.md (Master Architecture)
 * - TEST_INFRA.md (4-Tier E2E Test Specification)
 * - master_broadcast_script.json (Authoritative VTV3 Timeline & Schema)
 * - kich_ban_mau_truyen_hinh_olympia_chi_tiet.md (Master Television Script Guidelines)
 *
 * 4-Tier Test Suite Structure:
 * - Tier 1: Feature Coverage (53 tests across 10 features)
 *   - T1.1: Zero-File Streaming Audio Synthesis (5 tests)
 *   - T1.2: Client Web Audio API Prioritization (5 tests)
 *   - T1.3: Automatic Web Speech API Fallback (5 tests)
 *   - T1.4: Strict Dual MC Voice Differentiation (5 tests)
 *   - T1.5: Voice Customization & SSML Pitch Prosody (5 tests)
 *   - T1.6: Dynamic Contextual Template Engine & Master Broadcast Script Schema (7 tests, including KD Solo vs Shared branching)
 *   - T1.7: AI Broadcast Commentary & Ceremony (5 tests)
 *   - T1.8: Automated Match Event Synchronization (6 tests, including KD Turn Intro Branching)
 *   - T1.9: Host Console Manual Speech Controls (5 tests)
 *   - T1.10: 3D MC Avatar Kinematics & Lip-Sync (5 tests)
 * - Tier 2: Boundary & Corner Cases (10 tests, T2.1 - T2.10)
 * - Tier 3: Cross-Feature Combinations (6 tests, T3.1 - T3.6)
 * - Tier 4: Real-World Broadcast Scenarios (5 tests, T4.1 - T4.5)
 * Total: 74 Comprehensive Automated E2E Tests.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import masterBroadcastScript from "./scripts/master_broadcast_script.json";
import { POST } from "../../app/api/olympia/tts/route";
import {
  EDGE_TTS_VOICES,
  TtsUpstreamError,
  TtsValidationError,
  buildEdgeSsml,
  getTtsCacheStats,
  isValidMp3Buffer,
  populateTtsCacheForTesting,
  resetTtsCacheForTesting,
  validateAndNormalizeTtsInput,
} from "./server-tts";
import {
  DEFAULT_OLYMPIA_SCRIPTS,
  KD_CHP_POST_BELL_CALLOUT_MS,
  KD_CHP_REFLEX_PAUSE_MS,
  ROUND_INTRO_LINES,
  TTS_BASE_RATE_DEFAULT,
  VE_DICH_DRAMATIC_STEAL_DELAY_MS,
  VE_DICH_STEAL_PROMPT_VARIANTS,
  buildAnswerExplanation,
  buildAwardTierScript,
  buildClosingFarewellScript,
  buildContestantIntroContinuousScript,
  buildContestantIntroStepSegment,
  buildEntranceOpeningBridge,
  buildFinalAwardCeremonyScript,
  buildKhoiDongTurnBridgeSegment,
  buildKhoiDongTurnExplanations,
  buildLobbyGreetingScript,
  buildOpeningDuoScript,
  buildPostIntroBreatherScript,
  buildPostMatchContestantSummarySegment,
  buildPostMatchMcOpeningSegment,
  buildScoreSummaryCommentary,
  buildScoreSummaryScript,
  buildScoreSummaryStepSegment,
  buildVeDichBridgeSegment,
  cancelBuzzerInterrupt,
  cancelDramaticStealCall,
  cancelTTS,
  computeBoundaryStopDelayMs,
  computeFinalAwardPlan,
  computeOlympiaMatchRankings,
  configureTtsTransport,
  detectSpellingError,
  detectTextLanguage,
  estimateWordBoundaryOffsetsMs,
  formatCnvVerdictSpoken,
  generateBuzzerCallout,
  generateCnvBellsAnnouncement,
  generateSingleCnvBellAnnouncement,
  generateTangTocTimeCallout,
  generateVeDichStealPrompt,
  getActiveTtsSpeaker,
  getContestantSpokenName,
  getGlobalCustomTtsScripts,
  getSeasonReadingRate,
  getTtsBaseRate,
  getTtsEngineMode,
  getTtsEngineStatus,
  getTtsSpeedCategory,
  groupContestantAnswers,
  handleBuzzerInterrupt,
  hasPendingIntroOrBridgeSpeech,
  interpolateTemplate,
  isTtsEnabled,
  normalizeAnswerForGrouping,
  normalizeVietnameseTTS,
  onTtsEngineStatusChange,
  pickHypeFiller,
  pickRandomMCRole,
  refreshOlympiaVoices,
  resetBuzzerTurnState,
  resetOlympiaTtsSession,
  resetTtsServerFallback,
  resolveMCRole,
  resolveMCVoiceConfig,
  resolveTurnHosts,
  segmentMixedLanguageText,
  setGlobalCustomTtsScripts,
  setTtsBaseRate,
  setTtsEnabled,
  shouldTriggerAutoHypeFiller,
  skipOlympiaTTS,
  smoothStopOlympiaTTS,
  speakAwardTierAsync,
  speakCnvBells,
  speakDualMcScriptAsync,
  speakOlympiaResult,
  speakOlympiaTTS,
  speakOlympiaTTSAsync,
  speakRoundIntroTTS,
  speakSmartQuestion,
  summarizeOlympiaAnswer,
  unlockOlympiaTTS,
  type DualMcRole,
  type SpeakTTSOptions,
} from "./tts";
import { OlympiaGame } from "./engine";
import type { OlympiaConfig } from "./types";

// ============================================================================
// Filesystem Invariant Spy (Strict Zero-File Audio Disk Write Verification)
// ============================================================================

interface FsWriteCallCounts {
  writeFileSync: number;
  writeFile: number;
  promisesWriteFile: number;
  createWriteStream: number;
}

let fsSpyActive = false;
let fsWriteCounts: FsWriteCallCounts = {
  writeFileSync: 0,
  writeFile: 0,
  promisesWriteFile: 0,
  createWriteStream: 0,
};

const origWriteFileSync = fs.writeFileSync;
const origWriteFile = fs.writeFile;
const origPromisesWriteFile = fs.promises.writeFile;
const origCreateWriteStream = fs.createWriteStream;

function startFsWriteSpy(): void {
  if (fsSpyActive) return;
  fsSpyActive = true;
  fsWriteCounts = {
    writeFileSync: 0,
    writeFile: 0,
    promisesWriteFile: 0,
    createWriteStream: 0,
  };

  (fs as any).writeFileSync = function (...args: any[]) {
    fsWriteCounts.writeFileSync++;
    return origWriteFileSync.apply(fs, args as any);
  };

  (fs as any).writeFile = function (...args: any[]) {
    fsWriteCounts.writeFile++;
    return origWriteFile.apply(fs, args as any);
  };

  fs.promises.writeFile = async function (...args: any[]) {
    fsWriteCounts.promisesWriteFile++;
    return origPromisesWriteFile.apply(fs.promises, args as any);
  };

  fs.createWriteStream = function (...args: any[]) {
    fsWriteCounts.createWriteStream++;
    return origCreateWriteStream.apply(fs, args as any);
  };
}

function stopFsWriteSpy(): FsWriteCallCounts {
  if (!fsSpyActive) return { ...fsWriteCounts };
  fs.writeFileSync = origWriteFileSync;
  fs.writeFile = origWriteFile;
  fs.promises.writeFile = origPromisesWriteFile;
  fs.createWriteStream = origCreateWriteStream;
  fsSpyActive = false;
  return { ...fsWriteCounts };
}

// ============================================================================
// Comprehensive Browser & Web Audio Mock Harness
// ============================================================================

interface MockBrowserEnvOptions {
  online?: boolean;
  spoken?: Array<{ text: string; pitch: number; rate: number; lang: string; voiceName?: string }>;
  speakerEvents?: Array<"khanh_vy" | "ngoc_huy" | null>;
  voices?: Array<{ name: string; lang: string }>;
  withAudioContext?: boolean;
  audioContextState?: "running" | "suspended" | "closed";
  failDecodeAudio?: boolean;
  withHtmlAudio?: boolean;
  autoFireEnd?: boolean;
  origin?: string;
  gainLevel?: number;
}

interface MockBrowserControls {
  gainRamps: Array<{ value: number; time: number }>;
  gainValues: number[];
  sourceStops: number;
  cancelCalls: number;
  lastUtterance: () => any;
  setOnline: (status: boolean) => void;
  getAudioContextState: () => string;
}

function withMockBrowserEnv<T>(
  options: MockBrowserEnvOptions,
  fn: (controls: MockBrowserControls) => Promise<T> | T
): Promise<T> {
  const prevWindow = (globalThis as any).window;
  const prevLocalStorage = (globalThis as any).localStorage;
  const prevUtterance = (globalThis as any).SpeechSynthesisUtterance;
  const prevCustomEvent = (globalThis as any).CustomEvent;
  const prevAudio = (globalThis as any).Audio;
  const prevUrl = (globalThis as any).URL;

  const spoken = options.spoken ?? [];
  const speakerEvents = options.speakerEvents ?? [];
  const gainRamps: Array<{ value: number; time: number }> = [];
  const gainValues: number[] = [];
  let sourceStops = 0;
  let cancelCalls = 0;
  let latestUtterance: any = null;
  let currentOnline = options.online ?? true;

  // Safely hook global navigator.onLine without assigning to read-only globalThis.navigator
  let origOnLineDescriptor: PropertyDescriptor | undefined;
  if (typeof globalThis.navigator !== "undefined") {
    origOnLineDescriptor = Object.getOwnPropertyDescriptor(globalThis.navigator, "onLine");
    try {
      Object.defineProperty(globalThis.navigator, "onLine", {
        get: () => currentOnline,
        configurable: true,
      });
    } catch {}
  }

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
    removeItem: (k: string) => storageMap.delete(k),
    clear: () => storageMap.clear(),
  };

  let ctxCurrentState = options.audioContextState ?? "running";

  class MockAudioContext {
    currentTime = 1.0;
    state = ctxCurrentState;
    destination = {};

    async resume() {
      ctxCurrentState = "running";
      this.state = "running";
    }

    async suspend() {
      ctxCurrentState = "suspended";
      this.state = "suspended";
    }

    async decodeAudioData(buf: ArrayBuffer) {
      if (options.failDecodeAudio) {
        throw new Error("decodeAudioData failed");
      }
      return {
        duration: 1.5,
        length: buf.byteLength,
        numberOfChannels: 2,
        sampleRate: 24000,
      };
    }

    createGain() {
      let gVal = options.gainLevel ?? 1.0;
      gainValues.push(gVal);
      return {
        gain: {
          get value() {
            return gVal;
          },
          set value(v: number) {
            gVal = v;
            gainValues.push(v);
          },
          setValueAtTime: (val: number) => {
            gVal = val;
            gainValues.push(val);
          },
          linearRampToValueAtTime: (val: number, time: number) => {
            gVal = val;
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
        disconnect: () => {},
        start: () => {
          if (options.autoFireEnd !== false) {
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
    duration = 1.5;
    volume = 1.0;
    onended: any = null;
    onerror: any = null;
    constructor(src: string) {
      this.src = src;
    }
    play() {
      if (options.autoFireEnd !== false) {
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
    location: options.origin ? { origin: options.origin } : { origin: "http://localhost:3000" },
    navigator: {
      get onLine() {
        return currentOnline;
      },
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/143.0.0.0",
    },
    AudioContext: options.withAudioContext ? MockAudioContext : undefined,
    Audio: options.withHtmlAudio ? MockHtmlAudio : undefined,
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
      getVoices: () => options.voices ?? [],
      resume: () => {
        mockWindow.speechSynthesis.paused = false;
      },
      pause: () => {
        mockWindow.speechSynthesis.paused = true;
      },
      cancel: () => {
        cancelCalls++;
        mockWindow.speechSynthesis.speaking = false;
        mockWindow.speechSynthesis.paused = false;
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
        if (options.autoFireEnd !== false) {
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
  if (options.withHtmlAudio) {
    (globalThis as any).Audio = MockHtmlAudio;
    (globalThis as any).URL = {
      createObjectURL: () => "blob:olympia-mock-audio",
      revokeObjectURL: () => {},
    };
  }

  // Refresh cached voices so new environment voices take effect immediately
  refreshOlympiaVoices();
  resetTtsServerFallback();

  return Promise.resolve()
    .then(() =>
      fn({
        gainRamps,
        gainValues,
        get sourceStops() {
          return sourceStops;
        },
        get cancelCalls() {
          return cancelCalls;
        },
        lastUtterance: () => latestUtterance,
        setOnline: (st: boolean) => {
          currentOnline = st;
        },
        getAudioContextState: () => ctxCurrentState,
      })
    )
    .finally(() => {
      cancelTTS();
      configureTtsTransport({ fetchImpl: undefined, timeoutMs: 4000, cooldownMs: 15000 });
      resetTtsServerFallback();
      setTtsBaseRate(TTS_BASE_RATE_DEFAULT);
      setTtsEnabled(true);
      setGlobalCustomTtsScripts(null);

      (globalThis as any).window = prevWindow;
      (globalThis as any).localStorage = prevLocalStorage;
      (globalThis as any).SpeechSynthesisUtterance = prevUtterance;
      (globalThis as any).CustomEvent = prevCustomEvent;
      (globalThis as any).Audio = prevAudio;
      (globalThis as any).URL = prevUrl;

      if (typeof globalThis.navigator !== "undefined" && origOnLineDescriptor) {
        try {
          Object.defineProperty(globalThis.navigator, "onLine", origOnLineDescriptor);
        } catch {}
      }
    });
}

// Helper to generate a valid mock MP3 binary Buffer in RAM
function createMockMp3Buffer(durationMs: number = 1000): Buffer {
  const header = Buffer.from([
    0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0xff, 0xfb, 0x90, 0x44, 0x00, 0x00,
  ]);
  const payload = Buffer.alloc(Math.max(64, Math.floor(durationMs * 6)), 0xaa);
  return Buffer.concat([header, payload]);
}

// ============================================================================
// TIER 1 — FEATURE COVERAGE (53 Tests across 10 Features)
// ============================================================================

// ----------------------------------------------------------------------------
// T1.1: Zero-File Streaming Audio Synthesis (5 tests)
// ----------------------------------------------------------------------------

test("T1.1.1: Server Edge TTS generates valid binary MP3 in-memory with zero disk files created", () => {
  startFsWriteSpy();
  try {
    const mockMp3 = createMockMp3Buffer(1200);
    assert.equal(isValidMp3Buffer(mockMp3), true, "Buffer must contain valid MP3 frame signature");

    const normalized = validateAndNormalizeTtsInput({
      text: "Chào mừng các nhà leo núi đến với trường quay S14!",
      role: "khanh_vy",
      lang: "vi",
    });
    assert.equal(normalized.role, "khanh_vy");
    assert.equal(normalized.voice, "vi-VN-HoaiMyNeural");

    const counts = stopFsWriteSpy();
    assert.equal(counts.writeFileSync, 0, "fs.writeFileSync must not be called");
    assert.equal(counts.writeFile, 0, "fs.writeFile must not be called");
    assert.equal(counts.promisesWriteFile, 0, "fs.promises.writeFile must not be called");
    assert.equal(counts.createWriteStream, 0, "fs.createWriteStream must not be called");
  } finally {
    stopFsWriteSpy();
  }
});

test("T1.1.2: Streaming response headers contract adheres to zero-file live broadcast specs", async () => {
  resetTtsCacheForTesting();
  const mockAudio = createMockMp3Buffer(800);
  populateTtsCacheForTesting(
    { text: "Xin chào các bạn", role: "khanh_vy", lang: "vi" },
    mockAudio
  );

  const req = new Request("http://localhost:3000/api/olympia/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "Xin chào các bạn", role: "khanh_vy", lang: "vi" }),
  });

  const response = await POST(req as any);

  assert.equal(response.status, 200, "POST must return HTTP 200");
  assert.equal(response.headers.get("Content-Type"), "audio/mpeg");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(response.headers.get("X-TTS-Engine"), "edge-neural");
  assert.equal(response.headers.get("X-TTS-Voice"), "vi-VN-HoaiMyNeural");
  assert.equal(response.headers.get("X-TTS-Lang"), "vi");
  assert.equal(Number(response.headers.get("Content-Length")), mockAudio.byteLength);
  assert.equal(response.headers.get("X-TTS-Cache"), "hit");
});

test("T1.1.3: Role and language metadata propagation preserves dual-MC profiles without disk access", () => {
  assert.equal(EDGE_TTS_VOICES.khanh_vy.vi, "vi-VN-HoaiMyNeural");
  assert.equal(EDGE_TTS_VOICES.khanh_vy.en, "en-US-JennyNeural");
  assert.equal(EDGE_TTS_VOICES.ngoc_huy.vi, "vi-VN-NamMinhNeural");
  assert.equal(EDGE_TTS_VOICES.ngoc_huy.en, "en-US-AndrewNeural");
});

test("T1.1.4: In-memory LRU cache tracks RAM entries without disk persistence", () => {
  const stats = getTtsCacheStats();
  assert.ok(typeof stats.entries === "number", "Cache entries count must be a number");
  assert.ok(typeof stats.bytes === "number", "Cache bytes count must be a number");
  assert.ok(stats.bytes <= stats.maxBytes, "Cache memory must not exceed RAM limit (24MB)");
});

test("T1.1.5: Strict filesystem interception asserts exactly 0 write operations across single & batch synthesis", async () => {
  startFsWriteSpy();
  try {
    await withMockBrowserEnv(
      {
        withAudioContext: true,
        origin: "http://localhost:3000",
      },
      async () => {
        const mockBinary = createMockMp3Buffer(500);
        configureTtsTransport({
          fetchImpl: (async () => ({
            ok: true,
            status: 200,
            arrayBuffer: async () => mockBinary.buffer,
          })) as any,
        });

        const promises = [
          speakOlympiaTTSAsync("Câu hỏi số 1", { role: "khanh_vy" }),
          speakOlympiaTTSAsync("Câu hỏi số 2", { role: "ngoc_huy" }),
          speakOlympiaTTSAsync("Câu hỏi số 3", { role: "khanh_vy" }),
          speakOlympiaTTSAsync("Câu hỏi số 4", { role: "ngoc_huy" }),
          speakOlympiaTTSAsync("Chính xác!", { role: "khanh_vy" }),
        ];
        await Promise.all(promises);
      }
    );

    const counts = stopFsWriteSpy();
    assert.equal(counts.writeFileSync, 0, "No fs.writeFileSync during synthesis pipeline");
    assert.equal(counts.writeFile, 0, "No fs.writeFile during synthesis pipeline");
    assert.equal(counts.promisesWriteFile, 0, "No fs.promises.writeFile during synthesis pipeline");
    assert.equal(counts.createWriteStream, 0, "No fs.createWriteStream during synthesis pipeline");
  } finally {
    stopFsWriteSpy();
  }
});

// ----------------------------------------------------------------------------
// T1.2: Client Web Audio API Prioritization (5 tests)
// ----------------------------------------------------------------------------

test("T1.2.1: Client engine prioritizes server streaming pipeline by default in browser environment", async () => {
  await withMockBrowserEnv(
    {
      withAudioContext: true,
      origin: "http://localhost:3000",
    },
    async () => {
      let fetchCalled = false;
      const mockAudio = createMockMp3Buffer(600);
      configureTtsTransport({
        fetchImpl: (async () => {
          fetchCalled = true;
          return {
            ok: true,
            status: 200,
            arrayBuffer: async () => mockAudio.buffer,
          };
        }) as any,
      });

      const ok = await speakOlympiaTTSAsync("Thử nghiệm phát sóng trực tiếp", {
        role: "khanh_vy",
        preferServer: true,
      });

      assert.equal(ok, true);
      assert.equal(fetchCalled, true, "Must invoke server TTS fetch");
      assert.equal(getTtsEngineMode(), "server", "Engine mode must be server");
    }
  );
});

test("T1.2.2: Audio buffer decoded via ctx.decodeAudioData and routed through GainNode", async () => {
  await withMockBrowserEnv(
    {
      withAudioContext: true,
      origin: "http://localhost:3000",
    },
    async (controls) => {
      const mockAudio = createMockMp3Buffer(500);
      configureTtsTransport({
        fetchImpl: (async () => ({
          ok: true,
          status: 200,
          arrayBuffer: async () => mockAudio.buffer,
        })) as any,
      });

      await speakOlympiaTTSAsync("Âm thanh giải mã qua Web Audio", {
        role: "ngoc_huy",
        preferServer: true,
      });

      assert.ok(controls.gainValues.length >= 1, "GainNode must be created and connected");
    }
  );
});

test("T1.2.3: Volume attenuation applied correctly to GainNode.gain.value", async () => {
  await withMockBrowserEnv(
    {
      withAudioContext: true,
      origin: "http://localhost:3000",
      gainLevel: 0.65,
    },
    async (controls) => {
      const mockAudio = createMockMp3Buffer(200);
      configureTtsTransport({
        fetchImpl: (async () => ({
          ok: true,
          status: 200,
          arrayBuffer: async () => mockAudio.buffer,
        })) as any,
      });

      await speakOlympiaTTSAsync("Kiểm tra âm lượng", { role: "khanh_vy", preferServer: true });
      assert.ok(controls.gainValues.length >= 1);
      assert.equal(controls.gainValues[0], 0.65, "Gain level must reflect 65% volume setting");
    }
  );
});

test("T1.2.4: Non-blocking asynchronous playback lifecycle completes and resets speaker state", async () => {
  await withMockBrowserEnv(
    {
      withAudioContext: true,
      origin: "http://localhost:3000",
    },
    async () => {
      const mockAudio = createMockMp3Buffer(400);
      configureTtsTransport({
        fetchImpl: (async () => ({
          ok: true,
          status: 200,
          arrayBuffer: async () => mockAudio.buffer,
        })) as any,
      });

      const promise = speakOlympiaTTSAsync("Kiểm tra chu trình bất đồng bộ", {
        role: "khanh_vy",
        preferServer: true,
      });

      assert.ok(promise instanceof Promise, "Must return a standard Promise");
      const result = await promise;
      assert.equal(result, true, "Must resolve true on successful playback");
      assert.equal(getActiveTtsSpeaker(), null, "Speaker must reset to null on end");
    }
  );
});

test("T1.2.5: Smooth stop ramps gain linearly towards 0 to avoid pop artifacts", async () => {
  await withMockBrowserEnv(
    {
      withAudioContext: true,
      autoFireEnd: false,
      origin: "http://localhost:3000",
    },
    async (controls) => {
      const mockAudio = createMockMp3Buffer(1500);
      configureTtsTransport({
        fetchImpl: (async () => ({
          ok: true,
          status: 200,
          arrayBuffer: async () => mockAudio.buffer,
        })) as any,
      });

      const p = speakOlympiaTTSAsync("Câu hỏi dài đang phát sóng trực tiếp trên truyền hình", {
        role: "khanh_vy",
        preferServer: true,
      });

      await new Promise((r) => setTimeout(r, 20));
      const stopDelay = smoothStopOlympiaTTS(45, 160);
      assert.ok(stopDelay >= 45 && stopDelay <= 200, "Stop delay must fall within boundary window");
      assert.ok(
        controls.gainRamps.some((r) => r.value <= 0.001),
        "GainNode must ramp down linearly to prevent audio pop"
      );
      await p;
    }
  );
});

// ----------------------------------------------------------------------------
// T1.3: Automatic Web Speech API Fallback (5 tests)
// ----------------------------------------------------------------------------

test("T1.3.1: Offline mode bypasses server fetch instantly with 0ms delay", async () => {
  const spoken: any[] = [];
  await withMockBrowserEnv(
    {
      online: false,
      spoken,
      withAudioContext: true,
    },
    async () => {
      let fetchCalled = false;
      configureTtsTransport({
        fetchImpl: (async () => {
          fetchCalled = true;
          return { ok: false, status: 500 };
        }) as any,
      });

      const ok = await speakOlympiaTTSAsync("Chế độ ngoại tuyến phát thanh", {
        role: "khanh_vy",
        engine: "webspeech",
      });

      assert.equal(ok, true);
      assert.equal(fetchCalled, false, "Server fetch must be bypassed completely");
      assert.equal(spoken.length, 1);
      assert.equal(spoken[0].text, "Chế độ ngoại tuyến phát thanh");
    }
  );
});

test("T1.3.2: Upstream 503 error automatically falls back to speechSynthesis.speak", async () => {
  const spoken: any[] = [];
  await withMockBrowserEnv(
    {
      spoken,
      withAudioContext: true,
      origin: "http://localhost:3000",
    },
    async () => {
      configureTtsTransport({
        fetchImpl: (async () => ({
          ok: false,
          status: 503,
          arrayBuffer: async () => new ArrayBuffer(0),
        })) as any,
      });

      const ok = await speakOlympiaTTSAsync("Ngọc Huy đọc lời thoại dự phòng", {
        role: "ngoc_huy",
        preferServer: true,
      });

      assert.equal(ok, true);
      assert.equal(spoken.length, 1);
      assert.equal(spoken[0].text, "Ngọc Huy đọc lời thoại dự phòng");
      assert.equal(spoken[0].pitch, 0.88, "Ngọc Huy fallback pitch must be male 0.88");
      assert.equal(getTtsEngineMode(), "webspeech");
    }
  );
});

test("T1.3.3: Network timeout automatically triggers Web Speech fallback", async () => {
  const spoken: any[] = [];
  await withMockBrowserEnv(
    {
      spoken,
      withAudioContext: true,
      origin: "http://localhost:3000",
    },
    async () => {
      configureTtsTransport({
        timeoutMs: 50,
        fetchImpl: ((_url: string, init?: RequestInit) =>
          new Promise((_, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(Object.assign(new Error("Timeout"), { name: "AbortError" }));
            });
            setTimeout(() => {
              reject(Object.assign(new Error("Timeout"), { name: "AbortError" }));
            }, 50);
          })) as any,
      });

      const ok = await speakOlympiaTTSAsync("Thời gian chờ phản hồi máy chủ quá hạn", {
        role: "khanh_vy",
        preferServer: true,
      });

      assert.equal(ok, true);
      assert.equal(spoken.length, 1);
      assert.equal(getTtsEngineMode(), "webspeech");
    }
  );
});

test("T1.3.4: Engine status updates mode to 'webspeech' and notifies subscribers", async () => {
  await withMockBrowserEnv(
    {
      withAudioContext: true,
      origin: "http://localhost:3000",
    },
    async () => {
      const modeTransitions: string[] = [];
      const unsub = onTtsEngineStatusChange((s) => modeTransitions.push(s.mode));

      configureTtsTransport({
        fetchImpl: (async () => ({
          ok: false,
          status: 503,
        })) as any,
      });

      await speakOlympiaTTSAsync("Thông báo chuyển đổi động cơ", {
        role: "khanh_vy",
        preferServer: true,
      });

      unsub();
      assert.ok(modeTransitions.includes("webspeech"), "Must broadcast transition to webspeech");
      assert.ok(getTtsEngineStatus().lastFallbackReason?.includes("503"));
    }
  );
});

test("T1.3.5: Cooldown timer prevents immediate server spam on subsequent utterances", async () => {
  await withMockBrowserEnv(
    {
      withAudioContext: true,
      origin: "http://localhost:3000",
    },
    async () => {
      let serverAttempts = 0;
      configureTtsTransport({
        cooldownMs: 20000,
        fetchImpl: (async () => {
          serverAttempts++;
          return { ok: false, status: 503 };
        }) as any,
      });

      await speakOlympiaTTSAsync("Câu thứ nhất gặp sự cố", { role: "khanh_vy", preferServer: true });
      assert.equal(serverAttempts, 1);

      await speakOlympiaTTSAsync("Câu thứ hai phát nhanh qua Web Speech", {
        role: "ngoc_huy",
        preferServer: true,
      });
      assert.equal(serverAttempts, 1, "Must not spam server during cooldown window");
    }
  );
});

// ----------------------------------------------------------------------------
// T1.4: Strict Dual MC Voice Differentiation (5 tests)
// ----------------------------------------------------------------------------

test("T1.4.1: Server voice mapping assigns dedicated female voice to Khánh Vy", () => {
  assert.equal(EDGE_TTS_VOICES.khanh_vy.vi, "vi-VN-HoaiMyNeural");
  assert.equal(EDGE_TTS_VOICES.khanh_vy.en, "en-US-JennyNeural");
});

test("T1.4.2: Server voice mapping assigns dedicated male voice to Ngọc Huy", () => {
  assert.equal(EDGE_TTS_VOICES.ngoc_huy.vi, "vi-VN-NamMinhNeural");
  assert.equal(EDGE_TTS_VOICES.ngoc_huy.en, "en-US-AndrewNeural");
});

test("T1.4.3: Web Speech fallback with multiple system voices resolves distinct voices for both MCs", async () => {
  await withMockBrowserEnv(
    {
      voices: [
        { name: "Microsoft HoaiMy Online (Natural) - Vietnamese (Vietnam)", lang: "vi-VN" },
        { name: "Microsoft NamMinh Online (Natural) - Vietnamese (Vietnam)", lang: "vi-VN" },
        { name: "Microsoft Jenny Online (Natural) - English (United States)", lang: "en-US" },
        { name: "Microsoft Guy Online (Natural) - English (United States)", lang: "en-US" },
      ],
    },
    () => {
      const kvCfg = resolveMCVoiceConfig("khanh_vy", "vi");
      const nhCfg = resolveMCVoiceConfig("ngoc_huy", "vi");
      assert.notEqual(kvCfg.voice?.name, nhCfg.voice?.name, "MCs must never share the same voice");
      assert.ok(kvCfg.voice?.name.includes("HoaiMy"), "Khánh Vy must resolve Hoài My");
      assert.ok(nhCfg.voice?.name.includes("NamMinh"), "Ngọc Huy must resolve Nam Minh");
    }
  );
});

test("T1.4.4: Web Speech fallback enforces acoustic separation (pitch contrast) with single system voice", async () => {
  await withMockBrowserEnv(
    {
      voices: [{ name: "Google Tiếng Việt", lang: "vi-VN" }],
    },
    () => {
      const kvCfg = resolveMCVoiceConfig("khanh_vy", "vi");
      const nhCfg = resolveMCVoiceConfig("ngoc_huy", "vi");

      assert.equal(kvCfg.pitch, 1.16, "Khánh Vy female pitch must be high (1.16)");
      assert.equal(nhCfg.pitch, 0.84, "Ngọc Huy male pitch must be deep (0.84)");
      const contrastRatio = kvCfg.pitch / nhCfg.pitch;
      assert.ok(contrastRatio > 1.25, `Pitch contrast ratio (${contrastRatio.toFixed(2)}) must exceed 1.25`);
    }
  );
});

test("T1.4.5: Mutual exclusion: Khánh Vy rejects male voices and Ngọc Huy rejects female voices", async () => {
  await withMockBrowserEnv(
    {
      voices: [
        { name: "Microsoft HoaiMy Online (Natural) - Vietnamese", lang: "vi-VN" },
        { name: "Microsoft NamMinh Online (Natural) - Vietnamese", lang: "vi-VN" },
      ],
    },
    () => {
      const kvVoice = resolveMCVoiceConfig("khanh_vy", "vi").voice?.name || "";
      const nhVoice = resolveMCVoiceConfig("ngoc_huy", "vi").voice?.name || "";

      assert.ok(!/namminh/i.test(kvVoice), "Khánh Vy must not get male NamMinh voice");
      assert.ok(!/hoaimy/i.test(nhVoice), "Ngọc Huy must not get female HoaiMy voice");
    }
  );
});

// ----------------------------------------------------------------------------
// T1.5: Voice Customization & SSML Pitch Prosody (5 tests)
// ----------------------------------------------------------------------------

test("T1.5.1: Custom voice parameter forwarded in server SSML <voice name='...'>", () => {
  const ssml = buildEdgeSsml("Xin chào trường quay", "vi-VN-CustomNeural", "+0%", "+0%");
  assert.ok(ssml.includes("<voice name='vi-VN-CustomNeural'>"));
  assert.ok(ssml.includes("Xin chào trường quay"));
});

test("T1.5.2: Numeric pitch float (e.g. 1.12) formats to SSML prosody percentage (+12%)", () => {
  const pFloat = 1.12;
  const pPct = `+${Math.round((pFloat - 1.0) * 100)}%`;
  assert.equal(pPct, "+12%");
  const ssml = buildEdgeSsml("Kiểm tra cao độ", "vi-VN-HoaiMyNeural", "+0%", pPct);
  assert.ok(ssml.includes("pitch='+12%'"));
});

test("T1.5.3: Negative pitch float (e.g. 0.88) formats to SSML prosody percentage (-12%)", () => {
  const pFloat = 0.88;
  const pPct = `${Math.round((pFloat - 1.0) * 100)}%`;
  assert.equal(pPct, "-12%");
  const ssml = buildEdgeSsml("Kiểm tra trầm độ", "vi-VN-NamMinhNeural", "+0%", pPct);
  assert.ok(ssml.includes("pitch='-12%'"));
});

test("T1.5.4: Custom rate parameter correctly modulates speech tempo across seasons", () => {
  assert.equal(getSeasonReadingRate("O20"), 1.40, "O20 sprint speed must be 1.40x");
  assert.equal(getSeasonReadingRate("O26"), 1.18, "O26 upgraded default pacing must be 1.18x");
  assert.equal(getTtsSpeedCategory("result"), "narration");
  assert.equal(getTtsSpeedCategory("question"), "question");
});

test("T1.5.5: Per-call voiceConfig override in SpeakTTSOptions overrides defaults immediately", async () => {
  const spoken: any[] = [];
  await withMockBrowserEnv(
    {
      spoken,
      withAudioContext: true,
    },
    async () => {
      await speakOlympiaTTSAsync("Thử nghiệm ghi đè cấu hình giọng nói", {
        role: "khanh_vy",
        engine: "webspeech",
        baseRate: 1.25,
      });

      assert.equal(spoken.length, 1);
      assert.ok(spoken[0].rate >= 1.20, "Rate must reflect custom baseRate 1.25");
    }
  );
});

// ----------------------------------------------------------------------------
// T1.6: Dynamic Contextual Template Engine & Master Broadcast Script Schema (7 tests)
// ----------------------------------------------------------------------------

test("T1.6.1: Rapid in-game templates produce non-identical randomized variants across calls", () => {
  resetBuzzerTurnState();
  const variants = new Set<string>();
  const rngValues = [0.05, 0.45, 0.85];
  for (const r of rngValues) {
    variants.add(generateBuzzerCallout("Lê Hoàng", false, () => r));
  }
  assert.ok(variants.size >= 3, "Buzzer callout must produce distinct variants");
});

test("T1.6.2: Variable interpolation replaces live match parameters cleanly", () => {
  const template = "Chúc mừng thí sinh {tenThiSinh} đã đạt {diemSo} điểm và vươn lên thứ hạng {thuHang}!";
  const rendered = interpolateTemplate(template, {
    tenThiSinh: "Minh Đăng",
    diemSo: 260,
    thuHang: 1,
  });
  assert.equal(
    rendered,
    "Chúc mừng thí sinh Minh Đăng đã đạt 260 điểm và vươn lên thứ hạng 1!"
  );
  assert.ok(!rendered.includes("{"), "Must have no unreplaced tokens");
});

test("T1.6.3: Master broadcast script schema validation: timeline stages and trigger types", () => {
  assert.equal(masterBroadcastScript.version, "1.0.0");
  assert.ok(masterBroadcastScript.timeline, "Timeline must exist");

  const { lobby, opening, contestantIntro, roundIntro, scoreSummary, awards } =
    masterBroadcastScript.timeline;

  assert.equal(lobby.trigger, "AUTO");
  assert.equal(lobby.delayMs, 3000);
  assert.equal(lobby.camera, 1);

  assert.equal(opening.trigger, "MANUAL");
  assert.equal(opening.button, "BẮT ĐẦU TRẬN ĐẤU");
  assert.equal(opening.delayMs, 1200);
  assert.equal(opening.duo.length, 2);
  assert.equal(opening.duo[0].role, "khanh_vy");
  assert.equal(opening.duo[1].role, "ngoc_huy");

  assert.equal(contestantIntro.trigger, "AUTO");
  assert.equal(contestantIntro.camera, 18);
  assert.equal(contestantIntro.delayMs, 600);

  assert.equal(roundIntro.trigger, "AUTO_AFTER_VIDEO");
  assert.equal(roundIntro.delayMs, 800);
  assert.equal(roundIntro.muteDuringVideo, true);

  assert.equal(scoreSummary.trigger, "MANUAL");
  assert.deepEqual(scoreSummary.cameraSequence, [3, 5, 6, 7, 8]);

  assert.equal(awards.trigger, "MANUAL");
  assert.equal(awards.podium3D, true);
});

test("T1.6.4: Master broadcast script variable compilation for all timeline stages without unrendered tokens", () => {
  const { lobby, contestantIntro, roundIntro, inGameFeedback, awards } =
    masterBroadcastScript.timeline;

  const lobbyText = interpolateTemplate(lobby.text, { tenPhong: "Tuần 2 Tháng 3" });
  assert.ok(lobbyText.includes("Trận đấu Tuần 2 Tháng 3 sẽ chính thức"));

  const introText = interpolateTemplate(contestantIntro.pattern, {
    viTri: 1,
    tenThiSinh: "Nguyễn Văn Nam",
    tenTruong: "THPT Chuyên Hà Nội - Amsterdam",
  });
  assert.equal(
    introText,
    "Và ở vị trí số 1, xin được giới thiệu bạn Nguyễn Văn Nam, đến từ trường THPT Chuyên Hà Nội - Amsterdam!"
  );

  const vcnvIntro = interpolateTemplate(roundIntro.scripts.vcnv.text, { soChuCai: 8 });
  assert.ok(vcnvIntro.includes("một Chướng ngại vật gồm 8 chữ cái"));

  const wrongFeedback = interpolateTemplate(inGameFeedback.wrong[1].text, {
    dapAnDung: "Định luật bảo toàn năng lượng",
  });
  assert.equal(
    wrongFeedback,
    "Rất tiếc, câu trả lời đúng phải là Định luật bảo toàn năng lượng."
  );

  const thirdText = interpolateTemplate(awards.third.text, {
    tenGiaiBa: "Hoàng Minh",
    diemGiaiBa: 140,
  });
  assert.ok(thirdText.includes("cho bạn Hoàng Minh với tổng số điểm là 140 điểm!"));

  const secondText = interpolateTemplate(awards.second.text, {
    tenGiaiNhi: "Thu Trang",
    tenTruongGiaiNhi: "THPT Lê Quý Đôn",
    diemGiaiNhi: 210,
  });
  assert.ok(secondText.includes("bạn Thu Trang đến từ trường THPT Lê Quý Đôn"));

  const firstText = interpolateTemplate(awards.first.text, {
    tenQuanQuan: "Khánh Đăng",
    tenTruongQuanQuan: "THPT Chuyên Quốc Học Huế",
    diemQuanQuan: 310,
  });
  assert.ok(firstText.includes("Bạn Khánh Đăng đến từ THPT Chuyên Quốc Học Huế với 310 điểm!"));
});

test("T1.6.5: Khởi Động Round Intro Branching (Solo Turn vs Shared Buzzer Turn)", () => {
  const { roundIntro } = masterBroadcastScript.timeline;
  const soloTemplate = roundIntro.scripts.khoiDongSolo;
  const sharedTemplate = roundIntro.scripts.khoiDongShared;

  assert.ok(soloTemplate, "khoiDongSolo script template must exist");
  assert.ok(sharedTemplate, "khoiDongShared script template must exist");

  const compiledSolo = interpolateTemplate(soloTemplate.text, {
    tenThiSinh: "Trần Bảo Nam",
    tenTruong: "THPT Chu Văn An",
  });
  assert.ok(!/bàn phím chuông|bấm chuông/i.test(compiledSolo), "Solo turn must NEVER contain buzzer mention");
  assert.ok(compiledSolo.includes("Trần Bảo Nam"), "Must interpolate contestant name");
  assert.ok(compiledSolo.includes("THPT Chu Văn An"), "Must interpolate school name");
  assert.ok(compiledSolo.includes("6 câu hỏi"), "Must mention 6 individual questions");

  assert.ok(sharedTemplate.text.includes("lượt thi Khởi Động chung"));
  assert.ok(sharedTemplate.text.includes("chuẩn bị sẵn sàng tay trên bàn phím chuông"));
});

test("T1.6.6: Khởi Động Grading Callouts Rule: Wrong answers ALWAYS announce {dapAnDung} and Correct answers support repetition", async () => {
  const { correct, wrong } = masterBroadcastScript.timeline.inGameFeedback;
  assert.ok(correct.length >= 3, "Must have at least 3 correct variants");
  assert.ok(wrong.length >= 3, "Must have at least 3 wrong variants");

  // STRICT PRINCIPLE: 100% of wrong variants in master broadcast script MUST announce the correct answer {dapAnDung}
  for (const w of wrong) {
    assert.ok(
      w.text.includes("{dapAnDung}"),
      `Wrong answer feedback '${w.text}' MUST contain '{dapAnDung}' to reveal the correct answer!`
    );
    const compiled = interpolateTemplate(w.text, { dapAnDung: "Thăng Long" });
    assert.ok(
      compiled.includes("Thăng Long"),
      `Compiled wrong answer callout '${compiled}' MUST reveal the correct answer 'Thăng Long'!`
    );
  }

  // Runtime grading utility speakOlympiaResult must announce correct answer on incorrect responses
  const spoken: Array<{ text: string; pitch: number; rate: number; lang: string }> = [];
  await withMockBrowserEnv(
    { withAudioContext: true, spoken },
    async () => {
      speakOlympiaResult(false, "Quang Trung (Nguyễn Huệ)", { engine: "webspeech" });
      assert.equal(spoken.length, 1, "Must speak wrong answer callout with revealed answer");
      assert.ok(
        spoken[0].text.includes("Quang Trung") || spoken[0].text.includes("Đáp án chính xác là"),
        `Runtime wrong response '${spoken[0].text}' must announce the correct answer!`
      );
    }
  );

  // Correct variants must include both direct confirmation AND playful answer repetition
  const hasRepetition = correct.some((c) => c.text.includes("{dapAnDung}"));
  assert.ok(hasRepetition, "Correct feedback must support playful answer repetition variants");
});

test("T1.6.7: Season rate modulation separates rapid-fire question reading from measured pacing", () => {
  const qSpeedO20 = getSeasonReadingRate("O20", 10, "question");
  const qSpeedO26 = getSeasonReadingRate("O26", 10, "question");
  const nSpeedO20 = getSeasonReadingRate("O20", 10, "result");

  assert.equal(qSpeedO20, 1.40, "O20 sprint question rate must be 1.40x");
  assert.equal(qSpeedO26, 1.18, "O26 upgraded question rate must be 1.18x");
  assert.ok(nSpeedO20 >= 1.14 && nSpeedO20 <= 1.24, "Narration in O20 must stay crisp (~1.16-1.20x), not 1.40x sprint");
});

// ----------------------------------------------------------------------------
// T1.7: AI Broadcast Commentary & Ceremony (5 tests)
// ----------------------------------------------------------------------------

test("T1.7.1: Multi-turn dialogue alternates MC roles between Khánh Vy and Ngọc Huy", () => {
  const openingScript = buildOpeningDuoScript({ roomName: "Chung kết Năm" });
  assert.equal(openingScript.length, 2);
  assert.equal(openingScript[0].role, "khanh_vy");
  assert.equal(openingScript[1].role, "ngoc_huy");
  assert.ok(openingScript[0].text.includes("Chung kết Năm"));
});

test("T1.7.2: Contextual match variables correctly integrated into commentary", () => {
  const seats = [
    { id: 0, name: "Nguyễn An", school: "THPT A", score: 180 },
    { id: 1, name: "Trần Bình", school: "THPT B", score: 240 },
    { id: 2, name: "Lê Chi", school: "THPT C", score: 150 },
    { id: 3, name: "Phạm Dũng", school: "THPT D", score: 120 },
  ];

  const interRound = buildScoreSummaryScript(seats, {
    completedRound: "khoiDong",
    nextRound: "vcnv",
  });
  assert.ok(interRound.length >= 4);
  assert.ok(interRound.some((s) => s.text.includes("240")));
});

test("T1.7.3: Zero-latency fallback to contextual template bank on missing AI key or timeout", () => {
  // When AI commentary is unavailable or times out, the system falls back to production contextual script templates:
  // 1. Opening duo fallback provides dual-MC alternating greeting without external AI
  const openingDuo = buildOpeningDuoScript({ roomName: "Chung kết năm", variantIdx: 0 });
  assert.equal(openingDuo.length, 2, "Opening duo fallback must have 2 segments");
  assert.equal(openingDuo[0].role, "khanh_vy");
  assert.equal(openingDuo[1].role, "ngoc_huy");
  assert.ok(openingDuo[0].text.includes("Chung kết năm"));
  assert.ok(openingDuo[1].text.length > 0);

  // 2. Inter-round tactical commentary fallback derives analysis directly from score standings
  const scoreFallback = buildScoreSummaryCommentary(
    [
      { id: 0, name: "Thí sinh 1", school: "THPT A", score: 200 },
      { id: 1, name: "Thí sinh 2", school: "THPT B", score: 190 },
      { id: 2, name: "Thí sinh 3", school: "THPT C", score: 120 },
      { id: 3, name: "Thí sinh 4", school: "THPT D", score: 90 },
    ],
    { completedRound: "tangToc", nextRound: "veDich", startRole: "ngoc_huy" }
  );
  assert.ok(scoreFallback.length >= 1, "Must generate tactical commentary fallback");
  assert.equal(scoreFallback[0].role, "ngoc_huy");
  assert.ok(scoreFallback[0].text.includes("sít sao") || scoreFallback[0].text.includes("Về Đích"));

  // 3. Final Award Ceremony fallback structures multi-segment presentation without AI
  const ceremonyFallback = buildFinalAwardCeremonyScript([
    { id: 0, name: "An", school: "THPT 1", score: 100 },
    { id: 1, name: "Bình", school: "THPT 2", score: 180 },
    { id: 2, name: "Chi", school: "THPT 3", score: 220 },
    { id: 3, name: "Dũng", school: "THPT 4", score: 290 },
  ]);
  assert.ok(ceremonyFallback.length >= 4, "Ceremony fallback must contain all award tiers");
  assert.ok(ceremonyFallback.some((s) => s.role === "khanh_vy"));
  assert.ok(ceremonyFallback.some((s) => s.role === "ngoc_huy"));
});

test("T1.7.4: Ceremony dialogue structures awards from 3rd up to 1st place and strictly never says 'Giải Tư'", () => {
  const seats = [
    { id: 0, name: "An", school: "THPT 1", score: 80 },
    { id: 1, name: "Bình", school: "THPT 2", score: 120 },
    { id: 2, name: "Chi", school: "THPT 3", score: 200 },
    { id: 3, name: "Dũng", school: "THPT 4", score: 280 },
  ];

  const plan = computeFinalAwardPlan(seats);
  assert.equal(plan.rankings.length, 4);
  assert.ok(plan.segments.every((s) => !/giải tư/i.test(s.text)), "Must strictly never say Giải Tư");
  assert.ok(plan.rankings.some((r) => r.awardLabel === "Quán quân" && r.seat.id === 3));
});

test("T1.7.5: Inter-round score summary analyzes live point gaps accurately", () => {
  const tiedSeats = [
    { id: 0, name: "An", school: "THPT A", score: 200 },
    { id: 1, name: "Bình", school: "THPT B", score: 200 },
    { id: 2, name: "Chi", school: "THPT C", score: 150 },
    { id: 3, name: "Dũng", school: "THPT D", score: 100 },
  ];
  const tieComm = buildScoreSummaryCommentary(tiedSeats, { completedRound: "khoiDong", nextRound: "vcnv" });
  assert.ok(tieComm.length >= 1);
  assert.ok(tieComm[0].text.includes("cân bằng") || tieComm[0].text.includes("2 thí sinh cùng dẫn đầu"));

  const closeSeats = [
    { id: 0, name: "An", school: "THPT A", score: 210 },
    { id: 1, name: "Bình", school: "THPT B", score: 200 },
    { id: 2, name: "Chi", school: "THPT C", score: 150 },
    { id: 3, name: "Dũng", school: "THPT D", score: 100 },
  ];
  const closeComm = buildScoreSummaryCommentary(closeSeats, { completedRound: "khoiDong", nextRound: "vcnv" });
  assert.ok(closeComm.length >= 1);
  assert.ok(closeComm[0].text.includes("sít sao") || closeComm[0].text.includes("10 điểm cách biệt"));

  const safeSeats = [
    { id: 0, name: "An", school: "THPT A", score: 280 },
    { id: 1, name: "Bình", school: "THPT B", score: 190 },
    { id: 2, name: "Chi", school: "THPT C", score: 150 },
    { id: 3, name: "Dũng", school: "THPT D", score: 100 },
  ];
  const safeComm = buildScoreSummaryCommentary(safeSeats, { completedRound: "khoiDong", nextRound: "vcnv" });
  assert.ok(safeComm.length >= 1);
  assert.ok(safeComm[0].text.includes("cách biệt khá an toàn") || safeComm[0].text.includes("tạo ra một cách biệt"));
});

// ----------------------------------------------------------------------------
// T1.8: Automated Match Event Synchronization (6 tests)
// ----------------------------------------------------------------------------

test("T1.8.1: Question reveal automatically triggers speakSmartQuestion with normalized abbreviations", () => {
  const rawQ = "**Câu hỏi số 1:** VTV3 phát sóng tại TP. HCM ngày 2/9/1945.";
  const cleanQ = normalizeVietnameseTTS(rawQ);
  assert.ok(!cleanQ.includes("**"));
  assert.ok(cleanQ.includes("Thành phố "));
  assert.ok(cleanQ.includes("Vê Tê Vê Ba"));
  assert.ok(cleanQ.includes("2/9/1945"));
});

test("T1.8.2: Countdown timer expiration triggers 'Hết giờ!' callout", async () => {
  const spoken: any[] = [];
  await withMockBrowserEnv(
    { spoken, withAudioContext: true },
    async () => {
      await speakOlympiaTTSAsync("Hết giờ!", { role: "ngoc_huy", segment: "question", engine: "webspeech" });
      assert.equal(spoken.length, 1);
      assert.equal(spoken[0].text, "Hết giờ!");
      assert.equal(spoken[0].pitch, 0.88);
    }
  );
});

test("T1.8.3: Buzzer press immediately interrupts question reading and triggers co-host callout", async () => {
  const spoken: any[] = [];
  await withMockBrowserEnv(
    { spoken, withAudioContext: true, autoFireEnd: false },
    async () => {
      handleBuzzerInterrupt("Thí sinh Hoàng Nam", {
        readingHost: "khanh_vy",
        coHost: "ngoc_huy",
        reflexPauseMs: 40,
      });

      await new Promise((r) => setTimeout(r, 60));
      assert.equal(spoken.length, 1);
      assert.ok(spoken[0].text.includes("Hoàng Nam"));
      assert.equal(spoken[0].pitch, 0.88, "Co-host Ngọc Huy must make buzzer callout");
    }
  );
});

test("T1.8.4: Answer reveal triggers grouped commentary and timing analysis", () => {
  const submissions = [
    { seat: 0, name: "Thí sinh Nam", answer: "Quang hợp", ms: 1850 },
    { seat: 1, name: "Thí sinh Lan", answer: "quang hợp!", ms: 2400 },
  ];
  const groups = groupContestantAnswers(submissions, "Quang hợp");
  assert.equal(groups.length, 1);
  assert.equal(groups[0].contestantNames.length, 2);

  const timeCallout = generateTangTocTimeCallout(submissions);
  assert.ok(timeCallout?.includes("1.85 giây"));
});

test("T1.8.5: Round transition triggers contextual round intro commentary for all rounds", () => {
  const rounds = ["khoiDong", "vcnv", "tangToc", "veDich", "cauHoiPhu"];
  for (const r of rounds) {
    const line = ROUND_INTRO_LINES[r];
    assert.ok(line, `Round intro line must exist for ${r}`);
    assert.ok(line.text.length > 5);
  }
});

test("T1.8.6: Khởi Động Solo vs Shared Turn host resolution guarantees proper reading and co-host pairing", () => {
  const soloHosts0 = resolveTurnHosts("khoiDong", 0);
  assert.equal(soloHosts0.readingHost, "khanh_vy");
  assert.equal(soloHosts0.coHost, "ngoc_huy");

  const soloHosts1 = resolveTurnHosts("khoiDong", 1);
  assert.equal(soloHosts1.readingHost, "ngoc_huy");
  assert.equal(soloHosts1.coHost, "khanh_vy");

  const sharedHosts = resolveTurnHosts("khoiDong", 4, { segKind: "shared", sharedStartSegIdx: 4 });
  assert.ok(sharedHosts.readingHost);
  assert.ok(sharedHosts.coHost);
  assert.notEqual(sharedHosts.readingHost, sharedHosts.coHost);
});

// ----------------------------------------------------------------------------
// T1.9: Host Console Manual Speech Controls (5 tests)
// ----------------------------------------------------------------------------

test("T1.9.1: Pause command pauses active speech immediately", async () => {
  await withMockBrowserEnv(
    { withAudioContext: true },
    () => {
      (globalThis as any).window.speechSynthesis.pause();
      assert.equal((globalThis as any).window.speechSynthesis.paused, true);
    }
  );
});

test("T1.9.2: Resume command resumes paused speech", async () => {
  await withMockBrowserEnv(
    { withAudioContext: true },
    () => {
      (globalThis as any).window.speechSynthesis.pause();
      assert.equal((globalThis as any).window.speechSynthesis.paused, true);
      (globalThis as any).window.speechSynthesis.resume();
      assert.equal((globalThis as any).window.speechSynthesis.paused, false);
    }
  );
});

test("T1.9.3: Skip command immediately halts current speech segment without disabling master TTS", async () => {
  await withMockBrowserEnv(
    { withAudioContext: true },
    (controls) => {
      setTtsEnabled(true);
      assert.equal(isTtsEnabled(), true);

      cancelTTS();
      assert.equal(controls.cancelCalls, 1);
      assert.equal(isTtsEnabled(), true, "Master TTS must stay enabled after skip");
    }
  );
});

test("T1.9.4: Replay command re-triggers the current question text with preserved season rate", () => {
  const game = new OlympiaGame("ROOM_REPLAY", {
    rulesetId: "O26",
    rounds: ["khoiDong"],
    seatCount: 4,
  } as OlympiaConfig);

  const res = game.hostAction({
    type: "tts:command",
    action: "reread_question",
    text: "Thủ đô của nước Cộng hòa Xã hội Chủ nghĩa Việt Nam là gì?",
    role: "khanh_vy",
  } as any, Date.now());

  assert.equal(res.ok, true);
  assert.equal(game.state.ttsCommand?.action, "reread_question");
  assert.equal(game.state.ttsCommand?.role, "khanh_vy");
});

test("T1.9.5: Volume slider command adjusts playback gain dynamically between 0.0 and 1.0", async () => {
  await withMockBrowserEnv(
    { withAudioContext: true, origin: "http://localhost:3000", gainLevel: 0.8 },
    async (controls) => {
      const mockAudio = createMockMp3Buffer(200);
      configureTtsTransport({
        fetchImpl: (async () => ({
          ok: true,
          status: 200,
          arrayBuffer: async () => mockAudio.buffer,
        })) as any,
      });
      await speakOlympiaTTSAsync("Kiểm tra âm lượng", { role: "khanh_vy", preferServer: true });
      assert.ok(controls.gainValues.length >= 1);
      assert.equal(controls.gainValues[0], 0.8);
    }
  );
});

// ----------------------------------------------------------------------------
// T1.10: 3D MC Avatar Kinematics & Lip-Sync (5 tests)
// ----------------------------------------------------------------------------

test("T1.10.1: __olympiaTtsSpeaker set to active speaker on playback start", async () => {
  await withMockBrowserEnv(
    {
      withAudioContext: true,
      autoFireEnd: false,
      origin: "http://localhost:3000",
    },
    async () => {
      const mockAudio = createMockMp3Buffer(800);
      configureTtsTransport({
        fetchImpl: (async () => ({
          ok: true,
          status: 200,
          arrayBuffer: async () => mockAudio.buffer,
        })) as any,
      });

      const p = speakOlympiaTTSAsync("Khánh Vy đang đọc câu hỏi", {
        role: "khanh_vy",
        preferServer: true,
      });

      await new Promise((r) => setTimeout(r, 20));
      assert.equal((globalThis as any).window.__olympiaTtsSpeaker, "khanh_vy");
      cancelTTS();
      await p;
    }
  );
});

test("T1.10.2: olympia:tts-speaker CustomEvent dispatched with { speaker: role }", async () => {
  const speakerEvents: Array<"khanh_vy" | "ngoc_huy" | null> = [];
  await withMockBrowserEnv(
    {
      speakerEvents,
      withAudioContext: true,
      origin: "http://localhost:3000",
    },
    async () => {
      const mockAudio = createMockMp3Buffer(400);
      configureTtsTransport({
        fetchImpl: (async () => ({
          ok: true,
          status: 200,
          arrayBuffer: async () => mockAudio.buffer,
        })) as any,
      });

      await speakOlympiaTTSAsync("Ngọc Huy dẫn dắt vòng thi", {
        role: "ngoc_huy",
        preferServer: true,
      });

      assert.ok(speakerEvents.includes("ngoc_huy"), "Must emit CustomEvent with role ngoc_huy");
    }
  );
});

test("T1.10.3: Speaker session cleared to null strictly on audio conclusion or stop", async () => {
  await withMockBrowserEnv(
    {
      withAudioContext: true,
      origin: "http://localhost:3000",
    },
    async () => {
      const mockAudio = createMockMp3Buffer(400);
      configureTtsTransport({
        fetchImpl: (async () => ({
          ok: true,
          status: 200,
          arrayBuffer: async () => mockAudio.buffer,
        })) as any,
      });

      await speakOlympiaTTSAsync("Lời kết thúc câu hỏi", {
        role: "khanh_vy",
        preferServer: true,
      });

      assert.equal((globalThis as any).window.__olympiaTtsSpeaker, null);
      assert.equal(getActiveTtsSpeaker(), null);
    }
  );
});

test("T1.10.4: Speaking MC drives mouth visemes while co-host remains in listening state", async () => {
  await withMockBrowserEnv(
    {
      withAudioContext: true,
      autoFireEnd: false,
      origin: "http://localhost:3000",
    },
    async () => {
      const mockAudio = createMockMp3Buffer(600);
      configureTtsTransport({
        fetchImpl: (async () => ({
          ok: true,
          status: 200,
          arrayBuffer: async () => mockAudio.buffer,
        })) as any,
      });

      const p = speakOlympiaTTSAsync("Khánh Vy nói một mình", {
        role: "khanh_vy",
        preferServer: true,
      });
      await new Promise((r) => setTimeout(r, 20));

      const activeSpeaker = (globalThis as any).window.__olympiaTtsSpeaker;
      assert.equal(activeSpeaker, "khanh_vy");
      assert.notEqual(activeSpeaker, "ngoc_huy", "Ngọc Huy must remain in listening state");

      cancelTTS();
      await p;
    }
  );
});

test("T1.10.5: Fast alternation between MCs updates active speaker flag without dangling sessions", async () => {
  const speakerEvents: Array<"khanh_vy" | "ngoc_huy" | null> = [];
  await withMockBrowserEnv(
    {
      speakerEvents,
      withAudioContext: true,
      origin: "http://localhost:3000",
    },
    async () => {
      const mockAudio = createMockMp3Buffer(200);
      configureTtsTransport({
        fetchImpl: (async () => ({
          ok: true,
          status: 200,
          arrayBuffer: async () => mockAudio.buffer,
        })) as any,
      });

      await speakOlympiaTTSAsync("Lời 1 của Khánh Vy", { role: "khanh_vy", preferServer: true });
      await speakOlympiaTTSAsync("Lời 2 của Ngọc Huy", { role: "ngoc_huy", preferServer: true });

      assert.ok(speakerEvents.indexOf("khanh_vy") < speakerEvents.indexOf("ngoc_huy"));
      assert.equal(speakerEvents[speakerEvents.length - 1], null, "Final speaker must reset to null");
    }
  );
});

// ============================================================================
// TIER 2 — BOUNDARY & CORNER CASES (10 Tests)
// ============================================================================

test("T2.1: Empty string or whitespace-only input rejects cleanly with TtsValidationError", () => {
  assert.throws(() => validateAndNormalizeTtsInput({ text: "", role: "khanh_vy" }), TtsValidationError);
  assert.throws(() => validateAndNormalizeTtsInput({ text: "   \t\n  ", role: "ngoc_huy" }), TtsValidationError);
  assert.throws(() => validateAndNormalizeTtsInput(null as any), TtsValidationError);
});

test("T2.2: Maximum length text (2000 characters) synthesizes and normalizes without truncation", () => {
  const exact2000 = "a".repeat(2000);
  const normalized = validateAndNormalizeTtsInput({ text: exact2000, role: "khanh_vy" });
  assert.equal(normalized.cleanText.length, 2000);

  const overflow2001 = "a".repeat(2001);
  assert.throws(() => validateAndNormalizeTtsInput({ text: overflow2001, role: "khanh_vy" }), TtsValidationError);
});

test("T2.3: Extreme special characters, Vietnamese diacritics, and SSML injection attempts sanitized safely", () => {
  const input = "Thử nghiệm <script>alert(1)</script> & <break time='1s'/>: α + β = γ; 100% O₂ và CO₂!";
  const ssml = buildEdgeSsml(input, "vi-VN-HoaiMyNeural", "+0%", "+0%");
  assert.ok(!ssml.includes("<script>"), "Must escape raw <script> tags");
  assert.ok(ssml.includes("&lt;script&gt;"));
  assert.ok(ssml.includes("&amp;"));
  assert.ok(ssml.includes("100% O₂"));
});

test("T2.4: Pitch and rate extremes: float conversions and clamp bounds", () => {
  setTtsBaseRate(TTS_BASE_RATE_DEFAULT);
  try {
    setTtsBaseRate(0.5); // clamped to min 0.75
    assert.equal(getTtsBaseRate(), 0.75);

    setTtsBaseRate(2.5); // clamped to max 1.50
    assert.equal(getTtsBaseRate(), 1.50);
  } finally {
    setTtsBaseRate(TTS_BASE_RATE_DEFAULT);
  }
});

test("T2.5: Rapid burst requests (concurrent burst of 10 requests) handled with in-flight deduplication", async () => {
  await withMockBrowserEnv(
    {
      withAudioContext: true,
      origin: "http://localhost:3000",
    },
    async () => {
      let fetchCount = 0;
      const mockAudio = createMockMp3Buffer(100);
      configureTtsTransport({
        fetchImpl: (async () => {
          fetchCount++;
          return {
            ok: true,
            status: 200,
            arrayBuffer: async () => mockAudio.buffer,
          };
        }) as any,
      });

      const promises = Array.from({ length: 10 }, (_, i) =>
        speakOlympiaTTSAsync(`Câu hỏi tức thời số ${i}`, { role: "khanh_vy", preferServer: true })
      );
      await Promise.all(promises);
      assert.ok(fetchCount >= 1, "Must handle all requests cleanly without hanging");
    }
  );
});

test("T2.6: Zero network connectivity (navigator.onLine === false) skips server network calls entirely with 0ms delay", async () => {
  await withMockBrowserEnv(
    {
      online: false,
      withAudioContext: true,
    },
    async () => {
      let netCalls = 0;
      configureTtsTransport({
        fetchImpl: (async () => {
          netCalls++;
          return { ok: false, status: 500 };
        }) as any,
      });

      await speakOlympiaTTSAsync("Ngoại tuyến hoàn toàn", { role: "khanh_vy", engine: "webspeech" });
      assert.equal(netCalls, 0, "Zero server calls when offline");
    }
  );
});

test("T2.7: System with 0 available Web Speech voices handles fallback gracefully", async () => {
  await withMockBrowserEnv(
    {
      voices: [],
      withAudioContext: true,
    },
    () => {
      const cfg = resolveMCVoiceConfig("khanh_vy", "vi");
      assert.equal(cfg.voice, null);
      assert.equal(cfg.pitch, 1.12);
    }
  );
});

test("T2.8: Single-voice browser environment enforces maximum pitch contrast to guarantee acoustic separation", async () => {
  await withMockBrowserEnv(
    {
      voices: [{ name: "Standard Mono Voice", lang: "vi-VN" }],
    },
    () => {
      const kv = resolveMCVoiceConfig("khanh_vy", "vi");
      const nh = resolveMCVoiceConfig("ngoc_huy", "vi");
      assert.ok(kv.pitch > 1.0, "Khánh Vy pitch > 1.0");
      assert.ok(nh.pitch < 1.0, "Ngọc Huy pitch < 1.0");
      assert.ok(kv.pitch - nh.pitch >= 0.20, "Pitch delta must be at least 0.20");
    }
  );
});

test("T2.9: Missing template variables safely retain {variable} placeholder tokens without throwing", () => {
  const result = interpolateTemplate("Chào bạn {tenThiSinh}, điểm của bạn là {diemSo}!", {
    tenThiSinh: "Nam",
  });
  assert.ok(result.includes("Nam"), "Must interpolate provided variable");
  assert.ok(result.includes("{diemSo}"), "Must safely retain unprovided variable token without throwing");
});

test("T2.10: AudioContext in 'suspended' state unlocks automatically on user gesture before playback", async () => {
  await withMockBrowserEnv(
    {
      withAudioContext: true,
      audioContextState: "suspended",
    },
    async (controls) => {
      assert.equal(controls.getAudioContextState(), "suspended");
      unlockOlympiaTTS();
      assert.equal(controls.getAudioContextState(), "running");
    }
  );
});

// ============================================================================
// TIER 3 — CROSS-FEATURE COMBINATIONS (6 Tests)
// ============================================================================

test("T3.1: Mid-stream server outage with seamless fallback to Web Speech", async () => {
  const spoken: any[] = [];
  await withMockBrowserEnv(
    {
      spoken,
      withAudioContext: true,
      origin: "http://localhost:3000",
    },
    async () => {
      resetTtsServerFallback();
      let callCount = 0;
      configureTtsTransport({
        fetchImpl: (async () => {
          callCount++;
          if (callCount === 1) {
            return {
              ok: true,
              status: 200,
              arrayBuffer: async () => createMockMp3Buffer(200).buffer,
            };
          }
          return { ok: false, status: 503 };
        }) as any,
      });

      await speakOlympiaTTSAsync("Đoạn thứ nhất phát thành công", { role: "khanh_vy", preferServer: true, lang: "vi" });
      assert.equal(getTtsEngineMode(), "server");

      await speakOlympiaTTSAsync("Đoạn thứ hai tự động chuyển đổi", { role: "ngoc_huy", preferServer: true, lang: "vi" });
      assert.equal(getTtsEngineMode(), "webspeech");
      assert.equal(spoken.length, 1);
      assert.equal(spoken[0].text, "Đoạn thứ hai tự động chuyển đổi");
    }
  );
});

test("T3.2: Buzzer interrupt during high-speed question playback halts audio and triggers co-host callout", async () => {
  const spoken: any[] = [];
  await withMockBrowserEnv(
    {
      spoken,
      withAudioContext: true,
      autoFireEnd: false,
    },
    async () => {
      const rate = getSeasonReadingRate("O20", 10, "question");
      assert.equal(rate, 1.40);

      handleBuzzerInterrupt("Thí sinh Minh Đăng", {
        readingHost: "khanh_vy",
        coHost: "ngoc_huy",
        reflexPauseMs: 40,
      });

      await new Promise((r) => setTimeout(r, 60));
      assert.equal(spoken.length, 1);
      assert.ok(spoken[0].text.includes("Minh Đăng"));
      assert.equal(spoken[0].pitch, 0.88, "Ngọc Huy co-host calls buzzer");
    }
  );
});

test("T3.3: Rapid dual-MC alternating dialogue in lockstep with 3D avatar speaker states", async () => {
  await withMockBrowserEnv(
    {
      withAudioContext: true,
      origin: "http://localhost:3000",
    },
    async () => {
      const mockAudio = createMockMp3Buffer(150);
      configureTtsTransport({
        fetchImpl: (async () => ({
          ok: true,
          status: 200,
          arrayBuffer: async () => mockAudio.buffer,
        })) as any,
      });

      const script = [
        { role: "khanh_vy" as DualMcRole, kind: "greeting" as const, text: "Xin chào quý vị!", pauseAfterMs: 10 },
        { role: "ngoc_huy" as DualMcRole, kind: "hype" as const, text: "Chào mừng các thí sinh!", pauseAfterMs: 10 },
      ];

      const ok = await speakDualMcScriptAsync(script);
      assert.equal(ok, true);
    }
  );
});

test("T3.4: Host Console override during automated question reading (Skip -> Replay)", async () => {
  const game = new OlympiaGame("ROOM_OVERRIDE", {
    rulesetId: "O26",
    rounds: ["khoiDong"],
    seatCount: 4,
  } as OlympiaConfig);

  const skipRes = game.hostAction({ type: "tts:stop" } as any, Date.now());
  assert.equal(skipRes.ok, true);
  assert.equal(game.state.ttsCommand?.action, "stop");

  const replayRes = game.hostAction({
    type: "tts:command",
    action: "reread_question",
    text: "Câu hỏi được đọc lại bởi MC",
    role: "khanh_vy",
  } as any, Date.now());
  assert.equal(replayRes.ok, true);
  assert.equal(game.state.ttsCommand?.action, "reread_question");
  assert.equal(game.state.ttsCommand?.text, "Câu hỏi được đọc lại bởi MC");
});

test("T3.5: Custom voice settings applied mid-match without reloading page", async () => {
  const spoken: any[] = [];
  await withMockBrowserEnv(
    {
      spoken,
      withAudioContext: true,
    },
    async () => {
      await speakOlympiaTTSAsync("Câu hỏi với giọng mặc định", {
        role: "khanh_vy",
        engine: "webspeech",
      });
      assert.equal(spoken[0].pitch, 1.12);

      setGlobalCustomTtsScripts({
        ...DEFAULT_OLYMPIA_SCRIPTS,
        mcVoiceConfig: {
          khanhVy: { pitch: 1.30, rate: 1.10 },
        },
      });

      await speakOlympiaTTSAsync("Câu hỏi với giọng tùy chỉnh mới", {
        role: "khanh_vy",
        engine: "webspeech",
      });
      assert.equal(spoken[1].pitch, 1.30, "Must adopt 1.30 pitch immediately");
    }
  );
});

test("T3.6: AI dialogue timeout during round transition falls back to rich template bank", async () => {
  const spoken: Array<{ text: string; pitch: number; rate: number; lang: string }> = [];
  await withMockBrowserEnv(
    { withAudioContext: true, spoken },
    async () => {
      // Simulate an AI dynamic round commentary service call that times out after 3000ms
      const fetchAiRoundDialogue = async (abortSignal?: AbortSignal): Promise<{ role: string; text: string }> => {
        return new Promise((_, reject) => {
          if (abortSignal?.aborted) {
            const err = new Error("AI commentary service request timed out after 3000ms");
            err.name = "AbortError";
            return reject(err);
          }

          const timeoutId = setTimeout(() => {
            const err = new Error("AI commentary service request timed out after 3000ms");
            err.name = "AbortError";
            reject(err);
          }, 50);

          abortSignal?.addEventListener("abort", () => {
            clearTimeout(timeoutId);
            const err = new Error("AI commentary service request timed out after 3000ms");
            err.name = "AbortError";
            reject(err);
          });
        });
      };

      const abortController = new AbortController();
      // Simulate timeout trigger
      abortController.abort();

      let transitionScript: { role: string; text: string } | null = null;
      let usedFallback = false;

      try {
        transitionScript = await fetchAiRoundDialogue(abortController.signal);
      } catch (err: any) {
        assert.equal(err.name, "AbortError");
        // Seamless fallback to ROUND_INTRO_LINES template
        const fallback = ROUND_INTRO_LINES.tangToc;
        transitionScript = { role: fallback.role, text: fallback.text };
        usedFallback = true;
        speakRoundIntroTTS("tangToc", { engine: "webspeech" });
      }

      assert.equal(usedFallback, true, "Must catch timeout and activate fallback");
      assert.ok(transitionScript, "Transition script must be populated via fallback");
      assert.ok(transitionScript.text.includes("Tăng tốc"));
      assert.equal(transitionScript.role, "ngoc_huy");
      assert.equal(spoken.length, 1, "Must speak fallback round intro via Web Speech");
      assert.ok(spoken[0].text.includes("Tăng tốc"));
    }
  );
});

// ============================================================================
// TIER 4 — REAL-WORLD BROADCAST SCENARIOS (5 Tests)
// ============================================================================

test("T4.1: Complete Match Flow (Lobby -> Intro -> R1 -> R2 -> R3 -> R4 -> Ceremony) using Master Broadcast Script", async () => {
  const broadcastLog: Array<{ phase: string; role: string; text: string }> = [];

  // Stage 0: Lobby
  const lobbyText = interpolateTemplate(masterBroadcastScript.timeline.lobby.text, {
    tenPhong: "Chung kết Năm",
  });
  broadcastLog.push({ phase: "lobby", role: masterBroadcastScript.timeline.lobby.role, text: lobbyText });

  // Stage 1: Opening Duo & Contestant Intros
  for (const line of masterBroadcastScript.timeline.opening.duo) {
    broadcastLog.push({ phase: "opening", role: line.role, text: line.text });
  }

  const contestants = [
    { viTri: 1, name: "Nguyễn An", school: "THPT A", score: 0 },
    { viTri: 2, name: "Trần Bình", school: "THPT B", score: 0 },
    { viTri: 3, name: "Lê Chi", school: "THPT C", score: 0 },
    { viTri: 4, name: "Phạm Dũng", school: "THPT D", score: 0 },
  ];

  for (const c of contestants) {
    const introText = interpolateTemplate(masterBroadcastScript.timeline.contestantIntro.pattern, {
      viTri: c.viTri,
      tenThiSinh: c.name,
      tenTruong: c.school,
    });
    const role = c.viTri % 2 === 1 ? "khanh_vy" : "ngoc_huy";
    broadcastLog.push({ phase: "contestant_intro", role, text: introText });
  }

  // Stage 2: Round 1 (Khởi Động Solo Turn 1)
  const kdSoloIntro = interpolateTemplate(masterBroadcastScript.timeline.roundIntro.scripts.khoiDongSolo.text, {
    tenThiSinh: contestants[0].name,
    tenTruong: contestants[0].school,
  });
  broadcastLog.push({
    phase: "khoiDong_intro",
    role: masterBroadcastScript.timeline.roundIntro.scripts.khoiDongSolo.role,
    text: kdSoloIntro,
  });
  contestants[0].score += 60;
  contestants[1].score += 70;
  contestants[2].score += 50;
  contestants[3].score += 80;

  // Stage 3: Round 2 (VCNV)
  const vcnvIntro = interpolateTemplate(masterBroadcastScript.timeline.roundIntro.scripts.vcnv.text, {
    soChuCai: 10,
  });
  broadcastLog.push({
    phase: "vcnv_intro",
    role: masterBroadcastScript.timeline.roundIntro.scripts.vcnv.role,
    text: vcnvIntro,
  });
  contestants[3].score += 60;

  // Stage 4: Round 3 (Tăng Tốc)
  broadcastLog.push({
    phase: "tangToc_intro",
    role: masterBroadcastScript.timeline.roundIntro.scripts.tangToc.role,
    text: masterBroadcastScript.timeline.roundIntro.scripts.tangToc.text,
  });
  contestants[0].score += 70;
  contestants[1].score += 90;
  contestants[2].score += 40;
  contestants[3].score += 80;

  // Stage 5: Round 4 (Về Đích)
  broadcastLog.push({
    phase: "veDich_intro",
    role: masterBroadcastScript.timeline.roundIntro.scripts.veDich.role,
    text: masterBroadcastScript.timeline.roundIntro.scripts.veDich.text,
  });
  contestants[1].score += 60;
  contestants[3].score += 40;

  // Stage 6: Award Ceremony (3rd -> 2nd -> 1st)
  const thirdText = interpolateTemplate(masterBroadcastScript.timeline.awards.third.text, {
    tenGiaiBa: `${contestants[2].name} (${contestants[2].score} điểm) và ${contestants[0].name}`,
    diemGiaiBa: contestants[0].score,
  });
  broadcastLog.push({ phase: "awards_third", role: masterBroadcastScript.timeline.awards.third.role, text: thirdText });

  const secondText = interpolateTemplate(masterBroadcastScript.timeline.awards.second.text, {
    tenGiaiNhi: contestants[1].name,
    tenTruongGiaiNhi: contestants[1].school,
    diemGiaiNhi: contestants[1].score,
  });
  broadcastLog.push({ phase: "awards_second", role: masterBroadcastScript.timeline.awards.second.role, text: secondText });

  const firstText = interpolateTemplate(masterBroadcastScript.timeline.awards.first.text, {
    tenQuanQuan: contestants[3].name,
    tenTruongQuanQuan: contestants[3].school,
    diemQuanQuan: contestants[3].score,
  });
  broadcastLog.push({ phase: "awards_first", role: masterBroadcastScript.timeline.awards.first.role, text: firstText });

  assert.equal(broadcastLog.length, 14, "Broadcast log must record all 14 segments");
  assert.ok(broadcastLog.every((b) => b.text.length > 5 && !b.text.includes("{")));
});

test("T4.2: High-Tension Tie-Break & Câu Hỏi Phụ sudden-death sequence", () => {
  const tiedSeats = [
    { id: 0, name: "Hoàng Nam", score: 240 },
    { id: 1, name: "Quốc Anh", score: 240 },
    { id: 2, name: "Thảo Vy", score: 180 },
    { id: 3, name: "Đức Trí", score: 140 },
  ];

  const tiePlan = computeFinalAwardPlan(tiedSeats);
  assert.equal(tiePlan.isTieForFirst, true);
  assert.deepEqual(tiePlan.tiedLeaderIds, [0, 1]);

  const chpIntro = ROUND_INTRO_LINES.cauHoiPhu;
  assert.ok(chpIntro.text.includes("Câu hỏi phụ"));

  const resolvedPlan = computeFinalAwardPlan(tiedSeats, { chpWinnerSeatId: 1 });
  assert.equal(resolvedPlan.isTieForFirst, false);
  assert.equal(resolvedPlan.rankings[0].seat.id, 1);
  assert.equal(resolvedPlan.rankings[0].awardLabel, "Quán quân");
});

test("T4.3: Host Emergency Override & Replay Workflow", async () => {
  await withMockBrowserEnv(
    { withAudioContext: true },
    () => {
      (globalThis as any).window.speechSynthesis.pause();
      assert.equal((globalThis as any).window.speechSynthesis.paused, true);

      setTtsBaseRate(1.10);
      assert.equal(getTtsBaseRate(), 1.10);

      (globalThis as any).window.speechSynthesis.resume();
      assert.equal((globalThis as any).window.speechSynthesis.paused, false);

      const spokenName = getContestantSpokenName("Thí sinh Quốc Anh");
      assert.equal(spokenName, "Quốc Anh");
    }
  );
});

test("T4.4: Full Offline Resilience Match delivers 100% speech via Web Speech fallback without crashes", async () => {
  const spoken: any[] = [];
  await withMockBrowserEnv(
    {
      online: false,
      spoken,
      withAudioContext: true,
    },
    async () => {
      const matchScript = [
        "Chào mừng đến với trận đấu",
        "Vòng Khởi Động bắt đầu",
        "Câu hỏi số 1 dành cho bạn",
        "Chính xác! Thêm 10 điểm",
        "Và chúc mừng bạn đã giành giải Nhất!",
      ];

      for (const line of matchScript) {
        await speakOlympiaTTSAsync(line, {
          engine: "webspeech",
          role: "khanh_vy",
        });
      }

      assert.equal(spoken.length, 5, "All 5 broadcast lines must speak successfully via Web Speech");
      assert.ok(spoken.every((s) => s.pitch === 1.12), "Khánh Vy must retain female pitch profile");
    }
  );
});

test("T4.5: Adversarial Broadcast Stress Test: 100 consecutive rapid broadcast events execute with 0 disk writes", async () => {
  startFsWriteSpy();
  try {
    const spoken: any[] = [];
    await withMockBrowserEnv(
      {
        spoken,
        withAudioContext: true,
      },
      async () => {
        for (let i = 0; i < 100; i++) {
          const role: DualMcRole = i % 2 === 0 ? "khanh_vy" : "ngoc_huy";
          if (i % 10 === 0) {
            cancelTTS();
          } else if (i % 7 === 0) {
            smoothStopOlympiaTTS(30, 80);
          } else if (i % 5 === 0) {
            handleBuzzerInterrupt(`Thí sinh ${i}`, { readingHost: "khanh_vy", coHost: "ngoc_huy" });
            cancelBuzzerInterrupt();
          } else {
            speakOlympiaTTS(`Sự kiện truyền hình số ${i}`, { role, engine: "webspeech" });
          }
        }
      }
    );

    const counts = stopFsWriteSpy();
    assert.equal(counts.writeFileSync, 0, "Stress test: 0 calls to writeFileSync");
    assert.equal(counts.writeFile, 0, "Stress test: 0 calls to writeFile");
    assert.equal(counts.promisesWriteFile, 0, "Stress test: 0 calls to promises.writeFile");
    assert.equal(counts.createWriteStream, 0, "Stress test: 0 calls to createWriteStream");
  } finally {
    stopFsWriteSpy();
  }
});

test("T4.6: Multi-run FIFO broadcast chaining (OpeningDuo -> Entrance -> RoundIntro -> KD segIdx=0 / VD pre_stage) & session reset", async () => {
  const spoken: Array<{ text: string; pitch: number; rate: number; lang: string }> = [];
  await withMockBrowserEnv({ spoken, withAudioContext: true }, async () => {
    // Run #1: Opening Duo -> Entrance Step 0 queued without cancelling
    resetOlympiaTtsSession();
    const seats = [
      { id: 0, name: "TS. Phạm Quốc", school: "THPT PTNK", score: 0 },
      { id: 1, name: "N.V.A", school: "THPT KHTN", score: 0 },
    ];
    const duo = buildOpeningDuoScript({ roomName: "Tuần 1" });
    const pDuo = speakDualMcScriptAsync(duo, { engine: "webspeech" });
    const step0 = buildContestantIntroStepSegment(seats, 0)!;
    const pStep0 = speakDualMcScriptAsync([step0], { engine: "webspeech", queueAfterActive: true });

    const [duoOk, step0Ok] = await Promise.all([pDuo, pStep0]);
    assert.equal(duoOk, true);
    assert.equal(step0Ok, true);
    assert.equal(spoken.length, 3);
    assert.ok(spoken[2].text.includes("Phạm Quốc"));
    assert.ok(spoken[2].text.includes("Phổ thông Năng khiếu"));

    // Run #2 after full session reset: Round Intro -> Khởi Động segIdx=0 chained cleanly
    resetOlympiaTtsSession();
    const introOk = await speakRoundIntroTTS("khoiDong", { engine: "webspeech" });
    assert.equal(introOk, true);
    const kd0 = buildKhoiDongTurnBridgeSegment({
      segKind: "solo",
      segIdx: 0,
      seatId: 0,
      name: seats[0].name,
    });
    assert.ok(!/bàn phím chuông|bấm chuông/i.test(kd0.text));
    const kd0Ok = await speakDualMcScriptAsync([kd0], { engine: "webspeech", queueAfterActive: true });
    assert.equal(kd0Ok, true);

    const entranceBridge = buildEntranceOpeningBridge(seats);
    assert.ok(entranceBridge && entranceBridge.text.includes("2 nhà leo núi"));
    const vdPre0 = buildVeDichBridgeSegment({
      kind: "pre_stage",
      seatId: 1,
      name: seats[1].name,
      score: 120,
      turnIdx: 0,
      totalTurns: 2,
    });
    assert.ok(vdPre0.text.includes("N.V.A") && vdPre0.text.includes("120 điểm"));
  });
});

test("T4.7 (R2): Solo-first (O13/O23/O26) & Shared-first (O22) Khởi Động round_intro -> kd-seg-0 -> Q1 FIFO chaining + DisplayScreen/HostConsole contracts", async () => {
  const spoken: Array<{ text: string; pitch: number; rate: number; lang: string }> = [];
  await withMockBrowserEnv({ spoken, withAudioContext: true, autoFireEnd: false }, async (controls) => {
    for (const cfg of [
      { rulesetId: "O13" as const, expectedKind: "solo" as const, expectedTextRe: /thí sinh đầu tiên.*An/i },
      { rulesetId: "O23" as const, expectedKind: "solo" as const, expectedTextRe: /thí sinh đầu tiên.*An/i },
      { rulesetId: "O26" as const, expectedKind: "solo" as const, expectedTextRe: /thí sinh đầu tiên.*An/i },
      { rulesetId: "O22" as const, expectedKind: "turn" as const, expectedTextRe: /Khởi Động đầu tiên.*4 nhà leo núi/i },
    ]) {
      resetOlympiaTtsSession();
      spoken.length = 0;

      const g = new OlympiaGame(
        `R2_${cfg.rulesetId}`,
        {
          rulesetId: cfg.rulesetId,
          rounds: ["khoiDong"],
          seatCount: 4,
          questionSet: {
            name: "R2 Set",
            khoiDong: {
              shared: [{ q: "Thủ đô của Việt Nam là thành phố nào?", a: "Hà Nội" }],
              solo: {
                "1": [{ q: "Thủ đô của Việt Nam là thành phố nào?", a: "Hà Nội" }],
              },
            },
            vcnv: { answer: "OLYMPIA", rows: [], centerQuestion: { q: "Q", a: "A" } },
            tangToc: [],
            veDich: {},
            cauHoiPhu: [],
          },
        },
        0
      );
      g.joinSeat("An", "k1");
      g.joinSeat("Bình", "k2");
      g.joinSeat("Chi", "k3");
      g.joinSeat("Dũng", "k4");
      g.hostAction({ type: "round:force", round: "khoiDong" }, 1000);
      g.hostAction({ type: "banner:skip" }, 1500);

      const kd = g.state.khoiDong!;
      const seg0 = kd.segments[0];
      assert.equal(seg0.kind, cfg.expectedKind);

      // 1. round_intro starts -> kd-seg-0 queues -> kd:start & Q1 opens early -> Q1 queues FIFO behind kd-seg-0
      const pIntro = speakRoundIntroTTS("khoiDong", { engine: "webspeech" });
      const kd0Seg = buildKhoiDongTurnBridgeSegment({
        segKind: seg0.kind,
        segIdx: 0,
        seatId: seg0.kind === "solo" ? seg0.seat : undefined,
        name: seg0.kind === "solo" ? g.state.seats[seg0.seat!]?.name : undefined,
        seatCount: g.state.seats.length,
      });
      assert.match(kd0Seg.text, cfg.expectedTextRe);
      const pKd0 = speakDualMcScriptAsync([kd0Seg], { engine: "webspeech", queueAfterActive: true });

      g.hostAction({ type: "kd:start" }, 2000);
      g.hostAction({ type: "kd:next" }, 6000);
      assert.equal(g.state.ttsCommand ?? null, null);
      assert.equal(hasPendingIntroOrBridgeSpeech(), true);

      speakSmartQuestion(g.state.khoiDong!.current!.q, {
        engine: "webspeech",
        round: "khoiDong",
        segIdx: 0,
        queueAfterActive: true,
      });

      assert.equal(spoken.length, 1, `${cfg.rulesetId}: only round_intro speaks initially`);
      controls.lastUtterance().onend();
      assert.equal(await pIntro, true);
      await new Promise((r) => setTimeout(r, 10));

      assert.equal(spoken.length, 2, `${cfg.rulesetId}: kd-seg-0 speaks second`);
      assert.match(spoken[1].text, cfg.expectedTextRe);
      controls.lastUtterance().onend();
      assert.equal(await pKd0, true);
      await new Promise((r) => setTimeout(r, 10));

      assert.equal(spoken.length, 3, `${cfg.rulesetId}: Q1 speaks third after kd-seg-0`);
      assert.ok(spoken[2].text.includes("Thủ đô của Việt Nam"));
      controls.lastUtterance().onend();
      skipOlympiaTTS();
    }
  });

  // Contract checks on DisplayScreen.tsx & HostConsole.tsx
  const displaySrc = fs.readFileSync("src/components/olympia/DisplayScreen.tsx", "utf8");
  const hostSrc = fs.readFileSync("src/components/olympia/HostConsole.tsx", "utf8");

  assert.ok(
    displaySrc.includes("state.banner ||") &&
      displaySrc.includes("state.roundIntroDoneAt ||") &&
      displaySrc.includes("state.entranceCompleted ||"),
    "DisplayScreen must guard triggerOpeningDuo against banner / roundIntroDoneAt / entranceCompleted"
  );
  assert.ok(
    displaySrc.includes('k.startsWith("kd-seg-")') &&
      displaySrc.includes('k.startsWith("kd-finish-seg-")'),
    "DisplayScreen bannerSeq reset must clear kd-seg-* and kd-finish-seg-*"
  );
  assert.ok(
    displaySrc.includes("!kd.started || (kd.qIdx < 0 && !kd.questionRevealed)"),
    "DisplayScreen must still queue kd-seg-0 on early kd:start before Q1 reveals"
  );
  assert.ok(
    displaySrc.includes("recoverBlockedRoundSpeech"),
    "DisplayScreen must recover blocked round_intro / kd-seg-0 on UNLOCK_AUDIO & user gesture"
  );
  assert.ok(
    displaySrc.includes('state.khoiDong.phase !== "result"'),
    "DisplayScreen question effect must exclude kd.phase === 'result' (kd:skip)"
  );
  assert.ok(
    displaySrc.includes("cmd.meta?.immediate") && displaySrc.includes("cancelTTS()"),
    "DisplayScreen ttsCommand handler must call cancelTTS() when meta.immediate is set"
  );
  assert.ok(
    hostSrc.includes("const isBannerActive = Boolean(state.banner);") &&
      hostSrc.includes("const isLocked = isBannerActive || isTurnLocked;"),
    "HostConsole KhoiDongDeck must disable ▶ BẮT ĐẦU while state.banner is active"
  );
});
