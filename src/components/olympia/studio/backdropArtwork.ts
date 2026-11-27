/**
 * Master Broadcast Backdrop Artwork Painter for Đường Lên Đỉnh Olympia (S14 Reference Parity).
 * Native 4096 x 1848 resolution (aspect ratio ~2.2165:1 matching the 18.85m x 8.50m cyclorama)
 * for 1:1 undistorted projection across all broadcast camera angles:
 * - Deep royal cobalt & electric sapphire atmospheric gradient with radiant lateral horizon glows
 * - Delicate geometric tech & knowledge constellation rings + circuit web on Left & Right audience wings
 * - Sharp central faceted wireframe-lit polygonal mountain massif with luminous ascending path & peak flag,
 *   calibrated vertically & horizontally to sit cleanly inside the redesigned wide entrance portal.
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
  bgGrad.addColorStop(0.00, "#020b26"); // Upper stage ceiling indigo
  bgGrad.addColorStop(0.26, "#06256e"); // Deep royal sapphire
  bgGrad.addColorStop(0.56, "#093ba6"); // Vibrant cobalt stage wash
  bgGrad.addColorStop(0.84, "#062875"); // Mid-backstage navy
  bgGrad.addColorStop(1.00, "#020d2e"); // Floor perimeter blend
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Soft lateral electric-blue stage wing glow halos (framing both sides behind Quizorra & Olympia)
  const addRadialWash = (cx: number, cy: number, r: number, color0: string, color1: string) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, color0);
    g.addColorStop(1, color1);
    ctx.fillStyle = g;
    ctx.fillRect(Math.max(0, cx - r), Math.max(0, cy - r), r * 2, r * 2);
  };

  addRadialWash(w * 0.19, h * 0.48, w * 0.24, "rgba(37, 99, 235, 0.34)", "rgba(37, 99, 235, 0)");
  addRadialWash(w * 0.81, h * 0.48, w * 0.24, "rgba(37, 99, 235, 0.34)", "rgba(37, 99, 235, 0)");
  addRadialWash(mx, h * 0.56, w * 0.22, "rgba(56, 189, 248, 0.30)", "rgba(6, 37, 110, 0)");

  // Subtle horizontal & vertical broadcast light-wall grid sheen (very restrained)
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

  // Subtle atmospheric bokeh & star particles (fine pinpoint dots matching studio photograph)
  const pseudoRand = (seed: number) => {
    const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  ctx.save();
  for (let i = 0; i < 340; i++) {
    const sx = pseudoRand(i + 1) * w;
    const sy = pseudoRand(i + 301) * (h * 0.86);
    const sr = 1.0 + pseudoRand(i + 601) * 2.4;
    const alpha = 0.14 + pseudoRand(i + 901) * 0.42;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(186, 230, 253, ${alpha})`;
    ctx.fill();
  }
  ctx.restore();

  // ── 2. SUBTLE KNOWLEDGE & TECH NETWORK PATTERN ACROSS LEFT & RIGHT WINGS ──
  // Thin glowing cyan circular nodes + dotted rings + delicate geometric web lines
  // Positioned carefully around Quizorra / Olympia wing corridors (Y = 0.20h .. 0.72h)
  type WingNode = { x: number; y: number; r: number; icon: string };
  const wingNodes: WingNode[] = [
    // Left Wing Constellation (x < 0.36w)
    { x: w * 0.075, y: h * 0.34, r: 58, icon: "compass" },
    { x: w * 0.135, y: h * 0.22, r: 50, icon: "neural" },
    { x: w * 0.165, y: h * 0.42, r: 64, icon: "book" },
    { x: w * 0.115, y: h * 0.59, r: 54, icon: "globe" },
    { x: w * 0.245, y: h * 0.24, r: 54, icon: "atom" },
    { x: w * 0.255, y: h * 0.56, r: 62, icon: "gear" },
    { x: w * 0.320, y: h * 0.37, r: 52, icon: "chip" },
    { x: w * 0.335, y: h * 0.61, r: 46, icon: "dna" },

    // Right Wing Constellation (x > 0.64w)
    { x: w * 0.665, y: h * 0.61, r: 46, icon: "math" },
    { x: w * 0.680, y: h * 0.37, r: 52, icon: "award" },
    { x: w * 0.745, y: h * 0.56, r: 62, icon: "data" },
    { x: w * 0.755, y: h * 0.24, r: 54, icon: "bulb" },
    { x: w * 0.835, y: h * 0.42, r: 64, icon: "medal" },
    { x: w * 0.885, y: h * 0.59, r: 54, icon: "code" },
    { x: w * 0.865, y: h * 0.22, r: 50, icon: "space" },
    { x: w * 0.925, y: h * 0.34, r: 58, icon: "flask" },
  ];

  const wingLinks: Array<[number, number]> = [
    // Left links
    [0, 1], [0, 2], [0, 3], [1, 2], [1, 4], [2, 3], [2, 4], [2, 5], [3, 5], [4, 6], [5, 6], [5, 7], [6, 7],
    // Right links
    [8, 9], [8, 10], [9, 10], [9, 11], [10, 12], [10, 13], [11, 12], [11, 14], [12, 13], [12, 15], [14, 15], [13, 15],
  ];

  // Delicate tech circuit lines + micro junction dots
  ctx.save();
  ctx.strokeStyle = "rgba(125, 211, 252, 0.24)";
  ctx.lineWidth = 2.0;
  for (const [aIdx, bIdx] of wingLinks) {
    const na = wingNodes[aIdx];
    const nb = wingNodes[bIdx];
    ctx.beginPath();
    ctx.moveTo(na.x, na.y);
    ctx.lineTo(nb.x, nb.y);
    ctx.stroke();

    // Small glowing midpoint telemetry dot
    ctx.fillStyle = "rgba(186, 230, 253, 0.45)";
    ctx.beginPath();
    ctx.arc((na.x + nb.x) * 0.5, (na.y + nb.y) * 0.5, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Subtle translucent hex lattice behind the wing icons
  const drawFaintHex = (hx: number, hy: number, hr: number, alpha: number) => {
    ctx.save();
    ctx.strokeStyle = `rgba(125, 211, 252, ${alpha})`;
    ctx.lineWidth = 1.6;
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

  for (const node of wingNodes) {
    drawFaintHex(node.x + 88, node.y - 72, 34, 0.14);
    drawFaintHex(node.x - 84, node.y + 78, 28, 0.11);
  }

  // Render clean subtle tech/knowledge circular medallions
  for (const b of wingNodes) {
    ctx.save();
    // Soft radial halo behind circle
    const halo = ctx.createRadialGradient(b.x, b.y, b.r * 0.3, b.x, b.y, b.r * 1.6);
    halo.addColorStop(0, "rgba(56, 189, 248, 0.16)");
    halo.addColorStop(1, "rgba(56, 189, 248, 0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Outer dashed ring
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = "rgba(186, 230, 253, 0.30)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r + 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Primary luminous ring
    ctx.strokeStyle = "rgba(125, 211, 252, 0.48)";
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.stroke();

    // Inner fill disc
    ctx.fillStyle = "rgba(5, 29, 86, 0.55)";
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r - 2, 0, Math.PI * 2);
    ctx.fill();

    // Crisp translucent white-cyan vector icon inside
    ctx.strokeStyle = "rgba(224, 242, 254, 0.72)";
    ctx.fillStyle = "rgba(224, 242, 254, 0.72)";
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
      // compass
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

  // ── 3. CENTRAL OLYMPIA WIREFRAME POLYGONAL MOUNTAIN MASSIF (100% Centered Inside Wide Portal) ──
  // Vertically calibrated for cyclorama Y_world in [-0.20m .. +8.30m]:
  // Top portal beam sits around Y_world ≈ 6.2m (canvas Y ≈ 460px); landing plinth Y = 1.95m (canvas Y ≈ 1380px).
  // Center summit peak placed at (mx, 540) so summit flag & glowing halo sit neatly framed below the portal crown!
  const apexY = Math.round(h * 0.285); // ~527px -> Y_world ~5.88m
  const baseY = Math.round(h * 0.86);  // ~1589px -> extends behind top landing plinth nicely

  // Crisp cyan-azure halo corona behind the mountain peak (like reference photo!)
  addRadialWash(mx, apexY + 80, 560, "rgba(56, 189, 248, 0.55)", "rgba(6, 37, 110, 0)");
  addRadialWash(mx, apexY, 220, "rgba(224, 242, 254, 0.55)", "rgba(56, 189, 248, 0)");

  // Low-poly mountain wireframe vertices covering central doorway vista (X in mx ± 640px)
  const leftNodes: Array<[number, number]> = [
    [mx, apexY],              // 0: Main peak
    [mx - 74, apexY + 112],   // 1: Upper spine left
    [mx - 155, apexY + 162],  // 2: Left ridge shoulder 1
    [mx - 58, apexY + 250],   // 3: Upper canyon left
    [mx - 190, apexY + 285],  // 4: Mid facet left
    [mx - 310, apexY + 235],  // 5: Secondary left peak
    [mx - 95, apexY + 395],   // 6: Canyon bend left
    [mx - 245, apexY + 425],  // 7: Rib node
    [mx - 390, apexY + 385],  // 8: Shoulder flank
    [mx - 485, apexY + 465],  // 9: Outer slope
    [mx - 115, apexY + 560],  // 10: Lower canyon left
    [mx - 290, apexY + 580],  // 11: Lower ridge left
    [mx - 455, apexY + 575],  // 12: Foothill rib
    [mx - 585, apexY + 615],  // 13: Outer foothill peak
    [mx - 135, apexY + 755],  // 14: Base canyon lip left
    [mx - 340, apexY + 760],  // 15: Base rib left
    [mx - 545, apexY + 765],  // 16: Base apron left
    [mx - 165, baseY],        // 17: Floor canyon left
    [mx - 405, baseY],        // 18: Floor mid left
    [mx - 675, baseY],        // 19: Floor outer left
  ];

  const rightNodes: Array<[number, number]> = leftNodes.map(([x, y], idx) => {
    if (idx === 0) return [mx, apexY];
    const dx = mx - x;
    const jitter = idx >= 4 ? ((idx % 3) - 1) * 14 : 0;
    return [mx + dx, y + jitter];
  });

  const faces: Array<[number, number, number, string, string]> = [
    [0, 1, 2, "#38bdf8", "#0284c7"],
    [0, 1, 3, "#7dd3fc", "#0ea5e9"],
    [1, 3, 4, "#0ea5e9", "#0369a1"],
    [1, 2, 4, "#0284c7", "#0369a1"],
    [2, 4, 5, "#38bdf8", "#0284c7"],
    [4, 5, 8, "#0284c7", "#075985"],
    [3, 4, 6, "#0ea5e9", "#0369a1"],
    [4, 6, 7, "#0284c7", "#075985"],
    [4, 7, 8, "#0369a1", "#0c4a6e"],
    [5, 8, 9, "#0ea5e9", "#0369a1"],
    [8, 9, 12, "#0284c7", "#075985"],
    [6, 7, 10, "#38bdf8", "#0284c7"],
    [7, 10, 11, "#0ea5e9", "#0369a1"],
    [7, 8, 11, "#0284c7", "#075985"],
    [8, 11, 12, "#0369a1", "#082f49"],
    [9, 12, 13, "#0ea5e9", "#075985"],
    [10, 11, 14, "#0ea5e9", "#0369a1"],
    [11, 14, 15, "#0284c7", "#075985"],
    [11, 12, 15, "#0369a1", "#082f49"],
    [12, 15, 16, "#075985", "#041c3c"],
    [12, 13, 16, "#0284c7", "#062552"],
    [14, 15, 17, "#0284c7", "#062552"],
    [15, 17, 18, "#0369a1", "#041c3c"],
    [15, 16, 18, "#075985", "#03142e"],
    [16, 18, 19, "#062552", "#020c22"],
  ];

  const drawCrystalFacet = (
    p1: [number, number],
    p2: [number, number],
    p3: [number, number],
    c1: string,
    c2: string,
    isRight: boolean
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
    const grad = ctx.createLinearGradient(isRight ? maxX : minX, minY, isRight ? minX : maxX, maxY);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    ctx.globalAlpha = 0.84;
    ctx.fillStyle = grad;
    ctx.fill();

    // Glowing cyan wireframe mesh lines (Signature look in reference photo)
    ctx.globalAlpha = 1.0;
    ctx.strokeStyle = "rgba(125, 211, 252, 0.62)";
    ctx.lineWidth = 2.0;
    ctx.stroke();
    ctx.restore();
  };

  for (const [a, b, c, c1, c2] of faces) {
    drawCrystalFacet(leftNodes[a], leftNodes[b], leftNodes[c], c1, c2, false);
  }
  for (const [a, b, c, c1, c2] of faces) {
    const rightC1 = c1 === "#7dd3fc" ? "#38bdf8" : c1 === "#38bdf8" ? "#0ea5e9" : c1;
    const rightC2 = c2 === "#0ea5e9" ? "#0284c7" : "#062b63";
    drawCrystalFacet(rightNodes[a], rightNodes[b], rightNodes[c], rightC1, rightC2, true);
  }

  // Luminous vertex nodes on wireframe lattice
  ctx.save();
  ctx.fillStyle = "#e0f2fe";
  ctx.shadowColor = "#38bdf8";
  ctx.shadowBlur = 10;
  for (let i = 0; i < leftNodes.length - 3; i++) {
    ctx.beginPath();
    ctx.arc(leftNodes[i][0], leftNodes[i][1], 3.4, 0, Math.PI * 2);
    ctx.fill();
    if (i > 0) {
      ctx.beginPath();
      ctx.arc(rightNodes[i][0], rightNodes[i][1], 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // Graceful winding luminous path ascending the central mountain valley toward summit
  ctx.save();
  const roadTopY = apexY + 75;
  const roadGrad = ctx.createLinearGradient(0, baseY, 0, roadTopY);
  roadGrad.addColorStop(0.0, "rgba(14, 165, 233, 0.85)");
  roadGrad.addColorStop(0.55, "rgba(56, 189, 248, 0.95)");
  roadGrad.addColorStop(1.0, "rgba(224, 242, 254, 1.0)");

  ctx.beginPath();
  ctx.moveTo(mx - 155, baseY);
  ctx.bezierCurveTo(mx - 125, baseY - 220, mx + 60, baseY - 460, mx - 18, roadTopY);
  ctx.lineTo(mx + 18, roadTopY);
  ctx.bezierCurveTo(mx + 110, baseY - 460, mx + 45, baseY - 220, mx + 155, baseY);
  ctx.closePath();
  ctx.fillStyle = roadGrad;
  ctx.shadowColor = "#38bdf8";
  ctx.shadowBlur = 24;
  ctx.fill();

  ctx.strokeStyle = "rgba(224, 242, 254, 0.92)";
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(mx, baseY);
  ctx.bezierCurveTo(mx - 40, baseY - 220, mx + 85, baseY - 460, mx, roadTopY);
  ctx.stroke();
  ctx.restore();

  // Clean sunlit summit beacon & waving pennant flag on exact mountain peak
  ctx.save();
  ctx.translate(mx, apexY);
  ctx.shadowColor = "#7dd3fc";
  ctx.shadowBlur = 22;

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

  // Peak star glint
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Atmospheric cool cyan mist veil across lower base so mountain merges smoothly behind stairs
  const mistGrad = ctx.createLinearGradient(0, h * 0.68, 0, h);
  mistGrad.addColorStop(0, "rgba(6, 37, 110, 0)");
  mistGrad.addColorStop(0.65, "rgba(4, 24, 72, 0.55)");
  mistGrad.addColorStop(1, "rgba(2, 13, 46, 0.95)");
  ctx.fillStyle = mistGrad;
  ctx.fillRect(0, h * 0.68, w, h * 0.32);

  return canvas;
}
