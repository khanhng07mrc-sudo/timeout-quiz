"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { BroadcastCameras } from "./BroadcastCameras";

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
  camAngle?: number;
  ptzZoom?: number;
  pushInProgress?: number;
  // Pre-match Idle State (R4)
  isIdle?: boolean;
  idleFadeProgress?: number;
}

const CONTESTANT_POSITIONS: Array<[number, number, number]> = [
  [-6.38, 0.22, -2.20], // TS 1
  [-6.05, 0.22, -3.13], // TS 2
  [-5.59, 0.22, -4.01], // TS 3
  [-5.01, 0.22, -4.80], // TS 4
  [-4.31, 0.22, -5.50], // TS 5
  [-3.51, 0.22, -6.09], // TS 6
  [-2.64, 0.22, -6.55], // TS 7
  [-1.70, 0.22, -6.88], // TS 8
];

/**
 * TargetedSpotLight:
 * Fixes Three.js / React Three Fiber `<spotLight>` target disconnection bug.
 * Three.js requires `spotLight.target` to be mounted in the scene graph (`<primitive object={targetObj} />`)
 * for its world matrix and orientation to be computed properly. Without this, spotlights default to (0,0,0).
 */
export interface TargetedSpotLightProps {
  position: [number, number, number];
  targetPosition: [number, number, number];
  intensity: number;
  color: THREE.Color | string;
  angle?: number;
  penumbra?: number;
  distance?: number;
  decay?: number;
  castShadow?: boolean;
}

export function TargetedSpotLight({
  position,
  targetPosition,
  intensity,
  color,
  angle = 0.52,
  penumbra = 0.45,
  distance = 15,
  decay = 1.5,
  castShadow = false,
}: TargetedSpotLightProps) {
  const targetObj = useMemo(() => {
    const obj = new THREE.Object3D();
    obj.position.set(targetPosition[0], targetPosition[1], targetPosition[2]);
    obj.updateMatrixWorld();
    return obj;
  }, [targetPosition[0], targetPosition[1], targetPosition[2]]);

  return (
    <>
      <primitive object={targetObj} />
      <spotLight
        position={position}
        target={targetObj}
        intensity={intensity}
        color={color}
        angle={angle}
        penumbra={penumbra}
        distance={distance}
        decay={decay}
        castShadow={castShadow}
      />
    </>
  );
}

/**
 * Official Olympia Laurel Wreath Canvas Decal on Central Stage Floor.
 * Features:
 * - VÒNG NGUYỆT QUẾ ONLY (No extra text, pure wreath).
 * - High-res 2048x2048 canvas covering the central platform with concentric radar tracks,
 *   glowing cyan perimeter ring, championship gold ring, and symmetrical twin golden laurel branches.
 */
function createFloorLaurelWreathCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.scale(0.5, 0.5);

  const cx = 1024;
  const cy = 1024;

  ctx.clearRect(0, 0, 2048, 2048);

  // 1. Glossy Obsidian Circle Base
  const baseGrad = ctx.createRadialGradient(cx, cy, 100, cx, cy, 980);
  baseGrad.addColorStop(0, "rgba(8, 20, 48, 0.95)");
  baseGrad.addColorStop(0.7, "rgba(4, 10, 28, 0.98)");
  baseGrad.addColorStop(1, "rgba(2, 5, 16, 0.99)");
  ctx.fillStyle = baseGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 980, 0, Math.PI * 2);
  ctx.fill();

  // 2. Outer Segmented Radar Track with 72 Ticks
  ctx.save();
  ctx.strokeStyle = "rgba(0, 240, 255, 0.6)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 72; i++) {
    const angle = (i / 72) * Math.PI * 2;
    const r1 = 940;
    const r2 = i % 6 === 0 ? 965 : 952;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
    ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
    ctx.stroke();
  }
  ctx.restore();

  // 3. Radiant Cyan Neon Perimeter Ring
  ctx.save();
  ctx.strokeStyle = "rgba(0, 240, 255, 0.85)";
  ctx.lineWidth = 14;
  ctx.shadowColor = "#00f0ff";
  ctx.shadowBlur = 35;
  ctx.beginPath();
  ctx.arc(cx, cy, 900, 0, Math.PI * 2);
  ctx.stroke();

  // 4. Inner Championship Gold Track Ring
  ctx.strokeStyle = "rgba(255, 215, 0, 0.75)";
  ctx.lineWidth = 7;
  ctx.shadowColor = "#ffd700";
  ctx.shadowBlur = 22;
  ctx.beginPath();
  ctx.arc(cx, cy, 760, 0, Math.PI * 2);
  ctx.stroke();

  // 5. Segmented Cyan Ring (Dashed HUD circle)
  ctx.setLineDash([24, 16]);
  ctx.strokeStyle = "rgba(56, 189, 248, 0.55)";
  ctx.lineWidth = 4;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(cx, cy, 620, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // 6. Draw Laurel Wreath Leaves (VÒNG NGUYỆT QUẾ ONLY - Grand Metallic Gold with Cyan Aura)
  const leafCount = 22;
  const wreathRadius = 600;

  for (const side of [-1, 1]) {
    ctx.save();
    ctx.shadowColor = "#ffd700";
    ctx.shadowBlur = 35;

    for (let i = 0; i < leafCount; i++) {
      const frac = i / (leafCount - 1);
      const ang = Math.PI * 0.5 + side * (frac * Math.PI * 0.85);
      const r = wreathRadius + Math.sin(frac * Math.PI) * 110;
      const lx = cx + Math.cos(ang) * r;
      const ly = cy + Math.sin(ang) * r;

      const leafRot = ang + side * (Math.PI * 0.44 + frac * 0.22);
      const leafScale = 80 + Math.sin(frac * Math.PI) * 50;

      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(leafRot);

      const leafGrad = ctx.createLinearGradient(-leafScale, 0, leafScale, 0);
      leafGrad.addColorStop(0, "#ffffff");
      leafGrad.addColorStop(0.20, "#fffbd0");
      leafGrad.addColorStop(0.50, "#ffd700");
      leafGrad.addColorStop(0.85, "#b45309");
      leafGrad.addColorStop(1, "#00f0ff");

      ctx.fillStyle = leafGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, leafScale, leafScale * 0.46, 0, 0, Math.PI * 2);
      ctx.fill();

      // Leaf spine highlight
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 5;
      ctx.shadowBlur = 8;
      ctx.shadowColor = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(-leafScale * 0.8, 0);
      ctx.lineTo(leafScale * 0.8, 0);
      ctx.stroke();

      ctx.restore();

      // Golden berries between leaves
      if (i % 2 === 1 && i < leafCount - 2) {
        ctx.save();
        const berryR = r - 55;
        const bx = cx + Math.cos(ang) * berryR;
        const by = cy + Math.sin(ang) * berryR;
        ctx.fillStyle = "#ffe066";
        ctx.shadowColor = "#ffd700";
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(bx, by, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Stem ribbon at bottom
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 18;
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(cx, cy, wreathRadius, Math.PI * 0.5 - 0.28, Math.PI * 0.5 + 0.28);
    ctx.stroke();

    ctx.restore();
  }

  // Golden bow knot at bottom center
  ctx.save();
  ctx.fillStyle = "#ffd700";
  ctx.shadowColor = "#ffd700";
  ctx.shadowBlur = 26;
  ctx.beginPath();
  ctx.arc(cx, cy + wreathRadius + 15, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

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
 * Creates continuous curved floor wash ribbon geometry with smooth radial falloff.
 * Eliminates discrete pinpoint bulbs; creates unbroken global cove lighting across the entire cluster.
 */
function createAnnularGlowGeometry(
  rIn: number,
  rOut: number,
  startAng: number,
  endAng: number,
  segments: number = 64
): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const rings = 8;
  for (let rIdx = 0; rIdx <= rings; rIdx++) {
    const rT = rIdx / rings;
    const r = rIn + rT * (rOut - rIn);
    // Peak under cove lip (rT = 1.0), fading smoothly outwards to the black floor (rT = 0.0)
    const alpha = Math.pow(rT, 1.8);
    const red = 0.0 * alpha;
    const green = 0.92 * alpha;
    const blue = 1.0 * alpha;

    for (let sIdx = 0; sIdx <= segments; sIdx++) {
      const sT = sIdx / segments;
      const ang = startAng + sT * (endAng - startAng);
      const x = Math.cos(ang) * r;
      const y = 0.005;
      const z = -Math.sin(ang) * r - 0.5;

      positions.push(x, y, z);
      colors.push(red, green, blue);
    }
  }

  for (let rIdx = 0; rIdx < rings; rIdx++) {
    for (let sIdx = 0; sIdx < segments; sIdx++) {
      const p1 = rIdx * (segments + 1) + sIdx;
      const p2 = (rIdx + 1) * (segments + 1) + sIdx;
      const p3 = (rIdx + 1) * (segments + 1) + (sIdx + 1);
      const p4 = rIdx * (segments + 1) + (sIdx + 1);

      indices.push(p1, p2, p3);
      indices.push(p1, p3, p4);
    }
  }

  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geom.setIndex(indices);
  return geom;
}

/**
 * Creates a continuous vertical curved fascia ribbon BufferGeometry
 * for the step slot cove, exactly matching the parametric curve:
 * x = cos(ang) * radius, z = -sin(ang) * radius - 0.5
 */
function createCurvedCoveFasciaGeometry(
  radius: number,
  startAng: number,
  endAng: number,
  yBottom: number = 0.015,
  yTop: number = 0.215,
  segments: number = 64
): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  const positions: number[] = [];
  const indices: number[] = [];

  for (let sIdx = 0; sIdx <= segments; sIdx++) {
    const sT = sIdx / segments;
    const ang = startAng + sT * (endAng - startAng);
    const x = Math.cos(ang) * radius;
    const z = -Math.sin(ang) * radius - 0.5;

    positions.push(x, yBottom, z);
    positions.push(x, yTop, z);
  }

  for (let sIdx = 0; sIdx < segments; sIdx++) {
    const b1 = sIdx * 2;
    const t1 = sIdx * 2 + 1;
    const b2 = (sIdx + 1) * 2;
    const t2 = (sIdx + 1) * 2 + 1;

    indices.push(b1, t1, t2);
    indices.push(b1, t2, b2);
  }

  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * High-specular PBR Studio Epoxy Floor with Concentric Center Stage,
 * Raised Contestant Platform (+8cm step with glowing rim), and Laurel Wreath Decal.
 */
/**
 * Unified Stage Platform Analytical Geometry (Unified Dais Platform):
 * Analytically unions the main central circle (R1=3.25m, C1=[0, -0.5]) and
 * the protrusion lobe (R2=1.35m, C2=[1.8, 2.6]) into a single seamless continuous 2D shape.
 */
function createUnifiedDaisShape(): {
  shape: THREE.Shape;
  perimeterPoints: THREE.Vector3[];
  lobePoints: THREE.Vector3[];
} {
  const shape = new THREE.Shape();
  // 3D coordinates: C1 = (0, 0, -0.5), R1 = 3.25; C2 = (1.8, 0, 2.6), R2 = 1.35
  // Rotated [-PI/2, 0, 0] in 3D, so 2D y corresponds to -3D Z:
  const c1x = 0;
  const c1y = 0.5;
  const r1 = 3.25;

  const c2x = 1.8;
  const c2y = -2.6;
  const r2 = 1.35;

  const dx = c2x - c1x;
  const dy = c2y - c1y;
  const d = Math.sqrt(dx * dx + dy * dy);
  const alpha = Math.atan2(dy, dx);

  const cosTheta1 = Math.max(-1, Math.min(1, (r1 * r1 + d * d - r2 * r2) / (2 * r1 * d)));
  const theta1 = Math.acos(cosTheta1);

  const cosTheta2 = Math.max(-1, Math.min(1, (r2 * r2 + d * d - r1 * r1) / (2 * r2 * d)));
  const theta2 = Math.acos(cosTheta2);

  const perimeterPoints: THREE.Vector3[] = [];
  const lobePoints: THREE.Vector3[] = [];

  // 1. Protrusion Lobe Arc (Around C2 from Point A to Point B through front tip)
  const nLobe = 36;
  const lobeSpan = 2 * Math.PI - 2 * theta2;
  const lobeStart = alpha - Math.PI + theta2;

  for (let i = 0; i <= nLobe; i++) {
    const t = i / nLobe;
    const ang = lobeStart + t * lobeSpan;
    const x = c2x + r2 * Math.cos(ang);
    const y = c2y + r2 * Math.sin(ang);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);

    const pt3d = new THREE.Vector3(x, 0.185, -y);
    perimeterPoints.push(pt3d);
    lobePoints.push(pt3d);
  }

  // 2. Main Stage Circle Arc (Around C1 from Point B to Point A through stage rear)
  const nMain = 72;
  const mainSpan = 2 * Math.PI - 2 * theta1;
  const mainStart = alpha + theta1;

  for (let i = 1; i < nMain; i++) {
    const s = i / nMain;
    const ang = mainStart + s * mainSpan;
    const x = c1x + r1 * Math.cos(ang);
    const y = c1y + r1 * Math.sin(ang);
    shape.lineTo(x, y);

    const pt3d = new THREE.Vector3(x, 0.185, -y);
    perimeterPoints.push(pt3d);
  }

  shape.closePath();
  return { shape, perimeterPoints, lobePoints };
}

/**
 * Stage Floor Architecture:
 * - High-Gloss Deep Navy Broadcast Floor Disc
 * - UNIFIED DAIS PLATFORM (Khối sàn liên tục duy nhất tích hợp cung cong lồi vươn về khán giả)
 * - Continuous glowing perimeter neon contour ribbon running along the entire boundary
 * - Official Olympia 2016 golden laurel wreath floor decal
 */
export function StudioFloor({
  stageFadeProgress = 0,
  quality = "HIGH",
  liveFactor = 1.0,
}: {
  stageFadeProgress?: number;
  quality?: "HIGH" | "MEDIUM" | "LIGHT";
  liveFactor?: number;
}) {
  const ringColor = useMemo(() => {
    const baseColor = stageFadeProgress > 0.5 ? new THREE.Color("#ff1a40") : new THREE.Color("#00f0ff");
    const darkDormant = new THREE.Color("#020712");
    return darkDormant.lerp(baseColor, Math.max(0.0, Math.min(1.0, liveFactor)));
  }, [stageFadeProgress, liveFactor]);

  const goldColor = new THREE.Color("#ffd700");

  // Official Olympia 2016 Laurel Wreath Texture from /brand/olympia_laurel_2016.webp
  const [laurelTexture, setLaurelTexture] = React.useState<THREE.Texture | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const loader = new THREE.TextureLoader();
    loader.load(
      "/brand/olympia_laurel_2016.webp",
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        setLaurelTexture(tex);
      },
      undefined,
      () => {
        loader.load("/olympia/Olympia_logo_2016.webp", (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.needsUpdate = true;
          setLaurelTexture(tex);
        });
      }
    );
  }, []);

  // Floor Laurel Wreath Canvas Texture (Fallback)
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

  // Unified Dais Platform Shape & Perimeter Contours
  const { shape: unifiedDaisShape, perimeterPoints: daisPerimeterPts, lobePoints: daisLobePts } = useMemo(
    () => createUnifiedDaisShape(),
    []
  );

  const unifiedDaisGeom = useMemo(
    () =>
      new THREE.ExtrudeGeometry(unifiedDaisShape, {
        depth: 0.18,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: 0.03,
        bevelThickness: 0.02,
      }),
    [unifiedDaisShape]
  );

  // 3D Tube Neon Contour Ribbon along the unified dais upper rim (Y = 0.185m)
  const daisPerimeterTube = useMemo(() => {
    const pts = daisPerimeterPts.map((p) => new THREE.Vector3(p.x, 0.185, p.z));
    const curve = new THREE.CatmullRomCurve3(pts, true, "centripetal");
    return new THREE.TubeGeometry(curve, 128, 0.025, 8, true);
  }, [daisPerimeterPts]);

  // Lower Ground-Level Step-Light Tube (Y = 0.022m)
  const daisBaseTube = useMemo(() => {
    const pts = daisPerimeterPts.map((p) => new THREE.Vector3(p.x, 0.022, p.z));
    const curve = new THREE.CatmullRomCurve3(pts, true, "centripetal");
    return new THREE.TubeGeometry(curve, 128, 0.016, 8, true);
  }, [daisPerimeterPts]);

  // Intense 3D Tube specifically hugging the Protrusion Lobe (Y = 0.188m)
  const daisLobeTube = useMemo(() => {
    const pts = daisLobePts.map((p) => new THREE.Vector3(p.x, 0.188, p.z));
    const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
    return new THREE.TubeGeometry(curve, 48, 0.036, 8, false);
  }, [daisLobePts]);

  // 5 Embedded Floor Uplight Pucks along the Protrusion Lobe curve
  const lobePuckPositions = useMemo(() => {
    const indices = [4, 11, 18, 25, 32];
    return indices
      .filter((idx) => idx < daisLobePts.length)
      .map((idx) => daisLobePts[idx]);
  }, [daisLobePts]);

  // Raised Contestant Dais Extruded Geometry (Y = 0.22m for 4 to 8 contestants)
  const daisGeometry = useMemo(() => {
    const shape = createAnnularSectorShape(5.2, 7.6, 0.50 * Math.PI, 1.10 * Math.PI, 48);
    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.22,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.03,
      bevelThickness: 0.02,
    });
  }, []);

  // Step-light points along the front edge of the contestant platform (r = 5.2m)
  const stepLightPoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const count = 48;
    const startAng = 0.50 * Math.PI;
    const endAng = 1.10 * Math.PI;
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const a = startAng + t * (endAng - startAng);
      const x = Math.cos(a) * 5.22;
      const z = -Math.sin(a) * 5.22;
      pts.push(new THREE.Vector3(x, 0.215, z - 0.5));
    }
    return pts;
  }, []);

  // 3D Volumetric Glowing Neon Tube along the curved front step lip of the contestant platform (R = 5.20m, Y = 0.215m)
  const daisCoveTubeGeom = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(stepLightPoints, false);
    return new THREE.TubeGeometry(curve, 64, 0.022, 12, false);
  }, [stepLightPoints]);

  // Recessed Metallic Trim / Casing along the upper lip of the cove (R = 5.23m, Y = 0.224m)
  const daisCoveTrimGeom = useMemo(() => {
    const trimPoints = stepLightPoints.map((p) => new THREE.Vector3(p.x * 1.002, 0.224, (p.z + 0.5) * 1.002 - 0.5));
    const curve = new THREE.CatmullRomCurve3(trimPoints, false);
    return new THREE.TubeGeometry(curve, 64, 0.015, 8, false);
  }, [stepLightPoints]);

  // Continuous Global Floor Cove Light Glow Ribbons (Unbroken luminous cyan sheets)
  const coveLeftFloorGlowGeom = useMemo(
    () => createAnnularGlowGeometry(4.20, 5.25, 0.50 * Math.PI, 1.10 * Math.PI, 64),
    []
  );

  // Continuous Curved Cove Vertical Fascia Backplate inside the left slot
  const coveLeftFasciaGeom = useMemo(
    () => createCurvedCoveFasciaGeometry(5.21, 0.50 * Math.PI, 1.10 * Math.PI, 0.015, 0.215, 64),
    []
  );

  // Raised Stage-Right Platform Extruded Geometry (Y = 0.22m, balancing studio right side)
  const rightDaisGeometry = useMemo(() => {
    const shape = createAnnularSectorShape(5.2, 7.6, -0.08 * Math.PI, 0.48 * Math.PI, 48);
    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.22,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.03,
      bevelThickness: 0.02,
    });
  }, []);

  // Step-light points along the front edge of the stage-right platform (r = 5.2m)
  const rightStepLightPoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const count = 48;
    const startAng = -0.08 * Math.PI;
    const endAng = 0.48 * Math.PI;
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const a = startAng + t * (endAng - startAng);
      const x = Math.cos(a) * 5.22;
      const z = -Math.sin(a) * 5.22;
      pts.push(new THREE.Vector3(x, 0.215, z - 0.5));
    }
    return pts;
  }, []);

  const rightDaisCoveTubeGeom = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(rightStepLightPoints, false);
    return new THREE.TubeGeometry(curve, 64, 0.022, 12, false);
  }, [rightStepLightPoints]);

  const rightDaisCoveTrimGeom = useMemo(() => {
    const trimPoints = rightStepLightPoints.map((p) => new THREE.Vector3(p.x * 1.002, 0.224, (p.z + 0.5) * 1.002 - 0.5));
    const curve = new THREE.CatmullRomCurve3(trimPoints, false);
    return new THREE.TubeGeometry(curve, 64, 0.015, 8, false);
  }, [rightStepLightPoints]);

  const coveRightFloorGlowGeom = useMemo(
    () => createAnnularGlowGeometry(4.20, 5.25, -0.08 * Math.PI, 0.48 * Math.PI, 64),
    []
  );

  // Continuous Curved Cove Vertical Fascia Backplate inside the right slot
  const coveRightFasciaGeom = useMemo(
    () => createCurvedCoveFasciaGeometry(5.21, -0.08 * Math.PI, 0.48 * Math.PI, 0.015, 0.215, 64),
    []
  );

  return (
    <group position={[0, -0.01, 0]}>
      {/* ── 1. MAIN GLOSSY MIDNIGHT SAPPHIRE BROADCAST FLOOR DISC (MICA/ACRYLIC) ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[26, quality === "LIGHT" ? 32 : 64]} />
        <meshStandardMaterial
          color="#030818"
          roughness={0.09}
          metalness={0.12}
          envMapIntensity={2.8}
        />
      </mesh>

      {/* ── 2. UNIFIED DAIS PLATFORM (Khối sàn liên tục duy nhất tích hợp cung cong lồi vươn về khán giả) ── */}
      <group position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh geometry={unifiedDaisGeom}>
          <meshStandardMaterial
            color="#020510"
            roughness={0.07}
            metalness={0.04}
            envMapIntensity={2.5}
          />
        </mesh>
      </group>

      {/* 3D Glowing Perimeter Neon Tube Ribbon (Upper Rim at Y = 0.185m) */}
      <mesh geometry={daisPerimeterTube}>
        <meshBasicMaterial color={ringColor} />
      </mesh>
      {/* 3D Lower Base Neon Tube (Y = 0.022m) */}
      <mesh geometry={daisBaseTube}>
        <meshBasicMaterial color={ringColor} />
      </mesh>
      {/* Intense Glowing Neon Lip specifically along the Laurel Wreath Protrusion Lobe */}
      <mesh geometry={daisLobeTube}>
        <meshBasicMaterial color={ringColor} />
      </mesh>

      {/* Concentric Neon Rings on Main Stage Floor */}
      <mesh position={[0, 0.183, -0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.55, 2.62, 64]} />
        <meshBasicMaterial color={ringColor} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.183, -0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.75, 2.80, 64]} />
        <meshBasicMaterial color={ringColor} side={THREE.DoubleSide} />
      </mesh>

      {/* ── 2B. LAUREL WREATH VITRINE PROTRUSION LIGHTING ── */}
      {/* Upward Floor Light illuminating Laurel Wreath Cloche from base plinth */}
      <pointLight
        position={[1.8, 0.35, 2.6]}
        color="#fef08a"
        intensity={THREE.MathUtils.lerp(0.3, 5.5, liveFactor)}
        distance={3.5}
      />
      {/* Soft Fill Broadcast Keylight from overhead (Wide diffused cone, zero harsh lines) */}
      <TargetedSpotLight
        position={[1.8, 7.5, 2.6]}
        targetPosition={[1.8, 0.80, 2.6]}
        color="#fff7ed"
        intensity={3.5 * liveFactor}
        distance={12}
        angle={0.48}
        penumbra={0.85}
        castShadow={false}
      />

      {/* ── 3. OFFICIAL OLYMPIA LAUREL WREATH FLOOR DECAL (VÒNG NGUYỆT QUẾ CHUẨN THIẾT KẾ 2016, D=2.3M) ── */}
      {laurelTexture ? (
        <mesh position={[0, 0.185, -0.5]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={8}>
          <planeGeometry args={[2.3, 2.3]} />
          <meshBasicMaterial
            map={laurelTexture}
            transparent={true}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ) : wreathTexture ? (
        <mesh position={[0, 0.185, -0.5]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={8}>
          <circleGeometry args={[1.15, 64]} />
          <meshBasicMaterial
            map={wreathTexture}
            transparent={true}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ) : null}

      {/* ── 4. RAISED CONTESTANT DAIS PLATFORM (+8cm step, Y = 0.22m) ── */}
      {/* Curved dais elevating contestant stations proudly above central stage */}
      <group position={[0, 0, -0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh geometry={daisGeometry}>
          <meshStandardMaterial
            color="#030718"
            metalness={0.05}
            roughness={0.09}
            envMapIntensity={1.8}
          />
        </mesh>
      </group>

      {/* ── 4B. CONTESTANT DAIS COVE LIGHTING (ĐÈN RỌI SÁNG Ở KHE BỤC THÍ SINH) ── */}
      {/* 1. Volumetric 3D Glowing Neon Tube inside the step cove slot */}
      <mesh geometry={daisCoveTubeGeom}>
        <meshBasicMaterial color={ringColor} />
      </mesh>

      {/* 2. Dark Acrylic Casing Trim along the upper lip of the cove */}
      <mesh geometry={daisCoveTrimGeom}>
        <meshStandardMaterial color="#0b1220" metalness={0.20} roughness={0.25} />
      </mesh>

      {/* 3. Continuous Glowing Cove Fascia Backplate inside the left slot (100% parametric fit) */}
      <mesh geometry={coveLeftFasciaGeom}>
        <meshBasicMaterial color={ringColor} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>

      {/* 4. Continuous Floor Wash Ribbon (Seamless unbroken global electric cyan light wash across entire arc) */}
      <mesh geometry={coveLeftFloorGlowGeom}>
        <meshBasicMaterial
          vertexColors
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* 5. Global Diffuse Overhead Fill Light for Left Contestant Cluster (Elevated at Y=5.8m to prevent pinpoint floor hot spots) */}
      <pointLight position={[-4.2, 5.8, -2.8]} color="#00e5ff" intensity={4.5 * liveFactor} distance={18} decay={1.8} />

      {/* ── 4C. STAGE-RIGHT RAISED PLATFORM & COVE LIGHTING (ĐÈN KHE TOÀN CỤC BÊN PHẢI) ── */}
      <group position={[0, 0, -0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh geometry={rightDaisGeometry}>
          <meshStandardMaterial
            color="#030718"
            metalness={0.05}
            roughness={0.09}
            envMapIntensity={1.8}
          />
        </mesh>
      </group>

      <mesh geometry={rightDaisCoveTubeGeom}>
        <meshBasicMaterial color={ringColor} />
      </mesh>

      {/* Continuous Glowing Cove Fascia Backplate inside the right slot (100% parametric fit) */}
      <mesh geometry={coveRightFasciaGeom}>
        <meshBasicMaterial color={ringColor} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>

      <mesh geometry={rightDaisCoveTrimGeom}>
        <meshStandardMaterial color="#0b1220" metalness={0.20} roughness={0.25} />
      </mesh>

      {/* Continuous Floor Wash Ribbon on Right Side */}
      <mesh geometry={coveRightFloorGlowGeom}>
        <meshBasicMaterial
          vertexColors
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Global Diffuse Overhead Fill Light for Right Stage Cluster (Elevated at Y=5.8m to prevent pinpoint floor hot spots) */}
      <pointLight position={[4.2, 5.8, -2.8]} color="#00e5ff" intensity={4.5 * liveFactor} distance={18} decay={1.8} />
    </group>
  );
}

/**
 * Authentic Deep Sapphire to Navy Blue Gradient Studio Cyclorama Canvas
 * Provides a continuous, seamless, unblocked 360-degree broadcast backdrop
 * with dramatic contrast and dark surroundings.
 */
function createStudioCycGradientCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.scale(0.25, 0.25);

  // 1. Vertical linear gradient from floor up to ceiling - dark sapphire to void
  const vGrad = ctx.createLinearGradient(0, 512, 0, 0);
  vGrad.addColorStop(0.0, "#030e28"); // deep sapphire floor horizon
  vGrad.addColorStop(0.20, "#010718"); // deep midnight navy
  vGrad.addColorStop(0.50, "#00030a"); // near black
  vGrad.addColorStop(1.0, "#000104"); // pure deep void ceiling junction
  ctx.fillStyle = vGrad;
  ctx.fillRect(0, 0, 2048, 512);

  // 2. Wide subtle atmospheric blue halo across the rear stage center (X=0, Z=-R)
  const glowGrad = ctx.createRadialGradient(1024, 280, 20, 1024, 280, 850);
  glowGrad.addColorStop(0.0, "rgba(0, 160, 255, 0.15)");
  glowGrad.addColorStop(0.40, "rgba(2, 20, 60, 0.08)");
  glowGrad.addColorStop(1.0, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, 2048, 512);

  return canvas;
}

/**
 * Studio Perimeter Walls with 8 Horizontal Radiant Cyan/Red Broadcast Neon Bands
 * (Matching authentic VTV3 Studio S14 broadcast photos, zero vertical fin clutter, ultra-optimized)
 */
export function StudioWalls({
  stageFadeProgress = 0,
  liveFactor = 1.0,
}: {
  stageFadeProgress?: number;
  liveFactor?: number;
}) {
  const wallLightColor = useMemo(() => {
    const baseColor = stageFadeProgress > 0.5 ? new THREE.Color("#ff1133") : new THREE.Color("#00d4ff");
    const darkDormant = new THREE.Color("#020712");
    return darkDormant.lerp(baseColor, Math.max(0.0, Math.min(1.0, liveFactor)));
  }, [stageFadeProgress, liveFactor]);

  // 8 Parallel Horizontal Neon Bands from Y = 1.2m to 8.6m
  const horizontalBandHeights = useMemo(() => [1.2, 2.2, 3.2, 4.2, 5.3, 6.4, 7.5, 8.6], []);

  // Pre-rendered 360-degree deep sapphire to navy gradient canvas texture
  const cycTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = createStudioCycGradientCanvas();
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.generateMipmaps = true;
    return tex;
  }, []);

  return (
    <group>
      {/* 360-Degree Seamless Deep Sapphire Studio Cyc Enclosure (Zero Gap, 100% Sealed) */}
      <mesh position={[0, 6.0, -1.0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[20.5, 20.5, 13, 64, 1, true, 0, Math.PI * 2]} />
        <meshBasicMaterial
          map={cycTexture ?? undefined}
          color={cycTexture ? "#ffffff" : "#030c24"}
          side={THREE.BackSide}
          toneMapped={false}
        />
      </mesh>

      {/* 8 Horizontal Glowing Neon Bands along Cyc Wall (Wrapping 360 degrees seamlessly) */}
      {horizontalBandHeights.map((h, idx) => (
        <mesh key={`band-${idx}`} position={[0, h, -1.0]}>
          <cylinderGeometry args={[20.42, 20.42, 0.08, 64, 1, true, 0, Math.PI * 2]} />
          <meshBasicMaterial color={wallLightColor} side={THREE.DoubleSide} />
        </mesh>
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
 * Cheering Banner Canvas for Student Audience
 */
function createBannerCanvas(text: string, bgColor: string, textColor: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 504, 120);

  ctx.fillStyle = textColor;
  ctx.font = '900 40px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 64);

  return canvas;
}

/**
 * Fallback Canvas if AI Image is loading:
 * Generates the authentic VTV3 Studio S14 Audience Grandstand Backdrop:
 * - Deep royal sapphire cosmic background.
 * - 8 Subtle Translucent Knowledge Badges (CHÌM MỜ ~18% opacity like authentic broadcast watermark).
 * - Central faceted geometric Olympia mountain peaks framed neatly inside the portal alcove with winding blue river and summit flag.
 */
function createAudienceBackdropCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.scale(0.5, 0.5);

  const w = 4096;
  const h = 1024;

  // Deep royal sapphire background gradient (ultra-wide 4:1 panorama)
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, "#030c24");
  bgGrad.addColorStop(0.35, "#071c4c");
  bgGrad.addColorStop(0.75, "#051336");
  bgGrad.addColorStop(1, "#020714");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Subtle micro-stars & cosmic particles
  ctx.save();
  for (let s = 0; s < 380; s++) {
    const sx = Math.sin(s * 997) * 0.5 + 0.5;
    const sy = Math.cos(s * 613) * 0.5 + 0.5;
    const px = sx * w;
    const py = sy * h * 0.88;
    const sr = (s % 5 === 0) ? 1.8 : (s % 3 === 0 ? 1.2 : 0.8);
    ctx.beginPath();
    ctx.arc(px, py, sr, 0, Math.PI * 2);
    ctx.fillStyle = (s % 4 === 0) ? "rgba(56, 189, 248, 0.45)" : "rgba(255, 255, 255, 0.40)";
    ctx.fill();
  }
  ctx.restore();

  // 8 PROMINENT BROADCAST KNOWLEDGE BADGES & CONSTELLATION MESH across wide wings
  const badges: Array<{ x: number; y: number; label: string; icon: string }> = [
    { x: 380, y: 280, label: "KHOA HỌC", icon: "book_atom" },
    { x: 720, y: 560, label: "HỌC VẤN", icon: "cap" },
    { x: 1080, y: 240, label: "CHIẾN THẮNG", icon: "trophy" },
    { x: 1440, y: 520, label: "TRÍ TUỆ", icon: "brain" },
    { x: 2650, y: 520, label: "BẰNG CẤP", icon: "cert" },
    { x: 3010, y: 240, label: "SÁNG TẠO", icon: "gears" },
    { x: 3370, y: 560, label: "TIẾN BỘ", icon: "chart" },
    { x: 3710, y: 280, label: "KHÁM PHÁ", icon: "molecule" },
  ];

  // Distant Background Mountain Silhouettes on Flanks (Crisp and defined per user request)
  ctx.save();
  const leftMtnGrad = ctx.createLinearGradient(0, 600, 0, h);
  leftMtnGrad.addColorStop(0, "rgba(10, 32, 77, 0.88)");
  leftMtnGrad.addColorStop(1, "rgba(3, 10, 28, 0.98)");
  ctx.fillStyle = leftMtnGrad;
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, 680);
  ctx.lineTo(240, 640);
  ctx.lineTo(520, 690);
  ctx.lineTo(840, 610);
  ctx.lineTo(1160, 670);
  ctx.lineTo(1460, 620);
  ctx.lineTo(1680, 760);
  ctx.lineTo(1680, h);
  ctx.closePath();
  ctx.fill();

  const rightMtnGrad = ctx.createLinearGradient(0, 600, 0, h);
  rightMtnGrad.addColorStop(0, "rgba(10, 32, 77, 0.88)");
  rightMtnGrad.addColorStop(1, "rgba(3, 10, 28, 0.98)");
  ctx.fillStyle = rightMtnGrad;
  ctx.beginPath();
  ctx.moveTo(2416, h);
  ctx.lineTo(2416, 760);
  ctx.lineTo(2636, 620);
  ctx.lineTo(2936, 670);
  ctx.lineTo(3256, 610);
  ctx.lineTo(3576, 690);
  ctx.lineTo(3856, 640);
  ctx.lineTo(w, 680);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  // Subtle wireframe ridges on distant mountains
  ctx.strokeStyle = "rgba(56, 189, 248, 0.28)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 680); ctx.lineTo(240, 640); ctx.lineTo(520, 690); ctx.lineTo(840, 610); ctx.lineTo(1160, 670); ctx.lineTo(1460, 620); ctx.lineTo(1680, 760);
  ctx.moveTo(2416, 760); ctx.lineTo(2636, 620); ctx.lineTo(2936, 670); ctx.lineTo(3256, 610); ctx.lineTo(3576, 690); ctx.lineTo(3856, 640); ctx.lineTo(w, 680);
  ctx.stroke();
  ctx.restore();

  // Constellation Network Interconnection Lines
  ctx.save();
  ctx.strokeStyle = "rgba(56, 189, 248, 0.45)";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  for (let i = 0; i < badges.length - 1; i++) {
    if (i !== 3) {
      ctx.moveTo(badges[i].x, badges[i].y);
      ctx.lineTo(badges[i + 1].x, badges[i + 1].y);
    }
  }
  ctx.stroke();
  ctx.restore();

  badges.forEach((b) => {
    ctx.save();
    // 1. Outer cyan glow ring
    ctx.strokeStyle = "rgba(56, 189, 248, 0.70)";
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 48, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Outer dashed orbital ring
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "rgba(125, 211, 252, 0.40)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 56, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Inner warm golden halo ring
    ctx.strokeStyle = "rgba(251, 191, 36, 0.60)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 40, 0, Math.PI * 2);
    ctx.stroke();

    // 4. Center icon drawing (Crisp, high-contrast broadcast illumination)
    ctx.strokeStyle = "rgba(240, 249, 255, 0.90)";
    ctx.fillStyle = "rgba(240, 249, 255, 0.80)";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (b.icon === "book_atom") {
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, 22, 9, Math.PI / 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, 22, 9, -Math.PI / 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (b.icon === "cap") {
      ctx.beginPath();
      ctx.moveTo(b.x, b.y - 14);
      ctx.lineTo(b.x + 20, b.y - 4);
      ctx.lineTo(b.x, b.y + 7);
      ctx.lineTo(b.x - 20, b.y - 4);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(b.x + 14, b.y);
      ctx.lineTo(b.x + 14, b.y + 14);
      ctx.stroke();
    } else if (b.icon === "trophy") {
      ctx.beginPath();
      ctx.arc(b.x, b.y - 5, 13, 0, Math.PI);
      ctx.lineTo(b.x + 13, b.y - 15);
      ctx.lineTo(b.x - 13, b.y - 15);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(b.x, b.y + 8);
      ctx.lineTo(b.x, b.y + 16);
      ctx.stroke();
    } else if (b.icon === "brain") {
      ctx.beginPath();
      ctx.arc(b.x - 7, b.y - 4, 10, 0.4 * Math.PI, 1.8 * Math.PI);
      ctx.arc(b.x + 7, b.y - 4, 10, 1.2 * Math.PI, 0.6 * Math.PI);
      ctx.stroke();
    } else if (b.icon === "cert") {
      ctx.strokeRect(b.x - 15, b.y - 15, 30, 20);
      ctx.beginPath();
      ctx.arc(b.x, b.y + 6, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (b.icon === "gears") {
      ctx.beginPath();
      ctx.arc(b.x - 6, b.y - 5, 8, 0, Math.PI * 2);
      ctx.arc(b.x + 8, b.y + 6, 7, 0, Math.PI * 2);
      ctx.stroke();
    } else if (b.icon === "chart") {
      ctx.fillRect(b.x - 13, b.y + 2, 6, 13);
      ctx.fillRect(b.x - 4, b.y - 5, 6, 20);
      ctx.fillRect(b.x + 5, b.y - 13, 6, 28);
    } else {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
      ctx.arc(b.x - 15, b.y - 8, 4, 0, Math.PI * 2);
      ctx.arc(b.x + 15, b.y - 8, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });

  // Central Sapphire Sunset Cosmic Atmosphere & Constellation Filaments behind 3D Mountain
  const mx = w / 2;
  const my = h * 0.46;

  ctx.save();
  // Atmospheric sunset horizon glow centered behind the mountain summit
  const sunGrad = ctx.createRadialGradient(mx, my + 60, 10, mx, my + 60, 680);
  sunGrad.addColorStop(0, "rgba(56, 189, 248, 0.22)");
  sunGrad.addColorStop(0.35, "rgba(14, 165, 233, 0.14)");
  sunGrad.addColorStop(0.70, "rgba(7, 28, 76, 0.08)");
  sunGrad.addColorStop(1, "rgba(2, 7, 20, 0)");
  ctx.fillStyle = sunGrad;
  ctx.fillRect(mx - 800, my - 200, 1600, 700);

  // Subtle central star constellation filaments connecting the wing badges
  ctx.strokeStyle = "rgba(56, 189, 248, 0.16)";
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(1440, 520);
  ctx.lineTo(mx - 240, my + 40);
  ctx.lineTo(mx, my - 20);
  ctx.lineTo(mx + 240, my + 40);
  ctx.lineTo(2650, 520);
  ctx.stroke();

  // Subtle constellation star nodes near center
  [
    [mx - 240, my + 40],
    [mx, my - 20],
    [mx + 240, my + 40],
  ].forEach(([px, py]) => {
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px, py, 6.0, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
    ctx.lineWidth = 1.0;
    ctx.stroke();
  });
  ctx.restore();

  return canvas;
}

/**
 * 3D Humanoid Figures of MCs on the Grandstand Staircase (Image 3):
 * - MC Khánh Vy (Viewer's Left on stairs: light blue tweed blazer, white accordion pleated skirt, glasses, smiling & waving)
 * - MC Ngọc Huy (Viewer's Right on stairs: crisp white polo shirt, dark trousers, joyful broadcast pose)
 */
function GrandstandMCFigures() {
  const whiteClothMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.5 }),
    []
  );
  const vyBlazerMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#38bdf8", roughness: 0.6, metalness: 0.1 }),
    []
  );
  const darkTrousersMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#0f172a", roughness: 0.8 }),
    []
  );
  const skinMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#fed7aa", roughness: 0.6 }),
    []
  );
  const hairDarkMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#1c1917", roughness: 0.9 }),
    []
  );
  const glassesGoldMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#fbbf24", metalness: 0.9, roughness: 0.2 }),
    []
  );

  return (
    <group position={[0, 0, 0]}>
      {/* MC KHÁNH VY (Viewer's Left: X = +0.34m when camera looks down +Z) */}
      <group position={[0.34, 0.96, 1.80]} rotation={[0, Math.PI, 0]}>
        <mesh position={[0, 0.28, 0]}>
          <cylinderGeometry args={[0.13, 0.21, 0.36, 16]} />
          <primitive object={whiteClothMat} attach="material" />
        </mesh>
        <mesh position={[-0.05, 0.05, 0]}>
          <cylinderGeometry args={[0.032, 0.03, 0.12, 10]} />
          <primitive object={skinMat} attach="material" />
        </mesh>
        <mesh position={[0.05, 0.05, 0]}>
          <cylinderGeometry args={[0.032, 0.03, 0.12, 10]} />
          <primitive object={skinMat} attach="material" />
        </mesh>
        <mesh position={[-0.05, 0.01, 0.02]}>
          <boxGeometry args={[0.05, 0.03, 0.09]} />
          <primitive object={whiteClothMat} attach="material" />
        </mesh>
        <mesh position={[0.05, 0.01, 0.02]}>
          <boxGeometry args={[0.05, 0.03, 0.09]} />
          <primitive object={whiteClothMat} attach="material" />
        </mesh>

        <mesh position={[0, 0.58, 0]}>
          <cylinderGeometry args={[0.12, 0.13, 0.28, 14]} />
          <primitive object={vyBlazerMat} attach="material" />
        </mesh>
        <mesh position={[0, 0.70, 0]}>
          <boxGeometry args={[0.31, 0.09, 0.15]} />
          <primitive object={vyBlazerMat} attach="material" />
        </mesh>
        <mesh position={[0, 0.64, 0.06]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.08, 0.12, 0.02]} />
          <primitive object={whiteClothMat} attach="material" />
        </mesh>

        <mesh position={[-0.17, 0.54, 0.02]} rotation={[0.15, 0, -0.15]}>
          <cylinderGeometry args={[0.034, 0.03, 0.26, 10]} />
          <primitive object={vyBlazerMat} attach="material" />
        </mesh>
        <mesh position={[-0.20, 0.40, 0.05]}>
          <sphereGeometry args={[0.028, 10, 10]} />
          <primitive object={skinMat} attach="material" />
        </mesh>

        <mesh position={[0.18, 0.68, 0.06]} rotation={[-0.35, 0, 0.75]}>
          <cylinderGeometry args={[0.034, 0.03, 0.25, 10]} />
          <primitive object={vyBlazerMat} attach="material" />
        </mesh>
        <mesh position={[0.30, 0.84, 0.08]}>
          <sphereGeometry args={[0.032, 10, 10]} />
          <primitive object={skinMat} attach="material" />
        </mesh>

        <mesh position={[0, 0.76, 0]}>
          <cylinderGeometry args={[0.032, 0.036, 0.07, 10]} />
          <primitive object={skinMat} attach="material" />
        </mesh>
        <mesh position={[0, 0.85, 0]}>
          <sphereGeometry args={[0.072, 16, 16]} />
          <primitive object={skinMat} attach="material" />
        </mesh>
        <mesh position={[0, 0.88, -0.02]}>
          <sphereGeometry args={[0.078, 16, 16]} />
          <primitive object={hairDarkMat} attach="material" />
        </mesh>
        <mesh position={[-0.06, 0.82, -0.01]}>
          <cylinderGeometry args={[0.03, 0.02, 0.18, 8]} />
          <primitive object={hairDarkMat} attach="material" />
        </mesh>
        <mesh position={[0.06, 0.82, -0.01]}>
          <cylinderGeometry args={[0.03, 0.02, 0.18, 8]} />
          <primitive object={hairDarkMat} attach="material" />
        </mesh>
        <mesh position={[-0.025, 0.85, 0.065]}>
          <torusGeometry args={[0.014, 0.002, 8, 16]} />
          <primitive object={glassesGoldMat} attach="material" />
        </mesh>
        <mesh position={[0.025, 0.85, 0.065]}>
          <torusGeometry args={[0.014, 0.002, 8, 16]} />
          <primitive object={glassesGoldMat} attach="material" />
        </mesh>
      </group>

      {/* MC NGỌC HUY (Viewer's Right: X = -0.34m when camera looks down +Z) */}
      <group position={[-0.34, 0.96, 1.80]} rotation={[0, Math.PI, 0]}>
        <mesh position={[-0.06, 0.22, 0]}>
          <cylinderGeometry args={[0.045, 0.04, 0.44, 12]} />
          <primitive object={darkTrousersMat} attach="material" />
        </mesh>
        <mesh position={[0.06, 0.22, 0]}>
          <cylinderGeometry args={[0.045, 0.04, 0.44, 12]} />
          <primitive object={darkTrousersMat} attach="material" />
        </mesh>
        <mesh position={[-0.06, 0.01, 0.02]}>
          <boxGeometry args={[0.06, 0.03, 0.11]} />
          <primitive object={darkTrousersMat} attach="material" />
        </mesh>
        <mesh position={[0.06, 0.01, 0.02]}>
          <boxGeometry args={[0.06, 0.03, 0.11]} />
          <primitive object={darkTrousersMat} attach="material" />
        </mesh>

        <mesh position={[0, 0.58, 0]}>
          <cylinderGeometry args={[0.13, 0.12, 0.32, 14]} />
          <primitive object={whiteClothMat} attach="material" />
        </mesh>
        <mesh position={[0, 0.72, 0]}>
          <boxGeometry args={[0.34, 0.11, 0.16]} />
          <primitive object={whiteClothMat} attach="material" />
        </mesh>
        <mesh position={[0, 0.77, 0.04]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.13, 0.03, 0.05]} />
          <primitive object={whiteClothMat} attach="material" />
        </mesh>

        <mesh position={[-0.19, 0.65, 0.08]} rotation={[-0.4, 0, -0.6]}>
          <cylinderGeometry args={[0.038, 0.032, 0.26, 10]} />
          <primitive object={whiteClothMat} attach="material" />
        </mesh>
        <mesh position={[-0.30, 0.75, 0.14]}>
          <sphereGeometry args={[0.032, 10, 10]} />
          <primitive object={skinMat} attach="material" />
        </mesh>

        <mesh position={[0.19, 0.65, 0.08]} rotation={[-0.4, 0, 0.6]}>
          <cylinderGeometry args={[0.038, 0.032, 0.26, 10]} />
          <primitive object={whiteClothMat} attach="material" />
        </mesh>
        <mesh position={[0.30, 0.75, 0.14]}>
          <sphereGeometry args={[0.032, 10, 10]} />
          <primitive object={skinMat} attach="material" />
        </mesh>

        <mesh position={[0, 0.79, 0]}>
          <cylinderGeometry args={[0.038, 0.042, 0.07, 10]} />
          <primitive object={skinMat} attach="material" />
        </mesh>
        <mesh position={[0, 0.88, 0]}>
          <sphereGeometry args={[0.078, 16, 16]} />
          <primitive object={skinMat} attach="material" />
        </mesh>
        <mesh position={[0, 0.92, -0.02]}>
          <sphereGeometry args={[0.082, 16, 16]} />
          <primitive object={hairDarkMat} attach="material" />
        </mesh>
        <mesh position={[0, 0.94, 0.02]}>
          <boxGeometry args={[0.11, 0.04, 0.06]} />
          <primitive object={hairDarkMat} attach="material" />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Generates an authentic architectural circular crescent arc shape (Cung tròn) with zero inflection points.
 * Traced using pure circular trigonometry:
 * - isLeft = true: curves outward to the left (X > 0)
 * - isLeft = false: curves outward to the right (X < 0)
 */
function createCircularArcShape(
  xc: number,
  yc: number,
  rIn: number,
  rOut: number,
  thetaBaseDeg: number,
  thetaTopDeg: number,
  baseY: number,
  isLeft: boolean
): THREE.Shape {
  const shape = new THREE.Shape();
  const stepCount = 32;
  const tMin = (thetaBaseDeg * Math.PI) / 180;
  const tMax = (thetaTopDeg * Math.PI) / 180;

  const getX = (r: number, theta: number) => {
    return isLeft ? xc + r * Math.cos(theta) : -xc - r * Math.cos(theta);
  };
  const getY = (r: number, theta: number) => {
    return yc + r * Math.sin(theta);
  };

  // Outer arc points (from base to top)
  const outerPts: Array<[number, number]> = [];
  for (let i = 0; i <= stepCount; i++) {
    const t = tMin + (i / stepCount) * (tMax - tMin);
    const px = getX(rOut, t);
    const py = getY(rOut, t);
    outerPts.push([px, Math.max(baseY, py)]);
  }

  // Inner arc points (from top to base)
  const innerPts: Array<[number, number]> = [];
  for (let i = stepCount; i >= 0; i--) {
    const t = tMin + (i / stepCount) * (tMax - tMin);
    const px = getX(rIn, t);
    const py = getY(rIn, t);
    innerPts.push([px, Math.max(baseY, py)]);
  }

  if (isLeft) {
    shape.moveTo(innerPts[innerPts.length - 1][0], baseY);
    shape.lineTo(outerPts[0][0], baseY);
    for (let i = 1; i < outerPts.length; i++) {
      shape.lineTo(outerPts[i][0], outerPts[i][1]);
    }
    // Top beveled connection from outer to inner
    shape.lineTo(innerPts[0][0], innerPts[0][1]);
    for (let i = 1; i < innerPts.length; i++) {
      shape.lineTo(innerPts[i][0], innerPts[i][1]);
    }
    shape.closePath();
  } else {
    // Symmetrical CCW winding for Right side (X < 0)
    shape.moveTo(outerPts[0][0], baseY);
    shape.lineTo(innerPts[innerPts.length - 1][0], baseY);
    for (let i = innerPts.length - 1; i >= 0; i--) {
      shape.lineTo(innerPts[i][0], innerPts[i][1]);
    }
    shape.lineTo(outerPts[outerPts.length - 1][0], outerPts[outerPts.length - 1][1]);
    for (let i = outerPts.length - 2; i >= 0; i--) {
      shape.lineTo(outerPts[i][0], outerPts[i][1]);
    }
    shape.closePath();
  }

  return shape;
}

function createCircularArcCurve(
  xc: number,
  yc: number,
  radius: number,
  thetaBaseDeg: number,
  thetaTopDeg: number,
  z: number,
  isLeft: boolean
): THREE.CatmullRomCurve3 {
  const pts: THREE.Vector3[] = [];
  const count = 20;
  const tMin = (thetaBaseDeg * Math.PI) / 180;
  const tMax = (thetaTopDeg * Math.PI) / 180;
  for (let i = 0; i <= count; i++) {
    const t = tMin + (i / count) * (tMax - tMin);
    const px = isLeft ? xc + radius * Math.cos(t) : -xc - radius * Math.cos(t);
    const py = yc + radius * Math.sin(t);
    pts.push(new THREE.Vector3(px, py, z));
  }
  return new THREE.CatmullRomCurve3(pts);
}

/**
 * Procedural Cylindrical Cyclorama Geometry Builder (R1)
 * Radius = 22.5m, Height = 8.5m, Span = 84 degrees (1.466 rad)
 * Concave cylinder wrapping inward toward the audience.
 */
function createCylindricalCycloramaGeometry(
  radius: number = 22.5,
  height: number = 8.5,
  spanRad: number = 1.46607657,
  radialSegments: number = 96,
  heightSegments: number = 16
): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const halfH = height / 2;
  const halfSpan = spanRad / 2;

  for (let yIdx = 0; yIdx <= heightSegments; yIdx++) {
    const v = yIdx / heightSegments;
    const y = -halfH + v * height;

    for (let rIdx = 0; rIdx <= radialSegments; rIdx++) {
      const u = rIdx / radialSegments;
      const phi = halfSpan - u * spanRad;
      const x = radius * Math.sin(phi);
      const z = radius * Math.cos(phi);

      vertices.push(x, y, z);
      uvs.push(u, v);
    }
  }

  const stride = radialSegments + 1;
  for (let yIdx = 0; yIdx < heightSegments; yIdx++) {
    for (let rIdx = 0; rIdx < radialSegments; rIdx++) {
      const a = yIdx * stride + rIdx;
      const b = (yIdx + 1) * stride + rIdx;
      const c = (yIdx + 1) * stride + (rIdx + 1);
      const d = yIdx * stride + (rIdx + 1);

      // Facing inward toward (0, 0, 0)
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  geom.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Circular Arc Curve for Cyclorama Top & Base Neon Trims
 */
class CylindricalTrimCurve extends THREE.Curve<THREE.Vector3> {
  radius: number;
  spanRad: number;

  constructor(radius = 22.5, spanRad = 1.46607657) {
    super();
    this.radius = radius;
    this.spanRad = spanRad;
  }

  getPoint(t: number, optionalTarget = new THREE.Vector3()) {
    const halfSpan = this.spanRad / 2;
    const phi = halfSpan - t * this.spanRad;
    const x = this.radius * Math.sin(phi);
    const z = this.radius * Math.cos(phi);
    return optionalTarget.set(x, 0, z);
  }
}

/**
 * Procedural Low-Poly Rugged Mountain Geometry (R3)
 * Multi-peaked crystalline massif with chiaroscuro facet coloring.
 */
function createMountainTerrainGeometry(): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();

  const P_APEX = [0.00, 2.42, 0.00];
  const P_S1 = [-0.18, 2.12, 0.04];
  const P_S2 = [0.18, 2.10, 0.04];
  const P_SB = [0.00, 2.18, -0.08];

  const L1 = [-0.65, 1.88, 0.06];
  const L2 = [-1.25, 1.45, 0.08];
  const L3 = [-1.85, 0.88, 0.05];
  const L_OUT = [-2.40, 0.00, 0.00];
  const CL1 = [-0.40, 1.40, 0.12];
  const CL2 = [-0.95, 1.05, 0.14];
  const CL3 = [-1.50, 0.50, 0.10];
  const BL1 = [-1.95, 0.00, 0.05];
  const BL2 = [-1.35, 0.00, 0.10];
  const BL3 = [-0.75, 0.00, 0.15];

  const R1 = [0.62, 1.84, 0.06];
  const R2 = [1.20, 1.40, 0.08];
  const R3 = [1.80, 0.85, 0.05];
  const R_OUT = [2.40, 0.00, 0.00];
  const CR1 = [0.38, 1.35, 0.12];
  const CR2 = [0.90, 1.00, 0.14];
  const CR3 = [1.45, 0.45, 0.10];
  const BR1 = [1.95, 0.00, 0.05];
  const BR2 = [1.35, 0.00, 0.10];
  const BR3 = [0.75, 0.00, 0.15];

  const KL0 = [-0.15, 1.95, 0.04];
  const KL1 = [-0.25, 1.40, 0.10];
  const KL2 = [-0.35, 0.85, 0.15];
  const KL3 = [-0.45, 0.35, 0.18];
  const KL4 = [-0.55, 0.00, 0.20];

  const KR0 = [0.15, 1.95, 0.04];
  const KR1 = [0.22, 1.35, 0.10];
  const KR2 = [0.30, 0.80, 0.15];
  const KR3 = [0.40, 0.30, 0.18];
  const KR4 = [0.50, 0.00, 0.20];

  const triangles = [
    // Summit Pyramid
    [P_APEX, P_S1, KL0],
    [P_APEX, KL0, KR0],
    [P_APEX, KR0, P_S2],
    [P_APEX, P_S2, P_SB],
    [P_APEX, P_SB, P_S1],

    // Left Massif Crest & Slopes
    [P_S1, L1, KL0],
    [L1, CL1, KL0],
    [KL0, CL1, KL1],
    [L1, L2, CL1],
    [L2, CL2, CL1],
    [CL1, CL2, KL1],
    [KL1, CL2, KL2],

    // Left Massif Lower Slopes & Base
    [L2, L3, CL2],
    [L3, CL3, CL2],
    [CL2, CL3, KL2],
    [KL2, CL3, KL3],
    [L3, L_OUT, BL1],
    [L3, BL1, CL3],
    [CL3, BL1, BL2],
    [CL3, BL2, KL3],
    [KL3, BL2, BL3],
    [KL3, BL3, KL4],

    // Right Massif Crest & Slopes
    [P_S2, KR0, R1],
    [R1, KR0, CR1],
    [KR0, KR1, CR1],
    [R1, CR1, R2],
    [R2, CR1, CR2],
    [CR1, KR1, CR2],
    [KR1, KR2, CR2],

    // Right Massif Lower Slopes & Base
    [R2, CR2, R3],
    [R3, CR2, CR3],
    [CR2, KR2, CR3],
    [KR2, KR3, CR3],
    [R3, BR1, R_OUT],
    [R3, CR3, BR1],
    [CR3, BR2, BR1],
    [CR3, KR3, BR2],
    [KR3, BR3, BR2],
    [KR3, KR4, BR3],
  ];

  const positions: number[] = [];
  const colors: number[] = [];

  const cHighCyan = new THREE.Color("#7dd3fc");
  const cMidCyan = new THREE.Color("#38bdf8");
  const cSapphire = new THREE.Color("#0284c7");
  const cDarkSapphire = new THREE.Color("#0369a1");
  const cNavy = new THREE.Color("#041538");
  const cDeepNavy = new THREE.Color("#06214d");

  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const cb = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const normal = new THREE.Vector3();

  for (const [pA, pB, pC] of triangles) {
    vA.set(pA[0], pA[1], pA[2]);
    vB.set(pB[0], pB[1], pB[2]);
    vC.set(pC[0], pC[1], pC[2]);

    cb.subVectors(vC, vB);
    ab.subVectors(vA, vB);
    cb.cross(ab);
    normal.copy(cb).normalize();

    let facetColor = cSapphire;
    if (normal.y > 0.40) {
      facetColor = normal.y > 0.65 ? cHighCyan : cMidCyan;
    } else if (normal.x < -0.15 && normal.z > 0.2) {
      facetColor = cMidCyan;
    } else if (normal.z > 0.35) {
      facetColor = cSapphire;
    } else if (normal.x > 0.2) {
      facetColor = cDarkSapphire;
    } else {
      facetColor = vA.y < 0.6 ? cDeepNavy : cNavy;
    }

    positions.push(...pA, ...pB, ...pC);
    colors.push(facetColor.r, facetColor.g, facetColor.b);
    colors.push(facetColor.r, facetColor.g, facetColor.b);
    colors.push(facetColor.r, facetColor.g, facetColor.b);
  }

  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geom.computeVertexNormals();

  return geom;
}

/**
 * Luminous Canyon Pass Geometry Builder (R2)
 * Smooth organic S-curve narrowing towards summit pinnacle base.
 */
function createCanyonPassGeometry(): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  const steps = 32;
  const trans = 6;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let s = 0; s <= steps; s++) {
    const v = s / steps;
    const y = v * 2.05;

    let cx = 0;
    let cz = 0.02;
    let w = 0.16;

    if (v < 0.25) {
      const t = v / 0.25;
      cx = 0.10 * (1 - t) + -0.05 * t;
      cz = 0.16 * (1 - t) + 0.12 * t;
      w = 0.65 * (1 - t) + 0.52 * t;
    } else if (v < 0.55) {
      const t = (v - 0.25) / 0.30;
      cx = -0.05 * (1 - t) + 0.06 * t;
      cz = 0.12 * (1 - t) + 0.08 * t;
      w = 0.52 * (1 - t) + 0.40 * t;
    } else if (v < 0.80) {
      const t = (v - 0.55) / 0.25;
      cx = 0.06 * (1 - t) + -0.02 * t;
      cz = 0.08 * (1 - t) + 0.05 * t;
      w = 0.40 * (1 - t) + 0.26 * t;
    } else {
      const t = (v - 0.80) / 0.20;
      cx = -0.02 * (1 - t) + 0.00 * t;
      cz = 0.05 * (1 - t) + 0.02 * t;
      w = 0.26 * (1 - t) + 0.16 * t;
    }

    const halfW = w / 2;
    for (let j = 0; j <= trans; j++) {
      const u = j / trans;
      const x = cx - halfW + u * w;
      const trough = 0.025 * Math.sin(u * Math.PI);
      const z = cz - trough;

      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  const stride = trans + 1;
  for (let s = 0; s < steps; s++) {
    for (let j = 0; j < trans; j++) {
      const a = s * stride + j;
      const b = (s + 1) * stride + j;
      const c = (s + 1) * stride + (j + 1);
      const d = s * stride + (j + 1);

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  return geom;
}

/**
 * Victory Pennant Flag ("Lá cờ chìm") Geometry (R4)
 * Translucent cyan/white swallowtail pennant waving right.
 */
function createPennantFlagGeometry(): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    // Quad 1: (0, 1, 5), (1, 2, 5)
    0.007, 2.99, 0.0,
    0.44, 2.95, 0.02,
    0.18, 2.88, 0.01,

    0.44, 2.95, 0.02,
    0.34, 2.875, 0.015,
    0.18, 2.88, 0.01,

    // Quad 2: (5, 2, 3), (5, 3, 4)
    0.18, 2.88, 0.01,
    0.34, 2.875, 0.015,
    0.44, 2.80, 0.02,

    0.18, 2.88, 0.01,
    0.44, 2.80, 0.02,
    0.007, 2.76, 0.0,

    // Tri 3: pole connection
    0.007, 2.99, 0.0,
    0.18, 2.88, 0.01,
    0.007, 2.76, 0.0,
  ]);
  geom.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geom.computeVertexNormals();
  return geom;
}

/**
 * Radial Bloom Particle Texture for Constellation Vertex Nodes
 */
function createRadialBloomParticleTexture(): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
    grad.addColorStop(0.25, "rgba(186, 230, 253, 0.90)");
    grad.addColorStop(0.60, "rgba(56, 189, 248, 0.40)");
    grad.addColorStop(1, "rgba(56, 189, 248, 0.0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Dedicated 3D Mountain Landscape Component (R2, R3, R4)
 * Positioned on top plinth at Z = 4.60m, Y = 1.96m.
 */
export function StudioMountainLandscape({
  position = [0, 1.96, 4.60],
}: {
  position?: [number, number, number];
}) {
  const mountainGeom = useMemo(() => createMountainTerrainGeometry(), []);
  const edgesGeom = useMemo(() => new THREE.EdgesGeometry(mountainGeom, 15), [mountainGeom]);
  const canyonGeom = useMemo(() => createCanyonPassGeometry(), []);
  const flagGeom = useMemo(() => createPennantFlagGeometry(), []);

  const bloomTex = useMemo(() => {
    if (typeof document === "undefined") return null;
    return createRadialBloomParticleTexture();
  }, []);

  const mountainMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.40,
        metalness: 0.25,
        flatShading: true,
        side: THREE.FrontSide,
      }),
    []
  );

  const wireframeMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: "#7dd3fc",
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
      }),
    []
  );

  const canyonShaderMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uColorCore: { value: new THREE.Color("#e0f2fe") },
          uColorGlow: { value: new THREE.Color("#0284c7") },
          uColorEdge: { value: new THREE.Color("#034078") },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uColorCore;
          uniform vec3 uColorGlow;
          uniform vec3 uColorEdge;
          varying vec2 vUv;
          void main() {
            float lateral = 1.0 - abs(vUv.x - 0.5) * 2.0;
            float core = pow(lateral, 2.2);
            float glow = pow(lateral, 1.4);
            vec3 col = mix(uColorEdge, uColorGlow, glow);
            col = mix(col, uColorCore, core);
            float alpha = smoothstep(0.0, 0.28, lateral) * 0.90;
            gl_FragColor = vec4(col * 1.05, alpha);
          }
        `,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  const lanternCollarMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#334155", metalness: 0.85, roughness: 0.25 }),
    []
  );
  const lanternGlassMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#e0f2fe", transparent: true, opacity: 0.85, roughness: 0.10 }),
    []
  );
  const poleMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#f8fafc", metalness: 0.90, roughness: 0.18 }),
    []
  );
  const brassMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#fbbf24", metalness: 0.85, roughness: 0.22 }),
    []
  );
  const flagMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#e0f2fe",
        transparent: true,
        opacity: 0.52,
        side: THREE.DoubleSide,
        roughness: 0.35,
        metalness: 0.10,
      }),
    []
  );

  const mountainNodePositions = useMemo(
    () =>
      new Float32Array([
        0.00, 2.42, 0.01,
        -0.18, 2.12, 0.05,
        0.18, 2.10, 0.05,
        -0.65, 1.88, 0.07,
        -1.25, 1.45, 0.09,
        -1.85, 0.88, 0.06,
        -0.40, 1.40, 0.13,
        -0.95, 1.05, 0.15,
        -1.50, 0.50, 0.11,
        0.62, 1.84, 0.07,
        1.20, 1.40, 0.09,
        1.80, 0.85, 0.06,
        0.38, 1.35, 0.13,
        0.90, 1.00, 0.15,
        1.45, 0.45, 0.11,
        -0.25, 1.40, 0.11,
        0.22, 1.35, 0.11,
      ]),
    []
  );

  const nodeGeometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(mountainNodePositions, 3));
    return geom;
  }, [mountainNodePositions]);

  return (
    <group position={position}>
      {/* 1. Rugged Low-Poly Mountain Facets (R3) */}
      <mesh geometry={mountainGeom} material={mountainMat} />

      {/* 2. Cyber-crystalline Glowing Wireframe Lines (R3) */}
      <lineSegments geometry={edgesGeom} material={wireframeMat} />

      {/* 3. Luminous Feathered Canyon Pass (R2) */}
      <mesh geometry={canyonGeom} material={canyonShaderMat} />
      <pointLight position={[0.0, 1.10, 0.25]} intensity={6} color="#0284c7" distance={3.5} decay={2} />

      {/* 4. Summit Lighthouse Beacon Tower (R4) */}
      <mesh position={[0, 2.43, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.02, 16]} />
        <primitive object={lanternCollarMat} attach="material" />
      </mesh>
      <mesh position={[0, 2.465, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.05, 16]} />
        <primitive object={lanternGlassMat} attach="material" />
      </mesh>
      <mesh position={[0, 2.505, 0]}>
        <coneGeometry args={[0.065, 0.03, 16]} />
        <primitive object={lanternCollarMat} attach="material" />
      </mesh>
      {/* Radiant Core Beacon */}
      <mesh position={[0, 2.465, 0.01]}>
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Multi-Tier Gaussian Bloom Halo (R4) - Softer chiaroscuro to prevent glare */}
      <mesh position={[0, 2.465, 0.02]}>
        <circleGeometry args={[0.09, 32]} />
        <meshBasicMaterial color="#bae6fd" transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh position={[0, 2.465, 0.02]}>
        <circleGeometry args={[0.22, 32]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.20} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh position={[0, 2.465, 0.02]}>
        <circleGeometry args={[0.42, 32]} />
        <meshBasicMaterial color="#0284c7" transparent opacity={0.10} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* Summit Real-Time Point Light */}
      <pointLight position={[0, 2.50, 0.20]} intensity={9} color="#bae6fd" distance={6} decay={2} />

      {/* 5. Slender Silver Flagpole with Brass Finial Ball (R4) */}
      <mesh position={[0, 2.75, 0]}>
        <cylinderGeometry args={[0.007, 0.007, 0.50, 12]} />
        <primitive object={poleMat} attach="material" />
      </mesh>
      <mesh position={[0, 3.01, 0]}>
        <sphereGeometry args={[0.02, 16, 16]} />
        <primitive object={brassMat} attach="material" />
      </mesh>

      {/* 6. Translucent Cyan/White Pennant Flag ("Lá cờ chìm") (R4) */}
      <mesh geometry={flagGeom} material={flagMat} />

      {/* 7. Constellation Vertex Nodes (R3) */}
      {bloomTex && (
        <points geometry={nodeGeometry}>
          <pointsMaterial
            map={bloomTex}
            transparent={true}
            depthWrite={false}
            size={0.08}
            sizeAttenuation={true}
            blending={THREE.AdditiveBlending}
          />
        </points>
      )}
    </group>
  );
}

/**
 * Audience Grandstand (Khu vực khán đài Studio S14):
 * - 7 Stepped Tiers with 84 audience members in diverse Vietnamese student uniforms (blue, white, dark polo + banners).
 * - 14-step central staircase with luminous neon edge trims running up to top landing.
 * - 3D Humanoid figures of MC Khánh Vy and MC Ngọc Huy on the grandstand stairs.
 * - Central entrance portal: TWO PAIRS of sculptural 3D crescent blades/fins STANDING BEHIND ROW 7 on the top plinth (Y >= 1.95m, Z >= 3.55m)!
 * - Official Quizorra sponsor lightbox on Viewer's Left (using official /brand/quizorra_logo.png on white acrylic face).
 * - Official Olympia 2020 logo medallion on Viewer's Right: flat disc, NO golden rim.
 * - 100% Backing Enclosure: Central 18.4m x 6.5m backdrop with AI generated scenic + seamless overlapping 42-degree angled side return masking walls enclosing the studio view from CAM 12.
 */
export function AudienceAmphitheater({
  audienceFadeProgress = 0,
  quality = "HIGH",
  liveFactor = 1.0,
}: {
  audienceFadeProgress?: number;
  quality?: "HIGH" | "MEDIUM" | "LIGHT";
  liveFactor?: number;
}) {
  const rowCount = 7;
  const seatsPerRow = 16; // 8 on Left wing, 8 on Right wing, tightly packed shoulder-to-shoulder (Image 2)
  const stepCount = 14;   // 14 steps along the central aisle

  const [aiBackdropTex, setAiBackdropTex] = React.useState<THREE.Texture | null>(null);
  const [quizorraLogoTex, setQuizorraLogoTex] = React.useState<THREE.Texture | null>(null);
  const [olympia2020Tex, setOlympia2020Tex] = React.useState<THREE.Texture | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const loader = new THREE.TextureLoader();
    loader.load("/brand/olympia_vtv3_backdrop_ai.jpg", (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      setAiBackdropTex(tex);
    });
    loader.load("/brand/quizorra_logo.png", (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      setQuizorraLogoTex(tex);
    });
    loader.load("/brand/Olympia_logo_2020.webp", (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      setOlympia2020Tex(tex);
    });
  }, []);

  const banner1Canvas = useMemo(() => {
    if (typeof document === "undefined") return null;
    return createBannerCanvas("OLYMPIA", "#dc2626", "#fef08a");
  }, []);
  const banner1Texture = useMemo(() => {
    if (!banner1Canvas) return null;
    const tex = new THREE.CanvasTexture(banner1Canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [banner1Canvas]);

  const banner2Canvas = useMemo(() => {
    if (typeof document === "undefined") return null;
    return createBannerCanvas("CHIẾN THẮNG", "#0284c7", "#ffffff");
  }, []);
  const banner2Texture = useMemo(() => {
    if (!banner2Canvas) return null;
    const tex = new THREE.CanvasTexture(banner2Canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [banner2Canvas]);

  const fallbackCanvas = useMemo(() => {
    if (typeof document === "undefined") return null;
    return createAudienceBackdropCanvas();
  }, []);

  const fallbackTexture = useMemo(() => {
    if (!fallbackCanvas) return null;
    const tex = new THREE.CanvasTexture(fallbackCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }, [fallbackCanvas]);

  const activeBackdropTex = fallbackTexture;

  const cycloramaGeometry = useMemo(() => createCylindricalCycloramaGeometry(22.5, 8.5, 1.46607657, 96, 16), []);
  const cycloramaTrimCurve = useMemo(() => new CylindricalTrimCurve(22.5, 1.46607657), []);

  // ── AUTHENTIC VTV3 STUDIO S14 4-LAYER ENTRANCE PORTAL: ( ( [ (   /\   ) ] ) ) ──
  // Standing strictly on the top plinth behind Row 7 (Y >= 1.95m, Z = 3.65m)
  // Exact hierarchy from outside to inside per user specification:
  // - Cung 1 (Ngoài cùng): Kích thước lớn thứ #3 (width 0.22m) - Warm Ivory Lightbox
  // - Cung 2 (Thứ 2 từ ngoài): Bé nhất (width 0.08m) - Recessed Dark Spacer Pylon
  // - Cung 3 (Thứ 3 từ ngoài): ĐEN LỚN NHẤT (width 0.38m) - Massive Black Lacquer Pylon
  // - Cung 4 (Trong cùng): Lớn thứ #2 nhưng CAO HƠN (width 0.28m, height 5.20m, theta_top 40.0 deg) - Warm Ivory Lightbox
  // Color: Soft warm ivory/cream TV studio broadcast luminance (NOT trắng loá)

  // Left Cluster (Viewer's Left, X > 0)
  const leftArc1OuterShape = useMemo(() => createCircularArcShape(-1.55, 3.25, 3.48, 3.70, -28.0, 19.5, 1.95, true), []);
  const leftArc2SpacerShape = useMemo(() => createCircularArcShape(-1.55, 3.25, 3.40, 3.48, -28.0, 21.0, 1.95, true), []);
  const leftArc3BlackShape = useMemo(() => createCircularArcShape(-1.55, 3.25, 3.02, 3.40, -28.0, 22.5, 1.95, true), []);
  const leftArc4InnerShape = useMemo(() => createCircularArcShape(-1.55, 3.25, 2.74, 3.02, -28.0, 40.0, 1.95, true), []);

  // Right Cluster (Viewer's Right, X < 0)
  const rightArc1OuterShape = useMemo(() => createCircularArcShape(-1.55, 3.25, 3.48, 3.70, -28.0, 19.5, 1.95, false), []);
  const rightArc2SpacerShape = useMemo(() => createCircularArcShape(-1.55, 3.25, 3.40, 3.48, -28.0, 21.0, 1.95, false), []);
  const rightArc3BlackShape = useMemo(() => createCircularArcShape(-1.55, 3.25, 3.02, 3.40, -28.0, 22.5, 1.95, false), []);
  const rightArc4InnerShape = useMemo(() => createCircularArcShape(-1.55, 3.25, 2.74, 3.02, -28.0, 40.0, 1.95, false), []);

  const arc1ExtrudeSettings = useMemo(
    () => ({
      depth: 0.07,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.010,
      bevelThickness: 0.010,
    }),
    []
  );

  const arc2ExtrudeSettings = useMemo(
    () => ({
      depth: 0.05,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.008,
      bevelThickness: 0.008,
    }),
    []
  );

  const arc3BlackExtrudeSettings = useMemo(
    () => ({
      depth: 0.12, // Sturdy structural depth for the massive black pylon
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.015,
      bevelThickness: 0.015,
    }),
    []
  );

  const arc4InnerExtrudeSettings = useMemo(
    () => ({
      depth: 0.08,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.012,
      bevelThickness: 0.012,
    }),
    []
  );

  // Pure Smooth Circular Arc Neon Edge Tubes ((  /\  ))
  const leftInnerNeonCurve = useMemo(() => createCircularArcCurve(-1.55, 3.25, 2.74, -28.0, 40.0, 3.75, true), []);
  const leftOuterNeonCurve = useMemo(() => createCircularArcCurve(-1.55, 3.25, 3.48, -28.0, 19.5, 3.75, true), []);
  const rightInnerNeonCurve = useMemo(() => createCircularArcCurve(-1.55, 3.25, 2.74, -28.0, 40.0, 3.75, false), []);
  const rightOuterNeonCurve = useMemo(() => createCircularArcCurve(-1.55, 3.25, 3.48, -28.0, 19.5, 3.75, false), []);

  // Dedicated Glossy Black Lacquer Material for Arc 3 (Sơn mài đen bóng, roughness <= 0.10)
  const portalBlackLacquerMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#030305",
        roughness: 0.06,
        metalness: 0.15,
        side: THREE.DoubleSide,
      }),
    []
  );

  // Dedicated Matte Shadow Spacer Material for Arc 2
  const portalDarkSpacerMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#060b14",
        roughness: 0.85,
        metalness: 0.10,
        side: THREE.DoubleSide,
      }),
    []
  );

  // Heavy structural steel stanchions for Quizorra and Olympia sponsor boards
  const stanchionSteelMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#475569",
        metalness: 0.92,
        roughness: 0.18,
      }),
    []
  );

  // Warm Champagne / Studio Amber lightbox diffuser (Warm studio spotlight tint, NOT trắng loá)
  const portalWarmIvoryMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#fde68a", // Warm champagne / amber studio spotlight
        emissive: "#d97706", // Warm amber studio glow
        emissiveIntensity: 0.16, // Soft, non-blinding broadcast luminance
        roughness: 0.65, // Diffused matte broadcast surface
        metalness: 0.10,
        side: THREE.DoubleSide,
      }),
    []
  );

  const portalAmberNeonMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#f59e0b", // Rich studio amber neon trim
        side: THREE.DoubleSide,
      }),
    []
  );

  const portalCyanNeonMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#38bdf8",
      }),
    []
  );

  // Diverse audience clothing materials (Vietnamese high school supporters & guests)
  const whiteShirtMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.5 }),
    []
  );
  const whiteShirtCollarMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#1e3a8a", roughness: 0.5 }),
    []
  );
  const blueUniformMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#2563eb", roughness: 0.55 }),
    []
  );
  const skyBlueUniformMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#38bdf8", roughness: 0.55 }),
    []
  );
  const darkPoloMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#0f172a", roughness: 0.7 }),
    []
  );
  const burgundyMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#881337", roughness: 0.65 }),
    []
  );
  const amberMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#b45309", roughness: 0.65 }),
    []
  );
  const greenMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#15803d", roughness: 0.65 }),
    []
  );
  const skinMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#fed7aa", roughness: 0.6 }),
    []
  );
  const skinTanMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#fbcfe8", roughness: 0.6 }),
    []
  );
  const hairDarkMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#1e1b18", roughness: 0.85 }),
    []
  );
  const hairBrownMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#2d241e", roughness: 0.85 }),
    []
  );
  const chairMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#111827", roughness: 0.35, metalness: 0.7 }),
    []
  );

  const aisleLightColor = useMemo(() => {
    const c = new THREE.Color("#0077b6");
    c.lerp(new THREE.Color("#991b1b"), audienceFadeProgress);
    return c;
  }, [audienceFadeProgress]);

  return (
    <group position={[0, 0, 8.5]}>
      {/* Front Audience Safety Railing with Central Aisle Gap */}
      <group position={[0, 0, -0.45]}>
        {/* Viewer's Left Barrier (X > 0) */}
        <mesh position={[2.90, 0.32, 0]}>
          <boxGeometry args={[4.20, 0.64, 0.05]} />
          <meshStandardMaterial color="#0b1329" metalness={0.90} roughness={0.20} />
        </mesh>
        <mesh position={[2.90, 0.645, 0]}>
          <boxGeometry args={[4.22, 0.02, 0.06]} />
          <meshBasicMaterial color={aisleLightColor} />
        </mesh>

        {/* Viewer's Right Barrier (X < 0) */}
        <mesh position={[-2.90, 0.32, 0]}>
          <boxGeometry args={[4.20, 0.64, 0.05]} />
          <meshStandardMaterial color="#0b1329" metalness={0.90} roughness={0.20} />
        </mesh>
        <mesh position={[-2.90, 0.645, 0]}>
          <boxGeometry args={[4.22, 0.02, 0.06]} />
          <meshBasicMaterial color={aisleLightColor} />
        </mesh>
      </group>

      {/* Central Staircase with Architectural Mid-Stairs Landing ("Bục Giữa" / Chiếu Nghỉ) */}
      {/* 1. Lower Flight: 6 Steps connecting Dais Floor to Bục Giữa (Z = 0.0 -> 1.20, Y = 0.15 -> 0.90) */}
      {Array.from({ length: 6 }).map((_, sIdx) => {
        const stepZ = (sIdx / 5) * 1.20;
        const stepY = ((sIdx + 1) / 6) * 0.90;
        const stepHeight = 0.90 / 6;

        return (
          <group key={`lower-stair-${sIdx}`} position={[0, 0, stepZ]}>
            <mesh position={[0, stepY - stepHeight / 2, 0]}>
              <boxGeometry args={[1.55, stepHeight, 0.24]} />
              <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
            </mesh>
            <mesh position={[0, stepY, -0.11]}>
              <boxGeometry args={[1.52, 0.015, 0.02]} />
              <meshBasicMaterial color={aisleLightColor} />
            </mesh>
          </group>
        );
      })}

      {/* 2. Architectural Mid-Stairs Landing ("Bục Giữa" / Chiếu Nghỉ) at Y = 0.92, Z = 1.70 */}
      <group position={[0, 0, 1.70]}>
        {/* Main Solid Landing Block */}
        <mesh position={[0, 0.46, 0]}>
          <boxGeometry args={[1.78, 0.92, 0.88]} />
          <meshStandardMaterial color="#0f172a" metalness={0.85} roughness={0.25} />
        </mesh>
        {/* Front Neon Tread */}
        <mesh position={[0, 0.92, -0.43]}>
          <boxGeometry args={[1.76, 0.018, 0.02]} />
          <meshBasicMaterial color={aisleLightColor} />
        </mesh>
        {/* Left Side Neon Accent */}
        <mesh position={[-0.88, 0.92, 0]}>
          <boxGeometry args={[0.02, 0.018, 0.86]} />
          <meshBasicMaterial color={aisleLightColor} />
        </mesh>
        {/* Right Side Neon Accent */}
        <mesh position={[0.88, 0.92, 0]}>
          <boxGeometry args={[0.02, 0.018, 0.86]} />
          <meshBasicMaterial color={aisleLightColor} />
        </mesh>
        {/* Golden Olympia Star Floor Inlay on Bục Giữa */}
        <mesh position={[0, 0.925, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.26, 32]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.8} roughness={0.2} emissive="#f59e0b" emissiveIntensity={0.3} />
        </mesh>
      </group>

      {/* 3. Upper Flight: 6 Steps connecting Bục Giữa to Top Portal Arch Plinth (Z = 2.20 -> 3.40, Y = 1.07 -> 1.84) */}
      {Array.from({ length: 6 }).map((_, sIdx) => {
        const stepZ = 2.20 + (sIdx / 5) * 1.20;
        const stepY = 0.92 + ((sIdx + 1) / 6) * 0.92;
        const stepHeight = 0.92 / 6;

        return (
          <group key={`upper-stair-${sIdx}`} position={[0, 0, stepZ]}>
            <mesh position={[0, stepY - stepHeight / 2, 0]}>
              <boxGeometry args={[1.55, stepHeight, 0.24]} />
              <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
            </mesh>
            <mesh position={[0, stepY, -0.11]}>
              <boxGeometry args={[1.52, 0.015, 0.02]} />
              <meshBasicMaterial color={aisleLightColor} />
            </mesh>
          </group>
        );
      })}

      {/* Central Staircase (14 Steps with Illuminated Neon Treads - Clear walkway for contestant entrance) */}
      {/* 7 Stepped Seating Tiers (Left Wing & Right Wing Banks, 112 Seats Total, Tightly Packed Shoulder-to-Shoulder) */}
      {Array.from({ length: rowCount }).map((_, rIdx) => {
        const rowZ = (rIdx / (rowCount - 1)) * 3.3;
        const rowY = 0.22 + (rIdx / (rowCount - 1)) * 1.62;

        return (
          <group key={rIdx} position={[0, 0, rowZ]}>
            {/* Viewer's Left Bank Riser (X > 0) */}
            <mesh position={[2.90, rowY / 2, 0]}>
              <boxGeometry args={[4.20, rowY, 0.58]} />
              <meshStandardMaterial color="#080d1a" metalness={0.88} roughness={0.3} />
            </mesh>
            <mesh position={[2.90, rowY + 0.01, -0.28]}>
              <boxGeometry args={[4.20, 0.015, 0.02]} />
              <meshBasicMaterial color={aisleLightColor} />
            </mesh>

            {/* Viewer's Right Bank Riser (X < 0) */}
            <mesh position={[-2.90, rowY / 2, 0]}>
              <boxGeometry args={[4.20, rowY, 0.58]} />
              <meshStandardMaterial color="#080d1a" metalness={0.88} roughness={0.3} />
            </mesh>
            <mesh position={[-2.90, rowY + 0.01, -0.28]}>
              <boxGeometry args={[4.20, 0.015, 0.02]} />
              <meshBasicMaterial color={aisleLightColor} />
            </mesh>

            {/* Cheering School Banner on Row 2 (Viewer's Left) */}
            {rIdx === 2 && banner1Texture && (
              <mesh position={[2.80, rowY + 0.35, -0.25]} rotation={[0, Math.PI, 0]}>
                <planeGeometry args={[2.0, 0.36]} />
                <meshBasicMaterial map={banner1Texture} side={THREE.DoubleSide} />
              </mesh>
            )}

            {/* Cheering School Banner on Row 4 (Viewer's Right) */}
            {rIdx === 4 && banner2Texture && (
              <mesh position={[-2.80, rowY + 0.35, -0.25]} rotation={[0, Math.PI, 0]}>
                <planeGeometry args={[2.0, 0.36]} />
                <meshBasicMaterial map={banner2Texture} side={THREE.DoubleSide} />
              </mesh>
            )}

            {/* Audience Members Seated in Left & Right Banks (Streamlined for silky 60 FPS performance) */}
            {quality !== "LIGHT" && Array.from({ length: seatsPerRow }).map((_, sIdx) => {
              if (quality === "MEDIUM" && sIdx % 2 !== 0) return null;
              const isLeft = sIdx < 8;
              const sOffset = isLeft
                ? 1.05 + (7 - sIdx) * 0.52
                : -1.05 - (sIdx - 8) * 0.52;
              const jitterZ = Math.sin(rIdx * 7 + sIdx * 13) * 0.015;
              const rotY = sOffset * 0.025 + (Math.sin(sIdx * 3) * 0.04);

              // Row 7 (rIdx === 6) stanchion clearance: clear chairs & figures intersecting Quizorra/Olympia stanchion columns
              if (rIdx === 6 && Math.abs(Math.abs(sOffset) - 4.10) < 0.65) {
                return null;
              }

              // Authentic Vietnamese Studio Audience distribution (Image 2):
              // 35% Crisp white student shirts with dark trim, 25% School blue, 20% Dark navy/black polos, 10% Burgundy, 10% Amber/Green
              const uniformHash = (rIdx * 7 + sIdx * 11) % 20;
              let shirtMat = whiteShirtMat;
              if (uniformHash < 7) {
                shirtMat = whiteShirtMat;
              } else if (uniformHash < 12) {
                shirtMat = blueUniformMat;
              } else if (uniformHash < 16) {
                shirtMat = darkPoloMat;
              } else if (uniformHash < 18) {
                shirtMat = burgundyMat;
              } else if (uniformHash === 18) {
                shirtMat = amberMat;
              } else {
                shirtMat = greenMat;
              }
              const audienceSkin = (rIdx * 3 + sIdx) % 5 === 0 ? skinTanMat : skinMat;
              const hairMat = ((rIdx * 2 + sIdx) % 3 === 0) ? hairBrownMat : hairDarkMat;

              return (
                <group
                  key={sIdx}
                  position={[sOffset, rowY, jitterZ]}
                  rotation={[0, Math.PI + rotY, 0]}
                >
                  {/* Streamlined Chair: Back + Seat Base */}
                  <mesh position={[0, 0.40, -0.18]}>
                    <boxGeometry args={[0.44, 0.50, 0.07]} />
                    <primitive object={chairMat} attach="material" />
                  </mesh>
                  <mesh position={[0, 0.14, 0]}>
                    <boxGeometry args={[0.44, 0.06, 0.38]} />
                    <primitive object={chairMat} attach="material" />
                  </mesh>

                  {/* Seated Spectator Torso */}
                  <mesh position={[0, 0.42, -0.02]}>
                    <boxGeometry args={[0.34, 0.36, 0.20]} />
                    <primitive object={shirtMat} attach="material" />
                  </mesh>

                  {/* Spectator Lap / Legs */}
                  <mesh position={[0, 0.18, 0.08]}>
                    <boxGeometry args={[0.28, 0.09, 0.26]} />
                    <meshStandardMaterial color="#0f172a" roughness={0.8} />
                  </mesh>

                  {/* Spectator Head & Hair */}
                  <mesh position={[0, 0.67, -0.02]}>
                    <sphereGeometry args={[0.072, 10, 10]} />
                    <primitive object={audienceSkin} attach="material" />
                  </mesh>
                  <mesh position={[0, 0.72, -0.03]}>
                    <sphereGeometry args={[0.078, 10, 10]} />
                    <primitive object={hairMat} attach="material" />
                  </mesh>
                </group>
              );
            })}
          </group>
        );
      })}

      {/* ── 5. AUTHENTIC VTV3 S14 CURVED CYLINDRICAL CYCLORAMA ENCLOSING AUDIENCE (R1) ── */}
      {/* Continuous curved cylindrical cyclorama: R = 22.50m, Span = 84°, Apex Z = 5.20m, Center Z_c = -17.30m, H = 8.50m */}
      {/* Set to FrontSide so it faces audience (+Z) and is backface culled when viewed from CAM 1 looking at stage (-Z) */}
      {quality !== "LIGHT" && (
        <>
          <mesh position={[0, 4.05, -17.30]}>
            <primitive object={cycloramaGeometry} attach="geometry" />
            <meshBasicMaterial map={activeBackdropTex} toneMapped={false} side={THREE.FrontSide} />
          </mesh>

          {/* Top Curved Neon Header Trim (Y = 8.28m) */}
          <mesh position={[0, 8.28, -17.30]}>
            <tubeGeometry args={[cycloramaTrimCurve, 96, 0.02, 8, false]} />
            <meshBasicMaterial color="#38bdf8" />
          </mesh>
          {/* Base Curved Neon Trim (Y = -0.18m) */}
          <mesh position={[0, -0.18, -17.30]}>
            <tubeGeometry args={[cycloramaTrimCurve, 96, 0.018, 8, false]} />
            <meshBasicMaterial color="#38bdf8" />
          </mesh>
        </>
      )}

      {/* ── TOP LANDING PLINTH BEHIND ROW 7: BASE FOR ARCHES, LOGO STANCHIONS & MOUNTAIN LANDSCAPE ── */}
      <mesh position={[0, 1.90, 4.28]}>
        <boxGeometry args={[13.2, 0.14, 1.80]} />
        <meshStandardMaterial color="#1e293b" metalness={0.88} roughness={0.22} />
      </mesh>
      <mesh position={[0, 1.97, 3.38]}>
        <boxGeometry args={[13.2, 0.018, 0.02]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>

      {/* ── DEDICATED 3D MOUNTAIN LANDSCAPE & CANYON PASS (R2, R3, R4) ── */}
      <StudioMountainLandscape position={[0, 1.96, 4.60]} />

      {/* ── SEPARATE 3D ARCHITECTURAL ENTRANCE PORTAL: 4 CONCENTRIC CIRCULAR ARC LAYERS FROM OUTSIDE TO INSIDE (R5) ── */}
      {/* Hierarchy: Arc 1 Outer Warm Ivory (0.22m), Arc 2 Dark Spacer (0.08m), Arc 3 Black Lacquer (0.38m, LARGEST), Arc 4 Inner Warm Ivory (0.28m, TALLEST 5.20m) */}
      <group position={[0, 0, 0]}>
        {/* Left Cluster (Viewer's Left, X > 0): ( ( [ ( */}
        {/* Cung 1 (Ngoài cùng): Kích thước lớn thứ #3 (width 0.22m) - Warm Ivory Lightbox */}
        <mesh position={[0, 0, 3.65]}>
          <extrudeGeometry args={[leftArc1OuterShape, arc1ExtrudeSettings]} />
          <primitive object={portalWarmIvoryMat} attach="material" />
        </mesh>
        <mesh>
          <tubeGeometry args={[leftOuterNeonCurve, 32, 0.014, 8, false]} />
          <primitive object={portalAmberNeonMat} attach="material" />
        </mesh>

        {/* Cung 2 (Thứ 2 từ ngoài vào): Bé nhất (width 0.08m) - Recessed Dark Spacer Pylon */}
        <mesh position={[0, 0, 3.60]}>
          <extrudeGeometry args={[leftArc2SpacerShape, arc2ExtrudeSettings]} />
          <primitive object={portalDarkSpacerMat} attach="material" />
        </mesh>

        {/* Cung 3 (Thứ 3 từ ngoài vào): ĐEN LỚN NHẤT (width 0.38m) - Massive Black Lacquer Pylon (roughness <= 0.10) */}
        <mesh position={[0, 0, 3.63]}>
          <extrudeGeometry args={[leftArc3BlackShape, arc3BlackExtrudeSettings]} />
          <primitive object={portalBlackLacquerMat} attach="material" />
        </mesh>

        {/* Cung 4 (Trong cùng): Lớn thứ #2 nhưng CAO HƠN (width 0.28m, height 5.20m, theta_top 40.0 deg) - Warm Ivory Lightbox */}
        <mesh position={[0, 0, 3.66]}>
          <extrudeGeometry args={[leftArc4InnerShape, arc4InnerExtrudeSettings]} />
          <primitive object={portalWarmIvoryMat} attach="material" />
        </mesh>
        <mesh>
          <tubeGeometry args={[leftInnerNeonCurve, 32, 0.016, 8, false]} />
          <primitive object={portalAmberNeonMat} attach="material" />
        </mesh>

        {/* Right Cluster (Viewer's Right, X < 0): ) ] ) ) */}
        {/* Cung 1 (Ngoài cùng): Kích thước lớn thứ #3 (width 0.22m) - Warm Ivory Lightbox */}
        <mesh position={[0, 0, 3.65]}>
          <extrudeGeometry args={[rightArc1OuterShape, arc1ExtrudeSettings]} />
          <primitive object={portalWarmIvoryMat} attach="material" />
        </mesh>
        <mesh>
          <tubeGeometry args={[rightOuterNeonCurve, 32, 0.014, 8, false]} />
          <primitive object={portalAmberNeonMat} attach="material" />
        </mesh>

        {/* Cung 2 (Thứ 2 từ ngoài vào): Bé nhất (width 0.08m) - Recessed Dark Spacer Pylon */}
        <mesh position={[0, 0, 3.60]}>
          <extrudeGeometry args={[rightArc2SpacerShape, arc2ExtrudeSettings]} />
          <primitive object={portalDarkSpacerMat} attach="material" />
        </mesh>

        {/* Cung 3 (Thứ 3 từ ngoài vào): ĐEN LỚN NHẤT (width 0.38m) - Massive Black Lacquer Pylon (roughness <= 0.10) */}
        <mesh position={[0, 0, 3.63]}>
          <extrudeGeometry args={[rightArc3BlackShape, arc3BlackExtrudeSettings]} />
          <primitive object={portalBlackLacquerMat} attach="material" />
        </mesh>

        {/* Cung 4 (Trong cùng): Lớn thứ #2 nhưng CAO HƠN (width 0.28m, height 5.20m, theta_top 40.0 deg) - Warm Ivory Lightbox */}
        <mesh position={[0, 0, 3.66]}>
          <extrudeGeometry args={[rightArc4InnerShape, arc4InnerExtrudeSettings]} />
          <primitive object={portalWarmIvoryMat} attach="material" />
        </mesh>
        <mesh>
          <tubeGeometry args={[rightInnerNeonCurve, 32, 0.016, 8, false]} />
          <primitive object={portalAmberNeonMat} attach="material" />
        </mesh>

        {/* Authentic Stage Lighting & Volumetric Portal Glow */}
        {quality !== "LIGHT" && (
          <>
            {/* Base Stage Warm Uplighting on Left & Right Arch Clusters */}
            <pointLight position={[1.3, 2.05, 3.65]} intensity={25 * liveFactor} color="#f59e0b" distance={5} decay={2} />
            <pointLight position={[-1.3, 2.05, 3.65]} intensity={25 * liveFactor} color="#f59e0b" distance={5} decay={2} />
            <pointLight position={[0, 2.05, 3.65]} intensity={18 * liveFactor} color="#fbbf24" distance={4} decay={2} />
            {/* Overhead Portal Wash Spotlight */}
            <pointLight position={[0, 4.8, 3.4]} intensity={18 * liveFactor} color="#fef3c7" distance={8} decay={2} />
            {/* Portal Backlight Rim Glow (Atmospheric halo behind mountain summit, softened to prevent blinding glare) */}
            <pointLight position={[0, 4.65, 5.00]} intensity={12 * liveFactor} color="#bae6fd" distance={7} decay={2} />
          </>
        )}
      </group>

      {/* ── OFFICIAL QUIZORRA SPONSOR 3D LIGHTBOX (Viewer's Left at X = +4.10m, Y = 3.45m, Z = 3.75m - FIXED POSITION) ── */}
      <group position={[4.10, 3.45, 3.75]} rotation={[0, 0, 0]}>
        {/* Sleek Royal Blue Outer Trim Shell */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[2.54, 1.04, 0.10]} />
          <meshBasicMaterial color="#0055a5" />
        </mesh>
        {/* Crisp White Illuminated Acrylic Face Plate */}
        <mesh position={[0, 0, -0.052]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[2.46, 0.96]} />
          <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
        </mesh>
        {/* Official Quizorra Logo (/brand/quizorra_logo.png) mounted seamlessly on the white face */}
        {quizorraLogoTex && (
          <mesh position={[0, 0, -0.054]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[2.20, 0.76]} />
            <meshBasicMaterial map={quizorraLogoTex} transparent={true} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        )}
        {quality !== "LIGHT" && (
          <pointLight position={[0, 0, -0.2]} intensity={14 * liveFactor} color="#ffffff" distance={4} decay={2} />
        )}

        {/* TWO SOLID GROUNDED STRUCTURAL STEEL STANCHION LEGS ANCHORED INTO PLINTH DECK AT Y = 1.97m (R6) */}
        {/* Inner Stanchion at X = 3.35m (local X = -0.75m) */}
        <mesh position={[-0.75, -0.52, 0]}>
          <boxGeometry args={[0.16, 0.04, 0.14]} />
          <primitive object={stanchionSteelMat} attach="material" />
        </mesh>
        <mesh position={[-0.75, -1.00, 0]}>
          <boxGeometry args={[0.10, 0.96, 0.10]} />
          <primitive object={stanchionSteelMat} attach="material" />
        </mesh>
        <mesh position={[-0.75, -1.4625, 0]}>
          <boxGeometry args={[0.22, 0.035, 0.22]} />
          <primitive object={stanchionSteelMat} attach="material" />
        </mesh>

        {/* Outer Stanchion at X = 4.85m (local X = +0.75m) */}
        <mesh position={[0.75, -0.52, 0]}>
          <boxGeometry args={[0.16, 0.04, 0.14]} />
          <primitive object={stanchionSteelMat} attach="material" />
        </mesh>
        <mesh position={[0.75, -1.00, 0]}>
          <boxGeometry args={[0.10, 0.96, 0.10]} />
          <primitive object={stanchionSteelMat} attach="material" />
        </mesh>
        <mesh position={[0.75, -1.4625, 0]}>
          <boxGeometry args={[0.22, 0.035, 0.22]} />
          <primitive object={stanchionSteelMat} attach="material" />
        </mesh>
      </group>

      {/* ── OLYMPIA 2020 3D MEDALLION (Viewer's Right at X = -4.10m, Y = 3.45m, Z = 3.75m - FIXED POSITION, NO GOLD RIM) ── */}
      <group position={[-4.10, 3.45, 3.75]}>
        {/* Cylindrical Medallion Body: Frameless Dark Disc per Image 3 */}
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.78, 0.78, 0.05, 48]} />
          <meshStandardMaterial color="#050d1e" metalness={0.9} roughness={0.3} />
        </mesh>
        {/* Front Face with Olympia 2020 Logo (NO gold rim per user requirement) */}
        {olympia2020Tex && (
          <mesh position={[0, 0, -0.028]} rotation={[0, Math.PI, 0]}>
            <circleGeometry args={[0.76, 48]} />
            <meshBasicMaterial map={olympia2020Tex} transparent={true} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        )}
        {quality !== "LIGHT" && (
          <pointLight position={[0, 0, -0.2]} intensity={8 * liveFactor} color="#38bdf8" distance={4} decay={2} />
        )}

        {/* TWO SOLID GROUNDED STRUCTURAL STEEL STANCHION LEGS ANCHORED INTO PLINTH DECK AT Y = 1.97m (R6) */}
        {/* Outer Stanchion at X = -4.55m (local X = -0.45m) */}
        <mesh position={[-0.45, -0.78, 0]}>
          <boxGeometry args={[0.14, 0.04, 0.12]} />
          <primitive object={stanchionSteelMat} attach="material" />
        </mesh>
        <mesh position={[-0.45, -1.13, 0]}>
          <boxGeometry args={[0.09, 0.70, 0.09]} />
          <primitive object={stanchionSteelMat} attach="material" />
        </mesh>
        <mesh position={[-0.45, -1.4625, 0]}>
          <boxGeometry args={[0.20, 0.035, 0.20]} />
          <primitive object={stanchionSteelMat} attach="material" />
        </mesh>

        {/* Inner Stanchion at X = -3.65m (local X = +0.45m) */}
        <mesh position={[0.45, -0.78, 0]}>
          <boxGeometry args={[0.14, 0.04, 0.12]} />
          <primitive object={stanchionSteelMat} attach="material" />
        </mesh>
        <mesh position={[0.45, -1.13, 0]}>
          <boxGeometry args={[0.09, 0.70, 0.09]} />
          <primitive object={stanchionSteelMat} attach="material" />
        </mesh>
        <mesh position={[0.45, -1.4625, 0]}>
          <boxGeometry args={[0.20, 0.035, 0.20]} />
          <primitive object={stanchionSteelMat} attach="material" />
        </mesh>
      </group>

      {/* Overhead & Front Stage-to-Audience Wash Spotlights (Controlled Contrast) */}
      {quality !== "LIGHT" && (
        <>
          <pointLight position={[-4.5, 5.2, 1.8]} intensity={8 * liveFactor} color="#38bdf8" distance={11} decay={2} />
          <pointLight position={[4.5, 5.2, 1.8]} intensity={8 * liveFactor} color="#38bdf8" distance={11} decay={2} />
          <pointLight position={[0.0, 5.4, 2.2]} intensity={12 * liveFactor} color="#ffffff" distance={12} decay={2} />
          <pointLight position={[0.0, 3.4, -1.2]} intensity={10 * liveFactor} color="#e0f2fe" distance={16} decay={1.5} />
          <directionalLight position={[0.0, 5.8, -1.8]} intensity={0.8 * liveFactor} color="#ffffff" />
        </>
      )}
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
  camAngle = 1,
  ptzZoom = 1.0,
  pushInProgress = 0,
  isIdle,
  idleFadeProgress,
}: StudioLightingProps) {
  const { scene } = useThree();
  if (typeof window !== "undefined") {
    (window as any).__THREE_SCENE__ = scene;
  }
  // Opening sequence light progression:
  // 0-4s: Pitch black (dimFactor = 0.04)
  // 4-12s: Hexagon portal / MC illuminated (dimFactor = 0.22)
  // 12-20s: Full studio wash lights turn on (dimFactor -> 1.0)
  const now = serverNow ? serverNow() : Date.now();
  let introDimFactor = 1.0;
  let mcSpotIntensity = 6.0;

  if (introStartedAt) {
    const elapsedSec = Math.max(0, (now - introStartedAt) / 1000);
    if (elapsedSec < 16) {
      if (elapsedSec < 2.5) {
        // 0.0s - 2.5s: Studio starts in dramatic darkness, only glowing neon tubes and LED logos illuminate
        introDimFactor = 0.05;
        mcSpotIntensity = 0.5;
      } else if (elapsedSec < 9.5) {
        // 2.5s - 9.5s: Smooth gradual illumination as MCs step in from the wings
        const washT = (elapsedSec - 2.5) / 7.0;
        const smoothWash = washT * washT * (3 - 2 * washT);
        introDimFactor = 0.05 + 0.95 * smoothWash;
        mcSpotIntensity = 0.5 + 5.5 * smoothWash;
      } else {
        introDimFactor = 1.0;
        mcSpotIntensity = 6.0;
      }
    }
  }

  // Pre-match idle lighting fade evaluation (R4):
  // When in pre-match standby (idleFadeProgress -> 1.0), all direct spotlights, key/fill lights,
  // and stage wash lights are fully extinguished. Ambient light dims to 0.04 deep midnight sapphire (#081226)
  // and screen downlight bounce to 0.6. Self-illuminated floor perimeter LED strips remain 100% luminous.
  const effectiveIdleFade = useMemo(() => {
    if (idleFadeProgress !== undefined) return idleFadeProgress;
    if (isIdle !== undefined) return isIdle ? 1.0 : 0.0;
    if (introStartedAt != null) {
      const elapsedSec = Math.max(0, (now - introStartedAt) / 1000);
      if (elapsedSec < 1.2) {
        const t = elapsedSec / 1.2;
        return 1.0 - t * t * (3 - 2 * t);
      }
      return 0.0;
    }
    if (isVeDichDimmed || screenFadeProgress > 0 || stageFadeProgress > 0 || audienceFadeProgress > 0) {
      return 0.0;
    }
    return 1.0;
  }, [idleFadeProgress, isIdle, introStartedAt, now, isVeDichDimmed, screenFadeProgress, stageFadeProgress, audienceFadeProgress]);

  // Overall multiplier for active broadcast lighting
  const liveFactor = (1.0 - effectiveIdleFade) * introDimFactor;

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

  // Ambient & Key Light Intensity Factors (Controlled Studio Contrast)
  // Standby illumination baseline: ambient floor 0.18 (#0c1938 -> #e0f2fe), smoothly ramping to 1.0 on match start
  const targetAmbient = (isVeDichDimmed ? 0.20 : 0.42) * introDimFactor;
  const ambientIntensity = THREE.MathUtils.lerp(0.18, targetAmbient, liveFactor);
  const ambientColor = useMemo(() => {
    const c = new THREE.Color("#0c1938");
    c.lerp(new THREE.Color("#e0f2fe"), liveFactor);
    return c;
  }, [liveFactor]);

  const keyIntensity = (isVeDichDimmed ? 0.9 : 3.0) * liveFactor;
  const fillIntensity = (isVeDichDimmed ? 0.45 : 1.6) * liveFactor;
  // Screen downlight bounce: 0.6 in idle, fading up to full broadcast intensity (3.2)
  const screenBounceIntensity = THREE.MathUtils.lerp(
    0.6,
    (isVeDichDimmed ? 1.0 : 3.2) * introDimFactor,
    1.0 - effectiveIdleFade
  );

  // Front Broadcast Key Flood Light intensity: 0.35 standby, 1.6 active
  const frontFloodIntensity = THREE.MathUtils.lerp(
    0.35,
    (isVeDichDimmed ? 0.6 : 1.6) * introDimFactor,
    liveFactor
  );

  // MC Podiums 3-Point Stage Lighting Rig Intensities:
  // - Key: match 8.5, standby 1.9
  // - Fill: match 4.8, standby 1.1
  // - Rim: match 3.2, standby 0.7
  const mcKeyIntensity = THREE.MathUtils.lerp(1.9, 8.5 * (isVeDichDimmed ? 0.7 : 1.0), liveFactor);
  const mcFillIntensity = THREE.MathUtils.lerp(1.1, 4.8 * (isVeDichDimmed ? 0.7 : 1.0), liveFactor);
  const mcRimIntensity = THREE.MathUtils.lerp(0.7, 3.2 * (isVeDichDimmed ? 0.7 : 1.0), liveFactor);

  // Contestant Podiums Balanced Stage Lighting Rig Intensities:
  // - Sector 1 Key: match 7.5, standby 1.7
  // - Sector 2 Key: match 7.5, standby 1.7
  // - Arc Fill Flood: match 4.5, standby 1.0
  const tsSec1Intensity = THREE.MathUtils.lerp(1.7, 7.5 * (isVeDichDimmed ? 0.6 : 1.0), liveFactor);
  const tsSec2Intensity = THREE.MathUtils.lerp(1.7, 7.5 * (isVeDichDimmed ? 0.6 : 1.0), liveFactor);
  const tsArcIntensity = THREE.MathUtils.lerp(1.0, 4.5 * (isVeDichDimmed ? 0.6 : 1.0), liveFactor);

  return (
    <group>
      {/* ── 1. AMBIENT & BROADCAST KEY LIGHTS ── */}
      <ambientLight intensity={ambientIntensity} color={ambientColor} />

      {/* Screen Zone Overhead Downlight (Emits ambient screen bounce light onto reflective stage floor) */}
      <pointLight position={[0, 5.0, -4.5]} intensity={screenBounceIntensity} color={screenWashColor} distance={12} />

      {/* Main Directional Key Spotlight (Stage Center) */}
      <directionalLight
        position={[4.5, 12.0, 7.5]}
        intensity={keyIntensity}
        color="#ffffff"
        castShadow={quality === "HIGH"}
      />

      {/* Fill Light (Stage Left) - Pruned in LIGHT mode */}
      {quality !== "LIGHT" && (
        <directionalLight
          position={[-6.0, 10.0, 6.0]}
          intensity={fillIntensity}
          color="#e0f2fe"
        />
      )}

      {/* Front Broadcast Key Flood Light (Preserved in LIGHT mode so /admin/sandbox podiums are bright) */}
      <directionalLight
        position={[0.0, 5.5, 7.5]}
        intensity={frontFloodIntensity}
        color="#ffffff"
      />

      {/* ── MC PODIUMS 3-POINT STAGE LIGHTING RIG ── */}
      {/* MC Key Light: Warm quartz front key illuminating MC faces & wardrobe */}
      <TargetedSpotLight
        position={[4.60, 5.20, -3.40]}
        targetPosition={[3.10, 1.35, -6.85]}
        color="#fffaf0"
        intensity={mcKeyIntensity}
        angle={0.52}
        penumbra={0.45}
        distance={14}
        decay={1.5}
        castShadow={false}
      />

      {/* MC Fill Light: Soft blue-white cross fill to eliminate harsh facial shadows */}
      <TargetedSpotLight
        position={[1.40, 4.80, -3.60]}
        targetPosition={[3.10, 1.35, -6.85]}
        color="#f0f7ff"
        intensity={mcFillIntensity}
        angle={0.60}
        penumbra={0.55}
        distance={13}
        decay={1.5}
        castShadow={false}
      />

      {/* MC Back/Rim Light: Daylight separation rim delineating shoulders and hair from backdrop */}
      <TargetedSpotLight
        position={[3.10, 5.60, -8.80]}
        targetPosition={[3.10, 1.45, -6.85]}
        color="#f8fafc"
        intensity={mcRimIntensity}
        angle={0.45}
        penumbra={0.50}
        distance={10}
        decay={1.8}
        castShadow={false}
      />

      {/* ── CONTESTANT PODIUMS BALANCED STAGE LIGHTING RIG ── */}
      {/* TS Sector 1 Key: Crisp keylight dedicated to TS 1 and TS 2 */}
      <TargetedSpotLight
        position={[-3.20, 5.80, 0.40]}
        targetPosition={[-5.75, 1.25, -3.65]}
        color="#fffcf5"
        intensity={tsSec1Intensity}
        angle={0.64}
        penumbra={0.50}
        distance={14}
        decay={1.5}
        castShadow={false}
      />

      {/* TS Sector 2 Key: Crisp keylight dedicated to TS 3 and TS 4 */}
      <TargetedSpotLight
        position={[-1.10, 5.80, -2.20]}
        targetPosition={[-3.50, 1.25, -6.00]}
        color="#fffcf5"
        intensity={tsSec2Intensity}
        angle={0.64}
        penumbra={0.50}
        distance={14}
        decay={1.5}
        castShadow={false}
      />

      {/* TS Arc Fill Flood: Soft sky-blue arc wash covering all 4 contestant podiums */}
      <TargetedSpotLight
        position={[-0.80, 5.20, 1.80]}
        targetPosition={[-4.60, 1.10, -4.80]}
        color="#e0f2fe"
        intensity={tsArcIntensity}
        angle={0.78}
        penumbra={0.60}
        distance={15}
        decay={1.5}
        castShadow={false}
      />

      {/* ── 2. STAGE BACK LIGHTS (Pruned in LIGHT mode) ── */}
      {quality !== "LIGHT" && (
        <>
          <TargetedSpotLight
            position={[-7.5, 8.5, -5.0]}
            targetPosition={[0, 3.0, -6.5]}
            intensity={(isVeDichDimmed ? 2.0 : 5.5) * liveFactor}
            color={stageBackColor}
            angle={0.65}
            penumbra={0.5}
            distance={20}
            castShadow={false}
          />
          <TargetedSpotLight
            position={[7.5, 8.5, -5.0]}
            targetPosition={[0, 3.0, -6.5]}
            intensity={(isVeDichDimmed ? 2.0 : 5.5) * liveFactor}
            color={stageBackColor}
            angle={0.65}
            penumbra={0.5}
            distance={20}
            castShadow={false}
          />

          {/* Broadcast Wing Cyc Wash Lights (Stage Left behind formula wall & Stage Right) */}
          <pointLight position={[-6.5, 4.0, -3.5]} color={screenWashColor} intensity={THREE.MathUtils.lerp(0.3, isVeDichDimmed ? 0.8 : 2.5, 1.0 - effectiveIdleFade)} distance={15} />
          <pointLight position={[6.5, 4.0, -3.5]} color={screenWashColor} intensity={THREE.MathUtils.lerp(0.3, isVeDichDimmed ? 0.8 : 2.5, 1.0 - effectiveIdleFade)} distance={15} />
          <pointLight position={[0, 6.0, -6.0]} color={stageBackColor} intensity={THREE.MathUtils.lerp(0.3, isVeDichDimmed ? 1.0 : 3.0, 1.0 - effectiveIdleFade)} distance={16} />

          {/* Elevated Backdrop Halo Fill Lights (Elevated at Y=4.8m to prevent grazing specular floor dots) */}
          <pointLight position={[-4.5, 4.8, -6.0]} intensity={1.2 * liveFactor} color={stageRimColor} distance={12} />
          <pointLight position={[4.5, 4.8, -6.0]} intensity={1.2 * liveFactor} color={stageRimColor} distance={12} />
          <pointLight position={[0.0, 4.8, -6.2]} intensity={1.4 * liveFactor} color={stageRimColor} distance={12} />
        </>
      )}

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
          <TargetedSpotLight
            key={`ts-spot-${sIdx}`}
            position={[pos[0], 7.5, pos[2] + 0.8]}
            targetPosition={[pos[0], 1.2, pos[2]]}
            color={spotColor}
            intensity={spotIntensity}
            angle={0.4}
            penumbra={0.3}
            distance={11}
            castShadow={false}
          />
        );
      })}

      {/* ── 4. AUDIENCE AMPHITHEATER LIGHTS (Pruned in LIGHT mode) ── */}
      {quality !== "LIGHT" && (
        <TargetedSpotLight
          position={[0, 9.0, 4.0]}
          targetPosition={[0, 2.0, 12.0]}
          intensity={(isVeDichDimmed ? 1.5 : 4.5) * liveFactor}
          color={audienceWashColor}
          angle={0.8}
          penumbra={0.6}
          distance={22}
          castShadow={false}
        />
      )}

      {/* ── 6. STUDIO ENVIRONMENT GEOMETRY ── */}
      <StudioFloor stageFadeProgress={stageFadeProgress} quality={quality} liveFactor={liveFactor} />
      <StudioWalls stageFadeProgress={stageFadeProgress} liveFactor={liveFactor} />
      <StudioCeilingRig />
      <AudienceAmphitheater audienceFadeProgress={audienceFadeProgress} quality={quality} liveFactor={liveFactor} />
      {quality !== "LIGHT" && (
        <BroadcastCameras camAngle={camAngle} ptzZoom={ptzZoom} pushInProgress={pushInProgress} />
      )}
    </group>
  );
}
