const fs = require("fs");
const path = require("path");

const publicBanksDir = path.join(__dirname, "../public/quiz-banks");

const additionalQuestions = {
  "QLKT1101_Quan_ly_hoc_1.json": [
    {
      "type": "MC_SINGLE",
      "content": "Trường phái quản trị khoa học của Frederick Winslow Taylor tập trung chủ yếu vào cấp độ quản trị nào trong doanh nghiệp?",
      "points": 10,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Cấp chiến lược toàn công ty", "isCorrect": false },
        { "id": "B", "text": "Cấp độ phân xưởng và người thừa hành (tối ưu hóa thao tác lao động)", "isCorrect": true },
        { "id": "C", "text": "Cấp quan hệ đối ngoại và thể chế", "isCorrect": false },
        { "id": "D", "text": "Cấp quản trị tài chính cấp cao", "isCorrect": false }
      ],
      "hint": "Taylor tập trung vào nghiên cứu thời gian và động tác tại vị trí làm việc của công nhân."
    },
    {
      "type": "MC_MULTI",
      "content": "Theo Max Weber, một tổ chức quan liêu bàn giấy lý tưởng (Bureaucracy) cần sở hữu những đặc trưng cơ bản nào?",
      "points": 15,
      "timeLimit": 35,
      "options": [
        { "id": "A", "text": "Phân công lao động chuyên môn hóa rõ ràng", "isCorrect": true },
        { "id": "B", "text": "Hệ thống thứ bậc quyền lực được phân định nghiêm ngặt", "isCorrect": true },
        { "id": "C", "text": "Tuyển dụng và thăng tiến hoàn toàn dựa trên quan hệ thân quen", "isCorrect": false },
        { "id": "D", "text": "Vận hành dựa trên các quy tắc và thủ tục bằng văn bản chuẩn hóa", "isCorrect": true }
      ],
      "hint": "Weber đề xuất mô hình dựa trên tính duy lý và pháp lý, xóa bỏ chủ nghĩa thân tộc thiên vị."
    },
    {
      "type": "TRUE_FALSE",
      "content": "Thí nghiệm Hawthorne của Elton Mayo chứng minh rằng các yếu tố vật lý như ánh sáng và nhiệt độ tại nơi làm việc là nhân tố duy nhất quyết định năng suất lao động.",
      "points": 10,
      "timeLimit": 20,
      "options": [
        { "id": "true", "text": "Đúng (True)", "isCorrect": false },
        { "id": "false", "text": "Sai (False)", "isCorrect": true }
      ],
      "hint": "Hawthorne mở đường cho trường phái tâm lý - xã hội, chứng minh yếu tố tâm lý nhóm và sự quan tâm của cấp trên tác động mạnh mẽ đến năng suất."
    },
    {
      "type": "MC_SINGLE",
      "content": "Trong thang bậc nhu cầu của Abraham Maslow, sau khi nhu cầu An toàn (Safety) đã được thỏa mãn cơ bản, con người sẽ có động lực hướng tới bậc nhu cầu nào tiếp theo?",
      "points": 10,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Nhu cầu tự hoàn thiện (Self-actualization)", "isCorrect": false },
        { "id": "B", "text": "Nhu cầu được tôn trọng (Esteem)", "isCorrect": false },
        { "id": "C", "text": "Nhu cầu xã hội / Được thuộc về (Social / Belongingness)", "isCorrect": true },
        { "id": "D", "text": "Nhu cầu sinh học cơ bản (Physiological)", "isCorrect": false }
      ],
      "hint": "Nhu cầu giao lưu tình cảm, thuộc về một tập thể và được bạn bè, đồng nghiệp chấp nhận."
    },
    {
      "type": "MC_SINGLE",
      "content": "Theo Thuyết X và Thuyết Y của Douglas McGregor, nhà quản lý theo Thuyết Y nhìn nhận bản chất người lao động như thế nào?",
      "points": 10,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Con người lười biếng, trốn tránh trách nhiệm và phải bị đe dọa trừng phạt mới chịu làm việc", "isCorrect": false },
        { "id": "B", "text": "Con người xem lao động là nhu cầu tự nhiên, có năng lực sáng tạo và sẵn sàng nhận trách nhiệm nếu được tin tưởng", "isCorrect": true },
        { "id": "C", "text": "Con người chỉ làm việc vì tiền thưởng vật chất trước mắt", "isCorrect": false },
        { "id": "D", "text": "Con người không bao giờ có mục tiêu cá nhân ăn nhập với mục tiêu công ty", "isCorrect": false }
      ],
      "hint": "Thuyết Y đại diện cho cái nhìn nhân văn và lạc quan về tiềm năng phát triển của con người."
    },
    {
      "type": "MC_SINGLE",
      "content": "Theo Thuyết kỳ vọng của Victor Vroom, Động lực làm việc (Motivation) được xác định bằng công thức nào?",
      "points": 15,
      "timeLimit": 30,
      "options": [
        { "id": "A", "text": "Động lực = Kỳ vọng (Expectancy) + Phương tiện (Instrumentality) + Giá trị phần thưởng (Valence)", "isCorrect": false },
        { "id": "B", "text": "Động lực = Kỳ vọng (Expectancy) × Phương tiện (Instrumentality) × Giá trị phần thưởng (Valence)", "isCorrect": true },
        { "id": "C", "text": "Động lực = Tiền lương × Năng suất cá nhân", "isCorrect": false },
        { "id": "D", "text": "Động lực = Sự nỗ lực ÷ Độ khó của mục tiêu", "isCorrect": false }
      ],
      "hint": "Tích số của ba nhân tố: Nếu bất kỳ nhân tố nào bằng 0, động lực tổng thể sẽ bằng 0."
    },
    {
      "type": "MC_SINGLE",
      "content": "Trong Lưới lãnh đạo của Robert Blake và Jane Mouton, phong cách quản trị ở tọa độ (9,9) - nơi nhà lãnh đạo quan tâm cao độ đến cả con người lẫn kết quả sản xuất - được gọi là gì?",
      "points": 15,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Quản trị kiểu câu lạc bộ đồng quê (Country Club Management)", "isCorrect": false },
        { "id": "B", "text": "Quản trị nhóm (Team Management)", "isCorrect": true },
        { "id": "C", "text": "Quản trị quyền uy - phục tùng (Authority-Compliance)", "isCorrect": false },
        { "id": "D", "text": "Quản trị suy giảm / bỏ mặc (Impoverished Management)", "isCorrect": false }
      ],
      "hint": "Phong cách lý tưởng thúc đẩy sự gắn kết và hiệu suất cao nhất nhờ mục tiêu chung."
    },
    {
      "type": "TRUE_FALSE",
      "content": "Cơ cấu tổ chức kiểu Ma trận (Matrix Structure) vi phạm nguyên tắc 'Thống nhất chỉ huy' của Henry Fayol vì một nhân viên có thể chịu sự giám sát của hai người quản lý cùng lúc.",
      "points": 10,
      "timeLimit": 20,
      "options": [
        { "id": "true", "text": "Đúng (True)", "isCorrect": true },
        { "id": "false", "text": "Sai (False)", "isCorrect": false }
      ],
      "hint": "Trong ma trận, thành viên dự án vừa báo cáo cho Trưởng phòng chức năng vừa báo cáo cho Quản trị viên dự án."
    },
    {
      "type": "MC_SINGLE",
      "content": "Khi doanh nghiệp hoạt động trong môi trường kinh doanh có độ bất định cao và công nghệ biến đổi nhanh chóng, mô hình tổ chức nào thường mang lại tính linh hoạt và thích ứng cao nhất?",
      "points": 15,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Cơ cấu cơ học hình tháp nhiều tầng nấc (Mechanistic Structure)", "isCorrect": false },
        { "id": "B", "text": "Cơ cấu hữu cơ linh hoạt và mạng lưới phi tập trung (Organic / Network Structure)", "isCorrect": true },
        { "id": "C", "text": "Cơ cấu tập trung quyền lực cao độ vào một cá nhân", "isCorrect": false },
        { "id": "D", "text": "Cơ cấu dựa hoàn toàn trên thâm niên công tác", "isCorrect": false }
      ],
      "hint": "Cơ cấu hữu cơ có ít quy chế cứng nhắc, trao quyền rộng rãi và giao tiếp đa chiều."
    },
    {
      "type": "MC_SINGLE",
      "content": "Bước đầu tiên có tính quyết định trong quy trình ra quyết định quản trị hợp lý là gì?",
      "points": 10,
      "timeLimit": 20,
      "options": [
        { "id": "A", "text": "Đánh giá các giải pháp thay thế", "isCorrect": false },
        { "id": "B", "text": "Nhận diện và xác định chính xác vấn đề cần giải quyết", "isCorrect": true },
        { "id": "C", "text": "Thực thi quyết định ngay lập tức", "isCorrect": false },
        { "id": "D", "text": "Phân bổ ngân sách dự phòng", "isCorrect": false }
      ],
      "hint": "Nếu xác định sai vấn đề, mọi giải pháp xây dựng sau đó đều trở nên vô nghĩa."
    },
    {
      "type": "MC_MULTI",
      "content": "Kỹ thuật động não (Brainstorming) khi áp dụng trong ra quyết định nhóm đòi hỏi tuân thủ những nguyên tắc cốt lõi nào?",
      "points": 15,
      "timeLimit": 30,
      "options": [
        { "id": "A", "text": "Tuyệt đối không phê phán hay chỉ trích ý kiến trong giai đoạn đề xuất", "isCorrect": true },
        { "id": "B", "text": "Khuyến khích những ý tưởng táo bạo, độc đáo và mới lạ", "isCorrect": true },
        { "id": "C", "text": "Thu thập số lượng ý tưởng càng nhiều càng tốt", "isCorrect": true },
        { "id": "D", "text": "Chỉ cho phép cấp trên phát biểu để giữ trật tự cuộc họp", "isCorrect": false }
      ],
      "hint": "Mục tiêu là khơi mở tự do sáng tạo và tận dụng trí tuệ tập thể không rào cản."
    },
    {
      "type": "MC_SINGLE",
      "content": "Kỹ thuật Delphi trong ra quyết định và dự báo nhóm có đặc điểm nổi bật nào dưới đây?",
      "points": 15,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Các chuyên gia tranh luận trực tiếp nảy lửa tại hội trường", "isCorrect": false },
        { "id": "B", "text": "Thu thập ý kiến độc lập của các chuyên gia ẩn danh qua nhiều vòng bảng hỏi phản hồi", "isCorrect": true },
        { "id": "C", "text": "Bỏ phiếu công khai bằng giơ tay biểu quyết", "isCorrect": false },
        { "id": "D", "text": "Lấy ý kiến ngẫu nhiên của khách hàng vãng lai", "isCorrect": false }
      ],
      "hint": "Tính ẩn danh giúp tránh hiện tượng tâm lý a dua theo số đông hoặc bị chi phối bởi người có chức quyền."
    },
    {
      "type": "TRUE_FALSE",
      "content": "Điểm hòa vốn (Break-even point) là mức sản lượng tại đó Tổng doanh thu vừa đủ bù đắp Tổng chi phí (cả định phí và biến phí), và Lợi nhuận của doanh nghiệp bằng 0.",
      "points": 10,
      "timeLimit": 20,
      "options": [
        { "id": "true", "text": "Đúng (True)", "isCorrect": true },
        { "id": "false", "text": "Sai (False)", "isCorrect": false }
      ],
      "hint": "Tại điểm hòa vốn: Doanh thu = Chi phí, không lãi và không lỗ."
    },
    {
      "type": "MC_SINGLE",
      "content": "Theo nghiên cứu của Henry Mintzberg, vai trò 'Người phát ngôn' (Spokesperson) và 'Người giám sát thông tin' (Monitor) của nhà quản trị thuộc nhóm vai trò nào?",
      "points": 15,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Nhóm vai trò quan hệ con người (Interpersonal roles)", "isCorrect": false },
        { "id": "B", "text": "Nhóm vai trò thông tin (Informational roles)", "isCorrect": true },
        { "id": "C", "text": "Nhóm vai trò ra quyết định (Decisional roles)", "isCorrect": false },
        { "id": "D", "text": "Nhóm vai trò kỹ thuật tác nghiệp (Technical roles)", "isCorrect": false }
      ],
      "hint": "Mintzberg chia 10 vai trò thành 3 nhóm: Quan hệ con người, Thông tin và Ra quyết định."
    },
    {
      "type": "MC_SINGLE",
      "content": "Một công ty công nghệ phát hiện một lỗ hổng bảo mật nghiêm trọng trong sản phẩm vừa xuất xưởng. Tổng giám đốc ngay lập tức ra lệnh thu hồi sản phẩm toàn cầu và xin lỗi công khai, chấp nhận sụt giảm 20% lợi nhuận ngắn hạn để bảo vệ an toàn dữ liệu khách hàng. Quyết định này thể hiện quan điểm đạo đức quản trị nào?",
      "points": 30,
      "timeLimit": 35,
      "options": [
        { "id": "A", "text": "Quan điểm đạo đức vị lợi hẹp hòi (chỉ tối đa hóa lợi nhuận cho cổ đông)", "isCorrect": false },
        { "id": "B", "text": "Quan điểm trách nhiệm xã hội và công lý đạo đức (CSR & Social Justice approach)", "isCorrect": true },
        { "id": "C", "text": "Quan điểm trốn tránh pháp lý", "isCorrect": false },
        { "id": "D", "text": "Quan điểm cơ hội ngắn hạn", "isCorrect": false }
      ],
      "hint": "Đặt quyền lợi an toàn của các bên liên quan (khách hàng, xã hội) lên trên lợi ích tài chính thuần túy ngắn hạn."
    }
  ],

  "QLKT1120_Lap_ke_hoach.json": [
    {
      "type": "MC_SINGLE",
      "content": "Trong ma trận phân tích SWOT, chiến lược WO (Weaknesses - Opportunities) hướng đến mục tiêu hành động nào?",
      "points": 10,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Sử dụng điểm mạnh nội bộ để nắm bắt cơ hội bên ngoài", "isCorrect": false },
        { "id": "B", "text": "Tận dụng các cơ hội từ môi trường bên ngoài để khắc phục và hóa giải các điểm yếu nội bộ", "isCorrect": true },
        { "id": "C", "text": "Tối thiểu hóa điểm yếu để tránh né các nguy cơ đe dọa", "isCorrect": false },
        { "id": "D", "text": "Sử dụng điểm mạnh để phòng thủ trước các nguy cơ cạnh tranh", "isCorrect": false }
      ],
      "hint": "WO là chiến lược cải thiện điểm yếu bằng cách đón đầu cơ hội mở ra trên thị trường."
    },
    {
      "type": "MC_SINGLE",
      "content": "Trong ma trận danh mục đầu tư BCG của Boston Consulting Group, đơn vị kinh doanh chiến lược (SBU) có thị phần tương đối cao trong một ngành có tốc độ tăng trưởng thấp được xếp vào ô nào?",
      "points": 10,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Ngôi sao (Star)", "isCorrect": false },
        { "id": "B", "text": "Bò sữa tiền mặt (Cash Cow)", "isCorrect": true },
        { "id": "C", "text": "Dấu hỏi (Question Mark)", "isCorrect": false },
        { "id": "D", "text": "Chó mực (Dog)", "isCorrect": false }
      ],
      "hint": "Bò sữa sinh ra dòng tiền mặt dồi dào mà không đòi hỏi tái đầu tư vốn quá nhiều."
    },
    {
      "type": "MC_SINGLE",
      "content": "Theo ma trận phát triển thị trường - sản phẩm của Igor Ansoff, chiến lược bán các sản phẩm hiện có vào các thị trường địa lý mới được gọi là gì?",
      "points": 15,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Thâm nhập thị trường (Market Penetration)", "isCorrect": false },
        { "id": "B", "text": "Phát triển thị trường (Market Development)", "isCorrect": true },
        { "id": "C", "text": "Phát triển sản phẩm (Product Development)", "isCorrect": false },
        { "id": "D", "text": "Đa dạng hóa (Diversification)", "isCorrect": false }
      ],
      "hint": "Sản phẩm cũ + Thị trường mới = Phát triển thị trường."
    },
    {
      "type": "MC_MULTI",
      "content": "Theo nguyên tắc thiết lập mục tiêu SMART, những chữ cái nào đại diện đúng cho các thuộc tính chuẩn hóa?",
      "points": 15,
      "timeLimit": 30,
      "options": [
        { "id": "A", "text": "S - Specific (Cụ thể, rõ ràng)", "isCorrect": true },
        { "id": "B", "text": "M - Measurable (Đo lường được bằng chỉ số định lượng)", "isCorrect": true },
        { "id": "C", "text": "A - Achievable (Khả thi, có thể đạt được)", "isCorrect": true },
        { "id": "D", "text": "T - Time-bound (Có khung thời hạn hoàn thành xác định)", "isCorrect": true }
      ],
      "hint": "Tất cả các thuộc tính trên đều là thành phần cấu thành cốt lõi của nguyên tắc SMART."
    },
    {
      "type": "TRUE_FALSE",
      "content": "Phương pháp dự báo theo chuỗi thời gian (Time-series Forecasting) dựa trên giả định căn bản rằng các quy luật và xu hướng biến động trong quá khứ sẽ tiếp tục lặp lại trong tương lai.",
      "points": 10,
      "timeLimit": 20,
      "options": [
        { "id": "true", "text": "Đúng (True)", "isCorrect": true },
        { "id": "false", "text": "Sai (False)", "isCorrect": false }
      ],
      "hint": "Chuỗi thời gian phân tích quá khứ để phóng chiếu xu hướng tương lai."
    },
    {
      "type": "MC_SINGLE",
      "content": "Phương pháp lập ngân sách từ số 0 (Zero-Based Budgeting - ZBB) có đặc trưng ưu việt nào so với phương pháp lập ngân sách gia tăng truyền thống?",
      "points": 15,
      "timeLimit": 30,
      "options": [
        { "id": "A", "text": "Mặc định cộng thêm một tỷ lệ phần trăm lạm phát vào ngân sách năm trước", "isCorrect": false },
        { "id": "B", "text": "Mọi khoản chi tiêu trong kỳ mới đều phải được giải trình và chứng minh hiệu quả từ đầu bắt đầu từ con số 0", "isCorrect": true },
        { "id": "C", "text": "Chỉ dành riêng cho việc mua sắm trang thiết bị văn phòng nhỏ lẻ", "isCorrect": false },
        { "id": "D", "text": "Không cần sự phê duyệt của giám đốc tài chính", "isCorrect": false }
      ],
      "hint": "ZBB xóa bỏ tư duy chi tiêu quán tính, yêu cầu bảo vệ từng đồng ngân sách từ mức 0."
    },
    {
      "type": "MC_SINGLE",
      "content": "Các công cụ kế hoạch như chính sách công ty (Policies), quy trình chuẩn (SOPs) và nội quy quy chế được xếp vào loại kế hoạch nào?",
      "points": 10,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Kế hoạch đơn dụng dùng một lần (Single-use plans)", "isCorrect": false },
        { "id": "B", "text": "Kế hoạch thường trực (Standing plans)", "isCorrect": true },
        { "id": "C", "text": "Kế hoạch bất khả thi", "isCorrect": false },
        { "id": "D", "text": "Kế hoạch tình huống khẩn cấp", "isCorrect": false }
      ],
      "hint": "Kế hoạch thường trực được áp dụng lặp đi lặp lại cho các tình huống phát sinh thường xuyên."
    },
    {
      "type": "TRUE_FALSE",
      "content": "Kế hoạch dự phòng (Contingency Planning) là việc xác định trước các phương án hành động thay thế khả dĩ khi xảy ra những biến cố bất ngờ làm gián đoạn kế hoạch tác nghiệp ban đầu.",
      "points": 10,
      "timeLimit": 20,
      "options": [
        { "id": "true", "text": "Đúng (True)", "isCorrect": true },
        { "id": "false", "text": "Sai (False)", "isCorrect": false }
      ],
      "hint": "Kế hoạch B/C giúp doanh nghiệp chủ động ứng phó rủi ro đứt gãy hoạt động."
    },
    {
      "type": "MC_SINGLE",
      "content": "Trong phương pháp dự báo san bằng mũ (Exponential Smoothing), trọng số lớn nhất được gán cho đại lượng nào?",
      "points": 15,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Số liệu thực tế của kỳ xa nhất trong lịch sử", "isCorrect": false },
        { "id": "B", "text": "Số liệu thực tế của kỳ gần nhất vừa diễn ra", "isCorrect": true },
        { "id": "C", "text": "Trung bình cộng của toàn bộ số liệu 10 năm trước", "isCorrect": false },
        { "id": "D", "text": "Số liệu dự báo trung bình ngành", "isCorrect": false }
      ],
      "hint": "Các quan sát càng mới càng chứa nhiều thông tin cập nhật nên nhận trọng số mũ cao nhất."
    },
    {
      "type": "MC_SINGLE",
      "content": "Trong ma trận 9 ô GE-McKinsey dùng để lập kế hoạch danh mục kinh doanh, hai trục đánh giá bao gồm những yếu tố nào?",
      "points": 15,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Thị phần tương đối và Tốc độ tăng trưởng thị trường", "isCorrect": false },
        { "id": "B", "text": "Sức hấp dẫn của ngành và Sức mạnh cạnh tranh của đơn vị kinh doanh", "isCorrect": true },
        { "id": "C", "text": "Doanh thu thuần và Chi phí vận hành", "isCorrect": false },
        { "id": "D", "text": "Chỉ số P/E và Vốn hóa thị trường", "isCorrect": false }
      ],
      "hint": "GE-McKinsey là bước phát triển đa chiều toàn diện hơn so với ma trận 4 ô của BCG."
    },
    {
      "type": "MC_MULTI",
      "content": "Theo mô hình 5 áp lực cạnh tranh của Michael Porter (Five Forces), những yếu tố nào quyết định mức độ hấp dẫn và tỷ suất sinh lời của ngành?",
      "points": 15,
      "timeLimit": 30,
      "options": [
        { "id": "A", "text": "Cường độ cạnh tranh giữa các đối thủ hiện tại trong ngành", "isCorrect": true },
        { "id": "B", "text": "Nguy cơ đe dọa xâm nhập từ các đối thủ tiềm năng mới", "isCorrect": true },
        { "id": "C", "text": "Quyền lực thương lượng đàm phán của nhà cung cấp và khách hàng", "isCorrect": true },
        { "id": "D", "text": "Mối đe dọa từ các sản phẩm và dịch vụ thay thế", "isCorrect": true }
      ],
      "hint": "Cả 5 lực lượng này tạo nên cấu trúc cạnh tranh toàn diện của một ngành kinh doanh."
    },
    {
      "type": "MC_SINGLE",
      "content": "Chiến lược 'Tích hợp ngược về phía sau' (Backward Vertical Integration) trong hoạch định chiến lược kinh doanh có nghĩa là gì?",
      "points": 15,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Mua lại các kênh phân phối bán lẻ đưa sản phẩm tới tay người dùng cuối", "isCorrect": false },
        { "id": "B", "text": "Đầu tư kiểm soát hoặc sáp nhập các nhà cung ứng nguyên vật liệu đầu vào của chính mình", "isCorrect": true },
        { "id": "C", "text": "Thu hẹp quy mô sản xuất để bán bớt nhà máy", "isCorrect": false },
        { "id": "D", "text": "Đa dạng hóa sang lĩnh vực hoàn toàn không liên quan", "isCorrect": false }
      ],
      "hint": "Đi ngược về nguồn cung ứng để chủ động giá thành và chuỗi cung ứng vật tư."
    },
    {
      "type": "TRUE_FALSE",
      "content": "Phương pháp Quản trị theo mục tiêu (MBO - Management by Objectives) là quá trình trong đó mục tiêu do Tổng giám đốc đơn phương ấn định và áp đặt hoàn toàn từ trên xuống mà không cần thảo luận với cấp dưới.",
      "points": 10,
      "timeLimit": 20,
      "options": [
        { "id": "true", "text": "Đúng (True)", "isCorrect": false },
        { "id": "false", "text": "Sai (False)", "isCorrect": true }
      ],
      "hint": "Bản chất cốt lõi của MBO là sự tham gia hiệp thương cùng xác lập mục tiêu giữa cấp trên và cấp dưới."
    },
    {
      "type": "MC_SINGLE",
      "content": "Phương pháp lập kế hoạch theo kịch bản (Scenario Planning) phát huy giá trị cao nhất trong điều kiện môi trường nào?",
      "points": 15,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Môi trường ổn định hoàn toàn có thể dự báo chính xác bằng một con số duy nhất", "isCorrect": false },
        { "id": "B", "text": "Môi trường có độ phức tạp và bất định cao, xuất hiện nhiều biến số khó lường", "isCorrect": true },
        { "id": "C", "text": "Khi công ty chuẩn bị giải thể", "isCorrect": false },
        { "id": "D", "text": "Khi công ty độc quyền tuyệt đối", "isCorrect": false }
      ],
      "hint": "Kịch bản giúp chuẩn bị cho nhiều tương lai khả dĩ khác nhau (kịch bản lạc quan, cơ sở, bi quan)."
    },
    {
      "type": "MC_SINGLE",
      "content": "Một tập đoàn bán lẻ điện máy lập kế hoạch mở thêm 30 siêu thị mới trong năm tài chính. Khi phân tích ngân sách dự án vốn đầu tư (CapEx), chỉ số tài chính nào cho biết tỷ suất sinh lời thực tế làm cho Giá trị hiện giá thuần (NPV) của dự án bằng đúng 0?",
      "points": 30,
      "timeLimit": 35,
      "options": [
        { "id": "A", "text": "Thời gian hoàn vốn giản đơn (Payback Period)", "isCorrect": false },
        { "id": "B", "text": "Tỷ suất hoàn vốn nội bộ (Internal Rate of Return - IRR)", "isCorrect": true },
        { "id": "C", "text": "Hệ số thanh toán hiện hành (Current Ratio)", "isCorrect": false },
        { "id": "D", "text": "Chỉ số biên lợi nhuận ròng (Net Profit Margin)", "isCorrect": false }
      ],
      "hint": "IRR là tỷ lệ chiết khấu mà tại đó NPV = 0; nếu IRR > chi phí sử dụng vốn WACC thì dự án đáng giá để đầu tư."
    }
  ],

  "QLKT1110_Quan_ly_du_an.json": [
    {
      "type": "MC_SINGLE",
      "content": "Trong quản trị dự án bằng phương pháp Sơ đồ mạng CPM, 'Đường găng' (Critical Path) được định nghĩa là gì?",
      "points": 10,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Chuỗi các công việc ngắn nhất trong sơ đồ mạng dự án", "isCorrect": false },
        { "id": "B", "text": "Chuỗi các công việc dài nhất từ điểm khởi đầu đến kết thúc dự án, quyết định thời gian hoàn thành ngắn nhất của dự án", "isCorrect": true },
        { "id": "C", "text": "Chuỗi công việc có chi phí tài chính đắt đỏ nhất", "isCorrect": false },
        { "id": "D", "text": "Đường đi của các công việc phụ trợ không bắt buộc", "isCorrect": false }
      ],
      "hint": "Bất kỳ sự chậm trễ nào trên đường găng đều làm dự án bị trễ hạn tương ứng."
    },
    {
      "type": "MC_SINGLE",
      "content": "Độ dự trữ toàn phần (Total Float / Total Slack) của các công việc nằm trên Đường găng luôn bằng bao nhiêu?",
      "points": 10,
      "timeLimit": 20,
      "options": [
        { "id": "A", "text": "Bằng 0", "isCorrect": true },
        { "id": "B", "text": "Bằng 1 tuần", "isCorrect": false },
        { "id": "C", "text": "Bằng tổng thời gian dự án", "isCorrect": false },
        { "id": "D", "text": "Bằng vô cực", "isCorrect": false }
      ],
      "hint": "Công việc găng không có thời gian dự trữ linh hoạt (Total Float = LS - ES = 0)."
    },
    {
      "type": "TRUE_FALSE",
      "content": "Nếu một công việc không nằm trên đường găng bị chậm trễ trong phạm vi Độ dự trữ tự do (Free Float), nó sẽ không làm ảnh hưởng đến thời điểm bắt đầu sớm nhất của bất kỳ công việc tiếp theo nào.",
      "points": 10,
      "timeLimit": 20,
      "options": [
        { "id": "true", "text": "Đúng (True)", "isCorrect": true },
        { "id": "false", "text": "Sai (False)", "isCorrect": false }
      ],
      "hint": "Free Float là khoảng thời gian công việc có thể trễ mà không ảnh hưởng đến Early Start của công việc sau."
    },
    {
      "type": "MC_SINGLE",
      "content": "Trong phương pháp Quản lý giá trị thu được (EVM), công thức chuẩn để tính Chênh lệch chi phí (Cost Variance - CV) là gì?",
      "points": 10,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "CV = PV - AC", "isCorrect": false },
        { "id": "B", "text": "CV = EV - AC", "isCorrect": true },
        { "id": "C", "text": "CV = EV - PV", "isCorrect": false },
        { "id": "D", "text": "CV = BAC - EAC", "isCorrect": false }
      ],
      "hint": "CV = Giá trị thu được (EV) trừ đi Chi phí thực tế đã bỏ ra (AC)."
    },
    {
      "type": "MC_SINGLE",
      "content": "Một dự án tại thời điểm kiểm tra có Chỉ số hiệu quả tiến độ SPI = 0.85 và Chỉ số hiệu quả chi phí CPI = 1.15. Dự án đang ở tình trạng nào?",
      "points": 15,
      "timeLimit": 30,
      "options": [
        { "id": "A", "text": "Vượt tiến độ và bội chi ngân sách", "isCorrect": false },
        { "id": "B", "text": "Chậm tiến độ nhưng đang tiết kiệm chi phí so với kế hoạch", "isCorrect": true },
        { "id": "C", "text": "Đúng tiến độ và đúng ngân sách", "isCorrect": false },
        { "id": "D", "text": "Chậm tiến độ và bội chi ngân sách nghiêm trọng", "isCorrect": false }
      ],
      "hint": "SPI < 1 là chậm tiến độ; CPI > 1 là sử dụng chi phí hiệu quả (dưới ngân sách)."
    },
    {
      "type": "MC_SINGLE",
      "content": "Trong phương pháp ước lượng PERT 3 điểm, công thức tính Thời gian kỳ vọng (Te) từ thời gian Lạc quan (o), Thường gặp (m) và Bi quan (p) là gì?",
      "points": 15,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Te = (o + m + p) / 3", "isCorrect": false },
        { "id": "B", "text": "Te = (o + 4m + p) / 6", "isCorrect": true },
        { "id": "C", "text": "Te = (2o + 3m + p) / 6", "isCorrect": false },
        { "id": "D", "text": "Te = (o + 6m + p) / 8", "isCorrect": false }
      ],
      "hint": "Ước lượng theo phân phối Beta gán trọng số 4 cho giá trị thường gặp nhất (m)."
    },
    {
      "type": "MC_MULTI",
      "content": "Theo hướng dẫn chuẩn của PMBOK, Đường cơ sở phạm vi dự án (Scope Baseline) bao gồm những tài liệu phê duyệt nào?",
      "points": 15,
      "timeLimit": 30,
      "options": [
        { "id": "A", "text": "Bản tuyên bố phạm vi dự án (Project Scope Statement)", "isCorrect": true },
        { "id": "B", "text": "Cấu trúc phân chia công việc (Work Breakdown Structure - WBS)", "isCorrect": true },
        { "id": "C", "text": "Từ điển WBS (WBS Dictionary)", "isCorrect": true },
        { "id": "D", "text": "Hóa đơn thanh toán tài chính của nhà thầu phụ", "isCorrect": false }
      ],
      "hint": "Bộ 3 tài liệu: Scope Statement, WBS và WBS Dictionary tạo thành Scope Baseline."
    },
    {
      "type": "TRUE_FALSE",
      "content": "Hiện tượng 'Bành trướng phạm vi' (Scope Creep) xảy ra khi phạm vi dự án bị mở rộng thêm các tính năng mà không thông qua quy trình kiểm soát thay đổi chính thức và không được điều chỉnh thời gian, chi phí tương ứng.",
      "points": 10,
      "timeLimit": 20,
      "options": [
        { "id": "true", "text": "Đúng (True)", "isCorrect": true },
        { "id": "false", "text": "Sai (False)", "isCorrect": false }
      ],
      "hint": "Scope Creep là một trong những nguyên nhân hàng đầu khiến dự án thất bại về thời gian và ngân sách."
    },
    {
      "type": "MC_SINGLE",
      "content": "Biểu đồ Gantt (Gantt Chart) có ưu điểm trực quan nổi bật nhất trong quản trị dự án là gì?",
      "points": 10,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Tính toán chính xác rủi ro dòng tiền", "isCorrect": false },
        { "id": "B", "text": "Hiển thị trực quan lịch trình công việc theo dòng thời gian ngang và mức độ gối đầu giữa chúng", "isCorrect": true },
        { "id": "C", "text": "Thay thế hoàn toàn hợp đồng pháp lý của dự án", "isCorrect": false },
        { "id": "D", "text": "Tự động phân bổ lại thuế giá trị gia tăng", "isCorrect": false }
      ],
      "hint": "Phát minh bởi Henry Gantt, hiển thị các thanh công việc trên trục hoành thời gian."
    },
    {
      "type": "MC_SINGLE",
      "content": "Kỹ thuật 'Theo dõi nhanh' (Fast-tracking) nhằm rút ngắn tiến độ dự án được thực hiện bằng cách nào?",
      "points": 15,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Bổ sung thêm ngân sách và nhân lực vào công việc trên đường găng", "isCorrect": false },
        { "id": "B", "text": "Cho các công việc vốn dự kiến thực hiện tuần tự chuyển sang làm song song hoặc gối đầu lên nhau", "isCorrect": true },
        { "id": "C", "text": "Cắt giảm bớt các tính năng chất lượng bắt buộc của dự án", "isCorrect": false },
        { "id": "D", "text": "Kéo dài thời hạn dự án thêm 6 tháng", "isCorrect": false }
      ],
      "hint": "Fast-tracking làm song song các công việc nhưng có thể làm gia tăng rủi ro phải làm lại (rework)."
    },
    {
      "type": "MC_SINGLE",
      "content": "Kỹ thuật 'Đâm nén tiến độ' (Crashing) khác với 'Theo dõi nhanh' (Fast-tracking) ở điểm căn bản nào?",
      "points": 15,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Crashing chấp nhận tăng thêm chi phí để bổ sung nguồn lực rút ngắn thời gian công việc găng", "isCorrect": true },
        { "id": "B", "text": "Crashing không làm tăng thêm chi phí tài chính", "isCorrect": false },
        { "id": "C", "text": "Crashing chỉ áp dụng cho các công việc không nằm trên đường găng", "isCorrect": false },
        { "id": "D", "text": "Crashing là hủy bỏ toàn bộ dự án", "isCorrect": false }
      ],
      "hint": "Crashing đánh đổi chi phí để lấy thời gian bằng cách trả thêm lương làm thêm giờ hoặc thuê thêm thiết bị."
    },
    {
      "type": "MC_SINGLE",
      "content": "Một sự kiện rủi ro có xác suất xảy ra là 20% và nếu xảy ra sẽ gây tổn thất tài chính 500 triệu đồng. Giá trị tiền tệ kỳ vọng (Expected Monetary Value - EMV) của rủi ro này là bao nhiêu?",
      "points": 15,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "-50 triệu đồng", "isCorrect": false },
        { "id": "B", "text": "-100 triệu đồng", "isCorrect": true },
        { "id": "C", "text": "-250 triệu đồng", "isCorrect": false },
        { "id": "D", "text": "+100 triệu đồng", "isCorrect": false }
      ],
      "hint": "EMV = Xác suất × Tác động = 20% × (-500 triệu) = -100 triệu đồng."
    },
    {
      "type": "MC_MULTI",
      "content": "Những chiến lược nào dưới đây được sử dụng để ứng phó với các rủi ro tiêu cực (đe dọa) trong quản lý dự án?",
      "points": 15,
      "timeLimit": 30,
      "options": [
        { "id": "A", "text": "Né tránh rủi ro (Avoid)", "isCorrect": true },
        { "id": "B", "text": "Chuyển giao rủi ro (Transfer - ví dụ mua bảo hiểm, thuê ngoài)", "isCorrect": true },
        { "id": "C", "text": "Giảm thiểu tác động / xác suất (Mitigate)", "isCorrect": true },
        { "id": "D", "text": "Chấp nhận chủ động hoặc thụ động (Accept)", "isCorrect": true }
      ],
      "hint": "4 chiến lược ứng phó rủi ro tiêu cực kinh điển: Avoid, Transfer, Mitigate, Accept."
    },
    {
      "type": "TRUE_FALSE",
      "content": "Hợp đồng trọn gói giá cố định (Firm Fixed Price - FFP) đẩy phần lớn rủi ro phát sinh vượt chi phí sang cho Bên nhận thầu (nhà thầu).",
      "points": 10,
      "timeLimit": 20,
      "options": [
        { "id": "true", "text": "Đúng (True)", "isCorrect": true },
        { "id": "false", "text": "Sai (False)", "isCorrect": false }
      ],
      "hint": "Trong hợp đồng trọn gói, nhà thầu phải tự gánh chịu mọi chi phí vượt định mức đã ký."
    },
    {
      "type": "MC_SINGLE",
      "content": "Dự án phát triển phần mềm có Tổng ngân sách phê duyệt BAC = 600 triệu đồng. Tại ngày kiểm toán, Giá trị thu được EV = 240 triệu, Chi phí thực tế đã thanh toán AC = 300 triệu. Giả định hiệu quả chi phí từ nay đến khi kết thúc dự án vẫn giữ nguyên tỷ lệ CPI hiện tại, Tổng chi phí dự báo khi hoàn thành (EAC) là bao nhiêu?",
      "points": 30,
      "timeLimit": 35,
      "options": [
        { "id": "A", "text": "660 triệu đồng", "isCorrect": false },
        { "id": "B", "text": "750 triệu đồng", "isCorrect": true },
        { "id": "C", "text": "800 triệu đồng", "isCorrect": false },
        { "id": "D", "text": "700 triệu đồng", "isCorrect": false }
      ],
      "hint": "CPI = EV / AC = 240 / 300 = 0.8. EAC = BAC / CPI = 600 / 0.8 = 750 triệu đồng."
    }
  ],

  "KTKI1105_Kiem_soat_quan_ly.json": [
    {
      "type": "MC_SINGLE",
      "content": "Theo báo cáo COSO 2013, thành tố nào đóng vai trò là nền tảng cốt lõi định hình văn hóa liêm chính và kỷ luật cho toàn bộ hệ thống kiểm soát nội bộ?",
      "points": 10,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Đánh giá rủi ro (Risk Assessment)", "isCorrect": false },
        { "id": "B", "text": "Môi trường kiểm soát (Control Environment)", "isCorrect": true },
        { "id": "C", "text": "Hoạt động giám sát (Monitoring Activities)", "isCorrect": false },
        { "id": "D", "text": "Hệ thống công nghệ thông tin", "isCorrect": false }
      ],
      "hint": "Môi trường kiểm soát thể hiện 'giai điệu từ người đứng đầu' (Tone at the top) và cam kết về tính liêm chính."
    },
    {
      "type": "MC_SINGLE",
      "content": "Một trung tâm trách nhiệm mà nhà quản lý có toàn quyền tự chủ và chịu trách nhiệm về Doanh thu, Chi phí lẫn các quyết định phân bổ Vốn đầu tư vào tài sản được gọi là gì?",
      "points": 10,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Trung tâm chi phí (Cost Center)", "isCorrect": false },
        { "id": "B", "text": "Trung tâm doanh thu (Revenue Center)", "isCorrect": false },
        { "id": "C", "text": "Trung tâm lợi nhuận (Profit Center)", "isCorrect": false },
        { "id": "D", "text": "Trung tâm đầu tư (Investment Center)", "isCorrect": true }
      ],
      "hint": "Trung tâm đầu tư có phạm vi quyền hạn và trách nhiệm rộng lớn nhất trong hệ thống kế toán trách nhiệm."
    },
    {
      "type": "MC_SINGLE",
      "content": "Chỉ số Thu nhập thặng dư (Residual Income - RI) dùng để đo lường hiệu quả trung tâm đầu tư được xác định theo công thức nào?",
      "points": 15,
      "timeLimit": 30,
      "options": [
        { "id": "A", "text": "RI = Lợi nhuận hoạt động ÷ Tổng tài sản", "isCorrect": false },
        { "id": "B", "text": "RI = Lợi nhuận hoạt động - (Tỷ suất sinh lời tối thiểu đòi hỏi × Tài sản hoạt động bình quân)", "isCorrect": true },
        { "id": "C", "text": "RI = Doanh thu thuần - Chi phí biến đổi", "isCorrect": false },
        { "id": "D", "text": "RI = Vốn chủ sở hữu × Chi phí vốn cổ phần", "isCorrect": false }
      ],
      "hint": "RI đo lường phần lợi nhuận dôi ra vượt trên mức sinh lời tối thiểu mà tập đoàn mong muốn từ khối tài sản đầu tư."
    },
    {
      "type": "TRUE_FALSE",
      "content": "Chỉ số ROI (Return on Investment) có nhược điểm cố hữu là có thể khiến nhà quản lý từ chối các dự án đầu tư sinh lời có tỷ suất cao hơn chi phí vốn tập đoàn nhưng thấp hơn mức ROI trung bình hiện tại của bộ phận mình (hiện tượng cận thị mục tiêu).",
      "points": 10,
      "timeLimit": 25,
      "options": [
        { "id": "true", "text": "Đúng (True)", "isCorrect": true },
        { "id": "false", "text": "Sai (False)", "isCorrect": false }
      ],
      "hint": "Đây là lý do chỉ số Thu nhập thặng dư (RI) và EVA thường được khuyến nghị thay thế để đạt sự tương thích mục tiêu."
    },
    {
      "type": "MC_SINGLE",
      "content": "Chỉ số Giá trị kinh tế gia tăng (Economic Value Added - EVA) khác biệt căn bản so với Lợi nhuận kế toán ở điểm mấu chốt nào?",
      "points": 15,
      "timeLimit": 30,
      "options": [
        { "id": "A", "text": "EVA không trừ chi phí lãi vay ngân hàng", "isCorrect": false },
        { "id": "B", "text": "EVA khấu trừ toàn bộ chi phí sử dụng vốn (bao gồm cả chi phí nợ vay lẫn chi phí cơ hội của vốn chủ sở hữu - WACC)", "isCorrect": true },
        { "id": "C", "text": "EVA chỉ tính trên dòng tiền vào", "isCorrect": false },
        { "id": "D", "text": "EVA luôn luôn lớn hơn doanh thu", "isCorrect": false }
      ],
      "hint": "Kế toán thông thường bỏ qua chi phí cơ hội của vốn chủ sở hữu; EVA tính đủ toàn bộ chi phí vốn."
    },
    {
      "type": "MC_MULTI",
      "content": "Trong Thẻ điểm cân bằng (Balanced Scorecard - BSC) của Kaplan và Norton, 4 góc nhìn thước đo chiến lược bao gồm những khía cạnh nào?",
      "points": 15,
      "timeLimit": 30,
      "options": [
        { "id": "A", "text": "Khía cạnh Tài chính (Financial Perspective)", "isCorrect": true },
        { "id": "B", "text": "Khía cạnh Khách hàng (Customer Perspective)", "isCorrect": true },
        { "id": "C", "text": "Khía cạnh Quy trình kinh doanh nội bộ (Internal Business Processes)", "isCorrect": true },
        { "id": "D", "text": "Khía cạnh Học hỏi và Phát triển tổ chức (Learning & Growth)", "isCorrect": true }
      ],
      "hint": "4 khía cạnh cân bằng giữa ngắn hạn và dài hạn, tài chính và phi tài chính, bên trong và bên ngoài."
    },
    {
      "type": "TRUE_FALSE",
      "content": "Trong chuỗi quan hệ nguyên nhân - kết quả của BSC, việc nâng cao năng lực nhân sự và văn hóa học hỏi (Học hỏi & Phát triển) là cội nguồn nền tảng thúc đẩy hoàn thiện các quy trình nội bộ, từ đó tạo ra giá trị vượt trội cho khách hàng và dẫn tới thành công tài chính.",
      "points": 10,
      "timeLimit": 20,
      "options": [
        { "id": "true", "text": "Đúng (True)", "isCorrect": true },
        { "id": "false", "text": "Sai (False)", "isCorrect": false }
      ],
      "hint": "Đây là luận điểm cốt lõi tạo nên sức mạnh liên kết chiến lược của Thẻ điểm cân bằng."
    },
    {
      "type": "MC_SINGLE",
      "content": "Khi chuyển nhượng sản phẩm giữa hai bộ phận trong cùng một tập đoàn và có một thị trường bên ngoài hoàn hảo, cạnh tranh gay gắt, phương pháp định giá chuyển nhượng nào tối ưu hóa lợi ích của toàn tập đoàn?",
      "points": 15,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Giá chi phí toàn bộ cộng thêm lãi định mức", "isCorrect": false },
        { "id": "B", "text": "Giá thị trường bên ngoài (Market-based transfer price)", "isCorrect": true },
        { "id": "C", "text": "Giá do giám đốc bộ phận mua áp đặt", "isCorrect": false },
        { "id": "D", "text": "Chuyển giao miễn phí 0 đồng", "isCorrect": false }
      ],
      "hint": "Khi thị trường hoàn hảo, giá thị trường bảo đảm tính tự chủ và đo lường chính xác hiệu quả từng đơn vị."
    },
    {
      "type": "MC_SINGLE",
      "content": "Khi bộ phận bán còn dư thừa năng lực sản xuất (không thể bán hết công suất ra ngoài thị trường), mức giá chuyển nhượng nội bộ tối thiểu mà bộ phận bán có thể chấp nhận là bao nhiêu?",
      "points": 15,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Bằng Chi phí biến đổi phát sinh thêm của sản phẩm", "isCorrect": true },
        { "id": "B", "text": "Bằng Giá bán lẻ trên thị trường", "isCorrect": false },
        { "id": "C", "text": "Bằng Chi phí cố định toàn phần", "isCorrect": false },
        { "id": "D", "text": "Bằng Chi phí vốn WACC", "isCorrect": false }
      ],
      "hint": "Vì dư thừa năng lực nên chi phí cơ hội bằng 0, giá sàn chuyển nhượng chỉ cần bù đắp biến phí gia tăng."
    },
    {
      "type": "MC_SINGLE",
      "content": "Nguyên tắc 'Bất kiêm nhiệm / Phân chia trách nhiệm' (Segregation of Duties) trong kiểm soát nội bộ đòi hỏi phải tách biệt các chức năng nào để ngăn ngừa rủi ro gian lận và sai sót?",
      "points": 15,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Phê duyệt giao dịch, Thực hiện giao dịch, Ghi chép sổ sách và Bảo quản tài sản vật chất", "isCorrect": true },
        { "id": "B", "text": "Chức năng tuyển dụng và chức năng đào tạo nhân viên", "isCorrect": false },
        { "id": "C", "text": "Chức năng tiếp thị trực tuyến và tiếp thị trực tiếp", "isCorrect": false },
        { "id": "D", "text": "Chức năng trực điện thoại và chức năng gửi thư điện tử", "isCorrect": false }
      ],
      "hint": "Nếu một người vừa nắm tài sản vừa ghi sổ kế toán vừa phê duyệt sẽ rất dễ biển thủ mà không ai phát hiện."
    },
    {
      "type": "MC_MULTI",
      "content": "Những chỉ tiêu tài chính nào dưới đây thường được áp dụng phù hợp để đánh giá trách nhiệm của Trưởng Trung tâm Lợi nhuận (Profit Center)?",
      "points": 15,
      "timeLimit": 30,
      "options": [
        { "id": "A", "text": "Số dư đảm phí / Lợi nhuận đóng góp (Contribution Margin)", "isCorrect": true },
        { "id": "B", "text": "Lợi nhuận bộ phận có thể kiểm soát được (Controllable Segment Margin)", "isCorrect": true },
        { "id": "C", "text": "Lợi nhuận trước lãi vay và thuế (EBIT của bộ phận)", "isCorrect": true },
        { "id": "D", "text": "Tỷ suất hoàn vốn đầu tư ROI trên tài sản mua sắm trụ sở chính", "isCorrect": false }
      ],
      "hint": "Trung tâm lợi nhuận chỉ chịu trách nhiệm về doanh thu và các chi phí do họ kiểm soát được, không chịu trách nhiệm về vốn đầu tư tài sản dài hạn."
    },
    {
      "type": "TRUE_FALSE",
      "content": "Mục tiêu tối thượng của Hệ thống kiểm soát quản lý (Management Control System) là đạt được sự tương thích về mục tiêu (Goal Congruence) - nghĩa là thúc đẩy các cá nhân hành động vì lợi ích cá nhân của họ mà đồng thời cũng phục vụ tốt nhất lợi ích của tổ chức.",
      "points": 10,
      "timeLimit": 20,
      "options": [
        { "id": "true", "text": "Đúng (True)", "isCorrect": true },
        { "id": "false", "text": "Sai (False)", "isCorrect": false }
      ],
      "hint": "Sự đồng thuận và tương thích mục tiêu giữa các cấp là cốt lõi của kiểm soát quản lý hiện đại."
    },
    {
      "type": "MC_SINGLE",
      "content": "Hình thức kiểm soát tập trung vào việc giám sát và đánh giá trực tiếp các hành vi và sự tuân thủ quy chuẩn thao tác của nhân viên tại nơi làm việc được gọi là gì?",
      "points": 10,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Kiểm soát kết quả đầu ra (Results Control)", "isCorrect": false },
        { "id": "B", "text": "Kiểm soát hành vi / hành động (Action / Behavioral Control)", "isCorrect": true },
        { "id": "C", "text": "Kiểm soát tài chính thuần túy", "isCorrect": false },
        { "id": "D", "text": "Kiểm soát xã hội", "isCorrect": false }
      ],
      "hint": "Kiểm soát hành vi đảm bảo nhân viên thực hiện đúng quy trình thao tác chuẩn (SOP)."
    },
    {
      "type": "MC_SINGLE",
      "content": "Khái niệm 'Ngân sách linh hoạt' (Flexible Budget) có ưu điểm nổi bật nào so với 'Ngân sách tĩnh' (Static Budget) khi phân tích biến động chi phí?",
      "points": 15,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Cho phép tùy tiện thay đổi số liệu bất kỳ lúc nào mà không cần lý do", "isCorrect": false },
        { "id": "B", "text": "Tự động điều chỉnh dự toán chi phí phù hợp với mức sản lượng thực tế đạt được, giúp so sánh đúng mức độ tiết kiệm", "isCorrect": true },
        { "id": "C", "text": "Không cần thu thập số liệu thực tế", "isCorrect": false },
        { "id": "D", "text": "Chỉ tính toán một mức doanh thu duy nhất", "isCorrect": false }
      ],
      "hint": "So sánh chi phí thực tế với ngân sách linh hoạt theo sản lượng thực tế giúp đánh giá hiệu quả chi phí khách quan."
    },
    {
      "type": "MC_SINGLE",
      "content": "Bộ phận Y có Lợi nhuận hoạt động thuần trong năm là 150 triệu đồng, Tài sản hoạt động bình quân là 1.000 triệu đồng. Ban Giám đốc tập đoàn quy định tỷ suất sinh lời tối thiểu đối với tài sản đầu tư là 12%. Thu nhập thặng dư (RI) của Bộ phận Y trong năm là bao nhiêu?",
      "points": 30,
      "timeLimit": 35,
      "options": [
        { "id": "A", "text": "20 triệu đồng", "isCorrect": false },
        { "id": "B", "text": "30 triệu đồng", "isCorrect": true },
        { "id": "C", "text": "45 triệu đồng", "isCorrect": false },
        { "id": "D", "text": "120 triệu đồng", "isCorrect": false }
      ],
      "hint": "Chi phí vốn tối thiểu = 1.000 triệu × 12% = 120 triệu. RI = 150 - 120 = 30 triệu đồng."
    }
  ],

  "TOKT1138_Khoa_hoc_du_lieu.json": [
    {
      "type": "MC_SINGLE",
      "content": "Trong mô hình hồi quy tuyến tính cổ điển OLS, hệ số phóng đại phương sai VIF (Variance Inflation Factor) của một biến độc lập vượt quá 10 là dấu hiệu cảnh báo khuyết tật gì?",
      "points": 10,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Phương sai sai số thay đổi (Heteroskedasticity)", "isCorrect": false },
        { "id": "B", "text": "Hiện tượng đa cộng tuyến nghiêm trọng (Multicollinearity)", "isCorrect": true },
        { "id": "C", "text": "Hiện tượng tự tương quan chuỗi thời gian", "isCorrect": false },
        { "id": "D", "text": "Mô hình thiếu biến quan trọng", "isCorrect": false }
      ],
      "hint": "VIF > 5 hoặc 10 cho thấy biến độc lập có tương quan tuyến tính rất mạnh với các biến giải thích khác."
    },
    {
      "type": "MC_SINGLE",
      "content": "Để kiểm định hiện tượng Tự tương quan bậc 1 (Autocorrelation) trong phần dư của mô hình hồi quy chuỗi thời gian, đại lượng thống kê nào được sử dụng phổ biến nhất?",
      "points": 10,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Thống kê Durbin-Watson (DW)", "isCorrect": true },
        { "id": "B", "text": "Kiểm định Shapiro-Wilk", "isCorrect": false },
        { "id": "C", "text": "Chỉ số Kurtosis", "isCorrect": false },
        { "id": "D", "text": "Hệ số tương quan Pearson", "isCorrect": false }
      ],
      "hint": "Giá trị thống kê DW dao động quanh mức 2 cho thấy phần dư không có tự tương quan bậc 1."
    },
    {
      "type": "TRUE_FALSE",
      "content": "Trong bài toán phân loại nhị phân (Binary Classification), diện tích dưới đường cong ROC (ROC-AUC) bằng 0.5 phản ánh mô hình có khả năng phân biệt tương đương với việc tung đồng xu ngẫu nhiên.",
      "points": 10,
      "timeLimit": 20,
      "options": [
        { "id": "true", "text": "Đúng (True)", "isCorrect": true },
        { "id": "false", "text": "Sai (False)", "isCorrect": false }
      ],
      "hint": "AUC = 1 là phân loại hoàn hảo; AUC = 0.5 là dự đoán hoàn toàn ngẫu nhiên không có giá trị phân biệt."
    },
    {
      "type": "MC_SINGLE",
      "content": "Khi tập dữ liệu gặp tình trạng mất cân bằng lớp nghiêm trọng (ví dụ 99.5% giao dịch bình thường, chỉ 0.5% giao dịch gian lận thẻ tín dụng), chỉ số đánh giá mô hình nào đáng tin cậy hơn Accuracy?",
      "points": 15,
      "timeLimit": 30,
      "options": [
        { "id": "A", "text": "Accuracy thông thường", "isCorrect": false },
        { "id": "B", "text": "F1-Score / PR-AUC (Precision-Recall Curve)", "isCorrect": true },
        { "id": "C", "text": "R-squared", "isCorrect": false },
        { "id": "D", "text": "Sai số bình phương trung bình MSE", "isCorrect": false }
      ],
      "hint": "Mô hình ngây thơ đoán tất cả là 'bình thường' vẫn đạt Accuracy 99.5% nhưng bỏ sót 100% gian lận."
    },
    {
      "type": "MC_SINGLE",
      "content": "Trong thuật toán Cây quyết định (Decision Tree), chỉ số nào thường được sử dụng để đo lường mức độ hỗn loạn (độ bất thuần) của dữ liệu tại mỗi nút phân chia?",
      "points": 10,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Hệ số tương quan Spearman", "isCorrect": false },
        { "id": "B", "text": "Entropy hoặc Chỉ số Gini (Gini Impurity)", "isCorrect": true },
        { "id": "C", "text": "Khoảng biến thiên Range", "isCorrect": false },
        { "id": "D", "text": "Phân vị vị trí Quartile", "isCorrect": false }
      ],
      "hint": "Mục tiêu phân nhánh là tối đa hóa độ giảm bất thuần (Information Gain hoặc Gini Gain)."
    },
    {
      "type": "MC_MULTI",
      "content": "Những kỹ thuật nào dưới đây thường được áp dụng hiệu quả để khắc phục hiện tượng Quá khớp (Overfitting) trong các mô hình máy học?",
      "points": 15,
      "timeLimit": 30,
      "options": [
        { "id": "A", "text": "Áp dụng hiệu chỉnh phạt trọng số L1 (Lasso) hoặc L2 (Ridge)", "isCorrect": true },
        { "id": "B", "text": "Tăng kích thước và tính đa dạng của tập dữ liệu huấn luyện", "isCorrect": true },
        { "id": "C", "text": "Giảm độ sâu tối đa và tỉa cành cây quyết định (Pruning)", "isCorrect": true },
        { "id": "D", "text": "Tăng độ phức tạp của mô hình lên vô hạn", "isCorrect": false }
      ],
      "hint": "Overfitting xảy ra khi mô hình học thuộc lòng cả nhiễu; cần đơn giản hóa mô hình và phạt trọng số."
    },
    {
      "type": "TRUE_FALSE",
      "content": "Thuật toán Hồi quy Lasso (L1 Regularization) có đặc tính co các hệ số hồi quy của các biến không quan trọng về đúng bằng 0, nhờ đó có thể sử dụng làm công cụ tự động lựa chọn biến (Feature Selection).",
      "points": 10,
      "timeLimit": 20,
      "options": [
        { "id": "true", "text": "Đúng (True)", "isCorrect": true },
        { "id": "false", "text": "Sai (False)", "isCorrect": false }
      ],
      "hint": "Hình phạt chuẩn L1 tạo ra các nghiệm góc (sparse solution), triệt tiêu các biến không có ý nghĩa."
    },
    {
      "type": "MC_SINGLE",
      "content": "Trong thuật toán phân cụm K-Means, phương pháp trực quan đồ thị nào thường được sử dụng phổ biến nhất để xác định số lượng cụm K tối ưu?",
      "points": 15,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Biểu đồ phân tán Scatter Plot", "isCorrect": false },
        { "id": "B", "text": "Phương pháp Điểm khuỷu tay (Elbow Method)", "isCorrect": true },
        { "id": "C", "text": "Biểu đồ bánh Pie Chart", "isCorrect": false },
        { "id": "D", "text": "Sơ đồ mạng PERT", "isCorrect": false }
      ],
      "hint": "Đồ thị vẽ tổng bình phương khoảng cách nội cụm (WCSS) theo K; điểm uốn khuỷu tay là K hợp lý."
    },
    {
      "type": "MC_SINGLE",
      "content": "Kỹ thuật Giảm chiều dữ liệu Phân tích thành phần chính (PCA) tìm kiếm các trục tọa độ mới nhằm mục tiêu tối ưu hóa điều gì?",
      "points": 15,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Tối đa hóa phương sai (độ phân tán thông tin) của dữ liệu trên các thành phần trực giao mới", "isCorrect": true },
        { "id": "B", "text": "Tối đa hóa số lượng cột trong bảng dữ liệu", "isCorrect": false },
        { "id": "C", "text": "Làm tròn tất cả các số thực thành số nguyên", "isCorrect": false },
        { "id": "D", "text": "Xóa bỏ ngẫu nhiên 50% số dòng quan sát", "isCorrect": false }
      ],
      "hint": "Thành phần chính thứ nhất giữ lại nhiều phương sai nhất, các thành phần sau trực giao và giảm dần."
    },
    {
      "type": "MC_SINGLE",
      "content": "Kỹ thuật Kiểm định chéo K-Fold (K-Fold Cross-Validation) có mục đích chính là gì trong quy trình học máy?",
      "points": 15,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Tăng tốc độ tính toán của bộ vi xử lý", "isCorrect": false },
        { "id": "B", "text": "Đánh giá khả năng tổng quát hóa và độ ổn định của mô hình trên các tập dữ liệu độc lập chưa từng thấy", "isCorrect": true },
        { "id": "C", "text": "Tự động điền dữ liệu khuyết thiếu", "isCorrect": false },
        { "id": "D", "text": "Xác định mã định danh khách hàng", "isCorrect": false }
      ],
      "hint": "Chia dữ liệu thành K phần, luân phiên dùng K-1 phần huấn luyện và 1 phần kiểm định."
    },
    {
      "type": "MC_MULTI",
      "content": "Những phương pháp tiền xử lý nào dưới đây thường được áp dụng để phát hiện và xử lý giá trị ngoại lai (Outliers)?",
      "points": 15,
      "timeLimit": 30,
      "options": [
        { "id": "A", "text": "Quy tắc khoảng liên phần tư (Interquartile Range - 1.5 × IQR)", "isCorrect": true },
        { "id": "B", "text": "Điểm chuẩn hóa Z-score (vượt quá ngưỡng |Z| > 3)", "isCorrect": true },
        { "id": "C", "text": "Kỹ thuật cắt ngọn Winsorization (thay thế bằng giá trị bách phân vị biên)", "isCorrect": true },
        { "id": "D", "text": "Tăng gấp đôi giá trị ngoại lai", "isCorrect": false }
      ],
      "hint": "IQR và Z-score là hai kỹ thuật thống kê chuẩn xác định điểm dị biệt."
    },
    {
      "type": "TRUE_FALSE",
      "content": "Phương pháp chuẩn hóa Min-Max Scaling biến đổi dữ liệu về khoảng giá trị cố định [0, 1], trong khi Standard Scaling đưa biến về phân phối có giá trị trung bình bằng 0 và độ lệch chuẩn bằng 1.",
      "points": 10,
      "timeLimit": 20,
      "options": [
        { "id": "true", "text": "Đúng (True)", "isCorrect": true },
        { "id": "false", "text": "Sai (False)", "isCorrect": false }
      ],
      "hint": "Min-Max: (x - min) / (max - min); Standard: (x - mean) / std."
    },
    {
      "type": "MC_SINGLE",
      "content": "Trong mô hình hồi quy Logistic, hàm số toán học nào có vai trò ánh xạ giá trị đầu ra tuyến tính thành xác suất nằm trong khoảng (0, 1)?",
      "points": 15,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Hàm Sigmoid (Logistic Function)", "isCorrect": true },
        { "id": "B", "text": "Hàm bậc hai Parabol", "isCorrect": false },
        { "id": "C", "text": "Hàm lượng giác Sin / Cos", "isCorrect": false },
        { "id": "D", "text": "Hàm bậc ba Đa thức", "isCorrect": false }
      ],
      "hint": "Sigmoid: f(z) = 1 / (1 + e^(-z)) nén giá trị thực (-∞, +∞) về (0, 1)."
    },
    {
      "type": "MC_SINGLE",
      "content": "Trong bài toán phát hiện giao dịch gian lận ngân hàng, chỉ số Độ nhạy (Recall) đo lường điều gì?",
      "points": 15,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Tỷ lệ các giao dịch thực sự gian lận được mô hình phát hiện chính xác (TP / (TP + FN))", "isCorrect": true },
        { "id": "B", "text": "Tỷ lệ các dự đoán gian lận thực tế là đúng (TP / (TP + FP))", "isCorrect": false },
        { "id": "C", "text": "Tổng thời gian máy tính chạy thuật toán", "isCorrect": false },
        { "id": "D", "text": "Số lượng cây trong rừng ngẫu nhiên", "isCorrect": false }
      ],
      "hint": "Recall cao nghĩa là bỏ sót rất ít trường hợp gian lận thực tế."
    },
    {
      "type": "MC_SINGLE",
      "content": "Một sàn thương mại điện tử muốn phân nhóm 500.000 khách hàng thành các phân khúc tiếp thị đặc thù dựa trên 3 tiêu chí: Độ mới giao dịch (Recency), Tần suất mua hàng (Frequency) và Tổng chi tiêu (Monetary). Do dữ liệu khách hàng chưa có nhãn phân loại sẵn trước, thuật toán học máy nào là lựa chọn phù hợp nhất?",
      "points": 30,
      "timeLimit": 35,
      "options": [
        { "id": "A", "text": "Hồi quy tuyến tính đa biến OLS", "isCorrect": false },
        { "id": "B", "text": "Phân cụm K-Means hoặc Phân cụm phân cấp (Học không giám sát)", "isCorrect": true },
        { "id": "C", "text": "Mô hình hồi quy Logistic nhị phân", "isCorrect": false },
        { "id": "D", "text": "Cây quyết định nhị phân có giám sát", "isCorrect": false }
      ],
      "hint": "Bài toán gom nhóm tự động không có nhãn đầu ra là bài toán kinh điển của Học không giám sát (Clustering)."
    }
  ],

  "MTKH1103_KT_Bien_doi_khi_hau.json": [
    {
      "type": "MC_SINGLE",
      "content": "Trong kinh tế học môi trường, hiện tượng biến đổi khí hậu do phát thải khí nhà kính toàn cầu được coi là ví dụ điển hình nhất của loại thất bại thị trường nào?",
      "points": 10,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Độc quyền tự nhiên", "isCorrect": false },
        { "id": "B", "text": "Ngoại ứng tiêu cực toàn cầu (Global Negative Externality)", "isCorrect": true },
        { "id": "C", "text": "Thông tin bất đối xứng vi mô", "isCorrect": false },
        { "id": "D", "text": "Thị trường cạnh tranh hoàn hảo", "isCorrect": false }
      ],
      "hint": "Hành vi phát thải gây hại cho cộng đồng và khí hậu toàn cầu mà bên phát thải không phải trả tiền bồi thường."
    },
    {
      "type": "MC_SINGLE",
      "content": "Chi phí xã hội biên (Marginal Social Cost - MSC) của hoạt động phát thải carbon bằng tổng của hai thành phần nào?",
      "points": 10,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Chi phí tư nhân biên (MPC) + Chi phí thiệt hại ngoại ứng biên (MEC)", "isCorrect": true },
        { "id": "B", "text": "Chi phí cố định biên + Lợi nhuận gộp", "isCorrect": false },
        { "id": "C", "text": "Doanh thu biên + Chi phí biên", "isCorrect": false },
        { "id": "D", "text": "Thuế thu nhập doanh nghiệp + Lãi vay", "isCorrect": false }
      ],
      "hint": "MSC phản ánh đầy đủ tổng chi phí mà toàn xã hội phải gánh chịu: MSC = MPC + MEC."
    },
    {
      "type": "TRUE_FALSE",
      "content": "Theo Định lý Coase (Coase Theorem), nếu chi phí giao dịch bằng 0 và quyền tài sản môi trường được luật pháp xác lập rõ ràng, các bên liên quan có thể tự thương lượng để đạt mức phát thải tối ưu xã hội mà không cần sự can thiệp của chính phủ.",
      "points": 10,
      "timeLimit": 20,
      "options": [
        { "id": "true", "text": "Đúng (True)", "isCorrect": true },
        { "id": "false", "text": "Sai (False)", "isCorrect": false }
      ],
      "hint": "Định lý Nobel của Ronald Coase chỉ ra giải pháp phân định quyền sở hữu thị trường khi chi phí giao dịch không đáng kể."
    },
    {
      "type": "MC_SINGLE",
      "content": "Mức thuế Carbon tối ưu theo lý thuyết kinh tế Pigou (Pigouvian Tax) nên được ấn định bằng đúng đại lượng nào?",
      "points": 15,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Chi phí thiệt hại xã hội biên của một tấn carbon (Social Cost of Carbon - SCC)", "isCorrect": true },
        { "id": "B", "text": "Mức lương tối thiểu của người lao động", "isCorrect": false },
        { "id": "C", "text": "Doanh thu bình quân của doanh nghiệp năng lượng", "isCorrect": false },
        { "id": "D", "text": "Bằng 0 USD", "isCorrect": false }
      ],
      "hint": "Thuế Pigou nội hóa chính xác chi phí thiệt hại ngoại ứng biên: Tax = MEC = SCC."
    },
    {
      "type": "MC_SINGLE",
      "content": "Theo phân tích của Martin Weitzman về 'Giá cả và Số lượng' (Prices vs. Quantities), điểm khác biệt mấu chốt giữa Thuế Carbon và Hệ thống trao đổi hạn ngạch phát thải (ETS / Cap-and-Trade) là gì?",
      "points": 15,
      "timeLimit": 30,
      "options": [
        { "id": "A", "text": "Thuế Carbon cố định mức giá và để thị trường quyết định lượng phát thải; ETS cố định tổng hạn ngạch phát thải và để thị trường xác định giá tín chỉ", "isCorrect": true },
        { "id": "B", "text": "Thuế Carbon chỉ áp dụng cho người đi xe đạp", "isCorrect": false },
        { "id": "C", "text": "ETS cấm hoàn toàn hoạt động sản xuất công nghiệp", "isCorrect": false },
        { "id": "D", "text": "Cả hai công cụ đều kiểm soát đồng thời cả giá và số lượng một cách cứng nhắc", "isCorrect": false }
      ],
      "hint": "Thuế mang lại sự ổn định về giá; ETS mang lại sự chắc chắn về mục tiêu môi trường (tổng lượng khí thải tối đa)."
    },
    {
      "type": "MC_MULTI",
      "content": "Theo Thỏa thuận Paris năm 2015 về biến đổi khí hậu, các quốc gia tham gia cam kết những nghĩa vụ cốt lõi nào?",
      "points": 15,
      "timeLimit": 30,
      "options": [
        { "id": "A", "text": "Giữ mức tăng nhiệt độ toàn cầu dưới 2°C và nỗ lực hướng tới giới hạn 1.5°C so với tiền công nghiệp", "isCorrect": true },
        { "id": "B", "text": "Xây dựng và cập nhật định kỳ bản Đóng góp do quốc gia tự quyết định (NDC)", "isCorrect": true },
        { "id": "C", "text": "Hướng tới mục tiêu đạt mức phát thải ròng bằng 0 (Net Zero) vào giữa thế kỷ 21", "isCorrect": true },
        { "id": "D", "text": "Cấm hoàn toàn việc sử dụng máy vi tính tại các cơ quan nhà nước", "isCorrect": false }
      ],
      "hint": "Thỏa thuận Paris là văn kiện pháp lý toàn cầu mang tính bước ngoặt về khí hậu."
    },
    {
      "type": "TRUE_FALSE",
      "content": "Đường chi phí giảm phát thải biên (Marginal Abatement Cost - MAC) thể hiện chi phí tài chính gia tăng cần thiết để cắt giảm thêm một đơn vị phát thải khí nhà kính tương ứng với các giải pháp công nghệ khác nhau.",
      "points": 10,
      "timeLimit": 20,
      "options": [
        { "id": "true", "text": "Đúng (True)", "isCorrect": true },
        { "id": "false", "text": "Sai (False)", "isCorrect": false }
      ],
      "hint": "Đường cong MAC sắp xếp các công nghệ từ chi phí âm (tiết kiệm năng lượng) đến chi phí dương cao (thu giữ carbon)."
    },
    {
      "type": "MC_SINGLE",
      "content": "Báo cáo Stern Review (2006) của nhà kinh tế học Nicholas Stern đã đưa ra kết luận mang tính bước ngoặt nào về mặt kinh tế?",
      "points": 15,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Không cần làm gì vì biến đổi khí hậu sẽ tự biến mất", "isCorrect": false },
        { "id": "B", "text": "Chi phí đầu tư hành động sớm để cắt giảm khí thải (khoảng 1% GDP) thấp hơn rất nhiều so với tổn thất kinh tế khổng lồ nếu không hành động (5% - 20% GDP hàng năm)", "isCorrect": true },
        { "id": "C", "text": "Biến đổi khí hậu mang lại lợi nhuận khổng lồ cho mọi quốc gia", "isCorrect": false },
        { "id": "D", "text": "Nên hoãn hành động đến năm 2100", "isCorrect": false }
      ],
      "hint": "Báo cáo khẳng định: 'Hành động ngay có chi phí kinh tế rẻ hơn rất nhiều so với việc chần chừ chịu đựng thảm họa'."
    },
    {
      "type": "MC_SINGLE",
      "content": "Cơ chế Điều chỉnh Biên giới Carbon (CBAM) do Liên minh Châu Âu (EU) ban hành nhằm giải quyết mục tiêu chính sách nào?",
      "points": 15,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Ngăn chặn hiện tượng 'Rò rỉ carbon' (Carbon Leakage) bằng cách đánh phí carbon tương đương lên hàng nhập khẩu thâm dụng phát thải", "isCorrect": true },
        { "id": "B", "text": "Miễn thuế nhập khẩu hoàn toàn cho thép và xi măng", "isCorrect": false },
        { "id": "C", "text": "Ngăn chặn người lao động nhập cư", "isCorrect": false },
        { "id": "D", "text": "Trợ cấp xuất khẩu nông sản châu Âu", "isCorrect": false }
      ],
      "hint": "CBAM tạo sân chơi bình đẳng, ngăn doanh nghiệp chuyển nhà máy sang các nước có quy định phát thải lỏng lẻo."
    },
    {
      "type": "MC_SINGLE",
      "content": "Việc lựa chọn tỷ lệ chiết khấu xã hội (Social Discount Rate) rất thấp (khoảng 1.4% của Stern) khi đánh giá các dự án khí hậu phản ánh quan điểm triết lý kinh tế nào?",
      "points": 15,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Chỉ quan tâm đến phúc lợi của thế hệ hiện tại", "isCorrect": false },
        { "id": "B", "text": "Công bằng liên thế hệ (Intergenerational Equity) - coi trọng quyền lợi và sự sống còn của thế hệ tương lai bình đẳng như hiện tại", "isCorrect": true },
        { "id": "C", "text": "Tối đa hóa lợi nhuận ngân hàng thương mại ngắn hạn", "isCorrect": false },
        { "id": "D", "text": "Thúc đẩy tiêu dùng xả láng trước mắt", "isCorrect": false }
      ],
      "hint": "Tỷ lệ chiết khấu càng thấp thì thiệt hại kinh tế ở tương lai 50-100 năm sau càng có giá trị hiện tại lớn, thôi thúc hành động ngay."
    },
    {
      "type": "MC_MULTI",
      "content": "Những giải pháp kinh tế - kỹ thuật nào dưới đây thuộc nhóm 'Thích ứng với biến đổi khí hậu' (Climate Adaptation)?",
      "points": 15,
      "timeLimit": 30,
      "options": [
        { "id": "A", "text": "Xây dựng hệ thống đê biển, đê sông và hồ điều hòa chống ngập lụt đô thị", "isCorrect": true },
        { "id": "B", "text": "Chuyển đổi giống cây trồng sang các giống lúa chịu hạn và chịu xâm nhập mặn", "isCorrect": true },
        { "id": "C", "text": "Lắp đặt hệ thống cảm biến cảnh báo sớm bão lũ và sạt lở đất", "isCorrect": true },
        { "id": "D", "text": "Thay thế nhà máy nhiệt điện than bằng điện gió ngoài khơi", "isCorrect": false }
      ],
      "hint": "Thay thế điện than là biện pháp 'Giảm nhẹ phát thải' (Mitigation), các phương án còn lại là 'Thích ứng' (Adaptation)."
    },
    {
      "type": "TRUE_FALSE",
      "content": "Một Tín chỉ carbon chuẩn (Carbon Credit) tương đương với quyền phát thải hoặc việc cắt giảm / hấp thụ được chính xác 1 tấn khí nhà kính quy đổi tương đương CO2 (1 tCO2e).",
      "points": 10,
      "timeLimit": 20,
      "options": [
        { "id": "true", "text": "Đúng (True)", "isCorrect": true },
        { "id": "false", "text": "Sai (False)", "isCorrect": false }
      ],
      "hint": "1 carbon credit = 1 metric ton of CO2 equivalent (tCO2e)."
    },
    {
      "type": "MC_SINGLE",
      "content": "Khái niệm 'Nghịch lý Jevons' (Jevons Paradox) trong kinh tế học tài nguyên và năng lượng cảnh báo điều gì?",
      "points": 15,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Khi hiệu quả sử dụng năng lượng tăng lên (tiết kiệm hơn), tổng tiêu thụ năng lượng thực tế có thể tăng lên do chi phí rẻ đi kích thích nhu cầu sử dụng", "isCorrect": true },
        { "id": "B", "text": "Năng lượng tái tạo không bao giờ tạo ra điện", "isCorrect": false },
        { "id": "C", "text": "Giá dầu mỏ luôn luôn giảm về 0", "isCorrect": false },
        { "id": "D", "text": "Tiết kiệm năng lượng luôn làm suy thoái kinh tế", "isCorrect": false }
      ],
      "hint": "Hiệu quả công nghệ làm giảm chi phí cận biên, dẫn đến hiệu ứng bật lại (rebound effect) làm tiêu thụ tăng."
    },
    {
      "type": "MC_SINGLE",
      "content": "Thuật ngữ 'Tài sản mắc kẹt' (Stranded Assets) trong tiến trình chuyển đổi năng lượng xanh đề cập đến hiện tượng nào?",
      "points": 15,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Tàu thuyền bị mắc cạn ở kênh đào Suez", "isCorrect": false },
        { "id": "B", "text": "Các tài sản, mỏ than, dàn khoan dầu khí bị mất giá trị sớm hoặc phải dừng hoạt động trước thời hạn do quy định khí hậu khắt khe", "isCorrect": true },
        { "id": "C", "text": "Bất động sản bỏ hoang do tranh chấp thừa kế", "isCorrect": false },
        { "id": "D", "text": "Các cổ phiếu công nghệ bị tụt giá", "isCorrect": false }
      ],
      "hint": "Khi thế giới cam kết Net Zero, hàng nghìn tỷ USD dự án nhiên liệu hóa thạch có nguy cơ bị đóng cửa sớm."
    },
    {
      "type": "MC_SINGLE",
      "content": "Hai nhà máy X và Y có hàm chi phí giảm phát thải biên lần lượt là MACx = 10Qx và MACy = 20Qy (USD/tấn). Để cắt giảm tổng cộng 30 tấn CO2 với tổng chi phí xã hội thấp nhất thông qua cơ chế thị trường mua bán hạn ngạch phát thải, nhà máy X và Y sẽ cắt giảm tương ứng là bao nhiêu?",
      "points": 30,
      "timeLimit": 35,
      "options": [
        { "id": "A", "text": "Qx = 15 tấn, Qy = 15 tấn", "isCorrect": false },
        { "id": "B", "text": "Qx = 20 tấn, Qy = 10 tấn (với mức giá thị trường cân bằng 200 USD/tấn)", "isCorrect": true },
        { "id": "C", "text": "Qx = 10 tấn, Qy = 20 tấn", "isCorrect": false },
        { "id": "D", "text": "Qx = 25 tấn, Qy = 5 tấn", "isCorrect": false }
      ],
      "hint": "Hiệu quả tối ưu đạt được khi MACx = MACy: 10Qx = 20Qy => Qx = 2Qy. Kết hợp Qx + Qy = 30 => Qy = 10, Qx = 20."
    }
  ],

  "MTDT1115_Kinh_te_do_thi.json": [
    {
      "type": "MC_SINGLE",
      "content": "Khái niệm 'Tính kinh tế tập tụ' (Agglomeration Economies) giải thích xu hướng tập trung các doanh nghiệp tại đô thị. Ba nguồn động lực ngoại ứng theo phân tích của Alfred Marshall bao gồm những yếu tố nào?",
      "points": 10,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Nguồn cung ứng chuyên biệt, thị trường lao động gộp chung và sự lan tỏa tri thức (Knowledge spillover)", "isCorrect": true },
        { "id": "B", "text": "Giá đất rẻ, ít thuế và nhiều lao động nông nghiệp", "isCorrect": false },
        { "id": "C", "text": "Đường cao tốc vắng vẻ, ít phương tiện và khí hậu mát mẻ", "isCorrect": false },
        { "id": "D", "text": "Sự bảo hộ độc quyền của nhà nước", "isCorrect": false }
      ],
      "hint": "Marshallian Externalities: Sharing (chia sẻ nhà cung cấp), Matching (khớp cung cầu lao động), Learning (lan tỏa tri thức)."
    },
    {
      "type": "MC_SINGLE",
      "content": "Trong Mô hình thành phố đơn tâm (Monocentric City Model) của William Alonso, độ dốc của Đường giá thầu địa tô (Bid-rent curve) phụ thuộc chủ yếu vào nhân tố nào?",
      "points": 10,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Chi phí đi lại (chi phí vận chuyển) trên mỗi đơn vị khoảng cách di chuyển vào lõi trung tâm CBD", "isCorrect": true },
        { "id": "B", "text": "Số lượng cây xanh trồng ven đường", "isCorrect": false },
        { "id": "C", "text": "Màu sắc của các tòa nhà chung cư", "isCorrect": false },
        { "id": "D", "text": "Tỷ giá hối đoái quốc tế", "isCorrect": false }
      ],
      "hint": "Độ dốc đường giá thầu địa tô phản ánh sự đánh đổi giữa tiền thuê đất và chi phí đi lại hàng ngày."
    },
    {
      "type": "TRUE_FALSE",
      "content": "Theo mô hình địa tô Alonso, các doanh nghiệp dịch vụ tài chính thương mại có khả năng trả tiền thuê đất cao nhất tại lõi trung tâm CBD do độ nhạy cảm cao với vị trí tiếp cận đối tác và khách hàng.",
      "points": 10,
      "timeLimit": 20,
      "options": [
        { "id": "true", "text": "Đúng (True)", "isCorrect": true },
        { "id": "false", "text": "Sai (False)", "isCorrect": false }
      ],
      "hint": "Đường giá thầu của thương mại dịch vụ dốc nhất nên chiếm lĩnh vùng lõi trung tâm CBD."
    },
    {
      "type": "MC_SINGLE",
      "content": "Hiện tượng ùn tắc giao thông đô thị vào giờ cao điểm là ví dụ điển hình của hiện tượng kinh tế nào?",
      "points": 10,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Ngoại ứng tích cực", "isCorrect": false },
        { "id": "B", "text": "Ngoại ứng tiêu cực (Negative Externality) - người lái xe không phải trả chi phí làm chậm trễ thời gian của người khác", "isCorrect": true },
        { "id": "C", "text": "Hàng hóa công thuần túy không cạnh tranh", "isCorrect": false },
        { "id": "D", "text": "Độc quyền nhóm tự nhiên", "isCorrect": false }
      ],
      "hint": "Mỗi người thêm phương tiện vào dòng xe làm tăng thời gian chờ của toàn bộ những người còn lại."
    },
    {
      "type": "MC_SINGLE",
      "content": "Định luật Downs (Downs' Law) hay hiện tượng 'Nhu cầu cảm ứng' (Induced Demand) trong giao thông đô thị cảnh báo điều gì?",
      "points": 15,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Mở rộng thêm làn đường cao tốc thường nhanh chóng bị lấp đầy bởi lưu lượng phương tiện mới phát sinh, khiến kẹt xe tái diễn", "isCorrect": true },
        { "id": "B", "text": "Cấm đường sẽ làm giảm hoàn toàn số lượng dân cư thành phố", "isCorrect": false },
        { "id": "C", "text": "Giá xe ô tô sẽ tự động tăng gấp đôi khi mở đường", "isCorrect": false },
        { "id": "D", "text": "Người dân sẽ từ bỏ phương tiện cơ giới để đi bộ", "isCorrect": false }
      ],
      "hint": "Xây thêm đường chỉ giải quyết tắc nghẽn tạm thời vì chi phí đi lại giảm kích thích thêm nhu cầu lái xe mới."
    },
    {
      "type": "MC_MULTI",
      "content": "Chính sách Thu phí chống ùn tắc khu vực trung tâm (Congestion Pricing) như áp dụng tại Singapore (ERP) hay London mang lại những lợi ích kinh tế nào?",
      "points": 15,
      "timeLimit": 30,
      "options": [
        { "id": "A", "text": "Buộc người điều khiển phương tiện cá nhân nội hóa chi phí ngoại ứng làm chậm trễ giao thông", "isCorrect": true },
        { "id": "B", "text": "Giảm bớt lưu lượng xe cá nhân đi vào khu vực trung tâm trong giờ cao điểm", "isCorrect": true },
        { "id": "C", "text": "Tạo nguồn thu ngân sách để tái đầu tư nâng cấp mạng lưới giao thông công cộng", "isCorrect": true },
        { "id": "D", "text": "Cấm hoàn toàn việc người dân sở hữu xe cá nhân vĩnh viễn", "isCorrect": false }
      ],
      "hint": "Thu phí điều tiết dựa trên cơ chế giá cả thị trường chứ không cấm đoán cơ học."
    },
    {
      "type": "TRUE_FALSE",
      "content": "Mô hình Phát triển đô thị định hướng giao thông công cộng (TOD - Transit-Oriented Development) tập trung phát triển mật độ cao, tích hợp đa chức năng (ở, làm việc, thương mại) trong bán kính đi bộ 400 - 800m quanh các nhà ga tàu điện (Metro).",
      "points": 10,
      "timeLimit": 20,
      "options": [
        { "id": "true", "text": "Đúng (True)", "isCorrect": true },
        { "id": "false", "text": "Sai (False)", "isCorrect": false }
      ],
      "hint": "TOD là mô hình quy hoạch hiện đại kết hợp chặt chẽ giữa sử dụng đất mật độ cao và hạ tầng đường sắt đô thị."
    },
    {
      "type": "MC_SINGLE",
      "content": "Hiện tượng 'Tràn lan đô thị' (Urban Sprawl) có đặc trưng không gian và xã hội nổi bật nào?",
      "points": 15,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Mật độ dân số cực kỳ cao và đi bộ là phương thức di chuyển chính", "isCorrect": false },
        { "id": "B", "text": "Đô thị mở rộng dàn trải mật độ thấp ra vùng ven, chia cắt đất nông nghiệp và phụ thuộc tuyệt đối vào xe hơi cá nhân", "isCorrect": true },
        { "id": "C", "text": "Chỉ xây dựng nhà chọc trời trên 100 tầng", "isCorrect": false },
        { "id": "D", "text": "Mọi người đều sống dưới lòng đất", "isCorrect": false }
      ],
      "hint": "Urban Sprawl làm tốn kém chi phí kéo dài hạ tầng công cộng và gia tăng phát thải ô nhiễm."
    },
    {
      "type": "MC_SINGLE",
      "content": "Quy định phân vùng quy hoạch sử dụng đất (Zoning Regulations) trong quản lý đô thị nhằm giải quyết vấn đề gì?",
      "points": 10,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Ngăn chặn các ngoại ứng tiêu cực giữa các mục đích sử dụng đất không tương thích (như nhà máy xả thải đặt cạnh khu dân cư)", "isCorrect": true },
        { "id": "B", "text": "Quy định giá bán thức ăn đường phố", "isCorrect": false },
        { "id": "C", "text": "Bắt buộc mọi ngôi nhà phải sơn cùng một màu", "isCorrect": false },
        { "id": "D", "text": "Quy định số lượng con cái của mỗi gia đình", "isCorrect": false }
      ],
      "hint": "Zoning phân tách không gian công nghiệp ô nhiễm ra khỏi không gian sinh sống và nghỉ dưỡng."
    },
    {
      "type": "MC_SINGLE",
      "content": "Hiện tượng 'Chỉnh trang đô thị' (Gentrification) khi cải tạo các khu vực nhà ở cũ thường mang lại mặt trái xã hội nào cần lưu ý?",
      "points": 15,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Giá thuê nhà và chi phí sinh hoạt tăng vọt khiến các cư dân bản địa thu nhập thấp bị đẩy bật ra khỏi nơi sinh sống cũ (Displacement)", "isCorrect": true },
        { "id": "B", "text": "Khu phố bị biến thành đầm lầy", "isCorrect": false },
        { "id": "C", "text": "Tất cả các tòa nhà mới xây đều bị đổ sập", "isCorrect": false },
        { "id": "D", "text": "Toàn bộ khu vực bị cắt điện vĩnh viễn", "isCorrect": false }
      ],
      "hint": "Gentrification nâng cấp diện mạo đô thị nhưng có thể làm trầm trọng thêm bất bình đẳng không gian."
    },
    {
      "type": "MC_MULTI",
      "content": "Khi quy mô dân số đô thị phát triển vượt qua ngưỡng tối ưu, những yếu tố 'Phi kinh tế tập tụ' (Diseconomies of Agglomeration) nào sẽ bắt đầu xuất hiện?",
      "points": 15,
      "timeLimit": 30,
      "options": [
        { "id": "A", "text": "Tình trạng ùn tắc giao thông và ô nhiễm môi trường không khí gia tăng nghiêm trọng", "isCorrect": true },
        { "id": "B", "text": "Giá đất đai và chi phí thuê nhà ở tăng vọt vượt khả năng chi trả của đại bộ phận người lao động", "isCorrect": true },
        { "id": "C", "text": "Áp lực quá tải nặng nề lên hạ tầng trường học, bệnh viện và dịch vụ công", "isCorrect": true },
        { "id": "D", "text": "Tất cả người dân đều được nhận lương miễn phí từ chính phủ", "isCorrect": false }
      ],
      "hint": "Lợi thế quy mô chuyển thành bất lợi quy mô khi chi phí ngoại ứng tiêu cực vượt qua lợi ích chia sẻ."
    },
    {
      "type": "TRUE_FALSE",
      "content": "Quy luật Quy mô - Thứ bậc đô thị (Rank-Size Rule hay Zipf's Law) phát biểu rằng dân số của thành phố xếp hạng thứ r xấp xỉ bằng dân số của thành phố lớn nhất chia cho r (Pr = P1 / r).",
      "points": 10,
      "timeLimit": 20,
      "options": [
        { "id": "true", "text": "Đúng (True)", "isCorrect": true },
        { "id": "false", "text": "Sai (False)", "isCorrect": false }
      ],
      "hint": "Quy luật thực nghiệm nổi tiếng phản ánh hệ thống phân tầng thứ bậc đô thị cân bằng."
    },
    {
      "type": "MC_SINGLE",
      "content": "Hiện tượng 'Ngoại vi hóa người nghèo' (Suburbanization of Poverty) trong cấu trúc không gian đô thị hiện đại phản ánh điều gì?",
      "points": 15,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Người nghèo di cư sang quốc gia khác", "isCorrect": false },
        { "id": "B", "text": "Các hộ gia đình thu nhập thấp bị đẩy ra các vùng ngoại ô xa xôi do không chịu nổi giá nhà đắt đỏ ở lõi đô thị", "isCorrect": true },
        { "id": "C", "text": "Trung tâm thành phố trở thành khu ổ chuột", "isCorrect": false },
        { "id": "D", "text": "Ngoại ô không có bất kỳ người dân nào sinh sống", "isCorrect": false }
      ],
      "hint": "Trái ngược với thế kỷ trước, người giàu chiếm giữ lõi trung tâm tiện ích, người nghèo dạt ra vùng ven thiếu hạ tầng."
    },
    {
      "type": "MC_SINGLE",
      "content": "Chính sách 'Thu hồi giá trị gia tăng từ đất' (Land Value Capture - LVC) cho phép chính quyền đô thị thực hiện giải pháp nào?",
      "points": 15,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Thu hồi một phần giá trị địa tô đất đai tăng vọt xung quanh các dự án hạ tầng công cộng (như Metro) để tái tài trợ cho chi phí xây dựng", "isCorrect": true },
        { "id": "B", "text": "Tịch thu toàn bộ đất đai của người dân mà không bồi thường", "isCorrect": false },
        { "id": "C", "text": "Bán toàn bộ công viên thành phố cho tư nhân", "isCorrect": false },
        { "id": "D", "text": "Miễn thuế đất vĩnh viễn cho các tập đoàn nước ngoài", "isCorrect": false }
      ],
      "hint": "Giá trị đất tăng lên do ngân sách đầu tư hạ tầng công cộng cần được tái thu hồi phục vụ cộng đồng."
    },
    {
      "type": "MC_SINGLE",
      "content": "Một siêu đô thị 10 triệu dân đang đối mặt với bài toán tắc đường nghiêm trọng. Thay vì chi 2 tỷ USD để xây thêm 2 tầng cầu cạn trên cao, các chuyên gia kinh tế đô thị khuyến nghị áp dụng hệ thống Thu phí chống ùn tắc thông minh kết hợp dành làn ưu tiên độc quyền cho xe buýt nhanh BRT. Lý do kinh tế học sâu xa nào ủng hộ khuyến nghị này?",
      "points": 30,
      "timeLimit": 35,
      "options": [
        { "id": "A", "text": "Xây cầu cạn sẽ làm tăng tải trọng phương tiện cá nhân theo hiệu ứng Nhu cầu cảm ứng (Induced demand) và làm kẹt xe nghiêm trọng hơn ở các nút giao", "isCorrect": true },
        { "id": "B", "text": "Cầu cạn không cho phép xe ô tô lưu thông", "isCorrect": false },
        { "id": "C", "text": "Xe buýt nhanh hoàn toàn không tốn chi phí nhiên liệu", "isCorrect": false },
        { "id": "D", "text": "Chính quyền thành phố không có quyền cấp phép xây dựng cầu", "isCorrect": false }
      ],
      "hint": "Nội hóa chi phí ngoại ứng kẹt xe và thúc đẩy phương thức công cộng hiệu quả hơn việc tiếp tục chạy đua xây thêm làn cho xe cá nhân."
    }
  ],

  "KTKE1101_Nguyen_ly_ke_toan.json": [
    {
      "type": "MC_SINGLE",
      "content": "Phương trình kế toán mở rộng phản ánh đúng đắn mối quan hệ giữa các thành phần tài chính trong doanh nghiệp là gì?",
      "points": 10,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Tài sản = Nợ phải trả + Vốn góp chủ sở hữu + Doanh thu - Chi phí - Cổ tức rút vốn", "isCorrect": true },
        { "id": "B", "text": "Tài sản = Doanh thu - Chi phí", "isCorrect": false },
        { "id": "C", "text": "Tài sản + Nợ phải trả = Vốn chủ sở hữu", "isCorrect": false },
        { "id": "D", "text": "Tài sản = Tiền mặt + Hàng tồn kho", "isCorrect": false }
      ],
      "hint": "Vốn chủ sở hữu cuối kỳ = Vốn góp ban đầu + Lợi nhuận giữ lại (Doanh thu - Chi phí - Cổ tức)."
    },
    {
      "type": "MC_SINGLE",
      "content": "Doanh nghiệp mua một lô máy móc thiết bị phục vụ sản xuất trị giá 300 triệu đồng, chưa thanh toán cho nhà cung cấp. Nghiệp vụ này làm biến động Bảng cân đối kế toán như thế nào?",
      "points": 10,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Tài sản tăng 300 triệu và Nợ phải trả tăng 300 triệu (Quy mô tài sản tăng)", "isCorrect": true },
        { "id": "B", "text": "Tài sản giảm 300 triệu và Vốn chủ sở hữu giảm 300 triệu", "isCorrect": false },
        { "id": "C", "text": "Một tài sản tăng và một tài sản giảm, tổng tài sản không đổi", "isCorrect": false },
        { "id": "D", "text": "Chỉ làm tăng chi phí trong kỳ, bảng cân đối kế toán không đổi", "isCorrect": false }
      ],
      "hint": "Nợ TK Tài sản cố định (Tăng tài sản) / Có TK Phải trả người bán (Tăng nợ phải trả)."
    },
    {
      "type": "TRUE_FALSE",
      "content": "Theo Nguyên tắc Cơ sở dồn tích (Accrual Basis Accounting), doanh thu chỉ được phép ghi nhận trên sổ sách kế toán khi doanh nghiệp đã thực tế thu được tiền mặt vào quỹ hoặc tài khoản ngân hàng.",
      "points": 10,
      "timeLimit": 20,
      "options": [
        { "id": "true", "text": "Đúng (True)", "isCorrect": false },
        { "id": "false", "text": "Sai (False)", "isCorrect": true }
      ],
      "hint": "Cơ sở dồn tích ghi nhận nghiệp vụ tại thời điểm phát sinh giao dịch chuyển giao hàng hóa/dịch vụ, không phụ thuộc vào thời điểm thực thu hay thực chi tiền."
    },
    {
      "type": "MC_SINGLE",
      "content": "Khách hàng chuyển khoản đặt cọc trước 100 triệu đồng để mua hàng vào tháng sau. Doanh nghiệp ghi nhận khoản tiền nhận trước này vào khoản mục nào trên Báo cáo tài chính?",
      "points": 15,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Doanh thu bán hàng và cung cấp dịch vụ", "isCorrect": false },
        { "id": "B", "text": "Nợ phải trả (Người mua trả tiền trước / Doanh thu chưa thực hiện)", "isCorrect": true },
        { "id": "C", "text": "Vốn góp của chủ sở hữu", "isCorrect": false },
        { "id": "D", "text": "Lợi nhuận sau thuế chưa phân phối", "isCorrect": false }
      ],
      "hint": "Do chưa giao hàng nên doanh nghiệp có nghĩa vụ nợ phải thực hiện giao hàng hoặc hoàn tiền lại."
    },
    {
      "type": "MC_SINGLE",
      "content": "Nguyên tắc 'Phù hợp' (Matching Principle) trong kế toán yêu cầu điều gì?",
      "points": 10,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Chi phí tạo ra doanh thu phải được ghi nhận cùng kỳ kế toán với doanh thu mà nó đóng góp tạo ra", "isCorrect": true },
        { "id": "B", "text": "Mọi khoản chi tiêu đều phải có hóa đơn đỏ hợp lệ", "isCorrect": false },
        { "id": "C", "text": "Lương giám đốc phải phù hợp với lợi nhuận công ty", "isCorrect": false },
        { "id": "D", "text": "Số dư Nợ phải luôn lớn hơn số dư Có", "isCorrect": false }
      ],
      "hint": "Nguyên tắc phù hợp đảm bảo xác định đúng kết quả lãi/lỗ của từng kỳ kinh doanh."
    },
    {
      "type": "MC_MULTI",
      "content": "Tài khoản kế toán nào dưới đây có kết cấu điều chỉnh giảm tài sản (mang số dư bên Có trên Bảng cân đối kế toán)?",
      "points": 15,
      "timeLimit": 30,
      "options": [
        { "id": "A", "text": "Hao mòn lũy kế tài sản cố định (TK 214)", "isCorrect": true },
        { "id": "B", "text": "Dự phòng giảm giá hàng tồn kho (TK 2294)", "isCorrect": true },
        { "id": "C", "text": "Dự phòng tổn thất phải thu khó đòi (TK 2293)", "isCorrect": true },
        { "id": "D", "text": "Tiền gửi ngân hàng (TK 112)", "isCorrect": false }
      ],
      "hint": "Các tài khoản điều chỉnh giảm tài sản mang số dư Có và được ghi âm trên phần Tài sản."
    },
    {
      "type": "TRUE_FALSE",
      "content": "Trong phương pháp tính giá xuất kho FIFO (Nhập trước - Xuất trước), khi giá cả thị trường có xu hướng tăng dần theo thời gian, giá trị hàng tồn kho cuối kỳ trên Bảng cân đối kế toán sẽ phản ánh sát giá thị trường nhất.",
      "points": 10,
      "timeLimit": 20,
      "options": [
        { "id": "true", "text": "Đúng (True)", "isCorrect": true },
        { "id": "false", "text": "Sai (False)", "isCorrect": false }
      ],
      "hint": "FIFO xuất lô hàng cũ giá rẻ trước, hàng tồn kho còn lại là những lô mới mua giá cao gần nhất."
    },
    {
      "type": "MC_SINGLE",
      "content": "Doanh nghiệp trả trước tiền thuê văn phòng 1 năm trị giá 120 triệu đồng bằng tiền chuyển khoản. Tại thời điểm chi tiền, khoản chi này được phân loại là gì?",
      "points": 15,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Chi phí hoạt động ngay lập tức trong tháng đó", "isCorrect": false },
        { "id": "B", "text": "Tài sản ngắn hạn (Chi phí trả trước ngắn hạn - TK 242)", "isCorrect": true },
        { "id": "C", "text": "Nợ phải trả người bán", "isCorrect": false },
        { "id": "D", "text": "Khoản lỗ bất thường", "isCorrect": false }
      ],
      "hint": "Tiền đã chi trước mang lại quyền sử dụng trong tương lai nên là Tài sản, sau đó phân bổ dần từng tháng."
    },
    {
      "type": "MC_SINGLE",
      "content": "Báo cáo Lưu chuyển tiền tệ (Cash Flow Statement) phân loại các luồng tiền thu - chi thành 3 hoạt động căn bản nào?",
      "points": 15,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Hoạt động kinh doanh, Hoạt động đầu tư và Hoạt động tài chính", "isCorrect": true },
        { "id": "B", "text": "Hoạt động mua hàng, Hoạt động bán hàng và Hoạt động quảng cáo", "isCorrect": false },
        { "id": "C", "text": "Hoạt động nội bộ, Hoạt động đối ngoại và Hoạt động từ thiện", "isCorrect": false },
        { "id": "D", "text": "Hoạt động ngắn hạn, Hoạt động trung hạn và Hoạt động dài hạn", "isCorrect": false }
      ],
      "hint": "Operating (kinh doanh), Investing (đầu tư tài sản), Financing (vốn vay và vốn chủ)."
    },
    {
      "type": "MC_SINGLE",
      "content": "Khoản mục 'Lợi nhuận sau thuế chưa phân phối' được trình bày ở phần nào trên Bảng cân đối kế toán?",
      "points": 10,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Tài sản ngắn hạn", "isCorrect": false },
        { "id": "B", "text": "Nợ phải trả ngắn hạn", "isCorrect": false },
        { "id": "C", "text": "Vốn chủ sở hữu (Equity)", "isCorrect": true },
        { "id": "D", "text": "Tài sản dài hạn vô hình", "isCorrect": false }
      ],
      "hint": "Lợi nhuận tích lũy thuộc quyền sở hữu của các cổ đông/chủ sở hữu doanh nghiệp."
    },
    {
      "type": "MC_MULTI",
      "content": "Những nghiệp vụ kinh tế nào dưới đây chỉ làm thay đổi cơ cấu bên trong của Tài sản mà KHÔNG làm thay đổi tổng quy mô tài sản của doanh nghiệp?",
      "points": 15,
      "timeLimit": 30,
      "options": [
        { "id": "A", "text": "Rút tiền gửi ngân hàng về nhập quỹ tiền mặt", "isCorrect": true },
        { "id": "B", "text": "Thu hồi nợ của khách hàng bằng tiền chuyển khoản", "isCorrect": true },
        { "id": "C", "text": "Mua nguyên vật liệu nhập kho thanh toán ngay bằng tiền mặt", "isCorrect": true },
        { "id": "D", "text": "Vay ngân hàng ngắn hạn để thanh toán nợ cho người bán", "isCorrect": false }
      ],
      "hint": "Nghiệp vụ hoán đổi giữa các khoản mục tài sản (tiền mặt, tiền gửi, phải thu, hàng tồn kho) giữ nguyên tổng tài sản."
    },
    {
      "type": "TRUE_FALSE",
      "content": "Nếu Bảng cân đối thử (Trial Balance) có Tổng số dư Nợ bằng đúng Tổng số dư Có, điều này chứng minh chắc chắn 100% rằng sổ sách kế toán hoàn toàn không có bất kỳ lỗi sai sót nào.",
      "points": 10,
      "timeLimit": 20,
      "options": [
        { "id": "true", "text": "Đúng (True)", "isCorrect": false },
        { "id": "false", "text": "Sai (False)", "isCorrect": true }
      ],
      "hint": "Cân đối Nợ - Có không phát hiện được lỗi bỏ sót nguyên một bút toán, ghi sai tài khoản cùng chiều, hoặc sai sót số tiền bù trừ cho nhau."
    },
    {
      "type": "MC_SINGLE",
      "content": "Nguyên tắc 'Thận trọng' (Prudence / Conservatism) trong kế toán quy định việc ghi nhận doanh thu và chi phí như thế nào?",
      "points": 15,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "Ghi nhận chi phí và tổn thất ngay khi có bằng chứng khả dĩ, nhưng chỉ ghi nhận doanh thu khi có bằng chứng chắc chắn", "isCorrect": true },
        { "id": "B", "text": "Luôn luôn ghi nhận doanh thu ở mức cao nhất có thể dự đoán", "isCorrect": false },
        { "id": "C", "text": "Không bao giờ được ghi nhận chi phí khấu hao", "isCorrect": false },
        { "id": "D", "text": "Giấu bớt các khoản nợ vay ngân hàng", "isCorrect": false }
      ],
      "hint": "Không lập ước tính quá cao về tài sản và thu nhập, cũng như không ước tính quá thấp về nợ và chi phí."
    },
    {
      "type": "MC_SINGLE",
      "content": "Doanh nghiệp mua một xe tải chở hàng có nguyên giá 600 triệu đồng, thời gian sử dụng ước tính là 5 năm, giá trị thanh lý ước tính bằng 0. Theo phương pháp khấu hao đường thẳng, mức trích khấu hao hàng tháng là bao nhiêu?",
      "points": 15,
      "timeLimit": 25,
      "options": [
        { "id": "A", "text": "10 triệu đồng/tháng", "isCorrect": true },
        { "id": "B", "text": "12 triệu đồng/tháng", "isCorrect": false },
        { "id": "C", "text": "15 triệu đồng/tháng", "isCorrect": false },
        { "id": "D", "text": "50 triệu đồng/tháng", "isCorrect": false }
      ],
      "hint": "Khấu hao năm = 600 / 5 = 120 triệu/năm. Khấu hao tháng = 120 / 12 = 10 triệu đồng/tháng."
    },
    {
      "type": "MC_SINGLE",
      "content": "Doanh nghiệp xuất kho một lô hàng hóa có giá vốn là 80 triệu đồng bán cho khách hàng với giá bán chưa thuế là 120 triệu đồng (thuế GTGT phương pháp khấu trừ 10%), khách hàng chưa thanh toán tiền hàng. Kế toán phản ánh giá vốn và doanh thu của nghiệp vụ này như thế nào?",
      "points": 30,
      "timeLimit": 35,
      "options": [
        { "id": "A", "text": "Giá vốn: Nợ TK 632 / Có TK 156: 80 triệu; Doanh thu: Nợ TK 131: 132 triệu / Có TK 511: 120 triệu / Có TK 3331: 12 triệu", "isCorrect": true },
        { "id": "B", "text": "Chỉ ghi nhận dòng tiền mặt tăng 132 triệu", "isCorrect": false },
        { "id": "C", "text": "Ghi nhận doanh thu thuần là 132 triệu đồng", "isCorrect": false },
        { "id": "D", "text": "Không ghi nhận gì cho đến khi khách hàng trả tiền", "isCorrect": false }
      ],
      "hint": "Kế toán bán hàng gồm 2 bút toán song song: phản ánh giá vốn hàng bán và phản ánh doanh thu bán hàng."
    }
  ]
};

// Process each file
for (const [filename, newQuestions] of Object.entries(additionalQuestions)) {
  const filePath = path.join(publicBanksDir, filename);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    continue;
  }

  const existingData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  console.log(`Processing ${filename}: current questions count = ${existingData.length}`);

  // Take the first 10 questions and append the 15 new ones
  const baseQuestions = existingData.slice(0, 10);
  const combined = [...baseQuestions, ...newQuestions];

  fs.writeFileSync(filePath, JSON.stringify(combined, null, 2), "utf-8");
  console.log(`✅ Successfully updated ${filename} to ${combined.length} questions`);
}

// Update index.json
const indexPath = path.join(publicBanksDir, "index.json");
if (fs.existsSync(indexPath)) {
  const manifest = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
  manifest.forEach((item) => {
    item.totalQuestions = 25;
  });
  fs.writeFileSync(indexPath, JSON.stringify(manifest, null, 2), "utf-8");
  console.log(`✅ Successfully updated index.json with totalQuestions = 25 for all banks`);
}

console.log("All done!");
