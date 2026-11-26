import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type WebSocketType from "ws";
import type {
  McVoiceCloneConfig,
  McVoiceCloneProvider,
  SavedVoiceProfile,
} from "./types";

export type TtsRole = "khanh_vy" | "ngoc_huy";
export type TtsLang = "vi" | "en";
export type TtsLangInput = TtsLang | "auto";
export type TtsAudioContentType = "audio/mpeg" | "audio/wav";

export const DEFAULT_SERVER_TTS_RATE = 1.20;
export const MIN_SERVER_TTS_RATE = 0.5;
export const MAX_SERVER_TTS_RATE = 2.0;

export const CLONE_PROVIDERS: readonly McVoiceCloneProvider[] = [
  "local_profile",
  "elevenlabs",
  "fish_audio",
  "custom_http",
];

export const VOICES_UPLOAD_DIR = path.resolve(
  process.cwd(),
  "public",
  "uploads",
  "olympia-voices"
);

export interface SynthesizeTtsInput {
  text: string;
  role?: TtsRole;
  lang?: TtsLangInput;
  rate?: number;
  pitch?: number | string;
  voice?: string;
  clone?: McVoiceCloneConfig;
}

export type TtsEngine =
  | "edge-neural"
  | "google-translate-tts"
  | "google-translate-tts-dsp"
  | "voice-clone-local_profile"
  | "voice-clone-elevenlabs"
  | "voice-clone-fish_audio"
  | "voice-clone-custom_http";

export interface SynthesizeTtsResult {
  audio: Buffer;
  voice: string;
  role: TtsRole;
  lang: TtsLang;
  rateStr: string;
  pitch: string;
  cacheHit: boolean;
  engine?: TtsEngine;
  contentType?: TtsAudioContentType;
  cloneUsed?: boolean;
  fallbackReason?: string;
}

export interface SynthesizeTtsStreamResult {
  stream: ReadableStream<Uint8Array>;
  audio?: Buffer;
  voice: string;
  role: TtsRole;
  lang: TtsLang;
  rateStr: string;
  pitch: string;
  cacheHit: boolean;
  engine?: TtsEngine;
  contentType?: TtsAudioContentType;
  cloneUsed?: boolean;
  fallbackReason?: string;
}

export class TtsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TtsValidationError";
  }
}

export class TtsUpstreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TtsUpstreamError";
  }
}

export const EDGE_TTS_VOICES: Record<TtsRole, Record<TtsLang, string>> = {
  khanh_vy: {
    vi: "vi-VN-HoaiMyNeural",
    en: "en-US-JennyNeural",
  },
  ngoc_huy: {
    vi: "vi-VN-NamMinhNeural",
    en: "en-US-AndrewNeural",
  },
};

export const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
export const CHROMIUM_FULL_VERSION = "143.0.3650.75";
export const SEC_MS_GEC_VERSION = `2-${CHROMIUM_FULL_VERSION}`;
const WSS_BASE_URL =
  "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1";
const OUTPUT_FORMAT = "audio-24khz-48kbitrate-mono-mp3";
const EDGE_ORIGIN = "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold";
const EDGE_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0";

const MAX_TEXT_LENGTH = 2000;
const WS_TIMEOUT_MS = 2400;
const FIRST_AUDIO_STALL_MS = 1300;
const HANDSHAKE_TIMEOUT_MS = 1100;
const MAX_CONCURRENT_WS = 8;
const EDGE_DEGRADED_COOLDOWN_MS = 5 * 60 * 1000;
const GOOGLE_TTS_MAX_CHARS = 175;
const GOOGLE_TTS_TIMEOUT_MS = 2200;
const MAX_CONCURRENT_FFMPEG = 2;
const FFMPEG_DSP_TIMEOUT_MS = 4500;
const FFMPEG_PROBE_TIMEOUT_MS = 1500;
const CLONE_FETCH_TIMEOUT_MS = 4500;
const MAX_VOICE_SAMPLE_READ_BYTES = 15 * 1024 * 1024;

let edgeDegradedUntil = 0;
let edgeProbeInFlight: Promise<void> | null = null;
let ffmpegAvailabilityOverride: boolean | null = null;
let cachedFfmpegAvailable: boolean | null = null;
let cachedFfmpegPath: string | null = null;

const MAX_CACHE_ENTRIES = 200;
const MAX_CACHE_BYTES = 24 * 1024 * 1024;
const MAX_SINGLE_CACHE_BYTES = 2 * 1024 * 1024;

const WIN_EPOCH_SEC = BigInt(11644473600);
const TICKS_INTERVAL_SEC = BigInt(300);
const TICKS_PER_SEC = BigInt(10_000_000);
const U32_MASK = 0xffffffff;

const SHA256_INITIAL: readonly number[] = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
  0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
];

const SHA256_STATE: readonly number[] = [
  0xfd9fbea2, 0x91243ce7, 0xbe499094, 0xcd2e1e0a,
  0x6c006f49, 0x04bd35ab, 0xfeb0a7e4, 0x03effbd2,
];

const SHA256_SCHEDULE: readonly number[] = [
  0xeb24bf9e, 0x1558691f, 0xa0c09ee2, 0x0cfa32ba,
  0xa622ee8c, 0xd1dd9491, 0xc0dd25a0, 0xf9e70ab6,
  0xf0c31573, 0x7058ce4e, 0x7188e606, 0x00e5ab33,
  0xd258b060, 0x72766564,
];

const SHA256_ROUND_CONSTANTS: readonly number[] = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

const SHA256_ADJUSTMENT = 0xc9dc06a7;
const SHA256_BLOCK_CONSTANTS: readonly number[] = [
  ...SHA256_ROUND_CONSTANTS.slice(0, 14),
  SHA256_ADJUSTMENT,
  ...SHA256_ROUND_CONSTANTS.slice(15),
];
const SHA256_SIGMA0_ADJUSTMENT = 0x059c0b80;
const SHA256_SIGMA1_ADJUSTMENT = 0x000b92c0;

const CS64_COEFFICIENTS: readonly [number, number][] = [
  [0xe82e91b1, 0xb32700d0],
  [0x44de24c6, 0x88dff51d],
  [0x3beb65bc, 0x29514038],
  [0xc89c5933, 0xb328cbdf],
  [0x8d1ec211, 0xd405b4d5],
  [0x314ef5d5, 0x26e55f3c],
  [0xe92491b1, 0x607801c6],
  [0xf0a5b9d5, 0x82b2c1fb],
  [0x06064cf3, 0xfa51a3da],
  [0xda79fa60, 0x207cc464],
  [0xbed20560, 0x3c3c74f3],
  [0x89f9c9f8, 0xd2d14b61],
  [0x35fa38c6, 0xbb04a2c1],
  [0xcb49e3c6, 0xc5626167],
];
const CS64_FACTOR = 0x82893933;
const CS64_ADJUSTMENT0 = 0xf2f90b1a;
const CS64_ADJUSTMENT1 = 0x0b1a0000;

let clockSkewSeconds = 0;

function rotr32(value: number, bits: number): number {
  const v = value >>> 0;
  return ((v >>> bits) | (v << (32 - bits))) >>> 0;
}

function rol16(value: number): number {
  const v = value >>> 0;
  return ((v << 16) | (v >>> 16)) >>> 0;
}

function sigma0(value: number): number {
  const v = value >>> 0;
  return (rotr32(v, 7) ^ rotr32(v, 18) ^ (v >>> 3)) >>> 0;
}

function sigma1(value: number): number {
  const v = value >>> 0;
  return (rotr32(v, 17) ^ rotr32(v, 19) ^ (v >>> 10)) >>> 0;
}

function sha256Rounds(state: readonly number[], words: number[], firstRound = 0): number[] {
  let [a, b, c, d, e, f, g, h] = state.map((x) => x >>> 0);
  const constants = firstRound === 14 ? SHA256_BLOCK_CONSTANTS : SHA256_ROUND_CONSTANTS;
  for (let i = firstRound; i < 64; i++) {
    const s1 = (rotr32(e, 6) ^ rotr32(e, 11) ^ rotr32(e, 25)) >>> 0;
    const ch = (g ^ (e & (f ^ g))) >>> 0;
    const t1 = (h + s1 + ch + constants[i] + words[i]) >>> 0;
    const s0 = (rotr32(a, 2) ^ rotr32(a, 13) ^ rotr32(a, 22)) >>> 0;
    const maj = ((a & b) | (c & (a | b))) >>> 0;
    const t2 = (s0 + maj) >>> 0;
    h = g;
    g = f;
    f = e;
    e = (d + t1) >>> 0;
    d = c;
    c = b;
    b = a;
    a = (t1 + t2) >>> 0;
  }
  return [a, b, c, d, e, f, g, h];
}

function expandSha256Schedule(words: number[], firstWord = 16): void {
  for (let i = firstWord; i < 64; i++) {
    const s1 = sigma1(words[i - 2]);
    const s0 = sigma0(words[i - 15]);
    words[i] = (s1 + words[i - 7] + s0 + words[i - 16]) >>> 0;
  }
}

function sha256Init(head7: Buffer): number[] {
  const words = new Array<number>(64).fill(0);
  words[14] = ((head7[0] << 16) | (head7[1] << 8) | head7[2]) >>> 0;
  words[15] = head7.readUInt32BE(3);
  for (let i = 16; i < 30; i++) {
    let value = SHA256_SCHEDULE[i - 16];
    if (i - 2 >= 14) {
      const s1 = sigma1(words[i - 2]);
      value = (value + (i === 16 ? (s1 ^ SHA256_SIGMA1_ADJUSTMENT) >>> 0 : s1)) >>> 0;
    }
    if (i - 7 >= 14) {
      value = (value + words[i - 7]) >>> 0;
    }
    if (i - 15 >= 14) {
      const s0 = sigma0(words[i - 15]);
      value = (value + (i === 29 ? (s0 ^ SHA256_SIGMA0_ADJUSTMENT) >>> 0 : s0)) >>> 0;
    }
    words[i] = value >>> 0;
  }
  words[30] =
    (sigma1(words[28]) +
      words[23] +
      sigma0(words[15]) +
      words[14] +
      SHA256_ADJUSTMENT -
      SHA256_ROUND_CONSTANTS[14]) >>>
    0;
  expandSha256Schedule(words, 31);
  const working = sha256Rounds(SHA256_STATE, words, 14);
  return SHA256_INITIAL.map((x, idx) => (x + working[idx]) >>> 0);
}

function sha256DigestV2(data: Buffer): Buffer {
  if (data.length < 7) {
    throw new Error("Token data must contain at least 7 bytes");
  }
  const length = 57 + data.length;
  const zeroPadLen = (((55 - length) % 64) + 64) % 64;
  const tail = data.subarray(7);
  const padded = Buffer.allocUnsafe(tail.length + 1 + zeroPadLen + 8);
  tail.copy(padded, 0);
  padded[tail.length] = 0x80;
  padded.fill(0, tail.length + 1, tail.length + 1 + zeroPadLen);
  padded.writeBigUInt64BE(BigInt(length) * BigInt(8), padded.length - 8);

  let state = sha256Init(data.subarray(0, 7));
  const words = new Array<number>(64).fill(0);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) {
      words[i] = padded.readUInt32BE(offset + i * 4);
    }
    expandSha256Schedule(words, 16);
    const working = sha256Rounds(state, words, 0);
    state = state.map((x, idx) => (x + working[idx]) >>> 0);
  }
  const out = Buffer.allocUnsafe(32);
  for (let i = 0; i < 8; i++) {
    out.writeUInt32BE(state[i] >>> 0, i * 4);
  }
  return out;
}

function wordsLe4Even(data: Buffer): number[] {
  const padLen = (4 - (data.length % 4)) % 4;
  const padded = padLen === 0 ? data : Buffer.concat([data, Buffer.alloc(padLen)]);
  if (padded.length === 0) return [];
  const words: number[] = [];
  for (let i = 0; i < padded.length; i += 4) {
    words.push(padded.readUInt32LE(i));
  }
  if (words.length % 2 === 1) {
    words.push(0);
  }
  return words;
}

function cs64Digest(data: Buffer, digest: Buffer): [number, number] {
  const keyA = (digest.readUInt32LE(0) | 1) >>> 0;
  const keyB = (digest.readUInt32LE(4) | 1) >>> 0;
  const factorA = Math.imul(keyA, CS64_FACTOR) >>> 0;
  const factorB = Math.imul(keyB, CS64_FACTOR) >>> 0;

  const terms: number[] = [];
  const offsets: number[] = [];

  for (let i = 0; i < CS64_COEFFICIENTS.length; i++) {
    const [coeff, off] = CS64_COEFFICIENTS[i];
    terms.push(Math.imul(coeff, i % 2 === 0 ? factorA : factorB) >>> 0);
    offsets.push(off >>> 0);
  }

  const words = wordsLe4Even(Buffer.concat([Buffer.from([0]), data]));
  for (let i = 0; i < words.length; i++) {
    const word = words[i] >>> 0;
    let term = Math.imul(word, i % 2 === 0 ? keyA : keyB) >>> 0;
    let offset = Math.imul(rol16(word), i % 2 === 0 ? 0xef0569fb : 0xc31713db) >>> 0;
    if (i === 0) {
      term = (term + (Math.imul(CS64_ADJUSTMENT0, factorA) >>> 0)) >>> 0;
      offset = (offset + CS64_ADJUSTMENT1) >>> 0;
    }
    terms.push(term & U32_MASK);
    offsets.push(offset & U32_MASK);
  }

  let swapAcc = 0;
  let swapLast = 0;
  let state = 0;
  let acc = 0;

  for (let i = 0; i < terms.length; i += 2) {
    const x = terms[i];
    const y = terms[i + 1];

    let t = rol16((offsets[i] + x) >>> 0);
    let q = Math.imul(t, 0x76f50f34) >>> 0;
    swapAcc = (swapAcc + ((Math.imul(rol16(q), 0xc3efea97) + q) >>> 0)) >>> 0;

    t = rol16((offsets[i + 1] + y) >>> 0);
    q = Math.imul(t, 0x1881ce3c) >>> 0;
    swapLast = (Math.imul(rol16(q), 0x35bd1ec9) + q) >>> 0;
    swapAcc = (swapAcc + swapLast) >>> 0;

    state = (Math.imul(state, keyA) + x) >>> 0;
    state = Math.imul(rol16(state), 0xcf98b111) >>> 0;
    state = Math.imul(rol16(state), 0x87085b9f) >>> 0;
    state = Math.imul(rol16(state), 0x12ceb96d) >>> 0;
    state = Math.imul(rol16(state), 0x257e1d83) >>> 0;
    acc = (acc + state) >>> 0;

    t = (Math.imul(state, keyB) + y) >>> 0;
    t = Math.imul(rol16(t), 0xa27416f5) >>> 0;
    t = Math.imul(rol16(t), 0xd38396ff) >>> 0;
    const inner = Math.imul(rol16(t), 0x7c932b89) >>> 0;
    state = Math.imul(rol16(inner), 0xbfa49f69) >>> 0;
    acc = (acc + state) >>> 0;
  }

  return [(swapLast ^ state) >>> 0, (swapAcc ^ acc) >>> 0];
}

export function generateSecMsGecV2(unixTimestampSec?: number): string {
  const effectiveSec =
    typeof unixTimestampSec === "number" && Number.isFinite(unixTimestampSec)
      ? unixTimestampSec
      : Date.now() / 1000 + clockSkewSeconds;
  let ticks = BigInt(Math.floor(effectiveSec)) + WIN_EPOCH_SEC;
  ticks -= ticks % TICKS_INTERVAL_SEC;
  ticks *= TICKS_PER_SEC;
  const input = Buffer.from(`${ticks.toString()}${TRUSTED_CLIENT_TOKEN}`, "ascii");
  const digest = sha256DigestV2(input);
  const [cs0, cs1] = cs64Digest(input, digest);
  const csBuf = Buffer.allocUnsafe(8);
  csBuf.writeUInt32LE(cs0, 0);
  csBuf.writeUInt32LE(cs1, 4);
  return `${csBuf.toString("hex").toUpperCase()}-${digest.toString("hex").toUpperCase()}`;
}

export function getClockSkewSeconds(): number {
  return clockSkewSeconds;
}

export function resetClockSkewSeconds(): void {
  clockSkewSeconds = 0;
}

const VIETNAMESE_DIACRITIC_RE =
  /[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/i;

const UNACCENTED_VI_KEYWORDS_RE =
  /\b(?:xin moi|chinh xac|dap an|cau hoi|khoi dong|ve dich|tang toc|chuong ngai vat|thi sinh|diem|chao mung|ket thuc|vong nguyet que)\b/i;

const OLYMPIA_ACRONYM_RE =
  /^(?:VTV|VTV3|THPT|THCS|CNV|VCNV|MC|TS\d+|O\d{2}(?:-\d{2})?|PTNK|KHTN|KHXH|XHNV|BKHN|CNTT|UBND|TPHCM|TP|VN|TS|ĐTV|DTV|NBTV|QRT|ĐH|DH|CĐ|CD|ĐHQG|ĐHBK|ĐHSP|HBC|LHP|NTMK|HTV|THVL|BTV|PTV|GDP|GNP|WTO|UNESCO|ASEAN|WHO|DNA|RNA|ATP|CO2|H2O|CH4|SO2|HTTP|HTTPS|HTML|CSS|CPU|RAM|URL|USB)$/i;

export function detectTtsLanguage(text: string): TtsLang {
  const trimmed = text.trim();
  if (!trimmed) return "vi";
  if (VIETNAMESE_DIACRITIC_RE.test(trimmed)) return "vi";
  if (UNACCENTED_VI_KEYWORDS_RE.test(trimmed)) return "vi";

  // Strip dotted initial sequences (e.g. N.V.A, H.A, T.S, Đ.T.M, TS.A, TS.) before scanning English candidate words
  const withoutDottedInitials = trimmed.replace(
    /(?<![\p{L}\p{N}])(?:[A-ZĂÂĐÊÔƠƯ]{1,2}\.)+[A-ZĂÂĐÊÔƠƯ]?\.?(?![\p{L}\p{N}])/gu,
    " "
  );

  const words = withoutDottedInitials.match(/[A-Za-z0-9-]+/g) || [];
  const englishCandidateWords = words.filter(
    (w) =>
      /[A-Za-z]{2,}/.test(w) &&
      !OLYMPIA_ACRONYM_RE.test(w) &&
      !/^[BCDFGHJKLMNPQRSTVWXZ]{2,6}$/.test(w)
  );
  if (englishCandidateWords.length > 0) {
    return "en";
  }
  return "vi";
}

export function stripControlChars(text: string): string {
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ");
}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function normalizeTtsRate(rate?: number | null): number {
  if (rate === undefined || rate === null) {
    return DEFAULT_SERVER_TTS_RATE;
  }
  if (typeof rate !== "number" || !Number.isFinite(rate)) {
    throw new TtsValidationError("rate must be a finite number");
  }
  return Math.min(MAX_SERVER_TTS_RATE, Math.max(MIN_SERVER_TTS_RATE, rate));
}

export function mapRateToProsody(rate?: number | null): string {
  const clamped = normalizeTtsRate(rate);
  const pct = Math.round((clamped - 1) * 100);
  return `${pct >= 0 ? "+" : ""}${pct}%`;
}

export function normalizePitch(pitch?: number | string): string {
  if (pitch === undefined || pitch === null || pitch === "") return "+0Hz";
  if (typeof pitch === "number") {
    if (!Number.isFinite(pitch)) {
      throw new TtsValidationError("pitch must be a finite number");
    }
    const pct = Math.round((pitch - 1) * 100);
    return `${pct >= 0 ? "+" : ""}${pct}%`;
  }
  if (typeof pitch === "string") {
    const trimmed = pitch.trim();
    if (!trimmed) return "+0Hz";
    const parsedNum = Number(trimmed);
    if (!isNaN(parsedNum) && !/[a-zA-Z%]/.test(trimmed)) {
      const pct = Math.round((parsedNum - 1) * 100);
      return `${pct >= 0 ? "+" : ""}${pct}%`;
    }
    if (!/^[+-]?\d{1,3}(?:Hz|st|%)$/i.test(trimmed)) {
      throw new TtsValidationError("pitch must match /^[+-]?\\d{1,3}(Hz|st|%)$/i or be a relative float");
    }
    return /^[+-]/.test(trimmed) ? trimmed : `+${trimmed}`;
  }
  throw new TtsValidationError("pitch must be a number or string");
}

function normalizeCloneConfig(raw: unknown): McVoiceCloneConfig | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const c = raw as Record<string, unknown>;
  if (c.enabled !== true) return undefined;
  const provider =
    typeof c.provider === "string"
      ? (c.provider as McVoiceCloneProvider)
      : ("local_profile" as McVoiceCloneProvider);
  return {
    enabled: true,
    provider,
    profileId: typeof c.profileId === "string" ? c.profileId.trim() : undefined,
    voiceId: typeof c.voiceId === "string" ? c.voiceId.trim() : undefined,
    sampleUrl: typeof c.sampleUrl === "string" ? c.sampleUrl.trim() : undefined,
    sampleName: typeof c.sampleName === "string" ? c.sampleName.trim() : undefined,
    endpointUrl: typeof c.endpointUrl === "string" ? c.endpointUrl.trim() : undefined,
    apiKey: typeof c.apiKey === "string" ? c.apiKey.trim() : undefined,
    targetPitchHz:
      typeof c.targetPitchHz === "number" && Number.isFinite(c.targetPitchHz)
        ? c.targetPitchHz
        : undefined,
    pitchRatio:
      typeof c.pitchRatio === "number" && Number.isFinite(c.pitchRatio)
        ? c.pitchRatio
        : undefined,
    updatedAt:
      typeof c.updatedAt === "number" && Number.isFinite(c.updatedAt)
        ? c.updatedAt
        : undefined,
  };
}

export interface NormalizedTtsInput {
  cleanText: string;
  role: TtsRole;
  lang: TtsLang;
  voice: string;
  rate: number;
  rateStr: string;
  pitch: string;
  clone?: McVoiceCloneConfig;
}

export function validateAndNormalizeTtsInput(input: unknown): NormalizedTtsInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TtsValidationError("Request body must be a JSON object");
  }
  const obj = input as Record<string, unknown>;

  if (typeof obj.text !== "string") {
    throw new TtsValidationError("text must be a string");
  }
  const sanitized = stripControlChars(obj.text).trim();
  if (!sanitized) {
    throw new TtsValidationError("text must be a non-empty string");
  }
  if (obj.text.length > MAX_TEXT_LENGTH || sanitized.length > MAX_TEXT_LENGTH) {
    throw new TtsValidationError(`text exceeds maximum length of ${MAX_TEXT_LENGTH} characters`);
  }

  let role: TtsRole;
  if (obj.role === undefined) {
    role = "khanh_vy";
  } else if (obj.role === "khanh_vy" || obj.role === "ngoc_huy") {
    role = obj.role;
  } else {
    throw new TtsValidationError('role must be "khanh_vy" or "ngoc_huy"');
  }

  let resolvedLang: TtsLang;
  if (obj.lang === undefined || obj.lang === "auto") {
    resolvedLang = detectTtsLanguage(sanitized);
  } else if (obj.lang === "vi" || obj.lang === "en") {
    resolvedLang = obj.lang;
  } else {
    throw new TtsValidationError('lang must be "vi", "en", or "auto"');
  }

  const rate = normalizeTtsRate(obj.rate as number | null | undefined);
  const rateStr = mapRateToProsody(rate);
  const pitch = normalizePitch(obj.pitch as number | string | undefined);
  const clone = normalizeCloneConfig(obj.clone);

  let voice: string;
  if (obj.voice !== undefined && obj.voice !== null && obj.voice !== "") {
    if (typeof obj.voice !== "string" || !/^[a-zA-Z0-9_-]+$/.test(obj.voice)) {
      throw new TtsValidationError('voice must match /^[a-zA-Z0-9_-]+$/');
    }
    voice = obj.voice;
  } else {
    voice = EDGE_TTS_VOICES[role][resolvedLang];
  }

  return {
    cleanText: sanitized,
    role,
    lang: resolvedLang,
    voice,
    rate,
    rateStr,
    pitch,
    clone,
  };
}

export function buildEdgeSsml(
  cleanText: string,
  voice: string,
  rateStr: string,
  pitch: string,
  lang?: TtsLang
): string {
  const escapedText = escapeXml(cleanText);
  const resolvedXmlLang =
    lang === "vi" || (lang === undefined && /^vi-/i.test(voice)) ? "vi-VN" : "en-US";
  return (
    `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${resolvedXmlLang}'>` +
    `<voice name='${voice}'>` +
    `<prosody pitch='${pitch}' rate='${rateStr}' volume='+0%'>${escapedText}</prosody>` +
    `</voice></speak>`
  );
}

export function isValidMp3Buffer(buf: Buffer): boolean {
  if (!buf || buf.length < 4) return false;
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) {
    return true;
  }
  for (let i = 0; i <= Math.min(buf.length - 2, 64); i++) {
    if (buf[i] === 0xff && (buf[i + 1] & 0xe0) === 0xe0) {
      return true;
    }
  }
  return false;
}

export function detectAudioContentType(buf: Buffer): TtsAudioContentType | null {
  if (!buf || buf.length < 4) return null;
  if (
    buf.length >= 44 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x41 &&
    buf[10] === 0x56 &&
    buf[11] === 0x45
  ) {
    return "audio/wav";
  }
  if (isValidMp3Buffer(buf)) {
    return "audio/mpeg";
  }
  return null;
}

export function isValidAudioBuffer(buf: Buffer): boolean {
  return detectAudioContentType(buf) !== null;
}

export function stripId3Metadata(buf: Buffer): Buffer {
  if (!buf || buf.length === 0) return buf;
  let start = 0;
  while (
    start + 10 <= buf.length &&
    buf[start] === 0x49 &&
    buf[start + 1] === 0x44 &&
    buf[start + 2] === 0x33
  ) {
    const flags = buf[start + 5];
    const tagSize =
      ((buf[start + 6] & 0x7f) << 21) |
      ((buf[start + 7] & 0x7f) << 14) |
      ((buf[start + 8] & 0x7f) << 7) |
      (buf[start + 9] & 0x7f);
    const footerLen = (flags & 0x10) !== 0 ? 10 : 0;
    const nextStart = start + 10 + tagSize + footerLen;
    if (nextStart > buf.length || nextStart <= start) break;
    start = nextStart;
  }
  let end = buf.length;
  if (
    end - start >= 128 &&
    buf[end - 128] === 0x54 &&
    buf[end - 127] === 0x41 &&
    buf[end - 126] === 0x47
  ) {
    end -= 128;
  }
  return start === 0 && end === buf.length ? buf : buf.subarray(start, end);
}

export function buildCloneCacheKey(clone?: McVoiceCloneConfig): string {
  if (!clone || !clone.enabled) return "no-clone";
  const payload = JSON.stringify({
    p: clone.provider,
    pid: clone.profileId ?? "",
    vid: clone.voiceId ?? "",
    s: clone.sampleUrl ?? "",
    ep: clone.endpointUrl ?? "",
    hz: clone.targetPitchHz ?? null,
    pr: clone.pitchRatio ?? null,
    hk: Boolean(clone.apiKey),
  });
  return crypto.createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

export function buildTtsCacheKey(normalized: {
  role: TtsRole;
  voice: string;
  rateStr: string;
  pitch: string;
  cleanText: string;
  clone?: McVoiceCloneConfig;
}): string {
  const cloneKey = buildCloneCacheKey(normalized.clone);
  return `${normalized.role}|${normalized.voice}|${normalized.rateStr}|${normalized.pitch}|${cloneKey}|${normalized.cleanText}`;
}

export function sanitizeSecretText(
  message: string,
  secrets: Array<string | undefined> = []
): string {
  let out = String(message ?? "");
  for (const secret of secrets) {
    if (!secret) continue;
    const trimmed = secret.trim();
    if (!trimmed) continue;
    out = out.split(trimmed).join("[REDACTED]");
    const encoded = encodeURIComponent(trimmed);
    if (encoded && encoded !== trimmed) {
      out = out.split(encoded).join("[REDACTED]");
    }
  }
  out = out
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(/(xi-api-key|x-api-key|api[_-]?key)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]")
    .replace(/\bsk_[A-Za-z0-9_-]{6,}\b/g, "[REDACTED]")
    .replace(/[\r\n\u0000-\u001F\u007F]+/g, " ")
    .trim();
  return out.slice(0, 160);
}

class TtsLruCache {
  private readonly store = new Map<string, SynthesizeTtsResult>();
  private totalBytes = 0;

  get(key: string): SynthesizeTtsResult | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    this.store.delete(key);
    this.store.set(key, hit);
    return hit;
  }

  set(key: string, value: SynthesizeTtsResult): void {
    const size = value.audio.byteLength;
    if (size === 0 || size > MAX_SINGLE_CACHE_BYTES) return;

    const existing = this.store.get(key);
    if (existing) {
      this.totalBytes -= existing.audio.byteLength;
      this.store.delete(key);
    }

    while (
      this.store.size >= MAX_CACHE_ENTRIES ||
      this.totalBytes + size > MAX_CACHE_BYTES
    ) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey === undefined) break;
      const oldest = this.store.get(oldestKey);
      this.store.delete(oldestKey);
      if (oldest) {
        this.totalBytes -= oldest.audio.byteLength;
      }
    }

    this.store.set(key, value);
    this.totalBytes += size;
  }

  keys(): string[] {
    return Array.from(this.store.keys());
  }

  stats(): { entries: number; bytes: number; maxEntries: number; maxBytes: number } {
    return {
      entries: this.store.size,
      bytes: this.totalBytes,
      maxEntries: MAX_CACHE_ENTRIES,
      maxBytes: MAX_CACHE_BYTES,
    };
  }
}

const ttsCache = new TtsLruCache();
const inflightRequests = new Map<string, Promise<SynthesizeTtsResult>>();

let activeWsCount = 0;
const wsWaitQueue: Array<() => void> = [];

async function acquireWsSlot(): Promise<() => void> {
  if (activeWsCount >= MAX_CONCURRENT_WS) {
    await new Promise<void>((resolve) => {
      wsWaitQueue.push(resolve);
    });
  }
  activeWsCount++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeWsCount--;
    const next = wsWaitQueue.shift();
    if (next) next();
  };
}

async function withWsConcurrencyLimit<T>(fn: () => Promise<T>): Promise<T> {
  if (activeWsCount >= MAX_CONCURRENT_WS) {
    await new Promise<void>((resolve) => {
      wsWaitQueue.push(resolve);
    });
  }
  activeWsCount++;
  try {
    return await fn();
  } finally {
    activeWsCount--;
    const next = wsWaitQueue.shift();
    if (next) next();
  }
}

let cachedWsConstructor: typeof WebSocketType | null = null;

declare const __non_webpack_require__: NodeRequire | undefined;

function loadWebSocketConstructor(): typeof WebSocketType {
  if (cachedWsConstructor) return cachedWsConstructor;
  try {
    const req =
      typeof __non_webpack_require__ === "function"
        ? __non_webpack_require__
        : // eslint-disable-next-line no-eval
          (eval("require") as NodeRequire);
    const loaded = req("ws") as typeof WebSocketType & { default?: typeof WebSocketType };
    cachedWsConstructor = loaded.default ?? loaded;
    return cachedWsConstructor;
  } catch (err) {
    throw new TtsUpstreamError(
      `Cannot load WebSocket client for Edge TTS: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function edgeTimestampString(): string {
  const d = new Date();
  const wd = WEEKDAYS[d.getUTCDay()];
  const mo = MONTHS[d.getUTCMonth()];
  const day = pad2(d.getUTCDate());
  const yr = d.getUTCFullYear();
  const hh = pad2(d.getUTCHours());
  const mm = pad2(d.getUTCMinutes());
  const ss = pad2(d.getUTCSeconds());
  return `${wd} ${mo} ${day} ${yr} ${hh}:${mm}:${ss} GMT+0000 (Coordinated Universal Time)`;
}

function connectUuid(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

function generateMuid(): string {
  return crypto.randomBytes(16).toString("hex").toUpperCase();
}

function rawDataToBuffer(data: WebSocketType.RawData): Buffer {
  if (Buffer.isBuffer(data)) return data;
  if (Array.isArray(data)) return Buffer.concat(data);
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  return Buffer.from(String(data));
}

function synthesizeOnce(params: {
  cleanText: string;
  voice: string;
  lang: TtsLang;
  rateStr: string;
  pitch: string;
}): Promise<Buffer> {
  const WebSocketCtor = loadWebSocketConstructor();
  const connectionId = connectUuid();
  const requestId = connectUuid();
  const secMsGec = generateSecMsGecV2();
  const url =
    `${WSS_BASE_URL}?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}` +
    `&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}` +
    `&ConnectionId=${connectionId}`;

  const ssml = buildEdgeSsml(
    params.cleanText,
    params.voice,
    params.rateStr,
    params.pitch,
    params.lang
  );

  return new Promise<Buffer>((resolve, reject) => {
    let settled = false;
    const chunks: Buffer[] = [];
    let statusCode403 = false;

    const ws = new WebSocketCtor(url, {
      family: 4,
      perMessageDeflate: false,
      handshakeTimeout: HANDSHAKE_TIMEOUT_MS,
      headers: {
        Pragma: "no-cache",
        "Cache-Control": "no-cache",
        Origin: EDGE_ORIGIN,
        "User-Agent": EDGE_USER_AGENT,
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Accept-Language": "en-US,en;q=0.9",
        Cookie: `muid=${generateMuid()};`,
      },
    } as any);

    let firstAudioTimer: ReturnType<typeof setTimeout> | null = null;
    const cleanup = () => {
      clearTimeout(timer);
      if (firstAudioTimer) {
        clearTimeout(firstAudioTimer);
        firstAudioTimer = null;
      }
      ws.removeAllListeners();
    };

    const finishError = (err: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      try {
        ws.terminate();
      } catch {
        // ignore termination errors
      }
      reject(err);
    };

    const finishSuccess = () => {
      if (settled) return;
      settled = true;
      cleanup();
      try {
        ws.close();
      } catch {
        // ignore close errors
      }
      const audio = Buffer.concat(chunks);
      if (audio.byteLength === 0 || !isValidMp3Buffer(audio)) {
        reject(new TtsUpstreamError("Edge-TTS returned empty or invalid audio"));
        return;
      }
      resolve(audio);
    };

    const timer = setTimeout(() => {
      finishError(new TtsUpstreamError(`Edge-TTS WebSocket timed out after ${WS_TIMEOUT_MS}ms`));
    }, WS_TIMEOUT_MS);

    ws.on("unexpected-response", (_req, res) => {
      const status = res.statusCode ?? 0;
      if (status === 403) {
        statusCode403 = true;
        const dateHeader = res.headers?.date;
        if (typeof dateHeader === "string") {
          const parsedMs = Date.parse(dateHeader);
          if (Number.isFinite(parsedMs)) {
            const serverEpochSec = parsedMs / 1000;
            const clientEpochSec = Date.now() / 1000 + clockSkewSeconds;
            clockSkewSeconds += serverEpochSec - clientEpochSec;
          }
        }
      }
      res.resume();
      const err = new TtsUpstreamError(`Edge-TTS upstream HTTP ${status}`);
      (err as TtsUpstreamError & { statusCode?: number }).statusCode = statusCode403 ? 403 : status;
      finishError(err);
    });

    ws.on("open", () => {
      try {
        firstAudioTimer = setTimeout(() => {
          firstAudioTimer = null;
          if (!settled && chunks.length === 0) {
            finishError(new TtsUpstreamError(`Edge-TTS stalled without audio after ${FIRST_AUDIO_STALL_MS}ms`));
          }
        }, FIRST_AUDIO_STALL_MS);
        const ts = edgeTimestampString();
        const configMsg =
          `X-Timestamp:${ts}\r\n` +
          `Content-Type:application/json; charset=utf-8\r\n` +
          `Path:speech.config\r\n\r\n` +
          JSON.stringify({
            context: {
              synthesis: {
                audio: {
                  metadataoptions: {
                    sentenceBoundaryEnabled: "false",
                    wordBoundaryEnabled: "false",
                  },
                  outputFormat: OUTPUT_FORMAT,
                },
              },
            },
          }) +
          "\r\n";

        const ssmlMsg =
          `X-RequestId:${requestId}\r\n` +
          `Content-Type:application/ssml+xml\r\n` +
          `X-Timestamp:${ts}Z\r\n` +
          `Path:ssml\r\n\r\n` +
          ssml;

        ws.send(configMsg);
        ws.send(ssmlMsg);
      } catch (err) {
        finishError(
          new TtsUpstreamError(err instanceof Error ? err.message : "Failed to send Edge-TTS SSML")
        );
      }
    });

    ws.on("message", (raw: WebSocketType.RawData, isBinary: boolean) => {
      if (settled) return;
      if (!isBinary) {
        const text = rawDataToBuffer(raw).toString("utf8");
        if (text.includes("Path:turn.end")) {
          finishSuccess();
        }
        return;
      }

      const buf = rawDataToBuffer(raw);
      if (buf.length < 2) return;
      const headerLen = buf.readUInt16BE(0);
      if (2 + headerLen > buf.length) return;
      const headerText = buf.subarray(2, 2 + headerLen).toString("utf8");
      if (
        headerText.includes("Path:audio") &&
        headerText.includes("Content-Type:audio/mpeg")
      ) {
        const payload = buf.subarray(2 + headerLen);
        if (payload.byteLength > 0) {
          if (firstAudioTimer) {
            clearTimeout(firstAudioTimer);
            firstAudioTimer = null;
          }
          chunks.push(payload);
        }
      }
    });

    ws.on("error", (err) => {
      finishError(new TtsUpstreamError(err instanceof Error ? err.message : "Edge-TTS WS error"));
    });

    ws.on("close", (code) => {
      if (!settled) {
        if (chunks.length > 0) {
          finishSuccess();
        } else {
          const err = new TtsUpstreamError(`Edge-TTS connection closed early (${code})`);
          (err as TtsUpstreamError & { closeCode?: number }).closeCode = code;
          finishError(err);
        }
      }
    });
  });
}

export function splitTextForGoogleTts(
  text: string,
  maxChars: number = GOOGLE_TTS_MAX_CHARS
): string[] {
  const clean = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= maxChars) return [clean];

  const breakPieces: string[] = [];
  const sentences = clean.split(/(?<=[.!?…])\s+/);
  for (const s of sentences) {
    if (s.length <= maxChars) {
      breakPieces.push(s);
      continue;
    }
    const clauses = s.split(/(?<=[,;:])\s+/);
    for (const c of clauses) {
      if (c.length <= maxChars) {
        breakPieces.push(c);
        continue;
      }
      const words = c.split(/\s+/);
      let current = "";
      for (const word of words) {
        if (word.length > maxChars) {
          if (current) {
            breakPieces.push(current);
            current = "";
          }
          for (let idx = 0; idx < word.length; idx += maxChars) {
            breakPieces.push(word.slice(idx, idx + maxChars));
          }
          continue;
        }
        const candidate = current ? `${current} ${word}` : word;
        if (candidate.length <= maxChars) {
          current = candidate;
        } else {
          if (current) breakPieces.push(current);
          current = word;
        }
      }
      if (current) breakPieces.push(current);
    }
  }

  const merged: string[] = [];
  let buf = "";
  for (const piece of breakPieces) {
    if (!piece) continue;
    const candidate = buf ? `${buf} ${piece}` : piece;
    if (candidate.length <= maxChars) {
      buf = candidate;
    } else {
      if (buf) merged.push(buf);
      buf = piece;
    }
  }
  if (buf) merged.push(buf);
  return merged;
}

async function fetchGoogleTranslateChunk(chunk: string, lang: TtsLang): Promise<Buffer> {
  const tl = lang === "en" ? "en" : "vi";
  const url =
    `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=tw-ob` +
    `&tl=${tl}&q=${encodeURIComponent(chunk)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent": EDGE_USER_AGENT,
    },
    signal: AbortSignal.timeout(GOOGLE_TTS_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new TtsUpstreamError(`Google-TTS upstream HTTP ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength === 0 || !isValidMp3Buffer(buf)) {
    throw new TtsUpstreamError("Google-TTS returned empty or invalid audio");
  }
  return buf;
}

export async function synthesizeGoogleTranslateTts(params: {
  cleanText: string;
  lang: TtsLang;
}): Promise<Buffer> {
  const chunks = splitTextForGoogleTts(params.cleanText);
  if (chunks.length === 0) {
    throw new TtsValidationError("Text must not be empty");
  }
  const buffers = await Promise.all(
    chunks.map((chunk) => fetchGoogleTranslateChunk(chunk, params.lang))
  );
  return Buffer.concat(buffers);
}

function getFfmpegBin(): string {
  const custom = process.env.FFMPEG_PATH?.trim();
  return custom && custom.length > 0 ? custom : "ffmpeg";
}

export function setFfmpegAvailabilityForTesting(val: boolean | null): void {
  ffmpegAvailabilityOverride = val;
  cachedFfmpegAvailable = null;
  cachedFfmpegPath = null;
}

export function resetFfmpegAvailabilityForTesting(): void {
  setFfmpegAvailabilityForTesting(null);
}

export function forceEdgeDegradedForTesting(ms: number = EDGE_DEGRADED_COOLDOWN_MS): void {
  edgeDegradedUntil = Date.now() + ms;
}

export function getTtsCacheKeysForTesting(): string[] {
  return ttsCache.keys();
}

export async function isFfmpegDspAvailable(): Promise<boolean> {
  if (ffmpegAvailabilityOverride !== null) {
    return ffmpegAvailabilityOverride;
  }
  const bin = getFfmpegBin();
  if (cachedFfmpegAvailable !== null && cachedFfmpegPath === bin) {
    return cachedFfmpegAvailable;
  }
  const available = await new Promise<boolean>((resolve) => {
    let settled = false;
    const done = (val: boolean) => {
      if (settled) return;
      settled = true;
      resolve(val);
    };
    let child: ReturnType<typeof spawn> | null = null;
    try {
      child = spawn(bin, ["-version"], { stdio: ["ignore", "ignore", "ignore"] });
    } catch {
      done(false);
      return;
    }
    const timer = setTimeout(() => {
      try {
        child?.kill("SIGKILL");
      } catch {}
      done(false);
    }, FFMPEG_PROBE_TIMEOUT_MS);
    child.on("error", () => {
      clearTimeout(timer);
      done(false);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      done(code === 0);
    });
  });
  cachedFfmpegAvailable = available;
  cachedFfmpegPath = bin;
  return available;
}

export async function getTtsCapabilities(): Promise<{
  dspAvailable: boolean;
  cloneProviders: readonly McVoiceCloneProvider[];
}> {
  return {
    dspAvailable: await isFfmpegDspAvailable(),
    cloneProviders: CLONE_PROVIDERS,
  };
}

let activeFfmpegCount = 0;
const ffmpegWaitQueue: Array<() => void> = [];

async function withFfmpegConcurrencyLimit<T>(fn: () => Promise<T>): Promise<T> {
  if (activeFfmpegCount >= MAX_CONCURRENT_FFMPEG) {
    await new Promise<void>((resolve) => {
      ffmpegWaitQueue.push(resolve);
    });
  }
  activeFfmpegCount++;
  try {
    return await fn();
  } finally {
    activeFfmpegCount--;
    const next = ffmpegWaitQueue.shift();
    if (next) next();
  }
}

export function parsePitchMultiplier(pitchStr: string): number {
  const trimmed = String(pitchStr ?? "").trim();
  if (!trimmed || trimmed === "+0Hz" || trimmed === "+0%" || trimmed === "+0st") {
    return 1.0;
  }
  const pctMatch = /^([+-]?\d{1,3})%$/i.exec(trimmed);
  if (pctMatch) {
    const val = 1 + Number(pctMatch[1]) / 100;
    return Math.min(1.4, Math.max(0.7, val));
  }
  const stMatch = /^([+-]?\d{1,3})st$/i.exec(trimmed);
  if (stMatch) {
    const val = Math.pow(2, Number(stMatch[1]) / 12);
    return Math.min(1.4, Math.max(0.7, val));
  }
  const hzMatch = /^([+-]?\d{1,3})Hz$/i.exec(trimmed);
  if (hzMatch) {
    const val = 1 + Number(hzMatch[1]) / 180;
    return Math.min(1.4, Math.max(0.7, val));
  }
  return 1.0;
}

export function buildAtempoFilterChain(factor: number): string[] {
  if (!Number.isFinite(factor) || factor <= 0) {
    return ["atempo=1.0000"];
  }
  const clamped = Math.min(8.0, Math.max(0.125, factor));
  const stages: string[] = [];
  let remaining = clamped;
  while (remaining > 2.0 + 1e-6) {
    stages.push("atempo=2.0");
    remaining /= 2.0;
  }
  while (remaining < 0.5 - 1e-6) {
    stages.push("atempo=0.5");
    remaining /= 0.5;
  }
  if (stages.length === 0 || Math.abs(remaining - 1.0) > 1e-4) {
    const safeStage = Math.min(2.0, Math.max(0.5, remaining));
    stages.push(`atempo=${safeStage.toFixed(4)}`);
  }
  return stages;
}

function getRoleFilterSettings(role: TtsRole): { rolePitchMul: number; roleEq: string } {
  if (role === "ngoc_huy") {
    return {
      rolePitchMul: 0.62,
      roleEq: "highpass=f=75,lowshelf=g=3:f=180,treble=g=-1.5:f=3500",
    };
  }
  return {
    rolePitchMul: 1.04,
    roleEq: "highpass=f=110,treble=g=1.5:f=3200",
  };
}

function runFfmpegPipe(
  args: string[],
  inputBuffer: Buffer,
  timeoutMs: number = FFMPEG_DSP_TIMEOUT_MS
): Promise<Buffer> {
  return withFfmpegConcurrencyLimit(
    () =>
      new Promise<Buffer>((resolve, reject) => {
        let settled = false;
        const bin = getFfmpegBin();
        let child: ReturnType<typeof spawn>;
        try {
          child = spawn(bin, args, { stdio: ["pipe", "pipe", "pipe"] });
        } catch (err) {
          reject(new TtsUpstreamError(err instanceof Error ? err.message : "Failed to spawn ffmpeg"));
          return;
        }

        const stdoutChunks: Buffer[] = [];
        const stderrChunks: Buffer[] = [];

        const timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          try {
            child.kill("SIGKILL");
          } catch {}
          reject(new TtsUpstreamError(`ffmpeg DSP timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        const cleanup = () => {
          clearTimeout(timer);
        };

        child.stdout?.on("data", (chunk: Buffer) => {
          stdoutChunks.push(chunk);
        });
        child.stderr?.on("data", (chunk: Buffer) => {
          stderrChunks.push(chunk);
        });
        child.stdin?.on("error", () => {
          // Ignore EPIPE if ffmpeg exits before consuming stdin
        });

        child.on("error", (err) => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(new TtsUpstreamError(err instanceof Error ? err.message : "ffmpeg process error"));
        });

        child.on("close", (code) => {
          if (settled) return;
          settled = true;
          cleanup();
          if (code !== 0) {
            const errMsg = Buffer.concat(stderrChunks).toString("utf8").trim() || `exit ${code}`;
            reject(new TtsUpstreamError(`ffmpeg exited with error: ${errMsg}`));
            return;
          }
          resolve(Buffer.concat(stdoutChunks));
        });

        try {
          child.stdin?.end(inputBuffer);
        } catch (err) {
          if (!settled) {
            settled = true;
            cleanup();
            reject(new TtsUpstreamError(err instanceof Error ? err.message : "ffmpeg stdin failed"));
          }
        }
      })
  );
}

async function applyFfmpegDsp(
  inputBuffer: Buffer,
  opts: {
    inputFormat: "mp3" | "wav";
    pitchMul: number;
    tempoMul: number;
    role: TtsRole;
  }
): Promise<Buffer> {
  const safePitchMul = Math.min(1.8, Math.max(0.5, opts.pitchMul));
  const atempoChain = buildAtempoFilterChain(opts.tempoMul);
  const { roleEq } = getRoleFilterSettings(opts.role);
  const filterGraph = `aresample=48000,asetrate=48000*${safePitchMul.toFixed(4)},aresample=24000,${atempoChain.join(",")},${roleEq}`;
  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-f",
    opts.inputFormat,
    "-i",
    "pipe:0",
    "-af",
    filterGraph,
    "-c:a",
    "libmp3lame",
    "-ar",
    "24000",
    "-ac",
    "1",
    "-b:a",
    "64k",
    "-write_xing",
    "0",
    "-id3v2_version",
    "0",
    "-f",
    "mp3",
    "pipe:1",
  ];
  const out = await runFfmpegPipe(args, inputBuffer);
  if (!isValidMp3Buffer(out)) {
    throw new TtsUpstreamError("ffmpeg DSP produced invalid MP3 buffer");
  }
  return out;
}

async function decodeAudioToMono16kPcmViaFfmpeg(inputBuffer: Buffer): Promise<Float32Array> {
  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    "pipe:0",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-f",
    "f32le",
    "pipe:1",
  ];
  const pcmBuf = await runFfmpegPipe(args, inputBuffer);
  const sampleCount = Math.floor(pcmBuf.byteLength / 4);
  const out = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    out[i] = pcmBuf.readFloatLE(i * 4);
  }
  return out;
}

export function parseWavBuffer(wavBuf: Buffer): { sampleRate: number; samples: Float32Array } {
  if (
    !wavBuf ||
    wavBuf.length < 44 ||
    wavBuf.subarray(0, 4).toString("ascii") !== "RIFF" ||
    wavBuf.subarray(8, 12).toString("ascii") !== "WAVE"
  ) {
    throw new TtsValidationError("Invalid WAV header");
  }

  let audioFormat = 1;
  let numChannels = 1;
  let sampleRate = 24000;
  let bitsPerSample = 16;
  let fmtFound = false;
  let dataStart = -1;
  let dataLength = 0;

  let offset = 12;
  while (offset + 8 <= wavBuf.length) {
    const chunkId = wavBuf.subarray(offset, offset + 4).toString("ascii");
    const chunkSize = wavBuf.readUInt32LE(offset + 4);
    const bodyOffset = offset + 8;
    const boundedSize = Math.min(chunkSize, wavBuf.length - bodyOffset);
    if (chunkId === "fmt " && boundedSize >= 16) {
      audioFormat = wavBuf.readUInt16LE(bodyOffset);
      numChannels = wavBuf.readUInt16LE(bodyOffset + 2);
      sampleRate = wavBuf.readUInt32LE(bodyOffset + 4);
      bitsPerSample = wavBuf.readUInt16LE(bodyOffset + 14);
      fmtFound = true;
    } else if (chunkId === "data") {
      dataStart = bodyOffset;
      dataLength = boundedSize;
      break;
    }
    offset = bodyOffset + chunkSize + (chunkSize % 2);
  }

  if (!fmtFound || dataStart < 0 || numChannels < 1 || sampleRate <= 0) {
    throw new TtsValidationError("WAV missing valid fmt or data chunk");
  }

  const bytesPerSample = bitsPerSample / 8;
  if (![1, 2, 3, 4].includes(bytesPerSample)) {
    throw new TtsValidationError(`Unsupported WAV bit depth: ${bitsPerSample}`);
  }
  const frameSize = bytesPerSample * numChannels;
  const frameCount = Math.floor(dataLength / frameSize);
  const samples = new Float32Array(frameCount);

  for (let i = 0; i < frameCount; i++) {
    let sum = 0;
    for (let ch = 0; ch < numChannels; ch++) {
      const pos = dataStart + i * frameSize + ch * bytesPerSample;
      let s = 0;
      if (audioFormat === 3 && bitsPerSample === 32) {
        s = wavBuf.readFloatLE(pos);
      } else if (bitsPerSample === 8) {
        s = (wavBuf[pos] - 128) / 128;
      } else if (bitsPerSample === 16) {
        s = wavBuf.readInt16LE(pos) / 32768;
      } else if (bitsPerSample === 24) {
        let val = wavBuf[pos] | (wavBuf[pos + 1] << 8) | (wavBuf[pos + 2] << 16);
        if (val & 0x800000) val |= ~0xffffff;
        s = val / 8388608;
      } else if (bitsPerSample === 32) {
        s = wavBuf.readInt32LE(pos) / 2147483648;
      }
      sum += s;
    }
    samples[i] = sum / numChannels;
  }

  return { sampleRate, samples };
}

export function encodeWavBuffer(samples: Float32Array, sampleRate: number): Buffer {
  const numSamples = samples.length;
  const dataBytes = numSamples * 2;
  const buf = Buffer.allocUnsafe(44 + dataBytes);
  buf.write("RIFF", 0, "ascii");
  buf.writeUInt32LE(36 + dataBytes, 4);
  buf.write("WAVE", 8, "ascii");
  buf.write("fmt ", 12, "ascii");
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(Math.round(sampleRate), 24);
  buf.writeUInt32LE(Math.round(sampleRate) * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36, "ascii");
  buf.writeUInt32LE(dataBytes, 40);
  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }
  return buf;
}

export function estimateF0HzFromPcm(samples: Float32Array, sampleRate: number): number | null {
  if (!samples || samples.length < Math.round(sampleRate * 0.04) || sampleRate <= 0) {
    return null;
  }
  const minLag = Math.max(4, Math.floor(sampleRate / 350));
  const maxLag = Math.min(Math.floor(samples.length / 2) - 1, Math.ceil(sampleRate / 70));
  if (maxLag <= minLag) return null;

  const frameLen = Math.min(samples.length, Math.max(maxLag * 2, Math.round(sampleRate * 0.04)));
  const hop = Math.max(1, Math.round(sampleRate * 0.02));
  const candidates: number[] = [];

  for (let start = 0; start + frameLen <= samples.length; start += hop) {
    let energy = 0;
    for (let i = 0; i < frameLen; i++) {
      const v = samples[start + i];
      energy += v * v;
    }
    const rms = Math.sqrt(energy / frameLen);
    if (rms < 0.01) continue;

    const corrs = new Float32Array(maxLag + 1);
    let bestCorr = 0;
    const windowN = frameLen - maxLag;
    for (let lag = minLag; lag <= maxLag; lag++) {
      let num = 0;
      let denA = 0;
      let denB = 0;
      for (let i = 0; i < windowN; i++) {
        const a = samples[start + i];
        const b = samples[start + i + lag];
        num += a * b;
        denA += a * a;
        denB += b * b;
      }
      const denom = Math.sqrt(denA * denB);
      const corr = denom > 1e-9 ? num / denom : 0;
      corrs[lag] = corr;
      if (corr > bestCorr) {
        bestCorr = corr;
      }
    }
    if (bestCorr >= 0.45) {
      const threshold = Math.max(0.45, bestCorr * 0.88);
      let chosenLag = -1;
      for (let lag = minLag + 1; lag < maxLag; lag++) {
        if (
          corrs[lag] >= threshold &&
          corrs[lag] >= corrs[lag - 1] &&
          corrs[lag] >= corrs[lag + 1]
        ) {
          chosenLag = lag;
          break;
        }
      }
      if (chosenLag < 0) {
        let maxIdx = minLag;
        for (let lag = minLag + 1; lag <= maxLag; lag++) {
          if (corrs[lag] > corrs[maxIdx]) maxIdx = lag;
        }
        chosenLag = maxIdx;
      }
      candidates.push(sampleRate / chosenLag);
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a - b);
  return candidates[Math.floor(candidates.length / 2)];
}

function resamplePcmLinear(samples: Float32Array, pitchMul: number): Float32Array {
  if (samples.length === 0 || Math.abs(pitchMul - 1.0) < 1e-4) {
    return new Float32Array(samples);
  }
  const outLen = Math.max(1, Math.round(samples.length / pitchMul));
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const srcPos = i * pitchMul;
    const idx = Math.floor(srcPos);
    const frac = srcPos - idx;
    const s0 = idx < samples.length ? samples[idx] : 0;
    const s1 = idx + 1 < samples.length ? samples[idx + 1] : s0;
    out[i] = s0 + (s1 - s0) * frac;
  }
  return out;
}

function timeScalePcmWsola(
  samples: Float32Array,
  sampleRate: number,
  tempoFactor: number
): Float32Array {
  if (samples.length === 0 || Math.abs(tempoFactor - 1.0) < 0.01) {
    return new Float32Array(samples);
  }
  const safeTempo = Math.min(4.0, Math.max(0.25, tempoFactor));
  const targetLen = Math.max(1, Math.round(samples.length / safeTempo));
  let winSize = Math.round(sampleRate * 0.032);
  if (winSize % 2 !== 0) winSize += 1;
  if (samples.length < winSize * 2) {
    winSize = Math.max(32, Math.floor(samples.length / 4) * 2);
  }
  const hs = Math.max(8, Math.floor(winSize / 2));
  const ha = Math.max(1, Math.round(hs * safeTempo));
  const searchRadius = Math.min(Math.round(sampleRate * 0.01), Math.floor(hs / 2));

  if (samples.length <= winSize || targetLen <= winSize) {
    return resamplePcmLinear(samples, safeTempo);
  }

  const hann = new Float32Array(winSize);
  for (let i = 0; i < winSize; i++) {
    hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (winSize - 1)));
  }

  const out = new Float32Array(targetLen + winSize);
  const norm = new Float32Array(targetLen + winSize);

  // Copy initial frame
  for (let i = 0; i < winSize && i < samples.length; i++) {
    out[i] += samples[i] * hann[i];
    norm[i] += hann[i];
  }

  let outPos = hs;
  let inPos = ha;

  while (outPos + winSize <= out.length && inPos < samples.length) {
    let bestOffset = 0;
    let bestCorr = -Infinity;
    const minOff = Math.max(-searchRadius, -inPos);
    const maxOff = Math.min(searchRadius, samples.length - winSize - inPos);

    if (maxOff >= minOff) {
      for (let off = minOff; off <= maxOff; off++) {
        let num = 0;
        let denA = 0;
        let denB = 0;
        for (let k = 0; k < hs; k++) {
          const prev = out[outPos + k];
          const cand = samples[inPos + off + k] * hann[k];
          num += prev * cand;
          denA += prev * prev;
          denB += cand * cand;
        }
        const denom = Math.sqrt(denA * denB);
        const corr = denom > 1e-9 ? num / denom : 0;
        if (corr > bestCorr) {
          bestCorr = corr;
          bestOffset = off;
        }
      }
    }

    const srcStart = Math.max(0, Math.min(samples.length - winSize, inPos + bestOffset));
    for (let k = 0; k < winSize && srcStart + k < samples.length; k++) {
      out[outPos + k] += samples[srcStart + k] * hann[k];
      norm[outPos + k] += hann[k];
    }

    outPos += hs;
    inPos += ha;
  }

  const result = new Float32Array(targetLen);
  for (let i = 0; i < targetLen; i++) {
    result[i] = norm[i] > 1e-6 ? out[i] / norm[i] : out[i];
  }
  return result;
}

function applyBiquadFilter(
  samples: Float32Array,
  b0: number,
  b1: number,
  b2: number,
  a0: number,
  a1: number,
  a2: number
): Float32Array {
  const out = new Float32Array(samples.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  const invA0 = 1 / a0;
  const nb0 = b0 * invA0;
  const nb1 = b1 * invA0;
  const nb2 = b2 * invA0;
  const na1 = a1 * invA0;
  const na2 = a2 * invA0;

  for (let i = 0; i < samples.length; i++) {
    const x0 = samples[i];
    const y0 = nb0 * x0 + nb1 * x1 + nb2 * x2 - na1 * y1 - na2 * y2;
    out[i] = y0;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
  }
  return out;
}

function applyHighpassBiquad(samples: Float32Array, sampleRate: number, freqHz: number): Float32Array {
  const w0 = (2 * Math.PI * freqHz) / sampleRate;
  const cosW0 = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * 0.7071);
  return applyBiquadFilter(
    samples,
    (1 + cosW0) / 2,
    -(1 + cosW0),
    (1 + cosW0) / 2,
    1 + alpha,
    -2 * cosW0,
    1 - alpha
  );
}

function applyShelfBiquad(
  samples: Float32Array,
  sampleRate: number,
  freqHz: number,
  gainDb: number,
  kind: "low" | "high"
): Float32Array {
  const a = Math.pow(10, gainDb / 40);
  const w0 = (2 * Math.PI * freqHz) / sampleRate;
  const cosW0 = Math.cos(w0);
  const sinW0 = Math.sin(w0);
  const alpha = (sinW0 / 2) * Math.sqrt((a + 1 / a) * (1 / 0.85 - 1) + 2);
  const twoSqrtAAlpha = 2 * Math.sqrt(a) * alpha;

  if (kind === "low") {
    return applyBiquadFilter(
      samples,
      a * (a + 1 - (a - 1) * cosW0 + twoSqrtAAlpha),
      2 * a * (a - 1 - (a + 1) * cosW0),
      a * (a + 1 - (a - 1) * cosW0 - twoSqrtAAlpha),
      a + 1 + (a - 1) * cosW0 + twoSqrtAAlpha,
      -2 * (a - 1 + (a + 1) * cosW0),
      a + 1 + (a - 1) * cosW0 - twoSqrtAAlpha
    );
  }
  return applyBiquadFilter(
    samples,
    a * (a + 1 + (a - 1) * cosW0 + twoSqrtAAlpha),
    -2 * a * (a - 1 + (a + 1) * cosW0),
    a * (a + 1 + (a - 1) * cosW0 - twoSqrtAAlpha),
    a + 1 - (a - 1) * cosW0 + twoSqrtAAlpha,
    2 * (a - 1 - (a + 1) * cosW0),
    a + 1 - (a - 1) * cosW0 - twoSqrtAAlpha
  );
}

export function applyRoleDspToWavBuffer(
  wavBuf: Buffer,
  options: {
    role: TtsRole;
    rate?: number;
    pitchMul?: number;
    targetPitchHz?: number;
  }
): Buffer {
  const { sampleRate, samples } = parseWavBuffer(wavBuf);
  const rate = normalizeTtsRate(options.rate);
  const { rolePitchMul } = getRoleFilterSettings(options.role);
  const rawPitchMul =
    typeof options.pitchMul === "number" && Number.isFinite(options.pitchMul)
      ? options.pitchMul
      : typeof options.targetPitchHz === "number" && Number.isFinite(options.targetPitchHz)
        ? options.targetPitchHz / 210
        : rolePitchMul;
  const pitchMul = Math.min(1.7, Math.max(0.5, rawPitchMul));
  const tempoMul = rate / pitchMul;

  const pitchShifted = resamplePcmLinear(samples, pitchMul);
  const timeScaled = timeScalePcmWsola(pitchShifted, sampleRate, tempoMul);

  let eq = applyHighpassBiquad(timeScaled, sampleRate, options.role === "ngoc_huy" ? 75 : 110);
  if (options.role === "ngoc_huy") {
    eq = applyShelfBiquad(eq, sampleRate, 180, 3.0, "low");
    eq = applyShelfBiquad(eq, sampleRate, 3500, -1.5, "high");
  } else {
    eq = applyShelfBiquad(eq, sampleRate, 3200, 1.5, "high");
  }
  for (let i = 0; i < eq.length; i++) {
    if (eq[i] > 0.99) eq[i] = 0.99;
    else if (eq[i] < -0.99) eq[i] = -0.99;
  }
  return encodeWavBuffer(eq, sampleRate);
}

export function resolveSafeVoiceFile(sampleUrlOrFile: string): string | null {
  if (typeof sampleUrlOrFile !== "string") return null;
  const raw = sampleUrlOrFile.trim();
  if (!raw || raw.includes("\0")) return null;
  const withoutQuery = raw.split(/[?#]/)[0];
  let relative = withoutQuery;
  if (relative.startsWith("/api/olympia/tts/voices")) {
    const match = /[?&]file=([^&#]+)/.exec(raw);
    if (!match) return null;
    try {
      relative = decodeURIComponent(match[1]);
    } catch {
      return null;
    }
  } else if (relative.startsWith("/uploads/olympia-voices/")) {
    relative = relative.slice("/uploads/olympia-voices/".length);
  }
  if (
    !relative ||
    relative === "profiles.json" ||
    relative.includes("..") ||
    relative.includes("/") ||
    relative.includes("\\") ||
    relative.includes("\0") ||
    !/^[a-zA-Z0-9_.-]{1,128}$/.test(relative)
  ) {
    return null;
  }
  const resolved = path.resolve(VOICES_UPLOAD_DIR, relative);
  if (!resolved.startsWith(VOICES_UPLOAD_DIR + path.sep)) {
    return null;
  }
  return resolved;
}

export async function readSavedVoiceProfile(
  profileId: string
): Promise<(SavedVoiceProfile & { apiKey?: string }) | null> {
  if (typeof profileId !== "string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(profileId)) {
    return null;
  }
  const registryPath = path.join(VOICES_UPLOAD_DIR, "profiles.json");
  try {
    const raw = await fs.promises.readFile(registryPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const list: Array<SavedVoiceProfile & { apiKey?: string }> = Array.isArray(parsed)
      ? parsed
      : parsed &&
          typeof parsed === "object" &&
          Array.isArray((parsed as { profiles?: unknown }).profiles)
        ? ((parsed as { profiles: Array<SavedVoiceProfile & { apiKey?: string }> }).profiles)
        : [];
    return list.find((item) => item && item.id === profileId) ?? null;
  } catch {
    return null;
  }
}

class CloneFallbackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CloneFallbackError";
  }
}

function sanitizeVoiceLabel(label: string): string {
  const cleaned = label.replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
  return cleaned ? cleaned.slice(0, 48) : "custom";
}

function validateExternalCloneEndpoint(endpointUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(endpointUrl);
  } catch {
    throw new CloneFallbackError("clone-invalid-endpoint");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new CloneFallbackError("clone-invalid-endpoint");
  }
  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "169.254.169.254" ||
    host === "metadata.google.internal" ||
    host === "metadata" ||
    /^169\.254\./.test(host) ||
    /^::ffff:169\.254\./.test(host)
  ) {
    throw new CloneFallbackError("clone-blocked-endpoint");
  }
  return parsed;
}

async function fetchGoogleRawMp3(cleanText: string, lang: TtsLang): Promise<{ rawChunks: Buffer[]; cleanedMp3: Buffer }> {
  const chunks = splitTextForGoogleTts(cleanText);
  if (chunks.length === 0) {
    throw new TtsValidationError("Text must not be empty");
  }
  const rawChunks = await Promise.all(
    chunks.map((chunk) => fetchGoogleTranslateChunk(chunk, lang))
  );
  const stripped = rawChunks.map((c) => {
    const s = stripId3Metadata(c);
    return s.length >= 4 && isValidMp3Buffer(s) ? s : c;
  });
  return {
    rawChunks,
    cleanedMp3: Buffer.concat(stripped),
  };
}

async function synthesizeGoogleWithRoleAndRate(params: {
  cleanText: string;
  lang: TtsLang;
  role: TtsRole;
  rate: number;
  pitch: string;
}): Promise<{
  audio: Buffer;
  voice: string;
  engine: TtsEngine;
  contentType: TtsAudioContentType;
  fallbackReason?: string;
}> {
  const { rawChunks, cleanedMp3 } = await fetchGoogleRawMp3(params.cleanText, params.lang);
  const dspAvailable = await isFfmpegDspAvailable();
  if (dspAvailable) {
    const { rolePitchMul } = getRoleFilterSettings(params.role);
    const pitchMul = Math.min(
      1.65,
      Math.max(0.52, rolePitchMul * parsePitchMultiplier(params.pitch))
    );
    const tempoMul = params.rate / pitchMul;
    try {
      const processed = await applyFfmpegDsp(cleanedMp3, {
        inputFormat: "mp3",
        pitchMul,
        tempoMul,
        role: params.role,
      });
      return {
        audio: processed,
        engine: "google-translate-tts-dsp",
        voice: `google-${params.lang}-${params.role === "ngoc_huy" ? "male-dsp" : "female-dsp"}`,
        contentType: "audio/mpeg",
      };
    } catch {
      return {
        audio: Buffer.concat(rawChunks),
        engine: "google-translate-tts",
        voice: `google-${params.lang}-${params.role === "ngoc_huy" ? "male-raw" : "female-raw"}`,
        contentType: "audio/mpeg",
        fallbackReason: "ffmpeg-dsp-failed",
      };
    }
  }

  return {
    audio: Buffer.concat(rawChunks),
    engine: "google-translate-tts",
    voice: `google-${params.lang}-${params.role === "ngoc_huy" ? "male-raw" : "female-raw"}`,
    contentType: "audio/mpeg",
    fallbackReason: "ffmpeg-unavailable",
  };
}

async function synthesizeVoiceClone(normalized: NormalizedTtsInput): Promise<{
  audio: Buffer;
  voice: string;
  engine: TtsEngine;
  contentType: TtsAudioContentType;
}> {
  const clone = normalized.clone;
  if (!clone || !clone.enabled) {
    throw new CloneFallbackError("clone-disabled");
  }

  const profile = clone.profileId ? await readSavedVoiceProfile(clone.profileId) : null;
  const provider = clone.provider;

  if (provider === "local_profile") {
    let targetPitchHz =
      typeof clone.targetPitchHz === "number" && Number.isFinite(clone.targetPitchHz)
        ? clone.targetPitchHz
        : profile?.targetPitchHz;
    const pitchRatio =
      typeof clone.pitchRatio === "number" && Number.isFinite(clone.pitchRatio)
        ? clone.pitchRatio
        : profile?.pitchRatio;
    const sampleRef = clone.sampleUrl ?? profile?.sampleUrl;

    if (sampleRef !== undefined && sampleRef !== "") {
      const safePath = resolveSafeVoiceFile(sampleRef);
      if (!safePath) {
        throw new CloneFallbackError("clone-invalid-sample-path");
      }
      if (targetPitchHz === undefined && pitchRatio === undefined) {
        let sampleBuf: Buffer;
        try {
          sampleBuf = await fs.promises.readFile(safePath);
        } catch {
          throw new CloneFallbackError("clone-sample-unreadable");
        }
        if (sampleBuf.byteLength === 0 || sampleBuf.byteLength > MAX_VOICE_SAMPLE_READ_BYTES) {
          throw new CloneFallbackError("clone-sample-invalid-size");
        }
        const sampleType = detectAudioContentType(sampleBuf);
        let pcm: Float32Array;
        let sr = 16000;
        if (sampleType === "audio/wav") {
          const parsed = parseWavBuffer(sampleBuf);
          pcm = parsed.samples;
          sr = parsed.sampleRate;
        } else if (await isFfmpegDspAvailable()) {
          pcm = await decodeAudioToMono16kPcmViaFfmpeg(sampleBuf);
        } else {
          throw new CloneFallbackError("clone-dsp-unavailable");
        }
        const estimated = estimateF0HzFromPcm(pcm, sr);
        if (!estimated) {
          throw new CloneFallbackError("clone-unpitched-sample");
        }
        targetPitchHz = estimated;
      }
    }

    if (targetPitchHz === undefined && pitchRatio === undefined) {
      throw new CloneFallbackError("clone-missing-config");
    }

    if (!(await isFfmpegDspAvailable())) {
      throw new CloneFallbackError("clone-dsp-unavailable");
    }

    let baseAudio: Buffer;
    let baseNominalHz = 210;
    if (!shouldBypassEdgeWithBackgroundProbe()) {
      try {
        baseAudio = await withWsConcurrencyLimit(() =>
          synthesizeOnce({
            cleanText: normalized.cleanText,
            voice: normalized.voice,
            lang: normalized.lang,
            rateStr: "+0%",
            pitch: "+0Hz",
          })
        );
        baseNominalHz = normalized.role === "ngoc_huy" ? 128 : 210;
      } catch {
        const g = await fetchGoogleRawMp3(normalized.cleanText, normalized.lang);
        baseAudio = g.cleanedMp3;
        baseNominalHz = 210;
      }
    } else {
      const g = await fetchGoogleRawMp3(normalized.cleanText, normalized.lang);
      baseAudio = g.cleanedMp3;
      baseNominalHz = 210;
    }

    const rawRatio =
      typeof targetPitchHz === "number"
        ? Math.min(400, Math.max(65, targetPitchHz)) / baseNominalHz
        : Number(pitchRatio);
    const pitchMul = Math.min(1.65, Math.max(0.52, rawRatio));
    const tempoMul = normalized.rate / pitchMul;
    const processed = await applyFfmpegDsp(baseAudio, {
      inputFormat: "mp3",
      pitchMul,
      tempoMul,
      role: normalized.role,
    });
    const label = sanitizeVoiceLabel(clone.profileId || clone.sampleName || "local");
    return {
      audio: processed,
      engine: "voice-clone-local_profile",
      voice: `clone-${label}`,
      contentType: "audio/mpeg",
    };
  }

  if (provider === "elevenlabs") {
    const voiceId = (clone.voiceId || profile?.voiceId || "").trim();
    const apiKey = (clone.apiKey || profile?.apiKey || process.env.ELEVENLABS_API_KEY || "").trim();
    if (!voiceId || !/^[a-zA-Z0-9_-]{1,128}$/.test(voiceId) || !apiKey) {
      throw new CloneFallbackError("clone-missing-config");
    }
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_24000_48`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: normalized.cleanText,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          speed: Math.min(1.2, Math.max(0.7, normalized.rate)),
        },
      }),
      signal: AbortSignal.timeout(CLONE_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      throw new CloneFallbackError(`clone-elevenlabs-http-${res.status}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const ct = buf.byteLength >= 64 ? detectAudioContentType(buf) : null;
    if (!ct) {
      throw new CloneFallbackError("clone-invalid-audio");
    }
    return {
      audio: buf,
      engine: "voice-clone-elevenlabs",
      voice: `clone-${sanitizeVoiceLabel(voiceId)}`,
      contentType: ct,
    };
  }

  if (provider === "fish_audio") {
    const voiceId = (clone.voiceId || profile?.voiceId || "").trim();
    const apiKey = (clone.apiKey || profile?.apiKey || process.env.FISH_AUDIO_API_KEY || "").trim();
    if (!voiceId || !/^[a-zA-Z0-9_-]{1,128}$/.test(voiceId) || !apiKey) {
      throw new CloneFallbackError("clone-missing-config");
    }
    const res = await fetch("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: normalized.cleanText,
        reference_id: voiceId,
        format: "mp3",
        prosody: {
          speed: normalized.rate,
        },
      }),
      signal: AbortSignal.timeout(CLONE_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      throw new CloneFallbackError(`clone-fish-http-${res.status}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const ct = buf.byteLength >= 64 ? detectAudioContentType(buf) : null;
    if (!ct) {
      throw new CloneFallbackError("clone-invalid-audio");
    }
    return {
      audio: buf,
      engine: "voice-clone-fish_audio",
      voice: `clone-${sanitizeVoiceLabel(voiceId)}`,
      contentType: ct,
    };
  }

  if (provider === "custom_http") {
    const endpointUrl = (clone.endpointUrl || profile?.endpointUrl || "").trim();
    if (!endpointUrl) {
      throw new CloneFallbackError("clone-missing-config");
    }
    const parsedUrl = validateExternalCloneEndpoint(endpointUrl);
    const apiKey = (clone.apiKey || profile?.apiKey || "").trim();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
      headers["X-API-Key"] = apiKey;
    }
    const res = await fetch(parsedUrl.toString(), {
      method: "POST",
      headers,
      body: JSON.stringify({
        text: normalized.cleanText,
        role: normalized.role,
        lang: normalized.lang,
        rate: normalized.rate,
        pitch: normalized.pitch,
        voiceId: clone.voiceId ?? profile?.voiceId,
        sampleUrl: clone.sampleUrl ?? profile?.sampleUrl,
      }),
      signal: AbortSignal.timeout(CLONE_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      throw new CloneFallbackError(`clone-custom-http-${res.status}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const ct = buf.byteLength >= 64 ? detectAudioContentType(buf) : null;
    if (!ct) {
      throw new CloneFallbackError("clone-invalid-audio");
    }
    const label = sanitizeVoiceLabel(clone.voiceId || clone.profileId || "custom");
    return {
      audio: buf,
      engine: "voice-clone-custom_http",
      voice: `clone-${label}`,
      contentType: ct,
    };
  }

  throw new CloneFallbackError("clone-unsupported-provider");
}

function markEdgeDegraded(): void {
  edgeDegradedUntil = Date.now() + EDGE_DEGRADED_COOLDOWN_MS;
}

function markEdgeHealthy(): void {
  edgeDegradedUntil = 0;
}

function shouldBypassEdgeWithBackgroundProbe(): boolean {
  if (edgeDegradedUntil === 0) return false;
  const now = Date.now();
  if (now < edgeDegradedUntil) return true;
  if (!edgeProbeInFlight && process.env.NODE_ENV !== "test") {
    edgeProbeInFlight = withWsConcurrencyLimit(() =>
      synthesizeOnce({
        cleanText: "Kiểm tra kết nối.",
        voice: EDGE_TTS_VOICES.khanh_vy.vi,
        lang: "vi",
        rateStr: "+0%",
        pitch: "+0Hz",
      })
    )
      .then(() => {
        markEdgeHealthy();
      })
      .catch(() => {
        markEdgeDegraded();
      })
      .finally(() => {
        edgeProbeInFlight = null;
      });
  }
  return true;
}

async function synthesizeWithSkewRetry(normalized: NormalizedTtsInput): Promise<{
  audio: Buffer;
  voice: string;
  engine: TtsEngine;
  contentType: TtsAudioContentType;
  cloneUsed: boolean;
  fallbackReason?: string;
}> {
  let fallbackReason: string | undefined;

  if (normalized.clone?.enabled) {
    try {
      const cloned = await synthesizeVoiceClone(normalized);
      return {
        ...cloned,
        cloneUsed: true,
      };
    } catch (cloneErr) {
      fallbackReason = sanitizeSecretText(
        cloneErr instanceof Error ? cloneErr.message : "clone-failed",
        [normalized.clone.apiKey]
      );
    }
  }

  if (shouldBypassEdgeWithBackgroundProbe()) {
    const googleRes = await synthesizeGoogleWithRoleAndRate({
      cleanText: normalized.cleanText,
      lang: normalized.lang,
      role: normalized.role,
      rate: normalized.rate,
      pitch: normalized.pitch,
    });
    return {
      audio: googleRes.audio,
      voice: googleRes.voice,
      engine: googleRes.engine,
      contentType: googleRes.contentType,
      cloneUsed: false,
      fallbackReason: fallbackReason ?? googleRes.fallbackReason,
    };
  }

  try {
    const audio = await withWsConcurrencyLimit(async () => {
      const wsParams = {
        cleanText: normalized.cleanText,
        voice: normalized.voice,
        lang: normalized.lang,
        rateStr: normalized.rateStr,
        pitch: normalized.pitch,
      };
      try {
        return await synthesizeOnce(wsParams);
      } catch (err) {
        const typed = err as { statusCode?: number } | null;
        if (typed?.statusCode === 403) {
          return await synthesizeOnce(wsParams);
        }
        throw err;
      }
    });
    markEdgeHealthy();
    return {
      audio,
      voice: normalized.voice,
      engine: "edge-neural",
      contentType: "audio/mpeg",
      cloneUsed: false,
      fallbackReason,
    };
  } catch (edgeErr) {
    markEdgeDegraded();
    try {
      const googleRes = await synthesizeGoogleWithRoleAndRate({
        cleanText: normalized.cleanText,
        lang: normalized.lang,
        role: normalized.role,
        rate: normalized.rate,
        pitch: normalized.pitch,
      });
      return {
        audio: googleRes.audio,
        voice: googleRes.voice,
        engine: googleRes.engine,
        contentType: googleRes.contentType,
        cloneUsed: false,
        fallbackReason: fallbackReason ?? googleRes.fallbackReason,
      };
    } catch {
      throw edgeErr;
    }
  }
}

export async function synthesizeEdgeTts(input: SynthesizeTtsInput): Promise<SynthesizeTtsResult> {
  const normalized = validateAndNormalizeTtsInput(input);
  const cacheKey = buildTtsCacheKey(normalized);

  const cached = ttsCache.get(cacheKey);
  if (cached) {
    return { ...cached, cacheHit: true };
  }

  const inflight = inflightRequests.get(cacheKey);
  if (inflight) {
    const res = await inflight;
    return { ...res, cacheHit: true };
  }

  const promise = (async () => {
    const result = await synthesizeWithSkewRetry(normalized);
    const entry: SynthesizeTtsResult = {
      audio: result.audio,
      voice: result.voice,
      role: normalized.role,
      lang: normalized.lang,
      rateStr: normalized.rateStr,
      pitch: normalized.pitch,
      cacheHit: false,
      engine: result.engine,
      contentType: result.contentType,
      cloneUsed: result.cloneUsed,
      fallbackReason: result.fallbackReason,
    };
    ttsCache.set(cacheKey, entry);
    return entry;
  })();

  inflightRequests.set(cacheKey, promise);
  try {
    return await promise;
  } finally {
    inflightRequests.delete(cacheKey);
  }
}

function synthesizeStreamOnce(params: {
  cleanText: string;
  voice: string;
  lang: TtsLang;
  rateStr: string;
  pitch: string;
  onTurnEnd?: (fullAudio: Buffer) => void;
  onDone?: () => void;
}): Promise<ReadableStream<Uint8Array>> {
  const WebSocketCtor = loadWebSocketConstructor();
  const connectionId = connectUuid();
  const requestId = connectUuid();
  const secMsGec = generateSecMsGecV2();
  const url =
    `${WSS_BASE_URL}?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}` +
    `&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}` +
    `&ConnectionId=${connectionId}`;

  const ssml = buildEdgeSsml(
    params.cleanText,
    params.voice,
    params.rateStr,
    params.pitch,
    params.lang
  );

  return new Promise<ReadableStream<Uint8Array>>((resolve, reject) => {
    let settled = false;
    let streamClosed = false;
    const chunks: Buffer[] = [];
    let streamController: ReadableStreamDefaultController<Uint8Array> | null = null;
    let statusCode403 = false;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        streamController = controller;
      },
      cancel() {
        if (!streamClosed) {
          streamClosed = true;
          try {
            ws.terminate();
          } catch {}
          params.onDone?.();
        }
      },
    });

    const ws = new WebSocketCtor(url, {
      family: 4,
      perMessageDeflate: false,
      handshakeTimeout: HANDSHAKE_TIMEOUT_MS,
      headers: {
        Pragma: "no-cache",
        "Cache-Control": "no-cache",
        Origin: EDGE_ORIGIN,
        "User-Agent": EDGE_USER_AGENT,
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Accept-Language": "en-US,en;q=0.9",
        Cookie: `muid=${generateMuid()};`,
      },
    } as any);

    let firstAudioTimer: ReturnType<typeof setTimeout> | null = null;
    const cleanup = () => {
      clearTimeout(timer);
      if (firstAudioTimer) {
        clearTimeout(firstAudioTimer);
        firstAudioTimer = null;
      }
      ws.removeAllListeners();
    };

    const finishError = (err: Error) => {
      if (streamClosed) return;
      streamClosed = true;
      cleanup();
      try {
        ws.terminate();
      } catch {}
      params.onDone?.();
      if (!settled) {
        settled = true;
        reject(err);
      } else {
        try {
          streamController?.error(err);
        } catch {}
      }
    };

    const finishSuccess = () => {
      if (streamClosed) return;
      streamClosed = true;
      cleanup();
      try {
        ws.close();
      } catch {}
      params.onDone?.();
      const audio = Buffer.concat(chunks);
      if (audio.byteLength === 0 || !isValidMp3Buffer(audio)) {
        finishError(new TtsUpstreamError("Edge-TTS returned empty or invalid audio"));
        return;
      }
      try {
        params.onTurnEnd?.(audio);
      } catch {}
      try {
        streamController?.close();
      } catch {}
      if (!settled) {
        settled = true;
        resolve(stream);
      }
    };

    const timer = setTimeout(() => {
      finishError(new TtsUpstreamError(`Edge-TTS WebSocket timed out after ${WS_TIMEOUT_MS}ms`));
    }, WS_TIMEOUT_MS);

    ws.on("unexpected-response", (_req, res) => {
      const status = res.statusCode ?? 0;
      if (status === 403) {
        statusCode403 = true;
        const dateHeader = res.headers?.date;
        if (typeof dateHeader === "string") {
          const parsedMs = Date.parse(dateHeader);
          if (Number.isFinite(parsedMs)) {
            const serverEpochSec = parsedMs / 1000;
            const clientEpochSec = Date.now() / 1000 + clockSkewSeconds;
            clockSkewSeconds += serverEpochSec - clientEpochSec;
          }
        }
      }
      res.resume();
      const err = new TtsUpstreamError(`Edge-TTS upstream HTTP ${status}`);
      (err as TtsUpstreamError & { statusCode?: number }).statusCode = statusCode403 ? 403 : status;
      finishError(err);
    });

    ws.on("open", () => {
      try {
        firstAudioTimer = setTimeout(() => {
          firstAudioTimer = null;
          if (!settled && chunks.length === 0) {
            finishError(new TtsUpstreamError(`Edge-TTS stalled without audio after ${FIRST_AUDIO_STALL_MS}ms`));
          }
        }, FIRST_AUDIO_STALL_MS);
        const ts = edgeTimestampString();
        const configMsg =
          `X-Timestamp:${ts}\r\n` +
          `Content-Type:application/json; charset=utf-8\r\n` +
          `Path:speech.config\r\n\r\n` +
          JSON.stringify({
            context: {
              synthesis: {
                audio: {
                  metadataoptions: {
                    sentenceBoundaryEnabled: "false",
                    wordBoundaryEnabled: "false",
                  },
                  outputFormat: OUTPUT_FORMAT,
                },
              },
            },
          }) +
          "\r\n";

        const ssmlMsg =
          `X-RequestId:${requestId}\r\n` +
          `Content-Type:application/ssml+xml\r\n` +
          `X-Timestamp:${ts}Z\r\n` +
          `Path:ssml\r\n\r\n` +
          ssml;

        ws.send(configMsg);
        ws.send(ssmlMsg);
      } catch (err) {
        finishError(
          new TtsUpstreamError(err instanceof Error ? err.message : "Failed to send Edge-TTS SSML")
        );
      }
    });

    ws.on("message", (raw: WebSocketType.RawData, isBinary: boolean) => {
      if (streamClosed) return;
      if (!isBinary) {
        const text = rawDataToBuffer(raw).toString("utf8");
        if (text.includes("Path:turn.end")) {
          finishSuccess();
        }
        return;
      }

      const buf = rawDataToBuffer(raw);
      if (buf.length < 2) return;
      const headerLen = buf.readUInt16BE(0);
      if (2 + headerLen > buf.length) return;
      const headerText = buf.subarray(2, 2 + headerLen).toString("utf8");
      if (
        headerText.includes("Path:audio") &&
        headerText.includes("Content-Type:audio/mpeg")
      ) {
        const payload = buf.subarray(2 + headerLen);
        if (payload.byteLength > 0) {
          if (firstAudioTimer) {
            clearTimeout(firstAudioTimer);
            firstAudioTimer = null;
          }
          chunks.push(payload);
          try {
            streamController?.enqueue(new Uint8Array(payload));
          } catch {}
          if (!settled) {
            settled = true;
            resolve(stream);
          }
        }
      }
    });

    ws.on("error", (err) => {
      finishError(new TtsUpstreamError(err instanceof Error ? err.message : "Edge-TTS WS error"));
    });

    ws.on("close", (code) => {
      if (!streamClosed) {
        if (chunks.length > 0) {
          finishSuccess();
        } else {
          const err = new TtsUpstreamError(`Edge-TTS connection closed early (${code})`);
          (err as TtsUpstreamError & { closeCode?: number }).closeCode = code;
          finishError(err);
        }
      }
    });
  });
}

function bufferToReadableStream(buf: Buffer): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(buf));
      controller.close();
    },
  });
}

async function synthesizeWithSkewRetryStream(
  normalized: NormalizedTtsInput,
  onTurnEnd?: (meta: {
    audio: Buffer;
    voice: string;
    engine: TtsEngine;
    contentType: TtsAudioContentType;
    cloneUsed: boolean;
    fallbackReason?: string;
  }) => void
): Promise<{
  stream: ReadableStream<Uint8Array>;
  audio?: Buffer;
  voice: string;
  engine: TtsEngine;
  contentType: TtsAudioContentType;
  cloneUsed: boolean;
  fallbackReason?: string;
}> {
  let fallbackReason: string | undefined;

  if (normalized.clone?.enabled) {
    try {
      const cloned = await synthesizeVoiceClone(normalized);
      onTurnEnd?.({
        audio: cloned.audio,
        voice: cloned.voice,
        engine: cloned.engine,
        contentType: cloned.contentType,
        cloneUsed: true,
      });
      return {
        stream: bufferToReadableStream(cloned.audio),
        audio: cloned.audio,
        voice: cloned.voice,
        engine: cloned.engine,
        contentType: cloned.contentType,
        cloneUsed: true,
      };
    } catch (cloneErr) {
      fallbackReason = sanitizeSecretText(
        cloneErr instanceof Error ? cloneErr.message : "clone-failed",
        [normalized.clone.apiKey]
      );
    }
  }

  const runGoogleFallbackStream = async () => {
    const googleRes = await synthesizeGoogleWithRoleAndRate({
      cleanText: normalized.cleanText,
      lang: normalized.lang,
      role: normalized.role,
      rate: normalized.rate,
      pitch: normalized.pitch,
    });
    const combinedReason = fallbackReason ?? googleRes.fallbackReason;
    onTurnEnd?.({
      audio: googleRes.audio,
      voice: googleRes.voice,
      engine: googleRes.engine,
      contentType: googleRes.contentType,
      cloneUsed: false,
      fallbackReason: combinedReason,
    });
    return {
      stream: bufferToReadableStream(googleRes.audio),
      audio: googleRes.audio,
      voice: googleRes.voice,
      engine: googleRes.engine,
      contentType: googleRes.contentType,
      cloneUsed: false,
      fallbackReason: combinedReason,
    };
  };

  if (shouldBypassEdgeWithBackgroundProbe()) {
    return runGoogleFallbackStream();
  }

  const releaseSlot = await acquireWsSlot();
  try {
    const stream = await synthesizeStreamOnce({
      cleanText: normalized.cleanText,
      voice: normalized.voice,
      lang: normalized.lang,
      rateStr: normalized.rateStr,
      pitch: normalized.pitch,
      onTurnEnd: (fullAudio) => {
        markEdgeHealthy();
        onTurnEnd?.({
          audio: fullAudio,
          voice: normalized.voice,
          engine: "edge-neural",
          contentType: "audio/mpeg",
          cloneUsed: false,
          fallbackReason,
        });
      },
      onDone: releaseSlot,
    });
    return {
      stream,
      voice: normalized.voice,
      engine: "edge-neural",
      contentType: "audio/mpeg",
      cloneUsed: false,
      fallbackReason,
    };
  } catch (err) {
    const typed = err as { statusCode?: number } | null;
    if (typed?.statusCode === 403) {
      const retryRelease = await acquireWsSlot();
      try {
        const stream = await synthesizeStreamOnce({
          cleanText: normalized.cleanText,
          voice: normalized.voice,
          lang: normalized.lang,
          rateStr: normalized.rateStr,
          pitch: normalized.pitch,
          onTurnEnd: (fullAudio) => {
            markEdgeHealthy();
            onTurnEnd?.({
              audio: fullAudio,
              voice: normalized.voice,
              engine: "edge-neural",
              contentType: "audio/mpeg",
              cloneUsed: false,
              fallbackReason,
            });
          },
          onDone: retryRelease,
        });
        return {
          stream,
          voice: normalized.voice,
          engine: "edge-neural",
          contentType: "audio/mpeg",
          cloneUsed: false,
          fallbackReason,
        };
      } catch (retryErr) {
        markEdgeDegraded();
        try {
          return await runGoogleFallbackStream();
        } catch {
          throw retryErr;
        }
      }
    }
    markEdgeDegraded();
    try {
      return await runGoogleFallbackStream();
    } catch {
      throw err;
    }
  }
}

export async function synthesizeEdgeTtsStream(
  input: SynthesizeTtsInput
): Promise<SynthesizeTtsStreamResult> {
  const normalized = validateAndNormalizeTtsInput(input);
  const cacheKey = buildTtsCacheKey(normalized);

  const cached = ttsCache.get(cacheKey);
  if (cached) {
    return {
      stream: bufferToReadableStream(cached.audio),
      audio: cached.audio,
      voice: cached.voice,
      role: cached.role ?? normalized.role,
      lang: normalized.lang,
      rateStr: normalized.rateStr,
      pitch: normalized.pitch,
      cacheHit: true,
      engine: cached.engine ?? "edge-neural",
      contentType: cached.contentType ?? "audio/mpeg",
      cloneUsed: cached.cloneUsed ?? false,
      fallbackReason: cached.fallbackReason,
    };
  }

  const res = await synthesizeWithSkewRetryStream(normalized, (meta) => {
    ttsCache.set(cacheKey, {
      audio: meta.audio,
      voice: meta.voice,
      role: normalized.role,
      lang: normalized.lang,
      rateStr: normalized.rateStr,
      pitch: normalized.pitch,
      cacheHit: false,
      engine: meta.engine,
      contentType: meta.contentType,
      cloneUsed: meta.cloneUsed,
      fallbackReason: meta.fallbackReason,
    });
  });

  return {
    stream: res.stream,
    audio: res.audio,
    voice: res.voice,
    role: normalized.role,
    lang: normalized.lang,
    rateStr: normalized.rateStr,
    pitch: normalized.pitch,
    cacheHit: false,
    engine: res.engine,
    contentType: res.contentType,
    cloneUsed: res.cloneUsed,
    fallbackReason: res.fallbackReason,
  };
}

export function getTtsCacheStats() {
  return ttsCache.stats();
}

export function resetTtsCacheForTesting(): void {
  (ttsCache as any).store?.clear();
  (ttsCache as any).totalBytes = 0;
  edgeDegradedUntil = 0;
  edgeProbeInFlight = null;
  ffmpegAvailabilityOverride = null;
  cachedFfmpegAvailable = null;
  cachedFfmpegPath = null;
}

export function populateTtsCacheForTesting(input: SynthesizeTtsInput, audio: Buffer): void {
  const normalized = validateAndNormalizeTtsInput(input);
  const cacheKey = buildTtsCacheKey(normalized);
  ttsCache.set(cacheKey, {
    audio,
    voice: normalized.voice,
    role: normalized.role,
    lang: normalized.lang,
    rateStr: normalized.rateStr,
    pitch: normalized.pitch,
    cacheHit: false,
    contentType: detectAudioContentType(audio) ?? "audio/mpeg",
    cloneUsed: false,
  });
}

let edgeWarmStarted = false;
export function warmEdgeTtsVoices(): void {
  if (edgeWarmStarted || process.env.NODE_ENV !== "production") return;
  edgeWarmStarted = true;
  const primes: SynthesizeTtsInput[] = [
    { text: "Chính xác!", role: "khanh_vy", lang: "vi", rate: DEFAULT_SERVER_TTS_RATE },
    { text: "Đã hết thời gian!", role: "ngoc_huy", lang: "vi", rate: DEFAULT_SERVER_TTS_RATE },
  ];
  for (const item of primes) {
    void synthesizeEdgeTts(item).catch(() => {});
  }
}
