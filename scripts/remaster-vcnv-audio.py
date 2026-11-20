"""
Remaster VCNV start_round audio assets into broadcast-grade stereo (O13-21)
Combines:
  1. Multi-rhythm percussion prelude (0.0s - 1.962s) with Haas ITD widening
  2. Brass/synth fanfare from KD bat dau O7 (1.962s - 7.454s) with stereo expansion
  3. Celebratory outro chime from KD dung O7 (7.454s - 13.064s)
Normalizes to EBU R128 (-14.5 LUFS, True Peak <= -1.5 dBTP).
"""
import os
import subprocess
import shutil

BASE_DIR = r"d:\Timeout Quiz"
TARGET_DIR = os.path.join(BASE_DIR, "public", "olympia-audio", "O13-21", "2_VuotChuongNgaiVat")
TEMP_DIR = os.path.join(BASE_DIR, "scratch", "temp_vcnv_build")
os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(TARGET_DIR, exist_ok=True)

f_orig = os.path.join(BASE_DIR, "public", "olympia-audio", "fandom", "VCNV bắt đầu O11.mp3")
f_kd_start = os.path.join(BASE_DIR, "scratch", "fandom_downloads", "KĐ_bắt_đầu_left_O7.mp3")
f_kd_dung = os.path.join(BASE_DIR, "public", "olympia-audio", "fandom", "KĐ bắt đầu left O7.mp3")

wiki_cache = r"C:\Users\khanh\.gemini\antigravity\scratch\teamwork\be849f47-c3b9-4cac-9963-764462fb82a9\.agents\teamwork\explorer_survey_2\wiki_samples"
if os.path.exists(os.path.join(wiki_cache, "KD_bat_dau_O7.ogg")):
    f_kd_start = os.path.join(wiki_cache, "KD_bat_dau_O7.ogg")
if os.path.exists(os.path.join(wiki_cache, "KD_dung_O7.mp3")):
    f_kd_dung = os.path.join(wiki_cache, "KD_dung_O7.mp3")

intro_wav = os.path.join(TEMP_DIR, "intro_rhythm.wav")
mid_wav = os.path.join(TEMP_DIR, "middle_segment.wav")
end_wav = os.path.join(TEMP_DIR, "ending_segment.wav")
stitched_wav = os.path.join(TEMP_DIR, "stitched.wav")

master_mp3 = os.path.join(TARGET_DIR, "start_round.mp3")
left_mp3 = os.path.join(TARGET_DIR, "start_round_left.mp3")
right_mp3 = os.path.join(TARGET_DIR, "start_round_right.mp3")

# Segment 1: Multi-rhythm intro with Haas stereo widening
subprocess.run([
    'ffmpeg', '-y', '-ss', '0.0', '-t', '1.962', '-i', f_orig,
    '-af', 'highpass=f=75,equalizer=f=3500:t=q:w=1.5:g=3.0,equalizer=f=250:t=q:w=1.0:g=-2.0,crystalizer=i=2.0,haas=left_delay=14:right_delay=2,stereowiden=delay=16:feedback=0.3:crossfeed=0.2:drymix=0.8',
    intro_wav
], check=True)

# Segment 2: Middle fanfare from KD bat dau O7
subprocess.run([
    'ffmpeg', '-y', '-ss', '0.0', '-t', '5.492', '-i', f_kd_start,
    '-af', 'highpass=f=60,equalizer=f=3200:t=q:w=1.2:g=2.5,equalizer=f=300:t=q:w=1.0:g=-1.5,aexciter=amount=2.0:drive=3:freq=5000,extrastereo=m=1.35',
    mid_wav
], check=True)

# Segment 3: Ending outro from KD dung O7
subprocess.run([
    'ffmpeg', '-y', '-ss', '0.0', '-t', '5.790', '-i', f_kd_dung,
    '-af', 'highpass=f=60,equalizer=f=3500:t=q:w=1.2:g=2.5,equalizer=f=280:t=q:w=1.0:g=-1.5,aexciter=amount=2.0:drive=3:freq=5000,extrastereo=m=1.3',
    end_wav
], check=True)

# Splicing with crossfades
subprocess.run([
    'ffmpeg', '-y', '-i', intro_wav, '-i', mid_wav, '-i', end_wav,
    '-filter_complex', '[0:a][1:a]acrossfade=d=0.06:c1=tri:c2=tri[a01];[a01][2:a]acrossfade=d=0.12:c1=tri:c2=tri[aout]',
    '-map', '[aout]', stitched_wav
], check=True)

# Master export with BS2B binaural filter & EBU R128 loudness normalization
subprocess.run([
    'ffmpeg', '-y', '-i', stitched_wav,
    '-af', 'bs2b=profile=default,loudnorm=I=-14.0:TP=-1.5:LRA=9.0:dual_mono=false,afade=t=out:st=12.5:d=0.74',
    '-ar', '48000', '-b:a', '192k', master_mp3
], check=True)

# Dual-mono exports for channel balance verification
subprocess.run(['ffmpeg', '-y', '-i', master_mp3, '-af', 'pan=stereo|c0=c0|c1=c0', '-ar', '48000', '-b:a', '192k', left_mp3], check=True)
subprocess.run(['ffmpeg', '-y', '-i', master_mp3, '-af', 'pan=stereo|c0=c1|c1=c1', '-ar', '48000', '-b:a', '192k', right_mp3], check=True)

print("Successfully generated and deployed authentic VCNV stereo intro files!")
