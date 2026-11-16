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

const PRIMARY_DIR = path.resolve(PROJECT_ROOT, "public/screenshots/r4");
const MIRROR_DIRS = [
  path.resolve(PROJECT_ROOT, "scratch/screenshots/r4"),
  path.resolve(PROJECT_ROOT, "public/screenshots"),
];

const TARGETS = [
  {
    tab: "r4-1",
    id: "#screenshot-r4-vcnv-reveal",
    filename: "01_vcnv_3d_answer_reveal.png",
    desc: "01: VCNV 3D rotate answer reveal with wooden beam & green highlight (R1)",
    waitMs: 2500,
  },
  {
    tab: "r4-2",
    id: "#screenshot-r4-tangtoc-reveal",
    filename: "02_tangtoc_ranked_answer_reveal.png",
    desc: "02: Tăng Tốc ranked answer reveal with response time and emerald green rows (R1)",
    waitMs: 2500,
  },
  {
    tab: "r4-3",
    id: "#screenshot-r4-round-intro",
    filename: "03_round_intro_animations.png",
    desc: "03: BroadcastRoundIntroOverlay with 3D rotate perspective and light sweep (R1)",
    waitMs: 2000,
  },
  {
    tab: "r4-4",
    id: "#screenshot-r4-host-console-vcnv",
    filename: "04_host_console_vcnv_direct_answers.png",
    desc: "04: Host Console VCNV direct answer table with dedicated bell column (R2)",
    waitMs: 2000,
  },
  {
    tab: "r4-5",
    id: "#screenshot-r4-playerpad-lock",
    filename: "05_playerpad_inline_lock_badge.png",
    desc: "05: PlayerPad inline lock badge on single line with tabs (R2)",
    waitMs: 2000,
  },
  {
    tab: "r4-6",
    id: "#screenshot-r4-vcnv-center-shielded",
    filename: "06_vcnv_center_tile_shielded.png",
    desc: "06: VCNV center tile #5 100% opaque without opacity drop (R3)",
    waitMs: 2000,
  },
  {
    tab: "r4-7",
    id: "#screenshot-r4-scoreboard-clean",
    filename: "07_displayscreen_scoreboard_clean.png",
    desc: "07: DisplayScreen scoreboard clean of keyboard hint text (R3)",
    waitMs: 2000,
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

function getPngDimensions(filePath) {
  try {
    const buf = Buffer.alloc(24);
    const fd = fs.openSync(filePath, "r");
    fs.readSync(fd, buf, 0, 24, 0);
    fs.closeSync(fd);
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return { width, height };
  } catch {
    return { width: 0, height: 0 };
  }
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
  console.log("[R4 Screenshot Runner] Milestone 3 Headless Visual Proof Automation");
  console.log(`[R4 Screenshot Runner] Project Root: ${PROJECT_ROOT}`);
  console.log(`[R4 Screenshot Runner] Browser Executable: ${BROWSER_PATH}`);
  console.log(`[R4 Screenshot Runner] Target Port: ${PORT}`);
  console.log("================================================================================");

  // 1. Prepare target directories
  const allDirs = [PRIMARY_DIR, ...MIRROR_DIRS];
  for (const dir of allDirs) {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`[R4 Screenshot Runner] Prepared output directory: ${dir}`);
      } catch (e) {
        console.warn(`[R4 Screenshot Runner] Notice: could not create ${dir}: ${e.message}`);
      }
    }
  }

  // 2. Ensure Next.js dev server is running
  let spawnedProcess = null;
  const isAlreadyRunning = await checkServer(PORT);

  if (isAlreadyRunning) {
    console.log(`[R4 Screenshot Runner] Detected active HTTP server on port ${PORT}. Proceeding...`);
  } else {
    console.log(`[R4 Screenshot Runner] Spawning Next.js dev server on port ${PORT}...`);
    spawnedProcess = spawn("cmd.exe", ["/c", "npx", "next", "dev", "-p", String(PORT)], {
      cwd: PROJECT_ROOT,
      stdio: "pipe",
      env: { ...process.env, PORT: String(PORT) },
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

    console.log(`[R4 Screenshot Runner] Waiting for dev server at http://localhost:${PORT}/dev/graphics...`);
    const serverReady = await waitForServer(PORT, 60);
    if (!serverReady) {
      if (spawnedProcess && spawnedProcess.pid) {
        try {
          execSync(`taskkill /pid ${spawnedProcess.pid} /T /F`, { stdio: "ignore" });
        } catch {}
      }
      throw new Error(`Next.js server failed to respond on port ${PORT} within 60s.`);
    }
    console.log(`[R4 Screenshot Runner] Dev server is live and responsive.`);
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

    console.log(`\n[R4 Screenshot Runner] Initializing & warming up Next.js graphics client bundle...`);
    const warmupUrl = `http://localhost:${PORT}/dev/graphics?tab=r4-1`;
    await page.goto(warmupUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    console.log(`[R4 Screenshot Runner] Waiting for initial compilation of /dev/graphics...`);
    await page.waitForSelector("#screenshot-r4-vcnv-reveal", { timeout: 60000 });
    console.log(`[R4 Screenshot Runner] Graphics client bundle initialized successfully.`);

    // 4. Capture all 7 targets
    for (const target of TARGETS) {
      const targetUrl = `http://localhost:${PORT}/dev/graphics?tab=${target.tab}`;
      console.log(`\n--------------------------------------------------------------------------------`);
      console.log(`[R4 Screenshot Runner] Capturing ${target.desc}`);
      console.log(`[R4 Screenshot Runner] Navigating to ${targetUrl}...`);

      await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 35000 });

      console.log(`[R4 Screenshot Runner] Waiting for selector (${target.id})...`);
      await page.waitForSelector(target.id, { timeout: 25000 });

      console.log(`[R4 Screenshot Runner] Waiting ${target.waitMs}ms for animation & layout settling...`);
      await new Promise((resolve) => setTimeout(resolve, target.waitMs));

      const el = await page.$(target.id);
      if (!el) {
        throw new Error(`Element ${target.id} not found in DOM!`);
      }

      const primaryPath = path.join(PRIMARY_DIR, target.filename);
      await el.screenshot({ path: primaryPath });

      // Mirror to scratch and public screenshots folders
      for (const destDir of MIRROR_DIRS) {
        if (fs.existsSync(destDir)) {
          const destFile = path.join(destDir, target.filename);
          fs.copyFileSync(primaryPath, destFile);
        }
      }

      const stat = fs.statSync(primaryPath);
      const isPngValid = validatePngHeader(primaryPath);
      const { width, height } = getPngDimensions(primaryPath);

      if (!isPngValid) {
        throw new Error(`Screenshot ${target.filename} failed verification: invalid 8-byte PNG signature`);
      }
      if (stat.size < 15000) {
        throw new Error(`Screenshot ${target.filename} failed verification: size ${stat.size} < 15,000 bytes`);
      }

      capturedResults.push({
        id: target.id,
        filename: target.filename,
        desc: target.desc,
        size: stat.size,
        width,
        height,
        path: primaryPath,
        validPng: isPngValid,
      });

      console.log(
        `[R4 Screenshot Runner] -> [SUCCESS] Captured ${target.filename} (${width}x${height}, ${stat.size.toLocaleString()} bytes, valid PNG header)`
      );
    }

    // 5. Summary and verification table
    console.log("\n================================================================================");
    console.log("[R4 Screenshot Runner] SUMMARY OF VERIFIED CAPTURED BROADCAST SCREENSHOT PROOFS");
    console.log("================================================================================");
    for (const item of capturedResults) {
      console.log(
        `  * ${item.filename.padEnd(42)} | ${String(item.width + "x" + item.height).padEnd(11)} | ${item.size
          .toLocaleString()
          .padStart(8)} bytes | Valid PNG: YES | ${item.desc}`
      );
    }
    console.log("================================================================================");
    console.log(`All ${capturedResults.length} R4 visual proof screenshots captured and verified genuine.`);
  } finally {
    await browser.close();

    if (spawnedProcess && spawnedProcess.pid) {
      console.log(`[R4 Screenshot Runner] Terminating spawned Next.js dev server (PID: ${spawnedProcess.pid})...`);
      try {
        execSync(`taskkill /pid ${spawnedProcess.pid} /T /F`, { stdio: "ignore" });
      } catch (err) {
        try {
          spawnedProcess.kill("SIGTERM");
        } catch {}
      }
    }
  }
}

captureAll().catch((err) => {
  console.error("[R4 Screenshot Runner] Execution Error:", err);
  process.exit(1);
});
