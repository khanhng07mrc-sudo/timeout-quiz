import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..", "..");
const INTRO_DIR = path.join(ROOT_DIR, "public", "olympia-intro");
const AUDIO_PATH = path.join(ROOT_DIR, "public", "olympia-audio", "O26", "6_NhacKhac", "section_intro.mp3");

const FILES = [
  "khoi_dong.webm",
  "vuot_chuong_ngai_vat.webm",
  "tang_toc.webm",
  "ve_dich.webm",
  // Legacy aliases
  "intro_khoiDong.webm",
  "intro_vuotChuongNgaiVat.webm",
  "intro_vcnv.webm",
  "intro_tangToc.webm",
  "intro_veDich.webm",
];

console.log("=== EMPIRICAL VERIFICATION: STREAM & CODEC SPECS ===");

// 1. Audio source
const audioProbe = JSON.parse(
  execFileSync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration,size,bit_rate:stream=codec_name,sample_rate,channels",
    "-of", "json",
    AUDIO_PATH,
  ], { encoding: "utf-8" })
);
const audioDur = parseFloat(audioProbe.format.duration);
console.log(`Original Audio: ${AUDIO_PATH}`);
console.log(`  Duration: ${audioDur.toFixed(6)}s, SampleRate: ${audioProbe.streams[0].sample_rate}Hz, Channels: ${audioProbe.streams[0].channels}\n`);

const results = [];

for (const file of FILES) {
  const filePath = path.join(INTRO_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.error(`ERROR: File missing: ${filePath}`);
    results.push({ file, exists: false });
    continue;
  }

  const stat = fs.statSync(filePath);
  const probe = JSON.parse(
    execFileSync("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration,size,bit_rate:stream=codec_name,codec_type,width,height,r_frame_rate,avg_frame_rate,sample_rate,channels",
      "-of", "json",
      filePath,
    ], { encoding: "utf-8" })
  );

  const videoStream = probe.streams.find(s => s.codec_type === "video");
  const audioStream = probe.streams.find(s => s.codec_type === "audio");
  const duration = parseFloat(probe.format.duration);

  const info = {
    file,
    size: stat.size,
    duration,
    deltaFromAudio: Math.abs(duration - audioDur),
    videoCodec: videoStream?.codec_name,
    width: videoStream?.width,
    height: videoStream?.height,
    fps: videoStream?.r_frame_rate,
    audioCodec: audioStream?.codec_name,
    sampleRate: audioStream?.sample_rate,
    channels: audioStream?.channels,
  };

  console.log(`[PASS] ${file}`);
  console.log(`  Size: ${stat.size} bytes (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`  Duration: ${duration.toFixed(6)}s (delta: ${(info.deltaFromAudio * 1000).toFixed(2)}ms)`);
  console.log(`  Video: ${info.videoCodec} ${info.width}x${info.height} @ ${info.fps}`);
  console.log(`  Audio: ${info.audioCodec} ${info.sampleRate}Hz ${info.channels}ch`);

  results.push(info);
}

fs.writeFileSync(
  path.join(__dirname, "streams_summary.json"),
  JSON.stringify({ audioSource: audioProbe, files: results }, null, 2),
  "utf-8"
);
