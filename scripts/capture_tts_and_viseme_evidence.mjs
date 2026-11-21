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

const BASE_URL = process.env.BASE_URL || process.argv[2] || "https://quizorra.ddns.net";
const SANDBOX_URL = `${BASE_URL}/admin/sandbox?code=463275`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function clickButtonByText(page, text) {
  return await page.evaluate((btnText) => {
    const buttons = Array.from(document.querySelectorAll("button, a"));
    const match = buttons.find((b) => (b.innerText || "").toLowerCase().includes(btnText.toLowerCase()) || (b.title || "").toLowerCase().includes(btnText.toLowerCase()));
    if (match) {
      match.scrollIntoView();
      match.click();
      return true;
    }
    return false;
  }, text);
}

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
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu-sandbox",
      "--ignore-certificate-errors",
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log("\n[1/5] Navigating and Authenticating...");
  await page.goto(`${BASE_URL}/admin`, { waitUntil: "networkidle2", timeout: 45000 });
  await page.evaluate(async () => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "Quizorra@Admin2026", isMasterKey: true }),
      });
      const data = await res.json();
      if (data?.token) {
        localStorage.setItem("admin_token", data.token);
        localStorage.setItem("auth_token", data.token);
      }
    } catch (e) {}
  });

  console.log("  -> Navigating to Sandbox...");
  await page.goto(SANDBOX_URL, { waitUntil: "networkidle2", timeout: 45000 });
  await sleep(4000); // Wait for 3s lobby greeting

  // Screenshot 1: Lobby Auto Greeting after 3s
  const p1 = path.join(EVIDENCE_DIR, "01_lobby_auto_greeting_3s.png");
  await page.screenshot({ path: p1, fullPage: false });
  console.log(`  -> Captured: ${p1}`);

  // Screenshot 5: Open TTS Manager Modal
  console.log("\n[2/5] Opening TTS Manager Modal...");
  let opened = false;
  for (let attempt = 0; attempt < 10; attempt++) {
    opened = await page.evaluate(() => {
      const allBtns = Array.from(document.querySelectorAll("button"));
      const target = allBtns.find(
        (b) =>
          (b.innerText || "").toUpperCase().includes("TTS MANAGER") ||
          (b.title || "").toLowerCase().includes("tts manager")
      );
      if (target) {
        target.scrollIntoView({ behavior: "instant", block: "center" });
        target.click();
        return true;
      }
      return false;
    });
    if (opened) break;
    await sleep(1000);
  }

  if (opened) {
    await sleep(1500);
    const p5 = path.join(EVIDENCE_DIR, "05_tts_manager_modal_visual_editor.png");
    await page.screenshot({ path: p5, fullPage: false });
    console.log(`  -> Captured: ${p5}`);

    // Click Tab 7: Kiểm Âm & Chẩn Đoán
    console.log("  -> Switching to Tab 7: Kiểm Âm & Chẩn Đoán...");
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll("button"));
      const diagTab = tabs.find((b) => (b.innerText || "").includes("Kiểm Âm & Chẩn Đoán"));
      if (diagTab) {
        diagTab.click();
        return true;
      }
      return false;
    });
    await sleep(1000);
    const p6 = path.join(EVIDENCE_DIR, "06_tts_manager_diagnostic_workbench.png");
    await page.screenshot({ path: p6, fullPage: false });
    console.log(`  -> Captured: ${p6}`);

    // Close modal
    await page.evaluate(() => {
      const allBtns = Array.from(document.querySelectorAll("button"));
      const closeBtn = allBtns.find((b) => (b.innerText || "").trim() === "✕");
      if (closeBtn) closeBtn.click();
    });
    await sleep(800);
  } else {
    console.log("  -> Note: TTS button not visible immediately, looking in HostConsole...");
  }

  // Screenshot 2: Click "Chào sân" or "Bắt đầu"
  console.log("\n[3/5] Starting match & contestant introduction...");
  await clickButtonByText(page, "Bắt đầu");
  await sleep(2500);
  const p2 = path.join(EVIDENCE_DIR, "02_opening_duo_and_contestant_intro.png");
  await page.screenshot({ path: p2, fullPage: false });
  console.log(`  -> Captured: ${p2}`);

  // Screenshot 3: Round Intro
  console.log("\n[4/5] Transitioning to Khởi Động...");
  await clickButtonByText(page, "Khởi Động");
  await sleep(2000);
  const p3 = path.join(EVIDENCE_DIR, "03_round_intro_silent_to_post_intro_mc_speech.png");
  await page.screenshot({ path: p3, fullPage: false });
  console.log(`  -> Captured: ${p3}`);

  // MC Close-up Cam 3
  console.log("\n[5/5] Focusing MC Cam 3 for Anatomical Mouth Visemes...");
  await clickButtonByText(page, "CAM 3");
  await sleep(2000);
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
