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
  console.log("GENERATING OLYMPIA CURVED MATH & SCIENCE WALL WEBM VIDEO (VTV3 S14 AUTHENTIC)");
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
    background: #020716;
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

    // Authentic VTV3 S14 Symbols Layout (Ref Images 7 & 8)
    const TOP_ROW = [
      { type: "text", text: "∑", x: 130, y: 345, size: 76, font: "serif", rot: -0.02 },
      { type: "flask", x: 300, y: 350, size: 36, rot: 0.04 },
      { type: "text", text: "μ", x: 470, y: 345, size: 68, font: "serif", rot: -0.03 },
      { type: "text", text: "Ψ", x: 650, y: 340, size: 74, font: "serif", rot: 0.02 },
      { type: "text", text: "m²", x: 820, y: 335, size: 48, font: "sans-serif", rot: -0.01 },
      { type: "text", text: "Δ", x: 990, y: 340, size: 66, font: "sans-serif", rot: 0.02 },
      { type: "text", text: "∑", x: 1170, y: 345, size: 74, font: "serif", rot: -0.02 },
      { type: "flask", x: 1350, y: 350, size: 36, rot: -0.03 },
      { type: "text", text: "μ", x: 1520, y: 345, size: 68, font: "serif", rot: 0.02 },
      { type: "text", text: "Ψ", x: 1690, y: 340, size: 74, font: "serif", rot: -0.02 },
      { type: "text", text: "Δ", x: 1870, y: 340, size: 66, font: "sans-serif", rot: 0.01 },
    ];

    const BOTTOM_ROW = [
      { type: "text", text: "ml", x: 80, y: 565, size: 48, font: "sans-serif", rot: 0.02 },
      { type: "flask", x: 230, y: 560, size: 38, rot: -0.03 },
      { type: "text", text: "kg", x: 380, y: 560, size: 52, font: "sans-serif", rot: 0.01 },
      { type: "text", text: "μ", x: 530, y: 565, size: 72, font: "serif", rot: -0.02 },
      { type: "text", text: "sin", x: 700, y: 565, size: 52, font: "sans-serif", rot: 0.02 },
      { type: "text", text: "cos", x: 860, y: 565, size: 52, font: "sans-serif", rot: -0.02 },
      { type: "text", text: "Ω", x: 1020, y: 560, size: 68, font: "serif", rot: 0.01 },
      { type: "text", text: "ml", x: 1180, y: 565, size: 48, font: "sans-serif", rot: -0.02 },
      { type: "text", text: "kg", x: 1330, y: 560, size: 52, font: "sans-serif", rot: 0.02 },
      { type: "text", text: "sin", x: 1490, y: 565, size: 52, font: "sans-serif", rot: -0.01 },
      { type: "text", text: "cos", x: 1650, y: 565, size: 52, font: "sans-serif", rot: 0.02 },
      { type: "text", text: "Ω", x: 1810, y: 560, size: 68, font: "serif", rot: -0.01 },
      { type: "text", text: "Δ", x: 1960, y: 560, size: 64, font: "sans-serif", rot: 0.02 },
    ];

    // Ambient floating binary dust
    const DUST = [];
    for (let i = 0; i < 90; i++) {
      DUST.push({
        char: (i % 2 === 0) ? "1" : "0",
        baseX: (i * 23) % W,
        baseY: (i * 17) % H,
        size: 14 + (i % 5) * 2,
        alpha: 0.15 + (i % 4) * 0.1,
        cycles: (i % 3) + 1,
        phase: (i * 0.13)
      });
    }

    function drawFlask(ctx, x, y, s) {
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      // Lip
      ctx.moveTo(-s * 0.3, -s);
      ctx.lineTo(s * 0.3, -s);
      // Neck
      ctx.lineTo(s * 0.25, -s * 0.4);
      // Conical Body
      ctx.lineTo(s * 0.95, s * 0.85);
      ctx.quadraticCurveTo(s * 1.05, s, s * 0.85, s);
      ctx.lineTo(-s * 0.85, s);
      ctx.quadraticCurveTo(-s * 1.05, s, -s * 0.95, s * 0.85);
      ctx.lineTo(-s * 0.25, -s * 0.4);
      ctx.closePath();

      // Fluid meniscus level
      ctx.save();
      ctx.clip();
      const fluidGrad = ctx.createLinearGradient(0, 0, 0, s);
      fluidGrad.addColorStop(0, "rgba(56, 189, 248, 0.45)");
      fluidGrad.addColorStop(1, "rgba(2, 132, 199, 0.90)");
      ctx.fillStyle = fluidGrad;
      ctx.fillRect(-s, 0, s * 2, s);
      ctx.restore();

      // Neon outer glow stroke
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 18;
      ctx.strokeStyle = "#00f0ff";
      ctx.lineWidth = 4;
      ctx.stroke();

      // Core white inner stroke
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    function drawSymbol(ctx, item, timeAngle) {
      const floatY = Math.sin(timeAngle + item.x * 0.01) * 4;
      const floatX = Math.cos(timeAngle + item.y * 0.01) * 2;
      const x = item.x + floatX;
      const y = item.y + floatY;

      if (item.type === "flask") {
        ctx.save();
        ctx.rotate(item.rot || 0);
        drawFlask(ctx, x, y, item.size);
        ctx.restore();
        return;
      }

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(item.rot || 0);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const fontFam = item.font === "serif" ? '"Cambria Math", "Georgia", serif' : '"Plus Jakarta Sans", "Montserrat", "Segoe UI", sans-serif';
      ctx.font = '900 ' + item.size + 'px ' + fontFam;

      // 1. Neon Cyan Glow Under-Layer
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 18;
      ctx.strokeStyle = "#00f0ff";
      ctx.lineWidth = 5;
      ctx.strokeText(item.text, 0, 0);

      // 2. High-Fidelity Multi-stop Vertical Glass Gradient Fill
      const grad = ctx.createLinearGradient(0, -item.size * 0.5, 0, item.size * 0.5);
      grad.addColorStop(0.0, "#ffffff");
      grad.addColorStop(0.35, "#e0f2fe");
      grad.addColorStop(0.65, "#38bdf8");
      grad.addColorStop(1.0, "#0284c7");

      ctx.shadowBlur = 0;
      ctx.fillStyle = grad;
      ctx.fillText(item.text, 0, 0);

      // 3. Crisp Inner Core Glass Stroke
      ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
      ctx.lineWidth = 1.5;
      ctx.strokeText(item.text, 0, 0);

      ctx.restore();
    }

    window.renderFrame = function(progress) {
      const angle = progress * Math.PI * 2; // Exact 360 seamless loop
      ctx.clearRect(0, 0, W, H);

      // 1. Deep Broadcast Sapphire-Navy Gradient Base
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0.0, "#02081d");
      bg.addColorStop(0.4, "#031238");
      bg.addColorStop(0.8, "#041b4e");
      bg.addColorStop(1.0, "#062464");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // 2. Radial Ambient Glow behind central wall
      const radGlow = ctx.createRadialGradient(W * 0.5, H * 0.5, 100, W * 0.5, H * 0.5, 900);
      radGlow.addColorStop(0.0, "rgba(14, 116, 144, 0.35)");
      radGlow.addColorStop(0.5, "rgba(3, 105, 161, 0.15)");
      radGlow.addColorStop(1.0, "rgba(2, 6, 23, 0.0)");
      ctx.fillStyle = radGlow;
      ctx.fillRect(0, 0, W, H);

      // 3. Ambient Floating Binary Dust Particles (Seamless closed orbit)
      ctx.save();
      ctx.font = '700 16px "Courier New", monospace';
      for (const d of DUST) {
        const dX = d.baseX + Math.sin(angle * d.cycles + d.phase) * 16;
        const dY = d.baseY + Math.cos(angle * d.cycles + d.phase) * 12;
        ctx.fillStyle = "rgba(56, 189, 248, " + d.alpha + ")";
        ctx.shadowColor = "#38bdf8";
        ctx.shadowBlur = 6;
        ctx.fillText(d.char, dX, dY);
      }
      ctx.restore();

      // 4. Horizontal Continuous Neon Data Rails & Binary Stream (VTV3 S14 Reference)
      const RAIL_Y = [140, 175, 210, 245];
      const repeatW = 600; // Exact repeating modulus for seamless loop
      ctx.save();
      for (let r = 0; r < RAIL_Y.length; r++) {
        const ry = RAIL_Y[r];
        // Glowing cyan rail line
        ctx.shadowColor = "#00f0ff";
        ctx.shadowBlur = 10;
        ctx.strokeStyle = "rgba(0, 229, 255, 0.75)";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(30, ry);
        ctx.lineTo(W - 30, ry);
        ctx.stroke();

        // Binary Pulse Packets moving along rails (Exact seamless repeat)
        ctx.font = '700 13px "Courier New", monospace';
        ctx.shadowBlur = 8;
        ctx.fillStyle = "rgba(224, 242, 254, 0.85)";
        const binaryStream = "0 1 0 1 1 0 0 1 0 1 1 0 1 0 0 1 0 1 1 0 0 1 1 0 1 0 1 1 0 0 1 0 1 1 0 1 0 0 1 0 1 1 0 0 1";
        const dir = (r % 2 === 0) ? 1 : -1;
        const offsetX = ((progress * repeatW * dir) % repeatW + repeatW) % repeatW;
        for (let bx = -repeatW + offsetX; bx < W + repeatW; bx += repeatW) {
          ctx.fillText(binaryStream, bx, ry - 5);
        }
      }
      ctx.restore();

      // 5. Multi-Layer Concentric Stepped Neon Borders (Architectural Outline)
      ctx.save();
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 18;
      ctx.strokeStyle = "rgba(0, 240, 255, 0.9)";
      ctx.lineWidth = 3.5;

      // Stepped Top Profile embracing Quizorra Lightbox
      const stepOffsets = [0, 8, 16];
      for (const off of stepOffsets) {
        ctx.beginPath();
        ctx.moveTo(40 + off, 270 - off * 0.5);
        ctx.lineTo(120 + off, 120 + off);
        ctx.lineTo(W * 0.38 - off, 120 + off);
        // Step up to Lightbox
        ctx.lineTo(W * 0.40 - off, 40 + off);
        ctx.lineTo(W * 0.60 + off, 40 + off);
        // Step down
        ctx.lineTo(W * 0.62 + off, 120 + off);
        ctx.lineTo(W - 120 - off, 120 + off);
        ctx.lineTo(W - 40 - off, 270 - off * 0.5);
        ctx.stroke();
      }

      // Left & Right Inward Chevron Accent Neon Tubes
      for (let c = 0; c < 3; c++) {
        const cOff = c * 14;
        // Left inward chevron
        ctx.beginPath();
        ctx.moveTo(25 + cOff, 320);
        ctx.lineTo(70 + cOff, 450);
        ctx.lineTo(25 + cOff, 580);
        ctx.stroke();

        // Right inward chevron
        ctx.beginPath();
        ctx.moveTo(W - 25 - cOff, 320);
        ctx.lineTo(W - 70 - cOff, 450);
        ctx.lineTo(W - 25 - cOff, 580);
        ctx.stroke();
      }
      ctx.restore();

      // 6. QUIZORRA Lightbox at Top Center (Sponsor Box matching THACO in S14)
      ctx.save();
      const lbW = 340;
      const lbH = 82;
      const lbX = (W - lbW) / 2;
      const lbY = 48;

      // Box Background
      ctx.fillStyle = "rgba(2, 6, 23, 0.88)";
      ctx.beginPath();
      ctx.roundRect(lbX, lbY, lbW, lbH, 12);
      ctx.fill();

      // Double Neon Cyan Bezel
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 16;
      ctx.strokeStyle = "#00f0ff";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(lbX + 4, lbY + 4, lbW - 8, lbH - 8, 9);
      ctx.stroke();

      // QUIZORRA Illuminated Text
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = '900 44px "Plus Jakarta Sans", "Montserrat", "Segoe UI", sans-serif';
      ctx.letterSpacing = "0.12em";
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 18;
      ctx.fillStyle = "#ffffff";
      ctx.fillText("QUIZORRA", W / 2, lbY + lbH / 2 + 1);
      ctx.restore();

      // 7. Render 3D Glass Science & Math Symbols (Top & Bottom Rows)
      for (const item of TOP_ROW) {
        drawSymbol(ctx, item, angle);
      }
      for (const item of BOTTOM_ROW) {
        drawSymbol(ctx, item, angle);
      }

      // 8. Delicate TV Scanline Raster (Fine texture)
      ctx.fillStyle = "rgba(0, 0, 0, 0.06)";
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
