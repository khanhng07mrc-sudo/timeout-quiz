import urllib.request
import urllib.parse
import json
import os

wiki_api = "https://duong-len-dinh-olympia.fandom.com/vi/api.php"
DOWNLOAD_DIR = r"d:/Timeout Quiz/timeout-quiz/public/sounds/olympia_modern"
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

# Strictly modern files (O7 to O24, strictly excluding 1999-2005)
candidate_files = [
    # BUZZ (Chuông bấm giành quyền trả lời)
    "KĐ_tín_hiệu_trả_lời_O22.mp3",
    "VCNV_tín_hiệu_trả_lời_O11.mp3",
    "VĐ_tín_hiệu_trả_lời_O8.mp3",
    
    # CORRECT (Đúng)
    "TT_đúng_O10.mp3",
    "VĐ_đúng_O11.mp3",
    "KĐ_đúng_O10.mp3",
    "VCNV_đúng_chướng_ngại_vật_O7.ogg",
    
    # WRONG (Sai)
    "VĐ_sai_O21.mp3",
    "KĐ_sai_O7.mp3",
    "VĐ_sai_O7.ogg",
    
    # SUSPENSE (Nhạc Tăng tốc / câu hỏi)
    "TT_30s_O22.mp3",
    "TT_30s_O11.ogg",
    "TT_nhạc_nền_câu_hỏi_O7.ogg",
    "VĐ_30s_O22.mp3",
    
    # TICK (Đồng hồ đếm ngược)
    "KĐ_3s_chờ_tín_hiệu_O22.mp3",
    "VĐ_5s_thí_sinh_còn_lại_O10.mp3",
    "VĐ_15s_O22.mp3",
    "KĐ_60s_O22.mp3",
    
    # GO (Bắt đầu / mở câu hỏi)
    "TT_bắt_đầu_O22.mp3",
    "VĐ_bắt_đầu_O22.mp3",
    "VCNV_bắt_đầu_O22.mp3",
    "TT_mở_câu_hỏi_O11.mp3",
    "VĐ_mở_câu_hỏi_O11.mp3",
    
    # LOBBY (Nhạc hiệu mở đầu hiện đại)
    "Olympia_21_nhạc_hiệu_mở_đầu.ogg",
    "Olympia_20_nhạc_hiệu_mở_đầu.ogg",
    "Olympia_11_nhạc_hiệu_mở_đầu.ogg",
    
    # FANFARE (Trao giải / Vòng nguyệt quế)
    "Trao_giải_thưởng_O9.mp3",
    "Trao_giải_thưởng_O7.ogg",
    
    # POWERUP (Ngôi sao hy vọng)
    "VĐ_ngôi_sao_O8.mp3",
    "VĐ_ngôi_sao_O7.mp3",
]

def get_file_urls(titles):
    params = {
        "action": "query",
        "titles": "|".join(["Tập tin:" + t for t in titles]),
        "prop": "imageinfo",
        "iiprop": "url",
        "format": "json"
    }
    url = f"{wiki_api}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        pages = data.get("query", {}).get("pages", {})
        res = {}
        for pid, pinfo in pages.items():
            t = pinfo.get("title", "").replace("Tập tin:", "").replace(" ", "_")
            ii = pinfo.get("imageinfo", [])
            if ii and "url" in ii[0]:
                res[t] = ii[0]["url"]
        return res

urls = get_file_urls(candidate_files)
print(f"Obtained {len(urls)} CDN URLs out of {len(candidate_files)} titles:")

for title, cdn_url in urls.items():
    clean_title = title.replace(" ", "_")
    ext = os.path.splitext(clean_title)[1]
    local_path = os.path.join(DOWNLOAD_DIR, clean_title)
    try:
        req = urllib.request.Request(cdn_url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
        with urllib.request.urlopen(req) as resp, open(local_path, "wb") as f:
            f.write(resp.read())
        sz = os.path.getsize(local_path)
        print(f"  [OK] {clean_title}: {sz} bytes")
    except Exception as e:
        print(f"  [ERROR] {clean_title}: {e}")
