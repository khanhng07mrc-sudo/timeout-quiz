#!/usr/bin/env node
/**
 * Dedicated Runner for Challenger 2: R4 & R5 Adversarial Fuzzer
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "../..");
const scratchDir = path.join(rootDir, "scratch");
const testFile = path.join(rootDir, "tests/e2e/adversarial-fuzzer-r4-r5.ts");
const outFile = path.join(scratchDir, "adversarial-fuzzer.cjs");

if (!fs.existsSync(scratchDir)) {
  fs.mkdirSync(scratchDir, { recursive: true });
}

console.log("[Adversarial Runner] Bundling adversarial-fuzzer-r4-r5.ts with esbuild...");
try {
  execSync(
    `npx esbuild "${testFile}" --bundle --platform=node --target=node20 --outfile="${outFile}"`,
    { stdio: "inherit", cwd: rootDir }
  );

  console.log("[Adversarial Runner] Executing test suite...");
  execSync(`node "${outFile}"`, { stdio: "inherit", cwd: rootDir });
  process.exit(0);
} catch (error) {
  console.error("[Adversarial Runner] Execution failed with status:", error.status);
  process.exit(error.status || 1);
}
