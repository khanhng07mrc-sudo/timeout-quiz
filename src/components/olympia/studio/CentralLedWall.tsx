"use client";

import React, { useRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import type { OlympiaRightScreenMode, OlympiaState } from "@/lib/olympia/types";
import { parseVcnvAnswer } from "@/lib/olympia/engine";
import { isPreMatchIdle } from "./useOlympiaLightingState";

interface CentralLedWallProps {
  state?: OlympiaState | null;
  screenFadeProgress?: number; // 0.0 (Sapphire Blue) -> 1.0 (Fiery Red)
  quality?: "HIGH" | "MEDIUM" | "LIGHT";
  liveFactor?: number;
}

/**
 * Creates a concentric cut-bottom hexagon arch shape (flat top, slanted sides,
 * open bottom with vertical legs touching the stage floor).
 */
/**
 * Calculates 6 vertices of a grounded hexagon arch contour resting at Y = 0.
 * Knuckles are strictly at horizontal mid-height Y = H / 2 parallel to the floor.
 * 5 boundary segments: floor-left, left-knuckle, top-left, top-right, right-knuckle, floor-right.
 */
export function computeGroundedHexagonVertices(w: number, h: number, baseW: number): [number, number][] {
  // Vertical Standing Hexagon (Đường lên đỉnh Olympia S22-S26 Studio S14):
  // Slender, tall vertical aspect ratio (H >= W). Flat top, flat bottom resting on floor (Y = 0).
  const yMid = h / 2; // Knuckles strictly at horizontal mid-height Y = H / 2
  const w2 = w / 2;
  const topW2 = (w * 0.46) / 2; // Flat top width
  const b2 = baseW / 2; // Base width on stage floor
  return [
    [-b2, 0],       // 0: floor bottom-left
    [b2, 0],        // 1: floor bottom-right
    [w2, yMid],     // 2: right knuckle
    [topW2, h],     // 3: top-right corner
    [-topW2, h],    // 4: top-left corner
    [-w2, yMid],    // 5: left knuckle
  ];
}

/**
 * Offsets a grounded hexagon contour inward by uniform perpendicular distance T across all 5 segments.
 * Eliminates upper-half bulge; both left and right knuckles remain strictly on the horizontal line Y = H/2.
 */
export function offsetGroundedContour(pts: [number, number][], dist: number): [number, number][] {
  function offsetLine(pA: [number, number], pB: [number, number], d: number) {
    const dx = pB[0] - pA[0];
    const dy = pB[1] - pA[1];
    const len = Math.hypot(dx, dy);
    return {
      point: [pA[0] - (dy / len) * d, pA[1] + (dx / len) * d],
      dir: [dx / len, dy / len],
    };
  }
  function intersect(
    L1: { point: number[]; dir: number[] },
    L2: { point: number[]; dir: number[] }
  ): [number, number] {
    const [x1, y1] = L1.point;
    const [dx1, dy1] = L1.dir;
    const [x2, y2] = L2.point;
    const [dx2, dy2] = L2.dir;
    const det = dx1 * dy2 - dy1 * dx2;
    if (Math.abs(det) < 1e-6) return [x1, y1];
    const t1 = ((x2 - x1) * dy2 - (y2 - y1) * dx2) / det;
    return [x1 + t1 * dx1, y1 + t1 * dy1];
  }

  // Edges (CCW): 1->2 (lower-right), 2->3 (upper-right), 3->4 (top), 4->5 (upper-left), 5->0 (lower-left)
  const L_lr = offsetLine(pts[1], pts[2], dist);
  const L_ur = offsetLine(pts[2], pts[3], dist);
  const L_top = offsetLine(pts[3], pts[4], dist);
  const L_ul = offsetLine(pts[4], pts[5], dist);
  const L_ll = offsetLine(pts[5], pts[0], dist);

  const p_rk = intersect(L_lr, L_ur);
  const p_ur = intersect(L_ur, L_top);
  const p_ul = intersect(L_top, L_ul);
  const p_lk = intersect(L_ul, L_ll);

  // Floor intersection at Y = 0
  const t_br = -L_lr.point[1] / L_lr.dir[1];
  const p_br: [number, number] = [L_lr.point[0] + t_br * L_lr.dir[0], 0];

  const t_bl = -L_ll.point[1] / L_ll.dir[1];
  const p_bl: [number, number] = [L_ll.point[0] + t_bl * L_ll.dir[0], 0];

  return [p_bl, p_br, p_rk, p_ur, p_ul, p_lk];
}

/**
 * Creates grounded cut-bottom 6-sided hexagon shape where the base rests directly on the floor (Y = 0).
 * Bottom is cut flat, sides flare out to mid-height, then chamfer in to top horizontal ridge.
 * Uniform normal thickness on all segments, knuckles strictly on horizontal line parallel to stage floor.
 */
function createGroundedHexagonShape(
  outerW: number,
  outerH: number,
  innerW: number,
  innerH: number
): THREE.Shape {
  const outer = computeGroundedHexagonVertices(outerW, outerH, outerW * 0.70);
  const thickness = Math.max(0.20, (outerW - innerW) / 2 || 0.38);
  const inner = offsetGroundedContour(outer, thickness);

  const shape = new THREE.Shape();
  shape.moveTo(outer[0][0], outer[0][1]);
  for (let i = 1; i < outer.length; i++) {
    shape.lineTo(outer[i][0], outer[i][1]);
  }
  shape.closePath();

  // Inner cutout hole: CW
  const hole = new THREE.Path();
  hole.moveTo(inner[0][0], inner[0][1]);
  hole.lineTo(inner[5][0], inner[5][1]);
  hole.lineTo(inner[4][0], inner[4][1]);
  hole.lineTo(inner[3][0], inner[3][1]);
  hole.lineTo(inner[2][0], inner[2][1]);
  hole.lineTo(inner[1][0], inner[1][1]);
  hole.closePath();
  shape.holes.push(hole);

  return shape;
}

/**
 * Creates solid grounded hexagon shape for the starry night LED backdrop resting at Y = 0
 */
function createSolidGroundedHexagonShape(w: number, h: number): THREE.Shape {
  const pts = computeGroundedHexagonVertices(w, h, w * 0.70);
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    shape.lineTo(pts[i][0], pts[i][1]);
  }
  shape.closePath();

  return shape;
}

/**
 * Creates solid true 6-sided hexagon shape for the starry night screen (CCW)
 */
function createSolidHexagonShape(w: number, h: number): THREE.Shape {
  const shape = new THREE.Shape();
  const w4 = w / 4;
  const w2 = w / 2;
  const h2 = h / 2;
  shape.moveTo(-w4, -h2);
  shape.lineTo(w4, -h2);
  shape.lineTo(w2, 0);
  shape.lineTo(w4, h2);
  shape.lineTo(-w4, h2);
  shape.lineTo(-w2, 0);
  shape.closePath();
  return shape;
}

/**
 * Creates outer border line vertices for neon tube edging on true 6-sided hexagon
 */
function createTrueHexagonBorderPoints(w: number, h: number): THREE.Vector3[] {
  const w4 = w / 4;
  const w2 = w / 2;
  const h2 = h / 2;
  return [
    new THREE.Vector3(-w4, h2, 0),
    new THREE.Vector3(w4, h2, 0),
    new THREE.Vector3(w2, 0, 0),
    new THREE.Vector3(w4, -h2, 0),
    new THREE.Vector3(-w4, -h2, 0),
    new THREE.Vector3(-w2, 0, 0),
    new THREE.Vector3(-w4, h2, 0),
  ];
}

function createInnerArchBorderPoints(w: number, h: number): THREE.Vector3[] {
  return createTrueHexagonBorderPoints(w, h);
}

/**
 * Pre-rendered Starry Night Backdrop for the Hexagon Portal.
 * Pure deep midnight cosmos with glowing LED matrix stardust (NO text, NO title).
 */
/**
 * Dynamic High-Tech Binary Matrix Grid (0 and 1 in glowing cyan/green and red/amber)
 * Cells gently pulse and toggle per user request:
 * "thay các chấm tròn hay số loè phía sau bằng các ô số xanh đỏ 0 1 1 0 1 0 0 1 0 0 ... sao cho chúng bật tắt ngẫu nhiên theo thời gian, và chúng phải có chút glow cho real nhé"
 */
function renderBinaryMatrixGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  fadeProgress: number = 0,
  seedOffset: number = 0,
  timeSec: number = 0,
  quality: "HIGH" | "MEDIUM" | "LIGHT" = "HIGH"
): void {
  const isLight = quality === "LIGHT";
  const cellSize = isLight ? 44 : 22;
  const cols = Math.floor(w / cellSize);
  const rows = Math.floor(h / cellSize);

  ctx.save();
  ctx.font = isLight ? '700 13px "Courier New", monospace' : '700 12px "Courier New", monospace';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  let seed = 42893 + seedOffset;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  const timeStep = Math.floor(timeSec * (isLight ? 2.5 : 4.0)); // digital stream transitions per second

  let charIndexTotal = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const colSpeed = 1 + (c % 3);
      const rowOffset = Math.floor((timeSec * (10 + colSpeed * 4) + c * 3) / cellSize);
      const effectiveRow = (r + rowOffset) % rows;

      const digitSeed = (seed + c * 31 + effectiveRow * 17 + timeStep) % 100;
      const val = digitSeed > 48 ? "1" : "0";
      const roll = rnd();
      const x = c * cellSize + cellSize / 2;
      const y = r * cellSize + cellSize / 2;

      // Per-character pulsing alpha for formula wall glow animation
      const phase = (charIndexTotal * 2.399 + r * 1.618) % (Math.PI * 2);
      const pulse = 0.35 + 0.65 * Math.abs(Math.sin(timeSec * 0.65 + phase));

      // Subtle monochromatic ambient particle characters (Zero green, zero random red)
      const glowPulse = Math.sin(timeSec * 2.5 + c * 0.35 + r * 0.2);
      const isRed = fadeProgress > 0.5;
      if (roll < 0.25 || (roll < 0.35 && glowPulse > 0.4)) {
        const color = isRed
          ? (roll < 0.12 ? "#ffd0d8" : "#e11d48")
          : (roll < 0.12 ? "#ffffff" : "#2563eb");
        ctx.fillStyle = color;
        if (!isLight) {
          ctx.save();
          ctx.shadowColor = isRed ? "#991b1b" : "#1d4ed8";
          ctx.shadowBlur = 6;
          ctx.globalAlpha = pulse * 0.40;
          ctx.fillText(val, x, y);
          ctx.globalAlpha = 1.0;
          ctx.restore();
        } else {
          ctx.globalAlpha = pulse * 0.40;
          ctx.fillText(val, x, y);
          ctx.globalAlpha = 1.0;
        }
      } else if (roll < 0.55) {
        // Faint deep sapphire / crimson background numbers
        ctx.fillStyle = isRed ? "rgba(153, 27, 27, 0.12)" : "rgba(30, 64, 175, 0.14)";
        ctx.globalAlpha = pulse * 0.30;
        ctx.fillText(val, x, y);
        ctx.globalAlpha = 1.0;
      }
      charIndexTotal++;
    }
  }
  ctx.restore();
}

/**
 * Pre-rendered Starry Night & Binary Matrix Backdrop for the Hexagon Portal.
 * Pure deep midnight cosmos with glowing digital 0/1 matrix and stardust glints.
 */
function renderStarryNightToCanvas(
  canvas: HTMLCanvasElement,
  logoImg?: HTMLImageElement | null,
  fadeProgress: number = 0,
  seedOffset: number = 0
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;

  // 1. Deep midnight cosmic radial background
  const bgGrad = ctx.createRadialGradient(cx, cy * 0.9, 80, cx, cy, w * 0.70);
  bgGrad.addColorStop(0, "#08204d");
  bgGrad.addColorStop(0.35, "#04112e");
  bgGrad.addColorStop(0.70, "#020718");
  bgGrad.addColorStop(1, "#01030a");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // 2. Luminous cyan/azure nebula core behind the MCs
  const nebGrad = ctx.createRadialGradient(cx, cy * 0.75, 30, cx, cy * 0.75, 360);
  nebGrad.addColorStop(0, "rgba(0, 212, 255, 0.35)");
  nebGrad.addColorStop(0.40, "rgba(59, 130, 246, 0.18)");
  nebGrad.addColorStop(0.75, "rgba(124, 58, 237, 0.08)");
  nebGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = nebGrad;
  ctx.fillRect(0, 0, w, h);

  // 3. Subtle cyber constellation hexagonal grid (Soft, non-banded, high-tech)
  ctx.save();
  ctx.strokeStyle = "rgba(0, 212, 255, 0.12)";
  ctx.lineWidth = 1.0;
  const hexR = 54;
  const dx = hexR * 1.5;
  const dy = hexR * Math.sqrt(3);
  for (let q = -1; q < w / dx + 2; q++) {
    for (let r = -1; r < h / dy + 2; r++) {
      const hx = q * dx;
      const hy = r * dy + (q % 2 ? dy / 2 : 0);
      if (Math.hypot(hx - cx, hy - cy) < 460) {
        ctx.beginPath();
        for (let a = 0; a < 6; a++) {
          const ang = (Math.PI / 3) * a;
          const px = hx + hexR * 0.8 * Math.cos(ang);
          const py = hy + hexR * 0.8 * Math.sin(ang);
          if (a === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
  }
  ctx.restore();

  // 4. Subtle cyber clusters of 0 and 1 (Scattered organically without column alignment)
  ctx.save();
  ctx.font = '700 13px "Courier New", monospace';
  let seed = 1234567 + seedOffset;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let i = 0; i < 90; i++) {
    const rx = 80 + rnd() * (w - 160);
    const ry = 60 + rnd() * (h - 120);
    const val = rnd() > 0.5 ? "1" : "0";
    const isLit = rnd() < 0.40;
    if (isLit) {
      const isRed = rnd() < 0.25 || fadeProgress > 0.5;
      const col = isRed ? "#ff2a55" : "#00f0ff";
      ctx.fillStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 6;
      ctx.fillText(val, rx, ry);
    } else {
      ctx.fillStyle = "rgba(0, 190, 255, 0.18)";
      ctx.shadowBlur = 0;
      ctx.fillText(val, rx, ry);
    }
  }
  ctx.restore();

  // 5. 280+ Twinkling Stardust Glints with Soft Multi-colored Volumetric Glow
  for (let i = 0; i < 280; i++) {
    const sx = rnd() * w;
    const sy = rnd() * h;
    const r = i % 5 === 0 ? 2.0 : i % 2 === 0 ? 1.2 : 0.8;
    ctx.save();
    ctx.fillStyle = i % 7 === 0 ? "#ff2a55" : i % 3 === 0 ? "#38bdf8" : i % 5 === 0 ? "#ffd700" : "#ffffff";
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = i % 4 === 0 ? 8 : 4;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // NOTE: Theo yêu cầu người dùng, bỏ logo Olympia và dòng chữ ở màn lục giác lùi sâu sau MC,
  // giữ trọn vẹn nền cosmos viễn tưởng và tinh vân công nghệ cao.
}

function createStarryNightCanvas(logoImg?: HTMLImageElement | null, fadeProgress: number = 0, seedOffset: number = 0): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 768;
  renderStarryNightToCanvas(canvas, logoImg, fadeProgress, seedOffset);
  return canvas;
}

/**
 * Thin Curved Arch of White LED Dots Ribbon Canvas (Olympia 27 Broadcast Parity - Reference Image 2)
 * Sleek upward curved arch ribbon crowning the upper perimeter of the formula screen with neat rows of glowing white LED dots.
 */
/**
 * Thin Curved Arch of White LED Dots Ribbon Canvas (Olympia 27 Broadcast Parity - Reference Image 2)
 * Sleek upward curved arch ribbon crowning the upper perimeter of the formula screen with neat rows of glowing white LED dots.
 * - Single top glowing neon border (Sapphire Blue in regular rounds, Crimson Red in Khởi Động & Về Đích), zero bottom border.
 * - Airy LED bulb pitch ~42px, displaying distinct independent warm white bulbs with soft gentle glow.
 */
function createWhiteDotsArchCanvas(isRed: boolean = false): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const w = 2048;
  const h = 64;

  // Deep dark sapphire backing
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#010614");
  grad.addColorStop(0.5, "#030c24");
  grad.addColorStop(1, "#010614");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // 2 neat rows of glowing warm white LED dots with airy ~42px pitch (zero clumping)
  const dotSpacingX = 42;
  const cols = Math.floor(w / dotSpacingX);
  const rows = [21, 43]; // 43 - 21 = 22px vertical pitch

  for (let rIdx = 0; rIdx < rows.length; rIdx++) {
    const y = rows[rIdx];
    const offsetX = rIdx % 2 === 1 ? dotSpacingX / 2 : 0;
    for (let c = 0; c < cols; c++) {
      const x = c * dotSpacingX + offsetX;
      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#f0f9ff";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(x, y, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // High-Priority Parity Requirement: CHỈ CÓ DUY NHẤT 1 VIỀN SÁNG MỎNG Ở MÉP TRÊN, LOẠI BỎ HOÀN TOÀN VIỀN DƯỚI.
  // Viền trên đổi màu linh hoạt (Xanh Sapphire ở vòng thường <-> Đỏ Ruby/Crimson ở Khởi Động / Về Đích).
  ctx.save();
  ctx.strokeStyle = isRed ? "#cc1122" : "#1d4ed8";
  // 7.0px on a 64px canvas (representing 0.22m) yields exactly 0.024m ~ 0.025m thickness
  ctx.lineWidth = 7.0;
  ctx.shadowColor = isRed ? "#ef4444" : "#38bdf8";
  ctx.shadowBlur = 8;

  // Single Top border only (y = 3.5 centers the 7px stroke within [0, 7])
  ctx.beginPath();
  ctx.moveTo(0, 3.5);
  ctx.lineTo(w, 3.5);
  ctx.stroke();
  ctx.restore();

  return canvas;
}

/**
 * Sponsor Triangular / Fan LED Matrix Backing Canvas (VTV3 Olympia 27 Reference Image 2)
 * Triangular array of warm white round matrix LEDs situated behind sponsor lightbox under the arch apex.
 */
function createSponsorMatrixBackingCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // Dark obsidian-sapphire backing
  ctx.fillStyle = "#020817";
  ctx.fillRect(0, 0, 512, 512);

  // Triangular fan matrix of warm white round LED dots
  const spacing = 24;
  const cols = Math.floor(512 / spacing);
  const rows = Math.floor(512 / spacing);

  for (let r = 0; r < rows; r++) {
    const y = r * spacing + 12;
    const rowFrac = r / rows;
    const activeSpan = Math.min(256, (1 - rowFrac * 0.7) * 256);
    const minX = 256 - activeSpan;
    const maxX = 256 + activeSpan;

    for (let c = 0; c < cols; c++) {
      const x = c * spacing + (r % 2 === 1 ? 12 : 0);
      if (x < minX || x > maxX) continue;
      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#f0f9ff";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(x, y, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  return canvas;
}

/**
 * Official Quizorra Sponsor Lightbox Canvas
 * Royal sapphire background, metallic silver & cyan border, bold glowing "QUIZORRA" typography
 */
function createQuizorraBadgeCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // Royal Sapphire gradient background
  const bg = ctx.createLinearGradient(0, 0, 512, 160);
  bg.addColorStop(0, "#02153b");
  bg.addColorStop(0.5, "#003b87");
  bg.addColorStop(1, "#011233");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 160);

  // Outer Cyan Glow Border
  ctx.strokeStyle = "#00e5ff";
  ctx.lineWidth = 4;
  ctx.shadowColor = "#00f0ff";
  ctx.shadowBlur = 12;
  ctx.strokeRect(6, 6, 500, 148);

  // Inner Silver Metallic Frame
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.5;
  ctx.shadowBlur = 0;
  ctx.strokeRect(12, 12, 488, 136);

  // Bold "QUIZORRA" Typography
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = '900 68px "Plus Jakarta Sans", "Montserrat", "Arial Black", sans-serif';
  ctx.letterSpacing = "0.08em";

  // Volumetric cyan glow
  ctx.shadowColor = "#00e5ff";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#ffffff";
  ctx.fillText("QUIZORRA", 256, 80);

  // Top specular glint line
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = 1.5;
  ctx.strokeText("QUIZORRA", 255.5, 79);
  ctx.restore();

  return canvas;
}

function questionPromptAvailable(state?: OlympiaState | null): boolean {
  if (!state) return false;
  if (state.currentRound === "khoiDong") return Boolean(state.khoiDong?.questionRevealed && state.khoiDong?.current?.q);
  if (state.currentRound === "vcnv") {
    const v = state.vcnv;
    if (!v) return false;
    return Boolean(v.phase === "question" && v.currentRow >= 0);
  }
  if (state.currentRound === "tangToc") {
    const tt = state.tangToc;
    if (!tt) return false;
    return Boolean(tt.phase === "question" && tt.qIdx >= 0);
  }
  if (state.currentRound === "veDich") {
    const vd = state.veDich;
    if (!vd) return false;
    return Boolean((vd.phase === "packageReady" || vd.phase === "thinking" || vd.phase === "stealing") && vd.current?.q?.q);
  }
  if (state.currentRound === "cauHoiPhu") {
    const cp = state.cauHoiPhu;
    if (!cp) return false;
    return Boolean(cp.phase === "question" && cp.questions?.[cp.qIdx]?.q);
  }
  return false;
}

function renderOlympiaLogoToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cx: number,
  cy: number,
  logoImg: HTMLImageElement | null,
  fadeProgress: number = 0
): void {
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

  // Yellow Light-To-Dark Metallic Gradient Typography: "ĐƯỜNG LÊN ĐỈNH OLYMPIA"
  const textY = logoTargetY + logoTargetH + height * 0.16;
  const textStr = "ĐƯỜNG LÊN ĐỈNH OLYMPIA";

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const fontSize = Math.round(width * 0.040);
  ctx.font = `900 ${fontSize}px "Plus Jakarta Sans", "Montserrat", sans-serif`;
  ctx.letterSpacing = "0.08em";

  const textGrad = ctx.createLinearGradient(0, textY - fontSize * 0.55, 0, textY + fontSize * 0.55);
  textGrad.addColorStop(0.0, "#ffffff");
  textGrad.addColorStop(0.22, "#fffbd0");
  textGrad.addColorStop(0.55, "#f59e0b");
  textGrad.addColorStop(0.85, "#b45309");
  textGrad.addColorStop(1.0, "#78350f");

  // Restrained dark drop shadow protecting diacritics
  ctx.shadowColor = "rgba(0, 0, 0, 0.88)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 3;
  ctx.lineWidth = 3.8;
  ctx.strokeStyle = "#1a0f02";
  ctx.strokeText(textStr, cx, textY);

  // Subtle gold rim outline
  ctx.shadowColor = "rgba(245, 158, 11, 0.55)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 1;
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#fffed4";
  ctx.strokeText(textStr, cx, textY);

  ctx.fillStyle = textGrad;
  ctx.fillText(textStr, cx, textY);

  ctx.restore();
}

/**
 * Render Large Centered Round Title Card on 3D Right Screen
 * Features:
 * - All uppercase (VIẾT HOA TOÀN BỘ)
 * - 1 line for KHỞI ĐỘNG, TĂNG TỐC, VỀ ĐÍCH, CÂU HỎI PHỤ
 * - Exactly 2 lines for VCNV:
 *     VƯỢT
 *     CHƯỚNG NGẠI VẬT
 * - Bold metallic gold & radiant cyan halo centered in the frame
 */
function renderRoundTitleToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  round?: string | null,
  fadeProgress: number = 0
): void {
  const cx = width / 2;
  const cy = height / 2;

  let titleLine1 = "ĐƯỜNG LÊN ĐỈNH OLYMPIA";
  let titleLine2: string | null = null;

  if (round === "khoiDong") {
    titleLine1 = "KHỞI ĐỘNG";
  } else if (round === "vcnv") {
    titleLine1 = "VƯỢT";
    titleLine2 = "CHƯỚNG NGẠI VẬT";
  } else if (round === "tangToc") {
    titleLine1 = "TĂNG TỐC";
  } else if (round === "veDich") {
    titleLine1 = "VỀ ĐÍCH";
  } else if (round === "cauHoiPhu") {
    titleLine1 = "CÂU HỎI PHỤ";
  }

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const fontSize = titleLine2 ? Math.round(width * 0.082) : Math.round(width * 0.096);
  ctx.font = `900 ${fontSize}px "Plus Jakarta Sans", "Montserrat", sans-serif`;
  ctx.letterSpacing = "0.08em";

  // Gold to amber metallic gradient
  const textGrad = ctx.createLinearGradient(0, cy - fontSize, 0, cy + fontSize);
  textGrad.addColorStop(0.0, "#ffffff");
  textGrad.addColorStop(0.2, "#fffbd0");
  textGrad.addColorStop(0.5, "#ffd700");
  textGrad.addColorStop(0.85, "#b45309");
  textGrad.addColorStop(1.0, "#78350f");

  // Deep dark drop shadow
  ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 6;
  ctx.lineWidth = 14;
  ctx.strokeStyle = "#160e02";

  if (titleLine2) {
    const y1 = cy - fontSize * 0.65;
    const y2 = cy + fontSize * 0.65;

    // Outer dark stroke
    ctx.strokeText(titleLine1, cx, y1);
    ctx.strokeText(titleLine2, cx, y2);

    // Cyan-gold radiant halo
    ctx.shadowColor = fadeProgress > 0.5 ? "rgba(255, 40, 70, 0.85)" : "rgba(0, 229, 255, 0.85)";
    ctx.shadowBlur = 32;
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#fffed4";
    ctx.strokeText(titleLine1, cx, y1);
    ctx.strokeText(titleLine2, cx, y2);

    ctx.fillStyle = textGrad;
    ctx.fillText(titleLine1, cx, y1);
    ctx.fillText(titleLine2, cx, y2);
  } else {
    // 1 single line centered
    ctx.strokeText(titleLine1, cx, cy);

    // Cyan-gold radiant halo
    ctx.shadowColor = fadeProgress > 0.5 ? "rgba(255, 40, 70, 0.85)" : "rgba(0, 229, 255, 0.85)";
    ctx.shadowBlur = 32;
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#fffed4";
    ctx.strokeText(titleLine1, cx, cy);

    ctx.fillStyle = textGrad;
    ctx.fillText(titleLine1, cx, cy);
  }

  ctx.restore();
}

/**
 * Render Live 4-Contestant Scoreboard on 3D Right Screen
 */
function renderScoreboardToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  seats?: any[],
  fadeProgress: number = 0
): void {
  const cx = width / 2;
  const bannerH = height * 0.16;

  ctx.save();
  const bannerGrad = ctx.createLinearGradient(0, 0, width, 0);
  bannerGrad.addColorStop(0, "rgba(0, 180, 255, 0.15)");
  bannerGrad.addColorStop(0.5, "rgba(0, 220, 255, 0.45)");
  bannerGrad.addColorStop(1, "rgba(0, 180, 255, 0.15)");
  ctx.fillStyle = bannerGrad;
  ctx.fillRect(0, 15, width, bannerH);

  ctx.strokeStyle = fadeProgress > 0.5 ? "#ff2a4b" : "#00e5ff";
  ctx.lineWidth = 3;
  ctx.strokeRect(30, 15, width - 60, bannerH);

  ctx.font = '900 46px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = fadeProgress > 0.5 ? "#ff2a4b" : "#00f0ff";
  ctx.shadowBlur = 18;
  ctx.fillText("BẢNG ĐIỂM THÍ SINH", cx, 15 + bannerH / 2);
  ctx.restore();

  const seatColors = ["#ef4444", "#3b82f6", "#eab308", "#10b981"];
  const startY = height * 0.25;
  const cardH = height * 0.15;
  const cardGap = height * 0.03;
  const cardW = width * 0.88;
  const cardX = (width - cardW) / 2;

  const validSeats = (seats && seats.length > 0) ? seats.slice(0, 4) : [
    { id: 0, name: "Thí sinh 1", score: 0 },
    { id: 1, name: "Thí sinh 2", score: 0 },
    { id: 2, name: "Thí sinh 3", score: 0 },
    { id: 3, name: "Thí sinh 4", score: 0 },
  ];

  validSeats.forEach((s: any, idx: number) => {
    const y = startY + idx * (cardH + cardGap);
    const col = seatColors[idx % 4];

    ctx.save();
    ctx.fillStyle = "rgba(10, 18, 40, 0.9)";
    ctx.fillRect(cardX, y, cardW, cardH);

    ctx.fillStyle = col;
    ctx.fillRect(cardX, y, 14, cardH);

    ctx.strokeStyle = "rgba(0, 229, 255, 0.4)";
    ctx.lineWidth = 2;
    ctx.strokeRect(cardX, y, cardW, cardH);

    ctx.font = '800 36px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 8;
    ctx.fillText(s.name, cardX + 32, y + cardH / 2);

    ctx.font = '900 44px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = "#ffd700";
    ctx.textAlign = "right";
    ctx.shadowColor = "#f59e0b";
    ctx.shadowBlur = 12;
    ctx.fillText(`${s.score ?? 0}`, cardX + cardW - 32, y + cardH / 2);

    ctx.restore();
  });
}

/**
 * Render Live Broadcast Round Graphics onto Stage Right Screen Canvas
 */
function renderRoundGraphicsToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: any,
  fadeProgress: number = 0
): void {
  const cx = width / 2;
  const round = state?.currentRound;

  // 1. VCNV Answers Revealed -> Vertical Brass Rail with 4 Staggered Plaques
  if (round === "vcnv" && state.vcnv?.answersRevealed) {
    ctx.save();
    ctx.font = '900 44px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = "#ffd700";
    ctx.textAlign = "center";
    ctx.fillText("VƯỢT CHƯỚNG NGẠI VẬT — ĐÁP ÁN", cx, 60);

    // Central brass rod
    const rodW = 18;
    const rodGrad = ctx.createLinearGradient(cx - rodW / 2, 0, cx + rodW / 2, 0);
    rodGrad.addColorStop(0, "#78350f");
    rodGrad.addColorStop(0.4, "#fef08a");
    rodGrad.addColorStop(0.7, "#d97706");
    rodGrad.addColorStop(1, "#451a03");
    ctx.fillStyle = rodGrad;
    ctx.fillRect(cx - rodW / 2, 110, rodW, height - 150);

    const seats = state.seats?.slice(0, 4) || [];
    const plaqueH = 80;
    const plaqueW = width * 0.40;
    const startY = 130;
    const gapY = (height - 230) / 4;

    seats.forEach((s: any, idx: number) => {
      const isRight = idx % 2 === 0;
      const py = startY + idx * gapY;
      const px = isRight ? cx + 20 : cx - 20 - plaqueW;
      const ans = state.vcnv?.answers?.[s.id]?.text || "";

      // Rivet
      ctx.beginPath();
      ctx.arc(cx, py + plaqueH / 2, 16, 0, Math.PI * 2);
      ctx.fillStyle = "#ef4444";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Plaque body
      ctx.fillStyle = "#0f172a";
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(px, py, plaqueW, plaqueH, 40);
      ctx.fill();
      ctx.stroke();

      // Name chip
      ctx.fillStyle = "#f8fafc";
      ctx.font = '800 22px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText(s.name, px + plaqueW / 2, py + 26);

      // Answer text
      ctx.fillStyle = "#ffffff";
      ctx.font = '900 32px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(ans, px + plaqueW / 2, py + 62);
    });
    ctx.restore();
    return;
  }

  // 2. TĂNG TỐC Ranking Revealed -> Vertical Brass Rail with 4 Ranked Plaques
  if (round === "tangToc" && state.tangToc?.phase === "ranking") {
    ctx.save();
    ctx.font = '900 44px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = "#ffd700";
    ctx.textAlign = "center";
    ctx.fillText("TĂNG TỐC — KẾT QUẢ TRẢ LỜI", cx, 60);

    const rodW = 18;
    const rodGrad = ctx.createLinearGradient(cx - rodW / 2, 0, cx + rodW / 2, 0);
    rodGrad.addColorStop(0, "#78350f");
    rodGrad.addColorStop(0.4, "#fef08a");
    rodGrad.addColorStop(0.7, "#d97706");
    rodGrad.addColorStop(1, "#451a03");
    ctx.fillStyle = rodGrad;
    ctx.fillRect(cx - rodW / 2, 110, rodW, height - 150);

    const ranking = state.tangToc?.ranking || [];
    const plaqueH = 82;
    const plaqueW = width * 0.78;
    const px = (width - plaqueW) / 2;
    const startY = 130;
    const gapY = (height - 230) / 4;

    ranking.forEach((r: any, idx: number) => {
      const py = startY + idx * gapY;
      const s = state.seats?.[r.seat];
      const ans = r.noAnswer ? "" : r.answer;
      const sec = r.noAnswer ? "" : `${(r.ms / 1000).toFixed(2)}s`;

      ctx.beginPath();
      ctx.arc(cx, py + plaqueH / 2, 14, 0, Math.PI * 2);
      ctx.fillStyle = "#ef4444";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = r.wrong ? "#2b0d12" : "#0f172a";
      ctx.strokeStyle = r.wrong ? "#ef4444" : "#cbd5e1";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(px, py, plaqueW, plaqueH, 40);
      ctx.fill();
      ctx.stroke();

      ctx.font = '800 26px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = "#f8fafc";
      ctx.textAlign = "left";
      ctx.fillText(s?.name || `TS ${r.seat + 1}`, px + 36, py + plaqueH / 2);

      ctx.font = '900 32px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(ans, cx, py + plaqueH / 2);

      ctx.font = '800 24px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = "#f59e0b";
      ctx.textAlign = "right";
      ctx.fillText(sec, px + plaqueW - 36, py + plaqueH / 2);
    });
    ctx.restore();
    return;
  }

  // 3. VCNV Crossword / 4 Rows
  if (round === "vcnv" && state.vcnv?.rows) {
    ctx.save();
    ctx.font = '900 44px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = "#ffd700";
    ctx.textAlign = "center";
    ctx.fillText("VƯỢT CHƯỚNG NGẠI VẬT", cx, 60);

    const startY = 140;
    const rowH = 70;
    const gapY = 24;

    state.vcnv.rows.forEach((r: any, rIdx: number) => {
      const y = startY + rIdx * (rowH + gapY);
      const isCur = state.vcnv?.currentRow === rIdx;
      const count = parseVcnvAnswer(r.answer || "       ").primary.replace(/\s/g, "").length || 7;
      const btnR = 24;
      const btnGap = 12;
      const totalW = count * (btnR * 2 + btnGap);
      let btnX = cx - totalW / 2 + btnR;

      ctx.fillStyle = isCur ? "#0284c7" : "#0369a1";
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cx + totalW / 2 + 20, y - btnR, 50, 50, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.font = '900 28px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${rIdx + 1}`, cx + totalW / 2 + 45, y);

      for (let c = 0; c < count; c++) {
        const bGrad = ctx.createRadialGradient(btnX - 6, y - 6, 2, btnX, y, btnR);
        bGrad.addColorStop(0, "#475569");
        bGrad.addColorStop(0.5, "#1e293b");
        bGrad.addColorStop(1, "#020617");
        ctx.fillStyle = bGrad;
        ctx.strokeStyle = isCur ? "#f59e0b" : "#64748b";
        ctx.lineWidth = isCur ? 3 : 2;
        ctx.beginPath();
        ctx.arc(btnX, y, btnR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        if (r.opened) {
          ctx.fillStyle = "#ffd700";
          ctx.font = '900 26px "Plus Jakarta Sans", sans-serif';
          ctx.fillText((r.answer[c] || "").toUpperCase(), btnX, y);
        }
        btnX += btnR * 2 + btnGap;
      }
    });

    const curIdx = state.vcnv?.currentRow ?? -1;
    const curHint = curIdx >= 0 && curIdx < 4 ? state.vcnv?.rows[curIdx]?.hint : state.vcnv?.centerQuestion?.q;
    if (curHint) {
      const qBoxY = height - 150;
      ctx.fillStyle = "rgba(10, 18, 40, 0.95)";
      ctx.strokeStyle = "#d4af37";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(40, qBoxY, width - 80, 120, 16);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = '700 32px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(curHint, cx, qBoxY + 60);
    }
    ctx.restore();
    return;
  }
}

/**
 * Render Requirement R5 3D Flip Clock on Stage Right Screen Canvas during practical countdowns.
 * Design:
 * - Sapphire Navy / Charcoal background with gold metallic Olympia trim
 * - Distinct flip cards for tens and units (or unified two-digit flip card)
 * - Realistic 3D flip animation per second (folding top half down with perspective scaling and dynamic drop shadow)
 * - Header: "THỜI GIAN THỰC HÀNH" (or "CHUÔNG CƯỚP ĐIỂM") in Gold Metallic
 * - Subtitle: "GIÂY" in golden warm yellow
 */
function render3DFlipClockToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: OlympiaState | null | undefined,
  timeSec: number = 0
): void {
  const vd = state?.veDich;
  if (!vd) return;

  const isStealing = vd.phase === "stealing";
  const timer = isStealing ? vd.steal?.timer : vd.timer;
  const startedAt = timer?.startedAt || (timeSec > 0 ? timeSec * 1000 : Date.now());
  const totalMs = timer?.totalMs || (isStealing ? 20000 : 30000);
  const wallNow = Date.now();
  const elapsedMs = Math.max(0, wallNow - startedAt);
  const remainMs = Math.max(0, totalMs - elapsedMs);
  const remainSec = Math.max(0, Math.ceil(remainMs / 1000));
  const currentSecFrac = (elapsedMs % 1000) / 1000; // 0.0 to 1.0 progress through current second

  const cx = width / 2;
  const cy = height / 2;

  // 1. Deep Cosmic Sapphire / Obsidian Background
  const bgGrad = ctx.createRadialGradient(cx, cy * 0.9, 60, cx, cy, width * 0.7);
  bgGrad.addColorStop(0, "#081b3b"); // Sapphire deep core
  bgGrad.addColorStop(0.5, "#030a1c");
  bgGrad.addColorStop(1, "#01040d"); // Near black obsidian
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle stardust backdrop
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  for (let i = 0; i < 40; i++) {
    const sx = ((i * 137.5) % width);
    const sy = ((i * 83.3) % height);
    const s = (i % 3) * 0.8 + 0.8;
    ctx.fillRect(sx, sy, s, s);
  }

  // 2. Outer Golden Metallic Bevel Frame (Olympia Signature Styling)
  const clockW = Math.min(width * 0.72, 680);
  const clockH = Math.min(height * 0.68, 380);
  const clockX = cx - clockW / 2;
  const clockY = cy - clockH / 2 + 25;

  ctx.save();
  // Golden Ambient Aura / Drop Shadow
  ctx.shadowColor = isStealing ? "rgba(239, 68, 68, 0.55)" : "rgba(245, 158, 11, 0.55)";
  ctx.shadowBlur = 35;
  ctx.shadowOffsetY = 10;

  // Frame Border Gradient
  const frameGrad = ctx.createLinearGradient(clockX, clockY, clockX + clockW, clockY + clockH);
  frameGrad.addColorStop(0.0, "#fef08a"); // Light gold
  frameGrad.addColorStop(0.25, "#f59e0b"); // Warm gold
  frameGrad.addColorStop(0.5, "#b45309"); // Deep bronze
  frameGrad.addColorStop(0.75, "#fbbf24"); // Radiant gold
  frameGrad.addColorStop(1.0, "#78350f"); // Dark metallic trim

  ctx.fillStyle = frameGrad;
  ctx.beginPath();
  ctx.roundRect(clockX, clockY, clockW, clockH, 20);
  ctx.fill();
  ctx.restore();

  // Inner Frame Inset Cavity
  const insetPad = 12;
  const innerX = clockX + insetPad;
  const innerY = clockY + insetPad;
  const innerW = clockW - insetPad * 2;
  const innerH = clockH - insetPad * 2;

  ctx.save();
  const innerGrad = ctx.createLinearGradient(0, innerY, 0, innerY + innerH);
  innerGrad.addColorStop(0, "#050d1e");
  innerGrad.addColorStop(0.5, "#0b1528");
  innerGrad.addColorStop(1, "#020713");
  ctx.fillStyle = innerGrad;
  ctx.beginPath();
  ctx.roundRect(innerX, innerY, innerW, innerH, 14);
  ctx.fill();

  // Inner metallic rim stroke
  ctx.strokeStyle = "rgba(245, 158, 11, 0.35)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // 3. Header Title Badge: "THỜI GIAN THỰC HÀNH" / "CHUÔNG CƯỚP ĐIỂM"
  ctx.save();
  const titleText = isStealing ? "⚡ CHUÔNG CƯỚP ĐIỂM ⚡" : "THỜI GIAN THỰC HÀNH";
  const titleY = clockY - 32;
  ctx.font = '900 36px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const titleGrad = ctx.createLinearGradient(0, titleY - 18, 0, titleY + 18);
  titleGrad.addColorStop(0.0, "#ffffff");
  titleGrad.addColorStop(0.3, "#fef08a");
  titleGrad.addColorStop(0.7, "#f59e0b");
  titleGrad.addColorStop(1.0, "#b45309");

  ctx.shadowColor = isStealing ? "#ef4444" : "#f59e0b";
  ctx.shadowBlur = 18;
  ctx.fillStyle = titleGrad;
  ctx.fillText(titleText, cx, titleY);
  ctx.restore();

  // 4. Two Flip Digit Cards (Tens and Units)
  const tens = Math.floor(remainSec / 10);
  const units = remainSec % 10;
  const nextSec = Math.max(0, remainSec - 1);
  const nextTens = Math.floor(nextSec / 10);
  const nextUnits = nextSec % 10;

  // Flip window: last 350ms of each second (secFrac 0.65 -> 1.0)
  const isFlipping = currentSecFrac >= 0.65;
  const flipProgress = isFlipping ? (currentSecFrac - 0.65) / 0.35 : 0;

  const cardGap = 20;
  const cardW = (innerW - 50 - cardGap) / 2;
  const cardH = innerH - 40;
  const cardY = innerY + 20;
  const cardX1 = innerX + 25;
  const cardX2 = cardX1 + cardW + cardGap;

  // Helper to render one 3D flip card
  const drawFlipCard = (cardX: number, currDigit: number, nextDigit: number, shouldFlip: boolean) => {
    const cardCx = cardX + cardW / 2;
    const cardCy = cardY + cardH / 2;
    const halfH = cardH / 2;

    // Card Base Background
    ctx.save();
    ctx.fillStyle = "#090e1a"; // Dark charcoal navy
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 12);
    ctx.fill();
    ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Digit Font Setup
    const fontSize = Math.round(cardH * 0.72);
    ctx.font = `900 ${fontSize}px "Plus Jakarta Sans", "Montserrat", "Arial Black", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // ── Static Lower Half (shows nextDigit when flipping, or currDigit when resting) ──
    ctx.save();
    ctx.beginPath();
    ctx.rect(cardX, cardCy, cardW, halfH);
    ctx.clip();
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 10;
    ctx.fillText(String(shouldFlip ? nextDigit : currDigit), cardCx, cardCy);
    ctx.restore();

    // ── Static Upper Half (shows currDigit before flip completes) ──
    ctx.save();
    ctx.beginPath();
    ctx.rect(cardX, cardY, cardW, halfH);
    ctx.clip();
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 10;
    ctx.fillText(String(currDigit), cardCx, cardCy);
    ctx.restore();

    // ── Dynamic 3D Flipping Flap ──
    if (shouldFlip && isFlipping) {
      const flipAngle = flipProgress * Math.PI; // 0 to PI

      if (flipAngle < Math.PI / 2) {
        // Upper flap folding down towards viewer (0 -> 90 deg)
        const scaleY = Math.cos(flipAngle);
        ctx.save();
        ctx.beginPath();
        ctx.rect(cardX, cardY, cardW, halfH);
        ctx.clip();
        ctx.translate(cardCx, cardCy);
        ctx.scale(1, scaleY);
        ctx.translate(-cardCx, -cardCy);

        // Darkening shadow as it folds forward away from top light
        ctx.fillStyle = "#0a101f";
        ctx.fillRect(cardX, cardY, cardW, halfH);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.3, 1 - flipProgress)})`;
        ctx.fillText(String(currDigit), cardCx, cardCy);
        ctx.fillStyle = `rgba(0, 0, 0, ${flipProgress * 0.75})`;
        ctx.fillRect(cardX, cardY, cardW, halfH);
        ctx.restore();
      } else {
        // Lower flap folding in from top (90 -> 180 deg)
        const scaleY = -Math.cos(flipAngle);
        ctx.save();
        ctx.beginPath();
        ctx.rect(cardX, cardCy, cardW, halfH);
        ctx.clip();
        ctx.translate(cardCx, cardCy);
        ctx.scale(1, scaleY);
        ctx.translate(-cardCx, -cardCy);

        ctx.fillStyle = "#090e1a";
        ctx.fillRect(cardX, cardY, cardW, halfH);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1.0, (flipProgress - 0.5) * 2)})`;
        ctx.fillText(String(nextDigit), cardCx, cardCy);
        ctx.fillStyle = `rgba(0, 0, 0, ${(1 - flipProgress) * 0.75})`;
        ctx.fillRect(cardX, cardY, cardW, halfH);
        ctx.restore();
      }
    }

    // ── Horizontal Center Divider Slot & Side Rivets ──
    ctx.fillStyle = "#01040a";
    ctx.fillRect(cardX, cardCy - 2, cardW, 4);
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    ctx.fillRect(cardX, cardCy + 2, cardW, 1);

    // Left and Right Hinge Rivets (Gold)
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.arc(cardX + 4, cardCy, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cardX + cardW - 4, cardCy, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  const isTensFlipping = tens !== nextTens;
  drawFlipCard(cardX1, tens, nextTens, isTensFlipping);
  drawFlipCard(cardX2, units, nextUnits, true);

  // 5. Bottom "GIÂY" Subtitle
  ctx.save();
  ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = "#fbbf24";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.letterSpacing = "0.2em";
  ctx.shadowColor = "#f59e0b";
  ctx.shadowBlur = 10;
  ctx.fillText("GIÂY", cx, clockY + clockH + 26);
  ctx.restore();
}

/**
 * Pre-rendered Rectangular Secondary LED Display (Stage Right, facing Contestants)
 * Shows either the official Olympia 2016 logo, round title card, or active round question.
 */
/**
 * Renders Luminous Royal Blue to Electric Cerulean Gradient Background with Diagonal Light Sheen.
 * Fully authentic to VTV3 Đường lên đỉnh Olympia Year 27 broadcast studio graphics (Reference Images 1, 2, 3, 4).
 * Features bilateral lateral gradients (rich vibrant sapphire flanking edges, luminous electric core, and scanlines).
 */
function renderVibrantBlueGradientWithSheen(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  fadeProgress: number = 0,
  timeSec: number = 0
): void {
  const redMix = Math.max(0, Math.min(1, fadeProgress));
  const isRed = redMix > 0.5;

  // 1. Bilateral horizontal base gradient (luminous electric blue in center, rich royal blue on both flanks)
  const baseGrad = ctx.createLinearGradient(0, 0, width, 0);
  // Vibrant broadcast electric sapphire (matching reference Images 1, 2, 6)
  baseGrad.addColorStop(0.0, "#063bb8");
  baseGrad.addColorStop(0.20, "#0b50dd");
  baseGrad.addColorStop(0.50, "#257fff");
  baseGrad.addColorStop(0.80, "#0b50dd");
  baseGrad.addColorStop(1.0, "#063bb8");
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, width, height);

  // Smooth crossfade overlay into fiery ruby-crimson during Blue <-> Red transition
  if (redMix > 0.005) {
    ctx.save();
    ctx.globalAlpha = redMix;
    const redBaseGrad = ctx.createLinearGradient(0, 0, width, 0);
    redBaseGrad.addColorStop(0.0, "#4a040b");
    redBaseGrad.addColorStop(0.22, "#881320");
    redBaseGrad.addColorStop(0.50, "#dc2626");
    redBaseGrad.addColorStop(0.78, "#881320");
    redBaseGrad.addColorStop(1.0, "#4a040b");
    ctx.fillStyle = redBaseGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // 2. Vertical modulation gradient (soft top & bottom broadcast framing)
  const vertGrad = ctx.createLinearGradient(0, 0, 0, height);
  vertGrad.addColorStop(0.0, "rgba(3, 18, 65, 0.40)");
  vertGrad.addColorStop(0.35, "rgba(56, 189, 248, 0.22)");
  vertGrad.addColorStop(0.65, "rgba(37, 99, 235, 0.18)");
  vertGrad.addColorStop(1.0, "rgba(3, 18, 65, 0.40)");
  ctx.fillStyle = vertGrad;
  ctx.fillRect(0, 0, width, height);

  if (redMix > 0.005) {
    ctx.save();
    ctx.globalAlpha = redMix;
    const redVertGrad = ctx.createLinearGradient(0, 0, 0, height);
    redVertGrad.addColorStop(0.0, "rgba(20, 2, 5, 0.45)");
    redVertGrad.addColorStop(0.35, "rgba(239, 68, 68, 0.20)");
    redVertGrad.addColorStop(0.65, "rgba(220, 38, 38, 0.15)");
    redVertGrad.addColorStop(1.0, "rgba(20, 2, 5, 0.45)");
    ctx.fillStyle = redVertGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // 3. Dynamic sweeping diagonal light beam (Images 1, 2, 6)
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const sheenShift = Math.sin(timeSec * 0.5) * (width * 0.08);
  const beamGrad = ctx.createLinearGradient(
    -width * 0.15 + sheenShift,
    height * 1.15,
    width * 0.95 + sheenShift,
    -height * 0.15
  );
  beamGrad.addColorStop(0.0, "rgba(255, 255, 255, 0.0)");
  beamGrad.addColorStop(0.35, isRed ? "rgba(254, 205, 211, 0.15)" : "rgba(186, 230, 253, 0.18)");
  beamGrad.addColorStop(0.50, isRed ? "rgba(255, 255, 255, 0.42)" : "rgba(255, 255, 255, 0.45)");
  beamGrad.addColorStop(0.65, isRed ? "rgba(244, 63, 94, 0.18)" : "rgba(56, 189, 248, 0.20)");
  beamGrad.addColorStop(1.0, "rgba(255, 255, 255, 0.0)");
  ctx.fillStyle = beamGrad;
  ctx.fillRect(0, 0, width, height);

  // 4. Subtle horizontal LED scanlines raster (Image 6: horizontal TV pitch texture)
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
  for (let y = 0; y < height; y += 4) {
    ctx.fillRect(0, y, width, 1.5);
  }
  ctx.restore();
}

/**
 * Preloaded Title Card PNG Cache using authentic UTM Neutra 3D Typography.
 * Eliminates client-side font download glitches and guarantees 100% broadcast fidelty.
 */
const TITLE_IMAGE_CACHE: Record<string, HTMLImageElement> = {};

function getOrLoadTitleImage(key: string, onLoaded?: () => void): HTMLImageElement | null {
  if (typeof window === "undefined") return null;
  if (TITLE_IMAGE_CACHE[key]) {
    return TITLE_IMAGE_CACHE[key];
  }
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = `/olympia/led_titles/led_title_${key}.png`;
  img.onload = () => {
    TITLE_IMAGE_CACHE[key] = img;
    onLoaded?.();
  };
  TITLE_IMAGE_CACHE[key] = img;
  return img;
}

/**
 * Renders 3D Embossed Bold White Typography (Images 1 & 2).
 * Features multi-tier dark depth extrusions, crisp pure white face, embossed border, and soft outer bloom.
 */
function render3DTitleCardToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  titleText: string,
  fadeProgress: number = 0
): void {
  const cx = width / 2;
  const cy = height / 2;
  const isRed = fadeProgress > 0.5;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Dynamic sizing based on length to guarantee perfect broadcast framing
  let fontSize = Math.round(width * 0.095);
  if (titleText.length > 18) {
    fontSize = Math.round(width * 0.064);
  } else if (titleText.length > 12) {
    fontSize = Math.round(width * 0.078);
  }

  ctx.font = `900 ${fontSize}px "Plus Jakarta Sans", "Montserrat", "Segoe UI", sans-serif`;
  ctx.letterSpacing = "0.04em";

  // 1. Multi-tier deep 3D drop extrusions (depth stack)
  for (let s = 6; s >= 1; s--) {
    ctx.fillStyle = isRed ? "rgba(35, 2, 7, 0.88)" : "rgba(2, 8, 30, 0.90)";
    ctx.fillText(titleText, cx, cy + s * 2.4);
  }

  // 2. Ambient outer soft cyan/ruby halo
  ctx.shadowColor = isRed ? "rgba(244, 63, 94, 0.55)" : "rgba(34, 211, 238, 0.55)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 4;
  ctx.strokeStyle = isRed ? "rgba(254, 205, 211, 0.88)" : "rgba(224, 242, 254, 0.92)";
  ctx.lineWidth = Math.max(3, fontSize * 0.05);
  ctx.strokeText(titleText, cx, cy);

  // 3. Crisp Pure White 3D Text Fill
  const textGrad = ctx.createLinearGradient(0, cy - fontSize * 0.5, 0, cy + fontSize * 0.5);
  textGrad.addColorStop(0.0, "#ffffff");
  textGrad.addColorStop(0.70, "#f8fafc");
  textGrad.addColorStop(1.0, isRed ? "#fecdd3" : "#e0f2fe");
  ctx.shadowColor = "transparent";
  ctx.fillStyle = textGrad;
  ctx.fillText(titleText, cx, cy);

  // 4. Fine Top Bevel Highlight
  ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
  ctx.lineWidth = 1.4;
  ctx.strokeText(titleText, cx, cy - 1.0);

  ctx.restore();
}

export const RIGHT_SCREEN_DELAY_MS = 200;

export function hasActiveRightQuestionContent(state?: OlympiaState | null): boolean {
  if (!state || state.stage !== "playing") return false;
  const round = state.currentRound;
  if (round === "khoiDong") {
    return Boolean(
      state.khoiDong?.current?.q &&
        (state.khoiDong.questionRevealed || state.khoiDong.started || state.khoiDong.phase === "question")
    );
  }
  if (round === "vcnv") {
    const v = state.vcnv;
    if (!v) return false;
    if (v.answersRevealed) return true;
    const cur = v.currentRow ?? -1;
    if (cur < 0) return false;
    return v.phase === "selecting" || v.phase === "question" || v.phase === "waitingAnswer" || v.phase === "answers";
  }
  if (round === "tangToc") {
    const tt = state.tangToc;
    return Boolean(tt && tt.qIdx != null && tt.qIdx >= 0 && tt.phase === "question");
  }
  if (round === "veDich") {
    const vd = state.veDich;
    return Boolean(
      vd?.current?.q?.q &&
        (vd.phase === "thinking" || vd.phase === "stealing" || vd.phase === "result")
    );
  }
  if (round === "cauHoiPhu") {
    const chp = state.cauHoiPhu;
    return Boolean(
      chp &&
        chp.qIdx != null &&
        chp.qIdx >= 0 &&
        chp.questions?.[chp.qIdx]?.q &&
        chp.phase !== "idle"
    );
  }
  return false;
}

export function resolveRightScreenDisplayMode(
  state?: OlympiaState | null
): Exclude<OlympiaRightScreenMode, "auto"> {
  const explicit: OlympiaRightScreenMode = state?.rightScreenMode || "auto";

  if (explicit === "camera") return "camera";
  if (explicit === "logo") return "logo";
  if (explicit === "roundTitle") return "roundTitle";
  if (explicit === "scoreboard") return "scoreboard";
  if (explicit === "roundGraphics") return "roundGraphics";

  if (explicit === "question") {
    if (hasActiveRightQuestionContent(state)) return "question";
    return state?.stage === "playing" && state?.currentRound ? "roundTitle" : "logo";
  }

  // Dynamic "auto" mode routing by live match state
  if (state?.showScoreboard || state?.summaryState?.active || state?.awardsState?.active) {
    return "scoreboard";
  }
  if (isPreMatchIdle(state)) {
    return "logo";
  }
  if (state?.banner || !state?.roundIntroDoneAt || state?.introStandby || state?.entranceState?.active) {
    return "roundTitle";
  }
  if (hasActiveRightQuestionContent(state)) {
    return "question";
  }
  if (state?.currentRound && state.roundStatus?.[state.currentRound] === "done") {
    return "scoreboard";
  }
  if (state?.currentRound) {
    return "roundGraphics";
  }
  return "roundTitle";
}

function getRoundDisplayTitleAndKey(round?: OlympiaState["currentRound"] | null): {
  titleKey: string;
  displayTitle: string;
} {
  if (round === "khoiDong") return { titleKey: "khoidong", displayTitle: "KHỞI ĐỘNG" };
  if (round === "vcnv") return { titleKey: "vcnv", displayTitle: "VƯỢT CHƯỚNG NGẠI VẬT" };
  if (round === "tangToc") return { titleKey: "tangtoc", displayTitle: "TĂNG TỐC" };
  if (round === "veDich") return { titleKey: "vedich", displayTitle: "VỀ ĐÍCH" };
  if (round === "cauHoiPhu") return { titleKey: "cauhoiphu", displayTitle: "CÂU HỎI PHỤ" };
  return { titleKey: "olympia", displayTitle: "ĐƯỜNG LÊN ĐỈNH OLYMPIA" };
}

function drawWrappedCenterText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  startY: number,
  maxW: number,
  lineH: number,
  maxBottomY: number
): void {
  const words = text.trim().split(/\s+/);
  let line = "";
  let y = startY;
  for (let i = 0; i < words.length; i++) {
    const testLine = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(testLine).width > maxW && line) {
      ctx.fillText(line, cx, y);
      line = words[i];
      y += lineH;
      if (y > maxBottomY) break;
    } else {
      line = testLine;
    }
  }
  if (line && y <= maxBottomY) {
    ctx.fillText(line, cx, y);
  }
}

function renderOlympiaLogoCardToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  logoImg: HTMLImageElement | null,
  fadeProgress: number
): void {
  const cx = width / 2;
  const cy = height / 2;
  const isRed = fadeProgress > 0.5;
  const titleImg = TITLE_IMAGE_CACHE["olympia"] || getOrLoadTitleImage("olympia");

  if (titleImg && titleImg.complete && titleImg.naturalWidth > 0 && !logoImg) {
    ctx.drawImage(titleImg, 0, 0, width, height);
    return;
  }

  ctx.save();
  // Soft luminous crest behind Olympia emblem
  const auraGrad = ctx.createRadialGradient(cx, cy * 0.88, 20, cx, cy * 0.88, height * 0.52);
  auraGrad.addColorStop(0, isRed ? "rgba(255, 80, 110, 0.38)" : "rgba(56, 189, 248, 0.42)");
  auraGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = auraGrad;
  ctx.fillRect(0, 0, width, height);

  if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
    const maxLogoH = height * 0.52;
    const scale = Math.min((width * 0.58) / logoImg.naturalWidth, maxLogoH / logoImg.naturalHeight);
    const dw = logoImg.naturalWidth * scale;
    const dh = logoImg.naturalHeight * scale;
    ctx.shadowColor = isRed ? "rgba(255, 60, 90, 0.6)" : "rgba(0, 240, 255, 0.55)";
    ctx.shadowBlur = 24;
    ctx.drawImage(logoImg, cx - dw / 2, height * 0.14, dw, dh);
    ctx.shadowBlur = 0;
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `900 ${Math.round(height * 0.088)}px "Plus Jakarta Sans", "Montserrat", sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = isRed ? "#ff2a4b" : "#00e5ff";
  ctx.shadowBlur = 18;
  ctx.fillText("ĐƯỜNG LÊN ĐỈNH OLYMPIA", cx, height * 0.78);

  ctx.shadowBlur = 0;
  ctx.font = `700 ${Math.round(height * 0.042)}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = "#fde68a";
  ctx.fillText("QUIZORRA STUDIO", cx, height * 0.88);
  ctx.restore();
}

function renderRoundTitleSlideToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: OlympiaState | null | undefined,
  fadeProgress: number
): void {
  const { titleKey, displayTitle } = getRoundDisplayTitleAndKey(state?.currentRound);
  const titleImg = TITLE_IMAGE_CACHE[titleKey] || getOrLoadTitleImage(titleKey);
  if (titleImg && titleImg.complete && titleImg.naturalWidth > 0) {
    ctx.drawImage(titleImg, 0, 0, width, height);
  } else {
    render3DTitleCardToCanvas(ctx, width, height, displayTitle, fadeProgress);
  }
}

function renderRightScoreboardToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: OlympiaState | null | undefined,
  fadeProgress: number
): void {
  const isRed = fadeProgress > 0.5;
  const accent = isRed ? "#fb7185" : "#38bdf8";
  const seats = (state?.seats || []).slice(0, 8);
  const ranked = seats
    .map((s, idx) => ({ seat: s, idx }))
    .sort((a, b) => (b.seat?.score ?? 0) - (a.seat?.score ?? 0) || a.idx - b.idx);

  ctx.save();
  ctx.fillStyle = isRed ? "rgba(60, 10, 22, 0.72)" : "rgba(8, 22, 54, 0.72)";
  ctx.strokeStyle = isRed ? "rgba(251, 113, 133, 0.7)" : "rgba(56, 189, 248, 0.7)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(width * 0.06, height * 0.045, width * 0.88, height * 0.145, 16);
  ctx.fill();
  ctx.stroke();

  ctx.font = `900 ${Math.round(height * 0.068)}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = "#fde047";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(250, 204, 21, 0.45)";
  ctx.shadowBlur = 16;
  ctx.fillText("BẢNG ĐIỂM THÍ SINH", width / 2, height * 0.118);
  ctx.restore();

  if (ranked.length === 0) return;

  const isTwoCol = ranked.length > 4;
  const cols = isTwoCol ? 2 : 1;
  const rowsPerCol = Math.ceil(ranked.length / cols);
  const startY = height * 0.225;
  const availH = height * 0.72;
  const gapY = Math.round(height * 0.022);
  const rowH = Math.min(Math.round((availH - gapY * (rowsPerCol - 1)) / rowsPerCol), Math.round(height * 0.165));
  const areaX = width * 0.06;
  const areaW = width * 0.88;
  const gapX = isTwoCol ? width * 0.03 : 0;
  const cardW = (areaW - gapX * (cols - 1)) / cols;

  ranked.forEach(({ seat, idx }, rankIdx) => {
    const col = isTwoCol ? Math.floor(rankIdx / rowsPerCol) : 0;
    const row = isTwoCol ? rankIdx % rowsPerCol : rankIdx;
    const x = areaX + col * (cardW + gapX);
    const y = startY + row * (rowH + gapY);
    const isLeader = rankIdx === 0 && (seat?.score ?? 0) > 0;

    ctx.save();
    ctx.fillStyle = isLeader ? "rgba(180, 120, 12, 0.28)" : "rgba(6, 15, 38, 0.82)";
    ctx.strokeStyle = isLeader ? "#facc15" : accent;
    ctx.lineWidth = isLeader ? 3 : 2;
    ctx.beginPath();
    ctx.roundRect(x, y, cardW, rowH, 14);
    ctx.fill();
    ctx.stroke();

    const badgeSize = Math.round(rowH * 0.62);
    ctx.fillStyle = isLeader ? "#facc15" : isRed ? "#e11d48" : "#0284c7";
    ctx.beginPath();
    ctx.roundRect(x + 14, y + (rowH - badgeSize) / 2, badgeSize, badgeSize, 10);
    ctx.fill();

    ctx.font = `900 ${Math.round(badgeSize * 0.56)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = isLeader ? "#0f172a" : "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${idx + 1}`, x + 14 + badgeSize / 2, y + rowH / 2);

    ctx.font = `800 ${Math.round(rowH * 0.36)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = "#f8fafc";
    ctx.textAlign = "left";
    const nameStr = seat?.name || `Thí sinh ${idx + 1}`;
    ctx.fillText(nameStr, x + badgeSize + 30, y + (seat?.school ? rowH * 0.36 : rowH / 2));

    if (seat?.school) {
      ctx.font = `600 ${Math.round(rowH * 0.24)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = "#bae6fd";
      ctx.fillText(seat.school, x + badgeSize + 30, y + rowH * 0.70);
    }

    ctx.font = `900 ${Math.round(rowH * 0.50)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = "#fde047";
    ctx.textAlign = "right";
    ctx.fillText(`${seat?.score ?? 0}`, x + cardW - 20, y + rowH / 2);
    ctx.restore();
  });
}

function renderRightRoundStatusGraphicsToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: OlympiaState | null | undefined,
  fadeProgress: number,
  timeSec: number
): void {
  const round = state?.currentRound;
  if (
    (round === "vcnv" && (state?.vcnv?.answersRevealed || state?.vcnv?.rows)) ||
    (round === "tangToc" && state?.tangToc?.phase === "ranking")
  ) {
    renderRoundGraphicsToCanvas(ctx, width, height, state, fadeProgress);
    return;
  }

  const cx = width / 2;
  const isRed = fadeProgress > 0.5;
  const accent = isRed ? "#fb7185" : "#00e5ff";
  const { displayTitle } = getRoundDisplayTitleAndKey(round);

  let subtitle = "CHUẨN BỊ THI ĐẤU";
  const statusLines: string[] = [];

  if (round === "khoiDong" && state?.khoiDong) {
    const kd = state.khoiDong;
    const seg = kd.segments?.[kd.segIdx ?? 0];
    if (seg?.kind === "solo" && seg.seat != null) {
      const seat = state.seats?.[seg.seat];
      subtitle = `LƯỢT RIÊNG — ${seat?.name || `THÍ SINH ${seg.seat + 1}`}`.toUpperCase();
    } else if (seg?.kind === "shared") {
      subtitle = "KHỞI ĐỘNG CHUNG";
    }
    const qTotal = seg?.questions ?? 0;
    const qCur = Math.max(0, (kd.qIdx ?? -1) + 1);
    if (qTotal > 0 && qTotal < 900) statusLines.push(`Câu ${qCur} / ${qTotal}`);
    else if (qCur > 0) statusLines.push(`Câu ${qCur}`);
    if (kd.buzzedSeat != null) {
      statusLines.push(`Chuông: ${state.seats?.[kd.buzzedSeat]?.name || `TS ${kd.buzzedSeat + 1}`}`);
    }
  } else if (round === "tangToc" && state?.tangToc) {
    const tt = state.tangToc;
    const qNum = Math.max(1, (tt.qIdx ?? 0) + 1);
    subtitle = `CÂU HỎI TĂNG TỐC SỐ ${qNum} / ${tt.questions?.length || 4}`;
    const qObj = tt.questions?.[tt.qIdx ?? 0];
    if (qObj?.category === "iq") statusLines.push("Dạng câu: Tư duy logic (IQ)");
    else if (qObj?.category === "data") statusLines.push("Dạng câu: Dữ kiện mở dần");
    else if (qObj?.category === "arrange") statusLines.push("Dạng câu: Sắp xếp thứ tự");
    const subCount = Object.keys(tt.submissions || {}).length;
    if (subCount > 0) statusLines.push(`Đã nộp đáp án: ${subCount} thí sinh`);
  } else if (round === "veDich" && state?.veDich) {
    const vd = state.veDich;
    const owner = vd.order?.[vd.turnIdx] ?? 0;
    const seat = state.seats?.[owner];
    subtitle = `LƯỢT THI: ${(seat?.name || `THÍ SINH ${owner + 1}`).toUpperCase()} (${seat?.score ?? 0}đ)`;
    const pkg = vd.packages?.[owner];
    if (pkg && pkg.length > 0) {
      statusLines.push(`Gói câu hỏi: ${pkg.map((p) => `${p.points}đ`).join(" · ")}`);
    } else {
      statusLines.push("Đang chọn gói câu hỏi (20đ / 30đ)");
    }
    if (vd.hopeStarActive) statusLines.push("⭐ NGÔI SAO HY VỌNG ĐANG BẬT");
  } else if (round === "cauHoiPhu" && state?.cauHoiPhu) {
    const chp = state.cauHoiPhu;
    subtitle = `CÂU HỎI PHỤ SỐ ${Math.max(1, (chp.qIdx ?? 0) + 1)}`;
    if (chp.tied?.length) {
      statusLines.push(
        `Thí sinh tham gia: ${chp.tied
          .map((id: number) => state.seats?.[id]?.name || `TS ${id + 1}`)
          .join(", ")}`
      );
    }
  }

  ctx.save();
  // Header strip
  ctx.fillStyle = "rgba(8, 22, 54, 0.80)";
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(width * 0.06, height * 0.05, width * 0.88, height * 0.16, 16);
  ctx.fill();
  ctx.stroke();

  ctx.font = `900 ${Math.round(height * 0.072)}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = accent;
  ctx.shadowBlur = 18;
  ctx.fillText(displayTitle, cx, height * 0.13);

  // Mid graphic card
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(4, 12, 32, 0.84)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(width * 0.08, height * 0.25, width * 0.84, height * 0.36, 18);
  ctx.fill();
  ctx.stroke();

  ctx.font = `800 ${Math.round(height * 0.056)}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = "#fde047";
  ctx.fillText(subtitle, cx, height * 0.36);

  ctx.font = `700 ${Math.round(height * 0.045)}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = "#e0f2fe";
  statusLines.slice(0, 2).forEach((ln, idx) => {
    ctx.fillText(ln, cx, height * (0.46 + idx * 0.085));
  });

  // Compact horizontal seat strip along bottom
  const seats = (state?.seats || []).slice(0, 8);
  if (seats.length > 0) {
    const stripY = height * 0.67;
    const stripH = height * 0.26;
    const gap = Math.round(width * 0.015);
    const totalW = width * 0.88;
    const boxW = (totalW - gap * (seats.length - 1)) / seats.length;
    const startX = width * 0.06;

    seats.forEach((s, idx) => {
      const bx = startX + idx * (boxW + gap);
      ctx.fillStyle = "rgba(10, 24, 58, 0.88)";
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(bx, stripY, boxW, stripH, 12);
      ctx.fill();
      ctx.stroke();

      ctx.font = `800 ${Math.round(height * 0.036)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = "#f8fafc";
      ctx.fillText(s?.name || `TS ${idx + 1}`, bx + boxW / 2, stripY + stripH * 0.30, boxW - 14);

      ctx.font = `900 ${Math.round(height * 0.068)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = "#fde047";
      ctx.fillText(`${s?.score ?? 0}`, bx + boxW / 2, stripY + stripH * 0.68);
    });
  }
  ctx.restore();
  void timeSec;
}

function renderQuestionPromptToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: OlympiaState | null | undefined,
  fadeProgress: number
): boolean {
  const cx = width / 2;
  const isRed = fadeProgress > 0.5;
  const accent = isRed ? "#ff4d6d" : "#00e5ff";

  let roundTitle: string | null = null;
  let questionPrompt: string | null = null;
  if (state?.currentRound === "khoiDong" && state.khoiDong?.current?.q) {
    roundTitle = "KHỞI ĐỘNG";
    questionPrompt = state.khoiDong.current.q;
  } else if (state?.currentRound === "vcnv") {
    roundTitle = "VƯỢT CHƯỚNG NGẠI VẬT";
    const cur = state.vcnv?.currentRow ?? -1;
    if (cur >= 0 && cur < 4) questionPrompt = state.vcnv?.rows?.[cur]?.hint || null;
    else if (cur === 4) questionPrompt = state.vcnv?.centerQuestion?.q || null;
  } else if (state?.currentRound === "tangToc" && state.tangToc?.qIdx != null) {
    roundTitle = `TĂNG TỐC — CÂU ${(state.tangToc.qIdx ?? 0) + 1}`;
    questionPrompt = state.tangToc.questions?.[state.tangToc.qIdx]?.q || null;
  } else if (state?.currentRound === "veDich" && state.veDich?.current) {
    roundTitle = `VỀ ĐÍCH — ${state.veDich.current.points ?? 20} ĐIỂM`;
    questionPrompt = state.veDich.current.q?.q || null;
  } else if (state?.currentRound === "cauHoiPhu" && state.cauHoiPhu?.qIdx != null) {
    roundTitle = "CÂU HỎI PHỤ";
    questionPrompt = state.cauHoiPhu.questions?.[state.cauHoiPhu.qIdx]?.q || null;
  }

  if (!roundTitle || !questionPrompt) return false;

  ctx.save();
  const bannerH = height * 0.18;
  const bannerGrad = ctx.createLinearGradient(0, 0, width, 0);
  bannerGrad.addColorStop(0, isRed ? "rgba(220, 38, 38, 0.20)" : "rgba(0, 180, 255, 0.15)");
  bannerGrad.addColorStop(0.5, isRed ? "rgba(244, 63, 94, 0.45)" : "rgba(0, 220, 255, 0.45)");
  bannerGrad.addColorStop(1, isRed ? "rgba(220, 38, 38, 0.20)" : "rgba(0, 180, 255, 0.15)");
  ctx.fillStyle = bannerGrad;
  ctx.fillRect(0, 20, width, bannerH);

  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.strokeRect(40, 20, width - 80, bannerH);

  ctx.font = `900 ${Math.round(height * 0.068)}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = accent;
  ctx.shadowBlur = 20;
  ctx.fillText(roundTitle, cx, 20 + bannerH / 2);

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(10, 22, 48, 0.85)";
  ctx.strokeStyle = isRed ? "rgba(244, 63, 94, 0.55)" : "rgba(0, 229, 255, 0.55)";
  ctx.lineWidth = 2;
  const qx = width * 0.08;
  const qy = height * 0.28;
  const qw = width * 0.84;
  const qh = height * 0.62;
  ctx.fillRect(qx, qy, qw, qh);
  ctx.strokeRect(qx, qy, qw, qh);

  const fontSize = Math.round(height * 0.056);
  ctx.font = `700 ${fontSize}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = "#f8fafc";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  drawWrappedCenterText(
    ctx,
    questionPrompt,
    cx,
    qy + height * 0.075,
    qw - width * 0.08,
    Math.round(fontSize * 1.38),
    qy + qh - height * 0.08
  );
  ctx.restore();
  return true;
}

/**
 * Canvas generator for Stage Right Elevated 16:9 LED Screen.
 * Supports all 7 Right Screen modes (auto, roundTitle, logo, question, scoreboard, roundGraphics, camera fallback).
 */
export function renderLedScreenToCanvas(
  targetCanvas: HTMLCanvasElement,
  logoImg: HTMLImageElement | null,
  fadeProgress: number = 0,
  state?: OlympiaState | null,
  timeSec: number = 0
): void {
  const width = targetCanvas.width;
  const height = targetCanvas.height;
  const ctx = targetCanvas.getContext("2d");
  if (!ctx) return;

  // 1. Render Vibrant Blue/Red Crossfade Gradient Background with diagonal sheen
  renderVibrantBlueGradientWithSheen(ctx, width, height, fadeProgress, timeSec);

  // 2. Check for Về Đích 3D flip clock countdown (practical question active timer)
  const vd = state?.veDich;
  const isPracticeCountdown = Boolean(
    state?.currentRound === "veDich" &&
      vd?.current?.q?.type === "practice" &&
      ((vd.phase === "thinking" && vd.timer?.startedAt) ||
        (vd.phase === "stealing" && vd.steal?.timer?.startedAt))
  );

  const resolvedMode = resolveRightScreenDisplayMode(state);

  if (isPracticeCountdown && resolvedMode !== "logo" && resolvedMode !== "scoreboard" && resolvedMode !== "camera") {
    render3DFlipClockToCanvas(ctx, width, height, state, timeSec);
    return;
  }

  // 3. Camera mode canvas backdrop (prevents black void / recursion during initial 200ms buffer fill & capture guard)
  if (resolvedMode === "camera") {
    renderOlympiaLogoCardToCanvas(ctx, width, height, logoImg, fadeProgress);
    return;
  }

  if (resolvedMode === "logo") {
    renderOlympiaLogoCardToCanvas(ctx, width, height, logoImg, fadeProgress);
    return;
  }

  if (resolvedMode === "scoreboard") {
    renderRightScoreboardToCanvas(ctx, width, height, state, fadeProgress);
    return;
  }

  if (resolvedMode === "roundGraphics") {
    renderRightRoundStatusGraphicsToCanvas(ctx, width, height, state, fadeProgress, timeSec);
    return;
  }

  if (resolvedMode === "question") {
    if (renderQuestionPromptToCanvas(ctx, width, height, state, fadeProgress)) {
      return;
    }
    renderRoundTitleSlideToCanvas(ctx, width, height, state, fadeProgress);
    return;
  }

  renderRoundTitleSlideToCanvas(ctx, width, height, state, fadeProgress);
}

/**
 * Canvas generator for Stage Right Vertical Totem LED Screen (Aspect Ratio 9:16).
 * Renders live Olympia title, active round indicator, and broadcast telemetry (Images 1, 3, 4).
 */
/**
 * Canvas generator for Stage Right Vertical Totem LED Screen (Aspect Ratio 9:16).
 * Features stylized slanted/italic glossy scientific symbols, live MC feed, and broadcast telemetry (Image 1).
 */
function renderVerticalTotemToCanvas(
  canvas: HTMLCanvasElement,
  state?: OlympiaState | null,
  fadeProgress: number = 0,
  timeSec: number = 0
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = 576;
  const h = 1024;
  const cx = w / 2;

  // Background deep cyber navy
  const r = Math.round(THREE.MathUtils.lerp(6, 60, fadeProgress));
  const g = Math.round(THREE.MathUtils.lerp(18, 6, fadeProgress));
  const b = Math.round(THREE.MathUtils.lerp(48, 12, fadeProgress));
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, `rgb(${r}, ${g + 10}, ${b + 20})`);
  grad.addColorStop(0.5, `rgb(${r}, ${g}, ${b})`);
  grad.addColorStop(1, "#020614");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // 1. TOP ZONE: Stylized Slanted/Italic Glossy Science & Math Formulas (Matching Image 1)
  const topSymbols = [
    { text: "∑", x: 90, y: 80, size: 48, rot: -0.1 },
    { text: "sin", x: 210, y: 75, size: 38, rot: 0.08 },
    { text: "m²", x: 340, y: 82, size: 36, rot: -0.05 },
    { text: "Δ", x: 470, y: 78, size: 44, rot: 0.12 },
    { text: "µ", x: 120, y: 160, size: 42, rot: 0.06 },
    { text: "kg", x: 250, y: 155, size: 36, rot: -0.08 },
    { text: "Ω", x: 370, y: 165, size: 44, rot: 0.05 },
    { text: "π", x: 480, y: 158, size: 40, rot: -0.1 },
    { text: "f(x)", x: 100, y: 240, size: 36, rot: -0.05 },
    { text: "∞", x: 230, y: 245, size: 44, rot: 0.1 },
    { text: "√2", x: 350, y: 235, size: 38, rot: -0.06 },
    { text: "hν", x: 470, y: 242, size: 36, rot: 0.08 },
  ];

  topSymbols.forEach((s, idx) => {
    ctx.save();
    const curX = s.x + Math.sin(timeSec * 0.6 + idx * 1.3) * 4;
    const curY = s.y + Math.cos(timeSec * 0.7 + idx * 1.1) * 4;
    ctx.translate(curX, curY);
    ctx.rotate(s.rot);
    ctx.font = `italic 900 ${s.size}px "Plus Jakarta Sans", "Montserrat", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Glow
    ctx.shadowColor = fadeProgress > 0.5 ? "#ff2a4b" : "#00f0ff";
    ctx.shadowBlur = 18;
    ctx.strokeStyle = fadeProgress > 0.5 ? "rgba(255, 40, 70, 0.9)" : "rgba(0, 240, 255, 0.9)";
    ctx.lineWidth = 4;
    ctx.strokeText(s.text, 0, 0);

    // Gradient Fill
    const symGrad = ctx.createLinearGradient(0, -s.size * 0.5, 0, s.size * 0.5);
    symGrad.addColorStop(0, "#ffffff");
    symGrad.addColorStop(0.5, fadeProgress > 0.5 ? "#ff4d6d" : "#38bdf8");
    symGrad.addColorStop(1, fadeProgress > 0.5 ? "#9f1239" : "#0369a1");
    ctx.fillStyle = symGrad;
    ctx.fillText(s.text, 0, 0);

    // Specular Highlight
    ctx.shadowBlur = 3;
    ctx.shadowColor = "#ffffff";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 1.5;
    ctx.strokeText(s.text, -0.6, -1.0);
    ctx.restore();
  });

  // Top Title Ribbon: "ĐƯỜNG LÊN ĐỈNH OLYMPIA"
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = 'italic 900 28px "Plus Jakarta Sans", sans-serif';
  ctx.letterSpacing = "0.06em";
  ctx.shadowColor = "#ffd700";
  ctx.shadowBlur = 20;
  ctx.strokeStyle = "#1e1302";
  ctx.lineWidth = 2.4;
  ctx.strokeText("ĐƯỜNG LÊN ĐỈNH OLYMPIA", cx, 310);
  const textGrad = ctx.createLinearGradient(0, 290, 0, 330);
  textGrad.addColorStop(0, "#ffffff");
  textGrad.addColorStop(0.3, "#fffbd0");
  textGrad.addColorStop(0.7, "#ffd700");
  textGrad.addColorStop(1, "#b45309");
  ctx.fillStyle = textGrad;
  ctx.fillText("ĐƯỜNG LÊN ĐỈNH OLYMPIA", cx, 310);
  ctx.restore();

  // Divider Line
  ctx.strokeStyle = fadeProgress > 0.5 ? "rgba(255, 42, 75, 0.6)" : "rgba(0, 240, 255, 0.6)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(40, 345);
  ctx.lineTo(w - 40, 345);
  ctx.stroke();

  // 2. CENTER ZONE: Live Broadcast MC Feed Viewport & Active Round
  const roundName = state?.currentRound
    ? state.currentRound === "khoiDong"
      ? "KHỞI ĐỘNG"
      : state.currentRound === "vcnv"
      ? "VƯỢT CHƯỚNG NGẠI VẬT"
      : state.currentRound === "tangToc"
      ? "TĂNG TỐC"
      : "VỀ ĐÍCH"
    : "TRỰC TIẾP OLYMPIA";

  ctx.save();
  ctx.fillStyle = fadeProgress > 0.5 ? "#ff4d6d" : "#38bdf8";
  ctx.font = '800 26px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = "center";
  ctx.shadowColor = fadeProgress > 0.5 ? "#ff0033" : "#00f0ff";
  ctx.shadowBlur = 12;
  ctx.fillText(roundName, cx, 395);
  ctx.restore();

  // Live Camera Viewport Box (Aspect 16:9 box centered)
  const vBoxX = 50;
  const vBoxY = 430;
  const vBoxW = 476;
  const vBoxH = 280;

  ctx.save();
  ctx.fillStyle = "#020817";
  ctx.fillRect(vBoxX, vBoxY, vBoxW, vBoxH);
  ctx.strokeStyle = fadeProgress > 0.5 ? "#ff2a4b" : "#00f0ff";
  ctx.lineWidth = 3;
  ctx.strokeRect(vBoxX, vBoxY, vBoxW, vBoxH);

  // Live Broadcast Badge
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.arc(vBoxX + 35, vBoxY + 30, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = '700 16px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = "left";
  ctx.fillText("LIVE S14", vBoxX + 52, vBoxY + 35);

  // Simulated Stage View / MC silhouette in box
  ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
  ctx.fillRect(vBoxX + 20, vBoxY + 60, vBoxW - 40, vBoxH - 80);
  ctx.fillStyle = "#38bdf8";
  ctx.font = '700 20px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = "center";
  ctx.fillText("VTV3 BROADCAST FEED", cx, vBoxY + 150);
  ctx.restore();

  // 3. BOTTOM ZONE: Stylized Slanted Symbols & Broadcast Telemetry (Matching Image 1)
  const bottomSymbols = [
    { text: "H₂O", x: 100, y: 770, size: 36, rot: -0.06 },
    { text: "CO₂", x: 230, y: 765, size: 34, rot: 0.08 },
    { text: "pH", x: 350, y: 775, size: 34, rot: -0.05 },
    { text: "mol", x: 470, y: 768, size: 34, rot: 0.07 },
    { text: "Hz", x: 120, y: 840, size: 36, rot: 0.05 },
    { text: "Pa", x: 250, y: 845, size: 34, rot: -0.08 },
    { text: "rad", x: 370, y: 838, size: 34, rot: 0.06 },
    { text: "dx", x: 470, y: 842, size: 36, rot: -0.05 },
  ];

  bottomSymbols.forEach((s, idx) => {
    ctx.save();
    const curX = s.x + Math.sin(timeSec * 0.6 + idx * 1.3) * 4;
    const curY = s.y + Math.cos(timeSec * 0.7 + idx * 1.1) * 4;
    ctx.translate(curX, curY);
    ctx.rotate(s.rot);
    ctx.font = `italic 900 ${s.size}px "Plus Jakarta Sans", "Montserrat", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = fadeProgress > 0.5 ? "#ff2a4b" : "#00f0ff";
    ctx.shadowBlur = 14;
    ctx.strokeStyle = fadeProgress > 0.5 ? "rgba(255, 40, 70, 0.8)" : "rgba(0, 240, 255, 0.8)";
    ctx.lineWidth = 3;
    ctx.strokeText(s.text, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(s.text, 0, 0);
    ctx.restore();
  });

  // Telemetry Waveform Bars
  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = fadeProgress > 0.5 ? "#ff2a4b" : "rgba(0, 240, 255, 0.85)";
  const barCount = 28;
  for (let b = 0; b < barCount; b++) {
    const bh = 12 + Math.sin(b * 0.65 + timeSec * 4.0) * 20 + Math.cos(b * 1.4 - timeSec * 2.5) * 14;
    ctx.fillRect(70 + b * 16, 940 - bh, 10, bh);
  }
  ctx.font = '600 14px "Courier New", monospace';
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.fillText("BROADCAST TELEMETRY 60 FPS", cx, 985);
  ctx.restore();

  // Outer Glowing Bezel Border
  ctx.save();
  ctx.strokeStyle = fadeProgress > 0.5 ? "#ff2a4b" : "#00f0ff";
  ctx.lineWidth = 6;
  ctx.shadowColor = fadeProgress > 0.5 ? "#ff0033" : "#00f0ff";
  ctx.shadowBlur = 20;
  ctx.strokeRect(16, 16, w - 32, h - 32);
  ctx.restore();
}

/**
 * Pre-rendered and dynamic Curved Math & Science Symbols Wall Texture (Stage Left).
 * Features:
 * - Stepped-up top profile with Quizorra sponsor badge on the top-left.
 * - Inward chevron / arrow notch on the right edge ("mũi tên lọt thỏm vô trong").
 * - Multi-layer concentric neon borders ("background kết hợp nhiều viền").
 * - All symbols rendered in 100% luminous electric cyan ("chữ xanh toàn tập").
 * - Subtle sinusoidal floating drift motion x_i(t), y_i(t).
 * - Traveling light pulses along the 4 neon rails at 320 px/s.
 * - Periodic diagonal specular light sweeps across the screen at 240 px/s with starburst glints.
 * - Animated Erlenmeyer flask with rising bubbles and science atom with orbiting electrons.
 */

interface FormulaSymbolSpec {
  text: string;
  x: number;
  y: number;
  size: number;
  rot?: number;
  driftAmpX: number;
  driftAmpY: number;
  driftFreqX: number;
  driftFreqY: number;
  driftPhaseX: number;
  driftPhaseY: number;
}

const BASE_FORMULA_SYMBOLS = [
  // Tier 1 (Upper zone, Y: 85 - 125, dispersed ~220px apart)
  { text: "∑", x: 120, y: 110, size: 54, rot: -0.02 },
  { text: "kg", x: 340, y: 105, size: 40, rot: -0.01 },
  { text: "Ψ", x: 570, y: 100, size: 48, rot: -0.02 },
  { text: "sin θ", x: 800, y: 90, size: 40, rot: -0.01 },
  { text: "Ω", x: 1040, y: 90, size: 46, rot: 0.02 },
  { text: "π", x: 1280, y: 90, size: 46, rot: -0.02 },
  { text: "∫ f(x)dx", x: 1520, y: 85, size: 42, rot: 0.02 },
  { text: "E=mc²", x: 1740, y: 85, size: 38, rot: 0.02 },
  { text: "∇", x: 1930, y: 80, size: 46, rot: -0.02 },

  // Tier 2 (Upper-mid zone, Y: 195 - 235, dispersed ~240px apart, staggered)
  { text: "λ", x: 180, y: 220, size: 46, rot: 0.02 },
  { text: "lim", x: 420, y: 225, size: 40, rot: -0.02 },
  { text: "∞", x: 670, y: 205, size: 50, rot: 0.03 },
  { text: "hν", x: 920, y: 205, size: 42, rot: 0.02 },
  { text: "α", x: 1160, y: 220, size: 44, rot: -0.02 },
  { text: "β", x: 1400, y: 205, size: 44, rot: 0.02 },
  { text: "F=ma", x: 1640, y: 205, size: 40, rot: 0.02 },
  { text: "ħ", x: 1880, y: 200, size: 46, rot: 0.02 },

  // Tier 3 (Mid zone, Y: 320 - 355, dispersed ~220px apart)
  { text: "H₂O", x: 130, y: 340, size: 42, rot: -0.01 },
  { text: "CO₂", x: 360, y: 345, size: 40, rot: 0.02 },
  { text: "mol", x: 590, y: 330, size: 38, rot: 0.02 },
  { text: "Hz", x: 820, y: 335, size: 40, rot: -0.02 },
  { text: "Δt", x: 1050, y: 330, size: 42, rot: -0.01 },
  { text: "c", x: 1280, y: 335, size: 44, rot: -0.02 },
  { text: "ρ", x: 1510, y: 335, size: 42, rot: 0.01 },
  { text: "O₂", x: 1730, y: 335, size: 40, rot: 0.02 },
  { text: "DNA", x: 1920, y: 330, size: 38, rot: 0.02 },

  // Tier 4 (Lower-mid zone, Y: 465 - 495, dispersed ~240px apart, staggered)
  { text: "W", x: 200, y: 475, size: 42, rot: 0.02 },
  { text: "V", x: 440, y: 485, size: 42, rot: -0.01 },
  { text: "K", x: 690, y: 475, size: 40, rot: -0.01 },
  { text: "F", x: 940, y: 480, size: 42, rot: -0.02 },
  { text: "s", x: 1190, y: 475, size: 40, rot: -0.01 },
  { text: "Fe", x: 1430, y: 480, size: 40, rot: -0.01 },
  { text: "Cu", x: 1670, y: 470, size: 40, rot: 0.02 },
  { text: "Au", x: 1900, y: 475, size: 40, rot: -0.01 },

  // Tier 5 (Lower zone, Y: 605 - 630, dispersed ~240px apart)
  { text: "eⁱᵖ+1=0", x: 160, y: 615, size: 36, rot: 0.01 },
  { text: "H₂SO₄", x: 420, y: 620, size: 38, rot: -0.01 },
  { text: "m/s²", x: 670, y: 610, size: 36, rot: 0.02 },
  { text: "φ", x: 930, y: 615, size: 42, rot: 0.02 },
  { text: "ln x", x: 1180, y: 615, size: 38, rot: 0.01 },
  { text: "mg", x: 1430, y: 620, size: 36, rot: -0.01 },
  { text: "arcsin", x: 1680, y: 615, size: 36, rot: -0.01 },
  { text: "N", x: 1910, y: 610, size: 42, rot: 0.02 },
];

const SYMBOL_KINEMATICS: FormulaSymbolSpec[] = BASE_FORMULA_SYMBOLS.map((s, idx) => {
  const seedX = (idx * 17 + 5) % 100;
  const seedY = (idx * 23 + 11) % 100;
  return {
    ...s,
    driftAmpX: 2.2 + (seedX % 25) * 0.12,
    driftAmpY: 1.8 + (seedY % 20) * 0.11,
    driftFreqX: 0.45 + ((idx * 7) % 30) * 0.015,
    driftFreqY: 0.40 + ((idx * 11) % 35) * 0.014,
    driftPhaseX: (idx * 0.73) % (Math.PI * 2),
    driftPhaseY: (idx * 1.17 + 1.2) % (Math.PI * 2),
  };
});

export function renderDynamicCurvedFormulaCanvas(
  canvas: HTMLCanvasElement,
  timeSec: number = 0,
  fadeProgress: number = 0,
  quality: "HIGH" | "MEDIUM" | "LIGHT" = "HIGH"
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const blurFactor = quality === "LIGHT" ? 0 : quality === "MEDIUM" ? 0.5 : 1.0;

  // Reset transform and clear completely to avoid compounding scales
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.scale(0.5, 0.5);

  const w = 2048;
  const h = 768;

  // 1. Define Analytical Parallel Polygon Contour Path with Stepped Top & Inward Chevron Notch (<)
  // Guarantees strictly parallel inner/outer borders via normal offsetting
  const BASE_CONTOUR_PTS: [number, number][] = [
    [40, 740],
    [40, 140],
    [600, 140],
    [720, 35],
    [2010, 35],
    [1930, 390],
    [2010, 740],
  ];

  function computeContourOffset(pts: [number, number][], dist: number): [number, number][] {
    if (dist === 0) return pts;
    const n = pts.length;
    const lines: { p: [number, number]; dir: [number, number] }[] = [];
    for (let i = 0; i < n; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % n];
      const dx = p2[0] - p1[0];
      const dy = p2[1] - p1[1];
      const len = Math.hypot(dx, dy);
      const ux = dx / len;
      const uy = dy / len;
      // Inward normal for CCW canvas coordinates: (-uy, ux)
      const nx = -uy;
      const ny = ux;
      lines.push({
        p: [p1[0] + nx * dist, p1[1] + ny * dist],
        dir: [ux, uy],
      });
    }

    const result: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const L1 = lines[(i - 1 + n) % n];
      const L2 = lines[i];
      const det = L1.dir[0] * L2.dir[1] - L1.dir[1] * L2.dir[0];
      if (Math.abs(det) < 1e-6) {
        result.push(L2.p);
      } else {
        const t1 = ((L2.p[0] - L1.p[0]) * L2.dir[1] - (L2.p[1] - L1.p[1]) * L2.dir[0]) / det;
        result.push([L1.p[0] + t1 * L1.dir[0], L1.p[1] + t1 * L1.dir[1]]);
      }
    }
    return result;
  }

  function traceContour(offset: number = 0) {
    if (!ctx) return;
    const pts = computeContourOffset(BASE_CONTOUR_PTS, offset);
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i][0], pts[i][1]);
    }
    ctx.closePath();
  }

  // 2. Fill Wall Body with Royal Dark Navy Blue Gradient, switching to Ruby Red in Về Đích
  ctx.save();
  traceContour(0);
  ctx.clip();

  const bodyGrad = ctx.createLinearGradient(0, 40, w, 740);
  if (fadeProgress > 0.5) {
    bodyGrad.addColorStop(0, "#88081a");
    bodyGrad.addColorStop(0.5, "#4c0519");
    bodyGrad.addColorStop(1, "#020712");
  } else {
    bodyGrad.addColorStop(0, "#061a48");
    bodyGrad.addColorStop(0.5, "#030e26");
    bodyGrad.addColorStop(1, "#010714");
  }
  ctx.fillStyle = bodyGrad;
  ctx.fillRect(0, 0, w, h);

  // 3. Glowing Neon Rails with traveling light pulses at 320 px/s
  const slope = 0.09;
  const railYBase = [95, 140, 185, 230];

  // Static rail tracks in Sapphire / Ruby Red
  ctx.save();
  ctx.strokeStyle = fadeProgress > 0.5 ? "rgba(225, 29, 72, 0.85)" : "rgba(56, 189, 248, 0.75)";
  ctx.lineWidth = 3.5;
  ctx.shadowColor = fadeProgress > 0.5 ? "#88081a" : "#1d4ed8";
  ctx.shadowBlur = Math.round(14 * blurFactor);
  for (const yRail of railYBase) {
    ctx.beginPath();
    ctx.moveTo(80, yRail - (80 - 1000) * slope);
    ctx.lineTo(1940, yRail - (1940 - 1000) * slope);
    ctx.stroke();
  }
  ctx.restore();

  // Traveling pulses along neon rails (320 px/s)
  const pulseSpeed = 320;
  const railLen = 1860;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let rIdx = 0; rIdx < railYBase.length; rIdx++) {
    const yRail = railYBase[rIdx];
    for (let pIdx = 0; pIdx < 2; pIdx++) {
      const pulseOffset = (rIdx * 450 + pIdx * 930) % railLen;
      const pulseX = 80 + ((timeSec * pulseSpeed + pulseOffset) % railLen);
      const pulseY = yRail - (pulseX - 1000) * slope;

      const pGrad = ctx.createRadialGradient(pulseX, pulseY, 0, pulseX, pulseY, 65);
      pGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
      if (fadeProgress > 0.5) {
        pGrad.addColorStop(0.25, "rgba(244, 63, 94, 0.85)");
        pGrad.addColorStop(0.6, "rgba(159, 18, 57, 0.35)");
        pGrad.addColorStop(1, "rgba(225, 29, 72, 0.0)");
      } else {
        pGrad.addColorStop(0.25, "rgba(96, 165, 250, 0.85)");
        pGrad.addColorStop(0.6, "rgba(29, 78, 216, 0.35)");
        pGrad.addColorStop(1, "rgba(29, 78, 216, 0.0)");
      }
      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.arc(pulseX, pulseY, 65, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // Digital stream lines in subtle deep sapphire
  ctx.strokeStyle = fadeProgress > 0.5 ? "rgba(153, 27, 27, 0.12)" : "rgba(29, 78, 216, 0.10)";
  ctx.lineWidth = 1.8;
  for (let y = 50; y < 740; y += 42) {
    ctx.beginPath();
    ctx.moveTo(0, y - (0 - 1000) * slope);
    ctx.lineTo(w, y - (w - 1000) * slope);
    ctx.stroke();
  }

  // Binary matrix grid bypassed for clean broadcast visual parity (Reference Image 2)
  // Function definition preserved for test suite invariants
  if (false as boolean) {
    renderBinaryMatrixGrid(ctx, w, h, fadeProgress, 0, timeSec, quality);
  }

  // 4. Periodic diagonal specular light sweeps (240 px/s, every ~5s)
  const sweepPeriod = 5.0;
  const sweepSpeed = 240;
  const sweepSpan = 2400;
  const sweepX1 = ((timeSec * sweepSpeed) % sweepSpan) - 200;
  const sweepX2 = (((timeSec + sweepPeriod) * sweepSpeed) % sweepSpan) - 200;
  const activeSweeps = [sweepX1, sweepX2];

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  activeSweeps.forEach((sweepCenter) => {
    if (sweepCenter > -350 && sweepCenter < w + 350) {
      const sweepGrad = ctx.createLinearGradient(sweepCenter - 140, 200, sweepCenter + 140, 568);
      if (fadeProgress > 0.5) {
        sweepGrad.addColorStop(0.0, "rgba(159, 18, 57, 0.0)");
        sweepGrad.addColorStop(0.35, "rgba(225, 29, 72, 0.08)");
        sweepGrad.addColorStop(0.50, "rgba(255, 255, 255, 0.22)");
        sweepGrad.addColorStop(0.65, "rgba(159, 18, 57, 0.10)");
        sweepGrad.addColorStop(1.0, "rgba(159, 18, 57, 0.0)");
      } else {
        sweepGrad.addColorStop(0.0, "rgba(29, 78, 216, 0.0)");
        sweepGrad.addColorStop(0.35, "rgba(96, 165, 250, 0.08)");
        sweepGrad.addColorStop(0.50, "rgba(255, 255, 255, 0.22)");
        sweepGrad.addColorStop(0.65, "rgba(29, 78, 216, 0.10)");
        sweepGrad.addColorStop(1.0, "rgba(29, 78, 216, 0.0)");
      }
      ctx.fillStyle = sweepGrad;

      const topX = sweepCenter - 384 * 0.36;
      const botX = sweepCenter + 384 * 0.36;
      ctx.beginPath();
      ctx.moveTo(topX - 160, 0);
      ctx.lineTo(topX + 160, 0);
      ctx.lineTo(botX + 160, h);
      ctx.lineTo(botX - 160, h);
      ctx.closePath();
      ctx.fill();
    }
  });
  ctx.restore();

  // 5. "CHỮ XANH TOÀN TẬP" — ALL SCIENTIFIC SYMBOLS & UNITS IN PURE GLOSSY LUMINOUS CYAN
  // Dynamic floating sinusoidal drift and specular glints/flares
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  SYMBOL_KINEMATICS.forEach((s) => {
    const driftX = s.x + Math.sin(timeSec * s.driftFreqX + s.driftPhaseX) * s.driftAmpX;
    const driftY = s.y + Math.cos(timeSec * s.driftFreqY + s.driftPhaseY) * s.driftAmpY;

    // Distance to nearest specular sweep band
    let minSweepDist = 9999;
    activeSweeps.forEach((sweepCenter) => {
      const lineX = sweepCenter + (driftY - 384) * 0.36;
      const dist = Math.abs(driftX - lineX) / 1.063;
      if (dist < minSweepDist) minSweepDist = dist;
    });

    let specBoost = 1.0;
    if (minSweepDist < 160) {
      specBoost = 1.0 + 1.25 * Math.exp(-(minSweepDist * minSweepDist) / (2 * 50 * 50));
    }

    ctx.save();
    const slopeY = -(driftX - 1000) * slope;
    ctx.translate(driftX, driftY + slopeY);
    ctx.rotate(-Math.atan(slope) + (s.rot || 0) * 0.1);
    ctx.transform(0.85, 0, 0.04, 1, 0, 0);
    const scaledSize = Math.round(s.size * 0.75);
    ctx.font = `italic 700 ${scaledSize}px "Cambria Math", "Times New Roman", "Plus Jakarta Sans", serif`;
    ctx.letterSpacing = "0.06em";

    // Ambient drop shadow
    ctx.save();
    ctx.shadowColor = "rgba(1, 10, 28, 0.95)";
    ctx.shadowBlur = Math.round(14 * blurFactor);
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = "#010e28";
    ctx.fillText(s.text, 0, 0);
    ctx.restore();

    // Volumetric radiant glow: Sapphire in standard, Ruby Red in Về Đích
    ctx.save();
    const glowBlur = Math.round(Math.min(24, Math.round(18 * specBoost)) * blurFactor);
    ctx.shadowColor = fadeProgress > 0.5 ? "#88081a" : (specBoost > 1.3 ? "#e0f2fe" : "#1d4ed8");
    ctx.shadowBlur = glowBlur;
    ctx.strokeStyle = fadeProgress > 0.5 ? "rgba(153, 27, 27, 0.9)" : "rgba(29, 78, 216, 0.85)";
    ctx.lineWidth = Math.min(4, Math.round(3.5 * specBoost));
    ctx.strokeText(s.text, 0, 0);
    ctx.restore();

    // Multi-stop mirror metallic / glossy acrylic gradient fill: Silver-White & Sapphire, switching to Ruby Red in Về Đích
    const symGrad = ctx.createLinearGradient(0, -s.size * 0.55, 0, s.size * 0.55);
    if (fadeProgress > 0.5) {
      symGrad.addColorStop(0.0, "#ffffff");
      symGrad.addColorStop(0.18, "#ffe4e6");
      symGrad.addColorStop(0.48, "#e11d48");
      symGrad.addColorStop(0.50, "#991b1b");
      symGrad.addColorStop(0.52, "#88081a");
      symGrad.addColorStop(1.0, "#4c0519");
    } else {
      symGrad.addColorStop(0.0, "#ffffff");
      symGrad.addColorStop(0.18, "#e0f2fe");
      symGrad.addColorStop(0.48, "#93c5fd");
      symGrad.addColorStop(0.50, "#60a5fa");
      symGrad.addColorStop(0.52, "#1d4ed8");
      symGrad.addColorStop(1.0, "#061539");
    }
    ctx.fillStyle = symGrad;
    ctx.fillText(s.text, 0, 0);

    // Beveled acrylic top-edge gloss glint
    ctx.save();
    const glintAlpha = Math.min(1.0, 0.92 * specBoost);
    ctx.strokeStyle = `rgba(255, 255, 255, ${glintAlpha})`;
    ctx.lineWidth = 2.2;
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = Math.round(6 * specBoost * blurFactor);
    ctx.strokeText(s.text, -0.6, -1.2);
    ctx.restore();

    // 4-Point diamond starburst flare on intense specular sheen (specBoost > 1.6)
    if (specBoost > 1.6) {
      const flareAlpha = Math.min(1.0, (specBoost - 1.6) * 1.6);
      const flareSize = s.size * 0.55 * flareAlpha;
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${0.92 * flareAlpha})`;
      ctx.shadowColor = fadeProgress > 0.5 ? "#88081a" : "#1d4ed8";
      ctx.shadowBlur = Math.round(12 * blurFactor);
      ctx.beginPath();
      ctx.moveTo(0, -s.size * 0.35 - flareSize);
      ctx.quadraticCurveTo(0, -s.size * 0.35, flareSize, -s.size * 0.35);
      ctx.quadraticCurveTo(0, -s.size * 0.35, 0, -s.size * 0.35 + flareSize);
      ctx.quadraticCurveTo(0, -s.size * 0.35, -flareSize, -s.size * 0.35);
      ctx.quadraticCurveTo(0, -s.size * 0.35, 0, -s.size * 0.35 - flareSize);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  });

  // Vector Icon 1: Chemical Erlenmeyer Flask with Volumetric Glossy Liquid in Sapphire / Ruby Red
  const flaskDriftX = 330 + Math.sin(timeSec * 0.5) * 3;
  const flaskDriftY = 205 + Math.cos(timeSec * 0.6) * 2;
  ctx.save();
  ctx.translate(flaskDriftX, flaskDriftY);
  ctx.scale(0.42, 1.0);
  ctx.strokeStyle = fadeProgress > 0.5 ? "#88081a" : "#1d4ed8";
  ctx.lineWidth = 4.5;
  ctx.shadowColor = fadeProgress > 0.5 ? "#e11d48" : "#38bdf8";
  ctx.shadowBlur = Math.round(18 * blurFactor);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 17);
  ctx.lineTo(-18, 53);
  ctx.lineTo(28, 53);
  ctx.lineTo(10, 17);
  ctx.lineTo(10, 0);
  ctx.closePath();
  ctx.stroke();

  // Flask Liquid with Volumetric Sapphire / Ruby Glow
  const flaskGrad = ctx.createLinearGradient(0, 27, 0, 53);
  if (fadeProgress > 0.5) {
    flaskGrad.addColorStop(0, "rgba(244, 63, 94, 0.40)");
    flaskGrad.addColorStop(0.5, "rgba(225, 29, 72, 0.75)");
    flaskGrad.addColorStop(1, "rgba(136, 8, 26, 0.90)");
  } else {
    flaskGrad.addColorStop(0, "rgba(96, 165, 250, 0.40)");
    flaskGrad.addColorStop(0.5, "rgba(56, 189, 248, 0.75)");
    flaskGrad.addColorStop(1, "rgba(29, 78, 216, 0.90)");
  }
  ctx.fillStyle = flaskGrad;
  ctx.beginPath();
  ctx.moveTo(-10, 30);
  ctx.bezierCurveTo(-4, 32, 14, 32, 20, 30);
  ctx.lineTo(26, 51);
  ctx.lineTo(-16, 51);
  ctx.closePath();
  ctx.fill();

  // Flask Measurement Markings
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = 1.8;
  ctx.shadowBlur = 0;
  for (const markOffsetY of [35, 41, 47]) {
    ctx.beginPath();
    ctx.moveTo(-2, markOffsetY);
    ctx.lineTo(4, markOffsetY);
    ctx.stroke();
  }

  // Rising bubbles in flask
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = fadeProgress > 0.5 ? "#e11d48" : "#38bdf8";
  ctx.shadowBlur = Math.round(4 * blurFactor);
  const bubbleSpeeds = [14, 18, 12, 16];
  const bubbleXOffsets = [2, 10, -4, 16];
  const bubbleRadii = [1.8, 1.4, 1.6, 1.2];
  for (let b = 0; b < 4; b++) {
    const bDist = (timeSec * bubbleSpeeds[b] + b * 7) % 20;
    const bY = 51 - bDist;
    const bX = bubbleXOffsets[b] + Math.sin(timeSec * 2.5 + b) * 1.2;
    ctx.beginPath();
    ctx.arc(bX, bY, bubbleRadii[b], 0, Math.PI * 2);
    ctx.fill();
  }

  // Flask Specular Highlight Reflection
  ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
  ctx.lineWidth = 2.2;
  ctx.shadowColor = "#ffffff";
  ctx.shadowBlur = Math.round(6 * blurFactor);
  ctx.beginPath();
  ctx.moveTo(-12, 35);
  ctx.lineTo(-15, 49);
  ctx.stroke();
  ctx.restore();

  // Vector Icon 2: Science Atom with Nucleus and Orbiting Electron Tracks in Sapphire / Ruby Red
  ctx.save();
  ctx.translate(880, 210);
  ctx.scale(0.42, 1.0);
  ctx.shadowColor = fadeProgress > 0.5 ? "#88081a" : "#1d4ed8";
  ctx.shadowBlur = Math.round(18 * blurFactor);
  ctx.strokeStyle = fadeProgress > 0.5 ? "rgba(225, 29, 72, 0.85)" : "rgba(56, 189, 248, 0.85)";
  ctx.lineWidth = 2.4;

  // Nucleus
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // Orbit 1: Tilted 35°
  ctx.beginPath();
  ctx.ellipse(0, 0, 28, 11, Math.PI * 0.20, 0, Math.PI * 2);
  ctx.stroke();

  // Orbit 2: Tilted -35°
  ctx.beginPath();
  ctx.ellipse(0, 0, 28, 11, -Math.PI * 0.20, 0, Math.PI * 2);
  ctx.stroke();

  // Orbiting electron particles with dynamic motion
  const eAng1 = timeSec * 3.4;
  const ex1 = 28 * Math.cos(eAng1);
  const ey1 = 11 * Math.sin(eAng1);
  const rot1 = Math.PI * 0.20;
  const rx1 = ex1 * Math.cos(rot1) - ey1 * Math.sin(rot1);
  const ry1 = ex1 * Math.sin(rot1) + ey1 * Math.cos(rot1);

  const eAng2 = -timeSec * 2.8 + 1.5;
  const ex2 = 28 * Math.cos(eAng2);
  const ey2 = 11 * Math.sin(eAng2);
  const rot2 = -Math.PI * 0.20;
  const rx2 = ex2 * Math.cos(rot2) - ey2 * Math.sin(rot2);
  const ry2 = ex2 * Math.sin(rot2) + ey2 * Math.cos(rot2);

  ctx.fillStyle = "#38bdf8";
  ctx.shadowBlur = Math.round(8 * blurFactor);
  ctx.beginPath();
  ctx.arc(rx1, ry1, 2.6, 0, Math.PI * 2);
  ctx.arc(rx2, ry2, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Vector Icon 3: Organic Chemistry Benzene Aromatic Ring
  ctx.save();
  ctx.translate(1420, 205);
  ctx.scale(0.42, 1.0);
  ctx.shadowColor = "#00f0ff";
  ctx.shadowBlur = Math.round(16 * blurFactor);
  ctx.strokeStyle = "#00f0ff";
  ctx.lineWidth = 3.2;

  // Hexagon perimeter
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const ang = (i * Math.PI) / 3 - Math.PI / 6;
    const hx = 22 * Math.cos(ang);
    const hy = 22 * Math.sin(ang);
    if (i === 0) ctx.moveTo(hx, hy);
    else ctx.lineTo(hx, hy);
  }
  ctx.closePath();
  ctx.stroke();

  // Inner resonance aromatic ring (pulsing)
  const ringRadius = 12 + Math.sin(timeSec * 2.2) * 0.8;
  ctx.strokeStyle = "rgba(56, 189, 248, 0.75)";
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.restore(); // Restore clip

  // 6. MULTI-LAYER CONCENTRIC NEON BORDERS ("background kết hợp nhiều viền")
  // Border 1: Outer Neon Track (Width 7, Deep Royal Navy / Deep Crimson)
  ctx.save();
  ctx.strokeStyle = fadeProgress > 0.5 ? "#88081a" : "#1d4ed8";
  ctx.lineWidth = 7;
  ctx.shadowColor = fadeProgress > 0.5 ? "#991b1b" : "#2563eb";
  ctx.shadowBlur = Math.round(20 * blurFactor);
  traceContour(0);
  ctx.stroke();

  // Border 2: Inner Neon Track (Width 3.5, Inset 12px)
  ctx.strokeStyle = fadeProgress > 0.5 ? "rgba(153, 27, 27, 0.85)" : "rgba(37, 99, 235, 0.85)";
  ctx.lineWidth = 3.5;
  ctx.shadowBlur = Math.round(10 * blurFactor);
  traceContour(12);
  ctx.stroke();

  // Border 3: Innermost Subtle Track (Width 2.0, Inset 24px)
  ctx.strokeStyle = fadeProgress > 0.5 ? "rgba(185, 28, 28, 0.55)" : "rgba(96, 165, 250, 0.55)";
  ctx.lineWidth = 2.0;
  ctx.shadowBlur = Math.round(6 * blurFactor);
  traceContour(24);
  ctx.stroke();
  ctx.restore();
}

export function createCurvedFormulaCanvas(fadeProgress: number = 0): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 384;
  renderDynamicCurvedFormulaCanvas(canvas, 0, fadeProgress, "HIGH");
  return canvas;
}

/**
 * 3D Solid Volumetric Neon Hexagon Frame
 * Made of 6 interconnected solid neon rods with radiant emissive glow (eliminates WebGL 1px line limits).
 */
const HEX_TIER1_OUTER = computeGroundedHexagonVertices(6.40, 5.00, 3.80);
const HEX_TIER1_INNER = offsetGroundedContour(HEX_TIER1_OUTER, 0.36);
const HEX_TIER2_OUTER = HEX_TIER1_INNER;
const HEX_TIER2_INNER = offsetGroundedContour(HEX_TIER2_OUTER, 0.32);
const HEX_TIER3_OUTER = HEX_TIER2_INNER;
const HEX_TIER3_INNER = offsetGroundedContour(HEX_TIER3_OUTER, 0.28);

/**
 * Solid 3D Glowing Neon Tube running along the 5 grounded arch edges (excluding floor line)
 */
function GroundedHexagon3DNeonFrame({
  pts,
  w,
  h,
  thickness = 0.035,
  color,
  z = 0,
}: {
  pts?: [number, number][];
  w?: number;
  h?: number;
  thickness?: number;
  color: THREE.Color;
  z?: number;
}) {
  const edgeList = useMemo(() => {
    let pointList: [number, number][];
    if (pts && pts.length === 6) {
      pointList = pts;
    } else {
      const width = w ?? 5.20;
      const height = h ?? 4.60;
      pointList = computeGroundedHexagonVertices(width, height, width * 0.70);
    }
    // 5 edges: [0]->[5], [5]->[4], [4]->[3], [3]->[2], [2]->[1]
    const seq = [0, 5, 4, 3, 2, 1];
    const pairs: Array<[THREE.Vector3, THREE.Vector3]> = [];
    for (let i = 0; i < seq.length - 1; i++) {
      const pA = pointList[seq[i]];
      const pB = pointList[seq[i + 1]];
      pairs.push([new THREE.Vector3(pA[0], pA[1], z), new THREE.Vector3(pB[0], pB[1], z)]);
    }
    return pairs;
  }, [pts, w, h, z]);

  return (
    <group>
      {edgeList.map(([p1, p2], idx) => {
        const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        const len = p1.distanceTo(p2);
        const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);

        return (
          <mesh
            key={`grd-hex-neon-${idx}`}
            position={[mid.x, mid.y, mid.z]}
            rotation={[0, 0, ang]}
          >
            <boxGeometry args={[len, thickness, thickness]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
}

/**
 * Concentric Cut-Bottom Hexagon Arch Tier with Solid Aluminum Frame
 * Seamless adjoined stepped tiers touching the floor at Y = 0
 */
function CutBottomHexagonArch({
  outerPts,
  innerPts,
  outerW = 5.20,
  outerH = 4.60,
  innerW,
  innerH,
  neonColor,
  depth = 0.20,
  showOuterNeon = true,
  showInnerNeon = true,
}: {
  outerPts?: [number, number][];
  innerPts?: [number, number][];
  outerW?: number;
  outerH?: number;
  innerW?: number;
  innerH?: number;
  neonColor: THREE.Color;
  depth?: number;
  showOuterNeon?: boolean;
  showInnerNeon?: boolean;
}) {
  const oPts = useMemo(() => {
    if (outerPts && outerPts.length === 6) return outerPts;
    return computeGroundedHexagonVertices(outerW, outerH, outerW * 0.70);
  }, [outerPts, outerW, outerH]);

  const iPts = useMemo(() => {
    if (innerPts && innerPts.length === 6) return innerPts;
    const thickness = innerW ? Math.max(0.20, (outerW - innerW) / 2) : 0.38;
    return offsetGroundedContour(oPts, thickness);
  }, [innerPts, oPts, outerW, innerW]);

  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(oPts[0][0], oPts[0][1]);
    for (let i = 1; i < oPts.length; i++) {
      s.lineTo(oPts[i][0], oPts[i][1]);
    }
    s.closePath();

    const hole = new THREE.Path();
    hole.moveTo(iPts[0][0], iPts[0][1]);
    hole.lineTo(iPts[5][0], iPts[5][1]);
    hole.lineTo(iPts[4][0], iPts[4][1]);
    hole.lineTo(iPts[3][0], iPts[3][1]);
    hole.lineTo(iPts[2][0], iPts[2][1]);
    hole.lineTo(iPts[1][0], iPts[1][1]);
    hole.closePath();
    s.holes.push(hole);

    return s;
  }, [oPts, iPts]);

  const geometry = useMemo(
    () =>
      new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: true,
        bevelSegments: 1,
        steps: 1,
        bevelSize: 0.015,
        bevelThickness: 0.015,
      }),
    [shape, depth]
  );

  return (
    <group position={[0, 0, 0]}>
      {/* Metallic Frame Body (Deep Broadcast Slate Blue / Aluminum) */}
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color="#334155"
          metalness={0.85}
          roughness={0.20}
          envMapIntensity={2.0}
        />
      </mesh>

      {/* Front Solid 3D Glowing Neon Rim along Outer Perimeter */}
      {showOuterNeon && (
        <GroundedHexagon3DNeonFrame pts={oPts} thickness={0.035} color={neonColor} z={depth + 0.012} />
      )}

      {/* Front Solid 3D Glowing Neon Rim along Inner Perimeter */}
      {showInnerNeon && (
        <GroundedHexagon3DNeonFrame pts={iPts} thickness={0.030} color={neonColor} z={depth + 0.012} />
      )}
    </group>
  );
}

/**
 * Central Studio Set:
 * 1. Stage Center-Right: 1 Large Cut-Bottom Hexagon Arch + Starry Night Cosmos, angled at -38° facing Contestants
 * 2. Stage Far-Right: Rectangular Broadcast LED Display facing Contestants (Generous Spacing from Hexagon)
 * 3. Stage Left: Sweeping Curved Science Formula Wall with Inward Chevron Notch & Stepped Top
 */
export function CentralLedWall({
  state,
  screenFadeProgress = 0,
  quality = "HIGH",
  liveFactor = 1.0,
}: CentralLedWallProps) {
  const { gl, scene, camera } = useThree();
  const logoImageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const rightScreenMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const totemCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const totemTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const starryCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const starryTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const formulaWallCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const formulaWallTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const mathWallVideoRef = useRef<HTMLVideoElement | null>(null);
  const [mathWallVideoTexture, setMathWallVideoTexture] = React.useState<THREE.VideoTexture | null>(null);
  const accumulatedTimeRef = useRef<number>(0);
  const lastWallFrameRef = useRef<number>(0);
  const lastScreenFrameRef = useRef<number>(0);
  const lastFadeRef = useRef<number>(-1);

  // ── Uniform 0.2s (200ms) Broadcast LED Processor Delay Queue ──
  // Every Right LED Screen update (mode switches, questions, graphics, scoreboard, blue/red fades)
  // enters this FIFO queue and commits 200ms after live studio events.
  const delayedStateRef = useRef<OlympiaState | null | undefined>(state);
  const delayedFadeRef = useRef<number>(screenFadeProgress);
  const hasMountedRightRef = useRef<boolean>(false);
  const rightNeedsRedrawRef = useRef<boolean>(false);
  const rightDelayQueueRef = useRef<
    Array<{ readyAt: number; state: OlympiaState | null | undefined; fade: number }>
  >([]);
  const rightNeonMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const rightBezelBaseNavy = useMemo(() => new THREE.Color("#1d4ed8"), []);
  const rightBezelCrimson = useMemo(() => new THREE.Color("#cc1122"), []);
  const rightBezelDark = useMemo(() => new THREE.Color("#020712"), []);
  const rightBezelWorkColor = useMemo(() => new THREE.Color(), []);

  // Lazy WebGLRenderTarget ring buffer for Right Screen live delayed "camera" mode
  const camRingRef = useRef<{
    qualityKey: "HIGH" | "MEDIUM" | "LIGHT";
    slots: Array<{ rt: THREE.WebGLRenderTarget; capturedAt: number }>;
    writeIdx: number;
    lastCaptureAt: number;
    firstCaptureAt: number;
  } | null>(null);

  const disposeCameraRing = React.useCallback(() => {
    const ring = camRingRef.current;
    if (!ring) return;
    ring.slots.forEach((s) => s.rt.dispose());
    camRingRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      disposeCameraRing();
    };
  }, [disposeCameraRing]);

  useEffect(() => {
    if (camRingRef.current && camRingRef.current.qualityKey !== quality) {
      disposeCameraRing();
    }
  }, [quality, disposeCameraRing]);

  // Preload UTM Neutra 3D Title PNGs and trigger delayed canvas refresh as soon as loaded
  useEffect(() => {
    if (typeof window === "undefined") return;
    const titles = ["olympia", "khoidong", "vcnv", "tangtoc", "vedich", "cauhoiphu"];
    titles.forEach((key) => {
      getOrLoadTitleImage(key, () => {
        rightNeedsRedrawRef.current = true;
      });
    });
  }, []);

  // Initialize WebM Video Texture for Curved Math & Science Wall (Bends across R=8.6m Cylinder)
  useEffect(() => {
    if (typeof document === "undefined") return;
    const video = document.createElement("video");
    video.src = "/olympia/math_science_wall.webm";
    video.crossOrigin = "anonymous";
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;

    const handleCanPlay = () => {
      video.play().catch(() => {});
    };
    video.addEventListener("canplay", handleCanPlay);
    video.play().catch(() => {});

    const videoTex = new THREE.VideoTexture(video);
    videoTex.colorSpace = THREE.SRGBColorSpace;
    videoTex.minFilter = THREE.LinearFilter;
    videoTex.magFilter = THREE.LinearFilter;
    // Invert horizontal UV to fix BackSide cylinder mirroring so all formulas and QUIZORRA logo read properly left-to-right
    videoTex.wrapS = THREE.RepeatWrapping;
    videoTex.repeat.x = -1;
    videoTex.offset.x = 1;

    mathWallVideoRef.current = video;
    setMathWallVideoTexture(videoTex);

    return () => {
      video.removeEventListener("canplay", handleCanPlay);
      video.pause();
      video.removeAttribute("src");
      video.load();
      videoTex.dispose();
    };
  }, []);

  // Preload Olympia 2016 logo
  useEffect(() => {
    if (typeof window === "undefined") return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = `${window.location.origin}/olympia/Olympia_logo_2016.webp`;
    img.onload = () => {
      logoImageRef.current = img;
      rightNeedsRedrawRef.current = true;
      if (totemCanvasRef.current && totemTextureRef.current) {
        renderVerticalTotemToCanvas(totemCanvasRef.current, state, screenFadeProgress);
        totemTextureRef.current.needsUpdate = true;
      }
      if (starryCanvasRef.current && starryTextureRef.current) {
        renderStarryNightToCanvas(starryCanvasRef.current, img, screenFadeProgress);
        starryTextureRef.current.needsUpdate = true;
      }
    };
    img.onerror = () => {
      const fallback = new Image();
      fallback.crossOrigin = "anonymous";
      fallback.src = "/olympia/Olympia_logo_2016.webp";
      fallback.onload = () => {
        logoImageRef.current = fallback;
        rightNeedsRedrawRef.current = true;
        if (totemCanvasRef.current && totemTextureRef.current) {
          renderVerticalTotemToCanvas(totemCanvasRef.current, state, screenFadeProgress);
          totemTextureRef.current.needsUpdate = true;
        }
        if (starryCanvasRef.current && starryTextureRef.current) {
          renderStarryNightToCanvas(starryCanvasRef.current, fallback, screenFadeProgress);
          starryTextureRef.current.needsUpdate = true;
        }
      };
    };
  }, []);

  // Pre-allocated static canvas for Rectangular LED Display (1280x720 in HIGH, 960x540 in LIGHT/MED for maximum 60fps throughput)
  const canvas = useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = quality === "HIGH" ? 1280 : 960;
    c.height = quality === "HIGH" ? 720 : 540;
    renderLedScreenToCanvas(c, logoImageRef.current, screenFadeProgress, state);
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

  // Starry Night Texture for Hexagon Arch Interior
  const starryCanvas = useMemo(() => {
    if (typeof document === "undefined") return null;
    return createStarryNightCanvas();
  }, []);

  const starryTexture = useMemo(() => {
    if (!starryCanvas) return null;
    const tex = new THREE.CanvasTexture(starryCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [starryCanvas]);

  // Curved Formula Wall Texture (Generated once into memory cache, zero GC lag)
  const formulaWallCanvas = useMemo(() => {
    if (typeof document === "undefined") return null;
    return createCurvedFormulaCanvas(0);
  }, []);

  const formulaWallTexture = useMemo(() => {
    if (!formulaWallCanvas) return null;
    const tex = new THREE.CanvasTexture(formulaWallCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    // Invert horizontal UV to fix BackSide mirroring so all text reads properly left-to-right
    tex.wrapS = THREE.RepeatWrapping;
    tex.repeat.x = -1;
    tex.offset.x = 1;
    return tex;
  }, [formulaWallCanvas]);

  useEffect(() => {
    formulaWallCanvasRef.current = formulaWallCanvas;
    formulaWallTextureRef.current = formulaWallTexture;
  }, [formulaWallCanvas, formulaWallTexture]);

  // Custom WebGL ShaderMaterial for Curved Math & Science Wall (R=8.6m):
  // - Uses single transparent VP9 WebM (yuva420p) with zero duplicate video decode overhead
  // - Preserves pure white core & exact alpha transparency while smoothly crossfading Cyan/Blue <-> Ruby Crimson
  // - Flips UV horizontally (1.0 - vUv.x) to correct BackSide cylinder mirroring
  const mathWallShaderMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: null as THREE.Texture | null },
        uRedProgress: { value: 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        uniform float uRedProgress;
        varying vec2 vUv;

        void main() {
          vec2 uvCoord = vec2(1.0 - vUv.x, vUv.y);
          vec4 tex = texture2D(uMap, uvCoord);
          if (tex.a < 0.004) discard;

          float t = clamp(uRedProgress, 0.0, 1.0);
          vec3 baseLinear = max(tex.rgb, vec3(0.0));

          // Perform hue/chroma remapping in perceptual sRGB space so pure white cores stay crisp white
          vec3 srgb = pow(baseLinear, vec3(1.0 / 2.2));
          float minCh = min(srgb.r, min(srgb.g, srgb.b));
          float maxCh = max(srgb.r, max(srgb.g, srgb.b));
          float chroma = max(0.0, maxCh - minCh);

          // Vibrant VTV3 S14 Ruby-Crimson neon palette matching stage red elements
          vec3 redSrgb = vec3(
            clamp(minCh + chroma * 1.18, 0.0, 1.0),
            clamp(minCh + chroma * 0.11, 0.0, 1.0),
            clamp(minCh + chroma * 0.22, 0.0, 1.0)
          );

          // Luminance-preserving crossfade (subtle mid-transition glow prevents muddy gray dip at t=0.5)
          vec3 mixedSrgb = mix(srgb, redSrgb, t);
          float midBoost = 1.0 + 0.14 * sin(3.14159265 * t) * clamp(chroma * 1.4, 0.0, 1.0);
          mixedSrgb = clamp(mixedSrgb * midBoost, 0.0, 1.0);

          vec3 outLinear = pow(mixedSrgb, vec3(2.2));
          gl_FragColor = vec4(outLinear, tex.a);
          #include <colorspace_fragment>
        }
      `,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
  }, []);

  useEffect(() => {
    return () => {
      mathWallShaderMat.dispose();
    };
  }, [mathWallShaderMat]);

  const activeMathWallTexture = mathWallVideoTexture || formulaWallTexture;
  useEffect(() => {
    if (activeMathWallTexture) {
      mathWallShaderMat.uniforms.uMap.value = activeMathWallTexture;
    }
  }, [mathWallShaderMat, activeMathWallTexture]);

  const isArchRed = screenFadeProgress > 0.5;

  // Perforated White LED Dots Arch Texture (Images 3 & 4)
  const whiteDotsArchCanvas = useMemo(() => {
    if (typeof document === "undefined") return null;
    return createWhiteDotsArchCanvas(isArchRed);
  }, [isArchRed]);

  const whiteDotsArchTexture = useMemo(() => {
    if (!whiteDotsArchCanvas) return null;
    const tex = new THREE.CanvasTexture(whiteDotsArchCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.repeat.x = -1;
    tex.offset.x = 1;
    return tex;
  }, [whiteDotsArchCanvas]);

  // Quizorra Sponsor Logo Lightbox Texture
  const quizorraBadgeCanvas = useMemo(() => {
    if (typeof document === "undefined") return null;
    return createQuizorraBadgeCanvas();
  }, []);

  const quizorraBadgeTexture = useMemo(() => {
    if (!quizorraBadgeCanvas) return null;
    const tex = new THREE.CanvasTexture(quizorraBadgeCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [quizorraBadgeCanvas]);

  // Sponsor Triangular / Fan Matrix Backing Texture
  const sponsorMatrixBackingCanvas = useMemo(() => {
    if (typeof document === "undefined") return null;
    return createSponsorMatrixBackingCanvas();
  }, []);

  const sponsorMatrixBackingTexture = useMemo(() => {
    if (!sponsorMatrixBackingCanvas) return null;
    const tex = new THREE.CanvasTexture(sponsorMatrixBackingCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [sponsorMatrixBackingCanvas]);

  // Vertical Totem LED Screen Texture (Aspect Ratio 9:16) with explicit ref caching
  const totemCanvas = useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = 576;
    c.height = 1024;
    renderVerticalTotemToCanvas(c, state, screenFadeProgress);
    return c;
  }, []);

  const totemTexture = useMemo(() => {
    if (!totemCanvas) return null;
    const tex = new THREE.CanvasTexture(totemCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }, [totemCanvas]);

  useEffect(() => {
    totemCanvasRef.current = totemCanvas;
    totemTextureRef.current = totemTexture;
    if (totemCanvas && totemTexture) {
      renderVerticalTotemToCanvas(totemCanvas, state, screenFadeProgress);
      totemTexture.needsUpdate = true;
    }
  }, [totemCanvas, totemTexture]);

  const rightNeonMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#1d4ed8" }), []);
  useEffect(() => {
    return () => {
      rightNeonMat.dispose();
    };
  }, [rightNeonMat]);

  // Quantized 8-step fade trigger for smooth crossfade on Stage Right screen without idle spam
  const fadeStep = Math.round(screenFadeProgress * 8);

  // Enqueue Right LED Screen updates with uniform 0.2s (RIGHT_SCREEN_DELAY_MS) broadcast delay;
  // Vertical Totem & Curved Formula Wall update immediately.
  useEffect(() => {
    if (!hasMountedRightRef.current) {
      hasMountedRightRef.current = true;
      delayedStateRef.current = state;
      delayedFadeRef.current = screenFadeProgress;
      rightNeedsRedrawRef.current = true;
    } else {
      const q = rightDelayQueueRef.current;
      q.push({
        readyAt: performance.now() + RIGHT_SCREEN_DELAY_MS,
        state,
        fade: screenFadeProgress,
      });
      if (q.length > 120) {
        q.splice(0, q.length - 120);
      }
    }
    if (totemCanvasRef.current && totemTextureRef.current) {
      renderVerticalTotemToCanvas(totemCanvasRef.current, state, screenFadeProgress);
      totemTextureRef.current.needsUpdate = true;
    }
    if (formulaWallCanvasRef.current && formulaWallTextureRef.current) {
      renderDynamicCurvedFormulaCanvas(
        formulaWallCanvasRef.current,
        0,
        screenFadeProgress,
        quality
      );
      formulaWallTextureRef.current.needsUpdate = true;
    }
  }, [
    state,
    screenFadeProgress,
    fadeStep,
    quality,
  ]);

  // 30 FPS Dynamic Canvas Engine (Requirement R5)
  // Drives smooth floating kinematics, uniform 0.2s delayed Right LED Screen queue & optional Camera RenderTarget feed.
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    accumulatedTimeRef.current += dt;
    const t = accumulatedTimeRef.current;
    const nowMs = performance.now();

    if (mathWallVideoTexture && mathWallVideoRef.current && !mathWallVideoRef.current.paused) {
      mathWallVideoTexture.needsUpdate = true;
    }

    // Smoothly drive Curved Math & Science Wall WebGL shader crossfade (0.0 Blue <-> 1.0 Ruby Red)
    const targetRed = Math.max(0, Math.min(1, screenFadeProgress));
    const curRed = mathWallShaderMat.uniforms.uRedProgress.value as number;
    const nextRed = Math.abs(targetRed - curRed) < 0.002
      ? targetRed
      : THREE.MathUtils.lerp(curRed, targetRed, Math.min(1, dt * 14));
    mathWallShaderMat.uniforms.uRedProgress.value = nextRed;
    if (activeMathWallTexture && mathWallShaderMat.uniforms.uMap.value !== activeMathWallTexture) {
      mathWallShaderMat.uniforms.uMap.value = activeMathWallTexture;
    }

    // ── Drain uniform 0.2s delay queue for the Right LED Screen ──
    const q = rightDelayQueueRef.current;
    while (q.length > 0 && q[0].readyAt <= nowMs) {
      const next = q.shift()!;
      delayedStateRef.current = next.state;
      delayedFadeRef.current = next.fade;
      rightNeedsRedrawRef.current = true;
    }

    const dState = delayedStateRef.current;
    const dFade = delayedFadeRef.current;

    // Update Right Screen bezel neon color using the 0.2s delayed fade factor
    rightBezelWorkColor.copy(rightBezelBaseNavy).lerp(rightBezelCrimson, Math.max(0, Math.min(1, dFade)));
    rightNeonMat.color.copy(rightBezelDark).lerp(rightBezelWorkColor, Math.max(0.0, Math.min(1.0, liveFactor)));

    const resolvedRightMode = resolveRightScreenDisplayMode(dState);

    // ── Live 3D Studio Camera Mode (~0.2s delayed ring buffer of WebGLRenderTargets) ──
    if (resolvedRightMode === "camera" && rightScreenMatRef.current) {
      const spec =
        quality === "LIGHT"
          ? { w: 256, h: 144, intervalMs: 70, slots: 4 }
          : quality === "MEDIUM"
          ? { w: 384, h: 216, intervalMs: 45, slots: 6 }
          : { w: 512, h: 288, intervalMs: 33, slots: 8 };

      if (!camRingRef.current) {
        const created = Array.from({ length: spec.slots }, () => ({
          rt: new THREE.WebGLRenderTarget(spec.w, spec.h, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            depthBuffer: true,
            stencilBuffer: false,
          }),
          capturedAt: 0,
        }));
        camRingRef.current = {
          qualityKey: quality,
          slots: created,
          writeIdx: 0,
          lastCaptureAt: 0,
          firstCaptureAt: nowMs,
        };
        if (canvasRef.current && textureRef.current) {
          renderLedScreenToCanvas(canvasRef.current, logoImageRef.current, dFade, dState, t);
          textureRef.current.needsUpdate = true;
        }
      }

      const ring = camRingRef.current;
      if (nowMs - ring.lastCaptureAt >= spec.intervalMs) {
        const slot = ring.slots[ring.writeIdx];
        ring.writeIdx = (ring.writeIdx + 1) % ring.slots.length;
        ring.lastCaptureAt = nowMs;

        // Guard against recursive nested reflection on the Right LED Screen during offscreen capture
        const mat = rightScreenMatRef.current;
        const prevMap = mat.map;
        const prevRt = gl.getRenderTarget();
        const prevXr = gl.xr.enabled;
        try {
          if (textureRef.current) {
            mat.map = textureRef.current;
          }
          gl.xr.enabled = false;
          gl.setRenderTarget(slot.rt);
          gl.clear();
          gl.render(scene, camera);
          slot.capturedAt = nowMs;
        } finally {
          gl.setRenderTarget(prevRt);
          gl.xr.enabled = prevXr;
          mat.map = prevMap;
        }
      }

      // Select frame captured >= RIGHT_SCREEN_DELAY_MS ago; hold oldest captured frame during initial 200ms fill
      const cutoff = nowMs - RIGHT_SCREEN_DELAY_MS;
      let delayedSlot: { rt: THREE.WebGLRenderTarget; capturedAt: number } | null = null;
      let oldestSlot: { rt: THREE.WebGLRenderTarget; capturedAt: number } | null = null;
      for (const s of ring.slots) {
        if (s.capturedAt <= 0) continue;
        if (!oldestSlot || s.capturedAt < oldestSlot.capturedAt) {
          oldestSlot = s;
        }
        if (s.capturedAt <= cutoff && (!delayedSlot || s.capturedAt > delayedSlot.capturedAt)) {
          delayedSlot = s;
        }
      }
      const chosenSlot = delayedSlot || oldestSlot;
      const desiredMap = chosenSlot ? chosenSlot.rt.texture : textureRef.current;
      if (desiredMap && rightScreenMatRef.current.map !== desiredMap) {
        rightScreenMatRef.current.map = desiredMap;
        rightScreenMatRef.current.needsUpdate = true;
      }
    } else {
      // Non-camera Right Screen modes: restore 2D CanvasTexture cleanly
      if (rightScreenMatRef.current && textureRef.current && rightScreenMatRef.current.map !== textureRef.current) {
        rightScreenMatRef.current.map = textureRef.current;
        rightScreenMatRef.current.needsUpdate = true;
        rightNeedsRedrawRef.current = true;
      }
      if (camRingRef.current) {
        disposeCameraRing();
      }
    }

    // Throttle Stage Right Screen & Vertical Totem periodic animations; also commit immediate delayed updates
    const isIdle = isPreMatchIdle(dState);
    const vd = dState?.veDich;
    const isPracticeCountdown = Boolean(
      dState?.currentRound === "veDich" &&
      vd?.current?.q?.type === "practice" && (
        (vd.phase === "thinking" && vd.timer?.startedAt) ||
        (vd.phase === "stealing" && vd.steal?.timer?.startedAt)
      )
    );
    const screenInterval = isPracticeCountdown ? 0.033 : quality === "LIGHT" ? 0.400 : 0.300;
    const periodicDue = (isIdle || isPracticeCountdown) && t - lastScreenFrameRef.current >= screenInterval;
    if (rightNeedsRedrawRef.current || periodicDue) {
      if (periodicDue) lastScreenFrameRef.current = t;
      const forceRightRedraw = rightNeedsRedrawRef.current;
      rightNeedsRedrawRef.current = false;

      if ((forceRightRedraw || periodicDue) && resolvedRightMode !== "camera") {
        if (canvasRef.current && textureRef.current) {
          renderLedScreenToCanvas(
            canvasRef.current,
            logoImageRef.current,
            dFade,
            dState,
            t
          );
          textureRef.current.needsUpdate = true;
        }
      }
      if (periodicDue && totemCanvasRef.current && totemTextureRef.current) {
        renderVerticalTotemToCanvas(
          totemCanvasRef.current,
          state,
          screenFadeProgress,
          t
        );
        totemTextureRef.current.needsUpdate = true;
      }
    }
  });

  const neonColor = useMemo(() => {
    const navy = new THREE.Color("#1d4ed8");
    const crimson = new THREE.Color("#cc1122");
    const baseColor = navy.clone().lerp(crimson, Math.max(0, Math.min(1, screenFadeProgress)));
    const darkDormant = new THREE.Color("#020712");
    return darkDormant.lerp(baseColor, Math.max(0.0, Math.min(1.0, liveFactor)));
  }, [screenFadeProgress, liveFactor]);

  // Dynamic color transition between Royal Navy (#1d4ed8) and Crimson Red (#cc1122) for LED dot arch top rim
  const archRimColor = useMemo(() => {
    const navy = new THREE.Color("#1d4ed8");
    const crimson = new THREE.Color("#cc1122");
    const darkDormant = new THREE.Color("#020712");
    const activeColor = navy.clone().lerp(crimson, screenFadeProgress);
    return darkDormant.lerp(activeColor, Math.max(0.0, Math.min(1.0, liveFactor)));
  }, [screenFadeProgress, liveFactor]);

  // Solid Grounded Hexagon Geometry for Starry Portal Interior Backdrop at Y = 0
  // Normalized UV coordinates to map starry texture seamlessly across the shape with ZERO vertical stripes
  const solidGroundedHexagonGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(HEX_TIER3_INNER[0][0], HEX_TIER3_INNER[0][1]);
    for (let i = 1; i < HEX_TIER3_INNER.length; i++) {
      shape.lineTo(HEX_TIER3_INNER[i][0], HEX_TIER3_INNER[i][1]);
    }
    shape.closePath();
    const geom = new THREE.ShapeGeometry(shape);
    geom.computeBoundingBox();
    const { min, max } = geom.boundingBox!;
    const dx = max.x - min.x;
    const dy = max.y - min.y;
    const pos = geom.attributes.position;
    const uvs = geom.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      uvs.setXY(i, (x - min.x) / dx, (y - min.y) / dy);
    }
    uvs.needsUpdate = true;
    return geom;
  }, []);

  // Expanded formula wall sweep angle (0.76 * Math.PI) frames all 1..8 contestant podiums
  // and reaches right up to the MC entrance portal / door
  const wallSweepAng = 0.76 * Math.PI;
  const wallStartAng = 1.05 * Math.PI;
  // Sweep lower base wall and horizontal neon tubes under the entire screen
  const lowerWallStartAng = 1.05 * Math.PI;
  const lowerWallSweepAng = wallSweepAng - 0.01 * Math.PI;
  const FORMULA_WALL_OFFSET_X = -0.15;

  // High-Priority Visual Refinement:
  // 1. Cung vòm LED (⌒) thu hẹp chiều dài: Chỉ chiếm ~65% chiều dài vách công thức, tập trung đối xứng quanh trung tâm
  const archStartAng = wallStartAng + 0.175 * wallSweepAng;
  const archSweepAng = 0.65 * wallSweepAng;
  // 2. Lùi sâu về sau: Đẩy lùi về phía sau một khoảng ΔR = +0.22m (R ≈ 8.86m), tạo khoảng hở chiều sâu 3D rõ rệt
  const archRadius = 8.86;

  // Milestone 2 Core: Parametric Curved Vertical Upward Arc Ribbon (⌒) along radius R = 8.86m, H = 0.22m
  // Centerline rises smoothly from Y = 3.75m at both ends to an apex of Y ≈ 4.95m in the center
  const upwardArchRibbonGeometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const segments = quality === "LIGHT" ? 48 : 96;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const R = archRadius;
    const H = 0.22;

    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      const theta = archStartAng + u * archSweepAng;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);
      const x = R * sinTheta;
      const z = R * cosTheta;

      // Upward vertical curve (⌒): peaks at Y ≈ 4.95m in center, curves down to Y ≈ 3.75m at both ends
      const yCenter = 3.75 + 1.20 * Math.sin(Math.PI * u);
      const yBot = yCenter - H / 2;
      const yTop = yCenter + H / 2;

      // Bottom vertex
      positions.push(x, yBot, z);
      uvs.push(1 - u, 0);

      // Top vertex
      positions.push(x, yTop, z);
      uvs.push(1 - u, 1);
    }

    for (let i = 0; i < segments; i++) {
      const b0 = i * 2;
      const t0 = i * 2 + 1;
      const b1 = (i + 1) * 2;
      const t1 = (i + 1) * 2 + 1;

      // Facing inward toward studio center
      indices.push(b0, b1, t0);
      indices.push(t0, b1, t1);
    }

    geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }, [archStartAng, archSweepAng, quality]);

  // Parametric 3D Glowing Neon Spline along the top edge of the upward arch ribbon (Single Top Rim, 0.025m thickness, zero bottom rim)
  const archTopRimGeometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const segments = quality === "LIGHT" ? 48 : 96;
    const positions: number[] = [];
    const indices: number[] = [];
    const R = archRadius;
    const H = 0.22;
    const rimThickness = 0.025; // 0.025m single top-edge rim thickness

    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      const theta = archStartAng + u * archSweepAng;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);
      const x = R * sinTheta;
      const z = R * cosTheta;

      const yCenter = 3.75 + 1.20 * Math.sin(Math.PI * u);
      const yTop = yCenter + H / 2;
      const yRimBottom = yTop - rimThickness;

      // Bottom vertex of rim
      positions.push(x, yRimBottom, z);
      // Top vertex of rim
      positions.push(x, yTop, z);
    }

    for (let i = 0; i < segments; i++) {
      const b0 = i * 2;
      const t0 = i * 2 + 1;
      const b1 = (i + 1) * 2;
      const t1 = (i + 1) * 2 + 1;

      // Facing inward toward studio center
      indices.push(b0, b1, t0);
      indices.push(t0, b1, t1);
    }

    geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }, [archStartAng, archSweepAng, quality]);

  // Fan/Triangular matrix backing panel filled with warm white matrix LEDs behind the sponsor lightbox
  const sponsorMatrixBackingGeometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const segments = quality === "LIGHT" ? 24 : 48;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const R = archRadius - 0.01; // Placed directly behind the arch ribbon
    const uStart = 0.30;
    const uEnd = 0.70;
    const H = 0.22;

    for (let i = 0; i <= segments; i++) {
      const frac = i / segments;
      const u = uStart + frac * (uEnd - uStart);
      const theta = archStartAng + u * archSweepAng;
      const x = R * Math.sin(theta);
      const z = R * Math.cos(theta);

      const yBot = 3.75; // Top rim of formula screen
      const yArchCenter = 3.75 + 1.20 * Math.sin(Math.PI * u);
      const yTop = Math.max(yBot + 0.05, yArchCenter - H / 2); // Bottom edge of arch ribbon

      positions.push(x, yBot, z);
      uvs.push(1 - frac, 0);

      positions.push(x, yTop, z);
      uvs.push(1 - frac, (yTop - yBot) / 1.10);
    }

    for (let i = 0; i < segments; i++) {
      const b0 = i * 2;
      const t0 = i * 2 + 1;
      const b1 = (i + 1) * 2;
      const t1 = (i + 1) * 2 + 1;

      indices.push(b0, b1, t0);
      indices.push(t0, b1, t1);
    }

    geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }, [wallStartAng, wallSweepAng, quality]);

  return (
    <group>
      {/* ── 1. STAGE CENTER-RIGHT: GRAND GROUNDED CONCENTRIC HEXAGONAL PORTAL (3-TIER STEPPED S14 REDESIGN) ── */}
      {/* Đặt tại [2.10, 0, -7.50], rotation [0, -0.22, 0] đồng trục 100% với Bục MC và CAM 3 */}
      {/* 3 VIỀN (Tier 1, Tier 2, Tier 3) lồng giật cấp theo chiều sâu Z để tạo hiệu ứng đường hầm 3D portal chân thực */}
      <group position={[2.10, 0, -7.50]} rotation={[0, -0.22, 0]}>
        {/* Tier 1 (Viền ngoài cùng): 6.40m x 5.00m tại Z = 0 */}
        <CutBottomHexagonArch
          outerPts={HEX_TIER1_OUTER}
          innerPts={HEX_TIER1_INNER}
          outerW={6.40}
          outerH={5.00}
          innerW={5.68}
          innerH={4.28}
          neonColor={neonColor}
          depth={0.18}
          showOuterNeon={true}
          showInnerNeon={true}
        />

        {/* Tier 2 (Viền giữa - lùi Z = -0.25m): ~5.68m x ~4.28m */}
        <group position={[0, 0, -0.25]}>
          <CutBottomHexagonArch
            outerPts={HEX_TIER2_OUTER}
            innerPts={HEX_TIER2_INNER}
            outerW={5.68}
            outerH={4.28}
            innerW={5.04}
            innerH={3.64}
            neonColor={neonColor}
            depth={0.18}
            showOuterNeon={true}
            showInnerNeon={true}
          />
        </group>

        {/* Tier 3 (Viền trong cùng - lùi Z = -0.50m): ~5.04m x ~3.64m */}
        <group position={[0, 0, -0.50]}>
          <CutBottomHexagonArch
            outerPts={HEX_TIER3_OUTER}
            innerPts={HEX_TIER3_INNER}
            outerW={5.04}
            outerH={3.64}
            innerW={4.48}
            innerH={3.08}
            neonColor={neonColor}
            depth={0.18}
            showOuterNeon={true}
            showInnerNeon={true}
          />
        </group>

        {/* Hành lang sàn catwalk phát sáng nối giữa Cổng vòm (Z=0) và Màn LED (Z=-1.25m) để MC bước ra */}
        <mesh position={[0, 0.02, -0.65]}>
          <boxGeometry args={[2.50, 0.04, 1.30]} />
          <meshStandardMaterial color="#01030a" metalness={0.05} roughness={0.08} />
        </mesh>
        {/* Đèn chỉ dẫn neon hai bên mép lối đi của MC */}
        <mesh position={[-1.25, 0.042, -0.65]}>
          <boxGeometry args={[0.02, 0.015, 1.30]} />
          <meshBasicMaterial color={neonColor} />
        </mesh>
        <mesh position={[1.25, 0.042, -0.65]}>
          <boxGeometry args={[0.02, 0.015, 1.30]} />
          <meshBasicMaterial color={neonColor} />
        </mesh>

        {/* Màn hình LED vũ trụ bên trong lùi sâu Z = -1.25m mang logo Olympia vàng kim rực rỡ */}
        <mesh position={[0, 0, -1.25]}>
          <primitive object={solidGroundedHexagonGeometry} attach="geometry" />
          {starryTexture ? (
            <meshBasicMaterial map={starryTexture} toneMapped={false} side={THREE.DoubleSide} />
          ) : (
            <meshStandardMaterial color="#020617" roughness={0.3} metalness={0.8} />
          )}
        </mesh>
      </group>

      {/* ── 2. STAGE RIGHT WING: ELEVATED LANDSCAPE 16:9 SCREEN (XOAY -65° VỀ MẶT THÍ SINH + 3 LỚP VIỀN GIẬT CẤP) ── */}
      {/* Đặt tại [6.65, 3.25, -2.10], xoay -65° [-1.134 rad] hướng thẳng góc nhìn của các thí sinh & giữ khoảng cách thông thoáng với bục MC */}
      <group position={[6.65, 3.25, -2.10]} rotation={[0, -1.134, 0]}>
        {/* Structural Truss Columns behind the Screen */}
        <mesh position={[-2.30, -1.2, -0.28]}>
          <boxGeometry args={[0.22, 4.4, 0.22]} />
          <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[2.30, -1.2, -0.28]}>
          <boxGeometry args={[0.22, 4.4, 0.22]} />
          <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Lower backing wall panel spanning underneath screen to floor */}
        <mesh position={[0, -1.9, -0.36]}>
          <boxGeometry args={[5.50, 3.4, 0.12]} />
          <meshStandardMaterial color="#040d22" roughness={0.35} metalness={0.7} />
        </mesh>

        {/* Continuous Horizontal Glowing Neon Tubes Underneath Elevated Screen down to stage floor (spans 5.5m) */}
        {[-3.0, -2.5, -2.0, -1.5].map((slatY, sIdx) => (
          <mesh key={`lower-slat-${sIdx}`} position={[0, slatY, -0.32]} material={rightNeonMat}>
            <boxGeometry args={[5.50, 0.045, 0.045]} />
          </mesh>
        ))}

        {/* Horizontal LED wall slats behind screen (width 5.4m) */}
        {[-1.2, -0.6, 0.0, 0.6, 1.2].map((slatY, sIdx) => (
          <mesh key={`slat-${sIdx}`} position={[0, slatY, -0.32]} material={rightNeonMat}>
            <boxGeometry args={[5.40, 0.05, 0.05]} />
          </mesh>
        ))}

        {/* ── 3 LỚP VIỀN GIẬT CẤP (3-TIER STEPPED CONCENTRIC BEZELS WITH NEON TUBING) ── */}
        {/* Lớp viền 1 (Outer Bezel Tier): 5.36m x 3.365m x 0.10m tại Z = -0.14 */}
        <mesh position={[0, 0, -0.14]}>
          <boxGeometry args={[5.36, 3.365, 0.10]} />
          <meshStandardMaterial color="#070d1e" metalness={0.92} roughness={0.18} />
        </mesh>
        {/* Viền Neon Lớp 1 */}
        <mesh position={[0, 1.6825, -0.09]} material={rightNeonMat}>
          <boxGeometry args={[5.36, 0.035, 0.035]} />
        </mesh>
        <mesh position={[0, -1.6825, -0.09]} material={rightNeonMat}>
          <boxGeometry args={[5.36, 0.035, 0.035]} />
        </mesh>
        <mesh position={[-2.68, 0, -0.09]} material={rightNeonMat}>
          <boxGeometry args={[0.035, 3.365, 0.035]} />
        </mesh>
        <mesh position={[2.68, 0, -0.09]} material={rightNeonMat}>
          <boxGeometry args={[0.035, 3.365, 0.035]} />
        </mesh>

        {/* Lớp viền 2 (Middle Bezel Tier): 5.06m x 3.065m x 0.12m tại Z = -0.06 */}
        <mesh position={[0, 0, -0.06]}>
          <boxGeometry args={[5.06, 3.065, 0.12]} />
          <meshStandardMaterial color="#0f172a" metalness={0.90} roughness={0.20} />
        </mesh>
        {/* Viền Neon Lớp 2 */}
        <mesh position={[0, 1.5325, 0.00]} material={rightNeonMat}>
          <boxGeometry args={[5.06, 0.03, 0.03]} />
        </mesh>
        <mesh position={[0, -1.5325, 0.00]} material={rightNeonMat}>
          <boxGeometry args={[5.06, 0.03, 0.03]} />
        </mesh>
        <mesh position={[-2.53, 0, 0.00]} material={rightNeonMat}>
          <boxGeometry args={[0.03, 3.065, 0.03]} />
        </mesh>
        <mesh position={[2.53, 0, 0.00]} material={rightNeonMat}>
          <boxGeometry args={[0.03, 3.065, 0.03]} />
        </mesh>

        {/* Lớp viền 3 (Inner Bezel Tier): 4.76m x 2.765m x 0.12m tại Z = 0.02 */}
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[4.76, 2.765, 0.12]} />
          <meshStandardMaterial color="#1e293b" metalness={0.88} roughness={0.22} />
        </mesh>
        {/* Viền Neon Lớp 3 */}
        <mesh position={[0, 1.3825, 0.08]} material={rightNeonMat}>
          <boxGeometry args={[4.76, 0.025, 0.025]} />
        </mesh>
        <mesh position={[0, -1.3825, 0.08]} material={rightNeonMat}>
          <boxGeometry args={[4.76, 0.025, 0.025]} />
        </mesh>
        <mesh position={[-2.38, 0, 0.08]} material={rightNeonMat}>
          <boxGeometry args={[0.025, 2.765, 0.025]} />
        </mesh>
        <mesh position={[2.38, 0, 0.08]} material={rightNeonMat}>
          <boxGeometry args={[0.025, 2.765, 0.025]} />
        </mesh>

        {/* LED Screen Display Plane (Aspect Ratio 16:9, 4.56m x 2.565m) */}
        <mesh position={[0, 0, 0.085]}>
          <planeGeometry args={[4.56, 2.565]} />
          {texture ? (
            <meshBasicMaterial ref={rightScreenMatRef} map={texture} toneMapped={false} />
          ) : (
            <meshStandardMaterial color="#020817" roughness={0.2} metalness={0.9} />
          )}
        </mesh>
      </group>

      {/* ── 3. STAGE FAR-RIGHT: VERTICAL TOTEM ARCHITECTURAL SLAT PILLAR (HƯỚNG VỀ PHÍA KHÁN GIẢ) ── */}
      {/* Đã dời xa hẳn sang góc phải phía sau khán đài tại X = 13.0m, Z = 4.5m, hạ độ cao xuống Y = 1.18m */}
      {/* Giúp ở góc máy toàn cảnh (CAM 1), totem hoàn toàn nằm ngoài rìa phải khung hình, chỉ hiện 3 màn hình sân khấu chính */}
      <group position={[13.0, 1.18, 4.5]} rotation={[0, -0.45, 0]}>
        {/* Base Pedestal Plinth (tiếp đất Y=0) */}
        <mesh position={[0, -1.14, 0]}>
          <boxGeometry args={[1.40, 0.08, 0.40]} />
          <meshStandardMaterial color="#080c16" metalness={0.92} roughness={0.18} />
        </mesh>
        <mesh position={[0, -1.09, 0.20]}>
          <boxGeometry args={[1.36, 0.018, 0.02]} />
          <meshBasicMaterial color={neonColor} />
        </mesh>

        {/* Main Totem Housing */}
        <mesh position={[0, 0, -0.06]}>
          <boxGeometry args={[1.34, 2.28, 0.14]} />
          <meshStandardMaterial color="#0f172a" metalness={0.90} roughness={0.20} />
        </mesh>

        {/* Center Vertical Portrait LED Screen */}
        <mesh position={[0, 0, 0.03]}>
          <planeGeometry args={[0.94, 2.08]} />
          {totemTexture ? (
            <meshBasicMaterial map={totemTexture} toneMapped={false} side={THREE.DoubleSide} />
          ) : (
            <meshStandardMaterial color="#020817" roughness={0.2} metalness={0.9} />
          )}
        </mesh>

        {/* Left Illuminated Science Symbol Wing */}
        <mesh position={[-0.58, 0, 0.01]}>
          <boxGeometry args={[0.16, 2.12, 0.03]} />
          <meshStandardMaterial color="#03112c" roughness={0.3} metalness={0.8} />
        </mesh>
        <mesh position={[-0.58, 0, 0.03]}>
          <boxGeometry args={[0.015, 2.08, 0.01]} />
          <meshBasicMaterial color={neonColor} />
        </mesh>

        {/* Right Illuminated Science Symbol Wing */}
        <mesh position={[0.58, 0, 0.01]}>
          <boxGeometry args={[0.16, 2.12, 0.03]} />
          <meshStandardMaterial color="#03112c" roughness={0.3} metalness={0.8} />
        </mesh>
        <mesh position={[0.58, 0, 0.03]}>
          <boxGeometry args={[0.015, 2.08, 0.01]} />
          <meshBasicMaterial color={neonColor} />
        </mesh>

        {/* Glowing Neon Perimeter Frame */}
        <mesh position={[0, 1.14, 0.04]}>
          <boxGeometry args={[1.34, 0.03, 0.03]} />
          <meshBasicMaterial color={neonColor} />
        </mesh>
        <mesh position={[0, -1.14, 0.04]}>
          <boxGeometry args={[1.34, 0.03, 0.03]} />
          <meshBasicMaterial color={neonColor} />
        </mesh>
        <mesh position={[-0.68, 0, 0.04]}>
          <boxGeometry args={[0.03, 2.40, 0.03]} />
          <meshBasicMaterial color={neonColor} />
        </mesh>
        <mesh position={[0.68, 0, 0.04]}>
          <boxGeometry args={[0.03, 2.40, 0.03]} />
          <meshBasicMaterial color={neonColor} />
        </mesh>
      </group>

      {/* ── 4. STAGE LEFT: CURVED SCIENCE & MATH FORMULA WALL (ELEVATED) ── */}
      {/* Concentric arc at R=8.6m from [FORMULA_WALL_OFFSET_X, 0, -0.5]. Sweeps smoothly to frame all 4 to 8 contestants */}
      <group position={[FORMULA_WALL_OFFSET_X, 2.55, -0.5]}>
        <mesh rotation={[0, 0, 0]}>
          <cylinderGeometry
            args={[8.6, 8.6, 2.4, quality === "LIGHT" ? 32 : 64, 1, true, wallStartAng, wallSweepAng]}
          />
          {activeMathWallTexture ? (
            <primitive object={mathWallShaderMat} attach="material" />
          ) : (
            <meshStandardMaterial color="#040b1a" side={THREE.BackSide} roughness={0.3} metalness={0.8} />
          )}
        </mesh>
      </group>

      {/* Underneath Dark Base Wall (Y = 0 to 1.35m at R = 8.62m) on Stage Left */}
      <mesh position={[FORMULA_WALL_OFFSET_X, 0.675, -0.5]}>
        <cylinderGeometry
          args={[8.62, 8.62, 1.35, quality === "LIGHT" ? 32 : 64, 1, true, lowerWallStartAng, lowerWallSweepAng]}
        />
        <meshStandardMaterial color="#040d22" side={THREE.BackSide} roughness={0.35} metalness={0.7} />
      </mesh>

      {/* 3 Horizontal Glowing Neon Tubes Underneath Elevated Screen (Y = 0.35m, 0.70m, 1.05m) */}
      {[0.35, 0.70, 1.05].map((h, idx) => (
        <mesh key={`neon-wire-${idx}`} position={[FORMULA_WALL_OFFSET_X, h, -0.5]}>
          <cylinderGeometry
            args={[8.58, 8.58, 0.035, 64, 1, true, lowerWallStartAng, lowerWallSweepAng]}
          />
          <meshBasicMaterial color={neonColor} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* ── 4B. ARCHITECTURAL VERTICAL UPWARD LED ARCH (⌒) & SPONSOR MATRIX BACKING (VTV3 REFERENCE IMAGE 2) ── */}
      {/* Curved vertical upward arc ribbon (⌒) at R = 8.64m, H = 0.22m, apex Y ~ 4.95m embracing sponsor lightbox */}
      <group position={[FORMULA_WALL_OFFSET_X, 0, -0.5]}>
        {/* Fan/triangular matrix backing behind sponsor lightbox under arch apex */}
        <mesh geometry={sponsorMatrixBackingGeometry}>
          {sponsorMatrixBackingTexture ? (
            <meshBasicMaterial
              map={sponsorMatrixBackingTexture}
              side={THREE.DoubleSide}
              toneMapped={false}
              transparent
            />
          ) : (
            <meshStandardMaterial color="#020817" side={THREE.DoubleSide} roughness={0.3} metalness={0.8} />
          )}
        </mesh>

        {/* Upward curved LED arch ribbon (⌒) with 2 rows of warm white LED matrix bulbs */}
        <mesh geometry={upwardArchRibbonGeometry}>
          {whiteDotsArchTexture ? (
            <meshBasicMaterial
              map={whiteDotsArchTexture}
              side={THREE.DoubleSide}
              toneMapped={false}
              transparent
              alphaTest={0.05}
            />
          ) : (
            <meshStandardMaterial color="#020817" side={THREE.DoubleSide} roughness={0.3} metalness={0.8} />
          )}
        </mesh>

        {/* 3D Glowing Neon Spline along Arch Top Edge (Single Top Rim, 0.025m thickness, zero bottom rim) */}
        <mesh geometry={archTopRimGeometry}>
          <meshBasicMaterial color={archRimColor} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* 3D Quizorra Sponsor Illuminated Lightbox centered above Stage Left Dais & Science Wall arc (R = 8.60m, theta = 1.375*PI) */}
      <group position={[-8.095, 4.05, -3.791]} rotation={[0, 1.178, 0]}>
        {/* Solid Metallic Riser Mounting Pad resting directly on formula wall top rim (Y = 3.75m) */}
        <mesh position={[0, -0.28, 0]}>
          <boxGeometry args={[1.58, 0.08, 0.16]} />
          <meshStandardMaterial
            color="#334155"
            metalness={0.88}
            roughness={0.22}
            envMapIntensity={2.0}
          />
        </mesh>
        {/* Dual Heavy-Duty Steel Stanchions clamping into formula wall frame */}
        <mesh position={[-0.55, -0.33, 0]}>
          <boxGeometry args={[0.10, 0.14, 0.12]} />
          <meshStandardMaterial color="#1e293b" metalness={0.92} roughness={0.15} />
        </mesh>
        <mesh position={[0.55, -0.33, 0]}>
          <boxGeometry args={[0.10, 0.14, 0.12]} />
          <meshStandardMaterial color="#1e293b" metalness={0.92} roughness={0.15} />
        </mesh>

        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.56, 0.52, 0.12]} />
          <meshStandardMaterial color="#02153b" metalness={0.7} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0, 0.065]}>
          <planeGeometry args={[1.50, 0.46]} />
          {quizorraBadgeTexture ? (
            <meshBasicMaterial map={quizorraBadgeTexture} toneMapped={false} />
          ) : (
            <meshBasicMaterial color="#003b87" />
          )}
        </mesh>
        {/* Sleek Rectangular Cyan Neon Border around Quizorra Lightbox (Clean Broadcast Trim) */}
        <mesh position={[0, 0.25, 0.066]}>
          <boxGeometry args={[1.56, 0.02, 0.02]} />
          <meshBasicMaterial color={neonColor} toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.25, 0.066]}>
          <boxGeometry args={[1.56, 0.02, 0.02]} />
          <meshBasicMaterial color={neonColor} toneMapped={false} />
        </mesh>
        <mesh position={[-0.77, 0, 0.066]}>
          <boxGeometry args={[0.02, 0.50, 0.02]} />
          <meshBasicMaterial color={neonColor} toneMapped={false} />
        </mesh>
        <mesh position={[0.77, 0, 0.066]}>
          <boxGeometry args={[0.02, 0.50, 0.02]} />
          <meshBasicMaterial color={neonColor} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}
