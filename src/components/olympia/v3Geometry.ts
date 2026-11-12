/**
 * V3 "Mũi Tên" broadcast geometry (Econova-exact).
 *
 * Every V3 graphic (Khởi Động / Về Đích lower third, VCNV + Tăng Tốc answer rows,
 * Tổng kết điểm, Về Đích pack grid) is generated from ONE hexagon (`bgPts`) plus
 * the navy chevrons and cyan wings that hug it. Because all of those are derived from
 * the same numbers, the white border, navy fill and cyan wings can never drift apart.
 *
 * Coordinates are absolute pixels inside a canvas of size `canvasW x H`.
 * Slant rule (Econova): S = 0.3571 * H, the hexagon corner inset is pS = S / 2.
 */
import { RULESETS, getO22Rules } from "../../lib/olympia/rulesets";
import type { O22Quarter, RulesetId } from "../../lib/olympia/types";

export type Pt = [number, number];

/** Econova slant ratio: horizontal shift over the full height = 0.3571 * H. */
export const V3_SLANT_RATIO = 0.3571;

export function toPoly(pts: Pt[]): string {
  return pts.map((p) => `${p[0]}px ${p[1]}px`).join(", ");
}

export function toSvgPath(pts: Pt[]): string {
  return "M " + pts.map((p) => `${p[0]},${p[1]}`).join(" L ") + " Z";
}

// ─────────────────────────────────────────────────────────────────────────────
// Hexagonal clip-path helper geometry (6 vertices, Econova-exact)
// ─────────────────────────────────────────────────────────────────────────────

export interface HexClipPoints {
  closedPts: Pt[];
  openPts: Pt[];
  closedClip: string;
  openClip: string;
}

export function getHexClipPoints(
  shell: ArrowShell | { canvasW: number; H: number; bgPts: Pt[]; midY?: number }
): HexClipPoints {
  const cx = shell.canvasW / 2;
  const H = shell.H;
  const midY = shell.midY ?? H / 2;
  const closedPts: Pt[] = [
    [cx, 0],
    [cx, 0],
    [cx, midY],
    [cx, H],
    [cx, H],
    [cx, midY],
  ];
  const openPts = shell.bgPts;
  return {
    closedPts,
    openPts,
    closedClip: `polygon(${toPoly(closedPts)})`,
    openClip: `polygon(${toPoly(openPts)})`,
  };
}

export function getHexClipPolygonAt(
  shell: ArrowShell | { canvasW: number; H: number; bgPts: Pt[]; midY?: number },
  progress: number
): string {
  const u = Math.max(0, Math.min(1, progress));
  const cx = shell.canvasW / 2;
  const H = shell.H;
  const midY = shell.midY ?? H / 2;
  const [p0, p1, p2, p3, p4, p5] = shell.bgPts;
  const interpolate = (target: Pt, closed: Pt): Pt => [
    closed[0] + (target[0] - closed[0]) * u,
    closed[1] + (target[1] - closed[1]) * u,
  ];
  const pts: Pt[] = [
    interpolate(p0, [cx, 0]),
    interpolate(p1, [cx, 0]),
    interpolate(p2, [cx, midY]),
    interpolate(p3, [cx, H]),
    interpolate(p4, [cx, H]),
    interpolate(p5, [cx, midY]),
  ];
  return `polygon(${toPoly(pts)})`;
}

export interface HexClipKeyframeOptions {
  name: string;
  closeEndPercent?: number;
  openStartPercent?: number;
  openEndPercent?: number;
  timingFunction?: string;
  fadeInPercent?: number;
}

export function buildHexClipKeyframes(
  shell: ArrowShell | { canvasW: number; H: number; bgPts: Pt[]; midY?: number },
  opts: string | HexClipKeyframeOptions = "v3-eco-hex-body"
): string {
  const { closedClip, openClip } = getHexClipPoints(shell);
  const options: HexClipKeyframeOptions =
    typeof opts === "string" ? { name: opts } : opts;
  const name = options.name;

  if (typeof options.fadeInPercent === "number") {
    const fadeIn = options.fadeInPercent;
    const openEnd = options.openEndPercent ?? 100;
    return `@keyframes ${name} {
  0% { clip-path: ${closedClip}; opacity: 0; }
  ${fadeIn}% { opacity: 1; }
  ${openEnd}% { clip-path: ${openClip}; opacity: 1; }
  100% { clip-path: ${openClip}; opacity: 1; }
}`;
  }

  const closeEnd = options.closeEndPercent ?? 44.9;
  const openStart = options.openStartPercent ?? 45;
  const openEnd = options.openEndPercent ?? 80;
  const tf = options.timingFunction ?? "cubic-bezier(0.25, 1, 0.5, 1)";

  return `@keyframes ${name} {
  0%, ${closeEnd}% { clip-path: ${closedClip}; opacity: 0; }
  ${openStart}% { clip-path: ${closedClip}; opacity: 1; animation-timing-function: ${tf}; }
  ${openEnd}% { clip-path: ${openClip}; opacity: 1; }
  100% { clip-path: ${openClip}; opacity: 1; }
}`;
}


export interface ZigzagShape {
  bgPts: Pt[];
  alnPts: Pt[];
  arnPts: Pt[];
  alcPts: Pt[];
  arcPts: Pt[];
  slope: number;
  midY: number;
}

export function genZigzagShape(
  W: number,
  H: number,
  S: number,
  thick: number,
  cThick: number,
  startX = 0
): ZigzagShape {
  const L = startX;
  const R = startX + W;
  const midY = H / 2;
  const pS = S / 2;
  const slope = S / H;

  const bgPts: Pt[] = [
    [L + pS, 0],
    [R - pS, 0],
    [R, midY],
    [R - pS, H],
    [L + pS, H],
    [L, midY],
  ];

  const lnPts: Pt[] = [
    [L + pS - thick, 0],
    [L + pS, 0],
    [L, midY],
    [L + pS, H],
    [L + pS - thick, H],
    [L - thick, midY],
  ];

  const rnPts: Pt[] = [
    [R - pS, 0],
    [R - pS + thick, 0],
    [R + thick, midY],
    [R - pS + thick, H],
    [R - pS, H],
    [R, midY],
  ];

  const y1 = H * 0.125;
  const y2 = H * 0.875;
  const cShift = slope * (midY - y1);

  const lcPts: Pt[] = [
    [L - thick - cThick + cShift, y1],
    [L - thick + cShift, y1],
    [L - thick, midY],
    [L - thick + cShift, y2],
    [L - thick - cThick + cShift, y2],
    [L - thick - cThick, midY],
  ];

  const rcPts: Pt[] = [
    [R + thick - cShift, y1],
    [R + thick + cThick - cShift, y1],
    [R + thick + cThick, midY],
    [R + thick + cThick - cShift, y2],
    [R + thick - cShift, y2],
    [R + thick, midY],
  ];

  return { bgPts, alnPts: lnPts, arnPts: rnPts, alcPts: lcPts, arcPts: rcPts, slope, midY };
}

export interface GridCell {
  pts: Pt[];
  r: number;
  col: number;
  ptsValue: number;
  cx: number;
  cy: number;
}

export function genVeDichGridCells(
  W: number,
  H: number,
  S: number,
  numCols: number,
  ptsTypes: number[],
  startX = 0
): GridCell[] {
  const L = startX;
  const R = startX + W;
  const midY = H / 2;
  const pS = S / 2;
  const slope = S / H;
  const numRows = ptsTypes.length;
  const rowH = H / numRows;

  // Hexagon outer boundary:
  const edgeL = (y: number) =>
    y <= midY ? L + pS - (pS / midY) * y : L + (pS / midY) * (y - midY);
  const edgeR = (y: number) =>
    y <= midY ? R - pS + (pS / midY) * y : R - (pS / midY) * (y - midY);

  // Column dividers are continuous straight slanted lines "/" with slope -S/H:
  // x_div_k(y) = L + k * colW + slope * (midY - y)
  const colW = W / numCols;
  const xDiv = (k: number, y: number) => L + k * colW + slope * (midY - y);

  const cells: GridCell[] = [];

  for (let r = 0; r < numRows; r++) {
    const y1 = r * rowH;
    const y2 = (r + 1) * rowH;
    const bendsAtMid = y1 < midY && y2 > midY;

    for (let col = 0; col < numCols; col++) {
      const getL = (y: number) => (col === 0 ? edgeL(y) : xDiv(col, y));
      const getR = (y: number) => (col === numCols - 1 ? edgeR(y) : xDiv(col + 1, y));

      let pts: Pt[];
      if (bendsAtMid) {
        pts = [
          [getL(y1), y1],
          [getR(y1), y1],
          ...(col === numCols - 1 ? ([[R, midY]] as Pt[]) : []),
          [getR(y2), y2],
          [getL(y2), y2],
          ...(col === 0 ? ([[L, midY]] as Pt[]) : []),
        ];
      } else {
        pts = [
          [getL(y1), y1],
          [getR(y1), y1],
          [getR(y2), y2],
          [getL(y2), y2],
        ];
      }

      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      cells.push({
        pts,
        r,
        col,
        ptsValue: ptsTypes[r],
        cx: (Math.min(...xs) + Math.max(...xs)) / 2,
        cy: (Math.min(...ys) + Math.max(...ys)) / 2,
      });
    }
  }

  return cells;
}

// ─────────────────────────────────────────────────────────────────────────────
// Arrow shell (hexagon + navy chevrons + cyan wings) from a single point set
// ─────────────────────────────────────────────────────────────────────────────
export interface ArrowShellSpec {
  /** Hexagon width (without wings). */
  W: number;
  /** Hexagon height. */
  H: number;
  /** Slant ratio S/H. Defaults to the Econova value 0.3571. */
  slantRatio?: number;
  /** Horizontal thickness of the navy chevron. Default 0.21 * H. */
  thick?: number;
  /** Horizontal thickness of the cyan wing. Default 0.16 * H. */
  cThick?: number;
  /** Extra canvas padding for multi-layer ghost wings. Default 0. */
  pad?: number;
}

export interface ArrowShell extends ZigzagShape {
  W: number;
  H: number;
  S: number;
  pS: number;
  thick: number;
  cThick: number;
  /** x of the hexagon's left vertex column (= thick + cThick). */
  startX: number;
  /** x of the hexagon's right vertex column. */
  endX: number;
  canvasW: number;
  /** Hexagon left edge x at height y. */
  edgeL: (y: number) => number;
  /** Hexagon right edge x at height y. */
  edgeR: (y: number) => number;
}

export function buildArrowShell(spec: ArrowShellSpec): ArrowShell {
  const { W, H } = spec;
  const S = (spec.slantRatio ?? V3_SLANT_RATIO) * H;
  const thick = spec.thick ?? Math.round(H * 0.21);
  const cThick = spec.cThick ?? Math.round(H * 0.16);
  const pad = spec.pad ?? 0;
  const startX = thick + cThick + pad;
  const z = genZigzagShape(W, H, S, thick, cThick, startX);
  const pS = S / 2;
  const mid = H / 2;
  const L = startX;
  const R = startX + W;

  const edgeL = (y: number) => (y <= mid ? L + pS - (pS / mid) * y : L + (pS / mid) * (y - mid));
  const edgeR = (y: number) => (y <= mid ? R - pS + (pS / mid) * y : R - (pS / mid) * (y - mid));

  return {
    ...z,
    W,
    H,
    S,
    pS,
    thick,
    cThick,
    startX,
    endX: R,
    canvasW: W + 2 * startX,
    edgeL,
    edgeR,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Slanted cells: parallelograms whose "/" seams share the shell slope
// ─────────────────────────────────────────────────────────────────────────────
export interface SlantedCellsSpec {
  xl: (y: number) => number;
  xr: (y: number) => number;
  y0: number;
  y1: number;
  n: number;
  slope: number;
  /** Relative column widths measured at y0 (default equal). */
  weights?: number[];
  /** y values where xl/xr bend (e.g. the hexagon middle vertex). */
  breaks?: number[];
}

export interface SlantedCell {
  i: number;
  pts: Pt[];
  cx: number;
  cy: number;
  minX: number;
  maxX: number;
  /** Cell width measured at its vertical centre. */
  width: number;
  /** Left / right x at the top (y0) and bottom (y1) of the cell. */
  xl0: number;
  xl1: number;
  xr0: number;
  xr1: number;
}

export interface Seam {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface SlantedCells {
  cells: SlantedCell[];
  seams: Seam[];
}

export function buildSlantedCells(spec: SlantedCellsSpec): SlantedCells {
  const { xl, xr, y0, y1, n, slope } = spec;
  const weights = spec.weights && spec.weights.length === n ? spec.weights : Array(n).fill(1);
  const total = weights.reduce((a, b) => a + b, 0);
  const A0 = xl(y0);
  const B0 = xr(y0);

  // x position (at y0) of seam k, k = 1..n-1
  const seam0: number[] = [A0];
  let acc = 0;
  for (let k = 0; k < n - 1; k++) {
    acc += weights[k];
    seam0.push(A0 + (acc / total) * (B0 - A0));
  }
  seam0.push(B0);
  const seamX = (k: number, y: number) => seam0[k] - slope * (y - y0);

  const breaks = (spec.breaks ?? []).filter((b) => b > y0 + 1e-6 && b < y1 - 1e-6);
  const ys = [y0, ...breaks, y1];

  const cells: SlantedCell[] = [];
  for (let i = 0; i < n; i++) {
    const left = (y: number) => (i === 0 ? xl(y) : seamX(i, y));
    const right = (y: number) => (i === n - 1 ? xr(y) : seamX(i + 1, y));
    const pts: Pt[] = [
      ...ys.map((y) => [left(y), y] as Pt),
      ...[...ys].reverse().map((y) => [right(y), y] as Pt),
    ];
    const xs = pts.map((p) => p[0]);
    const cy = (y0 + y1) / 2;
    cells.push({
      i,
      pts,
      cx: (left(cy) + right(cy)) / 2,
      cy,
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      width: right(cy) - left(cy),
      xl0: left(y0),
      xl1: left(y1),
      xr0: right(y0),
      xr1: right(y1),
    });
  }

  const seams: Seam[] = [];
  for (let k = 1; k < n; k++) {
    seams.push({ x0: seamX(k, y0), y0, x1: seamX(k, y1), y1 });
  }
  return { cells, seams };
}

// ─────────────────────────────────────────────────────────────────────────────
// Lower third: contestant tab strip + Về Đích score cluster
// ─────────────────────────────────────────────────────────────────────────────
export type LowerThirdMode = "KHOI_DONG" | "VE_DICH";

export interface LowerThirdLayout {
  tabH: number;
  tabs: SlantedCells;
  /** Về Đích only: x of the "/" cluster divider at height y. */
  clusterX?: (y: number) => number;
  /** Về Đích only: polygon of the score cluster (right of the divider). */
  clusterPoly?: Pt[];
  /** Về Đích only: divider line from top to bottom of the hexagon. */
  clusterLine?: Seam;
}

export function buildLowerThirdLayout(
  shell: ArrowShell,
  n: number,
  mode: LowerThirdMode,
  opts: { tabH?: number; clusterBottomW?: number } = {}
): LowerThirdLayout {
  const tabH = opts.tabH ?? 38;
  const { slope, H, midY } = shell;
  const count = Math.max(1, n);

  if (mode === "KHOI_DONG") {
    // Left edge of tab 1 = hexagon left edge, right edge of last tab = hexagon right edge
    // (isosceles trapezoid), all inner seams are parallelograms with the shell slope.
    const tabs = buildSlantedCells({
      xl: shell.edgeL,
      xr: shell.edgeR,
      y0: 0,
      y1: tabH,
      n: count,
      slope,
    });
    return { tabH, tabs };
  }

  // Về Đích: the cluster divider is a "/" line parallel to the shell edges.
  const clusterBottomW = opts.clusterBottomW ?? 190;
  const xcBottom = shell.edgeR(H) - clusterBottomW;
  const xc = (y: number) => xcBottom + slope * (H - y);

  const tabs = buildSlantedCells({
    xl: shell.edgeL,
    xr: xc,
    y0: 0,
    y1: tabH,
    n: count,
    slope,
  });

  const clusterPoly: Pt[] = [
    [xc(0), 0],
    [shell.edgeR(0), 0],
    [shell.edgeR(midY), midY],
    [shell.edgeR(H), H],
    [xc(H), H],
  ];

  return {
    tabH,
    tabs,
    clusterX: xc,
    clusterPoly,
    clusterLine: { x0: xc(0), y0: 0, x1: xc(H), y1: H },
  };
}

/** Strip of slanted cells at the bottom of the Về Đích cluster (10 / 20 / 40 ...). */
export function buildClusterPackStrip(
  shell: ArrowShell,
  layout: LowerThirdLayout,
  n: number,
  stripH = 38
): SlantedCells | null {
  if (!layout.clusterX) return null;
  const y0 = shell.H - stripH;
  return buildSlantedCells({
    xl: layout.clusterX,
    xr: shell.edgeR,
    y0,
    y1: shell.H,
    n: Math.max(1, n),
    slope: shell.slope,
    breaks: [shell.midY],
  });
}

/** Answer rows (VCNV / Tăng Tốc): full-height columns inside one hexagon bar. */
export function buildRowColumns(shell: ArrowShell, weights: number[]): SlantedCells {
  return buildSlantedCells({
    xl: shell.edgeL,
    xr: shell.edgeR,
    y0: 0,
    y1: shell.H,
    n: weights.length,
    slope: shell.slope,
    weights,
    breaks: [shell.midY],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Về Đích pack grid: layout comes from the ruleset, never from string compares
// ─────────────────────────────────────────────────────────────────────────────
export interface VeDichGridSpec {
  /** "columns": column = question order, row = point value.
   *  "preset": one row, each cell is a fixed package (40 / 60 / 80). */
  mode: "columns" | "preset";
  /** Point value of each row (columns mode) or each cell (preset mode). */
  values: number[];
  rows: number;
  cols: number;
}

export function resolveVeDichGridSpec(
  rulesetId: RulesetId,
  o22Quarter: O22Quarter = 1
): VeDichGridSpec {
  const rs = RULESETS[rulesetId];
  const vd = rs.veDich;

  if (vd.selectionMode === "presetPackages" && vd.presetPackages) {
    const values = Object.keys(vd.presetPackages)
      .map(Number)
      .sort((a, b) => a - b);
    return { mode: "preset", values, rows: 1, cols: values.length };
  }

  if (rulesetId === "O22") {
    const o22 = getO22Rules(o22Quarter).veDich;
    return {
      mode: "columns",
      values: [...o22.pointOptions],
      rows: o22.pointOptions.length,
      cols: o22.questionsPerSeat,
    };
  }

  return {
    mode: "columns",
    values: [...vd.pointOptions],
    rows: vd.pointOptions.length,
    cols: vd.questionsPerSeat,
  };
}

/** Whether a grid cell must be drawn red for the owner's chosen package. */
export function isGridCellSelected(
  spec: VeDichGridSpec,
  cell: { col: number; ptsValue: number },
  selectedPoints: number[] | undefined
): boolean {
  if (!selectedPoints || selectedPoints.length === 0) return false;
  if (spec.mode === "preset") {
    const total = selectedPoints.reduce((s, p) => s + p, 0);
    return cell.ptsValue === total;
  }
  return selectedPoints[cell.col] === cell.ptsValue;
}

/** Cells for a grid spec. Preset mode = one row whose cell values are the package keys. */
export function buildVeDichGrid(
  shell: ArrowShell,
  spec: VeDichGridSpec
): GridCell[] {
  if (spec.mode === "preset") {
    const cells = genVeDichGridCells(shell.W, shell.H, shell.S, spec.cols, [0], shell.startX);
    return cells.map((c) => ({ ...c, ptsValue: spec.values[c.col] }));
  }
  return genVeDichGridCells(shell.W, shell.H, shell.S, spec.cols, spec.values, shell.startX);
}
