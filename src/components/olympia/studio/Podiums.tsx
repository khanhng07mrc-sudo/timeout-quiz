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
}

const SEAT_THEME_COLORS = [
  "#ef4444", // TS 1: Đỏ
  "#3b82f6", // TS 2: Lam
  "#eab308", // TS 3: Vàng
  "#22c55e", // TS 4: Lục
];

/**
 * Creates dynamic high-contrast canvas texture for a contestant's front score screen.
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

  const teamColor = SEAT_THEME_COLORS[seatId] || "#00d4ff";

  // Background
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  if (isBuzzed) {
    grad.addColorStop(0, "#7f1d1d");
    grad.addColorStop(1, "#450a0a");
  } else {
    grad.addColorStop(0, "#172554");
    grad.addColorStop(1, "#0f172a");
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);

  // Border & Glow
  ctx.lineWidth = isBuzzed ? 10 : 6;
  ctx.strokeStyle = isBuzzed ? "#ff2a4b" : teamColor;
  ctx.strokeRect(6, 6, 500, 244);

  // Top Team Color Header Bar
  ctx.fillStyle = isBuzzed ? "#ff2a4b" : teamColor;
  ctx.fillRect(6, 6, 500, 48);

  // Seat Badge (Top Left inside header bar)
  ctx.fillStyle = "#ffffff";
  ctx.font = '900 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`THÍ SINH ${seatId + 1}`, 20, 38);

  // Contestant Name (Middle)
  ctx.font = '800 36px "Plus Jakarta Sans", "Montserrat", sans-serif';
  ctx.fillStyle = "#ffffff";
  ctx.fillText(name || `Thí sinh ${seatId + 1}`, 24, 102);

  // Divider Line
  ctx.strokeStyle = isBuzzed ? "rgba(255, 60, 80, 0.5)" : "rgba(255, 255, 255, 0.25)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(24, 126);
  ctx.lineTo(488, 126);
  ctx.stroke();

  // Score Value (Large bold digital / broadcast style)
  ctx.textAlign = "right";
  ctx.font = '900 88px "Plus Jakarta Sans", "Montserrat", monospace';
  ctx.fillStyle = isBuzzed ? "#ff3355" : "#ffd700";
  ctx.shadowColor = isBuzzed ? "#ff0033" : "#f59e0b";
  ctx.shadowBlur = 18;
  ctx.fillText(String(score), 488, 215);

  // Score Label
  ctx.font = '700 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.shadowBlur = 0;
  ctx.textAlign = "left";
  ctx.fillText("ĐIỂM SỐ", 24, 215);

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
    return tex;
  }, [canvas]);

  useEffect(() => {
    canvasRef.current = canvas;
    textureRef.current = texture;
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
    <mesh position={[0, 0.58, 0.468]} rotation={[-0.15, 0, 0]}>
      <planeGeometry args={[1.0, 0.5]} />
      {texture ? (
        <meshBasicMaterial map={texture} toneMapped={false} />
      ) : (
        <meshStandardMaterial color="#0f172a" />
      )}
    </mesh>
  );
}

/**
 * Single Contestant Podium with Chrome Dome Buzzer, Touch Tablet, and Dynamic Lighting
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
  const teamColor = SEAT_THEME_COLORS[seatId] || "#00d4ff";

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
    const c = new THREE.Color(teamColor);
    c.lerp(new THREE.Color("#ff2a4b"), screenFadeProgress);
    return c;
  }, [isBuzzed, teamColor, screenFadeProgress]);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* ── 1. PODIUM BASE & TAPERED PEDESTAL ── */}
      {/* Heavy Stage Footing */}
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[1.3, 0.12, 1.0]} />
        <meshStandardMaterial color="#0b0f19" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Main Geometric Body (Modern White Kiosk as in real VTV3 Studio S14) */}
      <mesh position={[0, 0.52, 0]}>
        <boxGeometry args={[1.15, 0.82, 0.88]} />
        <meshStandardMaterial
          color="#f8fafc"
          metalness={0.2}
          roughness={0.2}
          envMapIntensity={1.5}
        />
      </mesh>

      {/* Front Recessed Bezel Frame (Dark contrast frame for score display) */}
      <mesh position={[0, 0.58, 0.44]} rotation={[-0.15, 0, 0]}>
        <boxGeometry args={[1.06, 0.56, 0.04]} />
        <meshStandardMaterial color="#050810" metalness={0.95} roughness={0.15} />
      </mesh>

      {/* Front Dynamic Score Screen */}
      <ContestantScoreDisplay
        name={name}
        score={score}
        seatId={seatId}
        isBuzzed={isBuzzed}
      />

      {/* ── 2. DESK SURFACE & TOUCH TABLET ── */}
      {/* Slanted Top Desk */}
      <mesh position={[0, 0.96, -0.05]} rotation={[-0.18, 0, 0]}>
        <boxGeometry args={[1.22, 0.08, 0.95]} />
        <meshStandardMaterial color="#0a0d16" metalness={0.92} roughness={0.18} />
      </mesh>

      {/* Desk Glowing Edge Light Strip */}
      <mesh position={[0, 0.99, 0.41]} rotation={[-0.18, 0, 0]}>
        <boxGeometry args={[1.2, 0.02, 0.02]} />
        <meshBasicMaterial color={deskEdgeColor} />
      </mesh>

      {/* Contestant Touch Screen Tablet on Desk */}
      <mesh position={[0, 1.01, -0.06]} rotation={[-0.18, 0, 0]}>
        <boxGeometry args={[0.55, 0.015, 0.38]} />
        <meshStandardMaterial
          color="#061226"
          roughness={0.1}
          metalness={0.8}
          emissive="#0077b6"
          emissiveIntensity={0.25}
        />
      </mesh>

      {/* ── 3. CHROME DOME BUZZER SYSTEM ── */}
      <group position={[0.34, 1.05, 0.16]}>
        {/* Desk Halo Glow Ring (Lights up red when buzzed) */}
        <mesh ref={haloRef} position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.11, 0.17, 32]} />
          <meshBasicMaterial
            color="#ff0033"
            transparent
            opacity={0}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Polished Chrome Cylinder Base */}
        <mesh position={[0, 0.025, 0]}>
          <cylinderGeometry args={[0.095, 0.105, 0.05, 24]} />
          <primitive object={chromeBaseMat} attach="material" />
        </mesh>

        {/* Chrome Collar Ring */}
        <mesh position={[0, 0.052, 0]}>
          <torusGeometry args={[0.085, 0.012, 16, 32]} />
          <primitive object={chromeBaseMat} attach="material" />
        </mesh>

        {/* Dome Button (Emits intense red burst when buzzed) */}
        <mesh ref={buzzerDomeRef} position={[0, 0.055, 0]}>
          <sphereGeometry args={[0.078, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
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
    </group>
  );
}

/**
 * Center Stage Raised Dais with Concentric Glowing Neon Rings
 * Position: [0, 0.1, -2.8]
 */
function CenterStageRaisedDais({ screenFadeProgress = 0 }: { screenFadeProgress?: number }) {
  const ringColor = useMemo(() => {
    const c = new THREE.Color("#00e5ff");
    c.lerp(new THREE.Color("#ff1a40"), screenFadeProgress);
    return c;
  }, [screenFadeProgress]);

  return (
    <group position={[0, 0.08, -2.8]}>
      {/* Raised Circular Stage Platform */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[2.4, 2.5, 0.16, 48]} />
        <meshStandardMaterial color="#0a1020" roughness={0.12} metalness={0.85} />
      </mesh>

      {/* Outer Concentric Glowing Ring */}
      <mesh position={[0, 0.085, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.3, 2.38, 48]} />
        <meshBasicMaterial color={ringColor} side={THREE.DoubleSide} />
      </mesh>

      {/* Inner Concentric Glowing Ring */}
      <mesh position={[0, 0.085, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.7, 1.76, 48]} />
        <meshBasicMaterial color={ringColor} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/**
 * Dedicated MC Desk on Center Stage Dais
 * Position: [0, 0.16, -2.4], rotation [0, 0, 0]
 */
function CenterMcDesk({ screenFadeProgress = 0 }: { screenFadeProgress?: number }) {
  const trimColor = useMemo(() => {
    const c = new THREE.Color("#00e5ff");
    c.lerp(new THREE.Color("#ff2a4b"), screenFadeProgress);
    return c;
  }, [screenFadeProgress]);

  return (
    <group position={[0, 0.16, -2.8]} rotation={[0, 0, 0]}>
      {/* Base Footing */}
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.75, 0.82, 0.12, 8]} />
        <meshStandardMaterial color="#0b0f19" metalness={0.92} roughness={0.18} />
      </mesh>

      {/* Main Angular Lectern Body (Modern White Faceted Desk) */}
      <mesh position={[0, 0.60, 0]}>
        <boxGeometry args={[1.05, 1.05, 0.62]} />
        <meshStandardMaterial
          color="#f8fafc"
          metalness={0.2}
          roughness={0.2}
          envMapIntensity={1.5}
        />
      </mesh>

      {/* Front Frosted Glass Fascia with Gold Crest */}
      <mesh position={[0, 0.62, 0.32]}>
        <planeGeometry args={[0.92, 0.92]} />
        <meshPhysicalMaterial
          color="#1e293b"
          roughness={0.15}
          metalness={0.2}
          transmission={0.65}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Golden Olympia Laurel Emblem on Front of Lectern */}
      <mesh position={[0, 0.72, 0.33]}>
        <torusGeometry args={[0.18, 0.018, 16, 32]} />
        <meshStandardMaterial
          color="#ffd700"
          metalness={0.96}
          roughness={0.12}
          emissive="#ffd700"
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Edge Neon Accent Trim */}
      <mesh position={[0, 0.07, 0.36]}>
        <boxGeometry args={[0.96, 0.02, 0.02]} />
        <meshBasicMaterial color={trimColor} />
      </mesh>

      {/* Slanted Top Reading Desk */}
      <mesh position={[0, 1.15, -0.04]} rotation={[-0.22, 0, 0]}>
        <boxGeometry args={[1.12, 0.06, 0.68]} />
        <meshStandardMaterial color="#080c14" metalness={0.92} roughness={0.18} />
      </mesh>

      {/* Olympia Cue Card (White card with gold seal) */}
      <mesh position={[-0.18, 1.19, -0.02]} rotation={[-0.22, 0, 0.04]}>
        <boxGeometry args={[0.34, 0.008, 0.24]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.4} />
      </mesh>
      <mesh position={[-0.26, 1.20, -0.08]} rotation={[-0.22, 0, 0.04]}>
        <cylinderGeometry args={[0.024, 0.024, 0.01, 16]} />
        <meshStandardMaterial
          color="#ffd700"
          metalness={0.95}
          roughness={0.15}
          emissive="#ffd700"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Gooseneck Microphone */}
      <group position={[0.36, 1.18, 0.12]}>
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

      {/* Dedicated MC Spotlight */}
      <spotLight
        position={[0, 6.5, 0.8]}
        target-position={[0, 1.2, 0]}
        color="#fff5e6"
        intensity={7.0}
        angle={0.42}
        penumbra={0.35}
        distance={10}
      />
    </group>
  );
}

/**
 * Podiums Assembly:
 * 1. Center Stage Raised Dais + Center MC Desk
 * 2. 4 Contestant Podiums in Curved Left-Wing Arc (TS 1..4)
 */
export function Podiums({
  state,
  quality: _quality = "HIGH",
  screenFadeProgress = 0,
}: PodiumsProps) {
  // 4 Contestant Podiums along the Stage Left Arc:
  // Facing slightly inward towards Center Stage & MC
  const contestantConfigs: Array<{
    seatId: number;
    pos: [number, number, number];
    rotY: number;
  }> = [
    { seatId: 0, pos: [-5.8, 0, -2.4], rotY: 0.48 }, // TS 1: Đỏ
    { seatId: 1, pos: [-4.7, 0, -2.9], rotY: 0.38 }, // TS 2: Lam
    { seatId: 2, pos: [-3.6, 0, -3.4], rotY: 0.28 }, // TS 3: Vàng
    { seatId: 3, pos: [-2.5, 0, -3.8], rotY: 0.18 }, // TS 4: Lục
  ];

  return (
    <group>
      {/* Center Stage Raised Dais */}
      <CenterStageRaisedDais screenFadeProgress={screenFadeProgress} />

      {/* Center MC Desk */}
      <CenterMcDesk screenFadeProgress={screenFadeProgress} />

      {/* 4 Contestant Arc Podiums */}
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
