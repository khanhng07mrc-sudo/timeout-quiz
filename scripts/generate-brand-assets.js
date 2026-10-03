const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const opentype = require('opentype.js');

async function generateAllBrandAssets() {
  console.log('1. Loading Poppins-Bold from Google Fonts repository...');
  const fontUrl = 'https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Bold.ttf';
  const fontRes = await fetch(fontUrl);
  const fontBuffer = await fontRes.arrayBuffer();
  const font = opentype.parse(fontBuffer);
  console.log('✓ Poppins-Bold loaded.');

  const pubBrandDir = path.join(__dirname, '..', 'public', 'brand');
  const pubDir = path.join(__dirname, '..', 'public');
  const artifactDir = 'C:\\Users\\khanh\\.gemini\\antigravity\\brain\\b7084729-0490-403c-a9fa-396f28123f8f';

  if (!fs.existsSync(pubBrandDir)) {
    fs.mkdirSync(pubBrandDir, { recursive: true });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. HORIZONTAL LOGO: Q (100% unclipped) + "uizorra" + Aerodynamic Swoosh
  // ═══════════════════════════════════════════════════════════════════════════
  const hTextStartX = 206;
  const hTextBaselineY = 142;
  const hFontSize = 102;
  const hWord = 'uizorra';

  let hCurX = hTextStartX;
  let hWordPathData = '';
  for (let i = 0; i < hWord.length; i++) {
    const char = hWord[i];
    const glyph = font.charToGlyph(char);
    const glyphPath = font.getPath(char, hCurX, hTextBaselineY, hFontSize);
    hWordPathData += ' ' + glyphPath.toPathData(2);
    const advance = (glyph.advanceWidth / font.unitsPerEm) * hFontSize;
    hCurX += advance;
  }

  const hCanvasWidth = Math.ceil(hCurX + 35); // ~775
  const hCanvasHeight = 220;

  // Q Tail geometry
  const hTailPath = 'M 125.51 91.06 A 14.5 14.5 0 0 0 106.49 112.94 L 150.84 154.83 A 17 17 0 0 0 173.16 129.17 Z';
  const hTailHl = 'M 124.0 95.0 A 6 6 0 0 0 116.0 104.0 L 151.0 137.0 A 7.5 7.5 0 0 0 161.0 126.0 Z';
  const hInnerSweep = 'M 116 102 C 96 106, 78 114, 70 128 C 80 130, 98 126, 116 116 Z';

  const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${hCanvasWidth} ${hCanvasHeight}" width="${hCanvasWidth}" height="${hCanvasHeight}" fill="none">
  <defs>
    <!-- Q Ring Gradient: Seamless Neon Purple to Electric Cyan -->
    <linearGradient id="qzRingGrad" x1="50" y1="32" x2="170" y2="152" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#d8b4fe" />
      <stop offset="16%" stop-color="#c084fc" />
      <stop offset="42%" stop-color="#a855f7" />
      <stop offset="68%" stop-color="#38bdf8" />
      <stop offset="88%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#00f2fe" />
    </linearGradient>

    <!-- Q Tail Gradient: 3D Volumetric Cyan Depth -->
    <linearGradient id="qzTailGrad" x1="110" y1="96" x2="176" y2="156" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#7dd3fc" />
      <stop offset="30%" stop-color="#38bdf8" />
      <stop offset="70%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>

    <!-- Q Tail Highlight Gradient -->
    <linearGradient id="qzTailHl" x1="118" y1="96" x2="160" y2="134" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9" />
      <stop offset="45%" stop-color="#e0f2fe" stop-opacity="0.6" />
      <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.1" />
    </linearGradient>

    <!-- Swoosh Gradient: Purple on left -> Electric Cyan on right -->
    <linearGradient id="qzSwooshGrad" x1="25" y1="180" x2="${hCanvasWidth - 25}" y2="180" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#c084fc" stop-opacity="0.95" />
      <stop offset="25%" stop-color="#a855f7" />
      <stop offset="65%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.95" />
    </linearGradient>

    <!-- Soft Neon Glow Filter -->
    <filter id="qzGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="3" result="glow1" />
      <feGaussianBlur stdDeviation="7" result="glow2" />
      <feMerge>
        <feMergeNode in="glow2" />
        <feMergeNode in="glow1" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <!-- Ambient Halo behind Q -->
    <filter id="qzHalo" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="18" result="halo" />
    </filter>

    <!-- Text 3D Shadow -->
    <filter id="qzTextShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2.5" stdDeviation="3" flood-color="#7c3aed" flood-opacity="0.45" />
      <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#06b6d4" flood-opacity="0.22" />
    </filter>
  </defs>

  <!-- AMBIENT NEON HALO (Behind Q) -->
  <circle cx="110" cy="92" r="66" fill="url(#qzRingGrad)" opacity="0.25" filter="url(#qzHalo)" />

  <!-- ═══════════════════════════════════════════════════════════════ -->
  <!-- Q SYMBOL (100% UNCLIPPED, 360° ROUND CIRCLE + 3D CAPSULE TAIL)   -->
  <!-- ═══════════════════════════════════════════════════════════════ -->
  <g filter="url(#qzGlow)">
    <!-- 1. FULL UNCLIPPED CIRCULAR DONUT RING (360° completely round, zero flat cuts) -->
    <!-- Center (110, 92), Outer R=60, Inner r=33 -->
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M 110 32 C 76.86 32 50 58.86 50 92 C 50 125.14 76.86 152 110 152 C 143.14 152 170 125.14 170 92 C 170 58.86 143.14 32 110 32 Z M 110 59 C 128.22 59 143 73.78 143 92 C 143 110.22 128.22 125 110 125 C 91.78 125 77 110.22 77 92 C 77 73.78 91.78 59 110 59 Z"
      fill="url(#qzRingGrad)"
    />

    <!-- Translucent Cyan Inner Sweep along bottom of hole -->
    <path
      d="${hInnerSweep}"
      fill="#38bdf8"
      opacity="0.65"
    />

    <!-- 2. Q TAIL: Solid 3D rounded capsule flowing from inside hole out to bottom-right -->
    <path
      d="${hTailPath}"
      fill="url(#qzTailGrad)"
    />

    <!-- 3. Soft Volumetric Gloss Sheen along top surface of tail -->
    <path
      d="${hTailHl}"
      fill="url(#qzTailHl)"
    />
  </g>

  <!-- ═══════════════════════════════════════════════════════════════ -->
  <!-- SWOOSH / ARC UNDERNEATH (Spans smoothly below Q & text)         -->
  <!-- ═══════════════════════════════════════════════════════════════ -->
  <g filter="url(#qzGlow)">
    <!-- Aerodynamic Crescent Ribbon -->
    <path
      d="M 28 184 C 70 168, 140 168, 220 176 C 360 188, 540 189, ${hCanvasWidth - 25} 181 C 540 193, 360 192, 220 181 C 140 173, 70 173, 28 184 Z"
      fill="url(#qzSwooshGrad)"
      opacity="0.95"
    />
    <!-- White neon tube core highlight -->
    <path
      d="M 45 183.5 C 80 169, 140 169, 220 177 C 360 189, 520 190, ${hCanvasWidth - 45} 182"
      stroke="#ffffff"
      stroke-width="1.6"
      stroke-linecap="round"
      opacity="0.75"
    />
  </g>

  <!-- ═══════════════════════════════════════════════════════════════ -->
  <!-- WORDMARK: "uizorra" (Pure Vector Path of Poppins-Bold)          -->
  <!-- ═══════════════════════════════════════════════════════════════ -->
  <path
    d="${hWordPathData}"
    fill="#ffffff"
    filter="url(#qzTextShadow)"
  />
</svg>`;

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. STACKED LOGO: Q (with Horizon Arch) + "Quizorra" Centered Below (like V5)
  // ═══════════════════════════════════════════════════════════════════════════
  const stkWord = 'Quizorra';
  const stkFontSize = 74;
  const stkBaselineY = 252;

  let stkWordWidth = 0;
  for (let i = 0; i < stkWord.length; i++) {
    const glyph = font.charToGlyph(stkWord[i]);
    stkWordWidth += (glyph.advanceWidth / font.unitsPerEm) * stkFontSize;
  }

  const stkCanvasWidth = 420;
  const stkCanvasHeight = 295;
  const stkTextStartX = (stkCanvasWidth - stkWordWidth) / 2;

  let stkCurX = stkTextStartX;
  let stkWordPathData = '';
  for (let i = 0; i < stkWord.length; i++) {
    const char = stkWord[i];
    const glyph = font.charToGlyph(char);
    const glyphPath = font.getPath(char, stkCurX, stkBaselineY, stkFontSize);
    stkWordPathData += ' ' + glyphPath.toPathData(2);
    const advance = (glyph.advanceWidth / font.unitsPerEm) * stkFontSize;
    stkCurX += advance;
  }

  const stkTailPath = 'M 224.46 88.13 A 13 13 0 0 0 207.54 107.87 L 247.91 145.77 A 15.5 15.5 0 0 0 268.09 122.23 Z';
  const stkTailHl = 'M 223.0 91.5 A 5 5 0 0 0 216.0 99.5 L 249.0 128.5 A 6.5 6.5 0 0 0 257.0 119.5 Z';
  const stkInnerSweep = 'M 216 98 C 198 102, 182 109, 174 122 C 183 124, 199 120, 216 111 Z';

  const stkArchPath = 'M 126 173 C 145 155, 175 149, 210 149 C 245 149, 275 155, 294 173 C 275 160, 245 155, 210 155 C 175 155, 145 160, 126 173 Z';
  const stkArchCore = 'M 136 172 C 155 157, 180 152, 210 152 C 240 152, 265 157, 284 172';

  const stackedSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${stkCanvasWidth} ${stkCanvasHeight}" width="${stkCanvasWidth}" height="${stkCanvasHeight}" fill="none">
  <defs>
    <linearGradient id="stkRingGrad" x1="154" y1="32" x2="266" y2="144" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#d8b4fe" />
      <stop offset="16%" stop-color="#c084fc" />
      <stop offset="42%" stop-color="#a855f7" />
      <stop offset="68%" stop-color="#38bdf8" />
      <stop offset="88%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#00f2fe" />
    </linearGradient>

    <linearGradient id="stkTailGrad" x1="210" y1="92" x2="270" y2="148" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#7dd3fc" />
      <stop offset="30%" stop-color="#38bdf8" />
      <stop offset="70%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>

    <linearGradient id="stkTailHl" x1="218" y1="92" x2="256" y2="126" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9" />
      <stop offset="45%" stop-color="#e0f2fe" stop-opacity="0.6" />
      <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.1" />
    </linearGradient>

    <linearGradient id="stkArchGrad" x1="126" y1="162" x2="294" y2="162" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#c084fc" stop-opacity="0.95" />
      <stop offset="25%" stop-color="#a855f7" />
      <stop offset="65%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.95" />
    </linearGradient>

    <filter id="stkGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="3" result="glow1" />
      <feGaussianBlur stdDeviation="6.5" result="glow2" />
      <feMerge>
        <feMergeNode in="glow2" />
        <feMergeNode in="glow1" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <filter id="stkBloom" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="15" result="bloom" />
    </filter>

    <filter id="stkTextShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2.5" stdDeviation="3" flood-color="#7c3aed" flood-opacity="0.45" />
      <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#06b6d4" flood-opacity="0.22" />
    </filter>
  </defs>

  <!-- Ambient Bloom -->
  <circle cx="210" cy="88" r="62" fill="url(#stkRingGrad)" opacity="0.25" filter="url(#stkBloom)" />

  <!-- Arched Horizon Below Q (like V5) -->
  <g filter="url(#stkGlow)">
    <path
      d="${stkArchPath}"
      fill="url(#stkArchGrad)"
      opacity="0.95"
    />
    <path
      d="${stkArchCore}"
      stroke="#ffffff"
      stroke-width="1.5"
      stroke-linecap="round"
      opacity="0.75"
    />
  </g>

  <!-- Q Ring + Tail -->
  <g filter="url(#stkGlow)">
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M 210 32 C 179.07 32 154 57.07 154 88 C 154 118.93 179.07 144 210 144 C 240.93 144 266 118.93 266 88 C 266 57.07 240.93 32 210 32 Z M 210 58 C 226.57 58 240 71.43 240 88 C 240 104.57 226.57 118 210 118 C 193.43 118 180 104.57 180 88 C 180 71.43 193.43 58 210 58 Z"
      fill="url(#stkRingGrad)"
    />
    <path
      d="${stkInnerSweep}"
      fill="#38bdf8"
      opacity="0.65"
    />
    <path
      d="${stkTailPath}"
      fill="url(#stkTailGrad)"
    />
    <path
      d="${stkTailHl}"
      fill="url(#stkTailHl)"
    />
  </g>

  <!-- Wordmark "Quizorra" Centered Below -->
  <path
    d="${stkWordPathData}"
    fill="#ffffff"
    filter="url(#stkTextShadow)"
  />
</svg>`;

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. SQUARE ICON (200x200 1:1, Q + Glowing Arch)
  // ═══════════════════════════════════════════════════════════════════════════
  const sqTailPath = 'M 114.46 88.13 A 13 13 0 0 0 97.54 107.87 L 137.91 145.77 A 15.5 15.5 0 0 0 158.09 122.23 Z';
  const sqTailHl = 'M 113.0 91.5 A 5 5 0 0 0 106.0 99.5 L 139.0 128.5 A 6.5 6.5 0 0 0 147.0 119.5 Z';
  const sqInnerSweep = 'M 106 98 C 88 102, 72 109, 64 122 C 73 124, 89 120, 106 111 Z';

  const sqArchPath = 'M 22 173 C 44 155, 72 149, 100 149 C 128 149, 156 155, 178 173 C 156 160, 128 155, 100 155 C 72 155, 44 160, 22 173 Z';
  const sqArchCore = 'M 32 172 C 52 157, 74 152, 100 152 C 126 152, 148 157, 168 172';

  const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200" fill="none">
  <defs>
    <linearGradient id="sqRingGrad" x1="44" y1="32" x2="156" y2="144" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#d8b4fe" />
      <stop offset="16%" stop-color="#c084fc" />
      <stop offset="42%" stop-color="#a855f7" />
      <stop offset="68%" stop-color="#38bdf8" />
      <stop offset="88%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#00f2fe" />
    </linearGradient>

    <linearGradient id="sqTailGrad" x1="100" y1="92" x2="160" y2="148" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#7dd3fc" />
      <stop offset="30%" stop-color="#38bdf8" />
      <stop offset="70%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>

    <linearGradient id="sqTailHl" x1="108" y1="92" x2="146" y2="126" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9" />
      <stop offset="45%" stop-color="#e0f2fe" stop-opacity="0.6" />
      <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.1" />
    </linearGradient>

    <linearGradient id="sqArchGrad" x1="22" y1="162" x2="178" y2="162" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#c084fc" stop-opacity="0.95" />
      <stop offset="25%" stop-color="#a855f7" />
      <stop offset="65%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.95" />
    </linearGradient>

    <filter id="sqGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="3" result="glow1" />
      <feGaussianBlur stdDeviation="6.5" result="glow2" />
      <feMerge>
        <feMergeNode in="glow2" />
        <feMergeNode in="glow1" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <filter id="sqBloom" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="15" result="bloom" />
    </filter>
  </defs>

  <!-- Ambient Bloom -->
  <circle cx="100" cy="88" r="62" fill="url(#sqRingGrad)" opacity="0.25" filter="url(#sqBloom)" />

  <!-- Arched Horizon Below Q -->
  <g filter="url(#sqGlow)">
    <path
      d="${sqArchPath}"
      fill="url(#sqArchGrad)"
      opacity="0.95"
    />
    <path
      d="${sqArchCore}"
      stroke="#ffffff"
      stroke-width="1.5"
      stroke-linecap="round"
      opacity="0.75"
    />
  </g>

  <!-- Q Ring + Tail -->
  <g filter="url(#sqGlow)">
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M 100 32 C 69.07 32 44 57.07 44 88 C 44 118.93 69.07 144 100 144 C 130.93 144 156 118.93 156 88 C 156 57.07 130.93 32 100 32 Z M 100 58 C 116.57 58 130 71.43 130 88 C 130 104.57 116.57 118 100 118 C 83.43 118 70 104.57 70 88 C 70 71.43 83.43 58 100 58 Z"
      fill="url(#sqRingGrad)"
    />
    <path
      d="${sqInnerSweep}"
      fill="#38bdf8"
      opacity="0.65"
    />
    <path
      d="${sqTailPath}"
      fill="url(#sqTailGrad)"
    />
    <path
      d="${sqTailHl}"
      fill="url(#sqTailHl)"
    />
  </g>
</svg>`;

  // ═══════════════════════════════════════════════════════════════════════════
  // WRITE ALL VECTOR SVGs
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('Writing vector SVG files...');
  fs.writeFileSync(path.join(pubBrandDir, 'quizorra_logo.svg'), fullSvg);
  fs.writeFileSync(path.join(pubBrandDir, 'logo.svg'), fullSvg);
  fs.writeFileSync(path.join(pubDir, 'quizorra-logo.svg'), fullSvg);

  fs.writeFileSync(path.join(pubBrandDir, 'quizorra_stacked.svg'), stackedSvg);

  fs.writeFileSync(path.join(pubBrandDir, 'quizorra_icon.svg'), iconSvg);
  fs.writeFileSync(path.join(pubBrandDir, 'icon.svg'), iconSvg);
  fs.writeFileSync(path.join(pubDir, 'icon.svg'), iconSvg);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER ULTRA HIGH-RES 32-BIT RGBA TRUE ALPHA TRANSPARENT PNG & WEBP
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('Rendering 32-bit RGBA PNG & WebP images with true alpha transparency...');

  // 1. Full Horizontal Logo (PNG & WebP)
  const fullPng = await sharp(Buffer.from(fullSvg), { density: 150 }).png().toBuffer();
  fs.writeFileSync(path.join(pubBrandDir, 'quizorra_logo.png'), fullPng);
  fs.writeFileSync(path.join(pubBrandDir, 'logo.png'), fullPng);
  fs.writeFileSync(path.join(artifactDir, 'quizorra_logo.png'), fullPng);

  const fullWebp = await sharp(Buffer.from(fullSvg), { density: 150 }).webp({ quality: 95, lossless: true }).toBuffer();
  fs.writeFileSync(path.join(pubBrandDir, 'quizorra_logo.webp'), fullWebp);
  fs.writeFileSync(path.join(pubBrandDir, 'logo.webp'), fullWebp);
  fs.writeFileSync(path.join(artifactDir, 'quizorra_logo.webp'), fullWebp);

  // 2. Square Icon 512x512 (PNG & WebP)
  const iconPng512 = await sharp(Buffer.from(iconSvg), { density: 250 }).resize(512, 512).png().toBuffer();
  fs.writeFileSync(path.join(pubBrandDir, 'quizorra_icon.png'), iconPng512);
  fs.writeFileSync(path.join(pubBrandDir, 'icon.png'), iconPng512);
  fs.writeFileSync(path.join(artifactDir, 'quizorra_icon.png'), iconPng512);

  const iconWebp512 = await sharp(Buffer.from(iconSvg), { density: 250 }).resize(512, 512).webp({ quality: 95, lossless: true }).toBuffer();
  fs.writeFileSync(path.join(pubBrandDir, 'quizorra_icon.webp'), iconWebp512);
  fs.writeFileSync(path.join(pubBrandDir, 'icon.webp'), iconWebp512);
  fs.writeFileSync(path.join(artifactDir, 'quizorra_icon.webp'), iconWebp512);

  // 3. Stacked / Vertical Logo (PNG & WebP)
  const stackedPng = await sharp(Buffer.from(stackedSvg), { density: 150 }).png().toBuffer();
  fs.writeFileSync(path.join(pubBrandDir, 'quizorra_stacked.png'), stackedPng);
  fs.writeFileSync(path.join(artifactDir, 'quizorra_stacked.png'), stackedPng);

  const stackedWebp = await sharp(Buffer.from(stackedSvg), { density: 150 }).webp({ quality: 95, lossless: true }).toBuffer();
  fs.writeFileSync(path.join(pubBrandDir, 'quizorra_stacked.webp'), stackedWebp);
  fs.writeFileSync(path.join(artifactDir, 'quizorra_stacked.webp'), stackedWebp);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER DARK PREVIEWS FOR IMMEDIATE VISUAL VERIFICATION
  // ═══════════════════════════════════════════════════════════════════════════
  const fullMeta = await sharp(fullPng).metadata();
  const previewHorizontalDark = await sharp({
    create: {
      width: fullMeta.width,
      height: fullMeta.height,
      channels: 4,
      background: { r: 11, g: 12, b: 22, alpha: 1 } // #0b0c16 arena background
    }
  })
    .composite([{ input: fullPng, blend: 'over' }])
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(artifactDir, 'quizorra_logo_preview_dark.png'), previewHorizontalDark);

  const stackedMeta = await sharp(stackedPng).metadata();
  const previewStackedDark = await sharp({
    create: {
      width: stackedMeta.width,
      height: stackedMeta.height,
      channels: 4,
      background: { r: 11, g: 12, b: 22, alpha: 1 }
    }
  })
    .composite([{ input: stackedPng, blend: 'over' }])
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(artifactDir, 'quizorra_stacked_preview_dark.png'), previewStackedDark);

  const iconMeta = await sharp(iconPng512).metadata();
  const previewIconDark = await sharp({
    create: {
      width: iconMeta.width,
      height: iconMeta.height,
      channels: 4,
      background: { r: 11, g: 12, b: 22, alpha: 1 }
    }
  })
    .composite([{ input: iconPng512, blend: 'over' }])
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(artifactDir, 'quizorra_icon_preview_dark.png'), previewIconDark);

  console.log('✓ Successfully generated all Quizorra brand assets!');
}

generateAllBrandAssets().catch(err => {
  console.error('Fatal error generating assets:', err);
  process.exit(1);
});
