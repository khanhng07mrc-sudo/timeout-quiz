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

/** Plays server "cue" events. Missing files fall back to O26, then fail silently. */
export function useOlympiaAudio(state: OlympiaState | null, audioSeason: string | undefined, enabled: boolean) {
  const lastCue = useRef<number | null>(null);
  const bgm = useRef<HTMLAudioElement | null>(null);

  const stopBgm = useCallback(() => {
    if (bgm.current) {
      bgm.current.pause();
      bgm.current = null;
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
    const season = audioSeason || "O26";
    const play = (s: string, fallback: boolean) => {
      const a = new Audio(`/olympia-audio/${s}/${cue.sound}.mp3`);
      const looping = cue.kind === "bgm" && /kd_bgm_[12]$/.test(cue.sound);
      a.loop = looping;
      a.onerror = () => {
        if (fallback && s !== "O26") play("O26", false);
      };
      if (cue.kind === "bgm") {
        stopBgm();
        bgm.current = a;
      }
      a.play().catch(() => {});
    };
    play(season, true);
  }, [state?.cue, audioSeason, enabled, stopBgm]);

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
