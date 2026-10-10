// Quizorra - Offline Storage & Sync Engine
// Manages local quiz banks, offline drafts, preset banks, and background sync.

export interface OfflineQuestion {
  id?: string;
  type: string;
  content: string;
  options?: { id: string; text: string; isCorrect: boolean }[];
  answer?: string;
  points: number;
  timeLimit: number;
  hint?: string;
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
  "title": "Bộ Đề Mẫu Đa Chế Độ (Offline Preset)",
  "description": "25 câu hỏi tổng hợp kiến thức kinh tế & đại cương có sẵn chạy mượt mà ngay cả khi không có mạng",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "isLocalOnly": true,
  "_count": {
    "questions": 25
  },
  "questions": [
    {
      "id": "q_off_1",
      "type": "MC_SINGLE",
      "content": "Theo Henry Fayol, nguyên tắc nào yêu cầu mỗi nhân viên chỉ nên nhận mệnh lệnh từ một người cấp trên duy nhất?",
      "options": [
        {
          "id": "A",
          "text": "Thống nhất điều khiển (Unity of Direction)",
          "isCorrect": false
        },
        {
          "id": "B",
          "text": "Thống nhất chỉ huy (Unity of Command)",
          "isCorrect": true
        },
        {
          "id": "C",
          "text": "Tập trung hóa (Centralization)",
          "isCorrect": false
        },
        {
          "id": "D",
          "text": "Kỷ luật (Discipline)",
          "isCorrect": false
        }
      ],
      "points": 10,
      "timeLimit": 15,
      "hint": "Nguyên tắc nhằm tránh sự mâu thuẫn trong mệnh lệnh và xung đột thẩm quyền quản lý."
    },
    {
      "id": "q_off_2",
      "type": "MC_SINGLE",
      "content": "Trong các chức năng quản lý cơ bản, chức năng nào đóng vai trò 'kim chỉ nam', định hướng mục tiêu và phương thức đạt được mục tiêu cho tổ chức?",
      "options": [
        {
          "id": "A",
          "text": "Hoạch định (Planning)",
          "isCorrect": true
        },
        {
          "id": "B",
          "text": "Tổ chức (Organizing)",
          "isCorrect": false
        },
        {
          "id": "C",
          "text": "Lãnh đạo (Leading)",
          "isCorrect": false
        },
        {
          "id": "D",
          "text": "Kiểm soát (Controlling)",
          "isCorrect": false
        }
      ],
      "points": 10,
      "timeLimit": 15,
      "hint": "Chức năng đầu tiên trong chu trình quản lý, xác định đích đến trước khi phân bổ nguồn lực."
    },
    {
      "id": "q_off_3",
      "type": "MC_MULTI",
      "content": "Theo Thuyết Hai nhân tố của Frederick Herzberg, những yếu tố nào dưới đây thuộc nhóm 'Yếu tố động viên' (Motivators) tạo ra sự thỏa mãn thực sự trong công việc?",
      "options": [
        {
          "id": "A",
          "text": "Sự thừa nhận thành tích và tiến bộ",
          "isCorrect": true
        },
        {
          "id": "B",
          "text": "Bản chất công việc có tính thách thức",
          "isCorrect": true
        },
        {
          "id": "C",
          "text": "Tiền lương và phụ cấp cơ bản",
          "isCorrect": false
        },
        {
          "id": "D",
          "text": "Điều kiện làm việc vật lý và chính sách công ty",
          "isCorrect": false
        }
      ],
      "points": 20,
      "timeLimit": 20,
      "hint": "Phân biệt giữa yếu tố duy trì (ngăn bất mãn) và yếu tố động viên (thúc đẩy hăng say cống hiến)."
    },
    {
      "id": "q_off_4",
      "type": "TRUE_FALSE",
      "content": "Khi tầm hạn quản trị (Span of control) của nhà quản lý càng rộng, cơ cấu tổ chức của doanh nghiệp sẽ có xu hướng càng nhiều tầng nấc trung gian (cơ cấu hình tháp cao).",
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
      "points": 10,
      "timeLimit": 15,
      "hint": "Tầm hạn rộng nghĩa là một người quản lý được nhiều cấp dưới ➔ ít tầng nấc hơn (cơ cấu nằm ngang/dẹt)."
    },
    {
      "id": "q_off_5",
      "type": "MC_SINGLE",
      "content": "Loại hình kiểm soát nào được thực hiện TRƯỚC KHI hoạt động thực tế bắt đầu nhằm ngăn chặn sai lệch từ khâu chuẩn bị nguồn lực?",
      "options": [
        {
          "id": "A",
          "text": "Kiểm soát phản hồi (Feedback control)",
          "isCorrect": false
        },
        {
          "id": "B",
          "text": "Kiểm soát đồng thời (Concurrent control)",
          "isCorrect": false
        },
        {
          "id": "C",
          "text": "Kiểm soát lường trước / dự phòng (Feedforward control)",
          "isCorrect": true
        },
        {
          "id": "D",
          "text": "Kiểm toán tài chính độc lập",
          "isCorrect": false
        }
      ],
      "points": 10,
      "timeLimit": 15,
      "hint": "Chủ động kiểm tra nguyên vật liệu, chất lượng đầu vào và năng lực nhân sự trước khi sản xuất."
    },
    {
      "id": "q_off_6",
      "type": "FILL_BLANK",
      "content": "Tác giả được coi là 'Cha đẻ của thuyết quản lý theo khoa học' với nguyên tắc định mức lao động và trả lương theo sản phẩm là ai? (Ghi họ của tác giả)",
      "options": [],
      "points": 20,
      "timeLimit": 20,
      "hint": "Tên đầy đủ là Frederick Winslow Taylor."
    },
    {
      "id": "q_off_7",
      "type": "MC_SINGLE",
      "content": "Theo Henry Mintzberg, vai trò nào dưới đây KHÔNG thuộc nhóm vai trò 'Quan hệ với con người' (Interpersonal roles) của nhà quản lý?",
      "options": [
        {
          "id": "A",
          "text": "Đại diện / Biểu trưng (Figurehead)",
          "isCorrect": false
        },
        {
          "id": "B",
          "text": "Người lãnh đạo (Leader)",
          "isCorrect": false
        },
        {
          "id": "C",
          "text": "Người liên lạc (Liaison)",
          "isCorrect": false
        },
        {
          "id": "D",
          "text": "Người phát ngôn (Spokesperson)",
          "isCorrect": true
        }
      ],
      "points": 20,
      "timeLimit": 20,
      "hint": "Người phát ngôn thuộc nhóm vai trò thông tin (Informational roles)."
    },
    {
      "id": "q_off_8",
      "type": "MC_SINGLE",
      "content": "Trong phong cách lãnh đạo theo mô hình Kurt Lewin, phong cách nào phát huy tối đa tính sáng tạo và trách nhiệm của nhân viên có trình độ chuyên môn cao?",
      "options": [
        {
          "id": "A",
          "text": "Độc đoán (Autocratic)",
          "isCorrect": false
        },
        {
          "id": "B",
          "text": "Dân chủ (Democratic)",
          "isCorrect": false
        },
        {
          "id": "C",
          "text": "Tự do / Ủy quyền hoàn toàn (Laissez-faire)",
          "isCorrect": true
        },
        {
          "id": "D",
          "text": "Gia trưởng (Paternalistic)",
          "isCorrect": false
        }
      ],
      "points": 10,
      "timeLimit": 15,
      "hint": "Nhà lãnh đạo trao quyền quyết định hoàn toàn cho cấp dưới, phù hợp với các nhóm chuyên gia nghiên cứu R&D."
    },
    {
      "id": "q_off_9",
      "type": "TRUE_FALSE",
      "content": "Kỹ năng tư duy (Conceptual skills) có vai trò và tỷ trọng quan trọng nhất đối với nhà quản trị cấp cơ sở (tổ trưởng, trưởng ca) so với nhà quản trị cấp cao.",
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
      "points": 10,
      "timeLimit": 15,
      "hint": "Nhà quản trị cấp cao cần kỹ năng tư duy chiến lược nhiều nhất; cấp cơ sở cần kỹ năng chuyên môn kỹ thuật nhiều nhất."
    },
    {
      "id": "q_off_10",
      "type": "MC_SINGLE",
      "content": "Một doanh nghiệp sản xuất ra các sản phẩm đạt tiêu chuẩn kỹ thuật cao với chi phí tối thiểu nhưng sản phẩm đó thị trường hoàn toàn không có nhu cầu tiêu thụ. Tình huống này phản ánh doanh nghiệp đang ở trạng thái nào?",
      "options": [
        {
          "id": "A",
          "text": "Đạt hiệu quả cao nhưng hiệu lực thấp (High Efficiency, Low Effectiveness)",
          "isCorrect": true
        },
        {
          "id": "B",
          "text": "Đạt hiệu lực cao nhưng hiệu quả thấp (High Effectiveness, Low Efficiency)",
          "isCorrect": false
        },
        {
          "id": "C",
          "text": "Đạt cả hiệu quả và hiệu lực cao",
          "isCorrect": false
        },
        {
          "id": "D",
          "text": "Kém cả hiệu quả lẫn hiệu lực",
          "isCorrect": false
        }
      ],
      "points": 20,
      "timeLimit": 20,
      "hint": "Hiệu quả là làm việc đúng cách (tiết kiệm chi phí), còn hiệu lực là làm đúng việc (đáp ứng đúng mục tiêu thị trường cần)."
    },
    {
      "id": "q_off_11",
      "type": "MC_SINGLE",
      "content": "Trường phái quản trị khoa học của Frederick Winslow Taylor tập trung chủ yếu vào cấp độ quản trị nào trong doanh nghiệp?",
      "options": [
        {
          "id": "A",
          "text": "Cấp chiến lược toàn công ty",
          "isCorrect": false
        },
        {
          "id": "B",
          "text": "Cấp độ phân xưởng và người thừa hành (tối ưu hóa thao tác lao động)",
          "isCorrect": true
        },
        {
          "id": "C",
          "text": "Cấp quan hệ đối ngoại và thể chế",
          "isCorrect": false
        },
        {
          "id": "D",
          "text": "Cấp quản trị tài chính cấp cao",
          "isCorrect": false
        }
      ],
      "points": 10,
      "timeLimit": 15,
      "hint": "Taylor tập trung vào nghiên cứu thời gian và động tác tại vị trí làm việc của công nhân."
    },
    {
      "id": "q_off_12",
      "type": "MC_MULTI",
      "content": "Theo Max Weber, một tổ chức quan liêu bàn giấy lý tưởng (Bureaucracy) cần sở hữu những đặc trưng cơ bản nào?",
      "options": [
        {
          "id": "A",
          "text": "Phân công lao động chuyên môn hóa rõ ràng",
          "isCorrect": true
        },
        {
          "id": "B",
          "text": "Hệ thống thứ bậc quyền lực được phân định nghiêm ngặt",
          "isCorrect": true
        },
        {
          "id": "C",
          "text": "Tuyển dụng và thăng tiến hoàn toàn dựa trên quan hệ thân quen",
          "isCorrect": false
        },
        {
          "id": "D",
          "text": "Vận hành dựa trên các quy tắc và thủ tục bằng văn bản chuẩn hóa",
          "isCorrect": true
        }
      ],
      "points": 20,
      "timeLimit": 20,
      "hint": "Weber đề xuất mô hình dựa trên tính duy lý và pháp lý, xóa bỏ chủ nghĩa thân tộc thiên vị."
    },
    {
      "id": "q_off_13",
      "type": "TRUE_FALSE",
      "content": "Thí nghiệm Hawthorne của Elton Mayo chứng minh rằng các yếu tố vật lý như ánh sáng và nhiệt độ tại nơi làm việc là nhân tố duy nhất quyết định năng suất lao động.",
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
      "points": 10,
      "timeLimit": 15,
      "hint": "Hawthorne mở đường cho trường phái tâm lý - xã hội, chứng minh yếu tố tâm lý nhóm và sự quan tâm của cấp trên tác động mạnh mẽ đến năng suất."
    },
    {
      "id": "q_off_14",
      "type": "MC_SINGLE",
      "content": "Trong thang bậc nhu cầu của Abraham Maslow, sau khi nhu cầu An toàn (Safety) đã được thỏa mãn cơ bản, con người sẽ có động lực hướng tới bậc nhu cầu nào tiếp theo?",
      "options": [
        {
          "id": "A",
          "text": "Nhu cầu tự hoàn thiện (Self-actualization)",
          "isCorrect": false
        },
        {
          "id": "B",
          "text": "Nhu cầu được tôn trọng (Esteem)",
          "isCorrect": false
        },
        {
          "id": "C",
          "text": "Nhu cầu xã hội / Được thuộc về (Social / Belongingness)",
          "isCorrect": true
        },
        {
          "id": "D",
          "text": "Nhu cầu sinh học cơ bản (Physiological)",
          "isCorrect": false
        }
      ],
      "points": 10,
      "timeLimit": 15,
      "hint": "Nhu cầu giao lưu tình cảm, thuộc về một tập thể và được bạn bè, đồng nghiệp chấp nhận."
    },
    {
      "id": "q_off_15",
      "type": "MC_SINGLE",
      "content": "Theo Thuyết X và Thuyết Y của Douglas McGregor, nhà quản lý theo Thuyết Y nhìn nhận bản chất người lao động như thế nào?",
      "options": [
        {
          "id": "A",
          "text": "Con người lười biếng, trốn tránh trách nhiệm và phải bị đe dọa trừng phạt mới chịu làm việc",
          "isCorrect": false
        },
        {
          "id": "B",
          "text": "Con người xem lao động là nhu cầu tự nhiên, có năng lực sáng tạo và sẵn sàng nhận trách nhiệm nếu được tin tưởng",
          "isCorrect": true
        },
        {
          "id": "C",
          "text": "Con người chỉ làm việc vì tiền thưởng vật chất trước mắt",
          "isCorrect": false
        },
        {
          "id": "D",
          "text": "Con người không bao giờ có mục tiêu cá nhân ăn nhập với mục tiêu công ty",
          "isCorrect": false
        }
      ],
      "points": 10,
      "timeLimit": 15,
      "hint": "Thuyết Y đại diện cho cái nhìn nhân văn và lạc quan về tiềm năng phát triển của con người."
    },
    {
      "id": "q_off_16",
      "type": "MC_SINGLE",
      "content": "Theo Thuyết kỳ vọng của Victor Vroom, Động lực làm việc (Motivation) được xác định bằng công thức nào?",
      "options": [
        {
          "id": "A",
          "text": "Động lực = Kỳ vọng (Expectancy) + Phương tiện (Instrumentality) + Giá trị phần thưởng (Valence)",
          "isCorrect": false
        },
        {
          "id": "B",
          "text": "Động lực = Kỳ vọng (Expectancy) × Phương tiện (Instrumentality) × Giá trị phần thưởng (Valence)",
          "isCorrect": true
        },
        {
          "id": "C",
          "text": "Động lực = Tiền lương × Năng suất cá nhân",
          "isCorrect": false
        },
        {
          "id": "D",
          "text": "Động lực = Sự nỗ lực ÷ Độ khó của mục tiêu",
          "isCorrect": false
        }
      ],
      "points": 20,
      "timeLimit": 20,
      "hint": "Tích số của ba nhân tố: Nếu bất kỳ nhân tố nào bằng 0, động lực tổng thể sẽ bằng 0."
    },
    {
      "id": "q_off_17",
      "type": "MC_SINGLE",
      "content": "Trong Lưới lãnh đạo của Robert Blake và Jane Mouton, phong cách quản trị ở tọa độ (9,9) - nơi nhà lãnh đạo quan tâm cao độ đến cả con người lẫn kết quả sản xuất - được gọi là gì?",
      "options": [
        {
          "id": "A",
          "text": "Quản trị kiểu câu lạc bộ đồng quê (Country Club Management)",
          "isCorrect": false
        },
        {
          "id": "B",
          "text": "Quản trị nhóm (Team Management)",
          "isCorrect": true
        },
        {
          "id": "C",
          "text": "Quản trị quyền uy - phục tùng (Authority-Compliance)",
          "isCorrect": false
        },
        {
          "id": "D",
          "text": "Quản trị suy giảm / bỏ mặc (Impoverished Management)",
          "isCorrect": false
        }
      ],
      "points": 20,
      "timeLimit": 20,
      "hint": "Phong cách lý tưởng thúc đẩy sự gắn kết và hiệu suất cao nhất nhờ mục tiêu chung."
    },
    {
      "id": "q_off_18",
      "type": "TRUE_FALSE",
      "content": "Cơ cấu tổ chức kiểu Ma trận (Matrix Structure) vi phạm nguyên tắc 'Thống nhất chỉ huy' của Henry Fayol vì một nhân viên có thể chịu sự giám sát của hai người quản lý cùng lúc.",
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
      "points": 10,
      "timeLimit": 15,
      "hint": "Trong ma trận, thành viên dự án vừa báo cáo cho Trưởng phòng chức năng vừa báo cáo cho Quản trị viên dự án."
    },
    {
      "id": "q_off_19",
      "type": "MC_SINGLE",
      "content": "Khi doanh nghiệp hoạt động trong môi trường kinh doanh có độ bất định cao và công nghệ biến đổi nhanh chóng, mô hình tổ chức nào thường mang lại tính linh hoạt và thích ứng cao nhất?",
      "options": [
        {
          "id": "A",
          "text": "Cơ cấu cơ học hình tháp nhiều tầng nấc (Mechanistic Structure)",
          "isCorrect": false
        },
        {
          "id": "B",
          "text": "Cơ cấu hữu cơ linh hoạt và mạng lưới phi tập trung (Organic / Network Structure)",
          "isCorrect": true
        },
        {
          "id": "C",
          "text": "Cơ cấu tập trung quyền lực cao độ vào một cá nhân",
          "isCorrect": false
        },
        {
          "id": "D",
          "text": "Cơ cấu dựa hoàn toàn trên thâm niên công tác",
          "isCorrect": false
        }
      ],
      "points": 20,
      "timeLimit": 20,
      "hint": "Cơ cấu hữu cơ có ít quy chế cứng nhắc, trao quyền rộng rãi và giao tiếp đa chiều."
    },
    {
      "id": "q_off_20",
      "type": "MC_SINGLE",
      "content": "Bước đầu tiên có tính quyết định trong quy trình ra quyết định quản trị hợp lý là gì?",
      "options": [
        {
          "id": "A",
          "text": "Đánh giá các giải pháp thay thế",
          "isCorrect": false
        },
        {
          "id": "B",
          "text": "Nhận diện và xác định chính xác vấn đề cần giải quyết",
          "isCorrect": true
        },
        {
          "id": "C",
          "text": "Thực thi quyết định ngay lập tức",
          "isCorrect": false
        },
        {
          "id": "D",
          "text": "Phân bổ ngân sách dự phòng",
          "isCorrect": false
        }
      ],
      "points": 10,
      "timeLimit": 15,
      "hint": "Nếu xác định sai vấn đề, mọi giải pháp xây dựng sau đó đều trở nên vô nghĩa."
    },
    {
      "id": "q_off_21",
      "type": "MC_MULTI",
      "content": "Kỹ thuật động não (Brainstorming) khi áp dụng trong ra quyết định nhóm đòi hỏi tuân thủ những nguyên tắc cốt lõi nào?",
      "options": [
        {
          "id": "A",
          "text": "Tuyệt đối không phê phán hay chỉ trích ý kiến trong giai đoạn đề xuất",
          "isCorrect": true
        },
        {
          "id": "B",
          "text": "Khuyến khích những ý tưởng táo bạo, độc đáo và mới lạ",
          "isCorrect": true
        },
        {
          "id": "C",
          "text": "Thu thập số lượng ý tưởng càng nhiều càng tốt",
          "isCorrect": true
        },
        {
          "id": "D",
          "text": "Chỉ cho phép cấp trên phát biểu để giữ trật tự cuộc họp",
          "isCorrect": false
        }
      ],
      "points": 20,
      "timeLimit": 20,
      "hint": "Mục tiêu là khơi mở tự do sáng tạo và tận dụng trí tuệ tập thể không rào cản."
    },
    {
      "id": "q_off_22",
      "type": "MC_SINGLE",
      "content": "Kỹ thuật Delphi trong ra quyết định và dự báo nhóm có đặc điểm nổi bật nào dưới đây?",
      "options": [
        {
          "id": "A",
          "text": "Các chuyên gia tranh luận trực tiếp nảy lửa tại hội trường",
          "isCorrect": false
        },
        {
          "id": "B",
          "text": "Thu thập ý kiến độc lập của các chuyên gia ẩn danh qua nhiều vòng bảng hỏi phản hồi",
          "isCorrect": true
        },
        {
          "id": "C",
          "text": "Bỏ phiếu công khai bằng giơ tay biểu quyết",
          "isCorrect": false
        },
        {
          "id": "D",
          "text": "Lấy ý kiến ngẫu nhiên của khách hàng vãng lai",
          "isCorrect": false
        }
      ],
      "points": 20,
      "timeLimit": 20,
      "hint": "Tính ẩn danh giúp tránh hiện tượng tâm lý a dua theo số đông hoặc bị chi phối bởi người có chức quyền."
    },
    {
      "id": "q_off_23",
      "type": "TRUE_FALSE",
      "content": "Điểm hòa vốn (Break-even point) là mức sản lượng tại đó Tổng doanh thu vừa đủ bù đắp Tổng chi phí (cả định phí và biến phí), và Lợi nhuận của doanh nghiệp bằng 0.",
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
      "points": 10,
      "timeLimit": 15,
      "hint": "Tại điểm hòa vốn: Doanh thu = Chi phí, không lãi và không lỗ."
    },
    {
      "id": "q_off_24",
      "type": "MC_SINGLE",
      "content": "Theo nghiên cứu của Henry Mintzberg, vai trò 'Người phát ngôn' (Spokesperson) và 'Người giám sát thông tin' (Monitor) của nhà quản trị thuộc nhóm vai trò nào?",
      "options": [
        {
          "id": "A",
          "text": "Nhóm vai trò quan hệ con người (Interpersonal roles)",
          "isCorrect": false
        },
        {
          "id": "B",
          "text": "Nhóm vai trò thông tin (Informational roles)",
          "isCorrect": true
        },
        {
          "id": "C",
          "text": "Nhóm vai trò ra quyết định (Decisional roles)",
          "isCorrect": false
        },
        {
          "id": "D",
          "text": "Nhóm vai trò kỹ thuật tác nghiệp (Technical roles)",
          "isCorrect": false
        }
      ],
      "points": 20,
      "timeLimit": 20,
      "hint": "Mintzberg chia 10 vai trò thành 3 nhóm: Quan hệ con người, Thông tin và Ra quyết định."
    },
    {
      "id": "q_off_25",
      "type": "MC_SINGLE",
      "content": "Một công ty công nghệ phát hiện một lỗ hổng bảo mật nghiêm trọng trong sản phẩm vừa xuất xưởng. Tổng giám đốc ngay lập tức ra lệnh thu hồi sản phẩm toàn cầu và xin lỗi công khai, chấp nhận sụt giảm 20% lợi nhuận ngắn hạn để bảo vệ an toàn dữ liệu khách hàng. Quyết định này thể hiện quan điểm đạo đức quản trị nào?",
      "options": [
        {
          "id": "A",
          "text": "Quan điểm đạo đức vị lợi hẹp hòi (chỉ tối đa hóa lợi nhuận cho cổ đông)",
          "isCorrect": false
        },
        {
          "id": "B",
          "text": "Quan điểm trách nhiệm xã hội và công lý đạo đức (CSR & Social Justice approach)",
          "isCorrect": true
        },
        {
          "id": "C",
          "text": "Quan điểm trốn tránh pháp lý",
          "isCorrect": false
        },
        {
          "id": "D",
          "text": "Quan điểm cơ hội ngắn hạn",
          "isCorrect": false
        }
      ],
      "points": 30,
      "timeLimit": 30,
      "hint": "Đặt quyền lợi an toàn của các bên liên quan (khách hàng, xã hội) lên trên lợi ích tài chính thuần túy ngắn hạn."
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

