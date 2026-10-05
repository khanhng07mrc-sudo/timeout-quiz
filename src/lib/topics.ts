/**
 * topics.ts
 * Quy chuẩn phân loại và chuẩn hóa Chủ đề (Topic) thành các lĩnh vực tổng quát
 * như: Toán học & Logic, Khoa học Tự nhiên, Lịch sử & Địa lý, Văn hóa - Xã hội, v.v.
 * Tuyệt đối không để lộ gợi ý câu hỏi (hint/explanation) làm chủ đề.
 */

export const BROAD_TOPICS = [
  "Toán học & Logic",
  "Khoa học Tự nhiên",
  "Lịch sử & Địa lý",
  "Văn hóa - Xã hội",
  "Kinh tế & Quản trị",
  "Công nghệ & Tin học",
  "Ngoại ngữ",
  "Kiến thức Tổng hợp",
] as const;

export type BroadTopic = (typeof BROAD_TOPICS)[number];

const TOPIC_PATTERNS: Array<{ topic: BroadTopic; regex: RegExp }> = [
  {
    topic: "Toán học & Logic",
    regex:
      /\b(toán|đại số|hình học|lượng giác|tích phân|đạo hàm|xác suất|thống kê|phương trình|hệ phương trình|tam giác|hình tròn|hình chóp|ma trận|vectơ|giải tích|logarit|dãy số|phép tính|số học|logic|tính toán)\b/i,
  },
  {
    topic: "Khoa học Tự nhiên",
    regex:
      /\b(vật lý|hoá học|hóa học|sinh học|sinh thái|tế bào|gen|dna|arn|nguyên tử|phân tử|electron|proton|nhiệt độ|áp suất|năng lượng|vận tốc|quang hợp|hô hấp|khí hậu|biến đổi khí hậu|môi trường|hành tinh|vũ trụ|thiên văn|phát thải|carbon|oxi|kim loại|axit|bazơ)\b/i,
  },
  {
    topic: "Lịch sử & Địa lý",
    regex:
      /\b(lịch sử|địa lý|địa danh|thế kỷ|triều đại|chiến tranh|kháng chiến|cách mạng|khởi nghĩa|hiệp định|vua|hoàng đế|chủ tịch|thủ đô|sông|núi|biển|châu lục|quốc gia|tỉnh thành|dân số|địa hình|di tích|di sản|đô thị|bản đồ)\b/i,
  },
  {
    topic: "Kinh tế & Quản trị",
    regex:
      /\b(kinh tế|quản trị|quản lý|kế toán|tài chính|ngân hàng|tiền tệ|lạm phát|gdp|doanh nghiệp|kinh doanh|chi phí|doanh thu|lợi nhuận|kế hoạch|dự án|kiểm soát|thị trường|thuế|cung cầu|nhân sự|swot|smart|cpm|pert|evm|roi|eva|bsc|fayol)\b/i,
  },
  {
    topic: "Công nghệ & Tin học",
    regex:
      /\b(khoa học dữ liệu|tin học|máy tính|lập trình|phần mềm|thuật toán|trí tuệ nhân tạo|ai|machine learning|cơ sở dữ liệu|database|mạng máy tính|internet|python|java|code|crisp-dm|k-means|hồi quy|ols)\b/i,
  },
  {
    topic: "Văn hóa - Xã hội",
    regex:
      /\b(văn học|tác phẩm|tác giả|nhà thơ|nhà văn|tiểu thuyết|truyện|thơ|ca dao|tục ngữ|âm nhạc|bài hát|nhạc sĩ|hội họa|điện ảnh|phim|nghệ thuật|thể thao|bóng đá|lễ hội|phong tục|tập quán|tôn giáo|xã hội|triết học|đạo đức)\b/i,
  },
  {
    topic: "Ngoại ngữ",
    regex:
      /\b(tiếng anh|english|ngữ pháp|từ vựng|ngữ âm|idiom|vocabulary|grammar|phát âm|dịch thuật|ngoại ngữ)\b/i,
  },
];

/**
 * Trích xuất hoặc chuẩn hóa chủ đề tổng quát từ nội dung câu hỏi hoặc tên bộ đề.
 */
export function getBroadTopic(params: {
  topic?: string | null;
  content?: string | null;
  bankTitle?: string | null;
}): BroadTopic {
  const { topic, content, bankTitle } = params;

  // 1. Nếu đã có topic cụ thể, kiểm tra xem nó có map trực tiếp vào một BroadTopic không
  if (topic && typeof topic === "string" && topic.trim()) {
    const raw = topic.trim().toLowerCase();
    for (const bt of BROAD_TOPICS) {
      if (raw.includes(bt.toLowerCase())) return bt;
    }
    for (const p of TOPIC_PATTERNS) {
      if (p.regex.test(raw)) return p.topic;
    }
  }

  // 2. Phân tích tên bộ đề (bankTitle) trước vì tên bộ đề phản ánh bao quát lĩnh vực
  if (bankTitle && typeof bankTitle === "string" && bankTitle.trim()) {
    const rawTitle = bankTitle.trim();
    for (const p of TOPIC_PATTERNS) {
      if (p.regex.test(rawTitle)) return p.topic;
    }
  }

  // 3. Phân tích nội dung câu hỏi (content)
  if (content && typeof content === "string" && content.trim()) {
    const rawContent = content.trim();
    for (const p of TOPIC_PATTERNS) {
      if (p.regex.test(rawContent)) return p.topic;
    }
  }

  // 4. Mặc định trả về "Kiến thức Tổng hợp"
  return "Kiến thức Tổng hợp";
}
