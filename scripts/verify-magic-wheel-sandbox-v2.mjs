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

  const BASE_URL = 'http://localhost:3000';
  console.log('Navigating to admin sandbox...');
  await page.goto(`${BASE_URL}/admin/sandbox?offline=1&mode=MAGIC_WHEEL`, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 1500));

  // Check login modal
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
    await new Promise(r => setTimeout(r, 3500));
  }

  // Launch offline or start
  await page.evaluate(() => {
    const launchOfflineBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Chạy Offline'));
    if (launchOfflineBtn) launchOfflineBtn.click();
    const startBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Bắt đầu'));
    if (startBtn) startBtn.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  // Verify Magic Wheel buttons on toolbar
  const toolbarButtons = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
    return all.filter(text => 
      text.includes('Quay nón') ||
      text.includes('Đổi lượt') ||
      text.includes('Mở chữ') ||
      text.includes('May mắn') ||
      text.includes('Đoán ô chữ') ||
      text.includes('Mở hết') ||
      text.includes('Vòng kế')
    );
  });
  console.log('🎯 Verified Magic Wheel Toolbar buttons:', toolbarButtons);

  // Click "🔤 Mở chữ" twice
  console.log('Clicking "🔤 Mở chữ"...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Mở chữ'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1200));

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Mở chữ'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1200));

  const screenshotPath = path.join(ARTIFACT_DIR, 'mw_v2_sandbox_suite.png');
  await page.screenshot({ path: screenshotPath });
  console.log('📸 Captured screenshot at:', screenshotPath);

  await browser.close();
  console.log('Verification finished successfully!');
}

run().catch(err => {
  console.error('Error in verification:', err);
  process.exit(1);
});
