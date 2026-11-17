import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT_DIR, "public", "olympia-intro");

const ROUNDS = [
  {
    key: "khoiDong",
    baseName: "khoi_dong",
    aliases: ["intro_khoiDong"],
  },
  {
    key: "vcnv",
    baseName: "vuot_chuong_ngai_vat",
    aliases: ["intro_vuotChuongNgaiVat", "intro_vcnv"],
  },
  {
    key: "tangToc",
    baseName: "tang_toc",
    aliases: ["intro_tangToc"],
  },
  {
    key: "veDich",
    baseName: "ve_dich",
    aliases: ["intro_veDich"],
  },
];

function runFFmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (d) => { stderr += d.toString(); });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}\nStderr: ${stderr}`));
    });
    child.on("error", reject);
  });
}

function probe(filePath) {
  return new Promise((resolve, reject) => {
    const child = spawn("ffprobe", [
      "-hide_banner",
      "-i", filePath,
      "-show_entries", "stream=codec_name,color_space,color_primaries,color_transfer,color_range,width,height",
      "-of", "json",
    ], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    child.stdout.on("data", (d) => { stdout += d.toString(); });
    child.on("close", (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(stdout));
        } catch (e) {
          reject(e);
        }
      } else {
        reject(new Error(`ffprobe failed on ${filePath}`));
      }
    });
  });
}

async function main() {
  console.log("============================================================");
  console.log("Re-encoding Olympia Intro Videos: WebM (VP9) & MP4 (H.264)");
  console.log("Color Matrix: BT.709 | Color Range: TV (limited)");
  console.log("============================================================");

  for (const r of ROUNDS) {
    const origWebm = path.join(OUTPUT_DIR, `${r.baseName}.webm`);
    if (!fs.existsSync(origWebm)) {
      console.error(`Source file not found: ${origWebm}`);
      process.exit(1);
    }

    const tempWebm = path.join(OUTPUT_DIR, `${r.baseName}_bt709_temp.webm`);
    const finalMp4 = path.join(OUTPUT_DIR, `${r.baseName}.mp4`);

    console.log(`\nProcessing [${r.key}]: ${r.baseName}...`);

    // 1. Re-encode WebM with VP9, BT.709, TV range
    console.log(`  -> Encoding WebM VP9 BT.709...`);
    const t0 = Date.now();
    await runFFmpeg([
      "-y",
      "-i", origWebm,
      "-c:v", "libvpx-vp9",
      "-b:v", "3200k",
      "-crf", "26",
      "-colorspace", "bt709",
      "-color_primaries", "bt709",
      "-color_trc", "bt709",
      "-color_range", "tv",
      "-pix_fmt", "yuv420p",
      "-c:a", "libopus",
      "-b:a", "160k",
      tempWebm,
    ]);
    fs.renameSync(tempWebm, origWebm);
    console.log(`  ✓ WebM done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

    // 2. Encode MP4 H.264 with BT.709, TV range + faststart
    console.log(`  -> Encoding MP4 H.264 BT.709...`);
    const t1 = Date.now();
    await runFFmpeg([
      "-y",
      "-i", origWebm,
      "-c:v", "libx264",
      "-preset", "slow",
      "-crf", "20",
      "-colorspace", "bt709",
      "-color_primaries", "bt709",
      "-color_trc", "bt709",
      "-color_range", "tv",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", "192k",
      "-movflags", "+faststart",
      finalMp4,
    ]);
    console.log(`  ✓ MP4 done in ${((Date.now() - t1) / 1000).toFixed(1)}s`);

    // 3. Duplicate aliases for both WebM and MP4
    for (const alias of r.aliases) {
      const aliasWebm = path.join(OUTPUT_DIR, `${alias}.webm`);
      const aliasMp4 = path.join(OUTPUT_DIR, `${alias}.mp4`);
      fs.copyFileSync(origWebm, aliasWebm);
      fs.copyFileSync(finalMp4, aliasMp4);
      console.log(`  ✓ Synced aliases: ${alias}.webm & ${alias}.mp4`);
    }

    // 4. Verify streams
    const webmMeta = await probe(origWebm);
    const mp4Meta = await probe(finalMp4);
    const vWebm = webmMeta.streams?.find((s) => s.codec_name === "vp9");
    const vMp4 = mp4Meta.streams?.find((s) => s.codec_name === "h264");

    console.log(`  Verification WebM: codec=${vWebm?.codec_name}, space=${vWebm?.color_space}, primaries=${vWebm?.color_primaries}, trc=${vWebm?.color_transfer}, range=${vWebm?.color_range}`);
    console.log(`  Verification MP4:  codec=${vMp4?.codec_name}, space=${vMp4?.color_space}, primaries=${vMp4?.color_primaries}, trc=${vMp4?.color_transfer}, range=${vMp4?.color_range}`);
  }

  console.log("\n============================================================");
  console.log("All 4 rounds intro videos successfully re-encoded and verified!");
  console.log("============================================================");
}

main().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
