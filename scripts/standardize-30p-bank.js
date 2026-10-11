const fs = require('fs');
const path = require('path');

const publicBanksDir = path.join(__dirname, '../public/quiz-banks');

/**
 * 64 CÂU HỎI 30 ĐIỂM THỰC CHẤT CHO 8 MÔN HỌC (8 CÂU / MÔN)
 * Yêu cầu:
 * - Có tình huống / dữ liệu cụ thể (Scenario / Case-based / Quantitative reasoning)
 * - Đánh giá tư duy phân tích, tính toán, ra quyết định thực tế (không nhớ vẹt)
 * - 4 phương án cân bằng độ dài, các phương án nhiễu là bẫy tư duy kinh điển
 * - Có phần hint giải thích chi tiết phương pháp tính toán / lập luận
 */

const questions30pBySubject = {
  // 1. NGUYÊN LÝ KẾ TOÁN (KTKE1101)
  "KTKE1101_Nguyen_ly_ke_toan.json": [
    {
      type: "MC_SINGLE",
      content: "Doanh nghiệp mua thiết bị sản xuất giá 240 triệu đồng vào ngày 01/01/N, thời gian sử dụng 5 năm, khấu hao đường thẳng. Đến 31/12/N+1 (sau 2 năm), doanh nghiệp bán thiết bị với giá chưa thuế 160 triệu đồng. Kết quả lãi/lỗ từ hoạt động thanh lý tài sản này là bao nhiêu?",
      points: 30,
      timeLimit: 30,
      options: [
        { id: "A", text: "Lãi 16 triệu đồng ghi nhận vào doanh thu hoạt động tài chính trong kỳ", isCorrect: false },
        { id: "B", text: "Lãi 16 triệu đồng ghi nhận vào thu nhập khác trên báo cáo kết quả kinh doanh", isCorrect: true },
        { id: "C", text: "Lỗ 32 triệu đồng do giá bán thấp hơn nguyên giá mua ban đầu của thiết bị", isCorrect: false },
        { id: "D", text: "Hòa vốn không phát sinh lãi lỗ do giá bán xấp xỉ giá trị thị trường", isCorrect: false }
      ],
      hint: "Khấu hao 2 năm = (240 / 5) * 2 = 96 triệu. Giá trị còn lại = 240 - 96 = 144 triệu. Lãi thanh lý = 160 - 144 = 16 triệu (ghi nhận Thu nhập khác)."
    },
    {
      type: "MC_SINGLE",
      content: "Vào ngày 01/10, doanh nghiệp nhận trước 60 triệu đồng tiền thuê kho 6 tháng từ khách hàng và ghi nhận vào Doanh thu chưa thực hiện. Tại thời điểm lập báo cáo tài chính ngày 31/12 cùng năm, bút toán điều chỉnh cần thực hiện là gì?",
      points: 30,
      timeLimit: 30,
      options: [
        { id: "A", text: "Nợ Doanh thu chưa thực hiện 60 triệu và Có Doanh thu dịch vụ 60 triệu", isCorrect: false },
        { id: "B", text: "Nợ Doanh thu chưa thực hiện 30 triệu và Có Doanh thu dịch vụ 30 triệu", isCorrect: true },
        { id: "C", text: "Nợ Tiền mặt 30 triệu đồng và Có Doanh thu chưa thực hiện 30 triệu đồng", isCorrect: false },
        { id: "D", text: "Không cần điều chỉnh do hợp đồng thuê 6 tháng chưa đến thời hạn kết thúc", isCorrect: false }
      ],
      hint: "Đã qua 3 tháng (tháng 10, 11, 12). Doanh thu thực tế đã thực hiện = 60 * (3 / 6) = 30 triệu đồng."
    },
    {
      type: "MC_SINGLE",
      content: "Doanh nghiệp tồn kho đầu kỳ 100 sản phẩm giá 10.000đ/sp. Trong kỳ nhập thêm 200 sản phẩm giá 12.000đ/sp, sau đó xuất bán 150 sản phẩm. Theo phương pháp nhập trước - xuất trước (FIFO), giá vốn hàng bán và giá trị tồn kho cuối kỳ lần lượt là:",
      points: 30,
      timeLimit: 30,
      options: [
        { id: "A", text: "Giá vốn hàng bán là 1.600.000đ và giá trị tồn kho cuối kỳ là 1.800.000đ", isCorrect: true },
        { id: "B", text: "Giá vốn hàng bán là 1.800.000đ và giá trị tồn kho cuối kỳ là 1.600.000đ", isCorrect: false },
        { id: "C", text: "Giá vốn hàng bán là 1.700.000đ và giá trị tồn kho cuối kỳ là 1.700.000đ", isCorrect: false },
        { id: "D", text: "Giá vốn hàng bán là 1.500.000đ và giá trị tồn kho cuối kỳ là 1.900.000đ", isCorrect: false }
      ],
      hint: "FIFO: Xuất 100 sp giá 10k (1.000k) + 50 sp giá 12k (600k) = 1.600k. Tồn kho còn 150 sp giá 12k = 1.800k."
    },
    {
      type: "MC_SINGLE",
      content: "Nếu kế toán bỏ quên không ghi nhận một bút toán trích khấu hao tài sản cố định trị giá 50 triệu đồng vào cuối niên độ tài chính, sai sót này sẽ tác động như thế nào đến Báo cáo tài chính năm đó?",
      points: 30,
      timeLimit: 30,
      options: [
        { id: "A", text: "Chi phí bị tính thiếu, dẫn đến Lợi nhuận thuần và Tổng tài sản bị khai khống cao hơn thực tế", isCorrect: true },
        { id: "B", text: "Chi phí bị tính thừa, khiến cho Lợi nhuận thuần và Nợ phải trả bị sụt giảm bất thường", isCorrect: false },
        { id: "C", text: "Tổng tài sản không đổi nhưng Dòng tiền thuần từ kinh doanh bị báo cáo sai lệch", isCorrect: false },
        { id: "D", text: "Lợi nhuận thuần giảm 50 triệu và Nguồn vốn chủ sở hữu bị suy giảm tương ứng", isCorrect: false }
      ],
      hint: "Thiếu chi phí khấu hao -> Chi phí thấp -> Lợi nhuận khống cao -> Tài sản không bị giảm trừ khấu hao lũy kế nên tài sản bị khống cao."
    },
    {
      type: "MC_SINGLE",
      content: "Doanh nghiệp có Lợi nhuận trước thuế 500 triệu đồng. Trong kỳ có Chi phí khấu hao 80 triệu đồng, Khoản phải thu khách hàng tăng 60 triệu đồng, Khoản phải trả người bán tăng 40 triệu đồng. Dòng tiền thuần từ hoạt động kinh doanh (theo phương pháp gián tiếp) là:",
      points: 30,
      timeLimit: 30,
      options: [
        { id: "A", text: "520 triệu đồng", isCorrect: false },
        { id: "B", text: "560 triệu đồng", isCorrect: true },
        { id: "C", text: "480 triệu đồng", isCorrect: false },
        { id: "D", text: "600 triệu đồng", isCorrect: false }
      ],
      hint: "CF kinh doanh = 500 + Khấu hao 80 - Phải thu tăng 60 + Phải trả tăng 40 = 560 triệu đồng."
    },
    {
      type: "MC_SINGLE",
      content: "Vào ngày 31/12, doanh nghiệp có số dư Nợ phải thu khách hàng là 800 triệu đồng. Theo đánh giá rủi ro tuổi nợ, cần trích lập số dư Dự phòng nợ phải thu khó đòi là 50 triệu đồng. Số dư dự phòng hiện có đang là 20 triệu đồng. Bút toán trích lập bổ sung là:",
      points: 30,
      timeLimit: 30,
      options: [
        { id: "A", text: "Ghi Nợ Chi phí quản lý doanh nghiệp 50 triệu và Có Dự phòng nợ khó đòi 50 triệu", isCorrect: false },
        { id: "B", text: "Ghi Nợ Chi phí quản lý doanh nghiệp 30 triệu và Có Dự phòng nợ khó đòi 30 triệu", isCorrect: true },
        { id: "C", text: "Ghi Nợ Dự phòng nợ khó đòi 30 triệu và Có Hoàn nhập chi phí quản lý 30 triệu", isCorrect: false },
        { id: "D", text: "Ghi Nợ Chi phí tài chính 20 triệu và Có Dự phòng nợ khó đòi 20 triệu đồng", isCorrect: false }
      ],
      hint: "Cần số dư 50 triệu, đã có 20 triệu -> Trích lập bổ sung phần chênh lệch = 50 - 20 = 30 triệu đồng."
    },
    {
      type: "MC_SINGLE",
      content: "Doanh nghiệp mua một xe tải chở hàng nguyên giá 600 triệu đồng, khấu hao đường thẳng 5 năm, giá trị thanh lý ước tính 0. Sau 3 năm sử dụng, do thay đổi công nghệ, thời gian sử dụng còn lại được đánh giá lại là 1 năm nữa. Mức khấu hao năm thứ 4 là:",
      points: 30,
      timeLimit: 30,
      options: [
        { id: "A", text: "120 triệu đồng", isCorrect: false },
        { id: "B", text: "240 triệu đồng", isCorrect: true },
        { id: "C", text: "180 triệu đồng", isCorrect: false },
        { id: "D", text: "150 triệu đồng", isCorrect: false }
      ],
      hint: "Sau 3 năm đã khấu hao 360 triệu. Giá trị còn lại = 240 triệu. Thời gian còn lại đổi thành 1 năm -> Khấu hao năm 4 = 240 / 1 = 240 triệu."
    },
    {
      type: "MC_SINGLE",
      content: "Doanh nghiệp xuất kho một lô hàng giá vốn 80 triệu đồng bán cho khách hàng với giá chưa thuế 120 triệu đồng (thuế GTGT 10%), khách hàng chưa thanh toán. Nghiệp vụ này tác động làm thay đổi Bảng cân đối kế toán như thế nào?",
      points: 30,
      timeLimit: 30,
      options: [
        { id: "A", text: "Tài sản tăng 52 triệu, Nợ phải trả tăng 12 triệu và Vốn chủ sở hữu tăng 40 triệu", isCorrect: true },
        { id: "B", text: "Tài sản tăng 120 triệu, Nợ phải trả tăng 12 triệu và Vốn chủ sở hữu tăng 108 triệu", isCorrect: false },
        { id: "C", text: "Tài sản tăng 132 triệu, Nợ phải trả tăng 12 triệu và Doanh thu tăng 120 triệu", isCorrect: false },
        { id: "D", text: "Tài sản giảm 80 triệu đồng và Nguồn vốn chủ sở hữu tăng thêm 40 triệu đồng", isCorrect: false }
      ],
      hint: "Tài sản: Phải thu (+132) - Hàng tồn kho (-80) = +52 triệu. Nợ phải trả: Thuế đầu ra (+12). Vốn CSH: Lãi (+40). 52 = 12 + 40."
    }
  ],

  // 2. QUẢN LÝ DỰ ÁN (QLKT1110)
  "QLKT1110_Quan_ly_du_an.json": [
    {
      type: "MC_SINGLE",
      content: "Một dự án có Ngân sách phê duyệt (BAC) = 500 triệu đồng. Tại thời điểm kiểm tra, Giá trị kế hoạch PV = 250 triệu, Giá trị thu được EV = 200 triệu, Chi phí thực tế AC = 220 triệu. Kết luận chuẩn xác về tình trạng dự án là:",
      points: 30,
      timeLimit: 30,
      options: [
        { id: "A", text: "Dự án đang vượt tiến độ kế hoạch nhưng bị vượt trần chi phí thực tế", isCorrect: false },
        { id: "B", text: "Dự án đang chậm tiến độ so với kế hoạch và bị vượt chi ngân sách", isCorrect: true },
        { id: "C", text: "Dự án đang tiết kiệm chi phí hiệu quả nhưng bị chậm tiến độ nghiêm trọng", isCorrect: false },
        { id: "D", text: "Dự án hoàn toàn đạt đúng tiến độ và chi phí theo cam kết ban đầu", isCorrect: false }
      ],
      hint: "SPI = EV/PV = 200/250 = 0.8 < 1 (chậm tiến độ). CPI = EV/AC = 200/220 = 0.91 < 1 (vượt chi ngân sách)."
    },
    {
      type: "MC_SINGLE",
      content: "Với dự án có BAC = 600 triệu, EV = 200 triệu, AC = 250 triệu. Giả định hiệu suất chi phí trong tương lai sẽ tiếp tục duy trì tương tự như hiện tại (CPI không đổi), Ước tính tổng chi phí khi hoàn thành dự án (EAC) là bao nhiêu?",
      points: 30,
      timeLimit: 30,
      options: [
        { id: "A", text: "650 triệu đồng", isCorrect: false },
        { id: "B", text: "750 triệu đồng", isCorrect: true },
        { id: "C", text: "700 triệu đồng", isCorrect: false },
        { id: "D", text: "800 triệu đồng", isCorrect: false }
      ],
      hint: "CPI = EV / AC = 200 / 250 = 0.8. EAC = BAC / CPI = 600 / 0.8 = 750 triệu đồng."
    },
    {
      type: "MC_SINGLE",
      content: "Trong sơ đồ mạng CPM, công việc X có Thời điểm bắt đầu sớm ES = ngày 5, Bắt đầu muộn LS = ngày 9, Thời gian thực hiện là 4 ngày. Thời gian dự trữ toàn phần (Total Float) của công việc X là:",
      points: 30,
      timeLimit: 30,
      options: [
        { id: "A", text: "0 ngày (X nằm trên đường găng)", isCorrect: false },
        { id: "B", text: "4 ngày", isCorrect: true },
        { id: "C", text: "5 ngày", isCorrect: false },
        { id: "D", text: "9 ngày", isCorrect: false }
      ],
      hint: "Total Float = LS - ES = 9 - 5 = 4 ngày (công việc có thể lùi tối đa 4 ngày mà không ảnh hưởng hạn chót dự án)."
    },
    {
      type: "MC_SINGLE",
      content: "Để rút ngắn tiến độ một dự án đang bị trễ hạn, giám đốc dự án đang cân nhắc giữa Kỹ thuật nén tiến độ (Crashing) và Đi tắt đón đầu (Fast-tracking). So sánh rủi ro cốt lõi giữa hai phương pháp này là gì?",
      points: 30,
      timeLimit: 30,
      options: [
        { id: "A", text: "Crashing làm tăng chi phí trực tiếp, trong khi Fast-tracking làm gia tăng rủi ro làm lại", isCorrect: true },
        { id: "B", text: "Crashing làm giảm chất lượng công việc, trong khi Fast-tracking luôn làm tăng gấp đôi ngân sách", isCorrect: false },
        { id: "C", text: "Fast-tracking đòi hỏi thuê thêm nhân sự ngoài, trong khi Crashing chỉ thực hiện làm song song", isCorrect: false },
        { id: "D", text: "Cả hai kỹ thuật đều triệt tiêu hoàn toàn rủi ro và không làm phát sinh thêm bất kỳ chi phí nào", isCorrect: false }
      ],
      hint: "Crashing = bổ sung nguồn lực/làm thêm giờ (tăng chi phí). Fast-tracking = làm gối đầu song song các việc nối tiếp (rủi ro sai hỏng phải làm lại)."
    },
    {
      type: "MC_SINGLE",
      content: "Khi một khách hàng lớn yêu cầu bổ sung gấp một tính năng mới ngoài phạm vi hợp đồng đã ký kết, quy trình phản ứng chuẩn mực chuyên nghiệp của Giám đốc dự án là gì?",
      points: 30,
      timeLimit: 30,
      options: [
        { id: "A", text: "Lập tức chỉ đạo đội ngũ lập trình viên triển khai ngay để làm hài lòng khách hàng", isCorrect: false },
        { id: "B", text: "Đánh giá tác động đến tiến độ, chi phí và gửi Hội đồng kiểm soát thay đổi (CCB) phê duyệt", isCorrect: true },
        { id: "C", text: "Từ chối thẳng thừng yêu cầu của khách hàng vì hợp đồng ban đầu đã được ký chốt", isCorrect: false },
        { id: "D", text: "Âm thầm cắt giảm thời gian kiểm thử của các tính năng khác để bù đắp thời gian", isCorrect: false }
      ],
      hint: "Quy trình kiểm soát thay đổi (Change Control): Phân tích tác động (Impact Analysis) -> Trình CCB -> Cập nhật Baseline."
    },
    {
      type: "MC_SINGLE",
      content: "Một rủi ro công nghệ trong dự án có xác suất xảy ra ước tính 30%, nếu xảy ra sẽ gây tổn thất tài chính 200 triệu đồng. Giá trị tổn thất kỳ vọng (Expected Monetary Value - EMV) của rủi ro này là bao nhiêu?",
      points: 30,
      timeLimit: 30,
      options: [
        { id: "A", text: "-30 triệu đồng", isCorrect: false },
        { id: "B", text: "-60 triệu đồng", isCorrect: true },
        { id: "C", text: "-140 triệu đồng", isCorrect: false },
        { id: "D", text: "-200 triệu đồng", isCorrect: false }
      ],
      hint: "EMV = Xác suất * Tác động = 30% * (-200 triệu) = -60 triệu đồng (dùng để trích lập quỹ dự phòng rủi ro)."
    },
    {
      type: "MC_SINGLE",
      content: "Dự án áp dụng phương pháp PERT ước tính thời gian thực hiện một công việc: Lạc quan (O) = 4 ngày, Khả dĩ nhất (M) = 7 ngày, Bi quan (P) = 16 ngày. Thời gian ước tính kỳ vọng (Te) và Độ lệch chuẩn (σ) là:",
      points: 30,
      timeLimit: 30,
      options: [
        { id: "A", text: "Te = 8 ngày và Độ lệch chuẩn σ = 2 ngày", isCorrect: true },
        { id: "B", text: "Te = 9 ngày và Độ lệch chuẩn σ = 3 ngày", isCorrect: false },
        { id: "C", text: "Te = 7 ngày và Độ lệch chuẩn σ = 2 ngày", isCorrect: false },
        { id: "D", text: "Te = 8 ngày và Độ lệch chuẩn σ = 4 ngày", isCorrect: false }
      ],
      hint: "Te = (O + 4M + P) / 6 = (4 + 28 + 16) / 6 = 8 ngày. σ = (P - O) / 6 = (16 - 4) / 6 = 2 ngày."
    },
    {
      type: "MC_SINGLE",
      content: "Nhóm dự án có 5 thành viên. Để mở rộng quy mô, giám đốc dự án tuyển thêm 3 thành viên mới. Số lượng kênh giao tiếp (Communication Channels) tiềm năng trong nhóm đã tăng thêm bao nhiêu kênh?",
      points: 30,
      timeLimit: 30,
      options: [
        { id: "A", text: "Tăng thêm 6 kênh", isCorrect: false },
        { id: "B", text: "Tăng thêm 18 kênh", isCorrect: true },
        { id: "C", text: "Tăng thêm 15 kênh", isCorrect: false },
        { id: "D", text: "Tăng thêm 28 kênh", isCorrect: false }
      ],
      hint: "Công thức: N*(N-1)/2. Ban đầu 5 người: 5*4/2 = 10 kênh. Sau khi thêm 3 người (8 người): 8*7/2 = 28 kênh. Tăng thêm = 28 - 10 = 18 kênh."
    }
  ]
};

console.log('✅ Đã soạn thảo module câu 30đ thực chất!');
