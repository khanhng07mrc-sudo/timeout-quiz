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

import React, { useRef, useEffect, useMemo } from "react";
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
  camAngle: number; // 0=default, 1=wheel zoom, 2=wide, 3=board (UI focus), 4=disc closeup
  edition?: string;
  className?: string;
}

interface CamConfig {
  pos: [number, number, number];
  target: [number, number, number];
}

// ── Authentic Studio Camera Configurations ──────────────────────────────────
const CAM_POSITIONS: Record<string, CamConfig> = {
  // CAM 0 / Default: TV broadcast angle bao trọn nón ở tiền cảnh, bục 5 đội kê cao ở hậu cảnh, không khoảng đen thừa
  DEFAULT: { pos: [0, 3.25, 4.95], target: [0, 1.15, -0.30] },

  // CAM 1: Wheel zoom-in (2s) — dramatic perspective looking down at conical wheel
  CAM1_WHEEL: { pos: [0, 2.8, 3.1], target: [0, 1.25, 0] },

  // CAM 2: Wide shot (3s) — toàn cảnh trường quay vừa vặn
  CAM2_WIDE: { pos: [0, 3.8, 5.8], target: [0, 0.8, -0.4] },

  // CAM 3: Board zoom (4s) — tilts slightly upward as UI focuses on the letter board
  CAM3_BOARD: { pos: [0, 3.2, 5.4], target: [0, 1.0, 0] },

  // CAM 4: Disc closeup (stays until spin stops) — authentic TV broadcast elevated angle, wider & less foreshortened (không cắt xén, không chéo lệch)
  CAM4_DISC: { pos: [-1.30, 3.20, 3.40], target: [-0.60, 1.20, 0.10] },
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
      const digits = cleanLabel.split("");
      // Bolder, larger digits matching authentic VTV3 broadcast
      const fontSize = digits.length >= 5 ? 64 : digits.length >= 4 ? 76 : 84;
      const stepX = digits.length >= 5 ? 40 : digits.length >= 4 ? 48 : 56;
      const startX = r - (digits.length >= 5 ? 40 : 46);

      // Font chuẩn tiếng Việt Roboto Slab 900
      ctx.font = `900 ${fontSize}px "Roboto Slab", "Merriweather", "Impact", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      digits.forEach((digit, dIdx) => {
        const curX = startX - dIdx * stepX;
        ctx.save();
        ctx.translate(curX, 0);
        ctx.rotate(Math.PI / 2); // Flip 180 độ đúng chuẩn góc nhìn phát sóng VTV3 thực tế

        // Dynamic high-contrast outline (bolder 3.8px)
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 3.8;
        ctx.strokeText(digit, 0, 0);

        // Crisp fill
        ctx.fillStyle = colors.fill;
        ctx.fillText(digit, 0, 0);
        ctx.restore();
      });
    } else {
      // Special action label (e.g. PHẦN THƯỞNG, MẤT LƯỢT, NHÂN ĐÔI, CHIA ĐÔI, BÍ MẬT, TỐC ĐỘ, KIM CƯƠNG, 25000)
      // ALWAYS ON A SINGLE LINE running radially along the wedge length from rim towards center!
      ctx.translate(r - 28, 0);
      ctx.rotate(Math.PI); // Now +X points toward the center of the wheel

      // Calculate dynamic font size to guarantee everything fits on 1 single line without overflow
      const maxAvailableWidth = r - 75;
      const charCount = Math.max(cleanLabel.length, 5);
      const targetFontSize = Math.min(36, Math.max(18, Math.floor(maxAvailableWidth / (charCount * 0.60))));

      ctx.font = `900 ${targetFontSize}px "Roboto Slab", "Merriweather", sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";

      // Thin crisp stroke (2.8px)
      ctx.strokeStyle = colors.stroke;
      ctx.lineWidth = 2.8;
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
  // MC đứng ở mạn trái camera (-X), lệch trái so với các thí sinh, góc theta ~ -34°
  const RADIUS_MC = 3.30;
  const thetaRad = THREE.MathUtils.degToRad(-34);
  const posX = Math.sin(thetaRad) * RADIUS_MC; // ~ -1.85m
  const posZ = -Math.cos(thetaRad) * RADIUS_MC; // ~ -2.73m
  // Xoay mặt hướng về tâm vòng quay và bao quát toàn bộ trường quay
  const rotY = -thetaRad + 0.22;

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

/** Dàn hộp đèn số 3D VTV3 phát sáng hậu trường: 600 (đỏ), 900 (lục), 800 (lam), 500 (vàng) */
function Vtv3BacklitScoreCubes() {
  const cubes = [
    { label: "600", color: "#ef4444", emissive: "#dc2626", pos: [-3.2, 3.3, -4.6] as [number, number, number], rotY: 0.22 },
    { label: "900", color: "#10b981", emissive: "#059669", pos: [-1.1, 3.6, -4.9] as [number, number, number], rotY: 0.06 },
    { label: "800", color: "#3b82f6", emissive: "#2563eb", pos: [1.1, 3.4, -4.8] as [number, number, number], rotY: -0.12 },
    { label: "500", color: "#f59e0b", emissive: "#d97706", pos: [3.2, 3.1, -4.5] as [number, number, number], rotY: -0.26 },
  ];

  return (
    <group>
      {cubes.map((c, idx) => (
        <group key={`cube-${idx}`} position={c.pos} rotation={[0, c.rotY, 0]}>
          {/* Hộp đèn phát sáng lập phương */}
          <mesh castShadow>
            <boxGeometry args={[0.76, 0.76, 0.76]} />
            <meshStandardMaterial
              color={c.color}
              emissive={c.emissive}
              emissiveIntensity={1.5}
              roughness={0.2}
              metalness={0.1}
            />
          </mesh>
          {/* Khung viền kim loại bảo vệ hộp */}
          <mesh>
            <boxGeometry args={[0.80, 0.80, 0.80]} />
            <meshStandardMaterial color="#f8fafc" metalness={0.95} roughness={0.05} wireframe />
          </mesh>
          {/* Ánh sáng điểm tỏa ra từ hộp đèn */}
          <pointLight color={c.emissive} intensity={3.5} distance={4.0} />
        </group>
      ))}
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

      {/* 3. Dàn hộp đèn số 3D biểu tượng VTV3 hậu trường (Backlit Score Cubes: 600, 900, 800, 500) */}
      <Vtv3BacklitScoreCubes />
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
  const targetLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.15, 0.35));
  const initialized = useRef(false);

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

/** Sân khấu trường quay TV cao cấp: Sàn kính phản chiếu nhẹ (MeshReflectorMaterial), các dải LED đồng tâm & nan toả sáng */
function StudioFloor() {
  return (
    <group position={[0, -0.75, 0]}>
      {/* 1. Sàn studio mở rộng toàn cảnh (Deep Broadcast Studio Floor) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial
          color="#08152c"
          roughness={0.15}
          metalness={0.2}
        />
      </mesh>

      {/* 2. Sân khấu chính hình tròn nổi (Raised Circular Stage Deck) */}
      <mesh position={[0, 0.03, 0]} receiveShadow>
        <cylinderGeometry args={[6.2, 6.25, 0.06, 64]} />
        <meshStandardMaterial
          color="#0b1b38"
          roughness={0.25}
          metalness={0.35}
        />
      </mesh>

      {/* Mặt sàn kính phản chiếu nhẹ chuẩn trường quay TV (Glass Mirror Stage Floor with Soft Reflection) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.062, 0]} receiveShadow>
        <circleGeometry args={[6.18, 64]} />
        <MeshReflectorMaterial
          blur={[300, 100]}
          resolution={1024}
          mirror={0.42}
          mixBlur={0.8}
          mixStrength={1.8}
          roughness={0.12}
          depthScale={1.1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.5}
          color="#0d244d"
          metalness={0.45}
        />
      </mesh>

      {/* Vành viền Chrome bảo vệ quanh mép sàn khấu */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.063, 0]}>
        <ringGeometry args={[6.15, 6.25, 64]} />
        <meshStandardMaterial
          color="#e2e8f0"
          metalness={0.96}
          roughness={0.05}
        />
      </mesh>

      {/* Dải đèn LED vàng hoàng kim viền ngoài mép sàn (Perimeter Stage Halo) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.064, 0]}>
        <ringGeometry args={[6.00, 6.12, 64]} />
        <meshStandardMaterial
          color="#fde047"
          emissive="#f59e0b"
          emissiveIntensity={1.5}
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>

      {/* Vòng đai LED xanh Indigo phân làn khu vực người chơi (Contestant Arc Track) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.064, 0]}>
        <ringGeometry args={[4.95, 5.08, 64]} />
        <meshStandardMaterial
          color="#818cf8"
          emissive="#6366f1"
          emissiveIntensity={1.3}
          roughness={0.15}
          metalness={0.9}
        />
      </mesh>

      {/* Vòng đai LED xanh Cyan sáng rực khu vực giữa sàn */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.064, 0]}>
        <ringGeometry args={[3.80, 3.92, 64]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0ea5e9"
          emissiveIntensity={1.6}
          roughness={0.1}
          metalness={0.92}
        />
      </mesh>

      {/* Vòng spotlight sân khấu hoàng kim ôm sát chân cỗ máy nón */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.064, 0]}>
        <ringGeometry args={[2.62, 2.76, 64]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#f59e0b"
          emissiveIntensity={1.8}
          roughness={0.08}
          metalness={0.94}
        />
      </mesh>

      {/* Soft Center Stage Glow Disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0635, 0]}>
        <circleGeometry args={[2.60, 48]} />
        <meshStandardMaterial
          color="#1e40af"
          emissive="#1d4ed8"
          emissiveIntensity={0.3}
          roughness={0.1}
          metalness={0.2}
        />
      </mesh>
    </group>
  );
}

/** Phông nền vòm trường quay TV cong panorama (Curved Studio Cyc Backdrop) */
function StudioBackdrop() {
  return (
    <group position={[0, 4.0, 0]}>
      {/* Vòm tường cong trường quay TV bao trọn không gian (không còn góc chết đen) */}
      <mesh rotation={[0, -Math.PI / 2, 0]}>
        <cylinderGeometry args={[26, 26, 22, 64, 1, true, -Math.PI * 0.65, Math.PI * 1.3]} />
        <meshStandardMaterial
          color="#0f2652"
          roughness={0.35}
          metalness={0.2}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Dải LED viền vòm trên trường quay */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 10.5, -18]}>
        <ringGeometry args={[25.7, 26.0, 64]} />
        <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={1.5} side={THREE.DoubleSide} />
      </mesh>

      {/* 5 Cột đèn nhuộm màu nền trường quay (Backdrop Wash Columns) */}
      {[-12, -6, 0, 6, 12].map((x, i) => (
        <pointLight
          key={`cyc-light-${i}`}
          position={[x, 3.5, -16]}
          color={i % 2 === 0 ? "#38bdf8" : "#fbbf24"}
          intensity={7.0}
          distance={22.0}
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
}: WheelStudio3DSceneProps) {
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
          background: "radial-gradient(ellipse at 50% 30%, #0d2757 0%, #051021 100%)",
        }}
      >
        <CameraController camAngle={camAngle} effectiveIsSpinning={effectiveIsSpinning} />

        {/* ── SUPERCHARGED 6-POINT BROADCAST STUDIO LIGHTING (SÁNG BỪNG RỰC RỠ, PHẢN CHIẾU SÀN BÓNG GƯƠNG) ── */}
        <ambientLight intensity={2.8} color="#ffffff" />

        {/* Key Spotlight: trực diện siêu sáng rọi tâm nón */}
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
          position={[0, 8.5, 2.0]}
          intensity={16.0}
          angle={0.85}
          penumbra={0.5}
          color="#bae6fd"
        />

        {/* Front Camera Fill Spotlight: xóa bóng đổ đen, sáng đều toàn bộ mặt trước */}
        <spotLight
          position={[0, 5.0, 5.5]}
          intensity={9.0}
          angle={0.8}
          penumbra={0.4}
          color="#fffbeb"
        />

        {/* Left Studio Floor Wash Spotlight (Warm Gold Specular) */}
        <spotLight position={[-5.0, 6.5, 2.5]} intensity={8.5} angle={0.8} penumbra={0.5} color="#fef08a" />

        {/* Right Studio Floor Wash Spotlight (Electric Cyan Specular) */}
        <spotLight position={[5.0, 6.5, 2.5]} intensity={8.5} angle={0.8} penumbra={0.5} color="#bae6fd" />

        {/* Back Rim / Kicker Light (Làm nổi bật viền nón và kim quay) */}
        <pointLight position={[0, 4.5, -4.5]} color="#93c5fd" intensity={8.0} />

        {/* Ground Warm Gold Ambiance Fill */}
        <pointLight position={[0, 0.4, 3.5]} color="#fde68a" intensity={4.5} />

        {/* Center Under-Pedestal Uplight: xóa bỏ hoàn toàn vùng tối đen dưới gầm */}
        <pointLight position={[0, -0.4, 0]} color="#fef08a" intensity={6.0} distance={5.0} />

        {/* Dedicated Needle Studio Light at 9 o'clock (Làm kim quay đỏ thẫm & viền vàng hoàng kim nổi bật sắc nét) */}
        <pointLight
          position={[-2.30, 1.80, 0.60]}
          intensity={6.0}
          distance={4.0}
          color="#fffbeb"
        />
        <spotLight
          position={[-3.2, 3.2, 1.5]}
          intensity={5.5}
          angle={0.6}
          penumbra={0.4}
          color="#fef08a"
        />

        {/* Studio Elements */}
        <StudioBackdrop />
        <StudioFloor />
        <WheelMachineGroup
          sectors={sectors}
          clientWheelAngle={clientWheelAngle}
          effectiveIsSpinning={effectiveIsSpinning}
          selectedSector={selectedSector}
        />
        {/* Bục đứng riêng biệt cho MC bên trái thí sinh */}
        <DedicatedMcStation />
        {/* Bục thí sinh kê cao chuẩn VTV3 không bị đè nhau */}
        <ElevatedContestantDaisBehindWheel
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
