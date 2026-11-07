"use client";

import React, { useRef, useMemo, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { OlympiaState } from "@/lib/olympia/types";
import { isSeatBuzzedIn3D, computeTargetLightingMode } from "./useOlympiaLightingState";

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
  color: string = "#f4cba5",
  roughness: number = 0.58
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
        <meshStandardMaterial color="#f1f5f9" roughness={0.35} />
      </mesh>
      {/* 2. Vietnamese Deep Chocolate Iris */}
      <mesh position={[0, 0, 0.0062]} scale={[1.0, 0.95, 0.35]}>
        <sphereGeometry args={[0.0055, 16, 16]} />
        <meshStandardMaterial color="#2d1b12" roughness={0.4} />
      </mesh>
      {/* 3. Deep Obsidian Pupil */}
      <mesh position={[0, 0, 0.0078]} scale={[1.0, 1.0, 0.25]}>
        <sphereGeometry args={[0.0026, 12, 12]} />
        <meshBasicMaterial color="#0a0a0a" />
      </mesh>
      {/* 4. Natural Upper Eyelid Fold (covers top 20% of eyeball, eliminating wide staring doll look) */}
      <mesh position={[0, 0.0042, 0.0045]} scale={[1.24, 0.44, 0.65]} rotation={[0.15, 0, 0]}>
        <sphereGeometry args={[0.0098, 14, 14, 0, Math.PI]} />
        <meshStandardMaterial color="#e5b894" roughness={0.65} />
      </mesh>
      {/* 5. Specular Catchlight simulating studio key spotlight */}
      <mesh position={[0.0016, 0.002, 0.0085]}>
        <sphereGeometry args={[0.0012, 8, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* 6. Subtle Eyelid Crease (Soft warm shadow tone matching facial skin) */}
      <mesh position={[0, 0.0075, 0.004]} rotation={[0.08, 0, (isLeft ? -1 : 1) * 0.05]}>
        <torusGeometry args={[0.0102, 0.0010, 6, 14, Math.PI * 0.7]} />
        <meshStandardMaterial color="#784835" roughness={0.6} />
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
  mode?: "hang" | "rest" | "mic" | "card" | "tablet";
}) {
  const side = isLeft ? -1 : 1;

  // Curl and posture angles calibrated for natural, graceful Vietnamese hand gestures
  const fingerCurl =
    mode === "mic" ? 1.25 :
    mode === "card" ? 0.32 :
    mode === "tablet" ? 0.28 :
    mode === "rest" ? 0.16 : 0.08; // "hang" is relaxed, barely curved

  const thumbCurl =
    mode === "mic" ? 0.70 :
    mode === "card" ? 0.22 :
    mode === "tablet" ? 0.18 :
    mode === "rest" ? 0.12 : 0.06;

  // Slender anatomical lengths (Index, Middle, Ring, Little)
  const fingerLengths = [0.024, 0.028, 0.025, 0.019];
  const fingerRadii = [0.0030, 0.0032, 0.0030, 0.0025];
  const fingerXs = [-0.009, -0.003, 0.003, 0.009];

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* 1. Delicate Tapered Wrist Transition (Smooth sleeve-to-hand bridge, no giant ball!) */}
      <mesh position={[0, -0.002, -0.008]} scale={[1.15, 0.75, 1.0]}>
        <cylinderGeometry args={[0.010, 0.012, 0.014, 12]} />
        <primitive object={skinMat} attach="material" />
      </mesh>

      {/* 2. Slender, Graceful Palm Plate */}
      <mesh position={[0, 0, 0.010]}>
        <boxGeometry args={[0.026, 0.008, 0.028]} />
        <primitive object={skinMat} attach="material" />
      </mesh>

      {/* 3. Subtle Thenar Thumb Ridge (Gentle organic contour, not a bulky lump) */}
      <mesh position={[side * 0.011, -0.002, 0.006]} scale={[1.1, 0.7, 1.2]}>
        <sphereGeometry args={[0.006, 10, 10]} />
        <primitive object={skinMat} attach="material" />
      </mesh>

      {/* 4. Opposable Slender Thumb */}
      <group
        position={[side * 0.013, -0.002, 0.004]}
        rotation={[0.15, side * 0.42, side * -0.15]}
      >
        {/* Proximal segment */}
        <mesh position={[side * 0.005, 0, 0.007]} rotation={[thumbCurl, 0, 0]}>
          <capsuleGeometry args={[0.0030, 0.012, 6, 8]} />
          <primitive object={skinMat} attach="material" />
        </mesh>
        {/* Distal tip */}
        <mesh position={[side * 0.006, -0.003, 0.018]} rotation={[thumbCurl * 1.35, 0, 0]}>
          <capsuleGeometry args={[0.0026, 0.010, 6, 8]} />
          <primitive object={skinMat} attach="material" />
        </mesh>
      </group>

      {/* 5. 4 Articulated Slender Fingers */}
      {fingerXs.map((fX, fIdx) => {
        const len = fingerLengths[fIdx];
        const r = fingerRadii[fIdx];
        const splay = (fIdx - 1.5) * 0.025; // Gentle natural splay

        return (
          <group key={fIdx} position={[fX, 0, 0.024]} rotation={[0, splay, 0]}>
            {/* Proximal phalanx */}
            <mesh position={[0, -0.001, len * 0.28]} rotation={[fingerCurl, 0, 0]}>
              <capsuleGeometry args={[r, len * 0.50, 6, 8]} />
              <primitive object={skinMat} attach="material" />
            </mesh>
            {/* Distal phalanx with soft rounded fingertip */}
            <mesh position={[0, -0.004, len * 0.70]} rotation={[fingerCurl * 1.35, 0, 0]}>
              <capsuleGeometry args={[r * 0.88, len * 0.42, 6, 8]} />
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
  quality,
  position = [0, 0, -0.42],
  isWalking = false,
}: {
  seatId: number;
  quality?: "HIGH" | "MEDIUM" | "LIGHT";
  position?: [number, number, number];
  isWalking?: boolean;
}) {
  const style = CONTESTANT_STYLES[seatId % CONTESTANT_STYLES.length];
  const chestRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const skinMat = useMemo(() => createWarmPeachSkinMaterial(style.skinTone), [style.skinTone]);
  const hairMat = useMemo(() => createHairMaterial(style.hairColor), [style.hairColor]);

  // Micro-breathing & natural student idle posture / walking animation via useFrame
  useFrame(({ clock }) => {
    if (quality === "LIGHT") return;
    const t = clock.getElapsedTime();
    if (isWalking) {
      const stride = Math.sin(t * 8.0) * 0.35;
      const armStride = Math.sin(t * 8.0) * 0.25;
      if (leftLegRef.current) leftLegRef.current.rotation.x = stride;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -stride;
      if (leftArmRef.current) leftArmRef.current.rotation.x = -armStride;
      if (rightArmRef.current) rightArmRef.current.rotation.x = armStride;
    } else {
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0;
      if (leftArmRef.current) leftArmRef.current.rotation.x = 0;
      if (rightArmRef.current) rightArmRef.current.rotation.x = 0;
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
    }
  });

  const shirtColor = "#ffffff";
  const collarColor = "#1e3a8a"; // Iconic Olympia Navy Blue collar
  const placketColor = "#1e3a8a";
  const trouserColor = "#0f172a";

  return (
    <group position={position}>
      {/* ── LOWER BODY & TROUSERS (Slender, graceful Vietnamese student physique) ── */}
      <group ref={leftLegRef} position={[-0.055, 0.88, 0]}>
        <mesh position={[0, -0.39, 0]}>
          <capsuleGeometry args={[0.028, 0.74, 8, 16]} />
          <meshStandardMaterial color={trouserColor} roughness={0.8} />
        </mesh>
      </group>
      <group ref={rightLegRef} position={[0.055, 0.88, 0]}>
        <mesh position={[0, -0.39, 0]}>
          <capsuleGeometry args={[0.028, 0.74, 8, 16]} />
          <meshStandardMaterial color={trouserColor} roughness={0.8} />
        </mesh>
      </group>
      <mesh position={[0, 0.88, 0]}>
        <boxGeometry args={[0.20, 0.12, 0.13]} />
        <meshStandardMaterial color={trouserColor} roughness={0.8} />
      </mesh>

      {/* Belt & Gold Buckle */}
      <mesh position={[0, 0.95, 0]}>
        <boxGeometry args={[0.21, 0.030, 0.14]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.95, 0.072]}>
        <boxGeometry args={[0.028, 0.022, 0.008]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* ── UPPER BODY (Contoured Vietnamese Student Polo, Slim Shoulders) ── */}
      <group ref={chestRef}>
        {/* Waist & Mid-torso (Slender Vietnamese student taper) */}
        <mesh position={[0, 1.12, 0]} scale={[1.16, 1.0, 0.74]}>
          <cylinderGeometry args={[0.096, 0.090, 0.24, 18]} />
          <meshStandardMaterial color={shirtColor} roughness={0.45} />
        </mesh>

        {/* Upper Chest / Ribcage */}
        <mesh position={[0, 1.28, 0]} scale={[1.18, 1.0, 0.75]}>
          <cylinderGeometry args={[0.106, 0.096, 0.22, 18]} />
          <meshStandardMaterial color={shirtColor} roughness={0.45} />
        </mesh>
        {/* Clavicle / Shoulder Slope Form (Slimmed down to 0.22m width) */}
        <mesh position={[0, 1.39, 0]}>
          <boxGeometry args={[0.22, 0.048, 0.13]} />
          <meshStandardMaterial color={shirtColor} roughness={0.45} />
        </mesh>
        {/* Sloping Trapezius Muscle Contours */}
        <mesh position={[-0.065, 1.40, 0]} rotation={[0, 0, 0.30]}>
          <capsuleGeometry args={[0.018, 0.10, 8, 14]} />
          <meshStandardMaterial color={shirtColor} roughness={0.45} />
        </mesh>
        <mesh position={[0.065, 1.40, 0]} rotation={[0, 0, -0.30]}>
          <capsuleGeometry args={[0.018, 0.10, 8, 14]} />
          <meshStandardMaterial color={shirtColor} roughness={0.45} />
        </mesh>

        {/* ── AUTHENTIC VIETNAMESE POLO COLLAR, STANDING BAND & PLACKET ── */}
        {/* Standing Collar Band (Chân Cổ) wrapping neck base */}
        <mesh position={[0, 1.440, 0.015]} rotation={[0.15, 0, 0]}>
          <torusGeometry args={[0.038, 0.008, 8, 20]} />
          <meshStandardMaterial color={collarColor} roughness={0.35} />
        </mesh>
        {/* Left Lapel (Beveled 3D Fold) */}
        <mesh position={[-0.044, 1.428, 0.068]} rotation={[0.28, -0.14, -0.20]}>
          <boxGeometry args={[0.050, 0.036, 0.006]} />
          <meshStandardMaterial color={collarColor} roughness={0.35} />
        </mesh>
        {/* Right Lapel (Beveled 3D Fold) */}
        <mesh position={[0.044, 1.428, 0.068]} rotation={[0.28, 0.14, 0.20]}>
          <boxGeometry args={[0.050, 0.036, 0.006]} />
          <meshStandardMaterial color={collarColor} roughness={0.35} />
        </mesh>
        {/* Collar Back Band */}
        <mesh position={[0, 1.455, -0.032]} rotation={[-0.15, 0, 0]}>
          <boxGeometry args={[0.105, 0.024, 0.012]} />
          <meshStandardMaterial color={collarColor} roughness={0.35} />
        </mesh>
        {/* Top-Stitched Front Central Placket */}
        <mesh position={[0, 1.335, 0.072]}>
          <boxGeometry args={[0.022, 0.11, 0.006]} />
          <meshStandardMaterial color={placketColor} roughness={0.35} />
        </mesh>
        {/* Pearl Buttons with Subtle Luster */}
        <mesh position={[0, 1.37, 0.076]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.0028, 0.0028, 0.004, 10]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.4} />
        </mesh>
        <mesh position={[0, 1.32, 0.076]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.0028, 0.0028, 0.004, 10]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.4} />
        </mesh>

        {/* Golden Laurel Branch Chest Badge (Left Breast) */}
        <mesh position={[-0.060, 1.32, 0.074]}>
          <boxGeometry args={[0.022, 0.016, 0.004]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.7} roughness={0.2} />
        </mesh>
        <mesh position={[-0.060, 1.32, 0.077]}>
          <sphereGeometry args={[0.005, 10, 10]} />
          <meshBasicMaterial color="#fef08a" />
        </mesh>

        {/* ── ARMS & HANDS (Natural dignified upright posture: hands relaxed alongside body) ── */}
        {/* Left Arm Group (pivoted at shoulder Y = 1.35m) */}
        <group ref={leftArmRef} position={[-0.125, 1.35, 0.01]}>
          {/* Left Sleeve */}
          <mesh position={[0, -0.02, 0]} rotation={[0.04, 0, -0.06]}>
            <capsuleGeometry args={[0.028, 0.09, 8, 14]} />
            <meshStandardMaterial color={shirtColor} roughness={0.45} />
          </mesh>
          {/* Left Sleeve Ribbed Cuff */}
          <mesh position={[-0.005, -0.10, 0]} rotation={[0.04, 0, -0.06]}>
            <cylinderGeometry args={[0.030, 0.030, 0.016, 16]} />
            <meshStandardMaterial color={collarColor} roughness={0.35} />
          </mesh>
          {/* Left Forearm */}
          <mesh position={[-0.009, -0.24, 0]} rotation={[0.06, 0, -0.04]}>
            <capsuleGeometry args={[0.018, 0.17, 8, 12]} />
            <primitive object={skinMat} attach="material" />
          </mesh>
          {/* Left Hand: Slender Vietnamese hand hanging naturally beside body */}
          <VietnameseHand
            position={[-0.013, -0.41, 0]}
            rotation={[0, 0, -0.04]}
            skinMat={skinMat}
            isLeft={true}
            mode="hang"
          />
        </group>

        {/* Right Arm Group (pivoted at shoulder Y = 1.35m) */}
        <group ref={rightArmRef} position={[0.125, 1.35, 0.01]}>
          {/* Right Sleeve */}
          <mesh position={[0, -0.02, 0]} rotation={[0.04, 0, 0.06]}>
            <capsuleGeometry args={[0.028, 0.09, 8, 14]} />
            <meshStandardMaterial color={shirtColor} roughness={0.45} />
          </mesh>
          {/* Right Sleeve Ribbed Cuff */}
          <mesh position={[0.005, -0.10, 0]} rotation={[0.04, 0, 0.06]}>
            <cylinderGeometry args={[0.030, 0.030, 0.016, 16]} />
            <meshStandardMaterial color={collarColor} roughness={0.35} />
          </mesh>
          {/* Right Forearm */}
          <mesh position={[0.009, -0.24, 0]} rotation={[0.06, 0, 0.04]}>
            <capsuleGeometry args={[0.018, 0.17, 8, 12]} />
            <primitive object={skinMat} attach="material" />
          </mesh>
          {/* Right Hand: Slender Vietnamese hand hanging naturally beside body */}
          <VietnameseHand
            position={[0.013, -0.41, 0]}
            rotation={[0, 0, 0.04]}
            skinMat={skinMat}
            isLeft={false}
            mode="hang"
          />
        </group>
      </group>

      {/* ── HEAD & SLENDER ANGLED NECK ── */}
      <group ref={headRef}>
        {/* Slender Graceful Neck with natural gentle forward incline */}
        <mesh position={[0, 1.47, 0.012]} rotation={[0.06, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.030, 0.082, 20]} />
          <primitive object={skinMat} attach="material" />
        </mesh>

        {/* ── HARMONIOUS CRANIOFACIAL ANATOMY (Smooth contour, NO lumpy protrusions!) ── */}
        {/* 1. Cranial Vault (Smooth oval craniofacial foundation) */}
        <mesh position={[0, 1.58, -0.005]} scale={[0.96, 1.05, 1.00]}>
          <sphereGeometry args={[0.076, 28, 28]} />
          <primitive object={skinMat} attach="material" />
        </mesh>

        {/* 2. Smooth Tapered Jawline connecting seamlessly without cheek lumps */}
        <mesh position={[0, 1.520, 0.018]} rotation={[0.14, 0, 0]}>
          <cylinderGeometry args={[0.048, 0.032, 0.068, 20]} />
          <primitive object={skinMat} attach="material" />
        </mesh>

        {/* 3. Soft Rounded Chin */}
        <mesh position={[0, 1.486, 0.046]} scale={[1.10, 0.95, 1.05]}>
          <sphereGeometry args={[0.014, 16, 16]} />
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

        {/* Ponytail: Nữ sinh thanh lịch (Tóc buộc tự nhiên, suôn mượt) */}
        {style.hairStyle === "ponytail" && (
          <group>
            {/* Layer 2: Volumetric crown sweep */}
            <mesh position={[0, 1.625, -0.018]}>
              <sphereGeometry args={[0.084, 20, 20]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
            {/* Layer 3: Soft delicate front bangs */}
            <mesh position={[0, 1.632, 0.052]} rotation={[0, 0, Math.PI / 2]}>
              <capsuleGeometry args={[0.011, 0.050, 6, 12]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
            {/* Ponytail hair tie */}
            <mesh position={[0, 1.595, -0.082]}>
              <torusGeometry args={[0.015, 0.005, 8, 16]} />
              <meshStandardMaterial color="#1e293b" roughness={0.4} />
            </mesh>
            {/* Cascading flowing ponytail strand (upper graceful taper) */}
            <mesh position={[0, 1.530, -0.096]} rotation={[0.14, 0, 0]}>
              <capsuleGeometry args={[0.015, 0.11, 8, 14]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
            {/* Cascading flowing ponytail strand (lower delicate tail) */}
            <mesh position={[0, 1.435, -0.108]} rotation={[0.08, 0, 0]}>
              <capsuleGeometry args={[0.011, 0.10, 8, 14]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
          </group>
        )}

        {/* Side Part: Nam sinh gọn gàng năng động */}
        {style.hairStyle === "side_part" && (
          <group>
            {/* Layer 2: Natural organic side volume sweep */}
            <mesh position={[-0.018, 1.648, 0.024]} rotation={[0.1, -0.08, -0.16]}>
              <capsuleGeometry args={[0.022, 0.075, 8, 14]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
            {/* Secondary parting sweep */}
            <mesh position={[0.035, 1.630, 0.025]} rotation={[0.1, 0.08, 0.28]}>
              <capsuleGeometry args={[0.016, 0.048, 6, 10]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
            {/* Layer 3: Natural sideburns */}
            <mesh position={[-0.066, 1.57, 0.012]}>
              <capsuleGeometry args={[0.008, 0.045, 6, 8]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
            <mesh position={[0.066, 1.57, 0.012]}>
              <capsuleGeometry args={[0.008, 0.045, 6, 8]} />
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

  const kvSkinMat = useMemo(() => createWarmPeachSkinMaterial("#f5cca8"), []);
  const nhSkinMat = useMemo(() => createWarmPeachSkinMaterial("#f2c396"), []);
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
        {/* ── CRANIOFACIAL ANATOMY (Feminine Vietnamese Proportions: Smooth, graceful, no lumpy cheeks) ── */}
        {/* 1. Cranial Vault */}
        <mesh position={[0, 1.58, -0.005]} scale={[0.94, 1.05, 1.00]}>
          <sphereGeometry args={[0.076, 28, 28]} />
          <primitive object={kvSkinMat} attach="material" />
        </mesh>

        {/* 2. Slender Tapered Feminine Jawline */}
        <mesh position={[0, 1.52, 0.016]} rotation={[0.14, 0, 0]}>
          <cylinderGeometry args={[0.046, 0.030, 0.068, 20]} />
          <primitive object={kvSkinMat} attach="material" />
        </mesh>

        {/* 3. Soft Rounded Chin */}
        <mesh position={[0, 1.485, 0.044]} scale={[1.1, 0.95, 1.05]}>
          <sphereGeometry args={[0.014, 16, 16]} />
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

        {/* ── TAILORED FEMALE BROADCAST SUIT BLAZER SILHOUETTE (Royal Wine / Deep Burgundy) ── */}
        {/* Mandarin Collar / Standing Neckband (Chân Cổ) */}
        <mesh position={[0, 1.442, 0.015]} rotation={[0.12, 0, 0]}>
          <torusGeometry args={[0.038, 0.007, 8, 20]} />
          <meshStandardMaterial color="#ffffff" roughness={0.35} />
        </mesh>

        {/* Structured Female Shoulder Yoke with Natural Sloping Contours (NO BALL JOINTS) */}
        <mesh position={[0, 1.405, 0]}>
          <boxGeometry args={[0.31, 0.045, 0.14]} />
          <meshStandardMaterial color="#831843" roughness={0.4} />
        </mesh>
        <mesh position={[-0.10, 1.39, 0]} rotation={[0, 0, 0.28]}>
          <capsuleGeometry args={[0.021, 0.09, 8, 14]} />
          <meshStandardMaterial color="#831843" roughness={0.4} />
        </mesh>
        <mesh position={[0.10, 1.39, 0]} rotation={[0, 0, -0.28]}>
          <capsuleGeometry args={[0.021, 0.09, 8, 14]} />
          <meshStandardMaterial color="#831843" roughness={0.4} />
        </mesh>

        {/* Peaked Blazer Lapels (Ve Xếch Nhọn Sang Trọng) */}
        <mesh position={[-0.048, 1.385, 0.076]} rotation={[0.24, -0.14, 0.20]}>
          <boxGeometry args={[0.042, 0.080, 0.008]} />
          <meshStandardMaterial color="#701a75" roughness={0.35} />
        </mesh>
        <mesh position={[0.048, 1.385, 0.076]} rotation={[0.24, 0.14, -0.20]}>
          <boxGeometry args={[0.042, 0.080, 0.008]} />
          <meshStandardMaterial color="#701a75" roughness={0.35} />
        </mesh>

        {/* Contoured Female Waist & Bust (Hourglass Broadcast Silhouette) */}
        <mesh position={[0, 1.31, 0]} scale={[1.22, 1.0, 0.72]}>
          <cylinderGeometry args={[0.125, 0.108, 0.18, 18]} />
          <meshStandardMaterial color="#831843" roughness={0.4} />
        </mesh>
        <mesh position={[0, 1.18, 0]} scale={[1.22, 1.0, 0.72]}>
          <cylinderGeometry args={[0.108, 0.125, 0.18, 18]} />
          <meshStandardMaterial color="#831843" roughness={0.4} />
        </mesh>

        {/* Inner Crisp Silk Blouse V-Neck Accent */}
        <mesh position={[0, 1.41, 0.078]}>
          <boxGeometry args={[0.024, 0.035, 0.012]} />
          <meshStandardMaterial color="#ffffff" roughness={0.35} />
        </mesh>
        <mesh position={[0, 1.30, 0.082]}>
          <boxGeometry args={[0.022, 0.18, 0.006]} />
          <meshStandardMaterial color="#ffffff" roughness={0.35} />
        </mesh>

        {/* Single Tailored Blazer Button Closure */}
        <mesh position={[0, 1.24, 0.086]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.0035, 0.0035, 0.004, 10]} />
          <meshStandardMaterial color="#fcd34d" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* ── SEAMLESS SLENDER ARMS & HANDS (Retracted within desk bounds, NO ball joints!) ── */}
        {/* Left Arm holding Cue Card */}
        <group ref={kvLeftArmRef}>
          <mesh position={[-0.14, 1.31, 0.01]} rotation={[0.22, 0, -0.08]}>
            <capsuleGeometry args={[0.020, 0.12, 8, 12]} />
            <meshStandardMaterial color="#831843" roughness={0.4} />
          </mesh>
          <mesh position={[-0.13, 1.21, 0.03]} rotation={[0.35, 0.12, -0.06]}>
            <capsuleGeometry args={[0.017, 0.11, 8, 12]} />
            <meshStandardMaterial color="#831843" roughness={0.4} />
          </mesh>
          {/* White Silk Blouse Cuff */}
          <mesh position={[-0.12, 1.16, 0.04]}>
            <cylinderGeometry args={[0.018, 0.018, 0.012, 12]} />
            <meshStandardMaterial color="#ffffff" roughness={0.3} />
          </mesh>
          {/* Slender Sculpted Hand holding Cue Card safely within body frame */}
          <SculptedHand
            position={[-0.12, 1.15, 0.05]}
            rotation={[0.25, -0.15, 0.1]}
            scale={[0.56, 0.56, 0.56]}
            skinMat={kvSkinMat}
            isLeft={true}
            mode="card"
          />
          {/* Cue Card */}
          <mesh position={[-0.12, 1.17, 0.06]} rotation={[0.25, -0.15, 0.10]}>
            <boxGeometry args={[0.10, 0.003, 0.065]} />
            <meshStandardMaterial color="#ffffff" roughness={0.2} />
          </mesh>
          <mesh position={[-0.12, 1.17, 0.062]} rotation={[0.25, -0.15, 0.10]}>
            <boxGeometry args={[0.085, 0.004, 0.012]} />
            <meshBasicMaterial color="#f59e0b" />
          </mesh>
        </group>

        {/* Right Arm holding Microphone */}
        <group ref={kvRightArmRef}>
          <mesh position={[0.14, 1.31, 0.01]} rotation={[0.22, 0, 0.08]}>
            <capsuleGeometry args={[0.020, 0.12, 8, 12]} />
            <meshStandardMaterial color="#831843" roughness={0.4} />
          </mesh>
          <mesh position={[0.13, 1.22, 0.03]} rotation={[0.42, -0.12, 0.06]}>
            <capsuleGeometry args={[0.017, 0.11, 8, 12]} />
            <meshStandardMaterial color="#831843" roughness={0.4} />
          </mesh>
          {/* White Silk Blouse Cuff */}
          <mesh position={[0.12, 1.17, 0.04]}>
            <cylinderGeometry args={[0.018, 0.018, 0.012, 12]} />
            <meshStandardMaterial color="#ffffff" roughness={0.3} />
          </mesh>
          {/* Slender Sculpted Hand holding Microphone */}
          <SculptedHand
            position={[0.12, 1.20, 0.05]}
            rotation={[-0.2, 0.15, -0.08]}
            scale={[0.56, 0.56, 0.56]}
            skinMat={kvSkinMat}
            isLeft={false}
            mode="mic"
          />
          <group position={[0.12, 1.24, 0.06]} rotation={[-0.25, 0, 0]}>
            <mesh>
              <cylinderGeometry args={[0.006, 0.0045, 0.09, 12]} />
              <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0.055, 0]}>
              <sphereGeometry args={[0.010, 16, 16]} />
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
        {/* ── CRANIOFACIAL ANATOMY (Masculine Vietnamese Proportions: Smooth, handsome, no lumpy cheeks) ── */}
        {/* 1. Cranial Vault */}
        <mesh position={[0, 1.62, -0.005]} scale={[0.96, 1.05, 1.02]}>
          <sphereGeometry args={[0.080, 28, 28]} />
          <primitive object={nhSkinMat} attach="material" />
        </mesh>

        {/* 2. Defined Masculine Jawline connecting smoothly */}
        <mesh position={[0, 1.555, 0.018]} rotation={[0.16, 0, 0]}>
          <cylinderGeometry args={[0.054, 0.038, 0.074, 20]} />
          <primitive object={nhSkinMat} attach="material" />
        </mesh>

        {/* 3. Defined Rounded Chin */}
        <mesh position={[0, 1.515, 0.050]} scale={[1.15, 0.95, 1.08]}>
          <sphereGeometry args={[0.017, 16, 16]} />
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

        {/* ── TAILORED VTV3 TWO-BUTTON BROADCAST SUIT JACKET (#1e293b Charcoal Slate) ── */}
        {/* Structured Suit Shoulders / Yoke (NO BALL JOINTS) */}
        <mesh position={[0, 1.435, 0]}>
          <boxGeometry args={[0.36, 0.055, 0.16]} />
          <meshStandardMaterial color="#1e293b" roughness={0.45} />
        </mesh>
        {/* Natural Sloping Trapezius Contours connecting to sleeves */}
        <mesh position={[-0.12, 1.41, 0]} rotation={[0, 0, 0.26]}>
          <capsuleGeometry args={[0.024, 0.10, 8, 14]} />
          <meshStandardMaterial color="#1e293b" roughness={0.45} />
        </mesh>
        <mesh position={[0.12, 1.41, 0]} rotation={[0, 0, -0.26]}>
          <capsuleGeometry args={[0.024, 0.10, 8, 14]} />
          <meshStandardMaterial color="#1e293b" roughness={0.45} />
        </mesh>

        {/* Notched Suit Lapels (Ve Chữ K Cổ Điển Sang Trọng) */}
        {/* Left Upper Collar & Lower Notch */}
        <mesh position={[-0.058, 1.455, 0.082]} rotation={[0.26, -0.12, 0.16]}>
          <boxGeometry args={[0.046, 0.040, 0.010]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} />
        </mesh>
        <mesh position={[-0.062, 1.375, 0.086]} rotation={[0.22, -0.10, 0.14]}>
          <boxGeometry args={[0.050, 0.070, 0.010]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} />
        </mesh>
        {/* Right Upper Collar & Lower Notch */}
        <mesh position={[0.058, 1.455, 0.082]} rotation={[0.26, 0.12, -0.16]}>
          <boxGeometry args={[0.046, 0.040, 0.010]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} />
        </mesh>
        <mesh position={[0.062, 1.375, 0.086]} rotation={[0.22, 0.10, -0.14]}>
          <boxGeometry args={[0.050, 0.070, 0.010]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} />
        </mesh>

        {/* Main Suit Torso Body */}
        <mesh position={[0, 1.32, 0]} scale={[1.25, 1.0, 0.74]}>
          <cylinderGeometry args={[0.150, 0.140, 0.25, 18]} />
          <meshStandardMaterial color="#1e293b" roughness={0.45} />
        </mesh>
        <mesh position={[0, 1.15, 0]} scale={[1.25, 1.0, 0.74]}>
          <cylinderGeometry args={[0.140, 0.150, 0.22, 18]} />
          <meshStandardMaterial color="#1e293b" roughness={0.45} />
        </mesh>

        {/* Left Chest Welt Pocket with Folded White Silk Pocket Square */}
        <mesh position={[-0.078, 1.375, 0.088]}>
          <boxGeometry args={[0.038, 0.007, 0.005]} />
          <meshStandardMaterial color="#0f172a" roughness={0.5} />
        </mesh>
        <mesh position={[-0.078, 1.388, 0.090]} rotation={[0.1, 0, 0.15]}>
          <coneGeometry args={[0.010, 0.016, 3]} />
          <meshStandardMaterial color="#ffffff" roughness={0.2} />
        </mesh>

        {/* Two-Button Front Suit Closure */}
        <mesh position={[0, 1.28, 0.090]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.004, 0.004, 0.004, 12]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 1.21, 0.090]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.004, 0.004, 0.004, 12]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* Waist Flap Pockets */}
        <mesh position={[-0.088, 1.16, 0.085]}>
          <boxGeometry args={[0.048, 0.012, 0.010]} />
          <meshStandardMaterial color="#1e293b" roughness={0.45} />
        </mesh>
        <mesh position={[0.088, 1.16, 0.085]}>
          <boxGeometry args={[0.048, 0.012, 0.010]} />
          <meshStandardMaterial color="#1e293b" roughness={0.45} />
        </mesh>

        {/* ── SEAMLESS SLENDER ARMS & HANDS (Retracted within desk bounds, NO ball joints!) ── */}
        {/* Left Arm (holding Microphone) with Silver Wristwatch */}
        <group ref={nhLeftArmRef}>
          <mesh position={[-0.16, 1.33, 0.01]} rotation={[0.22, 0, -0.08]}>
            <capsuleGeometry args={[0.022, 0.12, 8, 12]} />
            <meshStandardMaterial color="#1e293b" roughness={0.45} />
          </mesh>
          <mesh position={[-0.145, 1.23, 0.03]} rotation={[0.45, 0.12, -0.06]}>
            <capsuleGeometry args={[0.018, 0.11, 8, 12]} />
            <meshStandardMaterial color="#1e293b" roughness={0.45} />
          </mesh>
          {/* White Shirt Cuff & Watch */}
          <mesh position={[-0.13, 1.25, 0.04]}>
            <cylinderGeometry args={[0.019, 0.019, 0.012, 12]} />
            <meshStandardMaterial color="#ffffff" roughness={0.3} />
          </mesh>
          <mesh position={[-0.13, 1.26, 0.04]} rotation={[0.5, 0.15, 0]}>
            <cylinderGeometry args={[0.011, 0.011, 0.004, 16]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.1} />
          </mesh>
          {/* Slender Sculpted Hand holding Microphone */}
          <SculptedHand
            position={[-0.12, 1.27, 0.05]}
            rotation={[-0.25, 0.1, 0]}
            scale={[0.58, 0.58, 0.58]}
            skinMat={nhSkinMat}
            isLeft={true}
            mode="mic"
          />
          <group position={[-0.12, 1.31, 0.06]} rotation={[-0.30, 0, 0]}>
            <mesh>
              <cylinderGeometry args={[0.007, 0.005, 0.09, 12]} />
              <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0.055, 0]}>
              <sphereGeometry args={[0.011, 16, 16]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.3} />
            </mesh>
          </group>
        </group>

        {/* Right Arm holding Host Tablet */}
        <group ref={nhRightArmRef}>
          <mesh position={[0.16, 1.33, 0.01]} rotation={[0.18, 0, 0.08]}>
            <capsuleGeometry args={[0.022, 0.12, 8, 12]} />
            <meshStandardMaterial color="#1e293b" roughness={0.45} />
          </mesh>
          <mesh position={[0.15, 1.22, 0.03]} rotation={[0.30, -0.10, 0.06]}>
            <capsuleGeometry args={[0.018, 0.11, 8, 12]} />
            <meshStandardMaterial color="#1e293b" roughness={0.45} />
          </mesh>
          {/* White Shirt Cuff */}
          <mesh position={[0.14, 1.17, 0.04]}>
            <cylinderGeometry args={[0.019, 0.019, 0.012, 12]} />
            <meshStandardMaterial color="#ffffff" roughness={0.3} />
          </mesh>
          {/* Slender Sculpted Hand holding Tablet safely within desk boundary */}
          <SculptedHand
            position={[0.14, 1.15, 0.04]}
            rotation={[0.25, -0.15, 0]}
            scale={[0.58, 0.58, 0.58]}
            skinMat={nhSkinMat}
            isLeft={false}
            mode="tablet"
          />
          {/* Host Tablet */}
          <mesh position={[0.15, 1.16, 0.05]} rotation={[0.30, -0.15, 0]}>
            <boxGeometry args={[0.12, 0.005, 0.16]} />
            <meshStandardMaterial color="#0284c7" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0.15, 1.163, 0.05]} rotation={[0.30, -0.15, 0]}>
            <boxGeometry args={[0.105, 0.006, 0.145]} />
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

    // Natural walking bounce (3.5cm)
    const bounce = isWalking ? Math.abs(Math.sin((t - 1.0) * 6.5)) * 0.035 : 0;
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
      const swing = Math.sin(walkCycle) * 0.52; // Natural human stride ~30 deg

      // Legs with natural knee bending (hip swing ~30°, biological knee flexion up to 42° / 0.73 rad)
      if (lThigh) lThigh.rotation.x = swing;
      if (rThigh) rThigh.rotation.x = -swing;
      if (lKnee) lKnee.rotation.x = Math.max(0, -swing * 1.40); // Anatomical backward knee bend up to 42° (0.73 rad)
      if (rKnee) rKnee.rotation.x = Math.max(0, swing * 1.40);

      // Arms swing in anti-phase with natural elbow bend
      if (lArm) lArm.rotation.set(-swing * 0.45, 0, -0.06);
      if (lForearm) lForearm.rotation.set(0.22 + Math.abs(swing) * 0.25, 0, 0);
      if (rArm) rArm.rotation.set(swing * 0.45, 0, 0.06);
      if (rForearm) rForearm.rotation.set(0.22 + Math.abs(swing) * 0.25, 0, 0);

      // Subtle forward torso cadence and shoulder sway
      if (ub) ub.rotation.set(0.04, Math.sin(walkCycle) * 0.035, 0);
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

          {/* ── HARMONIOUS CRANIOFACIAL ANATOMY (Smooth contour, NO lumpy protrusions!) ── */}
          {/* 1. Cranial Vault */}
          <mesh position={[0, 1.58, -0.005]} scale={[0.96, 1.05, 1.00]}>
            <sphereGeometry args={[0.076, 28, 28]} />
            <primitive object={skinMat} attach="material" />
          </mesh>

          {/* 2. Smooth Tapered Jawline connecting seamlessly */}
          <mesh position={[0, 1.520, 0.018]} rotation={[0.14, 0, 0]}>
            <cylinderGeometry args={[0.048, 0.032, 0.068, 20]} />
            <primitive object={skinMat} attach="material" />
          </mesh>

          {/* 3. Soft Rounded Chin */}
          <mesh position={[0, 1.486, 0.046]} scale={[1.10, 0.95, 1.05]}>
            <sphereGeometry args={[0.014, 16, 16]} />
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

          {/* ── ARMS & HANDS (Seamless anatomical sleeve transitions, NO ball joints!) ── */}
          {/* Left Arm (Articulated shoulder + elbow) */}
          <group ref={leftArmRef} position={[-0.16, 1.34, 0]}>
            <mesh position={[0, -0.08, 0]}>
              <capsuleGeometry args={[0.026, 0.12, 8, 14]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.4} />
            </mesh>
            {/* Left Sleeve Ribbed Cuff */}
            <mesh position={[0, -0.15, 0]}>
              <cylinderGeometry args={[0.029, 0.029, 0.016, 16]} />
              <meshStandardMaterial color="#ffffff" roughness={0.3} />
            </mesh>
            <group ref={leftForearmRef} position={[0, -0.18, 0]}>
              <mesh position={[0, -0.08, 0]}>
                <capsuleGeometry args={[0.020, 0.14, 8, 12]} />
                <primitive object={skinMat} attach="material" />
              </mesh>
              <SculptedHand
                position={[0, -0.18, 0]}
                rotation={[0, 0, 0]}
                scale={[0.62, 0.62, 0.62]}
                skinMat={skinMat}
                isLeft={true}
                mode="rest"
              />
            </group>
          </group>

          {/* Right Arm (Articulated shoulder + elbow) */}
          <group ref={rightArmRef} position={[0.16, 1.34, 0]}>
            <mesh position={[0, -0.08, 0]}>
              <capsuleGeometry args={[0.026, 0.12, 8, 14]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.4} />
            </mesh>
            {/* Right Sleeve Ribbed Cuff */}
            <mesh position={[0, -0.15, 0]}>
              <cylinderGeometry args={[0.029, 0.029, 0.016, 16]} />
              <meshStandardMaterial color="#ffffff" roughness={0.3} />
            </mesh>
            <group ref={rightForearmRef} position={[0, -0.18, 0]}>
              <mesh position={[0, -0.08, 0]}>
                <capsuleGeometry args={[0.020, 0.14, 8, 12]} />
                <primitive object={skinMat} attach="material" />
              </mesh>
              <SculptedHand
                position={[0, -0.18, 0]}
                rotation={[0, 0, 0]}
                scale={[0.62, 0.62, 0.62]}
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
 * - Về Đích Standing Center Podium (Bục đứng trung tâm cho thí sinh trả lời câu hỏi Về Đích, đồng bộ đèn xanh/đỏ).
 */
export function CenterFloorStage({
  state,
  screenFadeProgress = 0,
  serverNow,
  quality = "HIGH",
  liveFactor = 1.0,
}: {
  state?: OlympiaState | null;
  screenFadeProgress?: number;
  serverNow?: () => number;
  quality?: "HIGH" | "MEDIUM" | "LIGHT";
  liveFactor?: number;
}) {
  const wreathGroupRef = useRef<THREE.Group>(null);
  const entryBurstRef = useRef<THREE.Group>(null);
  const [entryElapsed, setEntryElapsed] = useState(0);

  const isVeDich = state?.currentRound === "veDich" || state?.roundsPlan?.[state?.roundIdx ?? 0] === "veDich";
  const isEntrance = state?.stage === "lobby" || Boolean(state?.entranceState?.active) || screenFadeProgress < 0.95;

  // Real-time stage lighting state (BLUE vs RED across all rounds including Về Đích)
  const nowMs = serverNow ? serverNow() : Date.now();
  const lightingMode = computeTargetLightingMode(state, nowMs);
  const isRed = lightingMode === "RED";

  // Dynamic broadcast lighting colors matching real-time studio state:
  const neonColor = isRed ? "#ef4444" : "#00f0ff";
  const accentColor = isRed ? "#dc2626" : "#38bdf8";

  // Real-time animation loop
  useFrame((_, delta) => {
    // 1. Vòng nguyệt quế: xoay linh hoạt ở Về Đích, đứng im ở các vòng trước
    if (wreathGroupRef.current) {
      if (isVeDich) {
        wreathGroupRef.current.rotation.z += delta * 0.35;
      } else {
        wreathGroupRef.current.rotation.z = 0;
      }
    }

    // 2. Hiệu ứng bắt đầu (tia sáng / radiant glow burst khi bắt đầu vô phòng)
    if (entryBurstRef.current) {
      setEntryElapsed((prev) => {
        const next = prev + delta;
        const cycle = (next % 3.0) / 3.0; // 3-second gentle radiant cycle
        if (entryBurstRef.current) {
          const s = 0.4 + cycle * 1.8;
          entryBurstRef.current.scale.set(s, s, s);
          entryBurstRef.current.rotation.z += delta * 0.2;
        }
        return next;
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

  return (
    <group position={[0, 0.188, -0.5]}>
      {/* ── 1. CONCENTRIC STAGE ARCHITECTURE ── */}
      {/* Outer Polished Metallic Bezel (R = 2.25m) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <ringGeometry args={[2.22, 2.30, 64]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.15} />
      </mesh>

      {/* Outer LED Broadcast Strip (R = 2.10m) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <ringGeometry args={[2.08, 2.14, 64]} />
        <meshBasicMaterial color={neonColor} toneMapped={false} />
      </mesh>

      {/* Middle Accent Ring (R = 1.80m: shifts dynamically with stage lighting) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <ringGeometry args={[1.78, 1.84, 64]} />
        <meshBasicMaterial color={accentColor} toneMapped={false} />
      </mesh>

      {/* Inner Subtle Neon Guide (R = 1.45m) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0035, 0]}>
        <ringGeometry args={[1.42, 1.46, 64]} />
        <meshBasicMaterial color={neonColor} toneMapped={false} transparent opacity={0.7} />
      </mesh>

      {/* Dark Ultra-Gloss Center Floor Disc (R = 1.40m, deep glossy reflective finish) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]} renderOrder={9}>
        <circleGeometry args={[1.40, 64]} />
        <meshStandardMaterial
          color="#030712"
          roughness={0.06}
          metalness={0.12}
          envMapIntensity={2.5}
        />
      </mesh>

      {/* ── 2. ENTRY RADIANT LIGHT BURST EFFECT (Khi bắt đầu vô phòng) ── */}
      {isEntrance && (
        <group ref={entryBurstRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
          {/* 12 Radiant Glowing Light Rays Expanding from Center */}
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            return (
              <mesh key={deg} rotation={[0, 0, rad]}>
                <planeGeometry args={[0.06, 2.2]} />
                <meshBasicMaterial
                  color="#38bdf8"
                  transparent
                  opacity={0.35 * Math.max(0, 1 - (entryElapsed % 3.0) / 3.0)}
                  depthWrite={false}
                  blending={THREE.AdditiveBlending}
                />
              </mesh>
            );
          })}
          {/* Expanding Radiant Core Ripple */}
          <mesh>
            <ringGeometry args={[0.1, 0.35, 32]} />
            <meshBasicMaterial
              color="#67e8f9"
              transparent
              opacity={0.5 * Math.max(0, 1 - (entryElapsed % 3.0) / 3.0)}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      )}

      {/* ── 3. HORIZONTAL GOLDEN LAUREL WREATH (Nằm phẳng trên sàn, xoay ở Về Đích) ── */}
      <group
        ref={wreathGroupRef}
        position={[0, 0.005, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={10}
      >
        {activeWreathTex && (
          <mesh>
            <planeGeometry args={[2.3, 2.3]} />
            <meshBasicMaterial
              map={activeWreathTex}
              transparent={true}
              depthWrite={false}
              toneMapped={false}
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
      />

      {/* Center-Right MC Desk in front of Hexagon Arch (Facing Center at -30°) */}
      <CenterMcDesk screenFadeProgress={screenFadeProgress} liveFactor={liveFactor} />

      {/* 2 Animated MC Presenters (Khánh Vy & Ngọc Huy) */}
      <McPresenters state={state} serverNow={serverNow} />

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

        // USER REQUIREMENT:
        // "chỉ thí sinh hiện tại bước về lại bục bảng điểm, các thí sinh khác vẫn đứng đó tới khi thực sự bắt đầu chơi"
        // The active contestant is on stage during Về Đích (except when idle); other contestants always stay at their desks!
        const isThisContestantInVeDichTurn = isVdActive && cfg.seatId === activeSeat;
        let showFigure = !isThisContestantInVeDichTurn;
        if (isEntranceActive) {
          // During entrance:
          // - Active walking contestant: rendered by ContestantEntranceWalkingFigures
          // - Contestants who already finished walking out: stand at podium
          // - Contestants not yet called: hidden completely
          showFigure = cfg.seatId < currentEntranceSeat;
        }

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
