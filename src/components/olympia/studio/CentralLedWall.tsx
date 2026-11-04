"use client";

import React, { useRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import type { OlympiaState } from "@/lib/olympia/types";
import { parseVcnvAnswer } from "@/lib/olympia/engine";

interface CentralLedWallProps {
  state?: OlympiaState | null;
  screenFadeProgress?: number; // 0.0 (Sapphire Blue) -> 1.0 (Fiery Red)
  quality?: "HIGH" | "MEDIUM" | "LIGHT";
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
  const yMid = h * 0.46; // Knuckles at 46% height
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
  seedOffset: number = 0
): void {
  const cellSize = 22;
  const cols = Math.floor(w / cellSize);
  const rows = Math.floor(h / cellSize);

  ctx.save();
  ctx.font = '700 12px "Courier New", monospace';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  let seed = 42893 + seedOffset;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const val = rnd() > 0.5 ? "1" : "0";
      const roll = rnd();
      const x = c * cellSize + cellSize / 2;
      const y = r * cellSize + cellSize / 2;

      // ~32% of cells are brightly lit with glow
      if (roll < 0.32) {
        ctx.save();
        const isRed = roll < 0.10 || fadeProgress > 0.5;
        const color = isRed ? "#ff2a55" : roll < 0.22 ? "#00f0ff" : "#10b981";
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.fillText(val, x, y);
        ctx.restore();
      } else if (roll < 0.70) {
        // Faint ambient background numbers
        ctx.fillStyle = fadeProgress > 0.5 ? "rgba(255, 60, 90, 0.18)" : "rgba(0, 210, 255, 0.18)";
        ctx.fillText(val, x, y);
      }
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
 * Perforated White LED Matrix Dots Arch Canvas (Image 3 & 4)
 * Semi-circular architectural arch backdrop behind the Science Wall.
 */
function createWhiteDotsArchCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const w = 1024;
  const h = 512;

  // Deep dark sapphire backing
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#020716");
  grad.addColorStop(0.5, "#041433");
  grad.addColorStop(1, "#020818");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Perforated Matrix Array of Bright White LED Dots
  const dotSpacingX = 26;
  const dotSpacingY = 22;
  const cols = Math.floor(w / dotSpacingX);
  const rows = Math.floor(h / dotSpacingY);

  for (let r = 0; r < rows; r++) {
    const isOdd = r % 2 === 1;
    const offsetX = isOdd ? dotSpacingX / 2 : 0;
    for (let c = 0; c < cols; c++) {
      const x = c * dotSpacingX + offsetX;
      const y = r * dotSpacingY + 16;
      const distFromTop = y / h;
      const alpha = 0.50 + 0.50 * Math.sin(distFromTop * Math.PI);

      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(x, y, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Cyan Neon Perimeter Frame along the top curve
  ctx.save();
  ctx.strokeStyle = "#00f0ff";
  ctx.lineWidth = 8;
  ctx.shadowColor = "#00f0ff";
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.lineTo(w, 8);
  ctx.stroke();
  ctx.restore();

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
  if (state.currentRound === "khoiDong") return Boolean(state.khoiDong?.current?.q);
  if (state.currentRound === "vcnv") return Boolean(state.vcnv?.currentRow != null && state.vcnv.currentRow >= 0);
  if (state.currentRound === "tangToc") return Boolean(state.tangToc?.qIdx != null && state.tangToc.qIdx >= 0);
  if (state.currentRound === "veDich") return Boolean(state.veDich?.current?.q?.q);
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

  const fontSize = Math.round(width * 0.046);
  ctx.font = `900 ${fontSize}px "Plus Jakarta Sans", "Montserrat", "Arial Black", sans-serif`;
  ctx.letterSpacing = "0.08em";

  const textGrad = ctx.createLinearGradient(0, textY - fontSize * 0.6, 0, textY + fontSize * 0.6);
  textGrad.addColorStop(0.0, "#ffffff");
  textGrad.addColorStop(0.2, "#fffbd0");
  textGrad.addColorStop(0.5, "#ffd700");
  textGrad.addColorStop(0.85, "#b45309");
  textGrad.addColorStop(1.0, "#78350f");

  ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 4;
  ctx.lineWidth = 10;
  ctx.strokeStyle = "#1e1302";
  ctx.strokeText(textStr, cx, textY);

  ctx.shadowColor = "rgba(255, 215, 0, 0.7)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 2;

  ctx.lineWidth = 3.5;
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
      const ans = state.vcnv?.answers?.[s.id]?.text || "—";

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
      const ans = r.noAnswer ? "—" : r.answer;
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
 * Pre-rendered Rectangular Secondary LED Display (Stage Right, facing Contestants)
 * Shows either the official Olympia 2016 logo, round title card, or active round question.
 */
function renderLedScreenToCanvas(
  targetCanvas: HTMLCanvasElement,
  logoImg: HTMLImageElement | null,
  fadeProgress: number = 0,
  state?: OlympiaState | null
): void {
  const width = targetCanvas.width;
  const height = targetCanvas.height;
  const ctx = targetCanvas.getContext("2d");
  if (!ctx) return;

  const cx = width / 2;
  const cy = height / 2;

  // 1. Deep Broadcast Cosmic Gradient
  const bgGrad = ctx.createRadialGradient(cx, cy * 0.85, 80, cx, cy, width * 0.72);
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
  const numStars = 100;
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

  // 3. Right Screen Projection Mode
  const screenMode = (state as any)?.rightScreenMode || "auto";

  if (
    screenMode === "roundGraphics" ||
    (screenMode === "auto" &&
      (state?.currentRound === "vcnv" || state?.currentRound === "tangToc"))
  ) {
    renderRoundGraphicsToCanvas(ctx, width, height, state, fadeProgress);
    return;
  }

  if (
    screenMode === "roundTitle" ||
    (screenMode === "auto" &&
      !state?.introTimer &&
      !state?.entranceState?.active &&
      state?.currentRound &&
      !questionPromptAvailable(state))
  ) {
    renderRoundTitleToCanvas(ctx, width, height, state?.currentRound, fadeProgress);
    return;
  }

  if (screenMode === "logo" || state?.introTimer || state?.entranceState?.active) {
    renderOlympiaLogoToCanvas(ctx, width, height, cx, cy, logoImg, fadeProgress);
    return;
  }

  if (screenMode === "scoreboard") {
    renderScoreboardToCanvas(ctx, width, height, state?.seats, fadeProgress);
    return;
  }

  // 3. Check for Active Round Question Content
  let roundTitle: string | null = null;
  let questionPrompt: string | null = null;

  if (state?.currentRound === "khoiDong" && state.khoiDong?.current?.q) {
    roundTitle = "KHỞI ĐỘNG";
    questionPrompt = state.khoiDong.current.q;
  } else if (state?.currentRound === "vcnv") {
    roundTitle = "VƯỢT CHƯỚNG NGẠI VẬT";
    const cur = state.vcnv?.currentRow ?? -1;
    if (cur >= 0 && cur < 4 && state.vcnv?.rows?.[cur]?.hint) {
      questionPrompt = state.vcnv.rows[cur].hint;
    } else if (cur === 4 && state.vcnv?.centerQuestion?.q) {
      questionPrompt = state.vcnv.centerQuestion.q;
    }
  } else if (state?.currentRound === "tangToc" && state.tangToc?.qIdx != null && state.tangToc.qIdx >= 0) {
    roundTitle = `TĂNG TỐC — CÂU ${state.tangToc.qIdx + 1}`;
    questionPrompt = state.tangToc.questions?.[state.tangToc.qIdx]?.q || null;
  } else if (state?.currentRound === "veDich" && state.veDich?.current) {
    roundTitle = `VỀ ĐÍCH — ${state.veDich.current.points ?? 20} ĐIỂM`;
    questionPrompt = state.veDich.current.q?.q || null;
  }

  if (roundTitle) {
    // ── DYNAMIC ROUND BROADCAST GRAPHIC ON 3D SCREEN ──
    ctx.save();
    // Top Banner
    const bannerH = height * 0.18;
    const bannerGrad = ctx.createLinearGradient(0, 0, width, 0);
    bannerGrad.addColorStop(0, "rgba(0, 180, 255, 0.15)");
    bannerGrad.addColorStop(0.5, "rgba(0, 220, 255, 0.45)");
    bannerGrad.addColorStop(1, "rgba(0, 180, 255, 0.15)");
    ctx.fillStyle = bannerGrad;
    ctx.fillRect(0, 20, width, bannerH);

    ctx.strokeStyle = "#00e5ff";
    ctx.lineWidth = 3;
    ctx.strokeRect(40, 20, width - 80, bannerH);

    ctx.font = '900 52px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 20;
    ctx.fillText(roundTitle, cx, 20 + bannerH / 2);

    // Question Box in Center
    if (questionPrompt) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(10, 22, 48, 0.85)";
      ctx.strokeStyle = "rgba(0, 229, 255, 0.55)";
      ctx.lineWidth = 2;
      const qx = width * 0.08;
      const qy = height * 0.28;
      const qw = width * 0.84;
      const qh = height * 0.62;
      ctx.fillRect(qx, qy, qw, qh);
      ctx.strokeRect(qx, qy, qw, qh);

      // Question Text with Wrapping
      ctx.font = '700 42px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = "#f8fafc";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      const words = questionPrompt.split(" ");
      let line = "";
      let y = qy + 60;
      const maxW = qw - 100;
      const lineH = 58;

      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + " ";
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxW && i > 0) {
          ctx.fillText(line, cx, y);
          line = words[i] + " ";
          y += lineH;
          if (y > qy + qh - 70) break;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, cx, y);
    }
    ctx.restore();
    return;
  }

  // 4. Default Idle / Opening: Official Olympia 2016 Logo & Golden Title
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

  // 5. Yellow Light-To-Dark Metallic Gradient Typography: "ĐƯỜNG LÊN ĐỈNH OLYMPIA"
  const textY = logoTargetY + logoTargetH + height * 0.16;
  const textStr = "ĐƯỜNG LÊN ĐỈNH OLYMPIA";

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const fontSize = Math.round(width * 0.046);
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

  ctx.restore();
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
  fadeProgress: number = 0
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

  topSymbols.forEach((s) => {
    ctx.save();
    ctx.translate(s.x, s.y);
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
  ctx.lineWidth = 6;
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

  bottomSymbols.forEach((s) => {
    ctx.save();
    ctx.translate(s.x, s.y);
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
    const bh = 12 + Math.sin(b * 0.65) * 20 + Math.cos(b * 1.4) * 14;
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
 * Pre-rendered Curved Math & Science Symbols Wall Texture (Stage Left).
 * Features:
 * - Stepped-up top profile with Quizorra sponsor badge on the top-left.
 * - Inward chevron / arrow notch on the right edge ("mũi tên lọt thỏm vô trong").
 * - Multi-layer concentric neon borders ("background kết hợp nhiều viền").
 * - All symbols rendered in 100% luminous electric cyan ("chữ xanh toàn tập").
 */
function createCurvedFormulaCanvas(fadeProgress: number = 0): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 768;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const w = 2048;
  const h = 768;

  // 1. Transparent Clear (to allow exact silhouette outline in Three.js)
  ctx.clearRect(0, 0, w, h);

  // 2. Define Polygon Contour Path with Stepped Top & Inward Chevron Notch (<)
  // Polygon points:
  // p0: Bottom-left (50, 740)
  // p1: Left top lower tier (50, 140)
  // p2: Step-up start (640, 140)
  // p3: Step-up top (740, 40)
  // p4: Upper top tier (1980, 40)
  // p5: Inward chevron notch apex (1860, 390) -> Gentle 45° notch matching real studio
  // p6: Bottom-right corner (1980, 740)
  // Close to p0
  function traceContour(offset: number = 0) {
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(40 + offset, 740 - offset);
    ctx.lineTo(40 + offset, 140 + offset);
    ctx.lineTo(600, 140 + offset);
    ctx.lineTo(720, 35 + offset);
    ctx.lineTo(1940 - offset, 35 + offset);
    ctx.lineTo(1860 + offset * 0.8, 390); // Gentle 45° inward notch (<) matching real studio set
    ctx.lineTo(1940 - offset, 740 - offset);
    ctx.closePath();
  }

  // 3. Fill Wall Body with Deep Cyber-Blue Gradient
  ctx.save();
  traceContour(0);
  ctx.clip();

  const r = Math.round(THREE.MathUtils.lerp(6, 45, fadeProgress));
  const g = Math.round(THREE.MathUtils.lerp(22, 6, fadeProgress));
  const b = Math.round(THREE.MathUtils.lerp(56, 14, fadeProgress));
  const bodyGrad = ctx.createLinearGradient(0, 40, w, 740);
  bodyGrad.addColorStop(0, `rgb(${r + 6}, ${g + 18}, ${b + 28})`);
  bodyGrad.addColorStop(0.5, `rgb(${r}, ${g}, ${b})`);
  bodyGrad.addColorStop(1, "#020712");
  ctx.fillStyle = bodyGrad;
  ctx.fillRect(0, 0, w, h);

  // 4 Glowing Neon Rails (Sloping upward gently from left to right across full screen)
  // Always pure cyber cyan (#00f0ff) matching user requirement
  ctx.save();
  ctx.strokeStyle = "rgba(0, 240, 255, 0.85)";
  ctx.lineWidth = 4;
  ctx.shadowColor = "#00f0ff";
  ctx.shadowBlur = 18;
  const slope = 0.09; // Rising slope: as X goes 0 -> 2048, Y rises upward in 3D (canvas Y decreases)
  for (const yRail of [95, 140, 185, 230]) {
    ctx.beginPath();
    ctx.moveTo(80, yRail - (80 - 1000) * slope);
    ctx.lineTo(1940, yRail - (1940 - 1000) * slope);
    ctx.stroke();
  }
  ctx.restore();

  // Digital stream lines sloping upward from left to right
  ctx.strokeStyle = "rgba(0, 210, 255, 0.18)";
  ctx.lineWidth = 2;
  for (let y = 50; y < 740; y += 42) {
    ctx.beginPath();
    ctx.moveTo(0, y - (0 - 1000) * slope);
    ctx.lineTo(w, y - (w - 1000) * slope);
    ctx.stroke();
  }

  // Streaming high-tech binary matrix 0/1 grid with glowing cyan and red digits
  renderBinaryMatrixGrid(ctx, w, h, fadeProgress, 0);

  // 4. "CHỮ XANH TOÀN TẬP" — ALL SCIENTIFIC SYMBOLS & UNITS IN PURE GLOSSY LUMINOUS CYAN (#00f0ff)
  // High-density distribution (75+ symbols) across 5 balanced tiers with zero stretched UV gaps
  // Leaning gently to the left (shear +0.18) and sloping upward from left to right (angle -0.055 rad)
  const symbols = [
    // Tier 1 (Upper zone, Y: 80 - 130)
    { text: "∑", x: 100, y: 110, size: 68, rot: -0.02 },
    { text: "ml", x: 210, y: 115, size: 44, rot: 0.02 },
    { text: "kg", x: 320, y: 105, size: 48, rot: -0.01 },
    { text: "µ", x: 430, y: 115, size: 52, rot: 0.02 },
    { text: "Ψ", x: 550, y: 100, size: 58, rot: -0.02 },
    { text: "m²", x: 670, y: 95, size: 46, rot: 0.01 },
    { text: "sin", x: 790, y: 90, size: 46, rot: -0.01 },
    { text: "Δ", x: 910, y: 85, size: 60, rot: 0.02 },
    { text: "cos", x: 1030, y: 90, size: 46, rot: -0.01 },
    { text: "Ω", x: 1150, y: 85, size: 56, rot: 0.02 },
    { text: "π", x: 1270, y: 90, size: 54, rot: -0.02 },
    { text: "∫", x: 1390, y: 80, size: 68, rot: 0.02 },
    { text: "tan", x: 1510, y: 95, size: 46, rot: -0.01 },
    { text: "E=mc²", x: 1650, y: 85, size: 44, rot: 0.02 },
    { text: "∇", x: 1790, y: 85, size: 54, rot: -0.02 },
    { text: "∮", x: 1900, y: 80, size: 64, rot: 0.01 },

    // Tier 2 (Upper-mid zone, Y: 180 - 240)
    { text: "λ", x: 120, y: 220, size: 54, rot: 0.02 },
    { text: "lim", x: 240, y: 235, size: 46, rot: -0.02 },
    { text: "θ", x: 360, y: 215, size: 52, rot: 0.02 },
    { text: "f(x)", x: 480, y: 230, size: 48, rot: -0.02 },
    { text: "∞", x: 610, y: 195, size: 62, rot: 0.03 },
    { text: "√2", x: 730, y: 215, size: 50, rot: -0.01 },
    { text: "hν", x: 850, y: 195, size: 48, rot: 0.02 },
    { text: "log", x: 970, y: 220, size: 46, rot: -0.01 },
    { text: "NaCl", x: 1090, y: 200, size: 48, rot: 0.01 },
    { text: "α", x: 1210, y: 220, size: 52, rot: -0.02 },
    { text: "β", x: 1330, y: 195, size: 52, rot: 0.02 },
    { text: "γ", x: 1450, y: 220, size: 50, rot: -0.02 },
    { text: "F=ma", x: 1580, y: 200, size: 46, rot: 0.02 },
    { text: "∂x", x: 1710, y: 215, size: 48, rot: -0.01 },
    { text: "ħ", x: 1830, y: 200, size: 54, rot: 0.02 },
    { text: "ATP", x: 1930, y: 215, size: 42, rot: -0.01 },

    // Tier 3 (Mid zone, Y: 310 - 370)
    { text: "H₂O", x: 110, y: 340, size: 50, rot: -0.01 },
    { text: "CO₂", x: 230, y: 355, size: 48, rot: 0.02 },
    { text: "pH", x: 350, y: 330, size: 48, rot: -0.01 },
    { text: "mol", x: 470, y: 350, size: 46, rot: 0.02 },
    { text: "Hz", x: 590, y: 320, size: 50, rot: -0.02 },
    { text: "Pa", x: 710, y: 345, size: 48, rot: 0.01 },
    { text: "rad", x: 830, y: 320, size: 46, rot: -0.01 },
    { text: "dx", x: 950, y: 350, size: 48, rot: 0.02 },
    { text: "Δt", x: 1070, y: 325, size: 50, rot: -0.01 },
    { text: "e", x: 1190, y: 345, size: 52, rot: 0.02 },
    { text: "c", x: 1310, y: 320, size: 52, rot: -0.02 },
    { text: "ρ", x: 1430, y: 345, size: 50, rot: 0.01 },
    { text: "σ", x: 1550, y: 325, size: 50, rot: -0.01 },
    { text: "O₂", x: 1670, y: 345, size: 48, rot: 0.02 },
    { text: "CH₄", x: 1790, y: 325, size: 46, rot: -0.01 },
    { text: "DNA", x: 1910, y: 345, size: 44, rot: 0.02 },

    // Tier 4 (Lower-mid zone, Y: 450 - 510)
    { text: "W", x: 130, y: 470, size: 52, rot: 0.02 },
    { text: "V", x: 260, y: 490, size: 52, rot: -0.01 },
    { text: "A", x: 390, y: 465, size: 52, rot: 0.02 },
    { text: "T", x: 520, y: 490, size: 50, rot: -0.01 },
    { text: "B", x: 650, y: 465, size: 52, rot: 0.02 },
    { text: "K", x: 780, y: 485, size: 50, rot: -0.01 },
    { text: "g", x: 910, y: 460, size: 50, rot: 0.01 },
    { text: "F", x: 1040, y: 490, size: 52, rot: -0.02 },
    { text: "m", x: 1170, y: 465, size: 50, rot: 0.02 },
    { text: "s", x: 1300, y: 490, size: 50, rot: -0.01 },
    { text: "C", x: 1420, y: 470, size: 52, rot: 0.02 },
    { text: "Fe", x: 1540, y: 490, size: 48, rot: -0.01 },
    { text: "Cu", x: 1660, y: 465, size: 48, rot: 0.02 },
    { text: "Au", x: 1780, y: 490, size: 48, rot: -0.01 },
    { text: "Ag", x: 1900, y: 470, size: 48, rot: 0.01 },

    // Tier 5 (Lower zone, Y: 580 - 640)
    { text: "eⁱᵖ+1=0", x: 180, y: 610, size: 40, rot: 0.01 },
    { text: "H₂SO₄", x: 370, y: 625, size: 44, rot: -0.01 },
    { text: "m/s²", x: 530, y: 605, size: 44, rot: 0.02 },
    { text: "ω", x: 680, y: 625, size: 50, rot: -0.01 },
    { text: "φ", x: 820, y: 605, size: 50, rot: 0.02 },
    { text: "∏", x: 960, y: 625, size: 54, rot: -0.01 },
    { text: "ln", x: 1100, y: 605, size: 46, rot: 0.01 },
    { text: "cot", x: 1240, y: 625, size: 46, rot: -0.01 },
    { text: "τ", x: 1380, y: 605, size: 50, rot: 0.01 },
    { text: "mg", x: 1510, y: 625, size: 44, rot: -0.01 },
    { text: "L", x: 1640, y: 605, size: 48, rot: 0.02 },
    { text: "arcsin", x: 1790, y: 625, size: 42, rot: -0.01 },
    { text: "N", x: 1920, y: 605, size: 50, rot: 0.02 },
  ];

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  symbols.forEach((s) => {
    ctx.save();
    // Upward slope from left to right: as x increases (left -> right), y in canvas decreases (rises in 3D)
    const slopeY = -(s.x - 1000) * slope;
    ctx.translate(s.x, s.y + slopeY);
    // Counter-clockwise rotation matches rising slope angle from left to right
    ctx.rotate(-Math.atan(slope) + (s.rot || 0) * 0.1);
    // Positive shear (+0.20) in down-Y canvas shifts top (y < 0) left, bottom (y > 0) right -> authentic gentle leftward lean (\)
    ctx.transform(1, 0, 0.20, 1, 0, 0);
    // Modern bold non-italic font (eliminating the heavy rightward lean)
    ctx.font = `900 ${s.size}px "Plus Jakarta Sans", "Montserrat", "Arial Black", sans-serif`;
    ctx.letterSpacing = "0.06em";
    ctx.letterSpacing = "0.06em";

    // 1. Deep Ambient Occlusion Drop Shadow (High Contrast Definition)
    ctx.save();
    ctx.shadowColor = "rgba(1, 10, 28, 0.95)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = "#010e28";
    ctx.fillText(s.text, 0, 0);
    ctx.restore();

    // 2. Volumetric Cyan Radiant Back-Glow
    ctx.save();
    ctx.shadowColor = fadeProgress > 0.5 ? "#ff1a40" : "#00f0ff";
    ctx.shadowBlur = 24;
    ctx.strokeStyle = fadeProgress > 0.5 ? "rgba(255, 30, 70, 0.9)" : "rgba(0, 240, 255, 0.9)";
    ctx.lineWidth = 6;
    ctx.strokeText(s.text, 0, 0);
    ctx.restore();

    // 3. Multi-Stop Mirror Metallic / Glossy Acrylic Gradient Fill
    const symGrad = ctx.createLinearGradient(0, -s.size * 0.55, 0, s.size * 0.55);
    if (fadeProgress > 0.5) {
      symGrad.addColorStop(0.0, "#ffffff"); // Pure white specular hot spot
      symGrad.addColorStop(0.18, "#ffe4e6");
      symGrad.addColorStop(0.48, "#ff2a55");
      symGrad.addColorStop(0.50, "#fb7185"); // Crisp horizon glint line
      symGrad.addColorStop(0.52, "#e11d48");
      symGrad.addColorStop(1.0, "#4c0519");
    } else {
      symGrad.addColorStop(0.0, "#ffffff"); // Pure white specular hot spot
      symGrad.addColorStop(0.18, "#cffafe"); // Upper specular rim
      symGrad.addColorStop(0.48, "#00f0ff"); // Luminous electric cyan
      symGrad.addColorStop(0.50, "#7dd3fc"); // Crisp horizon glint line
      symGrad.addColorStop(0.52, "#0284c7"); // Deep royal blue body
      symGrad.addColorStop(1.0, "#082f49"); // Dark base
    }
    ctx.fillStyle = symGrad;
    ctx.fillText(s.text, 0, 0);

    // 4. Beveled Acrylic Top-Edge Gloss Glint (Crisp Specular Edge)
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
    ctx.lineWidth = 2.2;
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 6;
    ctx.strokeText(s.text, -0.6, -1.2);
    ctx.restore();

    ctx.restore();
  });

  // Vector Icon 1: Chemical Erlenmeyer Flask with Volumetric Glossy Liquid, Markings & Bubbles
  ctx.save();
  ctx.strokeStyle = "#00f0ff";
  ctx.lineWidth = 4.5;
  ctx.shadowColor = "#00f0ff";
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(330, 205);
  ctx.lineTo(330, 222);
  ctx.lineTo(312, 258);
  ctx.lineTo(358, 258);
  ctx.lineTo(340, 222);
  ctx.lineTo(340, 205);
  ctx.closePath();
  ctx.stroke();

  // Flask Liquid with Volumetric Cyan Glow
  const flaskGrad = ctx.createLinearGradient(0, 232, 0, 258);
  flaskGrad.addColorStop(0, "rgba(56, 189, 248, 0.40)");
  flaskGrad.addColorStop(0.5, "rgba(0, 240, 255, 0.75)");
  flaskGrad.addColorStop(1, "rgba(2, 132, 199, 0.90)");
  ctx.fillStyle = flaskGrad;
  ctx.beginPath();
  ctx.moveTo(320, 235);
  ctx.bezierCurveTo(326, 237, 344, 237, 350, 235);
  ctx.lineTo(356, 256);
  ctx.lineTo(314, 256);
  ctx.closePath();
  ctx.fill();

  // Flask Measurement Markings
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = 1.8;
  ctx.shadowBlur = 0;
  for (const markY of [240, 246, 252]) {
    ctx.beginPath();
    ctx.moveTo(328, markY);
    ctx.lineTo(334, markY);
    ctx.stroke();
  }

  // Rising bubbles in flask
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(336, 245, 1.8, 0, Math.PI * 2);
  ctx.arc(342, 251, 1.4, 0, Math.PI * 2);
  ctx.fill();

  // Flask Specular Highlight Reflection
  ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
  ctx.lineWidth = 2.2;
  ctx.shadowColor = "#ffffff";
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.moveTo(318, 240);
  ctx.lineTo(315, 254);
  ctx.stroke();
  ctx.restore();

  // Vector Icon 2: Science Atom with Nucleus and Orbiting Electron Tracks
  ctx.save();
  ctx.translate(880, 210);
  ctx.shadowColor = "#00f0ff";
  ctx.shadowBlur = 18;
  ctx.strokeStyle = "rgba(0, 240, 255, 0.85)";
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

  // Orbiting electron particles
  ctx.fillStyle = "#38bdf8";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(18, 12, 2.4, 0, Math.PI * 2);
  ctx.arc(-20, 8, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Vector Icon 3: Organic Chemistry Benzene Aromatic Ring
  ctx.save();
  ctx.translate(1420, 205);
  ctx.shadowColor = "#00f0ff";
  ctx.shadowBlur = 16;
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

  // Inner resonance aromatic ring
  ctx.strokeStyle = "rgba(56, 189, 248, 0.75)";
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Quizorra Sponsor Logo Badge on Top Left
  ctx.save();
  ctx.fillStyle = "#003b87";
  ctx.fillRect(80, 55, 200, 65);
  ctx.strokeStyle = "#00e5ff";
  ctx.lineWidth = 3;
  ctx.strokeRect(80, 55, 200, 65);

  ctx.fillStyle = "#ffffff";
  ctx.font = '900 32px "Plus Jakarta Sans", sans-serif';
  ctx.shadowColor = "#00e5ff";
  ctx.shadowBlur = 8;
  ctx.fillText("QUIZORRA", 180, 88);
  ctx.restore();

  ctx.restore(); // Restore clip

  // 5. MULTI-LAYER CONCENTRIC NEON BORDERS ("background kết hợp nhiều viền")
  // Border 1: Outer Neon Track (Width 8, #00f0ff)
  ctx.save();
  ctx.strokeStyle = fadeProgress > 0.5 ? "#ff2a4b" : "#00f0ff";
  ctx.lineWidth = 7;
  ctx.shadowColor = fadeProgress > 0.5 ? "#ff0033" : "#00d4ff";
  ctx.shadowBlur = 20;
  traceContour(0);
  ctx.stroke();

  // Border 2: Inner Neon Track (Width 3.5, Inset 12px)
  ctx.strokeStyle = fadeProgress > 0.5 ? "rgba(255, 120, 140, 0.85)" : "rgba(56, 189, 248, 0.85)";
  ctx.lineWidth = 3.5;
  ctx.shadowBlur = 10;
  traceContour(12);
  ctx.stroke();

  // Border 3: Innermost Subtle Track (Width 2.0, Inset 24px)
  ctx.strokeStyle = fadeProgress > 0.5 ? "rgba(255, 180, 200, 0.55)" : "rgba(165, 243, 252, 0.55)";
  ctx.lineWidth = 2.0;
  ctx.shadowBlur = 6;
  traceContour(24);
  ctx.stroke();
  ctx.restore();

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
}: CentralLedWallProps) {
  const logoImageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const totemCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const totemTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const starryCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const starryTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const lastFadeRef = useRef<number>(-1);

  // Preload Olympia 2016 logo
  useEffect(() => {
    if (typeof window === "undefined") return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = `${window.location.origin}/olympia/Olympia_logo_2016.webp`;
    img.onload = () => {
      logoImageRef.current = img;
      if (canvasRef.current && textureRef.current) {
        renderLedScreenToCanvas(canvasRef.current, img, screenFadeProgress, state);
        textureRef.current.needsUpdate = true;
      }
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
        if (canvasRef.current && textureRef.current) {
          renderLedScreenToCanvas(canvasRef.current, fallback, screenFadeProgress, state);
          textureRef.current.needsUpdate = true;
        }
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

  // Pre-allocated static canvas for Rectangular LED Display
  const canvas = useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = quality === "LIGHT" ? 1024 : 1920;
    c.height = quality === "LIGHT" ? 576 : 1080;
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

  // Perforated White LED Dots Arch Texture (Images 3 & 4)
  const whiteDotsArchCanvas = useMemo(() => {
    if (typeof document === "undefined") return null;
    return createWhiteDotsArchCanvas();
  }, []);

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

  // Quantized fade step to prevent 60-FPS canvas re-renders during fade animations
  const fadeStep = Math.round(screenFadeProgress * 4);

  // Update dynamic display canvases only when questions change or at key fade milestones
  useEffect(() => {
    if (canvasRef.current && textureRef.current) {
      renderLedScreenToCanvas(canvasRef.current, logoImageRef.current, screenFadeProgress, state);
      textureRef.current.needsUpdate = true;
    }
    if (totemCanvasRef.current && totemTextureRef.current) {
      renderVerticalTotemToCanvas(totemCanvasRef.current, state, screenFadeProgress);
      totemTextureRef.current.needsUpdate = true;
    }
  }, [
    fadeStep,
    state?.currentRound,
    state?.khoiDong?.current?.q,
    state?.vcnv?.phase,
    state?.vcnv?.currentRow,
    state?.tangToc?.qIdx,
    state?.veDich?.current?.q?.q,
  ]);

  const neonColor = useMemo(() => {
    const c = new THREE.Color("#00f0ff");
    c.lerp(new THREE.Color("#ff1a40"), screenFadeProgress);
    return c;
  }, [screenFadeProgress]);

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

  const activeCount = state?.seats?.length ? Math.min(8, Math.max(2, state.seats.length)) : 4;
  const wallSweepAng = activeCount > 4 ? 0.70 * Math.PI : 0.65 * Math.PI;
  const wallStartAng = 0.98 * Math.PI;

  return (
    <group>
      {/* ── 1. STAGE CENTER-RIGHT: GRAND GROUNDED CONCENTRIC HEXAGONAL PORTAL (3-TIER STEPPED S14 REDESIGN) ── */}
      {/* Đặt tại [3.48, 0, -8.59], rotation [0, -0.25, 0] đồng trục 100% với Bục MC và CAM 3 */}
      {/* 3 VIỀN (Tier 1, Tier 2, Tier 3) lồng giật cấp theo chiều sâu Z để tạo hiệu ứng đường hầm 3D portal chân thực */}
      <group position={[3.48, 0, -8.59]} rotation={[0, -0.25, 0]}>
        {/* Tier 1 (Viền ngoài cùng): 4.80m x 5.20m tại Z = 0 */}
        <CutBottomHexagonArch
          outerPts={HEX_TIER1_OUTER}
          innerPts={HEX_TIER1_INNER}
          outerW={4.80}
          outerH={5.20}
          innerW={4.16}
          innerH={4.58}
          neonColor={neonColor}
          depth={0.18}
          showOuterNeon={true}
          showInnerNeon={true}
        />

        {/* Tier 2 (Viền giữa - lùi Z = -0.25m): 4.16m x 4.58m */}
        <group position={[0, 0, -0.25]}>
          <CutBottomHexagonArch
            outerPts={HEX_TIER2_OUTER}
            innerPts={HEX_TIER2_INNER}
            outerW={4.16}
            outerH={4.58}
            innerW={3.56}
            innerH={3.98}
            neonColor={neonColor}
            depth={0.18}
            showOuterNeon={true}
            showInnerNeon={true}
          />
        </group>

        {/* Tier 3 (Viền trong cùng - lùi Z = -0.50m): 3.56m x 3.98m */}
        <group position={[0, 0, -0.50]}>
          <CutBottomHexagonArch
            outerPts={HEX_TIER3_OUTER}
            innerPts={HEX_TIER3_INNER}
            outerW={3.56}
            outerH={3.98}
            innerW={3.00}
            innerH={3.42}
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
      {/* Đặt tại [5.8, 3.2, -2.2], xoay -65° [-1.134 rad] hướng thẳng góc nhìn của các thí sinh */}
      <group position={[5.8, 3.2, -2.2]} rotation={[0, -1.134, 0]}>
        {/* Structural Truss Columns behind the Screen */}
        <mesh position={[-2.2, -1.2, -0.28]}>
          <boxGeometry args={[0.22, 4.2, 0.22]} />
          <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[2.2, -1.2, -0.28]}>
          <boxGeometry args={[0.22, 4.2, 0.22]} />
          <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Horizontal LED wall slats behind screen */}
        {[-0.9, -0.45, 0.0, 0.45, 0.9].map((slatY, sIdx) => (
          <mesh key={`slat-${sIdx}`} position={[0, slatY, -0.32]}>
            <boxGeometry args={[5.6, 0.05, 0.05]} />
            <meshBasicMaterial color={neonColor} />
          </mesh>
        ))}

        {/* ── 3 LỚP VIỀN GIẬT CẤP (3-TIER STEPPED CONCENTRIC BEZELS WITH NEON TUBING) ── */}
        {/* Lớp viền 1 (Outer Bezel Tier): 5.3m x 3.2m x 0.10m tại Z = -0.14 */}
        <mesh position={[0, 0, -0.14]}>
          <boxGeometry args={[5.3, 3.2, 0.10]} />
          <meshStandardMaterial color="#070d1e" metalness={0.92} roughness={0.18} />
        </mesh>
        {/* Viền Neon Lớp 1 */}
        <mesh position={[0, 1.6, -0.09]}>
          <boxGeometry args={[5.3, 0.035, 0.035]} />
          <meshBasicMaterial color={neonColor} />
        </mesh>
        <mesh position={[0, -1.6, -0.09]}>
          <boxGeometry args={[5.3, 0.035, 0.035]} />
          <meshBasicMaterial color={neonColor} />
        </mesh>
        <mesh position={[-2.65, 0, -0.09]}>
          <boxGeometry args={[0.035, 3.2, 0.035]} />
          <meshBasicMaterial color={neonColor} />
        </mesh>
        <mesh position={[2.65, 0, -0.09]}>
          <boxGeometry args={[0.035, 3.2, 0.035]} />
          <meshBasicMaterial color={neonColor} />
        </mesh>

        {/* Lớp viền 2 (Middle Bezel Tier): 5.0m x 2.9m x 0.12m tại Z = -0.06 */}
        <mesh position={[0, 0, -0.06]}>
          <boxGeometry args={[5.0, 2.9, 0.12]} />
          <meshStandardMaterial color="#0f172a" metalness={0.90} roughness={0.20} />
        </mesh>
        {/* Viền Neon Lớp 2 */}
        <mesh position={[0, 1.45, 0.00]}>
          <boxGeometry args={[5.0, 0.03, 0.03]} />
          <meshBasicMaterial color={neonColor} />
        </mesh>
        <mesh position={[0, -1.45, 0.00]}>
          <boxGeometry args={[5.0, 0.03, 0.03]} />
          <meshBasicMaterial color={neonColor} />
        </mesh>
        <mesh position={[-2.50, 0, 0.00]}>
          <boxGeometry args={[0.03, 2.9, 0.03]} />
          <meshBasicMaterial color={neonColor} />
        </mesh>
        <mesh position={[2.50, 0, 0.00]}>
          <boxGeometry args={[0.03, 2.9, 0.03]} />
          <meshBasicMaterial color={neonColor} />
        </mesh>

        {/* Lớp viền 3 (Inner Bezel Tier): 4.7m x 2.65m x 0.12m tại Z = 0.02 */}
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[4.7, 2.65, 0.12]} />
          <meshStandardMaterial color="#1e293b" metalness={0.88} roughness={0.22} />
        </mesh>
        {/* Viền Neon Lớp 3 */}
        <mesh position={[0, 1.325, 0.08]}>
          <boxGeometry args={[4.7, 0.025, 0.025]} />
          <meshBasicMaterial color={neonColor} />
        </mesh>
        <mesh position={[0, -1.325, 0.08]}>
          <boxGeometry args={[4.7, 0.025, 0.025]} />
          <meshBasicMaterial color={neonColor} />
        </mesh>
        <mesh position={[-2.35, 0, 0.08]}>
          <boxGeometry args={[0.025, 2.65, 0.025]} />
          <meshBasicMaterial color={neonColor} />
        </mesh>
        <mesh position={[2.35, 0, 0.08]}>
          <boxGeometry args={[0.025, 2.65, 0.025]} />
          <meshBasicMaterial color={neonColor} />
        </mesh>

        {/* LED Screen Display Plane (Aspect Ratio 16:9) */}
        <mesh position={[0, 0, 0.085]}>
          <planeGeometry args={[4.56, 2.52]} />
          {texture ? (
            <meshBasicMaterial map={texture} toneMapped={false} />
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
      {/* Concentric arc at R=8.6m from [0, 0, -0.5]. Sweeps smoothly to frame all 4 to 8 contestants */}
      <group position={[0, 2.55, -0.5]}>
        <mesh rotation={[0, 0, 0]}>
          <cylinderGeometry
            args={[8.6, 8.6, 2.4, quality === "LIGHT" ? 32 : 64, 1, true, wallStartAng, wallSweepAng]}
          />
          {formulaWallTexture ? (
            <meshBasicMaterial
              map={formulaWallTexture}
              side={THREE.BackSide}
              toneMapped={false}
              transparent
              alphaTest={0.05}
              color={screenFadeProgress > 0.5 ? "#ffa0b5" : "#ffffff"}
            />
          ) : (
            <meshStandardMaterial color="#040b1a" side={THREE.BackSide} roughness={0.3} metalness={0.8} />
          )}
        </mesh>
      </group>

      {/* Underneath Dark Base Wall (Y = 0 to 1.35m at R = 8.62m) on Stage Left */}
      <mesh position={[0, 0.675, -0.5]}>
        <cylinderGeometry
          args={[8.62, 8.62, 1.35, quality === "LIGHT" ? 32 : 64, 1, true, wallStartAng, wallSweepAng]}
        />
        <meshStandardMaterial color="#040d22" side={THREE.BackSide} roughness={0.35} metalness={0.7} />
      </mesh>

      {/* 3 Horizontal Glowing Neon Tubes Underneath Elevated Screen (Y = 0.35m, 0.70m, 1.05m) */}
      {[0.35, 0.70, 1.05].map((h, idx) => (
        <mesh key={`neon-wire-${idx}`} position={[0, h, -0.5]}>
          <cylinderGeometry
            args={[8.58, 8.58, 0.035, 64, 1, true, wallStartAng, wallSweepAng]}
          />
          <meshBasicMaterial color={neonColor} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* ── 4B. ARCHITECTURAL WHITE LED MATRIX DOTS ARCH & QUIZORRA LIGHTBOX (IMAGES 3 & 4) ── */}
      {/* Semi-circular concentric arch positioned behind the curved Science Wall at R = 8.85m */}
      <group position={[0, 2.85, -0.5]}>
        <mesh rotation={[0, 0, 0]}>
          <cylinderGeometry
            args={[8.85, 8.85, 3.8, quality === "LIGHT" ? 32 : 64, 1, true, wallStartAng - 0.05, wallSweepAng + 0.10]}
          />
          {whiteDotsArchTexture ? (
            <meshBasicMaterial
              map={whiteDotsArchTexture}
              side={THREE.BackSide}
              toneMapped={false}
              transparent
              alphaTest={0.05}
            />
          ) : (
            <meshStandardMaterial color="#020817" side={THREE.BackSide} roughness={0.3} metalness={0.8} />
          )}
        </mesh>
      </group>

      {/* 3D Quizorra Sponsor Illuminated Lightbox mounted on the arch above contestant dais (no 45-deg diamond) */}
      <group position={[-6.2, 4.15, -4.6]} rotation={[0, 0.95, 0]}>
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
          <meshBasicMaterial color="#00f0ff" toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.25, 0.066]}>
          <boxGeometry args={[1.56, 0.02, 0.02]} />
          <meshBasicMaterial color="#00f0ff" toneMapped={false} />
        </mesh>
        <mesh position={[-0.77, 0, 0.066]}>
          <boxGeometry args={[0.02, 0.50, 0.02]} />
          <meshBasicMaterial color="#00f0ff" toneMapped={false} />
        </mesh>
        <mesh position={[0.77, 0, 0.066]}>
          <boxGeometry args={[0.02, 0.50, 0.02]} />
          <meshBasicMaterial color="#00f0ff" toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}
