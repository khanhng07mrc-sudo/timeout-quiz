import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
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

const BASE_URL = process.env.BASE_URL || "https://quizorra.ddns.net";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("================================================================================");
  console.log("FULL VISUAL EVIDENCE CAPTURE — OLYMPIA TTS MANAGER & 3D STUDIO BROADCAST");
  console.log("================================================================================");

  // 1. Authenticate with Master Key
  console.log("\n[1/7] Authenticating via Master Key...");
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "Quizorra@Admin2026", isMasterKey: true }),
  });
  const loginData = await loginRes.json();
  if (!loginData.token) {
    throw new Error("Master Key login failed");
  }
  console.log("  -> Authenticated successfully! Token acquired.");

  // 2. Create Olympia Room
  console.log("\n[2/7] Creating live Olympia broadcast room...");
  const roomRes = await fetch(`${BASE_URL}/api/rooms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${loginData.token}`,
    },
    body: JSON.stringify({
      name: "Đường lên đỉnh Olympia - Chung Kết Năm",
      mode: "OLYMPIA",
      teamMode: "INDIVIDUAL",
      teams: [
        { name: "Nguyễn Văn A (Hà Nội)", color: "#ef4444" },
        { name: "Trần Thị B (Đà Nẵng)", color: "#3b82f6" },
        { name: "Lê Văn C (TP. HCM)", color: "#10b981" },
        { name: "Phạm Thị D (Cần Thơ)", color: "#f59e0b" },
      ],
      config: {
        powerupEnabled: false,
        olympia: {
          rulesetId: "O26",
          playIntroOnCreate: true,
          seatCount: 4,
        },
      },
    }),
  });
  const roomData = await roomRes.json();
  const roomCode = roomData.room.code;
  const hostKey = roomData.hostKey;
  console.log(`  -> Room created: PIN ${roomCode}, HostKey: ${hostKey}`);

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

  // Tab A: Display Screen
  console.log("\n[3/7] Opening Display Screen (3D Studio Arena)...");
  const displayPage = await browser.newPage();
  await displayPage.setViewport({ width: 1920, height: 1080 });
  await displayPage.goto(`${BASE_URL}/olympia/display/${roomCode}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  // Wait 3.5s for Lobby Auto Greeting
  console.log("  -> Waiting 3.5s for automated lobby greeting...");
  await sleep(4000);
  const p1 = path.join(EVIDENCE_DIR, "01_lobby_auto_greeting_3s.png");
  await displayPage.screenshot({ path: p1, fullPage: false });
  console.log(`  -> Captured: ${p1}`);

  // Tab B: Host Console
  console.log("\n[4/7] Opening Host Console...");
  const hostPage = await browser.newPage();
  await hostPage.setViewport({ width: 1920, height: 1080 });
  await hostPage.goto(`${BASE_URL}/olympia/host/${roomCode}?key=${hostKey}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await sleep(4000);

  // Open TTS Manager Modal on Host Page
  console.log("  -> Clicking TTS MANAGER button...");
  await hostPage.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const ttsBtn = btns.find(
      (b) =>
        (b.innerText || "").toUpperCase().includes("TTS MANAGER") ||
        (b.title || "").toLowerCase().includes("tts manager")
    );
    if (ttsBtn) ttsBtn.click();
  });
  await sleep(1500);

  // Capture Screenshot 5: Tab 1 MC Voices & Server Edge TTS badges
  const p5 = path.join(EVIDENCE_DIR, "05_tts_manager_modal_visual_editor.png");
  await hostPage.screenshot({ path: p5, fullPage: false });
  console.log(`  -> Captured: ${p5}`);

  // Switch to Tab 7: Kiểm Âm & Chẩn Đoán (Audio Diagnostic Workbench)
  console.log("  -> Switching to Tab 7: Kiểm Âm & Chẩn Đoán...");
  await hostPage.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll("button"));
    const diagTab = tabs.find((b) => (b.innerText || "").includes("Kiểm Âm & Chẩn Đoán"));
    if (diagTab) diagTab.click();
  });
  await sleep(1200);

  // Capture Screenshot 6: Audio Diagnostic Workbench
  const p6 = path.join(EVIDENCE_DIR, "06_tts_manager_diagnostic_workbench.png");
  await hostPage.screenshot({ path: p6, fullPage: false });
  console.log(`  -> Captured: ${p6}`);

  // Close TTS Manager Modal
  await hostPage.evaluate(() => {
    const allBtns = Array.from(document.querySelectorAll("button"));
    const closeBtn = allBtns.find((b) => (b.innerText || "").trim() === "✕");
    if (closeBtn) closeBtn.click();
  });
  await sleep(600);

  // Start Intro Sequence
  console.log("\n[5/7] Triggering match start & contestant introduction...");
  await hostPage.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const startBtn = btns.find((b) => (b.innerText || "").includes("Bắt đầu"));
    if (startBtn) startBtn.click();
  });
  await sleep(3000);

  // Capture Screenshot 2 on Display Page
  const p2 = path.join(EVIDENCE_DIR, "02_opening_duo_and_contestant_intro.png");
  await displayPage.screenshot({ path: p2, fullPage: false });
  console.log(`  -> Captured: ${p2}`);

  // Transition to Khởi Động
  console.log("\n[6/7] Transitioning to Khởi Động...");
  await hostPage.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const kdBtn = btns.find((b) => (b.innerText || "").includes("Khởi Động"));
    if (kdBtn) kdBtn.click();
  });
  await sleep(3000);

  // Capture Screenshot 3 on Display Page
  const p3 = path.join(EVIDENCE_DIR, "03_round_intro_silent_to_post_intro_mc_speech.png");
  await displayPage.screenshot({ path: p3, fullPage: false });
  console.log(`  -> Captured: ${p3}`);

  // CAM 3 Close-up on MC
  console.log("\n[7/7] Switching Display to CAM 3 for Anatomical Mouth Visemes...");
  await hostPage.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const camBtn = btns.find((b) => (b.innerText || "").includes("CAM 3"));
    if (camBtn) camBtn.click();
  });
  await sleep(3000);

  // Capture Screenshot 4 on Display Page
  const p4 = path.join(EVIDENCE_DIR, "04_mc_anatomical_mouth_closeup_visemes.png");
  await displayPage.screenshot({ path: p4, fullPage: false });
  console.log(`  -> Captured: ${p4}`);

  await browser.close();
  console.log("\n================================================================================");
  console.log("ALL 6 VISUAL EVIDENCE SCREENSHOTS SUCCESSFULLY CAPTURED IN verification/");
  console.log("================================================================================");
}

main().catch((err) => {
  console.error("Evidence capture error:", err);
  process.exit(1);
});
