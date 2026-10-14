const fs = require('fs');
const path = require('path');

// ─── 1. QLKT1120: LẬP KẾ HOẠCH (18 câu bổ sung) ──────────────────────────────
const newQlktQuestions = [
  // 10 ĐIỂM (6 câu: 22.2%)
  {
    type: "MC_SINGLE",
    content: "Trong mô hình lập kế hoạch kinh doanh 5W1H, chữ 'W' đại diện cho câu hỏi 'Tại sao phải thực hiện mục tiêu này?' là từ nào?",
    points: 10,
    timeLimit: 15,
    options: [
      { id: "A", text: "Where (Ở đâu)", isCorrect: false },
      { id: "B", text: "Why (Tại sao)", isCorrect: true },
      { id: "C", text: "When (Khi nào)", isCorrect: false },
      { id: "D", text: "Who (Ai làm)", isCorrect: false }
    ],
    hint: "Why xác định lý do, mục đích cốt lõi và ý nghĩa của kế hoạch.",
    isTieBreaker: false
  },
  {
    type: "TRUE_FALSE",
    content: "Kế hoạch tác nghiệp (Operational Planning) thường có tầm nhìn dài hạn từ 5 đến 10 năm và do Hội đồng Quản trị ban hành.",
    points: 10,
    timeLimit: 15,
    options: [
      { id: "A", text: "Đúng", isCorrect: false },
      { id: "B", text: "Sai", isCorrect: true }
    ],
    hint: "Kế hoạch tác nghiệp mang tính ngắn hạn (dưới 1 năm), gắn với hoạt động hàng ngày của cấp cơ sở.",
    isTieBreaker: false
  },
  {
    type: "FILL_BLANK",
    content: "Mô hình quản trị mục tiêu hiện đại được Google và Intel áp dụng phổ biến, bao gồm Mục tiêu (Objectives) và Các kết quả then chốt, viết tắt là gì?",
    answer: "OKR",
    points: 10,
    timeLimit: 15,
    hint: "Viết tắt của 3 chữ cái tiếng Anh: Objectives and Key Results.",
    isTieBreaker: false
  },
  {
    type: "MC_SINGLE",
    content: "Trong chu trình cải tiến liên tục PDCA của Deming, chữ 'C' đại diện cho hành động nào?",
    points: 10,
    timeLimit: 15,
    options: [
      { id: "A", text: "Control (Kiểm soát nội bộ)", isCorrect: false },
      { id: "B", text: "Check (Kiểm tra, đo lường kết quả)", isCorrect: true },
      { id: "C", text: "Create (Sáng tạo phương án mới)", isCorrect: false },
      { id: "D", text: "Cancel (Hủy bỏ dự án thất bại)", isCorrect: false }
    ],
    hint: "PDCA = Plan - Do - Check - Act.",
    isTieBreaker: false
  },
  {
    type: "MC_SINGLE",
    content: "Loại kế hoạch nào dưới đây quy định chuỗi các hành động bắt buộc phải thực hiện theo trình tự thời gian cụ thể để hoàn thành một công việc?",
    points: 10,
    timeLimit: 15,
    options: [
      { id: "A", text: "Quy trình (Procedures)", isCorrect: true },
      { id: "B", text: "Chính sách (Policies)", isCorrect: false },
      { id: "C", text: "Chiến lược (Strategies)", isCorrect: false },
      { id: "D", text: "Quy chế văn hóa công ty", isCorrect: false }
    ],
    hint: "Quy trình định rõ từng bước 1, 2, 3... theo trình tự trước sau.",
    isTieBreaker: false
  },
  {
    type: "TRUE_FALSE",
    content: "Trong ma trận SWOT, Cơ hội (Opportunities) và Thách thức (Threats) phản ánh các nhân tố thuộc môi trường bên ngoài của tổ chức.",
    points: 10,
    timeLimit: 15,
    options: [
      { id: "A", text: "Đúng", isCorrect: true },
      { id: "B", text: "Sai", isCorrect: false }
    ],
    hint: "Điểm mạnh/yếu thuộc nội bộ, cơ hội/thách thức đến từ môi trường bên ngoài.",
    isTieBreaker: false
  },

  // 20 ĐIỂM (6 câu: 35.6%)
  {
    type: "MC_MULTI",
    content: "Trong các phát biểu dưới đây về Ma trận mở rộng sản phẩm / thị trường của Ansoff, những phát biểu nào là ĐÚNG?",
    points: 20,
    timeLimit: 20,
    options: [
      { id: "A", text: "Thâm nhập thị trường là bán sản phẩm hiện có vào thị trường hiện có", isCorrect: true },
      { id: "B", text: "Phát triển sản phẩm là đưa sản phẩm mới vào thị trường hiện có", isCorrect: true },
      { id: "C", text: "Đa dạng hóa là đưa sản phẩm mới vào thị trường hoàn toàn mới", isCorrect: true },
      { id: "D", text: "Phát triển thị trường là bán sản phẩm mới vào thị trường hiện có", isCorrect: false }
    ],
    hint: "Phát triển thị trường là bán sản phẩm hiện có vào các thị trường hoặc phân khúc khách hàng mới.",
    isTieBreaker: false
  },
  {
    type: "FILL_BLANK",
    content: "Phương pháp lập ngân sách yêu cầu người quản lý phải giải trình và chứng minh lại toàn bộ các khoản chi tiêu từ con số 0 cho mỗi kỳ lập kế hoạch mới được gọi là ngân sách gì? (Ghi tên tiếng Anh 3 chữ cái)",
    answer: "ZBB",
    points: 20,
    timeLimit: 20,
    hint: "Viết tắt của Zero-Based Budgeting (Ngân sách dựa trên số không).",
    isTieBreaker: false
  },
  {
    type: "ESSAY",
    content: "Hãy nêu sự khác biệt cốt lõi giữa Kế hoạch chiến lược (Strategic Plan) và Kế hoạch tác nghiệp (Operational Plan) về: Tầm nhìn thời gian và Cấp quản lý chịu trách nhiệm chính.",
    answer: "Kế hoạch chiến lược: dài hạn (3-5+ năm), do cấp cao (HĐQT/CEO) xây dựng. Kế hoạch tác nghiệp: ngắn hạn (hàng tuần/tháng/dưới 1 năm), do cấp cơ sở/trưởng bộ phận thực hiện.",
    points: 20,
    timeLimit: 30,
    hint: "Tập trung vào 2 tiêu chí: Thời hạn (dài hạn vs ngắn hạn) và Thẩm quyền ban hành (cấp cao vs cấp cơ sở).",
    isTieBreaker: false
  },
  {
    type: "MC_SINGLE",
    content: "Một doanh nghiệp có chi phí cố định (FC) = 200 triệu đồng/tháng. Giá bán một sản phẩm P = 50.000 đồng, chi phí biến đổi trên mỗi sản phẩm VC = 30.000 đồng. Sản lượng hòa vốn (BEP) của doanh nghiệp là bao nhiêu?",
    points: 20,
    timeLimit: 20,
    options: [
      { id: "A", text: "10.000 sản phẩm", isCorrect: true },
      { id: "B", text: "6.667 sản phẩm", isCorrect: false },
      { id: "C", text: "4.000 sản phẩm", isCorrect: false },
      { id: "D", text: "15.000 sản phẩm", isCorrect: false }
    ],
    hint: "Q_hòa vốn = FC / (P - VC) = 200.000.000 / (50.000 - 30.000) = 10.000 sản phẩm.",
    isTieBreaker: false
  },
  {
    type: "TRUE_FALSE",
    content: "Phương pháp chuyên gia Delphi trong dự báo lập kế hoạch cho phép các chuyên gia tranh luận trực tiếp mặt đối mặt để đạt được đồng thuận nhanh nhất.",
    points: 20,
    timeLimit: 20,
    options: [
      { id: "A", text: "Đúng", isCorrect: false },
      { id: "B", text: "Sai", isCorrect: true }
    ],
    hint: "Phương pháp Delphi giữ ẩn danh hoàn toàn giữa các chuyên gia qua các vòng gửi phiếu khảo sát để tránh hiệu ứng tâm lý bầy đàn.",
    isTieBreaker: false
  },
  {
    type: "MC_SINGLE",
    content: "Theo mô hình 5 lực lượng cạnh tranh của Michael Porter, rào cản gia nhập ngành CAO sẽ dẫn đến hệ quả nào đối với các doanh nghiệp hiện tại trong ngành?",
    points: 20,
    timeLimit: 20,
    options: [
      { id: "A", text: "Giảm áp lực cạnh tranh từ các đối thủ tiềm năng mới", isCorrect: true },
      { id: "B", text: "Tăng quyền lực thương lượng của khách hàng", isCorrect: false },
      { id: "C", text: "Làm tăng nguy cơ xuất hiện sản phẩm thay thế", isCorrect: false },
      { id: "D", text: "Làm giảm tỷ suất lợi nhuận trung bình toàn ngành", isCorrect: false }
    ],
    hint: "Rào cản cao ngăn các đối thủ tiềm tàng mới bước vào thị trường, bảo vệ thị phần doanh nghiệp hiện tại.",
    isTieBreaker: false
  },

  // 30 ĐIỂM (4 câu: 28.9%)
  {
    type: "MC_MULTI",
    content: "Trong các phát biểu dưới đây về kỹ thuật phân tích ma trận SWOT kết hợp, những cặp chiến lược nào được xác định CHÍNH XÁC?",
    points: 30,
    timeLimit: 30,
    options: [
      { id: "A", text: "Chiến lược S-O: Tận dụng thế mạnh nội bộ để nắm bắt cơ hội bên ngoài", isCorrect: true },
      { id: "B", text: "Chiến lược W-O: Khắc phục điểm yếu nội bộ bằng cách tận dụng cơ hội bên ngoài", isCorrect: true },
      { id: "C", text: "Chiến lược S-T: Sử dụng thế mạnh nội bộ để phòng ngừa và hạn chế các mối đe dọa bên ngoài", isCorrect: true },
      { id: "D", text: "Chiến lược W-T: Tối đa hóa chi phí đầu tư để biến điểm yếu thành cơ hội đột phá", isCorrect: false }
    ],
    hint: "Chiến lược W-T là chiến lược phòng thủ tối thiểu hóa điểm yếu và né tránh nguy cơ de dọa.",
    isTieBreaker: false
  },
  {
    type: "ESSAY",
    content: "Tại sao trong môi trường kinh doanh biến động mạnh (VUCA), kế hoạch dạng cuốn chiếu (Rolling Plan / Rolling Forecast) lại ưu việt hơn kế hoạch cố định hàng năm (Fixed Annual Plan)?",
    answer: "Kế hoạch cuốn chiếu liên tục cập nhật khung thời gian (ví dụ 12-18 tháng tới) theo từng quý/tháng, cho phép doanh nghiệp điều chỉnh linh hoạt nguồn lực và giả định theo biến động thực tế thay vì bị trói buộc vào chỉ tiêu cứng nhắc đã lỗi thời.",
    points: 30,
    timeLimit: 40,
    hint: "Nhấn mạnh tính linh hoạt, khả năng cập nhật giả định liên tục và phản ứng kịp thời với rủi ro thị trường.",
    isTieBreaker: false
  },
  {
    type: "MATCHING",
    content: "Hãy ghép đúng từng công cụ hoạch định chiến lược với mục đích ứng dụng chủ đạo của nó:",
    points: 30,
    timeLimit: 40,
    pairs: [
      { id: "p1", left: "Ma trận Ansoff", right: "Xác định 4 hướng tăng trưởng dựa trên Sản phẩm & Thị trường" },
      { id: "p2", left: "Ma trận GE / McKinsey", right: "Đánh giá 9 ô vị thế cạnh tranh kinh doanh và Sức hấp dẫn ngành" },
      { id: "p3", left: "Mô hình Chuỗi giá trị (Value Chain)", right: "Phân tích các hoạt động chính và hoạt động bổ trợ tạo ra giá trị" },
      { id: "p4", left: "Thẻ điểm cân bằng (BSC)", right: "Cụ thể hóa chiến lược thành 4 khía cạnh đo lường định lượng" }
    ],
    options: [
      { id: "A", text: "1-A, 2-B, 3-C, 4-D", isCorrect: true },
      { id: "B", text: "1-B, 2-A, 3-D, 4-C", isCorrect: false },
      { id: "C", text: "1-C, 2-D, 3-A, 4-B", isCorrect: false },
      { id: "D", text: "1-D, 2-C, 3-B, 4-A", isCorrect: false }
    ],
    hint: "Mỗi ma trận và khung lý thuyết phục vụ một góc nhìn phân tích chiến lược riêng biệt.",
    isTieBreaker: false
  },
  {
    type: "DRAG_DROP",
    content: "Hãy sắp xếp đúng trình tự các bước thực hiện kỹ thuật Dự báo theo phương pháp San bằng hàm mũ bậc nhất:",
    points: 30,
    timeLimit: 35,
    options: [
      { id: "STEP_1", text: "Thu thập chuỗi số liệu thực tế của các kỳ quá khứ", isCorrect: true },
      { id: "STEP_2", text: "Lựa chọn giá trị dự báo khởi đầu (F1) cho kỳ phân tích đầu tiên", isCorrect: true },
      { id: "STEP_3", text: "Xác định hệ số san bằng alpha tối ưu trong khoảng (0, 1)", isCorrect: true },
      { id: "STEP_4", text: "Áp dụng công thức F(t+1) = F(t) + alpha * [A(t) - F(t)]", isCorrect: true },
      { id: "STEP_5", text: "Đo lường sai số dự báo (MAD, MSE) và hiệu chỉnh tham số", isCorrect: true }
    ],
    hint: "Số liệu lịch sử -> Giá trị ban đầu -> Chọn alpha -> Tính dự báo -> Đo sai số.",
    isTieBreaker: false
  },

  // 40 ĐIỂM (2 câu: 13.3%)
  {
    type: "MATCHING",
    content: "Hãy ghép đúng các chỉ số thẩm định hiệu quả tài chính của dự án đầu tư trong kế hoạch dài hạn với tiêu chuẩn chấp thuận tương ứng:",
    points: 40,
    timeLimit: 60,
    pairs: [
      { id: "p1", left: "Giá trị hiện giá thuần (NPV)", right: "Chấp thuận khi NPV > 0 (tăng thêm giá trị cho chủ sở hữu)" },
      { id: "p2", left: "Tỷ suất sinh lời nội bộ (IRR)", right: "Chấp thuận khi IRR > Chi phí vốn sử dụng (WACC / r)" },
      { id: "p3", left: "Chỉ số khả năng sinh lời (PI)", right: "Chấp thuận khi PI = Tổng PV dòng thu / Vốn đầu tư > 1" },
      { id: "p4", left: "Thời gian hoàn vốn có chiết khấu (DPP)", right: "Chấp thuận khi DPP nhỏ hơn thời hạn hoàn vốn yêu cầu" }
    ],
    options: [
      { id: "A", text: "1-A, 2-B, 3-C, 4-D", isCorrect: true },
      { id: "B", text: "1-C, 2-D, 3-A, 4-B", isCorrect: false },
      { id: "C", text: "1-B, 2-A, 3-D, 4-C", isCorrect: false },
      { id: "D", text: "1-D, 2-C, 3-B, 4-A", isCorrect: false }
    ],
    hint: "NPV > 0, IRR > r, PI > 1 là bộ 3 quy tắc quyết định đầu tư kinh điển.",
    isTieBreaker: false
  },
  {
    type: "DRAG_DROP",
    content: "Hãy sắp xếp đúng thứ tự các giai đoạn của quy trình Quản trị Rủi ro trong lập kế hoạch chiến lược theo chuẩn ISO 31000:",
    points: 40,
    timeLimit: 60,
    options: [
      { id: "STEP_1", text: "Thiết lập bối cảnh nội bộ và bên ngoài của tổ chức", isCorrect: true },
      { id: "STEP_2", text: "Nhận diện các nguy cơ và rủi ro tiềm tàng (Risk Identification)", isCorrect: true },
      { id: "STEP_3", text: "Phân tích xác suất và mức độ tác động của rủi ro (Risk Analysis)", isCorrect: true },
      { id: "STEP_4", text: "Đánh giá và xếp hạng ưu tiên các rủi ro (Risk Evaluation)", isCorrect: true },
      { id: "STEP_5", text: "Lập kế hoạch ứng phó: Né tránh, Giảm thiểu, Chuyển giao hoặc Chấp nhận", isCorrect: true }
    ],
    hint: "Bối cảnh -> Nhận diện -> Phân tích -> Đánh giá xếp hạng -> Kế hoạch ứng phó.",
    isTieBreaker: false
  }
];


// ─── 2. TOKT1138: KHOA HỌC DỮ LIỆU (18 câu bổ sung) ─────────────────────────
const newToktQuestions = [
  // 10 ĐIỂM (6 câu: 22.2%)
  {
    type: "MC_SINGLE",
    content: "Trong quy trình chuẩn CRISP-DM của khoa học dữ liệu, bước đầu tiên mang tính quyết định định hình bài toán là gì?",
    points: 10,
    timeLimit: 15,
    options: [
      { id: "A", text: "Hiểu bài toán kinh doanh (Business Understanding)", isCorrect: true },
      { id: "B", text: "Thu thập và chuẩn bị dữ liệu (Data Preparation)", isCorrect: false },
      { id: "C", text: "Xây dựng mô hình học máy (Modeling)", isCorrect: false },
      { id: "D", text: "Triển khai hệ thống (Deployment)", isCorrect: false }
    ],
    hint: "Phải bắt đầu từ nhu cầu và mục tiêu kinh doanh của doanh nghiệp.",
    isTieBreaker: false
  },
  {
    type: "TRUE_FALSE",
    content: "Hồi quy tuyến tính (Linear Regression) là một thuật toán thuộc nhóm Học không giám sát (Unsupervised Learning).",
    points: 10,
    timeLimit: 15,
    options: [
      { id: "A", text: "Đúng", isCorrect: false },
      { id: "B", text: "Sai", isCorrect: true }
    ],
    hint: "Hồi quy tuyến tính là thuật toán Học có giám sát (Supervised Learning) vì cần nhãn mục tiêu y liên tục.",
    isTieBreaker: false
  },
  {
    type: "FILL_BLANK",
    content: "Thuật toán học máy kinh điển dùng để phân cụm khách hàng dựa trên khoảng cách Euclide đến K tâm cụm có tên là gì?",
    answer: "K-Means",
    points: 10,
    timeLimit: 15,
    hint: "Tên thuật toán ghép từ chữ cái K và chữ Means (trung bình).",
    isTieBreaker: false
  },
  {
    type: "MC_SINGLE",
    content: "Chỉ số nào dưới đây thường được dùng để đánh giá mức độ tương quan tuyến tính giữa hai biến định lượng liên tục?",
    points: 10,
    timeLimit: 15,
    options: [
      { id: "A", text: "Hệ số tương quan Pearson (r)", isCorrect: true },
      { id: "B", text: "Chỉ số Silhouette", isCorrect: false },
      { id: "C", text: "Hàm Entropy", isCorrect: false },
      { id: "D", text: "Chỉ số Gini Impurity", isCorrect: false }
    ],
    hint: "Hệ số Pearson dao động trong đoạn [-1, 1].",
    isTieBreaker: false
  },
  {
    type: "MC_SINGLE",
    content: "Trong thư viện Scikit-Learn của Python, hàm nào được sử dụng để chia ngẫu nhiên tập dữ liệu thành tập huấn luyện (train) và kiểm thử (test)?",
    points: 10,
    timeLimit: 15,
    options: [
      { id: "A", text: "train_test_split", isCorrect: true },
      { id: "B", text: "data_partition_split", isCorrect: false },
      { id: "C", text: "k_fold_splitter", isCorrect: false },
      { id: "D", text: "cross_validation_cut", isCorrect: false }
    ],
    hint: "Hàm train_test_split nằm trong module sklearn.model_selection.",
    isTieBreaker: false
  },
  {
    type: "TRUE_FALSE",
    content: "Đồ thị ROC biểu diễn mối quan hệ giữa Tỷ lệ dương tính thật (TPR / Recall) và Tỷ lệ dương tính giả (FPR) ở các ngưỡng phân loại khác nhau.",
    points: 10,
    timeLimit: 15,
    options: [
      { id: "A", text: "Đúng", isCorrect: true },
      { id: "B", text: "Sai", isCorrect: false }
    ],
    hint: "Trục tung là TPR (True Positive Rate) và trục hoành là FPR (False Positive Rate).",
    isTieBreaker: false
  },

  // 20 ĐIỂM (6 câu: 35.6%)
  {
    type: "MC_MULTI",
    content: "Khi dữ liệu có hiện tượng mất cân bằng mẫu nghiêm trọng (ví dụ 99% khách hàng bình thường, chỉ 1% gian lận thẻ tín dụng), những chỉ số nào dưới đây ĐÁNG TIN CẬY để đánh giá mô hình hơn chỉ số Accuracy?",
    points: 20,
    timeLimit: 20,
    options: [
      { id: "A", text: "Chỉ số F1-Score", isCorrect: true },
      { id: "B", text: "Chỉ số PR-AUC (Diện tích dưới đường Precision-Recall)", isCorrect: true },
      { id: "C", text: "Độ nhạy / Recall của lớp thiểu số gian lận", isCorrect: true },
      { id: "D", text: "Chỉ số Độ chính xác tổng thể (Overall Accuracy)", isCorrect: false }
    ],
    hint: "Accuracy bị đánh lừa bởi lớp đa số (mô hình đoán bừa tất cả không gian lận vẫn đạt 99% accuracy).",
    isTieBreaker: false
  },
  {
    type: "FILL_BLANK",
    content: "Hiện tượng mô hình học máy đạt độ chính xác cực cao trên tập huấn luyện (Train) nhưng lại có sai số rất lớn trên tập dữ liệu kiểm thử (Test) được gọi là hiện tượng gì?",
    answer: "Overfitting",
    points: 20,
    timeLimit: 20,
    hint: "Tiếng Anh là Overfitting (Quá khớp dữ liệu).",
    isTieBreaker: false
  },
  {
    type: "ESSAY",
    content: "Hãy giải thích sự khác biệt giữa hai chỉ số đánh giá phân loại: Precision (Độ chuẩn xác) và Recall (Độ thu hồi / Độ nhạy). Trong bài toán chẩn đoán gian lận tín dụng ngân hàng, chỉ số nào thường được ưu tiên tối đa và vì sao?",
    answer: "Precision = TP/(TP+FP): trong số các mẫu đoán gian lận, bao nhiêu % là gian lận thật. Recall = TP/(TP+FN): trong tổng số các vụ gian lận thực tế, mô hình phát hiện được bao nhiêu %. Trong gian lận ngân hàng, Recall được ưu tiên tối đa để không bỏ lọt bất kỳ kẻ gian lận nào (tránh thiệt hại tài chính lớn).",
    points: 20,
    timeLimit: 30,
    hint: "Precision phản ánh độ chính xác của dự đoán dương; Recall phản ánh khả năng bắt trọn không bỏ sót.",
    isTieBreaker: false
  },
  {
    type: "MC_SINGLE",
    content: "Kỹ thuật mã hóa biến định danh danh mục (Categorical) không có thứ bậc (như Quốc gia, Ngành nghề) thành các cột nhị phân 0/1 được gọi là gì?",
    points: 20,
    timeLimit: 20,
    options: [
      { id: "A", text: "One-Hot Encoding", isCorrect: true },
      { id: "B", text: "Ordinal Encoding", isCorrect: false },
      { id: "C", text: "MinMax Scaling", isCorrect: false },
      { id: "D", text: "Z-score Standardization", isCorrect: false }
    ],
    hint: "Mỗi danh mục trở thành một cột nhị phân riêng có giá trị 1 hoặc 0.",
    isTieBreaker: false
  },
  {
    type: "TRUE_FALSE",
    content: "Trong kỹ thuật kiểm định chéo K-Fold Cross Validation (với K=5), dữ liệu được chia làm 5 phần bằng nhau, mô hình sẽ được huấn luyện và đánh giá lặp lại đúng 5 lần.",
    points: 20,
    timeLimit: 20,
    options: [
      { id: "A", text: "Đúng", isCorrect: true },
      { id: "B", text: "Sai", isCorrect: false }
    ],
    hint: "Mỗi lần lấy 4 phần làm train và 1 phần làm test, sau đó tính trung bình kết quả 5 lần.",
    isTieBreaker: false
  },
  {
    type: "MC_SINGLE",
    content: "Chỉ số VIF (Variance Inflation Factor) vượt quá ngưỡng nào thường là dấu hiệu cảnh báo hiện tượng đa cộng tuyến nghiêm trọng trong mô hình hồi quy OLS?",
    points: 20,
    timeLimit: 20,
    options: [
      { id: "A", text: "VIF > 10", isCorrect: true },
      { id: "B", text: "VIF > 1", isCorrect: false },
      { id: "C", text: "VIF > 2", isCorrect: false },
      { id: "D", text: "VIF > 0.05", isCorrect: false }
    ],
    hint: "Ngưỡng phổ biến trong kinh tế lượng là VIF > 5 hoặc VIF > 10.",
    isTieBreaker: false
  },

  // 30 ĐIỂM (4 câu: 28.9%)
  {
    type: "MC_MULTI",
    content: "Trong các phát biểu dưới đây về thuật toán Cây quyết định (Decision Tree), những phát biểu nào là ĐÚNG?",
    points: 30,
    timeLimit: 30,
    options: [
      { id: "A", text: "Chỉ số Gini Impurity và Entropy thường được dùng để chọn điểm phân nhánh tối ưu", isCorrect: true },
      { id: "B", text: "Cắt tỉa cây (Pruning) là phương pháp hữu hiệu để kiểm soát và giảm bớt hiện tượng Overfitting", isCorrect: true },
      { id: "C", text: "Cây quyết định rất nhạy cảm với dữ liệu nhiễu và có phương sai (Variance) cao", isCorrect: true },
      { id: "D", text: "Cây quyết định bắt buộc phải chuẩn hóa dữ liệu (Standardization) trước khi huấn luyện", isCorrect: false }
    ],
    hint: "Cây quyết định hoạt động dựa trên các ngưỡng giá trị (if-else) nên không bị ảnh hưởng bởi thang đo dữ liệu.",
    isTieBreaker: false
  },
  {
    type: "ESSAY",
    content: "Hãy phân tích ngắn gọn Trade-off giữa Bias (Độ chệch) và Variance (Phương sai) trong mô hình học máy. Một mô hình quá đơn giản (Underfitting) và một mô hình quá phức tạp (Overfitting) sẽ tương ứng với mức Bias và Variance như thế nào?",
    answer: "Underfitting (quá đơn giản): High Bias (độ chệch cao, không nắm bắt được xu hướng dữ liệu) và Low Variance. Overfitting (quá phức tạp): Low Bias nhưng High Variance (nhạy cảm quá mức với dữ liệu huấn luyện, kém khả năng tổng quát hóa).",
    points: 30,
    timeLimit: 40,
    hint: "Nêu rõ cặp Bias-Variance cho cả Underfitting và Overfitting.",
    isTieBreaker: false
  },
  {
    type: "MATCHING",
    content: "Hãy ghép đúng từng giải thuật học máy với họ thuật toán tương ứng:",
    points: 30,
    timeLimit: 40,
    pairs: [
      { id: "p1", left: "Logistic Regression", right: "Học có giám sát: Bài toán Phân loại (Classification)" },
      { id: "p2", left: "K-Means", right: "Học không giám sát: Phân cụm dữ liệu (Clustering)" },
      { id: "p3", left: "PCA (Principal Component Analysis)", right: "Học không giám sát: Rút gọn số chiều dữ liệu (Dimensionality Reduction)" },
      { id: "p4", left: "Random Forest", right: "Kỹ thuật học kết hợp Bagging Ensemble đa cây quyết định" }
    ],
    options: [
      { id: "A", text: "1-A, 2-B, 3-C, 4-D", isCorrect: true },
      { id: "B", text: "1-B, 2-A, 3-D, 4-C", isCorrect: false },
      { id: "C", text: "1-C, 2-D, 3-A, 4-B", isCorrect: false },
      { id: "D", text: "1-D, 2-C, 3-B, 4-A", isCorrect: false }
    ],
    hint: "Phân biệt rõ bài toán có giám sát, không giám sát và kỹ thuật học kết hợp Ensemble.",
    isTieBreaker: false
  },
  {
    type: "DRAG_DROP",
    content: "Hãy sắp xếp đúng thứ tự các bước trong quy trình Xây dựng và Triển khai mô hình Học máy Machine Learning tiêu chuẩn:",
    points: 30,
    timeLimit: 35,
    options: [
      { id: "STEP_1", text: "Khám phá và Tiền xử lý làm sạch dữ liệu (EDA & Data Cleaning)", isCorrect: true },
      { id: "STEP_2", text: "Kỹ thuật tạo đặc trưng và Chuẩn hóa biến (Feature Engineering & Scaling)", isCorrect: true },
      { id: "STEP_3", text: "Chia tập dữ liệu Train / Validation / Test", isCorrect: true },
      { id: "STEP_4", text: "Huấn luyện mô hình và Tinh chỉnh siêu tham số (Model Training & Hyperparameter Tuning)", isCorrect: true },
      { id: "STEP_5", text: "Đánh giá hiệu năng mô hình trên tập Test độc lập và Đóng gói triển khai (Evaluation & Deployment)", isCorrect: true }
    ],
    hint: "EDA -> Feature Engineering -> Split -> Training/Tuning -> Test Evaluation/Deploy.",
    isTieBreaker: false
  },

  // 40 ĐIỂM (2 câu: 13.3%)
  {
    type: "MATCHING",
    content: "Hãy ghép đúng các ma trận nhầm lẫn (Confusion Matrix) với công thức tính chỉ số đánh giá tương ứng:",
    points: 40,
    timeLimit: 60,
    pairs: [
      { id: "p1", left: "Precision (Độ chuẩn xác)", right: "TP / (TP + FP)" },
      { id: "p2", left: "Recall / Sensitivity (Độ thu hồi)", right: "TP / (TP + FN)" },
      { id: "p3", left: "Specificity (Độ đặc hiệu)", right: "TN / (TN + FP)" },
      { id: "p4", left: "F1-Score", right: "2 * (Precision * Recall) / (Precision + Recall)" }
    ],
    options: [
      { id: "A", text: "1-A, 2-B, 3-C, 4-D", isCorrect: true },
      { id: "B", text: "1-C, 2-D, 3-A, 4-B", isCorrect: false },
      { id: "C", text: "1-B, 2-A, 3-D, 4-C", isCorrect: false },
      { id: "D", text: "1-D, 2-C, 3-B, 4-A", isCorrect: false }
    ],
    hint: "Bộ công thức kinh điển đánh giá bài toán phân loại nhị phân trong khoa học dữ liệu.",
    isTieBreaker: false
  },
  {
    type: "DRAG_DROP",
    content: "Hãy sắp xếp đúng thứ tự các bước toán học trong thuật toán Phân tích thành phần chính (PCA) để giảm chiều dữ liệu:",
    points: 40,
    timeLimit: 60,
    options: [
      { id: "STEP_1", text: "Chuẩn hóa dữ liệu về trung bình bằng 0 (Mean centering / Standardization)", isCorrect: true },
      { id: "STEP_2", text: "Tính ma trận hiệp phương sai (Covariance Matrix) của các biến", isCorrect: true },
      { id: "STEP_3", text: "Tìm các trị riêng (Eigenvalues) và vectơ riêng (Eigenvectors) của ma trận hiệp phương sai", isCorrect: true },
      { id: "STEP_4", text: "Sắp xếp các vectơ riêng theo thứ tự giảm dần của trị riêng tương ứng", isCorrect: true },
      { id: "STEP_5", text: "Chiếu ma trận dữ liệu ban đầu lên K vectơ riêng hàng đầu để thu được không gian số chiều mới", isCorrect: true }
    ],
    hint: "Chuẩn hóa -> Ma trận hiệp phương sai -> Trị riêng/Vectơ riêng -> Sắp xếp -> Chiếu không gian mới.",
    isTieBreaker: false
  }
];


// ─── EXECUTION & VERIFICATION ────────────────────────────────────────────────
function processBank(fileName, newQuestions, expectedTotal = 45) {
  const filePath = path.join(__dirname, '..', 'public', 'quiz-banks', fileName);
  const curQuestions = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`\n======================================================`);
  console.log(`Processing: ${fileName}`);
  console.log(`Original count: ${curQuestions.length}`);

  // Deduplicate or append to achieve exact 45
  const combined = [...curQuestions, ...newQuestions];
  if (combined.length !== expectedTotal) {
    throw new Error(`Unexpected question count: expected ${expectedTotal}, got ${combined.length}`);
  }

  // Count points & types
  const pointsCount = {};
  const typesCount = {};
  combined.forEach((q, idx) => {
    pointsCount[q.points] = (pointsCount[q.points] || 0) + 1;
    typesCount[q.type] = (typesCount[q.type] || 0) + 1;

    // Check dummy options
    if (q.options) {
      q.options.forEach((opt, optIdx) => {
        if (opt.text.trim().length <= 1 && q.type !== 'FILL_BLANK') {
          throw new Error(`Dummy short text found at Q#${idx}: ${JSON.stringify(opt)}`);
        }
      });
      if (q.options.length > 4 && q.type !== 'DRAG_DROP') {
        throw new Error(`More than 4 options found at Q#${idx} for type ${q.type}`);
      }
    }
  });

  console.log(`Final count: ${combined.length}`);
  console.log('Points breakdown:', pointsCount);
  console.log('Percentages:');
  console.log(`  10 pts: ${pointsCount[10]} (${((pointsCount[10]/combined.length)*100).toFixed(1)}%) [target: >=20%]`);
  console.log(`  20 pts: ${pointsCount[20]} (${((pointsCount[20]/combined.length)*100).toFixed(1)}%) [target: 30-40%]`);
  console.log(`  30 pts: ${pointsCount[30]} (${((pointsCount[30]/combined.length)*100).toFixed(1)}%) [target: 25-30%]`);
  console.log(`  40 pts: ${pointsCount[40]} (${((pointsCount[40]/combined.length)*100).toFixed(1)}%) [target: 10-15%]`);
  console.log('Types breakdown:', typesCount);

  // Verify all 7 types exist
  const requiredTypes = ["MC_SINGLE", "MC_MULTI", "TRUE_FALSE", "FILL_BLANK", "ESSAY", "MATCHING", "DRAG_DROP"];
  for (const t of requiredTypes) {
    if (!typesCount[t] || typesCount[t] < 1) {
      throw new Error(`Missing question type: ${t}`);
    }
  }
  console.log('  -> All 7 question formats present and verified!');

  fs.writeFileSync(filePath, JSON.stringify(combined, null, 2), 'utf8');
  console.log(`Saved updated file: ${filePath}`);
}

processBank('QLKT1120_Lap_ke_hoach.json', newQlktQuestions, 45);
processBank('TOKT1138_Khoa_hoc_du_lieu.json', newToktQuestions, 45);

// Update index.json
const indexPath = path.join(__dirname, '..', 'public', 'quiz-banks', 'index.json');
const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
index.forEach(item => {
  if (item.code === 'QLKT1120' || item.code === 'TOKT1138') {
    item.totalQuestions = 45;
  }
});
fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
console.log('\nUpdated index.json successfully!');
