"use client";

import React, { useRef, useEffect, useMemo } from "react";
import * as THREE from "three";

interface CentralLedWallProps {
  screenFadeProgress?: number; // 0.0 (Sapphire Blue) -> 1.0 (Fiery Red)
  quality?: "HIGH" | "MEDIUM" | "LIGHT";
}

/**
 * Creates a regular horizontal hexagon shape (flat top and bottom)
 * with an optional inner hollow cutout for extruded framing.
 */
function createHexagonShape(
  outerW: number,
  outerH: number,
  innerW?: number,
  innerH?: number
): THREE.Shape {
  const shape = new THREE.Shape();
  // Horizontal hexagon (flat top & bottom):
  // Vertices:
  // (-w/4, h/2) -> (w/4, h/2) -> (w/2, 0) -> (w/4, -h/2) -> (-w/4, -h/2) -> (-w/2, 0)
  shape.moveTo(-outerW / 4, outerH / 2);
  shape.lineTo(outerW / 4, outerH / 2);
  shape.lineTo(outerW / 2, 0);
  shape.lineTo(outerW / 4, -outerH / 2);
  shape.lineTo(-outerW / 4, -outerH / 2);
  shape.lineTo(-outerW / 2, 0);
  shape.closePath();

  if (innerW && innerH) {
    const hole = new THREE.Path();
    hole.moveTo(-innerW / 4, innerH / 2);
    hole.lineTo(innerW / 4, innerH / 2);
    hole.lineTo(innerW / 2, 0);
    hole.lineTo(innerW / 4, -innerH / 2);
    hole.lineTo(-innerW / 4, -innerH / 2);
    hole.lineTo(-innerW / 2, 0);
    hole.closePath();
    shape.holes.push(hole);
  }

  return shape;
}

/**
 * Creates glowing border tube vertices for a horizontal hexagon
 */
function createHexagonBorderPoints(w: number, h: number): THREE.Vector3[] {
  return [
    new THREE.Vector3(-w / 4, h / 2, 0),
    new THREE.Vector3(w / 4, h / 2, 0),
    new THREE.Vector3(w / 2, 0, 0),
    new THREE.Vector3(w / 4, -h / 2, 0),
    new THREE.Vector3(-w / 4, -h / 2, 0),
    new THREE.Vector3(-w / 2, 0, 0),
    new THREE.Vector3(-w / 4, h / 2, 0),
  ];
}

/**
 * Pre-rendered Central LED broadcast screen texture with the official
 * transparent Olympia 2016 logo and yellow light-to-dark gradient typography.
 * Rendered ONCE or strictly when fadeProgress changes to avoid CPU lag.
 */
function renderLedScreenToCanvas(
  targetCanvas: HTMLCanvasElement,
  logoImg: HTMLImageElement | null,
  fadeProgress: number = 0
): void {
  const width = targetCanvas.width;
  const height = targetCanvas.height;
  const ctx = targetCanvas.getContext("2d");
  if (!ctx) return;

  const cx = width / 2;
  const cy = height / 2;

  // 1. Deep Broadcast Cosmic Gradient
  const bgGrad = ctx.createRadialGradient(cx, cy * 0.9, 80, cx, cy, width * 0.72);
  const r1 = Math.round(THREE.MathUtils.lerp(8, 75, fadeProgress));
  const g1 = Math.round(THREE.MathUtils.lerp(28, 8, fadeProgress));
  const b1 = Math.round(THREE.MathUtils.lerp(75, 18, fadeProgress));

  const r0 = Math.round(THREE.MathUtils.lerp(3, 22, fadeProgress));
  const g0 = Math.round(THREE.MathUtils.lerp(7, 3, fadeProgress));
  const b0 = Math.round(THREE.MathUtils.lerp(22, 7, fadeProgress));

  bgGrad.addColorStop(0, `rgb(${r1}, ${g1}, ${b1})`);
  bgGrad.addColorStop(0.65, `rgb(${r0}, ${g0}, ${b0})`);
  bgGrad.addColorStop(1, "#010206");

  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Cosmic Stardust Particles
  ctx.fillStyle = "#ffffff";
  const numStars = 140;
  for (let i = 0; i < numStars; i++) {
    const sx = (Math.sin(i * 997.1) * 0.5 + 0.5) * width;
    const sy = (Math.cos(i * 443.7) * 0.5 + 0.5) * height;
    const size = (i % 3) * 0.7 + 0.8;
    const alpha = (Math.sin(i * 12.3) * 0.35 + 0.55);
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(sx, sy, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  // 3. Central Hexagonal Grid Lines
  ctx.save();
  ctx.lineWidth = 1.5;
  const hexRadius = 42;
  const hexW = Math.sqrt(3) * hexRadius;
  const hexH = 2 * hexRadius;

  ctx.strokeStyle = fadeProgress > 0.5
    ? `rgba(255, 60, 80, 0.08)`
    : `rgba(0, 210, 255, 0.08)`;

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

  // 4. Official Olympia 2016 Logo (Transparent WebP)
  const logoTargetH = height * 0.46;
  const logoTargetY = height * 0.12;

  if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
    const aspect = logoImg.naturalWidth / logoImg.naturalHeight;
    const logoW = logoTargetH * aspect;
    const logoX = cx - logoW / 2;

    ctx.save();
    ctx.shadowColor = fadeProgress > 0.5 ? "rgba(255, 40, 70, 0.65)" : "rgba(0, 210, 255, 0.55)";
    ctx.shadowBlur = 35;
    ctx.drawImage(logoImg, logoX, logoTargetY, logoW, logoTargetH);
    ctx.restore();
  } else {
    ctx.save();
    ctx.font = '900 96px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffd700";
    ctx.shadowColor = "#ffb700";
    ctx.shadowBlur = 25;
    ctx.fillText("OLYMPIA", cx, logoTargetY + 220);
    ctx.restore();
  }

  // 5. Yellow Light-To-Dark Gradient Typography: "ĐƯỜNG LÊN ĐỈNH OLYMPIA"
  const textY = logoTargetY + logoTargetH + height * 0.16;
  const textStr = "ĐƯỜNG LÊN ĐỈNH OLYMPIA";

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const fontSize = Math.round(width * 0.048);
  ctx.font = `900 ${fontSize}px "Plus Jakarta Sans", "Montserrat", "Arial Black", sans-serif`;
  ctx.letterSpacing = "0.08em";

  const textGrad = ctx.createLinearGradient(0, textY - fontSize * 0.6, 0, textY + fontSize * 0.6);
  textGrad.addColorStop(0.0, "#ffffff");
  textGrad.addColorStop(0.2, "#fffbd0");
  textGrad.addColorStop(0.5, "#ffd700");
  textGrad.addColorStop(0.85, "#b45309");
  textGrad.addColorStop(1.0, "#78350f");

  // Outer dark drop shadow
  ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;
  ctx.lineWidth = 10;
  ctx.strokeStyle = "#1e1302";
  ctx.strokeText(textStr, cx, textY);

  // Soft golden halo
  ctx.shadowColor = "rgba(255, 215, 0, 0.7)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 2;

  // Inner metallic stroke
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = "#fffed4";
  ctx.strokeText(textStr, cx, textY);

  // Gradient Fill
  ctx.fillStyle = textGrad;
  ctx.fillText(textStr, cx, textY);

  // Subtitle
  ctx.shadowBlur = 0;
  ctx.font = `800 ${Math.round(fontSize * 0.32)}px "Plus Jakarta Sans", sans-serif`;
  ctx.letterSpacing = "0.45em";
  ctx.fillStyle = fadeProgress > 0.5 ? "rgba(255, 190, 200, 0.85)" : "rgba(180, 235, 255, 0.85)";
  ctx.fillText("VTV3 BROADCAST STUDIO S14", cx, textY + fontSize * 0.75);

  ctx.restore();
}

/**
 * Pre-rendered Math & Science Symbols Wall Texture (Stage Left)
 */
function createMathWallCanvas(fadeProgress: number = 0): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 768;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // Background dark cyber blue/red
  const r = Math.round(THREE.MathUtils.lerp(6, 45, fadeProgress));
  const g = Math.round(THREE.MathUtils.lerp(18, 5, fadeProgress));
  const b = Math.round(THREE.MathUtils.lerp(48, 12, fadeProgress));
  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  ctx.fillRect(0, 0, 1024, 768);

  // Diagonal tech grid lines
  ctx.strokeStyle = fadeProgress > 0.5 ? "rgba(255, 60, 80, 0.15)" : "rgba(0, 210, 255, 0.15)";
  ctx.lineWidth = 2;
  for (let i = -768; i < 1024 + 768; i += 60) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 768, 768);
    ctx.stroke();
  }

  // Iconic Science & Math Formula Symbols (from real VTV3 photos):
  // ∑, kg, µ, m², Δ, sin, cos, Ω, π, ∫, tan, λ, θ, f(x), lim, ∞
  const symbols = [
    { text: "∑", x: 120, y: 150, size: 72 },
    { text: "kg", x: 260, y: 140, size: 48 },
    { text: "µ", x: 400, y: 150, size: 54 },
    { text: "m²", x: 550, y: 140, size: 48 },
    { text: "Δ", x: 720, y: 150, size: 68 },
    { text: "Ω", x: 880, y: 150, size: 64 },

    { text: "sin", x: 160, y: 340, size: 46 },
    { text: "cos", x: 320, y: 340, size: 46 },
    { text: "π", x: 480, y: 350, size: 64 },
    { text: "∫", x: 620, y: 360, size: 78 },
    { text: "tan", x: 770, y: 340, size: 46 },
    { text: "λ", x: 900, y: 350, size: 56 },

    { text: "E=mc²", x: 200, y: 540, size: 48 },
    { text: "lim", x: 380, y: 530, size: 46 },
    { text: "θ", x: 530, y: 540, size: 54 },
    { text: "f(x)", x: 680, y: 540, size: 48 },
    { text: "∞", x: 840, y: 540, size: 62 },
  ];

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  symbols.forEach((s) => {
    ctx.save();
    ctx.font = `900 ${s.size}px "Plus Jakarta Sans", "Georgia", serif`;
    ctx.letterSpacing = "0.05em";

    // Glow
    ctx.shadowColor = fadeProgress > 0.5 ? "#ff2a4b" : "#00d4ff";
    ctx.shadowBlur = 22;
    ctx.fillStyle = fadeProgress > 0.5 ? "#ffffff" : "#e0f7ff";
    ctx.fillText(s.text, s.x, s.y);
    ctx.restore();
  });

  return canvas;
}

/**
 * Single Extruded Hexagon Frame with Glowing Neon Rim
 */
function HexagonPortalFrame({
  outerW,
  outerH,
  innerW,
  innerH,
  zPos,
  neonColor,
  depth = 0.35,
}: {
  outerW: number;
  outerH: number;
  innerW: number;
  innerH: number;
  zPos: number;
  neonColor: THREE.Color;
  depth?: number;
}) {
  const shape = useMemo(
    () => createHexagonShape(outerW, outerH, innerW, innerH),
    [outerW, outerH, innerW, innerH]
  );

  const geometry = useMemo(
    () =>
      new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.04,
        bevelThickness: 0.04,
      }),
    [shape, depth]
  );

  // Border line points for neon tube outline
  const outerBorderPoints = useMemo(
    () => createHexagonBorderPoints(outerW, outerH),
    [outerW, outerH]
  );

  const innerBorderPoints = useMemo(
    () => createHexagonBorderPoints(innerW, innerH),
    [innerW, innerH]
  );

  const outerLineMesh = useMemo(() => {
    const geom = new THREE.BufferGeometry().setFromPoints(outerBorderPoints);
    const mat = new THREE.LineBasicMaterial({ color: neonColor, linewidth: 3 });
    const line = new THREE.Line(geom, mat);
    line.position.set(0, 0, depth + 0.05);
    return line;
  }, [outerBorderPoints, depth, neonColor]);

  const innerLineMesh = useMemo(() => {
    const geom = new THREE.BufferGeometry().setFromPoints(innerBorderPoints);
    const mat = new THREE.LineBasicMaterial({ color: neonColor, linewidth: 2 });
    const line = new THREE.Line(geom, mat);
    line.position.set(0, 0, depth + 0.05);
    return line;
  }, [innerBorderPoints, depth, neonColor]);

  return (
    <group position={[0, 3.6, zPos]}>
      {/* 3D Extruded Metallic Frame Body */}
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color="#0f172a"
          metalness={0.92}
          roughness={0.2}
          envMapIntensity={1.4}
        />
      </mesh>

      {/* Front Glowing Outer Hex Neon Rim */}
      <primitive object={outerLineMesh} />

      {/* Front Glowing Inner Hex Neon Rim */}
      <primitive object={innerLineMesh} />
    </group>
  );
}

/**
 * Central Studio Set:
 * 1. 4-tier Hexagonal Infinity Tunnel Portal (Real 3D Extruded Geometry)
 * 2. High-res Central LED Display with Logo & Gold Gradient Typography
 * 3. Left Wing: Math & Science Symbols Wall (∑, π, ∫, Δ...)
 * 4. Right Wing: Secondary Broadcast LED Screen & Side Tower
 */
export function CentralLedWall({
  screenFadeProgress = 0,
  quality = "HIGH",
}: CentralLedWallProps) {
  const logoImageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const lastFadeRef = useRef<number>(-1);

  // Preload logo image
  useEffect(() => {
    if (typeof window === "undefined") return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = `${window.location.origin}/olympia/Olympia_logo_2016.webp`;
    img.onload = () => {
      logoImageRef.current = img;
      if (canvasRef.current && textureRef.current) {
        renderLedScreenToCanvas(canvasRef.current, img, screenFadeProgress);
        textureRef.current.needsUpdate = true;
      }
    };
    img.onerror = () => {
      const fallback = new Image();
      fallback.crossOrigin = "anonymous";
      fallback.src = "/olympia/Olympia_logo_2016.webp";
      fallback.onload = () => {
        logoImageRef.current = fallback;
        if (canvasRef.current && textureRef.current) {
          renderLedScreenToCanvas(canvasRef.current, fallback, screenFadeProgress);
          textureRef.current.needsUpdate = true;
        }
      };
    };
  }, []);

  // Pre-allocated static canvas for Central LED
  const canvas = useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = quality === "LIGHT" ? 1024 : 1920;
    c.height = quality === "LIGHT" ? 576 : 1080;
    renderLedScreenToCanvas(c, logoImageRef.current, screenFadeProgress);
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

  // Update canvas only when screenFadeProgress changes meaningfully (> 0.04)
  useEffect(() => {
    if (!canvasRef.current || !textureRef.current) return;
    if (Math.abs(screenFadeProgress - lastFadeRef.current) > 0.04) {
      lastFadeRef.current = screenFadeProgress;
      renderLedScreenToCanvas(canvasRef.current, logoImageRef.current, screenFadeProgress);
      textureRef.current.needsUpdate = true;
    }
  }, [screenFadeProgress]);

  // Dynamic Neon Color (Cyan -> Red)
  const neonColor = useMemo(() => {
    const c = new THREE.Color("#00e5ff");
    c.lerp(new THREE.Color("#ff1a40"), screenFadeProgress);
    return c;
  }, [screenFadeProgress]);

  // Math Wall Canvas & Texture (Stage Left)
  const mathWallCanvas = useMemo(() => {
    if (typeof document === "undefined") return null;
    return createMathWallCanvas(screenFadeProgress);
  }, [screenFadeProgress]);

  const mathWallTexture = useMemo(() => {
    if (!mathWallCanvas) return null;
    const tex = new THREE.CanvasTexture(mathWallCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [mathWallCanvas]);

  return (
    <group>
      {/* ── 1. 4-TIER HEXAGONAL INFINITY TUNNEL PORTAL ── */}
      {/* Layer 1 (Outermost Arch) */}
      <HexagonPortalFrame
        outerW={10.8}
        outerH={7.2}
        innerW={9.4}
        innerH={6.2}
        zPos={-4.6}
        neonColor={neonColor}
        depth={0.36}
      />

      {/* Layer 2 (Second Inward Arch) */}
      <HexagonPortalFrame
        outerW={9.4}
        outerH={6.4}
        innerW={8.0}
        innerH={5.4}
        zPos={-5.1}
        neonColor={neonColor}
        depth={0.34}
      />

      {/* Layer 3 (Third Inward Arch) */}
      <HexagonPortalFrame
        outerW={8.0}
        outerH={5.4}
        innerW={6.6}
        innerH={4.4}
        zPos={-5.6}
        neonColor={neonColor}
        depth={0.32}
      />

      {/* Layer 4 (Innermost Core Arch) */}
      <HexagonPortalFrame
        outerW={6.6}
        outerH={4.4}
        innerW={5.4}
        innerH={3.5}
        zPos={-6.1}
        neonColor={neonColor}
        depth={0.30}
      />

      {/* ── 2. CENTRAL BROADCAST LED BACKDROP DISPLAY ── */}
      <group position={[0, 3.8, -6.45]}>
        <mesh>
          <planeGeometry args={[7.2, 4.3]} />
          {texture ? (
            <meshBasicMaterial map={texture} toneMapped={false} />
          ) : (
            <meshStandardMaterial color="#020817" roughness={0.2} metalness={0.9} />
          )}
        </mesh>
        {/* LED Bezel Frame */}
        <mesh position={[0, 0, -0.06]}>
          <boxGeometry args={[7.4, 4.5, 0.12]} />
          <meshStandardMaterial color="#0b0f19" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* ── 3. STAGE LEFT: MATH & SCIENCE SYMBOLS WALL ── */}
      <group position={[-5.6, 3.5, -3.8]} rotation={[0, 0.42, 0]}>
        {/* Backing Structure */}
        <mesh position={[0, 0, -0.08]}>
          <boxGeometry args={[4.8, 3.4, 0.16]} />
          <meshStandardMaterial color="#090d18" metalness={0.9} roughness={0.25} />
        </mesh>
        {/* Illuminated Math Display Plane */}
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[4.7, 3.3]} />
          {mathWallTexture ? (
            <meshBasicMaterial map={mathWallTexture} toneMapped={false} />
          ) : (
            <meshStandardMaterial color="#040b1a" roughness={0.3} metalness={0.8} />
          )}
        </mesh>
        {/* Glowing Outer Neon Frame Trim */}
        <mesh position={[0, 1.7, 0.04]}>
          <boxGeometry args={[4.8, 0.04, 0.04]} />
          <meshBasicMaterial color={neonColor} />
        </mesh>
        <mesh position={[0, -1.7, 0.04]}>
          <boxGeometry args={[4.8, 0.04, 0.04]} />
          <meshBasicMaterial color={neonColor} />
        </mesh>
        <mesh position={[-2.4, 0, 0.04]}>
          <boxGeometry args={[0.04, 3.4, 0.04]} />
          <meshBasicMaterial color={neonColor} />
        </mesh>
        <mesh position={[2.4, 0, 0.04]}>
          <boxGeometry args={[0.04, 3.4, 0.04]} />
          <meshBasicMaterial color={neonColor} />
        </mesh>
      </group>

      {/* ── 4. STAGE RIGHT: SECONDARY SCREEN & TOWER ── */}
      <group position={[5.6, 4.2, -3.8]} rotation={[0, -0.42, 0]}>
        {/* Secondary Display Screen */}
        <mesh position={[0, 0, -0.06]}>
          <boxGeometry args={[3.6, 2.3, 0.14]} />
          <meshStandardMaterial color="#090d18" metalness={0.9} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[3.5, 2.2]} />
          {texture ? (
            <meshBasicMaterial map={texture} toneMapped={false} />
          ) : (
            <meshStandardMaterial color="#040b1a" roughness={0.3} metalness={0.8} />
          )}
        </mesh>
        {/* Glowing Double Frame */}
        <mesh position={[0, 1.15, 0.04]}>
          <boxGeometry args={[3.6, 0.04, 0.04]} />
          <meshBasicMaterial color={neonColor} />
        </mesh>
        <mesh position={[0, -1.15, 0.04]}>
          <boxGeometry args={[3.6, 0.04, 0.04]} />
          <meshBasicMaterial color={neonColor} />
        </mesh>
      </group>
    </group>
  );
}
