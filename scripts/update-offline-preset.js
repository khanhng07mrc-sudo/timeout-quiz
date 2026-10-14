const fs = require('fs');
const path = require('path');

const qlPath = path.join(__dirname, '..', 'public', 'quiz-banks', 'QLKT1120_Lap_ke_hoach.json');
const ql = JSON.parse(fs.readFileSync(qlPath, 'utf8'));

const offQuestions = ql.map((q, idx) => ({
  id: 'q_off_' + (idx + 1),
  ...q
}));

const filePath = path.join(__dirname, '..', 'src', 'lib', 'offline-storage.ts');
let code = fs.readFileSync(filePath, 'utf8');

const startMarker = 'export const DEFAULT_OFFLINE_BANK: OfflineQuizBank = {';
const endMarker = 'export const offlineStorage = {';

const startIndex = code.indexOf(startMarker);
const endIndex = code.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('Markers not found!');
  process.exit(1);
}

const newBankCode = `export const DEFAULT_OFFLINE_BANK: OfflineQuizBank = {
  "id": "bank_offline_preset_default",
  "title": "Bộ Đề Mẫu Đa Chế Độ (Offline Preset - 45 Câu Chuẩn Hóa)",
  "description": "45 câu hỏi toàn diện đầy đủ 7 dạng thức và phân bổ điểm chuẩn mực (22% câu 10đ, 36% câu 20đ, 29% câu 30đ, 13% câu 40đ) chạy siêu mượt không cần mạng",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "isLocalOnly": true,
  "_count": {
    "questions": ${offQuestions.length}
  },
  "questions": ${JSON.stringify(offQuestions, null, 4)}
};

`;

const updatedCode = code.slice(0, startIndex) + newBankCode + code.slice(endIndex);
fs.writeFileSync(filePath, updatedCode, 'utf8');
console.log('Successfully updated DEFAULT_OFFLINE_BANK with 45 standardized questions!');
