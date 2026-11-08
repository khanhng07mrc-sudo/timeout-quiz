/**
 * Shared Master Broadcast Backdrop Artwork Painter for Đường Lên Đỉnh Olympia S14.
 * Renders a 4096x1024 high-resolution panoramic cyclorama background:
 * - 3-tiered crystalline low-poly Olympia mountain massif (120+ Delaunay triangular facets)
 * - Sweeping wide foothills merging seamlessly into lateral horizon mountain ranges
 * - Graceful S-curve luminous canyon road path with subtle chevron guide waves
 * - Summit sunrise corona halo with 8-pointed golden star and single Olympic pennant flag
 * - 12 comprehensive tech, science, AI, math, and knowledge icons in clean 3D safe corridors
 */

export interface BackdropCanvasOptions {
  width?: number;
  height?: number;
}

export function paintOlympiaBackdropCanvas(
  canvas: HTMLCanvasElement,
  options: BackdropCanvasOptions = {}
): HTMLCanvasElement {
  const w = options.width || 4096;
  const h = options.height || 1024;
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // ── 1. DEEP MIDNIGHT COSMIC SAPPHIRE SKY GRADIENT ──
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
  skyGrad.addColorStop(0.00, "#010410"); // Pitch cosmic apex
  skyGrad.addColorStop(0.20, "#030e2a"); // Deep midnight navy
  skyGrad.addColorStop(0.50, "#061f52"); // Broadcast sapphire
  skyGrad.addColorStop(0.80, "#0a2d6c"); // Horizon electric indigo
  skyGrad.addColorStop(1.00, "#02091c"); // Floor blend
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);

  // ── 2. CONSTELATION FIELD & COSMIC DUST ──
  const pseudoRand = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };
  for (let i = 0; i < 480; i++) {
    const sx = pseudoRand(i * 17.13) * w;
    const sy = pseudoRand(i * 29.71) * (h * 0.76);
    const sr = 0.7 + pseudoRand(i * 5.31) * 2.3;
    const alpha = 0.25 + pseudoRand(i * 3.17) * 0.70;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fillStyle = i % 3 === 0 ? `rgba(254, 240, 138, ${alpha})` : `rgba(224, 242, 254, ${alpha})`;
    ctx.fill();
  }

  // ── 3. DISTANT HORIZON MOUNTAIN RIDGES (LATERAL WINGS) ──
  ctx.save();
  // Left Wing Horizon Ridge
  const leftHorizonGrad = ctx.createLinearGradient(0, 520, 0, h);
  leftHorizonGrad.addColorStop(0, "#061a3d");
  leftHorizonGrad.addColorStop(1, "#020714");
  ctx.fillStyle = leftHorizonGrad;
  ctx.beginPath();
  ctx.moveTo(0, 700);
  ctx.lineTo(260, 600);
  ctx.lineTo(540, 650);
  ctx.lineTo(820, 570);
  ctx.lineTo(1120, 640);
  ctx.lineTo(1420, 570);
  ctx.lineTo(1720, 710);
  ctx.lineTo(1720, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0, 700); ctx.lineTo(260, 600); ctx.lineTo(540, 650); ctx.lineTo(820, 570); ctx.lineTo(1120, 640); ctx.lineTo(1420, 570); ctx.lineTo(1720, 710);
  ctx.stroke();

  // Right Wing Horizon Ridge
  const rightHorizonGrad = ctx.createLinearGradient(0, 520, 0, h);
  rightHorizonGrad.addColorStop(0, "#061a3d");
  rightHorizonGrad.addColorStop(1, "#020714");
  ctx.fillStyle = rightHorizonGrad;
  ctx.beginPath();
  ctx.moveTo(2376, 710);
  ctx.lineTo(2676, 570);
  ctx.lineTo(2976, 640);
  ctx.lineTo(3276, 570);
  ctx.lineTo(3556, 650);
  ctx.lineTo(3836, 600);
  ctx.lineTo(w, 700);
  ctx.lineTo(w, h);
  ctx.lineTo(2376, h);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(2376, 710); ctx.lineTo(2676, 570); ctx.lineTo(2976, 640); ctx.lineTo(3276, 570); ctx.lineTo(3556, 650); ctx.lineTo(3836, 600); ctx.lineTo(w, 700);
  ctx.stroke();
  ctx.restore();

  // ── 4. 3-TIERED OLYMPIA MOUNTAIN MASSIF & CRYSTALLINE DELAUNAY MESH ──
  const mx = w / 2; // 2048 center axis
  const apexY = 305; // Calibrated summit apex (safe in CAM 13 without clipping, Y_world = 5.72m)

  // Radiant Sunrise Corona Bloom behind Summit Apex
  ctx.save();
  const sunHalo = ctx.createRadialGradient(mx, apexY, 0, mx, apexY, 520);
  sunHalo.addColorStop(0.00, "rgba(254, 240, 138, 0.96)");
  sunHalo.addColorStop(0.18, "rgba(251, 191, 36, 0.68)");
  sunHalo.addColorStop(0.45, "rgba(56, 189, 248, 0.38)");
  sunHalo.addColorStop(0.80, "rgba(7, 37, 94, 0.15)");
  sunHalo.addColorStop(1.00, "rgba(2, 6, 23, 0.0)");
  ctx.fillStyle = sunHalo;
  ctx.fillRect(mx - 750, apexY - 260, 1500, 950);
  ctx.restore();

  // Wide Mountain Foothills Silhouette (Sweeping seamlessly from X = 720 to 3376)
  ctx.save();
  const foothillsGrad = ctx.createLinearGradient(0, apexY, 0, h);
  foothillsGrad.addColorStop(0.0, "#072b68");
  foothillsGrad.addColorStop(0.4, "#051f4d");
  foothillsGrad.addColorStop(0.8, "#031435");
  foothillsGrad.addColorStop(1.0, "#010817");
  ctx.fillStyle = foothillsGrad;
  ctx.beginPath();
  ctx.moveTo(mx, apexY);
  // Left Slope & Foothill Profile
  ctx.lineTo(mx - 180, 395);
  ctx.lineTo(mx - 360, 465); // Left Shoulder Peak
  ctx.lineTo(mx - 540, 545);
  ctx.lineTo(mx - 760, 635);
  ctx.lineTo(mx - 1000, 725);
  ctx.lineTo(720, 835); // Sweeping left foothill
  ctx.lineTo(720, h);
  ctx.lineTo(mx, h);
  ctx.lineTo(3376, h);
  ctx.lineTo(3376, 835); // Sweeping right foothill
  ctx.lineTo(mx + 1000, 725);
  ctx.lineTo(mx + 760, 635);
  ctx.lineTo(mx + 540, 545);
  ctx.lineTo(mx + 360, 465); // Right Shoulder Peak
  ctx.lineTo(mx + 180, 395);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Structured Triangular Crystalline Lattice (Delaunay Facets)
  // Structured lattice nodes spanning the mountain body
  // Left half nodes (symmetric counterpart will be mirrored for right half)
  const leftNodes: Array<[number, number]> = [
    [mx, apexY], // 0: Apex
    [mx - 90, 370], // 1
    [mx - 190, 410], // 2
    [mx - 70, 465], // 3
    [mx - 220, 480], // 4
    [mx - 360, 465], // 5: Left shoulder peak
    [mx - 120, 545], // 6
    [mx - 280, 560], // 7
    [mx - 430, 550], // 8
    [mx - 540, 545], // 9
    [mx - 140, 635], // 10
    [mx - 320, 645], // 11
    [mx - 490, 640], // 12
    [mx - 650, 630], // 13
    [mx - 760, 635], // 14
    [mx - 160, 735], // 15
    [mx - 360, 740], // 16
    [mx - 560, 735], // 17
    [mx - 760, 730], // 18
    [mx - 1000, 725], // 19
    [mx - 180, 850], // 20
    [mx - 400, 850], // 21
    [mx - 640, 845], // 22
    [mx - 900, 840], // 23
    [mx - 1160, 835], // 24
    [mx - 200, 1024], // 25: Base canyon left
    [mx - 440, 1024], // 26
    [mx - 720, 1024], // 27
    [mx - 1020, 1024], // 28
    [mx - 1328, 1024], // 29: Far left foothill base
  ];

  // Right nodes are mirrored across mx with slight organic jitter
  const rightNodes: Array<[number, number]> = leftNodes.map(([x, y], idx) => {
    if (idx === 0) return [mx, apexY];
    const dx = mx - x;
    const jitterY = (idx % 4 - 1.5) * 4;
    return [mx + dx, y + jitterY];
  });

  // Triangular face indices for the left lattice
  const triangleFaces: Array<[number, number, number, string, string]> = [
    // Summit Pyramid (Apex Tier)
    [0, 1, 2, "#38bdf8", "#0284c7"],
    [0, 2, 5, "#0284c7", "#0369a1"],
    [1, 3, 2, "#7dd3fc", "#0284c7"],
    [2, 3, 4, "#0ea5e9", "#0369a1"],
    [2, 4, 5, "#0284c7", "#075985"],
    [4, 7, 5, "#0369a1", "#075985"],
    [5, 7, 8, "#0284c7", "#0c4a6e"],
    [5, 8, 9, "#0369a1", "#082f49"],

    // Tier 2 (Mid-Mountain Ribs)
    [3, 6, 4, "#38bdf8", "#0284c7"],
    [4, 6, 7, "#0ea5e9", "#0369a1"],
    [7, 6, 11, "#0369a1", "#075985"],
    [7, 11, 8, "#0284c7", "#075985"],
    [8, 11, 12, "#0369a1", "#0c4a6e"],
    [8, 12, 9, "#0284c7", "#082f49"],
    [9, 12, 13, "#075985", "#082f49"],
    [9, 13, 14, "#0369a1", "#051f38"],

    // Tier 3 (Lower Slopes & Canyon Walls)
    [6, 10, 11, "#38bdf8", "#0369a1"],
    [11, 10, 16, "#0ea5e9", "#075985"],
    [11, 16, 12, "#0369a1", "#075985"],
    [12, 16, 17, "#0284c7", "#0c4a6e"],
    [12, 17, 13, "#0369a1", "#082f49"],
    [13, 17, 18, "#075985", "#082f49"],
    [13, 18, 14, "#0284c7", "#051f38"],
    [14, 18, 19, "#0369a1", "#041528"],

    // Tier 4 (Foothill Apron)
    [10, 15, 16, "#38bdf8", "#0284c7"],
    [16, 15, 21, "#0ea5e9", "#0369a1"],
    [16, 21, 17, "#0369a1", "#075985"],
    [17, 21, 22, "#0284c7", "#075985"],
    [17, 22, 18, "#0369a1", "#082f49"],
    [18, 22, 23, "#075985", "#082f49"],
    [18, 23, 19, "#0284c7", "#051f38"],
    [19, 23, 24, "#0369a1", "#041528"],

    // Tier 5 (Base to Floor)
    [15, 20, 21, "#38bdf8", "#0369a1"],
    [21, 20, 26, "#0ea5e9", "#075985"],
    [21, 26, 22, "#0369a1", "#075985"],
    [22, 26, 27, "#0284c7", "#082f49"],
    [22, 27, 23, "#0369a1", "#082f49"],
    [23, 27, 28, "#075985", "#051f38"],
    [23, 28, 24, "#0284c7", "#051f38"],
    [24, 28, 29, "#0369a1", "#031020"],
    [20, 25, 26, "#0ea5e9", "#075985"],
  ];

  // Helper to render triangular facet with multi-stop linear gradient & crystal stroke
  const drawTriangle = (
    p1: [number, number],
    p2: [number, number],
    p3: [number, number],
    c1: string,
    c2: string,
    isRight = false
  ) => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.lineTo(p3[0], p3[1]);
    ctx.closePath();

    const minX = Math.min(p1[0], p2[0], p3[0]);
    const maxX = Math.max(p1[0], p2[0], p3[0]);
    const minY = Math.min(p1[1], p2[1], p3[1]);
    const maxY = Math.max(p1[1], p2[1], p3[1]);

    const grad = ctx.createLinearGradient(
      isRight ? maxX : minX,
      minY,
      isRight ? minX : maxX,
      maxY
    );
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Subtle crystalline facet outline
    ctx.strokeStyle = "rgba(186, 230, 253, 0.42)";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
  };

  // 1. Draw Left Facets
  triangleFaces.forEach(([i1, i2, i3, c1, c2]) => {
    drawTriangle(leftNodes[i1], leftNodes[i2], leftNodes[i3], c1, c2, false);
  });

  // 2. Draw Right Facets (Mirrored with adjusted shadow values)
  triangleFaces.forEach(([i1, i2, i3, c1, c2]) => {
    // Right flank receives rich cobalt chiaroscuro shading
    const rightC1 = c1 === "#38bdf8" ? "#0ea5e9" : c1 === "#7dd3fc" ? "#38bdf8" : c1;
    const rightC2 = c2 === "#0284c7" ? "#0369a1" : c2 === "#0369a1" ? "#075985" : c2;
    drawTriangle(rightNodes[i1], rightNodes[i2], rightNodes[i3], rightC1, rightC2, true);
  });

  // 3. Highlighted Mountain Crest Ridges
  ctx.save();
  ctx.strokeStyle = "rgba(224, 242, 254, 0.75)";
  ctx.lineWidth = 2.2;
  ctx.shadowColor = "#38bdf8";
  ctx.shadowBlur = 10;
  // Left shoulder crest
  ctx.beginPath();
  ctx.moveTo(mx, apexY);
  ctx.lineTo(leftNodes[2][0], leftNodes[2][1]);
  ctx.lineTo(leftNodes[5][0], leftNodes[5][1]);
  ctx.lineTo(leftNodes[9][0], leftNodes[9][1]);
  ctx.lineTo(leftNodes[14][0], leftNodes[14][1]);
  ctx.lineTo(leftNodes[19][0], leftNodes[19][1]);
  ctx.lineTo(leftNodes[24][0], leftNodes[24][1]);
  ctx.stroke();

  // Right shoulder crest
  ctx.beginPath();
  ctx.moveTo(mx, apexY);
  ctx.lineTo(rightNodes[2][0], rightNodes[2][1]);
  ctx.lineTo(rightNodes[5][0], rightNodes[5][1]);
  ctx.lineTo(rightNodes[9][0], rightNodes[9][1]);
  ctx.lineTo(rightNodes[14][0], rightNodes[14][1]);
  ctx.lineTo(rightNodes[19][0], rightNodes[19][1]);
  ctx.lineTo(rightNodes[24][0], rightNodes[24][1]);
  ctx.stroke();
  ctx.restore();

  // 4. Glowing Crystalline Vertex Constellation Dots
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "#38bdf8";
  ctx.shadowBlur = 8;
  const majorIndices = [0, 1, 2, 5, 6, 7, 8, 9, 11, 12, 13, 14, 16, 17, 18, 19];
  majorIndices.forEach((idx) => {
    ctx.beginPath();
    ctx.arc(leftNodes[idx][0], leftNodes[idx][1], 3.0, 0, Math.PI * 2);
    ctx.fill();
    if (idx !== 0) {
      ctx.beginPath();
      ctx.arc(rightNodes[idx][0], rightNodes[idx][1], 3.0, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  ctx.restore();

  // ── 5. ACCURATE LUMINOUS S-CURVE CANYON ROAD ("CON ĐƯỜNG VƯƠN TỚI ĐỈNH NÚI") ──
  // Smoothly ascending S-curve canyon path tapering naturally from bottom to summit
  ctx.save();
  const roadApexY = apexY + 45; // Summit arrival
  const roadBaseHalfW = 165;
  const roadApexHalfW = 14;

  // Luminous Path Base Layer (Multi-stop smooth energy gradient)
  const roadGrad = ctx.createLinearGradient(0, h, 0, roadApexY);
  roadGrad.addColorStop(0.00, "rgba(2, 132, 199, 0.95)");
  roadGrad.addColorStop(0.35, "rgba(14, 165, 233, 0.98)");
  roadGrad.addColorStop(0.70, "rgba(56, 189, 248, 1.00)");
  roadGrad.addColorStop(0.92, "rgba(224, 242, 254, 1.00)");
  roadGrad.addColorStop(1.00, "rgba(254, 240, 138, 1.00)");

  // Left & Right S-Curve Outer Boundary Curves
  // Gentle S-curve: curves slightly right at mid-lower canyon, then left towards peak
  ctx.beginPath();
  ctx.moveTo(mx - roadBaseHalfW, h);
  ctx.bezierCurveTo(
    mx - 140 + 35, 870,
    mx - 80 - 25, 620,
    mx - roadApexHalfW, roadApexY
  );
  ctx.lineTo(mx + roadApexHalfW, roadApexY);
  ctx.bezierCurveTo(
    mx + 80 - 25, 620,
    mx + 140 + 35, 870,
    mx + roadBaseHalfW, h
  );
  ctx.closePath();
  ctx.fillStyle = roadGrad;
  ctx.shadowColor = "#0284c7";
  ctx.shadowBlur = 28;
  ctx.fill();

  // Outer Glowing Neon Ribbons (Cyan `#38bdf8` & Gold `#fbbf24`)
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 4.5;
  ctx.shadowColor = "#38bdf8";
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(mx - roadBaseHalfW, h);
  ctx.bezierCurveTo(
    mx - 140 + 35, 870,
    mx - 80 - 25, 620,
    mx - roadApexHalfW, roadApexY
  );
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(mx + roadBaseHalfW, h);
  ctx.bezierCurveTo(
    mx + 80 - 25, 620,
    mx + 140 + 35, 870,
    mx + roadBaseHalfW, h
  );
  ctx.stroke();

  // Inner Gold Neon Edge Trim
  ctx.strokeStyle = "#fef08a";
  ctx.lineWidth = 1.8;
  ctx.shadowColor = "#fbbf24";
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(mx - roadBaseHalfW + 6, h);
  ctx.bezierCurveTo(
    mx - 140 + 35 + 5, 870,
    mx - 80 - 25 + 3, 620,
    mx - roadApexHalfW + 2, roadApexY
  );
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(mx + roadBaseHalfW - 6, h);
  ctx.bezierCurveTo(
    mx + 80 - 25 - 5, 870,
    mx + 140 + 35 - 3, 620,
    mx + roadApexHalfW - 2, roadApexY
  );
  ctx.stroke();

  // 10 Elegant Chevron Guide Markers & Subtle Energy Pulses along the Road
  for (let s = 1; s <= 10; s++) {
    const t = s / 11;
    const pT = Math.pow(t, 1.30); // Perspective non-linear foreshortening
    const ry = h - pT * (h - roadApexY);

    // Compute center-X along the S-curve
    // Bezier polynomial evaluation
    const uT = 1 - pT;
    const cx =
      uT * uT * uT * mx +
      3 * uT * uT * pT * (mx + 35) +
      3 * uT * pT * pT * (mx - 25) +
      pT * pT * pT * mx;

    const curHalfW = roadBaseHalfW * (1 - pT) + roadApexHalfW * pT;

    // Upward-pointing subtle Chevron guide mark
    ctx.strokeStyle = `rgba(254, 240, 138, ${0.45 + pT * 0.45})`;
    ctx.lineWidth = 2.5 + pT * 1.5;
    ctx.shadowColor = "#fbbf24";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(cx - curHalfW * 0.72, ry + 6);
    ctx.lineTo(cx, ry - 4);
    ctx.lineTo(cx + curHalfW * 0.72, ry + 6);
    ctx.stroke();

    // Side milestone beacon dots
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(cx - curHalfW + 8, ry, 2.5, 0, Math.PI * 2);
    ctx.arc(cx + curHalfW - 8, ry, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ── 6. SUMMIT CORONA, 8-POINTED GOLDEN STAR & SINGLE CLEAN PENNANT FLAG ──
  ctx.save();
  ctx.translate(mx, apexY);
  ctx.shadowColor = "#f59e0b";
  ctx.shadowBlur = 32;

  // Golden 8-Pointed Broadcast Star
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const r = i % 2 === 0 ? 46 : 20;
    const angle = (i * Math.PI) / 8 - Math.PI / 2;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 3.8;
  ctx.stroke();

  // Single Clean Olympic Flagpole and Pennant Flag at Summit
  // Slender Golden Flagpole extending upward
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 3.6;
  ctx.beginPath();
  ctx.moveTo(0, -28);
  ctx.lineTo(0, -82);
  ctx.stroke();

  // Brass finial ball on top of flagpole
  ctx.fillStyle = "#fef08a";
  ctx.beginPath();
  ctx.arc(0, -84, 5.5, 0, Math.PI * 2);
  ctx.fill();

  // Clean White/Cyan Pennant Flag flying dynamically to the right
  ctx.beginPath();
  ctx.moveTo(0, -82);
  ctx.lineTo(58, -69);
  ctx.lineTo(0, -56);
  ctx.closePath();
  ctx.fillStyle = "rgba(240, 249, 255, 0.96)";
  ctx.shadowColor = "#38bdf8";
  ctx.shadowBlur = 16;
  ctx.fill();
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 2.0;
  ctx.stroke();
  ctx.restore();

  // ── 7. 12 COMPREHENSIVE TECH & KNOWLEDGE ICONS (UNOBSTRUCTED 3D SAFE ZONES) ──
  // Calibrated outside the projection footprints of Quizorra Sign (X=1220..1650, Y=310..660)
  // and Olympia Medallion (X=2440..2870, Y=310..660) to avoid any clipping!
  const badges = [
    // Left Wing (Technology & Natural Sciences)
    { x: 240, y: 290, title: "AI & CHIP", type: "chip" },
    { x: 640, y: 210, title: "MẠNG NƠ-RON", type: "neural" },
    { x: 480, y: 510, title: "LẬP TRÌNH", type: "code" },
    { x: 960, y: 320, title: "VẬT LÝ HẠT", type: "atom" },
    { x: 860, y: 620, title: "HÓA HỌC", type: "chem" },
    { x: 1380, y: 200, title: "SINH HỌC", type: "dna" }, // Elevated above Quizorra Sign!

    // Right Wing (Mathematics, Space, Engineering & Humanities)
    { x: 2716, y: 200, title: "TOÁN HỌC", type: "math" }, // Elevated above Olympia Medallion!
    { x: 3136, y: 320, title: "THIÊN VĂN", type: "space" },
    { x: 3456, y: 210, title: "DỮ LIỆU SỐ", type: "data" },
    { x: 3616, y: 510, title: "CƠ KHÍ & ROBOT", type: "gear" },
    { x: 3236, y: 620, title: "TRI THỨC", type: "book" },
    { x: 3856, y: 290, title: "ĐỈNH CAO", type: "torch" },
  ];

  // Interconnecting Constellation Mesh Lines
  ctx.save();
  ctx.strokeStyle = "rgba(56, 189, 248, 0.38)";
  ctx.lineWidth = 1.8;
  const leftLinks = [[0, 1], [1, 2], [2, 4], [1, 3], [3, 4], [3, 5]];
  leftLinks.forEach(([a, b]) => {
    ctx.beginPath();
    ctx.moveTo(badges[a].x, badges[a].y);
    ctx.lineTo(badges[b].x, badges[b].y);
    ctx.stroke();
  });

  const rightLinks = [[6, 7], [7, 8], [7, 10], [8, 9], [9, 11], [10, 9]];
  rightLinks.forEach(([a, b]) => {
    ctx.beginPath();
    ctx.moveTo(badges[a].x, badges[a].y);
    ctx.lineTo(badges[b].x, badges[b].y);
    ctx.stroke();
  });
  ctx.restore();

  // Render Each Badge Node
  badges.forEach((b) => {
    ctx.save();
    // Outer Neon Glow Ring
    ctx.strokeStyle = "rgba(56, 189, 248, 0.88)";
    ctx.lineWidth = 3.0;
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 48, 0, Math.PI * 2);
    ctx.stroke();

    // Dashed Outer Orbital Ring
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "rgba(125, 211, 252, 0.45)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 56, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Inner Warm Gold Accent Ring
    ctx.strokeStyle = "rgba(251, 191, 36, 0.75)";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 40, 0, Math.PI * 2);
    ctx.stroke();

    // Dark Translucent Core Plate
    ctx.fillStyle = "rgba(3, 14, 44, 0.88)";
    ctx.beginPath();
    ctx.arc(b.x, b.y, 39, 0, Math.PI * 2);
    ctx.fill();

    // Crisp White/Cyan Subject Graphic
    ctx.strokeStyle = "#ffffff";
    ctx.fillStyle = "#ffffff";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 10;

    if (b.type === "chip") {
      // AI Processor Chip with Circuit Pins
      ctx.strokeRect(b.x - 13, b.y - 13, 26, 26);
      ctx.fillRect(b.x - 6, b.y - 6, 12, 12);
      for (let p = -9; p <= 9; p += 9) {
        ctx.beginPath(); ctx.moveTo(b.x + p, b.y - 13); ctx.lineTo(b.x + p, b.y - 18); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(b.x + p, b.y + 13); ctx.lineTo(b.x + p, b.y + 18); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(b.x - 13, b.y + p); ctx.lineTo(b.x - 18, b.y + p); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(b.x + 13, b.y + p); ctx.lineTo(b.x + 18, b.y + p); ctx.stroke();
      }
    } else if (b.type === "code") {
      // Code Brackets < / >
      ctx.beginPath();
      ctx.moveTo(b.x - 9, b.y - 11); ctx.lineTo(b.x - 18, b.y); ctx.lineTo(b.x - 9, b.y + 11);
      ctx.moveTo(b.x - 2, b.y + 13); ctx.lineTo(b.x + 3, b.y - 13);
      ctx.moveTo(b.x + 9, b.y - 11); ctx.lineTo(b.x + 18, b.y); ctx.lineTo(b.x + 9, b.y + 11);
      ctx.stroke();
    } else if (b.type === "neural") {
      // Synaptic Neural Network
      const nodes = [[-12, -9], [-12, 9], [0, -13], [0, 13], [13, 0]];
      nodes.forEach(([nx, ny]) => {
        ctx.beginPath(); ctx.arc(b.x + nx, b.y + ny, 3.2, 0, Math.PI * 2); ctx.fill();
      });
      ctx.beginPath();
      ctx.moveTo(b.x - 12, b.y - 9); ctx.lineTo(b.x, b.y - 13); ctx.lineTo(b.x + 13, b.y);
      ctx.moveTo(b.x - 12, b.y + 9); ctx.lineTo(b.x, b.y + 13); ctx.lineTo(b.x + 13, b.y);
      ctx.moveTo(b.x, b.y - 13); ctx.lineTo(b.x, b.y + 13);
      ctx.stroke();
    } else if (b.type === "atom") {
      // Bohr Atom & Quantum Orbits
      ctx.beginPath(); ctx.arc(b.x, b.y, 4.0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(b.x, b.y, 22, 8, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(b.x, b.y, 22, 8, Math.PI / 3, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(b.x, b.y, 22, 8, -Math.PI / 3, 0, Math.PI * 2); ctx.stroke();
    } else if (b.type === "chem") {
      // Laboratory Reaction Flask
      ctx.beginPath();
      ctx.moveTo(b.x - 5, b.y - 15); ctx.lineTo(b.x + 5, b.y - 15);
      ctx.moveTo(b.x - 4, b.y - 15); ctx.lineTo(b.x - 4, b.y - 5);
      ctx.lineTo(b.x - 15, b.y + 13); ctx.lineTo(b.x + 15, b.y + 13);
      ctx.lineTo(b.x + 4, b.y - 5); ctx.lineTo(b.x + 4, b.y - 15);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(b.x - 3, b.y + 7, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(b.x + 4, b.y + 3, 1.8, 0, Math.PI * 2); ctx.fill();
    } else if (b.type === "dna") {
      // DNA Double Helix Ladder
      ctx.beginPath();
      for (let d = -14; d <= 14; d += 4) {
        const dy = d;
        const dx = Math.sin(d * 0.32) * 11;
        ctx.arc(b.x + dx, b.y + dy, 1.8, 0, Math.PI * 2);
        ctx.arc(b.x - dx, b.y + dy, 1.8, 0, Math.PI * 2);
        ctx.moveTo(b.x - dx, b.y + dy); ctx.lineTo(b.x + dx, b.y + dy);
      }
      ctx.stroke();
    } else if (b.type === "math") {
      // Infinity & Golden Ratio Loop
      ctx.beginPath();
      ctx.arc(b.x - 8, b.y, 6.5, 0.4 * Math.PI, 1.6 * Math.PI);
      ctx.bezierCurveTo(b.x - 2, b.y - 7, b.x + 2, b.y + 7, b.x + 8, b.y + 6.5);
      ctx.arc(b.x + 8, b.y, 6.5, 0.4 * Math.PI, -0.4 * Math.PI, true);
      ctx.bezierCurveTo(b.x + 2, b.y - 7, b.x - 2, b.y + 7, b.x - 8, b.y + 6.5);
      ctx.stroke();
    } else if (b.type === "space") {
      // Saturn Planet with Ring
      ctx.beginPath(); ctx.arc(b.x, b.y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(b.x, b.y, 22, 6.5, -Math.PI / 6, 0, Math.PI * 2); ctx.stroke();
    } else if (b.type === "gear") {
      // Mechanical Precision Gears
      ctx.beginPath(); ctx.arc(b.x - 6, b.y - 4, 7.5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(b.x - 6, b.y - 4, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(b.x + 7, b.y + 5, 6.5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(b.x + 7, b.y + 5, 2.2, 0, Math.PI * 2); ctx.fill();
    } else if (b.type === "data") {
      // Digital Data Analytics
      ctx.fillRect(b.x - 13, b.y + 2, 5.5, 11);
      ctx.fillRect(b.x - 5, b.y - 5, 5.5, 18);
      ctx.fillRect(b.x + 3, b.y - 13, 5.5, 26);
      ctx.beginPath();
      ctx.moveTo(b.x - 13, b.y); ctx.lineTo(b.x - 2, b.y - 7); ctx.lineTo(b.x + 7, b.y - 15);
      ctx.stroke();
    } else if (b.type === "book") {
      // Open Book of Humanities & Wisdom
      ctx.beginPath();
      ctx.moveTo(b.x, b.y + 11);
      ctx.bezierCurveTo(b.x - 7, b.y + 7, b.x - 14, b.y + 9, b.x - 16, b.y - 7);
      ctx.bezierCurveTo(b.x - 10, b.y - 9, b.x - 5, b.y - 7, b.x, b.y - 5);
      ctx.bezierCurveTo(b.x + 5, b.y - 7, b.x + 10, b.y - 9, b.x + 16, b.y - 7);
      ctx.bezierCurveTo(b.x + 14, b.y + 9, b.x + 7, b.y + 7, b.x, b.y + 11);
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(b.x, b.y - 5); ctx.lineTo(b.x, b.y + 11); ctx.stroke();
    } else if (b.type === "torch") {
      // Olympia Torch & Victory Flame
      ctx.beginPath();
      ctx.moveTo(b.x - 3.5, b.y + 13); ctx.lineTo(b.x - 6, b.y - 2); ctx.lineTo(b.x + 6, b.y - 2); ctx.lineTo(b.x + 3.5, b.y + 13);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(b.x - 5, b.y - 3);
      ctx.bezierCurveTo(b.x - 9, b.y - 11, b.x - 2, b.y - 17, b.x, b.y - 20);
      ctx.bezierCurveTo(b.x + 3.5, b.y - 15, b.x + 9, b.y - 11, b.x + 5, b.y - 3);
      ctx.closePath();
      ctx.fillStyle = "#fbbf24";
      ctx.fill();
    }

    // Badge Title Below
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#bae6fd";
    ctx.fillText(b.title, b.x, b.y + 72);
    ctx.restore();
  });

  return canvas;
}
