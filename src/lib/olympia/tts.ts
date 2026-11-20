/**
 * Olympia Text-to-Speech (TTS) Engine
 * - Multi-role Voice Acting: Khánh Vy (Female, pitch 1.12) & Ngọc Huy (Male, pitch 0.88)
 * - Season-Aware Reading Speed Calibration:
 *     * O20-O22: Rapid-fire tempo (1.38x - 1.45x) for unlimited question sprints
 *     * O23-O26/O27: Broadcast cadence (1.05x - 1.10x) calibrated to 5-second countdowns
 * - Word-Boundary Natural Speech Stop on buzzer press or verdict evaluation
 * - Intelligent Result Announcement & Answer Summarization
 * - Normalizes Vietnamese broadcast terminology & units
 */

export type MCRole = "khanh_vy" | "ngoc_huy" | "khanhVy" | "ngocHuy" | "auto";
export type TTSSegment =
  | "intro_greeting"
  | "round_intro"
  | "question"
  | "result"
  | "buzzer"
  | "steal_callout"
  | "answers_summary"
  | "time_callout"
  | "cnv_bell"
  | "cnv_congratulate"
  | "cnv_elimination";

export interface SpeakTTSOptions {
  role?: MCRole;
  season?: string;
  segment?: TTSSegment;
  seatId?: number;
  round?: string;
  segIdx?: number;
  rowIdx?: number;
  turnIdx?: number;
  isConsecutive?: boolean;
  delayMs?: number;
  onEnd?: () => void;
}

export interface ContestantSubmissionItem {
  seat: number;
  name: string;
  answer: string;
  ms?: number;
  noAnswer?: boolean;
}

export interface GroupedAnswerItem {
  normalizedAnswer: string;
  displayAnswer: string;
  contestantNames: string[];
  isSpellingError: boolean;
  isNoAnswer: boolean;
  minMs?: number;
}

export function normalizeVietnameseTTS(rawText: string): string {
  if (!rawText) return "";
  let t = rawText;
  // Remove markdown formatting
  t = t.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1");
  // Remove parenthetical stage cues or points: (10 điểm), (5 chữ cái), (30 giây), etc.
  t = t.replace(/\(\s*\d+\s*(điểm|chữ cái|ký tự|giây)\s*\)/gi, "");
  // Expand common broadcast abbreviations
  t = t.replace(/\bTP\.\s*/gi, "Thành phố ");
  t = t.replace(/\bTpHCM\b/gi, "Thành phố Hồ Chí Minh");
  t = t.replace(/\bTHPT\b/gi, "Trung học phổ thông");
  t = t.replace(/\bTHCS\b/gi, "Trung học cơ sở");
  t = t.replace(/\bVN\b/gi, "Việt Nam");
  t = t.replace(/\bVTV\b/gi, "Vê Tê Vê");
  t = t.replace(/\bVTV3\b/gi, "Vê Tê Vê Ba");
  t = t.replace(/\bCNV\b/gi, "Chướng ngại vật");
  t = t.replace(/\bVCNV\b/gi, "Vượt chướng ngại vật");
  t = t.replace(/\bO20\b/gi, "Ô hai mươi");
  t = t.replace(/\bO21\b/gi, "Ô hai mốt");
  t = t.replace(/\bO22\b/gi, "Ô hai hai");
  t = t.replace(/\bO23\b/gi, "Ô hai ba");
  t = t.replace(/\bO24\b/gi, "Ô hai bốn");
  t = t.replace(/\bO25\b/gi, "Ô hai lăm");
  t = t.replace(/\bO26\b/gi, "Ô hai sáu");
  t = t.replace(/\bO27\b/gi, "Ô hai bảy");
  t = t.replace(/\bkm\/h\b/gi, "ki lô mét một giờ");
  t = t.replace(/\bm\/s\b/gi, "mét một giây");
  t = t.replace(/\bcm\/s\b/gi, "xen ti mét một giây");
  t = t.replace(/\bmm\/s\b/gi, "mi li mét một giây");
  t = t.replace(/\brad\/s\b/gi, "ra đi an một giây");
  t = t.replace(/\bkg\/m3\b/gi, "ki lô gam trên mét khối");
  t = t.replace(/\bg\/cm3\b/gi, "gam trên xen ti mét khối");
  t = t.replace(/\b(\d+)\/(\d+)\b/g, "$1 phần $2");
  t = t.replace(/(?:°\s*C|°C|\bđộ\s*C\b)/gi, "độ xê");
  t = t.replace(/%/g, " phần trăm");
  return t.trim();
}

/**
 * Summarize raw database answer for concise spoken vocalization:
 * - Strips answer prefixes ("Đáp án:", "Kết quả:")
 * - Strips letter/point count annotations
 * - Strips clarifying parentheticals ("(Định luật quán tính)")
 * - Takes first alternative from "/" or ";" lists
 * - Truncates excessively verbose answers (>8 words) cleanly at phrase boundaries
 */
export function summarizeOlympiaAnswer(rawAnswer: string): string {
  if (!rawAnswer) return "";
  let a = normalizeVietnameseTTS(rawAnswer.trim());

  // Strip prefixes like "Đáp án:", "Đáp án là:", "Kết quả là:", "Từ khóa là:", etc.
  a = a.replace(/^(đáp án|kết quả|từ khóa|câu trả lời)(\s+(đúng\s+)?là)?\s*[:=]?\s*/i, "");

  // Strip parenthetical count annotations: (10 điểm), (7 chữ cái), etc.
  a = a.replace(/\(\s*\d+\s*(điểm|chữ cái|ký tự|giây)\s*\)/gi, "");

  // Strip parentheses clarifying descriptions like "(Định luật quán tính)" or "(Sài Gòn)"
  // Keep the primary answer outside parentheses if it's already substantive
  const parenMatch = a.match(/^(.*?)\s*\((.*?)\)$/);
  if (parenMatch && parenMatch[1].trim().length >= 2) {
    a = parenMatch[1].trim();
  } else {
    // Strip any remaining internal parentheses
    a = a.replace(/\(.*?\)/g, "").trim();
  }

  // Handle slash or semicolon alternatives: take first alternative
  // Avoid splitting within units (e.g. km/h, m/s) or fractions (e.g. 1/2)
  if (a.includes(";")) {
    a = a.split(";")[0].trim();
  }
  if (a.includes("/")) {
    const isUnitOrFraction = /^\s*(\d+\/\d+|[a-zA-Z]+\/[a-zA-Z0-9]+)\s*$/.test(a);
    if (!isUnitOrFraction) {
      const slashParts = a.split(/\s+\/\s+/);
      if (slashParts.length > 1) {
        a = slashParts[0].trim();
      } else {
        const match = a.match(/^(.*?)\s*\/\s*(.*)$/);
        if (match) {
          const before = match[1].trim();
          const after = match[2].trim();
          const isSlashUnit = /(?:km|m|cm|mm|rad|kg|g)\s*$/i.test(before) && /^\s*(?:h|s|m3|cm3|kg)/i.test(after);
          const isFraction = /\d+\s*$/.test(before) && /^\s*\d+/.test(after);
          if (!isSlashUnit && !isFraction) {
            a = before;
          }
        }
      }
    }
  }

  // Strip markdown
  a = a.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1");

  // Truncate overly long explanatory sentences (> 8 words)
  const words = a.split(/\s+/).filter(Boolean);
  if (words.length > 8) {
    // If there is a clause ending with comma or semicolon with 2 to 8 words, use it
    const clauseMatch = a.match(/^([^,;]+)[,;]/);
    if (clauseMatch) {
      const clauseWords = clauseMatch[1].trim().split(/\s+/).filter(Boolean);
      if (clauseWords.length >= 2 && clauseWords.length <= 8) {
        a = clauseMatch[1].trim();
      } else {
        a = words.slice(0, 8).join(" ");
      }
    } else {
      a = words.slice(0, 8).join(" ");
    }
  }

  return normalizeVietnameseTTS(a);
}

/**
 * Season-aware reading rate calculation:
 * - O20-O22: Rapid-fire tempo (1.38x - 1.45x)
 * - O23-O27: Moderate broadcast tempo (1.05x - 1.10x)
 * - Length compensation (>25 words): 1.12x boost
 */
export function getSeasonReadingRate(season?: string, wordCount: number = 0): number {
  const s = (season || "O26").toUpperCase();
  const isRapidSeason =
    s.includes("O20") || s.includes("O21") || s.includes("O22") || s === "20" || s === "21" || s === "22";
  let baseRate = isRapidSeason ? 1.40 : 1.08;

  if (wordCount > 25) {
    baseRate = Math.min(1.65, baseRate * 1.12);
  }
  return +baseRate.toFixed(2);
}

/**
 * Resolves alternating hosts for turn/segment:
 * - Khởi động:
 *   Alternate 2 hosts per turn/segment (segIdx).
 *   One host reads all questions (readingHost), the other confirms answers/points/buzzers (coHost).
 *   Swap roles at segment completion (segIdx).
 *   segIdx % 2 === 0: readingHost = khanh_vy, coHost = ngoc_huy
 *   segIdx % 2 === 1: readingHost = ngoc_huy, coHost = khanh_vy
 * - VCNV:
 *   One host manages a full horizontal row; swap hosts for subsequent rows.
 *   rowIdx % 2 === 0: readingHost = khanh_vy, coHost = ngoc_huy
 *   rowIdx % 2 === 1: readingHost = ngoc_huy, coHost = khanh_vy
 * - Tăng Tốc / Về Đích / Câu Hỏi Phụ:
 *   readingHost = ngoc_huy, coHost = khanh_vy (default)
 */
export function resolveTurnHosts(
  round: string,
  turnIdx: number = 0
): {
  readingHost: "khanh_vy" | "ngoc_huy";
  coHost: "khanh_vy" | "ngoc_huy";
} {
  const normRound = (round || "").toLowerCase();
  if (normRound === "khoidong" || normRound === "vcnv") {
    const isEven = turnIdx % 2 === 0;
    return {
      readingHost: isEven ? "khanh_vy" : "ngoc_huy",
      coHost: isEven ? "ngoc_huy" : "khanh_vy",
    };
  }
  return {
    readingHost: "ngoc_huy",
    coHost: "khanh_vy",
  };
}

/**
 * Resolves active MC role based on round, seat, segment, and alternating turns:
 * - Intro greeting: Khánh Vy
 * - Round intro:
 *     * Khởi động: Ngọc Huy
 *     * VCNV: Khánh Vy
 *     * Tăng tốc: Ngọc Huy
 *     * Về đích: Khánh Vy
 *     * Câu hỏi phụ: Ngọc Huy
 * - Questions & Turns:
 *     * Khởi động: Alternates 2 hosts per segment (readingHost reads, coHost confirms).
 *     * VCNV: Alternates 2 hosts per row.
 *     * Tăng tốc: Ngọc Huy
 *     * Về đích: Ngọc Huy
 *     * Câu hỏi phụ: Ngọc Huy
 */
export function resolveMCRole(options?: SpeakTTSOptions): "khanh_vy" | "ngoc_huy" {
  if (options?.role && options.role !== "auto") {
    if (options.role === "khanhVy" || options.role === "khanh_vy") return "khanh_vy";
    if (options.role === "ngocHuy" || options.role === "ngoc_huy") return "ngoc_huy";
  }

  const segment = options?.segment || "question";
  const round = options?.round || "khoiDong";
  const seatId = options?.seatId ?? 0;
  const turnIdx =
    round === "khoiDong"
      ? (options?.segIdx ?? options?.turnIdx)
      : round === "vcnv"
      ? (options?.rowIdx ?? options?.turnIdx)
      : options?.turnIdx;

  if (segment === "intro_greeting") return "khanh_vy";
  if (segment === "round_intro") {
    if (round === "vcnv" || round === "veDich") return "khanh_vy";
    return "ngoc_huy";
  }

  // Khởi động
  if (round === "khoiDong") {
    if (turnIdx != null) {
      const { readingHost, coHost } = resolveTurnHosts("khoiDong", turnIdx);
      if (segment === "result" || segment === "buzzer") {
        return coHost;
      }
      return readingHost;
    }
    // Backward compatibility when turnIdx/segIdx is not explicitly passed
    if (segment === "result") {
      return "ngoc_huy";
    }
    return seatId % 2 === 0 ? "khanh_vy" : "ngoc_huy";
  }

  // VCNV
  if (round === "vcnv") {
    if (turnIdx != null) {
      const { readingHost, coHost } = resolveTurnHosts("vcnv", turnIdx);
      if (segment === "buzzer" || segment === "cnv_bell") {
        return coHost;
      }
      return readingHost;
    }
    if (segment === "buzzer" || segment === "cnv_bell") return "ngoc_huy";
    return "khanh_vy";
  }

  // Result segment for other rounds
  if (segment === "result") {
    if (round === "veDich") return "khanh_vy";
    return "ngoc_huy";
  }

  // Buzzer segment for other rounds
  if (segment === "buzzer" || segment === "steal_callout") {
    return "khanh_vy";
  }

  // Question segment
  if (round === "tangToc" || round === "veDich" || round === "cauHoiPhu") return "ngoc_huy";
  return "khanh_vy";
}

let ttsEnabled = true;

if (typeof window !== "undefined") {
  const stored = localStorage.getItem("olympia_tts_enabled");
  if (stored !== null) {
    ttsEnabled = stored === "true" || stored === "1";
  }
}

export function isTtsEnabled(): boolean {
  return ttsEnabled;
}

export function setTtsEnabled(enabled: boolean): void {
  ttsEnabled = enabled;
  if (typeof window !== "undefined") {
    localStorage.setItem("olympia_tts_enabled", enabled ? "true" : "false");
    if (!enabled) cancelTTS();
  }
}

let currentUtterance: SpeechSynthesisUtterance | null = null;
let stopRequested = false;
let boundaryCleanupTimer: any = null;

/**
 * Natural speech stop mechanism:
 * Waits for the next word boundary (`onboundary`) or maximum 45ms
 * to terminate speech gracefully without mid-phoneme clipping pop.
 */
export function smoothStopOlympiaTTS(fadeMs: number = 45): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
    currentUtterance = null;
    return;
  }

  stopRequested = true;
  const executeCancel = () => {
    try {
      window.speechSynthesis.cancel();
    } catch {}
    stopRequested = false;
    currentUtterance = null;
    if (boundaryCleanupTimer) {
      clearTimeout(boundaryCleanupTimer);
      boundaryCleanupTimer = null;
    }
  };

  boundaryCleanupTimer = setTimeout(executeCancel, Math.max(30, fadeMs));
}

export const smoothStopTTS = smoothStopOlympiaTTS;

export function cancelTTS(): void {
  stopRequested = false;
  if (boundaryCleanupTimer) {
    clearTimeout(boundaryCleanupTimer);
    boundaryCleanupTimer = null;
  }
  currentUtterance = null;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch {}
}

/**
 * Resolves browser Web Speech API voice and acoustic parameters for MC role
 */
export function resolveMCVoiceConfig(role: "khanh_vy" | "ngoc_huy"): {
  voice: SpeechSynthesisVoice | null;
  pitch: number;
} {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return { voice: null, pitch: role === "khanh_vy" ? 1.12 : 0.88 };
  }

  const voices = window.speechSynthesis.getVoices();
  const viVoices = voices.filter(
    (v) => v.lang.startsWith("vi") || v.lang === "vi-VN" || v.lang === "vi_VN"
  );

  let selectedVoice: SpeechSynthesisVoice | null = null;
  if (role === "khanh_vy") {
    selectedVoice =
      viVoices.find(
        (v) =>
          /hoaimy|female|loan|nữ/i.test(v.name) ||
          /vietnam.*female/i.test(v.name)
      ) ||
      viVoices[0] ||
      null;
    return { voice: selectedVoice, pitch: 1.12 };
  } else {
    selectedVoice =
      viVoices.find(
        (v) =>
          /namminh|male|an|nam/i.test(v.name) ||
          /vietnam.*male/i.test(v.name)
      ) ||
      viVoices[viVoices.length > 1 ? 1 : 0] ||
      null;
    return { voice: selectedVoice, pitch: 0.88 };
  }
}

/**
 * Smart Multi-role Olympia TTS invocation:
 * - Dynamically configures voice, pitch, and season-calibrated rate
 * - Attaches word-boundary monitoring for smooth stop
 */
export function speakOlympiaTTS(text: string, options?: SpeakTTSOptions): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  if (!ttsEnabled) return;

  cancelTTS();
  const clean = normalizeVietnameseTTS(text);
  if (!clean) return;

  try {
    const role = resolveMCRole(options);
    const { voice, pitch } = resolveMCVoiceConfig(role);
    const wordCount = clean.split(/\s+/).filter(Boolean).length;
    const rate = getSeasonReadingRate(options?.season, wordCount);

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = "vi-VN";
    utterance.pitch = pitch;
    utterance.rate = rate;
    if (voice) utterance.voice = voice;

    utterance.onboundary = () => {
      if (stopRequested) {
        try {
          window.speechSynthesis.cancel();
        } catch {}
        stopRequested = false;
        currentUtterance = null;
        if (boundaryCleanupTimer) {
          clearTimeout(boundaryCleanupTimer);
          boundaryCleanupTimer = null;
        }
      }
    };

    utterance.onend = () => {
      currentUtterance = null;
      options?.onEnd?.();
    };
    utterance.onerror = () => {
      currentUtterance = null;
    };

    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn("[Olympia TTS] Error speaking:", err);
  }
}

export const speakSmartQuestion = (
  questionText: string,
  options?: SpeakTTSOptions
) => {
  speakOlympiaTTS(questionText, { ...options, segment: "question" });
};

/**
 * Vocalize Result Confirmation or Summarized Answer:
 * - If correct: announces "Chính xác!"
 * - If incorrect/timeout: announces concise summarized answer
 */
export function speakOlympiaResult(
  isCorrect: boolean,
  answer?: string,
  options?: SpeakTTSOptions
): void {
  if (!ttsEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;

  const dynamicKhoiDongRole =
    options?.round === "khoiDong" && options?.segIdx !== undefined
      ? resolveTurnHosts("khoiDong", options.segIdx).coHost
      : undefined;

  if (isCorrect) {
    speakOlympiaTTS("Chính xác!", {
      ...options,
      segment: "result",
      role: options?.role || dynamicKhoiDongRole || "khanh_vy",
    });
  } else if (answer) {
    const summary = summarizeOlympiaAnswer(answer);
    if (summary) {
      speakOlympiaTTS(`Đáp án chính xác là: ${summary}`, {
        ...options,
        segment: "result",
        role: options?.role || dynamicKhoiDongRole || "ngoc_huy",
      });
    }
  }
}

export const announceResultTTS = (
  type: "correct" | "answer",
  answer?: string,
  options?: SpeakTTSOptions
) => {
  speakOlympiaResult(type === "correct", answer, options);
};

export const ROUND_INTRO_LINES: Record<string, { role: MCRole; text: string }> = {
  khoiDong: {
    role: "ngoc_huy",
    text: "Phần thi Khởi động bắt đầu!",
  },
  vcnv: {
    role: "khanh_vy",
    text: "Chào mừng các bạn đến với phần thi Vượt chướng ngại vật!",
  },
  tangToc: {
    role: "ngoc_huy",
    text: "Phần thi tiếp theo mang tên: Tăng tốc!",
  },
  veDich: {
    role: "khanh_vy",
    text: "Và phần thi quyết định: Về đích!",
  },
  cauHoiPhu: {
    role: "ngoc_huy",
    text: "Câu hỏi phụ bắt đầu!",
  },
};

export function speakRoundIntroTTS(round: string, options?: SpeakTTSOptions): void {
  const intro = ROUND_INTRO_LINES[round];
  if (!intro) return;
  speakOlympiaTTS(intro.text, {
    ...options,
    role: options?.role || intro.role,
    segment: "round_intro",
  });
}

// Backward compatibility with legacy speakTTS
export function speakTTS(text: string, onEnd?: () => void): void {
  speakOlympiaTTS(text, { onEnd });
}

/**
 * Strips prefix tags (e.g. "Thí sinh ", "Ghế ", "Bạn ", "TS ") from contestant names
 * to produce clean personal names for broadcast vocalization.
 */
export function getContestantSpokenName(name: string): string {
  if (!name) return "";
  let clean = name.trim();
  clean = clean.replace(/^(thí sinh|ghế\s*\d*[\s:\.-]*|bạn|ts\.?)\s*/i, "").trim();
  return clean;
}

/**
 * Buzzer Callout Variations (R1 / M4):
 * Randomize among 3 variants:
 * (1) "<Tên>!"
 * (2) "Xin mời <Tên>!"
 * (3) "Tiếp tục là <Tên>!" (when buzzing consecutively)
 */
export function generateBuzzerCallout(name: string, isConsecutive: boolean = false): string {
  const cleanName = getContestantSpokenName(name);
  if (!cleanName) return "";
  if (isConsecutive) {
    return `Tiếp tục là ${cleanName}!`;
  }
  const variants = [`${cleanName}!`, `Xin mời ${cleanName}!`];
  return variants[Math.floor(Math.random() * variants.length)];
}

let buzzerPauseTimer: any = null;
let lastBuzzedContestant: string | null = null;

/**
 * Handle buzzer interrupt during question reading:
 * - Natural pause at word boundary (~0.5s reflex pause)
 * - Co-host calls contestant name after ~0.5s reflex pause
 */
export function handleBuzzerInterrupt(
  contestantName: string,
  options?: {
    readingHost?: MCRole;
    coHost?: MCRole;
    isConsecutive?: boolean;
    reflexPauseMs?: number;
    season?: string;
    round?: string;
    onEnd?: () => void;
  }
): void {
  if (buzzerPauseTimer) {
    clearTimeout(buzzerPauseTimer);
    buzzerPauseTimer = null;
  }

  // 1. Natural word boundary stop
  smoothStopOlympiaTTS(45);

  if (!contestantName) return;

  const isConsecutive =
    options?.isConsecutive !== undefined
      ? options.isConsecutive
      : lastBuzzedContestant === contestantName;
  lastBuzzedContestant = contestantName;

  const reflexPauseMs = options?.reflexPauseMs ?? 500;

  // 2. Reflex pause (~0.5s), then co-host calls name
  buzzerPauseTimer = setTimeout(() => {
    buzzerPauseTimer = null;
    const callout = generateBuzzerCallout(contestantName, isConsecutive);
    const coHost =
      options?.coHost ||
      (options?.readingHost === "khanh_vy" ? "ngoc_huy" : "khanh_vy");

    speakOlympiaTTS(callout, {
      role: coHost,
      segment: "buzzer",
      season: options?.season,
      round: options?.round,
      onEnd: options?.onEnd,
    });
  }, reflexPauseMs);
}

export function removeVietnameseAccents(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

export function computeLevenshteinDistance(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix: number[][] = [];
  for (let i = 0; i <= bn; i++) matrix[i] = [i];
  for (let j = 0; j <= an; j++) matrix[0][j] = j;

  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[bn][an];
}

/**
 * Detects whether a submitted answer is a typo/spelling error or meaningless text:
 * - Vowel-less gibberish (e.g. length >= 3 with no Vietnamese vowels)
 * - Diacritic error: same base letters without accents, but different with accents
 * - Small Levenshtein edit distance: dist <= 2 on words >= 4 characters
 */
export function detectSpellingError(
  submission: string,
  targetAnswer?: string
): {
  isError: boolean;
  reason?: "diacritic" | "distance" | "gibberish";
} {
  const cleanSub = (submission || "").trim();
  if (!cleanSub) return { isError: false };

  const cleanTarget = targetAnswer ? targetAnswer.trim() : undefined;

  // 1. Exact case-insensitive match against targetAnswer is always valid (e.g. "1945", "GDP", "TNT")
  if (cleanTarget && cleanSub.toLowerCase() === cleanTarget.toLowerCase()) {
    return { isError: false };
  }

  // 2. Numeric, mathematical, or symbolic expressions (e.g. "1945", "100", "1/2", "3.14", "100%") are not spelling errors
  if (/^[\d\s.,/%+-]+$/.test(cleanSub)) {
    return { isError: false };
  }

  // 2b. Number + unit expressions (e.g. "120 km/h", "50 m/s", "10 kg", "25 °C") are valid answers, not spelling errors
  if (
    /^[+-]?\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)?\s*(?:km\/h|m\/s|cm\/s|mm\/s|rad\/s|kg\/m3|g\/cm3|km|cm|mm|dm|nm|um|kg|mg|ml|dl|cl|kHz|MHz|GHz|Hz|mol|kcal|cal|kWh|Wh|kW|MW|mA|kV|mV|°\s*[CFK]|[mgschlNVAWJPK%])$/i.test(
      cleanSub
    )
  ) {
    return { isError: false };
  }

  // 3. Keyboard row mashes (even if they contain vowels like 'a' or 'y' in "asdfgh", "qwrty")
  if (/(?:asdf|sdfg|dfgh|fghj|ghjk|zxcv|xcvb|cvbn|qwer|wert|erty|qwrty)/i.test(cleanSub)) {
    return { isError: true, reason: "gibberish" };
  }

  // 3b. Short all-caps acronyms (2-5 chars, e.g. "GDP", "TNT", "BBC", "HTML", "HTTP") are valid even if non-matching
  if (/^[A-Z0-9]{2,5}$/.test(cleanSub)) {
    return { isError: false };
  }

  // 4. Consonant mash / vowel-less gibberish / 5+ consecutive consonants
  const hasLetters = /[a-zA-Z\u00C0-\u1EF9]/i.test(cleanSub);
  const hasVowels = /[aeiouyáàảãạâấầẩẫậăắằẳẵặéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ]/i.test(cleanSub);
  const hasLongConsonantCluster = /[bcdfghjklmnpqrstvwxz]{5,}/i.test(cleanSub);
  if ((hasLetters && cleanSub.length >= 3 && !hasVowels) || hasLongConsonantCluster) {
    return { isError: true, reason: "gibberish" };
  }

  if (!cleanTarget) return { isError: false };

  const normSub = removeVietnameseAccents(cleanSub);
  const normTarget = removeVietnameseAccents(cleanTarget);

  if (normSub === normTarget && cleanSub.toLowerCase() !== cleanTarget.toLowerCase()) {
    return { isError: true, reason: "diacritic" };
  }

  const dist = computeLevenshteinDistance(normSub, normTarget);
  if (dist > 0 && dist <= 2 && normTarget.length >= 4) {
    return { isError: true, reason: "distance" };
  }

  return { isError: false };
}

/**
 * Groups contestant answers for VCNV and Tăng Tốc commentary:
 * - Identical answers are merged
 * - No-answer submissions are grouped
 * - Typo/spelling errors are tagged so they are not vocalized literally
 */
export function groupContestantAnswers(
  submissions: ContestantSubmissionItem[],
  targetAnswer?: string
): GroupedAnswerItem[] {
  const groups: Map<string, GroupedAnswerItem> = new Map();

  for (const item of submissions) {
    const raw = (item.answer || "").trim();
    const cleanName = getContestantSpokenName(item.name);
    const isNoAnswer = !raw || Boolean(item.noAnswer);

    if (isNoAnswer) {
      const key = "__NO_ANSWER__";
      if (!groups.has(key)) {
        groups.set(key, {
          normalizedAnswer: "",
          displayAnswer: "",
          contestantNames: [cleanName],
          isSpellingError: false,
          isNoAnswer: true,
          minMs: item.ms,
        });
      } else {
        groups.get(key)!.contestantNames.push(cleanName);
      }
      continue;
    }

    const spelling = detectSpellingError(raw, targetAnswer);
    if (spelling.isError) {
      const key = `__SPELLING_ERROR__:${cleanName}`;
      groups.set(key, {
        normalizedAnswer: raw.toLowerCase(),
        displayAnswer: raw,
        contestantNames: [cleanName],
        isSpellingError: true,
        isNoAnswer: false,
        minMs: item.ms,
      });
      continue;
    }

    const norm = raw.toLowerCase();
    if (!groups.has(norm)) {
      groups.set(norm, {
        normalizedAnswer: norm,
        displayAnswer: raw,
        contestantNames: [cleanName],
        isSpellingError: false,
        isNoAnswer: false,
        minMs: item.ms,
      });
    } else {
      const g = groups.get(norm)!;
      g.contestantNames.push(cleanName);
      if (item.ms != null && (g.minMs == null || item.ms < g.minMs)) {
        g.minMs = item.ms;
      }
    }
  }

  return Array.from(groups.values());
}

/**
 * Generates spoken commentary for grouped answers in VCNV and Tăng Tốc:
 * - "Cả 4 bạn cùng có đáp án là X."
 * - "Các bạn A, B cùng đáp án X."
 * - "Bạn C có đáp án là X."
 * - "Bạn D viết sai chính tả."
 * - "Bạn E không đưa ra câu trả lời."
 */
export function generateGroupedAnswerCommentary(
  groups: GroupedAnswerItem[],
  options?: { round?: string; totalContestants?: number }
): string {
  if (!groups || groups.length === 0) return "";
  const parts: string[] = [];
  const total = options?.totalContestants ?? 4;

  for (const g of groups) {
    if (g.isNoAnswer) {
      if (g.contestantNames.length === 1) {
        parts.push(`Bạn ${g.contestantNames[0]} không đưa ra câu trả lời.`);
      } else if (g.contestantNames.length === total) {
        parts.push(`Cả ${total} bạn đều không đưa ra câu trả lời.`);
      } else {
        parts.push(`Các bạn ${g.contestantNames.join(", ")} không đưa ra câu trả lời.`);
      }
    } else if (g.isSpellingError) {
      if (g.contestantNames.length === 1) {
        parts.push(`Bạn ${g.contestantNames[0]} viết sai chính tả.`);
      } else {
        parts.push(`Các bạn ${g.contestantNames.join(", ")} viết sai chính tả.`);
      }
    } else {
      const spokenAnswer = summarizeOlympiaAnswer(g.displayAnswer);
      if (g.contestantNames.length === total) {
        parts.push(`Cả ${total} bạn cùng có đáp án là ${spokenAnswer}.`);
      } else if (g.contestantNames.length > 1) {
        parts.push(`Các bạn ${g.contestantNames.join(", ")} cùng có đáp án là ${spokenAnswer}.`);
      } else {
        parts.push(`Bạn ${g.contestantNames[0]} có đáp án là ${spokenAnswer}.`);
      }
    }
  }

  return parts.join(" ");
}

/**
 * Generates Tăng Tốc speed commentary for special cases:
 * - Fast reaction time (< 1.5s)
 * - Identical response times between contestants
 */
export function generateTangTocTimeCallout(submissions: ContestantSubmissionItem[]): string | null {
  if (!submissions || submissions.length === 0) return null;
  const validSubs = submissions.filter((s) => s.ms != null && s.ms > 0 && !s.noAnswer && s.answer?.trim());
  if (validSubs.length === 0) return null;

  const callouts: string[] = [];

  // 1. Fast answers (< 1.5s)
  const fastSubs = validSubs.filter((s) => s.ms! < 1500);
  for (const fs of fastSubs) {
    const cleanName = getContestantSpokenName(fs.name);
    const secStr = (fs.ms! / 1000).toFixed(2);
    callouts.push(`Bạn ${cleanName} trả lời rất nhanh, chỉ ${secStr} giây!`);
  }

  // 2. Identical response times
  const timeBuckets: Map<number, string[]> = new Map();
  for (const s of validSubs) {
    const roundedTime = Math.round(s.ms! / 10) * 10;
    const cleanName = getContestantSpokenName(s.name);
    if (!timeBuckets.has(roundedTime)) {
      timeBuckets.set(roundedTime, [cleanName]);
    } else {
      timeBuckets.get(roundedTime)!.push(cleanName);
    }
  }

  for (const [timeMs, names] of timeBuckets.entries()) {
    if (names.length >= 2) {
      const secStr = (timeMs / 1000).toFixed(2);
      if (names.length === 2) {
        callouts.push(`Hai bạn ${names[0]} và ${names[1]} có cùng thời gian trả lời là ${secStr} giây!`);
      } else {
        callouts.push(`Các bạn ${names.join(", ")} có cùng thời gian trả lời là ${secStr} giây!`);
      }
    }
  }

  if (callouts.length === 0) return null;
  return callouts.join(" ");
}

/**
 * VCNV CNV buzzer sequence announcement in order:
 */
export function generateCnvBellsAnnouncement(contestantNames: string[]): string {
  if (!contestantNames || contestantNames.length === 0) return "";
  const cleanNames = contestantNames.map(getContestantSpokenName);
  if (cleanNames.length === 1) {
    return `Tín hiệu chuông xin trả lời Chướng ngại vật từ bạn ${cleanNames[0]}.`;
  }
  return `Tín hiệu chuông xin trả lời Chướng ngại vật từ bạn ${cleanNames[0]}, tiếp theo là ${cleanNames.slice(1).join(", ")}.`;
}

export function speakCnvBells(contestantNames: string[], options?: SpeakTTSOptions): void {
  const text = generateCnvBellsAnnouncement(contestantNames);
  if (!text) return;
  speakOlympiaTTS(text, {
    ...options,
    segment: "cnv_bell",
    role: options?.role || (options?.rowIdx !== undefined ? undefined : "ngoc_huy"),
  });
}

/**
 * Spoken line for CNV correct or incorrect:
 */
export function formatCnvVerdictSpoken(
  isCorrect: boolean,
  contestantName: string,
  keyword?: string
): string {
  const cleanName = getContestantSpokenName(contestantName);
  if (isCorrect) {
    const kw = keyword ? summarizeOlympiaAnswer(keyword) : "";
    return `Chúc mừng bạn ${cleanName} đã trả lời chính xác Chướng ngại vật! ${kw ? `Từ khóa là: ${kw}!` : ""}`.trim();
  }
  return `Rất tiếc câu trả lời chưa chính xác. Bạn ${cleanName} mất quyền chơi phần thi Vượt chướng ngại vật. Các bạn còn lại tiếp tục phần thi.`;
}

export function speakVcnvCorrect(
  contestantName: string,
  keyword: string,
  onEnd?: () => void,
  options?: SpeakTTSOptions
): void {
  const text = formatCnvVerdictSpoken(true, contestantName, keyword);
  speakOlympiaTTS(text, {
    ...options,
    segment: "cnv_congratulate",
    role: options?.role || "khanh_vy",
    onEnd,
  });
}

export function speakVcnvElimination(
  contestantName: string,
  onEnd?: () => void,
  options?: SpeakTTSOptions
): void {
  const text = formatCnvVerdictSpoken(false, contestantName);
  speakOlympiaTTS(text, {
    ...options,
    segment: "cnv_elimination",
    role: options?.role || "khanh_vy",
    onEnd,
  });
}

/**
 * Về Đích steal invitation soundboard trigger: 📢 "Thoại: Mời các bạn còn lại"
 */
export function speakHostStealCall(options?: SpeakTTSOptions): void {
  const lines = [
    "Xin mời các bạn còn lại giành quyền trả lời!",
    "Mời các bạn còn lại!",
  ];
  const text = lines[Math.floor(Math.random() * lines.length)];
  speakOlympiaTTS(text, {
    ...options,
    segment: "steal_callout",
    role: options?.role || "khanh_vy",
    round: "veDich",
  });
}

export const VE_DICH_DRAMATIC_STEAL_DELAY_MS = 2500; // 2.5s (in 2.0s - 3.0s range)

let dramaticStealTimer: any = null;

/**
 * Schedules a dramatic 2.0s - 3.0s delay before calling the contestant who buzzed to steal in Về Đích
 */
export function scheduleDramaticStealCall(
  stealerName: string,
  options?: {
    dramaticDelayMs?: number;
    isConsecutive?: boolean;
    role?: MCRole;
    season?: string;
    onEnd?: () => void;
  }
): void {
  if (dramaticStealTimer) {
    clearTimeout(dramaticStealTimer);
    dramaticStealTimer = null;
  }

  const delayMs = options?.dramaticDelayMs ?? VE_DICH_DRAMATIC_STEAL_DELAY_MS;
  const isConsecutive =
    options?.isConsecutive !== undefined
      ? options.isConsecutive
      : lastBuzzedContestant === stealerName;
  lastBuzzedContestant = stealerName;

  dramaticStealTimer = setTimeout(() => {
    dramaticStealTimer = null;
    const callout = generateBuzzerCallout(stealerName, isConsecutive);
    speakOlympiaTTS(callout, {
      role: options?.role || "ngoc_huy",
      segment: "steal_callout",
      season: options?.season,
      round: "veDich",
      onEnd: options?.onEnd,
    });
  }, delayMs);
}

export function cancelDramaticStealCall(): void {
  if (dramaticStealTimer) {
    clearTimeout(dramaticStealTimer);
    dramaticStealTimer = null;
  }
}
