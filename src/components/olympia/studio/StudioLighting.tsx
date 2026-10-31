"use client";

import React, { useMemo } from "react";
import * as THREE from "three";

interface StudioLightingProps {
  screenFadeProgress?: number;
  stageFadeProgress?: number;
  audienceFadeProgress?: number;
  quality?: "HIGH" | "MEDIUM" | "LIGHT";
  isVeDichDimmed?: boolean;
  activeMainContestantSeat?: number | null;
  is5sBuzzerChasing?: boolean;
  spotlightChaseIndex?: number;
  lockedSpotlightSeat?: number | null;
  introStartedAt?: number | null;
  serverNow?: () => number;
}

const CONTESTANT_POSITIONS: Array<[number, number, number]> = [
  [-5.8, 0, -1.8], // TS 1: Đỏ
  [-4.7, 0, -2.4], // TS 2: Lam
  [-3.6, 0, -3.0], // TS 3: Vàng
  [-2.5, 0, -3.6], // TS 4: Lục
];

/**
 * Official Olympia Laurel Wreath Canvas Decal on Central Stage Floor.
 * Features:
 * - VÒNG NGUYỆT QUẾ ONLY (No extra text, no mountain silhouette, pure wreath).
 * - Symmetrical twin laurel branches in metallic gold (#ffd700) with glowing cyan rim (#00f0ff).
 */
function createFloorLaurelWreathCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const cx = 512;
  const cy = 512;

  ctx.clearRect(0, 0, 1024, 1024);

  // Outer glowing cyan ring halo
  ctx.save();
  ctx.strokeStyle = "rgba(0, 240, 255, 0.75)";
  ctx.lineWidth = 8;
  ctx.shadowColor = "#00f0ff";
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.arc(cx, cy, 440, 0, Math.PI * 2);
  ctx.stroke();

  // Inner subtle gold ring
  ctx.strokeStyle = "rgba(255, 215, 0, 0.65)";
  ctx.lineWidth = 4;
  ctx.shadowColor = "#ffd700";
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(cx, cy, 410, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Draw Laurel Wreath Leaves (VÒNG NGUYỆT QUẾ ONLY - Golden with Cyan Aura)
  const leafCount = 18;
  const wreathRadius = 320;

  for (const side of [-1, 1]) {
    ctx.save();
    ctx.shadowColor = "#ffd700";
    ctx.shadowBlur = 22;

    for (let i = 0; i < leafCount; i++) {
      const frac = i / (leafCount - 1);
      const ang = Math.PI * 0.5 + side * (frac * Math.PI * 0.88);
      const r = wreathRadius + Math.sin(frac * Math.PI) * 45;
      const lx = cx + Math.cos(ang) * r;
      const ly = cy + Math.sin(ang) * r;

      const leafRot = ang + side * (Math.PI * 0.45 + frac * 0.2);
      const leafScale = 24 + Math.sin(frac * Math.PI) * 16;

      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(leafRot);

      const leafGrad = ctx.createLinearGradient(-leafScale, 0, leafScale, 0);
      leafGrad.addColorStop(0, "#fffbd0");
      leafGrad.addColorStop(0.35, "#ffd700");
      leafGrad.addColorStop(0.85, "#b45309");
      leafGrad.addColorStop(1, "#38bdf8");

      ctx.fillStyle = leafGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, leafScale, leafScale * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();

      // Leaf spine highlight
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-leafScale * 0.8, 0);
      ctx.lineTo(leafScale * 0.8, 0);
      ctx.stroke();

      ctx.restore();
    }

    // Stem ribbon at bottom
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, wreathRadius, Math.PI * 0.5 - 0.25, Math.PI * 0.5 + 0.25);
    ctx.stroke();

    ctx.restore();
  }

  return canvas;
}

/**
 * Creates 2D Annular Sector Shape for the Raised Contestant Dais
 */
function createAnnularSectorShape(
  rIn: number,
  rOut: number,
  startAng: number,
  endAng: number,
  segments: number = 36
): THREE.Shape {
  const shape = new THREE.Shape();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const a = startAng + t * (endAng - startAng);
    const x = Math.cos(a) * rOut;
    const y = Math.sin(a) * rOut;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  for (let i = segments; i >= 0; i--) {
    const t = i / segments;
    const a = startAng + t * (endAng - startAng);
    const x = Math.cos(a) * rIn;
    const y = Math.sin(a) * rIn;
    shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

/**
 * High-specular PBR Studio Epoxy Floor with Concentric Center Stage,
 * Raised Contestant Platform (+8cm step with glowing rim), and Laurel Wreath Decal.
 */
export function StudioFloor({
  stageFadeProgress = 0,
  quality = "HIGH",
}: {
  stageFadeProgress?: number;
  quality?: "HIGH" | "MEDIUM" | "LIGHT";
}) {
  const ringColor = useMemo(() => {
    const c = new THREE.Color("#00f0ff");
    c.lerp(new THREE.Color("#ff1a40"), stageFadeProgress);
    return c;
  }, [stageFadeProgress]);

  const goldColor = new THREE.Color("#ffd700");

  // Floor Laurel Wreath Canvas Texture
  const wreathCanvas = useMemo(() => {
    if (typeof document === "undefined") return null;
    return createFloorLaurelWreathCanvas();
  }, []);

  const wreathTexture = useMemo(() => {
    if (!wreathCanvas) return null;
    const tex = new THREE.CanvasTexture(wreathCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [wreathCanvas]);

  // Raised Contestant Dais Extruded Geometry (Y = 0.22m, +8cm above stage Y=0.14m)
  const daisGeometry = useMemo(() => {
    const shape = createAnnularSectorShape(3.8, 6.8, 0.56 * Math.PI, 1.04 * Math.PI, 36);
    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.22,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.03,
      bevelThickness: 0.02,
    });
  }, []);

  // Step-light points along the front edge of the contestant platform (r = 3.8m)
  const stepLightPoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const count = 40;
    const startAng = 0.56 * Math.PI;
    const endAng = 1.04 * Math.PI;
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const a = startAng + t * (endAng - startAng);
      // In Three.js with rotation [-Math.PI/2, 0, 0]:
      // shape (x, y) becomes world (x, z_world = -y)
      const x = Math.cos(a) * 3.82;
      const z = -Math.sin(a) * 3.82;
      pts.push(new THREE.Vector3(x, 0.224, z - 0.6));
    }
    return pts;
  }, []);

  const stepLightLine = useMemo(() => {
    const geom = new THREE.BufferGeometry().setFromPoints(stepLightPoints);
    const mat = new THREE.LineBasicMaterial({ color: ringColor, linewidth: 3 });
    return new THREE.Line(geom, mat);
  }, [stepLightPoints, ringColor]);

  return (
    <group position={[0, -0.01, 0]}>
      {/* ── 1. MAIN GLOSSY BROADCAST FLOOR DISC ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[26, quality === "LIGHT" ? 32 : 64]} />
        <meshStandardMaterial
          color="#060e20"
          roughness={0.15}
          metalness={0.30}
          envMapIntensity={2.0}
        />
      </mesh>

      {/* ── 2. CENTRAL CIRCULAR STAGE PLATFORM (Y = 0.14m, Radius 2.6m at [0, 0, -0.6]) ── */}
      <mesh position={[0, 0.07, -0.6]}>
        <cylinderGeometry args={[2.6, 2.7, 0.14, quality === "LIGHT" ? 32 : 64]} />
        <meshStandardMaterial
          color="#08142c"
          roughness={0.14}
          metalness={0.5}
        />
      </mesh>

      {/* Concentric Glowing Cyan & Gold Rings on Central Stage */}
      <mesh position={[0, 0.142, -0.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.54, 2.62, 64]} />
        <meshBasicMaterial color={ringColor} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0, 0.142, -0.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.88, 1.95, 64]} />
        <meshBasicMaterial color={goldColor} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0, 0.142, -0.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.20, 1.26, 64]} />
        <meshBasicMaterial color={ringColor} side={THREE.DoubleSide} />
      </mesh>

      {/* ── 3. OFFICIAL OLYMPIA LAUREL WREATH FLOOR DECAL (VÒNG NGUYỆT QUẾ ONLY) ── */}
      {wreathTexture && (
        <mesh position={[0, 0.144, -0.6]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.2, 2.2]} />
          <meshBasicMaterial
            map={wreathTexture}
            transparent
            toneMapped={false}
            polygonOffset
            polygonOffsetFactor={-3}
            polygonOffsetUnits={-3}
          />
        </mesh>
      )}

      {/* ── 4. RAISED CONTESTANT DAIS PLATFORM (+8cm step, Y = 0.22m) ── */}
      {/* Curved dais elevating contestant stations proudly above central stage */}
      <group position={[0, 0, -0.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh geometry={daisGeometry}>
          <meshStandardMaterial
            color="#09142c"
            metalness={0.65}
            roughness={0.20}
            envMapIntensity={1.8}
          />
        </mesh>
      </group>

      {/* Glowing Cyan LED Step-Light Strip along the curved front lip */}
      <primitive object={stepLightLine} />
    </group>
  );
}

/**
 * Studio Perimeter Walls with Vertical Architectural LED Light Ribs
 * and Horizontal Radiant Cyan/Blue Broadcast Neon Bands (as in real VTV3 Studio S14)
 */
export function StudioWalls({
  stageFadeProgress = 0,
}: {
  stageFadeProgress?: number;
}) {
  const wallLightColor = useMemo(() => {
    const c = new THREE.Color("#00d4ff");
    c.lerp(new THREE.Color("#ff1133"), stageFadeProgress);
    return c;
  }, [stageFadeProgress]);

  const finConfigs = useMemo(() => {
    const fins: Array<{ pos: [number, number, number]; rotY: number }> = [];
    const count = 18;
    const radius = 18.5;
    for (let i = 0; i < count; i++) {
      const theta = ((i - (count - 1) / 2) / count) * Math.PI * 0.95 + Math.PI / 2;
      const x = Math.cos(theta) * radius;
      const z = -Math.sin(theta) * radius + 5.0;
      fins.push({
        pos: [x, 5.5, z],
        rotY: -theta + Math.PI / 2,
      });
    }
    return fins;
  }, []);

  return (
    <group>
      {/* Curved Deep Sapphire Studio Cyc Enclosure */}
      <mesh position={[0, 6.0, -1.0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[20.5, 20.5, 13, 48, 1, true, -Math.PI * 0.85, Math.PI * 1.7]} />
        <meshStandardMaterial
          color="#030c24"
          roughness={0.4}
          metalness={0.6}
          side={THREE.BackSide}
        />
      </mesh>

      {/* 4 Horizontal Glowing Neon Bands along Cyc Wall (As in VTV3 Olympia photo) */}
      {[2.2, 3.8, 5.4, 7.0].map((h, idx) => (
        <mesh key={`band-${idx}`} position={[0, h, -1.0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[20.35, 20.40, 64, 1, -Math.PI * 0.82, Math.PI * 1.64]} />
          <meshBasicMaterial color={wallLightColor} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* Architectural Vertical Light Fins */}
      {finConfigs.map((f, i) => (
        <group key={i} position={f.pos} rotation={[0, f.rotY, 0]}>
          <mesh>
            <boxGeometry args={[0.3, 11.0, 0.7]} />
            <meshStandardMaterial color="#0e172a" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0, 0.36]}>
            <boxGeometry args={[0.05, 10.8, 0.05]} />
            <meshBasicMaterial color={wallLightColor} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * Ceiling Lighting Truss Rig
 */
export function StudioCeilingRig() {
  return (
    <group position={[0, 11.5, -1.5]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[9.5, 0.14, 12, 64]} />
        <meshStandardMaterial color="#334155" metalness={0.92} roughness={0.2} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[5.5, 0.12, 12, 48]} />
        <meshStandardMaterial color="#475569" metalness={0.92} roughness={0.2} />
      </mesh>
      {[0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4].map((ang, i) => (
        <mesh key={i} rotation={[0, ang, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, 19.0, 12]} />
          <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.25} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Audience Amphitheater in Studio Background
 */
export function AudienceAmphitheater({
  audienceFadeProgress = 0,
}: {
  audienceFadeProgress?: number;
}) {
  const seatGlowColor = useMemo(() => {
    const c = new THREE.Color("#051636");
    c.lerp(new THREE.Color("#3d030b"), audienceFadeProgress);
    return c;
  }, [audienceFadeProgress]);

  const tiers = [0, 1, 2, 3, 4];

  return (
    <group position={[0, 0, 10.5]}>
      {tiers.map((tIdx) => {
        const radius = 9.5 + tIdx * 1.5;
        const tierHeight = (tIdx + 1) * 0.55;
        return (
          <group key={tIdx} position={[0, tierHeight / 2, 0]}>
            <mesh rotation={[0, Math.PI, 0]}>
              <cylinderGeometry
                args={[radius, radius, tierHeight, 32, 1, true, -Math.PI * 0.35, Math.PI * 0.7]}
              />
              <meshStandardMaterial color="#080c14" metalness={0.8} roughness={0.4} />
            </mesh>
            <mesh position={[0, tierHeight / 2, 0]} rotation={[0, Math.PI, 0]}>
              <cylinderGeometry
                args={[radius - 0.2, radius - 0.2, 0.25, 32, 1, true, -Math.PI * 0.34, Math.PI * 0.68]}
              />
              <meshStandardMaterial color={seatGlowColor} roughness={0.7} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/**
 * Studio Lighting Rig Controller:
 * Coordinates multi-zone broadcast illumination, smooth blue/red color fades,
 * and Về Đích dramatic dimming + spotlight chase behaviors.
 */
export function StudioLighting({
  screenFadeProgress = 0,
  stageFadeProgress = 0,
  audienceFadeProgress = 0,
  quality = "HIGH",
  isVeDichDimmed = false,
  activeMainContestantSeat = null,
  is5sBuzzerChasing = false,
  spotlightChaseIndex = 0,
  lockedSpotlightSeat = null,
  introStartedAt = null,
  serverNow,
}: StudioLightingProps) {
  // Opening sequence light progression:
  // 0-4s: Pitch black (dimFactor = 0.04)
  // 4-12s: Hexagon portal / MC illuminated (dimFactor = 0.22)
  // 12-20s: Full studio wash lights turn on (dimFactor -> 1.0)
  const now = serverNow ? serverNow() : Date.now();
  let introDimFactor = 1.0;
  let mcSpotIntensity = 6.0;

  if (introStartedAt) {
    const elapsedSec = Math.max(0, (now - introStartedAt) / 1000);
    if (elapsedSec < 20) {
      if (elapsedSec < 4) {
        introDimFactor = 0.04;
        mcSpotIntensity = 0.2;
      } else if (elapsedSec < 12) {
        introDimFactor = 0.22;
        mcSpotIntensity = 7.5;
      } else {
        const washT = Math.min(1.0, (elapsedSec - 12) / 7.0);
        const smoothWash = washT * washT * (3 - 2 * washT);
        introDimFactor = 0.22 + 0.78 * smoothWash;
        mcSpotIntensity = 6.0;
      }
    }
  }

  // Screen Zone Down-Wash Color
  const screenWashColor = useMemo(() => {
    const c = new THREE.Color("#0a2663");
    c.lerp(new THREE.Color("#d90429"), screenFadeProgress);
    return c;
  }, [screenFadeProgress]);

  // Stage Back Wash Color
  const stageBackColor = useMemo(() => {
    const c = new THREE.Color("#081a44");
    c.lerp(new THREE.Color("#b80320"), stageFadeProgress);
    return c;
  }, [stageFadeProgress]);

  // Stage Rim Wash Color
  const stageRimColor = useMemo(() => {
    const c = new THREE.Color("#00e5ff");
    c.lerp(new THREE.Color("#ff2244"), stageFadeProgress);
    return c;
  }, [stageFadeProgress]);

  // Audience Wash Color
  const audienceWashColor = useMemo(() => {
    const c = new THREE.Color("#05102a");
    c.lerp(new THREE.Color("#7a0215"), audienceFadeProgress);
    return c;
  }, [audienceFadeProgress]);

  // Ambient & Key Light Intensity Factors (Dimmed during Về Đích & Opening)
  const ambientIntensity = (isVeDichDimmed ? 0.35 : 1.45) * introDimFactor;
  const keyIntensity = (isVeDichDimmed ? 0.9 : 3.8) * introDimFactor;
  const fillIntensity = (isVeDichDimmed ? 0.45 : 2.4) * introDimFactor;

  return (
    <group>
      {/* ── 1. AMBIENT & BROADCAST KEY LIGHTS ── */}
      <ambientLight intensity={ambientIntensity} color="#e0f2fe" />

      {/* Screen Zone Overhead Downlight */}
      <pointLight position={[0, 5.0, -4.5]} intensity={(isVeDichDimmed ? 1.5 : 4.5) * introDimFactor} color={screenWashColor} distance={12} />

      {/* Main Directional Key Spotlight (Stage Center) */}
      <directionalLight
        position={[4.5, 12.0, 7.5]}
        intensity={keyIntensity}
        color="#ffffff"
        castShadow={quality === "HIGH"}
      />

      {/* Fill Light (Stage Left) */}
      <directionalLight
        position={[-6.0, 10.0, 6.0]}
        intensity={fillIntensity}
        color="#e0f2fe"
      />

      {/* Front Broadcast Key Flood Light (Directly illuminates front of contestant podiums & MC desk) */}
      <directionalLight
        position={[0.0, 4.5, 8.0]}
        intensity={(isVeDichDimmed ? 0.7 : 3.5) * introDimFactor}
        color="#ffffff"
      />

      {/* Dedicated MC Desk / Hexagon Portal Front Spotlight (Bright Crisp Keylight) */}
      <spotLight
        position={[3.0, 6.8, 0.2]}
        target-position={[1.9, 1.3, -2.6]}
        intensity={mcSpotIntensity * 1.4}
        color="#fffcf5"
        angle={0.58}
        penumbra={0.3}
        distance={15}
      />

      {/* Broadcast Fill Light onto Contestant Podiums & Figures */}
      <spotLight
        position={[-4.0, 7.5, 1.8]}
        target-position={[-4.2, 0.85, -2.9]}
        intensity={7.0 * introDimFactor}
        color="#e0f2fe"
        angle={0.72}
        penumbra={0.4}
        distance={15}
      />

      {/* ── 2. STAGE BACK LIGHTS ── */}
      <spotLight
        position={[-7.5, 8.5, -5.0]}
        target-position={[0, 3.0, -6.5]}
        intensity={isVeDichDimmed ? 3.0 : 8.5}
        color={stageBackColor}
        angle={0.65}
        penumbra={0.5}
        distance={20}
      />

      <spotLight
        position={[7.5, 8.5, -5.0]}
        target-position={[0, 3.0, -6.5]}
        intensity={isVeDichDimmed ? 3.0 : 8.5}
        color={stageBackColor}
        angle={0.65}
        penumbra={0.5}
        distance={20}
      />

      {/* Broadcast Wing Cyc Wash Lights (Stage Left behind formula wall & Stage Right) */}
      <pointLight position={[-6.5, 4.0, -3.5]} color={screenWashColor} intensity={isVeDichDimmed ? 1.5 : 6.0} distance={15} />
      <pointLight position={[6.5, 4.0, -3.5]} color={screenWashColor} intensity={isVeDichDimmed ? 1.5 : 6.0} distance={15} />
      <pointLight position={[0, 6.0, -6.0]} color={stageBackColor} intensity={isVeDichDimmed ? 2.0 : 7.5} distance={16} />

      {/* Floor Up-Wash Lights onto Backdrop */}
      <pointLight position={[-4.5, 0.5, -6.0]} intensity={3.5} color={stageRimColor} distance={8} />
      <pointLight position={[4.5, 0.5, -6.0]} intensity={3.5} color={stageRimColor} distance={8} />
      <pointLight position={[0.0, 0.5, -6.2]} intensity={4.0} color={stageRimColor} distance={8} />

      {/* ── 3. VỀ ĐÍCH SPECIAL OVERHEAD SPOTLIGHTS (TS 1..4) ── */}
      {CONTESTANT_POSITIONS.map((pos, sIdx) => {
        // Evaluate spotlight state for this seat
        const isLocked = lockedSpotlightSeat === sIdx;
        const isChased = is5sBuzzerChasing && spotlightChaseIndex === sIdx;
        const isMainActive = isVeDichDimmed && !is5sBuzzerChasing && lockedSpotlightSeat == null && activeMainContestantSeat === sIdx;

        const isLit = isLocked || isChased || isMainActive;
        const spotIntensity = isLocked ? 13.0 : isChased ? 9.5 : isMainActive ? 8.5 : 0.0;
        const spotColor = isLocked ? "#ffffff" : isChased ? "#00e5ff" : "#fff8e7";

        if (!isLit) return null;

        return (
          <spotLight
            key={`ts-spot-${sIdx}`}
            position={[pos[0], 7.5, pos[2] + 0.8]}
            target-position={[pos[0], 1.2, pos[2]]}
            color={spotColor}
            intensity={spotIntensity}
            angle={0.4}
            penumbra={0.3}
            distance={11}
          />
        );
      })}

      {/* ── 4. AUDIENCE AMPHITHEATER LIGHTS ── */}
      <spotLight
        position={[0, 9.0, 4.0]}
        target-position={[0, 2.0, 12.0]}
        intensity={isVeDichDimmed ? 1.5 : 4.5}
        color={audienceWashColor}
        angle={0.8}
        penumbra={0.6}
        distance={22}
      />

      {/* ── 5. FAUX VOLUMETRIC BROADCAST SPOTLIGHT CONES (Zero lag, 60 FPS, AdditiveBlending) ── */}
      {/* Cone 1: Over Central Stage / MC Area */}
      <mesh position={[0, 5.5, -0.6]} rotation={[0.08, 0, 0]}>
        <cylinderGeometry args={[0.2, 3.2, 11, 24, 1, true]} />
        <meshBasicMaterial
          color="#dbeafe"
          transparent
          opacity={0.075}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Cone 2: Over Contestant Dais */}
      <mesh position={[-4.1, 5.5, -2.7]} rotation={[0.06, 0, -0.08]}>
        <cylinderGeometry args={[0.25, 4.2, 11, 24, 1, true]} />
        <meshBasicMaterial
          color="#cffafe"
          transparent
          opacity={0.065}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* ── 6. STUDIO ENVIRONMENT GEOMETRY ── */}
      <StudioFloor stageFadeProgress={stageFadeProgress} quality={quality} />
      <StudioWalls stageFadeProgress={stageFadeProgress} />
      <StudioCeilingRig />
      <AudienceAmphitheater audienceFadeProgress={audienceFadeProgress} />
    </group>
  );
}
