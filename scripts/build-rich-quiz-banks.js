const fs = require('fs');
const path = require('path');

const publicBanksDir = path.join(__dirname, '../public/quiz-banks');

// Tải dữ liệu các đề hiện tại
function loadBank(filename) {
  return JSON.parse(fs.readFileSync(path.join(publicBanksDir, filename), 'utf-8'));
}

function saveBank(filename, data) {
  fs.writeFileSync(path.join(publicBanksDir, filename), JSON.stringify(data, null, 2), 'utf-8');
}

console.log("Bắt đầu chuẩn hóa 8 bộ đề theo chuẩn: 4 câu 10đ, 12 câu 20đ, 8 câu 30đ thực chất + 3 câu TB...");
