import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = 'C:\\Users\\khanh\\.gemini\\antigravity\\brain\\7922e666-ce64-4f1a-9e53-943df602454d';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const executablePath = fs.existsSync(EDGE_PATH) ? EDGE_PATH : CHROME_PATH;

async function run() {
  console.log('Launching browser with:', executablePath);
  const browser = await puppeteer.launch({
    executablePath,
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Use local server for lightning fast response or Render
  const BASE_URL = 'http://localhost:3000';
  console.log('Target BASE_URL:', BASE_URL);

  console.log('Navigating to admin sandbox...');
  await page.goto(`${BASE_URL}/admin/sandbox?offline=1&mode=MAGIC_WHEEL`, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 1500));

  // Check if login modal is showing
  const isLoginModal = await page.evaluate(() => {
    return Boolean(document.querySelector('input') && document.body.textContent.includes('Quizorra'));
  });

  if (isLoginModal) {
    console.log('Authenticating with Master Key via UI...');
    await page.evaluate(() => {
      const mk = Array.from(document.querySelectorAll('button, a, span')).find(el => el.textContent && el.textContent.includes('Dùng Master Key'));
      if (mk) mk.click();
    });
    await new Promise(r => setTimeout(r, 600));
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const pass = inputs.find(i => i.type === 'password') || inputs[0];
      if (pass) pass.focus();
    });
    await page.keyboard.type('TimeoutQuiz@Admin2026');
    await new Promise(r => setTimeout(r, 400));
    await page.evaluate(() => {
      const submitBtn = document.querySelector('button[type="submit"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Super Admin'));
      if (submitBtn) submitBtn.click();
    });
    await new Promise(r => setTimeout(r, 3500));
  }

  console.log('Page loaded, current URL:', page.url());

  // 1. Click "Bắt đầu" or "Khởi chạy" to launch game if at mode selector or lobby
  console.log('Starting match from Lobby...');
  await page.evaluate(() => {
    // If on mode select screen, click Launch Offline
    const launchOfflineBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Chạy Offline'));
    if (launchOfflineBtn) {
      launchOfflineBtn.click();
      return;
    }
    // If in lobby, click "🚀 Bắt đầu"
    const startBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Bắt đầu'));
    if (startBtn) startBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // Skip prepare countdown if visible
  await page.evaluate(() => {
    const skipBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Bỏ qua chuẩn bị'));
    if (skipBtn) skipBtn.click();
  });
  await new Promise(r => setTimeout(r, 3000));

  const captureFullView = async (filePath) => {
    await page.screenshot({ path: filePath });
    console.log('Captured full viewport:', filePath);
  };

  // State 1: 4x14 Puzzle board & 3 teams in Lobby / Playing
  console.log('Capturing State 1: Puzzle Board & 3 Teams...');
  const shot1 = path.join(ARTIFACT_DIR, 'mw_01_puzzle_board_and_teams.png');
  await captureFullView(shot1);

  // Log all buttons found on the entire page
  const allBtns = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
  });
  console.log('All buttons on page:', allBtns);

  // State 2: Trigger Wheel Spin
  console.log('Triggering Wheel Spin...');
  const spinClicked = await page.evaluate(() => {
    const spinBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('QUAY NÓN'));
    if (spinBtn) {
      spinBtn.scrollIntoView({ behavior: 'instant', block: 'center' });
      spinBtn.click();
      return true;
    }
    return false;
  });
  console.log('Spin button clicked:', spinClicked);

  // Capture while spinning
  await new Promise(r => setTimeout(r, 1200));
  console.log('Capturing State 2: Wheel Spinning & Landing...');
  const shot2 = path.join(ARTIFACT_DIR, 'mw_02_wheel_spinning_and_sector.png');
  await captureFullView(shot2);

  // Wait for spin to complete and land
  console.log('Waiting 5s for wheel spin to land...');
  await new Promise(r => setTimeout(r, 5000));

  // Ensure state is ACTION_INPUT for letter guessing
  await page.evaluate(() => {
    window.postMessage({
      type: "MAGIC_WHEEL_FORCE_PHASE",
      phase: "ACTION_INPUT",
      selectedSector: { id: "sec_500", label: "500", type: "POINTS", value: 500, color: "#0284c7", textColor: "#ffffff" },
      lastActionMessage: "Đội Alpha quay vào ô 500 điểm! Mời gọi chữ cái!"
    }, "*");
  });
  await new Promise(r => setTimeout(r, 800));

  // State 3: Guess a letter (e.g. N)
  console.log('Guessing letter N...');
  let letterClicked = await page.evaluate(() => {
    const letters = ['N', 'T', 'R', 'A', 'H', 'E', 'B', 'C'];
    for (const char of letters) {
      const btn = Array.from(document.querySelectorAll('button')).find(b => {
        return b.textContent && b.textContent.trim() === char && !b.disabled;
      });
      if (btn) {
        btn.scrollIntoView({ behavior: 'instant', block: 'center' });
        btn.click();
        return char;
      }
    }
    return null;
  });

  if (!letterClicked) {
    console.log('Fallback: dispatching MAGIC_WHEEL_GUESS_LETTER via postMessage');
    await page.evaluate(() => {
      window.postMessage({ type: "MAGIC_WHEEL_GUESS_LETTER", letter: "N" }, "*");
    });
    letterClicked = "N";
  }
  console.log('Letter clicked / guessed:', letterClicked);

  await new Promise(r => setTimeout(r, 2000));
  console.log('Capturing State 3: Letter reveal & board update...');
  const shot3 = path.join(ARTIFACT_DIR, 'mw_03_lucky_cell_and_reveal.png');
  await captureFullView(shot3);

  // State 4: Solve Puzzle / Victory
  console.log('Solving whole puzzle (NGUYỄN TRÃI)...');
  await page.evaluate(() => {
    window.postMessage({
      type: "MAGIC_WHEEL_SOLVE_PUZZLE",
      answer: "NGUYỄN TRÃI"
    }, "*");
  });

  await new Promise(r => setTimeout(r, 2500));
  console.log('Capturing State 4: Victory Solve Puzzle...');
  const shot4 = path.join(ARTIFACT_DIR, 'mw_04_solve_puzzle_victory.png');
  await captureFullView(shot4);

  await browser.close();
  console.log('🎉 All 4 screenshots captured successfully!');
}

run().catch(err => {
  console.error('Error in capture script:', err);
  process.exit(1);
});
