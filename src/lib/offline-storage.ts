// Quizorra - Offline Storage & Sync Engine
// Manages local quiz banks, offline drafts, preset banks, and background sync.

export interface OfflineQuestion {
  id?: string;
  type: string;
  content: string;
  options?: { id: string; text: string; isCorrect: boolean }[];
  answer?: string;
  pairs?: { id?: string; left: string; right: string }[];
  points: number;
  timeLimit: number;
  hint?: string;
  isTieBreaker?: boolean;
}

export interface OfflineQuizBank {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  questions?: OfflineQuestion[];
  _count?: { questions: number };
  isLocalOnly?: boolean;
  needsSync?: boolean;
}

const LOCAL_BANKS_KEY = "timeout_quiz_offline_banks";
const SYNC_QUEUE_KEY = "timeout_quiz_sync_queue";

// Default Preset Quiz Bank (always available offline)
export const DEFAULT_OFFLINE_BANK: OfflineQuizBank = {
  "id": "bank_offline_preset_default",
  "title": "Bộ Đề Mẫu Đa Chế Độ (Offline Preset - 45 Câu Chuẩn Hóa)",
  "description": "45 câu hỏi toàn diện đầy đủ 7 dạng thức và phân bổ điểm chuẩn mực (22% câu 10đ, 36% câu 20đ, 29% câu 30đ, 13% câu 40đ) chạy siêu mượt không cần mạng",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "isLocalOnly": true,
  "_count": {
    "questions": 45
  },
  "questions": [
    {
        "id": "q_off_1",
        "type": "MC_SINGLE",
        "content": "Trong quy trình lập kế hoạch kinh doanh tiêu chuẩn, bước đầu tiên mang tính nền tảng quyết định hướng đi là gì?",
        "points": 10,
        "timeLimit": 15,
        "options": [
            {
                "id": "A",
                "text": "Phân bổ ngân sách tài chính",
                "isCorrect": false
            },
            {
                "id": "B",
                "text": "Nhận thức cơ hội và đánh giá hiện trạng",
                "isCorrect": true
            },
            {
                "id": "C",
                "text": "Lựa chọn phương án tối ưu",
                "isCorrect": false
            },
            {
                "id": "D",
                "text": "Xây dựng các kế hoạch tác nghiệp",
                "isCorrect": false
            }
        ],
        "hint": "Cần thấu hiểu bối cảnh thị trường, điểm mạnh/yếu trước khi định hình mục tiêu.",
        "isTieBreaker": false
    },
    {
        "id": "q_off_2",
        "type": "MC_SINGLE",
        "content": "Theo tiêu chí SMART, chữ 'M' trong một mục tiêu kế hoạch hiệu quả đại diện cho đặc tính nào?",
        "points": 10,
        "timeLimit": 15,
        "options": [
            {
                "id": "A",
                "text": "Motivated (Có tính thúc đẩy)",
                "isCorrect": false
            },
            {
                "id": "B",
                "text": "Measurable (Đo lường được)",
                "isCorrect": true
            },
            {
                "id": "C",
                "text": "Manageable (Quản lý được)",
                "isCorrect": false
            },
            {
                "id": "D",
                "text": "Meaningful (Có ý nghĩa sâu sắc)",
                "isCorrect": false
            }
        ],
        "hint": "Mục tiêu phải gắn liền với chỉ số định lượng cụ thể để kiểm tra kết quả.",
        "isTieBreaker": false
    },
    {
        "id": "q_off_3",
        "type": "MC_MULTI",
        "content": "Phương pháp dự báo định tính nào dưới đây thu thập ý kiến chuyên gia qua nhiều vòng ẩn danh và phản hồi tổng hợp nhằm đạt được sự đồng thuận cao?",
        "points": 10,
        "timeLimit": 15,
        "options": [
            {
                "id": "A",
                "text": "Kỹ thuật Delphi",
                "isCorrect": true
            },
            {
                "id": "B",
                "text": "Phương pháp điều tra khảo sát chuyên gia độc lập",
                "isCorrect": true
            },
            {
                "id": "C",
                "text": "Phân tích hồi quy chuỗi thời gian",
                "isCorrect": false
            },
            {
                "id": "D",
                "text": "Phương pháp san bằng số mũ (Exponential smoothing)",
                "isCorrect": false
            }
        ],
        "hint": "Hai phương án định tính dựa trên trí tuệ tập thể chuyên gia mà không cần họp mặt trực tiếp.",
        "isTieBreaker": false
    },
    {
        "id": "q_off_4",
        "type": "MC_SINGLE",
        "content": "Phương pháp lập ngân sách nào yêu cầu mọi khoản chi phí đều phải được giải trình và chứng minh lại từ đầu cho mỗi kỳ kế hoạch mới, bất kể ngân sách kỳ trước là bao nhiêu?",
        "points": 10,
        "timeLimit": 15,
        "options": [
            {
                "id": "A",
                "text": "Ngân sách gia tăng (Incremental Budgeting)",
                "isCorrect": false
            },
            {
                "id": "B",
                "text": "Ngân sách gốc 0 (Zero-based Budgeting - ZBB)",
                "isCorrect": true
            },
            {
                "id": "C",
                "text": "Ngân sách cố định (Static Budgeting)",
                "isCorrect": false
            },
            {
                "id": "D",
                "text": "Ngân sách linh hoạt (Flexible Budgeting)",
                "isCorrect": false
            }
        ],
        "hint": "Bắt đầu mỗi chu kỳ từ con số 0 để loại trừ các khoản lãng phí tồn dư của quá khứ.",
        "isTieBreaker": false
    },
    {
        "id": "q_off_5",
        "type": "TRUE_FALSE",
        "content": "Kế hoạch chiến lược thường có tầm nhìn dài hạn (từ 3 đến 5 năm trở lên), do nhà quản trị cấp cao phê duyệt và tập trung vào các mục tiêu tổng thể của toàn tổ chức.",
        "points": 20,
        "timeLimit": 20,
        "options": [
            {
                "id": "true",
                "text": "Đúng (True)",
                "isCorrect": true
            },
            {
                "id": "false",
                "text": "Sai (False)",
                "isCorrect": false
            }
        ],
        "hint": "Phân biệt kế hoạch chiến lược dài hạn với kế hoạch tác nghiệp ngắn hạn phục vụ công việc hàng ngày.",
        "isTieBreaker": false
    },
    {
        "id": "q_off_6",
        "type": "FILL_BLANK",
        "content": "Phương pháp quản lý theo mục tiêu phổ biến trong lập kế hoạch, nơi cấp trên và cấp dưới cùng thống nhất xác định mục tiêu và tiêu chuẩn đánh giá, viết tắt là gì?",
        "answer": "MBO",
        "points": 20,
        "timeLimit": 20,
        "hint": "Viết tắt của 3 chữ cái tiếng Anh: Management by Objectives.",
        "isTieBreaker": false
    },
    {
        "id": "q_off_7",
        "type": "MC_SINGLE",
        "content": "Trong ma trận SWOT, việc kết hợp giữa 'Điểm mạnh bên trong' (Strengths) và 'Cơ hội bên ngoài' (Opportunities) sẽ hình thành nên chiến lược nào?",
        "points": 20,
        "timeLimit": 20,
        "options": [
            {
                "id": "A",
                "text": "Chiến lược SO (Tấn công / Tận dụng tối đa)",
                "isCorrect": true
            },
            {
                "id": "B",
                "text": "Chiến lược WO (Khắc phục điểm yếu đón cơ hội)",
                "isCorrect": false
            },
            {
                "id": "C",
                "text": "Chiến lược ST (Phòng thủ trước nguy cơ)",
                "isCorrect": false
            },
            {
                "id": "D",
                "text": "Chiến lược WT (Cắt giảm thiệt hại / Rút lui)",
                "isCorrect": false
            }
        ],
        "hint": "Sử dụng ưu thế nội lực để nắm bắt thời cơ vàng từ thị trường.",
        "isTieBreaker": false
    },
    {
        "id": "q_off_8",
        "type": "TRUE_FALSE",
        "content": "Kế hoạch dự phòng (Contingency plan) là bản kế hoạch chỉ được kích hoạt khi các sự cố hoặc kịch bản rủi ro bất khả kháng đã được dự báo trước xảy ra.",
        "points": 20,
        "timeLimit": 20,
        "options": [
            {
                "id": "true",
                "text": "Đúng (True)",
                "isCorrect": true
            },
            {
                "id": "false",
                "text": "Sai (False)",
                "isCorrect": false
            }
        ],
        "hint": "Kế hoạch Phương án B (Plan B) phòng khi hoàn cảnh môi trường biến động lớn.",
        "isTieBreaker": false
    },
    {
        "id": "q_off_9",
        "type": "MC_SINGLE",
        "content": "Trong ma trận BCG, đơn vị kinh doanh chiến lược (SBU) có thị phần tương đối cao nhưng hoạt động trong ngành có tốc độ tăng trưởng thấp được xếp vào ô nào?",
        "points": 20,
        "timeLimit": 20,
        "options": [
            {
                "id": "A",
                "text": "Ngôi sao (Stars)",
                "isCorrect": false
            },
            {
                "id": "B",
                "text": "Bò sữa (Cash Cows)",
                "isCorrect": true
            },
            {
                "id": "C",
                "text": "Dấu hỏi (Question Marks)",
                "isCorrect": false
            },
            {
                "id": "D",
                "text": "Chó mực (Dogs)",
                "isCorrect": false
            }
        ],
        "hint": "Tạo ra dòng tiền dồi dào để nuôi dưỡng các mảng kinh doanh khác mà không cần tái đầu tư lớn.",
        "isTieBreaker": false
    },
    {
        "id": "q_off_10",
        "type": "MC_SINGLE",
        "content": "Tình huống: Một doanh nghiệp bán lẻ xây dựng bản kế hoạch mở rộng chuỗi cửa hàng chi tiết trong 2 năm. Tuy nhiên sau 6 tháng thực hiện, doanh số sụt giảm mạnh do xuất hiện xu hướng mua sắm trực tuyến tăng vọt bất ngờ và chi phí mặt bằng tăng cao. Yếu tố cốt lõi nào khiến bản kế hoạch trên thất bại?",
        "points": 20,
        "timeLimit": 20,
        "options": [
            {
                "id": "A",
                "text": "Doanh nghiệp lập kế hoạch quá cứng nhắc, thiếu tính thích ứng động và không xây dựng các kịch bản dự phòng với biến động môi trường",
                "isCorrect": true
            },
            {
                "id": "B",
                "text": "Doanh nghiệp chi quá nhiều kinh phí cho việc nghiên cứu thị trường ban đầu theo các quy định thông thường",
                "isCorrect": false
            },
            {
                "id": "C",
                "text": "Doanh nghiệp phân bổ sai thẩm quyền giữa ban giám đốc và các cửa hàng trưởng theo các quy định thông thường",
                "isCorrect": false
            },
            {
                "id": "D",
                "text": "Doanh nghiệp áp dụng sai cấu trúc ma trận SWOT khi đánh giá năng lực nội bộ theo các quy định thông thường",
                "isCorrect": false
            }
        ],
        "hint": "Tính linh hoạt và khả năng thích ứng với biến động môi trường là yếu tố sống còn của lập kế hoạch.",
        "isTieBreaker": false
    },
    {
        "id": "q_off_11",
        "type": "MC_SINGLE",
        "content": "Trong ma trận phân tích SWOT, chiến lược WO (Weaknesses - Opportunities) hướng đến mục tiêu hành động nào?",
        "points": 20,
        "timeLimit": 20,
        "options": [
            {
                "id": "A",
                "text": "Sử dụng điểm mạnh nội bộ để nắm bắt cơ hội bên ngoài theo các quy định thông thường",
                "isCorrect": false
            },
            {
                "id": "B",
                "text": "Tận dụng các cơ hội từ môi trường bên ngoài để khắc phục và hóa giải các điểm yếu nội bộ",
                "isCorrect": true
            },
            {
                "id": "C",
                "text": "Tối thiểu hóa điểm yếu để tránh né các nguy cơ đe dọa",
                "isCorrect": false
            },
            {
                "id": "D",
                "text": "Sử dụng điểm mạnh để phòng thủ trước các nguy cơ cạnh tranh",
                "isCorrect": false
            }
        ],
        "hint": "WO là chiến lược cải thiện điểm yếu bằng cách đón đầu cơ hội mở ra trên thị trường.",
        "isTieBreaker": false
    },
    {
        "id": "q_off_12",
        "type": "MC_SINGLE",
        "content": "Trong ma trận danh mục đầu tư BCG của Boston Consulting Group, đơn vị kinh doanh chiến lược (SBU) có thị phần tương đối cao trong một ngành có tốc độ tăng trưởng thấp được xếp vào ô nào?",
        "points": 20,
        "timeLimit": 20,
        "options": [
            {
                "id": "A",
                "text": "Ngôi sao (Star)",
                "isCorrect": false
            },
            {
                "id": "B",
                "text": "Bò sữa tiền mặt (Cash Cow)",
                "isCorrect": true
            },
            {
                "id": "C",
                "text": "Dấu hỏi (Question Mark)",
                "isCorrect": false
            },
            {
                "id": "D",
                "text": "Chó mực (Dog)",
                "isCorrect": false
            }
        ],
        "hint": "Bò sữa sinh ra dòng tiền mặt dồi dào mà không đòi hỏi tái đầu tư vốn quá nhiều.",
        "isTieBreaker": false
    },
    {
        "id": "q_off_13",
        "type": "TRUE_FALSE",
        "content": "Kế hoạch dự phòng (Contingency Planning) là việc xác định trước các phương án hành động thay thế khả dĩ khi xảy ra những biến cố bất ngờ làm gián đoạn kế hoạch tác nghiệp ban đầu.",
        "points": 30,
        "timeLimit": 30,
        "options": [
            {
                "id": "true",
                "text": "Đúng (True)",
                "isCorrect": true
            },
            {
                "id": "false",
                "text": "Sai (False)",
                "isCorrect": false
            }
        ],
        "hint": "Kế hoạch B/C giúp doanh nghiệp chủ động ứng phó rủi ro đứt gãy hoạt động.",
        "isTieBreaker": false
    },
    {
        "id": "q_off_14",
        "type": "MC_SINGLE",
        "content": "Trong phương pháp dự báo san bằng mũ (Exponential Smoothing), trọng số lớn nhất được gán cho đại lượng nào?",
        "points": 30,
        "timeLimit": 30,
        "options": [
            {
                "id": "A",
                "text": "Số liệu thực tế của kỳ xa nhất trong lịch sử",
                "isCorrect": false
            },
            {
                "id": "B",
                "text": "Số liệu thực tế của kỳ gần nhất vừa diễn ra",
                "isCorrect": true
            },
            {
                "id": "C",
                "text": "Trung bình cộng của toàn bộ số liệu 10 năm trước",
                "isCorrect": false
            },
            {
                "id": "D",
                "text": "Số liệu dự báo trung bình ngành",
                "isCorrect": false
            }
        ],
        "hint": "Các quan sát càng mới càng chứa nhiều thông tin cập nhật nên nhận trọng số mũ cao nhất.",
        "isTieBreaker": false
    },
    {
        "id": "q_off_15",
        "type": "MC_SINGLE",
        "content": "Trong ma trận 9 ô GE-McKinsey dùng để lập kế hoạch danh mục kinh doanh, hai trục đánh giá bao gồm những yếu tố nào?",
        "points": 30,
        "timeLimit": 30,
        "options": [
            {
                "id": "A",
                "text": "Thị phần tương đối và Tốc độ tăng trưởng thị trường",
                "isCorrect": false
            },
            {
                "id": "B",
                "text": "Sức hấp dẫn của ngành và Sức mạnh cạnh tranh của đơn vị kinh doanh",
                "isCorrect": true
            },
            {
                "id": "C",
                "text": "Doanh thu thuần và Chi phí vận hành theo các quy định thông thường",
                "isCorrect": false
            },
            {
                "id": "D",
                "text": "Chỉ số P/E và Vốn hóa thị trường theo các quy định thông thường",
                "isCorrect": false
            }
        ],
        "hint": "GE-McKinsey là bước phát triển đa chiều toàn diện hơn so với ma trận 4 ô của BCG.",
        "isTieBreaker": false
    },
    {
        "id": "q_off_16",
        "type": "MC_MULTI",
        "content": "Theo mô hình 5 áp lực cạnh tranh của Michael Porter (Five Forces), những yếu tố nào quyết định mức độ hấp dẫn và tỷ suất sinh lời của ngành?",
        "points": 30,
        "timeLimit": 30,
        "options": [
            {
                "id": "A",
                "text": "Cường độ cạnh tranh giữa các đối thủ hiện tại trong ngành",
                "isCorrect": true
            },
            {
                "id": "B",
                "text": "Nguy cơ đe dọa xâm nhập từ các đối thủ tiềm năng mới",
                "isCorrect": true
            },
            {
                "id": "C",
                "text": "Quyền lực thương lượng đàm phán của nhà cung cấp và khách hàng",
                "isCorrect": true
            },
            {
                "id": "D",
                "text": "Mối đe dọa từ các sản phẩm và dịch vụ thay thế",
                "isCorrect": true
            }
        ],
        "hint": "Cả 5 lực lượng này tạo nên cấu trúc cạnh tranh toàn diện của một ngành kinh doanh.",
        "isTieBreaker": false
    },
    {
        "id": "q_off_17",
        "type": "MC_SINGLE",
        "content": "Chiến lược 'Tích hợp ngược về phía sau' (Backward Vertical Integration) trong hoạch định chiến lược kinh doanh có nghĩa là gì?",
        "points": 30,
        "timeLimit": 30,
        "options": [
            {
                "id": "A",
                "text": "Mua lại các kênh phân phối bán lẻ đưa sản phẩm tới tay người dùng cuối",
                "isCorrect": false
            },
            {
                "id": "B",
                "text": "Đầu tư kiểm soát hoặc sáp nhập các nhà cung ứng nguyên vật liệu đầu vào của chính mình",
                "isCorrect": true
            },
            {
                "id": "C",
                "text": "Thu hẹp quy mô sản xuất để bán bớt nhà máy theo các quy định thông thường",
                "isCorrect": false
            },
            {
                "id": "D",
                "text": "Đa dạng hóa sang lĩnh vực hoàn toàn không liên quan theo các quy định thông thường",
                "isCorrect": false
            }
        ],
        "hint": "Đi ngược về nguồn cung ứng để chủ động giá thành và chuỗi cung ứng vật tư.",
        "isTieBreaker": false
    },
    {
        "id": "q_off_18",
        "type": "TRUE_FALSE",
        "content": "Phương pháp Quản trị theo mục tiêu (MBO - Management by Objectives) là quá trình trong đó mục tiêu do Tổng giám đốc đơn phương ấn định và áp đặt hoàn toàn từ trên xuống mà không cần thảo luận với cấp dưới.",
        "points": 30,
        "timeLimit": 30,
        "options": [
            {
                "id": "true",
                "text": "Đúng (True)",
                "isCorrect": false
            },
            {
                "id": "false",
                "text": "Sai (False)",
                "isCorrect": true
            }
        ],
        "hint": "Bản chất cốt lõi của MBO là sự tham gia hiệp thương cùng xác lập mục tiêu giữa cấp trên và cấp dưới.",
        "isTieBreaker": false
    },
    {
        "id": "q_off_19",
        "type": "MC_SINGLE",
        "content": "Phương pháp lập kế hoạch theo kịch bản (Scenario Planning) phát huy giá trị cao nhất trong điều kiện môi trường nào?",
        "points": 30,
        "timeLimit": 30,
        "options": [
            {
                "id": "A",
                "text": "Môi trường ổn định hoàn toàn có thể dự báo chính xác bằng một con số duy nhất",
                "isCorrect": false
            },
            {
                "id": "B",
                "text": "Môi trường có độ phức tạp và bất định cao, xuất hiện nhiều biến số khó lường",
                "isCorrect": true
            },
            {
                "id": "C",
                "text": "Khi công ty chuẩn bị giải thể theo các quy định thông thường",
                "isCorrect": false
            },
            {
                "id": "D",
                "text": "Khi công ty độc quyền tuyệt đối theo các quy định thông thường",
                "isCorrect": false
            }
        ],
        "hint": "Kịch bản giúp chuẩn bị cho nhiều tương lai khả dĩ khác nhau (kịch bản lạc quan, cơ sở, bi quan).",
        "isTieBreaker": false
    },
    {
        "id": "q_off_20",
        "type": "MC_SINGLE",
        "content": "Một tập đoàn bán lẻ điện máy lập kế hoạch mở thêm 30 siêu thị mới trong năm tài chính. Khi phân tích ngân sách dự án vốn đầu tư (CapEx), chỉ số tài chính nào cho biết tỷ suất sinh lời thực tế làm cho Giá trị hiện giá thuần (NPV) của dự án bằng đúng 0?",
        "points": 30,
        "timeLimit": 30,
        "options": [
            {
                "id": "A",
                "text": "Thời gian hoàn vốn giản đơn (Payback Period)",
                "isCorrect": false
            },
            {
                "id": "B",
                "text": "Tỷ suất hoàn vốn nội bộ (Internal Rate of Return - IRR)",
                "isCorrect": true
            },
            {
                "id": "C",
                "text": "Hệ số thanh toán hiện hành (Current Ratio)",
                "isCorrect": false
            },
            {
                "id": "D",
                "text": "Chỉ số biên lợi nhuận ròng (Net Profit Margin)",
                "isCorrect": false
            }
        ],
        "hint": "IRR là tỷ lệ chiết khấu mà tại đó NPV = 0; nếu IRR > chi phí sử dụng vốn WACC thì dự án đáng giá để đầu tư.",
        "isTieBreaker": false
    },
    {
        "id": "q_off_21",
        "type": "MC_SINGLE",
        "content": "Một doanh nghiệp dự báo nhu cầu sản phẩm cho tháng 4 bằng phương pháp San bằng mũ giản đơn với hệ số san bằng alpha = 0.3. Nhu cầu thực tế tháng 3 là 1.200 sản phẩm, dự báo tháng 3 trước đó là 1.100 sản phẩm. Dự báo nhu cầu bán hàng cho tháng 4 là bao nhiêu sản phẩm?",
        "points": 40,
        "timeLimit": 60,
        "options": [
            {
                "id": "A",
                "text": "1.130 sản phẩm",
                "isCorrect": true
            },
            {
                "id": "B",
                "text": "1.150 sản phẩm",
                "isCorrect": false
            },
            {
                "id": "C",
                "text": "1.170 sản phẩm",
                "isCorrect": false
            },
            {
                "id": "D",
                "text": "1.100 sản phẩm",
                "isCorrect": false
            }
        ],
        "hint": "F4 = F3 + alpha * (A3 - F3) = 1.100 + 0.3 * (1.200 - 1.100) = 1.100 + 30 = 1.130 sản phẩm.",
        "isTieBreaker": false
    },
    {
        "id": "q_off_22",
        "type": "MC_SINGLE",
        "content": "Dự án đầu tư mở rộng của công ty có vốn đầu tư ban đầu 1.000 triệu đồng tại năm 0. Dòng tiền thuần hàng năm thu về trong 3 năm lần lượt là 400 triệu (năm 1), 500 triệu (năm 2), và 600 triệu (năm 3). Tỷ lệ chiết khấu chi phí vốn r = 10%. Giá trị hiện giá thuần (NPV) của dự án này xấp xỉ bằng bao nhiêu?",
        "points": 40,
        "timeLimit": 60,
        "options": [
            {
                "id": "A",
                "text": "+227,6 triệu đồng",
                "isCorrect": true
            },
            {
                "id": "B",
                "text": "+185,4 triệu đồng",
                "isCorrect": false
            },
            {
                "id": "C",
                "text": "+310,2 triệu đồng",
                "isCorrect": false
            },
            {
                "id": "D",
                "text": "-50,0 triệu đồng",
                "isCorrect": false
            }
        ],
        "hint": "PV = 400/1.1 + 500/(1.1^2) + 600/(1.1^3) = 363.64 + 413.22 + 450.79 = 1.227.65 triệu. NPV = 1.227.65 - 1.000 = +227.65 triệu đồng.",
        "isTieBreaker": false
    },
    {
        "id": "q_off_23",
        "type": "MATCHING",
        "content": "Hãy ghép đúng 4 ô trong Ma trận phân tích danh mục đầu tư BCG với định hướng chiến lược tương ứng:",
        "points": 40,
        "timeLimit": 60,
        "pairs": [
            {
                "id": "p1",
                "left": "Ô Ngôi Sao (Stars)",
                "right": "Tăng trưởng cao, thị phần cao: Đầu tư duy trì vị thế dẫn đầu"
            },
            {
                "id": "p2",
                "left": "Ô Bò Sữa (Cash Cows)",
                "right": "Tăng trưởng thấp, thị phần cao: Thu hoạch dòng tiền tối đa"
            },
            {
                "id": "p3",
                "left": "Ô Dấu Hỏi (Question Marks)",
                "right": "Tăng trưởng cao, thị phần thấp: Đánh giá chọn lọc để tái đầu tư hoặc rút lui"
            },
            {
                "id": "p4",
                "left": "Ô Chó Mực (Dogs)",
                "right": "Tăng trưởng thấp, thị phần thấp: Cân nhắc giải thể hoặc thoái vốn"
            }
        ],
        "options": [
            {
                "id": "A",
                "text": "1-A, 2-B, 3-C, 4-D",
                "isCorrect": true
            },
            {
                "id": "B",
                "text": "1-B, 2-A, 3-D, 4-C",
                "isCorrect": false
            },
            {
                "id": "C",
                "text": "1-C, 2-D, 3-A, 4-B",
                "isCorrect": false
            },
            {
                "id": "D",
                "text": "1-D, 2-C, 3-B, 4-A",
                "isCorrect": false
            }
        ],
        "hint": "Ma trận BCG cổ điển của Boston Consulting Group.",
        "isTieBreaker": false
    },
    {
        "id": "q_off_24",
        "type": "DRAG_DROP",
        "content": "Hãy sắp xếp đúng thứ tự các bước trong quy trình lập kế hoạch kinh doanh chiến lược toàn diện:",
        "points": 40,
        "timeLimit": 60,
        "options": [
            {
                "id": "STEP_1",
                "text": "Xác định Sứ mệnh, Tầm nhìn và Mục tiêu chiến lược",
                "isCorrect": true
            },
            {
                "id": "STEP_2",
                "text": "Phân tích môi trường vĩ mô và vi mô (PESTLE & SWOT)",
                "isCorrect": true
            },
            {
                "id": "STEP_3",
                "text": "Hình thành và lựa chọn các phương án chiến lược khả thi",
                "isCorrect": true
            },
            {
                "id": "STEP_4",
                "text": "Xây dựng kế hoạch tác nghiệp và phân bổ nguồn lực ngân sách",
                "isCorrect": true
            },
            {
                "id": "STEP_5",
                "text": "Triển khai thực hiện, theo dõi đo lường và điều chỉnh kế hoạch",
                "isCorrect": true
            }
        ],
        "hint": "Sứ mệnh -> Phân tích môi trường -> Lựa chọn chiến lược -> Kế hoạch tác nghiệp -> Đo lường kiểm soát.",
        "isTieBreaker": false
    },
    {
        "id": "q_off_25",
        "type": "MC_SINGLE",
        "content": "[CÂU HỎI PHỤ - LẬP KẾ HOẠCH] Chữ 'R' trong nguyên tắc thiết lập mục tiêu SMART đại diện cho tiêu chí nào?",
        "points": 20,
        "timeLimit": 20,
        "isTieBreaker": true,
        "options": [
            {
                "id": "A",
                "text": "Rapid (Nhanh chóng) theo các quy định thông thường",
                "isCorrect": false
            },
            {
                "id": "B",
                "text": "Relevant / Realistic (Phù hợp / Thực tế)",
                "isCorrect": true
            },
            {
                "id": "C",
                "text": "Resilient (Bền bỉ) theo các quy định thông thường",
                "isCorrect": false
            },
            {
                "id": "D",
                "text": "Routine (Thường nhật) theo các quy định thông thường",
                "isCorrect": false
            }
        ],
        "hint": "Mục tiêu phải gắn liền với tầm nhìn chiến lược và có tính khả thi thực tế."
    },
    {
        "id": "q_off_26",
        "type": "MC_SINGLE",
        "content": "[CÂU HỎI PHỤ - LẬP KẾ HOẠCH] Trong ma trận BCG, đơn vị kinh doanh chiến lược (SBU) có thị phần cao trong một ngành tăng trưởng chậm được gọi là gì?",
        "points": 20,
        "timeLimit": 20,
        "isTieBreaker": true,
        "options": [
            {
                "id": "A",
                "text": "Ngôi sao (Star)",
                "isCorrect": false
            },
            {
                "id": "B",
                "text": "Bò sữa (Cash Cow)",
                "isCorrect": true
            },
            {
                "id": "C",
                "text": "Dấu hỏi (Question Mark)",
                "isCorrect": false
            },
            {
                "id": "D",
                "text": "Con chó (Dog)",
                "isCorrect": false
            }
        ],
        "hint": "Đơn vị mang lại dòng tiền dồi dào để tài trợ cho các đơn vị kinh doanh khác."
    },
    {
        "id": "q_off_27",
        "type": "MC_SINGLE",
        "content": "[CÂU HỎI PHỤ - LẬP KẾ HOẠCH] Trong phân tích PESTEL, yếu tố nào khảo sát về biến động tỷ giá, lãi suất và lạm phát?",
        "points": 30,
        "timeLimit": 30,
        "isTieBreaker": true,
        "options": [
            {
                "id": "A",
                "text": "Political (Chính trị)",
                "isCorrect": false
            },
            {
                "id": "B",
                "text": "Economic (Kinh tế)",
                "isCorrect": true
            },
            {
                "id": "C",
                "text": "Social (Xã hội)",
                "isCorrect": false
            },
            {
                "id": "D",
                "text": "Legal (Pháp lý)",
                "isCorrect": false
            }
        ],
        "hint": "Chữ E đầu tiên trong từ viết tắt PESTEL."
    },
    {
        "id": "q_off_28",
        "type": "MC_SINGLE",
        "content": "Trong mô hình lập kế hoạch kinh doanh 5W1H, chữ 'W' đại diện cho câu hỏi 'Tại sao phải thực hiện mục tiêu này?' là từ nào?",
        "points": 10,
        "timeLimit": 15,
        "options": [
            {
                "id": "A",
                "text": "Where (Ở đâu)",
                "isCorrect": false
            },
            {
                "id": "B",
                "text": "Why (Tại sao)",
                "isCorrect": true
            },
            {
                "id": "C",
                "text": "When (Khi nào)",
                "isCorrect": false
            },
            {
                "id": "D",
                "text": "Who (Ai làm)",
                "isCorrect": false
            }
        ],
        "hint": "Why xác định lý do, mục đích cốt lõi và ý nghĩa của kế hoạch.",
        "isTieBreaker": false
    },
    {
        "id": "q_off_29",
        "type": "TRUE_FALSE",
        "content": "Kế hoạch tác nghiệp (Operational Planning) thường có tầm nhìn dài hạn từ 5 đến 10 năm và do Hội đồng Quản trị ban hành.",
        "points": 10,
        "timeLimit": 15,
        "options": [
            {
                "id": "A",
                "text": "Đúng",
                "isCorrect": false
            },
            {
                "id": "B",
                "text": "Sai",
                "isCorrect": true
            }
        ],
        "hint": "Kế hoạch tác nghiệp mang tính ngắn hạn (dưới 1 năm), gắn với hoạt động hàng ngày của cấp cơ sở.",
        "isTieBreaker": false
    },
    {
        "id": "q_off_30",
        "type": "FILL_BLANK",
        "content": "Mô hình quản trị mục tiêu hiện đại được Google và Intel áp dụng phổ biến, bao gồm Mục tiêu (Objectives) và Các kết quả then chốt, viết tắt là gì?",
        "answer": "OKR",
        "points": 10,
        "timeLimit": 15,
        "hint": "Viết tắt của 3 chữ cái tiếng Anh: Objectives and Key Results.",
        "isTieBreaker": false
    },
    {
        "id": "q_off_31",
        "type": "MC_SINGLE",
        "content": "Trong chu trình cải tiến liên tục PDCA của Deming, chữ 'C' đại diện cho hành động nào?",
        "points": 10,
        "timeLimit": 15,
        "options": [
            {
                "id": "A",
                "text": "Control (Kiểm soát nội bộ)",
                "isCorrect": false
            },
            {
                "id": "B",
                "text": "Check (Kiểm tra, đo lường kết quả)",
                "isCorrect": true
            },
            {
                "id": "C",
                "text": "Create (Sáng tạo phương án mới)",
                "isCorrect": false
            },
            {
                "id": "D",
                "text": "Cancel (Hủy bỏ dự án thất bại)",
                "isCorrect": false
            }
        ],
        "hint": "PDCA = Plan - Do - Check - Act.",
        "isTieBreaker": false
    },
    {
        "id": "q_off_32",
        "type": "MC_SINGLE",
        "content": "Loại kế hoạch nào dưới đây quy định chuỗi các hành động bắt buộc phải thực hiện theo trình tự thời gian cụ thể để hoàn thành một công việc?",
        "points": 10,
        "timeLimit": 15,
        "options": [
            {
                "id": "A",
                "text": "Quy trình (Procedures)",
                "isCorrect": true
            },
            {
                "id": "B",
                "text": "Chính sách (Policies)",
                "isCorrect": false
            },
            {
                "id": "C",
                "text": "Chiến lược (Strategies)",
                "isCorrect": false
            },
            {
                "id": "D",
                "text": "Quy chế văn hóa công ty",
                "isCorrect": false
            }
        ],
        "hint": "Quy trình định rõ từng bước 1, 2, 3... theo trình tự trước sau.",
        "isTieBreaker": false
    },
    {
        "id": "q_off_33",
        "type": "TRUE_FALSE",
        "content": "Trong ma trận SWOT, Cơ hội (Opportunities) và Thách thức (Threats) phản ánh các nhân tố thuộc môi trường bên ngoài của tổ chức.",
        "points": 10,
        "timeLimit": 15,
        "options": [
            {
                "id": "A",
                "text": "Đúng",
                "isCorrect": true
            },
            {
                "id": "B",
                "text": "Sai",
                "isCorrect": false
            }
        ],
        "hint": "Điểm mạnh/yếu thuộc nội bộ, cơ hội/thách thức đến từ môi trường bên ngoài.",
        "isTieBreaker": false
    },
    {
        "id": "q_off_34",
        "type": "MC_MULTI",
        "content": "Trong các phát biểu dưới đây về Ma trận mở rộng sản phẩm / thị trường của Ansoff, những phát biểu nào là ĐÚNG?",
        "points": 20,
        "timeLimit": 20,
        "options": [
            {
                "id": "A",
                "text": "Thâm nhập thị trường là bán sản phẩm hiện có vào thị trường hiện có",
                "isCorrect": true
            },
            {
                "id": "B",
                "text": "Phát triển sản phẩm là đưa sản phẩm mới vào thị trường hiện có",
                "isCorrect": true
            },
            {
                "id": "C",
                "text": "Đa dạng hóa là đưa sản phẩm mới vào thị trường hoàn toàn mới",
                "isCorrect": true
            },
            {
                "id": "D",
                "text": "Phát triển thị trường là bán sản phẩm mới vào thị trường hiện có",
                "isCorrect": false
            }
        ],
        "hint": "Phát triển thị trường là bán sản phẩm hiện có vào các thị trường hoặc phân khúc khách hàng mới.",
        "isTieBreaker": false
    },
    {
        "id": "q_off_35",
        "type": "FILL_BLANK",
        "content": "Phương pháp lập ngân sách yêu cầu người quản lý phải giải trình và chứng minh lại toàn bộ các khoản chi tiêu từ con số 0 cho mỗi kỳ lập kế hoạch mới được gọi là ngân sách gì? (Ghi tên tiếng Anh 3 chữ cái)",
        "answer": "ZBB",
        "points": 20,
        "timeLimit": 20,
        "hint": "Viết tắt của Zero-Based Budgeting (Ngân sách dựa trên số không).",
        "isTieBreaker": false
    },
    {
        "id": "q_off_36",
        "type": "MC_SINGLE",
        "content": "Sự khác biệt cốt lõi giữa Kế hoạch chiến lược (Strategic Plan) và Kế hoạch tác nghiệp (Operational Plan) được thể hiện chính xác ở phát biểu nào?",
        "points": 20,
        "timeLimit": 20,
        "options": [
            {
                "id": "A",
                "text": "Kế hoạch chiến lược mang tầm nhìn dài hạn (3-5+ năm) do lãnh đạo cấp cao phê duyệt; Kế hoạch tác nghiệp mang tính ngắn hạn (tuần/tháng/dưới 1 năm) do cấp cơ sở triển khai cụ thể",
                "isCorrect": true
            },
            {
                "id": "B",
                "text": "Kế hoạch chiến lược do nhân viên thực tập lập; Kế hoạch tác nghiệp do Hội đồng quản trị xây dựng",
                "isCorrect": false
            },
            {
                "id": "C",
                "text": "Kế hoạch tác nghiệp không có bất kỳ chỉ tiêu số lượng hay thời hạn cụ thể nào",
                "isCorrect": false
            },
            {
                "id": "D",
                "text": "Kế hoạch chiến lược chỉ có giá trị thực thi trong vòng 24 giờ sau khi ký ban hành",
                "isCorrect": false
            }
        ],
        "hint": "Chiến lược: Dài hạn, toàn diện, cấp cao. Tác nghiệp: Ngắn hạn, cụ thể, cấp cơ sở.",
        "isTieBreaker": false
    },
    {
        "id": "q_off_37",
        "type": "MC_SINGLE",
        "content": "Một doanh nghiệp có chi phí cố định (FC) = 200 triệu đồng/tháng. Giá bán một sản phẩm P = 50.000 đồng, chi phí biến đổi trên mỗi sản phẩm VC = 30.000 đồng. Sản lượng hòa vốn (BEP) của doanh nghiệp là bao nhiêu?",
        "points": 20,
        "timeLimit": 20,
        "options": [
            {
                "id": "A",
                "text": "10.000 sản phẩm",
                "isCorrect": true
            },
            {
                "id": "B",
                "text": "6.667 sản phẩm",
                "isCorrect": false
            },
            {
                "id": "C",
                "text": "4.000 sản phẩm",
                "isCorrect": false
            },
            {
                "id": "D",
                "text": "15.000 sản phẩm",
                "isCorrect": false
            }
        ],
        "hint": "Q_hòa vốn = FC / (P - VC) = 200.000.000 / (50.000 - 30.000) = 10.000 sản phẩm.",
        "isTieBreaker": false
    },
    {
        "id": "q_off_38",
        "type": "TRUE_FALSE",
        "content": "Phương pháp chuyên gia Delphi trong dự báo lập kế hoạch cho phép các chuyên gia tranh luận trực tiếp mặt đối mặt để đạt được đồng thuận nhanh nhất.",
        "points": 20,
        "timeLimit": 20,
        "options": [
            {
                "id": "A",
                "text": "Đúng",
                "isCorrect": false
            },
            {
                "id": "B",
                "text": "Sai",
                "isCorrect": true
            }
        ],
        "hint": "Phương pháp Delphi giữ ẩn danh hoàn toàn giữa các chuyên gia qua các vòng gửi phiếu khảo sát để tránh hiệu ứng tâm lý bầy đàn.",
        "isTieBreaker": false
    },
    {
        "id": "q_off_39",
        "type": "MC_SINGLE",
        "content": "Theo mô hình 5 lực lượng cạnh tranh của Michael Porter, rào cản gia nhập ngành CAO sẽ dẫn đến hệ quả nào đối với các doanh nghiệp hiện tại trong ngành?",
        "points": 20,
        "timeLimit": 20,
        "options": [
            {
                "id": "A",
                "text": "Giảm áp lực cạnh tranh từ các đối thủ tiềm năng mới",
                "isCorrect": true
            },
            {
                "id": "B",
                "text": "Tăng quyền lực thương lượng của khách hàng",
                "isCorrect": false
            },
            {
                "id": "C",
                "text": "Làm tăng nguy cơ xuất hiện sản phẩm thay thế",
                "isCorrect": false
            },
            {
                "id": "D",
                "text": "Làm giảm tỷ suất lợi nhuận trung bình toàn ngành",
                "isCorrect": false
            }
        ],
        "hint": "Rào cản cao ngăn các đối thủ tiềm tàng mới bước vào thị trường, bảo vệ thị phần doanh nghiệp hiện tại.",
        "isTieBreaker": false
    },
    {
        "id": "q_off_40",
        "type": "MC_MULTI",
        "content": "Trong các phát biểu dưới đây về kỹ thuật phân tích ma trận SWOT kết hợp, những cặp chiến lược nào được xác định CHÍNH XÁC?",
        "points": 30,
        "timeLimit": 30,
        "options": [
            {
                "id": "A",
                "text": "Chiến lược S-O: Tận dụng thế mạnh nội bộ để nắm bắt cơ hội bên ngoài",
                "isCorrect": true
            },
            {
                "id": "B",
                "text": "Chiến lược W-O: Khắc phục điểm yếu nội bộ bằng cách tận dụng cơ hội bên ngoài",
                "isCorrect": true
            },
            {
                "id": "C",
                "text": "Chiến lược S-T: Sử dụng thế mạnh nội bộ để phòng ngừa và hạn chế các mối đe dọa bên ngoài",
                "isCorrect": true
            },
            {
                "id": "D",
                "text": "Chiến lược W-T: Tối đa hóa chi phí đầu tư để biến điểm yếu thành cơ hội đột phá",
                "isCorrect": false
            }
        ],
        "hint": "Chiến lược W-T là chiến lược phòng thủ tối thiểu hóa điểm yếu và né tránh nguy cơ de dọa.",
        "isTieBreaker": false
    },
    {
        "id": "q_off_41",
        "type": "MC_SINGLE",
        "content": "Lý do quan trọng nhất khiến Kế hoạch cuốn chiếu (Rolling Plan / Rolling Forecast) ưu việt hơn Kế hoạch cố định hàng năm trong môi trường VUCA là gì?",
        "points": 30,
        "timeLimit": 25,
        "options": [
            {
                "id": "A",
                "text": "Liên tục cập nhật khung thời gian dự báo tương lai (ví dụ 12-18 tháng tới) theo từng kỳ, giúp doanh nghiệp linh hoạt điều chỉnh giả định và nguồn lực theo biến động thực tế thay vì bám vào chỉ tiêu cứng nhắc đã lỗi thời",
                "isCorrect": true
            },
            {
                "id": "B",
                "text": "Giúp doanh nghiệp không cần theo dõi bất kỳ số liệu doanh thu hay chi phí thực tế nào",
                "isCorrect": false
            },
            {
                "id": "C",
                "text": "Tự động khóa cứng ngân sách chi tiêu không cho phép bất kỳ phòng ban nào thay đổi",
                "isCorrect": false
            },
            {
                "id": "D",
                "text": "Loại bỏ hoàn toàn vai trò của ban giám đốc trong công tác quản trị doanh nghiệp",
                "isCorrect": false
            }
        ],
        "hint": "Rolling plan liên tục mở rộng tầm nhìn về phía trước, tăng tính linh hoạt và khả năng ứng biến.",
        "isTieBreaker": false
    },
    {
        "id": "q_off_42",
        "type": "MATCHING",
        "content": "Hãy ghép đúng từng công cụ hoạch định chiến lược với mục đích ứng dụng chủ đạo của nó:",
        "points": 30,
        "timeLimit": 40,
        "pairs": [
            {
                "id": "p1",
                "left": "Ma trận Ansoff",
                "right": "Xác định 4 hướng tăng trưởng dựa trên Sản phẩm & Thị trường"
            },
            {
                "id": "p2",
                "left": "Ma trận GE / McKinsey",
                "right": "Đánh giá 9 ô vị thế cạnh tranh kinh doanh và Sức hấp dẫn ngành"
            },
            {
                "id": "p3",
                "left": "Mô hình Chuỗi giá trị (Value Chain)",
                "right": "Phân tích các hoạt động chính và hoạt động bổ trợ tạo ra giá trị"
            },
            {
                "id": "p4",
                "left": "Thẻ điểm cân bằng (BSC)",
                "right": "Cụ thể hóa chiến lược thành 4 khía cạnh đo lường định lượng"
            }
        ],
        "options": [
            {
                "id": "A",
                "text": "1-A, 2-B, 3-C, 4-D",
                "isCorrect": true
            },
            {
                "id": "B",
                "text": "1-B, 2-A, 3-D, 4-C",
                "isCorrect": false
            },
            {
                "id": "C",
                "text": "1-C, 2-D, 3-A, 4-B",
                "isCorrect": false
            },
            {
                "id": "D",
                "text": "1-D, 2-C, 3-B, 4-A",
                "isCorrect": false
            }
        ],
        "hint": "Mỗi ma trận và khung lý thuyết phục vụ một góc nhìn phân tích chiến lược riêng biệt.",
        "isTieBreaker": false
    },
    {
        "id": "q_off_43",
        "type": "DRAG_DROP",
        "content": "Hãy sắp xếp đúng trình tự các bước thực hiện kỹ thuật Dự báo theo phương pháp San bằng hàm mũ bậc nhất:",
        "points": 30,
        "timeLimit": 35,
        "options": [
            {
                "id": "STEP_1",
                "text": "Thu thập chuỗi số liệu thực tế của các kỳ quá khứ",
                "isCorrect": true
            },
            {
                "id": "STEP_2",
                "text": "Lựa chọn giá trị dự báo khởi đầu (F1) cho kỳ phân tích đầu tiên",
                "isCorrect": true
            },
            {
                "id": "STEP_3",
                "text": "Xác định hệ số san bằng alpha tối ưu trong khoảng (0, 1)",
                "isCorrect": true
            },
            {
                "id": "STEP_4",
                "text": "Áp dụng công thức F(t+1) = F(t) + alpha * [A(t) - F(t)]",
                "isCorrect": true
            },
            {
                "id": "STEP_5",
                "text": "Đo lường sai số dự báo (MAD, MSE) và hiệu chỉnh tham số",
                "isCorrect": true
            }
        ],
        "hint": "Số liệu lịch sử -> Giá trị ban đầu -> Chọn alpha -> Tính dự báo -> Đo sai số.",
        "isTieBreaker": false
    },
    {
        "id": "q_off_44",
        "type": "MATCHING",
        "content": "Hãy ghép đúng các chỉ số thẩm định hiệu quả tài chính của dự án đầu tư trong kế hoạch dài hạn với tiêu chuẩn chấp thuận tương ứng:",
        "points": 40,
        "timeLimit": 60,
        "pairs": [
            {
                "id": "p1",
                "left": "Giá trị hiện giá thuần (NPV)",
                "right": "Chấp thuận khi NPV > 0 (tăng thêm giá trị cho chủ sở hữu)"
            },
            {
                "id": "p2",
                "left": "Tỷ suất sinh lời nội bộ (IRR)",
                "right": "Chấp thuận khi IRR > Chi phí vốn sử dụng (WACC / r)"
            },
            {
                "id": "p3",
                "left": "Chỉ số khả năng sinh lời (PI)",
                "right": "Chấp thuận khi PI = Tổng PV dòng thu / Vốn đầu tư > 1"
            },
            {
                "id": "p4",
                "left": "Thời gian hoàn vốn có chiết khấu (DPP)",
                "right": "Chấp thuận khi DPP nhỏ hơn thời hạn hoàn vốn yêu cầu"
            }
        ],
        "options": [
            {
                "id": "A",
                "text": "1-A, 2-B, 3-C, 4-D",
                "isCorrect": true
            },
            {
                "id": "B",
                "text": "1-C, 2-D, 3-A, 4-B",
                "isCorrect": false
            },
            {
                "id": "C",
                "text": "1-B, 2-A, 3-D, 4-C",
                "isCorrect": false
            },
            {
                "id": "D",
                "text": "1-D, 2-C, 3-B, 4-A",
                "isCorrect": false
            }
        ],
        "hint": "NPV > 0, IRR > r, PI > 1 là bộ 3 quy tắc quyết định đầu tư kinh điển.",
        "isTieBreaker": false
    },
    {
        "id": "q_off_45",
        "type": "DRAG_DROP",
        "content": "Hãy sắp xếp đúng thứ tự các giai đoạn của quy trình Quản trị Rủi ro trong lập kế hoạch chiến lược theo chuẩn ISO 31000:",
        "points": 40,
        "timeLimit": 60,
        "options": [
            {
                "id": "STEP_1",
                "text": "Thiết lập bối cảnh nội bộ và bên ngoài của tổ chức",
                "isCorrect": true
            },
            {
                "id": "STEP_2",
                "text": "Nhận diện các nguy cơ và rủi ro tiềm tàng (Risk Identification)",
                "isCorrect": true
            },
            {
                "id": "STEP_3",
                "text": "Phân tích xác suất và mức độ tác động của rủi ro (Risk Analysis)",
                "isCorrect": true
            },
            {
                "id": "STEP_4",
                "text": "Đánh giá và xếp hạng ưu tiên các rủi ro (Risk Evaluation)",
                "isCorrect": true
            },
            {
                "id": "STEP_5",
                "text": "Lập kế hoạch ứng phó: Né tránh, Giảm thiểu, Chuyển giao hoặc Chấp nhận",
                "isCorrect": true
            }
        ],
        "hint": "Bối cảnh -> Nhận diện -> Phân tích -> Đánh giá xếp hạng -> Kế hoạch ứng phó.",
        "isTieBreaker": false
    }
]
};

export const offlineStorage = {
  isBrowser(): boolean {
    return typeof window !== "undefined";
  },

  isOnline(): boolean {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  },

  getLocalBanks(): OfflineQuizBank[] {
    if (!this.isBrowser()) return [DEFAULT_OFFLINE_BANK];
    try {
      const data = localStorage.getItem(LOCAL_BANKS_KEY);
      if (!data) {
        this.saveLocalBank(DEFAULT_OFFLINE_BANK);
        return [DEFAULT_OFFLINE_BANK];
      }
      const list: OfflineQuizBank[] = JSON.parse(data);
      if (!list.some((b) => b.id === DEFAULT_OFFLINE_BANK.id)) {
        list.unshift(DEFAULT_OFFLINE_BANK);
      }
      return list;
    } catch {
      return [DEFAULT_OFFLINE_BANK];
    }
  },

  getLocalBankById(id: string): OfflineQuizBank | null {
    const list = this.getLocalBanks();
    return list.find((b) => b.id === id) || null;
  },

  saveLocalBank(bank: OfflineQuizBank): void {
    if (!this.isBrowser()) return;
    try {
      const list = this.getLocalBanks().filter((b) => b.id !== bank.id);
      const updated: OfflineQuizBank = {
        ...bank,
        _count: { questions: bank.questions?.length ?? bank._count?.questions ?? 0 },
        isLocalOnly: bank.isLocalOnly ?? true,
        needsSync: true,
      };
      list.unshift(updated);
      localStorage.setItem(LOCAL_BANKS_KEY, JSON.stringify(list));
    } catch (e) {
      console.error("[offlineStorage] saveLocalBank failed:", e);
    }
  },

  deleteLocalBank(id: string): void {
    if (!this.isBrowser() || id === DEFAULT_OFFLINE_BANK.id) return;
    try {
      const list = this.getLocalBanks().filter((b) => b.id !== id);
      localStorage.setItem(LOCAL_BANKS_KEY, JSON.stringify(list));
    } catch {}
  },

  // Export a quiz bank to a JSON file for backup / offline sharing
  exportToJson(bank: OfflineQuizBank): void {
    if (!this.isBrowser()) return;
    const jsonStr = JSON.stringify(bank, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${bank.title.replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u1E00-\u1EFF]/g, "_")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // Import a quiz bank from JSON
  async importFromJson(file: File): Promise<OfflineQuizBank> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target?.result as string);
          if (!parsed.title || !Array.isArray(parsed.questions)) {
            throw new Error("File JSON không hợp lệ: thiếu trường title hoặc danh sách questions");
          }
          const importedBank: OfflineQuizBank = {
            id: `bank_local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            title: parsed.title,
            description: parsed.description || "Nhập từ file JSON",
            createdAt: new Date().toISOString(),
            questions: parsed.questions,
            _count: { questions: parsed.questions.length },
            isLocalOnly: true,
            needsSync: true,
          };
          this.saveLocalBank(importedBank);
          resolve(importedBank);
        } catch (err: any) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("Không thể đọc file"));
      reader.readAsText(file);
    });
  },

  // Synchronize unsynced local banks to server when online
  async syncPendingWithServer(): Promise<{ synced: number; failed: number }> {
    if (!this.isOnline() || !this.isBrowser()) {
      return { synced: 0, failed: 0 };
    }

    const banks = this.getLocalBanks().filter((b) => b.needsSync && b.id !== DEFAULT_OFFLINE_BANK.id);
    let synced = 0;
    let failed = 0;

    for (const bank of banks) {
      try {
        const res = await fetch("/api/quiz-bank", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: bank.title,
            description: bank.description,
            isPublic: false,
          }),
        });

        if (res.ok) {
          const created = await res.json();
          // Upload questions
          if (bank.questions && bank.questions.length > 0) {
            for (const q of bank.questions) {
              await fetch(`/api/quiz-bank/${created.id}/questions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(q),
              }).catch(() => {});
            }
          }
          // Mark as synced
          bank.needsSync = false;
          bank.isLocalOnly = false;
          this.saveLocalBank(bank);
          synced++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return { synced, failed };
  },
};

