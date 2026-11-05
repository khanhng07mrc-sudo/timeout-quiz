/* Run with: npx tsx src/components/olympia/v3Geometry.test.ts */
import assert from "node:assert/strict";
import {
  buildArrowShell,
  buildLowerThirdLayout,
  buildClusterPackStrip,
  buildRowColumns,
  buildVeDichGrid,
  isGridCellSelected,
  resolveVeDichGridSpec,
  V3_SLANT_RATIO,
  type Pt,
} from "./v3Geometry";

const EPS = 1e-6;
let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ok   ${name}`);
}
const near = (a: number, b: number, msg: string) =>
  assert.ok(Math.abs(a - b) < 1e-4, `${msg}: ${a} vs ${b}`);

console.log("V3 geometry");

for (const H of [70, 172, 195, 268]) {
  const shell = buildArrowShell({ W: 900, H });

  test(`H=${H}: slope is the Econova ratio and corner inset = S/2`, () => {
    near(shell.S, V3_SLANT_RATIO * H, "S");
    near(shell.slope, V3_SLANT_RATIO, "slope");
    near(shell.bgPts[0][0], shell.startX + shell.pS, "top-left inset");
  });

  test(`H=${H}: navy chevron inner edge lies exactly on the hexagon edge`, () => {
    // left navy points: [L+pS-thick,0],[L+pS,0],[L,mid],[L+pS,H],...
    const [, topInner, midInner, botInner] = shell.alnPts;
    near(topInner[0], shell.edgeL(0), "navy inner top");
    near(midInner[0], shell.edgeL(shell.midY), "navy inner mid");
    near(botInner[0], shell.edgeL(H), "navy inner bottom");
    const [rTop, , rMidOuter, , rBot, rMidInner] = shell.arnPts;
    near(rTop[0], shell.edgeR(0), "right navy inner top");
    near(rMidInner[0], shell.edgeR(shell.midY), "right navy inner mid");
    near(rBot[0], shell.edgeR(H), "right navy inner bottom");
    assert.ok(rMidOuter[0] > rMidInner[0]);
  });

  test(`H=${H}: cyan wing inner edge follows the navy outer edge`, () => {
    // navy outer edge x at y
    const navyOuterX = (y: number) => shell.edgeL(y) - shell.thick;
    const [c0, c1, c2, c3] = shell.alcPts;
    near(c1[0], navyOuterX(c1[1]), "cyan inner top");
    near(c2[0], navyOuterX(c2[1]), "cyan inner mid");
    near(c3[0], navyOuterX(c3[1]), "cyan inner bottom");
    assert.ok(c0[0] < c1[0]);
  });

  test(`H=${H}: canvas leftmost/rightmost point sits on 0 / canvasW`, () => {
    const all: Pt[] = [...shell.alcPts, ...shell.arcPts];
    const xs = all.map((p) => p[0]);
    near(Math.min(...xs), 0, "min x");
    near(Math.max(...xs), shell.canvasW, "max x");
  });
}

test("Khởi Động tabs: first left edge on hexagon, last right edge on hexagon (trapezoid)", () => {
  const shell = buildArrowShell({ W: 900, H: 172 });
  const lt = buildLowerThirdLayout(shell, 4, "KHOI_DONG", { tabH: 38 });
  const first = lt.tabs.cells[0];
  const last = lt.tabs.cells[3];
  near(first.xl0, shell.edgeL(0), "tab1 top-left");
  near(first.xl1, shell.edgeL(38), "tab1 bottom-left");
  near(last.xr0, shell.edgeR(0), "tab4 top-right");
  near(last.xr1, shell.edgeR(38), "tab4 bottom-right");
  // trapezoid: right edge slants "\\" (bottom is wider), left edge slants "/"
  assert.ok(last.xr1 > last.xr0, "tab4 right edge goes outward downwards");
  assert.ok(last.xl1 < last.xl0, "tab4 left edge goes outward downwards");
  // tabs 1..3 are parallelograms: both edges move left going down by slope*tabH
  for (let i = 0; i < 3; i++) {
    const c = lt.tabs.cells[i];
    near(c.xl0 - c.xl1, shell.slope * 38, `tab${i + 1} left slant`);
    near(c.xr0 - c.xr1, shell.slope * 38, `tab${i + 1} right slant`);
  }
});

test("Khởi Động tabs: seams are shared (no gap, no overlap) and use the shell slope", () => {
  const shell = buildArrowShell({ W: 900, H: 172 });
  const lt = buildLowerThirdLayout(shell, 4, "KHOI_DONG");
  for (let i = 0; i < 3; i++) {
    const a = lt.tabs.cells[i];
    const b = lt.tabs.cells[i + 1];
    near(a.xr0, b.xl0, `seam ${i} top`);
    near(a.xr1, b.xl1, `seam ${i} bottom`);
  }
  for (const s of lt.tabs.seams) near((s.x0 - s.x1) / (s.y1 - s.y0), shell.slope, "seam slope");
});

test("Về Đích tabs: ALL tabs are parallelograms and divider is parallel to the hexagon edge", () => {
  const shell = buildArrowShell({ W: 900, H: 172 });
  const lt = buildLowerThirdLayout(shell, 4, "VE_DICH", { tabH: 38 });
  for (const c of lt.tabs.cells) {
    near(c.xl0 - c.xl1, shell.slope * 38, `tab${c.i + 1} left slant`);
    near(c.xr0 - c.xr1, shell.slope * 38, `tab${c.i + 1} right slant`);
  }
  assert.ok(lt.clusterLine);
  near((lt.clusterLine!.x0 - lt.clusterLine!.x1) / shell.H, shell.slope, "cluster slope");
  near(lt.tabs.cells[3].xr0, lt.clusterX!(0), "last tab meets cluster divider");
  near(lt.tabs.cells[0].xl0, shell.edgeL(0), "first tab on hexagon");
  for (const [x, y] of lt.clusterPoly!) {
    assert.ok(x <= shell.edgeR(y) + EPS, "cluster inside right edge");
  }
});

test("Về Đích pack strip: parallelograms from the cluster divider to the hexagon edge", () => {
  const shell = buildArrowShell({ W: 900, H: 172 });
  const lt = buildLowerThirdLayout(shell, 4, "VE_DICH");
  const strip = buildClusterPackStrip(shell, lt, 3, 38)!;
  assert.equal(strip.cells.length, 3);
  near(strip.cells[0].xl0, lt.clusterX!(shell.H - 38), "strip starts on cluster divider");
  near(strip.cells[2].xr1, shell.edgeR(shell.H), "strip ends on hexagon bottom corner");
  near(strip.cells[2].xr0, shell.edgeR(shell.H - 38), "strip right edge follows hexagon");
  for (const s of strip.seams) near((s.x0 - s.x1) / (s.y1 - s.y0), shell.slope, "strip seam slope");
});

test("Answer row columns: 2 and 3 column bars share seams and span the full hexagon", () => {
  const shell = buildArrowShell({ W: 900, H: 70 });
  for (const w of [[48, 52], [38, 40, 22]]) {
    const cols = buildRowColumns(shell, w);
    assert.equal(cols.cells.length, w.length);
    const first = cols.cells[0];
    const last = cols.cells[cols.cells.length - 1];
    near(Math.min(...first.pts.map((p) => p[0])), shell.startX, "left vertex");
    near(Math.max(...last.pts.map((p) => p[0])), shell.endX, "right vertex");
    for (const s of cols.seams) near((s.x0 - s.x1) / shell.H, shell.slope, "row seam slope");
    for (let i = 0; i < cols.cells.length - 1; i++) {
      near(cols.cells[i].xr0, cols.cells[i + 1].xl0, "shared seam top");
      near(cols.cells[i].xr1, cols.cells[i + 1].xl1, "shared seam bottom");
    }
  }
});

test("Về Đích grid spec comes from the ruleset", () => {
  const o13 = resolveVeDichGridSpec("O13");
  assert.deepEqual([o13.mode, o13.rows, o13.cols, o13.values], ["preset", 1, 3, [40, 60, 80]]);
  const o15 = resolveVeDichGridSpec("O15");
  assert.deepEqual([o15.mode, o15.rows, o15.cols, o15.values], ["preset", 1, 3, [40, 60, 80]]);
  const o20 = resolveVeDichGridSpec("O20");
  assert.deepEqual([o20.mode, o20.rows, o20.cols, o20.values], ["columns", 3, 3, [10, 20, 30]]);
  const o21 = resolveVeDichGridSpec("O21");
  assert.deepEqual([o21.mode, o21.rows, o21.cols, o21.values], ["columns", 3, 3, [10, 20, 30]]);
  const q1 = resolveVeDichGridSpec("O22", 1);
  assert.deepEqual([q1.mode, q1.rows, q1.cols, q1.values], ["columns", 2, 2, [20, 40]]);
  const q2 = resolveVeDichGridSpec("O22", 2);
  assert.deepEqual([q2.mode, q2.rows, q2.cols, q2.values], ["columns", 2, 3, [20, 30]]);
  const q3 = resolveVeDichGridSpec("O22", 3);
  assert.deepEqual([q3.mode, q3.rows, q3.cols, q3.values], ["columns", 2, 3, [20, 30]]);
});

test("Về Đích grid selection: one red cell per column; preset = exactly one red cell", () => {
  const shell = buildArrowShell({ W: 1080, H: 360, slantRatio: 0.25, thick: 36, cThick: 28 });

  const q2 = resolveVeDichGridSpec("O22", 2);
  const cells = buildVeDichGrid(shell, q2);
  assert.equal(cells.length, 6);
  const picked = [20, 30, 20];
  const red = cells.filter((c) => isGridCellSelected(q2, c, picked));
  assert.equal(red.length, 3);
  for (let col = 0; col < 3; col++) {
    assert.equal(red.filter((c) => c.col === col).length, 1, `column ${col} has one red cell`);
    assert.equal(red.find((c) => c.col === col)!.ptsValue, picked[col]);
  }
  assert.equal(cells.filter((c) => isGridCellSelected(q2, c, undefined)).length, 0);

  const o13 = resolveVeDichGridSpec("O13");
  const pc = buildVeDichGrid(shell, o13);
  assert.equal(pc.length, 3);
  assert.deepEqual(pc.map((c) => c.ptsValue), [40, 60, 80]);
  const sel = pc.filter((c) => isGridCellSelected(o13, c, [10, 10, 20, 20]));
  assert.equal(sel.length, 1);
  assert.equal(sel[0].ptsValue, 60);
  const sel80 = pc.filter((c) => isGridCellSelected(o13, c, [10, 20, 20, 30]));
  assert.deepEqual(sel80.map((c) => c.ptsValue), [80]);
  const o15 = resolveVeDichGridSpec("O15");
  const sel15 = buildVeDichGrid(shell, o15).filter((c) => isGridCellSelected(o15, c, [10, 10, 20]));
  assert.deepEqual(sel15.map((c) => c.ptsValue), [40]);
});

test("Về Đích grid cells tile the hexagon (cells never leave the hexagon outline)", () => {
  const shell = buildArrowShell({ W: 1080, H: 360, slantRatio: 0.25, thick: 36, cThick: 28 });
  for (const spec of [resolveVeDichGridSpec("O20"), resolveVeDichGridSpec("O22", 1), resolveVeDichGridSpec("O13")]) {
    for (const c of buildVeDichGrid(shell, spec)) {
      for (const [x, y] of c.pts) {
        assert.ok(x >= shell.edgeL(y) - 1e-4 && x <= shell.edgeR(y) + 1e-4, `point ${x},${y} inside hexagon`);
      }
    }
  }
});

test("Về Đích 2-row grid (O24-O26 / Olympia 26): cells are parallelograms and dividers are straight lines", () => {
  const shell = buildArrowShell({ W: 1080, H: 360, slantRatio: 0.25, thick: 36, cThick: 28 });
  const spec = resolveVeDichGridSpec("O26");
  const cells = buildVeDichGrid(shell, spec);
  assert.equal(cells.length, 6);

  // Row 0, Col 0: parallelogram (dx top = dx bot = colW, left slope = right slope = shell.slope)
  const c00 = cells.find((c) => c.r === 0 && c.col === 0)!;
  near(c00.pts[1][0] - c00.pts[0][0], 360, "c00 top width");
  near(c00.pts[2][0] - c00.pts[3][0], 360, "c00 bottom width");
  near((c00.pts[0][0] - c00.pts[3][0]) / (shell.H / 2), shell.slope, "c00 left slope");
  near((c00.pts[1][0] - c00.pts[2][0]) / (shell.H / 2), shell.slope, "c00 right slope");

  // Row 0, Col 1: parallelogram
  const c01 = cells.find((c) => c.r === 0 && c.col === 1)!;
  near(c01.pts[1][0] - c01.pts[0][0], 360, "c01 top width");
  near(c01.pts[2][0] - c01.pts[3][0], 360, "c01 bottom width");
  near((c01.pts[0][0] - c01.pts[3][0]) / (shell.H / 2), shell.slope, "c01 left slope");

  // Row 1, Col 1: parallelogram
  const c11 = cells.find((c) => c.r === 1 && c.col === 1)!;
  near(c11.pts[1][0] - c11.pts[0][0], 360, "c11 top width");
  near(c11.pts[2][0] - c11.pts[3][0], 360, "c11 bottom width");
  near((c11.pts[0][0] - c11.pts[3][0]) / (shell.H / 2), shell.slope, "c11 left slope");

  // Row 1, Col 2: parallelogram
  const c12 = cells.find((c) => c.r === 1 && c.col === 2)!;
  near(c12.pts[1][0] - c12.pts[0][0], 360, "c12 top width");
  near(c12.pts[2][0] - c12.pts[3][0], 360, "c12 bottom width");
  near((c12.pts[0][0] - c12.pts[3][0]) / (shell.H / 2), shell.slope, "c12 left slope");
  near((c12.pts[1][0] - c12.pts[2][0]) / (shell.H / 2), shell.slope, "c12 right slope");
});

console.log(`${passed} tests passed`);
