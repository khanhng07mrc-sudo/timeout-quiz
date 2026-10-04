// Quizorra - Studio Audio Engine (Đường lên đỉnh Olympia Official Audio Edition)
// High-fidelity gameshow audio player featuring authentic Olympia soundtracks, smooth transitions, and instant SFX.

type SFXKey = "tick" | "buzz" | "correct" | "wrong" | "go" | "fanfare" | "powerup" | "timeout";
type BGMKey = "lobby" | "olympia_5s" | "olympia_15s" | "olympia_20s" | "olympia_30s" | "olympia_60s" | "question_suspense";

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
  fanfare: { primary: "/sounds/fanfare.mp3", fallbacks: ["/sounds/fanfare.wav"] },
  powerup: { primary: "/sounds/powerup.mp3", fallbacks: ["/sounds/powerup.wav"] },
  timeout: { primary: "/sounds/timeout.mp3", fallbacks: ["/sounds/buzz.mp3"] },
};

const BGM_CONFIG: Record<BGMKey, AudioSourceConfig> = {
  lobby: { primary: "/sounds/lobby.ogg", fallbacks: ["/sounds/lobby.mp3", "/sounds/lobby.wav"] },
  olympia_5s: { primary: "/sounds/olympia_5s.mp3", fallbacks: ["/sounds/olympia_5s_left.mp3"] },
  olympia_15s: { primary: "/sounds/olympia_15s.mp3", fallbacks: ["/sounds/question_suspense.mp3"] },
  olympia_20s: { primary: "/sounds/olympia_20s.ogg", fallbacks: ["/sounds/olympia_20s.mp3", "/sounds/question_suspense.mp3"] },
  olympia_30s: { primary: "/sounds/olympia_30s.mp3", fallbacks: ["/sounds/question_suspense.mp3"] },
  olympia_60s: { primary: "/sounds/olympia_60s.mp3", fallbacks: ["/sounds/olympia_30s.mp3", "/sounds/question_suspense.mp3"] },
  question_suspense: { primary: "/sounds/question_suspense.mp3", fallbacks: ["/sounds/question_suspense.wav"] },
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

  // Preloaded audio elements
  private sfxMap: Map<string, HTMLAudioElement> = new Map();
  private bgmMap: Map<string, HTMLAudioElement> = new Map();
  private initialized: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.initAudioAssets();
    }
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
        const loop = key === "lobby";
        const audio = this.createAudioWithFallbacks(BGM_CONFIG[key], loop);
        this.bgmMap.set(key, audio);
      } catch {}
    });
  }

  public unlockAudio() {
    this.initAudioAssets();
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
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      if (this.currentMusicAudio) {
        this.currentMusicAudio.volume = 0;
      }
    } else {
      if (this.currentMusicAudio) {
        this.currentMusicAudio.volume = this.volume * 0.75;
      }
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (!this.isMuted && this.currentMusicAudio) {
      this.currentMusicAudio.volume = this.volume * 0.75;
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  // ── True Crossfading & Smooth Fade In/Out ──────────────────────────────────

  private fadeOutAudio(audio: HTMLAudioElement, durationMs: number = 450) {
    if (audio.paused || audio.volume <= 0) {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {}
      return;
    }

    const steps = 15;
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
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch {}
      }
    }, stepInterval);
  }

  private fadeInAudio(audio: HTMLAudioElement, targetVol: number, durationMs: number = 400) {
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
        }
      }, stepInterval);
    }).catch(() => {
      // Autoplay policy fallback
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
        if (this.currentMusicKey === audioKey && !nextAudio.paused && !nextAudio.ended) {
          if (questionId && this.currentPlayingQuestionId && questionId !== this.currentPlayingQuestionId) {
            // Explicit different question ID -> Proceed below to restart for the new question
          } else {
            // Same question or redundant sync event -> Keep playing uninterrupted
            if (questionId) this.currentPlayingQuestionId = questionId;
            return;
          }
        }
      } else if (type === "LOBBY" && this.currentMusicKey === audioKey && (now - this.lastMusicStartTime < 3000 || !nextAudio.paused)) {
        return;
      }
    }

    const prevAudio = this.currentMusicAudio;
    const targetVol = this.volume * targetVolFactor;

    if (type === "QUESTION") {
      // Countdown music must start IMMEDIATELY at full volume, without fade-in or crossfade lag
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
      nextAudio.play().catch(() => {});
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

      this.fadeInAudio(nextAudio, targetVol, Math.max(300, crossfadeMs - 50));
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
      this.stopMusic(400);
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

    // Check if this exact track is already actively playing for the current question
    if (
      this.currentMusicType === "QUESTION" &&
      this.currentMusicKey === selectedKey &&
      this.currentMusicAudio &&
      !this.currentMusicAudio.paused &&
      !this.currentMusicAudio.ended
    ) {
      // Only restart if an explicit different questionId is provided
      if (questionId && this.currentPlayingQuestionId && questionId !== this.currentPlayingQuestionId) {
        // Proceed below to start track for new question
      } else {
        if (questionId) this.currentPlayingQuestionId = questionId;
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
        this.stopMusic(350);
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
   * Smoothly stops background music with a gentle crossfade / fade-out instead of cutting abruptly.
   * @param fadeDurationMs Duration of fade out in milliseconds (defaults to 450ms)
   */
  public stopMusic(fadeDurationMs: number = 450) {
    if (this.questionMusicTimeout) {
      clearTimeout(this.questionMusicTimeout);
      this.questionMusicTimeout = null;
    }

    this.currentPlayingQuestionId = null;
    this.currentMusicKey = null;

    if (this.currentMusicAudio) {
      const audio = this.currentMusicAudio;
      this.currentMusicAudio = null;
      this.currentMusicType = null;

      if (fadeDurationMs > 0 && !audio.paused) {
        this.fadeOutAudio(audio, fadeDurationMs);
      } else {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch {}
      }
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
   * Nhạc tổng kết điểm trao giải Olympia (O9 - O24)
   */
  public playFanfare() {
    this.playSFX("fanfare", 0.95);
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
}

export const soundManager = typeof window !== "undefined" ? new SoundManager() : ({} as SoundManager);

