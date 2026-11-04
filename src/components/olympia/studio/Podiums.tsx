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
  isEntrancePhase: boolean = false
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

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

  const canvas = useMemo(() => {
    if (typeof document === "undefined") return null;
    return createPodiumScoreCanvas(name, score, seatId, isBuzzed, isRed, school, isEntrancePhase);
  }, [name, score, seatId, isBuzzed, isRed, school, isEntrancePhase]);

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
      const fresh = createPodiumScoreCanvas(name, score, seatId, isBuzzed, isRed, school, isEntrancePhase);
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(fresh, 0, 0);
      }
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

const CONTESTANT_STYLES: ContestantStyleConfig[] = [
  // Seat 0 (TS 1 / Cam 5): Nữ sinh thanh lịch đeo kính (giống Ảnh 2), da trắng hồng ấm #f3ceb3, tóc buộc thanh tú
  { gender: "female", skinTone: "#f3ceb3", hairColor: "#171412", hairStyle: "ponytail", hasGlasses: true, glassesColor: "#334155" },
  // Seat 1 (TS 2 / Cam 6): Nam sinh tóc gọn gàng năng động (giống Ảnh 3), da vàng ấm tự nhiên #e8be99
  { gender: "male", skinTone: "#e8be99", hairColor: "#1a1614", hairStyle: "side_part", hasGlasses: false },
  // Seat 2 (TS 3 / Cam 7): Nữ sinh tóc ngắn cá tính thanh thoát, da vàng sáng tự nhiên #dfb088
  { gender: "female", skinTone: "#dfb088", hairColor: "#1f1a16", hairStyle: "stylish_bob", hasGlasses: false },
  // Seat 3 (TS 4 / Cam 8): Nam sinh thư sinh đeo kính trí thức, da mật ong ấm #d9a67a
  { gender: "male", skinTone: "#d9a67a", hairColor: "#181412", hairStyle: "textured_crop", hasGlasses: true, glassesColor: "#1e293b" },
  // Seat 4 (TS 5 / Cam 11): Nữ sinh tóc mái thưa buông nhẹ, da trắng hồng ấm #f3ceb3
  { gender: "female", skinTone: "#f3ceb3", hairColor: "#201a15", hairStyle: "layered_fringe", hasGlasses: false },
  // Seat 5 (TS 6 / Cam 12): Nam sinh tóc cắt gọn gàng, da ấm tự nhiên #cfa075
  { gender: "male", skinTone: "#cfa075", hairColor: "#171412", hairStyle: "neat_fade", hasGlasses: false },
  // Seat 6 (TS 7 / Cam 13): Nữ sinh đeo kính gọng mảnh thanh lịch, tóc gợn sóng nhẹ, da ấm #e8be99
  { gender: "female", skinTone: "#e8be99", hairColor: "#1c1815", hairStyle: "wavy_volume", hasGlasses: true, glassesColor: "#475569" },
  // Seat 7 (TS 8 / Cam 14): Nam sinh phong thái tự tin, da vàng ấm #dfb088
  { gender: "male", skinTone: "#dfb088", hairColor: "#191512", hairStyle: "undercut", hasGlasses: false },
];

function ContestantFigure({ seatId }: { seatId: number }) {
  const style = CONTESTANT_STYLES[seatId % CONTESTANT_STYLES.length];
  const chestRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);

  // Micro-breathing & natural student idle posture via useFrame
  useFrame(({ clock }) => {
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

  const shirtColor = "#f8fafc";
  const collarColor = "#ffffff";
  const placketColor = "#f1f5f9";
  const trouserColor = "#0f172a";

  return (
    <group position={[0, 0, -0.42]}>
      {/* ── LOWER BODY & TROUSERS ── */}
      <mesh position={[-0.068, 0.48, 0]}>
        <cylinderGeometry args={[0.040, 0.034, 0.76, 16]} />
        <meshStandardMaterial color={trouserColor} roughness={0.8} />
      </mesh>
      <mesh position={[0.068, 0.48, 0]}>
        <cylinderGeometry args={[0.040, 0.034, 0.76, 16]} />
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

      {/* ── UPPER BODY (Breathing Chest & Slender Vietnamese Student Polo) ── */}
      <group ref={chestRef}>
        {/* Waist & Mid-torso (Slender Vietnamese student silhouette, 0.22m) */}
        <mesh position={[0, 1.08, 0]}>
          <boxGeometry args={[0.22, 0.20, 0.14]} />
          <meshStandardMaterial color={shirtColor} roughness={0.4} />
        </mesh>

        {/* Upper Chest (Slender 0.28m, down from bulky 0.36m) */}
        <mesh position={[0, 1.28, 0]}>
          <boxGeometry args={[0.28, 0.22, 0.16]} />
          <meshStandardMaterial color={shirtColor} roughness={0.4} />
        </mesh>
        {/* Clavicle / Shoulder Slope Form (Compact 0.26m width) */}
        <mesh position={[0, 1.39, 0]}>
          <boxGeometry args={[0.26, 0.07, 0.15]} />
          <meshStandardMaterial color={shirtColor} roughness={0.4} />
        </mesh>

        {/* ── 3D FOLDED POLO COLLAR & PLACKET ── */}
        {/* Left Lapel (Angled 3D Fold) */}
        <mesh position={[-0.052, 1.43, 0.075]} rotation={[0.28, -0.15, -0.22]}>
          <boxGeometry args={[0.065, 0.040, 0.010]} />
          <meshStandardMaterial color={collarColor} roughness={0.3} />
        </mesh>
        {/* Right Lapel (Angled 3D Fold) */}
        <mesh position={[0.052, 1.43, 0.075]} rotation={[0.28, 0.15, 0.22]}>
          <boxGeometry args={[0.065, 0.040, 0.010]} />
          <meshStandardMaterial color={collarColor} roughness={0.3} />
        </mesh>
        {/* Collar Back Band */}
        <mesh position={[0, 1.455, -0.04]} rotation={[-0.15, 0, 0]}>
          <boxGeometry args={[0.13, 0.032, 0.016]} />
          <meshStandardMaterial color={collarColor} roughness={0.3} />
        </mesh>
        {/* Front Central Placket */}
        <mesh position={[0, 1.34, 0.082]}>
          <boxGeometry args={[0.026, 0.11, 0.007]} />
          <meshStandardMaterial color={placketColor} roughness={0.3} />
        </mesh>
        {/* Pearl Buttons */}
        <mesh position={[0, 1.37, 0.087]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.0035, 0.0035, 0.004, 10]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.4} />
        </mesh>
        <mesh position={[0, 1.32, 0.087]} rotation={[Math.PI / 2, 0, 0]}>
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

        {/* ── SHORT SLEEVES & CUFFS (Snug fitting student biceps) ── */}
        {/* Left Sleeve */}
        <mesh position={[-0.15, 1.31, 0.02]} rotation={[0.15, 0, -0.16]}>
          <cylinderGeometry args={[0.040, 0.036, 0.13, 14]} />
          <meshStandardMaterial color={shirtColor} roughness={0.4} />
        </mesh>
        {/* Left Sleeve Cuff Fold */}
        <mesh position={[-0.16, 1.24, 0.03]} rotation={[0.15, 0, -0.16]}>
          <cylinderGeometry args={[0.042, 0.042, 0.022, 14]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>

        {/* Right Sleeve */}
        <mesh position={[0.15, 1.31, 0.02]} rotation={[0.15, 0, 0.16]}>
          <cylinderGeometry args={[0.040, 0.036, 0.13, 14]} />
          <meshStandardMaterial color={shirtColor} roughness={0.4} />
        </mesh>
        {/* Right Sleeve Cuff Fold */}
        <mesh position={[0.16, 1.24, 0.03]} rotation={[0.15, 0, 0.16]}>
          <cylinderGeometry args={[0.042, 0.042, 0.022, 14]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>

        {/* ── ARMS & HANDS (Naturally placed on podium desk next to buzzer) ── */}
        {/* Left Forearm */}
        <mesh position={[-0.15, 1.10, 0.12]} rotation={[0.75, -0.15, -0.10]}>
          <cylinderGeometry args={[0.028, 0.024, 0.22, 12]} />
          <meshStandardMaterial color={style.skinTone} roughness={0.6} />
        </mesh>
        {/* Left Hand */}
        <mesh position={[-0.13, 1.00, 0.22]} rotation={[0.1, -0.15, 0]}>
          <boxGeometry args={[0.042, 0.018, 0.055]} />
          <meshStandardMaterial color={style.skinTone} roughness={0.6} />
        </mesh>

        {/* Right Forearm */}
        <mesh position={[0.15, 1.10, 0.12]} rotation={[0.75, 0.15, 0.10]}>
          <cylinderGeometry args={[0.028, 0.024, 0.22, 12]} />
          <meshStandardMaterial color={style.skinTone} roughness={0.6} />
        </mesh>
        {/* Right Hand */}
        <mesh position={[0.13, 1.00, 0.22]} rotation={[0.1, 0.15, 0]}>
          <boxGeometry args={[0.042, 0.018, 0.055]} />
          <meshStandardMaterial color={style.skinTone} roughness={0.6} />
        </mesh>
      </group>

      {/* ── HEAD & SLENDER NECK ── */}
      <group ref={headRef}>
        {/* Slender Neck (radius 0.032m) */}
        <mesh position={[0, 1.47, 0.015]}>
          <cylinderGeometry args={[0.032, 0.038, 0.09, 16]} />
          <meshStandardMaterial color={style.skinTone} roughness={0.6} />
        </mesh>

        {/* Head Cranial Vault */}
        <mesh position={[0, 1.58, 0.01]}>
          <sphereGeometry args={[0.076, 22, 22]} />
          <meshStandardMaterial color={style.skinTone} roughness={0.55} />
        </mesh>
        {/* Sculpted Jaw & Chin Definition */}
        <mesh position={[0, 1.52, 0.035]} rotation={[0.25, 0, 0]}>
          <boxGeometry args={[0.068, 0.058, 0.068]} />
          <meshStandardMaterial color={style.skinTone} roughness={0.55} />
        </mesh>
        <mesh position={[0, 1.495, 0.055]}>
          <sphereGeometry args={[0.018, 12, 12]} />
          <meshStandardMaterial color={style.skinTone} roughness={0.55} />
        </mesh>

        {/* Left & Right Ears */}
        <mesh position={[-0.078, 1.56, 0.005]}>
          <boxGeometry args={[0.010, 0.028, 0.018]} />
          <meshStandardMaterial color={style.skinTone} roughness={0.6} />
        </mesh>
        <mesh position={[0.078, 1.56, 0.005]}>
          <boxGeometry args={[0.010, 0.028, 0.018]} />
          <meshStandardMaterial color={style.skinTone} roughness={0.6} />
        </mesh>

        {/* Eyes (Focused, alert student look) */}
        <mesh position={[-0.026, 1.56, 0.075]}>
          <sphereGeometry args={[0.007, 12, 12]} />
          <meshStandardMaterial color="#0f172a" roughness={0.2} />
        </mesh>
        <mesh position={[0.026, 1.56, 0.075]}>
          <sphereGeometry args={[0.007, 12, 12]} />
          <meshStandardMaterial color="#0f172a" roughness={0.2} />
        </mesh>
        {/* Eyebrows */}
        <mesh position={[-0.026, 1.585, 0.077]} rotation={[0, 0, 0.08]}>
          <boxGeometry args={[0.024, 0.004, 0.005]} />
          <meshStandardMaterial color={style.hairColor} roughness={0.8} />
        </mesh>
        <mesh position={[0.026, 1.585, 0.077]} rotation={[0, 0, -0.08]}>
          <boxGeometry args={[0.024, 0.004, 0.005]} />
          <meshStandardMaterial color={style.hairColor} roughness={0.8} />
        </mesh>
        {/* Confident Smile */}
        <mesh position={[0, 1.515, 0.073]}>
          <boxGeometry args={[0.022, 0.005, 0.005]} />
          <meshStandardMaterial color="#9f1239" roughness={0.4} />
        </mesh>

        {/* Student Glasses (For seats with hasGlasses) */}
        {style.hasGlasses && (
          <group position={[0, 1.56, 0.080]}>
            {/* Left Frame */}
            <mesh position={[-0.026, 0, 0]}>
              <boxGeometry args={[0.028, 0.020, 0.004]} />
              <meshStandardMaterial color={style.glassesColor || "#1e293b"} metalness={0.7} roughness={0.2} />
            </mesh>
            {/* Right Frame */}
            <mesh position={[0.026, 0, 0]}>
              <boxGeometry args={[0.028, 0.020, 0.004]} />
              <meshStandardMaterial color={style.glassesColor || "#1e293b"} metalness={0.7} roughness={0.2} />
            </mesh>
            {/* Nose Bridge */}
            <mesh position={[0, 0.003, 0]}>
              <boxGeometry args={[0.012, 0.003, 0.003]} />
              <meshStandardMaterial color={style.glassesColor || "#1e293b"} metalness={0.7} roughness={0.2} />
            </mesh>
            {/* Temple arms */}
            <mesh position={[-0.046, 0, -0.04]} rotation={[0, 0.15, 0]}>
              <boxGeometry args={[0.003, 0.003, 0.07]} />
              <meshStandardMaterial color={style.glassesColor || "#1e293b"} metalness={0.7} roughness={0.2} />
            </mesh>
            <mesh position={[0.046, 0, -0.04]} rotation={[0, -0.15, 0]}>
              <boxGeometry args={[0.003, 0.003, 0.07]} />
              <meshStandardMaterial color={style.glassesColor || "#1e293b"} metalness={0.7} roughness={0.2} />
            </mesh>
          </group>
        )}

        {/* ── DIVERSE VIETNAMESE STUDENT HAIRSTYLES ── */}
        {/* Hair Cap Base */}
        <mesh position={[0, 1.615, -0.015]}>
          <sphereGeometry args={[0.080, 20, 20]} />
          <meshStandardMaterial color={style.hairColor} roughness={0.7} />
        </mesh>

        {/* Ponytail: Nữ sinh thanh lịch đeo kính (Ảnh 2) */}
        {style.hairStyle === "ponytail" && (
          <group>
            {/* Front soft bangs */}
            <mesh position={[0, 1.64, 0.05]}>
              <boxGeometry args={[0.09, 0.025, 0.04]} />
              <meshStandardMaterial color={style.hairColor} roughness={0.7} />
            </mesh>
            {/* Soft hair strands framing cheeks */}
            <mesh position={[-0.068, 1.53, 0.02]}>
              <boxGeometry args={[0.020, 0.12, 0.06]} />
              <meshStandardMaterial color={style.hairColor} roughness={0.7} />
            </mesh>
            <mesh position={[0.068, 1.53, 0.02]}>
              <boxGeometry args={[0.020, 0.12, 0.06]} />
              <meshStandardMaterial color={style.hairColor} roughness={0.7} />
            </mesh>
            {/* Ponytail tie knot */}
            <mesh position={[0, 1.60, -0.08]}>
              <sphereGeometry args={[0.025, 12, 12]} />
              <meshStandardMaterial color="#1e293b" roughness={0.5} />
            </mesh>
            {/* Ponytail hair cascade */}
            <mesh position={[0, 1.50, -0.10]} rotation={[0.15, 0, 0]}>
              <cylinderGeometry args={[0.028, 0.018, 0.18, 12]} />
              <meshStandardMaterial color={style.hairColor} roughness={0.7} />
            </mesh>
          </group>
        )}

        {/* Side Part: Nam sinh gọn gàng năng động (Ảnh 3) */}
        {style.hairStyle === "side_part" && (
          <group>
            <mesh position={[-0.02, 1.65, 0.03]} rotation={[0.1, -0.1, -0.15]}>
              <boxGeometry args={[0.09, 0.030, 0.07]} />
              <meshStandardMaterial color={style.hairColor} roughness={0.7} />
            </mesh>
            <mesh position={[0.04, 1.63, 0.03]} rotation={[0.1, 0.1, 0.35]}>
              <boxGeometry args={[0.05, 0.022, 0.06]} />
              <meshStandardMaterial color={style.hairColor} roughness={0.7} />
            </mesh>
          </group>
        )}

        {/* Textured Crop: Nam sinh */}
        {style.hairStyle === "textured_crop" && (
          <group>
            <mesh position={[0, 1.66, 0.02]}>
              <boxGeometry args={[0.095, 0.035, 0.08]} />
              <meshStandardMaterial color={style.hairColor} roughness={0.7} />
            </mesh>
            <mesh position={[0, 1.63, 0.05]}>
              <boxGeometry args={[0.08, 0.022, 0.035]} />
              <meshStandardMaterial color={style.hairColor} roughness={0.7} />
            </mesh>
          </group>
        )}

        {/* Stylish Bob: Nữ sinh tóc ngắn cá tính */}
        {style.hairStyle === "stylish_bob" && (
          <group>
            <mesh position={[0, 1.64, 0.05]}>
              <boxGeometry args={[0.095, 0.025, 0.04]} />
              <meshStandardMaterial color={style.hairColor} roughness={0.7} />
            </mesh>
            <mesh position={[-0.068, 1.52, 0.02]}>
              <boxGeometry args={[0.025, 0.14, 0.07]} />
              <meshStandardMaterial color={style.hairColor} roughness={0.7} />
            </mesh>
            <mesh position={[0.068, 1.52, 0.02]}>
              <boxGeometry args={[0.025, 0.14, 0.07]} />
              <meshStandardMaterial color={style.hairColor} roughness={0.7} />
            </mesh>
            <mesh position={[0, 1.52, -0.06]}>
              <boxGeometry args={[0.11, 0.14, 0.04]} />
              <meshStandardMaterial color={style.hairColor} roughness={0.7} />
            </mesh>
          </group>
        )}

        {/* Layered Fringe: Nữ sinh mái thưa */}
        {style.hairStyle === "layered_fringe" && (
          <group>
            <mesh position={[0, 1.64, 0.045]}>
              <boxGeometry args={[0.095, 0.025, 0.035]} />
              <meshStandardMaterial color={style.hairColor} roughness={0.7} />
            </mesh>
            <mesh position={[-0.065, 1.54, 0.02]}>
              <boxGeometry args={[0.025, 0.12, 0.06]} />
              <meshStandardMaterial color={style.hairColor} roughness={0.7} />
            </mesh>
            <mesh position={[0.065, 1.54, 0.02]}>
              <boxGeometry args={[0.025, 0.12, 0.06]} />
              <meshStandardMaterial color={style.hairColor} roughness={0.7} />
            </mesh>
          </group>
        )}

        {/* Neat Fade: Nam sinh */}
        {style.hairStyle === "neat_fade" && (
          <group>
            <mesh position={[0, 1.65, 0.01]}>
              <boxGeometry args={[0.09, 0.025, 0.08]} />
              <meshStandardMaterial color={style.hairColor} roughness={0.7} />
            </mesh>
          </group>
        )}

        {/* Wavy Volume: Nữ sinh tóc gợn sóng */}
        {style.hairStyle === "wavy_volume" && (
          <group>
            <mesh position={[0, 1.66, 0.01]} rotation={[-0.05, 0, 0]}>
              <boxGeometry args={[0.11, 0.04, 0.09]} />
              <meshStandardMaterial color={style.hairColor} roughness={0.7} />
            </mesh>
            <mesh position={[-0.065, 1.54, 0.02]}>
              <boxGeometry args={[0.03, 0.13, 0.06]} />
              <meshStandardMaterial color={style.hairColor} roughness={0.7} />
            </mesh>
            <mesh position={[0.065, 1.54, 0.02]}>
              <boxGeometry args={[0.03, 0.13, 0.06]} />
              <meshStandardMaterial color={style.hairColor} roughness={0.7} />
            </mesh>
          </group>
        )}

        {/* Undercut: Nam sinh */}
        {style.hairStyle === "undercut" && (
          <group>
            <mesh position={[0, 1.66, 0.025]} rotation={[0.2, 0, 0]}>
              <boxGeometry args={[0.09, 0.035, 0.08]} />
              <meshStandardMaterial color={style.hairColor} roughness={0.7} />
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
function ContestantPodium({
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

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* ── 1. ARCHITECTURAL PLINTH BASE (Chân bục vững chắc tiếp đất Y=0) ── */}
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[1.20, 0.08, 0.88]} />
        <meshStandardMaterial color="#0f172a" metalness={0.92} roughness={0.18} />
      </mesh>
      <mesh position={[0, 0.082, 0.44]}>
        <boxGeometry args={[1.18, 0.015, 0.02]} />
        <meshBasicMaterial color="#00e5ff" />
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
        <meshBasicMaterial color={isRed ? "#ff2a4b" : "#00f0ff"} />
      </mesh>
      {/* Bottom Niche Lip Accent */}
      <mesh position={[0, 0.335, 0.382]}>
        <boxGeometry args={[0.90, 0.012, 0.015]} />
        <meshBasicMaterial color={isRed ? "#ff2a4b" : "#00f0ff"} />
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
      {showFigure && <ContestantFigure seatId={seatId} />}
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
function CenterMcDesk({ screenFadeProgress = 0 }: { screenFadeProgress?: number }) {
  const neonCyan = "#00f0ff";
  const neonColor = screenFadeProgress > 0.5 ? "#ff2a4b" : neonCyan;

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
function McPresenters({
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
  const nhLeftLegRef = useRef<THREE.Group>(null);
  const nhRightLegRef = useRef<THREE.Group>(null);

  // Compute walk-out animation progress (0.0: behind arch doors -> 1.0: beside MC desk)
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
    const bounce = isWalking ? Math.abs(Math.sin(walkProgress * Math.PI * 14)) * 0.03 : 0;

    // Khánh Vy (Female MC): Bước từ phía sau bên phải cánh cửa vòm [5.35, 0.14, -8.95]
    // bước qua mép cửa ra tiền cảnh và tiến vào sau bục MC [3.48, 0.14, -7.15]
    if (kvRef.current) {
      const u = 1 - walkProgress;
      const targetX = u * u * 5.35 + 2 * u * walkProgress * 4.35 + walkProgress * walkProgress * 3.48;
      const targetZ = u * u * -8.95 + 2 * u * walkProgress * -8.05 + walkProgress * walkProgress * -7.15;
      kvRef.current.position.set(targetX, 0.14 + bounce, targetZ);

      const tanX = 2 * u * (4.35 - 5.35) + 2 * walkProgress * (3.48 - 4.35);
      const tanZ = 2 * u * (-8.05 - -8.95) + 2 * walkProgress * (-7.15 - -8.05);
      const walkRot = Math.atan2(-tanX, -tanZ);
      kvRef.current.rotation.y = THREE.MathUtils.lerp(walkRot, -0.25, walkProgress * walkProgress);
    }

    // Ngọc Huy (Male MC): Bước từ phía sau bên trái cánh cửa vòm [1.35, 0.14, -8.95]
    // bước qua mép cửa ra tiền cảnh và tiến vào sau bục MC [2.79, 0.14, -7.32]
    if (nhRef.current) {
      const u = 1 - walkProgress;
      const targetX = u * u * 1.35 + 2 * u * walkProgress * 2.05 + walkProgress * walkProgress * 2.79;
      const targetZ = u * u * -8.95 + 2 * u * walkProgress * -8.10 + walkProgress * walkProgress * -7.32;
      nhRef.current.position.set(targetX, 0.14 + bounce, targetZ);

      const tanX = 2 * u * (2.05 - 1.35) + 2 * walkProgress * (2.79 - 2.05);
      const tanZ = 2 * u * (-8.10 - -8.95) + 2 * walkProgress * (-7.32 - -8.10);
      const walkRot = Math.atan2(-tanX, -tanZ);
      nhRef.current.rotation.y = THREE.MathUtils.lerp(walkRot, -0.25, walkProgress * walkProgress);
    }

    // Leg stride swing
    if (kvLeftLegRef.current && kvRightLegRef.current) {
      kvLeftLegRef.current.rotation.x = stride;
      kvRightLegRef.current.rotation.x = -stride;
    }
    if (nhLeftLegRef.current && nhRightLegRef.current) {
      nhLeftLegRef.current.rotation.x = -stride;
      nhRightLegRef.current.rotation.x = stride;
    }
  });

  return (
    <group>
      {/* ── KHÁNH VY (Female Presenter) ── */}
      <group ref={kvRef} position={[3.48, 0.14, -7.15]} rotation={[0, -0.25, 0]}>
        {/* Head */}
        <mesh position={[0, 1.58, 0]}>
          <sphereGeometry args={[0.082, 24, 24]} />
          <meshStandardMaterial color="#fed7aa" roughness={0.55} />
        </mesh>
        {/* Styled Dark Brunette Hair with Shoulder Flow */}
        <mesh position={[0, 1.62, -0.02]}>
          <sphereGeometry args={[0.088, 24, 24]} />
          <meshStandardMaterial color="#2d1b00" roughness={0.8} />
        </mesh>
        <mesh position={[0, 1.51, -0.05]}>
          <cylinderGeometry args={[0.08, 0.11, 0.22, 16]} />
          <meshStandardMaterial color="#2d1b00" roughness={0.8} />
        </mesh>
        {/* Side swept fringe */}
        <mesh position={[0.02, 1.63, 0.045]} rotation={[0.1, 0, -0.15]}>
          <boxGeometry args={[0.09, 0.03, 0.04]} />
          <meshStandardMaterial color="#2d1b00" roughness={0.8} />
        </mesh>

        {/* ── Natural Expressive Face ── */}
        {/* Almond Eyes with Pupils */}
        <mesh position={[-0.028, 1.58, 0.078]}>
          <sphereGeometry args={[0.0075, 12, 12]} />
          <meshStandardMaterial color="#0f172a" roughness={0.2} />
        </mesh>
        <mesh position={[0.028, 1.58, 0.078]}>
          <sphereGeometry args={[0.0075, 12, 12]} />
          <meshStandardMaterial color="#0f172a" roughness={0.2} />
        </mesh>
        {/* Soft Eyebrows */}
        <mesh position={[-0.028, 1.605, 0.080]} rotation={[0, 0, 0.05]}>
          <boxGeometry args={[0.024, 0.005, 0.004]} />
          <meshStandardMaterial color="#2d1b00" roughness={0.8} />
        </mesh>
        <mesh position={[0.028, 1.605, 0.080]} rotation={[0, 0, -0.05]}>
          <boxGeometry args={[0.024, 0.005, 0.004]} />
          <meshStandardMaterial color="#2d1b00" roughness={0.8} />
        </mesh>
        {/* Nose Tip */}
        <mesh position={[0, 1.558, 0.084]}>
          <sphereGeometry args={[0.006, 10, 10]} />
          <meshStandardMaterial color="#fed7aa" roughness={0.55} />
        </mesh>
        {/* Smiling Lips */}
        <mesh position={[0, 1.530, 0.080]}>
          <boxGeometry args={[0.022, 0.006, 0.005]} />
          <meshStandardMaterial color="#e11d48" roughness={0.4} />
        </mesh>

        {/* Delicate Stylish Round/Oval Spectacles Frame */}
        <group position={[0, 1.58, 0.084]}>
          <mesh position={[-0.028, 0, 0]}>
            <ringGeometry args={[0.013, 0.016, 20]} />
            <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0.028, 0, 0]}>
            <ringGeometry args={[0.013, 0.016, 20]} />
            <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0.002, 0]}>
            <boxGeometry args={[0.016, 0.003, 0.003]} />
            <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>

        {/* Neck */}
        <mesh position={[0, 1.48, 0]}>
          <cylinderGeometry args={[0.034, 0.038, 0.07, 14]} />
          <meshStandardMaterial color="#fed7aa" roughness={0.55} />
        </mesh>

        {/* ── Seamless Anatomical Torso & Shoulders ── */}
        {/* Shoulder Yoke (Bridges neck and arms seamlessly, eliminating air gaps) */}
        <mesh position={[0, 1.42, 0]}>
          <boxGeometry args={[0.34, 0.06, 0.16]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.3} />
        </mesh>
        {/* Crisp White Broadcast Blouse */}
        <mesh position={[0, 1.32, 0]}>
          <cylinderGeometry args={[0.13, 0.11, 0.18, 16]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.3} />
        </mesh>
        <mesh position={[0, 1.20, 0]}>
          <cylinderGeometry args={[0.11, 0.13, 0.16, 16]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.3} />
        </mesh>
        {/* Ribbon Tie */}
        <mesh position={[0, 1.33, 0.105]} rotation={[0.08, 0, 0]}>
          <boxGeometry args={[0.040, 0.18, 0.01]} />
          <meshStandardMaterial color="#991b1b" roughness={0.4} />
        </mesh>

        {/* ── Seamless Left Arm holding Cue Card ── */}
        <mesh position={[-0.16, 1.32, 0.02]} rotation={[0.35, 0, -0.15]}>
          <cylinderGeometry args={[0.036, 0.032, 0.22, 12]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.3} />
        </mesh>
        <mesh position={[-0.15, 1.18, 0.12]} rotation={[0.60, 0.20, -0.10]}>
          <cylinderGeometry args={[0.030, 0.026, 0.22, 12]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.3} />
        </mesh>
        {/* Hand */}
        <mesh position={[-0.14, 1.10, 0.22]}>
          <sphereGeometry args={[0.022, 12, 12]} />
          <meshStandardMaterial color="#fed7aa" roughness={0.55} />
        </mesh>
        {/* Cue Card */}
        <mesh position={[-0.14, 1.14, 0.24]} rotation={[0.25, -0.20, 0.10]}>
          <boxGeometry args={[0.18, 0.005, 0.12]} />
          <meshStandardMaterial color="#ffffff" roughness={0.2} />
        </mesh>
        <mesh position={[-0.14, 1.14, 0.242]} rotation={[0.25, -0.20, 0.10]}>
          <boxGeometry args={[0.16, 0.006, 0.02]} />
          <meshBasicMaterial color="#f59e0b" />
        </mesh>

        {/* ── Seamless Right Arm holding Microphone ── */}
        <mesh position={[0.16, 1.32, 0.02]} rotation={[0.45, 0, 0.15]}>
          <cylinderGeometry args={[0.036, 0.032, 0.22, 12]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.3} />
        </mesh>
        <mesh position={[0.15, 1.22, 0.14]} rotation={[0.75, -0.20, 0.10]}>
          <cylinderGeometry args={[0.030, 0.026, 0.20, 12]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.3} />
        </mesh>
        {/* Hand holding Mic */}
        <mesh position={[0.14, 1.28, 0.22]}>
          <sphereGeometry args={[0.022, 12, 12]} />
          <meshStandardMaterial color="#fed7aa" roughness={0.55} />
        </mesh>
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

        {/* Flared Warm Beige Pleated Midi Skirt */}
        <mesh position={[0, 0.90, 0]}>
          <cylinderGeometry args={[0.12, 0.24, 0.46, 20]} />
          <meshStandardMaterial color="#d4b996" roughness={0.7} />
        </mesh>

        {/* Left & Right Walking Legs */}
        <group ref={kvLeftLegRef} position={[-0.07, 0.68, 0]}>
          <mesh position={[0, -0.28, 0]}>
            <cylinderGeometry args={[0.038, 0.032, 0.52, 12]} />
            <meshStandardMaterial color="#fed7aa" roughness={0.6} />
          </mesh>
          <mesh position={[0, -0.62, 0.02]}>
            <boxGeometry args={[0.05, 0.06, 0.11]} />
            <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.8} />
          </mesh>
        </group>
        <group ref={kvRightLegRef} position={[0.07, 0.68, 0]}>
          <mesh position={[0, -0.28, 0]}>
            <cylinderGeometry args={[0.038, 0.032, 0.52, 12]} />
            <meshStandardMaterial color="#fed7aa" roughness={0.6} />
          </mesh>
          <mesh position={[0, -0.62, 0.02]}>
            <boxGeometry args={[0.05, 0.06, 0.11]} />
            <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.8} />
          </mesh>
        </group>
      </group>

      {/* ── NGỌC HUY (Male Presenter) ── */}
      <group ref={nhRef} position={[2.79, 0.14, -7.32]} rotation={[0, -0.25, 0]}>
        {/* Head */}
        <mesh position={[0, 1.68, 0]}>
          <sphereGeometry args={[0.088, 24, 24]} />
          <meshStandardMaterial color="#fed7aa" roughness={0.55} />
        </mesh>
        {/* Modern Dark Side-Part Hair */}
        <mesh position={[0, 1.72, -0.015]}>
          <sphereGeometry args={[0.092, 24, 24]} />
          <meshStandardMaterial color="#1a1816" roughness={0.75} />
        </mesh>
        <mesh position={[0.03, 1.74, 0.03]}>
          <boxGeometry args={[0.09, 0.04, 0.08]} />
          <meshStandardMaterial color="#1a1816" roughness={0.75} />
        </mesh>

        {/* ── Natural Expressive Face ── */}
        <mesh position={[-0.030, 1.68, 0.082]}>
          <sphereGeometry args={[0.008, 12, 12]} />
          <meshStandardMaterial color="#0f172a" roughness={0.2} />
        </mesh>
        <mesh position={[0.030, 1.68, 0.082]}>
          <sphereGeometry args={[0.008, 12, 12]} />
          <meshStandardMaterial color="#0f172a" roughness={0.2} />
        </mesh>
        <mesh position={[-0.030, 1.71, 0.084]}>
          <boxGeometry args={[0.026, 0.006, 0.004]} />
          <meshStandardMaterial color="#1a1816" roughness={0.8} />
        </mesh>
        <mesh position={[0.030, 1.71, 0.084]}>
          <boxGeometry args={[0.026, 0.006, 0.004]} />
          <meshStandardMaterial color="#1a1816" roughness={0.8} />
        </mesh>
        <mesh position={[0, 1.655, 0.088]}>
          <boxGeometry args={[0.014, 0.024, 0.01]} />
          <meshStandardMaterial color="#fed7aa" roughness={0.55} />
        </mesh>
        <mesh position={[0, 1.625, 0.084]}>
          <boxGeometry args={[0.024, 0.006, 0.005]} />
          <meshStandardMaterial color="#991b1b" roughness={0.4} />
        </mesh>

        {/* Neck */}
        <mesh position={[0, 1.56, 0]}>
          <cylinderGeometry args={[0.042, 0.046, 0.08, 14]} />
          <meshStandardMaterial color="#fed7aa" roughness={0.55} />
        </mesh>

        {/* ── Seamless Tailored Host Suit Blazer & Shoulders ── */}
        {/* Shoulder Yoke (Broad masculine suit shoulders bridging seamlessly) */}
        <mesh position={[0, 1.48, 0]}>
          <boxGeometry args={[0.42, 0.08, 0.20]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} />
        </mesh>
        {/* White Dress Shirt V & Necktie */}
        <mesh position={[0, 1.46, 0.09]}>
          <boxGeometry args={[0.10, 0.10, 0.04]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>
        <mesh position={[0, 1.42, 0.11]} rotation={[0.05, 0, 0]}>
          <boxGeometry args={[0.032, 0.16, 0.01]} />
          <meshStandardMaterial color="#991b1b" roughness={0.4} />
        </mesh>
        {/* Suit Jacket Body */}
        <mesh position={[0, 1.34, 0]}>
          <cylinderGeometry args={[0.16, 0.155, 0.26, 16]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} />
        </mesh>
        <mesh position={[0, 1.18, 0]}>
          <cylinderGeometry args={[0.155, 0.165, 0.22, 16]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} />
        </mesh>

        {/* ── Seamless Left Arm holding Microphone ── */}
        <mesh position={[-0.20, 1.36, 0.03]} rotation={[0.55, 0, -0.15]}>
          <cylinderGeometry args={[0.042, 0.036, 0.24, 12]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} />
        </mesh>
        <mesh position={[-0.18, 1.28, 0.14]} rotation={[0.85, 0.20, -0.10]}>
          <cylinderGeometry args={[0.034, 0.030, 0.22, 12]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} />
        </mesh>
        {/* Hand holding Mic */}
        <mesh position={[-0.15, 1.35, 0.23]}>
          <sphereGeometry args={[0.024, 12, 12]} />
          <meshStandardMaterial color="#fed7aa" roughness={0.55} />
        </mesh>
        <group position={[-0.15, 1.40, 0.26]} rotation={[-0.4, 0, 0]}>
          <mesh>
            <cylinderGeometry args={[0.010, 0.008, 0.12, 12]} />
            <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.07, 0]}>
            <sphereGeometry args={[0.016, 16, 16]} />
            <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>

        {/* ── Seamless Right Arm holding Host Tablet ── */}
        <mesh position={[0.20, 1.34, 0.02]} rotation={[0.25, 0, 0.12]}>
          <cylinderGeometry args={[0.042, 0.036, 0.24, 12]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} />
        </mesh>
        <mesh position={[0.22, 1.18, 0.12]} rotation={[0.45, -0.15, 0.10]}>
          <cylinderGeometry args={[0.034, 0.030, 0.22, 12]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} />
        </mesh>
        {/* Hand */}
        <mesh position={[0.22, 1.12, 0.20]}>
          <sphereGeometry args={[0.024, 12, 12]} />
          <meshStandardMaterial color="#fed7aa" roughness={0.55} />
        </mesh>
        {/* Host Tablet */}
        <mesh position={[0.23, 1.14, 0.22]} rotation={[0.35, -0.20, 0]}>
          <boxGeometry args={[0.18, 0.008, 0.24]} />
          <meshStandardMaterial color="#0284c7" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0.23, 1.145, 0.22]} rotation={[0.35, -0.20, 0]}>
          <boxGeometry args={[0.16, 0.009, 0.22]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>

        {/* Tailored Suit Trousers & Walking Legs */}
        <group ref={nhLeftLegRef} position={[-0.09, 0.90, 0]}>
          <mesh position={[0, -0.42, 0]}>
            <cylinderGeometry args={[0.065, 0.052, 0.86, 12]} />
            <meshStandardMaterial color="#0f172a" roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.86, 0.03]}>
            <boxGeometry args={[0.065, 0.05, 0.13]} />
            <meshStandardMaterial color="#020617" roughness={0.3} />
          </mesh>
        </group>
        <group ref={nhRightLegRef} position={[0.09, 0.90, 0]}>
          <mesh position={[0, -0.42, 0]}>
            <cylinderGeometry args={[0.065, 0.052, 0.86, 12]} />
            <meshStandardMaterial color="#0f172a" roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.86, 0.03]}>
            <boxGeometry args={[0.065, 0.05, 0.13]} />
            <meshStandardMaterial color="#020617" roughness={0.3} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
function ContestantEntranceWalkingFigures({
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
          {/* Head & Hair */}
          <mesh position={[0, 1.58, 0]}>
            <sphereGeometry args={[0.088, 20, 20]} />
            <meshStandardMaterial color={style.skinTone} roughness={0.6} />
          </mesh>
          <mesh position={[0, 1.62, -0.015]}>
            <sphereGeometry args={[0.094, 20, 20]} />
            <meshStandardMaterial color={style.hairColor} roughness={0.8} />
          </mesh>
          <mesh position={[0.03, 1.64, 0.04]}>
            <boxGeometry args={[0.08, 0.03, 0.06]} />
            <meshStandardMaterial color={style.hairColor} roughness={0.8} />
          </mesh>

          {/* Neck */}
          <mesh position={[0, 1.48, 0]}>
            <cylinderGeometry args={[0.042, 0.046, 0.08, 14]} />
            <meshStandardMaterial color={style.skinTone} roughness={0.6} />
          </mesh>

          {/* Torso Polo Shirt */}
          <mesh position={[0, 1.32, 0]}>
            <cylinderGeometry args={[0.18, 0.155, 0.30, 16]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.4} />
          </mesh>
          <mesh position={[0, 1.45, 0.04]} rotation={[0.25, 0, 0]}>
            <boxGeometry args={[0.15, 0.035, 0.08]} />
            <meshStandardMaterial color="#ffffff" roughness={0.3} />
          </mesh>
          <mesh position={[0, 1.38, 0.10]}>
            <boxGeometry args={[0.03, 0.09, 0.01]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.3} />
          </mesh>
          {/* Olympia Badge */}
          <mesh position={[0.08, 1.34, 0.12]} rotation={[0.1, 0, 0]}>
            <boxGeometry args={[0.038, 0.024, 0.008]} />
            <meshBasicMaterial color="#00e5ff" />
          </mesh>

          {/* Lower Torso / Waist */}
          <mesh position={[0, 1.07, 0]}>
            <cylinderGeometry args={[0.15, 0.16, 0.24, 16]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.4} />
          </mesh>

          {/* Belt */}
          <mesh position={[0, 0.93, 0]}>
            <boxGeometry args={[0.32, 0.04, 0.20]} />
            <meshStandardMaterial color="#1e293b" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.93, 0.102]}>
            <boxGeometry args={[0.045, 0.03, 0.01]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.8} roughness={0.2} />
          </mesh>

          {/* Left Arm (Articulated shoulder + elbow) */}
          <group ref={leftArmRef} position={[-0.20, 1.34, 0]}>
            <mesh position={[0, -0.10, 0]}>
              <cylinderGeometry args={[0.042, 0.036, 0.20, 12]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.4} />
            </mesh>
            <group ref={leftForearmRef} position={[0, -0.20, 0]}>
              <mesh position={[0, -0.10, 0]}>
                <cylinderGeometry args={[0.034, 0.028, 0.20, 12]} />
                <meshStandardMaterial color={style.skinTone} roughness={0.6} />
              </mesh>
              <mesh position={[0, -0.21, 0]}>
                <sphereGeometry args={[0.028, 12, 12]} />
                <meshStandardMaterial color={style.skinTone} roughness={0.6} />
              </mesh>
            </group>
          </group>

          {/* Right Arm (Articulated shoulder + elbow) */}
          <group ref={rightArmRef} position={[0.20, 1.34, 0]}>
            <mesh position={[0, -0.10, 0]}>
              <cylinderGeometry args={[0.042, 0.036, 0.20, 12]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.4} />
            </mesh>
            <group ref={rightForearmRef} position={[0, -0.20, 0]}>
              <mesh position={[0, -0.10, 0]}>
                <cylinderGeometry args={[0.034, 0.028, 0.20, 12]} />
                <meshStandardMaterial color={style.skinTone} roughness={0.6} />
              </mesh>
              <mesh position={[0, -0.21, 0]}>
                <sphereGeometry args={[0.028, 12, 12]} />
                <meshStandardMaterial color={style.skinTone} roughness={0.6} />
              </mesh>
            </group>
          </group>
        </group>

        {/* Pelvis */}
        <mesh position={[0, 0.86, 0]}>
          <boxGeometry args={[0.30, 0.12, 0.19]} />
          <meshStandardMaterial color="#0f172a" roughness={0.8} />
        </mesh>

        {/* Lower Body: Left Leg (Articulated Hip + Knee + Shoe) */}
        <group ref={leftThighRef} position={[-0.09, 0.78, 0]}>
          <mesh position={[0, -0.18, 0]}>
            <cylinderGeometry args={[0.058, 0.048, 0.36, 12]} />
            <meshStandardMaterial color="#0f172a" roughness={0.8} />
          </mesh>
          <group ref={leftKneeRef} position={[0, -0.36, 0]}>
            <mesh position={[0, -0.18, 0]}>
              <cylinderGeometry args={[0.048, 0.040, 0.36, 12]} />
              <meshStandardMaterial color="#0f172a" roughness={0.8} />
            </mesh>
            <mesh position={[0, -0.37, 0.03]}>
              <boxGeometry args={[0.08, 0.05, 0.17]} />
              <meshStandardMaterial color="#020617" roughness={0.3} />
            </mesh>
          </group>
        </group>

        {/* Lower Body: Right Leg (Articulated Hip + Knee + Shoe) */}
        <group ref={rightThighRef} position={[0.09, 0.78, 0]}>
          <mesh position={[0, -0.18, 0]}>
            <cylinderGeometry args={[0.058, 0.048, 0.36, 12]} />
            <meshStandardMaterial color="#0f172a" roughness={0.8} />
          </mesh>
          <group ref={rightKneeRef} position={[0, -0.36, 0]}>
            <mesh position={[0, -0.18, 0]}>
              <cylinderGeometry args={[0.048, 0.040, 0.36, 12]} />
              <meshStandardMaterial color="#0f172a" roughness={0.8} />
            </mesh>
            <mesh position={[0, -0.37, 0.03]}>
              <boxGeometry args={[0.08, 0.05, 0.17]} />
              <meshStandardMaterial color="#020617" roughness={0.3} />
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
  quality: _quality = "HIGH",
  screenFadeProgress = 0,
  serverNow,
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
      <CenterMcDesk screenFadeProgress={screenFadeProgress} />

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
