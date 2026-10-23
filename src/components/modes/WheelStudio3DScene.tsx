"use client";
/**
 * WheelStudio3DScene — Three.js WebGL scene cho Magic Wheel Display view.
 *
 * Renders:
 *   - Genuine 3D Conical Wheel (nón thật dốc từ tâm ra vành chuẩn CNKD)
 *   - Typography: Roboto Slab (800/900) & Merriweather (900) chuẩn 100% tiếng Việt
 *   - Golden Brass & Chrome hardware styling (không còn viền xanh lạc quẻ)
 *   - Supercharged Broadcast Studio 5-Point Lighting (sáng bừng rực rỡ trường quay)
 *   - Studio Stage Floor with circular golden stage lighting & studio backdrop
 *   - Team podiums arranged in an arc facing the machine
 *   - Camera Cut Controller: 4 authentic TV studio angles
 */

import React, { useRef, useEffect, useMemo, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { MeshReflectorMaterial } from "@react-three/drei";
import * as THREE from "three";
import { MagicWheelSector, TeamState, MagicWheelPuzzleType, CrosswordWordItem } from "@/types";
import { stripVietnameseToneKeepBase, evaluateThreePhaseWheelProgress } from "@/lib/game-engine/magic-wheel";
import { soundManager } from "@/lib/sound-manager";

// ── Types ────────────────────────────────────────────────────────────────────

interface WheelStudio3DSceneProps {
  sectors: MagicWheelSector[];
  clientWheelAngle: number;
  effectiveIsSpinning: boolean;
  selectedSector?: MagicWheelSector;
  teams: TeamState[];
  roundScores?: Record<string, number>;
  currentTurnTeamId?: string;
  tossUpBuzzedTeamId?: string;
  isTossUpRound?: boolean;
  phase?: string;
  boardStage?: "EMPTY_56" | "BLANK_PHRASE" | "READY_CLUE";
  camAngle: number; // 0=default, 1=wheel center, 2=master wide, 3=board hero, 4=disc closeup, 5=player, 6=audience
  edition?: string;
  className?: string;
  currentPuzzle?: {
    category: string;
    description?: string;
    clue?: string;
    secretPhrase: string;
    revealedIndices: number[];
    clueDisplayMode?: "CATEGORY" | "CLUE";
    puzzleType?: MagicWheelPuzzleType;
    crosswordWords?: CrosswordWordItem[];
  } | null;
  highlightedIndices?: Set<number>;
  animRevealedIndices?: Set<number>;
  hostessXPercent?: number;
  hostessPose?: "IDLE" | "GESTURE" | "WALKING" | "TOUCHING";
  showClueOnCam3?: boolean;
  onCamAngleChange?: (cam: number) => void;
}

interface CamConfig {
  pos: [number, number, number];
  target: [number, number, number];
}

// ── Authentic Studio Camera Configurations (6 CAM Multi-Director System) ─────
const CAM_POSITIONS: Record<string, CamConfig> = {
  // CAM 0 / Default: Tầm mắt truyền hình trực diện nhìn toàn cảnh sân khấu (Master Wide)
  DEFAULT: { pos: [0.00, 2.70, 8.80], target: [0.00, 1.60, -1.50] },

  // CAM 1: Trực diện Vòng quay 5.4m & Bàn thí sinh + MC (Contestant & Host Center)
  CAM1_CENTER: { pos: [0.00, 3.35, 5.80], target: [0.00, 1.45, -0.40] },

  // CAM 2: Đại cảnh toàn bộ trường quay tầm mắt TV (Master Wide)
  CAM2_WIDE: { pos: [0.00, 2.70, 8.80], target: [0.00, 1.60, -1.50] },

  // CAM 3: Trực diện Bảng ô chữ 3D & Người mẫu trợ lý (Hostess) trên bục runway
  CAM3_BOARD: { pos: [-1.80, 1.40, 4.80], target: [-7.80, 1.40, 4.80] },

  // CAM 4: Cận cảnh kim chỉ thị cong đỏ cherry và các chốt ô nón đang quay chúc 40°
  CAM4_DISC: { pos: [-2.75, 2.75, 1.55], target: [-2.15, 1.40, 0.10] },

  // CAM 5: Lia cận cảnh thí sinh đang đến lượt (Active Player Close-up)
  CAM5_PLAYER: { pos: [0.60, 2.70, 2.20], target: [0.80, 2.10, -2.60] },

  // CAM 6: Đại cảnh toàn bộ Khán đài 6 tầng & Phông nền Trống đồng Đông Sơn cổ bắt sáng Spotlight
  CAM6_AUDIENCE: { pos: [0.00, 2.90, 4.00], target: [0.00, 5.80, 22.00] },

  // CAM 7: Cận cảnh hàng ghế rạp nhung đỏ Burgundy phóng to 28%, tựa cao, tay vịn gỗ gụ
  CAM7_AUDIENCE_CLOSEUP: { pos: [0.00, 2.60, 14.80], target: [0.00, 3.00, 20.20] },

  // CAM 8: Góc chéo 45° khán đài cánh cung ôm 150° nhìn từ mạn phải sang trái, 0% che khuất
  CAM8_AUDIENCE_DIAG: { pos: [9.50, 3.20, 9.50], target: [-3.50, 3.20, 18.50] },

  // CAM 9: Góc nhìn từ đỉnh hàng ghế Khán giả ngắm toàn cảnh Sân khấu (Audience POV Master Wide)
  CAM9_AUDIENCE_POV: { pos: [0.00, 4.00, 20.50], target: [0.00, 1.25, 0.00] },
};

// ── Texture Generators ───────────────────────────────────────────────────────

/** Calculate dynamic high-contrast fill and stroke colors for wedge text */
function getWedgeTextColors(bgColor: string, defaultTextColor?: string): { fill: string; stroke: string } {
  const cleanHex = (bgColor || "#4338ca").replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2) || "43", 16);
  const g = parseInt(cleanHex.substring(2, 4) || "38", 16);
  const b = parseInt(cleanHex.substring(4, 6) || "ca", 16);
  // ITU-R BT.709 perceived luminance
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

  if (lum > 0.58) {
    // Light / Yellow / Gold backgrounds: Dark navy/black text with crisp white outline
    const isDarkGiven = defaultTextColor && !["#ffffff", "#fff", "#fef08a", "#fef9c3", "#fef3c7"].includes(defaultTextColor.toLowerCase());
    return {
      fill: isDarkGiven ? defaultTextColor : "#0f172a",
      stroke: "#ffffff",
    };
  } else {
    // Dark / Vibrant backgrounds: Crisp white text with black outline
    const isLightGiven = defaultTextColor && !["#000000", "#000", "#0f172a", "#1e293b"].includes(defaultTextColor.toLowerCase());
    return {
      fill: isLightGiven ? defaultTextColor : "#ffffff",
      stroke: "#000000",
    };
  }
}

/** Generate high-resolution wheel texture with authentic Roboto Slab typography (Single Line & High Contrast) */
function generateWheelTexture(sectors: MagicWheelSector[], size = 1024): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const cx = size / 2,
    cy = size / 2,
    r = size / 2 - 8;
  const segCount = sectors.length || 24;
  const degPerSeg = (Math.PI * 2) / segCount;

  // Draw each wedge
  sectors.forEach((sec, idx) => {
    const a1 = idx * degPerSeg - Math.PI / 2;
    const a2 = a1 + degPerSeg;

    // Wedge background
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, a1, a2);
    ctx.closePath();
    ctx.fillStyle = sec.color || "#4338ca";
    ctx.fill();

    // Wedge bevel border
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    // ── Wedge Text & Numbers Along the Radial Axis (Tất cả trên 1 dòng duy nhất, font Roboto Slab) ──
    ctx.save();
    const midAngle = a1 + degPerSeg / 2;
    ctx.translate(cx, cy);
    ctx.rotate(midAngle);

    // Strip commas, dots, and emojis completely
    const rawLabel = sec.label || "";
    const cleanLabel = rawLabel
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "")
      .replace(/[,.]/g, "")
      .trim();
    const isNumeric = sec.type === "POINTS" || /^\$?\d+$/.test(cleanLabel);
    const colors = getWedgeTextColors(sec.color || "#4338ca", sec.textColor);

    if (isNumeric && cleanLabel.length > 0) {
      // Numbers: Stacked upright digits along the radial ray from rim towards center (Cỡ lớn, chuẩn VTV3)
      const digits = cleanLabel.split("");
      const fontSize = digits.length >= 5 ? 48 : digits.length >= 4 ? 56 : 64;
      const stepX = digits.length >= 5 ? 58 : digits.length >= 4 ? 68 : 78;
      const startX = r - (digits.length >= 5 ? 44 : 50);

      // Font Gameshow in hoa dày dặn chuẩn VTV3 không lỗi font (Roboto Slab / Montserrat / Arial Black)
      ctx.font = `900 ${fontSize}px "Roboto Slab", "Montserrat", "Arial Black", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      digits.forEach((digit, dIdx) => {
        const curX = startX - dIdx * stepX;
        ctx.save();
        ctx.translate(curX, 0);
        ctx.rotate(Math.PI / 2); // Flip theo chiều nhìn từ vành nón

        // Viền tương phản sắc nét (3.2px)
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 3.2;
        ctx.strokeText(digit, 0, 0);

        // Màu fill nổi bật
        ctx.fillStyle = colors.fill;
        ctx.fillText(digit, 0, 0);
        ctx.restore();
      });
    } else {
      // Special action label (e.g. PHẦN THƯỞNG, MẤT LƯỢT, NHÂN ĐÔI, CHIA ĐÔI, BÍ MẬT, TỐC ĐỘ, MAY MẮN, MẤT ĐIỂM)
      // Chữ in hoa chuẩn VTV3: Hiển thị 2 dòng xuôi mắt, hướng từ vành nón vào tâm, KHÔNG BAO GIỜ BỊ NGƯỢC
      const words = cleanLabel.split(/\s+/);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      if (words.length >= 2) {
        const line1 = words[0];
        const line2 = words.slice(1).join(" ");

        // Dòng 1 (sát vành ngoài): MẤT, NHÂN, CHIA, PHẦN, MAY...
        ctx.save();
        ctx.translate(r - 46, 0);
        ctx.rotate(-Math.PI / 2); // Xoay -90° để chữ nằm xuôi mắt 100% khi nhìn từ vành nón vào tâm
        const size1 = Math.min(36, Math.max(22, Math.floor(110 / (line1.length * 0.65))));
        ctx.font = `900 ${size1}px "Roboto Slab", "Montserrat", "Arial Black", sans-serif`;
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 3.2;
        ctx.strokeText(line1, 0, 0);
        ctx.fillStyle = colors.fill;
        ctx.fillText(line1, 0, 0);
        ctx.restore();

        // Dòng 2 (hướng vào tâm): LƯỢT, ĐÔI, ĐIỂM, THƯỞNG, MẮN...
        ctx.save();
        ctx.translate(r - 92, 0);
        ctx.rotate(-Math.PI / 2);
        const size2 = Math.min(32, Math.max(18, Math.floor(100 / (line2.length * 0.65))));
        ctx.font = `900 ${size2}px "Roboto Slab", "Montserrat", "Arial Black", sans-serif`;
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 3.0;
        ctx.strokeText(line2, 0, 0);
        ctx.fillStyle = colors.fill;
        ctx.fillText(line2, 0, 0);
        ctx.restore();
      } else {
        // Ô 1 từ đơn (VD: BANKRUPT, JACKPOT, MYSTERY)
        const word = words[0] || "";
        if (word.length >= 7) {
          const mid = Math.ceil(word.length / 2);
          const p1 = word.slice(0, mid) + "-";
          const p2 = word.slice(mid);
          [
            { text: p1, offset: r - 46, maxS: 32 },
            { text: p2, offset: r - 92, maxS: 28 },
          ].forEach((line) => {
            ctx.save();
            ctx.translate(line.offset, 0);
            ctx.rotate(-Math.PI / 2);
            const fs = Math.min(line.maxS, Math.max(18, Math.floor(100 / (line.text.length * 0.65))));
            ctx.font = `900 ${fs}px "Roboto Slab", "Montserrat", "Arial Black", sans-serif`;
            ctx.strokeStyle = colors.stroke;
            ctx.lineWidth = 3.0;
            ctx.strokeText(line.text, 0, 0);
            ctx.fillStyle = colors.fill;
            ctx.fillText(line.text, 0, 0);
            ctx.restore();
          });
        } else {
          ctx.save();
          ctx.translate(r - 65, 0);
          ctx.rotate(-Math.PI / 2);
          const fs = Math.min(38, Math.max(22, Math.floor(105 / (word.length * 0.65))));
          ctx.font = `900 ${fs}px "Roboto Slab", "Montserrat", "Arial Black", sans-serif`;
          ctx.strokeStyle = colors.stroke;
          ctx.lineWidth = 3.2;
          ctx.strokeText(word, 0, 0);
          ctx.fillStyle = colors.fill;
          ctx.fillText(word, 0, 0);
          ctx.restore();
        }
      }
    }

    ctx.restore();
  });

  // Conical 3D Shading Overlay
  const conicalShade = ctx.createRadialGradient(cx, cy, 20, cx, cy, r);
  conicalShade.addColorStop(0, "rgba(255,255,255,0.42)");
  conicalShade.addColorStop(0.35, "rgba(255,255,255,0.15)");
  conicalShade.addColorStop(0.7, "rgba(0,0,0,0.0)");
  conicalShade.addColorStop(0.92, "rgba(0,0,0,0.22)");
  conicalShade.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = conicalShade;
  ctx.fill();

  // Outer Gold Rim with inner bevel
  ctx.beginPath();
  ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
  ctx.strokeStyle = "#d97706";
  ctx.lineWidth = 14;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, r - 4, 0, Math.PI * 2);
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Silver chrome pegs on the rim separator lines
  sectors.forEach((_, idx) => {
    const angle = idx * degPerSeg - Math.PI / 2;
    const pegR = r - 8;
    const px = cx + Math.cos(angle) * pegR;
    const py = cy + Math.sin(angle) * pegR;

    ctx.beginPath();
    ctx.arc(px, py, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 4;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(px, py, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = "#cbd5e1";
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  // Center Metallic Chrome & Gold Hub (tinh tế, nhỏ gọn, không lố)
  const hubRadius = size * 0.055;
  const hubGrad = ctx.createRadialGradient(cx - hubRadius * 0.2, cy - hubRadius * 0.2, 0, cx, cy, hubRadius);
  hubGrad.addColorStop(0, "#ffffff");
  hubGrad.addColorStop(0.4, "#e2e8f0");
  hubGrad.addColorStop(0.8, "#94a3b8");
  hubGrad.addColorStop(1, "#475569");

  ctx.beginPath();
  ctx.arc(cx, cy, hubRadius, 0, Math.PI * 2);
  ctx.fillStyle = hubGrad;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, hubRadius, 0, Math.PI * 2);
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  return canvas;
}

/** Generate team podium screen texture (1024x512 Ultra-HD Broadcast LED Board) */
function generatePodiumTexture(
  name: string,
  totalScore: number,
  roundScore: number,
  color: string,
  isTurn: boolean,
  edition: string,
  rank?: number
): HTMLCanvasElement {
  const w = 1024,
    h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // Screen background with broadcast radial depth
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  if (isTurn) {
    bg.addColorStop(0, "#0c2a5e");
    bg.addColorStop(0.5, "#0e3a7a");
    bg.addColorStop(1, "#0a1f4a");
  } else {
    bg.addColorStop(0, "#0a0f1d");
    bg.addColorStop(0.6, "#0f172a");
    bg.addColorStop(1, "#070c18");
  }
  ctx.fillStyle = bg;
  ctx.roundRect(0, 0, w, h, 36);
  ctx.fill();

  // Glowing golden/neon border
  ctx.strokeStyle = isTurn ? "#f59e0b" : "#38bdf8";
  ctx.lineWidth = isTurn ? 10 : 5;
  ctx.roundRect(8, 8, w - 16, h - 16, 30);
  ctx.stroke();

  // Team avatar dot
  ctx.beginPath();
  ctx.arc(68, 76, 26, 0, Math.PI * 2);
  ctx.fillStyle = color || "#6366f1";
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 5;
  ctx.stroke();

  // Team name (Uppercase, prominent, font stack chuẩn tiếng Việt)
  ctx.fillStyle = isTurn ? "#fef08a" : "#e2e8f0";
  ctx.font = "900 46px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Montserrat', sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const shortName = name.length > 12 ? name.substring(0, 12) : name;
  ctx.fillText(shortName.toUpperCase(), 115, 76);

  // Rank badge
  if (rank) {
    ctx.fillStyle = rank === 1 ? "#fbbf24" : "#94a3b8";
    ctx.font = "900 38px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Montserrat', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`HẠNG #${rank}`, w - 42, 76);
  }

  // Active status tag / LƯỢT QUAY
  if (isTurn) {
    ctx.fillStyle = "#f59e0b";
    ctx.font = "900 36px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Montserrat', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("★ LƯỢT QUAY ★", w - 42, 160);
  }

  // Total score display (Centered, colossal 152px digital broadcast font with radiant gold neon glow)
  // FIX: Chỉ hiện số nguyên bản, TUYỆT ĐỐI không ghi chữ 'đ'
  const scoreStr =
    edition === "ENGLISH"
      ? `$${totalScore.toLocaleString("en-US")}`
      : `${totalScore.toLocaleString("vi-VN")}`;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 152px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Montserrat', 'Arial Black', sans-serif";
  // Golden drop glow
  ctx.shadowColor = isTurn ? "rgba(254, 240, 138, 0.95)" : "rgba(245, 158, 11, 0.75)";
  ctx.shadowBlur = 24;
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 14;
  ctx.strokeText(scoreStr, 512, 305);
  ctx.fillStyle = isTurn ? "#fef08a" : "#fbbf24";
  ctx.fillText(scoreStr, 512, 305);
  ctx.restore();

  // Round score pill (FIX: chỉ hiện số, không có chữ 'đ')
  if (roundScore > 0) {
    const rStr =
      edition === "ENGLISH"
        ? `+$${roundScore.toLocaleString("en-US")}`
        : `+${roundScore.toLocaleString("vi-VN")}`;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 44px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace";
    ctx.fillStyle = "#34d399";
    ctx.fillText(rStr, 512, 445);
    ctx.restore();
  }

  // Subtle CRT scanlines
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  for (let y = 0; y < h; y += 8) {
    ctx.fillRect(0, y, w, 3);
  }

  return canvas;
}

/** Generate authentic Vietnamese Dong Son Bronze Drum gilded motif texture (1024x1024) */
function generateDongSonTexture(size = 1024): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 24;

  // 1. Nền đồng nâu gụ cổ trầm ánh kim (Antique Aged Dark Bronze)
  const bgGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, maxR);
  bgGrad.addColorStop(0, "#26170b");
  bgGrad.addColorStop(0.35, "#301d0e");
  bgGrad.addColorStop(0.7, "#1c1007");
  bgGrad.addColorStop(1, "#100903");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, size, size);

  // Vòng tròn giới hạn mặt trống
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
  ctx.clip();

  // Helper hàm vẽ vòng tròn nẹp đồng cổ chìm
  const strokeRing = (r: number, lw = 2, color = "#5c381c") => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.stroke();
  };

  // Helper hàm vẽ dải răng cưa tam giác (sawtooth)
  const drawSawtoothRing = (rInner: number, rOuter: number, count: number, color = "#6b4421") => {
    ctx.fillStyle = color;
    const step = (Math.PI * 2) / count;
    for (let i = 0; i < count; i++) {
      const a0 = i * step;
      const aMid = a0 + step / 2;
      const a1 = a0 + step;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a0) * rInner, cy + Math.sin(a0) * rInner);
      ctx.lineTo(cx + Math.cos(aMid) * rOuter, cy + Math.sin(aMid) * rOuter);
      ctx.lineTo(cx + Math.cos(a1) * rInner, cy + Math.sin(a1) * rInner);
      ctx.closePath();
      ctx.fill();
    }
  };

  // Helper hàm vẽ các chấm tròn tiếp tuyến (concentric dots)
  const drawDotRing = (r: number, dotR: number, count: number, color = "#875b30") => {
    ctx.fillStyle = color;
    const step = (Math.PI * 2) / count;
    for (let i = 0; i < count; i++) {
      const a = i * step;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      ctx.beginPath();
      ctx.arc(x, y, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // ── 2. NGÔI SAO TRUNG TÂM 14 CÁNH KHẮC ĐỒNG CỔ CHÌM (14-Point Sun Star) ──
  const starPoints = 14;
  const rStarOuter = 138;
  const rStarInner = 52;
  ctx.save();
  ctx.fillStyle = "#784f27";
  ctx.beginPath();
  for (let i = 0; i < starPoints * 2; i++) {
    const r = i % 2 === 0 ? rStarOuter : rStarInner;
    const a = (i * Math.PI) / starPoints - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#422610";
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.restore();

  // Tâm mặt trời đồng rêu
  ctx.beginPath();
  ctx.arc(cx, cy, 34, 0, Math.PI * 2);
  ctx.fillStyle = "#5c391b";
  ctx.fill();
  ctx.strokeStyle = "#7c522b";
  ctx.lineWidth = 3;
  ctx.stroke();

  // ── 3. VÀNH 1: HOA VĂN RĂNG CƯA & CHẤM NỔI ──
  strokeRing(152, 2.5, "#4d2e15");
  drawSawtoothRing(156, 172, 56, "#6b4421");
  strokeRing(176, 2.5, "#4d2e15");
  drawDotRing(186, 2.8, 64, "#875b30");
  strokeRing(196, 2.5, "#5c381c");

  // ── 4. VÀNH 2: 16 CHIM LẠC SẢI CÁNH BAY NGƯỢC CHIỀU KIM ĐỒNG HỒ ──
  strokeRing(202, 2, "#4d2e15");
  const birdCount = 16;
  const rBird = 240;
  ctx.save();
  for (let i = 0; i < birdCount; i++) {
    const a = (i * Math.PI * 2) / birdCount;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a);
    ctx.translate(rBird, 0);
    // Vẽ chim Lạc khắc đồng chìm
    ctx.fillStyle = "#82572d";
    ctx.strokeStyle = "#3e220e";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    // Mỏ và đầu chim
    ctx.moveTo(0, -22);
    ctx.lineTo(8, -8);
    // Cánh dài
    ctx.lineTo(26, -18);
    ctx.lineTo(16, 2);
    // Thân và chân
    ctx.lineTo(10, 14);
    // Đuôi dài xòe
    ctx.lineTo(-4, 24);
    ctx.lineTo(-2, 10);
    ctx.lineTo(-6, -4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Mắt chim
    ctx.beginPath();
    ctx.arc(4, -10, 1.8, 0, Math.PI * 2);
    ctx.fillStyle = "#261508";
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  strokeRing(282, 3, "#5c381c");

  // ── 5. VÀNH 3: HOA VĂN CÁNH SEN & RĂNG CƯA KÉP ──
  drawDotRing(292, 3.2, 72, "#875b30");
  strokeRing(302, 2.5, "#4d2e15");
  drawSawtoothRing(306, 326, 68, "#6b4421");
  strokeRing(330, 2.5, "#4d2e15");

  // Cánh sen cách điệu (Lotus Petals) đồng cổ
  const lotusCount = 32;
  const rLotus = 356;
  ctx.save();
  for (let i = 0; i < lotusCount; i++) {
    const a = (i * Math.PI * 2) / lotusCount;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a);
    ctx.translate(rLotus, 0);
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.quadraticCurveTo(0, -18, 12, 0);
    ctx.quadraticCurveTo(0, 18, -12, 0);
    ctx.fillStyle = i % 2 === 0 ? "#784f27" : "#633f1f";
    ctx.fill();
    ctx.strokeStyle = "#3a200d";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  strokeRing(382, 3, "#5c381c");

  // ── 6. VÀNH NGOÀI CÙNG: DẢI CHẤM NỔI & VIỀN ĐỒNG RÊU CỔ ──
  drawDotRing(396, 3.8, 88, "#875b30");
  strokeRing(408, 4, "#4d2e15");
  drawSawtoothRing(414, 438, 84, "#6b4421");
  strokeRing(444, 4, "#5c381c");
  drawDotRing(456, 4.2, 96, "#875b30");
  strokeRing(468, 6, "#4d2e15");
  strokeRing(478, 4, "#6b4421");
  strokeRing(maxR - 2, 8, "#3e230f");

  ctx.restore();
  return canvas;
}

// ── Sub-components ───────────────────────────────────────────────────────────

/** 3D Wheel Machine (Conical Disc + Hub + Needle + Pedestal - NO BLUE RING) */
function WheelMachineGroup({
  sectors,
  clientWheelAngle,
  effectiveIsSpinning,
}: {
  sectors: MagicWheelSector[];
  clientWheelAngle: number;
  effectiveIsSpinning: boolean;
  selectedSector?: MagicWheelSector;
}) {
  const spinningGroupRef = useRef<THREE.Group>(null);
  const needleRef = useRef<THREE.Mesh>(null);
  const goldAccentRef = useRef<THREE.Mesh>(null);

  // Canvas texture for the wheel disc
  const wheelTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = generateWheelTexture(sectors, 1024);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, [sectors]);

  // True 3D Conical Geometry: elevated center apex sloping smoothly to rim
  const conicalGeometry = useMemo(() => {
    const geom = new THREE.CircleGeometry(2.12, 64, 0, Math.PI * 2);
    const pos = geom.attributes.position;
    const vertex = new THREE.Vector3();
    const R = 2.12;
    const APEX_Z = 0.36; // 36cm conical elevation at apex

    for (let i = 0; i < pos.count; i++) {
      vertex.fromBufferAttribute(pos, i);
      const dist = Math.sqrt(vertex.x * vertex.x + vertex.y * vertex.y);
      const ratio = Math.max(0, 1 - dist / R);
      // Smooth conical slope
      vertex.z = Math.pow(ratio, 0.95) * APEX_Z;
      pos.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    geom.computeVertexNormals();
    return geom;
  }, []);

  // Tilt angle: 7.7 degrees towards camera for broadcast perspective (comfortably below contestant desk)
  const WHEEL_TILT_RAD = 0.135;

  const currentAngleRef = useRef<number>(clientWheelAngle || 0);
  const startAngleRef = useRef<number>(clientWheelAngle || 0);
  const targetAngleRef = useRef<number>(clientWheelAngle || 0);
  const spinStartTimeRef = useRef<number>(0);
  const lastPegIndexRef = useRef<number>(0);
  const lastSnapTimeRef = useRef<number>(0);
  const DURATION_MS = 16000;

  useEffect(() => {
    if (effectiveIsSpinning) {
      startAngleRef.current = currentAngleRef.current;
      // Khởi tạo quán tính quay tức thời khi thí sinh rướn đẩy, không bị khựng đợi server:
      const minSpinDelta = 1440;
      targetAngleRef.current =
        clientWheelAngle > currentAngleRef.current
          ? clientWheelAngle
          : currentAngleRef.current + minSpinDelta;
      spinStartTimeRef.current = performance.now();
      const sLen = sectors.length || 24;
      lastPegIndexRef.current = Math.floor(startAngleRef.current / (360 / sLen));
    } else {
      currentAngleRef.current = clientWheelAngle;
      if (spinningGroupRef.current) {
        spinningGroupRef.current.rotation.z = THREE.MathUtils.degToRad(-clientWheelAngle + 90);
      }
      if (needleRef.current) {
        needleRef.current.rotation.z = 0;
        needleRef.current.position.y = 0;
      }
    }
  }, [effectiveIsSpinning, sectors.length]);

  // Cập nhật góc đích server khi phản hồi đến trong lúc đang quay
  useEffect(() => {
    if (effectiveIsSpinning && clientWheelAngle > startAngleRef.current) {
      targetAngleRef.current = clientWheelAngle;
    }
  }, [clientWheelAngle, effectiveIsSpinning]);

  // Sync wheel rotation (+90° offset for 9 o'clock needle alignment) & realistic heavy-inertia 60fps spin & mechanical needle peg-snap
  useFrame((_, delta) => {
    const sLen = sectors.length || 24;
    const segAngle = 360 / sLen;

    if (spinningGroupRef.current) {
      if (effectiveIsSpinning) {
        const now = performance.now();
        const elapsed = now - (spinStartTimeRef.current || now);
        const progress = evaluateThreePhaseWheelProgress(elapsed, DURATION_MS);
        const liveAngle = startAngleRef.current + (targetAngleRef.current - startAngleRef.current) * progress;
        currentAngleRef.current = liveAngle;
        spinningGroupRef.current.rotation.z = THREE.MathUtils.degToRad(-liveAngle + 90);

        // Peg detection for mechanical needle deflection
        const currentPegIndex = Math.floor(liveAngle / segAngle);
        if (currentPegIndex > lastPegIndexRef.current) {
          lastPegIndexRef.current = currentPegIndex;
          lastSnapTimeRef.current = now;
        }

        // Mechanical needle contact & spring snap at 9 o'clock
        if (needleRef.current) {
          const pegDistToSnap = segAngle - (liveAngle % segAngle);
          const contactWindow = 3.5; // degrees before peg releases needle
          const pegDeflectionSign = -1.0;

          if (pegDistToSnap <= contactWindow) {
            // Peg pushes needle tip upward/deflecting
            const contactProgress = 1.0 - pegDistToSnap / contactWindow;
            const needleAngle = pegDeflectionSign * 0.28 * Math.pow(contactProgress, 1.15);
            needleRef.current.rotation.z = needleAngle;
            needleRef.current.position.y = -Math.abs(needleAngle) * 0.04;
          } else if (lastSnapTimeRef.current > 0) {
            // Elastic spring snap rebound damping to 0
            const dt = (now - lastSnapTimeRef.current) / 1000;
            if (dt < 0.09) {
              const snapAngle = -pegDeflectionSign * 0.16 * Math.exp(-30.0 * dt) * Math.cos(48.0 * dt);
              needleRef.current.rotation.z = snapAngle;
              needleRef.current.position.y = 0;
            } else {
              needleRef.current.rotation.z = 0;
              needleRef.current.position.y = 0;
            }
          } else {
            needleRef.current.rotation.z = 0;
            needleRef.current.position.y = 0;
          }
        }
      } else {
        currentAngleRef.current = clientWheelAngle || 0;
        spinningGroupRef.current.rotation.z = THREE.MathUtils.degToRad(-currentAngleRef.current + 90);
        if (needleRef.current) {
          needleRef.current.rotation.z = 0;
          needleRef.current.position.y = 0;
        }
      }
    }

    if (goldAccentRef.current) {
      const mat = goldAccentRef.current.material as THREE.MeshStandardMaterial;
      const t = Date.now() / 1000;
      if (effectiveIsSpinning) {
        mat.emissiveIntensity = 0.65 + Math.sin(t * 8) * 0.25;
      } else {
        mat.emissiveIntensity = 0.4 + Math.sin(t * 2) * 0.1;
      }
    }
  });

  return (
    <group position={[0, -0.05, 0]} scale={[1.25, 1.25, 1.25]}>
      {/* ── 1. ROTATING 3D CONICAL WHEEL DISC ── */}
      <group position={[0, 1.10, 0]} rotation={[-Math.PI / 2 + WHEEL_TILT_RAD, 0, 0]}>
        <group ref={spinningGroupRef}>
          {/* Conical Sloped Mesh */}
          <mesh geometry={conicalGeometry} castShadow receiveShadow>
            <meshStandardMaterial
              map={wheelTexture ?? undefined}
              color={wheelTexture ? "#ffffff" : "#4f46e5"}
              roughness={0.22}
              metalness={0.22}
            />
          </mesh>

          {/* 24 Chốt Trụ Kim loại 3D phân tách ô chuẩn VTV3 (Separation Pegs) */}
          {sectors.map((_, idx) => {
            const angle = (idx * Math.PI * 2) / sectors.length - Math.PI / 2;
            const PEG_RADIUS = 2.08;
            const px = Math.cos(angle) * PEG_RADIUS;
            const py = Math.sin(angle) * PEG_RADIUS;
            return (
              <group key={`peg-${idx}`} position={[px, py, 0.015]} rotation={[0, 0, angle]}>
                {/* Chân đệm chốt mạ Chrome */}
                <mesh position={[0, 0, 0.015]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.026, 0.032, 0.03, 16]} />
                  <meshStandardMaterial color="#cbd5e1" metalness={0.96} roughness={0.06} />
                </mesh>
                {/* Thân chốt trụ kim loại mạ Chrome đứng thẳng */}
                <mesh position={[0, 0, 0.065]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <cylinderGeometry args={[0.016, 0.016, 0.10, 16]} />
                  <meshStandardMaterial color="#f8fafc" metalness={0.98} roughness={0.03} />
                </mesh>
                {/* Đầu chốt đinh tán hình cầu mạ vàng */}
                <mesh position={[0, 0, 0.115]}>
                  <sphereGeometry args={[0.022, 12, 12]} />
                  <meshStandardMaterial
                    color="#fef08a"
                    metalness={0.96}
                    roughness={0.04}
                    emissive="#fbbf24"
                    emissiveIntensity={0.25}
                  />
                </mesh>
              </group>
            );
          })}

          {/* Tâm vòng quay cơ khí thanh lịch, tinh tế chuẩn VTV3 (không bị lố) */}
          {/* 1. Mâm đế trục mạ Chrome bạc phẳng ôm sát tâm nón */}
          <mesh position={[0, 0, 0.362]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.18, 0.015, 32]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.96} roughness={0.08} />
          </mesh>
          {/* 2. Vòng đệm viền vàng gold tinh tế */}
          <mesh position={[0, 0, 0.372]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.11, 0.11, 0.012, 28]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.92} roughness={0.12} />
          </mesh>
          {/* 3. Ốc tán tâm trục trung tâm mạ crom bóng loáng */}
          <mesh position={[0, 0, 0.380]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 0.01, 16]} />
            <meshStandardMaterial color="#f8fafc" metalness={0.98} roughness={0.04} />
          </mesh>
        </group>
      </group>

      {/* ── 2. NEEDLE AT 9 O'CLOCK FLANK WITH AUTHENTIC SLANTED SUPPORT PILLAR (VTV3 BROADCAST STYLE) ── */}
      {/* ── 2. SLEEK MECHANICAL NEEDLE ACCORDING TO VTV3 2015 BROADCAST (16:58) ── */}
      {/* Curved cherry red lacquer support arm & chrome pivot assembly at 9 o'clock */}
      <group position={[-2.32, 1.10, 0.08]} rotation={[0.18, 0.10, 0]}>
        {/* Sleek Curved Arm base in glossy cherry red lacquer */}
        <mesh position={[-0.14, -0.12, 0]} rotation={[0, 0, -0.45]} castShadow>
          <cylinderGeometry args={[0.042, 0.054, 0.38, 20]} />
          <meshStandardMaterial
            color="#b91c1c"
            roughness={0.15}
            metalness={0.45}
            emissive="#7f1d1d"
            emissiveIntensity={0.3}
          />
        </mesh>

        {/* Chrome & Gold cylindrical pivot housing */}
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.082, 0.082, 0.14, 24]} />
          <meshStandardMaterial color="#f8fafc" metalness={0.96} roughness={0.04} />
        </mesh>
        <mesh position={[0, 0, 0.072]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.02, 20]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.92} roughness={0.08} emissive="#d97706" emissiveIntensity={0.6} />
        </mesh>

        {/* Dynamic vibrating pointer flapper pointing into the 3D pegs (Sleek crimson acrylic blade - NO YELLOW TIP) */}
        <group ref={needleRef} position={[0, 0, 0]}>
          {/* Sleek tapering red acrylic blade pointing directly into the pegs */}
          <mesh position={[0.26, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
            <coneGeometry args={[0.052, 0.52, 24]} />
            <meshStandardMaterial
              color="#dc2626"
              emissive="#b91c1c"
              emissiveIntensity={0.8}
              metalness={0.2}
              roughness={0.15}
            />
          </mesh>
          {/* Chrome pivot pin head */}
          <mesh position={[0, 0, 0.08]}>
            <sphereGeometry args={[0.038, 16, 16]} />
            <meshStandardMaterial color="#f8fafc" metalness={0.98} roughness={0.02} />
          </mesh>
        </group>
      </group>

      {/* Slanted chrome support pillar extending down to floor */}
      <mesh position={[-2.42, 0.50, 0.10]} rotation={[0.06, 0, -0.14]} castShadow receiveShadow>
        <cylinderGeometry args={[0.058, 0.075, 1.25, 24]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.06} />
      </mesh>
      <mesh position={[-2.46, -0.08, 0.10]} receiveShadow>
        <cylinderGeometry args={[0.18, 0.22, 0.08, 24]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.92} roughness={0.12} />
      </mesh>

      {/* Gold decorative collar ring on pillar */}
      <mesh position={[-2.40, 0.72, 0.12]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.085, 0.022, 8, 24]} />
        <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={0.5} metalness={0.94} roughness={0.08} />
      </mesh>

      {/* Pillar floor flared base anchor plinth */}
      <mesh position={[-2.40, -0.72, 0.12]}>
        <cylinderGeometry args={[0.16, 0.22, 0.14, 24]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.94} roughness={0.08} />
      </mesh>

      {/* ── 3. MULTI-TIER METALLIC ILLUMINATED PEDESTAL (ĐƯỜNG KÍNH THON GỌN, HOÀN TOÀN DƯỚI GẦM NÓN) ── */}
      {/* Tier 1: Bright Chrome Axle Collar supporting center of wheel hub */}
      <mesh position={[0, 0.76, 0]} castShadow>
        <cylinderGeometry args={[0.72, 0.82, 0.22, 32]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.06} />
      </mesh>

      {/* Tier 2: Illuminated Golden Collar Belt */}
      <mesh ref={goldAccentRef} position={[0, 0.72, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.84, 0.035, 8, 48]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#d97706"
          emissiveIntensity={0.6}
          metalness={0.94}
          roughness={0.08}
        />
      </mesh>

      {/* Tier 3: Sleek Studio Navy Lacquered Tapered Trunk */}
      <mesh position={[0, 0.32, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.85, 1.45, 0.75, 32]} />
        <meshStandardMaterial color="#0f254e" metalness={0.88} roughness={0.15} />
      </mesh>

      {/* Mid-trunk reflective Chrome Belt */}
      <mesh position={[0, 0.32, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.18, 0.035, 8, 48]} />
        <meshStandardMaterial
          color="#e2e8f0"
          metalness={0.95}
          roughness={0.05}
        />
      </mesh>

      {/* Tier 4: Lower Chrome Stepped Tier */}
      <mesh position={[0, -0.18, 0]} receiveShadow>
        <cylinderGeometry args={[1.50, 1.95, 0.35, 32]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.92} roughness={0.08} />
      </mesh>

      {/* Tier 5: Studio Navy Base Tier */}
      <mesh position={[0, -0.52, 0]} receiveShadow>
        <cylinderGeometry args={[2.05, 2.45, 0.35, 32]} />
        <meshStandardMaterial color="#0a1a36" metalness={0.85} roughness={0.2} />
      </mesh>

      {/* Tier 6: Flared Chrome Plinth Foot */}
      <mesh position={[0, -0.68, 0]} receiveShadow>
        <cylinderGeometry args={[2.48, 2.68, 0.14, 32]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.08} />
      </mesh>

      {/* 4 Dedicated Warm Golden Floor Uplights illuminating pedestal and under-wheel area */}
      {[Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75].map((angle, i) => (
        <pointLight
          key={`uplight-${i}`}
          position={[Math.cos(angle) * 1.8, -0.2, Math.sin(angle) * 1.8]}
          color="#fef08a"
          intensity={effectiveIsSpinning ? 4.5 : 3.6}
          distance={4.5}
          decay={1.8}
        />
      ))}

      {/* Soft circular floor ambient contact */}
      <mesh position={[0, -0.73, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[2.95, 32]} />
        <meshStandardMaterial color="#000000" transparent opacity={0.2} />
      </mesh>
    </group>
  );
}

/** Bàn tay 5 ngón phân đốt chân thực chuẩn giải phẫu (Articulated Human Hand with 5 fingers) */
function RealisticArticulatedHand({
  skinColor = "#fed7aa",
  side = "right",
  pose = "OPEN",
}: {
  skinColor?: string;
  side?: "left" | "right";
  pose?: "OPEN" | "GRIP" | "TOUCH" | "HOLD_MIC" | "REST_TABLE";
}) {
  const isRight = side === "right";
  const mirrorX = isRight ? 1 : -1;

  // Cấu hình góc gập các khớp đốt ngón tay theo từng tư thế cử động
  const fingerConfigs = useMemo(() => {
    switch (pose) {
      case "GRIP":
        return {
          thumb: { rotZ: -0.52 * mirrorX, rotX: 0.72, curl: 0.92 },
          index: { rotZ: 0.06 * mirrorX, curl1: 1.25, curl2: 1.15 },
          middle: { rotZ: 0.0 * mirrorX, curl1: 1.35, curl2: 1.25 },
          ring: { rotZ: -0.06 * mirrorX, curl1: 1.30, curl2: 1.20 },
          pinky: { rotZ: -0.12 * mirrorX, curl1: 1.15, curl2: 1.05 },
        };
      case "TOUCH":
        return {
          thumb: { rotZ: -0.25 * mirrorX, rotX: 0.22, curl: 0.28 },
          index: { rotZ: 0.03 * mirrorX, curl1: 0.08, curl2: 0.04 }, // Duỗi thẳng ngón trỏ chạm mở ô chữ
          middle: { rotZ: -0.03 * mirrorX, curl1: 0.32, curl2: 0.24 },
          ring: { rotZ: -0.08 * mirrorX, curl1: 0.55, curl2: 0.45 },
          pinky: { rotZ: -0.14 * mirrorX, curl1: 0.70, curl2: 0.58 },
        };
      case "HOLD_MIC":
        return {
          thumb: { rotZ: -0.55 * mirrorX, rotX: 0.60, curl: 0.82 },
          index: { rotZ: 0.05 * mirrorX, curl1: 1.10, curl2: 1.00 },
          middle: { rotZ: 0.0 * mirrorX, curl1: 1.16, curl2: 1.06 },
          ring: { rotZ: -0.05 * mirrorX, curl1: 1.10, curl2: 1.00 },
          pinky: { rotZ: -0.10 * mirrorX, curl1: 1.02, curl2: 0.92 },
        };
      case "REST_TABLE":
        return {
          thumb: { rotZ: -0.35 * mirrorX, rotX: 0.12, curl: 0.10 },
          index: { rotZ: 0.03 * mirrorX, curl1: 0.14, curl2: 0.08 },
          middle: { rotZ: 0.0 * mirrorX, curl1: 0.14, curl2: 0.08 },
          ring: { rotZ: -0.03 * mirrorX, curl1: 0.14, curl2: 0.08 },
          pinky: { rotZ: -0.06 * mirrorX, curl1: 0.14, curl2: 0.08 },
        };
      case "OPEN":
      default:
        return {
          thumb: { rotZ: -0.28 * mirrorX, rotX: 0.20, curl: 0.25 },
          index: { rotZ: 0.04 * mirrorX, curl1: 0.30, curl2: 0.20 },
          middle: { rotZ: 0.0 * mirrorX, curl1: 0.35, curl2: 0.24 },
          ring: { rotZ: -0.04 * mirrorX, curl1: 0.35, curl2: 0.24 },
          pinky: { rotZ: -0.08 * mirrorX, curl1: 0.42, curl2: 0.30 },
        };
    }
  }, [pose, mirrorX]);

  return (
    <group scale={[mirrorX, 1, 1]}>
      {/* 1. Lòng bàn tay & Mu bàn tay có vòm cơ thenar/hypothenar mềm mại */}
      <mesh position={[0, -0.040, 0]} castShadow>
        <boxGeometry args={[0.052, 0.072, 0.024]} />
        <meshStandardMaterial color={skinColor} roughness={0.36} metalness={0.04} />
      </mesh>
      {/* Mô ngón cái (Thenar eminence) nở nang */}
      <mesh position={[-0.016, -0.024, 0.006]}>
        <sphereGeometry args={[0.014, 10, 10]} />
        <meshStandardMaterial color={skinColor} roughness={0.36} metalness={0.04} />
      </mesh>

      {/* 2. Ngón cái (Thumb - 2 đốt phân khớp cử động tự nhiên) */}
      <group position={[-0.028, -0.020, 0.006]} rotation={[fingerConfigs.thumb.rotX, 0, fingerConfigs.thumb.rotZ]}>
        <mesh position={[-0.009, -0.014, 0]}>
          <cylinderGeometry args={[0.008, 0.009, 0.028, 12]} />
          <meshStandardMaterial color={skinColor} roughness={0.36} metalness={0.04} />
        </mesh>
        <group position={[-0.014, -0.028, 0]} rotation={[fingerConfigs.thumb.curl, 0, 0]}>
          <mesh position={[0, -0.012, 0]}>
            <cylinderGeometry args={[0.0068, 0.008, 0.024, 12]} />
            <meshStandardMaterial color={skinColor} roughness={0.36} metalness={0.04} />
          </mesh>
          <mesh position={[0, -0.024, 0]}>
            <sphereGeometry args={[0.0068, 10, 10]} />
            <meshStandardMaterial color={skinColor} roughness={0.36} metalness={0.04} />
          </mesh>
        </group>
      </group>

      {/* 3. Bốn ngón tay: Trỏ, Giữa, Áp út, Út (3 đốt khớp nối liên hoàn) */}
      {[
        { name: "index", x: -0.018, len1: 0.028, len2: 0.022, cfg: fingerConfigs.index },
        { name: "middle", x: -0.006, len1: 0.032, len2: 0.025, cfg: fingerConfigs.middle },
        { name: "ring", x: 0.006, len1: 0.029, len2: 0.023, cfg: fingerConfigs.ring },
        { name: "pinky", x: 0.018, len1: 0.023, len2: 0.018, cfg: fingerConfigs.pinky },
      ].map((finger) => (
        <group key={finger.name} position={[finger.x, -0.076, 0]} rotation={[0, 0, finger.cfg.rotZ]}>
          {/* Đốt 1 (Proximal phalanx) */}
          <group rotation={[finger.cfg.curl1, 0, 0]}>
            <mesh position={[0, -finger.len1 / 2, 0]}>
              <cylinderGeometry args={[0.0062, 0.0070, finger.len1, 10]} />
              <meshStandardMaterial color={skinColor} roughness={0.36} metalness={0.04} />
            </mesh>
            {/* Đốt 2 & 3 (Distal phalanx) */}
            <group position={[0, -finger.len1, 0]} rotation={[finger.cfg.curl2, 0, 0]}>
              <mesh position={[0, -finger.len2 / 2, 0]}>
                <cylinderGeometry args={[0.0052, 0.0062, finger.len2, 10]} />
                <meshStandardMaterial color={skinColor} roughness={0.36} metalness={0.04} />
              </mesh>
              {/* Đầu búp ngón tay mềm mại */}
              <mesh position={[0, -finger.len2, 0]}>
                <sphereGeometry args={[0.0055, 10, 10]} />
                <meshStandardMaterial color={skinColor} roughness={0.36} metalness={0.04} />
              </mesh>
            </group>
          </group>
        </group>
      ))}
    </group>
  );
}

/** Đầu người 3D chuẩn tỷ lệ giải phẫu người thật Á Đông (Metahuman Realistic Style với kích thước chuẩn 1:7.5, giác mạc phản quang và tóc 3D nhiều lớp) */
function RealisticHumanHead({
  hairColor = "#0f172a",
  skinColor = "#fed7aa",
  gender = "male",
  isHost = false,
  isTurn = false,
  isSpinning = false,
  position = [0, 1.02, 0],
}: {
  hairColor?: string;
  skinColor?: string;
  gender?: "male" | "female";
  isHost?: boolean;
  isTurn?: boolean;
  isSpinning?: boolean;
  position?: [number, number, number];
}) {
  const headRef = useRef<THREE.Group>(null);
  const isFemale = gender === "female";

  useFrame((state) => {
    if (!headRef.current) return;
    const t = state.clock.getElapsedTime();
    if (isSpinning) {
      // Dõi mắt và xoay đầu nhịp nhàng theo chiều quay của bánh xe
      headRef.current.rotation.y = Math.sin(t * 3.2) * 0.16;
      headRef.current.rotation.x = 0.08 + Math.cos(t * 2.0) * 0.03;
    } else if (isTurn) {
      // Đội đến lượt: ngẩng cao đầu tự tin, mỉm cười rạng rỡ
      headRef.current.rotation.y = Math.sin(t * 1.5) * 0.06;
      headRef.current.rotation.x = -0.04;
    } else {
      headRef.current.rotation.y = Math.sin(t * 0.8 + (isHost ? 1 : 0)) * 0.04;
      headRef.current.rotation.x = 0;
    }
  });

  return (
    <group ref={headRef} position={position}>
      {/* 1. Cổ người thật (Neck) thon gọn nối từ ngực với tỷ lệ chuẩn */}
      <mesh position={[0, -0.08, -0.01]} castShadow>
        <cylinderGeometry args={[isFemale ? 0.052 : 0.065, isFemale ? 0.062 : 0.076, 0.16, 20]} />
        <meshStandardMaterial color={skinColor} roughness={0.36} metalness={0.04} />
      </mesh>
      {/* Yết hầu nam tính (Adam's Apple) cho Nam */}
      {!isFemale && (
        <mesh position={[0, -0.07, 0.055]}>
          <sphereGeometry args={[0.012, 10, 10]} />
          <meshStandardMaterial color={skinColor} roughness={0.36} metalness={0.04} />
        </mesh>
      )}

      {/* 2. Khung sọ đầu bo tròn giải phẫu người trưởng thành (Cranial Skull - R=0.150m) */}
      <mesh castShadow scale={[0.92, 1.08, 0.95]}>
        <sphereGeometry args={[0.150, 32, 32]} />
        <meshStandardMaterial color={skinColor} roughness={0.36} metalness={0.04} />
      </mesh>

      {/* Cằm và xương hàm thon V-line Á Đông thanh tú */}
      <mesh position={[0, -0.082, 0.038]} rotation={[Math.PI, 0, 0]} scale={[0.90, 0.72, 0.88]}>
        <coneGeometry args={[0.092, 0.12, 24]} />
        <meshStandardMaterial color={skinColor} roughness={0.36} metalness={0.04} />
      </mesh>
      {/* Đầu cằm tròn mịn */}
      <mesh position={[0, -0.138, 0.042]}>
        <sphereGeometry args={[0.034, 16, 16]} />
        <meshStandardMaterial color={skinColor} roughness={0.36} metalness={0.04} />
      </mesh>

      {/* Gò má và má ửng hồng duyên dáng */}
      {isFemale && (
        <>
          <mesh position={[-0.088, -0.010, 0.115]}>
            <sphereGeometry args={[0.024, 12, 12]} />
            <meshStandardMaterial color="#f43f5e" roughness={0.5} transparent opacity={0.16} />
          </mesh>
          <mesh position={[0.088, -0.010, 0.115]}>
            <sphereGeometry args={[0.024, 12, 12]} />
            <meshStandardMaterial color="#f43f5e" roughness={0.5} transparent opacity={0.16} />
          </mesh>
        </>
      )}

      {/* 3. Mái tóc 3D nhiều lớp (Multi-layer procedural hair - hoàn toàn bằng hình cầu uốn lượn, KHÔNG DÙNG HỘP LEGO) */}
      {isFemale ? (
        // Tóc Nữ: Búi tóc đài các sau gáy (Chignon bun), tóc mái lượn sóng và dải tóc mai mềm mại
        <group position={[0, 0.04, -0.01]}>
          {/* Mũ tóc chính ôm trọn vòm sọ */}
          <mesh position={[0, 0.035, -0.015]} scale={[1.02, 1.06, 1.04]}>
            <sphereGeometry args={[0.158, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
            <meshStandardMaterial color={hairColor} roughness={0.28} metalness={0.18} />
          </mesh>
          {/* Búi tóc chignon đài các phía sau gáy */}
          <mesh position={[0, 0.015, -0.155]} scale={[1.12, 0.98, 0.90]}>
            <sphereGeometry args={[0.095, 24, 24]} />
            <meshStandardMaterial color={hairColor} roughness={0.30} metalness={0.16} />
          </mesh>
          {/* Trâm cài / kẹp tóc mạ vàng champagne lấp lánh */}
          <mesh position={[0, 0.04, -0.162]} rotation={[0, 0, 0.35]}>
            <torusGeometry args={[0.068, 0.007, 12, 28]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.96} roughness={0.06} emissive="#d97706" emissiveIntensity={0.35} />
          </mesh>
          {/* Lọn tóc mai mềm mại hai bên thái dương */}
          <mesh position={[-0.118, -0.020, 0.095]} rotation={[0.2, 0.2, -0.1]}>
            <cylinderGeometry args={[0.014, 0.008, 0.16, 12]} />
            <meshStandardMaterial color={hairColor} roughness={0.30} />
          </mesh>
          <mesh position={[0.118, -0.020, 0.095]} rotation={[0.2, -0.2, 0.1]}>
            <cylinderGeometry args={[0.014, 0.008, 0.16, 12]} />
            <meshStandardMaterial color={hairColor} roughness={0.30} />
          </mesh>
        </group>
      ) : (
        // Tóc Nam: Tóc rẽ ngôi 7/3 vuốt sáp bóng bẩy lịch lãm chuẩn MC (Khối vòm cong mềm mại, KHÔNG HỘP CHỮ NHẬT)
        <group position={[0, 0.05, -0.01]}>
          <mesh position={[0, 0.032, -0.015]} scale={[1.02, 1.06, 1.04]}>
            <sphereGeometry args={[0.156, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.54]} />
            <meshStandardMaterial color={hairColor} roughness={0.32} metalness={0.16} />
          </mesh>
          {/* Mái tóc bồng rẽ ngôi 7/3 vuốt sáp bồng bềnh */}
          <mesh position={[0.02, 0.118, 0.075]} rotation={[0.22, 0.10, -0.06]} scale={[1.15, 0.42, 0.85]}>
            <sphereGeometry args={[0.11, 24, 24]} />
            <meshStandardMaterial color={hairColor} roughness={0.30} metalness={0.18} />
          </mesh>
          {/* Lọn tóc vuốt bồng sang phải */}
          <mesh position={[0.07, 0.105, 0.065]} rotation={[0.15, -0.12, 0.25]} scale={[0.85, 0.35, 0.75]}>
            <sphereGeometry args={[0.09, 20, 20]} />
            <meshStandardMaterial color={hairColor} roughness={0.30} metalness={0.18} />
          </mesh>
          {/* Hai bên mang tai tỉa gọn gàng tự nhiên (side fade cong mềm) */}
          <mesh position={[-0.125, 0.020, 0.012]} rotation={[0, 0, 0.08]} scale={[0.35, 1.0, 0.9]}>
            <sphereGeometry args={[0.065, 16, 16]} />
            <meshStandardMaterial color={hairColor} roughness={0.38} />
          </mesh>
          <mesh position={[0.125, 0.020, 0.012]} rotation={[0, 0, -0.08]} scale={[0.35, 1.0, 0.9]}>
            <sphereGeometry args={[0.065, 16, 16]} />
            <meshStandardMaterial color={hairColor} roughness={0.38} />
          </mesh>
        </group>
      )}

      {/* 4. Đôi mắt có giác mạc phản quang (Sclera + Iris + Specular Reflection - Nằm nổi bật trên bề mặt khuôn mặt không bị lún) */}
      {[-0.052, 0.052].map((ex, i) => (
        <group key={`eye-${i}`} position={[ex, 0.024, 0.152]}>
          {/* Tròng trắng mắt (Sclera) */}
          <mesh>
            <sphereGeometry args={[0.021, 18, 18]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.12} />
          </mesh>
          {/* Mống mắt nâu hạt dẻ sâu thẳm Á Đông (Iris) */}
          <mesh position={[0, 0, 0.015]}>
            <sphereGeometry args={[0.0135, 16, 16]} />
            <meshStandardMaterial color="#2b1d0c" roughness={0.18} metalness={0.25} />
          </mesh>
          {/* Con ngươi đen tuyền (Pupil) */}
          <mesh position={[0, 0, 0.019]}>
            <sphereGeometry args={[0.0075, 12, 12]} />
            <meshStandardMaterial color="#050508" roughness={0.08} metalness={0.5} />
          </mesh>
          {/* Đốm sáng phản chiếu ánh đèn studio rực rỡ (Specular highlight) */}
          <mesh position={[0.004, 0.005, 0.023]}>
            <sphereGeometry args={[0.004, 8, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          {/* Nếp mí mắt cong mềm */}
          <mesh position={[0, 0.016, 0.012]} rotation={[0.22, 0, i === 0 ? 0.05 : -0.05]}>
            <cylinderGeometry args={[0.018, 0.018, 0.004, 12]} />
            <meshStandardMaterial color="#0f172a" roughness={0.35} />
          </mesh>
          {/* Chân mày tỉ mỉ sắc nét */}
          <mesh position={[0, 0.034, 0.008]} rotation={[0, 0, i === 0 ? 0.08 : -0.08]}>
            <cylinderGeometry args={[0.024, 0.024, 0.006, 12]} />
            <meshStandardMaterial color={hairColor} roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* 5. Sống mũi thanh tú Á Đông có cánh mũi 3D */}
      <group position={[0, -0.010, 0.158]}>
        <mesh rotation={[0.16, 0, 0]}>
          <coneGeometry args={[0.019, 0.058, 14]} />
          <meshStandardMaterial color={skinColor} roughness={0.36} />
        </mesh>
        {/* Đầu mũi tròn thanh mảnh */}
        <mesh position={[0, -0.025, 0.010]}>
          <sphereGeometry args={[0.012, 10, 10]} />
          <meshStandardMaterial color={skinColor} roughness={0.36} />
        </mesh>
        {/* Cánh mũi hai bên */}
        <mesh position={[-0.016, -0.025, -0.004]}>
          <sphereGeometry args={[0.009, 8, 8]} />
          <meshStandardMaterial color={skinColor} roughness={0.36} />
        </mesh>
        <mesh position={[0.016, -0.025, -0.004]}>
          <sphereGeometry args={[0.009, 8, 8]} />
          <meshStandardMaterial color={skinColor} roughness={0.36} />
        </mesh>
      </group>

      {/* 6. Bờ môi quyến rũ (Nữ son đỏ thanh lịch, Nam màu tự nhiên) */}
      <group position={[0, -0.056, 0.148]}>
        {/* Môi trên uốn cánh cung Cupid */}
        <mesh position={[0, 0.006, 0]}>
          <cylinderGeometry args={[0.028, 0.028, 0.008, 14]} />
          <meshStandardMaterial color={isFemale ? "#be123c" : "#d9777f"} roughness={0.22} />
        </mesh>
        {/* Môi dưới đầy đặn */}
        <mesh position={[0, -0.008, 0.002]}>
          <cylinderGeometry args={[0.026, 0.026, 0.010, 14]} />
          <meshStandardMaterial color={isFemale ? "#e11d48" : "#e0828a"} roughness={0.22} />
        </mesh>
      </group>

      {/* 7. Đôi tai 3D với hoa tai pha lê nếu là Nữ */}
      {[-0.155, 0.155].map((tx, i) => (
        <group key={`ear-${i}`} position={[tx, 0.008, 0]} rotation={[0, 0, i === 0 ? 0.15 : -0.15]}>
          <mesh>
            <sphereGeometry args={[0.028, 14, 14]} />
            <meshStandardMaterial color={skinColor} roughness={0.38} />
          </mesh>
          {/* Hoa tai / Bông tai ngọc trai lấp lánh cho Nữ */}
          {isFemale && (
            <mesh position={[0, -0.032, 0]}>
              <sphereGeometry args={[0.009, 12, 12]} />
              <meshStandardMaterial color="#fef08a" metalness={0.96} roughness={0.06} emissive="#fbbf24" emissiveIntensity={0.4} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

// Giữ alias tương thích
const StylizedHumanoidHead = RealisticHumanHead;

/** 3D Realistic Contestant Mannequin (Thí sinh người thật mặc vest âu cao cấp với động tác 2 tay dồn lực đẩy nón nằm ngang) */
function RealisticContestantMannequin({
  color,
  isTurn,
  isSpinning,
}: {
  color?: string;
  isTurn?: boolean;
  isSpinning?: boolean;
}) {
  const rootGroupRef = useRef<THREE.Group>(null);
  const upperBodyRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const spinStartTimeRef = useRef<number>(0);

  const [handPoseRight, setHandPoseRight] = useState<"OPEN" | "GRIP" | "TOUCH" | "HOLD_MIC" | "REST_TABLE">("OPEN");
  const [handPoseLeft, setHandPoseLeft] = useState<"OPEN" | "GRIP" | "TOUCH" | "HOLD_MIC" | "REST_TABLE">("REST_TABLE");

  useFrame((state, delta) => {
    if (!rootGroupRef.current || !upperBodyRef.current || !rightArmRef.current || !leftArmRef.current) return;
    const now = state.clock.getElapsedTime();

    if (isTurn && isSpinning) {
      if (spinStartTimeRef.current === 0) {
        spinStartTimeRef.current = now;
      }
      const t = now - spinStartTimeRef.current;

      if (t < 0.4) {
        // Giai đoạn 1 (0s - 0.4s): Nhoài người về phía trước mép bục, tay trái tì làm điểm tựa, tay phải vươn bám chốt nón
        const p = Math.min(1, t / 0.4);
        upperBodyRef.current.rotation.x = THREE.MathUtils.lerp(0, 0.38, p);
        upperBodyRef.current.position.z = THREE.MathUtils.lerp(0, 0.22, p);
        upperBodyRef.current.rotation.y = THREE.MathUtils.lerp(0, -0.26, p);

        // Tay trái tì lên mép bục nón làm điểm tựa
        leftArmRef.current.rotation.x = THREE.MathUtils.lerp(0.45, 0.72, p);
        leftArmRef.current.rotation.z = THREE.MathUtils.lerp(0.18, 0.32, p);
        setHandPoseLeft("REST_TABLE");

        // Tay phải vươn xa nắm chặt lấy chốt kim loại thẳng đứng của nón nằm ngang
        rightArmRef.current.rotation.x = THREE.MathUtils.lerp(0.45, -1.15, p);
        rightArmRef.current.rotation.z = THREE.MathUtils.lerp(-0.18, -0.48, p);
        setHandPoseRight("GRIP");
      } else if (t < 1.5) {
        // Giai đoạn 2 (0.4s - 1.5s): Vung tay & dồn toàn bộ trọng tâm cơ bắp đẩy mạnh nón xoay theo chiều kim đồng hồ
        const p = Math.min(1, (t - 0.4) / 1.1);
        upperBodyRef.current.rotation.x = 0.38 * (1 - p * 0.35);
        upperBodyRef.current.rotation.y = THREE.MathUtils.lerp(-0.26, 0.42, p);

        // Vung tay phải từ trái qua phải theo chiều xoay nón
        rightArmRef.current.rotation.x = THREE.MathUtils.lerp(-1.15, -0.68, p);
        rightArmRef.current.rotation.z = THREE.MathUtils.lerp(-0.48, 0.82, p);
        setHandPoseRight("GRIP");
      } else {
        // Giai đoạn 3 (1.5s trở đi): Buông tay, đứng thẳng người lại bục quan sát nón trôi chậm dần
        upperBodyRef.current.rotation.x = THREE.MathUtils.lerp(upperBodyRef.current.rotation.x, 0, delta * 3.0);
        upperBodyRef.current.position.z = THREE.MathUtils.lerp(upperBodyRef.current.position.z, 0, delta * 3.0);
        upperBodyRef.current.rotation.y = THREE.MathUtils.lerp(upperBodyRef.current.rotation.y, 0, delta * 3.0);

        leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, 0.45, delta * 3.0);
        leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, 0.18, delta * 3.0);

        rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, 0.45, delta * 3.0);
        rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, -0.18, delta * 3.0);

        setHandPoseRight("OPEN");
        setHandPoseLeft("REST_TABLE");
      }
    } else {
      spinStartTimeRef.current = 0;
      // Trạng thái nghỉ: Thở nhẹ tự nhiên, đứng phong thái tự tin
      const breathe = Math.sin(now * 1.6) * 0.005;
      upperBodyRef.current.position.y = breathe;
      upperBodyRef.current.rotation.x = THREE.MathUtils.lerp(upperBodyRef.current.rotation.x, 0, delta * 4.0);
      upperBodyRef.current.position.z = THREE.MathUtils.lerp(upperBodyRef.current.position.z, 0, delta * 4.0);
      upperBodyRef.current.rotation.y = THREE.MathUtils.lerp(upperBodyRef.current.rotation.y, 0, delta * 4.0);

      leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, 0.45, delta * 4.0);
      leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, 0.18, delta * 4.0);

      rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, 0.45, delta * 4.0);
      rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, -0.18, delta * 4.0);

      setHandPoseRight("OPEN");
      setHandPoseLeft("REST_TABLE");
    }
  });

  return (
    <group ref={rootGroupRef} position={[0, 0, 0]}>
      {/* 1. Đôi chân và quần âu ống đứng tỷ lệ chuẩn người lớn (chiều dài chân 0.88m) */}
      {/* Chân trái: Ống quần dưới + khớp gối + bắp đùi */}
      <mesh position={[-0.11, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.054, 0.065, 0.44, 20]} />
        <meshStandardMaterial color="#0f172a" roughness={0.45} />
      </mesh>
      <mesh position={[-0.11, 0.44, 0]}>
        <sphereGeometry args={[0.056, 14, 14]} />
        <meshStandardMaterial color="#0f172a" roughness={0.45} />
      </mesh>
      <mesh position={[-0.11, 0.66, 0]} castShadow>
        <cylinderGeometry args={[0.068, 0.076, 0.44, 20]} />
        <meshStandardMaterial color="#0f172a" roughness={0.45} />
      </mesh>

      {/* Chân phải: Ống quần dưới + khớp gối + bắp đùi */}
      <mesh position={[0.11, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.054, 0.065, 0.44, 20]} />
        <meshStandardMaterial color="#0f172a" roughness={0.45} />
      </mesh>
      <mesh position={[0.11, 0.44, 0]}>
        <sphereGeometry args={[0.056, 14, 14]} />
        <meshStandardMaterial color="#0f172a" roughness={0.45} />
      </mesh>
      <mesh position={[0.11, 0.66, 0]} castShadow>
        <cylinderGeometry args={[0.068, 0.076, 0.44, 20]} />
        <meshStandardMaterial color="#0f172a" roughness={0.45} />
      </mesh>

      {/* Giày da tây Derby đen bóng sang trọng tỷ lệ bàn chân người lớn 26cm */}
      <mesh position={[-0.11, 0.025, 0.04]} castShadow>
        <boxGeometry args={[0.11, 0.05, 0.24]} />
        <meshStandardMaterial color="#020617" roughness={0.16} metalness={0.65} />
      </mesh>
      <mesh position={[0.11, 0.025, 0.04]} castShadow>
        <boxGeometry args={[0.11, 0.05, 0.24]} />
        <meshStandardMaterial color="#020617" roughness={0.16} metalness={0.65} />
      </mesh>

      {/* Thắt lưng da và cạp quần âu */}
      <mesh position={[0, 0.88, 0]} scale={[1.15, 1, 0.82]}>
        <cylinderGeometry args={[0.19, 0.18, 0.06, 24]} />
        <meshStandardMaterial color="#020617" roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.88, 0.14]}>
        <boxGeometry args={[0.045, 0.035, 0.015]} />
        <meshStandardMaterial color="#fef08a" metalness={0.95} roughness={0.1} />
      </mesh>

      {/* Upper Body group có khả năng xoay và nhoài người đẩy nón */}
      <group ref={upperBodyRef} position={[0, 0, 0]}>
        {/* 2. Thân áo vest comple nam form V-taper nở nang, thắt eo lịch lãm (Chiều cao thân 0.60m) */}
        {/* Thân áo eo thon */}
        <mesh position={[0, 1.05, 0]} castShadow scale={[1.12, 1, 0.80]}>
          <cylinderGeometry args={[0.20, 0.22, 0.30, 24]} />
          <meshStandardMaterial
            color={color || "#3b82f6"}
            roughness={0.32}
            metalness={0.20}
          />
        </mesh>

        {/* Khối ngực nở V-taper nam tính */}
        <mesh position={[0, 1.30, 0]} castShadow scale={[1.18, 1, 0.84]}>
          <cylinderGeometry args={[0.24, 0.20, 0.32, 24]} />
          <meshStandardMaterial
            color={color || "#3b82f6"}
            roughness={0.32}
            metalness={0.20}
          />
        </mesh>

        {/* Phom vai xuôi tự nhiên nam tính góc nghiêng 14° tỷ lệ chuẩn 0.44m */}
        <mesh position={[-0.13, 1.46, 0]} rotation={[0, 0, 0.24]}>
          <boxGeometry args={[0.15, 0.05, 0.20]} />
          <meshStandardMaterial color={color || "#3b82f6"} roughness={0.30} metalness={0.22} />
        </mesh>
        <mesh position={[0.13, 1.46, 0]} rotation={[0, 0, -0.24]}>
          <boxGeometry args={[0.15, 0.05, 0.20]} />
          <meshStandardMaterial color={color || "#3b82f6"} roughness={0.30} metalness={0.22} />
        </mesh>
        {/* Khối cầu chỏm vai deltoid 2 bên (span 0.44m) */}
        <mesh position={[-0.22, 1.43, 0]}>
          <sphereGeometry args={[0.052, 16, 16]} />
          <meshStandardMaterial color={color || "#3b82f6"} roughness={0.30} metalness={0.22} />
        </mesh>
        <mesh position={[0.22, 1.43, 0]}>
          <sphereGeometry args={[0.052, 16, 16]} />
          <meshStandardMaterial color={color || "#3b82f6"} roughness={0.30} metalness={0.22} />
        </mesh>

        {/* Ve áo vest chữ V (Notch Lapel) tinh xảo */}
        <mesh position={[-0.08, 1.30, 0.12]} rotation={[0, 0, -0.22]}>
          <boxGeometry args={[0.065, 0.40, 0.02]} />
          <meshStandardMaterial color={color || "#3b82f6"} roughness={0.25} metalness={0.3} />
        </mesh>
        <mesh position={[0.08, 1.30, 0.12]} rotation={[0, 0, 0.22]}>
          <boxGeometry args={[0.065, 0.40, 0.02]} />
          <meshStandardMaterial color={color || "#3b82f6"} roughness={0.25} metalness={0.3} />
        </mesh>

        {/* Khăn cài túi ngực áo vest (Pocket Square) trắng tinh khôi */}
        <mesh position={[-0.13, 1.38, 0.13]} rotation={[0, 0, 0.15]}>
          <boxGeometry args={[0.05, 0.03, 0.01]} />
          <meshStandardMaterial color="#ffffff" roughness={0.2} />
        </mesh>

        {/* Cúc áo suit kim loại vàng/bạc */}
        <mesh position={[0, 1.15, 0.13]}>
          <cylinderGeometry args={[0.009, 0.009, 0.008, 12]} />
          <meshStandardMaterial color="#fef08a" metalness={0.95} roughness={0.1} />
        </mesh>
        <mesh position={[0, 1.05, 0.13]}>
          <cylinderGeometry args={[0.009, 0.009, 0.008, 12]} />
          <meshStandardMaterial color="#fef08a" metalness={0.95} roughness={0.1} />
        </mesh>

        {/* Trụ cổ liên kết thân người và đầu (Sculpted Neck Column) */}
        <mesh position={[0, 1.54, 0.01]}>
          <cylinderGeometry args={[0.052, 0.062, 0.10, 18]} />
          <meshStandardMaterial color="#fed7aa" roughness={0.55} />
        </mesh>

        {/* 3. Cổ áo sơ mi trắng & Cà vạt thắt nút Windsor */}
        <mesh position={[0, 1.50, 0.02]}>
          <cylinderGeometry args={[0.080, 0.095, 0.07, 20]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.18} />
        </mesh>
        {/* Cà vạt sang trọng */}
        <mesh position={[0, 1.32, 0.13]}>
          <boxGeometry args={[0.045, 0.28, 0.016]} />
          <meshStandardMaterial color="#0f172a" roughness={0.3} />
        </mesh>
        {/* Kẹp cà vạt vàng kim (Tie clip) */}
        <mesh position={[0, 1.31, 0.14]}>
          <boxGeometry args={[0.040, 0.007, 0.008]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.95} roughness={0.08} />
        </mesh>

        {/* 4. Đầu người 3D chân thực tỷ lệ giải phẫu người lớn (gắn ở Y = 1.62m, đỉnh đầu đạt 1.80m) */}
        <RealisticHumanHead
          hairColor="#1e293b"
          skinColor="#fed7aa"
          gender="male"
          isTurn={isTurn}
          isSpinning={isSpinning}
          position={[0, 1.62, 0]}
        />

        {/* 5. Cánh tay trái tì bệ làm điểm tựa (Khớp vai Y = 1.42m, tầm vươn dài 0.70m) */}
        <group ref={leftArmRef} position={[-0.22, 1.42, 0.03]} rotation={[0.45, 0, 0.18]}>
          {/* Khớp vai */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.055, 14, 14]} />
            <meshStandardMaterial color={color || "#3b82f6"} roughness={0.32} metalness={0.20} />
          </mesh>
          {/* Bắp tay áo vest */}
          <mesh position={[0, -0.17, 0]}>
            <cylinderGeometry args={[0.052, 0.058, 0.34, 16]} />
            <meshStandardMaterial color={color || "#3b82f6"} roughness={0.32} metalness={0.20} />
          </mesh>
          {/* Khớp khuỷu tay */}
          <mesh position={[0, -0.34, 0]}>
            <sphereGeometry args={[0.050, 14, 14]} />
            <meshStandardMaterial color={color || "#3b82f6"} roughness={0.32} metalness={0.20} />
          </mesh>
          {/* Cẳng tay áo vest */}
          <mesh position={[0, -0.49, 0]}>
            <cylinderGeometry args={[0.046, 0.050, 0.30, 16]} />
            <meshStandardMaterial color={color || "#3b82f6"} roughness={0.32} metalness={0.20} />
          </mesh>
          {/* Cổ tay áo sơ mi trắng thò ra 1.5cm */}
          <mesh position={[0, -0.65, 0]}>
            <cylinderGeometry args={[0.042, 0.046, 0.035, 14]} />
            <meshStandardMaterial color="#ffffff" roughness={0.2} />
          </mesh>
          {/* Bàn tay 5 ngón trái */}
          <group position={[0, -0.68, 0]} rotation={[0.2, 0, 0]}>
            <RealisticArticulatedHand skinColor="#fed7aa" side="left" pose={handPoseLeft} />
          </group>
        </group>

        {/* 6. Cánh tay phải có khớp xoay vung dồn lực đẩy nón (tầm vươn dài 0.70m nắm chốt kim loại) */}
        <group ref={rightArmRef} position={[0.22, 1.42, 0.03]} rotation={[0.45, 0, -0.18]}>
          {/* Khớp vai */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.055, 14, 14]} />
            <meshStandardMaterial color={color || "#3b82f6"} roughness={0.32} metalness={0.20} />
          </mesh>
          {/* Bắp tay áo vest */}
          <mesh position={[0, -0.17, 0]}>
            <cylinderGeometry args={[0.052, 0.058, 0.34, 16]} />
            <meshStandardMaterial color={color || "#3b82f6"} roughness={0.32} metalness={0.20} />
          </mesh>
          {/* Khớp khuỷu tay */}
          <mesh position={[0, -0.34, 0]}>
            <sphereGeometry args={[0.050, 14, 14]} />
            <meshStandardMaterial color={color || "#3b82f6"} roughness={0.32} metalness={0.20} />
          </mesh>
          {/* Cẳng tay áo vest */}
          <mesh position={[0, -0.49, 0]}>
            <cylinderGeometry args={[0.046, 0.050, 0.30, 16]} />
            <meshStandardMaterial color={color || "#3b82f6"} roughness={0.32} metalness={0.20} />
          </mesh>
          {/* Cổ tay áo sơ mi trắng thò ra 1.5cm */}
          <mesh position={[0, -0.65, 0]}>
            <cylinderGeometry args={[0.042, 0.046, 0.035, 14]} />
            <meshStandardMaterial color="#ffffff" roughness={0.2} />
          </mesh>
          {/* Bàn tay 5 ngón phải vươn nắm chốt nón */}
          <group position={[0, -0.68, 0]} rotation={[0.2, 0, 0]}>
            <RealisticArticulatedHand skinColor="#fed7aa" side="right" pose={handPoseRight} />
          </group>
        </group>
      </group>
    </group>
  );
}

// Giữ alias tương thích
const StylizedMannequin = RealisticContestantMannequin;

/** 3D Realistic MC / Host Figure (MC lịch lãm mặc tuxedo đen hoàng gia, sơ mi trắng, nơ đỏ, tay cầm micro studio và cue card) */
function RealisticHostMC() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      const t = Date.now() / 1000;
      // MC thở nhẹ tự nhiên & quay người duyên dáng
      groupRef.current.position.y = Math.sin(t * 1.8) * 0.006;
      groupRef.current.rotation.y = Math.sin(t * 1.2) * 0.04;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* 1. Đôi chân và quần âu đen tỷ lệ chuẩn người lớn (chiều dài chân 0.88m) */}
      {/* Chân trái: Ống quần dưới + khớp gối + bắp đùi */}
      <mesh position={[-0.11, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.054, 0.065, 0.44, 20]} />
        <meshStandardMaterial color="#020617" roughness={0.35} />
      </mesh>
      <mesh position={[-0.11, 0.44, 0]}>
        <sphereGeometry args={[0.056, 14, 14]} />
        <meshStandardMaterial color="#020617" roughness={0.35} />
      </mesh>
      <mesh position={[-0.11, 0.66, 0]} castShadow>
        <cylinderGeometry args={[0.068, 0.076, 0.44, 20]} />
        <meshStandardMaterial color="#020617" roughness={0.35} />
      </mesh>

      {/* Chân phải: Ống quần dưới + khớp gối + bắp đùi */}
      <mesh position={[0.11, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.054, 0.065, 0.44, 20]} />
        <meshStandardMaterial color="#020617" roughness={0.35} />
      </mesh>
      <mesh position={[0.11, 0.44, 0]}>
        <sphereGeometry args={[0.056, 14, 14]} />
        <meshStandardMaterial color="#020617" roughness={0.35} />
      </mesh>
      <mesh position={[0.11, 0.66, 0]} castShadow>
        <cylinderGeometry args={[0.068, 0.076, 0.44, 20]} />
        <meshStandardMaterial color="#020617" roughness={0.35} />
      </mesh>

      {/* Giày da đen bóng loáng tỷ lệ người lớn 26cm */}
      <mesh position={[-0.11, 0.025, 0.04]} castShadow>
        <boxGeometry args={[0.11, 0.05, 0.24]} />
        <meshStandardMaterial color="#000000" roughness={0.12} metalness={0.75} />
      </mesh>
      <mesh position={[0.11, 0.025, 0.04]} castShadow>
        <boxGeometry args={[0.11, 0.05, 0.24]} />
        <meshStandardMaterial color="#000000" roughness={0.12} metalness={0.75} />
      </mesh>

      {/* Dải thắt lưng satin đen của Tuxedo */}
      <mesh position={[0, 0.88, 0]} scale={[1.15, 1, 0.82]}>
        <cylinderGeometry args={[0.19, 0.18, 0.06, 24]} />
        <meshStandardMaterial color="#000000" roughness={0.15} metalness={0.5} />
      </mesh>

      {/* 2. Thân áo vest đen tuxedo hoàng gia trang trọng của MC form V-taper (Chiều cao thân 0.60m) */}
      {/* Thân áo eo thon */}
      <mesh position={[0, 1.05, 0]} castShadow scale={[1.12, 1, 0.80]}>
        <cylinderGeometry args={[0.20, 0.22, 0.30, 24]} />
        <meshStandardMaterial color="#090d16" roughness={0.28} metalness={0.22} />
      </mesh>

      {/* Khối ngực nở V-taper */}
      <mesh position={[0, 1.30, 0]} castShadow scale={[1.18, 1, 0.84]}>
        <cylinderGeometry args={[0.24, 0.20, 0.32, 24]} />
        <meshStandardMaterial color="#090d16" roughness={0.28} metalness={0.22} />
      </mesh>

      {/* Phom vai xuôi tự nhiên nam tính góc nghiêng 14° tỷ lệ chuẩn 0.44m của Tuxedo */}
      <mesh position={[-0.13, 1.46, 0]} rotation={[0, 0, 0.24]}>
        <boxGeometry args={[0.15, 0.05, 0.20]} />
        <meshStandardMaterial color="#090d16" roughness={0.28} metalness={0.22} />
      </mesh>
      <mesh position={[0.13, 1.46, 0]} rotation={[0, 0, -0.24]}>
        <boxGeometry args={[0.15, 0.05, 0.20]} />
        <meshStandardMaterial color="#090d16" roughness={0.28} metalness={0.22} />
      </mesh>
      {/* Khối cầu chỏm vai deltoid 2 bên (span 0.44m) */}
      <mesh position={[-0.22, 1.43, 0]}>
        <sphereGeometry args={[0.052, 16, 16]} />
        <meshStandardMaterial color="#090d16" roughness={0.28} metalness={0.22} />
      </mesh>
      <mesh position={[0.22, 1.43, 0]}>
        <sphereGeometry args={[0.052, 16, 16]} />
        <meshStandardMaterial color="#090d16" roughness={0.28} metalness={0.22} />
      </mesh>

      {/* Ve áo vest lụa đen satin bóng (Shawl Lapel) */}
      <mesh position={[0, 1.30, 0.12]}>
        <boxGeometry args={[0.20, 0.42, 0.02]} />
        <meshStandardMaterial color="#020617" roughness={0.12} metalness={0.5} />
      </mesh>

      {/* Trụ cổ liên kết thân người và đầu MC (Sculpted Neck Column) */}
      <mesh position={[0, 1.54, 0.01]}>
        <cylinderGeometry args={[0.052, 0.062, 0.10, 18]} />
        <meshStandardMaterial color="#ffedd5" roughness={0.55} />
      </mesh>

      {/* 3. Cổ áo sơ mi trắng & Nơ cổ màu đỏ ruby sang trọng */}
      <mesh position={[0, 1.50, 0.02]}>
        <cylinderGeometry args={[0.080, 0.095, 0.07, 20]} />
        <meshStandardMaterial color="#ffffff" roughness={0.15} />
      </mesh>
      {/* Nơ bướm màu đỏ ruby quý phái */}
      <mesh position={[0, 1.46, 0.13]}>
        <boxGeometry args={[0.11, 0.05, 0.024]} />
        <meshStandardMaterial color="#dc2626" emissive="#991b1b" emissiveIntensity={0.6} roughness={0.25} />
      </mesh>

      {/* 4. Đầu MC 3D Realistic với ngũ quan và tóc chải sáp (gắn ở Y = 1.62m, đỉnh đầu đạt 1.80m) */}
      <RealisticHumanHead
        hairColor="#0f172a"
        skinColor="#ffedd5"
        gender="male"
        isHost={true}
        position={[0, 1.62, 0]}
      />

      {/* 5. Cánh tay trái MC: cầm thẻ kịch bản dẫn chương trình (Cue Card) với khuỷu tay cong */}
      <group position={[-0.22, 1.42, 0.03]} rotation={[0.55, 0, 0.22]}>
        <mesh position={[0, -0.17, 0]}>
          <cylinderGeometry args={[0.052, 0.058, 0.34, 16]} />
          <meshStandardMaterial color="#090d16" roughness={0.28} metalness={0.22} />
        </mesh>
        <mesh position={[0, -0.34, 0]}>
          <sphereGeometry args={[0.050, 14, 14]} />
          <meshStandardMaterial color="#090d16" roughness={0.28} metalness={0.22} />
        </mesh>
        <mesh position={[0, -0.49, 0]}>
          <cylinderGeometry args={[0.046, 0.050, 0.30, 16]} />
          <meshStandardMaterial color="#090d16" roughness={0.28} metalness={0.22} />
        </mesh>
        {/* Cổ tay áo sơ mi trắng */}
        <mesh position={[0, -0.65, 0]}>
          <cylinderGeometry args={[0.042, 0.046, 0.035, 14]} />
          <meshStandardMaterial color="#ffffff" roughness={0.2} />
        </mesh>
        <group position={[0, -0.68, 0]} rotation={[0.2, 0, 0]}>
          <RealisticArticulatedHand skinColor="#ffedd5" side="left" pose="HOLD_MIC" />
          {/* Thẻ dẫn chương trình màu vàng gold trên tay */}
          <mesh position={[-0.04, -0.04, 0.08]} rotation={[0.4, 0.2, -0.1]}>
            <boxGeometry args={[0.20, 0.28, 0.008]} />
            <meshStandardMaterial color="#fef08a" emissive="#eab308" emissiveIntensity={0.4} metalness={0.5} roughness={0.2} />
          </mesh>
        </group>
      </group>

      {/* 6. Cánh tay phải MC: cầm micro truyền hình chuyên nghiệp với khuỷu tay cong */}
      <group position={[0.22, 1.42, 0.03]} rotation={[0.62, 0, -0.28]}>
        <mesh position={[0, -0.17, 0]}>
          <cylinderGeometry args={[0.052, 0.058, 0.34, 16]} />
          <meshStandardMaterial color="#090d16" roughness={0.28} metalness={0.22} />
        </mesh>
        <mesh position={[0, -0.34, 0]}>
          <sphereGeometry args={[0.050, 14, 14]} />
          <meshStandardMaterial color="#090d16" roughness={0.28} metalness={0.22} />
        </mesh>
        <mesh position={[0, -0.49, 0]}>
          <cylinderGeometry args={[0.046, 0.050, 0.30, 16]} />
          <meshStandardMaterial color="#090d16" roughness={0.28} metalness={0.22} />
        </mesh>
        {/* Cổ tay áo sơ mi trắng */}
        <mesh position={[0, -0.65, 0]}>
          <cylinderGeometry args={[0.042, 0.046, 0.035, 14]} />
          <meshStandardMaterial color="#ffffff" roughness={0.2} />
        </mesh>
        <group position={[0, -0.68, 0]} rotation={[0.4, 0, -0.2]}>
          <RealisticArticulatedHand skinColor="#ffedd5" side="right" pose="HOLD_MIC" />
          {/* Micro truyền hình bọc mút và vành mạ vàng */}
          <group position={[0.01, -0.05, 0.02]} rotation={[0.2, 0, 0]}>
            {/* Thân micro kim loại đen */}
            <mesh position={[0, 0, 0]}>
              <cylinderGeometry args={[0.015, 0.013, 0.18, 14]} />
              <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.2} />
            </mesh>
            {/* Vành mạ vàng kim */}
            <mesh position={[0, 0.08, 0]}>
              <cylinderGeometry args={[0.018, 0.018, 0.01, 14]} />
              <meshStandardMaterial color="#fbbf24" metalness={0.95} roughness={0.08} emissive="#d97706" emissiveIntensity={0.4} />
            </mesh>
            {/* Đầu micro bọc mút đen / lưới kim loại */}
            <mesh position={[0, 0.12, 0]}>
              <sphereGeometry args={[0.026, 14, 14]} />
              <meshStandardMaterial color="#334155" metalness={0.65} roughness={0.35} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

// Giữ alias tương thích
const StylizedHostMannequin = RealisticHostMC;

/** Bục đứng riêng biệt cho MC (Host Podium & Lectern) đặt bên trái các thí sinh theo góc nhìn khán giả */
function DedicatedMcStation() {
  // MC đứng riêng tại mạn trái camera (-X), ngay bên trái bục thí sinh số 1, góc theta ~ -30°
  const RADIUS_MC = 3.30;
  const thetaRad = THREE.MathUtils.degToRad(-30);
  const posX = Math.sin(thetaRad) * RADIUS_MC; // ~ -1.65m
  const posZ = -Math.cos(thetaRad) * RADIUS_MC; // ~ -2.86m
  // Xoay mặt hướng về tâm vòng quay và bao quát toàn bộ trường quay
  const rotY = -thetaRad + 0.35;

  return (
    <group position={[posX, -0.75, posZ]} rotation={[0, rotY, 0]}>
      {/* 1. Trụ bục đứng hình trụ đa tầng cao cấp của MC (sàn cao Y = +1.35m) */}
      <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.58, 0.64, 2.10, 32]} />
        <meshStandardMaterial color="#0b1a36" metalness={0.90} roughness={0.16} />
      </mesh>

      {/* Mặt sàn đứng bục MC */}
      <mesh position={[0, 2.10, 0]} receiveShadow>
        <cylinderGeometry args={[0.60, 0.60, 0.04, 32]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.94} roughness={0.08} />
      </mesh>

      {/* Dải đèn LED vàng hoàng kim viền quanh sàn bục MC */}
      <mesh position={[0, 2.11, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.56, 0.60, 32]} />
        <meshStandardMaterial
          color="#fde047"
          emissive="#f59e0b"
          emissiveIntensity={1.5}
          metalness={0.9}
        />
      </mesh>

      {/* 2. Bục điều khiển phát biểu (Lectern / Desk) riêng của MC */}
      <group position={[0, 2.10, 0.32]}>
        {/* Thân bục hình trụ vát cạnh */}
        <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.20, 0.26, 0.76, 24]} />
          <meshStandardMaterial color="#0f2142" metalness={0.88} roughness={0.15} />
        </mesh>

        {/* Mặt bàn bục nghiêng đón mắt MC */}
        <mesh position={[0, 0.76, 0]} rotation={[-0.26, 0, 0]} receiveShadow>
          <boxGeometry args={[0.52, 0.03, 0.36]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.06} />
        </mesh>

        {/* Thẻ kịch bản dẫn chương trình (Cue Card) đặt trên bàn bục */}
        <mesh position={[0, 0.78, 0]} rotation={[-0.26, 0, 0]}>
          <boxGeometry args={[0.30, 0.008, 0.20]} />
          <meshStandardMaterial color="#fef9c3" roughness={0.3} />
        </mesh>

        {/* Micro cổ ngỗng truyền hình mạ chrome */}
        <group position={[0.16, 0.78, -0.06]}>
          <mesh position={[0, 0.08, 0]} rotation={[0.22, 0, -0.15]}>
            <cylinderGeometry args={[0.005, 0.005, 0.16, 12]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.98} roughness={0.04} />
          </mesh>
          <mesh position={[-0.02, 0.17, 0.04]}>
            <sphereGeometry args={[0.016, 12, 12]} />
            <meshStandardMaterial color="#1e293b" roughness={0.5} />
          </mesh>
        </group>

        {/* Biển hiệu "MC" LED phát sáng mặt trước bục */}
        <mesh position={[0, 0.42, 0.22]} rotation={[-0.10, 0, 0]}>
          <boxGeometry args={[0.28, 0.16, 0.02]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#d97706"
            emissiveIntensity={1.3}
            metalness={0.92}
            roughness={0.08}
          />
        </mesh>
      </group>

      {/* 3. Hình nhân MC 3D lịch lãm đứng sau bàn bục */}
      <group position={[0, 2.10, -0.10]}>
        <StylizedHostMannequin />
      </group>

      {/* 4. Đèn chiếu sáng riêng biệt cho MC (Dedicated MC Studio Spotlight) */}
      <pointLight position={[0, 3.85, 0.25]} color="#fffbeb" intensity={4.5} distance={4.0} />
    </group>
  );
}

/** Trạm thi đấu trên bục kê cao phía sau vòng quay chuẩn VTV3 (Elevated Contestant Station) */
function ElevatedSlotStation({
  team,
  roundScore,
  totalScore,
  rank,
  isTurn,
  posX,
  posZ,
  rotY,
  edition,
  isSpinning,
}: {
  team: TeamState;
  roundScore: number;
  totalScore: number;
  rank: number;
  isTurn: boolean;
  posX: number;
  posZ: number;
  rotY: number;
  edition: string;
  isSpinning?: boolean;
}) {
  const screenRef = useRef<THREE.Mesh>(null);

  // Podium screen texture
  const screenTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = generatePodiumTexture(
      team.name,
      totalScore,
      roundScore,
      team.color || "#6366f1",
      isTurn,
      edition,
      rank
    );
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.name, totalScore, roundScore, team.color, isTurn, edition, rank]);

  return (
    <group position={[posX, -0.75, posZ]} rotation={[0, rotY, 0]}>
      {/* 1. Khối đế bục nâng cao cho thí sinh đứng (Riser Platform: sàn đứng cao Y = +1.35m so với thế giới) */}
      <mesh position={[0, 1.05, -0.17]} castShadow receiveShadow>
        <boxGeometry args={[0.84, 2.10, 1.05]} />
        <meshStandardMaterial
          color="#0b1a36"
          metalness={0.88}
          roughness={0.18}
          emissive="#061024"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Mặt sàn đứng bục thí sinh (Standing Deck Floor) */}
      <mesh position={[0, 2.10, -0.17]} receiveShadow>
        <boxGeometry args={[0.86, 0.04, 1.05]} />
        <meshStandardMaterial
          color="#cbd5e1"
          metalness={0.92}
          roughness={0.12}
        />
      </mesh>

      {/* 2. Bàn để tay cho thí sinh gắn trên bục (Contestant Handrail & Desk Countertop) */}
      {/* Thân bàn */}
      <mesh position={[0, 2.45, 0.22]} castShadow receiveShadow>
        <boxGeometry args={[0.84, 0.70, 0.36]} />
        <meshStandardMaterial
          color="#0f2142"
          metalness={0.85}
          roughness={0.16}
        />
      </mesh>

      {/* Mặt bàn để tay hợp kim bạc sang trọng */}
      <mesh position={[0, 2.80, 0.22]} receiveShadow>
        <boxGeometry args={[0.88, 0.04, 0.40]} />
        <meshStandardMaterial
          color="#e2e8f0"
          metalness={0.94}
          roughness={0.08}
        />
      </mesh>

      {/* Dải LED viền phát quang mép bàn theo màu đội */}
      <mesh position={[0, 2.78, 0.42]}>
        <boxGeometry args={[0.86, 0.02, 0.02]} />
        <meshStandardMaterial
          color={team.color || "#6366f1"}
          emissive={team.color || "#6366f1"}
          emissiveIntensity={isTurn ? 2.2 : 0.8}
        />
      </mesh>

      {/* 3. Bảng hiện điểm LED kỹ thuật số gắn trực diện mặt trước bàn (Front Fascia Scoreboard) - KÍCH THƯỚC NỔI BẬT, CAO HƠN VÀNH NÓN */}
      <group position={[0, 2.58, 0.44]} rotation={[0, 0, 0]}>
        {/* Khung màn hình mạ vàng/xanh neon */}
        <mesh position={[0, 0, -0.01]}>
          <boxGeometry args={[0.80, 0.46, 0.03]} />
          <meshStandardMaterial
            color={isTurn ? "#fbbf24" : "#3b82f6"}
            metalness={0.92}
            roughness={0.08}
            emissive={isTurn ? "#d97706" : "#1e3a5f"}
            emissiveIntensity={isTurn ? 0.95 : 0.25}
          />
        </mesh>
        {/* Màn hình LED sắc nét chuẩn VTV3 (Hiển thị chân thực như màn hình phát sáng tự thân OLED phẳng 1024x512) */}
        <mesh ref={screenRef} position={[0, 0, 0.02]}>
          <planeGeometry args={[0.76, 0.42]} />
          <meshBasicMaterial map={screenTexture ?? undefined} toneMapped={false} />
        </mesh>
      </group>

      {/* 4. Chuông bấm cho vòng đoán nhanh (Toss-Up Mechanical Buzzer Bell) trên mặt bàn */}
      <group position={[0, 2.82, 0.24]}>
        {/* Chân đế chuông mạ chrome */}
        <mesh position={[0, 0.015, 0]}>
          <cylinderGeometry args={[0.055, 0.07, 0.03, 16]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.96} roughness={0.05} />
        </mesh>
        {/* Nắp chuông vòm vàng hoàng kim bóng loáng */}
        <mesh position={[0, 0.05, 0]}>
          <sphereGeometry args={[0.05, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#d97706"
            emissiveIntensity={0.65}
            metalness={0.96}
            roughness={0.05}
          />
        </mesh>
        {/* Nút bấm đỏ trên đỉnh chuông */}
        <mesh position={[0, 0.085, 0]}>
          <cylinderGeometry args={[0.014, 0.014, 0.02, 12]} />
          <meshStandardMaterial color="#ef4444" roughness={0.2} />
        </mesh>
      </group>

      {/* 5. Hình nhân 3D cách điệu (Stylized Mannequin) đứng trên bục sau bàn thi đấu */}
      <group position={[0, 2.10, -0.22]}>
        <StylizedMannequin
          color={team.color || "#3b82f6"}
          isTurn={isTurn}
          isSpinning={isSpinning}
        />
      </group>

      {/* 6. Spotlight chiếu sáng riêng khi đội đến lượt quay */}
      {isTurn && (
        <pointLight position={[0, 3.85, 0.15]} color="#fef08a" intensity={4.5} distance={3.8} decay={1.8} />
      )}
    </group>
  );
}

/** Bục thí sinh bán nguyệt nâng cao phía sau vòng quay chuẩn VTV3 (Elevated Contestant Dais Behind Wheel) */
function ElevatedContestantDaisBehindWheel({
  teams,
  roundScores,
  currentTurnTeamId,
  tossUpBuzzedTeamId,
  isTossUpRound,
  phase,
  edition,
  effectiveIsSpinning,
}: {
  teams: TeamState[];
  roundScores?: Record<string, number>;
  currentTurnTeamId?: string;
  tossUpBuzzedTeamId?: string;
  isTossUpRound?: boolean;
  phase?: string;
  edition: string;
  effectiveIsSpinning?: boolean;
}) {
  const N = teams.length;
  if (N === 0) return null;

  // Tính thứ hạng xếp hạng của các đội dựa trên tổng điểm
  const sortedTeamIds = useMemo(() => {
    return [...teams]
      .sort((a, b) => {
        const scoreA = (a.score || 0) + (roundScores?.[a.id] || 0);
        const scoreB = (b.score || 0) + (roundScores?.[b.id] || 0);
        return scoreB - scoreA;
      })
      .map((t) => t.id);
  }, [teams, roundScores]);

  // Phân bố góc quét đồng tâm hình tròn bán kính RADIUS_DAIS:
  // Tâm vòng quay: (0, 0). Bán kính bục: 3.35m (kê cao thoáng đãng sau vành nón 2.12m).
  // Góc theta: 0 là chính Bắc (ngay sau nón).
  // -theta: lệch trái camera (mạn 9h). MC đứng riêng tại theta ~ -30°.
  // +theta: lệch phải camera (mạn 3h).
  // Thí sinh xếp đối xứng chính giữa từ minAngleDeg = -10° sang phải chuẩn VTV3 Chiếc Nón Kỳ Diệu.
  const RADIUS_DAIS = 3.35;
  const minAngleDeg = N <= 3 ? -10 : -12;
  const maxAngleDeg = N <= 3 ? 28 : Math.min(68, 28 + (N - 3) * 12);
  const angleStepDeg = N > 1 ? (maxAngleDeg - minAngleDeg) / (N - 1) : 0;

  return (
    <group>
      {/* 1. Các trạm bục kê cao và hình nhân 3D từng đội phía sau nón */}
      {teams.map((team, i) => {
        const thetaDeg = minAngleDeg + i * angleStepDeg;
        const thetaRad = THREE.MathUtils.degToRad(thetaDeg);
        // Tọa độ đồng tâm hình tròn tuyệt đối
        const posX = Math.sin(thetaRad) * RADIUS_DAIS;
        const posZ = -Math.cos(thetaRad) * RADIUS_DAIS;
        // Quay mặt hướng về tâm vòng quay (0, 0) và hướng về camera (+Z)
        const rotY = -thetaRad;

        const rScore = roundScores?.[team.id] || 0;
        const totalScore = (team.score || 0) + rScore;
        const rank = sortedTeamIds.indexOf(team.id) + 1;
        const isTurn = isTossUpRound
          ? phase === "TOSS_UP_BUZZED" && Boolean(tossUpBuzzedTeamId) && team.id === tossUpBuzzedTeamId
          : team.id === currentTurnTeamId;

        return (
          <ElevatedSlotStation
            key={team.id}
            team={team}
            roundScore={rScore}
            totalScore={totalScore}
            rank={rank}
            isTurn={isTurn}
            posX={posX}
            posZ={posZ}
            rotY={rotY}
            edition={edition}
            isSpinning={effectiveIsSpinning}
          />
        );
      })}

      {/* 2. Cầu nối bục cong liền khối giữa các trạm liền kề (Continuous Curved Dais Bridges) */}
      {N > 1 && teams.slice(0, N - 1).map((_, i) => {
        const angle1 = minAngleDeg + i * angleStepDeg;
        const angle2 = minAngleDeg + (i + 1) * angleStepDeg;
        const midAngleDeg = (angle1 + angle2) / 2;
        const midAngleRad = THREE.MathUtils.degToRad(midAngleDeg);
        const bridgeX = Math.sin(midAngleRad) * RADIUS_DAIS;
        const bridgeZ = -Math.cos(midAngleRad) * RADIUS_DAIS;
        const bridgeRotY = -midAngleRad;

        // Bề rộng cầu nối theo dây cung hình tròn (vừa khít khoảng trống giữa các bàn 0.84m)
        const arcChordLen = 2 * RADIUS_DAIS * Math.sin(THREE.MathUtils.degToRad(angleStepDeg / 2));
        const bridgeWidth = Math.max(0.12, arcChordLen - 0.84);

        return (
          <group key={`bridge-${i}`} position={[bridgeX, -0.75, bridgeZ]} rotation={[0, bridgeRotY, 0]}>
            {/* Khối đế bục nâng cao liền mạch */}
            <mesh position={[0, 1.05, -0.17]} receiveShadow>
              <boxGeometry args={[bridgeWidth, 2.10, 1.05]} />
              <meshStandardMaterial color="#0c1e3d" metalness={0.88} roughness={0.18} />
            </mesh>
            {/* Mặt sàn đứng cầu nối cao Y = +1.35m */}
            <mesh position={[0, 2.10, -0.17]} receiveShadow>
              <boxGeometry args={[bridgeWidth, 0.04, 1.05]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.92} roughness={0.12} />
            </mesh>
            {/* Thân bàn để tay cầu nối cao Y = +1.70m */}
            <mesh position={[0, 2.45, 0.22]} receiveShadow>
              <boxGeometry args={[bridgeWidth, 0.70, 0.36]} />
              <meshStandardMaterial color="#0f2142" metalness={0.85} roughness={0.16} />
            </mesh>
            {/* Mặt bàn để tay cầu nối cao Y = +2.05m */}
            <mesh position={[0, 2.80, 0.22]} receiveShadow>
              <boxGeometry args={[bridgeWidth, 0.04, 0.40]} />
              <meshStandardMaterial color="#e2e8f0" metalness={0.94} roughness={0.08} />
            </mesh>
            {/* Dải LED viền mép bàn */}
            <mesh position={[0, 2.78, 0.42]}>
              <boxGeometry args={[bridgeWidth, 0.02, 0.02]} />
              <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={1.2} />
            </mesh>
          </group>
        );
      })}

    </group>
  );
}

/** Texture Cache cho các ô chữ và ô hộp xoay */
const studioTextureCache = new Map<string, THREE.CanvasTexture>();

function getLetterTileTexture(char: string): THREE.CanvasTexture {
  const key = `tile_${char}`;
  if (studioTextureCache.has(key)) return studioTextureCache.get(key)!;
  if (typeof document === "undefined") return new THREE.Texture() as unknown as THREE.CanvasTexture;

  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 220;
  const ctx = canvas.getContext("2d")!;

  // Nền trắng sứ bóng đẹp
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 160, 220);

  // Viền khung đen mỏng tinh tế
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 152, 212);

  // Chữ cái màu đen đậm
  ctx.fillStyle = "#0f172a";
  ctx.font = '900 130px "Roboto Slab", "Merriweather", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(char, 80, 115);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  studioTextureCache.set(key, texture);
  return texture;
}

function getClosedTileTexture(): THREE.CanvasTexture {
  const key = "tile_closed";
  if (studioTextureCache.has(key)) return studioTextureCache.get(key)!;
  if (typeof document === "undefined") return new THREE.Texture() as unknown as THREE.CanvasTexture;

  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 220;
  const ctx = canvas.getContext("2d")!;

  // Nền xanh ngọc bích truyền hình VTV3
  ctx.fillStyle = "#15803d";
  ctx.fillRect(0, 0, 160, 220);

  // Viền vàng kim
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 152, 212);

  // Ngôi sao vàng 4 cánh ở tâm
  ctx.fillStyle = "#fde047";
  ctx.beginPath();
  const cx = 80, cy = 110, rOuter = 30, rInner = 10;
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4 - Math.PI / 2;
    const r = i % 2 === 0 ? rOuter : rInner;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  studioTextureCache.set(key, texture);
  return texture;
}

function getBlankWhiteTileTexture(): THREE.CanvasTexture {
  const key = "tile_blank_white";
  if (studioTextureCache.has(key)) return studioTextureCache.get(key)!;
  if (typeof document === "undefined") return new THREE.Texture() as unknown as THREE.CanvasTexture;

  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 220;
  const ctx = canvas.getContext("2d")!;

  // Nền trắng sứ bóng đẹp sẵn sàng cho câu đố VTV3
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 160, 220);

  // Viền vàng kim tinh tế
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 154, 214);
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 6, 148, 208);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  studioTextureCache.set(key, texture);
  return texture;
}

function getHighlightTileTexture(): THREE.CanvasTexture {
  const key = "tile_highlight_green";
  if (studioTextureCache.has(key)) return studioTextureCache.get(key)!;
  if (typeof document === "undefined") return new THREE.Texture() as unknown as THREE.CanvasTexture;

  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 220;
  const ctx = canvas.getContext("2d")!;

  // Nền xanh lá cây phát sáng rực rỡ (Highlight VTV3 khi đoán trúng)
  const grad = ctx.createRadialGradient(80, 110, 10, 80, 110, 100);
  grad.addColorStop(0, "#4ade80");
  grad.addColorStop(0.6, "#16a34a");
  grad.addColorStop(1, "#14532d");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 160, 220);

  // Viền vàng neon phát sáng rực rỡ
  ctx.strokeStyle = "#fef08a";
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 152, 212);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  studioTextureCache.set(key, texture);
  return texture;
}

function getSpinningCubeTexture(text: string, bgColor: string, textColor = "#ffffff"): THREE.CanvasTexture {
  const key = `cube_${text}_${bgColor}`;
  if (studioTextureCache.has(key)) return studioTextureCache.get(key)!;
  if (typeof document === "undefined") return new THREE.Texture() as unknown as THREE.CanvasTexture;

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  const grad = ctx.createLinearGradient(0, 0, 256, 256);
  grad.addColorStop(0, bgColor);
  grad.addColorStop(1, "#020617");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 246, 246);

  ctx.fillStyle = textColor;
  ctx.font = text.length > 5 ? '900 40px "Roboto Slab", sans-serif' : text.length > 3 ? '900 64px "Roboto Slab", sans-serif' : '900 120px "Roboto Slab", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  studioTextureCache.set(key, texture);
  return texture;
}

interface FormattedTile {
  char: string;
  isLetter: boolean;
  origIdx: number;
}

function formatPhraseTo4x14(phrase?: string): FormattedTile[][] {
  const grid: FormattedTile[][] = Array.from({ length: 4 }, () =>
    Array.from({ length: 14 }, () => ({ char: "", isLetter: false, origIdx: -1 }))
  );
  if (!phrase) return grid;

  const words = phrase.toUpperCase().split(" ");
  const rows: FormattedTile[][] = [];
  let currentRow: FormattedTile[] = [];
  let currentLen = 0;
  let charIdx = 0;

  words.forEach((word) => {
    const wordChars: FormattedTile[] = word.split("").map((c) => ({
      char: c,
      isLetter: /[A-ZÀ-Ỹ]/i.test(c),
      origIdx: charIdx++,
    }));
    charIdx++; // include space index

    if (currentLen + (currentLen > 0 ? 1 : 0) + wordChars.length <= 14) {
      if (currentLen > 0) {
        currentRow.push({ char: " ", isLetter: false, origIdx: -1 });
        currentLen++;
      }
      currentRow.push(...wordChars);
      currentLen += wordChars.length;
    } else {
      if (currentRow.length > 0) rows.push(currentRow);
      currentRow = [...wordChars];
      currentLen = wordChars.length;
    }
  });
  if (currentRow.length > 0) rows.push(currentRow);

  const startRow = Math.max(0, Math.floor((4 - rows.length) / 2));
  rows.slice(0, 4).forEach((rowChars, r) => {
    const targetRow = startRow + r;
    if (targetRow >= 4) return;
    const startCol = Math.max(0, Math.floor((14 - rowChars.length) / 2));
    rowChars.forEach((ch, c) => {
      const targetCol = startCol + c;
      if (targetCol < 14) {
        grid[targetRow][targetCol] = ch;
      }
    });
  });

  return grid;
}

function formatCrosswordTo4x14(words?: CrosswordWordItem[]): FormattedTile[][] {
  const grid: FormattedTile[][] = Array.from({ length: 4 }, () =>
    Array.from({ length: 14 }, () => ({ char: "", isLetter: false, origIdx: -1 }))
  );
  if (!words || words.length === 0) return grid;

  words.forEach((item) => {
    const cleanW = (item.word || "").toUpperCase();
    for (let i = 0; i < cleanW.length; i++) {
      const r = item.direction === "DOWN" ? item.row + i : item.row;
      const c = item.direction === "ACROSS" ? item.col + i : item.col;
      if (r >= 0 && r < 4 && c >= 0 && c < 14) {
        const ch = cleanW[i];
        grid[r][c] = {
          char: ch,
          isLetter: /[A-ZÀ-Ỹ]/i.test(ch),
          origIdx: r * 14 + c,
        };
      }
    }
  });

  return grid;
}


/** Ô chữ 3D độc lập với cơ chế lật xoay 180 độ (Trilon Flip), sẵn ô trắng và highlight xanh chuẩn VTV3 */
function Studio3DPuzzleTile({
  tile,
  isOpen = true,
  isRevealed,
  isHighlighted,
  isSolvedOrRecap = false,
  posX,
  posY,
}: {
  tile: FormattedTile;
  isOpen?: boolean;
  isRevealed: boolean;
  isHighlighted: boolean;
  isSolvedOrRecap?: boolean;
  posX: number;
  posY: number;
}) {
  const meshRef = useRef<THREE.Group>(null);
  const targetRotY = isRevealed ? Math.PI : 0;

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotY, delta * 4.5);
  });

  // Khi ô chưa mở (vòng chưa bắt đầu / EMPTY_56) hoặc ô không chứa chữ: Hiển thị ô đóng xanh ngọc bích chuẩn VTV3
  if (!tile.isLetter || !isOpen) {
    const closedTex = getClosedTileTexture();
    return (
      <mesh position={[posX, posY, 0]}>
        <boxGeometry args={[0.32, 0.44, 0.04]} />
        <meshStandardMaterial attach="material-0" color="#166534" roughness={0.5} />
        <meshStandardMaterial attach="material-1" color="#166534" roughness={0.5} />
        <meshStandardMaterial attach="material-2" color="#166534" roughness={0.5} />
        <meshStandardMaterial attach="material-3" color="#166534" roughness={0.5} />
        <meshStandardMaterial attach="material-4" map={closedTex} />
        <meshStandardMaterial attach="material-5" map={closedTex} />
      </mesh>
    );
  }

  // Khi đã mở bảng: sẵn nền trắng; khi có chữ đoán trúng: chớp sáng highlight xanh; khi mở: lật 180° thành chữ đen
  // Chuẩn VTV3: Khi chưa giải đúng toàn bộ ô chữ, chỉ hiện chữ cái gốc (stripVietnameseToneKeepBase)
  const frontTex = isHighlighted ? getHighlightTileTexture() : getBlankWhiteTileTexture();
  const displayChar = isSolvedOrRecap ? tile.char : stripVietnameseToneKeepBase(tile.char);
  const backTex = getLetterTileTexture(displayChar);

  return (
    <group ref={meshRef} position={[posX, posY, 0]}>
      <mesh>
        <boxGeometry args={[0.32, 0.44, 0.04]} />
        <meshStandardMaterial attach="material-0" color="#fbbf24" metalness={0.8} roughness={0.2} />
        <meshStandardMaterial attach="material-1" color="#fbbf24" metalness={0.8} roughness={0.2} />
        <meshStandardMaterial attach="material-2" color="#fbbf24" metalness={0.8} roughness={0.2} />
        <meshStandardMaterial attach="material-3" color="#fbbf24" metalness={0.8} roughness={0.2} />
        <meshStandardMaterial
          attach="material-4"
          map={frontTex}
          emissive={isHighlighted ? "#16a34a" : "#000000"}
          emissiveIntensity={isHighlighted ? 1.5 : 0}
        />
        <meshStandardMaterial attach="material-5" map={backTex} />
      </mesh>
    </group>
  );
}

/** 3D Realistic Hostess / Người mẫu trợ lý lật ô chữ (Metahuman Realistic Style với đầm dạ hội đuôi cá cúp ngực sequin champagne, dáng đồng hồ cát nữ tính, catwalk co gối và vươn tay 5 ngón chạm mở) */
function RealisticHostess3D({
  targetPosX = 2.85,
  isTouching = false,
  isRevealing,
}: {
  targetPosX?: number;
  isTouching?: boolean;
  isRevealing: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyGroupRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const currentXRef = useRef<number>(2.85);

  useFrame((state, delta) => {
    if (!groupRef.current || !bodyGroupRef.current || !rightArmRef.current || !leftArmRef.current) return;
    const t = state.clock.getElapsedTime();

    // 1. Sải bước di chuyển catwalk mượt mà trên bục runway theo trục X
    const prevX = currentXRef.current;
    const nextX = THREE.MathUtils.lerp(prevX, targetPosX, delta * 3.2);
    currentXRef.current = nextX;
    groupRef.current.position.x = nextX;

    const isMoving = Math.abs(nextX - targetPosX) > 0.03;
    const walkCycle = Math.sin(t * 7.5);
    const walkBob = isMoving ? Math.abs(walkCycle) * 0.028 : 0;
    const breatheY = Math.sin(t * 1.8) * 0.012;
    const hipSway = isMoving ? walkCycle * 0.06 : Math.sin(t * 1.2) * 0.015;

    bodyGroupRef.current.position.y = breatheY + walkBob;
    bodyGroupRef.current.rotation.z = hipSway;

    if (isTouching) {
      // 2. Tư thế vươn tay chạm mở ô chữ: Xoay người 45° hướng về mặt bảng ô chữ
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, -0.72, delta * 5.0);

      // Cánh tay phải vươn cao thanh lịch, cẳng tay hướng về ô chữ
      rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, -1.48, delta * 5.5);
      rightArmRef.current.rotation.y = THREE.MathUtils.lerp(rightArmRef.current.rotation.y, 0.28, delta * 5.5);
      rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, 0.38, delta * 5.5);

      // Cánh tay trái khép nhẹ duyên dáng bên hông
      leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, 0.35, delta * 4.0);
      leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, 0.22, delta * 4.0);
    } else if (isMoving) {
      // 3. Tư thế Catwalk khi di chuyển: Xoay người theo hướng đi, hai tay đánh nhịp nhấp nhô
      const moveDir = targetPosX < prevX ? -0.28 : -0.58;
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, moveDir, delta * 4.0);

      // Đánh tay nhịp nhàng theo bước đi
      rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, 0.35 + walkCycle * 0.25, delta * 6.0);
      rightArmRef.current.rotation.y = THREE.MathUtils.lerp(rightArmRef.current.rotation.y, 0, delta * 4.0);
      rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, -0.16, delta * 4.0);

      leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, 0.35 - walkCycle * 0.25, delta * 6.0);
      leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, 0.16, delta * 4.0);
    } else {
      // 4. Tư thế đứng chờ bên cánh phải (IDLE): Đứng dáng hoa hậu kiêu sa, xoay góc 35° đón camera
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, -0.45, delta * 3.5);

      rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, 0.28, delta * 3.5);
      rightArmRef.current.rotation.y = THREE.MathUtils.lerp(rightArmRef.current.rotation.y, 0, delta * 3.5);
      rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, -0.18, delta * 3.5);

      leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, 0.32, delta * 3.5);
      leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, 0.20, delta * 3.5);
    }
  });

  return (
    <group ref={groupRef} position={[2.85, 0.41, 0.40]} rotation={[0, -0.45, 0]}>
      {/* Vệt bóng đổ gót chân mềm mại trên sàn bục catwalk */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[1.0, 0.45]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.65} />
      </mesh>

      {/* Body group thực hiện hoạt ảnh thở, bước đi nhịp nhàng và chạm mở */}
      <group ref={bodyGroupRef} position={[0, 0, 0]}>
        {/* 1. Đôi giày cao gót mũi nhọn mạ vàng champagne lấp lánh */}
        <group position={[0, 0, 0]}>
          <mesh position={[-0.075, 0.035, 0.03]} castShadow>
            <coneGeometry args={[0.040, 0.10, 14]} />
            <meshStandardMaterial color="#fef08a" metalness={0.95} roughness={0.08} emissive="#fbbf24" emissiveIntensity={0.3} />
          </mesh>
          <mesh position={[0.075, 0.035, 0.03]} castShadow>
            <coneGeometry args={[0.040, 0.10, 14]} />
            <meshStandardMaterial color="#fef08a" metalness={0.95} roughness={0.08} emissive="#fbbf24" emissiveIntensity={0.3} />
          </mesh>
          {/* Gót nhọn giày stiletto */}
          <mesh position={[-0.075, 0.038, -0.04]}>
            <cylinderGeometry args={[0.005, 0.004, 0.075, 8]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.96} roughness={0.05} />
          </mesh>
          <mesh position={[0.075, 0.038, -0.04]}>
            <cylinderGeometry args={[0.005, 0.004, 0.075, 8]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.96} roughness={0.05} />
          </mesh>
        </group>

        {/* 2. Đầm dạ hội đuôi cá sequin champagne/vàng gold lộng lẫy (Hourglass Mermaid Gown) */}
        {/* Vạt xòe đuôi cá xếp ly chân váy chạm mặt sàn catwalk */}
        <mesh position={[0, 0.26, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.48, 0.52, 32]} />
          <meshStandardMaterial
            color="#fef08a"
            roughness={0.20}
            metalness={0.86}
            emissive="#d97706"
            emissiveIntensity={0.20}
          />
        </mesh>

        {/* Nếp gấp vải lượn sóng chân váy đuôi cá */}
        {Array.from({ length: 8 }).map((_, fi) => {
          const a = (fi * Math.PI * 2) / 8;
          return (
            <mesh
              key={`ruffle-${fi}`}
              position={[Math.cos(a) * 0.36, 0.08, Math.sin(a) * 0.36]}
              rotation={[0.3, a, 0]}
            >
              <boxGeometry args={[0.08, 0.16, 0.02]} />
              <meshStandardMaterial color="#fef08a" metalness={0.90} roughness={0.18} emissive="#d97706" emissiveIntensity={0.18} />
            </mesh>
          );
        })}

        {/* Phần đầm ôm sát đầu gối và bắp đùi nữ tính */}
        <mesh position={[0, 0.70, 0]} castShadow>
          <cylinderGeometry args={[0.185, 0.235, 0.44, 28]} />
          <meshStandardMaterial
            color="#fef08a"
            roughness={0.20}
            metalness={0.86}
            emissive="#d97706"
            emissiveIntensity={0.20}
          />
        </mesh>

        {/* Hông cong quả lê (Feminine curvy hips) */}
        <mesh position={[0, 0.96, 0]} castShadow scale={[1.18, 1, 0.88]}>
          <cylinderGeometry args={[0.22, 0.17, 0.30, 28]} />
          <meshStandardMaterial
            color="#fef08a"
            roughness={0.20}
            metalness={0.86}
            emissive="#d97706"
            emissiveIntensity={0.20}
          />
        </mesh>
        {/* Đường cong mông tự nhiên phía sau */}
        <mesh position={[0, 0.94, -0.06]} scale={[1.15, 0.9, 0.8]}>
          <sphereGeometry args={[0.14, 20, 20]} />
          <meshStandardMaterial
            color="#fef08a"
            roughness={0.20}
            metalness={0.86}
            emissive="#d97706"
            emissiveIntensity={0.20}
          />
        </mesh>

        {/* Thắt eo con kiến thon thả (S-curve wasp waist) */}
        <mesh position={[0, 1.15, 0]} castShadow scale={[1.10, 1, 0.82]}>
          <cylinderGeometry args={[0.145, 0.17, 0.18, 24]} />
          <meshStandardMaterial
            color="#fef08a"
            roughness={0.20}
            metalness={0.86}
            emissive="#d97706"
            emissiveIntensity={0.20}
          />
        </mesh>
        {/* Thắt lưng / đai váy mạ vàng đính đá pha lê ôm quanh eo */}
        <mesh position={[0, 1.15, 0]}>
          <torusGeometry args={[0.148, 0.009, 12, 32]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.96} roughness={0.06} emissive="#f59e0b" emissiveIntensity={0.4} />
        </mesh>

        {/* Thân trên đầm cúp ngực trái tim (Sweetheart Corset) */}
        <mesh position={[0, 1.28, 0]} castShadow scale={[1.12, 1, 0.85]}>
          <cylinderGeometry args={[0.165, 0.148, 0.20, 24]} />
          <meshStandardMaterial
            color="#fef08a"
            roughness={0.20}
            metalness={0.86}
            emissive="#d97706"
            emissiveIntensity={0.20}
          />
        </mesh>

        {/* 2 Bầu ngực cong tròn mềm mại (Organic Anatomical Bust) */}
        <mesh position={[-0.068, 1.34, 0.075]}>
          <sphereGeometry args={[0.082, 20, 20]} />
          <meshStandardMaterial
            color="#fef08a"
            roughness={0.20}
            metalness={0.86}
            emissive="#d97706"
            emissiveIntensity={0.20}
          />
        </mesh>
        <mesh position={[0.068, 1.34, 0.075]}>
          <sphereGeometry args={[0.082, 20, 20]} />
          <meshStandardMaterial
            color="#fef08a"
            roughness={0.20}
            metalness={0.86}
            emissive="#d97706"
            emissiveIntensity={0.20}
          />
        </mesh>

        {/* Viền cúp ngực trái tim lấp lánh khoe xương quai xanh */}
        <mesh position={[0, 1.38, 0.09]} rotation={[0.15, 0, 0]}>
          <boxGeometry args={[0.26, 0.035, 0.02]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.96} roughness={0.06} emissive="#f59e0b" emissiveIntensity={0.4} />
        </mesh>

        {/* 3. Bờ vai trần & Vòng cổ kim cương pha lê lấp lánh */}
        {/* Đệm vai trần tròn mềm mại 2 bên */}
        <mesh position={[-0.22, 1.39, 0]}>
          <sphereGeometry args={[0.052, 14, 14]} />
          <meshStandardMaterial color="#ffedd5" roughness={0.36} metalness={0.04} />
        </mesh>
        <mesh position={[0.22, 1.39, 0]}>
          <sphereGeometry args={[0.052, 14, 14]} />
          <meshStandardMaterial color="#ffedd5" roughness={0.36} metalness={0.04} />
        </mesh>
        {/* Xương quai xanh (Clavicle) mềm mại */}
        <mesh position={[0, 1.41, 0.05]}>
          <cylinderGeometry args={[0.012, 0.012, 0.32, 12]} />
          <meshStandardMaterial color="#ffedd5" roughness={0.36} metalness={0.04} />
        </mesh>

        {/* Cổ cao kiêu sa */}
        <mesh position={[0, 1.46, 0]}>
          <cylinderGeometry args={[0.052, 0.062, 0.14, 20]} />
          <meshStandardMaterial color="#ffedd5" roughness={0.36} metalness={0.04} />
        </mesh>
        {/* Chuỗi vòng cổ kim cương quý phái quanh cổ ngọc */}
        <mesh position={[0, 1.46, 0.01]} rotation={[-0.15, 0, 0]}>
          <torusGeometry args={[0.065, 0.006, 12, 32]} />
          <meshStandardMaterial color="#ffffff" metalness={0.98} roughness={0.04} emissive="#e0f2fe" emissiveIntensity={0.35} />
        </mesh>

        {/* 4. Đầu người mẫu 3D Nữ Á Đông quý phái với búi tóc chignon và ngũ quan thanh tú (Đặt đúng vị trí cổ không bị lún) */}
        <RealisticHumanHead
          hairColor="#1c1917"
          skinColor="#ffedd5"
          gender="female"
          isTurn={false}
          isSpinning={false}
          position={[0, 1.54, 0]}
        />

        {/* 5. Cánh tay trái thanh mảnh duyên dáng có khớp khuỷu tay */}
        <group ref={leftArmRef} position={[-0.24, 1.39, 0.02]} rotation={[0.32, 0, 0.20]}>
          {/* Khớp vai */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.038, 12, 12]} />
            <meshStandardMaterial color="#ffedd5" roughness={0.36} metalness={0.04} />
          </mesh>
          {/* Bắp tay */}
          <mesh position={[0, -0.13, 0]}>
            <cylinderGeometry args={[0.034, 0.038, 0.26, 14]} />
            <meshStandardMaterial color="#ffedd5" roughness={0.36} metalness={0.04} />
          </mesh>
          {/* Khớp khuỷu tay cong tự nhiên */}
          <mesh position={[0, -0.26, 0]}>
            <sphereGeometry args={[0.034, 12, 12]} />
            <meshStandardMaterial color="#ffedd5" roughness={0.36} metalness={0.04} />
          </mesh>
          {/* Cẳng tay */}
          <mesh position={[0, -0.38, 0]}>
            <cylinderGeometry args={[0.028, 0.033, 0.24, 14]} />
            <meshStandardMaterial color="#ffedd5" roughness={0.36} metalness={0.04} />
          </mesh>
          {/* Vòng tay pha lê vàng */}
          <mesh position={[0, -0.49, 0]}>
            <torusGeometry args={[0.030, 0.004, 10, 20]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.95} roughness={0.08} emissive="#d97706" emissiveIntensity={0.4} />
          </mesh>
          {/* Bàn tay 5 ngón trái */}
          <group position={[0, -0.51, 0]} rotation={[0.15, 0, 0]}>
            <RealisticArticulatedHand skinColor="#ffedd5" side="left" pose="OPEN" />
          </group>
        </group>

        {/* 6. Cánh tay phải vươn chạm mở ô chữ (Articulated Right Arm with Touch Action và khớp khuỷu tay) */}
        <group ref={rightArmRef} position={[0.24, 1.39, 0.02]} rotation={[0.28, 0, -0.18]}>
          {/* Khớp vai */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.038, 12, 12]} />
            <meshStandardMaterial color="#ffedd5" roughness={0.36} metalness={0.04} />
          </mesh>
          {/* Bắp tay */}
          <mesh position={[0, -0.13, 0]}>
            <cylinderGeometry args={[0.034, 0.038, 0.26, 14]} />
            <meshStandardMaterial color="#ffedd5" roughness={0.36} metalness={0.04} />
          </mesh>
          {/* Khớp khuỷu tay cong tự nhiên */}
          <mesh position={[0, -0.26, 0]}>
            <sphereGeometry args={[0.034, 12, 12]} />
            <meshStandardMaterial color="#ffedd5" roughness={0.36} metalness={0.04} />
          </mesh>
          {/* Cẳng tay */}
          <mesh position={[0, -0.38, 0]}>
            <cylinderGeometry args={[0.028, 0.033, 0.24, 14]} />
            <meshStandardMaterial color="#ffedd5" roughness={0.36} metalness={0.04} />
          </mesh>
          {/* Vòng tay pha lê vàng */}
          <mesh position={[0, -0.49, 0]}>
            <torusGeometry args={[0.030, 0.004, 10, 20]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.95} roughness={0.08} emissive="#d97706" emissiveIntensity={0.4} />
          </mesh>
          {/* Cẳng tay và Bàn tay 5 ngón phải */}
          <group position={[0, -0.51, 0]} rotation={[0.15, 0, 0]}>
            <RealisticArticulatedHand
              skinColor="#ffedd5"
              side="right"
              pose={isTouching ? "TOUCH" : "OPEN"}
            />
          </group>
        </group>
      </group>
    </group>
  );
}

// Giữ alias tương thích
const StylizedHostess = RealisticHostess3D;

/** Màn hình LED kỹ thuật số lớn trên vách sân khấu 3D (Single Quad Canvas Texture)
 *  Thay thế hoàn toàn 56 khối 3D độc lập lật 180°, triệt tiêu 100% giật lag!
 */
function Studio3DBigLedWall({
  grid,
  isOpen,
  revealedSet,
  highlightedIndices,
  isSolvedOrRecap,
}: {
  grid: FormattedTile[][];
  isOpen: boolean;
  revealedSet: Set<number>;
  highlightedIndices?: Set<number>;
  isSolvedOrRecap: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);

  const texture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 1400;
    canvas.height = 560;
    canvasRef.current = canvas;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    textureRef.current = tex;
    return tex;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const tex = textureRef.current;
    if (!canvas || !tex) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Phông nền LED Cyber-Board đen ngọc bích
    ctx.fillStyle = "#041508";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cols = 14;
    const rows = 4;
    const padX = 14;
    const padY = 12;
    const totalW = canvas.width - padX * 2;
    const totalH = canvas.height - padY * 2;
    const tileW = totalW / cols;
    const tileH = totalH / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = padX + c * tileW + 4;
        const y = padY + r * tileH + 4;
        const w = tileW - 8;
        const h = tileH - 8;
        const tile = grid[r]?.[c];
        const isLetter = tile?.isLetter;
        const isRev = isLetter && (revealedSet.has(tile.origIdx) || isSolvedOrRecap);
        const isHl = Boolean(isLetter && highlightedIndices && highlightedIndices.has(tile.origIdx));

        if (!tile || !isLetter || !isOpen) {
          // Ô đóng: Màu xanh ngọc bích đậm chuẩn gameshow VTV3 với viền vàng kim
          ctx.fillStyle = "#064e3b";
          ctx.beginPath();
          ctx.roundRect(x, y, w, h, 6);
          ctx.fill();
          ctx.strokeStyle = "#15803d";
          ctx.lineWidth = 2;
          ctx.stroke();

          // Hoạ tiết sao trung tâm nhẹ
          ctx.fillStyle = "rgba(74, 222, 128, 0.25)";
          ctx.beginPath();
          ctx.arc(x + w / 2, y + h / 2, 6, 0, Math.PI * 2);
          ctx.fill();
        } else if (isHl) {
          // ── BƯỚC 1: HIGHLIGHT XANH CHỚP SÁNG RỰC RỠ ──
          ctx.fillStyle = "#16a34a";
          ctx.beginPath();
          ctx.roundRect(x, y, w, h, 6);
          ctx.fill();
          ctx.strokeStyle = "#4ade80";
          ctx.lineWidth = 4;
          ctx.stroke();

          // Hiệu ứng phát sáng neon
          ctx.shadowColor = "#22c55e";
          ctx.shadowBlur = 18;
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else if (isRev) {
          // ── BƯỚC 2: CHỮ CÁI MỞ SẮC NÉT (NỀN TRẮNG, CHỮ ĐEN DÁNG CONDENSED) ──
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.roundRect(x, y, w, h, 6);
          ctx.fill();
          ctx.strokeStyle = "#fbbf24";
          ctx.lineWidth = 3;
          ctx.stroke();

          const charToDraw = isSolvedOrRecap ? tile.char : stripVietnameseToneKeepBase(tile.char);
          ctx.fillStyle = "#0f172a";
          ctx.font = "900 82px 'SFU Helvetica Condensed', 'Roboto Condensed', 'Arial Narrow', sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(charToDraw.toUpperCase(), x + w / 2, y + h / 2 + 4);
        } else {
          // Ô trắng chờ đoán chữ (Blank white tile)
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.roundRect(x, y, w, h, 6);
          ctx.fill();
          ctx.strokeStyle = "#e2e8f0";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }

    tex.needsUpdate = true;
  }, [grid, isOpen, revealedSet, highlightedIndices, isSolvedOrRecap]);

  return (
    <mesh position={[0, 2.20, 0.05]}>
      <planeGeometry args={[5.14, 2.10]} />
      {texture ? (
        <meshBasicMaterial map={texture} toneMapped={false} />
      ) : (
        <meshStandardMaterial color="#064e3b" />
      )}
    </mesh>
  );
}

/** Bảng Ô Chữ 3D đặt vuông góc 90° tại Cánh Trái sân khấu với vách kiến trúc Art-Deco khép kín 100% */
function Studio3DPuzzleBoard({
  currentPuzzle,
  phase,
  boardStage,
  highlightedIndices,
  animRevealedIndices,
  hostessXPercent,
  hostessPose,
}: {
  currentPuzzle?: {
    category: string;
    description?: string;
    secretPhrase: string;
    revealedIndices: number[];
    puzzleType?: MagicWheelPuzzleType;
    crosswordWords?: CrosswordWordItem[];
  } | null;
  phase?: string;
  boardStage?: "EMPTY_56" | "BLANK_PHRASE" | "READY_CLUE";
  highlightedIndices?: Set<number>;
  animRevealedIndices?: Set<number>;
  hostessXPercent?: number;
  hostessPose?: "IDLE" | "GESTURE" | "WALKING" | "TOUCHING";
}) {
  const grid = useMemo(() => {
    if (currentPuzzle?.puzzleType === "CROSSWORD" && currentPuzzle.crosswordWords && currentPuzzle.crosswordWords.length > 0) {
      return formatCrosswordTo4x14(currentPuzzle.crosswordWords);
    }
    return formatPhraseTo4x14(currentPuzzle?.secretPhrase);
  }, [currentPuzzle?.secretPhrase, currentPuzzle?.puzzleType, currentPuzzle?.crosswordWords]);

  const revealedSet = useMemo(() => {
    if (animRevealedIndices && animRevealedIndices.size > 0) return animRevealedIndices;
    return new Set(currentPuzzle?.revealedIndices || []);
  }, [animRevealedIndices, currentPuzzle?.revealedIndices]);

  const isBoardEmpty = boardStage === "EMPTY_56" && phase !== "ROUND_RECAP";
  const isRevealing = phase === "ROUND_RECAP" || (revealedSet.size > 0);

  const cleanLettersCount = useMemo(() => {
    if (currentPuzzle?.puzzleType === "CROSSWORD" && currentPuzzle.crosswordWords) {
      let count = 0;
      grid.forEach((row) => row.forEach((tile) => { if (tile.isLetter) count++; }));
      return count;
    }
    return (currentPuzzle?.secretPhrase || "").replace(/\s+/g, "").length;
  }, [currentPuzzle?.secretPhrase, currentPuzzle?.puzzleType, currentPuzzle?.crosswordWords, grid]);

  const isSolvedOrRecap =
    phase === "ROUND_RECAP" ||
    (revealedSet.size > 0 && cleanLettersCount > 0 && revealedSet.size >= cleanLettersCount);

  // Tính toán vị trí di chuyển X của Người mẫu trên bục runway (nằm trong khung hình CAM 3)
  // Vị trí di chuyển X của MC trợ lý trên runway:
  // Vị trí nghỉ (IDLE): Luôn đứng ngoài biên 14 cột ô chữ (X >= 2.55 hoặc X <= -2.55)
  // để 100% các ô chữ (cột 0 đến 13) luôn thông thoáng tuyệt đối, không bị che khuất!
  const targetHostessX = useMemo(() => {
    if (typeof hostessXPercent === "number") {
      if (hostessXPercent <= 10) return -2.65;
      if (hostessXPercent >= 90) return 2.65;
      const norm = Math.max(0, Math.min(1, (hostessXPercent - 12) / 76));
      return -2.45 + norm * 4.90;
    }
    // Khi có ô highlight, MC đứng chếch cạnh bên ô đó (không đứng đè trước mặt)
    if (highlightedIndices && highlightedIndices.size > 0) {
      for (const row of grid) {
        for (let c = 0; c < row.length; c++) {
          const t = row[c];
          if (t.isLetter && highlightedIndices.has(t.origIdx)) {
            const posX = (c - 6.5) * 0.36;
            return posX < 0 ? Math.min(posX - 0.42, -2.55) : Math.max(posX + 0.42, 2.55);
          }
        }
      }
    }
    return 2.65; // Safe Idle tại Cánh Phải (Stage Left của khán giả)
  }, [hostessXPercent, highlightedIndices, grid]);

  const isTouching = hostessPose === "TOUCHING";

  return (
    <group position={[-7.80, -0.75, 4.50]} rotation={[0, Math.PI / 2, 0]}>
      {/* ── VÁCH KIẾN TRÚC ART-DECO BẢNG Ô CHỮ TẠI SƯỜN TRÁI (XOAY VUÔNG GÓC 90° HƯỚNG VÀO SÂN KHẤU) ── */}
      <group position={[0, 2.8, -0.3]}>
        {/* Vách tường đen ngọc bích Art-Deco sang trọng che kín vách sườn trái */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[8.5, 5.5, 0.12]} />
          <meshStandardMaterial color="#051f11" roughness={0.65} metalness={0.35} />
        </mesh>

        {/* Khối panel Art-Deco bậc thang màu hổ phách ấm (Amber/Gold Stepped Wings) theo chuẩn ảnh VTV3 27/06/2015 */}
        {[-3.6, -4.1, -4.6].map((px, idx) => (
          <group key={`wing-upstage-${idx}`} position={[px, 0.2 - idx * 0.25, 0.08]}>
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[0.45, 5.0 - idx * 0.5, 0.08]} />
              <meshStandardMaterial color="#b45309" roughness={0.35} metalness={0.4} />
            </mesh>
            {/* Rãnh nẹp viền hổ phách vàng sáng */}
            <mesh position={[0, 0, 0.05]}>
              <boxGeometry args={[0.12, 4.6 - idx * 0.5, 0.02]} />
              <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={1.4} metalness={0.8} />
            </mesh>
          </group>
        ))}

        {/* Cánh vách Art-Deco hoa văn hình học trắng kem & vàng kim bên phải */}
        {[3.6, 4.0].map((px, idx) => (
          <group key={`wing-right-${idx}`} position={[px, 0, 0.08]}>
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[0.35, 5.2, 0.06]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.25} metalness={0.2} />
            </mesh>
            {/* Hoa văn rãnh dọc Art-Deco vàng kim */}
            <mesh position={[0, 0, 0.04]}>
              <boxGeometry args={[0.08, 4.8, 0.02]} />
              <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={1.2} metalness={0.9} />
            </mesh>
          </group>
        ))}

        {/* 20 nan cột dọc kim loại mạ vàng sang trọng khu vực trung tâm */}
        {Array.from({ length: 20 }).map((_, i) => {
          const fx = -3.4 + i * 0.358;
          return (
            <mesh key={`arch-fin-${i}`} position={[fx, -0.4, 0.07]}>
              <boxGeometry args={[0.045, 4.4, 0.06]} />
              <meshStandardMaterial color="#fef08a" metalness={0.92} roughness={0.12} />
            </mesh>
          );
        })}

        {/* Đèn hắt trần Amber Cove Light mở rộng 8.5m */}
        <mesh position={[0, 2.7, 0.12]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.035, 0.035, 8.5, 16]} />
          <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={2.5} />
        </mesh>
        {/* Đèn hắt chân tường Emerald Cove Light mở rộng 8.5m */}
        <mesh position={[0, -2.6, 0.12]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.035, 0.035, 8.5, 16]} />
          <meshStandardMaterial color="#4ade80" emissive="#10b981" emissiveIntensity={2.2} />
        </mesh>
      </group>

      {/* 1. Bục nâng sân khấu mở rộng cho Bảng Ô Chữ 3D */}
      <mesh position={[0, 0.20, 0]} receiveShadow>
        <boxGeometry args={[8.5, 0.40, 2.6]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.92} roughness={0.12} />
      </mesh>
      {/* Vành viền LED vàng trên bục */}
      <mesh position={[0, 0.41, 0]}>
        <boxGeometry args={[8.54, 0.02, 2.64]} />
        <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={1.8} />
      </mesh>

      {/* 2. Cột trụ Art-Deco mạ bạc hai bên bảng */}
      {[-3.0, 3.0].map((px, i) => (
        <group key={`col-${i}`} position={[px, 2.2, 0]}>
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.18, 0.22, 3.8, 24]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.08} />
          </mesh>
          <mesh position={[0, 1.95, 0]}>
            <boxGeometry args={[0.5, 0.15, 0.5]} />
            <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={1.5} />
          </mesh>
        </group>
      ))}

      {/* ── 3. VÒM CONG NEON QUẠT ÁNH SÁNG MỀM MẠI ĐỐI XỨNG 100% (Radiating Fan Neon Arch - Chuẩn ảnh VTV3 27/06/2015) ── */}
      <group position={[0, 4.38, 0]}>
        {/* Vành ngoài vòm neon vàng đối xứng hoàn hảo, tiếp đất chính xác lên thanh vòm header */}
        <mesh position={[0, -0.20, 0]} rotation={[0, 0, 0.084]}>
          <torusGeometry args={[2.40, 0.035, 16, 64, 2.974]} />
          <meshStandardMaterial color="#fef08a" emissive="#f59e0b" emissiveIntensity={2.4} />
        </mesh>

        {/* Vành trong vòm neon vàng song song, tiếp đất lên thanh vòm header */}
        <mesh position={[0, -0.20, 0]} rotation={[0, 0, 0.096]}>
          <torusGeometry args={[2.10, 0.024, 16, 64, 2.951]} />
          <meshStandardMaterial color="#fde047" emissive="#d97706" emissiveIntensity={2.0} />
        </mesh>

        {/* Chân đế nẹp vàng cố định hai đầu vòm tiếp xúc mặt phẳng Header Bar */}
        {[-2.39, 2.39].map((bx, bi) => (
          <mesh key={`arch-base-${bi}`} position={[bx, 0.04, 0]}>
            <boxGeometry args={[0.22, 0.08, 0.12]} />
            <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={1.5} metalness={0.9} />
          </mesh>
        ))}

        {/* 11 nan quạt neon tỏa tia đối xứng hoàn hảo từ tâm vòm */}
        {Array.from({ length: 11 }).map((_, fi) => {
          const angle = 0.12 * Math.PI + (fi / 10) * (0.76 * Math.PI);
          const midR = 1.825;
          const rayLen = 1.05;
          const rx = Math.cos(angle) * midR;
          const ry = -0.20 + Math.sin(angle) * midR;
          return (
            <mesh
              key={`fan-ray-${fi}`}
              position={[rx, ry, 0.02]}
              rotation={[0, 0, angle - Math.PI / 2]}
            >
              <cylinderGeometry args={[0.018, 0.022, rayLen, 12]} />
              <meshStandardMaterial
                color={fi % 2 === 0 ? "#fef08a" : "#fde047"}
                emissive="#f59e0b"
                emissiveIntensity={2.2}
              />
            </mesh>
          );
        })}
      </group>

      {/* Thanh vòm trên (Header Bar) */}
      <mesh position={[0, 4.15, 0]}>
        <boxGeometry args={[6.4, 0.45, 0.25]} />
        <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Dải LED phát sáng trên vòm */}
      <mesh position={[0, 4.15, 0.13]}>
        <boxGeometry args={[6.1, 0.04, 0.02]} />
        <meshStandardMaterial color="#fde047" emissive="#f59e0b" emissiveIntensity={2.5} />
      </mesh>

      {/* 4. Khung bảng Video Wall (5.3m x 2.3m) */}
      <mesh position={[0, 2.20, 0]}>
        <boxGeometry args={[5.3, 2.3, 0.08]} />
        <meshStandardMaterial color="#052e16" roughness={0.4} />
      </mesh>

      {/* 5. Màn hình lớn LED Backdrop 4x14 kỹ thuật số siêu nhẹ (Thay thế 56 khối 3D) */}
      <Studio3DBigLedWall
        grid={grid}
        isOpen={!isBoardEmpty}
        revealedSet={revealedSet}
        highlightedIndices={highlightedIndices}
        isSolvedOrRecap={isSolvedOrRecap}
      />

      {/* 6. Người mẫu trợ lý lật ô chữ (Stylized Hostess in evening gown) */}
      <StylizedHostess isRevealing={isRevealing} targetPosX={targetHostessX} isTouching={isTouching} />
    </group>
  );
}

/** Vẽ phông nền video wall hậu trường sang trọng chuẩn Gameshow truyền hình hiện đại */
function renderVideoWallCanvas(ctx: CanvasRenderingContext2D, t: number) {
  // 1. Phông nền LED Cyberspace xanh đậm hoàng gia sang trọng (Deep Sapphire & Obsidian Horizon)
  const grad = ctx.createRadialGradient(512, 230, 20, 512, 256, 560);
  grad.addColorStop(0, "#0a2663");
  grad.addColorStop(0.35, "#061842");
  grad.addColorStop(0.70, "#030c22");
  grad.addColorStop(1, "#01040f");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  // 2. Lưới không gian sân khấu phát sáng mờ dưới chân
  ctx.save();
  ctx.strokeStyle = "rgba(14, 165, 233, 0.14)";
  ctx.lineWidth = 1.2;
  for (let x = -200; x <= 1224; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 512);
    ctx.lineTo(512 + (x - 512) * 0.18, 300);
    ctx.stroke();
  }
  for (let y = 310; y <= 512; y += 20 + (y - 310) * 0.20) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }
  ctx.restore();

  // 3. Dải luồng sáng Cinematic (Volumetric Ambient Light Rays) tỏa từ tâm sân khấu
  ctx.save();
  ctx.translate(512, 210);
  for (let i = 0; i < 16; i++) {
    const rayAngle = (i * Math.PI * 2) / 16 + Math.sin(t * 0.25 + i) * 0.08;
    const rayWidth = 0.09 + Math.sin(t * 0.5 + i * 2) * 0.025;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 580, rayAngle, rayAngle + rayWidth);
    ctx.closePath();
    const rayGrad = ctx.createRadialGradient(0, 0, 50, 0, 0, 550);
    if (i % 3 === 0) {
      rayGrad.addColorStop(0, "rgba(251, 191, 36, 0.12)");
      rayGrad.addColorStop(0.5, "rgba(245, 158, 11, 0.04)");
      rayGrad.addColorStop(1, "rgba(245, 158, 11, 0)");
    } else {
      rayGrad.addColorStop(0, "rgba(56, 189, 248, 0.14)");
      rayGrad.addColorStop(0.5, "rgba(14, 165, 233, 0.05)");
      rayGrad.addColorStop(1, "rgba(14, 165, 233, 0)");
    }
    ctx.fillStyle = rayGrad;
    ctx.fill();
  }
  ctx.restore();

  // 4. Các vòng cung hào quang neon mạ vàng & xanh vòm hậu trường (Concentric Glowing Arcs)
  ctx.save();
  [
    { r: 180, col: "rgba(56, 189, 248, 0.25)", lw: 2.0 },
    { r: 280, col: "rgba(251, 191, 36, 0.20)", lw: 2.2 },
    { r: 380, col: "rgba(14, 165, 233, 0.18)", lw: 1.8 },
  ].forEach((arc, aIdx) => {
    ctx.beginPath();
    ctx.arc(512, 210, arc.r + Math.sin(t * 1.2 + aIdx) * 4, Math.PI * 0.9, Math.PI * 2.1);
    ctx.strokeStyle = arc.col;
    ctx.lineWidth = arc.lw;
    ctx.stroke();
  });
  ctx.restore();

  // 5. Các hạt bụi ánh kim lấp lánh (Golden Shimmer Particles) bay lơ lửng sinh động
  ctx.save();
  const PARTICLE_COUNT = 32;
  for (let p = 0; p < PARTICLE_COUNT; p++) {
    const seed = p * 137.5;
    const px = (((seed * 11 + t * (18 + (p % 10))) % 1060) + 1060) % 1060 - 18;
    const py = 60 + (((seed * 7 + Math.sin(t * 0.8 + p) * 35 + t * 6) % 360) + 360) % 360;
    const pSize = 1.8 + (p % 4) * 0.9;
    const pAlpha = 0.25 + 0.55 * Math.abs(Math.sin(t * 1.5 + p));

    ctx.beginPath();
    ctx.arc(px, py, pSize, 0, Math.PI * 2);
    ctx.fillStyle = p % 2 === 0 ? `rgba(254, 240, 138, ${pAlpha})` : `rgba(186, 230, 253, ${pAlpha * 0.85})`;
    ctx.shadowColor = p % 2 === 0 ? "#fef08a" : "#38bdf8";
    ctx.shadowBlur = 6;
    ctx.fill();
  }
  ctx.restore();

  // 6. Scanlines LED TV viền phát sáng tự nhiên
  ctx.fillStyle = "rgba(0, 0, 0, 0.10)";
  for (let y = 0; y < 512; y += 4) {
    ctx.fillRect(0, y, 1024, 2);
  }
}

/** Màn hình LED cong vòm hậu trường hiển thị video đồ họa sóng chữ & logo 3D Chiếc Nón Kỳ Diệu chuẩn VTV3 (Tối ưu Throttling) */
function BackdropCurvedLedScreen({ quality = "HIGH" }: { quality?: "HIGH" | "MEDIUM" | "LOW" }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const hasRenderedOnceRef = useRef<boolean>(false);

  const ledTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    canvasRef.current = canvas;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      renderVideoWallCanvas(ctx, 0);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    textureRef.current = tex;
    return tex;
  }, []);

  useFrame((state) => {
    const canvas = canvasRef.current;
    const tex = textureRef.current;
    if (!canvas || !tex) return;

    const t = state.clock.getElapsedTime();
    // Throttling tối ưu CPU/GPU: HIGH: 25Hz (0.04s); MEDIUM: 15Hz (0.066s); LOW: Render 1 lần duy nhất (0 continuous cost)
    if (quality === "LOW") {
      if (hasRenderedOnceRef.current) return;
      hasRenderedOnceRef.current = true;
    } else {
      const interval = quality === "HIGH" ? 0.04 : 0.066;
      if (t - lastUpdateRef.current < interval) return;
      lastUpdateRef.current = t;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    renderVideoWallCanvas(ctx, t);
    tex.needsUpdate = true;
  });

  return (
    <group position={[0, -0.75, -8.5]}>
      {/* 1. KHUNG BEZEL TITANIUM KIM LOẠI THANH MẢNH 50MM VỚI ĐƯỜNG CHỈ VÀNG TINH TẾ */}
      <group position={[0, 0, 0]}>
        {/* Viền trái Titanium */}
        <mesh position={[-5.64, 4.05, 0.02]}>
          <boxGeometry args={[0.08, 7.66, 0.06]} />
          <meshStandardMaterial color="#0b1120" metalness={0.92} roughness={0.2} />
        </mesh>
        {/* Viền phải Titanium */}
        <mesh position={[5.64, 4.05, 0.02]}>
          <boxGeometry args={[0.08, 7.66, 0.06]} />
          <meshStandardMaterial color="#0b1120" metalness={0.92} roughness={0.2} />
        </mesh>
        {/* Viền trên Titanium */}
        <mesh position={[0, 7.84, 0.02]}>
          <boxGeometry args={[11.36, 0.08, 0.06]} />
          <meshStandardMaterial color="#0b1120" metalness={0.92} roughness={0.2} />
        </mesh>
        {/* Viền dưới Titanium */}
        <mesh position={[0, 0.26, 0.02]}>
          <boxGeometry args={[11.36, 0.08, 0.06]} />
          <meshStandardMaterial color="#0b1120" metalness={0.92} roughness={0.2} />
        </mesh>

        {/* Đường chỉ LED vàng hoàng kim chạy âm chỉ viền trong tạo điểm nhấn thanh lịch */}
        <mesh position={[-5.60, 4.05, 0.05]}>
          <boxGeometry args={[0.015, 7.52, 0.02]} />
          <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={1.8} />
        </mesh>
        <mesh position={[5.60, 4.05, 0.05]}>
          <boxGeometry args={[0.015, 7.52, 0.02]} />
          <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={1.8} />
        </mesh>
        <mesh position={[0, 7.80, 0.05]}>
          <boxGeometry args={[11.20, 0.015, 0.02]} />
          <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={1.8} />
        </mesh>
        <mesh position={[0, 0.30, 0.05]}>
          <boxGeometry args={[11.20, 0.015, 0.02]} />
          <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={1.8} />
        </mesh>
      </group>

      {/* 2. BỆ CHỨA MÀN HÌNH LED ĐA TẦNG NGHỆ THUẬT (Architectural Tiered Pedestal) */}
      <group position={[0, 0, 0]}>
        {/* Tầng bệ trên: Khối kim loại phay xước sapphire sẫm viền LED */}
        <mesh position={[0, 0.18, 0.10]} receiveShadow castShadow>
          <boxGeometry args={[11.8, 0.16, 0.50]} />
          <meshStandardMaterial color="#0f172a" metalness={0.88} roughness={0.18} />
        </mesh>
        {/* Dải LED phát sáng ấm áp chạy dọc gờ bệ trên */}
        <mesh position={[0, 0.25, 0.35]}>
          <boxGeometry args={[11.7, 0.02, 0.02]} />
          <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={2.0} />
        </mesh>

        {/* Tầng bệ dưới: Đế bục kính đen bóng gương obsidian chịu lực */}
        <mesh position={[0, 0.04, 0.15]} receiveShadow>
          <boxGeometry args={[12.4, 0.20, 0.80]} />
          <meshStandardMaterial color="#050811" metalness={0.95} roughness={0.08} />
        </mesh>
        {/* Nẹp chân mạ vàng 3 điểm tiếp sàn */}
        {[-5.6, 0, 5.6].map((bx, bi) => (
          <mesh key={`led-pedestal-foot-${bi}`} position={[bx, 0.02, 0.56]}>
            <boxGeometry args={[0.35, 0.04, 0.06]} />
            <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={1.2} metalness={0.9} />
          </mesh>
        ))}
      </group>

      {/* 3. Màn hình LED Video Wall hiển thị đồ họa sóng chữ & logo 3D */}
      <mesh ref={meshRef} position={[0, 4.05, -0.01]}>
        <planeGeometry args={[11.2, 7.5]} />
        <meshBasicMaterial map={ledTexture ?? undefined} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Cụm hoạ tiết cánh gà kiến trúc truyền hình nghệ thuật ẩn dụ (Floating Segmented Arc Ribs & Sleek Architectural Slats) */
function StudioSetWingMotifs() {
  const renderFloatingSegmentedWingMotif = (x: number, z: number, rotY: number, isLeft: boolean) => (
    <group position={[x, 4.2, z]} rotation={[0, rotY, 0]}>
      {/* 1. Tấm vách kiến trúc sườn màu đen Sapphire kim loại cao cấp */}
      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[3.4, 7.8, 0.12]} />
        <meshStandardMaterial color="#050a16" metalness={0.88} roughness={0.22} />
      </mesh>

      {/* 2. Các thanh lam đứng viền vàng kim bắt sáng (Vertical Gold Slats) */}
      {[-1.3, -0.65, 0, 0.65, 1.3].map((sx, idx) => (
        <mesh key={`v-slat-${idx}`} position={[sx, 0, 0.02]}>
          <boxGeometry args={[0.045, 7.8, 0.04]} />
          <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={0.8} metalness={0.95} />
        </mesh>
      ))}

      {/* 3. Vòng trung tâm lơ lửng tối giản (Minimal Floating Halo Core - không đặc, không bánh xe cơ học) */}
      <mesh position={[0, 0, 0.08]}>
        <torusGeometry args={[0.42, 0.035, 16, 36]} />
        <meshStandardMaterial color="#fef08a" emissive="#f59e0b" emissiveIntensity={2.2} metalness={0.92} />
      </mesh>

      {/* 4. TẦNG 1: Cung tròn LED lơ lửng trong cùng (Radius = 1.15m) - Tách rời 3 phân đoạn bất đối xứng */}
      {[
        { start: 0.15, len: 1.25, color: "#fde047", emissive: "#f59e0b", depth: 0.06 },
        { start: 1.85, len: 1.45, color: "#fef08a", emissive: "#d97706", depth: 0.08 },
        { start: 3.90, len: 1.70, color: "#38bdf8", emissive: "#0284c7", depth: 0.07 },
      ].map((arc, i) => (
        <group key={`arc-t1-${i}`} rotation={[0, 0, arc.start]} position={[0, 0, arc.depth]}>
          <mesh>
            <torusGeometry args={[1.15, 0.038, 16, 36, arc.len]} />
            <meshStandardMaterial color={arc.color} emissive={arc.emissive} emissiveIntensity={2.4} />
          </mesh>
        </group>
      ))}

      {/* 5. TẦNG 2: Cung tròn kim loại & LED lơ lửng tầng giữa (Radius = 1.85m) - Tách rời 3 phân đoạn so le */}
      {[
        { start: 0.70, len: 1.55, color: "#fbbf24", emissive: "#d97706", depth: 0.09 },
        { start: 2.75, len: 1.35, color: "#38bdf8", emissive: "#0284c7", depth: 0.11 },
        { start: 4.60, len: 1.60, color: "#fde047", emissive: "#f59e0b", depth: 0.10 },
      ].map((arc, i) => (
        <group key={`arc-t2-${i}`} rotation={[0, 0, arc.start]} position={[0, 0, arc.depth]}>
          <mesh>
            <torusGeometry args={[1.85, 0.045, 16, 48, arc.len]} />
            <meshStandardMaterial color={arc.color} emissive={arc.emissive} emissiveIntensity={2.5} metalness={0.85} />
          </mesh>
        </group>
      ))}

      {/* 6. TẦNG 3: Cung tròn lớn ngoài cùng (Radius = 2.60m) - Tách rời phân đoạn thanh thoát */}
      {[
        { start: 0.30, len: 1.40, color: "#fef08a", emissive: "#f59e0b", depth: 0.05 },
        { start: 2.20, len: 1.65, color: "#fbbf24", emissive: "#d97706", depth: 0.07 },
        { start: 4.35, len: 1.30, color: "#38bdf8", emissive: "#0284c7", depth: 0.06 },
      ].map((arc, i) => (
        <group key={`arc-t3-${i}`} rotation={[0, 0, arc.start]} position={[0, 0, arc.depth]}>
          <mesh>
            <torusGeometry args={[2.60, 0.042, 16, 52, arc.len]} />
            <meshStandardMaterial color={arc.color} emissive={arc.emissive} emissiveIntensity={2.2} />
          </mesh>
        </group>
      ))}

      {/* 7. Các phiến nan kim loại lơ lửng hướng tâm so le (Kinetic Floating Blades - không chạm tâm, không dính vành) */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i * Math.PI * 2) / 12 + (isLeft ? 0.1 : -0.1);
        const rMid = 1.50 + (i % 3) * 0.35;
        const px = Math.sin(a) * rMid;
        const py = Math.cos(a) * rMid;
        const isCyan = i % 4 === 1;

        return (
          <group key={`blade-${i}`} position={[px, py, 0.08 + (i % 2) * 0.03]} rotation={[0, 0, -a]}>
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[0.06, 0.65, 0.03]} />
              <meshStandardMaterial
                color={isCyan ? "#38bdf8" : "#fef08a"}
                emissive={isCyan ? "#0284c7" : "#d97706"}
                emissiveIntensity={isCyan ? 2.0 : 1.4}
                metalness={0.92}
                roughness={0.15}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );

  return (
    <group>
      {/* Hai cụm hoạ tiết cánh gà nghệ thuật ẩn dụ lơ lửng đối xứng hai bên vòm sân khấu */}
      {renderFloatingSegmentedWingMotif(-7.4, -8.2, 0.28, true)}
      {renderFloatingSegmentedWingMotif(7.4, -8.2, -0.28, false)}

      {/* Cặp cánh vòm tối bo cong (Dark Arched Wings) ôm hai bên tạo chiều sâu thị giác đa lớp */}
      {[-9.4, 9.4].map((wx, idx) => (
        <group key={`dark-wing-${idx}`} position={[wx, 3.8, -7.8]} rotation={[0, idx === 0 ? 0.35 : -0.35, 0]}>
          <mesh>
            <boxGeometry args={[1.6, 7.8, 0.15]} />
            <meshStandardMaterial color="#030712" metalness={0.85} roughness={0.25} />
          </mesh>
          {/* Dải viền LED vàng trên mép cánh vòm */}
          <mesh position={[idx === 0 ? 0.8 : -0.8, 0, 0.1]}>
            <cylinderGeometry args={[0.04, 0.04, 7.8, 16]} />
            <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={2.0} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Khán đài khán giả 6 tầng bậc thang hoành tráng & Phông nền Mặt Trống Đồng Đông Sơn cổ trầm Việt Nam */
function AudienceAmphitheaterVietnamese() {
  const dongSonTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = generateDongSonTexture(1024);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  // 6 tầng bậc thang bán kính R = 14.5m đến 21.0m lùi sâu hậu trường, tạo không gian thoáng đãng tuyệt đối cho CAM 8
  const TIERS = [
    { r: 14.5, h: 0.50, seats: 22 },
    { r: 15.8, h: 1.05, seats: 24 },
    { r: 17.1, h: 1.60, seats: 26 },
    { r: 18.4, h: 2.15, seats: 28 },
    { r: 19.7, h: 2.70, seats: 30 },
    { r: 21.0, h: 3.25, seats: 32 },
  ];

  const SHIRT_COLORS = [
    "#f8fafc", "#ef4444", "#0ea5e9", "#eab308",
    "#10b981", "#a855f7", "#3b82f6", "#f97316",
    "#ec4899", "#14b8a6", "#fbbf24", "#6366f1"
  ];
  const HAIR_COLORS = ["#0f172a", "#1c1917", "#27170a", "#18181b"];
  const SKIN_COLORS = ["#fed7aa", "#fde68a", "#fcd34d", "#fbcfe8"];

  const startAngle = Math.PI * 0.25;
  const endAngle = Math.PI * 0.75;
  const angleSpan = endAngle - startAngle;

  return (
    <group position={[0, -0.75, 0]}>
      {/* ── 1. PHÔNG NỀN DÂN GIAN VIỆT NAM ĐA TẦNG ÁNH SÁNG (Layered Wall Lighting & Dong Son Drum Hero) ── */}
      <group position={[0, 0, 0]}>
        {/* Vách cong hình trụ ôm trọn 150° chu vi trường quay (R = 22.5m, H = 14.0m) triệt tiêu hoàn toàn khoảng hở */}
        <mesh position={[0, 6.25, 0]} receiveShadow>
          <cylinderGeometry args={[22.5, 22.5, 14.0, 64, 1, true, Math.PI * 0.14, Math.PI * 0.72]} />
          <meshStandardMaterial color="#2d180b" roughness={0.65} metalness={0.2} side={THREE.BackSide} />
        </mesh>

        {/* 28 dải lam gỗ dọc trang trí tiêu âm uốn cong dọc theo vách hình trụ với nẹp đồng cổ chìm */}
        {Array.from({ length: 28 }).map((_, i) => {
          const a = Math.PI * 0.15 + (i / 27) * (Math.PI * 0.70);
          const wx = Math.cos(a) * 22.35;
          const wz = Math.sin(a) * 22.35;
          return (
            <group key={`back-slat-${i}`} position={[wx, 6.25, wz]} rotation={[0, -a + Math.PI / 2, 0]}>
              <mesh>
                <boxGeometry args={[0.32, 13.2, 0.12]} />
                <meshStandardMaterial color="#1a0e06" roughness={0.5} metalness={0.3} />
              </mesh>
              {/* Nẹp viền đồng cổ bắt sáng ấm áp nổi bật trên vách */}
              <mesh position={[0, 0, 0.065]}>
                <boxGeometry args={[0.045, 13.2, 0.02]} />
                <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={1.2} roughness={0.3} metalness={0.8} />
              </mesh>
            </group>
          );
        })}

        {/* ── TẦNG ÁNH SÁNG 1: DẢI LED COVE ĐỈNH TƯỜNG (Top Cove Lighting Y = 12.8m, R = 22.3m) ── */}
        <mesh position={[0, 12.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[22.25, 22.38, 64, 1, Math.PI * 0.14, Math.PI * 0.72]} />
          <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={2.8} side={THREE.DoubleSide} />
        </mesh>

        {/* ── TẦNG ÁNH SÁNG 2A: DẢI LED COVE TRUNG CẢNH TRÊN (Mid-Upper Cove Lighting Y = 8.8m, R = 22.3m) ── */}
        <mesh position={[0, 8.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[22.25, 22.38, 64, 1, Math.PI * 0.14, Math.PI * 0.72]} />
          <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={2.2} side={THREE.DoubleSide} />
        </mesh>

        {/* ── TẦNG ÁNH SÁNG 2B: VÀNG KIM HALO HÀO QUANG QUANH TRỐNG ĐỒNG ĐÔNG SƠN (Y = 5.4m, Z = 22.05m) ── */}
        <mesh position={[0, 5.4, 22.0]}>
          <torusGeometry args={[4.12, 0.06, 16, 64]} />
          <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={2.8} />
        </mesh>

        {/* ── TẦNG ÁNH SÁNG 2C: DẢI LED COVE TRUNG CẢNH DƯỚI (Mid-Lower Cove Lighting Y = 6.2m, R = 22.3m) ── */}
        <mesh position={[0, 6.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[22.25, 22.38, 64, 1, Math.PI * 0.14, Math.PI * 0.72]} />
          <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1.8} side={THREE.DoubleSide} />
        </mesh>

        {/* ── TẦNG ÁNH SÁNG 3: DẢI LED COVE UPLIGHT CHÂN VÁCH SAU TẦNG 6 (Y = 3.6m, R = 21.6m) ── */}
        <mesh position={[0, 3.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[21.55, 21.68, 64, 1, Math.PI * 0.14, Math.PI * 0.72]} />
          <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={2.4} side={THREE.DoubleSide} />
        </mesh>

        {/* Đèn hắt wash ánh sáng vàng ấm lan tỏa đa điểm trên mặt vách gỗ tiêu âm loại bỏ hoàn toàn vùng tối */}
        <pointLight position={[-8, 6.5, 19.5]} intensity={9.5} distance={18} color="#fed7aa" />
        <pointLight position={[8, 6.5, 19.5]} intensity={9.5} distance={18} color="#fed7aa" />
        <pointLight position={[-12, 9.0, 19.0]} intensity={9.0} distance={18} color="#fed7aa" />
        <pointLight position={[12, 9.0, 19.0]} intensity={9.0} distance={18} color="#fed7aa" />
        <pointLight position={[0, 9.2, 20.0]} intensity={11.0} distance={18} color="#fed7aa" />
        <pointLight position={[0, 2.5, 16.0]} intensity={7.0} distance={16} color="#fed7aa" />

        {/* CẶP ĐÈN LỒNG ĐỎ HỘI AN PHÁT SÁNG LUNG LINH HAI BÊN CÁNH GÀ (X = ±10.8m, Y = 6.2m, Z = 20.0m) */}
        {[-10.8, 10.8].map((lx, i) => (
          <group key={`lantern-${i}`} position={[lx, 6.2, 20.0]}>
            {/* Dây treo kim loại mạ vàng */}
            <mesh position={[0, 0.65, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 1.3, 8]} />
              <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.1} />
            </mesh>
            {/* Nắp vòm vàng trên đèn lồng */}
            <mesh position={[0, 0.36, 0]}>
              <cylinderGeometry args={[0.18, 0.24, 0.08, 16]} />
              <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={1.2} metalness={0.9} />
            </mesh>
            {/* Thân đèn lồng đỏ Hội An hình bầu dục mềm mại */}
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[0.42, 24, 24]} />
              <meshStandardMaterial
                color="#ef4444"
                emissive="#dc2626"
                emissiveIntensity={2.0}
                roughness={0.3}
              />
            </mesh>
            {/* Vành nan tre vàng bo giữa thân đèn */}
            <mesh position={[0, 0, 0]}>
              <torusGeometry args={[0.43, 0.02, 12, 24]} />
              <meshStandardMaterial color="#fef08a" emissive="#f59e0b" emissiveIntensity={1.2} />
            </mesh>
            {/* Nắp đáy vàng */}
            <mesh position={[0, -0.36, 0]}>
              <cylinderGeometry args={[0.24, 0.18, 0.08, 16]} />
              <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={1.2} metalness={0.9} />
            </mesh>
            {/* Tua rua đỏ vàng đung đưa dưới đáy */}
            <mesh position={[0, -0.58, 0]}>
              <cylinderGeometry args={[0.05, 0.10, 0.36, 12]} />
              <meshStandardMaterial color="#b91c1c" roughness={0.6} />
            </mesh>
            {/* Ánh sáng đèn lồng tỏa ra xung quanh */}
            <pointLight color="#ef4444" intensity={5.0} distance={12} />
          </group>
        ))}

        {/* MẶT TRỐNG ĐỒNG ĐÔNG SƠN CỔ CHÌM (Đường kính 8.0m) TƯƠNG TÁC ÁNH SÁNG ĐÈN CHIẾU RỌI */}
        <group position={[0, 5.4, 22.1]} rotation={[0, Math.PI, 0]}>
          {/* Đĩa tròn mặt trống đồng Đông Sơn khắc chìm cổ */}
          <mesh position={[0, 0, 0]}>
            <circleGeometry args={[4.0, 64]} />
            <meshStandardMaterial
              map={dongSonTexture ?? undefined}
              roughness={0.42}
              metalness={0.50}
              color="#b47036"
              emissive="#3d1d08"
              emissiveIntensity={0.45}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Viền ngoài khung đồng cổ đúc khối 3D */}
          <mesh position={[0, 0, -0.02]}>
            <torusGeometry args={[4.05, 0.16, 16, 64]} />
            <meshStandardMaterial color="#854d1d" roughness={0.45} metalness={0.65} />
          </mesh>
        </group>
      </group>

      {/* ── 2. ĐÈN CHIẾU RỌI TRỰC TIẾP LÊN MẶT TRỐNG ĐỒNG ĐÔNG SƠN & VÁCH HẬU ── */}
      <pointLight position={[0, 5.8, 18.5]} intensity={12.0} distance={18} color="#fed7aa" />
      <pointLight position={[-5.0, 6.5, 18.5]} intensity={8.5} distance={16} color="#fef08a" />
      <pointLight position={[5.0, 6.5, 18.5]} intensity={8.5} distance={16} color="#fef08a" />
      <pointLight position={[0, 2.5, 14.5]} intensity={6.0} distance={16} color="#fed7aa" />

      {/* ── 3. LAN CAN THANG ĐI LẠI HAI BÊN KHÁN ĐÀI (Side Staircase Balustrades) — Thanh mảnh, không che khuất CAM 8 ── */}
      {[startAngle, endAngle].map((ang, pi) => {
        return (
          <group key={`stair-railing-${pi}`}>
            {TIERS.map((tier, tIdx) => {
              const rx = Math.cos(ang) * tier.r;
              const rz = Math.sin(ang) * tier.r;
              return (
                <group key={`post-${pi}-${tIdx}`} position={[rx, tier.h, rz]}>
                  {/* Trụ lan can kim loại inox mạ đồng cổ */}
                  <mesh position={[0, 0.42, 0]}>
                    <cylinderGeometry args={[0.02, 0.02, 0.84, 8]} />
                    <meshStandardMaterial color="#784f27" roughness={0.3} metalness={0.8} />
                  </mesh>
                  {/* Quả cầu đỉnh trụ lan can */}
                  <mesh position={[0, 0.85, 0]}>
                    <sphereGeometry args={[0.035, 12, 12]} />
                    <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.15} />
                  </mesh>
                </group>
              );
            })}
          </group>
        );
      })}

      {/* ── 4. HỆ THỐNG KHÁN ĐÀI 6 TẦNG BẬC THANG CÓ NỀN MÓNG ĐẶC KÍN (Solid Foundations) & GHẾ RẠP NHUNG ĐỎ BURGUNDY PHÓNG TO +28% ── */}
      {TIERS.map((tier, tIdx) => {
        return (
          <group key={`tier-${tIdx}`}>
            {/* Mặt đứng trước của bục bậc thang (Front Riser) — Chặn kín từ sàn Y=0 lên đến bậc */}
            <mesh position={[0, tier.h / 2, 0]} receiveShadow>
              <cylinderGeometry
                args={[tier.r - 0.78, tier.r - 0.78, tier.h, 48, 1, true, startAngle, angleSpan]}
              />
              <meshStandardMaterial color="#080d17" roughness={0.7} metalness={0.3} side={THREE.DoubleSide} />
            </mesh>

            {/* Mặt đứng sau của bục bậc thang (Back Riser) */}
            <mesh position={[0, tier.h / 2, 0]} receiveShadow>
              <cylinderGeometry
                args={[tier.r + 0.78, tier.r + 0.78, tier.h, 48, 1, true, startAngle, angleSpan]}
              />
              <meshStandardMaterial color="#080d17" roughness={0.7} metalness={0.3} side={THREE.DoubleSide} />
            </mesh>

            {/* Hai đầu chái bậc thang bịt kín hoàn toàn khoảng hở (Tier Side Endcaps) */}
            {[startAngle, endAngle].map((ang, eIdx) => {
              const ex = Math.cos(ang) * tier.r;
              const ez = Math.sin(ang) * tier.r;
              return (
                <mesh
                  key={`tier-endcap-${tIdx}-${eIdx}`}
                  position={[ex, tier.h / 2, ez]}
                  rotation={[0, -ang + Math.PI / 2, 0]}
                  receiveShadow
                >
                  <boxGeometry args={[0.08, tier.h, 1.56]} />
                  <meshStandardMaterial color="#080d17" roughness={0.7} metalness={0.3} />
                </mesh>
              );
            })}

            {/* Mặt sàn bậc thang đi lại (Floor Tread) có thảm tối màu */}
            <mesh position={[0, tier.h + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <ringGeometry args={[tier.r - 0.78, tier.r + 0.78, 64, 1, startAngle, angleSpan]} />
              <meshStandardMaterial color="#0c1220" roughness={0.7} metalness={0.3} side={THREE.DoubleSide} />
            </mesh>

            {/* Dải đèn LED phát sáng chạy dọc mép gờ bậc thang (Stair Nosing Light) */}
            <mesh position={[0, tier.h + 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[tier.r - 0.79, tier.r - 0.75, 64, 1, startAngle, angleSpan]} />
              <meshBasicMaterial color={tIdx % 2 === 0 ? "#fbbf24" : "#f59e0b"} toneMapped={false} side={THREE.DoubleSide} />
            </mesh>

            {/* Dãy ghế rạp nhung đỏ Burgundy & Khán giả 3D tỷ lệ chuẩn người thật */}
            {Array.from({ length: tier.seats }).map((_, sIdx) => {
              // Bố trí so le giữa các hàng ghế để lộ rõ từng ghế và người ngồi
              const stagger = (tIdx % 2 === 0 ? 0 : 0.5) * (angleSpan / tier.seats);
              const a = startAngle + (sIdx + 0.25) * (angleSpan / tier.seats) + stagger;
              const sx = Math.cos(a) * tier.r;
              const sz = Math.sin(a) * tier.r;
              const seatColor = "#881337"; // Nhung đỏ Burgundy chuẩn rạp truyền hình VTV3
              const shirtColor = SHIRT_COLORS[(sIdx * 3 + tIdx * 5) % SHIRT_COLORS.length];
              const hairColor = HAIR_COLORS[(sIdx + tIdx) % HAIR_COLORS.length];
              const skinColor = SKIN_COLORS[(sIdx * 2 + tIdx) % SKIN_COLORS.length];
              const isClapping = (sIdx + tIdx) % 2 === 0;

              return (
                <group key={`seat-${tIdx}-${sIdx}`} position={[sx, tier.h, sz]} rotation={[0, -a + Math.PI / 2, 0]}>
                  {/* ── GHẾ RẠP NHUNG ĐỎ BURGUNDY PHÓNG TO +28% CHUẨN XÁC ── */}
                  {/* Chân ghế thép tròn đôi sơn đen dập bản mã bắt sàn */}
                  <mesh position={[-0.20, 0.18, 0]}>
                    <cylinderGeometry args={[0.024, 0.024, 0.36, 8]} />
                    <meshStandardMaterial color="#0f172a" metalness={0.92} roughness={0.15} />
                  </mesh>
                  <mesh position={[0.20, 0.18, 0]}>
                    <cylinderGeometry args={[0.024, 0.024, 0.36, 8]} />
                    <meshStandardMaterial color="#0f172a" metalness={0.92} roughness={0.15} />
                  </mesh>

                  {/* Đệm ngồi bọc nhung đỏ êm ái dày dặn (rộng 0.58m, sâu 0.52m) */}
                  <mesh position={[0, 0.38, 0]}>
                    <boxGeometry args={[0.58, 0.14, 0.52]} />
                    <meshStandardMaterial color={seatColor} roughness={0.7} metalness={0.1} />
                  </mesh>

                  {/* Tựa lưng ghế rạp nhung vươn cao vượt vai ngả nhẹ 10° */}
                  <mesh position={[0, 0.86, 0.23]} rotation={[-0.12, 0, 0]}>
                    <boxGeometry args={[0.58, 0.85, 0.12]} />
                    <meshStandardMaterial color={seatColor} roughness={0.7} metalness={0.1} />
                  </mesh>

                  {/* Đệm gối tựa đầu nổi khối trên đỉnh tựa lưng (Headrest) */}
                  <mesh position={[0, 1.22, 0.29]} rotation={[-0.12, 0, 0]}>
                    <boxGeometry args={[0.50, 0.22, 0.10]} />
                    <meshStandardMaterial color="#9f1239" roughness={0.65} metalness={0.12} />
                  </mesh>

                  {/* Tay vịn gỗ gụ sang trọng hai bên ghế */}
                  <mesh position={[-0.31, 0.58, 0.04]}>
                    <boxGeometry args={[0.07, 0.06, 0.45]} />
                    <meshStandardMaterial color="#3b1708" roughness={0.3} metalness={0.25} />
                  </mesh>
                  <mesh position={[0.31, 0.58, 0.04]}>
                    <boxGeometry args={[0.07, 0.06, 0.45]} />
                    <meshStandardMaterial color="#3b1708" roughness={0.3} metalness={0.25} />
                  </mesh>

                  {/* ── KHÁN GIẢ 3D TỶ LỆ NGƯỜI THẬT PHÓNG TO +28% ── */}
                  {/* Đùi ngồi trên đệm ghế */}
                  <mesh position={[0, 0.46, -0.05]}>
                    <boxGeometry args={[0.44, 0.16, 0.40]} />
                    <meshStandardMaterial color={sIdx % 3 === 0 ? "#1e293b" : "#334155"} roughness={0.7} />
                  </mesh>

                  {/* Cẳng chân buông thẳng vuông góc xuống mặt sàn bậc thang */}
                  <mesh position={[-0.13, 0.22, -0.25]}>
                    <cylinderGeometry args={[0.06, 0.055, 0.44, 8]} />
                    <meshStandardMaterial color={sIdx % 3 === 0 ? "#1e293b" : "#334155"} roughness={0.7} />
                  </mesh>
                  <mesh position={[0.13, 0.22, -0.25]}>
                    <cylinderGeometry args={[0.06, 0.055, 0.44, 8]} />
                    <meshStandardMaterial color={sIdx % 3 === 0 ? "#1e293b" : "#334155"} roughness={0.7} />
                  </mesh>

                  {/* Đôi giày đặt chắc chắn trên mặt sàn bậc thang */}
                  <mesh position={[-0.13, 0.04, -0.29]}>
                    <boxGeometry args={[0.11, 0.07, 0.16]} />
                    <meshStandardMaterial color="#0f172a" roughness={0.8} />
                  </mesh>
                  <mesh position={[0.13, 0.04, -0.29]}>
                    <boxGeometry args={[0.11, 0.07, 0.16]} />
                    <meshStandardMaterial color="#0f172a" roughness={0.8} />
                  </mesh>

                  {/* Thân áo / Ngực khán giả có vai uốn tự nhiên */}
                  <mesh position={[0, 0.84, -0.02]}>
                    <boxGeometry args={[0.44, 0.54, 0.26]} />
                    <meshStandardMaterial color={shirtColor} roughness={0.5} />
                  </mesh>

                  {/* Cổ áo */}
                  <mesh position={[0, 1.15, -0.02]}>
                    <cylinderGeometry args={[0.07, 0.08, 0.10, 10]} />
                    <meshStandardMaterial color={skinColor} roughness={0.5} />
                  </mesh>

                  {/* Đầu khán giả */}
                  <mesh position={[0, 1.28, -0.02]}>
                    <sphereGeometry args={[0.13, 14, 14]} />
                    <meshStandardMaterial color={skinColor} roughness={0.5} />
                  </mesh>

                  {/* Mái tóc đa dạng */}
                  <mesh position={[0, 1.33, -0.02]}>
                    <sphereGeometry args={[0.135, 14, 14, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
                    <meshStandardMaterial color={hairColor} roughness={0.6} />
                  </mesh>

                  {/* Cánh tay và cử chỉ (50% vỗ tay cổ vũ, 50% tựa tay vịn gỗ) */}
                  {isClapping ? (
                    <group>
                      {/* Tay gập phía trước vỗ tay */}
                      <mesh position={[-0.14, 0.68, -0.19]} rotation={[0.45, 0, -0.2]}>
                        <cylinderGeometry args={[0.048, 0.052, 0.32, 8]} />
                        <meshStandardMaterial color={shirtColor} roughness={0.5} />
                      </mesh>
                      <mesh position={[0.14, 0.68, -0.19]} rotation={[0.45, 0, 0.2]}>
                        <cylinderGeometry args={[0.048, 0.052, 0.32, 8]} />
                        <meshStandardMaterial color={shirtColor} roughness={0.5} />
                      </mesh>
                      <mesh position={[0, 0.59, -0.28]}>
                        <sphereGeometry args={[0.07, 8, 8]} />
                        <meshStandardMaterial color={skinColor} roughness={0.5} />
                      </mesh>
                    </group>
                  ) : (
                    <group>
                      {/* Tay tựa trên tay vịn gỗ gụ */}
                      <mesh position={[-0.26, 0.66, 0.04]} rotation={[0.1, 0, 0]}>
                        <cylinderGeometry args={[0.048, 0.05, 0.32, 8]} />
                        <meshStandardMaterial color={shirtColor} roughness={0.5} />
                      </mesh>
                      <mesh position={[0.26, 0.66, 0.04]} rotation={[0.1, 0, 0]}>
                        <cylinderGeometry args={[0.048, 0.05, 0.32, 8]} />
                        <meshStandardMaterial color={shirtColor} roughness={0.5} />
                      </mesh>
                      <mesh position={[-0.28, 0.62, -0.14]}>
                        <sphereGeometry args={[0.055, 8, 8]} />
                        <meshStandardMaterial color={skinColor} roughness={0.5} />
                      </mesh>
                      <mesh position={[0.28, 0.62, -0.14]}>
                        <sphereGeometry args={[0.055, 8, 8]} />
                        <meshStandardMaterial color={skinColor} roughness={0.5} />
                      </mesh>
                    </group>
                  )}
                </group>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

/** Camera Controller — điều khiển chuyển góc mượt mà kiểu camera jib truyền hình thực tế */
function CameraController({
  camAngle,
  effectiveIsSpinning,
  transitionMode = "CUT",
}: {
  camAngle: number;
  effectiveIsSpinning: boolean;
  transitionMode?: "CUT" | "MORPH";
}) {
  const { camera, size } = useThree();
  const targetConfig = useRef<CamConfig>(CAM_POSITIONS.DEFAULT);
  const targetLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.15, -0.30));
  const initialized = useRef(false);
  const spinStartTimeRef = useRef<number>(0);
  const targetFovRef = useRef<number>(46);

  useEffect(() => {
    if (effectiveIsSpinning) {
      if (spinStartTimeRef.current === 0) {
        spinStartTimeRef.current = performance.now();
      }
    } else {
      spinStartTimeRef.current = 0;
    }
  }, [effectiveIsSpinning]);

  useEffect(() => {
    const configs: Record<number, CamConfig> = {
      0: CAM_POSITIONS.DEFAULT,
      1: CAM_POSITIONS.CAM1_CENTER,
      2: CAM_POSITIONS.CAM2_WIDE,
      3: CAM_POSITIONS.CAM3_BOARD,
      4: CAM_POSITIONS.CAM4_DISC,
      5: CAM_POSITIONS.CAM5_PLAYER,
      6: CAM_POSITIONS.CAM6_AUDIENCE,
      7: CAM_POSITIONS.CAM7_AUDIENCE_CLOSEUP,
      8: CAM_POSITIONS.CAM8_AUDIENCE_DIAG,
      9: CAM_POSITIONS.CAM9_AUDIENCE_POV,
    };
    const nextCfg = configs[camAngle] ?? CAM_POSITIONS.DEFAULT;
    targetConfig.current = nextCfg;

    // Hard Cut: Instant 0ms broadcast vision mixer cut
    if (transitionMode === "CUT" && initialized.current) {
      if (camAngle === 2 && effectiveIsSpinning) {
        camera.position.set(0.00, 4.40, 22.55);
        targetLookAtRef.current.set(0.00, 1.25, 0.00);
      } else {
        camera.position.set(...nextCfg.pos);
        targetLookAtRef.current.set(...nextCfg.target);
      }
      camera.lookAt(targetLookAtRef.current);
    }
  }, [camAngle, effectiveIsSpinning, transitionMode, camera]);

  useFrame((_, delta) => {
    const persCamera = camera as THREE.PerspectiveCamera;
    const cfg = targetConfig.current;

    if (!initialized.current) {
      camera.position.set(...cfg.pos);
      targetLookAtRef.current.set(...cfg.target);
      camera.lookAt(targetLookAtRef.current);
      initialized.current = true;
      return;
    }

    const elapsed =
      spinStartTimeRef.current > 0 ? (performance.now() - spinStartTimeRef.current) / 1000 : 0;

    // Dynamic Zoom & Dolly logic when spinning
    if (effectiveIsSpinning && spinStartTimeRef.current > 0) {
      if (camAngle === 5) {
        // CAM 5 (0s - 3s): Zoom cận 1.25x vào thí sinh đang quay
        targetFovRef.current = 46 / 1.25; // ~36.8°
        targetLookAtRef.current.set(...CAM_POSITIONS.CAM5_PLAYER.target);
      } else if (camAngle === 2) {
        // CAM 2 (3s - 7s): Bắt đầu từ xa 1.1x CAM 9 ([0, 4.40, 22.55]) rồi dolly-in lướt vào toàn cảnh [0, 2.70, 8.80]
        targetFovRef.current = 46;
        const p = Math.max(0, Math.min(1, (elapsed - 3.0) / 4.0));
        const ease = p * p * (3 - 2 * p); // smoothstep
        const curX = 0;
        const curY = THREE.MathUtils.lerp(4.40, 2.70, ease);
        const curZ = THREE.MathUtils.lerp(22.55, 8.80, ease);
        const tgtY = THREE.MathUtils.lerp(1.25, 1.60, ease);
        const tgtZ = THREE.MathUtils.lerp(0.00, -1.50, ease);

        camera.position.set(curX, curY, curZ);
        targetLookAtRef.current.set(0, tgtY, tgtZ);
        camera.lookAt(targetLookAtRef.current);
      } else if (camAngle === 3) {
        // CAM 3 (7s - 11s): Zoom nhẹ 1.15x trong suốt 4s hiển thị
        const p = Math.max(0, Math.min(1, (elapsed - 7.0) / 4.0));
        const ease = p * p * (3 - 2 * p);
        targetFovRef.current = THREE.MathUtils.lerp(46, 46 / 1.15, ease); // 46 -> ~40.0°
        targetLookAtRef.current.set(...CAM_POSITIONS.CAM3_BOARD.target);
      } else {
        // CAM 4 (11s - 16s): 1.0x không zoom
        targetFovRef.current = 46;
        targetLookAtRef.current.set(...CAM_POSITIONS.CAM4_DISC.target);
      }
    } else {
      // Idle / Non-spinning: standard 46° FOV
      targetFovRef.current = 46;
    }

    // Adaptive Horizontal FOV: tính toán vertical FOV khi màn hình tỉ lệ hẹp hoặc vuông (aspect < 16/9)
    // để chiều rộng toàn cảnh sân khấu (horizontal FOV) không bao giờ bị cắt xén
    const aspect = size.width / Math.max(1, size.height);
    let computedTargetFov = targetFovRef.current;
    if (aspect < 16 / 9) {
      const baseHRad = 2 * Math.atan(Math.tan((targetFovRef.current * Math.PI) / 360) * (16 / 9));
      computedTargetFov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(baseHRad / 2) / aspect));
    }

    // Apply FOV smoothly
    if (Math.abs(persCamera.fov - computedTargetFov) > 0.05) {
      persCamera.fov = THREE.MathUtils.lerp(persCamera.fov, computedTargetFov, delta * 4.5);
      persCamera.updateProjectionMatrix();
    }

    if (transitionMode === "CUT") {
      camera.lookAt(targetLookAtRef.current);
      return;
    }

    // Morph / Jib smooth fly
    const factor = Math.min(1, delta * 4.2);
    camera.position.lerp(new THREE.Vector3(...cfg.pos), factor);
    targetLookAtRef.current.lerp(new THREE.Vector3(...cfg.target), factor);
    camera.lookAt(targetLookAtRef.current);
  });

  return null;
}

/** Giàn đèn trần trường quay TV (Ceiling Studio Lighting Truss & Softboxes) */
function StudioCeilingRig() {
  return (
    <group position={[0, 9.5, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[8.2, 0.12, 16, 64]} />
        <meshStandardMaterial color="#64748b" metalness={0.92} roughness={0.15} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[5.4, 0.1, 16, 48]} />
        <meshStandardMaterial color="#64748b" metalness={0.92} roughness={0.15} />
      </mesh>

      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i * Math.PI * 2) / 8;
        const rx = Math.sin(angle) * 6.8;
        const rz = -Math.cos(angle) * 6.8;
        return (
          <group key={`softbox-${i}`} position={[rx, 0, rz]} rotation={[0, -angle, 0]}>
            <mesh position={[0, 0.15, 0]}>
              <boxGeometry args={[1.9, 0.25, 0.95]} />
              <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <planeGeometry args={[1.8, 0.85]} />
              <meshBasicMaterial color="#f0f9ff" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** Sân khấu trường quay TV cao cấp: Sàn Gương Đen Epoxy Phản Chiếu Sang Trọng (Chuẩn ảnh VTV3 27/06/2015) */
function StudioFloor({ quality = "HIGH" }: { quality?: "HIGH" | "MEDIUM" | "LOW" }) {
  return (
    <group position={[0, -0.75, 0]}>
      {/* 1. Sàn trường quay mở rộng toàn cảnh - Tone đen epoxy bóng gương cao cấp */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[70, 70]} />
        <meshStandardMaterial
          color="#060a14"
          emissive="#020408"
          emissiveIntensity={0.2}
          roughness={0.12}
          metalness={0.88}
        />
      </mesh>

      {/* Lưới kẻ kính sàn trường quay TV phản quang chìm */}
      {[-21, -18, -15, -12, -9, -6, -3, 0, 3, 6, 9, 12, 15, 18, 21].map((x) => (
        <mesh key={`grid-x-${x}`} position={[x, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.02, 50]} />
          <meshStandardMaterial color="#334155" emissive="#1e293b" emissiveIntensity={0.5} />
        </mesh>
      ))}
      {[-21, -18, -15, -12, -9, -6, -3, 0, 3, 6, 9, 12, 15, 18, 21].map((z) => (
        <mesh key={`grid-z-${z}`} position={[0, 0.005, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[50, 0.02]} />
          <meshStandardMaterial color="#334155" emissive="#1e293b" emissiveIntensity={0.5} />
        </mesh>
      ))}

      {/* 2. Vành bậc sân khấu ngoài (Outer Stage Apron Deck R = 12.0m) */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[12.0, 12.05, 0.04, 64]} />
        <meshStandardMaterial
          color="#0b1324"
          emissive="#040812"
          emissiveIntensity={0.2}
          roughness={0.12}
          metalness={0.85}
        />
      </mesh>

      {/* Vành LED biên ngoài sàn trường quay R = 11.9m */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.042, 0]}>
        <ringGeometry args={[11.82, 11.92, 64]} />
        <meshStandardMaterial
          color="#fde047"
          emissive="#f59e0b"
          emissiveIntensity={2.5}
          roughness={0.06}
          metalness={0.92}
        />
      </mesh>

      {/* 3. Sân khấu chính hình tròn nổi (Raised Circular Stage Deck R = 10.0m) */}
      <mesh position={[0, 0.045, 0]} receiveShadow>
        <cylinderGeometry args={[10.0, 10.05, 0.05, 64]} />
        <meshStandardMaterial
          color="#0f172a"
          roughness={0.08}
          metalness={0.92}
        />
      </mesh>

      {/* Mặt sàn gương đen phản chiếu: LOW: Sàn kim loại tối ưu; HIGH/MEDIUM: Reflector tối ưu gương bóng */}
      {quality === "LOW" ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.071, 0]} receiveShadow>
          <circleGeometry args={[9.95, 48]} />
          <meshStandardMaterial
            color="#090f1d"
            roughness={0.14}
            metalness={0.85}
            emissive="#040710"
            emissiveIntensity={0.3}
          />
        </mesh>
      ) : (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.071, 0]} receiveShadow>
          <circleGeometry args={[9.95, 64]} />
          <MeshReflectorMaterial
            blur={[250, 80]}
            resolution={quality === "HIGH" ? 512 : 256}
            mirror={0.52}
            mixBlur={0.8}
            mixStrength={2.0}
            roughness={0.10}
            depthScale={0}
            minDepthThreshold={0}
            maxDepthThreshold={40}
            color="#080e1c"
            metalness={0.85}
          />
        </mesh>
      )}

      {/* Vành viền Chrome bảo vệ quanh mép sàn khấu */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.073, 0]}>
        <ringGeometry args={[9.92, 10.02, 64]} />
        <meshStandardMaterial color="#f8fafc" metalness={0.98} roughness={0.03} />
      </mesh>

      {/* Các dải chỉ bạc LED uốn lượn cong mềm mại trên mặt sàn theo ảnh VTV3 27/06/2015 */}
      {[
        { r1: 3.35, r2: 3.42, col: "#e2e8f0", em: "#cbd5e1", intensity: 1.8 },
        { r1: 5.40, r2: 5.48, col: "#94a3b8", em: "#64748b", intensity: 1.2 },
        { r1: 7.60, r2: 7.70, col: "#cbd5e1", em: "#94a3b8", intensity: 1.4 },
      ].map((ring, idx) => (
        <mesh key={`floor-ribbon-${idx}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0735, 0]}>
          <ringGeometry args={[ring.r1, ring.r2, 64]} />
          <meshStandardMaterial
            color={ring.col}
            emissive={ring.em}
            emissiveIntensity={ring.intensity}
            roughness={0.1}
            metalness={0.85}
          />
        </mesh>
      ))}

      {/* Vòng spotlight sân khấu hoàng kim ôm chân cỗ máy nón 5.4m */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.074, 0]}>
        <ringGeometry args={[3.25, 3.45, 64]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#f59e0b"
          emissiveIntensity={2.5}
          roughness={0.06}
          metalness={0.94}
        />
      </mesh>

      {/* Soft Center Stage Glow Disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0735, 0]}>
        <circleGeometry args={[3.24, 48]} />
        <meshStandardMaterial
          color="#1e293b"
          emissive="#0f172a"
          emissiveIntensity={0.6}
          roughness={0.1}
          metalness={0.8}
        />
      </mesh>
    </group>
  );
}

/** Hệ thống vách kiến trúc trường quay khép kín (Enclosed Studio Acoustic Walls)
 *  Loại bỏ hoàn toàn phông xanh vô tận (cyclorama leak), bao bọc trọn vẹn sân khấu bằng
 *  vách ốp nan gỗ than chì/navy cao cấp, nẹp kim loại vàng brass và dải đèn hắt kẽ cove lights.
 */
function EnclosedStudioWalls() {
  return (
    <group position={[0, -0.75, 0]}>
      {/* ── 1. VÁCH HẬU SÂN KHẤU CHÍNH DIỆN (Backstage Wall tại Z = -8.6m) ── */}
      {/* Cánh vách bên trái vòm cửa: từ X = -5.7m đến X = -14.0m */}
      <group position={[-9.85, 4.8, -8.6]}>
        <mesh receiveShadow>
          <boxGeometry args={[8.3, 9.6, 0.2]} />
          <meshStandardMaterial color="#080e1a" roughness={0.7} metalness={0.25} />
        </mesh>
        {/* Nan gỗ / lam kim loại dọc trang trí cách âm sang trọng */}
        {[-3.6, -2.7, -1.8, -0.9, 0, 0.9, 1.8, 2.7, 3.6].map((fx, i) => (
          <group key={`back-left-fin-${i}`} position={[fx, 0, 0.12]}>
            <mesh>
              <boxGeometry args={[0.12, 9.2, 0.08]} />
              <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.6} />
            </mesh>
            {/* Nẹp viền vàng kim loại phát sáng */}
            <mesh position={[0, 0, 0.045]}>
              <boxGeometry args={[0.035, 9.2, 0.01]} />
              <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={0.8} metalness={0.9} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Cánh vách bên phải vòm cửa: từ X = +5.7m đến X = +14.0m */}
      <group position={[9.85, 4.8, -8.6]}>
        <mesh receiveShadow>
          <boxGeometry args={[8.3, 9.6, 0.2]} />
          <meshStandardMaterial color="#080e1a" roughness={0.7} metalness={0.25} />
        </mesh>
        {/* Nan gỗ / lam kim loại dọc trang trí */}
        {[-3.6, -2.7, -1.8, -0.9, 0, 0.9, 1.8, 2.7, 3.6].map((fx, i) => (
          <group key={`back-right-fin-${i}`} position={[fx, 0, 0.12]}>
            <mesh>
              <boxGeometry args={[0.12, 9.2, 0.08]} />
              <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.6} />
            </mesh>
            <mesh position={[0, 0, 0.045]}>
              <boxGeometry args={[0.035, 9.2, 0.01]} />
              <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={0.8} metalness={0.9} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Dầm trên vòm cửa (Header Wall): từ Y = 7.7m đến Y = 9.6m */}
      <mesh position={[0, 8.65, -8.6]}>
        <boxGeometry args={[11.6, 1.9, 0.2]} />
        <meshStandardMaterial color="#080e1a" roughness={0.7} metalness={0.25} />
      </mesh>

      {/* ── 2. VÁCH CÁNH PHẢI TRƯỜNG QUAY (Stage Right Wall tại X = +14.0m) ── */}
      <group position={[14.0, 4.8, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[17.2, 9.6, 0.2]} />
          <meshStandardMaterial color="#060a14" roughness={0.8} metalness={0.2} />
        </mesh>
        {/* Dải đèn LED dọc trường quay cánh phải */}
        {[-6, -3, 0, 3, 6].map((lx, i) => (
          <mesh key={`right-wall-light-${i}`} position={[lx, 0, 0.12]}>
            <boxGeometry args={[0.08, 8.4, 0.04]} />
            <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={1.4} />
          </mesh>
        ))}
      </group>

      {/* ── 3. VÁCH CÁNH TRÁI PHÍA SAU BẢNG Ô CHỮ (Stage Left Wall tại X = -14.0m) ── */}
      <group position={[-14.0, 4.8, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[17.2, 9.6, 0.2]} />
          <meshStandardMaterial color="#060a14" roughness={0.8} metalness={0.2} />
        </mesh>
      </group>

      {/* Đèn hắt tường vàng ấm thanh lịch hai bên cánh vách */}
      {[-12, -9, 9, 12].map((wx, i) => (
        <pointLight
          key={`wall-cove-light-${i}`}
          position={[wx, 3.8, -8.3]}
          color="#fbbf24"
          intensity={4.5}
          distance={8.0}
        />
      ))}
    </group>
  );
}

// ── Main Exported Component ───────────────────────────────────────────────────

function WheelStudio3DSceneComponent({
  sectors,
  clientWheelAngle,
  effectiveIsSpinning,
  selectedSector,
  teams,
  roundScores,
  currentTurnTeamId,
  tossUpBuzzedTeamId,
  isTossUpRound,
  phase,
  boardStage,
  camAngle,
  edition = "VIETNAMESE",
  className = "",
  currentPuzzle,
  highlightedIndices,
  animRevealedIndices,
  hostessXPercent,
  hostessPose,
  showClueOnCam3 = true,
  onCamAngleChange,
}: WheelStudio3DSceneProps) {
  const [internalCam, setInternalCam] = useState<number>(camAngle || 0);
  const [transitionMode, setTransitionMode] = useState<"CUT" | "MORPH">("CUT");
  const [showClue, setShowClue] = useState<boolean>(showClueOnCam3);

  // Mức cấu hình đồ họa: HIGH (512 Reflector + 25Hz LED), MEDIUM (256 Reflector + 15Hz LED), LOW (Satin chuẩn 0 pass phụ + static LED)
  const [quality, setQuality] = useState<"HIGH" | "MEDIUM" | "LOW">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("wheel_3d_quality");
      if (saved === "HIGH" || saved === "MEDIUM" || saved === "LOW") return saved;
      if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) return "MEDIUM";
    }
    return "HIGH";
  });

  const cycleQuality = () => {
    setQuality((prev) => {
      const next = prev === "HIGH" ? "MEDIUM" : prev === "MEDIUM" ? "LOW" : "HIGH";
      if (typeof window !== "undefined") {
        localStorage.setItem("wheel_3d_quality", next);
      }
      return next;
    });
  };

  // Sync camAngle from props
  useEffect(() => {
    setInternalCam(camAngle || 0);
  }, [camAngle]);

  useEffect(() => {
    if (highlightedIndices && highlightedIndices.size > 0) {
      setInternalCam(3);
    }
  }, [highlightedIndices]);

  // Keyboard shortcut listener (keys 1 - 9)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 9) {
        setInternalCam(num);
        onCamAngleChange?.(num);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCamAngleChange]);

  // Ensure Roboto Slab font link is loaded in head
  useEffect(() => {
    if (typeof document === "undefined") return;
    const fontId = "gameshow-roboto-slab-link";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@700;800;900&family=Merriweather:wght@900&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  return (
    <div className={`w-full h-full relative select-none ${className}`}>
      <Canvas
        shadows={quality === "HIGH"}
        dpr={quality === "HIGH" ? [1, 1.5] : quality === "MEDIUM" ? [1, 1.25] : [1, 1.0]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={{ fov: 46, near: 0.1, far: 100, position: [0, 3.8, 5.4] }}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          background: "radial-gradient(ellipse at 50% 40%, #0c1829 0%, #050a14 50%, #010307 100%)",
        }}
      >
        <CameraController camAngle={internalCam} effectiveIsSpinning={effectiveIsSpinning} transitionMode={transitionMode} />

        {/* ── SUPERCHARGED 6-POINT BROADCAST STUDIO LIGHTING ── */}
        <ambientLight intensity={3.2} color="#eff6ff" />
        <directionalLight position={[0, 14, 6]} intensity={3.5} color="#dbeafe" />

        {/* Key Spotlight: trực diện rọi tâm nón */}
        <spotLight
          position={[0, 9.5, 4.0]}
          intensity={14.0}
          angle={0.75}
          penumbra={0.3}
          castShadow={quality === "HIGH"}
          shadow-mapSize={quality === "HIGH" ? [512, 512] : [256, 256]}
          color="#ffffff"
        />

        {/* Dedicated Floor Specular Downlight (Rọi sàn tạo vệt sáng bóng gương chói lọi) */}
        <spotLight
          position={[0, 10.0, 1.5]}
          intensity={24.0}
          angle={0.9}
          penumbra={0.4}
          color="#bae6fd"
        />

        {/* Front Camera Fill Spotlight */}
        <spotLight position={[0, 5.0, 5.5]} intensity={9.0} angle={0.8} penumbra={0.4} color="#fffbeb" />

        {/* Left Studio Floor Wash Spotlight */}
        <spotLight position={[-5.0, 6.5, 2.5]} intensity={8.5} angle={0.8} penumbra={0.5} color="#fef08a" />

        {/* Right Studio Floor Wash Spotlight */}
        <spotLight position={[5.0, 6.5, 2.5]} intensity={8.5} angle={0.8} penumbra={0.5} color="#bae6fd" />

        {/* Back Rim / Kicker Light */}
        <pointLight position={[0, 4.5, -4.5]} color="#93c5fd" intensity={8.0} />

        {/* Ground Warm Gold Ambiance Fill */}
        <pointLight position={[0, 0.4, 3.5]} color="#fde68a" intensity={4.5} />

        {/* Center Under-Pedestal Uplight */}
        <pointLight position={[0, -0.4, 0]} color="#fef08a" intensity={6.0} distance={5.0} />

        {/* Dedicated Needle Studio Light at 9 o'clock */}
        <pointLight position={[-2.30, 1.80, 0.60]} intensity={6.0} distance={4.0} color="#fffbeb" />
        <spotLight position={[-3.2, 3.2, 1.5]} intensity={5.5} angle={0.6} penumbra={0.4} color="#fef08a" />

        {/* ── Studio Elements ── */}
        <StudioCeilingRig />
        <EnclosedStudioWalls />
        <StudioSetWingMotifs />
        <BackdropCurvedLedScreen quality={quality} />
        <StudioFloor quality={quality} />
        <WheelMachineGroup
          sectors={sectors}
          clientWheelAngle={clientWheelAngle}
          effectiveIsSpinning={effectiveIsSpinning}
          selectedSector={selectedSector}
        />
        {/* Bục đứng riêng biệt cho MC ngay bên trái bục thí sinh số 1 */}
        <DedicatedMcStation />
        {/* Bục thí sinh kê cao chuẩn VTV3 (đã xoá hộp trên đầu) */}
        <ElevatedContestantDaisBehindWheel
          teams={teams}
          roundScores={roundScores}
          currentTurnTeamId={currentTurnTeamId}
          tossUpBuzzedTeamId={tossUpBuzzedTeamId}
          isTossUpRound={isTossUpRound}
          phase={phase}
          edition={edition}
          effectiveIsSpinning={effectiveIsSpinning}
        />
        {/* Bảng Ô Chữ 3D tại Cánh Trái (Z ~ -1.0m) & Người mẫu trợ lý */}
        <Studio3DPuzzleBoard
          currentPuzzle={currentPuzzle}
          phase={phase}
          boardStage={boardStage}
          highlightedIndices={highlightedIndices}
          animRevealedIndices={animRevealedIndices}
          hostessXPercent={hostessXPercent}
          hostessPose={hostessPose}
        />
        {/* Khán đài khán giả 6 tầng bậc thang & Phông nền Trống đồng Đông Sơn mạ vàng Việt Nam (Z = +8.6m - +16.5m) */}
        <AudienceAmphitheaterVietnamese />
      </Canvas>

      {/* ── LOWER-THIRD CÂU HỎI / GỢI Ý TRÊN CAM 3 (TỰ ĐỘNG ẨN KHI HẾT VÒNG) ── */}
      {internalCam === 3 &&
        phase !== "ROUND_RECAP" &&
        showClue &&
        Boolean(currentPuzzle?.category || currentPuzzle?.description || currentPuzzle?.clue || currentPuzzle?.crosswordWords) && (() => {
          const isCrossword = currentPuzzle?.puzzleType === "CROSSWORD";
          const effectiveMode = isCrossword ? "CATEGORY" : (currentPuzzle?.clueDisplayMode || (edition === "ENGLISH" ? "CATEGORY" : "CLUE"));
          const isCategoryMode = effectiveMode === "CATEGORY";
          const rawClueText = (currentPuzzle?.description || currentPuzzle?.clue || "")
            .replace(/\s*\(\s*\d+\s*(ký\s*tự|chữ\s*cái|chữ|letters|chars?)\s*\)/gi, "")
            .trim();
          const categoryText = (currentPuzzle?.category || "").trim();

          const labelText = isCrossword
            ? (edition === "ENGLISH" ? "CROSSWORD" : "Ô CHỮ LIÊN KẾT")
            : isCategoryMode
            ? (edition === "ENGLISH" ? "CATEGORY" : "CHỦ ĐỀ")
            : (edition === "ENGLISH" ? "CLUE" : "GỢI Ý");

          const displayText = isCrossword
            ? (categoryText
                ? (rawClueText ? `${categoryText} — Gợi ý chung: ${rawClueText}` : categoryText)
                : (rawClueText || "Tìm các từ khóa có ký tự giao nhau trên bảng"))
            : isCategoryMode
            ? (categoryText || rawClueText)
            : (rawClueText || categoryText);

          const isSameLetter = categoryText && /SAME[\s_-]*LETTER|CÙNG CHỮ CÁI ĐẦU/i.test(categoryText);

          return (
            <div className="absolute bottom-11 left-1/2 -translate-x-1/2 z-40 max-w-[92vw] sm:max-w-2xl md:max-w-3xl px-4 py-1.5 rounded-xl bg-slate-950/90 border border-amber-400/60 shadow-[0_4px_24px_rgba(0,0,0,0.8)] backdrop-blur-md flex items-center gap-2.5 animate-fade-in pointer-events-auto">
              <span className="text-base shrink-0">{isCrossword ? "🔀" : (isCategoryMode ? "🏷️" : "💡")}</span>
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/50 font-black text-amber-300 uppercase tracking-wider text-[11px] sm:text-xs shrink-0">
                {labelText}
              </span>
              {isCrossword && currentPuzzle?.crosswordWords && (
                <span className="px-2 py-0.5 rounded-md bg-violet-500/20 border border-violet-400/50 font-black text-violet-300 text-[10px] sm:text-xs shrink-0">
                  {currentPuzzle.crosswordWords.length} {edition === "ENGLISH" ? "WORDS" : "TỪ KHÓA"}
                </span>
              )}
              {isSameLetter && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/50 font-black text-emerald-300 text-[10px] shrink-0 animate-pulse">
                  ✨ +$1,000
                </span>
              )}
              <div
                className="font-semibold text-white text-xs sm:text-sm tracking-wide truncate flex-1 text-left"
                title={displayText}
              >
                {displayText}
              </div>
              <button
                type="button"
                onClick={() => setShowClue(false)}
                className="ml-auto text-xs text-white/50 hover:text-white/90 p-1 rounded-md transition-colors shrink-0"
                title="Ẩn thanh thông tin trên CAM 3"
              >
                ✕
              </button>
            </div>
          );
        })()}

      {/* ── BROADCAST CAMERA DIRECTOR BAR (MICRO DOCK MỜ 25% OPACITY) ── */}
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 p-1 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10 shadow-lg opacity-25 hover:opacity-100 transition-opacity duration-300">
        {[
          { id: 1, label: "CAM 1: Nón" },
          { id: 2, label: "CAM 2: Toàn Cảnh" },
          { id: 3, label: "CAM 3: Ô Chữ" },
          { id: 4, label: "CAM 4: Cận Nón" },
          { id: 5, label: "CAM 5: Thí Sinh" },
          { id: 6, label: "CAM 6: Khán Đài" },
          { id: 7, label: "CAM 7: Cận Ghế" },
          { id: 8, label: "CAM 8: Góc Chéo" },
          { id: 9, label: "CAM 9: POV" },
        ].map((c) => {
          const isActive = internalCam === c.id;
          return (
            <button
              key={c.id}
              data-cam-id={c.id}
              type="button"
              onClick={() => {
                setInternalCam(c.id);
                onCamAngleChange?.(c.id);
              }}
              title={c.label}
              className={`w-5 h-5 rounded text-[11px] font-bold transition-all flex items-center justify-center cursor-pointer ${
                isActive
                  ? "bg-amber-400 text-slate-950 font-black shadow-[0_0_8px_#f59e0b]"
                  : "bg-white/5 hover:bg-white/20 text-white/70 hover:text-white"
              }`}
            >
              {c.id}
            </button>
          );
        })}

        {/* Nút chuyển đổi chế độ Camera Switcher: Cắt Nhanh vs Lướt Mượt */}
        <div className="h-3 w-px bg-white/20 mx-0.5" />
        <button
          type="button"
          onClick={() => setTransitionMode((prev) => (prev === "CUT" ? "MORPH" : "CUT"))}
          className={`px-1.5 h-5 rounded text-[10px] font-bold transition-all flex items-center justify-center cursor-pointer border ${
            transitionMode === "CUT"
              ? "bg-amber-500/20 text-amber-300 border-amber-400/40"
              : "bg-cyan-500/20 text-cyan-300 border-cyan-400/40"
          }`}
          title={
            transitionMode === "CUT"
              ? "CẮT NHANH (0ms)"
              : "LƯỚT MƯỢT (Morph)"
          }
        >
          {transitionMode === "CUT" ? "✂" : "🎥"}
        </button>

        {/* Nút chuyển đổi mức cấu hình đồ họa (Quality Preset Toggle) */}
        <div className="h-3 w-px bg-white/20 mx-0.5" />
        <button
          type="button"
          onClick={cycleQuality}
          className="px-1.5 h-5 rounded text-[10px] font-bold transition-all flex items-center justify-center cursor-pointer bg-white/5 hover:bg-white/20 text-amber-300 border border-amber-400/30"
          title={`Đồ họa: ${quality === "HIGH" ? "Cao (HQ)" : quality === "MEDIUM" ? "Vừa (MD)" : "Siêu nhẹ (LT)"}`}
        >
          {quality === "HIGH" ? "HQ" : quality === "MEDIUM" ? "MD" : "LT"}
        </button>

        {/* Toggle hiển thị lại Gợi ý trên CAM 3 nếu bị tắt */}
        {!showClue && internalCam === 3 && (
          <>
            <div className="h-3 w-px bg-white/20 mx-0.5" />
            <button
              type="button"
              onClick={() => setShowClue(true)}
              className="px-1.5 h-5 rounded text-[10px] font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
              title="Hiện lại gợi ý trên CAM 3"
            >
              💡
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const WheelStudio3DScene = React.memo(WheelStudio3DSceneComponent);
export default WheelStudio3DScene;
