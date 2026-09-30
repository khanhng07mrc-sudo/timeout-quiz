// Web Audio API High-Impact Procedural Sound & Music Engine for Timeout Quiz
// Professional game-show grade synthesizer with punchy drums, driving basslines,
// dramatic suspense drones, and crisp broadcast sound design. Zero external audio file dependencies.

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private musicGainNode: GainNode | null = null;
  private sfxGainNode: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private isMuted: boolean = false;
  private volume: number = 0.85;

  private activeMusicInterval: NodeJS.Timeout | null = null;
  private isMusicPlaying: boolean = false;
  private currentMusicType: "LOBBY" | "QUESTION" | "VICTORY" | null = null;

  constructor() {
    // Lazily initialized on first user interaction
  }

  private initContext() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();

        // Broadcast-quality Master Dynamics Compressor / Limiter
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
        this.compressor.knee.setValueAtTime(24, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(6, this.ctx.currentTime);
        this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
        this.compressor.release.setValueAtTime(0.18, this.ctx.currentTime);

        this.masterGainNode = this.ctx.createGain();
        this.musicGainNode = this.ctx.createGain();
        this.sfxGainNode = this.ctx.createGain();

        // Audio graph routing: [Music, SFX] -> Compressor -> MasterGain -> Destination
        this.musicGainNode.connect(this.compressor);
        this.sfxGainNode.connect(this.compressor);
        this.compressor.connect(this.masterGainNode);
        this.masterGainNode.connect(this.ctx.destination);

        this.initNoiseBuffer();
        this.updateGain();
      }
    }

    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  // Generate 2 seconds of high quality white noise for drum synthesis (snares, hi-hats, sweeps)
  private initNoiseBuffer() {
    if (!this.ctx || this.noiseBuffer) return;
    const sampleRate = this.ctx.sampleRate;
    const bufferSize = sampleRate * 2;
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  // Safe disconnection to prevent memory & Web Audio graph leaks
  private safeStopAndDisconnect(
    nodes: (AudioNode | null | undefined)[],
    source: AudioScheduledSourceNode,
    stopTime: number
  ) {
    try {
      source.stop(stopTime);
      source.onended = () => {
        try {
          source.disconnect();
          nodes.forEach((n) => n?.disconnect());
        } catch {}
      };
    } catch {
      try {
        source.disconnect();
        nodes.forEach((n) => n?.disconnect());
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
    const now = this.ctx.currentTime;
    const target = this.isMuted ? 0 : this.volume;
    this.masterGainNode.gain.setTargetAtTime(target, now, 0.04);

    if (this.musicGainNode) {
      // Powerful, prominent music level (not weak whispers)
      const musicVol = this.isMuted ? 0 : this.volume * 0.82;
      this.musicGainNode.gain.setTargetAtTime(musicVol, now, 0.04);
    }
    if (this.sfxGainNode) {
      // Clear, punchy game SFX
      const sfxVol = this.isMuted ? 0 : this.volume * 0.95;
      this.sfxGainNode.gain.setTargetAtTime(sfxVol, now, 0.04);
    }
  }

  public unlockAudio() {
    this.initContext();
  }

  // ── Procedural Drum Synthesizers ───────────────────────────────────────────

  // Punchy Electronic Kick Drum (808/909 hybrid)
  private playKick(time: number, isSubHeavy: boolean = true) {
    if (!this.ctx || !this.musicGainNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    // Pitch envelope: fast click down to deep sub boom
    osc.frequency.setValueAtTime(170, time);
    osc.frequency.exponentialRampToValueAtTime(48, time + 0.08);
    osc.frequency.exponentialRampToValueAtTime(32, time + 0.22);

    gain.gain.setValueAtTime(0.75, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + (isSubHeavy ? 0.25 : 0.16));

    osc.connect(gain);
    gain.connect(this.musicGainNode);
    osc.start(time);
    this.safeStopAndDisconnect([gain], osc, time + 0.26);
  }

  // Snappy Electronic Snare / Clap
  private playSnare(time: number) {
    if (!this.ctx || !this.musicGainNode || !this.noiseBuffer) return;

    // Noise component
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1750, time);
    filter.Q.setValueAtTime(1.8, time);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.45, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.musicGainNode);
    noiseSource.start(time);
    this.safeStopAndDisconnect([filter, noiseGain], noiseSource, time + 0.19);

    // Tonal body tone
    const osc = this.ctx.createOscillator();
    const toneGain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(190, time);
    osc.frequency.exponentialRampToValueAtTime(80, time + 0.1);
    toneGain.gain.setValueAtTime(0.35, time);
    toneGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    osc.connect(toneGain);
    toneGain.connect(this.musicGainNode);
    osc.start(time);
    this.safeStopAndDisconnect([toneGain], osc, time + 0.13);
  }

  // Crisp Metallic Hi-Hat
  private playHiHat(time: number, accented: boolean = false) {
    if (!this.ctx || !this.musicGainNode || !this.noiseBuffer) return;

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(7500, time);

    const gain = this.ctx.createGain();
    const amp = accented ? 0.28 : 0.14;
    gain.gain.setValueAtTime(amp, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGainNode);
    noiseSource.start(time);
    this.safeStopAndDisconnect([filter, gain], noiseSource, time + 0.06);
  }

  // ── Procedural Sound Effects (SFX) ──────────────────────────────────────────

  // Countdown tick (3, 2, 1, GO)
  public playCountdownTick(remaining: number) {
    this.initContext();
    if (!this.ctx || !this.sfxGainNode || this.isMuted) return;

    const now = this.ctx.currentTime;

    if (remaining <= 0) {
      // GO! Powerful brass/synth fanfare burst
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.35 / (i + 1), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.connect(gain);
        gain.connect(this.sfxGainNode!);
        osc.start(now);
        this.safeStopAndDisconnect([gain], osc, now + 0.46);
      });
    } else {
      // Dramatic punchy rhythm tick (resembling game-show tension clock)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      const freq = remaining === 1 ? 880 : 587.33;
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + 0.12);

      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(this.sfxGainNode);
      osc.start(now);
      this.safeStopAndDisconnect([gain], osc, now + 0.15);
    }
  }

  // Buzz button sound (authoritative, electric game-show buzzer)
  public playBuzz() {
    this.initContext();
    if (!this.ctx || !this.sfxGainNode || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = "sawtooth";
    osc2.type = "sawtooth";
    osc1.frequency.setValueAtTime(440, now); // A4
    osc2.frequency.setValueAtTime(443, now); // Detuned for rich electric thickness

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1400, now);

    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGainNode);

    osc1.start(now);
    osc2.start(now);
    this.safeStopAndDisconnect([filter, gain], osc1, now + 0.46);
    this.safeStopAndDisconnect([filter, gain], osc2, now + 0.46);
  }

  // Correct answer chime (sparkling major chord triumph)
  public playCorrect() {
    this.initContext();
    if (!this.ctx || !this.sfxGainNode || this.isMuted) return;

    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C major 9 arpeggio
    notes.forEach((freq, idx) => {
      const now = this.ctx!.currentTime + idx * 0.07;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.48, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      osc.connect(gain);
      gain.connect(this.sfxGainNode!);

      osc.start(now);
      this.safeStopAndDisconnect([gain], osc, now + 0.56);
    });
  }

  // Wrong answer / penalty sound (dramatic descending dissonant brass)
  public playWrong() {
    this.initContext();
    if (!this.ctx || !this.sfxGainNode || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = "sawtooth";
    osc2.type = "sawtooth";
    osc1.frequency.setValueAtTime(196, now); // G3
    osc1.frequency.exponentialRampToValueAtTime(98, now + 0.42); // Drop to G2

    osc2.frequency.setValueAtTime(185, now); // F#3 (dissonant semitone)
    osc2.frequency.exponentialRampToValueAtTime(92.5, now + 0.42);

    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGainNode);

    osc1.start(now);
    osc2.start(now);
    this.safeStopAndDisconnect([gain], osc1, now + 0.46);
    this.safeStopAndDisconnect([gain], osc2, now + 0.46);
  }

  // Power-up card activation (mystical ascending frequency sweep with shimmer)
  public playPowerup() {
    this.initContext();
    if (!this.ctx || !this.sfxGainNode || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.38);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);

    osc.start(now);
    this.safeStopAndDisconnect([gain], osc, now + 0.43);
  }

  // Victory fanfare for leaderboard
  public playFanfare() {
    this.initContext();
    if (!this.ctx || !this.sfxGainNode || this.isMuted) return;

    const chordNotes = [
      { f: 523.25, t: 0.0, d: 0.16 }, // C5
      { f: 523.25, t: 0.18, d: 0.16 }, // C5
      { f: 523.25, t: 0.36, d: 0.16 }, // C5
      { f: 659.25, t: 0.54, d: 0.35 }, // E5
      { f: 587.33, t: 0.9, d: 0.18 }, // D5
      { f: 659.25, t: 1.1, d: 0.18 }, // E5
      { f: 783.99, t: 1.3, d: 0.9 }, // G5
      { f: 1046.5, t: 1.3, d: 0.9 }, // C6
    ];

    chordNotes.forEach(({ f, t, d }) => {
      const now = this.ctx!.currentTime + t;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(f, now);

      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + d);

      osc.connect(gain);
      gain.connect(this.sfxGainNode!);

      osc.start(now);
      this.safeStopAndDisconnect([gain], osc, now + d + 0.02);
    });
  }

  // ── Procedural Background Music (BGM) ──────────────────────────────────────

  public stopMusic() {
    if (this.activeMusicInterval) {
      clearInterval(this.activeMusicInterval);
      this.activeMusicInterval = null;
    }
    this.isMusicPlaying = false;
    this.currentMusicType = null;
  }

  // ── 1. Lobby BGM: High-Energy Modern Electronic Game-Show Beat (124 BPM) ───
  public playLobbyMusic() {
    if (this.isMuted) return;
    if (this.currentMusicType === "LOBBY" && this.isMusicPlaying) return;
    this.stopMusic();
    this.initContext();
    if (!this.ctx || !this.musicGainNode) return;

    this.isMusicPlaying = true;
    this.currentMusicType = "LOBBY";

    // 124 BPM => 16th note step = ~121ms. 1 bar (16 steps) = ~1.935s
    const stepDuration = 0.121;
    let step = 0;

    // Harmonic progression: Am7 -> Fmaj7 -> Cmaj7 -> G7
    const chords = [
      [220.0, 261.63, 329.63, 392.0], // Am7
      [174.61, 220.0, 261.63, 329.63], // Fmaj7
      [261.63, 329.63, 392.0, 493.88], // Cmaj7
      [196.0, 246.94, 293.66, 349.23], // G7
    ];

    const bassNotes = [110.0, 87.31, 130.81, 98.0]; // A2, F2, C3, G2

    const tickBar = () => {
      if (!this.ctx || !this.musicGainNode || !this.isMusicPlaying || this.isMuted) return;
      const startTime = this.ctx.currentTime;
      const barIndex = Math.floor(step / 16) % chords.length;
      const currentChord = chords[barIndex];
      const currentBass = bassNotes[barIndex];

      // Schedule full 16-step bar for jitter-free rhythmic precision
      for (let s = 0; s < 16; s++) {
        const time = startTime + s * stepDuration;

        // 1. Kick Drum on beats 1, 5, 9, 13 (four on the floor!)
        if (s % 4 === 0) {
          this.playKick(time);
        }

        // 2. Snare / Clap on beats 5 and 13 (beats 2 & 4 of bar)
        if (s === 4 || s === 12) {
          this.playSnare(time);
        }

        // 3. Hi-Hats: 16th groove with accents
        if (s % 2 === 0) {
          this.playHiHat(time, s % 4 === 2);
        }

        // 4. Bouncy synth-bassline (syncopated 16th notes)
        if (s === 0 || s === 3 || s === 6 || s === 8 || s === 11 || s === 14) {
          const bassOsc = this.ctx.createOscillator();
          const bassFilter = this.ctx.createBiquadFilter();
          const bassGain = this.ctx.createGain();

          bassOsc.type = "sawtooth";
          const octave = s === 3 || s === 11 ? 1.5 : 1.0;
          bassOsc.frequency.setValueAtTime(currentBass * octave, time);

          bassFilter.type = "lowpass";
          bassFilter.frequency.setValueAtTime(650, time);
          bassFilter.Q.setValueAtTime(3, time);

          bassGain.gain.setValueAtTime(0.36, time);
          bassGain.gain.exponentialRampToValueAtTime(0.001, time + 0.11);

          bassOsc.connect(bassFilter);
          bassFilter.connect(bassGain);
          bassGain.connect(this.musicGainNode);

          bassOsc.start(time);
          this.safeStopAndDisconnect([bassFilter, bassGain], bassOsc, time + 0.12);
        }
      }

      // 5. Rich Synth Chords (syncopated stabs on steps 0, 6, 12)
      [0, 6, 12].forEach((stabStep) => {
        const stabTime = startTime + stabStep * stepDuration;
        currentChord.forEach((freq) => {
          const osc = this.ctx!.createOscillator();
          const filter = this.ctx!.createBiquadFilter();
          const gain = this.ctx!.createGain();

          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(freq, stabTime);

          filter.type = "lowpass";
          filter.frequency.setValueAtTime(1400, stabTime);
          filter.frequency.exponentialRampToValueAtTime(500, stabTime + 0.22);
          filter.Q.setValueAtTime(2.5, stabTime);

          gain.gain.setValueAtTime(0.18, stabTime);
          gain.gain.exponentialRampToValueAtTime(0.001, stabTime + 0.24);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.musicGainNode!);

          osc.start(stabTime);
          this.safeStopAndDisconnect([filter, gain], osc, stabTime + 0.25);
        });
      });

      step += 16;
    };

    tickBar();
    this.activeMusicInterval = setInterval(tickBar, 1935);
  }

  // ── 2. Question Suspense BGM: Cinematic Heart-Pounding Tension (128 BPM) ───
  public playQuestionMusic(remainingSeconds: number = 30) {
    if (this.isMuted) return;
    if (this.currentMusicType === "QUESTION" && this.isMusicPlaying) return;
    this.stopMusic();
    this.initContext();
    if (!this.ctx || !this.musicGainNode) return;

    this.isMusicPlaying = true;
    this.currentMusicType = "QUESTION";

    // 128 BPM => beat = ~468ms
    let beat = 0;

    const playTensionStep = () => {
      if (!this.ctx || !this.musicGainNode || !this.isMusicPlaying || this.isMuted) return;
      const now = this.ctx.currentTime;

      // 1. Double Heartbeat Thump Kick ("Boom-Boom")
      this.playKick(now, true);
      setTimeout(() => {
        if (this.isMusicPlaying && !this.isMuted && this.ctx) {
          this.playKick(this.ctx.currentTime, false);
        }
      }, 160);

      // 2. Deep Menacing Drone Pad (Dark suspense reese chord in D minor / F#)
      if (beat % 4 === 0) {
        [73.42, 110.0, 146.83].forEach((f, idx) => { // D2, A2, D3
          const droneOsc = this.ctx!.createOscillator();
          const droneFilter = this.ctx!.createBiquadFilter();
          const droneGain = this.ctx!.createGain();

          droneOsc.type = "sawtooth";
          // Subtle detune for rich dark cinematic chorus
          droneOsc.frequency.setValueAtTime(f + (idx === 0 ? -0.8 : 0.8), now);

          droneFilter.type = "lowpass";
          droneFilter.frequency.setValueAtTime(450, now);
          droneFilter.Q.setValueAtTime(3, now);

          droneGain.gain.setValueAtTime(0.001, now);
          droneGain.gain.linearRampToValueAtTime(0.24, now + 0.3);
          droneGain.gain.exponentialRampToValueAtTime(0.001, now + 1.85);

          droneOsc.connect(droneFilter);
          droneFilter.connect(droneGain);
          droneGain.connect(this.musicGainNode!);

          droneOsc.start(now);
          this.safeStopAndDisconnect([droneFilter, droneGain], droneOsc, now + 1.88);
        });
      }

      // 3. Sharp Cinematic Tension Clock Tick on offbeat
      const tickOsc = this.ctx.createOscillator();
      const tickFilter = this.ctx.createBiquadFilter();
      const tickGain = this.ctx.createGain();

      tickOsc.type = "triangle";
      const tickFreq = beat % 2 === 0 ? 1174.66 : 880; // High metallic clock tick
      tickOsc.frequency.setValueAtTime(tickFreq, now + 0.23);

      tickFilter.type = "bandpass";
      tickFilter.frequency.setValueAtTime(tickFreq, now + 0.23);
      tickFilter.Q.setValueAtTime(6, now + 0.23);

      tickGain.gain.setValueAtTime(0.18, now + 0.23);
      tickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      tickOsc.connect(tickFilter);
      tickFilter.connect(tickGain);
      tickGain.connect(this.musicGainNode);

      tickOsc.start(now + 0.23);
      this.safeStopAndDisconnect([tickFilter, tickGain], tickOsc, now + 0.34);

      // 4. Climax Riser: High-tension rising synth sweep every 8 beats
      if (beat % 8 === 6) {
        const riserOsc = this.ctx.createOscillator();
        const riserGain = this.ctx.createGain();
        riserOsc.type = "sawtooth";
        riserOsc.frequency.setValueAtTime(300, now + 0.1);
        riserOsc.frequency.exponentialRampToValueAtTime(1200, now + 0.85);

        riserGain.gain.setValueAtTime(0.001, now + 0.1);
        riserGain.gain.linearRampToValueAtTime(0.22, now + 0.6);
        riserGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

        riserOsc.connect(riserGain);
        riserGain.connect(this.musicGainNode);

        riserOsc.start(now + 0.1);
        this.safeStopAndDisconnect([riserGain], riserOsc, now + 0.92);
      }

      beat++;
    };

    playTensionStep();
    this.activeMusicInterval = setInterval(playTensionStep, 468);
  }
}

// Global singleton instance
export const soundManager = typeof window !== "undefined" ? new SoundManager() : ({} as SoundManager);
