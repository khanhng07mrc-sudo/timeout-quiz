const fs = require('fs');
const path = require('path');
const publicBanksDir = path.join(__dirname, '../public/quiz-banks');

// 1. QLKT1110
const qlkt1110Path = path.join(publicBanksDir, 'QLKT1110_Quan_ly_du_an.json');
const qlkt1110 = JSON.parse(fs.readFileSync(qlkt1110Path, 'utf-8'));
// Q10
qlkt1110[9].options = [
  { id: "A", text: "Tranh chấp quyền kiểm soát hợp đồng thi công giữa chủ đầu tư và nhà thầu", isCorrect: false },
  { id: "B", text: "Hiện tượng Phình phạm vi do thiếu quy trình kiểm soát thay đổi chuẩn mực", isCorrect: true },
  { id: "C", text: "Biến động tỷ giá hối đoái và lạm phát nguyên vật liệu đầu vào ngoài dự kiến", isCorrect: false },
  { id: "D", text: "Sự cố kỹ thuật đứt gãy chuỗi cung ứng logistics toàn cầu thời gian dài", isCorrect: false }
];
// Q11
qlkt1110[10].options = [
  { id: "A", text: "Tập hợp các công việc có tổng ngân sách chi tiêu lớn nhất trong dự án", isCorrect: false },
  { id: "B", text: "Chuỗi công việc dài nhất quyết định thời gian hoàn thành sớm nhất của dự án", isCorrect: true },
  { id: "C", text: "Nhóm các đầu việc có mức độ rủi ro an toàn lao động cao nhất công trường", isCorrect: false },
  { id: "D", text: "Các công việc do các chuyên gia kỹ thuật bậc cao nhất trực tiếp đảm nhận", isCorrect: false }
];
fs.writeFileSync(qlkt1110Path, JSON.stringify(qlkt1110, null, 2), 'utf-8');

// 2. KTKI1105
const ktki1105Path = path.join(publicBanksDir, 'KTKI1105_Kiem_soat_quan_ly.json');
const ktki1105 = JSON.parse(fs.readFileSync(ktki1105Path, 'utf-8'));
// Q24
ktki1105[23].options = [
  { id: "A", text: "Ấn định mức chi phí cố định bất biến cho toàn bộ niên độ tài chính doanh nghiệp", isCorrect: false },
  { id: "B", text: "Tự động điều chỉnh dự toán chi phí theo mức sản lượng thực tế đạt được", isCorrect: true },
  { id: "C", text: "Cắt giảm toàn bộ chi phí quảng cáo và nghiên cứu phát triển khi doanh số giảm", isCorrect: false },
  { id: "D", text: "Cho phép các quản đốc phân xưởng tùy ý vượt trần ngân sách được phê duyệt", isCorrect: false }
];
fs.writeFileSync(ktki1105Path, JSON.stringify(ktki1105, null, 2), 'utf-8');

// 3. TOKT1138
const tokt1138Path = path.join(publicBanksDir, 'TOKT1138_Khoa_hoc_du_lieu.json');
const tokt1138 = JSON.parse(fs.readFileSync(tokt1138Path, 'utf-8'));
// Q20
tokt1138[19].options = [
  { id: "A", text: "Tăng tốc độ tính toán huấn luyện của các thuật toán học máy phức tạp", isCorrect: false },
  { id: "B", text: "Đánh giá tính tổng quát hóa và độ ổn định của mô hình trên dữ liệu mới", isCorrect: true },
  { id: "C", text: "Tự động điền các giá trị khuyết thiếu trong bảng dữ liệu đầu vào gốc", isCorrect: false },
  { id: "D", text: "Giảm số lượng biến đầu vào mà không làm thay đổi cấu trúc của mô hình", isCorrect: false }
];
// Q24
tokt1138[23].options = [
  { id: "A", text: "Tỷ lệ dự đoán đúng trên toàn bộ tập dữ liệu giao dịch tổng thể", isCorrect: false },
  { id: "B", text: "Tỷ lệ các giao dịch gian lận thực tế được mô hình phát hiện chuẩn xác", isCorrect: true },
  { id: "C", text: "Tỷ lệ các giao dịch hợp pháp bị gắn nhãn nhầm là gian lận trong kỳ", isCorrect: false },
  { id: "D", text: "Thời gian xử lý trung bình để quét và xác thực một giao dịch thanh toán", isCorrect: false }
];
if (!tokt1138[23].hint) tokt1138[23].hint = "Recall (Độ nhạy) = TP / (TP + FN), đo lường khả năng bắt trọn các ca gian lận thực tế.";
fs.writeFileSync(tokt1138Path, JSON.stringify(tokt1138, null, 2), 'utf-8');

// 4. MTKH1103
const mtkh1103Path = path.join(publicBanksDir, 'MTKH1103_KT_Bien_doi_khi_hau.json');
const mtkh1103 = JSON.parse(fs.readFileSync(mtkh1103Path, 'utf-8'));
// Q10
mtkh1103[9].options = [
  { id: "A", text: "Sự can thiệp quá mức của chính quyền vào thị trường mua bán hạn ngạch khí thải", isCorrect: false },
  { id: "B", text: "Tính chất hàng hóa công cộng không có tính loại trừ của bầu khí quyển chung", isCorrect: true },
  { id: "C", text: "Sự thiếu hụt nguồn lực tài chính của các định chế phát triển toàn cầu lớn", isCorrect: false },
  { id: "D", text: "Chi phí đầu tư công nghệ năng lượng tái tạo vẫn còn cao hơn nhiệt điện truyền thống", isCorrect: false }
];
if (!mtkh1103[9].hint) mtkh1103[9].hint = "Khí quyển là hàng hóa công thuần túy: không thể ngăn cản ai hưởng lợi từ bầu không khí trong lành, dẫn đến tâm lý ỷ lại (Free-rider).";
fs.writeFileSync(mtkh1103Path, JSON.stringify(mtkh1103, null, 2), 'utf-8');

console.log('✅ Đã triệt tiêu hoàn toàn 6 điểm lệch cuối cùng!');
