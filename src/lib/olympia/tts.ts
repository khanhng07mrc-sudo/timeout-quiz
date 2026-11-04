/**
 * Olympia Text-to-Speech (TTS) Engine
 * Normalizes Vietnamese question text and uses Web Speech API (vi-VN)
 * to automatically read questions aloud on display and host console.
 */

export function normalizeVietnameseTTS(rawText: string): string {
  if (!rawText) return "";
  let t = rawText;
  // Remove markdown formatting
  t = t.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1");
  // Remove parenthetical stage cues or points: (10 điểm), (5 chữ cái), etc.
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
  t = t.replace(/\bO26\b/gi, "Ô hai sáu");
  t = t.replace(/\bkm\/h\b/gi, "ki lô mét một giờ");
  t = t.replace(/\bm\/s\b/gi, "mét một giây");
  t = t.replace(/\b°C\b/gi, "độ xê");
  t = t.replace(/\b%\b/gi, " phần trăm");
  return t.trim();
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

export function cancelTTS(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch {}
}

export function speakTTS(text: string, onEnd?: () => void): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  if (!ttsEnabled) return;

  cancelTTS();
  const clean = normalizeVietnameseTTS(text);
  if (!clean) return;

  try {
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = "vi-VN";
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find(
      (v) => v.lang.startsWith("vi") || v.lang === "vi-VN" || v.lang === "vi_VN"
    );
    if (viVoice) utterance.voice = viVoice;

    utterance.onend = () => {
      onEnd?.();
    };
    utterance.onerror = () => {};

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn("[Olympia TTS] Error speaking:", err);
  }
}
