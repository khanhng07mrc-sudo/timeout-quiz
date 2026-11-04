"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { OlympiaState, TimerState } from "@/lib/olympia/types";

export type OlympiaRole = "host" | "display" | "player";

export interface JoinInfo {
  ok: boolean;
  error?: string;
  seatId?: number;
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
  enabled?: boolean;
}

export function useOlympiaSocket({ code, role, hostKey, name, token, enabled = true }: Options) {
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

  const persistState = useCallback(
    (s: OlympiaState) => {
      setState(s);
      if (typeof window !== "undefined" && code) {
        try {
          sessionStorage.setItem(cacheKeyState, JSON.stringify(s));
        } catch {}
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
      socket.emit("join", { code, role, key: hostKey, name, token }, (res: JoinInfo) => {
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

    return () => {
      clearInterval(retryTimer);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [code, role, hostKey, name, token, enabled, cacheKeyJoin, persistState]);

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

export const isCountdownTrack = (sound: string): boolean =>
  /(?:(?:^|\/)(?:\d+s(?:_tick|_steal|_practice)?|tick_\d+s))$/.test(sound) ||
  /(?:10s_tick|15s_tick|20s_tick|30s_tick|40s_tick|5s_steal|20s_practice|30s_practice|40s_practice|60s_practice|60s|30s|90s)$/.test(sound);

export const isLoopingBgm = (sound: string): boolean =>
  /kd_bgm_[12]$/.test(sound) || /loop/.test(sound);

export const isIntroOrMusicTrack = (sound: string): boolean =>
  /(?:show_intro|contest_intro|contestant_intro|ending_music|summary|prize_award)$/.test(sound);

/** Plays server "cue" events. Missing files fall back to O26, then fail silently. */
export function useOlympiaAudio(
  state: OlympiaState | null,
  audioSeason: string | undefined,
  enabled: boolean,
  channel?: "both" | "left" | "right"
) {
  const lastCue = useRef<number | null>(null);
  const hasPlayedIntroLobbyRef = useRef(false);
  const pendingShowIntroRef = useRef(false); // set when show_intro fired before audioSeason arrived
  const bgm = useRef<HTMLAudioElement | null>(null);
  const activeBgmSet = useRef<Set<HTMLAudioElement>>(new Set());
  const activeFadeTimers = useRef<Set<ReturnType<typeof setInterval>>>(new Set());
  const activeAudioSet = useRef<Set<HTMLAudioElement>>(new Set());
  const audioCtxRef = useRef<AudioContext | null>(null);

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
    activeFadeTimers.current.forEach((t) => clearInterval(t));
    activeFadeTimers.current.clear();

    activeBgmSet.current.forEach((a) => {
      try {
        a.pause();
        a.currentTime = 0;
        a.src = "";
      } catch {}
    });
    activeBgmSet.current.clear();

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
      fadeOldOnly: boolean = false
    ) => {
      const old = bgm.current;
      // Nếu cùng nguồn âm thanh đang phát thì bỏ qua không lặp lại; nếu đã kết thúc hoặc pause thì reset và phát lại
      if (old && old.src === newAudio.src) {
        if (old.paused) {
          if (old.ended) old.currentTime = 0;
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

      const targetVol = 0.85;

      if (immediate) {
        // Countdown track: ngắt ngay track nhạc cũ và phát âm lượng đầy đủ ngay lập tức
        if (old && !old.paused) {
          try {
            old.pause();
            old.currentTime = 0;
            old.src = "";
          } catch {}
          activeBgmSet.current.delete(old);
        }
        newAudio.volume = targetVol;
        newAudio.play().catch(() => {});
        return;
      }

      newAudio.volume = fadeOldOnly ? targetVol : 0;
      newAudio.play().catch(() => {});

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
    },
    []
  );

  const pauseBgm = useCallback(() => {
    if (bgm.current && !bgm.current.paused) {
      bgm.current.pause();
    }
  }, []);

  const resumeBgm = useCallback(() => {
    if (bgm.current && bgm.current.paused) {
      bgm.current.play().catch(() => {});
    }
  }, []);

  // Tự động khôi phục BGM mượt mà khi quay lại tab, không khởi động lại bài hát
  useEffect(() => {
    if (typeof document === "undefined") return;
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && enabled) {
        if (bgm.current && bgm.current.paused && !bgm.current.ended) {
          bgm.current.play().catch(() => {});
        }
        if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
          audioCtxRef.current.resume().catch(() => {});
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [enabled]);

  useEffect(() => {
    const cue = state?.cue;
    if (!cue) return;
    if (lastCue.current == null) {
      lastCue.current = cue.id;
      // Nếu là âm thanh mở đầu khi tạo phòng ở sảnh chờ (show_intro), cho phép phát đúng 1 lần duy nhất trên lần sync đầu tiên
      if (cue.sound === "6_NhacKhac/show_intro" && state.stage === "lobby" && !hasPlayedIntroLobbyRef.current) {
        hasPlayedIntroLobbyRef.current = true;
        if (!audioSeason) {
          // audioSeason chưa đến (race condition) → đánh dấu chờ, sẽ phát khi audioSeason arrive
          pendingShowIntroRef.current = true;
          return;
        }
        // audioSeason đã có, tiếp tục phát bình thường bên dưới
      } else {
        return; // do not replay on first sync
      }
    } else {
      if (cue.id === lastCue.current) return;
      lastCue.current = cue.id;
    }
    if (!enabled) return;

    if (cue.kind === "stop" || !cue.sound) {
      stopBgm();
      return;
    }

    // Khi có âm thanh kết thúc lượt (finish_turn), dừng nhạc nền cũ để hiệu ứng kết thúc lượt ngân vang rõ nét
    if (cue.sound.endsWith("finish_turn")) {
      stopBgm();
    }

    if (cue.kind === "bgm" && bgm.current && !bgm.current.paused && bgm.current.src && bgm.current.src.includes(cue.sound)) {
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

    // Tuyệt đối không pause BGM ở vòng Khởi Động khi bấm chuông (chuông là SFX phát đè lên BGM)
    if (cue.sound.endsWith("bell_ring") && !cue.sound.includes("KhoiDong") && !cue.sound.includes("VuotChuongNgaiVat")) {
      pauseBgm();
    }

    const season = audioSeason || "O26";
    const currentChannel = cue.pan || channel || (typeof window !== "undefined" ? (localStorage.getItem("olympia_audio_channel") as any) || "both" : "both");
    const isIntroTrack = isIntroOrMusicTrack(cue.sound);
    const isBgmCue = cue.kind === "bgm" || isIntroTrack;
    const isCountdown = isCountdownTrack(cue.sound);
    const looping = isBgmCue && !isCountdown && isLoopingBgm(cue.sound);

    const connectPanner = (a: HTMLAudioElement) => {
      // Khi phát cả 2 kênh (both) tiêu chuẩn, không gắn MediaElementSource để tránh lỗi AudioContext bị suspended do Autoplay
      if (currentChannel === "both") return;
      const ctx = getAudioContext();
      if (ctx && ctx.state === "running" && ctx.createStereoPanner) {
        try {
          const source = ctx.createMediaElementSource(a);
          const panner = ctx.createStereoPanner();
          panner.pan.value = currentChannel === "left" ? -1.0 : currentChannel === "right" ? 1.0 : 0.0;
          source.connect(panner);
          panner.connect(ctx.destination);
        } catch {
          // Fallback: already connected or not supported
        }
      }
    };

    const registerActive = (a: HTMLAudioElement) => {
      activeAudioSet.current.add(a);
      const cleanup = () => {
        activeAudioSet.current.delete(a);
      };
      a.addEventListener("ended", cleanup, { once: true });
      a.addEventListener("error", cleanup, { once: true });
    };

    const play = (s: string, fallback: boolean) => {
      let soundUrl = `/olympia-audio/${s}/${cue.sound}.mp3`;
      if (currentChannel === "left") soundUrl = `/olympia-audio/${s}/${cue.sound}_left.mp3`;
      else if (currentChannel === "right") soundUrl = `/olympia-audio/${s}/${cue.sound}_right.mp3`;

      const a = new Audio(soundUrl);
      const isOpenQuestion = cue.sound.includes("open_question");
      const defaultSfxVol = isOpenQuestion ? 0.95 : 0.85;
      a.loop = looping;
      a.volume = (isBgmCue && !isCountdown && !isIntroTrack) ? 0 : defaultSfxVol;
      connectPanner(a);
      registerActive(a);

      a.onerror = () => {
        if (currentChannel !== "both" && soundUrl !== `/olympia-audio/${s}/${cue.sound}.mp3`) {
          const std = new Audio(`/olympia-audio/${s}/${cue.sound}.mp3`);
          std.loop = looping;
          std.volume = (isBgmCue && !isCountdown && !isIntroTrack) ? 0 : defaultSfxVol;
          connectPanner(std);
          registerActive(std);
          if (isBgmCue) {
            crossfadeToBgm(std, BGM_CROSSFADE_MS, isCountdown, isIntroTrack);
          } else {
            std.volume = defaultSfxVol;
            std.play().catch(() => {});
          }
          return;
        }
        if (fallback && s !== "O26") {
          play("O26", false);
        } else if (/tick_(?:10|40)s/.test(cue.sound)) {
          const altSound = cue.sound.replace(/tick_(?:10|40)s/, "tick_20s");
          const alt = new Audio(`/olympia-audio/${s}/${altSound}.mp3`);
          registerActive(alt);
          if (isBgmCue) crossfadeToBgm(alt, BGM_CROSSFADE_MS, isCountdown, isIntroTrack);
          else alt.play().catch(() => {});
        }
      };

      if (cue.kind === "sound" && (cue.sound.includes("start_round") || cue.sound.includes("open_question") || cue.sound.includes("ready"))) {
        // USER REQUIREMENT: Khi chuyển vòng hoặc mở câu hỏi, crossfade tắt ngay âm thanh intro/chào thí sinh trong 1s
        fadeOutAndStopBgm(1000);
      }

      if (isBgmCue) {
        crossfadeToBgm(a, BGM_CROSSFADE_MS, isCountdown, isIntroTrack);
      } else {
        a.volume = defaultSfxVol;
        a.play().catch(() => {});
      }
    };
    play(season, true);
  }, [state?.cue, audioSeason, enabled, channel, stopBgm, pauseBgm, resumeBgm, getAudioContext, crossfadeToBgm, fadeOutAndStopBgm]);

  useEffect(() => () => stopBgm(), [stopBgm]);

  // Khi trận đấu đã bắt đầu (stage !== "lobby"), tự động crossfade tắt nhạc sảnh chờ show_intro nếu vẫn còn đang phát
  useEffect(() => {
    if (!state || state.stage === "lobby") return;
    pendingShowIntroRef.current = false;
    const hasLobbyIntroPlaying = Array.from(activeBgmSet.current).some(
      (a) => a.src && a.src.includes("show_intro") && !a.paused
    );
    if (hasLobbyIntroPlaying && (!state.cue || state.cue.sound === "6_NhacKhac/show_intro")) {
      fadeOutAndStopBgm(1000);
    }
  }, [state?.stage, state?.cue, fadeOutAndStopBgm]);

  // Retry show_intro khi audioSeason vừa arrive (fix race condition: state đến trước audioSeason)
  useEffect(() => {
    if (!audioSeason || !pendingShowIntroRef.current || !enabled) return;
    pendingShowIntroRef.current = false;
    if (state?.stage && state.stage !== "lobby") return;
    const season = audioSeason;
    const tryPlay = (s: string) => {
      const a = new Audio(`/olympia-audio/${s}/6_NhacKhac/show_intro.mp3`);
      a.volume = 0.85;
      registerActiveFromIntro(a);
      crossfadeToBgm(a, BGM_CROSSFADE_MS, false, true);
      a.onerror = () => {
        if (s !== "O26") tryPlay("O26"); // fallback
      };
    };
    const registerActiveFromIntro = (a: HTMLAudioElement) => {
      activeAudioSet.current.add(a);
      const cleanup = () => activeAudioSet.current.delete(a);
      a.addEventListener("ended", cleanup, { once: true });
      a.addEventListener("error", cleanup, { once: true });
    };
    tryPlay(season);
  }, [audioSeason, enabled, state?.stage, crossfadeToBgm]);
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
