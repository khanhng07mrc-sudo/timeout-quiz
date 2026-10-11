import fs from "fs";
import path from "path";

// Cập nhật toàn diện 8 ngân hàng đề thi:
// Mỗi đề gồm:
// - 4 câu 10đ (15s)
// - 8 câu 20đ (20s)
// - 8 câu 30đ (30s)
// - 4 câu 40đ (60s) - BÀI TOÁN TÍNH TOÁN PHỨC TẠP, ĐA SỐ LIỆU, CASE STUDY
// - 3 câu Tie-Breaker (2 câu 20đ, 1 câu 30đ)
// Đan xen đầy đủ: MC_SINGLE, MC_MULTI, TRUE_FALSE, FILL_BLANK, MATCHING, DRAG_DROP

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  type: string;
  content: string;
  points: number;
  timeLimit: number;
  options?: Option[];
  pairs?: { id: string; left: string; right: string }[];
  hint?: string;
  isTieBreaker: boolean;
}

const QUIZ_BANKS_DIR = path.resolve(process.cwd(), "public/quiz-banks");

// Dữ liệu 4 câu 40đ (60s) chất lượng cao, tính toán đa số liệu cho từng môn:

const EXTRA_40PT_QUESTIONS: Record<string, Question[]> = {
  // 1. Nguyên lý kế toán (KTKE1101)
  "KTKE1101_Nguyen_ly_ke_toan.json": [
    {
      type: "MC_SINGLE",
      content: "Công ty ABC áp dụng phương pháp kê khai thường xuyên, tính thuế GTGT khấu trừ 10%. Đầu tháng tồn kho 100 sản phẩm X giá 50.000đ/sp. Ngày 05: Nhập kho 200 sp giá mua chưa thuế 52.000đ/sp, chi phí vận chuyển bốc dỡ 1.000đ/sp. Ngày 15: Xuất bán 250 sp giá bán chưa thuế 80.000đ/sp. Theo phương pháp Bình quân gia quyền liên hoàn sau mỗi lần nhập, Giá vốn hàng bán của lô hàng xuất ngày 15 và Lợi nhuận gộp lần lượt là bao nhiêu?",
      points: 40,
      timeLimit: 60,
      options: [
        { id: "A", text: "Giá vốn 13.000.000 đồng và Lợi nhuận gộp 7.000.000 đồng", isCorrect: true },
        { id: "B", text: "Giá vốn 12.500.000 đồng và Lợi nhuận gộp 7.500.000 đồng", isCorrect: false },
        { id: "C", text: "Giá vốn 13.250.000 đồng và Lợi nhuận gộp 6.750.000 đồng", isCorrect: false },
        { id: "D", text: "Giá vốn 13.500.000 đồng và Lợi nhuận gộp 6.500.000 đồng", isCorrect: false }
      ],
      hint: "Đơn giá nhập ngày 05 = 52.000 + 1.000 = 53.000đ. Đơn giá bình quân = (100*50.000 + 200*53.000)/300 = 52.000đ. Giá vốn = 250*52.000 = 13.000.000đ. Doanh thu = 250*80.000 = 20.000.000đ. Lợi nhuận gộp = 20.000.000 - 13.000.000 = 7.000.000đ.",
      isTieBreaker: false
    },
    {
      type: "MC_SINGLE",
      content: "Doanh nghiệp mua một dây chuyền sản xuất ngày 01/01/N với giá mua chưa thuế 1.200 triệu đồng, chi phí lắp đặt chạy thử 60 triệu đồng. Thời gian sử dụng ước tính 5 năm, giá trị thanh lý ước tính thu hồi bằng 0. Doanh nghiệp áp dụng phương pháp khấu hao theo số dư giảm dần có điều chỉnh (hệ số điều chỉnh t = 2.0). Mức khấu hao năm thứ 2 của dây chuyền này là bao nhiêu?",
      points: 40,
      timeLimit: 60,
      options: [
        { id: "A", text: "302,4 triệu đồng", isCorrect: true },
        { id: "B", text: "504,0 triệu đồng", isCorrect: false },
        { id: "C", text: "252,0 triệu đồng", isCorrect: false },
        { id: "D", text: "360,0 triệu đồng", isCorrect: false }
      ],
      hint: "Nguyên giá = 1.200 + 60 = 1.260 triệu. Tỷ lệ khấu hao nhanh = (1/5)*2 = 40%/năm. Năm 1 khấu hao = 1.260 * 40% = 504 triệu. Giá trị còn lại đầu năm 2 = 1.260 - 504 = 756 triệu. Khấu hao năm 2 = 756 * 40% = 302,4 triệu đồng.",
      isTieBreaker: false
    },
    {
      type: "MATCHING",
      content: "Hãy ghép đúng từng nguyên tắc kế toán với bản chất cốt lõi của nó trong việc lập Báo cáo tài chính:",
      points: 40,
      timeLimit: 60,
      pairs: [
        { id: "p1", left: "Nguyên tắc Cơ sở dồn tích", right: "Ghi nhận nghiệp vụ khi phát sinh, không căn cứ vào thời điểm thực tế thu hoặc chi tiền" },
        { id: "p2", left: "Nguyên tắc Hoạt động liên tục", right: "Giả định doanh nghiệp hoạt động vô thời hạn, không có ý định hoặc buộc phải giải thể" },
        { id: "p3", left: "Nguyên tắc Phù hợp", right: "Ghi nhận doanh thu phải đi kèm với các chi phí tương ứng để tạo ra doanh thu đó" },
        { id: "p4", left: "Nguyên tắc Thận trọng", right: "Không lập dự phòng quá lớn, chỉ ghi nhận doanh thu khi có bằng chứng chắc chắn" }
      ],
      options: [
        { id: "A", text: "1-A, 2-B, 3-C, 4-D", isCorrect: true },
        { id: "B", text: "1-B, 2-A, 3-D, 4-C", isCorrect: false },
        { id: "C", text: "1-C, 2-D, 3-A, 4-B", isCorrect: false },
        { id: "D", text: "1-D, 2-C, 3-B, 4-A", isCorrect: false }
      ],
      hint: "Các nguyên tắc cơ bản theo Chuẩn mực Kế toán Việt Nam VAS 01.",
      isTieBreaker: false
    },
    {
      type: "DRAG_DROP",
      content: "Hãy sắp xếp đúng trình tự luân chuyển chứng từ và ghi sổ kế toán theo hình thức Nhật ký chung:",
      points: 40,
      timeLimit: 60,
      options: [
        { id: "STEP_1", text: "Lập hoặc thu nhận chứng từ kế toán gốc hợp pháp", isCorrect: true },
        { id: "STEP_2", text: "Ghi chép nghiệp vụ vào Sổ Nhật ký chung", isCorrect: true },
        { id: "STEP_3", text: "Ghi vào Sổ Cái và Sổ chi tiết các tài khoản", isCorrect: true },
        { id: "STEP_4", text: "Lập Bảng cân đối số phát sinh và Báo cáo tài chính", isCorrect: true }
      ],
      hint: "Quy trình từ chứng từ gốc -> Nhật ký chung -> Sổ Cái -> Bảng cân đối thử -> Báo cáo tài chính.",
      isTieBreaker: false
    }
  ],

  // 2. Kiểm soát quản lý (KTKI1105)
  "KTKI1105_Kiem_soat_quan_ly.json": [
    {
      type: "MC_SINGLE",
      content: "Bộ phận Kinh doanh A có Vốn đầu tư bình quân trong năm là 2.000 triệu đồng. Doanh thu thuần đạt 4.000 triệu đồng, Chi phí hoạt động là 3.600 triệu đồng. Chi phí vốn bình quân gia quyền (WACC) của tập đoàn là 10%. Thuế suất TNDN 20%. Chỉ số Giá trị kinh tế gia tăng (EVA) của Bộ phận A trong năm là bao nhiêu?",
      points: 40,
      timeLimit: 60,
      options: [
        { id: "A", text: "120 triệu đồng", isCorrect: true },
        { id: "B", text: "200 triệu đồng", isCorrect: false },
        { id: "C", text: "160 triệu đồng", isCorrect: false },
        { id: "D", text: "80 triệu đồng", isCorrect: false }
      ],
      hint: "Lợi nhuận hoạt động thuần trước thuế (NOPAT) = (4.000 - 3.600) * (1 - 0.2) = 320 triệu. Chi phí vốn = 2.000 * 10% = 200 triệu. EVA = 320 - 200 = 120 triệu đồng.",
      isTieBreaker: false
    },
    {
      type: "MC_SINGLE",
      content: "Công ty Z có biến phí đơn vị sản phẩm là 40.000đ, định phí sản xuất đơn vị là 20.000đ. Giá bán trên thị trường ngoài là 90.000đ/sp, chi phí bán hàng ngoài được tiết kiệm nếu bán nội bộ là 5.000đ/sp. Nếu bộ phận bán ĐANG HOẠT ĐỘNG HẾT CÔNG SUẤT, mức giá chuyển nhượng nội bộ tối thiểu mà bộ phận bán có thể chấp nhận để không bị thiệt thòi là bao nhiêu?",
      points: 40,
      timeLimit: 60,
      options: [
        { id: "A", text: "85.000 đồng/sản phẩm", isCorrect: true },
        { id: "B", text: "60.000 đồng/sản phẩm", isCorrect: false },
        { id: "C", text: "40.000 đồng/sản phẩm", isCorrect: false },
        { id: "D", text: "90.000 đồng/sản phẩm", isCorrect: false }
      ],
      hint: "Khi hết công suất: Giá chuyển nhượng tối thiểu = Biến phí + Chi phí cơ hội = Giá thị trường - Chi phí bán tiết kiệm = 90.000 - 5.000 = 85.000đ/sp.",
      isTieBreaker: false
    },
    {
      type: "MATCHING",
      content: "Hãy ghép đúng 4 khía cạnh của Thẻ điểm cân bằng (Balanced Scorecard - BSC) với thước đo chiến lược tương ứng:",
      points: 40,
      timeLimit: 60,
      pairs: [
        { id: "p1", left: "Khía cạnh Tài chính", right: "Tỷ suất sinh lời trên vốn đầu tư (ROI) và Giá trị kinh tế gia tăng (EVA)" },
        { id: "p2", left: "Khía cạnh Khách hàng", right: "Tỷ lệ giữ chân khách hàng và Chỉ số đo lường sự hài lòng (CSAT)" },
        { id: "p3", left: "Khía cạnh Quy trình nội bộ", right: "Thời gian chu kỳ sản xuất và Tỷ lệ sản phẩm hỏng sai lỗi" },
        { id: "p4", left: "Khía cạnh Học hỏi & Phát triển", right: "Số giờ đào tạo nhân viên và Tỷ lệ ứng dụng sáng kiến cải tiến" }
      ],
      options: [
        { id: "A", text: "1-A, 2-B, 3-C, 4-D", isCorrect: true },
        { id: "B", text: "1-B, 2-A, 3-D, 4-C", isCorrect: false },
        { id: "C", text: "1-C, 2-D, 3-A, 4-B", isCorrect: false },
        { id: "D", text: "1-D, 2-C, 3-B, 4-A", isCorrect: false }
      ],
      hint: "4 khía cạnh chuẩn theo Kaplan & Norton.",
      isTieBreaker: false
    },
    {
      type: "DRAG_DROP",
      content: "Hãy sắp xếp đúng chuỗi quan hệ nguyên nhân - kết quả (Cause-and-Effect) trong Thẻ điểm cân bằng BSC từ nền tảng đến mục tiêu cao nhất:",
      points: 40,
      timeLimit: 60,
      options: [
        { id: "STEP_1", text: "Học hỏi và phát triển năng lực đội ngũ", isCorrect: true },
        { id: "STEP_2", text: "Cải tiến hiệu quả quy trình nội bộ", isCorrect: true },
        { id: "STEP_3", text: "Gia tăng sự hài lòng và lòng trung thành của khách hàng", isCorrect: true },
        { id: "STEP_4", text: "Tối ưu hóa kết quả tài chính và lợi nhuận cổ đông", isCorrect: true }
      ],
      hint: "Học hỏi/Phát triển -> Quy trình nội bộ -> Khách hàng -> Tài chính.",
      isTieBreaker: false
    }
  ],

  // 3. Quản lý dự án (QLKT1110)
  "QLKT1110_Quan_ly_du_an.json": [
    {
      type: "MC_SINGLE",
      content: "Dự án phần mềm có Tổng ngân sách phê duyệt BAC = 1.000 triệu đồng, kế hoạch thực hiện trong 10 tháng. Tại tháng thứ 4: Giá trị theo kế hoạch PV = 400 triệu, Giá trị thu được EV = 350 triệu, Chi phí thực tế AC = 500 triệu. Hãy tính Chỉ số hiệu quả chi phí (CPI), Chỉ số hiệu quả tiến độ (SPI) và Dự toán chi phí khi hoàn thành (EAC) giả định tiến độ còn lại theo CPI hiện tại:",
      points: 40,
      timeLimit: 60,
      options: [
        { id: "A", text: "CPI = 0.70; SPI = 0.875; EAC = 1.428,6 triệu đồng", isCorrect: true },
        { id: "B", text: "CPI = 0.80; SPI = 0.750; EAC = 1.250,0 triệu đồng", isCorrect: false },
        { id: "C", text: "CPI = 0.70; SPI = 0.800; EAC = 1.500,0 triệu đồng", isCorrect: false },
        { id: "D", text: "CPI = 0.875; SPI = 0.700; EAC = 1.142,8 triệu đồng", isCorrect: false }
      ],
      hint: "CPI = EV / AC = 350 / 500 = 0.70. SPI = EV / PV = 350 / 400 = 0.875. EAC = BAC / CPI = 1.000 / 0.70 = 1.428,57 triệu đồng.",
      isTieBreaker: false
    },
    {
      type: "MC_SINGLE",
      content: "Một dự án xây dựng gồm 4 công việc tuần tự A -> B -> C -> D. Công việc C nằm trên đường găng với thời gian bình thường 10 ngày, chi phí 50 triệu. Thời gian đâm nén tối đa của C là 6 ngày với chi phí 90 triệu. Công việc B cũng nằm trên đường găng với chi phí đâm nén 12 triệu/ngày. Chi phí đâm nén biên mỗi ngày (Cost Slope) của công việc C là bao nhiêu và giữa B với C nên ưu tiên đâm nén công việc nào trước?",
      points: 40,
      timeLimit: 60,
      options: [
        { id: "A", text: "10 triệu/ngày; ưu tiên đâm nén công việc C trước", isCorrect: true },
        { id: "B", text: "10 triệu/ngày; ưu tiên đâm nén công việc B trước", isCorrect: false },
        { id: "C", text: "15 triệu/ngày; ưu tiên đâm nén công việc C trước", isCorrect: false },
        { id: "D", text: "8 triệu/ngày; ưu tiên đâm nén công việc B trước", isCorrect: false }
      ],
      hint: "Cost slope C = (90 - 50)/(10 - 6) = 40/4 = 10 triệu/ngày. Vì cost slope C (10 triệu) < cost slope B (12 triệu) nên luôn ưu tiên đâm nén C trước để tiết kiệm chi phí.",
      isTieBreaker: false
    },
    {
      type: "MATCHING",
      content: "Hãy ghép đúng 4 chiến lược ứng phó rủi ro tiêu cực (Threats) trong quản trị dự án theo chuẩn PMBOK:",
      points: 40,
      timeLimit: 60,
      pairs: [
        { id: "p1", left: "Né tránh rủi ro (Avoid)", right: "Thay đổi kế hoạch quản lý dự án để triệt tiêu hoàn toàn mối đe dọa" },
        { id: "p2", left: "Chuyển giao rủi ro (Transfer)", right: "Chuyển giao quyền sở hữu và tác động rủi ro cho bên thứ ba như mua bảo hiểm" },
        { id: "p3", left: "Giảm thiểu rủi ro (Mitigate)", right: "Thực hiện hành động sớm nhằm giảm xác suất xảy ra hoặc giảm mức độ thiệt hại" },
        { id: "p4", left: "Chấp nhận rủi ro (Accept)", right: "Ghi nhận rủi ro và không chủ động hành động trước, lập quỹ dự phòng nếu cần" }
      ],
      options: [
        { id: "A", text: "1-A, 2-B, 3-C, 4-D", isCorrect: true },
        { id: "B", text: "1-B, 2-A, 3-D, 4-C", isCorrect: false },
        { id: "C", text: "1-C, 2-D, 3-A, 4-B", isCorrect: false },
        { id: "D", text: "1-D, 2-C, 3-B, 4-A", isCorrect: false }
      ],
      hint: "4 chiến lược ứng phó mối đe dọa theo PMBOK Guide.",
      isTieBreaker: false
    },
    {
      type: "DRAG_DROP",
      content: "Hãy sắp xếp đúng thứ tự 5 nhóm quy trình quản trị dự án theo chuẩn quốc tế PMBOK:",
      points: 40,
      timeLimit: 60,
      options: [
        { id: "STEP_1", text: "Khởi tạo dự án (Initiating)", isCorrect: true },
        { id: "STEP_2", text: "Lập kế hoạch dự án (Planning)", isCorrect: true },
        { id: "STEP_3", text: "Thực thi dự án (Executing)", isCorrect: true },
        { id: "STEP_4", text: "Giám sát và kiểm soát dự án (Monitoring & Controlling)", isCorrect: true },
        { id: "STEP_5", text: "Đóng dự án (Closing)", isCorrect: true }
      ],
      hint: "Initiating -> Planning -> Executing -> Monitoring & Controlling -> Closing.",
      isTieBreaker: false
    }
  ],

  // 4. Quản lý học 1 (QLKT1101)
  "QLKT1101_Quan_ly_hoc_1.json": [
    {
      type: "MC_SINGLE",
      content: "Doanh nghiệp sản xuất kinh doanh sản phẩm A có đơn giá bán 50.000đ/sp, biến phí đơn vị là 30.000đ/sp. Tổng định phí hoạt động hàng năm của doanh nghiệp là 600 triệu đồng. Sản lượng hòa vốn và Doanh thu hòa vốn hàng năm của doanh nghiệp là bao nhiêu?",
      points: 40,
      timeLimit: 60,
      options: [
        { id: "A", text: "30.000 sản phẩm và 1.500 triệu đồng", isCorrect: true },
        { id: "B", text: "20.000 sản phẩm và 1.000 triệu đồng", isCorrect: false },
        { id: "C", text: "25.000 sản phẩm và 1.250 triệu đồng", isCorrect: false },
        { id: "D", text: "35.000 sản phẩm và 1.750 triệu đồng", isCorrect: false }
      ],
      hint: "Số dư đảm phí đơn vị = 50.000 - 30.000 = 20.000đ. Sản lượng hòa vốn = 600.000.000 / 20.000 = 30.000 sp. Doanh thu hòa vốn = 30.000 * 50.000 = 1.500 triệu đồng.",
      isTieBreaker: false
    },
    {
      type: "MC_SINGLE",
      content: "Một nhà quản trị cần lựa chọn giữa hai phương án đầu tư công nghệ trong điều kiện bất định. Phương án 1 có lợi nhuận trong 3 kịch bản thị trường (Tốt, Trung bình, Xấu) là [100, 50, -20] triệu. Phương án 2 có lợi nhuận là [80, 60, 10] triệu. Theo tiêu chuẩn Maximin (Cực đại hóa mức tối thiểu - quan điểm thận trọng bi quan của Wald), nhà quản trị sẽ chọn phương án nào và giá trị lợi nhuận đảm bảo là bao nhiêu?",
      points: 40,
      timeLimit: 60,
      options: [
        { id: "A", text: "Phương án 2 với mức lợi nhuận tối thiểu được bảo đảm là 10 triệu đồng", isCorrect: true },
        { id: "B", text: "Phương án 1 với mức lợi nhuận tối thiểu là -20 triệu đồng", isCorrect: false },
        { id: "C", text: "Phương án 1 với mức lợi nhuận cao nhất đạt 100 triệu đồng", isCorrect: false },
        { id: "D", text: "Phương án 2 với mức lợi nhuận cao nhất đạt 80 triệu đồng", isCorrect: false }
      ],
      hint: "Tiêu chuẩn Maximin tìm giá trị nhỏ nhất của mỗi phương án: PA 1 là -20, PA 2 là 10. Sau đó chọn giá trị lớn nhất trong các số nhỏ nhất: Max(-20, 10) = 10 (chọn PA 2).",
      isTieBreaker: false
    },
    {
      type: "MATCHING",
      content: "Hãy ghép đúng 4 trường phái quản trị kinh điển với luận điểm lý thuyết cốt lõi của họ:",
      points: 40,
      timeLimit: 60,
      pairs: [
        { id: "p1", left: "Quản trị khoa học (Taylor)", right: "Tối ưu hóa thao tác, định mức lao động và trả lương theo sản phẩm" },
        { id: "p2", left: "Quản trị hành chính (Fayol)", right: "14 nguyên tắc quản trị và 5 chức năng cơ bản của nhà quản trị" },
        { id: "p3", left: "Tâm lý xã hội (Mayo)", right: "Thừa nhận yếu tố con người, quan hệ nhóm phi chính thức và động viên tinh thần" },
        { id: "p4", left: "Quản trị ngẫu tình (Contingency)", right: "Không có nguyên tắc duy nhất đúng cho mọi hoàn cảnh kinh doanh" }
      ],
      options: [
        { id: "A", text: "1-A, 2-B, 3-C, 4-D", isCorrect: true },
        { id: "B", text: "1-B, 2-A, 3-D, 4-C", isCorrect: false },
        { id: "C", text: "1-C, 2-D, 3-A, 4-B", isCorrect: false },
        { id: "D", text: "1-D, 2-C, 3-B, 4-A", isCorrect: false }
      ],
      hint: "Các trường phái quản trị học căn bản.",
      isTieBreaker: false
    },
    {
      type: "DRAG_DROP",
      content: "Hãy sắp xếp đúng trình tự 5 nấc thang nhu cầu con người từ thấp đến cao theo Tháp nhu cầu Maslow:",
      points: 40,
      timeLimit: 60,
      options: [
        { id: "STEP_1", text: "Nhu cầu sinh lý (ăn, mặc, ở, nghỉ ngơi cơ bản)", isCorrect: true },
        { id: "STEP_2", text: "Nhu cầu an toàn (an toàn thân thể, việc làm, tài chính)", isCorrect: true },
        { id: "STEP_3", text: "Nhu cầu xã hội (gắn kết bạn bè, gia đình, hòa nhập tập thể)", isCorrect: true },
        { id: "STEP_4", text: "Nhu cầu được tôn trọng (địa vị, danh tiếng, công nhận thành tích)", isCorrect: true },
        { id: "STEP_5", text: "Nhu cầu tự thể hiện bản thân (phát huy tối đa tiềm năng cá nhân)", isCorrect: true }
      ],
      hint: "Sinh lý -> An toàn -> Xã hội -> Tôn trọng -> Tự khẳng định.",
      isTieBreaker: false
    }
  ],

  // 5. Lập kế hoạch (QLKT1120)
  "QLKT1120_Lap_ke_hoach.json": [
    {
      type: "MC_SINGLE",
      content: "Một doanh nghiệp dự báo nhu cầu sản phẩm cho tháng 4 bằng phương pháp San bằng mũ giản đơn với hệ số san bằng alpha = 0.3. Nhu cầu thực tế tháng 3 là 1.200 sản phẩm, dự báo tháng 3 trước đó là 1.100 sản phẩm. Dự báo nhu cầu bán hàng cho tháng 4 là bao nhiêu sản phẩm?",
      points: 40,
      timeLimit: 60,
      options: [
        { id: "A", text: "1.130 sản phẩm", isCorrect: true },
        { id: "B", text: "1.150 sản phẩm", isCorrect: false },
        { id: "C", text: "1.170 sản phẩm", isCorrect: false },
        { id: "D", text: "1.100 sản phẩm", isCorrect: false }
      ],
      hint: "F4 = F3 + alpha * (A3 - F3) = 1.100 + 0.3 * (1.200 - 1.100) = 1.100 + 30 = 1.130 sản phẩm.",
      isTieBreaker: false
    },
    {
      type: "MC_SINGLE",
      content: "Dự án đầu tư mở rộng của công ty có vốn đầu tư ban đầu 1.000 triệu đồng tại năm 0. Dòng tiền thuần hàng năm thu về trong 3 năm lần lượt là 400 triệu (năm 1), 500 triệu (năm 2), và 600 triệu (năm 3). Tỷ lệ chiết khấu chi phí vốn r = 10%. Giá trị hiện giá thuần (NPV) của dự án này xấp xỉ bằng bao nhiêu?",
      points: 40,
      timeLimit: 60,
      options: [
        { id: "A", text: "+227,6 triệu đồng", isCorrect: true },
        { id: "B", text: "+185,4 triệu đồng", isCorrect: false },
        { id: "C", text: "+310,2 triệu đồng", isCorrect: false },
        { id: "D", text: "-50,0 triệu đồng", isCorrect: false }
      ],
      hint: "PV = 400/1.1 + 500/(1.1^2) + 600/(1.1^3) = 363.64 + 413.22 + 450.79 = 1.227.65 triệu. NPV = 1.227.65 - 1.000 = +227.65 triệu đồng.",
      isTieBreaker: false
    },
    {
      type: "MATCHING",
      content: "Hãy ghép đúng 4 ô trong Ma trận phân tích danh mục đầu tư BCG với định hướng chiến lược tương ứng:",
      points: 40,
      timeLimit: 60,
      pairs: [
        { id: "p1", left: "Ô Ngôi Sao (Stars)", right: "Tăng trưởng cao, thị phần cao: Đầu tư duy trì vị thế dẫn đầu" },
        { id: "p2", left: "Ô Bò Sữa (Cash Cows)", right: "Tăng trưởng thấp, thị phần cao: Thu hoạch dòng tiền tối đa" },
        { id: "p3", left: "Ô Dấu Hỏi (Question Marks)", right: "Tăng trưởng cao, thị phần thấp: Đánh giá chọn lọc để tái đầu tư hoặc rút lui" },
        { id: "p4", left: "Ô Chó Mực (Dogs)", right: "Tăng trưởng thấp, thị phần thấp: Cân nhắc giải thể hoặc thoái vốn" }
      ],
      options: [
        { id: "A", text: "1-A, 2-B, 3-C, 4-D", isCorrect: true },
        { id: "B", text: "1-B, 2-A, 3-D, 4-C", isCorrect: false },
        { id: "C", text: "1-C, 2-D, 3-A, 4-B", isCorrect: false },
        { id: "D", text: "1-D, 2-C, 3-B, 4-A", isCorrect: false }
      ],
      hint: "Ma trận BCG cổ điển của Boston Consulting Group.",
      isTieBreaker: false
    },
    {
      type: "DRAG_DROP",
      content: "Hãy sắp xếp đúng thứ tự các bước trong quy trình lập kế hoạch kinh doanh chiến lược toàn diện:",
      points: 40,
      timeLimit: 60,
      options: [
        { id: "STEP_1", text: "Xác định Sứ mệnh, Tầm nhìn và Mục tiêu chiến lược", isCorrect: true },
        { id: "STEP_2", text: "Phân tích môi trường vĩ mô và vi mô (PESTLE & SWOT)", isCorrect: true },
        { id: "STEP_3", text: "Hình thành và lựa chọn các phương án chiến lược khả thi", isCorrect: true },
        { id: "STEP_4", text: "Xây dựng kế hoạch tác nghiệp và phân bổ nguồn lực ngân sách", isCorrect: true },
        { id: "STEP_5", text: "Triển khai thực hiện, theo dõi đo lường và điều chỉnh kế hoạch", isCorrect: true }
      ],
      hint: "Sứ mệnh -> Phân tích môi trường -> Lựa chọn chiến lược -> Kế hoạch tác nghiệp -> Đo lường kiểm soát.",
      isTieBreaker: false
    }
  ],

  // 6. Khoa học dữ liệu trong kinh tế (TOKT1138)
  "TOKT1138_Khoa_hoc_du_lieu.json": [
    {
      type: "MC_SINGLE",
      content: "Mô hình phân loại nhị phân phát hiện gian lận tín dụng được đánh giá trên tập kiểm thử 1.000 giao dịch. Ma trận nhầm lẫn (Confusion Matrix) cho kết quả: Dương tính thật (TP) = 80, Âm tính giả (FN) = 20, Dương tính giả (FP) = 40, Âm tính thật (TN) = 860. Hãy tính Độ chính xác Precision và Độ nhạy Recall của mô hình đối với lớp gian lận:",
      points: 40,
      timeLimit: 60,
      options: [
        { id: "A", text: "Precision = 66.67% và Recall = 80.00%", isCorrect: true },
        { id: "B", text: "Precision = 80.00% và Recall = 66.67%", isCorrect: false },
        { id: "C", text: "Precision = 75.00% và Recall = 80.00%", isCorrect: false },
        { id: "D", text: "Precision = 66.67% và Recall = 88.89%", isCorrect: false }
      ],
      hint: "Precision = TP / (TP + FP) = 80 / (80 + 40) = 80 / 120 = 66.67%. Recall = TP / (TP + FN) = 80 / (80 + 20) = 80 / 100 = 80.00%.",
      isTieBreaker: false
    },
    {
      type: "MC_SINGLE",
      content: "Trong một bài toán phân tích chuỗi thời gian doanh thu bán lẻ, chuỗi số liệu Y_t có phương trình tự hồi quy AR(1): Y_t = 20 + 0.6 * Y_{t-1} + e_t. Biết doanh thu quan sát được tại thời điểm t = 100 là Y_{100} = 60 triệu đồng. Dự báo điểm giá trị doanh thu tại thời điểm t = 102 (sau 2 bước) là bao nhiêu?",
      points: 40,
      timeLimit: 60,
      options: [
        { id: "A", text: "53,6 triệu đồng", isCorrect: true },
        { id: "B", text: "56,0 triệu đồng", isCorrect: false },
        { id: "C", text: "50,0 triệu đồng", isCorrect: false },
        { id: "D", text: "52,4 triệu đồng", isCorrect: false }
      ],
      hint: "Y_{101} = 20 + 0.6 * 60 = 56 triệu. Y_{102} = 20 + 0.6 * 56 = 20 + 33.6 = 53.6 triệu đồng.",
      isTieBreaker: false
    },
    {
      type: "MATCHING",
      content: "Hãy ghép đúng từng kỹ thuật Học máy phổ biến với bài toán kinh tế kinh doanh phù hợp nhất:",
      points: 40,
      timeLimit: 60,
      pairs: [
        { id: "p1", left: "Hồi quy Tuyến tính Ridge/Lasso", right: "Dự báo giá nhà đất và đánh giá độ co giãn thu nhập" },
        { id: "p2", left: "Hồi quy Logistic", right: "Dự báo xác suất khách hàng vỡ nợ tín dụng hoặc hủy gói dịch vụ" },
        { id: "p3", left: "Phân cụm K-Means", right: "Phân khúc khách hàng mục tiêu theo thói quen mua sắm" },
        { id: "p4", left: "Luật kết hợp Apriori", right: "Phân tích giỏ hàng để thiết kế gói bán chéo sản phẩm siêu thị" }
      ],
      options: [
        { id: "A", text: "1-A, 2-B, 3-C, 4-D", isCorrect: true },
        { id: "B", text: "1-B, 2-A, 3-D, 4-C", isCorrect: false },
        { id: "C", text: "1-C, 2-D, 3-A, 4-B", isCorrect: false },
        { id: "D", text: "1-D, 2-C, 3-B, 4-A", isCorrect: false }
      ],
      hint: "Các ứng dụng điển hình của Data Science trong kinh doanh.",
      isTieBreaker: false
    },
    {
      type: "DRAG_DROP",
      content: "Hãy sắp xếp đúng thứ tự các bước trong quy trình chuẩn Khoa học Dữ liệu CRISP-DM:",
      points: 40,
      timeLimit: 60,
      options: [
        { id: "STEP_1", text: "Thấu hiểu bài toán kinh doanh (Business Understanding)", isCorrect: true },
        { id: "STEP_2", text: "Khám phá và thấu hiểu dữ liệu (Data Understanding)", isCorrect: true },
        { id: "STEP_3", text: "Tiền xử lý và làm sạch dữ liệu (Data Preparation)", isCorrect: true },
        { id: "STEP_4", text: "Huấn luyện và xây dựng mô hình (Modeling)", isCorrect: true },
        { id: "STEP_5", text: "Đánh giá mô hình kinh doanh (Evaluation)", isCorrect: true },
        { id: "STEP_6", text: "Triển khai vào sản xuất (Deployment)", isCorrect: true }
      ],
      hint: "Chu trình CRISP-DM 6 giai đoạn tiêu chuẩn công nghiệp.",
      isTieBreaker: false
    }
  ],

  // 7. Kinh tế học biến đổi khí hậu (MTKH1103)
  "MTKH1103_KT_Bien_doi_khi_hau.json": [
    {
      type: "MC_SINGLE",
      content: "Hai doanh nghiệp luyện thép A và B có chi phí giảm phát thải biên: MAC_A = 20 * Q_A và MAC_B = 40 * Q_B (USD/tấn). Chính phủ đặt mục tiêu giảm tổng cộng 60 tấn phát thải CO2 bằng công cụ Thuế Carbon. Để tổng chi phí giảm phát thải của toàn xã hội đạt mức thấp nhất, mức thuế Carbon tối ưu và sản lượng cắt giảm của mỗi nhà máy là bao nhiêu?",
      points: 40,
      timeLimit: 60,
      options: [
        { id: "A", text: "Thuế t = 800 USD/tấn; Q_A = 40 tấn và Q_B = 20 tấn", isCorrect: true },
        { id: "B", text: "Thuế t = 600 USD/tấn; Q_A = 30 tấn và Q_B = 30 tấn", isCorrect: false },
        { id: "C", text: "Thuế t = 400 USD/tấn; Q_A = 20 tấn và Q_B = 40 tấn", isCorrect: false },
        { id: "D", text: "Thuế t = 1.000 USD/tấn; Q_A = 50 tấn và Q_B = 10 tấn", isCorrect: false }
      ],
      hint: "Nguyên tắc cân bằng chi phí biên: MAC_A = MAC_B = t => 20*Q_A = 40*Q_B => Q_A = 2*Q_B. Có Q_A + Q_B = 60 => 3*Q_B = 60 => Q_B = 20 tấn, Q_A = 40 tấn. Mức thuế t = 20 * 40 = 800 USD/tấn.",
      isTieBreaker: false
    },
    {
      type: "MC_SINGLE",
      content: "Giả sử một thảm họa môi trường do khí nhà kính sẽ gây thiệt hại tài chính 100 tỷ USD vào thời điểm 50 năm nữa. Nếu áp dụng tỷ lệ chiết khấu xã hội theo quan điểm của William Nordhaus là r = 4.5%/năm, giá trị hiện giá của khoản thiệt hại này là bao nhiêu so với khi áp dụng tỷ lệ chiết khấu theo Nicholas Stern là r = 1.4%/năm?",
      points: 40,
      timeLimit: 60,
      options: [
        { id: "A", text: "Khoảng 11,07 tỷ USD (Nordhaus) so với khoảng 49,88 tỷ USD (Stern)", isCorrect: true },
        { id: "B", text: "Khoảng 25,00 tỷ USD (Nordhaus) so với khoảng 70,00 tỷ USD (Stern)", isCorrect: false },
        { id: "C", text: "Khoảng 5,00 tỷ USD (Nordhaus) so với khoảng 20,00 tỷ USD (Stern)", isCorrect: false },
        { id: "D", text: "Khoảng 15,50 tỷ USD (Nordhaus) so với khoảng 35,00 tỷ USD (Stern)", isCorrect: false }
      ],
      hint: "PV_Nordhaus = 100 / (1 + 0.045)^50 = 100 / 9.0326 = 11.07 tỷ USD. PV_Stern = 100 / (1 + 0.014)^50 = 100 / 2.0048 = 49.88 tỷ USD. Tỷ lệ chiết khấu thấp nhấn mạnh trách nhiệm với thế hệ tương lai.",
      isTieBreaker: false
    },
    {
      type: "MATCHING",
      content: "Hãy ghép đúng từng công cụ kinh tế môi trường với cơ chế vận hành chính sách tương ứng:",
      points: 40,
      timeLimit: 60,
      pairs: [
        { id: "p1", left: "Thuế Carbon (Pigouvian Tax)", right: "Định giá phát thải cố định trước, để thị trường tự do quyết định khối lượng cắt giảm" },
        { id: "p2", left: "Hệ thống Cap-and-Trade (ETS)", right: "Khống chế trần tổng lượng phát thải, để thị trường đấu giá xác định giá hạn ngạch" },
        { id: "p3", left: "Cơ chế CBAM", right: "Áp phí tương đương hạn ngạch carbon đối với hàng hóa nhập khẩu có cường độ phát thải cao" },
        { id: "p4", left: "Tín chỉ Carbon bù trừ (Offset)", right: "Tài trợ các dự án trồng rừng hoặc năng lượng sạch để bù đắp lượng khí phát thải" }
      ],
      options: [
        { id: "A", text: "1-A, 2-B, 3-C, 4-D", isCorrect: true },
        { id: "B", text: "1-B, 2-A, 3-D, 4-C", isCorrect: false },
        { id: "C", text: "1-C, 2-D, 3-A, 4-B", isCorrect: false },
        { id: "D", text: "1-D, 2-C, 3-B, 4-A", isCorrect: false }
      ],
      hint: "Các công cụ chính sách kinh tế trong quản lý biến đổi khí hậu.",
      isTieBreaker: false
    },
    {
      type: "DRAG_DROP",
      content: "Hãy sắp xếp đúng thứ tự các bước trong quy trình kiểm kê và giao dịch hạn ngạch phát thải của một doanh nghiệp trong hệ thống ETS:",
      points: 40,
      timeLimit: 60,
      options: [
        { id: "STEP_1", text: "Đo đạc, tính toán và lập báo cáo kiểm kê phát thải khí nhà kính hàng năm", isCorrect: true },
        { id: "STEP_2", text: "Tổ chức kiểm định độc lập (MRV) thẩm tra tính chính xác của số liệu", isCorrect: true },
        { id: "STEP_3", text: "Tiếp nhận hạn ngạch phân bổ miễn phí hoặc mua tại phiên đấu giá của nhà nước", isCorrect: true },
        { id: "STEP_4", text: "Giao dịch mua bán phần hạn ngạch thừa/thiếu trên sàn thị trường các-bon", isCorrect: true },
        { id: "STEP_5", text: "Nộp nợ hạn ngạch tương ứng lượng phát thải thực tế cho cơ quan quản lý", isCorrect: true }
      ],
      hint: "Kiểm kê -> Thẩm tra MRV -> Phân bổ -> Giao dịch bù trừ -> Quyết toán hạn ngạch.",
      isTieBreaker: false
    }
  ],

  // 8. Kinh tế đô thị (MTDT1115)
  "MTDT1115_Kinh_te_do_thi.json": [
    {
      type: "MC_SINGLE",
      content: "Theo mô hình địa tô đơn tâm monocentric của Alonso, chi phí đi lại hàng năm là t = 50.000 đồng/km/năm. Một hộ gia đình sử dụng diện tích đất ở q = 100 m2. Giá thuê đất tại ranh giới ngoài cùng đô thị (cách trung tâm CBD x_b = 20 km) là r(x_b) = 500.000 đồng/m2/năm. Hãy tính giá thuê đất tại trung tâm đô thị CBD (x = 0) theo điều kiện cân bằng địa tô:",
      points: 40,
      timeLimit: 60,
      options: [
        { id: "A", text: "510.000 đồng/m2/năm", isCorrect: true },
        { id: "B", text: "1.500.000 đồng/m2/năm", isCorrect: false },
        { id: "C", text: "750.000 đồng/m2/năm", isCorrect: false },
        { id: "D", text: "600.000 đồng/m2/năm", isCorrect: false }
      ],
      hint: "Độ dốc đường địa tô Alonso: dr/dx = -t/q = -50.000 / 100 = -500 đồng/m2/km. Chênh lệch địa tô từ CBD ra biên = 500 * 20 = 10.000 đồng/m2. Do đó giá thuê tại CBD: r(0) = r(20) + 10.000 = 500.000 + 10.000 = 510.000 đồng/m2/năm.",
      isTieBreaker: false
    },
    {
      type: "MC_SINGLE",
      content: "Theo Quy luật Thứ bậc - Quy mô đô thị (Zipf's Law: P_r = P_1 / r), một quốc gia có đô thị lớn nhất (thủ đô) với dân số 8.000.000 người. Theo quy luật này, tổng dân số ước tính của đô thị lớn thứ 2 và đô thị lớn thứ 4 của quốc gia đó là bao nhiêu?",
      points: 40,
      timeLimit: 60,
      options: [
        { id: "A", text: "6.000.000 người", isCorrect: true },
        { id: "B", text: "4.000.000 người", isCorrect: false },
        { id: "C", text: "5.500.000 người", isCorrect: false },
        { id: "D", text: "7.000.000 người", isCorrect: false }
      ],
      hint: "P_2 = 8.000.000 / 2 = 4.000.000 người. P_4 = 8.000.000 / 4 = 2.000.000 người. Tổng P_2 + P_4 = 4.000.000 + 2.000.000 = 6.000.000 người.",
      isTieBreaker: false
    },
    {
      type: "MATCHING",
      content: "Hãy ghép đúng từng mô hình cấu trúc không gian đô thị kinh điển với tác giả sáng lập:",
      points: 40,
      timeLimit: 60,
      pairs: [
        { id: "p1", left: "Mô hình Đồng tâm (Concentric Zone Model)", right: "Ernest Burgess (1925) - Đô thị mở rộng thành các vành đai đồng tâm từ CBD" },
        { id: "p2", left: "Mô hình Hình rẻ quạt (Sector Model)", right: "Homer Hoyt (1939) - Các khu chức năng phát triển dọc theo hành lang giao thông" },
        { id: "p3", left: "Mô hình Đa nhân (Multiple Nuclei Model)", right: "Harris & Ullman (1945) - Đô thị phát triển quanh nhiều trung tâm vệ tinh" },
        { id: "p4", left: "Mô hình Địa tô vị trí (Bid-Rent Model)", right: "William Alonso (1964) - Cân bằng giữa giá đất và chi phí di chuyển" }
      ],
      options: [
        { id: "A", text: "1-A, 2-B, 3-C, 4-D", isCorrect: true },
        { id: "B", text: "1-B, 2-A, 3-D, 4-C", isCorrect: false },
        { id: "C", text: "1-C, 2-D, 3-A, 4-B", isCorrect: false },
        { id: "D", text: "1-D, 2-C, 3-B, 4-A", isCorrect: false }
      ],
      hint: "Các mô hình hình thái học đô thị kinh điển của trường phái Chicago và Kinh tế đô thị.",
      isTieBreaker: false
    },
    {
      type: "DRAG_DROP",
      content: "Hãy sắp xếp đúng thứ tự các bước trong quy trình đầu tư và phát triển Đô thị theo định hướng giao thông công cộng (TOD):",
      points: 40,
      timeLimit: 60,
      options: [
        { id: "STEP_1", text: "Quy hoạch hành lang đường sắt đô thị (Metro) hoặc BRT", isCorrect: true },
        { id: "STEP_2", text: "Khoanh vùng phát triển TOD bán kính 500m - 800m quanh nhà ga", isCorrect: true },
        { id: "STEP_3", text: "Tăng hệ số sử dụng đất (FAR) và cho phép hỗn hợp đa chức năng", isCorrect: true },
        { id: "STEP_4", text: "Đấu giá quỹ đất và áp dụng chính sách Thu hồi giá trị gia tăng từ đất (LVC)", isCorrect: true },
        { id: "STEP_5", text: "Hoàn thiện hạ tầng đi bộ, xe đạp kết nối giao thông chặng cuối", isCorrect: true }
      ],
      hint: "Quy hoạch Metro -> Khoanh vùng TOD -> Tăng FAR -> Thu hồi giá trị gia tăng -> Kết nối chặng cuối.",
      isTieBreaker: false
    }
  ]
};

async function run() {
  const files = fs.readdirSync(QUIZ_BANKS_DIR).filter((f) => f.endsWith(".json") && f !== "index.json");

  for (const file of files) {
    const filePath = path.join(QUIZ_BANKS_DIR, file);
    const raw = fs.readFileSync(filePath, "utf8");
    const currentQuestions: Question[] = JSON.parse(raw);

    // 1. Tách các câu hiện tại:
    // - 4 câu 10đ đầu (index 0..3)
    const q10 = currentQuestions.filter((q) => q.points === 10 && !q.isTieBreaker);
    // - 12 câu 20đ cũ (index 4..15): lấy 8 câu đầu làm 20đ chuẩn
    const q20All = currentQuestions.filter((q) => q.points === 20 && !q.isTieBreaker);
    const q20 = q20All.slice(0, 8);
    // - 8 câu 30đ chuẩn (index 16..23)
    const q30 = currentQuestions.filter((q) => q.points === 30 && !q.isTieBreaker).slice(0, 8);
    // - 3 câu Tie-Breaker
    const tb = currentQuestions.filter((q) => q.isTieBreaker);

    // - 4 câu 40đ mới từ bộ EXTRA_40PT_QUESTIONS
    const q40 = EXTRA_40PT_QUESTIONS[file] || [];

    // Tổng hợp 27 câu chuẩn mực
    const updatedList = [
      ...q10.slice(0, 4),
      ...q20.slice(0, 8),
      ...q30.slice(0, 8),
      ...q40.slice(0, 4),
      ...tb.slice(0, 3)
    ];

    fs.writeFileSync(filePath, JSON.stringify(updatedList, null, 2), "utf8");
    console.log(`✅ Cập nhật thành công ${file}: Total=${updatedList.length} (4x10đ, 8x20đ, 8x30đ, 4x40đ + 3 TB)`);
  }
}

run();
