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
def warm_wave(phase):
    # Mixture of fundamental sine + 2nd harmonic (warm) + gentle 3rd
    return 0.7 * math.sin(phase) + 0.2 * math.sin(2 * phase) + 0.1 * math.sin(3 * phase)

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

# 1. 🎵 LOBBY.WAV (Modern, stylish, ambient broadcast groove ~ 8 seconds seamless loop)
def gen_lobby():
    duration = 8.0
    num_samples = int(duration * SAMPLE_RATE)
    samples = [0.0] * num_samples
    
    # Chord progression: Dm9 -> G13 -> Cmaj9 -> Am9 (Gameshow TV theme vibes)
    chords = [
        ([146.83, 220.00, 261.63, 329.63, 349.23], 0.0, 2.0), # Dm9
        ([98.00, 196.00, 246.94, 329.63, 392.00], 2.0, 4.0),  # G13
        ([130.81, 196.00, 246.94, 293.66, 329.63], 4.0, 6.0), # Cmaj9
        ([110.00, 164.81, 220.00, 261.63, 329.63], 6.0, 8.0), # Am9
    ]
    
    for chord_freqs, start_t, end_t in chords:
        c_dur = end_t - start_t
        for i in range(int(start_t * SAMPLE_RATE), int(end_t * SAMPLE_RATE)):
            t = (i / SAMPLE_RATE) - start_t
            env = envelope(t, 0.2, 0.4, 0.7, 0.3, c_dur)
            chord_val = 0.0
            for idx, f in enumerate(chord_freqs):
                # Detuned warm voices for analog shimmer
                voice1 = math.sin(2 * math.pi * f * t)
                voice2 = math.sin(2 * math.pi * (f * 1.003) * t + 0.3)
                chord_val += (voice1 + voice2) * 0.5 * (1.0 / (idx + 1)**0.5)
            samples[i] += chord_val * env * 0.18
            
    # Add gentle rhythmic warm pulse (kick & shaker)
    for beat in range(16): # 2 beats per second (120 BPM)
        bt_start = beat * 0.5
        # Kick on 1 and 3 (beat 0, 2, 4...)
        if beat % 2 == 0:
            k_len = int(0.2 * SAMPLE_RATE)
            for j in range(k_len):
                idx = int(bt_start * SAMPLE_RATE) + j
                if idx < num_samples:
                    k_t = j / SAMPLE_RATE
                    k_freq = 110.0 * math.exp(-k_t * 18.0)
                    k_env = max(0.0, 1.0 - k_t / 0.2)**2
                    samples[idx] += math.sin(2 * math.pi * k_freq * k_t) * k_env * 0.25
        # Soft studio shaker on every 16th
        sh_len = int(0.06 * SAMPLE_RATE)
        for j in range(sh_len):
            idx = int((bt_start + 0.25) * SAMPLE_RATE) + j
            if idx < num_samples:
                sh_t = j / SAMPLE_RATE
                sh_env = max(0.0, 1.0 - sh_t / 0.06)
                # Filtered pseudo-noise
                noise = math.sin(2 * math.pi * 3200 * sh_t) * math.sin(2 * math.pi * 5400 * sh_t)
                samples[idx] += noise * sh_env * 0.08
                
    # Normalize with headroom
    peak = max(abs(s) for s in samples) or 1.0
    samples = [s / peak * 0.75 for s in samples]
    write_wav("lobby.wav", samples)

# 2. 🎻 QUESTION_SUSPENSE.WAV (Tense, cinematic pulsing heartbeat & rising strings ~ 6 seconds loop)
def gen_question_suspense():
    duration = 6.0
    num_samples = int(duration * SAMPLE_RATE)
    samples = [0.0] * num_samples
    
    # Deep rhythmic heart-pulse bass (C - G - C - G)
    for pulse in range(12): # 0.5s per pulse
        p_t0 = pulse * 0.5
        p_len = int(0.35 * SAMPLE_RATE)
        f_bass = 65.41 if (pulse % 4 < 2) else 58.27 # C2 / Bb1
        for j in range(p_len):
            idx = int(p_t0 * SAMPLE_RATE) + j
            if idx < num_samples:
                t = j / SAMPLE_RATE
                env = math.exp(-t * 9.0)
                pulse_val = math.sin(2 * math.pi * f_bass * t) + 0.4 * math.sin(2 * math.pi * (f_bass * 2) * t)
                samples[idx] += pulse_val * env * 0.35
                
    # High-tension minor string pad (C minor / tension harmonics)
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        # Slow tremolo modulation
        lfo = 1.0 + 0.15 * math.sin(2 * math.pi * 4.0 * t)
        s1 = math.sin(2 * math.pi * 523.25 * t) # C5
        s2 = math.sin(2 * math.pi * 622.25 * t) # Eb5
        s3 = math.sin(2 * math.pi * 783.99 * t) # G5
        s4 = math.sin(2 * math.pi * 932.33 * t) # Bb5
        samples[i] += (s1 + s2 + s3 + s4) * 0.05 * lfo
        
    peak = max(abs(s) for s in samples) or 1.0
    samples = [s / peak * 0.70 for s in samples]
    write_wav("question_suspense.wav", samples)

# 3. ⏱️ TICK.WAV (Clean broadcast studio countdown blip)
def gen_tick():
    duration = 0.18
    num_samples = int(duration * SAMPLE_RATE)
    samples = [0.0] * num_samples
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        env = math.exp(-t * 28.0)
        # Studio woodblock/percussive click + crisp harmonic
        click = math.sin(2 * math.pi * 880 * t) + 0.6 * math.sin(2 * math.pi * 1760 * t)
        samples[i] = click * env * 0.7
    write_wav("tick.wav", samples)

# 4. ⚡ GO.WAV (Warm broadcast gong/start chime)
def gen_go():
    duration = 0.8
    num_samples = int(duration * SAMPLE_RATE)
    samples = [0.0] * num_samples
    freqs = [440, 554.37, 659.25, 880] # A major triad
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        env = math.exp(-t * 4.5)
        val = sum(math.sin(2 * math.pi * f * t) * (1.0 / (idx + 1)) for idx, f in enumerate(freqs))
        samples[i] = val * env * 0.65
    write_wav("go.wav", samples)

# 5. 🚨 BUZZ.WAV (Punchy game show electronic lock-in buzzer)
def gen_buzz():
    duration = 0.65
    num_samples = int(duration * SAMPLE_RATE)
    samples = [0.0] * num_samples
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        env = math.exp(-t * 5.0)
        # Low punchy synth brass (140Hz with sharp odd harmonics)
        synth = (
            math.sin(2 * math.pi * 140 * t) +
            0.6 * math.sin(2 * math.pi * 280 * t) +
            0.4 * math.sin(2 * math.pi * 420 * t) +
            0.3 * math.sin(2 * math.pi * 560 * t)
        )
        samples[i] = synth * env * 0.8
    write_wav("buzz.wav", samples)

# 6. ✅ CORRECT.WAV (Joyful, bright, triumphant broadcast chime)
def gen_correct():
    duration = 0.9
    num_samples = int(duration * SAMPLE_RATE)
    samples = [0.0] * num_samples
    # Arpeggio: C5 -> E5 -> G5 -> C6
    notes = [
        (523.25, 0.00, 0.7),
        (659.25, 0.10, 0.7),
        (783.99, 0.20, 0.7),
        (1046.50, 0.30, 0.6),
    ]
    for f, start_t, dur in notes:
        for j in range(int(dur * SAMPLE_RATE)):
            idx = int(start_t * SAMPLE_RATE) + j
            if idx < num_samples:
                t = j / SAMPLE_RATE
                env = math.exp(-t * 5.5)
                tone = math.sin(2 * math.pi * f * t) + 0.3 * math.sin(2 * math.pi * 2 * f * t)
                samples[idx] += tone * env * 0.35
    peak = max(abs(s) for s in samples) or 1.0
    samples = [s / peak * 0.8 for s in samples]
    write_wav("correct.wav", samples)

# 7. ❌ WRONG.WAV (Firm, clean descending television game show error thud)
def gen_wrong():
    duration = 0.7
    num_samples = int(duration * SAMPLE_RATE)
    samples = [0.0] * num_samples
    # Low dissonant tritone: F#2 + C3 (92.5Hz + 130.81Hz)
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        env = math.exp(-t * 4.8)
        thud = math.sin(2 * math.pi * 92.5 * t) + 0.8 * math.sin(2 * math.pi * 130.81 * t)
        samples[i] = thud * env * 0.75
    write_wav("wrong.wav", samples)

# 8. 🎺 FANFARE.WAV (Grand, rich victory fanfare with brass & bells ~ 3.5s)
def gen_fanfare():
    duration = 3.5
    num_samples = int(duration * SAMPLE_RATE)
    samples = [0.0] * num_samples
    # Fanfare motif: G4 -> C5 -> E5 -> G5 (sustained chord)
    chords = [
        ([392.00], 0.0, 0.35),
        ([523.25], 0.35, 0.7),
        ([659.25], 0.7, 1.05),
        ([523.25, 659.25, 783.99, 1046.50], 1.05, 3.5), # Glorious C major
    ]
    for freqs, start_t, end_t in chords:
        dur = end_t - start_t
        for j in range(int(dur * SAMPLE_RATE)):
            idx = int(start_t * SAMPLE_RATE) + j
            if idx < num_samples:
                t = j / SAMPLE_RATE
                env = envelope(t, 0.05, 0.2, 0.8, 0.6, dur)
                val = sum((math.sin(2 * math.pi * f * t) + 0.3 * math.sin(2 * math.pi * 2 * f * t)) for f in freqs)
                samples[idx] += val * env * (0.35 / len(freqs)**0.5)
    peak = max(abs(s) for s in samples) or 1.0
    samples = [s / peak * 0.85 for s in samples]
    write_wav("fanfare.wav", samples)

# 9. 💎 POWERUP.WAV (High-tech digital sparkles / magical upgrade whoosh)
def gen_powerup():
    duration = 0.85
    num_samples = int(duration * SAMPLE_RATE)
    samples = [0.0] * num_samples
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        env = math.exp(-t * 3.8)
        # Glissando sweeping upward 400Hz -> 1600Hz
        freq = 400.0 + 1200.0 * (t / duration)**1.5
        shimmer = math.sin(2 * math.pi * freq * t) + 0.4 * math.sin(2 * math.pi * (freq * 1.5) * t)
        samples[i] = shimmer * env * 0.7
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
    print("All studio broadcast audio assets generated successfully!")
