import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\khanh\\.gemini\\antigravity\\brain\\7034f6e9-012f-4efa-a1ea-870481e8b07d';
const execPath = fs.existsSync('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe')
  ? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  : 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: execPath,
    headless: 'new',
    args: ['--window-size=1600,1000', '--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000 });

  page.on('dialog', async d => {
    console.log('Dialog handled:', d.message());
    await d.accept();
  });

  console.log('Logging in via /api/auth/login with Master Key...');
  await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.evaluate(async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'TimeoutQuiz@Admin2026', isMasterKey: true })
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('admin_token', data.token);
      sessionStorage.setItem('admin_token', data.token);
    }
  });
  await new Promise(r => setTimeout(r, 1000));

  console.log('Navigating to /admin/quiz-bank...');
  await page.goto('http://localhost:3000/admin/quiz-bank', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  console.log('Clicking Chiếc Nón preset load button...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Nạp Đề Mẫu Chiếc Nón'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  console.log('Selecting Chiếc Nón bank from list...');
  await page.evaluate(() => {
    const titles = Array.from(document.querySelectorAll('p.font-bold'));
    const targetTitle = titles.find(p => p.textContent && /chiếc nón/i.test(p.textContent));
    if (targetTitle) {
      const card = targetTitle.closest('div.p-4') || targetTitle.parentElement;
      if (card) card.click();
    }
  });
  await new Promise(r => setTimeout(r, 1500));

  console.log('Clicking + Thêm câu hỏi button...');
  await page.evaluate(() => {
    const addBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Thêm câu hỏi'));
    if (addBtn) addBtn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  // Scroll form down so the new Clue Display Mode radio buttons are in view
  await page.evaluate(() => {
    const modalForm = document.querySelector('form');
    if (modalForm) modalForm.scrollTop = 260;
  });
  await new Promise(r => setTimeout(r, 800));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_quiz_bank_clue_mode_selector.png') });
  console.log('Saved screenshot_quiz_bank_clue_mode_selector.png!');

  // Now test SAME LETTER with AWESOME APPLES (invalid vowel)
  await page.evaluate(() => {
    function setVal(input, val) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(input, val);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const inputs = Array.from(document.querySelectorAll('input'));
    const hintInput = inputs.find(i => i.placeholder && (i.placeholder.includes('Chủ đề') || i.placeholder.includes('DANH NHÂN')));
    const ansInput = inputs.find(i => i.placeholder && (i.placeholder.includes('Đáp án') || i.placeholder.includes('NGUYỄN TRÃI')));
    if (hintInput && ansInput) {
      setVal(hintInput, 'SAME LETTER');
      setVal(ansInput, 'AWESOME APPLES');
    }
    const form = document.querySelector('form');
    if (form) form.scrollTop = 340;
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_same_letter_invalid_vowel.png') });
  console.log('Saved screenshot_same_letter_invalid_vowel.png!');

  // Now test SWEET & SOUR (valid consonant + &)
  await page.evaluate(() => {
    function setVal(input, val) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(input, val);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const inputs = Array.from(document.querySelectorAll('input'));
    const ansInput = inputs.find(i => i.placeholder && (i.placeholder.includes('Đáp án') || i.placeholder.includes('NGUYỄN TRÃI')));
    if (ansInput) {
      setVal(ansInput, 'SWEET & SOUR');
    }
    const form = document.querySelector('form');
    if (form) form.scrollTop = 340;
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_same_letter_valid_bonus.png') });
  console.log('Saved screenshot_same_letter_valid_bonus.png!');

  await browser.close();
  console.log('Done capturing quiz bank verification!');
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
