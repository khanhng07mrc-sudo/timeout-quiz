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
  const bgmFadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

  /** Fade out the old BGM over durationMs, then stop it. Returns the old audio element. */
  const fadeOutOldBgm = useCallback((old: HTMLAudioElement, durationMs: number) => {
    if (old.paused || old.volume <= 0) {
      try { old.pause(); old.currentTime = 0; } catch {}
      return;
    }
    if (bgmFadeTimerRef.current) clearInterval(bgmFadeTimerRef.current);
    const steps = 20;
    const stepMs = Math.max(15, Math.floor(durationMs / steps));
    const startVol = old.volume;
    const volStep = startVol / steps;
    let step = 0;
    bgmFadeTimerRef.current = setInterval(() => {
      step++;
      const newVol = Math.max(0, startVol - volStep * step);
      try { old.volume = newVol; } catch {}
      if (step >= steps || newVol <= 0) {
        if (bgmFadeTimerRef.current) clearInterval(bgmFadeTimerRef.current);
        bgmFadeTimerRef.current = null;
        try { old.pause(); old.currentTime = 0; } catch {}
      }
    }, stepMs);
  }, []);

  const stopBgm = useCallback(() => {
    if (bgmFadeTimerRef.current) {
      clearInterval(bgmFadeTimerRef.current);
      bgmFadeTimerRef.current = null;
    }
    if (bgm.current) {
      try { bgm.current.pause(); bgm.current.currentTime = 0; } catch {}
      bgm.current = null;
    }
  }, []);

  /** Crossfade to a new BGM element. Old BGM fades out while new BGM fades in. */
  const crossfadeToBgm = useCallback((newAudio: HTMLAudioElement, durationMs: number) => {
    const old = bgm.current;
    // Nếu cùng nguồn âm thanh đang phát thì bỏ qua không lặp lại
    if (old && !old.paused && old.src === newAudio.src) {
      return;
    }

    bgm.current = newAudio;
    newAudio.volume = 0;
    newAudio.play().catch(() => {});

    if (old && !old.paused) {
      fadeOutOldBgm(old, durationMs);
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
      if (step >= steps || newVol >= targetVol || bgm.current !== newAudio) {
        clearInterval(fadeInTimer);
      }
    }, stepMs);
  }, [fadeOutOldBgm]);

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

    if (cue.sound.endsWith("bell_ring") && !cue.sound.includes("VuotChuongNgaiVat")) {
      pauseBgm();
    }

    const season = audioSeason || "O26";
    const currentChannel = cue.pan || channel || (typeof window !== "undefined" ? (localStorage.getItem("olympia_audio_channel") as any) || "both" : "both");
    const isBgmCue = cue.kind === "bgm";

    const connectPanner = (a: HTMLAudioElement) => {
      const ctx = getAudioContext();
      if (ctx && ctx.createStereoPanner) {
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
      const looping = isBgmCue && (/kd_bgm_[123]$/.test(cue.sound) || /loop/.test(cue.sound));
      a.loop = looping;
      a.volume = isBgmCue ? 0 : 0.75; // BGM starts at 0 for fade-in; SFX at normal volume
      connectPanner(a);

      a.onerror = () => {
        if (currentChannel !== "both" && soundUrl !== `/olympia-audio/${s}/${cue.sound}.mp3`) {
          const std = new Audio(`/olympia-audio/${s}/${cue.sound}.mp3`);
          std.loop = looping;
          std.volume = isBgmCue ? 0 : 0.75;
          connectPanner(std);
          if (isBgmCue) {
            crossfadeToBgm(std, BGM_CROSSFADE_MS);
          } else {
            std.volume = 0.75;
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
        a.volume = 0.75;
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
