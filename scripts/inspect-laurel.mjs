import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const laurelPath = path.join(__dirname, "..", "public", "brand", "olympia_laurel_2016.webp");

const img = sharp(laurelPath);
const meta = await img.metadata();
console.log("Image size:", meta.width, "x", meta.height);
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });

// Find all non-transparent pixels in top half
console.log("Image size:", meta.width, "x", meta.height);

// Analyze rows y from 60 to 180 to see the leaf bounds and arc bounds
for (let y = 60; y <= 160; y += 10) {
  let xs = [];
  for (let x = 0; x < meta.width; x++) {
    const idx = (y * meta.width + x) * info.channels;
    if (data[idx + 3] > 40) xs.push(x);
  }
  if (xs.length > 0) {
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    // Find gaps
    let gaps = [];
    for (let i = 1; i < xs.length; i++) {
      if (xs[i] - xs[i-1] > 15) gaps.push([xs[i-1], xs[i]]);
    }
    console.log(`y=${y.toString().padStart(3)}: count=${xs.length}, minX=${minX}, maxX=${maxX}, gaps=${JSON.stringify(gaps)}`);
  }
}






