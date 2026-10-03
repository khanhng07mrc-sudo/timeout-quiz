const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const opentype = require('opentype.js');

async function generateAllBrandAssets() {
  console.log('1. Loading Poppins-Bold...');
  const fontPath = path.join(__dirname, 'Poppins-Bold.ttf');
  const fontBuffer = fs.readFileSync(fontPath);
  const font = opentype.parse(fontBuffer.buffer);
  console.log('✓ Poppins-Bold loaded.');

  const pubBrandDir = path.join(__dirname, '..', 'public', 'brand');
  const pubDir = path.join(__dirname, '..', 'public');
  const artifactDir = 'C:\\Users\\khanh\\.gemini\\antigravity\\brain\\b7084729-0490-403c-a9fa-396f28123f8f';

  if (!fs.existsSync(pubBrandDir)) {
    fs.mkdirSync(pubBrandDir, { recursive: true });
  }

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
  // 1. HORIZONTAL LOGO (OFFICIAL):
  //    - Chữ Q 100% unclipped, 360° tròn khép kín, 3D capsule tail
  //    - KHÔNG CÓ BLUR VIỀN (ZERO Gaussian Blur / Glow halo) -> Cạnh sắc nét 100% vector
  //    - BỎ CHỮ Q MÀU TRẮNG: chỉ có "uizorra" theo ngay sau Q
  //    - Kerning sát Q (textStartX = 158, gap chỉ 8px)
  //    - Màu sắc hài hòa: uizorra mang gradient màu Cyan -> Tím neon đồng nhất với Q
  //    - ĐƯỜNG NÉT BÊN DƯỚI ĐI NGUYÊN CẢ LOGO: 1 đường chân trời liên tục duy nhất, vát nhọn 2 đầu
  // ═══════════════════════════════════════════════════════════════════════════
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

  const outerRibbon = `M ${swStartX} 175 Q ${swMidX} 166 ${swEndX} 175 Q ${swMidX} 171 ${swStartX} 175 Z`;
  const coreStartX = swStartX + 45;
  const coreEndX = swEndX - 45;
  const innerCore = `M ${coreStartX} 174 Q ${swMidX} 167.5 ${coreEndX} 174 Q ${swMidX} 169.5 ${coreStartX} 174 Z`;

  const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasWidth} ${canvasHeight}" width="${canvasWidth}" height="${canvasHeight}" fill="none">
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

    <!-- Bevel Gradient: Cyan-to-Purple deep shadow base -->
    <linearGradient id="bevelGrad" x1="${textStartX}" y1="138" x2="${textInfo.endX}" y2="138" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0369a1" />
      <stop offset="45%" stop-color="#4c1d95" />
      <stop offset="100%" stop-color="#3b0764" />
    </linearGradient>

    <!-- Single Continuous Swoosh Gradient across ENTIRE logo -->
    <linearGradient id="swooshGrad" x1="${swStartX}" y1="170" x2="${swEndX}" y2="170" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#c084fc" />
      <stop offset="25%" stop-color="#a855f7" />
      <stop offset="65%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#00f2fe" />
    </linearGradient>

    <linearGradient id="swooshCoreGrad" x1="${coreStartX}" y1="170" x2="${coreEndX}" y2="170" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#f5d0fe" stop-opacity="0.2" />
      <stop offset="20%" stop-color="#ffffff" stop-opacity="0.95" />
      <stop offset="70%" stop-color="#ffffff" stop-opacity="0.95" />
      <stop offset="100%" stop-color="#e0f2fe" stop-opacity="0.2" />
    </linearGradient>
  </defs>

  <!-- 1. SEAMLESS UNBROKEN HORIZON SWOOSH (Precision Tapered Needle Points, ZERO Blur, ZERO Split) -->
  <g id="swoosh-seamless">
    <path d="${outerRibbon}" fill="url(#swooshGrad)" />
    <path d="${innerCore}" fill="url(#swooshCoreGrad)" />
  </g>

  <!-- 2. CHỮ Q: 100% CRISP VECTOR, ZERO BLUR VIỀN -->
  <g id="letter-Q">
    <!-- Crisp 3.5px Bevel Base -->
    <path fill-rule="evenodd" clip-rule="evenodd" d="${qDonutPath}" transform="translate(0, 3.5)" fill="#2e1065" />
    <!-- Crisp Q Ring -->
    <path fill-rule="evenodd" clip-rule="evenodd" d="${qDonutPath}" fill="url(#qRingGrad)" />
    <!-- 3D Tail Shadow -->
    <path d="${qTailPath}" transform="translate(0, 3.5)" fill="#0f172a" opacity="0.5" />
    <!-- 3D Tail -->
    <path d="${qTailPath}" fill="url(#qTailGrad)" />
    <!-- Gloss Sheen -->
    <path d="${qTailHl}" fill="url(#qTailHl)" />
  </g>

  <!-- 3. TEXT: "uizorra" (NO WHITE Q!), CRISP 3D BEVEL & MATCHING SPECTRUM GRADIENT -->
  <g id="text-uizorra">
    <!-- Crisp 3D Bevel Base -->
    <path
      d="${textInfo.pathData}"
      transform="translate(0, 3.5)"
      stroke="url(#bevelGrad)"
      stroke-width="5"
      stroke-linejoin="round"
      fill="url(#bevelGrad)"
    />
    <!-- Gradient Face -->
    <path
      d="${textInfo.pathData}"
      fill="url(#textGrad)"
    />
    <!-- Crisp Top Highlight Edge -->
    <path
      d="${textInfo.pathData}"
      stroke="#ffffff"
      stroke-width="0.8"
      stroke-opacity="0.85"
      fill="none"
    />
  </g>
</svg>`;

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. SQUARE ICON (200x200 1:1, Crisp Vector Q + Precision Arch)
  // ═══════════════════════════════════════════════════════════════════════════
  const sqTailPath = 'M 116.32 87.24 A 13 13 0 0 0 98.68 105.76 L 138.61 146.93 A 15 15 0 0 0 159.39 125.07 Z';
  const sqTailHl = 'M 114.5 90.5 A 5 5 0 0 0 106.5 98.5 L 141.0 134.0 A 6 6 0 0 0 150.5 124.5 Z';

  const sqArchRibbon = 'M 24 172 Q 100 154 176 172 Q 100 160 24 172 Z';
  const sqArchCore = 'M 45 171 Q 100 156 155 171 Q 100 158 45 171 Z';

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

    <linearGradient id="sqTailGrad" x1="100" y1="92" x2="162" y2="150" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#7dd3fc" />
      <stop offset="30%" stop-color="#38bdf8" />
      <stop offset="70%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>

    <linearGradient id="sqTailHl" x1="108" y1="92" x2="148" y2="132" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
      <stop offset="45%" stop-color="#e0f2fe" stop-opacity="0.65" />
      <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.1" />
    </linearGradient>

    <linearGradient id="sqArchGrad" x1="24" y1="162" x2="176" y2="162" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#c084fc" />
      <stop offset="25%" stop-color="#a855f7" />
      <stop offset="65%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#00f2fe" />
    </linearGradient>

    <linearGradient id="sqArchCoreGrad" x1="45" y1="162" x2="155" y2="162" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.2" />
      <stop offset="30%" stop-color="#ffffff" stop-opacity="0.95" />
      <stop offset="70%" stop-color="#ffffff" stop-opacity="0.95" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.2" />
    </linearGradient>
  </defs>

  <!-- Precision Arch Below Q -->
  <g id="sq-arch">
    <path d="${sqArchRibbon}" fill="url(#sqArchGrad)" />
    <path d="${sqArchCore}" fill="url(#sqArchCoreGrad)" />
  </g>

  <!-- Crisp Vector Q (Zero Blur) -->
  <g id="sq-Q">
    <!-- Crisp 3D Bevel Shadow -->
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M 100 32 C 69.07 32 44 57.07 44 88 C 44 118.93 69.07 144 100 144 C 130.93 144 156 118.93 156 88 C 156 57.07 130.93 32 100 32 Z M 100 58 C 116.57 58 130 71.43 130 88 C 130 104.57 116.57 118 100 118 C 83.43 118 70 104.57 70 88 C 70 71.43 83.43 58 100 58 Z"
      transform="translate(0, 3.5)"
      fill="#2e1065"
    />
    <!-- Crisp Ring -->
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M 100 32 C 69.07 32 44 57.07 44 88 C 44 118.93 69.07 144 100 144 C 130.93 144 156 118.93 156 88 C 156 57.07 130.93 32 100 32 Z M 100 58 C 116.57 58 130 71.43 130 88 C 130 104.57 116.57 118 100 118 C 83.43 118 70 104.57 70 88 C 70 71.43 83.43 58 100 58 Z"
      fill="url(#sqRingGrad)"
    />
    <!-- 3D Tail Shadow -->
    <path d="${sqTailPath}" transform="translate(0, 3.5)" fill="#0f172a" opacity="0.5" />
    <!-- 3D Tail -->
    <path d="${sqTailPath}" fill="url(#sqTailGrad)" />
    <!-- Gloss Sheen -->
    <path d="${sqTailHl}" fill="url(#sqTailHl)" />
  </g>
</svg>`;

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. STACKED LOGO: Q on top + Horizon Arch + "Quizorra" Centered Below (Crisp)
  // ═══════════════════════════════════════════════════════════════════════════
  const stkCanvasWidth = 420;
  const stkCanvasHeight = 295;
  const stkFontSize = 74;
  const stkBaselineY = 250;

  const rawStk = getSafePath('Quizorra', 0, stkBaselineY, stkFontSize);
  const stkStartX = Math.round((stkCanvasWidth - rawStk.totalWidth) / 2);
  const stkTextInfo = getSafePath('Quizorra', stkStartX, stkBaselineY, stkFontSize);

  const qDonutPathStk = `M 210 32 C 179.07 32 154 57.07 154 88 C 154 118.93 179.07 144 210 144 C 240.93 144 266 118.93 266 88 C 266 57.07 240.93 32 210 32 Z M 210 58 C 226.57 58 240 71.43 240 88 C 240 104.57 226.57 118 210 118 C 193.43 118 180 104.57 180 88 C 180 71.43 193.43 58 210 58 Z`;
  const qTailPathStk = `M 226.32 87.24 A 13 13 0 0 0 208.68 105.76 L 248.61 146.93 A 15 15 0 0 0 269.39 125.07 Z`;
  const qTailHlStk = `M 224.5 90.5 A 5 5 0 0 0 216.5 98.5 L 251.0 134.0 A 6 6 0 0 0 260.5 124.5 Z`;

  const stkArchRibbon = 'M 130 172 Q 210 154 290 172 Q 210 160 130 172 Z';
  const stkArchCore = 'M 155 171 Q 210 156 265 171 Q 210 158 155 171 Z';

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

    <linearGradient id="stkTailGrad" x1="210" y1="92" x2="272" y2="150" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#7dd3fc" />
      <stop offset="30%" stop-color="#38bdf8" />
      <stop offset="70%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>

    <linearGradient id="stkTailHl" x1="218" y1="92" x2="258" y2="132" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
      <stop offset="45%" stop-color="#e0f2fe" stop-opacity="0.65" />
      <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.1" />
    </linearGradient>

    <linearGradient id="stkTextGrad" x1="${stkStartX}" y1="190" x2="${stkTextInfo.endX}" y2="250" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#00f2fe" />
      <stop offset="25%" stop-color="#38bdf8" />
      <stop offset="55%" stop-color="#a855f7" />
      <stop offset="80%" stop-color="#c084fc" />
      <stop offset="100%" stop-color="#e879f9" />
    </linearGradient>

    <linearGradient id="stkArchGrad" x1="130" y1="162" x2="290" y2="162" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#c084fc" />
      <stop offset="25%" stop-color="#a855f7" />
      <stop offset="65%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#00f2fe" />
    </linearGradient>

    <linearGradient id="stkArchCoreGrad" x1="155" y1="162" x2="265" y2="162" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.2" />
      <stop offset="30%" stop-color="#ffffff" stop-opacity="0.95" />
      <stop offset="70%" stop-color="#ffffff" stop-opacity="0.95" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.2" />
    </linearGradient>

    <linearGradient id="stkBevelGrad" x1="${stkStartX}" y1="250" x2="${stkTextInfo.endX}" y2="250" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0369a1" />
      <stop offset="45%" stop-color="#4c1d95" />
      <stop offset="100%" stop-color="#3b0764" />
    </linearGradient>
  </defs>

  <!-- Precision Arch Below Q -->
  <g id="stk-arch">
    <path d="${stkArchRibbon}" fill="url(#stkArchGrad)" />
    <path d="${stkArchCore}" fill="url(#stkArchCoreGrad)" />
  </g>

  <!-- Crisp Q Ring & Tail -->
  <g id="stk-Q">
    <path fill-rule="evenodd" clip-rule="evenodd" d="${qDonutPathStk}" transform="translate(0, 3.5)" fill="#2e1065" />
    <path fill-rule="evenodd" clip-rule="evenodd" d="${qDonutPathStk}" fill="url(#stkRingGrad)" />
    <path d="${qTailPathStk}" transform="translate(0, 3.5)" fill="#0f172a" opacity="0.5" />
    <path d="${qTailPathStk}" fill="url(#stkTailGrad)" />
    <path d="${qTailHlStk}" fill="url(#stkTailHl)" />
  </g>

  <!-- Crisp Text "Quizorra" Centered -->
  <g id="stk-text">
    <path
      d="${stkTextInfo.pathData}"
      transform="translate(0, 3)"
      stroke="url(#stkBevelGrad)"
      stroke-width="4.5"
      stroke-linejoin="round"
      fill="url(#stkBevelGrad)"
    />
    <path d="${stkTextInfo.pathData}" fill="url(#stkTextGrad)" />
    <path d="${stkTextInfo.pathData}" stroke="#ffffff" stroke-width="0.8" stroke-opacity="0.8" fill="none" />
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
  // RENDER 32-BIT RGBA TRUE ALPHA TRANSPARENT PNG & WEBP
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
  // RENDER DARK PREVIEWS FOR VISUAL CONFIRMATION
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

  console.log('✓ ALL BRAND ASSETS SUCCESSFULLY GENERATED (100% Crisp Vector, Real Transparency, Zero Blur Viền)!');
}

generateAllBrandAssets().catch(console.error);
