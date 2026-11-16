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

const OUTPUT_DIRS = [
  path.resolve(PROJECT_ROOT, "public/screenshots/econova"),
  path.resolve(PROJECT_ROOT, "artifacts"),
  path.resolve(PROJECT_ROOT, "artifacts/screenshots"),
  path.resolve(PROJECT_ROOT, "public/screenshots"),
];

const TARGETS = [
  {
    tab: "econova-1",
    id: "#screenshot-01-vedich-lower-third-empty",
    filename: "01_vedich_lower_third_empty.png",
    desc: "01: Về Đích lower third early empty content with active contestant tab and package points strip after package grid close",
    waitMs: 2000,
  },
  {
    tab: "econova-2",
    id: "#screenshot-02-vcnv_frames_open_first",
    filename: "02_vcnv_frames_open_first.png",
    desc: "02: VCNV contestant frames opened first via stagger, contestant names visible, answer text not yet faded in",
    waitMs: 2000,
  },
  {
    tab: "econova-3",
    id: "#screenshot-03-tangtoc_frames_open_first",
    filename: "03_tangtoc_frames_open_first.png",
    desc: "03: Tăng Tốc contestant frames opened first via stagger, contestant names visible, answer text not yet faded in",
    waitMs: 2000,
  },
  {
    tab: "econova-4",
    id: "#screenshot-04-vcnv_answers_fade_in_2s",
    filename: "04_vcnv_answers_fade_in_2s.png",
    desc: "04: VCNV contestant answers faded in after 2s by seat order",
    waitMs: 2500,
  },
  {
    tab: "econova-5",
    id: "#screenshot-05-tangtoc_answers_fade_in_2s",
    filename: "05_tangtoc_answers_fade_in_2s.png",
    desc: "05: Tăng Tốc contestant answers and response times faded in after 2s by speed ranking order",
    waitMs: 2500,
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
  console.log("[Econova Runner] Milestone 2 Automated Headless Broadcast Capture (R3)");
  console.log(`[Econova Runner] Project Root: ${PROJECT_ROOT}`);
  console.log(`[Econova Runner] Target Browser: ${BROWSER_PATH}`);
  console.log(`[Econova Runner] Target Port: ${PORT}`);
  console.log("================================================================================");

  for (const dir of OUTPUT_DIRS) {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`[Econova Runner] Prepared directory: ${dir}`);
      } catch (e) {
        console.warn(`[Econova Runner] Notice: could not create ${dir}: ${e.message}`);
      }
    }
  }

  let spawnedProcess = null;
  const isAlreadyRunning = await checkServer(PORT);

  if (isAlreadyRunning) {
    console.log(`[Econova Runner] Detected active HTTP server on port ${PORT}. Proceeding...`);
  } else {
    console.log(`[Econova Runner] Starting Next.js dev server on port ${PORT} from ${PROJECT_ROOT}...`);
    spawnedProcess = spawn("cmd.exe", ["/c", "npx", "next", "dev", "-p", String(PORT)], {
      cwd: PROJECT_ROOT,
      stdio: "pipe",
      env: { ...process.env, PORT: String(PORT) },
    });

    spawnedProcess.stdout.on("data", (data) => {
      const msg = data.toString().trim();
      if (msg.includes("Ready") || msg.includes("Local:") || msg.includes("Compiled")) {
        console.log(`[Next.js Server] ${msg}`);
      }
    });

    spawnedProcess.stderr.on("data", (data) => {
      const msg = data.toString().trim();
      if (!msg.includes("warn") && !msg.includes("Fast Refresh") && msg.length > 0) {
        console.warn(`[Next.js Server Warn] ${msg}`);
      }
    });

    console.log(`[Econova Runner] Waiting for dev server on http://localhost:${PORT}/dev/graphics...`);
    const serverReady = await waitForServer(PORT, 60);
    if (!serverReady) {
      if (spawnedProcess && spawnedProcess.pid) {
        try {
          execSync(`taskkill /pid ${spawnedProcess.pid} /T /F`, { stdio: "ignore" });
        } catch {}
      }
      throw new Error(`Next.js server failed to respond on port ${PORT} within 60s timeout.`);
    }
    console.log(`[Econova Runner] Dev server is live and responsive.`);
  }

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
      "--force-device-scale-factor=2",
      "--disable-dev-shm-usage",
    ],
  });

  const capturedResults = [];

  try {
    const page = await browser.newPage();
    await page.setBypassServiceWorker(true);
    await page.setViewport({ width: 1920, height: 1080 });

    console.log(`\n[Econova Runner] Initializing & warming up Next.js client bundle...`);
    const warmupUrl = `http://localhost:${PORT}/dev/graphics?tab=econova-1`;
    await page.goto(warmupUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    console.log(`[Econova Runner] Waiting for initial compilation of /dev/graphics...`);
    await page.waitForSelector("#screenshot-01-vedich-lower-third-empty", { timeout: 60000 });
    console.log(`[Econova Runner] Client bundle initialized successfully.`);

    for (const target of TARGETS) {
      const targetUrl = `http://localhost:${PORT}/dev/graphics?tab=${target.tab}`;
      console.log(`\n--------------------------------------------------------------------------------`);
      console.log(`[Econova Runner] Capturing ${target.desc}`);
      console.log(`[Econova Runner] Navigating to ${targetUrl}...`);

      await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 35000 });

      console.log(`[Econova Runner] Waiting for selector (${target.id})...`);
      await page.waitForSelector(target.id, { timeout: 25000 });

      console.log(`[Econova Runner] Waiting ${target.waitMs}ms for React hydration and CSS animation settling...`);
      await new Promise((resolve) => setTimeout(resolve, target.waitMs));

      const el = await page.$(target.id);
      if (!el) {
        throw new Error(`Element ${target.id} not found in DOM!`);
      }

      const primaryPath = path.join(OUTPUT_DIRS[0], target.filename);
      await el.screenshot({ path: primaryPath });

      for (let i = 1; i < OUTPUT_DIRS.length; i++) {
        const destDir = OUTPUT_DIRS[i];
        if (fs.existsSync(destDir)) {
          const destFile = path.join(destDir, target.filename);
          fs.copyFileSync(primaryPath, destFile);
        }
      }

      const stat = fs.statSync(primaryPath);
      const isPngValid = validatePngHeader(primaryPath);
      const { width, height } = getPngDimensions(primaryPath);

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
        width,
        height,
        path: primaryPath,
        validPng: isPngValid,
      });

      console.log(
        `[Econova Runner] -> [SUCCESS] Captured ${target.filename} (${width}x${height}, ${stat.size.toLocaleString()} bytes, valid PNG header)`
      );
    }

    console.log("\n================================================================================");
    console.log("[Econova Runner] SUMMARY OF VERIFIED CAPTURED BROADCAST SCREENSHOT PROOFS");
    console.log("================================================================================");
    for (const item of capturedResults) {
      console.log(
        `  * ${item.filename.padEnd(35)} | ${String(item.width + "x" + item.height).padEnd(11)} | ${item.size
          .toLocaleString()
          .padStart(8)} bytes | Valid Header: YES | ${item.desc}`
      );
    }
    console.log("================================================================================");
    console.log(`All ${capturedResults.length} Econova broadcast screenshots captured and verified genuine.`);
  } finally {
    await browser.close();

    if (spawnedProcess && spawnedProcess.pid) {
      console.log(`[Econova Runner] Terminating spawned Next.js dev server (PID: ${spawnedProcess.pid})...`);
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
  console.error("[Econova Runner] Execution Error:", err);
  process.exit(1);
});
