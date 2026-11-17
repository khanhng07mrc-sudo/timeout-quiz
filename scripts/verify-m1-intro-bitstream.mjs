import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import puppeteer from "puppeteer-core";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const AUDIO_PATH = path.join(ROOT_DIR, "public", "olympia-audio", "O26", "6_NhacKhac", "section_intro.mp3");
const INTRO_DIR = path.join(ROOT_DIR, "public", "olympia-intro");

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BROWSER_PATH = fs.existsSync(EDGE_PATH) ? EDGE_PATH : CHROME_PATH;

const PRIMARY_FILES = [
  { key: "khoi_dong", file: "khoi_dong.webm", title: "Khởi Động" },
  { key: "vuot_chuong_ngai_vat", file: "vuot_chuong_ngai_vat.webm", title: "Vượt Chướng Ngại Vật" },
  { key: "tang_toc", file: "tang_toc.webm", title: "Tăng Tốc" },
  { key: "ve_dich", file: "ve_dich.webm", title: "Về Đích" },
];

const LEGACY_PAIRS = [
  { primary: "khoi_dong.webm", legacy: "intro_khoiDong.webm" },
  { primary: "vuot_chuong_ngai_vat.webm", legacy: "intro_vuotChuongNgaiVat.webm" },
  { primary: "vuot_chuong_ngai_vat.webm", legacy: "intro_vcnv.webm" },
  { primary: "tang_toc.webm", legacy: "intro_tangToc.webm" },
  { primary: "ve_dich.webm", legacy: "intro_veDich.webm" },
];

function execCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", d => { stdout += d.toString(); });
    child.stderr.on("data", d => { stderr += d.toString(); });
    child.on("close", code => {
      resolve({ code, stdout, stderr });
    });
    child.on("error", reject);
  });
}

function getSha256(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

async function probeFile(filePath) {
  const res = await execCommand("ffprobe", [
    "-v", "error",
    "-show_format",
    "-show_streams",
    "-of", "json",
    filePath,
  ]);
  if (res.code !== 0) {
    throw new Error(`ffprobe failed on ${filePath}: ${res.stderr}`);
  }
  return JSON.parse(res.stdout);
}

async function probeFrames(filePath, streamType = "v") {
  const res = await execCommand("ffprobe", [
    "-v", "error",
    "-select_streams", streamType,
    "-show_entries", "frame=pts,pts_time,duration_time,key_frame,pict_type",
    "-of", "json",
    filePath,
  ]);
  if (res.code !== 0) {
    throw new Error(`ffprobe frames failed on ${filePath}: ${res.stderr}`);
  }
  return JSON.parse(res.stdout).frames || [];
}

async function testFullDecode(filePath) {
  const res = await execCommand("ffmpeg", [
    "-v", "error",
    "-i", filePath,
    "-f", "null",
    "-",
  ]);
  return {
    success: res.code === 0 && res.stderr.trim().length === 0,
    code: res.code,
    stderr: res.stderr.trim(),
  };
}

async function testBrowserPlayback(filePath) {
  const browser = await puppeteer.launch({
    executablePath: BROWSER_PATH,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--enable-webgl",
      "--use-gl=angle",
      "--use-angle=default",
      "--autoplay-policy=no-user-gesture-required",
    ],
  });

  try {
    const page = await browser.newPage();
    const fileUrl = "file:///" + filePath.replace(/\\/g, "/");

    const html = `
      <!DOCTYPE html>
      <html>
        <body>
          <video id="vid" src="${fileUrl}" muted playsinline></video>
        </body>
      </html>
    `;

    await page.setContent(html);

    const result = await page.evaluate(async () => {
      const vid = document.getElementById("vid");
      return new Promise((resolve) => {
        const logs = [];
        let metadataLoaded = false;
        let endedFired = false;
        let duration = null;
        let videoWidth = null;
        let videoHeight = null;

        const timeout = setTimeout(() => {
          resolve({
            success: false,
            error: "Playback timed out after 12s",
            logs,
            metadataLoaded,
            endedFired,
            duration,
            videoWidth,
            videoHeight,
          });
        }, 12000);

        vid.addEventListener("loadedmetadata", () => {
          metadataLoaded = true;
          duration = vid.duration;
          videoWidth = vid.videoWidth;
          videoHeight = vid.videoHeight;
          logs.push(`loadedmetadata: ${videoWidth}x${videoHeight}, dur=${duration}`);
          // Increase playback rate to 4x for fast deterministic verification
          vid.playbackRate = 4.0;
          vid.play().catch(e => logs.push(`play error: ${e.message}`));
        });

        vid.addEventListener("timeupdate", () => {
          // just track progress
        });

        vid.addEventListener("ended", () => {
          endedFired = true;
          clearTimeout(timeout);
          resolve({
            success: true,
            error: null,
            logs,
            metadataLoaded,
            endedFired,
            duration,
            videoWidth,
            videoHeight,
            currentTime: vid.currentTime,
          });
        });

        vid.addEventListener("error", (e) => {
          clearTimeout(timeout);
          resolve({
            success: false,
            error: vid.error ? `MediaError code ${vid.error.code}: ${vid.error.message}` : "Unknown error",
            logs,
            metadataLoaded,
            endedFired,
            duration,
            videoWidth,
            videoHeight,
          });
        });
      });
    });

    await page.close();
    await browser.close();
    return result;
  } catch (err) {
    await browser.close();
    return {
      success: false,
      error: err.message,
    };
  }
}

async function runEmpiricalVerification() {
  console.log("================================================================================");
  console.log("CHALLENGER M1.1: EMPIRICAL BITSTREAM & SYNC VERIFICATION");
  console.log("================================================================================");

  const report = {
    timestamp: new Date().toISOString(),
    audioReference: {},
    primaryFiles: {},
    legacyParity: {},
    syncAnalysis: {},
    keyframeAnalysis: {},
    decodeChecks: {},
    browserPlayback: {},
    allPassed: true,
  };

  // 1. Audio Reference Check
  console.log("\n[1] Probing Audio Reference Asset (section_intro.mp3)...");
  const audioProbe = await probeFile(AUDIO_PATH);
  const audioDuration = parseFloat(audioProbe.format?.duration || "0");
  const audioStream = audioProbe.streams?.find(s => s.codec_type === "audio");
  report.audioReference = {
    path: AUDIO_PATH,
    formatDuration: audioDuration,
    sampleRate: parseInt(audioStream?.sample_rate || "0", 10),
    channels: audioStream?.channels,
    bitRate: parseInt(audioProbe.format?.bit_rate || "0", 10),
    startTime: parseFloat(audioProbe.format?.start_time || "0"),
  };
  console.log(`  Path: ${AUDIO_PATH}`);
  console.log(`  Duration: ${audioDuration.toFixed(6)}s, SampleRate: ${report.audioReference.sampleRate} Hz, Channels: ${report.audioReference.channels}`);

  // 2. Primary WebM Bitstream & Stream Structure Check
  console.log("\n[2] Probing 4 Primary WebM Files...");
  for (const item of PRIMARY_FILES) {
    const filePath = path.join(INTRO_DIR, item.file);
    const probe = await probeFile(filePath);
    const vStream = probe.streams?.find(s => s.codec_type === "video");
    const aStream = probe.streams?.find(s => s.codec_type === "audio");
    const sha = getSha256(filePath);
    const size = fs.statSync(filePath).size;

    const vDurTag = vStream?.tags?.DURATION || "";
    const aDurTag = aStream?.tags?.DURATION || "";
    const formatDur = parseFloat(probe.format?.duration || "0");

    report.primaryFiles[item.key] = {
      file: item.file,
      title: item.title,
      size,
      sha256: sha,
      formatDuration: formatDur,
      formatName: probe.format?.format_name,
      video: {
        codec: vStream?.codec_name,
        profile: vStream?.profile,
        mimeCodec: vStream?.mime_codec_string,
        width: vStream?.width,
        height: vStream?.height,
        pixFmt: vStream?.pix_fmt,
        rFrameRate: vStream?.r_frame_rate,
        avgFrameRate: vStream?.avg_frame_rate,
        durationTag: vDurTag,
        startTime: parseFloat(vStream?.start_time || "0"),
      },
      audio: {
        codec: aStream?.codec_name,
        sampleRate: parseInt(aStream?.sample_rate || "0", 10),
        channels: aStream?.channels,
        mimeCodec: aStream?.mime_codec_string,
        durationTag: aDurTag,
        startTime: parseFloat(aStream?.start_time || "0"),
      },
    };

    console.log(`  [${item.title}] ${item.file}:`);
    console.log(`    Size: ${size} bytes | SHA256: ${sha.slice(0, 16)}...`);
    console.log(`    Format: ${probe.format?.format_name} | Duration: ${formatDur.toFixed(6)}s`);
    console.log(`    Video: ${vStream?.codec_name} (${vStream?.profile}), ${vStream?.width}x${vStream?.height}, ${vStream?.pix_fmt}, ${vStream?.r_frame_rate} fps, start=${vStream?.start_time}s`);
    console.log(`    Audio: ${aStream?.codec_name}, ${aStream?.sample_rate} Hz, ${aStream?.channels} ch, start=${aStream?.start_time}s`);

    // Verify assertions
    const formatOk = probe.format?.format_name === "matroska,webm";
    const durOk = formatDur >= 7.656 && formatDur <= 7.665;
    const vOk = vStream?.codec_name === "vp9" && vStream?.profile === "Profile 0" && vStream?.width === 1920 && vStream?.height === 1080 && vStream?.r_frame_rate === "30/1";
    const aOk = aStream?.codec_name === "opus" && aStream?.sample_rate === 48000 && aStream?.channels === 2;

    if (!formatOk || !durOk || !vOk || !aOk) {
      report.allPassed = false;
      console.error(`    FAILED ASSERTIONS on ${item.file}`);
    }
  }

  // 3. Bitwise Parity for Legacy Aliases
  console.log("\n[3] Verifying Bitwise SHA256 Parity for Legacy Aliases...");
  for (const pair of LEGACY_PAIRS) {
    const primaryPath = path.join(INTRO_DIR, pair.primary);
    const legacyPath = path.join(INTRO_DIR, pair.legacy);
    const primSha = getSha256(primaryPath);
    const legSha = getSha256(legacyPath);
    const match = primSha === legSha;
    report.legacyParity[pair.legacy] = {
      primary: pair.primary,
      legacy: pair.legacy,
      primarySha: primSha,
      legacySha: legSha,
      match,
    };
    console.log(`  ${pair.legacy} == ${pair.primary}: ${match ? "PASS (Exact match)" : "FAIL (Mismatch)"}`);
    if (!match) report.allPassed = false;
  }

  // 4. Video & Audio Desync Analysis
  console.log("\n[4] Empirical Sync & Duration Delta Analysis...");
  for (const item of PRIMARY_FILES) {
    const filePath = path.join(INTRO_DIR, item.file);
    const vFrames = await probeFrames(filePath, "v");
    const aFrames = await probeFrames(filePath, "a");

    const vCount = vFrames.length;
    const aCount = aFrames.length;

    const vFirstPts = parseFloat(vFrames[0]?.pts_time || "0");
    const vLastPts = parseFloat(vFrames[vCount - 1]?.pts_time || "0");
    const vLastDur = parseFloat(vFrames[vCount - 1]?.duration_time || "0");
    const vEndTime = vLastPts + vLastDur;

    const aFirstPts = parseFloat(aFrames[0]?.pts_time || "0");
    const aLastPts = parseFloat(aFrames[aCount - 1]?.pts_time || "0");
    const aLastDur = parseFloat(aFrames[aCount - 1]?.duration_time || "0");
    const aEndTime = aLastPts + aLastDur;

    const startDesync = Math.abs(vFirstPts - aFirstPts);
    const endDesync = Math.abs(vEndTime - aEndTime);

    report.syncAnalysis[item.key] = {
      file: item.file,
      videoFramesCount: vCount,
      audioFramesCount: aCount,
      videoStartTime: vFirstPts,
      videoEndTime: vEndTime,
      audioStartTime: aFirstPts,
      audioEndTime: aEndTime,
      startDesyncMs: startDesync * 1000,
      endDesyncMs: endDesync * 1000,
      withinFrameTolerance: endDesync <= 0.034, // <= 1 video frame (33.3ms)
    };

    console.log(`  [${item.title}] ${item.file}:`);
    console.log(`    Video: ${vCount} frames, ${vFirstPts.toFixed(3)}s -> ${vEndTime.toFixed(3)}s`);
    console.log(`    Audio: ${aCount} frames, ${aFirstPts.toFixed(3)}s -> ${aEndTime.toFixed(3)}s`);
    console.log(`    Start Desync: ${(startDesync * 1000).toFixed(2)} ms | End Desync: ${(endDesync * 1000).toFixed(2)} ms`);
    console.log(`    Sync Status: ${endDesync <= 0.034 ? "PASS (Sub-frame alignment < 33.3ms)" : "FAIL"}`);

    if (endDesync > 0.034) report.allPassed = false;
  }

  // 5. Keyframe & Frame Cadence Continuity Check
  console.log("\n[5] Keyframe Structure & Frame PTS Continuity Analysis...");
  for (const item of PRIMARY_FILES) {
    const filePath = path.join(INTRO_DIR, item.file);
    const vFrames = await probeFrames(filePath, "v");

    let isMonotonic = true;
    let maxStepError = 0;
    const keyframes = [];

    for (let i = 0; i < vFrames.length; i++) {
      const f = vFrames[i];
      const pts = parseFloat(f.pts_time);
      if (f.key_frame === 1) {
        keyframes.push({ index: i, pts, type: f.pict_type });
      }
      if (i > 0) {
        const prevPts = parseFloat(vFrames[i - 1].pts_time);
        const step = pts - prevPts;
        if (step <= 0) isMonotonic = false;
        const err = Math.abs(step - (1 / 30));
        if (err > maxStepError) maxStepError = err;
      }
    }

    report.keyframeAnalysis[item.key] = {
      file: item.file,
      totalFrames: vFrames.length,
      isMonotonic,
      maxStepErrorSec: maxStepError,
      keyframes,
    };

    console.log(`  [${item.title}] ${item.file}:`);
    console.log(`    Total Frames: ${vFrames.length} | Strictly Monotonic: ${isMonotonic} | Max PTS Jitter: ${(maxStepError * 1000).toFixed(3)} ms`);
    console.log(`    Keyframes (${keyframes.length}): ${keyframes.map(k => `f[${k.index}]@${k.pts.toFixed(3)}s (${k.type})`).join(", ")}`);

    if (!isMonotonic || vFrames.length !== 229 || keyframes.length < 1 || keyframes[0].index !== 0) {
      report.allPassed = false;
      console.error(`    FAILED Frame / Keyframe requirements on ${item.file}`);
    }
  }

  // 6. Bitstream Decode Verification (Zero corruption / dropped frames)
  console.log("\n[6] Full FFmpeg Bitstream Decode Test (Zero Warnings/Errors)...");
  const allWebmFiles = [
    ...PRIMARY_FILES.map(p => p.file),
    ...LEGACY_PAIRS.map(l => l.legacy),
  ];
  for (const f of allWebmFiles) {
    const filePath = path.join(INTRO_DIR, f);
    const decRes = await testFullDecode(filePath);
    report.decodeChecks[f] = decRes;
    console.log(`  Decode ${f}: ${decRes.success ? "PASS (Zero errors, 100% clean decode)" : "FAIL: " + decRes.stderr}`);
    if (!decRes.success) report.allPassed = false;
  }

  // 7. Real Browser Playback Verification (Headless Edge)
  console.log("\n[7] Headless Browser Playback Test in Microsoft Edge...");
  for (const item of PRIMARY_FILES) {
    const filePath = path.join(INTRO_DIR, item.file);
    const pb = await testBrowserPlayback(filePath);
    report.browserPlayback[item.key] = pb;
    console.log(`  [${item.title}] Playback ${item.file}:`);
    console.log(`    Success: ${pb.success} | Ended Fired: ${pb.endedFired} | Error: ${pb.error || "None"}`);
    console.log(`    Reported Metadata: ${pb.videoWidth}x${pb.videoHeight}, duration=${pb.duration?.toFixed(3)}s, currentTime=${pb.currentTime?.toFixed(3)}s`);
    if (!pb.success || !pb.endedFired || pb.videoWidth !== 1920 || pb.videoHeight !== 1080) {
      report.allPassed = false;
      console.error(`    FAILED Browser Playback on ${item.file}`);
    }
  }

  console.log("\n================================================================================");
  console.log(`OVERALL EMPIRICAL VERDICT: ${report.allPassed ? "APPROVE" : "REQUEST_CHANGES"}`);
  console.log("================================================================================");

  // Write JSON report for persistence and reference
  const reportPath = path.join(ROOT_DIR, "artifacts", "challenger-m1-1-bitstream-report.json");
  if (!fs.existsSync(path.dirname(reportPath))) {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  }
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`\nWritten full structured report to: ${reportPath}`);

  return report;
}

runEmpiricalVerification().catch(err => {
  console.error("Fatal error during empirical verification:", err);
  process.exit(1);
});
