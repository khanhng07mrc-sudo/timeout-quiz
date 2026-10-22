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

  // 1. Authenticate with Super Admin Master Key
  console.log('Navigating to /admin for Master Key authentication...');
  await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1200));

  console.log('Clicking Master Key switch...');
  await page.evaluate(() => {
    const mkBtn = Array.from(document.querySelectorAll('button, a, span, p')).find(el => el.textContent && el.textContent.includes('Master Key'));
    if (mkBtn) mkBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  console.log('Typing master password...');
  const passInput = await page.$('input[type="password"]') || await page.$('input');
  if (passInput) {
    await passInput.click();
    await page.keyboard.type('TimeoutQuiz@Admin2026');
    await new Promise(r => setTimeout(r, 400));
    await page.evaluate(() => {
      const submit = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('Super Admin') || b.textContent.includes('Đăng nhập')));
      if (submit) submit.click();
    });
    console.log('Submitted login. Waiting for redirect...');
    await new Promise(r => setTimeout(r, 3000));
  }

  // 2. Open Quiz Bank to test SAME LETTER
  console.log('Navigating to /admin/quiz-bank...');
  await page.goto(`${BASE_URL}/admin/quiz-bank`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  console.log('Selecting Chiếc Nón Kỳ Diệu quiz bank...');
  const selected = await page.evaluate(() => {
    // Click any bank item with "Chiếc Nón" or "Magic Wheel" or the first bank card
    const items = Array.from(document.querySelectorAll('div, button, tr, li')).filter(el => {
      return el.textContent && (el.textContent.includes('Chiếc Nón') || el.textContent.includes('Magic Wheel') || el.textContent.includes('Bộ đề'));
    });
    const target = items.find(el => el.querySelector('h3, h4')) || items[0];
    if (target) {
      const clickable = target.querySelector('h3, h4, button, a') || target;
      clickable.click();
      return true;
    }
    return false;
  });
  console.log('Bank selected:', selected);
  await new Promise(r => setTimeout(r, 1500));

  console.log('Clicking "+ Thêm câu hỏi"...');
  await page.evaluate(() => {
    const addBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent && b.textContent.includes('Thêm câu hỏi'));
    if (addBtns.length > 0) addBtns[0].click();
  });
  await new Promise(r => setTimeout(r, 1500));

  // Type SAME LETTER in Hint and AWESOME APPLES in Answer
  console.log('Testing invalid vowel phrase: AWESOME APPLES...');
  await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input'));
    const hintInput = inputs.find(i => i.placeholder?.includes('Chủ đề') || i.placeholder?.includes('DANH NHÂN') || i.name === 'hint' || i.id === 'hint');
    const answerInput = inputs.find(i => i.placeholder?.includes('Đáp án') || i.placeholder?.includes('NGUYỄN TRÃI') || i.name === 'answer' || i.id === 'answer');

    if (hintInput && answerInput) {
      hintInput.value = 'SAME LETTER';
      hintInput.dispatchEvent(new Event('input', { bubbles: true }));
      hintInput.dispatchEvent(new Event('change', { bubbles: true }));

      answerInput.value = 'AWESOME APPLES';
      answerInput.dispatchEvent(new Event('input', { bubbles: true }));
      answerInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_same_letter_invalid_vowel.png') });
  console.log('Saved screenshot_same_letter_invalid_vowel.png');

  // Type SWEET & SOUR (all S consonants + standalone '&')
  console.log('Testing valid consonant phrase with &: SWEET & SOUR...');
  await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input'));
    const answerInput = inputs.find(i => i.placeholder?.includes('Đáp án') || i.placeholder?.includes('NGUYỄN TRÃI') || i.name === 'answer' || i.id === 'answer');
    if (answerInput) {
      answerInput.value = 'SWEET & SOUR';
      answerInput.dispatchEvent(new Event('input', { bubbles: true }));
      answerInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_same_letter_valid_bonus.png') });
  console.log('Saved screenshot_same_letter_valid_bonus.png');

  // 3. Open Sandbox Studio
  console.log('Navigating to /admin/sandbox?offline=1&mode=MAGIC_WHEEL...');
  await page.goto(`${BASE_URL}/admin/sandbox?offline=1&mode=MAGIC_WHEEL`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  // Skip prep & start round
  await page.evaluate(() => {
    const skipBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Bỏ qua chuẩn bị'));
    if (skipBtn) skipBtn.click();
    const startBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Bắt đầu trận'));
    if (startBtn) startBtn.click();
  });
  console.log('Waiting 6s for Round 1 to start...');
  await new Promise(r => setTimeout(r, 6500));

  // Save Sandbox Studio Full Split View (Display on left, Player on right)
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_sandbox_studio_round1_gameplay.png') });
  console.log('Saved screenshot_sandbox_studio_round1_gameplay.png');

  // Find the display iframe inside the page
  const displayFrame = page.frames().find(f => f.url().includes('/display/'));
  const iframeHandle = await page.$('iframe[title="Display Viewport"]') || await page.$('iframe[src*="/display/"]');

  if (displayFrame && iframeHandle) {
    console.log('Found display frame inside sandbox. Switching cameras and capturing high-res views...');

    async function captureCam(camId, filename) {
      console.log(`Switching to CAM ${camId}...`);
      await displayFrame.evaluate((id) => {
        const btn = document.querySelector(`button[data-cam-id="${id}"]`) ||
                    Array.from(document.querySelectorAll('button')).find(b => (b.textContent && b.textContent.trim() === id) || (b.title && b.title.includes(`CAM ${id}`)));
        if (btn) btn.click();
      }, camId);
      await new Promise(r => setTimeout(r, 2000));
      await iframeHandle.screenshot({ path: path.join(ARTIFACT_DIR, filename) });
      console.log(`Saved ${filename}`);
    }

    // CAM 4 (Wheel stop closeup showing upright stacked sector text)
    await captureCam('4', 'screenshot_cam4_heavy_wheel_stop.png');

    // CAM 1 (Cast, MC & Horizontal Wheel)
    await captureCam('1', 'screenshot_cam1_cast_and_horizontal_wheel.png');

    // CAM 3 (Hostess & Board)
    await captureCam('3', 'screenshot_cam3_hostess_3d_and_board.png');

    // CAM 5 (Contestant Push)
    await captureCam('5', 'screenshot_cam5_contestant_push.png');

    // CAM 2 (Master Wide)
    await captureCam('2', 'screenshot_cam2_master_wide.png');
  } else {
    console.warn('Display iframe not found in frames list');
  }

  console.log('All captures finished cleanly!');
  await browser.close();
}

run().catch(err => {
  console.error('Run failed:', err);
  process.exit(1);
});
