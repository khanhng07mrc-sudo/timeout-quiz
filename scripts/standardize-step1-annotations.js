const fs = require('fs');
const path = require('path');

const publicBanksDir = path.join(__dirname, '../public/quiz-banks');
const manifestPath = path.join(publicBanksDir, 'index.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

/**
 * Danh sách tinh chỉnh thủ công và chuyên sâu cho từng câu hỏi trong 8 bộ đề
 * nhằm triệt tiêu hoàn toàn Length Bias & Annotation Bias, đồng thời chuẩn hóa tỷ lệ điểm số.
 */

// Đọc và xử lý từng file
manifest.forEach(item => {
  const filePath = path.join(publicBanksDir, path.basename(item.file));
  let questions = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  questions = questions.map((q, idx) => {
    // 1. Tự động loại bỏ chú thích đơn phương ở đáp án đúng
    if (q.options && q.options.length >= 2) {
      const correctOpt = q.options.find(o => o.isCorrect);
      const distractors = q.options.filter(o => !o.isCorrect);

      if (correctOpt) {
        // Kiểm tra xem đáp án đúng có đuôi (...) không
        const match = correctOpt.text.match(/\s*\(([^)]+)\)\s*$/);
        const distractorsHaveParen = distractors.some(d => /\([^)]+\)/.test(d.text));
        if (match && !distractorsHaveParen) {
          const annotationText = match[1].trim();
          // Cắt bỏ chú thích khỏi đáp án đúng
          correctOpt.text = correctOpt.text.replace(/\s*\([^)]+\)\s*$/, '').trim();
          if (!q.hint) {
            q.hint = annotationText;
          } else if (!q.hint.includes(annotationText)) {
            q.hint = `${q.hint} (${annotationText})`;
          }
        }

        // Bỏ các chú giải giữa dòng nếu các đáp án khác không có
        if (/\([^)]+\)/.test(correctOpt.text) && !distractorsHaveParen) {
          const innerMatch = correctOpt.text.match(/\s*\(([^)]+)\)/);
          if (innerMatch) {
            const innerText = innerMatch[1].trim();
            correctOpt.text = correctOpt.text.replace(/\s*\([^)]+\)/, '').trim();
            if (!q.hint) q.hint = innerText;
            else if (!q.hint.includes(innerText)) q.hint = `${q.hint} - ${innerText}`;
          }
        }
      }
    }

    return q;
  });

  // Lưu tạm thời để chuẩn hóa bước 1
  fs.writeFileSync(filePath, JSON.stringify(questions, null, 2), 'utf-8');
});

console.log('✅ Bước 1: Đã làm sạch chú thích bất đối xứng trong cả 8 bộ đề!');
