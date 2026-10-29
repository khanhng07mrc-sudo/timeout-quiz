// Olympia game engine — pure state machine (no sockets, no I/O). Fully unit-testable.
import { RULESETS, cnvPointsFor, tangTocTierPoints } from "./rulesets";
import { buildBalancedKhoiDongQueues, pickBalancedVeDichPackage, tagQAWithAI } from "./ai-classifier";
import {
  KHOI_DONG_SUBJECTS,
  MAX_SEATS,
  ROUND_ORDER,
  ROUND_LABELS,
  type CauHoiPhuState,
  type HostAction,
  type KdSegmentDef,
  type KhoiDongState,
  type OlympiaConfig,
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
    this.ruleset = RULESETS[config.rulesetId] ?? RULESETS.O26;
    const rounds = sortRounds(config.rounds);
    this.state = {
      code,
      rulesetId: this.ruleset.id,
      rounds,
      stage: "lobby",
      seats: Array.from({ length: MAX_SEATS }, (_, i) => ({
        id: i,
        name: "",
        playerKey: null,
        connected: false,
        score: 0,
      })),
      roundIdx: -1,
      roundsPlan: [...rounds, "cauHoiPhu"],
      currentRound: null,
      roundStatus: emptyRoundStatus(),
      banner: null,
      khoiDong: null,
      vcnv: null,
      tangToc: null,
      veDich: null,
      cauHoiPhu: null,
      cue: null,
      cueSeq: 0,
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
  private cue(sound: string, kind: "sound" | "bgm" | "stop" = "sound") {
    this.state.cueSeq += 1;
    this.state.cue = { id: this.state.cueSeq, sound, kind };
  }
  private logMsg(msg: string) {
    this.state.log.push(msg);
    if (this.state.log.length > 80) this.state.log.shift();
  }
  get activeSeatIds(): number[] {
    return this.state.seats.filter((s) => s.name).map((s) => s.id);
  }
  private seat(id: number): Seat | undefined {
    return this.state.seats[id];
  }
  private addScore(id: number, delta: number) {
    const s = this.seat(id);
    if (!s) return;
    s.score += delta;
    this.logMsg(`${s.name || "Ghế " + (id + 1)} ${delta >= 0 ? "+" : ""}${delta}`);
  }

  // ── lobby ──
  /** Reserve a seat for a player. Returns seat id, or -1 if the room is full. */
  joinSeat(name: string, playerKey: string): number {
    const existing = this.state.seats.find((s) => s.playerKey === playerKey);
    if (existing) {
      existing.connected = true;
      if (name) existing.name = name;
      return existing.id;
    }
    if (this.state.stage !== "lobby") return -1;
    const free = this.state.seats.find((s) => !s.name);
    if (!free) return -1;
    free.name = name;
    free.playerKey = playerKey;
    free.connected = true;
    return free.id;
  }
  setConnected(seatId: number, connected: boolean) {
    const s = this.seat(seatId);
    if (s) s.connected = connected;
  }
  kickSeat(id: number) {
    const s = this.seat(id);
    if (!s) return;
    s.name = "";
    s.playerKey = null;
    s.connected = false;
    if (this.state.stage === "lobby") s.score = 0;
  }

  // ── tick (auto-expire timers) ──
  /** Returns true if state changed. */
  tick(now: number): boolean {
    const st = this.state;
    let changed = false;
    const expired = (t: TimerState | null | undefined) =>
      !!t && timerRunning(t) && timerRemaining(t, now) <= 0;
    const fin = (t: TimerState) => {
      t.remainingMs = 0;
      t.startedAt = null;
      changed = true;
    };

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
        if (kd.phase === "question" || kd.phase === "result") kd.phase = "segmentDone";
        this.cue("1_KhoiDong/finish_turn");
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
        const segs: KdSegmentDef[] = this.ruleset.khoiDong.segments(active.length).map((seg) =>
          seg.kind === "solo" ? { ...seg, seat: active[seg.seat as number], label: seg.label } : seg
        );
        const useBalanced = this.config.balancedRandom !== false && qs.balancedRandom !== false;
        const maxSoloQuestions = Math.max(12, ...segs.filter((s) => s.kind === "solo").map((s) => Math.min(s.questions, 24)));
        const balanced = useBalanced
          ? buildBalancedKhoiDongQueues(qs.khoiDong, active, maxSoloQuestions)
          : undefined;
        st.khoiDong = {
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
        };
        break;
      }
      case "vcnv": {
        const v = qs.vcnv;
        const rows = Array.from({ length: 4 }, (_, i) => ({
          hint: v.rows[i]?.hint ?? "",
          answer: v.rows[i]?.answer ?? "",
          media: v.rows[i]?.media,
          mediaType: v.rows[i]?.mediaType,
          opened: false,
          wrong: false,
        }));
        st.vcnv = {
          rows,
          keyword: v.answer,
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
          phase: "choosing",
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
        this.cue("4_VeDich/choose_package");
        break;
      }
      case "cauHoiPhu": {
        const tie = this.topTie();
        const tied = tie.length >= 2 ? tie : forced ? [...active] : [];
        if (tied.length < 2 && !forced) return fail("Không có thí sinh đồng hạng");
        const chpQuestions = [
          ...qs.cauHoiPhu.filter((q) => !q.used),
          ...qs.cauHoiPhu.filter((q) => q.used),
        ].map((q) => tagQAWithAI(q, false));
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
    this.cue("", "stop");
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
        if (this.activeSeatIds.length === 0) return fail("Cần ít nhất 1 thí sinh");
        st.stage = "playing";
        st.roundIdx = -1;
        if (st.rounds.length === 0) return fail("Chưa chọn vòng thi nào");
        this.cue("6_NhacKhac/show_intro");
        return this.nextRound(now);
      }
      case "round:next":
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
      case "seat:kick":
        this.kickSeat(num("seat"));
        return OK;
      case "seat:rename": {
        const s = this.seat(num("seat"));
        if (!s) return fail("Ghế không hợp lệ");
        s.name = String(a.name || "").slice(0, 30);
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
    }

    if (st.banner) st.banner = null;
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
        return attach(qList[kd.qIdx % qList.length] ?? null);
      }
      const order = this.activeSeatIds.indexOf(seatId);
      const pool = set.solo[String(order + 1)] ?? set.shared;
      if (kd.qIdx < pool.length) return attach(pool[kd.qIdx] ?? null);
      const flatSolo = [...set.shared, ...Object.values(set.solo).flat()];
      if (flatSolo.length === 0) return null;
      const item = flatSolo[kd.poolCursor % flatSolo.length];
      kd.poolCursor += 1;
      return attach(item);
    }
    if (kd.sharedQueue && kd.sharedQueue.length > 0) {
      const q = kd.sharedQueue[kd.poolCursor % kd.sharedQueue.length];
      kd.poolCursor += 1;
      return attach(q);
    }
    const flat = [...set.shared, ...Object.values(set.solo).flat()];
    if (flat.length === 0) return null;
    const q = flat[kd.poolCursor % flat.length];
    kd.poolCursor += 1;
    return attach(q);
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
        const isLastSeg = kd.segIdx + 1 >= kd.segments.length;

        // In segmentDone (or expired global clock in intro)
        if (kd.phase === "segmentDone" || (seg.globalMs && kd.globalTimer && kd.globalTimer.remainingMs <= 0 && kd.phase !== "intro")) {
          if (isLastSeg) {
            this.finishRound(now);
            return OK;
          }
          kd.segIdx += 1;
          const ns = kd.segments[kd.segIdx];
          kd.qIdx = -1;
          kd.phase = "intro";
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

        // When finishing question 6/6 of solo KĐ (qIdx >= seg.questions - 1 after result/skip/done),
        // pressing "kd:next" auto-transitions to question 0/6 of next contestant (or 0/12 of shared round)
        if (isSolo && kd.qIdx >= seg.questions - 1 && kd.phase !== "intro") {
          if (isLastSeg) {
            kd.phase = "segmentDone";
            kd.current = null;
            kd.buzzOpen = false;
            kd.buzzUnlockAt = undefined;
            this.cue("1_KhoiDong/finish_turn");
            return OK;
          }
          kd.segIdx += 1;
          const ns = kd.segments[kd.segIdx];
          kd.qIdx = -1;
          kd.phase = "intro";
          kd.timer = mkTimer(ns.perQuestionMs);
          kd.globalTimer = ns.globalMs ? mkTimer(ns.globalMs) : null;
          kd.buzzedSeat = null;
          kd.buzzOpen = false;
          kd.buzzUnlockAt = undefined;
          kd.lockedSeats = [];
          kd.nextLockedSeats = [];
          kd.current = null;
          kd.lastVerdict = null;
          this.cue("1_KhoiDong/finish_turn");
          return OK;
        }

        // In final shared KĐ segment, when all questions (e.g. 12/12) are completed:
        if (!isSolo && isLastSeg && kd.qIdx >= seg.questions - 1 && kd.phase === "result") {
          kd.phase = "segmentDone";
          kd.buzzOpen = false;
          kd.buzzUnlockAt = undefined;
          return fail("Đã hoàn thành tất cả câu hỏi vòng Khởi Động chung");
        }

        kd.qIdx += 1;
        if (kd.qIdx >= seg.questions) {
          kd.phase = "segmentDone";
          kd.current = null;
          kd.buzzOpen = false;
          kd.buzzUnlockAt = undefined;
          this.cue("1_KhoiDong/finish_turn");
          return OK;
        }
        const q = this.kdPoolQuestion(kd, seg);
        if (!q) {
          kd.phase = "segmentDone";
          kd.current = null;
          kd.buzzOpen = false;
          kd.buzzUnlockAt = undefined;
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
        kd.buzzedSeat = null;
        kd.lockedSeats = [...kd.nextLockedSeats];
        kd.nextLockedSeats = [];
        kd.lastVerdict = null;

        if (isSolo) {
          kd.buzzOpen = false;
          kd.buzzUnlockAt = undefined;
        } else {
          // Shared KĐ: locked 2s for O22, 5s for O23+
          kd.buzzOpen = false;
          const lockMs = (this.ruleset.id === "O22") ? 2000 : 5000;
          kd.buzzUnlockAt = now + lockMs;
        }
        this.cue("1_KhoiDong/open_question");
        return OK;
      }
      case "kd:timer": {
        if (kd.phase !== "question") return fail("Chưa mở câu hỏi");
        if (seg.globalMs && kd.globalTimer) {
          if (timerRunning(kd.globalTimer)) {
            pauseTimer(kd.globalTimer, now);
            kd.buzzOpen = false;
          } else {
            startTimer(kd.globalTimer, now);
            kd.buzzOpen = !isSolo;
            this.cue(`1_KhoiDong/${seg.globalMs >= 90000 ? "kd_bgm_3" : seg.globalMs >= 60000 ? "kd_bgm_2" : "kd_bgm_1"}`, "bgm");
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
          this.cue("1_KhoiDong/kd_bgm_" + (isSolo ? "1" : "2"), "bgm");
        }
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
        if (who == null) return fail("Chưa có thí sinh nào bấm chuông");
        if (rs.wrongPenalty) this.addScore(who, -rs.wrongPenalty);
        if (rs.lockoutOnWrong && !kd.nextLockedSeats.includes(who)) kd.nextLockedSeats.push(who);
        kd.lockedSeats.push(who);
        pauseTimer(kd.timer, now);
        kd.buzzedSeat = null;
        kd.buzzOpen = false;
        kd.buzzUnlockAt = undefined;
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
        if (rs.wrongPenalty) {
          kd.lockedSeats.forEach((sId) => (changes[sId] = -rs.wrongPenalty));
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
        if (kd.buzzOpen) kd.buzzedSeat = null;
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
      case "vcnv:selectRow": {
        const i = Number(a.row);
        if (!(i >= 0 && i <= 4)) return fail("Hàng không hợp lệ");
        if (i === 4) {
          if (v.centerOpened) return fail("Ô trung tâm đã mở");
          if (!v.centerQuestion) {
            v.centerQuestion = { q: "Câu hỏi gợi ý cuối cùng tại ô trung tâm", a: v.keyword };
          }
          v.currentRow = 4;
          v.phase = "question";
          resetTimer(v.timer, rs.vcnv.rowTimerMs);
          v.answers = {};
          v.answersRevealed = false;
          v.bells = [];
          v.centerWrong = false;
          this.cue("2_VuotChuongNgaiVat/show_row");
          return OK;
        }
        if (v.rows[i].opened) return fail("Hàng này đã mở");
        v.currentRow = i;
        v.phase = "question";
        resetTimer(v.timer, rs.vcnv.rowTimerMs);
        v.answers = {};
        v.answersRevealed = false;
        v.bells = [];
        v.rows[i].wrong = false;
        this.cue("2_VuotChuongNgaiVat/show_row");
        return OK;
      }
      case "vcnv:timer": {
        if (row < 0) return fail("Chưa chọn hàng");
        if (timerRunning(v.timer)) pauseTimer(v.timer, now);
        else {
          startTimer(v.timer, now);
          this.cue("2_VuotChuongNgaiVat/15s_tick", "bgm");
        }
        return OK;
      }
      case "vcnv:reveal": {
        if (row < 0) return fail("Chưa chọn hàng");
        pauseTimer(v.timer, now);
        v.answersRevealed = true;
        v.phase = "answers";
        this.cue("2_VuotChuongNgaiVat/reveal_answers");
        return OK;
      }
      case "vcnv:correct": {
        if (row < 0) return fail("Chưa chọn hàng");
        const answerText = row === 4 ? (v.centerQuestion?.a ?? v.keyword) : (v.rows[row]?.answer ?? "");
        const qText = row === 4 ? (v.centerQuestion?.q ?? "Câu hỏi số 5 (Ô trung tâm)") : (v.rows[row]?.hint ?? "");
        const target = normalizeAnswer(answerText);
        const given = Array.isArray(a.seatIds)
          ? (a.seatIds as number[]).map(Number)
          : this.activeSeatIds.filter(
              (id) =>
                !v.eliminatedSeats.includes(id) &&
                normalizeAnswer(v.answers[id]?.text ?? "") === target &&
                target !== ""
            );
        const awarded = given.filter((id) => this.seat(id));
        const changes: Record<number, number> = {};
        awarded.forEach((id) => {
          this.addScore(id, rs.vcnv.rowPoints);
          changes[id] = rs.vcnv.rowPoints;
        });
        v.rowResults[row] = awarded;
        if (row === 4) v.centerWrong = false;
        else if (v.rows[row]) {
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
        v.phase = "answers";
        v.answersRevealed = true;
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
        v.phase = "answers";
        v.answersRevealed = true;
        pauseTimer(v.timer, now);
        this.cue("2_VuotChuongNgaiVat/wrong");
        return OK;
      }
      case "vcnv:revealTile": {
        const i = a.row != null ? Number(a.row) : row;
        if (!(i >= 0 && i <= 4)) return fail("Chưa chọn hàng");
        if (i === 4) {
          v.centerOpened = true;
          v.piecesRevealed[4] = true;
        } else if (!v.rows[i].opened) {
          v.rows[i].opened = true;
          v.piecesRevealed[i] = true;
          v.openedCount += 1;
        }
        v.currentRow = -1;
        v.phase = "grid";
        v.answers = {};
        v.answersRevealed = false;
        this.cue("2_VuotChuongNgaiVat/reveal_puzzle_piece");
        return OK;
      }
      case "vcnv:correctCNV": {
        const seat = Number(a.seat);
        if (!this.seat(seat)) return fail("Chọn thí sinh");
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
        const seat = Number(a.seat);
        if (!this.seat(seat)) return fail("Chọn thí sinh");
        if (!v.eliminatedSeats.includes(seat)) v.eliminatedSeats.push(seat);
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
          buzzerEvents: [{ order: 1, seat, name: this.seatName(seat), verdict: "wrong" }],
          verdict: "wrong",
          note: `${this.seatName(seat)} trả lời sai CNV và dừng quyền chơi VCNV.`,
        });
        this.cue("2_VuotChuongNgaiVat/cnv_wrong");
        return OK;
      }
      case "vcnv:revealAll": {
        v.rows.forEach((r, i) => {
          r.opened = true;
          v.piecesRevealed[i] = true;
        });
        v.centerOpened = true;
        v.piecesRevealed[4] = true;
        v.phase = "done";
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
      case "vcnv:clearBells":
        v.bells = [];
        return OK;
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
        this.cue("3_TangToc/show_question");
        return OK;
      }
      case "tt:timer": {
        if (tt.phase !== "question") return fail("Hãy hiện câu hỏi trước");
        if (timerRunning(tt.timer)) pauseTimer(tt.timer, now);
        else {
          startTimer(tt.timer, now);
          const s = Math.round(tt.timer.totalMs / 1000);
          this.cue(`3_TangToc/tick_${s}s`, "bgm");
        }
        return OK;
      }
      case "tt:reveal": {
        if (tt.qIdx < 0) return fail("Chưa có câu hỏi");
        pauseTimer(tt.timer, now);
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
        tt.phase = "ranking";
        this.cue("3_TangToc/show_answer");
        return OK;
      }
      case "tt:grade": {
        if (tt.phase !== "ranking" && tt.phase !== "graded") return fail("Hãy lật đáp án trước");
        if (tt.phase === "graded") return fail("Câu này đã chấm");
        let correct: number[];
        if (Array.isArray(a.correctSeats)) correct = (a.correctSeats as number[]).map(Number);
        else {
          const target = normalizeAnswer(tt.correctAnswer ?? "");
          correct = tt.ranking.filter((r) => !r.noAnswer && normalizeAnswer(r.answer) === target).map((r) => r.seat);
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
    const useBalanced = this.config.balancedRandom !== false && qs.balancedRandom !== false;
    if (useBalanced) {
      const usedSet = new Set<string>(vd.usedKeys ?? []);
      const pkg = pickBalancedVeDichPackage(qs.veDich, points, usedSet, vd.turnIdx);
      vd.usedKeys = [...usedSet];
      return pkg;
    }
    const pool = qs.veDich;
    return points.map((p) => {
      const key = String(p);
      const list = pool[key] ?? [];
      const ptr = vd.pointers[key] ?? 0;
      const raw: VeDichQuestion = list[ptr] ?? { q: "Câu hỏi dự phòng", a: "Đáp án", type: "theory" };
      const q = tagQAWithAI(raw, false);
      vd.pointers[key] = ptr + 1;
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
      if (resolvedPoints.length !== rs.questionsPerSeat || resolvedPoints.some((p) => !rs.pointOptions.includes(p)))
        return fail(`Gói phải gồm ${rs.questionsPerSeat} câu với mức điểm ${rs.pointOptions.join("/")}`);
    }
    const ownerSeat = this.vdSeat(vd);
    vd.packages[ownerSeat] = this.allocatePackage(vd, resolvedPoints);
    vd.qIdx = -1;
    vd.phase = "packageReady";
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
      case "vd:setSeat": {
        const idx = vd.order.indexOf(Number(a.seat));
        if (idx < 0) return fail("Thí sinh không hợp lệ");
        vd.turnIdx = idx;
        vd.phase = vd.packages[vd.order[idx]] ? "packageReady" : "choosing";
        vd.qIdx = -1;
        vd.current = null;
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
        vd.timer = mkTimer(rs.thinkMs[String(vd.current.points)] ?? 15000);
        vd.steal = null;
        vd.hopeStarActive = false;
        vd.deductedOnSteal = false;
        vd.lastVerdict = null;
        this.cue("4_VeDich/open_question");
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
        if (!cur || vd.phase !== "thinking") return fail("Chỉ dùng Ngôi sao hy vọng khi câu hỏi đang diễn ra");
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
        this.cue("4_VeDich/5s_steal", "bgm");
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
        vd.qIdx = -1;
        vd.current = null;
        vd.steal = null;
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
        vd.phase = vd.packages[vd.order[vd.turnIdx]] ? "packageReady" : "choosing";
        this.cue("4_VeDich/choose_package");
        return OK;
      }
    }
    return fail("Hành động Về Đích không hợp lệ");
  }

  // ───────────────────────── CÂU HỎI PHỤ ─────────────────────────
  private chpAction(type: string, a: HostAction, now: number): ActionResult {
    const st = this.state;
    const cp = st.cauHoiPhu;
    if (st.currentRound !== "cauHoiPhu" || !cp) return fail("Không ở vòng Câu hỏi phụ");

    switch (type) {
      case "chp:next": {
        cp.qIdx += 1;
        if (cp.qIdx >= cp.questions.length) {
          cp.phase = "done";
          return OK;
        }
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
    if (st.stage !== "playing") return fail("Chưa trong trận");

    switch (st.currentRound) {
      case "khoiDong": {
        const kd = st.khoiDong;
        if (!kd || kd.phase !== "question" || !kd.buzzOpen) return fail("Chuông chưa mở");
        if (kd.segments[kd.segIdx].kind === "solo") return fail("Khởi động riêng không có chuông");
        if (kd.lockedSeats.includes(seatId)) return fail("Bạn bị khóa chuông câu này");
        if (kd.buzzedSeat != null) return fail("Đã có người bấm");
        kd.buzzedSeat = seatId;
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
        v.bells.push({ seat: seatId, before: !v.answersRevealed });
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
      if (v.eliminatedSeats.includes(seatId)) return fail("Bạn đã bị loại");
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

  // ── views ──
  /** Redacted snapshot for a given audience. */
  view(role: "host" | "display" | "player", seatId?: number): OlympiaState {
    const s: OlympiaState = JSON.parse(JSON.stringify(this.state));
    s.now = Date.now();
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
      s.vcnv.rows.forEach((r, i) => {
        if (!r.opened && !(s.vcnv!.answersRevealed && s.vcnv!.currentRow === i)) r.answer = "";
      });
      if (s.vcnv.solvedBy == null && s.vcnv.phase !== "done") s.vcnv.keyword = s.vcnv.keyword.replace(/[^\s]/g, "•");
      if (!s.vcnv.answersRevealed) s.vcnv.answers = keepSelf(s.vcnv.answers);
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
        s.tangToc.submissions = keepSelf(s.tangToc.submissions);
      }
    }
    if (s.veDich) {
      const vd = s.veDich;
      const showAns = vd.phase === "result";
      Object.values(vd.packages).forEach((pkg) =>
        pkg.forEach((p) => {
          p.q = { ...p.q, a: "" };
          if (vd.current !== p) p.q.q = vd.phase === "idle" ? "" : p.q.q;
        })
      );
      // only expose question text of the current question
      Object.values(vd.packages).forEach((pkg) => pkg.forEach((p) => (p.q = { ...p.q, q: "", media: undefined })));
      if (vd.current) {
        vd.current = { ...vd.current, q: { ...vd.current.q, a: showAns ? vd.current.q.a : "" } };
        // restore the current question text and media from the authoritative state
        const real = this.state.veDich?.current;
        if (real) {
          vd.current.q.q = real.q.q;
          vd.current.q.media = real.q.media;
          vd.current.q.mediaType = real.q.mediaType;
          vd.current.q.subject = real.q.subject;
          vd.current.q.kdZone = real.q.kdZone;
          vd.current.q.vdZone = real.q.vdZone;
        }
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
}
