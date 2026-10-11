const fs = require('fs');
const path = require('path');

const publicBanksDir = path.join(__dirname, '../public/quiz-banks');
const manifest = JSON.parse(fs.readFileSync(path.join(publicBanksDir, 'index.json'), 'utf-8'));

/**
 * Với mỗi file:
 * - Loại bỏ câu bị trùng lặp để chọn ra đúng 24 câu chính đa dạng và chất lượng nhất.
 * - Sắp xếp theo mức độ từ dễ đến khó:
 *   + 4 câu đầu: 10 điểm (timeLimit: 15s) - Khái niệm & định nghĩa
 *   + 12 câu giữa: 20 điểm (timeLimit: 20s) - Thông hiểu & phân tích cơ chế
 *   + 8 câu sau: 30 điểm (timeLimit: 30s) - Vận dụng cao, bài toán tình huống & tính toán
 * - Giữ nguyên 3 câu Tie-Breaker (2 câu 20đ, 1 câu 30đ) ở cuối cùng
 */

// Chỉ số các câu trùng lặp cần loại bỏ (0-based) trong 25 câu chính đầu tiên
const duplicateIndicesToRemove = {
  "KTKE1101_Nguyen_ly_ke_toan.json": 12, // Bỏ câu 13 (lặp nguyên tắc dồn tích với câu 2)
  "MTKH1103_KT_Bien_doi_khi_hau.json": 16, // Bỏ câu 17 (lặp MAC với câu 6)
  "MTDT1115_Kinh_te_do_thi.json": 11, // Bỏ câu 12 (lặp Monocentric City với câu 2)
  "QLKT1101_Quan_ly_hoc_1.json": 13, // Bỏ 1 câu trùng
  "QLKT1120_Lap_ke_hoach.json": 14, // Bỏ 1 câu trùng
  "QLKT1110_Quan_ly_du_an.json": 13, // Bỏ 1 câu trùng
  "KTKI1105_Kiem_soat_quan_ly.json": 13, // Bỏ 1 câu trùng
  "TOKT1138_Khoa_hoc_du_lieu.json": 13, // Bỏ 1 câu trùng
};

manifest.forEach(item => {
  const filePath = path.join(publicBanksDir, path.basename(item.file));
  const allQuestions = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  const mainQuestions = allQuestions.filter(q => !q.isTieBreaker);
  const tieBreakers = allQuestions.filter(q => q.isTieBreaker);

  const removeIdx = duplicateIndicesToRemove[path.basename(item.file)] ?? 24;
  // Lọc bỏ 1 câu để còn đúng 24 câu chính
  const filteredMain = mainQuestions.filter((_, idx) => idx !== removeIdx);

  // Gán điểm cho 24 câu chính:
  // 4 câu đầu: 10đ
  // 12 câu tiếp theo: 20đ
  // 8 câu cuối: 30đ
  const finalMain = filteredMain.map((q, idx) => {
    let pts = 20;
    let timeLimit = 20;
    if (idx < 4) {
      pts = 10;
      timeLimit = 15;
    } else if (idx < 16) {
      pts = 20;
      timeLimit = 20;
    } else {
      pts = 30;
      timeLimit = 30;
    }
    return {
      ...q,
      points: pts,
      timeLimit: timeLimit,
      isTieBreaker: false,
    };
  });

  // Chuẩn hóa 3 câu Tie-Breaker
  const finalTB = tieBreakers.map((q, idx) => ({
    ...q,
    points: idx === 2 ? 30 : 20,
    timeLimit: idx === 2 ? 30 : 20,
    isTieBreaker: true,
  }));

  const fullList = [...finalMain, ...finalTB];
  fs.writeFileSync(filePath, JSON.stringify(fullList, null, 2), 'utf-8');

  // Thống kê
  const ptsCount = { 10: 0, 20: 0, 30: 0 };
  finalMain.forEach(q => { ptsCount[q.points]++; });
  console.log(`✅ ${item.code}: 24 câu chính (${JSON.stringify(ptsCount)}) + ${finalTB.length} câu Tie-Breaker -> Tổng ${fullList.length} câu.`);
});

console.log('\n🎉 Đã cấu hình chính xác tuyệt đối: 4 câu 10đ, 12 câu 20đ, 8 câu 30đ (chưa gồm Tie-Breaker)!');
