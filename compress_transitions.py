import os
import subprocess

FFMPEG_PATH = r"C:\Users\khanh\AppData\Roaming\Python\Python314\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"
TRANS_DIR = os.path.abspath(r"public\transitions")

videos = [
    "auction_stealth.webm",
    "battle_royale.webm",
    "boss_raid.webm",
    "classic.webm",
    "gold_mine.webm",
    "grid_caro.webm",
    "mystery_quest.webm",
    "speed_race.webm",
    "tower_defense.webm",
]

print("Starting ultra-compact compression for all 9 WebM transitions...")

for v in videos:
    in_path = os.path.join(TRANS_DIR, v)
    temp_path = os.path.join(TRANS_DIR, "temp_" + v)
    
    orig_size = os.path.getsize(in_path) / 1024
    
    cmd = [
        FFMPEG_PATH, "-y",
        "-i", in_path,
        "-c:v", "libvpx",
        "-auto-alt-ref", "0",
        "-b:v", "850k",
        "-crf", "28",
        "-g", "60",
        "-quality", "realtime",
        "-cpu-used", "6",
        "-threads", "8",
        "-pix_fmt", "yuva420p",
        temp_path
    ]
    
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    
    new_size = os.path.getsize(temp_path) / 1024
    
    # Replace original with compressed file
    os.replace(temp_path, in_path)
    print(f"✅ {v}: {orig_size:.1f} KB -> {new_size:.1f} KB (Reduced by {((orig_size - new_size)/orig_size)*100:.1f}%)")

print("\n🎉 All 9 transitions successfully compressed!")
