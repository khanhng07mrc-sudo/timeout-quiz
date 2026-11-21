"use client";

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { OlympiaState, TimerState } from "@/lib/olympia/types";
import { getEntranceScheduleOffsetsMs } from "@/lib/olympia/entrance-geometry";
import { RULESETS } from "@/lib/olympia/rulesets";

export function isPriorityInstantCue(sound?: string): boolean {
  if (!sound) return false;
  return /(?:^|\/)(?:bell_ring|correct|wrong|hope_star)(?:\.mp3)?$/.test(sound);
}

type FastCueListener = (cue: NonNullable<OlympiaState["cue"]>, state: OlympiaState) => void;
const fastCueListeners = new Set<FastCueListener>();
const dispatchedFastCueIds = new Set<number>();
const ramSfxBufferCache = new Map<string, AudioBuffer>();
const ramSfxFetchPending = new Set<string>();
let sharedDecodeCtx: AudioContext | null = null;

function getSharedDecodeAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!sharedDecodeCtx) {
    try {
      sharedDecodeCtx = new AudioContextClass();
    } catch {
      return null;
    }
  }
  return sharedDecodeCtx;
}

export type OlympiaRole = "host" | "display" | "player";

export interface JoinInfo {
  ok: boolean;
  error?: string;
  seatId?: number;
  status?: "approved" | "pending";
  audioSeason?: string;
  rulesetId?: string;
  state?: OlympiaState;
}

interface Options {
  code: string;
  role: OlympiaRole;
  hostKey?: string;
  name?: string;
  token?: string;
  seatId?: number;
  school?: string;
  enabled?: boolean;
}

export function useOlympiaSocket({
  code,
  role,
  hostKey,
  name,
  token,
  seatId,
  school,
  enabled = true,
}: Options) {
  const cacheKeyState = `olympia_state_${code}_${role}`;
  const cacheKeyJoin = `olympia_join_${code}_${role}`;

  const [state, setState] = useState<OlympiaState | null>(() => {
    if (typeof window === "undefined" || !code) return null;
    try {
      const raw = sessionStorage.getItem(cacheKeyState);
      if (raw) {
        const parsed = JSON.parse(raw) as OlympiaState;
        if (parsed && parsed.code === code) return parsed;
      }
    } catch {}
    return null;
  });

  const [join, setJoin] = useState<JoinInfo | null>(() => {
    if (typeof window === "undefined" || !code) return null;
    try {
      const raw = sessionStorage.getItem(cacheKeyJoin);
      if (raw) {
        const parsed = JSON.parse(raw) as JoinInfo;
        if (parsed && parsed.ok) return parsed;
      }
    } catch {}
    return null;
  });

  const [connected, setConnected] = useState(false);
  const [kickedMessage, setKickedMessage] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const offsetRef = useRef(0);
  const versionRef = useRef(-1);
  const joinedRef = useRef(false);
  const latestStateRef = useRef<OlympiaState | null>(null);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFastCueIdRef = useRef<number | null>(null);
  const pendingVisualTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistState = useCallback(
    (s: OlympiaState) => {
      latestStateRef.current = s;
      setState(s);
      if (typeof window !== "undefined" && code) {
        if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
        persistTimerRef.current = setTimeout(() => {
          persistTimerRef.current = null;
          const snap = latestStateRef.current;
          if (!snap) return;
          try {
            sessionStorage.setItem(cacheKeyState, JSON.stringify(snap));
          } catch {}
        }, 400);
      }
    },
    [cacheKeyState, code]
  );

  useEffect(() => {
    if (!enabled || !code) return;
    joinedRef.current = false;
    const socket = io("/olympia", {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 300,
      reconnectionDelayMax: 1500,
      timeout: 8000,
    });
    socketRef.current = socket;

    const doJoin = () => {
      if (!socket.connected) return;
      const t0 = Date.now();
      socket.emit("time:sync", t0, (r: { serverTime: number }) => {
        const t1 = Date.now();
        offsetRef.current = r.serverTime + (t1 - t0) / 2 - t1;
      });
      socket.emit("join", { code, role, key: hostKey, name, token, seatId, school }, (res: JoinInfo) => {
        if (!res) return;
        joinedRef.current = true;
        const { state: initialState, ...joinMeta } = res;
        setJoin(joinMeta);
        if (typeof window !== "undefined" && joinMeta.ok) {
          try {
            sessionStorage.setItem(cacheKeyJoin, JSON.stringify(joinMeta));
          } catch {}
        }
        if (initialState) {
          versionRef.current = initialState.version;
          if (initialState.cue) {
            lastFastCueIdRef.current = initialState.cue.id;
          }
          persistState(initialState);
        }
      });
    };

    socket.on("connect", () => {
      setConnected(true);
      joinedRef.current = false;
      doJoin();
    });
    socket.on("disconnect", () => {
      setConnected(false);
      joinedRef.current = false;
    });
    socket.on("kicked", (data: { message?: string }) => {
      setKickedMessage(data?.message || "Bạn đã bị Quản trò mời ra khỏi phòng thi.");
    });
    socket.on("state", (s: OlympiaState) => {
      joinedRef.current = true;
      versionRef.current = s.version;

      if (pendingVisualTimerRef.current) {
        clearTimeout(pendingVisualTimerRef.current);
        pendingVisualTimerRef.current = null;
      }

      const cue = s.cue;
      const isPriorityCue =
        Boolean(cue && cue.kind !== "stop" && isPriorityInstantCue(cue.sound)) &&
        lastFastCueIdRef.current !== null &&
        cue!.id !== lastFastCueIdRef.current;

      if (cue) {
        lastFastCueIdRef.current = cue.id;
      }

      if (isPriorityCue && cue) {
        // PHASE 1 (0ms): Trigger priority audio (buzzer / verdict SFX) immediately before React render
        fastCueListeners.forEach((listener) => {
          try {
            listener(cue, s);
          } catch {}
        });

        // PHASE 2 (~28ms / 1-2 frames): Defer visual signal state update so audio plays with zero CPU contention
        pendingVisualTimerRef.current = setTimeout(() => {
          pendingVisualTimerRef.current = null;
          startTransition(() => {
            persistState(s);
          });
        }, 28);
        return;
      }

      persistState(s);
    });

    if (socket.connected) {
      setConnected(true);
      doJoin();
    }

    // Fast auto-retry if join ack hasn't arrived within 1.5s while connected
    const retryTimer = setInterval(() => {
      if (socket.connected && !joinedRef.current) {
        doJoin();
      }
    }, 1500);

    // Contestant session persistence: reconnect if disconnected, or finish join if not yet acknowledged.
    // IMPORTANT: Do NOT re-emit `join` on routine iframe/window focus clicks when already connected & joined,
    // otherwise clicking the buzzer button inside an iframe triggers a redundant state re-hydration hitch!
    const handleResume = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        if (!socket.connected) {
          socket.connect();
        } else if (!joinedRef.current) {
          doJoin();
        }
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleResume);
    }
    if (typeof window !== "undefined") {
      window.addEventListener("focus", handleResume);
    }

    return () => {
      clearInterval(retryTimer);
      if (pendingVisualTimerRef.current) {
        clearTimeout(pendingVisualTimerRef.current);
        pendingVisualTimerRef.current = null;
      }
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
        if (typeof window !== "undefined" && code && latestStateRef.current) {
          try {
            sessionStorage.setItem(cacheKeyState, JSON.stringify(latestStateRef.current));
          } catch {}
        }
      }
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleResume);
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handleResume);
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, [code, role, hostKey, name, token, seatId, school, enabled, cacheKeyJoin, cacheKeyState, persistState]);

  const emit = useCallback(
    (event: string, payload?: unknown): Promise<{ ok: boolean; error?: string }> =>
      new Promise((resolve) => {
        const s = socketRef.current;
        if (!s) return resolve({ ok: false, error: "Chưa kết nối" });
        s.emit(event, payload ?? {}, (res: { ok: boolean; error?: string }) => resolve(res ?? { ok: true }));
      }),
    []
  );

  const serverNow = useCallback(() => Date.now() + offsetRef.current, []);
  return { state, join, connected, emit, serverNow, kickedMessage };
}

/** Remaining ms for a server timer, ticking locally. */
export function useCountdown(timer: TimerState | null | undefined, serverNow: () => number): number {
  const [, force] = useState(0);
  const running = !!timer && timer.startedAt != null;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => force((n) => n + 1), 100);
    return () => clearInterval(id);
  }, [running]);
  if (!timer) return 0;
  if (timer.startedAt == null) return timer.remainingMs;
  return Math.max(0, timer.remainingMs - (serverNow() - timer.startedAt));
}

const BGM_CROSSFADE_MS = 1500;

export const INTRO_CROSSFADE_WINDOW_SEC = 2.0;
export const INTRO_CROSSFADE_WINDOW_MS = 2000;
export const CONTEST_INTRO_DURATION_SEC = 18.55;
export const CONTEST_INTRO_TRIGGER_SEC = 16.55; // CONTEST_INTRO_DURATION_SEC - INTRO_CROSSFADE_WINDOW_SEC

export const isCountdownTrack = (sound: string): boolean => {
  if (!sound) return false;
  const clean = sound.split("?")[0].replace(/\.mp3$/, "");
  return (
    /(?:(?:^|\/)(?:\d+s(?:_tick|_steal|_practice)?|tick_\d+s))$/.test(clean) ||
    /(?:10s_tick|15s_tick|20s_tick|30s_tick|40s_tick|5s_steal|20s_practice|30s_practice|40s_practice|60s_practice|60s|30s|90s)$/.test(clean)
  );
};

export const isLoopingBgm = (sound: string): boolean =>
  /kd_bgm_[12]$/.test(sound) || /loop/.test(sound);

export const isIntroOrMusicTrack = (sound: string): boolean =>
  /(?:show_intro|contest_intro|contestant_intro|ending_music|summary|prize_award)$/.test(sound);

export const isIntroSeamlessLoopTrack = (sound: string): boolean => {
  if (!sound) return false;
  const clean = sound.split("?")[0].replace(/\.mp3$/, "");
  return /(?:^|\/)(?:show_intro|contest_intro)$/.test(clean);
};

/** Loops contestant_intro seamlessly when there are more than 4 active contestants */
export const shouldLoopContestantIntro = (sound: string, seatCount: number): boolean => {
  if (!sound || seatCount <= 4) return false;
  const normalized = sound.split("?")[0].replace(/\.mp3$/, "");
  return /(?:^|\/)contestant_intro$/.test(normalized);
};

export const calculateEntranceDuration = (seatCount: number): number => {
  const n = Math.max(1, Math.floor(seatCount));
  return getEntranceScheduleOffsetsMs(n).totalDurationSec;
};

export const calculateRequiredIntroLoops = (
  seatCount: number,
  trackDuration: number = CONTEST_INTRO_DURATION_SEC,
  crossfadeWindow: number = INTRO_CROSSFADE_WINDOW_SEC
): number => {
  const totalDuration = calculateEntranceDuration(seatCount);
  const effectivePerLoop = Math.max(0.1, trackDuration - crossfadeWindow);
  if (totalDuration <= trackDuration - crossfadeWindow) {
    return 1;
  }
  return 1 + Math.ceil((totalDuration - (trackDuration - crossfadeWindow)) / effectivePerLoop);
};

export interface IntroAudioInstanceRecord {
  id: number;
  src: string;
  volume: number;
  currentTime: number;
  duration: number;
  state: "SPAWNED" | "FADING_IN" | "PLAYING" | "FADING_OUT" | "PAUSED" | "DISPOSED";
}

export class SeamlessIntroAudioLoopSimulator {
  public instances: IntroAudioInstanceRecord[] = [];
  public currentInstanceIndex = -1;
  public totalSimulatedTime = 0;
  public crossfadeWindowSec: number;
  public trackDurationSec: number;
  public triggerTimeSec: number;
  public isStopped = false;
  public events: { time: number; type: string; detail: any }[] = [];

  constructor(
    trackDuration: number = CONTEST_INTRO_DURATION_SEC,
    crossfadeWindow: number = INTRO_CROSSFADE_WINDOW_SEC
  ) {
    this.trackDurationSec = trackDuration;
    this.crossfadeWindowSec = crossfadeWindow;
    this.triggerTimeSec = Math.max(0, trackDuration - crossfadeWindow);
  }

  public start(src: string = "/olympia-audio/O26/6_NhacKhac/contest_intro.mp3"): IntroAudioInstanceRecord {
    const inst: IntroAudioInstanceRecord = {
      id: 1,
      src,
      volume: 0.85,
      currentTime: 0,
      duration: this.trackDurationSec,
      state: "PLAYING",
    };
    this.instances.push(inst);
    this.currentInstanceIndex = 0;
    this.events.push({ time: 0, type: "START", detail: { instanceId: 1 } });
    return inst;
  }

  private stepSubTick(dt: number): void {
    if (this.isStopped) return;
    this.totalSimulatedTime += dt;
    const current = this.instances[this.currentInstanceIndex];
    if (!current || current.state === "DISPOSED" || current.state === "PAUSED") return;

    // Advance current time
    current.currentTime += dt;

    // Check if trigger reached and next instance not yet spawned
    if (
      current.currentTime >= this.triggerTimeSec - 1e-4 &&
      this.instances.length === this.currentInstanceIndex + 1
    ) {
      // Spawn next instance
      const nextId = this.instances.length + 1;
      const nextInst: IntroAudioInstanceRecord = {
        id: nextId,
        src: current.src,
        volume: 0.0,
        currentTime: 0,
        duration: this.trackDurationSec,
        state: "FADING_IN",
      };
      this.instances.push(nextInst);
      current.state = "FADING_OUT";
      this.events.push({
        time: this.totalSimulatedTime,
        type: "CROSSFADE_START",
        detail: { fadingOutId: current.id, fadingInId: nextId },
      });
    }

    // Handle crossfade volume updates
    if (this.instances.length > this.currentInstanceIndex + 1) {
      const fadingOut = current;
      const fadingIn = this.instances[this.currentInstanceIndex + 1];

      const crossfadeElapsed = fadingOut.currentTime - this.triggerTimeSec;
      const progress = Math.min(1.0, Math.max(0.0, crossfadeElapsed / this.crossfadeWindowSec));

      fadingOut.volume = Math.max(0, 0.85 * (1.0 - progress));
      fadingIn.volume = Math.min(0.85, 0.85 * progress);
      fadingIn.currentTime = crossfadeElapsed;

      if (progress >= 1.0 - 1e-4) {
        fadingOut.state = "DISPOSED";
        fadingOut.volume = 0;
        fadingIn.state = "PLAYING";
        fadingIn.volume = 0.85;
        this.currentInstanceIndex++;
        this.events.push({
          time: this.totalSimulatedTime,
          type: "CROSSFADE_COMPLETE",
          detail: { activeId: fadingIn.id, retiredId: fadingOut.id },
        });
      }
    }
  }

  public step(deltaSec: number): void {
    if (this.isStopped) return;
    const subTick = 0.05;
    let remaining = deltaSec;
    while (remaining > 0.00001 && !this.isStopped) {
      const dt = Math.min(subTick, remaining);
      this.stepSubTick(dt);
      remaining -= dt;
    }
  }

  public fadeOutAndStop(durationSec: number = 1.0): void {
    this.isStopped = true;
    const active = this.instances.filter((i) => i.state !== "DISPOSED" && i.state !== "PAUSED");
    active.forEach((inst) => {
      inst.state = "DISPOSED";
      inst.volume = 0;
    });
    this.events.push({
      time: this.totalSimulatedTime,
      type: "FADE_OUT_STOP",
      detail: { durationSec, stoppedCount: active.length },
    });
  }
}

const sfxAudioCache = new Map<string, HTMLAudioElement>();

function prewarmSfx(url: string) {
  if (typeof window === "undefined") return;
  if (!sfxAudioCache.has(url)) {
    try {
      const a = new Audio(url);
      a.preload = "auto";
      sfxAudioCache.set(url, a);
    } catch {}
  }
  if (isPriorityInstantCue(url) && !ramSfxBufferCache.has(url) && !ramSfxFetchPending.has(url)) {
    ramSfxFetchPending.add(url);
    fetch(url)
      .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject()))
      .then((buf) => {
        const ctx = getSharedDecodeAudioContext();
        if (!ctx) return;
        return ctx.decodeAudioData(buf);
      })
      .then((decoded) => {
        if (decoded) {
          ramSfxBufferCache.set(url, decoded);
        }
      })
      .catch(() => {})
      .finally(() => {
        ramSfxFetchPending.delete(url);
      });
  }
}

export function prewarmBuzzerSounds(season: string = "O26") {
  if (typeof window === "undefined") return;
  const list = [
    `/olympia-audio/${season}/1_KhoiDong/bell_ring.mp3`,
    `/olympia-audio/${season}/2_VuotChuongNgaiVat/bell_ring.mp3`,
    `/olympia-audio/${season}/4_VeDich/bell_ring.mp3`,
    `/olympia-audio/${season}/5_CauHoiPhu/bell_ring.mp3`,
    `/olympia-audio/${season}/1_KhoiDong/correct.mp3`,
    `/olympia-audio/${season}/1_KhoiDong/wrong.mp3`,
    `/olympia-audio/${season}/2_VuotChuongNgaiVat/correct.mp3`,
    `/olympia-audio/${season}/2_VuotChuongNgaiVat/wrong.mp3`,
    `/olympia-audio/${season}/3_TangToc/correct.mp3`,
    `/olympia-audio/${season}/3_TangToc/wrong.mp3`,
    `/olympia-audio/${season}/4_VeDich/correct.mp3`,
    `/olympia-audio/${season}/4_VeDich/wrong.mp3`,
    `/olympia-audio/${season}/1_KhoiDong/open_question.mp3`,
    `/olympia-audio/${season}/2_VuotChuongNgaiVat/open_row.mp3`,
    `/olympia-audio/${season}/3_TangToc/open_question.mp3`,
    `/olympia-audio/${season}/3_TangToc/show_answer.mp3`,
    `/olympia-audio/${season}/4_VeDich/open_question.mp3`,
    `/olympia-audio/${season}/4_VeDich/hope_star.mp3`,
    `/olympia-audio/${season}/6_NhacKhac/show_intro.mp3`,
    `/olympia-audio/${season}/6_NhacKhac/contest_intro.mp3`,
    `/olympia-audio/${season}/3_TangToc/tick_10s.mp3`,
    `/olympia-audio/${season}/3_TangToc/tick_20s.mp3`,
    `/olympia-audio/${season}/3_TangToc/tick_30s.mp3`,
    `/olympia-audio/${season}/3_TangToc/tick_40s.mp3`,
    `/olympia-audio/O26/1_KhoiDong/bell_ring.mp3`,
    `/olympia-audio/O26/2_VuotChuongNgaiVat/bell_ring.mp3`,
    `/olympia-audio/O26/4_VeDich/bell_ring.mp3`,
    `/olympia-audio/O26/5_CauHoiPhu/bell_ring.mp3`,
    `/olympia-audio/O26/1_KhoiDong/correct.mp3`,
    `/olympia-audio/O26/1_KhoiDong/wrong.mp3`,
    `/olympia-audio/O26/4_VeDich/hope_star.mp3`,
  ];
  list.forEach(prewarmSfx);
  if ("caches" in window) {
    caches.open("olympia-audio-v1").then((cache) => {
      list.forEach((url) => {
        cache.match(url).then((match) => {
          if (!match) cache.add(url).catch(() => {});
        }).catch(() => {});
      });
    }).catch(() => {});
  }
}

if (typeof window !== "undefined") {
  (window as any).__OLYMPIA_UNLOCK_AUDIO__ = (window as any).__OLYMPIA_UNLOCK_AUDIO__ || (() => {});
}

/** Plays server "cue" events. Missing files fall back to O26, then fail silently. */
export function useOlympiaAudio(
  state: OlympiaState | null,
  audioSeason: string | undefined,
  enabled: boolean,
  channel?: "both" | "left" | "right"
) {
  // Deterministically resolve audio season from state.rulesetId first, then param, then "O26"
  const resolvedSeason =
    (state?.rulesetId && RULESETS[state.rulesetId]?.audioSeason) ||
    audioSeason ||
    "O26";

  const lastCue = useRef<number | null>(null);
  const hasPlayedIntroLobbyRef = useRef(false);
  const pendingShowIntroRef = useRef(false); // set when show_intro fired before audioSeason arrived
  const bgm = useRef<HTMLAudioElement | null>(null);
  const activeBgmSet = useRef<Set<HTMLAudioElement>>(new Set());
  const activeFadeTimers = useRef<Set<ReturnType<typeof setInterval>>>(new Set());
  const activeAudioSet = useRef<Set<HTMLAudioElement>>(new Set());
  const activeIntroTimers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const activeIntroCleanups = useRef<Set<() => void>>(new Set());
  const audioCtxRef = useRef<AudioContext | null>(null);
  // WeakMap cache: reuse existing MediaElementAudioSourceNode per element
  const mediaSourceMap = useRef<WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>>(new WeakMap());
  // Persistent WebAudio routing graph per element for uninterrupted, click-free real-time channel switching
  const pannerGraphMap = useRef<
    WeakMap<
      HTMLAudioElement,
      {
        source: MediaElementAudioSourceNode;
        splitter: ChannelSplitterNode;
        merger: ChannelMergerNode;
        gainL_to_L: GainNode;
        gainL_to_R: GainNode;
        gainR_to_L: GainNode;
        gainR_to_R: GainNode;
      }
    >
  >(new WeakMap());
  const pendingCueRef = useRef<(() => void) | null>(null);
  const isAudioUnlockedRef = useRef(false);
  const isBgmPausedExplicitlyRef = useRef(false);

  const getAudioContext = useCallback(() => {
    if (typeof window === "undefined") return null;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContextClass();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  /** Dừng và dọn dẹp triệt để 100% tất cả BGM đang phát lẫn các bài hát đang fade-out ngầm */
  const killAllBgmAudio = useCallback(() => {
    pendingCueRef.current = null;
    isBgmPausedExplicitlyRef.current = false;
    activeFadeTimers.current.forEach((t) => clearInterval(t));
    activeFadeTimers.current.clear();

    activeIntroTimers.current.forEach((t) => clearTimeout(t));
    activeIntroTimers.current.clear();
    activeIntroCleanups.current.forEach((cleanup) => {
      try {
        cleanup();
      } catch {}
    });
    activeIntroCleanups.current.clear();

    activeBgmSet.current.forEach((a) => {
      try {
        a.pause();
        a.currentTime = 0;
        a.src = "";
      } catch {}
    });
    activeBgmSet.current.clear();

    // Clean up any countdown or BGM audio that might be in activeAudioSet
    activeAudioSet.current.forEach((a) => {
      if (a.src && (isCountdownTrack(a.src) || isIntroOrMusicTrack(a.src))) {
        try {
          a.pause();
          a.currentTime = 0;
          a.src = "";
        } catch {}
        activeAudioSet.current.delete(a);
      }
    });

    if (bgm.current) {
      try {
        bgm.current.pause();
        bgm.current.currentTime = 0;
        bgm.current.src = "";
      } catch {}
      bgm.current = null;
    }
  }, []);

  const fadeOutAndStopBgm = useCallback(
    (durationMs: number = 1200) => {
      const toFade = Array.from(activeBgmSet.current);
      if (bgm.current && !toFade.includes(bgm.current)) toFade.push(bgm.current);
      if (toFade.length === 0) return;

      const steps = 20;
      const stepMs = Math.max(15, Math.floor(durationMs / steps));
      let step = 0;
      const timer = setInterval(() => {
        step++;
        const factor = Math.max(0, 1 - step / steps);
        toFade.forEach((a) => {
          try {
            a.volume = a.volume * factor;
          } catch {}
        });
        if (step >= steps) {
          clearInterval(timer);
          activeFadeTimers.current.delete(timer);
          killAllBgmAudio();
        }
      }, stepMs);
      activeFadeTimers.current.add(timer);
    },
    [killAllBgmAudio]
  );

  const stopBgm = useCallback(
    (immediate: boolean = false) => {
      if (immediate) killAllBgmAudio();
      else fadeOutAndStopBgm(1200);
    },
    [killAllBgmAudio, fadeOutAndStopBgm]
  );

  /** Crossfade to a new BGM element. Với Countdown audio thì phát ngay lập tức không fade-in từ 0. */
  const crossfadeToBgm = useCallback(
    (
      newAudio: HTMLAudioElement,
      durationMs: number,
      immediate: boolean = false,
      fadeOldOnly: boolean = false,
      allowSameSrc: boolean = false
    ) => {
      const old = bgm.current;
      const isIntroTrackLoop = isIntroSeamlessLoopTrack(newAudio.src);
      const permitSameSrc = allowSameSrc || isIntroTrackLoop;

      // Nếu cùng nguồn âm thanh đang phát thì bỏ qua không lặp lại; nếu là seamless crossfade loop thì cho phép old !== newAudio cùng src
      if (old && !old.ended && (old === newAudio || (!permitSameSrc && old.src === newAudio.src))) {
        isBgmPausedExplicitlyRef.current = false;
        if (old.paused && !old.ended) {
          old.play().catch(() => {});
        }
        return;
      }

      // Dừng dứt điểm các track nhạc cũ trước đó nếu đang fade dở dang
      activeBgmSet.current.forEach((a) => {
        if (a !== old && a !== newAudio) {
          try {
            a.pause();
            a.currentTime = 0;
            a.src = "";
          } catch {}
          activeBgmSet.current.delete(a);
        }
      });

      activeBgmSet.current.add(newAudio);
      bgm.current = newAudio;
      isBgmPausedExplicitlyRef.current = false;

      const targetVol = 0.85;

      const isNewContestIntro = Boolean(newAudio.src && (newAudio.src.includes("contest_intro") || newAudio.src.includes("contestant_intro")));
      const isOldShowIntro = Boolean(old && old.src && old.src.includes("show_intro"));
      const cutOldImmediately = immediate || (isNewContestIntro && isOldShowIntro);

      if (cutOldImmediately) {
        // Countdown track hoặc bắt đầu trận đấu (contest_intro thay thế show_intro): ngắt ngay track nhạc cũ và phát âm lượng đầy đủ ngay lập tức
        if (old && !old.paused) {
          try {
            old.pause();
            old.currentTime = 0;
            old.src = "";
          } catch {}
          activeBgmSet.current.delete(old);
        }
        // Đồng thời dọn dẹp triệt để bất kỳ track show_intro nào còn sót trong activeBgmSet
        if (isNewContestIntro) {
          activeBgmSet.current.forEach((a) => {
            if (a !== newAudio && a.src && a.src.includes("show_intro")) {
              try {
                a.pause();
                a.currentTime = 0;
                a.src = "";
              } catch {}
              activeBgmSet.current.delete(a);
            }
          });
        }
        newAudio.volume = targetVol;
        newAudio.play().catch((err) => {
          if (err && err.name === "NotAllowedError") {
            pendingCueRef.current = () => {
              if (newAudio.volume === 0) newAudio.volume = targetVol;
              newAudio.play().catch(() => {});
            };
          }
        });
        return;
      }

      newAudio.volume = fadeOldOnly ? targetVol : 0;
      newAudio.play().then(() => {
        if (!fadeOldOnly) {
          // Fade in new audio (dành riêng cho nhạc nền ambient)
          const steps = 20;
          const stepMs = Math.max(15, Math.floor(durationMs / steps));
          const volStep = targetVol / steps;
          let step = 0;
          const fadeInTimer = setInterval(() => {
            step++;
            const newVol = Math.min(targetVol, volStep * step);
            try {
              newAudio.volume = newVol;
            } catch {}
            if (
              step >= steps ||
              newVol >= targetVol ||
              bgm.current !== newAudio ||
              !activeBgmSet.current.has(newAudio)
            ) {
              clearInterval(fadeInTimer);
              activeFadeTimers.current.delete(fadeInTimer);
            }
          }, stepMs);
          activeFadeTimers.current.add(fadeInTimer);
        }
      }).catch((err) => {
        if (err && err.name === "NotAllowedError") {
          pendingCueRef.current = () => {
            if (newAudio.volume === 0) newAudio.volume = targetVol;
            newAudio.play().catch(() => {});
          };
        }
      });

      if (old && !old.paused) {
        activeBgmSet.current.add(old);
        const steps = 20;
        const stepMs = Math.max(15, Math.floor(durationMs / steps));
        const startVol = old.volume;
        const volStep = startVol / steps;
        let step = 0;
        const fadeTimer = setInterval(() => {
          step++;
          const newVol = Math.max(0, startVol - volStep * step);
          try {
            old.volume = newVol;
          } catch {}
          if (step >= steps || newVol <= 0 || !activeBgmSet.current.has(old)) {
            clearInterval(fadeTimer);
            activeFadeTimers.current.delete(fadeTimer);
            try {
              old.pause();
              old.currentTime = 0;
              old.src = "";
            } catch {}
            activeBgmSet.current.delete(old);
          }
        }, stepMs);
        activeFadeTimers.current.add(fadeTimer);
      }

      if (fadeOldOnly) {
        return;
      }
    },
    []
  );

  const pauseBgm = useCallback(() => {
    isBgmPausedExplicitlyRef.current = true;
    if (bgm.current && !bgm.current.paused) {
      bgm.current.pause();
    }
  }, []);

  const resumeBgm = useCallback(() => {
    isBgmPausedExplicitlyRef.current = false;
    if (bgm.current && bgm.current.paused) {
      bgm.current.play().catch(() => {});
    }
  }, []);

  const connectPanner = useCallback(
    (a: HTMLAudioElement, panOverride?: "both" | "left" | "right") => {
      const activePan =
        panOverride ||
        (typeof window !== "undefined"
          ? (localStorage.getItem("olympia_audio_channel") as any) || channel || "both"
          : channel || "both");
      const ctx = getAudioContext();
      if (!ctx) return;
      try {
        let graph = pannerGraphMap.current.get(a);
        if (!graph) {
          // Reuse or create MediaElementAudioSourceNode
          let source: MediaElementAudioSourceNode;
          if (mediaSourceMap.current.has(a)) {
            source = mediaSourceMap.current.get(a)!;
          } else {
            source = ctx.createMediaElementSource(a);
            mediaSourceMap.current.set(a, source);
          }

          const splitter = ctx.createChannelSplitter(2);
          const merger = ctx.createChannelMerger(2);
          const gainL_to_L = ctx.createGain();
          const gainL_to_R = ctx.createGain();
          const gainR_to_L = ctx.createGain();
          const gainR_to_R = ctx.createGain();

          source.connect(splitter);

          // Splitter ch 0 (Left input) -> gainL_to_L -> merger ch 0 (Left output)
          splitter.connect(gainL_to_L, 0);
          gainL_to_L.connect(merger, 0, 0);

          // Splitter ch 0 (Left input) -> gainL_to_R -> merger ch 1 (Right output)
          splitter.connect(gainL_to_R, 0);
          gainL_to_R.connect(merger, 0, 1);

          // Splitter ch 1 (Right input) -> gainR_to_L -> merger ch 0 (Left output)
          splitter.connect(gainR_to_L, 1);
          gainR_to_L.connect(merger, 0, 0);

          // Splitter ch 1 (Right input) -> gainR_to_R -> merger ch 1 (Right output)
          splitter.connect(gainR_to_R, 1);
          gainR_to_R.connect(merger, 0, 1);

          merger.connect(ctx.destination);

          graph = {
            source,
            splitter,
            merger,
            gainL_to_L,
            gainL_to_R,
            gainR_to_L,
            gainR_to_R,
          };
          pannerGraphMap.current.set(a, graph);
        }

        // Apply real-time channel routing with a smooth 15ms clickless ramp (zero audio interruption)
        const now = ctx.currentTime;
        const rampTime = 0.015;
        if (activePan === "left") {
          // Route all audio channels (L + R) exclusively to Left output (100% Left ear, Right silent)
          graph.gainL_to_L.gain.setTargetAtTime(1.0, now, rampTime);
          graph.gainR_to_L.gain.setTargetAtTime(1.0, now, rampTime);
          graph.gainL_to_R.gain.setTargetAtTime(0.0, now, rampTime);
          graph.gainR_to_R.gain.setTargetAtTime(0.0, now, rampTime);
        } else if (activePan === "right") {
          // Route all audio channels (L + R) exclusively to Right output (100% Right ear, Left silent)
          graph.gainL_to_L.gain.setTargetAtTime(0.0, now, rampTime);
          graph.gainR_to_L.gain.setTargetAtTime(0.0, now, rampTime);
          graph.gainL_to_R.gain.setTargetAtTime(1.0, now, rampTime);
          graph.gainR_to_R.gain.setTargetAtTime(1.0, now, rampTime);
        } else {
          // "both": route equally to both ears so single-channel or stereo rips play in both ears
          graph.gainL_to_L.gain.setTargetAtTime(1.0, now, rampTime);
          graph.gainR_to_L.gain.setTargetAtTime(1.0, now, rampTime);
          graph.gainL_to_R.gain.setTargetAtTime(1.0, now, rampTime);
          graph.gainR_to_R.gain.setTargetAtTime(1.0, now, rampTime);
        }
      } catch {
        // Fallback: already connected or not supported
      }
    },
    [channel, getAudioContext]
  );

  const registerActive = useCallback((a: HTMLAudioElement) => {
    activeAudioSet.current.add(a);
    const cleanup = () => {
      activeAudioSet.current.delete(a);
    };
    a.addEventListener("ended", cleanup, { once: true });
    a.addEventListener("error", cleanup, { once: true });
  }, []);

  const setupIntroSeamlessLoop = useCallback(
    (currentAudio: HTMLAudioElement, forceLoop: boolean = false, remainingLoops: number = 999) => {
      if (remainingLoops <= 0) return;
      if (!forceLoop && !isIntroSeamlessLoopTrack(currentAudio.src)) return;

      let hasCrossfaded = false;
      let timeupdateHandler: (() => void) | null = null;
      let metaHandler: (() => void) | null = null;
      let endedHandler: (() => void) | null = null;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const cleanup = () => {
        if (timer) {
          clearTimeout(timer);
          activeIntroTimers.current.delete(timer);
          timer = null;
        }
        if (timeupdateHandler) {
          currentAudio.removeEventListener("timeupdate", timeupdateHandler);
          timeupdateHandler = null;
        }
        if (metaHandler) {
          currentAudio.removeEventListener("loadedmetadata", metaHandler);
          metaHandler = null;
        }
        if (endedHandler) {
          currentAudio.removeEventListener("ended", endedHandler);
          endedHandler = null;
        }
        activeIntroCleanups.current.delete(cleanup);
      };

      activeIntroCleanups.current.add(cleanup);

      const doCrossfade = () => {
        if (hasCrossfaded) return;
        if (remainingLoops <= 0) {
          cleanup();
          return;
        }
        // Verify currentAudio is still the current active BGM and not paused/stopped intentionally
        if (
          bgm.current !== currentAudio ||
          (currentAudio.paused && !currentAudio.ended) ||
          !activeBgmSet.current.has(currentAudio)
        ) {
          cleanup();
          return;
        }
        hasCrossfaded = true;
        cleanup();

        // Spawn secondary audio instance with identical track
        const nextAudio = new Audio(currentAudio.src);
        nextAudio.loop = false;
        connectPanner(nextAudio);
        registerActive(nextAudio);

        // Recursively arm seamless predictive crossfade loop on the new instance with decremented counter
        if (remainingLoops - 1 > 0) {
          setupIntroSeamlessLoop(nextAudio, forceLoop, remainingLoops - 1);
        }

        // Perform smooth 2.0s crossfade
        crossfadeToBgm(nextAudio, INTRO_CROSSFADE_WINDOW_MS, false, false, true);
      };

      const fallbackDuration = currentAudio.src.includes("contestant_intro")
        ? 38.4
        : currentAudio.src.includes("show_intro")
        ? 37.1
        : CONTEST_INTRO_DURATION_SEC;

      const armTimer = () => {
        if (hasCrossfaded) return;
        const d = currentAudio.duration;
        const totalDuration =
          !isNaN(d) && isFinite(d) && d > 0 ? d : fallbackDuration;
        const triggerTime = Math.max(0, totalDuration - INTRO_CROSSFADE_WINDOW_SEC);
        const cur = currentAudio.currentTime || 0;
        const delayMs = Math.max(0, Math.round((triggerTime - cur) * 1000));

        if (timer) {
          clearTimeout(timer);
          activeIntroTimers.current.delete(timer);
        }

        timer = setTimeout(() => {
          activeIntroTimers.current.delete(timer!);
          timer = null;
          doCrossfade();
        }, delayMs);
        activeIntroTimers.current.add(timer);
      };

      timeupdateHandler = () => {
        if (hasCrossfaded) return;
        const d = currentAudio.duration;
        const totalDuration =
          !isNaN(d) && isFinite(d) && d > 0 ? d : fallbackDuration;
        const triggerTime = Math.max(0, totalDuration - INTRO_CROSSFADE_WINDOW_SEC);
        if (currentAudio.currentTime >= triggerTime) {
          doCrossfade();
        }
      };

      currentAudio.addEventListener("timeupdate", timeupdateHandler);
      endedHandler = () => {
        if (!hasCrossfaded) doCrossfade();
      };
      currentAudio.addEventListener("ended", endedHandler, { once: true });
      currentAudio.addEventListener("play", () => {
        if (!hasCrossfaded) armTimer();
      });

      if (isNaN(currentAudio.duration) || !isFinite(currentAudio.duration) || currentAudio.duration <= 0) {
        metaHandler = () => {
          armTimer();
        };
        currentAudio.addEventListener("loadedmetadata", metaHandler, { once: true });
      }
      armTimer();
    },
    [crossfadeToBgm, connectPanner, registerActive]
  );

  // Global unlock handler for browser autoplay policies & AudioContext resumption
  const unlockAudio = useCallback(() => {
    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      try {
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
      } catch {}
    }
    isAudioUnlockedRef.current = true;
    if (bgm.current && bgm.current.paused && !bgm.current.ended && !isBgmPausedExplicitlyRef.current) {
      if (bgm.current.volume === 0) {
        bgm.current.volume = 0.85;
      }
      bgm.current.play().catch(() => {});
    }
    if (pendingCueRef.current) {
      const p = pendingCueRef.current;
      pendingCueRef.current = null;
      try {
        p();
      } catch {}
    }
  }, [getAudioContext]);

  // Synchronously attach global unlock method on window for immediate access
  if (typeof window !== "undefined") {
    (window as any).__OLYMPIA_UNLOCK_AUDIO__ = unlockAudio;
  }

  // Expose global unlock method on window for direct same-origin invocations
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__OLYMPIA_UNLOCK_AUDIO__ = unlockAudio;
    }
  }, [unlockAudio]);

  // Lắng nghe tín hiệu mở khóa từ parent window (UNLOCK_AUDIO) và tương tác người dùng
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleMsg = (e: MessageEvent) => {
      if (e.data?.type === "UNLOCK_AUDIO") {
        unlockAudio();
      }
    };
    const handleInteraction = () => {
      unlockAudio();
    };
    window.addEventListener("message", handleMsg);
    window.addEventListener("pointerdown", handleInteraction, { passive: true });
    window.addEventListener("keydown", handleInteraction, { passive: true });
    window.addEventListener("click", handleInteraction, { passive: true });
    return () => {
      window.removeEventListener("message", handleMsg);
      window.removeEventListener("pointerdown", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
      window.removeEventListener("click", handleInteraction);
    };
  }, [unlockAudio]);

  // Tự động khởi tạo AudioContext khi hook mount và enabled, đồng thời pre-warm buzzer audio
  useEffect(() => {
    if (enabled) {
      getAudioContext();
      prewarmBuzzerSounds(resolvedSeason);
    }
  }, [enabled, getAudioContext, resolvedSeason]);

  // Dừng toàn bộ âm thanh khi audio bị tắt (enabled = false)
  useEffect(() => {
    if (!enabled) {
      pendingCueRef.current = null;
      stopBgm(true);
      activeAudioSet.current.forEach((a) => {
        try {
          a.pause();
          a.currentTime = 0;
        } catch {}
      });
      activeAudioSet.current.clear();
    }
  }, [enabled, stopBgm]);

  // Lắng nghe sự kiện đổi chế độ kênh âm thanh (Đều 2 bên / Lệch trái / Lệch phải) để cập nhật panner tức thì (nội bộ và liên tab)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateChannelRouting = (newChannel: "both" | "left" | "right") => {
      activeAudioSet.current.forEach((a) => {
        try {
          connectPanner(a, newChannel);
        } catch {}
      });
      activeBgmSet.current.forEach((a) => {
        try {
          connectPanner(a, newChannel);
        } catch {}
      });
      if (bgm.current) {
        try {
          connectPanner(bgm.current, newChannel);
        } catch {}
      }
    };

    const handleChannelChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ channel: "both" | "left" | "right" }>;
      const newChannel =
        customEvent.detail?.channel ||
        (localStorage.getItem("olympia_audio_channel") as any) ||
        "both";
      updateChannelRouting(newChannel);
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "olympia_audio_channel" && e.newValue) {
        updateChannelRouting(e.newValue as "both" | "left" | "right");
      }
    };

    window.addEventListener("olympia_audio_channel_change", handleChannelChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("olympia_audio_channel_change", handleChannelChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, [connectPanner]);

  // Tự động khôi phục BGM mượt mà khi quay lại tab / focus cửa sổ, không khởi động lại bài hát
  useEffect(() => {
    if (typeof document === "undefined") return;
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && enabled) {
        if (bgm.current && bgm.current.paused && !bgm.current.ended && !isBgmPausedExplicitlyRef.current) {
          bgm.current.play().catch(() => {});
        }
        if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
          audioCtxRef.current.resume().catch(() => {});
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  }, [enabled]);

  // Audio-First Fast-Path (0ms): Plays pre-decoded RAM AudioBuffer immediately when socket packet arrives,
  // before React reconciles and paints the visual buzzer/verdict state (~28ms later).
  useEffect(() => {
    if (!enabled) return;
    const handleFastCue: FastCueListener = (cue) => {
      if (!cue || cue.kind === "stop" || !cue.sound) return;
      if (state?.manualAudioMode && !cue.isManual) return;
      if (dispatchedFastCueIds.has(cue.id)) return;
      dispatchedFastCueIds.add(cue.id);
      lastCue.current = cue.id;

      if (
        cue.sound.endsWith("bell_ring") &&
        !cue.sound.includes("KhoiDong") &&
        !cue.sound.includes("VuotChuongNgaiVat") &&
        !cue.sound.includes("VeDich")
      ) {
        pauseBgm();
      }

      const season = resolvedSeason;
      const primaryUrl = `/olympia-audio/${season}/${cue.sound}.mp3`;
      const fallbackUrl = `/olympia-audio/O26/${cue.sound}.mp3`;
      const activePan =
        (typeof window !== "undefined"
          ? (localStorage.getItem("olympia_audio_channel") as any)
          : null) ||
        channel ||
        cue.pan ||
        "both";

      const ctx = getAudioContext();
      const buffer = ramSfxBufferCache.get(primaryUrl) || ramSfxBufferCache.get(fallbackUrl);

      if (ctx && buffer && ctx.state === "running") {
        try {
          const srcNode = ctx.createBufferSource();
          srcNode.buffer = buffer;
          if (cue.playbackRate && cue.playbackRate > 0) {
            srcNode.playbackRate.value = cue.playbackRate;
          }
          const gainNode = ctx.createGain();
          gainNode.gain.value = 0.85;
          srcNode.connect(gainNode);

          if (activePan === "both") {
            gainNode.connect(ctx.destination);
          } else {
            const splitter = ctx.createChannelSplitter(2);
            const merger = ctx.createChannelMerger(2);
            gainNode.connect(splitter);
            if (activePan === "left") {
              splitter.connect(merger, 0, 0);
              splitter.connect(merger, 0, 1);
            } else {
              splitter.connect(merger, 1, 0);
              splitter.connect(merger, 1, 1);
            }
            merger.connect(ctx.destination);
          }
          srcNode.start(0);
          return;
        } catch {}
      }

      // Fallback to prewarmed HTMLAudioElement if RAM buffer is still decoding
      const cached = sfxAudioCache.get(primaryUrl) || sfxAudioCache.get(fallbackUrl);
      const a =
        cached && (cached.paused || cached.ended)
          ? cached
          : cached
          ? (cached.cloneNode(true) as HTMLAudioElement)
          : new Audio(primaryUrl);
      a.currentTime = 0;
      a.volume = 0.85;
      if (cue.playbackRate && cue.playbackRate > 0) {
        a.playbackRate = cue.playbackRate;
        (a as any).preservesPitch = false;
        (a as any).mozPreservesPitch = false;
        (a as any).webkitPreservesPitch = false;
      }
      connectPanner(a, activePan);
      registerActive(a);
      a.play().catch(() => {});
    };

    fastCueListeners.add(handleFastCue);
    return () => {
      fastCueListeners.delete(handleFastCue);
    };
  }, [enabled, audioSeason, channel, getAudioContext, pauseBgm, connectPanner, registerActive, state?.manualAudioMode]);

  useEffect(() => {
    const cue = state?.cue;
    if (!cue) return;
    if (state?.manualAudioMode && !cue.isManual && cue.kind !== "stop") {
      lastCue.current = cue.id;
      return;
    }
    if (dispatchedFastCueIds.has(cue.id)) {
      lastCue.current = cue.id;
      return;
    }
    const isIntroTrackEarly = isIntroOrMusicTrack(cue.sound);
    const isBgmCueEarly = cue.kind === "bgm" || isIntroTrackEarly;

    if (lastCue.current == null) {
      lastCue.current = cue.id;
      // Nếu là âm thanh mở đầu khi tạo phòng ở sảnh chờ (show_intro), cho phép phát đúng 1 lần duy nhất trên lần sync đầu tiên
      if (cue.sound === "6_NhacKhac/show_intro" && state.stage === "lobby" && !hasPlayedIntroLobbyRef.current) {
        if (!enabled || (!audioSeason && !state?.rulesetId)) {
          // audioSeason chưa đến hoặc audio chưa bật → đánh dấu chờ, sẽ phát khi đủ điều kiện
          pendingShowIntroRef.current = true;
          return;
        }
        hasPlayedIntroLobbyRef.current = true;
      } else if (isBgmCueEarly) {
        // R1: Không bỏ qua BGM cues trên lần sync đầu tiên!
        // Cho phép tiếp tục chạy xuống dưới để khởi tạo bgm.current và queue vào pendingCueRef.current
      } else {
        return; // do not replay SFX on first sync
      }
    } else {
      if (cue.id === lastCue.current) {
        if (!bgm.current || bgm.current.ended) return;
        if (isBgmPausedExplicitlyRef.current) return;
        const isKdExpired = Boolean(state?.khoiDong?.globalTimer && state.khoiDong.globalTimer.remainingMs <= 0);
        const isKdDone = state?.khoiDong?.phase === "segmentDone" || state?.khoiDong?.phase === "intro" || !state?.khoiDong?.started;
        if (isKdExpired || isKdDone) return;
        if (enabled && isBgmCueEarly && bgm.current && bgm.current.paused) {
          bgm.current.play().catch(() => {});
        }
        return;
      } else {
        lastCue.current = cue.id;
      }
    }
    if (!enabled) return;

    if (cue.kind === "stop" || !cue.sound) {
      pendingCueRef.current = null;
      stopBgm(true);
      activeAudioSet.current.forEach((a) => {
        try {
          a.pause();
          a.currentTime = 0;
        } catch {}
      });
      activeAudioSet.current.clear();
      return;
    }

    // Khi có âm thanh kết thúc lượt (finish_turn), lập tức dừng toàn bộ countdown BGM đang phát
    if (cue.sound.endsWith("finish_turn")) {
      stopBgm(true);
    }

    if (
      (cue.kind === "bgm" || isIntroTrackEarly) &&
      bgm.current &&
      !bgm.current.paused &&
      bgm.current.src &&
      bgm.current.src.includes(cue.sound.replace(/\.mp3$/, ""))
    ) {
      return; // Continuous playback without restarting
    }

    if (cue.kind === ("pause_bgm" as any)) {
      pauseBgm();
      return;
    }

    if (cue.kind === ("resume_bgm" as any)) {
      resumeBgm();
      return;
    }

    // Tuyệt đối không pause BGM ở vòng Khởi Động, Vượt Chướng Ngại Vật và khi đếm 5s cướp điểm Về Đích khi bấm chuông
    if (
      cue.sound.endsWith("bell_ring") &&
      !cue.sound.includes("KhoiDong") &&
      !cue.sound.includes("VuotChuongNgaiVat") &&
      !cue.sound.includes("VeDich")
    ) {
      pauseBgm();
    }

    const season = resolvedSeason;
    const userPrefChannel = typeof window !== "undefined" ? (localStorage.getItem("olympia_audio_channel") as any) : null;
    const currentChannel = userPrefChannel || channel || cue.pan || "both";
    const activeSeatCount = Math.max(
      state?.seatCount ?? 0,
      state?.seats?.filter((s) => s.connected || s.name).length ?? 0,
      state?.seats?.length ?? 4
    );
    const forceLoopContestantIntro = shouldLoopContestantIntro(cue.sound, activeSeatCount);
    const isIntroTrack = isIntroOrMusicTrack(cue.sound);
    const isBgmCue = cue.kind === "bgm" || isIntroTrack || forceLoopContestantIntro;
    const isCountdown = isCountdownTrack(cue.sound);
    const looping = isBgmCue && !isCountdown && isLoopingBgm(cue.sound);

    const play = (s: string, fallback: boolean) => {
      // Channel routing is handled entirely by WebAudio panner (connectPanner).
      // Always load the base stereo file so channel switches never restart playback.
      let soundUrl: string;
      if (cue.sound.startsWith("/") || cue.sound.startsWith("http")) {
        soundUrl = cue.sound;
      } else if (/^O(?:13-21|22|23|24-25|26)\//.test(cue.sound)) {
        soundUrl = `/olympia-audio/${cue.sound.replace(/\.mp3$/, "")}.mp3`;
      } else {
        soundUrl = `/olympia-audio/${s}/${cue.sound.replace(/\.mp3$/, "")}.mp3`;
      }

      let a: HTMLAudioElement;
      const isFrequentSfx = cue.sound.endsWith("bell_ring") || cue.sound.endsWith("correct") || cue.sound.endsWith("wrong");
      if (isFrequentSfx && sfxAudioCache.has(soundUrl)) {
        const cached = sfxAudioCache.get(soundUrl)!;
        if (cached.paused || cached.ended) {
          cached.currentTime = 0;
          a = cached;
        } else {
          a = cached.cloneNode(true) as HTMLAudioElement;
        }
      } else {
        a = new Audio(soundUrl);
        if (isFrequentSfx) sfxAudioCache.set(soundUrl, a);
      }
      const isOpenQuestion = cue.sound.includes("open_question");
      const defaultSfxVol = isOpenQuestion ? 0.95 : 0.85;
      a.loop = looping;
      a.volume = (isBgmCue && !isCountdown && !isIntroTrack) ? 0 : defaultSfxVol;
      if (cue.playbackRate && cue.playbackRate > 0) {
        a.playbackRate = cue.playbackRate;
        (a as any).preservesPitch = false;
        (a as any).mozPreservesPitch = false;
        (a as any).webkitPreservesPitch = false;
      }
      connectPanner(a, currentChannel);
      registerActive(a);

      a.onerror = () => {
        // Always using base stereo file; on error fall back to O26 only if not in O13-21 ruleset.
        if (fallback && s !== "O26" && !s.includes("O13-21")) {
          play("O26", false);
        } else if (/tick_(?:10|40)s/.test(cue.sound)) {
          const altSound = cue.sound.replace(/tick_(?:10|40)s/, "tick_20s");
          const alt = new Audio(`/olympia-audio/${s}/${altSound}.mp3`);
          registerActive(alt);
          if (isBgmCue) crossfadeToBgm(alt, BGM_CROSSFADE_MS, isCountdown, isIntroTrack);
          else {
            alt.play().catch((err) => {
              if (err && err.name === "NotAllowedError") {
                pendingCueRef.current = () => {
                  alt.currentTime = 0;
                  alt.play().catch(() => {});
                };
              }
            });
          }
        }
      };

      if (cue.kind === "sound" && (cue.sound.includes("start_round") || cue.sound.includes("open_question") || cue.sound.includes("ready"))) {
        // USER REQUIREMENT: Khi chuyển vòng hoặc mở câu hỏi, crossfade tắt ngay âm thanh intro/chào thí sinh trong 1s (chỉ tắt khi không kích hoạt bgmSound đồng thời)
        if (!cue.bgmSound) {
          fadeOutAndStopBgm(1000);
        }
      }

      if (cue.bgmSound) {
        const bgmTrack = cue.bgmSound;
        // Always load base stereo file; channel routing via WebAudio panner only
        const bgmUrl = `/olympia-audio/${season}/${bgmTrack}.mp3`;

        const bgmAudio = new Audio(bgmUrl);
        bgmAudio.loop = isLoopingBgm(bgmTrack);
        bgmAudio.volume = 0;
        connectPanner(bgmAudio, currentChannel);
        registerActive(bgmAudio);
        crossfadeToBgm(bgmAudio, BGM_CROSSFADE_MS, false, false);
      }

      if (isBgmCue) {
        crossfadeToBgm(a, BGM_CROSSFADE_MS, isCountdown, isIntroTrack);
        const isOpeningContestIntro = cue.sound.includes("contest_intro") || cue.sound.includes("show_intro");
        // Opening theme ("contest_intro", "show_intro") plays strictly ONCE (remainingLoops = 0)
        // Contestant intro plays bounded loops matching entrance duration for N > 4
        const maxLoops = isOpeningContestIntro
          ? 0
          : forceLoopContestantIntro
            ? Math.max(0, calculateRequiredIntroLoops(activeSeatCount) - 1)
            : 0;

        if (maxLoops > 0) {
          setupIntroSeamlessLoop(a, forceLoopContestantIntro, maxLoops);
        }
      } else {
        a.volume = defaultSfxVol;
        a.play().catch((err) => {
          if (err && err.name === "NotAllowedError") {
            pendingCueRef.current = () => {
              a.currentTime = 0;
              a.play().catch(() => {});
            };
          }
        });
      }
    };
    play(season, true);
  }, [
    state?.cue,
    state?.stage,
    state?.seatCount,
    state?.seats?.length,
    audioSeason,
    enabled,
    channel,
    stopBgm,
    pauseBgm,
    resumeBgm,
    getAudioContext,
    crossfadeToBgm,
    fadeOutAndStopBgm,
    setupIntroSeamlessLoop,
    connectPanner,
    registerActive,
  ]);

  useEffect(() => () => {
    pendingCueRef.current = null;
    stopBgm();
  }, [stopBgm]);

  // Khi trận đấu đã bắt đầu (stage !== "lobby"), tự động ngắt ngay lập tức nhạc sảnh chờ show_intro nếu vẫn còn đang phát
  useEffect(() => {
    if (!state || state.stage === "lobby") return;
    pendingShowIntroRef.current = false;
    activeBgmSet.current.forEach((a) => {
      if (a.src && a.src.includes("show_intro")) {
        try {
          a.pause();
          a.currentTime = 0;
          a.src = "";
        } catch {}
        activeBgmSet.current.delete(a);
      }
    });
    if (bgm.current && bgm.current.src && bgm.current.src.includes("show_intro")) {
      try {
        bgm.current.pause();
        bgm.current.currentTime = 0;
        bgm.current.src = "";
      } catch {}
      bgm.current = null;
    }
  }, [state?.stage]);

  // Khi màn chào & giới thiệu thí sinh hoàn thành (entranceCompleted = true),
  // tự động ngắt ngay nhạc giới thiệu contestant_intro nếu vẫn còn đang phát dở dang.
  useEffect(() => {
    if (!state?.entranceCompleted) return;
    const hasContestantIntroPlaying =
      Array.from(activeBgmSet.current).some(
        (a) => a.src && a.src.includes("contestant_intro") && !a.paused
      ) ||
      Boolean(bgm.current?.src && bgm.current.src.includes("contestant_intro") && !bgm.current.paused);
    if (hasContestantIntroPlaying) {
      fadeOutAndStopBgm(1000);
    }
  }, [state?.entranceCompleted, fadeOutAndStopBgm]);

  // Retry show_intro khi audioSeason vừa arrive hoặc unmuting (fix race condition: state đến trước audioSeason)
  useEffect(() => {
    const effectiveSeason = (state?.rulesetId && RULESETS[state.rulesetId]?.audioSeason) || audioSeason;
    if (!effectiveSeason || !pendingShowIntroRef.current || !enabled) return;
    pendingShowIntroRef.current = false;
    hasPlayedIntroLobbyRef.current = true;
    if (state?.stage && state.stage !== "lobby") return;
    const season = effectiveSeason;
    const tryPlay = (s: string) => {
      const a = new Audio(`/olympia-audio/${s}/6_NhacKhac/show_intro.mp3`);
      a.volume = 0.85;
      registerActiveFromIntro(a);
      crossfadeToBgm(a, BGM_CROSSFADE_MS, false, true);
      // show_intro plays strictly ONCE without looping
      a.onerror = () => {
        if (s !== "O26" && !s.includes("O13-21")) tryPlay("O26"); // fallback only if not in O13-21
      };
    };
    const registerActiveFromIntro = (a: HTMLAudioElement) => {
      activeAudioSet.current.add(a);
      const cleanup = () => activeAudioSet.current.delete(a);
      a.addEventListener("ended", cleanup, { once: true });
      a.addEventListener("error", cleanup, { once: true });
    };
    tryPlay(season);
  }, [audioSeason, enabled, state?.stage, crossfadeToBgm, setupIntroSeamlessLoop]);
}

export function useStableToken(): string {
  return useMemo(() => {
    if (typeof window === "undefined") return "";
    // Use sessionStorage so each browser tab gets its own unique contestant token (allowing multi-tab testing on 1 machine)
    // while still persisting across F5 page reloads within the same tab.
    let t = sessionStorage.getItem("olympia_player_token");
    if (!t) {
      t = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36)).slice(0, 60);
      sessionStorage.setItem("olympia_player_token", t);
    }
    return t;
  }, []);
}
