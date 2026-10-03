const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const opentype = require('opentype.js');

async function testSnug() {
  const font = opentype.parse(await (await fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Bold.ttf')).arrayBuffer());
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

  // Q: Center (96, 88), Outer R=54, Inner r=29
  // Outer circle: Left 42, Right 150, Top 34, Bottom 142
  const qDonutPath = `M 96 34 C 66.18 34 42 58.18 42 88 C 42 117.82 66.18 142 96 142 C 125.82 142 150 117.82 150 88 C 150 58.18 125.82 34 96 34 Z M 96 59 C 112.02 59 125 71.98 125 88 C 125 104.02 112.02 117 96 117 C 79.98 117 67 104.02 67 88 C 67 71.98 79.98 59 96 59 Z`;

  // Tail: starts at (110, 97) inside hole, extends to (150, 138)
  const qTailPath = `M 112.32 87.24 A 13 13 0 0 0 94.68 105.76 L 134.61 146.93 A 15 15 0 0 0 155.39 125.07 Z`;
  const qTailHl = `M 110.5 90.5 A 5 5 0 0 0 102.5 98.5 L 137.0 134.0 A 6 6 0 0 0 146.5 124.5 Z`;

  // Super snug kerning: Q right edge is 150. Start text at 158 (only 8px gap!)
  const textStartX = 158;
  const textBaselineY = 138;
  const fontSize = 94;
  const textInfo = getSafePath('uizorra', textStartX, textBaselineY, fontSize);

  const canvasWidth = Math.ceil(textInfo.endX + 30); // ~695
  const canvasHeight = 215;

  const swStartX = 18;
  const swEndX = canvasWidth - 18;
  const swMidX = Math.round((swStartX + swEndX) / 2);
  const swTopY = 169;
  const swBotY = 175;
  const swTipY = 180;

  const singleSwooshRibbon = `M ${swStartX} ${swTipY} Q ${swMidX} ${swTopY} ${swEndX} ${swTipY} Q ${swMidX} ${swBotY} ${swStartX} ${swTipY} Z`;
  const singleSwooshCore = `M ${swStartX + 10} ${swTipY} Q ${swMidX} ${(swTopY + swBotY) / 2} ${swEndX - 10} ${swTipY}`;

  // ═══════════════════════════════════════════════════════════════════════════
  // VERSION A: PERFECT HARMONY (Cyan -> Purple Spectrum with Luminous Core)
  // Text seamlessly continues Q's electric cyan and blends into neon purple
  // ═══════════════════════════════════════════════════════════════════════════
  const svgA = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasWidth} ${canvasHeight}" width="${canvasWidth}" height="${canvasHeight}" fill="none">
  <defs>
    <!-- Q Ring Gradient: Seamless Neon Purple to Electric Cyan -->
    <linearGradient id="qRingA" x1="42" y1="34" x2="150" y2="142" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#d8b4fe" />
      <stop offset="16%" stop-color="#c084fc" />
      <stop offset="42%" stop-color="#a855f7" />
      <stop offset="68%" stop-color="#38bdf8" />
      <stop offset="88%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#00f2fe" />
    </linearGradient>

    <!-- Q Tail Gradient: Electric Cyan Depth -->
    <linearGradient id="qTailA" x1="96" y1="90" x2="155" y2="146" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#7dd3fc" />
      <stop offset="30%" stop-color="#38bdf8" />
      <stop offset="70%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>

    <linearGradient id="qTailHlA" x1="104" y1="90" x2="144" y2="130" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
      <stop offset="45%" stop-color="#e0f2fe" stop-opacity="0.65" />
      <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.1" />
    </linearGradient>

    <!-- Continuous Brand Spectrum Text Gradient: Cyan flowing into Purple -->
    <linearGradient id="textGradA" x1="${textStartX}" y1="80" x2="${textInfo.endX}" y2="138" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#00f2fe" />
      <stop offset="18%" stop-color="#38bdf8" />
      <stop offset="48%" stop-color="#a855f7" />
      <stop offset="80%" stop-color="#c084fc" />
      <stop offset="100%" stop-color="#e879f9" />
    </linearGradient>

    <!-- Bevel Gradient: Cyan-to-Purple deep shadow base -->
    <linearGradient id="bevelGradA" x1="${textStartX}" y1="138" x2="${textInfo.endX}" y2="138" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0369a1" />
      <stop offset="45%" stop-color="#4c1d95" />
      <stop offset="100%" stop-color="#3b0764" />
    </linearGradient>

    <!-- Single Continuous Swoosh Gradient -->
    <linearGradient id="swooshGradA" x1="${swStartX}" y1="${swTipY}" x2="${swEndX}" y2="${swTipY}" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#c084fc" stop-opacity="0.95" />
      <stop offset="25%" stop-color="#a855f7" />
      <stop offset="65%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.95" />
    </linearGradient>

    <!-- Soft Neon Glow Filter -->
    <filter id="glowA" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="3" result="glow1" />
      <feGaussianBlur stdDeviation="7" result="glow2" />
      <feMerge>
        <feMergeNode in="glow2" />
        <feMergeNode in="glow1" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <filter id="textShadowA" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="0" flood-color="#1e1b4b" flood-opacity="1" />
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#7c3aed" flood-opacity="0.5" />
    </filter>

    <filter id="haloA" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="18" result="halo" />
    </filter>
  </defs>

  <circle cx="96" cy="88" r="62" fill="url(#qRingA)" opacity="0.25" filter="url(#haloA)" />

  <!-- Single Continuous Swoosh across whole logo -->
  <g filter="url(#glowA)">
    <path d="${singleSwooshRibbon}" fill="url(#swooshGradA)" opacity="0.95" />
    <path d="${singleSwooshCore}" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity="0.85" />
  </g>

  <!-- Chữ Q (100% Unclipped, 360° Circular Donut) -->
  <g filter="url(#glowA)">
    <path fill-rule="evenodd" clip-rule="evenodd" d="${qDonutPath}" fill="url(#qRingA)" />
    <path d="${qTailPath}" fill="url(#qTailA)" />
    <path d="${qTailHl}" fill="url(#qTailHlA)" />
  </g>

  <!-- Text "uizorra" (Snug Kerning, Brand Gradient, 3D Depth) -->
  <g filter="url(#textShadowA)">
    <!-- 3D Bevel Base -->
    <path
      d="${textInfo.pathData}"
      transform="translate(0, 3.5)"
      stroke="url(#bevelGradA)"
      stroke-width="5"
      stroke-linejoin="round"
      fill="url(#bevelGradA)"
    />
    <!-- Gradient Face -->
    <path
      d="${textInfo.pathData}"
      fill="url(#textGradA)"
    />
    <!-- Luminous White Highlight Rim -->
    <path
      d="${textInfo.pathData}"
      stroke="#ffffff"
      stroke-width="0.8"
      stroke-opacity="0.75"
      fill="none"
    />
  </g>
</svg>`;

  // ═══════════════════════════════════════════════════════════════════════════
  // VERSION B: LUMINOUS ICE-CYAN TO PURPLE (Crisp High-Contrast Gaming)
  // Text starts in vibrant Electric Cyan (matching Q's tail), transitioning to Purple,
  // with a brilliant white core highlight for maximum legibility!
  // ═══════════════════════════════════════════════════════════════════════════
  const svgB = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasWidth} ${canvasHeight}" width="${canvasWidth}" height="${canvasHeight}" fill="none">
  <defs>
    <linearGradient id="qRingB" x1="42" y1="34" x2="150" y2="142" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#d8b4fe" />
      <stop offset="16%" stop-color="#c084fc" />
      <stop offset="42%" stop-color="#a855f7" />
      <stop offset="68%" stop-color="#38bdf8" />
      <stop offset="88%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#00f2fe" />
    </linearGradient>

    <linearGradient id="qTailB" x1="96" y1="90" x2="155" y2="146" gradientUnits="userSpaceOnUse">
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

    <!-- Text Face: White Top to Cyan Bottom Gradient -->
    <linearGradient id="textGradB" x1="0" y1="75" x2="0" y2="138" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="40%" stop-color="#f0fdfa" />
      <stop offset="100%" stop-color="#38bdf8" />
    </linearGradient>

    <!-- Bevel: Deep Purple with Neon Cyan edge -->
    <linearGradient id="bevelGradB" x1="0" y1="138" x2="0" y2="145" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="100%" stop-color="#4c1d95" />
    </linearGradient>

    <linearGradient id="swooshGradB" x1="${swStartX}" y1="${swTipY}" x2="${swEndX}" y2="${swTipY}" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#c084fc" stop-opacity="0.95" />
      <stop offset="25%" stop-color="#a855f7" />
      <stop offset="65%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.95" />
    </linearGradient>

    <filter id="glowB" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="3" result="glow1" />
      <feGaussianBlur stdDeviation="7" result="glow2" />
      <feMerge>
        <feMergeNode in="glow2" />
        <feMergeNode in="glow1" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <filter id="textShadowB" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="0" flood-color="#0c4a6e" flood-opacity="1" />
      <feDropShadow dx="0" dy="5" stdDeviation="8" flood-color="#06b6d4" flood-opacity="0.5" />
    </filter>

    <filter id="haloB" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="18" result="halo" />
    </filter>
  </defs>

  <circle cx="96" cy="88" r="62" fill="url(#qRingB)" opacity="0.25" filter="url(#haloB)" />

  <!-- Single Continuous Swoosh across whole logo -->
  <g filter="url(#glowB)">
    <path d="${singleSwooshRibbon}" fill="url(#swooshGradB)" opacity="0.95" />
    <path d="${singleSwooshCore}" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity="0.85" />
  </g>

  <!-- Chữ Q -->
  <g filter="url(#glowB)">
    <path fill-rule="evenodd" clip-rule="evenodd" d="${qDonutPath}" fill="url(#qRingB)" />
    <path d="${qTailPath}" fill="url(#qTailGradB)" />
    <path d="${qTailHl}" fill="url(#qTailHlB)" />
  </g>

  <!-- Text "uizorra" -->
  <g filter="url(#textShadowB)">
    <path
      d="${textInfo.pathData}"
      transform="translate(0, 3.5)"
      stroke="url(#bevelGradB)"
      stroke-width="5"
      stroke-linejoin="round"
      fill="url(#bevelGradB)"
    />
    <path
      d="${textInfo.pathData}"
      fill="url(#textGradB)"
    />
    <path
      d="${textInfo.pathData}"
      stroke="#ffffff"
      stroke-width="0.8"
      stroke-opacity="0.8"
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

  await renderDark(svgA, 'quizorra_snug_spectrum.png');
  await renderDark(svgB, 'quizorra_snug_ice_cyan.png');

  console.log('✓ Successfully rendered quizorra_snug_spectrum.png and quizorra_snug_ice_cyan.png!');
}

testSnug().catch(console.error);
