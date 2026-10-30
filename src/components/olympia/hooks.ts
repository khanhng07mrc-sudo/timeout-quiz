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
  const [state, setState] = useState<OlympiaState | null>(null);
  const [join, setJoin] = useState<JoinInfo | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const offsetRef = useRef(0);
  const versionRef = useRef(-1);

  useEffect(() => {
    if (!enabled || !code) return;
    const socket = io("/olympia", { transports: ["websocket", "polling"], reconnection: true });
    socketRef.current = socket;

    const doJoin = () => {
      versionRef.current = -1;
      const t0 = Date.now();
      socket.emit("time:sync", t0, (r: { serverTime: number }) => {
        const t1 = Date.now();
        offsetRef.current = r.serverTime + (t1 - t0) / 2 - t1;
      });
      socket.emit("join", { code, role, key: hostKey, name, token }, (res: JoinInfo) => setJoin(res));
    };
    socket.on("connect", () => {
      setConnected(true);
      doJoin();
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("state", (s: OlympiaState) => {
      versionRef.current = s.version;
      setState(s);
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [code, role, hostKey, name, token, enabled]);

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
  return { state, join, connected, emit, serverNow };
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

/** Plays server "cue" events. Missing files fall back to O26, then fail silently. */
export function useOlympiaAudio(
  state: OlympiaState | null,
  audioSeason: string | undefined,
  enabled: boolean,
  channel?: "both" | "left" | "right"
) {
  const lastCue = useRef<number | null>(null);
  const bgm = useRef<HTMLAudioElement | null>(null);
  const activeBgmSet = useRef<Set<HTMLAudioElement>>(new Set());
  const activeFadeTimers = useRef<Set<ReturnType<typeof setInterval>>>(new Set());
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

  const stopBgm = useCallback(() => {
    killAllBgmAudio();
  }, [killAllBgmAudio]);

  /** Crossfade to a new BGM element. Old BGM fades out while new BGM fades in. Triệt tiêu hoàn toàn hiện tượng kẹt nhạc. */
  const crossfadeToBgm = useCallback((newAudio: HTMLAudioElement, durationMs: number) => {
    const old = bgm.current;
    // Nếu cùng nguồn âm thanh đang phát thì bỏ qua không lặp lại, nếu đang pause thì phát tiếp
    if (old && old.src === newAudio.src) {
      if (old.paused) old.play().catch(() => {});
      return;
    }

    // Dừng dứt điểm các track nhạc cũ trước đó nữa nếu đang fade dở dang
    activeBgmSet.current.forEach((a) => {
      if (a !== old && a !== newAudio) {
        try { a.pause(); a.currentTime = 0; a.src = ""; } catch {}
        activeBgmSet.current.delete(a);
      }
    });

    activeBgmSet.current.add(newAudio);
    bgm.current = newAudio;
    newAudio.volume = 0;
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
        try { old.volume = newVol; } catch {}
        if (step >= steps || newVol <= 0 || !activeBgmSet.current.has(old)) {
          clearInterval(fadeTimer);
          activeFadeTimers.current.delete(fadeTimer);
          try { old.pause(); old.currentTime = 0; old.src = ""; } catch {}
          activeBgmSet.current.delete(old);
        }
      }, stepMs);
      activeFadeTimers.current.add(fadeTimer);
    }

    // Fade in new audio
    const targetVol = 0.75;
    const steps = 20;
    const stepMs = Math.max(15, Math.floor(durationMs / steps));
    const volStep = targetVol / steps;
    let step = 0;
    const fadeInTimer = setInterval(() => {
      step++;
      const newVol = Math.min(targetVol, volStep * step);
      try { newAudio.volume = newVol; } catch {}
      if (step >= steps || newVol >= targetVol || bgm.current !== newAudio || !activeBgmSet.current.has(newAudio)) {
        clearInterval(fadeInTimer);
        activeFadeTimers.current.delete(fadeInTimer);
      }
    }, stepMs);
    activeFadeTimers.current.add(fadeInTimer);
  }, []);

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

  useEffect(() => {
    const cue = state?.cue;
    if (!cue) return;
    if (lastCue.current == null) {
      lastCue.current = cue.id; // do not replay on first sync
      return;
    }
    if (cue.id === lastCue.current) return;
    lastCue.current = cue.id;
    if (!enabled) return;

    if (cue.kind === "stop" || !cue.sound) {
      stopBgm();
      return;
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
    const isBgmCue = cue.kind === "bgm";

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

    const play = (s: string, fallback: boolean) => {
      let soundUrl = `/olympia-audio/${s}/${cue.sound}.mp3`;
      if (currentChannel === "left") soundUrl = `/olympia-audio/${s}/${cue.sound}_left.mp3`;
      else if (currentChannel === "right") soundUrl = `/olympia-audio/${s}/${cue.sound}_right.mp3`;

      const a = new Audio(soundUrl);
      const looping = isBgmCue && (/kd_bgm_[123]$/.test(cue.sound) || /loop/.test(cue.sound) || /(?:30|60|90)s$/.test(cue.sound));
      const isOpenQuestion = cue.sound.includes("open_question");
      const defaultSfxVol = isOpenQuestion ? 0.95 : 0.75;
      a.loop = looping;
      a.volume = isBgmCue ? 0 : defaultSfxVol; // BGM starts at 0 for fade-in; SFX at normal/boosted volume
      connectPanner(a);

      a.onerror = () => {
        if (currentChannel !== "both" && soundUrl !== `/olympia-audio/${s}/${cue.sound}.mp3`) {
          const std = new Audio(`/olympia-audio/${s}/${cue.sound}.mp3`);
          std.loop = looping;
          std.volume = isBgmCue ? 0 : defaultSfxVol;
          connectPanner(std);
          if (isBgmCue) {
            crossfadeToBgm(std, BGM_CROSSFADE_MS);
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
          if (isBgmCue) crossfadeToBgm(alt, BGM_CROSSFADE_MS);
          else alt.play().catch(() => {});
        }
      };

      if (isBgmCue) {
        crossfadeToBgm(a, BGM_CROSSFADE_MS);
      } else {
        a.volume = defaultSfxVol;
        a.play().catch(() => {});
      }
    };
    play(season, true);
  }, [state?.cue, audioSeason, enabled, channel, stopBgm, pauseBgm, resumeBgm, getAudioContext, crossfadeToBgm]);

  useEffect(() => () => stopBgm(), [stopBgm]);
}

export function useStableToken(): string {
  return useMemo(() => {
    if (typeof window === "undefined") return "";
    let t = localStorage.getItem("olympia_player_token");
    if (!t) {
      t = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36)).slice(0, 60);
      localStorage.setItem("olympia_player_token", t);
    }
    return t;
  }, []);
}
