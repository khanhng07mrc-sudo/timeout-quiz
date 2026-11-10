"use client";

import React, { useRef, useMemo, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { OlympiaState } from "@/lib/olympia/types";
import { isSeatBuzzedIn3D, computeTargetLightingMode } from "./useOlympiaLightingState";
import { getContestantArcParams } from "./CameraController";

interface PodiumsProps {
  state?: OlympiaState | null;
  quality?: "HIGH" | "MEDIUM" | "LIGHT";
  screenFadeProgress?: number;
  serverNow?: () => number;
  liveFactor?: number;
  introStartedAt?: number | null;
  isIdle?: boolean;
}

/**
 * 3 Podium Screen Display Modes (User Request 8):
 * - "logo": Mới mở phòng (Lobby / Pre-match / Intro / Thí sinh chưa bước tới bục) -> Logo Đường lên đỉnh Olympia (D:\Olympia 26)
 * - "name_school": Từng thí sinh bước tới vị trí bục của mình xong -> Tên + Trường THPT (giữ nguyên đến trước Khởi Động)
 * - "name_score": Bước vào Khởi Động hoặc thi đấu chính thức -> Tên + Điểm số
 */
export type PodiumScreenMode = "logo" | "name_school" | "name_score";

// Pre-cached Olympia startscreen logo image for instant canvas blit
let _scoreboardLogoImage: HTMLImageElement | null = null;
let _scoreboardLogoRequested = false;

function getScoreboardLogoImage(): HTMLImageElement | null {
  if (typeof window === "undefined") return null;
  if (_scoreboardLogoImage && _scoreboardLogoImage.complete && _scoreboardLogoImage.naturalWidth > 0) {
    return _scoreboardLogoImage;
  }
  if (!_scoreboardLogoRequested) {
    _scoreboardLogoRequested = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = "/olympia/olympia_scoreboard_startscreen.webp";
    img.onload = () => {
      _scoreboardLogoImage = img;
    };
    img.onerror = () => {
      const fallback = new Image();
      fallback.crossOrigin = "anonymous";
      fallback.src = "/olympia/olympia_scoreboard_startscreen.png";
      fallback.onload = () => {
        _scoreboardLogoImage = fallback;
      };
    };
  }
  return _scoreboardLogoImage && _scoreboardLogoImage.complete && _scoreboardLogoImage.naturalWidth > 0
    ? _scoreboardLogoImage
    : null;
}

/**
 * Creates the unified 1:3 ratio contestant podium scoreboard canvas texture:
 * - Giai đoạn 1 ("logo"): Official Olympia Laurel & Mountain Logo background.
 * - Giai đoạn 2 ("name_school"): Contestant Name + High School Name.
 * - Giai đoạn 3 ("name_score"): Contestant Name + Large Score Digits (Buzzer Red support).
 */
export function createPodiumScoreCanvas(
  name: string,
  score: number,
  seatId: number,
  isBuzzed: boolean,
  isRed: boolean = false,
  school?: string,
  isEntrancePhase: boolean = false,
  targetCanvas?: HTMLCanvasElement,
  screenMode?: PodiumScreenMode
): HTMLCanvasElement {
  const canvas = targetCanvas || (typeof document !== "undefined" ? document.createElement("canvas") : ({} as HTMLCanvasElement));
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext ? canvas.getContext("2d") : null;
  if (!ctx) return canvas;
  ctx.clearRect(0, 0, 512, 256);

  // Determine effective mode with full backwards compatibility
  const effectiveMode: PodiumScreenMode = screenMode || (isEntrancePhase ? "name_school" : "name_score");

  if (effectiveMode === "logo") {
    // ── GIAI ĐOẠN 1: MÀN HÌNH CHỜ LOGO ĐƯỜNG LÊN ĐỈNH OLYMPIA (D:\Olympia 26\public\scoreboard\bg.png) ──
    const logoImg = getScoreboardLogoImage();
    if (logoImg) {
      ctx.drawImage(logoImg, 0, 0, 512, 256);
    } else {
      // Procedural Vector Fallback: Royal Deep Blue radial gradient + Gold wreath & mountain
      const bgGrad = ctx.createRadialGradient(256, 128, 20, 256, 128, 280);
      bgGrad.addColorStop(0, "#0369a1");
      bgGrad.addColorStop(0.5, "#0c2340");
      bgGrad.addColorStop(1, "#020713");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 512, 256);

      // Tech Grid subtle overlay
      ctx.strokeStyle = "rgba(56, 189, 248, 0.12)";
      ctx.lineWidth = 1;
      for (let x = 32; x < 512; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 256);
        ctx.stroke();
      }
      for (let y = 32; y < 256; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
      }

      // Golden Laurel Wreath Arc
      ctx.strokeStyle = "#eab308";
      ctx.lineWidth = 4;
      ctx.shadowColor = "rgba(250, 204, 21, 0.6)";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(256, 120, 68, 0.25 * Math.PI, 0.75 * Math.PI, true);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Golden Mountain Summit
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.moveTo(256, 75);
      ctx.lineTo(290, 135);
      ctx.lineTo(222, 135);
      ctx.closePath();
      ctx.fill();

      // Official Broadcast Title
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      ctx.font = '900 24px "Plus Jakarta Sans", "Montserrat", sans-serif';
      ctx.letterSpacing = "0.12em";
      ctx.shadowColor = "rgba(0, 229, 255, 0.8)";
      ctx.shadowBlur = 10;
      ctx.fillText("ĐƯỜNG LÊN ĐỈNH OLYMPIA", 256, 178);
      ctx.shadowBlur = 0;

      ctx.fillStyle = "#38bdf8";
      ctx.font = '800 13px "Plus Jakarta Sans", sans-serif';
      ctx.letterSpacing = "0.22em";
      ctx.fillText("VTV3 BROADCAST EDITION", 256, 208);
    }

    // Outer Neon Border
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#00e5ff";
    ctx.strokeRect(2, 2, 508, 252);
    return canvas;
  }

  if (effectiveMode === "name_school") {
    // ── GIAI ĐOẠN 2: THÍ SINH VỀ BỤC -> TÊN + TRƯỜNG THPT (GIỮ ĐẾN TRƯỚC KHỞI ĐỘNG) ──
    // Top 30% (Y = 0 to 76): Deep Sapphire/Cyan Bar with Contestant Name
    const topGrad = ctx.createLinearGradient(0, 0, 512, 76);
    topGrad.addColorStop(0, "#0284c7");
    topGrad.addColorStop(1, "#0369a1");
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, 512, 76);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.font = '900 28px "Plus Jakarta Sans", "Montserrat", sans-serif';
    ctx.letterSpacing = "0.05em";
    const displayName = (name || `THÍ SINH ${seatId + 1}`).toUpperCase();
    ctx.fillText(displayName, 256, 38);

    // Separator line
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 76);
    ctx.lineTo(512, 76);
    ctx.stroke();

    // Bottom 70% (Y = 76 to 256): Deep Midnight Blue with School / Team Name
    const bottomGrad = ctx.createLinearGradient(0, 76, 0, 256);
    bottomGrad.addColorStop(0, "#08142c");
    bottomGrad.addColorStop(1, "#020713");
    ctx.fillStyle = bottomGrad;
    ctx.fillRect(0, 76, 512, 180);

    const hasSchool = Boolean(school && school.trim());
    if (hasSchool) {
      // Small Gold Sub-label
      ctx.font = '700 15px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = "rgba(254, 240, 138, 0.75)";
      ctx.letterSpacing = "0.15em";
      ctx.fillText("TRƯỜNG THPT", 256, 108);

      // School Name in Radiant Warm Gold
      ctx.fillStyle = "#fef08a";
      ctx.shadowColor = "rgba(254, 240, 138, 0.6)";
      ctx.shadowBlur = 12;

      const schoolText = school!.trim().toUpperCase();
      if (schoolText.length > 22) {
        ctx.font = '900 25px "Plus Jakarta Sans", sans-serif';
        const words = schoolText.split(" ");
        const mid = Math.ceil(words.length / 2);
        const line1 = words.slice(0, mid).join(" ");
        const line2 = words.slice(mid).join(" ");
        ctx.fillText(line1, 256, 146);
        ctx.fillText(line2, 256, 186);
      } else {
        ctx.font = '900 32px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(schoolText, 256, 162);
      }
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = "rgba(56, 189, 248, 0.75)";
      ctx.font = '800 15px "Plus Jakarta Sans", sans-serif';
      ctx.letterSpacing = "0.2em";
      ctx.fillText("VỊ TRÍ THI ĐẤU", 256, 115);

      ctx.fillStyle = "#38bdf8";
      ctx.shadowColor = "rgba(56, 189, 248, 0.6)";
      ctx.shadowBlur = 12;
      ctx.font = '900 36px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`VỊ TRÍ 0${seatId + 1}`, 256, 165);
      ctx.shadowBlur = 0;
    }

    // Outer Border & Glow
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#38bdf8";
    ctx.strokeRect(2, 2, 508, 252);

    return canvas;
  }

  // ── GIAI ĐOẠN 3: BƯỚC VÀO KHỞI ĐỘNG & THI ĐẤU -> TÊN + ĐIỂM SỐ ──
  const headerBg = isRed ? "#ff2a4b" : "#00e5ff";
  const headerText = isRed ? "#ffffff" : "#081636";
  const borderColor = isRed ? "#ff2a4b" : (isBuzzed ? "#00f0ff" : "#00d4ff");
  const glowColor = isRed ? "rgba(255, 42, 75, 0.65)" : "rgba(0, 212, 255, 0.45)";

  // 1. Bottom 3/4 Background (Y = 64 to 256)
  const bottomGrad = ctx.createLinearGradient(0, 64, 0, 256);
  bottomGrad.addColorStop(0, isRed ? "#2d0812" : "#0e1e42");
  bottomGrad.addColorStop(1, isRed ? "#0f0205" : "#030816");
  ctx.fillStyle = bottomGrad;
  ctx.fillRect(0, 64, 512, 192);

  // 2. Top 1/4 Background (Y = 0 to 64)
  ctx.fillStyle = headerBg;
  ctx.fillRect(0, 0, 512, 64);

  // 3. Top 1/4 Contestant Name
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = headerText;
  ctx.font = '900 32px "Plus Jakarta Sans", "Montserrat", sans-serif';
  ctx.letterSpacing = "0.04em";
  const displayName = (name || `Thí sinh ${seatId + 1}`).toUpperCase();
  ctx.fillText(displayName, 256, 33);

  // 4. Subtle separator line between top 1/4 and bottom 3/4
  ctx.strokeStyle = isRed ? "rgba(255, 42, 75, 0.5)" : "rgba(0, 229, 255, 0.45)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 64);
  ctx.lineTo(512, 64);
  ctx.stroke();

  // 5. Bottom 3/4 Large Centered Score Digits (Pure White, Centered)
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.font = '900 114px "Plus Jakarta Sans", "Montserrat", monospace';
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 18;
  ctx.fillText(String(score), 256, 160);
  ctx.shadowBlur = 0;

  // 6. Outer Border & Glow
  ctx.lineWidth = 4;
  ctx.strokeStyle = borderColor;
  ctx.strokeRect(2, 2, 508, 252);

  return canvas;
}

/**
 * Contestant Podium Score Display (Supports 3 Lifecycle Modes)
 */
function ContestantScoreDisplay({
  name,
  score,
  seatId,
  isBuzzed,
  isRed = false,
  school,
  isEntrancePhase = false,
  screenMode,
}: {
  name: string;
  score: number;
  seatId: number;
  isBuzzed: boolean;
  isRed?: boolean;
  school?: string;
  isEntrancePhase?: boolean;
  screenMode?: PodiumScreenMode;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;

    // Single persistent canvas allocation
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    createPodiumScoreCanvas(name, score, seatId, isBuzzed, isRed, school, isEntrancePhase, canvas, screenMode);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;

    canvasRef.current = canvas;
    textureRef.current = tex;
    setTexture(tex);

    // If in logo mode and image is still loading asynchronously, poll until ready
    let timer: NodeJS.Timeout | null = null;
    const effectiveMode = screenMode || (isEntrancePhase ? "name_school" : "name_score");
    if (effectiveMode === "logo") {
      timer = setInterval(() => {
        const img = getScoreboardLogoImage();
        if (img && canvasRef.current && textureRef.current) {
          createPodiumScoreCanvas(name, score, seatId, isBuzzed, isRed, school, isEntrancePhase, canvasRef.current, screenMode);
          textureRef.current.needsUpdate = true;
          if (timer) clearInterval(timer);
        }
      }, 150);
    }

    return () => {
      if (timer) clearInterval(timer);
      tex.dispose();
      textureRef.current = null;
      canvasRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (canvasRef.current && textureRef.current) {
      createPodiumScoreCanvas(name, score, seatId, isBuzzed, isRed, school, isEntrancePhase, canvasRef.current, screenMode);
      textureRef.current.needsUpdate = true;
    }
  }, [name, score, seatId, isBuzzed, isRed, school, isEntrancePhase, screenMode]);

  return (
    <mesh position={[0, 0.54, 0.385]} rotation={[0, 0, 0]} renderOrder={6}>
      <planeGeometry args={[0.76, 0.36]} />
      {texture ? (
        <meshBasicMaterial
          map={texture}
          toneMapped={false}
          polygonOffset={true}
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      ) : (
        <meshStandardMaterial color="#0b162c" />
      )}
    </mesh>
  );
}

/**
 * Stylized 3D Contestant Humanoid standing behind podium
 * Official Olympia White Polo Uniform, natural standing posture (arms at sides, clean desk).
 */
interface ContestantStyleConfig {
  gender: "female" | "male";
  skinTone: string;
  hairColor: string;
  hairStyle: "ponytail" | "side_part" | "stylish_bob" | "textured_crop" | "layered_fringe" | "neat_fade" | "wavy_volume" | "undercut";
  hasGlasses: boolean;
  glassesColor?: string;
}

/**
 * Universal Warm Vietnamese PBR Physical Skin Shader:
 * - Multi-layered PBR response calibrated for studio lighting.
 * - Clearcoat (0.15) with 0.38 roughness for natural facial highlight.
 * - Sheen (0.65) with warm peach backscatter (#ffcfb8).
 * - Warm capillary emissive glow (#4a1c10 @ 0.15) preventing dark/grey/muddy artifacts.
 */
/**
 * Procedural Anatomical Humanoid Torso Geometry (Stylized Realism VTV):
 * - Seamless single-piece continuous BufferGeometry lofted across 24 vertical rings.
 * - Complete elimination of stacked cylindrical barrels, rigid can rims, and gap seams.
 * - Tailored masculine V-taper for male MC (broad shoulders 35.6cm, tapered waist 26.8cm, flared jacket skirt 30cm).
 * - Elegant feminine hourglass for female MC (shoulders 29.6cm, contoured bust, defined waist 22cm, peplum blazer 28cm).
 * - Athletic student posture for contestants (proportional polo tuck at Y=0.86m).
 * - Smooth vertex normals across all faces for continuous PBR broadcast lighting.
 */
export function createProceduralTorsoGeometry(
  type: "mc_male" | "mc_female" | "contestant"
): THREE.BufferGeometry {
  const isFemale = type === "mc_female";
  const isContestant = type === "contestant";

  const yTop = isContestant ? 1.31 : isFemale ? 1.34 : 1.39;
  const yBottom = isContestant ? 0.82 : isFemale ? 0.82 : 0.84;

  const keyPoints = isFemale
    ? [
        [0.00, 0.052, 0.042, 0.000, 0.000],
        [0.10, 0.125, 0.058, 0.002, 0.003],
        [0.18, 0.158, 0.070, 0.005, 0.006],
        [0.32, 0.148, 0.082, 0.012, 0.018],
        [0.55, 0.120, 0.065, 0.004, 0.004],
        [0.82, 0.146, 0.078, -0.002, 0.002],
        [1.00, 0.152, 0.082, -0.004, 0.000],
      ]
    : isContestant
    ? [
        [0.00, 0.058, 0.045, 0.000, 0.000],
        [0.10, 0.135, 0.062, 0.002, 0.002],
        [0.18, 0.165, 0.076, 0.005, 0.004],
        [0.34, 0.152, 0.084, 0.008, 0.010],
        [0.60, 0.132, 0.072, 0.002, 0.002],
        [0.85, 0.136, 0.075, 0.000, 0.000],
        [1.00, 0.138, 0.076, 0.000, 0.000],
      ]
    : [
        [0.00, 0.065, 0.050, 0.000, 0.000],
        [0.10, 0.150, 0.072, 0.002, 0.004],
        [0.18, 0.185, 0.086, 0.006, 0.008],
        [0.34, 0.170, 0.096, 0.014, 0.016],
        [0.58, 0.145, 0.078, 0.004, 0.004],
        [0.82, 0.162, 0.086, -0.002, 0.002],
        [1.00, 0.168, 0.090, -0.004, 0.000],
      ];

  function interpolate(u: number): [number, number, number, number, number] {
    if (u <= keyPoints[0][0]) return keyPoints[0] as [number, number, number, number, number];
    if (u >= keyPoints[keyPoints.length - 1][0]) return keyPoints[keyPoints.length - 1] as [number, number, number, number, number];
    for (let k = 0; k < keyPoints.length - 1; k++) {
      const p0 = keyPoints[k];
      const p1 = keyPoints[k + 1];
      if (u >= p0[0] && u <= p1[0]) {
        const f = (u - p0[0]) / (p1[0] - p0[0]);
        const s = f * f * (3 - 2 * f);
        return [
          u,
          p0[1] + (p1[1] - p0[1]) * s,
          p0[2] + (p1[2] - p0[2]) * s,
          p0[3] + (p1[3] - p0[3]) * s,
          p0[4] + (p1[4] - p0[4]) * s,
        ];
      }
    }
    return keyPoints[0] as [number, number, number, number, number];
  }

  const rings = 28;
  const segments = 36;
  const vertices: number[] = [];
  const indices: number[] = [];

  const superP = 2.6;
  const exp = 2 / superP;

  for (let r = 0; r <= rings; r++) {
    const u = r / rings;
    const y = yTop * (1 - u) + yBottom * u;
    const [, w, d, zOffset, frontAdd] = interpolate(u);

    for (let s = 0; s < segments; s++) {
      const theta = (s / segments) * Math.PI * 2;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      const absCos = Math.abs(cosT);
      const absSin = Math.abs(sinT);
      const superX = Math.sign(cosT) * Math.pow(absCos, exp) * w;
      let superZ = Math.sign(sinT) * Math.pow(absSin, exp) * d + zOffset;

      if (sinT > 0) {
        superZ += frontAdd * sinT * (1 - cosT * cosT * 0.4);
      }

      vertices.push(superX, y, superZ);
    }
  }

  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < segments; s++) {
      const nextS = (s + 1) % segments;
      const i0 = r * segments + s;
      const i1 = r * segments + nextS;
      const i2 = (r + 1) * segments + s;
      const i3 = (r + 1) * segments + nextS;
      indices.push(i0, i2, i1);
      indices.push(i1, i2, i3);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

export function createWarmPeachSkinMaterial(
  color: string = "#f4cba5",
  roughness: number = 0.58,
  emissive: string | THREE.Color = new THREE.Color("#fae5d3"),
  emissiveIntensity: number = 0.16
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.02,
    emissive: emissive instanceof THREE.Color ? emissive : new THREE.Color(emissive),
    emissiveIntensity,
  });
}

/**
 * PBR Physical Hair Shader:
 * - Calibrated for Vietnamese studio broadcast key/rim lighting.
 * - Deep warm specular sheen mimicking organic keratin luster.
 */
export function createHairMaterial(
  color: string = "#1a1512",
  roughness: number = 0.88,
  emissive: string | THREE.Color = new THREE.Color("#3d271d"),
  emissiveIntensity: number = 0.08
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.0,
    emissive: emissive instanceof THREE.Color ? emissive : new THREE.Color(emissive),
    emissiveIntensity,
  });
}

/**
 * Refined Expressive East Asian 3D Eye:
 * - Natural almond sclera with warm cream white
 * - Deep chocolate iris (#261710) with subtle light refraction
 * - Deep obsidian pupil with crisp studio key specular catchlight
 * - Soft skin-toned eyelid crease (warm shadow, NO black rings/mask!)
 */
/**
 * Upgraded Procedural East Asian 3D Eyes (Stylized Realism VTV):
 * - Open, radiant almond contour with subtle natural canthal tilt
 * - Upper eyelid hood & dark eyeliner margin covering top 15% of iris (NO bug-eyed white scleral show above iris!)
 * - Deep chocolate hazel iris (#2a170e) with warm amber luster, vertically spanning the eye aperture
 * - Deep obsidian pupil with dual studio specular catchlights (awake, attentive gaze)
 * - Delicate double eyelid crease framing the eye naturally above
 */
function ProceduralEye({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1.0,
  isLeft = true,
  skinColor = "#f5d0b5",
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  isLeft?: boolean;
  skinColor?: string;
}) {
  const canthalTilt = (isLeft ? 1 : -1) * 0.025;
  const side = isLeft ? -1 : 1;
  return (
    <group
      position={position}
      rotation={[rotation[0], rotation[1], rotation[2] + canthalTilt]}
      scale={scale}
    >
      {/* 1. Sclera - Organic almond horizontal curvature */}
      <mesh position={[0, 0, 0]} scale={[1.25, 0.68, 0.65]}>
        <sphereGeometry args={[0.011, 24, 24]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.25} />
      </mesh>

      {/* 2. Deep Chocolate Hazel Iris - Vertically spanning aperture (NO white above iris) */}
      <mesh position={[0, 0, 0.0070]} scale={[1.05, 0.98, 0.35]}>
        <sphereGeometry args={[0.0072, 24, 24]} />
        <meshStandardMaterial color="#22130c" roughness={0.30} />
      </mesh>

      {/* 3. Deep Obsidian Pupil */}
      <mesh position={[0, 0, 0.0088]} scale={[1.0, 1.0, 0.25]}>
        <sphereGeometry args={[0.0034, 18, 18]} />
        <meshBasicMaterial color="#050505" />
      </mesh>

      {/* 4. Dual Studio Specular Catchlights (Crisp Key Light + Soft Ambient Bounce) */}
      <mesh position={[0.0020, 0.0022, 0.0098]}>
        <sphereGeometry args={[0.0012, 10, 10]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[-0.0016, -0.0014, 0.0096]}>
        <sphereGeometry args={[0.0006, 8, 8]} />
        <meshBasicMaterial color="#dbeafe" />
      </mesh>

      {/* 5. Upper Eyelid Hood & Eyelash Margin (Curved natural arch covering top 15% of iris) */}
      <mesh position={[0, 0.0042, 0.0078]} rotation={[0.08, 0, side * 0.04]}>
        <torusGeometry args={[0.0105, 0.0014, 8, 24, Math.PI * 0.72]} />
        <meshStandardMaterial color={skinColor} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.0034, 0.0086]} rotation={[0.06, 0, side * 0.04]}>
        <torusGeometry args={[0.0102, 0.0006, 6, 24, Math.PI * 0.72]} />
        <meshBasicMaterial color="#1a1412" />
      </mesh>

      {/* 6. Lower Eyelid Subtle Shelf */}
      <mesh position={[0, -0.0044, 0.0072]} rotation={[-0.06, 0, -side * 0.03]}>
        <torusGeometry args={[0.0100, 0.0008, 6, 20, Math.PI * 0.65]} />
        <meshStandardMaterial color={skinColor} roughness={0.55} />
      </mesh>

      {/* 7. Delicate Upper Double Eyelid Crease */}
      <mesh position={[0, 0.0078, 0.0062]} rotation={[0.04, 0, side * 0.03]}>
        <torusGeometry args={[0.0125, 0.0006, 6, 18, Math.PI * 0.70]} />
        <meshStandardMaterial color="#854d38" roughness={0.65} />
      </mesh>

      {/* 8. Inner Canthus Tear Duct */}
      <mesh position={[-side * 0.011, -0.0005, 0.0065]}>
        <sphereGeometry args={[0.0016, 8, 8]} />
        <meshStandardMaterial color="#fca5a5" roughness={0.4} />
      </mesh>
    </group>
  );
}

/**
 * Procedural East Asian 3D Nose:
 * 1. Slender nasal dorsal bridge sloping gently from nasion to supratip.
 * 2. Rounded pronasion nasal tip sphere.
 * 3. Paired alar lobule nostril wings.
 * 4. Columella base resting 1.2cm above upper lip.
 */
function ProceduralNose({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1.0,
  skinMat,
  width = 1.0,
  length = 1.0,
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  skinMat: THREE.Material;
  width?: number;
  length?: number;
}) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* 1. Slender Nasal Dorsal Bridge */}
      <mesh position={[0, 0.007 * length, 0.004]} rotation={[0.10, 0, 0]}>
        <cylinderGeometry args={[0.0032 * width, 0.0052 * width, 0.022 * length, 14]} />
        <primitive object={skinMat} attach="material" />
      </mesh>
      {/* 2. Soft Rounded Pronasion Nasal Tip */}
      <mesh position={[0, -0.005 * length, 0.0085 * width]}>
        <sphereGeometry args={[0.0048 * width, 16, 16]} />
        <primitive object={skinMat} attach="material" />
      </mesh>
      {/* 3. Paired Alar Lobules (Nostril Wings) */}
      <mesh position={[-0.0055 * width, -0.006 * length, 0.0055]} scale={[1.05, 0.85, 1.1]}>
        <sphereGeometry args={[0.0030 * width, 12, 12]} />
        <primitive object={skinMat} attach="material" />
      </mesh>
      <mesh position={[0.0055 * width, -0.006 * length, 0.0055]} scale={[1.05, 0.85, 1.1]}>
        <sphereGeometry args={[0.0030 * width, 12, 12]} />
        <primitive object={skinMat} attach="material" />
      </mesh>
      {/* 4. Columella Base (resting 1.2cm above mouth) */}
      <mesh position={[0, -0.008 * length, 0.004]}>
        <capsuleGeometry args={[0.0018 * width, 0.004 * length, 6, 8]} />
        <primitive object={skinMat} attach="material" />
      </mesh>
    </group>
  );
}

/**
 * Upgraded Procedural East Asian 3D Mouth (Stylized Realism VTV):
 * - Natural broadcast smile with sculpted Cupid's bow and full vermilion contour
 * - Anatomically proportionate width (~5.0cm, aligned with inner pupils)
 * - Soft upward smile commissure corners and clean pearlescent dental line
 * - Placed with golden ratio philtrum (~1.1 - 1.2cm below nose base)
 */
function ProceduralMouth({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1.0,
  lipColor = "#b83250",
  smile = 0.08,
  openSmile = true,
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  lipColor?: string;
  smile?: number;
  openSmile?: boolean;
}) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Upper Lip with sculpted Cupid's bow and natural curve (width ~4.8cm) */}
      <group position={[0, 0.0018, 0.0030]}>
        {/* Left Cupid wing */}
        <mesh position={[-0.012, smile * 0.020, 0]} rotation={[0, 0, Math.PI / 2 + 0.08]}>
          <capsuleGeometry args={[0.0036, 0.024, 8, 14]} />
          <meshStandardMaterial color={lipColor} roughness={0.34} />
        </mesh>
        {/* Right Cupid wing */}
        <mesh position={[0.012, smile * 0.020, 0]} rotation={[0, 0, Math.PI / 2 - 0.08]}>
          <capsuleGeometry args={[0.0036, 0.024, 8, 14]} />
          <meshStandardMaterial color={lipColor} roughness={0.34} />
        </mesh>
        {/* Subtle Cupid tubercle center peak */}
        <mesh position={[0, -0.0003, 0.0022]}>
          <sphereGeometry args={[0.0038, 10, 10]} />
          <meshStandardMaterial color={lipColor} roughness={0.34} />
        </mesh>
      </group>

      {/* Full Plump Lower Lip (contoured vermilion, width ~4.6cm) */}
      <mesh position={[0, -0.0032, 0.0026]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.0046, 0.036, 8, 16]} />
        <meshStandardMaterial color={lipColor} roughness={0.32} />
      </mesh>

      {/* Left and Right Smile Commissures (Corners of the mouth with upward smile lift) */}
      <mesh position={[-0.023, smile * 0.035, 0.0022]}>
        <sphereGeometry args={[0.0028, 8, 8]} />
        <meshStandardMaterial color={lipColor} roughness={0.36} />
      </mesh>
      <mesh position={[0.023, smile * 0.035, 0.0022]}>
        <sphereGeometry args={[0.0028, 8, 8]} />
        <meshStandardMaterial color={lipColor} roughness={0.36} />
      </mesh>

      {/* Pearlescent Teeth line (Visible in open confident broadcast smile) */}
      {openSmile && (
        <mesh position={[0, -0.0004, 0.0020]}>
          <boxGeometry args={[0.030, 0.0026, 0.0028]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.20} metalness={0.06} />
        </mesh>
      )}
    </group>
  );
}

/**
 * Procedural Sculpted Ear:
 * 1. Curved outer helix rim (torus segment).
 * 2. Antihelix recess & concha cavity.
 * 3. Tragus prominence.
 * 4. Rounded earlobe (lobule).
 */
function SculptedEar({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  skinMat,
  isLeft = true,
  scale = 1.0,
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
  skinMat: THREE.Material;
  isLeft?: boolean;
  scale?: number;
}) {
  const side = isLeft ? -1 : 1;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* 1. Curved Outer Helix Rim */}
      <mesh position={[0, 0.003, 0]} rotation={[0, side * 0.25, side * -0.2]}>
        <torusGeometry args={[0.011, 0.0028, 8, 16, Math.PI * 1.15]} />
        <primitive object={skinMat} attach="material" />
      </mesh>
      {/* 2. Antihelix Recess & Concha Cavity */}
      <mesh position={[side * 0.002, 0.002, 0.001]}>
        <capsuleGeometry args={[0.0038, 0.011, 6, 10]} />
        <primitive object={skinMat} attach="material" />
      </mesh>
      {/* 3. Tragus Prominence */}
      <mesh position={[side * 0.004, -0.002, 0.005]}>
        <sphereGeometry args={[0.0028, 8, 8]} />
        <primitive object={skinMat} attach="material" />
      </mesh>
      {/* 4. Soft Rounded Earlobe (Lobule) */}
      <mesh position={[0, -0.012, 0]} scale={[0.9, 1.25, 0.9]}>
        <sphereGeometry args={[0.0052, 10, 10]} />
        <primitive object={skinMat} attach="material" />
      </mesh>
    </group>
  );
}

/**
 * Slender Vietnamese Hand with Graceful Articulated Fingers (Bàn tay người Việt thanh mảnh, mềm mại):
 * - Seamless tapered wrist transition without bulky ball joints.
 * - Slender, contoured flat palm (thickness ~8mm, width ~26mm).
 * - Opposable natural thumb positioned ergonomically along thenar line.
 * - 4 Delicate, slender fingers with natural joint articulation and subtle relaxed curves.
 * Modes:
 * - "hang": Gracefully resting along the side of the body/thigh (relaxed natural Vietnamese posture).
 * - "rest": Resting flat & relaxed on the desk.
 * - "mic": Wrapped around microphone handle.
 * - "card": Elegantly holding MC cue card.
 * - "tablet": Supporting host tablet from below.
 */
/**
 * Upgraded Anatomical Vietnamese Hand (Stylized Realism VTV):
 * - Extends naturally along -Y downwards from wrist
 * - Authentic adult proportions (palm length ~4.5cm, fingers ~4.5-5.5cm, total ~10-11cm)
 * - Defined palm arch, natural thenar eminence and opposable 2-phalanx thumb
 * - 4 Articulated slender fingers with natural relaxed joint curvatures curving around X
 */
function VietnameseHand({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  skinMat,
  isLeft = true,
  mode = "hang",
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number] | number;
  skinMat: THREE.Material;
  isLeft?: boolean;
  mode?: "hang" | "rest" | "mic" | "card" | "tablet" | "fist";
}) {
  const side = isLeft ? -1 : 1;

  // Natural curl angles calibrated for realistic broadcast gestures
  const fingerCurl =
    mode === "fist" ? 1.65 :
    mode === "mic" ? 1.25 :
    mode === "card" ? 0.35 :
    mode === "tablet" ? 0.25 :
    mode === "rest" ? 0.18 : 0.08;

  const thumbCurl =
    mode === "fist" ? 1.25 :
    mode === "mic" ? 0.85 :
    mode === "card" ? 0.25 :
    mode === "tablet" ? 0.18 :
    mode === "rest" ? 0.12 : 0.06;

  // Anatomically proportionate lengths (Index, Middle, Ring, Little)
  const fingerLengths = [0.046, 0.052, 0.048, 0.038];
  const fingerRadii = [0.0055, 0.0058, 0.0055, 0.0048];
  const fingerXs = isLeft
    ? [-0.016, -0.005, 0.006, 0.016]
    : [0.016, 0.005, -0.006, -0.016];

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* 1. Delicate Tapered Wrist Transition */}
      <mesh position={[0, -0.010, 0]} scale={[1.15, 1.0, 0.80]}>
        <cylinderGeometry args={[0.018, 0.021, 0.020, 14]} />
        <primitive object={skinMat} attach="material" />
      </mesh>

      {/* 2. Natural Sculpted Palm Plate */}
      <mesh position={[0, -0.038, 0.001]}>
        <boxGeometry args={[0.046, 0.038, 0.018]} />
        <primitive object={skinMat} attach="material" />
      </mesh>

      {/* 3. Thenar Thumb Ridge */}
      <mesh position={[side * 0.018, -0.030, 0.005]} scale={[1.1, 1.25, 0.95]}>
        <sphereGeometry args={[0.011, 12, 12]} />
        <primitive object={skinMat} attach="material" />
      </mesh>

      {/* 4. Opposable Natural Thumb */}
      <group
        position={[side * 0.022, -0.028, 0.006]}
        rotation={[0.15, side * 0.35, side * -0.15]}
      >
        {/* Proximal phalanx */}
        <mesh position={[side * 0.008, -0.010, 0.008]} rotation={[thumbCurl, 0, 0]}>
          <capsuleGeometry args={[0.0058, 0.020, 8, 10]} />
          <primitive object={skinMat} attach="material" />
        </mesh>
        {/* Distal tip */}
        <mesh position={[side * 0.010, -0.026, 0.018]} rotation={[thumbCurl * 1.30, 0, 0]}>
          <capsuleGeometry args={[0.0050, 0.016, 8, 10]} />
          <primitive object={skinMat} attach="material" />
        </mesh>
      </group>

      {/* 5. 4 Articulated Natural Fingers extending downwards along -Y */}
      {fingerXs.map((fX, fIdx) => {
        const len = fingerLengths[fIdx];
        const r = fingerRadii[fIdx];
        const splay = (fIdx - 1.5) * 0.025; // Natural finger splay

        return (
          <group key={fIdx} position={[fX, -0.057, 0]} rotation={[0, splay, 0]}>
            {/* Proximal phalanx */}
            <mesh position={[0, -len * 0.28, len * 0.08]} rotation={[fingerCurl, 0, 0]}>
              <capsuleGeometry args={[r, len * 0.45, 8, 10]} />
              <primitive object={skinMat} attach="material" />
            </mesh>
            {/* Distal phalanx with smooth rounded fingertip */}
            <mesh position={[0, -len * 0.68, len * 0.22]} rotation={[fingerCurl * 1.35, 0, 0]}>
              <capsuleGeometry args={[r * 0.88, len * 0.40, 8, 10]} />
              <primitive object={skinMat} attach="material" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

const SculptedHand = VietnameseHand;

/**
 * Dedicated Golden Olympia Laurel Wreath for Contestants (Vòng Nguyệt Quế Thí Sinh):
 * - Symmetrical twin arched golden branches curving around the crown of the head (radius ~0.088m).
 * - 14 paired golden laurel leaves angled outward with realistic leaf tips.
 * - Golden berry accents at branch nodes.
 * - Radiant gold PBR material (#ffd700, metalness: 0.95, roughness: 0.14, emissive: #f59e0b @ 0.25).
 * - Tilted slightly back (12 degrees, ~ -0.22 rad) atop the hair.
 */
export function ContestantHeadLaurelWreath({
  position = [0, 1.66, 0.005],
  rotation = [-0.22, 0, 0],
  scale = 1.0,
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}) {
  const leafPairs = useMemo(() => {
    const pairs: Array<{
      side: number;
      pos: [number, number, number];
      rot: [number, number, number];
      scale: number;
    }> = [];
    const numLeaves = 7; // 7 per side = 14 paired laurel leaves
    const radiusX = 0.086;
    const radiusY = 0.090;

    for (const side of [-1, 1]) {
      for (let i = 0; i < numLeaves; i++) {
        const t = (i + 1) / (numLeaves + 1);
        const theta = (t * 0.82 + 0.09) * Math.PI;

        const x = side * Math.sin(theta) * radiusX;
        const y = -Math.cos(theta) * radiusY * 0.35 + 0.02;
        const z = Math.cos(theta) * radiusY * 0.85;

        const leafRotZ = side === 1 ? -theta * 0.6 + 0.2 : theta * 0.6 - 0.2;
        const leafRotY = side * 0.3;

        pairs.push({
          side,
          pos: [x, y, z],
          rot: [0.12, leafRotY, leafRotZ],
          scale: 0.70 + Math.sin(t * Math.PI) * 0.25,
        });
      }
    }
    return pairs;
  }, []);

  const goldMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ffd700",
        metalness: 0.95,
        roughness: 0.14,
        emissive: new THREE.Color("#f59e0b"),
        emissiveIntensity: 0.25,
      }),
    []
  );

  const berryMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#fff1a8",
        metalness: 0.96,
        roughness: 0.10,
        emissive: new THREE.Color("#ffd700"),
        emissiveIntensity: 0.40,
      }),
    []
  );

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Twin Arch Golden Branches */}
      <mesh position={[-0.005, 0, 0]} rotation={[0, 0, 0.15]}>
        <torusGeometry args={[0.088, 0.0032, 10, 36, Math.PI * 0.92]} />
        <primitive object={goldMaterial} attach="material" />
      </mesh>
      <mesh position={[0.005, 0, 0]} rotation={[0, Math.PI, -0.15]}>
        <torusGeometry args={[0.088, 0.0032, 10, 36, Math.PI * 0.92]} />
        <primitive object={goldMaterial} attach="material" />
      </mesh>

      {/* 14 Paired Golden Laurel Leaves & Berries */}
      {leafPairs.map((p, idx) => (
        <group key={idx} position={p.pos} rotation={p.rot} scale={p.scale}>
          <mesh position={[0.012 * p.side, 0.010, 0]} rotation={[0, 0, p.side * 0.45]}>
            <coneGeometry args={[0.009, 0.030, 5]} />
            <primitive object={goldMaterial} attach="material" />
          </mesh>
          <mesh position={[-0.008 * p.side, 0.008, -0.006]} rotation={[0.15, 0, -p.side * 0.35]}>
            <coneGeometry args={[0.0075, 0.024, 5]} />
            <primitive object={goldMaterial} attach="material" />
          </mesh>
          {idx % 2 === 0 && (
            <mesh position={[0, 0, 0.008]}>
              <sphereGeometry args={[0.0035, 8, 8]} />
              <primitive object={berryMaterial} attach="material" />
            </mesh>
          )}
        </group>
      ))}

      {/* Rear Ribbon Bow Accent */}
      <group position={[0, -0.075, -0.045]}>
        <mesh>
          <sphereGeometry args={[0.009, 12, 12]} />
          <primitive object={goldMaterial} attach="material" />
        </mesh>
        <mesh position={[-0.015, -0.015, 0]} rotation={[0, 0, 0.3]}>
          <cylinderGeometry args={[0.003, 0.004, 0.03, 6]} />
          <primitive object={goldMaterial} attach="material" />
        </mesh>
        <mesh position={[0.015, -0.015, 0]} rotation={[0, 0, -0.3]}>
          <cylinderGeometry args={[0.003, 0.004, 0.03, 6]} />
          <primitive object={goldMaterial} attach="material" />
        </mesh>
      </group>
    </group>
  );
}

const CONTESTANT_STYLES: ContestantStyleConfig[] = [
  // Seat 0 (TS 1 / Cam 5): Nữ sinh thanh lịch đeo kính, da vàng sáng tự nhiên #f5cca8, tóc buộc thanh tú
  { gender: "female", skinTone: "#f5cca8", hairColor: "#171412", hairStyle: "ponytail", hasGlasses: true, glassesColor: "#334155" },
  // Seat 1 (TS 2 / Cam 6): Nam sinh tóc gọn gàng năng động, da vàng ấm tự nhiên #f2c396
  { gender: "male", skinTone: "#f2c396", hairColor: "#1a1614", hairStyle: "side_part", hasGlasses: false },
  // Seat 2 (TS 3 / Cam 7): Nữ sinh tóc ngắn cá tính thanh thoát, da vàng sáng hồng #f6cfaa
  { gender: "female", skinTone: "#f6cfaa", hairColor: "#1f1a16", hairStyle: "stylish_bob", hasGlasses: false },
  // Seat 3 (TS 4 / Cam 8): Nam sinh thư sinh đeo kính trí thức, da vàng mật ong ấm #eebf8e
  { gender: "male", skinTone: "#eebf8e", hairColor: "#181412", hairStyle: "textured_crop", hasGlasses: true, glassesColor: "#1e293b" },
  // Seat 4 (TS 5 / Cam 11): Nữ sinh tóc mái thưa buông nhẹ, da vàng sáng tự nhiên #f5cca8
  { gender: "female", skinTone: "#f5cca8", hairColor: "#201a15", hairStyle: "layered_fringe", hasGlasses: false },
  // Seat 5 (TS 6 / Cam 12): Nam sinh tóc cắt gọn gàng, da vàng ấm tự nhiên #f2c396
  { gender: "male", skinTone: "#f2c396", hairColor: "#171412", hairStyle: "neat_fade", hasGlasses: false },
  // Seat 6 (TS 7 / Cam 13): Nữ sinh đeo kính gọng mảnh thanh lịch, tóc gợn sóng nhẹ, da vàng sáng ấm #f6cfaa
  { gender: "female", skinTone: "#f6cfaa", hairColor: "#1c1815", hairStyle: "wavy_volume", hasGlasses: true, glassesColor: "#475569" },
  // Seat 7 (TS 8 / Cam 14): Nam sinh phong thái tự tin, da vàng ấm tự nhiên #f2c396
  { gender: "male", skinTone: "#f2c396", hairColor: "#191512", hairStyle: "undercut", hasGlasses: false },
];

export function ContestantFigure({
  seatId,
  position = [0, 0, 0],
  isWalking = false,
  walkPhase,
  walkPhaseRef,
  quality = "HIGH",
  gesture = "none",
  gestureProgress = 0,
  gestureProgressRef,
}: {
  seatId: number;
  position?: [number, number, number];
  isWalking?: boolean;
  walkPhase?: number;
  walkPhaseRef?: React.RefObject<number>;
  quality?: "HIGH" | "MEDIUM" | "LIGHT";
  gesture?: "none" | "wave" | "fist_pump" | "heart" | "open_arms" | "desk_bow";
  gestureProgress?: number;
  gestureProgressRef?: React.RefObject<number>;
}) {
  const style = CONTESTANT_STYLES[seatId % CONTESTANT_STYLES.length];
  const chestRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const leftForearmRef = useRef<THREE.Group>(null);
  const leftWristRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const rightForearmRef = useRef<THREE.Group>(null);
  const rightWristRef = useRef<THREE.Group>(null);
  const skinMat = useMemo(() => createWarmPeachSkinMaterial(style.skinTone), [style.skinTone]);
  const hairMat = useMemo(() => createHairMaterial(style.hairColor), [style.hairColor]);
  const contestantTorsoGeom = useMemo(() => createProceduralTorsoGeometry("contestant"), []);

  // Micro-breathing & natural student signature gestures / walking animation via useFrame
  useFrame(({ clock }) => {
    if (quality === "LIGHT") return;
    const t = clock.getElapsedTime();
    const effProgress = gestureProgressRef?.current !== undefined ? gestureProgressRef.current : gestureProgress;

    if (isWalking) {
      // Synchronize walking stride to unified cadence (omega = 8.5 rad/s, natural 108 steps/min pace)
      const activeWalkPhase =
        walkPhaseRef?.current !== undefined
          ? walkPhaseRef.current
          : (walkPhase !== undefined ? walkPhase : t * 8.5);
      const stride = Math.sin(activeWalkPhase) * 0.35;
      const armStride = Math.sin(activeWalkPhase) * 0.25;
      if (leftLegRef.current) { leftLegRef.current.rotation.x = stride; leftLegRef.current.rotation.z = 0; }
      if (rightLegRef.current) { rightLegRef.current.rotation.x = -stride; rightLegRef.current.rotation.z = 0; }
      if (leftArmRef.current) { leftArmRef.current.rotation.x = -armStride; leftArmRef.current.rotation.y = 0; leftArmRef.current.rotation.z = -0.04; }
      if (leftForearmRef.current) { leftForearmRef.current.rotation.x = -0.22; leftForearmRef.current.rotation.y = 0; leftForearmRef.current.rotation.z = 0; }
      if (leftWristRef.current) { leftWristRef.current.rotation.set(0.06, 0, -0.02); }
      if (rightArmRef.current) { rightArmRef.current.rotation.x = armStride; rightArmRef.current.rotation.y = 0; rightArmRef.current.rotation.z = 0.04; }
      if (rightForearmRef.current) { rightForearmRef.current.rotation.x = -0.22; rightForearmRef.current.rotation.y = 0; rightForearmRef.current.rotation.z = 0; }
      if (rightWristRef.current) { rightWristRef.current.rotation.set(0.06, 0, 0.02); }
      if (chestRef.current) chestRef.current.rotation.x = 0;
      if (headRef.current) { headRef.current.rotation.x = 0; headRef.current.rotation.y = 0; headRef.current.rotation.z = 0; }
    } else {
      // Kinematic ease-in and ease-out smoothing buffer using C2 Hermite smootherstep
      // Eliminates sudden popping or stiffness across shoulder, elbow, and wrist joints
      let gestureBlend = 0;
      if (gesture !== "none" && gesture !== "desk_bow") {
        const p = Math.max(0, Math.min(1.0, effProgress));
        const easeEdge = 0.25; // smooth ramp in and out
        if (p < easeEdge) {
          const s = p / easeEdge;
          gestureBlend = s * s * s * (s * (s * 6 - 15) + 10);
        } else if (p > 1.0 - easeEdge) {
          const s = (1.0 - p) / easeEdge;
          gestureBlend = s * s * s * (s * (s * 6 - 15) + 10);
        } else {
          gestureBlend = 1.0;
        }
      } else if (gesture === "desk_bow") {
        const p = Math.max(0, Math.min(1.0, effProgress));
        const s = Math.sin(p * Math.PI);
        gestureBlend = s * s * (3 - 2 * s);
      }

      if (leftLegRef.current) { leftLegRef.current.rotation.x = 0; leftLegRef.current.rotation.z = 0; }
      if (rightLegRef.current) { rightLegRef.current.rotation.x = 0; rightLegRef.current.rotation.z = 0; }

      // 1. Natural idle posture baseline (Relaxed physiological resting curves: elbow ~20 deg flexed, subtle breathing sway)
      const idleSway = Math.sin(t * 1.6 + seatId) * 0.012;
      const idleBreath = Math.sin(t * 1.8 + seatId * 1.2) * 0.016;
      const idleLeftArm = { x: -0.06 + idleBreath, y: 0.02, z: -0.08 - idleSway };
      const idleLeftForearm = { x: -0.34 + idleBreath * 0.4, y: 0, z: 0 };
      const idleLeftWrist = { x: 0.08, y: 0, z: -0.03 };
      const idleRightArm = { x: -0.06 + idleBreath, y: -0.02, z: 0.08 + idleSway };
      const idleRightForearm = { x: -0.34 + idleBreath * 0.4, y: 0, z: 0 };
      const idleRightWrist = { x: 0.08, y: 0, z: 0.03 };
      const idleHead = {
        x: Math.sin(t * 1.1 + seatId) * 0.005,
        y: Math.cos(t * 0.8 + seatId * 1.4) * 0.008,
        z: 0,
      };
      const idleChest = { x: 0 };

      // 2. Target signature gesture posture
      let targetLeftArm = { ...idleLeftArm };
      let targetLeftForearm = { ...idleLeftForearm };
      let targetLeftWrist = { ...idleLeftWrist };
      let targetRightArm = { ...idleRightArm };
      let targetRightForearm = { ...idleRightForearm };
      let targetRightWrist = { ...idleRightWrist };
      let targetHead = { ...idleHead };
      let targetChest = { ...idleChest };

      if (gesture === "wave") {
        const wave = Math.sin(t * 5.8);
        const waveLag = Math.sin(t * 5.8 - 0.45);
        targetRightArm = { x: -0.32, y: 0.12, z: 1.48 };
        targetRightForearm = { x: -1.28, y: 0.15, z: 0.55 + wave * 0.28 };
        targetRightWrist = { x: -0.15, y: 0.10, z: 0.20 + waveLag * 0.22 };
        targetLeftArm = { x: -0.04, y: 0, z: -0.08 };
        targetLeftForearm = { x: -0.28, y: 0, z: 0 };
        targetHead = { x: -0.02, y: 0.04, z: -0.04 };
        targetChest = { x: -0.02 };
      } else if (gesture === "fist_pump") {
        const pump = Math.sin(effProgress * Math.PI * 4) * 0.12;
        targetRightArm = { x: -0.45, y: -0.15, z: -0.20 };
        targetRightForearm = { x: -1.55 + pump * 0.40, y: -0.30, z: -0.45 };
        targetRightWrist = { x: 0.12, y: -0.10, z: 0.05 };
        targetLeftArm = { x: -0.04, y: 0, z: -0.08 };
        targetLeftForearm = { x: -0.28, y: 0, z: 0 };
        targetHead = { x: -0.06 + pump * 0.1, y: 0, z: 0 };
        targetChest = { x: -0.04 };
      } else if (gesture === "heart") {
        targetRightArm = { x: -0.30, y: -0.20, z: -0.15 };
        targetRightForearm = { x: -1.35, y: -0.55, z: -0.85 };
        targetRightWrist = { x: 0.18, y: 0.10, z: -0.12 };
        targetLeftArm = { x: -0.04, y: 0, z: -0.08 };
        targetLeftForearm = { x: -0.28, y: 0, z: 0 };
        targetHead = { x: 0.08, y: 0, z: 0 };
        targetChest = { x: -0.02 };
      } else if (gesture === "open_arms") {
        targetLeftArm = { x: -0.15, y: 0, z: -0.75 };
        targetLeftForearm = { x: -0.35, y: 0, z: -0.20 };
        targetLeftWrist = { x: 0.12, y: 0, z: -0.08 };
        targetRightArm = { x: -0.15, y: 0, z: 0.75 };
        targetRightForearm = { x: -0.35, y: 0, z: 0.20 };
        targetRightWrist = { x: 0.12, y: 0, z: 0.08 };
        targetHead = { x: -0.04, y: 0, z: 0 };
        targetChest = { x: -0.04 };
      } else if (gesture === "desk_bow") {
        const bowAngle = gestureBlend * 0.20;
        targetLeftArm = { x: -0.35, y: 0, z: -0.08 };
        targetLeftForearm = { x: -0.40, y: 0, z: 0 };
        targetRightArm = { x: -0.35, y: 0, z: 0.08 };
        targetRightForearm = { x: -0.40, y: 0, z: 0 };
        targetLeftWrist = { x: 0.10, y: 0, z: 0 };
        targetRightWrist = { x: 0.10, y: 0, z: 0 };
        targetHead = { x: bowAngle * 0.85, y: 0, z: 0 };
        targetChest = { x: bowAngle * 0.55 };
      }

      // 3. Smooth kinematic interpolation with C2 smootherstep buffer
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = THREE.MathUtils.lerp(idleLeftArm.x, targetLeftArm.x, gestureBlend);
        leftArmRef.current.rotation.y = THREE.MathUtils.lerp(idleLeftArm.y, targetLeftArm.y, gestureBlend);
        leftArmRef.current.rotation.z = THREE.MathUtils.lerp(idleLeftArm.z, targetLeftArm.z, gestureBlend);
      }
      if (leftForearmRef.current) {
        leftForearmRef.current.rotation.x = THREE.MathUtils.lerp(idleLeftForearm.x, targetLeftForearm.x, gestureBlend);
        leftForearmRef.current.rotation.y = THREE.MathUtils.lerp(idleLeftForearm.y, targetLeftForearm.y, gestureBlend);
        leftForearmRef.current.rotation.z = THREE.MathUtils.lerp(idleLeftForearm.z, targetLeftForearm.z, gestureBlend);
      }
      if (leftWristRef.current) {
        leftWristRef.current.rotation.x = THREE.MathUtils.lerp(idleLeftWrist.x, targetLeftWrist.x, gestureBlend);
        leftWristRef.current.rotation.y = THREE.MathUtils.lerp(idleLeftWrist.y, targetLeftWrist.y, gestureBlend);
        leftWristRef.current.rotation.z = THREE.MathUtils.lerp(idleLeftWrist.z, targetLeftWrist.z, gestureBlend);
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = THREE.MathUtils.lerp(idleRightArm.x, targetRightArm.x, gestureBlend);
        rightArmRef.current.rotation.y = THREE.MathUtils.lerp(idleRightArm.y, targetRightArm.y, gestureBlend);
        rightArmRef.current.rotation.z = THREE.MathUtils.lerp(idleRightArm.z, targetRightArm.z, gestureBlend);
      }
      if (rightForearmRef.current) {
        rightForearmRef.current.rotation.x = THREE.MathUtils.lerp(idleRightForearm.x, targetRightForearm.x, gestureBlend);
        rightForearmRef.current.rotation.y = THREE.MathUtils.lerp(idleRightForearm.y, targetRightForearm.y, gestureBlend);
        rightForearmRef.current.rotation.z = THREE.MathUtils.lerp(idleRightForearm.z, targetRightForearm.z, gestureBlend);
      }
      if (rightWristRef.current) {
        rightWristRef.current.rotation.x = THREE.MathUtils.lerp(idleRightWrist.x, targetRightWrist.x, gestureBlend);
        rightWristRef.current.rotation.y = THREE.MathUtils.lerp(idleRightWrist.y, targetRightWrist.y, gestureBlend);
        rightWristRef.current.rotation.z = THREE.MathUtils.lerp(idleRightWrist.z, targetRightWrist.z, gestureBlend);
      }
      if (headRef.current) {
        headRef.current.rotation.x = THREE.MathUtils.lerp(idleHead.x, targetHead.x, gestureBlend);
        headRef.current.rotation.y = THREE.MathUtils.lerp(idleHead.y, targetHead.y, gestureBlend);
        headRef.current.rotation.z = THREE.MathUtils.lerp(idleHead.z, targetHead.z, gestureBlend);
      }
      if (chestRef.current) {
        chestRef.current.rotation.x = THREE.MathUtils.lerp(idleChest.x, targetChest.x, gestureBlend);
        const breathWeight = 1.0 - gestureBlend * 0.7;
        chestRef.current.position.y = Math.sin(t * 1.8 + seatId * 1.2) * 0.002 * breathWeight;
        chestRef.current.scale.set(
          1 + Math.sin(t * 1.8 + seatId) * 0.004 * breathWeight,
          1,
          1 + Math.sin(t * 1.8 + seatId) * 0.004 * breathWeight
        );
      }
    }
  });

  const shirtColor = "#ffffff";
  const collarColor = "#1e3a8a"; // Iconic Olympia Navy Blue collar
  const placketColor = "#1e3a8a";
  const trouserColor = "#0f172a";

  return (
    <group position={position}>
      {/* ── LOWER BODY & TROUSERS (Athletic Vietnamese student proportions, Golden Ratio 50%) ── */}
      <mesh position={[0, 0.76, 0]}>
        <boxGeometry args={[0.24, 0.14, 0.15]} />
        <meshStandardMaterial color={trouserColor} roughness={0.85} />
      </mesh>

      {/* Belt & Gold Buckle */}
      <mesh position={[0, 0.825, 0]}>
        <boxGeometry args={[0.246, 0.026, 0.156]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.825, 0.080]}>
        <boxGeometry args={[0.026, 0.018, 0.006]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Left Leg */}
      <group ref={leftLegRef} position={[-0.065, 0.72, 0]}>
        <mesh position={[0, -0.16, 0]}>
          <cylinderGeometry args={[0.052, 0.042, 0.32, 16]} />
          <meshStandardMaterial color={trouserColor} roughness={0.85} />
        </mesh>
        <group position={[0, -0.32, 0]}>
          <mesh position={[0, -0.16, 0]}>
            <cylinderGeometry args={[0.042, 0.034, 0.32, 16]} />
            <meshStandardMaterial color={trouserColor} roughness={0.85} />
          </mesh>
          {/* Black dress shoe */}
          <mesh position={[0, -0.34, 0.04]}>
            <boxGeometry args={[0.075, 0.045, 0.17]} />
            <meshStandardMaterial color="#020617" roughness={0.3} metalness={0.5} />
          </mesh>
        </group>
      </group>

      {/* Right Leg */}
      <group ref={rightLegRef} position={[0.065, 0.72, 0]}>
        <mesh position={[0, -0.16, 0]}>
          <cylinderGeometry args={[0.052, 0.042, 0.32, 16]} />
          <meshStandardMaterial color={trouserColor} roughness={0.85} />
        </mesh>
        <group position={[0, -0.32, 0]}>
          <mesh position={[0, -0.16, 0]}>
            <cylinderGeometry args={[0.042, 0.034, 0.32, 16]} />
            <meshStandardMaterial color={trouserColor} roughness={0.85} />
          </mesh>
          {/* Black dress shoe */}
          <mesh position={[0, -0.34, 0.04]}>
            <boxGeometry args={[0.075, 0.045, 0.17]} />
            <meshStandardMaterial color="#020617" roughness={0.3} metalness={0.5} />
          </mesh>
        </group>
      </group>

      {/* ── UPPER BODY (Seamless Procedural Polo Shirt Torso: ZERO cylindrical barrel!) ── */}
      <group ref={chestRef}>
        <mesh geometry={contestantTorsoGeom}>
          <meshStandardMaterial color={shirtColor} roughness={0.45} />
        </mesh>

        {/* ── AUTHENTIC VIETNAMESE POLO COLLAR, STANDING BAND & PLACKET ── */}
        {/* Standing Collar Band (Chân Cổ) wrapping neck base */}
        <mesh position={[0, 1.285, 0.010]}>
          <cylinderGeometry args={[0.036, 0.040, 0.024, 24]} />
          <meshStandardMaterial color={collarColor} roughness={0.35} />
        </mesh>
        {/* Left Lapel (Beveled 3D Fold) */}
        <mesh position={[-0.040, 1.275, 0.062]} rotation={[0.26, -0.12, -0.18]}>
          <boxGeometry args={[0.044, 0.032, 0.004]} />
          <meshStandardMaterial color={collarColor} roughness={0.35} />
        </mesh>
        {/* Right Lapel (Beveled 3D Fold) */}
        <mesh position={[0.040, 1.275, 0.062]} rotation={[0.26, 0.12, 0.18]}>
          <boxGeometry args={[0.044, 0.032, 0.004]} />
          <meshStandardMaterial color={collarColor} roughness={0.35} />
        </mesh>
        {/* Top-Stitched Front Central Placket */}
        <mesh position={[0, 1.185, 0.066]}>
          <boxGeometry args={[0.018, 0.10, 0.004]} />
          <meshStandardMaterial color={placketColor} roughness={0.35} />
        </mesh>
        {/* Pearl Buttons with Subtle Luster */}
        <mesh position={[0, 1.22, 0.070]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.0028, 0.0028, 0.004, 10]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.4} />
        </mesh>
        <mesh position={[0, 1.17, 0.070]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.0028, 0.0028, 0.004, 10]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.4} />
        </mesh>

        {/* Golden Laurel Branch Chest Badge (Left Breast) */}
        <mesh position={[-0.055, 1.17, 0.068]}>
          <boxGeometry args={[0.018, 0.014, 0.003]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.7} roughness={0.2} />
        </mesh>
        <mesh position={[-0.055, 1.17, 0.070]}>
          <sphereGeometry args={[0.0040, 10, 10]} />
          <meshBasicMaterial color="#fef08a" />
        </mesh>

        {/* ── ARMS & HANDS (Seamless Sleeves embedded in shoulder, ZERO Ball Joints!) ── */}
        {/* Left Arm Group (pivoted at shoulder X = -0.145, Y = 1.21m) */}
        <group position={[-0.145, 1.21, 0.0]}>
          <mesh>
            <sphereGeometry args={[0.035, 16, 16]} />
            <meshStandardMaterial color={shirtColor} roughness={0.45} />
          </mesh>
          <group ref={leftArmRef}>
            {/* Left Polo Sleeve (Upper Arm) */}
            <mesh position={[0, -0.055, 0]} rotation={[0.04, 0, -0.04]}>
              <cylinderGeometry args={[0.035, 0.030, 0.11, 16]} />
              <meshStandardMaterial color={shirtColor} roughness={0.45} />
            </mesh>
            {/* Left Sleeve Ribbed Cuff */}
            <mesh position={[0, -0.112, 0]} rotation={[0.04, 0, -0.04]}>
              <cylinderGeometry args={[0.031, 0.031, 0.016, 16]} />
              <meshStandardMaterial color={collarColor} roughness={0.35} />
            </mesh>
            {/* Left Elbow Joint */}
            <group ref={leftForearmRef} position={[0, -0.115, 0]}>
              <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[0.024, 14, 14]} />
                <primitive object={skinMat} attach="material" />
              </mesh>
              {/* Left Forearm */}
              <mesh position={[0, -0.065, 0]}>
                <cylinderGeometry args={[0.026, 0.022, 0.12, 14]} />
                <primitive object={skinMat} attach="material" />
              </mesh>
              {/* Left Hand: Slender Vietnamese hand resting naturally */}
              <group ref={leftWristRef} position={[0, -0.130, 0]}>
                <VietnameseHand
                  position={[0, 0, 0]}
                  rotation={[0, 0, -0.04]}
                  scale={0.88}
                  skinMat={skinMat}
                  isLeft={true}
                  mode={isWalking ? "hang" : gesture === "desk_bow" ? "rest" : "hang"}
                />
              </group>
            </group>
          </group>
        </group>

        {/* Right Arm Group (pivoted at shoulder X = 0.145, Y = 1.21m) */}
        <group position={[0.145, 1.21, 0.0]}>
          <mesh>
            <sphereGeometry args={[0.035, 16, 16]} />
            <meshStandardMaterial color={shirtColor} roughness={0.45} />
          </mesh>
          <group ref={rightArmRef}>
            {/* Right Polo Sleeve (Upper Arm) */}
            <mesh position={[0, -0.055, 0]} rotation={[0.04, 0, 0.04]}>
              <cylinderGeometry args={[0.035, 0.030, 0.11, 16]} />
              <meshStandardMaterial color={shirtColor} roughness={0.45} />
            </mesh>
            {/* Right Sleeve Ribbed Cuff */}
            <mesh position={[0, -0.112, 0]} rotation={[0.04, 0, 0.04]}>
              <cylinderGeometry args={[0.031, 0.031, 0.016, 16]} />
              <meshStandardMaterial color={collarColor} roughness={0.35} />
            </mesh>
            {/* Right Elbow Joint */}
            <group ref={rightForearmRef} position={[0, -0.115, 0]}>
              <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[0.024, 14, 14]} />
                <primitive object={skinMat} attach="material" />
              </mesh>
              {/* Right Forearm */}
              <mesh position={[0, -0.065, 0]}>
                <cylinderGeometry args={[0.026, 0.022, 0.12, 14]} />
                <primitive object={skinMat} attach="material" />
              </mesh>
              {/* Right Hand: Slender Vietnamese hand */}
              <group ref={rightWristRef} position={[0, -0.130, 0]}>
                <VietnameseHand
                  position={[0, 0, 0]}
                  rotation={[0, 0, 0.04]}
                  scale={0.88}
                  skinMat={skinMat}
                  isLeft={false}
                  mode={
                    isWalking
                      ? "hang"
                      : gesture === "wave"
                      ? "card"
                      : gesture === "fist_pump"
                      ? "fist"
                      : gesture === "desk_bow" || gesture === "heart"
                      ? "rest"
                      : "hang"
                  }
                />
              </group>
            </group>
          </group>
        </group>
      </group>

      {/* ── SOLID CONTINUOUS STUDENT NECK (Firmly anchored into polo collar, NO GAPS EVER!) ── */}
      <mesh position={[0, 1.325, -0.004]}>
        <cylinderGeometry args={[0.028, 0.034, 0.080, 24]} />
        <primitive object={skinMat} attach="material" />
      </mesh>

      {/* ── HEAD & FACIAL ANATOMY (Athletic Vietnamese Student, Pivoted at Skull Base [0, 1.365, 0]) ── */}
      <group ref={headRef} position={[0, 1.365, 0]}>
        {/* Upper Throat & Mandible Transition (seamlessly covers neck joint) */}
        <mesh position={[0, -0.010, -0.004]}>
          <cylinderGeometry args={[0.028, 0.029, 0.026, 20]} />
          <primitive object={skinMat} attach="material" />
        </mesh>

        {/* 1. Cranial Vault */}
        <mesh position={[0, 0.075, 0.000]} scale={[0.96, 1.02, 0.98]}>
          <sphereGeometry args={[0.072, 28, 28]} />
          <primitive object={skinMat} attach="material" />
        </mesh>

        {/* 2. Soft Midface & Cheekbones */}
        <mesh position={[0, 0.042, 0.008]} scale={[0.95, 0.90, 0.95]}>
          <sphereGeometry args={[0.066, 24, 24]} />
          <primitive object={skinMat} attach="material" />
        </mesh>

        {/* 3. Defined Student Jawline */}
        <mesh position={[0, 0.018, 0.010]} rotation={[0.04, 0, 0]}>
          <cylinderGeometry args={[0.042, 0.028, 0.046, 20]} />
          <primitive object={skinMat} attach="material" />
        </mesh>

        {/* 4. Natural Chin */}
        <mesh position={[0, -0.002, 0.024]}>
          <sphereGeometry args={[0.012, 16, 16]} />
          <primitive object={skinMat} attach="material" />
        </mesh>

        {/* 5. Sculpted Left & Right Ears */}
        <SculptedEar
          position={[-0.070, 0.055, -0.005]}
          rotation={[0, -0.15, 0.05]}
          skinMat={skinMat}
          isLeft={true}
          scale={0.90}
        />
        <SculptedEar
          position={[0.070, 0.055, -0.005]}
          rotation={[0, 0.15, -0.05]}
          skinMat={skinMat}
          isLeft={false}
          scale={0.90}
        />

        {/* ── AUTHENTIC STUDENT HAIRSTYLES (Layered volume, NO helmet look!) ── */}
        {/* Layer 1: Cranial Base Hair Dome with front volume */}
        <mesh position={[0, 0.090, -0.005]} scale={[1.04, 1.05, 1.04]}>
          <sphereGeometry args={[0.076, 24, 24]} />
          <primitive object={hairMat} attach="material" />
        </mesh>
        {/* Layer 2: Natural Side-Part Hair Sweep */}
        <mesh position={[0.012, 0.112, 0.020]} rotation={[-0.10, 0.06, -0.06]}>
          <capsuleGeometry args={[0.018, 0.065, 8, 14]} />
          <primitive object={hairMat} attach="material" />
        </mesh>
        {/* Layer 3: Tapered Temples */}
        <mesh position={[-0.062, 0.082, 0.016]} rotation={[0, 0, -0.15]}>
          <capsuleGeometry args={[0.012, 0.045, 6, 8]} />
          <primitive object={hairMat} attach="material" />
        </mesh>
        <mesh position={[0.062, 0.082, 0.016]} rotation={[0, 0, 0.15]}>
          <capsuleGeometry args={[0.012, 0.045, 6, 8]} />
          <primitive object={hairMat} attach="material" />
        </mesh>

        {/* ── EXPRESSIVE STUDENT FACIAL FEATURES ── */}
        <ProceduralEye
          position={[-0.026, 0.060, 0.066]}
          scale={0.90}
          isLeft={true}
          skinColor={style.skinTone}
        />
        <ProceduralEye
          position={[0.026, 0.060, 0.066]}
          scale={0.90}
          isLeft={false}
          skinColor={style.skinTone}
        />

        {/* Student Eyebrows */}
        <mesh position={[-0.026, 0.078, 0.068]} rotation={[0, 0, 0.06]}>
          <boxGeometry args={[0.024, 0.0035, 0.004]} />
          <meshStandardMaterial color="#1a1412" roughness={0.8} />
        </mesh>
        <mesh position={[0.026, 0.078, 0.068]} rotation={[0, 0, -0.06]}>
          <boxGeometry args={[0.024, 0.0035, 0.004]} />
          <meshStandardMaterial color="#1a1412" roughness={0.8} />
        </mesh>

        {/* Procedural 3D Nose */}
        <ProceduralNose
          position={[0, 0.036, 0.066]}
          skinMat={skinMat}
          scale={0.88}
          width={0.90}
          length={0.90}
        />

        {/* Procedural 3D Mouth (Natural smile, philtrum 1.0cm below nose tip) */}
        <ProceduralMouth
          position={[0, 0.022, 0.067]}
          scale={0.90}
          lipColor="#aa5e50"
          smile={0.07}
          openSmile={true}
        />

        {/* Optional Chic Wireframe Eyeglasses */}
        {style.hasGlasses && (
          <group position={[0, 0.060, 0.069]}>
            <mesh position={[-0.026, 0, 0]}>
              <torusGeometry args={[0.012, 0.00045, 10, 24]} />
              <meshStandardMaterial color={style.glassesColor || "#cbd5e1"} metalness={0.9} roughness={0.2} />
            </mesh>
            <mesh position={[0.026, 0, 0]}>
              <torusGeometry args={[0.012, 0.00045, 10, 24]} />
              <meshStandardMaterial color={style.glassesColor || "#cbd5e1"} metalness={0.9} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0.001, 0]}>
              <boxGeometry args={[0.010, 0.0008, 0.0012]} />
              <meshStandardMaterial color={style.glassesColor || "#cbd5e1"} metalness={0.9} roughness={0.2} />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );
}

export function ContestantPodium({
  seatId,
  name,
  score,
  position,
  rotationY,
  isBuzzed,
  screenFadeProgress = 0,
  school,
  isEntrancePhase = false,
  showFigure = true,
  quality,
  liveFactor = 1.0,
  screenMode,
}: {
  seatId: number;
  name: string;
  score: number;
  position: [number, number, number];
  rotationY: number;
  isBuzzed: boolean;
  screenFadeProgress?: number;
  school?: string;
  isEntrancePhase?: boolean;
  showFigure?: boolean;
  quality?: "HIGH" | "MEDIUM" | "LIGHT";
  liveFactor?: number;
  screenMode?: PodiumScreenMode;
}) {
  const buzzerDomeRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);

  // Chrome materials
  const chromeBaseMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#d0d8e8",
        metalness: 0.98,
        roughness: 0.1,
        envMapIntensity: 2.0,
      }),
    []
  );

  // Smooth buzzer pop animation (zero-allocation per frame)
  useFrame((_, delta) => {
    if (buzzerDomeRef.current) {
      const targetScale = isBuzzed ? 1.15 : 1.0;
      const curScale = buzzerDomeRef.current.scale.x;
      const newScale = THREE.MathUtils.lerp(curScale, targetScale, delta * 14);
      buzzerDomeRef.current.scale.setScalar(newScale);
    }
    if (haloRef.current) {
      const targetOpacity = isBuzzed ? 0.9 : 0.0;
      const mat = haloRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, delta * 12);
      }
    }
  });

  // Bảng điểm bục thí sinh chỉ đổi sang màu đỏ khi thí sinh đó bấm chuông (không tự đổi màu theo trường quay)
  const isRed = isBuzzed;

  const podiumNeonColor = useMemo(() => {
    const baseColor = isRed ? new THREE.Color("#ff2a4b") : new THREE.Color("#00f0ff");
    const darkDormant = new THREE.Color("#020712");
    return darkDormant.lerp(baseColor, Math.max(0.0, Math.min(1.0, liveFactor)));
  }, [isRed, liveFactor]);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* ── 1. ARCHITECTURAL PLINTH BASE (Chân bục vững chắc tiếp đất Y=0) ── */}
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[1.20, 0.08, 0.88]} />
        <meshStandardMaterial color="#0f172a" metalness={0.92} roughness={0.18} />
      </mesh>
      <mesh position={[0, 0.082, 0.44]}>
        <boxGeometry args={[1.18, 0.015, 0.02]} />
        <meshBasicMaterial color={podiumNeonColor} />
      </mesh>

      {/* ── 2. MAIN KIOSK BODY (White Pearl Studio Enamel - Image 2) ── */}
      {/* Lower Apron: Stops at Y = 0.32m, strictly below the dark grey panel and score screen */}
      <mesh position={[0, 0.20, 0.02]}>
        <boxGeometry args={[1.06, 0.24, 0.74]} />
        <meshStandardMaterial
          color="#f8fafc"
          metalness={0.40}
          roughness={0.18}
          envMapIntensity={1.8}
        />
      </mesh>

      {/* Left Outer Chamfered Wing Pillar */}
      <mesh position={[-0.49, 0.54, 0.02]}>
        <boxGeometry args={[0.08, 0.44, 0.74]} />
        <meshStandardMaterial color="#f8fafc" metalness={0.40} roughness={0.18} />
      </mesh>
      {/* Right Outer Chamfered Wing Pillar */}
      <mesh position={[0.49, 0.54, 0.02]}>
        <boxGeometry args={[0.08, 0.44, 0.74]} />
        <meshStandardMaterial color="#f8fafc" metalness={0.40} roughness={0.18} />
      </mesh>

      {/* Upper Fascia Header Bar (White Enamel - Starts at Y = 0.76m, well above score screen) */}
      <mesh position={[0, 0.83, 0.02]}>
        <boxGeometry args={[1.06, 0.14, 0.74]} />
        <meshStandardMaterial color="#f8fafc" metalness={0.40} roughness={0.18} />
      </mesh>

      {/* ── 3. TẤM CHỮ NHẬT XÁM THẪM & HỐC MÀN HÌNH (Dark Grey Rectangular Panel with Padding) ── */}
      {/* Dark Grey Charcoal Rectangular Panel (0.90m x 0.42m x 0.04m at center Y = 0.54m, Z = 0.36m) */}
      <mesh position={[0, 0.54, 0.36]}>
        <boxGeometry args={[0.90, 0.42, 0.04]} />
        <meshStandardMaterial color="#1e293b" roughness={0.35} metalness={0.80} />
      </mesh>
      {/* Top Niche Lip Accent */}
      <mesh position={[0, 0.745, 0.382]}>
        <boxGeometry args={[0.90, 0.012, 0.015]} />
        <meshBasicMaterial color={podiumNeonColor} />
      </mesh>
      {/* Bottom Niche Lip Accent */}
      <mesh position={[0, 0.335, 0.382]}>
        <boxGeometry args={[0.90, 0.012, 0.015]} />
        <meshBasicMaterial color={podiumNeonColor} />
      </mesh>

      {/* Front Dynamic Score Screen (Inset flush on dark grey panel with 7cm left/right and 7cm top/bottom padding) */}
      <ContestantScoreDisplay
        name={name}
        score={score}
        seatId={seatId}
        isBuzzed={isBuzzed}
        isRed={isRed}
        school={school}
        isEntrancePhase={isEntrancePhase}
        screenMode={screenMode}
      />

      {/* ── 4. RECESSED GRAPHITE DESK SURFACE & TOUCH TABLET ── */}
      <mesh position={[0, 0.915, -0.04]} rotation={[-0.18, 0, 0]}>
        <boxGeometry args={[1.10, 0.02, 0.76]} />
        <meshStandardMaterial color="#0b1120" metalness={0.85} roughness={0.35} />
      </mesh>

      {/* Contestant Touch Screen Tablet Inset Flush on Desk */}
      <mesh position={[0, 0.928, -0.06]} rotation={[-0.18, 0, 0]}>
        <boxGeometry args={[0.54, 0.012, 0.36]} />
        <meshStandardMaterial
          color="#040d1e"
          roughness={0.12}
          metalness={0.85}
          emissive="#0077b6"
          emissiveIntensity={0.25}
        />
      </mesh>

      {/* ── 5. CHROME DOME BUZZER SYSTEM (Compact Palm-Sized r=0.035m) ── */}
      <group position={[0.34, 0.945, 0.12]}>
        {/* Desk Halo Glow Ring (Lights up red when buzzed) */}
        <mesh ref={haloRef} position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.045, 0.075, 32]} />
          <meshBasicMaterial
            color="#ff0033"
            transparent
            opacity={0}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Polished Chrome Cylinder Base */}
        <mesh position={[0, 0.012, 0]}>
          <cylinderGeometry args={[0.042, 0.045, 0.024, 24]} />
          <primitive object={chromeBaseMat} attach="material" />
        </mesh>

        {/* Dome Button (Palm-Sized r=0.035) */}
        <mesh ref={buzzerDomeRef} position={[0, 0.024, 0]}>
          <sphereGeometry args={[0.035, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial
            color={isBuzzed ? "#ff0033" : "#f1f5f9"}
            emissive={isBuzzed ? "#ff0022" : "#334155"}
            emissiveIntensity={isBuzzed ? 9.0 : 0.15}
            metalness={isBuzzed ? 0.3 : 0.95}
            roughness={isBuzzed ? 0.15 : 0.1}
          />
        </mesh>

        {/* Dual Point Lights on Buzzer Trigger */}
        {isBuzzed && (
          <>
            <pointLight position={[0, 0.25, 0]} color="#ff0033" intensity={14.0} distance={4.5} />
            <pointLight position={[0, 0.10, 0]} color="#ff4466" intensity={10.0} distance={2.5} />
          </>
        )}
      </group>

      {/* ── 6. 3D CONTESTANT FIGURE STANDING BEHIND PODIUM (Hidden during walking entrance) ── */}
      {showFigure && <ContestantFigure seatId={seatId} quality={quality} position={[0, 0, -0.42]} />}
    </group>
  );
}

/**
 * Aerodynamic Faceted MC Lectern Console (Bục MC Khí Động Học Studio S14)
 * Oriented along -30° (-0.52 rad) facing Stage Center and Contestants.
 * Features:
 * - Tapered multi-faceted angular chassis in matte obsidian & brushed aluminum.
 * - Winged side panels sweeping back at 20° angles.
 * - Refined miniature golden laurel wreath medallion (d=0.16m) with subtle cyan LED underline.
 * - Slanted reading console with dual gooseneck mics, cue card, and host laptop.
 */
/**
 * Origami Faceted Geometric Hourglass MC Desk (Image 1):
 * - Iconic faceted diamond polygon wings in pearl silver & dark obsidian.
 * - Central 16:9 landscape LED screen displaying official Olympia21Newlogo.webp.
 * - Deep setback at Z = -6.40m, opening up over 5.5m of reflective studio floor.
 * - MC Presenters Khánh Vy & Ngọc Huy standing strictly behind the desk at Z = -7.00m.
 */
/**
 * Milestone 3: MC Stage Visibility Formal Specifications (Requirement R3)
 */
export const MC_DESK_UPLIGHT_CONFIG = {
  position: [0, 1.20, 0.15] as [number, number, number],
  color: "#fff5e6",
  intensity: 4.5,
  distance: 2.5,
  decay: 1.0,
} as const;

export const MC_WARDROBE_SPEC = {
  khanhVy: {
    blazer: {
      color: "#831843",
      roughness: 0.38,
      metalness: 0.05,
      emissive: "#831843",
      emissiveIntensity: 0.12,
    },
    blouse: {
      color: "#ffffff",
      roughness: 0.35,
      emissive: "#ffffff",
      emissiveIntensity: 0.16,
    },
    spectacles: {
      color: "#cbd5e1",
      metalness: 0.95,
      roughness: 0.12,
    },
  },
  ngocHuy: {
    blazer: {
      color: "#b88a44",
      roughness: 0.42,
      metalness: 0.32,
      emissive: "#b88a44",
      emissiveIntensity: 0.12,
    },
    shirt: {
      color: "#ffffff",
      roughness: 0.35,
      emissive: "#ffffff",
      emissiveIntensity: 0.16,
    },
  },
} as const;

export function CenterMcDesk({
  screenFadeProgress = 0,
  liveFactor = 1.0,
}: {
  screenFadeProgress?: number;
  liveFactor?: number;
}) {
  const neonColor = useMemo(() => {
    const baseColor = screenFadeProgress > 0.5 ? new THREE.Color("#ff2a4b") : new THREE.Color("#00f0ff");
    const darkDormant = new THREE.Color("#020712");
    return darkDormant.lerp(baseColor, Math.max(0.0, Math.min(1.0, liveFactor)));
  }, [screenFadeProgress, liveFactor]);

  // Load official Olympia 21 New Logo for the 16:9 front display
  const [mcLogoTex, setMcLogoTex] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const loader = new THREE.TextureLoader();
    loader.load(
      "/brand/Olympia21Newlogo.webp",
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        setMcLogoTex(tex);
      },
      undefined,
      () => {
        loader.load("/olympia/Olympia21Newlogo.webp", (fallback) => {
          fallback.colorSpace = THREE.SRGBColorSpace;
          fallback.needsUpdate = true;
          setMcLogoTex(fallback);
        });
      }
    );
  }, []);

  return (
    <group position={[3.00, 0.08, -6.70]} rotation={[0, -0.25, 0]}>
      {/* 1. Sleek Tapered Ground Plinth Base */}
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[1.36, 0.08, 0.62]} />
        <meshStandardMaterial color="#050812" metalness={0.94} roughness={0.16} />
      </mesh>
      <mesh position={[0, 0.082, 0.31]}>
        <boxGeometry args={[1.32, 0.015, 0.02]} />
        <meshBasicMaterial color={neonColor} />
      </mesh>

      {/* 2. Central Core Chassis behind the Screen */}
      <mesh position={[0, 0.50, 0]}>
        <boxGeometry args={[1.06, 0.86, 0.50]} />
        <meshStandardMaterial color="#090f1d" metalness={0.90} roughness={0.20} />
      </mesh>

      {/* ── 3. CENTRAL 16:9 DISPLAY SCREEN WITH OLYMPIA21 NEW LOGO (Image 1) ── */}
      <group position={[0, 0.54, 0.26]}>
        {/* Outer Silver Beveled Chamfer Frame (Ratio 16:9) */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.96, 0.58, 0.04]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.92} roughness={0.15} />
        </mesh>
        {/* Thin Neon Inner Border */}
        <mesh position={[0, 0, 0.022]}>
          <boxGeometry args={[0.92, 0.54, 0.005]} />
          <meshBasicMaterial color={neonColor} />
        </mesh>
        {/* 16:9 Screen Surface Displaying Olympia21Newlogo.webp */}
        <mesh position={[0, 0, 0.026]}>
          <planeGeometry args={[0.88, 0.50]} />
          {mcLogoTex ? (
            <meshBasicMaterial map={mcLogoTex} toneMapped={false} />
          ) : (
            <meshStandardMaterial
              color="#991b1b"
              emissive="#7f1d1d"
              emissiveIntensity={0.65}
              roughness={0.2}
            />
          )}
        </mesh>
      </group>

      {/* ── 4. SLEEK SYMMETRICAL SIDE WINGS (Clean Chamfered Obsidian Wings) ── */}
      {/* Left Symmetrical Wing Chamfer (Dark Obsidian Lacquer) */}
      <mesh position={[-0.56, 0.50, 0]} rotation={[0, 0.15, 0]}>
        <boxGeometry args={[0.08, 0.80, 0.46]} />
        <meshStandardMaterial
          color="#0b1220"
          metalness={0.20}
          roughness={0.25}
          envMapIntensity={1.8}
        />
      </mesh>

      {/* Right Symmetrical Wing Chamfer (Dark Obsidian Lacquer) */}
      <mesh position={[0.56, 0.50, 0]} rotation={[0, -0.15, 0]}>
        <boxGeometry args={[0.08, 0.80, 0.46]} />
        <meshStandardMaterial
          color="#0b1220"
          metalness={0.20}
          roughness={0.25}
          envMapIntensity={1.8}
        />
      </mesh>

      {/* ── 5. TOP EXECUTIVE CONSOLE DECK & CONTROLS (Y = 0.95m) ── */}
      <mesh position={[0, 0.94, -0.01]}>
        <boxGeometry args={[1.52, 0.04, 0.62]} />
        <meshStandardMaterial color="#0b1220" metalness={0.92} roughness={0.22} />
      </mesh>
      <mesh position={[0, 0.962, 0.30]}>
        <boxGeometry args={[1.50, 0.016, 0.016]} />
        <meshBasicMaterial color={neonColor} />
      </mesh>

      {/* Front Privacy Shroud */}
      <mesh position={[0, 1.05, 0.30]} rotation={[-0.10, 0, 0]}>
        <boxGeometry args={[1.48, 0.18, 0.03]} />
        <meshStandardMaterial color="#0f172a" metalness={0.90} roughness={0.20} />
      </mesh>
      <mesh position={[0, 1.14, 0.29]} rotation={[-0.10, 0, 0]}>
        <boxGeometry args={[1.46, 0.015, 0.015]} />
        <meshBasicMaterial color={neonColor} />
      </mesh>

      {/* Dual Recessed Host Touchscreen Consoles (Flush inset into desk console) */}
      <group position={[-0.34, 0.965, 0.02]} rotation={[-0.15, 0, 0]}>
        <mesh position={[0, 0.004, 0]}>
          <boxGeometry args={[0.34, 0.008, 0.24]} />
          <meshStandardMaterial color="#0b1220" metalness={0.90} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.009, 0]}>
          <planeGeometry args={[0.32, 0.22]} />
          <meshStandardMaterial
            color="#0284c7"
            emissive="#0284c7"
            emissiveIntensity={0.35}
            roughness={0.2}
          />
        </mesh>
      </group>

      <group position={[0.34, 0.965, 0.02]} rotation={[-0.15, 0, 0]}>
        <mesh position={[0, 0.004, 0]}>
          <boxGeometry args={[0.34, 0.008, 0.24]} />
          <meshStandardMaterial color="#0b1220" metalness={0.90} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.009, 0]}>
          <planeGeometry args={[0.32, 0.22]} />
          <meshStandardMaterial
            color="#0284c7"
            emissive="#0284c7"
            emissiveIntensity={0.35}
            roughness={0.2}
          />
        </mesh>
      </group>

      {/* Dual Cue Cards */}
      <mesh position={[-0.32, 0.97, -0.16]} rotation={[0.25, 0, 0]}>
        <boxGeometry args={[0.22, 0.008, 0.15]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.3} />
      </mesh>
      <mesh position={[0.32, 0.97, -0.16]} rotation={[0.25, 0, 0]}>
        <boxGeometry args={[0.22, 0.008, 0.15]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.3} />
      </mesh>

      {/* Dual Low-Profile Boundary Microphones (Flush on desk flanks, staying strictly below Y=0.98 so CAM 3 is 100% clean) */}
      <group position={[-0.88, 0.965, -0.02]}>
        <mesh position={[0, 0.006, 0]}>
          <cylinderGeometry args={[0.016, 0.020, 0.012, 16]} />
          <meshStandardMaterial color="#1e2430" metalness={0.95} roughness={0.15} />
        </mesh>
      </group>

      <group position={[0.88, 0.965, -0.02]}>
        <mesh position={[0, 0.006, 0]}>
          <cylinderGeometry args={[0.016, 0.020, 0.012, 16]} />
          <meshStandardMaterial color="#1e2430" metalness={0.95} roughness={0.15} />
        </mesh>
      </group>

      {/* ── 6. INTERIOR HOST CONSOLE UPLIGHT / CHEST FILL (Milestone 3 R3) ── */}
      <pointLight
        position={MC_DESK_UPLIGHT_CONFIG.position}
        color={MC_DESK_UPLIGHT_CONFIG.color}
        intensity={MC_DESK_UPLIGHT_CONFIG.intensity}
        distance={MC_DESK_UPLIGHT_CONFIG.distance}
        decay={MC_DESK_UPLIGHT_CONFIG.decay}
      />
    </group>
  );
}

// Coaxial MC Desk Standing Positions aligned perpendicular to CenterMcDesk ([3.00, 0.08, -6.70], rotY = -0.25 rad)
export const KV_DESK_POS: [number, number, number] = [3.35, 0.14, -7.11];
export const NH_DESK_POS: [number, number, number] = [2.89, 0.14, -7.22];
export const MC_DESK_ROT_Y = -0.25;
export const KV_CENTER_POS: [number, number, number] = [0.38, 0.18, 0.00];
export const NH_CENTER_POS: [number, number, number] = [-0.38, 0.18, 0.00];

// MC Concealed Positions (Strictly behind Hexagonal Portal Tier 3 solid slabs: |xLoc| = 2.40m, zLoc = -0.85m)
export const KV_CONCEAL_POS: [number, number, number] = [6.02, 0.14, -8.82];
export const NH_CONCEAL_POS: [number, number, number] = [1.36, 0.14, -10.01];

// Lateral Step-Out Waypoints around OUTER Left/Right Edges of Hexagon Tier 1 (|xLoc| = 3.28m > 3.20m widest knuckle)
export const KV_SIDE_CTRL_POS: [number, number, number] = [6.87, 0.14, -8.60];
export const NH_SIDE_CTRL_POS: [number, number, number] = [0.51, 0.14, -10.22];
export const KV_OUTER_SIDE_POS: [number, number, number] = [6.72, 0.14, -8.02];
export const NH_OUTER_SIDE_POS: [number, number, number] = [0.36, 0.14, -9.64];
export const KV_OUTER_FRONT_POS: [number, number, number] = [6.50, 0.14, -7.15];
export const NH_OUTER_FRONT_POS: [number, number, number] = [0.14, 0.14, -8.77];

// Smooth Forward Arc Control Waypoints curving around front of MC Desk onto Center Circular Dais
export const KV_WAYPOINT: [number, number, number] = [5.15, 0.15, -3.65];
export const NH_WAYPOINT: [number, number, number] = [-0.45, 0.15, -4.55];

/**
 * Animated 3D MC Presenters (Khánh Vy & Ngọc Huy):
 * - Idle / Lobby: Staged concealed behind the hexagonal screen frames [6.02, 0.14, -8.82] and [1.36, 0.14, -10.01].
 * - Intro Opening: Step laterally past outer portal edges (|xLoc| = 3.28m, zero frame clipping) and curve smoothly to center dais (0.0s-4.8s), greeting (4.8s-5.6s).
 * - Host Mode: Poised elegantly at center dais during greeting, then walk back to desk (exact 6.0s) on contestant entrance.
 * - Match Rounds: Coaxial behind desk at [3.35, 0.14, -7.11] and [2.89, 0.14, -7.22] facing -0.25 rad.
 */
export function McPresenters({
  state,
  serverNow,
  introStartedAt,
  isIdle = false,
}: {
  state?: OlympiaState | null;
  serverNow?: () => number;
  introStartedAt?: number | null;
  isIdle?: boolean;
}) {
  const kvRef = useRef<THREE.Group>(null);
  const nhRef = useRef<THREE.Group>(null);
  const kvLeftLegRef = useRef<THREE.Group>(null);
  const kvRightLegRef = useRef<THREE.Group>(null);
  const kvLeftKneeRef = useRef<THREE.Group>(null);
  const kvRightKneeRef = useRef<THREE.Group>(null);
  const nhLeftLegRef = useRef<THREE.Group>(null);
  const nhRightLegRef = useRef<THREE.Group>(null);
  const nhLeftKneeRef = useRef<THREE.Group>(null);
  const nhRightKneeRef = useRef<THREE.Group>(null);
  const kvLeftArmRef = useRef<THREE.Group>(null);
  const kvLeftForearmRef = useRef<THREE.Group>(null);
  const kvLeftWristRef = useRef<THREE.Group>(null);
  const kvRightArmRef = useRef<THREE.Group>(null);
  const kvRightForearmRef = useRef<THREE.Group>(null);
  const kvRightWristRef = useRef<THREE.Group>(null);
  const nhLeftArmRef = useRef<THREE.Group>(null);
  const nhLeftForearmRef = useRef<THREE.Group>(null);
  const nhLeftWristRef = useRef<THREE.Group>(null);
  const nhRightArmRef = useRef<THREE.Group>(null);
  const nhRightForearmRef = useRef<THREE.Group>(null);
  const nhRightWristRef = useRef<THREE.Group>(null);

  const kvSkinMat = useMemo(() => createWarmPeachSkinMaterial("#fae5d3"), []);
  const nhSkinMat = useMemo(() => createWarmPeachSkinMaterial("#f2c49c"), []);
  const kvHairMat = useMemo(() => createHairMaterial("#281912", 0.62), []);
  const nhHairMat = useMemo(() => createHairMaterial("#191512", 0.65), []);
  const kvTorsoGeom = useMemo(() => createProceduralTorsoGeometry("mc_female"), []);
  const nhTorsoGeom = useMemo(() => createProceduralTorsoGeometry("mc_male"), []);

  const kvBlazerMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: MC_WARDROBE_SPEC.khanhVy.blazer.color,
        roughness: MC_WARDROBE_SPEC.khanhVy.blazer.roughness,
        metalness: MC_WARDROBE_SPEC.khanhVy.blazer.metalness,
        emissive: new THREE.Color(MC_WARDROBE_SPEC.khanhVy.blazer.emissive),
        emissiveIntensity: MC_WARDROBE_SPEC.khanhVy.blazer.emissiveIntensity,
      }),
    []
  );

  const kvBlouseMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: MC_WARDROBE_SPEC.khanhVy.blouse.color,
        roughness: MC_WARDROBE_SPEC.khanhVy.blouse.roughness,
        emissive: new THREE.Color(MC_WARDROBE_SPEC.khanhVy.blouse.emissive),
        emissiveIntensity: MC_WARDROBE_SPEC.khanhVy.blouse.emissiveIntensity,
      }),
    []
  );

  const nhBlazerMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: MC_WARDROBE_SPEC.ngocHuy.blazer.color,
        roughness: MC_WARDROBE_SPEC.ngocHuy.blazer.roughness,
        metalness: MC_WARDROBE_SPEC.ngocHuy.blazer.metalness,
        emissive: new THREE.Color(MC_WARDROBE_SPEC.ngocHuy.blazer.emissive),
        emissiveIntensity: MC_WARDROBE_SPEC.ngocHuy.blazer.emissiveIntensity,
      }),
    []
  );

  const nhShirtMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: MC_WARDROBE_SPEC.ngocHuy.shirt.color,
        roughness: MC_WARDROBE_SPEC.ngocHuy.shirt.roughness,
        emissive: new THREE.Color(MC_WARDROBE_SPEC.ngocHuy.shirt.emissive),
        emissiveIntensity: MC_WARDROBE_SPEC.ngocHuy.shirt.emissiveIntensity,
      }),
    []
  );

  useFrame(() => {
    const now = serverNow ? serverNow() : Date.now();
    const isEntranceActive = Boolean(state?.entranceState?.active);
    const isIntro = Boolean(introStartedAt || state?.introTimer);
    const hasEntranceCompleted = Boolean(state?.entranceCompleted);

    let kvX = KV_DESK_POS[0];
    let kvY = KV_DESK_POS[1];
    let kvZ = KV_DESK_POS[2];
    let nhX = NH_DESK_POS[0];
    let nhY = NH_DESK_POS[1];
    let nhZ = NH_DESK_POS[2];
    let kvRotY = MC_DESK_ROT_Y;
    let nhRotY = MC_DESK_ROT_Y;
    let isWalking = false;
    let walkPhase = 0;
    let isGreeting = false;
    let greetingBell = 0;

    if (isEntranceActive) {
      const entranceStart = state?.entranceState?.startedAt || now;
      const elapsedEntrance = Math.max(0, now - entranceStart);

      if (elapsedEntrance < 6000) {
        const rawT = elapsedEntrance / 6000;
        const u = rawT * rawT * (3 - 2 * rawT);

        isWalking = u > 0.02 && u < 0.98;
        walkPhase = u * Math.PI * 14;

        const kvMidX = (KV_CENTER_POS[0] + KV_DESK_POS[0]) / 2 + 0.20;
        const kvMidY = 0.16;
        const kvMidZ = (KV_CENTER_POS[2] + KV_DESK_POS[2]) / 2;
        const nhMidX = (NH_CENTER_POS[0] + NH_DESK_POS[0]) / 2 + 0.15;
        const nhMidY = 0.16;
        const nhMidZ = (NH_CENTER_POS[2] + NH_DESK_POS[2]) / 2;

        const w0 = (1 - u) * (1 - u);
        const w1 = 2 * (1 - u) * u;
        const w2 = u * u;

        kvX = w0 * KV_CENTER_POS[0] + w1 * kvMidX + w2 * KV_DESK_POS[0];
        kvY = w0 * KV_CENTER_POS[1] + w1 * kvMidY + w2 * KV_DESK_POS[1];
        kvZ = w0 * KV_CENTER_POS[2] + w1 * kvMidZ + w2 * KV_DESK_POS[2];

        nhX = w0 * NH_CENTER_POS[0] + w1 * nhMidX + w2 * NH_DESK_POS[0];
        nhY = w0 * NH_CENTER_POS[1] + w1 * nhMidY + w2 * NH_DESK_POS[1];
        nhZ = w0 * NH_CENTER_POS[2] + w1 * nhMidZ + w2 * NH_DESK_POS[2];

        const kvTanX = 2 * (1 - u) * (kvMidX - KV_CENTER_POS[0]) + 2 * u * (KV_DESK_POS[0] - kvMidX);
        const kvTanZ = 2 * (1 - u) * (kvMidZ - KV_CENTER_POS[2]) + 2 * u * (KV_DESK_POS[2] - kvMidZ);
        const kvWalkAngle = Math.atan2(kvTanX, kvTanZ);

        const nhTanX = 2 * (1 - u) * (nhMidX - NH_CENTER_POS[0]) + 2 * u * (NH_DESK_POS[0] - nhMidX);
        const nhTanZ = 2 * (1 - u) * (nhMidZ - NH_CENTER_POS[2]) + 2 * u * (NH_DESK_POS[2] - nhMidZ);
        const nhWalkAngle = Math.atan2(nhTanX, nhTanZ);

        if (u < 0.15) {
          const turnT = u / 0.15;
          kvRotY = THREE.MathUtils.lerp(0.0, kvWalkAngle, turnT);
          nhRotY = THREE.MathUtils.lerp(0.0, nhWalkAngle, turnT);
        } else if (u > 0.85) {
          const settleT = (u - 0.85) / 0.15;
          kvRotY = THREE.MathUtils.lerp(kvWalkAngle, MC_DESK_ROT_Y, settleT);
          nhRotY = THREE.MathUtils.lerp(nhWalkAngle, MC_DESK_ROT_Y, settleT);
        } else {
          kvRotY = kvWalkAngle;
          nhRotY = nhWalkAngle;
        }
      } else {
        kvX = KV_DESK_POS[0];
        kvY = KV_DESK_POS[1];
        kvZ = KV_DESK_POS[2];
        nhX = NH_DESK_POS[0];
        nhY = NH_DESK_POS[1];
        nhZ = NH_DESK_POS[2];
        kvRotY = MC_DESK_ROT_Y;
        nhRotY = MC_DESK_ROT_Y;
        isWalking = false;
      }
    } else if (isIntro && !hasEntranceCompleted) {
      const introStart = introStartedAt || state?.introTimer?.startedAt || now;
      const elapsedIntro = Math.max(0, now - introStart);

      if (elapsedIntro < 4800) {
        // Phase 1 (0.0s -> 4.8s): C^1 smooth 3-segment trajectory stepping sideways past OUTER portal edges
        // (|xLoc| = 3.28m > 3.20m widest Tier 1 knuckle -> zero portal frame clipping!) then curving to center dais
        const rawT = Math.min(1.0, elapsedIntro / 4800);
        const u = rawT * rawT * (3 - 2 * rawT); // Smoothstep easing across full walk

        isWalking = u > 0.01 && u < 0.99;
        walkPhase = u * Math.PI * 11.5;

        let kvTanX = 0;
        let kvTanZ = 1;
        let nhTanX = 0;
        let nhTanZ = 1;

        if (u < 0.24) {
          // Segment A (u: 0.00 -> 0.24): Step laterally behind Tier 3 out to |xLoc| = 3.28m
          const s = u / 0.24;
          const w0 = (1 - s) * (1 - s);
          const w1 = 2 * (1 - s) * s;
          const w2 = s * s;

          kvX = w0 * KV_CONCEAL_POS[0] + w1 * KV_SIDE_CTRL_POS[0] + w2 * KV_OUTER_SIDE_POS[0];
          kvZ = w0 * KV_CONCEAL_POS[2] + w1 * KV_SIDE_CTRL_POS[2] + w2 * KV_OUTER_SIDE_POS[2];
          nhX = w0 * NH_CONCEAL_POS[0] + w1 * NH_SIDE_CTRL_POS[0] + w2 * NH_OUTER_SIDE_POS[0];
          nhZ = w0 * NH_CONCEAL_POS[2] + w1 * NH_SIDE_CTRL_POS[2] + w2 * NH_OUTER_SIDE_POS[2];

          kvTanX = 2 * (1 - s) * (KV_SIDE_CTRL_POS[0] - KV_CONCEAL_POS[0]) + 2 * s * (KV_OUTER_SIDE_POS[0] - KV_SIDE_CTRL_POS[0]);
          kvTanZ = 2 * (1 - s) * (KV_SIDE_CTRL_POS[2] - KV_CONCEAL_POS[2]) + 2 * s * (KV_OUTER_SIDE_POS[2] - KV_SIDE_CTRL_POS[2]);
          nhTanX = 2 * (1 - s) * (NH_SIDE_CTRL_POS[0] - NH_CONCEAL_POS[0]) + 2 * s * (NH_OUTER_SIDE_POS[0] - NH_SIDE_CTRL_POS[0]);
          nhTanZ = 2 * (1 - s) * (NH_SIDE_CTRL_POS[2] - NH_CONCEAL_POS[2]) + 2 * s * (NH_OUTER_SIDE_POS[2] - NH_SIDE_CTRL_POS[2]);
        } else if (u < 0.44) {
          // Segment B (u: 0.24 -> 0.44): Walk forward completely outside Tier 1 outer edges (|xLoc| = 3.28m)
          const s = (u - 0.24) / 0.20;
          kvX = KV_OUTER_SIDE_POS[0] + (KV_OUTER_FRONT_POS[0] - KV_OUTER_SIDE_POS[0]) * s;
          kvZ = KV_OUTER_SIDE_POS[2] + (KV_OUTER_FRONT_POS[2] - KV_OUTER_SIDE_POS[2]) * s;
          nhX = NH_OUTER_SIDE_POS[0] + (NH_OUTER_FRONT_POS[0] - NH_OUTER_SIDE_POS[0]) * s;
          nhZ = NH_OUTER_SIDE_POS[2] + (NH_OUTER_FRONT_POS[2] - NH_OUTER_SIDE_POS[2]) * s;

          kvTanX = KV_OUTER_FRONT_POS[0] - KV_OUTER_SIDE_POS[0];
          kvTanZ = KV_OUTER_FRONT_POS[2] - KV_OUTER_SIDE_POS[2];
          nhTanX = NH_OUTER_FRONT_POS[0] - NH_OUTER_SIDE_POS[0];
          nhTanZ = NH_OUTER_FRONT_POS[2] - NH_OUTER_SIDE_POS[2];
        } else {
          // Segment C (u: 0.44 -> 1.00): Smooth forward arc in front of MC desk converging onto Center Circular Dais
          const s = (u - 0.44) / 0.56;
          const w0 = (1 - s) * (1 - s);
          const w1 = 2 * (1 - s) * s;
          const w2 = s * s;

          kvX = w0 * KV_OUTER_FRONT_POS[0] + w1 * KV_WAYPOINT[0] + w2 * KV_CENTER_POS[0];
          kvZ = w0 * KV_OUTER_FRONT_POS[2] + w1 * KV_WAYPOINT[2] + w2 * KV_CENTER_POS[2];
          nhX = w0 * NH_OUTER_FRONT_POS[0] + w1 * NH_WAYPOINT[0] + w2 * NH_CENTER_POS[0];
          nhZ = w0 * NH_OUTER_FRONT_POS[2] + w1 * NH_WAYPOINT[2] + w2 * NH_CENTER_POS[2];

          kvTanX = 2 * (1 - s) * (KV_WAYPOINT[0] - KV_OUTER_FRONT_POS[0]) + 2 * s * (KV_CENTER_POS[0] - KV_WAYPOINT[0]);
          kvTanZ = 2 * (1 - s) * (KV_WAYPOINT[2] - KV_OUTER_FRONT_POS[2]) + 2 * s * (KV_CENTER_POS[2] - KV_WAYPOINT[2]);
          nhTanX = 2 * (1 - s) * (NH_WAYPOINT[0] - NH_OUTER_FRONT_POS[0]) + 2 * s * (NH_CENTER_POS[0] - NH_WAYPOINT[0]);
          nhTanZ = 2 * (1 - s) * (NH_WAYPOINT[2] - NH_OUTER_FRONT_POS[2]) + 2 * s * (NH_CENTER_POS[2] - NH_WAYPOINT[2]);
        }

        // Smooth elevation step-up from studio floor (0.14m) onto center circular dais (0.18m)
        const stepU = Math.max(0, Math.min(1, (u - 0.76) / 0.20));
        const smoothStepU = stepU * stepU * (3 - 2 * stepU);
        kvY = 0.14 + (KV_CENTER_POS[1] - 0.14) * smoothStepU;
        nhY = 0.14 + (NH_CENTER_POS[1] - 0.14) * smoothStepU;

        const kvAngle = Math.atan2(kvTanX, kvTanZ);
        const nhAngle = Math.atan2(nhTanX, nhTanZ);

        if (u < 0.12) {
          kvRotY = THREE.MathUtils.lerp(0.85, kvAngle, u / 0.12);
          nhRotY = THREE.MathUtils.lerp(-1.25, nhAngle, u / 0.12);
        } else if (u > 0.84) {
          const settleT = (u - 0.84) / 0.16;
          kvRotY = THREE.MathUtils.lerp(kvAngle, 0.0, settleT);
          nhRotY = THREE.MathUtils.lerp(nhAngle, 0.0, settleT);
        } else {
          kvRotY = kvAngle;
          nhRotY = nhAngle;
        }
      } else if (elapsedIntro < 5600) {
        // Phase 2 (4.8s -> 5.6s): Arrived at center circular dais, opening greeting facing audience
        kvX = KV_CENTER_POS[0];
        kvY = KV_CENTER_POS[1];
        kvZ = KV_CENTER_POS[2];
        nhX = NH_CENTER_POS[0];
        nhY = NH_CENTER_POS[1];
        nhZ = NH_CENTER_POS[2];
        isWalking = false;
        isGreeting = true;

        const greetT = (elapsedIntro - 4800) / 800; // 0.0 to 1.0
        greetingBell = Math.sin(greetT * Math.PI);  // 0 -> 1 -> 0
        kvRotY = 0.0 - 0.12 * greetingBell;
        nhRotY = 0.0 + 0.12 * greetingBell;
      } else {
        // Phase 3 (5.6s onwards): Poised stance on center circular dais throughout pre-match greeting
        kvX = KV_CENTER_POS[0];
        kvY = KV_CENTER_POS[1];
        kvZ = KV_CENTER_POS[2];
        nhX = NH_CENTER_POS[0];
        nhY = NH_CENTER_POS[1];
        nhZ = NH_CENTER_POS[2];
        kvRotY = 0.0;
        nhRotY = 0.0;
        isWalking = false;
      }
    } else if (isIdle && !introStartedAt) {
      // Pre-match / idle lobby: MCs concealed behind screen frames
      kvX = KV_CONCEAL_POS[0];
      kvY = KV_CONCEAL_POS[1];
      kvZ = KV_CONCEAL_POS[2];
      nhX = NH_CONCEAL_POS[0];
      nhY = NH_CONCEAL_POS[1];
      nhZ = NH_CONCEAL_POS[2];
      kvRotY = 0.85;
      nhRotY = -1.25;
      isWalking = false;
    } else {
      // Regular match rounds / post-intro: MCs coaxial behind desk
      kvX = KV_DESK_POS[0];
      kvY = KV_DESK_POS[1];
      kvZ = KV_DESK_POS[2];
      nhX = NH_DESK_POS[0];
      nhY = NH_DESK_POS[1];
      nhZ = NH_DESK_POS[2];
      kvRotY = MC_DESK_ROT_Y;
      nhRotY = MC_DESK_ROT_Y;
      isWalking = false;
    }

    const stride = isWalking ? Math.sin(walkPhase) * 0.35 : 0;
    const armStride = isWalking ? Math.sin(walkPhase) * 0.25 : 0;
    const bounce = isWalking ? Math.abs(Math.sin(walkPhase)) * 0.025 : 0;

    // Natural television presenter micro-breathing & conversational articulation (~3.2s cadence)
    // Eliminates static wax-statue pose when standing at dais or MC desk
    const speechTime = now * 0.00196; // ~3.2s period
    const talkSub = Math.sin(speechTime * 1.7 + 0.5);
    const kvMicBreathe = Math.sin(speechTime * 1.2) * 0.035 + talkSub * 0.012;
    const nhMicBreathe = Math.cos(speechTime * 1.1) * 0.035 - talkSub * 0.012;
    const kvCardBreathe = Math.cos(speechTime * 0.9) * 0.022;
    const nhCardBreathe = Math.sin(speechTime * 0.9) * 0.022;
    const mcBodySway = Math.sin(speechTime * 0.75) * 0.014;

    const idleBreathing = Math.sin(now * 0.002) * 0.004;
    const effectiveYOffset = isWalking ? bounce : idleBreathing;

    if (kvRef.current) {
      kvRef.current.position.set(kvX, kvY + effectiveYOffset, kvZ);
      kvRef.current.rotation.y = kvRotY + (isWalking ? 0 : mcBodySway);
    }
    if (nhRef.current) {
      nhRef.current.position.set(nhX, nhY + effectiveYOffset, nhZ);
      nhRef.current.rotation.y = nhRotY + (isWalking ? 0 : -mcBodySway);
    }

    if (kvLeftLegRef.current && kvRightLegRef.current) {
      kvLeftLegRef.current.rotation.x = stride;
      kvRightLegRef.current.rotation.x = -stride;
    }
    if (kvLeftKneeRef.current && kvRightKneeRef.current) {
      kvLeftKneeRef.current.rotation.x = Math.max(0, -stride * 0.95);
      kvRightKneeRef.current.rotation.x = Math.max(0, stride * 0.95);
    }
    if (nhLeftLegRef.current && nhRightLegRef.current) {
      nhLeftLegRef.current.rotation.x = -stride;
      nhRightLegRef.current.rotation.x = stride;
    }
    if (nhLeftKneeRef.current && nhRightKneeRef.current) {
      nhLeftKneeRef.current.rotation.x = Math.max(0, stride * 0.95);
      nhRightKneeRef.current.rotation.x = Math.max(0, -stride * 0.95);
    }

    let kvLeftArmX = isWalking ? -armStride * 0.25 : kvCardBreathe;
    let kvLeftArmZ = 0;
    let kvRightArmX = isWalking ? armStride * 0.25 : kvMicBreathe;
    let kvRightArmZ = 0;

    let nhLeftArmX = isWalking ? armStride * 0.25 : nhMicBreathe;
    let nhLeftArmZ = 0;
    let nhRightArmX = isWalking ? -armStride * 0.25 : nhCardBreathe;
    let nhRightArmZ = 0;

    if (isGreeting) {
      // High-five arm gesture on inner arms (NH Right Arm & KV Left Arm)
      nhRightArmX = -1.25 * greetingBell;
      nhRightArmZ = -0.45 * greetingBell;
      kvLeftArmX = -1.25 * greetingBell;
      kvLeftArmZ = 0.45 * greetingBell;
    }

    const breatheWave = Math.sin(speechTime * 1.2);
    const vocalPulse = Math.sin(speechTime * 2.1 + 0.4) * 0.030;

    // Presentation gestures towards Contestants (Stage Right) and LED Screen
    const gestureCycle = Math.sin(speechTime * 0.42);
    const isGesturing = !isWalking && !isGreeting && gestureCycle > 0.45;
    const gestBlend = isGesturing ? Math.min(1.0, (gestureCycle - 0.45) / 0.25) : 0;
    const smoothGest = gestBlend * gestBlend * (3 - 2 * gestBlend);

    if (kvLeftArmRef.current) {
      kvLeftArmRef.current.rotation.x = kvLeftArmX;
      kvLeftArmRef.current.rotation.y = isGreeting ? 0 : THREE.MathUtils.lerp(0, 0.22, smoothGest);
      kvLeftArmRef.current.rotation.z = kvLeftArmZ;
    }
    if (kvLeftForearmRef.current) {
      // Natural resting flex 18-24° (-0.35 rad) with subtle breathing and conversational open-palm
      const baseElbowX = isWalking ? -0.22 : THREE.MathUtils.lerp(-0.35 + breatheWave * 0.03, -0.52, smoothGest);
      const baseElbowY = THREE.MathUtils.lerp(-0.04, 0.16, smoothGest);
      const baseElbowZ = THREE.MathUtils.lerp(0.05, 0.10, smoothGest);
      kvLeftForearmRef.current.rotation.x = THREE.MathUtils.lerp(baseElbowX, -0.15, isGreeting ? greetingBell : 0);
      kvLeftForearmRef.current.rotation.y = baseElbowY;
      kvLeftForearmRef.current.rotation.z = baseElbowZ;
    }
    if (kvLeftWristRef.current) {
      kvLeftWristRef.current.rotation.x = THREE.MathUtils.lerp(0.06 + talkSub * 0.02, 0.14, smoothGest);
      kvLeftWristRef.current.rotation.z = THREE.MathUtils.lerp(0.04, 0.09, smoothGest);
    }

    if (kvRightArmRef.current) {
      kvRightArmRef.current.rotation.x = kvRightArmX;
      kvRightArmRef.current.rotation.z = kvRightArmZ;
    }
    if (kvRightForearmRef.current) {
      kvRightForearmRef.current.rotation.x = -1.25 + breatheWave * 0.025;
      kvRightForearmRef.current.rotation.y = 0.20 + vocalPulse * 0.02;
    }
    if (kvRightWristRef.current) {
      kvRightWristRef.current.rotation.x = vocalPulse * 0.03;
      kvRightWristRef.current.rotation.z = breatheWave * 0.015;
    }

    if (nhLeftArmRef.current) {
      nhLeftArmRef.current.rotation.x = nhLeftArmX;
      nhLeftArmRef.current.rotation.z = nhLeftArmZ;
    }
    if (nhLeftForearmRef.current) {
      nhLeftForearmRef.current.rotation.x = -1.25 + breatheWave * 0.025;
      nhLeftForearmRef.current.rotation.y = -0.20 - vocalPulse * 0.02;
    }
    if (nhLeftWristRef.current) {
      nhLeftWristRef.current.rotation.x = vocalPulse * 0.03;
      nhLeftWristRef.current.rotation.z = -breatheWave * 0.015;
    }

    if (nhRightArmRef.current) {
      nhRightArmRef.current.rotation.x = nhRightArmX;
      nhRightArmRef.current.rotation.y = isGreeting ? 0 : THREE.MathUtils.lerp(0, -0.20, smoothGest);
      nhRightArmRef.current.rotation.z = nhRightArmZ;
    }
    if (nhRightForearmRef.current) {
      // Natural resting flex 18-24° (-0.36 rad) with subtle breathing and conversational open-palm
      const baseElbowX = isWalking ? -0.22 : THREE.MathUtils.lerp(-0.36 + breatheWave * 0.03, -0.50, smoothGest);
      const baseElbowY = THREE.MathUtils.lerp(0.04, -0.15, smoothGest);
      const baseElbowZ = THREE.MathUtils.lerp(-0.06, -0.10, smoothGest);
      nhRightForearmRef.current.rotation.x = THREE.MathUtils.lerp(baseElbowX, -0.15, isGreeting ? greetingBell : 0);
      nhRightForearmRef.current.rotation.y = baseElbowY;
      nhRightForearmRef.current.rotation.z = baseElbowZ;
    }
    if (nhRightWristRef.current) {
      nhRightWristRef.current.rotation.x = THREE.MathUtils.lerp(0.06 - talkSub * 0.02, 0.14, smoothGest);
      nhRightWristRef.current.rotation.z = THREE.MathUtils.lerp(-0.05, -0.08, smoothGest);
    }
  });

  return (
    <group>
      {/* ── KHÁNH VY (Female Presenter - Stylized Realism VTV) ── */}
      <group ref={kvRef} position={[3.35, 0.14, -7.11]} rotation={[0, -0.25, 0]}>
        {/* ── CRANIOFACIAL ANATOMY (Feminine Vietnamese Proportions: Smooth, graceful) ── */}
        {/* 1. Cranial Vault */}
        <mesh position={[0, 1.445, 0.000]} scale={[0.96, 1.02, 0.98]}>
          <sphereGeometry args={[0.072, 28, 28]} />
          <primitive object={kvSkinMat} attach="material" />
        </mesh>

        {/* 2. Soft Midface & Cheekbones */}
        <mesh position={[0, 1.412, 0.008]} scale={[0.95, 0.90, 0.95]}>
          <sphereGeometry args={[0.066, 24, 24]} />
          <primitive object={kvSkinMat} attach="material" />
        </mesh>

        {/* 3. Slender Tapered Feminine Jawline */}
        <mesh position={[0, 1.385, 0.010]} rotation={[0.04, 0, 0]}>
          <cylinderGeometry args={[0.040, 0.026, 0.048, 20]} />
          <primitive object={kvSkinMat} attach="material" />
        </mesh>

        {/* 4. Soft Natural Rounded Chin */}
        <mesh position={[0, 1.365, 0.025]}>
          <sphereGeometry args={[0.012, 16, 16]} />
          <primitive object={kvSkinMat} attach="material" />
        </mesh>

        {/* 5. Sculpted Left & Right Ears */}
        <SculptedEar
          position={[-0.070, 1.425, -0.005]}
          rotation={[0, -0.15, 0.05]}
          skinMat={kvSkinMat}
          isLeft={true}
          scale={0.90}
        />
        <SculptedEar
          position={[0.070, 1.425, -0.005]}
          rotation={[0, 0.15, -0.05]}
          skinMat={kvSkinMat}
          isLeft={false}
          scale={0.90}
        />

        {/* ── MULTI-LAYERED VOLUMETRIC BRUNETTE HAIR (Graceful flowing locks, NO helmet look) ── */}
        {/* Layer 1: Cranial Base Hair Dome with front volume */}
        <mesh position={[0, 1.455, -0.005]} scale={[1.08, 1.06, 1.06]}>
          <sphereGeometry args={[0.076, 28, 28]} />
          <primitive object={kvHairMat} attach="material" />
        </mesh>
        {/* Layer 2: Curtain Fringe across Forehead */}
        <mesh position={[0, 1.468, 0.055]} rotation={[0.08, 0, 0]}>
          <capsuleGeometry args={[0.007, 0.056, 6, 12]} />
          <primitive object={kvHairMat} attach="material" />
        </mesh>
        {/* Layer 3: Left Face-Framing Flowing Side Locks */}
        <mesh position={[-0.068, 1.410, 0.010]} rotation={[0.06, 0, -0.08]}>
          <capsuleGeometry args={[0.013, 0.10, 8, 14]} />
          <primitive object={kvHairMat} attach="material" />
        </mesh>
        <mesh position={[-0.060, 1.325, 0.018]} rotation={[0.12, 0, -0.04]}>
          <capsuleGeometry args={[0.012, 0.12, 8, 14]} />
          <primitive object={kvHairMat} attach="material" />
        </mesh>
        {/* Layer 4: Right Face-Framing Flowing Side Locks */}
        <mesh position={[0.068, 1.410, 0.010]} rotation={[0.06, 0, 0.08]}>
          <capsuleGeometry args={[0.013, 0.10, 8, 14]} />
          <primitive object={kvHairMat} attach="material" />
        </mesh>
        <mesh position={[0.060, 1.325, 0.018]} rotation={[0.12, 0, 0.04]}>
          <capsuleGeometry args={[0.012, 0.12, 8, 14]} />
          <primitive object={kvHairMat} attach="material" />
        </mesh>
        {/* Layer 5: Long Cascading Rear Hair down back of neck */}
        <mesh position={[0, 1.320, -0.035]} scale={[0.85, 1.0, 0.55]}>
          <cylinderGeometry args={[0.048, 0.068, 0.22, 18]} />
          <primitive object={kvHairMat} attach="material" />
        </mesh>

        {/* ── EXPRESSIVE RADIANT FACIAL FEATURES ── */}
        <ProceduralEye
          position={[-0.026, 1.430, 0.067]}
          scale={0.92}
          isLeft={true}
          skinColor="#fae5d3"
        />
        <ProceduralEye
          position={[0.026, 1.430, 0.067]}
          scale={0.92}
          isLeft={false}
          skinColor="#fae5d3"
        />

        {/* Elegant Curved Eyebrows */}
        <mesh position={[-0.026, 1.448, 0.068]} rotation={[0, 0, 0.06]}>
          <boxGeometry args={[0.024, 0.0032, 0.004]} />
          <meshStandardMaterial color="#281912" roughness={0.8} />
        </mesh>
        <mesh position={[0.026, 1.448, 0.068]} rotation={[0, 0, -0.06]}>
          <boxGeometry args={[0.024, 0.0032, 0.004]} />
          <meshStandardMaterial color="#281912" roughness={0.8} />
        </mesh>

        {/* Procedural 3D Nose */}
        <ProceduralNose
          position={[0, 1.405, 0.067]}
          skinMat={kvSkinMat}
          scale={0.88}
          width={0.90}
          length={0.92}
        />

        {/* Procedural 3D Mouth (Radiant Smile: Philtrum exactly 1.0cm below nose tip, full width ~4.6cm) */}
        <ProceduralMouth
          position={[0, 1.391, 0.068]}
          scale={0.92}
          lipColor="#c24b60"
          smile={0.08}
          openSmile={true}
        />

        {/* Signature Delicate Titanium Wireframe Eyeglasses (Pantos rounded-rectangle) */}
        <group position={[0, 1.430, 0.070]}>
          <mesh position={[-0.026, 0, 0]} scale={[1.12, 0.90, 1.0]}>
            <torusGeometry args={[0.0125, 0.00045, 10, 24]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.12} />
          </mesh>
          <mesh position={[0.026, 0, 0]} scale={[1.12, 0.90, 1.0]}>
            <torusGeometry args={[0.0125, 0.00045, 10, 24]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.12} />
          </mesh>
          <mesh position={[0, 0.001, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.00045, 0.00045, 0.008, 6]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.12} />
          </mesh>
          <mesh position={[-0.039, 0, -0.035]} rotation={[Math.PI / 2, 0, 0.15]}>
            <cylinderGeometry args={[0.00045, 0.00045, 0.070, 6]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.12} />
          </mesh>
          <mesh position={[0.039, 0, -0.035]} rotation={[Math.PI / 2, 0, -0.15]}>
            <cylinderGeometry args={[0.00045, 0.00045, 0.070, 6]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.12} />
          </mesh>
        </group>

        {/* Slender Natural Upright Neck (bare skin under chin is only 2.5cm!) */}
        <mesh position={[0, 1.348, -0.004]} rotation={[0.01, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.029, 0.030, 20]} />
          <primitive object={kvSkinMat} attach="material" />
        </mesh>

        {/* ── TAILORED FEMALE BROADCAST SUIT BLAZER (Royal Wine Burgundy #831843) ── */}
        <mesh geometry={kvTorsoGeom} material={kvBlazerMat} />

        {/* Silk Blouse Collar Band wrapping neck base */}
        <mesh position={[0, 1.328, 0.010]} material={kvBlouseMat}>
          <cylinderGeometry args={[0.031, 0.035, 0.022, 22]} />
        </mesh>
        {/* Inner Crisp Silk Blouse V-Neck Accent */}
        <mesh position={[0, 1.310, 0.052]} material={kvBlouseMat}>
          <boxGeometry args={[0.022, 0.032, 0.003]} />
        </mesh>

        {/* Peaked Blazer Lapels */}
        <mesh position={[-0.038, 1.225, 0.062]} rotation={[0.15, -0.08, 0.14]}>
          <boxGeometry args={[0.020, 0.090, 0.003]} />
          <meshStandardMaterial
            color="#6b1437"
            roughness={0.35}
            emissive={new THREE.Color("#831843")}
            emissiveIntensity={0.12}
          />
        </mesh>
        <mesh position={[0.038, 1.225, 0.062]} rotation={[0.15, 0.08, -0.14]}>
          <boxGeometry args={[0.020, 0.090, 0.003]} />
          <meshStandardMaterial
            color="#6b1437"
            roughness={0.35}
            emissive={new THREE.Color("#831843")}
            emissiveIntensity={0.12}
          />
        </mesh>

        {/* Single Tailored Blazer Button Closure */}
        <mesh position={[0, 1.08, 0.064]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.0035, 0.0035, 0.004, 10]} />
          <meshStandardMaterial color="#fcd34d" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* ── SEAMLESS SUIT SLEEVES & HANDS (Seamless Fabric Sleeves, ZERO Ball Joints!) ── */}
        {/* Left Arm Group (Shoulder Pivot at [-0.142, 1.24, 0.005]) - Natural Presenter Stance along body */}
        <group position={[-0.142, 1.24, 0.005]}>
          <group ref={kvLeftArmRef}>
            {/* Seamless anatomical shoulder cap */}
            <mesh position={[0, 0, 0]} material={kvBlazerMat}>
              <sphereGeometry args={[0.033, 14, 14]} />
            </mesh>
            {/* Upper arm hangs naturally down along side of body */}
            <group rotation={[-0.08, 0, 0.06]}>
              <mesh position={[0, -0.09, 0]} material={kvBlazerMat}>
                <cylinderGeometry args={[0.032, 0.026, 0.18, 16]} />
              </mesh>
              {/* Seamless anatomical elbow joint */}
              <group position={[0, -0.18, 0]}>
                <mesh position={[0, 0, 0]} material={kvBlazerMat}>
                  <sphereGeometry args={[0.026, 14, 14]} />
                </mesh>
                {/* Forearm hangs gracefully down with subtle natural curve */}
                <group ref={kvLeftForearmRef} rotation={[-0.12, -0.04, 0.05]}>
                  <mesh position={[0, -0.07, 0]} material={kvBlazerMat}>
                    <cylinderGeometry args={[0.026, 0.022, 0.14, 16]} />
                  </mesh>
                  {/* White Blouse Cuff */}
                  <mesh position={[0, -0.14, 0]} material={kvBlouseMat}>
                    <cylinderGeometry args={[0.024, 0.024, 0.016, 16]} />
                  </mesh>
                  {/* Sculpted Hand & Cue Card wrapped in Wrist Joint */}
                  <group ref={kvLeftWristRef} position={[0, -0.155, 0]}>
                    <VietnameseHand
                      position={[0, 0, 0]}
                      rotation={[0, 0, 0.04]}
                      scale={0.88}
                      skinMat={kvSkinMat}
                      isLeft={true}
                      mode="hang"
                    />
                    {/* Olympia Broadcast Cue Card / Script Folder (Kẹp kịch bản MC) */}
                    <group position={[0.012, -0.005, 0.032]} rotation={[0.42, 0.10, -0.16]}>
                      <mesh>
                        <boxGeometry args={[0.13, 0.18, 0.004]} />
                        <meshStandardMaterial color="#0f172a" roughness={0.35} metalness={0.15} />
                      </mesh>
                      <mesh position={[0, 0.088, 0.002]}>
                        <boxGeometry args={[0.128, 0.004, 0.002]} />
                        <meshStandardMaterial color="#f59e0b" roughness={0.2} metalness={0.8} />
                      </mesh>
                      <mesh position={[0, -0.005, 0.0025]}>
                        <boxGeometry args={[0.116, 0.160, 0.001]} />
                        <meshStandardMaterial color="#f8fafc" roughness={0.6} />
                      </mesh>
                    </group>
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>

        {/* Right Arm Group (Shoulder Pivot at [0.142, 1.24, 0.005]) holding Broadcast Microphone */}
        <group position={[0.142, 1.24, 0.005]}>
          <group ref={kvRightArmRef}>
            {/* Seamless anatomical shoulder cap */}
            <mesh position={[0, 0, 0]} material={kvBlazerMat}>
              <sphereGeometry args={[0.033, 14, 14]} />
            </mesh>
            {/* Upper arm hangs down and slightly forward */}
            <group rotation={[-0.20, -0.04, -0.10]}>
              <mesh position={[0, -0.09, 0]} material={kvBlazerMat}>
                <cylinderGeometry args={[0.032, 0.026, 0.18, 16]} />
              </mesh>
              {/* Seamless anatomical elbow joint */}
              <group position={[0, -0.18, 0]}>
                <mesh position={[0, 0, 0]} material={kvBlazerMat}>
                  <sphereGeometry args={[0.026, 14, 14]} />
                </mesh>
                {/* Forearm bends forward (-X) and inward to hold mic upright in front of sternum */}
                <group ref={kvRightForearmRef} rotation={[-1.25, 0.20, -0.32]}>
                  <mesh position={[0, -0.07, 0]} material={kvBlazerMat}>
                    <cylinderGeometry args={[0.026, 0.022, 0.14, 16]} />
                  </mesh>
                  {/* White Blouse Cuff */}
                  <mesh position={[0, -0.14, 0]} material={kvBlouseMat}>
                    <cylinderGeometry args={[0.024, 0.024, 0.016, 16]} />
                  </mesh>
                  {/* Sculpted Hand holding Microphone wrapped in Wrist Joint */}
                  <group ref={kvRightWristRef} position={[0, -0.155, 0]}>
                    <VietnameseHand
                      position={[0, 0, 0]}
                      rotation={[-0.10, 0.10, 0]}
                      scale={0.88}
                      skinMat={kvSkinMat}
                      isLeft={false}
                      mode="mic"
                    />
                    {/* Studio Microphone held firmly IN HAND at sternum height */}
                    <group position={[0, -0.035, 0.015]} rotation={[0.35, 0, 0]}>
                      <mesh>
                        <cylinderGeometry args={[0.0065, 0.0045, 0.11, 14]} />
                        <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
                      </mesh>
                      <mesh position={[0, 0.055, 0]}>
                        <cylinderGeometry args={[0.0075, 0.0075, 0.005, 14]} />
                        <meshStandardMaterial color="#fcd34d" metalness={0.8} roughness={0.2} />
                      </mesh>
                      <mesh position={[0, 0.068, 0]}>
                        <sphereGeometry args={[0.0115, 16, 16]} />
                        <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.3} />
                      </mesh>
                    </group>
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>

        {/* Tailored Dark Trousers / Waist (Under blazer hem, Hips Y = 0.72m to 0.84m) */}
        <mesh position={[0, 0.77, 0]}>
          <boxGeometry args={[0.24, 0.14, 0.15]} />
          <meshStandardMaterial color="#0f172a" roughness={0.85} />
        </mesh>

        {/* Left & Right Walking Legs (Golden Ratio: Sole rests flush at Y=0.00m local, NO stilts!) */}
        <group ref={kvLeftLegRef} position={[-0.062, 0.72, 0]}>
          <mesh position={[0, -0.16, 0]}>
            <cylinderGeometry args={[0.052, 0.042, 0.32, 16]} />
            <meshStandardMaterial color="#0f172a" roughness={0.85} />
          </mesh>
          <group ref={kvLeftKneeRef} position={[0, -0.32, 0]}>
            <mesh position={[0, -0.16, 0]}>
              <cylinderGeometry args={[0.042, 0.034, 0.32, 16]} />
              <meshStandardMaterial color="#0f172a" roughness={0.85} />
            </mesh>
            {/* Pointed Pump Heel (Sole flush at Y = 0.00m local) */}
            <mesh position={[0, -0.34, 0.02]}>
              <boxGeometry args={[0.048, 0.036, 0.13]} />
              <meshStandardMaterial color="#020617" roughness={0.25} metalness={0.4} />
            </mesh>
          </group>
        </group>
        <group ref={kvRightLegRef} position={[0.062, 0.72, 0]}>
          <mesh position={[0, -0.16, 0]}>
            <cylinderGeometry args={[0.052, 0.042, 0.32, 16]} />
            <meshStandardMaterial color="#0f172a" roughness={0.85} />
          </mesh>
          <group ref={kvRightKneeRef} position={[0, -0.32, 0]}>
            <mesh position={[0, -0.16, 0]}>
              <cylinderGeometry args={[0.042, 0.034, 0.32, 16]} />
              <meshStandardMaterial color="#0f172a" roughness={0.85} />
            </mesh>
            {/* Pointed Pump Heel (Sole flush at Y = 0.00m local) */}
            <mesh position={[0, -0.34, 0.02]}>
              <boxGeometry args={[0.048, 0.036, 0.13]} />
              <meshStandardMaterial color="#020617" roughness={0.25} metalness={0.4} />
            </mesh>
          </group>
        </group>
      </group>

      {/* ── NGỌC HUY (Male Presenter - Metallic Bronze Suit #b88a44) ── */}
      <group ref={nhRef} position={[2.89, 0.14, -7.22]} rotation={[0, -0.25, 0]}>
        {/* ── CRANIOFACIAL ANATOMY (Masculine Vietnamese Proportions: Handsome, defined jaw) ── */}
        {/* 1. Cranial Vault */}
        <mesh position={[0, 1.515, 0.000]} scale={[0.96, 1.04, 1.00]}>
          <sphereGeometry args={[0.076, 28, 28]} />
          <primitive object={nhSkinMat} attach="material" />
        </mesh>

        {/* 2. Soft Midface & Cheekbones */}
        <mesh position={[0, 1.480, 0.008]} scale={[0.96, 0.90, 0.96]}>
          <sphereGeometry args={[0.070, 24, 24]} />
          <primitive object={nhSkinMat} attach="material" />
        </mesh>

        {/* 3. Defined Masculine Jawline */}
        <mesh position={[0, 1.455, 0.010]} rotation={[0.04, 0, 0]}>
          <cylinderGeometry args={[0.046, 0.032, 0.050, 20]} />
          <primitive object={nhSkinMat} attach="material" />
        </mesh>

        {/* 4. Defined Natural Masculine Chin */}
        <mesh position={[0, 1.438, 0.026]}>
          <sphereGeometry args={[0.014, 16, 16]} />
          <primitive object={nhSkinMat} attach="material" />
        </mesh>

        {/* 5. Sculpted Left & Right Ears */}
        <SculptedEar
          position={[-0.074, 1.495, -0.005]}
          rotation={[0, -0.20, 0.05]}
          skinMat={nhSkinMat}
          isLeft={true}
          scale={1.00}
        />
        <SculptedEar
          position={[0.074, 1.495, -0.005]}
          rotation={[0, 0.20, -0.05]}
          skinMat={nhSkinMat}
          isLeft={false}
          scale={1.00}
        />

        {/* ── MULTI-LAYERED VOLUMETRIC SIDE-PART POMPADOUR / QUIFF (PBR Matte Sheen) ── */}
        {/* Layer 1: Cranial Base Hair Dome with front volume */}
        <mesh position={[0, 1.540, -0.008]} scale={[1.02, 1.05, 1.04]}>
          <sphereGeometry args={[0.082, 28, 28]} />
          <primitive object={nhHairMat} attach="material" />
        </mesh>
        {/* Layer 2: Natural Side-Part Hair Sweep */}
        <mesh position={[0.012, 1.565, 0.018]} rotation={[-0.10, 0.08, -0.08]}>
          <capsuleGeometry args={[0.022, 0.085, 8, 14]} />
          <primitive object={nhHairMat} attach="material" />
        </mesh>
        {/* Layer 3: Tapered Temples */}
        <mesh position={[-0.068, 1.530, 0.018]} rotation={[0, 0, -0.15]}>
          <capsuleGeometry args={[0.014, 0.055, 6, 8]} />
          <primitive object={nhHairMat} attach="material" />
        </mesh>
        <mesh position={[0.068, 1.530, 0.018]} rotation={[0, 0, 0.15]}>
          <capsuleGeometry args={[0.014, 0.055, 6, 8]} />
          <primitive object={nhHairMat} attach="material" />
        </mesh>

        {/* ── EXPRESSIVE MASCULINE FACIAL FEATURES ── */}
        <ProceduralEye
          position={[-0.028, 1.500, 0.067]}
          scale={0.96}
          isLeft={true}
          skinColor="#f2c49c"
        />
        <ProceduralEye
          position={[0.028, 1.500, 0.067]}
          scale={0.96}
          isLeft={false}
          skinColor="#f2c49c"
        />

        {/* Masculine Defined Eyebrows */}
        <mesh position={[-0.028, 1.520, 0.070]} rotation={[0, 0, 0.08]}>
          <boxGeometry args={[0.027, 0.0045, 0.005]} />
          <meshStandardMaterial color="#171412" roughness={0.8} />
        </mesh>
        <mesh position={[0.028, 1.520, 0.070]} rotation={[0, 0, -0.08]}>
          <boxGeometry args={[0.027, 0.0045, 0.005]} />
          <meshStandardMaterial color="#171412" roughness={0.8} />
        </mesh>

        {/* Procedural 3D Nose */}
        <ProceduralNose
          position={[0, 1.474, 0.070]}
          skinMat={nhSkinMat}
          scale={0.94}
          width={0.96}
          length={0.96}
        />

        {/* Procedural 3D Mouth (Natural Confident Smile: Philtrum 1.2cm below nose tip, subtle masculine lips) */}
        <ProceduralMouth
          position={[0, 1.458, 0.070]}
          scale={0.96}
          lipColor="#a45e4e"
          smile={0.07}
          openSmile={true}
        />

        {/* Natural Upright Masculine Neck (bare skin under chin is only 2.8cm!) */}
        <mesh position={[0, 1.418, -0.004]} rotation={[0.01, 0, 0]}>
          <cylinderGeometry args={[0.028, 0.033, 0.032, 20]} />
          <primitive object={nhSkinMat} attach="material" />
        </mesh>

        {/* ── TAILORED METALLIC BRONZE BROADCAST SUIT JACKET (#b88a44) ── */}
        <mesh geometry={nhTorsoGeom} material={nhBlazerMat} />

        {/* Shirt Collar Band wrapping neck base */}
        <mesh position={[0, 1.398, 0.010]} material={nhShirtMat}>
          <cylinderGeometry args={[0.035, 0.040, 0.024, 24]} />
        </mesh>
        {/* Inner Crisp White Dress Shirt & Folded Collar Points */}
        <mesh position={[-0.022, 1.390, 0.062]} rotation={[0.16, -0.12, 0.20]} material={nhShirtMat}>
          <boxGeometry args={[0.022, 0.036, 0.003]} />
        </mesh>
        <mesh position={[0.022, 1.390, 0.062]} rotation={[0.16, 0.12, -0.20]} material={nhShirtMat}>
          <boxGeometry args={[0.022, 0.036, 0.003]} />
        </mesh>

        {/* Dark Navy Silk Tie Knot & Tapered Tie Body */}
        <mesh position={[0, 1.388, 0.065]}>
          <boxGeometry args={[0.018, 0.020, 0.004]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} />
        </mesh>
        <mesh position={[0, 1.265, 0.068]} rotation={[0.05, 0, 0]}>
          <boxGeometry args={[0.020, 0.220, 0.003]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} />
        </mesh>

        {/* Notched Suit Lapels (matching suit fabric color for seamless luxury look) */}
        <mesh position={[-0.044, 1.250, 0.070]} rotation={[0.16, -0.08, 0.12]}>
          <boxGeometry args={[0.024, 0.110, 0.003]} />
          <meshStandardMaterial
            color="#9c7538"
            roughness={0.42}
            metalness={0.28}
            emissive={new THREE.Color("#b88a44")}
            emissiveIntensity={0.12}
          />
        </mesh>
        <mesh position={[0.044, 1.250, 0.070]} rotation={[0.16, 0.08, -0.12]}>
          <boxGeometry args={[0.024, 0.110, 0.003]} />
          <meshStandardMaterial
            color="#9c7538"
            roughness={0.42}
            metalness={0.28}
            emissive={new THREE.Color("#b88a44")}
            emissiveIntensity={0.12}
          />
        </mesh>

        {/* Left Chest Welt Pocket with Folded White Silk Pocket Square */}
        <mesh position={[-0.072, 1.270, 0.078]}>
          <boxGeometry args={[0.032, 0.005, 0.002]} />
          <meshStandardMaterial
            color="#9c7538"
            roughness={0.42}
            emissive={new THREE.Color("#b88a44")}
            emissiveIntensity={0.12}
          />
        </mesh>
        <mesh position={[-0.072, 1.278, 0.080]} rotation={[0.1, 0, 0.15]} material={nhShirtMat}>
          <coneGeometry args={[0.006, 0.012, 3]} />
        </mesh>

        {/* Two-Button Front Suit Closure */}
        <mesh position={[0, 1.15, 0.072]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.0038, 0.0038, 0.004, 12]} />
          <meshStandardMaterial color="#fcd34d" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0, 1.07, 0.070]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.0038, 0.0038, 0.004, 12]} />
          <meshStandardMaterial color="#fcd34d" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* ── SEAMLESS SUIT SLEEVES & HANDS (Seamless Fabric Sleeves, ZERO Ball Joints!) ── */}
        {/* Left Arm Group (Shoulder Pivot at [-0.165, 1.28, 0.005]) holding Microphone */}
        <group position={[-0.165, 1.28, 0.005]}>
          <group ref={nhLeftArmRef}>
            {/* Seamless anatomical shoulder cap */}
            <mesh position={[0, 0, 0]} material={nhBlazerMat}>
              <sphereGeometry args={[0.039, 14, 14]} />
            </mesh>
            {/* Upper arm hangs naturally down and slightly forward */}
            <group rotation={[-0.22, 0.05, 0.12]}>
              <mesh position={[0, -0.10, 0]} material={nhBlazerMat}>
                <cylinderGeometry args={[0.038, 0.032, 0.20, 16]} />
              </mesh>
              {/* Seamless anatomical elbow joint */}
              <group position={[0, -0.20, 0]}>
                <mesh position={[0, 0, 0]} material={nhBlazerMat}>
                  <sphereGeometry args={[0.032, 14, 14]} />
                </mesh>
                {/* Forearm bends forward (-X) and inward to hold mic upright in front of sternum */}
                <group ref={nhLeftForearmRef} rotation={[-1.25, -0.20, 0.35]}>
                  <mesh position={[0, -0.075, 0]} material={nhBlazerMat}>
                    <cylinderGeometry args={[0.032, 0.026, 0.15, 16]} />
                  </mesh>
                  {/* White Shirt Cuff & Watch */}
                  <mesh position={[0, -0.15, 0]} material={nhShirtMat}>
                    <cylinderGeometry args={[0.028, 0.028, 0.018, 16]} />
                  </mesh>
                  <mesh position={[0, -0.15, 0.022]} rotation={[0.4, 0.1, 0]}>
                    <cylinderGeometry args={[0.014, 0.014, 0.006, 16]} />
                    <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.1} />
                  </mesh>
                  {/* Sculpted Hand holding Microphone wrapped in Wrist Joint */}
                  <group ref={nhLeftWristRef} position={[0, -0.165, 0]}>
                    <VietnameseHand
                      position={[0, 0, 0]}
                      rotation={[-0.10, -0.10, 0]}
                      scale={0.94}
                      skinMat={nhSkinMat}
                      isLeft={true}
                      mode="mic"
                    />
                    {/* Studio Microphone held firmly IN HAND at sternum height */}
                    <group position={[0, -0.035, 0.015]} rotation={[0.35, 0, 0]}>
                      <mesh>
                        <cylinderGeometry args={[0.007, 0.005, 0.12, 14]} />
                        <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
                      </mesh>
                      <mesh position={[0, 0.060, 0]}>
                        <cylinderGeometry args={[0.008, 0.008, 0.005, 14]} />
                        <meshStandardMaterial color="#e2e8f0" metalness={0.8} roughness={0.2} />
                      </mesh>
                      <mesh position={[0, 0.075, 0]}>
                        <sphereGeometry args={[0.0125, 16, 16]} />
                        <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.3} />
                      </mesh>
                    </group>
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>

        {/* Right Arm Group (Shoulder Pivot at [0.165, 1.28, 0.005]) - Natural Presenter Stance along body (NO TABLET!) */}
        <group position={[0.165, 1.28, 0.005]}>
          <group ref={nhRightArmRef}>
            {/* Seamless anatomical shoulder cap */}
            <mesh position={[0, 0, 0]} material={nhBlazerMat}>
              <sphereGeometry args={[0.039, 14, 14]} />
            </mesh>
            {/* Upper arm hangs down along flank */}
            <group rotation={[-0.06, 0, -0.06]}>
              <mesh position={[0, -0.10, 0]} material={nhBlazerMat}>
                <cylinderGeometry args={[0.038, 0.032, 0.20, 16]} />
              </mesh>
              {/* Seamless anatomical elbow joint */}
              <group position={[0, -0.20, 0]}>
                <mesh position={[0, 0, 0]} material={nhBlazerMat}>
                  <sphereGeometry args={[0.032, 14, 14]} />
                </mesh>
                {/* Forearm hangs naturally down beside trousers */}
                <group ref={nhRightForearmRef} rotation={[-0.10, 0.04, -0.06]}>
                  <mesh position={[0, -0.075, 0]} material={nhBlazerMat}>
                    <cylinderGeometry args={[0.032, 0.026, 0.15, 16]} />
                  </mesh>
                  {/* White Shirt Cuff */}
                  <mesh position={[0, -0.15, 0]} material={nhShirtMat}>
                    <cylinderGeometry args={[0.028, 0.028, 0.018, 16]} />
                  </mesh>
                  {/* Sculpted Hand & Cue Card wrapped in Wrist Joint */}
                  <group ref={nhRightWristRef} position={[0, -0.165, 0]}>
                    <VietnameseHand
                      position={[0, 0, 0]}
                      rotation={[0, 0, -0.05]}
                      scale={0.94}
                      skinMat={nhSkinMat}
                      isLeft={false}
                      mode="hang"
                    />
                    {/* Olympia Broadcast Cue Card / Script Folder (Kẹp kịch bản MC) */}
                    <group position={[-0.012, -0.005, 0.032]} rotation={[0.42, -0.10, 0.16]}>
                      <mesh>
                        <boxGeometry args={[0.135, 0.185, 0.004]} />
                        <meshStandardMaterial color="#0f172a" roughness={0.35} metalness={0.15} />
                      </mesh>
                      <mesh position={[0, 0.090, 0.002]}>
                        <boxGeometry args={[0.132, 0.004, 0.002]} />
                        <meshStandardMaterial color="#f59e0b" roughness={0.2} metalness={0.8} />
                      </mesh>
                      <mesh position={[0, -0.005, 0.0025]}>
                        <boxGeometry args={[0.120, 0.165, 0.001]} />
                        <meshStandardMaterial color="#f8fafc" roughness={0.6} />
                      </mesh>
                    </group>
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>

        {/* Tailored Dark Obsidian Trousers / Waist (Under jacket skirt, Hips Y = 0.74m to 0.86m) */}
        <mesh position={[0, 0.79, 0]}>
          <boxGeometry args={[0.26, 0.14, 0.16]} />
          <meshStandardMaterial color="#0f172a" roughness={0.85} />
        </mesh>

        {/* Left & Right Walking Legs (Golden Ratio: Sole rests flush at Y=0.00m local, NO stilts!) */}
        <group ref={nhLeftLegRef} position={[-0.068, 0.74, 0]}>
          <mesh position={[0, -0.17, 0]}>
            <cylinderGeometry args={[0.058, 0.048, 0.34, 16]} />
            <meshStandardMaterial color="#0f172a" roughness={0.85} />
          </mesh>
          <group ref={nhLeftKneeRef} position={[0, -0.34, 0]}>
            <mesh position={[0, -0.17, 0]}>
              <cylinderGeometry args={[0.048, 0.040, 0.34, 16]} />
              <meshStandardMaterial color="#0f172a" roughness={0.85} />
            </mesh>
            {/* Leather Dress Oxford Shoe (Sole flush at Y = 0.00m local) */}
            <mesh position={[0, -0.36, 0.03]}>
              <boxGeometry args={[0.054, 0.042, 0.15]} />
              <meshStandardMaterial color="#020617" roughness={0.25} metalness={0.35} />
            </mesh>
          </group>
        </group>
        <group ref={nhRightLegRef} position={[0.068, 0.74, 0]}>
          <mesh position={[0, -0.17, 0]}>
            <cylinderGeometry args={[0.058, 0.048, 0.34, 16]} />
            <meshStandardMaterial color="#0f172a" roughness={0.85} />
          </mesh>
          <group ref={nhRightKneeRef} position={[0, -0.34, 0]}>
            <mesh position={[0, -0.17, 0]}>
              <cylinderGeometry args={[0.048, 0.040, 0.34, 16]} />
              <meshStandardMaterial color="#0f172a" roughness={0.85} />
            </mesh>
            {/* Leather Dress Oxford Shoe (Sole flush at Y = 0.00m local) */}
            <mesh position={[0, -0.36, 0.03]}>
              <boxGeometry args={[0.054, 0.042, 0.15]} />
              <meshStandardMaterial color="#020617" roughness={0.25} metalness={0.35} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

/**
 * Calculates exact physical stair tread elevation for the contestant entrance walkway:
 * - Top Plinth (Z >= 11.90m): Y = 1.84m (Door arch landing)
 * - Upper Flight (6 steps, 10.70m <= Z < 11.90m): Y descends from 1.84m to 0.92m across discrete treads
 * - Mid-Stairs Landing / Bục Giữa (9.70m <= Z < 10.70m): Y = 0.92m (Flat stage landing)
 * - Lower Flight (6 steps, 8.50m <= Z < 9.70m): Y descends from 0.90m to 0.22m across discrete treads
 * - Dais Floor (Z < 8.50m): Y = 0.22m (Flat studio floor - eliminates mid-air floating!)
 */
export function getGrandstandStairY(z: number): number {
  if (z >= 11.90) return 1.84;
  if (z < 8.50) return 0.22;
  if (z >= 9.70 && z <= 10.70) return 0.92;

  // Upper flight (6 steps descending from Z=11.90 to 10.70, step depth 0.20m)
  if (z > 10.70) {
    const upperTreads = [
      { zMax: 11.90, zMin: 11.70, yTop: 1.84, yBottom: 1.687 },
      { zMax: 11.70, zMin: 11.50, yTop: 1.687, yBottom: 1.533 },
      { zMax: 11.50, zMin: 11.30, yTop: 1.533, yBottom: 1.380 },
      { zMax: 11.30, zMin: 11.10, yTop: 1.380, yBottom: 1.227 },
      { zMax: 11.10, zMin: 10.90, yTop: 1.227, yBottom: 1.073 },
      { zMax: 10.90, zMin: 10.70, yTop: 1.073, yBottom: 0.920 },
    ];
    for (const step of upperTreads) {
      if (z >= step.zMin && z <= step.zMax) {
        const u = (step.zMax - z) / (step.zMax - step.zMin);
        if (u < 0.60) {
          return step.yTop;
        } else {
          const stepDownP = (u - 0.60) / 0.40;
          const easeDown = stepDownP * stepDownP * (3 - 2 * stepDownP);
          return THREE.MathUtils.lerp(step.yTop, step.yBottom, easeDown);
        }
      }
    }
    return 1.073;
  }

  // Lower flight (6 steps descending from Z=9.70 to 8.50, step depth 0.20m)
  const lowerTreads = [
    { zMax: 9.70, zMin: 9.50, yTop: 0.90, yBottom: 0.750 },
    { zMax: 9.50, zMin: 9.30, yTop: 0.750, yBottom: 0.600 },
    { zMax: 9.30, zMin: 9.10, yTop: 0.600, yBottom: 0.450 },
    { zMax: 9.10, zMin: 8.90, yTop: 0.450, yBottom: 0.300 },
    { zMax: 8.90, zMin: 8.70, yTop: 0.300, yBottom: 0.220 },
    { zMax: 8.70, zMin: 8.50, yTop: 0.220, yBottom: 0.220 },
  ];
  for (const step of lowerTreads) {
    if (z >= step.zMin && z <= step.zMax) {
      const u = (step.zMax - z) / (step.zMax - step.zMin);
      if (u < 0.60) {
        return step.yTop;
      } else {
        const stepDownP = (u - 0.60) / 0.40;
        const easeDown = stepDownP * stepDownP * (3 - 2 * stepDownP);
        return THREE.MathUtils.lerp(step.yTop, step.yBottom, easeDown);
      }
    }
  }

  return 0.22;
}

/**
 * Evaluates the full continuous 3D trajectory, velocity-aligned rotY, synchronized walkPhase,
 * and bounce for a walking contestant during the entrance sequence.
 */
export function evaluateContestantEntranceTrajectory(
  t: number,
  seatId: number,
  targetCfg: { pos: [number, number, number]; rotY: number },
  firstPhi: number = 0.38
) {
  const deskRotY = targetCfg ? targetCfg.rotY : 0;
  const deskX = targetCfg ? targetCfg.pos[0] - Math.sin(deskRotY) * 0.42 : -3.0;
  const deskY = targetCfg ? targetCfg.pos[1] : 0.22;
  const deskZ = targetCfg ? targetCfg.pos[2] - Math.cos(deskRotY) * 0.42 : -3.5;

  // Outer aisle behind podium desk (R = 7.75m from (0, -0.5m)):
  // Podiums are placed along the arc centered at (0, -0.5m)
  const relX = targetCfg ? targetCfg.pos[0] : -6.0;
  const relZ = targetCfg ? targetCfg.pos[2] - (-0.5) : -2.5;
  const targetPhi = Math.atan2(-relZ, -relX); // target podium polar angle

  // Rear corridor radius (between podium backs at R=7.02m and Science Wall at R=8.60m)
  const aisleRadius = 7.75;

  // Outer left corridor entry point (dynamically placed in front of first podium)
  const entryPhi = Math.min(0.20, firstPhi - 0.06);
  const entryAisleX = -aisleRadius * Math.cos(entryPhi);
  const entryAisleZ = -0.5 - aisleRadius * Math.sin(entryPhi);

  // Aisle waypoint directly behind the contestant's assigned desk
  const targetAisleX = -aisleRadius * Math.cos(targetPhi);
  const targetAisleZ = -0.5 - aisleRadius * Math.sin(targetPhi);

  // Smooth wide sweep waypoint from bottom of stairs across dais floor towards left corridor mouth
  const daisSweepX = -5.20;
  const daisSweepZ = 2.50;

  // Door side selection for contestants (alternating or seat-based):
  // TS 1 (seat 0) & TS 3 (seat 2): emerge from Door Left (X = +1.15m, Z = 12.85m)
  // TS 2 (seat 1) & TS 4 (seat 3) & TS 5 (seat 4): emerge from Door Right (X = -1.15m, Z = 12.85m)
  const isDoorLeft = seatId % 2 === 0;
  const doorX = isDoorLeft ? 1.15 : -1.15;
  const doorZ = 12.85;

  const startX = doorX;
  const startY = 1.84;
  const startZ = doorZ;

  let curX = startX;
  let curY = startY;
  let curZ = startZ;
  let curRotY = Math.PI; // Facing towards camera (-Z)
  let walkingNow = true;
  let curGesture: "none" | "wave" | "fist_pump" | "heart" | "open_arms" | "desk_bow" = "none";
  let curGestureProg = 0;
  let vel = 0;

  // Phase 1 (0.0 -> 0.6s): Steps out from behind side arch door, curving onto central aisle on top plinth (11.90m)
  if (t < 0.6) {
    const p = t / 0.6;
    const smoothP = p * p * (3 - 2 * p);
    curX = THREE.MathUtils.lerp(doorX, 0, smoothP);
    curY = startY;
    curZ = THREE.MathUtils.lerp(doorZ, 11.90, smoothP);
    curRotY = THREE.MathUtils.lerp(isDoorLeft ? Math.PI - 0.35 : Math.PI + 0.35, Math.PI, smoothP);
    const dp_dt = 6 * p * (1 - p) / 0.6;
    vel = Math.hypot(-doorX, 11.90 - doorZ) * dp_dt;
  } else if (t < 1.8) {
    // Phase 2 (0.6 -> 1.8s): Walks down upper stairs (1.2s) to mid-stairs landing platform ("Bục Giữa" Z = 10.20m, Y = 0.92m)
    const p = (t - 0.6) / 1.2;
    curX = 0;
    curZ = THREE.MathUtils.lerp(11.90, 10.20, p);
    curY = getGrandstandStairY(curZ);
    curRotY = Math.PI;
    vel = (11.90 - 10.20) / 1.2;
  } else if (t < 3.0) {
    // Phase 3 (1.8 -> 3.0s): Stands firmly on Bục Giữa & performs signature gesture (1.2s)
    curX = 0;
    curY = 0.92;
    curZ = 10.20;
    curRotY = Math.PI;
    walkingNow = false;
    const signatureGestures: Array<"wave" | "fist_pump" | "heart" | "open_arms"> = [
      "wave",
      "fist_pump",
      "heart",
      "open_arms",
    ];
    curGesture = signatureGestures[seatId % signatureGestures.length];
    curGestureProg = Math.max(0, Math.min(1.0, (t - 1.8) / 1.2));
    vel = 0;
  } else if (t < 4.0) {
    // Phase 4 (3.0 -> 4.0s): Walks down lower stairs to dais floor (1.0s, arrives at dais floor Z = 6.20m, Y = 0.22m at exactly t = 4.0s)
    const p = (t - 3.0) / 1.0;
    curX = 0;
    curZ = THREE.MathUtils.lerp(10.20, 6.20, p);
    curY = getGrandstandStairY(curZ);
    curRotY = Math.PI;
    vel = (10.20 - 6.20) / 1.0;
  } else if (t < 6.5) {
    // Phase 5 (4.0 -> 6.5s): Smooth continuous trajectory across dais to assigned podium (2.5s uninterrupted walk)
    // Replaces disjoint 5A, 5B, 5C with a single continuous C1-smooth parametric curve
    const u = (t - 4.0) / 2.5; // Normalized progress 0 -> 1

    // Calibrated smooth forward progression across dais floor with moderated peak velocity (Delta P < 0.25m everywhere)
    const s = 1.04 * u + 0.42 * u * u + 0.04 * u * u * u - 0.50 * u * u * u * u;
    const invS = 1 - s;

    // P0 = [0, 0.22, 6.20] (bottom of lower stairs)
    const p0x = 0.00;
    const p0z = 6.20;
    // P1 = [0, 0.22, 3.80] (start tangent along -Z, guaranteeing initial heading rotY = Math.PI at t = 4.0s, zero rotational snap!)
    const p1x = 0.00;
    const p1z = 3.80;
    // P2 = [-7.75 * Math.cos(sweepAngle), 0.22, rawP2Z]
    const sweepAngle = targetPhi <= 0.25
      ? targetPhi * 0.70
      : Math.max(0.18, targetPhi - 0.22);
    const rawP2X = -7.75 * Math.cos(sweepAngle);
    const p2x = Math.max(targetAisleX, rawP2X);
    const rawP2Z = -0.5 - 7.75 * Math.sin(sweepAngle);
    const p2z = Math.min(targetAisleZ + 1.20, rawP2Z);
    // P3 = [targetAisleX, 0.22, targetAisleZ] (aisle point behind desk)
    const p3x = targetAisleX;
    const p3z = targetAisleZ;
    // P4 = [deskX, 0.22, deskZ] (desk standing position)
    const p4x = deskX;
    const p4z = deskZ;

    // Quartic Bézier evaluation across s in [0, 1]
    const s2 = s * s;
    const s3 = s2 * s;
    const s4 = s3 * s;
    const iU = invS;
    const iU2 = iU * iU;
    const iU3 = iU2 * iU;
    const iU4 = iU3 * iU;

    const posX = iU4 * p0x + 4 * iU3 * s * p1x + 6 * iU2 * s2 * p2x + 4 * iU * s3 * p3x + s4 * p4x;
    const posZ = iU4 * p0z + 4 * iU3 * s * p1z + 6 * iU2 * s2 * p2z + 4 * iU * s3 * p3z + s4 * p4z;

    const tanX = 4 * iU3 * (p1x - p0x) + 12 * iU2 * s * (p2x - p1x) + 12 * iU * s2 * (p3x - p2x) + 4 * s3 * (p4x - p3x);
    const tanZ = 4 * iU3 * (p1z - p0z) + 12 * iU2 * s * (p2z - p1z) + 12 * iU * s2 * (p3z - p2z) + 4 * s3 * (p4z - p3z);

    const ds_du = 1.04 + 0.84 * u + 0.12 * u * u - 2.00 * u * u * u;
    vel = Math.hypot(tanX, tanZ) * (ds_du / 2.5);

    curX = posX;
    curY = 0.22;
    curZ = posZ;

    // Continuous velocity-aligned rotation: compute moveAngle = Math.atan2(tanX, tanZ);
    // blend smoothly into deskRotY as u approaches 1 (u > 0.82). Zero 90° turns!
    const rawMoveAngle = Math.atan2(tanX, tanZ);
    const moveAngle = rawMoveAngle < 0 ? rawMoveAngle + 2 * Math.PI : rawMoveAngle;
    if (u > 0.82) {
      const blendP = (u - 0.82) / 0.18;
      const easeBlend = blendP * blendP * (3 - 2 * blendP);
      let diff = (deskRotY - moveAngle) % (2 * Math.PI);
      if (diff > Math.PI) diff -= 2 * Math.PI;
      if (diff < -Math.PI) diff += 2 * Math.PI;
      curRotY = moveAngle + diff * easeBlend;
    } else {
      curRotY = moveAngle;
    }
  } else {
    // Phase 6 (6.5 -> 6.8s): Arrived and standing proudly behind desk with desk greeting bow (0.3s)
    curX = deskX;
    curY = deskY;
    curZ = deskZ;
    curRotY = deskRotY;
    walkingNow = false;
    curGesture = "desk_bow";
    curGestureProg = Math.max(0, Math.min(1.0, (t - 6.5) / 0.3));
    vel = 0;
  }

  // Synchronize walking stride and vertical bounce to a single frequency (omega = 8.5 rad/s, natural pace):
  const walkPhase = walkingNow ? t * 8.5 : 0;
  const bounce = walkingNow ? Math.abs(Math.sin(walkPhase)) * 0.032 : 0;

  return {
    pos: [curX, curY + bounce, curZ] as [number, number, number],
    rawPos: [curX, curY, curZ] as [number, number, number],
    rotY: curRotY,
    walkingNow,
    gesture: curGesture,
    gestureProg: curGestureProg,
    bounce,
    walkPhase,
    vel,
  };
}

function SingleContestantEntranceWalkingFigure({
  seatId,
  seatStart,
  targetCfg,
  firstPhi = 0.38,
  serverNow,
}: {
  seatId: number;
  seatStart: number;
  targetCfg: {
    seatId: number;
    pos: [number, number, number];
    rotY: number;
  };
  firstPhi?: number;
  serverNow?: () => number;
}) {
  const figureRef = useRef<THREE.Group>(null);
  const [isWalking, setIsWalking] = useState(true);
  const [gesture, setGesture] = useState<"none" | "wave" | "fist_pump" | "heart" | "open_arms" | "desk_bow">("none");
  const gestureProgressRef = useRef<number>(0);
  const walkPhaseRef = useRef<number>(0);

  const getNow = serverNow || (() => Date.now());

  useFrame(() => {
    const g = figureRef.current;
    if (!g) return;

    const now = getNow();
    const t = Math.max(0, (now - seatStart) / 1000);

    const traj = evaluateContestantEntranceTrajectory(t, seatId, targetCfg, firstPhi);

    if (traj.walkingNow !== isWalking) {
      setIsWalking(traj.walkingNow);
    }
    if (traj.gesture !== gesture) {
      setGesture(traj.gesture);
    }
    gestureProgressRef.current = traj.gestureProg;
    walkPhaseRef.current = traj.walkPhase;

    g.visible = true;
    g.position.set(traj.pos[0], traj.pos[1], traj.pos[2]);
    g.rotation.y = traj.rotY;
  });

  return (
    <group ref={figureRef}>
      <ContestantFigure
        seatId={seatId}
        position={[0, 0, 0]}
        isWalking={isWalking}
        walkPhaseRef={walkPhaseRef}
        gesture={gesture}
        gestureProgressRef={gestureProgressRef}
      />
    </group>
  );
}

export function ContestantEntranceWalkingFigures({
  state,
  contestantConfigs,
  serverNow,
}: {
  state: OlympiaState;
  contestantConfigs: Array<{
    seatId: number;
    pos: [number, number, number];
    rotY: number;
  }>;
  serverNow?: () => number;
}) {
  const entrance = state.entranceState;
  if (!entrance || !entrance.active) return null;

  const getNow = serverNow || (() => Date.now());
  const now = getNow();
  const currentSeat = entrance.currentSeatIdx ?? 0;
  const startTimes = entrance.seatStartTimes || [];

  // Concurrently render all active walking contestants whose elapsed walk time is < 6.8s
  const activeFigures: Array<{
    seatId: number;
    seatStart: number;
    targetCfg: { seatId: number; pos: [number, number, number]; rotY: number };
  }> = [];

  for (let i = 0; i < contestantConfigs.length; i++) {
    const seatStart =
      startTimes[i] ??
      (i === currentSeat
        ? entrance.seatStartedAt || entrance.startedAt
        : (entrance.startedAt || now) + i * 4000);

    const elapsed = (now - seatStart) / 1000;
    // Render figure once walk has started; stays at desk seamlessly until entire entrance sequence concludes
    if (elapsed >= 0) {
      activeFigures.push({
        seatId: i,
        seatStart,
        targetCfg: contestantConfigs[i],
      });
    }
  }

  const firstCfg = contestantConfigs[0];
  const firstPhi = firstCfg?.rotY != null
    ? (Math.PI / 2 - firstCfg.rotY)
    : 0.38;

  return (
    <group>
      {activeFigures.map((fig) => (
        <SingleContestantEntranceWalkingFigure
          key={fig.seatId}
          seatId={fig.seatId}
          seatStart={fig.seatStart}
          targetCfg={fig.targetCfg}
          firstPhi={firstPhi}
          serverNow={serverNow}
        />
      ))}
    </group>
  );
}

/**
 * Creates the high-resolution golden Olympia laurel wreath canvas decal for the stage floor.
 */
function createStageLaurelWreathCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, 1024, 1024);
  const cx = 512;
  const cy = 512;

  // Outer glowing aura
  const auraGrad = ctx.createRadialGradient(cx, cy, 300, cx, cy, 490);
  auraGrad.addColorStop(0, "rgba(255, 215, 0, 0.22)");
  auraGrad.addColorStop(0.5, "rgba(245, 158, 11, 0.10)");
  auraGrad.addColorStop(1, "rgba(245, 158, 11, 0)");
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 490, 0, Math.PI * 2);
  ctx.fill();

  const radius = 350;
  const numLeaves = 14;

  const drawLeaf = (x: number, y: number, angle: number, size: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    const leafGrad = ctx.createLinearGradient(0, -size * 0.4, 0, size * 0.4);
    leafGrad.addColorStop(0, "#fffbeb");
    leafGrad.addColorStop(0.3, "#fef08a");
    leafGrad.addColorStop(0.7, "#f59e0b");
    leafGrad.addColorStop(1, "#b45309");

    ctx.fillStyle = leafGrad;
    ctx.shadowColor = "rgba(245, 158, 11, 0.8)";
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.moveTo(0, -size * 0.5);
    ctx.bezierCurveTo(size * 0.4, -size * 0.2, size * 0.35, size * 0.3, 0, size * 0.5);
    ctx.bezierCurveTo(-size * 0.35, size * 0.3, -size * 0.4, -size * 0.2, 0, -size * 0.5);
    ctx.fill();

    // Central vein
    ctx.strokeStyle = "rgba(255, 255, 255, 0.65)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.4);
    ctx.lineTo(0, size * 0.4);
    ctx.stroke();

    ctx.restore();
  };

  // Draw Laurel Leaves on both sides
  for (let i = 0; i < numLeaves; i++) {
    const t = i / (numLeaves - 1);
    // Left branch
    const leftPhi = Math.PI * 0.65 + t * Math.PI * 0.85;
    const lx = cx + Math.cos(leftPhi) * (radius - Math.sin(t * Math.PI) * 20);
    const ly = cy + Math.sin(leftPhi) * (radius * 0.88);
    drawLeaf(lx, ly, leftPhi + Math.PI / 2 + 0.2, 54);

    // Right branch
    const rightPhi = Math.PI * 0.35 - t * Math.PI * 0.85;
    const rx = cx + Math.cos(rightPhi) * (radius - Math.sin(t * Math.PI) * 20);
    const ry = cy + Math.sin(rightPhi) * (radius * 0.88);
    drawLeaf(rx, ry, rightPhi - Math.PI / 2 - 0.2, 54);
  }

  // Stems
  ctx.strokeStyle = "#d97706";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.85, Math.PI * 0.65, Math.PI * 1.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.85, -Math.PI * 0.5, Math.PI * 0.35);
  ctx.stroke();

  // Central base ribbon
  ctx.fillStyle = "#f59e0b";
  ctx.beginPath();
  ctx.arc(cx, cy + radius * 0.85, 20, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

/**
 * VeDichCenterPodium:
 * Standing console / podium for contestant in Round 4 (Về Đích),
 * placed proudly in the center of the illuminated circular stage.
 * Features:
 * - Weighted chrome architectural pedestal base.
 * - Sleek white/silver vertical column with glowing Olympia red contour line.
 * - Angled top console with buzzer button and control surface.
 * - Gooseneck broadcast microphone.
 */
/**
 * VeDichCenterPodium:
 * Standing console / podium for contestant in Round 4 (Về Đích),
 * placed proudly in the center of the illuminated circular stage.
 * Dynamic broadcast lighting:
 * - When stage is RED (active answering / buzz / steal): illuminates in intense crimson red.
 * - When stage is BLUE (choosing package / reviewing / idle): illuminates in official cyan/blue.
 * Features:
 * - Weighted chrome architectural pedestal base.
 * - Sleek white/silver vertical column with dynamic glowing LED contour line.
 * - Angled top console with buzzer button and control surface.
 * - Gooseneck broadcast microphone.
 */
function VeDichCenterPodium({ isRed = false }: { isRed?: boolean }) {
  const accentColor = isRed ? "#ef4444" : "#00f0ff";
  const glowIntensity = isRed ? 1.4 : 0.8;
  const buttonColor = isRed ? "#ef4444" : "#00f0ff";

  return (
    <group position={[0, 0, 0]}>
      {/* 1. Heavy Chrome Base Rim (Y = 0.015) */}
      <mesh position={[0, 0.015, 0]}>
        <cylinderGeometry args={[0.26, 0.30, 0.030, 32]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.15} />
      </mesh>
      {/* 2. Inner Dynamic Accent Ring on Base (Red / Cyan based on stage state) */}
      <mesh position={[0, 0.032, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.006, 32]} />
        <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.6 * glowIntensity} />
      </mesh>

      {/* 3. Sleek Architectural Column */}
      <mesh position={[0, 0.46, 0]}>
        <cylinderGeometry args={[0.075, 0.11, 0.86, 24]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.3} metalness={0.2} />
      </mesh>
      {/* Front Glowing Dynamic LED Ribbon along column */}
      <mesh position={[0, 0.46, 0.088]}>
        <boxGeometry args={[0.024, 0.82, 0.008]} />
        <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={1.2 * glowIntensity} />
      </mesh>

      {/* 4. Console Neck Joint */}
      <mesh position={[0, 0.90, 0]}>
        <cylinderGeometry args={[0.09, 0.075, 0.04, 20]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} />
      </mesh>

      {/* 5. Angled Top Console tilted 16° towards contestant */}
      <group position={[0, 0.93, -0.02]} rotation={[-0.28, 0, 0]}>
        {/* Main console body */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.34, 0.035, 0.24]} />
          <meshStandardMaterial color="#ffffff" roughness={0.25} />
        </mesh>
        {/* Charcoal Upper Bezel */}
        <mesh position={[0, 0.020, 0]}>
          <boxGeometry args={[0.30, 0.006, 0.20]} />
          <meshStandardMaterial color="#0f172a" roughness={0.5} />
        </mesh>
        {/* Dynamic Glowing Perimeter Trim */}
        <mesh position={[0, 0.018, 0.11]}>
          <boxGeometry args={[0.32, 0.008, 0.006]} />
          <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={1.5 * glowIntensity} />
        </mesh>

        {/* Central Buzzer Button */}
        <mesh position={[0, 0.026, 0.04]}>
          <cylinderGeometry args={[0.035, 0.038, 0.014, 20]} />
          <meshStandardMaterial color={buttonColor} emissive={buttonColor} emissiveIntensity={0.8 * glowIntensity} roughness={0.3} />
        </mesh>
        {/* Buzzer Chrome Ring */}
        <mesh position={[0, 0.024, 0.04]}>
          <torusGeometry args={[0.042, 0.004, 8, 20]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.1} />
        </mesh>

        {/* Gooseneck Microphone stem */}
        <mesh position={[-0.10, 0.08, 0.05]} rotation={[0.4, 0.2, 0]}>
          <cylinderGeometry args={[0.004, 0.004, 0.14, 10]} />
          <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Microphone capsule */}
        <mesh position={[-0.08, 0.15, 0.09]} rotation={[0.4, 0.2, 0]}>
          <capsuleGeometry args={[0.009, 0.025, 6, 10]} />
          <meshStandardMaterial color="#1e293b" roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * VeDichWalkingContestant:
 * Animates the active contestant in Round 4 (Về Đích) walking smoothly from their home
 * desk podium along the curved studio floor to the center stage podium (over ~3.8s).
 * - During active question play / thinking: stands proudly at the center podium.
 * - When their turn finishes (seatDone): walks smoothly back to their home desk.
 * - All other 3 contestants remain permanently standing at their own desks!
 */
export function VeDichWalkingContestant({
  seatId,
  homePos,
  homeRotY,
  state,
  serverNow,
  quality,
}: {
  seatId: number;
  homePos: [number, number, number];
  homeRotY: number;
  state?: OlympiaState | null;
  serverNow?: () => number;
  quality?: "HIGH" | "MEDIUM" | "LIGHT";
}) {
  const rootRef = useRef<THREE.Group>(null);
  const [isWalking, setIsWalking] = useState(false);

  // Track phase entry and turn timing
  const lastStateRef = useRef<{ turnIdx: number; phase: string; startedAt: number }>({
    turnIdx: -1,
    phase: "",
    startedAt: 0,
  });

  const targetCenterPos: [number, number, number] = [0.0, 0.188, -0.90];

  useFrame(() => {
    const vd = state?.veDich;
    const curTurn = vd?.turnIdx ?? 0;
    const curPhase = vd?.phase ?? "idle";
    const now = serverNow ? serverNow() : Date.now();

    if (curTurn !== lastStateRef.current.turnIdx || curPhase !== lastStateRef.current.phase) {
      lastStateRef.current = {
        turnIdx: curTurn,
        phase: curPhase,
        startedAt: now,
      };
    }

    const elapsed = Math.max(0, now - lastStateRef.current.startedAt) / 1000;
    const DURATION = 3.8;

    let walkProgress = 1.0;
    let walkingNow = false;
    let isReturning = false;

    if (curPhase === "seatDone") {
      isReturning = true;
      if (elapsed < DURATION) {
        const raw = elapsed / DURATION;
        walkProgress = 1.0 - raw * raw * (3 - 2 * raw);
        walkingNow = true;
      } else {
        walkProgress = 0.0;
        walkingNow = false;
      }
    } else if (curPhase !== "idle") {
      if (elapsed < DURATION) {
        const raw = elapsed / DURATION;
        walkProgress = raw * raw * (3 - 2 * raw);
        walkingNow = true;
      } else {
        walkProgress = 1.0;
        walkingNow = false;
      }
    } else {
      walkProgress = 0.0;
      walkingNow = false;
    }

    if (isWalking !== walkingNow) {
      setIsWalking(walkingNow);
    }

    // Trajectory Bézier Curve:
    // P0: Desk standing position (behind desk)
    const p0x = homePos[0] - 0.42 * Math.sin(homeRotY);
    const p0y = 0.22;
    const p0z = homePos[2] - 0.42 * Math.cos(homeRotY);

    // P1: Stepping outward into aisle
    const p1x = p0x + 0.85 * Math.cos(homeRotY - Math.PI / 2);
    const p1y = 0.22;
    const p1z = p0z + 0.85 * Math.sin(homeRotY - Math.PI / 2);

    // P2: Smooth approach curve toward center dais
    const p2x = -0.45;
    const p2y = 0.20;
    const p2z = -1.65;

    // P3: Standing position behind center podium
    const p3x = targetCenterPos[0];
    const p3y = targetCenterPos[1];
    const p3z = targetCenterPos[2];

    const u = Math.max(0, Math.min(1.0, walkProgress));
    const inv = 1 - u;
    const w0 = inv * inv * inv;
    const w1 = 3 * inv * inv * u;
    const w2 = 3 * inv * u * u;
    const w3 = u * u * u;

    const curX = w0 * p0x + w1 * p1x + w2 * p2x + w3 * p3x;
    const curY = w0 * p0y + w1 * p1y + w2 * p2y + w3 * p3y;
    const curZ = w0 * p0z + w1 * p1z + w2 * p2z + w3 * p3z;

    const dX = 3 * inv * inv * (p1x - p0x) + 6 * inv * u * (p2x - p1x) + 3 * u * u * (p3x - p2x);
    const dZ = 3 * inv * inv * (p1z - p0z) + 6 * inv * u * (p2z - p1z) + 3 * u * u * (p3z - p2z);

    let rotY = 0;
    if (isReturning) {
      const walkAngle = Math.atan2(-dX, -dZ);
      if (u < 0.15) {
        rotY = THREE.MathUtils.lerp(walkAngle, homeRotY, (0.15 - u) / 0.15);
      } else {
        rotY = THREE.MathUtils.lerp(0, walkAngle, Math.min(1.0, (1.0 - u) / 0.15));
      }
    } else {
      const walkAngle = Math.atan2(dX, dZ);
      if (u > 0.85) {
        rotY = THREE.MathUtils.lerp(walkAngle, 0, (u - 0.85) / 0.15);
      } else {
        rotY = THREE.MathUtils.lerp(homeRotY, walkAngle, Math.min(1.0, u / 0.15));
      }
    }

    const bounce = walkingNow ? Math.abs(Math.sin(u * Math.PI * 14)) * 0.024 : 0;

    if (rootRef.current) {
      rootRef.current.position.set(curX, curY + bounce, curZ);
      rootRef.current.rotation.y = rotY;
    }
  });

  return (
    <group ref={rootRef} position={targetCenterPos}>
      <ContestantFigure
        seatId={seatId}
        quality={quality}
        position={[0, 0, 0]}
        isWalking={isWalking}
      />
    </group>
  );
}

/**
 * CenterFloorStage:
 * Dedicated Interactive Central Stage for Olympia 26:
 * - Concentric polished chrome outer rim (R = 2.25m).
 * - Multi-ring LED broadcast strips with dynamic BLUE / RED stage color transitions.
 * - Ultra-gloss dark reflective center floor disc (R = 1.40m, #030712).
 * - Horizontal Golden Laurel Wreath Floor Decal (R = 1.15m):
 *   - Rounds 1-3 (Khởi Động, VCNV, Tăng Tốc): Stationary with subtle breathing aura.
 *   - Round 4 (Về Đích): Continuously rotating in real-time at 0.35 rad/s!
 * - Entry Animation Effect (Tia sáng / Radiant light rays expanding outward from center on room entry).
/**
 * Procedural Soft Glow & Volumetric Gradient Texture Helpers
 * Cached as singletons to ensure zero runtime GC overhead in 60fps frame loop
 */
/**
 * Procedural Optical Flare & Low Ground Reflection Texture Helpers
 * Cached as singletons to ensure zero runtime GC overhead in 60fps frame loop
 */
let _opticalFlareTex: THREE.CanvasTexture | null = null;
function getRealisticOpticalFlareTexture(): THREE.CanvasTexture {
  if (_opticalFlareTex) return _opticalFlareTex;
  if (typeof document === "undefined") return new THREE.CanvasTexture({} as any);
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const cx = size / 2;
    const cy = size / 2;
    // 1. Broad Optical Flare Multi-stop Radial Gradient (Pure White Core -> Fiery Amber -> Crimson Ruby -> Transparent)
    const radGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cx);
    radGrad.addColorStop(0.00, "rgba(255, 255, 255, 1.0)");
    radGrad.addColorStop(0.12, "rgba(255, 245, 230, 0.98)");
    radGrad.addColorStop(0.25, "rgba(255, 80, 50, 0.95)");
    radGrad.addColorStop(0.42, "rgba(239, 68, 68, 0.82)");
    radGrad.addColorStop(0.65, "rgba(185, 28, 28, 0.42)");
    radGrad.addColorStop(0.85, "rgba(127, 29, 29, 0.12)");
    radGrad.addColorStop(1.00, "rgba(127, 29, 29, 0.0)");
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, size, size);

    // 2. Subtle Horizontal Anamorphic Lens Flare Streak (Smooth Gaussian in both X and Y)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1.0, 0.08); // Flatten vertically into a thin anamorphic streak
    const streakGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, cx);
    streakGrad.addColorStop(0.0, "rgba(255, 255, 255, 0.95)");
    streakGrad.addColorStop(0.25, "rgba(255, 160, 120, 0.65)");
    streakGrad.addColorStop(0.60, "rgba(255, 60, 60, 0.25)");
    streakGrad.addColorStop(1.0, "rgba(255, 0, 0, 0.0)");
    ctx.fillStyle = streakGrad;
    ctx.beginPath();
    ctx.arc(0, 0, cx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  _opticalFlareTex = new THREE.CanvasTexture(canvas);
  _opticalFlareTex.wrapS = THREE.ClampToEdgeWrapping;
  _opticalFlareTex.wrapT = THREE.ClampToEdgeWrapping;
  return _opticalFlareTex;
}

let _lowGroundReflectionTex: THREE.CanvasTexture | null = null;
function getLowGroundReflectionTexture(): THREE.CanvasTexture {
  if (_lowGroundReflectionTex) return _lowGroundReflectionTex;
  if (typeof document === "undefined") return new THREE.CanvasTexture({} as any);
  const width = 128;
  const height = 128;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;
    for (let y = 0; y < height; y++) {
      // v = 0 at bottom (floor contact), 1 at top (~0.50m)
      const v = (height - 1 - y) / (height - 1);
      // Fast exponential decay: Intense right above floor, decaying sharply to zero before top
      const vertAtten = Math.pow(Math.max(0, 1.0 - v), 2.8);
      for (let x = 0; x < width; x++) {
        const u = x / (width - 1);
        const dx = (u - 0.5) * 2.0;
        // Horizontal Cosine Bell Profile (Anti-flat, smooth feathered boundaries)
        const horizHaze = Math.max(0, Math.cos(dx * (Math.PI * 0.5)));
        const alphaVal = Math.round(255 * vertAtten * Math.pow(horizHaze, 1.8));
        const idx = (y * width + x) * 4;
        data[idx] = 255;
        data[idx + 1] = 235;
        data[idx + 2] = 230;
        data[idx + 3] = alphaVal;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }
  _lowGroundReflectionTex = new THREE.CanvasTexture(canvas);
  _lowGroundReflectionTex.wrapS = THREE.ClampToEdgeWrapping;
  _lowGroundReflectionTex.wrapT = THREE.ClampToEdgeWrapping;
  return _lowGroundReflectionTex;
}

// Backwards-compatibility alias
function getRealisticBeamTexture(): THREE.CanvasTexture {
  return getLowGroundReflectionTexture();
}

let _softRadialGlowTex: THREE.CanvasTexture | null = null;
function getSoftRadialGlowTexture(): THREE.CanvasTexture {
  if (_softRadialGlowTex) return _softRadialGlowTex;
  if (typeof document === "undefined") return new THREE.CanvasTexture({} as any);
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0.0, "rgba(255, 255, 255, 1.0)");
    grad.addColorStop(0.20, "rgba(255, 255, 255, 0.90)");
    grad.addColorStop(0.48, "rgba(255, 255, 255, 0.38)");
    grad.addColorStop(0.75, "rgba(255, 255, 255, 0.10)");
    grad.addColorStop(1.0, "rgba(255, 255, 255, 0.0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  _softRadialGlowTex = new THREE.CanvasTexture(canvas);
  return _softRadialGlowTex;
}

/**
 * Dynamic 6-Second Tech Floor Graphic (Sân khấu công nghệ vòng tròn trung tâm - VTV3 Parity):
 * - Multi-layer Organic Blending: Đa tầng năng lượng hòa quyện đan xen (Images 3-5).
 * - Core Cyan Disc pulses & breathes in scale and opacity with soft radial falloff.
 * - Staggered concentric ripple waves expand outward from center with soft alpha fading.
 * - 4 Quadrant Arcs modulate independent opacities (phase-shifted sines) and cross-fade cyan/sky-blue.
 */
function CenterTechFloorGraphic({
  introStartedAt,
  serverNow,
}: {
  introStartedAt: number | null;
  serverNow?: () => number;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const coreGroupRef = useRef<THREE.Group>(null);
  const corePulseRef = useRef<THREE.MeshBasicMaterial>(null);
  const centerWhiteMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const primaryArcsRef = useRef<THREE.Group>(null);
  const secondaryArcsRef = useRef<THREE.Group>(null);
  const ripple1Ref = useRef<THREE.Mesh>(null);
  const ripple1MatRef = useRef<THREE.MeshBasicMaterial>(null);
  const ripple2Ref = useRef<THREE.Mesh>(null);
  const ripple2MatRef = useRef<THREE.MeshBasicMaterial>(null);

  const softGlowTex = useMemo(() => getSoftRadialGlowTexture(), []);

  useFrame((state) => {
    let targetOp = 0.0;
    if (introStartedAt != null) {
      const now = serverNow ? serverNow() : Date.now();
      const elapsedSec = (now - introStartedAt) / 1000;
      if (elapsedSec >= 3.0 && elapsedSec < 9.5) {
        // 3.0s - 9.5s (exact 6.5s duration): Tech graphic is prominently displayed (Images 3-5)
        targetOp = 1.0;
      } else if (elapsedSec >= 9.5 && elapsedSec < 10.3) {
        // 9.5s - 10.3s (0.8s): Fades to ambient as laurel returns
        const fadeT = (elapsedSec - 9.5) / 0.8;
        targetOp = 1.0 - fadeT * 0.6;
      } else if (elapsedSec >= 10.3) {
        targetOp = 0.4;
      }
    }

    if (rootRef.current) {
      rootRef.current.visible = targetOp > 0.001;
    }
    if (targetOp <= 0.001) return;

    const nowSec = serverNow ? serverNow() / 1000 : state.clock.getElapsedTime();
    const rotPrimary = (((nowSec * 0.65) % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
    const rotSecondary = (((-nowSec * 0.42) % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);

    // 1. Nhấp nháy nhẹ (Electronic Shimmer / High-frequency LED glint)
    const shimmer = 0.88 + 0.12 * Math.sin(nowSec * 17.5) * Math.cos(nowSec * 6.5);

    // 2. Zoom & Co giãn hữu cơ (Organic Breathing Pulsation)
    const breathScale = 1.0 + 0.12 * Math.sin(nowSec * 2.3);
    const arcZoomScale = 1.0 + 0.06 * Math.sin(nowSec * 1.85);

    if (coreGroupRef.current) {
      coreGroupRef.current.scale.set(breathScale, breathScale, 1);
    }
    if (corePulseRef.current) {
      corePulseRef.current.opacity = (0.62 + 0.32 * Math.sin(nowSec * 2.5)) * shimmer * targetOp;
    }
    if (centerWhiteMatRef.current) {
      centerWhiteMatRef.current.opacity = (0.85 + 0.15 * Math.sin(nowSec * 3.0)) * shimmer * targetOp;
    }

    // 3. Sóng xung kích lan tỏa (Continuous Concentric Energy Ripples with soft fade)
    const wave1 = (nowSec * 0.45) % 1.0;
    const wave2 = (nowSec * 0.45 + 0.5) % 1.0;
    if (ripple1Ref.current) {
      const s1 = 0.40 + wave1 * 0.95;
      ripple1Ref.current.scale.set(s1, s1, 1);
    }
    if (ripple1MatRef.current) {
      ripple1MatRef.current.opacity = (1.0 - wave1) * 0.75 * shimmer * targetOp;
    }
    if (ripple2Ref.current) {
      const s2 = 0.40 + wave2 * 0.95;
      ripple2Ref.current.scale.set(s2, s2, 1);
    }
    if (ripple2MatRef.current) {
      ripple2MatRef.current.opacity = (1.0 - wave2) * 0.75 * shimmer * targetOp;
    }

    // 4. Giảm Opacity & Hòa quyện đan xen: 4 Cung phần tư lệch pha sin luân phiên mờ - tỏ
    if (primaryArcsRef.current) {
      primaryArcsRef.current.rotation.z = rotPrimary;
      primaryArcsRef.current.scale.set(arcZoomScale, arcZoomScale, 1);
      const children = primaryArcsRef.current.children;
      for (let i = 0; i < children.length; i++) {
        const mesh = children[i];
        if (mesh instanceof THREE.Mesh && mesh.material) {
          const arcPhase = nowSec * 2.0 + i * (Math.PI * 0.5);
          // Harmonic opacity modulation: Smooth cross-fade between arcs
          const arcOp = (0.25 + 0.68 * Math.pow(Math.sin(arcPhase), 2)) * shimmer * targetOp;
          (mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0.15, Math.min(0.96, arcOp));
        }
      }
    }

    // 5. Cung viền phụ ngoài counter-drifting
    if (secondaryArcsRef.current) {
      secondaryArcsRef.current.rotation.z = rotSecondary;
      const children = secondaryArcsRef.current.children;
      for (let i = 0; i < children.length; i++) {
        const mesh = children[i];
        if (mesh instanceof THREE.Mesh && mesh.material) {
          const arcPhase = -nowSec * 1.6 + i * (Math.PI * 0.66);
          const arcOp = (0.28 + 0.52 * Math.pow(Math.cos(arcPhase), 2)) * shimmer * targetOp;
          (mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0.12, Math.min(0.85, arcOp));
        }
      }
    }
  });

  return (
    <group ref={rootRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0048, 0]}>
      {/* ── 1. GLOWING CYAN CORE DISC WITH WHITE CENTER (Breathing Hologram - Broadcast Parity) ── */}
      <group ref={coreGroupRef} renderOrder={9.65}>
        <mesh renderOrder={9.65}>
          <circleGeometry args={[0.78, 64]} />
          <meshBasicMaterial
            ref={corePulseRef}
            map={softGlowTex}
            color="#00f0ff"
            transparent
            opacity={0.88}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
          />
        </mesh>
        <mesh renderOrder={9.68}>
          <circleGeometry args={[0.38, 48]} />
          <meshBasicMaterial
            ref={centerWhiteMatRef}
            map={softGlowTex}
            color="#e0faff"
            transparent
            opacity={0.80}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
          />
        </mesh>
      </group>

      {/* ── 2. 4 SYMMETRICAL QUADRANT CYAN ARCS (Multi-layer Organic Blending - Image 5 & 6 Parity) ── */}
      <group ref={primaryArcsRef}>
        {[0, 90, 180, 270].map((deg, idx) => (
          <mesh key={deg} rotation={[0, 0, (deg * Math.PI) / 180]} renderOrder={9.72}>
            <ringGeometry args={[0.88, 1.34, 48, 1, 0, (72 * Math.PI) / 180]} />
            <meshBasicMaterial
              color={idx % 2 === 0 ? "#00f0ff" : "#38bdf8"}
              transparent
              opacity={0.85}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              polygonOffset
              polygonOffsetFactor={-2}
              polygonOffsetUnits={-2}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </group>

      {/* ── 3. SECONDARY COUNTER-ROTATING ACCENT ARCS ── */}
      <group ref={secondaryArcsRef}>
        {[45, 165, 285].map((deg) => (
          <mesh key={deg} rotation={[0, 0, (deg * Math.PI) / 180]} renderOrder={9.73}>
            <ringGeometry args={[1.50, 1.62, 36, 1, 0, (48 * Math.PI) / 180]} />
            <meshBasicMaterial
              color="#38bdf8"
              transparent
              opacity={0.70}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              polygonOffset
              polygonOffsetFactor={-2}
              polygonOffsetUnits={-2}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </group>

      {/* ── 4. CONCENTRIC HUD RADAR RINGS & EXPANDING RIPPLE WAVES ── */}
      <mesh renderOrder={9.70}>
        <ringGeometry args={[1.40, 1.44, 64]} />
        <meshBasicMaterial
          color="#00f0ff"
          transparent
          opacity={0.65}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>
      <mesh renderOrder={9.70}>
        <ringGeometry args={[1.70, 1.74, 64]} />
        <meshBasicMaterial
          color="#0284c7"
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>

      {/* Expanding Ripple Wave 1 */}
      <mesh ref={ripple1Ref} renderOrder={9.69}>
        <ringGeometry args={[0.88, 1.34, 64]} />
        <meshBasicMaterial
          ref={ripple1MatRef}
          color="#67e8f9"
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Expanding Ripple Wave 2 */}
      <mesh ref={ripple2Ref} renderOrder={9.69}>
        <ringGeometry args={[0.88, 1.34, 64]} />
        <meshBasicMaterial
          ref={ripple2MatRef}
          color="#38bdf8"
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

/**
 * Procedural Segmented Circular Track Geometry (VTV3 Olympia Racetrack Dashes):
 * Generates radial white dashes/ticks along the outer circumference of the center dais.
 */
function createSegmentedTrackGeometry(
  innerR = 2.24,
  outerR = 2.38,
  count = 36,
  dutyCycle = 0.65
): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  const positions: number[] = [];
  const indices: number[] = [];
  const arcPerStep = (Math.PI * 2) / count;
  const dashArc = arcPerStep * dutyCycle;

  let vIdx = 0;
  for (let i = 0; i < count; i++) {
    const startA = i * arcPerStep;
    const endA = startA + dashArc;
    const steps = 4;
    for (let s = 0; s <= steps; s++) {
      const a = startA + (s / steps) * (endA - startA);
      const cosA = Math.cos(a);
      const sinA = Math.sin(a);
      positions.push(innerR * cosA, innerR * sinA, 0);
      positions.push(outerR * cosA, outerR * sinA, 0);
    }
    for (let s = 0; s < steps; s++) {
      const b = vIdx + s * 2;
      indices.push(b, b + 1, b + 2);
      indices.push(b + 1, b + 3, b + 2);
    }
    vIdx += (steps + 1) * 2;
  }

  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Dynamic Central Floor Intro Effects (Broadcast Reference Parity):
 * 1. 0.0s - 3.0s: Outer laurel rim light beam transitioning from cyan (#00f0ff) to crimson red (#ef4444).
 * 2. 0.4s - 2.5s: Full Floor Optical Flare Burst (R = 2.15m covering dais) + Subtle Low Ground Reflection (~0.5m, narrowing upwards then cut).
 * 3. 3.0s - 9.5s: Laurel wreath temporarily hidden; concentric tech circular sectors/rings displayed (Broadcast Reference Images 4 & 5).
 */
function CentralFloorIntroBurst({
  introStartedAt,
  serverNow,
}: {
  introStartedAt: number | null;
  serverNow?: () => number;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const rimGroupRef = useRef<THREE.Group>(null);
  const rimMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const rimPulse1Ref = useRef<THREE.Mesh>(null);
  const rimPulse2Ref = useRef<THREE.Mesh>(null);

  // Full-floor optical flare group & materials (2D on floor surface)
  const floorRedGroupRef = useRef<THREE.Group>(null);
  const floorRedBloomMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const floorWhiteCoreMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const floorRipple1MatRef = useRef<THREE.MeshBasicMaterial>(null);
  const floorRipple2MatRef = useRef<THREE.MeshBasicMaterial>(null);

  // Low Ground Reflection Group (Strictly ~0.50m sitting on dais floor surface)
  const beamGroupRef = useRef<THREE.Group>(null);
  const beamCoreMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const beamPlasmaMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const beamAuraMatRef = useRef<THREE.MeshBasicMaterial>(null);

  const opticalFlareTex = useMemo(() => getRealisticOpticalFlareTexture(), []);
  const reflectionTex = useMemo(() => getLowGroundReflectionTexture(), []);
  const softGlowTex = useMemo(() => getSoftRadialGlowTexture(), []);

  useFrame(() => {
    if (!introStartedAt) {
      if (rootRef.current) rootRef.current.visible = false;
      return;
    }
    const now = serverNow ? serverNow() : Date.now();
    const elapsedSec = (now - introStartedAt) / 1000;
    if (elapsedSec < 0 || elapsedSec >= 10.3) {
      if (rootRef.current) rootRef.current.visible = false;
      return;
    }
    if (rootRef.current) rootRef.current.visible = true;

    // 1. 0.0s - 3.0s: Laurel rim light beam transitioning cyan -> red
    const rimActive = elapsedSec < 3.0;
    if (rimGroupRef.current) {
      rimGroupRef.current.visible = rimActive;
      if (rimActive && rimMatRef.current) {
        const rimT = Math.max(0, Math.min(1.0, elapsedSec / 3.0));
        const c1 = new THREE.Color("#00f0ff");
        const c2 = new THREE.Color("#ef4444");
        rimMatRef.current.color.copy(c1).lerp(c2, rimT);
        rimMatRef.current.opacity = 0.95 * (1 - rimT * 0.15);
        if (rimPulse1Ref.current) rimPulse1Ref.current.rotation.z = elapsedSec * 3.5;
        if (rimPulse2Ref.current) rimPulse2Ref.current.rotation.z = elapsedSec * 3.5 + Math.PI;
      }
    }

    // 2. 0.4s - 2.5s: FULL FLOOR RED OPTICAL FLARE BURST & SUBTLE LOW GROUND REFLECTION
    const redActive = elapsedSec >= 0.4 && elapsedSec < 2.5;
    if (floorRedGroupRef.current) {
      floorRedGroupRef.current.visible = redActive;
    }
    if (beamGroupRef.current) {
      beamGroupRef.current.visible = redActive;
    }

    if (redActive) {
      const burstT = (elapsedSec - 0.4) / 2.1; // 0.0 to 1.0
      // Smooth bell curve intensity: rises sharply, sustains, then dissolves
      const intensity = Math.sin(burstT * Math.PI);

      // Floor optical flare disc expansion: rapidly flares outwards (0.55 -> 1.05) covering whole dais disc
      const flareScale = THREE.MathUtils.lerp(0.55, 1.05, Math.min(1.0, burstT * 1.6));
      if (floorRedGroupRef.current) {
        floorRedGroupRef.current.scale.set(flareScale, flareScale, 1);
      }
      if (floorRedBloomMatRef.current) floorRedBloomMatRef.current.opacity = 0.98 * intensity;
      if (floorWhiteCoreMatRef.current) floorWhiteCoreMatRef.current.opacity = 0.99 * intensity;

      // Subtle Low Ground Reflection: Strictly ~0.50m height sitting right on dais surface, narrowing upwards
      const heightGrowth = Math.min(1.0, burstT * 3.5);
      const heightScale = Math.sin(heightGrowth * Math.PI * 0.5); // ease out to 1.0
      const radiusBreath = 1.0 + 0.04 * Math.sin(elapsedSec * 12.0);

      const maxReflectionH = 0.50; // Strictly ~0.5m (low reflection only, zero tall column)
      if (beamGroupRef.current) {
        const actualH = maxReflectionH * heightScale;
        beamGroupRef.current.position.set(0, actualH / 2, 0);
        beamGroupRef.current.scale.set(radiusBreath, heightScale, radiusBreath);
      }

      if (beamCoreMatRef.current) beamCoreMatRef.current.opacity = 0.45 * intensity;
      if (beamPlasmaMatRef.current) beamPlasmaMatRef.current.opacity = 0.35 * intensity;
      if (beamAuraMatRef.current) beamAuraMatRef.current.opacity = 0.20 * intensity;
    }
  });

  return (
    <group ref={rootRef} position={[0, 0.0055, 0]}>
      {/* ── A. 0.0s - 3.0s: RIM LIGHT BEAM TRANSITIONING CYAN -> RED AROUND LAUREL WREATH ── */}
      <group ref={rimGroupRef} rotation={[-Math.PI / 2, 0, 0]} renderOrder={10.15}>
        {/* Glowing perimeter border ring (R = 1.22m to 1.32m) */}
        <mesh>
          <ringGeometry args={[1.22, 1.32, 128]} />
          <meshBasicMaterial
            ref={rimMatRef}
            color="#00f0ff"
            transparent
            opacity={0.92}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh ref={rimPulse1Ref}>
          <ringGeometry args={[1.20, 1.34, 64, 1, 0, (60 * Math.PI) / 180]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.95}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh ref={rimPulse2Ref}>
          <ringGeometry args={[1.20, 1.34, 64, 1, 0, (60 * Math.PI) / 180]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.95}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* ── B. 0.4s - 2.5s: FULL FLOOR RED OPTICAL FLARE BURST (IMAGE 2 VTV3 PARITY) ── */}
      <group ref={floorRedGroupRef} rotation={[-Math.PI / 2, 0, 0]} renderOrder={10.20}>
        {/* Full-Floor Radiant Crimson Optical Flare Disc (R = 2.15m covering the dais screen) */}
        <mesh renderOrder={10.20}>
          <circleGeometry args={[2.15, 64]} />
          <meshBasicMaterial
            ref={floorRedBloomMatRef}
            map={opticalFlareTex}
            color="#ff2a4b"
            transparent
            opacity={0.98}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
          />
        </mesh>
        {/* Blinding White Core Optical Flare Center (Smooth Gaussian Falloff) */}
        <mesh renderOrder={10.25}>
          <circleGeometry args={[0.55, 48]} />
          <meshBasicMaterial
            ref={floorWhiteCoreMatRef}
            map={softGlowTex}
            color="#ffffff"
            transparent
            opacity={0.99}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
          />
        </mesh>
      </group>

      {/* ── C. 0.4s - 2.5s: SUBTLE LOW GROUND REFLECTION CONE (H ~0.5m, NARROWING UPWARDS THEN CUT) ── */}
      <group ref={beamGroupRef} position={[0, 0.25, 0]} renderOrder={10.50}>
        {/* Layer 1: Narrowing Inner Ground Glow (Rtop = 0.08m, Rbottom = 0.38m, H = 0.50m) */}
        <mesh renderOrder={10.55}>
          <cylinderGeometry args={[0.08, 0.38, 0.50, 32, 1, true]} />
          <meshBasicMaterial
            ref={beamCoreMatRef}
            map={reflectionTex}
            color="#ffccd5"
            transparent
            opacity={0.45}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Layer 2: Soft Atmospheric Ground Haze (Rtop = 0.18m, Rbottom = 0.65m, H = 0.50m) */}
        <mesh renderOrder={10.52}>
          <cylinderGeometry args={[0.18, 0.65, 0.50, 32, 1, true]} />
          <meshBasicMaterial
            ref={beamPlasmaMatRef}
            map={reflectionTex}
            color="#ff1a42"
            transparent
            opacity={0.35}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Layer 3: Faint Ambient Floor Reflection Cushion */}
        <mesh renderOrder={10.50}>
          <cylinderGeometry args={[0.28, 0.85, 0.50, 32, 1, true]} />
          <meshBasicMaterial
            ref={beamAuraMatRef}
            map={reflectionTex}
            color="#dc2626"
            transparent
            opacity={0.20}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </group>
  );
}

export function CenterFloorStage({
  state,
  screenFadeProgress = 0,
  serverNow,
  quality = "HIGH",
  liveFactor = 1.0,
  introStartedAt = null,
  isIdle = false,
}: {
  state?: OlympiaState | null;
  screenFadeProgress?: number;
  serverNow?: () => number;
  quality?: "HIGH" | "MEDIUM" | "LIGHT";
  liveFactor?: number;
  introStartedAt?: number | null;
  isIdle?: boolean;
}) {
  const wreathGroupRef = useRef<THREE.Group>(null);
  const wreathMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const entryBurstRef = useRef<THREE.Group>(null);
  const outerLaserArcsRef = useRef<THREE.Group>(null);
  const entryElapsedRef = useRef(0);

  const isVeDich = state?.currentRound === "veDich" || state?.roundsPlan?.[state?.roundIdx ?? 0] === "veDich";

  // Real-time stage lighting state (BLUE vs RED across all rounds including Về Đích)
  const nowMs = serverNow ? serverNow() : Date.now();
  const lightingMode = computeTargetLightingMode(state, nowMs);
  const isRed = lightingMode === "RED";

  // Dynamic broadcast lighting colors matching real-time studio state:
  const neonColor = isRed ? "#ef4444" : "#00f0ff";
  const accentColor = isRed ? "#dc2626" : "#38bdf8";

  const isEntrance = !isIdle && Boolean(state?.entranceState?.active);

  // Real-time animation loop (60 FPS)
  useFrame((state, delta) => {
    const nowSec = serverNow ? serverNow() / 1000 : state.clock.getElapsedTime();
    if (outerLaserArcsRef.current) {
      outerLaserArcsRef.current.rotation.z = (((nowSec * 0.45) % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
    }

    // 1. Vòng nguyệt quế: xoay linh hoạt ở Về Đích, đứng im ở các vòng trước
    if (wreathGroupRef.current) {
      if (isVeDich) {
        wreathGroupRef.current.rotation.z += delta * 0.35;
      } else {
        wreathGroupRef.current.rotation.z = 0;
      }
    }

    // 2. Real-time 60 FPS Laurel Wreath Transition Timeline
    let curLaurelOpacity = 1.0;
    if (introStartedAt != null) {
      const now = serverNow ? serverNow() : Date.now();
      const elapsedSec = (now - introStartedAt) / 1000;
      if (elapsedSec < 3.0) {
        curLaurelOpacity = 1.0;
      } else if (elapsedSec < 9.5) {
        // 3.0s - 9.5s: exact 6.5s laurel wreath temporarily disappears completely!
        curLaurelOpacity = 0.0;
      } else if (elapsedSec < 10.3) {
        // 9.5s - 10.3s: 0.8s smooth fade-in of laurel wreath
        const fadeT = (elapsedSec - 9.5) / 0.8;
        curLaurelOpacity = Math.max(0, Math.min(1.0, fadeT));
      } else {
        curLaurelOpacity = 1.0;
      }
    } else {
      curLaurelOpacity = 1.0;
    }

    if (wreathGroupRef.current) {
      wreathGroupRef.current.visible = curLaurelOpacity > 0.001;
    }
    if (wreathMatRef.current) {
      wreathMatRef.current.opacity = curLaurelOpacity;
    }

    // 3. Hiệu ứng bắt đầu chào sân
    if (entryBurstRef.current) {
      entryElapsedRef.current += delta;
      const cycle = (entryElapsedRef.current % 3.0) / 3.0;
      const s = 0.4 + cycle * 1.8;
      entryBurstRef.current.scale.set(s, s, s);
      entryBurstRef.current.rotation.z += delta * 0.2;
      const fade = Math.max(0, 1 - cycle);
      entryBurstRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const mat = child.material as THREE.MeshBasicMaterial;
          if (child.geometry instanceof THREE.RingGeometry) {
            mat.opacity = 0.5 * fade;
          } else {
            mat.opacity = 0.35 * fade;
          }
        }
      });
    }
  });

  // Texture loading with fallback canvas
  const [laurelTex, setLaurelTex] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const loader = new THREE.TextureLoader();
    loader.load(
      "/brand/olympia_laurel_2016.webp",
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        setLaurelTex(tex);
      },
      undefined,
      () => {
        loader.load("/olympia/Olympia_logo_2016.webp", (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.needsUpdate = true;
          setLaurelTex(tex);
        });
      }
    );
  }, []);

  const fallbackCanvas = useMemo(() => {
    if (typeof document === "undefined") return null;
    return createStageLaurelWreathCanvas();
  }, []);

  const fallbackTex = useMemo(() => {
    if (!fallbackCanvas) return null;
    const tex = new THREE.CanvasTexture(fallbackCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [fallbackCanvas]);

  const activeWreathTex = laurelTex || fallbackTex;

  // Authentic VTV3 Olympia Segmented White Track Markings (36 radial dashes)
  const segmentedTrackGeom = useMemo(() => createSegmentedTrackGeometry(2.24, 2.38, 36, 0.65), []);

  return (
    <group position={[0, 0.188, -0.5]}>
      {/* ── 0. 3D ELEVATED CYLINDRICAL DAIS WITH SOLID DARK SATIN RISER SKIRT (VTV3 BROADCAST REQUIREMENT) ── */}
      {/* Vertical Circular Skirt / Riser (H = 0.188m, R = 2.45m, Dark Satin Lacquer #0f172a with restrained emissive 0.15) */}
      <mesh position={[0, -0.094, 0]}>
        <cylinderGeometry args={[2.45, 2.45, 0.188, 128, 1, true]} />
        <meshStandardMaterial
          color="#0f172a"
          emissive={neonColor}
          emissiveIntensity={0.15}
          roughness={0.55}
          metalness={0.20}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Ground-Level Neon Contour Ring at dais base (Y = -0.176m ~ ground Y = 0.012m) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.176, 0]}>
        <ringGeometry args={[2.44, 2.48, 128]} />
        <meshBasicMaterial
          color={neonColor}
          side={THREE.DoubleSide}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>

      {/* Upper Perimeter Neon Contour Ring at top rim (Y = -0.002m ~ dais upper edge) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]}>
        <ringGeometry args={[2.44, 2.48, 128]} />
        <meshBasicMaterial
          color={neonColor}
          side={THREE.DoubleSide}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>

      {/* Elevated High-Gloss Stage Deck (Full 2.45m Top Disc, Deep Midnight #020617) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.000, 0]} renderOrder={9.1}>
        <circleGeometry args={[2.45, 128]} />
        <meshStandardMaterial
          color="#020617"
          roughness={0.07}
          metalness={0.10}
          envMapIntensity={2.8}
          depthWrite={true}
        />
      </mesh>

      {/* Outer Segmented White Racetrack Markings (36 Radial White Dashes R = 2.24m to 2.38m, non-glaring soft studio white) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0015, 0]} geometry={segmentedTrackGeom} renderOrder={9.3}>
        <meshBasicMaterial
          color="#cbd5e1"
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>

      {/* ── 1. CONCENTRIC STAGE ARCHITECTURE (High Resolution 128 Segments, Zero Moire / Sawtooth) ── */}
      {/* Outer Polished Metallic Bezel (R = 2.16m to 2.22m) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0020, 0]} renderOrder={9.4}>
        <ringGeometry args={[2.16, 2.22, 128]} />
        <meshStandardMaterial
          color="#cbd5e1"
          metalness={0.9}
          roughness={0.15}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>

      {/* Primary Outer LED Broadcast Strip (R = 2.08m to 2.14m) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0025, 0]} renderOrder={9.45}>
        <ringGeometry args={[2.08, 2.14, 128]} />
        <meshBasicMaterial
          color={neonColor}
          toneMapped={false}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>

      {/* Middle Accent Ring (R = 1.76m to 1.82m) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0025, 0]} renderOrder={9.35}>
        <ringGeometry args={[1.76, 1.82, 128]} />
        <meshBasicMaterial
          color={accentColor}
          toneMapped={false}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>

      {/* Inner Subtle Neon Guide (R = 1.42m to 1.46m) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0030, 0]} renderOrder={9.38}>
        <ringGeometry args={[1.42, 1.46, 128]} />
        <meshBasicMaterial
          color={neonColor}
          toneMapped={false}
          transparent
          opacity={0.75}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>

      {/* Dark Ultra-Gloss Center Floor Disc (R = 1.40m, pure dark floor disc #020510) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0015, 0]} renderOrder={9.2}>
        <circleGeometry args={[1.40, 128]} />
        <meshStandardMaterial
          color="#020510"
          roughness={0.06}
          metalness={0.12}
          envMapIntensity={2.5}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>

      {/* ── 1B. CONTINUOUS ROTATING OUTER CYAN LASER ARCS (F9) ── */}
      <group ref={outerLaserArcsRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0038, 0]}>
        {/* Symmetrical Twin Opposing Laser Arcs on Outer Cyan Ring (R = 2.07m to 2.15m) */}
        <mesh renderOrder={9.6}>
          <ringGeometry args={[2.07, 2.15, 128, 1, 0, (80 * Math.PI) / 180]} />
          <meshBasicMaterial
            color={neonColor}
            transparent
            opacity={0.9}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh rotation={[0, 0, Math.PI]} renderOrder={9.6}>
          <ringGeometry args={[2.07, 2.15, 128, 1, 0, (80 * Math.PI) / 180]} />
          <meshBasicMaterial
            color={neonColor}
            transparent
            opacity={0.9}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Counter-aligned Opposing Laser Arcs on Middle Accent Ring (R = 1.77m to 1.85m) */}
        <mesh rotation={[0, 0, Math.PI / 2]} renderOrder={9.6}>
          <ringGeometry args={[1.77, 1.85, 128, 1, 0, (65 * Math.PI) / 180]} />
          <meshBasicMaterial
            color={accentColor}
            transparent
            opacity={0.85}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh rotation={[0, 0, (3 * Math.PI) / 2]} renderOrder={9.6}>
          <ringGeometry args={[1.77, 1.85, 128, 1, 0, (65 * Math.PI) / 180]} />
          <meshBasicMaterial
            color={accentColor}
            transparent
            opacity={0.85}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* ── 2A. 6-SECOND DYNAMIC TECH FLOOR GRAPHIC (BROADCAST REFERENCE) ── */}
      <CenterTechFloorGraphic introStartedAt={introStartedAt} serverNow={serverNow} />

      {/* ── 2A.1 CENTRAL FLOOR INTRO APERTURE BURST (0-7s VTV3 Footages: Gold Laurel -> Fire -> Cyan Bloom) ── */}
      <CentralFloorIntroBurst introStartedAt={introStartedAt} serverNow={serverNow} />

      {/* ── 2B. ENTRY RADIANT LIGHT BURST EFFECT (Khi diễn ra màn chào sân) ── */}
      {isEntrance && (
        <group ref={entryBurstRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
          {/* Expanding Radiant Core Ripple (Zero spokes/straight lines) */}
          <mesh>
            <ringGeometry args={[0.2, 0.45, 48]} />
            <meshBasicMaterial
              color="#38bdf8"
              transparent
              opacity={0.4}
              depthWrite={false}
              polygonOffset
              polygonOffsetFactor={-2}
              polygonOffsetUnits={-2}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      )}

      {/* ── 3. HORIZONTAL GOLDEN LAUREL WREATH (Nằm phẳng trên sàn, xoay ở Về Đích) ── */}
      <group
        ref={wreathGroupRef}
        position={[0, 0.0050, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={10.0}
      >
        {activeWreathTex && (
          <mesh>
            <planeGeometry args={[2.3, 2.3]} />
            <meshBasicMaterial ref={wreathMatRef} map={activeWreathTex} transparent={true} opacity={1.0}
              depthWrite={false}
              toneMapped={false}
              polygonOffset
              polygonOffsetFactor={-2}
              polygonOffsetUnits={-2}
            />
          </mesh>
        )}
      </group>

      {/* ── 4. BỤC ĐỨNG THÍ SINH Ở SÂN KHẤU VỀ ĐÍCH (Chỉ hiện khi vòng Về Đích, đồng bộ màu đèn sân khấu) ── */}
      {isVeDich && <VeDichCenterPodium isRed={isRed} />}
    </group>
  );
}

/**
 * Podiums Assembly:
 * 1. Center-Right MC Desk + 2 MC Presenters
 * 2. N Contestant Podiums along the Concentric Left-Wing Arc (R=5.2m from [0, 0, -0.6])
 * resting solidly on the raised dais at Y = 0.22m, facing stage center.
 */
export function Podiums({
  state,
  quality = "HIGH",
  screenFadeProgress = 0,
  serverNow,
  liveFactor = 1.0,
  introStartedAt = null,
  isIdle = false,
}: PodiumsProps) {
  const activeCount = state?.seats?.length ? Math.min(8, Math.max(1, state.seats.length)) : 4;

  // Exact concentric circular arc positioning: R = 6.5m from center C(0, 0, -0.5)
  // Base elevation: Y = 0.22m on top of the raised dais
  const contestantConfigs = useMemo(() => {
    const configs: Array<{
      seatId: number;
      pos: [number, number, number];
      rotY: number;
    }> = [];

    const { radius, startPhi, endPhi } = getContestantArcParams(activeCount);

    for (let i = 0; i < activeCount; i++) {
      const frac = activeCount === 1 ? 0.5 : i / (activeCount - 1);
      const phi = startPhi + frac * (endPhi - startPhi);

      // In Three.js:
      // X = -R * cos(phi) (Stage Left)
      // Z = -0.5 - R * sin(phi) (Upstage Left)
      const x = -radius * Math.cos(phi);
      const z = -0.5 - radius * Math.sin(phi);

      // Facing normal points from (x, z) to (0, -0.5):
      // Rotation around Y to point normal:
      const rotY = Math.PI / 2 - phi;

      configs.push({
        seatId: i,
        pos: [x, 0.22, z],
        rotY,
      });
    }

    return configs;
  }, [activeCount]);

  const isEntranceActive = Boolean(state?.entranceState?.active);
  const currentEntranceSeat = state?.entranceState?.currentSeatIdx ?? 0;
  const currentEntranceSeatStartedAt =
    state?.entranceState?.seatStartedAt ?? state?.entranceState?.startedAt ?? null;



  const isVeDich = state?.currentRound === "veDich" || state?.roundsPlan?.[state?.roundIdx ?? 0] === "veDich";
  const vd = state?.veDich;
  const activeSeat = vd ? (vd.order?.[vd.turnIdx] ?? 0) : 0;
  const isVdActive = Boolean(isVeDich && vd?.phase && vd.phase !== "idle");

  return (
    <group>
      {/* Central Interactive Stage Floor with Rotating Laurel Wreath & Dynamic Stage Lighting */}
      <CenterFloorStage
        state={state}
        serverNow={serverNow}
        screenFadeProgress={screenFadeProgress}
        quality={quality}
        liveFactor={liveFactor}
        introStartedAt={introStartedAt}
        isIdle={isIdle}
      />

      {/* Center-Right MC Desk in front of Hexagon Arch (Facing Center at -30°) */}
      <CenterMcDesk screenFadeProgress={screenFadeProgress} liveFactor={liveFactor} />

      {/* 2 Animated MC Presenters (Khánh Vy & Ngọc Huy) */}
      <McPresenters
        state={state}
        serverNow={serverNow}
        introStartedAt={introStartedAt}
        isIdle={isIdle}
      />

      {/* VeDich Active Contestant (Walking from desk to center stage, standing at center podium, and walking back on seatDone) */}
      {isVdActive && activeSeat != null && contestantConfigs[activeSeat] && (
        <VeDichWalkingContestant
          seatId={activeSeat}
          homePos={contestantConfigs[activeSeat].pos}
          homeRotY={contestantConfigs[activeSeat].rotY}
          state={state}
          serverNow={serverNow}
          quality={quality}
        />
      )}

      {/* Contestant Entrance Walking Figures (Stairs -> Landing Platform -> Assigned Podium) */}
      {isEntranceActive && state && (
        <ContestantEntranceWalkingFigures
          state={state}
          contestantConfigs={contestantConfigs}
          serverNow={serverNow}
        />
      )}

      {/* N Contestant Arc Podiums on Raised Dais */}
      {contestantConfigs.map((cfg) => {
        const seat = state?.seats?.[cfg.seatId];
        const name = seat?.name || `Thí sinh ${cfg.seatId + 1}`;
        const score = seat?.score ?? 0;
        const school = seat?.school;
        const isBuzzed = isSeatBuzzedIn3D(cfg.seatId, state);

        const isEntrancePhase = isEntranceActive
          ? cfg.seatId <= currentEntranceSeat
          : Boolean(state?.stage === "lobby");

        // USER REQUIREMENT (R1 & Follow-up):
        // Physical continuity: Contestants walk down from grandstand stairs.
        // - Lobby / pre-match / intro: All podium figures hidden (showFigure = false).
        // - Entrance walk: Only contestants who completed descent stand at their podium desk (cfg.seatId < currentEntranceSeat).
        //   Walking contestant (cfg.seatId === currentEntranceSeat) rendered by ContestantEntranceWalkingFigures (NO duplicate clone / phân thân!).
        //   Subsequent contestants waiting upstairs hidden (showFigure = false).
        // - Entrance completed or competition rounds active: contestants stand at their podium desks (except active Về Đích contestant at center stage).
        const isLobby = state?.stage === "lobby";
        const isIntro = Boolean(introStartedAt || state?.introTimer || state?.introStandby);
        const hasEntranceCompleted = Boolean(state?.entranceCompleted);
        const isCompetitionRound = Boolean(
          state?.stage === "playing" &&
          !state?.introTimer &&
          !state?.introStandby &&
          state?.currentRound &&
          (state.currentRound === "khoiDong" ? Boolean(state.khoiDong?.started) : true)
        );

        const getSeatStart = (seatIdx: number) => {
          if (!state?.entranceState) return 0;
          return (
            state.entranceState.seatStartTimes?.[seatIdx] ??
            (seatIdx === currentEntranceSeat
              ? currentEntranceSeatStartedAt || 0
              : (state.entranceState.startedAt || 0) + seatIdx * 4000)
          );
        };
        const now = serverNow ? serverNow() : Date.now();
        const thisSeatStart = getSeatStart(cfg.seatId);
        const thisSeatElapsed = thisSeatStart > 0 ? (now - thisSeatStart) / 1000 : 0;
        const hasFinishedEntrance = thisSeatStart > 0 && thisSeatElapsed >= 6.8;

        // ── PODIUM SCOREBOARD 3-PHASE LIFECYCLE ──
        // 1. "logo": Mới mở phòng (Lobby / Pre-match / Intro / Thí sinh chưa bước tới bục) -> Logo Đường lên đỉnh Olympia
        // 2. "name_school": Từng thí sinh bước tới bục của mình xong -> Tên + Trường THPT (giữ nguyên trong suốt Chào sân & Chờ mở màn introStandby!)
        // 3. "name_score": Chỉ chuyển sang Tên + Điểm khi vòng thi Khởi Động thực sự bấm bắt đầu (state.khoiDong.started = true)
        let screenMode: PodiumScreenMode = "logo";
        if (isCompetitionRound) {
          screenMode = "name_score";
        } else if (hasEntranceCompleted) {
          screenMode = "name_school";
        } else if (isEntranceActive) {
          // Early Podium Scoreboard Transition (5200ms / 5.2s):
          const isApproachingOrArrived = thisSeatStart > 0 && thisSeatElapsed >= 5.2; // 5200ms
          screenMode = hasFinishedEntrance || isApproachingOrArrived ? "name_school" : "logo";
        } else {
          screenMode = "logo";
        }

        const isThisContestantInVeDichTurn = isVdActive && cfg.seatId === activeSeat;
        let showFigure = false;
        if (isLobby) {
          showFigure = false;
        } else if (isEntranceActive) {
          // All active and arrived figures during entrance are rendered seamlessly by ContestantEntranceWalkingFigures
          showFigure = false;
        } else if (hasEntranceCompleted || isCompetitionRound) {
          showFigure = !isThisContestantInVeDichTurn;
        } else if (isIntro) {
          showFigure = false;
        } else {
          showFigure = !isThisContestantInVeDichTurn;
        }

        return (
          <ContestantPodium
            key={cfg.seatId}
            seatId={cfg.seatId}
            name={name}
            score={score}
            school={school}
            isEntrancePhase={isEntrancePhase}
            screenMode={screenMode}
            showFigure={showFigure}
            quality={quality}
            position={cfg.pos}
            rotationY={cfg.rotY}
            isBuzzed={isBuzzed}
            screenFadeProgress={screenFadeProgress}
            liveFactor={liveFactor}
          />
        );
      })}
    </group>
  );
}
