const fs = require('fs');
const path = require('path');
const manifest = JSON.parse(fs.readFileSync('public/quiz-banks/index.json', 'utf-8'));

manifest.forEach(m => {
  const file = 'public' + m.file;
  const list = JSON.parse(fs.readFileSync(file, 'utf-8'));
  console.log(`\n=== ${m.code}: ${m.title} ===`);
  list.slice(0, 25).forEach((q, i) => {
    console.log(`[${i+1}] (${q.points}đ) ${q.content.substring(0, 65)}...`);
  });
});
