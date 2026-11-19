#!/usr/bin/env node
/**
 * Dedicated E2E Test Suite Runner: Quizorra 3D Studio Olympia 27
 * Bundles tests/e2e/olympia27-contract.test.ts using esbuild into scratch/olympia27-e2e.cjs
 * and executes under Node.js 20 with formatted tier counts.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "../..");
const scratchDir = path.join(rootDir, "scratch");
const testFile = path.join(rootDir, "tests/e2e/olympia27-contract.test.ts");
const outFile = path.join(scratchDir, "olympia27-e2e.cjs");

if (!fs.existsSync(scratchDir)) {
  fs.mkdirSync(scratchDir, { recursive: true });
}

console.log("[Olympia 27 E2E Runner] Bundling olympia27-contract.test.ts with esbuild...");
try {
  execSync(
    `npx esbuild "${testFile}" --bundle --platform=node --target=node20 --outfile="${outFile}"`,
    { stdio: "inherit", cwd: rootDir }
  );

  console.log("[Olympia 27 E2E Runner] Executing test suite...");
  execSync(`node "${outFile}"`, { stdio: "inherit", cwd: rootDir });
  console.log("[Olympia 27 E2E Runner] Test suite completed successfully with exit code 0.");
  process.exit(0);
} catch (error) {
  console.error("[Olympia 27 E2E Runner] Execution failed with status:", error.status);
  process.exit(error.status || 1);
}
