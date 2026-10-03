const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const opentype = require('opentype.js');

async function testHarmonious() {
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
  // Q GEOMETRY: Center (100, 88), Outer R=56, Inner r=30
  // Rightmost edge of ring is at x=156.
  // ═══════════════════════════════════════════════════════════════════════════
  const qDonutPath = `M 100 32 C 69.07 32 44 57.07 44 88 C 44 118.93 69.07 144 100 144 C 130.93 144 156 118.93 156 88 C 156 57.07 130.93 32 100 32 Z M 100 58 C 116.57 58 130 71.43 130 88 C 130 104.57 116.57 118 100 118 C 83.43 118 70 104.57 70 88 C 70 71.43 83.43 58 100 58 Z`;

  // Organic curved tail: starts in hole, sweeps down-right, tucks neatly under right edge
  // Ends at (152, 142), so it doesn't push the text too far away!
  const qTailPath = `M 116.32 88.24 A 13.5 13.5 0 0 0 97.68 107.76 L 138.61 149.93 A 15.5 15.5 0 0 0 160.39 127.07 Z`;
  const qTailHl = `M 114.5 91.5 A 5.5 5.5 0 0 0 106.0 100.0 L 141.0 136.5 A 6.5 6.5 0 0 0 151.0 126.5 Z`;

  // TIGHT KERNING: start text at x = 168 (just 12px from Q's right edge at 156!)
  const textStartX = 168;
  const textBaselineY = 140;
  const fontSize = 96;
  const hWord = 'uizorra';

  const textInfo = getSafePath(hWord, textStartX, textBaselineY, fontSize);
  const canvasWidth = Math.ceil(textInfo.endX + 35); // ~725
  const canvasHeight = 220;

  // Single continuous swoosh running across the whole logo
  const swStartX = 20;
  const swEndX = canvasWidth - 20;
  const swMidX = Math.round((swStartX + swEndX) / 2);
  const swTopY = 171;
  const swBotY = 177;
  const swTipY = 182;

  const singleSwooshRibbon = `M ${swStartX} ${swTipY} Q ${swMidX} ${swTopY} ${swEndX} ${swTipY} Q ${swMidX} ${swBotY} ${swStartX} ${swTipY} Z`;
  const singleSwooshCore = `M ${swStartX + 12} ${swTipY} Q ${swMidX} ${(swTopY + swBotY) / 2} ${swEndX - 12} ${swTipY}`;

  // ─────────────────────────────────────────────────────────────────────────
  // VARIANT 1: CONTINUOUS BRAND SPECTRUM (Cyan to Purple Gradient on Text)
  // Text flows from Cyan (#00f2fe / #38bdf8) into Neon Purple (#c084fc / #e879f9)
  // Matching the Q's exact gradient flow!
  // ─────────────────────────────────────────────────────────────────────────
  const svgVar1 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasWidth} ${canvasHeight}" width="${canvasWidth}" height="${canvasHeight}" fill="none">
  <defs>
    <linearGradient id="qRingGrad" x1="44" y1="32" x2="156" y2="144" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#d8b4fe" />
      <stop offset="16%" stop-color="#c084fc" />
      <stop offset="42%" stop-color="#a855f7" />
      <stop offset="68%" stop-color="#38bdf8" />
      <stop offset="88%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#00f2fe" />
    </linearGradient>

    <linearGradient id="qTailGrad" x1="100" y1="92" x2="160" y2="150" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#7dd3fc" />
      <stop offset="30%" stop-color="#38bdf8" />
      <stop offset="70%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>

    <linearGradient id="qTailHl" x1="108" y1="92" x2="148" y2="132" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
      <stop offset="45%" stop-color="#e0f2fe" stop-opacity="0.65" />
      <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.1" />
    </linearGradient>

    <!-- Text Gradient: Cyan flowing into Vivid Purple/Pink -->
    <linearGradient id="textGrad1" x1="${textStartX}" y1="80" x2="${textInfo.endX}" y2="140" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#00f2fe" />
      <stop offset="18%" stop-color="#38bdf8" />
      <stop offset="45%" stop-color="#818cf8" />
      <stop offset="75%" stop-color="#c084fc" />
      <stop offset="100%" stop-color="#f472b6" />
    </linearGradient>

    <!-- Swoosh Gradient -->
    <linearGradient id="singleSwooshGrad" x1="${swStartX}" y1="${swTipY}" x2="${swEndX}" y2="${swTipY}" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#c084fc" stop-opacity="0.95" />
      <stop offset="25%" stop-color="#a855f7" />
      <stop offset="65%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.95" />
    </linearGradient>

    <filter id="neonGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="3" result="glow1" />
      <feGaussianBlur stdDeviation="7" result="glow2" />
      <feMerge>
        <feMergeNode in="glow2" />
        <feMergeNode in="glow1" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <filter id="textGlowFilter1" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="0" flood-color="#3b0764" flood-opacity="1" />
      <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#8b5cf6" flood-opacity="0.6" />
    </filter>

    <filter id="haloQ" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="18" result="halo" />
    </filter>
  </defs>

  <circle cx="100" cy="88" r="64" fill="url(#qRingGrad)" opacity="0.25" filter="url(#haloQ)" />

  <!-- Single Swoosh -->
  <g filter="url(#neonGlow)">
    <path d="${singleSwooshRibbon}" fill="url(#singleSwooshGrad)" opacity="0.95" />
    <path d="${singleSwooshCore}" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity="0.8" />
  </g>

  <!-- Chữ Q -->
  <g filter="url(#neonGlow)">
    <path fill-rule="evenodd" clip-rule="evenodd" d="${qDonutPath}" fill="url(#qRingGrad)" />
    <path d="${qTailPath}" fill="url(#qTailGrad)" />
    <path d="${qTailHl}" fill="url(#qTailHl)" />
  </g>

  <!-- Text uizorra with Cyan-to-Purple Neon Gradient & 3D Bevel -->
  <g filter="url(#textGlowFilter1)">
    <!-- 3D Bevel Base -->
    <path
      d="${textInfo.pathData}"
      transform="translate(0, 3.5)"
      stroke="#4c1d95"
      stroke-width="5"
      stroke-linejoin="round"
      fill="#3b0764"
    />
    <!-- Gradient Face -->
    <path
      d="${textInfo.pathData}"
      fill="url(#textGrad1)"
    />
    <!-- Subtle top white gloss sheen -->
    <path
      d="${textInfo.pathData}"
      stroke="#ffffff"
      stroke-width="0.8"
      stroke-opacity="0.5"
      fill="none"
    />
  </g>
</svg>`;

  // ─────────────────────────────────────────────────────────────────────────
  // VARIANT 2: LUMINOUS ELECTRIC CYAN / ICE WHITE (Direct match with Q's cyan)
  // Text face is Ice Cyan-White (#f0fdfa to #38bdf8) with glowing cyan rim,
  // making Q and text look like they are carved from the SAME glowing ice/neon!
  // ─────────────────────────────────────────────────────────────────────────
  const svgVar2 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasWidth} ${canvasHeight}" width="${canvasWidth}" height="${canvasHeight}" fill="none">
  <defs>
    <linearGradient id="qRingGrad2" x1="44" y1="32" x2="156" y2="144" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#d8b4fe" />
      <stop offset="16%" stop-color="#c084fc" />
      <stop offset="42%" stop-color="#a855f7" />
      <stop offset="68%" stop-color="#38bdf8" />
      <stop offset="88%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#00f2fe" />
    </linearGradient>

    <linearGradient id="qTailGrad2" x1="100" y1="92" x2="160" y2="150" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#7dd3fc" />
      <stop offset="30%" stop-color="#38bdf8" />
      <stop offset="70%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>

    <linearGradient id="qTailHl2" x1="108" y1="92" x2="148" y2="132" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
      <stop offset="45%" stop-color="#e0f2fe" stop-opacity="0.65" />
      <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.1" />
    </linearGradient>

    <!-- Text Face: Brilliant White at top, blending down to Electric Cyan -->
    <linearGradient id="textGrad2" x1="0" y1="80" x2="0" y2="140" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="50%" stop-color="#e0f2fe" />
      <stop offset="100%" stop-color="#67e8f9" />
    </linearGradient>

    <!-- Bevel Gradient: Cyan to Purple -->
    <linearGradient id="bevelGrad2" x1="${textStartX}" y1="140" x2="${textInfo.endX}" y2="140" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="50%" stop-color="#7c3aed" />
      <stop offset="100%" stop-color="#581c87" />
    </linearGradient>

    <linearGradient id="singleSwooshGrad2" x1="${swStartX}" y1="${swTipY}" x2="${swEndX}" y2="${swTipY}" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#c084fc" stop-opacity="0.95" />
      <stop offset="25%" stop-color="#a855f7" />
      <stop offset="65%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.95" />
    </linearGradient>

    <filter id="neonGlow2" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="3" result="glow1" />
      <feGaussianBlur stdDeviation="7" result="glow2" />
      <feMerge>
        <feMergeNode in="glow2" />
        <feMergeNode in="glow1" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <filter id="textGlowFilter2" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="0" flood-color="#1e1b4b" flood-opacity="1" />
      <feDropShadow dx="0" dy="5" stdDeviation="8" flood-color="#06b6d4" flood-opacity="0.5" />
    </filter>

    <filter id="haloQ2" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="18" result="halo" />
    </filter>
  </defs>

  <circle cx="100" cy="88" r="64" fill="url(#qRingGrad2)" opacity="0.25" filter="url(#haloQ2)" />

  <!-- Single Swoosh -->
  <g filter="url(#neonGlow2)">
    <path d="${singleSwooshRibbon}" fill="url(#singleSwooshGrad2)" opacity="0.95" />
    <path d="${singleSwooshCore}" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity="0.8" />
  </g>

  <!-- Chữ Q -->
  <g filter="url(#neonGlow2)">
    <path fill-rule="evenodd" clip-rule="evenodd" d="${qDonutPath}" fill="url(#qRingGrad2)" />
    <path d="${qTailPath}" fill="url(#qTailGrad2)" />
    <path d="${qTailHl}" fill="url(#qTailHl2)" />
  </g>

  <!-- Text uizorra with White-to-Cyan Face & Bevel -->
  <g filter="url(#textGlowFilter2)">
    <path
      d="${textInfo.pathData}"
      transform="translate(0, 3.5)"
      stroke="url(#bevelGrad2)"
      stroke-width="5"
      stroke-linejoin="round"
      fill="url(#bevelGrad2)"
    />
    <path
      d="${textInfo.pathData}"
      fill="url(#textGrad2)"
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

  // ─────────────────────────────────────────────────────────────────────────
  // VARIANT 3: DUAL-TONE WORDMARK (ui = Cyan, zorra = Purple)
  // 'ui' matches Q's right cyan color, 'zorra' returns to brand neon purple!
  // Perfectly links the word from the cyan tail of Q through to the purple swoosh!
  // ─────────────────────────────────────────────────────────────────────────
  const uiInfo = getSafePath('ui', textStartX, textBaselineY, fontSize);
  const zorraInfo = getSafePath('zorra', uiInfo.endX, textBaselineY, fontSize);

  const svgVar3 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasWidth} ${canvasHeight}" width="${canvasWidth}" height="${canvasHeight}" fill="none">
  <defs>
    <linearGradient id="qRingGrad3" x1="44" y1="32" x2="156" y2="144" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#d8b4fe" />
      <stop offset="16%" stop-color="#c084fc" />
      <stop offset="42%" stop-color="#a855f7" />
      <stop offset="68%" stop-color="#38bdf8" />
      <stop offset="88%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#00f2fe" />
    </linearGradient>

    <linearGradient id="qTailGrad3" x1="100" y1="92" x2="160" y2="150" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#7dd3fc" />
      <stop offset="30%" stop-color="#38bdf8" />
      <stop offset="70%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>

    <linearGradient id="qTailHl3" x1="108" y1="92" x2="148" y2="132" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
      <stop offset="45%" stop-color="#e0f2fe" stop-opacity="0.65" />
      <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.1" />
    </linearGradient>

    <!-- ui: Cyan Gradient matching Q's tail -->
    <linearGradient id="uiGrad" x1="${textStartX}" y1="80" x2="${uiInfo.endX}" y2="140" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#06b6d4" />
    </linearGradient>

    <!-- zorra: Purple/Pink Gradient matching Q's left -->
    <linearGradient id="zorraGrad" x1="${uiInfo.endX}" y1="80" x2="${zorraInfo.endX}" y2="140" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#c084fc" />
      <stop offset="60%" stop-color="#a855f7" />
      <stop offset="100%" stop-color="#e879f9" />
    </linearGradient>

    <linearGradient id="singleSwooshGrad3" x1="${swStartX}" y1="${swTipY}" x2="${swEndX}" y2="${swTipY}" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#c084fc" stop-opacity="0.95" />
      <stop offset="25%" stop-color="#a855f7" />
      <stop offset="65%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.95" />
    </linearGradient>

    <filter id="neonGlow3" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="3" result="glow1" />
      <feGaussianBlur stdDeviation="7" result="glow2" />
      <feMerge>
        <feMergeNode in="glow2" />
        <feMergeNode in="glow1" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <filter id="haloQ3" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="18" result="halo" />
    </filter>

    <filter id="textShadow3" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="0" flood-color="#1e1b4b" flood-opacity="1" />
      <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#7c3aed" flood-opacity="0.4" />
    </filter>
  </defs>

  <circle cx="100" cy="88" r="64" fill="url(#qRingGrad3)" opacity="0.25" filter="url(#haloQ3)" />

  <!-- Single Swoosh -->
  <g filter="url(#neonGlow3)">
    <path d="${singleSwooshRibbon}" fill="url(#singleSwooshGrad3)" opacity="0.95" />
    <path d="${singleSwooshCore}" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity="0.8" />
  </g>

  <!-- Chữ Q -->
  <g filter="url(#neonGlow3)">
    <path fill-rule="evenodd" clip-rule="evenodd" d="${qDonutPath}" fill="url(#qRingGrad3)" />
    <path d="${qTailPath}" fill="url(#qTailGrad3)" />
    <path d="${qTailHl}" fill="url(#qTailHl3)" />
  </g>

  <!-- Dual-tone Wordmark ui (Cyan) + zorra (Purple) -->
  <g filter="url(#textShadow3)">
    <!-- Base 3D shadow for both -->
    <path d="${uiInfo.pathData}" transform="translate(0, 3.5)" stroke="#0369a1" stroke-width="5" stroke-linejoin="round" fill="#0369a1" />
    <path d="${zorraInfo.pathData}" transform="translate(0, 3.5)" stroke="#4c1d95" stroke-width="5" stroke-linejoin="round" fill="#4c1d95" />

    <!-- Front faces -->
    <path d="${uiInfo.pathData}" fill="url(#uiGrad)" />
    <path d="${zorraInfo.pathData}" fill="url(#zorraGrad)" />

    <!-- White top edge sheen on both -->
    <path d="${uiInfo.pathData} ${zorraInfo.pathData}" stroke="#ffffff" stroke-width="0.8" stroke-opacity="0.6" fill="none" />
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

  await renderDark(svgVar1, 'opt1_spectrum_gradient.png');
  await renderDark(svgVar2, 'opt2_cyan_ice_white.png');
  await renderDark(svgVar3, 'opt3_dualtone_ui_zorra.png');

  console.log('✓ Rendered 3 harmonious options with tight kerning and color integration!');
}

testHarmonious().catch(console.error);
