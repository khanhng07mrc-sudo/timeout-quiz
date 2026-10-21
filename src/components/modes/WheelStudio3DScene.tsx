"use client";
/**
 * WheelStudio3DScene — Three.js WebGL scene cho Magic Wheel Display view.
 *
 * Renders:
 *   - Genuine 3D Conical Wheel (nón thật dốc từ tâm ra vành chuẩn CNKD)
 *   - Typography: Roboto Slab (800/900) & Merriweather (900) chuẩn 100% tiếng Việt
 *   - Golden Brass & Chrome hardware styling (không còn viền xanh lạc quẻ)
 *   - Supercharged Broadcast Studio 5-Point Lighting (sáng bừng rực rỡ trường quay)
 *   - Studio Stage Floor with circular golden stage lighting & studio backdrop
 *   - Team podiums arranged in an arc facing the machine
 *   - Camera Cut Controller: 4 authentic TV studio angles
 */

import React, { useRef, useEffect, useMemo, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { MeshReflectorMaterial } from "@react-three/drei";
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
  camAngle: number; // 0=default, 1=wheel center, 2=master wide, 3=board hero, 4=disc closeup, 5=player, 6=audience
  edition?: string;
  className?: string;
  currentPuzzle?: {
    category: string;
    description?: string;
    secretPhrase: string;
    revealedIndices: number[];
  } | null;
  highlightedIndices?: Set<number>;
  animRevealedIndices?: Set<number>;
  onCamAngleChange?: (cam: number) => void;
}

interface CamConfig {
  pos: [number, number, number];
  target: [number, number, number];
}

// ── Authentic Studio Camera Configurations (6 CAM Multi-Director System) ─────
const CAM_POSITIONS: Record<string, CamConfig> = {
  // CAM 0 / Default: Tầm mắt truyền hình trực diện như ảnh phát sóng VTV3 10:28
  DEFAULT: { pos: [0, 2.70, 7.80], target: [0, 1.40, -1.00] },

  // CAM 1: Trực diện Vòng quay & Bàn thí sinh + MC (Contestant & Host Center)
  CAM1_CENTER: { pos: [0, 3.20, 5.00], target: [0, 1.30, -0.40] },

  // CAM 2: Đại cảnh toàn bộ trường quay tầm mắt TV (Master Wide Broadcast Angle như ảnh 3 VTV3 10:28)
  CAM2_WIDE: { pos: [0, 2.70, 7.80], target: [0, 1.40, -1.00] },

  // CAM 3: Trực diện vuông góc toàn bộ Bảng ô chữ 3D & Người mẫu toàn thân (Stage Left Z ~ -1.0m)
  CAM3_BOARD: { pos: [-4.00, 1.65, 4.30], target: [-6.80, 1.60, -1.00] },

  // CAM 4: Cận cảnh kim chỉ thị và các chốt ô nón đang quay (Kim quay hero close-up)
  CAM4_DISC: { pos: [-2.10, 2.50, 1.40], target: [-1.65, 1.20, 0.10] },

  // CAM 5: Lia cận cảnh thí sinh đang đến lượt (Active Player Close-up)
  CAM5_PLAYER: { pos: [0.80, 2.80, 2.40], target: [1.20, 2.20, -2.80] },

  // CAM 6: Góc khán giả từ khán đài nhìn lên sân khấu hoành tráng (Audience Perspective)
  CAM6_AUDIENCE: { pos: [2.50, 2.60, 11.20], target: [-0.80, 2.00, -1.80] },
};

// ── Texture Generators ───────────────────────────────────────────────────────

/** Calculate dynamic high-contrast fill and stroke colors for wedge text */
function getWedgeTextColors(bgColor: string, defaultTextColor?: string): { fill: string; stroke: string } {
  const cleanHex = (bgColor || "#4338ca").replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2) || "43", 16);
  const g = parseInt(cleanHex.substring(2, 4) || "38", 16);
  const b = parseInt(cleanHex.substring(4, 6) || "ca", 16);
  // ITU-R BT.709 perceived luminance
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

  if (lum > 0.58) {
    // Light / Yellow / Gold backgrounds: Dark navy/black text with crisp white outline
    const isDarkGiven = defaultTextColor && !["#ffffff", "#fff", "#fef08a", "#fef9c3", "#fef3c7"].includes(defaultTextColor.toLowerCase());
    return {
      fill: isDarkGiven ? defaultTextColor : "#0f172a",
      stroke: "#ffffff",
    };
  } else {
    // Dark / Vibrant backgrounds: Crisp white text with black outline
    const isLightGiven = defaultTextColor && !["#000000", "#000", "#0f172a", "#1e293b"].includes(defaultTextColor.toLowerCase());
    return {
      fill: isLightGiven ? defaultTextColor : "#ffffff",
      stroke: "#000000",
    };
  }
}

/** Generate high-resolution wheel texture with authentic Roboto Slab typography (Single Line & High Contrast) */
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

    // ── Wedge Text & Numbers Along the Radial Axis (Tất cả trên 1 dòng duy nhất, font Roboto Slab) ──
    ctx.save();
    const midAngle = a1 + degPerSeg / 2;
    ctx.translate(cx, cy);
    ctx.rotate(midAngle);

    // Strip commas, dots, and emojis completely
    const rawLabel = sec.label || "";
    const cleanLabel = rawLabel
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "")
      .replace(/[,.]/g, "")
      .trim();
    const isNumeric = sec.type === "POINTS" || /^\$?\d+$/.test(cleanLabel);
    const colors = getWedgeTextColors(sec.color || "#4338ca", sec.textColor);

    if (isNumeric && cleanLabel.length > 0) {
      // Numbers: Stacked upright digits along the radial ray from rim towards center
      // Fix spacing: stepX (74px) lớn hơn nhiều so với fontSize (52px) để triệt tiêu hoàn toàn lỗi đè chữ số
      const digits = cleanLabel.split("");
      const fontSize = digits.length >= 5 ? 40 : digits.length >= 4 ? 46 : 52;
      const stepX = digits.length >= 5 ? 54 : digits.length >= 4 ? 64 : 74;
      const startX = r - (digits.length >= 5 ? 44 : 52);

      // Font Gameshow in hoa không chân dày dặn chuẩn VTV3 (Impact / Arial Black / Montserrat)
      ctx.font = `900 ${fontSize}px "Impact", "Montserrat", "Arial Black", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      digits.forEach((digit, dIdx) => {
        const curX = startX - dIdx * stepX;
        ctx.save();
        ctx.translate(curX, 0);
        ctx.rotate(Math.PI / 2); // Flip theo chiều nhìn từ vành nón

        // Viền tương phản sắc nét (3.2px)
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 3.2;
        ctx.strokeText(digit, 0, 0);

        // Màu fill nổi bật
        ctx.fillStyle = colors.fill;
        ctx.fillText(digit, 0, 0);
        ctx.restore();
      });
    } else {
      // Special action label (e.g. PHẦN THƯỞNG, MẤT LƯỢT, NHÂN ĐÔI, CHIA ĐÔI, BÍ MẬT, TỐC ĐỘ, KIM CƯƠNG)
      ctx.translate(r - 28, 0);
      ctx.rotate(Math.PI); // Now +X points toward the center of the wheel

      // Calculate dynamic font size to guarantee everything fits on 1 single line without overflow
      const maxAvailableWidth = r - 75;
      const charCount = Math.max(cleanLabel.length, 5);
      const targetFontSize = Math.min(34, Math.max(18, Math.floor(maxAvailableWidth / (charCount * 0.58))));

      ctx.font = `900 ${targetFontSize}px "Montserrat", "Impact", "Arial Black", sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";

      // Thin crisp stroke (2.6px)
      ctx.strokeStyle = colors.stroke;
      ctx.lineWidth = 2.6;
      ctx.strokeText(cleanLabel, 8, 0);

      ctx.fillStyle = colors.fill;
      ctx.fillText(cleanLabel, 8, 0);
    }

    ctx.restore();
  });

  // Conical 3D Shading Overlay
  const conicalShade = ctx.createRadialGradient(cx, cy, 20, cx, cy, r);
  conicalShade.addColorStop(0, "rgba(255,255,255,0.42)");
  conicalShade.addColorStop(0.35, "rgba(255,255,255,0.15)");
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
    ctx.fillStyle = "#cbd5e1";
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  // Center Metallic Chrome & Gold Hub (tinh tế, nhỏ gọn, không lố)
  const hubRadius = size * 0.055;
  const hubGrad = ctx.createRadialGradient(cx - hubRadius * 0.2, cy - hubRadius * 0.2, 0, cx, cy, hubRadius);
  hubGrad.addColorStop(0, "#ffffff");
  hubGrad.addColorStop(0.4, "#e2e8f0");
  hubGrad.addColorStop(0.8, "#94a3b8");
  hubGrad.addColorStop(1, "#475569");

  ctx.beginPath();
  ctx.arc(cx, cy, hubRadius, 0, Math.PI * 2);
  ctx.fillStyle = hubGrad;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, hubRadius, 0, Math.PI * 2);
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  return canvas;
}

/** Generate team podium screen texture (512x256 High-DPI Broadcast LED Board) */
function generatePodiumTexture(
  name: string,
  totalScore: number,
  roundScore: number,
  color: string,
  isTurn: boolean,
  edition: string,
  rank?: number
): HTMLCanvasElement {
  const w = 512,
    h = 256;
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
  ctx.roundRect(0, 0, w, h, 20);
  ctx.fill();

  // Glowing golden/neon border
  ctx.strokeStyle = isTurn ? "#f59e0b" : "#38bdf8";
  ctx.lineWidth = isTurn ? 6 : 3;
  ctx.roundRect(4, 4, w - 8, h - 8, 16);
  ctx.stroke();

  // Team dot
  ctx.beginPath();
  ctx.arc(36, 44, 14, 0, Math.PI * 2);
  ctx.fillStyle = color || "#6366f1";
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Team name
  ctx.fillStyle = isTurn ? "#fef08a" : "#cbd5e1";
  ctx.font = "bold 28px 'Roboto Slab', Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const shortName = name.length > 12 ? name.substring(0, 12) : name;
  ctx.fillText(shortName.toUpperCase(), 62, 44);

  // Rank badge
  if (rank) {
    ctx.fillStyle = rank === 1 ? "#fbbf24" : "#94a3b8";
    ctx.font = "900 22px 'Roboto Slab', Arial, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`HẠNG #${rank}`, w - 24, 44);
  }

  // Active status tag / LƯỢT QUAY
  if (isTurn) {
    ctx.fillStyle = "#f59e0b";
    ctx.font = "900 20px 'Roboto Slab', Arial, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("★ LƯỢT QUAY ★", w - 24, 92);
  }

  // Round score pill
  if (roundScore > 0) {
    const rStr =
      edition === "ENGLISH"
        ? `+$${roundScore.toLocaleString("en-US")}`
        : `+${roundScore.toLocaleString()}đ`;
    ctx.fillStyle = "#34d399";
    ctx.font = "bold 28px 'Roboto Slab', monospace";
    ctx.textAlign = "right";
    ctx.fillText(rStr, w - 24, 150);
  }

  // Total score display (Large digital broadcast font matching Image 2 "500" scoreboard)
  const scoreStr =
    edition === "ENGLISH"
      ? `$${totalScore.toLocaleString("en-US")}`
      : `${totalScore.toLocaleString()}đ`;
  ctx.fillStyle = isTurn ? "#fef08a" : "#f59e0b";
  ctx.font = "900 56px 'Roboto Slab', monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(scoreStr, 24, 185);

  // Subtle CRT scanlines
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  for (let y = 0; y < h; y += 6) {
    ctx.fillRect(0, y, w, 2);
  }

  return canvas;
}

// ── Sub-components ───────────────────────────────────────────────────────────

/** 3D Wheel Machine (Conical Disc + Hub + Needle + Pedestal - NO BLUE RING) */
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
  const goldAccentRef = useRef<THREE.Mesh>(null);

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

  // Sync wheel rotation (+90° offset for 9 o'clock needle alignment) & realistic needle vibration
  useFrame(() => {
    if (spinningGroupRef.current) {
      // Shifting by +90 degrees counter-clockwise aligns the winning sector directly under the 9 o'clock needle
      spinningGroupRef.current.rotation.z = THREE.MathUtils.degToRad(-clientWheelAngle + 90);
    }

    if (needleRef.current) {
      if (effectiveIsSpinning) {
        const t = Date.now() / 1000;
        // Mechanical peg deflection vibration at 9 o'clock
        needleRef.current.rotation.z = Math.sin(t * 54) * 0.12;
        needleRef.current.position.y = Math.sin(t * 42) * 0.008;
      } else {
        needleRef.current.rotation.z = 0;
        needleRef.current.position.y = 0;
      }
    }

    if (goldAccentRef.current) {
      const mat = goldAccentRef.current.material as THREE.MeshStandardMaterial;
      const t = Date.now() / 1000;
      if (effectiveIsSpinning) {
        mat.emissiveIntensity = 0.65 + Math.sin(t * 8) * 0.25;
      } else {
        mat.emissiveIntensity = 0.4 + Math.sin(t * 2) * 0.1;
      }
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* ── 1. ROTATING 3D CONICAL WHEEL DISC ── */}
      <group position={[0, 1.25, 0]} rotation={[-Math.PI / 2 + WHEEL_TILT_RAD, 0, 0]}>
        <group ref={spinningGroupRef}>
          {/* Conical Sloped Mesh */}
          <mesh geometry={conicalGeometry} castShadow receiveShadow>
            <meshStandardMaterial
              map={wheelTexture ?? undefined}
              color={wheelTexture ? "#ffffff" : "#4f46e5"}
              roughness={0.22}
              metalness={0.22}
            />
          </mesh>

          {/* 24 Chốt Trụ Kim loại 3D phân tách ô chuẩn VTV3 (Separation Pegs) */}
          {sectors.map((_, idx) => {
            const angle = (idx * Math.PI * 2) / sectors.length - Math.PI / 2;
            const PEG_RADIUS = 2.08;
            const px = Math.cos(angle) * PEG_RADIUS;
            const py = Math.sin(angle) * PEG_RADIUS;
            return (
              <group key={`peg-${idx}`} position={[px, py, 0.015]} rotation={[0, 0, angle]}>
                {/* Chân đệm chốt mạ Chrome */}
                <mesh position={[0, 0, 0.015]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.026, 0.032, 0.03, 16]} />
                  <meshStandardMaterial color="#cbd5e1" metalness={0.96} roughness={0.06} />
                </mesh>
                {/* Thân chốt trụ kim loại mạ Chrome đứng thẳng */}
                <mesh position={[0, 0, 0.065]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <cylinderGeometry args={[0.016, 0.016, 0.10, 16]} />
                  <meshStandardMaterial color="#f8fafc" metalness={0.98} roughness={0.03} />
                </mesh>
                {/* Đầu chốt đinh tán hình cầu mạ vàng */}
                <mesh position={[0, 0, 0.115]}>
                  <sphereGeometry args={[0.022, 12, 12]} />
                  <meshStandardMaterial
                    color="#fef08a"
                    metalness={0.96}
                    roughness={0.04}
                    emissive="#fbbf24"
                    emissiveIntensity={0.25}
                  />
                </mesh>
              </group>
            );
          })}

          {/* Tâm vòng quay cơ khí thanh lịch, tinh tế chuẩn VTV3 (không bị lố) */}
          {/* 1. Mâm đế trục mạ Chrome bạc phẳng ôm sát tâm nón */}
          <mesh position={[0, 0, 0.362]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.18, 0.015, 32]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.96} roughness={0.08} />
          </mesh>
          {/* 2. Vòng đệm viền vàng gold tinh tế */}
          <mesh position={[0, 0, 0.372]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.11, 0.11, 0.012, 28]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.92} roughness={0.12} />
          </mesh>
          {/* 3. Ốc tán tâm trục trung tâm mạ crom bóng loáng */}
          <mesh position={[0, 0, 0.380]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 0.01, 16]} />
            <meshStandardMaterial color="#f8fafc" metalness={0.98} roughness={0.04} />
          </mesh>
        </group>
      </group>

      {/* ── 2. NEEDLE AT 9 O'CLOCK FLANK WITH AUTHENTIC SLANTED SUPPORT PILLAR (VTV3 BROADCAST STYLE) ── */}
      {/* Flexible mechanical pointer needle (lưỡi kim gạt) at 9 o'clock */}
      <group position={[-2.30, 1.25, 0.08]} rotation={[0.34, 0.12, 0]}>
        {/* Dynamic vibrating pointer flapper pointing into the 3D pegs */}
        <mesh
          ref={needleRef}
          position={[0.16, 0, 0]}
          castShadow
        >
          {/* Lưỡi kim gạt đỏ thẫm to rõ chuẩn VTV3 (Crimson red flexible flapper) */}
          <boxGeometry args={[0.34, 0.12, 0.045]} />
          <meshStandardMaterial
            color="#dc2626"
            emissive="#991b1b"
            emissiveIntensity={0.6}
            metalness={0.15}
            roughness={0.25}
          />
        </mesh>

        {/* Mũi tên chỉ thị nhọn màu vàng đậm phát quang (Pointer tip indicator) */}
        <mesh position={[0.34, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.075, 0.13, 16]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#d97706"
            emissiveIntensity={1.5}
            metalness={0.96}
            roughness={0.06}
          />
        </mesh>

        {/* Dedicated metallic mounting box & pivot joint */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.12, 0.15, 0.14]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.05} />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial
            color="#fbbf24"
            metalness={0.96}
            roughness={0.05}
            emissive="#f59e0b"
            emissiveIntensity={0.8}
          />
        </mesh>
      </group>

      {/* Slanted support arm extending from pillar head to needle mounting box */}
      <mesh position={[-2.34, 1.08, 0.06]} rotation={[0.18, 0, -0.28]} castShadow>
        <cylinderGeometry args={[0.048, 0.052, 0.44, 16]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.08} />
      </mesh>

      {/* Chrome vertical pillar anchored into stage floor */}
      <mesh position={[-2.40, 0.15, 0.12]} castShadow receiveShadow>
        <cylinderGeometry args={[0.065, 0.082, 1.6, 24]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.92} roughness={0.12} />
      </mesh>

      {/* Gold decorative collar ring on pillar */}
      <mesh position={[-2.40, 0.88, 0.12]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.085, 0.022, 8, 24]} />
        <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={0.5} metalness={0.94} roughness={0.08} />
      </mesh>

      {/* Pillar floor flared base anchor plinth */}
      <mesh position={[-2.40, -0.68, 0.12]}>
        <cylinderGeometry args={[0.16, 0.22, 0.14, 24]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.94} roughness={0.08} />
      </mesh>

      {/* ── 3. MULTI-TIER METALLIC ILLUMINATED PEDESTAL (ĐƯỜNG KÍNH THON GỌN, HOÀN TOÀN DƯỚI GẦM NÓN) ── */}
      {/* Tier 1: Bright Chrome Axle Collar supporting center of wheel hub */}
      <mesh position={[0, 0.88, 0]} castShadow>
        <cylinderGeometry args={[0.72, 0.82, 0.22, 32]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.06} />
      </mesh>

      {/* Tier 2: Illuminated Golden Collar Belt */}
      <mesh ref={goldAccentRef} position={[0, 0.84, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.84, 0.035, 8, 48]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#d97706"
          emissiveIntensity={0.6}
          metalness={0.94}
          roughness={0.08}
        />
      </mesh>

      {/* Tier 3: Sleek Studio Navy Lacquered Tapered Trunk */}
      <mesh position={[0, 0.40, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.85, 1.45, 0.75, 32]} />
        <meshStandardMaterial color="#0f254e" metalness={0.88} roughness={0.15} />
      </mesh>

      {/* Mid-trunk reflective Chrome Belt */}
      <mesh position={[0, 0.40, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.18, 0.035, 8, 48]} />
        <meshStandardMaterial
          color="#e2e8f0"
          metalness={0.95}
          roughness={0.05}
        />
      </mesh>

      {/* Tier 4: Lower Chrome Stepped Tier */}
      <mesh position={[0, -0.15, 0]} receiveShadow>
        <cylinderGeometry args={[1.50, 1.95, 0.35, 32]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.92} roughness={0.08} />
      </mesh>

      {/* Tier 5: Studio Navy Base Tier */}
      <mesh position={[0, -0.50, 0]} receiveShadow>
        <cylinderGeometry args={[2.05, 2.45, 0.35, 32]} />
        <meshStandardMaterial color="#0a1a36" metalness={0.85} roughness={0.2} />
      </mesh>

      {/* Tier 6: Flared Chrome Plinth Foot */}
      <mesh position={[0, -0.68, 0]} receiveShadow>
        <cylinderGeometry args={[2.48, 2.68, 0.14, 32]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.08} />
      </mesh>

      {/* 4 Dedicated Warm Golden Floor Uplights illuminating pedestal and under-wheel area */}
      {[Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75].map((angle, i) => (
        <pointLight
          key={`uplight-${i}`}
          position={[Math.cos(angle) * 1.8, -0.2, Math.sin(angle) * 1.8]}
          color="#fef08a"
          intensity={effectiveIsSpinning ? 4.5 : 3.6}
          distance={4.5}
          decay={1.8}
        />
      ))}

      {/* Soft circular floor ambient contact */}
      <mesh position={[0, -0.73, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[2.95, 32]} />
        <meshStandardMaterial color="#000000" transparent opacity={0.2} />
      </mesh>
    </group>
  );
}

/** Individual 3D Team Podium Mesh */
/** 3D Stylized Mannequin Figure (Hình nhân 3D mặc vest màu đội đứng sau bàn thi đấu) */
function StylizedMannequin({
  color,
  isTurn,
}: {
  color: string;
  isTurn: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      const t = Date.now() / 1000;
      if (isTurn) {
        // Nhấp nhô nhẹ & nghiêng người hướng về vòng quay khi đến lượt
        groupRef.current.position.y = Math.sin(t * 3.5) * 0.015;
        groupRef.current.rotation.x = -0.06 + Math.sin(t * 2.0) * 0.025;
      } else {
        groupRef.current.position.y = Math.sin(t * 1.5) * 0.005;
        groupRef.current.rotation.x = 0;
      }
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* 1. Đôi chân và quần âu lịch sự */}
      <mesh position={[-0.10, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.065, 0.44, 16]} />
        <meshStandardMaterial color="#0f172a" roughness={0.5} />
      </mesh>
      <mesh position={[0.10, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.065, 0.44, 16]} />
        <meshStandardMaterial color="#0f172a" roughness={0.5} />
      </mesh>

      {/* Giày da đen */}
      <mesh position={[-0.10, 0.02, 0.03]}>
        <boxGeometry args={[0.11, 0.04, 0.16]} />
        <meshStandardMaterial color="#020617" roughness={0.2} metalness={0.6} />
      </mesh>
      <mesh position={[0.10, 0.02, 0.03]}>
        <boxGeometry args={[0.11, 0.04, 0.16]} />
        <meshStandardMaterial color="#020617" roughness={0.2} metalness={0.6} />
      </mesh>

      {/* 2. Thân áo vest nam/nữ sang trọng mang màu sắc đội thi */}
      <mesh position={[0, 0.65, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.22, 0.46, 16]} />
        <meshStandardMaterial
          color={color || "#3b82f6"}
          roughness={0.35}
          metalness={0.18}
        />
      </mesh>

      {/* 3. Cổ áo sơ mi trắng & Cà vạt */}
      <mesh position={[0, 0.88, 0.02]}>
        <cylinderGeometry args={[0.08, 0.095, 0.07, 16]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.74, 0.10]}>
        <boxGeometry args={[0.04, 0.20, 0.015]} />
        <meshStandardMaterial color="#0f172a" roughness={0.3} />
      </mesh>

      {/* 4. Đầu hình nhân cách điệu bo tròn nhẵn bóng */}
      <mesh position={[0, 1.02, 0]} castShadow>
        <sphereGeometry args={[0.125, 24, 24]} />
        <meshStandardMaterial
          color="#fef3c7"
          roughness={0.25}
          metalness={0.06}
        />
      </mesh>

      {/* 5. Cánh tay tự nhiên hướng về mặt bàn chuông bấm */}
      {/* Cánh tay trái */}
      <mesh position={[-0.24, 0.72, 0.06]} rotation={[0.45, 0, 0.18]}>
        <cylinderGeometry args={[0.048, 0.052, 0.36, 12]} />
        <meshStandardMaterial color={color || "#3b82f6"} roughness={0.35} metalness={0.18} />
      </mesh>
      <mesh position={[-0.25, 0.54, 0.24]}>
        <sphereGeometry args={[0.042, 12, 12]} />
        <meshStandardMaterial color="#fef3c7" roughness={0.3} />
      </mesh>

      {/* Cánh tay phải */}
      <mesh position={[0.24, 0.72, 0.06]} rotation={[0.45, 0, -0.18]}>
        <cylinderGeometry args={[0.048, 0.052, 0.36, 12]} />
        <meshStandardMaterial color={color || "#3b82f6"} roughness={0.35} metalness={0.18} />
      </mesh>
      <mesh position={[0.25, 0.54, 0.24]}>
        <sphereGeometry args={[0.042, 12, 12]} />
        <meshStandardMaterial color="#fef3c7" roughness={0.3} />
      </mesh>
    </group>
  );
}

/** 3D Stylized MC / Host Figure (Hình nhân MC mặc vest tuxedo đen lịch lãm, sơ mi trắng, nơ đỏ, cầm thẻ cue card) */
function StylizedHostMannequin() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      const t = Date.now() / 1000;
      // MC thở nhẹ tự nhiên & quay người duyên dáng
      groupRef.current.position.y = Math.sin(t * 1.8) * 0.006;
      groupRef.current.rotation.y = Math.sin(t * 1.2) * 0.04;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* 1. Đôi chân và quần âu đen lịch lãm */}
      <mesh position={[-0.10, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.065, 0.44, 16]} />
        <meshStandardMaterial color="#020617" roughness={0.4} />
      </mesh>
      <mesh position={[0.10, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.065, 0.44, 16]} />
        <meshStandardMaterial color="#020617" roughness={0.4} />
      </mesh>

      {/* Giày da đen bóng */}
      <mesh position={[-0.10, 0.02, 0.03]}>
        <boxGeometry args={[0.11, 0.04, 0.16]} />
        <meshStandardMaterial color="#000000" roughness={0.15} metalness={0.7} />
      </mesh>
      <mesh position={[0.10, 0.02, 0.03]}>
        <boxGeometry args={[0.11, 0.04, 0.16]} />
        <meshStandardMaterial color="#000000" roughness={0.15} metalness={0.7} />
      </mesh>

      {/* 2. Thân áo vest đen tuxedo trang trọng của MC */}
      <mesh position={[0, 0.65, 0]} castShadow>
        <cylinderGeometry args={[0.19, 0.23, 0.46, 16]} />
        <meshStandardMaterial color="#090d16" roughness={0.3} metalness={0.2} />
      </mesh>

      {/* Ve áo vest lụa đen satin bóng */}
      <mesh position={[0, 0.66, 0.09]}>
        <boxGeometry args={[0.16, 0.36, 0.02]} />
        <meshStandardMaterial color="#020617" roughness={0.15} metalness={0.4} />
      </mesh>

      {/* 3. Cổ áo sơ mi trắng & Nơ cổ màu đỏ ruby sang trọng */}
      <mesh position={[0, 0.88, 0.02]}>
        <cylinderGeometry args={[0.08, 0.095, 0.07, 16]} />
        <meshStandardMaterial color="#ffffff" roughness={0.2} />
      </mesh>
      {/* Nơ bướm màu đỏ ruby */}
      <mesh position={[0, 0.83, 0.11]}>
        <boxGeometry args={[0.09, 0.04, 0.02]} />
        <meshStandardMaterial color="#dc2626" emissive="#991b1b" emissiveIntensity={0.5} roughness={0.3} />
      </mesh>

      {/* 4. Đầu hình nhân cách điệu sáng màu da thanh lịch */}
      <mesh position={[0, 1.02, 0]} castShadow>
        <sphereGeometry args={[0.125, 24, 24]} />
        <meshStandardMaterial color="#fef3c7" roughness={0.25} metalness={0.06} />
      </mesh>

      {/* Mái tóc đen vuốt gel lịch sự */}
      <mesh position={[0, 1.08, -0.02]}>
        <sphereGeometry args={[0.126, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} />
      </mesh>

      {/* 5. Cánh tay MC: tay trái cầm thẻ kịch bản dẫn, tay phải tự nhiên đặt gần bục */}
      <mesh position={[-0.24, 0.72, 0.06]} rotation={[0.55, 0, 0.22]}>
        <cylinderGeometry args={[0.048, 0.052, 0.36, 12]} />
        <meshStandardMaterial color="#090d16" roughness={0.3} metalness={0.2} />
      </mesh>
      {/* Thẻ dẫn chương trình màu vàng gold trên tay */}
      <mesh position={[-0.26, 0.58, 0.26]} rotation={[0.4, 0.2, -0.1]}>
        <boxGeometry args={[0.16, 0.22, 0.008]} />
        <meshStandardMaterial color="#fef08a" emissive="#eab308" emissiveIntensity={0.35} metalness={0.5} roughness={0.2} />
      </mesh>

      {/* Tay phải tự nhiên đặt gần bục */}
      <mesh position={[0.24, 0.72, 0.06]} rotation={[0.42, 0, -0.20]}>
        <cylinderGeometry args={[0.048, 0.052, 0.36, 12]} />
        <meshStandardMaterial color="#090d16" roughness={0.3} metalness={0.2} />
      </mesh>
      <mesh position={[0.26, 0.54, 0.22]}>
        <sphereGeometry args={[0.042, 12, 12]} />
        <meshStandardMaterial color="#fef3c7" roughness={0.3} />
      </mesh>
    </group>
  );
}

/** Bục đứng riêng biệt cho MC (Host Podium & Lectern) đặt bên trái các thí sinh theo góc nhìn khán giả */
function DedicatedMcStation() {
  // MC đứng ở mạn trái camera (-X), ngay bên trái bục thí sinh số 1, góc theta ~ -30°
  const RADIUS_MC = 3.30;
  const thetaRad = THREE.MathUtils.degToRad(-30);
  const posX = Math.sin(thetaRad) * RADIUS_MC; // ~ -1.65m
  const posZ = -Math.cos(thetaRad) * RADIUS_MC; // ~ -2.86m
  // Xoay mặt hướng về tâm vòng quay và bao quát toàn bộ trường quay
  const rotY = -thetaRad + 0.35;

  return (
    <group position={[posX, -0.75, posZ]} rotation={[0, rotY, 0]}>
      {/* 1. Trụ bục đứng hình trụ đa tầng cao cấp của MC (sàn cao Y = +1.35m) */}
      <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.58, 0.64, 2.10, 32]} />
        <meshStandardMaterial color="#0b1a36" metalness={0.90} roughness={0.16} />
      </mesh>

      {/* Mặt sàn đứng bục MC */}
      <mesh position={[0, 2.10, 0]} receiveShadow>
        <cylinderGeometry args={[0.60, 0.60, 0.04, 32]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.94} roughness={0.08} />
      </mesh>

      {/* Dải đèn LED vàng hoàng kim viền quanh sàn bục MC */}
      <mesh position={[0, 2.11, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.56, 0.60, 32]} />
        <meshStandardMaterial
          color="#fde047"
          emissive="#f59e0b"
          emissiveIntensity={1.5}
          metalness={0.9}
        />
      </mesh>

      {/* 2. Bục điều khiển phát biểu (Lectern / Desk) riêng của MC */}
      <group position={[0, 2.10, 0.32]}>
        {/* Thân bục hình trụ vát cạnh */}
        <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.20, 0.26, 0.76, 24]} />
          <meshStandardMaterial color="#0f2142" metalness={0.88} roughness={0.15} />
        </mesh>

        {/* Mặt bàn bục nghiêng đón mắt MC */}
        <mesh position={[0, 0.76, 0]} rotation={[-0.26, 0, 0]} receiveShadow>
          <boxGeometry args={[0.52, 0.03, 0.36]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.06} />
        </mesh>

        {/* Thẻ kịch bản dẫn chương trình (Cue Card) đặt trên bàn bục */}
        <mesh position={[0, 0.78, 0]} rotation={[-0.26, 0, 0]}>
          <boxGeometry args={[0.30, 0.008, 0.20]} />
          <meshStandardMaterial color="#fef9c3" roughness={0.3} />
        </mesh>

        {/* Micro cổ ngỗng truyền hình mạ chrome */}
        <group position={[0.16, 0.78, -0.06]}>
          <mesh position={[0, 0.08, 0]} rotation={[0.22, 0, -0.15]}>
            <cylinderGeometry args={[0.005, 0.005, 0.16, 12]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.98} roughness={0.04} />
          </mesh>
          <mesh position={[-0.02, 0.17, 0.04]}>
            <sphereGeometry args={[0.016, 12, 12]} />
            <meshStandardMaterial color="#1e293b" roughness={0.5} />
          </mesh>
        </group>

        {/* Biển hiệu "MC" LED phát sáng mặt trước bục */}
        <mesh position={[0, 0.42, 0.22]} rotation={[-0.10, 0, 0]}>
          <boxGeometry args={[0.28, 0.16, 0.02]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#d97706"
            emissiveIntensity={1.3}
            metalness={0.92}
            roughness={0.08}
          />
        </mesh>
      </group>

      {/* 3. Hình nhân MC 3D lịch lãm đứng sau bàn bục */}
      <group position={[0, 2.10, -0.10]}>
        <StylizedHostMannequin />
      </group>

      {/* 4. Đèn chiếu sáng riêng biệt cho MC (Dedicated MC Studio Spotlight) */}
      <pointLight position={[0, 3.85, 0.25]} color="#fffbeb" intensity={4.5} distance={4.0} />
    </group>
  );
}

/** Trạm thi đấu trên bục kê cao phía sau vòng quay chuẩn VTV3 (Elevated Contestant Station) */
function ElevatedSlotStation({
  team,
  roundScore,
  totalScore,
  rank,
  isTurn,
  posX,
  posZ,
  rotY,
  edition,
}: {
  team: TeamState;
  roundScore: number;
  totalScore: number;
  rank: number;
  isTurn: boolean;
  posX: number;
  posZ: number;
  rotY: number;
  edition: string;
}) {
  const screenRef = useRef<THREE.Mesh>(null);

  // Podium screen texture
  const screenTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = generatePodiumTexture(
      team.name,
      totalScore,
      roundScore,
      team.color || "#6366f1",
      isTurn,
      edition,
      rank
    );
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.name, totalScore, roundScore, team.color, isTurn, edition, rank]);

  // Subtle pulsing on active turn
  useFrame(() => {
    if (screenRef.current) {
      const mat = screenRef.current.material as THREE.MeshStandardMaterial;
      if (isTurn) {
        const t = Date.now() / 1000;
        mat.emissiveIntensity = 0.55 + Math.sin(t * 3.0) * 0.25;
      } else {
        mat.emissiveIntensity = 0.12;
      }
    }
  });

  return (
    <group position={[posX, -0.75, posZ]} rotation={[0, rotY, 0]}>
      {/* 1. Khối đế bục nâng cao cho thí sinh đứng (Riser Platform: sàn đứng cao Y = +1.35m so với thế giới) */}
      <mesh position={[0, 1.05, -0.17]} castShadow receiveShadow>
        <boxGeometry args={[0.84, 2.10, 1.05]} />
        <meshStandardMaterial
          color="#0b1a36"
          metalness={0.88}
          roughness={0.18}
          emissive="#061024"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Mặt sàn đứng bục thí sinh (Standing Deck Floor) */}
      <mesh position={[0, 2.10, -0.17]} receiveShadow>
        <boxGeometry args={[0.86, 0.04, 1.05]} />
        <meshStandardMaterial
          color="#cbd5e1"
          metalness={0.92}
          roughness={0.12}
        />
      </mesh>

      {/* 2. Bàn để tay cho thí sinh gắn trên bục (Contestant Handrail & Desk Countertop) */}
      {/* Thân bàn */}
      <mesh position={[0, 2.45, 0.22]} castShadow receiveShadow>
        <boxGeometry args={[0.84, 0.70, 0.36]} />
        <meshStandardMaterial
          color="#0f2142"
          metalness={0.85}
          roughness={0.16}
        />
      </mesh>

      {/* Mặt bàn để tay hợp kim bạc sang trọng */}
      <mesh position={[0, 2.80, 0.22]} receiveShadow>
        <boxGeometry args={[0.88, 0.04, 0.40]} />
        <meshStandardMaterial
          color="#e2e8f0"
          metalness={0.94}
          roughness={0.08}
        />
      </mesh>

      {/* Dải LED viền phát quang mép bàn theo màu đội */}
      <mesh position={[0, 2.78, 0.42]}>
        <boxGeometry args={[0.86, 0.02, 0.02]} />
        <meshStandardMaterial
          color={team.color || "#6366f1"}
          emissive={team.color || "#6366f1"}
          emissiveIntensity={isTurn ? 2.2 : 0.8}
        />
      </mesh>

      {/* 3. Bảng hiện điểm LED kỹ thuật số gắn trực diện mặt trước bàn (Front Fascia Scoreboard) - KÍCH THƯỚC VỪA VẶN, KHÔNG BỊ ĐÈ NHAU */}
      <group position={[0, 2.42, 0.44]} rotation={[-0.20, 0, 0]}>
        {/* Khung màn hình mạ vàng/xanh neon */}
        <mesh position={[0, 0, -0.01]}>
          <boxGeometry args={[0.78, 0.46, 0.03]} />
          <meshStandardMaterial
            color={isTurn ? "#fbbf24" : "#3b82f6"}
            metalness={0.92}
            roughness={0.08}
            emissive={isTurn ? "#d97706" : "#1e3a5f"}
            emissiveIntensity={isTurn ? 0.95 : 0.25}
          />
        </mesh>
        {/* Màn hình LED sắc nét chuẩn VTV3 */}
        <mesh ref={screenRef}>
          <boxGeometry args={[0.74, 0.42, 0.04]} />
          <meshStandardMaterial
            map={screenTexture ?? undefined}
            color={screenTexture ? "#ffffff" : isTurn ? "#1e3a8a" : "#1e293b"}
            emissive={isTurn ? "#f59e0b" : "#1e3a8a"}
            emissiveIntensity={0.35}
            roughness={0.15}
            metalness={0.12}
          />
        </mesh>
      </group>

      {/* 4. Chuông bấm cho vòng đoán nhanh (Toss-Up Mechanical Buzzer Bell) trên mặt bàn */}
      <group position={[0, 2.82, 0.24]}>
        {/* Chân đế chuông mạ chrome */}
        <mesh position={[0, 0.015, 0]}>
          <cylinderGeometry args={[0.055, 0.07, 0.03, 16]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.96} roughness={0.05} />
        </mesh>
        {/* Nắp chuông vòm vàng hoàng kim bóng loáng */}
        <mesh position={[0, 0.05, 0]}>
          <sphereGeometry args={[0.05, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#d97706"
            emissiveIntensity={0.65}
            metalness={0.96}
            roughness={0.05}
          />
        </mesh>
        {/* Nút bấm đỏ trên đỉnh chuông */}
        <mesh position={[0, 0.085, 0]}>
          <cylinderGeometry args={[0.014, 0.014, 0.02, 12]} />
          <meshStandardMaterial color="#ef4444" roughness={0.2} />
        </mesh>
      </group>

      {/* 5. Hình nhân 3D cách điệu (Stylized Mannequin) đứng trên bục sau bàn thi đấu */}
      <group position={[0, 2.10, -0.22]}>
        <StylizedMannequin color={team.color || "#3b82f6"} isTurn={isTurn} />
      </group>

      {/* 6. Spotlight chiếu sáng riêng khi đội đến lượt quay */}
      {isTurn && (
        <pointLight position={[0, 3.85, 0.15]} color="#fef08a" intensity={4.5} distance={3.8} decay={1.8} />
      )}
    </group>
  );
}

/** Bục thí sinh bán nguyệt nâng cao phía sau vòng quay chuẩn VTV3 (Elevated Contestant Dais Behind Wheel) */
function ElevatedContestantDaisBehindWheel({
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

  // Tính thứ hạng xếp hạng của các đội dựa trên tổng điểm
  const sortedTeamIds = useMemo(() => {
    return [...teams]
      .sort((a, b) => {
        const scoreA = (a.score || 0) + (roundScores?.[a.id] || 0);
        const scoreB = (b.score || 0) + (roundScores?.[b.id] || 0);
        return scoreB - scoreA;
      })
      .map((t) => t.id);
  }, [teams, roundScores]);

  // Phân bố góc quét đồng tâm hình tròn bán kính RADIUS_DAIS:
  // Tâm vòng quay: (0, 0). Bán kính bục: 3.35m (kê cao thoáng đãng sau vành nón 2.12m).
  // Góc theta: 0 là chính Bắc (ngay sau nón).
  // -theta: lệch trái camera (mạn 9h). MC đứng riêng tại theta ~ -34°.
  // +theta: lệch phải camera (mạn 3h).
  // Thí sinh xếp từ minAngleDeg = -12° sang phải, đảm bảo không gian rộng rãi, các bảng điểm KHÔNG HỀ BỊ ĐÈ NHAU.
  const RADIUS_DAIS = 3.35;
  const minAngleDeg = N <= 3 ? -10 : -12;
  const maxAngleDeg = N <= 3 ? 28 : Math.min(68, 28 + (N - 3) * 12);
  const angleStepDeg = N > 1 ? (maxAngleDeg - minAngleDeg) / (N - 1) : 0;

  return (
    <group>
      {/* 1. Các trạm bục kê cao và hình nhân 3D từng đội phía sau nón */}
      {teams.map((team, i) => {
        const thetaDeg = minAngleDeg + i * angleStepDeg;
        const thetaRad = THREE.MathUtils.degToRad(thetaDeg);
        // Tọa độ đồng tâm hình tròn tuyệt đối
        const posX = Math.sin(thetaRad) * RADIUS_DAIS;
        const posZ = -Math.cos(thetaRad) * RADIUS_DAIS;
        // Quay mặt hướng về tâm vòng quay (0, 0) và hướng về camera (+Z)
        const rotY = -thetaRad;

        const rScore = roundScores?.[team.id] || 0;
        const totalScore = (team.score || 0) + rScore;
        const rank = sortedTeamIds.indexOf(team.id) + 1;
        const isTurn = isTossUpRound
          ? phase === "TOSS_UP_BUZZED" && Boolean(tossUpBuzzedTeamId) && team.id === tossUpBuzzedTeamId
          : team.id === currentTurnTeamId;

        return (
          <ElevatedSlotStation
            key={team.id}
            team={team}
            roundScore={rScore}
            totalScore={totalScore}
            rank={rank}
            isTurn={isTurn}
            posX={posX}
            posZ={posZ}
            rotY={rotY}
            edition={edition}
          />
        );
      })}

      {/* 2. Cầu nối bục cong liền khối giữa các trạm liền kề (Continuous Curved Dais Bridges) */}
      {N > 1 && teams.slice(0, N - 1).map((_, i) => {
        const angle1 = minAngleDeg + i * angleStepDeg;
        const angle2 = minAngleDeg + (i + 1) * angleStepDeg;
        const midAngleDeg = (angle1 + angle2) / 2;
        const midAngleRad = THREE.MathUtils.degToRad(midAngleDeg);
        const bridgeX = Math.sin(midAngleRad) * RADIUS_DAIS;
        const bridgeZ = -Math.cos(midAngleRad) * RADIUS_DAIS;
        const bridgeRotY = -midAngleRad;

        // Bề rộng cầu nối theo dây cung hình tròn (vừa khít khoảng trống giữa các bàn 0.84m)
        const arcChordLen = 2 * RADIUS_DAIS * Math.sin(THREE.MathUtils.degToRad(angleStepDeg / 2));
        const bridgeWidth = Math.max(0.12, arcChordLen - 0.84);

        return (
          <group key={`bridge-${i}`} position={[bridgeX, -0.75, bridgeZ]} rotation={[0, bridgeRotY, 0]}>
            {/* Khối đế bục nâng cao liền mạch */}
            <mesh position={[0, 1.05, -0.17]} receiveShadow>
              <boxGeometry args={[bridgeWidth, 2.10, 1.05]} />
              <meshStandardMaterial color="#0c1e3d" metalness={0.88} roughness={0.18} />
            </mesh>
            {/* Mặt sàn đứng cầu nối cao Y = +1.35m */}
            <mesh position={[0, 2.10, -0.17]} receiveShadow>
              <boxGeometry args={[bridgeWidth, 0.04, 1.05]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.92} roughness={0.12} />
            </mesh>
            {/* Thân bàn để tay cầu nối cao Y = +1.70m */}
            <mesh position={[0, 2.45, 0.22]} receiveShadow>
              <boxGeometry args={[bridgeWidth, 0.70, 0.36]} />
              <meshStandardMaterial color="#0f2142" metalness={0.85} roughness={0.16} />
            </mesh>
            {/* Mặt bàn để tay cầu nối cao Y = +2.05m */}
            <mesh position={[0, 2.80, 0.22]} receiveShadow>
              <boxGeometry args={[bridgeWidth, 0.04, 0.40]} />
              <meshStandardMaterial color="#e2e8f0" metalness={0.94} roughness={0.08} />
            </mesh>
            {/* Dải LED viền mép bàn */}
            <mesh position={[0, 2.78, 0.42]}>
              <boxGeometry args={[bridgeWidth, 0.02, 0.02]} />
              <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={1.2} />
            </mesh>
          </group>
        );
      })}

    </group>
  );
}

/** Texture Cache cho các ô chữ và ô hộp xoay */
const studioTextureCache = new Map<string, THREE.CanvasTexture>();

function getLetterTileTexture(char: string): THREE.CanvasTexture {
  const key = `tile_${char}`;
  if (studioTextureCache.has(key)) return studioTextureCache.get(key)!;
  if (typeof document === "undefined") return new THREE.Texture() as unknown as THREE.CanvasTexture;

  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 220;
  const ctx = canvas.getContext("2d")!;

  // Nền trắng sứ bóng đẹp
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 160, 220);

  // Viền khung đen mỏng tinh tế
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 152, 212);

  // Chữ cái màu đen đậm
  ctx.fillStyle = "#0f172a";
  ctx.font = '900 130px "Roboto Slab", "Merriweather", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(char, 80, 115);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  studioTextureCache.set(key, texture);
  return texture;
}

function getClosedTileTexture(): THREE.CanvasTexture {
  const key = "tile_closed";
  if (studioTextureCache.has(key)) return studioTextureCache.get(key)!;
  if (typeof document === "undefined") return new THREE.Texture() as unknown as THREE.CanvasTexture;

  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 220;
  const ctx = canvas.getContext("2d")!;

  // Nền xanh ngọc bích truyền hình VTV3
  ctx.fillStyle = "#15803d";
  ctx.fillRect(0, 0, 160, 220);

  // Viền vàng kim
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 152, 212);

  // Ngôi sao vàng 4 cánh ở tâm
  ctx.fillStyle = "#fde047";
  ctx.beginPath();
  const cx = 80, cy = 110, rOuter = 30, rInner = 10;
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4 - Math.PI / 2;
    const r = i % 2 === 0 ? rOuter : rInner;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  studioTextureCache.set(key, texture);
  return texture;
}

function getBlankWhiteTileTexture(): THREE.CanvasTexture {
  const key = "tile_blank_white";
  if (studioTextureCache.has(key)) return studioTextureCache.get(key)!;
  if (typeof document === "undefined") return new THREE.Texture() as unknown as THREE.CanvasTexture;

  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 220;
  const ctx = canvas.getContext("2d")!;

  // Nền trắng sứ bóng đẹp sẵn sàng cho câu đố VTV3
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 160, 220);

  // Viền vàng kim tinh tế
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 154, 214);
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 6, 148, 208);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  studioTextureCache.set(key, texture);
  return texture;
}

function getHighlightTileTexture(): THREE.CanvasTexture {
  const key = "tile_highlight_green";
  if (studioTextureCache.has(key)) return studioTextureCache.get(key)!;
  if (typeof document === "undefined") return new THREE.Texture() as unknown as THREE.CanvasTexture;

  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 220;
  const ctx = canvas.getContext("2d")!;

  // Nền xanh lá cây phát sáng rực rỡ (Highlight VTV3 khi đoán trúng)
  const grad = ctx.createRadialGradient(80, 110, 10, 80, 110, 100);
  grad.addColorStop(0, "#4ade80");
  grad.addColorStop(0.6, "#16a34a");
  grad.addColorStop(1, "#14532d");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 160, 220);

  // Viền vàng neon phát sáng rực rỡ
  ctx.strokeStyle = "#fef08a";
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 152, 212);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  studioTextureCache.set(key, texture);
  return texture;
}

function getSpinningCubeTexture(text: string, bgColor: string, textColor = "#ffffff"): THREE.CanvasTexture {
  const key = `cube_${text}_${bgColor}`;
  if (studioTextureCache.has(key)) return studioTextureCache.get(key)!;
  if (typeof document === "undefined") return new THREE.Texture() as unknown as THREE.CanvasTexture;

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  const grad = ctx.createLinearGradient(0, 0, 256, 256);
  grad.addColorStop(0, bgColor);
  grad.addColorStop(1, "#020617");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 246, 246);

  ctx.fillStyle = textColor;
  ctx.font = text.length > 5 ? '900 40px "Roboto Slab", sans-serif' : text.length > 3 ? '900 64px "Roboto Slab", sans-serif' : '900 120px "Roboto Slab", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  studioTextureCache.set(key, texture);
  return texture;
}

interface FormattedTile {
  char: string;
  isLetter: boolean;
  origIdx: number;
}

function formatPhraseTo4x14(phrase?: string): FormattedTile[][] {
  const grid: FormattedTile[][] = Array.from({ length: 4 }, () =>
    Array.from({ length: 14 }, () => ({ char: "", isLetter: false, origIdx: -1 }))
  );
  if (!phrase) return grid;

  const words = phrase.toUpperCase().split(" ");
  const rows: FormattedTile[][] = [];
  let currentRow: FormattedTile[] = [];
  let currentLen = 0;
  let charIdx = 0;

  words.forEach((word) => {
    const wordChars: FormattedTile[] = word.split("").map((c) => ({
      char: c,
      isLetter: /[A-ZÀ-Ỹ]/i.test(c),
      origIdx: charIdx++,
    }));
    charIdx++; // include space index

    if (currentLen + (currentLen > 0 ? 1 : 0) + wordChars.length <= 14) {
      if (currentLen > 0) {
        currentRow.push({ char: " ", isLetter: false, origIdx: -1 });
        currentLen++;
      }
      currentRow.push(...wordChars);
      currentLen += wordChars.length;
    } else {
      if (currentRow.length > 0) rows.push(currentRow);
      currentRow = [...wordChars];
      currentLen = wordChars.length;
    }
  });
  if (currentRow.length > 0) rows.push(currentRow);

  const startRow = Math.max(0, Math.floor((4 - rows.length) / 2));
  rows.slice(0, 4).forEach((rowChars, r) => {
    const targetRow = startRow + r;
    if (targetRow >= 4) return;
    const startCol = Math.max(0, Math.floor((14 - rowChars.length) / 2));
    rowChars.forEach((ch, c) => {
      const targetCol = startCol + c;
      if (targetCol < 14) {
        grid[targetRow][targetCol] = ch;
      }
    });
  });

  return grid;
}

/** Dải đường line trắng phát sáng đặc trưng VTV3 uốn cong từ lối vào MC vòng qua nón đến bảng ô chữ */
function WhiteRunwayTrack() {
  const curvePoints = useMemo(() => {
    return [
      new THREE.Vector3(-1.75, 0.08, -2.85), // Khu vực MC
      new THREE.Vector3(-2.20, 0.08, -1.20),
      new THREE.Vector3(-2.60, 0.08, 0.80),
      new THREE.Vector3(-1.40, 0.08, 2.80),
      new THREE.Vector3(0.00, 0.08, 3.20),   // Trước mặt cỗ máy nón quay
      new THREE.Vector3(1.80, 0.08, 2.60),
      new THREE.Vector3(2.80, 0.08, 0.80),
      new THREE.Vector3(2.20, 0.08, -1.20),  // Cánh phải
      new THREE.Vector3(0.00, 0.08, 3.20),   // Vòng qua trước nón
      new THREE.Vector3(-3.40, 0.08, 1.60),
      new THREE.Vector3(-5.80, 0.08, -0.60), // Chân Bảng Ô Chữ 3D bên cánh trái
    ];
  }, []);

  const lineGeometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(curvePoints);
    return new THREE.TubeGeometry(curve, 96, 0.055, 8, false);
  }, [curvePoints]);

  return (
    <mesh geometry={lineGeometry}>
      <meshStandardMaterial
        color="#ffffff"
        emissive="#ffffff"
        emissiveIntensity={3.2}
        roughness={0.1}
      />
    </mesh>
  );
}

/** Ô chữ 3D độc lập với cơ chế lật xoay 180 độ (Trilon Flip), sẵn ô trắng và highlight xanh chuẩn VTV3 */
function Studio3DPuzzleTile({
  tile,
  isRevealed,
  isHighlighted,
  posX,
  posY,
}: {
  tile: FormattedTile;
  isRevealed: boolean;
  isHighlighted: boolean;
  posX: number;
  posY: number;
}) {
  const meshRef = useRef<THREE.Group>(null);
  const targetRotY = isRevealed ? Math.PI : 0;

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotY, delta * 4.5);
  });

  if (!tile.isLetter) {
    const closedTex = getClosedTileTexture();
    return (
      <mesh position={[posX, posY, 0]}>
        <boxGeometry args={[0.32, 0.44, 0.04]} />
        <meshStandardMaterial attach="material-0" color="#166534" roughness={0.5} />
        <meshStandardMaterial attach="material-1" color="#166534" roughness={0.5} />
        <meshStandardMaterial attach="material-2" color="#166534" roughness={0.5} />
        <meshStandardMaterial attach="material-3" color="#166534" roughness={0.5} />
        <meshStandardMaterial attach="material-4" map={closedTex} />
        <meshStandardMaterial attach="material-5" map={closedTex} />
      </mesh>
    );
  }

  // Khi chưa mở: sẵn nền trắng; khi có chữ đoán trúng: chớp sáng highlight xanh; khi mở: lật 180° thành chữ đen
  const frontTex = isHighlighted ? getHighlightTileTexture() : getBlankWhiteTileTexture();
  const backTex = getLetterTileTexture(tile.char);

  return (
    <group ref={meshRef} position={[posX, posY, 0]}>
      <mesh>
        <boxGeometry args={[0.32, 0.44, 0.04]} />
        <meshStandardMaterial attach="material-0" color="#fbbf24" metalness={0.8} roughness={0.2} />
        <meshStandardMaterial attach="material-1" color="#fbbf24" metalness={0.8} roughness={0.2} />
        <meshStandardMaterial attach="material-2" color="#fbbf24" metalness={0.8} roughness={0.2} />
        <meshStandardMaterial attach="material-3" color="#fbbf24" metalness={0.8} roughness={0.2} />
        <meshStandardMaterial
          attach="material-4"
          map={frontTex}
          emissive={isHighlighted ? "#16a34a" : "#000000"}
          emissiveIntensity={isHighlighted ? 1.5 : 0}
        />
        <meshStandardMaterial attach="material-5" map={backTex} />
      </mesh>
    </group>
  );
}

/** Người mẫu trợ lý lật ô chữ (Photorealistic Hostess Cutout Billboard chuẩn sắc nét như bản 2D) */
function StylizedHostess({ isRevealing }: { isRevealing: boolean }) {
  const meshRef = useRef<THREE.Group>(null);
  const texture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const loader = new THREE.TextureLoader();
    const tex = loader.load("/images/magic-wheel/hostess_fullbody.png");
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    return tex;
  }, []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    // Nhịp thở mềm mại và nhô nhẹ khi có mở chữ
    const breatheY = Math.sin(t * 1.6) * 0.012;
    const gestureScale = isRevealing ? 1.025 : 1.0;
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, 1.275 + breatheY, delta * 3.0);
    meshRef.current.scale.lerp(new THREE.Vector3(gestureScale, gestureScale, gestureScale), delta * 4.0);
  });

  return (
    <group position={[-2.85, 0.41, 0.40]}>
      {/* Vệt bóng đổ gót chân mềm mại trên sàn bục */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[0.75, 0.35]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.65} />
      </mesh>

      {/* Tấm billboard Người mẫu ảnh chụp thực tế sắc nét, tỉ lệ chuẩn 508x1090 */}
      <group ref={meshRef} position={[0, 1.275, 0]} rotation={[0, 0.12, 0]}>
        {texture && (
          <mesh castShadow>
            {/* Tỉ lệ chuẩn xác 508x1090: Cao 2.55m x Rộng 1.188m (không bị dẹt hay giãn ngang) */}
            <planeGeometry args={[1.188, 2.55]} />
            <meshStandardMaterial
              map={texture}
              transparent
              alphaTest={0.08}
              roughness={0.4}
              metalness={0.1}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}
      </group>
    </group>
  );
}

/** Bảng Ô Chữ 3D đặt tại Cánh Trái sân khấu ở cự ly chiều sâu Z ~ -1.0m với tường kiến trúc nan kim loại & ánh sáng sống động */
function Studio3DPuzzleBoard({
  currentPuzzle,
  phase,
  highlightedIndices,
  animRevealedIndices,
}: {
  currentPuzzle?: {
    category: string;
    description?: string;
    secretPhrase: string;
    revealedIndices: number[];
  } | null;
  phase?: string;
  highlightedIndices?: Set<number>;
  animRevealedIndices?: Set<number>;
}) {
  const grid = useMemo(() => {
    return formatPhraseTo4x14(currentPuzzle?.secretPhrase);
  }, [currentPuzzle?.secretPhrase]);

  const revealedSet = useMemo(() => {
    if (animRevealedIndices && animRevealedIndices.size > 0) return animRevealedIndices;
    return new Set(currentPuzzle?.revealedIndices || []);
  }, [animRevealedIndices, currentPuzzle?.revealedIndices]);

  const isRevealing = phase === "ROUND_RECAP" || (revealedSet.size > 0);

  return (
    <group position={[-6.8, -0.75, -1.0]} rotation={[0, 0.48, 0]}>
      {/* ── Tường Kiến Trúc Hậu Cảnh Bảng Ô Chữ: Dàn nan kim loại & Đèn hắt stage wash sống động ── */}
      <group position={[0, 2.2, -0.3]}>
        {/* Vách tường đen ngọc bích broadcast */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[7.4, 4.8, 0.1]} />
          <meshStandardMaterial color="#051f11" roughness={0.6} metalness={0.4} />
        </mesh>
        {/* 18 nan cột dọc kim loại mạ vàng sang trọng */}
        {Array.from({ length: 18 }).map((_, i) => {
          const fx = -3.3 + i * 0.388;
          return (
            <mesh key={`arch-fin-${i}`} position={[fx, 0, 0.07]}>
              <boxGeometry args={[0.045, 4.4, 0.06]} />
              <meshStandardMaterial color="#fef08a" metalness={0.9} roughness={0.15} />
            </mesh>
          );
        })}
        {/* Đèn hắt trần Amber Cove Light */}
        <mesh position={[0, 2.3, 0.12]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.035, 0.035, 7.2, 16]} />
          <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={2.5} />
        </mesh>
        {/* Đèn hắt chân tường Emerald Cove Light */}
        <mesh position={[0, -2.1, 0.12]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.035, 0.035, 7.2, 16]} />
          <meshStandardMaterial color="#4ade80" emissive="#10b981" emissiveIntensity={2.2} />
        </mesh>
      </group>

      {/* 1. Bục nâng sân khấu cho Bảng Ô Chữ 3D */}
      <mesh position={[0, 0.20, 0]} receiveShadow>
        <boxGeometry args={[7.2, 0.40, 2.8]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.92} roughness={0.12} />
      </mesh>
      {/* Vành viền LED vàng trên bục */}
      <mesh position={[0, 0.41, 0]}>
        <boxGeometry args={[7.24, 0.02, 2.84]} />
        <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={1.8} />
      </mesh>

      {/* 2. Cột trụ Art-Deco mạ bạc hai bên bảng */}
      {[-3.0, 3.0].map((px, i) => (
        <group key={`col-${i}`} position={[px, 2.2, 0]}>
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.18, 0.22, 3.8, 24]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.08} />
          </mesh>
          <mesh position={[0, 1.95, 0]}>
            <boxGeometry args={[0.5, 0.15, 0.5]} />
            <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={1.5} />
          </mesh>
        </group>
      ))}

      {/* Thanh vòm trên (Header Bar) */}
      <mesh position={[0, 4.15, 0]}>
        <boxGeometry args={[6.4, 0.45, 0.25]} />
        <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Dải LED phát sáng trên vòm */}
      <mesh position={[0, 4.15, 0.13]}>
        <boxGeometry args={[6.1, 0.04, 0.02]} />
        <meshStandardMaterial color="#fde047" emissive="#f59e0b" emissiveIntensity={2.5} />
      </mesh>

      {/* 3. Khung bảng Video Wall (5.3m x 2.3m) */}
      <mesh position={[0, 2.20, 0]}>
        <boxGeometry args={[5.3, 2.3, 0.08]} />
        <meshStandardMaterial color="#052e16" roughness={0.4} />
      </mesh>

      {/* 4. Ma trận 4x14 ô chữ 3D độc lập lật xoay */}
      <group position={[0, 0, 0.05]}>
        {grid.map((row, r) => {
          const posY = 2.2 + (1.5 - r) * 0.50;
          return row.map((tile, c) => {
            const posX = (c - 6.5) * 0.36;
            const isRevealed = tile.isLetter && (revealedSet.has(tile.origIdx) || phase === "ROUND_RECAP");
            const isHighlighted = Boolean(tile.isLetter && highlightedIndices && highlightedIndices.has(tile.origIdx));
            return (
              <Studio3DPuzzleTile
                key={`tile-${r}-${c}`}
                tile={tile}
                isRevealed={isRevealed}
                isHighlighted={isHighlighted}
                posX={posX}
                posY={posY}
              />
            );
          });
        })}
      </group>

      {/* 5. Người mẫu trợ lý lật ô chữ (Stylized Hostess in evening gown) */}
      <StylizedHostess isRevealing={isRevealing} />
    </group>
  );
}

const CUBES_DATA = [
  { text: "C", color: "#06b6d4", emissive: "#0891b2", pos: [-4.6, 5.8, -0.3], scale: 0.95, rotSpeed: [0.8, 1.2, 0.5] },
  { text: "N", color: "#eab308", emissive: "#ca8a04", pos: [-3.2, 4.2, 0.2], scale: 0.98, rotSpeed: [1.1, 0.7, 0.9] },
  { text: "K", color: "#10b981", emissive: "#059669", pos: [-1.8, 6.2, -0.2], scale: 0.92, rotSpeed: [0.6, 1.4, 0.4] },
  { text: "D", color: "#f43f5e", emissive: "#e11d48", pos: [-0.4, 4.4, 0.4], scale: 1.02, rotSpeed: [0.9, 0.8, 1.2] },
  { text: "VTV3", color: "#dc2626", emissive: "#b91c1c", pos: [1.4, 6.0, -0.3], scale: 1.05, rotSpeed: [0.7, 1.0, 0.8] },
  { text: "600", color: "#ef4444", emissive: "#dc2626", pos: [2.8, 4.3, 0.3], scale: 0.95, rotSpeed: [1.2, 0.6, 1.0] },
  { text: "900", color: "#059669", emissive: "#047857", pos: [4.2, 5.9, -0.2], scale: 0.98, rotSpeed: [0.5, 1.3, 0.7] },
  { text: "800", color: "#2563eb", emissive: "#1d4ed8", pos: [4.8, 4.6, 0.1], scale: 0.92, rotSpeed: [1.0, 0.9, 0.6] },
  { text: "500", color: "#f59e0b", emissive: "#d97706", pos: [-4.2, 3.2, 0.4], scale: 0.90, rotSpeed: [0.7, 1.1, 0.8] },
  { text: "1000", color: "#8b5cf6", emissive: "#7c3aed", pos: [-2.4, 2.8, -0.1], scale: 0.95, rotSpeed: [1.3, 0.5, 1.1] },
  { text: "MAY MẮN", color: "#fbbf24", emissive: "#f59e0b", pos: [0.2, 3.0, 0.3], scale: 1.02, rotSpeed: [0.8, 1.2, 0.6] },
  { text: "PHẦN THƯỞNG", color: "#ec4899", emissive: "#db2777", pos: [2.4, 2.9, -0.2], scale: 0.96, rotSpeed: [0.9, 0.7, 1.3] },
  { text: "A", color: "#ea580c", emissive: "#c2410c", pos: [4.4, 3.1, 0.4], scale: 0.88, rotSpeed: [1.1, 1.0, 0.5] },
  { text: "O", color: "#0284c7", emissive: "#0369a1", pos: [-5.0, 4.6, 0.1], scale: 0.90, rotSpeed: [0.6, 1.4, 0.9] },
  { text: "QUIZ", color: "#14b8a6", emissive: "#0d9488", pos: [-0.2, 7.0, -0.3], scale: 1.02, rotSpeed: [1.0, 0.8, 1.1] },
  { text: "TIMEOUT", color: "#6366f1", emissive: "#4f46e5", pos: [3.2, 7.1, -0.1], scale: 1.00, rotSpeed: [0.8, 1.1, 0.7] },
];

/** Màn hình LED hậu trường Cổng Vòm Vàng VTV3 2016 lùi sâu Z=-8.5m cao 7.8m & 16 khối ô chữ 3D xoay lơ lửng */
function BackdropLedScreenWithSpinningCubes() {
  const cubeMeshRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    cubeMeshRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const d = CUBES_DATA[i];
      mesh.rotation.x += delta * d.rotSpeed[0];
      mesh.rotation.y += delta * d.rotSpeed[1];
      mesh.rotation.z += delta * d.rotSpeed[2];
      mesh.position.y = d.pos[1] + Math.sin(t * 1.4 + i * 0.7) * 0.14;
    });
  });

  return (
    <group position={[0, -0.75, -8.5]}>
      {/* 1. Cổng vòm vàng hoàng gia bo cong mềm mại (VTV3 Stadium Arch Y=7.8m, W=13.6m) */}
      <group position={[0, 0, 0]}>
        {/* Cột đứng bên trái */}
        <mesh position={[-5.8, 3.4, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 6.8, 24]} />
          <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={1.4} metalness={0.92} roughness={0.15} />
        </mesh>
        {/* Cột đứng bên phải */}
        <mesh position={[5.8, 3.4, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 6.8, 24]} />
          <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={1.4} metalness={0.92} roughness={0.15} />
        </mesh>
        {/* Xà ngang đỉnh vòm cao 7.8m */}
        <mesh position={[0, 7.8, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.22, 0.22, 7.6, 24]} />
          <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={1.4} metalness={0.92} roughness={0.15} />
        </mesh>
        {/* Cung bo cong góc trên bên trái */}
        <mesh position={[-3.8, 5.8, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[2.0, 0.22, 16, 24, Math.PI / 2]} />
          <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={1.4} metalness={0.92} roughness={0.15} />
        </mesh>
        {/* Cung bo cong góc trên bên phải */}
        <mesh position={[3.8, 5.8, 0]} rotation={[0, 0, 0]}>
          <torusGeometry args={[2.0, 0.22, 16, 24, Math.PI / 2]} />
          <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={1.4} metalness={0.92} roughness={0.15} />
        </mesh>

        {/* Dải đèn neon vàng phát sáng rực rỡ chạy dọc viền cổng vòm */}
        <mesh position={[-5.8, 3.4, 0.08]}>
          <cylinderGeometry args={[0.07, 0.07, 6.8, 16]} />
          <meshStandardMaterial color="#fef08a" emissive="#fde047" emissiveIntensity={2.8} />
        </mesh>
        <mesh position={[5.8, 3.4, 0.08]}>
          <cylinderGeometry args={[0.07, 0.07, 6.8, 16]} />
          <meshStandardMaterial color="#fef08a" emissive="#fde047" emissiveIntensity={2.8} />
        </mesh>
        <mesh position={[0, 7.8, 0.08]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.07, 0.07, 7.6, 16]} />
          <meshStandardMaterial color="#fef08a" emissive="#fde047" emissiveIntensity={2.8} />
        </mesh>
        <mesh position={[-3.8, 5.8, 0.08]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[2.0, 0.07, 16, 24, Math.PI / 2]} />
          <meshStandardMaterial color="#fef08a" emissive="#fde047" emissiveIntensity={2.8} />
        </mesh>
        <mesh position={[3.8, 5.8, 0.08]} rotation={[0, 0, 0]}>
          <torusGeometry args={[2.0, 0.07, 16, 24, Math.PI / 2]} />
          <meshStandardMaterial color="#fef08a" emissive="#fde047" emissiveIntensity={2.8} />
        </mesh>
      </group>

      {/* 2. Màn hình LED hậu trường nền đen sâu thẳm điểm xuyết ánh sáng sapphire */}
      <mesh position={[0, 4.3, -0.2]}>
        <planeGeometry args={[14.8, 8.8]} />
        <meshStandardMaterial
          color="#020617"
          emissive="#061838"
          emissiveIntensity={0.65}
          roughness={0.4}
          metalness={0.3}
        />
      </mesh>

      {/* 3. Dàn 16 khối ô chữ 3D to bản xoay lơ lửng phân tầng từ 2.8m đến 7.2m */}
      {CUBES_DATA.map((c, i) => {
        const tex = getSpinningCubeTexture(c.text, c.color);
        return (
          <mesh
            key={`cube-spin-${i}`}
            ref={(el) => {
              cubeMeshRefs.current[i] = el;
            }}
            position={[c.pos[0], c.pos[1], c.pos[2]]}
            scale={c.scale}
            castShadow
          >
            <boxGeometry args={[0.85, 0.85, 0.85]} />
            <meshStandardMaterial map={tex} emissive={c.emissive} emissiveIntensity={0.85} roughness={0.2} metalness={0.2} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Cụm hoa văn đĩa nan hoa chữ 'CHIẾC NÓN KỲ DIỆU' và cánh vòm tối hai bên cánh gà chuẩn VTV3 2016 */
function StudioSetWingMotifs() {
  const LEFT_LETTERS = ["C", "H", "I", "E", "C", "N", "O", "N", "600", "500", "800", "VTV3", "★", "★", "★", "★"];
  const RIGHT_LETTERS = ["K", "Y", "D", "I", "E", "U", "V", "T", "V", "3", "900", "1000", "MAY MẮN", "★", "★", "★"];

  const renderDecorativeWheel = (x: number, z: number, rotY: number, letters: string[]) => (
    <group position={[x, 4.2, z]} rotation={[0, rotY, 0]}>
      {/* 1. Đĩa tròn nền đen bóng kim loại */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2.55, 2.55, 0.08, 36]} />
        <meshStandardMaterial color="#0b0f19" metalness={0.9} roughness={0.15} />
      </mesh>
      {/* Tâm đĩa mạ vàng sang trọng */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.06]}>
        <cylinderGeometry args={[0.55, 0.55, 0.12, 32]} />
        <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={1.5} metalness={0.92} />
      </mesh>
      {/* Vành tròn ngoài viền vàng neon */}
      <mesh position={[0, 0, 0.05]}>
        <torusGeometry args={[2.55, 0.07, 16, 48]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={2.0} />
      </mesh>

      {/* 16 nan hoa hướng tâm gắn chữ cái & số điểm phát sáng */}
      {letters.map((char, i) => {
        const a = (i * Math.PI * 2) / 16;
        const rSpoke = 1.60;
        const px = Math.sin(a) * rSpoke;
        const py = Math.cos(a) * rSpoke;
        const isGold = i % 2 === 0;

        return (
          <group key={`spoke-${i}`} position={[px, py, 0.06]} rotation={[0, 0, -a]}>
            {/* Thanh nan hoa */}
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[0.04, 1.8, 0.02]} />
              <meshStandardMaterial color="#475569" metalness={0.8} />
            </mesh>
            {/* Phiến thẻ chữ / điểm nổi bật */}
            <mesh position={[0, 0, 0.03]} rotation={[0, 0, a]}>
              <boxGeometry args={[0.34, 0.34, 0.03]} />
              <meshStandardMaterial
                color={isGold ? "#fde047" : "#38bdf8"}
                emissive={isGold ? "#f59e0b" : "#0284c7"}
                emissiveIntensity={1.6}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );

  return (
    <group>
      {/* Cặp đĩa nan hoa chữ hai bên hông vòm màn hình */}
      {renderDecorativeWheel(-7.4, -8.2, 0.28, LEFT_LETTERS)}
      {renderDecorativeWheel(7.4, -8.2, -0.28, RIGHT_LETTERS)}

      {/* Cặp cánh vòm tối bo cong (Dark Arched Wings) ôm hai bên tạo chiều sâu thị giác đa lớp */}
      {[-9.4, 9.4].map((wx, idx) => (
        <group key={`dark-wing-${idx}`} position={[wx, 3.8, -7.8]} rotation={[0, idx === 0 ? 0.35 : -0.35, 0]}>
          <mesh>
            <boxGeometry args={[1.6, 7.8, 0.15]} />
            <meshStandardMaterial color="#030712" metalness={0.85} roughness={0.25} />
          </mesh>
          {/* Dải viền LED vàng trên mép cánh vòm */}
          <mesh position={[idx === 0 ? 0.8 : -0.8, 0, 0.1]}>
            <cylinderGeometry args={[0.04, 0.04, 7.8, 16]} />
            <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={2.0} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Khán đài khán giả hình cánh cung đa tầng (Audience Amphitheater) đặt tại Z = +10.0m đến +14.0m */
function AudienceAmphitheater() {
  const TIERS = [
    { r: 9.8, h: 0.35, seats: 12 },
    { r: 11.0, h: 0.70, seats: 14 },
    { r: 12.2, h: 1.05, seats: 16 },
    { r: 13.4, h: 1.40, seats: 18 },
  ];

  return (
    <group position={[0, -0.75, 0]}>
      {TIERS.map((tier, tIdx) => {
        const startAngle = Math.PI * 0.28;
        const endAngle = Math.PI * 0.72;
        const angleSpan = endAngle - startAngle;

        return (
          <group key={`tier-${tIdx}`}>
            <mesh position={[0, tier.h / 2, 0]} receiveShadow>
              <cylinderGeometry
                args={[tier.r + 0.6, tier.r + 0.6, tier.h, 48, 1, true, startAngle, angleSpan]}
              />
              <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.5} side={THREE.DoubleSide} />
            </mesh>

            {Array.from({ length: tier.seats }).map((_, sIdx) => {
              const a = startAngle + (sIdx + 0.5) * (angleSpan / tier.seats);
              const sx = Math.cos(a) * tier.r;
              const sz = Math.sin(a) * tier.r;
              const isRed = (sIdx + tIdx) % 2 === 0;

              return (
                <group key={`seat-${tIdx}-${sIdx}`} position={[sx, tier.h, sz]} rotation={[0, -a + Math.PI / 2, 0]}>
                  <mesh position={[0, 0.22, 0]}>
                    <boxGeometry args={[0.42, 0.38, 0.36]} />
                    <meshStandardMaterial color={isRed ? "#991b1b" : "#1e3a8a"} roughness={0.3} />
                  </mesh>
                  <mesh position={[0, 0.55, -0.04]}>
                    <cylinderGeometry args={[0.10, 0.14, 0.35, 12]} />
                    <meshStandardMaterial color={sIdx % 3 === 0 ? "#cbd5e1" : "#0f172a"} roughness={0.5} />
                  </mesh>
                  <mesh position={[0, 0.80, -0.04]}>
                    <sphereGeometry args={[0.075, 12, 12]} />
                    <meshStandardMaterial color="#fde68a" roughness={0.4} />
                  </mesh>
                </group>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

/** Camera Controller — điều khiển chuyển góc mượt mà kiểu camera jib truyền hình thực tế */
function CameraController({
  camAngle,
  effectiveIsSpinning,
}: {
  camAngle: number;
  effectiveIsSpinning: boolean;
}) {
  const { camera } = useThree();
  const targetConfig = useRef<CamConfig>(CAM_POSITIONS.DEFAULT);
  const targetLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.15, -0.30));
  const initialized = useRef(false);

  useEffect(() => {
    const configs: Record<number, CamConfig> = {
      0: CAM_POSITIONS.DEFAULT,
      1: CAM_POSITIONS.CAM1_CENTER,
      2: CAM_POSITIONS.CAM2_WIDE,
      3: CAM_POSITIONS.CAM3_BOARD,
      4: CAM_POSITIONS.CAM4_DISC,
      5: CAM_POSITIONS.CAM5_PLAYER,
      6: CAM_POSITIONS.CAM6_AUDIENCE,
    };
    targetConfig.current = configs[camAngle] ?? CAM_POSITIONS.DEFAULT;
  }, [camAngle, effectiveIsSpinning]);

  useFrame((_, delta) => {
    const cfg = targetConfig.current;
    if (!initialized.current) {
      camera.position.set(...cfg.pos);
      targetLookAtRef.current.set(...cfg.target);
      camera.lookAt(targetLookAtRef.current);
      initialized.current = true;
      return;
    }

    // Chuyển góc quay lướt mượt mà như trục cẩu jib trường quay (không bị khựng hay nháy)
    const factor = Math.min(1, delta * 3.8);
    camera.position.lerp(new THREE.Vector3(...cfg.pos), factor);
    targetLookAtRef.current.lerp(new THREE.Vector3(...cfg.target), factor);
    camera.lookAt(targetLookAtRef.current);
  });

  return null;
}

/** Giàn đèn trần trường quay TV (Ceiling Studio Lighting Truss & Softboxes) */
function StudioCeilingRig() {
  return (
    <group position={[0, 9.5, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[8.2, 0.12, 16, 64]} />
        <meshStandardMaterial color="#64748b" metalness={0.92} roughness={0.15} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[5.4, 0.1, 16, 48]} />
        <meshStandardMaterial color="#64748b" metalness={0.92} roughness={0.15} />
      </mesh>

      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i * Math.PI * 2) / 8;
        const rx = Math.sin(angle) * 6.8;
        const rz = -Math.cos(angle) * 6.8;
        return (
          <group key={`softbox-${i}`} position={[rx, 0, rz]} rotation={[0, -angle, 0]}>
            <mesh position={[0, 0.15, 0]}>
              <boxGeometry args={[1.9, 0.25, 0.95]} />
              <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <planeGeometry args={[1.8, 0.85]} />
              <meshBasicMaterial color="#f0f9ff" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** Sân khấu trường quay TV cao cấp: Sàn Bạc Ánh Kim Metallic (Silver-Platinum Mirror Floor) */
function StudioFloor() {
  return (
    <group position={[0, -0.75, 0]}>
      {/* 1. Sàn trường quay mở rộng toàn cảnh - Tone xám bạc công nghệ cao không bị tối đen */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[70, 70]} />
        <meshStandardMaterial
          color="#64748b"
          emissive="#334155"
          emissiveIntensity={0.25}
          roughness={0.18}
          metalness={0.5}
        />
      </mesh>

      {/* Lưới kẻ kính sàn trường quay TV phản quang */}
      {[-21, -18, -15, -12, -9, -6, -3, 0, 3, 6, 9, 12, 15, 18, 21].map((x) => (
        <mesh key={`grid-x-${x}`} position={[x, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.03, 50]} />
          <meshStandardMaterial color="#94a3b8" emissive="#cbd5e1" emissiveIntensity={0.8} />
        </mesh>
      ))}
      {[-21, -18, -15, -12, -9, -6, -3, 0, 3, 6, 9, 12, 15, 18, 21].map((z) => (
        <mesh key={`grid-z-${z}`} position={[0, 0.005, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[50, 0.03]} />
          <meshStandardMaterial color="#94a3b8" emissive="#cbd5e1" emissiveIntensity={0.8} />
        </mesh>
      ))}

      {/* 2. Vành bậc sân khấu ngoài (Outer Stage Apron Deck R = 12.0m) */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[12.0, 12.05, 0.04, 64]} />
        <meshStandardMaterial
          color="#94a3b8"
          emissive="#475569"
          emissiveIntensity={0.2}
          roughness={0.12}
          metalness={0.7}
        />
      </mesh>

      {/* Vành LED biên ngoài sàn trường quay R = 11.9m */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.042, 0]}>
        <ringGeometry args={[11.80, 11.92, 64]} />
        <meshStandardMaterial
          color="#fde047"
          emissive="#f59e0b"
          emissiveIntensity={2.5}
          roughness={0.06}
          metalness={0.92}
        />
      </mesh>

      {/* 3. Sân khấu chính hình tròn nổi (Raised Circular Stage Deck R = 10.0m) */}
      <mesh position={[0, 0.045, 0]} receiveShadow>
        <cylinderGeometry args={[10.0, 10.05, 0.05, 64]} />
        <meshStandardMaterial
          color="#cbd5e1"
          roughness={0.10}
          metalness={0.85}
        />
      </mesh>

      {/* Mặt sàn kính bạc ánh kim phản chiếu gương chuẩn truyền hình TV (True Silver Mirror Stage Floor) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.071, 0]} receiveShadow>
        <circleGeometry args={[9.95, 64]} />
        <MeshReflectorMaterial
          blur={[30, 15]}
          resolution={1024}
          mirror={0.65}
          mixBlur={0.15}
          mixStrength={2.6}
          roughness={0.06}
          depthScale={0}
          minDepthThreshold={0}
          maxDepthThreshold={60}
          color="#f8fafc"
          metalness={0.88}
        />
      </mesh>

      {/* Dải đường line trắng phát sáng đặc trưng VTV3 */}
      <WhiteRunwayTrack />

      {/* Vành viền Chrome bảo vệ quanh mép sàn khấu */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.073, 0]}>
        <ringGeometry args={[9.92, 10.02, 64]} />
        <meshStandardMaterial color="#f8fafc" metalness={0.98} roughness={0.03} />
      </mesh>

      {/* Vòng spotlight sân khấu hoàng kim ôm sát chân cỗ máy nón */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.074, 0]}>
        <ringGeometry args={[2.62, 2.76, 64]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#f59e0b"
          emissiveIntensity={2.5}
          roughness={0.06}
          metalness={0.94}
        />
      </mesh>

      {/* Soft Center Stage Glow Disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0735, 0]}>
        <circleGeometry args={[2.60, 48]} />
        <meshStandardMaterial
          color="#e2e8f0"
          emissive="#cbd5e1"
          emissiveIntensity={0.8}
          roughness={0.06}
          metalness={0.4}
        />
      </mesh>
    </group>
  );
}

/** Phông nền vòm trường quay TV cong panorama (Curved Studio Cyc Backdrop) */
function StudioBackdrop() {
  return (
    <group position={[0, 4.0, 0]}>
      <mesh rotation={[0, -Math.PI / 2, 0]}>
        <cylinderGeometry args={[26, 26, 22, 64, 1, true, -Math.PI * 0.65, Math.PI * 1.3]} />
        <meshStandardMaterial
          color="#1e40af"
          roughness={0.3}
          metalness={0.2}
          side={THREE.BackSide}
        />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 10.5, -18]}>
        <ringGeometry args={[25.7, 26.0, 64]} />
        <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={2.2} side={THREE.DoubleSide} />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -3.8, -18]}>
        <ringGeometry args={[25.7, 26.0, 64]} />
        <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={2.4} side={THREE.DoubleSide} />
      </mesh>

      {[-16, -12, -8, -4, 0, 4, 8, 12, 16].map((x, i) => (
        <pointLight
          key={`cyc-light-${i}`}
          position={[x, 3.5, -16]}
          color={i % 2 === 0 ? "#38bdf8" : "#fbbf24"}
          intensity={11.0}
          distance={26.0}
        />
      ))}
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
  currentPuzzle,
  highlightedIndices,
  animRevealedIndices,
  onCamAngleChange,
}: WheelStudio3DSceneProps) {
  const [internalCam, setInternalCam] = useState<number>(camAngle || 0);

  // Sync camAngle from props
  useEffect(() => {
    setInternalCam(camAngle || 0);
  }, [camAngle]);

  // Smart Auto-Director: Khi đang quay nón chuyển sang CAM 4; khi mở chữ / highlight sang CAM 3
  useEffect(() => {
    if (effectiveIsSpinning) {
      setInternalCam(4);
    }
  }, [effectiveIsSpinning]);

  useEffect(() => {
    if (highlightedIndices && highlightedIndices.size > 0) {
      setInternalCam(3);
    }
  }, [highlightedIndices]);

  // Keyboard shortcut listener (keys 1 - 6)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 6) {
        setInternalCam(num);
        onCamAngleChange?.(num);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCamAngleChange]);

  // Ensure Roboto Slab font link is loaded in head
  useEffect(() => {
    if (typeof document === "undefined") return;
    const fontId = "gameshow-roboto-slab-link";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@700;800;900&family=Merriweather:wght@900&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  return (
    <div className={`w-full h-full relative select-none ${className}`}>
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        camera={{ fov: 46, near: 0.1, far: 100, position: [0, 3.8, 5.4] }}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          background: "radial-gradient(ellipse at 50% 35%, #1e40af 0%, #172554 45%, #0f172a 80%, #020617 100%)",
        }}
      >
        <CameraController camAngle={internalCam} effectiveIsSpinning={effectiveIsSpinning} />

        {/* ── SUPERCHARGED 6-POINT BROADCAST STUDIO LIGHTING ── */}
        <ambientLight intensity={3.2} color="#eff6ff" />
        <directionalLight position={[0, 14, 6]} intensity={3.5} color="#dbeafe" />

        {/* Key Spotlight: trực diện rọi tâm nón */}
        <spotLight
          position={[0, 9.5, 4.0]}
          intensity={14.0}
          angle={0.75}
          penumbra={0.3}
          castShadow
          shadow-mapSize={[1024, 1024]}
          color="#ffffff"
        />

        {/* Dedicated Floor Specular Downlight (Rọi sàn tạo vệt sáng bóng gương chói lọi) */}
        <spotLight
          position={[0, 10.0, 1.5]}
          intensity={24.0}
          angle={0.9}
          penumbra={0.4}
          color="#bae6fd"
        />

        {/* Front Camera Fill Spotlight */}
        <spotLight position={[0, 5.0, 5.5]} intensity={9.0} angle={0.8} penumbra={0.4} color="#fffbeb" />

        {/* Left Studio Floor Wash Spotlight */}
        <spotLight position={[-5.0, 6.5, 2.5]} intensity={8.5} angle={0.8} penumbra={0.5} color="#fef08a" />

        {/* Right Studio Floor Wash Spotlight */}
        <spotLight position={[5.0, 6.5, 2.5]} intensity={8.5} angle={0.8} penumbra={0.5} color="#bae6fd" />

        {/* Back Rim / Kicker Light */}
        <pointLight position={[0, 4.5, -4.5]} color="#93c5fd" intensity={8.0} />

        {/* Ground Warm Gold Ambiance Fill */}
        <pointLight position={[0, 0.4, 3.5]} color="#fde68a" intensity={4.5} />

        {/* Center Under-Pedestal Uplight */}
        <pointLight position={[0, -0.4, 0]} color="#fef08a" intensity={6.0} distance={5.0} />

        {/* Dedicated Needle Studio Light at 9 o'clock */}
        <pointLight position={[-2.30, 1.80, 0.60]} intensity={6.0} distance={4.0} color="#fffbeb" />
        <spotLight position={[-3.2, 3.2, 1.5]} intensity={5.5} angle={0.6} penumbra={0.4} color="#fef08a" />

        {/* ── Studio Elements ── */}
        <StudioCeilingRig />
        <StudioBackdrop />
        <StudioSetWingMotifs />
        <BackdropLedScreenWithSpinningCubes />
        <StudioFloor />
        <WheelMachineGroup
          sectors={sectors}
          clientWheelAngle={clientWheelAngle}
          effectiveIsSpinning={effectiveIsSpinning}
          selectedSector={selectedSector}
        />
        {/* Bục đứng riêng biệt cho MC ngay bên trái bục thí sinh số 1 */}
        <DedicatedMcStation />
        {/* Bục thí sinh kê cao chuẩn VTV3 (đã xoá hộp trên đầu) */}
        <ElevatedContestantDaisBehindWheel
          teams={teams}
          roundScores={roundScores}
          currentTurnTeamId={currentTurnTeamId}
          tossUpBuzzedTeamId={tossUpBuzzedTeamId}
          isTossUpRound={isTossUpRound}
          phase={phase}
          edition={edition}
        />
        {/* Bảng Ô Chữ 3D tại Cánh Trái (Z ~ -1.0m) & Người mẫu trợ lý */}
        <Studio3DPuzzleBoard
          currentPuzzle={currentPuzzle}
          phase={phase}
          highlightedIndices={highlightedIndices}
          animRevealedIndices={animRevealedIndices}
        />
        {/* Khán đài khán giả đa tầng phía trước sân khấu (Z = +10m - +14m) */}
        <AudienceAmphitheater />
      </Canvas>

      {/* ── BROADCAST CAMERA DIRECTOR BAR ── */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 p-1.5 rounded-2xl bg-black/75 backdrop-blur-md border border-white/20 shadow-2xl">
        {[
          { id: 1, label: "CAM 1: Nón & Đội", icon: "🎡" },
          { id: 2, label: "CAM 2: Toàn Cảnh", icon: "🌐" },
          { id: 3, label: "CAM 3: Bảng Ô Chữ", icon: "🔤" },
          { id: 4, label: "CAM 4: Cận Nón", icon: "🎯" },
          { id: 5, label: "CAM 5: Thí Sinh", icon: "👤" },
          { id: 6, label: "CAM 6: Khán Đài", icon: "👥" },
        ].map((c) => {
          const isActive = internalCam === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setInternalCam(c.id);
                onCamAngleChange?.(c.id);
              }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-[0_0_15px_#f59e0b] scale-105"
                  : "bg-white/10 hover:bg-white/20 text-slate-200"
              }`}
            >
              <span>{c.icon}</span>
              <span className="hidden md:inline">{c.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
