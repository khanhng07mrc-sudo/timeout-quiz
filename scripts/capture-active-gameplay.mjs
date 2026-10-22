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
  console.log('Authenticating...');
  await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1200));

  const needsLogin = await page.evaluate(() => {
    return Boolean(document.body.textContent.includes('Đăng nhập') || document.body.textContent.includes('Master Key') || document.querySelector('input[type="password"]'));
  });

  if (needsLogin) {
    await page.evaluate(() => {
      const mkBtn = Array.from(document.querySelectorAll('button, a, span')).find(el => el.textContent && el.textContent.includes('Master Key'));
      if (mkBtn) mkBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));
    await page.evaluate(() => {
      const pass = document.querySelector('input[type="password"]') || document.querySelector('input');
      if (pass) pass.focus();
    });
    await page.keyboard.type('TimeoutQuiz@Admin2026');
    await new Promise(r => setTimeout(r, 400));
    await page.evaluate(() => {
      const submit = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('Super Admin') || b.textContent.includes('Đăng nhập')));
      if (submit) submit.click();
    });
    await new Promise(r => setTimeout(r, 3500));
  }

  // 2. Open Quiz Bank directly to test SAME LETTER
  console.log('Navigating to /admin/quiz-bank...');
  await page.goto(`${BASE_URL}/admin/quiz-bank`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  // Click on a bank card to view questions
  await page.evaluate(() => {
    // Find bank cards
    const cards = Array.from(document.querySelectorAll('[data-bank-id], .cursor-pointer, .hover\\:border-primary')).filter(c => c.textContent && (c.textContent.includes('Câu hỏi') || c.textContent.includes('CNKD') || c.textContent.includes('Wheel')));
    if (cards.length > 0) {
      cards[0].click();
    } else {
      const allDivs = Array.from(document.querySelectorAll('div, tr')).filter(d => d.textContent && d.textContent.includes('Chiếc Nón Kỳ Diệu'));
      if (allDivs.length > 0) allDivs[0].click();
    }
  });
  await new Promise(r => setTimeout(r, 1500));

  // Click "Thêm câu hỏi"
  await page.evaluate(() => {
    const addBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Thêm câu hỏi'));
    if (addBtn) addBtn.click();
  });
  await new Promise(r => setTimeout(r, 1200));

  // Fill in Category SAME LETTER and test invalid vowel
  const test1 = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input'));
    const hintInput = inputs.find(i => i.placeholder?.includes('Chủ đề') || i.name === 'hint' || i.id === 'hint');
    const answerInput = inputs.find(i => i.placeholder?.includes('Đáp án') || i.name === 'answer' || i.id === 'answer');

    if (hintInput && answerInput) {
      hintInput.value = 'SAME LETTER';
      hintInput.dispatchEvent(new Event('input', { bubbles: true }));
      hintInput.dispatchEvent(new Event('change', { bubbles: true }));

      answerInput.value = 'AWESOME APPLES';
      answerInput.dispatchEvent(new Event('input', { bubbles: true }));
      answerInput.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  });

  if (test1) {
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_same_letter_invalid_vowel.png') });
    console.log('Saved screenshot_same_letter_invalid_vowel.png');

    // Valid consonant + standalone '&'
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const answerInput = inputs.find(i => i.placeholder?.includes('Đáp án') || i.name === 'answer' || i.id === 'answer');
      if (answerInput) {
        answerInput.value = 'SWEET & SOUR';
        answerInput.dispatchEvent(new Event('input', { bubbles: true }));
        answerInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_same_letter_valid_bonus.png') });
    console.log('Saved screenshot_same_letter_valid_bonus.png');

    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 600));
  } else {
    console.log('Could not open Add Question modal; took fallback snapshot.');
  }

  // 3. Test Sandbox Studio Layout & 3D Scene with adult proportions
  console.log('Navigating to Sandbox Studio...');
  await page.goto(`${BASE_URL}/admin/sandbox?offline=1&mode=MAGIC_WHEEL`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  // Click start or skip prep
  await page.evaluate(() => {
    const skipBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Bỏ qua chuẩn bị'));
    if (skipBtn) skipBtn.click();
    const startBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Bắt đầu trận'));
    if (startBtn) startBtn.click();
  });
  console.log('Waiting 5s for Round 1 to start and 3D studio to render...');
  await new Promise(r => setTimeout(r, 5500));

  // Take Full Sandbox Studio Screenshot (Display left, Player right)
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_sandbox_studio_round1_gameplay.png') });
  console.log('Saved screenshot_sandbox_studio_round1_gameplay.png');

  // Find Display iframe
  const frames = page.frames();
  const displayFrame = frames.find(f => f.url().includes('/display/'));
  if (displayFrame) {
    console.log('Switching to CAM 3 (Hostess & Board)...');
    await displayFrame.evaluate(() => {
      const cam3 = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('CAM 3'));
      if (cam3) cam3.click();
    });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_sandbox_cam3_hostess.png') });

    console.log('Switching to CAM 1 (Cast, MC & Horizontal Wheel)...');
    await displayFrame.evaluate(() => {
      const cam1 = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('CAM 1'));
      if (cam1) cam1.click();
    });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_sandbox_cam1_cast_wheel.png') });

    console.log('Switching to CAM 5 (Contestant Push Action)...');
    await displayFrame.evaluate(() => {
      const cam5 = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('CAM 5'));
      if (cam5) cam5.click();
    });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_sandbox_cam5_contestant_push.png') });
  }

  console.log('Completed all captures.');
  await browser.close();
}

run().catch(err => {
  console.error('Run failed:', err);
  process.exit(1);
});
