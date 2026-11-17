import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BROWSER_PATH = fs.existsSync(EDGE_PATH) ? EDGE_PATH : CHROME_PATH;

const FONT_PATH = "C:\\Windows\\Fonts\\arialbd.ttf";
const LAUREL_PATH = path.join(ROOT_DIR, "public", "brand", "olympia_laurel_2016.webp");
const BUNDLE_OUT = path.join(__dirname, "intro-bundle.js");
const OUT_DIR = path.join(ROOT_DIR, ".agents", "teamwork", "worker_m1_master", "validation_frames");

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function testFrames() {
  console.log("Launching browser:", BROWSER_PATH);
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
      "--disable-dev-shm-usage",
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  page.on("pageerror", err => console.error("[Page Error]:", err));
  page.on("console", msg => console.log("[Page Console]:", msg.text()));

  const fontBase64 = fs.readFileSync(FONT_PATH).toString("base64");
  const laurelBase64 = fs.existsSync(LAUREL_PATH) ? fs.readFileSync(LAUREL_PATH).toString("base64") : "";
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
        <script>
          ${bundleCode}
        </script>
      </body>
    </html>
  `);

  await page.waitForFunction(() => window.__READY__ === true);
  await page.evaluate((key, fontB64, laurelB64) => {
    return window.initIntroScene(key, fontB64, laurelB64);
  }, "khoiDong", fontBase64, laurelBase64);

  const testTimestamps = [
    { sec: 0.5, name: "frame_0015_0.5s_trophy_base.jpg" },
    { sec: 1.8, name: "frame_0054_1.8s_star_trunk.jpg" },
    { sec: 2.7, name: "frame_0081_2.7s_apex_flare.jpg" },
    { sec: 3.2, name: "frame_0096_3.2s_sinking_transition.jpg" },
    { sec: 3.8, name: "frame_0114_3.8s_laurel_unfold.jpg" },
    { sec: 5.5, name: "frame_0165_5.5s_final_locked.jpg" },
  ];

  for (const item of testTimestamps) {
    const frameIdx = Math.round(item.sec * 30);
    const dataUrl = await page.evaluate((idx) => {
      return window.renderIntroFrame(idx, 30);
    }, frameIdx);

    const base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, "");
    const outPath = path.join(OUT_DIR, item.name);
    fs.writeFileSync(outPath, Buffer.from(base64Data, "base64"));
    console.log("Saved validation frame:", item.name, "size:", fs.statSync(outPath).size);
  }
  await page.close();

  // Test other 3 rounds
  const otherRounds = [
    { key: "vcnv", name: "frame_0165_5.5s_vcnv.jpg" },
    { key: "tangToc", name: "frame_0165_5.5s_tang_toc.jpg" },
    { key: "veDich", name: "frame_0165_5.5s_ve_dich.jpg" },
  ];

  for (const r of otherRounds) {
    const p = await browser.newPage();
    await p.setViewport({ width: 1920, height: 1080 });
    await p.setContent(`
      <!DOCTYPE html><html><head><style>html,body{margin:0;padding:0;overflow:hidden;background:#000;}canvas{width:1920px;height:1080px;display:block;}</style></head><body><canvas id="c" width="1920" height="1080"></canvas><script>${bundleCode}</script></body></html>
    `);
    await p.waitForFunction(() => window.__READY__ === true);
    await p.evaluate((key, fontB64, laurelB64) => {
      return window.initIntroScene(key, fontB64, laurelB64);
    }, r.key, fontBase64, laurelBase64);

    const dataUrl = await p.evaluate(() => window.renderIntroFrame(165, 30));
    const base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, "");
    const outPath = path.join(OUT_DIR, r.name);
    fs.writeFileSync(outPath, Buffer.from(base64Data, "base64"));
    console.log("Saved round frame:", r.name, "size:", fs.statSync(outPath).size);
    await p.close();
  }

  await browser.close();
  console.log("All test validation frames generated successfully!");
}

testFrames().catch(err => {
  console.error("Fatal in testFrames:", err);
  process.exit(1);
});
