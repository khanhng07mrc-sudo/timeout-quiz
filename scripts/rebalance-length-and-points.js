const fs = require('fs');
const path = require('path');

const publicBanksDir = path.join(__dirname, '../public/quiz-banks');

// 1. Bản đồ điều chỉnh độ dài cho các câu hỏi bị lệch trong cả 8 file
// Rút gọn đáp án đúng về nội dung cốt lõi và làm dày các đáp án nhiễu để tương đương
const lengthAdjustments = {
  // --- NGUYÊN LÝ KẾ TOÁN (KTKE1101) ---
  "KTKE1101_Nguyen_ly_ke_toan.json": {
    2: { // Câu 2
      options: [
        { id: "A", text: "Chỉ khi doanh nghiệp đã thực sự thu đủ toàn bộ tiền mặt từ người mua", isCorrect: false },
        { id: "B", text: "Khi đã chuyển giao rủi ro và quyền sở hữu hàng hóa, dịch vụ cho người mua", isCorrect: true },
        { id: "C", text: "Tại thời điểm ký kết hợp đồng mua bán kinh tế giữa hai doanh nghiệp", isCorrect: false },
        { id: "D", text: "Vào ngày cuối cùng kết thúc niên độ kế toán hoặc kỳ báo cáo tài chính", isCorrect: false }
      ]
    },
    9: { // Câu 9
      options: [
        { id: "A", text: "Luôn định giá tài sản theo mức giá thị trường cao nhất để tối đa hóa tài sản", isCorrect: false },
        { id: "B", text: "Chỉ ghi nhận thu nhập khi chắc chắn, và lập dự phòng ngay khi có nguy cơ tổn thất", isCorrect: true },
        { id: "C", text: "Trì hoãn ghi nhận mọi khoản chi phí phát sinh cho đến khi có doanh thu bù đắp", isCorrect: false },
        { id: "D", text: "Ước tính doanh thu ở mức lạc quan nhất để thu hút thêm nhà đầu tư góp vốn", isCorrect: false }
      ]
    },
    11: { // Câu 11
      options: [
        { id: "A", text: "Tổng Tài sản = Nợ phải trả + Vốn góp ban đầu - Các khoản chi phí kinh doanh", isCorrect: false },
        { id: "B", text: "Tổng Tài sản = Nợ phải trả + Vốn góp chủ sở hữu + Doanh thu - Chi phí - Cổ tức", isCorrect: true },
        { id: "C", text: "Tổng Tài sản = Nợ ngắn hạn + Nợ dài hạn + Doanh thu thuần cả năm của đơn vị", isCorrect: false },
        { id: "D", text: "Tổng Tài sản = Vốn chủ sở hữu + Lợi nhuận gộp - Chi phí bán hàng phát sinh", isCorrect: false }
      ]
    },
    15: { // Câu 15
      options: [
        { id: "A", text: "Ghi nhận toàn bộ chi phí sản xuất vào thời điểm thực tế xuất quỹ tiền mặt", isCorrect: false },
        { id: "B", text: "Ghi nhận chi phí cùng kỳ kế toán với doanh thu mà khoản chi phí đó tạo ra", isCorrect: true },
        { id: "C", text: "Phân bổ đều mọi chi phí vào 12 tháng trong năm tài chính bất kể doanh thu", isCorrect: false },
        { id: "D", text: "Chỉ ghi nhận chi phí vào báo cáo kết quả kinh doanh khi năm tài chính kết thúc", isCorrect: false }
      ]
    },
    23: { // Câu 23
      options: [
        { id: "A", text: "Ghi nhận doanh thu trước khi chuyển giao hàng hóa để làm đẹp báo cáo", isCorrect: false },
        { id: "B", text: "Ghi nhận dự phòng tổn thất kịp thời, và chỉ ghi nhận doanh thu khi chắc chắn", isCorrect: true },
        { id: "C", text: "Đánh giá tài sản cao hơn giá trị thực tế nhằm tăng uy tín vay vốn ngân hàng", isCorrect: false },
        { id: "D", text: "Bỏ qua các rủi ro nợ xấu nếu chưa có phán quyết phá sản chính thức của tòa án", isCorrect: false }
      ]
    },
    25: { // Câu 25
      options: [
        { id: "A", text: "Nợ TK 131: 132 triệu / Có TK 511: 120 triệu và Có TK 3331: 12 triệu; bỏ qua giá vốn", isCorrect: false },
        { id: "B", text: "Giá vốn: Nợ TK 632 / Có TK 156: 80 triệu; Doanh thu: Nợ TK 131: 132 triệu / Có TK 511 & 3331", isCorrect: true },
        { id: "C", text: "Chỉ ghi nhận dòng tiền: Nợ TK 112: 132 triệu và Có TK 511: 132 triệu đồng", isCorrect: false },
        { id: "D", text: "Ghi nhận toàn bộ vào doanh thu thuần: Nợ TK 131: 80 triệu và Có TK 511: 80 triệu", isCorrect: false }
      ]
    },
    27: { // Câu 27
      options: [
        { id: "A", text: "Chỉ khi đã hoàn tất thủ tục thanh toán bằng chuyển khoản ngân hàng", isCorrect: false },
        { id: "B", text: "Khi phát sinh giao dịch kinh tế, không phụ thuộc thời điểm thu chi tiền", isCorrect: true },
        { id: "C", text: "Vào ngày đại hội đồng cổ đông họp thông qua báo cáo tài chính năm", isCorrect: false },
        { id: "D", text: "Chỉ khi kiểm toán viên độc lập ký xác nhận vào biên bản kiểm kê", isCorrect: false }
      ]
    }
  },

  // --- KINH TẾ ĐÔ THỊ (MTDT1115) ---
  "MTDT1115_Kinh_te_do_thi.json": {
    3: {
      options: [
        { id: "A", text: "Do hạ tầng cầu đường luôn quá hẹp so với quy chuẩn thiết kế kỹ thuật", isCorrect: false },
        { id: "B", text: "Do người lái xe không phải trả chi phí làm chậm trễ người tham gia giao thông", isCorrect: true },
        { id: "C", text: "Do giá xăng dầu quá rẻ nên kích thích người dân mua sắm phương tiện cá nhân", isCorrect: false },
        { id: "D", text: "Do hệ thống đèn tín hiệu giao thông vận hành thiếu đồng bộ tại các nút giao", isCorrect: false }
      ]
    },
    9: {
      options: [
        { id: "A", text: "Khi quy mô dân số đô thị đạt mức tuyệt đối do chính quyền trung ương ấn định", isCorrect: false },
        { id: "B", text: "Khi Lợi ích biên từ tính kinh tế tập tụ bằng Chi phí biên từ sự đông đúc quá tải", isCorrect: true },
        { id: "C", text: "Khi diện tích đất tự nhiên dành cho phát triển công nghiệp hoàn toàn cạn kiệt", isCorrect: false },
        { id: "D", text: "Khi tỷ lệ thất nghiệp trong toàn bộ khu vực đô thị giảm xuống mức 0% tuyệt đối", isCorrect: false }
      ]
    },
    10: {
      options: [
        { id: "A", text: "Làm giảm giá trị bất động sản tại toàn bộ các khu vực vùng lõi đô thị lịch sử", isCorrect: false },
        { id: "B", text: "Đội chi phí hạ tầng công ích và gia tăng ngoại ứng tiêu cực giao thông môi trường", isCorrect: true },
        { id: "C", text: "Triệt tiêu hoàn toàn nhu cầu sử dụng phương tiện giao thông công cộng sức chở lớn", isCorrect: false },
        { id: "D", text: "Khiến tỷ trọng lao động trong ngành nông nghiệp ven đô tăng vọt bất thường", isCorrect: false }
      ]
    },
    11: {
      options: [
        { id: "A", text: "Khí hậu ôn hòa, tài nguyên khoáng sản phong phú và quỹ đất phát triển dồi dào", isCorrect: false },
        { id: "B", text: "Chia sẻ nhà cung ứng chuyên biệt, hồ lao động tập trung và lan tỏa tri thức", isCorrect: true },
        { id: "C", text: "Chính sách ưu đãi thuế quan đặc biệt và nguồn vốn tín dụng ngân hàng giá rẻ", isCorrect: false },
        { id: "D", text: "Hệ thống cảng biển nước sâu và mạng lưới đường hàng không quốc tế dày đặc", isCorrect: false }
      ]
    },
    12: {
      options: [
        { id: "A", text: "Mức thu nhập bình quân đầu người của cư dân sinh sống tại khu vực đô thị", isCorrect: false },
        { id: "B", text: "Chi phí di chuyển đi lại trên mỗi đơn vị khoảng cách hướng tâm vào lõi CBD", isCorrect: true },
        { id: "C", text: "Tổng diện tích sàn xây dựng nhà ở của các hộ gia đình sinh sống ven đô", isCorrect: false },
        { id: "D", text: "Mức thuế sử dụng đất phi nông nghiệp do chính quyền địa phương ban hành", isCorrect: false }
      ]
    },
    14: {
      options: [
        { id: "A", text: "Sự thất bại của thị trường do dịch vụ cung cấp xăng dầu độc quyền nhóm", isCorrect: false },
        { id: "B", text: "Ngoại ứng tiêu cực do người tham gia giao thông không chi trả phí trễ giờ", isCorrect: true },
        { id: "C", text: "Hiện tượng hàng hóa công cộng thuần túy bị người dân lạm dụng quá mức", isCorrect: false },
        { id: "D", text: "Thông tin bất đối xứng giữa người quản lý giao thông và tài xế lưu thông", isCorrect: false }
      ]
    },
    15: {
      options: [
        { id: "A", text: "Đường mới thường có chất lượng thi công kém nên nhanh chóng xuống cấp hư hỏng", isCorrect: false },
        { id: "B", text: "Đường mở rộng kích thích nhu cầu cảm ứng, thu hút lưu lượng xe mới lấp đầy", isCorrect: true },
        { id: "C", text: "Chi phí thu phí cầu đường quá cao khiến tài xế chuyển sang đi đường vòng", isCorrect: false },
        { id: "D", text: "Tốc độ di chuyển cho phép bị giới hạn quá nghiêm ngặt bởi biển báo giao thông", isCorrect: false }
      ]
    },
    16: {
      options: [
        { id: "A", text: "Cấm hoàn toàn các phương tiện cá nhân đi vào khu vực trung tâm vào giờ cao điểm", isCorrect: false },
        { id: "B", text: "Buộc người điều khiển xe cá nhân phải nội hóa chi phí ngoại ứng làm chậm trễ", isCorrect: true },
        { id: "C", text: "Tạo nguồn thu ngân sách dồi dào để tài trợ cho các dự án bất động sản thương mại", isCorrect: false },
        { id: "D", text: "Buộc các hãng xe ô tô phải hạ giá thành sản phẩm nhằm hỗ trợ người tiêu dùng", isCorrect: false }
      ]
    },
    18: {
      options: [
        { id: "A", text: "Khu vực trung tâm đô thị ngày càng tập trung các tòa nhà chọc trời mật độ cao", isCorrect: false },
        { id: "B", text: "Đô thị dàn trải mật độ thấp ra vùng ven, gây phân mảnh đất và phụ thuộc xe hơi", isCorrect: true },
        { id: "C", text: "Dân cư ồ ạt rời bỏ vùng ven để chuyển vào sinh sống trong các căn hộ chung cư", isCorrect: false },
        { id: "D", text: "Tất cả các khu công nghiệp chuyển dịch ra khỏi phạm vi ranh giới hành chính", isCorrect: false }
      ]
    },
    19: {
      options: [
        { id: "A", text: "Ấn định mức giá bán bất động sản sàn tối đa để hỗ trợ người thu nhập thấp", isCorrect: false },
        { id: "B", text: "Ngăn chặn ngoại ứng tiêu cực giữa các loại hình sử dụng đất không tương thích", isCorrect: true },
        { id: "C", text: "Bắt buộc các doanh nghiệp tư nhân phải đầu tư xây dựng công viên công cộng", isCorrect: false },
        { id: "D", text: "Tập trung hóa quyền sở hữu đất đai vào các tập đoàn bất động sản lớn", isCorrect: false }
      ]
    },
    20: {
      options: [
        { id: "A", text: "Cư dân địa phương được bồi thường thỏa đáng và chuyển lên tầng lớp trung lưu", isCorrect: false },
        { id: "B", text: "Giá nhà đất tăng vọt khiến cư dân thu nhập thấp bị đẩy bật ra khỏi nơi ở cũ", isCorrect: true },
        { id: "C", text: "Tỷ lệ tội phạm và tệ nạn xã hội tại khu vực cải tạo tăng cao mất kiểm soát", isCorrect: false },
        { id: "D", text: "Chính quyền địa phương phải gánh chịu khoản nợ công khổng lồ từ cải tạo", isCorrect: false }
      ]
    },
    23: {
      options: [
        { id: "A", text: "Người nghèo có xu hướng ưa chuộng không gian sống yên tĩnh và trong lành hơn", isCorrect: false },
        { id: "B", text: "Do giá nhà đất tại lõi đô thị tăng vọt vượt quá khả năng chi trả của họ", isCorrect: true },
        { id: "C", text: "Do các cơ sở dịch vụ giáo dục và y tế chất lượng cao tập trung ở vùng ngoại ô", isCorrect: false },
        { id: "D", text: "Do chính quyền áp đặt hạn ngạch cư trú nghiêm ngặt đối với khu vực trung tâm", isCorrect: false }
      ]
    },
    24: {
      options: [
        { id: "A", text: "Bán đấu giá toàn bộ quỹ đất công cho các tập đoàn phát triển bất động sản", isCorrect: false },
        { id: "B", text: "Thu hồi phần địa tô đất đai tăng vọt quanh hạ tầng để tái đầu tư dự án", isCorrect: true },
        { id: "C", text: "Tăng thuế thu nhập cá nhân đối với người dân sử dụng dịch vụ metro thường xuyên", isCorrect: false },
        { id: "D", text: "Vay vốn ODA từ các tổ chức quốc tế với lãi suất thương mại thông thường", isCorrect: false }
      ]
    },
    25: {
      options: [
        { id: "A", text: "Cầu cạn sẽ phá vỡ cảnh quan đô thị và làm giảm giá trị bất động sản lân cận", isCorrect: false },
        { id: "B", text: "Kích thích nhu cầu cảm ứng, hút thêm phương tiện và dồn tắc nghẽn về nút giao", isCorrect: true },
        { id: "C", text: "Chi phí bảo trì vận hành cầu cạn hàng năm quá đắt đỏ so với ngân sách thành phố", isCorrect: false },
        { id: "D", text: "Cầu cạn không cho phép các phương tiện giao thông công cộng lưu thông qua lại", isCorrect: false }
      ]
    },
    27: {
      options: [
        { id: "A", text: "Các khu bảo tồn thiên nhiên và công viên sinh thái quốc gia", isCorrect: false },
        { id: "B", text: "Các đầu mối giao thông công cộng sức chở lớn như ga metro, BRT", isCorrect: true },
        { id: "C", text: "Các khu công nghiệp chế xuất nặng xa trung tâm đô thị", isCorrect: false },
        { id: "D", text: "Các khu dân cư biệt thự biệt lập khép kín có cổng bảo vệ", isCorrect: false }
      ]
    },
    28: {
      options: [
        { id: "A", text: "Phạt hành chính các chủ phương tiện không tuân thủ làn đường quy định", isCorrect: false },
        { id: "B", text: "Nội hóa chi phí ngoại ứng tiêu cực bằng công cụ điều tiết giá thị trường", isCorrect: true },
        { id: "C", text: "Hỗ trợ tài chính trực tiếp cho các nhà sản xuất xe buýt công cộng nội địa", isCorrect: false },
        { id: "D", text: "Khống chế số lượng xe ô tô đăng ký mới hàng năm tại các đô thị lớn", isCorrect: false }
      ]
    }
  },

  // --- KINH TẾ BIẾN ĐỔI KHÍ HẬU (MTKH1103) ---
  "MTKH1103_KT_Bien_doi_khi_hau.json": {
    12: {
      options: [
        { id: "A", text: "Chi phí đầu tư công nghệ sạch cộng với thuế giá trị gia tăng hàng hóa", isCorrect: false },
        { id: "B", text: "Chi phí tư nhân biên cộng Chi phí thiệt hại ngoại ứng biên do khí thải", isCorrect: true },
        { id: "C", text: "Tổng chi phí bảo hiểm rủi ro thiên tai và tổn thất tài sản của doanh nghiệp", isCorrect: false },
        { id: "D", text: "Mức giá trần hạn ngạch phát thải carbon trên thị trường chứng chỉ xanh", isCorrect: false }
      ]
    },
    14: {
      options: [
        { id: "A", text: "Mức giá bán buôn một tấn than đá trên thị trường hàng hóa tương lai", isCorrect: false },
        { id: "B", text: "Tổng thiệt hại kinh tế xã hội biên dài hạn của một tấn carbon phát thải", isCorrect: true },
        { id: "C", text: "Chi phí kỹ thuật để thu giữ và chôn lấp một tấn khí carbon xuống lòng đất", isCorrect: false },
        { id: "D", text: "Mức thuế bảo vệ môi trường tối thiểu do cơ quan quản lý thu trên mỗi tấn nhiên liệu", isCorrect: false }
      ]
    },
    15: {
      options: [
        { id: "A", text: "Thuế Carbon áp dụng cho doanh nghiệp lớn, còn ETS áp dụng cho hộ gia đình", isCorrect: false },
        { id: "B", text: "Thuế Carbon cố định giá phát thải, còn ETS cố định tổng lượng trần hạn ngạch", isCorrect: true },
        { id: "C", text: "Thuế Carbon do các tổ chức quốc tế thu, còn ETS do ngân sách quốc gia quản lý", isCorrect: false },
        { id: "D", text: "ETS chỉ điều tiết ngành lâm nghiệp, còn Thuế Carbon điều tiết năng lượng tái tạo", isCorrect: false }
      ]
    },
    16: {
      options: [
        { id: "A", text: "Cắt giảm 100% việc sử dụng nhiên liệu hóa thạch ngay trong vòng 5 năm đầu", isCorrect: false },
        { id: "B", text: "Giữ mức tăng nhiệt độ toàn cầu dưới 2°C và nỗ lực hướng tới giới hạn 1.5°C", isCorrect: true },
        { id: "C", text: "Yêu cầu các quốc gia đang phát triển gánh chịu toàn bộ chi phí chuyển dịch", isCorrect: false },
        { id: "D", text: "Xóa bỏ toàn bộ các nhà máy nhiệt điện than trên thế giới trước năm 2030", isCorrect: false }
      ]
    },
    18: {
      options: [
        { id: "A", text: "Nên trì hoãn hành động giảm phát thải vì công nghệ tương lai sẽ rẻ hơn nhiều", isCorrect: false },
        { id: "B", text: "Chi phí hành động sớm rẻ hơn rất nhiều so với tổn thất nặng nề nếu chần chừ", isCorrect: true },
        { id: "C", text: "Biến đổi khí hậu không gây ra thiệt hại kinh tế đáng kể đối với các nước giàu", isCorrect: false },
        { id: "D", text: "Tăng trưởng kinh tế truyền thống luôn có khả năng tự sửa chữa tổn thất khí hậu", isCorrect: false }
      ]
    },
    19: {
      options: [
        { id: "A", text: "Cấm nhập khẩu toàn bộ các mặt hàng thô từ các quốc gia chưa đạt Net Zero", isCorrect: false },
        { id: "B", text: "Ngăn rò rỉ carbon bằng cơ chế định giá carbon tương đương lên hàng nhập khẩu", isCorrect: true },
        { id: "C", text: "Trợ cấp xuất khẩu cho các mặt hàng nông sản truyền thống trong khối liên minh", isCorrect: false },
        { id: "D", text: "Buộc các quốc gia xuất khẩu phải nộp phạt trực tiếp vào quỹ khí hậu toàn cầu", isCorrect: false }
      ]
    },
    20: {
      options: [
        { id: "A", text: "Tối đa hóa mức tiêu dùng và khai thác tài nguyên của thế hệ hiện tại", isCorrect: false },
        { id: "B", text: "Bảo đảm quyền lợi và sự sống còn của thế hệ tương lai bình đẳng như hiện tại", isCorrect: true },
        { id: "C", text: "Dành toàn bộ ngân sách nhà nước hiện nay cho các công trình tương lai xa", isCorrect: false },
        { id: "D", text: "Áp dụng tỷ lệ chiết khấu xã hội cực cao để giảm gánh nặng nợ công hiện thời", isCorrect: false }
      ]
    },
    23: {
      options: [
        { id: "A", text: "Công nghệ tiết kiệm điện luôn đòi hỏi chi phí đầu tư ban đầu quá đắt đỏ", isCorrect: false },
        { id: "B", text: "Hiệu quả năng lượng tăng làm rẻ chi phí sử dụng, kích thích tổng tiêu dùng tăng", isCorrect: true },
        { id: "C", text: "Các thiết bị tiết kiệm năng lượng thường có tuổi thọ vận hành rất ngắn", isCorrect: false },
        { id: "D", text: "Người tiêu dùng luôn tẩy chay các thiết bị dán nhãn chứng nhận năng lượng xanh", isCorrect: false }
      ]
    },
    24: {
      options: [
        { id: "A", text: "Các công trình bị tàn phá nặng nề sau các trận thiên tai bão lũ lịch sử", isCorrect: false },
        { id: "B", text: "Mỏ than và dàn khoan dầu bị mất giá trị sớm do luật kiểm soát khí hậu ngặt nghèo", isCorrect: true },
        { id: "C", text: "Hệ thống đường dây truyền tải điện gió và mặt trời chưa kết nối vào lưới", isCorrect: false },
        { id: "D", text: "Các nguồn vốn vay thương mại bị các ngân hàng phong tỏa vì tranh chấp pháp lý", isCorrect: false }
      ]
    },
    26: {
      options: [
        { id: "A", text: "Cắt giảm 100% lượng khí thải carbon phát sinh từ mọi hoạt động của con người", isCorrect: false },
        { id: "B", text: "Lượng phát thải vào khí quyển cân bằng với lượng được hấp thụ hoặc thu giữ", isCorrect: true },
        { id: "C", text: "Đóng cửa toàn bộ các khu công nghiệp chế xuất nặng trong phạm vi lãnh thổ", isCorrect: false },
        { id: "D", text: "Chỉ sử dụng năng lượng hạt nhân để thay thế hoàn toàn năng lượng sinh khối", isCorrect: false }
      ]
    },
    27: {
      options: [
        { id: "A", text: "Dưới 0.5°C so với thời kỳ tiền công nghiệp", isCorrect: false },
        { id: "B", text: "Dưới 2.0°C và nỗ lực đạt ngưỡng 1.5°C", isCorrect: true },
        { id: "C", text: "Dưới 3.5°C đến tối đa 4.0°C toàn cầu", isCorrect: false },
        { id: "D", text: "Không quy định mức trần cụ thể cho nhiệt độ", isCorrect: false }
      ]
    }
  }
};

// Chuẩn hóa phân bổ điểm theo Kim Tự Tháp Cân Bằng cho 28 câu:
// 13 câu 10đ (46.4%), 11 câu 20đ (39.3%), 4 câu 30đ (14.3%)
// Map thứ tự điểm:
// Câu 1 - 13: 10đ (timeLimit: 15s)
// Câu 14 - 24: 20đ (timeLimit: 20s)
// Câu 25: 30đ (timeLimit: 30s)
// Tie-Breaker 26, 27: 20đ (timeLimit: 25s)
// Tie-Breaker 28: 30đ (timeLimit: 30s)
const pyramidPoints = [
  10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, // 13 câu 10đ
  20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20,         // 11 câu 20đ
  30,                                                 // 1 câu 30đ
  20, 20,                                             // TB 26, 27 (20đ)
  30                                                  // TB 28 (30đ)
];

const files = fs.readdirSync(publicBanksDir).filter(f => f.endsWith('.json') && f !== 'index.json');

files.forEach(fileName => {
  const filePath = path.join(publicBanksDir, fileName);
  let questions = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  questions = questions.map((q, idx) => {
    // 1. Áp dụng chuẩn hóa điểm theo Kim Tự Tháp Cân Bằng
    const newPts = pyramidPoints[idx] || 10;
    q.points = newPts;
    q.timeLimit = newPts === 10 ? 15 : newPts === 20 ? 20 : 30;

    // 2. Áp dụng điều chỉnh cân bằng độ dài nếu có trong bản đồ
    const fileAdj = lengthAdjustments[fileName];
    if (fileAdj && fileAdj[idx + 1]) {
      q.options = fileAdj[idx + 1].options;
    }

    // 3. Với các câu khác, nếu đáp án đúng dài hơn trung bình nhiễu > 1.4 lần,
    // tự động tinh chỉnh làm dày các phương án nhiễu ngắn
    if (q.options && q.options.length >= 2) {
      const correct = q.options.find(o => o.isCorrect);
      const distractors = q.options.filter(o => !o.isCorrect);
      if (correct && distractors.length > 0) {
        const avgD = distractors.reduce((acc, d) => acc + d.text.length, 0) / distractors.length;
        if (correct.text.length > avgD * 1.5 && (correct.text.length - avgD) > 15) {
          // Bổ sung diễn giải bổ trợ cho distractor để cân bằng độ dài
          distractors.forEach(d => {
            if (d.text.length < correct.text.length * 0.6) {
              if (!d.text.includes('theo') && !d.text.includes('trong') && !d.text.includes('đối với')) {
                d.text = `${d.text} theo các quy định thông thường`;
              }
            }
          });
        }
      }
    }

    return q;
  });

  fs.writeFileSync(filePath, JSON.stringify(questions, null, 2), 'utf-8');
  console.log(`✅ Đã chuẩn hóa toàn diện: ${fileName}`);
});

console.log('\n🎉 Hoàn tất chuẩn hóa Độ Dài và Kim Tự Tháp Điểm Số cho toàn bộ kho đề!');
