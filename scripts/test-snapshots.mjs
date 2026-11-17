import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
import * as esbuild from "esbuild";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const FONT_PATH = "C:\\Windows\\Fonts\\arialbd.ttf";
const LAUREL_PATH = path.join(ROOT_DIR, "public", "brand", "olympia_laurel_2016.webp");
const BUNDLE_SRC = path.join(__dirname, "intro-runner.mjs");
const BUNDLE_OUT = path.join(__dirname, "intro-bundle.js");

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BROWSER_PATH = fs.existsSync(EDGE_PATH) ? EDGE_PATH : CHROME_PATH;

console.log("==> Bundling with esbuild...");
await esbuild.build({
  entryPoints: [BUNDLE_SRC],
  bundle: true,
  outfile: BUNDLE_OUT,
  format: "iife",
  target: "chrome110",
  minify: false,
});
console.log("    Bundle ready.");

const browser = await puppeteer.launch({
  executablePath: BROWSER_PATH,
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--enable-webgl",
    "--use-gl=angle",
    "--use-angle=default",
    "--ignore-gpu-blocklist",
  ],
});

const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080 });

const fontBase64 = fs.readFileSync(FONT_PATH).toString("base64");
const laurelBase64 = fs.readFileSync(LAUREL_PATH).toString("base64");
const bundleCode = fs.readFileSync(BUNDLE_OUT, "utf8");

await page.setContent(`
  <!DOCTYPE html>
  <html>
    <head>
      <style>
        html, body { margin: 0; padding: 0; overflow: hidden; background: #000; }
        canvas { width: 1920px; height: 1080px; display: block; }
      </style>
    </head>
    <body>
      <canvas id="c" width="1920" height="1080"></canvas>
      <script>${bundleCode}</script>
    </body>
  </html>
`);

await page.waitForFunction(() => window.__READY__ === true);
await page.evaluate((key, fontB64, laurelB64) => {
  return window.initIntroScene(key, fontB64, laurelB64);
}, "khoiDong", fontBase64, laurelBase64);

const testTimes = [
  { t: 0.05, label: "0.05s_ground" },
  { t: 0.2, label: "0.2s_base" },
  { t: 1.2, label: "1.2s_stem" },
  { t: 3.5, label: "3.5s_star_apex" },
  { t: 5.0, label: "5.0s_transition" },
  { t: 6.5, label: "6.5s_lockup" },
];


for (const item of testTimes) {
  const frameIdx = Math.round(item.t * 30);
  const dataUrl = await page.evaluate((f) => {
    return window.renderIntroFrame(f, 30);
  }, frameIdx);

  const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, "");
  const outPath = path.join(ROOT_DIR, `snapshot_${item.label}.jpg`);
  fs.writeFileSync(outPath, Buffer.from(base64, "base64"));
  console.log(`Saved snapshot: ${outPath} (${item.t}s)`);
}

await browser.close();
console.log("==> All snapshots rendered successfully!");
