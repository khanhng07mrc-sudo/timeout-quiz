// Olympia Hybrid AI Subject Classifier & Stratified Fair Draw Engine
// Classifies questions into:
// - 11 Detailed Subjects (Toán, Lý, Hóa, Sinh, Văn, Sử, Địa, Thể thao, Nghệ thuật, Tiếng Anh, Lĩnh vực khác)
// - 6 Khởi Động Zones (MATH_IT, NATURAL_SCI, SOCIAL_SCI, ARTS_SPORTS, FOREIGN_LANG, GENERAL)
// - 3 Về Đích Macro-Zones (KHTN, KHXH, HBC)
// And provides Stratified Fair Draw algorithms for both Khởi Động and Về Đích.

import {
  KD_ZONES as KD_ZONE_IDS,
  KHOI_DONG_SUBJECTS,
  VD_ZONES as VD_ZONE_IDS,
  type KdZoneId,
  type KhoiDongSubject,
  type OlympiaQuestionSet,
  type QA,
  type VdZoneId,
  type VeDichQuestion,
} from "./types";

export interface KdZoneMeta {
  id: KdZoneId;
  label: string;
  shortLabel: string;
  icon: string;
  subjects: KhoiDongSubject[];
}

export const KD_ZONES: KdZoneMeta[] = [
  { id: "MATH_IT", label: "Toán - Tin", shortLabel: "Toán - Tin", icon: "📐", subjects: ["Toán"] },
  { id: "NATURAL_SCI", label: "Khoa học tự nhiên (Lý, Hóa, Sinh)", shortLabel: "KHTN (Lý-Hóa-Sinh)", icon: "🔬", subjects: ["Lý", "Hóa", "Sinh"] },
  { id: "SOCIAL_SCI", label: "Khoa học xã hội (Văn, Sử, Địa)", shortLabel: "KHXH (Văn-Sử-Địa)", icon: "🌏", subjects: ["Văn", "Sử", "Địa"] },
  { id: "ARTS_SPORTS", label: "Nghệ thuật - Thể thao", shortLabel: "Nghệ thuật - Thể thao", icon: "🎨", subjects: ["Thể thao", "Nghệ thuật"] },
  { id: "FOREIGN_LANG", label: "Tiếng Anh - Ngoại ngữ", shortLabel: "Tiếng Anh", icon: "🇬🇧", subjects: ["Tiếng Anh"] },
  { id: "GENERAL", label: "Hiểu biết chung", shortLabel: "Hiểu biết chung", icon: "💡", subjects: ["Lĩnh vực khác"] },
];

export interface VdZoneMeta {
  id: VdZoneId;
  label: string;
  shortLabel: string;
  icon: string;
}

export const VD_ZONES: VdZoneMeta[] = [
  { id: "KHTN", label: "Khoa học tự nhiên (Toán, Lý, Hóa, Sinh)", shortLabel: "KHTN", icon: "🔬" },
  { id: "KHXH", label: "Khoa học xã hội (Văn, Sử, Địa)", shortLabel: "KHXH", icon: "🌏" },
  { id: "HBC", label: "Hiểu biết chung (Thể thao, Nghệ thuật, Anh, Đời sống)", shortLabel: "Hiểu biết chung", icon: "💡" },
];

export interface ClassificationResult {
  subject: KhoiDongSubject;
  kdZone: KdZoneId;
  vdZone: VdZoneId;
  confidence: number;
}

/** Map each of the 11 detailed subjects to its 6-zone Khởi Động bucket */
export const SUBJECT_TO_KD_ZONE: Record<KhoiDongSubject, KdZoneId> = {
  Toán: "MATH_IT",
  Lý: "NATURAL_SCI",
  Hóa: "NATURAL_SCI",
  Sinh: "NATURAL_SCI",
  Văn: "SOCIAL_SCI",
  Sử: "SOCIAL_SCI",
  Địa: "SOCIAL_SCI",
  "Thể thao": "ARTS_SPORTS",
  "Nghệ thuật": "ARTS_SPORTS",
  "Tiếng Anh": "FOREIGN_LANG",
  "Lĩnh vực khác": "GENERAL",
};

/** Map each of the 11 detailed subjects to its 3-zone Về Đích macro-bucket */
export const SUBJECT_TO_VD_ZONE: Record<KhoiDongSubject, VdZoneId> = {
  Toán: "KHTN",
  Lý: "KHTN",
  Hóa: "KHTN",
  Sinh: "KHTN",
  Văn: "KHXH",
  Sử: "KHXH",
  Địa: "KHXH",
  "Thể thao": "HBC",
  "Nghệ thuật": "HBC",
  "Tiếng Anh": "HBC",
  "Lĩnh vực khác": "HBC",
};

/** Map a 6-zone Khởi Động bucket to its 3-zone Về Đích macro-bucket */
export const KD_ZONE_TO_VD_ZONE: Record<KdZoneId, VdZoneId> = {
  MATH_IT: "KHTN",
  NATURAL_SCI: "KHTN",
  SOCIAL_SCI: "KHXH",
  ARTS_SPORTS: "HBC",
  FOREIGN_LANG: "HBC",
  GENERAL: "HBC",
};

const SUBJECT_KEYWORDS: Record<KhoiDongSubject, { weight: number; patterns: RegExp[] }[]> = {
  Toán: [
    {
      weight: 4,
      patterns: [
        /\b(số nguyên tố|phương trình|tam giác|hình học|đạo hàm|tích phân|đa thức|phân số|tỉ lệ thức|căn bậc|logarit|hệ trục tọa độ|diện tích|thể tích|chu vi|góc vuông|cạnh huyền|pythagore|pitago|fibonacci|ma trận|xác suất|tổ hợp|chỉnh hợp|bội chung|ước chung|hàm số|đồ thị|vectơ|vector|số tự nhiên|số thực|số chẵn|số lẻ|chia hết)\b/i,
      ],
    },
    {
      weight: 2,
      patterns: [/\b(tính|bằng bao nhiêu|tổng của|tích của|hiệu của|thương của|chữ số|hình chữ nhật|hình vuông|hình tròn|bán kính|đường kính|nhị phân|thuật toán)\b/i],
    },
  ],
  Lý: [
    {
      weight: 4,
      patterns: [
        /\b(vật lý|vận tốc|gia tốc|lực ma sát|trọng lực|trọng trường|điện trở|cường độ dòng điện|hiệu điện thế|công suất|tần số|bước sóng|khúc xạ|phản xạ ánh sáng|thấu kính|nhiệt động lực|định luật newton|định luật ôm|ohm|ampe|vôn|volt|watt|joule|jun|hạt nhân|quang học|cơ học|điện từ|từ trường|siêu âm|áp suất|lực đẩy ác-si-mét|archimedes)\b/i,
      ],
    },
    {
      weight: 2,
      patterns: [/\b(chuyển động|quãng đường|nhiệt độ sôi|nóng chảy|chân không|vận tốc ánh sáng|m\/s|km\/h|hz|kwh)\b/i],
    },
  ],
  Hóa: [
    {
      weight: 4,
      patterns: [
        /\b(hóa học|nguyên tố|bảng tuần hoàn|nguyên tử khối|phân tử|liên kết cộng hóa trị|liên kết ion|axit|acid|bazơ|base|muối|oxit|oxi hóa|khử|chất xúc tác|kết tủa|dung dịch|nồng độ mol|phản ứng hóa học|mendeleev|hidro|oxi|cacbon|nitơ|natri|canxi|sắt|đồng|nhôm|kẽm|clo|lưu huỳnh|h2o|co2|nacl|h2so4|hcl|naoh|caco3|ch4)\b/i,
      ],
    },
    {
      weight: 2,
      patterns: [/\b(kim loại|phi kim|khí hiếm|quỳ tím|polime|este|glucozo|ancol|hidrocacbon|hợp chất)\b/i],
    },
  ],
  Sinh: [
    {
      weight: 4,
      patterns: [
        /\b(sinh học|tế bào|nhiễm sắc thể|adn|dna|arn|rna|gen|di truyền|đột biến|quang hợp|hô hấp tế bào|tiêu hóa|tuần hoàn|hệ thần kinh|vi khuẩn|virus|vi rút|nấm|thực vật|động vật|động vật có vú|lưỡng cư|bò sát|côn trùng|sinh thái|chuỗi thức ăn|máu|hồng cầu|bạch cầu|kháng thể|vaccine|vắc xin|protein|enzym|men|darwin|menden|mendel)\b/i,
      ],
    },
    {
      weight: 2,
      patterns: [/\b(cơ thể người|vitamin|lá cây|rễ cây|thụ phấn|loài vật|huyết áp|nhịp tim|phổi|gan|thận)\b/i],
    },
  ],
  Văn: [
    {
      weight: 4,
      patterns: [
        /\b(văn học|bài thơ|nhà thơ|nhà văn|tiểu thuyết|truyện ngắn|tác phẩm|tác giả|nhân vật văn học|truyện kiều|nguyễn du|nam cao|tố hữu|xuân diệu|hồ xuân hương|nguyễn trãi|vũ trọng phụng|ngô tất tố|tô hoài|nguyễn tuân|chữ nôm|lục bát|thất ngôn|ca dao|tục ngữ|thành ngữ|ẩn dụ|hoán dụ|nhân hóa|biện pháp tu từ|kịch|vở kịch)\b/i,
      ],
    },
    {
      weight: 2,
      patterns: [/\b(câu thơ|đoạn thơ|khổ thơ|tập thơ|bút danh|văn xuôi|thần thoại|cổ tích|ngụ ngôn)\b/i],
    },
  ],
  Sử: [
    {
      weight: 4,
      patterns: [
        /\b(lịch sử|triều đại|nhà lý|nhà trần|nhà lê|nhà nguyễn|nhà hồ|nhà tiền lê|nhà đinh|vua|hoàng đế|khởi nghĩa|chiến dịch|chiến thắng|bạch đằng|điện biên phủ|cách mạng tháng tám|hiệp định|geneva|pari|paris|thế chiến|chiến tranh thế giới|danh tướng|trần hưng đạo|quang trung|nguyễn huệ|lê lợi|ngô quyền|hai bà trưng|bà triệu|lý thường kiệt|di tích lịch sử|niên hiệu|kinh đô|thăng long)\b/i,
      ],
    },
    {
      weight: 2,
      patterns: [/\b(năm \d{3,4}|thế kỷ|thời kỳ|cổ đại|trung đại|cận đại|hiện đại|di chỉ|văn hóa đông sơn)\b/i],
    },
  ],
  Địa: [
    {
      weight: 4,
      patterns: [
        /\b(địa lý|châu lục|châu á|châu âu|châu phi|châu mỹ|châu đại dương|châu nam cực|đại dương|thái bình dương|đại tây dương|ấn độ dương|bắc băng dương|dãy núi|đỉnh núi|sông|hồ|biển|đảo|quần đảo|bán đảo|eo biển|kênh đào|thủ đô|tỉnh|thành phố|đồng bằng|cao nguyên|khí hậu|nhiệt đới|xích đạo|vĩ tuyến|kinh tuyến|múi giờ|biên giới|diện tích tự nhiên|dân số)\b/i,
      ],
    },
    {
      weight: 2,
      patterns: [/\b(quốc gia nào|nước nào|tỉnh nào|miền bắc|miền trung|miền nam|tây nguyên|đồng bằng sông cửu long|sông hồng|sông mê kông)\b/i],
    },
  ],
  "Thể thao": [
    {
      weight: 4,
      patterns: [
        /\b(thể thao|bóng đá|world cup|euro|olympic|sea games|asiad|huy chương vàng|vận động viên|cầu thủ|huấn luyện viên|sân vận động|bóng rổ|bóng chuyền|quần vợt|tennis|cầu lông|bơi lội|điền kinh|marathon|cờ vua|võ thuật|thẻ đỏ|thẻ vàng|phạt đền|penalty|việt vị|vô địch|giải đấu|fifa)\b/i,
      ],
    },
    {
      weight: 2,
      patterns: [/\b(môn thể thao|đội tuyển|bàn thắng|kỷ lục thế giới|nhà vô địch)\b/i],
    },
  ],
  "Nghệ thuật": [
    {
      weight: 4,
      patterns: [
        /\b(nghệ thuật|âm nhạc|bài hát|ca khúc|nhạc sĩ|ca sĩ|hội họa|bức tranh|họa sĩ|điêu khắc|kiến trúc|điện ảnh|bộ phim|đạo diễn|diễn viên|oscar|grammy|nhạc cụ|piano|guitar|violin|sáo|đàn bầu|đàn tranh|dân ca|quan họ|cải lương|tuồng|chèo|nhã nhạc|di sản văn hóa phi vật thể|văn cao|trịnh công sơn|beethoven|mozart|picasso|leonardo da vinci|mona lisa)\b/i,
      ],
    },
    {
      weight: 2,
      patterns: [/\b(giai điệu|nốt nhạc|hợp xướng|giao hưởng|triển lãm|bảo tàng mỹ thuật)\b/i],
    },
  ],
  "Tiếng Anh": [
    {
      weight: 5,
      patterns: [
        /\b(what|which|where|when|who|how many| how much|in english|tiếng anh|complete the sentence|choose the correct|synonym|antonym|meaning of the word|translate into|means in english)\b/i,
      ],
    },
    {
      weight: 3,
      patterns: [/\b(the|is|are|was|were|have|has|will|would|can|could|should|from|with|about|called)\b.*\b(what|which|who|where|when|how)\b/i],
    },
  ],
  "Lĩnh vực khác": [
    {
      weight: 2,
      patterns: [
        /\b(hiểu biết chung|pháp luật|hiến pháp|giao thông|tổ chức quốc tế|liên hợp quốc|unesco|unicef|who|asean|wto|internet|mạng xã hội|ẩm thực|món ăn|lễ hội|tết|danh lam|kỳ quan|nobel|giải thưởng|tiền tệ|ngân hàng)\b/i,
      ],
    },
  ],
};

/** Normalize user/Excel subject string to canonical KhoiDongSubject if possible */
export function normalizeSubjectLabel(raw?: string): KhoiDongSubject | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  if (s.includes("toán") || s.includes("math") || s.includes("tin học") || s.includes("logic")) return "Toán";
  if (s.includes("lý") || s.includes("lí") || s.includes("vật lý") || s.includes("physics")) return "Lý";
  if (s.includes("hóa") || s.includes("hoá") || s.includes("chemistry")) return "Hóa";
  if (s.includes("sinh") || s.includes("biology")) return "Sinh";
  if (s.includes("văn") || s.includes("literature") || s.includes("tiếng việt")) return "Văn";
  if (s.includes("sử") || s.includes("history")) return "Sử";
  if (s.includes("địa") || s.includes("geography")) return "Địa";
  if (s.includes("thể thao") || s.includes("sport")) return "Thể thao";
  if (s.includes("nghệ thuật") || s.includes("âm nhạc") || s.includes("mỹ thuật") || s.includes("art") || s.includes("music")) return "Nghệ thuật";
  if (s.includes("anh") || s.includes("english") || s.includes("ngoại ngữ")) return "Tiếng Anh";
  if (s.includes("khác") || s.includes("hiểu biết") || s.includes("general") || s.includes("xã hội") || s.includes("đời sống")) return "Lĩnh vực khác";
  return null;
}

/**
 * Instant Hybrid AI Classifier:
 * Evaluates question + answer text (plus any existing hint/subject) and assigns:
 * - `subject` (1 of 11 Olympia subjects)
 * - `kdZone` (1 of 6 Khởi Động zones)
 * - `vdZone` (1 of 3 Về Đích macro-zones: KHTN, KHXH, HBC)
 * - `confidence` (0..100)
 */
export function classifyOlympiaQuestion(
  qText: string,
  aText = "",
  existingSubject?: string,
  existingKdZone?: KdZoneId,
  existingVdZone?: VdZoneId
): ClassificationResult {
  const normalizedExisting = normalizeSubjectLabel(existingSubject);
  if (normalizedExisting && existingSubject && existingSubject.trim() !== "") {
    const kdZone = existingKdZone ?? SUBJECT_TO_KD_ZONE[normalizedExisting];
    const vdZone = existingVdZone ?? SUBJECT_TO_VD_ZONE[normalizedExisting];
    return {
      subject: normalizedExisting,
      kdZone,
      vdZone,
      confidence: 98,
    };
  }

  const combined = `${qText || ""} ${aText || ""}`.trim();
  if (!combined) {
    return {
      subject: "Lĩnh vực khác",
      kdZone: existingKdZone ?? "GENERAL",
      vdZone: existingVdZone ?? "HBC",
      confidence: 50,
    };
  }

  const scores: Record<KhoiDongSubject, number> = {
    Toán: 0,
    Lý: 0,
    Hóa: 0,
    Sinh: 0,
    Văn: 0,
    Sử: 0,
    Địa: 0,
    "Thể thao": 0,
    "Nghệ thuật": 0,
    "Tiếng Anh": 0,
    "Lĩnh vực khác": 1, // baseline fallback
  };

  // Detect English sentence pattern (high ratio of ASCII words without Vietnamese diacritics)
  const words = combined.split(/\s+/).filter(Boolean);
  const hasViDiacritics = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(qText);
  if (!hasViDiacritics && words.length >= 5 && /\b(the|is|are|what|which|who|where|when|how|of|in|to|for|and)\b/i.test(qText)) {
    scores["Tiếng Anh"] += 10;
  }

  // Detect math operators/numbers density
  if (/[+\-*/=^]|(\b\d+\s*[+\-x*÷:]\s*\d+)/.test(qText)) {
    scores["Toán"] += 5;
  }

  for (const subj of KHOI_DONG_SUBJECTS) {
    const rules = SUBJECT_KEYWORDS[subj] ?? [];
    for (const rule of rules) {
      for (const pat of rule.patterns) {
        if (pat.test(combined)) {
          scores[subj] += rule.weight;
        }
      }
    }
  }

  let bestSubject: KhoiDongSubject = "Lĩnh vực khác";
  let bestScore = scores["Lĩnh vực khác"];
  for (const subj of KHOI_DONG_SUBJECTS) {
    if (scores[subj] > bestScore) {
      bestScore = scores[subj];
      bestSubject = subj;
    }
  }

  const kdZone = existingKdZone ?? SUBJECT_TO_KD_ZONE[bestSubject];
  const vdZone = existingVdZone ?? SUBJECT_TO_VD_ZONE[bestSubject];
  const confidence = bestScore >= 8 ? 96 : bestScore >= 4 ? 88 : bestScore >= 2 ? 76 : 62;

  return {
    subject: bestSubject,
    kdZone,
    vdZone,
    confidence,
  };
}

/** Enrich a single QA item with AI subject, kdZone, vdZone, and aiConfidence */
export function tagQAWithAI<T extends QA>(item: T, overwrite = false): T {
  const res = classifyOlympiaQuestion(
    item.q,
    item.a,
    overwrite ? undefined : item.subject,
    overwrite ? undefined : item.kdZone,
    overwrite ? undefined : item.vdZone
  );
  return {
    ...item,
    subject: res.subject,
    kdZone: res.kdZone,
    vdZone: res.vdZone,
    aiConfidence: res.confidence,
  };
}

/** Run AI auto-tagging across an entire OlympiaQuestionSet */
export function autoTagOlympiaSet(set: OlympiaQuestionSet, overwrite = false): OlympiaQuestionSet {
  const next: OlympiaQuestionSet = structuredClone(set);
  for (const seat of Object.keys(next.khoiDong.solo)) {
    next.khoiDong.solo[seat] = (next.khoiDong.solo[seat] ?? []).map((q) => tagQAWithAI(q, overwrite));
  }
  next.khoiDong.shared = (next.khoiDong.shared ?? []).map((q) => tagQAWithAI(q, overwrite));
  for (const pts of Object.keys(next.veDich)) {
    next.veDich[pts] = (next.veDich[pts] ?? []).map((q) => tagQAWithAI(q, overwrite));
  }
  next.cauHoiPhu = (next.cauHoiPhu ?? []).map((q) => tagQAWithAI(q, overwrite));
  return next;
}

export interface SetDiversityReport {
  totalKhoiDong: number;
  kdZoneCounts: Record<KdZoneId, number>;
  kdSubjectCounts: Record<KhoiDongSubject, number>;
  missingKdZones: KdZoneId[];
  totalVeDich: number;
  vdZoneCounts: Record<VdZoneId, number>;
  vdByPointsAndZone: Record<string, Record<VdZoneId, number>>;
  missingVdZones: VdZoneId[];
  balanceScore: number; // 0..100
  isBalanced: boolean;
  recommendations: string[];
}

/** Analyze subject & zone coverage across Khởi Động (6 zones) and Về Đích (3 zones) */
export function analyzeSetDiversity(set: OlympiaQuestionSet): SetDiversityReport {
  const kdZoneCounts: Record<KdZoneId, number> = {
    MATH_IT: 0,
    NATURAL_SCI: 0,
    SOCIAL_SCI: 0,
    ARTS_SPORTS: 0,
    FOREIGN_LANG: 0,
    GENERAL: 0,
  };
  const kdSubjectCounts = Object.fromEntries(KHOI_DONG_SUBJECTS.map((s) => [s, 0])) as Record<KhoiDongSubject, number>;

  const allKd: QA[] = [
    ...Object.values(set.khoiDong.solo ?? {}).flat(),
    ...(set.khoiDong.shared ?? []),
  ];

  for (const raw of allKd) {
    const tagged = tagQAWithAI(raw, false);
    const z = tagged.kdZone ?? "GENERAL";
    kdZoneCounts[z] = (kdZoneCounts[z] ?? 0) + 1;
    const s = (tagged.subject as KhoiDongSubject) || "Lĩnh vực khác";
    if (s in kdSubjectCounts) kdSubjectCounts[s] += 1;
  }

  const vdZoneCounts: Record<VdZoneId, number> = {
    KHTN: 0,
    KHXH: 0,
    HBC: 0,
  };
  const vdByPointsAndZone: Record<string, Record<VdZoneId, number>> = {
    "10": { KHTN: 0, KHXH: 0, HBC: 0 },
    "20": { KHTN: 0, KHXH: 0, HBC: 0 },
    "30": { KHTN: 0, KHXH: 0, HBC: 0 },
  };

  let totalVeDich = 0;
  for (const [pts, list] of Object.entries(set.veDich ?? {})) {
    if (!vdByPointsAndZone[pts]) vdByPointsAndZone[pts] = { KHTN: 0, KHXH: 0, HBC: 0 };
    for (const raw of list ?? []) {
      const tagged = tagQAWithAI(raw, false);
      const vz = tagged.vdZone ?? "HBC";
      vdZoneCounts[vz] = (vdZoneCounts[vz] ?? 0) + 1;
      vdByPointsAndZone[pts][vz] = (vdByPointsAndZone[pts][vz] ?? 0) + 1;
      totalVeDich += 1;
    }
  }

  const missingKdZones = KD_ZONE_IDS.filter((z) => kdZoneCounts[z] === 0);
  const missingVdZones = VD_ZONE_IDS.filter((z) => vdZoneCounts[z] === 0);

  const kdZoneCoverage = ((KD_ZONE_IDS.length - missingKdZones.length) / KD_ZONE_IDS.length) * 60;
  const vdZoneCoverage = ((VD_ZONE_IDS.length - missingVdZones.length) / VD_ZONE_IDS.length) * 40;
  const balanceScore = Math.round(kdZoneCoverage + vdZoneCoverage);
  const isBalanced = missingKdZones.length === 0 && missingVdZones.length === 0 && allKd.length >= 24 && totalVeDich >= 9;

  const recommendations: string[] = [];
  if (missingKdZones.length > 0) {
    recommendations.push(`Khởi Động đang thiếu câu hỏi ở ${missingKdZones.length}/6 phân vùng.`);
  }
  if (missingVdZones.length > 0) {
    recommendations.push(`Về Đích đang thiếu câu hỏi ở phân vùng: ${missingVdZones.join(", ")}.`);
  }
  for (const pts of ["10", "20", "30"]) {
    const zMap = vdByPointsAndZone[pts];
    if (zMap) {
      const missingInTier = VD_ZONE_IDS.filter((z) => (zMap[z] ?? 0) === 0);
      if (missingInTier.length > 0 && (set.veDich[pts]?.length ?? 0) > 0) {
        recommendations.push(`Kho Về Đích ${pts}đ nên bổ sung thêm phân vùng: ${missingInTier.join(", ")}.`);
      }
    }
  }

  return {
    totalKhoiDong: allKd.length,
    kdZoneCounts,
    kdSubjectCounts,
    missingKdZones,
    totalVeDich,
    vdZoneCounts,
    vdByPointsAndZone,
    missingVdZones,
    balanceScore,
    isBalanced,
    recommendations,
  };
}

export const classifyQuestionWithAI = classifyOlympiaQuestion;
export const autoTagEntireOlympiaSet = autoTagOlympiaSet;

export interface InventoryBucketStats {
  total: number;
  used: number;
  remaining: number;
  status: "ok" | "warning" | "danger" | "yellow" | "red";
  minWarning: number;
  minDanger: number;
  yellowThreshold: number;
  redThreshold: number;
}

export type InventorySlotStats = InventoryBucketStats;

export interface SetInventoryReport {
  playerCount: number;
  overallStatus: "ok" | "warning" | "danger" | "yellow" | "red";
  totalQuestions: InventoryBucketStats;
  kdTotal: InventoryBucketStats;
  kdByZone: Record<KdZoneId, InventoryBucketStats>;
  kdBySubject: Record<KhoiDongSubject, InventoryBucketStats>;
  vdTotal: InventoryBucketStats;
  vdByTier: Record<string, InventoryBucketStats>;
  vdByZone: Record<VdZoneId, InventoryBucketStats>;
  vdMatrix: Record<string, Record<VdZoneId, InventoryBucketStats>>;
  chpTotal: InventoryBucketStats;
  khoiDong: {
    overall: InventoryBucketStats;
    byZone: Record<KdZoneId, InventoryBucketStats>;
    bySubject: Record<KhoiDongSubject, InventoryBucketStats>;
  };
  vcnv: {
    rowsTotal: number;
    rowsUsed: number;
    hasKeyword: boolean;
    hasCenterQuestion: boolean;
    status: "ok" | "warning" | "danger" | "yellow" | "red";
  };
  tangToc: {
    total: number;
    used: number;
    remaining: number;
    status: "ok" | "warning" | "danger" | "yellow" | "red";
  };
  veDich: {
    overall: InventoryBucketStats;
    byPoints: Record<string, InventoryBucketStats>;
    byZone: Record<VdZoneId, InventoryBucketStats>;
    byPointsAndZone: Record<string, Record<VdZoneId, InventoryBucketStats>>;
  };
  cauHoiPhu: InventoryBucketStats;
  alerts: { level: "warning" | "danger" | "yellow" | "red"; round: string; message: string }[];
}

function mkBucket(total: number, used: number, minWarning: number, minDanger: number): InventoryBucketStats {
  const remaining = Math.max(0, total - used);
  const status: "ok" | "yellow" | "red" =
    remaining < minDanger || (minDanger === 0 && remaining === 0)
      ? "red"
      : remaining < minWarning
        ? "yellow"
        : "ok";
  return {
    total,
    used,
    remaining,
    status,
    minWarning,
    minDanger,
    yellowThreshold: minWarning,
    redThreshold: minDanger,
  };
}

/**
 * Full inventory & usage threshold analyzer:
 * Computes Total, Used, Remaining, and Warning/Danger status across:
 * - Khởi Động (Overall: Yellow < 75, Red < X*9; Per 6-zone: Yellow < 12, Red < X; Per 11-subject: Yellow < 5, Red === 0)
 * - Về Đích (Overall: Yellow < 24, Red < X*3; Per point tier 10/20/30: Yellow < 8, Red < X; Per tier & 3-zone: Yellow < 3, Red === 0)
 * - Câu Hỏi Phụ (Yellow < 5, Red < 3)
 */
export function analyzeSetInventoryAndThresholds(
  set: OlympiaQuestionSet,
  playerCount = 4
): SetInventoryReport {
  const X = Math.max(2, Math.min(8, playerCount || 4));
  const alerts: { level: "warning" | "danger" | "yellow" | "red"; round: string; message: string }[] = [];

  // 1. Khởi Động (deduplicated by question text or across all slots)
  const allKdRaw: QA[] = [
    ...Object.values(set.khoiDong.solo ?? {}).flat(),
    ...(set.khoiDong.shared ?? []),
  ].filter((q) => q && q.q?.trim());

  const kdZoneTotal: Record<KdZoneId, number> = {
    MATH_IT: 0,
    NATURAL_SCI: 0,
    SOCIAL_SCI: 0,
    ARTS_SPORTS: 0,
    FOREIGN_LANG: 0,
    GENERAL: 0,
  };
  const kdZoneUsed: Record<KdZoneId, number> = {
    MATH_IT: 0,
    NATURAL_SCI: 0,
    SOCIAL_SCI: 0,
    ARTS_SPORTS: 0,
    FOREIGN_LANG: 0,
    GENERAL: 0,
  };
  const kdSubjTotal = Object.fromEntries(KHOI_DONG_SUBJECTS.map((s) => [s, 0])) as Record<KhoiDongSubject, number>;
  const kdSubjUsed = Object.fromEntries(KHOI_DONG_SUBJECTS.map((s) => [s, 0])) as Record<KhoiDongSubject, number>;

  let kdTotal = 0;
  let kdUsed = 0;
  for (const raw of allKdRaw) {
    const t = tagQAWithAI(raw, false);
    const z = t.kdZone ?? "GENERAL";
    const s = (t.subject as KhoiDongSubject) || "Lĩnh vực khác";
    kdTotal += 1;
    kdZoneTotal[z] = (kdZoneTotal[z] ?? 0) + 1;
    if (s in kdSubjTotal) kdSubjTotal[s] += 1;
    if (raw.used) {
      kdUsed += 1;
      kdZoneUsed[z] = (kdZoneUsed[z] ?? 0) + 1;
      if (s in kdSubjUsed) kdSubjUsed[s] += 1;
    }
  }

  const kdOverall = mkBucket(kdTotal, kdUsed, 75, X * 9);
  if (kdOverall.status === "red" || kdOverall.status === "danger") {
    alerts.push({
      level: "red",
      round: "Khởi Động",
      message: `Số câu Khởi Động còn lại quá ít (${kdOverall.remaining}/${kdOverall.total} câu, tối thiểu cần ${X * 9} câu cho ${X} thí sinh).`,
    });
  } else if (kdOverall.status === "yellow" || kdOverall.status === "warning") {
    alerts.push({
      level: "yellow",
      round: "Khởi Động",
      message: `Kho Khởi Động còn ${kdOverall.remaining}/${kdOverall.total} câu chưa dùng (khuyến nghị ≥ 75 câu).`,
    });
  }

  const kdByZone = {} as Record<KdZoneId, InventoryBucketStats>;
  for (const z of KD_ZONE_IDS) {
    kdByZone[z] = mkBucket(kdZoneTotal[z], kdZoneUsed[z], 12, X);
    if (kdByZone[z].status === "red" || kdByZone[z].status === "danger") {
      alerts.push({
        level: "red",
        round: "Khởi Động",
        message: `Phân vùng Khởi Động [${z}] chỉ còn ${kdByZone[z].remaining} câu chưa dùng (cần ≥ ${X} câu cho ${X} thí sinh).`,
      });
    } else if (kdByZone[z].status === "yellow" || kdByZone[z].status === "warning") {
      alerts.push({
        level: "yellow",
        round: "Khởi Động",
        message: `Phân vùng Khởi Động [${z}] còn ${kdByZone[z].remaining} câu chưa dùng (khuyến nghị ≥ 12 câu).`,
      });
    }
  }

  const kdBySubject = {} as Record<KhoiDongSubject, InventoryBucketStats>;
  for (const s of KHOI_DONG_SUBJECTS) {
    kdBySubject[s] = mkBucket(kdSubjTotal[s], kdSubjUsed[s], 5, 0);
  }

  // 2. VCNV
  const vcnvRows = (set.vcnv?.rows ?? []).filter((r) => r && (r.hint?.trim() || r.answer?.trim()));
  const vcnvRowsUsed = vcnvRows.filter((r) => r.used).length;
  const hasKeyword = Boolean(set.vcnv?.answer?.trim());
  const hasCenterQuestion = Boolean(set.vcnv?.centerQuestion?.q?.trim());
  const vcnvStatus: "ok" | "warning" | "danger" =
    !hasKeyword || vcnvRows.length < 4
      ? "danger"
      : !hasCenterQuestion || vcnvRowsUsed >= 4
        ? "warning"
        : "ok";

  // 3. Tăng Tốc
  const ttList = (set.tangToc ?? []).filter((t) => t && (t.q?.trim() || t.media?.trim() || t.answer?.trim()));
  const ttUsed = ttList.filter((t) => t.used).length;
  const ttRemaining = Math.max(0, ttList.length - ttUsed);
  const ttStatus: "ok" | "warning" | "danger" =
    ttList.length < 4 ? "danger" : ttRemaining < 4 ? "warning" : "ok";

  // 4. Về Đích
  const vdZoneTotal: Record<VdZoneId, number> = { KHTN: 0, KHXH: 0, HBC: 0 };
  const vdZoneUsed: Record<VdZoneId, number> = { KHTN: 0, KHXH: 0, HBC: 0 };
  const vdByPoints: Record<string, InventoryBucketStats> = {};
  const vdByPointsAndZone: Record<string, Record<VdZoneId, InventoryBucketStats>> = {};
  let vdTotal = 0;
  let vdUsed = 0;

  for (const pts of ["10", "20", "30"]) {
    const list = (set.veDich?.[pts] ?? []).filter((q) => q && q.q?.trim());
    const pTotal = list.length;
    const pUsed = list.filter((q) => q.used).length;
    vdTotal += pTotal;
    vdUsed += pUsed;
    vdByPoints[pts] = mkBucket(pTotal, pUsed, 8, X);
    if (vdByPoints[pts].status === "red" || vdByPoints[pts].status === "danger") {
      alerts.push({
        level: "red",
        round: "Về Đích",
        message: `Kho Về Đích mức ${pts} điểm chỉ còn ${vdByPoints[pts].remaining} câu chưa dùng (cần ≥ ${X} câu).`,
      });
    } else if (vdByPoints[pts].status === "yellow" || vdByPoints[pts].status === "warning") {
      alerts.push({
        level: "yellow",
        round: "Về Đích",
        message: `Kho Về Đích mức ${pts} điểm còn ${vdByPoints[pts].remaining} câu chưa dùng (khuyến nghị ≥ 8 câu).`,
      });
    }

    const zT: Record<VdZoneId, number> = { KHTN: 0, KHXH: 0, HBC: 0 };
    const zU: Record<VdZoneId, number> = { KHTN: 0, KHXH: 0, HBC: 0 };
    for (const raw of list) {
      const t = tagQAWithAI(raw, false);
      const vz = t.vdZone ?? "HBC";
      zT[vz] += 1;
      vdZoneTotal[vz] += 1;
      if (raw.used) {
        zU[vz] += 1;
        vdZoneUsed[vz] += 1;
      }
    }
    vdByPointsAndZone[pts] = {
      KHTN: mkBucket(zT.KHTN, zU.KHTN, 3, 0),
      KHXH: mkBucket(zT.KHXH, zU.KHXH, 3, 0),
      HBC: mkBucket(zT.HBC, zU.HBC, 3, 0),
    };
  }

  const vdOverall = mkBucket(vdTotal, vdUsed, 24, X * 3);
  if (vdOverall.status === "red" || vdOverall.status === "danger") {
    alerts.push({
      level: "red",
      round: "Về Đích",
      message: `Tổng câu Về Đích chưa dùng quá ít (${vdOverall.remaining}/${vdOverall.total} câu, tối thiểu cần ${X * 3} câu cho ${X} thí sinh).`,
    });
  } else if (vdOverall.status === "yellow" || vdOverall.status === "warning") {
    alerts.push({
      level: "yellow",
      round: "Về Đích",
      message: `Kho Về Đích còn ${vdOverall.remaining}/${vdOverall.total} câu chưa dùng (khuyến nghị ≥ 24 câu).`,
    });
  }

  const vdByZone: Record<VdZoneId, InventoryBucketStats> = {
    KHTN: mkBucket(vdZoneTotal.KHTN, vdZoneUsed.KHTN, 8, X),
    KHXH: mkBucket(vdZoneTotal.KHXH, vdZoneUsed.KHXH, 8, X),
    HBC: mkBucket(vdZoneTotal.HBC, vdZoneUsed.HBC, 8, X),
  };

  // 5. Câu Hỏi Phụ
  const chpList = (set.cauHoiPhu ?? []).filter((q) => q && q.q?.trim());
  const chpUsed = chpList.filter((q) => q.used).length;
  const chpStats = mkBucket(chpList.length, chpUsed, 5, 3);
  if (chpStats.status === "red" || chpStats.status === "danger") {
    alerts.push({
      level: "red",
      round: "Câu Hỏi Phụ",
      message: `Kho Câu Hỏi Phụ chỉ còn ${chpStats.remaining} câu chưa dùng (cần ≥ 3 câu).`,
    });
  }

  const grandTotal = kdTotal + vcnvRows.length + ttList.length + vdTotal + chpList.length;
  const grandUsed = kdUsed + vcnvRowsUsed + ttUsed + vdUsed + chpUsed;
  const totalQuestions = mkBucket(grandTotal, grandUsed, 105, X * 12);

  const hasRed = alerts.some((a) => a.level === "red" || a.level === "danger");
  const hasYellow = alerts.some((a) => a.level === "yellow" || a.level === "warning");
  const overallStatus: "ok" | "yellow" | "red" = hasRed ? "red" : hasYellow ? "yellow" : "ok";

  return {
    playerCount: X,
    overallStatus,
    totalQuestions,
    kdTotal: kdOverall,
    kdByZone,
    kdBySubject,
    vdTotal: vdOverall,
    vdByTier: vdByPoints,
    vdByZone,
    vdMatrix: vdByPointsAndZone,
    chpTotal: chpStats,
    khoiDong: {
      overall: kdOverall,
      byZone: kdByZone,
      bySubject: kdBySubject,
    },
    vcnv: {
      rowsTotal: vcnvRows.length,
      rowsUsed: vcnvRowsUsed,
      hasKeyword,
      hasCenterQuestion,
      status: vcnvStatus,
    },
    tangToc: {
      total: ttList.length,
      used: ttUsed,
      remaining: ttRemaining,
      status: ttStatus,
    },
    veDich: {
      overall: vdOverall,
      byPoints: vdByPoints,
      byZone: vdByZone,
      byPointsAndZone: vdByPointsAndZone,
    },
    cauHoiPhu: chpStats,
    alerts,
  };
}

function shuffleWithRng<T>(items: T[], rng: () => number = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Stratified Fair Draw for Vòng Khởi Động:
 * Given the Khởi Động pool and active seat IDs (2..8 contestants), constructs:
 * - `seatQueues`: per-seat array of QA where every cycle of 6 questions contains
 *   exact 1 question from each of the 6 `KdZoneId` buckets (MATH_IT, NATURAL_SCI,
 *   SOCIAL_SCI, ARTS_SPORTS, FOREIGN_LANG, GENERAL), ensuring all contestants
 *   receive an identical zone distribution (whether 6, 12, or unlimited questions).
 * - Prioritizes unused questions (`!q.used`) first before falling back to used questions.
 * - `sharedQueue`: shared pool ordered in balanced 6-zone cycles.
 */
export function buildBalancedKhoiDongQueues(
  khoiDong: OlympiaQuestionSet["khoiDong"],
  activeSeatIds: number[],
  questionsPerSeat = 12,
  rng: () => number = Math.random
): { seatQueues: Record<number, QA[]>; sharedQueue: QA[] } {
  const allRaw: QA[] = [
    ...Object.values(khoiDong.solo ?? {}).flat(),
    ...(khoiDong.shared ?? []),
  ];

  // Deduplicate by question text while tagging
  const seen = new Set<string>();
  const taggedPool: QA[] = [];
  for (const item of allRaw) {
    if (!item || !item.q) continue;
    const key = item.q.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    taggedPool.push(tagQAWithAI(item, false));
  }

  // Group into 6 Khởi Động zones, placing unused (!q.used) questions BEFORE used questions
  const byZone: Record<KdZoneId, QA[]> = {
    MATH_IT: [],
    NATURAL_SCI: [],
    SOCIAL_SCI: [],
    ARTS_SPORTS: [],
    FOREIGN_LANG: [],
    GENERAL: [],
  };
  for (const q of taggedPool) {
    const z = q.kdZone ?? "GENERAL";
    byZone[z].push(q);
  }
  for (const z of KD_ZONE_IDS) {
    const unused = shuffleWithRng(byZone[z].filter((q) => !q.used), rng);
    const alreadyUsed = shuffleWithRng(byZone[z].filter((q) => q.used), rng);
    byZone[z] = [...unused, ...alreadyUsed];
  }

  const zoneCursors: Record<KdZoneId, number> = {
    MATH_IT: 0,
    NATURAL_SCI: 0,
    SOCIAL_SCI: 0,
    ARTS_SPORTS: 0,
    FOREIGN_LANG: 0,
    GENERAL: 0,
  };
  let fallbackCursor = 0;
  const fallbackPool = [
    ...shuffleWithRng(taggedPool.filter((q) => !q.used), rng),
    ...shuffleWithRng(taggedPool.filter((q) => q.used), rng),
  ];

  const drawFromZone = (zone: KdZoneId, usedInSeat: Set<string>): QA | null => {
    const bucket = byZone[zone];
    if (bucket.length > 0) {
      for (let attempt = 0; attempt < bucket.length; attempt++) {
        const idx = (zoneCursors[zone] + attempt) % bucket.length;
        const candidate = bucket[idx];
        if (!usedInSeat.has(candidate.q)) {
          zoneCursors[zone] = idx + 1;
          usedInSeat.add(candidate.q);
          return candidate;
        }
      }
      const pick = bucket[zoneCursors[zone] % bucket.length];
      zoneCursors[zone] += 1;
      return pick;
    }
    if (fallbackPool.length === 0) return null;
    const pick = fallbackPool[fallbackCursor % fallbackPool.length];
    fallbackCursor += 1;
    return { ...pick, kdZone: zone };
  };

  const targetLen = Math.max(questionsPerSeat, 18);
  const cycles = Math.ceil(targetLen / KD_ZONE_IDS.length);
  const seatQueues: Record<number, QA[]> = {};

  for (const seatId of activeSeatIds) {
    const queue: QA[] = [];
    const usedInSeat = new Set<string>();
    for (let c = 0; c < cycles; c++) {
      const cycleZones = shuffleWithRng(KD_ZONE_IDS, rng);
      for (const z of cycleZones) {
        if (queue.length >= targetLen) break;
        const picked = drawFromZone(z, usedInSeat);
        if (picked) queue.push(picked);
      }
    }
    seatQueues[seatId] = queue;
  }

  // Build balanced sharedQueue in 6-zone cycles as well
  const sharedQueue: QA[] = [];
  const usedInShared = new Set<string>();
  const sharedTarget = Math.max(36, activeSeatIds.length * 9, taggedPool.length);
  const sharedCycles = Math.ceil(sharedTarget / KD_ZONE_IDS.length);
  for (let c = 0; c < sharedCycles; c++) {
    const cycleZones = shuffleWithRng(KD_ZONE_IDS, rng);
    for (const z of cycleZones) {
      if (sharedQueue.length >= sharedTarget) break;
      const picked = drawFromZone(z, usedInShared);
      if (picked) sharedQueue.push(picked);
    }
  }

  return { seatQueues, sharedQueue };
}

/**
 * Stratified Fair Draw for Vòng Về Đích:
 * Picks questions for a contestant's chosen point package (e.g. [20, 20, 30] or [10, 10, 20, 20])
 * so that the package covers all 3 macro-zones (`KHTN`, `KHXH`, `HBC`) without repeating used questions,
 * strictly prioritizing questions not marked `used: true` in the bank.
 */
export function pickBalancedVeDichPackage(
  veDichPool: OlympiaQuestionSet["veDich"],
  pointsList: number[],
  usedKeys: Set<string>,
  seatTurnIdx = 0,
  rng: () => number = Math.random
): { points: number; q: VeDichQuestion }[] {
  const baseThree = shuffleWithRng(VD_ZONE_IDS, rng);
  const targetZones: VdZoneId[] = pointsList.map((_, idx) =>
    idx < 3 ? baseThree[idx] : VD_ZONE_IDS[(seatTurnIdx + idx) % VD_ZONE_IDS.length]
  );

  const result: { points: number; q: VeDichQuestion }[] = [];

  for (let i = 0; i < pointsList.length; i++) {
    const p = pointsList[i];
    const desiredZone = targetZones[i];
    const rawBucket = (veDichPool[String(p)] ?? []).map((q) => tagQAWithAI(q, false));

    if (rawBucket.length === 0) {
      result.push({
        points: p,
        q: {
          q: `(Thiếu câu ${p} điểm trong bộ đề)`,
          a: "",
          type: "theory",
          vdZone: desiredZone,
        },
      });
      continue;
    }

    const freshPool = rawBucket.filter((q) => !q.used && !usedKeys.has(`${p}:${q.q}`));
    const unplayedInMatchPool = rawBucket.filter((q) => !usedKeys.has(`${p}:${q.q}`));
    const activePool = freshPool.length > 0 ? freshPool : unplayedInMatchPool.length > 0 ? unplayedInMatchPool : rawBucket;

    const zonesInPkg = new Set(result.map((r) => r.q.vdZone));
    const inDesiredZone = activePool.filter((q) => q.vdZone === desiredZone);
    const inUnseenZone = activePool.filter((q) => q.vdZone && !zonesInPkg.has(q.vdZone));

    const candidatePool =
      inDesiredZone.length > 0
        ? inDesiredZone
        : inUnseenZone.length > 0
          ? inUnseenZone
          : activePool;

    const picked = candidatePool[Math.floor(rng() * candidatePool.length)];
    usedKeys.add(`${p}:${picked.q}`);
    result.push({ points: p, q: picked });
  }

  return result;
}
