/**
 * Olympia Text-to-Speech (TTS) Engine & Dual-MC Broadcast Script System
 *
 * - Multi-role Voice Acting: Khánh Vy (Female, pitch 1.12) & Ngọc Huy (Male, pitch 0.88)
 * - Dual-engine playback:
 *     1. Server TTS (`POST /api/olympia/tts`) -> WebAudio `AudioContext` + `GainNode` (with `HTMLAudioElement` secondary)
 *     2. Automatic browser `window.speechSynthesis` fallback on server failure/503/offline
 * - 3D MC Lip-Sync Event (`__olympiaTtsSpeaker` + `CustomEvent("olympia:tts-speaker")`)
 * - Season-Aware Speed Separation:
 *     * Question reading: O20-O22 rapid-fire (1.40x) vs O23-O27 ~5s cadence (1.08x)
 *     * Narration / greetings / results / ceremonies: lively broadcast cadence (~1.04-1.06x)
 *     * Host `baseRate` scaling (0.75..1.5, clamped to [0.5, 2.0])
 * - Auto English detection & mixed Vietnamese/English clause segmentation
 * - Word/phrase-boundary natural stop + KD/CHP ~500ms reflex pause & Về Đích 2500ms dramatic steal delay
 * - Complete R2 ceremonial scripts, R6 manual TS1->TSX post-match summary, R8 modular award tiers
 * - Strict 6-mode per-turn MC alternation, hype fillers, data-grounded explanations, VCNV/TT grouping & typo checks
 */

import type { CustomTtsScriptConfig, McVoiceCustomization } from "./types";

export type MCRole = "khanh_vy" | "ngoc_huy" | "khanhVy" | "ngocHuy" | "auto" | "random";
export type DualMcRole = "khanh_vy" | "ngoc_huy";
export type TtsLang = "vi" | "en";
export type TtsEngineMode = "server" | "webspeech";
export type TtsSpeedCategory = "question" | "narration";
export type ActiveTtsSpeaker = DualMcRole | null;

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
  | "cnv_elimination"
  | "lobby_greeting"
  | "opening_duo"
  | "contestant_intro"
  | "breather"
  | "ready_check"
  | "round_transition"
  | "score_summary"
  | "post_match_summary"
  | "final_awards"
  | "closing_farewell"
  | "hype_filler"
  | "explain_answer"
  | "explanation"
  | "vcnv_row_prompt"
  | "package_intro";

export interface SpeakTTSOptions {
  role?: MCRole;
  season?: string;
  segment?: TTSSegment;
  seatId?: number;
  round?: string;
  segIdx?: number;
  rowIdx?: number;
  qIdx?: number;
  turnIdx?: number;
  segKind?: "solo" | "shared" | "turn";
  sharedStartSegIdx?: number;
  lastSoloSegIdx?: number;
  randomRole?: boolean;
  isConsecutive?: boolean;
  delayMs?: number;
  baseRate?: number;
  lang?: "vi" | "en" | "auto";
  speedCategory?: TtsSpeedCategory;
  preferServer?: boolean;
  engine?: "server" | "webspeech" | "auto";
  pitch?: number | string;
  voice?: string;
  voiceConfig?: McVoiceCustomization;
  noCancel?: boolean;
  vars?: Record<string, string | number | undefined | null>;
  deterministic?: boolean;
  onEnd?: () => void;
  onError?: (err: unknown) => void;
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

export interface TtsEngineStatus {
  mode: TtsEngineMode;
  lastFallbackReason: string | null;
  lastUpdatedAt: number;
  serverCooldownUntil: number;
}

export interface TtsTransportConfig {
  endpoint?: string;
  timeoutMs?: number;
  cooldownMs?: number;
  fetchImpl?: typeof fetch;
}

export interface LanguageSpeechSegment {
  text: string;
  lang: TtsLang;
}

export type TtsSegmentKind =
  | "narration"
  | "greeting"
  | "hype"
  | "contestant_intro"
  | "breather"
  | "ready_check"
  | "round_transition"
  | "summary_item"
  | "summary_commentary"
  | "post_match_opening"
  | "post_match_item"
  | "award_item"
  | "tie_notice"
  | "farewell";

export type OlympiaAwardAudioTrack =
  | "6_NhacKhac/summary_rank_1"
  | "6_NhacKhac/summary_rank_2"
  | "6_NhacKhac/summary_rank_3"
  | "6_NhacKhac/summary_rank_4"
  | "6_NhacKhac/prize_award"
  | "6_NhacKhac/ending_music";

export type OlympiaAwardScriptTier = "third" | "second" | "first" | "closing";

export interface DualMcScriptSegment {
  role: DualMcRole;
  text: string;
  kind: TtsSegmentKind;
  pauseAfterMs?: number;
  seatId?: number;
  lang?: "vi" | "en" | "auto";
  audioTrack?: OlympiaAwardAudioTrack;
  playbackRate?: number;
  pitchRate?: number;
  rank?: number;
  awardLabel?: string;
}

export interface ContestantScriptInput {
  id: number;
  name: string;
  school?: string;
  score: number;
  approved?: boolean;
}

export interface OlympiaRankedContestant {
  seat: ContestantScriptInput;
  rank: number;
  position: number;
  awardLabel: "Quán quân" | "Giải Nhì" | "Giải Ba" | "Đồng Giải Ba";
  spokenAwardLabel: string;
  audioTrack:
    | "6_NhacKhac/summary_rank_1"
    | "6_NhacKhac/summary_rank_2"
    | "6_NhacKhac/summary_rank_3"
    | "6_NhacKhac/summary_rank_4";
  playbackRate: number;
  pitchRate: number;
}

export const VARIABLE_ALIAS_MAP: Record<string, string[]> = {
  tenThiSinh: ["tenThiSinh", "name", "contestantName", "ten"],
  tenTruong: ["tenTruong", "school", "schoolName", "truong"],
  diemSo: ["diemSo", "score", "points", "diem"],
  thuHang: ["thuHang", "rank", "hang"],
  thayDoiHang: ["thayDoiHang", "rankChange", "thayDoi"],
  thoiGianConLai: ["thoiGianConLai", "timeLeft", "remainingTime", "thoiGian"],
  dapAnDung: ["dapAnDung", "correctAnswer", "answer", "dapAn"],
  tenPhong: ["tenPhong", "roomName"],
  soChuCai: ["soChuCai", "letterCount"],
  soHangNgang: ["soHangNgang", "rowNumber"],
  soGiayNhanhNhat: ["soGiayNhanhNhat", "fastestSeconds"],
  tenNhanhNhat: ["tenNhanhNhat", "fastestContestant"],
  soThuTu: ["soThuTu", "orderNumber"],
  noiDungCauHoi: ["noiDungCauHoi", "questionContent", "content"],
  viTri: ["viTri", "soGhe", "seatNumber", "position"],
  tenGiaiBa: ["tenGiaiBa", "thirdPlaceName"],
  diemGiaiBa: ["diemGiaiBa", "thirdPlaceScore"],
  tenGiaiNhi: ["tenGiaiNhi", "secondPlaceName"],
  tenTruongGiaiNhi: ["tenTruongGiaiNhi", "secondPlaceSchool"],
  diemGiaiNhi: ["diemGiaiNhi", "secondPlaceScore"],
  tenQuanQuan: ["tenQuanQuan", "championName", "firstPlaceName"],
  tenTruongQuanQuan: ["tenTruongQuanQuan", "championSchool", "firstPlaceSchool"],
  diemQuanQuan: ["diemQuanQuan", "championScore", "firstPlaceScore"],
};

/**
 * Standard Default Olympia Broadcast Scripts (VTV3 format)
 */
export const DEFAULT_OLYMPIA_SCRIPTS: CustomTtsScriptConfig = {
  lobbyGreeting: [
    "Chào mừng các bạn thí sinh và quý vị khán giả đã đến với trường quay S14 của Đường lên đỉnh Olympia! Trận đấu {tenPhong} sẽ chính thức bắt đầu trong ít phút nữa. Các bạn hãy kiểm tra lại đường truyền, thiết bị và chuẩn bị tinh thần thật sẵn sàng nhé!",
    "Xin chào mừng tất cả các bạn đã có mặt tại trường quay Đường lên đỉnh Olympia. Hãy chuẩn bị tinh thần thật sẵn sàng để bước vào hành trình chinh phục đỉnh núi tri thức!",
  ],
  openingDuo: {
    khanhVy: "Xin nhiệt liệt chào đón quý vị khán giả và các bạn đang theo dõi cuộc thi Đường lên đỉnh Olympia ngày hôm nay!",
    ngocHuy: "Đúng vậy thưa quý vị, 4 nhà leo núi của chúng ta hôm nay đã sẵn sàng, tràn đầy tự tin và quyết tâm để chinh phục đỉnh núi tri thức và chiếc Vòng nguyệt quế vinh quang!",
  },
  contestantIntroPattern: "Xin được giới thiệu thí sinh {tenThiSinh} đến từ trường {tenTruong}.",
  roundIntros: {
    khoiDongSolo: "Và ngay bây giờ, chúng ta sẽ cùng bước vào phần thi đầu tiên mang tên Khởi Động! Người đầu tiên bước vào lượt thi cá nhân là bạn {tenThiSinh} đến từ trường {tenTruong}. Bạn sẽ có 6 câu hỏi để ghi những điểm số đầu tiên. Chúc bạn thật tự tin, bình tĩnh và có một màn khởi động thành công rực rỡ!",
    khoiDongShared: "Và bây giờ là lượt thi Khởi Động chung! Các bạn thí sinh hãy chuẩn bị sẵn sàng tay trên bàn phím chuông, chúc cả 4 bạn sẽ có một màn khởi động thật suôn sẻ, bứt phá và giành được thật nhiều điểm số!",
    khoiDong: "Và ngay bây giờ, chúng ta sẽ cùng bước vào phần thi đầu tiên mang tên Khởi Động!",
    vuotChuongNgaiVat: "Chào mừng quý vị và các bạn đến với phần thi thứ hai: Vượt chướng ngại vật! Thử thách của chúng ta ngày hôm nay là một Chướng ngại vật gồm {soChuCai} chữ cái. Mỗi câu trả lời đúng ở các hàng ngang sẽ mở ra một góc hình ảnh gợi ý. Chúc 4 thí sinh thi đấu thật tập trung và bản lĩnh!",
    tangToc: "Cơ hội nâng cao điểm số và tạo ra bước ngoặt đang chờ đón 4 thí sinh ở phần thi thứ ba: Tăng tốc! Có 4 câu hỏi với thời gian suy nghĩ lần lượt là 10, 20, 30 và 40 giây. Các bạn hãy tận dụng tối đa từng phần trăm giây để giành lấy số điểm tối đa 40, 30, 20 và 10 điểm nhé!",
    veDich: "Và bây giờ là phần thi quyết định, phần thi cuối cùng của trận đấu: Về Đích! Nơi thể hiện bản lĩnh, chiến thuật và ý chí kiên định của các nhà leo núi. Điểm số hoàn toàn có thể thay đổi sau từng câu hỏi!",
    cauHoiPhu: "Do có sự bằng điểm ở vị trí phân định, chúng ta sẽ bước vào phần thi Câu hỏi phụ để tìm ra người chiến thắng xứng đáng!",
  },
  correctResponses: [
    "Chính xác! Thêm 10 điểm!",
    "Rất chuẩn xác!",
    "Câu trả lời hoàn toàn chính xác!",
    "{dapAnDung}? Vâng, hoàn toàn chính xác!",
    "{dapAnDung}! Đúng rồi!",
    "{dapAnDung} chính là câu trả lời chính xác!",
  ],
  wrongResponses: [
    "{dapAnDung} mới là đáp án chính xác, rất tiếc!",
    "Rất tiếc, câu trả lời đúng phải là {dapAnDung}.",
    "Chưa đúng rồi, đáp án là {dapAnDung}.",
    "Không phải, phải là {dapAnDung}.",
  ],
  postMatchOpening: "Kính thưa quý vị khán giả và các bạn, những giây phút thi đấu căng thẳng, kịch tính và đầy cảm xúc của trận đấu ngày hôm nay đã chính thức khép lại. Bây giờ, chúng ta hãy cùng nhìn lại điểm số chung cuộc và vinh danh những nhà leo núi xuất sắc nhất!",
  awardTiers: {
    third: "Xin được chúc mừng và trao Giải Ba của cuộc thi hôm nay cho bạn {tenGiaiBa} với tổng số điểm là {diemGiaiBa} điểm!",
    second: "Và xin được vinh danh Giải Nhì thuộc về bạn {tenGiaiNhi} đến từ trường {tenTruongGiaiNhi} với số điểm rất ấn tượng: {diemGiaiNhi} điểm!",
    first: "Và bây giờ, khoảnh khắc được mong đợi nhất... Xin nhiệt liệt chúc mừng Quán quân của Đường lên đỉnh Olympia tuần này, chủ nhân của chiếc Vòng nguyệt quế vinh quang: Bạn {tenQuanQuan} đến từ {tenTruongQuanQuan} với {diemQuanQuan} điểm!",
  },
  closingFarewell: [
    "Một trận đấu vô cùng xuất sắc và xứng đáng. Xin cảm ơn quý vị khán giả đã luôn đồng hành, cổ vũ nhiệt tình cho các nhà leo núi của chúng ta!",
    "Hẹn gặp lại quý vị khán giả và các bạn trong những cuộc tranh tài tiếp theo của Đường lên đỉnh Olympia! Xin kính chào tạm biệt và hẹn gặp lại!",
  ],
  mcVoiceConfig: {
    khanhVy: { pitch: 1.12, rate: 1.05 },
    ngocHuy: { pitch: 0.88, rate: 1.04 },
  },
};

let activeCustomTtsScripts: CustomTtsScriptConfig | null = null;

export function setGlobalCustomTtsScripts(scripts: CustomTtsScriptConfig | null): void {
  activeCustomTtsScripts = scripts;
}

export function getGlobalCustomTtsScripts(): CustomTtsScriptConfig | null {
  return activeCustomTtsScripts;
}

export function interpolateTemplate(
  template: string,
  vars: Record<string, string | number | undefined | null>
): string {
  if (!template) return "";
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
    // 1. Direct lookup
    if (vars[key] !== undefined && vars[key] !== null) {
      return String(vars[key]);
    }
    // 2. Alias resolution
    for (const [canonical, aliases] of Object.entries(VARIABLE_ALIAS_MAP)) {
      if (aliases.includes(key) || canonical === key) {
        for (const alias of aliases) {
          if (vars[alias] !== undefined && vars[alias] !== null) {
            return String(vars[alias]);
          }
        }
      }
    }
    // 3. Retain unprovided token safely
    return match;
  });
}

export interface AwardCeremonyStep {
  rank: number;
  position: number;
  awardLabel: "Quán quân" | "Giải Nhì" | "Giải Ba" | "Đồng Giải Ba";
  seatIds: number[];
  audioTrack: OlympiaAwardAudioTrack;
  playbackRate: number;
  pitchRate: number;
}

export interface AwardCeremonyPlan {
  isTieForFirst: boolean;
  tiedLeaderIds: number[];
  rankings: OlympiaRankedContestant[];
  steps: AwardCeremonyStep[];
  segments: DualMcScriptSegment[];
}

export interface DualMcSpeakOptions {
  season?: string;
  baseRate?: number;
  preferServer?: boolean;
  engine?: "server" | "webspeech" | "auto";
  onSegmentStart?: (segment: DualMcScriptSegment, index: number) => void;
  onEnd?: () => void;
}

export type HypeFillerCategory =
  | "streak"
  | "steal"
  | "big_points"
  | "dramatic"
  | "encouragement";

export const TTS_BASE_RATE_MIN = 0.75;
export const TTS_BASE_RATE_MAX = 1.5;
export const TTS_BASE_RATE_DEFAULT = 1.0;

export const KD_CHP_REFLEX_PAUSE_MS = 500;
export const KD_CHP_POST_BELL_CALLOUT_MS = 500;
export const VE_DICH_DRAMATIC_STEAL_DELAY_MS = 2500;

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function normalizeDualRole(role?: MCRole): DualMcRole | null {
  if (!role || role === "auto" || role === "random") return null;
  if (role === "khanhVy" || role === "khanh_vy") return "khanh_vy";
  if (role === "ngocHuy" || role === "ngoc_huy") return "ngoc_huy";
  return null;
}

export function pickRandomMCRole(rng: () => number = Math.random): DualMcRole {
  return rng() < 0.5 ? "khanh_vy" : "ngoc_huy";
}

// ============================================================================
// 1. Vietnamese Broadcast Normalization & Answer Summarization
// ============================================================================

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
  // Convert standalone fractions (e.g. 1/2) while protecting dd/mm/yyyy dates (e.g. 2/9/1945)
  t = t.replace(/\b(\d+\/\d+\/\d+)\b|\b(\d+)\/(\d+)\b/g, (full, dateStr, num, den) => {
    if (dateStr) return dateStr;
    return `${num} phần ${den}`;
  });
  t = t.replace(/(?:°\s*C|°C|\bđộ\s*C\b)/gi, "độ xê");
  t = t.replace(/%/g, " phần trăm");
  return t.replace(/\s+/g, " ").trim();
}

const DANGLING_TRAILING_WORDS = new Set([
  "và",
  "của",
  "là",
  "tại",
  "ở",
  "trong",
  "vào",
  "cho",
  "với",
  "các",
  "những",
  "một",
  "bằng",
  "đến",
  "từ",
  "do",
  "vì",
  "để",
  "khi",
  "nhằm",
  "gồm",
  "nơi",
  "mà",
  "hay",
  "hoặc",
]);

const BOUNDARY_CONJUNCTIONS = new Set([
  "mà",
  "vì",
  "do",
  "để",
  "khi",
  "nhằm",
  "với",
  "gồm",
  "nơi",
  "bởi",
  "sau",
]);

/**
 * Summarize raw database answer for concise spoken vocalization:
 * - Strips answer prefixes ("Đáp án:", "Kết quả:")
 * - Strips letter/point count annotations and clarifying parentheticals
 * - Takes first alternative from ";" or "/" lists (preserving units, fractions, and dd/mm/yyyy dates)
 * - Truncates excessively verbose answers (>8 words) cleanly at phrase boundaries
 * - Runs Vietnamese broadcast normalization at the end
 */
export function summarizeOlympiaAnswer(rawAnswer: string): string {
  if (!rawAnswer) return "";
  let a = rawAnswer.trim();

  // Strip markdown before structural parsing
  a = a.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").trim();

  // Strip prefixes like "Đáp án:", "Đáp án là:", "Kết quả là:", "Từ khóa là:", etc.
  a = a.replace(/^(đáp án|kết quả|từ khóa|câu trả lời)(\s+(đúng\s+)?là)?\s*[:=]?\s*/i, "").trim();

  // Strip parenthetical count annotations: (10 điểm), (7 chữ cái), etc.
  a = a.replace(/\(\s*\d+\s*(điểm|chữ cái|ký tự|giây)\s*\)/gi, "").trim();

  // Iteratively strip parenthetical clarifications while keeping primary answer if substantive
  let prev = "";
  while (a !== prev) {
    prev = a;
    const stripped = a.replace(/\s*\([^()]*\)/g, "").trim();
    if (stripped.length >= 2) {
      a = stripped;
    } else {
      const inner = a.match(/^\(([^()]+)\)$/);
      if (inner) a = inner[1].trim();
      break;
    }
  }

  // Split semicolon or pipe alternatives first
  if (a.includes(";")) {
    a = a.split(";")[0].trim();
  }
  if (a.includes(" | ")) {
    a = a.split(" | ")[0].trim();
  }

  // Handle slash alternatives: take first alternative while protecting units, fractions, and dd/mm/yyyy dates
  if (a.includes("/")) {
    const isDate = /^\s*\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\s*$/.test(a);
    const isUnitOrFraction = /^\s*(\d+\/\d+|[a-zA-Z]+\/[a-zA-Z0-9]+)\s*$/.test(a);
    if (!isDate && !isUnitOrFraction) {
      const slashParts = a.split(/\s+\/\s+/);
      if (slashParts.length > 1) {
        a = slashParts[0].trim();
      } else {
        const match = a.match(/^(.*?)\s*\/\s*(.*)$/);
        if (match) {
          const before = match[1].trim();
          const after = match[2].trim();
          const isSlashUnit =
            /(?:km|m|cm|mm|rad|kg|g)\s*$/i.test(before) &&
            /^\s*(?:h|s|m3|cm3|kg)/i.test(after);
          const isFractionOrDate =
            /\d+\s*$/.test(before) && /^\s*\d+(?:\/\d+)?/.test(after);
          if (!isSlashUnit && !isFractionOrDate && before.length >= 1) {
            a = before;
          }
        }
      }
    }
  }

  // Clean dangling separators
  a = a.replace(/[,;:\-–—]+$/, "").trim();

  // Truncate overly long explanatory sentences (> 8 words) at natural phrase boundaries
  const words = a.split(/\s+/).filter(Boolean);
  if (words.length > 8) {
    const clauseMatch = a.match(/^([^,;:]+)[,;:]/);
    let chosen: string | null = null;
    if (clauseMatch) {
      const clauseWords = clauseMatch[1].trim().split(/\s+/).filter(Boolean);
      if (clauseWords.length >= 2 && clauseWords.length <= 8) {
        chosen = clauseMatch[1].trim();
      }
    }

    if (!chosen) {
      const dashMatch = a.match(/^(.*?)\s+[–—-]\s+/);
      if (dashMatch) {
        const dashWords = dashMatch[1].trim().split(/\s+/).filter(Boolean);
        if (dashWords.length >= 2 && dashWords.length <= 8) {
          chosen = dashMatch[1].trim();
        }
      }
    }

    if (!chosen) {
      for (let i = 3; i <= 8 && i < words.length; i++) {
        const lower = words[i].toLowerCase().replace(/[.,;:!?]+$/, "");
        if (BOUNDARY_CONJUNCTIONS.has(lower)) {
          chosen = words.slice(0, i).join(" ");
          break;
        }
      }
    }

    if (!chosen) {
      const sliced = words.slice(0, 8);
      while (
        sliced.length > 2 &&
        DANGLING_TRAILING_WORDS.has(sliced[sliced.length - 1].toLowerCase().replace(/[.,;:!?]+$/, ""))
      ) {
        sliced.pop();
      }
      chosen = sliced.join(" ");
    }

    a = chosen.replace(/[,;:\-–—]+$/, "").trim();
  }

  return normalizeVietnameseTTS(a);
}

// ============================================================================
// 2. Speed Separation, Base Rate & English / Mixed-Language Detection
// ============================================================================

let ttsBaseRate = TTS_BASE_RATE_DEFAULT;

if (typeof window !== "undefined") {
  try {
    const rawRate = window.localStorage?.getItem("olympia_tts_base_rate");
    if (rawRate != null) {
      const parsed = Number(rawRate);
      if (Number.isFinite(parsed)) {
        ttsBaseRate = clamp(parsed, TTS_BASE_RATE_MIN, TTS_BASE_RATE_MAX);
      }
    }
  } catch {}
}

export function getTtsBaseRate(): number {
  return ttsBaseRate;
}

export function setTtsBaseRate(rate: number): number {
  const safe = Number.isFinite(rate)
    ? +clamp(rate, TTS_BASE_RATE_MIN, TTS_BASE_RATE_MAX).toFixed(2)
    : TTS_BASE_RATE_DEFAULT;
  ttsBaseRate = safe;
  if (typeof window !== "undefined") {
    try {
      window.localStorage?.setItem("olympia_tts_base_rate", String(safe));
    } catch {}
  }
  return ttsBaseRate;
}

export function getTtsSpeedCategory(segment?: TTSSegment): TtsSpeedCategory {
  if (!segment || segment === "question") return "question";
  return "narration";
}

function getNarrationBaseTempo(segment?: TTSSegment): number {
  switch (segment) {
    case "buzzer":
    case "hype_filler":
    case "steal_callout":
      return 1.06;
    case "intro_greeting":
    case "lobby_greeting":
    case "opening_duo":
    case "contestant_intro":
    case "breather":
    case "ready_check":
    case "round_transition":
    case "final_awards":
    case "closing_farewell":
      return 1.04;
    default:
      return 1.05;
  }
}

/**
 * Season-aware reading rate calculation with question vs narration speed separation:
 * - Question speed:
 *     * O20-O22: Rapid-fire tempo (1.40x)
 *     * O23-O27: Moderate broadcast tempo (1.08x)
 *     * >25 words: 1.12x boost (capped at 1.65 before baseRate scaling)
 * - Narration speed:
 *     * Natural lively broadcast cadence (~1.04-1.06x), unaffected by O20-O22 sprint rate
 * - Scaled by Host `baseRate` (0.75..1.5), clamped to [0.5, 2.0]
 */
export function getSeasonReadingRate(
  season?: string,
  wordCount: number = 0,
  segmentOrOptions?:
    | TTSSegment
    | { segment?: TTSSegment; baseRate?: number; speedCategory?: TtsSpeedCategory }
): number {
  const segment =
    typeof segmentOrOptions === "string"
      ? segmentOrOptions
      : segmentOrOptions?.segment;
  const explicitCategory =
    typeof segmentOrOptions === "object" && segmentOrOptions !== null
      ? segmentOrOptions.speedCategory
      : undefined;
  const optBaseRate =
    typeof segmentOrOptions === "object" && segmentOrOptions !== null
      ? segmentOrOptions.baseRate
      : undefined;

  const category = explicitCategory ?? getTtsSpeedCategory(segment);
  const effectiveBaseRate = clamp(
    optBaseRate ?? ttsBaseRate,
    TTS_BASE_RATE_MIN,
    TTS_BASE_RATE_MAX
  );

  let tempo: number;
  if (category === "question") {
    const s = (season || "O26").toUpperCase();
    const isRapidSeason =
      s.includes("O20") ||
      s.includes("O21") ||
      s.includes("O22") ||
      s === "20" ||
      s === "21" ||
      s === "22";
    tempo = isRapidSeason ? 1.4 : 1.08;
    if (wordCount > 25) {
      tempo = Math.min(1.65, tempo * 1.12);
    }
  } else {
    tempo = getNarrationBaseTempo(segment);
  }

  return +clamp(tempo * effectiveBaseRate, 0.5, 2.0).toFixed(2);
}

const VI_DIACRITIC_RE =
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

const PROTECTED_VI_TOKENS = new Set([
  "vtv",
  "vtv3",
  "tp",
  "thpt",
  "thcs",
  "vn",
  "cnv",
  "vcnv",
  "gdp",
  "gnp",
  "wto",
  "unesco",
  "asean",
  "who",
  "dna",
  "rna",
  "atp",
  "co2",
  "h2o",
  "ch4",
  "so2",
  "http",
  "https",
  "html",
  "css",
  "cpu",
  "ram",
  "url",
  "usb",
  "ai",
  "it",
  "tv",
  "mc",
  "o20",
  "o21",
  "o22",
  "o23",
  "o24",
  "o25",
  "o26",
  "o27",
  "km",
  "cm",
  "mm",
  "kg",
  "mg",
  "hz",
  "khz",
  "mhz",
  "ghz",
  "kw",
  "mw",
  "kwh",
  "mol",
  "cal",
  "kcal",
  "rad",
]);

const STRONG_ENGLISH_WORDS = new Set([
  "the",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "what",
  "which",
  "who",
  "whom",
  "whose",
  "where",
  "when",
  "why",
  "how",
  "does",
  "did",
  "can",
  "could",
  "will",
  "would",
  "shall",
  "should",
  "may",
  "might",
  "must",
  "have",
  "has",
  "had",
  "of",
  "in",
  "on",
  "at",
  "to",
  "for",
  "with",
  "from",
  "by",
  "about",
  "into",
  "through",
  "during",
  "between",
  "among",
  "under",
  "over",
  "above",
  "below",
  "and",
  "or",
  "but",
  "nor",
  "if",
  "than",
  "that",
  "this",
  "these",
  "those",
  "there",
  "their",
  "they",
  "them",
  "we",
  "you",
  "your",
  "he",
  "she",
  "it",
  "its",
  "our",
  "as",
  "not",
  "only",
  "called",
  "known",
  "largest",
  "smallest",
  "longest",
  "highest",
  "capital",
  "country",
  "planet",
  "element",
  "century",
  "equation",
  "formula",
  "speed",
  "velocity",
  "energy",
  "photosynthesis",
  "algorithm",
  "democracy",
  "revolution",
  "temperature",
  "gravity",
  "molecule",
  "oxygen",
  "hydrogen",
  "nitrogen",
  "carbon",
  "continent",
  "ocean",
  "mountain",
  "river",
  "author",
  "novel",
  "symphony",
  "scientist",
  "discovered",
  "invented",
  "english",
  "science",
  "history",
  "biology",
  "chemistry",
  "physics",
  "mathematics",
  "solar",
  "system",
  "earth",
  "world",
  "water",
  "light",
  "cells",
  "cell",
  "plant",
  "plants",
  "animal",
  "animals",
  "human",
  "body",
  "blood",
  "heart",
  "brain",
  "first",
  "second",
  "third",
  "many",
  "much",
  "most",
  "more",
  "name",
  "following",
  "between",
]);

const ENGLISH_ONLY_MORPH_RE =
  /(?:tion|sion|ment|ness|ance|ence|able|ible|ious|eous|ight|ough|augh|logy|graphy|metry|sis|ism|ist|ity|ize|ise|[jwzf]|^wh|^sh|^sc|^sk|^sl|^sm|^sn|^sp|^st|^sw|^bl|^cl|^fl|^gl|^pl|^br|^cr|^dr|^fr|^gr|^pr|^wr|^kn|ck$|[bdefjklrsvwxz]{1}$)/i;

function isStrongEnglishToken(rawToken: string): boolean {
  const clean = rawToken.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  if (!clean || !/[a-zA-Z]/.test(clean)) return false;
  if (VI_DIACRITIC_RE.test(clean)) return false;
  const lower = clean.toLowerCase();
  if (PROTECTED_VI_TOKENS.has(lower)) return false;
  if (/^(?:km\/h|m\/s|cm\/s|mm\/s|rad\/s|kg\/m3|g\/cm3)$/i.test(clean)) return false;
  if (/^\d+$/.test(clean)) return false;
  if (STRONG_ENGLISH_WORDS.has(lower)) return true;
  if (clean.length >= 4 && ENGLISH_ONLY_MORPH_RE.test(clean)) return true;
  return false;
}

function isNeutralEnglishCandidate(rawToken: string): boolean {
  const clean = rawToken.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  if (!clean) return false;
  if (VI_DIACRITIC_RE.test(clean)) return false;
  const lower = clean.toLowerCase();
  if (PROTECTED_VI_TOKENS.has(lower)) return false;
  if (/^\d+(?:[.,:/-]\d+)*%?$/.test(clean)) return true;
  return /^[a-zA-Z0-9''-]+$/.test(clean);
}

/**
 * Detects whether an utterance as a whole is English ("en") or Vietnamese ("vi").
 * Protects Vietnamese abbreviations/acronyms (VTV3, TP., km/h, GDP, 1945) and unaccented Vietnamese names.
 */
export function detectTextLanguage(text: string): TtsLang {
  const raw = (text || "").trim();
  if (!raw) return "vi";
  if (VI_DIACRITIC_RE.test(raw)) {
    // Check if predominantly English with only minor accented name/borrow, or predominantly Vietnamese
    const tokens = raw.split(/\s+/).filter(Boolean);
    const viTokens = tokens.filter((t) => VI_DIACRITIC_RE.test(t)).length;
    const enTokens = tokens.filter((t) => isStrongEnglishToken(t)).length;
    if (viTokens === 0 && enTokens >= 2) return "en";
    if (enTokens >= 4 && enTokens >= viTokens * 3) return "en";
    return "vi";
  }

  // No Vietnamese diacritics
  const words = raw.split(/\s+/).filter((w) => /[a-zA-Z]/.test(w));
  if (words.length === 0) return "vi";

  let strongEn = 0;
  let englishStopCount = 0;
  for (const w of words) {
    const clean = w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "").toLowerCase();
    if (!clean || PROTECTED_VI_TOKENS.has(clean)) continue;
    if (STRONG_ENGLISH_WORDS.has(clean)) {
      strongEn++;
      englishStopCount++;
    } else if (isStrongEnglishToken(w)) {
      strongEn++;
    }
  }

  if (words.length === 1) {
    const singleClean = words[0].replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
    if (PROTECTED_VI_TOKENS.has(singleClean.toLowerCase())) return "vi";
    if (/^[A-Z0-9]{2,6}$/.test(singleClean)) return "vi";
    if (singleClean.length >= 6 && isStrongEnglishToken(singleClean)) return "en";
    return "vi";
  }

  if (englishStopCount >= 1 && strongEn >= 2) return "en";
  if (strongEn >= 2) return "en";
  return "vi";
}

/**
 * Splits mixed Vietnamese + English sentences into contiguous language segments
 * so each segment is spoken with the appropriate neural/WebSpeech voice.
 */
export function segmentMixedLanguageText(text: string): LanguageSpeechSegment[] {
  const raw = (text || "").trim();
  if (!raw) return [];

  if (!VI_DIACRITIC_RE.test(raw)) {
    return [{ text: raw, lang: detectTextLanguage(raw) }];
  }

  const tokens = raw.split(/(\s+)/);
  // Extract word-only indices for contextual run detection
  const wordIndices: number[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] && !/^\s+$/.test(tokens[i])) {
      wordIndices.push(i);
    }
  }

  if (wordIndices.length === 0) return [{ text: raw, lang: "vi" }];

  const tokenLangs = new Array<TtsLang>(wordIndices.length).fill("vi");
  const isStrongEn = wordIndices.map((idx) => isStrongEnglishToken(tokens[idx]));
  const isNeutral = wordIndices.map((idx) => isNeutralEnglishCandidate(tokens[idx]));
  const hasVi = wordIndices.map((idx) => VI_DIACRITIC_RE.test(tokens[idx]));
  const endsMajorClause = wordIndices.map((idx) => /[:;.!?]$/.test(tokens[idx]));

  // Mark clear English islands (>= 2 consecutive English/neutral tokens with >=1 strong EN, or single unmistakable long EN word)
  let i = 0;
  while (i < wordIndices.length) {
    if (hasVi[i]) {
      i++;
      continue;
    }
    const wordOnly = tokens[wordIndices[i]].replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
    const singleLongUnmistakableEn =
      wordOnly.length >= 6 &&
      isStrongEn[i] &&
      !PROTECTED_VI_TOKENS.has(wordOnly.toLowerCase()) &&
      ENGLISH_ONLY_MORPH_RE.test(wordOnly);

    if (isStrongEn[i]) {
      // Expand run left/right through adjacent neutral English tokens (without crossing Vi diacritics or major clauses)
      let start = i;
      while (
        start > 0 &&
        !hasVi[start - 1] &&
        !endsMajorClause[start - 1] &&
        isNeutral[start - 1] &&
        !/^\d+$/.test(tokens[wordIndices[start - 1]].replace(/[^\p{L}\p{N}]/gu, ""))
      ) {
        start--;
      }
      let end = i;
      while (
        end + 1 < wordIndices.length &&
        !endsMajorClause[end] &&
        !hasVi[end + 1] &&
        (isStrongEn[end + 1] || isNeutral[end + 1])
      ) {
        end++;
      }

      const runLen = end - start + 1;
      const strongCount = isStrongEn.slice(start, end + 1).filter(Boolean).length;
      if (runLen >= 2 || strongCount >= 2 || singleLongUnmistakableEn) {
        for (let k = start; k <= end; k++) {
          tokenLangs[k] = "en";
        }
        i = end + 1;
        continue;
      }
    }
    i++;
  }

  // Reconstruct segments and merge adjacent identical languages
  const tokenToWordIdx = new Map<number, number>();
  wordIndices.forEach((tokIdx, wIdx) => tokenToWordIdx.set(tokIdx, wIdx));

  const segments: LanguageSpeechSegment[] = [];
  let currentLang: TtsLang = tokenLangs[0];
  let buffer = "";

  for (let tIdx = 0; tIdx < tokens.length; tIdx++) {
    const tok = tokens[tIdx];
    const wIdx = tokenToWordIdx.get(tIdx);
    if (wIdx !== undefined) {
      const lang = tokenLangs[wIdx];
      if (lang !== currentLang && buffer.trim()) {
        segments.push({ text: buffer.trim(), lang: currentLang });
        buffer = "";
      }
      currentLang = lang;
    }
    buffer += tok;
  }
  if (buffer.trim()) {
    segments.push({ text: buffer.trim(), lang: currentLang });
  }

  // Merge any adjacent segments with same lang
  const merged: LanguageSpeechSegment[] = [];
  for (const seg of segments) {
    if (merged.length > 0 && merged[merged.length - 1].lang === seg.lang) {
      merged[merged.length - 1].text = `${merged[merged.length - 1].text} ${seg.text}`.trim();
    } else {
      merged.push({ ...seg });
    }
  }
  return merged;
}

// ============================================================================
// 3. Strict 6-Mode Per-Turn MC Alternation
// ============================================================================

/**
 * Resolves alternating hosts for turn/segment across all 6 modes:
 * - Khởi động solo: alternates per segIdx (even -> KV reads / NH co-hosts)
 * - Khởi động shared: locked to single MC pair for entire shared block, flipped vs last solo
 * - VCNV: alternates per rowIdx (same MC handles prompt, question, answers, verdict; row 4 continues)
 * - Tăng tốc: alternates per qIdx (even -> NH reads / KV confirms)
 * - Về đích: alternates per turnIdx (contestant package, NOT qIdx)
 * - Câu hỏi phụ: alternates per qIdx
 */
export function resolveTurnHosts(
  round: string,
  turnIdx: number = 0,
  options?: {
    segKind?: "solo" | "shared" | "turn";
    sharedStartSegIdx?: number;
    lastSoloSegIdx?: number;
  }
): {
  readingHost: DualMcRole;
  coHost: DualMcRole;
} {
  const normRound = (round || "").toLowerCase();

  if (normRound === "khoidong") {
    const effectiveIdx =
      options?.segKind === "shared" || options?.segKind === "turn"
        ? options.sharedStartSegIdx ??
          (options.lastSoloSegIdx != null ? options.lastSoloSegIdx + 1 : turnIdx)
        : turnIdx;
    const isEven = Math.abs(effectiveIdx) % 2 === 0;
    return {
      readingHost: isEven ? "khanh_vy" : "ngoc_huy",
      coHost: isEven ? "ngoc_huy" : "khanh_vy",
    };
  }

  if (normRound === "vcnv") {
    const isEven = Math.abs(turnIdx) % 2 === 0;
    return {
      readingHost: isEven ? "khanh_vy" : "ngoc_huy",
      coHost: isEven ? "ngoc_huy" : "khanh_vy",
    };
  }

  if (normRound === "tangtoc" || normRound === "vedich" || normRound === "cauhoiphu") {
    const isEven = Math.abs(turnIdx) % 2 === 0;
    return {
      readingHost: isEven ? "ngoc_huy" : "khanh_vy",
      coHost: isEven ? "khanh_vy" : "ngoc_huy",
    };
  }

  return {
    readingHost: "ngoc_huy",
    coHost: "khanh_vy",
  };
}

/**
 * Resolves active MC role based on round, seat, segment, and alternating turns.
 */
export function resolveMCRole(options?: SpeakTTSOptions): DualMcRole {
  if (options?.role === "random" || options?.randomRole) {
    return pickRandomMCRole();
  }
  const explicit = normalizeDualRole(options?.role);
  if (explicit) return explicit;

  const segment = options?.segment || "question";
  const round = options?.round || "khoiDong";
  const seatId = options?.seatId ?? 0;

  if (
    segment === "intro_greeting" ||
    segment === "lobby_greeting" ||
    segment === "opening_duo"
  ) {
    return "khanh_vy";
  }

  if (segment === "round_intro") {
    if (round === "vcnv" || round === "veDich") return "khanh_vy";
    return "ngoc_huy";
  }

  if (segment === "cnv_congratulate" || segment === "cnv_elimination") {
    return pickRandomMCRole();
  }

  // Khởi động
  if (round === "khoiDong") {
    const kdIdx = options?.segIdx ?? options?.turnIdx;
    if (kdIdx != null || options?.sharedStartSegIdx != null) {
      const { readingHost, coHost } = resolveTurnHosts("khoiDong", kdIdx ?? 0, {
        segKind: options?.segKind,
        sharedStartSegIdx: options?.sharedStartSegIdx,
        lastSoloSegIdx: options?.lastSoloSegIdx,
      });
      if (segment === "result" || segment === "buzzer") return coHost;
      return readingHost;
    }
    // Backward compatibility when turnIdx/segIdx is omitted
    if (segment === "result") return "ngoc_huy";
    if (segment === "buzzer") return seatId % 2 === 0 ? "ngoc_huy" : "khanh_vy";
    return seatId % 2 === 0 ? "khanh_vy" : "ngoc_huy";
  }

  // VCNV
  if (round === "vcnv") {
    const rowIdx = options?.rowIdx ?? options?.turnIdx;
    if (segment === "cnv_bell" && rowIdx == null) {
      return pickRandomMCRole();
    }
    if (rowIdx != null) {
      const { readingHost, coHost } = resolveTurnHosts("vcnv", rowIdx);
      if (segment === "buzzer" || segment === "cnv_bell") return coHost;
      return readingHost;
    }
    if (segment === "buzzer" || segment === "cnv_bell") return "ngoc_huy";
    return "khanh_vy";
  }

  // Tăng tốc
  if (round === "tangToc") {
    const idx = options?.qIdx ?? options?.turnIdx;
    if (idx != null) {
      const { readingHost, coHost } = resolveTurnHosts("tangToc", idx);
      if (
        segment === "answers_summary" ||
        segment === "time_callout" ||
        segment === "result" ||
        segment === "explanation" ||
        segment === "explain_answer" ||
        segment === "buzzer"
      ) {
        return coHost;
      }
      return readingHost;
    }
    if (segment === "result") return "ngoc_huy";
    if (segment === "buzzer" || segment === "steal_callout") return "khanh_vy";
    return "ngoc_huy";
  }

  // Về đích
  if (round === "veDich") {
    const idx = options?.turnIdx;
    if (idx != null) {
      const { readingHost, coHost } = resolveTurnHosts("veDich", idx);
      if (
        segment === "result" ||
        segment === "buzzer" ||
        segment === "steal_callout" ||
        segment === "explanation" ||
        segment === "explain_answer"
      ) {
        return coHost;
      }
      return readingHost;
    }
    if (segment === "result" || segment === "buzzer" || segment === "steal_callout") {
      return "khanh_vy";
    }
    return "ngoc_huy";
  }

  // Câu hỏi phụ
  if (round === "cauHoiPhu") {
    const idx = options?.qIdx ?? options?.turnIdx;
    if (idx != null) {
      const { readingHost, coHost } = resolveTurnHosts("cauHoiPhu", idx);
      if (
        segment === "result" ||
        segment === "buzzer" ||
        segment === "explanation" ||
        segment === "explain_answer"
      ) {
        return coHost;
      }
      return readingHost;
    }
    if (segment === "result") return "ngoc_huy";
    if (segment === "buzzer" || segment === "steal_callout") return "khanh_vy";
    return "ngoc_huy";
  }

  if (segment === "result") return "ngoc_huy";
  if (segment === "buzzer" || segment === "steal_callout") return "khanh_vy";
  return "khanh_vy";
}

// ============================================================================
// 4. Engine State, 3D Lip-Sync Broadcast, Server TTS + WebAudio + Fallback
// ============================================================================

let ttsEnabled = true;

if (typeof window !== "undefined") {
  try {
    const stored = window.localStorage?.getItem("olympia_tts_enabled");
    if (stored !== null && stored !== undefined) {
      ttsEnabled = stored === "true" || stored === "1";
    } else {
      try {
        window.localStorage?.setItem("olympia_tts_enabled", "true");
      } catch {}
      ttsEnabled = true;
    }
  } catch {}
}

export function isTtsEnabled(): boolean {
  return ttsEnabled;
}

export function setTtsEnabled(enabled: boolean): void {
  ttsEnabled = enabled;
  if (typeof window !== "undefined") {
    try {
      window.localStorage?.setItem("olympia_tts_enabled", enabled ? "true" : "false");
    } catch {}
    if (!enabled) cancelTTS();
  }
}

let activeTtsSpeaker: ActiveTtsSpeaker = null;
let speakerSessionSeq = 0;
let activeSpeakerSessionId = 0;

function beginTtsSpeakerSession(speaker: DualMcRole): number {
  const sessionId = ++speakerSessionSeq;
  activeSpeakerSessionId = sessionId;
  emitTtsSpeaker(speaker);
  return sessionId;
}

function endTtsSpeakerSession(sessionId: number): void {
  if (activeSpeakerSessionId === sessionId) {
    activeSpeakerSessionId = 0;
    emitTtsSpeaker(null);
  }
}

function emitTtsSpeaker(speaker: ActiveTtsSpeaker): void {
  if (typeof window === "undefined") {
    activeTtsSpeaker = speaker;
    return;
  }
  const prevWindowVal = (window as any).__olympiaTtsSpeaker;
  (window as any).__olympiaTtsSpeaker = speaker;
  if (activeTtsSpeaker === speaker && prevWindowVal === speaker) return;
  activeTtsSpeaker = speaker;
  try {
    if (typeof window.dispatchEvent === "function") {
      const evt =
        typeof CustomEvent === "function"
          ? new CustomEvent("olympia:tts-speaker", { detail: { speaker } })
          : ({ type: "olympia:tts-speaker", detail: { speaker } } as unknown as Event);
      window.dispatchEvent(evt);
    }
  } catch {}
}

export function getActiveTtsSpeaker(): ActiveTtsSpeaker {
  return activeTtsSpeaker;
}

const DEFAULT_ENDPOINT = "/api/olympia/tts";
const DEFAULT_TIMEOUT_MS = 4000;
const DEFAULT_COOLDOWN_MS = 15000;

let transportConfig: TtsTransportConfig = {
  endpoint: DEFAULT_ENDPOINT,
  timeoutMs: DEFAULT_TIMEOUT_MS,
  cooldownMs: DEFAULT_COOLDOWN_MS,
};

let engineStatus: TtsEngineStatus = {
  mode: "server",
  lastFallbackReason: null,
  lastUpdatedAt: 0,
  serverCooldownUntil: 0,
};

const statusListeners = new Set<(status: TtsEngineStatus) => void>();

function updateEngineStatus(patch: Partial<TtsEngineStatus>): void {
  engineStatus = {
    ...engineStatus,
    ...patch,
    lastUpdatedAt: Date.now(),
  };
  for (const listener of statusListeners) {
    try {
      listener({ ...engineStatus });
    } catch {}
  }
}

export function getTtsEngineMode(): TtsEngineMode {
  return engineStatus.mode;
}

export function getTtsEngineStatus(): TtsEngineStatus {
  return { ...engineStatus };
}

export function resetTtsServerFallback(): void {
  updateEngineStatus({
    mode: "server",
    lastFallbackReason: null,
    serverCooldownUntil: 0,
  });
}

export function configureTtsTransport(config: TtsTransportConfig): void {
  transportConfig = {
    ...transportConfig,
    ...config,
  };
}

export function onTtsEngineStatusChange(
  listener: (status: TtsEngineStatus) => void
): () => void {
  statusListeners.add(listener);
  return () => {
    statusListeners.delete(listener);
  };
}

let cachedViVoices: SpeechSynthesisVoice[] = [];
let cachedEnVoices: SpeechSynthesisVoice[] = [];

export function refreshOlympiaVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  try {
    const voices = window.speechSynthesis.getVoices() || [];
    cachedViVoices = voices.filter(
      (v) => v.lang.startsWith("vi") || v.lang === "vi-VN" || v.lang === "vi_VN"
    );
    cachedEnVoices = voices.filter(
      (v) => v.lang.startsWith("en") || v.lang === "en-US" || v.lang === "en-GB"
    );
    return cachedViVoices;
  } catch {
    return [];
  }
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  refreshOlympiaVoices();
  try {
    window.speechSynthesis.onvoiceschanged = () => {
      refreshOlympiaVoices();
    };
  } catch {}
}

let sharedAudioContext: AudioContext | null = null;

function getOrCreateAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx =
    (window as any).AudioContext ||
    (window as any).webkitAudioContext ||
    (globalThis as any).AudioContext;
  if (typeof Ctx !== "function") return null;
  if (
    sharedAudioContext &&
    sharedAudioContext instanceof Ctx &&
    (sharedAudioContext as any).state !== "closed"
  ) {
    return sharedAudioContext;
  }
  try {
    sharedAudioContext = new Ctx();
    return sharedAudioContext;
  } catch {
    return null;
  }
}

export function unlockOlympiaTTS(): void {
  if (typeof window === "undefined") return;
  try {
    const ctx = getOrCreateAudioContext();
    if (ctx && ctx.state === "suspended" && typeof ctx.resume === "function") {
      void ctx.resume().catch(() => {});
    }
  } catch {}
  if (!("speechSynthesis" in window)) return;
  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    if (typeof SpeechSynthesisUtterance === "function") {
      const silent = new SpeechSynthesisUtterance(" ");
      silent.volume = 0.01;
      silent.rate = 2.0;
      window.speechSynthesis.speak(silent);
    }
    refreshOlympiaVoices();
  } catch {}
}

// Playback coordination state
let playbackEpoch = 0;
let activeAbortController: AbortController | null = null;
let activeAudioCleanup: (() => void) | null = null;
let activeFadeStopper: ((fadeMs: number, maxWaitMs: number) => number) | null = null;
let activePauseTimer: any = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let stopRequested = false;
let boundaryCleanupTimer: any = null;
let buzzerPauseTimer: any = null;
let dramaticStealTimer: any = null;
let olympiaTtsVolume = 1.0;
let isOlympiaTtsPausedState = false;
let activeGainNodeRef: GainNode | null = null;
let activeHtmlAudioRef: HTMLAudioElement | null = null;

/**
 * Estimates word-boundary offsets (in ms) proportionally across an utterance duration.
 */
export function estimateWordBoundaryOffsetsMs(text: string, durationMs: number): number[] {
  const clean = (text || "").trim();
  if (!clean || !Number.isFinite(durationMs) || durationMs <= 0) return [];
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const weights = words.map((w) => {
    let wt = Math.max(2, w.replace(/[^\p{L}\p{N}]/gu, "").length);
    if (/[,;:]$/.test(w)) wt += 2.5;
    if (/[.!?…]$/.test(w)) wt += 4;
    return wt;
  });
  const totalWeight = weights.reduce((acc, w) => acc + w, 0);
  if (totalWeight <= 0) return [durationMs];

  let cum = 0;
  return weights.map((wt) => {
    cum += wt;
    return Math.round((cum / totalWeight) * durationMs);
  });
}

/**
 * Computes delay (in ms) from `elapsedMs` until the next word/phrase boundary,
 * clamped to `[0, maxWaitMs]`.
 */
export function computeBoundaryStopDelayMs(
  text: string,
  elapsedMs: number,
  durationMs: number,
  maxWaitMs: number = 160
): number {
  const cap = Math.max(0, maxWaitMs);
  if (!text?.trim() || durationMs <= 0 || elapsedMs >= durationMs) return 0;
  const safeElapsed = Math.max(0, elapsedMs);
  const offsets = estimateWordBoundaryOffsetsMs(text, durationMs);
  for (const offset of offsets) {
    if (offset >= safeElapsed) {
      return Math.min(cap, Math.max(0, Math.round(offset - safeElapsed)));
    }
  }
  return Math.min(cap, Math.max(0, Math.round(durationMs - safeElapsed)));
}

/**
 * Natural speech stop mechanism:
 * - WebAudio: schedules GainNode ramp-down at next estimated word boundary (capped by `maxWaitMs`)
 * - HTMLAudioElement: fades volume / pauses at next word boundary
 * - Web Speech: waits for next `onboundary` or computed boundary delay before cancel
 */
export function smoothStopOlympiaTTS(fadeMs: number = 45, maxWaitMs: number = 160): number {
  playbackEpoch++;

  if (boundaryCleanupTimer) {
    clearTimeout(boundaryCleanupTimer);
    boundaryCleanupTimer = null;
  }

  if (activeAbortController) {
    try {
      activeAbortController.abort();
    } catch {}
    activeAbortController = null;
  }

  if (activeFadeStopper) {
    const fn = activeFadeStopper;
    activeFadeStopper = null;
    return fn(fadeMs, maxWaitMs);
  }

  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    activeSpeakerSessionId = 0;
    emitTtsSpeaker(null);
    return 0;
  }

  if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
    currentUtterance = null;
    activeSpeakerSessionId = 0;
    emitTtsSpeaker(null);
    return 0;
  }

  stopRequested = true;
  const delay = Math.max(30, Math.min(fadeMs, maxWaitMs));
  const executeCancel = () => {
    try {
      window.speechSynthesis.cancel();
    } catch {}
    stopRequested = false;
    currentUtterance = null;
    activeSpeakerSessionId = 0;
    emitTtsSpeaker(null);
    if (boundaryCleanupTimer) {
      clearTimeout(boundaryCleanupTimer);
      boundaryCleanupTimer = null;
    }
  };

  boundaryCleanupTimer = setTimeout(executeCancel, delay);
  return delay;
}

export const smoothStopTTS = smoothStopOlympiaTTS;

export function cancelBuzzerInterrupt(): void {
  if (buzzerPauseTimer) {
    clearTimeout(buzzerPauseTimer);
    buzzerPauseTimer = null;
  }
}

export function cancelDramaticStealCall(): void {
  if (dramaticStealTimer) {
    clearTimeout(dramaticStealTimer);
    dramaticStealTimer = null;
  }
}

export function cancelTTS(): void {
  playbackEpoch++;
  stopRequested = false;

  if (boundaryCleanupTimer) {
    clearTimeout(boundaryCleanupTimer);
    boundaryCleanupTimer = null;
  }
  if (activePauseTimer) {
    clearTimeout(activePauseTimer);
    activePauseTimer = null;
  }
  cancelBuzzerInterrupt();
  cancelDramaticStealCall();

  if (activeAbortController) {
    try {
      activeAbortController.abort();
    } catch {}
    activeAbortController = null;
  }

  activeFadeStopper = null;
  if (activeAudioCleanup) {
    const cleanup = activeAudioCleanup;
    activeAudioCleanup = null;
    try {
      cleanup();
    } catch {}
  }

  currentUtterance = null;
  activeSpeakerSessionId = 0;
  emitTtsSpeaker(null);

  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch {}
}

export function getOlympiaTtsVolume(): number {
  if (typeof window !== "undefined") {
    try {
      const saved = window.localStorage?.getItem("olympia_tts_volume");
      if (saved != null) {
        const parsed = parseFloat(saved);
        if (Number.isFinite(parsed)) return Math.max(0, Math.min(1, parsed));
      }
    } catch {}
  }
  return olympiaTtsVolume;
}

export function setOlympiaTtsVolume(volume: number): void {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(volume) ? volume : 1.0));
  olympiaTtsVolume = clamped;
  if (typeof window !== "undefined") {
    try {
      window.localStorage?.setItem("olympia_tts_volume", String(clamped));
    } catch {}
  }
  if (activeGainNodeRef) {
    try {
      const ctx = getOrCreateAudioContext();
      if (ctx) {
        activeGainNodeRef.gain.setValueAtTime(clamped, ctx.currentTime);
      } else {
        activeGainNodeRef.gain.value = clamped;
      }
    } catch {}
  }
  if (activeHtmlAudioRef) {
    try {
      activeHtmlAudioRef.volume = clamped;
    } catch {}
  }
}

export function isOlympiaTtsPaused(): boolean {
  return isOlympiaTtsPausedState;
}

export function pauseOlympiaTTS(): void {
  isOlympiaTtsPausedState = true;
  if (typeof window === "undefined") return;
  try {
    const ctx = getOrCreateAudioContext();
    if (ctx && ctx.state === "running" && typeof ctx.suspend === "function") {
      void ctx.suspend().catch(() => {});
    }
  } catch {}
  if ("speechSynthesis" in window) {
    try {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
      }
    } catch {}
  }
  if (activeHtmlAudioRef && !activeHtmlAudioRef.paused) {
    try {
      activeHtmlAudioRef.pause();
    } catch {}
  }
}

export function resumeOlympiaTTS(): void {
  isOlympiaTtsPausedState = false;
  if (typeof window === "undefined") return;
  try {
    const ctx = getOrCreateAudioContext();
    if (ctx && ctx.state === "suspended" && typeof ctx.resume === "function") {
      void ctx.resume().catch(() => {});
    }
  } catch {}
  if ("speechSynthesis" in window) {
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch {}
  }
  if (activeHtmlAudioRef && activeHtmlAudioRef.paused) {
    try {
      void activeHtmlAudioRef.play().catch(() => {});
    } catch {}
  }
}

export function skipOlympiaTTS(): void {
  smoothStopOlympiaTTS(30, 80);
}

export function replayCurrentQuestionTTS(): void {
  smoothStopOlympiaTTS(30, 80);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("olympia:tts-replay"));
  }
}

export function speakTimerExpiredTTS(round?: string, options?: SpeakTTSOptions): void {
  if (!ttsEnabled || typeof window === "undefined") return;
  const role = options?.role || "ngoc_huy";
  speakOlympiaTTS("Hết giờ!", {
    ...options,
    role,
    segment: "question",
    round,
  });
}

function cancelPlaybackOnly(): void {
  playbackEpoch++;
  stopRequested = false;

  if (boundaryCleanupTimer) {
    clearTimeout(boundaryCleanupTimer);
    boundaryCleanupTimer = null;
  }
  if (activePauseTimer) {
    clearTimeout(activePauseTimer);
    activePauseTimer = null;
  }

  if (activeAbortController) {
    try {
      activeAbortController.abort();
    } catch {}
    activeAbortController = null;
  }

  activeFadeStopper = null;
  if (activeAudioCleanup) {
    const cleanup = activeAudioCleanup;
    activeAudioCleanup = null;
    try {
      cleanup();
    } catch {}
  }

  currentUtterance = null;
  activeSpeakerSessionId = 0;
  emitTtsSpeaker(null);

  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}

function cleanVoiceNameForGender(name: string): string {
  return name
    .replace(/\s*[-–(].*$/i, "") // strips "- Vietnamese (Vietnam)"
    .replace(/\bvi[eệ]t\s*nam(?:ese)?\b/gi, "")
    .replace(/\bvietnam(?:ese)?\b/gi, "")
    .replace(/\bvi-vn\b/gi, "")
    .trim();
}

function selectSeparatedVoices(
  voices: SpeechSynthesisVoice[],
  femaleRegex: RegExp,
  maleRegex: RegExp
): { khanh_vy: SpeechSynthesisVoice | null; ngoc_huy: SpeechSynthesisVoice | null } {
  if (voices.length === 0) return { khanh_vy: null, ngoc_huy: null };

  if (voices.length === 1) {
    const v = voices[0];
    const cleaned = cleanVoiceNameForGender(v.name);
    const isMale = maleRegex.test(cleaned) && !femaleRegex.test(cleaned);
    const isFemale = femaleRegex.test(cleaned) && !maleRegex.test(cleaned);
    return {
      khanh_vy: isMale ? null : v,
      ngoc_huy: isFemale ? null : v,
    };
  }

  // 1. Find best female voice for Khánh Vy (matches female, avoids male; fallback to neutral)
  let kvIdx = voices.findIndex((v) => {
    const c = cleanVoiceNameForGender(v.name);
    return femaleRegex.test(c) && !maleRegex.test(c);
  });
  if (kvIdx < 0) {
    kvIdx = voices.findIndex((v) => femaleRegex.test(cleanVoiceNameForGender(v.name)));
  }
  if (kvIdx < 0) {
    // Pick gender-neutral voice (does not match male)
    kvIdx = voices.findIndex((v) => !maleRegex.test(cleanVoiceNameForGender(v.name)));
  }
  // If all voices are explicitly male, kvIdx remains -1 (do not cross-assign male voice to Khánh Vy)

  // 2. Find best male voice for Ngọc Huy (matches male, avoids female; fallback to neutral)
  let nhIdx = voices.findIndex((v, i) => {
    if (i === kvIdx) return false;
    const c = cleanVoiceNameForGender(v.name);
    return maleRegex.test(c) && !femaleRegex.test(c);
  });
  if (nhIdx < 0) {
    nhIdx = voices.findIndex(
      (v, i) => i !== kvIdx && maleRegex.test(cleanVoiceNameForGender(v.name))
    );
  }
  if (nhIdx < 0) {
    // Pick gender-neutral voice (does not match female)
    nhIdx = voices.findIndex(
      (v, i) => i !== kvIdx && !femaleRegex.test(cleanVoiceNameForGender(v.name))
    );
  }
  // If all voices are explicitly female, nhIdx remains -1 (do not cross-assign female voice to Ngọc Huy)

  return {
    khanh_vy: kvIdx >= 0 ? (voices[kvIdx] ?? null) : null,
    ngoc_huy: nhIdx >= 0 ? (voices[nhIdx] ?? null) : null,
  };
}

/**
 * Resolves browser Web Speech API voice and acoustic parameters for MC role & language.
 * Enforces strict dual MC voice separation and mutual exclusion.
 */
export function resolveMCVoiceConfig(
  role: DualMcRole,
  lang: TtsLang = "vi",
  customConfig?: McVoiceCustomization
): {
  voice: SpeechSynthesisVoice | null;
  pitch: number;
  rate?: number;
} {
  const customVoiceSetting =
    customConfig ||
    activeCustomTtsScripts?.mcVoiceConfig?.[role] ||
    (role === "khanh_vy"
      ? activeCustomTtsScripts?.mcVoiceConfig?.khanhVy
      : activeCustomTtsScripts?.mcVoiceConfig?.ngocHuy);

  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    const defaultPitch = role === "khanh_vy" ? 1.12 : 0.88;
    const defaultRate = role === "khanh_vy" ? 1.05 : 1.04;
    const pitch = customVoiceSetting?.pitch !== undefined ? customVoiceSetting.pitch : defaultPitch;
    const rate = customVoiceSetting?.rate !== undefined ? customVoiceSetting.rate : defaultRate;
    return { voice: null, pitch, rate };
  }

  refreshOlympiaVoices();

  // If host selected a specific custom voiceURI in TTS Manager, prioritize it
  if (customVoiceSetting?.voiceURI) {
    const all = window.speechSynthesis.getVoices();
    const matched = all.find(
      (v) => v.voiceURI === customVoiceSetting.voiceURI || v.name === customVoiceSetting.voiceURI
    );
    if (matched) {
      const defaultPitch = role === "khanh_vy" ? 1.12 : 0.88;
      const pitch = customVoiceSetting.pitch !== undefined ? customVoiceSetting.pitch : defaultPitch;
      return { voice: matched, pitch, rate: customVoiceSetting.rate };
    }
  }

  const isEn = lang === "en";
  const pool = isEn ? cachedEnVoices : cachedViVoices;

  const femaleRegex = isEn
    ? /\b(?:jenny|aria|samantha|victoria|karen|zira|female)\b/i
    : /\b(?:hoaimy|female|loan|nữ|linh|mai|chi|ha|huong)\b/i;
  const maleRegex = isEn
    ? /\b(?:guy|andrew|daniel|alex|david|mark|male)\b/i
    : /\b(?:namminh|male|an|nam|minh|trung|huy|duc|thanh|khoi)\b/i;

  const separated = selectSeparatedVoices(pool, femaleRegex, maleRegex);
  const selectedVoice = role === "khanh_vy" ? separated.khanh_vy : separated.ngoc_huy;

  // Acoustic separation when only 1 voice exists or when voices are single-gender / shared
  const isAcousticDifferentiated =
    pool.length === 1 ||
    (pool.length > 1 &&
      (separated.khanh_vy === null ||
        separated.ngoc_huy === null ||
        separated.khanh_vy === separated.ngoc_huy ||
        separated.khanh_vy?.name === separated.ngoc_huy?.name));

  const defaultPitch = isAcousticDifferentiated
    ? (role === "khanh_vy" ? 1.16 : 0.84)
    : (role === "khanh_vy" ? 1.12 : 0.88);
  const defaultRate = isAcousticDifferentiated
    ? (role === "khanh_vy" ? 1.05 : 1.00)
    : (role === "khanh_vy" ? 1.05 : 1.04);

  const pitch = customVoiceSetting?.pitch !== undefined ? customVoiceSetting.pitch : defaultPitch;
  const rate = customVoiceSetting?.rate !== undefined ? customVoiceSetting.rate : defaultRate;

  return { voice: selectedVoice, pitch, rate };
}

function shouldAttemptServerTts(options?: SpeakTTSOptions): boolean {
  if (typeof window === "undefined") return false;
  if (options?.engine === "webspeech") return false;
  if (Date.now() < engineStatus.serverCooldownUntil) return false;

  const isOffline =
    (typeof navigator !== "undefined" && navigator.onLine === false) ||
    (typeof window !== "undefined" && (window.navigator as any)?.onLine === false);
  if (isOffline) return false;

  const hasCustomFetch = typeof transportConfig.fetchImpl === "function";
  const hasGlobalFetch = typeof globalThis.fetch === "function";
  if (!hasCustomFetch && !hasGlobalFetch) return false;

  if (hasCustomFetch) return true;

  // In browser environments where origin is available for relative /api/olympia/tts fetch
  const origin = window.location?.origin;
  const hasValidOrigin = typeof origin === "string" && /^https?:\/\/|^file:\/\//i.test(origin);
  if (hasValidOrigin) {
    return true;
  }

  if (options?.preferServer || options?.engine === "server") {
    return true;
  }

  return false;
}

function prepareLanguageSegments(
  rawText: string,
  options?: SpeakTTSOptions
): LanguageSpeechSegment[] {
  const forcedLang = options?.lang && options.lang !== "auto" ? options.lang : null;
  if (forcedLang) {
    const clean =
      forcedLang === "vi" ? normalizeVietnameseTTS(rawText) : rawText.trim();
    return clean ? [{ text: clean, lang: forcedLang }] : [];
  }

  const segments = segmentMixedLanguageText(rawText);
  return segments
    .map((s) => ({
      lang: s.lang,
      text: s.lang === "vi" ? normalizeVietnameseTTS(s.text) : s.text.trim(),
    }))
    .filter((s) => Boolean(s.text));
}

function speakWebSpeechSegmentSync(
  seg: LanguageSpeechSegment,
  role: DualMcRole,
  rate: number,
  epoch: number,
  onDone: (completed: boolean) => void,
  options?: SpeakTTSOptions
): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onDone(false);
    return;
  }
  if (typeof SpeechSynthesisUtterance !== "function") {
    onDone(false);
    return;
  }

  try {
    const { voice, pitch, rate: voiceRate } = resolveMCVoiceConfig(role, seg.lang, options?.voiceConfig);
    const utterance = new SpeechSynthesisUtterance(seg.text);
    utterance.lang = seg.lang === "en" ? "en-US" : "vi-VN";
    utterance.pitch = pitch;
    utterance.rate = options?.baseRate !== undefined ? rate : (voiceRate ?? rate);
    if (voice) utterance.voice = voice;

    const speechStartedAt = Date.now();
    let settled = false;
    let speakerSessionId = 0;
    const finish = (completed: boolean) => {
      if (settled) return;
      settled = true;
      if (currentUtterance === utterance) {
        currentUtterance = null;
      }
      endTtsSpeakerSession(speakerSessionId);
      onDone(completed);
    };

    activeFadeStopper = (fadeMs: number, maxWaitMs: number) => {
      const wordCount = seg.text.split(/\s+/).filter(Boolean).length;
      const estDurationMs = Math.max(400, (wordCount / Math.max(0.5, rate * 2.5)) * 1000);
      const elapsedMs = Date.now() - speechStartedAt;
      const boundaryWait = computeBoundaryStopDelayMs(seg.text, elapsedMs, estDurationMs, maxWaitMs);
      const delay = Math.max(Math.min(Math.max(30, fadeMs), maxWaitMs), boundaryWait);
      stopRequested = true;
      boundaryCleanupTimer = setTimeout(() => {
        try {
          window.speechSynthesis.cancel();
        } catch {}
        stopRequested = false;
        boundaryCleanupTimer = null;
        finish(false);
      }, delay);
      return delay;
    };

    utterance.onboundary = () => {
      if (stopRequested) {
        try {
          window.speechSynthesis.cancel();
        } catch {}
        stopRequested = false;
        if (boundaryCleanupTimer) {
          clearTimeout(boundaryCleanupTimer);
          boundaryCleanupTimer = null;
        }
        finish(false);
      }
    };

    utterance.onend = () => finish(epoch === playbackEpoch && !stopRequested);
    utterance.onerror = () => finish(false);

    currentUtterance = utterance;
    speakerSessionId = beginTtsSpeakerSession(role);
    window.speechSynthesis.speak(utterance);
  } catch {
    emitTtsSpeaker(null);
    onDone(false);
  }
}

function speakWebSpeechSegmentsSync(
  segments: LanguageSpeechSegment[],
  role: DualMcRole,
  rate: number,
  epoch: number,
  options?: SpeakTTSOptions,
  resolvePromise?: (val: boolean) => void
): void {
  if (segments.length === 0 || epoch !== playbackEpoch) {
    resolvePromise?.(false);
    return;
  }

  let idx = 0;
  const runNext = () => {
    if (epoch !== playbackEpoch) {
      emitTtsSpeaker(null);
      resolvePromise?.(false);
      return;
    }
    if (idx >= segments.length) {
      emitTtsSpeaker(null);
      options?.onEnd?.();
      resolvePromise?.(true);
      return;
    }
    const seg = segments[idx++];
    speakWebSpeechSegmentSync(
      seg,
      role,
      rate,
      epoch,
      (completed) => {
        if (!completed || epoch !== playbackEpoch) {
          resolvePromise?.(false);
          return;
        }
        runNext();
      },
      options
    );
  };
  runNext();
}

async function fetchServerTtsAudio(
  seg: LanguageSpeechSegment,
  role: DualMcRole,
  rate: number,
  options: SpeakTTSOptions | undefined,
  epoch: number
): Promise<ArrayBuffer> {
  const fetchFn = transportConfig.fetchImpl || globalThis.fetch;
  if (typeof fetchFn !== "function") {
    throw new Error("fetch unavailable");
  }

  const endpoint = transportConfig.endpoint || DEFAULT_ENDPOINT;
  const timeoutMs = transportConfig.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  activeAbortController = controller;

  let timeoutId: any = null;
  let timedOut = false;
  if (controller && timeoutMs > 0) {
    timeoutId = setTimeout(() => {
      timedOut = true;
      try {
        controller.abort();
      } catch {}
    }, timeoutMs);
  }

  try {
    const customCfg =
      options?.voiceConfig ||
      activeCustomTtsScripts?.mcVoiceConfig?.[role] ||
      (role === "khanh_vy"
        ? activeCustomTtsScripts?.mcVoiceConfig?.khanhVy
        : activeCustomTtsScripts?.mcVoiceConfig?.ngocHuy);

    const payload: Record<string, unknown> = {
      text: seg.text,
      role,
      lang: seg.lang,
      rate,
    };
    const effectivePitch = options?.pitch ?? customCfg?.pitch;
    if (effectivePitch !== undefined && effectivePitch !== null) {
      payload.pitch = effectivePitch;
    }

    const effectiveVoice =
      options?.voice ??
      customCfg?.voiceName ??
      (customCfg?.voiceURI && /^[a-zA-Z0-9_-]+$/.test(customCfg.voiceURI) && /Neural/i.test(customCfg.voiceURI)
        ? customCfg.voiceURI
        : undefined);

    if (effectiveVoice) {
      payload.voice = effectiveVoice;
    }

    const res = await fetchFn(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller?.signal,
    });

    if (epoch !== playbackEpoch) {
      throw new Error("aborted_epoch");
    }

    if (!res.ok) {
      throw new Error(`server_tts_http_${res.status}`);
    }

    const buf = await res.arrayBuffer();
    if (epoch !== playbackEpoch) {
      throw new Error("aborted_epoch");
    }
    return buf;
  } catch (err: any) {
    if (timedOut) {
      throw new Error("server_tts_timeout");
    }
    throw err;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    if (activeAbortController === controller) {
      activeAbortController = null;
    }
  }
}

async function playAudioBufferWithWebAudio(
  buf: ArrayBuffer,
  text: string,
  role: DualMcRole,
  epoch: number
): Promise<boolean> {
  const ctx = getOrCreateAudioContext();
  if (!ctx || typeof ctx.decodeAudioData !== "function") {
    throw new Error("webaudio_unavailable");
  }
  if (ctx.state === "suspended" && typeof ctx.resume === "function") {
    try {
      await ctx.resume();
    } catch {}
  }

  const audioBuffer = await ctx.decodeAudioData(buf.slice(0));
  if (epoch !== playbackEpoch) return false;

  return new Promise<boolean>((resolve) => {
    const source = ctx.createBufferSource();
    const gainNode = ctx.createGain();
    source.buffer = audioBuffer;
    const initialGain = gainNode.gain.value ?? getOlympiaTtsVolume();
    gainNode.gain.setValueAtTime(initialGain, ctx.currentTime);
    activeGainNodeRef = gainNode;
    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    const startedAtCtx = ctx.currentTime;
    const durationMs = (audioBuffer.duration || 0) * 1000;
    let settled = false;
    let speakerSessionId = 0;

    const cleanup = (completed: boolean) => {
      if (settled) return;
      settled = true;
      activeAudioCleanup = null;
      activeFadeStopper = null;
      activeGainNodeRef = null;
      try {
        source.onended = null;
      } catch {}
      try {
        gainNode.disconnect();
      } catch {}
      endTtsSpeakerSession(speakerSessionId);
      resolve(completed);
    };

    activeAudioCleanup = () => {
      try {
        source.stop();
      } catch {}
      cleanup(false);
    };

    activeFadeStopper = (fadeMs: number, maxWaitMs: number) => {
      const elapsedMs = Math.max(0, (ctx.currentTime - startedAtCtx) * 1000);
      const waitMs = computeBoundaryStopDelayMs(text, elapsedMs, durationMs, maxWaitMs);
      const fadeSec = Math.max(0.02, fadeMs / 1000);
      const stopAtCtx = ctx.currentTime + waitMs / 1000;
      try {
        gainNode.gain.setValueAtTime(gainNode.gain.value ?? 1.0, stopAtCtx);
        gainNode.gain.linearRampToValueAtTime(0.0001, stopAtCtx + fadeSec);
        source.stop(stopAtCtx + fadeSec + 0.005);
      } catch {
        try {
          source.stop();
        } catch {}
      }
      const totalDelay = waitMs + fadeMs;
      boundaryCleanupTimer = setTimeout(() => {
        boundaryCleanupTimer = null;
        cleanup(false);
      }, totalDelay + 10);
      return totalDelay;
    };

    source.onended = () => cleanup(epoch === playbackEpoch);
    speakerSessionId = beginTtsSpeakerSession(role);
    source.start(0);
  });
}

async function playAudioBufferWithHtmlAudio(
  buf: ArrayBuffer,
  text: string,
  role: DualMcRole,
  epoch: number
): Promise<boolean> {
  const AudioCtor =
    typeof window !== "undefined"
      ? (window as any).Audio || (globalThis as any).Audio
      : (globalThis as any).Audio;
  const UrlApi = typeof URL !== "undefined" ? URL : (globalThis as any).URL;
  if (
    typeof AudioCtor !== "function" ||
    !UrlApi ||
    typeof UrlApi.createObjectURL !== "function" ||
    typeof Blob !== "function"
  ) {
    throw new Error("html_audio_unavailable");
  }

  const blob = new Blob([buf], { type: "audio/mpeg" });
  const objectUrl = UrlApi.createObjectURL(blob);
  const audio: HTMLAudioElement = new AudioCtor(objectUrl);
  try {
    audio.volume = getOlympiaTtsVolume();
    activeHtmlAudioRef = audio;
  } catch {}

  return new Promise<boolean>((resolve, reject) => {
    let settled = false;
    let speakerSessionId = 0;
    const cleanup = (completed: boolean) => {
      if (settled) return;
      settled = true;
      activeAudioCleanup = null;
      activeFadeStopper = null;
      activeHtmlAudioRef = null;
      try {
        audio.onended = null;
        audio.onerror = null;
        audio.pause();
      } catch {}
      try {
        UrlApi.revokeObjectURL?.(objectUrl);
      } catch {}
      endTtsSpeakerSession(speakerSessionId);
      resolve(completed);
    };

    activeAudioCleanup = () => cleanup(false);

    activeFadeStopper = (fadeMs: number, maxWaitMs: number) => {
      const elapsedMs = (audio.currentTime || 0) * 1000;
      const durationMs = Number.isFinite(audio.duration) ? audio.duration * 1000 : 0;
      const waitMs =
        durationMs > 0
          ? computeBoundaryStopDelayMs(text, elapsedMs, durationMs, maxWaitMs)
          : Math.min(maxWaitMs, Math.max(30, fadeMs));
      boundaryCleanupTimer = setTimeout(() => {
        boundaryCleanupTimer = null;
        cleanup(false);
      }, waitMs);
      return waitMs;
    };

    audio.onended = () => cleanup(epoch === playbackEpoch);
    audio.onerror = () => {
      if (!settled) {
        settled = true;
        activeAudioCleanup = null;
        activeFadeStopper = null;
        try {
          UrlApi.revokeObjectURL?.(objectUrl);
        } catch {}
        endTtsSpeakerSession(speakerSessionId);
        reject(new Error("html_audio_error"));
      }
    };

    speakerSessionId = beginTtsSpeakerSession(role);
    try {
      const playRet = audio.play();
      if (playRet && typeof playRet.catch === "function") {
        playRet.catch((err: unknown) => {
          if (!settled) {
            settled = true;
            activeAudioCleanup = null;
            activeFadeStopper = null;
            try {
              UrlApi.revokeObjectURL?.(objectUrl);
            } catch {}
            endTtsSpeakerSession(speakerSessionId);
            reject(err);
          }
        });
      }
    } catch (err) {
      settled = true;
      try {
        UrlApi.revokeObjectURL?.(objectUrl);
      } catch {}
      endTtsSpeakerSession(speakerSessionId);
      reject(err);
    }
  });
}

async function runServerTtsPipeline(
  segments: LanguageSpeechSegment[],
  role: DualMcRole,
  rate: number,
  options: SpeakTTSOptions | undefined,
  epoch: number
): Promise<boolean> {
  let prefetchPromise: Promise<ArrayBuffer> | null = null;

  for (let i = 0; i < segments.length; i++) {
    if (epoch !== playbackEpoch) return false;
    const seg = segments[i];

    try {
      const buf = prefetchPromise
        ? await prefetchPromise
        : await fetchServerTtsAudio(seg, role, rate, options, epoch);
      prefetchPromise = null;

      if (epoch !== playbackEpoch) return false;

      // Update status to server upon successful synthesis
      if (engineStatus.mode !== "server" || engineStatus.lastFallbackReason !== null) {
        updateEngineStatus({ mode: "server", lastFallbackReason: null, serverCooldownUntil: 0 });
      }

      // Prefetch next segment while current plays
      if (i + 1 < segments.length) {
        prefetchPromise = fetchServerTtsAudio(
          segments[i + 1],
          role,
          rate,
          options,
          epoch
        ).catch((err) => {
          throw err;
        });
      }

      let played = false;
      try {
        played = await playAudioBufferWithWebAudio(buf, seg.text, role, epoch);
      } catch {
        if (epoch !== playbackEpoch) return false;
        played = await playAudioBufferWithHtmlAudio(buf, seg.text, role, epoch);
      }

      if (!played || epoch !== playbackEpoch) return false;
    } catch (err: any) {
      prefetchPromise = null;
      if (epoch !== playbackEpoch || err?.name === "AbortError") {
        return false;
      }
      // Server failed or audio decode unavailable -> record fallback and hand remaining segments to Web Speech
      const reason = err instanceof Error ? err.message : String(err || "server_tts_failed");
      const cooldownMs = transportConfig.cooldownMs ?? DEFAULT_COOLDOWN_MS;
      updateEngineStatus({
        mode: "webspeech",
        lastFallbackReason: reason,
        serverCooldownUntil: Date.now() + cooldownMs,
      });
      options?.onError?.(err);

      const remaining = segments.slice(i);
      return await new Promise<boolean>((resolve) => {
        speakWebSpeechSegmentsSync(remaining, role, rate, epoch, options, resolve);
      });
    }
  }

  if (epoch !== playbackEpoch) return false;
  emitTtsSpeaker(null);
  options?.onEnd?.();
  return true;
}

/**
 * Async Multi-role Olympia TTS invocation:
 * - Resolves MC role, language segments, and separated question/narration rate
 * - Attempts server TTS (`POST /api/olympia/tts`) when eligible, falling back automatically to Web Speech
 * - Emits 3D lip-sync speaker events (`__olympiaTtsSpeaker` + `olympia:tts-speaker`)
 * - Resolves `true` if spoken to completion, `false` if disabled/empty/cancelled
 */
export function speakOlympiaTTSAsync(
  text: string,
  options?: SpeakTTSOptions
): Promise<boolean> {
  if (typeof window === "undefined" || !ttsEnabled) {
    return Promise.resolve(false);
  }

  if (!options?.noCancel) {
    cancelPlaybackOnly();
  }

  const segments = prepareLanguageSegments(text, options);
  if (segments.length === 0) {
    return Promise.resolve(false);
  }

  const role = resolveMCRole(options);
  const totalWordCount = segments
    .map((s) => s.text)
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  const rate = getSeasonReadingRate(options?.season, totalWordCount, {
    segment: options?.segment,
    baseRate: options?.baseRate,
    speedCategory: options?.speedCategory,
  });

  const epoch = playbackEpoch;

  if (shouldAttemptServerTts(options)) {
    return runServerTtsPipeline(segments, role, rate, options, epoch);
  }

  // Synchronous Web Speech path (guarantees zero microtask race in Node unit tests)
  return new Promise<boolean>((resolve) => {
    speakWebSpeechSegmentsSync(segments, role, rate, epoch, options, resolve);
  });
}

/**
 * Smart Multi-role Olympia TTS invocation (fire-and-forget wrapper over `speakOlympiaTTSAsync`).
 */
export function speakOlympiaTTS(text: string, options?: SpeakTTSOptions): void {
  void speakOlympiaTTSAsync(text, options);
}

export const speakSmartQuestion = (
  questionText: string,
  options?: SpeakTTSOptions
) => {
  speakOlympiaTTS(questionText, { ...options, segment: "question" });
};

/**
 * Plays a sequence of DualMcScriptSegments in order with pauses between segments.
 */
export async function speakDualMcScriptAsync(
  segments: DualMcScriptSegment[],
  options?: DualMcSpeakOptions
): Promise<boolean> {
  if (typeof window === "undefined" || !ttsEnabled || !segments || segments.length === 0) {
    return false;
  }

  cancelPlaybackOnly();
  const epoch = playbackEpoch;

  for (let i = 0; i < segments.length; i++) {
    if (epoch !== playbackEpoch) return false;
    const seg = segments[i];
    options?.onSegmentStart?.(seg, i);

    const ttsSegment: TTSSegment =
      seg.kind === "greeting"
        ? "intro_greeting"
        : seg.kind === "contestant_intro"
        ? "contestant_intro"
        : seg.kind === "breather"
        ? "breather"
        : seg.kind === "ready_check"
        ? "ready_check"
        : seg.kind === "round_transition"
        ? "round_transition"
        : seg.kind === "summary_item" || seg.kind === "summary_commentary"
        ? "score_summary"
        : seg.kind === "post_match_opening" || seg.kind === "post_match_item"
        ? "post_match_summary"
        : seg.kind === "award_item" || seg.kind === "tie_notice"
        ? "final_awards"
        : seg.kind === "farewell"
        ? "closing_farewell"
        : seg.kind === "hype"
        ? "hype_filler"
        : "round_intro";

    const completed = await speakOlympiaTTSAsync(seg.text, {
      role: seg.role,
      segment: ttsSegment,
      seatId: seg.seatId,
      lang: seg.lang ?? "auto",
      season: options?.season,
      baseRate: options?.baseRate,
      preferServer: options?.preferServer,
      engine: options?.engine,
      noCancel: true,
    });

    if (!completed || epoch !== playbackEpoch) return false;

    const pauseMs = seg.pauseAfterMs ?? 0;
    if (pauseMs > 0 && i < segments.length - 1) {
      const pauseOk = await new Promise<boolean>((resolve) => {
        activePauseTimer = setTimeout(() => {
          activePauseTimer = null;
          resolve(epoch === playbackEpoch);
        }, pauseMs);
      });
      if (!pauseOk || epoch !== playbackEpoch) return false;
    }
  }

  if (epoch !== playbackEpoch) return false;
  options?.onEnd?.();
  return true;
}

export function speakDualMcScript(
  segments: DualMcScriptSegment[],
  options?: DualMcSpeakOptions
): void {
  void speakDualMcScriptAsync(segments, options);
}

// ============================================================================
// 5. Results, Round Intros & Legacy Aliases
// ============================================================================

export interface GradingCalloutResult {
  text: string;
  role: DualMcRole;
}

export function generateGradingCallout(
  isCorrect: boolean,
  answer?: string,
  options?: SpeakTTSOptions,
  rng: () => number = Math.random
): GradingCalloutResult {
  const custom = activeCustomTtsScripts;
  const cleanAnswer = answer ? summarizeOlympiaAnswer(answer) || answer.trim() : "";
  const resolvedRole = resolveMCRole({ ...options, segment: "result" });

  if (isCorrect) {
    if (options?.deterministic) {
      return { text: "Chính xác!", role: resolvedRole };
    }

    const defaultTemplates: Array<{ role: DualMcRole; text: string }> = [
      { role: "khanh_vy", text: "Chính xác! Thêm 10 điểm!" },
      { role: "ngoc_huy", text: "Rất chuẩn xác!" },
      { role: "khanh_vy", text: "Câu trả lời hoàn toàn chính xác!" },
      ...(cleanAnswer
        ? [
            { role: "ngoc_huy" as DualMcRole, text: "{dapAnDung}? Vâng, hoàn toàn chính xác!" },
            { role: "khanh_vy" as DualMcRole, text: "{dapAnDung}! Đúng rồi!" },
            { role: "ngoc_huy" as DualMcRole, text: "{dapAnDung} chính là câu trả lời chính xác!" },
          ]
        : []),
    ];

    let pickedText: string;
    let pickedRole = resolvedRole;

    if (custom?.correctResponses && custom.correctResponses.length > 0) {
      const idx = Math.floor(clamp(rng(), 0, 0.999999) * custom.correctResponses.length);
      pickedText = custom.correctResponses[idx];
      if (options?.role && (options.role === "khanh_vy" || options.role === "ngoc_huy")) {
        pickedRole = options.role;
      }
    } else {
      const idx = Math.floor(clamp(rng(), 0, 0.999999) * defaultTemplates.length);
      pickedText = defaultTemplates[idx].text;
      pickedRole = (options?.role as DualMcRole) || resolvedRole;
    }

    if (options?.role && (options.role === "khanh_vy" || options.role === "ngoc_huy")) {
      pickedRole = options.role;
    }

    const text = interpolateTemplate(pickedText, {
      dapAnDung: cleanAnswer,
      ...options?.vars,
    });

    return { text, role: pickedRole };
  } else {
    // WRONG ANSWER — STRICT PRINCIPLE: MUST ALWAYS ANNOUNCE THE CORRECT ANSWER
    if (options?.deterministic) {
      const defaultText = cleanAnswer
        ? `Đáp án chính xác là: ${cleanAnswer}`
        : "Chưa đúng rồi, rất tiếc.";
      return { text: defaultText, role: resolvedRole };
    }

    const defaultWrongTemplates: Array<{ role: DualMcRole; text: string }> = [
      { role: "ngoc_huy", text: "{dapAnDung} mới là đáp án chính xác, rất tiếc!" },
      { role: "khanh_vy", text: "Rất tiếc, câu trả lời đúng phải là {dapAnDung}." },
      { role: "ngoc_huy", text: "Chưa đúng rồi, đáp án là {dapAnDung}." },
      { role: "khanh_vy", text: "Không phải, phải là {dapAnDung}." },
    ];

    let pickedText: string;
    let pickedRole = resolvedRole;

    if (custom?.wrongResponses && custom.wrongResponses.length > 0) {
      const idx = Math.floor(clamp(rng(), 0, 0.999999) * custom.wrongResponses.length);
      pickedText = custom.wrongResponses[idx];
      if (options?.role && (options.role === "khanh_vy" || options.role === "ngoc_huy")) {
        pickedRole = options.role;
      }
    } else {
      const idx = Math.floor(clamp(rng(), 0, 0.999999) * defaultWrongTemplates.length);
      pickedText = defaultWrongTemplates[idx].text;
      pickedRole = (options?.role as DualMcRole) || resolvedRole;
    }

    if (options?.role && (options.role === "khanh_vy" || options.role === "ngoc_huy")) {
      pickedRole = options.role;
    }

    const finalAnswer = cleanAnswer || "đáp án chính xác của chương trình";
    let text = interpolateTemplate(pickedText, {
      dapAnDung: finalAnswer,
      ...options?.vars,
    });

    // Defensive guarantee: If custom template omitted {dapAnDung}, append it
    if (!pickedText.includes("{dapAnDung}") && cleanAnswer) {
      text = `${text.replace(/[\.\!]+$/, "")}. Đáp án là ${cleanAnswer}.`;
    }

    return { text, role: pickedRole };
  }
}

/**
 * Vocalize Result Confirmation or Summarized Answer:
 * - Uses resolveMCRole({ ...options, segment: "result" }) across ALL rounds
 */
export function speakOlympiaResult(
  isCorrect: boolean,
  answer?: string,
  options?: SpeakTTSOptions
): void {
  if (!ttsEnabled || typeof window === "undefined") return;

  const { text, role } = generateGradingCallout(isCorrect, answer, options);
  speakOlympiaTTS(text, {
    ...options,
    segment: "result",
    role,
  });
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
    text: "Và ngay bây giờ, chúng ta sẽ cùng bước vào phần thi đầu tiên mang tên Khởi Động!",
  },
  khoiDongSolo: {
    role: "ngoc_huy",
    text: "Và ngay bây giờ, chúng ta sẽ cùng bước vào phần thi đầu tiên mang tên Khởi Động! Người đầu tiên bước vào lượt thi cá nhân là bạn {tenThiSinh} đến từ trường {tenTruong}. Bạn sẽ có 6 câu hỏi để ghi những điểm số đầu tiên. Chúc bạn thật tự tin, bình tĩnh và có một màn khởi động thành công rực rỡ!",
  },
  khoiDongShared: {
    role: "ngoc_huy",
    text: "Và bây giờ là lượt thi Khởi Động chung! Các bạn thí sinh hãy chuẩn bị sẵn sàng tay trên bàn phím chuông, chúc cả 4 bạn sẽ có một màn khởi động thật suôn sẻ, bứt phá và giành được thật nhiều điểm số!",
  },
  vcnv: {
    role: "khanh_vy",
    text: "Chào mừng quý vị và các bạn đến với phần thi thứ hai: Vượt chướng ngại vật!",
  },
  tangToc: {
    role: "ngoc_huy",
    text: "Cơ hội nâng cao điểm số rất lớn đang chờ đón 4 thí sinh ở phần thi thứ ba: Tăng tốc!",
  },
  veDich: {
    role: "khanh_vy",
    text: "Và phần thi quyết định: Về đích!",
  },
  cauHoiPhu: {
    role: "ngoc_huy",
    text: "Do có sự bằng điểm ở vị trí phân định, chúng ta sẽ bước vào phần thi Câu hỏi phụ!",
  },
};

export function speakRoundIntroTTS(round: string, options?: SpeakTTSOptions): void {
  let targetKey = round;
  if (round === "khoiDong") {
    if (options?.segKind === "shared") {
      targetKey = "khoiDongShared";
    } else if (options?.segKind === "solo" || options?.seatId !== undefined) {
      targetKey = "khoiDongSolo";
    }
  }

  const customIntro =
    activeCustomTtsScripts?.roundIntros?.[targetKey] ||
    activeCustomTtsScripts?.roundIntros?.[round];
  const intro = ROUND_INTRO_LINES[targetKey] || ROUND_INTRO_LINES[round];
  if (!customIntro && !intro) return;

  let text = customIntro || intro.text;
  if (options?.vars) {
    text = interpolateTemplate(text, options.vars);
  }
  const role = options?.role || intro?.role || "khanh_vy";
  speakOlympiaTTS(text, {
    ...options,
    role,
    segment: "round_intro",
    round: targetKey,
  });
}

// Backward compatibility with legacy speakTTS
export function speakTTS(text: string, onEnd?: () => void): void {
  speakOlympiaTTS(text, { onEnd, segment: "round_intro" });
}

// ============================================================================
// 6. R2 + R6 + R8 Ceremonial, Intro, Summary & Modular Award Tier Scripts
// ============================================================================

const ROUND_VI_LABELS: Record<string, string> = {
  khoiDong: "Khởi Động",
  vcnv: "Vượt Chướng Ngại Vật",
  tangToc: "Tăng Tốc",
  veDich: "Về Đích",
  cauHoiPhu: "Câu Hỏi Phụ",
};

function joinVietnameseNamesWithVa(names: string[]): string {
  const clean = names.map((n) => getContestantSpokenName(n)).filter(Boolean);
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} và ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")} và ${clean[clean.length - 1]}`;
}

/**
 * Script 1: Short lobby greeting after opening a room.
 */
export function buildLobbyGreetingScript(options?: {
  roomName?: string;
  variantIdx?: number;
}): DualMcScriptSegment[] {
  const cleanRoom = (options?.roomName || "").trim();
  const variant = Math.abs(options?.variantIdx ?? 0) % 3;

  if (activeCustomTtsScripts?.lobbyGreeting && activeCustomTtsScripts.lobbyGreeting.length > 0) {
    const list = activeCustomTtsScripts.lobbyGreeting;
    const text = interpolateTemplate(list[variant % list.length], {
      roomName: cleanRoom,
      tenPhong: cleanRoom,
    });
    return [
      {
        role: "khanh_vy",
        kind: "greeting",
        pauseAfterMs: 250,
        text,
      },
    ];
  }

  if (variant === 1) {
    return [
      {
        role: "ngoc_huy",
        kind: "greeting",
        pauseAfterMs: 250,
        text: "Xin chào các nhà leo núi! Phòng thi đã sẵn sàng mở cửa chào đón tất cả các bạn.",
      },
      {
        role: "khanh_vy",
        kind: "narration",
        pauseAfterMs: 0,
        text: "Hãy chuẩn bị tinh thần thật thoải mái, kiểm tra thiết bị và sẵn sàng chinh phục đỉnh cao Olympia!",
      },
    ];
  }

  if (variant === 2) {
    return [
      {
        role: "khanh_vy",
        kind: "greeting",
        pauseAfterMs: 220,
        text: cleanRoom
          ? `Sảnh chờ trận đấu ${cleanRoom} đang nóng lên từng giây!`
          : "Không khí tại sảnh chờ Đường lên đỉnh Olympia đang nóng lên từng giây!",
      },
      {
        role: "ngoc_huy",
        kind: "hype",
        pauseAfterMs: 0,
        text: "Các bạn hãy ổn định vị trí, chỉ ít phút nữa thôi cuộc hành trình sẽ chính thức bắt đầu!",
      },
    ];
  }

  return [
    {
      role: "khanh_vy",
      kind: "greeting",
      pauseAfterMs: 250,
      text: cleanRoom
        ? `Chào mừng các bạn đã có mặt tại sảnh chờ trận đấu ${cleanRoom}!`
        : "Chào mừng các bạn đã có mặt tại sảnh chờ Đường lên đỉnh Olympia!",
    },
    {
      role: "ngoc_huy",
      kind: "narration",
      pauseAfterMs: 0,
      text: "Các thí sinh hãy kiểm tra lại tên trường, vị trí bục thi đấu và kết nối của mình trước khi chúng ta bắt đầu nhé!",
    },
  ];
}

/**
 * Script 2: Official dual-MC opening ceremony with roomName (or natural fallback).
 */
export function buildOpeningDuoScript(options?: {
  roomName?: string;
  variantIdx?: number;
}): DualMcScriptSegment[] {
  const trimmed = (options?.roomName || "").trim();
  const variant = Math.abs(options?.variantIdx ?? 0) % 2;

  if (activeCustomTtsScripts?.openingDuo) {
    return [
      {
        role: "khanh_vy",
        kind: "greeting",
        pauseAfterMs: 300,
        text: interpolateTemplate(activeCustomTtsScripts.openingDuo.khanhVy, {
          roomName: trimmed,
          tenPhong: trimmed,
        }),
      },
      {
        role: "ngoc_huy",
        kind: "hype",
        pauseAfterMs: 320,
        text: interpolateTemplate(activeCustomTtsScripts.openingDuo.ngocHuy, {
          roomName: trimmed,
          tenPhong: trimmed,
        }),
      },
    ];
  }

  if (variant === 1) {
    return [
      {
        role: "khanh_vy",
        kind: "greeting",
        pauseAfterMs: 300,
        text: trimmed
          ? `Xin kính chào quý vị khán giả và các bạn học sinh thân mến đang theo dõi trận đấu ${trimmed} của chương trình Đường lên đỉnh Olympia!`
          : "Xin kính chào quý vị khán giả và các bạn học sinh thân mến đang theo dõi chương trình Đường lên đỉnh Olympia ngày hôm nay!",
      },
      {
        role: "ngoc_huy",
        kind: "hype",
        pauseAfterMs: 320,
        text: "Ngọc Huy cùng Khánh Vy rất hân hạnh được đồng hành cùng các bạn trong hành trình chinh phục tri thức đầy hào hứng này! Ngay sau đây, chúng ta hãy cùng chào đón sự xuất hiện của các thí sinh ngày hôm nay!",
      },
    ];
  }

  return [
    {
      role: "khanh_vy",
      kind: "greeting",
      pauseAfterMs: 320,
      text: trimmed
        ? `Khánh Vy xin nồng nhiệt chào đón quý vị khán giả và các bạn học sinh đã đến với chương trình Đường lên đỉnh Olympia, trận đấu ${trimmed}!`
        : "Khánh Vy xin nồng nhiệt chào đón quý vị khán giả và các bạn học sinh đã đến với chương trình Đường lên đỉnh Olympia ngày hôm nay!",
    },
    {
      role: "ngoc_huy",
      kind: "hype",
      pauseAfterMs: 350,
      text: "Và Ngọc Huy cũng rất vui được đồng hành cùng quý vị trong cuộc tranh tài đầy trí tuệ và kịch tính này! Ngay bây giờ, xin mời chúng ta cùng chào đón sự xuất hiện của các nhà leo núi xuất sắc hôm nay!",
    },
  ];
}

function normalizeIntroSeats(seats: ContestantScriptInput[]): ContestantScriptInput[] {
  const filtered = (seats || []).filter(
    (s) => s && (s.name?.trim() || s.approved !== false) && s.approved !== false
  );
  return filtered.slice(0, 8);
}

/**
 * Formats one contestant's introduction line:
 * - "Ở vị trí số X là bạn Y, đến từ <tên trường>."
 * - Omits ", đến từ ..." if school is empty
 * - Prefixes "Và " for the final contestant when >= 2 contestants
 */
export function formatContestantIntroLine(
  seat: ContestantScriptInput,
  index: number,
  total: number
): string {
  const seatNumber = Number.isFinite(seat.id) ? seat.id + 1 : index + 1;
  const spokenName = getContestantSpokenName(seat.name) || `Thí sinh số ${seatNumber}`;
  const school = (seat.school || "").trim();
  const isLast = index === total - 1 && total >= 2;

  if (activeCustomTtsScripts?.contestantIntroPattern) {
    const prefix = isLast ? "Và " : "";
    const line = interpolateTemplate(activeCustomTtsScripts.contestantIntroPattern, {
      viTri: seatNumber,
      soGhe: seatNumber,
      tenThiSinh: spokenName,
      tenTruong: school ? normalizeVietnameseTTS(school) : "",
    });
    return `${prefix}${line}`.trim();
  }

  const prefix = isLast ? "Và ở vị trí số" : "Ở vị trí số";
  const schoolClause = school ? `, đến từ ${normalizeVietnameseTTS(school)}` : "";
  return `${prefix} ${seatNumber} là bạn ${spokenName}${schoolClause}.`;
}

/**
 * 3D-stepped per-seat introduction segment (`pauseAfterMs: 0`).
 */
export function buildContestantIntroStepSegment(
  seats: ContestantScriptInput[],
  seatIdx: number
): DualMcScriptSegment | null {
  const active = normalizeIntroSeats(seats);
  if (seatIdx < 0 || seatIdx >= active.length) return null;
  const seat = active[seatIdx];
  return {
    role: seatIdx % 2 === 0 ? "khanh_vy" : "ngoc_huy",
    kind: "contestant_intro",
    seatId: seat.id,
    pauseAfterMs: 0,
    text: formatContestantIntroLine(seat, seatIdx, active.length),
  };
}

/**
 * Script 4: 1-2 natural breather/interaction lines AFTER contestant intro,
 * BEFORE "Các bạn đã sẵn sàng chưa?", then smoothly transitioning to Round 1.
 */
export function buildPostIntroBreatherScript(options: {
  seatCount: number;
  firstRound?: string;
  lastContestantRole?: DualMcRole;
  variantIdx?: number;
}): DualMcScriptSegment[] {
  const seatCount = Math.max(2, Math.min(8, options.seatCount || 4));
  const firstRound = options.firstRound || "khoiDong";
  const roundLabel = ROUND_VI_LABELS[firstRound] || "Khởi Động";
  const r1: DualMcRole =
    options.lastContestantRole === "khanh_vy" ? "ngoc_huy" : "khanh_vy";
  const r2: DualMcRole = r1 === "khanh_vy" ? "ngoc_huy" : "khanh_vy";
  const variant = Math.abs(options.variantIdx ?? 0) % 2;

  if (variant === 1) {
    return [
      {
        role: r1,
        kind: "breather",
        pauseAfterMs: 320,
        text: `Vậy là ${seatCount} nhà leo núi tài năng của chúng ta đã sẵn sàng bước vào hành trình chinh phục đỉnh cao tri thức.`,
      },
      {
        role: r2,
        kind: "breather",
        pauseAfterMs: 380,
        text: "Chúc tất cả các bạn giữ được sự bình tĩnh, tự tin và bứt phá hết mình qua từng vòng thi.",
      },
      {
        role: r1,
        kind: "ready_check",
        pauseAfterMs: 650,
        text: "Các bạn đã sẵn sàng chưa?",
      },
      {
        role: r2,
        kind: "round_transition",
        pauseAfterMs: 0,
        text: `Ngay bây giờ, chúng ta hãy cùng đến với phần thi đầu tiên: ${roundLabel}!`,
      },
    ];
  }

  return [
    {
      role: r1,
      kind: "breather",
      pauseAfterMs: 320,
      text: `${seatCount} gương mặt đầy bản lĩnh và tự tin đã có mặt đông đủ trên sân khấu của Đường lên đỉnh Olympia.`,
    },
    {
      role: r2,
      kind: "breather",
      pauseAfterMs: 400,
      text: "Hy vọng các bạn sẽ giữ vững tâm lý thật bình tĩnh, tự tin và thi đấu hết mình trong suốt bốn phần thi hôm nay.",
    },
    {
      role: r1,
      kind: "ready_check",
      pauseAfterMs: 650,
      text: "Các bạn đã sẵn sàng chưa?",
    },
    {
      role: r2,
      kind: "round_transition",
      pauseAfterMs: 0,
      text: `Ngay bây giờ, chúng ta sẽ cùng bước vào phần thi đầu tiên: ${roundLabel}!`,
    },
  ];
}

/**
 * Continuous contestant introduction script (used when skipping 3D animation or fast intro),
 * chaining all 2-8 contestants and then post-intro breathers -> ready check -> round 1 transition.
 */
export function buildContestantIntroContinuousScript(
  seats: ContestantScriptInput[],
  options?: {
    firstRound?: string;
    includeBreather?: boolean;
    variantIdx?: number;
  }
): DualMcScriptSegment[] {
  const active = normalizeIntroSeats(seats);
  if (active.length === 0) return [];

  const segments: DualMcScriptSegment[] = active.map((seat, idx) => ({
    role: idx % 2 === 0 ? "khanh_vy" : "ngoc_huy",
    kind: "contestant_intro",
    seatId: seat.id,
    pauseAfterMs: 280,
    text: formatContestantIntroLine(seat, idx, active.length),
  }));

  if (options?.includeBreather !== false) {
    const lastRole = segments[segments.length - 1]?.role ?? "ngoc_huy";
    segments.push(
      ...buildPostIntroBreatherScript({
        seatCount: active.length,
        firstRound: options?.firstRound,
        lastContestantRole: lastRole,
        variantIdx: options?.variantIdx,
      })
    );
  } else if (segments.length > 0) {
    segments[segments.length - 1].pauseAfterMs = 0;
  }

  return segments;
}

/**
 * Inter-round Score Summary step segment (score ascending order).
 */
export function buildScoreSummaryStepSegment(
  seat: ContestantScriptInput,
  index: number,
  total: number,
  options?: { isTiedTopWithPrev?: boolean; pauseAfterMs?: number }
): DualMcScriptSegment {
  const role: DualMcRole = index % 2 === 0 ? "khanh_vy" : "ngoc_huy";
  const name = getContestantSpokenName(seat.name) || `Thí sinh ${seat.id + 1}`;
  let text: string;
  if (index === total - 1 && total > 1) {
    text = options?.isTiedTopWithPrev
      ? `Cùng chia sẻ vị trí dẫn đầu là bạn ${name} với ${seat.score} điểm.`
      : `Và tạm dẫn đầu sau phần thi này là bạn ${name} với ${seat.score} điểm.`;
  } else if (index === 0) {
    text = `Bạn ${name} hiện đang có ${seat.score} điểm.`;
  } else {
    text = `Ở vị trí tiếp theo, bạn ${name} hiện đang có ${seat.score} điểm.`;
  }

  return {
    role,
    kind: "summary_item",
    seatId: seat.id,
    pauseAfterMs: options?.pauseAfterMs ?? 0,
    text,
  };
}

/**
 * Inter-round tactical commentary strictly derived from actual scores and next round.
 */
export function buildScoreSummaryCommentary(
  seats: ContestantScriptInput[],
  options?: { completedRound?: string; nextRound?: string; startRole?: DualMcRole }
): DualMcScriptSegment[] {
  const active = normalizeIntroSeats(seats);
  if (active.length === 0) return [];

  const sortedDesc = [...active].sort((a, b) => b.score - a.score || a.id - b.id);
  const maxScore = sortedDesc[0].score;
  const secondScore = sortedDesc[1]?.score ?? maxScore;
  const gapTop2 = maxScore - secondScore;
  const leaders = sortedDesc.filter((s) => s.score === maxScore);
  const leaderName = getContestantSpokenName(sortedDesc[0].name);
  const nextLabel = ROUND_VI_LABELS[options?.nextRound || ""] || "tiếp theo";
  const role: DualMcRole = options?.startRole ?? "ngoc_huy";

  let text: string;
  if (leaders.length >= 2) {
    text = `Cục diện đang vô cùng cân bằng khi có tới ${leaders.length} thí sinh cùng dẫn đầu với ${maxScore} điểm. Cơ hội bứt phá ở phía trước vẫn chia đều cho tất cả các bạn!`;
  } else if (gapTop2 <= 20) {
    text = `Khoảng cách giữa các thí sinh hiện rất sít sao, chỉ ${gapTop2} điểm cách biệt ở nhóm dẫn đầu. Phần thi ${nextLabel} hứa hẹn sẽ còn nhiều bất ngờ!`;
  } else if (gapTop2 <= 60) {
    text = `Bạn ${leaderName} đang tạm nắm giữ lợi thế với ${maxScore} điểm, nhưng cục diện hoàn toàn có thể đảo chiều trong phần thi ${nextLabel}.`;
  } else {
    text = `Bạn ${leaderName} đang tạo ra một cách biệt khá an toàn với ${maxScore} điểm. Tuy nhiên, các nhà leo núi còn lại vẫn còn nhiều cơ hội ghi điểm ở phần thi ${nextLabel}!`;
  }

  return [
    {
      role,
      kind: "summary_commentary",
      pauseAfterMs: 0,
      text,
    },
  ];
}

/**
 * Inter-round full score summary script (ascending score order + tactical commentary).
 */
export function buildScoreSummaryScript(
  seats: ContestantScriptInput[],
  options?: { completedRound?: string; nextRound?: string; includeCommentary?: boolean }
): DualMcScriptSegment[] {
  const active = normalizeIntroSeats(seats);
  if (active.length === 0) return [];

  const sortedAsc = [...active].sort((a, b) => a.score - b.score || a.id - b.id);
  const maxScore = Math.max(...sortedAsc.map((s) => s.score));
  const segments: DualMcScriptSegment[] = sortedAsc.map((seat, idx) => {
    const prev = idx > 0 ? sortedAsc[idx - 1] : null;
    const isTiedTopWithPrev = Boolean(
      prev && prev.score === maxScore && seat.score === maxScore
    );
    return buildScoreSummaryStepSegment(seat, idx, sortedAsc.length, {
      isTiedTopWithPrev,
      pauseAfterMs: 260,
    });
  });

  if (options?.includeCommentary !== false) {
    const lastRole = segments[segments.length - 1]?.role ?? "khanh_vy";
    const nextRole: DualMcRole = lastRole === "khanh_vy" ? "ngoc_huy" : "khanh_vy";
    segments.push(
      ...buildScoreSummaryCommentary(active, {
        completedRound: options?.completedRound,
        nextRound: options?.nextRound,
        startRole: nextRole,
      })
    );
  } else if (segments.length > 0) {
    segments[segments.length - 1].pauseAfterMs = 0;
  }

  return segments;
}

function getRankAudioAndPitch(
  rank: number,
  position: number,
  isTiedRank3OrHigher: boolean
): {
  awardLabel: "Quán quân" | "Giải Nhì" | "Giải Ba" | "Đồng Giải Ba";
  spokenAwardLabel: string;
  audioTrack:
    | "6_NhacKhac/summary_rank_1"
    | "6_NhacKhac/summary_rank_2"
    | "6_NhacKhac/summary_rank_3"
    | "6_NhacKhac/summary_rank_4";
  playbackRate: number;
} {
  if (rank === 1) {
    return {
      awardLabel: "Quán quân",
      spokenAwardLabel: "Quán quân",
      audioTrack: "6_NhacKhac/summary_rank_1",
      playbackRate: 1.0,
    };
  }
  if (rank === 2) {
    return {
      awardLabel: "Giải Nhì",
      spokenAwardLabel: "Giải Nhì",
      audioTrack: "6_NhacKhac/summary_rank_2",
      playbackRate: 1.0,
    };
  }
  if (rank === 3 && !isTiedRank3OrHigher && position <= 3) {
    return {
      awardLabel: "Giải Ba",
      spokenAwardLabel: "Giải Ba",
      audioTrack: "6_NhacKhac/summary_rank_3",
      playbackRate: 1.0,
    };
  }

  // Rank 3 tied or position >= 4 -> NEVER "Giải Tư", always "Đồng Giải Ba"
  const effectivePos = Math.max(4, position, rank);
  const rate =
    effectivePos <= 4
      ? 1.0
      : Math.max(0.85, +(1.0 - (effectivePos - 4) * 0.02).toFixed(2));
  return {
    awardLabel: "Đồng Giải Ba",
    spokenAwardLabel: "đồng Giải Ba",
    audioTrack:
      position === 3 && rank === 3
        ? "6_NhacKhac/summary_rank_3"
        : "6_NhacKhac/summary_rank_4",
    playbackRate: rate,
  };
}

/**
 * Computes authoritative Olympia rankings (never emitting "Giải Tư"):
 * - CHP winner takes 1st place when resolving top tie
 * - Ranks 5..8 reuse `6_NhacKhac/summary_rank_4` with subtle pitch/playbackRate step-down (0.98..0.92)
 */
export function computeOlympiaMatchRankings(
  seats: ContestantScriptInput[],
  chpWinnerSeatId?: number | null
): OlympiaRankedContestant[] {
  const active = normalizeIntroSeats(seats);
  if (active.length === 0) return [];

  const sortedDesc = [...active].sort((a, b) => {
    const aChp = chpWinnerSeatId != null && a.id === chpWinnerSeatId ? 1 : 0;
    const bChp = chpWinnerSeatId != null && b.id === chpWinnerSeatId ? 1 : 0;
    if (aChp !== bChp) return bChp - aChp;
    if (b.score !== a.score) return b.score - a.score;
    return a.id - b.id;
  });

  const rawRanks: number[] = [];
  for (let i = 0; i < sortedDesc.length; i++) {
    if (i === 0) {
      rawRanks.push(1);
    } else {
      const prev = sortedDesc[i - 1];
      const cur = sortedDesc[i];
      const prevWasChp = chpWinnerSeatId != null && prev.id === chpWinnerSeatId;
      if (!prevWasChp && cur.score === prev.score) {
        rawRanks.push(rawRanks[i - 1]);
      } else {
        rawRanks.push(i + 1);
      }
    }
  }

  const rank3Count = rawRanks.filter((r) => r === 3).length;
  const hasRank4Plus = sortedDesc.length >= 4;

  return sortedDesc.map((seat, idx) => {
    const position = idx + 1;
    const rank = rawRanks[idx];
    const isTiedRank3OrHigher = rank === 3 && (rank3Count >= 2 || hasRank4Plus);
    const meta = getRankAudioAndPitch(rank, position, isTiedRank3OrHigher);
    return {
      seat,
      rank,
      position,
      awardLabel: meta.awardLabel,
      spokenAwardLabel: meta.spokenAwardLabel,
      audioTrack: meta.audioTrack,
      playbackRate: meta.playbackRate,
      pitchRate: meta.playbackRate,
    };
  });
}

/**
 * Post-match summary MC opening at CAM 3 (`currentIndex: -1`) before manual TS1 -> TSX stepping.
 */
export function buildPostMatchMcOpeningSegment(options?: {
  roomName?: string;
  seatCount?: number;
  variantIdx?: number;
}): DualMcScriptSegment[] {
  const trimmed = (options?.roomName || "").trim();
  const variant = Math.abs(options?.variantIdx ?? 0) % 2;

  if (variant === 1) {
    return [
      {
        role: "khanh_vy",
        kind: "post_match_opening",
        pauseAfterMs: 280,
        text: trimmed
          ? `Tất cả các phần thi của trận đấu ${trimmed} đã khép lại! Xin mời quý vị cùng nhìn lại điểm số chung cuộc của từng nhà leo núi.`
          : "Tất cả các phần thi đã chính thức khép lại! Xin mời quý vị cùng điểm lại thành tích chung cuộc của từng thí sinh.",
      },
      {
        role: "ngoc_huy",
        kind: "post_match_opening",
        pauseAfterMs: 0,
        text: "Chúng ta sẽ cùng đến với phần tổng kết điểm số của các bạn thí sinh ngay sau đây!",
      },
    ];
  }

  return [
    {
      role: "khanh_vy",
      kind: "post_match_opening",
      pauseAfterMs: 280,
      text: "Sau những màn tranh tài kịch tính, chúng ta đã hoàn thành tất cả các vòng thi của chương trình Đường lên đỉnh Olympia hôm nay!",
    },
    {
      role: "ngoc_huy",
      kind: "post_match_opening",
      pauseAfterMs: 0,
      text: "Ngay bây giờ, hãy cùng Khánh Vy và Ngọc Huy điểm lại điểm số và thứ hạng chung cuộc của từng thí sinh từ vị trí số 1 nhé!",
    },
  ];
}

/**
 * Post-match manual Host stepping helper (Design Sync Update #2 / R6):
 * - Looks up contestant strictly in seat order TS1 -> TS2 -> ... -> TSX (never re-sorted by score)
 * - Reads score + authentic Olympia rank (Giải Nhất / Giải Nhì / Giải Ba / Đồng Giải Ba — NEVER "Giải Tư")
 * - Attaches actual rank's `audioTrack` (`6_NhacKhac/summary_rank_1..4`) and `playbackRate`/`pitchRate` (0.98..0.92 for ranks 5..8)
 * - `pauseAfterMs: 0` (manual Host control, no auto-advance)
 */
export function buildPostMatchContestantSummarySegment(
  seats: ContestantScriptInput[],
  seatIdOrIndex: number,
  options?: {
    bySeatId?: boolean;
    chpWinnerSeatId?: number | null;
    seatRanks?: Record<number, number>;
    stepIndex?: number;
  }
): DualMcScriptSegment | null {
  const orderedBySeat = [...normalizeIntroSeats(seats)].sort((a, b) => a.id - b.id);
  if (orderedBySeat.length === 0) return null;

  let seatIdx = -1;
  if (options?.bySeatId !== false) {
    seatIdx = orderedBySeat.findIndex((s) => s.id === seatIdOrIndex);
  }
  if (seatIdx === -1 && seatIdOrIndex >= 0 && seatIdOrIndex < orderedBySeat.length) {
    seatIdx = seatIdOrIndex;
  }
  if (seatIdx === -1) return null;

  const targetSeat = orderedBySeat[seatIdx];
  const rankings = computeOlympiaMatchRankings(orderedBySeat, options?.chpWinnerSeatId);
  const ranked = rankings.find((r) => r.seat.id === targetSeat.id);
  if (!ranked) return null;

  const overrideRank = options?.seatRanks?.[targetSeat.id];
  const effectiveRank = overrideRank ?? ranked.rank;
  const effectivePos = overrideRank ?? ranked.position;
  const meta =
    overrideRank != null
      ? getRankAudioAndPitch(
          effectiveRank,
          effectivePos,
          effectiveRank >= 3 && orderedBySeat.length >= 4
        )
      : {
          awardLabel: ranked.awardLabel,
          spokenAwardLabel: ranked.spokenAwardLabel,
          audioTrack: ranked.audioTrack,
          playbackRate: ranked.playbackRate,
        };

  const name = getContestantSpokenName(targetSeat.name) || `Thí sinh ${targetSeat.id + 1}`;
  const seatNumber = targetSeat.id + 1;
  const role: DualMcRole =
    (options?.stepIndex ?? seatIdx) % 2 === 0 ? "khanh_vy" : "ngoc_huy";

  let text: string;
  if (effectiveRank === 1) {
    text = `Ở vị trí số ${seatNumber}, bạn ${name} xuất sắc đạt ${targetSeat.score} điểm và giành Giải Nhất chung cuộc!`;
  } else if (effectiveRank === 2) {
    text = `Ở vị trí số ${seatNumber}, bạn ${name} đạt ${targetSeat.score} điểm, giành Giải Nhì chung cuộc!`;
  } else if (meta.awardLabel === "Giải Ba") {
    text = `Ở vị trí số ${seatNumber}, bạn ${name} kết thúc trận đấu với ${targetSeat.score} điểm, giành Giải Ba!`;
  } else {
    text = `Ở vị trí số ${seatNumber}, bạn ${name} hoàn thành cuộc thi với ${targetSeat.score} điểm và giành đồng Giải Ba.`;
  }

  return {
    role,
    kind: "post_match_item",
    seatId: targetSeat.id,
    pauseAfterMs: 0,
    audioTrack: meta.audioTrack,
    playbackRate: meta.playbackRate,
    pitchRate: meta.playbackRate,
    rank: effectiveRank,
    awardLabel: meta.awardLabel,
    text,
  };
}

/**
 * Script 6 & Follow-up / R8: Computes full final award ceremony plan:
 * - Detects unresolved first-place tie -> outputs `isTieForFirst: true` Câu hỏi phụ notice
 * - Orders award steps low-to-high (Đồng Giải Ba / Giải Ba -> Giải Nhì -> Quán quân)
 * - Never emits "Giải Tư"
 */
export function computeFinalAwardPlan(
  seats: ContestantScriptInput[],
  options?: { chpWinnerSeatId?: number | null }
): AwardCeremonyPlan {
  const active = normalizeIntroSeats(seats);
  if (active.length === 0) {
    return {
      isTieForFirst: false,
      tiedLeaderIds: [],
      rankings: [],
      steps: [],
      segments: [],
    };
  }

  const maxScore = Math.max(...active.map((s) => s.score));
  const topSeats = active.filter((s) => s.score === maxScore);
  const isTieForFirst =
    topSeats.length >= 2 &&
    (options?.chpWinnerSeatId == null ||
      !topSeats.some((s) => s.id === options.chpWinnerSeatId));

  if (isTieForFirst) {
    const tiedLeaderIds = topSeats.map((s) => s.id);
    const names = joinVietnameseNamesWithVa(topSeats.map((s) => s.name));
    const segments: DualMcScriptSegment[] = [
      {
        role: "khanh_vy",
        kind: "tie_notice",
        pauseAfterMs: 300,
        text: `Thật kịch tính! Sau phần thi Về đích, chúng ta có ${topSeats.length} thí sinh cùng đạt số điểm cao nhất là ${maxScore} điểm: ${names}.`,
      },
      {
        role: "ngoc_huy",
        kind: "tie_notice",
        pauseAfterMs: 0,
        text: "Để tìm ra chủ nhân xứng đáng nhất của chiếc vòng nguyệt quế hôm nay, các bạn sẽ phải bước vào phần thi Câu hỏi phụ!",
      },
    ];
    return {
      isTieForFirst: true,
      tiedLeaderIds,
      rankings: computeOlympiaMatchRankings(active, options?.chpWinnerSeatId),
      steps: [],
      segments,
    };
  }

  const rankings = computeOlympiaMatchRankings(active, options?.chpWinnerSeatId);
  const lowToHigh = [...rankings].reverse();
  const steps: AwardCeremonyStep[] = lowToHigh.map((r) => ({
    rank: r.rank,
    position: r.position,
    awardLabel: r.awardLabel,
    seatIds: [r.seat.id],
    audioTrack: r.audioTrack,
    playbackRate: r.playbackRate,
    pitchRate: r.pitchRate,
  }));

  const segments: DualMcScriptSegment[] = [];
  lowToHigh.forEach((r, idx) => {
    const role: DualMcRole = idx % 2 === 0 ? "khanh_vy" : "ngoc_huy";
    const name = getContestantSpokenName(r.seat.name);
    const school = (r.seat.school || "").trim();
    const schoolClause = school ? `, đến từ ${normalizeVietnameseTTS(school)}` : "";

    if (r.rank === 1) {
      segments.push({
        role,
        kind: "award_item",
        seatId: r.seat.id,
        rank: 1,
        awardLabel: "Quán quân",
        audioTrack: "6_NhacKhac/summary_rank_1",
        playbackRate: 1.0,
        pitchRate: 1.0,
        pauseAfterMs: 650,
        text: `Và xin được chúc mừng chủ nhân của chiếc vòng nguyệt quế vinh quang hôm nay — Quán quân bạn ${name}${schoolClause}, xuất sắc giành chiến thắng chung cuộc với ${r.seat.score} điểm!`,
      });
      segments.push({
        role: role === "khanh_vy" ? "ngoc_huy" : "khanh_vy",
        kind: "award_item",
        seatId: r.seat.id,
        rank: 1,
        awardLabel: "Quán quân",
        audioTrack: "6_NhacKhac/prize_award",
        playbackRate: 1.0,
        pitchRate: 1.0,
        pauseAfterMs: 550,
        text: `Xin mời bạn ${name} bước lên bục vinh quang để đón nhận chiếc vòng nguyệt quế chiến thắng!`,
      });
    } else if (r.rank === 2) {
      segments.push({
        role,
        kind: "award_item",
        seatId: r.seat.id,
        rank: 2,
        awardLabel: "Giải Nhì",
        audioTrack: "6_NhacKhac/summary_rank_2",
        playbackRate: 1.0,
        pitchRate: 1.0,
        pauseAfterMs: 420,
        text: `Xin chúc mừng Giải Nhì chung cuộc thuộc về bạn ${name}${schoolClause} với tổng số điểm là ${r.seat.score} điểm!`,
      });
    } else if (r.awardLabel === "Giải Ba") {
      segments.push({
        role,
        kind: "award_item",
        seatId: r.seat.id,
        rank: 3,
        awardLabel: "Giải Ba",
        audioTrack: "6_NhacKhac/summary_rank_3",
        playbackRate: 1.0,
        pitchRate: 1.0,
        pauseAfterMs: 380,
        text: `Xin chúc mừng Giải Ba thuộc về bạn ${name}${schoolClause} với ${r.seat.score} điểm.`,
      });
    } else {
      segments.push({
        role,
        kind: "award_item",
        seatId: r.seat.id,
        rank: r.rank,
        awardLabel: "Đồng Giải Ba",
        audioTrack: r.audioTrack,
        playbackRate: r.playbackRate,
        pitchRate: r.pitchRate,
        pauseAfterMs: 360,
        text: `Xin chúc mừng bạn ${name}${schoolClause} về đích ở vị trí thứ ${r.position} và giành đồng Giải Ba với ${r.seat.score} điểm.`,
      });
    }
  });

  return {
    isTieForFirst: false,
    tiedLeaderIds: [],
    rankings,
    steps,
    segments,
  };
}

/**
 * Closing dual-MC thank-you and farewell script (`6_NhacKhac/ending_music`).
 */
export function buildClosingFarewellScript(options?: {
  roomName?: string;
  variantIdx?: number;
}): DualMcScriptSegment[] {
  const trimmed = (options?.roomName || "").trim();
  const variant = Math.abs(options?.variantIdx ?? 0) % 2;

  if (variant === 1) {
    return [
      {
        role: "khanh_vy",
        kind: "farewell",
        pauseAfterMs: 300,
        audioTrack: "6_NhacKhac/ending_music",
        text: trimmed
          ? `Trận đấu ${trimmed} của chương trình Đường lên đỉnh Olympia xin được khép lại tại đây. Cảm ơn quý vị khán giả, quý thầy cô và gia đình đã luôn dõi theo cổ vũ.`
          : "Chương trình Đường lên đỉnh Olympia xin được khép lại tại đây. Cảm ơn quý vị khán giả, quý thầy cô và gia đình đã luôn dõi theo cổ vũ.",
      },
      {
        role: "ngoc_huy",
        kind: "farewell",
        pauseAfterMs: 0,
        text: "Ngọc Huy và Khánh Vy xin kính chào tạm biệt và hẹn gặp lại quý vị trong những cuộc hành trình tiếp theo!",
      },
    ];
  }

  return [
    {
      role: "khanh_vy",
      kind: "farewell",
      pauseAfterMs: 300,
      audioTrack: "6_NhacKhac/ending_music",
      text: "Xin cảm ơn các bạn thí sinh đã cống hiến một trận đấu tuyệt vời, cảm ơn quý thầy cô, gia đình và quý vị khán giả đã luôn đồng hành cùng chương trình.",
    },
    {
      role: "ngoc_huy",
      kind: "farewell",
      pauseAfterMs: 0,
      text: "Khánh Vy và Ngọc Huy xin nói lời chào tạm biệt và hẹn gặp lại quý vị trong những cuộc hành trình Đường lên đỉnh Olympia tiếp theo!",
    },
  ];
}

/**
 * Full Final Award Ceremony + optional Closing Farewell script.
 */
export function buildFinalAwardCeremonyScript(
  seats: ContestantScriptInput[],
  options?: {
    chpWinnerSeatId?: number | null;
    roomName?: string;
    includeClosing?: boolean;
    variantIdx?: number;
  }
): DualMcScriptSegment[] {
  const plan = computeFinalAwardPlan(seats, {
    chpWinnerSeatId: options?.chpWinnerSeatId,
  });
  if (plan.isTieForFirst || options?.includeClosing === false) {
    return plan.segments;
  }
  return [
    ...plan.segments,
    ...buildClosingFarewellScript({
      roomName: options?.roomName,
      variantIdx: options?.variantIdx,
    }),
  ];
}

/**
 * Modular Award Tier TTS builder (Design Sync Update #3 / R8):
 * Individually callable per tier: `"third" | "second" | "first" | "closing"`.
 * Integrates seamlessly with `OlympiaAwardsState.tiers` or computes from `seats`.
 */
export function buildAwardTierScript(
  tier: OlympiaAwardScriptTier,
  seats: ContestantScriptInput[],
  options?: {
    chpWinnerSeatId?: number | null;
    tiers?: { first: number[]; second: number[]; third: number[] };
    roomName?: string;
    variantIdx?: number;
  }
): DualMcScriptSegment[] {
  if (tier === "closing") {
    return buildClosingFarewellScript({
      roomName: options?.roomName,
      variantIdx: options?.variantIdx,
    });
  }

  const active = normalizeIntroSeats(seats);
  const rankings = computeOlympiaMatchRankings(active, options?.chpWinnerSeatId);
  const byId = new Map(active.map((s) => [s.id, s]));

  if (tier === "third") {
    const thirdIds = options?.tiers?.third;
    const thirdEntries = thirdIds
      ? thirdIds
          .map((id) => rankings.find((r) => r.seat.id === id) || (byId.get(id) ? {
            seat: byId.get(id)!,
            rank: 3,
            position: 3,
            awardLabel: (thirdIds.length >= 2 ? "Đồng Giải Ba" : "Giải Ba") as "Giải Ba" | "Đồng Giải Ba",
            spokenAwardLabel: thirdIds.length >= 2 ? "đồng Giải Ba" : "Giải Ba",
            audioTrack: "6_NhacKhac/summary_rank_3" as const,
            playbackRate: 1.0,
            pitchRate: 1.0,
          } : null))
          .filter((x): x is OlympiaRankedContestant => Boolean(x))
      : rankings.filter((r) => r.rank >= 3);

    if (thirdEntries.length === 0) return [];

    if (thirdEntries.length === 1) {
      const r = thirdEntries[0];
      const name = getContestantSpokenName(r.seat.name);
      const school = (r.seat.school || "").trim();
      const schoolClause = school ? `, đến từ ${normalizeVietnameseTTS(school)}` : "";
      return [
        {
          role: "khanh_vy",
          kind: "award_item",
          seatId: r.seat.id,
          rank: r.rank,
          awardLabel: r.awardLabel,
          audioTrack: "6_NhacKhac/prize_award",
          playbackRate: r.playbackRate,
          pitchRate: r.pitchRate,
          pauseAfterMs: 0,
          text: `Xin chúc mừng Giải Ba của chương trình thuộc về bạn ${name}${schoolClause} với ${r.seat.score} điểm!`,
        },
      ];
    }

    const nameList = joinVietnameseNamesWithVa(thirdEntries.map((r) => r.seat.name));
    return [
      {
        role: "khanh_vy",
        kind: "award_item",
        rank: 3,
        awardLabel: "Đồng Giải Ba",
        audioTrack: "6_NhacKhac/prize_award",
        playbackRate: 1.0,
        pitchRate: 1.0,
        pauseAfterMs: 260,
        text: `Xin mời các bạn đồng Giải Ba của cuộc thi hôm nay bước lên bục vinh quang: ${nameList}!`,
      },
      {
        role: "ngoc_huy",
        kind: "award_item",
        rank: 3,
        awardLabel: "Đồng Giải Ba",
        audioTrack: "6_NhacKhac/prize_award",
        playbackRate: 1.0,
        pitchRate: 1.0,
        pauseAfterMs: 0,
        text: "Một tràng pháo tay thật lớn để chúc mừng thành tích đáng tự hào của các bạn!",
      },
    ];
  }

  if (tier === "second") {
    const secondIds = options?.tiers?.second;
    const secondEntries = secondIds
      ? secondIds
          .map((id) => rankings.find((r) => r.seat.id === id) || (byId.get(id) ? {
            seat: byId.get(id)!,
            rank: 2,
            position: 2,
            awardLabel: "Giải Nhì" as const,
            spokenAwardLabel: "Giải Nhì",
            audioTrack: "6_NhacKhac/summary_rank_2" as const,
            playbackRate: 1.0,
            pitchRate: 1.0,
          } : null))
          .filter((x): x is OlympiaRankedContestant => Boolean(x))
      : rankings.filter((r) => r.rank === 2);

    if (secondEntries.length === 0) return [];
    if (secondEntries.length === 1) {
      const r = secondEntries[0];
      const name = getContestantSpokenName(r.seat.name);
      const school = (r.seat.school || "").trim();
      const schoolClause = school ? `, đến từ ${normalizeVietnameseTTS(school)}` : "";
      return [
        {
          role: "ngoc_huy",
          kind: "award_item",
          seatId: r.seat.id,
          rank: 2,
          awardLabel: "Giải Nhì",
          audioTrack: "6_NhacKhac/prize_award",
          playbackRate: 1.0,
          pitchRate: 1.0,
          pauseAfterMs: 0,
          text: `Và chủ nhân của Giải Nhì chung cuộc hôm nay xin chúc mừng bạn ${name}${schoolClause}, đạt tổng số điểm ${r.seat.score} điểm!`,
        },
      ];
    }

    const nameList = joinVietnameseNamesWithVa(secondEntries.map((r) => r.seat.name));
    return [
      {
        role: "ngoc_huy",
        kind: "award_item",
        rank: 2,
        awardLabel: "Giải Nhì",
        audioTrack: "6_NhacKhac/prize_award",
        playbackRate: 1.0,
        pitchRate: 1.0,
        pauseAfterMs: 0,
        text: `Xin chúc mừng các bạn đồng Giải Nhì chung cuộc: ${nameList}!`,
      },
    ];
  }

  // tier === "first"
  const firstIds = options?.tiers?.first;
  const firstEntries = firstIds
    ? firstIds
        .map((id) => rankings.find((r) => r.seat.id === id) || (byId.get(id) ? {
          seat: byId.get(id)!,
          rank: 1,
          position: 1,
          awardLabel: "Quán quân" as const,
          spokenAwardLabel: "Quán quân",
          audioTrack: "6_NhacKhac/summary_rank_1" as const,
          playbackRate: 1.0,
          pitchRate: 1.0,
        } : null))
        .filter((x): x is OlympiaRankedContestant => Boolean(x))
    : rankings.filter((r) => r.rank === 1);

  if (firstEntries.length === 0) return [];
  const champ = firstEntries[0];
  const champName = getContestantSpokenName(champ.seat.name);
  const school = (champ.seat.school || "").trim();
  const schoolClause = school ? `, đến từ ${normalizeVietnameseTTS(school)}` : "";

  return [
    {
      role: "khanh_vy",
      kind: "award_item",
      seatId: champ.seat.id,
      rank: 1,
      awardLabel: "Quán quân",
      audioTrack: "6_NhacKhac/prize_award",
      playbackRate: 1.0,
      pitchRate: 1.0,
      pauseAfterMs: 350,
      text: `Giây phút vinh quang nhất đã đến! Xin chúc mừng Quán quân của chúng ta hôm nay — bạn ${champName}${schoolClause}, xuất sắc giành chiến thắng với ${champ.seat.score} điểm!`,
    },
    {
      role: "ngoc_huy",
      kind: "award_item",
      seatId: champ.seat.id,
      rank: 1,
      awardLabel: "Quán quân",
      audioTrack: "6_NhacKhac/prize_award",
      playbackRate: 1.0,
      pitchRate: 1.0,
      pauseAfterMs: 0,
      text: `Xin mời bạn ${champName} bước lên bậc cao nhất của Bục Vinh Quang để đón nhận chiếc Vòng Nguyệt Quế danh giá!`,
    },
  ];
}

export function speakAwardTierAsync(
  tier: OlympiaAwardScriptTier,
  seats: ContestantScriptInput[],
  options?: {
    chpWinnerSeatId?: number | null;
    tiers?: { first: number[]; second: number[]; third: number[] };
    roomName?: string;
    variantIdx?: number;
    season?: string;
    baseRate?: number;
    preferServer?: boolean;
    engine?: "server" | "webspeech" | "auto";
    onEnd?: () => void;
  }
): Promise<boolean> {
  const segments = buildAwardTierScript(tier, seats, options);
  return speakDualMcScriptAsync(segments, {
    season: options?.season,
    baseRate: options?.baseRate,
    preferServer: options?.preferServer,
    engine: options?.engine,
    onEnd: options?.onEnd,
  });
}

export function speakAwardTier(
  tier: OlympiaAwardScriptTier,
  seats: ContestantScriptInput[],
  options?: Parameters<typeof speakAwardTierAsync>[2]
): void {
  void speakAwardTierAsync(tier, seats, options);
}

// ============================================================================
// 7. Buzzer Callouts, Interrupts, Hype Fillers, Explanations & Steal Variants
// ============================================================================

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

let lastBuzzedContestant: string | null = null;
let lastBuzzerCalloutVariant: string | null = null;

export function resetBuzzerTurnState(): void {
  lastBuzzedContestant = null;
  lastBuzzerCalloutVariant = null;
}

export function getLastBuzzedContestant(): string | null {
  return lastBuzzedContestant;
}

/**
 * Buzzer Callout Variations (R3 / F11):
 * - Non-consecutive: `<Tên>!`, `Xin mời <Tên>!`, `Mời <Tên>!`
 * - Consecutive: probabilistic blend between `Tiếp tục là <Tên>!` (~65%) and base variants (~35%)
 */
export function generateBuzzerCallout(
  name: string,
  isConsecutive: boolean = false,
  rng: () => number = Math.random
): string {
  const cleanName = getContestantSpokenName(name);
  if (!cleanName) return "";

  const baseVariants = [
    `${cleanName}!`,
    `Xin mời ${cleanName}!`,
    `Mời ${cleanName}!`,
  ];

  let picked: string;
  if (isConsecutive) {
    if (rng() < 0.65) {
      picked = `Tiếp tục là ${cleanName}!`;
    } else {
      const idx = Math.floor(clamp(rng(), 0, 0.999999) * baseVariants.length);
      picked = baseVariants[idx];
    }
  } else {
    const candidates =
      baseVariants.length > 1 && lastBuzzerCalloutVariant && rng === Math.random
        ? baseVariants.filter((v) => v !== lastBuzzerCalloutVariant)
        : baseVariants;
    const idx = Math.floor(clamp(rng(), 0, 0.999999) * candidates.length);
    picked = candidates[idx];
  }

  lastBuzzerCalloutVariant = picked;
  return picked;
}

/**
 * Handle buzzer interrupt during question reading:
 * - Natural pause at word/phrase boundary (up to ~500ms reflex window)
 * - Co-host calls contestant name after ~500ms bell-to-callout timing
 */
export function handleBuzzerInterrupt(
  contestantName: string,
  options?: {
    readingHost?: MCRole;
    coHost?: MCRole;
    isConsecutive?: boolean;
    reflexPauseMs?: number;
    reflexStopMaxMs?: number;
    season?: string;
    round?: string;
    turnIdx?: number;
    qIdx?: number;
    segIdx?: number;
    onEnd?: () => void;
  }
): void {
  cancelBuzzerInterrupt();

  // 1. Natural word/phrase boundary stop
  const stopDelayMs = smoothStopOlympiaTTS(
    45,
    options?.reflexStopMaxMs ?? KD_CHP_REFLEX_PAUSE_MS
  );

  if (!contestantName) return;

  const spokenKey = getContestantSpokenName(contestantName) || contestantName;
  const isConsecutive =
    options?.isConsecutive !== undefined
      ? options.isConsecutive
      : lastBuzzedContestant === spokenKey;
  lastBuzzedContestant = spokenKey;

  const requestedDelay = options?.reflexPauseMs ?? KD_CHP_POST_BELL_CALLOUT_MS;
  const effectiveDelayMs = Math.max(requestedDelay, stopDelayMs > 0 ? stopDelayMs + 40 : 0);

  // 2. Post-bell callout (~500ms)
  buzzerPauseTimer = setTimeout(() => {
    buzzerPauseTimer = null;
    const callout = generateBuzzerCallout(contestantName, isConsecutive);
    const coHost =
      normalizeDualRole(options?.coHost) ||
      (options?.readingHost === "khanh_vy"
        ? "ngoc_huy"
        : options?.readingHost === "ngoc_huy"
        ? "khanh_vy"
        : resolveMCRole({
            round: options?.round,
            turnIdx: options?.turnIdx,
            qIdx: options?.qIdx,
            segIdx: options?.segIdx,
            segment: "buzzer",
          }));

    speakOlympiaTTS(callout, {
      role: coHost,
      segment: "buzzer",
      season: options?.season,
      round: options?.round,
      turnIdx: options?.turnIdx,
      qIdx: options?.qIdx,
      segIdx: options?.segIdx,
      onEnd: options?.onEnd,
    });
  }, effectiveDelayMs);
}

export const HYPE_FILLER_BANK: Record<HypeFillerCategory, string[]> = {
  streak: [
    "Một chuỗi trả lời chính xác liên tiếp quá ấn tượng!",
    "Phong độ cực kỳ ổn định và bản lĩnh!",
    "Liên tiếp ghi điểm với tốc độ đáng kinh ngạc!",
    "Sự tự tin đang lên rất cao trên bục thi đấu!",
  ],
  steal: [
    "Một pha cướp điểm vô cùng quyết đoán!",
    "Cơ hội đã được tận dụng một cách hoàn hảo!",
    "Tình huống bấm chuông giành quyền cực kỳ táo bạo!",
    "Cuộc rượt đuổi điểm số lại càng thêm hấp dẫn!",
  ],
  big_points: [
    "Điểm số vừa được nâng lên một bước tiến rất lớn!",
    "Một gói câu hỏi mang lại bứt phá ngoạn mục!",
    "Chiến thuật lựa chọn rất chính xác và hiệu quả!",
    "Số điểm cực kỳ quan trọng vào thời điểm then chốt!",
  ],
  dramatic: [
    "Không khí tại trường quay lúc này đang căng thẳng hơn bao giờ hết!",
    "Từng điểm số lúc này đều có thể xoay chuyển cục diện trận đấu!",
    "Một màn so tài quá kịch tính giữa các nhà leo núi!",
    "Cả bốn thí sinh đều đang bám đuổi nhau từng điểm một!",
  ],
  encouragement: [
    "Hãy hít thở thật sâu và giữ vững sự bình tĩnh cho những câu hỏi tiếp theo!",
    "Cơ hội phía trước vẫn còn rất rộng mở cho các bạn!",
    "Một nỗ lực rất đáng khen, hãy tiếp tục tự tin nhé!",
    "Cuộc đua vẫn còn dài, mọi điều bất ngờ đều có thể xảy ra!",
  ],
};

let lastHypeFiller: string | null = null;

export function pickHypeFiller(
  category: HypeFillerCategory = "dramatic",
  rng: () => number = Math.random
): string {
  const bank = HYPE_FILLER_BANK[category] || HYPE_FILLER_BANK.dramatic;
  const candidates =
    bank.length > 1 && lastHypeFiller && rng === Math.random
      ? bank.filter((line) => line !== lastHypeFiller)
      : bank;
  const idx = Math.floor(clamp(rng(), 0, 0.999999) * candidates.length);
  const picked = candidates[idx];
  lastHypeFiller = picked;
  return picked;
}

export function shouldTriggerAutoHypeFiller(
  ctx: {
    round: string;
    isCorrect: boolean;
    streak?: number;
    points?: number;
    hopeStar?: boolean;
    isSteal?: boolean;
    cooldownOk?: boolean;
  },
  rng: () => number = Math.random
): boolean {
  if (ctx.cooldownOk === false) return false;
  const qualified =
    (ctx.isCorrect && (ctx.streak ?? 0) >= 3) ||
    (ctx.round === "veDich" &&
      ctx.isCorrect &&
      ((ctx.points ?? 0) >= 30 || Boolean(ctx.hopeStar) || Boolean(ctx.isSteal)));
  if (!qualified) return false;
  return rng() < 0.65;
}

function normalizeComparisonText(raw: string): string {
  return (raw || "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Strictly data-grounded explanation builder (ZERO hallucination):
 * - Uses `explanation` if present and distinct from question/answer
 * - Uses `hint` ONLY when `round !== "vcnv"` (because `VcnvRowDef.hint` stores the row question!)
 *   and distinct from `questionText` / `answer`
 * - Returns `null` when no explanation data exists (unless `allowSafeFallback` is explicitly true)
 */
export function buildAnswerExplanation(input: {
  answer?: string;
  explanation?: string;
  hint?: string;
  questionText?: string;
  round?: string;
  allowSafeFallback?: boolean;
}): string | null {
  const normQ = normalizeComparisonText(input.questionText || "");
  const normA = normalizeComparisonText(input.answer || "");

  const exp = (input.explanation || "").trim();
  if (exp) {
    const normExp = normalizeComparisonText(exp);
    if (normExp && normExp !== normQ && normExp !== normA) {
      return normalizeVietnameseTTS(exp);
    }
  }

  const isVcnv = (input.round || "").toLowerCase() === "vcnv";
  const hint = (input.hint || "").trim();
  if (!isVcnv && hint) {
    const normHint = normalizeComparisonText(hint);
    if (normHint && normHint !== normQ && normHint !== normA) {
      return normalizeVietnameseTTS(hint);
    }
  }

  if (input.allowSafeFallback && input.answer?.trim()) {
    const summary = summarizeOlympiaAnswer(input.answer);
    if (summary) {
      return `Như vậy, đáp án chính xác của câu hỏi này là ${summary}.`;
    }
  }

  return null;
}

/**
 * Post-turn Khởi Động readout for items that have explicit data-grounded explanations.
 */
export function buildKhoiDongTurnExplanations(
  items: Array<{ q?: string; a: string; explanation?: string; hint?: string }>,
  maxItems: number = 2
): string | null {
  if (!items || items.length === 0) return null;
  const parts: string[] = [];
  for (const item of items) {
    if (parts.length >= maxItems) break;
    const exp = buildAnswerExplanation({
      answer: item.a,
      explanation: item.explanation,
      hint: item.hint,
      questionText: item.q,
      round: "khoiDong",
      allowSafeFallback: false,
    });
    if (exp) {
      const ansSummary = summarizeOlympiaAnswer(item.a);
      parts.push(
        ansSummary
          ? `Ở câu hỏi có đáp án ${ansSummary}: ${exp.replace(/[.!?]+$/, "")}.`
          : `${exp.replace(/[.!?]+$/, "")}.`
      );
    }
  }
  return parts.length > 0 ? parts.join(" ") : null;
}

export const VE_DICH_STEAL_PROMPT_VARIANTS = [
  "Xin mời các bạn còn lại!",
  "Cơ hội bấm chuông dành cho các bạn còn lại, xin mời!",
  "Xin mời các bạn còn lại giành quyền trả lời!",
  "Mời các bạn còn lại bấm chuông giành quyền trả lời!",
  "Thời gian suy nghĩ đã hết, xin mời các bạn còn lại!",
] as const;

let lastStealPrompt: string | null = null;

export function generateVeDichStealPrompt(rng: () => number = Math.random): string {
  const candidates =
    VE_DICH_STEAL_PROMPT_VARIANTS.length > 1 && lastStealPrompt && rng === Math.random
      ? VE_DICH_STEAL_PROMPT_VARIANTS.filter((v) => v !== lastStealPrompt)
      : [...VE_DICH_STEAL_PROMPT_VARIANTS];
  const idx = Math.floor(clamp(rng(), 0, 0.999999) * candidates.length);
  const picked = candidates[idx];
  lastStealPrompt = picked;
  return picked;
}

/**
 * Về Đích manual steal invitation trigger (Host button only — never auto-fired on timeout).
 */
export function speakHostStealCall(options?: SpeakTTSOptions): void {
  const text = generateVeDichStealPrompt();
  const role =
    normalizeDualRole(options?.role) ||
    (options?.turnIdx != null
      ? resolveTurnHosts("veDich", options.turnIdx).coHost
      : "khanh_vy");
  speakOlympiaTTS(text, {
    ...options,
    segment: "steal_callout",
    role,
    round: "veDich",
  });
}

/**
 * Schedules a dramatic 2.0s - 3.0s delay before calling the contestant who buzzed to steal in Về Đích.
 */
export function scheduleDramaticStealCall(
  stealerName: string,
  options?: {
    dramaticDelayMs?: number;
    isConsecutive?: boolean;
    role?: MCRole;
    turnIdx?: number;
    season?: string;
    onEnd?: () => void;
  }
): void {
  cancelDramaticStealCall();

  const delayMs = options?.dramaticDelayMs ?? VE_DICH_DRAMATIC_STEAL_DELAY_MS;
  const spokenKey = getContestantSpokenName(stealerName) || stealerName;
  const isConsecutive =
    options?.isConsecutive !== undefined
      ? options.isConsecutive
      : lastBuzzedContestant === spokenKey;
  lastBuzzedContestant = spokenKey;

  dramaticStealTimer = setTimeout(() => {
    dramaticStealTimer = null;
    const callout = generateBuzzerCallout(stealerName, isConsecutive);
    const resolvedRole =
      normalizeDualRole(options?.role) ||
      (options?.turnIdx != null
        ? resolveTurnHosts("veDich", options.turnIdx).coHost
        : "ngoc_huy");
    speakOlympiaTTS(callout, {
      role: resolvedRole,
      segment: "steal_callout",
      season: options?.season,
      round: "veDich",
      turnIdx: options?.turnIdx,
      onEnd: options?.onEnd,
    });
  }, delayMs);
}

// ============================================================================
// 8. VCNV/TT Grouping, Spelling Error Detection & TT Speed Callouts
// ============================================================================

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
 * Diacritic-preserving normalization for grouping answers in VCNV and Tăng Tốc:
 * - NFC + lowercase
 * - Normalizes punctuation & whitespace while preserving Vietnamese accents, decimals (9.8), and fractions (1/2)
 */
export function normalizeAnswerForGrouping(raw: string): string {
  if (!raw) return "";
  return raw
    .normalize("NFC")
    .toLowerCase()
    .replace(/[,;:!?'"“”‘’()_]/g, " ")
    .replace(/(?<!\d)\.(?!\d)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTargetAnswerCandidates(targetAnswer?: string): string[] {
  const raw = (targetAnswer || "").trim();
  if (!raw) return [];

  const candidates = new Set<string>();
  const cleanedRaw = raw.replace(/\(\s*\d+\s*(điểm|chữ cái|ký tự|giây)\s*\)/gi, "").trim();

  // Extract parenthetical alternate forms like "(hoặc CH4)" or "(Sài Gòn)"
  const parenRegex = /\(([^()]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = parenRegex.exec(cleanedRaw)) !== null) {
    const inner = m[1].replace(/^(?:hoặc|hay|or|tức|viết tắt:?)\s+/i, "").trim();
    if (inner && !/^\d+\s*(điểm|chữ cái|ký tự|giây)$/i.test(inner)) {
      candidates.add(inner);
    }
  }

  const baseWithoutParens = cleanedRaw.replace(/\([^()]*\)/g, "").trim();
  const splitSources = [baseWithoutParens, ...Array.from(candidates)];
  for (const src of splitSources) {
    if (!src) continue;
    for (const part of src.split(/\s*[;|]\s*|\s+\/\s+/)) {
      const trimmed = part.trim();
      if (trimmed) candidates.add(trimmed);
    }
  }
  if (baseWithoutParens) candidates.add(baseWithoutParens);
  return Array.from(candidates);
}

const VALID_ALPHA_DIGIT_PATTERN =
  /^(?:[A-Z][a-z]?\d+(?:[A-Z][a-z]?\d*)*|(?:O|VTV|G|K|N|Q|U)\d{1,3}|\d+[A-Za-z]|[A-Za-z]+\s+\d{1,4})$/;

/**
 * Detects whether a submitted answer is a typo/spelling error or meaningless gibberish:
 * - Preserves exemptions for numbers, number+units, 2-5 char ALL-CAPS acronyms, and distinct wrong real words
 * - Checks target alternates (e.g. "Methane (hoặc CH4)")
 * - Catches keyboard mashes, 3+ repeated identical letters (except Roman III), stray symbols,
 *   awkward digit-in-word typos ("Qu4ng"), awkward doubled endings ("nn", "hh"), diacritic omission, and Levenshtein distance
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

  const targetCandidates = extractTargetAnswerCandidates(targetAnswer);
  const subNormGroup = normalizeAnswerForGrouping(cleanSub);

  // 1. Exact case-insensitive / grouping-normalized match against any target candidate is valid
  for (const cand of targetCandidates) {
    if (
      cleanSub.toLowerCase() === cand.toLowerCase() ||
      (subNormGroup && subNormGroup === normalizeAnswerForGrouping(cand))
    ) {
      return { isError: false };
    }
  }

  // 2. Numeric, mathematical, or symbolic expressions are never spelling errors
  if (/^[\d\s.,/%+-]+$/.test(cleanSub)) {
    return { isError: false };
  }

  // 2b. Number + unit expressions (e.g. "120 km/h", "25 °C")
  if (
    /^[+-]?\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)?\s*(?:km\/h|m\/s|cm\/s|mm\/s|rad\/s|kg\/m3|g\/cm3|km|cm|mm|dm|nm|um|kg|mg|ml|dl|cl|kHz|MHz|GHz|Hz|mol|kcal|cal|kWh|Wh|kW|MW|mA|kV|mV|°\s*[CFK]|[mgschlNVAWJPK%])$/i.test(
      cleanSub
    )
  ) {
    return { isError: false };
  }

  // 3. Keyboard row mashes
  if (
    /(?:asdf|sdfg|dfgh|fghj|ghjk|hjkl|lkjh|qwer|wert|erty|rtyu|tyui|yuiop|uiop|poiu|zxcv|xcvb|cvbn|vbnm|mnbv|qwrty|rewq)/i.test(
      cleanSub
    )
  ) {
    return { isError: true, reason: "gibberish" };
  }

  // 3b. Short all-caps acronyms (2-5 chars, e.g. "GDP", "TNT", "BBC", "C4") are valid
  if (
    /^[A-Z0-9]{2,5}$/.test(cleanSub) &&
    (targetCandidates.length === 0 || targetCandidates.every((c) => /^[A-Z0-9\s-]+$/.test(c)))
  ) {
    return { isError: false };
  }

  // 3c. Stray non-math symbols embedded inside words or pure symbol strings
  if (
    /^[^\p{L}\p{N}]+$/u.test(cleanSub) ||
    /[a-zA-Z\u00C0-\u1EF9][@#$%^&*_+=~`<>\\|][a-zA-Z\u00C0-\u1EF9]/.test(cleanSub)
  ) {
    return { isError: true, reason: "gibberish" };
  }

  // 3d. Awkward digits mixed inside words (e.g. "Qu4ng", "H4 Nội"), excluding valid formulas/models
  const subWords = cleanSub.split(/\s+/).filter(Boolean);
  for (const w of subWords) {
    if (
      /[a-zA-Z\u00C0-\u1EF9]/.test(w) &&
      /\d/.test(w) &&
      !VALID_ALPHA_DIGIT_PATTERN.test(w) &&
      !/^\d+(?:st|nd|rd|th)$/i.test(w)
    ) {
      return { isError: true, reason: "gibberish" };
    }
  }

  // 3e. 3+ consecutive identical letters (excluding Roman numeral III)
  if (!/^(?:III|VIII|XIII|XVIII)$/i.test(cleanSub) && /([a-zA-Z\u00C0-\u1EF9])\1\1/i.test(cleanSub)) {
    return { isError: true, reason: "gibberish" };
  }

  // 4. Consonant mash / vowel-less gibberish / 5+ consecutive consonants
  const hasLetters = /[a-zA-Z\u00C0-\u1EF9]/i.test(cleanSub);
  const hasVowels =
    /[aeiouyáàảãạâấầẩẫậăắằẳẵặéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ]/i.test(
      cleanSub
    );
  const hasLongConsonantCluster = /[bcdfghjklmnpqrstvwxz]{5,}/i.test(cleanSub);
  if ((hasLetters && cleanSub.length >= 3 && !hasVowels) || hasLongConsonantCluster) {
    return { isError: true, reason: "gibberish" };
  }

  // 4b. Doubled consonant endings on Vietnamese words (e.g. "quann", "nguyenn", "hocc")
  const hasAwkwardDoubledEnding = subWords.some((w) =>
    /(?:bb|cc|dd|ff|gg|hh|jj|kk|mm|nn|pp|qq|rr|vv|ww|xx|zz)$/i.test(w)
  );
  if (hasAwkwardDoubledEnding && targetCandidates.length === 0) {
    return { isError: true, reason: "distance" };
  }

  if (targetCandidates.length === 0) return { isError: false };

  const normSub = removeVietnameseAccents(cleanSub);
  let bestDist = Infinity;
  let bestTargetLen = 0;

  for (const cand of targetCandidates) {
    const normCand = removeVietnameseAccents(cand);
    if (normSub === normCand && cleanSub.toLowerCase() !== cand.toLowerCase()) {
      return { isError: true, reason: "diacritic" };
    }
    const dist = computeLevenshteinDistance(normSub, normCand);
    if (dist < bestDist) {
      bestDist = dist;
      bestTargetLen = normCand.length;
    }
  }

  if (
    (bestDist > 0 && bestDist <= 2 && bestTargetLen >= 4) ||
    (bestDist === 1 && bestTargetLen === 3)
  ) {
    return { isError: true, reason: "distance" };
  }

  return { isError: false };
}

/**
 * Groups contestant answers for VCNV and Tăng Tốc commentary:
 * - Diacritic-aware normalization groups matching answers
 * - No-answer submissions are grouped
 * - Spelling errors are grouped together under "__SPELLING_ERROR__"
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
      const key = "__SPELLING_ERROR__";
      if (!groups.has(key)) {
        groups.set(key, {
          normalizedAnswer: "__spelling_error__",
          displayAnswer: raw,
          contestantNames: [cleanName],
          isSpellingError: true,
          isNoAnswer: false,
          minMs: item.ms,
        });
      } else {
        const g = groups.get(key)!;
        g.contestantNames.push(cleanName);
        if (item.ms != null && (g.minMs == null || item.ms < g.minMs)) {
          g.minMs = item.ms;
        }
      }
      continue;
    }

    const norm = normalizeAnswerForGrouping(raw) || raw.toLowerCase();
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
 * Generates spoken commentary for grouped answers in VCNV and Tăng Tốc.
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
 * - Fast reaction time (< 2.0s / 2000ms)
 * - Identical response times between >= 2 contestants
 * - >= 2 contestants sharing the fastest normalized answer
 */
export function generateTangTocTimeCallout(
  submissions: ContestantSubmissionItem[],
  _targetAnswer?: string
): string | null {
  if (!submissions || submissions.length === 0) return null;
  const validSubs = submissions
    .filter((s) => s.ms != null && s.ms > 0 && !s.noAnswer && s.answer?.trim())
    .sort((a, b) => (a.ms ?? Infinity) - (b.ms ?? Infinity));
  if (validSubs.length === 0) return null;

  const callouts: string[] = [];

  // 1. Fast answers (< 2.0s)
  const fastSubs = validSubs.filter((s) => s.ms! < 2000);
  for (const fs of fastSubs) {
    const cleanName = getContestantSpokenName(fs.name);
    const secStr = (fs.ms! / 1000).toFixed(2);
    callouts.push(`Bạn ${cleanName} trả lời rất nhanh, chỉ ${secStr} giây!`);
  }

  // 2. Identical response times (10ms bucket)
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

  const tiedBucketNames = new Set<string>();
  for (const [timeMs, names] of timeBuckets.entries()) {
    if (names.length >= 2) {
      names.forEach((n) => tiedBucketNames.add(n));
      const secStr = (timeMs / 1000).toFixed(2);
      if (names.length === 2) {
        callouts.push(
          `Hai bạn ${names[0]} và ${names[1]} có cùng thời gian trả lời là ${secStr} giây!`
        );
      } else {
        callouts.push(
          `Các bạn ${names.join(", ")} có cùng thời gian trả lời là ${secStr} giây!`
        );
      }
    }
  }

  // 3. >= 2 contestants sharing the fastest normalized answer (when not already covered by <2s or identical time)
  const fastestSub = validSubs[0];
  const fastestNorm = normalizeAnswerForGrouping(fastestSub.answer);
  if (fastestNorm) {
    const fastestAnsGroup = validSubs.filter(
      (s) => normalizeAnswerForGrouping(s.answer) === fastestNorm
    );
    const allAlreadyTiedTime = fastestAnsGroup.every((s) =>
      tiedBucketNames.has(getContestantSpokenName(s.name))
    );
    if (fastestAnsGroup.length >= 2 && fastestSub.ms! >= 2000 && !allAlreadyTiedTime) {
      const firstName = getContestantSpokenName(fastestAnsGroup[0].name);
      const firstSec = (fastestAnsGroup[0].ms! / 1000).toFixed(2);
      const secondName = getContestantSpokenName(fastestAnsGroup[1].name);
      const secondSec = (fastestAnsGroup[1].ms! / 1000).toFixed(2);
      const ansSummary = summarizeOlympiaAnswer(fastestSub.answer);
      callouts.push(
        `Trong nhóm có đáp án ${ansSummary}, bạn ${firstName} trả lời nhanh nhất với ${firstSec} giây, tiếp theo là bạn ${secondName} với ${secondSec} giây!`
      );
    }
  }

  if (callouts.length === 0) return null;
  return callouts.join(" ");
}

// ============================================================================
// 9. VCNV CNV Bells & Verdicts (Batch + Individual Random-Role)
// ============================================================================

export function generateCnvBellsAnnouncement(contestantNames: string[]): string {
  if (!contestantNames || contestantNames.length === 0) return "";
  const cleanNames = contestantNames.map(getContestantSpokenName);
  if (cleanNames.length === 1) {
    return `Tín hiệu chuông xin trả lời Chướng ngại vật từ bạn ${cleanNames[0]}.`;
  }
  return `Tín hiệu chuông xin trả lời Chướng ngại vật từ bạn ${cleanNames[0]}, tiếp theo là ${cleanNames
    .slice(1)
    .join(", ")}.`;
}

export function generateSingleCnvBellAnnouncement(
  contestantName: string,
  rng: () => number = Math.random
): string {
  const cleanName = getContestantSpokenName(contestantName);
  if (!cleanName) return "";
  const variants = [
    `Tín hiệu chuông xin trả lời Chướng ngại vật từ bạn ${cleanName}!`,
    `Bạn ${cleanName} đã bấm chuông xin trả lời Chướng ngại vật!`,
  ];
  return variants[Math.floor(clamp(rng(), 0, 0.999999) * variants.length)];
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

export function speakCnvBellIndividual(
  contestantName: string,
  options?: SpeakTTSOptions
): void {
  const text = generateSingleCnvBellAnnouncement(contestantName);
  if (!text) return;
  const role =
    options?.role && options.role !== "auto" ? options.role : pickRandomMCRole();
  speakOlympiaTTS(text, {
    ...options,
    segment: "cnv_bell",
    role,
  });
}

export async function speakCnvBellsQueue(
  contestantNames: string[],
  options?: SpeakTTSOptions
): Promise<boolean> {
  if (!contestantNames || contestantNames.length === 0) return false;
  for (const name of contestantNames) {
    const text = generateSingleCnvBellAnnouncement(name);
    if (!text) continue;
    const role =
      options?.role && options.role !== "auto" ? options.role : pickRandomMCRole();
    const ok = await speakOlympiaTTSAsync(text, {
      ...options,
      segment: "cnv_bell",
      role,
    });
    if (!ok) return false;
  }
  options?.onEnd?.();
  return true;
}

/**
 * Spoken line for CNV correct or incorrect (supports single or multiple eliminated contestants).
 */
export function formatCnvVerdictSpoken(
  isCorrect: boolean,
  contestantNameOrNames: string | string[],
  keyword?: string
): string {
  const names = Array.isArray(contestantNameOrNames)
    ? contestantNameOrNames.map(getContestantSpokenName).filter(Boolean)
    : [getContestantSpokenName(contestantNameOrNames)].filter(Boolean);

  if (isCorrect) {
    const cleanName = names[0] || "bạn";
    const kw = keyword ? summarizeOlympiaAnswer(keyword) : "";
    return `Chúc mừng bạn ${cleanName} đã trả lời chính xác Chướng ngại vật! ${
      kw ? `Từ khóa là: ${kw}!` : ""
    }`.trim();
  }

  if (names.length >= 2) {
    return `Rất tiếc các câu trả lời chưa chính xác. Các bạn ${names.join(
      ", "
    )} đều đã bỏ lỡ cơ hội và dừng lại tại đây. Các bạn còn lại tiếp tục phần thi Vượt chướng ngại vật.`;
  }
  const cleanName = names[0] || "bạn";
  return `Rất tiếc câu trả lời chưa chính xác. Bạn ${cleanName} mất quyền chơi phần thi Vượt chướng ngại vật. Các bạn còn lại tiếp tục phần thi.`;
}

export function speakVcnvCorrect(
  contestantName: string,
  keyword: string,
  onEnd?: () => void,
  options?: SpeakTTSOptions
): void {
  const text = formatCnvVerdictSpoken(true, contestantName, keyword);
  const role =
    options?.role && options.role !== "auto" ? options.role : pickRandomMCRole();
  speakOlympiaTTS(text, {
    ...options,
    segment: "cnv_congratulate",
    role,
    onEnd,
  });
}

export function speakVcnvElimination(
  contestantNameOrNames: string | string[],
  onEnd?: () => void,
  options?: SpeakTTSOptions
): void {
  const text = formatCnvVerdictSpoken(false, contestantNameOrNames);
  const role =
    options?.role && options.role !== "auto" ? options.role : pickRandomMCRole();
  speakOlympiaTTS(text, {
    ...options,
    segment: "cnv_elimination",
    role,
    onEnd,
  });
}

/**
 * Audible preview demonstrating alternating voice acting of both MCs (Khánh Vy & Ngọc Huy).
 */
export function playTestMCVoices(onEnd?: () => void): void {
  unlockOlympiaTTS();
  cancelTTS();
  const line1 = "Khánh Vy xin chào các bạn!";
  const line2 = "Ngọc Huy xin chào các bạn và chúc các bạn thi đấu thật tốt!";

  speakOlympiaTTS(line1, {
    role: "khanh_vy",
    segment: "intro_greeting",
    onEnd: () => {
      activePauseTimer = setTimeout(() => {
        activePauseTimer = null;
        speakOlympiaTTS(line2, {
          role: "ngoc_huy",
          segment: "round_intro",
          onEnd,
        });
      }, 300);
    },
  });
}
