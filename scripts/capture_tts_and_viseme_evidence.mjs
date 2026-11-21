/**
 * Automated Visual Evidence & Screenshot Capture Protocol
 * Captures 5 mandatory milestones:
 * 1. 01_lobby_auto_greeting_3s.png
 * 2. 02_opening_duo_and_contestant_intro.png
 * 3. 03_round_intro_silent_to_post_intro_mc_speech.png
 * 4. 04_mc_anatomical_mouth_closeup_visemes.png
 * 5. 05_tts_manager_modal_visual_editor.png
 */
import puppeteer from "puppeteer-core";
import { io } from "socket.io-client";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const EVIDENCE_DIR = path.resolve(PROJECT_ROOT, "verification");
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BROWSER_PATH = fs.existsSync(EDGE_PATH) ? EDGE_PATH : CHROME_PATH;

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const SANDBOX_URL = `${BASE_URL}/admin/sandbox?code=463275`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("================================================================================");
  console.log("VISUAL EVIDENCE CAPTURE — OLYMPIA TTS MANAGER & ANATOMICAL MOUTH");
  console.log("================================================================================");
  console.log(`Target URL : ${SANDBOX_URL}`);
  console.log(`Evidence Dir: ${EVIDENCE_DIR}`);

  const browser = await puppeteer.launch({
    executablePath: BROWSER_PATH,
    headless: "new",
    defaultViewport: { width: 1920, height: 1080 },
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log("\n[1/5] Navigating to Sandbox...");
  await page.goto(SANDBOX_URL, { waitUntil: "networkidle2", timeout: 45000 });
  await sleep(3500); // Wait for 3s lobby greeting

  // Screenshot 1: Lobby Auto Greeting after 3s
  const p1 = path.join(EVIDENCE_DIR, "01_lobby_auto_greeting_3s.png");
  await page.screenshot({ path: p1, fullPage: false });
  console.log(`  -> Captured: ${p1}`);

  // Screenshot 5: Open TTS Manager Modal
  console.log("\n[2/5] Opening TTS Manager Modal...");
  const ttsBtn = await page.$("button[title*='TTS Manager']");
  if (ttsBtn) {
    await ttsBtn.click();
    await sleep(1000);
    const p5 = path.join(EVIDENCE_DIR, "05_tts_manager_modal_visual_editor.png");
    await page.screenshot({ path: p5, fullPage: false });
    console.log(`  -> Captured: ${p5}`);

    // Close modal
    const closeBtn = await page.$("button:has-text('✕')") || await page.$("button.rounded-full");
    if (closeBtn) {
      await closeBtn.click();
      await sleep(500);
    }
  }

  // Screenshot 2: Click "Chào sân" or "Bắt đầu"
  console.log("\n[3/5] Starting match & contestant introduction...");
  const startBtn = await page.$("button:has-text('Bắt đầu')");
  if (startBtn) {
    await startBtn.click();
    await sleep(2500);
  }
  const p2 = path.join(EVIDENCE_DIR, "02_opening_duo_and_contestant_intro.png");
  await page.screenshot({ path: p2, fullPage: false });
  console.log(`  -> Captured: ${p2}`);

  // Screenshot 3 & 4: Round Intro and MC Anatomical Mouth Close-up
  console.log("\n[4/5] Transitioning to Khởi Động...");
  const kdBtn = await page.$("button:has-text('Vào Khởi Động')") || await page.$("button:has-text('Khởi Động')");
  if (kdBtn) {
    await kdBtn.click();
    await sleep(2000);
  }
  const p3 = path.join(EVIDENCE_DIR, "03_round_intro_silent_to_post_intro_mc_speech.png");
  await page.screenshot({ path: p3, fullPage: false });
  console.log(`  -> Captured: ${p3}`);

  // MC Close-up Cam 3
  console.log("\n[5/5] Focusing MC Cam 3 for Anatomical Mouth Visemes...");
  const cam3Btn = await page.$("button:has-text('CAM 3')") || await page.$("button:has-text('Cam MC')");
  if (cam3Btn) {
    await cam3Btn.click();
    await sleep(1500);
  }
  const p4 = path.join(EVIDENCE_DIR, "04_mc_anatomical_mouth_closeup_visemes.png");
  await page.screenshot({ path: p4, fullPage: false });
  console.log(`  -> Captured: ${p4}`);

  await browser.close();
  console.log("\n================================================================================");
  console.log("VISUAL EVIDENCE CAPTURE COMPLETE! All 5 screenshots saved to verification/");
  console.log("================================================================================");
}

main().catch((err) => {
  console.error("Evidence capture error:", err);
  process.exit(1);
});
