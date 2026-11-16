import * as THREE from "three";
import opentype from "opentype.js";

// =============================================================================
// 1. Broadcast Background: Deep VTV3 crimson-burgundy with warm glow & vignette
// =============================================================================
function createBroadcastBackgroundTexture(width = 1920, height = 1080) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  // Base dark wine-red fill
  ctx.fillStyle = "#070002";
  ctx.fillRect(0, 0, width, height);

  // Main off-center warm crimson-burgundy glow
  const cx = width * 0.5;
  const cy = height * 0.46;
  const mainGrad = ctx.createRadialGradient(cx, cy, 30, cx, cy, width * 0.65);
  mainGrad.addColorStop(0.0, "#6a0c1d");
  mainGrad.addColorStop(0.26, "#4d0613");
  mainGrad.addColorStop(0.55, "#280209");
  mainGrad.addColorStop(0.82, "#120104");
  mainGrad.addColorStop(1.0, "#050001");
  ctx.fillStyle = mainGrad;
  ctx.fillRect(0, 0, width, height);

  // Central warm fiery golden-amber aura behind laurel wreath
  const aura = ctx.createRadialGradient(cx, cy, 10, cx, cy, width * 0.35);
  aura.addColorStop(0.0, "rgba(255, 115, 30, 0.38)");
  aura.addColorStop(0.35, "rgba(215, 50, 18, 0.20)");
  aura.addColorStop(0.70, "rgba(135, 18, 12, 0.07)");
  aura.addColorStop(1.0, "rgba(0, 0, 0, 0.0)");
  ctx.fillStyle = aura;
  ctx.fillRect(0, 0, width, height);

  // Subtle warm golden-red cloud pockets (authentic VTV3 backdrop ambiance)
  const clouds = [
    { x: width * 0.26, y: height * 0.68, r: width * 0.34, color: "rgba(150, 30, 20, 0.24)" },
    { x: width * 0.74, y: height * 0.32, r: width * 0.30, color: "rgba(140, 24, 18, 0.20)" },
    { x: width * 0.50, y: height * 0.36, r: width * 0.25, color: "rgba(190, 55, 22, 0.18)" },
  ];
  for (const c of clouds) {
    const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
    g.addColorStop(0, c.color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  }

  // Deep cinematic edge vignette
  const vig = ctx.createRadialGradient(cx, cy, width * 0.25, cx, cy, width * 0.74);
  vig.addColorStop(0.0, "rgba(0,0,0,0)");
  vig.addColorStop(0.65, "rgba(0,0,0,0.38)");
  vig.addColorStop(1.0, "rgba(0,0,0,0.86)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// =============================================================================
// 2. Optical Star Flare Texture with sharp needles and warm amber-gold core
// =============================================================================
function createOpticalStarFlareTexture(size = 512) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const half = size / 2;

  ctx.clearRect(0, 0, size, size);

  // Outer warm golden-red halo
  const halo = ctx.createRadialGradient(half, half, 0, half, half, half * 0.94);
  halo.addColorStop(0.0, "rgba(255, 255, 255, 1.0)");
  halo.addColorStop(0.08, "rgba(255, 240, 180, 0.96)");
  halo.addColorStop(0.22, "rgba(255, 165, 55, 0.60)");
  halo.addColorStop(0.48, "rgba(215, 60, 20, 0.20)");
  halo.addColorStop(1.0, "rgba(0, 0, 0, 0.0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, size, size);

  // Optical starburst rays (28 fine needles + 4 primary cross spikes)
  ctx.save();
  ctx.translate(half, half);

  for (let i = 0; i < 28; i++) {
    const angle = (i * Math.PI * 2) / 28;
    const len = half * (i % 2 === 0 ? 0.85 : 0.54);
    ctx.save();
    ctx.rotate(angle);
    const rayGrad = ctx.createLinearGradient(0, 0, len, 0);
    rayGrad.addColorStop(0.0, "rgba(255, 250, 210, 0.80)");
    rayGrad.addColorStop(0.32, "rgba(255, 195, 85, 0.32)");
    rayGrad.addColorStop(1.0, "rgba(255, 120, 20, 0.0)");
    ctx.fillStyle = rayGrad;
    ctx.beginPath();
    ctx.moveTo(0, -1.8);
    ctx.lineTo(len, 0);
    ctx.lineTo(0, 1.8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  const mainAngles = [0, Math.PI / 2, Math.PI / 4, (3 * Math.PI) / 4];
  mainAngles.forEach((angle, idx) => {
    const len = idx < 2 ? half * 0.98 : half * 0.72;
    const thickness = idx < 2 ? 4.5 : 2.8;
    ctx.save();
    ctx.rotate(angle);
    const spikeGrad = ctx.createLinearGradient(-len, 0, len, 0);
    spikeGrad.addColorStop(0.0, "rgba(255, 180, 60, 0.0)");
    spikeGrad.addColorStop(0.35, "rgba(255, 230, 140, 0.50)");
    spikeGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.98)");
    spikeGrad.addColorStop(0.65, "rgba(255, 230, 140, 0.50)");
    spikeGrad.addColorStop(1.0, "rgba(255, 180, 60, 0.0)");
    ctx.fillStyle = spikeGrad;
    ctx.beginPath();
    ctx.moveTo(-len, 0);
    ctx.lineTo(0, -thickness);
    ctx.lineTo(len, 0);
    ctx.lineTo(0, thickness);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });

  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// =============================================================================
// 3. Horizontal Anamorphic Flare Streak Texture
// =============================================================================
function createAnamorphicStreakTexture(width = 1024, height = 128) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const cx = width / 2;
  const cy = height / 2;

  ctx.clearRect(0, 0, width, height);

  const grad = ctx.createLinearGradient(0, cy, width, cy);
  grad.addColorStop(0.0, "rgba(255, 30, 40, 0.0)");
  grad.addColorStop(0.25, "rgba(255, 45, 30, 0.12)");
  grad.addColorStop(0.42, "rgba(255, 130, 50, 0.45)");
  grad.addColorStop(0.48, "rgba(255, 230, 180, 0.88)");
  grad.addColorStop(0.50, "rgba(255, 255, 255, 1.0)");
  grad.addColorStop(0.52, "rgba(255, 230, 180, 0.88)");
  grad.addColorStop(0.58, "rgba(255, 130, 50, 0.45)");
  grad.addColorStop(0.75, "rgba(255, 45, 30, 0.12)");
  grad.addColorStop(1.0, "rgba(255, 30, 40, 0.0)");

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, width * 0.49, height * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// =============================================================================
// 4. Soft Radial Sunburst Texture (No rotating mechanical fan blades!)
// =============================================================================
function createSoftSunburstTexture(size = 512) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const half = size / 2;

  ctx.clearRect(0, 0, size, size);

  // Soft atmospheric radial bloom
  const bloom = ctx.createRadialGradient(half, half, 0, half, half, half * 0.95);
  bloom.addColorStop(0.0, "rgba(255, 255, 255, 1.0)");
  bloom.addColorStop(0.12, "rgba(255, 245, 190, 0.92)");
  bloom.addColorStop(0.30, "rgba(255, 190, 70, 0.55)");
  bloom.addColorStop(0.55, "rgba(235, 75, 25, 0.22)");
  bloom.addColorStop(0.82, "rgba(160, 20, 15, 0.06)");
  bloom.addColorStop(1.0, "rgba(0, 0, 0, 0.0)");
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, size, size);

  // Soft natural sunburst needle spikes
  ctx.save();
  ctx.translate(half, half);
  const spikeCount = 36;
  for (let i = 0; i < spikeCount; i++) {
    const a = (i * Math.PI * 2) / spikeCount;
    const len = half * (0.55 + (i % 4) * 0.12);
    ctx.save();
    ctx.rotate(a);
    const grad = ctx.createLinearGradient(0, 0, len, 0);
    grad.addColorStop(0.0, "rgba(255, 250, 220, 0.70)");
    grad.addColorStop(0.35, "rgba(255, 200, 90, 0.28)");
    grad.addColorStop(1.0, "rgba(255, 110, 20, 0.0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -1.2);
    ctx.lineTo(len, 0);
    ctx.lineTo(0, 1.2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// =============================================================================
// 5. Vertical Atmospheric Beam Texture for Transition
// =============================================================================
function createVerticalBeamTexture(width = 128, height = 1024) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, width, height);

  const grad = ctx.createLinearGradient(0, 0, width, 0);
  grad.addColorStop(0.0, "rgba(255, 120, 40, 0.0)");
  grad.addColorStop(0.35, "rgba(255, 210, 100, 0.45)");
  grad.addColorStop(0.50, "rgba(255, 255, 255, 0.95)");
  grad.addColorStop(0.65, "rgba(255, 210, 100, 0.45)");
  grad.addColorStop(1.0, "rgba(255, 120, 40, 0.0)");

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// =============================================================================
// 6. Subtle Golden Bokeh Dust Texture
// =============================================================================
function createBokehParticleTexture(size = 64) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const half = size / 2;

  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0.0, "rgba(255, 248, 200, 0.95)");
  grad.addColorStop(0.38, "rgba(255, 205, 95, 0.65)");
  grad.addColorStop(0.72, "rgba(240, 135, 45, 0.22)");
  grad.addColorStop(1.0, "rgba(200, 60, 10, 0.0)");

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(half, half, half, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// =============================================================================
// 7. Authentic Olympia Laurel Wreath Canvas Processing (public/brand/olympia_laurel_2016.webp)
//    - Preserves 100% of the authentic golden leaves, berries, stems, and mathematical mountain
//    - Cleans ONLY the thin 2px arc in the empty top gap (0.342 < nx < 0.658, ny < 0.215)
//    - Harmonizes the gold color palette to match the 3D Round Title 1:1 (#b88420 -> #e2b246 -> #f7dc80)
// =============================================================================
function createMetallicGoldLaurelCanvas(img) {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = height_or_size(size);
  const ctx = canvas.getContext("2d");

  if (img && img.width > 0) {
    ctx.drawImage(img, 0, 0, size, size);
    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;

    for (let y = 0; y < size; y++) {
      const ny = y / size;
      for (let x = 0; x < size; x++) {
        const nx = x / size;
        const idx = (y * size + x) * 4;
        const a = data[idx + 3];
        if (a === 0) continue;

        // Clean ONLY the thin circular border line in the empty top-center gap between the two branches
        if (ny < 0.215 && nx > 0.342 && nx < 0.658) {
          data[idx + 3] = 0;
          continue;
        }

        // Map pixel luminance into the exact same satin champagne-gold palette as the 3D text
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const lum = Math.min(1.0, (0.299 * r + 0.587 * g + 0.114 * b) / 255);
        // Smooth gold curve lifting dark brown shadows into warm satin bronze-gold
        const t = Math.pow(lum, 0.78);
        // Shadow (#b58322: 181, 131, 34) -> Mid (#e3b549: 227, 181, 73) -> Highlight (#f7de82: 247, 222, 130)
        data[idx] = Math.min(255, Math.round(176 + 72 * t));
        data[idx + 1] = Math.min(255, Math.round(126 + 96 * t));
        data[idx + 2] = Math.min(255, Math.round(34 + 94 * t));
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }
  return canvas;
}

function height_or_size(s) {
  return s;
}

// =============================================================================
// 8. Watertight Inclined Star Crystal Trophy Geometry (1A & 2A Requirements)
//    - Monolithic star prism column lofts seamlessly from base (y = 0.55) to tilted star face
//    - Tilted star face inclined at ~58° ngửa về phía camera:
//      * 1 apex tip at (0, 5.984, -1.355) crowning spire where flare bursts
//      * 2 horizontal shoulder tips at (±1.408, 5.442, -0.488) creating flat horizontal shoulders
//      * 2 lower tips at (∓0.870, 4.566, +0.915) jutting forward towards camera
//      * 10 front diamond facets meeting at raised front-center vertex
//    - 10 continuous faceted columns along trunk, 100% watertight, single unified crystal
// =============================================================================
export function createInclinedStarCrystalTrophyGeometry() {
  const positions = [];

  const pushTri = (a, b, c) => {
    positions.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  };
  const pushQuad = (a, b, c, d) => {
    pushTri(a, b, c);
    pushTri(a, c, d);
  };

  const yStar = 5.20;
  const zStar = -0.10;
  const alpha = (58 * Math.PI) / 180;
  const cosA = Math.cos(alpha);
  const sinA = Math.sin(alpha);

  const rOut = 1.48;
  const rIn = 0.58;

  // 10 Perimeter vertices of the tilted star face
  const topRim = [];
  for (let i = 0; i < 10; i++) {
    const isTip = (i % 2 === 0);
    const r = isTip ? rOut : rIn;
    const angle = Math.PI / 2 + (i * Math.PI) / 5;
    const u = r * Math.cos(angle);
    const v = r * Math.sin(angle);
    const x = u;
    const y = yStar + v * cosA;
    const z = zStar - v * sinA;
    topRim.push([x, y, z]);
  }

  // Raised front center vertex along star face normal
  const vFrontCenter = [0, yStar + 0.14 * sinA, zStar + 0.14 * cosA];

  // 10 Diamond facets on tilted star top face
  for (let i = 0; i < 10; i++) {
    const next = (i + 1) % 10;
    pushTri(vFrontCenter, topRim[i], topRim[next]);
  }

  // Compact star base rim at y = 0.55
  const yBase = 0.55;
  const rBaseTip = 0.22;
  const rBaseNotch = 0.13;
  const baseRim = [];
  for (let i = 0; i < 10; i++) {
    const isTip = (i % 2 === 0);
    const r = isTip ? rBaseTip : rBaseNotch;
    const angle = Math.PI / 2 + (i * Math.PI) / 5;
    const x = r * Math.cos(angle);
    const z = -r * Math.sin(angle);
    baseRim.push([x, yBase, z]);
  }

  // Bottom cap
  const vBaseCenter = [0, yBase, 0];
  for (let i = 0; i < 10; i++) {
    const next = (i + 1) % 10;
    pushTri(vBaseCenter, baseRim[next], baseRim[i]);
  }

  // Loft levels from base to tilted star top
  const M = 14;
  const levels = [];
  for (let k = 0; k <= M; k++) {
    const f = k / M;
    const flare = Math.pow(f, 1.25);
    const levelRim = [];
    for (let i = 0; i < 10; i++) {
      const b = baseRim[i];
      const t = topRim[i];
      const x = b[0] + flare * (t[0] - b[0]);
      const y = b[1] + flare * (t[1] - b[1]);
      const z = b[2] + flare * (t[2] - b[2]);
      levelRim.push([x, y, z]);
    }
    levels.push(levelRim);
  }

  for (let k = 0; k < M; k++) {
    const lA = levels[k];
    const lB = levels[k + 1];
    for (let i = 0; i < 10; i++) {
      const next = (i + 1) % 10;
      pushQuad(lA[i], lB[i], lB[next], lA[next]);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.computeVertexNormals();
  return geom;
}

// Backward compatibility export alias
export const createMonolithicStarTrophyGeometry = createInclinedStarCrystalTrophyGeometry;

// =============================================================================
// 9. Pure 3D Bezier Laurel Leaf Geometry (4A Requirement: 100% Pointed Leaf Tips)
//    - Smooth continuous Bezier curves meeting at exact sharp pointed apex (0, length)
//    - Absolutely ZERO mask clipping or blunt cut edges!
// =============================================================================
export function createSingleLeafGeometry(length = 0.28, width = 0.11, depth = 0.012) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(width * 0.65, length * 0.30, width * 0.55, length * 0.75, 0, length);
  shape.bezierCurveTo(-width * 0.55, length * 0.75, -width * 0.65, length * 0.30, 0, 0);

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.005,
    bevelSize: 0.004,
    bevelSegments: 3,
  });
  geom.computeVertexNormals();
  return geom;
}

// =============================================================================
// 10. 3D Faceted Olympia Mountain Peak Geometry (4A Requirement)
//     Split-tone: Sunlit champagne left slope and warm bronze right slope
// =============================================================================
export function createMountainGeometry() {
  const leftGeom = new THREE.BufferGeometry();
  // 3 sunlit champagne facets sloping gracefully down towards left
  const leftPositions = new Float32Array([
    // Main summit facet
     0.06,  0.20, 0.08,
    -0.16,  0.06, 0.06,
     0.00, -0.32, 0.04,

    // Mid ridge facet
    -0.16,  0.06, 0.06,
    -0.34, -0.10, 0.03,
     0.00, -0.32, 0.04,

    // Outer foot facet
    -0.34, -0.10, 0.03,
    -0.50, -0.32, 0.00,
     0.00, -0.32, 0.04,
  ]);
  leftGeom.setAttribute("position", new THREE.BufferAttribute(leftPositions, 3));
  leftGeom.computeVertexNormals();

  const rightGeom = new THREE.BufferGeometry();
  // Warm bronze shaded slope on right
  const rightPositions = new Float32Array([
     0.06,  0.20, 0.08,
     0.00, -0.32, 0.04,
     0.42, -0.32, 0.00,
  ]);
  rightGeom.setAttribute("position", new THREE.BufferAttribute(rightPositions, 3));
  rightGeom.computeVertexNormals();

  return { leftGeom, rightGeom };
}

// =============================================================================
// 11. 3D Extruded Vietnamese Typography Chunk via opentype.js (5A Requirement)
//     Slim elegant thickness: depth = 0.07, bevelThickness = 0.015, bevelSize = 0.012
// =============================================================================
export function measureTextWidth(font, text, fontSize) {
  let w = 0;
  for (const ch of text) {
    const glyph = font.charToGlyph(ch);
    w += glyph.advanceWidth * (fontSize / font.unitsPerEm);
  }
  return w;
}

export function createExtrudedVietnameseTextChunk(font, text, startX, fontSize = 0.82, depth = 0.07, offsetY = 0) {
  const path = font.getPath(text, startX, 0, fontSize);
  const shapePath = new THREE.ShapePath();

  for (const cmd of path.commands) {
    if (cmd.type === "M") {
      shapePath.moveTo(cmd.x, -cmd.y + offsetY);
    } else if (cmd.type === "L") {
      shapePath.lineTo(cmd.x, -cmd.y + offsetY);
    } else if (cmd.type === "Q") {
      shapePath.quadraticCurveTo(cmd.x1, -cmd.y1 + offsetY, cmd.x, -cmd.y + offsetY);
    } else if (cmd.type === "C") {
      shapePath.bezierCurveTo(cmd.x1, -cmd.y1 + offsetY, cmd.x2, -cmd.y2 + offsetY, cmd.x, -cmd.y + offsetY);
    } else if (cmd.type === "Z") {
      shapePath.closePath();
    }
  }

  const shapes = shapePath.toShapes(true);
  const geom = new THREE.ExtrudeGeometry(shapes, {
    depth: 0.07,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.012,
    bevelSegments: 3,
  });

  geom.computeBoundingBox();
  return geom;
}

export const ROUND_CONFIGS = {
  khoiDong: {
    label: "KHỞI ĐỘNG",
    fontSize: 0.62,
    filename: "khoi_dong.webm",
    legacyName: "intro_khoiDong.webm",
    chunks: ["KHỞI ", "ĐỘ", "NG"],
  },
  vcnv: {
    label: "VƯỢT CHƯỚNG NGẠI VẬT",
    fontSize: 0.48,
    filename: "vuot_chuong_ngai_vat.webm",
    legacyName: "intro_vuotChuongNgaiVat.webm",
    multilineChunks: [
      { text: "VƯỢT", line: 0 },
      { text: "CHƯỚNG ", line: 1 },
      { text: "NGẠI VẬT", line: 1 },
    ],
  },
  tangToc: {
    label: "TĂNG TỐC",
    fontSize: 0.64,
    filename: "tang_toc.webm",
    legacyName: "intro_tangToc.webm",
    chunks: ["TĂ", "NG ", "TỐC"],
  },
  veDich: {
    label: "VỀ ĐÍCH",
    fontSize: 0.65,
    filename: "ve_dich.webm",
    legacyName: "intro_veDich.webm",
    chunks: ["VỀ ", "ĐÍ", "CH"],
  },
};

export class OlympiaIntroScene {
  constructor(canvas, fontBuffer, laurelImageSrc, roundKey = "khoiDong") {
    this.canvas = canvas;
    this.roundKey = roundKey;
    this.config = ROUND_CONFIGS[roundKey] || ROUND_CONFIGS.khoiDong;
    this.laurelImageSrc = laurelImageSrc;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setSize(1920, 1080);
    this.renderer.setPixelRatio(1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1920 / 1080, 0.1, 100);
    this.scene.add(this.camera);

    this.initStudioEnvironment();
    this.font = opentype.parse(fontBuffer);

    this.initBackground();
    this.initBokehParticles();
    this.initCrystalTrophy();
    this.initPhase3Elements(laurelImageSrc);
    this.initLighting();
  }

  initStudioEnvironment() {
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x0e1117);

    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const coolSilverMat = new THREE.MeshBasicMaterial({ color: 0xdde7f8 });
    const darkSlateMat = new THREE.MeshBasicMaterial({ color: 0x141820 });

    const strip1 = new THREE.Mesh(new THREE.PlaneGeometry(4, 18), whiteMat);
    strip1.position.set(5, 4, 6);
    strip1.lookAt(0, 0, 0);
    envScene.add(strip1);

    const strip2 = new THREE.Mesh(new THREE.PlaneGeometry(5, 18), coolSilverMat);
    strip2.position.set(-6, 3, 5);
    strip2.lookAt(0, 0, 0);
    envScene.add(strip2);

    const strip3 = new THREE.Mesh(new THREE.PlaneGeometry(14, 4), whiteMat);
    strip3.position.set(0, 9, 2);
    strip3.lookAt(0, 0, 0);
    envScene.add(strip3);

    const darkPanel = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), darkSlateMat);
    darkPanel.position.set(0, 0, -8);
    darkPanel.lookAt(0, 0, 0);
    envScene.add(darkPanel);

    const pmremGen = new THREE.PMREMGenerator(this.renderer);
    this.envMap = pmremGen.fromScene(envScene, 0.02).texture;
    pmremGen.dispose();
    this.scene.environment = this.envMap;
  }

  initBackground() {
    const bgTexture = createBroadcastBackgroundTexture(1920, 1080);
    const bgGeom = new THREE.PlaneGeometry(46, 26);
    const bgMat = new THREE.MeshBasicMaterial({ map: bgTexture, depthWrite: false });
    this.bgMesh = new THREE.Mesh(bgGeom, bgMat);
    this.bgMesh.position.set(0, 0, -28);
    this.camera.add(this.bgMesh);
  }

  initBokehParticles() {
    const particleCount = 260;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    this.particleMeta = [];

    for (let i = 0; i < particleCount; i++) {
      const x = (Math.random() - 0.5) * 16;
      const y = (Math.random() - 0.5) * 11;
      const z = (Math.random() - 0.5) * 8 - 3.5;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      this.particleMeta.push({
        origX: x,
        origY: y,
        origZ: z,
        vy: 0.14 + Math.random() * 0.25,
        driftAmp: 0.06 + Math.random() * 0.15,
        driftFreq: 0.7 + Math.random() * 1.1,
        phase: Math.random() * Math.PI * 2,
      });
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const bokehTex = createBokehParticleTexture(64);
    this.bokehMaterial = new THREE.PointsMaterial({
      size: 0.22,
      map: bokehTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.58,
      color: 0xffd275,
    });

    this.bokehPoints = new THREE.Points(geometry, this.bokehMaterial);
    this.scene.add(this.bokehPoints);
  }

  initCrystalTrophy() {
    this.trophyGroup = new THREE.Group();

    // 2A: Transparent Refractive Glass Material
    // transparent: true, opacity: 0.82, transmission: 0.85, roughness: 0.06, ior: 1.62
    // ZERO flatShading, ZERO black blotches! DoubleSide, depthWrite: false
    this.crystalMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.04,
      roughness: 0.06,
      transmission: 0.85,
      thickness: 1.25,
      transparent: true,
      opacity: 0.82,
      ior: 1.62,
      reflectivity: 0.90,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      flatShading: false,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.crystalEdgeMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.55,
    });

    // =========================================================================
    // 1. Crystal Base Pedestal (Compact, ~15% screen height at bottom)
    // =========================================================================
    this.baseGroup = new THREE.Group();
    this.baseGroup.position.set(0, 0, 0);

    // Circular bottom disc
    const baseDiscGeom = new THREE.CylinderGeometry(0.48, 0.58, 0.06, 32);
    const baseDiscMesh = new THREE.Mesh(baseDiscGeom, this.crystalMaterial);
    baseDiscMesh.position.set(0, 0.04, 0);
    const discEdges = new THREE.LineSegments(new THREE.EdgesGeometry(baseDiscGeom, 15), this.crystalEdgeMat);
    baseDiscMesh.add(discEdges);
    this.baseGroup.add(baseDiscMesh);

    // Crystal sphere globe
    const globeGeom = new THREE.SphereGeometry(0.28, 32, 24);
    const globeMesh = new THREE.Mesh(globeGeom, this.crystalMaterial);
    globeMesh.position.set(0, 0.28, 0);
    this.baseGroup.add(globeMesh);

    // Gold accent ring around equator of sphere
    const equatorRingGeom = new THREE.TorusGeometry(0.285, 0.012, 10, 36);
    const equatorRingMat = new THREE.MeshBasicMaterial({ color: 0xffdf70, transparent: true, opacity: 0.95 });
    const equatorRing = new THREE.Mesh(equatorRingGeom, equatorRingMat);
    equatorRing.rotation.x = Math.PI / 2;
    equatorRing.position.set(0, 0.28, 0);
    this.baseGroup.add(equatorRing);

    // Tapered neck connecting sphere to star trunk
    const neckGeom = new THREE.CylinderGeometry(0.18, 0.22, 0.08, 20);
    const neckMesh = new THREE.Mesh(neckGeom, this.crystalMaterial);
    neckMesh.position.set(0, 0.51, 0);
    const neckEdges = new THREE.LineSegments(new THREE.EdgesGeometry(neckGeom, 15), this.crystalEdgeMat);
    neckMesh.add(neckEdges);
    this.baseGroup.add(neckMesh);

    this.trophyGroup.add(this.baseGroup);

    // =========================================================================
    // 2. Monolithic Inclined Star Crystal Trophy Geometry (1A & 2A)
    // =========================================================================
    const trophyGeom = createInclinedStarCrystalTrophyGeometry();
    this.trophyMesh = new THREE.Mesh(trophyGeom, this.crystalMaterial);
    const trophyEdges = new THREE.LineSegments(new THREE.EdgesGeometry(trophyGeom, 14), this.crystalEdgeMat);
    this.trophyMesh.add(trophyEdges);
    this.trophyGroup.add(this.trophyMesh);

    // =========================================================================
    // 3. Central Vertical Golden Laser Beam along Front Spine Groove (0.55 -> Apex)
    // =========================================================================
    const laserPoints = [];
    const nSegs = 20;
    const yStar = 5.20;
    const zStar = -0.10;
    const alpha = (58 * Math.PI) / 180;
    const cosA = Math.cos(alpha);
    const sinA = Math.sin(alpha);
    const apexX = 0;
    const apexY = yStar + 1.48 * cosA;
    const apexZ = zStar - 1.48 * sinA;

    for (let i = 0; i <= nSegs; i++) {
      const frac = i / nSegs;
      const flare = Math.pow(frac, 1.25);
      const ly = 0.55 + frac * (apexY - 0.55);
      const lz = 0.13 * (1.0 - flare) + (zStar + 0.14 * cosA) * flare;
      laserPoints.push(new THREE.Vector3(0, ly, lz + 0.01));
    }
    laserPoints.push(new THREE.Vector3(apexX, apexY, apexZ + 0.02));

    const laserGeom = new THREE.BufferGeometry().setFromPoints(laserPoints);
    const laserLineMat = new THREE.LineBasicMaterial({
      color: 0xffe680,
      linewidth: 2,
      transparent: true,
      opacity: 0.95,
    });
    const laserLine = new THREE.Line(laserGeom, laserLineMat);
    this.trophyGroup.add(laserLine);

    // =========================================================================
    // 4. Ascending Golden Light Beads along Diamond Facet Ridges
    // =========================================================================
    const beadGeom = new THREE.BoxGeometry(0.024, 0.10, 0.024);
    const beadMat = new THREE.MeshBasicMaterial({ color: 0xffd24d });
    this.beadMeshes = [];
    const tip2X = -0.870;
    const tip2Y = yStar - 1.197 * cosA;
    const tip2Z = zStar + 1.197 * sinA;
    const tip3X = 0.870;
    const tip3Y = tip2Y;
    const tip3Z = tip2Z;

    const ridgePaths = [
      { startX: -0.22, startY: 0.55, startZ: 0.05, endX: tip2X, endY: tip2Y, endZ: tip2Z },
      { startX:  0.22, startY: 0.55, startZ: 0.05, endX: tip3X, endY: tip3Y, endZ: tip3Z },
      { startX: -0.15, startY: 0.55, startZ: -0.10, endX: -1.408, endY: 5.442, endZ: -0.488 },
      { startX:  0.15, startY: 0.55, startZ: -0.10, endX:  1.408, endY: 5.442, endZ: -0.488 },
    ];

    for (let c = 0; c < ridgePaths.length; c++) {
      const rp = ridgePaths[c];
      for (let b = 0; b < 12; b++) {
        const bead = new THREE.Mesh(beadGeom, beadMat);
        this.trophyGroup.add(bead);
        this.beadMeshes.push({
          mesh: bead,
          rp,
          baseFrac: b / 12,
        });
      }
    }

    // =========================================================================
    // 5. Optical Star Flare & Anamorphic Streak at Apex Tip
    // =========================================================================
    const starFlareTex = createOpticalStarFlareTexture(512);
    this.starTipFlareMat = new THREE.SpriteMaterial({
      map: starFlareTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.0,
    });
    this.starTipFlare = new THREE.Sprite(this.starTipFlareMat);
    this.starTipFlare.position.set(apexX, apexY, apexZ + 0.08);
    this.starTipFlare.scale.set(1.6, 1.6, 1);
    this.trophyGroup.add(this.starTipFlare);

    const anamorphicTex = createAnamorphicStreakTexture(1024, 128);
    this.anamorphicMat = new THREE.SpriteMaterial({
      map: anamorphicTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.0,
    });
    this.anamorphicStreak = new THREE.Sprite(this.anamorphicMat);
    this.anamorphicStreak.position.set(apexX, apexY, apexZ + 0.10);
    this.anamorphicStreak.scale.set(8.5, 0.35, 1);
    this.trophyGroup.add(this.anamorphicStreak);

    // Vertical atmospheric light column connecting transition
    const verticalBeamTex = createVerticalBeamTexture(128, 1024);
    this.verticalBeamMat = new THREE.MeshBasicMaterial({
      map: verticalBeamTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.0,
    });
    this.verticalBeamMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 14), this.verticalBeamMat);
    this.verticalBeamMesh.position.set(0, 3.5, 0.05);
    this.scene.add(this.verticalBeamMesh);

    this.scene.add(this.trophyGroup);
  }

  initPhase3Elements(laurelImageSrc) {
    this.phase3Group = new THREE.Group();
    this.phase3Group.position.set(0, 0, 0);

    // =========================================================================
    // Laurel Wreath + Mountain Emblem (Authentic olympia_laurel_2016.webp)
    // =========================================================================
    this.emblemGroup = new THREE.Group();
    this.emblemGroup.position.set(0, 0.56, 0);
    this.phase3Group.add(this.emblemGroup);

    // 1. Soft Radial Sunburst behind/at the Mountain Peak (NO mechanical fan blades!)
    const sunburstTex = createSoftSunburstTexture(512);
    this.sunMat = new THREE.SpriteMaterial({
      map: sunburstTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.0,
    });
    this.sunSprite = new THREE.Sprite(this.sunMat);
    // Aligned precisely with the highest peak of the Olympia mountain inside olympia_laurel_2016.webp
    this.sunSprite.position.set(0.11, 0.24, 0.08);
    this.sunSprite.scale.set(1.22, 1.22, 1);
    this.emblemGroup.add(this.sunSprite);

    // 2. Authentic Olympia Laurel Wreath + Mountain (public/brand/olympia_laurel_2016.webp)
    //    Mounted on a 48x48 subdivided 3D mesh with custom ShaderMaterial so that:
    //    - From 3.0s to 4.1s, the laurel leaves flip/unfold open sequentially from bottom stem (v=0) to top tips (v=1)
    //    - Displays 100% of the authentic olympia_laurel_2016.webp artwork (with mathematical mountain & real leaves)
    const dummyCanvas = document.createElement("canvas");
    dummyCanvas.width = 64;
    dummyCanvas.height = 64;
    const initialTex = new THREE.CanvasTexture(dummyCanvas);

    this.laurelUniforms = {
      uMap: { value: initialTex },
      uUnfoldProgress: { value: 0.0 },
      uOpacity: { value: 0.0 },
      uSheenPos: { value: -2.0 },
    };

    this.laurelShaderMat = new THREE.ShaderMaterial({
      uniforms: this.laurelUniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader: `
        uniform float uUnfoldProgress;
        varying vec2 vUv;
        varying float vLeafReveal;

        void main() {
          vUv = uv;
          vec3 pos = position;

          // Normalize vertical progression from bottom stem (v = 0.06) to top tips (v = 0.86)
          float vNorm = clamp((uv.y - 0.06) / 0.80, 0.0, 1.0);

          // Wavefront sweeps from bottom (0.0) to top (1.0) as uUnfoldProgress goes 0 -> 1
          float localUnfold = smoothstep(0.0, 1.0, (uUnfoldProgress * 1.45 - vNorm) / 0.45);
          vLeafReveal = localUnfold;

          // 3D leaf flip/unfold effect: outer laurel branches curl/flip open from the stem outward
          float distFromCenter = abs(uv.x - 0.5);
          float sideSign = uv.x < 0.5 ? -1.0 : 1.0;
          float foldAmount = 1.0 - localUnfold;

          // Branch stem path approximation in UV space
          float stemX = 0.5 + sideSign * sin(vNorm * 3.14159 * 0.85) * 0.34;
          float leafOffset = uv.x - stemX;

          // While unfolding, leaves rotate/flip out around their branch stem and lift in Z
          float flipAngle = foldAmount * 1.45;
          if (distFromCenter > 0.14 || vNorm > 0.62) {
            pos.x -= leafOffset * (1.0 - cos(flipAngle)) * 0.85;
            pos.z += abs(leafOffset) * sin(flipAngle) * 1.35 + foldAmount * 0.18;
            pos.y -= foldAmount * 0.08;
          }

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        uniform float uOpacity;
        uniform float uSheenPos;
        varying vec2 vUv;
        varying float vLeafReveal;

        void main() {
          vec4 texColor = texture2D(uMap, vUv);
          if (texColor.a < 0.04) discard;

          // Smooth bottom-to-top reveal matching the 3D leaf flip wave
          float alpha = texColor.a * uOpacity * smoothstep(0.0, 0.25, vLeafReveal);
          if (alpha < 0.02) discard;

          // Warm golden specular sheen & flip highlight matching 3D text gold
          float flipGlow = (1.0 - vLeafReveal) * 0.25;
          float sheenDist = abs((vUv.x + vUv.y * 0.4) - uSheenPos);
          float sheen = smoothstep(0.18, 0.0, sheenDist) * 0.22;

          vec3 finalRgb = texColor.rgb * 0.96 + vec3(0.96, 0.84, 0.46) * (flipGlow + sheen);
          gl_FragColor = vec4(finalRgb, alpha);
        }
      `,
    });

    const laurelPlaneGeom = new THREE.PlaneGeometry(1.62, 1.62, 48, 48);
    this.laurelMesh = new THREE.Mesh(laurelPlaneGeom, this.laurelShaderMat);
    this.laurelMesh.position.set(0, 0.02, 0);
    this.emblemGroup.add(this.laurelMesh);

    if (laurelImageSrc) {
      this.readyPromise = new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const goldCanvas = createMetallicGoldLaurelCanvas(img);
          const goldTex = new THREE.CanvasTexture(goldCanvas);
          goldTex.needsUpdate = true;
          this.laurelUniforms.uMap.value = goldTex;
          resolve(true);
        };
        img.onerror = () => resolve(false);
        img.src = laurelImageSrc;
      });
    } else {
      this.readyPromise = Promise.resolve(true);
    }

    // =========================================================================
    // 3. Staggered 3D Extruded Satin-Gold Typography (5A Requirement)
    //    Matched 1:1 in color with the Laurel Wreath (#e3b549 front & #a8761c bevel)
    // =========================================================================
    const frontMat = new THREE.MeshStandardMaterial({
      color: 0xdca83a, // Matched 1:1 warm satin gold
      metalness: 0.35,
      roughness: 0.30,
      emissive: 0x4d3306,
      emissiveIntensity: 0.16,
    });

    const sideMat = new THREE.MeshStandardMaterial({
      color: 0x996612, // Matched warm bronze bevel
      metalness: 0.45,
      roughness: 0.34,
      emissive: 0x331c03,
      emissiveIntensity: 0.14,
    });

    this.textGroup = new THREE.Group();
    this.textGroup.position.set(0, -0.68, 0);

    const label = this.config.label;
    const fontSize = this.config.fontSize;
    this.textChunks = [];

    if (this.config.multilineChunks) {
      // 2-Line centered layout (e.g. Line 0: "VƯỢT", Line 1: "CHƯỚNG NGẠI VẬT")
      const line0Text = this.config.multilineChunks.filter((m) => m.line === 0).map((m) => m.text).join("");
      const line1Text = this.config.multilineChunks.filter((m) => m.line === 1).map((m) => m.text).join("");
      const w0 = measureTextWidth(this.font, line0Text, fontSize);
      const w1 = measureTextWidth(this.font, line1Text, fontSize);
      let curX0 = -w0 / 2;
      let curX1 = -w1 / 2;

      for (const item of this.config.multilineChunks) {
        const isLine0 = item.line === 0;
        const chunkStartX = isLine0 ? curX0 : curX1;
        const chunkW = measureTextWidth(this.font, item.text, fontSize);
        if (isLine0) curX0 += chunkW;
        else curX1 += chunkW;

        const offsetY = isLine0 ? 0.16 : -0.44;
        const chunkGeom = createExtrudedVietnameseTextChunk(this.font, item.text, chunkStartX, fontSize, 0.07, offsetY);
        const chunkGroup = new THREE.Group();
        const mesh = new THREE.Mesh(chunkGeom, [frontMat, sideMat]);
        chunkGroup.add(mesh);
        this.textGroup.add(chunkGroup);
        this.textChunks.push(chunkGroup);
      }
    } else {
      const totalWidth = measureTextWidth(this.font, label, fontSize);
      const chunks = this.config.chunks || [label];
      let curX = -totalWidth / 2;

      for (let c = 0; c < chunks.length; c++) {
        const chunkStr = chunks[c];
        const chunkStartX = curX;
        const chunkWidth = measureTextWidth(this.font, chunkStr, fontSize);
        curX += chunkWidth;

        const chunkGeom = createExtrudedVietnameseTextChunk(this.font, chunkStr, chunkStartX, fontSize, 0.07, 0);
        const chunkGroup = new THREE.Group();

        const mesh = new THREE.Mesh(chunkGeom, [frontMat, sideMat]);
        chunkGroup.add(mesh);

        this.textGroup.add(chunkGroup);
        this.textChunks.push(chunkGroup);
      }
    }

    this.textGroup.visible = false;
    this.phase3Group.add(this.textGroup);

    this.scene.add(this.phase3Group);
  }

  initLighting() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    this.scene.add(this.ambientLight);

    // Crystal key light
    this.keyLight = new THREE.DirectionalLight(0xffffff, 1.9);
    this.keyLight.position.set(4, 7, 8);
    this.scene.add(this.keyLight);

    // Cool silver facet light
    this.fillLight = new THREE.DirectionalLight(0xdde8ff, 1.35);
    this.fillLight.position.set(-6, 4, 6);
    this.scene.add(this.fillLight);

    // Balanced Frontal Direct Light for rich metallic gold 3D typography (not overexposed white)
    this.frontLight = new THREE.DirectionalLight(0xffe6a3, 1.25);
    this.frontLight.position.set(0, 1, 7);
    this.scene.add(this.frontLight);

    // Uplight for warm bronze bevel brilliance
    this.textUpLight = new THREE.DirectionalLight(0xffca55, 0.85);
    this.textUpLight.position.set(0, -3, 5);
    this.scene.add(this.textUpLight);

    // Specular sheen spotlight sweeping across the gold title
    this.sheenSpotlight = new THREE.PointLight(0xfff2bb, 0.0, 14);
    this.sheenSpotlight.position.set(-8, -0.76, 2.2);
    this.scene.add(this.sheenSpotlight);
  }

  update(timeSec) {
    const t = Math.max(0, Math.min(timeSec, 7.656));

    // 1. Animate background bokeh dust particles
    const positions = this.bokehPoints.geometry.attributes.position.array;
    for (let i = 0; i < this.particleMeta.length; i++) {
      const meta = this.particleMeta[i];
      let y = meta.origY + t * meta.vy;
      if (y > 5.5) y = -5.5 + ((y - 5.5) % 11.0);
      const x = meta.origX + Math.sin(t * meta.driftFreq + meta.phase) * meta.driftAmp;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
    }
    this.bokehPoints.geometry.attributes.position.needsUpdate = true;

    // =========================================================================
    // PHASE 1: 0.0s – 3.25s: CONTINUOUS NON-STOP SINKING of Inclined Star Trophy (3A)
    // Sinking steadily and smoothly from 0.0s to 3.25s with non-zero downward velocity!
    // Apex crosses screen center at ~2.7s with optical flare, exits bottom at ~3.2s
    // =========================================================================
    if (t < 3.28) {
      this.trophyGroup.visible = true;

      // Continuous downward momentum function: derivative < 0 everywhere, never pauses!
      const sink = -0.75 * t - 0.28 * t * t - (t > 2.40 ? 5.5 * Math.pow(t - 2.40, 2.4) : 0);
      this.trophyGroup.position.set(0, sink, 0);

      // Rotation around Y: faces camera squarely at ~2.70s
      const rotProg = Math.min(1.0, t / 2.70);
      this.trophyGroup.rotation.y = (1.0 - Math.pow(rotProg, 1.4)) * 1.8;

      // Camera view during trophy phase: Downward tilt (~15.1° downward pitch)
      if (t < 2.80) {
        const camProg = Math.min(1.0, t / 2.80);
        this.camera.position.set(0.15 * (1.0 - camProg), 2.20, 5.0);
        this.camera.lookAt(0, 0.85, 0);
      }

      // Animate ascending golden beads along diamond facet ridges
      for (const b of this.beadMeshes) {
        const frac = (b.baseFrac + t * 0.45) % 1.0;
        const bx = b.rp.startX + frac * (b.rp.endX - b.rp.startX);
        const by = b.rp.startY + frac * (b.rp.endY - b.rp.startY);
        const bz = b.rp.startZ + frac * (b.rp.endZ - b.rp.startZ);
        b.mesh.position.set(bx, by, bz);
      }

      // Pinpoint Apex Flare & Anamorphic Streak (ignites at 2.45s, peaks at 2.65s - 2.80s)
      if (t >= 2.45 && t <= 3.20) {
        const flareIn = Math.min(1.0, (t - 2.45) / 0.22);
        const flareOut = t > 2.80 ? Math.max(0.0, 1.0 - (t - 2.80) / 0.38) : 1.0;
        const flareAlpha = flareIn * flareOut;

        this.starTipFlareMat.opacity = flareAlpha;
        const starPulse = 1.6 + (t > 2.65 ? (t - 2.65) * 1.8 : 0);
        this.starTipFlare.scale.set(starPulse, starPulse, 1);

        this.anamorphicMat.opacity = flareAlpha * 0.95;
        this.anamorphicStreak.scale.set(8.5 + (t - 2.45) * 2.5, 0.35, 1);
      } else {
        this.starTipFlareMat.opacity = 0.0;
        this.anamorphicMat.opacity = 0.0;
      }
    } else {
      this.trophyGroup.visible = false;
    }

    // Vertical atmospheric beam during transition (2.65s - 3.45s)
    if (t >= 2.65 && t <= 3.45) {
      const beamProg = (t - 2.65) / 0.80;
      const beamAlpha = Math.sin(beamProg * Math.PI) * 0.80;
      this.verticalBeamMat.opacity = beamAlpha;
    } else {
      this.verticalBeamMat.opacity = 0.0;
    }

    // =========================================================================
    // PHASE 2 & 3: 2.80s – 7.656s:
    // Camera transitions smoothly to Phase 3 view (0, 0.45, 5.2)
    // Laurel Emblem & 3D Typography Fly-In + Sequential Unfold + Zoom-in
    // =========================================================================
    if (t >= 2.80) {
      this.phase3Group.visible = true;

      // Smooth camera transition to Phase 3 view
      const camProg = Math.min(1.0, (t - 2.80) / 0.65);
      const easeCam = 1.0 - Math.pow(1.0 - camProg, 3);
      this.camera.position.set(0, 2.20 - easeCam * 1.75, 5.0 + easeCam * 0.20);
      this.camera.lookAt(0, 0.85 - easeCam * 0.85, 0);

      // 1. Laurel Wreath + Mountain Emblem Fly-In from Above (2.95s - 3.58s)
      //    Once settled at 3.58s, stays 100% locked in harmony with the 3D text (no zoom drift!)
      const flyProg = Math.min(1.0, Math.max(0.0, (t - 2.95) / 0.63));
      const easeFly = 1.0 - Math.pow(1.0 - flyProg, 3);

      const emblemY = 2.6 - easeFly * (2.6 - 0.56);
      const emblemZ = -0.8 + easeFly * 0.8;
      const tiltX = -0.36 + easeFly * (-0.12 - (-0.36));
      this.emblemGroup.position.set(0, emblemY, emblemZ);
      this.emblemGroup.rotation.set(tiltX, 0, 0);
      this.emblemGroup.scale.set(1.0, 1.0, 1.0);

      // 2. Authentic olympia_laurel_2016.webp Sequential Leaf Unfold from Bottom to Top (2.95s -> 4.05s)
      const unfoldProg = Math.min(1.0, Math.max(0.0, (t - 2.95) / 1.05));
      this.laurelUniforms.uUnfoldProgress.value = unfoldProg;
      this.laurelUniforms.uOpacity.value = Math.min(1.0, Math.max(0.0, (t - 2.92) / 0.25));
      if (t >= 5.0 && t <= 6.8) {
        this.laurelUniforms.uSheenPos.value = -0.3 + ((t - 5.0) / 1.8) * 2.0;
      } else {
        this.laurelUniforms.uSheenPos.value = -2.0;
      }

      // Soft Radial Sunburst pulse on mountain peak
      const sunAlpha = Math.min(1.0, Math.max(0.0, (t - 3.10) / 0.45));
      const sunPulse = 1.12 + (t > 3.58 ? Math.sin((t - 3.58) * 3.5) * 0.04 : 0);
      this.sunSprite.scale.set(sunPulse, sunPulse, 1);
      this.sunMat.opacity = sunAlpha * 0.94;

      // 3. Staggered 3D Typography Fly-In (3.05s – 3.55s)
      if (t >= 3.05) {
        this.textGroup.visible = true;

        // Chunk 0 (Left): Flies in from top-left (3.05s - 3.42s)
        if (this.textChunks[0]) {
          const prog0 = Math.min(1.0, (t - 3.05) / 0.37);
          const ease0 = 1.0 - Math.pow(1.0 - prog0, 3);
          this.textChunks[0].position.set(
            -0.45 * (1.0 - ease0),
            2.20 * (1.0 - ease0),
            1.60 * (1.0 - ease0)
          );
          this.textChunks[0].rotation.x = 0.35 * (1.0 - ease0);
        }

        // Chunk 1 (Center): Flies up from bottom-center (3.12s - 3.50s)
        if (this.textChunks[1]) {
          const prog1 = Math.min(1.0, Math.max(0.0, (t - 3.12) / 0.38));
          const ease1 = 1.0 - Math.pow(1.0 - prog1, 3);
          this.textChunks[1].position.set(
            0,
            -2.40 * (1.0 - ease1),
            1.30 * (1.0 - ease1)
          );
          this.textChunks[1].rotation.x = -0.55 * (1.0 - ease1);
        }

        // Chunk 2 (Right): Flies in from bottom-right (3.20s - 3.58s)
        if (this.textChunks[2]) {
          const prog2 = Math.min(1.0, Math.max(0.0, (t - 3.20) / 0.38));
          const ease2 = 1.0 - Math.pow(1.0 - prog2, 3);
          this.textChunks[2].position.set(
            0.65 * (1.0 - ease2),
            -1.80 * (1.0 - ease2),
            1.10 * (1.0 - ease2)
          );
          this.textChunks[2].rotation.y = -0.35 * (1.0 - ease2);
        }

        // 4. Post-Fly-In Locked Presentation (3.58s – 7.656s):
        //    100% locked in harmony with the Laurel Wreath (no independent scaling/zoom)
        if (t >= 3.58) {
          this.textGroup.scale.set(1.0, 1.0, 1.0);
          this.textGroup.position.set(0, -0.68, 0);

          // Specular sheen spotlight sweeping across the gold title (5.0s - 6.8s)
          if (t >= 5.0 && t <= 6.8) {
            const sheenProg = (t - 5.0) / 1.8;
            const sheenX = -7.5 + sheenProg * 15.0;
            this.sheenSpotlight.position.set(sheenX, -0.68, 2.2);
            this.sheenSpotlight.intensity = Math.sin(sheenProg * Math.PI) * 3.8;
          } else {
            this.sheenSpotlight.intensity = 0.0;
          }
        }
      } else {
        this.textGroup.visible = false;
      }
    } else {
      this.phase3Group.visible = false;
    }
  }

  render(timeSec) {
    this.update(timeSec);
    this.renderer.render(this.scene, this.camera);
  }
}
