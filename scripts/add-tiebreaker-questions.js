const fs = require("fs");
const path = require("path");

const tieBreakerData = {
  "QLKT1101_Quan_ly_hoc_1.json": [
    {
      type: "MC_SINGLE",
      content: "[CÂU HỎI PHỤ - QUẢN LÝ HỌC] Ai được coi là 'Cha đẻ của Thuyết Quản trị Khoa học' (Scientific Management)?",
      points: 10,
      timeLimit: 20,
      isTieBreaker: true,
      options: [
        { id: "A", text: "Frederick Winslow Taylor", isCorrect: true },
        { id: "B", text: "Henri Fayol", isCorrect: false },
        { id: "C", text: "Max Weber", isCorrect: false },
        { id: "D", text: "Peter Drucker", isCorrect: false }
      ],
      hint: "Tác giả cuốn 'Các nguyên lý của quản trị khoa học' xuất bản năm 1911."
    },
    {
      type: "MC_SINGLE",
      content: "[CÂU HỎI PHỤ - QUẢN LÝ HỌC] Trong Tháp nhu cầu của Abraham Maslow, nhu cầu nào nằm ở đỉnh cao nhất?",
      points: 10,
      timeLimit: 20,
      isTieBreaker: true,
      options: [
        { id: "A", text: "Nhu cầu an toàn (Safety)", isCorrect: false },
        { id: "B", text: "Nhu cầu xã hội (Social)", isCorrect: false },
        { id: "C", text: "Nhu cầu tự hoàn thiện / khẳng định bản thân (Self-actualization)", isCorrect: true },
        { id: "D", text: "Nhu cầu được tôn trọng (Esteem)", isCorrect: false }
      ],
      hint: "Nhu cầu phát huy tối đa tiềm năng và đam mê cá nhân."
    },
    {
      type: "MC_SINGLE",
      content: "[CÂU HỎI PHỤ - QUẢN LÝ HỌC] Hiệu ứng Hawthorne nổi tiếng chứng minh yếu tố nào có tác động quyết định đến năng suất lao động của công nhân?",
      points: 10,
      timeLimit: 20,
      isTieBreaker: true,
      options: [
        { id: "A", text: "Cường độ ánh sáng và nhiệt độ phòng làm việc", isCorrect: false },
        { id: "B", text: "Sự chú ý xã hội và mối quan hệ tâm lý giữa các cá nhân trong nhóm", isCorrect: true },
        { id: "C", text: "Mức lương trả theo sản phẩm giản đơn", isCorrect: false },
        { id: "D", text: "Mức độ giám sát khắt khe của quản đốc", isCorrect: false }
      ],
      hint: "Nghiên cứu của Elton Mayo tại nhà máy Western Electric."
    }
  ],
  "QLKT1120_Lap_ke_hoach.json": [
    {
      type: "MC_SINGLE",
      content: "[CÂU HỎI PHỤ - LẬP KẾ HOẠCH] Chữ 'R' trong nguyên tắc thiết lập mục tiêu SMART đại diện cho tiêu chí nào?",
      points: 10,
      timeLimit: 20,
      isTieBreaker: true,
      options: [
        { id: "A", text: "Rapid (Nhanh chóng)", isCorrect: false },
        { id: "B", text: "Relevant / Realistic (Phù hợp / Thực tế)", isCorrect: true },
        { id: "C", text: "Resilient (Bền bỉ)", isCorrect: false },
        { id: "D", text: "Routine (Thường nhật)", isCorrect: false }
      ],
      hint: "Mục tiêu phải gắn liền với tầm nhìn chiến lược và có tính khả thi thực tế."
    },
    {
      type: "MC_SINGLE",
      content: "[CÂU HỎI PHỤ - LẬP KẾ HOẠCH] Trong ma trận BCG, đơn vị kinh doanh chiến lược (SBU) có thị phần cao trong một ngành tăng trưởng chậm được gọi là gì?",
      points: 10,
      timeLimit: 20,
      isTieBreaker: true,
      options: [
        { id: "A", text: "Ngôi sao (Star)", isCorrect: false },
        { id: "B", text: "Bò sữa (Cash Cow)", isCorrect: true },
        { id: "C", text: "Dấu hỏi (Question Mark)", isCorrect: false },
        { id: "D", text: "Con chó (Dog)", isCorrect: false }
      ],
      hint: "Đơn vị mang lại dòng tiền dồi dào để tài trợ cho các đơn vị kinh doanh khác."
    },
    {
      type: "MC_SINGLE",
      content: "[CÂU HỎI PHỤ - LẬP KẾ HOẠCH] Trong phân tích PESTEL, yếu tố nào khảo sát về biến động tỷ giá, lãi suất và lạm phát?",
      points: 10,
      timeLimit: 20,
      isTieBreaker: true,
      options: [
        { id: "A", text: "Political (Chính trị)", isCorrect: false },
        { id: "B", text: "Economic (Kinh tế)", isCorrect: true },
        { id: "C", text: "Social (Xã hội)", isCorrect: false },
        { id: "D", text: "Legal (Pháp lý)", isCorrect: false }
      ],
      hint: "Chữ E đầu tiên trong từ viết tắt PESTEL."
    }
  ],
  "QLKT1110_Quan_ly_du_an.json": [
    {
      type: "MC_SINGLE",
      content: "[CÂU HỎI PHỤ - QUẢN LÝ DỰ ÁN] Trong quản lý dự án theo phương pháp CPM/PERT, 'Đường găng' (Critical Path) là gì?",
      points: 10,
      timeLimit: 20,
      isTieBreaker: true,
      options: [
        { id: "A", text: "Chuỗi các công việc có thời gian dự trữ (slack/float) lớn nhất", isCorrect: false },
        { id: "B", text: "Chuỗi các công việc dài nhất quyết định tổng thời gian hoàn thành dự án", isCorrect: true },
        { id: "C", text: "Chuỗi công việc có chi phí tài chính cao nhất", isCorrect: false },
        { id: "D", text: "Chuỗi công việc có mức độ rủi ro an toàn lao động cao nhất", isCorrect: false }
      ],
      hint: "Bất kỳ sự chậm trễ nào trên đường này đều làm chậm trễ tiến độ toàn bộ dự án."
    },
    {
      type: "MC_SINGLE",
      content: "[CÂU HỎI PHỤ - QUẢN LÝ DỰ ÁN] Trong phương pháp Quản lý giá trị thu được (EVM), chỉ số CPI = EV / AC > 1 có ý nghĩa gì?",
      points: 10,
      timeLimit: 20,
      isTieBreaker: true,
      options: [
        { id: "A", text: "Dự án đang bội chi ngân sách (vượt chi)", isCorrect: false },
        { id: "B", text: "Dự án đang tiết kiệm chi phí (dưới ngân sách dự toán)", isCorrect: true },
        { id: "C", text: "Dự án đang chậm tiến độ", isCorrect: false },
        { id: "D", text: "Dự án đang vượt tiến độ", isCorrect: false }
      ],
      hint: "Cost Performance Index lớn hơn 1 phản ánh hiệu quả sử dụng chi phí tốt."
    },
    {
      type: "MC_SINGLE",
      content: "[CÂU HỎI PHỤ - QUẢN LÝ DỰ ÁN] Công cụ nào dùng để phân rã thứ bậc toàn bộ phạm vi dự án thành các gói công việc (Work Packages) nhỏ hơn?",
      points: 10,
      timeLimit: 20,
      isTieBreaker: true,
      options: [
        { id: "A", text: "WBS (Work Breakdown Structure)", isCorrect: true },
        { id: "B", text: "Bảng cân đối kế toán", isCorrect: false },
        { id: "C", text: "Biểu đồ xương cá Ishikawa", isCorrect: false },
        { id: "D", text: "Sơ đồ luồng dữ liệu DFD", isCorrect: false }
      ],
      hint: "Cấu trúc phân chia công việc nền tảng trong PMBOK."
    }
  ],
  "KTKI1105_Kiem_soat_quan_ly.json": [
    {
      type: "MC_SINGLE",
      content: "[CÂU HỎI PHỤ - KIỂM SOÁT QUẢN LÝ] Thẻ điểm cân bằng (Balanced Scorecard - BSC) đo lường hiệu quả hoạt động của doanh nghiệp qua bao nhiêu khía cạnh?",
      points: 10,
      timeLimit: 20,
      isTieBreaker: true,
      options: [
        { id: "A", text: "2 khía cạnh", isCorrect: false },
        { id: "B", text: "3 khía cạnh", isCorrect: false },
        { id: "C", text: "4 khía cạnh", isCorrect: true },
        { id: "D", text: "5 khía cạnh", isCorrect: false }
      ],
      hint: "Gồm Tài chính, Khách hàng, Quy trình nội bộ, và Học hỏi & Phát triển."
    },
    {
      type: "MC_SINGLE",
      content: "[CÂU HỎI PHỤ - KIỂM SOÁT QUẢN LÝ] Trong khung kiểm soát nội bộ COSO, thành tố nào đóng vai trò là 'nền tảng' cho tất cả các thành tố còn lại?",
      points: 10,
      timeLimit: 20,
      isTieBreaker: true,
      options: [
        { id: "A", text: "Đánh giá rủi ro (Risk Assessment)", isCorrect: false },
        { id: "B", text: "Môi trường kiểm soát (Control Environment)", isCorrect: true },
        { id: "C", text: "Hoạt động kiểm soát (Control Activities)", isCorrect: false },
        { id: "D", text: "Giám sát (Monitoring)", isCorrect: false }
      ],
      hint: "Thể hiện qua văn hóa doanh nghiệp, tính chính trực và giá trị đạo đức của ban lãnh đạo."
    },
    {
      type: "MC_SINGLE",
      content: "[CÂU HỎI PHỤ - KIỂM SOÁT QUẢN LÝ] Trung tâm trách nhiệm nào mà người quản lý chịu trách nhiệm cả về Doanh thu, Chi phí và Vốn đầu tư?",
      points: 10,
      timeLimit: 20,
      isTieBreaker: true,
      options: [
        { id: "A", text: "Trung tâm chi phí (Cost center)", isCorrect: false },
        { id: "B", text: "Trung tâm doanh thu (Revenue center)", isCorrect: false },
        { id: "C", text: "Trung tâm lợi nhuận (Profit center)", isCorrect: false },
        { id: "D", text: "Trung tâm đầu tư (Investment center)", isCorrect: true }
      ],
      hint: "Được đánh giá bằng các chỉ tiêu như ROI (Return on Investment) và EVA (Economic Value Added)."
    }
  ],
  "TOKT1138_Khoa_hoc_du_lieu.json": [
    {
      type: "MC_SINGLE",
      content: "[CÂU HỎI PHỤ - KHOA HỌC DỮ LIỆU] Thuật toán phân cụm K-Means thuộc nhóm học máy (Machine Learning) nào?",
      points: 10,
      timeLimit: 20,
      isTieBreaker: true,
      options: [
        { id: "A", text: "Học có giám sát (Supervised Learning)", isCorrect: false },
        { id: "B", text: "Học không giám sát (Unsupervised Learning)", isCorrect: true },
        { id: "C", text: "Học tăng cường (Reinforcement Learning)", isCorrect: false },
        { id: "D", text: "Học bán giám sát (Semi-supervised Learning)", isCorrect: false }
      ],
      hint: "Dữ liệu huấn luyện không có sẵn nhãn phân loại (labels/targets)."
    },
    {
      type: "MC_SINGLE",
      content: "[CÂU HỎI PHỤ - KHOA HỌC DỮ LIỆU] Hiện tượng mô hình hoạt động quá xuất sắc trên tập huấn luyện (Train) nhưng lại kém trên tập kiểm thử (Test) được gọi là gì?",
      points: 10,
      timeLimit: 20,
      isTieBreaker: true,
      options: [
        { id: "A", text: "Underfitting (Chưa khớp)", isCorrect: false },
        { id: "B", text: "Overfitting (Quá khớp)", isCorrect: true },
        { id: "C", text: "Data Leakage (Rò rỉ dữ liệu)", isCorrect: false },
        { id: "D", text: "Bias (Độ chệch)", isCorrect: false }
      ],
      hint: "Mô hình học vẹt cả nhiễu (noise) của dữ liệu huấn luyện, mất đi tính tổng quát hóa."
    },
    {
      type: "MC_SINGLE",
      content: "[CÂU HỎI PHỤ - KHOA HỌC DỮ LIỆU] Trong mô hình hồi quy Logistic, hàm số nào được dùng để nén giá trị đầu ra về khoảng xác suất (0, 1)?",
      points: 10,
      timeLimit: 20,
      isTieBreaker: true,
      options: [
        { id: "A", text: "Hàm ReLU", isCorrect: false },
        { id: "B", text: "Hàm Sigmoid", isCorrect: true },
        { id: "C", text: "Hàm Tuyến tính y = ax + b", isCorrect: false },
        { id: "D", text: "Hàm Bước nhảy Heaviside", isCorrect: false }
      ],
      hint: "Có dạng đồ thị hình chữ S: f(z) = 1 / (1 + e^-z)."
    }
  ],
  "MTKH1103_KT_Bien_doi_khi_hau.json": [
    {
      type: "MC_SINGLE",
      content: "[CÂU HỎI PHỤ - KINH TẾ BĐKH] Mục tiêu 'Net Zero' (Phát thải ròng bằng 0) nghĩa là gì?",
      points: 10,
      timeLimit: 20,
      isTieBreaker: true,
      options: [
        { id: "A", text: "Cắt giảm 100% mọi hoạt động sản xuất công nghiệp phát thải", isCorrect: false },
        { id: "B", text: "Lượng khí nhà kính phát thải vào khí quyển cân bằng với lượng được hấp thụ hoặc loại bỏ", isCorrect: true },
        { id: "C", text: "Đưa lượng tiêu thụ năng lượng hóa thạch về con số 0 trong 1 năm", isCorrect: false },
        { id: "D", text: "Không tính lượng khí thải của ngành nông nghiệp", isCorrect: false }
      ],
      hint: "Sự cân bằng tuyệt đối giữa phát thải nhân tạo và khả năng hấp thụ của các bể chứa carbon."
    },
    {
      type: "MC_SINGLE",
      content: "[CÂU HỎI PHỤ - KINH TẾ BĐKH] Thỏa thuận Paris (2015) đặt mục tiêu giữ mức tăng nhiệt độ toàn cầu không vượt quá bao nhiêu độ C so với thời kỳ tiền công nghiệp?",
      points: 10,
      timeLimit: 20,
      isTieBreaker: true,
      options: [
        { id: "A", text: "Dưới 1.5°C đến tối đa 2.0°C", isCorrect: true },
        { id: "B", text: "Dưới 3.0°C", isCorrect: false },
        { id: "C", text: "Dưới 0.5°C", isCorrect: false },
        { id: "D", text: "Dưới 4.0°C", isCorrect: false }
      ],
      hint: "Mục tiêu lý tưởng là 1.5 độ C nhằm hạn chế các rủi ro thảm họa khí hậu."
    },
    {
      type: "MC_SINGLE",
      content: "[CÂU HỎI PHỤ - KINH TẾ BĐKH] Cơ chế nào đặt ra hạn ngạch tổng phát thải (Cap) và cho phép các doanh nghiệp mua bán chứng chỉ thừa/thiếu (Trade)?",
      points: 10,
      timeLimit: 20,
      isTieBreaker: true,
      options: [
        { id: "A", text: "Thuế Pigouvian Carbon", isCorrect: false },
        { id: "B", text: "Hệ thống giao dịch phát thải ETS (Cap-and-Trade)", isCorrect: true },
        { id: "C", text: "Tiêu chuẩn kỹ thuật bắt buộc", isCorrect: false },
        { id: "D", text: "Trợ cấp năng lượng xanh", isCorrect: false }
      ],
      hint: "Hệ thống thị trường định giá carbon phổ biến tại Liên minh Châu Âu (EU ETS)."
    }
  ],
  "MTDT1115_Kinh_te_do_thi.json": [
    {
      type: "MC_SINGLE",
      content: "[CÂU HỎI PHỤ - KINH TẾ ĐÔ THỊ] Mô hình 'Thành phố đơn tâm' (Monocentric City Model) kinh điển của kinh tế đô thị gắn liền với tên tuổi của nhà kinh tế học nào?",
      points: 10,
      timeLimit: 20,
      isTieBreaker: true,
      options: [
        { id: "A", text: "William Alonso", isCorrect: true },
        { id: "B", text: "Paul Krugman", isCorrect: false },
        { id: "C", text: "Alfred Marshall", isCorrect: false },
        { id: "D", text: "David Ricardo", isCorrect: false }
      ],
      hint: "Phát triển lý thuyết giá thầu địa tô (Bid-rent function) dựa trên khoảng cách tới trung tâm CBD."
    },
    {
      type: "MC_SINGLE",
      content: "[CÂU HỎI PHỤ - KINH TẾ ĐÔ THỊ] Khái niệm mô hình TOD (Transit-Oriented Development) trong quy hoạch đô thị nhấn mạnh phát triển xoay quanh yếu tố nào?",
      points: 10,
      timeLimit: 20,
      isTieBreaker: true,
      options: [
        { id: "A", text: "Hệ thống cảng hàng không quốc tế", isCorrect: false },
        { id: "B", text: "Đầu mối giao thông công cộng sức chở lớn (Metro, BRT)", isCorrect: true },
        { id: "C", text: "Mạng lưới đường cao tốc liên tỉnh", isCorrect: false },
        { id: "D", text: "Khu công nghiệp ven đô", isCorrect: false }
      ],
      hint: "Đô thị nén kết nối mật độ cao trong bán kính đi bộ quanh nhà ga đường sắt đô thị."
    },
    {
      type: "MC_SINGLE",
      content: "[CÂU HỎI PHỤ - KINH TẾ ĐÔ THỊ] Chính sách thu phí tắc nghẽn giao thông (Congestion Pricing) dựa trên nguyên lý kinh tế học nào?",
      points: 10,
      timeLimit: 20,
      isTieBreaker: true,
      options: [
        { id: "A", text: "Nội hóa chi phí ngoại ứng tiêu cực (Internalizing negative externality)", isCorrect: true },
        { id: "B", text: "Trợ cấp hàng hóa công cộng", isCorrect: false },
        { id: "C", text: "Độc quyền tự nhiên", isCorrect: false },
        { id: "D", text: "Kiểm soát giá trần (Price ceiling)", isCorrect: false }
      ],
      hint: "Mỗi phương tiện gia nhập dòng xe gây thêm chậm trễ cho người khác mà không phải tự trả chi phí đó."
    }
  ],
  "KTKE1101_Nguyen_ly_ke_toan.json": [
    {
      type: "MC_SINGLE",
      content: "[CÂU HỎI PHỤ - NGUYÊN LÝ KẾ TOÁN] Phương trình kế toán cơ bản luôn được duy trì cân bằng là gì?",
      points: 10,
      timeLimit: 20,
      isTieBreaker: true,
      options: [
        { id: "A", text: "Tài sản = Nợ phải trả + Vốn chủ sở hữu", isCorrect: true },
        { id: "B", text: "Tài sản = Doanh thu - Chi phí", isCorrect: false },
        { id: "C", text: "Vốn chủ sở hữu = Tài sản + Nợ phải trả", isCorrect: false },
        { id: "D", text: "Lợi nhuận = Nợ phải trả - Tài sản", isCorrect: false }
      ],
      hint: "Tổng nguồn lực doanh nghiệp sở hữu luôn bằng tổng các nguồn tài trợ."
    },
    {
      type: "MC_SINGLE",
      content: "[CÂU HỎI PHỤ - NGUYÊN LÝ KẾ TOÁN] Nguyên tắc kế toán dồn tích (Accrual Basis) quy định doanh thu và chi phí phải được ghi nhận vào thời điểm nào?",
      points: 10,
      timeLimit: 20,
      isTieBreaker: true,
      options: [
        { id: "A", text: "Khi thực tế thu hoặc chi bằng tiền mặt", isCorrect: false },
        { id: "B", text: "Khi nghiệp vụ kinh tế phát sinh, không căn cứ vào thời điểm thực tế thu chi tiền", isCorrect: true },
        { id: "C", text: "Vào ngày cuối cùng của năm tài chính", isCorrect: false },
        { id: "D", text: "Khi có chữ ký duyệt của kế toán trưởng", isCorrect: false }
      ],
      hint: "Khác biệt căn bản giữa kế toán dồn tích và kế toán tiền mặt (Cash basis)."
    },
    {
      type: "MC_SINGLE",
      content: "[CÂU HỎI PHỤ - NGUYÊN LÝ KẾ TOÁN] Báo cáo tài chính nào phản ánh tổng hợp tình hình Tài sản, Nợ phải trả và Vốn chủ sở hữu tại một thời điểm nhất định?",
      points: 10,
      timeLimit: 20,
      isTieBreaker: true,
      options: [
        { id: "A", text: "Báo cáo kết quả hoạt động kinh doanh", isCorrect: false },
        { id: "B", text: "Bảng cân đối kế toán (Báo cáo tình hình tài chính)", isCorrect: true },
        { id: "C", text: "Báo cáo lưu chuyển tiền tệ", isCorrect: false },
        { id: "D", text: "Thuyết minh báo cáo tài chính", isCorrect: false }
      ],
      hint: "Bức ảnh chụp nhanh (snapshot) sức khỏe tài chính của doanh nghiệp tại một thời điểm."
    }
  ]
};

const quizBanksDir = path.join(__dirname, "../public/quiz-banks");
const indexFile = path.join(quizBanksDir, "index.json");

let totalAdded = 0;

for (const [filename, extraQuestions] of Object.entries(tieBreakerData)) {
  const filePath = path.join(quizBanksDir, filename);
  if (!fs.existsSync(filePath)) continue;

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  // Filter out any existing tie-breaker questions to ensure idempotency
  const nonTieBreakers = data.filter((q) => !q.isTieBreaker && !q.content.startsWith("[CÂU HỎI PHỤ"));
  
  const updatedData = [...nonTieBreakers, ...extraQuestions];
  fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2), "utf-8");
  totalAdded += extraQuestions.length;
  console.log(`✅ Đã cập nhật ${extraQuestions.length} câu hỏi phụ cho: ${filename} (Tổng: ${updatedData.length} câu)`);
}

// Update index.json if present
if (fs.existsSync(indexFile)) {
  const indexData = JSON.parse(fs.readFileSync(indexFile, "utf-8"));
  for (const item of indexData) {
    const filename = path.basename(item.file);
    const filePath = path.join(quizBanksDir, filename);
    if (fs.existsSync(filePath)) {
      const qData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      item.totalQuestions = qData.length;
      item.tieBreakerCount = 3;
    }
  }
  fs.writeFileSync(indexFile, JSON.stringify(indexData, null, 2), "utf-8");
  console.log("✅ Đã cập nhật metadata trong index.json");
}

console.log(`🎉 Hoàn tất! Đã thêm tổng cộng ${totalAdded} câu hỏi phụ vào kho đề.`);
