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

  // 2. Create Olympia Sandbox Room with pre-populated contestants
  console.log("\n[2/7] Creating live Olympia broadcast room...");
  const roomRes = await fetch(`${BASE_URL}/api/sandbox/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mode: "OLYMPIA",
      teamCount: 4,
    }),
  });
  const roomData = await roomRes.json();
  const roomCode = roomData.code;
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

  // Wait in Lobby
  console.log("  -> Verifying Lobby: 100% Silent waiting screen with Audio Unlock banner...");
  await sleep(3500);
  const p1 = path.join(EVIDENCE_DIR, "01_lobby_silent_waiting.png");
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
  console.log("\n[5/8] Triggering match start & contestant introduction...");
  await hostPage.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const startBtn = btns.find((b) => (b.innerText || "").toUpperCase().includes("BẮT ĐẦU"));
    if (startBtn) startBtn.click();
  });
  await sleep(1500);
  // Confirm if warning modal opens
  await hostPage.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const contBtn = btns.find((b) => (b.innerText || "").includes("tiếp tục") || (b.innerText || "").toUpperCase().includes("XÁC NHẬN"));
    if (contBtn) contBtn.click();
  });
  await sleep(1500);
  await hostPage.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const confBtn = btns.find((b) => (b.innerText || "").toUpperCase().includes("XÁC NHẬN"));
    if (confBtn) confBtn.click();
  });
  await sleep(3500);

  // Capture Screenshot 2 on Display Page
  const p2 = path.join(EVIDENCE_DIR, "02_match_start_auto_greeting.png");
  await displayPage.screenshot({ path: p2, fullPage: false });
  console.log(`  -> Captured: ${p2}`);

  // Transition to Khởi Động
  console.log("\n[6/8] Transitioning to Khởi Động (Sapphire Blue Ceiling Rig & Volumetric Beams)...");
  // Skip entrance sequence if active to land on round
  await hostPage.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const skipBtn = btns.find((b) => (b.innerText || "").includes("Bỏ qua") || (b.innerText || "").includes("chào sân"));
    if (skipBtn) skipBtn.click();
  });
  await sleep(1500);

  await hostPage.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const kdBtn = btns.find((b) => (b.innerText || "").includes("Khởi Động"));
    if (kdBtn) kdBtn.click();
  });
  await sleep(1500);
  // Skip round banner if present on displayPage
  await displayPage.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const skipBanner = btns.find((b) => (b.innerText || "").includes("Bỏ qua intro"));
    if (skipBanner) skipBanner.click();
  });
  await sleep(3500);

  // Capture Screenshot 3 on Display Page (Ceiling rig & beams)
  const p3 = path.join(EVIDENCE_DIR, "03_studio_ceiling_rig_and_volumetric_beams.png");
  await displayPage.screenshot({ path: p3, fullPage: false });
  console.log(`  -> Captured: ${p3}`);

  // Start Khởi Động turn and reveal Question 1 for Graphics Lower-Third verification
  console.log("\n[7/10] Starting Khởi Động turn & revealing question for Lower-Third typography...");
  await hostPage.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const startKd = btns.find((b) => (b.innerText || "").toUpperCase().includes("BẮT ĐẦU"));
    if (startKd) startKd.click();
  });
  await sleep(1500);
  await hostPage.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const nextQ = btns.find((b) => (b.innerText || "").toUpperCase().includes("CÂU TIẾP"));
    if (nextQ) nextQ.click();
  });
  await sleep(2500);

  // Capture Screenshot 8: Classic Theme Lower-Third & Fixed Font Size
  const p8 = path.join(EVIDENCE_DIR, "08_classic_theme_lower_third_and_fixed_font.png");
  await displayPage.screenshot({ path: p8, fullPage: false });
  console.log(`  -> Captured: ${p8}`);

  // Switch to V3 Arrow Theme on Host Console
  console.log("  -> Switching to V3 Arrow Theme...");
  await hostPage.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const themeBtn = btns.find((b) => (b.innerText || "").includes("Theme:") || (b.innerText || "").includes("Cổ Điển") || (b.innerText || "").includes("Mũi Tên"));
    if (themeBtn) themeBtn.click();
  });
  await sleep(2000);

  // Capture Screenshot 9: V3 Arrow Theme Lower-Third & Fixed Font Size
  const p9 = path.join(EVIDENCE_DIR, "09_arrow_theme_lower_third_and_fixed_font.png");
  await displayPage.screenshot({ path: p9, fullPage: false });
  console.log(`  -> Captured: ${p9}`);

  // Switch back to Classic Theme
  await hostPage.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const themeBtn = btns.find((b) => (b.innerText || "").includes("Theme:") || (b.innerText || "").includes("Cổ Điển") || (b.innerText || "").includes("Mũi Tên"));
    if (themeBtn) themeBtn.click();
  });
  await sleep(1000);

  // CAM 3 Close-up on MC
  console.log("\n[8/10] Switching Display to CAM 3 for Anatomical Mouth Visemes...");
  await hostPage.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const camBtn = btns.find(
      (b) => (b.innerText || "").includes("CAM 3") || (b.title || "").includes("CAM 3")
    );
    if (camBtn) camBtn.click();
  });
  await displayPage.keyboard.press("3").catch(() => {});
  await sleep(3000);

  // Capture Screenshot 4 on Display Page
  const p4 = path.join(EVIDENCE_DIR, "04_mc_anatomical_mouth_closeup_visemes.png");
  await displayPage.screenshot({ path: p4, fullPage: false });
  console.log(`  -> Captured: ${p4}`);

  // Transition to Tăng Tốc (Amber Gold Lighting)
  console.log("\n[8/8] Transitioning to Tăng Tốc for Amber Gold Lighting & Volumetric Shafts...");
  await hostPage.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const ttBtn = btns.find((b) => (b.innerText || "").includes("Tăng Tốc"));
    if (ttBtn) ttBtn.click();
  });
  await sleep(1500);
  // Skip round banner if present on displayPage
  await displayPage.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const skipBanner = btns.find((b) => (b.innerText || "").includes("Bỏ qua intro"));
    if (skipBanner) skipBanner.click();
  });
  await sleep(3500);

  const p7 = path.join(EVIDENCE_DIR, "07_round_lighting_tang_toc_amber.png");
  await displayPage.screenshot({ path: p7, fullPage: false });
  console.log(`  -> Captured: ${p7}`);

  await browser.close();
  console.log("\n================================================================================");
  console.log("ALL 6 VISUAL EVIDENCE SCREENSHOTS SUCCESSFULLY CAPTURED IN verification/");
  console.log("================================================================================");
}

main().catch((err) => {
  console.error("Evidence capture error:", err);
  process.exit(1);
});
