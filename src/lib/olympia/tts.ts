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
export type TTSSegment = "intro_greeting" | "round_intro" | "question" | "result";

export interface SpeakTTSOptions {
  role?: MCRole;
  season?: string;
  segment?: TTSSegment;
  seatId?: number;
  round?: string;
  onEnd?: () => void;
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
 * Resolves active MC role based on round, seat, and segment:
 * - Intro greeting: Khánh Vy
 * - Round intro:
 *     * Khởi động: Ngọc Huy
 *     * VCNV: Khánh Vy
 *     * Tăng tốc: Ngọc Huy
 *     * Về đích: Khánh Vy
 *     * Câu hỏi phụ: Ngọc Huy
 * - Questions:
 *     * Khởi động solo: Khánh Vy (seats 0, 2) / Ngọc Huy (seats 1, 3, shared)
 *     * VCNV: Khánh Vy
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

  if (segment === "intro_greeting") return "khanh_vy";
  if (segment === "round_intro") {
    if (round === "vcnv" || round === "veDich") return "khanh_vy";
    return "ngoc_huy";
  }
  if (segment === "result") {
    if (round === "vcnv" || round === "veDich") return "khanh_vy";
    return "ngoc_huy";
  }

  // Question segment
  if (round === "vcnv") return "khanh_vy";
  if (round === "tangToc" || round === "veDich" || round === "cauHoiPhu") return "ngoc_huy";
  if (round === "khoiDong") {
    // Alternate by seat: seats 0 & 2 female (Khánh Vy), seats 1 & 3 male (Ngọc Huy)
    return seatId % 2 === 0 ? "khanh_vy" : "ngoc_huy";
  }
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

  if (isCorrect) {
    speakOlympiaTTS("Chính xác!", {
      ...options,
      segment: "result",
      role: options?.role || "khanh_vy",
    });
  } else if (answer) {
    const summary = summarizeOlympiaAnswer(answer);
    if (summary) {
      speakOlympiaTTS(`Đáp án chính xác là: ${summary}`, {
        ...options,
        segment: "result",
        role: options?.role || "ngoc_huy",
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
