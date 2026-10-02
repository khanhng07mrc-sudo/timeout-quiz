// Timeout Quiz - Studio Audio Engine (Đường lên đỉnh Olympia Official Audio Edition)
// High-fidelity gameshow audio player featuring authentic Olympia soundtracks, smooth transitions, and instant SFX.

type SFXKey = "tick" | "buzz" | "correct" | "wrong" | "go" | "fanfare" | "powerup" | "timeout";
type BGMKey = "lobby" | "olympia_15s" | "olympia_20s" | "olympia_30s" | "olympia_60s" | "question_suspense";

interface AudioSourceConfig {
  primary: string;
  fallbacks: string[];
}

const SFX_CONFIG: Record<SFXKey, AudioSourceConfig> = {
  tick: { primary: "/sounds/tick.mp3", fallbacks: ["/sounds/tick.wav"] },
  go: { primary: "/sounds/go.mp3", fallbacks: ["/sounds/go.wav"] },
  buzz: { primary: "/sounds/buzz.mp3", fallbacks: ["/sounds/buzz.wav"] },
  correct: { primary: "/sounds/correct.mp3", fallbacks: ["/sounds/correct.wav"] },
  wrong: { primary: "/sounds/wrong.ogg", fallbacks: ["/sounds/wrong.mp3", "/sounds/wrong.wav"] },
  fanfare: { primary: "/sounds/fanfare.mp3", fallbacks: ["/sounds/fanfare.wav"] },
  powerup: { primary: "/sounds/powerup.mp3", fallbacks: ["/sounds/powerup.wav"] },
  timeout: { primary: "/sounds/timeout.mp3", fallbacks: ["/sounds/buzz.mp3"] },
};

const BGM_CONFIG: Record<BGMKey, AudioSourceConfig> = {
  lobby: { primary: "/sounds/lobby.ogg", fallbacks: ["/sounds/lobby.mp3", "/sounds/lobby.wav"] },
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

  // ── Music Player with Fade In / Fade Out ───────────────────────────────────

  private playMusicTrack(type: "LOBBY" | "QUESTION", audioKey: BGMKey, targetVolFactor: number = 0.75) {
    if (this.isMuted) return;
    this.initAudioAssets();

    if (this.currentMusicType === type && this.currentMusicAudio && !this.currentMusicAudio.paused) {
      return; // Already playing this track
    }

    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }

    // Fade out old track
    const oldAudio = this.currentMusicAudio;
    if (oldAudio && !oldAudio.paused) {
      try {
        let v = oldAudio.volume;
        const fadeOut = setInterval(() => {
          v = Math.max(0, v - 0.15);
          oldAudio.volume = v;
          if (v <= 0) {
            clearInterval(fadeOut);
            oldAudio.pause();
            oldAudio.currentTime = 0;
          }
        }, 30);
      } catch {
        oldAudio.pause();
        oldAudio.currentTime = 0;
      }
    }

    let audio = this.bgmMap.get(audioKey);
    if (!audio) {
      const loop = type === "LOBBY";
      audio = this.createAudioWithFallbacks(BGM_CONFIG[audioKey] || { primary: `/sounds/${audioKey}.mp3`, fallbacks: [] }, loop);
      this.bgmMap.set(audioKey, audio);
    }

    this.currentMusicAudio = audio;
    this.currentMusicType = type;

    const targetVol = this.volume * targetVolFactor;
    audio.volume = 0.05;
    audio.currentTime = 0;

    audio.play().then(() => {
      // Fade in smoothly over ~300ms
      let cur = 0.05;
      this.fadeInterval = setInterval(() => {
        cur = Math.min(targetVol, cur + (targetVol / 10));
        if (this.currentMusicAudio === audio) {
          audio!.volume = this.isMuted ? 0 : cur;
        }
        if (cur >= targetVol) {
          if (this.fadeInterval) clearInterval(this.fadeInterval);
          this.fadeInterval = null;
        }
      }, 30);
    }).catch(() => {
      // Autoplay might be blocked until user clicks
    });
  }

  public playLobbyMusic() {
    if (this.questionMusicTimeout) {
      clearTimeout(this.questionMusicTimeout);
      this.questionMusicTimeout = null;
    }
    this.playMusicTrack("LOBBY", "lobby", 0.7);
  }

  /**
   * Automatically maps to official Olympia countdown music:
   * - <= 15s: Olympia 10 Về đích (15s)
   * - 16s - 25s: Olympia 9 Về đích (20s)
   * - 26s - 45s: Olympia 22 Về đích (30s)
   * - > 45s: Olympia 10 Khởi động (60s)
   */
  public playQuestionMusic(remainingSeconds: number = 30) {
    if (this.questionMusicTimeout) {
      clearTimeout(this.questionMusicTimeout);
      this.questionMusicTimeout = null;
    }
    if (remainingSeconds <= 0) {
      this.stopMusic();
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

    this.playMusicTrack("QUESTION", selectedKey, 0.85);

    // Auto-stop music strictly when question timer expires - NEVER loop past time limit!
    this.questionMusicTimeout = setTimeout(() => {
      this.stopMusic();
      this.playTimeout();
    }, Math.max(1000, remainingSeconds * 1000));
  }

  public stopMusic() {
    if (this.questionMusicTimeout) {
      clearTimeout(this.questionMusicTimeout);
      this.questionMusicTimeout = null;
    }
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
    if (this.currentMusicAudio) {
      const audio = this.currentMusicAudio;
      this.currentMusicAudio = null;
      this.currentMusicType = null;
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {}
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

  public playCountdownTick(remaining: number) {
    if (remaining <= 0) {
      this.playSFX("go", 0.95);
    } else {
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
