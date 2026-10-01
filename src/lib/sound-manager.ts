// Timeout Quiz - Studio Audio Engine
// Real high-fidelity gameshow audio player with seamless looping, smooth fading, and instant SFX.

class SoundManager {
  private isMuted: boolean = false;
  private volume: number = 0.8;

  // Background Music tracks
  private currentMusicAudio: HTMLAudioElement | null = null;
  private currentMusicType: "LOBBY" | "QUESTION" | "VICTORY" | null = null;
  private fadeInterval: NodeJS.Timeout | null = null;

  // Preloaded audio elements
  private sfxMap: Map<string, HTMLAudioElement> = new Map();
  private bgmMap: Map<string, HTMLAudioElement> = new Map();
  private initialized: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.initAudioAssets();
    }
  }

  private initAudioAssets() {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;

    const sfxList = ["tick", "buzz", "correct", "wrong", "go", "fanfare", "powerup"];
    sfxList.forEach((name) => {
      try {
        const audio = new Audio(`/sounds/${name}.wav`);
        audio.preload = "auto";
        audio.volume = this.volume;
        this.sfxMap.set(name, audio);
      } catch {}
    });

    const bgmList = ["lobby", "question_suspense"];
    bgmList.forEach((name) => {
      try {
        const audio = new Audio(`/sounds/${name}.wav`);
        audio.preload = "auto";
        audio.loop = true;
        audio.volume = this.volume;
        this.bgmMap.set(name, audio);
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

  private playMusicTrack(type: "LOBBY" | "QUESTION", audioKey: string, targetVolFactor: number = 0.75) {
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
      audio = new Audio(`/sounds/${audioKey}.wav`);
      audio.loop = true;
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

  private questionMusicTimeout: NodeJS.Timeout | null = null;

  public playLobbyMusic() {
    if (this.questionMusicTimeout) {
      clearTimeout(this.questionMusicTimeout);
      this.questionMusicTimeout = null;
    }
    this.playMusicTrack("LOBBY", "lobby", 0.7);
  }

  public playQuestionMusic(remainingSeconds: number = 30) {
    if (this.questionMusicTimeout) {
      clearTimeout(this.questionMusicTimeout);
      this.questionMusicTimeout = null;
    }
    if (remainingSeconds <= 0) {
      this.stopMusic();
      return;
    }
    this.playMusicTrack("QUESTION", "question_suspense", 0.75);
    // Auto-stop music strictly when question timer expires - NEVER loop past time limit!
    this.questionMusicTimeout = setTimeout(() => {
      this.stopMusic();
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

  private playSFX(name: string, volumeScale: number = 1.0) {
    if (this.isMuted) return;
    this.initAudioAssets();

    try {
      const original = this.sfxMap.get(name);
      if (!original) {
        const sound = new Audio(`/sounds/${name}.wav`);
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

  public playBuzz() {
    this.playSFX("buzz", 1.0);
  }

  public playCorrect() {
    this.playSFX("correct", 0.9);
  }

  public playWrong() {
    this.playSFX("wrong", 0.9);
  }

  public playFanfare() {
    this.playSFX("fanfare", 0.95);
  }

  public playPowerup() {
    this.playSFX("powerup", 0.85);
  }
}

export const soundManager = typeof window !== "undefined" ? new SoundManager() : ({} as SoundManager);
