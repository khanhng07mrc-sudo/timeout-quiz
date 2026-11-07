import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs";

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const ARTIFACT_DIR_1 = path.resolve("d:\\Timeout Quiz\\.agents\\teamwork\\teamwork_worker_1\\screenshots");
const ARTIFACT_DIR_2 = path.resolve("C:\\Users\\khanh\\.gemini\\antigravity\\brain\\6a01f0ad-665c-4408-81ca-ba001243745b");
const ARTIFACT_DIR_3 = path.resolve("C:\\Users\\khanh\\.gemini\\antigravity\\brain\\aac021ca-ce70-48a4-b3be-d09545e52c3f\\screenshots");

async function capture() {
  console.log("[R6 Verification] Preparing screenshot capture dirs...");
  if (!fs.existsSync(ARTIFACT_DIR_1)) fs.mkdirSync(ARTIFACT_DIR_1, { recursive: true });
  if (!fs.existsSync(ARTIFACT_DIR_2)) fs.mkdirSync(ARTIFACT_DIR_2, { recursive: true });
  if (!fs.existsSync(ARTIFACT_DIR_3)) fs.mkdirSync(ARTIFACT_DIR_3, { recursive: true });

  console.log("[R6 Verification] Launching Edge browser via puppeteer-core...");
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--enable-webgl",
      "--use-gl=angle",
      "--use-angle=default",
      "--ignore-gpu-blocklist",
      "--high-dpi-support=1",
      "--force-device-scale-factor=2",
    ],
  });

  try {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setBypassServiceWorker(true);
    await page.setViewport({ width: 2560, height: 1440, deviceScaleFactor: 2 });

    const targetUrl = "http://localhost:3005/dev/graphics?tab=r6";
    console.log(`[R6 Verification] Navigating to ${targetUrl}...`);
    await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: 45000 });

    console.log("[R6 Verification] Waiting for Three.js canvases to mount...");
    await page.waitForSelector("#screenshot-r6-cam3-mc-framing canvas", { timeout: 30000 });

    console.log("[R6 Verification] Waiting 6s for WebGL 3D Studio shaders and animations to settle...");
    await new Promise((resolve) => setTimeout(resolve, 6000));

    const targets = [
      {
        id: "#screenshot-r6-cam3-mc-framing",
        filename: "screenshot_1_idle_mc_framing_cam3.png",
        desc: "R6.1: Idle MC Framing (CAM 3, Tight MC Framing, Desk Excluded)",
      },
      {
        id: "#screenshot-r6-tech-floor-animation",
        filename: "screenshot_2_rotating_tech_floor_6s.png",
        desc: "R6.2: 6s Rotating Tech Floor Animation (Cyan Laser Arcs & HUD Rings)",
      },
      {
        id: "#screenshot-r6-mc-center-stage",
        filename: "screenshot_3_mc_center_stage.png",
        desc: "R6.3: MCs at Center Stage ([0, 0.18, 0], Opening Walk)",
      },
      {
        id: "#screenshot-r6-empty-podiums-pre-match",
        filename: "screenshot_4_empty_podiums_pre_match.png",
        desc: "R6.4: Empty Podiums Pre-match (Phase 1: Olympia Logo on all Podiums)",
      },
      {
        id: "#screenshot-r6-podium-name-school",
        filename: "screenshot_5_podium_name_school_phase2.png",
        desc: "R6.5: Contestant Arrived at Podium (Phase 2: Name + High School Display)",
      },
    ];

    for (const target of targets) {
      console.log(`[R6 Verification] Finding element: ${target.id}...`);
      const el = await page.$(target.id);
      if (el) {
        await page.evaluate((sel) => {
          document.querySelector(sel)?.scrollIntoView({ block: "center", behavior: "instant" });
        }, target.id);
        await new Promise((resolve) => setTimeout(resolve, 800));

        const p1 = path.join(ARTIFACT_DIR_1, target.filename);
        const p2 = path.join(ARTIFACT_DIR_2, target.filename);
        const p3 = path.join(ARTIFACT_DIR_3, target.filename);
        await el.screenshot({ path: p1 });
        fs.copyFileSync(p1, p2);
        fs.copyFileSync(p1, p3);
        const stats = fs.statSync(p1);
        console.log(`  -> Successfully captured ${target.desc} (${stats.size} bytes)`);
      } else {
        console.warn(`  -> Element ${target.id} not found!`);
      }
    }

    console.log("[R6 Verification] All screenshots captured successfully!");
  } finally {
    await browser.close();
  }
}

capture().catch((err) => {
  console.error("[R6 Verification] Failed:", err);
  process.exit(1);
});
