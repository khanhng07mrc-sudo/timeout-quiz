"use client";
/**
 * WheelStudio3DScene — Three.js WebGL scene cho Magic Wheel Display view.
 *
 * Renders:
 *   - Genuine 3D Conical Wheel (dốc từ tâm ra vành chuẩn CNKD)
 *   - Radial digits and labels (chữ chạy đúng chiều nan quạt từ vành vào tâm)
 *   - Chrome separator pegs on the rim
 *   - Central Chrome hub with metallic bevels
 *   - Needle at 12 o'clock pointing down the conical slope into winning sector
 *   - Cylindrical metallic pedestal with glowing LED accent ring
 *   - Multi-point studio lighting (Key, Fill, Rim, Ambient) & glossy reflective stage floor
 *   - Team podiums arranged in an arc facing the machine
 *   - Camera Cut Controller: 4 authentic TV studio angles
 */

import React, { useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { MagicWheelSector, TeamState } from "@/types";

// ── Types ────────────────────────────────────────────────────────────────────

interface WheelStudio3DSceneProps {
  sectors: MagicWheelSector[];
  clientWheelAngle: number;
  effectiveIsSpinning: boolean;
  selectedSector?: MagicWheelSector;
  teams: TeamState[];
  roundScores?: Record<string, number>;
  currentTurnTeamId?: string;
  tossUpBuzzedTeamId?: string;
  isTossUpRound?: boolean;
  phase?: string;
  camAngle: number; // 0=default, 1=wheel zoom, 2=wide, 3=board (UI focus), 4=disc closeup
  edition?: string;
  className?: string;
}

interface CamConfig {
  pos: [number, number, number];
  target: [number, number, number];
}

// ── Authentic Studio Camera Configurations ──────────────────────────────────
// Coordinate system:
// Center of wheel: [0, 1.25, 0], radius: 2.12.
// Needle is at 12 o'clock: [0, 1.76, -2.18], pointing down into the cone apex.
const CAM_POSITIONS: Record<string, CamConfig> = {
  // CAM 0 / Default: 35° overhead angle, showing entire machine & arc of podiums
  DEFAULT: { pos: [0, 3.8, 5.4], target: [0, 0.5, 0] },

  // CAM 1: Wheel zoom-in (2s) — dramatic perspective looking down at conical wheel
  CAM1_WHEEL: { pos: [0, 2.9, 3.1], target: [0, 1.25, 0] },

  // CAM 2: Wide shot (3s) — pulled back, showing full stage, machine, and all team podiums
  CAM2_WIDE: { pos: [0, 5.8, 8.2], target: [0, 0.2, 0] },

  // CAM 3: Board zoom (4s) — tilts slightly upward as UI focuses on the letter board
  CAM3_BOARD: { pos: [0, 3.2, 5.4], target: [0, 1.0, 0] },

  // CAM 4: Disc closeup (stays until spin stops) — low, tight shot at needle & passing wedges
  CAM4_DISC: { pos: [0, 2.2, -0.3], target: [0, 1.65, -1.95] },
};

// ── Texture Generators ───────────────────────────────────────────────────────

/** Generate high-resolution wheel texture mirroring TV gameshow aesthetic */
function generateWheelTexture(sectors: MagicWheelSector[], size = 1024): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const cx = size / 2,
    cy = size / 2,
    r = size / 2 - 8;
  const segCount = sectors.length || 24;
  const degPerSeg = (Math.PI * 2) / segCount;

  // Draw each wedge
  sectors.forEach((sec, idx) => {
    const a1 = idx * degPerSeg - Math.PI / 2;
    const a2 = a1 + degPerSeg;

    // Wedge background
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, a1, a2);
    ctx.closePath();
    ctx.fillStyle = sec.color || "#4338ca";
    ctx.fill();

    // Wedge bevel border
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    // ── Wedge Text & Numbers Along the Radial Axis (Đúng chiều nan quạt từ vành vào tâm) ──
    ctx.save();
    const midAngle = a1 + degPerSeg / 2;
    ctx.translate(cx, cy);
    ctx.rotate(midAngle);

    const cleanLabel = (sec.label || "").replace(/[,.]/g, "").trim();
    const isNumeric = sec.type === "POINTS" || /^\$?\d+$/.test(cleanLabel);

    if (isNumeric && cleanLabel.length > 0) {
      // Numbers: Stacked upright digits along the radial ray from rim towards center
      const digits = cleanLabel.split("");
      const startX = r - 36;
      const stepX = digits.length >= 5 ? 28 : digits.length >= 4 ? 34 : 38;
      const fontSize = Math.floor(size / (digits.length >= 5 ? 26 : 22));

      ctx.font = `900 ${fontSize}px "Impact", "Arial Black", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      digits.forEach((digit, dIdx) => {
        const curX = startX - dIdx * stepX;
        ctx.save();
        ctx.translate(curX, 0);
        ctx.rotate(-Math.PI / 2); // Rotate each digit upright facing the viewer

        // Dark stroke outline
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 6;
        ctx.strokeText(digit, 0, 0);

        // Bright fill
        ctx.fillStyle = sec.textColor || "#ffffff";
        ctx.fillText(digit, 0, 0);
        ctx.restore();
      });
    } else {
      // Special action label (e.g., MẤT LƯỢT, BANKRUPT, NHÂN ĐÔI, Ô MAY MẮN)
      // Running radially along the wedge length (chạy dọc từ vành ngoài vào trong)
      ctx.translate(r - 28, 0);
      ctx.rotate(Math.PI); // Now +X points toward the center of the wheel

      const words = cleanLabel.split(/\s+/);

      if (words.length >= 2 && cleanLabel.length > 7) {
        // Multi-word phrase: Two compact lines running along the radial ray
        const line1 = words.slice(0, Math.ceil(words.length / 2)).join(" ");
        const line2 = words.slice(Math.ceil(words.length / 2)).join(" ");
        const maxLen = Math.max(line1.length, line2.length);
        const fontSize = Math.min(26, Math.floor(size / (maxLen > 6 ? 42 : 36)));

        ctx.font = `900 ${fontSize}px "Arial Black", "Arial", sans-serif`;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";

        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 5;
        ctx.strokeText(line1, 8, -fontSize * 0.62);
        ctx.fillStyle = sec.textColor || "#ffffff";
        ctx.fillText(line1, 8, -fontSize * 0.62);

        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 5;
        ctx.strokeText(line2, 8, fontSize * 0.62);
        ctx.fillStyle = sec.textColor || "#ffffff";
        ctx.fillText(line2, 8, fontSize * 0.62);
      } else {
        // Single word or short phrase running along the centerline
        const fontSize = Math.min(32, Math.floor(size / (cleanLabel.length > 8 ? 38 : 30)));
        ctx.font = `900 ${fontSize}px "Arial Black", "Arial", sans-serif`;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";

        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 6;
        ctx.strokeText(cleanLabel, 10, 0);
        ctx.fillStyle = sec.textColor || "#ffffff";
        ctx.fillText(cleanLabel, 10, 0);
      }
    }

    ctx.restore();
  });

  // Conical 3D Shading Overlay
  const conicalShade = ctx.createRadialGradient(cx, cy, 20, cx, cy, r);
  conicalShade.addColorStop(0, "rgba(255,255,255,0.38)");
  conicalShade.addColorStop(0.35, "rgba(255,255,255,0.12)");
  conicalShade.addColorStop(0.7, "rgba(0,0,0,0.0)");
  conicalShade.addColorStop(0.92, "rgba(0,0,0,0.22)");
  conicalShade.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = conicalShade;
  ctx.fill();

  // Outer Gold Rim with inner bevel
  ctx.beginPath();
  ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
  ctx.strokeStyle = "#d97706";
  ctx.lineWidth = 14;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, r - 4, 0, Math.PI * 2);
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Silver chrome pegs on the rim separator lines
  sectors.forEach((_, idx) => {
    const angle = idx * degPerSeg - Math.PI / 2;
    const pegR = r - 8;
    const px = cx + Math.cos(angle) * pegR;
    const py = cy + Math.sin(angle) * pegR;

    ctx.beginPath();
    ctx.arc(px, py, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 4;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(px, py, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = "#64748b";
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  // Center Metallic Chrome Hub
  const hubRadius = size * 0.085;
  const hubGrad = ctx.createRadialGradient(cx - hubRadius * 0.3, cy - hubRadius * 0.3, 0, cx, cy, hubRadius);
  hubGrad.addColorStop(0, "#ffffff");
  hubGrad.addColorStop(0.3, "#e2e8f0");
  hubGrad.addColorStop(0.7, "#64748b");
  hubGrad.addColorStop(1, "#1e293b");

  ctx.beginPath();
  ctx.arc(cx, cy, hubRadius, 0, Math.PI * 2);
  ctx.fillStyle = hubGrad;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, hubRadius, 0, Math.PI * 2);
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 3;
  ctx.stroke();

  return canvas;
}

/** Generate team podium screen texture */
function generatePodiumTexture(
  name: string,
  totalScore: number,
  roundScore: number,
  color: string,
  isTurn: boolean,
  edition: string
): HTMLCanvasElement {
  const w = 256,
    h = 128;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // Screen background
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  if (isTurn) {
    bg.addColorStop(0, "#0c2a5e");
    bg.addColorStop(0.5, "#0e3a7a");
    bg.addColorStop(1, "#0a1f4a");
  } else {
    bg.addColorStop(0, "#0a0f1d");
    bg.addColorStop(0.6, "#0f172a");
    bg.addColorStop(1, "#070c18");
  }
  ctx.fillStyle = bg;
  ctx.roundRect(0, 0, w, h, 12);
  ctx.fill();

  // Glowing neon border
  ctx.strokeStyle = isTurn ? "#38bdf8" : "#1e40af";
  ctx.lineWidth = isTurn ? 4 : 2;
  ctx.roundRect(2, 2, w - 4, h - 4, 10);
  ctx.stroke();

  // Team dot
  ctx.beginPath();
  ctx.arc(22, 28, 8, 0, Math.PI * 2);
  ctx.fillStyle = color || "#6366f1";
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Team name
  ctx.fillStyle = isTurn ? "#bae6fd" : "#94a3b8";
  ctx.font = "bold 17px Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const shortName = name.length > 11 ? name.substring(0, 11) : name;
  ctx.fillText(shortName.toUpperCase(), 38, 28);

  // Active status tag
  if (isTurn) {
    ctx.fillStyle = "#38bdf8";
    ctx.font = "900 11px Arial, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("ĐANG QUAY", w - 12, 28);
  }

  // Round score pill
  if (roundScore > 0) {
    const rStr =
      edition === "ENGLISH"
        ? `+$${roundScore.toLocaleString("en-US")}`
        : `+${roundScore.toLocaleString()}đ`;
    ctx.fillStyle = "#34d399";
    ctx.font = "bold 15px Arial, monospace";
    ctx.textAlign = "right";
    ctx.fillText(rStr, w - 14, 76);
  }

  // Total score display
  const scoreStr =
    edition === "ENGLISH"
      ? `$${totalScore.toLocaleString("en-US")}`
      : `${totalScore.toLocaleString()}đ`;
  ctx.fillStyle = isTurn ? "#fef08a" : "#f59e0b";
  ctx.font = "900 28px Arial, monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(scoreStr, 14, 94);

  // Subtle CRT scanlines
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  for (let y = 0; y < h; y += 4) {
    ctx.fillRect(0, y, w, 1);
  }

  return canvas;
}

// ── Sub-components ───────────────────────────────────────────────────────────

/** 3D Wheel Machine (Conical Disc + Hub + Needle + Pedestal + LED Ring) */
function WheelMachineGroup({
  sectors,
  clientWheelAngle,
  effectiveIsSpinning,
}: {
  sectors: MagicWheelSector[];
  clientWheelAngle: number;
  effectiveIsSpinning: boolean;
  selectedSector?: MagicWheelSector;
}) {
  const spinningGroupRef = useRef<THREE.Group>(null);
  const needleRef = useRef<THREE.Mesh>(null);
  const ledRef = useRef<THREE.Mesh>(null);

  // Canvas texture for the wheel disc
  const wheelTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = generateWheelTexture(sectors, 1024);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, [sectors]);

  // True 3D Conical Geometry: elevated center apex sloping smoothly to rim
  const conicalGeometry = useMemo(() => {
    const geom = new THREE.CircleGeometry(2.12, 64, 0, Math.PI * 2);
    const pos = geom.attributes.position;
    const vertex = new THREE.Vector3();
    const R = 2.12;
    const APEX_Z = 0.36; // 36cm conical elevation at apex

    for (let i = 0; i < pos.count; i++) {
      vertex.fromBufferAttribute(pos, i);
      const dist = Math.sqrt(vertex.x * vertex.x + vertex.y * vertex.y);
      const ratio = Math.max(0, 1 - dist / R);
      // Smooth conical slope
      vertex.z = Math.pow(ratio, 0.95) * APEX_Z;
      pos.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    geom.computeVertexNormals();
    return geom;
  }, []);

  // Tilt angle: 12.6 degrees towards camera for broadcast perspective
  const WHEEL_TILT_RAD = 0.22;

  // Sync wheel rotation & realistic needle vibration
  useFrame(() => {
    if (spinningGroupRef.current) {
      // Rotate around the local Z axis of the cone
      spinningGroupRef.current.rotation.z = THREE.MathUtils.degToRad(-clientWheelAngle);
    }

    if (needleRef.current) {
      if (effectiveIsSpinning) {
        // High-frequency mechanical flutter simulating clicking across pegs
        const t = Date.now() / 1000;
        needleRef.current.rotation.y = Math.sin(t * 42) * 0.1;
      } else {
        needleRef.current.rotation.y = 0;
      }
    }

    if (ledRef.current) {
      const mat = ledRef.current.material as THREE.MeshStandardMaterial;
      const t = Date.now() / 1000;
      if (effectiveIsSpinning) {
        mat.emissiveIntensity = 1.6 + Math.sin(t * 8) * 0.6;
      } else {
        mat.emissiveIntensity = 0.8 + Math.sin(t * 2) * 0.25;
      }
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* ── 1. ROTATING 3D CONICAL WHEEL DISC (Lying horizontally, tilted 12.6° towards camera) ── */}
      <group position={[0, 1.25, 0]} rotation={[-Math.PI / 2 + WHEEL_TILT_RAD, 0, 0]}>
        <group ref={spinningGroupRef}>
          {/* Conical Sloped Mesh */}
          <mesh geometry={conicalGeometry} castShadow receiveShadow>
            <meshStandardMaterial
              map={wheelTexture ?? undefined}
              color={wheelTexture ? "#ffffff" : "#4f46e5"}
              roughness={0.25}
              metalness={0.18}
            />
          </mesh>

          {/* Gold outer rim bevel ring */}
          <mesh position={[0, 0, -0.01]}>
            <ringGeometry args={[2.08, 2.16, 64]} />
            <meshStandardMaterial
              color="#f59e0b"
              metalness={0.9}
              roughness={0.12}
              emissive="#d97706"
              emissiveIntensity={0.35}
            />
          </mesh>

          {/* Center Chrome Hub Dome */}
          <mesh position={[0, 0, 0.36]} castShadow>
            <cylinderGeometry args={[0.18, 0.22, 0.12, 32]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.06} />
          </mesh>
          <mesh position={[0, 0, 0.44]}>
            <sphereGeometry args={[0.13, 16, 16]} />
            <meshStandardMaterial color="#ffffff" metalness={1.0} roughness={0.02} />
          </mesh>
        </group>
      </group>

      {/* ── 2. NEEDLE AT 12 O'CLOCK RIM (Fixed, pointing down into winning wedge) ── */}
      {/* Needle cone tip pointing down along the conical slope toward the center */}
      <mesh
        ref={needleRef}
        position={[0, 1.74, -1.94]}
        rotation={[Math.PI / 2 + WHEEL_TILT_RAD, 0, 0]}
        castShadow
      >
        <coneGeometry args={[0.075, 0.42, 8]} />
        <meshStandardMaterial
          color="#f59e0b"
          emissive="#f59e0b"
          emissiveIntensity={0.8}
          metalness={0.85}
          roughness={0.12}
        />
      </mesh>
      {/* Needle chrome base mounting post */}
      <mesh position={[0, 1.76, -2.18]}>
        <cylinderGeometry args={[0.08, 0.1, 0.18, 16]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.08} />
      </mesh>
      <mesh position={[0, 1.86, -2.18]}>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshStandardMaterial
          color="#fef08a"
          metalness={0.95}
          roughness={0.08}
          emissive="#fbbf24"
          emissiveIntensity={0.7}
        />
      </mesh>

      {/* ── 3. PEDESTAL CYLINDER & LED ACCENT RING ── */}
      {/* Glowing LED Ring under wheel rim */}
      <mesh ref={ledRef} position={[0, 1.08, 0]} rotation={[-Math.PI / 2 + WHEEL_TILT_RAD, 0, 0]}>
        <torusGeometry args={[2.14, 0.05, 8, 64]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0ea5e9"
          emissiveIntensity={1.2}
          metalness={0.2}
          roughness={0.3}
        />
      </mesh>

      {/* 6 LED Point Lights around the ring */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const angle = (i / 6) * Math.PI * 2;
        return (
          <pointLight
            key={i}
            position={[Math.cos(angle) * 2.12, 1.08, Math.sin(angle) * 2.12]}
            color="#38bdf8"
            intensity={effectiveIsSpinning ? 1.8 : 0.7}
            distance={3.0}
            decay={2}
          />
        );
      })}

      {/* Tapered metallic pedestal trunk */}
      <mesh position={[0, 0.16, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.9, 2.25, 1.35, 32]} />
        <meshStandardMaterial color="#1e3a8a" metalness={0.78} roughness={0.22} />
      </mesh>

      {/* Chrome accent belt on pedestal */}
      <mesh position={[0, 0.28, 0]}>
        <torusGeometry args={[2.08, 0.038, 6, 32]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0ea5e9"
          emissiveIntensity={0.7}
          metalness={0.92}
          roughness={0.08}
        />
      </mesh>

      {/* Flared pedestal base foot */}
      <mesh position={[0, -0.58, 0]} receiveShadow>
        <cylinderGeometry args={[2.35, 2.52, 0.24, 32]} />
        <meshStandardMaterial color="#0c1a35" metalness={0.65} roughness={0.35} />
      </mesh>

      {/* Soft circular floor shadow */}
      <mesh position={[0, -0.73, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[3.0, 32]} />
        <meshStandardMaterial color="#000000" transparent opacity={0.55} />
      </mesh>
    </group>
  );
}

/** Individual 3D Team Podium Mesh */
function TeamPodiumMesh({
  team,
  roundScore,
  isTurn,
  posX,
  posZ,
  rotY,
  edition,
}: {
  team: TeamState;
  roundScore: number;
  isTurn: boolean;
  posX: number;
  posZ: number;
  rotY: number;
  edition: string;
}) {
  const screenRef = useRef<THREE.Mesh>(null);
  const totalScore = (team.score || 0) + roundScore;

  // Podium screen texture
  const screenTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = generatePodiumTexture(
      team.name,
      totalScore,
      roundScore,
      team.color || "#6366f1",
      isTurn,
      edition
    );
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.name, totalScore, roundScore, team.color, isTurn, edition]);

  // Subtle pulsing on active turn
  useFrame(() => {
    if (screenRef.current) {
      const mat = screenRef.current.material as THREE.MeshStandardMaterial;
      if (isTurn) {
        const t = Date.now() / 1000;
        mat.emissiveIntensity = 0.5 + Math.sin(t * 3.0) * 0.25;
      } else {
        mat.emissiveIntensity = 0.1;
      }
    }
  });

  return (
    <group position={[posX, -0.26, posZ]} rotation={[0, rotY, 0]}>
      {/* Screen panel */}
      <mesh ref={screenRef} position={[0, 0.52, 0]} castShadow>
        <boxGeometry args={[0.92, 0.46, 0.06]} />
        <meshStandardMaterial
          map={screenTexture ?? undefined}
          color={screenTexture ? "#ffffff" : isTurn ? "#1e3a8a" : "#1e293b"}
          emissive={isTurn ? "#0ea5e9" : "#1e3a8a"}
          emissiveIntensity={0.25}
          roughness={0.18}
          metalness={0.12}
        />
      </mesh>

      {/* Screen metallic frame */}
      <mesh position={[0, 0.52, 0.02]}>
        <boxGeometry args={[0.98, 0.52, 0.04]} />
        <meshStandardMaterial
          color={isTurn ? "#38bdf8" : "#1e40af"}
          metalness={0.88}
          roughness={0.12}
          emissive={isTurn ? "#0ea5e9" : "#1e3a5f"}
          emissiveIntensity={isTurn ? 0.75 : 0.25}
        />
      </mesh>

      {/* Podium body */}
      <mesh position={[0, 0.14, 0]} castShadow>
        <boxGeometry args={[0.88, 0.28, 0.22]} />
        <meshStandardMaterial
          color="#1e3a5f"
          metalness={0.72}
          roughness={0.28}
          emissive="#0c1a35"
          emissiveIntensity={0.22}
        />
      </mesh>

      {/* Podium base foot */}
      <mesh position={[0, -0.01, 0]}>
        <boxGeometry args={[0.98, 0.03, 0.32]} />
        <meshStandardMaterial color="#0c1a35" metalness={0.55} roughness={0.45} />
      </mesh>

      {/* Spotlight on active team podium */}
      {isTurn && (
        <pointLight position={[0, 0.88, 0.26]} color="#38bdf8" intensity={2.2} distance={2.2} decay={2} />
      )}
    </group>
  );
}

/** Arrange N team podiums in a 200° arc facing the central machine */
function TeamPodiumsArcGroup({
  teams,
  roundScores,
  currentTurnTeamId,
  tossUpBuzzedTeamId,
  isTossUpRound,
  phase,
  edition,
}: {
  teams: TeamState[];
  roundScores?: Record<string, number>;
  currentTurnTeamId?: string;
  tossUpBuzzedTeamId?: string;
  isTossUpRound?: boolean;
  phase?: string;
  edition: string;
}) {
  const N = teams.length;
  if (N === 0) return null;

  // Arc scales gracefully from 3 to 8 teams
  const ARC_DEG = Math.min(210, 80 + N * 18);
  const RADIUS = 3.65 + Math.max(0, (N - 4) * 0.16);
  const startAngle = -ARC_DEG / 2;
  const angleStep = N > 1 ? ARC_DEG / (N - 1) : 0;

  return (
    <group>
      {teams.map((team, i) => {
        const angleDeg = startAngle + i * angleStep;
        const angleRad = THREE.MathUtils.degToRad(angleDeg);
        const posX = Math.sin(angleRad) * RADIUS;
        const posZ = Math.cos(angleRad) * RADIUS;
        const rotY = -angleRad; // Look inward towards center

        const rScore = roundScores?.[team.id] || 0;
        const isTurn = isTossUpRound
          ? phase === "TOSS_UP_BUZZED" && Boolean(tossUpBuzzedTeamId) && team.id === tossUpBuzzedTeamId
          : team.id === currentTurnTeamId;

        return (
          <TeamPodiumMesh
            key={team.id}
            team={team}
            roundScore={rScore}
            isTurn={isTurn}
            posX={posX}
            posZ={posZ}
            rotY={rotY}
            edition={edition}
          />
        );
      })}
    </group>
  );
}

/** Camera Controller — hard-cuts between authentic TV studio angles */
function CameraController({
  camAngle,
  effectiveIsSpinning,
}: {
  camAngle: number;
  effectiveIsSpinning: boolean;
}) {
  const { camera } = useThree();
  const targetConfig = useRef<CamConfig>(CAM_POSITIONS.DEFAULT);
  const applied = useRef(false);

  useEffect(() => {
    if (!effectiveIsSpinning) {
      targetConfig.current = CAM_POSITIONS.DEFAULT;
    } else {
      const configs: Record<number, CamConfig> = {
        1: CAM_POSITIONS.CAM1_WHEEL,
        2: CAM_POSITIONS.CAM2_WIDE,
        3: CAM_POSITIONS.CAM3_BOARD,
        4: CAM_POSITIONS.CAM4_DISC,
      };
      targetConfig.current = configs[camAngle] ?? CAM_POSITIONS.DEFAULT;
    }
    applied.current = false; // Trigger immediate hard cut
  }, [camAngle, effectiveIsSpinning]);

  useFrame(() => {
    if (!applied.current) {
      const cfg = targetConfig.current;
      camera.position.set(...cfg.pos);
      camera.lookAt(...cfg.target);
      applied.current = true;
    }
  });

  return null;
}

/** Glossy Reflective Studio Floor with Concentric Neon Rings */
function StudioFloor() {
  return (
    <group position={[0, -0.75, 0]}>
      {/* Glossy reflective metallic stage floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[28, 28]} />
        <meshStandardMaterial
          color="#060c18"
          roughness={0.16}
          metalness={0.84}
        />
      </mesh>

      {/* Concentric stage floor glowing rings */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <ringGeometry args={[2.85, 2.92, 64]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0ea5e9"
          emissiveIntensity={1.4}
          roughness={0.15}
          metalness={0.9}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <ringGeometry args={[4.25, 4.33, 64]} />
        <meshStandardMaterial
          color="#1d4ed8"
          emissive="#2563eb"
          emissiveIntensity={0.9}
          roughness={0.25}
          metalness={0.8}
        />
      </mesh>
    </group>
  );
}

// ── Main Exported Component ───────────────────────────────────────────────────

export default function WheelStudio3DScene({
  sectors,
  clientWheelAngle,
  effectiveIsSpinning,
  selectedSector,
  teams,
  roundScores,
  currentTurnTeamId,
  tossUpBuzzedTeamId,
  isTossUpRound,
  phase,
  camAngle,
  edition = "VIETNAMESE",
  className = "",
}: WheelStudio3DSceneProps) {
  return (
    <div className={`w-full h-full relative select-none ${className}`} style={{ minHeight: "300px" }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        camera={{ fov: 46, near: 0.1, far: 100, position: [0, 3.8, 5.4] }}
        style={{ background: "transparent" }}
      >
        <CameraController camAngle={camAngle} effectiveIsSpinning={effectiveIsSpinning} />

        {/* ── High-Intensity Broadcast 4-Point Studio Lighting ── */}
        <ambientLight intensity={1.2} color="#e0f2fe" />

        {/* Key Spotlight: direct high-intensity beam on conical wheel disc */}
        <spotLight
          position={[0, 8.5, 4.2]}
          intensity={6.0}
          angle={0.65}
          penumbra={0.35}
          castShadow
          shadow-mapSize={[1024, 1024]}
          color="#ffffff"
        />

        {/* Left Soft Fill Spotlight (Sky Blue) */}
        <spotLight position={[-4.5, 5.5, 3.2]} intensity={2.6} angle={0.7} penumbra={0.5} color="#38bdf8" />

        {/* Right Warm Fill Spotlight (Amber Gold) */}
        <spotLight position={[4.5, 5.5, 3.2]} intensity={2.6} angle={0.7} penumbra={0.5} color="#fbbf24" />

        {/* Back Rim / Kicker Light (separates machine & podiums from background) */}
        <pointLight position={[0, 4.2, -4.5]} color="#60a5fa" intensity={4.0} />

        {/* Ground ambiance fill */}
        <pointLight position={[0, 0.2, 3.8]} color="#93c5fd" intensity={0.9} />

        {/* Studio Elements */}
        <StudioFloor />
        <WheelMachineGroup
          sectors={sectors}
          clientWheelAngle={clientWheelAngle}
          effectiveIsSpinning={effectiveIsSpinning}
          selectedSector={selectedSector}
        />
        <TeamPodiumsArcGroup
          teams={teams}
          roundScores={roundScores}
          currentTurnTeamId={currentTurnTeamId}
          tossUpBuzzedTeamId={tossUpBuzzedTeamId}
          isTossUpRound={isTossUpRound}
          phase={phase}
          edition={edition}
        />
      </Canvas>
    </div>
  );
}
