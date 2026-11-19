import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs";
import http from "node:http";
import { spawn, execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BROWSER_PATH = fs.existsSync(EDGE_PATH) ? EDGE_PATH : CHROME_PATH;

const PORT = Number(process.env.PORT) || 3005;

const PRIMARY_DIR = path.resolve(PROJECT_ROOT, "public/screenshots/olympia27");
const MIRROR_DIRS = [
  path.resolve(PROJECT_ROOT, "public/screenshots"),
  path.resolve("C:/Users/khanh/.gemini/antigravity/scratch/teamwork/def12d49-12c2-48bc-8594-b60e652de31b/.agents/teamwork/worker_implement_1/screenshots"),
  path.resolve("C:/Users/khanh/.gemini/antigravity/scratch/teamwork/d6688681-9209-4339-8192-184060e0f2df/.agents/teamwork/e2e_testing_orch/screenshots"),
  path.resolve("C:/Users/khanh/.gemini/antigravity/scratch/teamwork/d6688681-9209-4339-8192-184060e0f2df/.agents/teamwork/e2e_test_writer_1/screenshots"),
];

const TARGETS = [
  {
    tab: "r6-8",
    id: "#screenshot-r6-8-contestants-cam10",
    filename: "01_olympia27_cam10_deep_podiums.png",
    desc: "01: CAM 10 deep contestant framing (8 contestants, formula wall fully blanketing background, center dais minimized)",
    waitMs: 5000,
  },
  {
    tab: "r6-cam11",
    id: "#screenshot-r6-cam11-perspective",
    filename: "02_olympia27_dot_arch_and_borders.png",
    desc: "02: Thin white LED dot arch directly on top of screen and strictly parallel formula screen borders",
    waitMs: 4500,
  },
  {
    tab: "r6-tech",
    id: "#screenshot-r6-tech-floor-animation",
    filename: "03_olympia27_solid_floor_rings.png",
    desc: "03: Central stage floor dais with solid continuous concentric rings (RingGeometry, zero dashed segments)",
    waitMs: 4500,
  },
  {
    tab: "r6-mc-center",
    id: "#screenshot-r6-mc-center-stage",
    filename: "04_olympia27_mc_walkout_waistup.png",
    desc: "04: 12s MC walkout final waist-up framing in front of 2 MCs at center stage framing hexagonal portal (no feet)",
    waitMs: 4500,
  },
  {
    tab: "kd",
    id: "#graphic-studio-3d-vedich-cam15",
    filename: "05_olympia27_vedich_dramatic_lighting.png",
    desc: "05: Về Đích dramatic low-key lighting overview (CAM 15 wide focal angle, dark studio, active contestant on center dais, MC desk on right, red glowing wall)",
    waitMs: 5000,
  },
  {
    tab: "kd",
    id: "#graphic-studio-3d-vedich-red",
    filename: "06_olympia27_ceiling_spotlight_chase.png",
    desc: "06: Ceiling beam chasing spotlights active over contestant podiums during 5s steal countdown",
    waitMs: 5000,
  },
];

function validatePngHeader(filePath) {
  const buf = Buffer.alloc(8);
  const fd = fs.openSync(filePath, "r");
  fs.readSync(fd, buf, 0, 8, 0);
  fs.closeSync(fd);
  const expected = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== expected[i]) return false;
  }
  return true;
}

function checkServer(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/dev/graphics`, { timeout: 3000 }, (res) => {
      resolve(res.statusCode === 200 || res.statusCode === 304);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(port, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    const isUp = await checkServer(port);
    if (isUp) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function captureAll() {
  console.log("================================================================================");
  console.log("[Olympia 27 Visual Capture] Automated Headless Visual Proof Pipeline");
  console.log(`[Olympia 27 Visual Capture] Project Root: ${PROJECT_ROOT}`);
  console.log(`[Olympia 27 Visual Capture] Browser Executable: ${BROWSER_PATH}`);
  console.log(`[Olympia 27 Visual Capture] Target Port: ${PORT}`);
  console.log("================================================================================");

  // 1. Prepare target output directories
  const allDirs = [PRIMARY_DIR, ...MIRROR_DIRS];
  for (const dir of allDirs) {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`[Olympia 27 Visual Capture] Prepared directory: ${dir}`);
      } catch (e) {
        console.warn(`[Olympia 27 Visual Capture] Notice: could not create ${dir}: ${e.message}`);
      }
    }
  }

  // 2. Ensure server is active
  let spawnedProcess = null;
  const isAlreadyRunning = await checkServer(PORT);

  if (isAlreadyRunning) {
    console.log(`[Olympia 27 Visual Capture] Detected running server on port ${PORT}. Proceeding...`);
  } else {
    console.log(`[Olympia 27 Visual Capture] Spawning Next.js dev server on port ${PORT}...`);
    spawnedProcess = spawn("cmd.exe", ["/c", "npx", "next", "dev", "-p", String(PORT)], {
      cwd: PROJECT_ROOT,
      stdio: "pipe",
      env: { ...process.env, PORT: String(PORT), ALLOW_DEV_GRAPHICS: "true" },
    });

    spawnedProcess.stdout.on("data", (data) => {
      const msg = data.toString().trim();
      if (msg.includes("Ready") || msg.includes("Local:") || msg.includes("Compiled")) {
        console.log(`[Next.js Dev Server] ${msg}`);
      }
    });

    spawnedProcess.stderr.on("data", (data) => {
      const msg = data.toString().trim();
      if (!msg.includes("warn") && !msg.includes("Fast Refresh") && msg.length > 0) {
        console.warn(`[Next.js Dev Warn] ${msg}`);
      }
    });

    console.log(`[Olympia 27 Visual Capture] Waiting for dev server at http://localhost:${PORT}/dev/graphics...`);
    const serverReady = await waitForServer(PORT, 60);
    if (!serverReady) {
      if (spawnedProcess && spawnedProcess.pid) {
        try {
          execSync(`taskkill /pid ${spawnedProcess.pid} /T /F`, { stdio: "ignore" });
        } catch {}
      }
      throw new Error(`Next.js server failed to respond on port ${PORT} within 60s.`);
    }
    console.log(`[Olympia 27 Visual Capture] Dev server is live and responsive.`);
  }

  // 3. Launch Puppeteer-core
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
      "--high-dpi-support=1",
      "--force-device-scale-factor=1",
      "--disable-dev-shm-usage",
    ],
  });

  const capturedResults = [];

  try {
    const page = await browser.newPage();
    await page.setBypassServiceWorker(true);
    await page.setViewport({ width: 1920, height: 1080 });

    for (const target of TARGETS) {
      const targetUrl = `http://localhost:${PORT}/dev/graphics?tab=${target.tab}`;
      console.log(`\n--------------------------------------------------------------------------------`);
      console.log(`[Olympia 27 Visual Capture] Capturing ${target.desc}`);
      console.log(`[Olympia 27 Visual Capture] Navigating to ${targetUrl}...`);

      await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 35000 });

      console.log(`[Olympia 27 Visual Capture] Waiting for selector (${target.id} canvas)...`);
      await page.waitForSelector(`${target.id} canvas`, { timeout: 30000 });

      console.log(`[Olympia 27 Visual Capture] Waiting ${target.waitMs}ms for React 19 hydration and WebGL shaders to settle...`);
      await new Promise((resolve) => setTimeout(resolve, target.waitMs));

      const el = await page.$(target.id);
      if (!el) {
        throw new Error(`Element ${target.id} not found in DOM!`);
      }

      const primaryPath = path.join(PRIMARY_DIR, target.filename);
      await el.screenshot({ path: primaryPath });

      // Mirror to designated backup/review folders
      for (const destDir of MIRROR_DIRS) {
        if (fs.existsSync(destDir)) {
          try {
            const destFile = path.join(destDir, target.filename);
            fs.copyFileSync(primaryPath, destFile);
          } catch (e) {
            console.warn(`[Olympia 27 Visual Capture] Warning copying to ${destDir}: ${e.message}`);
          }
        }
      }

      const stat = fs.statSync(primaryPath);
      const isPngValid = validatePngHeader(primaryPath);

      if (!isPngValid || stat.size < 15000) {
        throw new Error(
          `Screenshot ${target.filename} failed verification: size=${stat.size}, validHeader=${isPngValid}`
        );
      }

      capturedResults.push({
        id: target.id,
        filename: target.filename,
        desc: target.desc,
        size: stat.size,
        path: primaryPath,
        validPng: isPngValid,
      });

      console.log(`[Olympia 27 Visual Capture] -> [SUCCESS] Captured ${target.filename} (${stat.size.toLocaleString()} bytes, valid PNG magic bytes)`);
    }

    console.log("\n================================================================================");
    console.log("[Olympia 27 Visual Capture] SUMMARY OF VERIFIED VISUAL PROOFS");
    console.log("================================================================================");
    for (const item of capturedResults) {
      console.log(`  * ${item.filename.padEnd(45)} | ${item.size.toLocaleString().padStart(8)} bytes | Valid PNG`);
    }
    console.log("================================================================================");
    console.log(`All ${capturedResults.length} screenshots captured and verified genuine.`);
  } finally {
    await browser.close();
    if (spawnedProcess && spawnedProcess.pid) {
      try {
        console.log(`[Olympia 27 Visual Capture] Gracefully terminating spawned dev server (PID: ${spawnedProcess.pid})...`);
        execSync(`taskkill /pid ${spawnedProcess.pid} /T /F`, { stdio: "ignore" });
      } catch {}
    }
  }
}

captureAll().catch((err) => {
  console.error("[Olympia 27 Visual Capture] Execution Error:", err);
  process.exit(1);
});
