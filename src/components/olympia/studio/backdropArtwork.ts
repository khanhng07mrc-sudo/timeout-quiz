/**
 * Master Broadcast Backdrop Artwork Painter for Đường Lên Đỉnh Olympia (S14 Reference Parity).
 * Native 4096 x 1848 resolution (aspect ratio ~2.2165:1 matching the 18.85m x 8.50m cyclorama)
 * for 1:1 undistorted projection across all broadcast camera angles:
 * - Deep royal cobalt & electric sapphire atmospheric gradient with radiant lateral horizon glows
 * - Evenly linked, strictly mirror-symmetric knowledge & tech constellations on Left & Right wings
 * - Single unified continuous faceted wireframe-lit polygonal mountain massif spanning across
 *   the center portal with zero center gaps, crowned by a multi-switchback serpentine trail & peak flag.
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
  const h = options.height || 1848;
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const mx = w / 2;

  // ── 1. DEEP ROYAL COBALT & SAPPHIRE BROADCAST GRADIENT (Reference Image Style) ──
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0.00, "#020b26");
  bgGrad.addColorStop(0.25, "#06256e");
  bgGrad.addColorStop(0.55, "#093ba6");
  bgGrad.addColorStop(0.84, "#062875");
  bgGrad.addColorStop(1.00, "#020d2e");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  const addRadialWash = (cx: number, cy: number, r: number, color0: string, color1: string) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, color0);
    g.addColorStop(1, color1);
    ctx.fillStyle = g;
    ctx.fillRect(Math.max(0, cx - r), Math.max(0, cy - r), r * 2, r * 2);
  };

  addRadialWash(w * 0.19, h * 0.44, w * 0.23, "rgba(37, 99, 235, 0.34)", "rgba(37, 99, 235, 0)");
  addRadialWash(w * 0.81, h * 0.44, w * 0.23, "rgba(37, 99, 235, 0.34)", "rgba(37, 99, 235, 0)");
  addRadialWash(mx, h * 0.56, w * 0.22, "rgba(56, 189, 248, 0.32)", "rgba(6, 37, 110, 0)");

  // Subtle horizontal & vertical broadcast light-wall grid sheen
  ctx.save();
  ctx.strokeStyle = "rgba(125, 211, 252, 0.045)";
  ctx.lineWidth = 1.5;
  for (let gx = 0; gx <= w; gx += 128) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, h);
    ctx.stroke();
  }
  for (let gy = 0; gy <= h; gy += 128) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();
  }
  ctx.restore();

  // Fine studio star/bokeh pinpoint glow dots
  const pseudoRand = (seed: number) => {
    const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  ctx.save();
  for (let i = 0; i < 320; i++) {
    const sx = pseudoRand(i + 1) * w;
    const sy = pseudoRand(i + 301) * (h * 0.85);
    const sr = 1.0 + pseudoRand(i + 601) * 2.2;
    const alpha = 0.14 + pseudoRand(i + 901) * 0.38;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(186, 230, 253, ${alpha})`;
    ctx.fill();
  }
  ctx.restore();

  // ── 2. EVENLY LINKED SYMMETRIC KNOWLEDGE & TECH CONSTELLATIONS (LEFT & RIGHT WINGS) ──
  // Both sides share identical mirrored geometry, concentric orbital telemetry rings,
  // and balanced triangulated link graphs centered cleanly behind Quizorra & Olympia signage.
  type WingNode = { x: number; y: number; r: number; icon: string };
  const leftNodesSpec: Array<{ xFrac: number; yFrac: number; r: number; leftIcon: string; rightIcon: string }> = [
    { xFrac: 0.068, yFrac: 0.35, r: 54, leftIcon: "compass", rightIcon: "flask" },
    { xFrac: 0.125, yFrac: 0.21, r: 50, leftIcon: "neural", rightIcon: "space" },
    { xFrac: 0.168, yFrac: 0.41, r: 62, leftIcon: "book", rightIcon: "medal" },
    { xFrac: 0.105, yFrac: 0.59, r: 54, leftIcon: "globe", rightIcon: "code" },
    { xFrac: 0.238, yFrac: 0.23, r: 52, leftIcon: "atom", rightIcon: "bulb" },
    { xFrac: 0.248, yFrac: 0.57, r: 58, leftIcon: "gear", rightIcon: "data" },
    { xFrac: 0.315, yFrac: 0.36, r: 52, leftIcon: "chip", rightIcon: "award" },
    { xFrac: 0.322, yFrac: 0.60, r: 46, leftIcon: "dna", rightIcon: "math" },
  ];

  const wingBaseEdges: Array<[number, number]> = [
    [0, 1], [0, 2], [0, 3],
    [1, 2], [1, 4],
    [2, 3], [2, 4], [2, 5], [2, 6],
    [3, 5],
    [4, 6],
    [5, 6], [5, 7],
    [6, 7],
  ];

  const wingNodes: WingNode[] = [
    ...leftNodesSpec.map((n) => ({ x: w * n.xFrac, y: h * n.yFrac, r: n.r, icon: n.leftIcon })),
    ...leftNodesSpec.map((n) => ({ x: w * (1 - n.xFrac), y: h * n.yFrac, r: n.r, icon: n.rightIcon })),
  ];

  const leftCount = leftNodesSpec.length;
  const wingLinks: Array<[number, number]> = [
    ...wingBaseEdges,
    ...wingBaseEdges.map(([a, b]): [number, number] => [a + leftCount, b + leftCount]),
  ];

  // Concentric orbital rings framing each wing focal hub (matching real backdrop radial circuits)
  for (const hubX of [w * 0.185, w * 0.815]) {
    const hubY = h * 0.42;
    ctx.save();
    for (const [rad, dash, alpha] of [
      [250, [10, 10], 0.16],
      [410, [16, 14], 0.13],
      [580, [], 0.09],
    ] as Array<[number, number[], number]>) {
      ctx.setLineDash(dash);
      ctx.strokeStyle = `rgba(125, 211, 252, ${alpha})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(hubX, hubY, rad, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Uniform wing constellation link lines + midpoint nodes
  ctx.save();
  ctx.strokeStyle = "rgba(125, 211, 252, 0.28)";
  ctx.lineWidth = 2.2;
  for (const [aIdx, bIdx] of wingLinks) {
    const na = wingNodes[aIdx];
    const nb = wingNodes[bIdx];
    ctx.beginPath();
    ctx.moveTo(na.x, na.y);
    ctx.lineTo(nb.x, nb.y);
    ctx.stroke();

    ctx.fillStyle = "rgba(186, 230, 253, 0.55)";
    ctx.beginPath();
    ctx.arc((na.x + nb.x) * 0.5, (na.y + nb.y) * 0.5, 4.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Subtle translucent hex accents evenly anchored around each wing node
  const drawFaintHex = (hx: number, hy: number, hr: number, alpha: number) => {
    ctx.save();
    ctx.strokeStyle = `rgba(125, 211, 252, ${alpha})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const ang = (Math.PI / 3) * k - Math.PI / 6;
      const px = hx + Math.cos(ang) * hr;
      const py = hy + Math.sin(ang) * hr;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  };

  wingNodes.forEach((node, idx) => {
    const isRight = idx >= leftCount;
    const dir = isRight ? -1 : 1;
    drawFaintHex(node.x + dir * 82, node.y - 68, 30, 0.14);
  });

  // Render crisp circular tech medallions
  for (const b of wingNodes) {
    ctx.save();
    const halo = ctx.createRadialGradient(b.x, b.y, b.r * 0.3, b.x, b.y, b.r * 1.6);
    halo.addColorStop(0, "rgba(56, 189, 248, 0.18)");
    halo.addColorStop(1, "rgba(56, 189, 248, 0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * 1.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = "rgba(186, 230, 253, 0.34)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r + 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = "rgba(125, 211, 252, 0.54)";
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "rgba(5, 29, 86, 0.58)";
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r - 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(224, 242, 254, 0.78)";
    ctx.fillStyle = "rgba(224, 242, 254, 0.78)";
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const s = b.r * 0.42;

    if (b.icon === "book") {
      ctx.beginPath();
      ctx.moveTo(b.x, b.y + s * 0.7);
      ctx.bezierCurveTo(b.x - s * 0.45, b.y + s * 0.45, b.x - s * 0.9, b.y + s * 0.6, b.x - s, b.y - s * 0.45);
      ctx.bezierCurveTo(b.x - s * 0.5, b.y - s * 0.6, b.x - s * 0.25, b.y - s * 0.45, b.x, b.y - s * 0.3);
      ctx.bezierCurveTo(b.x + s * 0.25, b.y - s * 0.45, b.x + s * 0.5, b.y - s * 0.6, b.x + s, b.y - s * 0.45);
      ctx.bezierCurveTo(b.x + s * 0.9, b.y + s * 0.6, b.x + s * 0.45, b.y + s * 0.45, b.x, b.y + s * 0.7);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(b.x, b.y - s * 0.3);
      ctx.lineTo(b.x, b.y + s * 0.7);
      ctx.stroke();
    } else if (b.icon === "atom") {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
      ctx.fill();
      for (const ang of [0, Math.PI / 3, -Math.PI / 3]) {
        ctx.beginPath();
        ctx.ellipse(b.x, b.y, s, s * 0.38, ang, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (b.icon === "chip") {
      const k = s * 0.65;
      ctx.strokeRect(b.x - k, b.y - k, k * 2, k * 2);
      ctx.fillRect(b.x - k * 0.45, b.y - k * 0.45, k * 0.9, k * 0.9);
      for (const p of [-k * 0.5, 0, k * 0.5]) {
        ctx.beginPath();
        ctx.moveTo(b.x + p, b.y - k); ctx.lineTo(b.x + p, b.y - k - 7);
        ctx.moveTo(b.x + p, b.y + k); ctx.lineTo(b.x + p, b.y + k + 7);
        ctx.moveTo(b.x - k, b.y + p); ctx.lineTo(b.x - k - 7, b.y + p);
        ctx.moveTo(b.x + k, b.y + p); ctx.lineTo(b.x + k + 7, b.y + p);
        ctx.stroke();
      }
    } else if (b.icon === "gear") {
      ctx.beginPath();
      ctx.arc(b.x, b.y, s * 0.65, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(b.x, b.y, s * 0.25, 0, Math.PI * 2);
      ctx.stroke();
      for (let t = 0; t < 8; t++) {
        const a = (t * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(b.x + Math.cos(a) * s * 0.65, b.y + Math.sin(a) * s * 0.65);
        ctx.lineTo(b.x + Math.cos(a) * s * 0.92, b.y + Math.sin(a) * s * 0.92);
        ctx.stroke();
      }
    } else if (b.icon === "globe") {
      ctx.beginPath();
      ctx.arc(b.x, b.y, s * 0.85, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, s * 0.42, s * 0.85, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(b.x - s * 0.85, b.y);
      ctx.lineTo(b.x + s * 0.85, b.y);
      ctx.stroke();
    } else if (b.icon === "dna") {
      ctx.beginPath();
      for (let d = -s * 0.8; d <= s * 0.8; d += 5) {
        const dx = Math.sin(d * 0.22) * s * 0.55;
        ctx.moveTo(b.x - dx, b.y + d);
        ctx.lineTo(b.x + dx, b.y + d);
      }
      ctx.stroke();
    } else if (b.icon === "award" || b.icon === "medal") {
      ctx.beginPath();
      ctx.arc(b.x, b.y - s * 0.15, s * 0.55, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(b.x - s * 0.35, b.y + s * 0.35);
      ctx.lineTo(b.x - s * 0.45, b.y + s * 0.92);
      ctx.lineTo(b.x, b.y + s * 0.68);
      ctx.lineTo(b.x + s * 0.45, b.y + s * 0.92);
      ctx.lineTo(b.x + s * 0.35, b.y + s * 0.35);
      ctx.stroke();
    } else if (b.icon === "bulb") {
      ctx.beginPath();
      ctx.arc(b.x, b.y - s * 0.15, s * 0.55, Math.PI * 0.8, Math.PI * 2.2);
      ctx.lineTo(b.x + s * 0.28, b.y + s * 0.55);
      ctx.lineTo(b.x - s * 0.28, b.y + s * 0.55);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(b.x - s * 0.22, b.y + s * 0.78);
      ctx.lineTo(b.x + s * 0.22, b.y + s * 0.78);
      ctx.stroke();
    } else if (b.icon === "code") {
      ctx.beginPath();
      ctx.moveTo(b.x - s * 0.42, b.y - s * 0.45);
      ctx.lineTo(b.x - s * 0.85, b.y);
      ctx.lineTo(b.x - s * 0.42, b.y + s * 0.45);
      ctx.moveTo(b.x + s * 0.42, b.y - s * 0.45);
      ctx.lineTo(b.x + s * 0.85, b.y);
      ctx.lineTo(b.x + s * 0.42, b.y + s * 0.45);
      ctx.moveTo(b.x + s * 0.16, b.y - s * 0.55);
      ctx.lineTo(b.x - s * 0.16, b.y + s * 0.55);
      ctx.stroke();
    } else if (b.icon === "data") {
      ctx.fillRect(b.x - s * 0.62, b.y + s * 0.1, s * 0.28, s * 0.55);
      ctx.fillRect(b.x - s * 0.14, b.y - s * 0.25, s * 0.28, s * 0.90);
      ctx.fillRect(b.x + s * 0.34, b.y - s * 0.62, s * 0.28, s * 1.27);
    } else if (b.icon === "neural") {
      const pts = [[-s * 0.55, -s * 0.45], [-s * 0.55, s * 0.45], [0, -s * 0.62], [0, s * 0.62], [s * 0.62, 0]];
      for (const [px, py] of pts) {
        ctx.beginPath();
        ctx.arc(b.x + px, b.y + py, 3.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.moveTo(b.x - s * 0.55, b.y - s * 0.45); ctx.lineTo(b.x, b.y - s * 0.62); ctx.lineTo(b.x + s * 0.62, b.y);
      ctx.moveTo(b.x - s * 0.55, b.y + s * 0.45); ctx.lineTo(b.x, b.y + s * 0.62); ctx.lineTo(b.x + s * 0.62, b.y);
      ctx.moveTo(b.x, b.y - s * 0.62); ctx.lineTo(b.x, b.y + s * 0.62);
      ctx.stroke();
    } else if (b.icon === "math") {
      ctx.beginPath();
      ctx.arc(b.x - s * 0.38, b.y, s * 0.34, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(b.x + s * 0.38, b.y, s * 0.34, 0, Math.PI * 2);
      ctx.stroke();
    } else if (b.icon === "space") {
      ctx.beginPath();
      ctx.arc(b.x, b.y, s * 0.46, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, s * 0.95, s * 0.30, -Math.PI / 6, 0, Math.PI * 2);
      ctx.stroke();
    } else if (b.icon === "flask") {
      ctx.beginPath();
      ctx.moveTo(b.x - s * 0.25, b.y - s * 0.72);
      ctx.lineTo(b.x + s * 0.25, b.y - s * 0.72);
      ctx.moveTo(b.x - s * 0.20, b.y - s * 0.72);
      ctx.lineTo(b.x - s * 0.20, b.y - s * 0.25);
      ctx.lineTo(b.x - s * 0.72, b.y + s * 0.68);
      ctx.lineTo(b.x + s * 0.72, b.y + s * 0.68);
      ctx.lineTo(b.x + s * 0.20, b.y - s * 0.25);
      ctx.lineTo(b.x + s * 0.20, b.y - s * 0.72);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(b.x, b.y - s * 0.48, s * 0.18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(b.x, b.y - s * 0.30);
      ctx.lineTo(b.x - s * 0.48, b.y + s * 0.75);
      ctx.moveTo(b.x, b.y - s * 0.30);
      ctx.lineTo(b.x + s * 0.48, b.y + s * 0.75);
      ctx.stroke();
    }

    ctx.restore();
  }

  // ── 3. UNIFIED CONTINUOUS WIREFRAME-LIT MOUNTAIN MASSIF (ZERO CENTER GAP!) ──
  // Single integrated mesh spanning seamlessly from Left flank -> Central spine -> Right flank
  // across X in [mx - 690 .. mx + 690] and Y from apexY to baseY, guaranteeing full center facet coverage.
  const apexY = Math.round(h * 0.285); // ~527px -> sits crisply inside top of portal
  const baseY = Math.round(h * 0.87);  // ~1608px -> settles cleanly behind grandstand stairs

  addRadialWash(mx, apexY + 120, 620, "rgba(56, 189, 248, 0.56)", "rgba(6, 37, 110, 0)");
  addRadialWash(mx, apexY, 230, "rgba(224, 242, 254, 0.58)", "rgba(56, 189, 248, 0)");

  // Unified layered lattice:
  // Tier 0 (Summit)
  // Tier 1 (Upper Crown, 3 vertices)
  // Tier 2 (Upper Shoulder, 5 vertices)
  // Tier 3 (Mid Crag, 7 vertices)
  // Tier 4 (Lower Crag & Secondary Foothill Peaks, 9 vertices)
  // Tier 5 (Base Apron, 9 vertices)
  // Tier 6 (Floor Ground, 9 vertices)
  const M_VERTS: Array<[number, number]> = [
    // 0: Main Summit Peak
    [mx, apexY],

    // 1..3: Tier 1 (Upper Crown)
    [mx - 108, apexY + 135],
    [mx + 12,  apexY + 150], // Central spine vertex bridging left & right!
    [mx + 114, apexY + 130],

    // 4..8: Tier 2 (Upper Shoulders & Secondary Flanking Spurs)
    [mx - 285, apexY + 225],
    [mx - 145, apexY + 290],
    [mx - 18,  apexY + 315], // Central spine vertex
    [mx + 148, apexY + 282],
    [mx + 292, apexY + 230],

    // 9..15: Tier 3 (Mid Slopes)
    [mx - 445, apexY + 375],
    [mx - 300, apexY + 415],
    [mx - 155, apexY + 465],
    [mx + 22,  apexY + 485], // Central spine vertex
    [mx + 170, apexY + 460],
    [mx + 315, apexY + 410],
    [mx + 455, apexY + 382],

    // 16..24: Tier 4 (Lower Slopes & Outer Foothills)
    [mx - 585, apexY + 575],
    [mx - 455, apexY + 565],
    [mx - 315, apexY + 625],
    [mx - 165, apexY + 660],
    [mx - 20,  apexY + 685], // Central valley saddle vertex
    [mx + 165, apexY + 655],
    [mx + 320, apexY + 618],
    [mx + 462, apexY + 560],
    [mx + 592, apexY + 585],

    // 25..33: Tier 5 (Foothill Base Apron)
    [mx - 640, apexY + 810],
    [mx - 485, apexY + 795],
    [mx - 335, apexY + 835],
    [mx - 175, apexY + 860],
    [mx + 15,  apexY + 875], // Central apron vertex
    [mx + 185, apexY + 855],
    [mx + 345, apexY + 830],
    [mx + 495, apexY + 790],
    [mx + 648, apexY + 815],

    // 34..42: Tier 6 (Ground Floor Baseline)
    [mx - 700, baseY],
    [mx - 525, baseY],
    [mx - 355, baseY],
    [mx - 185, baseY],
    [mx,       baseY],       // Exact floor center
    [mx + 185, baseY],
    [mx + 360, baseY],
    [mx + 530, baseY],
    [mx + 700, baseY],
  ];

  // Even, gap-free strip triangulation tying every adjacent column AND bridging the center axis cleanly!
  const M_TRIS: Array<[number, number, number]> = [
    // Summit -> Tier 1
    [0, 1, 2], [0, 2, 3],

    // Tier 1 -> Tier 2 (Left spur, Left inner, Center bridge, Right inner, Right spur)
    [1, 4, 5],
    [1, 5, 2], [2, 5, 6],
    [2, 6, 7], [2, 7, 3],
    [3, 7, 8],

    // Tier 2 -> Tier 3 (Continuous across center index 6 <-> 12!)
    [4, 9, 10], [4, 10, 5],
    [5, 10, 11], [5, 11, 6],
    [6, 11, 12], [6, 12, 7],
    [7, 12, 13], [7, 13, 8],
    [8, 13, 14], [8, 14, 15],

    // Tier 3 -> Tier 4 (Continuous across center index 12 <-> 20!)
    [9, 16, 17], [9, 17, 10],
    [10, 17, 18], [10, 18, 11],
    [11, 18, 19], [11, 19, 12],
    [12, 19, 20], [12, 20, 21],
    [12, 21, 13],
    [13, 21, 22], [13, 22, 14],
    [14, 22, 23], [14, 23, 15],
    [15, 23, 24],

    // Tier 4 -> Tier 5 (8 quads -> 16 balanced triangles)
    [16, 25, 26], [16, 26, 17],
    [17, 26, 27], [17, 27, 18],
    [18, 27, 28], [18, 28, 19],
    [19, 28, 29], [19, 29, 20],
    [20, 29, 30], [20, 30, 21],
    [21, 30, 31], [21, 31, 22],
    [22, 31, 32], [22, 32, 23],
    [23, 32, 33], [23, 33, 24],

    // Tier 5 -> Tier 6 (8 quads -> 16 balanced triangles)
    [25, 34, 35], [25, 35, 26],
    [26, 35, 36], [26, 36, 27],
    [27, 36, 37], [27, 37, 28],
    [28, 37, 38], [28, 38, 29],
    [29, 38, 39], [29, 39, 30],
    [30, 39, 40], [30, 40, 31],
    [31, 40, 41], [31, 41, 32],
    [32, 41, 42], [32, 42, 33],
  ];

  const paletteLight = [
    ["#7dd3fc", "#0ea5e9"], // High illuminated ridge
    ["#38bdf8", "#0284c7"], // Sunlit azure face
    ["#0ea5e9", "#0369a1"], // Mid facet
    ["#0284c7", "#075985"], // Shaded cobalt slope
    ["#0369a1", "#0c4a6e"], // Deep canyon facet
    ["#075985", "#041c3c"], // Foothill shadow facet
  ] as const;

  for (let i = 0; i < M_TRIS.length; i++) {
    const [a, b, c] = M_TRIS[i];
    const p1 = M_VERTS[a];
    const p2 = M_VERTS[b];
    const p3 = M_VERTS[c];
    const centroidX = (p1[0] + p2[0] + p3[0]) / 3;
    const centroidY = (p1[1] + p2[1] + p3[1]) / 3;
    const normY = Math.max(0, Math.min(1, (centroidY - apexY) / Math.max(1, baseY - apexY)));
    const isRightSlope = centroidX >= mx;
    // Directional light from top-left creates authentic sculptural bevel contrast across center ridge
    const baseBand = Math.min(4, Math.floor(normY * 4.5));
    const band = Math.min(paletteLight.length - 1, baseBand + (isRightSlope ? 1 : 0));
    const [c1, c2] = paletteLight[band];

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
    const grad = ctx.createLinearGradient(isRightSlope ? maxX : minX, minY, isRightSlope ? minX : maxX, maxY);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    ctx.globalAlpha = 0.88;
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.globalAlpha = 1.0;
    ctx.strokeStyle = "rgba(125, 211, 252, 0.68)";
    ctx.lineWidth = 2.0;
    ctx.stroke();
    ctx.restore();
  }

  // Luminous vertex lattice nodes across mountain face (excluding floor edge vertices)
  ctx.save();
  ctx.fillStyle = "#e0f2fe";
  ctx.shadowColor = "#38bdf8";
  ctx.shadowBlur = 10;
  for (let i = 0; i < 34; i++) {
    ctx.beginPath();
    ctx.arc(M_VERTS[i][0], M_VERTS[i][1], i === 0 ? 5.5 : 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ── 4. MULTI-SWITCHBACK SERPENTINE LUMINOUS PATH (4 DISTINCT S-CURVES TO SUMMIT) ──
  // Continuous polyline sampled across chained alternating switchback Beziers from wide valley entrance
  // winding left-right-left-right up the central massif directly to the sunlit peak!
  const roadTopY = apexY + 58;
  const totalRise = baseY - roadTopY;
  const roadSpine: Array<{ x: number; y: number; halfW: number }> = [];

  const switchbackWaypoints: Array<[number, number]> = [
    [mx - 10, baseY],                      // Start centered bottom mouth
    [mx + 165, baseY - totalRise * 0.16],  // Curve 1: wide sweep RIGHT
    [mx - 150, baseY - totalRise * 0.37],  // Curve 2: sharp hairpin LEFT
    [mx + 115, baseY - totalRise * 0.58],  // Curve 3: graceful sweep RIGHT
    [mx - 74,  baseY - totalRise * 0.78],  // Curve 4: high switchback LEFT
    [mx + 26,  baseY - totalRise * 0.91],  // Crest bend RIGHT
    [mx,       roadTopY],                  // Summit termination
  ];

  // Smooth Catmull-Rom spline sampling along switchback waypoints so every S-curve is silky smooth
  const samplesPerSeg = 22;
  const ptsExtended = [
    switchbackWaypoints[0],
    ...switchbackWaypoints,
    switchbackWaypoints[switchbackWaypoints.length - 1],
  ];
  const segCount = switchbackWaypoints.length - 1;
  const totalSamples = segCount * samplesPerSeg;

  for (let seg = 0; seg < segCount; seg++) {
    const p0 = ptsExtended[seg];
    const p1 = ptsExtended[seg + 1];
    const p2 = ptsExtended[seg + 2];
    const p3 = ptsExtended[seg + 3];
    const stepEnd = seg === segCount - 1 ? samplesPerSeg : samplesPerSeg - 1;
    for (let s = 0; s <= stepEnd; s++) {
      const t = s / samplesPerSeg;
      const t2 = t * t;
      const t3 = t2 * t;
      const x =
        0.5 *
        (2 * p1[0] +
          (-p0[0] + p2[0]) * t +
          (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
          (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
      const y =
        0.5 *
        (2 * p1[1] +
          (-p0[1] + p2[1]) * t +
          (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
          (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
      const globalU = (seg * samplesPerSeg + s) / totalSamples;
      // Perspective taper from 88px half-width at ground stairs to 6px hairline at summit
      const halfW = 88 * Math.pow(1 - globalU, 1.45) + 6;
      roadSpine.push({ x, y, halfW });
    }
  }

  // Construct tapered left & right trail edge banks perpendicular to local tangent
  const leftBank: Array<[number, number]> = [];
  const rightBank: Array<[number, number]> = [];
  for (let i = 0; i < roadSpine.length; i++) {
    const prev = roadSpine[Math.max(0, i - 1)];
    const next = roadSpine[Math.min(roadSpine.length - 1, i + 1)];
    const tx = next.x - prev.x;
    const ty = next.y - prev.y;
    const len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len;
    const ny = tx / len;
    // Clamp vertical shift slightly so horizontal road width remains broadcast crisp
    const wX = nx * roadSpine[i].halfW;
    const wY = ny * (roadSpine[i].halfW * 0.45);
    leftBank.push([roadSpine[i].x - wX, roadSpine[i].y - wY]);
    rightBank.push([roadSpine[i].x + wX, roadSpine[i].y + wY]);
  }

  ctx.save();
  const roadGrad = ctx.createLinearGradient(0, baseY, 0, roadTopY);
  roadGrad.addColorStop(0.00, "rgba(14, 165, 233, 0.88)");
  roadGrad.addColorStop(0.48, "rgba(56, 189, 248, 0.96)");
  roadGrad.addColorStop(1.00, "rgba(240, 249, 255, 1.00)");

  ctx.beginPath();
  ctx.moveTo(leftBank[0][0], leftBank[0][1]);
  for (let i = 1; i < leftBank.length; i++) {
    ctx.lineTo(leftBank[i][0], leftBank[i][1]);
  }
  for (let i = rightBank.length - 1; i >= 0; i--) {
    ctx.lineTo(rightBank[i][0], rightBank[i][1]);
  }
  ctx.closePath();
  ctx.fillStyle = roadGrad;
  ctx.shadowColor = "#38bdf8";
  ctx.shadowBlur = 28;
  ctx.fill();

  // Crisp glowing outer curb strokes + bright serpentine center highway line
  ctx.shadowBlur = 12;
  ctx.strokeStyle = "rgba(224, 242, 254, 0.90)";
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(leftBank[0][0], leftBank[0][1]);
  for (let i = 1; i < leftBank.length; i++) ctx.lineTo(leftBank[i][0], leftBank[i][1]);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(rightBank[0][0], rightBank[0][1]);
  for (let i = 1; i < rightBank.length; i++) ctx.lineTo(rightBank[i][0], rightBank[i][1]);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(roadSpine[0].x, roadSpine[0].y);
  for (let i = 1; i < roadSpine.length; i++) {
    ctx.lineTo(roadSpine[i].x, roadSpine[i].y);
  }
  ctx.stroke();
  ctx.restore();

  // ── 5. SUMMIT BEACON & PENNANT FLAG ON PEAK ──
  ctx.save();
  ctx.translate(mx, apexY);
  ctx.shadowColor = "#7dd3fc";
  ctx.shadowBlur = 24;

  ctx.strokeStyle = "#e0f2fe";
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.lineTo(0, -76);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, -76);
  ctx.lineTo(66, -58);
  ctx.lineTo(0, -40);
  ctx.closePath();
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "#7dd3fc";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Atmospheric cool cyan mist veil across lower perimeter
  const mistGrad = ctx.createLinearGradient(0, h * 0.70, 0, h);
  mistGrad.addColorStop(0, "rgba(6, 37, 110, 0)");
  mistGrad.addColorStop(0.65, "rgba(4, 24, 72, 0.52)");
  mistGrad.addColorStop(1, "rgba(2, 13, 46, 0.94)");
  ctx.fillStyle = mistGrad;
  ctx.fillRect(0, h * 0.70, w, h * 0.30);

  return canvas;
}
