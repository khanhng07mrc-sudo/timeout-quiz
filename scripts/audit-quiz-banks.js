const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '../public/quiz-banks/index.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

let totalAnnotation = 0;
let totalLength = 0;

manifest.forEach(m => {
  const filePath = path.join(__dirname, '../public' + m.file);
  const list = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`\n=== KHO ĐỀ: ${m.code} (${m.title}) ===`);
  list.forEach((q, idx) => {
    if (!q.options) return;
    const correct = q.options.find(o => o.isCorrect);
    const distractors = q.options.filter(o => !o.isCorrect);
    if (!correct || distractors.length === 0) return;

    // 1. Kiểm tra chú thích ngoặc đơn bất đối xứng
    if (/\([^)]+\)/.test(correct.text) && !distractors.some(d => /\([^)]+\)/.test(d.text))) {
      totalAnnotation++;
      console.log(`[CHÚ THÍCH] Câu ${idx + 1} (${q.points}đ): "${correct.text}"`);
    }

    // 2. Kiểm tra chênh lệch độ dài
    const avgD = distractors.reduce((acc, d) => acc + d.text.length, 0) / distractors.length;
    if (correct.text.length > avgD * 1.5 && (correct.text.length - avgD) > 15) {
      totalLength++;
      console.log(`[ĐỘ DÀI] Câu ${idx + 1} (${q.points}đ): Đáp án đúng ${correct.text.length} ký tự vs trung bình nhiễu ${Math.round(avgD)} ký tự -> "${correct.text}"`);
    }
  });
});

console.log(`\n>>> TỔNG CỘNG: ${totalAnnotation} lỗi chú thích bất đối xứng, ${totalLength} lỗi lệch độ dài phương án.`);
