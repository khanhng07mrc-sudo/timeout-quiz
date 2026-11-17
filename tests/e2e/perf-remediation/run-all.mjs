import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { spawn, execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { launchBrowser, sleep } from "./lib/browser.mjs";
import { runTier as runTier1 } from "./tier1-features.mjs";
import { runTier as runTier2 } from "./tier2-boundaries.mjs";
import { runTier as runTier3 } from "./tier3-combinations.mjs";
import { runTier as runTier4 } from "./tier4-e2e-profile-parity.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_DIR = path.resolve(__dirname, "../../..");

const DEFAULT_BASELINE_DIR =
  "C:\\Users\\khanh\\.gemini\\antigravity\\scratch\\teamwork\\9901d140-6a03-4693-855f-f69aacb2c326\\baseline";

function parseArgs(argv) {
  const args = {
    tier: "all",
    port: 3100,
    url: null,
    baseline: DEFAULT_BASELINE_DIR,
    reportOut: null,
    mode: "prod",
  };
  for (const a of argv) {
    if (a.startsWith("--tier=")) args.tier = a.slice("--tier=".length);
    else if (a.startsWith("--port=")) args.port = Number(a.slice("--port=".length)) || 3100;
    else if (a.startsWith("--url=")) args.url = a.slice("--url=".length).replace(/\/$/, "");
    else if (a.startsWith("--baseline=")) args.baseline = a.slice("--baseline=".length);
    else if (a.startsWith("--report-out=")) args.reportOut = a.slice("--report-out=".length);
    else if (a.startsWith("--mode=")) args.mode = a.slice("--mode=".length);
  }
  return args;
}

function checkHttpReady(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServerReady(url, timeoutMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await checkHttpReady(url)) return true;
    await sleep(300);
  }
  return false;
}

let serverProc = null;
let browser = null;

function killProcessTree(proc) {
  if (!proc || !proc.pid) return;
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: "ignore" });
    } else {
      process.kill(-proc.pid, "SIGKILL");
    }
  } catch {
    try {
      proc.kill("SIGKILL");
    } catch {
      // ignore
    }
  }
}

async function cleanupAll() {
  if (browser) {
    const b = browser;
    browser = null;
    try {
      const proc = b.process?.();
      await Promise.race([b.close(), sleep(3000)]);
      if (proc && proc.pid) killProcessTree(proc);
    } catch {
      // ignore
    }
  }
  if (serverProc) {
    const p = serverProc;
    serverProc = null;
    killProcessTree(p);
  }
}

for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(sig, async () => {
    console.error(`\n[Signal ${sig}] Cleaning up Chrome and server...`);
    await cleanupAll();
    process.exit(1);
  });
}

function printSummaryTable(results) {
  console.log("\n======================================================================");
  console.log("  TIMEOUT QUIZ — E2E, CDP PROFILING & VISUAL PARITY SUMMARY");
  console.log("======================================================================");
  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  for (const tierRes of results) {
    totalPassed += tierRes.passed;
    totalFailed += tierRes.failed;
    totalSkipped += tierRes.skipped;
    console.log(
      `\n[Tier ${tierRes.tier}] ${tierRes.name}  =>  PASSED: ${tierRes.passed} | FAILED: ${tierRes.failed} | SKIPPED: ${tierRes.skipped}`
    );
    console.log("----------------------------------------------------------------------");
    for (const c of tierRes.cases) {
      const badge = c.status === "passed" ? "PASS" : c.status === "failed" ? "FAIL" : "SKIP";
      const dur = `${String(c.durationMs).padStart(5)}ms`;
      console.log(`  [${badge}] ${c.id.padEnd(18)} ${dur}  ${c.name}`);
      if (c.status === "failed" && c.error) {
        console.log(`         ERROR: ${c.error.split("\n")[0]}`);
      }
    }
  }

  console.log("\n======================================================================");
  console.log(`  TOTAL: PASSED=${totalPassed} | FAILED=${totalFailed} | SKIPPED=${totalSkipped}`);
  console.log("======================================================================\n");
  return { totalPassed, totalFailed, totalSkipped };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = args.url || `http://127.0.0.1:${args.port}`;

  if (!args.url) {
    console.log(`[Runner] Starting ${args.mode} server on ${baseUrl}...`);
    if (args.mode === "dev") {
      serverProc = spawn("npx", ["tsx", "server.ts"], {
        cwd: WORKSPACE_DIR,
        shell: true,
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          NODE_ENV: "development",
          PORT: String(args.port),
          HOSTNAME: "127.0.0.1",
          ALLOW_DEV_GRAPHICS: "true",
        },
      });
    } else {
      serverProc = spawn("node", ["--max-old-space-size=384", "server.js"], {
        cwd: WORKSPACE_DIR,
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          NODE_ENV: "production",
          PORT: String(args.port),
          HOSTNAME: "127.0.0.1",
          ALLOW_DEV_GRAPHICS: "true",
        },
      });
    }

    serverProc.stdout.on("data", (d) => {
      const s = d.toString().trim();
      if (s.includes("Ready on") || s.includes("listening")) console.log(`[Server] ${s}`);
    });
    serverProc.stderr.on("data", (d) => {
      const s = d.toString().trim();
      if (s && !s.includes("ExperimentalWarning")) console.warn(`[Server stderr] ${s.slice(0, 200)}`);
    });

    const ready = await waitForServerReady(`${baseUrl}/api/health`, 45000);
    if (!ready) {
      throw new Error(`Server on ${baseUrl} did not become ready within 45s`);
    }
    console.log(`[Runner] Server ready at ${baseUrl}`);
  } else {
    console.log(`[Runner] Using external server URL: ${baseUrl}`);
  }

  let totals = { totalPassed: 0, totalFailed: 1, totalSkipped: 0 };
  try {
    browser = await launchBrowser({ headless: true });
    const ctx = {
      browser,
      baseUrl,
      baselineDir: args.baseline,
      mode: args.mode,
    };

    const selectedTiers =
      args.tier === "all"
        ? [1, 2, 3, 4]
        : args.tier
            .split(",")
            .map((x) => Number(x.trim()))
            .filter((n) => [1, 2, 3, 4].includes(n));

    const results = [];
    for (const t of selectedTiers) {
      console.log(`\n[Runner] Executing Tier ${t}...`);
      if (t === 1) results.push(await runTier1(ctx));
      else if (t === 2) results.push(await runTier2(ctx));
      else if (t === 3) results.push(await runTier3(ctx));
      else if (t === 4) results.push(await runTier4(ctx));
    }

    totals = printSummaryTable(results);

    if (args.reportOut) {
      const outPath = path.resolve(args.reportOut);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(
        outPath,
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            baseUrl,
            mode: args.mode,
            baselineDir: args.baseline,
            totals,
            tiers: results,
          },
          null,
          2
        ),
        "utf8"
      );
      console.log(`[Runner] JSON report written to ${outPath}`);
    }
  } finally {
    await cleanupAll();
  }

  process.exit(totals.totalFailed === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error("[Runner Fatal Error]", err);
  await cleanupAll();
  process.exit(1);
});
