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
        // Nhạc hiệu mở đầu lobby chỉ chạy 1 lần duy nhất khi khởi động phòng, không lặp lại
        const loop = key === "question_suspense";
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
      const loop = audioKey === "question_suspense";
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
      nextAudio.loop = audioKey === "question_suspense";

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
   * Tiếng kim loại lách cách xoẹt qua khi quay Vòng Quay Tarot (Chiếc Nón Kỳ Diệu)
   * Tạo bằng Web Audio API đa tầng: Kết hợp xung va đập kim loại đanh sắc (2600Hz - 3800Hz),
   * lớp cọ xoẹt cơ học (metallic scrape transient) và độ vang cơ khí rõ nét.
   */
  public playWheelPegTick(progress: number = 0) {
    if (this.isMuted) return;
    const ctx = this.getWheelAudioCtx();
    if (!ctx) {
      this.playSFX("tick", 0.75);
      return;
    }

    try {
      const now = ctx.currentTime;
      const clampedProg = Math.max(0, Math.min(1, progress));
      const masterVol = Math.max(0.18, this.volume * (0.75 + clampedProg * 0.15));

      // 1. Mechanical Pawl Click Transient (8ms Bandpass-filtered high noise spike)
      const bufferSize = Math.max(64, Math.floor(ctx.sampleRate * 0.008));
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.setValueAtTime(4600, now);
      noiseFilter.Q.setValueAtTime(3.8, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(masterVol * 0.85, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.008);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.009);

      // 2. High Chrome Peg Inharmonic Clack 1 (4200Hz - Fixed frequency, không sweep tần số)
      const pingOsc1 = ctx.createOscillator();
      const pingGain1 = ctx.createGain();
      pingOsc1.type = "triangle";
      pingOsc1.frequency.setValueAtTime(4200, now);

      pingGain1.gain.setValueAtTime(masterVol * 0.7, now);
      pingGain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.010);

      pingOsc1.connect(pingGain1);
      pingGain1.connect(ctx.destination);
      pingOsc1.start(now);
      pingOsc1.stop(now + 0.011);

      // 3. High Chrome Peg Inharmonic Clack 2 (6400Hz - Tiếng kim loại đanh dứt khoát)
      const pingOsc2 = ctx.createOscillator();
      const pingGain2 = ctx.createGain();
      pingOsc2.type = "sine";
      pingOsc2.frequency.setValueAtTime(6400, now);

      pingGain2.gain.setValueAtTime(masterVol * 0.45, now);
      pingGain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.007);

      pingOsc2.connect(pingGain2);
      pingGain2.connect(ctx.destination);
      pingOsc2.start(now);
      pingOsc2.stop(now + 0.008);

      // 4. Crisp Mechanical Tap (1400Hz - Cực ngắn 7ms, không tụt xuống dải trầm gây kẽo kẹt)
      const tapOsc = ctx.createOscillator();
      const tapGain = ctx.createGain();
      tapOsc.type = "sine";
      tapOsc.frequency.setValueAtTime(1400, now);

      tapGain.gain.setValueAtTime(masterVol * 0.4, now);
      tapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.007);

      tapOsc.connect(tapGain);
      tapGain.connect(ctx.destination);
      tapOsc.start(now);
      tapOsc.stop(now + 0.008);

    } catch {
      this.playSFX("tick", 0.75);
    }
  }

  /**
   * Nhạc nền vòng quay Chiếc Nón Kỳ Diệu VTV3 (2013) chạy suốt thời gian xoay (15s - 20s).
   * Không tua nhanh, không loop, và chống kích hoạt lặp lại (re-trigger) gây tải trùng âm thanh.
   */
  public playWheelSpin(durationMs: number = 4500) {
    this.playWheelSpinMusic(durationMs, true);
  }

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

  /**
   * Vệt gió điện ảnh (Whoosh) khi icon trúng thưởng phóng ra phía trước và xoay 360 độ
   */
  public playTarotIconWhoosh() {
    if (this.isMuted) return;
    const ctx = this.getWheelAudioCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";

      // Pitch sweep up and down to simulate high-speed 360 flyby
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.35);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.7);

      const peak = Math.max(0.04, this.volume * 0.3);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(peak, now + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.72);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.75);
    } catch {}
  }

  /**
   * Tiếng dập ấn hoàng kim (Heavy Seal Impact / Thud) khi icon đính phập lên lưng lá bài
   */
  public playTarotSealImpact() {
    if (this.isMuted) return;
    const ctx = this.getWheelAudioCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // 1. Heavy low-end impact thud (80Hz -> 35Hz)
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = "triangle";
      subOsc.frequency.setValueAtTime(110, now);
      subOsc.frequency.exponentialRampToValueAtTime(38, now + 0.3);

      const subPeak = Math.max(0.06, this.volume * 0.45);
      subGain.gain.setValueAtTime(subPeak, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.48);

      // 2. Resonant metallic gold seal chime (G5 + D6 harmonic)
      [783.99, 1174.66].forEach((f, idx) => {
        const chimeOsc = ctx.createOscillator();
        const chimeGain = ctx.createGain();
        chimeOsc.type = "sine";
        chimeOsc.frequency.setValueAtTime(f, now + idx * 0.02);

        const chimePeak = Math.max(0.03, this.volume * 0.25);
        chimeGain.gain.setValueAtTime(0.001, now + idx * 0.02);
        chimeGain.gain.linearRampToValueAtTime(chimePeak, now + idx * 0.02 + 0.015);
        chimeGain.gain.exponentialRampToValueAtTime(0.0008, now + idx * 0.02 + 0.6);

        chimeOsc.connect(chimeGain);
        chimeGain.connect(ctx.destination);
        chimeOsc.start(now + idx * 0.02);
        chimeOsc.stop(now + idx * 0.02 + 0.62);
      });
    } catch {}
  }

  /**
   * Tiếng lật bài huyền bí (Magic 3D Card Flip) khi mở quẻ sau 1.5s
   */
  public playTarotCardFlip() {
    if (this.isMuted) return;
    const ctx = this.getWheelAudioCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Huyền bí: Chuỗi hòa âm thăng hoa C5 -> G5 -> C6 -> E6
      const chord = [523.25, 783.99, 1046.5, 1318.51];
      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.045);

        const peak = Math.max(0.03, this.volume * 0.28);
        gain.gain.setValueAtTime(0.001, now + idx * 0.045);
        gain.gain.linearRampToValueAtTime(peak, now + idx * 0.045 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0006, now + idx * 0.045 + 0.85);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.045);
        osc.stop(now + idx * 0.045 + 0.88);
      });
    } catch {}
  }

  // ═════════════════════════════════════════════════════════════════════════
  // CHIẾC NÓN KỲ DIỆU (WHEEL OF FORTUNE) SOUND SYSTEM
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Tiếng chuông đing ngân vang trong sáng khi lật đúng chữ cái trên bàn ô chữ
   */
  public playMagicWheelCorrect() {
    if (this.isMuted) return;
    this.playSFX("correct", 0.85);

    const ctx = this.getWheelAudioCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      // Chuông đing ngân vang: E5 (659.25Hz) -> A5 (880Hz) -> C#6 (1108.73Hz)
      const notes = [659.25, 880, 1108.73];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        const peak = Math.max(0.04, this.volume * 0.35);
        gain.gain.setValueAtTime(0.001, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(peak, now + idx * 0.08 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0005, now + idx * 0.08 + 0.7);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.72);
      });
    } catch {}
  }

  /**
   * Tiếng còi báo đoán sai chữ cái
   */
  public playMagicWheelWrong() {
    if (this.isMuted) return;
    this.playSFX("wrong", 0.85);

    const ctx = this.getWheelAudioCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(146.83, now); // D3
      osc.frequency.linearRampToValueAtTime(123.47, now + 0.4); // B2

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(this.volume * 0.28, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.46);
    } catch {}
  }

  /**
   * Âm thanh thảm họa khi quay vào ô MẤT ĐIỂM (Bankrupt stinger)
   */
  public playMagicWheelBankrupt() {
    if (this.isMuted) return;
    const ctx = this.getWheelAudioCtx();
    if (!ctx) {
      this.playSFX("wrong", 1.0);
      return;
    }
    try {
      const now = ctx.currentTime;
      // Stinger buồn trứ danh: Eb4 -> D4 -> Db4 -> C4 (Wah-wah-wah-wah)
      const notes = [311.13, 293.66, 277.18, 261.63];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now + idx * 0.18);
        // Pitch bend down slight wah
        osc.frequency.linearRampToValueAtTime(freq * 0.95, now + idx * 0.18 + 0.16);

        const peak = Math.max(0.03, this.volume * 0.3);
        gain.gain.setValueAtTime(0.001, now + idx * 0.18);
        gain.gain.linearRampToValueAtTime(peak, now + idx * 0.18 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.18 + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.18);
        osc.stop(now + idx * 0.18 + 0.24);
      });
    } catch {}
  }

  /**
   * Âm thanh còi báo khi quay vào ô MẤT LƯỢT (Lose Turn buzzer)
   */
  public playMagicWheelLoseTurn() {
    if (this.isMuted) return;
    const ctx = this.getWheelAudioCtx();
    if (!ctx) {
      this.playSFX("buzz", 0.9);
      return;
    }
    try {
      const now = ctx.currentTime;
      // Còi báo mất lượt đôi: 2 nhịp bíp trầm dứt khoát
      [0, 0.22].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(185.0, now + offset); // F#3
        gain.gain.setValueAtTime(0.001, now + offset);
        gain.gain.linearRampToValueAtTime(this.volume * 0.25, now + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.17);
      });
    } catch {}
  }

  /**
   * Âm thanh lấp lánh kỳ diệu khi quay vào Ô MAY MẮN (Sparkling magic chime)
   */
  public playMagicWheelLucky() {
    if (this.isMuted) return;
    const ctx = this.getWheelAudioCtx();
    if (!ctx) {
      this.playSFX("powerup", 0.9);
      return;
    }
    try {
      const now = ctx.currentTime;
      // Chuỗi arpeggio thăng hoa kỳ diệu: G5 -> B5 -> D6 -> G6 -> B6
      const arpeggio = [783.99, 987.77, 1174.66, 1567.98, 1975.53];
      arpeggio.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        const peak = Math.max(0.03, this.volume * 0.32);
        gain.gain.setValueAtTime(0.001, now + idx * 0.06);
        gain.gain.linearRampToValueAtTime(peak, now + idx * 0.06 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + idx * 0.06 + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.62);
      });
    } catch {}
  }

  /**
   * Âm thanh hân hoan khi nhận THÊM LƯỢT hoặc NHÂN ĐÔI ĐIỂM
   */
  public playMagicWheelExtraTurn() {
    if (this.isMuted) return;
    const ctx = this.getWheelAudioCtx();
    if (!ctx) {
      this.playSFX("powerup", 0.9);
      return;
    }
    try {
      const now = ctx.currentTime;
      // Hợp âm vui tươi: C5 -> E5 -> G5 -> C6
      const chord = [523.25, 659.25, 783.99, 1046.5];
      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        const peak = Math.max(0.04, this.volume * 0.35);
        gain.gain.setValueAtTime(0.001, now + idx * 0.05);
        gain.gain.linearRampToValueAtTime(peak, now + idx * 0.05 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.55);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.58);
      });
    } catch {}
  }

  /**
   * Nhạc chiến thắng tưng bừng khi giải thành công ô chữ (Puzzle Solved Fanfare)
   */
  public playMagicWheelSolve() {
    if (this.isMuted) return;
    this.playSFX("correct", 1.0);

    const ctx = this.getWheelAudioCtx();
    if (!ctx) {
      this.playSFX("powerup", 1.0);
      return;
    }
    try {
      const now = ctx.currentTime;
      // Grand Gameshow Fanfare: G4 -> C5 -> E5 -> G5 (dài) -> C6 (rực rỡ)
      const melody = [
        { f: 392.0, d: 0.12, t: 0 },
        { f: 523.25, d: 0.12, t: 0.14 },
        { f: 659.25, d: 0.12, t: 0.28 },
        { f: 783.99, d: 0.35, t: 0.42 },
        { f: 1046.5, d: 0.8, t: 0.82 },
      ];
      melody.forEach((note) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(note.f, now + note.t);

        const peak = Math.max(0.05, this.volume * 0.4);
        gain.gain.setValueAtTime(0.001, now + note.t);
        gain.gain.linearRampToValueAtTime(peak, now + note.t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + note.d);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + note.t);
        osc.stop(now + note.t + note.d + 0.05);
      });
    } catch {}
  }
}

export const soundManager = typeof window !== "undefined" ? new SoundManager() : ({} as SoundManager);

