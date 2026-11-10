import fs from "node:fs";
import path from "node:path";

const dir = path.resolve("public/screenshots/r6");
const files = fs.readdirSync(dir);

console.log("================================================================================");
console.log("PNG IMAGE VERIFICATION REPORT");
console.log("================================================================================");

let allValid = true;

for (const f of files) {
  if (!f.endsWith(".png")) continue;
  const p = path.join(dir, f);
  const buf = Buffer.alloc(24);
  const fd = fs.openSync(p, "r");
  fs.readSync(fd, buf, 0, 24, 0);
  fs.closeSync(fd);

  const isPng = buf.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const size = fs.statSync(p).size;

  const valid = isPng && width > 0 && height > 0 && size > 15000;
  if (!valid) allValid = false;

  console.log(`- ${f.padEnd(28)} | ${width}x${height} | ${size.toLocaleString().padStart(8)} bytes | Valid PNG: ${isPng ? "YES" : "NO"}`);
}

console.log("================================================================================");
console.log(`Overall Status: ${allValid ? "ALL IMAGES 100% VALID" : "VALIDATION FAILED"}`);
console.log("================================================================================");

if (!allValid) process.exit(1);
