const fs = require('fs');
const path = require('path');
const publicBanksDir = path.join(__dirname, '../public/quiz-banks');

// 1. NGUYÊN LÝ KẾ TOÁN (KTKE1101)
const ktkeQuestions = [
  // --- 4 CÂU 10 ĐIỂM (CƠ BẢN / NHẬN BIẾT) ---
  {
    type: "MC_SINGLE",
    content: "Phương trình kế toán cơ bản thể hiện mối quan hệ bất biến trên Bảng cân đối kế toán là:",
    points: 10,
    timeLimit: 15,
    options: [
      { id: "A", text: "Tổng Tài sản = Nợ phải trả + Vốn chủ sở hữu", isCorrect: true },
      { id: "B", text: "Tổng Tài sản = Doanh thu thuần - Chi phí hoạt động", isCorrect: false },
      { id: "C", text: "Tổng Tài sản = Vốn chủ sở hữu - Nợ phải trả ngắn hạn", isCorrect: false },
      { id: "D", text: "Tổng Tài sản = Tiền mặt tồn quỹ + Hàng tồn kho dự trữ", isCorrect: false }
    ],
    hint: "Tổng tài sản của doanh nghiệp luôn được tài trợ bởi hai nguồn: tiền nợ vay và vốn góp của chủ sở hữu."
  },
  {
    type: "TRUE_FALSE",
    content: "Theo nguyên tắc Thước đo tiền tệ, mọi nghiệp vụ kinh tế phát sinh trong doanh nghiệp đều bắt buộc phải đo lường được bằng đơn vị tiền tệ để phản ánh vào sổ sách kế toán.",
    points: 10,
    timeLimit: 15,
    options: [
      { id: "true", text: "Đúng", isCorrect: true },
      { id: "false", text: "Sai", isCorrect: false }
    ],
    hint: "Kế toán chỉ ghi nhận những sự kiện và đối tượng có thể lượng hóa thành tiền."
  },
  {
    type: "MC_SINGLE",
    content: "Trong quy ước kế toán ghi sổ kép đối với các tài khoản phản ánh Tài sản, số dư đầu kỳ và số phát sinh tăng được ghi nhận ở bên nào?",
    points: 10,
    timeLimit: 15,
    options: [
      { id: "A", text: "Ghi bên Nợ", isCorrect: true },
      { id: "B", text: "Ghi bên Có", isCorrect: false },
      { id: "C", text: "Ghi tùy thuộc vào hình thức thanh toán", isCorrect: false },
      { id: "D", text: "Không có quy ước cố định cho tài sản", isCorrect: false }
    ],
    hint: "Tài khoản Tài sản: Số dư đầu kỳ bên Nợ, tăng ghi Nợ, giảm ghi Có."
  },
  {
    type: "MC_MULTI",
    content: "Những báo cáo nào dưới đây bắt buộc phải có trong Hệ thống Báo cáo Tài chính năm theo chuẩn mực kế toán Việt Nam?",
    points: 10,
    timeLimit: 15,
    options: [
      { id: "A", text: "Bảng cân đối kế toán", isCorrect: true },
      { id: "B", text: "Báo cáo kết quả hoạt động kinh doanh", isCorrect: true },
      { id: "C", text: "Báo cáo lưu chuyển tiền tệ", isCorrect: true },
      { id: "D", text: "Bản kế hoạch kinh doanh và dự báo ngân sách năm tới", isCorrect: false }
    ],
    hint: "Hệ thống BCTC bắt buộc gồm: Bảng CĐKT, Báo cáo KQKD, Báo cáo LCTT và Thuyết minh BCTC."
  },

  // --- 12 CÂU 20 ĐIỂM (THÔNG HIỂU / PHÂN TÍCH) ---
  {
    type: "MC_SINGLE",
    content: "Theo nguyên tắc Cơ sở dồn tích, thời điểm chuẩn xác để ghi nhận doanh thu bán hàng phát sinh là:",
    points: 20,
    timeLimit: 20,
    options: [
      { id: "A", text: "Chỉ khi doanh nghiệp đã thực sự thu đủ toàn bộ tiền mặt từ người mua", isCorrect: false },
      { id: "B", text: "Khi đã chuyển giao rủi ro và quyền sở hữu hàng hóa, dịch vụ cho người mua", isCorrect: true },
      { id: "C", text: "Tại thời điểm ký kết hợp đồng mua bán kinh tế giữa hai doanh nghiệp", isCorrect: false },
      { id: "D", text: "Vào ngày cuối cùng kết thúc niên độ kế toán hoặc kỳ báo cáo tài chính", isCorrect: false }
    ],
    hint: "Doanh thu được ghi nhận khi phát sinh nghĩa vụ kinh tế và quyền sở hữu chuyển giao, bất kể đã thu tiền hay chưa."
  },
  {
    type: "MC_SINGLE",
    content: "Doanh nghiệp mua nguyên vật liệu nhập kho trị giá 50 triệu đồng, đã thanh toán một nửa bằng tiền gửi ngân hàng, phần còn lại nợ người bán. Nghiệp vụ này làm quy mô Tổng tài sản của doanh nghiệp thay đổi như thế nào?",
    points: 20,
    timeLimit: 20,
    options: [
      { id: "A", text: "Tổng tài sản tăng thêm 50 triệu đồng", isCorrect: false },
      { id: "B", text: "Tổng tài sản tăng thêm 25 triệu đồng", isCorrect: true },
      { id: "C", text: "Tổng tài sản giữ nguyên không thay đổi", isCorrect: false },
      { id: "D", text: "Tổng tài sản giảm đi 25 triệu đồng", isCorrect: false }
    ],
    hint: "Nguyên vật liệu tăng +50tr, Tiền gửi giảm -25tr -> Tài sản ròng tăng +25tr. Nợ phải trả tăng +25tr."
  },
  {
    type: "TRUE_FALSE",
    content: "Nếu Bảng cân đối thử (Trial Balance) có Tổng số dư Nợ bằng đúng Tổng số dư Có thì chứng minh sổ sách kế toán hoàn toàn không có bất kỳ lỗi sai sót nào.",
    points: 20,
    timeLimit: 20,
    options: [
      { id: "true", text: "Đúng", isCorrect: false },
      { id: "false", text: "Sai", isCorrect: true }
    ],
    hint: "Bảng cân đối thử bằng nhau không phát hiện được lỗi bỏ sót cả bút toán, ghi sai tài khoản cùng chiều, hoặc sai sót số tiền bù trừ."
  },
  {
    type: "MC_SINGLE",
    content: "Trong điều kiện giá cả nguyên vật liệu trên thị trường có xu hướng liên tục tăng cao, phương pháp tính giá xuất kho FIFO sẽ mang lại kết quả kế toán nào?",
    points: 20,
    timeLimit: 20,
    options: [
      { id: "A", text: "Giá vốn hàng bán thấp hơn và giá trị hàng tồn kho cuối kỳ cao hơn", isCorrect: true },
      { id: "B", text: "Giá vốn hàng bán cao hơn và giá trị hàng tồn kho cuối kỳ thấp hơn", isCorrect: false },
      { id: "C", text: "Lợi nhuận gộp trong kỳ thấp hơn so với phương pháp bình quân", isCorrect: false },
      { id: "D", text: "Không làm ảnh hưởng đến giá vốn và lợi nhuận gộp của doanh nghiệp", isCorrect: false }
    ],
    hint: "FIFO xuất hàng giá cũ (rẻ) trước -> Giá vốn thấp -> Lợi nhuận cao; hàng tồn kho là lô mới (đắt) -> Tồn kho cao."
  },
  {
    type: "MC_MULTI",
    content: "Những nghiệp vụ kinh tế nào dưới đây chỉ làm thay đổi cơ cấu nội bộ của Tài sản mà hoàn toàn KHÔNG làm thay đổi quy mô Tổng tài sản?",
    points: 20,
    timeLimit: 20,
    options: [
      { id: "A", text: "Rút tiền gửi ngân hàng về nhập quỹ tiền mặt", isCorrect: true },
      { id: "B", text: "Thu hồi nợ của khách hàng bằng tiền chuyển khoản", isCorrect: true },
      { id: "C", text: "Mua nguyên vật liệu nhập kho thanh toán ngay bằng tiền mặt", isCorrect: true },
      { id: "D", text: "Vay ngắn hạn ngân hàng để thanh toán nợ cho người bán", isCorrect: false }
    ],
    hint: "Các nghiệp vụ A, B, C hoán đổi giữa các khoản mục tài sản. Nghiệp vụ D là hoán đổi nợ phải trả."
  },
  {
    type: "MC_SINGLE",
    content: "Tài khoản kế toán nào dưới đây có kết cấu ngược lại với tài khoản tài sản thông thường (tăng ghi Có, giảm ghi Nợ) nhằm điều chỉnh giảm giá trị tài sản?",
    points: 20,
    timeLimit: 20,
    options: [
      { id: "A", text: "Hao mòn tài sản cố định", isCorrect: true },
      { id: "B", text: "Chi phí trả trước ngắn hạn", isCorrect: false },
      { id: "C", text: "Phải thu của khách hàng", isCorrect: false },
      { id: "D", text: "Hàng mua đang đi trên đường", isCorrect: false }
    ],
    hint: "TK Hao mòn TSCĐ (TK 214) là tài khoản điều chỉnh giảm tài sản, số dư bên Có."
  },
  {
    type: "TRUE_FALSE",
    content: "Khoản tiền mà khách hàng ứng trước cho dịch vụ mà doanh nghiệp chưa cung cấp được phân loại là Nợ phải trả thay vì Doanh thu.",
    points: 20,
    timeLimit: 20,
    options: [
      { id: "true", text: "Đúng", isCorrect: true },
      { id: "false", text: "Sai", isCorrect: false }
    ],
    hint: "Doanh nghiệp chưa hoàn thành nghĩa vụ cung cấp dịch vụ nên có nghĩa vụ nợ phải trả (Doanh thu chưa thực hiện)."
  },
  {
    type: "MC_SINGLE",
    content: "Nguyên tắc 'Phù hợp' (Matching Principle) trong kế toán tài chính yêu cầu doanh nghiệp phải tuân thủ điều gì?",
    points: 20,
    timeLimit: 20,
    options: [
      { id: "A", text: "Ghi nhận toàn bộ chi phí sản xuất vào thời điểm thực tế xuất quỹ tiền mặt", isCorrect: false },
      { id: "B", text: "Ghi nhận chi phí cùng kỳ kế toán với doanh thu mà khoản chi phí đó tạo ra", isCorrect: true },
      { id: "C", text: "Phân bổ đều mọi chi phí vào 12 tháng trong năm tài chính bất kể doanh thu", isCorrect: false },
      { id: "D", text: "Chỉ ghi nhận chi phí vào báo cáo kết quả kinh doanh khi năm tài chính kết thúc", isCorrect: false }
    ],
    hint: "Chi phí tạo ra doanh thu kỳ nào phải được ghi nhận tương ứng trong kỳ đó để xác định đúng kết quả kinh doanh."
  },
  {
    type: "MC_SINGLE",
    content: "Khoản mục 'Lợi nhuận sau thuế chưa phân phối' trên Bảng cân đối kế toán thuộc về phần nguồn vốn nào?",
    points: 20,
    timeLimit: 20,
    options: [
      { id: "A", text: "Vốn chủ sở hữu", isCorrect: true },
      { id: "B", text: "Nợ phải trả ngắn hạn", isCorrect: false },
      { id: "C", text: "Nợ phải trả dài hạn", isCorrect: false },
      { id: "D", text: "Doanh thu tài chính tích lũy", isCorrect: false }
    ],
    hint: "Lợi nhuận sau thuế thuộc sở hữu của cổ đông/chủ sở hữu, là một bộ phận của Vốn chủ sở hữu."
  },
  {
    type: "FILL_BLANK",
    content: "Doanh nghiệp mua một xe tải vận chuyển hàng hóa có nguyên giá 600 triệu đồng, thời gian trích khấu hao 5 năm theo đường thẳng, giá trị thanh lý ước tính bằng 0. Mức trích khấu hao hàng tháng của xe tải này là bao nhiêu triệu đồng? (Điền số nguyên)",
    points: 20,
    timeLimit: 20,
    answer: "10",
    options: [],
    hint: "Khấu hao năm = 600 / 5 = 120 triệu/năm. Khấu hao tháng = 120 / 12 = 10 triệu đồng/tháng."
  },
  {
    type: "MC_SINGLE",
    content: "Nguyên tắc Thận trọng trong kế toán đòi hỏi người hành nghề kế toán phải ứng xử như thế nào?",
    points: 20,
    timeLimit: 20,
    options: [
      { id: "A", text: "Ghi nhận doanh thu trước khi chuyển giao hàng hóa để làm đẹp báo cáo", isCorrect: false },
      { id: "B", text: "Ghi nhận dự phòng tổn thất kịp thời, và chỉ ghi nhận doanh thu khi chắc chắn", isCorrect: true },
      { id: "C", text: "Đánh giá tài sản cao hơn giá trị thực tế nhằm tăng uy tín vay vốn ngân hàng", isCorrect: false },
      { id: "D", text: "Bỏ qua các rủi ro nợ xấu nếu chưa có phán quyết phá sản chính thức của tòa án", isCorrect: false }
    ],
    hint: "Thận trọng: Không ước tính quá cao tài sản và thu nhập, không ước tính quá thấp nợ phải trả và chi phí."
  },
  {
    type: "MC_MULTI",
    content: "Theo thông tư chuẩn mực kế toán, những trường hợp nào dưới đây dẫn đến việc doanh nghiệp phải thực hiện trích lập Dự phòng giảm giá hàng tồn kho?",
    points: 20,
    timeLimit: 20,
    options: [
      { id: "A", text: "Giá trị thuần có thể thực hiện được của hàng tồn kho nhỏ hơn giá gốc", isCorrect: true },
      { id: "B", text: "Hàng hóa tồn kho bị hư hỏng, lỗi thời hoặc suy giảm chất lượng", isCorrect: true },
      { id: "C", text: "Chi phí hoàn thiện và chi phí bán hàng ước tính tăng cao vượt giá bán", isCorrect: true },
      { id: "D", text: "Giá thị trường của hàng hóa tăng cao đột biến so với giá gốc nhập kho", isCorrect: false }
    ],
    hint: "Lập dự phòng khi giá trị thuần có thể thực hiện được (NRV) thấp hơn giá gốc ghi sổ."
  },

  // --- 8 CÂU 30 ĐIỂM (VẬN DỤNG CAO / TÌNH HUỐNG THỰC TẾ & TÍNH TOÁN) ---
  {
    type: "MC_SINGLE",
    content: "Doanh nghiệp mua thiết bị sản xuất giá 240 triệu đồng vào ngày 01/01/N, thời gian sử dụng 5 năm, khấu hao đường thẳng. Đến ngày 31/12/N+1 (sau đúng 2 năm sử dụng), doanh nghiệp bán thiết bị với giá chưa thuế 160 triệu đồng. Kết quả lãi/lỗ từ hoạt động thanh lý tài sản này là:",
    points: 30,
    timeLimit: 30,
    options: [
      { id: "A", text: "Lãi 16 triệu đồng ghi nhận vào thu nhập khác trên báo cáo kết quả kinh doanh", isCorrect: true },
      { id: "B", text: "Lỗ 32 triệu đồng do giá bán thấp hơn nguyên giá mua ban đầu của thiết bị", isCorrect: false },
      { id: "C", text: "Lãi 16 triệu đồng ghi nhận vào doanh thu hoạt động tài chính trong kỳ", isCorrect: false },
      { id: "D", text: "Hòa vốn không phát sinh lãi lỗ do giá bán xấp xỉ giá trị thị trường", isCorrect: false }
    ],
    hint: "Khấu hao lũy kế 2 năm = (240/5)*2 = 96 triệu. Giá trị còn lại = 240 - 96 = 144 triệu. Lãi thanh lý = 160 - 144 = 16 triệu (Thu nhập khác)."
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
    hint: "FIFO: Xuất 100 sp giá 10k (1.000k) + 50 sp giá 12k (600k) = 1.600k. Tồn cuối kỳ còn 150 sp giá 12k = 1.800k."
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
    hint: "Thiếu chi phí khấu hao -> Chi phí thấp -> Lợi nhuận khống cao; hao mòn không tăng -> Tài sản không bị giảm trừ -> Tài sản khống cao."
  },
  {
    type: "FILL_BLANK",
    content: "Doanh nghiệp có Lợi nhuận trước thuế 500 triệu đồng. Trong kỳ có Chi phí khấu hao 80 triệu đồng, Khoản phải thu khách hàng tăng 60 triệu đồng, Khoản phải trả người bán tăng 40 triệu đồng. Theo phương pháp gián tiếp, Dòng tiền thuần từ hoạt động kinh doanh là bao nhiêu triệu đồng? (Điền số nguyên)",
    points: 30,
    timeLimit: 30,
    answer: "560",
    options: [],
    hint: "Dòng tiền kinh doanh = 500 (Lợi nhuận) + 80 (Khấu hao) - 60 (Phải thu tăng) + 40 (Phải trả tăng) = 560 triệu đồng."
  },
  {
    type: "MC_MULTI",
    content: "Doanh nghiệp xuất kho lô hàng giá vốn 80 triệu đồng, bán chịu cho khách hàng với giá chưa thuế 120 triệu đồng (thuế GTGT 10%). Những ảnh hưởng nào dưới đây phản ánh đúng sự biến động trên Báo cáo tài chính?",
    points: 30,
    timeLimit: 30,
    options: [
      { id: "A", text: "Tổng tài sản ròng tăng thêm 52 triệu đồng", isCorrect: true },
      { id: "B", text: "Nợ phải trả người bán và nhà nước tăng 12 triệu đồng", isCorrect: true },
      { id: "C", text: "Vốn chủ sở hữu tăng thêm 40 triệu đồng từ lợi nhuận gộp", isCorrect: true },
      { id: "D", text: "Dòng tiền thuần trong kỳ lập tức tăng thêm 132 triệu đồng", isCorrect: false }
    ],
    hint: "Tài sản: Phải thu (+132) - Tồn kho (-80) = +52 triệu. Nợ phải trả: Thuế đầu ra (+12 triệu). Vốn CSH: Lợi nhuận (+40 triệu). Bán chịu nên chưa có dòng tiền mặt."
  },
  {
    type: "FILL_BLANK",
    content: "Vào ngày 31/12, doanh nghiệp có Nợ phải thu khách hàng 800 triệu đồng. Theo phân loại rủi ro tuổi nợ, cần số dư Dự phòng nợ phải thu khó đòi là 50 triệu đồng. Số dư dự phòng hiện có trên sổ đang là 20 triệu đồng. Số tiền chi phí dự phòng cần trích lập bổ sung là bao nhiêu triệu đồng? (Điền số nguyên)",
    points: 30,
    timeLimit: 30,
    answer: "30",
    options: [],
    hint: "Số cần trích lập bổ sung = Số dự phòng cần có (50) - Số dự phòng hiện có (20) = 30 triệu đồng."
  },
  {
    type: "MC_SINGLE",
    content: "Doanh nghiệp trả trước tiền thuê nhà 120 triệu đồng cho 12 tháng bằng chuyển khoản vào ngày 01/07. Kế toán đã ghi toàn bộ vào Chi phí hoạt động trong kỳ mà không phân bổ. Sai sót này ảnh hưởng như thế nào đến BCTC ngày 31/12 cùng năm?",
    points: 30,
    timeLimit: 30,
    options: [
      { id: "A", text: "Lợi nhuận năm bị tính thiếu 60 triệu và Tài sản bị tính thiếu 60 triệu", isCorrect: true },
      { id: "B", text: "Lợi nhuận năm bị tính thừa 60 triệu và Tài sản bị tính thừa 60 triệu", isCorrect: false },
      { id: "C", text: "Nợ phải trả bị tính thiếu 60 triệu và Doanh thu thuần bị tính thừa 60 triệu", isCorrect: false },
      { id: "D", text: "Báo cáo tài chính không bị ảnh hưởng vì toàn bộ tiền đã thực chi khỏi quỹ", isCorrect: false }
    ],
    hint: "Đúng ra chỉ ghi chi phí 6 tháng (60tr), 60tr còn lại là Chi phí trả trước (Tài sản). Ghi hết 120tr vào chi phí làm chi phí cao -> Lợi nhuận thiếu 60tr, mất 60tr tài sản."
  },
  {
    type: "MC_MULTI",
    content: "Trong phân tích khả năng thanh toán ngắn hạn, những giao dịch nào dưới đây làm gia tăng Tỷ số thanh toán hiện hành (Current Ratio = Tài sản ngắn hạn / Nợ ngắn hạn) khi tỷ số này ban đầu đang lớn hơn 1?",
    points: 30,
    timeLimit: 30,
    options: [
      { id: "A", text: "Dùng tiền mặt thanh toán bớt một khoản nợ phải trả người bán ngắn hạn", isCorrect: true },
      { id: "B", text: "Chủ sở hữu góp thêm vốn bằng tiền gửi ngân hàng", isCorrect: true },
      { id: "C", text: "Vay dài hạn ngân hàng để bổ sung vốn lưu động bằng tiền gửi", isCorrect: true },
      { id: "D", text: "Mua thêm hàng tồn kho bằng cách nợ tiền người bán ngắn hạn", isCorrect: false }
    ],
    hint: "Khi tỷ số > 1, trừ cùng 1 số ở cả tử và mẫu (trả nợ bằng tiền) làm tỷ số tăng. Tăng tử số giữ nguyên mẫu số (góp vốn, vay dài hạn) làm tỷ số tăng."
  },

  // --- 3 CÂU TIE-BREAKER (CÂU HỎI PHỤ PHÂN ĐỊNH) ---
  {
    type: "MC_SINGLE",
    content: "[CÂU HỎI PHỤ - NGUYÊN LÝ KẾ TOÁN] Phương trình kế toán cơ bản luôn được duy trì cân bằng là gì?",
    points: 20,
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
    points: 20,
    timeLimit: 20,
    isTieBreaker: true,
    options: [
      { id: "A", text: "Chỉ khi đã hoàn tất thủ tục thanh toán bằng chuyển khoản ngân hàng", isCorrect: false },
      { id: "B", text: "Khi phát sinh giao dịch kinh tế, không phụ thuộc thời điểm thu chi tiền", isCorrect: true },
      { id: "C", text: "Vào ngày đại hội đồng cổ đông họp thông qua báo cáo tài chính năm", isCorrect: false },
      { id: "D", text: "Chỉ khi kiểm toán viên độc lập ký xác nhận vào biên bản kiểm kê", isCorrect: false }
    ],
    hint: "Khác biệt căn bản giữa kế toán dồn tích và kế toán tiền mặt (Cash basis)."
  },
  {
    type: "MC_SINGLE",
    content: "[CÂU HỎI PHỤ - NGUYÊN LÝ KẾ TOÁN] Báo cáo tài chính nào phản ánh tổng hợp tình hình Tài sản, Nợ phải trả và Vốn chủ sở hữu tại một thời điểm nhất định?",
    points: 30,
    timeLimit: 30,
    isTieBreaker: true,
    options: [
      { id: "A", text: "Báo cáo kết quả hoạt động kinh doanh", isCorrect: false },
      { id: "B", text: "Bảng cân đối kế toán", isCorrect: true },
      { id: "C", text: "Báo cáo lưu chuyển tiền tệ", isCorrect: false },
      { id: "D", text: "Thuyết minh báo cáo tài chính", isCorrect: false }
    ],
    hint: "Bức ảnh chụp nhanh (snapshot) sức khỏe tài chính của doanh nghiệp tại một thời điểm."
  }
];

fs.writeFileSync(path.join(publicBanksDir, 'KTKE1101_Nguyen_ly_ke_toan.json'), JSON.stringify(ktkeQuestions, null, 2), 'utf-8');
console.log('✅ Đã nạp thành công 27 câu hỏi chuẩn mực cho KTKE1101 (4 câu 10đ, 12 câu 20đ, 8 câu 30đ thực chất + 3 TB)!');
