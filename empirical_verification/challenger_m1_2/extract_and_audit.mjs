import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..", "..");
const INTRO_DIR = path.join(ROOT_DIR, "public", "olympia-intro");
const FRAMES_DIR = path.join(__dirname, "frames");

if (!fs.existsSync(FRAMES_DIR)) {
  fs.mkdirSync(FRAMES_DIR, { recursive: true });
}

const VIDEOS = [
  { name: "khoi_dong", file: "khoi_dong.webm", title: "KHỞI ĐỘNG" },
  { name: "vuot_chuong_ngai_vat", file: "vuot_chuong_ngai_vat.webm", title: "VƯỢT CHƯỚNG NGẠI VẬT" },
  { name: "tang_toc", file: "tang_toc.webm", title: "TĂNG TỐC" },
  { name: "ve_dich", file: "ve_dich.webm", title: "VỀ ĐÍCH" },
];

const TIMESTAMPS = [
  { label: "t1.0s", time: "00:00:01.000", desc: "Rotating crystal star column & crimson bokeh particles" },
  { label: "t3.6s", time: "00:00:03.600", desc: "Golden lens flare burst explosion at the apex" },
  { label: "t5.5s", time: "00:00:05.500", desc: "Laurel wreath + Olympia mountain peak + text rushing forward" },
  { label: "t7.0s", time: "00:00:07.000", desc: "Final settled 3D beveled metallic gold typography with specular sheen sweep" },
];

console.log("=== EMPIRICAL VERIFICATION: EXTRACTING FRAMES ===");
const results = [];

for (const video of VIDEOS) {
  const videoPath = path.join(INTRO_DIR, video.file);
  if (!fs.existsSync(videoPath)) {
    console.error(`ERROR: Video file not found: ${videoPath}`);
    continue;
  }

  console.log(`\nProcessing ${video.name} (${video.title})...`);
  for (const ts of TIMESTAMPS) {
    const outFilename = `${video.name}_${ts.label}.png`;
    const outPath = path.join(FRAMES_DIR, outFilename);

    // Frame-accurate extraction with -ss after -i
    try {
      execFileSync("ffmpeg", [
        "-y",
        "-i", videoPath,
        "-ss", ts.time,
        "-frames:v", "1",
        "-update", "1",
        outPath,
      ], { stdio: "pipe" });

      const stat = fs.statSync(outPath);
      console.log(`  [OK] Extracted ${outFilename} (${stat.size} bytes) at ${ts.time}`);
      results.push({
        video: video.name,
        title: video.title,
        timestamp: ts.label,
        time: ts.time,
        desc: ts.desc,
        file: outFilename,
        path: outPath,
        size: stat.size,
      });
    } catch (err) {
      console.error(`  [FAIL] Failed to extract ${outFilename}:`, err.message);
    }
  }
}

fs.writeFileSync(
  path.join(__dirname, "extraction_summary.json"),
  JSON.stringify(results, null, 2),
  "utf-8"
);
console.log(`\nExtracted total ${results.length} frames successfully.`);
