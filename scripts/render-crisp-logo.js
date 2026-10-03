const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const opentype = require('opentype.js');

async function renderCrispLogo() {
  console.log('Loading Poppins-Bold...');
  const fontUrl = 'https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Bold.ttf';
  const fontRes = await fetch(fontUrl);
  const fontBuffer = await fontRes.arrayBuffer();
  const font = opentype.parse(fontBuffer);

  const artifactDir = 'C:\\Users\\khanh\\.gemini\\antigravity\\brain\\b7084729-0490-403c-a9fa-396f28123f8f';

  function getSafePath(text, startX, baselineY, size) {
    let curX = startX;
    let pathData = '';
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const glyph = font.charToGlyph(char);
      const glyphPath = glyph.getPath(curX, baselineY, size);
      glyphPath.commands.forEach(cmd => {
        if (Number.isNaN(cmd.x)) cmd.x = curX + 3;
        if (Number.isNaN(cmd.y)) cmd.y = baselineY;
      });
      pathData += ' ' + glyphPath.toPathData(2);
      const advance = (glyph.advanceWidth / font.unitsPerEm) * size;
      curX += advance;
    }
    pathData = pathData.replace(/NaN/g, '294');
    return { pathData, totalWidth: curX - startX, endX: curX };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHỮ Q: CRISP RAZOR-SHARP VECTOR (ZERO BLUR VIỀN!)
  // Center (96, 88), Outer R=54, Inner r=29
  // ═══════════════════════════════════════════════════════════════════════════
  const qDonutPath = `M 96 34 C 66.18 34 42 58.18 42 88 C 42 117.82 66.18 142 96 142 C 125.82 142 150 117.82 150 88 C 150 58.18 125.82 34 96 34 Z M 96 59 C 112.02 59 125 71.98 125 88 C 125 104.02 112.02 117 96 117 C 79.98 117 67 104.02 67 88 C 67 71.98 79.98 59 96 59 Z`;

  // 3D Capsule Tail: starts in hole at (110, 97), ends at (150, 138)
  const qTailPath = `M 112.32 87.24 A 13 13 0 0 0 94.68 105.76 L 134.61 146.93 A 15 15 0 0 0 155.39 125.07 Z`;
  const qTailHl = `M 110.5 90.5 A 5 5 0 0 0 102.5 98.5 L 137.0 134.0 A 6 6 0 0 0 146.5 124.5 Z`;

  // ═══════════════════════════════════════════════════════════════════════════
  // TEXT "uizorra": CRISP VECTOR, TIGHT KERNING, COLOR-HARMONIZED
  // ═══════════════════════════════════════════════════════════════════════════
  const textStartX = 158;
  const textBaselineY = 138;
  const fontSize = 94;
  const textInfo = getSafePath('uizorra', textStartX, textBaselineY, fontSize);

  const canvasWidth = Math.ceil(textInfo.endX + 30); // ~695
  const canvasHeight = 215;

  // Single continuous swoosh running across the WHOLE logo (CRISP, NO BLUR)
  const swStartX = 18;
  const swEndX = canvasWidth - 18;
  const swMidX = Math.round((swStartX + swEndX) / 2);
  const swTopY = 169;
  const swBotY = 175;
  const swTipY = 180;

  const singleSwooshRibbon = `M ${swStartX} ${swTipY} Q ${swMidX} ${swTopY} ${swEndX} ${swTipY} Q ${swMidX} ${swBotY} ${swStartX} ${swTipY} Z`;
  const singleSwooshCore = `M ${swStartX + 10} ${swTipY} Q ${swMidX} ${(swTopY + swBotY) / 2} ${swEndX - 10} ${swTipY}`;

  // ─────────────────────────────────────────────────────────────────────────
  // OPTION A: PURE CRISP VECTOR WITH BRAND SPECTRUM GRADIENT
  // (Zero blur on Q, zero blur on text, sharp 3D bevels, 100% matched clarity)
  // ─────────────────────────────────────────────────────────────────────────
  const svgCrispSpectrum = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasWidth} ${canvasHeight}" width="${canvasWidth}" height="${canvasHeight}" fill="none">
  <defs>
    <!-- Q Ring Gradient: Seamless Neon Purple to Electric Cyan -->
    <linearGradient id="qRingGrad" x1="42" y1="34" x2="150" y2="142" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#d8b4fe" />
      <stop offset="16%" stop-color="#c084fc" />
      <stop offset="42%" stop-color="#a855f7" />
      <stop offset="68%" stop-color="#38bdf8" />
      <stop offset="88%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#00f2fe" />
    </linearGradient>

    <!-- Q Tail Gradient: Electric Cyan Depth -->
    <linearGradient id="qTailGrad" x1="96" y1="90" x2="155" y2="146" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#7dd3fc" />
      <stop offset="30%" stop-color="#38bdf8" />
      <stop offset="70%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>

    <linearGradient id="qTailHl" x1="104" y1="90" x2="144" y2="130" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
      <stop offset="45%" stop-color="#e0f2fe" stop-opacity="0.65" />
      <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.1" />
    </linearGradient>

    <!-- Continuous Brand Spectrum Text Gradient: Cyan flowing into Purple -->
    <linearGradient id="textGrad" x1="${textStartX}" y1="80" x2="${textInfo.endX}" y2="138" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#00f2fe" />
      <stop offset="18%" stop-color="#38bdf8" />
      <stop offset="48%" stop-color="#a855f7" />
      <stop offset="80%" stop-color="#c084fc" />
      <stop offset="100%" stop-color="#e879f9" />
    </linearGradient>

    <!-- Bevel Gradient: Cyan-to-Purple deep 3D base -->
    <linearGradient id="bevelGrad" x1="${textStartX}" y1="138" x2="${textInfo.endX}" y2="138" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0369a1" />
      <stop offset="45%" stop-color="#4c1d95" />
      <stop offset="100%" stop-color="#3b0764" />
    </linearGradient>

    <!-- Single Continuous Swoosh Gradient across ENTIRE logo -->
    <linearGradient id="swooshGrad" x1="${swStartX}" y1="${swTipY}" x2="${swEndX}" y2="${swTipY}" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#c084fc" stop-opacity="0.95" />
      <stop offset="25%" stop-color="#a855f7" />
      <stop offset="65%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.95" />
    </linearGradient>
  </defs>

  <!-- 1. SINGLE UNBROKEN HORIZON SWOOSH (Runs across the WHOLE logo, CRISP) -->
  <g>
    <path d="${singleSwooshRibbon}" fill="url(#swooshGrad)" />
    <path d="${singleSwooshCore}" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity="0.9" />
  </g>

  <!-- 2. CHỮ Q: 100% CRISP VECTOR, ZERO BLUR VIỀN -->
  <g>
    <!-- Crisp 3D Bevel Shadow behind Q (sharp 3D drop matching text bevel) -->
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="${qDonutPath}"
      transform="translate(0, 3.5)"
      fill="#2e1065"
    />
    <!-- Crisp Q Ring (Full unclipped 360° circular donut) -->
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="${qDonutPath}"
      fill="url(#qRingGrad)"
    />
    <!-- 3D Tail Shadow -->
    <path
      d="${qTailPath}"
      transform="translate(0, 3.5)"
      fill="#0f172a"
      opacity="0.5"
    />
    <!-- 3D Tail -->
    <path
      d="${qTailPath}"
      fill="url(#qTailGrad)"
    />
    <!-- Gloss Sheen -->
    <path
      d="${qTailHl}"
      fill="url(#qTailHl)"
    />
  </g>

  <!-- 3. TEXT: "uizorra" (NO WHITE Q!), CRISP 3D BEVEL & MATCHING GRADIENT -->
  <g>
    <!-- Crisp 3D Bevel Base (sharp, non-blurred vector depth) -->
    <path
      d="${textInfo.pathData}"
      transform="translate(0, 3.5)"
      stroke="url(#bevelGrad)"
      stroke-width="5"
      stroke-linejoin="round"
      fill="url(#bevelGrad)"
    />
    <!-- Crisp Gradient Face -->
    <path
      d="${textInfo.pathData}"
      fill="url(#textGrad)"
    />
    <!-- Crisp White Top Highlight Edge -->
    <path
      d="${textInfo.pathData}"
      stroke="#ffffff"
      stroke-width="0.8"
      stroke-opacity="0.85"
      fill="none"
    />
  </g>
</svg>`;

  // ─────────────────────────────────────────────────────────────────────────
  // OPTION B: CRISP ICE-WHITE / CYAN VERSION (WHITE FACE WITH CYAN/PURPLE GLOW ACCENTS)
  // Text face is crisp pure white (#ffffff) with cyan/purple 3D bevel and cyan outline,
  // while Q has crisp matching 3D depth and zero blur viền!
  // ─────────────────────────────────────────────────────────────────────────
  const svgCrispWhite = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasWidth} ${canvasHeight}" width="${canvasWidth}" height="${canvasHeight}" fill="none">
  <defs>
    <linearGradient id="qRingGradB" x1="42" y1="34" x2="150" y2="142" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#d8b4fe" />
      <stop offset="16%" stop-color="#c084fc" />
      <stop offset="42%" stop-color="#a855f7" />
      <stop offset="68%" stop-color="#38bdf8" />
      <stop offset="88%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#00f2fe" />
    </linearGradient>

    <linearGradient id="qTailGradB" x1="96" y1="90" x2="155" y2="146" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#7dd3fc" />
      <stop offset="30%" stop-color="#38bdf8" />
      <stop offset="70%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>

    <linearGradient id="qTailHlB" x1="104" y1="90" x2="144" y2="130" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
      <stop offset="45%" stop-color="#e0f2fe" stop-opacity="0.65" />
      <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.1" />
    </linearGradient>

    <!-- Bevel Gradient: Cyan to Purple -->
    <linearGradient id="bevelGradB" x1="${textStartX}" y1="138" x2="${textInfo.endX}" y2="138" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="40%" stop-color="#7c3aed" />
      <stop offset="100%" stop-color="#581c87" />
    </linearGradient>

    <linearGradient id="swooshGradB" x1="${swStartX}" y1="${swTipY}" x2="${swEndX}" y2="${swTipY}" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#c084fc" stop-opacity="0.95" />
      <stop offset="25%" stop-color="#a855f7" />
      <stop offset="65%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.95" />
    </linearGradient>
  </defs>

  <!-- Swoosh -->
  <g>
    <path d="${singleSwooshRibbon}" fill="url(#swooshGradB)" />
    <path d="${singleSwooshCore}" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity="0.9" />
  </g>

  <!-- Q Letterform (CRISP, ZERO BLUR) -->
  <g>
    <path fill-rule="evenodd" clip-rule="evenodd" d="${qDonutPath}" transform="translate(0, 3.5)" fill="#2e1065" />
    <path fill-rule="evenodd" clip-rule="evenodd" d="${qDonutPath}" fill="url(#qRingGradB)" />
    <path d="${qTailPath}" transform="translate(0, 3.5)" fill="#0f172a" opacity="0.5" />
    <path d="${qTailPath}" fill="url(#qTailGradB)" />
    <path d="${qTailHl}" fill="url(#qTailHlB)" />
  </g>

  <!-- Text uizorra (Crisp White Face with Cyan-Purple 3D Bevel) -->
  <g>
    <!-- 3D Bevel Base -->
    <path
      d="${textInfo.pathData}"
      transform="translate(0, 3.5)"
      stroke="url(#bevelGradB)"
      stroke-width="5"
      stroke-linejoin="round"
      fill="url(#bevelGradB)"
    />
    <!-- Crisp White Face -->
    <path
      d="${textInfo.pathData}"
      fill="#ffffff"
    />
    <!-- Cyan Inner Stroke Accent tying text to Q -->
    <path
      d="${textInfo.pathData}"
      stroke="#38bdf8"
      stroke-width="0.8"
      stroke-opacity="0.6"
      fill="none"
    />
  </g>
</svg>`;

  async function renderDark(svg, name) {
    const pngBuf = await sharp(Buffer.from(svg), { density: 150 }).png().toBuffer();
    const meta = await sharp(pngBuf).metadata();
    const darkBuf = await sharp({
      create: {
        width: meta.width,
        height: meta.height,
        channels: 4,
        background: { r: 11, g: 12, b: 22, alpha: 1 }
      }
    })
      .composite([{ input: pngBuf, blend: 'over' }])
      .png()
      .toBuffer();
    fs.writeFileSync(path.join(artifactDir, name), darkBuf);
  }

  await renderDark(svgCrispSpectrum, 'quizorra_crisp_spectrum.png');
  await renderDark(svgCrispWhite, 'quizorra_crisp_white.png');

  console.log('✓ Successfully rendered quizorra_crisp_spectrum.png and quizorra_crisp_white.png!');
}

renderCrispLogo().catch(console.error);
