import fs from "node:fs";
import zlib from "node:zlib";

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/**
 * Pure-Node PNG decoder supporting 8-bit RGB (colorType 2) and RGBA (colorType 6),
 * non-interlaced, with full PNG scanline unfiltering (types 0-4).
 */
export function decodePng(input) {
  const buf = Buffer.isBuffer(input) ? input : fs.readFileSync(input);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (buf.length < 24 || !buf.subarray(0, 8).equals(sig)) {
    throw new Error("Invalid PNG signature");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idatChunks = [];

  while (offset + 8 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.subarray(offset + 4, offset + 8).toString("ascii");
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buf.length) break;

    if (type === "IHDR") {
      width = buf.readUInt32BE(dataStart);
      height = buf.readUInt32BE(dataStart + 4);
      bitDepth = buf[dataStart + 8];
      colorType = buf[dataStart + 9];
      interlace = buf[dataStart + 12];
    } else if (type === "IDAT") {
      idatChunks.push(buf.subarray(dataStart, dataEnd));
    } else if (type === "IEND") {
      break;
    }
    offset = dataEnd + 4;
  }

  if (!width || !height) throw new Error("Missing PNG IHDR dimensions");
  if (bitDepth !== 8) throw new Error(`Unsupported PNG bitDepth=${bitDepth}`);
  if (interlace !== 0) throw new Error("Interlaced PNGs are not supported");

  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 4 ? 2 : colorType === 0 ? 1 : 0;
  if (!channels) throw new Error(`Unsupported PNG colorType=${colorType}`);

  const raw = zlib.inflateSync(Buffer.concat(idatChunks));
  const stride = width * channels;
  const expectedLen = height * (stride + 1);
  if (raw.length < expectedLen) {
    throw new Error(`Inflated PNG length ${raw.length} < expected ${expectedLen}`);
  }

  const rgba = new Uint8Array(width * height * 4);
  const prevRow = new Uint8Array(stride);
  const curRow = new Uint8Array(stride);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (stride + 1);
    const filterType = raw[rowOffset];
    for (let i = 0; i < stride; i++) {
      const x = raw[rowOffset + 1 + i];
      const a = i >= channels ? curRow[i - channels] : 0;
      const b = prevRow[i];
      const c = i >= channels ? prevRow[i - channels] : 0;
      let val = x;
      if (filterType === 1) val = (x + a) & 0xff;
      else if (filterType === 2) val = (x + b) & 0xff;
      else if (filterType === 3) val = (x + ((a + b) >> 1)) & 0xff;
      else if (filterType === 4) val = (x + paethPredictor(a, b, c)) & 0xff;
      else if (filterType !== 0) throw new Error(`Unknown PNG filter type ${filterType}`);
      curRow[i] = val;
    }

    for (let x = 0; x < width; x++) {
      const dst = (y * width + x) * 4;
      const src = x * channels;
      if (channels === 4) {
        rgba[dst] = curRow[src];
        rgba[dst + 1] = curRow[src + 1];
        rgba[dst + 2] = curRow[src + 2];
        rgba[dst + 3] = curRow[src + 3];
      } else if (channels === 3) {
        rgba[dst] = curRow[src];
        rgba[dst + 1] = curRow[src + 1];
        rgba[dst + 2] = curRow[src + 2];
        rgba[dst + 3] = 255;
      } else if (channels === 2) {
        rgba[dst] = curRow[src];
        rgba[dst + 1] = curRow[src];
        rgba[dst + 2] = curRow[src];
        rgba[dst + 3] = curRow[src + 1];
      } else {
        rgba[dst] = curRow[src];
        rgba[dst + 1] = curRow[src];
        rgba[dst + 2] = curRow[src];
        rgba[dst + 3] = 255;
      }
    }
    prevRow.set(curRow);
  }

  return { width, height, channels: 4, rgba };
}

/**
 * Analyzes normalized regions ([x0, y0, x1, y1] in 0..1) for luminance,
 * non-black coverage, mean RGB, and BLUE vs RED hue dominance.
 */
export function analyzeRegions(png, regions) {
  const out = {};
  for (const [name, box] of Object.entries(regions)) {
    const x0 = Math.max(0, Math.floor(box[0] * png.width));
    const y0 = Math.max(0, Math.floor(box[1] * png.height));
    const x1 = Math.min(png.width, Math.ceil(box[2] * png.width));
    const y1 = Math.min(png.height, Math.ceil(box[3] * png.height));

    let count = 0;
    let sumR = 0;
    let sumG = 0;
    let sumB = 0;
    let nonBlack = 0;
    let luminous = 0;
    let blueDominant = 0;
    let redDominant = 0;

    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = (y * png.width + x) * 4;
        const r = png.rgba[i];
        const g = png.rgba[i + 1];
        const b = png.rgba[i + 2];
        count++;
        sumR += r;
        sumG += g;
        sumB += b;
        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (r + g + b > 18) nonBlack++;
        if (luma > 45) luminous++;
        if (b > r + 18 && b > 50) blueDominant++;
        if (r > b + 18 && r > 50) redDominant++;
      }
    }

    const n = Math.max(1, count);
    const meanR = sumR / n;
    const meanG = sumG / n;
    const meanB = sumB / n;
    out[name] = {
      pixels: count,
      meanR: Math.round(meanR * 100) / 100,
      meanG: Math.round(meanG * 100) / 100,
      meanB: Math.round(meanB * 100) / 100,
      meanLuma: Math.round((0.2126 * meanR + 0.7152 * meanG + 0.0722 * meanB) * 100) / 100,
      nonBlackRatio: Math.round((nonBlack / n) * 10000) / 10000,
      luminousRatio: Math.round((luminous / n) * 10000) / 10000,
      blueDominantRatio: Math.round((blueDominant / n) * 10000) / 10000,
      redDominantRatio: Math.round((redDominant / n) * 10000) / 10000,
    };
  }
  return out;
}

/**
 * Computes downsampled block-grid RMSE & MAE (using 8x8 blocks to tolerate minor
 * animated symbol/camera drift while catching stripped geometry, black WebGL,
 * or broken lighting/colors).
 */
export function compareImages(actualInput, baselineInput, opts = {}) {
  const {
    maxRmse = 0.22,
    maxMae = 0.16,
    minNonBlackRatio = 0.05,
    blockSize = 8,
  } = opts;

  const actual = decodePng(actualInput);
  const baseline = decodePng(baselineInput);

  if (actual.width !== baseline.width || actual.height !== baseline.height) {
    return {
      ok: false,
      reason: `Dimension mismatch: actual=${actual.width}x${actual.height}, baseline=${baseline.width}x${baseline.height}`,
      actualDims: { width: actual.width, height: actual.height },
      baselineDims: { width: baseline.width, height: baseline.height },
    };
  }

  const fullStats = analyzeRegions(actual, { full: [0, 0, 1, 1] }).full;
  if (fullStats.nonBlackRatio < minNonBlackRatio) {
    return {
      ok: false,
      reason: `Actual image appears blank/black (nonBlackRatio=${fullStats.nonBlackRatio} < ${minNonBlackRatio})`,
      fullStats,
    };
  }

  // Raw pixel RMSE + 8x8 block-averaged RMSE (handles animated LED symbols & shimmer)
  let sumSq = 0;
  let sumAbs = 0;
  const pixelCount = actual.width * actual.height;
  for (let i = 0; i < pixelCount * 4; i += 4) {
    const dr = (actual.rgba[i] - baseline.rgba[i]) / 255;
    const dg = (actual.rgba[i + 1] - baseline.rgba[i + 1]) / 255;
    const db = (actual.rgba[i + 2] - baseline.rgba[i + 2]) / 255;
    sumSq += (dr * dr + dg * dg + db * db) / 3;
    sumAbs += (Math.abs(dr) + Math.abs(dg) + Math.abs(db)) / 3;
  }
  const pixelRmse = Math.sqrt(sumSq / pixelCount);
  const pixelMae = sumAbs / pixelCount;

  const cols = Math.floor(actual.width / blockSize);
  const rows = Math.floor(actual.height / blockSize);
  let blockSq = 0;
  let blockAbs = 0;
  let blockCount = 0;

  for (let by = 0; by < rows; by++) {
    for (let bx = 0; bx < cols; bx++) {
      let ar = 0, ag = 0, ab = 0;
      let br = 0, bg = 0, bb = 0;
      const area = blockSize * blockSize;
      for (let dy = 0; dy < blockSize; dy++) {
        const y = by * blockSize + dy;
        for (let dx = 0; dx < blockSize; dx++) {
          const x = bx * blockSize + dx;
          const idx = (y * actual.width + x) * 4;
          ar += actual.rgba[idx];
          ag += actual.rgba[idx + 1];
          ab += actual.rgba[idx + 2];
          br += baseline.rgba[idx];
          bg += baseline.rgba[idx + 1];
          bb += baseline.rgba[idx + 2];
        }
      }
      const dr = (ar - br) / (area * 255);
      const dg = (ag - bg) / (area * 255);
      const db = (ab - bb) / (area * 255);
      blockSq += (dr * dr + dg * dg + db * db) / 3;
      blockAbs += (Math.abs(dr) + Math.abs(dg) + Math.abs(db)) / 3;
      blockCount++;
    }
  }

  const blockRmse = blockCount > 0 ? Math.sqrt(blockSq / blockCount) : pixelRmse;
  const blockMae = blockCount > 0 ? blockAbs / blockCount : pixelMae;

  const ok = blockRmse <= maxRmse && blockMae <= maxMae;
  return {
    ok,
    reason: ok
      ? null
      : `Visual parity diff exceeded threshold (blockRmse=${blockRmse.toFixed(4)} > ${maxRmse} or blockMae=${blockMae.toFixed(4)} > ${maxMae})`,
    width: actual.width,
    height: actual.height,
    pixelRmse: Math.round(pixelRmse * 10000) / 10000,
    pixelMae: Math.round(pixelMae * 10000) / 10000,
    blockRmse: Math.round(blockRmse * 10000) / 10000,
    blockMae: Math.round(blockMae * 10000) / 10000,
    fullStats,
  };
}
