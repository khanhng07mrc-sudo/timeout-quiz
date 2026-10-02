import math
import struct
import wave
import os
import lameenc

SOUNDS_DIR = r"d:/Timeout Quiz/timeout-quiz/public/sounds"
os.makedirs(SOUNDS_DIR, exist_ok=True)
SAMPLE_RATE = 44100

def write_audio(filename_base, samples):
    """Writes both WAV and high-bitrate MP3 files for maximum web compatibility and performance."""
    # 1. Write WAV (Lossless fallback)
    wav_path = os.path.join(SOUNDS_DIR, f"{filename_base}.wav")
    pcm_bytes = bytearray()
    for s in samples:
        val = max(-1.0, min(1.0, s))
        int_val = int(val * 32767)
        pcm_bytes.extend(struct.pack("<h", int_val))
    
    with wave.open(wav_path, "w") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(pcm_bytes)
        
    # 2. Write MP3 (Super-fast lightweight stream)
    mp3_path = os.path.join(SOUNDS_DIR, f"{filename_base}.mp3")
    encoder = lameenc.Encoder()
    encoder.set_bit_rate(192)
    encoder.set_in_sample_rate(SAMPLE_RATE)
    encoder.set_channels(1)
    encoder.set_quality(2)
    mp3_data = encoder.encode(bytes(pcm_bytes)) + encoder.flush()
    with open(mp3_path, "wb") as f:
        f.write(mp3_data)
        
    dur = len(samples) / SAMPLE_RATE
    print(f"Generated {filename_base}: {dur:.2f}s | WAV: {len(pcm_bytes)} bytes | MP3: {len(mp3_data)} bytes")

# ── Synthesis Building Blocks ────────────────────────────────────────────────
def envelope(t, attack, decay, sustain, release, duration):
    if t < attack:
        return t / attack
    elif t < attack + decay:
        return 1.0 - (1.0 - sustain) * ((t - attack) / decay)
    elif t < duration - release:
        return sustain
    elif t < duration:
        rel_pos = (t - (duration - release)) / release
        return max(0.0, sustain * (1.0 - rel_pos))
    return 0.0

def olympia_bell(freq, t, decay_rate=5.5):
    """Crystalline glockenspiel / vibraphone chime with bright overtones"""
    env = math.exp(-t * decay_rate)
    f1 = math.sin(2 * math.pi * freq * t)
    f2 = 0.55 * math.sin(2 * math.pi * (freq * 2.0) * t)
    f3 = 0.28 * math.sin(2 * math.pi * (freq * 3.01) * t)
    f4 = 0.15 * math.sin(2 * math.pi * (freq * 4.18) * t)
    return (f1 + f2 + f3 + f4) * env

def brass_tone(freq, t):
    """Warm synth brass tone with natural rich harmonics"""
    return (
        math.sin(2 * math.pi * freq * t) +
        0.55 * math.sin(2 * math.pi * (freq * 2) * t) +
        0.30 * math.sin(2 * math.pi * (freq * 3) * t) +
        0.18 * math.sin(2 * math.pi * (freq * 4) * t)
    )

# 1. 🎵 LOBBY.MP3 / .WAV - Nhạc Chủ Đề Đấu Trường Đường Lên Đỉnh Olympia (8.0s seamless loop)
# Heroic brass motif, inspiring synth strings, driving 120 BPM rhythm
def gen_lobby():
    duration = 8.0
    num_samples = int(duration * SAMPLE_RATE)
    samples = [0.0] * num_samples

    # Uplifting Chord Progression: Dm -> F -> C -> G (Olympia youth spirit)
    chords = [
        ([146.83, 220.00, 261.63, 293.66], 0.0, 2.0), # Dm
        ([174.61, 220.00, 261.63, 349.23], 2.0, 4.0), # F
        ([130.81, 196.00, 246.94, 261.63], 4.0, 6.0), # C
        ([98.00, 146.83, 196.00, 246.94],  6.0, 8.0), # G
    ]

    for chord_freqs, start_t, end_t in chords:
        c_dur = end_t - start_t
        for i in range(int(start_t * SAMPLE_RATE), int(end_t * SAMPLE_RATE)):
            t = (i / SAMPLE_RATE) - start_t
            env = envelope(t, 0.12, 0.35, 0.8, 0.2, c_dur)
            chord_val = 0.0
            for idx, f in enumerate(chord_freqs):
                voice = brass_tone(f, t)
                chord_val += voice * (0.35 / (idx + 1)**0.5)
            samples[i] += chord_val * env * 0.18

    # Olympia Brass Lead Melodic Motif across the 8s
    # D4 -> F4 -> G4 -> A4 -> C5 -> A4 -> G4 -> F4 -> D4
    lead_notes = [
        (293.66, 0.0, 0.5), (349.23, 0.5, 0.5), (392.00, 1.0, 0.5), (440.00, 1.5, 0.5),
        (523.25, 2.0, 0.6), (440.00, 2.6, 0.4), (392.00, 3.0, 1.0),
        (349.23, 4.0, 0.5), (392.00, 4.5, 0.5), (440.00, 5.0, 0.5), (523.25, 5.5, 0.5),
        (587.33, 6.0, 1.0), (440.00, 7.0, 1.0)
    ]
    for f, n_start, n_dur in lead_notes:
        for j in range(int(n_dur * SAMPLE_RATE)):
            idx = int(n_start * SAMPLE_RATE) + j
            if idx < num_samples:
                t = j / SAMPLE_RATE
                env = envelope(t, 0.04, 0.1, 0.75, 0.15, n_dur)
                lead = brass_tone(f, t) + 0.3 * math.sin(2 * math.pi * (f * 2) * t)
                samples[idx] += lead * env * 0.12

    # Rhythmic Kick & Crisp Hi-Hat Groove (120 BPM = 0.5s per beat)
    for beat in range(16):
        bt_start = beat * 0.5
        # Kick on every beat
        k_len = int(0.2 * SAMPLE_RATE)
        for j in range(k_len):
            idx = int(bt_start * SAMPLE_RATE) + j
            if idx < num_samples:
                k_t = j / SAMPLE_RATE
                k_freq = 110.0 * math.exp(-k_t * 16.0)
                samples[idx] += math.sin(2 * math.pi * k_freq * k_t) * math.exp(-k_t * 14.0) * 0.25

        # Crisp 16th-note studio shaker / hi-hat
        for sub in [0.125, 0.25, 0.375]:
            sh_start = int((bt_start + sub) * SAMPLE_RATE)
            sh_len = int(0.04 * SAMPLE_RATE)
            for j in range(sh_len):
                idx = sh_start + j
                if idx < num_samples:
                    s_t = j / SAMPLE_RATE
                    noise = math.sin(2 * math.pi * 3800 * s_t) * math.sin(2 * math.pi * 7200 * s_t)
                    samples[idx] += noise * math.exp(-s_t * 45.0) * 0.07

    peak = max(abs(s) for s in samples) or 1.0
    samples = [s / peak * 0.82 for s in samples]
    write_audio("lobby", samples)

# 2. ⚡ QUESTION_SUSPENSE.MP3 / .WAV - Nhạc Phần Thi Tăng Tốc / Về Đích Olympia (6.0s seamless loop)
# The legendary 30s Tăng tốc techno-synth groove: 132 BPM, galloping 16th-note arpeggio, relentless drive
def gen_question_suspense():
    duration = 6.0
    num_samples = int(duration * SAMPLE_RATE)
    samples = [0.0] * num_samples

    # 132 BPM: 1 beat = 60 / 132 = 0.4545s. 13 beats in ~6 seconds.
    # Driving Synth Bassline (D2 -> F2 -> G2 -> A2 on 8th notes)
    bass_notes = [73.42, 73.42, 87.31, 87.31, 98.00, 98.00, 110.00, 110.00] # D2, F2, G2, A2
    step_dur = 0.2272 # 8th note duration
    total_steps = int(duration / step_dur)

    for step in range(total_steps):
        b_start = step * step_dur
        f_bass = bass_notes[step % len(bass_notes)]
        b_len = int(step_dur * SAMPLE_RATE)
        for j in range(b_len):
            idx = int(b_start * SAMPLE_RATE) + j
            if idx < num_samples:
                t = j / SAMPLE_RATE
                env = math.exp(-t * 9.0)
                synth = math.sin(2 * math.pi * f_bass * t) + 0.6 * math.sin(2 * math.pi * (f_bass * 2) * t)
                samples[idx] += synth * env * 0.32

    # Galloping 16th-note Synth Arpeggiator (D4, F4, G4, A4, C5, D5 - Iconic Olympia Tăng tốc arpeggio!)
    arp_scale = [293.66, 349.23, 392.00, 440.00, 523.25, 587.33, 523.25, 440.00]
    arp_dur = step_dur / 2 # 16th note ~0.1136s
    arp_steps = int(duration / arp_dur)

    for a_step in range(arp_steps):
        a_start = a_step * arp_dur
        f_arp = arp_scale[a_step % len(arp_scale)]
        a_len = int(arp_dur * SAMPLE_RATE)
        for j in range(a_len):
            idx = int(a_start * SAMPLE_RATE) + j
            if idx < num_samples:
                t = j / SAMPLE_RATE
                env = math.exp(-t * 18.0)
                lead = math.sin(2 * math.pi * f_arp * t) + 0.4 * math.sin(2 * math.pi * (f_arp * 2) * t)
                samples[idx] += lead * env * 0.16

    # Punchy Kick on Quarter Beats + Rising Electronic High-Tension Shimmer
    beat_dur = step_dur * 2 # 0.4545s
    num_beats = int(duration / beat_dur)
    for b in range(num_beats):
        k_start = b * beat_dur
        k_len = int(0.2 * SAMPLE_RATE)
        for j in range(k_len):
            idx = int(k_start * SAMPLE_RATE) + j
            if idx < num_samples:
                t = j / SAMPLE_RATE
                k_freq = 120.0 * math.exp(-t * 18.0)
                samples[idx] += math.sin(2 * math.pi * k_freq * t) * math.exp(-t * 12.0) * 0.28

    # Subtle rising crescendo throughout the 6s
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        swell = 0.05 + 0.07 * (t / duration)
        pad = math.sin(2 * math.pi * 587.33 * t) + 0.5 * math.sin(2 * math.pi * 880.00 * t)
        samples[i] += pad * swell * 0.12

    peak = max(abs(s) for s in samples) or 1.0
    samples = [s / peak * 0.82 for s in samples]
    write_audio("question_suspense", samples)

# 3. 🚨 BUZZ.MP3 / .WAV - Chuông Bấm Giành Quyền Trả Lời Olympia (TÍNG-BÍP!)
# The most iconic sound on Vietnamese TV: dual-tone high-frequency synth bell buzzer
def gen_buzz():
    duration = 0.45
    num_samples = int(duration * SAMPLE_RATE)
    samples = [0.0] * num_samples
    # Iconic Olympia buzzer dual notes: A5 (880Hz) + E6 (1318.51Hz) with sharp 3ms attack
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        env = math.exp(-t * 8.0)
        # Vibrato effect
        vibrato = 1.0 + 0.015 * math.sin(2 * math.pi * 20.0 * t)
        f1 = 880.0 * vibrato
        f2 = 1318.51 * vibrato
        bell = (
            math.sin(2 * math.pi * f1 * t) +
            0.7 * math.sin(2 * math.pi * f2 * t) +
            0.35 * math.sin(2 * math.pi * (f1 * 2) * t)
        )
        samples[i] = bell * env * 0.88
    peak = max(abs(s) for s in samples) or 1.0
    samples = [s / peak * 0.90 for s in samples]
    write_audio("buzz", samples)

# 4. ✅ CORRECT.MP3 / .WAV - Trả Lời Đúng Olympia (Ting-ting-ting!)
# Joyful ascending triad chime: C5 -> G5 -> C6 -> E6 -> high G6
def gen_correct():
    duration = 1.1
    num_samples = int(duration * SAMPLE_RATE)
    samples = [0.0] * num_samples
    notes = [
        (523.25, 0.00, 0.8),  # C5
        (783.99, 0.09, 0.8),  # G5
        (1046.50, 0.18, 0.8), # C6
        (1318.51, 0.27, 0.8), # E6
        (1567.98, 0.36, 0.9), # G6
    ]
    for f, start_t, dur in notes:
        for j in range(int(dur * SAMPLE_RATE)):
            idx = int(start_t * SAMPLE_RATE) + j
            if idx < num_samples:
                t = j / SAMPLE_RATE
                val = olympia_bell(f, t, decay_rate=4.5)
                samples[idx] += val * 0.38
    peak = max(abs(s) for s in samples) or 1.0
    samples = [s / peak * 0.88 for s in samples]
    write_audio("correct", samples)

# 5. ❌ WRONG.MP3 / .WAV - Tút Báo Sai Olympia
# Clean, distinctive television electronic error signal
def gen_wrong():
    duration = 0.55
    num_samples = int(duration * SAMPLE_RATE)
    samples = [0.0] * num_samples
    # Classic Olympia double tút / dissonant pulse
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        env = math.exp(-t * 6.0)
        # Dissonant tones 185Hz + 246.9Hz
        tone = (
            math.sin(2 * math.pi * 185.0 * t) +
            0.8 * math.sin(2 * math.pi * 246.94 * t) +
            0.4 * math.sin(2 * math.pi * 370.0 * t)
        )
        samples[i] = tone * env * 0.82
    peak = max(abs(s) for s in samples) or 1.0
    samples = [s / peak * 0.86 for s in samples]
    write_audio("wrong", samples)

# 6. ⏱️ TICK.MP3 / .WAV - Đếm Ngược Khởi Động / VCNV Olympia
# Crisp electronic studio woodblock click
def gen_tick():
    duration = 0.14
    num_samples = int(duration * SAMPLE_RATE)
    samples = [0.0] * num_samples
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        env = math.exp(-t * 36.0)
        # Precise high digital woodblock click
        click = math.sin(2 * math.pi * 1400 * t) + 0.65 * math.sin(2 * math.pi * 2800 * t)
        samples[i] = click * env * 0.85
    peak = max(abs(s) for s in samples) or 1.0
    samples = [s / peak * 0.85 for s in samples]
    write_audio("tick", samples)

# 7. ⚡ GO.MP3 / .WAV - Hiệu Lệnh Bắt Đầu Lượt Thi / Hết Giờ Olympia
# Resonant electronic gameshow bell gong
def gen_go():
    duration = 1.1
    num_samples = int(duration * SAMPLE_RATE)
    samples = [0.0] * num_samples
    freqs = [261.63, 392.00, 523.25, 659.25] # C4 - G4 - C5 - E5
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        env = math.exp(-t * 3.5)
        val = sum(olympia_bell(f, t, decay_rate=3.0) for f in freqs)
        samples[i] = val * env * 0.35
    peak = max(abs(s) for s in samples) or 1.0
    samples = [s / peak * 0.88 for s in samples]
    write_audio("go", samples)

# 8. 👑 FANFARE.MP3 / .WAV - Trao Vòng Nguyệt Quế Olympia (Champion Victory)
# Majestic brass fanfare celebrating the winner climbing to the peak of Mount Olympia
def gen_fanfare():
    duration = 3.8
    num_samples = int(duration * SAMPLE_RATE)
    samples = [0.0] * num_samples

    # Grand Fanfare Chords: D4 -> G4 -> B4 -> D5 -> Glorious G Major resolution
    chords = [
        ([293.66], 0.00, 0.4),  # D4
        ([392.00], 0.40, 0.8),  # G4
        ([493.88], 0.80, 1.2),  # B4
        ([293.66, 392.00, 493.88, 587.33], 1.20, 1.8), # G major triad
        ([392.00, 493.88, 587.33, 783.99], 1.80, 3.8), # Glorious Grand G5 resolution!
    ]

    for freqs, start_t, end_t in chords:
        dur = end_t - start_t
        for j in range(int(dur * SAMPLE_RATE)):
            idx = int(start_t * SAMPLE_RATE) + j
            if idx < num_samples:
                t = j / SAMPLE_RATE
                env = envelope(t, 0.03, 0.15, 0.88, 0.45, dur)
                val = sum(brass_tone(f, t) for f in freqs)
                samples[idx] += val * env * (0.35 / len(freqs)**0.5)

    # Shimmering celebratory bells in the climax
    for i in range(int(1.8 * SAMPLE_RATE), num_samples):
        t = (i - int(1.8 * SAMPLE_RATE)) / SAMPLE_RATE
        shimmer = olympia_bell(1567.98, t, decay_rate=1.8) + olympia_bell(2093.00, t, decay_rate=2.0)
        samples[i] += shimmer * 0.15

    peak = max(abs(s) for s in samples) or 1.0
    samples = [s / peak * 0.90 for s in samples]
    write_audio("fanfare", samples)

# 9. ⭐ POWERUP.MP3 / .WAV - Ngôi Sao Hy Vọng Olympia (Star of Hope)
# Crystalline magical harp glissando + celestial twinkle
def gen_powerup():
    duration = 0.95
    num_samples = int(duration * SAMPLE_RATE)
    samples = [0.0] * num_samples

    # Rapid ascending glissando: C6 -> E6 -> G6 -> B6 -> C7
    gliss_notes = [1046.50, 1318.51, 1567.98, 1975.53, 2093.00, 2637.02]
    note_time = 0.08
    for idx, f in enumerate(gliss_notes):
        n_start = idx * note_time
        for j in range(int(0.6 * SAMPLE_RATE)):
            sample_idx = int(n_start * SAMPLE_RATE) + j
            if sample_idx < num_samples:
                t = j / SAMPLE_RATE
                val = olympia_bell(f, t, decay_rate=5.0)
                samples[sample_idx] += val * 0.28

    # Sparkle frequency sweep
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        env = math.exp(-t * 3.5)
        freq = 1200.0 + 2400.0 * (t / duration)**1.5
        sparkle = math.sin(2 * math.pi * freq * t) * math.sin(2 * math.pi * 32.0 * t)
        samples[i] += sparkle * env * 0.25

    peak = max(abs(s) for s in samples) or 1.0
    samples = [s / peak * 0.88 for s in samples]
    write_audio("powerup", samples)

if __name__ == "__main__":
    print("Synthesizing Đường lên đỉnh Olympia official gameshow soundpack (WAV + MP3)...")
    gen_lobby()
    gen_question_suspense()
    gen_tick()
    gen_go()
    gen_buzz()
    gen_correct()
    gen_wrong()
    gen_fanfare()
    gen_powerup()
    print("All Đường lên đỉnh Olympia audio assets (WAV & MP3) synthesized successfully!")
