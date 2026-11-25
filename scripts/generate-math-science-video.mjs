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
for (const f of fs.readdirSync(TEMP_FRAMES_DIR)) {
  if (f.endsWith(".png")) fs.unlinkSync(path.join(TEMP_FRAMES_DIR, f));
}

const WIDTH = 2048;
const HEIGHT = 768;
const FPS = 30;
const DURATION_SEC = 3.0; // 3-second seamless loop
const TOTAL_FRAMES = FPS * DURATION_SEC; // 90 frames

async function generateMathScienceVideo() {
  console.log("================================================================================");
  console.log("GENERATING OLYMPIA CURVED MATH & SCIENCE WALL WEBM VIDEO (TRANSPARENT YUVA420P)");
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
  html, body {
    width: ${WIDTH}px;
    height: ${HEIGHT}px;
    background: transparent !important;
    overflow: hidden;
  }
  canvas {
    width: ${WIDTH}px;
    height: ${HEIGHT}px;
    display: block;
    background: transparent;
  }
</style>
</head>
<body>
  <canvas id="c" width="${WIDTH}" height="${HEIGHT}"></canvas>
  <script>
    const canvas = document.getElementById("c");
    const ctx = canvas.getContext("2d", { alpha: true });
    const W = ${WIDTH};
    const H = ${HEIGHT};

    // Cylinder R=8.6m, H=2.4m, 0.76*PI -> 20.533m x 2.4m = 8.555:1 aspect.
    // Canvas is 2048x768 = 2.667:1 -> 3.208x horizontal stretch on 3D mesh.
    // Apply X_COMP (~0.33) inside symbol/digit transforms so 3D rendering is undistorted.
    const CYL_STRETCH = 3.208;
    const X_COMP = 1 / 3.05;

    // 3D physical QUIZORRA lightbox sits at theta=1.375*PI -> u_geom=0.4276 -> x_tex ≈ 1172 (0.5724 * W)
    const BAY_LEFT = 760;
    const BAY_RIGHT = 1540;
    const WING_TOP_LEFT = 690;
    const WING_TOP_RIGHT = 1610;

    // Stepped perimeter polygon (alpha=0 strictly outside outer neon glow, including corners)
    function getContourPoints(insetY) {
      const ix = insetY * 0.48; // horizontal inset scaled for 3.2x cylinder stretch
      const iy = insetY;
      return [
        { x: 40 + ix * 1.35, y: 34 + iy },              // Top-left wing tip
        { x: WING_TOP_LEFT - ix * 0.4, y: 68 + iy },    // Left step top corner
        { x: BAY_LEFT - ix * 0.4, y: 196 + iy },        // Left step bottom corner (central bay)
        { x: BAY_RIGHT + ix * 0.4, y: 196 + iy },       // Right step bottom corner (central bay)
        { x: WING_TOP_RIGHT + ix * 0.4, y: 68 + iy },   // Right step top corner
        { x: W - 40 - ix * 1.35, y: 34 + iy },          // Top-right wing tip
        { x: W - 148 - ix * 0.9, y: H * 0.5 },          // Right inward chevron (<) apex
        { x: W - 40 - ix * 1.35, y: H - 34 - iy },      // Bottom-right corner
        { x: 40 + ix * 1.35, y: H - 34 - iy },          // Bottom-left corner
        { x: 148 + ix * 0.9, y: H * 0.5 },              // Left inward chevron (>) apex
      ];
    }

    function tracePoints(targetCtx, pts, scaleX = 1) {
      targetCtx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const px = pts[i].x * scaleX;
        const py = pts[i].y;
        if (i === 0) targetCtx.moveTo(px, py);
        else targetCtx.lineTo(px, py);
      }
      targetCtx.closePath();
    }

    // Build repeating VTV3 S14 math & science symbol sequence across 2 staggered rows
    // Reference motif: Σ, ml, flask, kg, μ, bulb, Ψ, m², sin, vbar, Δ, cos, Ω
    const MOTIF = [
      { kind: "text", text: "Σ", dy: -8, size: 78, font: "serif", rot: -0.02 },
      { kind: "text", text: "ml", dx: 42, dy: 28, size: 28, font: "sans", rot: 0.01 },
      { kind: "flask", dx: 74, dy: 2, size: 42, rot: 0.06 },
      { kind: "text", text: "kg", dx: 112, dy: -22, size: 28, font: "sans", rot: -0.02 },
      { kind: "text", text: "μ", dx: 148, dy: 8, size: 78, font: "serif", rot: -0.02 },
      { kind: "bulb", dx: 184, dy: -20, size: 20, rot: -0.08 },
      { kind: "text", text: "Ψ", dx: 222, dy: -6, size: 76, font: "serif", rot: 0.02 },
      { kind: "text", text: "m²", dx: 262, dy: 22, size: 28, font: "sans", rot: -0.01 },
      { kind: "text", text: "sin", dx: 292, dy: 34, size: 32, font: "sans", rot: 0.01 },
      { kind: "vbar", dx: 332, dy: 12, size: 38, rot: 0 },
      { kind: "delta", dx: 368, dy: -12, size: 42, rot: 0.02 },
      { kind: "text", text: "cos", dx: 396, dy: 34, size: 30, font: "sans", rot: -0.01 },
      { kind: "text", text: "Ω", dx: 438, dy: 16, size: 64, font: "serif", rot: 0.01 },
    ];

    const SYMBOLS = [];
    const MOTIF_SPAN = 485;

    // Upper staggered row (tucks slightly higher in raised wings, sits below cyan rails in central bay)
    for (let base = 155; base < W - 130; base += MOTIF_SPAN) {
      for (const m of MOTIF) {
        const sx = base + (m.dx || 0);
        if (sx < 145 || sx > W - 145) continue;
        // Raise slightly in left/right wings where upper bay steps up
        let wingLift = 0;
        if (sx < BAY_LEFT - 10) wingLift = -72;
        else if (sx > BAY_RIGHT + 10) wingLift = -72;
        SYMBOLS.push({
          ...m,
          x: sx,
          y: 448 + wingLift + (m.dy || 0),
          phase: sx * 0.013,
        });
      }
    }

    // Lower staggered row (shifted by half motif span for authentic dense lattice)
    for (let base = -75; base < W - 120; base += MOTIF_SPAN) {
      for (const m of MOTIF) {
        const sx = base + (m.dx || 0);
        if (sx < 145 || sx > W - 145) continue;
        SYMBOLS.push({
          ...m,
          x: sx,
          y: 625 + (m.dy || 0),
          phase: sx * 0.017 + 1.4,
        });
      }
    }

    // Ambient crisp binary micro-particles (inside contour)
    const DUST = [];
    for (let i = 0; i < 110; i++) {
      DUST.push({
        char: i % 2 === 0 ? "1" : "0",
        baseX: 140 + ((i * 197) % (W - 280)),
        baseY: 75 + ((i * 113) % (H - 130)),
        size: 13 + (i % 3) * 2,
        alpha: 0.22 + (i % 4) * 0.12,
        cycles: (i % 2) + 1,
        phase: i * 0.37,
      });
    }

    // Data rail pulse glints (seamless 3.0s loop)
    const RAIL_Y = [218, 250, 282, 314, 346];
    const WING_RAIL_Y = [112, 148, 184];

    function drawGlassErlenmeyer(s) {
      function traceFlask() {
        ctx.beginPath();
        ctx.moveTo(-s * 0.28, -s * 0.95);
        ctx.lineTo(s * 0.28, -s * 0.95);
        ctx.lineTo(s * 0.21, -s * 0.36);
        ctx.lineTo(s * 0.92, s * 0.78);
        ctx.quadraticCurveTo(s * 1.00, s * 0.96, s * 0.76, s * 0.96);
        ctx.lineTo(-s * 0.76, s * 0.96);
        ctx.quadraticCurveTo(-s * 1.00, s * 0.96, -s * 0.92, s * 0.78);
        ctx.lineTo(-s * 0.21, -s * 0.36);
        ctx.closePath();
      }

      // 3D bevel extrusion shadow
      ctx.save();
      ctx.translate(4, 3);
      traceFlask();
      ctx.fillStyle = "rgba(2, 110, 185, 0.45)";
      ctx.fill();
      ctx.restore();

      // Translucent glass body
      traceFlask();
      const glassGrad = ctx.createLinearGradient(-s, -s, s, s);
      glassGrad.addColorStop(0.0, "rgba(210, 248, 255, 0.38)");
      glassGrad.addColorStop(0.5, "rgba(14, 165, 233, 0.18)");
      glassGrad.addColorStop(1.0, "rgba(3, 105, 161, 0.35)");
      ctx.fillStyle = glassGrad;
      ctx.fill();

      // Glowing meniscus liquid inside lower 45%
      ctx.save();
      traceFlask();
      ctx.clip();
      const fluidGrad = ctx.createLinearGradient(0, s * 0.12, 0, s);
      fluidGrad.addColorStop(0.0, "rgba(125, 235, 255, 0.65)");
      fluidGrad.addColorStop(0.25, "rgba(14, 165, 233, 0.55)");
      fluidGrad.addColorStop(1.0, "rgba(2, 132, 199, 0.78)");
      ctx.fillStyle = fluidGrad;
      ctx.fillRect(-s * 1.1, s * 0.14, s * 2.2, s * 0.9);
      // Meniscus bright line
      ctx.strokeStyle = "rgba(224, 252, 255, 0.92)";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-s * 0.85, s * 0.15);
      ctx.lineTo(s * 0.85, s * 0.15);
      ctx.stroke();
      ctx.restore();

      // Outer neon rim glow
      traceFlask();
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 14;
      ctx.strokeStyle = "#00ecff";
      ctx.lineWidth = 4.0;
      ctx.stroke();

      // Crisp specular highlight rim
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(240, 253, 255, 0.95)";
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Lip collar highlight
      ctx.beginPath();
      ctx.moveTo(-s * 0.34, -s * 0.95);
      ctx.lineTo(s * 0.34, -s * 0.95);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.6;
      ctx.stroke();
    }

    function drawGlassRoundBulb(s) {
      function traceBulb() {
        ctx.beginPath();
        ctx.moveTo(-s * 0.24, -s * 1.25);
        ctx.lineTo(s * 0.24, -s * 1.25);
        ctx.lineTo(s * 0.22, -s * 0.65);
        ctx.arc(0, s * 0.15, s * 0.82, -Math.PI * 0.38, Math.PI * 1.38, false);
        ctx.closePath();
      }
      traceBulb();
      const grad = ctx.createRadialGradient(-s * 0.25, -s * 0.1, s * 0.1, 0, s * 0.15, s * 0.9);
      grad.addColorStop(0.0, "rgba(235, 252, 255, 0.78)");
      grad.addColorStop(0.55, "rgba(56, 189, 248, 0.42)");
      grad.addColorStop(1.0, "rgba(2, 132, 199, 0.55)");
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 12;
      ctx.strokeStyle = "#00ecff";
      ctx.lineWidth = 3.2;
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }

    function drawGlassDelta(s) {
      function traceOuterAndInner(offsetX, offsetY) {
        ctx.beginPath();
        // Outer triangle (CW)
        ctx.moveTo(offsetX, -s * 0.92 + offsetY);
        ctx.lineTo(s * 0.88 + offsetX, s * 0.78 + offsetY);
        ctx.lineTo(-s * 0.88 + offsetX, s * 0.78 + offsetY);
        ctx.closePath();
        // Inner cut triangle (CCW for even-odd fill)
        ctx.moveTo(offsetX, -s * 0.28 + offsetY);
        ctx.lineTo(-s * 0.38 + offsetX, s * 0.44 + offsetY);
        ctx.lineTo(s * 0.38 + offsetX, s * 0.44 + offsetY);
        ctx.closePath();
      }

      // 3D extruded bevel edge
      traceOuterAndInner(4, 3);
      ctx.fillStyle = "rgba(2, 132, 199, 0.72)";
      ctx.fill("evenodd");

      // Translucent glass face
      traceOuterAndInner(0, 0);
      const grad = ctx.createLinearGradient(-s, -s, s, s);
      grad.addColorStop(0.0, "rgba(232, 252, 255, 0.82)");
      grad.addColorStop(0.5, "rgba(56, 189, 248, 0.46)");
      grad.addColorStop(1.0, "rgba(3, 105, 161, 0.62)");
      ctx.fillStyle = grad;
      ctx.fill("evenodd");

      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 14;
      ctx.strokeStyle = "#00ecff";
      ctx.lineWidth = 3.8;
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(245, 254, 255, 0.95)";
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    function drawGlassVBar(s) {
      const w = s * 0.24;
      const h = s * 1.15;
      ctx.fillStyle = "rgba(2, 132, 199, 0.70)";
      ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w, h);

      const grad = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
      grad.addColorStop(0.0, "rgba(240, 253, 255, 0.85)");
      grad.addColorStop(0.5, "rgba(56, 189, 248, 0.50)");
      grad.addColorStop(1.0, "rgba(2, 132, 199, 0.65)");
      ctx.fillStyle = grad;
      ctx.fillRect(-w / 2, -h / 2, w, h);

      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 12;
      ctx.strokeStyle = "#00ecff";
      ctx.lineWidth = 3.0;
      ctx.strokeRect(-w / 2, -h / 2, w, h);

      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
      ctx.lineWidth = 1.4;
      ctx.strokeRect(-w / 2, -h / 2, w, h);
    }

    function drawGlassText(text, size, fontType) {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const fontFam =
        fontType === "serif"
          ? '"Cambria Math", "Times New Roman", "Georgia", serif'
          : '"Plus Jakarta Sans", "Montserrat", "Segoe UI", sans-serif';
      ctx.font = "900 " + size + "px " + fontFam;

      // 1. 3D beveled depth extrusion
      ctx.fillStyle = "rgba(2, 118, 192, 0.78)";
      ctx.fillText(text, 3.5, 3.0);

      // 2. Cyan neon halo
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 15;
      ctx.strokeStyle = "#00ecff";
      ctx.lineWidth = 4.2;
      ctx.strokeText(text, 0, 0);

      // 3. Translucent beveled glass fill
      const grad = ctx.createLinearGradient(0, -size * 0.5, 0, size * 0.5);
      grad.addColorStop(0.0, "rgba(240, 253, 255, 0.88)");
      grad.addColorStop(0.4, "rgba(165, 243, 252, 0.62)");
      grad.addColorStop(0.75, "rgba(14, 165, 233, 0.45)");
      grad.addColorStop(1.0, "rgba(3, 105, 161, 0.66)");
      ctx.shadowBlur = 0;
      ctx.fillStyle = grad;
      ctx.fillText(text, 0, 0);

      // 4. Crisp white top-left specular bevel edge
      ctx.strokeStyle = "rgba(245, 254, 255, 0.92)";
      ctx.lineWidth = 1.5;
      ctx.strokeText(text, 0, 0);
    }

    function drawSymbol(item, angle) {
      const floatY = Math.sin(angle + item.phase) * 3.5;
      const floatX = Math.cos(angle + item.phase * 1.3) * 1.5;

      ctx.save();
      ctx.translate(item.x + floatX, item.y + floatY);
      ctx.scale(X_COMP, 1.0); // Compensate 3.208x cylinder horizontal stretch
      ctx.rotate(item.rot || 0);

      if (item.kind === "flask") {
        drawGlassErlenmeyer(item.size);
      } else if (item.kind === "bulb") {
        drawGlassRoundBulb(item.size);
      } else if (item.kind === "delta") {
        drawGlassDelta(item.size);
      } else if (item.kind === "vbar") {
        drawGlassVBar(item.size);
      } else {
        drawGlassText(item.text, item.size, item.font);
      }
      ctx.restore();
    }

    window.renderFrame = function(progress) {
      const angle = progress * Math.PI * 2; // Exact 360 seamless loop
      ctx.clearRect(0, 0, W, H);

      const outerPts = getContourPoints(0);
      const innerClipPts = getContourPoints(24);

      // ── A. CLIPPED INTERIOR GRAPHICS (Strictly alpha=0 outside outerPts) ──
      ctx.save();
      tracePoints(ctx, innerClipPts);
      ctx.clip();

      // 1. Upper Luminous Cyan Ribbon Glow (Fades smoothly to alpha=0 above symbol zone!)
      // Covers raised wings down to y=395 and central bay from y=196 down to y=395
      const ribbonGrad = ctx.createLinearGradient(0, 35, 0, 410);
      ribbonGrad.addColorStop(0.0, "rgba(0, 215, 255, 0.42)");
      ribbonGrad.addColorStop(0.45, "rgba(14, 185, 248, 0.34)");
      ribbonGrad.addColorStop(0.78, "rgba(0, 195, 255, 0.24)");
      ribbonGrad.addColorStop(0.92, "rgba(0, 145, 235, 0.08)");
      ribbonGrad.addColorStop(1.0, "rgba(0, 100, 200, 0.0)");
      ctx.fillStyle = ribbonGrad;
      ctx.fillRect(0, 20, W, 395);

      // Soft horizontal accent band right behind the 5 continuous data rails (y=205..358)
      const railGlowGrad = ctx.createLinearGradient(0, 205, 0, 375);
      railGlowGrad.addColorStop(0.0, "rgba(56, 232, 255, 0.16)");
      railGlowGrad.addColorStop(0.5, "rgba(0, 224, 255, 0.22)");
      railGlowGrad.addColorStop(1.0, "rgba(0, 180, 255, 0.0)");
      ctx.fillStyle = railGlowGrad;
      ctx.fillRect(0, 205, W, 170);

      // 2. Raised-wing upper rails (follow wings above central bay step)
      ctx.save();
      for (const wy of WING_RAIL_Y) {
        ctx.shadowColor = "#00f0ff";
        ctx.shadowBlur = 9;
        ctx.strokeStyle = "rgba(0, 232, 255, 0.78)";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(40, wy);
        ctx.lineTo(WING_TOP_LEFT + 30, wy);
        ctx.moveTo(WING_TOP_RIGHT - 30, wy);
        ctx.lineTo(W - 40, wy);
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(224, 252, 255, 0.85)";
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(40, wy);
        ctx.lineTo(WING_TOP_LEFT + 30, wy);
        ctx.moveTo(WING_TOP_RIGHT - 30, wy);
        ctx.lineTo(W - 40, wy);
        ctx.stroke();
      }
      ctx.restore();

      // 3. 5 Continuous Horizontal Cyan/White Data Rails + Seamless Binary "0 1 0 1" Pulses
      const repeatW = 480;
      const binaryPattern = "0 1 0 1 1 0 0 1 0 1 1 0 1 0 0 1 0 1 1 0 0 1";
      ctx.save();
      for (let r = 0; r < RAIL_Y.length; r++) {
        const ry = RAIL_Y[r];

        // Neon cyan rail line + bright inner core
        ctx.shadowColor = "#00f0ff";
        ctx.shadowBlur = 10;
        ctx.strokeStyle = "rgba(0, 236, 255, 0.85)";
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(20, ry);
        ctx.lineTo(W - 20, ry);
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(232, 252, 255, 0.90)";
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(20, ry);
        ctx.lineTo(W - 20, ry);
        ctx.stroke();

        // Aspect-compensated binary digits streaming seamlessly along rails
        const dir = r % 2 === 0 ? 1 : -1;
        const speedMul = r % 2 === 0 ? 1 : 1; // 1 full repeatW per 3.0s loop
        const offsetX = (((progress * repeatW * dir * speedMul) % repeatW) + repeatW) % repeatW;

        ctx.save();
        ctx.font = '800 13px "Consolas", "Courier New", monospace';
        ctx.textBaseline = "bottom";
        ctx.fillStyle = "rgba(235, 253, 255, 0.92)";
        ctx.shadowColor = "#00f0ff";
        ctx.shadowBlur = 6;

        // Draw binary digits spaced evenly in 3D space (aspect-compensated!)
        const digitTokens = binaryPattern.split(" ");
        const stepX = 16; // in canvas px (~51px in 3D width -> readable crisp spacing)
        const patternWidth = digitTokens.length * stepX;
        const pOff = (((progress * patternWidth * dir) % patternWidth) + patternWidth) % patternWidth;

        for (let bx = -patternWidth + pOff; bx < W + patternWidth; bx += patternWidth) {
          for (let d = 0; d < digitTokens.length; d++) {
            const dx = bx + d * stepX;
            if (dx < 20 || dx > W - 20) continue;
            // Draw binary digit with 0.34 X-scale so 0 and 1 are crisp and round in 3D!
            ctx.save();
            ctx.translate(dx, ry - 4);
            ctx.scale(X_COMP, 1.0);
            ctx.fillText(digitTokens[d], 0, 0);
            ctx.restore();
          }
        }

        // Glowing pulse glints gliding smoothly on the rail
        const pulseSpan = 340;
        const pulseOff = (((progress * pulseSpan * dir + r * 85) % pulseSpan) + pulseSpan) % pulseSpan;
        for (let px = -pulseSpan + pulseOff; px < W + pulseSpan; px += pulseSpan) {
          ctx.fillStyle = "#ffffff";
          ctx.shadowColor = "#00f0ff";
          ctx.shadowBlur = 12;
          ctx.fillRect(px - 6, ry - 2.2, 12, 4.4);
        }
        ctx.restore();
      }

      // Scattered crisp binary digits inside raised wing cyan ribbon (x < 750 and x > 1550)
      ctx.font = '800 13px "Consolas", "Courier New", monospace';
      ctx.fillStyle = "rgba(232, 253, 255, 0.88)";
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 6;
      for (let i = 0; i < 48; i++) {
        const isRight = i >= 24;
        const localIdx = i % 24;
        const baseX = isRight
          ? 1620 + ((localIdx * 71) % 360)
          : 70 + ((localIdx * 73) % 620);
        const baseY = 82 + ((localIdx * 37) % 118);
        const shiftX = Math.sin(angle + localIdx * 0.7) * 8;
        ctx.save();
        ctx.translate(baseX + shiftX, baseY);
        ctx.scale(X_COMP, 1.0);
        ctx.fillText(localIdx % 2 === 0 ? "1" : "0", 0, 0);
        ctx.restore();
      }
      ctx.restore();

      // 4. Subtle Floating Binary Dust Micro-Sparkles (aspect-compensated)
      ctx.save();
      ctx.font = '700 13px "Consolas", "Courier New", monospace';
      for (const d of DUST) {
        const dX = d.baseX + Math.sin(angle * d.cycles + d.phase) * 7;
        const dY = d.baseY + Math.cos(angle * d.cycles + d.phase) * 6;
        ctx.save();
        ctx.translate(dX, dY);
        ctx.scale(X_COMP, 1.0);
        ctx.fillStyle = "rgba(186, 242, 255, " + d.alpha + ")";
        ctx.shadowColor = "#00e5ff";
        ctx.shadowBlur = 6;
        ctx.fillText(d.char, 0, 0);
        ctx.restore();
      }
      ctx.restore();

      // 5. 3D Glass Science & Math Symbols (Transparent background behind them!)
      for (const item of SYMBOLS) {
        drawSymbol(item, angle);
      }

      ctx.restore(); // End inner contour clip

      // ── B. MULTI-LAYER CONCENTRIC STEPPED NEON CONTOUR TUBES ──
      // Scale X by CYL_STRETCH during stroke so horizontal, diagonal & chevron lines
      // have identical physical 3D thickness and glow radius!
      ctx.save();
      ctx.scale(1 / CYL_STRETCH, 1.0);

      const tubeSpecs = [
        { inset: 0, glowColor: "#00f0ff", glowBlur: 15, glowWidth: 9.5, coreColor: "#ffffff", coreWidth: 3.4 },
        { inset: 14, glowColor: "#00e1ff", glowBlur: 12, glowWidth: 6.2, coreColor: "#dcfbff", coreWidth: 2.2 },
        { inset: 27, glowColor: "#00c8ff", glowBlur: 8, glowWidth: 4.8, coreColor: "#b8f4ff", coreWidth: 1.8 },
        { inset: 39, glowColor: "#00b0ff", glowBlur: 5, glowWidth: 3.0, coreColor: "rgba(165, 243, 252, 0.72)", coreWidth: 1.2 },
      ];

      for (const spec of tubeSpecs) {
        const pts = getContourPoints(spec.inset);
        tracePoints(ctx, pts, CYL_STRETCH);

        ctx.shadowColor = spec.glowColor;
        ctx.shadowBlur = spec.glowBlur;
        ctx.strokeStyle = spec.glowColor;
        ctx.lineWidth = spec.glowWidth;
        ctx.lineJoin = "miter";
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.strokeStyle = spec.coreColor;
        ctx.lineWidth = spec.coreWidth;
        ctx.stroke();
      }
      ctx.restore();
    };
  </script>
</body>
</html>
`;

  await page.setContent(html, { waitUntil: "domcontentloaded" });

  console.log(`Rendering ${TOTAL_FRAMES} transparent RGBA frames...`);
  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const progress = i / TOTAL_FRAMES;
    await page.evaluate((p) => window.renderFrame(p), progress);

    const frameFile = path.join(TEMP_FRAMES_DIR, `frame_${String(i).padStart(4, "0")}.png`);
    await page.screenshot({ path: frameFile, fullPage: false, omitBackground: true });
    if ((i + 1) % 15 === 0 || i === TOTAL_FRAMES - 1) {
      console.log(`  -> Rendered frame ${i + 1}/${TOTAL_FRAMES}`);
    }
  }

  await browser.close();
  console.log("Frames rendered! Encoding to transparent VP9 WebM (yuva420p) via ffmpeg...");

  const ffmpegCmd = `ffmpeg -y -framerate ${FPS} -i "${path.join(TEMP_FRAMES_DIR, "frame_%04d.png")}" -c:v libvpx-vp9 -b:v 2500k -pix_fmt yuva420p -auto-alt-ref 0 "${OUTPUT_VIDEO}"`;
  execSync(ffmpegCmd, { stdio: "inherit" });

  console.log(`\n✅ Generated: ${OUTPUT_VIDEO} (${(fs.statSync(OUTPUT_VIDEO).size / 1024).toFixed(1)} KB)`);

  // Clean temp frames and temp directory
  fs.rmSync(TEMP_FRAMES_DIR, { recursive: true, force: true });
}

generateMathScienceVideo().catch((err) => {
  console.error("Error generating math science video:", err);
  process.exit(1);
});
