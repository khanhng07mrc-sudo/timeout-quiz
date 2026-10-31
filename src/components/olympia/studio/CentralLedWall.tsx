"use client";

import React, { useRef, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface CentralLedWallProps {
  screenFadeProgress?: number; // 0.0 (Sapphire Blue) -> 1.0 (Fiery Red)
  quality?: "HIGH" | "MEDIUM" | "LIGHT";
}

/**
 * Generates the Central LED broadcast screen texture with the official
 * Olympia 2016 logo and yellow light-to-dark gradient typography.
 */
function createLedScreenCanvas(
  logoImg: HTMLImageElement | null,
  fadeProgress: number = 0,
  animTime: number = 0
): HTMLCanvasElement {
  const width = 2048;
  const height = 1152; // 16:9 aspect ratio
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const cx = width / 2;
  const cy = height / 2;

  // ── 1. BACKGROUND BROADCAST GRADIENT (Interpolating Blue -> Red) ──
  // Blue base: #04091a -> #0a1f4d; Red competition: #1a0409 -> #4d0a15
  const bgGrad = ctx.createRadialGradient(cx, cy * 0.95, 100, cx, cy, width * 0.75);
  const r1 = Math.round(THREE.MathUtils.lerp(10, 80, fadeProgress));
  const g1 = Math.round(THREE.MathUtils.lerp(31, 10, fadeProgress));
  const b1 = Math.round(THREE.MathUtils.lerp(77, 20, fadeProgress));

  const r0 = Math.round(THREE.MathUtils.lerp(4, 26, fadeProgress));
  const g0 = Math.round(THREE.MathUtils.lerp(9, 4, fadeProgress));
  const b0 = Math.round(THREE.MathUtils.lerp(26, 9, fadeProgress));

  bgGrad.addColorStop(0, `rgb(${r1}, ${g1}, ${b1})`);
  bgGrad.addColorStop(0.65, `rgb(${r0}, ${g0}, ${b0})`);
  bgGrad.addColorStop(1, "#010206");

  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // ── 2. HEXAGONAL CIRCUIT GRID & STUDIO ACCENTS ──
  ctx.save();
  ctx.lineWidth = 1.5;
  const hexRadius = 48;
  const hexW = Math.sqrt(3) * hexRadius;
  const hexH = 2 * hexRadius;
  const gridAlpha = 0.08 + Math.sin(animTime * 1.5) * 0.02;

  ctx.strokeStyle = fadeProgress > 0.5
    ? `rgba(255, 60, 80, ${gridAlpha * 1.2})`
    : `rgba(0, 210, 255, ${gridAlpha})`;

  for (let y = -hexH; y < height + hexH; y += hexH * 0.75) {
    const isOdd = Math.round(y / (hexH * 0.75)) % 2 !== 0;
    const xOffset = isOdd ? hexW / 2 : 0;
    for (let x = -hexW; x < width + hexW; x += hexW) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const hx = x + xOffset + hexRadius * Math.cos(angle);
        const hy = y + hexRadius * Math.sin(angle);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.restore();

  // ── 3. VIBRANT STAGE GLOW PULSES ──
  const pulseR = THREE.MathUtils.lerp(0, 255, fadeProgress);
  const pulseG = THREE.MathUtils.lerp(180, 40, fadeProgress);
  const pulseB = THREE.MathUtils.lerp(255, 60, fadeProgress);
  const glowGrad = ctx.createRadialGradient(cx, cy * 0.75, 40, cx, cy * 0.75, 620);
  glowGrad.addColorStop(0, `rgba(${pulseR}, ${pulseG}, ${pulseB}, 0.22)`);
  glowGrad.addColorStop(0.5, `rgba(${pulseR}, ${pulseG}, ${pulseB}, 0.06)`);
  glowGrad.addColorStop(1, "transparent");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, width, height);

  // ── 4. OFFICIAL OLYMPIA 2016 LOGO ──
  const logoTargetH = 460;
  const logoTargetY = 160;

  if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
    const aspect = logoImg.naturalWidth / logoImg.naturalHeight;
    const logoW = logoTargetH * aspect;
    const logoX = cx - logoW / 2;

    ctx.save();
    // Subtle backdrop shadow behind logo
    ctx.shadowColor = fadeProgress > 0.5 ? "rgba(255, 30, 60, 0.6)" : "rgba(0, 180, 255, 0.45)";
    ctx.shadowBlur = 40;
    ctx.drawImage(logoImg, logoX, logoTargetY, logoW, logoTargetH);
    ctx.restore();
  } else {
    // Elegant fallback icon if image is still loading
    ctx.save();
    ctx.font = '900 120px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffd700";
    ctx.shadowColor = "#ffb700";
    ctx.shadowBlur = 30;
    ctx.fillText("OLYMPIA", cx, logoTargetY + 280);
    ctx.restore();
  }

  // ── 5. YELLOW LIGHT-TO-DARK GRADIENT TEXT: "ĐƯỜNG LÊN ĐỈNH OLYMPIA" ──
  const textY = logoTargetY + logoTargetH + 155;
  const textStr = "ĐƯỜNG LÊN ĐỈNH OLYMPIA";

  ctx.save();
  // Broadcast font styling
  ctx.font = '900 88px "Plus Jakarta Sans", "Montserrat", "Arial Black", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Light-to-Dark Yellow/Gold Vertical Gradient
  // Top: #fff899 (bright light yellow) -> Middle: #ffd700 (radiant golden) -> Bottom: #996500 (dark rich bronze/gold)
  const textGrad = ctx.createLinearGradient(0, textY - 50, 0, textY + 50);
  textGrad.addColorStop(0, "#fffbd0");   // Bright light yellow highlight
  textGrad.addColorStop(0.28, "#ffea55"); // Vibrant golden yellow
  textGrad.addColorStop(0.65, "#f59e0b"); // Rich broadcast amber gold
  textGrad.addColorStop(1, "#854d0e");    // Deep dark golden bronze

  // Outer dark bevel stroke for high contrast
  ctx.lineWidth = 14;
  ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
  ctx.lineJoin = "round";
  ctx.strokeText(textStr, cx, textY);

  // Secondary soft golden outer halo
  ctx.shadowColor = "rgba(255, 215, 0, 0.65)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 2;

  // Inner metallic stroke
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#fffed4";
  ctx.strokeText(textStr, cx, textY);

  // Gradient Fill
  ctx.fillStyle = textGrad;
  ctx.fillText(textStr, cx, textY);

  // Subtle subtitle / decorative rules
  ctx.shadowBlur = 0;
  ctx.font = '800 24px "Plus Jakarta Sans", sans-serif';
  ctx.letterSpacing = "0.45em";
  ctx.fillStyle = fadeProgress > 0.5 ? "rgba(255, 180, 190, 0.75)" : "rgba(180, 225, 255, 0.75)";
  ctx.fillText("VTV3 BROADCAST STUDIO SET", cx, textY + 85);

  // Dual flanking decorative gold rules
  const ruleW = 280;
  const ruleY = textY + 85;
  const ruleGradL = ctx.createLinearGradient(cx - 320 - ruleW, 0, cx - 320, 0);
  ruleGradL.addColorStop(0, "transparent");
  ruleGradL.addColorStop(1, "#ffd700");
  ctx.strokeStyle = ruleGradL;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cx - 320 - ruleW, ruleY);
  ctx.lineTo(cx - 320, ruleY);
  ctx.stroke();

  const ruleGradR = ctx.createLinearGradient(cx + 320, 0, cx + 320 + ruleW, 0);
  ruleGradR.addColorStop(0, "#ffd700");
  ruleGradR.addColorStop(1, "transparent");
  ctx.strokeStyle = ruleGradR;
  ctx.beginPath();
  ctx.moveTo(cx + 320, ruleY);
  ctx.lineTo(cx + 320 + ruleW, ruleY);
  ctx.stroke();

  ctx.restore();

  return canvas;
}

export function CentralLedWall({ screenFadeProgress = 0, quality = "HIGH" }: CentralLedWallProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const logoImageRef = useRef<HTMLImageElement | null>(null);
  const animTimeRef = useRef(0);
  const lastDrawTimeRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Preload logo image
  useEffect(() => {
    if (typeof window === "undefined") return;
    const img = new Image();
    img.src = "/olympia/Olympia_logo_2016.webp";
    img.crossOrigin = "anonymous";
    img.onload = () => {
      logoImageRef.current = img;
      if (canvasRef.current) {
        updateCanvas(canvasRef.current, screenFadeProgress, 0);
      }
    };
  }, []);

  const updateCanvas = (canvas: HTMLCanvasElement, fade: number, time: number) => {
    const freshCanvas = createLedScreenCanvas(logoImageRef.current, fade, time);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(freshCanvas, 0, 0);
    }
    if (textureRef.current) {
      textureRef.current.needsUpdate = true;
    }
  };

  const canvas = useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = quality === "LIGHT" ? 1024 : 2048;
    c.height = quality === "LIGHT" ? 576 : 1152;
    return c;
  }, [quality]);

  const texture = useMemo(() => {
    if (!canvas) return null;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }, [canvas]);

  useEffect(() => {
    canvasRef.current = canvas;
    textureRef.current = texture;
  }, [canvas, texture]);

  // Initial draw
  useEffect(() => {
    if (canvas) {
      updateCanvas(canvas, screenFadeProgress, 0);
    }
  }, [canvas, screenFadeProgress]);

  // Dynamic animation updates (pulse & fade)
  useFrame((_, delta) => {
    animTimeRef.current += delta;
    // Throttle redrawing: redraw every 80ms for 12.5 FPS texture animation (saves GPU/CPU)
    if (animTimeRef.current - lastDrawTimeRef.current > 0.08) {
      lastDrawTimeRef.current = animTimeRef.current;
      if (canvasRef.current) {
        updateCanvas(canvasRef.current, screenFadeProgress, animTimeRef.current);
      }
    }
  });

  const screenW = 12.0;
  const screenH = 6.75; // 16:9 standard
  const frameThick = 0.28;

  // Emissive trim color based on fade
  const trimColor = useMemo(() => {
    const c = new THREE.Color("#00d4ff");
    c.lerp(new THREE.Color("#ff2a4b"), screenFadeProgress);
    return c;
  }, [screenFadeProgress]);

  return (
    <group position={[0, 4.25, -6.5]}>
      {/* ── 1. MAIN 16:9 LED DISPLAY PLANE ── */}
      <mesh ref={meshRef} position={[0, 0, 0.02]}>
        <planeGeometry args={[screenW, screenH]} />
        {texture ? (
          <meshBasicMaterial map={texture} toneMapped={false} />
        ) : (
          <meshStandardMaterial color="#020817" roughness={0.2} metalness={0.9} />
        )}
      </mesh>

      {/* ── 2. TITANIUM BEZEL & METALLIC HOUSING ── */}
      {/* Outer Titanium Bezel Frame */}
      <mesh position={[0, 0, -0.08]}>
        <boxGeometry args={[screenW + frameThick * 2, screenH + frameThick * 2, 0.24]} />
        <meshStandardMaterial
          color="#1e2430"
          metalness={0.88}
          roughness={0.22}
          envMapIntensity={1.4}
        />
      </mesh>

      {/* Inner Bezel Chamfer Trim */}
      <mesh position={[0, 0, -0.01]}>
        <boxGeometry args={[screenW + 0.06, screenH + 0.06, 0.08]} />
        <meshStandardMaterial color="#0b0e14" metalness={0.95} roughness={0.3} />
      </mesh>

      {/* ── 3. GOLD & COLOR-REACTIVE NEON EDGE ACCENTS ── */}
      {/* Top Edge Neon Strip */}
      <mesh position={[0, screenH / 2 + 0.04, 0.04]}>
        <boxGeometry args={[screenW + 0.2, 0.04, 0.04]} />
        <meshBasicMaterial color={trimColor} />
      </mesh>

      {/* Bottom Edge Gold Trim Strip */}
      <mesh position={[0, -screenH / 2 - 0.04, 0.04]}>
        <boxGeometry args={[screenW + 0.2, 0.04, 0.04]} />
        <meshStandardMaterial
          color="#ffd700"
          emissive="#ffd700"
          emissiveIntensity={0.8}
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>

      {/* Left Edge Neon Strip */}
      <mesh position={[-screenW / 2 - 0.04, 0, 0.04]}>
        <boxGeometry args={[0.04, screenH + 0.1, 0.04]} />
        <meshBasicMaterial color={trimColor} />
      </mesh>

      {/* Right Edge Neon Strip */}
      <mesh position={[screenW / 2 + 0.04, 0, 0.04]}>
        <boxGeometry args={[0.04, screenH + 0.1, 0.04]} />
        <meshBasicMaterial color={trimColor} />
      </mesh>

      {/* ── 4. MULTI-TIERED STAGE PEDESTAL / BASE RISERS ── */}
      {/* Tier 1: Top riser directly beneath screen */}
      <mesh position={[0, -screenH / 2 - 0.35, -0.05]}>
        <boxGeometry args={[screenW + 0.8, 0.45, 0.7]} />
        <meshStandardMaterial color="#0e1320" metalness={0.85} roughness={0.25} />
      </mesh>
      {/* Tier 1 Glowing Edge Strip */}
      <mesh position={[0, -screenH / 2 - 0.14, 0.31]}>
        <boxGeometry args={[screenW + 0.75, 0.03, 0.03]} />
        <meshBasicMaterial color={trimColor} />
      </mesh>

      {/* Tier 2: Mid riser */}
      <mesh position={[0, -screenH / 2 - 0.75, -0.1]}>
        <boxGeometry args={[screenW + 1.6, 0.4, 1.1]} />
        <meshStandardMaterial color="#080c16" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Tier 3: Bottom wide base riser (anchors to stage floor) */}
      <mesh position={[0, -screenH / 2 - 1.1, -0.15]}>
        <boxGeometry args={[screenW + 2.5, 0.35, 1.6]} />
        <meshStandardMaterial color="#050810" metalness={0.92} roughness={0.18} />
      </mesh>
      {/* Tier 3 Gold Base Trim */}
      <mesh position={[0, -screenH / 2 - 0.94, 0.66]}>
        <boxGeometry args={[screenW + 2.45, 0.03, 0.03]} />
        <meshStandardMaterial
          color="#ffd700"
          emissive="#ffb700"
          emissiveIntensity={0.6}
          metalness={0.92}
          roughness={0.15}
        />
      </mesh>
    </group>
  );
}
