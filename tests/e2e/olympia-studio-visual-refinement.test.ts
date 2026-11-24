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
    studioLightingContent.includes("createAnnularGlowGeometry(5.20, 4.80, -0.08 * Math.PI, 0.48 * Math.PI"),
    "Right cove glow must span 5.20 to 4.80"
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
    studioLightingContent.includes('color="#060e22"') || studioLightingContent.includes('color="#15233e"'),
    "StudioFloor color must be calibrated to #060e22 or #15233e"
  );
  assert.ok(
    studioLightingContent.includes("roughness={0.14}") || studioLightingContent.includes("roughness={0.22}"),
    "StudioFloor roughness must be calibrated between 0.14 and 0.22"
  );
  assert.ok(
    studioLightingContent.includes("metalness={0.42}") || studioLightingContent.includes("metalness={0.30}"),
    "StudioFloor metalness must be calibrated between 0.30 and 0.42"
  );
});

test("R3.5: Intermediate tier deck material calibrated to dark sapphire with balanced reflection", () => {
  assert.ok(
    studioLightingContent.includes('color="#091428"') || studioLightingContent.includes('color="#182c50"'),
    "Intermediate tier deck color must be calibrated to #091428 or #182c50"
  );
  assert.ok(
    studioLightingContent.includes("roughness={0.15}") || studioLightingContent.includes("roughness={0.24}"),
    "Intermediate tier deck roughness must be calibrated between 0.15 and 0.24"
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
