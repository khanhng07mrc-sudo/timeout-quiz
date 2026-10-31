"use client";

import React, { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { OlympiaState } from "@/lib/olympia/types";
import { isSeatBuzzedIn3D } from "./useOlympiaLightingState";

interface PodiumsProps {
  state?: OlympiaState | null;
  quality?: "HIGH" | "MEDIUM" | "LIGHT";
  screenFadeProgress?: number;
  serverNow?: () => number;
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
  isBuzzed: boolean
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const cyanBg = isBuzzed ? "#ff2a4b" : "#00e5ff";
  const navyText = isBuzzed ? "#ffffff" : "#081636";
  const borderColor = isBuzzed ? "#ff0033" : "#00d4ff";

  // 1. Bottom 3/4 Background (Y = 64 to 256)
  const bottomGrad = ctx.createLinearGradient(0, 64, 0, 256);
  if (isBuzzed) {
    bottomGrad.addColorStop(0, "#7f1d1d");
    bottomGrad.addColorStop(1, "#38040a");
  } else {
    bottomGrad.addColorStop(0, "#0e1e42");
    bottomGrad.addColorStop(1, "#030816");
  }
  ctx.fillStyle = bottomGrad;
  ctx.fillRect(0, 64, 512, 192);

  // 2. Top 1/4 Background (Y = 0 to 64)
  ctx.fillStyle = cyanBg;
  ctx.fillRect(0, 0, 512, 64);

  // 3. Top 1/4 Contestant Name (Deep Navy Text)
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = navyText;
  ctx.font = '900 32px "Plus Jakarta Sans", "Montserrat", sans-serif';
  ctx.letterSpacing = "0.04em";
  const displayName = (name || `Thí sinh ${seatId + 1}`).toUpperCase();
  ctx.fillText(displayName, 256, 33);

  // 4. Subtle separator line between top 1/4 and bottom 3/4
  ctx.strokeStyle = isBuzzed ? "#ff0033" : "rgba(0, 229, 255, 0.45)";
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
  ctx.shadowColor = isBuzzed ? "#ff0033" : "rgba(0, 212, 255, 0.45)";
  ctx.shadowBlur = 18;
  ctx.fillText(String(score), 256, 160);
  ctx.shadowBlur = 0;

  // 6. Outer Border & Glow
  ctx.lineWidth = isBuzzed ? 10 : 6;
  ctx.strokeStyle = borderColor;
  ctx.strokeRect(3, 3, 506, 250);

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
}: {
  name: string;
  score: number;
  seatId: number;
  isBuzzed: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);

  const canvas = useMemo(() => {
    if (typeof document === "undefined") return null;
    return createPodiumScoreCanvas(name, score, seatId, isBuzzed);
  }, [name, score, seatId, isBuzzed]);

  const texture = useMemo(() => {
    if (!canvas) return null;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }, [canvas]);

  useEffect(() => {
    canvasRef.current = canvas;
    textureRef.current = texture;
    if (texture) texture.needsUpdate = true;
  }, [canvas, texture]);

  useEffect(() => {
    if (canvasRef.current && textureRef.current) {
      const fresh = createPodiumScoreCanvas(name, score, seatId, isBuzzed);
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(fresh, 0, 0);
      }
      textureRef.current.needsUpdate = true;
    }
  }, [name, score, seatId, isBuzzed]);

  return (
    <mesh position={[0, 0.48, 0.435]} rotation={[-0.12, 0, 0]}>
      <planeGeometry args={[0.96, 0.46]} />
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
 */
function ContestantFigure({ seatId }: { seatId: number }) {
  const shirtColors = ["#ef4444", "#3b82f6", "#eab308", "#22c55e"];
  const shirtColor = shirtColors[seatId % shirtColors.length];

  return (
    <group position={[0, 0, -0.42]}>
      {/* Head */}
      <mesh position={[0, 1.58, 0]}>
        <sphereGeometry args={[0.082, 20, 20]} />
        <meshStandardMaterial color="#fed7aa" roughness={0.6} />
      </mesh>
      {/* Hair */}
      <mesh position={[0, 1.62, -0.02]}>
        <sphereGeometry args={[0.088, 20, 20]} />
        <meshStandardMaterial color="#1e1b18" roughness={0.8} />
      </mesh>
      {/* Contestant Team Polo Shirt */}
      <mesh position={[0, 1.25, 0]}>
        <cylinderGeometry args={[0.13, 0.16, 0.45, 16]} />
        <meshStandardMaterial color={shirtColor} roughness={0.5} />
      </mesh>
      {/* White Polo Collar Accent */}
      <mesh position={[0, 1.48, 0.04]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.14, 0.04, 0.08]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </mesh>
      {/* Left Arm Resting forward near desk */}
      <mesh position={[-0.20, 1.18, 0.18]} rotation={[0.45, 0, -0.15]}>
        <cylinderGeometry args={[0.035, 0.030, 0.40, 12]} />
        <meshStandardMaterial color={shirtColor} roughness={0.5} />
      </mesh>
      <mesh position={[-0.22, 0.98, 0.32]}>
        <sphereGeometry args={[0.032, 12, 12]} />
        <meshStandardMaterial color="#fed7aa" roughness={0.6} />
      </mesh>
      {/* Right Arm Hovering near buzzer */}
      <mesh position={[0.20, 1.18, 0.18]} rotation={[0.45, 0, 0.15]}>
        <cylinderGeometry args={[0.035, 0.030, 0.40, 12]} />
        <meshStandardMaterial color={shirtColor} roughness={0.5} />
      </mesh>
      <mesh position={[0.22, 0.98, 0.32]}>
        <sphereGeometry args={[0.032, 12, 12]} />
        <meshStandardMaterial color="#fed7aa" roughness={0.6} />
      </mesh>
      {/* Trousers */}
      <mesh position={[-0.08, 0.52, 0]}>
        <cylinderGeometry args={[0.055, 0.048, 0.94, 12]} />
        <meshStandardMaterial color="#0f172a" roughness={0.8} />
      </mesh>
      <mesh position={[0.08, 0.52, 0]}>
        <cylinderGeometry args={[0.055, 0.048, 0.94, 12]} />
        <meshStandardMaterial color="#0f172a" roughness={0.8} />
      </mesh>
    </group>
  );
}

/**
 * Single Contestant Podium with Grounded Architectural Plinth Footing,
 * Flush Recessed Scoreboard, Slanted Desk Surface, and Palm-Sized Buzzer.
 */
function ContestantPodium({
  seatId,
  name,
  score,
  position,
  rotationY,
  isBuzzed,
  screenFadeProgress = 0,
}: {
  seatId: number;
  name: string;
  score: number;
  position: [number, number, number];
  rotationY: number;
  isBuzzed: boolean;
  screenFadeProgress?: number;
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

  const deskEdgeColor = useMemo(() => {
    if (isBuzzed) return "#ff0033";
    const c = new THREE.Color("#00f0ff");
    c.lerp(new THREE.Color("#ff2a4b"), screenFadeProgress);
    return c;
  }, [isBuzzed, screenFadeProgress]);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* ── 1. ARCHITECTURAL PLINTH BASE (Chân bục vững chắc tiếp đất Y=0) ── */}
      {/* Heavy Grounded Base Plinth Footing */}
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[1.22, 0.08, 0.90]} />
        <meshStandardMaterial color="#1e293b" metalness={0.88} roughness={0.2} />
      </mesh>
      {/* Recessed Plinth Reveal Strip */}
      <mesh position={[0, 0.09, 0]}>
        <boxGeometry args={[1.12, 0.04, 0.82]} />
        <meshStandardMaterial color="#0f172a" metalness={0.92} roughness={0.15} />
      </mesh>
      {/* Grounded Cyan Neon Edge Trim */}
      <mesh position={[0, 0.082, 0.45]}>
        <boxGeometry args={[1.20, 0.015, 0.02]} />
        <meshBasicMaterial color="#00e5ff" />
      </mesh>

      {/* ── 2. MAIN KIOSK BODY (Brilliant White Modern Faceted Enamel) ── */}
      <mesh position={[0, 0.52, 0]}>
        <boxGeometry args={[1.14, 0.78, 0.80]} />
        <meshStandardMaterial
          color="#f8fafc"
          metalness={0.15}
          roughness={0.25}
          envMapIntensity={1.5}
        />
      </mesh>

      {/* Front Recessed Cavity Frame (Black Inset LCD housing) */}
      <mesh position={[0, 0.48, 0.418]} rotation={[-0.12, 0, 0]}>
        <boxGeometry args={[1.00, 0.50, 0.02]} />
        <meshStandardMaterial color="#050810" metalness={0.95} roughness={0.15} />
      </mesh>

      {/* Front Dynamic Score Screen (Inset flush into the cavity) */}
      <ContestantScoreDisplay
        name={name}
        score={score}
        seatId={seatId}
        isBuzzed={isBuzzed}
      />

      {/* ── 3. DESK SURFACE & TOUCH TABLET ── */}
      {/* Slanted Top Desk Surface */}
      <mesh position={[0, 0.94, -0.04]} rotation={[-0.18, 0, 0]}>
        <boxGeometry args={[1.18, 0.06, 0.90]} />
        <meshStandardMaterial color="#0a0d16" metalness={0.92} roughness={0.18} />
      </mesh>

      {/* Desk Glowing Edge Light Strip */}
      <mesh position={[0, 0.965, 0.40]} rotation={[-0.18, 0, 0]}>
        <boxGeometry args={[1.16, 0.02, 0.02]} />
        <meshBasicMaterial color={deskEdgeColor} />
      </mesh>

      {/* Contestant Touch Screen Tablet on Desk */}
      <mesh position={[0, 0.985, -0.06]} rotation={[-0.18, 0, 0]}>
        <boxGeometry args={[0.54, 0.015, 0.36]} />
        <meshStandardMaterial
          color="#061226"
          roughness={0.1}
          metalness={0.8}
          emissive="#0077b6"
          emissiveIntensity={0.25}
        />
      </mesh>

      {/* ── 4. CHROME DOME BUZZER SYSTEM (Compact Palm-Sized r=0.035m) ── */}
      <group position={[0.34, 1.01, 0.14]}>
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

      {/* ── 5. 3D CONTESTANT FIGURE STANDING BEHIND PODIUM ── */}
      <ContestantFigure seatId={seatId} />
    </group>
  );
}

/**
 * Dedicated MC Desk on Stage Center-Right in front of Hexagon Arch
 * Oriented along -30° (-0.52 rad) facing Stage Center and Contestants.
 * Features:
 * - Geometric faceted lectern console in matte charcoal with silver trim.
 * - Circular Olympia RED CREST BADGE with golden laurel wreath and red halo.
 * - Slanted reading desk with cue card, laptop, and 2 gooseneck mics.
 */
function CenterMcDesk({ screenFadeProgress = 0 }: { screenFadeProgress?: number }) {
  const trimColor = useMemo(() => {
    const c = new THREE.Color("#00e5ff");
    c.lerp(new THREE.Color("#ff1a40"), screenFadeProgress);
    return c;
  }, [screenFadeProgress]);

  return (
    <group position={[1.6, 0.08, -3.2]} rotation={[0, -0.52, 0]}>
      {/* Heavy Grounded Base Footing */}
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[1.20, 0.08, 0.70]} />
        <meshStandardMaterial color="#0b0f19" metalness={0.92} roughness={0.18} />
      </mesh>

      {/* Main Angular Lectern Body (Modern Faceted Charcoal Desk) */}
      <mesh position={[0, 0.52, 0]}>
        <boxGeometry args={[1.15, 0.92, 0.60]} />
        <meshStandardMaterial
          color="#1e293b"
          metalness={0.7}
          roughness={0.25}
          envMapIntensity={1.5}
        />
      </mesh>

      {/* Sleek Brushed Silver Side Bevel Accents */}
      <mesh position={[-0.58, 0.52, 0]}>
        <boxGeometry args={[0.02, 0.92, 0.62]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.15} />
      </mesh>
      <mesh position={[0.58, 0.52, 0]}>
        <boxGeometry args={[0.02, 0.92, 0.62]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.15} />
      </mesh>

      {/* ── OFFICIAL OLYMPIA RED CREST BADGE ON FRONT OF LECTERN ── */}
      {/* Red Circular Crest Disc */}
      <mesh position={[0, 0.58, 0.31]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.02, 32]} />
        <meshStandardMaterial
          color="#dc2626"
          roughness={0.2}
          metalness={0.3}
          emissive="#dc2626"
          emissiveIntensity={0.65}
        />
      </mesh>

      {/* Golden Laurel Wreath Ring on Crest */}
      <mesh position={[0, 0.58, 0.325]}>
        <torusGeometry args={[0.15, 0.016, 16, 32]} />
        <meshStandardMaterial
          color="#ffd700"
          metalness={0.96}
          roughness={0.12}
          emissive="#ffd700"
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* Soft Red Glowing Halo around Crest */}
      <mesh position={[0, 0.58, 0.305]}>
        <ringGeometry args={[0.21, 0.25, 32]} />
        <meshBasicMaterial color="#ff0033" side={THREE.DoubleSide} />
      </mesh>

      {/* Edge Neon Accent Trim */}
      <mesh position={[0, 0.08, 0.35]}>
        <boxGeometry args={[1.08, 0.02, 0.02]} />
        <meshBasicMaterial color={trimColor} />
      </mesh>

      {/* Slanted Top Reading Desk */}
      <mesh position={[0, 1.02, -0.04]} rotation={[-0.22, 0, 0]}>
        <boxGeometry args={[1.18, 0.06, 0.66]} />
        <meshStandardMaterial color="#080c14" metalness={0.92} roughness={0.18} />
      </mesh>

      {/* Olympia Cue Card (White card with gold seal) */}
      <mesh position={[-0.22, 1.06, -0.02]} rotation={[-0.22, 0, 0.04]}>
        <boxGeometry args={[0.34, 0.008, 0.24]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.4} />
      </mesh>
      <mesh position={[-0.30, 1.07, -0.08]} rotation={[-0.22, 0, 0.04]}>
        <cylinderGeometry args={[0.024, 0.024, 0.01, 16]} />
        <meshStandardMaterial
          color="#ffd700"
          metalness={0.95}
          roughness={0.15}
          emissive="#ffd700"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Mini Laptop / Screen on Desk */}
      <mesh position={[0.18, 1.07, -0.04]} rotation={[-0.22, 0, 0]}>
        <boxGeometry args={[0.42, 0.015, 0.28]} />
        <meshStandardMaterial color="#0284c7" metalness={0.8} roughness={0.2} emissive="#0077b6" emissiveIntensity={0.3} />
      </mesh>

      {/* Dual Gooseneck Microphones */}
      <group position={[0.42, 1.05, 0.12]}>
        <mesh position={[0, 0.015, 0]}>
          <cylinderGeometry args={[0.022, 0.026, 0.03, 16]} />
          <meshStandardMaterial color="#1e2430" metalness={0.95} roughness={0.15} />
        </mesh>
        <mesh position={[0, 0.12, -0.02]} rotation={[0.25, 0, 0]}>
          <cylinderGeometry args={[0.006, 0.006, 0.22, 12]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.27, -0.09]} rotation={[-0.4, 0, 0]}>
          <cylinderGeometry args={[0.006, 0.006, 0.14, 12]} />
          <meshStandardMaterial color="#64748b" metalness={0.85} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.32, -0.14]} rotation={[-0.4, 0, 0]}>
          <sphereGeometry args={[0.018, 16, 16]} />
          <meshStandardMaterial color="#0f172a" roughness={0.8} />
        </mesh>
      </group>
      <group position={[-0.42, 1.05, 0.12]}>
        <mesh position={[0, 0.015, 0]}>
          <cylinderGeometry args={[0.022, 0.026, 0.03, 16]} />
          <meshStandardMaterial color="#1e2430" metalness={0.95} roughness={0.15} />
        </mesh>
        <mesh position={[0, 0.12, -0.02]} rotation={[0.25, 0, 0]}>
          <cylinderGeometry args={[0.006, 0.006, 0.22, 12]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.27, -0.09]} rotation={[-0.4, 0, 0]}>
          <cylinderGeometry args={[0.006, 0.006, 0.14, 12]} />
          <meshStandardMaterial color="#64748b" metalness={0.85} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.32, -0.14]} rotation={[-0.4, 0, 0]}>
          <sphereGeometry args={[0.018, 16, 16]} />
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
function McPresenters({
  state,
  serverNow,
}: {
  state?: OlympiaState | null;
  serverNow?: () => number;
}) {
  const kvRef = useRef<THREE.Group>(null);
  const nhRef = useRef<THREE.Group>(null);

  // Compute walk-out animation progress (0.0: behind arch -> 1.0: beside MC desk)
  useFrame(() => {
    const isIntro = Boolean(state?.introTimer);
    const now = serverNow ? serverNow() : Date.now();
    let walkProgress = 1.0;

    if (isIntro && state?.introTimer) {
      const startedAt = state.introTimer.startedAt || now;
      const elapsed = Math.max(0, now - startedAt);
      if (elapsed < 3500) {
        walkProgress = 0.0;
      } else if (elapsed > 10000) {
        walkProgress = 1.0;
      } else {
        const raw = (elapsed - 3500) / 6500;
        walkProgress = raw * raw * (3 - 2 * raw); // Smoothstep
      }
    }

    // Khánh Vy (Female MC): Steps from behind arch [2.4, 0.14, -4.0] to broadcast mark [1.8, 0.14, -2.5]
    if (kvRef.current) {
      const targetX = THREE.MathUtils.lerp(2.4, 1.8, walkProgress);
      const targetZ = THREE.MathUtils.lerp(-4.0, -2.5, walkProgress);
      const bob = Math.sin(walkProgress * Math.PI * 6) * (walkProgress > 0 && walkProgress < 1 ? 0.025 : 0);
      kvRef.current.position.set(targetX, 0.14 + bob, targetZ);
    }

    // Ngọc Huy (Male MC): Steps from behind arch [1.4, 0.14, -4.0] to broadcast mark [1.1, 0.14, -2.5]
    if (nhRef.current) {
      const targetX = THREE.MathUtils.lerp(1.4, 1.1, walkProgress);
      const targetZ = THREE.MathUtils.lerp(-4.0, -2.5, walkProgress);
      const bob = Math.sin(walkProgress * Math.PI * 6 + Math.PI) * (walkProgress > 0 && walkProgress < 1 ? 0.025 : 0);
      nhRef.current.position.set(targetX, 0.14 + bob, targetZ);
    }
  });

  return (
    <group>
      {/* ── KHÁNH VY (Female Presenter) ── */}
      <group ref={kvRef} position={[1.8, 0.14, -2.5]} rotation={[0, -0.52, 0]}>
        {/* Head */}
        <mesh position={[0, 1.58, 0]}>
          <sphereGeometry args={[0.082, 24, 24]} />
          <meshStandardMaterial color="#fed7aa" roughness={0.55} />
        </mesh>
        {/* Styled Dark Brunette Hair with Shoulder Flow */}
        <mesh position={[0, 1.61, -0.02]}>
          <sphereGeometry args={[0.090, 24, 24]} />
          <meshStandardMaterial color="#2d1b00" roughness={0.8} />
        </mesh>
        <mesh position={[0, 1.50, -0.05]}>
          <cylinderGeometry args={[0.08, 0.11, 0.22, 16]} />
          <meshStandardMaterial color="#2d1b00" roughness={0.8} />
        </mesh>
        {/* Round Eyeglasses Frame (Khánh Vy trademark) */}
        <group position={[0, 1.58, 0.08]}>
          <mesh position={[-0.032, 0, 0]}>
            <ringGeometry args={[0.016, 0.020, 16]} />
            <meshBasicMaterial color="#1e293b" side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0.032, 0, 0]}>
            <ringGeometry args={[0.016, 0.020, 16]} />
            <meshBasicMaterial color="#1e293b" side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.02, 0.003, 0.003]} />
            <meshBasicMaterial color="#1e293b" />
          </mesh>
        </group>
        {/* Neck */}
        <mesh position={[0, 1.48, 0]}>
          <cylinderGeometry args={[0.035, 0.038, 0.06, 12]} />
          <meshStandardMaterial color="#fed7aa" roughness={0.55} />
        </mesh>
        {/* Crisp White Blouse with Collar */}
        <mesh position={[0, 1.30, 0]}>
          <cylinderGeometry args={[0.11, 0.13, 0.32, 16]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.3} />
        </mesh>
        {/* Burgundy Necktie */}
        <mesh position={[0, 1.30, 0.115]} rotation={[0.08, 0, 0]}>
          <boxGeometry args={[0.045, 0.22, 0.01]} />
          <meshStandardMaterial color="#7f1d1d" roughness={0.4} />
        </mesh>
        {/* Left Arm holding White Cue Card */}
        <mesh position={[-0.18, 1.28, 0.08]} rotation={[0.5, 0, -0.2]}>
          <cylinderGeometry args={[0.035, 0.030, 0.36, 12]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.3} />
        </mesh>
        <mesh position={[-0.16, 1.14, 0.24]} rotation={[0.2, -0.3, 0]}>
          <boxGeometry args={[0.18, 0.008, 0.12]} />
          <meshStandardMaterial color="#ffffff" roughness={0.2} />
        </mesh>
        {/* Right Arm holding Wireless Mic */}
        <mesh position={[0.18, 1.28, 0.08]} rotation={[0.6, 0, 0.2]}>
          <cylinderGeometry args={[0.035, 0.030, 0.36, 12]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.3} />
        </mesh>
        <group position={[0.16, 1.36, 0.26]} rotation={[-0.3, 0, 0]}>
          <mesh>
            <cylinderGeometry args={[0.009, 0.007, 0.12, 12]} />
            <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.07, 0]}>
            <sphereGeometry args={[0.015, 16, 16]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
        {/* Flared Warm Beige Pleated Midi Skirt */}
        <mesh position={[0, 0.90, 0]}>
          <cylinderGeometry args={[0.12, 0.24, 0.50, 20]} />
          <meshStandardMaterial color="#d4b996" roughness={0.7} />
        </mesh>
        {/* Legs in natural tone */}
        <mesh position={[-0.07, 0.42, 0]}>
          <cylinderGeometry args={[0.038, 0.032, 0.52, 12]} />
          <meshStandardMaterial color="#fed7aa" roughness={0.6} />
        </mesh>
        <mesh position={[0.07, 0.42, 0]}>
          <cylinderGeometry args={[0.038, 0.032, 0.52, 12]} />
          <meshStandardMaterial color="#fed7aa" roughness={0.6} />
        </mesh>
        {/* Black Heels */}
        <mesh position={[-0.07, 0.06, 0.02]}>
          <boxGeometry args={[0.05, 0.06, 0.11]} />
          <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.8} />
        </mesh>
        <mesh position={[0.07, 0.06, 0.02]}>
          <boxGeometry args={[0.05, 0.06, 0.11]} />
          <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.8} />
        </mesh>
      </group>

      {/* ── NGỌC HUY (Male Presenter) ── */}
      <group ref={nhRef} position={[1.1, 0.14, -2.5]} rotation={[0, -0.52, 0]}>
        {/* Head */}
        <mesh position={[0, 1.68, 0]}>
          <sphereGeometry args={[0.088, 24, 24]} />
          <meshStandardMaterial color="#fed7aa" roughness={0.55} />
        </mesh>
        {/* Modern Dark Side-Part Hair */}
        <mesh position={[0, 1.72, -0.01]}>
          <sphereGeometry args={[0.094, 24, 24]} />
          <meshStandardMaterial color="#1a1816" roughness={0.75} />
        </mesh>
        <mesh position={[0.04, 1.74, 0.03]}>
          <boxGeometry args={[0.09, 0.04, 0.08]} />
          <meshStandardMaterial color="#1a1816" roughness={0.75} />
        </mesh>
        {/* Neck */}
        <mesh position={[0, 1.56, 0]}>
          <cylinderGeometry args={[0.042, 0.045, 0.08, 12]} />
          <meshStandardMaterial color="#fed7aa" roughness={0.55} />
        </mesh>
        {/* Cream Casual Zippered Jacket over White Shirt */}
        <mesh position={[0, 1.34, 0]}>
          <cylinderGeometry args={[0.15, 0.16, 0.40, 16]} />
          <meshStandardMaterial color="#ded9ce" roughness={0.6} />
        </mesh>
        {/* Collar & Inner Shirt V */}
        <mesh position={[0, 1.50, 0.12]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.12, 0.06, 0.02]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>
        {/* Left Arm with Wireless Mic up near chest */}
        <mesh position={[-0.22, 1.35, 0.10]} rotation={[0.6, 0, -0.25]}>
          <cylinderGeometry args={[0.042, 0.038, 0.40, 12]} />
          <meshStandardMaterial color="#ded9ce" roughness={0.6} />
        </mesh>
        <group position={[-0.18, 1.45, 0.28]} rotation={[-0.4, 0, 0]}>
          <mesh>
            <cylinderGeometry args={[0.010, 0.008, 0.12, 12]} />
            <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.07, 0]}>
            <sphereGeometry args={[0.016, 16, 16]} />
            <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
        {/* Right Arm relaxed holding Host Tablet */}
        <mesh position={[0.22, 1.30, 0.06]} rotation={[0.2, 0, 0.2]}>
          <cylinderGeometry args={[0.042, 0.038, 0.40, 12]} />
          <meshStandardMaterial color="#ded9ce" roughness={0.6} />
        </mesh>
        <mesh position={[0.25, 1.12, 0.14]} rotation={[0.3, -0.2, 0]}>
          <boxGeometry args={[0.16, 0.01, 0.22]} />
          <meshStandardMaterial color="#0284c7" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Trousers */}
        <mesh position={[-0.09, 0.56, 0]}>
          <cylinderGeometry args={[0.065, 0.052, 0.96, 12]} />
          <meshStandardMaterial color="#0f172a" roughness={0.8} />
        </mesh>
        <mesh position={[0.09, 0.56, 0]}>
          <cylinderGeometry args={[0.065, 0.052, 0.96, 12]} />
          <meshStandardMaterial color="#0f172a" roughness={0.8} />
        </mesh>
        {/* Shoes */}
        <mesh position={[-0.09, 0.04, 0.03]}>
          <boxGeometry args={[0.065, 0.05, 0.13]} />
          <meshStandardMaterial color="#020617" roughness={0.3} />
        </mesh>
        <mesh position={[0.09, 0.04, 0.03]}>
          <boxGeometry args={[0.065, 0.05, 0.13]} />
          <meshStandardMaterial color="#020617" roughness={0.3} />
        </mesh>
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
  quality: _quality = "HIGH",
  screenFadeProgress = 0,
  serverNow,
}: PodiumsProps) {
  const activeCount = state?.seats?.length ? Math.min(8, Math.max(2, state.seats.length)) : 4;

  // Exact concentric circular arc positioning: R = 5.2m from center C(0, 0, -0.6)
  // Base elevation: Y = 0.22m on top of the raised dais
  const contestantConfigs = useMemo(() => {
    const configs: Array<{
      seatId: number;
      pos: [number, number, number];
      rotY: number;
    }> = [];

    const radius = 5.2;
    const startPhi = 0.314; // 18° in radians
    const endPhi = 1.152;   // 66° in radians

    for (let i = 0; i < activeCount; i++) {
      const frac = activeCount === 1 ? 0 : i / (activeCount - 1);
      const phi = startPhi + frac * (endPhi - startPhi);

      // In Three.js:
      // X = -R * cos(phi) (Stage Left)
      // Z = -0.6 - R * sin(phi) (Upstage Left)
      const x = -radius * Math.cos(phi);
      const z = -0.6 - radius * Math.sin(phi);

      // Facing normal points from (x, z) to (0, -0.6):
      // Delta X = +R*cos(phi), Delta Z = +R*sin(phi)
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

  return (
    <group>
      {/* Center-Right MC Desk in front of Hexagon Arch (Facing Center at -30°) */}
      <CenterMcDesk screenFadeProgress={screenFadeProgress} />

      {/* 2 Animated MC Presenters (Khánh Vy & Ngọc Huy) */}
      <McPresenters state={state} serverNow={serverNow} />

      {/* N Contestant Arc Podiums on Raised Dais */}
      {contestantConfigs.map((cfg) => {
        const seat = state?.seats?.[cfg.seatId];
        const name = seat?.name || `Thí sinh ${cfg.seatId + 1}`;
        const score = seat?.score ?? 0;
        const isBuzzed = isSeatBuzzedIn3D(cfg.seatId, state);

        return (
          <ContestantPodium
            key={cfg.seatId}
            seatId={cfg.seatId}
            name={name}
            score={score}
            position={cfg.pos}
            rotationY={cfg.rotY}
            isBuzzed={isBuzzed}
            screenFadeProgress={screenFadeProgress}
          />
        );
      })}
    </group>
  );
}
