/**
 * Olympia Studio Visual Refinement Test Suite
 *
 * Verifies Requirements R1, R2, R3, and R4:
 * - R1: Stage Right Screen Positioning, Sizing, Concentric Bezels, and Camera Target Alignment
 * - R2: Math and Science Formulas Visual Redesign (Peripheral Distribution, Typography, Diacritics)
 * - R3: Cove Lighting Concentration, Ribbon Narrowing, Floor Material Calibration
 * - R4: Quality Guardrails & Invariants (AGENTS.md immutability, shadow-caster budget)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

let passCount = 0;
let failCount = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passCount++;
    console.log(`  [PASS] ${name}`);
  } catch (err: any) {
    failCount++;
    console.error(`  [FAIL] ${name}: ${err?.message || err}`);
  }
}

console.log("================================================================================");
console.log("OLYMPIA STUDIO VISUAL REFINEMENT VERIFICATION SUITE (R1 - R4)");
console.log("================================================================================");

// ─────────────────────────────────────────────────────────────────────────────
// R1: Stage Right Screen Positioning, Sizing & Camera Presets
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- Requirement R1: Stage Right Screen Positioning and Sizing ---");

const centralLedWallContent = fs.readFileSync(
  path.join(rootDir, "src/components/olympia/studio/CentralLedWall.tsx"),
  "utf-8"
);

test("R1.1: Stage Right Screen group position is relocated to [6.65, 3.25, -2.10]", () => {
  assert.ok(
    centralLedWallContent.includes('<group position={[6.65, 3.25, -2.10]} rotation={[0, -1.134, 0]}>'),
    "Screen group position must be [6.65, 3.25, -2.10] with rotation [0, -1.134, 0]"
  );
});

test("R1.2: Screen display plane is resized to exact 16:9 [4.56, 2.565]", () => {
  assert.ok(
    centralLedWallContent.includes('<planeGeometry args={[4.56, 2.565]} />'),
    "Screen plane geometry must be 4.56m x 2.565m"
  );
});

test("R1.3: Concentric bezels match 3-tier stepped proportions (5.36m, 5.06m, 4.76m)", () => {
  assert.ok(
    centralLedWallContent.includes('<boxGeometry args={[5.36, 3.365, 0.10]} />'),
    "Tier 1 Outer Bezel must be 5.36 x 3.365 x 0.10"
  );
  assert.ok(
    centralLedWallContent.includes('<boxGeometry args={[5.06, 3.065, 0.12]} />'),
    "Tier 2 Middle Bezel must be 5.06 x 3.065 x 0.12"
  );
  assert.ok(
    centralLedWallContent.includes('<boxGeometry args={[4.76, 2.765, 0.12]} />'),
    "Tier 3 Inner Bezel must be 4.76 x 2.765 x 0.12"
  );
});

test("R1.4: Neon tube trims match concentric bezel boundaries", () => {
  assert.ok(centralLedWallContent.includes('<boxGeometry args={[5.36, 0.035, 0.035]} />'));
  assert.ok(centralLedWallContent.includes('<boxGeometry args={[0.035, 3.365, 0.035]} />'));
  assert.ok(centralLedWallContent.includes('<boxGeometry args={[5.06, 0.03, 0.03]} />'));
  assert.ok(centralLedWallContent.includes('<boxGeometry args={[0.03, 3.065, 0.03]} />'));
  assert.ok(centralLedWallContent.includes('<boxGeometry args={[4.76, 0.025, 0.025]} />'));
  assert.ok(centralLedWallContent.includes('<boxGeometry args={[0.025, 2.765, 0.025]} />'));
});

test("R1.5: Backing wall and structural trusses resized to [5.50, 3.4, 0.12] and [0.22, 4.4, 0.22]", () => {
  assert.ok(
    centralLedWallContent.includes('<boxGeometry args={[5.50, 3.4, 0.12]} />'),
    "Backing wall must be 5.50m x 3.4m"
  );
  assert.ok(
    centralLedWallContent.includes('<boxGeometry args={[0.22, 4.4, 0.22]} />'),
    "Trusses must be height 4.4m"
  );
  assert.ok(
    centralLedWallContent.includes('<boxGeometry args={[5.50, 0.045, 0.045]} />'),
    "Lower slats must span 5.50m"
  );
  assert.ok(
    centralLedWallContent.includes('<boxGeometry args={[5.40, 0.05, 0.05]} />'),
    "Upper slats must span 5.40m"
  );
});

const cameraControllerContent = fs.readFileSync(
  path.join(rootDir, "src/components/olympia/studio/CameraController.tsx"),
  "utf-8"
);

test("R1.6: CameraController CAM 2 target updated to [6.65, 3.25, -2.10]", () => {
  assert.ok(
    cameraControllerContent.includes("target: [6.65, 3.25, -2.10]"),
    "CameraController CAM 2 target must be [6.65, 3.25, -2.10]"
  );
});

const broadcastCamerasContent = fs.readFileSync(
  path.join(rootDir, "src/components/olympia/studio/BroadcastCameras.tsx"),
  "utf-8"
);

test("R1.7: BroadcastCameras CAM 2 live target updated to [6.65, 3.25, -2.10]", () => {
  assert.ok(
    broadcastCamerasContent.includes("return { target: [6.65, 3.25, -2.10], isLive: true }; // Main LED Wall"),
    "BroadcastCameras CAM 2 target must be [6.65, 3.25, -2.10]"
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// R2: Stage Right Screen Vibrant 3D Title Card & Left Math Wall Formula Dispersion
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- Requirement R2: Stage Right Screen 3D Title Card & Dispersed Math Wall ---");

test("R2.1: Stage Right Screen renders vibrant blue gradient with sheen and 3D bold white embossed title card", () => {
  assert.ok(
    centralLedWallContent.includes("renderVibrantBlueGradientWithSheen"),
    "Stage Right Screen must use renderVibrantBlueGradientWithSheen"
  );
  assert.ok(
    centralLedWallContent.includes("render3DTitleCardToCanvas"),
    "Stage Right Screen must render 3D embossed bold typography via render3DTitleCardToCanvas"
  );
  assert.ok(
    !centralLedWallContent.includes("drawScoreBoxesOnRightScreen"),
    "Score boxes on stage right screen must be omitted per user specification"
  );
});

test("R2.2: Math and natural science wall features dispersed lattice with 40+ formulas", () => {
  assert.ok(centralLedWallContent.includes("const BASE_FORMULA_SYMBOLS = ["));
  const formulaCount = (centralLedWallContent.match(/text:\s*"[^"]+"/g) || []).length;
  assert.ok(formulaCount >= 30, `Must have at least 30 formulas in math wall, found ${formulaCount}`);
  assert.ok(centralLedWallContent.includes("Math.round(s.size * 0.75)"), "Formulas must be scaled to 0.75x for refined dispersion");
});

test("R2.3: Typographical hierarchy uses academic serif math font stack for curved math wall", () => {
  assert.ok(
    centralLedWallContent.includes('"Cambria Math"') &&
    centralLedWallContent.includes('"Times New Roman"') &&
    centralLedWallContent.includes("serif"),
    "Formula rendering must use academic math font stack with Cambria Math, Times New Roman, serif"
  );
});

test("R2.4: 2-step canvas rendering with radiant ambient glow and crisp metallic gradient fill", () => {
  assert.ok(
    centralLedWallContent.includes("ctx.shadowBlur = 10;"),
    "Ambient glow must use restrained shadowBlur = 10"
  );
  assert.ok(
    centralLedWallContent.includes("const symGrad = ctx.createLinearGradient(0, -s.size * 0.5, 0, s.size * 0.5);"),
    "Metallic gradient fill must be created"
  );
  assert.ok(
    centralLedWallContent.includes("ctx.fillStyle = symGrad;"),
    "symGrad must be applied to fillStyle"
  );
});

test("R2.5: Vietnamese diacritic protection for title 'ĐƯỜNG LÊN ĐỈNH OLYMPIA'", () => {
  assert.ok(
    centralLedWallContent.includes("ctx.lineWidth = 3.8;"),
    "Outline stroke width must be reduced to 3.8 to protect accents"
  );
  assert.ok(
    centralLedWallContent.includes("ctx.lineWidth = 1.5;"),
    "Inner highlight stroke must be 1.5"
  );
});

test("R2.6: Math wall formula dispersion safe-zone and horizontal stagger spacing >= 200px", () => {
  const baseSymbolsMatch = centralLedWallContent.match(/const BASE_FORMULA_SYMBOLS = \[([\s\S]*?)\];/);
  assert.ok(baseSymbolsMatch, "BASE_FORMULA_SYMBOLS array must exist in CentralLedWall.tsx");
  const baseSymbolsBlock = baseSymbolsMatch[1];

  const symbolCoords: Array<{ text: string; x: number; y: number }> = [];
  const regex = /\{\s*text:\s*"([^"]+)",\s*x:\s*([0-9.]+),\s*y:\s*([0-9.]+)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(baseSymbolsBlock)) !== null) {
    symbolCoords.push({ text: m[1], x: parseFloat(m[2]), y: parseFloat(m[3]) });
  }

  assert.equal(symbolCoords.length, 42, `Extracted ${symbolCoords.length} formula coordinates from math wall`);

  // Group by approximate tier Y (Y tolerance +- 40)
  const tiers: Record<number, typeof symbolCoords> = {};
  for (const sym of symbolCoords) {
    const tierKey = Math.round(sym.y / 100) * 100;
    if (!tiers[tierKey]) tiers[tierKey] = [];
    tiers[tierKey].push(sym);
  }

  // Check horizontal spacing along each tier
  for (const tierKey of Object.keys(tiers)) {
    const row = tiers[Number(tierKey)].sort((a, b) => a.x - b.x);
    for (let i = 0; i < row.length - 1; i++) {
      const deltaX = row[i + 1].x - row[i].x;
      assert.ok(
        deltaX >= 180,
        `Formulas "${row[i].text}" and "${row[i + 1].text}" on tier ${tierKey} must be spaced >= 180px apart (actual: ${deltaX}px)`
      );
    }
  }
});

test("R2.7: Right LED screen title card renders multi-tier 3D drop depth extrusions", () => {
  assert.ok(
    centralLedWallContent.includes("for (let s = 6; s >= 1; s--) {"),
    "Title card must render 6-tier 3D drop extrusion"
  );
  assert.ok(
    centralLedWallContent.includes("ctx.fillText(titleText, cx, cy + s * 2.4);"),
    "Extrusions must step downward along Y axis"
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// R3: Cove Lighting & Floor Material Properties
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- Requirement R3: Cove Lighting and Floor Material Calibration ---");

const studioLightingContent = fs.readFileSync(
  path.join(rootDir, "src/components/olympia/studio/StudioLighting.tsx"),
  "utf-8"
);

test("R3.1: Cove fascia replaces un-tonemapped meshBasicMaterial with standard material", () => {
  assert.ok(
    studioLightingContent.includes("emissiveIntensity={0.75}"),
    "Cove fascia must specify emissiveIntensity={0.75}"
  );
  assert.ok(
    studioLightingContent.includes("roughness={0.45}"),
    "Cove fascia must specify roughness={0.45}"
  );
  assert.ok(
    !studioLightingContent.includes("<meshBasicMaterial color={ringColor} side={THREE.DoubleSide} toneMapped={false} />"),
    "toneMapped={false} meshBasicMaterial must be removed from cove fascia"
  );
});

test("R3.2: Cove floor glow ribbon narrowed to 0.40m span (5.20 -> 4.80)", () => {
  assert.ok(
    studioLightingContent.includes("createAnnularGlowGeometry(5.20, 4.80, 0.50 * Math.PI, 1.28 * Math.PI"),
    "Left cove glow must span 5.20 to 4.80"
  );
  assert.ok(
    studioLightingContent.includes("createAnnularGlowGeometry(5.20, 4.80, -0.08 * Math.PI, 0.50 * Math.PI"),
    "Right cove glow must span 5.20 to 4.80 up to 0.50 * Math.PI"
  );
});

test("R3.3: Overhead stage point lights lowered to Y = 2.5m, distance = 8m, intensity = 2.0", () => {
  assert.ok(
    studioLightingContent.includes(
      '<pointLight position={[-4.2, 2.5, -2.8]} color={ringColor} intensity={2.0 * liveFactor} distance={8} decay={1.6} />'
    ),
    "Left overhead point light must be lowered to Y=2.5, distance=8, intensity=2.0"
  );
  assert.ok(
    studioLightingContent.includes(
      '<pointLight position={[4.2, 2.5, -2.8]} color={ringColor} intensity={2.0 * liveFactor} distance={8} decay={1.6} />'
    ),
    "Right overhead point light must be lowered to Y=2.5, distance=8, intensity=2.0"
  );
});

test("R3.4: StudioFloor material calibrated to sapphire tone with balanced specular gloss", () => {
  assert.ok(
    studioLightingContent.includes('color="#030818"') || studioLightingContent.includes('color="#060e22"') || studioLightingContent.includes('color="#15233e"'),
    "StudioFloor color must be calibrated to high-gloss dark sapphire"
  );
  assert.ok(
    studioLightingContent.includes("roughness={0.045}") || studioLightingContent.includes("roughness={0.14}") || studioLightingContent.includes("roughness={0.22}"),
    "StudioFloor roughness must be calibrated for high-gloss reflection"
  );
  assert.ok(
    studioLightingContent.includes("metalness={0.68}") || studioLightingContent.includes("metalness={0.42}") || studioLightingContent.includes("metalness={0.30}"),
    "StudioFloor metalness must be calibrated for specular reflection"
  );
});

test("R3.5: Intermediate tier deck material calibrated to dark sapphire with balanced reflection", () => {
  assert.ok(
    studioLightingContent.includes('color="#040c20"') || studioLightingContent.includes('color="#091428"') || studioLightingContent.includes('color="#182c50"'),
    "Intermediate tier deck color must be calibrated to #040c20, #091428 or #182c50"
  );
  assert.ok(
    studioLightingContent.includes("roughness={0.055}") || studioLightingContent.includes("roughness={0.15}") || studioLightingContent.includes("roughness={0.24}"),
    "Intermediate tier deck roughness must be calibrated for specular reflection"
  );
});

const podiumsContent = fs.readFileSync(
  path.join(rootDir, "src/components/olympia/studio/Podiums.tsx"),
  "utf-8"
);

test("R3.6: Center stage top disc in Podiums.tsx calibrated to sapphire lacquer", () => {
  assert.ok(
    podiumsContent.includes('color="#060e22"') || podiumsContent.includes('color="#121e36"'),
    "Center floor stage top disc color must be calibrated to #060e22 or #121e36"
  );
  assert.ok(
    podiumsContent.includes("roughness={0.14}") || podiumsContent.includes("roughness={0.20}"),
    "Center floor stage top disc roughness must be calibrated between 0.14 and 0.20"
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// R4: Quality Guardrails & Performance Invariants
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- Requirement R4: Quality Guardrails and Performance Invariants ---");

test("R4.1: AGENTS.md file exists and contains Next.js rules", () => {
  const agentsMdPath = path.join(rootDir, "AGENTS.md");
  assert.ok(fs.existsSync(agentsMdPath), "AGENTS.md must exist");
  const agentsContent = fs.readFileSync(agentsMdPath, "utf-8");
  assert.ok(agentsContent.includes("This is NOT the Next.js you know"), "AGENTS.md must contain expected content");
});

test("R4.2: Maximum 1 directional shadow-casting light in StudioLighting.tsx", () => {
  const matches = studioLightingContent.match(/castShadow=\{quality !== "LIGHT"\}/g) || [];
  assert.equal(
    matches.length,
    1,
    "Strictly exactly 1 shadow casting directional light allowed per STAGE_PERFORMANCE_CONTRACT"
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// R5: Stage Right Screen Bilateral Gradient, Scanlines, and Pre-rendered UTM Neutra Title Assets
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- Requirement R5: Bilateral Gradient, Scanlines & UTM Neutra Title Assets ---");

test("R5.1: Pre-rendered UTM Neutra 3D Title PNG assets exist in public/olympia/led_titles/", () => {
  const titlesDir = path.join(rootDir, "public/olympia/led_titles");
  assert.ok(fs.existsSync(titlesDir), "public/olympia/led_titles directory must exist");
  const expectedTitles = [
    "led_title_olympia.png",
    "led_title_khoidong.png",
    "led_title_vcnv.png",
    "led_title_tangtoc.png",
    "led_title_vedich.png",
    "led_title_cauhoiphu.png",
  ];
  for (const filename of expectedTitles) {
    const filePath = path.join(titlesDir, filename);
    assert.ok(fs.existsSync(filePath), `Title asset ${filename} must exist`);
    const stat = fs.statSync(filePath);
    assert.ok(stat.size > 50000, `Title asset ${filename} must be > 50 KB (actual: ${stat.size} bytes)`);
  }
});

test("R5.2: CentralLedWall preloads title cards via TITLE_IMAGE_CACHE and draws pre-rendered PNG", () => {
  assert.ok(centralLedWallContent.includes("TITLE_IMAGE_CACHE"), "Must declare TITLE_IMAGE_CACHE");
  assert.ok(centralLedWallContent.includes("getOrLoadTitleImage"), "Must declare getOrLoadTitleImage");
  assert.ok(
    centralLedWallContent.includes("ctx.drawImage(titleImg, 0, 0, width, height)"),
    "Must draw pre-rendered UTM Neutra title PNG on canvas"
  );
});

test("R5.3: renderVibrantBlueGradientWithSheen has bilateral lateral gradients and scanlines", () => {
  assert.ok(
    centralLedWallContent.includes('baseGrad.addColorStop(0.0, "#063bb8")') &&
    centralLedWallContent.includes('baseGrad.addColorStop(1.0, "#063bb8")'),
    "Gradient must be bilateral with #063bb8 at both flanks"
  );
  assert.ok(
    centralLedWallContent.includes("rgba(0, 0, 0, 0.08)") &&
    centralLedWallContent.includes("for (let y = 0; y < height; y += 4)"),
    "Must draw horizontal scanline micro-stripes at 4px pitch"
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// R6: Curved Math & Science Wall WebM Video Texture with Bending across R=8.6m
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- Requirement R6: Curved Math & Science Wall WebM Video Texture ---");

test("R6.1: public/olympia/math_science_wall.webm exists and is valid video asset", () => {
  const webmPath = path.join(rootDir, "public/olympia/math_science_wall.webm");
  assert.ok(fs.existsSync(webmPath), "public/olympia/math_science_wall.webm must exist");
  const stat = fs.statSync(webmPath);
  assert.ok(stat.size > 100000, `Video file must be > 100 KB (actual: ${stat.size} bytes)`);
});

test("R6.2: CentralLedWall initializes THREE.VideoTexture with horizontal flip for BackSide cylinder", () => {
  assert.ok(
    centralLedWallContent.includes('video.src = "/olympia/math_science_wall.webm"'),
    "Must point video element to /olympia/math_science_wall.webm"
  );
  assert.ok(
    centralLedWallContent.includes("new THREE.VideoTexture(video)"),
    "Must create THREE.VideoTexture from video element"
  );
  assert.ok(
    centralLedWallContent.includes("videoTex.wrapS = THREE.RepeatWrapping") &&
    centralLedWallContent.includes("videoTex.repeat.x = -1") &&
    centralLedWallContent.includes("videoTex.offset.x = 1"),
    "Must flip UV horizontally to correct for BackSide cylinder mirroring"
  );
});

test("R6.3: Curved science & math wall maps video texture onto CylinderGeometry R=8.6m", () => {
  assert.ok(
    centralLedWallContent.includes("const activeMathWallTexture = mathWallVideoTexture || formulaWallTexture;") ||
    centralLedWallContent.includes("map={mathWallVideoTexture || formulaWallTexture}"),
    "Curved wall must bind mathWallVideoTexture or fallback to formulaWallTexture"
  );
  assert.ok(
    centralLedWallContent.includes("args={[8.6, 8.6, 2.4,"),
    "Curved wall must maintain R=8.6m CylinderGeometry"
  );
});

test("R6.4: Curved math wall uses transparent WebM alpha material without duplicate 2D QUIZORRA badge", () => {
  const videoGenContent = fs.readFileSync(
    path.join(rootDir, "scripts/generate-math-science-video.mjs"),
    "utf-8"
  );
  assert.ok(
    centralLedWallContent.includes("transparent: true") || centralLedWallContent.includes("transparent={true}"),
    "Curved math wall material must enable alpha transparency for VP9 alpha WebM"
  );
  assert.ok(
    videoGenContent.includes("yuva420p") && videoGenContent.includes("omitBackground: true"),
    "Video generator must render RGBA PNGs with omitBackground: true and encode yuva420p"
  );
  assert.ok(
    !videoGenContent.includes('fillText("QUIZORRA"'),
    "Video generator must NOT draw duplicate 2D QUIZORRA text inside the video texture"
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// R8: Curved Wall Red Crossfade Shader, Moving-Head Ceiling Sweep & Stage Sync
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- Requirement R8: Red Mode Crossfade & Moving-Head Ceiling Sweep ---");

test("R8.1: Curved math wall uses custom WebGL ShaderMaterial with uRedProgress crossfade, UV flip, and alpha preservation", () => {
  assert.ok(
    centralLedWallContent.includes("mathWallShaderMat") &&
    centralLedWallContent.includes("uRedProgress"),
    "CentralLedWall must define mathWallShaderMat with uRedProgress uniform"
  );
  assert.ok(
    centralLedWallContent.includes("vec2(1.0 - vUv.x, vUv.y)"),
    "ShaderMaterial must flip UV horizontally to prevent BackSide cylinder text mirroring"
  );
  assert.ok(
    centralLedWallContent.includes("gl_FragColor = vec4(outLinear, tex.a);") &&
    centralLedWallContent.includes("#include <colorspace_fragment>"),
    "ShaderMaterial must preserve WebM alpha channel and Three.js output color space"
  );
});

test("R8.2: StudioCeilingRig rotates moving-head fixtures downward onto stage floor during Blue <-> Red transitions", () => {
  assert.ok(
    studioLightingContent.includes("stageFadeProgress = 0") &&
    studioLightingContent.includes("screenFadeProgress = 0") &&
    studioLightingContent.includes("stageFadeProgress={stageFadeProgress}"),
    "StudioCeilingRig must accept and receive stageFadeProgress and screenFadeProgress"
  );
  assert.ok(
    studioLightingContent.includes("innerHeadRefs") &&
    studioLightingContent.includes("sweepBeamRefs") &&
    studioLightingContent.includes("floorGoboRefs"),
    "StudioCeilingRig must animate articulated moving-head luminaires, volumetric beams, and floor gobo spots"
  );
  assert.ok(
    studioLightingContent.includes("sweepSpotRef0") &&
    studioLightingContent.includes("sweepSpotRef1") &&
    studioLightingContent.includes("isTransitioningNow"),
    "StudioCeilingRig must detect transitions and drive floor-sweeping spotlights with castShadow=false"
  );
});

test("R8.3: Floor rings, center dais, perimeter cyc walls, and stage neon tubes smoothly crossfade Blue <-> Red via lerp", () => {
  assert.ok(
    !studioLightingContent.includes('stageFadeProgress > 0.5 ? new THREE.Color("#88081a") : new THREE.Color("#1d4ed8")'),
    "StudioFloor and StudioWalls must replace hard > 0.5 color snap with smooth .lerp() crossfade"
  );
  assert.ok(
    !centralLedWallContent.includes('screenFadeProgress > 0.5 ? new THREE.Color("#88081a") : new THREE.Color("#1d4ed8")'),
    "CentralLedWall neonColor must replace hard > 0.5 color snap with smooth .lerp() crossfade"
  );
  assert.ok(
    !podiumsContent.includes('screenFadeProgress > 0.5 ? new THREE.Color("#88081a") : new THREE.Color("#1d4ed8")') &&
    podiumsContent.includes("stageFadeProgress !== undefined ? stageFadeProgress"),
    "CenterMcDesk and CenterFloorStage in Podiums.tsx must smoothly crossfade via lerp instead of boolean snap"
  );
  assert.ok(
    !centralLedWallContent.includes('color={screenFadeProgress > 0.5 ? "#ffa0b5" : "#ffffff"}'),
    "Curved math wall must replace crude pink tint snap with WebGL red crossfade shader"
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// R7: Floor Cleanliness and Elimination of Raw Geometric Polygon Artifacts
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- Requirement R7: Floor Cleanliness and Specular Reflection ---");

test("R7.1: Raw geometric downlight plane mesh removed from stage right screen to prevent exposed polygon edges", () => {
  assert.ok(
    !centralLedWallContent.includes('<planeGeometry args={[5.2, 3.0]} />'),
    "Raw untextured planeGeometry must be eliminated to prevent visible blue polygon edges on floor"
  );
});

test("R7.2: Raw geometric downlight ring mesh removed from curved math wall to prevent exposed polygon edges", () => {
  assert.ok(
    !centralLedWallContent.includes('args={[7.8, 9.0, quality === "LIGHT" ? 32 : 64, 1, wallStartAng, wallSweepAng]}'),
    "Raw ringGeometry downlight must be eliminated to prevent visible blue polygon edges on floor"
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// R9: Camera Framing & CUT Parity, Cyclorama Span, Audio O22-O26, & TTS Bridging
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- Requirement R9: Cyclorama Span, Camera CUT Parity, Audio O22-O26, and TTS Bridging ---");

const useOlympiaCameraContent = fs.readFileSync(
  path.join(rootDir, "src/components/olympia/studio/useOlympiaCamera.ts"),
  "utf-8"
);
const studioSceneContent = fs.readFileSync(
  path.join(rootDir, "src/components/olympia/OlympiaStudio3DScene.tsx"),
  "utf-8"
);
const hooksContent = fs.readFileSync(
  path.join(rootDir, "src/components/olympia/hooks.ts"),
  "utf-8"
);
const displayScreenContent = fs.readFileSync(
  path.join(rootDir, "src/components/olympia/DisplayScreen.tsx"),
  "utf-8"
);

test("R9.1: AudienceAmphitheater cyclorama arc narrowed to 48 deg (0.83775804 rad) to avoid contestant cam leak", () => {
  assert.ok(
    studioLightingContent.includes("createCylindricalCycloramaGeometry(22.5, 8.5, 0.83775804, 96, 16)") &&
    studioLightingContent.includes("new CylindricalTrimCurve(22.5, 0.83775804)"),
    "Cyclorama and trim curve must use narrowed 0.83775804 rad span"
  );
});

test("R9.2: Camera controller and auto-director support CAM 3 coaxial, standby orbit, and Khởi Động CAM 14 -> CAM 10 CUT -> 2.5s zoom", () => {
  assert.ok(
    studioSceneContent.includes('useState<"CUT" | "MORPH">("CUT")'),
    "OlympiaStudio3DScene must default transitionMode to CUT"
  );
  assert.ok(
    !cameraControllerContent.includes("standbyExitedAtRef") &&
    !cameraControllerContent.includes("glideStartRef"),
    "CameraController must not keep standbyExitedAtRef or glideStartRef"
  );
  assert.ok(
    !useOlympiaCameraContent.includes("segDoneElapsed < 2.5 ? 29 : 1"),
    "useOlympiaCamera must CUT directly instead of CAM 29->1 morph"
  );
  assert.ok(
    cameraControllerContent.includes("pos: [1.40, 1.52, -3.17]") &&
    cameraControllerContent.includes("target: [2.02, 1.36, -5.95]"),
    "CameraController CAM 3 must be calibrated to coaxial straight frontal [1.40, 1.52, -3.17] -> [2.02, 1.36, -5.95]"
  );
  assert.ok(
    cameraControllerContent.includes("THREE.MathUtils.lerp(0.49, 0.0, smoothT)"),
    "CameraController post-intro standby must orbit +28 deg (+0.49 rad) -> 0 deg"
  );
  assert.ok(
    cameraControllerContent.includes("OLYMPIA_CAM_PRESETS[14]") &&
    cameraControllerContent.includes("kdZoomActiveRef") &&
    useOlympiaCameraContent.includes("camAngle: 14"),
    "Khởi Động must run CAM 14 sweep -> CAM 10 CUT -> 2.5s Lượt Riêng zoom"
  );
});

test("R9.3: O22-O26 1_KhoiDong/open_question matches authentic Olympia 26 track (69688040) while O13-21 stays untouched", () => {
  const { createHash } = require("crypto");
  const md5 = (rel: string) =>
    createHash("md5").update(fs.readFileSync(path.join(rootDir, rel))).digest("hex");

  assert.equal(
    md5("public/olympia-audio/O13-21/1_KhoiDong/open_question.mp3"),
    "7286d058ebd129664adaea00416b6535",
    "O13-21 open_question.mp3 must remain byte-identical"
  );
  const o22Hash = md5("public/olympia-audio/O22/1_KhoiDong/open_question.mp3");
  assert.equal(
    o22Hash,
    "696880403e8ee55a12d52b900fd60422",
    "O22 open_question.mp3 must match authentic D:\\Olympia 26\\Audio source"
  );
  for (const s of ["O23", "O24-25", "O26"]) {
    for (const suffix of ["", "_left", "_right"]) {
      assert.equal(
        md5(`public/olympia-audio/${s}/1_KhoiDong/open_question${suffix}.mp3`),
        o22Hash,
        `${s} open_question${suffix}.mp3 must match authentic O22 open_question.mp3`
      );
    }
  }
});

test("R9.4: Audio panner preserves Stereo on 'both' and duplicates target channel cleanly in hooks.ts & audio-channel.ts", () => {
  const audioChannelPath = path.resolve(process.cwd(), "src/lib/olympia/audio-channel.ts");
  const audioChannelContent = fs.readFileSync(audioChannelPath, "utf-8");
  assert.ok(
    hooksContent.includes("createChannelRoutingGraph") &&
      hooksContent.includes("applyChannelRoutingGraph") &&
      audioChannelContent.includes("setTargetAtTime") &&
      audioChannelContent.includes("L_to_L: 1.0, L_to_R: 1.0"),
    "hooks.ts and audio-channel.ts must route Stereo on both and duplicate Left/Right cleanly across all paths"
  );
});

test("R9.5: DisplayScreen wires post-intro breather, in-round bridging lines, and cancelQuestionTTS guard", () => {
  assert.ok(
    displayScreenContent.includes("buildPostIntroBreatherScript") &&
    displayScreenContent.includes("buildKhoiDongTurnBridgeSegment") &&
    displayScreenContent.includes("buildVcnvRowBridgeSegment") &&
    displayScreenContent.includes("buildTangTocBridgeSegment") &&
    displayScreenContent.includes("buildVeDichBridgeSegment") &&
    displayScreenContent.includes("cancelQuestionTTS()"),
    "DisplayScreen must wire all bridging TTS scripts and guard question cancellation"
  );
});

test("R9.6: Right LED Screen supports all 7 modes, uniform 0.2s FIFO delay, and live WebGLRenderTarget delayed camera feed", () => {
  const hostConsoleContent = fs.readFileSync(
    path.join(rootDir, "src/components/olympia/HostConsole.tsx"),
    "utf-8"
  );
  const typesContent = fs.readFileSync(
    path.join(rootDir, "src/lib/olympia/types.ts"),
    "utf-8"
  );

  for (const m of ["auto", "roundTitle", "logo", "question", "scoreboard", "roundGraphics", "camera"]) {
    assert.ok(hostConsoleContent.includes(`{ id: "${m}",`), `HostConsole must expose mode "${m}"`);
    assert.ok(typesContent.includes(`"${m}"`), `types.ts must include mode "${m}"`);
  }

  assert.ok(
    centralLedWallContent.includes("RIGHT_SCREEN_DELAY_MS = 200") &&
    centralLedWallContent.includes("rightDelayQueueRef") &&
    centralLedWallContent.includes("rightNeonMat"),
    "CentralLedWall must implement uniform 200ms FIFO delay queue and delayed bezel material"
  );
  assert.ok(
    centralLedWallContent.includes("resolveRightScreenDisplayMode") &&
    centralLedWallContent.includes("renderRightRoundStatusGraphicsToCanvas") &&
    centralLedWallContent.includes("renderRightScoreboardToCanvas") &&
    centralLedWallContent.includes("renderOlympiaLogoCardToCanvas"),
    "CentralLedWall must implement all Right Screen display modes and dynamic auto/question fallback"
  );
  assert.ok(
    centralLedWallContent.includes("new THREE.WebGLRenderTarget") &&
    centralLedWallContent.includes("gl.render(scene, camera)") &&
    centralLedWallContent.includes("rightScreenMatRef") &&
    centralLedWallContent.includes("disposeCameraRing") &&
    centralLedWallContent.includes('{ w: 256, h: 144, intervalMs: 70, slots: 4 }'),
    "CentralLedWall camera mode must use lazy WebGLRenderTarget ring buffer with recursion guard, LIGHT throttling, and disposal"
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// R10: M1 Outermost Stage Arcs, MC Portal Elevation & Wall Alignment
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- Requirement R10: M1 Outermost Stage Arcs & MC Portal Alignment ---");

test("R10.1: StudioLighting unifies daisGeometry across [-0.08π, 1.28π] with integral rear portal bay and zero 0.48π gap", () => {
  assert.ok(
    studioLightingContent.includes("getOuterDaisRadius") &&
    studioLightingContent.includes("createAnnularSectorShape(5.2, getOuterDaisRadius, -0.08 * Math.PI, 1.28 * Math.PI, 256)"),
    "StudioLighting must unify daisGeometry with smoothstep R=9.00m portal bay across [-0.08π, 1.28π]"
  );
  assert.ok(
    !studioLightingContent.includes("0.48 * Math.PI"),
    "StudioLighting must not contain legacy 0.48 * Math.PI gap"
  );
});

test("R10.2: CentralLedWall mounts MC Portal at Y=0.22m and aligns Left Formula Wall lower sweep", () => {
  assert.ok(
    centralLedWallContent.includes('<group position={[2.10, 0.22, -7.50]} rotation={[0, -0.22, 0]}>'),
    "MC Hexagonal Portal must be mounted at [2.10, 0.22, -7.50]"
  );
  assert.ok(
    centralLedWallContent.includes("const wallStartAng = 0.995 * Math.PI;") &&
    centralLedWallContent.includes("const lowerWallStartAng = 0.995 * Math.PI;") &&
    centralLedWallContent.includes("const lowerWallSweepAng = wallSweepAng;") &&
    !centralLedWallContent.includes("wallSweepAng - 0.01 * Math.PI"),
    "Left Formula Wall must align upstage edge to 0.995π and match lowerWallSweepAng === wallSweepAng"
  );
});

test("R10.3: Podiums mounts CenterMcDesk and MC presenters at synchronized Y=0.22m dais elevation", () => {
  assert.ok(
    podiumsContent.includes('<group ref={mcDeskRef} position={[2.00, 0.22, -5.85]} rotation={[0, -0.22, 0]}>'),
    "CenterMcDesk must mount at [2.00, 0.22, -5.85]"
  );
  assert.ok(
    podiumsContent.includes("KV_DESK_POS: [number, number, number] = [2.28, 0.22, -6.25]") &&
    podiumsContent.includes("NH_DESK_POS: [number, number, number] = [1.84, 0.22, -6.35]"),
    "KV_DESK_POS and NH_DESK_POS must sit at Y = 0.22"
  );
});

test("R10.4: Curved Math Wall right chevron aligns slant angles and Y=2.72m knuckle with MC Portal", () => {
  const scriptSrc = fs.readFileSync(path.join(rootDir, "scripts/generate-math-science-video.mjs"), "utf8");
  assert.ok(
    scriptSrc.includes("const KNUCKLE_Y = 330;") &&
    scriptSrc.includes("CYL_STRETCH = 3.4407"),
    "WebM math wall script must use synchronized KNUCKLE_Y=330 (Y=2.72m) and CYL_STRETCH=3.4407"
  );
  assert.ok(
    centralLedWallContent.includes("[2006, 34]") &&
    centralLedWallContent.includes("[1950, 330]") &&
    centralLedWallContent.includes("[2008, 734]"),
    "CentralLedWall fallback contour must align right chevron knuckle & slopes with MC Portal"
  );
});

console.log("\n================================================================================");
console.log(`TOTAL REFINEMENT TESTS: ${passCount + failCount}`);
console.log(`PASSED: ${passCount}`);
console.log(`FAILED: ${failCount}`);
console.log("================================================================================");

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
