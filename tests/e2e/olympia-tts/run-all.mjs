import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { execFileSync, execSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ALL_AUDIO_SEASONS, WORKSPACE_DIR, launchBrowser, sleep } from "./lib/harness.mjs";
import * as tier1 from "./tier1-features.mjs";
import * as tier2 from "./tier2-boundaries.mjs";
import * as tier3 from "./tier3-combinations.mjs";
import * as tier4 from "./tier4-e2e-match.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TIER_MODULES = new Map([
  [1, { mod: tier1, label: "Tier 1: Features" }],
  [2, { mod: tier2, label: "Tier 2: Boundaries" }],
  [3, { mod: tier3, label: "Tier 3: Combinations" }],
  [4, { mod: tier4, label: "Tier 4: E2E Scenarios" }],
]);

function parseArgs(argv) {
  const args = {
    tier: "1,2,3,4",
    url: null,
    port: 3105,
    mode: "prod",
    headless: true,
    allowOfflineEdgeTts: false,
    dryRun: false,
    reportOut: null,
  };

  for (const raw of argv) {
    if (raw === "--dry-run" || raw === "--static-only") {
      args.dryRun = true;
    } else if (raw === "--allow-offline-edge-tts") {
      args.allowOfflineEdgeTts = true;
    } else if (raw.startsWith("--tier=")) {
      args.tier = raw.slice("--tier=".length).trim();
    } else if (raw.startsWith("--url=")) {
      args.url = raw.slice("--url=".length).trim().replace(/\/$/, "");
    } else if (raw.startsWith("--port=")) {
      const p = Number(raw.slice("--port=".length));
      if (Number.isFinite(p) && p > 0) args.port = p;
    } else if (raw.startsWith("--mode=")) {
      const m = raw.slice("--mode=".length).trim().toLowerCase();
      if (m === "prod" || m === "dev") args.mode = m;
    } else if (raw.startsWith("--headless=")) {
      const val = raw.slice("--headless=".length).trim().toLowerCase();
      args.headless = val !== "false" && val !== "0";
    } else if (raw.startsWith("--report-out=")) {
      args.reportOut = raw.slice("--report-out=".length).trim();
    }
  }
  return args;
}

function parseSelectedTiers(tierSpec) {
  if (!tierSpec || tierSpec === "all") return [1, 2, 3, 4];
  const nums = tierSpec
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => [1, 2, 3, 4].includes(n));
  return nums.length > 0 ? [...new Set(nums)] : [1, 2, 3, 4];
}

function collectMjsFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectMjsFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".mjs")) {
      results.push(full);
    }
  }
  return results.sort();
}

function checkHttp200(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForHealthReady(url, timeoutMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await checkHttp200(url)) return true;
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
    } catch {}
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
    } catch {}
  }
  if (serverProc) {
    const p = serverProc;
    serverProc = null;
    killProcessTree(p);
  }
}

for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(sig, async () => {
    console.error(`\n[Signal ${sig}] Cleaning up browser and server...`);
    await cleanupAll();
    process.exit(1);
  });
}

function runDryRun(selectedTiers, args) {
  console.log("\n======================================================================");
  console.log("  OLYMPIA TTS E2E SUITE — DRY-RUN / STATIC CONTRACT VERIFICATION");
  console.log("======================================================================");

  // 1. node --check on every .mjs file in tests/e2e/olympia-tts/
  const mjsFiles = collectMjsFiles(__dirname);
  for (const filePath of mjsFiles) {
    execFileSync(process.execPath, ["--check", filePath], { stdio: "pipe" });
    console.log(`  [SYNTAX OK] ${path.relative(WORKSPACE_DIR, filePath)}`);
  }

  // 2. Verify all 4 tier modules export runTier() & getCatalog() and cover F1-F19 / R1-R9
  const catalogSummary = [];
  const coveredFeatures = new Set();
  const coveredReqs = new Set();

  for (const t of [1, 2, 3, 4]) {
    const entry = TIER_MODULES.get(t);
    if (typeof entry.mod.runTier !== "function") {
      throw new Error(`Tier ${t} missing export function runTier(ctx)`);
    }
    if (typeof entry.mod.getCatalog !== "function") {
      throw new Error(`Tier ${t} missing export function getCatalog()`);
    }
    const catalog = entry.mod.getCatalog();
    if (!Array.isArray(catalog) || catalog.length === 0) {
      throw new Error(`Tier ${t} getCatalog() returned empty/non-array`);
    }
    for (const item of catalog) {
      if (!item.id || !item.name || !item.featureArea) {
        throw new Error(`Tier ${t} catalog entry malformed: ${JSON.stringify(item)}`);
      }
      for (const f of String(item.featureArea).split(",")) {
        const trimmed = f.trim();
        if (trimmed === "F1..F19") {
          for (let n = 1; n <= 19; n++) coveredFeatures.add(`F${n}`);
        } else if (trimmed) {
          coveredFeatures.add(trimmed);
        }
      }
      for (const r of item.requirements || []) {
        coveredReqs.add(r);
      }
    }
    catalogSummary.push({ tier: t, label: entry.label, count: catalog.length });
    console.log(`  [TIER ${t} OK] ${entry.label} — ${catalog.length} test cases cataloged`);
  }

  for (let n = 1; n <= 19; n++) {
    if (!coveredFeatures.has(`F${n}`)) {
      throw new Error(`Missing feature coverage for F${n} across test catalogs`);
    }
  }
  for (let r = 1; r <= 9; r++) {
    if (!coveredReqs.has(`R${r}`)) {
      throw new Error(`Missing requirement coverage for R${r} across test catalogs`);
    }
  }
  console.log("  [COVERAGE OK] All features F1–F19 and requirements R1–R9 covered across Tiers 1–4");

  // 3. Verify AGENTS.md has 0 diffs
  const agentsDiff = execSync('git diff -- "AGENTS.md"', { cwd: WORKSPACE_DIR, encoding: "utf8" }).trim();
  if (agentsDiff.length > 0) {
    throw new Error(`AGENTS.md has uncommitted diffs (R5 violation):\n${agentsDiff}`);
  }
  console.log("  [PROTECTED OK] git diff -- AGENTS.md => 0 diffs");

  // 4. Static checks for Electron & build script
  const electronMainExists = fs.existsSync(path.join(WORKSPACE_DIR, "electron/main.js"));
  const pkgPath = path.join(WORKSPACE_DIR, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const hasBuildScript = Boolean(pkg?.scripts?.build);
  if (!electronMainExists || !hasBuildScript) {
    throw new Error(`Static Electron/build check failed: electron/main.js=${electronMainExists}, scripts.build=${hasBuildScript}`);
  }
  console.log("  [ELECTRON OK] electron/main.js & package.json scripts.build present");

  // 5. Report M1–M4 live target readiness cleanly (informational in dry-run)
  const missingRankAudio = [];
  for (const season of ALL_AUDIO_SEASONS) {
    for (const track of ["summary_rank_1", "summary_rank_2", "summary_rank_3", "summary_rank_4", "prize_award"]) {
      for (const suf of ["", "_left", "_right"]) {
        const p = path.join(WORKSPACE_DIR, "public/olympia-audio", season, "6_NhacKhac", `${track}${suf}.mp3`);
        if (!fs.existsSync(p)) missingRankAudio.push(path.relative(WORKSPACE_DIR, p));
      }
    }
  }

  const readiness = {
    apiOlympiaTtsRoute: fs.existsSync(path.join(WORKSPACE_DIR, "src/app/api/olympia/tts/route.ts")),
    serverTtsLib: fs.existsSync(path.join(WORKSPACE_DIR, "src/lib/olympia/server-tts.ts")),
    victoryPodium3D: fs.existsSync(path.join(WORKSPACE_DIR, "src/components/olympia/studio/VictoryPodium3D.tsx")),
    serverJsBundle: fs.existsSync(path.join(WORKSPACE_DIR, "server.js")),
    missingRankOrAwardAudioCount: missingRankAudio.length,
    missingRankOrAwardAudioSample: missingRankAudio.slice(0, 6),
  };

  console.log("\n  [M1–M4 Live Readiness Status]");
  console.log(`    src/app/api/olympia/tts/route.ts : ${readiness.apiOlympiaTtsRoute ? "READY" : "PENDING (M1)"}`);
  console.log(`    src/lib/olympia/server-tts.ts    : ${readiness.serverTtsLib ? "READY" : "PENDING (M1)"}`);
  console.log(`    VictoryPodium3D.tsx              : ${readiness.victoryPodium3D ? "READY" : "PENDING (M4B)"}`);
  console.log(`    server.js bundle                 : ${readiness.serverJsBundle ? "PRESENT" : "NOT BUILT (run npm run build)"}`);
  console.log(`    Missing 3ch rank/award mp3 files : ${readiness.missingRankOrAwardAudioCount}`);
  console.log(`    Selected tiers for live run      : ${selectedTiers.join(",")}`);
  console.log("======================================================================\n");

  if (args.reportOut) {
    const outPath = path.resolve(args.reportOut);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(
      outPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          dryRun: true,
          mjsFiles: mjsFiles.map((f) => path.relative(WORKSPACE_DIR, f)),
          catalogSummary,
          readiness,
          agentsDiffBytes: 0,
        },
        null,
        2
      ),
      "utf8"
    );
    console.log(`[Runner] Dry-run JSON report written to ${outPath}`);
  }
}

function printSummaryTable(results) {
  console.log("\n======================================================================");
  console.log("  OLYMPIA TTS & 3D AWARDS — E2E TEST SUITE SUMMARY");
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
      console.log(`  [${badge}] ${c.id.padEnd(10)} ${dur}  ${c.name}`);
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
  const selectedTiers = parseSelectedTiers(args.tier);

  if (args.dryRun) {
    runDryRun(selectedTiers, args);
    process.exit(0);
  }

  const baseUrl = args.url || `http://127.0.0.1:${args.port}`;

  if (!args.url) {
    console.log(`[Runner] Starting ${args.mode} server on ${baseUrl}...`);
    if (args.mode === "dev") {
      const devEntry = path.join(WORKSPACE_DIR, "server.ts");
      if (!fs.existsSync(devEntry)) {
        throw new Error(`Dev server entrypoint missing: ${devEntry}`);
      }
      serverProc = spawn(process.execPath, ["--experimental-strip-types", "server.ts"], {
        cwd: WORKSPACE_DIR,
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
      const serverJs = path.join(WORKSPACE_DIR, "server.js");
      if (!fs.existsSync(serverJs)) {
        throw new Error(`Production bundle server.js not found. Run 'npm run build' first or pass --url=<baseUrl>.`);
      }
      serverProc = spawn(process.execPath, ["--max-old-space-size=384", "server.js"], {
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
      if (s.includes("Ready") || s.includes("listening") || s.includes("started")) {
        console.log(`[Server] ${s}`);
      }
    });
    serverProc.stderr.on("data", (d) => {
      const s = d.toString().trim();
      if (s && !s.includes("ExperimentalWarning")) {
        console.warn(`[Server stderr] ${s.slice(0, 240)}`);
      }
    });

    const ready = await waitForHealthReady(`${baseUrl}/api/health`, 45000);
    if (!ready) {
      throw new Error(`Server at ${baseUrl}/api/health did not return HTTP 200 within 45s`);
    }
    console.log(`[Runner] Server ready at ${baseUrl}`);
  } else {
    console.log(`[Runner] Using external server URL: ${baseUrl}`);
    const ready = await waitForHealthReady(`${baseUrl}/api/health`, 10000);
    if (!ready) {
      throw new Error(`External server at ${baseUrl}/api/health did not return HTTP 200`);
    }
  }

  let totals = { totalPassed: 0, totalFailed: 1, totalSkipped: 0 };
  try {
    browser = await launchBrowser({ headless: args.headless });
    const ctx = {
      browser,
      baseUrl,
      mode: args.mode,
      headless: args.headless,
      allowOfflineEdgeTts: args.allowOfflineEdgeTts,
    };

    const results = [];
    for (const t of selectedTiers) {
      const entry = TIER_MODULES.get(t);
      console.log(`\n[Runner] Executing ${entry.label}...`);
      results.push(await entry.mod.runTier(ctx));
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
            headless: args.headless,
            allowOfflineEdgeTts: args.allowOfflineEdgeTts,
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
