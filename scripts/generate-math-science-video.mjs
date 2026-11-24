import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BROWSER_PATH = fs.existsSync(EDGE_PATH) ? EDGE_PATH : CHROME_PATH;

const OUTPUT_VIDEO = path.join(ROOT_DIR, "public", "olympia", "math_science_wall.webm");
const TEMP_FRAMES_DIR = path.join(ROOT_DIR, "scratch", "math_wall_frames");

if (!fs.existsSync(TEMP_FRAMES_DIR)) {
  fs.mkdirSync(TEMP_FRAMES_DIR, { recursive: true });
}

// Clean old frames
const oldFrames = fs.readdirSync(TEMP_FRAMES_DIR);
for (const f of oldFrames) {
  if (f.endsWith(".png")) fs.unlinkSync(path.join(TEMP_FRAMES_DIR, f));
}

const WIDTH = 2048;
const HEIGHT = 768;
const FPS = 30;
const DURATION_SEC = 3.0; // 3-second seamless loop
const TOTAL_FRAMES = FPS * DURATION_SEC; // 90 frames

async function generateMathScienceVideo() {
  console.log("================================================================================");
  console.log("GENERATING OLYMPIA CURVED MATH & SCIENCE WALL WEBM VIDEO");
  console.log(`Resolution: ${WIDTH}x${HEIGHT} | Frames: ${TOTAL_FRAMES} (3.0s loop @ 30fps)`);
  console.log("================================================================================");

  const browser = await puppeteer.launch({
    executablePath: BROWSER_PATH,
    headless: "new",
    defaultViewport: { width: WIDTH, height: HEIGHT },
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: ${WIDTH}px;
    height: ${HEIGHT}px;
    background: #020819;
    overflow: hidden;
  }
  canvas {
    width: ${WIDTH}px;
    height: ${HEIGHT}px;
    display: block;
  }
</style>
</head>
<body>
  <canvas id="c" width="${WIDTH}" height="${HEIGHT}"></canvas>
  <script>
    const canvas = document.getElementById("c");
    const ctx = canvas.getContext("2d");
    const W = ${WIDTH};
    const H = ${HEIGHT};

    const FORMULAS = [
      // Tier 1 (Upper zone, dispersed)
      { text: "∑", x: 420, y: 110, size: 54, rot: -0.02, speedX: 1, speedY: 1, phase: 0.1 },
      { text: "kg", x: 640, y: 105, size: 40, rot: -0.01, speedX: 1, speedY: 1, phase: 0.7 },
      { text: "Ψ", x: 870, y: 100, size: 48, rot: -0.02, speedX: 1, speedY: 1, phase: 1.4 },
      { text: "sin θ", x: 1100, y: 90, size: 40, rot: -0.01, speedX: 1, speedY: 1, phase: 2.1 },
      { text: "Ω", x: 1340, y: 90, size: 46, rot: 0.02, speedX: 1, speedY: 1, phase: 2.8 },
      { text: "π", x: 1580, y: 90, size: 46, rot: -0.02, speedX: 1, speedY: 1, phase: 3.5 },
      { text: "∫ f(x)dx", x: 1780, y: 85, size: 42, rot: 0.02, speedX: 1, speedY: 1, phase: 4.2 },
      { text: "∇", x: 1960, y: 80, size: 46, rot: -0.02, speedX: 1, speedY: 1, phase: 4.9 },

      // Tier 2 (Upper-mid zone)
      { text: "λ", x: 180, y: 220, size: 46, rot: 0.02, speedX: 1, speedY: 1, phase: 0.3 },
      { text: "lim", x: 440, y: 225, size: 40, rot: -0.02, speedX: 1, speedY: 1, phase: 1.1 },
      { text: "∞", x: 700, y: 205, size: 50, rot: 0.03, speedX: 1, speedY: 1, phase: 1.9 },
      { text: "hν", x: 950, y: 205, size: 42, rot: 0.02, speedX: 1, speedY: 1, phase: 2.6 },
      { text: "α", x: 1200, y: 220, size: 44, rot: -0.02, speedX: 1, speedY: 1, phase: 3.3 },
      { text: "β", x: 1440, y: 205, size: 44, rot: 0.02, speedX: 1, speedY: 1, phase: 4.0 },
      { text: "F=ma", x: 1680, y: 205, size: 40, rot: 0.02, speedX: 1, speedY: 1, phase: 4.7 },
      { text: "ħ", x: 1920, y: 200, size: 46, rot: 0.02, speedX: 1, speedY: 1, phase: 5.4 },

      // Tier 3 (Mid zone)
      { text: "H₂O", x: 140, y: 340, size: 42, rot: -0.01, speedX: 1, speedY: 1, phase: 0.5 },
      { text: "CO₂", x: 380, y: 345, size: 40, rot: 0.02, speedX: 1, speedY: 1, phase: 1.3 },
      { text: "mol", x: 620, y: 330, size: 38, rot: 0.02, speedX: 1, speedY: 1, phase: 2.0 },
      { text: "Hz", x: 860, y: 335, size: 40, rot: -0.02, speedX: 1, speedY: 1, phase: 2.7 },
      { text: "Δt", x: 1100, y: 330, size: 42, rot: -0.01, speedX: 1, speedY: 1, phase: 3.4 },
      { text: "c", x: 1330, y: 335, size: 44, rot: -0.02, speedX: 1, speedY: 1, phase: 4.1 },
      { text: "ρ", x: 1560, y: 335, size: 42, rot: 0.01, speedX: 1, speedY: 1, phase: 4.8 },
      { text: "O₂", x: 1780, y: 335, size: 40, rot: 0.02, speedX: 1, speedY: 1, phase: 5.5 },
      { text: "DNA", x: 1960, y: 330, size: 38, rot: 0.02, speedX: 1, speedY: 1, phase: 6.2 },

      // Tier 4 (Lower-mid zone)
      { text: "W", x: 210, y: 475, size: 42, rot: 0.02, speedX: 1, speedY: 1, phase: 0.8 },
      { text: "V", x: 460, y: 485, size: 42, rot: -0.01, speedX: 1, speedY: 1, phase: 1.6 },
      { text: "K", x: 710, y: 475, size: 40, rot: -0.01, speedX: 1, speedY: 1, phase: 2.3 },
      { text: "F", x: 960, y: 480, size: 42, rot: -0.02, speedX: 1, speedY: 1, phase: 3.0 },
      { text: "s", x: 1210, y: 475, size: 40, rot: -0.01, speedX: 1, speedY: 1, phase: 3.7 },
      { text: "Fe", x: 1450, y: 480, size: 40, rot: -0.01, speedX: 1, speedY: 1, phase: 4.4 },
      { text: "Cu", x: 1690, y: 470, size: 40, rot: 0.02, speedX: 1, speedY: 1, phase: 5.1 },
      { text: "Au", x: 1920, y: 475, size: 40, rot: -0.01, speedX: 1, speedY: 1, phase: 5.8 },

      // Tier 5 (Lower zone)
      { text: "eⁱᵖ+1=0", x: 170, y: 615, size: 36, rot: 0.01, speedX: 1, speedY: 1, phase: 0.2 },
      { text: "H₂SO₄", x: 440, y: 620, size: 38, rot: -0.01, speedX: 1, speedY: 1, phase: 1.0 },
      { text: "m/s²", x: 690, y: 610, size: 36, rot: 0.02, speedX: 1, speedY: 1, phase: 1.8 },
      { text: "φ", x: 950, y: 615, size: 42, rot: 0.02, speedX: 1, speedY: 1, phase: 2.5 },
      { text: "ln x", x: 1200, y: 615, size: 38, rot: 0.01, speedX: 1, speedY: 1, phase: 3.2 },
      { text: "mg", x: 1450, y: 620, size: 36, rot: -0.01, speedX: 1, speedY: 1, phase: 3.9 },
      { text: "arcsin", x: 1700, y: 615, size: 36, rot: -0.01, speedX: 1, speedY: 1, phase: 4.6 },
      { text: "N", x: 1930, y: 610, size: 42, rot: 0.02, speedX: 1, speedY: 1, phase: 5.3 },
    ];

    window.renderFrame = function(progress) {
      const angle = progress * Math.PI * 2; // Exact 360 seamless loop
      ctx.clearRect(0, 0, W, H);

      // 1. Deep Broadcast Sapphire-Navy Gradient
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0.0, "#030c24");
      grad.addColorStop(0.35, "#061848");
      grad.addColorStop(0.70, "#0a2670");
      grad.addColorStop(1.0, "#0e3594");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // 2. Harmonic Curved Light Sweeps (Sweeping waves)
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      for (let i = 0; i < 3; i++) {
        const waveX = W * 0.3 + Math.sin(angle + i * 1.5) * 120 + i * 400;
        const waveGrad = ctx.createRadialGradient(waveX, H * 0.45, 80, waveX, H * 0.45, 600);
        waveGrad.addColorStop(0.0, "rgba(56, 189, 248, 0.18)");
        waveGrad.addColorStop(0.6, "rgba(30, 58, 138, 0.08)");
        waveGrad.addColorStop(1.0, "rgba(2, 6, 23, 0.0)");
        ctx.fillStyle = waveGrad;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.restore();

      // 3. Official Glowing QUIZORRA Sponsor Lightbox (Upper-Left Wing: X=50, Y=35, W=290, H=90)
      ctx.save();
      const bX = 50, bY = 35, bW = 290, bH = 90;
      // Lightbox fill
      const boxGrad = ctx.createLinearGradient(bX, bY, bX, bY + bH);
      boxGrad.addColorStop(0, "#071c4d");
      boxGrad.addColorStop(1, "#041030");
      ctx.fillStyle = boxGrad;
      ctx.beginPath();
      ctx.roundRect(bX, bY, bW, bH, 12);
      ctx.fill();

      // Glowing outer border
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 3.5;
      ctx.shadowColor = "#00e5ff";
      ctx.shadowBlur = 16 + Math.sin(angle) * 4;
      ctx.stroke();

      // Inner white hairline border
      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.roundRect(bX + 4, bY + 4, bW - 8, bH - 8, 8);
      ctx.stroke();

      // QUIZORRA Bold Text
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = '900 42px "Plus Jakarta Sans", "Montserrat", "Segoe UI", sans-serif';
      ctx.letterSpacing = "0.08em";
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 14;
      ctx.fillStyle = "#ffffff";
      ctx.fillText("QUIZORRA", bX + bW / 2, bY + bH / 2 + 1);
      ctx.restore();

      // 4. Floating Glowing Formulas (Harmonic seamless loop drift)
      ctx.save();
      for (let i = 0; i < FORMULAS.length; i++) {
        const item = FORMULAS[i];
        const driftX = Math.sin(angle + item.phase) * 9;
        const driftY = Math.cos(angle + item.phase) * 7;
        const posX = item.x + driftX;
        const posY = item.y + driftY;

        ctx.save();
        ctx.translate(posX, posY);
        ctx.rotate(item.rot);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = 'italic 700 ' + Math.round(item.size * 0.85) + 'px "Cambria Math", "Times New Roman", serif';

        // Outer glow
        ctx.shadowColor = "#38bdf8";
        ctx.shadowBlur = 10 + Math.sin(angle * 2 + item.phase) * 3;
        ctx.fillStyle = "rgba(224, 242, 254, 0.92)";
        ctx.fillText(item.text, 0, 0);

        // Core white fill
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ffffff";
        ctx.fillText(item.text, 0, 0);
        ctx.restore();
      }
      ctx.restore();

      // 5. Subtle scanline raster (TV LED screen micro-stripes)
      ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
      for (let y = 0; y < H; y += 4) {
        ctx.fillRect(0, y, W, 2);
      }
    };
  </script>
</body>
</html>
`;

  await page.setContent(html, { waitUntil: "domcontentloaded" });

  console.log(`Rendering ${TOTAL_FRAMES} frames...`);
  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const progress = i / TOTAL_FRAMES;
    await page.evaluate((p) => window.renderFrame(p), progress);

    const frameFile = path.join(TEMP_FRAMES_DIR, `frame_${String(i).padStart(4, "0")}.png`);
    await page.screenshot({ path: frameFile, fullPage: false });
    if ((i + 1) % 15 === 0 || i === TOTAL_FRAMES - 1) {
      console.log(`  -> Rendered frame ${i + 1}/${TOTAL_FRAMES}`);
    }
  }

  await browser.close();
  console.log("Frames rendered! Encoding to WebM via ffmpeg...");

  // FFmpeg VP9 lossless-quality seamless loop encoding
  const ffmpegCmd = `ffmpeg -y -framerate ${FPS} -i "${path.join(TEMP_FRAMES_DIR, "frame_%04d.png")}" -c:v libvpx-vp9 -b:v 2M -pix_fmt yuv420p "${OUTPUT_VIDEO}"`;
  execSync(ffmpegCmd, { stdio: "inherit" });

  console.log(`\n✅ Generated: ${OUTPUT_VIDEO} (${(fs.statSync(OUTPUT_VIDEO).size / 1024).toFixed(1)} KB)`);

  // Clean temp frames
  const frames = fs.readdirSync(TEMP_FRAMES_DIR);
  for (const f of frames) {
    if (f.endsWith(".png")) fs.unlinkSync(path.join(TEMP_FRAMES_DIR, f));
  }
}

generateMathScienceVideo().catch((err) => {
  console.error("Error generating math science video:", err);
  process.exit(1);
});
