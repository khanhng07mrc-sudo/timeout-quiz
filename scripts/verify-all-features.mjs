import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = 'C:\\Users\\khanh\\.gemini\\antigravity\\brain\\7034f6e9-012f-4efa-a1ea-870481e8b07d';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const executablePath = fs.existsSync(EDGE_PATH) ? EDGE_PATH : CHROME_PATH;

async function run() {
  console.log('Launching browser with:', executablePath);
  const browser = await puppeteer.launch({
    executablePath,
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,980']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 980 });

  const BASE_URL = 'http://localhost:3000';

  // 1. Check Login / Master Key
  console.log('Navigating to admin login / rooms...');
  await page.goto(`${BASE_URL}/admin/rooms`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1200));

  const isLoginModal = await page.evaluate(() => {
    return Boolean(document.querySelector('input') && document.body.textContent.includes('Quizorra'));
  });

  if (isLoginModal) {
    console.log('Authenticating with Master Key...');
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
    await new Promise(r => setTimeout(r, 2500));
  }

  // 2. Quiz Bank: SAME LETTER validation test
  console.log('Navigating to Quiz Bank...');
  await page.goto(`${BASE_URL}/admin/quiz-bank`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  // Find or open a quiz bank or create question
  console.log('Opening bank or new question modal...');
  const openedBank = await page.evaluate(() => {
    // Look for an English bank or any bank card
    const bankCards = Array.from(document.querySelectorAll('div, tr, li')).filter(el => el.textContent && (el.textContent.includes('Chiếc Nón') || el.textContent.includes('English') || el.textContent.includes('Wheel')));
    const firstBank = bankCards[0];
    if (firstBank) {
      const btn = firstBank.querySelector('button, a') || firstBank;
      btn.click();
      return true;
    }
    return false;
  });

  await new Promise(r => setTimeout(r, 1500));

  // Click "Thêm câu hỏi" or similar
  await page.evaluate(() => {
    const addBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Thêm câu hỏi'));
    if (addBtn) addBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // If question modal is open, test SAME LETTER validation
  const hasQuestionModal = await page.evaluate(() => {
    return Boolean(document.body.textContent.includes('Thêm câu hỏi mới') || document.body.textContent.includes('Gợi ý / Chủ đề'));
  });

  if (hasQuestionModal) {
    console.log('Testing SAME LETTER in question modal...');
    // Set hint to SAME LETTER
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const hintInput = inputs.find(i => i.placeholder?.includes('Chủ đề') || i.name === 'hint' || i.id === 'hint') || inputs[2];
      if (hintInput) {
        hintInput.value = 'SAME LETTER';
        hintInput.dispatchEvent(new Event('input', { bubbles: true }));
        hintInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const ansInput = inputs.find(i => i.placeholder?.includes('Đáp án') || i.name === 'answer' || i.id === 'answer') || inputs[1];
      if (ansInput) {
        // First invalid vowel
        ansInput.value = 'AWESOME APPLES';
        ansInput.dispatchEvent(new Event('input', { bubbles: true }));
        ansInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_same_letter_invalid_vowel.png') });

    // Now valid consonant with standalone &
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const ansInput = inputs.find(i => i.placeholder?.includes('Đáp án') || i.name === 'answer' || i.id === 'answer') || inputs[1];
      if (ansInput) {
        ansInput.value = 'SWEET & SOUR';
        ansInput.dispatchEvent(new Event('input', { bubbles: true }));
        ansInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_same_letter_valid_bonus.png') });
  }

  // 3. Test Sandbox Studio Screen
  console.log('Navigating to Sandbox Studio...');
  await page.goto(`${BASE_URL}/admin/sandbox?offline=1&mode=MAGIC_WHEEL`, { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise(r => setTimeout(r, 3000));

  // If Start button exists, click it
  await page.evaluate(() => {
    const launchOfflineBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Chạy Offline'));
    if (launchOfflineBtn) launchOfflineBtn.click();
    const startBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Bắt đầu'));
    if (startBtn) startBtn.click();
  });
  await new Promise(r => setTimeout(r, 3500));

  // Screenshot Sandbox Studio Layout (Display on left, Player on right)
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_sandbox_studio_split_layout.png') });
  console.log('Saved screenshot_sandbox_studio_split_layout.png');

  // 4. Now open Display URL directly to inspect 3D cameras and realistic anatomy
  // Grab current room code from sandbox URL or query
  const currentUrl = page.url();
  const match = currentUrl.match(/code=([a-zA-Z0-9_-]+)/);
  const roomCode = match ? match[1] : '831629';
  console.log('Directly inspecting 3D Display for room:', roomCode);

  const displayPage = await browser.newPage();
  await displayPage.setViewport({ width: 1920, height: 1080 });
  await displayPage.goto(`${BASE_URL}/display/${roomCode}?sandbox=1`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000));

  // Switch to CAM 1 (Wide cast & horizontal wheel)
  await displayPage.evaluate(() => {
    const cam1 = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('CAM 1'));
    if (cam1) cam1.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await displayPage.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_realistic_cam1_cast_and_wheel.png') });

  // Switch to CAM 3 (Hostess & Board)
  await displayPage.evaluate(() => {
    const cam3 = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('CAM 3'));
    if (cam3) cam3.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await displayPage.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_realistic_cam3_hostess.png') });

  // Switch to CAM 5 (Contestant Push)
  await displayPage.evaluate(() => {
    const cam5 = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('CAM 5'));
    if (cam5) cam5.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await displayPage.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_realistic_cam5_contestant.png') });

  // Switch to CAM 2 (Master Wide)
  await displayPage.evaluate(() => {
    const cam2 = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('CAM 2'));
    if (cam2) cam2.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await displayPage.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_realistic_cam2_master.png') });

  console.log('All screenshots captured successfully.');
  await browser.close();
}

run().catch(err => {
  console.error('Puppeteer verification error:', err);
  process.exit(1);
});
