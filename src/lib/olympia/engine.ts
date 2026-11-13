// Olympia game engine — pure state machine (no sockets, no I/O). Fully unit-testable.
import { SAMPLE_QUESTION_SET } from "./sample-questions";
import { RULESETS, cnvPointsFor, defaultChpQuestionLimitForRuleset, tangTocTierPoints, turnsO22 } from "./rulesets";
import { buildBalancedKhoiDongQueues, pickBalancedVeDichPackage, tagQAWithAI, normKey } from "./ai-classifier";
import { getEntranceStepThresholdMs } from "./entrance-geometry";
import {
  KHOI_DONG_SUBJECTS,
  MAX_SEATS,
  ROUND_ORDER,
  ROUND_LABELS,
  canStartScoreSummary,
  seatToStudioCamera,
  type CauHoiPhuState,
  type ChpQuestionLimit,
  type ContestantGestureType,
  type HostAction,
  type KdSegmentDef,
  type KhoiDongState,
  type O22Quarter,
  type OlympiaConfig,
  type OlympiaQuestionSet,
  type OlympiaRuleset,
  type OlympiaState,
  type OlympiaTranscriptEntry,
  type QA,
  type RoundId,
  type Seat,
  type TangTocState,
  type TimerState,
  type TranscriptBuzzerItem,
  type TranscriptSubmissionItem,
  type VcnvState,
  type VeDichQuestion,
  type VeDichState,
} from "./types";

// ── timers ──
export const mkTimer = (ms: number): TimerState => ({ totalMs: ms, remainingMs: ms, startedAt: null });
export const timerRemaining = (t: TimerState, now: number): number =>
  t.startedAt == null ? t.remainingMs : Math.max(0, t.remainingMs - (now - t.startedAt));
const timerRunning = (t: TimerState) => t.startedAt != null;
const startTimer = (t: TimerState, now: number) => {
  if (t.startedAt == null && t.remainingMs > 0) t.startedAt = now;
};
const pauseTimer = (t: TimerState, now: number) => {
  if (t.startedAt != null) {
    t.remainingMs = timerRemaining(t, now);
    t.startedAt = null;
  }
};
const resetTimer = (t: TimerState, ms?: number) => {
  if (ms != null) t.totalMs = ms;
  t.remainingMs = t.totalMs;
  t.startedAt = null;
};

export function normalizeAnswer(s: string): string {
  return (s || "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[.,;:!?'"“”‘’()\-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parses raw VCNV answer text, separating the primary keyword from candidate synonyms
 * (e.g. "NẠP XẢ (Chấp nhận SẠC XẢ hoặc TÍCH XẢ)").
 * Enforces the two VCNV rules:
 * 1. Must be an absolute synonym / replacement keyword.
 * 2. Character length (excluding spaces) must EXACTLY equal the primary keyword length.
 */
/**
 * Cleans a VCNV row or keyword answer per user rule:
 * 1. Strips any parenthetical note e.g. (...) or [...] or {...}
 * 2. Removes all whitespace (\s)
 * 3. Strips forbidden bracket characters: '(', ')', '[', ']', '{', '}'
 * 4. Preserves ALL other characters (letters, digits, punctuation/special characters).
 */
/**
 * Strips trailing letter count annotations like "(9 chữ cái)", "(4 chữ cái)?", "(7 chữ cái)."
 * from VCNV question strings while cleanly preserving terminal punctuation (?, .).
 */
export function stripVcnvLetterCount(text: string): string {
  if (!text) return "";
  return text
    .replace(
      /\s*[([]\s*(?:gồm\s*)?\d+\s*(?:chữ\s*cái|kí\s*tự|ký\s*tự|chữ\s*số|chữ|ô\s*chữ|tiếng|chu\s*cai|ky\s*tu)\s*[)\]](\s*[.?:!]?)\s*$/i,
      "$1"
    )
    .trim();
}

export function cleanVcnvWord(raw: string): string {
  if (!raw) return "";
  const idx = raw.search(/[\(\[\{]/);
  const primary = idx !== -1 ? raw.slice(0, idx).trim() : raw.trim();
  return primary.replace(/[\s\(\)\[\]\{\}]/g, "");
}

export function parseVcnvAnswer(raw: string): { primary: string; acceptedAnswers: string[] } {
  if (!raw) return { primary: "", acceptedAnswers: [] };
  const trimmed = raw.trim();
  const parenMatch = trimmed.match(/^([^()]+)\s*\(([^()]+)\)\s*$/);
  let primary = trimmed;
  const candidates: string[] = [];

  if (parenMatch) {
    primary = parenMatch[1].trim();
    let note = parenMatch[2].trim();
    note = note.replace(/^(chấp nhận cả|chấp nhận|hoặc|đáp án khác|đồng nghĩa)[:\s]*/i, "");
    const parts = note.split(/\s*(?:hoặc|hay|,|;|\/)\s*/i);
    for (const p of parts) {
      const c = p.trim();
      if (c && c.toLowerCase() !== primary.toLowerCase()) {
        candidates.push(c);
      }
    }
  } else if (trimmed.includes("/")) {
    const parts = trimmed.split(/\s*\/\s*/);
    primary = parts[0].trim();
    for (let i = 1; i < parts.length; i++) {
      const c = parts[i].trim();
      if (c) candidates.push(c);
    }
  }

  const primaryCharLen = cleanVcnvWord(primary).length;
  const validAlternates = candidates.filter((cand) => {
    const candLen = cleanVcnvWord(cand).length;
    return candLen === primaryCharLen;
  });

  return { primary, acceptedAnswers: validAlternates };
}

/**
 * Returns a set of normalized valid answers for a VCNV row or center question,
 * guaranteeing all accepted answers have the EXACT same non-space character length as primary.
 */
export function getVcnvValidAnswerSet(
  rawOrPrimary: string,
  extraAccepted?: string[]
): { primary: string; validNorms: Set<string>; charLength: number } {
  const parsed = parseVcnvAnswer(rawOrPrimary);
  const primary = parsed.primary || rawOrPrimary;
  const charLength = cleanVcnvWord(primary).length;

  const combined = [
    primary,
    ...(extraAccepted ?? []),
    ...parsed.acceptedAnswers,
  ];

  const validNorms = new Set<string>();
  for (const ans of combined) {
    if (!ans) continue;
    // Strict Condition 2: Exact character length equality
    if (cleanVcnvWord(ans).length === charLength) {
      const norm = normalizeAnswer(ans);
      if (norm) validNorms.add(norm);
    }
  }

  return { primary, validNorms, charLength };
}


export type ActionResult = { ok: true } | { ok: false; error: string };
const OK: ActionResult = { ok: true };
const fail = (error: string): ActionResult => ({ ok: false, error });

const emptyRoundStatus = (): Record<RoundId, "pending" | "active" | "done"> => ({
  khoiDong: "pending",
  vcnv: "pending",
  tangToc: "pending",
  veDich: "pending",
  cauHoiPhu: "pending",
});

export function sortRounds(rounds: RoundId[]): RoundId[] {
  const set = new Set(rounds);
  return ROUND_ORDER.filter((r) => r !== "cauHoiPhu" && set.has(r));
}

export class OlympiaGame {
  state: OlympiaState;
  readonly config: OlympiaConfig;
  readonly ruleset: OlympiaRuleset;

  constructor(code: string, config: OlympiaConfig, now = Date.now()) {
    this.config = config;
    if (!this.config.questionSet) {
      this.config.questionSet = SAMPLE_QUESTION_SET;
    }
    this.ruleset = RULESETS[config.rulesetId] ?? RULESETS.O26;
    const rounds = sortRounds(config.rounds);
    const seatCount = config.seatCount
      ? Math.max(2, Math.min(MAX_SEATS, config.seatCount))
      : (config.teams && config.teams.length > 0)
      ? Math.max(2, Math.min(MAX_SEATS, config.teams.length))
      : MAX_SEATS;
    const initialChpLimit: ChpQuestionLimit =
      config.chpQuestionLimit === "unlimited" || config.chpQuestionLimit === 3
        ? config.chpQuestionLimit
        : defaultChpQuestionLimitForRuleset(this.ruleset.id);
    this.state = {
      code,
      rulesetId: this.ruleset.id,
      o22Quarter: config.o22Quarter ?? 1,
      chpQuestionLimit: initialChpLimit,
      rounds,
      stage: "lobby",
      seatCount,
      seats: Array.from({ length: seatCount }, (_, i) => {
        const team = config.teams?.[i];
        if (team) {
          return {
            id: i,
            name: team.name || `Thí sinh ${i + 1}`,
            playerKey: `sandbox_${code}_seat_${i}`,
            connected: true,
            score: 0,
          };
        }
        return {
          id: i,
          name: "",
          playerKey: null,
          connected: false,
          score: 0,
        };
      }),
      roundIdx: -1,
      roundsPlan: [...rounds, "cauHoiPhu"],
      currentRound: null,
      roundStatus: emptyRoundStatus(),
      banner: null,
      showStageGraphics: false,
      khoiDong: null,
      vcnv: null,
      tangToc: null,
      veDich: null,
      cauHoiPhu: null,
      entranceCompleted: false,
      cue: config.playIntroOnCreate !== false ? { id: 1, sound: "6_NhacKhac/show_intro", kind: "sound" } : null,
      cueSeq: config.playIntroOnCreate !== false ? 1 : 0,
      version: 0,
      now,
      log: [],
      openedQuestionKeys: [],
      transcript: [],
    };
  }

  // ── helpers ──
  private seatName(id: number): string {
    return this.seat(id)?.name || `Ghế ${id + 1}`;
  }

  private pushTranscript(entry: Omit<OlympiaTranscriptEntry, "seq" | "scoresAfter">) {
    if (!this.state.transcript) this.state.transcript = [];
    const scoresAfter: Record<number, number> = {};
    for (const id of this.activeSeatIds) {
      scoresAfter[id] = this.seat(id)?.score ?? 0;
    }
    this.state.transcript.push({
      ...entry,
      seq: this.state.transcript.length + 1,
      scoresAfter,
    });
  }

  private recordOpenedQuestion(qText?: string) {
    if (!qText) return;
    const clean = qText.trim();
    if (!clean) return;
    if (!this.state.openedQuestionKeys) this.state.openedQuestionKeys = [];
    if (!this.state.openedQuestionKeys.includes(clean)) {
      this.state.openedQuestionKeys.push(clean);
    }
  }
  /** Chuẩn hoá nội dung câu hỏi/đáp án để so sánh trùng lặp (bỏ dấu câu, khoảng trắng, chữ hoa). */
  private normQ(s?: string): string {
    return (s ?? "").toLowerCase().replace(/[\s.,?!'"():;—–-]+/g, "").trim();
  }

  /**
   * Tập hợp câu hỏi / đáp án ĐÃ MỞ trong trận (mọi vòng) + các câu đã được chiếm chỗ ở vòng khác.
   * - openedQ / openedA: đã hiển thị cho khán giả → tuyệt đối không được lặp lại.
   * - reservedQ: đã được xếp sẵn cho vòng khác (VCNV, Tăng Tốc, gói Về Đích đã bốc) → chỉ dùng khi hết lựa chọn.
   */
  private duplicateGuard(): { openedQ: Set<string>; openedA: Set<string>; reservedQ: Set<string> } {
    const qs = this.config.questionSet;
    const openedQ = new Set<string>((this.state.openedQuestionKeys ?? []).map((k) => this.normQ(k)));
    const openedA = new Set<string>();
    const reservedQ = new Set<string>();

    const scan = (text?: string, ans?: string) => {
      if (!text) return;
      if (openedQ.has(this.normQ(text))) {
        const a = this.normQ(ans);
        if (a) openedA.add(a);
      }
    };
    for (const item of qs.khoiDong.shared ?? []) scan(item.q, item.a);
    for (const list of Object.values(qs.khoiDong.solo ?? {})) for (const item of list) scan(item.q, item.a);
    for (const list of Object.values(qs.veDich ?? {})) for (const item of list) scan(item.q, item.a);
    for (const item of qs.cauHoiPhu ?? []) scan(item.q, item.a);
    for (const t of qs.tangToc ?? []) scan(t.q, (t as any).answer || (t as any).a);

    for (const t of qs.tangToc ?? []) if (t.q) reservedQ.add(this.normQ(t.q));
    for (const row of qs.vcnv?.rows ?? []) if (row.hint) reservedQ.add(this.normQ(row.hint));
    if (qs.vcnv?.centerQuestion?.q) reservedQ.add(this.normQ(qs.vcnv.centerQuestion.q));
    const vd = this.state.veDich;
    if (vd) {
      for (const k of vd.usedKeys ?? []) if (!k.startsWith("ans:")) reservedQ.add(this.normQ(k));
      for (const pkg of Object.values(vd.packages ?? {})) {
        for (const p of pkg ?? []) if (p?.q?.q) reservedQ.add(this.normQ(p.q.q));
      }
    }
    return { openedQ, openedA, reservedQ };
  }

  private cue(
    sound: string,
    kind: "sound" | "bgm" | "stop" | "pause_bgm" | "resume_bgm" = "sound",
    pan?: "both" | "left" | "right",
    bgmSound?: string
  ) {
    this.state.cueSeq += 1;
    this.state.cue = { id: this.state.cueSeq, sound, kind, pan, bgmSound };
  }
  private logMsg(msg: string) {
    this.state.log.push(msg);
    if (this.state.log.length > 80) this.state.log.shift();
  }
  get activeSeatIds(): number[] {
    return this.state.seats.filter((s) => s.name && s.approved !== false).map((s) => s.id);
  }
  private seat(id: number): Seat | undefined {
    return this.state.seats[id];
  }
  private addScore(id: number, delta: number) {
    const s = this.seat(id);
    if (!s) return;
    s.score = Math.max(0, s.score + delta);
    this.logMsg(`${s.name || "Ghế " + (id + 1)} ${delta >= 0 ? "+" : ""}${delta}`);
  }

  // ── lobby ──
  /** Player requests to reserve a specific seat. Returns seatId or -1 */
  requestSeat(
    name: string,
    seatId: number,
    playerKey: string,
    school?: string
  ): { ok: boolean; status?: "approved" | "pending"; seatId: number; error?: string } {
    if (seatId < 0 || seatId >= this.state.seats.length) {
      return { ok: false, error: "Vị trí ghế không hợp lệ", seatId: -1 };
    }

    const cleanName = (name || "").trim();
    const target = this.state.seats[seatId];
    const sbPrefix = `sandbox_${this.state.code}_seat_`;

    // 1. Reconnection Safeguard: Sandbox seats or reconnection of already approved player
    const isSamePlayer = Boolean(playerKey && target.playerKey === playerKey);
    const isSandbox = Boolean(playerKey && playerKey.startsWith(sbPrefix));
    const isApprovedMatching = Boolean(
      target.approved &&
      (isSamePlayer || (cleanName && target.name.trim().toLowerCase() === cleanName.toLowerCase()))
    );

    if (isSandbox || isSamePlayer || isApprovedMatching) {
      if (cleanName) target.name = cleanName;
      if (school) target.school = school.trim();
      target.playerKey = playerKey;
      target.approved = true;
      target.connected = true;
      this.touch(Date.now());
      return { ok: true, status: "approved", seatId };
    }

    // 2. Reject new registrations if stage is not lobby
    if (this.state.stage !== "lobby") {
      return { ok: false, error: "Trận đấu đã bắt đầu, không thể đăng ký", seatId: -1 };
    }

    if (!cleanName) {
      return { ok: false, error: "Vui lòng nhập họ và tên thí sinh", seatId: -1 };
    }

    // If the seat is already occupied by another approved player
    if (target.approved && target.playerKey && target.playerKey !== playerKey) {
      return { ok: false, error: `Vị trí ${seatId + 1} đã có thí sinh được phê duyệt`, seatId: -1 };
    }

    // Normal player flow: create or update join request
    if (!this.state.joinRequests) this.state.joinRequests = [];
    this.state.joinRequests = this.state.joinRequests.filter((r) => r.id !== playerKey);
    this.state.joinRequests.push({
      id: playerKey,
      name: cleanName,
      school: school?.trim(),
      seatId,
      requestedAt: Date.now(),
    });

    // Mark seat temporarily as pending for this player
    target.name = cleanName;
    if (school) target.school = school.trim();
    target.playerKey = playerKey;
    target.approved = false;
    target.connected = true;

    this.touch(Date.now());
    return { ok: true, status: "pending", seatId };
  }

  /** Reserve a seat for a player (supports backward compatibility and sandbox auto-join). */
  joinSeat(name: string, playerKey: string): number {
    const existing = this.state.seats.find((s) => s.playerKey === playerKey);
    if (existing) {
      existing.connected = true;
      if (name) existing.name = name;
      return existing.id;
    }
    const sbPrefix = `sandbox_${this.state.code}_seat_`;
    if (playerKey.startsWith(sbPrefix)) {
      const idx = Number(playerKey.slice(sbPrefix.length));
      if (idx >= 0 && idx < this.state.seats.length) {
        const target = this.state.seats[idx];
        target.playerKey = playerKey;
        if (name) target.name = name;
        target.connected = true;
        target.approved = true;
        return target.id;
      }
    }
    const normName = (name || "").trim().toLowerCase();
    if (normName) {
      const byAssignedName = this.state.seats.find(
        (s) => !s.playerKey && s.name.trim().toLowerCase() === normName
      );
      if (byAssignedName) {
        byAssignedName.playerKey = playerKey;
        byAssignedName.connected = true;
        byAssignedName.approved = true;
        return byAssignedName.id;
      }
    }
    if (this.state.stage !== "lobby") return -1;
    const free =
      this.state.seats.find((s) => !s.name) ??
      this.state.seats.find((s) => !s.playerKey);
    if (!free) return -1;
    free.name = name;
    free.playerKey = playerKey;
    free.connected = true;
    // For default join without host approval explicitly disabled, auto-approve if room allows
    free.approved = true;
    return free.id;
  }
  setConnected(seatId: number, connected: boolean) {
    const s = this.seat(seatId);
    if (s) s.connected = connected;
  }
  kickSeat(id: number) {
    const s = this.seat(id);
    if (!s) return;
    const oldKey = s.playerKey;
    s.name = "";
    s.school = undefined;
    s.playerKey = null;
    s.connected = false;
    s.approved = false;
    if (this.state.stage === "lobby") s.score = 0;
    if (this.state.joinRequests) {
      this.state.joinRequests = this.state.joinRequests.filter(
        (r) => r.seatId !== id && (!oldKey || r.id !== oldKey)
      );
    }
    this.touch(Date.now());
  }

  // ── tick (auto-expire timers) ──
  /** Returns true if state changed. */
  tick(now: number): boolean {
    const st = this.state;
    if (st.introTimer && !!st.introTimer && timerRunning(st.introTimer) && timerRemaining(st.introTimer, now) <= 0) {
      st.introTimer.remainingMs = 0;
      st.introTimer.startedAt = null;
      this.touch(now);
      return true;
    }

    // Auto-advance contestant entrance synchronized with collision-free rear-corridor walk per seat
    if (st.entranceState && st.entranceState.active) {
      const elapsedForSeat = now - st.entranceState.seatStartedAt;
      const activeCount = Math.max(1, st.seats.length);
      const isLast = st.entranceState.currentSeatIdx >= activeCount - 1;
      const advanceThreshold = getEntranceStepThresholdMs(st.entranceState.currentSeatIdx, activeCount);
      if (elapsedForSeat >= advanceThreshold) {
        if (!isLast) {
          const nextIdx = st.entranceState.currentSeatIdx + 1;
          st.entranceState.currentSeatIdx = nextIdx;
          st.entranceState.seatStartedAt = now;
          if (!st.entranceState.seatStartTimes) {
            st.entranceState.seatStartTimes = [st.entranceState.startedAt];
          }
          st.entranceState.seatStartTimes[nextIdx] = now;
          this.touch(now);
          return true;
        } else {
          st.entranceState = null;
          st.entranceCompleted = true;
          st.introStandby = true;
          st.studioCamera = 3;
          st.studioCameraManual = false;
          this.cue("", "stop");
          this.touch(now);
          return true;
        }
      }
    }

    // Auto-advance summary sequence (3.5s per contestant)
    if (st.summaryState && st.summaryState.active && st.summaryState.isAuto) {
      const elapsed = now - (st.summaryState.lastAdvanceAt ?? now);
      if (elapsed >= 3500) {
        const nextIdx = st.summaryState.currentIndex + 1;
        if (nextIdx < st.summaryState.orderedSeats.length) {
          st.summaryState.currentIndex = nextIdx;
          st.summaryState.lastAdvanceAt = now;
          const nextSeat = st.summaryState.orderedSeats[nextIdx];
          st.studioCamera = st.summaryState.isFullscreen ? 10 : seatToStudioCamera(nextSeat);
          this.touch(now);
          return true;
        } else {
          st.summaryState.active = false;
          st.studioCameraManual = false;
          st.studioCamera = 10;
          // USER REQUIREMENT: Không ngắt bài nhạc tổng kết 6_NhacKhac/summary sớm, để nhạc phát trọn vẹn cho tới khi Host can thiệp hoặc chuyển vòng
          this.touch(now);
          return true;
        }
      }
    }

    let changed = false;
    const expired = (t: TimerState | null | undefined) =>
      !!t && timerRunning(t) && timerRemaining(t, now) <= 0;
    const fin = (t: TimerState) => {
      t.remainingMs = 0;
      t.startedAt = null;
      changed = true;
    };

    if (st.kdIntroTimer && expired(st.kdIntroTimer)) {
      st.kdIntroTimer = null;
      changed = true;
      if (st.khoiDong) {
        // Hết 3.5s của âm ready: phát âm thanh open_question ĐỒNG THỜI đồ hoạ hạ 1/3 bung mở.
        // Vẫn ở Câu 0/6 (qIdx = -1), ruột câu hỏi trống (questionRevealed = false, current = null).
        this.cue("1_KhoiDong/open_question");
      }
    }

    if (st.vdPackageTimer && expired(st.vdPackageTimer)) {
      st.vdPackageTimer = null;
      changed = true;
    }

    if (st.khoiDong) {
      const kd = st.khoiDong;
      if (kd.buzzUnlockAt && now >= kd.buzzUnlockAt) {
        if (!kd.buzzOpen && kd.phase === "question" && kd.buzzedSeat == null) {
          kd.buzzOpen = true;
          changed = true;
        }
        kd.buzzUnlockAt = undefined;
        changed = true;
      }
      if (kd.globalTimer && expired(kd.globalTimer)) {
        fin(kd.globalTimer);
        kd.buzzOpen = false;
        kd.currentBgmTrack = undefined;
        // Giữ nguyên câu hỏi hiện tại và trạng thái gần nhất; KHÔNG phát stop cue làm ngắt tiếng gong/chuông hết giờ.
        // Âm thanh đếm giờ 60s/30s/90s sẽ tự phát trọn vẹn đến tiếng chuông kết thúc tự nhiên.
      }
      if (expired(kd.timer)) {
        fin(kd.timer);
        kd.buzzOpen = false;
      }
    }
    if (st.vcnv && expired(st.vcnv.timer)) fin(st.vcnv.timer);
    if (st.tangToc && expired(st.tangToc.timer)) fin(st.tangToc.timer);
    if (st.veDich) {
      const vd = st.veDich;
      if (expired(vd.timer)) fin(vd.timer);
      if (vd.steal && expired(vd.steal.timer)) {
        fin(vd.steal.timer);
        vd.steal.open = false;
        if (!vd.steal.buzzedSeat) {
          vd.phase = "result";
          vd.lastVerdict = "noSteal";
        }
      }
    }
    if (st.cauHoiPhu && expired(st.cauHoiPhu.timer)) {
      fin(st.cauHoiPhu.timer);
      st.cauHoiPhu.buzzOpen = false;
    }
    if (changed) this.touch(now);
    return changed;
  }

  touch(now: number) {
    this.state.version += 1;
    this.state.now = now;
  }

  // ── game flow ──
  private topTie(): number[] {
    const seats = this.activeSeatIds.map((i) => this.state.seats[i]);
    if (seats.length < 2) return [];
    const max = Math.max(...seats.map((s) => s.score));
    const top = seats.filter((s) => s.score === max).map((s) => s.id);
    return top.length >= 2 ? top : [];
  }

  private beginRound(round: RoundId, now: number, forced = false): ActionResult {
    const st = this.state;
    const qs = this.config.questionSet;
    const active = this.activeSeatIds;
    if (active.length === 0) return fail("Chưa có thí sinh nào trong phòng");
    // Clear intro/summary animations and release any manual camera override when any round begins
    st.introTimer = null;
    st.introStandby = false;
    if (st.summaryState) st.summaryState.active = false;
    st.showStageGraphics = false;
    st.studioCameraManual = false;
    st.studioCamera = undefined;
    st.currentRound = round;
    st.roundStatus[round] = "active";
    st.banner = ROUND_LABELS[round];
    this.cue(
      round === "khoiDong"
        ? "1_KhoiDong/start_round"
        : round === "vcnv"
          ? "2_VuotChuongNgaiVat/start_round"
          : round === "tangToc"
            ? "3_TangToc/start_round"
            : round === "veDich"
              ? "4_VeDich/start_round"
              : "5_CauHoiPhu/open_question"
    );

    switch (round) {
      case "khoiDong": {
        let rawSegs = this.ruleset.khoiDong.segments(active.length);
        if (this.ruleset.id === "O22") {
          rawSegs = turnsO22(st.o22Quarter ?? 1);
        }
        const segs: KdSegmentDef[] = rawSegs.map((seg) =>
          seg.kind === "solo" ? { ...seg, seat: active[seg.seat as number], label: seg.label } : seg
        );
        const useBalanced = this.config.balancedRandom !== false && qs.balancedRandom !== false;
        const maxSoloQuestions = Math.max(12, ...segs.filter((s) => s.kind === "solo").map((s) => Math.min(s.questions, 24)));
        const balanced = useBalanced
          ? buildBalancedKhoiDongQueues(qs.khoiDong, active, maxSoloQuestions)
          : undefined;
        const dummyKd: KhoiDongState = {
          segments: segs,
          segIdx: 0,
          qIdx: -1,
          phase: "intro",
          timer: mkTimer(segs[0].perQuestionMs),
          globalTimer: segs[0].globalMs ? mkTimer(segs[0].globalMs) : null,
          buzzedSeat: null,
          buzzOpen: false,
          lockedSeats: [],
          nextLockedSeats: [],
          poolCursor: 0,
          seatQueues: balanced?.seatQueues,
          sharedQueue: balanced?.sharedQueue,
          current: null,
          lastVerdict: null,
          showSubject: false,
        };
        const preQ = segs[0] && !segs[0].globalMs ? this.kdPoolQuestion(dummyKd, segs[0]) : null;
        st.khoiDong = {
          ...dummyKd,
          current: preQ
            ? {
                q: preQ.q,
                a: preQ.a,
                subject: preQ.subject,
                kdZone: preQ.kdZone,
                vdZone: preQ.vdZone,
                media: preQ.media,
                mediaType: preQ.mediaType,
              }
            : null,
        };
        break;
      }
      case "vcnv": {
        const v = qs.vcnv;
        const rows = Array.from({ length: 4 }, (_, i) => {
          const ans = v.rows[i]?.answer ?? "";
          return {
            hint: v.rows[i]?.hint ?? "",
            answer: ans,
            letterCount: v.rows[i]?.letterCount || cleanVcnvWord(ans).length,
            media: v.rows[i]?.media,
            mediaType: v.rows[i]?.mediaType,
            opened: false,
            wrong: false,
          };
        });
        st.vcnv = {
          rows,
          keyword: v.answer,
          keywordLength: cleanVcnvWord(v.answer || "").length,
          mysteryImage: v.mysteryImage,
          centerQuestion: v.centerQuestion,
          centerOpened: false,
          centerWrong: false,
          currentRow: -1,
          phase: "grid",
          timer: mkTimer(this.ruleset.vcnv.rowTimerMs),
          answers: {},
          answersRevealed: false,
          bells: [],
          eliminatedSeats: [],
          openedCount: 0,
          piecesRevealed: [false, false, false, false, false],
          solvedBy: null,
          rowResults: {},
        };
        break;
      }
      case "tangToc": {
        st.tangToc = {
          qIdx: -1,
          phase: "idle",
          timer: mkTimer(this.ruleset.tangToc.timers[0]),
          submissions: {},
          ranking: [],
          questions: qs.tangToc.slice(0, 4),
          backupQuestions:
            qs.tangTocBackup && qs.tangTocBackup.length > 0
              ? qs.tangTocBackup
              : qs.tangToc.slice(4, 8),
        };
        break;
      }
      case "veDich": {
        const initialOrder = [...active];
        if (this.ruleset.veDich.turnOrderMode === "highest_unplayed" && initialOrder.length > 1) {
          initialOrder.sort((a, b) => (this.seat(b)?.score ?? 0) - (this.seat(a)?.score ?? 0) || a - b);
        }
        st.veDich = {
          order: initialOrder,
          turnIdx: 0,
          playedSeats: [],
          phase: "idle",
          onStage: false,
          packages: {},
          qIdx: -1,
          current: null,
          timer: mkTimer(15000),
          steal: null,
          hopeStarUsed: [],
          hopeStarActive: false,
          deductedOnSteal: false,
          pointers: {},
          usedKeys: [],
          lastVerdict: null,
        };
        break;
      }
      case "cauHoiPhu": {
        const tie = this.topTie();
        const tied = tie.length >= 2 ? tie : forced ? [...active] : [];
        if (tied.length < 2 && !forced) return fail("Không có thí sinh đồng hạng");
        const chpGuard = this.duplicateGuard();
        const chpSeen = new Set<string>();
        const chpAll = (qs.cauHoiPhu ?? []).filter((q) => {
          if (!q?.q) return false;
          const k = this.normQ(q.q);
          if (chpSeen.has(k)) return false; // trùng nội bộ ngân hàng CHP
          chpSeen.add(k);
          return true;
        });
        // Mức ưu tiên: (1) chưa mở & đáp án chưa lặp & chưa bị vòng khác chiếm → (2) chưa mở & chưa bị chiếm
        // → (3) chưa mở → (4) buộc dùng lại (chỉ khi ngân hàng cạn)
        const tierOf = (q: QA): number => {
          const k = this.normQ(q.q);
          const opened = chpGuard.openedQ.has(k);
          if (opened) return 4;
          const ansDup = Boolean(q.a && chpGuard.openedA.has(this.normQ(q.a)));
          const reserved = chpGuard.reservedQ.has(k);
          if (!ansDup && !reserved) return 1;
          if (!reserved) return 2;
          return 3;
        };
        const chpQuestions = [...chpAll]
          .sort((x, y) => tierOf(x) - tierOf(y) || Number(Boolean(x.used)) - Number(Boolean(y.used)))
          .map((q) => tagQAWithAI(q, false));
        st.cauHoiPhu = {
          tied,
          qIdx: -1,
          phase: "idle",
          timer: mkTimer(this.ruleset.cauHoiPhu.timerMs),
          buzzOpen: false,
          buzzedSeat: null,
          buzzedThisQuestion: [],
          winner: null,
          questions: chpQuestions,
        };
        break;
      }
    }
    this.touch(now);
    return OK;
  }

  private finishRound(now: number) {
    const st = this.state;
    if (st.currentRound) st.roundStatus[st.currentRound] = "done";
    st.banner = null;
    st.studioCameraManual = false;
    st.studioCamera = undefined;
    if (st.khoiDong) {
      st.khoiDong.started = false;
      st.khoiDong.questionRevealed = false;
      st.khoiDong.current = null;
      st.khoiDong.phase = "segmentDone";
      st.khoiDong.buzzedSeat = null;
      st.khoiDong.buzzOpen = false;
      st.khoiDong.buzzUnlockAt = undefined;
    }
    if (st.vcnv) {
      st.vcnv.bells = [];
    }
    if (st.veDich) {
      st.veDich.steal = null;
    }
    if (st.cauHoiPhu) {
      st.cauHoiPhu.buzzedSeat = null;
      st.cauHoiPhu.buzzOpen = false;
    }
    // Không ghi đè stop cue lên âm thanh kết thúc lượt / finish_turn vừa được phát
    if (!st.cue?.sound?.includes("finish_turn")) {
      this.cue("", "stop");
    }
    this.touch(now);
  }

  /** Advance to the next planned round (CHP is only played on a tie). */
  private nextRound(now: number): ActionResult {
    const st = this.state;
    if (st.currentRound && st.roundStatus[st.currentRound] === "active") this.finishRound(now);
    let idx = st.roundIdx + 1;
    while (idx < st.roundsPlan.length) {
      const r = st.roundsPlan[idx];
      if (r === "cauHoiPhu") {
        if (this.topTie().length >= 2 && st.roundStatus.cauHoiPhu === "pending") {
          st.roundIdx = idx;
          return this.beginRound(r, now);
        }
        break;
      }
      st.roundIdx = idx;
      return this.beginRound(r, now);
    }
    st.stage = "finished";
    st.currentRound = null;
    st.banner = null;
    this.cue("6_NhacKhac/ending_music");
    this.touch(now);
    return OK;
  }

  // ── host actions ──
  hostAction(action: HostAction, now: number): ActionResult {
    const st = this.state;
    const type = String(action.type || "");
    const result = this.dispatch(type, action, now);
    if (result.ok) {
      this.touch(now);
      void st;
    }
    return result;
  }

  private dispatch(type: string, a: HostAction, now: number): ActionResult {
    const st = this.state;
    const num = (k: string) => Number(a[k]);

    // generic
    switch (type) {
      case "game:start": {
        if (st.stage !== "lobby") return fail("Trận đã bắt đầu");
        const approvedSeats = this.state.seats.filter(
          (s) => s.name && s.approved !== false && (s.playerKey || this.config.teams)
        );
        if (approvedSeats.length <= 1) {
          return fail("Cần tối thiểu 2 thí sinh tham gia để bắt đầu cuộc thi");
        }
        st.stage = "playing";
        st.entranceCompleted = false;
        st.introStandby = true;
        st.roundIdx = -1;
        if (st.rounds.length === 0) return fail("Chưa chọn vòng thi nào");
        const res = this.nextRound(now);
        if (!res.ok) return res;
        st.banner = null;
        // Giữ trạng thái intro/chào đầu cho tới khi Host chủ động chọn vòng thi (không tự nhảy sang Khởi Động)
        st.introStandby = true;
        st.introTimer = mkTimer(86400000);
        startTimer(st.introTimer, now);
        st.showStageGraphics = false;
        this.cue("6_NhacKhac/contest_intro");
        return OK;
      }
      case "seat:approve": {
        if (st.stage !== "lobby") return fail("Chỉ phê duyệt được ở sảnh chờ");
        const requestId = a.requestId ? String(a.requestId) : undefined;
        const seatId = a.seatId !== undefined ? Number(a.seatId) : undefined;

        if (st.joinRequests && st.joinRequests.length > 0) {
          const reqIdx = st.joinRequests.findIndex(
            (r) => (requestId && r.id === requestId) || (seatId !== undefined && r.seatId === seatId)
          );
          if (reqIdx >= 0) {
            const req = st.joinRequests[reqIdx];
            st.joinRequests.splice(reqIdx, 1);
            const target = st.seats[req.seatId];
            target.name = req.name;
            if (req.school) target.school = req.school;
            target.playerKey = req.id;
            target.approved = true;
            target.connected = true;
            this.logMsg(`Host đã phê duyệt ${req.name} vào Ghế ${req.seatId + 1}`);
            return OK;
          }
        }

        // Direct approval of an existing seat in lobby
        if (seatId !== undefined && seatId >= 0 && seatId < st.seats.length) {
          const s = st.seats[seatId];
          if (s.name) {
            s.approved = true;
            s.connected = true;
            this.logMsg(`Host đã phê duyệt ${s.name} vào Ghế ${seatId + 1}`);
            return OK;
          }
        }
        return fail("Không tìm thấy yêu cầu chờ duyệt");
      }
      case "seat:reject": {
        if (st.stage !== "lobby") return fail("Chỉ thao tác được ở sảnh chờ");
        const requestId = a.requestId ? String(a.requestId) : undefined;
        const seatId = a.seatId !== undefined ? Number(a.seatId) : undefined;

        if (st.joinRequests) {
          const reqIdx = st.joinRequests.findIndex(
            (r) => (requestId && r.id === requestId) || (seatId !== undefined && r.seatId === seatId)
          );
          if (reqIdx >= 0) {
            const req = st.joinRequests[reqIdx];
            st.joinRequests.splice(reqIdx, 1);
            const target = st.seats[req.seatId];
            if (target && target.playerKey === req.id && !target.approved) {
              target.name = "";
              target.school = undefined;
              target.playerKey = null;
              target.connected = false;
              target.approved = false;
            }
            this.logMsg(`Host đã từ chối yêu cầu của ${req.name}`);
            return OK;
          }
        }

        if (seatId !== undefined && seatId >= 0 && seatId < st.seats.length) {
          this.kickSeat(seatId);
          return OK;
        }
        return fail("Không tìm thấy yêu cầu để từ chối");
      }
      case "seat:swap": {
        if (st.stage !== "lobby") return fail("Chỉ có thể đổi vị trí trước khi trận đấu bắt đầu");
        const seatA = Number(a.seatA);
        const seatB = Number(a.seatB);
        if (
          isNaN(seatA) ||
          isNaN(seatB) ||
          seatA < 0 ||
          seatA >= st.seats.length ||
          seatB < 0 ||
          seatB >= st.seats.length
        ) {
          return fail("Vị trí ghế không hợp lệ");
        }
        if (seatA === seatB) return OK;

        const sA = st.seats[seatA];
        const sB = st.seats[seatB];

        const tmp = {
          name: sA.name,
          school: sA.school,
          playerKey: sA.playerKey,
          connected: sA.connected,
          score: sA.score,
          approved: sA.approved,
        };

        sA.name = sB.name;
        sA.school = sB.school;
        sA.playerKey = sB.playerKey;
        sA.connected = sB.connected;
        sA.score = sB.score;
        sA.approved = sB.approved;

        sB.name = tmp.name;
        sB.school = tmp.school;
        sB.playerKey = tmp.playerKey;
        sB.connected = tmp.connected;
        sB.score = tmp.score;
        sB.approved = tmp.approved;

        // Update joinRequests if any
        if (st.joinRequests) {
          for (const req of st.joinRequests) {
            if (req.seatId === seatA) req.seatId = seatB;
            else if (req.seatId === seatB) req.seatId = seatA;
          }
        }

        this.logMsg(`Host đã hoán đổi vị trí giữa Ghế ${seatA + 1} và Ghế ${seatB + 1}`);
        return OK;
      }
      case "seat:clear": {
        if (st.stage !== "lobby") return fail("Chỉ thao tác được ở sảnh chờ");
        const seatId = Number(a.seatId);
        if (isNaN(seatId) || seatId < 0 || seatId >= st.seats.length) {
          return fail("Ghế không hợp lệ");
        }
        this.kickSeat(seatId);
        return OK;
      }
      case "intro:skip": {
        if (st.introTimer) {
          st.introTimer = null;
          st.banner = st.currentRound ? ROUND_LABELS[st.currentRound] : null;
          if (st.currentRound === "khoiDong") {
            this.cue("1_KhoiDong/start_round");
          }
        }
        return OK;
      }
      case "round:next":
        st.studioCameraManual = false;
        st.studioCamera = undefined;
        if (st.stage !== "playing") return fail("Trận chưa bắt đầu");
        return this.nextRound(now);
      case "round:finish":
        if (!st.currentRound) return fail("Chưa có vòng thi");
        this.finishRound(now);
        return OK;
      case "round:force": {
        const r = a.round as RoundId;
        if (!ROUND_ORDER.includes(r)) return fail("Vòng không hợp lệ");
        if (st.stage === "lobby") return fail("Hãy bắt đầu trận trước");
        if (st.stage === "finished") st.stage = "playing";
        if (st.currentRound && st.roundStatus[st.currentRound] === "active") this.finishRound(now);
        st.roundStatus[r] = "pending";
        return this.beginRound(r, now, true);
      }
      case "banner:hide":
        st.banner = null;
        return OK;
      case "display:stageGraphics": {
        // Host toggle: bật/tắt đồ hoạ lục giác trên màn hình Display
        st.showStageGraphics = !!a.on;
        return OK;
      }
      case "studio:toggle": {
        // Host toggle: bật/tắt trường quay 3D Olympia
        st.showStageGraphics = !st.showStageGraphics;
        return OK;
      }
      case "studio:camera": {
        // Host chọn góc camera thủ công
        st.studioCamera = a.cam as number;
        st.studioCameraManual = true;
        return OK;
      }
      case "studio:camera:auto": {
        // Reset về auto-camera
        st.studioCameraManual = false;
        st.studioCamera = undefined;
        return OK;
      }
      case "display:overlayMode": {
        // Chuyển đổi giữa 1/3 DƯỚI (Lower-Third) và TOÀN MÀN (Fullscreen)
        st.overlayMode = (a.mode as "LOWER_THIRD" | "FULLSCREEN") || (st.overlayMode === "FULLSCREEN" ? "LOWER_THIRD" : "FULLSCREEN");
        if (st.summaryState) {
          st.summaryState.isFullscreen = st.overlayMode === "FULLSCREEN";
        }
        return OK;
      }
      case "rightScreen:setMode": {
        st.rightScreenMode = (a.mode as any) || "auto";
        return OK;
      }
      case "score:set": {
        const id = num("seat");
        const s = this.seat(id);
        if (!s) return fail("Ghế không hợp lệ");
        const newScore = Math.max(0, Number(a.score));
        if (Number.isNaN(newScore)) return fail("Điểm số không hợp lệ");
        const delta = newScore - s.score;
        s.score = newScore;
        this.pushTranscript({
          at: now,
          round: st.currentRound ?? "system",
          roundLabel: st.currentRound ? ROUND_LABELS[st.currentRound] : "Hệ thống",
          segmentLabel: "Nhập điểm trực tiếp",
          entryKind: "score_adjust",
          actorSeat: id,
          actorName: this.seatName(id),
          verdict: "info",
          scoreChanges: { [id]: delta },
          note: `Quản trò nhập điểm ${this.seatName(id)}: ${newScore}`,
        });
        return OK;
      }
      case "system:setKdFinishTurnPan": {
        const p = a.pan as "both" | "left" | "right";
        if (p === "both" || p === "left" || p === "right") {
          this.state.kdFinishTurnPan = p;
        }
        return OK;
      }
      case "score:adjust": {
        const id = num("seat");
        if (!this.seat(id)) return fail("Ghế không hợp lệ");
        const delta = Number(a.delta) || 0;
        this.addScore(id, delta);
        this.pushTranscript({
          at: now,
          round: st.currentRound ?? "system",
          roundLabel: st.currentRound ? ROUND_LABELS[st.currentRound] : "Hệ thống",
          segmentLabel: "Điều chỉnh điểm thủ công",
          entryKind: "score_adjust",
          actorSeat: id,
          actorName: this.seatName(id),
          verdict: "info",
          scoreChanges: { [id]: delta },
          note: `Quản trò điều chỉnh điểm ${this.seatName(id)}: ${delta >= 0 ? "+" : ""}${delta}`,
        });
        return OK;
      }
      case "system:setO22Quarter": {
        const q = Number(a.quarter) as O22Quarter;
        if (q === 1 || q === 2 || q === 3) {
          st.o22Quarter = q;
          if (this.ruleset.id === "O22") {
            const kd = st.khoiDong;
            if (kd && (kd.phase === "intro" || kd.qIdx < 0)) {
              const segs = turnsO22(q);
              kd.segments = segs;
              if (kd.segIdx < segs.length) {
                const curSeg = segs[kd.segIdx];
                kd.timer = mkTimer(curSeg.perQuestionMs);
                kd.globalTimer = curSeg.globalMs ? mkTimer(curSeg.globalMs) : null;
              }
            }
          }
        }
        return OK;
      }
      case "system:setChpLimit": {
        const raw = a.limit;
        const nextLimit: ChpQuestionLimit | null =
          raw === "unlimited" || raw === null || raw === 0 || raw === "0"
            ? "unlimited"
            : Number(raw) === 3
              ? 3
              : null;
        if (!nextLimit) return fail("Giới hạn Câu hỏi phụ không hợp lệ (chỉ hỗ trợ 3 hoặc unlimited)");
        st.chpQuestionLimit = nextLimit;
        if (st.cauHoiPhu && st.cauHoiPhu.phase === "done" && nextLimit === "unlimited" && st.cauHoiPhu.winner == null) {
          st.cauHoiPhu.phase = st.cauHoiPhu.qIdx >= 0 ? "result" : "idle";
        }
        this.logMsg(
          `Cài đặt Câu hỏi phụ: ${nextLimit === "unlimited" ? "Không giới hạn số câu" : "Tối đa 3 câu"}`
        );
        return OK;
      }
      case "theme:set": {
        const t = a.themeMode as "v3_arrow" | "o26_classic";
        if (t === "v3_arrow" || t === "o26_classic") {
          st.themeMode = t;
          this.logMsg(`Chuyển theme sang: ${t === "v3_arrow" ? "Mũi Tên V3" : "O26 VTV3 Cổ Điển"}`);
        }
        return OK;
      }
      case "bell:toggleTest": {
        st.bellTestMode = !st.bellTestMode;
        st.bellTestLogs = [];
        this.logMsg(st.bellTestMode ? "🔔 Đã BẬT chế độ Test Chuông" : "🔕 Đã TẮT chế độ Test Chuông");
        return OK;
      }
      case "bell:clearTest": {
        st.bellTestLogs = [];
        if (st.khoiDong) st.khoiDong.buzzedSeat = null;
        if (st.vcnv) st.vcnv.bells = [];
        if (st.veDich?.steal) st.veDich.steal.buzzedSeat = null;
        if (st.cauHoiPhu) {
          st.cauHoiPhu.buzzedSeat = null;
          st.cauHoiPhu.buzzedThisQuestion = [];
        }
        return OK;
      }
      case "seat:kick": {
        const id = num("seat");
        const sName = this.seatName(id);
        this.kickSeat(id);
        if (st.khoiDong && st.khoiDong.buzzedSeat === id) st.khoiDong.buzzedSeat = null;
        if (st.veDich?.steal && st.veDich.steal.buzzedSeat === id) st.veDich.steal.buzzedSeat = null;
        if (st.cauHoiPhu && st.cauHoiPhu.buzzedSeat === id) st.cauHoiPhu.buzzedSeat = null;
        if (st.vcnv?.bells) st.vcnv.bells = st.vcnv.bells.filter((b) => b.seat !== id);
        this.logMsg(`Quản trò đã mời ${sName || `Ghế ${id + 1}`} ra khỏi phòng`);
        return OK;
      }
      case "seat:rename": {
        const s = this.seat(num("seat"));
        if (!s) return fail("Ghế không hợp lệ");
        s.name = String(a.name || "").slice(0, 30);
        if (a.school !== undefined) {
          s.school = String(a.school || "").slice(0, 60);
        }
        return OK;
      }
      case "seat:setSchool": {
        const s = this.seat(num("seat"));
        if (!s) return fail("Ghế không hợp lệ");
        s.school = String(a.school || "").slice(0, 60);
        return OK;
      }
      case "entrance:start": {
        const ALL_GESTURES: ContestantGestureType[] = [
          "wave_single",
          "fist_pump",
          "hand_on_heart_bow",
          "wave_double",
          "heart_pose",
        ];
        const activeCount = Math.max(1, st.seats.length);
        const shuffled = [...ALL_GESTURES].sort(() => Math.random() - 0.5);
        const seatGestures: ContestantGestureType[] = [];
        for (let i = 0; i < activeCount; i++) {
          seatGestures.push(shuffled[i % shuffled.length]);
        }

        // Giữ trạng thái Intro Standby để không tự ý chuyển sang vòng thi đấu khi chưa có hiệu lệnh của Host
        st.introStandby = true;
        if (!st.introTimer) {
          st.introTimer = mkTimer(86400000);
          startTimer(st.introTimer, now);
        }
        st.studioCamera = 11;
        st.studioCameraManual = false;
        st.entranceState = {
          active: true,
          startedAt: now,
          currentSeatIdx: 0,
          seatStartedAt: now,
          seatGestures,
          seatStartTimes: [now],
        };
        this.cue("6_NhacKhac/contestant_intro", "sound");
        return OK;
      }
      case "entrance:next": {
        if (!st.entranceState || !st.entranceState.active) return OK;
        const activeCount = Math.max(1, st.seats.length);
        const nextIdx = st.entranceState.currentSeatIdx + 1;
        if (nextIdx < activeCount) {
          st.entranceState.currentSeatIdx = nextIdx;
          st.entranceState.seatStartedAt = now;
          if (!st.entranceState.seatStartTimes) {
            st.entranceState.seatStartTimes = [st.entranceState.startedAt];
          }
          st.entranceState.seatStartTimes[nextIdx] = now;
        } else {
          st.entranceState = null;
          st.entranceCompleted = true;
          st.introStandby = true;
          st.studioCamera = 3;
          st.studioCameraManual = false;
          this.cue("", "stop");
        }
        return OK;
      }
      case "entrance:skip": {
        st.entranceState = null;
        st.entranceCompleted = true;
        st.introStandby = true;
        st.studioCamera = 3;
        st.studioCameraManual = false;
        this.cue("", "stop");
        return OK;
      }
      case "game:reset": {
        const fresh = new OlympiaGame(st.code, this.config, now).state;
        fresh.seats = st.seats.map((s) => ({ ...s, score: 0 }));
        this.state = fresh;
        return OK;
      }
      case "game:end":
        st.stage = "finished";
        st.currentRound = null;
        st.banner = null;
        this.cue("6_NhacKhac/ending_music");
        return OK;
      case "audio:stop_bgm":
        this.cue("", "stop");
        return OK;
      case "audio:prize":
        this.cue("6_NhacKhac/prize_award");
        return OK;
      case "audio:summary":
        this.cue("6_NhacKhac/summary");
        return OK;
      case "scoreboard:toggle":
        st.showScoreboard = !st.showScoreboard;
        return OK;
      case "bgm:waiting":
        st.waitingBgm = !st.waitingBgm;
        if (st.waitingBgm) {
          this.cue("1_KhoiDong/ready", "bgm");
        } else {
          this.cue("", "stop");
        }
        return OK;
      case "summary:start": {
        if (!canStartScoreSummary(st)) {
          return fail("Chỉ có thể mở Tổng kết điểm sau khi phần thi hiện tại đã kết thúc hoàn toàn!");
        }
        const isAuto = a.isAuto !== false && a.auto !== false;
        // Sort active seats: score ascending. Tie break: seatId ascending
        const orderedSeats = [...this.activeSeatIds].sort((x, y) => {
          const sx = this.seat(x)?.score ?? 0;
          const sy = this.seat(y)?.score ?? 0;
          if (sx !== sy) return sx - sy;
          return x - y;
        });
        if (orderedSeats.length === 0) return fail("Không có thí sinh");
        st.introTimer = null;
        st.showScoreboard = false;
        st.studioCameraManual = false;
        const isFullscreen = a.isFullscreen != null ? Boolean(a.isFullscreen) : (st.overlayMode === "FULLSCREEN");
        st.summaryState = {
          active: true,
          currentIndex: 0,
          orderedSeats,
          isAuto,
          isFullscreen,
          lastAdvanceAt: now,
        };
        this.cue("6_NhacKhac/summary", "bgm");
        const firstSeat = orderedSeats[0];
        st.studioCamera = isFullscreen ? 10 : seatToStudioCamera(firstSeat);
        return OK;
      }
      case "summary:next": {
        if (!st.summaryState || !st.summaryState.active) return fail("Chưa bắt đầu tổng kết điểm");
        const nextIdx = st.summaryState.currentIndex + 1;
        if (nextIdx < st.summaryState.orderedSeats.length) {
          st.summaryState.currentIndex = nextIdx;
          st.summaryState.lastAdvanceAt = now;
          const nextSeat = st.summaryState.orderedSeats[nextIdx];
          st.studioCamera = st.summaryState.isFullscreen ? 10 : seatToStudioCamera(nextSeat);
        } else {
          st.summaryState.active = false;
          st.studioCameraManual = false;
          st.studioCamera = 10;
          this.cue("", "stop");
        }
        return OK;
      }
      case "summary:prev": {
        if (!st.summaryState || !st.summaryState.active) return fail("Chưa bắt đầu tổng kết điểm");
        const prevIdx = Math.max(0, st.summaryState.currentIndex - 1);
        st.summaryState.currentIndex = prevIdx;
        st.summaryState.lastAdvanceAt = now;
        const prevSeat = st.summaryState.orderedSeats[prevIdx];
        st.studioCamera = st.summaryState.isFullscreen ? 10 : seatToStudioCamera(prevSeat);
        return OK;
      }
      case "summary:toggleAuto": {
        if (!st.summaryState || !st.summaryState.active) return fail("Chưa bắt đầu tổng kết điểm");
        st.summaryState.isAuto = !st.summaryState.isAuto;
        st.summaryState.lastAdvanceAt = now;
        return OK;
      }
      case "summary:toggleFullscreen": {
        if (!st.summaryState || !st.summaryState.active) return fail("Chưa bắt đầu tổng kết điểm");
        st.summaryState.isFullscreen = !st.summaryState.isFullscreen;
        st.overlayMode = st.summaryState.isFullscreen ? "FULLSCREEN" : "LOWER_THIRD";
        const curSeat = st.summaryState.orderedSeats[st.summaryState.currentIndex] ?? 0;
        st.studioCamera = st.summaryState.isFullscreen ? 10 : seatToStudioCamera(curSeat);
        return OK;
      }
      case "summary:stop": {
        if (st.summaryState) {
          st.summaryState.active = false;
        }
        st.studioCameraManual = false;
        st.studioCamera = 10;
        this.cue("", "stop");
        return OK;
      }
    }

    if (st.banner) st.banner = null;
    if (st.introTimer) st.introTimer = null;
    if (
      type.startsWith("kd:") ||
      type.startsWith("vcnv:") ||
      type.startsWith("tt:") ||
      type.startsWith("vd:") ||
      type.startsWith("chp:")
    ) {
      if (st.summaryState?.active) {
        st.summaryState.active = false;
      }
      const isUtilityOnly =
        type === "kd:setBgm" ||
        type === "kd:stopBgm" ||
        type === "vcnv:toggleLockSeat" ||
        type === "vcnv:unlockAllSeats" ||
        type === "chp:selectSeats";
      if (!isUtilityOnly && type !== "vcnv:blank" && type !== "tt:blank") {
        st.studioCameraManual = false;
        st.studioCamera = undefined;
      }
    }
    if (type.startsWith("kd:")) return this.kdAction(type, a, now);
    if (type.startsWith("vcnv:")) return this.vcnvAction(type, a, now);
    if (type.startsWith("tt:")) return this.ttAction(type, a, now);
    if (type.startsWith("vd:")) return this.vdAction(type, a, now);
    if (type.startsWith("chp:")) return this.chpAction(type, a, now);
    return fail("Hành động không hợp lệ: " + type);
  }

  // ───────────────────────── KHỞI ĐỘNG ─────────────────────────
  private kdPoolQuestion(kd: KhoiDongState, seg: KdSegmentDef): QA | null {
    const set = this.config.questionSet.khoiDong;
    const guard = this.duplicateGuard();
    const isFresh = (c?: QA | null): c is QA => Boolean(c && c.q && !guard.openedQ.has(this.normQ(c.q)));
    const isStrictFresh = (c?: QA | null): c is QA =>
      isFresh(c) && !(c.a && guard.openedA.has(this.normQ(c.a)));

    /** Chọn câu CHƯA MỞ trong danh sách (ưu tiên đáp án chưa lặp). Trả item=null nếu danh sách đã hết câu mới. */
    const pickUnused = (list: QA[], startIdx: number): { item: QA | null; nextIdx: number } => {
      if (list.length === 0) return { item: null, nextIdx: startIdx };
      for (const test of [isStrictFresh, isFresh]) {
        for (let offset = 0; offset < list.length; offset++) {
          const idx = (startIdx + offset) % list.length;
          const cand = list[idx];
          if (test(cand)) return { item: cand, nextIdx: startIdx + offset + 1 };
        }
      }
      return { item: null, nextIdx: startIdx };
    };

    /**
     * Khi hàng đợi riêng/chung đã cạn (ví dụ từ câu 13-14 trở đi): bốc từ TOÀN BỘ ngân hàng Khởi Động,
     * ưu tiên câu chưa mở + chưa bị vòng khác xếp sẵn. Chỉ khi cả ngân hàng đã hết mới buộc phải lặp.
     */
    const drawFromWholeBank = (): QA | null => {
      const all: QA[] = [];
      const seenKeys = new Set<string>();
      const push = (c?: QA | null) => {
        if (!c?.q) return;
        const k = this.normQ(c.q);
        if (seenKeys.has(k)) return;
        seenKeys.add(k);
        all.push(c);
      };
      for (const c of kd.sharedQueue ?? []) push(c);
      for (const list of Object.values(kd.seatQueues ?? {})) for (const c of list) push(c);
      for (const c of set.shared ?? []) push(c);
      for (const list of Object.values(set.solo ?? {})) for (const c of list) push(c);
      if (all.length === 0) return null;

      const notReserved = (c: QA) => !guard.reservedQ.has(this.normQ(c.q));
      const tiers: Array<(c: QA) => boolean> = [
        (c) => isStrictFresh(c) && notReserved(c),
        (c) => isFresh(c) && notReserved(c),
        (c) => isStrictFresh(c),
        (c) => isFresh(c),
      ];
      // Chọn ngẫu nhiên trong tầng tốt nhất để phân bổ đều các lĩnh vực
      for (const tier of tiers) {
        const candidates = all.filter(tier);
        if (candidates.length > 0) {
          return candidates[Math.floor(Math.random() * candidates.length)];
        }
      }
      // Ngân hàng đã dùng hết 100%: buộc phải lặp (hiếm) — chọn câu mở sớm nhất
      return all[Math.max(0, kd.poolCursor) % all.length] ?? null;
    };
    const attach = (item: QA | null): QA | null => {
      if (!item) return null;
      const tagged = tagQAWithAI(item, false);
      return {
        ...tagged,
        subject: tagged.subject || KHOI_DONG_SUBJECTS[Math.max(0, kd.qIdx) % KHOI_DONG_SUBJECTS.length],
      };
    };
    if (seg.kind === "solo") {
      const seatId = seg.seat as number;
      if (kd.seatQueues && kd.seatQueues[seatId] && kd.seatQueues[seatId].length > 0) {
        const qList = kd.seatQueues[seatId];
        const { item } = pickUnused(qList, Math.max(0, kd.qIdx));
        return attach(item ?? drawFromWholeBank());
      }
      const order = this.activeSeatIds.indexOf(seatId);
      const pool = set.solo[String(order + 1)] ?? set.shared;
      const { item: poolItem } = pickUnused(pool, Math.max(0, kd.qIdx));
      if (poolItem) return attach(poolItem);
      return attach(drawFromWholeBank());
    }
    if (kd.sharedQueue && kd.sharedQueue.length > 0) {
      const { item, nextIdx } = pickUnused(kd.sharedQueue, kd.poolCursor);
      if (item) {
        kd.poolCursor = nextIdx;
        return attach(item);
      }
      return attach(drawFromWholeBank());
    }
    const flat = [...set.shared, ...Object.values(set.solo).flat()];
    if (flat.length === 0) return null;
    const { item, nextIdx } = pickUnused(flat, kd.poolCursor);
    if (item) {
      kd.poolCursor = nextIdx;
      return attach(item);
    }
    return attach(drawFromWholeBank());
  }

  private kdAction(type: string, a: HostAction, now: number): ActionResult {
    const st = this.state;
    const kd = st.khoiDong;
    if (st.currentRound !== "khoiDong" || !kd) return fail("Không ở vòng Khởi Động");
    const seg = kd.segments[kd.segIdx];
    const isSolo = seg.kind === "solo";
    const rs = this.ruleset.khoiDong;

    switch (type) {
      case "kd:next": {
        st.studioCameraManual = false;
        st.studioCamera = undefined;
        if (kd.startCooldownUntil && now < kd.startCooldownUntil) {
          return fail("Vui lòng đợi đồ hoạ mở xong (3.5s)");
        }
        if (st.introTimer) {
          st.introTimer = null;
          st.banner = null;
          this.cue("1_KhoiDong/start_round");
        }
        const isLastSeg = kd.segIdx + 1 >= kd.segments.length;

        // When in segmentDone: advance to next segment / finish round
        if (kd.phase === "segmentDone") {
          if (isLastSeg) {
            this.finishRound(now);
            return OK;
          }
          kd.segIdx += 1;
          const ns = kd.segments[kd.segIdx];
          kd.qIdx = -1;
          kd.phase = "intro";
          kd.questionRevealed = false;
          kd.started = false;
          kd.timer = mkTimer(ns.perQuestionMs);
          kd.globalTimer = ns.globalMs ? mkTimer(ns.globalMs) : null;
          kd.buzzedSeat = null;
          kd.buzzOpen = false;
          kd.buzzUnlockAt = undefined;
          kd.lockedSeats = [];
          kd.nextLockedSeats = [];
          kd.current = null;
          kd.lastVerdict = null;
          return OK;
        }

        // When time is up (O13-O22) or at the last question (O23-O26), pressing next / Kết thúc lượt
        // finishes the turn, cues finish_turn and sets segmentDone!
        const isTimeUp = Boolean(seg.globalMs && kd.globalTimer && kd.globalTimer.remainingMs <= 0);
        const isLastQ = kd.qIdx >= (seg.questions || 6) - 1;
        if (kd.started && kd.phase !== "intro" && (isTimeUp || isLastQ)) {
          kd.phase = "segmentDone";
          kd.started = false;
          kd.questionRevealed = false;
          kd.current = null;
          kd.buzzedSeat = null;
          kd.buzzOpen = false;
          kd.buzzUnlockAt = undefined;
          kd.currentBgmTrack = undefined;
          this.cue("1_KhoiDong/finish_turn", "sound", this.state.kdFinishTurnPan || "both");
          if (isLastSeg) {
            this.finishRound(now);
          }
          return OK;
        }

        // If question is in intro or opened but not revealed yet, pressing "Câu tiếp" reveals question content (từ câu 0 sang câu 1).
        if (kd.phase === "intro" || (kd.phase === "question" && !kd.questionRevealed)) {
          const wasStarted = kd.started;
          kd.phase = "question";
          kd.started = true;
          kd.questionRevealed = true;
          if (kd.qIdx < 0) {
            kd.qIdx = 0;
            const q = this.kdPoolQuestion(kd, seg);
            if (q) {
              q.used = true;
              this.recordOpenedQuestion(q.q);
              kd.current = {
                q: q.q,
                a: q.a,
                subject: q.subject,
                kdZone: q.kdZone,
                vdZone: q.vdZone,
                media: q.media,
                mediaType: q.mediaType,
              };
            }
          }
          kd.questionRevealedAt = now;
          if (isSolo) {
            kd.buzzOpen = false;
            kd.buzzUnlockAt = undefined;
            kd.noBuzzWrongUnlockAt = undefined;
          } else {
            kd.buzzOpen = false;
            const lockMs = (this.ruleset.id === "O22") ? 2000 : 5000;
            kd.buzzUnlockAt = now + lockMs;
            const wrongLockMs = (this.ruleset.id === "O22") ? 3000 : 5000;
            kd.noBuzzWrongUnlockAt = now + wrongLockMs;
          }
          if (wasStarted && kd.globalTimer) {
            const rId = this.ruleset.id;
            const aSeason = this.ruleset.audioSeason;
            if (!timerRunning(kd.globalTimer)) {
              startTimer(kd.globalTimer, now);
            }
            if (aSeason === "O13-21" || /^O(1[3-9]|2[0-1])$/.test(rId)) {
              this.cue("1_KhoiDong/60s", "bgm");
            } else if (rId === "O22" || aSeason === "O22") {
              const gMs = seg.globalMs || 60000;
              if (gMs <= 30000) this.cue("1_KhoiDong/30s", "bgm");
              else if (gMs <= 60000) this.cue("1_KhoiDong/60s", "bgm");
              else this.cue("1_KhoiDong/90s", "bgm");
            }
          } else if (!kd.globalTimer) {
            kd.currentBgmTrack = "kd_bgm_1";
            // Chỉ phát BGM, tuyệt đối không phát lại "1_KhoiDong/open_question" vì đã phát lúc bung mở đồ hoạ ở t=3.5s
            this.cue("1_KhoiDong/kd_bgm_1", "bgm");
          }
          return OK;
        }

        kd.qIdx += 1;
        if (kd.qIdx >= seg.questions) {
          kd.phase = "segmentDone";
          kd.started = false;
          kd.questionRevealed = false;
          kd.current = null;
          kd.buzzedSeat = null;
          kd.buzzOpen = false;
          kd.buzzUnlockAt = undefined;
          kd.currentBgmTrack = undefined;
          this.cue("1_KhoiDong/finish_turn", "sound", this.state.kdFinishTurnPan || "both");
          return OK;
        }
        const q = this.kdPoolQuestion(kd, seg);
        if (!q) {
          kd.phase = "segmentDone";
          kd.started = false;
          kd.questionRevealed = false;
          kd.current = null;
          kd.buzzOpen = false;
          kd.buzzUnlockAt = undefined;
          kd.currentBgmTrack = undefined;
          this.cue("1_KhoiDong/finish_turn", "sound", this.state.kdFinishTurnPan || "both");
          return OK;
        }
        q.used = true;
        this.recordOpenedQuestion(q.q);
        kd.current = {
          q: q.q,
          a: q.a,
          subject: q.subject,
          kdZone: q.kdZone,
          vdZone: q.vdZone,
          media: q.media,
          mediaType: q.mediaType,
        };
        kd.phase = "question";
        resetTimer(kd.timer, seg.perQuestionMs);
        if (kd.qIdx > 0) {
          kd.questionRevealed = true;
          // Tuyệt đối không tự động đếm 5s khi chuyển câu. Quản trò nhấn Space / Tính giờ mới bắt đầu đếm!
        }
        kd.buzzedSeat = null;
        kd.lockedSeats = [...kd.nextLockedSeats];
        kd.nextLockedSeats = [];
        kd.lastVerdict = null;

        kd.questionRevealedAt = now;
        if (isSolo) {
          kd.buzzOpen = false;
          kd.buzzUnlockAt = undefined;
          kd.noBuzzWrongUnlockAt = undefined;
        } else {
          // Shared KĐ: locked 2s for O22, 5s for O23+
          kd.buzzOpen = false;
          const lockMs = (this.ruleset.id === "O22") ? 2000 : 5000;
          kd.buzzUnlockAt = now + lockMs;
          const wrongLockMs = (this.ruleset.id === "O22") ? 3000 : 5000;
          kd.noBuzzWrongUnlockAt = now + wrongLockMs;
        }
        const aSeason = this.ruleset.audioSeason;
        if (!seg.globalMs && aSeason !== "O13-21" && !(this.ruleset.id === "O22" && !isSolo)) {
          const totalQ = seg.questions || 6;
          // Quy tắc chuyển nhạc nền chuẩn:
          // kd_bgm_1: từ Câu 1 đến Câu (Math.ceil(totalQ / 2) - 1)
          // kd_bgm_2: từ câu tiếp theo cho tới câu áp chót (totalQ - 1)
          // kd_bgm_3: ở câu cuối cùng (totalQ)
          const halfCeil = Math.ceil(totalQ / 2);
          const bgm1EndQ = Math.max(1, halfCeil - 1); // 1-based question number
          const currentQNum = kd.qIdx + 1; // 1-based question number

          let bgmTrack: "kd_bgm_1" | "kd_bgm_2" | "kd_bgm_3";
          if (currentQNum <= bgm1EndQ) {
            bgmTrack = "kd_bgm_1";
          } else if (currentQNum < totalQ) {
            bgmTrack = "kd_bgm_2";
          } else {
            bgmTrack = "kd_bgm_3";
          }

          // Chỉ gửi cue mới khi track thực sự thay đổi và đã có track trước đó
          if (kd.currentBgmTrack && bgmTrack !== kd.currentBgmTrack) {
            kd.currentBgmTrack = bgmTrack;
            this.cue("1_KhoiDong/" + bgmTrack, "bgm");
          } else if (!kd.currentBgmTrack) {
            kd.currentBgmTrack = bgmTrack;
            this.cue("1_KhoiDong/" + bgmTrack, "bgm");
          }
        }
        return OK;
      }
      case "kd:timer": {
        if (kd.phase !== "question" && kd.phase !== "intro") return fail("Chưa mở câu hỏi");
        if (seg.globalMs && kd.globalTimer) {
          if (timerRunning(kd.globalTimer)) {
            pauseTimer(kd.globalTimer, now);
            kd.buzzOpen = false;
          } else {
            startTimer(kd.globalTimer, now);
            kd.buzzOpen = !isSolo;
            const rId = this.ruleset.id;
            const aSeason = this.ruleset.audioSeason;
            if (aSeason === "O13-21" || /^O(1[3-9]|2[0-1])$/.test(rId)) {
              this.cue("1_KhoiDong/60s", "bgm");
            } else if (rId === "O22" || aSeason === "O22") {
              const gMs = seg.globalMs || 60000;
              if (gMs <= 30000) this.cue("1_KhoiDong/30s", "bgm");
              else if (gMs <= 60000) this.cue("1_KhoiDong/60s", "bgm");
              else this.cue("1_KhoiDong/90s", "bgm");
            }
          }
          return OK;
        }
        if (timerRunning(kd.timer)) {
          pauseTimer(kd.timer, now);
          kd.buzzOpen = false;
        } else {
          startTimer(kd.timer, now);
          if (!isSolo && kd.buzzedSeat == null) {
            if (kd.buzzUnlockAt && now < kd.buzzUnlockAt) {
              kd.buzzOpen = false;
            } else {
              kd.buzzOpen = true;
            }
          }
          // BGM continues seamlessly without restarting on timer start
        }
        return OK;
      }
      case "kd:start": {
        // Nút Bắt đầu chỉ được nhấn khi bắt đầu lượt mới (chưa bắt đầu hoặc lượt trước đã kết thúc/hết câu).
        // Không cho phép nhấn trong khi đội/thí sinh vẫn đang còn câu hỏi đang thi.
        if (kd.started && kd.phase !== "segmentDone" && kd.phase !== "intro" && kd.qIdx < seg.questions - 1) {
          return fail("Lượt thi đang diễn ra, không thể nhấn Bắt đầu lại!");
        }
        // Auto-hide đồ hoạ sân khấu khi bắt đầu lượt thi
        st.introTimer = null;
        if (st.showStageGraphics) st.showStageGraphics = false;
        kd.phase = "question";
        kd.started = true;
        kd.buzzedSeat = null;
        kd.questionRevealed = false;
        kd.qIdx = -1;
        kd.current = null;
        kd.buzzOpen = false;
        kd.buzzUnlockAt = undefined;
        kd.noBuzzWrongUnlockAt = undefined;
        kd.currentBgmTrack = undefined;

        // t = 0s: Bấm BẮT ĐẦU: Phát âm ready (đồ hoạ chưa hiện).
        // Sau 3.5s (khi kdIntroTimer hết hạn): tick() sẽ phát open_question đồng thời đồ hoạ bung mở.
        st.kdIntroTimer = mkTimer(3500);
        startTimer(st.kdIntroTimer, now);
        kd.startCooldownUntil = now + 3500;

        if (seg.globalMs) {
          kd.globalTimer = mkTimer(seg.globalMs);
        }

        // Nhấn Bắt đầu: phát strictly ONLY "ready", đồ hoạ hạ 1/3 chưa hiện trong 3.5s
        this.cue("1_KhoiDong/ready");
        return OK;
      }
      case "kd:blank": {
        kd.buzzedSeat = null;
        kd.lastVerdict = null;
        this.cue("6_NhacKhac/blank_space");
        return OK;
      }
      case "kd:cycle_bgm": {
        const order: Array<"kd_bgm_1" | "kd_bgm_2" | "kd_bgm_3"> = ["kd_bgm_1", "kd_bgm_2", "kd_bgm_3"];
        const cur = kd.currentBgmTrack || "kd_bgm_1";
        const nxt = order[(order.indexOf(cur) + 1) % order.length];
        kd.currentBgmTrack = nxt;
        this.cue("1_KhoiDong/" + nxt, "bgm");
        return OK;
      }
      case "kd:selectSegment": {
        const applySegment = (idx: number) => {
          kd.segIdx = idx;
          kd.qIdx = -1;
          kd.phase = "intro";
          kd.questionRevealed = false;
          kd.started = false;
          kd.lastVerdict = null;
          const ns = kd.segments[idx];
          kd.timer = mkTimer(ns.perQuestionMs);
          kd.globalTimer = ns.globalMs ? mkTimer(ns.globalMs) : null;
          kd.buzzedSeat = null;
          kd.buzzOpen = false;
          kd.buzzUnlockAt = undefined;
          kd.lockedSeats = [];
          kd.nextLockedSeats = [];
          if (!ns.globalMs) {
            const preQ = this.kdPoolQuestion(kd, ns);
            kd.current = preQ
              ? {
                  q: preQ.q,
                  a: preQ.a,
                  subject: preQ.subject,
                  kdZone: preQ.kdZone,
                  vdZone: preQ.vdZone,
                  media: preQ.media,
                  mediaType: preQ.mediaType,
                }
              : null;
          } else {
            kd.current = null;
          }
        };

        if (a.segIdx != null) {
          const idx = Number(a.segIdx);
          if (idx >= 0 && idx < kd.segments.length) {
            applySegment(idx);
            return OK;
          }
        }
        if (a.seatId != null) {
          const sIdx = kd.segments.findIndex((s) => s.kind === "solo" && s.seat === Number(a.seatId));
          if (sIdx >= 0) {
            applySegment(sIdx);
            return OK;
          }
        }
        if (a.kind === "shared") {
          const sIdx = kd.segments.findIndex((s) => s.kind === "shared" || s.kind === "turn");
          if (sIdx >= 0) {
            applySegment(sIdx);
            return OK;
          }
        }
        return OK;
      }
      case "kd:finishTurn": {
        if (!kd.started && kd.phase === "segmentDone") return OK;
        kd.currentBgmTrack = undefined;
        this.cue("1_KhoiDong/finish_turn", "sound", this.state.kdFinishTurnPan || "both");
        const isLastSeg = kd.segIdx + 1 >= kd.segments.length;
        if (isLastSeg) {
          kd.phase = "segmentDone";
          kd.current = null;
          kd.buzzedSeat = null;
          kd.buzzOpen = false;
          kd.buzzUnlockAt = undefined;
          this.finishRound(now);
          return OK;
        }
        // Chuyển ngay sang thí sinh / lượt tiếp theo, không để kẹt lại ở người cũ
        kd.segIdx += 1;
        const ns = kd.segments[kd.segIdx];
        kd.qIdx = -1;
        kd.phase = "intro";
        kd.questionRevealed = false;
        kd.started = false;
        kd.timer = mkTimer(ns.perQuestionMs);
        kd.globalTimer = ns.globalMs ? mkTimer(ns.globalMs) : null;
        kd.buzzedSeat = null;
        kd.buzzOpen = false;
        kd.buzzUnlockAt = undefined;
        kd.noBuzzWrongUnlockAt = undefined;
        kd.lockedSeats = [];
        kd.nextLockedSeats = [];
        kd.current = null;
        kd.lastVerdict = null;
        return OK;
      }
      case "kd:ready": {
        this.cue("1_KhoiDong/ready");
        return OK;
      }
      case "kd:toggleSubject": {
        kd.showSubject = !kd.showSubject;
        return OK;
      }
      case "kd:setShowSubject": {
        kd.showSubject = Boolean(a.show);
        return OK;
      }
      case "kd:correct": {
        if (kd.phase !== "question") return fail("Chưa mở câu hỏi");
        const target = isSolo ? (seg.seat as number) : kd.buzzedSeat;
        if (target == null) return fail("Chưa có thí sinh nào bấm chuông");
        this.addScore(target, rs.correctPoints);
        pauseTimer(kd.timer, now);
        if (isSolo && seg.globalMs && kd.globalTimer && kd.qIdx + 1 >= seg.questions) {
          pauseTimer(kd.globalTimer, now);
        }
        kd.buzzOpen = false;
        kd.buzzUnlockAt = undefined;
        kd.noBuzzWrongUnlockAt = undefined;
        const buzzers: TranscriptBuzzerItem[] = [];
        if (!isSolo) {
          kd.lockedSeats.forEach((sId, idx) => {
            buzzers.push({ order: idx + 1, seat: sId, name: this.seatName(sId), verdict: "wrong" });
          });
          buzzers.push({ order: buzzers.length + 1, seat: target, name: this.seatName(target), verdict: "correct" });
        }
        this.pushTranscript({
          at: now,
          round: "khoiDong",
          roundLabel: ROUND_LABELS.khoiDong,
          segmentLabel: `${seg.label} • Câu ${kd.qIdx + 1}`,
          entryKind: "question",
          questionText: kd.current?.q,
          correctAnswer: kd.current?.a,
          subject: kd.current?.subject,
          kdZone: kd.current?.kdZone,
          vdZone: kd.current?.vdZone,
          mediaUrl: kd.current?.media,
          actorSeat: target,
          actorName: this.seatName(target),
          selectedPoints: rs.correctPoints,
          buzzerEvents: buzzers.length > 0 ? buzzers : undefined,
          verdict: "correct",
          scoreChanges: { [target]: rs.correctPoints },
        });
        kd.phase = "result";
        kd.lastVerdict = "correct";
        this.cue("1_KhoiDong/correct");
        return OK;
      }
      case "kd:wrong": {
        if (kd.phase !== "question") return fail("Chưa mở câu hỏi");
        if (isSolo) {
          const target = seg.seat as number;
          kd.phase = "result";
          kd.lastVerdict = "wrong";
          pauseTimer(kd.timer, now);
          if (seg.globalMs && kd.globalTimer && kd.qIdx + 1 >= seg.questions) {
            pauseTimer(kd.globalTimer, now);
          }
          this.pushTranscript({
            at: now,
            round: "khoiDong",
            roundLabel: ROUND_LABELS.khoiDong,
            segmentLabel: `${seg.label} • Câu ${kd.qIdx + 1}`,
            entryKind: "question",
            questionText: kd.current?.q,
            correctAnswer: kd.current?.a,
            subject: kd.current?.subject,
            kdZone: kd.current?.kdZone,
            vdZone: kd.current?.vdZone,
            mediaUrl: kd.current?.media,
            actorSeat: target,
            actorName: this.seatName(target),
            selectedPoints: rs.correctPoints,
            verdict: "wrong",
            scoreChanges: { [target]: 0 },
          });
          this.cue("1_KhoiDong/wrong");
          return OK;
        }
        const who = kd.buzzedSeat;
        if (who == null) {
          if (!isSolo && kd.noBuzzWrongUnlockAt && now < kd.noBuzzWrongUnlockAt) {
            const sec = this.ruleset.id === "O22" ? 3 : 5;
            return fail(`Không thể chấm sai khi chưa ai bấm chuông trong ${sec}s đầu!`);
          }
          pauseTimer(kd.timer, now);
          kd.buzzedSeat = null;
          kd.buzzOpen = false;
          kd.buzzUnlockAt = undefined;
          kd.noBuzzWrongUnlockAt = undefined;
          kd.phase = "result";
          kd.lastVerdict = "wrong";
          this.cue("1_KhoiDong/wrong");
          this.pushTranscript({
            at: now,
            round: "khoiDong",
            roundLabel: ROUND_LABELS.khoiDong,
            segmentLabel: `${seg.label} • Câu ${kd.qIdx + 1}`,
            entryKind: "question",
            questionText: kd.current?.q,
            correctAnswer: kd.current?.a,
            subject: kd.current?.subject,
            kdZone: kd.current?.kdZone,
            vdZone: kd.current?.vdZone,
            mediaUrl: kd.current?.media,
            selectedPoints: rs.correctPoints,
            verdict: "wrong",
            scoreChanges: {},
          });
          return OK;
        }
        let penalty = rs.wrongPenalty;
        let lockout = rs.lockoutOnWrong;
        if (this.ruleset.id === "O22") {
          const q = st.o22Quarter ?? 1;
          if (q === 3) {
            penalty = 5;
            lockout = false;
          } else {
            penalty = 0;
            lockout = true;
          }
        }
        if (penalty) this.addScore(who, -penalty);
        if (lockout && !kd.nextLockedSeats.includes(who)) kd.nextLockedSeats.push(who);
        kd.lockedSeats.push(who);
        pauseTimer(kd.timer, now);
        kd.buzzedSeat = null;
        kd.buzzOpen = false;
        kd.buzzUnlockAt = undefined;
        kd.noBuzzWrongUnlockAt = undefined;
        kd.phase = "result";
        kd.lastVerdict = "wrong";
        this.cue("1_KhoiDong/wrong");
        const buzzers: TranscriptBuzzerItem[] = kd.lockedSeats.map((sId, idx) => ({
          order: idx + 1,
          seat: sId,
          name: this.seatName(sId),
          verdict: "wrong",
        }));
        const changes: Record<number, number> = {};
        if (penalty) {
          kd.lockedSeats.forEach((sId) => (changes[sId] = -penalty));
        }
        this.pushTranscript({
          at: now,
          round: "khoiDong",
          roundLabel: ROUND_LABELS.khoiDong,
          segmentLabel: `${seg.label} • Câu ${kd.qIdx + 1}`,
          entryKind: "question",
          questionText: kd.current?.q,
          correctAnswer: kd.current?.a,
          subject: kd.current?.subject,
          kdZone: kd.current?.kdZone,
          vdZone: kd.current?.vdZone,
          mediaUrl: kd.current?.media,
          actorSeat: who,
          actorName: this.seatName(who),
          selectedPoints: rs.correctPoints,
          buzzerEvents: buzzers,
          verdict: "wrong",
          scoreChanges: changes,
        });
        return OK;
      }
      case "kd:skip": {
        if (kd.phase !== "question") return fail("Chưa mở câu hỏi");
        pauseTimer(kd.timer, now);
        kd.buzzOpen = false;
        kd.buzzUnlockAt = undefined;
        kd.noBuzzWrongUnlockAt = undefined;
        kd.phase = "result";
        kd.lastVerdict = null;
        this.pushTranscript({
          at: now,
          round: "khoiDong",
          roundLabel: ROUND_LABELS.khoiDong,
          segmentLabel: `${seg.label} • Câu ${kd.qIdx + 1}`,
          entryKind: "question",
          questionText: kd.current?.q,
          correctAnswer: kd.current?.a,
          subject: kd.current?.subject,
          kdZone: kd.current?.kdZone,
          vdZone: kd.current?.vdZone,
          mediaUrl: kd.current?.media,
          actorSeat: isSolo ? (seg.seat as number) : undefined,
          actorName: isSolo ? this.seatName(seg.seat as number) : undefined,
          selectedPoints: rs.correctPoints,
          verdict: "skipped",
        });
        return OK;
      }
      case "kd:buzzer": {
        if (isSolo) return fail("Khởi động riêng không có chuông");
        kd.buzzUnlockAt = undefined;
        kd.buzzOpen = !kd.buzzOpen;
        kd.buzzedSeat = null;
        return OK;
      }
    }
    return fail("Hành động Khởi Động không hợp lệ");
  }

  // ───────────────────────── VCNV ─────────────────────────
  private vcnvAction(type: string, a: HostAction, now: number): ActionResult {
    const st = this.state;
    const v = st.vcnv;
    if (st.currentRound !== "vcnv" || !v) return fail("Không ở vòng VCNV");
    const rs = this.ruleset;
    const row = v.currentRow;

    switch (type) {
      case "vcnv:showGrid": {
        v.phase = "grid";
        this.cue("2_VuotChuongNgaiVat/show_row");
        return OK;
      }
      case "vcnv:openQuestion": {
        if (row < 0) return fail("Chưa chọn hàng");
        v.phase = "question";
        this.cue("2_VuotChuongNgaiVat/open_question");
        return OK;
      }
      case "vcnv:blank": {
        // Ô trống: phát âm thanh ô trống, không đọc câu hỏi, không đổi phase, không đổi camera sang 3D
        this.cue("6_NhacKhac/blank_space");
        return OK;
      }
      case "vcnv:waitingAnswer": {
        // Nền chờ đáp án (W): hiển thị background bảng đáp án (nền chờ trước khi hiện đáp án), không văng về trường quay 3D
        v.phase = "waitingAnswer";
        v.answersRevealed = false;
        return OK;
      }
      case "vcnv:hideAnswer": {
        v.answersRevealed = false;
        v.phase = "question";
        return OK;
      }
      case "vcnv:revealRowText": {
        const i = a.row != null ? Number(a.row) : row;
        if (!(i >= 0 && i <= 4)) return fail("Chưa chọn hàng");
        if (i === 4) v.centerOpened = true;
        else if (v.rows[i]) v.rows[i].opened = true;
        return OK;
      }
      case "vcnv:selectRow": {
        const i = Number(a.row);
        if (!(i >= 0 && i <= 4)) return fail("Hàng không hợp lệ");
        if (i === 4) {
          if (v.centerOpened) return fail("Ô trung tâm đã mở");
          if (!v.centerQuestion) {
            v.centerQuestion = { q: "Câu hỏi gợi ý cuối cùng tại ô trung tâm", a: v.keyword };
          }
          v.currentRow = 4;
          v.phase = "selecting";
          resetTimer(v.timer, rs.vcnv.rowTimerMs);
          v.answers = {};
          v.answersRevealed = false;
          v.revealedCorrectAnswer = false;
          v.centerWrong = false;
          this.cue("2_VuotChuongNgaiVat/choose_row");
          return OK;
        }
        if (v.rows[i].opened) return fail("Hàng này đã mở");
        v.currentRow = i;
        v.phase = "selecting";
        resetTimer(v.timer, rs.vcnv.rowTimerMs);
        v.answers = {};
        v.answersRevealed = false;
        v.revealedCorrectAnswer = false;
        v.rows[i].wrong = false;
        this.cue("2_VuotChuongNgaiVat/choose_row");
        return OK;
      }
      case "vcnv:timer": {
        if (row < 0) return fail("Chưa chọn hàng");
        if (timerRunning(v.timer)) pauseTimer(v.timer, now);
        else {
          v.phase = "question";
          startTimer(v.timer, now);
          this.cue("2_VuotChuongNgaiVat/15s_tick", "bgm");
        }
        return OK;
      }
      case "vcnv:reveal": {
        if (row < 0) return fail("Chưa chọn hàng");
        pauseTimer(v.timer, now);
        v.answersRevealed = true;
        v.revealedCorrectAnswer = false;
        v.phase = "answers";
        st.studioCameraManual = false;
        this.cue("2_VuotChuongNgaiVat/reveal_answers");
        return OK;
      }
      case "vcnv:revealCorrect": {
        v.revealedCorrectAnswer = true;
        return OK;
      }
      case "vcnv:correct": {
        if (row < 0) return fail("Chưa chọn hàng");
        const curRowDef = row === 4 ? v.centerQuestion : v.rows[row];
        const rawAnswerText = row === 4 ? (v.centerQuestion?.a ?? v.keyword) : (v.rows[row]?.answer ?? "");
        const { primary, validNorms } = getVcnvValidAnswerSet(rawAnswerText, curRowDef?.acceptedAnswers);
        const answerText = primary;
        const qText = row === 4 ? (v.centerQuestion?.q ?? "Câu hỏi số 5 (Ô trung tâm)") : (v.rows[row]?.hint ?? "");
        const given = Array.isArray(a.seatIds)
          ? (a.seatIds as number[]).map(Number)
          : this.activeSeatIds.filter(
              (id) =>
                !v.eliminatedSeats.includes(id) &&
                validNorms.has(normalizeAnswer(v.answers[id]?.text ?? ""))
            );
        const awarded = given.filter((id) => this.seat(id));
        const changes: Record<number, number> = {};
        awarded.forEach((id) => {
          this.addScore(id, rs.vcnv.rowPoints);
          changes[id] = rs.vcnv.rowPoints;
        });
        v.rowResults[row] = awarded;
        // Host bấm "Cộng điểm hàng ngang" = xác nhận hàng đã giải xong:
        // Mở chữ đáp án hàng ngang nhưng KHÔNG mở miếng ghép hình ảnh ngay (chờ Host bấm "Lật mở miếng ghép")
        if (row === 4) {
          v.centerOpened = true;
          v.centerWrong = false;
        } else if (v.rows[row]) {
          if (!v.rows[row].opened) {
            v.rows[row].opened = true;
            v.openedCount += 1;
          }
          v.rows[row].wrong = false;
          v.rows[row].used = true;
        }
        this.recordOpenedQuestion(qText);
        const orderedSeats = [...this.activeSeatIds].sort((x, y) => {
          const ax = v.answers[x];
          const ay = v.answers[y];
          const hasX = Boolean(ax?.text?.trim());
          const hasY = Boolean(ay?.text?.trim());
          if (hasX !== hasY) return hasX ? -1 : 1;
          return (ax?.ms ?? ax?.at ?? 0) - (ay?.ms ?? ay?.at ?? 0) || x - y;
        });
        const subs: TranscriptSubmissionItem[] = orderedSeats.map((sId, idx) => {
          const rec = v.answers[sId];
          const isOk = awarded.includes(sId);
          return {
            rank: idx + 1,
            seat: sId,
            name: this.seatName(sId),
            finalAnswer: rec?.text ?? "",
            finalMs: rec?.ms ?? 0,
            previousAnswer: rec?.previousText,
            previousMs: rec?.previousMs,
            allAttempts: rec?.history ? [...rec.history] : rec?.text ? [{ text: rec.text, ms: rec.ms ?? 0, at: rec.at }] : [],
            isCorrect: isOk,
            pointsAwarded: isOk ? rs.vcnv.rowPoints : 0,
            noAnswer: !rec || !rec.text.trim(),
          };
        });
        this.pushTranscript({
          at: now,
          round: "vcnv",
          roundLabel: ROUND_LABELS.vcnv,
          segmentLabel: row === 4 ? "Câu hỏi số 5 (Ô trung tâm)" : `Hàng ngang số ${row + 1}`,
          entryKind: "question",
          questionText: qText,
          correctAnswer: answerText,
          selectedPoints: rs.vcnv.rowPoints,
          submissions: subs,
          verdict: "correct",
          scoreChanges: changes,
        });
        v.phase = "grid";
        v.answersRevealed = false;
        pauseTimer(v.timer, now);
        this.cue("2_VuotChuongNgaiVat/correct");
        return OK;
      }
      case "vcnv:wrong": {
        if (row < 0) return fail("Chưa chọn hàng");
        const answerText = row === 4 ? (v.centerQuestion?.a ?? v.keyword) : (v.rows[row]?.answer ?? "");
        const qText = row === 4 ? (v.centerQuestion?.q ?? "Câu hỏi số 5 (Ô trung tâm)") : (v.rows[row]?.hint ?? "");
        if (row === 4) v.centerWrong = true;
        else if (v.rows[row]) {
          v.rows[row].wrong = true;
          v.rows[row].used = true;
        }
        this.recordOpenedQuestion(qText);
        v.rowResults[row] = [];
        const orderedSeats = [...this.activeSeatIds].sort((x, y) => {
          const ax = v.answers[x];
          const ay = v.answers[y];
          const hasX = Boolean(ax?.text?.trim());
          const hasY = Boolean(ay?.text?.trim());
          if (hasX !== hasY) return hasX ? -1 : 1;
          return (ax?.ms ?? ax?.at ?? 0) - (ay?.ms ?? ay?.at ?? 0) || x - y;
        });
        const subs: TranscriptSubmissionItem[] = orderedSeats.map((sId, idx) => {
          const rec = v.answers[sId];
          return {
            rank: idx + 1,
            seat: sId,
            name: this.seatName(sId),
            finalAnswer: rec?.text ?? "",
            finalMs: rec?.ms ?? 0,
            previousAnswer: rec?.previousText,
            previousMs: rec?.previousMs,
            allAttempts: rec?.history ? [...rec.history] : rec?.text ? [{ text: rec.text, ms: rec.ms ?? 0, at: rec.at }] : [],
            isCorrect: false,
            pointsAwarded: 0,
            noAnswer: !rec || !rec.text.trim(),
          };
        });
        this.pushTranscript({
          at: now,
          round: "vcnv",
          roundLabel: ROUND_LABELS.vcnv,
          segmentLabel: row === 4 ? "Câu hỏi số 5 (Ô trung tâm)" : `Hàng ngang số ${row + 1}`,
          entryKind: "question",
          questionText: qText,
          correctAnswer: answerText,
          selectedPoints: rs.vcnv.rowPoints,
          submissions: subs,
          verdict: "wrong",
          scoreChanges: {},
        });
        v.phase = "grid";
        v.answersRevealed = false;
        pauseTimer(v.timer, now);
        this.cue("2_VuotChuongNgaiVat/wrong");
        return OK;
      }
      case "vcnv:revealTile": {
        const i = a.row != null ? Number(a.row) : row;
        if (i >= 0 && i <= 4) {
          if (i === 4) {
            v.centerOpened = true;
            v.piecesRevealed[4] = true;
          } else {
            if (!v.rows[i].opened) {
              v.rows[i].opened = true;
              v.openedCount += 1;
            }
            v.piecesRevealed[i] = true;
          }
        }
        v.currentRow = -1;
        v.phase = "grid";
        v.answers = {};
        v.answersRevealed = false;
        this.cue("2_VuotChuongNgaiVat/reveal_puzzle_piece");
        return OK;
      }
      case "vcnv:correctCNV": {
        const seat = a.seat != null ? Number(a.seat) : (v.bells[0]?.seat ?? -1);
        if (!this.seat(seat)) return fail("Chọn thí sinh");
        if (!v.bells.some((b) => b.seat === seat)) {
          return fail("Chỉ được chấm CNV cho thí sinh đang có tín hiệu chuông!");
        }
        v.eliminatedSeats = v.eliminatedSeats.filter((id) => id !== seat);
        const pts = cnvPointsFor(rs, v.openedCount, Boolean(v.centerOpened));
        this.addScore(seat, pts);
        v.solvedBy = seat;
        v.rows.forEach((r, i) => {
          r.opened = true;
          v.piecesRevealed[i] = true;
        });
        v.centerOpened = true;
        v.piecesRevealed[4] = true;
        v.phase = "done";
        v.currentRow = 4;
        pauseTimer(v.timer, now);
        const buzzers: TranscriptBuzzerItem[] = v.bells.map((b, idx) => ({
          order: idx + 1,
          seat: b.seat,
          name: this.seatName(b.seat),
          note: b.before ? "Bấm trước khi lật đáp án hàng" : "Bấm sau khi lật đáp án hàng",
          verdict: b.seat === seat ? "correct" : undefined,
        }));
        if (!buzzers.some((b) => b.seat === seat)) {
          buzzers.push({ order: buzzers.length + 1, seat, name: this.seatName(seat), verdict: "correct" });
        }
        v.bells = [];
        this.pushTranscript({
          at: now,
          round: "vcnv",
          roundLabel: ROUND_LABELS.vcnv,
          segmentLabel: `Giải Chướng Ngại Vật (đã mở ${v.openedCount} hàng${v.centerOpened ? " + ô trung tâm" : ""})`,
          entryKind: "cnv_bell",
          questionText: "Từ khóa Chướng ngại vật",
          correctAnswer: v.keyword,
          actorSeat: seat,
          actorName: this.seatName(seat),
          selectedPoints: pts,
          buzzerEvents: buzzers,
          verdict: "correct",
          scoreChanges: { [seat]: pts },
        });
        this.cue("2_VuotChuongNgaiVat/cnv_correct");
        return OK;
      }
      case "vcnv:wrongCNV": {
        const judgeTime = now;
        (v as any).lastJudgedWrongAt = judgeTime;

        if (!v.bells || v.bells.length === 0) {
          return fail("Không có thí sinh nào có tín hiệu chuông!");
        }

        const seat = a.seat != null ? Number(a.seat) : (v.bells[0]?.seat ?? -1);
        if (!this.seat(seat)) return fail("Chọn thí sinh");
        if (!v.bells.some((b) => b.seat === seat)) {
          return fail("Chỉ được chấm CNV cho thí sinh đang có tín hiệu chuông!");
        }

        // Đánh dấu chuông đã bị host chấm sai (không đưa ngay vào eliminatedSeats, không tự tắt chuông)
        const bell = v.bells.find((b) => b.seat === seat);
        if (bell) {
          (bell as any).judgedWrong = true;
          (bell as any).judgedAt = judgeTime;
        }

        const buzzers: TranscriptBuzzerItem[] = [
          { order: 1, seat, name: this.seatName(seat), verdict: "wrong" }
        ];

        this.pushTranscript({
          at: now,
          round: "vcnv",
          roundLabel: ROUND_LABELS.vcnv,
          segmentLabel: "Bấm chuông giải Chướng Ngại Vật (Sai)",
          entryKind: "cnv_bell",
          questionText: "Từ khóa Chướng ngại vật",
          correctAnswer: v.keyword,
          actorSeat: seat,
          actorName: this.seatName(seat),
          buzzerEvents: buzzers,
          verdict: "wrong",
          note: `${this.seatName(seat)} trả lời sai CNV.`,
        });
        this.cue("2_VuotChuongNgaiVat/cnv_wrong");
        return OK;
      }
      case "vcnv:toggleLockSeat": {
        const seat = Number(a.seat);
        if (!this.seat(seat)) return fail("Chọn thí sinh");
        if (v.eliminatedSeats.includes(seat)) {
          v.eliminatedSeats = v.eliminatedSeats.filter((id) => id !== seat);
          v.bells = v.bells.filter((b) => b.seat !== seat);
          this.logMsg(`🔓 Đã mở lại quyền chơi VCNV cho ${this.seatName(seat)}`);
        } else {
          v.eliminatedSeats.push(seat);
          this.logMsg(`🔒 Đã khóa quyền chơi VCNV của ${this.seatName(seat)}`);
        }
        return OK;
      }
      case "vcnv:unlockAllSeats": {
        v.eliminatedSeats = [];
        v.bells = [];
        this.logMsg("🔓 Đã mở lại quyền chơi VCNV cho tất cả thí sinh");
        return OK;
      }
      case "vcnv:revealAll": {
        v.rows.forEach((r, i) => {
          r.opened = true;
          v.piecesRevealed[i] = true;
        });
        v.centerOpened = true;
        v.piecesRevealed[4] = true;
        v.bells = [];
        v.phase = "done";
        this.cue("2_VuotChuongNgaiVat/cnv_correct");
        return OK;
      }
      case "vcnv:revealRowsOnly": {
        v.rows.forEach((r) => {
          r.opened = true;
        });
        v.centerOpened = true;
        return OK;
      }
      case "vcnv:revealPiecesOnly": {
        v.piecesRevealed = [true, true, true, true, true];
        return OK;
      }
      case "vcnv:clearBells": {
        // Các tín hiệu không thể tắt khi bạn chưa chốt đúng hay sai
        if (!v.lastJudgedWrongAt && !v.bells?.some((b) => b.judgedWrong) && !a.force) {
          return fail("Chưa thể tắt tín hiệu chuông khi chưa chốt đúng hay sai cho thí sinh!");
        }
        // Khi nhấn tắt tín hiệu thì các tín hiệu chuông này mới chính thức đưa vào v.eliminatedSeats
        const bellsToClear = v.bells || [];
        for (const b of bellsToClear) {
          if (!v.eliminatedSeats.includes(b.seat)) {
            v.eliminatedSeats.push(b.seat);
          }
        }
        v.bells = [];
        this.logMsg("🔕 Đã tắt toàn bộ tín hiệu chuông và chốt loại quyền chơi VCNV cho các thí sinh đã bấm");
        return OK;
      }
      case "vcnv:dismissBell": {
        const seat = Number(a.seat);
        if (!this.seat(seat)) return fail("Chọn thí sinh");
        if (!v.eliminatedSeats.includes(seat)) {
          v.eliminatedSeats.push(seat);
        }
        v.bells = v.bells.filter((b) => b.seat !== seat);
        this.logMsg(`🔕 Đã tắt tín hiệu chuông và loại quyền chơi VCNV của ${this.seatName(seat)}`);
        return OK;
      }
      case "vcnv:end":
        this.finishRound(now);
        return OK;
    }
    return fail("Hành động VCNV không hợp lệ");
  }

  // ───────────────────────── TĂNG TỐC ─────────────────────────
  private ttAction(type: string, a: HostAction, now: number): ActionResult {
    const st = this.state;
    const tt = st.tangToc;
    if (st.currentRound !== "tangToc" || !tt) return fail("Không ở vòng Tăng Tốc");
    const rs = this.ruleset.tangToc;

    switch (type) {
      case "tt:selectQuestion": {
        const idx = Number(a.qIdx);
        if (idx >= 0 && idx < tt.questions.length) {
          tt.qIdx = idx;
          tt.phase = "idle";
          tt.submissions = {};
          tt.ranking = [];
          tt.correctAnswer = undefined;
          tt.timer = mkTimer(rs.timers[Math.min(tt.qIdx, rs.timers.length - 1)]);
          this.cue("", "stop");
          return OK;
        }
        return fail("Câu không hợp lệ");
      }
      case "tt:blank": {
        // Nền chờ ĐA (W): chuyển camera sang toàn cảnh thí sinh (CAM 10), hiển thị nền chờ mờ (tách biệt âm thanh ô trống)
        (tt as any).phase = "waitingAnswer";
        st.studioCamera = 10;
        st.studioCameraManual = true;
        return OK;
      }
      case "tt:revealAndGrade": {
        const res = this.ttAction("tt:reveal", a, now);
        if (!res.ok) return res;
        return this.ttAction("tt:grade", a, now);
      }
      case "tt:next": {
        tt.qIdx += 1;
        if (tt.qIdx >= tt.questions.length) {
          this.finishRound(now);
          return OK;
        }
        tt.phase = "idle";
        tt.submissions = {};
        tt.ranking = [];
        tt.correctAnswer = undefined;
        tt.revealedCorrectAnswer = false;
        tt.timer = mkTimer(rs.timers[Math.min(tt.qIdx, rs.timers.length - 1)]);
        this.cue("", "stop");
        return OK;
      }
      case "tt:show": {
        if (tt.qIdx < 0) return fail("Hãy bấm Câu tiếp theo trước");
        const q = tt.questions[tt.qIdx];
        if (q) {
          q.used = true;
          this.recordOpenedQuestion(q.q || q.answer);
        }
        tt.phase = "question";
        tt.revealedCorrectAnswer = false;
        this.cue("3_TangToc/show_question");
        return OK;
      }
      case "tt:swapBackup": {
        if (tt.qIdx < 0 || tt.qIdx >= tt.questions.length) return fail("Chưa chọn câu hỏi để thay thế");
        const backups = tt.backupQuestions || [];
        const backupQ = backups[tt.qIdx] || backups[0];
        if (!backupQ) return fail("Không có câu hỏi dự phòng khả dụng");
        tt.questions[tt.qIdx] = { ...backupQ, used: true };
        tt.isBackupQuestion = true;
        tt.phase = "question";
        tt.submissions = {};
        tt.ranking = [];
        tt.correctAnswer = undefined;
        tt.revealedCorrectAnswer = false;
        tt.timer = mkTimer(rs.timers[Math.min(tt.qIdx, rs.timers.length - 1)]);
        this.cue("3_TangToc/show_question");
        this.logMsg(`Host đã tráo câu hỏi dự phòng thay thế cho câu Tăng tốc ${tt.qIdx + 1}`);
        return OK;
      }
      case "tt:timer": {
        if (tt.phase !== "question") return fail("Hãy hiện câu hỏi trước");
        if (timerRunning(tt.timer)) pauseTimer(tt.timer, now);
        else {
          if (st.showStageGraphics) st.showStageGraphics = false;
          startTimer(tt.timer, now);
          const s = Math.round(tt.timer.totalMs / 1000);
          this.cue(`3_TangToc/tick_${s}s`, "bgm");
        }
        return OK;
      }
      case "tt:reveal": {
        if (tt.qIdx < 0) return fail("Chưa có câu hỏi");
        pauseTimer(tt.timer, now);
        st.studioCameraManual = false;
        const q = tt.questions[tt.qIdx];
        tt.ranking = this.activeSeatIds
          .map((id) => {
            const sub = tt.submissions[id];
            return {
              seat: id,
              answer: sub?.answer ?? "",
              ms: sub?.ms ?? 0,
              previousAnswer: sub?.previousAnswer,
              previousMs: sub?.previousMs,
              history: sub?.history ? [...sub.history] : [],
              noAnswer: !sub || !sub.answer.trim(),
            };
          })
          .sort((x, y) => {
            if (x.noAnswer !== y.noAnswer) return x.noAnswer ? 1 : -1;
            if (x.noAnswer && y.noAnswer) return x.seat - y.seat;
            return x.ms - y.ms || x.seat - y.seat;
          });
        tt.correctAnswer = q?.answer;
        tt.revealedCorrectAnswer = false;
        tt.phase = "ranking";
        this.cue("3_TangToc/show_answer");
        return OK;
      }
      case "tt:revealCorrect": {
        tt.revealedCorrectAnswer = true;
        return OK;
      }
      case "tt:grade": {
        if (tt.phase !== "ranking" && tt.phase !== "graded") return fail("Hãy lật đáp án trước");
        if (tt.phase === "graded") return fail("Câu này đã chấm");
        let correct: number[];
        if (Array.isArray(a.correctSeats)) correct = (a.correctSeats as number[]).map(Number);
        else {
          const rawTarget = tt.correctAnswer ?? "";
          const targetCandidates = new Set<string>();
          rawTarget
            .split(/[/|()]/)
            .map((s) => normalizeAnswer(s))
            .filter(Boolean)
            .forEach((s) => {
              targetCandidates.add(s);
              targetCandidates.add(s.replace(/\s+/g, ""));
              targetCandidates.add(s.replace(/[-]/g, ""));
            });

          correct = tt.ranking
            .filter((r) => {
              if (r.noAnswer) return false;
              const ansNorm = normalizeAnswer(r.answer);
              const ansNoSpace = ansNorm.replace(/\s+/g, "");
              const ansNoHyphen = ansNorm.replace(/[-]/g, "");
              return (
                targetCandidates.has(ansNorm) ||
                targetCandidates.has(ansNoSpace) ||
                targetCandidates.has(ansNoHyphen)
              );
            })
            .map((r) => r.seat);
        }
        const tierTable = tangTocTierPoints(this.activeSeatIds.length);
        const valid = tt.ranking.filter((r) => correct.includes(r.seat) && !r.noAnswer);
        const times = Array.from(new Set(valid.map((r) => r.ms)));
        const scoreChanges: Record<number, number> = {};
        tt.ranking.forEach((r) => {
          if (r.noAnswer) return;
          r.wrong = !correct.includes(r.seat);
          if (!r.wrong) {
            const tier = times.indexOf(r.ms);
            const pts = tierTable[tier] ?? 0;
            r.points = pts;
            if (pts) {
              this.addScore(r.seat, pts);
              scoreChanges[r.seat] = pts;
            }
          }
        });
        const q = tt.questions[tt.qIdx];
        const submissions: TranscriptSubmissionItem[] = tt.ranking.map((r, idx) => ({
          rank: r.noAnswer ? 0 : idx + 1,
          seat: r.seat,
          name: this.seatName(r.seat),
          finalAnswer: r.answer,
          finalMs: r.noAnswer ? undefined : r.ms,
          previousAnswer: r.previousAnswer,
          previousMs: r.previousMs,
          allAttempts: r.history ?? [],
          correct: r.noAnswer ? false : !r.wrong,
          pointsAwarded: r.points ?? 0,
          noAnswer: Boolean(r.noAnswer),
        }));
        this.pushTranscript({
          at: now,
          round: "tangToc",
          roundLabel: ROUND_LABELS.tangToc,
          segmentLabel: `Tăng Tốc — Câu ${tt.qIdx + 1}/${tt.questions.length}`,
          questionNumber: tt.qIdx + 1,
          entryKind: "question",
          questionText: q?.q || `Câu hỏi Tăng Tốc số ${tt.qIdx + 1}`,
          correctAnswer: q?.answer ?? tt.correctAnswer ?? "",
          media: q?.media,
          verdict: valid.length > 0 ? "correct" : "wrong",
          submissions,
          scoreChanges,
        });
        tt.phase = "graded";
        this.cue(valid.length ? "3_TangToc/correct" : "3_TangToc/wrong");
        return OK;
      }
      case "tt:end":
        this.finishRound(now);
        return OK;
    }
    return fail("Hành động Tăng Tốc không hợp lệ");
  }

  // ───────────────────────── VỀ ĐÍCH ─────────────────────────
  private vdSeat(vd: VeDichState): number {
    return vd.order[vd.turnIdx];
  }

  private allocatePackage(vd: VeDichState, points: number[]) {
    const qs = this.config.questionSet;
    const norm = (s?: string) => normKey(s);
    const useBalanced = this.config.balancedRandom !== false && qs.balancedRandom !== false;
    if (useBalanced) {
      const usedSet = new Set<string>(vd.usedKeys ?? []);

      // Ensure zero duplicates across ALL rounds (Khởi Động, VCNV, Tăng Tốc, and previous Về Đích turns)
      if (this.state.khoiDong) {
        const kd = this.state.khoiDong;
        if (kd.seatQueues) {
          for (const qList of Object.values(kd.seatQueues)) {
            for (const item of qList) {
              if (item?.q) {
                usedSet.add(item.q);
                usedSet.add(norm(item.q));
                if (item.a) usedSet.add(`ans:${norm(item.a)}`);
              }
            }
          }
        }
        if (kd.sharedQueue) {
          for (const item of kd.sharedQueue) {
            if (item?.q) {
              usedSet.add(item.q);
              usedSet.add(norm(item.q));
              if (item.a) usedSet.add(`ans:${norm(item.a)}`);
            }
          }
        }
      }
      if (qs.vcnv) {
        for (const row of qs.vcnv.rows ?? []) {
          if (row.hint) { usedSet.add(row.hint); usedSet.add(norm(row.hint)); }
          if (row.answer) usedSet.add(`ans:${norm(row.answer)}`);
        }
        if (qs.vcnv.centerQuestion) {
          usedSet.add(qs.vcnv.centerQuestion.q);
          usedSet.add(norm(qs.vcnv.centerQuestion.q));
          usedSet.add(`ans:${norm(qs.vcnv.centerQuestion.a)}`);
        }
      }
      for (const t of qs.tangToc ?? []) {
        if (t.q) { usedSet.add(t.q); usedSet.add(norm(t.q)); }
        const ans = t.answer || (t as any).a;
        if (ans) usedSet.add(`ans:${norm(ans)}`);
      }

      if (this.state.openedQuestionKeys) {
        for (const k of this.state.openedQuestionKeys) {
          usedSet.add(k);
          usedSet.add(norm(k));
        }
      }
      // Đáp án của mọi câu đã mở ở các vòng trước cũng không được lặp lại trong gói Về Đích
      const vdGuard = this.duplicateGuard();
      for (const a of vdGuard.openedA) usedSet.add(`ans:${a}`);
      // Gói đã bốc cho các thí sinh khác trong Về Đích (chưa mở nhưng đã được chiếm chỗ)
      for (const pkg of Object.values(vd.packages ?? {})) {
        for (const p of pkg ?? []) {
          if (p?.q?.q) {
            usedSet.add(p.q.q);
            usedSet.add(norm(p.q.q));
            if (p.q.a) usedSet.add(`ans:${norm(p.q.a)}`);
          }
        }
      }

      const pkg = pickBalancedVeDichPackage(qs.veDich, points, usedSet, vd.turnIdx);
      vd.usedKeys = [...usedSet];
      return pkg;
    }
    const pool = qs.veDich;
    const fallbackUsedSet = new Set<string>([
      ...(this.state.openedQuestionKeys ?? []).map((k) => norm(k)),
      ...(this.state.openedQuestionKeys ?? []),
      ...(vd.usedKeys ?? []),
    ]);
    return points.map((p) => {
      const key = String(p);
      const list = pool[key] ?? [];
      let ptr = vd.pointers[key] ?? 0;
      while (ptr < list.length) {
        const item = list[ptr];
        const isUsed = item?.q && (fallbackUsedSet.has(item.q) || fallbackUsedSet.has(norm(item.q)));
        if (!isUsed) break;
        ptr++;
      }
      const raw: VeDichQuestion = list[ptr] ?? { q: "Câu hỏi dự phòng", a: "Đáp án", type: "theory" };
      const q = tagQAWithAI(raw, false);
      vd.pointers[key] = ptr + 1;
      fallbackUsedSet.add(q.q);
      fallbackUsedSet.add(norm(q.q));
      return { points: p, q };
    });
  }

  /** Called for both host and player package picks. */
  setPackage(points: number[], now: number): ActionResult {
    const st = this.state;
    const vd = st.veDich;
    if (st.currentRound !== "veDich" || !vd) return fail("Không ở vòng Về Đích");
    if (vd.phase !== "choosing") return fail("Chưa đến lúc chọn gói");
    const rs = this.ruleset.veDich;
    let resolvedPoints = points;
    if (rs.selectionMode === "presetPackages" && rs.presetPackages) {
      if (points.length === 1 && rs.presetPackages[String(points[0])]) {
        resolvedPoints = rs.presetPackages[String(points[0])];
      } else {
        const matched = Object.values(rs.presetPackages).find(
          (preset) => preset.length === points.length && preset.every((v, i) => v === points[i])
        );
        if (!matched) {
          const validKeys = Object.keys(rs.presetPackages).join("/");
          return fail(`Mùa ${this.ruleset.id} yêu cầu chọn 1 trong các gói cố định: ${validKeys} điểm`);
        }
        resolvedPoints = matched;
      }
    } else {
      let qPerSeat = rs.questionsPerSeat;
      let opts = rs.pointOptions;
      if (this.ruleset.id === "O22") {
        const q = st.o22Quarter ?? 1;
        if (q === 1) {
          qPerSeat = 2;
          opts = [20, 40];
        } else {
          qPerSeat = 3;
          opts = [20, 30];
        }
      }
      if (resolvedPoints.length !== qPerSeat || resolvedPoints.some((p) => !opts.includes(p)))
        return fail(`Gói phải gồm ${qPerSeat} câu với mức điểm ${opts.join("/")}`);
    }
    const ownerSeat = this.vdSeat(vd);
    vd.packages[ownerSeat] = this.allocatePackage(vd, resolvedPoints);
    vd.qIdx = -1;
    vd.current = null;
    vd.phase = "packageReady";
    st.vdPackageTimer = null;
    const totalPkg = resolvedPoints.reduce((s, p) => s + p, 0);
    this.pushTranscript({
      at: now,
      round: "veDich",
      roundLabel: ROUND_LABELS.veDich,
      segmentLabel: `${this.seatName(ownerSeat)} chọn gói Về Đích`,
      entryKind: "package_select",
      actorSeat: ownerSeat,
      actorName: this.seatName(ownerSeat),
      packagePoints: [...resolvedPoints],
      packageLabel: `Gói ${totalPkg}đ (${resolvedPoints.join(" - ")})`,
      verdict: "info",
      note: `${this.seatName(ownerSeat)} chọn gói câu hỏi ${resolvedPoints.join(" - ")} điểm (Tổng ${totalPkg}đ).`,
    });
    this.cue("4_VeDich/open_question");
    this.touch(now);
    return OK;
  }

  private vdAction(type: string, a: HostAction, now: number): ActionResult {
    const st = this.state;
    const vd = st.veDich;
    if (st.currentRound !== "veDich" || !vd) return fail("Không ở vòng Về Đích");
    const rs = this.ruleset.veDich;
    const cur = vd.current;
    const owner = this.vdSeat(vd);

    switch (type) {
      case "vd:showPackageGraphic": {
        vd.phase = "choosing";
        this.cue("4_VeDich/choose_package");
        return OK;
      }
      case "vd:confirmPackage": {
        const pts = ((a.points as number[]) ?? []).map(Number);
        return this.setPackage(pts, now);
      }
      case "vd:onStage": {
        vd.onStage = true;
        st.studioCamera = 1;
        st.studioCameraManual = false;
        this.cue("4_VeDich/on_stage");
        return OK;
      }
      case "vd:finishTurn": {
        vd.onStage = false;
        vd.phase = "seatDone";
        vd.hopeStarActive = false;
        vd.deductedOnSteal = false;
        vd.lastVerdict = null;
        vd.steal = null;
        this.cue("4_VeDich/finish_turn");
        return OK;
      }
      case "vd:blank": {
        vd.lastVerdict = null;
        if (vd.steal) vd.steal.buzzedSeat = null;
        this.cue("6_NhacKhac/blank_space");
        return OK;
      }
      case "vd:practiceTimer": {
        if (vd.phase !== "thinking") return fail("Không có câu hỏi đang chờ");
        if (timerRunning(vd.timer)) pauseTimer(vd.timer, now);
        else {
          startTimer(vd.timer, now);
          const s = Math.round(vd.timer.totalMs / 1000);
          this.cue(`4_VeDich/${s}s_practice`, "bgm");
        }
        return OK;
      }
      case "vd:setSeat": {
        const idx = vd.order.indexOf(Number(a.seat));
        if (idx < 0) return fail("Thí sinh không hợp lệ");
        vd.turnIdx = idx;
        vd.onStage = false;
        vd.phase = vd.packages[vd.order[idx]] ? "packageReady" : "idle";
        vd.qIdx = -1;
        vd.current = null;
        vd.hopeStarActive = false;
        vd.deductedOnSteal = false;
        vd.lastVerdict = null;
        vd.steal = null;
        return OK;
      }
      case "vd:choosePackage":
        return this.setPackage(((a.points as number[]) ?? []).map(Number), now);
      case "vd:startQuestion": {
        const pkg = vd.packages[owner];
        if (!pkg) return fail("Thí sinh chưa chọn gói");
        if (vd.phase === "thinking" || vd.phase === "stealing") return fail("Câu hỏi đang diễn ra");
        vd.qIdx += 1;
        if (vd.qIdx >= pkg.length) {
          vd.phase = "seatDone";
          vd.current = null;
          vd.steal = null;
          this.cue("4_VeDich/finish_turn");
          return OK;
        }
        vd.current = pkg[vd.qIdx];
        if (vd.current?.q) {
          vd.current.q.used = true;
          this.recordOpenedQuestion(vd.current.q.q);
        }
        vd.phase = "thinking";
        let thinkDuration = rs.thinkMs[String(vd.current.points)] ?? 15000;
        // USER REQUIREMENT: Thời gian trả lời các câu sắp xếp/nối cột sẽ có thời gian là 3x số dữ kiện (10đ), 4x (20đ), 6x (30đ), 10x (40đ)
        const qType = (vd.current.q as any)?.type || (vd.current.q as any)?.questionType;
        if (qType === "arrange" || qType === "match") {
          const itemsCount = (vd.current.q as any)?.items?.length || 5;
          const mult = vd.current.points === 10 ? 3 : vd.current.points === 20 ? 4 : vd.current.points === 30 ? 6 : 10;
          thinkDuration = mult * itemsCount * 1000;
        }
        vd.timer = mkTimer(thinkDuration);
        vd.steal = null;
        // USER REQUIREMENT: Giữ nguyên Ngôi sao hy vọng nếu thí sinh đã đặt trước khi hiện câu hỏi
        const preStar = vd.hopeStarActive;
        vd.hopeStarActive = preStar;
        vd.deductedOnSteal = false;
        vd.lastVerdict = null;
        if (st.showStageGraphics) st.showStageGraphics = false;
        // Note: open_question is played exclusively when package is confirmed (packageReady), NOT replayed on next question
        return OK;
      }
      case "vd:timer": {
        if (vd.phase !== "thinking") return fail("Không có câu hỏi đang chờ");
        if (timerRunning(vd.timer)) pauseTimer(vd.timer, now);
        else {
          startTimer(vd.timer, now);
          const s = Math.round(vd.timer.totalMs / 1000);
          this.cue(`4_VeDich/${s}s_tick`, "bgm");
        }
        return OK;
      }
      case "vd:hopeStar": {
        // USER REQUIREMENT: Đặt Ngôi sao hy vọng trước khi hiện câu hỏi kế tiếp hoặc trong lúc suy nghĩ
        const canStar = vd.phase === "thinking" || vd.phase === "packageReady" || vd.phase === "choosing" || vd.phase === "result";
        if (!canStar) return fail("Không thể dùng Ngôi sao hy vọng lúc này");
        if (vd.hopeStarUsed.includes(owner)) return fail("Thí sinh đã dùng Ngôi sao hy vọng");
        vd.hopeStarUsed.push(owner);
        vd.hopeStarActive = true;
        this.cue("4_VeDich/star_of_hope");
        return OK;
      }
      case "vd:correct": {
        if (!cur || vd.phase !== "thinking") return fail("Không có câu hỏi đang chờ");
        pauseTimer(vd.timer, now);
        const delta = cur.points * (vd.hopeStarActive ? 2 : 1);
        const usedStar = vd.hopeStarActive;
        this.addScore(owner, delta);
        const pkgPts = (vd.packages[owner] ?? []).map((x) => x.points);
        this.pushTranscript({
          at: now,
          round: "veDich",
          roundLabel: ROUND_LABELS.veDich,
          segmentLabel: `${this.seatName(owner)} — Câu ${vd.qIdx + 1} (${cur.points}đ)`,
          questionNumber: vd.qIdx + 1,
          entryKind: "question",
          questionText: cur.q.q,
          correctAnswer: cur.q.a,
          subject: cur.q.subject,
          kdZone: cur.q.kdZone,
          vdZone: cur.q.vdZone,
          media: cur.q.media,
          packagePoints: pkgPts,
          packageLabel: `Gói ${pkgPts.join(" - ")}`,
          questionPoints: cur.points,
          hopeStar: usedStar,
          actorSeat: owner,
          actorName: this.seatName(owner),
          verdict: "correct",
          scoreChanges: { [owner]: delta },
        });
        vd.hopeStarActive = false;
        vd.phase = "result";
        vd.lastVerdict = "correct";
        this.cue("4_VeDich/correct", "sound");
        return OK;
      }
      case "vd:wrong": {
        if (!cur || vd.phase !== "thinking") return fail("Không có câu hỏi đang chờ");
        pauseTimer(vd.timer, now);
        const pkgPts = (vd.packages[owner] ?? []).map((x) => x.points);
        this.pushTranscript({
          at: now,
          round: "veDich",
          roundLabel: ROUND_LABELS.veDich,
          segmentLabel: `${this.seatName(owner)} — Câu ${vd.qIdx + 1} (${cur.points}đ)`,
          questionNumber: vd.qIdx + 1,
          entryKind: "question",
          questionText: cur.q.q,
          correctAnswer: cur.q.a,
          subject: cur.q.subject,
          kdZone: cur.q.kdZone,
          vdZone: cur.q.vdZone,
          media: cur.q.media,
          packagePoints: pkgPts,
          packageLabel: `Gói ${pkgPts.join(" - ")}`,
          questionPoints: cur.points,
          hopeStar: vd.hopeStarActive,
          actorSeat: owner,
          actorName: this.seatName(owner),
          verdict: "wrong",
          note: `${this.seatName(owner)} trả lời chưa chính xác (Chờ mở quyền bấm chuông cướp điểm).`,
        });
        vd.phase = "result";
        vd.lastVerdict = "wrong";
        this.cue("4_VeDich/wrong");
        return OK;
      }
      case "vd:openSteal": {
        if (!cur) return fail("Không có câu hỏi");
        const okPhase = vd.phase === "thinking" || (vd.phase === "result" && vd.lastVerdict === "wrong");
        if (!okPhase) return fail("Chỉ mở cướp điểm sau khi thí sinh trả lời sai/hết giờ");
        pauseTimer(vd.timer, now);
        if (vd.hopeStarActive && !vd.deductedOnSteal) {
          this.addScore(owner, -cur.points);
          vd.deductedOnSteal = true;
        }
        const t = mkTimer(rs.stealMs);
        startTimer(t, now);
        vd.steal = { timer: t, open: true, buzzedSeat: null };
        vd.phase = "stealing";
        vd.lastVerdict = null;
        this.cue("4_VeDich/5s_steal", "bgm");
        return OK;
      }
      case "vd:closeSteal": {
        if (!cur) return fail("Không có câu hỏi");
        if (vd.steal) {
          pauseTimer(vd.steal.timer, now);
          vd.steal.timer.remainingMs = 0;
          vd.steal.open = false;
          vd.steal.buzzedSeat = null;
        }
        vd.phase = "result";
        vd.lastVerdict = "noSteal";
        vd.hopeStarActive = false;
        this.cue("4_VeDich/wrong");
        return OK;
      }
      case "vd:correctSteal": {
        if (!cur || !vd.steal || vd.steal.buzzedSeat == null) return fail("Chưa có ai bấm cướp");
        const stealer = vd.steal.buzzedSeat;
        const ownerPenalty = !vd.deductedOnSteal ? -cur.points : 0;
        if (!vd.deductedOnSteal) this.addScore(owner, -cur.points);
        this.addScore(stealer, cur.points);
        const pkgPts = (vd.packages[owner] ?? []).map((x) => x.points);
        const scoreChanges: Record<number, number> = { [stealer]: cur.points };
        if (ownerPenalty !== 0) scoreChanges[owner] = ownerPenalty;
        else if (vd.deductedOnSteal) scoreChanges[owner] = -cur.points;
        this.pushTranscript({
          at: now,
          round: "veDich",
          roundLabel: ROUND_LABELS.veDich,
          segmentLabel: `${this.seatName(owner)} — Câu ${vd.qIdx + 1} (${cur.points}đ) · Cướp điểm`,
          questionNumber: vd.qIdx + 1,
          entryKind: "question",
          questionText: cur.q.q,
          correctAnswer: cur.q.a,
          subject: cur.q.subject,
          kdZone: cur.q.kdZone,
          vdZone: cur.q.vdZone,
          media: cur.q.media,
          packagePoints: pkgPts,
          packageLabel: `Gói ${pkgPts.join(" - ")}`,
          questionPoints: cur.points,
          hopeStar: vd.hopeStarActive,
          actorSeat: owner,
          actorName: this.seatName(owner),
          buzzedSeat: stealer,
          buzzedName: this.seatName(stealer),
          buzzerEvents: [{ order: 1, seat: stealer, name: this.seatName(stealer), verdict: "correct" }],
          verdict: "steal_correct",
          scoreChanges,
        });
        vd.hopeStarActive = false;
        vd.steal.open = false;
        pauseTimer(vd.steal.timer, now);
        vd.phase = "result";
        vd.lastVerdict = "stealCorrect";
        this.cue("4_VeDich/correct");
        return OK;
      }
      case "vd:wrongSteal": {
        if (!cur || !vd.steal || vd.steal.buzzedSeat == null) return fail("Chưa có ai bấm cướp");
        const stealer = vd.steal.buzzedSeat;
        const penalty = -Math.floor(cur.points / rs.stealPenaltyDivisor);
        this.addScore(stealer, penalty);
        const pkgPts = (vd.packages[owner] ?? []).map((x) => x.points);
        const scoreChanges: Record<number, number> = { [stealer]: penalty };
        if (vd.deductedOnSteal) scoreChanges[owner] = -cur.points;
        this.pushTranscript({
          at: now,
          round: "veDich",
          roundLabel: ROUND_LABELS.veDich,
          segmentLabel: `${this.seatName(owner)} — Câu ${vd.qIdx + 1} (${cur.points}đ) · Cướp điểm sai`,
          questionNumber: vd.qIdx + 1,
          entryKind: "question",
          questionText: cur.q.q,
          correctAnswer: cur.q.a,
          subject: cur.q.subject,
          kdZone: cur.q.kdZone,
          vdZone: cur.q.vdZone,
          media: cur.q.media,
          packagePoints: pkgPts,
          packageLabel: `Gói ${pkgPts.join(" - ")}`,
          questionPoints: cur.points,
          hopeStar: vd.hopeStarActive,
          actorSeat: owner,
          actorName: this.seatName(owner),
          buzzedSeat: stealer,
          buzzedName: this.seatName(stealer),
          buzzerEvents: [{ order: 1, seat: stealer, name: this.seatName(stealer), verdict: "wrong" }],
          verdict: "steal_wrong",
          scoreChanges,
        });
        vd.hopeStarActive = false;
        vd.steal.open = false;
        pauseTimer(vd.steal.timer, now);
        vd.phase = "result";
        vd.lastVerdict = "stealWrong";
        this.cue("4_VeDich/wrong");
        return OK;
      }
      case "vd:nextSeat": {
        if (!vd.playedSeats) vd.playedSeats = [];
        if (!vd.playedSeats.includes(owner)) vd.playedSeats.push(owner);
        vd.turnIdx += 1;
        vd.onStage = false;
        vd.qIdx = -1;
        vd.current = null;
        vd.steal = null;
        vd.hopeStarActive = false;
        vd.deductedOnSteal = false;
        vd.lastVerdict = null;
        if (vd.turnIdx >= vd.order.length) {
          this.finishRound(now);
          return OK;
        }
        if (rs.turnOrderMode === "highest_unplayed") {
          const remaining = this.activeSeatIds.filter((id) => !vd.playedSeats!.includes(id));
          if (remaining.length > 0) {
            remaining.sort((a, b) => (this.seat(b)?.score ?? 0) - (this.seat(a)?.score ?? 0) || a - b);
            const nextBest = remaining[0];
            const swapIdx = vd.order.indexOf(nextBest, vd.turnIdx);
            if (swapIdx >= vd.turnIdx) {
              const tmp = vd.order[vd.turnIdx];
              vd.order[vd.turnIdx] = vd.order[swapIdx];
              vd.order[swapIdx] = tmp;
            }
          }
        }
        vd.phase = vd.packages[vd.order[vd.turnIdx]] ? "packageReady" : "idle";
        return OK;
      }
    }
    return fail("Hành động Về Đích không hợp lệ");
  }

  // ───────────────────────── CÂU HỎI PHỤ ─────────────────────────
  private chpLimit(): ChpQuestionLimit {
    return this.state.chpQuestionLimit === "unlimited" ? "unlimited" : 3;
  }

  /**
   * Khi ở chế độ Câu hỏi phụ không giới hạn và đã dùng hết kho cauHoiPhu,
   * lấy tiếp câu chưa mở từ các kho Khởi Động / Về Đích để không bị dừng đột ngột.
   */
  private drawChpUnlimitedFallbackQuestion(cp: CauHoiPhuState): QA | null {
    const qs = this.config.questionSet;
    const guard = this.duplicateGuard();
    const inCp = new Set(cp.questions.map((q) => this.normQ(q.q)));
    const pool: QA[] = [];
    const seen = new Set<string>();
    const push = (item?: QA | null) => {
      if (!item?.q) return;
      const k = this.normQ(item.q);
      if (seen.has(k) || inCp.has(k) || guard.openedQ.has(k)) return;
      seen.add(k);
      pool.push(item);
    };
    for (const q of qs.cauHoiPhu ?? []) push(q);
    for (const q of qs.khoiDong?.shared ?? []) push(q);
    for (const list of Object.values(qs.khoiDong?.solo ?? {})) for (const q of list) push(q);
    for (const tier of Object.values(qs.veDich ?? {})) for (const q of tier) push(q);
    if (pool.length === 0) return null;
    const strict = pool.filter(
      (q) => !(q.a && guard.openedA.has(this.normQ(q.a))) && !guard.reservedQ.has(this.normQ(q.q))
    );
    const chosen = strict[0] ?? pool.find((q) => !guard.reservedQ.has(this.normQ(q.q))) ?? pool[0];
    return chosen ? tagQAWithAI(chosen, false) : null;
  }

  private chpAction(type: string, a: HostAction, now: number): ActionResult {
    const st = this.state;
    const cp = st.cauHoiPhu;
    if (st.currentRound !== "cauHoiPhu" || !cp) return fail("Không ở vòng Câu hỏi phụ");

    switch (type) {
      case "chp:selectSeats": {
        if (Array.isArray(a.seats)) {
          cp.tied = (a.seats as number[]).map(Number);
        }
        return OK;
      }
      case "chp:blank": {
        cp.buzzedSeat = null;
        this.cue("6_NhacKhac/blank_space");
        return OK;
      }
      case "chp:buzzer": {
        cp.buzzOpen = !cp.buzzOpen;
        cp.buzzedSeat = null;
        if (cp.buzzOpen) this.cue("5_CauHoiPhu/bell_ring");
        return OK;
      }
      case "chp:next": {
        const limit = this.chpLimit();
        const nextIdx = cp.qIdx + 1;
        if (limit !== "unlimited" && nextIdx >= limit) {
          cp.phase = "done";
          cp.buzzOpen = false;
          pauseTimer(cp.timer, now);
          this.logMsg(`Đã hoàn thành đủ ${limit} câu hỏi phụ.`);
          return OK;
        }
        if (nextIdx >= cp.questions.length) {
          if (limit === "unlimited") {
            const extra = this.drawChpUnlimitedFallbackQuestion(cp);
            if (extra) cp.questions.push(extra);
          }
          if (nextIdx >= cp.questions.length) {
            cp.phase = "done";
            cp.buzzOpen = false;
            pauseTimer(cp.timer, now);
            return OK;
          }
        }
        cp.qIdx = nextIdx;
        cp.phase = "idle";
        resetTimer(cp.timer);
        cp.buzzOpen = false;
        cp.buzzedSeat = null;
        cp.buzzedThisQuestion = [];
        cp.winner = null;
        return OK;
      }
      case "chp:show": {
        if (cp.qIdx < 0) return fail("Hãy bấm Câu tiếp theo trước");
        cp.phase = "question";
        const curQ = cp.questions[cp.qIdx];
        if (curQ) {
          curQ.used = true;
          this.recordOpenedQuestion(curQ.q);
        }
        this.cue("5_CauHoiPhu/open_question");
        return OK;
      }
      case "chp:timer": {
        if (cp.phase !== "question") return fail("Hãy hiện câu hỏi trước");
        if (timerRunning(cp.timer)) {
          pauseTimer(cp.timer, now);
          cp.buzzOpen = false;
        } else {
          startTimer(cp.timer, now);
          if (cp.buzzedSeat == null) cp.buzzOpen = true;
          this.cue("5_CauHoiPhu/15s_tick", "bgm");
        }
        return OK;
      }
      case "chp:correct": {
        if (cp.buzzedSeat == null) return fail("Chưa có ai bấm chuông");
        const winnerSeat = cp.buzzedSeat;
        const curQ = cp.questions[cp.qIdx];
        cp.winner = winnerSeat;
        cp.phase = "result";
        cp.buzzOpen = false;
        pauseTimer(cp.timer, now);
        this.pushTranscript({
          at: now,
          round: "cauHoiPhu",
          roundLabel: ROUND_LABELS.cauHoiPhu,
          segmentLabel: `Câu hỏi phụ số ${cp.qIdx + 1}`,
          questionNumber: cp.qIdx + 1,
          entryKind: "question",
          questionText: curQ?.q ?? "",
          correctAnswer: curQ?.a ?? "",
          subject: curQ?.subject,
          kdZone: curQ?.kdZone,
          vdZone: curQ?.vdZone,
          actorSeat: winnerSeat,
          actorName: this.seatName(winnerSeat),
          buzzedSeat: winnerSeat,
          buzzedName: this.seatName(winnerSeat),
          buzzerEvents: cp.buzzedThisQuestion.map((sId, i) => ({
            order: i + 1,
            seat: sId,
            name: this.seatName(sId),
            verdict: sId === winnerSeat ? "correct" : "wrong",
          })),
          verdict: "correct",
          note: `${this.seatName(winnerSeat)} trả lời đúng Câu hỏi phụ và giành chiến thắng chung cuộc!`,
        });
        this.cue("5_CauHoiPhu/correct");
        return OK;
      }
      case "chp:wrong": {
        if (cp.buzzedSeat == null) return fail("Chưa có ai bấm chuông");
        const wrongSeat = cp.buzzedSeat;
        const curQ = cp.questions[cp.qIdx];
        cp.buzzedSeat = null;
        this.pushTranscript({
          at: now,
          round: "cauHoiPhu",
          roundLabel: ROUND_LABELS.cauHoiPhu,
          segmentLabel: `Câu hỏi phụ số ${cp.qIdx + 1}`,
          questionNumber: cp.qIdx + 1,
          entryKind: "question",
          questionText: curQ?.q ?? "",
          correctAnswer: curQ?.a ?? "",
          subject: curQ?.subject,
          kdZone: curQ?.kdZone,
          vdZone: curQ?.vdZone,
          actorSeat: wrongSeat,
          actorName: this.seatName(wrongSeat),
          buzzedSeat: wrongSeat,
          buzzedName: this.seatName(wrongSeat),
          buzzerEvents: cp.buzzedThisQuestion.map((sId, i) => ({
            order: i + 1,
            seat: sId,
            name: this.seatName(sId),
            verdict: "wrong",
          })),
          verdict: "wrong",
        });
        this.cue("5_CauHoiPhu/wrong");
        const remaining = cp.tied.filter((id) => !cp.buzzedThisQuestion.includes(id));
        if (remaining.length === 0) {
          cp.buzzOpen = false;
          cp.phase = "result";
        } else {
          cp.buzzOpen = true;
          startTimer(cp.timer, now);
        }
        return OK;
      }
      case "chp:finish":
        this.finishRound(now);
        return OK;
    }
    void a;
    return fail("Hành động Câu hỏi phụ không hợp lệ");
  }

  // ── player actions ──
  playerBuzz(seatId: number, now: number): ActionResult {
    const st = this.state;
    if (!this.seat(seatId)?.name) return fail("Ghế trống");

    // Chế độ Test Chuông: cho phép bấm thử chuông ở mọi vòng mà không khóa quyền chơi thật
    if (st.bellTestMode) {
      if (!st.bellTestLogs) st.bellTestLogs = [];
      if (!st.bellTestLogs.some((b) => b.seat === seatId)) {
        st.bellTestLogs.push({ seat: seatId, at: now, order: st.bellTestLogs.length + 1 });
      }
      const soundMap: Record<string, string> = {
        khoiDong: "1_KhoiDong/bell_ring",
        vcnv: "2_VuotChuongNgaiVat/bell_ring",
        veDich: "4_VeDich/bell_ring",
        cauHoiPhu: "5_CauHoiPhu/bell_ring",
      };
      this.cue(soundMap[st.currentRound || "khoiDong"] || "1_KhoiDong/bell_ring");
      this.touch(now);
      return OK;
    }

    if (st.stage !== "playing") return fail("Chưa trong trận");

    switch (st.currentRound) {
      case "khoiDong": {
        const kd = st.khoiDong;
        if (!kd || kd.phase !== "question") return fail("Chuông chưa mở");
        if (kd.segments[kd.segIdx].kind === "solo") return fail("Khởi động riêng không có chuông");
        if (kd.lockedSeats.includes(seatId)) return fail("Bạn bị khóa chuông câu này");
        if (kd.buzzedSeat != null) return fail("Đã có người bấm");
        if (kd.buzzUnlockAt) {
          if (now < kd.buzzUnlockAt) return fail("Chuông chưa mở");
          kd.buzzOpen = true;
          kd.buzzUnlockAt = undefined;
        }
        if (!kd.buzzOpen) return fail("Chuông chưa mở");
        kd.buzzedSeat = seatId;
        kd.noBuzzWrongUnlockAt = undefined;
        kd.buzzOpen = false;
        pauseTimer(kd.timer, now);
        this.cue("1_KhoiDong/bell_ring");
        break;
      }
      case "vcnv": {
        const v = st.vcnv;
        if (!v || v.phase === "done") return fail("Không thể bấm chuông");
        if (v.eliminatedSeats.includes(seatId)) return fail("Bạn đã bị loại khỏi lượt đoán CNV");
        if (v.bells.some((b) => b.seat === seatId)) return fail("Bạn đã bấm chuông");
        v.bells.push({ seat: seatId, before: !v.answersRevealed, atMs: now, at: now } as any);
        this.cue("2_VuotChuongNgaiVat/bell_ring");
        break;
      }
      case "veDich": {
        const vd = st.veDich;
        if (!vd || vd.phase !== "stealing" || !vd.steal || !vd.steal.open) return fail("Chưa mở cướp điểm");
        if (seatId === this.vdSeat(vd)) return fail("Bạn là người đang thi");
        if (vd.steal.buzzedSeat != null) return fail("Đã có người cướp");
        vd.steal.buzzedSeat = seatId;
        vd.steal.open = false;
        pauseTimer(vd.steal.timer, now);
        this.cue("4_VeDich/bell_ring");
        break;
      }
      case "cauHoiPhu": {
        const cp = st.cauHoiPhu;
        if (!cp || cp.phase !== "question" || !cp.buzzOpen) return fail("Chuông chưa mở");
        if (!cp.tied.includes(seatId)) return fail("Bạn không thuộc nhóm đồng hạng");
        if (cp.buzzedThisQuestion.includes(seatId)) return fail("Bạn đã bấm câu này");
        if (cp.buzzedSeat != null) return fail("Đã có người bấm");
        cp.buzzedSeat = seatId;
        cp.buzzedThisQuestion.push(seatId);
        cp.buzzOpen = false;
        pauseTimer(cp.timer, now);
        this.cue("5_CauHoiPhu/bell_ring");
        break;
      }
      default:
        return fail("Không thể bấm chuông lúc này");
    }
    // Release any manual camera override immediately on valid player buzz so Auto-Director cuts straight to the buzzer winner
    st.studioCameraManual = false;
    st.studioCamera = undefined;
    this.touch(now);
    return OK;
  }

  /** Text answer (VCNV rows, Tăng Tốc). Records last 2 answers + full attempt history. */
  playerAnswer(seatId: number, text: string, now: number): ActionResult {
    const st = this.state;
    const clean = String(text ?? "").slice(0, 120);
    if (!this.seat(seatId)?.name) return fail("Ghế trống");
    if (st.currentRound === "vcnv" && st.vcnv) {
      const v = st.vcnv;
      if (v.currentRow < 0 || v.currentRow > 4) return fail("Chưa mở hàng ngang / ô trung tâm");
      if (v.eliminatedSeats.includes(seatId) || v.bells.some((b) => b.seat === seatId)) {
        return fail("Bạn đã bấm chuông CNV hoặc đã bị loại");
      }
      if (!timerRunning(v.timer) || timerRemaining(v.timer, now) <= 0) return fail("Hết giờ nhập đáp án");
      const elapsed = Math.max(0, Math.round(v.timer.totalMs - timerRemaining(v.timer, now)));
      const prev = v.answers[seatId];
      const history = prev?.history ? [...prev.history] : [];
      history.push({ answer: clean, ms: elapsed });
      v.answers[seatId] = {
        text: clean,
        at: now,
        ms: elapsed,
        previousText: prev?.text,
        previousMs: prev?.ms,
        history,
      };
      this.touch(now);
      return OK;
    }
    if (st.currentRound === "tangToc" && st.tangToc) {
      const tt = st.tangToc;
      if (tt.phase !== "question") return fail("Chưa mở câu hỏi");
      if (!timerRunning(tt.timer) || timerRemaining(tt.timer, now) <= 0) return fail("Hết giờ nhập đáp án");
      const elapsed = Math.max(0, Math.round(tt.timer.totalMs - timerRemaining(tt.timer, now)));
      const prev = tt.submissions[seatId];
      const history = prev?.history ? [...prev.history] : [];
      history.push({ answer: clean, ms: elapsed });
      tt.submissions[seatId] = {
        answer: clean,
        ms: elapsed,
        previousAnswer: prev?.answer,
        previousMs: prev?.ms,
        history,
      };
      this.touch(now);
      return OK;
    }
    return fail("Không thể gửi đáp án lúc này");
  }

  playerPickPackage(seatId: number, points: number[], now: number): ActionResult {
    const vd = this.state.veDich;
    if (!vd || this.state.currentRound !== "veDich") return fail("Không ở vòng Về Đích");
    if (this.vdSeat(vd) !== seatId) return fail("Chưa đến lượt bạn");
    return this.setPackage(points, now);
  }

  setQuestionSet(newSet: OlympiaQuestionSet): void {
    this.config.questionSet = newSet;
    const qs = newSet;
    const st = this.state;
    // Update VCNV if round exists
    if (st.vcnv) {
      st.vcnv.keyword = qs.vcnv.answer;
      st.vcnv.keywordLength = cleanVcnvWord(qs.vcnv.answer || "").length;
      st.vcnv.mysteryImage = qs.vcnv.mysteryImage;
      st.vcnv.centerQuestion = qs.vcnv.centerQuestion;
      st.vcnv.rows.forEach((r, i) => {
        if (!r.opened) {
          const rowAns = qs.vcnv.rows[i]?.answer ?? r.answer;
          r.hint = qs.vcnv.rows[i]?.hint ?? r.hint;
          r.answer = rowAns;
          r.letterCount = qs.vcnv.rows[i]?.letterCount || cleanVcnvWord(rowAns).length || r.letterCount;
        }
      });
    }
    // Update Tang Toc questions if round exists
    if (st.tangToc) {
      st.tangToc.questions = qs.tangToc.slice(0, 4);
      st.tangToc.backupQuestions =
        qs.tangTocBackup && qs.tangTocBackup.length > 0
          ? qs.tangTocBackup
          : qs.tangToc.slice(4, 8);
    }
    this.touch(Date.now());
  }

  // ── views ──
  /** Redacted snapshot for a given audience. */
  view(role: "host" | "display" | "player", seatId?: number): OlympiaState {
    const s: OlympiaState = JSON.parse(JSON.stringify(this.state));
    s.now = Date.now();
    if (s.vcnv) {
      s.vcnv.keywordLength = s.vcnv.keywordLength || cleanVcnvWord(this.state.vcnv?.keyword || s.vcnv.keyword || "").length;
      s.vcnv.rows.forEach((r, i) => {
        if (!r.letterCount) {
          const origAns = this.state.vcnv?.rows[i]?.answer || r.answer || "";
          r.letterCount = cleanVcnvWord(origAns).length;
        }
      });
    }
    if (role === "host") return s;

    const keepSelf = <T,>(rec: Record<number, T>): Record<number, T> => {
      if (role !== "player" || seatId == null) return {};
      return rec[seatId] ? { [seatId]: rec[seatId] } : {};
    };

    if (s.khoiDong) {
      delete s.khoiDong.seatQueues;
      delete s.khoiDong.sharedQueue;
      if (s.khoiDong.current && s.khoiDong.phase !== "result") delete (s.khoiDong.current as { a?: string }).a;
    }
    if (s.vcnv) {
      if (s.vcnv.phase === "selecting") {
        s.vcnv.rows.forEach((r, i) => {
          if (s.vcnv!.currentRow === i) {
            r.hint = "";
          }
        });
        if (s.vcnv.currentRow === 4 && s.vcnv.centerQuestion) {
          s.vcnv.centerQuestion = { ...s.vcnv.centerQuestion, q: "" };
        }
      }
      s.vcnv.rows.forEach((r, i) => {
        if (!r.opened && !(s.vcnv!.answersRevealed && s.vcnv!.currentRow === i)) r.answer = "";
      });
      if (s.vcnv.solvedBy == null && s.vcnv.phase !== "done") s.vcnv.keyword = s.vcnv.keyword.replace(/[^\s]/g, "•");
      if (!s.vcnv.answersRevealed) {
        if (role === "display") {
          const redacted: Record<number, any> = {};
          for (const [sId, ans] of Object.entries(s.vcnv.answers)) {
            if (ans && ans.text && ans.text.trim()) {
              redacted[Number(sId)] = {
                ...ans,
                text: "•",
              };
            }
          }
          s.vcnv.answers = redacted;
        } else {
          s.vcnv.answers = keepSelf(s.vcnv.answers);
        }
      }
      if (s.vcnv.centerQuestion) {
        if (s.vcnv.currentRow === 4 || s.vcnv.centerOpened || s.vcnv.solvedBy != null || s.vcnv.phase === "done") {
          const showCenterAns = s.vcnv.centerOpened || (s.vcnv.currentRow === 4 && s.vcnv.answersRevealed) || s.vcnv.solvedBy != null || s.vcnv.phase === "done";
          s.vcnv.centerQuestion = {
            ...s.vcnv.centerQuestion,
            a: showCenterAns ? s.vcnv.centerQuestion.a : "",
          };
        } else {
          delete s.vcnv.centerQuestion;
        }
      }
    }
    if (s.tangToc) {
      s.tangToc.questions = s.tangToc.questions.map((q, i) => ({
        ...q,
        answer: i === s.tangToc!.qIdx && s.tangToc!.phase !== "idle" && s.tangToc!.phase !== "question" ? q.answer : "",
        // media only for the current question once it is shown
        media: i === s.tangToc!.qIdx && s.tangToc!.phase !== "idle" ? q.media : undefined,
        clueImages: i === s.tangToc!.qIdx && s.tangToc!.phase !== "idle" ? q.clueImages : undefined,
        q: i === s.tangToc!.qIdx && s.tangToc!.phase !== "idle" ? q.q : undefined,
      }));
      if (s.tangToc.phase === "question" || s.tangToc.phase === "idle") {
        if (role === "display") {
          const redacted: Record<number, any> = {};
          for (const [sId, sub] of Object.entries(s.tangToc.submissions)) {
            if (sub && sub.answer && sub.answer.trim()) {
              redacted[Number(sId)] = { ...sub, answer: "•" };
            }
          }
          s.tangToc.submissions = redacted;
        } else {
          s.tangToc.submissions = keepSelf(s.tangToc.submissions);
        }
      }
    }
    if (s.veDich) {
      const vd = s.veDich;
      const showAns = vd.phase === "result" && role !== "display";
      delete (s.veDich as any).usedKeys;
      // Strip unrevealed questions completely from packages so browser/player cannot cache or leak them
      Object.values(vd.packages).forEach((pkg) =>
        pkg.forEach((p) => {
          p.q = {
            q: "",
            a: "",
            points: p.points,
            used: p.q?.used,
          } as any;
        })
      );
      if (vd.current) {
        const real = this.state.veDich?.current;
        vd.current = {
          points: real?.points ?? vd.current.points,
          q: {
            ...vd.current.q,
            q: real?.q?.q || "",
            a: showAns ? (real?.q?.a || "") : "",
            media: real?.q?.media,
            mediaType: real?.q?.mediaType,
            subject: real?.q?.subject,
            kdZone: real?.q?.kdZone,
            vdZone: real?.q?.vdZone,
          },
        };
      }
    }
    if (s.cauHoiPhu) {
      const cp = s.cauHoiPhu;
      cp.questions = cp.questions.map((q, i) =>
        i === cp.qIdx && cp.phase !== "idle" ? { ...q, a: cp.phase === "result" ? q.a : "" } : { q: "", a: "" }
      );
    }
    return s;
  }

  /** Public display view (alias for view("display")) */
  getPublicState(): OlympiaState {
    return this.view("display");
  }
}
