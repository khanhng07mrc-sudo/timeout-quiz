const fs = require('fs');
const path = require('path');
const manifest = JSON.parse(fs.readFileSync('public/quiz-banks/index.json', 'utf-8'));

manifest.forEach(m => {
  const file = 'public' + m.file;
  const list = JSON.parse(fs.readFileSync(file, 'utf-8'));
  console.log(`\n======================================================`);
  console.log(`=== ${m.code}: ${m.title} (8 CÂU 30Đ: TỪ CÂU 17 ĐẾN 24) ===`);
  console.log(`======================================================`);
  for (let i = 16; i < 24; i++) {
    const q = list[i];
    console.log(`\n[Câu ${i+1} - 30đ]: ${q.content}`);
    if (q.options) {
      q.options.forEach(o => {
        console.log(`  ${o.id}. ${o.text} ${o.isCorrect ? '✅' : ''}`);
      });
    }
    console.log(`  💡 Giải thích/Hint: ${q.hint || 'Chưa có'}`);
  }
});
