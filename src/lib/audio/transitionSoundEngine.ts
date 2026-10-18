/**
 * Web Audio API Procedural Synthesizer for 3D Game Transitions
 * 0MB network download, 0ms latency, high-fidelity real-time audio synthesis.
 */

class TransitionSoundEngine {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Chơi hiệu ứng âm thanh thủ công dựa trên Game Mode
  playTransitionSfx(mode: string) {
    const ctx = this.getContext();
    if (!ctx) return;

    const norm = (mode || "").toUpperCase();
    const now = ctx.currentTime;

    try {
      if (norm.includes("CARO")) {
        this.playGridCaro(ctx, now);
      } else if (norm.includes("MYSTERY") || norm.includes("QUEST")) {
        this.playMysteryQuest(ctx, now);
      } else if (norm.includes("BUZZ") || norm.includes("SPEED") || norm.includes("RACE")) {
        this.playSpeedRace(ctx, now);
      } else if (norm.includes("TOWER") || norm.includes("DEFENSE") || norm.includes("ELIMINATION")) {
        this.playTowerDefense(ctx, now);
      } else if (norm.includes("BATTLE") || norm.includes("ROYALE") || norm.includes("TOURNAMENT")) {
        this.playBattleRoyale(ctx, now);
      } else if (norm.includes("BOSS") || norm.includes("RAID")) {
        this.playBossRaid(ctx, now);
      } else if (norm.includes("GOLD") || norm.includes("MINE") || norm.includes("WAGER")) {
        this.playGoldMine(ctx, now);
      } else if (norm.includes("AUCTION") || norm.includes("STEALTH") || norm.includes("DICE")) {
        this.playAuctionStealth(ctx, now);
      } else if (norm.includes("MAGIC") || norm.includes("WHEEL")) {
        this.playMagicWheel(ctx, now);
      } else {
        this.playClassicQuiz(ctx, now);
      }
    } catch {
      // Audio autoplay policy fallback
    }
  }

  // 1. Grid Caro: Ô lật lách cách cơ khí + gió portal không gian
  private playGridCaro(ctx: AudioContext, now: number) {
    // 3 nhịp lật ô lách cách
    [0, 0.1, 0.22, 0.35].forEach((delay, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(400 + idx * 120, now + delay);
      osc.frequency.exponentialRampToValueAtTime(800 + idx * 200, now + delay + 0.05);

      gain.gain.setValueAtTime(0.12, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.09);
    });

    // Portal gió không gian mở rộng
    const oscP = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gainP = ctx.createGain();

    oscP.type = "sawtooth";
    oscP.frequency.setValueAtTime(110, now + 0.4);
    oscP.frequency.exponentialRampToValueAtTime(440, now + 1.2);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(300, now + 0.4);
    filter.frequency.exponentialRampToValueAtTime(2400, now + 1.1);

    gainP.gain.setValueAtTime(0.001, now + 0.4);
    gainP.gain.linearRampToValueAtTime(0.2, now + 0.9);
    gainP.gain.exponentialRampToValueAtTime(0.001, now + 1.35);

    oscP.connect(filter);
    filter.connect(gainP);
    gainP.connect(ctx.destination);
    oscP.start(now + 0.4);
    oscP.stop(now + 1.4);
  }

  // 2. Mystery Quest: Cắm chìa khóa "click" + sóng âm Iris ma thuật
  private playMysteryQuest(ctx: AudioContext, now: number) {
    // Tiếng cắm xoay chìa khóa
    const oscKey = ctx.createOscillator();
    const gainKey = ctx.createGain();
    oscKey.type = "square";
    oscKey.frequency.setValueAtTime(880, now + 0.15);
    oscKey.frequency.setValueAtTime(1320, now + 0.22);

    gainKey.gain.setValueAtTime(0.15, now + 0.15);
    gainKey.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    oscKey.connect(gainKey);
    gainKey.connect(ctx.destination);
    oscKey.start(now + 0.15);
    oscKey.stop(now + 0.32);

    // Chuỗi hợp âm ngọc bích Iris ngân vang (Chimes)
    [0.35, 0.45, 0.58, 0.72].forEach((delay, idx) => {
      const chime = ctx.createOscillator();
      const cGain = ctx.createGain();
      const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      chime.type = "sine";
      chime.frequency.setValueAtTime(freqs[idx], now + delay);

      cGain.gain.setValueAtTime(0.18, now + delay);
      cGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.6);

      chime.connect(cGain);
      cGain.connect(ctx.destination);
      chime.start(now + delay);
      chime.stop(now + delay + 0.65);
    });
  }

  // 3. Speed Race / Buzz: Nitro boost xé toạc không gian
  private playSpeedRace(ctx: AudioContext, now: number) {
    const oscEngine = ctx.createOscillator();
    const gainEngine = ctx.createGain();

    oscEngine.type = "sawtooth";
    oscEngine.frequency.setValueAtTime(90, now);
    oscEngine.frequency.exponentialRampToValueAtTime(750, now + 0.85);

    gainEngine.gain.setValueAtTime(0.05, now);
    gainEngine.gain.linearRampToValueAtTime(0.22, now + 0.6);
    gainEngine.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

    oscEngine.connect(gainEngine);
    gainEngine.connect(ctx.destination);
    oscEngine.start(now);
    oscEngine.stop(now + 1.35);

    // Tiếng rít supersonic
    const noise = ctx.createOscillator();
    const nGain = ctx.createGain();
    noise.type = "triangle";
    noise.frequency.setValueAtTime(1200, now + 0.4);
    noise.frequency.exponentialRampToValueAtTime(3200, now + 1.0);

    nGain.gain.setValueAtTime(0.001, now + 0.4);
    nGain.gain.linearRampToValueAtTime(0.12, now + 0.8);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 1.25);

    noise.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now + 0.4);
    noise.stop(now + 1.3);
  }

  // 4. Tower Defense: Nạp tháp pha lê & kích khiên lực Hexagon
  private playTowerDefense(ctx: AudioContext, now: number) {
    const hum = ctx.createOscillator();
    const humGain = ctx.createGain();
    hum.type = "sine";
    hum.frequency.setValueAtTime(140, now);
    hum.frequency.exponentialRampToValueAtTime(480, now + 0.8);

    humGain.gain.setValueAtTime(0.08, now);
    humGain.gain.linearRampToValueAtTime(0.2, now + 0.6);
    humGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    hum.connect(humGain);
    humGain.connect(ctx.destination);
    hum.start(now);
    hum.stop(now + 1.25);

    // Sóng năng lượng lục giác bung tỏa
    const wave = ctx.createOscillator();
    const waveGain = ctx.createGain();
    wave.type = "triangle";
    wave.frequency.setValueAtTime(600, now + 0.6);
    wave.frequency.exponentialRampToValueAtTime(180, now + 1.3);

    waveGain.gain.setValueAtTime(0.15, now + 0.6);
    waveGain.gain.exponentialRampToValueAtTime(0.001, now + 1.35);

    wave.connect(waveGain);
    waveGain.connect(ctx.destination);
    wave.start(now + 0.6);
    wave.stop(now + 1.4);
  }

  // 5. Battle Royale: Tháp rơi thud + vòng bo điện tử giật
  private playBattleRoyale(ctx: AudioContext, now: number) {
    // Tiếng cắm đất mạnh thud
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = "sine";
    sub.frequency.setValueAtTime(150, now + 0.2);
    sub.frequency.exponentialRampToValueAtTime(35, now + 0.7);

    subGain.gain.setValueAtTime(0.35, now + 0.2);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

    sub.connect(subGain);
    subGain.connect(ctx.destination);
    sub.start(now + 0.2);
    sub.stop(now + 0.9);

    // Tiếng điện từ vòng bo
    const zap = ctx.createOscillator();
    const zapGain = ctx.createGain();
    zap.type = "sawtooth";
    zap.frequency.setValueAtTime(220, now + 0.5);
    zap.frequency.setValueAtTime(440, now + 0.7);
    zap.frequency.setValueAtTime(110, now + 0.9);

    zapGain.gain.setValueAtTime(0.1, now + 0.5);
    zapGain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

    zap.connect(zapGain);
    zapGain.connect(ctx.destination);
    zap.start(now + 0.5);
    zap.stop(now + 1.35);
  }

  // 6. Boss Raid: Gầm quái thú hạ âm + dung nham bùng cháy
  private playBossRaid(ctx: AudioContext, now: number) {
    const roar = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const roarGain = ctx.createGain();

    roar.type = "sawtooth";
    roar.frequency.setValueAtTime(65, now + 0.1);
    roar.frequency.exponentialRampToValueAtTime(140, now + 0.6);
    roar.frequency.exponentialRampToValueAtTime(45, now + 1.2);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(450, now + 0.1);
    filter.frequency.exponentialRampToValueAtTime(1200, now + 0.6);
    filter.frequency.exponentialRampToValueAtTime(250, now + 1.2);

    roarGain.gain.setValueAtTime(0.05, now + 0.1);
    roarGain.gain.linearRampToValueAtTime(0.35, now + 0.5);
    roarGain.gain.exponentialRampToValueAtTime(0.001, now + 1.35);

    roar.connect(filter);
    filter.connect(roarGain);
    roarGain.connect(ctx.destination);
    roar.start(now + 0.1);
    roar.stop(now + 1.4);
  }

  // 7. Gold Mine: Cuốc chim đập vang + mưa tiền vàng xủng xoảng
  private playGoldMine(ctx: AudioContext, now: number) {
    // Tiếng cuốc đập đá keng
    const strike = ctx.createOscillator();
    const strikeGain = ctx.createGain();
    strike.type = "triangle";
    strike.frequency.setValueAtTime(1200, now + 0.15);
    strike.frequency.exponentialRampToValueAtTime(600, now + 0.35);

    strikeGain.gain.setValueAtTime(0.3, now + 0.15);
    strikeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    strike.connect(strikeGain);
    strikeGain.connect(ctx.destination);
    strike.start(now + 0.15);
    strike.stop(now + 0.45);

    // Tiếng mưa tiền vàng rơi
    [0.35, 0.48, 0.6, 0.72, 0.85, 0.98].forEach((delay, idx) => {
      const coin = ctx.createOscillator();
      const cGain = ctx.createGain();
      coin.type = "sine";
      coin.frequency.setValueAtTime(1600 + (idx % 3) * 350, now + delay);

      cGain.gain.setValueAtTime(0.12, now + delay);
      cGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.18);

      coin.connect(cGain);
      cGain.connect(ctx.destination);
      coin.start(now + delay);
      coin.stop(now + delay + 0.2);
    });
  }

  // 8. Auction Stealth: Gõ búa cộp + sương khói tím huyền bí
  private playAuctionStealth(ctx: AudioContext, now: number) {
    // Tiếng gõ búa cộp
    const gavel = ctx.createOscillator();
    const gGain = ctx.createGain();
    gavel.type = "triangle";
    gavel.frequency.setValueAtTime(350, now + 0.2);
    gavel.frequency.exponentialRampToValueAtTime(90, now + 0.35);

    gGain.gain.setValueAtTime(0.35, now + 0.2);
    gGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    gavel.connect(gGain);
    gGain.connect(ctx.destination);
    gavel.start(now + 0.2);
    gavel.stop(now + 0.5);

    // Tiếng sương khói ảo thuật
    const mist = ctx.createOscillator();
    const mFilter = ctx.createBiquadFilter();
    const mGain = ctx.createGain();

    mist.type = "sawtooth";
    mist.frequency.setValueAtTime(320, now + 0.45);
    mist.frequency.exponentialRampToValueAtTime(140, now + 1.1);

    mFilter.type = "bandpass";
    mFilter.frequency.setValueAtTime(800, now + 0.45);

    mGain.gain.setValueAtTime(0.12, now + 0.45);
    mGain.gain.exponentialRampToValueAtTime(0.001, now + 1.25);

    mist.connect(mFilter);
    mFilter.connect(mGain);
    mGain.connect(ctx.destination);
    mist.start(now + 0.45);
    mist.stop(now + 1.3);
  }

  // 9. Classic Quiz: Sách lật phần phật + chuông vàng vinh quang
  private playClassicQuiz(ctx: AudioContext, now: number) {
    // Sách lật trang
    [0.1, 0.18, 0.28, 0.38].forEach((delay, idx) => {
      const page = ctx.createOscillator();
      const pGain = ctx.createGain();
      page.type = "triangle";
      page.frequency.setValueAtTime(300 + idx * 80, now + delay);
      pGain.gain.setValueAtTime(0.08, now + delay);
      pGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.08);

      page.connect(pGain);
      pGain.connect(ctx.destination);
      page.start(now + delay);
      page.stop(now + delay + 0.09);
    });

    // Chuông vàng vô địch ngân vang
    const bell = ctx.createOscillator();
    const bGain = ctx.createGain();
    bell.type = "sine";
    bell.frequency.setValueAtTime(880, now + 0.55); // A5
    bell.frequency.setValueAtTime(1046.5, now + 0.7); // C6

    bGain.gain.setValueAtTime(0.2, now + 0.55);
    bGain.gain.exponentialRampToValueAtTime(0.001, now + 1.35);

    bell.connect(bGain);
    bGain.connect(ctx.destination);
    bell.start(now + 0.55);
    bell.stop(now + 1.4);
  }

  // 10. Magic Wheel: Tiếng kim gõ chốt nón dồn dập + Kèn mở màn VTV3
  private playMagicWheel(ctx: AudioContext, now: number) {
    // Tiếng kim gõ chốt liên thanh dồn dập (24 chốt nón)
    for (let i = 0; i < 14; i++) {
      const delay = i * 0.045 + (i * i * 0.003); // Giảm tốc nhẹ
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1400 + (i % 3) * 200, now + delay);
      gain.gain.setValueAtTime(0.09, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.03);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.035);
    }

    // Fanfare mở màn hào hùng
    [
      { freq: 523.25, time: 0.35, dur: 0.2 }, // C5
      { freq: 659.25, time: 0.52, dur: 0.2 }, // E5
      { freq: 783.99, time: 0.70, dur: 0.25 }, // G5
      { freq: 1046.5, time: 0.92, dur: 0.45 }, // C6
    ].forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(note.freq, now + note.time);

      gain.gain.setValueAtTime(0.001, now + note.time);
      gain.gain.linearRampToValueAtTime(0.15, now + note.time + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.dur);

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(2500, now + note.time);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + note.time);
      osc.stop(now + note.time + note.dur + 0.05);
    });
  }
}

export const transitionSoundEngine = new TransitionSoundEngine();
