import miniaudio
import lameenc
import wave
import struct
import os

RAW_DIR = r"public/sounds/olympia_modern"
OUT_DIR = r"public/sounds"

def trim_silence(samples, nchannels, sample_rate, thresh_ratio=0.03):
    max_val = max(abs(s) for s in samples) or 1
    thresh = max_val * thresh_ratio
    
    start_idx = 0
    for i in range(0, len(samples), nchannels):
        frame_max = max(abs(samples[i + c]) for c in range(nchannels))
        if frame_max > thresh:
            start_idx = i
            break
            
    end_idx = len(samples)
    for i in range(len(samples) - nchannels, 0, -nchannels):
        frame_max = max(abs(samples[i + c]) for c in range(nchannels))
        if frame_max > thresh:
            end_idx = min(len(samples), i + int(0.05 * sample_rate * nchannels))
            break
            
    return samples[start_idx:end_idx]

def save_sound(name, raw_filename, max_duration=None, is_tick_extract=False):
    src_path = os.path.join(RAW_DIR, raw_filename)
    dec = miniaudio.decode_file(src_path)
    sr = dec.sample_rate
    ch = dec.nchannels
    samples = dec.samples
    
    if is_tick_extract:
        # Extract the first sharp click from KĐ_3s_chờ_tín_hiệu_O22 (between ~0.05s and 0.28s)
        trimmed = trim_silence(samples, ch, sr, thresh_ratio=0.08)
        # Keep 0.22 seconds
        end_tick = min(len(trimmed), int(0.22 * sr * ch))
        samples = trimmed[:end_tick]
    else:
        samples = trim_silence(samples, ch, sr, thresh_ratio=0.02)
        if max_duration:
            samples = samples[:int(max_duration * sr * ch)]
            
    # Normalize peak volume to 92% of full 16-bit range
    peak = max(abs(s) for s in samples) or 1
    gain = (32767 * 0.92) / peak
    norm_samples = [max(-32767, min(32767, int(s * gain))) for s in samples]
    
    # 1. Write WAV (16-bit PCM, matching channels)
    wav_path = os.path.join(OUT_DIR, f"{name}.wav")
    with wave.open(wav_path, "wb") as wav:
        wav.setnchannels(ch)
        wav.setsampwidth(2)
        wav.setframerate(sr)
        packed = struct.pack(f"<{len(norm_samples)}h", *norm_samples)
        wav.writeframes(packed)
        
    # 2. Write MP3 (LameEnc, 192 kbps)
    mp3_path = os.path.join(OUT_DIR, f"{name}.mp3")
    encoder = lameenc.Encoder()
    encoder.set_bit_rate(192)
    encoder.set_in_sample_rate(sr)
    encoder.set_channels(ch)
    encoder.set_quality(2)
    mp3_data = encoder.encode(packed) + encoder.flush()
    with open(mp3_path, "wb") as f:
        f.write(mp3_data)
        
    dur = len(norm_samples) / (sr * ch)
    print(f"[{name.upper()}] from {raw_filename}: dur={dur:.2f}s | WAV={len(packed)}b | MP3={len(mp3_data)}b")

# Process all 9 slots with official modern Olympia recordings:
print("Processing official modern Olympia soundpack...")
save_sound("buzz", "KĐ_tín_hiệu_trả_lời_O22.mp3")
save_sound("correct", "VĐ_đúng_O11.mp3")
save_sound("wrong", "VĐ_sai_O21.mp3")
save_sound("question_suspense", "TT_30s_O22.mp3", max_duration=34.0)
save_sound("tick", "KĐ_3s_chờ_tín_hiệu_O22.mp3", is_tick_extract=True)
save_sound("go", "VĐ_bắt_đầu_O22.mp3", max_duration=4.5)
save_sound("lobby", "Olympia_21_nhạc_hiệu_mở_đầu.ogg", max_duration=32.0)
save_sound("fanfare", "Trao_giải_thưởng_O9.mp3", max_duration=25.0)
save_sound("powerup", "VĐ_ngôi_sao_O8.mp3", max_duration=6.0)

print("All official modern Olympia audio assets updated!")
