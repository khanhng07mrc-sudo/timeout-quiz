import math
import struct
import wave
import os

SOUNDS_DIR = r"d:/Timeout Quiz/timeout-quiz/public/sounds"
os.makedirs(SOUNDS_DIR, exist_ok=True)
SAMPLE_RATE = 44100

def write_wav(filename, samples):
    filepath = os.path.join(SOUNDS_DIR, filename)
    with wave.open(filepath, "w") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        packed = bytearray()
        for s in samples:
            val = max(-1.0, min(1.0, s))
            int_val = int(val * 32767)
            packed.extend(struct.pack("<h", int_val))
        wav.writeframes(packed)
    print(f"Generated {filename}: {len(samples)} samples ({len(samples)/SAMPLE_RATE:.2f}s)")

# ── Helper Synthesis Functions ────────────────────────────────────────────────
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

def bell_tone(freq, t, decay_rate=6.0):
    """Rich metallic bell / celesta timbre with natural inharmonic overtones"""
    env = math.exp(-t * decay_rate)
    f1 = math.sin(2 * math.pi * freq * t)
    f2 = 0.5 * math.sin(2 * math.pi * (freq * 2.002) * t)
    f3 = 0.25 * math.sin(2 * math.pi * (freq * 3.01) * t)
    f4 = 0.12 * math.sin(2 * math.pi * (freq * 4.2) * t)
    return (f1 + f2 + f3 + f4) * env

# 1. 🎵 LOBBY.WAV - "Chinh phục / Brainiest Kid" Grand Arena Theme (8.0s seamless loop)
# Prestigious orchestral gameshow aesthetic with driving bass pulse & heroic strings
def gen_lobby():
    duration = 8.0
    num_samples = int(duration * SAMPLE_RATE)
    samples = [0.0] * num_samples

    # Dramatic Minor Progression: Dm -> Bb -> C -> Am (Epic intellectual contest vibe)
    chords = [
        ([146.83, 220.00, 261.63, 293.66, 349.23], 0.0, 2.0), # Dm(add9)
        ([116.54, 174.61, 233.08, 293.66, 349.23], 2.0, 4.0), # Bb(maj7)
        ([130.81, 196.00, 246.94, 293.66, 392.00], 4.0, 6.0), # C(add9)
        ([110.00, 164.81, 220.00, 261.63, 329.63], 6.0, 8.0), # Am7
    ]

    for chord_freqs, start_t, end_t in chords:
        c_dur = end_t - start_t
        for i in range(int(start_t * SAMPLE_RATE), int(end_t * SAMPLE_RATE)):
            t = (i / SAMPLE_RATE) - start_t
            env = envelope(t, 0.15, 0.35, 0.75, 0.25, c_dur)
            chord_val = 0.0
            for idx, f in enumerate(chord_freqs):
                voice1 = math.sin(2 * math.pi * f * t)
                voice2 = math.sin(2 * math.pi * (f * 1.002) * t + 0.2)
                voice3 = 0.3 * math.sin(2 * math.pi * (f * 2.0) * t)
                chord_val += (voice1 + voice2 + voice3) * (0.35 / (idx + 1)**0.5)
            samples[i] += chord_val * env * 0.15

    # Rhythmic orchestral pulse (Timpani & Marching Sub-pulse at 120 BPM)
    for beat in range(16):
        bt_start = beat * 0.5
        # Kick / Timpani impact on downbeats
        t_len = int(0.25 * SAMPLE_RATE)
        for j in range(t_len):
            idx = int(bt_start * SAMPLE_RATE) + j
            if idx < num_samples:
                k_t = j / SAMPLE_RATE
                k_freq = 95.0 * math.exp(-k_t * 14.0)
                k_env = max(0.0, 1.0 - k_t / 0.25)**2
                samples[idx] += math.sin(2 * math.pi * k_freq * k_t) * k_env * 0.22

        # High-register rhythmic celesta ticks (Brainiest Kid clock pulse)
        clk_len = int(0.08 * SAMPLE_RATE)
        clk_idx = int((bt_start + 0.25) * SAMPLE_RATE)
        for j in range(clk_len):
            idx = clk_idx + j
            if idx < num_samples:
                c_t = j / SAMPLE_RATE
                samples[idx] += math.sin(2 * math.pi * 1760.0 * c_t) * math.exp(-c_t * 40.0) * 0.07

    peak = max(abs(s) for s in samples) or 1.0
    samples = [s / peak * 0.78 for s in samples]
    write_wav("lobby.wav", samples)

# 2. 🎻 QUESTION_SUSPENSE.WAV - "Chinh phục" Intense Quick-Fire Countdown BGM (6.0s seamless loop)
# Features driving sub-bass pulse, dramatic staccato strings, and rising tension swell
def gen_question_suspense():
    duration = 6.0
    num_samples = int(duration * SAMPLE_RATE)
    samples = [0.0] * num_samples

    # Rhythmic syncopated heart-pulse bass (D2 & A1 tension)
    pulses = [0.0, 0.35, 0.75, 1.0, 1.5, 1.85, 2.25, 2.5, 3.0, 3.35, 3.75, 4.0, 4.5, 4.85, 5.25, 5.5]
    for p_t0 in pulses:
        p_len = int(0.3 * SAMPLE_RATE)
        for j in range(p_len):
            idx = int(p_t0 * SAMPLE_RATE) + j
            if idx < num_samples:
                t = j / SAMPLE_RATE
                env = math.exp(-t * 10.0)
                f_bass = 73.42 if (p_t0 < 3.0) else 65.41 # D2 / C2
                val = math.sin(2 * math.pi * f_bass * t) + 0.5 * math.sin(2 * math.pi * (f_bass * 2) * t)
                samples[idx] += val * env * 0.32

    # High-tension staccato ostinato strings (Rapid 16th-note intellectual countdown)
    ostinato_notes = [587.33, 698.46, 880.00, 1046.50, 880.00, 698.46] # D5, F5, A5, C6, A5, F5
    note_dur = 0.125 # 8 notes per second
    for step in range(int(duration / note_dur)):
        n_t0 = step * note_dur
        f_note = ostinato_notes[step % len(ostinato_notes)]
        n_len = int(0.12 * SAMPLE_RATE)
        for j in range(n_len):
            idx = int(n_t0 * SAMPLE_RATE) + j
            if idx < num_samples:
                t = j / SAMPLE_RATE
                env = math.exp(-t * 22.0)
                staccato = math.sin(2 * math.pi * f_note * t) + 0.3 * math.sin(2 * math.pi * 2 * f_note * t)
                samples[idx] += staccato * env * 0.12

    # Subtle rising dramatic drone across the 6 seconds
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        swell = 0.05 + 0.08 * (t / duration)
        pad = math.sin(2 * math.pi * 293.66 * t) + 0.5 * math.sin(2 * math.pi * 440.0 * t)
        samples[i] += pad * swell * 0.15

    peak = max(abs(s) for s in samples) or 1.0
    samples = [s / peak * 0.75 for s in samples]
    write_wav("question_suspense.wav", samples)

# 3. ⏱️ TICK.WAV - Iconic Broadcast Clockwork Click
# Crisp metallic woodblock studio tick, sharp and tense
def gen_tick():
    duration = 0.16
    num_samples = int(duration * SAMPLE_RATE)
    samples = [0.0] * num_samples
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        env = math.exp(-t * 32.0)
        # Studio precision click (dual harmonic snap)
        snap = math.sin(2 * math.pi * 1200 * t) + 0.7 * math.sin(2 * math.pi * 2400 * t)
        samples[i] = snap * env * 0.75
    write_wav("tick.wav", samples)

# 4. ⚡ GO.WAV - Question Start / Time Expired Studio Gong
# Resonant orchestral tubular gong chime
def gen_go():
    duration = 1.0
    num_samples = int(duration * SAMPLE_RATE)
    samples = [0.0] * num_samples
    freqs = [261.63, 392.00, 523.25, 783.99] # C4, G4, C5, G5 gong chord
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        env = math.exp(-t * 3.8)
        val = sum(bell_tone(f, t, decay_rate=3.5) for f in freqs)
        samples[i] = val * env * 0.35
    peak = max(abs(s) for s in samples) or 1.0
    samples = [s / peak * 0.85 for s in samples]
    write_wav("go.wav", samples)

# 5. 🚨 BUZZ.WAV - Contestant Podium Lock-In Buzzer
# Instantaneous high-energy studio hit
def gen_buzz():
    duration = 0.5
    num_samples = int(duration * SAMPLE_RATE)
    samples = [0.0] * num_samples
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        env = math.exp(-t * 6.5)
        # Authoritative dual tone buzzer (320Hz + 640Hz + bite)
        tone = (
            math.sin(2 * math.pi * 320 * t) +
            0.7 * math.sin(2 * math.pi * 640 * t) +
            0.4 * math.sin(2 * math.pi * 960 * t)
        )
        samples[i] = tone * env * 0.85
    peak = max(abs(s) for s in samples) or 1.0
    samples = [s / peak * 0.85 for s in samples]
    write_wav("buzz.wav", samples)

# 6. ✅ CORRECT.WAV - Vietnam's Brainiest Kid Triumphant Bell Chime
# High-register glockenspiel arpeggio (C6 -> E6 -> G6 -> C7), crystal clear and thrilling
def gen_correct():
    duration = 1.0
    num_samples = int(duration * SAMPLE_RATE)
    samples = [0.0] * num_samples
    notes = [
        (1046.50, 0.00, 0.7), # C6
        (1318.51, 0.08, 0.7), # E6
        (1567.98, 0.16, 0.7), # G6
        (2093.00, 0.24, 0.8), # C7
    ]
    for f, start_t, dur in notes:
        for j in range(int(dur * SAMPLE_RATE)):
            idx = int(start_t * SAMPLE_RATE) + j
            if idx < num_samples:
                t = j / SAMPLE_RATE
                val = bell_tone(f, t, decay_rate=5.0)
                samples[idx] += val * 0.4
    peak = max(abs(s) for s in samples) or 1.0
    samples = [s / peak * 0.85 for s in samples]
    write_wav("correct.wav", samples)

# 7. ❌ WRONG.WAV - Television Gameshow Authoritative Error Thud
# Low punchy minor-second dissonance with sharp transient
def gen_wrong():
    duration = 0.7
    num_samples = int(duration * SAMPLE_RATE)
    samples = [0.0] * num_samples
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        env = math.exp(-t * 4.5)
        # Deep broadcast fail dissonance: 110Hz + 116.5Hz (A2 + Bb2 clash)
        thud = (
            math.sin(2 * math.pi * 110.0 * t) +
            0.9 * math.sin(2 * math.pi * 116.5 * t) +
            0.5 * math.sin(2 * math.pi * 220.0 * t)
        )
        samples[i] = thud * env * 0.8
    peak = max(abs(s) for s in samples) or 1.0
    samples = [s / peak * 0.85 for s in samples]
    write_wav("wrong.wav", samples)

# 8. 🎺 FANFARE.WAV - Brainiest Kid Grand Trophy Victory
# Full brass fanfare with majestic triumphant resolution
def gen_fanfare():
    duration = 3.6
    num_samples = int(duration * SAMPLE_RATE)
    samples = [0.0] * num_samples
    # Grand motif: D4 -> F#4 -> A4 -> D5 -> glorious D major chord
    chords = [
        ([293.66], 0.00, 0.35), # D4
        ([369.99], 0.35, 0.70), # F#4
        ([440.00], 0.70, 1.05), # A4
        ([293.66, 369.99, 440.00, 587.33, 880.00], 1.05, 3.6), # Grand D Major
    ]
    for freqs, start_t, end_t in chords:
        dur = end_t - start_t
        for j in range(int(dur * SAMPLE_RATE)):
            idx = int(start_t * SAMPLE_RATE) + j
            if idx < num_samples:
                t = j / SAMPLE_RATE
                env = envelope(t, 0.04, 0.15, 0.85, 0.5, dur)
                val = 0.0
                for f in freqs:
                    brass = math.sin(2 * math.pi * f * t) + 0.4 * math.sin(2 * math.pi * 2 * f * t) + 0.2 * math.sin(2 * math.pi * 3 * f * t)
                    val += brass
                samples[idx] += val * env * (0.35 / len(freqs)**0.5)

    # Shimmering celestial glissando across final chord
    for i in range(int(1.05 * SAMPLE_RATE), num_samples):
        t = (i - int(1.05 * SAMPLE_RATE)) / SAMPLE_RATE
        shimmer = bell_tone(1760.0, t, decay_rate=2.0) + bell_tone(2349.32, t, decay_rate=2.2)
        samples[i] += shimmer * 0.12

    peak = max(abs(s) for s in samples) or 1.0
    samples = [s / peak * 0.88 for s in samples]
    write_wav("fanfare.wav", samples)

# 9. 💎 POWERUP.WAV - Sci-Fi Powerup Surge
def gen_powerup():
    duration = 0.85
    num_samples = int(duration * SAMPLE_RATE)
    samples = [0.0] * num_samples
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        env = math.exp(-t * 3.6)
        freq = 440.0 + 1400.0 * (t / duration)**1.4
        shimmer = math.sin(2 * math.pi * freq * t) + 0.4 * math.sin(2 * math.pi * (freq * 1.5) * t)
        samples[i] = shimmer * env * 0.75
    peak = max(abs(s) for s in samples) or 1.0
    samples = [s / peak * 0.85 for s in samples]
    write_wav("powerup.wav", samples)

if __name__ == "__main__":
    gen_lobby()
    gen_question_suspense()
    gen_tick()
    gen_go()
    gen_buzz()
    gen_correct()
    gen_wrong()
    gen_fanfare()
    gen_powerup()
    print("All Vietnam's Brainiest Kid broadcast audio assets generated successfully!")
