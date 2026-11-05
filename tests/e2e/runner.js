#!/usr/bin/env node
/**
 * Dedicated E2E Test Suite Runner for Timeout Quiz
 * Bundles tests/e2e/econova-broadcast.test.ts using esbuild and executes under node.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "../..");
const scratchDir = path.join(rootDir, "scratch");
const testFile = path.join(rootDir, "tests/e2e/econova-broadcast.test.ts");
const outFile = path.join(scratchDir, "econova-e2e-test.cjs");

if (!fs.existsSync(scratchDir)) {
  fs.mkdirSync(scratchDir, { recursive: true });
}

console.log("[E2E Runner] Bundling tests with esbuild...");
try {
  execSync(
    `npx esbuild "${testFile}" --bundle --platform=node --target=node20 --outfile="${outFile}"`,
    { stdio: "inherit", cwd: rootDir }
  );

  console.log("[E2E Runner] Executing test suite...");
  execSync(`node "${outFile}"`, { stdio: "inherit", cwd: rootDir });
  process.exit(0);
} catch (error) {
  console.error("[E2E Runner] Execution failed:", error.message);
  process.exit(1);
}
