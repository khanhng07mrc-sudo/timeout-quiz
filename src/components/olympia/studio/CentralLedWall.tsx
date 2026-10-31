"use client";

import React, { useRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import type { OlympiaState } from "@/lib/olympia/types";

interface CentralLedWallProps {
  state?: OlympiaState | null;
  screenFadeProgress?: number; // 0.0 (Sapphire Blue) -> 1.0 (Fiery Red)
  quality?: "HIGH" | "MEDIUM" | "LIGHT";
}

/**
 * Creates a concentric cut-bottom hexagon arch shape (flat top, slanted sides,
 * open bottom with vertical legs touching the stage floor).
 */
function createCutBottomHexagonShape(
  outerW: number,
  outerH: number,
  innerW: number,
  innerH: number
): THREE.Shape {
  const shape = new THREE.Shape();
  const ox1 = -outerW / 2;
  const ox2 = -outerW / 4;
  const ox3 = outerW / 4;
  const ox4 = outerW / 2;
  const oyBottom = -outerH / 2;
  const oyMid = outerH / 6;
  const oyTop = outerH / 2;

  const ix1 = -innerW / 2;
  const ix2 = -innerW / 4;
  const ix3 = innerW / 4;
  const ix4 = innerW / 2;
  const iyMid = innerH / 6;
  const iyTop = innerH / 2;

  // Outer contour (from bottom-left leg up, across top, down to bottom-right leg)
  shape.moveTo(ox1, oyBottom);
  shape.lineTo(ox1, oyMid);
  shape.lineTo(ox2, oyTop);
  shape.lineTo(ox3, oyTop);
  shape.lineTo(ox4, oyMid);
  shape.lineTo(ox4, oyBottom);

  // Bottom right leg thickness
  shape.lineTo(ix4, oyBottom);

  // Inner contour (from bottom-right leg up, across inner top, down to bottom-left leg)
  shape.lineTo(ix4, iyMid);
  shape.lineTo(ix3, iyTop);
  shape.lineTo(ix2, iyTop);
  shape.lineTo(ix1, iyMid);
  shape.lineTo(ix1, oyBottom);

  // Close at bottom left leg
  shape.lineTo(ox1, oyBottom);
  shape.closePath();

  return shape;
}

/**
 * Creates outer border line vertices for neon tube edging on cut-bottom hexagon
 */
function createOuterArchBorderPoints(w: number, h: number): THREE.Vector3[] {
  return [
    new THREE.Vector3(-w / 2, -h / 2, 0),
    new THREE.Vector3(-w / 2, h / 6, 0),
    new THREE.Vector3(-w / 4, h / 2, 0),
    new THREE.Vector3(w / 4, h / 2, 0),
    new THREE.Vector3(w / 2, h / 6, 0),
    new THREE.Vector3(w / 2, -h / 2, 0),
  ];
}

/**
 * Creates inner border line vertices for neon tube edging on cut-bottom hexagon
 */
function createInnerArchBorderPoints(w: number, h: number): THREE.Vector3[] {
  return [
    new THREE.Vector3(w / 2, -h / 2, 0),
    new THREE.Vector3(w / 2, h / 6, 0),
    new THREE.Vector3(w / 4, h / 2, 0),
    new THREE.Vector3(-w / 4, h / 2, 0),
    new THREE.Vector3(-w / 2, h / 6, 0),
    new THREE.Vector3(-w / 2, -h / 2, 0),
  ];
}

/**
 * Pre-rendered Starry Night Backdrop for the Hexagon Portal.
 * Pure deep midnight cosmos with glowing LED matrix stardust (NO text, NO title).
 */
function createStarryNightCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 768;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;

  // Deep midnight cosmic radial gradient
  const bgGrad = ctx.createRadialGradient(cx, cy * 0.9, 60, cx, cy, w * 0.75);
  bgGrad.addColorStop(0, "#081b3d");
  bgGrad.addColorStop(0.5, "#040c1d");
  bgGrad.addColorStop(1, "#010308");

  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Soft cyan/violet nebula glow
  const nebGrad = ctx.createRadialGradient(cx, cy * 0.7, 20, cx, cy * 0.7, 280);
  nebGrad.addColorStop(0, "rgba(0, 212, 255, 0.22)");
  nebGrad.addColorStop(0.6, "rgba(124, 58, 237, 0.10)");
  nebGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = nebGrad;
  ctx.fillRect(0, 0, w, h);

  // 400+ Stardust particles with varying sizes and brightness
  for (let i = 0; i < 420; i++) {
    const sx = (Math.sin(i * 1234.56) * 0.5 + 0.5) * w;
    const sy = (Math.cos(i * 876.54) * 0.5 + 0.5) * h;
    const r = (i % 4 === 0) ? 2.2 : (i % 2 === 0) ? 1.4 : 0.8;
    const alpha = (Math.sin(i * 37.1) * 0.35 + 0.65);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = (i % 5 === 0) ? "#a5f3fc" : (i % 7 === 0) ? "#fef08a" : "#ffffff";
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = r > 1.5 ? 8 : 4;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  return canvas;
}

/**
 * Pre-rendered Rectangular Secondary LED Display (Stage Right, facing Contestants)
 * Shows either the official Olympia 2016 logo (idle/intro) or the active round / question.
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

  // Subtitle
  ctx.shadowBlur = 0;
  ctx.font = `800 ${Math.round(fontSize * 0.32)}px "Plus Jakarta Sans", sans-serif`;
  ctx.letterSpacing = "0.45em";
  ctx.fillStyle = fadeProgress > 0.5 ? "rgba(255, 190, 200, 0.85)" : "rgba(180, 235, 255, 0.85)";
  ctx.fillText("VTV3 BROADCAST STUDIO S14", cx, textY + fontSize * 0.75);

  ctx.restore();
}

/**
 * Pre-rendered Curved Math & Science Symbols Wall Texture (Stage Left).
 * Features:
 * - Stepped-up top profile with THACO sponsor badge on the top-left.
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
  // p5: Inward chevron notch apex (1740, 390) -> NOTCH LỌT THỎM VÀO TRONG
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
    ctx.lineTo(1680 + offset * 1.5, 390); // Inward notch (<)
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

  // Horizontal digital stream lines
  ctx.strokeStyle = fadeProgress > 0.5 ? "rgba(255, 60, 80, 0.18)" : "rgba(0, 210, 255, 0.18)";
  ctx.lineWidth = 2;
  for (let y = 50; y < 740; y += 42) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Streaming binary code strings (0100101...) in cyan
  ctx.fillStyle = fadeProgress > 0.5 ? "rgba(255, 100, 120, 0.22)" : "rgba(0, 229, 255, 0.22)";
  ctx.font = '600 13px "Courier New", monospace';
  const binStrings = [
    "01001111 01001100 01011001 01001101 01010000 01001001 01000001",
    "10110100 11001010 01001101 10101110 00110010 00110110 01101111",
    "11010010 01011101 11010010 00110110 11010001 10101110 01011001",
  ];
  for (let row = 0; row < 15; row++) {
    const text = binStrings[row % binStrings.length];
    for (let col = 0; col < 6; col++) {
      ctx.fillText(text, col * 360, 68 + row * 45);
    }
  }

  // 4. "CHỮ XANH TOÀN TẬP" — ALL SCIENTIFIC SYMBOLS & UNITS IN PURE LUMINOUS CYAN (#00f0ff)
  const symbols = [
    // Tier 1 (Upper zone)
    { text: "∑", x: 140, y: 220, size: 76, rot: -0.06 },
    { text: "ml", x: 270, y: 235, size: 48, rot: 0.04 },
    { text: "kg", x: 410, y: 215, size: 54, rot: -0.03 },
    { text: "µ", x: 540, y: 230, size: 58, rot: 0.05 },
    { text: "Ψ", x: 790, y: 130, size: 70, rot: -0.05 },
    { text: "m²", x: 930, y: 155, size: 50, rot: 0.02 },
    { text: "sin", x: 1080, y: 135, size: 50, rot: -0.04 },
    { text: "Δ", x: 1220, y: 125, size: 72, rot: 0.06 },
    { text: "cos", x: 1370, y: 150, size: 50, rot: -0.03 },
    { text: "Ω", x: 1520, y: 130, size: 68, rot: 0.04 },
    { text: "π", x: 1660, y: 140, size: 66, rot: -0.05 },
    { text: "∫", x: 1800, y: 125, size: 84, rot: 0.03 },

    // Tier 2 (Mid-upper zone)
    { text: "λ", x: 160, y: 340, size: 60, rot: 0.04 },
    { text: "lim", x: 310, y: 360, size: 50, rot: -0.05 },
    { text: "θ", x: 460, y: 335, size: 58, rot: 0.03 },
    { text: "f(x)", x: 610, y: 355, size: 52, rot: -0.04 },
    { text: "∞", x: 770, y: 270, size: 72, rot: 0.06 },
    { text: "√2", x: 920, y: 300, size: 54, rot: -0.02 },
    { text: "hν", x: 1070, y: 275, size: 52, rot: 0.05 },
    { text: "log", x: 1220, y: 310, size: 50, rot: -0.04 },
    { text: "NaCl", x: 1370, y: 280, size: 52, rot: 0.02 },
    { text: "α", x: 1520, y: 305, size: 58, rot: -0.05 },
    { text: "β", x: 1670, y: 275, size: 58, rot: 0.04 },

    // Tier 3 (Mid-lower zone)
    { text: "H₂O", x: 140, y: 470, size: 54, rot: -0.04 },
    { text: "CO₂", x: 290, y: 495, size: 52, rot: 0.05 },
    { text: "pH", x: 440, y: 460, size: 52, rot: -0.03 },
    { text: "mol", x: 590, y: 490, size: 50, rot: 0.04 },
    { text: "Hz", x: 740, y: 445, size: 54, rot: -0.05 },
    { text: "Pa", x: 890, y: 475, size: 52, rot: 0.03 },
    { text: "rad", x: 1040, y: 440, size: 50, rot: -0.04 },
    { text: "dx", x: 1190, y: 480, size: 52, rot: 0.05 },
    { text: "Δt", x: 1340, y: 445, size: 54, rot: -0.03 },
    { text: "e", x: 1490, y: 470, size: 58, rot: 0.04 },
    { text: "c", x: 1630, y: 440, size: 58, rot: -0.05 },

    // Tier 4 (Lower zone)
    { text: "W", x: 200, y: 620, size: 56, rot: 0.03 },
    { text: "V", x: 370, y: 645, size: 56, rot: -0.04 },
    { text: "A", x: 540, y: 615, size: 56, rot: 0.05 },
    { text: "T", x: 710, y: 645, size: 54, rot: -0.03 },
    { text: "B", x: 880, y: 615, size: 56, rot: 0.04 },
    { text: "K", x: 1050, y: 640, size: 54, rot: -0.04 },
    { text: "g", x: 1220, y: 610, size: 54, rot: 0.03 },
    { text: "F", x: 1390, y: 645, size: 56, rot: -0.05 },
    { text: "m", x: 1560, y: 615, size: 54, rot: 0.04 },
    { text: "s", x: 1720, y: 645, size: 54, rot: -0.03 },
    { text: "C", x: 1860, y: 620, size: 56, rot: 0.04 },
  ];

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  symbols.forEach((s) => {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rot || 0);
    ctx.font = `900 ${s.size}px "Plus Jakarta Sans", "Georgia", serif`;
    ctx.letterSpacing = "0.06em";

    // Radiant Cyan Glow
    ctx.shadowColor = fadeProgress > 0.5 ? "#ff2a4b" : "#00f0ff";
    ctx.shadowBlur = 24;
    ctx.fillStyle = fadeProgress > 0.5 ? "#ffffff" : "#a5f3fc";
    ctx.fillText(s.text, 0, 0);

    // Inner core
    ctx.shadowBlur = 8;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(s.text, 0, 0);
    ctx.restore();
  });

  // Chemical Flask Vector Glyph
  ctx.save();
  ctx.strokeStyle = fadeProgress > 0.5 ? "#ff2a4b" : "#00f0ff";
  ctx.lineWidth = 4;
  ctx.shadowColor = fadeProgress > 0.5 ? "#ff0033" : "#00d4ff";
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(330, 205);
  ctx.lineTo(330, 225);
  ctx.lineTo(315, 255);
  ctx.lineTo(355, 255);
  ctx.lineTo(340, 225);
  ctx.lineTo(340, 205);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // THACO Sponsor Logo Badge on Top Left
  ctx.save();
  ctx.fillStyle = "#005baa";
  ctx.fillRect(80, 55, 200, 65);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.strokeRect(80, 55, 200, 65);

  ctx.fillStyle = "#ffffff";
  ctx.font = '900 36px "Plus Jakarta Sans", sans-serif';
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 6;
  ctx.fillText("THACO", 180, 88);
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
 * Concentric Cut-Bottom Hexagon Arch (Stage Center-Right)
 * Real S14 metallic light gray arch with neon edging and open floor entrance for MCs.
 */
function CutBottomHexagonArch({
  outerW = 6.8,
  outerH = 5.2,
  innerW = 5.4,
  innerH = 4.0,
  neonColor,
  depth = 0.38,
}: {
  outerW?: number;
  outerH?: number;
  innerW?: number;
  innerH?: number;
  neonColor: THREE.Color;
  depth?: number;
}) {
  const shape = useMemo(
    () => createCutBottomHexagonShape(outerW, outerH, innerW, innerH),
    [outerW, outerH, innerW, innerH]
  );

  const geometry = useMemo(
    () =>
      new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.05,
        bevelThickness: 0.05,
      }),
    [shape, depth]
  );

  // Neon edging points
  const outerBorderPoints = useMemo(
    () => createOuterArchBorderPoints(outerW, outerH),
    [outerW, outerH]
  );

  const innerBorderPoints = useMemo(
    () => createInnerArchBorderPoints(innerW, innerH),
    [innerW, innerH]
  );

  const outerLineMesh = useMemo(() => {
    const geom = new THREE.BufferGeometry().setFromPoints(outerBorderPoints);
    const mat = new THREE.LineBasicMaterial({ color: neonColor, linewidth: 3 });
    const line = new THREE.Line(geom, mat);
    line.position.set(0, 0, depth + 0.06);
    return line;
  }, [outerBorderPoints, depth, neonColor]);

  const innerLineMesh = useMemo(() => {
    const geom = new THREE.BufferGeometry().setFromPoints(innerBorderPoints);
    const mat = new THREE.LineBasicMaterial({ color: neonColor, linewidth: 2.5 });
    const line = new THREE.Line(geom, mat);
    line.position.set(0, 0, depth + 0.06);
    return line;
  }, [innerBorderPoints, depth, neonColor]);

  return (
    <group position={[0, outerH / 2, 0]}>
      {/* Metallic Frame Body (Light Gray / Broadcast Aluminum #cbd5e1) */}
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color="#94a3b8"
          metalness={0.88}
          roughness={0.22}
          envMapIntensity={2.0}
        />
      </mesh>

      {/* Front Glowing Outer Neon Rim */}
      <primitive object={outerLineMesh} />

      {/* Front Glowing Inner Neon Rim */}
      <primitive object={innerLineMesh} />
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

  // Update canvas when state or screenFadeProgress changes
  useEffect(() => {
    if (!canvasRef.current || !textureRef.current) return;
    renderLedScreenToCanvas(canvasRef.current, logoImageRef.current, screenFadeProgress, state);
    textureRef.current.needsUpdate = true;
  }, [
    screenFadeProgress,
    state?.currentRound,
    state?.khoiDong?.current?.q,
    state?.vcnv?.phase,
    state?.vcnv?.currentRow,
    state?.tangToc?.qIdx,
    state?.veDich?.current?.q?.q,
  ]);

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

  // Curved Formula Wall Texture
  const formulaWallCanvas = useMemo(() => {
    if (typeof document === "undefined") return null;
    return createCurvedFormulaCanvas(screenFadeProgress);
  }, [screenFadeProgress]);

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

  const neonColor = useMemo(() => {
    const c = new THREE.Color("#00f0ff");
    c.lerp(new THREE.Color("#ff1a40"), screenFadeProgress);
    return c;
  }, [screenFadeProgress]);

  return (
    <group>
      {/* ── 1. STAGE CENTER-RIGHT: CONCENTRIC CUT-BOTTOM HEXAGON ARCH + STARRY NIGHT ── */}
      {/* Positioned at [2.4, 0, -4.5] rotated -30° (-0.52 rad) facing central stage & contestants */}
      <group position={[2.4, 0, -4.5]} rotation={[0, -0.52, 0]}>
        {/* Concentric Hexagon Arch Frame with Metallic Finish & Neon Rim */}
        <CutBottomHexagonArch
          outerW={5.8}
          outerH={4.6}
          innerW={4.6}
          innerH={3.6}
          neonColor={neonColor}
          depth={0.36}
        />

        {/* Interior Starry Night Sky Backdrop (NO Title Text, Pure Cosmos) */}
        <mesh position={[0, 2.3, -0.25]}>
          <planeGeometry args={[6.2, 4.4]} />
          {starryTexture ? (
            <meshBasicMaterial map={starryTexture} toneMapped={false} />
          ) : (
            <meshStandardMaterial color="#020617" roughness={0.3} metalness={0.8} />
          )}
        </mesh>
      </group>

      {/* ── 2. STAGE FAR-RIGHT: RECTANGULAR LED SCREEN FACING CONTESTANTS ── */}
      {/* Generous spacing (> 3.3m gap from Hexagon Arch), angled facing stage center */}
      <group position={[8.2, 4.0, -1.8]} rotation={[0.08, -0.95, 0]}>
        {/* LED Screen Plane with Dynamic Content / Olympia Title */}
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[5.6, 3.15]} />
          {texture ? (
            <meshBasicMaterial map={texture} toneMapped={false} />
          ) : (
            <meshStandardMaterial color="#020817" roughness={0.2} metalness={0.9} />
          )}
        </mesh>

        {/* LED Bezel Frame */}
        <mesh position={[0, 0, -0.07]}>
          <boxGeometry args={[5.8, 3.35, 0.14]} />
          <meshStandardMaterial color="#0f172a" metalness={0.92} roughness={0.2} />
        </mesh>

        {/* Glowing Neon Outline around Rectangular LED Frame */}
        <mesh position={[0, 1.68, 0.04]}>
          <boxGeometry args={[5.8, 0.04, 0.04]} />
          <meshBasicMaterial color={neonColor} />
        </mesh>
        <mesh position={[0, -1.68, 0.04]}>
          <boxGeometry args={[5.8, 0.04, 0.04]} />
          <meshBasicMaterial color={neonColor} />
        </mesh>
        <mesh position={[-2.9, 0, 0.04]}>
          <boxGeometry args={[0.04, 3.35, 0.04]} />
          <meshBasicMaterial color={neonColor} />
        </mesh>
        <mesh position={[2.9, 0, 0.04]}>
          <boxGeometry args={[0.04, 3.35, 0.04]} />
          <meshBasicMaterial color={neonColor} />
        </mesh>
      </group>

      {/* ── 3. STAGE LEFT: CURVED SCIENCE & MATH FORMULA WALL (ELEVATED) ── */}
      {/* Concentric arc at R=7.6m from [0, 0, -0.6]. Bottom at Y=1.35m, Top at Y=3.75m (height 2.4m) */}
      <group position={[0, 2.55, -0.6]}>
        <mesh rotation={[0, 0, 0]}>
          <cylinderGeometry
            args={[7.6, 7.6, 2.4, quality === "LIGHT" ? 32 : 64, 1, true, 0.60 * Math.PI, 0.44 * Math.PI]}
          />
          {formulaWallTexture ? (
            <meshBasicMaterial
              map={formulaWallTexture}
              side={THREE.BackSide}
              toneMapped={false}
              transparent
              alphaTest={0.05}
            />
          ) : (
            <meshStandardMaterial color="#040b1a" side={THREE.BackSide} roughness={0.3} metalness={0.8} />
          )}
        </mesh>
      </group>

      {/* Underneath Dark Base Wall (Y = 0 to 1.35m at R = 7.62m) */}
      <mesh position={[0, 0.675, -0.6]}>
        <cylinderGeometry
          args={[7.62, 7.62, 1.35, quality === "LIGHT" ? 32 : 64, 1, true, 0.58 * Math.PI, 0.48 * Math.PI]}
        />
        <meshStandardMaterial color="#040d22" side={THREE.BackSide} roughness={0.35} metalness={0.7} />
      </mesh>

      {/* 3 Horizontal Glowing Neon Tubes Underneath Elevated Screen (Y = 0.35m, 0.70m, 1.05m) */}
      {[0.35, 0.70, 1.05].map((h, idx) => (
        <mesh key={`neon-wire-${idx}`} position={[0, h, -0.6]}>
          <cylinderGeometry
            args={[7.58, 7.58, 0.035, 64, 1, true, 0.59 * Math.PI, 0.46 * Math.PI]}
          />
          <meshBasicMaterial color={neonColor} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}
