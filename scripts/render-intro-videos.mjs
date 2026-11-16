import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import puppeteer from "puppeteer-core";
import * as esbuild from "esbuild";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const AUDIO_PATH = path.join(ROOT_DIR, "public", "olympia-audio", "O26", "6_NhacKhac", "section_intro.mp3");
const OUTPUT_DIR = path.join(ROOT_DIR, "public", "olympia-intro");
const FONT_PATH = "C:\\Windows\\Fonts\\arialbd.ttf";
const LAUREL_PATH = path.join(ROOT_DIR, "public", "brand", "olympia_laurel_2016.webp");
const BUNDLE_SRC = path.join(__dirname, "intro-runner.mjs");
const BUNDLE_OUT = path.join(__dirname, "intro-bundle.js");

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BROWSER_PATH = fs.existsSync(EDGE_PATH) ? EDGE_PATH : CHROME_PATH;

export const ROUND_DEFINITIONS = [
  {
    key: "khoiDong",
    title: "KHỞI ĐỘNG",
    filename: "khoi_dong.webm",
    legacyName: "intro_khoiDong.webm",
    aliases: ["intro_khoiDong.webm"],
  },
  {
    key: "vcnv",
    title: "VƯỢT CHƯỚNG NGẠI VẬT",
    filename: "vuot_chuong_ngai_vat.webm",
    legacyName: "intro_vuotChuongNgaiVat.webm",
    aliases: ["intro_vuotChuongNgaiVat.webm", "intro_vcnv.webm"],
  },
  {
    key: "tangToc",
    title: "TĂNG TỐC",
    filename: "tang_toc.webm",
    legacyName: "intro_tangToc.webm",
    aliases: ["intro_tangToc.webm"],
  },
  {
    key: "veDich",
    title: "VỀ ĐÍCH",
    filename: "ve_dich.webm",
    legacyName: "intro_veDich.webm",
    aliases: ["intro_veDich.webm"],
  },
];

async function ensureBundle() {
  console.log("==> Step 1: Bundling Three.js + Opentype scene runner with esbuild...");
  const t0 = Date.now();
  await esbuild.build({
    entryPoints: [BUNDLE_SRC],
    bundle: true,
    outfile: BUNDLE_OUT,
    format: "iife",
    target: "chrome110",
    minify: false,
    sourcemap: false,
  });
  console.log(`    Bundled ${BUNDLE_OUT} in ${Date.now() - t0}ms (${fs.statSync(BUNDLE_OUT).size} bytes)`);
}

function runCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", d => { stdout += d.toString(); });
    child.stderr.on("data", d => { stderr += d.toString(); });
    child.on("close", code => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`Command ${cmd} exited with code ${code}\nStderr: ${stderr}`));
    });
    child.on("error", reject);
  });
}

async function verifyAudio() {
  if (!fs.existsSync(AUDIO_PATH)) {
    throw new Error(`Audio asset not found at: ${AUDIO_PATH}`);
  }
  const { stdout } = await runCommand("ffprobe", [
    "-i", AUDIO_PATH,
    "-show_entries", "format=duration",
    "-of", "json",
  ]);
  const data = JSON.parse(stdout);
  const duration = parseFloat(data.format?.duration || "7.656");
  console.log(`==> Audio verified: ${AUDIO_PATH} (Duration: ${duration.toFixed(6)}s)`);
  return duration;
}

async function renderRoundVideo(browser, roundDef, audioDuration, fps = 30) {
  const totalFrames = Math.round(audioDuration * fps); // 230 frames at 30fps
  const targetWebm = path.join(OUTPUT_DIR, roundDef.filename);
  const legacyWebm = path.join(OUTPUT_DIR, roundDef.legacyName);

  console.log(`\n------------------------------------------------------------`);
  console.log(`Rendering Round: ${roundDef.title} (${roundDef.key})`);
  console.log(`Target: ${targetWebm}`);
  console.log(`Total Frames: ${totalFrames} (${fps} fps, ${(totalFrames / fps).toFixed(3)}s)`);
  console.log(`------------------------------------------------------------`);

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  page.on("pageerror", err => console.error(`[Browser Page Error]`, err));

  const fontBase64 = fs.readFileSync(FONT_PATH).toString("base64");
  const laurelBase64 = fs.existsSync(LAUREL_PATH) ? fs.readFileSync(LAUREL_PATH).toString("base64") : "";
  const bundleCode = fs.readFileSync(BUNDLE_OUT, "utf8");

  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          html, body { margin: 0; padding: 0; overflow: hidden; background: #000; }
          canvas { width: 1920px; height: 1080px; display: block; }
        </style>
      </head>
      <body>
        <canvas id="c" width="1920" height="1080"></canvas>
        <script>
          ${bundleCode}
        </script>
      </body>
    </html>
  `);

  await page.waitForFunction(() => window.__READY__ === true);

  await page.evaluate((key, fontB64, laurelB64) => {
    return window.initIntroScene(key, fontB64, laurelB64);
  }, roundDef.key, fontBase64, laurelBase64);

  // Spawn FFmpeg to receive raw JPEG stream from stdin and mux section_intro.mp3
  const ffmpeg = spawn("ffmpeg", [
    "-y",
    "-f", "image2pipe",
    "-vcodec", "mjpeg",
    "-r", String(fps),
    "-i", "-",
    "-i", AUDIO_PATH,
    "-c:v", "libvpx-vp9",
    "-b:v", "3200k",
    "-crf", "26",
    "-pix_fmt", "yuv420p",
    "-c:a", "libopus",
    "-b:a", "160k",
    "-shortest",
    targetWebm,
  ], { stdio: ["pipe", "ignore", "pipe"] });

  let stderr = "";
  ffmpeg.stderr.on("data", d => { stderr += d.toString(); });

  const ffmpegPromise = new Promise((resolve, reject) => {
    ffmpeg.on("close", code => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited with code ${code}\nStderr: ${stderr}`));
    });
    ffmpeg.on("error", reject);
  });

  const renderStart = Date.now();
  for (let f = 0; f < totalFrames; f++) {
    const dataUrl = await page.evaluate((frameIdx, fRate) => {
      return window.renderIntroFrame(frameIdx, fRate);
    }, f, fps);

    const base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, "");
    const frameBuf = Buffer.from(base64Data, "base64");
    ffmpeg.stdin.write(frameBuf);

    if (f % 50 === 0 || f === totalFrames - 1) {
      const pct = (((f + 1) / totalFrames) * 100).toFixed(1);
      const elapsed = ((Date.now() - renderStart) / 1000).toFixed(1);
      process.stdout.write(`  [${roundDef.key}] Frame ${f + 1}/${totalFrames} (${pct}%) - ${elapsed}s elapsed\r`);
    }
  }
  process.stdout.write("\n");
  ffmpeg.stdin.end();

  await ffmpegPromise;
  await page.close();

  const totalTime = ((Date.now() - renderStart) / 1000).toFixed(2);
  const fileSize = fs.statSync(targetWebm).size;
  console.log(`  ✓ Rendered ${targetWebm} in ${totalTime}s (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

  // Create backward compatibility copies
  const aliases = roundDef.aliases || [roundDef.legacyName];
  for (const alias of aliases) {
    const aliasPath = path.join(OUTPUT_DIR, alias);
    fs.copyFileSync(targetWebm, aliasPath);
    console.log(`  ✓ Copied to alias: ${aliasPath}`);
  }

  return {
    targetWebm,
    legacyWebm,
    fileSize,
    totalTime,
  };
}

async function verifyWebmFile(filePath) {
  const { stdout } = await runCommand("ffprobe", [
    "-i", filePath,
    "-show_entries", "format=duration,size,bit_rate:stream=codec_name,width,height,sample_rate,channels",
    "-of", "json",
  ]);
  const probe = JSON.parse(stdout);
  const duration = parseFloat(probe.format?.duration || "0");
  const size = parseInt(probe.format?.size || "0", 10);
  const videoStream = probe.streams?.find(s => s.codec_name === "vp9");
  const audioStream = probe.streams?.find(s => s.codec_name === "opus");

  return {
    filePath,
    duration,
    size,
    width: videoStream?.width,
    height: videoStream?.height,
    videoCodec: videoStream?.codec_name,
    audioCodec: audioStream?.codec_name,
    channels: audioStream?.channels,
  };
}

async function main() {
  console.log("============================================================");
  console.log("Olympia 26 - Broadcast-Grade 3D WebM Intro Video Pipeline");
  console.log("============================================================");

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Parse CLI arguments
  const args = process.argv.slice(2);
  let targetRoundKey = null;
  let verifyOnly = false;
  let fps = 30;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--round" && args[i + 1]) {
      targetRoundKey = args[i + 1];
      i++;
    } else if (args[i] === "--verify") {
      verifyOnly = true;
    } else if (args[i] === "--fps" && args[i + 1]) {
      fps = parseInt(args[i + 1], 10);
      i++;
    }
  }

  const audioDuration = await verifyAudio();

  if (verifyOnly) {
    console.log("\n==> Running verification on existing WebM files...");
    for (const round of ROUND_DEFINITIONS) {
      const p = path.join(OUTPUT_DIR, round.filename);
      if (fs.existsSync(p)) {
        const info = await verifyWebmFile(p);
        console.log(`[PASS] ${round.filename}: duration=${info.duration.toFixed(3)}s, ${info.width}x${info.height}, v=${info.videoCodec}, a=${info.audioCodec}, size=${(info.size / 1024 / 1024).toFixed(2)} MB`);
      } else {
        console.log(`[MISSING] ${round.filename}`);
      }
    }
    return;
  }

  await ensureBundle();

  console.log(`==> Step 2: Launching Headless Chromium Browser (${BROWSER_PATH})...`);
  const browser = await puppeteer.launch({
    executablePath: BROWSER_PATH,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--enable-webgl",
      "--use-gl=angle",
      "--use-angle=default",
      "--ignore-gpu-blocklist",
      "--high-dpi-support=1",
      "--force-device-scale-factor=1",
      "--disable-dev-shm-usage",
    ],
  });

  const roundsToRender = targetRoundKey
    ? ROUND_DEFINITIONS.filter(r => r.key === targetRoundKey)
    : ROUND_DEFINITIONS;

  if (roundsToRender.length === 0) {
    await browser.close();
    throw new Error(`No matching round found for key: ${targetRoundKey}`);
  }

  const results = [];
  const pipelineStart = Date.now();

  try {
    for (const roundDef of roundsToRender) {
      const res = await renderRoundVideo(browser, roundDef, audioDuration, fps);
      results.push(res);
    }
  } finally {
    await browser.close();
  }

  console.log("\n============================================================");
  console.log("==> Step 3: Verifying Rendered Videos with ffprobe");
  console.log("============================================================");

  for (const roundDef of roundsToRender) {
    const mainFile = path.join(OUTPUT_DIR, roundDef.filename);
    const legacyFile = path.join(OUTPUT_DIR, roundDef.legacyName);

    const mainInfo = await verifyWebmFile(mainFile);
    const legacyInfo = await verifyWebmFile(legacyFile);

    console.log(`Round [${roundDef.title}]:`);
    console.log(`  File: ${mainInfo.filePath}`);
    console.log(`  Duration: ${mainInfo.duration.toFixed(6)}s (Target: ${audioDuration.toFixed(6)}s)`);
    console.log(`  Format: ${mainInfo.videoCodec} ${mainInfo.width}x${mainInfo.height} / ${mainInfo.audioCodec} (${mainInfo.channels}ch)`);
    console.log(`  Size: ${(mainInfo.size / 1024 / 1024).toFixed(2)} MB (${mainInfo.size} bytes)`);
    console.log(`  Legacy Alias: ${legacyInfo.filePath} (${legacyInfo.size} bytes)`);
    console.log("");
  }

  const totalPipelineTime = ((Date.now() - pipelineStart) / 1000).toFixed(1);
  console.log(`All ${roundsToRender.length} video intros successfully rendered in ${totalPipelineTime}s!`);
}

main().catch(err => {
  console.error("FATAL ERROR in render-intro-videos pipeline:", err);
  process.exit(1);
});
