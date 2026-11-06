"use client";

import React, { useRef, useMemo, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { OlympiaState } from "@/lib/olympia/types";
import { isSeatBuzzedIn3D } from "./useOlympiaLightingState";

interface PodiumsProps {
  state?: OlympiaState | null;
  quality?: "HIGH" | "MEDIUM" | "LIGHT";
  screenFadeProgress?: number;
  serverNow?: () => number;
  liveFactor?: number;
}

/**
 * Creates the unified 1:3 ratio contestant podium scoreboard canvas texture:
 * - Top 1/4 (25% height): Solid Cyan (#00e5ff) background with Deep Navy (#081636) Contestant Name.
 * - Bottom 3/4 (75% height): Deep Navy gradient (#0e1e42 -> #030816) with centered Pure White (#ffffff) Score digits.
 * - Absolutely NO external labels ("ĐIỂM SỐ", "THÍ SINH" removed).
 * - Synchronized 100% across all 4 podiums (NO individual team colors).
 */
function createPodiumScoreCanvas(
  name: string,
  score: number,
  seatId: number,
  isBuzzed: boolean,
  isRed: boolean = false,
  school?: string,
  isEntrancePhase: boolean = false,
  targetCanvas?: HTMLCanvasElement
): HTMLCanvasElement {
  const canvas = targetCanvas || (typeof document !== "undefined" ? document.createElement("canvas") : ({} as HTMLCanvasElement));
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext ? canvas.getContext("2d") : null;
  if (!ctx) return canvas;
  ctx.clearRect(0, 0, 512, 256);

  if (isEntrancePhase) {
    // ── ENTRANCE / INTRO BROADCAST DISPLAY MODE ──
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
      // Thí sinh chưa nhập tên trường: Ẩn chữ TRƯỜNG THPT và ĐƯỜNG LÊN ĐỈNH OLYMPIA để tránh hiểu nhầm
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

  // Dynamic broadcast color scheme: Cyan/Blue in calm/idle, Vibrant Crimson Red in countdown/tension/buzz
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
 * Contestant Podium Score Display
 */
function ContestantScoreDisplay({
  name,
  score,
  seatId,
  isBuzzed,
  isRed = false,
  school,
  isEntrancePhase = false,
}: {
  name: string;
  score: number;
  seatId: number;
  isBuzzed: boolean;
  isRed?: boolean;
  school?: string;
  isEntrancePhase?: boolean;
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
    createPodiumScoreCanvas(name, score, seatId, isBuzzed, isRed, school, isEntrancePhase, canvas);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;

    canvasRef.current = canvas;
    textureRef.current = tex;
    setTexture(tex);

    return () => {
      tex.dispose();
      textureRef.current = null;
      canvasRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (canvasRef.current && textureRef.current) {
      createPodiumScoreCanvas(name, score, seatId, isBuzzed, isRed, school, isEntrancePhase, canvasRef.current);
      textureRef.current.needsUpdate = true;
    }
  }, [name, score, seatId, isBuzzed, isRed, school, isEntrancePhase]);

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
export function createWarmPeachSkinMaterial(
  color: string = "#f2c7a7",
  roughness: number = 0.55
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.02,
  });
}

/**
 * PBR Physical Hair Shader:
 * - Calibrated for Vietnamese studio broadcast key/rim lighting.
 * - Deep warm specular sheen mimicking organic keratin luster.
 */
export function createHairMaterial(
  color: string = "#1a1512",
  roughness: number = 0.55
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.08,
  });
}

/**
 * Refined Expressive East Asian 3D Eye:
 * - Natural almond sclera with warm cream white
 * - Deep chocolate iris (#261710) with subtle light refraction
 * - Deep obsidian pupil with crisp studio key specular catchlight
 * - Soft skin-toned eyelid crease (warm shadow, NO black rings/mask!)
 */
function ProceduralEye({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1.0,
  isLeft = true,
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  isLeft?: boolean;
}) {
  const canthalTilt = (isLeft ? 1 : -1) * 0.035;
  return (
    <group
      position={position}
      rotation={[rotation[0], rotation[1], rotation[2] + canthalTilt]}
      scale={scale}
    >
      {/* 1. Sclera - soft almond curvature */}
      <mesh position={[0, 0, 0]} scale={[1.2, 0.85, 0.8]}>
        <sphereGeometry args={[0.010, 16, 16]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.25} />
      </mesh>
      {/* 2. Vietnamese Deep Chocolate Iris */}
      <mesh position={[0, 0, 0.0068]} scale={[1.0, 1.0, 0.4]}>
        <sphereGeometry args={[0.0060, 16, 16]} />
        <meshStandardMaterial color="#261710" roughness={0.3} />
      </mesh>
      {/* 3. Deep Obsidian Pupil */}
      <mesh position={[0, 0, 0.0088]}>
        <sphereGeometry args={[0.0030, 12, 12]} />
        <meshBasicMaterial color="#050505" />
      </mesh>
      {/* 4. Specular Catchlight simulating studio key spotlight */}
      <mesh position={[0.002, 0.0025, 0.010]}>
        <sphereGeometry args={[0.0016, 8, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* 5. Subtle Eyelid Crease (Soft warm shadow tone matching facial skin, NOT pure black!) */}
      <mesh position={[0, 0.0075, 0.004]} rotation={[0.08, 0, (isLeft ? -1 : 1) * 0.05]}>
        <torusGeometry args={[0.0102, 0.0010, 6, 14, Math.PI * 0.7]} />
        <meshStandardMaterial color="#6e4635" roughness={0.6} />
      </mesh>
    </group>
  );
}

/**
 * Procedural East Asian 3D Nose:
 * 1. Slender nasal dorsal bridge sloping gently from nasion to supratip.
 * 2. Rounded pronasion nasal tip sphere.
 * 3. Paired alar lobule nostril wings.
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
      <mesh position={[0, 0.005 * length, 0.002]} rotation={[0.18, 0, 0]}>
        <cylinderGeometry args={[0.0035 * width, 0.0058 * width, 0.024 * length, 12]} />
        <primitive object={skinMat} attach="material" />
      </mesh>
      {/* 2. Rounded Pronasion Nasal Tip */}
      <mesh position={[0, -0.008 * length, 0.007 * width]}>
        <sphereGeometry args={[0.0050 * width, 14, 14]} />
        <primitive object={skinMat} attach="material" />
      </mesh>
      {/* 3. Paired Alar Lobules (Nostril Wings) */}
      <mesh position={[-0.0055 * width, -0.009 * length, 0.004]} scale={[1.05, 0.85, 1.1]}>
        <sphereGeometry args={[0.0032 * width, 10, 10]} />
        <primitive object={skinMat} attach="material" />
      </mesh>
      <mesh position={[0.0055 * width, -0.009 * length, 0.004]} scale={[1.05, 0.85, 1.1]}>
        <sphereGeometry args={[0.0032 * width, 10, 10]} />
        <primitive object={skinMat} attach="material" />
      </mesh>
      {/* 4. Columella Base */}
      <mesh position={[0, -0.012 * length, 0.003]}>
        <capsuleGeometry args={[0.0020 * width, 0.005 * length, 6, 8]} />
        <primitive object={skinMat} attach="material" />
      </mesh>
    </group>
  );
}

/**
 * Procedural East Asian 3D Mouth:
 * Natural gentle smile with soft Cupid's bow and vermilion luster.
 */
function ProceduralMouth({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1.0,
  lipColor = "#b83250",
  smile = 0.04,
  openSmile = false,
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
      {/* Upper Lip with subtle Cupid's bow */}
      <mesh position={[0, 0.0016, 0.0015]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.0022, 0.018, 6, 12]} />
        <meshStandardMaterial color={lipColor} roughness={0.35} />
      </mesh>
      {/* Lower Lip */}
      <mesh position={[0, -0.0032, 0.0012]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.0028, 0.016, 6, 12]} />
        <meshStandardMaterial color={lipColor} roughness={0.35} />
      </mesh>
      {/* Soft Smile Teeth line */}
      {openSmile && (
        <mesh position={[0, 0.0002, 0.0010]}>
          <boxGeometry args={[0.012, 0.0018, 0.002]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.2} />
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
 * Procedural Sculpted Hand with Wrist Ball Joint & Ergonomic Muscle Pads:
 * - Spherical wrist ball joint node (r=0.018) bridging forearm smoothly to hand.
 * - Cupped ergonomic palm base with palmar concavity.
 * - Thenar thumb muscle pad and hypothenar ulnar pad.
 * - Opposable articulated thumb with thenar web space.
 * - 4 Articulated fingers with differentiated human anatomy lengths:
 *   Index (24mm), Middle (28mm longest), Ring (26mm), Little (20mm shortest).
 * Modes: "rest" (resting on podium beside buzzer), "mic" (gripping mic),
 * "card" (gripping cue card), "tablet" (holding host tablet).
 */
function SculptedHand({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  skinMat,
  isLeft = true,
  mode = "rest",
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
  skinMat: THREE.Material;
  isLeft?: boolean;
  mode?: "rest" | "mic" | "card" | "tablet";
}) {
  const side = isLeft ? -1 : 1;
  return (
    <group position={position} rotation={rotation}>
      {/* 1. Wrist Spherical Ball Joint Node (r=0.018) */}
      <mesh position={[0, 0, -0.016]}>
        <sphereGeometry args={[0.018, 14, 14]} />
        <primitive object={skinMat} attach="material" />
      </mesh>

      {/* 2. Cupped Ergonomic Palm Base */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.038, 0.015, 0.040]} />
        <primitive object={skinMat} attach="material" />
      </mesh>
      {/* Palm Knuckle Arch */}
      <mesh position={[0, 0.003, 0.016]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.018, 0.018, 0.036, 12]} />
        <primitive object={skinMat} attach="material" />
      </mesh>

      {/* 3. Thenar Thumb Muscle Pad (Muscular base of thumb) */}
      <mesh position={[side * 0.016, -0.004, -0.002]} scale={[1.2, 0.85, 1.3]}>
        <sphereGeometry args={[0.012, 12, 12]} />
        <primitive object={skinMat} attach="material" />
      </mesh>
      {/* Hypothenar Muscle Pad (Ulnar side of palm) */}
      <mesh position={[-side * 0.014, -0.004, 0.002]} scale={[0.9, 0.8, 1.2]}>
        <sphereGeometry args={[0.009, 10, 10]} />
        <primitive object={skinMat} attach="material" />
      </mesh>

      {/* 4. Opposable Thumb with articulated phalanges */}
      <group position={[side * 0.022, -0.002, -0.004]} rotation={[0.2, side * 0.45, side * -0.2]}>
        <mesh position={[side * 0.008, 0, 0.009]} rotation={[0.3, 0, 0]}>
          <cylinderGeometry args={[0.0058, 0.0068, 0.020, 10]} />
          <primitive object={skinMat} attach="material" />
        </mesh>
        <mesh position={[side * 0.008, -0.004, 0.022]} rotation={[0.6, 0, 0]}>
          <capsuleGeometry args={[0.0050, 0.014, 6, 8]} />
          <primitive object={skinMat} attach="material" />
        </mesh>
      </group>

      {/* 5. 4 Articulated Fingers with Differentiated Anatomical Lengths */}
      {[-0.013, -0.0045, 0.0045, 0.013].map((fX, fIdx) => {
        // Human anatomy lengths:
        // Index (fIdx 0): 24mm, Middle (fIdx 1): 28mm, Ring (fIdx 2): 26mm, Little (fIdx 3): 20mm
        const fingerLen =
          fIdx === 1 ? 0.028 :
          fIdx === 2 ? 0.026 :
          fIdx === 0 ? 0.024 : 0.020;

        const curlRot =
          mode === "mic" ? 1.25 :
          mode === "card" ? 0.35 :
          mode === "tablet" ? 0.42 : 0.18;

        const splayAngle = (fIdx - 1.5) * 0.04;

        return (
          <group key={fIdx} position={[fX, 0, 0.022]} rotation={[0, splayAngle, 0]}>
            {/* Proximal phalanx */}
            <mesh position={[0, -0.003, fingerLen * 0.3]} rotation={[curlRot, 0, 0]}>
              <cylinderGeometry args={[0.0044, 0.0050, fingerLen * 0.52, 8]} />
              <primitive object={skinMat} attach="material" />
            </mesh>
            {/* Distal phalanx with rounded fingertip */}
            <mesh position={[0, -0.009, fingerLen * 0.68]} rotation={[curlRot * 1.45, 0, 0]}>
              <capsuleGeometry args={[0.0038, fingerLen * 0.42, 6, 8]} />
              <primitive object={skinMat} attach="material" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

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
  // Seat 0 (TS 1 / Cam 5): Nữ sinh thanh lịch đeo kính (giống Ảnh 2), da trắng hồng ấm #fae0cc, tóc buộc thanh tú
  { gender: "female", skinTone: "#fae0cc", hairColor: "#171412", hairStyle: "ponytail", hasGlasses: true, glassesColor: "#334155" },
  // Seat 1 (TS 2 / Cam 6): Nam sinh tóc gọn gàng năng động (giống Ảnh 3), da vàng ấm tự nhiên #f2ceb0
  { gender: "male", skinTone: "#f2ceb0", hairColor: "#1a1614", hairStyle: "side_part", hasGlasses: false },
  // Seat 2 (TS 3 / Cam 7): Nữ sinh tóc ngắn cá tính thanh thoát, da trắng sáng hồng #f8d5b8
  { gender: "female", skinTone: "#f8d5b8", hairColor: "#1f1a16", hairStyle: "stylish_bob", hasGlasses: false },
  // Seat 3 (TS 4 / Cam 8): Nam sinh thư sinh đeo kính trí thức, da mật ong ấm #eec29f
  { gender: "male", skinTone: "#eec29f", hairColor: "#181412", hairStyle: "textured_crop", hasGlasses: true, glassesColor: "#1e293b" },
  // Seat 4 (TS 5 / Cam 11): Nữ sinh tóc mái thưa buông nhẹ, da trắng hồng ấm #fae0cc
  { gender: "female", skinTone: "#fae0cc", hairColor: "#201a15", hairStyle: "layered_fringe", hasGlasses: false },
  // Seat 5 (TS 6 / Cam 12): Nam sinh tóc cắt gọn gàng, da ấm tự nhiên #f2ceb0
  { gender: "male", skinTone: "#f2ceb0", hairColor: "#171412", hairStyle: "neat_fade", hasGlasses: false },
  // Seat 6 (TS 7 / Cam 13): Nữ sinh đeo kính gọng mảnh thanh lịch, tóc gợn sóng nhẹ, da ấm #f8d5b8
  { gender: "female", skinTone: "#f8d5b8", hairColor: "#1c1815", hairStyle: "wavy_volume", hasGlasses: true, glassesColor: "#475569" },
  // Seat 7 (TS 8 / Cam 14): Nam sinh phong thái tự tin, da vàng ấm #f2ceb0
  { gender: "male", skinTone: "#f2ceb0", hairColor: "#191512", hairStyle: "undercut", hasGlasses: false },
];

export function ContestantFigure({ seatId, quality }: { seatId: number; quality?: "HIGH" | "MEDIUM" | "LIGHT" }) {
  const style = CONTESTANT_STYLES[seatId % CONTESTANT_STYLES.length];
  const chestRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const skinMat = useMemo(() => createWarmPeachSkinMaterial(style.skinTone), [style.skinTone]);
  const hairMat = useMemo(() => createHairMaterial(style.hairColor), [style.hairColor]);

  // Micro-breathing & natural student idle posture via useFrame
  useFrame(({ clock }) => {
    if (quality === "LIGHT") return;
    const t = clock.getElapsedTime();
    if (chestRef.current) {
      // Subtle vertical breathing oscillation (2mm amplitude)
      chestRef.current.position.y = Math.sin(t * 1.8 + seatId * 1.2) * 0.002;
      chestRef.current.scale.set(
        1 + Math.sin(t * 1.8 + seatId) * 0.005,
        1,
        1 + Math.sin(t * 1.8 + seatId) * 0.005
      );
    }
    if (headRef.current) {
      // Gentle micro-tilt so the character feels attentive and alive
      headRef.current.rotation.x = Math.sin(t * 1.1 + seatId) * 0.006;
      headRef.current.rotation.y = Math.cos(t * 0.8 + seatId * 1.4) * 0.010;
    }
  });

  const shirtColor = "#ffffff";
  const collarColor = "#1e3a8a"; // Iconic Olympia Navy Blue collar
  const placketColor = "#1e3a8a";
  const trouserColor = "#0f172a";

  return (
    <group position={[0, 0, -0.42]}>
      {/* ── LOWER BODY & TROUSERS (Smooth student legs) ── */}
      <mesh position={[-0.068, 0.48, 0]}>
        <capsuleGeometry args={[0.038, 0.68, 8, 16]} />
        <meshStandardMaterial color={trouserColor} roughness={0.8} />
      </mesh>
      <mesh position={[0.068, 0.48, 0]}>
        <capsuleGeometry args={[0.038, 0.68, 8, 16]} />
        <meshStandardMaterial color={trouserColor} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.88, 0]}>
        <boxGeometry args={[0.24, 0.12, 0.15]} />
        <meshStandardMaterial color={trouserColor} roughness={0.8} />
      </mesh>

      {/* Belt & Gold Buckle */}
      <mesh position={[0, 0.95, 0]}>
        <boxGeometry args={[0.25, 0.032, 0.16]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.95, 0.082]}>
        <boxGeometry args={[0.032, 0.024, 0.008]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* ── UPPER BODY (Breathing Chest & Contoured Vietnamese Student Polo) ── */}
      <group ref={chestRef}>
        {/* Waist & Mid-torso (Contoured Vietnamese student taper) */}
        <mesh position={[0, 1.12, 0]} scale={[1.28, 1.0, 0.75]}>
          <cylinderGeometry args={[0.130, 0.122, 0.24, 18]} />
          <meshStandardMaterial color={shirtColor} roughness={0.45} />
        </mesh>

        {/* Upper Chest / Ribcage */}
        <mesh position={[0, 1.28, 0]} scale={[1.34, 1.0, 0.78]}>
          <cylinderGeometry args={[0.142, 0.130, 0.22, 18]} />
          <meshStandardMaterial color={shirtColor} roughness={0.45} />
        </mesh>
        {/* Clavicle / Shoulder Slope Form with Trapezius Contours */}
        <mesh position={[0, 1.39, 0]}>
          <boxGeometry args={[0.28, 0.06, 0.16]} />
          <meshStandardMaterial color={shirtColor} roughness={0.45} />
        </mesh>
        {/* Sloping Trapezius Muscle Contours */}
        <mesh position={[-0.082, 1.41, 0]} rotation={[0, 0, 0.35]}>
          <capsuleGeometry args={[0.026, 0.12, 8, 14]} />
          <meshStandardMaterial color={shirtColor} roughness={0.45} />
        </mesh>
        <mesh position={[0.082, 1.41, 0]} rotation={[0, 0, -0.35]}>
          <capsuleGeometry args={[0.026, 0.12, 8, 14]} />
          <meshStandardMaterial color={shirtColor} roughness={0.45} />
        </mesh>

        {/* ── AUTHENTIC VIETNAMESE POLO COLLAR, STANDING BAND & PLACKET ── */}
        {/* Standing Collar Band (Chân Cổ) wrapping neck base */}
        <mesh position={[0, 1.442, 0.015]} rotation={[0.15, 0, 0]}>
          <torusGeometry args={[0.046, 0.010, 8, 20]} />
          <meshStandardMaterial color={collarColor} roughness={0.35} />
        </mesh>
        {/* Left Lapel (Beveled 3D Fold) */}
        <mesh position={[-0.052, 1.428, 0.076]} rotation={[0.30, -0.16, -0.24]}>
          <boxGeometry args={[0.062, 0.042, 0.008]} />
          <meshStandardMaterial color={collarColor} roughness={0.35} />
        </mesh>
        {/* Right Lapel (Beveled 3D Fold) */}
        <mesh position={[0.052, 1.428, 0.076]} rotation={[0.30, 0.16, 0.24]}>
          <boxGeometry args={[0.062, 0.042, 0.008]} />
          <meshStandardMaterial color={collarColor} roughness={0.35} />
        </mesh>
        {/* Collar Back Band */}
        <mesh position={[0, 1.455, -0.038]} rotation={[-0.15, 0, 0]}>
          <boxGeometry args={[0.125, 0.030, 0.014]} />
          <meshStandardMaterial color={collarColor} roughness={0.35} />
        </mesh>
        {/* Top-Stitched Front Central Placket */}
        <mesh position={[0, 1.335, 0.082]}>
          <boxGeometry args={[0.026, 0.12, 0.007]} />
          <meshStandardMaterial color={placketColor} roughness={0.35} />
        </mesh>
        {/* Pearl Buttons with Subtle Luster */}
        <mesh position={[0, 1.37, 0.088]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.0035, 0.0035, 0.004, 10]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.4} />
        </mesh>
        <mesh position={[0, 1.32, 0.088]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.0035, 0.0035, 0.004, 10]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.4} />
        </mesh>

        {/* Golden Laurel Branch Chest Badge (Left Breast) */}
        <mesh position={[-0.075, 1.32, 0.085]}>
          <boxGeometry args={[0.028, 0.020, 0.005]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.7} roughness={0.2} />
        </mesh>
        <mesh position={[-0.075, 1.32, 0.088]}>
          <sphereGeometry args={[0.006, 10, 10]} />
          <meshBasicMaterial color="#fef08a" />
        </mesh>

        {/* ── SHORT SLEEVES, CUFFS & ARTICULATED JOINT NODES ── */}
        {/* Left Sleeve */}
        <mesh position={[-0.16, 1.32, 0.02]} rotation={[0.20, 0, -0.15]}>
          <capsuleGeometry args={[0.038, 0.10, 8, 14]} />
          <meshStandardMaterial color={shirtColor} roughness={0.45} />
        </mesh>
        {/* Left Sleeve Ribbed Cuff */}
        <mesh position={[-0.17, 1.25, 0.03]} rotation={[0.20, 0, -0.15]}>
          <cylinderGeometry args={[0.040, 0.040, 0.020, 16]} />
          <meshStandardMaterial color={collarColor} roughness={0.35} />
        </mesh>

        {/* Right Sleeve */}
        <mesh position={[0.16, 1.32, 0.02]} rotation={[0.20, 0, 0.15]}>
          <capsuleGeometry args={[0.038, 0.10, 8, 14]} />
          <meshStandardMaterial color={shirtColor} roughness={0.45} />
        </mesh>
        {/* Right Sleeve Ribbed Cuff */}
        <mesh position={[0.17, 1.25, 0.03]} rotation={[0.20, 0, 0.15]}>
          <cylinderGeometry args={[0.040, 0.040, 0.020, 16]} />
          <meshStandardMaterial color={collarColor} roughness={0.35} />
        </mesh>

        {/* ── ARMS & HANDS (Seamless natural pose resting on desk) ── */}
        {/* Left Forearm */}
        <mesh position={[-0.15, 1.12, 0.10]} rotation={[0.65, -0.12, -0.08]}>
          <capsuleGeometry args={[0.028, 0.18, 8, 12]} />
          <primitive object={skinMat} attach="material" />
        </mesh>
        {/* Left Hand: Sculpted palm & fingers resting on desk */}
        <SculptedHand
          position={[-0.13, 0.99, 0.22]}
          rotation={[0.1, -0.15, 0]}
          skinMat={skinMat}
          isLeft={true}
          mode="rest"
        />

        {/* Right Forearm */}
        <mesh position={[0.15, 1.12, 0.10]} rotation={[0.65, 0.12, 0.08]}>
          <capsuleGeometry args={[0.028, 0.18, 8, 12]} />
          <primitive object={skinMat} attach="material" />
        </mesh>
        {/* Right Hand: Sculpted palm & fingers poised beside buzzer */}
        <SculptedHand
          position={[0.13, 0.99, 0.22]}
          rotation={[0.1, 0.15, 0]}
          skinMat={skinMat}
          isLeft={false}
          mode="rest"
        />
      </group>

      {/* ── HEAD & SLENDER ANGLED NECK ── */}
      <group ref={headRef}>
        {/* Angled Neck (radius 0.031m to 0.037m with natural forward incline) */}
        <mesh position={[0, 1.47, 0.012]} rotation={[0.08, 0, 0]}>
          <cylinderGeometry args={[0.031, 0.037, 0.088, 20]} />
          <primitive object={skinMat} attach="material" />
        </mesh>

        {/* ── ORGANIC CRANIOFACIAL ANATOMY ── */}
        {/* 1. Cranial Vault (Recessed so facial features emerge cleanly without clipping) */}
        <mesh position={[0, 1.58, -0.015]} scale={[0.95, 1.05, 1.02]}>
          <sphereGeometry args={[0.076, 28, 28]} />
          <primitive object={skinMat} attach="material" />
        </mesh>

        {/* 2. Smooth Subtle Zygomatic Cheeks */}
        <mesh position={[-0.036, 1.545, 0.030]} scale={[0.8, 0.9, 0.6]}>
          <sphereGeometry args={[0.020, 14, 14]} />
          <primitive object={skinMat} attach="material" />
        </mesh>
        <mesh position={[0.036, 1.545, 0.030]} scale={[0.8, 0.9, 0.6]}>
          <sphereGeometry args={[0.020, 14, 14]} />
          <primitive object={skinMat} attach="material" />
        </mesh>

        {/* 3. Tapered Jawline (Mandible) eliminating blocky box corners */}
        <mesh position={[0, 1.520, 0.032]} rotation={[0.22, 0, 0]}>
          <cylinderGeometry args={[0.052, 0.036, 0.072, 20]} />
          <primitive object={skinMat} attach="material" />
        </mesh>

        {/* 4. Soft Rounded Chin Ellipsoid */}
        <mesh position={[0, 1.488, 0.056]} scale={[1.15, 0.95, 1.08]}>
          <sphereGeometry args={[0.016, 16, 16]} />
          <primitive object={skinMat} attach="material" />
        </mesh>

        {/* 5. Sculpted Left & Right Ears */}
        <SculptedEar
          position={[-0.076, 1.56, 0.005]}
          rotation={[0, -0.15, 0.05]}
          skinMat={skinMat}
          isLeft={true}
        />
        <SculptedEar
          position={[0.076, 1.56, 0.005]}
          rotation={[0, 0.15, -0.05]}
          skinMat={skinMat}
          isLeft={false}
        />

        {/* 6. Expressive Anatomical Eyes with Almond Contour & 3° Canthal Tilt */}
        <ProceduralEye
          position={[-0.026, 1.565, 0.075]}
          scale={0.9}
          isLeft={true}
        />
        <ProceduralEye
          position={[0.026, 1.565, 0.075]}
          scale={0.9}
          isLeft={false}
        />

        {/* Eyebrows */}
        <mesh position={[-0.026, 1.588, 0.077]} rotation={[0, 0, 0.08]}>
          <boxGeometry args={[0.024, 0.004, 0.005]} />
          <meshStandardMaterial color={style.hairColor} roughness={0.8} />
        </mesh>
        <mesh position={[0.026, 1.588, 0.077]} rotation={[0, 0, -0.08]}>
          <boxGeometry args={[0.024, 0.004, 0.005]} />
          <meshStandardMaterial color={style.hairColor} roughness={0.8} />
        </mesh>

        {/* 7. Procedural 3D Nose (Slender bridge, tip sphere, paired alar lobule wings) */}
        <ProceduralNose
          position={[0, 1.545, 0.078]}
          skinMat={skinMat}
          scale={0.92}
        />

        {/* 8. Procedural 3D Mouth (Cupid's bow upper lip, contoured lower lip, commissures) */}
        <ProceduralMouth
          position={[0, 1.512, 0.073]}
          scale={0.92}
          lipColor={style.gender === "female" ? "#be185d" : "#9f1239"}
          smile={0.06}
          openSmile={true}
        />

        {/* Student Glasses (For seats with hasGlasses) */}
        {style.hasGlasses && (
          <group position={[0, 1.565, 0.082]}>
            {/* Left Frame */}
            <mesh position={[-0.026, 0, 0]}>
              <torusGeometry args={[0.013, 0.0016, 14, 28]} />
              <meshStandardMaterial color={style.glassesColor || "#1e293b"} metalness={0.8} roughness={0.2} />
            </mesh>
            {/* Right Frame */}
            <mesh position={[0.026, 0, 0]}>
              <torusGeometry args={[0.013, 0.0016, 14, 28]} />
              <meshStandardMaterial color={style.glassesColor || "#1e293b"} metalness={0.8} roughness={0.2} />
            </mesh>
            {/* Nose Bridge */}
            <mesh position={[0, 0.002, 0]}>
              <boxGeometry args={[0.014, 0.002, 0.003]} />
              <meshStandardMaterial color={style.glassesColor || "#1e293b"} metalness={0.8} roughness={0.2} />
            </mesh>
            {/* Temple arms */}
            <mesh position={[-0.043, 0, -0.04]} rotation={[0, 0.15, 0]}>
              <cylinderGeometry args={[0.0015, 0.0015, 0.075, 6]} />
              <meshStandardMaterial color={style.glassesColor || "#1e293b"} metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0.043, 0, -0.04]} rotation={[0, -0.15, 0]}>
              <cylinderGeometry args={[0.0015, 0.0015, 0.075, 6]} />
              <meshStandardMaterial color={style.glassesColor || "#1e293b"} metalness={0.8} roughness={0.2} />
            </mesh>
          </group>
        )}

        {/* ── MULTI-LAYERED VOLUMETRIC 3D HAIRSTYLES (PBR Sheen, Organic Curves) ── */}
        {/* Layer 1: Cranial Base Hairline Cap */}
        <mesh position={[0, 1.610, -0.012]} scale={[0.98, 1.02, 1.02]}>
          <sphereGeometry args={[0.081, 24, 24]} />
          <primitive object={hairMat} attach="material" />
        </mesh>

        {/* Ponytail: Nữ sinh thanh lịch */}
        {style.hairStyle === "ponytail" && (
          <group>
            {/* Layer 2: Volumetric crown sweep */}
            <mesh position={[0, 1.625, -0.02]}>
              <sphereGeometry args={[0.084, 20, 20]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
            {/* Layer 3: Front soft curved bangs */}
            <mesh position={[0, 1.635, 0.055]} rotation={[0, 0, Math.PI / 2]}>
              <capsuleGeometry args={[0.013, 0.055, 6, 12]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
            {/* Ponytail tie ring */}
            <mesh position={[0, 1.60, -0.085]}>
              <torusGeometry args={[0.018, 0.006, 8, 16]} />
              <meshStandardMaterial color="#1e293b" roughness={0.4} />
            </mesh>
            {/* Cascading ponytail stream */}
            <mesh position={[0, 1.49, -0.105]} rotation={[0.18, 0, 0]}>
              <cylinderGeometry args={[0.024, 0.014, 0.18, 14]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
          </group>
        )}

        {/* Side Part: Nam sinh gọn gàng năng động */}
        {style.hairStyle === "side_part" && (
          <group>
            {/* Layer 2: Volumetric side sweep lock */}
            <mesh position={[-0.02, 1.655, 0.03]} rotation={[0.1, -0.1, -0.2]}>
              <capsuleGeometry args={[0.024, 0.08, 8, 14]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
            {/* Secondary parting sweep */}
            <mesh position={[0.04, 1.635, 0.03]} rotation={[0.1, 0.1, 0.35]}>
              <capsuleGeometry args={[0.018, 0.05, 6, 10]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
            {/* Layer 3: Tapered sideburns */}
            <mesh position={[-0.068, 1.57, 0.015]}>
              <capsuleGeometry args={[0.010, 0.05, 6, 8]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
            <mesh position={[0.068, 1.57, 0.015]}>
              <capsuleGeometry args={[0.010, 0.05, 6, 8]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
          </group>
        )}

        {/* Textured Crop: Nam sinh */}
        {style.hairStyle === "textured_crop" && (
          <group>
            {/* Layer 2: Forward textured crown volume */}
            <mesh position={[0, 1.66, 0.025]} rotation={[0.2, 0, Math.PI / 2]}>
              <capsuleGeometry args={[0.026, 0.075, 8, 14]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
            {/* Layer 3: Feathered micro-bangs */}
            <mesh position={[0, 1.635, 0.055]} rotation={[0.1, 0, Math.PI / 2]}>
              <capsuleGeometry args={[0.014, 0.065, 6, 10]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
            {/* Neat temples */}
            <mesh position={[-0.066, 1.58, 0.02]}>
              <capsuleGeometry args={[0.011, 0.05, 6, 8]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
            <mesh position={[0.066, 1.58, 0.02]}>
              <capsuleGeometry args={[0.011, 0.05, 6, 8]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
          </group>
        )}

        {/* Stylish Bob: Nữ sinh tóc ngắn cá tính */}
        {style.hairStyle === "stylish_bob" && (
          <group>
            {/* Layer 2: Sleek brow bangs */}
            <mesh position={[0, 1.635, 0.055]} rotation={[0, 0, Math.PI / 2]}>
              <capsuleGeometry args={[0.014, 0.072, 6, 12]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
            {/* Layer 2: Curved parietal bob locks */}
            <mesh position={[-0.066, 1.52, 0.025]}>
              <capsuleGeometry args={[0.024, 0.13, 8, 12]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
            <mesh position={[0.066, 1.52, 0.025]}>
              <capsuleGeometry args={[0.024, 0.13, 8, 12]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
            {/* Layer 3: Rear curved bob neckline */}
            <mesh position={[0, 1.52, -0.045]}>
              <cylinderGeometry args={[0.078, 0.088, 0.14, 16]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
          </group>
        )}

        {/* Layered Fringe: Nữ sinh mái thưa */}
        {style.hairStyle === "layered_fringe" && (
          <group>
            {/* Layer 2: Airy see-through fringe */}
            <mesh position={[0, 1.635, 0.055]} rotation={[0, 0, Math.PI / 2]}>
              <capsuleGeometry args={[0.011, 0.068, 6, 10]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
            {/* Layer 3: Soft cascading cheek strands */}
            <mesh position={[-0.065, 1.53, 0.025]}>
              <capsuleGeometry args={[0.018, 0.12, 6, 10]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
            <mesh position={[0.065, 1.53, 0.025]}>
              <capsuleGeometry args={[0.018, 0.12, 6, 10]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
          </group>
        )}

        {/* Neat Fade: Nam sinh */}
        {style.hairStyle === "neat_fade" && (
          <group>
            {/* Layer 2: Contoured top volume */}
            <mesh position={[0, 1.65, 0.02]} rotation={[0.1, 0, Math.PI / 2]}>
              <capsuleGeometry args={[0.024, 0.075, 8, 12]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
            {/* Layer 3: Tapered fade temples */}
            <mesh position={[-0.066, 1.58, 0.01]}>
              <capsuleGeometry args={[0.010, 0.04, 6, 8]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
            <mesh position={[0.066, 1.58, 0.01]}>
              <capsuleGeometry args={[0.010, 0.04, 6, 8]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
          </group>
        )}

        {/* Wavy Volume: Nữ sinh tóc gợn sóng */}
        {style.hairStyle === "wavy_volume" && (
          <group>
            {/* Layer 2: Volumetric wavy crown */}
            <mesh position={[0, 1.66, 0.015]} rotation={[-0.05, 0, Math.PI / 2]}>
              <capsuleGeometry args={[0.028, 0.08, 8, 14]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
            {/* Layer 3: S-curved wavy locks */}
            <mesh position={[-0.066, 1.52, 0.025]}>
              <capsuleGeometry args={[0.022, 0.13, 6, 12]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
            <mesh position={[0.066, 1.52, 0.025]}>
              <capsuleGeometry args={[0.022, 0.13, 6, 12]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
          </group>
        )}

        {/* Undercut: Nam sinh */}
        {style.hairStyle === "undercut" && (
          <group>
            {/* Layer 2: Swept-back volumetric top lock */}
            <mesh position={[0, 1.665, 0.025]} rotation={[0.22, 0, Math.PI / 2]}>
              <capsuleGeometry args={[0.028, 0.08, 8, 14]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
            {/* Layer 3: Clean side profile */}
            <mesh position={[-0.065, 1.58, 0.01]}>
              <capsuleGeometry args={[0.010, 0.04, 6, 8]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
            <mesh position={[0.065, 1.58, 0.01]}>
              <capsuleGeometry args={[0.010, 0.04, 6, 8]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );
}

/**
 * Single Contestant Podium with Grounded Architectural Plinth Footing,
 * Flush Recessed Scoreboard, Slanted Desk Surface, and Palm-Sized Buzzer.
 */
/**
 * Contestant Podium Matching Authentic VTV3 S14 Studio (Image 2):
 * - Modern tapered architectural kiosk with crisp white pearl chamfered borders.
 * - Distinct RECESSED DARK HORIZONTAL DISPLAY NICHE (hốc chữ nhật khoét chìm màu đen) housing the scoreboard.
 * - Slanted dark graphite desk surface with inset touchscreen tablet and compact palm-sized buzzer.
 */
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

  // Smooth buzzer pop animation
  useFrame((_, delta) => {
    if (buzzerDomeRef.current) {
      const targetScale = isBuzzed ? 1.15 : 1.0;
      buzzerDomeRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        delta * 14
      );
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
      {showFigure && <ContestantFigure seatId={seatId} quality={quality} />}
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

      {/* Dual Recessed Laptops Facing MCs at -Z */}
      <group position={[-0.32, 0.96, 0.02]}>
        <mesh position={[0, 0.008, 0]}>
          <boxGeometry args={[0.34, 0.012, 0.24]} />
          <meshStandardMaterial color="#1e293b" metalness={0.88} roughness={0.25} />
        </mesh>
        <group position={[0, 0.014, 0.11]} rotation={[-0.45, 0, 0]}>
          <mesh position={[0, 0.10, 0]}>
            <boxGeometry args={[0.34, 0.20, 0.012]} />
            <meshStandardMaterial color="#0f172a" metalness={0.92} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.10, -0.008]}>
            <planeGeometry args={[0.32, 0.18]} />
            <meshStandardMaterial
              color="#0284c7"
              emissive="#0284c7"
              emissiveIntensity={0.45}
              roughness={0.2}
            />
          </mesh>
        </group>
      </group>

      <group position={[0.32, 0.96, 0.02]}>
        <mesh position={[0, 0.008, 0]}>
          <boxGeometry args={[0.34, 0.012, 0.24]} />
          <meshStandardMaterial color="#1e293b" metalness={0.88} roughness={0.25} />
        </mesh>
        <group position={[0, 0.014, 0.11]} rotation={[-0.45, 0, 0]}>
          <mesh position={[0, 0.10, 0]}>
            <boxGeometry args={[0.34, 0.20, 0.012]} />
            <meshStandardMaterial color="#0f172a" metalness={0.92} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.10, -0.008]}>
            <planeGeometry args={[0.32, 0.18]} />
            <meshStandardMaterial
              color="#0284c7"
              emissive="#0284c7"
              emissiveIntensity={0.45}
              roughness={0.2}
            />
          </mesh>
        </group>
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

      {/* Dual Gooseneck Mics */}
      <group position={[-0.56, 0.96, 0.18]}>
        <mesh position={[0, 0.015, 0]}>
          <cylinderGeometry args={[0.018, 0.022, 0.025, 16]} />
          <meshStandardMaterial color="#1e2430" metalness={0.95} roughness={0.15} />
        </mesh>
        <mesh position={[0, 0.12, -0.02]} rotation={[0.25, 0, 0]}>
          <cylinderGeometry args={[0.005, 0.005, 0.22, 12]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.26, -0.08]} rotation={[-0.4, 0, 0]}>
          <cylinderGeometry args={[0.005, 0.005, 0.12, 12]} />
          <meshStandardMaterial color="#64748b" metalness={0.85} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.31, -0.13]} rotation={[-0.4, 0, 0]}>
          <sphereGeometry args={[0.015, 16, 16]} />
          <meshStandardMaterial color="#0f172a" roughness={0.8} />
        </mesh>
      </group>

      <group position={[0.56, 0.96, 0.18]}>
        <mesh position={[0, 0.015, 0]}>
          <cylinderGeometry args={[0.018, 0.022, 0.025, 16]} />
          <meshStandardMaterial color="#1e2430" metalness={0.95} roughness={0.15} />
        </mesh>
        <mesh position={[0, 0.12, -0.02]} rotation={[0.25, 0, 0]}>
          <cylinderGeometry args={[0.005, 0.005, 0.22, 12]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.26, -0.08]} rotation={[-0.4, 0, 0]}>
          <cylinderGeometry args={[0.005, 0.005, 0.12, 12]} />
          <meshStandardMaterial color="#64748b" metalness={0.85} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.31, -0.13]} rotation={[-0.4, 0, 0]}>
          <sphereGeometry args={[0.015, 16, 16]} />
          <meshStandardMaterial color="#0f172a" roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Animated 3D MC Presenters (Khánh Vy & Ngọc Huy):
 * Starts at entrance positions behind the Hexagon Arch during 0s opening,
 * then steps forward proudly onto the Dais beside the MC Desk as lights turn on.
 */
export function McPresenters({
  state,
  serverNow,
}: {
  state?: OlympiaState | null;
  serverNow?: () => number;
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
  const kvRightArmRef = useRef<THREE.Group>(null);
  const nhLeftArmRef = useRef<THREE.Group>(null);
  const nhRightArmRef = useRef<THREE.Group>(null);

  const kvSkinMat = useMemo(() => createWarmPeachSkinMaterial("#fae0cc"), []);
  const nhSkinMat = useMemo(() => createWarmPeachSkinMaterial("#f2ceb0"), []);
  const kvHairMat = useMemo(() => createHairMaterial("#2a1808", 0.44), []);
  const nhHairMat = useMemo(() => createHairMaterial("#1a1614", 0.48), []);

  // Compute walk-out animation progress (0.0: backstage behind arch posts -> 1.0: behind MC desk)
  useFrame(() => {
    const isIntro = Boolean(state?.introTimer);
    const now = serverNow ? serverNow() : Date.now();
    let walkProgress = 1.0;

    if (isIntro && state?.introTimer) {
      const startedAt = state.introTimer.startedAt || now;
      const elapsed = Math.max(0, now - startedAt);
      if (elapsed < 3500) {
        walkProgress = 0.0;
      } else if (elapsed > 10500) {
        walkProgress = 1.0;
      } else {
        const raw = (elapsed - 3500) / 7000;
        walkProgress = raw * raw * (3 - 2 * raw); // Smoothstep
      }
    }

    const isWalking = walkProgress > 0 && walkProgress < 1;
    const stride = isWalking ? Math.sin(walkProgress * Math.PI * 14) * 0.35 : 0;
    const armStride = isWalking ? Math.sin(walkProgress * Math.PI * 14) * 0.25 : 0;
    const bounce = isWalking ? Math.abs(Math.sin(walkProgress * Math.PI * 14)) * 0.025 : 0;
    const idleBreathing = Math.sin(now * 0.002) * 0.003;
    const effectiveYOffset = isWalking ? bounce : idleBreathing;

    // ── KHÁNH VY (Female MC): Backstage [5.28, 0.14, -8.96] -> Catwalk [3.92, 0.14, -8.48] -> Behind Desk [3.46, 0.14, -6.98] ──
    if (kvRef.current) {
      const u = walkProgress;
      const w0 = (1 - u) * (1 - u);
      const w1 = 2 * (1 - u) * u;
      const w2 = u * u;
      const targetX = w0 * 5.28 + w1 * 3.47 + w2 * 3.46;
      const targetZ = w0 * (-8.96) + w1 * (-8.99) + w2 * (-6.98);
      kvRef.current.position.set(targetX, 0.14 + effectiveYOffset, targetZ);

      const tanX = 2 * (1 - u) * (3.47 - 5.28) + 2 * u * (3.46 - 3.47);
      const tanZ = 2 * (1 - u) * (-8.99 - (-8.96)) + 2 * u * (-6.98 - (-8.99));
      const walkRot = Math.atan2(-tanX, -tanZ);
      kvRef.current.rotation.y = THREE.MathUtils.lerp(walkRot, -0.25, walkProgress * walkProgress);
    }

    // ── NGỌC HUY (Male MC): Backstage [2.08, 0.14, -9.77] -> Catwalk [3.04, 0.14, -8.70] -> Behind Desk [2.73, 0.14, -7.16] ──
    if (nhRef.current) {
      const u = walkProgress;
      const w0 = (1 - u) * (1 - u);
      const w1 = 2 * (1 - u) * u;
      const w2 = u * u;
      const targetX = w0 * 2.08 + w1 * 3.675 + w2 * 2.73;
      const targetZ = w0 * (-9.77) + w1 * (-8.935) + w2 * (-7.16);
      nhRef.current.position.set(targetX, 0.14 + effectiveYOffset, targetZ);

      const tanX = 2 * (1 - u) * (3.675 - 2.08) + 2 * u * (2.73 - 3.675);
      const tanZ = 2 * (1 - u) * (-8.935 - (-9.77)) + 2 * u * (-7.16 - (-8.935));
      const walkRot = Math.atan2(-tanX, -tanZ);
      nhRef.current.rotation.y = THREE.MathUtils.lerp(walkRot, -0.25, walkProgress * walkProgress);
    }

    // Two-segment leg stride swing with natural knee flexion (eliminating stiffness & floor clipping)
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

    // Arm stride swing
    if (kvLeftArmRef.current && kvRightArmRef.current) {
      kvLeftArmRef.current.rotation.x = 0.35 - armStride;
      kvRightArmRef.current.rotation.x = 0.45 + armStride;
    }
    if (nhLeftArmRef.current && nhRightArmRef.current) {
      nhLeftArmRef.current.rotation.x = 0.45 + armStride;
      nhRightArmRef.current.rotation.x = 0.25 - armStride;
    }
  });

  return (
    <group>
      {/* ── KHÁNH VY (Female Presenter) ── */}
      <group ref={kvRef} position={[3.46, 0.14, -6.98]} rotation={[0, -0.25, 0]}>
        {/* ── CRANIOFACIAL ANATOMY (Feminine East Asian Proportions) ── */}
        {/* 1. Cranial Vault (Recessed so face features emerge cleanly) */}
        <mesh position={[0, 1.58, -0.015]} scale={[0.94, 1.05, 1.02]}>
          <sphereGeometry args={[0.076, 28, 28]} />
          <primitive object={kvSkinMat} attach="material" />
        </mesh>

        {/* 2. Delicate Feminine Cheeks */}
        <mesh position={[-0.035, 1.545, 0.028]} scale={[0.8, 0.9, 0.6]}>
          <sphereGeometry args={[0.018, 14, 14]} />
          <primitive object={kvSkinMat} attach="material" />
        </mesh>
        <mesh position={[0.035, 1.545, 0.028]} scale={[0.8, 0.9, 0.6]}>
          <sphereGeometry args={[0.018, 14, 14]} />
          <primitive object={kvSkinMat} attach="material" />
        </mesh>

        {/* 3. Slender Tapered Feminine Jawline */}
        <mesh position={[0, 1.52, 0.025]} rotation={[0.18, 0, 0]}>
          <cylinderGeometry args={[0.050, 0.034, 0.068, 20]} />
          <primitive object={kvSkinMat} attach="material" />
        </mesh>

        {/* 4. Soft Rounded Chin Ellipsoid */}
        <mesh position={[0, 1.485, 0.052]} scale={[1.1, 0.95, 1.05]}>
          <sphereGeometry args={[0.015, 16, 16]} />
          <primitive object={kvSkinMat} attach="material" />
        </mesh>

        {/* 5. Sculpted Left & Right Ears */}
        <SculptedEar
          position={[-0.074, 1.56, 0.005]}
          rotation={[0, -0.15, 0.05]}
          skinMat={kvSkinMat}
          isLeft={true}
          scale={0.95}
        />
        <SculptedEar
          position={[0.074, 1.56, 0.005]}
          rotation={[0, 0.15, -0.05]}
          skinMat={kvSkinMat}
          isLeft={false}
          scale={0.95}
        />

        {/* ── MULTI-LAYERED VOLUMETRIC BRUNETTE HAIR (PBR Sheen, Flowing Locks) ── */}
        {/* Layer 1: Cranial Base Hair Dome */}
        <mesh position={[0, 1.605, -0.015]} scale={[0.98, 1.02, 1.02]}>
          <sphereGeometry args={[0.084, 24, 24]} />
          <primitive object={kvHairMat} attach="material" />
        </mesh>
        {/* Layer 2: Long Cascading Rear Locks */}
        <mesh position={[0, 1.47, -0.045]}>
          <cylinderGeometry args={[0.082, 0.112, 0.28, 16]} />
          <primitive object={kvHairMat} attach="material" />
        </mesh>
        {/* Layer 3: Soft Natural Fringe across Forehead */}
        <mesh position={[0, 1.625, 0.058]} rotation={[0, 0, Math.PI / 2]}>
          <capsuleGeometry args={[0.012, 0.065, 6, 12]} />
          <primitive object={kvHairMat} attach="material" />
        </mesh>
        {/* Layer 3: Shoulder-Flowing Locks Cascading onto Chest (Broadcast Photo Match) */}
        <mesh position={[-0.082, 1.44, 0.045]} rotation={[0.22, 0.15, -0.16]}>
          <capsuleGeometry args={[0.018, 0.16, 8, 12]} />
          <primitive object={kvHairMat} attach="material" />
        </mesh>
        <mesh position={[-0.072, 1.32, 0.082]} rotation={[0.12, 0.05, -0.06]}>
          <capsuleGeometry args={[0.016, 0.13, 8, 12]} />
          <primitive object={kvHairMat} attach="material" />
        </mesh>
        <mesh position={[0.082, 1.44, 0.045]} rotation={[0.22, -0.15, 0.16]}>
          <capsuleGeometry args={[0.018, 0.16, 8, 12]} />
          <primitive object={kvHairMat} attach="material" />
        </mesh>
        <mesh position={[0.072, 1.32, 0.082]} rotation={[0.12, -0.05, 0.06]}>
          <capsuleGeometry args={[0.016, 0.13, 8, 12]} />
          <primitive object={kvHairMat} attach="material" />
        </mesh>

        {/* ── EXPRESSIVE RADIANT FACIAL FEATURES ── */}
        {/* Upgraded ProceduralEye with Almond Contour & 3° Canthal Tilt */}
        <ProceduralEye
          position={[-0.028, 1.565, 0.076]}
          scale={0.94}
          isLeft={true}
        />
        <ProceduralEye
          position={[0.028, 1.565, 0.076]}
          scale={0.94}
          isLeft={false}
        />

        {/* Elegant Curved Eyebrows */}
        <mesh position={[-0.029, 1.590, 0.078]} rotation={[0, 0, 0.06]}>
          <boxGeometry args={[0.026, 0.0040, 0.004]} />
          <meshStandardMaterial color="#2a1808" roughness={0.8} />
        </mesh>
        <mesh position={[0.029, 1.590, 0.078]} rotation={[0, 0, -0.06]}>
          <boxGeometry args={[0.026, 0.0040, 0.004]} />
          <meshStandardMaterial color="#2a1808" roughness={0.8} />
        </mesh>

        {/* Procedural 3D Nose (Slender bridge, rounded tip, paired alar lobule wings) */}
        <ProceduralNose
          position={[0, 1.545, 0.078]}
          skinMat={kvSkinMat}
          scale={0.94}
          width={0.95}
          length={0.96}
        />

        {/* Procedural 3D Mouth (Radiant Welcoming Smile with Cupid's bow and pearl teeth) */}
        <ProceduralMouth
          position={[0, 1.512, 0.075]}
          scale={0.95}
          lipColor="#c43d56"
          smile={0.08}
          openSmile={true}
        />

        {/* Signature Thin Titanium Wireframe Eyeglasses */}
        <group position={[0, 1.565, 0.085]}>
          <mesh position={[-0.028, 0, 0]}>
            <torusGeometry args={[0.014, 0.0016, 16, 32]} />
            <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.15} />
          </mesh>
          <mesh position={[0.028, 0, 0]}>
            <torusGeometry args={[0.014, 0.0016, 16, 32]} />
            <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.15} />
          </mesh>
          <mesh position={[0, 0.002, 0]}>
            <boxGeometry args={[0.014, 0.002, 0.003]} />
            <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.15} />
          </mesh>
          <mesh position={[-0.043, 0, -0.04]} rotation={[Math.PI / 2, 0, 0.15]}>
            <cylinderGeometry args={[0.0015, 0.0015, 0.08, 6]} />
            <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.15} />
          </mesh>
          <mesh position={[0.043, 0, -0.04]} rotation={[Math.PI / 2, 0, -0.15]}>
            <cylinderGeometry args={[0.0015, 0.0015, 0.08, 6]} />
            <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.15} />
          </mesh>
        </group>

        {/* Angled Neck with Forward Slope */}
        <mesh position={[0, 1.465, 0.012]} rotation={[0.06, 0, 0]}>
          <cylinderGeometry args={[0.030, 0.035, 0.078, 18]} />
          <primitive object={kvSkinMat} attach="material" />
        </mesh>

        {/* ── TAILORED FEMALE BROADCAST SUIT BLAZER / ÁO DÀI SILHOUETTE ── */}
        {/* Mandarin Collar / Standing Neckband (Chân Cổ) */}
        <mesh position={[0, 1.442, 0.015]} rotation={[0.12, 0, 0]}>
          <torusGeometry args={[0.042, 0.008, 8, 20]} />
          <meshStandardMaterial color="#ffffff" roughness={0.35} />
        </mesh>

        {/* Structured Female Shoulder Yoke with Sloping Trapezius Contours */}
        <mesh position={[0, 1.405, 0]}>
          <boxGeometry args={[0.34, 0.05, 0.16]} />
          <meshStandardMaterial color="#be185d" roughness={0.35} />
        </mesh>
        <mesh position={[-0.072, 1.41, 0]} rotation={[0, 0, 0.35]}>
          <capsuleGeometry args={[0.024, 0.10, 8, 14]} />
          <meshStandardMaterial color="#be185d" roughness={0.35} />
        </mesh>
        <mesh position={[0.072, 1.41, 0]} rotation={[0, 0, -0.35]}>
          <capsuleGeometry args={[0.024, 0.10, 8, 14]} />
          <meshStandardMaterial color="#be185d" roughness={0.35} />
        </mesh>

        {/* Peaked Blazer Lapels (Ve Xếch Nhọn Sang Trọng) */}
        <mesh position={[-0.055, 1.385, 0.080]} rotation={[0.26, -0.16, 0.22]}>
          <boxGeometry args={[0.048, 0.085, 0.010]} />
          <meshStandardMaterial color="#9d174d" roughness={0.30} />
        </mesh>
        <mesh position={[0.055, 1.385, 0.080]} rotation={[0.26, 0.16, -0.22]}>
          <boxGeometry args={[0.048, 0.085, 0.010]} />
          <meshStandardMaterial color="#9d174d" roughness={0.30} />
        </mesh>

        {/* Contoured Female Waist & Bust (Hourglass Broadcast Silhouette) */}
        <mesh position={[0, 1.31, 0]} scale={[1.25, 1.0, 0.75]}>
          <cylinderGeometry args={[0.135, 0.115, 0.18, 18]} />
          <meshStandardMaterial color="#be185d" roughness={0.35} />
        </mesh>
        <mesh position={[0, 1.18, 0]} scale={[1.25, 1.0, 0.75]}>
          <cylinderGeometry args={[0.115, 0.135, 0.18, 18]} />
          <meshStandardMaterial color="#be185d" roughness={0.35} />
        </mesh>

        {/* Deep Wine/Burgundy Silk Necktie / Ascot Accent */}
        <mesh position={[0, 1.42, 0.085]}>
          <boxGeometry args={[0.026, 0.030, 0.014]} />
          <meshStandardMaterial color="#ffffff" roughness={0.38} />
        </mesh>
        <mesh position={[0, 1.29, 0.092]}>
          <boxGeometry args={[0.030, 0.22, 0.008]} />
          <meshStandardMaterial color="#ffffff" roughness={0.38} />
        </mesh>
        <mesh position={[0, 1.16, 0.092]} rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.018, 0.035, 4]} />
          <meshStandardMaterial color="#ffffff" roughness={0.38} />
        </mesh>

        {/* Single Tailored Blazer Button Closure */}
        <mesh position={[0, 1.24, 0.094]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.004, 0.004, 0.004, 10]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* ── ARMS WITH SPHERICAL BALL JOINT NODES & SCULPTED HANDS ── */}
        {/* Left Shoulder Spherical Ball Joint Node (r=0.036) */}
        <mesh position={[-0.16, 1.34, 0.02]}>
          <sphereGeometry args={[0.036, 16, 16]} />
          <meshStandardMaterial color="#be185d" roughness={0.35} />
        </mesh>
        {/* Left Arm holding Cue Card */}
        <group ref={kvLeftArmRef}>
          <mesh position={[-0.16, 1.32, 0.02]} rotation={[0.35, 0, -0.15]}>
            <capsuleGeometry args={[0.032, 0.14, 8, 12]} />
            <meshStandardMaterial color="#be185d" roughness={0.35} />
          </mesh>
          {/* Left Elbow Spherical Ball Joint Node (r=0.027) */}
          <mesh position={[-0.155, 1.24, 0.07]}>
            <sphereGeometry args={[0.027, 14, 14]} />
            <meshStandardMaterial color="#be185d" roughness={0.35} />
          </mesh>
          <mesh position={[-0.15, 1.18, 0.12]} rotation={[0.60, 0.20, -0.10]}>
            <capsuleGeometry args={[0.026, 0.14, 8, 12]} />
            <meshStandardMaterial color="#be185d" roughness={0.35} />
          </mesh>
          {/* Sculpted Hand holding Cue Card */}
          <SculptedHand
            position={[-0.14, 1.10, 0.22]}
            rotation={[0.2, -0.2, 0.1]}
            skinMat={kvSkinMat}
            isLeft={true}
            mode="card"
          />
          {/* Cue Card */}
          <mesh position={[-0.14, 1.14, 0.24]} rotation={[0.25, -0.20, 0.10]}>
            <boxGeometry args={[0.18, 0.005, 0.12]} />
            <meshStandardMaterial color="#ffffff" roughness={0.2} />
          </mesh>
          <mesh position={[-0.14, 1.14, 0.242]} rotation={[0.25, -0.20, 0.10]}>
            <boxGeometry args={[0.16, 0.006, 0.02]} />
            <meshBasicMaterial color="#f59e0b" />
          </mesh>
        </group>

        {/* Right Shoulder Spherical Ball Joint Node (r=0.036) */}
        <mesh position={[0.16, 1.34, 0.02]}>
          <sphereGeometry args={[0.036, 16, 16]} />
          <meshStandardMaterial color="#be185d" roughness={0.35} />
        </mesh>
        {/* Right Arm holding Microphone */}
        <group ref={kvRightArmRef}>
          <mesh position={[0.16, 1.32, 0.02]} rotation={[0.45, 0, 0.15]}>
            <capsuleGeometry args={[0.032, 0.14, 8, 12]} />
            <meshStandardMaterial color="#be185d" roughness={0.35} />
          </mesh>
          {/* Right Elbow Spherical Ball Joint Node (r=0.027) */}
          <mesh position={[0.155, 1.27, 0.08]}>
            <sphereGeometry args={[0.027, 14, 14]} />
            <meshStandardMaterial color="#be185d" roughness={0.35} />
          </mesh>
          <mesh position={[0.15, 1.22, 0.14]} rotation={[0.75, -0.20, 0.10]}>
            <capsuleGeometry args={[0.026, 0.14, 8, 12]} />
            <meshStandardMaterial color="#be185d" roughness={0.35} />
          </mesh>
          {/* Sculpted Hand holding Microphone */}
          <SculptedHand
            position={[0.14, 1.28, 0.22]}
            rotation={[-0.2, 0.2, -0.1]}
            skinMat={kvSkinMat}
            isLeft={false}
            mode="mic"
          />
          <group position={[0.14, 1.32, 0.25]} rotation={[-0.3, 0, 0]}>
            <mesh>
              <cylinderGeometry args={[0.009, 0.007, 0.12, 12]} />
              <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0.07, 0]}>
              <sphereGeometry args={[0.015, 16, 16]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.3} />
            </mesh>
          </group>
        </group>

        {/* Tailored Dark Trousers / Waist */}
        <mesh position={[0, 1.02, 0]}>
          <boxGeometry args={[0.26, 0.14, 0.17]} />
          <meshStandardMaterial color="#0f172a" roughness={0.8} />
        </mesh>

        {/* Left & Right Walking Legs with Knee Articulation */}
        <group ref={kvLeftLegRef} position={[-0.07, 0.95, 0]}>
          <mesh position={[0, -0.19, 0]}>
            <capsuleGeometry args={[0.046, 0.34, 8, 14]} />
            <meshStandardMaterial color="#0f172a" roughness={0.8} />
          </mesh>
          <group ref={kvLeftKneeRef} position={[0, -0.38, 0]}>
            <mesh position={[0, -0.19, 0]}>
              <capsuleGeometry args={[0.042, 0.34, 8, 14]} />
              <meshStandardMaterial color="#0f172a" roughness={0.8} />
            </mesh>
            <mesh position={[0, -0.40, 0.02]}>
              <boxGeometry args={[0.052, 0.05, 0.12]} />
              <meshStandardMaterial color="#020617" roughness={0.3} metalness={0.4} />
            </mesh>
          </group>
        </group>
        <group ref={kvRightLegRef} position={[0.07, 0.95, 0]}>
          <mesh position={[0, -0.19, 0]}>
            <capsuleGeometry args={[0.046, 0.34, 8, 14]} />
            <meshStandardMaterial color="#0f172a" roughness={0.8} />
          </mesh>
          <group ref={kvRightKneeRef} position={[0, -0.38, 0]}>
            <mesh position={[0, -0.19, 0]}>
              <capsuleGeometry args={[0.042, 0.34, 8, 14]} />
              <meshStandardMaterial color="#0f172a" roughness={0.8} />
            </mesh>
            <mesh position={[0, -0.40, 0.02]}>
              <boxGeometry args={[0.052, 0.05, 0.12]} />
              <meshStandardMaterial color="#020617" roughness={0.3} metalness={0.4} />
            </mesh>
          </group>
        </group>
      </group>

      {/* ── NGỌC HUY (Male Presenter) ── */}
      <group ref={nhRef} position={[2.73, 0.14, -7.16]} rotation={[0, -0.25, 0]}>
        {/* ── CRANIOFACIAL ANATOMY (Masculine East Asian Proportions) ── */}
        {/* 1. Cranial Vault (Recessed so facial features emerge cleanly) */}
        <mesh position={[0, 1.62, -0.015]} scale={[0.96, 1.05, 1.04]}>
          <sphereGeometry args={[0.082, 28, 28]} />
          <primitive object={nhSkinMat} attach="material" />
        </mesh>

        {/* 2. Structured Subtle Masculine Cheeks */}
        <mesh position={[-0.038, 1.585, 0.030]} scale={[0.8, 0.9, 0.6]}>
          <sphereGeometry args={[0.022, 14, 14]} />
          <primitive object={nhSkinMat} attach="material" />
        </mesh>
        <mesh position={[0.038, 1.585, 0.030]} scale={[0.8, 0.9, 0.6]}>
          <sphereGeometry args={[0.022, 14, 14]} />
          <primitive object={nhSkinMat} attach="material" />
        </mesh>

        {/* 3. Defined Masculine Jawline (Tapered cylinder eliminating box jaw) */}
        <mesh position={[0, 1.555, 0.030]} rotation={[0.20, 0, 0]}>
          <cylinderGeometry args={[0.058, 0.042, 0.076, 20]} />
          <primitive object={nhSkinMat} attach="material" />
        </mesh>

        {/* 4. Defined Rounded Chin Ellipsoid */}
        <mesh position={[0, 1.515, 0.060]} scale={[1.2, 0.95, 1.1]}>
          <sphereGeometry args={[0.019, 16, 16]} />
          <primitive object={nhSkinMat} attach="material" />
        </mesh>

        {/* 5. Sculpted Left & Right Ears */}
        <SculptedEar
          position={[-0.082, 1.60, 0.005]}
          rotation={[0, -0.20, 0.05]}
          skinMat={nhSkinMat}
          isLeft={true}
          scale={1.05}
        />
        <SculptedEar
          position={[0.082, 1.60, 0.005]}
          rotation={[0, 0.20, -0.05]}
          skinMat={nhSkinMat}
          isLeft={false}
          scale={1.05}
        />

        {/* ── MULTI-LAYERED VOLUMETRIC SIDE-PART POMPADOUR / QUIFF (PBR Sheen) ── */}
        {/* Layer 1: Cranial Base Hair Dome */}
        <mesh position={[0, 1.645, -0.015]} scale={[0.98, 1.02, 1.02]}>
          <sphereGeometry args={[0.088, 24, 24]} />
          <primitive object={nhHairMat} attach="material" />
        </mesh>
        {/* Layer 2: Natural Side-Part Hair Sweep */}
        <mesh position={[0.015, 1.660, 0.015]} rotation={[-0.10, 0.08, -0.08]}>
          <capsuleGeometry args={[0.022, 0.08, 8, 14]} />
          <primitive object={nhHairMat} attach="material" />
        </mesh>
        {/* Layer 3: Tapered Temples & Sideburns */}
        <mesh position={[-0.068, 1.66, 0.02]} rotation={[0, 0, -0.15]}>
          <capsuleGeometry args={[0.014, 0.06, 6, 8]} />
          <primitive object={nhHairMat} attach="material" />
        </mesh>
        <mesh position={[0.068, 1.66, 0.02]} rotation={[0, 0, 0.15]}>
          <capsuleGeometry args={[0.014, 0.06, 6, 8]} />
          <primitive object={nhHairMat} attach="material" />
        </mesh>

        {/* ── EXPRESSIVE MASCULINE FACIAL FEATURES ── */}
        {/* Upgraded ProceduralEye with Almond Contour & 3° Canthal Tilt */}
        <ProceduralEye
          position={[-0.030, 1.605, 0.078]}
          scale={0.96}
          isLeft={true}
        />
        <ProceduralEye
          position={[0.030, 1.605, 0.078]}
          scale={0.96}
          isLeft={false}
        />

        {/* Masculine Defined Eyebrows */}
        <mesh position={[-0.031, 1.632, 0.082]} rotation={[0, 0, 0.08]}>
          <boxGeometry args={[0.028, 0.0055, 0.005]} />
          <meshStandardMaterial color="#171412" roughness={0.8} />
        </mesh>
        <mesh position={[0.031, 1.632, 0.082]} rotation={[0, 0, -0.08]}>
          <boxGeometry args={[0.028, 0.0055, 0.005]} />
          <meshStandardMaterial color="#171412" roughness={0.8} />
        </mesh>

        {/* Procedural 3D Nose (Structured masculine bridge, rounded tip, paired alar lobule wings) */}
        <ProceduralNose
          position={[0, 1.585, 0.082]}
          skinMat={nhSkinMat}
          scale={1.02}
          width={1.05}
          length={1.04}
        />

        {/* Procedural 3D Mouth (Natural Confident Broadcast Smile) */}
        <ProceduralMouth
          position={[0, 1.538, 0.078]}
          scale={0.98}
          lipColor="#9e4747"
          smile={0.06}
          openSmile={true}
        />

        {/* Angled Masculine Neck */}
        <mesh position={[0, 1.485, 0.012]} rotation={[0.06, 0, 0]}>
          <cylinderGeometry args={[0.038, 0.043, 0.080, 18]} />
          <primitive object={nhSkinMat} attach="material" />
        </mesh>

        {/* Inner Crisp White Dress Shirt Visible at Throat */}
        <mesh position={[0, 1.455, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.044, 0.006, 8, 20]} />
          <meshStandardMaterial color="#ffffff" roughness={0.35} />
        </mesh>
        <mesh position={[0, 1.43, 0.085]}>
          <boxGeometry args={[0.075, 0.09, 0.04]} />
          <meshStandardMaterial color="#ffffff" roughness={0.35} />
        </mesh>

        {/* ── TAILORED VTV3 TWO-BUTTON BROADCAST SUIT JACKET (#f3ede5) ── */}
        {/* Structured Suit Shoulders / Yoke */}
        <mesh position={[0, 1.44, 0]}>
          <boxGeometry args={[0.42, 0.07, 0.20]} />
          <meshStandardMaterial color="#1e293b" roughness={0.45} />
        </mesh>
        {/* Sloping Trapezius Contours */}
        <mesh position={[-0.085, 1.43, 0]} rotation={[0, 0, 0.38]}>
          <capsuleGeometry args={[0.028, 0.12, 8, 14]} />
          <meshStandardMaterial color="#1e293b" roughness={0.45} />
        </mesh>
        <mesh position={[0.085, 1.43, 0]} rotation={[0, 0, -0.38]}>
          <capsuleGeometry args={[0.028, 0.12, 8, 14]} />
          <meshStandardMaterial color="#1e293b" roughness={0.45} />
        </mesh>

        {/* Notched Suit Lapels (Ve Chữ K Cổ Điển Sang Trọng) */}
        {/* Left Upper Collar & Lower Notch */}
        <mesh position={[-0.065, 1.465, 0.088]} rotation={[0.30, -0.14, 0.18]}>
          <boxGeometry args={[0.052, 0.045, 0.012]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} />
        </mesh>
        <mesh position={[-0.070, 1.375, 0.092]} rotation={[0.24, -0.12, 0.15]}>
          <boxGeometry args={[0.056, 0.075, 0.012]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} />
        </mesh>
        {/* Right Upper Collar & Lower Notch */}
        <mesh position={[0.065, 1.465, 0.088]} rotation={[0.30, 0.14, -0.18]}>
          <boxGeometry args={[0.052, 0.045, 0.012]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} />
        </mesh>
        <mesh position={[0.070, 1.375, 0.092]} rotation={[0.24, 0.12, -0.15]}>
          <boxGeometry args={[0.056, 0.075, 0.012]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} />
        </mesh>

        {/* Main Suit Torso Body */}
        <mesh position={[0, 1.32, 0]} scale={[1.30, 1.0, 0.78]}>
          <cylinderGeometry args={[0.165, 0.155, 0.25, 18]} />
          <meshStandardMaterial color="#1e293b" roughness={0.45} />
        </mesh>
        <mesh position={[0, 1.15, 0]} scale={[1.30, 1.0, 0.78]}>
          <cylinderGeometry args={[0.155, 0.165, 0.22, 18]} />
          <meshStandardMaterial color="#1e293b" roughness={0.45} />
        </mesh>

        {/* Left Chest Welt Pocket (Túi Ngực) with Folded White Silk Pocket Square */}
        <mesh position={[-0.085, 1.375, 0.096]}>
          <boxGeometry args={[0.045, 0.008, 0.006]} />
          <meshStandardMaterial color="#0f172a" roughness={0.5} />
        </mesh>
        {/* Folded Pocket Square (White Silk Accent) */}
        <mesh position={[-0.085, 1.390, 0.098]} rotation={[0.1, 0, 0.15]}>
          <coneGeometry args={[0.012, 0.018, 3]} />
          <meshStandardMaterial color="#ffffff" roughness={0.2} />
        </mesh>

        {/* Two-Button Front Suit Closure */}
        <mesh position={[0, 1.28, 0.098]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.0045, 0.0045, 0.004, 12]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 1.21, 0.098]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.0045, 0.0045, 0.004, 12]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* Waist Flap Pockets (Túi Nắp Hông) */}
        <mesh position={[-0.095, 1.16, 0.092]}>
          <boxGeometry args={[0.055, 0.014, 0.012]} />
          <meshStandardMaterial color="#1e293b" roughness={0.45} />
        </mesh>
        <mesh position={[0.095, 1.16, 0.092]}>
          <boxGeometry args={[0.055, 0.014, 0.012]} />
          <meshStandardMaterial color="#1e293b" roughness={0.45} />
        </mesh>

        {/* ── ARMS WITH SPHERICAL BALL JOINT NODES & SCULPTED HANDS ── */}
        {/* Left Shoulder Spherical Ball Joint Node (r=0.036) */}
        <mesh position={[-0.20, 1.36, 0.02]}>
          <sphereGeometry args={[0.036, 16, 16]} />
          <meshStandardMaterial color="#1e293b" roughness={0.45} />
        </mesh>
        {/* Left Arm (holding Microphone) with Silver Wristwatch */}
        <group ref={nhLeftArmRef}>
          <mesh position={[-0.20, 1.34, 0.03]} rotation={[0.45, 0, -0.15]}>
            <capsuleGeometry args={[0.038, 0.16, 8, 12]} />
            <meshStandardMaterial color="#1e293b" roughness={0.45} />
          </mesh>
          {/* Left Elbow Spherical Ball Joint Node (r=0.027) */}
          <mesh position={[-0.19, 1.28, 0.08]}>
            <sphereGeometry args={[0.027, 14, 14]} />
            <meshStandardMaterial color="#1e293b" roughness={0.45} />
          </mesh>
          <mesh position={[-0.18, 1.24, 0.14]} rotation={[0.75, 0.20, -0.10]}>
            <capsuleGeometry args={[0.030, 0.14, 8, 12]} />
            <meshStandardMaterial color="#1e293b" roughness={0.45} />
          </mesh>
          {/* Wrist Cuff */}
          <mesh position={[-0.16, 1.30, 0.21]}>
            <torusGeometry args={[0.032, 0.006, 8, 16]} />
            <meshStandardMaterial color="#1e293b" roughness={0.45} />
          </mesh>
          {/* Silver Wristwatch on Left Wrist */}
          <mesh position={[-0.16, 1.31, 0.21]} rotation={[0.6, 0.2, 0]}>
            <cylinderGeometry args={[0.016, 0.016, 0.006, 16]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.1} />
          </mesh>
          <mesh position={[-0.16, 1.31, 0.21]} rotation={[0.6, 0.2, 0]}>
            <torusGeometry args={[0.026, 0.004, 6, 16]} />
            <meshStandardMaterial color="#1e293b" roughness={0.6} />
          </mesh>
          {/* Sculpted Hand holding Microphone */}
          <SculptedHand
            position={[-0.15, 1.35, 0.23]}
            rotation={[-0.3, 0.1, 0]}
            skinMat={nhSkinMat}
            isLeft={true}
            mode="mic"
          />
          <group position={[-0.15, 1.40, 0.26]} rotation={[-0.4, 0, 0]}>
            <mesh>
              <cylinderGeometry args={[0.010, 0.008, 0.12, 12]} />
              <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0.07, 0]}>
              <sphereGeometry args={[0.016, 16, 16]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.3} />
            </mesh>
          </group>
        </group>

        {/* Right Shoulder Spherical Ball Joint Node (r=0.036) */}
        <mesh position={[0.20, 1.36, 0.02]}>
          <sphereGeometry args={[0.036, 16, 16]} />
          <meshStandardMaterial color="#1e293b" roughness={0.45} />
        </mesh>
        {/* Right Arm holding Host Tablet */}
        <group ref={nhRightArmRef}>
          <mesh position={[0.20, 1.34, 0.02]} rotation={[0.25, 0, 0.12]}>
            <capsuleGeometry args={[0.038, 0.16, 8, 12]} />
            <meshStandardMaterial color="#1e293b" roughness={0.45} />
          </mesh>
          {/* Right Elbow Spherical Ball Joint Node (r=0.027) */}
          <mesh position={[0.21, 1.24, 0.07]}>
            <sphereGeometry args={[0.027, 14, 14]} />
            <meshStandardMaterial color="#1e293b" roughness={0.45} />
          </mesh>
          <mesh position={[0.22, 1.18, 0.12]} rotation={[0.45, -0.15, 0.10]}>
            <capsuleGeometry args={[0.030, 0.14, 8, 12]} />
            <meshStandardMaterial color="#1e293b" roughness={0.45} />
          </mesh>
          {/* Sculpted Hand holding Tablet */}
          <SculptedHand
            position={[0.22, 1.12, 0.20]}
            rotation={[0.3, -0.2, 0]}
            skinMat={nhSkinMat}
            isLeft={false}
            mode="tablet"
          />
          {/* Host Tablet */}
          <mesh position={[0.23, 1.14, 0.22]} rotation={[0.35, -0.20, 0]}>
            <boxGeometry args={[0.18, 0.008, 0.24]} />
            <meshStandardMaterial color="#0284c7" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0.23, 1.145, 0.22]} rotation={[0.35, -0.20, 0]}>
            <boxGeometry args={[0.16, 0.009, 0.22]} />
            <meshBasicMaterial color="#38bdf8" />
          </mesh>
        </group>

        {/* Tailored Dark Obsidian Trousers & Legs (#0f172a) with Knee Flexion */}
        <group ref={nhLeftLegRef} position={[-0.09, 0.90, 0]}>
          <mesh position={[0, -0.21, 0]}>
            <capsuleGeometry args={[0.055, 0.36, 8, 14]} />
            <meshStandardMaterial color="#0f172a" roughness={0.85} />
          </mesh>
          <group ref={nhLeftKneeRef} position={[0, -0.42, 0]}>
            <mesh position={[0, -0.21, 0]}>
              <capsuleGeometry args={[0.050, 0.36, 8, 14]} />
              <meshStandardMaterial color="#0f172a" roughness={0.85} />
            </mesh>
            <mesh position={[0, -0.44, 0.03]}>
              <boxGeometry args={[0.065, 0.05, 0.13]} />
              <meshStandardMaterial color="#020617" roughness={0.3} metalness={0.3} />
            </mesh>
          </group>
        </group>
        <group ref={nhRightLegRef} position={[0.09, 0.90, 0]}>
          <mesh position={[0, -0.21, 0]}>
            <capsuleGeometry args={[0.055, 0.36, 8, 14]} />
            <meshStandardMaterial color="#0f172a" roughness={0.85} />
          </mesh>
          <group ref={nhRightKneeRef} position={[0, -0.42, 0]}>
            <mesh position={[0, -0.21, 0]}>
              <capsuleGeometry args={[0.050, 0.36, 8, 14]} />
              <meshStandardMaterial color="#0f172a" roughness={0.85} />
            </mesh>
            <mesh position={[0, -0.44, 0.03]}>
              <boxGeometry args={[0.065, 0.05, 0.13]} />
              <meshStandardMaterial color="#020617" roughness={0.3} metalness={0.3} />
            </mesh>
          </group>
        </group>
      </group>
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
  const figureRef = useRef<THREE.Group>(null);
  const upperBodyRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const rightForearmRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const leftForearmRef = useRef<THREE.Group>(null);
  const rightThighRef = useRef<THREE.Group>(null);
  const rightKneeRef = useRef<THREE.Group>(null);
  const leftThighRef = useRef<THREE.Group>(null);
  const leftKneeRef = useRef<THREE.Group>(null);

  const currentSeat = state.entranceState?.currentSeatIdx ?? 0;
  const style = CONTESTANT_STYLES[currentSeat % CONTESTANT_STYLES.length];
  const skinMat = useMemo(() => createWarmPeachSkinMaterial(style.skinTone), [style.skinTone]);
  const hairMat = useMemo(() => createHairMaterial(style.hairColor), [style.hairColor]);
  const seatStart = state.entranceState?.seatStartedAt || state.entranceState?.startedAt || Date.now();
  const getNow = serverNow || (() => Date.now());

  useFrame(() => {
    const g = figureRef.current;
    if (!g) return;

    const targetCfg = contestantConfigs[currentSeat] || contestantConfigs[0];
    const deskRotY = targetCfg ? targetCfg.rotY : 0;
    const deskX = targetCfg ? targetCfg.pos[0] - Math.sin(deskRotY) * 0.42 : -3.0;
    const deskY = targetCfg ? targetCfg.pos[1] : 0.22;
    const deskZ = targetCfg ? targetCfg.pos[2] - Math.cos(deskRotY) * 0.42 : -3.5;

    const startX = 0;
    const startY = 1.84;
    const startZ = 12.80;

    const now = getNow();
    const t = Math.max(0, (now - seatStart) / 1000);

    const gesture = state.entranceState?.seatGestures?.[currentSeat] || "wave_single";

    let curX = startX;
    let curY = startY;
    let curZ = startZ;
    let curRotY = Math.PI; // Facing towards camera (-Z)
    let isWalking = true;
    let isGesturing = false;

    // 0.0s -> 1.0s: Clean 1-second pause with EMPTY STAIRS before contestant emerges ("thí sinh kế tiếp bước ra sau khoảng 1s")
    if (t < 1.0) {
      g.visible = false;
      curX = startX;
      curY = startY;
      curZ = startZ;
      isWalking = false;
    } else if (t < 2.5) {
      // Phase 1 (1.0 -> 2.5s): Steps out from behind portal arches onto top plinth
      g.visible = true;
      const p = (t - 1.0) / 1.5;
      curX = startX;
      curY = startY;
      curZ = THREE.MathUtils.lerp(startZ, 11.90, p);
      curRotY = Math.PI;
    } else if (t < 4.8) {
      // Phase 2 (2.5 -> 4.8s): Walks down upper stairs to mid-stairs landing platform ("Bục Giữa")
      g.visible = true;
      const p = (t - 2.5) / 2.3;
      curX = 0;
      curY = THREE.MathUtils.lerp(1.84, 0.92, p);
      curZ = THREE.MathUtils.lerp(11.90, 10.20, p);
      curRotY = Math.PI;
    } else if (t < 7.0) {
      // Phase 3 (4.8 -> 7.0s): Stands firmly on Bục Giữa & performs signature gesture (2.2s)
      g.visible = true;
      curX = 0;
      curY = 0.92;
      curZ = 10.20;
      curRotY = Math.PI;
      isWalking = false;
      isGesturing = true;
    } else if (t < 9.0) {
      // Phase 4 (7.0 -> 9.0s): Walks down lower stairs to studio dais floor ("rồi họ xuống")
      g.visible = true;
      const p = (t - 7.0) / 2.0;
      curX = 0;
      curY = THREE.MathUtils.lerp(0.92, 0.22, p);
      curZ = THREE.MathUtils.lerp(10.20, 6.20, p);
      curRotY = Math.PI;
    } else if (t < 10.5) {
      // Phase 5 (9.0 -> 10.5s): Fans out across dais to assigned podium desk
      g.visible = true;
      const p = (t - 9.0) / 1.5;
      const easeP = p * p * (3 - 2 * p); // Smooth ease-in-out
      curX = THREE.MathUtils.lerp(0, deskX, easeP);
      curY = 0.22;
      curZ = THREE.MathUtils.lerp(6.20, deskZ, easeP);
      curRotY = THREE.MathUtils.lerp(Math.PI, deskRotY, easeP);
    } else {
      // Phase 6 (10.5 -> 11.5s): Arrived and standing proudly behind desk.
      g.visible = true;
      curX = deskX;
      curY = deskY;
      curZ = deskZ;
      curRotY = deskRotY;
      isWalking = false;
      isGesturing = false;
    }

    // Natural walking bounce
    const bounce = isWalking ? Math.abs(Math.sin((t - 1.0) * 6.5)) * 0.02 : 0;
    g.position.set(curX, curY + bounce, curZ);
    g.rotation.y = curRotY;

    // Kinematic limb references
    const lThigh = leftThighRef.current;
    const rThigh = rightThighRef.current;
    const lKnee = leftKneeRef.current;
    const rKnee = rightKneeRef.current;
    const lArm = leftArmRef.current;
    const lForearm = leftForearmRef.current;
    const rArm = rightArmRef.current;
    const rForearm = rightForearmRef.current;
    const ub = upperBodyRef.current;

    if (isWalking) {
      const walkCycle = (t - 1.0) * 6.5;
      const swing = Math.sin(walkCycle) * 0.28;

      // Legs with natural knee bending
      if (lThigh) lThigh.rotation.x = swing;
      if (rThigh) rThigh.rotation.x = -swing;
      if (lKnee) lKnee.rotation.x = Math.max(0, -swing * 0.85);
      if (rKnee) rKnee.rotation.x = Math.max(0, swing * 0.85);

      // Arms swing in anti-phase with natural elbow bend
      if (lArm) lArm.rotation.set(-swing * 0.65, 0, -0.05);
      if (lForearm) lForearm.rotation.set(0.12 + Math.abs(swing) * 0.2, 0, 0);
      if (rArm) rArm.rotation.set(swing * 0.65, 0, 0.05);
      if (rForearm) rForearm.rotation.set(0.12 + Math.abs(swing) * 0.2, 0, 0);

      // Subtle forward torso cadence
      if (ub) ub.rotation.set(0.03, Math.sin(walkCycle) * 0.025, 0);
    } else if (isGesturing) {
      if (lThigh) lThigh.rotation.x = 0;
      if (rThigh) rThigh.rotation.x = 0;
      if (lKnee) lKnee.rotation.x = 0;
      if (rKnee) rKnee.rotation.x = 0;

      const gt = t - 4.8; // gesture elapsed (0.0 -> 2.2s)
      switch (gesture) {
        case "fist_pump": {
          // Confident determination fist pump with articulated elbow
          if (ub) ub.rotation.set(0.02, 0, 0);
          if (lArm) lArm.rotation.set(0.15, 0, -0.12);
          if (lForearm) lForearm.rotation.set(0.25, 0, 0);
          const pump = Math.sin(gt * 7) * 0.12;
          if (rArm) rArm.rotation.set(0.85 + pump * 0.5, 0.1, 0.2);
          if (rForearm) rForearm.rotation.set(1.35 + pump, 0, 0);
          break;
        }
        case "hand_on_heart_bow": {
          // Respectful traditional bow with right hand flat over heart
          const p = Math.min(1, Math.max(0, gt / 2.2));
          const bow = Math.sin(p * Math.PI) * 0.21;
          if (ub) ub.rotation.set(bow, 0, 0);
          if (lArm) lArm.rotation.set(0.05, 0, -0.05);
          if (lForearm) lForearm.rotation.set(0.05, 0, 0);
          if (rArm) rArm.rotation.set(0.65, 0.25, -0.4);
          if (rForearm) rForearm.rotation.set(0.85, 0.35, -0.55);
          break;
        }
        case "wave_double": {
          // Both arms raised comfortably waving to both grandstand wings
          if (ub) ub.rotation.set(0, 0, 0);
          const wave = Math.sin(gt * 5.5) * 0.22;
          if (rArm) rArm.rotation.set(0.5, 0, 0.52);
          if (rForearm) rForearm.rotation.set(0.55, 0, 0.35 + wave);
          if (lArm) lArm.rotation.set(0.5, 0, -0.52);
          if (lForearm) lForearm.rotation.set(0.55, 0, -(0.35 + Math.sin(gt * 5.5 + 0.4) * 0.22));
          break;
        }
        case "heart_pose": {
          // Hands joined forming heart pose at chest center with gentle nod
          const nod = Math.sin(Math.min(1, gt / 2.2) * Math.PI) * 0.10;
          if (ub) ub.rotation.set(nod, 0, 0);
          if (rArm) rArm.rotation.set(0.65, 0.2, -0.35);
          if (rForearm) rForearm.rotation.set(0.85, 0.3, -0.5);
          if (lArm) lArm.rotation.set(0.65, -0.2, 0.35);
          if (lForearm) lForearm.rotation.set(0.85, -0.3, 0.5);
          break;
        }
        case "wave_single":
        default: {
          // Natural right-hand wave to audience with polite head nod
          const nod = Math.sin(gt * 2.5) * 0.04;
          if (ub) ub.rotation.set(nod, 0, 0);
          if (lArm) lArm.rotation.set(0.05, 0, -0.05);
          if (lForearm) lForearm.rotation.set(0.05, 0, 0);
          if (rArm) rArm.rotation.set(0.55, 0, 0.35);
          if (rForearm) {
            const wave = Math.sin(gt * 5.5) * 0.24;
            rForearm.rotation.set(0.65, 0, 0.3 + wave);
          }
          break;
        }
      }
    } else {
      // Standing poised behind desk
      if (lThigh) lThigh.rotation.x = 0;
      if (rThigh) rThigh.rotation.x = 0;
      if (lKnee) lKnee.rotation.x = 0;
      if (rKnee) rKnee.rotation.x = 0;
      if (lArm) lArm.rotation.set(0.06, 0, -0.06);
      if (lForearm) lForearm.rotation.set(0.05, 0, 0);
      if (rArm) rArm.rotation.set(0.06, 0, 0.06);
      if (rForearm) rForearm.rotation.set(0.05, 0, 0);
      if (ub) ub.rotation.set(0, 0, 0);
    }
  });

  return (
    <group ref={figureRef}>
      <group position={[0, 0, 0]}>
        {/* Upper Body (Head + Torso + Arms) */}
        <group ref={upperBodyRef}>
          {/* Angled Neck (radius 0.031m to 0.037m with natural forward incline) */}
          <mesh position={[0, 1.47, 0.012]} rotation={[0.08, 0, 0]}>
            <cylinderGeometry args={[0.031, 0.037, 0.088, 20]} />
            <primitive object={skinMat} attach="material" />
          </mesh>

          {/* ── ORGANIC CRANIOFACIAL ANATOMY ── */}
          {/* 1. Cranial Vault (Recessed so facial features emerge cleanly without clipping) */}
          <mesh position={[0, 1.58, -0.015]} scale={[0.95, 1.05, 1.02]}>
            <sphereGeometry args={[0.076, 28, 28]} />
            <primitive object={skinMat} attach="material" />
          </mesh>

          {/* 2. Smooth Subtle Zygomatic Cheeks */}
          <mesh position={[-0.036, 1.545, 0.030]} scale={[0.8, 0.9, 0.6]}>
            <sphereGeometry args={[0.020, 14, 14]} />
            <primitive object={skinMat} attach="material" />
          </mesh>
          <mesh position={[0.036, 1.545, 0.030]} scale={[0.8, 0.9, 0.6]}>
            <sphereGeometry args={[0.020, 14, 14]} />
            <primitive object={skinMat} attach="material" />
          </mesh>

          {/* 3. Tapered Jawline (Mandible) eliminating blocky box corners */}
          <mesh position={[0, 1.520, 0.032]} rotation={[0.22, 0, 0]}>
            <cylinderGeometry args={[0.052, 0.036, 0.072, 20]} />
            <primitive object={skinMat} attach="material" />
          </mesh>

          {/* 4. Soft Rounded Chin Ellipsoid */}
          <mesh position={[0, 1.488, 0.056]} scale={[1.15, 0.95, 1.08]}>
            <sphereGeometry args={[0.016, 16, 16]} />
            <primitive object={skinMat} attach="material" />
          </mesh>

          {/* 5. Sculpted Left & Right Ears */}
          <SculptedEar
            position={[-0.076, 1.56, 0.005]}
            rotation={[0, -0.15, 0.05]}
            skinMat={skinMat}
            isLeft={true}
          />
          <SculptedEar
            position={[0.076, 1.56, 0.005]}
            rotation={[0, 0.15, -0.05]}
            skinMat={skinMat}
            isLeft={false}
          />

          {/* 6. Expressive Anatomical Eyes with Almond Contour & 3° Canthal Tilt */}
          <ProceduralEye
            position={[-0.026, 1.565, 0.075]}
            scale={0.9}
            isLeft={true}
          />
          <ProceduralEye
            position={[0.026, 1.565, 0.075]}
            scale={0.9}
            isLeft={false}
          />

          {/* Eyebrows */}
          <mesh position={[-0.026, 1.588, 0.077]} rotation={[0, 0, 0.08]}>
            <boxGeometry args={[0.024, 0.004, 0.005]} />
            <meshStandardMaterial color={style.hairColor} roughness={0.8} />
          </mesh>
          <mesh position={[0.026, 1.588, 0.077]} rotation={[0, 0, -0.08]}>
            <boxGeometry args={[0.024, 0.004, 0.005]} />
            <meshStandardMaterial color={style.hairColor} roughness={0.8} />
          </mesh>

          {/* 7. Procedural 3D Nose (Slender bridge, tip sphere, paired alar lobule wings) */}
          <ProceduralNose
            position={[0, 1.545, 0.078]}
            skinMat={skinMat}
            scale={0.92}
          />

          {/* 8. Procedural 3D Mouth (Cupid's bow upper lip, contoured lower lip, commissures) */}
          <ProceduralMouth
            position={[0, 1.512, 0.073]}
            scale={0.92}
            lipColor={style.gender === "female" ? "#be185d" : "#9f1239"}
            smile={0.06}
            openSmile={true}
          />

          {/* Eyeglasses if applicable */}
          {style.hasGlasses && (
            <group position={[0, 1.565, 0.082]}>
              <mesh position={[-0.026, 0, 0]}>
                <torusGeometry args={[0.013, 0.0016, 14, 28]} />
                <meshStandardMaterial color={style.glassesColor || "#334155"} metalness={0.9} roughness={0.2} />
              </mesh>
              <mesh position={[0.026, 0, 0]}>
                <torusGeometry args={[0.013, 0.0016, 14, 28]} />
                <meshStandardMaterial color={style.glassesColor || "#334155"} metalness={0.9} roughness={0.2} />
              </mesh>
              <mesh position={[0, 0.002, 0]}>
                <boxGeometry args={[0.014, 0.002, 0.003]} />
                <meshStandardMaterial color={style.glassesColor || "#334155"} metalness={0.9} roughness={0.2} />
              </mesh>
              <mesh position={[-0.043, 0, -0.04]} rotation={[0, 0.15, 0]}>
                <cylinderGeometry args={[0.0015, 0.0015, 0.075, 6]} />
                <meshStandardMaterial color={style.glassesColor || "#334155"} metalness={0.9} roughness={0.2} />
              </mesh>
              <mesh position={[0.043, 0, -0.04]} rotation={[0, -0.15, 0]}>
                <cylinderGeometry args={[0.0015, 0.0015, 0.075, 6]} />
                <meshStandardMaterial color={style.glassesColor || "#334155"} metalness={0.9} roughness={0.2} />
              </mesh>
            </group>
          )}

          {/* ── MULTI-LAYERED VOLUMETRIC 3D HAIRSTYLES (PBR Sheen, Organic Curves) ── */}
          {/* Layer 1: Cranial Base Hairline Cap */}
          <mesh position={[0, 1.610, -0.012]} scale={[0.98, 1.02, 1.02]}>
            <sphereGeometry args={[0.081, 24, 24]} />
            <primitive object={hairMat} attach="material" />
          </mesh>

          {/* Ponytail */}
          {style.hairStyle === "ponytail" && (
            <group>
              {/* Layer 2: Volumetric crown sweep */}
              <mesh position={[0, 1.625, -0.02]}>
                <sphereGeometry args={[0.084, 20, 20]} />
                <primitive object={hairMat} attach="material" />
              </mesh>
              {/* Layer 3: Front soft curved bangs */}
              <mesh position={[0, 1.635, 0.055]} rotation={[0, 0, Math.PI / 2]}>
                <capsuleGeometry args={[0.013, 0.055, 6, 12]} />
                <primitive object={hairMat} attach="material" />
              </mesh>
              {/* Layer 3: Face-framing soft cheek tendrils */}
              <mesh position={[-0.066, 1.53, 0.025]}>
                <capsuleGeometry args={[0.011, 0.12, 6, 10]} />
                <primitive object={hairMat} attach="material" />
              </mesh>
              <mesh position={[0.066, 1.53, 0.025]}>
                <capsuleGeometry args={[0.011, 0.12, 6, 10]} />
                <primitive object={hairMat} attach="material" />
              </mesh>
              {/* Ponytail tie ring */}
              <mesh position={[0, 1.60, -0.085]}>
                <torusGeometry args={[0.018, 0.006, 8, 16]} />
                <meshStandardMaterial color="#1e293b" roughness={0.4} />
              </mesh>
              {/* Cascading ponytail stream */}
              <mesh position={[0, 1.49, -0.105]} rotation={[0.18, 0, 0]}>
                <cylinderGeometry args={[0.024, 0.014, 0.18, 14]} />
                <primitive object={hairMat} attach="material" />
              </mesh>
            </group>
          )}

          {/* Side Part */}
          {style.hairStyle === "side_part" && (
            <group>
              {/* Layer 2: Volumetric side sweep lock */}
              <mesh position={[-0.02, 1.655, 0.03]} rotation={[0.1, -0.1, -0.2]}>
                <capsuleGeometry args={[0.024, 0.08, 8, 14]} />
                <primitive object={hairMat} attach="material" />
              </mesh>
              {/* Secondary parting sweep */}
              <mesh position={[0.04, 1.635, 0.03]} rotation={[0.1, 0.1, 0.35]}>
                <capsuleGeometry args={[0.018, 0.05, 6, 10]} />
                <primitive object={hairMat} attach="material" />
              </mesh>
              {/* Layer 3: Tapered sideburns */}
              <mesh position={[-0.068, 1.57, 0.015]}>
                <capsuleGeometry args={[0.010, 0.05, 6, 8]} />
                <primitive object={hairMat} attach="material" />
              </mesh>
              <mesh position={[0.068, 1.57, 0.015]}>
                <capsuleGeometry args={[0.010, 0.05, 6, 8]} />
                <primitive object={hairMat} attach="material" />
              </mesh>
            </group>
          )}

          {/* Textured Crop */}
          {style.hairStyle === "textured_crop" && (
            <group>
              {/* Layer 2: Forward textured crown volume */}
              <mesh position={[0, 1.66, 0.025]} rotation={[0.2, 0, Math.PI / 2]}>
                <capsuleGeometry args={[0.026, 0.075, 8, 14]} />
                <primitive object={hairMat} attach="material" />
              </mesh>
              {/* Layer 3: Feathered micro-bangs */}
              <mesh position={[0, 1.635, 0.055]} rotation={[0.1, 0, Math.PI / 2]}>
                <capsuleGeometry args={[0.014, 0.065, 6, 10]} />
                <primitive object={hairMat} attach="material" />
              </mesh>
              {/* Neat temples */}
              <mesh position={[-0.066, 1.58, 0.02]}>
                <capsuleGeometry args={[0.011, 0.05, 6, 8]} />
                <primitive object={hairMat} attach="material" />
              </mesh>
              <mesh position={[0.066, 1.58, 0.02]}>
                <capsuleGeometry args={[0.011, 0.05, 6, 8]} />
                <primitive object={hairMat} attach="material" />
              </mesh>
            </group>
          )}

          {/* Stylish Bob */}
          {style.hairStyle === "stylish_bob" && (
            <group>
              {/* Layer 2: Sleek brow bangs */}
              <mesh position={[0, 1.635, 0.055]} rotation={[0, 0, Math.PI / 2]}>
                <capsuleGeometry args={[0.014, 0.072, 6, 12]} />
                <primitive object={hairMat} attach="material" />
              </mesh>
              {/* Layer 2: Curved parietal bob locks */}
              <mesh position={[-0.066, 1.52, 0.025]}>
                <capsuleGeometry args={[0.024, 0.13, 8, 12]} />
                <primitive object={hairMat} attach="material" />
              </mesh>
              <mesh position={[0.066, 1.52, 0.025]}>
                <capsuleGeometry args={[0.024, 0.13, 8, 12]} />
                <primitive object={hairMat} attach="material" />
              </mesh>
              {/* Layer 3: Rear curved bob neckline */}
              <mesh position={[0, 1.52, -0.045]}>
                <cylinderGeometry args={[0.078, 0.088, 0.14, 16]} />
                <primitive object={hairMat} attach="material" />
              </mesh>
            </group>
          )}

          {/* Layered Fringe */}
          {style.hairStyle === "layered_fringe" && (
            <group>
              {/* Layer 2: Airy see-through fringe */}
              <mesh position={[0, 1.635, 0.055]} rotation={[0, 0, Math.PI / 2]}>
                <capsuleGeometry args={[0.011, 0.068, 6, 10]} />
                <primitive object={hairMat} attach="material" />
              </mesh>
              {/* Layer 3: Soft cascading cheek strands */}
              <mesh position={[-0.065, 1.53, 0.025]}>
                <capsuleGeometry args={[0.018, 0.12, 6, 10]} />
                <primitive object={hairMat} attach="material" />
              </mesh>
              <mesh position={[0.065, 1.53, 0.025]}>
                <capsuleGeometry args={[0.018, 0.12, 6, 10]} />
                <primitive object={hairMat} attach="material" />
              </mesh>
            </group>
          )}

          {/* Neat Fade */}
          {style.hairStyle === "neat_fade" && (
            <group>
              {/* Layer 2: Contoured top volume */}
              <mesh position={[0, 1.65, 0.02]} rotation={[0.1, 0, Math.PI / 2]}>
                <capsuleGeometry args={[0.024, 0.075, 8, 12]} />
                <primitive object={hairMat} attach="material" />
              </mesh>
              {/* Layer 3: Tapered fade temples */}
              <mesh position={[-0.066, 1.58, 0.01]}>
                <capsuleGeometry args={[0.010, 0.04, 6, 8]} />
                <primitive object={hairMat} attach="material" />
              </mesh>
              <mesh position={[0.066, 1.58, 0.01]}>
                <capsuleGeometry args={[0.010, 0.04, 6, 8]} />
                <primitive object={hairMat} attach="material" />
              </mesh>
            </group>
          )}

          {/* Wavy Volume */}
          {style.hairStyle === "wavy_volume" && (
            <group>
              {/* Layer 2: Volumetric wavy crown */}
              <mesh position={[0, 1.66, 0.015]} rotation={[-0.05, 0, Math.PI / 2]}>
                <capsuleGeometry args={[0.028, 0.08, 8, 14]} />
                <primitive object={hairMat} attach="material" />
              </mesh>
              {/* Layer 3: S-curved wavy locks */}
              <mesh position={[-0.066, 1.52, 0.025]}>
                <capsuleGeometry args={[0.022, 0.13, 6, 12]} />
                <primitive object={hairMat} attach="material" />
              </mesh>
              <mesh position={[0.066, 1.52, 0.025]}>
                <capsuleGeometry args={[0.022, 0.13, 6, 12]} />
                <primitive object={hairMat} attach="material" />
              </mesh>
            </group>
          )}

          {/* Undercut */}
          {style.hairStyle === "undercut" && (
            <group>
              {/* Layer 2: Swept-back volumetric top lock */}
              <mesh position={[0, 1.665, 0.025]} rotation={[0.22, 0, Math.PI / 2]}>
                <capsuleGeometry args={[0.028, 0.08, 8, 14]} />
                <primitive object={hairMat} attach="material" />
              </mesh>
              {/* Layer 3: Clean side profile */}
              <mesh position={[-0.065, 1.58, 0.01]}>
                <capsuleGeometry args={[0.010, 0.04, 6, 8]} />
                <primitive object={hairMat} attach="material" />
              </mesh>
              <mesh position={[0.065, 1.58, 0.01]}>
                <capsuleGeometry args={[0.010, 0.04, 6, 8]} />
                <primitive object={hairMat} attach="material" />
              </mesh>
            </group>
          )}

          {/* ── UPPER BODY (Contoured Vietnamese Student Polo) ── */}
          {/* Waist & Mid-torso */}
          <mesh position={[0, 1.08, 0]}>
            <cylinderGeometry args={[0.122, 0.126, 0.18, 18]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.4} />
          </mesh>

          {/* Upper Chest / Ribcage */}
          <mesh position={[0, 1.27, 0]}>
            <cylinderGeometry args={[0.138, 0.122, 0.22, 18]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.4} />
          </mesh>
          {/* Clavicle / Shoulder Slope Form with Trapezius Contours */}
          <mesh position={[0, 1.39, 0]}>
            <boxGeometry args={[0.26, 0.06, 0.15]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.4} />
          </mesh>
          {/* Sloping Trapezius Muscle Contours */}
          <mesh position={[-0.076, 1.41, 0]} rotation={[0, 0, 0.38]}>
            <capsuleGeometry args={[0.026, 0.11, 8, 14]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.4} />
          </mesh>
          <mesh position={[0.076, 1.41, 0]} rotation={[0, 0, -0.38]}>
            <capsuleGeometry args={[0.026, 0.11, 8, 14]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.4} />
          </mesh>

          {/* Standing Collar Band (Chân Cổ) */}
          <mesh position={[0, 1.442, 0.015]} rotation={[0.15, 0, 0]}>
            <torusGeometry args={[0.046, 0.009, 8, 20]} />
            <meshStandardMaterial color="#ffffff" roughness={0.3} />
          </mesh>
          {/* 3D Folded Polo Collar Lapels & Placket */}
          <mesh position={[-0.052, 1.428, 0.076]} rotation={[0.30, -0.16, -0.24]}>
            <boxGeometry args={[0.062, 0.042, 0.008]} />
            <meshStandardMaterial color="#ffffff" roughness={0.3} />
          </mesh>
          <mesh position={[0.052, 1.428, 0.076]} rotation={[0.30, 0.16, 0.24]}>
            <boxGeometry args={[0.062, 0.042, 0.008]} />
            <meshStandardMaterial color="#ffffff" roughness={0.3} />
          </mesh>
          <mesh position={[0, 1.455, -0.038]} rotation={[-0.15, 0, 0]}>
            <boxGeometry args={[0.125, 0.030, 0.014]} />
            <meshStandardMaterial color="#ffffff" roughness={0.3} />
          </mesh>
          <mesh position={[0, 1.335, 0.082]}>
            <boxGeometry args={[0.026, 0.12, 0.007]} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.3} />
          </mesh>
          <mesh position={[0, 1.37, 0.088]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.0035, 0.0035, 0.004, 10]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.4} />
          </mesh>
          <mesh position={[0, 1.32, 0.088]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.0035, 0.0035, 0.004, 10]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.4} />
          </mesh>

          {/* Golden Laurel Branch Chest Badge */}
          <mesh position={[-0.075, 1.32, 0.085]}>
            <boxGeometry args={[0.028, 0.020, 0.005]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.7} roughness={0.2} />
          </mesh>
          <mesh position={[-0.075, 1.32, 0.088]}>
            <sphereGeometry args={[0.006, 10, 10]} />
            <meshBasicMaterial color="#fef08a" />
          </mesh>

          {/* Belt */}
          <mesh position={[0, 0.95, 0]}>
            <boxGeometry args={[0.25, 0.032, 0.16]} />
            <meshStandardMaterial color="#1e293b" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.95, 0.082]}>
            <boxGeometry args={[0.032, 0.024, 0.008]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.8} roughness={0.2} />
          </mesh>

          {/* ── ARMS & BALL JOINT NODES ── */}
          {/* Left Shoulder Spherical Ball Joint Node (r=0.036) */}
          <mesh position={[-0.18, 1.34, 0]}>
            <sphereGeometry args={[0.036, 16, 16]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.4} />
          </mesh>
          {/* Left Arm (Articulated shoulder + elbow) */}
          <group ref={leftArmRef} position={[-0.18, 1.34, 0]}>
            <mesh position={[0, -0.09, 0]}>
              <capsuleGeometry args={[0.036, 0.14, 8, 14]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.4} />
            </mesh>
            {/* Left Sleeve Ribbed Cuff */}
            <mesh position={[0, -0.16, 0]}>
              <cylinderGeometry args={[0.039, 0.039, 0.018, 16]} />
              <meshStandardMaterial color="#ffffff" roughness={0.3} />
            </mesh>
            {/* Left Elbow Spherical Ball Joint Node (r=0.027) */}
            <mesh position={[0, -0.20, 0]}>
              <sphereGeometry args={[0.027, 14, 14]} />
              <primitive object={skinMat} attach="material" />
            </mesh>
            <group ref={leftForearmRef} position={[0, -0.20, 0]}>
              <mesh position={[0, -0.09, 0]}>
                <capsuleGeometry args={[0.026, 0.16, 8, 12]} />
                <primitive object={skinMat} attach="material" />
              </mesh>
              <SculptedHand
                position={[0, -0.21, 0]}
                rotation={[0, 0, 0]}
                skinMat={skinMat}
                isLeft={true}
                mode="rest"
              />
            </group>
          </group>

          {/* Right Shoulder Spherical Ball Joint Node (r=0.036) */}
          <mesh position={[0.18, 1.34, 0]}>
            <sphereGeometry args={[0.036, 16, 16]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.4} />
          </mesh>
          {/* Right Arm (Articulated shoulder + elbow) */}
          <group ref={rightArmRef} position={[0.18, 1.34, 0]}>
            <mesh position={[0, -0.09, 0]}>
              <capsuleGeometry args={[0.036, 0.14, 8, 14]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.4} />
            </mesh>
            {/* Right Sleeve Ribbed Cuff */}
            <mesh position={[0, -0.16, 0]}>
              <cylinderGeometry args={[0.039, 0.039, 0.018, 16]} />
              <meshStandardMaterial color="#ffffff" roughness={0.3} />
            </mesh>
            {/* Right Elbow Spherical Ball Joint Node (r=0.027) */}
            <mesh position={[0, -0.20, 0]}>
              <sphereGeometry args={[0.027, 14, 14]} />
              <primitive object={skinMat} attach="material" />
            </mesh>
            <group ref={rightForearmRef} position={[0, -0.20, 0]}>
              <mesh position={[0, -0.09, 0]}>
                <capsuleGeometry args={[0.026, 0.16, 8, 12]} />
                <primitive object={skinMat} attach="material" />
              </mesh>
              <SculptedHand
                position={[0, -0.21, 0]}
                rotation={[0, 0, 0]}
                skinMat={skinMat}
                isLeft={false}
                mode="rest"
              />
            </group>
          </group>
        </group>

        {/* Pelvis */}
        <mesh position={[0, 0.86, 0]}>
          <boxGeometry args={[0.26, 0.12, 0.16]} />
          <meshStandardMaterial color="#0f172a" roughness={0.85} />
        </mesh>

        {/* Lower Body: Left Leg (Articulated Hip + Knee + Shoe) */}
        <group ref={leftThighRef} position={[-0.08, 0.78, 0]}>
          <mesh position={[0, -0.16, 0]}>
            <capsuleGeometry args={[0.046, 0.28, 8, 14]} />
            <meshStandardMaterial color="#0f172a" roughness={0.85} />
          </mesh>
          <group ref={leftKneeRef} position={[0, -0.36, 0]}>
            <mesh position={[0, -0.16, 0]}>
              <capsuleGeometry args={[0.038, 0.28, 8, 14]} />
              <meshStandardMaterial color="#0f172a" roughness={0.85} />
            </mesh>
            <mesh position={[0, -0.35, 0.025]}>
              <boxGeometry args={[0.07, 0.05, 0.15]} />
              <meshStandardMaterial color="#020617" roughness={0.3} metalness={0.2} />
            </mesh>
          </group>
        </group>

        {/* Lower Body: Right Leg (Articulated Hip + Knee + Shoe) */}
        <group ref={rightThighRef} position={[0.08, 0.78, 0]}>
          <mesh position={[0, -0.16, 0]}>
            <capsuleGeometry args={[0.046, 0.28, 8, 14]} />
            <meshStandardMaterial color="#0f172a" roughness={0.85} />
          </mesh>
          <group ref={rightKneeRef} position={[0, -0.36, 0]}>
            <mesh position={[0, -0.16, 0]}>
              <capsuleGeometry args={[0.038, 0.28, 8, 14]} />
              <meshStandardMaterial color="#0f172a" roughness={0.85} />
            </mesh>
            <mesh position={[0, -0.35, 0.025]}>
              <boxGeometry args={[0.07, 0.05, 0.15]} />
              <meshStandardMaterial color="#020617" roughness={0.3} metalness={0.2} />
            </mesh>
          </group>
        </group>
      </group>
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

    const radius = 6.6;
    const startPhi = activeCount > 4 ? 0.26 : 0.38; // 15° or 21.8°
    const endPhi = activeCount > 4 ? 1.31 : 1.13;   // 75° or 64.7°

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

  return (
    <group>
      {/* Center-Right MC Desk in front of Hexagon Arch (Facing Center at -30°) */}
      <CenterMcDesk screenFadeProgress={screenFadeProgress} liveFactor={liveFactor} />

      {/* 2 Animated MC Presenters (Khánh Vy & Ngọc Huy) */}
      <McPresenters state={state} serverNow={serverNow} />

      {/* Contestants ALWAYS stand permanently at their podiums from the beginning (User Requirement: no walking entrance) */}

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
        // Always show the 3D contestant humanoid standing proudly at their podium
        const showFigure = true;

        return (
          <ContestantPodium
            key={cfg.seatId}
            seatId={cfg.seatId}
            name={name}
            score={score}
            school={school}
            isEntrancePhase={isEntrancePhase}
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
