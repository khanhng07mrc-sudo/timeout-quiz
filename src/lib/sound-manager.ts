// Web Audio API Procedural Sound Engine & Synthesizer for Timeout Quiz
// Zero external asset dependencies - instant, lightweight, cross-browser compatible

class SoundManager {
  private ctx: AudioContext | null = null;
  private musicGainNode: GainNode | null = null;
  private sfxGainNode: GainNode | null = null;
  private masterGainNode: GainNode | null = null;

  private isMuted: boolean = false;
  private volume: number = 0.8;
  private activeMusicInterval: NodeJS.Timeout | null = null;
  private isMusicPlaying: boolean = false;
  private currentMusicType: "LOBBY" | "QUESTION" | "VICTORY" | null = null;

  constructor() {
    // AudioContext will be lazily initialized on first user interaction
  }

  private initContext() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGainNode = this.ctx.createGain();
        this.musicGainNode = this.ctx.createGain();
        this.sfxGainNode = this.ctx.createGain();

        this.musicGainNode.connect(this.masterGainNode);
        this.sfxGainNode.connect(this.masterGainNode);
        this.masterGainNode.connect(this.ctx.destination);

        this.updateGain();
      }
    }

    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  // Safe cleanup helper to prevent dangling Web Audio nodes in audio graph
  private safeStopAndDisconnect(osc: OscillatorNode, gain: GainNode, stopTime: number) {
    try {
      osc.stop(stopTime);
      osc.onended = () => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch {}
      };
    } catch {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {}
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    this.updateGain();
    if (muted && this.isMusicPlaying) {
      this.stopMusic();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    this.updateGain();
  }

  public getVolume(): number {
    return this.volume;
  }

  private updateGain() {
    if (!this.masterGainNode || !this.ctx) return;
    const target = this.isMuted ? 0 : this.volume;
    this.masterGainNode.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
    if (this.musicGainNode) {
      this.musicGainNode.gain.setTargetAtTime(this.isMuted ? 0 : this.volume * 0.5, this.ctx.currentTime, 0.05);
    }
    if (this.sfxGainNode) {
      this.sfxGainNode.gain.setTargetAtTime(this.isMuted ? 0 : this.volume * 0.9, this.ctx.currentTime, 0.05);
    }
  }

  public unlockAudio() {
    this.initContext();
  }

  // ── Procedural Sound Effects (SFX) ──────────────────────────────────────────

  // Countdown tick (3, 2, 1, GO)
  public playCountdownTick(remaining: number) {
    this.initContext();
    if (!this.ctx || !this.sfxGainNode || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";

    if (remaining <= 0) {
      // GO! High vibrant double tone
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.2); // A6
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(this.sfxGainNode);
      osc.start(now);
      this.safeStopAndDisconnect(osc, gain, now + 0.35);
    } else {
      // 3, 2, 1 rhythm tick
      const freq = remaining === 1 ? 660 : 440;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(this.sfxGainNode);
      osc.start(now);
      this.safeStopAndDisconnect(osc, gain, now + 0.15);
    }
  }

  // Buzz button sound (sharp electric game-show buzzer)
  public playBuzz() {
    this.initContext();
    if (!this.ctx || !this.sfxGainNode || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = "sawtooth";
    osc2.type = "sawtooth";
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc2.frequency.setValueAtTime(659.25, now); // E5

    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGainNode);

    osc1.start(now);
    osc2.start(now);
    this.safeStopAndDisconnect(osc1, gain, now + 0.4);
    this.safeStopAndDisconnect(osc2, gain, now + 0.4);
  }

  // Correct answer chime (triumphant major chord arpeggio)
  public playCorrect() {
    this.initContext();
    if (!this.ctx || !this.sfxGainNode || this.isMuted) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const now = this.ctx!.currentTime + idx * 0.08;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(this.sfxGainNode!);

      osc.start(now);
      this.safeStopAndDisconnect(osc, gain, now + 0.5);
    });
  }

  // Wrong answer / penalty sound (dissonant descending buzz)
  public playWrong() {
    this.initContext();
    if (!this.ctx || !this.sfxGainNode || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.4);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);

    osc.start(now);
    this.safeStopAndDisconnect(osc, gain, now + 0.45);
  }

  // Power-up card activation (mystical ascending frequency sweep)
  public playPowerup() {
    this.initContext();
    if (!this.ctx || !this.sfxGainNode || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.35);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);

    osc.start(now);
    this.safeStopAndDisconnect(osc, gain, now + 0.4);
  }

  // Victory fanfare for leaderboard
  public playFanfare() {
    this.initContext();
    if (!this.ctx || !this.sfxGainNode || this.isMuted) return;

    const chordNotes = [
      { f: 523.25, t: 0.0, d: 0.15 }, // C5
      { f: 523.25, t: 0.18, d: 0.15 }, // C5
      { f: 523.25, t: 0.36, d: 0.15 }, // C5
      { f: 659.25, t: 0.54, d: 0.3 },  // E5
      { f: 587.33, t: 0.88, d: 0.15 }, // D5
      { f: 659.25, t: 1.06, d: 0.15 }, // E5
      { f: 783.99, t: 1.25, d: 0.8 },  // G5
    ];

    chordNotes.forEach(({ f, t, d }) => {
      const now = this.ctx!.currentTime + t;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(f, now);

      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + d);

      osc.connect(gain);
      gain.connect(this.sfxGainNode!);

      osc.start(now);
      this.safeStopAndDisconnect(osc, gain, now + d);
    });
  }

  // ── Procedural Background Music (BGM) ──────────────────────────────────────

  // Stop currently playing music
  public stopMusic() {
    if (this.activeMusicInterval) {
      clearInterval(this.activeMusicInterval);
      this.activeMusicInterval = null;
    }
    this.isMusicPlaying = false;
    this.currentMusicType = null;
  }

  // Start Lobby BGM (relaxing, modern upbeat melodic pulse)
  public playLobbyMusic() {
    if (this.isMuted) return;
    if (this.currentMusicType === "LOBBY" && this.isMusicPlaying) return;
    this.stopMusic();
    this.initContext();
    if (!this.ctx || !this.musicGainNode) return;

    this.isMusicPlaying = true;
    this.currentMusicType = "LOBBY";

    const chords = [
      [261.63, 329.63, 392.00], // C major
      [220.00, 261.63, 329.63], // A minor
      [174.61, 220.00, 261.63], // F major
      [196.00, 246.94, 293.66], // G major
    ];
    let step = 0;

    const playChordStep = () => {
      if (!this.ctx || !this.musicGainNode || !this.isMusicPlaying || this.isMuted) return;
      const currentChord = chords[step % chords.length];
      const now = this.ctx.currentTime;

      // Soft pad notes
      currentChord.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

        osc.connect(gain);
        gain.connect(this.musicGainNode!);
        osc.start(now);
        this.safeStopAndDisconnect(osc, gain, now + 1.8);
      });

      // Bass note
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = "triangle";
      bassOsc.frequency.setValueAtTime(currentChord[0] / 2, now);
      bassGain.gain.setValueAtTime(0.12, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      bassOsc.connect(bassGain);
      bassGain.connect(this.musicGainNode);
      bassOsc.start(now);
      this.safeStopAndDisconnect(bassOsc, bassGain, now + 0.9);

      step++;
    };

    playChordStep();
    this.activeMusicInterval = setInterval(playChordStep, 2000);
  }

  // Start Question Suspense BGM
  public playQuestionMusic(remainingSeconds: number = 30) {
    if (this.isMuted) return;
    if (this.currentMusicType === "QUESTION" && this.isMusicPlaying) return;
    this.stopMusic();
    this.initContext();
    if (!this.ctx || !this.musicGainNode) return;

    this.isMusicPlaying = true;
    this.currentMusicType = "QUESTION";

    let beat = 0;
    const playTensionBeat = () => {
      if (!this.ctx || !this.musicGainNode || !this.isMusicPlaying || this.isMuted) return;
      const now = this.ctx.currentTime;

      // Heartbeat / tension kick
      const kickOsc = this.ctx.createOscillator();
      const kickGain = this.ctx.createGain();
      kickOsc.type = "sine";
      kickOsc.frequency.setValueAtTime(110, now);
      kickOsc.frequency.exponentialRampToValueAtTime(45, now + 0.15);

      kickGain.gain.setValueAtTime(0.25, now);
      kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      kickOsc.connect(kickGain);
      kickGain.connect(this.musicGainNode);
      kickOsc.start(now);
      this.safeStopAndDisconnect(kickOsc, kickGain, now + 0.2);

      // Tension tick on offbeat
      if (beat % 2 === 1) {
        const tickOsc = this.ctx.createOscillator();
        const tickGain = this.ctx.createGain();
        tickOsc.type = "sine";
        tickOsc.frequency.setValueAtTime(880, now + 0.25);
        tickGain.gain.setValueAtTime(0.05, now + 0.25);
        tickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
        tickOsc.connect(tickGain);
        tickGain.connect(this.musicGainNode);
        tickOsc.start(now + 0.25);
        this.safeStopAndDisconnect(tickOsc, tickGain, now + 0.35);
      }

      beat++;
    };

    playTensionBeat();
    this.activeMusicInterval = setInterval(playTensionBeat, 650);
  }
}

// Global singleton instance
export const soundManager = typeof window !== "undefined" ? new SoundManager() : ({} as SoundManager);
