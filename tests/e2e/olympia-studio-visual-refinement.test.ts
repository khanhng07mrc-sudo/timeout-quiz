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
// R2: Math & Science Formulas Visual Redesign
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- Requirement R2: Math and Science Formulas Visual Redesign ---");

test("R2.1: idleSymbols formula list specifies peripheral safe-zone distribution", () => {
  // Check required formula symbols exist
  const symbols = ["∑", "√x", "F=ma", "∫ f(x)dx", "π", "E=mc²", "H₂O", "Δλ", "sin θ", "v=s/t", "Ω", "∞"];
  for (const sym of symbols) {
    assert.ok(
      centralLedWallContent.includes(`text: "${sym}"`),
      `idleSymbols must include symbol ${sym}`
    );
  }

  // Assert adjusted safe-zone coordinates for repositioned formulas
  assert.ok(
    centralLedWallContent.includes('{ text: "H₂O", x: 0.16, y: 0.06,'),
    "H₂O must be positioned at upper-left margin [0.16, 0.06]"
  );
  assert.ok(
    centralLedWallContent.includes('{ text: "Δλ", x: 0.84, y: 0.06,'),
    "Δλ must be positioned at upper-right margin [0.84, 0.06]"
  );
  assert.ok(
    centralLedWallContent.includes('{ text: "F=ma", x: 0.09, y: 0.58,'),
    "F=ma must be positioned in left wing at [0.09, 0.58]"
  );
  assert.ok(
    centralLedWallContent.includes('{ text: "E=mc²", x: 0.91, y: 0.58,'),
    "E=mc² must be positioned in right wing at [0.91, 0.58]"
  );
});

test("R2.2: Formula sizing is refined between 0.030 and 0.038 width (~38-48px at 1280px)", () => {
  assert.ok(centralLedWallContent.includes("Math.round(width * 0.038)"));
  assert.ok(centralLedWallContent.includes("Math.round(width * 0.030)"));
  assert.ok(!centralLedWallContent.includes("Math.round(width * 0.088)"), "Old inflated 0.088 width must be removed");
});

test("R2.3: Typographical hierarchy uses academic serif math font stack", () => {
  assert.ok(
    centralLedWallContent.includes(
      'ctx.font = `italic 600 ${s.size}px "Cambria Math", "Latin Modern Math", "STIX Two Math", "Times New Roman", "Plus Jakarta Sans", serif`;'
    ),
    "Formula rendering must use academic math font stack with italic 600 weight"
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

test("R2.6: idleSymbols safe-zone collision test asserting zero penetration across 60 seconds of animation drift", () => {
  const symbolRegex = /\{\s*text:\s*"([^"]+)",\s*x:\s*([0-9.]+),\s*y:\s*([0-9.]+),\s*size:\s*Math\.round\(width\s*\*\s*([0-9.]+)\)\s*\}/g;
  const parsedSymbols: Array<{ text: string; x: number; y: number; sizeFactor: number }> = [];
  let match: RegExpExecArray | null;
  while ((match = symbolRegex.exec(centralLedWallContent)) !== null) {
    parsedSymbols.push({
      text: match[1],
      x: parseFloat(match[2]),
      y: parseFloat(match[3]),
      sizeFactor: parseFloat(match[4]),
    });
  }

  assert.equal(parsedSymbols.length, 12, "Must extract exactly 12 idle formula symbols");

  // Glyph metrics specification
  const glyphSpecs: Record<string, { w: number; h: number }> = {
    "∑": { w: 48, h: 48 },
    "√x": { w: 60, h: 44 },
    "F=ma": { w: 104, h: 40 },
    "∫ f(x)dx": { w: 140, h: 42 },
    "π": { w: 46, h: 46 },
    "E=mc²": { w: 120, h: 42 },
    "H₂O": { w: 75, h: 37 },
    "Δλ": { w: 62, h: 38 },
    "sin θ": { w: 90, h: 38 },
    "v=s/t": { w: 85, h: 38 },
    "Ω": { w: 44, h: 42 },
    "∞": { w: 50, h: 44 },
  };

  const logoZone = { xMin: 0.24, xMax: 0.76, yMin: 0.08, yMax: 0.62 };
  const titleZone = { xMin: 0.15, xMax: 0.85, yMin: 0.66, yMax: 0.80 };

  const resolutions = [
    { width: 1280, height: 720 },
    { width: 960, height: 540 },
  ];

  for (const { width, height } of resolutions) {
    const scale = width / 1280;
    // Test across 60 seconds of animation drift in 0.1s steps (601 steps)
    for (let s = 0; s <= 600; s++) {
      const timeSec = s * 0.1;

      for (let idx = 0; idx < parsedSymbols.length; idx++) {
        const sym = parsedSymbols[idx];
        const driftX = sym.x * width + Math.sin(timeSec * 0.5 + idx * 1.4) * 5;
        const driftY = sym.y * height + Math.cos(timeSec * 0.6 + idx * 1.1) * 4;

        const spec = glyphSpecs[sym.text];
        assert.ok(spec, `Glyph spec must exist for ${sym.text}`);
        const halfW = (spec.w * scale) / 2;
        const halfH = (spec.h * scale) / 2;

        const normLeft = (driftX - halfW) / width;
        const normRight = (driftX + halfW) / width;
        const normTop = (driftY - halfH) / height;
        const normBottom = (driftY + halfH) / height;

        const overlapLogo =
          normRight > logoZone.xMin &&
          normLeft < logoZone.xMax &&
          normBottom > logoZone.yMin &&
          normTop < logoZone.yMax;
        assert.ok(
          !overlapLogo,
          `Logo safe zone collision detected for formula "${sym.text}" at resolution ${width}x${height}, time ${timeSec.toFixed(1)}s`
        );

        const overlapTitle =
          normRight > titleZone.xMin &&
          normLeft < titleZone.xMax &&
          normBottom > titleZone.yMin &&
          normTop < titleZone.yMax;
        assert.ok(
          !overlapTitle,
          `Title safe zone collision detected for formula "${sym.text}" at resolution ${width}x${height}, time ${timeSec.toFixed(1)}s`
        );
      }
    }
  }
});

test("R2.7: idleSymbols pairwise clearance >= 50px and canvas boundary containment [0.05, 0.95] x [0.04, 0.96]", () => {
  const symbolRegex = /\{\s*text:\s*"([^"]+)",\s*x:\s*([0-9.]+),\s*y:\s*([0-9.]+),\s*size:\s*Math\.round\(width\s*\*\s*([0-9.]+)\)\s*\}/g;
  const parsedSymbols: Array<{ text: string; x: number; y: number }> = [];
  let match: RegExpExecArray | null;
  while ((match = symbolRegex.exec(centralLedWallContent)) !== null) {
    parsedSymbols.push({
      text: match[1],
      x: parseFloat(match[2]),
      y: parseFloat(match[3]),
    });
  }

  // All formula centers must remain within canvas boundaries [0.05, 0.95] x [0.04, 0.96]
  for (const sym of parsedSymbols) {
    assert.ok(
      sym.x >= 0.05 && sym.x <= 0.95,
      `Formula center X for ${sym.text} (${sym.x}) must be within [0.05, 0.95]`
    );
    assert.ok(
      sym.y >= 0.04 && sym.y <= 0.96,
      `Formula center Y for ${sym.text} (${sym.y}) must be within [0.04, 0.96]`
    );
  }

  // Test across 60 seconds drift at 1280x720 and 960x540 for >= 50px pairwise clearance
  for (const width of [1280, 960]) {
    const height = Math.round(width * (9 / 16));
    for (let s = 0; s <= 600; s += 5) {
      const timeSec = s * 0.1;
      const positions = parsedSymbols.map((sym, idx) => ({
        text: sym.text,
        x: sym.x * width + Math.sin(timeSec * 0.5 + idx * 1.4) * 5,
        y: sym.y * height + Math.cos(timeSec * 0.6 + idx * 1.1) * 4,
      }));

      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const dx = positions[i].x - positions[j].x;
          const dy = positions[i].y - positions[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          assert.ok(
            dist >= 50,
            `Pairwise clearance violation between "${positions[i].text}" and "${positions[j].text}": ${dist.toFixed(1)}px < 50px`
          );
        }
      }
    }
  }
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
    studioLightingContent.includes('color="#15233e"'),
    "StudioFloor color must be calibrated to #15233e"
  );
  assert.ok(
    studioLightingContent.includes("roughness={0.22}"),
    "StudioFloor roughness must be calibrated to 0.22"
  );
  assert.ok(
    studioLightingContent.includes("metalness={0.30}"),
    "StudioFloor metalness must be calibrated to 0.30"
  );
  assert.ok(
    studioLightingContent.includes('emissive="#051024"'),
    "StudioFloor emissive must be calibrated to #051024"
  );
  assert.ok(
    studioLightingContent.includes("emissiveIntensity={0.16}"),
    "StudioFloor emissiveIntensity must be calibrated to 0.16"
  );
});

test("R3.5: Intermediate tier deck material calibrated to #182c50 with balanced reflection", () => {
  assert.ok(
    studioLightingContent.includes('color="#182c50"'),
    "Intermediate tier deck color must be calibrated to #182c50"
  );
  assert.ok(
    studioLightingContent.includes("roughness={0.24}"),
    "Intermediate tier deck roughness must be calibrated to 0.24"
  );
  assert.ok(
    studioLightingContent.includes("metalness={0.25}"),
    "Intermediate tier deck metalness must be calibrated to 0.25"
  );
  assert.ok(
    studioLightingContent.includes("emissiveIntensity={0.14}"),
    "Intermediate tier deck emissiveIntensity must be calibrated to 0.14"
  );
});

const podiumsContent = fs.readFileSync(
  path.join(rootDir, "src/components/olympia/studio/Podiums.tsx"),
  "utf-8"
);

test("R3.6: Center stage top disc in Podiums.tsx calibrated to #121e36", () => {
  assert.ok(
    podiumsContent.includes('color="#121e36"'),
    "Center floor stage top disc color must be calibrated to #121e36"
  );
  assert.ok(
    podiumsContent.includes("roughness={0.20}"),
    "Center floor stage top disc roughness must be calibrated to 0.20"
  );
  assert.ok(
    podiumsContent.includes("emissiveIntensity={0.15}"),
    "Center floor stage top disc emissiveIntensity must be calibrated to 0.15"
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
