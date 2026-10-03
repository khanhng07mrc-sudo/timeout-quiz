const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const opentype = require('opentype.js');

async function testSwooshStyles() {
  const fontBuffer = fs.readFileSync('scripts/Poppins-Bold.ttf');
  const font = opentype.parse(fontBuffer.buffer);

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

  const qDonutPath = `M 96 34 C 66.18 34 42 58.18 42 88 C 42 117.82 66.18 142 96 142 C 125.82 142 150 117.82 150 88 C 150 58.18 125.82 34 96 34 Z M 96 59 C 112.02 59 125 71.98 125 88 C 125 104.02 112.02 117 96 117 C 79.98 117 67 104.02 67 88 C 67 71.98 79.98 59 96 59 Z`;
  const qTailPath = `M 112.32 87.24 A 13 13 0 0 0 94.68 105.76 L 134.61 146.93 A 15 15 0 0 0 155.39 125.07 Z`;
  const qTailHl = `M 110.5 90.5 A 5 5 0 0 0 102.5 98.5 L 137.0 134.0 A 6 6 0 0 0 146.5 124.5 Z`;

  const textStartX = 158;
  const textBaselineY = 138;
  const fontSize = 94;
  const textInfo = getSafePath('uizorra', textStartX, textBaselineY, fontSize);

  const canvasWidth = Math.ceil(textInfo.endX + 30); // ~695
  const canvasHeight = 210;

  const swStartX = 24;
  const swEndX = canvasWidth - 24;
  const swMidX = Math.round((swStartX + swEndX) / 2);

  // Common Header defs
  const commonDefs = `
    <linearGradient id="qRingGrad" x1="42" y1="34" x2="150" y2="142" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#d8b4fe" />
      <stop offset="16%" stop-color="#c084fc" />
      <stop offset="42%" stop-color="#a855f7" />
      <stop offset="68%" stop-color="#38bdf8" />
      <stop offset="88%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#00f2fe" />
    </linearGradient>

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

    <linearGradient id="textGrad" x1="${textStartX}" y1="80" x2="${textInfo.endX}" y2="138" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#00f2fe" />
      <stop offset="18%" stop-color="#38bdf8" />
      <stop offset="48%" stop-color="#a855f7" />
      <stop offset="80%" stop-color="#c084fc" />
      <stop offset="100%" stop-color="#e879f9" />
    </linearGradient>

    <linearGradient id="bevelGrad" x1="${textStartX}" y1="138" x2="${textInfo.endX}" y2="138" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0369a1" />
      <stop offset="45%" stop-color="#4c1d95" />
      <stop offset="100%" stop-color="#3b0764" />
    </linearGradient>

    <linearGradient id="swooshGrad" x1="${swStartX}" y1="165" x2="${swEndX}" y2="165" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#c084fc" />
      <stop offset="25%" stop-color="#a855f7" />
      <stop offset="65%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#00f2fe" />
    </linearGradient>

    <linearGradient id="swooshCoreGrad" x1="${swStartX}" y1="165" x2="${swEndX}" y2="165" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#f5d0fe" stop-opacity="0.7" />
      <stop offset="25%" stop-color="#ffffff" stop-opacity="0.9" />
      <stop offset="65%" stop-color="#ffffff" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#e0f2fe" stop-opacity="0.7" />
    </linearGradient>
  `;

  const commonQAndText = `
    <!-- CHỮ Q: 100% CRISP VECTOR, ZERO BLUR -->
    <g id="letter-Q">
      <path fill-rule="evenodd" clip-rule="evenodd" d="${qDonutPath}" transform="translate(0, 3.5)" fill="#2e1065" />
      <path fill-rule="evenodd" clip-rule="evenodd" d="${qDonutPath}" fill="url(#qRingGrad)" />
      <path d="${qTailPath}" transform="translate(0, 3.5)" fill="#0f172a" opacity="0.5" />
      <path d="${qTailPath}" fill="url(#qTailGrad)" />
      <path d="${qTailHl}" fill="url(#qTailHl)" />
    </g>

    <!-- TEXT "uizorra": CRISP 3D BEVEL & SPECTRUM GRADIENT -->
    <g id="text-uizorra">
      <path d="${textInfo.pathData}" transform="translate(0, 3.5)" stroke="url(#bevelGrad)" stroke-width="5" stroke-linejoin="round" fill="url(#bevelGrad)" />
      <path d="${textInfo.pathData}" fill="url(#textGrad)" />
      <path d="${textInfo.pathData}" stroke="#ffffff" stroke-width="0.8" stroke-opacity="0.85" fill="none" />
    </g>
  `;

  // ── VARIANT 1: Sleek Upward Horizon Arc (Like reference, tapered tips) ────
  // Curving gently upward: ends at y=176, top peak at y=166, bottom peak at y=172
  const v1Ribbon = `M ${swStartX} 176 Q ${swMidX} 165 ${swEndX} 176 Q ${swMidX} 171 ${swStartX} 176 Z`;
  const v1Core = `M ${swStartX + 12} 176 Q ${swMidX} 168 ${swEndX - 12} 176`;

  const svgV1 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasWidth} ${canvasHeight}" width="${canvasWidth}" height="${canvasHeight}" fill="none">
    <defs>${commonDefs}</defs>
    <g id="swoosh-horizon-arc">
      <path d="${v1Ribbon}" fill="url(#swooshGrad)" />
      <path d="${v1Core}" stroke="url(#swooshCoreGrad)" stroke-width="1.8" stroke-linecap="round" />
    </g>
    ${commonQAndText}
  </svg>`;

  // ── VARIANT 2: Sleek Foundation Cradle (Curving gently downward) ───────────
  // Ends at y=164, lowest point at y=174
  const v2Ribbon = `M ${swStartX} 165 Q ${swMidX} 175 ${swEndX} 165 Q ${swMidX} 171 ${swStartX} 165 Z`;
  const v2Core = `M ${swStartX + 12} 165 Q ${swMidX} 173 ${swEndX - 12} 165`;

  const svgV2 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasWidth} ${canvasHeight}" width="${canvasWidth}" height="${canvasHeight}" fill="none">
    <defs>${commonDefs}</defs>
    <g id="swoosh-cradle">
      <path d="${v2Ribbon}" fill="url(#swooshGrad)" />
      <path d="${v2Core}" stroke="url(#swooshCoreGrad)" stroke-width="1.8" stroke-linecap="round" />
    </g>
    ${commonQAndText}
  </svg>`;

  // ── VARIANT 3: Modern Straight Tapered Horizon Beam ───────────────────────
  // Modern clean laser line from x=swStartX to swEndX, thicker in center (h=5px), tapering to sharp needle points
  const v3Ribbon = `M ${swStartX} 168 C ${swStartX + 80} 166, ${swMidX - 60} 165.5, ${swMidX} 165.5 C ${swMidX + 60} 165.5, ${swEndX - 80} 166, ${swEndX} 168 C ${swEndX - 80} 170, ${swMidX + 60} 170.5, ${swMidX} 170.5 C ${swMidX - 60} 170.5, ${swStartX + 80} 170, ${swStartX} 168 Z`;
  const v3Core = `M ${swStartX + 16} 168 L ${swEndX - 16} 168`;

  const svgV3 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasWidth} ${canvasHeight}" width="${canvasWidth}" height="${canvasHeight}" fill="none">
    <defs>${commonDefs}</defs>
    <g id="swoosh-straight-beam">
      <path d="${v3Ribbon}" fill="url(#swooshGrad)" />
      <path d="${v3Core}" stroke="url(#swooshCoreGrad)" stroke-width="1.6" stroke-linecap="round" />
    </g>
    ${commonQAndText}
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

  await renderDark(svgV1, 'quizorra_v1_horizon_arc.png');
  await renderDark(svgV2, 'quizorra_v2_cradle_arc.png');
  await renderDark(svgV3, 'quizorra_v3_straight_beam.png');

  console.log('✓ Successfully rendered v1, v2, v3 swoosh test images!');
}

testSwooshStyles().catch(console.error);
