#!/usr/bin/env node
/**
 * Dedicated E2E Test Suite Runner for Olympia Broadcast & Gameplay Refinements
 * Bundles tests/e2e/test-olympia-fixes.test.ts using esbuild and executes under node.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "../..");
const scratchDir = path.join(rootDir, "scratch");
const testFile = path.join(rootDir, "tests/e2e/test-olympia-fixes.test.ts");
const outFile = path.join(scratchDir, "olympia-fixes-test.cjs");

if (!fs.existsSync(scratchDir)) {
  fs.mkdirSync(scratchDir, { recursive: true });
}

console.log("[Olympia Fixes E2E Runner] Bundling test-olympia-fixes.test.ts with esbuild...");
try {
  execSync(
    `npx esbuild "${testFile}" --bundle --platform=node --target=node20 --outfile="${outFile}"`,
    { stdio: "inherit", cwd: rootDir }
  );

  console.log("[Olympia Fixes E2E Runner] Executing test suite...");
  execSync(`node "${outFile}"`, { stdio: "inherit", cwd: rootDir });
  process.exit(0);
} catch (error) {
  console.error("[Olympia Fixes E2E Runner] Execution completed with status:", error.status);
  process.exit(error.status || 1);
}
