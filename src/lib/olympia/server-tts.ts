import crypto from "node:crypto";
import path from "node:path";
import type WebSocketType from "ws";

export type TtsRole = "khanh_vy" | "ngoc_huy";
export type TtsLang = "vi" | "en";
export type TtsLangInput = TtsLang | "auto";

export interface SynthesizeTtsInput {
  text: string;
  role: TtsRole;
  lang?: TtsLangInput;
  rate?: number;
  pitch?: number | string;
  voice?: string;
}

export interface SynthesizeTtsResult {
  audio: Buffer;
  voice: string;
  lang: TtsLang;
  rateStr: string;
  pitch: string;
  cacheHit: boolean;
}

export interface SynthesizeTtsStreamResult {
  stream: ReadableStream<Uint8Array>;
  audio?: Buffer;
  voice: string;
  lang: TtsLang;
  rateStr: string;
  pitch: string;
  cacheHit: boolean;
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
const WS_TIMEOUT_MS = 4500;
const FIRST_AUDIO_STALL_MS = 2800;
const MAX_CONCURRENT_WS = 8;

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

export function mapRateToProsody(rate?: number): string {
  if (rate === undefined) return "+0%";
  if (typeof rate !== "number" || !Number.isFinite(rate)) {
    throw new TtsValidationError("rate must be a finite number");
  }
  const clamped = Math.min(2.0, Math.max(0.5, rate));
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

export function validateAndNormalizeTtsInput(input: unknown): {
  cleanText: string;
  role: TtsRole;
  lang: TtsLang;
  voice: string;
  rateStr: string;
  pitch: string;
} {
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

  if (obj.role !== "khanh_vy" && obj.role !== "ngoc_huy") {
    throw new TtsValidationError('role must be "khanh_vy" or "ngoc_huy"');
  }
  const role: TtsRole = obj.role;

  let resolvedLang: TtsLang;
  if (obj.lang === undefined || obj.lang === "auto") {
    resolvedLang = detectTtsLanguage(sanitized);
  } else if (obj.lang === "vi" || obj.lang === "en") {
    resolvedLang = obj.lang;
  } else {
    throw new TtsValidationError('lang must be "vi", "en", or "auto"');
  }

  const rateStr = mapRateToProsody(obj.rate as number | undefined);
  const pitch = normalizePitch(obj.pitch as number | string | undefined);

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
    rateStr,
    pitch,
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
      handshakeTimeout: 3000,
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

async function synthesizeWithSkewRetry(params: {
  cleanText: string;
  voice: string;
  lang: TtsLang;
  rateStr: string;
  pitch: string;
}): Promise<Buffer> {
  return withWsConcurrencyLimit(async () => {
    try {
      return await synthesizeOnce(params);
    } catch (err) {
      const typed = err as { statusCode?: number; closeCode?: number } | null;
      if (typed?.statusCode === 403 || typed?.closeCode === 1006) {
        return await synthesizeOnce(params);
      }
      throw err;
    }
  });
}

export async function synthesizeEdgeTts(input: SynthesizeTtsInput): Promise<SynthesizeTtsResult> {
  const normalized = validateAndNormalizeTtsInput(input);
  const cacheKey = `${normalized.voice}|${normalized.rateStr}|${normalized.pitch}|${normalized.cleanText}`;

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
    const audio = await synthesizeWithSkewRetry({
      cleanText: normalized.cleanText,
      voice: normalized.voice,
      lang: normalized.lang,
      rateStr: normalized.rateStr,
      pitch: normalized.pitch,
    });
    const entry: SynthesizeTtsResult = {
      audio,
      voice: normalized.voice,
      lang: normalized.lang,
      rateStr: normalized.rateStr,
      pitch: normalized.pitch,
      cacheHit: false,
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
      handshakeTimeout: 3000,
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

async function synthesizeWithSkewRetryStream(params: {
  cleanText: string;
  voice: string;
  lang: TtsLang;
  rateStr: string;
  pitch: string;
  onTurnEnd?: (fullAudio: Buffer) => void;
}): Promise<ReadableStream<Uint8Array>> {
  const releaseSlot = await acquireWsSlot();
  try {
    return await synthesizeStreamOnce({
      ...params,
      onDone: releaseSlot,
    });
  } catch (err) {
    const typed = err as { statusCode?: number; closeCode?: number } | null;
    if (typed?.statusCode === 403 || typed?.closeCode === 1006) {
      const retryRelease = await acquireWsSlot();
      try {
        return await synthesizeStreamOnce({
          ...params,
          onDone: retryRelease,
        });
      } catch (retryErr) {
        throw retryErr;
      }
    }
    throw err;
  }
}

export async function synthesizeEdgeTtsStream(
  input: SynthesizeTtsInput
): Promise<SynthesizeTtsStreamResult> {
  const normalized = validateAndNormalizeTtsInput(input);
  const cacheKey = `${normalized.voice}|${normalized.rateStr}|${normalized.pitch}|${normalized.cleanText}`;

  const cached = ttsCache.get(cacheKey);
  if (cached) {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(cached.audio));
        controller.close();
      },
    });
    return {
      stream,
      audio: cached.audio,
      voice: normalized.voice,
      lang: normalized.lang,
      rateStr: normalized.rateStr,
      pitch: normalized.pitch,
      cacheHit: true,
    };
  }

  const stream = await synthesizeWithSkewRetryStream({
    cleanText: normalized.cleanText,
    voice: normalized.voice,
    lang: normalized.lang,
    rateStr: normalized.rateStr,
    pitch: normalized.pitch,
    onTurnEnd: (fullAudio) => {
      ttsCache.set(cacheKey, {
        audio: fullAudio,
        voice: normalized.voice,
        lang: normalized.lang,
        rateStr: normalized.rateStr,
        pitch: normalized.pitch,
        cacheHit: false,
      });
    },
  });

  return {
    stream,
    voice: normalized.voice,
    lang: normalized.lang,
    rateStr: normalized.rateStr,
    pitch: normalized.pitch,
    cacheHit: false,
  };
}

export function getTtsCacheStats() {
  return ttsCache.stats();
}

export function resetTtsCacheForTesting(): void {
  (ttsCache as any).store?.clear();
  (ttsCache as any).totalBytes = 0;
}

export function populateTtsCacheForTesting(input: SynthesizeTtsInput, audio: Buffer): void {
  const normalized = validateAndNormalizeTtsInput(input);
  const cacheKey = `${normalized.voice}|${normalized.rateStr}|${normalized.pitch}|${normalized.cleanText}`;
  ttsCache.set(cacheKey, {
    audio,
    voice: normalized.voice,
    lang: normalized.lang,
    rateStr: normalized.rateStr,
    pitch: normalized.pitch,
    cacheHit: false,
  });
}

let edgeWarmStarted = false;
export function warmEdgeTtsVoices(): void {
  if (edgeWarmStarted || process.env.NODE_ENV !== "production") return;
  edgeWarmStarted = true;
  const primes: SynthesizeTtsInput[] = [
    { text: "Chính xác!", role: "khanh_vy", lang: "vi", rate: 1.05 },
    { text: "Đã hết thời gian!", role: "ngoc_huy", lang: "vi", rate: 1.05 },
  ];
  for (const item of primes) {
    void synthesizeEdgeTts(item).catch(() => {});
  }
}
