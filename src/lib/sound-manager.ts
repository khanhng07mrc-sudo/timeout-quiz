// Quizorra - Studio Audio Engine (Đường lên đỉnh Olympia Official Audio Edition)
// High-fidelity gameshow audio player featuring authentic Olympia soundtracks, smooth transitions, and instant SFX.

type SFXKey = "tick" | "buzz" | "correct" | "wrong" | "go" | "fanfare" | "powerup" | "timeout";
type BGMKey = "lobby" | "olympia_5s" | "olympia_15s" | "olympia_20s" | "olympia_30s" | "olympia_60s" | "question_suspense" | "wheel_spin";

interface AudioSourceConfig {
  primary: string;
  fallbacks: string[];
}

const SFX_CONFIG: Record<SFXKey, AudioSourceConfig> = {
  tick: { primary: "/sounds/tick.mp3", fallbacks: ["/sounds/tick.wav"] },
  go: { primary: "/sounds/go.mp3", fallbacks: ["/sounds/go.wav"] },
  buzz: { primary: "/sounds/olympia_buzz.mp3", fallbacks: ["/sounds/buzz.mp3", "/sounds/buzz.wav"] },
  correct: { primary: "/sounds/correct.mp3", fallbacks: ["/sounds/correct.wav"] },
  wrong: { primary: "/sounds/wrong.ogg", fallbacks: ["/sounds/wrong.mp3", "/sounds/wrong.wav"] },
  fanfare: { primary: "", fallbacks: [] },
  powerup: { primary: "/sounds/powerup.mp3", fallbacks: ["/sounds/powerup.wav"] },
  timeout: { primary: "/sounds/timeout.mp3", fallbacks: ["/sounds/buzz.mp3"] },
};

const BGM_CONFIG: Record<BGMKey, AudioSourceConfig> = {
  lobby: { primary: "/sounds/lobby.mp3", fallbacks: ["/sounds/lobby.ogg", "/sounds/lobby.wav"] },
  olympia_5s: { primary: "/sounds/olympia_5s.mp3", fallbacks: ["/sounds/olympia_5s_left.mp3"] },
  olympia_15s: { primary: "/sounds/olympia_15s.mp3", fallbacks: ["/sounds/question_suspense.mp3"] },
  olympia_20s: { primary: "/sounds/olympia_20s.ogg", fallbacks: ["/sounds/olympia_20s.mp3", "/sounds/question_suspense.mp3"] },
  olympia_30s: { primary: "/sounds/olympia_30s.mp3", fallbacks: ["/sounds/question_suspense.mp3"] },
  olympia_60s: { primary: "/sounds/olympia_60s.mp3", fallbacks: ["/sounds/olympia_30s.mp3", "/sounds/question_suspense.mp3"] },
  question_suspense: { primary: "/sounds/question_suspense.mp3", fallbacks: ["/sounds/question_suspense.wav"] },
  wheel_spin: { primary: "/sounds/wheel_spin.mp3", fallbacks: [] },
};

class SoundManager {
  private isMuted: boolean = false;
  private volume: number = 0.8;

  // Background Music tracks
  private currentMusicAudio: HTMLAudioElement | null = null;
  private currentMusicType: "LOBBY" | "QUESTION" | "VICTORY" | null = null;
  private currentMusicKey: BGMKey | null = null;
  private currentPlayingQuestionId: string | null = null;
  private lastMusicStartTime: number = 0;
  private fadeInterval: NodeJS.Timeout | null = null;
  private questionMusicTimeout: NodeJS.Timeout | null = null;
  private activeFadeMap: Map<HTMLAudioElement, NodeJS.Timeout> = new Map();

  // Pending audio track if blocked by browser autoplay policy
  private pendingMusicTrack: {
    type: "LOBBY" | "QUESTION";
    audioKey: BGMKey;
    targetVolFactor: number;
    crossfadeMs: number;
    questionId?: string;
  } | null = null;
  private unlockListenerAttached: boolean = false;

  // Preloaded audio elements
  private sfxMap: Map<string, HTMLAudioElement> = new Map();
  private bgmMap: Map<string, HTMLAudioElement> = new Map();
  private currentFanfareAudio: HTMLAudioElement | null = null;
  private wheelSpinAudio: HTMLAudioElement | null = null;
  private wheelSpinStartingTime: number = 0;
  private initialized: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.initAudioAssets();
      this.setupGlobalUnlockListener();
      this.setupVisibilityListener();
    }
  }

  private setupVisibilityListener() {
    if (typeof document === "undefined") return;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        if (this.currentMusicType === "LOBBY" && this.currentMusicAudio && this.currentMusicAudio.paused && !this.isMuted) {
          this.currentMusicAudio.play().catch(() => {});
        }
      }
    });
  }

  private setupGlobalUnlockListener() {
    if (typeof window === "undefined" || this.unlockListenerAttached) return;
    this.unlockListenerAttached = true;
    const unlockEvents = ["pointerdown", "touchstart", "click", "keydown"];
    const handleInteraction = () => {
      unlockEvents.forEach((ev) => window.removeEventListener(ev, handleInteraction, true));
      this.unlockListenerAttached = false;
      this.unlockAudio();
    };
    unlockEvents.forEach((ev) => window.addEventListener(ev, handleInteraction, { capture: true, once: false }));
  }

  private createAudioWithFallbacks(config: AudioSourceConfig, loop: boolean = false): HTMLAudioElement {
    const audio = new Audio();
    const sources = [config.primary, ...config.fallbacks];
    let currentIndex = 0;

    const tryNext = () => {
      currentIndex++;
      if (currentIndex < sources.length) {
        audio.src = sources[currentIndex];
        audio.load();
      }
    };

    audio.onerror = tryNext;
    audio.src = sources[0];
    audio.preload = "auto";
    audio.loop = loop;
    audio.volume = this.volume;

    if (loop) {
      audio.addEventListener("ended", () => {
        if (this.currentMusicAudio === audio && !this.isMuted) {
          try {
            audio.currentTime = 0;
            audio.play().catch(() => {});
          } catch {}
        }
      });
    }

    return audio;
  }

  private initAudioAssets() {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;

    // Preload SFX
    (Object.keys(SFX_CONFIG) as SFXKey[]).forEach((key) => {
      try {
        const audio = this.createAudioWithFallbacks(SFX_CONFIG[key], false);
        this.sfxMap.set(key, audio);
      } catch {}
    });

    // Preload BGM
    (Object.keys(BGM_CONFIG) as BGMKey[]).forEach((key) => {
      try {
        const loop = key === "lobby" || key === "question_suspense";
        const audio = this.createAudioWithFallbacks(BGM_CONFIG[key], loop);
        this.bgmMap.set(key, audio);
      } catch {}
    });
  }

  public unlockAudio() {
    this.initAudioAssets();
    // Warm up wheel AudioContext if created
    const wheelCtx = this.getWheelAudioCtx();
    if (wheelCtx && wheelCtx.state === "suspended") {
      wheelCtx.resume().catch(() => {});
    }
    // Warm up an audio element to satisfy browser interaction policies
    const tick = this.sfxMap.get("tick");
    if (tick) {
      tick.volume = 0;
      tick.play().then(() => {
        tick.pause();
        tick.currentTime = 0;
        tick.volume = this.volume;
      }).catch(() => {});
    }

    if (this.pendingMusicTrack && !this.isMuted) {
      const pending = this.pendingMusicTrack;
      this.pendingMusicTrack = null;
      this.playMusicTrack(
        pending.type,
        pending.audioKey,
        pending.targetVolFactor,
        pending.crossfadeMs,
        pending.questionId
      );
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      if (this.currentMusicAudio) {
        this.currentMusicAudio.volume = 0;
      }
      if (this.wheelSpinAudio) {
        this.wheelSpinAudio.volume = 0;
      }
    } else {
      if (this.currentMusicAudio) {
        this.currentMusicAudio.volume = this.volume * 0.75;
      }
      if (this.wheelSpinAudio && !this.wheelSpinAudio.paused) {
        this.wheelSpinAudio.volume = Math.min(1, this.volume * 0.85);
      }
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (!this.isMuted) {
      if (this.currentMusicAudio) {
        this.currentMusicAudio.volume = this.volume * 0.75;
      }
      if (this.wheelSpinAudio && !this.wheelSpinAudio.paused) {
        this.wheelSpinAudio.volume = Math.min(1, this.volume * 0.85);
      }
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  // ── True Crossfading & Smooth Fade In/Out ──────────────────────────────────

  private fadeOutAudio(audio: HTMLAudioElement, durationMs: number = 600) {
    const prevTimer = this.activeFadeMap.get(audio);
    if (prevTimer) {
      clearInterval(prevTimer);
      this.activeFadeMap.delete(audio);
    }

    if (audio.paused || audio.volume <= 0 || durationMs <= 0) {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {}
      return;
    }

    const steps = 20;
    const stepInterval = Math.max(15, Math.floor(durationMs / steps));
    const startVol = audio.volume;
    const volStep = startVol / steps;
    let currentVol = startVol;

    const interval = setInterval(() => {
      currentVol = Math.max(0, currentVol - volStep);
      try {
        audio.volume = currentVol;
      } catch {}

      if (currentVol <= 0) {
        clearInterval(interval);
        this.activeFadeMap.delete(audio);
        try {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = startVol; // Restore for next play
        } catch {}
      }
    }, stepInterval);
    this.activeFadeMap.set(audio, interval);
  }

  private fadeInAudio(
    audio: HTMLAudioElement,
    targetVol: number,
    durationMs: number = 400,
    onAutoplayBlocked?: () => void
  ) {
    const prevTimer = this.activeFadeMap.get(audio);
    if (prevTimer) {
      clearInterval(prevTimer);
      this.activeFadeMap.delete(audio);
    }

    const steps = 15;
    const stepInterval = Math.max(15, Math.floor(durationMs / steps));
    const initialVol = 0.02;
    audio.volume = this.isMuted ? 0 : initialVol;
    audio.currentTime = 0;

    audio.play().then(() => {
      let currentVol = initialVol;
      const volStep = Math.max(0.01, (targetVol - initialVol) / steps);

      const interval = setInterval(() => {
        currentVol = Math.min(targetVol, currentVol + volStep);
        if (this.currentMusicAudio === audio) {
          audio.volume = this.isMuted ? 0 : currentVol;
        }
        if (currentVol >= targetVol) {
          clearInterval(interval);
          this.activeFadeMap.delete(audio);
        }
      }, stepInterval);
      this.activeFadeMap.set(audio, interval);
    }).catch(() => {
      // Autoplay policy fallback
      if (onAutoplayBlocked) {
        onAutoplayBlocked();
      }
      this.setupGlobalUnlockListener();
    });
  }

  private playMusicTrack(
    type: "LOBBY" | "QUESTION",
    audioKey: BGMKey,
    targetVolFactor: number = 0.75,
    crossfadeMs: number = 450,
    questionId?: string
  ) {
    if (this.isMuted) return;
    this.initAudioAssets();

    let nextAudio = this.bgmMap.get(audioKey);
    if (!nextAudio) {
      const loop = type === "LOBBY";
      nextAudio = this.createAudioWithFallbacks(BGM_CONFIG[audioKey] || { primary: `/sounds/${audioKey}.mp3`, fallbacks: [] }, loop);
      this.bgmMap.set(audioKey, nextAudio);
    }

    const now = Date.now();

    // Strict deduplication:
    // If already playing this track type:
    // 1. If QUESTION mode:
    //    - If the same track is actively playing, DO NOT restart unless an explicit, DIFFERENT questionId is provided.
    //    - Redundant sync events, timer ticks, or answer submissions without a new question ID will not interrupt the track.
    // 2. If LOBBY mode:
    //    - Do not restart if already playing the lobby music.
    if (this.currentMusicType === type) {
      if (type === "QUESTION") {
        if (this.currentMusicAudio && !this.currentMusicAudio.paused && !this.currentMusicAudio.ended) {
          if (questionId && this.currentPlayingQuestionId && questionId !== this.currentPlayingQuestionId) {
            // Explicit different question ID -> Proceed below to restart for the new question
          } else {
            // Same question or redundant sync event -> Keep playing uninterrupted
            if (questionId && !this.currentPlayingQuestionId) this.currentPlayingQuestionId = questionId;
            return;
          }
        }
      } else if (type === "LOBBY" && this.currentMusicKey === audioKey) {
        if (nextAudio && !nextAudio.paused) {
          return;
        }
        if (nextAudio && nextAudio.paused) {
          nextAudio.play().catch(() => {
            this.pendingMusicTrack = { type, audioKey, targetVolFactor, crossfadeMs, questionId };
            this.setupGlobalUnlockListener();
          });
          return;
        }
      }
    }

    const prevAudio = this.currentMusicAudio;
    const targetVol = this.volume * targetVolFactor;

    if (type === "QUESTION") {
      // Countdown music must start IMMEDIATELY at full volume, without fade-in or crossfade lag
      if (this.fadeInterval) {
        clearInterval(this.fadeInterval);
        this.fadeInterval = null;
      }
      this.bgmMap.forEach((audio, key) => {
        if (key !== audioKey) {
          try {
            audio.pause();
            audio.currentTime = 0;
          } catch {}
        }
      });
      if (prevAudio && prevAudio !== nextAudio && !prevAudio.paused) {
        try {
          prevAudio.pause();
          prevAudio.currentTime = 0;
        } catch {}
      }

      this.currentMusicAudio = nextAudio;
      this.currentMusicType = type;
      this.currentMusicKey = audioKey;
      this.currentPlayingQuestionId = questionId ?? null;
      this.lastMusicStartTime = now;

      nextAudio.loop = false;
      nextAudio.volume = this.isMuted ? 0 : targetVol;
      nextAudio.currentTime = 0;
      nextAudio.onended = () => {
        if (this.currentMusicAudio === nextAudio) {
          this.currentMusicAudio = null;
          this.currentMusicType = null;
          this.currentMusicKey = null;
          this.currentPlayingQuestionId = null;
        }
      };
      nextAudio.play().catch(() => {
        this.pendingMusicTrack = { type, audioKey, targetVolFactor, crossfadeMs, questionId };
        this.setupGlobalUnlockListener();
      });
    } else {
      // For Lobby or ambient music, crossfade smoothly
      if (prevAudio && prevAudio !== nextAudio && !prevAudio.paused) {
        this.fadeOutAudio(prevAudio, crossfadeMs);
      }

      this.currentMusicAudio = nextAudio;
      this.currentMusicType = type;
      this.currentMusicKey = audioKey;
      this.currentPlayingQuestionId = null;
      this.lastMusicStartTime = now;
      nextAudio.loop = true;

      this.fadeInAudio(nextAudio, targetVol, Math.max(300, crossfadeMs - 50), () => {
        this.pendingMusicTrack = { type, audioKey, targetVolFactor, crossfadeMs, questionId };
      });
    }
  }

  public playLobbyMusic() {
    if (this.questionMusicTimeout) {
      clearTimeout(this.questionMusicTimeout);
      this.questionMusicTimeout = null;
    }
    this.playMusicTrack("LOBBY", "lobby", 0.7, 500);
  }

  /**
   * Plays ambient suspense music during secret bidding / strategic decision phases (e.g. Wager Bidding Period).
   * Runs as background ambient music without interfering with Olympia question countdown tracks.
   */
  public playBiddingSuspense() {
    if (this.currentMusicType === "QUESTION" && this.currentMusicAudio && !this.currentMusicAudio.paused) {
      return;
    }
    if (this.questionMusicTimeout) {
      clearTimeout(this.questionMusicTimeout);
      this.questionMusicTimeout = null;
    }
    this.playMusicTrack("LOBBY", "question_suspense", 0.65, 400);
  }


  /**
   * Automatically maps to official Olympia countdown music:
   * - <= 15s: Olympia 10 Về đích (15s)
   * - 16s - 25s: Olympia 9 Về đích (20s)
   * - 26s - 45s: Olympia 22 Về đích (30s)
   * - > 45s: Olympia 10 Khởi động (60s)
   *
   * Countdown music plays naturally through to the end of the audio track
   * to preserve authentic Olympia resolutions and gong/reverb effects.
   */
  public playQuestionMusic(remainingSeconds: number = 30, questionId?: string) {
    if (remainingSeconds <= 0) {
      return;
    }

    let selectedKey: BGMKey = "olympia_30s";
    if (remainingSeconds <= 15) {
      selectedKey = "olympia_15s";
    } else if (remainingSeconds <= 25) {
      selectedKey = "olympia_20s";
    } else if (remainingSeconds <= 45) {
      selectedKey = "olympia_30s";
    } else {
      selectedKey = "olympia_60s";
    }

    // Check if this exact track or another QUESTION countdown track is already actively playing for the current question
    if (
      this.currentMusicType === "QUESTION" &&
      this.currentMusicAudio &&
      !this.currentMusicAudio.ended
    ) {
      // Only restart if an explicit DIFFERENT questionId is provided
      const hasBothIds = Boolean(questionId && this.currentPlayingQuestionId);
      const isDifferentQuestion = hasBothIds && questionId !== this.currentPlayingQuestionId;

      if (!isDifferentQuestion) {
        if (questionId && !this.currentPlayingQuestionId) {
          this.currentPlayingQuestionId = questionId;
        }
        // If paused by browser interaction or backgrounding, resume without resetting currentTime
        if (this.currentMusicAudio.paused) {
          this.currentMusicAudio.play().catch(() => {});
        }
        return;
      }
    }

    if (this.questionMusicTimeout) {
      clearTimeout(this.questionMusicTimeout);
      this.questionMusicTimeout = null;
    }

    this.playMusicTrack("QUESTION", selectedKey, 0.85, 400, questionId);

    // Audio file plays naturally to its end (chạy tới hết file).
    // Safety watchdog only to reset state after track completion.
    const safetyTimeoutMs = Math.max(40000, (remainingSeconds + 20) * 1000);
    this.questionMusicTimeout = setTimeout(() => {
      if (this.currentMusicType === "QUESTION") {
        this.stopQuestionMusic(350);
      }
    }, safetyTimeoutMs);
  }

  /**
   * Plays the official Olympia 5s countdown soundtrack (O10 - nay ở phần Về đích)
   * used during the Bounceback steal buzzer window.
   * Runs naturally to the end of the file even if a contestant buzzes during the 5s.
   */
  public playOlympia5s() {
    if (this.questionMusicTimeout) {
      clearTimeout(this.questionMusicTimeout);
      this.questionMusicTimeout = null;
    }
    this.playMusicTrack("QUESTION", "olympia_5s", 0.9, 0);
  }

  /**
   * Stops question countdown audio tracks without affecting Lobby BGM.
   */
  public stopQuestionMusic(fadeDurationMs: number = 0, force: boolean = true) {
    if (this.currentMusicType !== "QUESTION") return;
    if (!force && fadeDurationMs <= 0) return;

    if (this.questionMusicTimeout) {
      clearTimeout(this.questionMusicTimeout);
      this.questionMusicTimeout = null;
    }
    this.currentPlayingQuestionId = null;

    const audio = this.currentMusicAudio;
    this.currentMusicAudio = null;
    this.currentMusicType = null;
    this.currentMusicKey = null;

    if (audio) {
      const prevFade = this.activeFadeMap.get(audio);
      if (prevFade) {
        clearInterval(prevFade);
        this.activeFadeMap.delete(audio);
      }
      if (fadeDurationMs <= 0) {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch {}
      } else {
        this.fadeOutAudio(audio, fadeDurationMs);
      }
    }
  }

  /**
   * Stops Lobby BGM only.
   */
  public stopLobbyMusic(fadeDurationMs: number = 0) {
    if (this.currentMusicType !== "LOBBY") return;

    const audio = this.currentMusicAudio;
    this.currentMusicAudio = null;
    this.currentMusicType = null;
    this.currentMusicKey = null;

    if (audio) {
      const prevFade = this.activeFadeMap.get(audio);
      if (prevFade) {
        clearInterval(prevFade);
        this.activeFadeMap.delete(audio);
      }
      if (fadeDurationMs <= 0) {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch {}
      } else {
        this.fadeOutAudio(audio, fadeDurationMs);
      }
    }
  }

  /**
   * Immediately stops background music (or smoothly fades out if fadeDurationMs > 0 is explicitly specified).
   * @param fadeDurationMs Duration of fade out in milliseconds (defaults to 0 for instant cut)
   */
  public stopMusic(fadeDurationMs: number = 0, forceQuestionStop: boolean = false) {
    // If a QUESTION countdown track is currently playing, preserve authentic Olympia resolution (gong/chime)
    // to completion unless forceQuestionStop or explicit fadeDurationMs is requested
    if (this.currentMusicType === "QUESTION" && !forceQuestionStop && fadeDurationMs <= 0) {
      return;
    }

    this.pendingMusicTrack = null;
    if (this.questionMusicTimeout) {
      clearTimeout(this.questionMusicTimeout);
      this.questionMusicTimeout = null;
    }

    this.currentPlayingQuestionId = null;
    this.currentMusicKey = null;
    this.stopFanfare();

    this.activeFadeMap.forEach((interval) => clearInterval(interval));
    this.activeFadeMap.clear();

    const curr = this.currentMusicAudio;
    this.currentMusicAudio = null;
    this.currentMusicType = null;

    if (fadeDurationMs <= 0) {
      this.bgmMap.forEach((audio) => {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch {}
      });
      return;
    }

    // Fade out any currently playing BGM tracks smoothly over fadeDurationMs (default 600ms)
    if (curr && !curr.paused && curr.volume > 0) {
      this.fadeOutAudio(curr, fadeDurationMs);
    }
  }

  // ── Instant Sound Effects (SFX) ───────────────────────────────────────────

  private playSFX(name: SFXKey, volumeScale: number = 1.0) {
    if (this.isMuted) return;
    this.initAudioAssets();

    try {
      const original = this.sfxMap.get(name);
      if (!original) {
        const config = SFX_CONFIG[name];
        const sound = this.createAudioWithFallbacks(config || { primary: `/sounds/${name}.mp3`, fallbacks: [] }, false);
        sound.volume = this.volume * volumeScale;
        sound.play().catch(() => {});
        return;
      }

      // Fast clone to support rapid overlapping triggers (e.g. fast buzzer or clock ticks)
      const clone = original.cloneNode(true) as HTMLAudioElement;
      clone.volume = this.volume * volumeScale;
      clone.play().catch(() => {});
    } catch {}
  }

  /**
   * Only used for pre-match ready countdown (3, 2, 1).
   * Strictly blocked when question countdown music is playing to keep Olympia tracks completely clean.
   */
  public playCountdownTick(remaining: number) {
    if (this.currentMusicType === "QUESTION") {
      return;
    }
    if (remaining > 0) {
      this.playSFX("tick", 0.75);
    }
  }

  /**
   * Chuông bấm giành quyền trả lời Về đích Olympia (O8 - O24)
   */
  public playBuzz() {
    this.playSFX("buzz", 1.0);
  }

  /**
   * Tiếng chuông chúc mừng đúng Về đích Olympia (O7 - O24)
   */
  public playCorrect() {
    this.playSFX("correct", 0.95);
  }

  /**
   * Tiếng còi báo sai Về đích Olympia (O7 - O24)
   */
  public playWrong() {
    this.playSFX("wrong", 0.95);
  }

  /**
   * Fanfare / Nhạc tổng kết điểm Olympia - Đã tắt hoàn toàn (fanfare.mp3 không được chạy)
   */
  public playFanfare() {
    // Disabled: fanfare.mp3 không được chạy
    return;
  }

  public stopFanfare() {
    // No-op
  }

  /**
   * Âm Ngôi sao hy vọng Olympia khi dùng thẻ bổ trợ (O8 - O24)
   */
  public playPowerup() {
    this.playSFX("powerup", 0.9);
  }

  /**
   * Tiếng còi báo hết giờ Olympia (O8 - O24)
   */
  public playTimeout() {
    this.playSFX("timeout", 1.0);
  }

  private wheelAudioCtx: AudioContext | null = null;

  private getWheelAudioCtx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    try {
      if (!this.wheelAudioCtx) {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (Ctx) {
          this.wheelAudioCtx = new Ctx();
        }
      }
      if (this.wheelAudioCtx && this.wheelAudioCtx.state === "suspended") {
        this.wheelAudioCtx.resume().catch(() => {});
      }
      return this.wheelAudioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Tiếng kim gẩy chốt Vòng Quay Chiếc Nón Kỳ Diệu (Wheel of Fortune Peg Click)
   * @param progress Tiến độ quay từ 0.0 (mới quay, đanh nhanh) -> 1.0 (sắp dừng, trầm và vang hơn)
   */
  public playWheelPegTick(progress: number = 0) {
    if (this.isMuted) return;
    const ctx = this.getWheelAudioCtx();
    if (!ctx) {
      this.playSFX("tick", 0.55);
      return;
    }

    try {
      const now = ctx.currentTime;
      const clampedProg = Math.max(0, Math.min(1, progress));

      // 1. Crisp flapper peg snap (triangle/square pitch drop)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";

      // Pitch slightly higher when spinning fast, slightly deeper as each final peg clicks
      const startFreq = 1150 - clampedProg * 280;
      const endFreq = 240 - clampedProg * 60;
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(80, endFreq), now + 0.028);

      const peakVol = Math.max(0.04, this.volume * (0.22 + clampedProg * 0.12));
      gain.gain.setValueAtTime(peakVol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.032);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.onended = () => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch {}
      };
      osc.start(now);
      osc.stop(now + 0.034);

      // 2. Subtle wooden/metallic peg body knock
      const bodyOsc = ctx.createOscillator();
      const bodyGain = ctx.createGain();
      bodyOsc.type = "sine";
      bodyOsc.frequency.setValueAtTime(420 - clampedProg * 80, now);
      bodyOsc.frequency.exponentialRampToValueAtTime(135, now + 0.022);

      bodyGain.gain.setValueAtTime(peakVol * 0.65, now);
      bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.024);

      bodyOsc.connect(bodyGain);
      bodyGain.connect(ctx.destination);
      bodyOsc.onended = () => {
        try {
          bodyOsc.disconnect();
          bodyGain.disconnect();
        } catch {}
      };
      bodyOsc.start(now);
      bodyOsc.stop(now + 0.026);
    } catch {
      this.playSFX("tick", 0.35);
    }
  }

  /**
   * Nhạc nền vòng quay Chiếc Nón Kỳ Diệu VTV3 (2013) chạy suốt thời gian xoay (15s - 20s).
   * Không tua nhanh, không loop, và chống kích hoạt lặp lại (re-trigger) gây tải trùng âm thanh.
   */
  public playWheelSpinMusic(_durationMs: number = 20000, forceRestart: boolean = false) {
    if (typeof window === "undefined") return;
    this.initAudioAssets();

    try {
      let audio = this.wheelSpinAudio || this.bgmMap.get("wheel_spin");
      if (!audio) {
        audio = this.createAudioWithFallbacks(BGM_CONFIG.wheel_spin, false);
        this.bgmMap.set("wheel_spin", audio);
      }
      this.wheelSpinAudio = audio;

      const now = Date.now();
      // Khóa chống kích hoạt lặp lại (re-trigger) trong 2.5s hoặc khi audio đang phát mượt mà
      if (!forceRestart) {
        const isRecentlyStarted = (now - this.wheelSpinStartingTime) < 2500;
        const isPlaying = !audio.paused && !audio.ended;
        if (isRecentlyStarted || isPlaying) {
          audio.volume = this.isMuted ? 0 : Math.min(1, this.volume * 0.9);
          return;
        }
      }
      this.wheelSpinStartingTime = now;

      const prevFade = this.activeFadeMap.get(audio);
      if (prevFade) {
        clearInterval(prevFade);
        this.activeFadeMap.delete(audio);
      }

      audio.pause();
      audio.currentTime = 0;
      audio.loop = false;

      // Nhạc vòng quay Chiếc Nón Kỳ Diệu chạy tốc độ cố định 1.0x (chuẩn bản gốc VTV3, không tua nhanh hay méo cao độ)
      try {
        audio.preservesPitch = true;
        audio.playbackRate = 1.0;
      } catch {}

      audio.volume = this.isMuted ? 0 : Math.min(1, this.volume * 0.9);
      audio.play().catch(() => {});
    } catch {}
  }

  /**
   * Dừng nhạc nền vòng quay Chiếc Nón Kỳ Diệu
   */
  public stopWheelSpinMusic(fadeDurationMs: number = 250) {
    this.wheelSpinStartingTime = 0;
    if (!this.wheelSpinAudio) return;
    const audio = this.wheelSpinAudio;
    if (fadeDurationMs <= 0) {
      const prevFade = this.activeFadeMap.get(audio);
      if (prevFade) {
        clearInterval(prevFade);
        this.activeFadeMap.delete(audio);
      }
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {}
      return;
    }
    this.fadeOutAudio(audio, fadeDurationMs);
  }

  /**
   * Âm ngân huyền bí khi kim Vòng Quay Tarot dừng hẳn tại ô định mệnh
   */
  public playWheelStopChime() {
    // Để bản nhạc Chiếc Nón Kỳ Diệu phát tự nhiên đến hết nốt cuối (không ngắt ngang)
    if (this.isMuted) return;
    const ctx = this.getWheelAudioCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 mystical chord
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, now + idx * 0.035);

        const peak = Math.max(0.02, this.volume * 0.22);
        gain.gain.setValueAtTime(0.001, now + idx * 0.035);
        gain.gain.linearRampToValueAtTime(peak, now + idx * 0.035 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + idx * 0.035 + 0.65);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.035);
        osc.stop(now + idx * 0.035 + 0.68);
      });
    } catch {}
  }
}

export const soundManager = typeof window !== "undefined" ? new SoundManager() : ({} as SoundManager);

