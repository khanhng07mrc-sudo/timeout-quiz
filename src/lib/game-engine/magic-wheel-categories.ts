/**
 * Bilingual Category Database for Magic Wheel (Chiếc Nón Kỳ Diệu & Wheel of Fortune)
 * Supports Classic WOF Categories, Modern Seasons 42-44, and Vietnamese Standards.
 */

export interface MagicWheelCategoryDef {
  id: string;
  en: string;
  vi: string;
  group: "CLASSIC" | "MODERN" | "VIETNAMESE" | "LIFESTYLE" | "ENTERTAINMENT";
}

export const MAGIC_WHEEL_CATEGORIES: MagicWheelCategoryDef[] = [
  // ── CLASSIC WHEEL OF FORTUNE CATEGORIES ──
  { id: "around_the_house", en: "AROUND THE HOUSE", vi: "ĐỒ DÙNG TRONG NHÀ", group: "CLASSIC" },
  { id: "before_and_after", en: "BEFORE & AFTER", vi: "TRƯỚC & SAU", group: "CLASSIC" },
  { id: "best_seller", en: "BEST SELLER(S)", vi: "SÁCH BÁN CHẠY", group: "CLASSIC" },
  { id: "character", en: "CHARACTER(S)", vi: "NHÂN VẬT HƯ CẤU", group: "CLASSIC" },
  { id: "classic_tv", en: "CLASSIC TV", vi: "TRUYỀN HÌNH KINH ĐIỂN", group: "CLASSIC" },
  { id: "college_life", en: "COLLEGE LIFE", vi: "ĐỜI SỐNG SINH VIÊN", group: "CLASSIC" },
  { id: "event", en: "EVENT(S)", vi: "SỰ KIỆN", group: "CLASSIC" },
  { id: "family", en: "FAMILY", vi: "GIA ĐÌNH", group: "CLASSIC" },
  { id: "food_and_drink", en: "FOOD & DRINK", vi: "ẨM THỰC & ĐỒ UỐNG", group: "CLASSIC" },
  { id: "headline", en: "HEADLINE", vi: "TIÊU ĐIỂM BÁO CHÍ", group: "CLASSIC" },
  { id: "husband_and_wife", en: "HUSBAND & WIFE", vi: "VỢ CHỒNG NỔI TIẾNG", group: "CLASSIC" },
  { id: "in_the_kitchen", en: "IN THE KITCHEN", vi: "TRONG GIAN BẾP", group: "CLASSIC" },
  { id: "landmark", en: "LANDMARK(S)", vi: "ĐỊA DANH & DANH THẮNG", group: "CLASSIC" },
  { id: "living_thing", en: "LIVING THING(S)", vi: "SINH VẬT SỐNG", group: "CLASSIC" },
  { id: "movie_quote", en: "MOVIE QUOTE", vi: "LỜI THOẠI ĐIỆN ẢNH", group: "CLASSIC" },
  { id: "occupation", en: "OCCUPATION(S)", vi: "NGHỀ NGHIỆP", group: "CLASSIC" },
  { id: "on_the_map", en: "ON THE MAP", vi: "TRÊN BẢN ĐỒ", group: "CLASSIC" },
  { id: "people", en: "PEOPLE", vi: "CON NGƯỜI", group: "CLASSIC" },
  { id: "person", en: "PERSON", vi: "NHÂN VẬT", group: "CLASSIC" },
  { id: "phrase", en: "PHRASE(S)", vi: "CỤM TỪ / THÀNH NGỮ", group: "CLASSIC" },
  { id: "place", en: "PLACE(S)", vi: "ĐỊA ĐIỂM", group: "CLASSIC" },
  { id: "proper_name", en: "PROPER NAME(S)", vi: "TÊN RIÊNG", group: "CLASSIC" },
  { id: "quotation", en: "QUOTATION", vi: "DANH NGÔN & TRÍCH DẪN", group: "CLASSIC" },
  { id: "rhyme_time", en: "RHYME TIME", vi: "VẦN ĐIỆU VUI NHỘN", group: "CLASSIC" },
  { id: "same_letter", en: "SAME LETTER", vi: "CÙNG CHỮ CÁI ĐẦU", group: "CLASSIC" },
  { id: "same_name", en: "SAME NAME", vi: "CHUNG TÊN GỌI", group: "CLASSIC" },
  { id: "show_biz", en: "SHOW BIZ", vi: "GIỚI GIẢI TRÍ", group: "CLASSIC" },
  { id: "song_artist", en: "SONG/ARTIST", vi: "BÀI HÁT & NGHỆ SĨ", group: "CLASSIC" },
  { id: "song_lyrics", en: "SONG LYRICS", vi: "LỜI BÀI HÁT", group: "CLASSIC" },
  { id: "star_and_role", en: "STAR & ROLE", vi: "NGÔI SAO & VAI DIỄN", group: "CLASSIC" },
  { id: "thing", en: "THING(S)", vi: "ĐỒ VẬT / SỰ VẬT", group: "CLASSIC" },
  { id: "title", en: "TITLE(S)", vi: "TÊN TÁC PHẨM", group: "CLASSIC" },
  { id: "title_author", en: "TITLE/AUTHOR", vi: "TÁC PHẨM & TÁC GIẢ", group: "CLASSIC" },
  { id: "what_are_you_doing", en: "WHAT ARE YOU DOING?", vi: "BẠN ĐANG LÀM GÌ?", group: "CLASSIC" },
  { id: "what_are_you_wearing", en: "WHAT ARE YOU WEARING?", vi: "TRANG PHỤC CỦA BẠN", group: "CLASSIC" },

  // ── MODERN SEASONS (42 - 44) ──
  { id: "all_aboard", en: "ALL ABOARD!", vi: "LÊN ĐƯỜNG KHÁM PHÁ!", group: "MODERN" },
  { id: "colorful_language", en: "COLORFUL LANGUAGE", vi: "SẮC MÀU NGÔN TỪ", group: "MODERN" },
  { id: "food_for_thought", en: "FOOD FOR THOUGHT", vi: "MÓN NGON SUY NGẪM", group: "MODERN" },
  { id: "fun_festivals", en: "FUN FESTIVALS", vi: "LỄ HỘI TƯNG BỪNG", group: "MODERN" },
  { id: "happy_hour", en: "HAPPY HOUR", vi: "GIỜ VÀNG THƯ GIÃN", group: "MODERN" },
  { id: "just_desserts", en: "JUST DESSERTS", vi: "MÓN TRÁNG MIỆNG", group: "MODERN" },
  { id: "lifes_a_beach", en: "LIFE'S A BEACH", vi: "BIỂN XANH VẪY GỌI", group: "MODERN" },
  { id: "on_my_playlist", en: "ON MY PLAYLIST", vi: "GIAI ĐIỆU YÊU THÍCH", group: "MODERN" },
  { id: "opposites_attract", en: "OPPOSITES ATTRACT", vi: "ĐỐI NGHỊCH HÚT NHAU", group: "MODERN" },
  { id: "pet_peeve", en: "PET PEEVE", vi: "ĐIỀU KHÓ CHỊU", group: "MODERN" },
  { id: "say_cheese", en: "SAY CHEESE!", vi: "CƯỜI LÊN NÀO!", group: "MODERN" },
  { id: "the_office", en: "THE OFFICE", vi: "CHUYỆN CÔNG SỞ", group: "MODERN" },
  { id: "travel_tips", en: "TRAVEL TIPS", vi: "CẨM NANG DU LỊCH", group: "MODERN" },
  { id: "weather_report", en: "WEATHER REPORT", vi: "DỰ BÁO THỜI TIẾT", group: "MODERN" },
  { id: "what_time_is_it", en: "WHAT TIME IS IT?", vi: "BÂY GIỜ LÀ MẤY GIỜ?", group: "MODERN" },
  { id: "wordplay", en: "WORDPLAY", vi: "CHƠI CHỮ NGHỆ THUẬT", group: "MODERN" },
  { id: "a_numbers_game", en: "A NUMBERS GAME", vi: "TRÒ CHƠI CON SỐ", group: "MODERN" },
  { id: "famous_duo", en: "FAMOUS DUO", vi: "CẶP ĐÔI NỔI TIẾNG", group: "MODERN" },
  { id: "guilty_pleasure", en: "GUILTY PLEURE", vi: "THÚ VUI THẦM KÍN", group: "MODERN" },
  { id: "household_name", en: "HOUSEHOLD NAME", vi: "CÁI TÊN QUEN THUỘC", group: "MODERN" },
  { id: "old_school", en: "OLD SCHOOL", vi: "PHONG CÁCH HOÀI NIỆM", group: "MODERN" },
  { id: "small_talk", en: "SMALL TALK", vi: "CHUYỆN PHIẾM THÂN MẬT", group: "MODERN" },
  { id: "tech_talk", en: "TECH TALK", vi: "CÔNG NGHỆ SỐ", group: "MODERN" },
  { id: "tongue_twister", en: "TONGUE TWISTER", vi: "UỐN LƯỠI THÁCH ĐỐ", group: "MODERN" },
  { id: "heart_to_heart", en: "HEART-TO-HEART", vi: "TÂM TÌNH SÂU LẮNG", group: "MODERN" },

  // ── VIETNAMESE TRADITIONAL CATEGORIES (CHIẾC NÓN KỲ DIỆU VTV3) ──
  { id: "vn_danh_nhan", en: "FAMOUS FIGURES", vi: "DANH NHÂN & LỊCH SỬ", group: "VIETNAMESE" },
  { id: "vn_am_thuc", en: "VIETNAMESE CUISINE", vi: "ẨM THỰC VIỆT NAM", group: "VIETNAMESE" },
  { id: "vn_thanh_ngu", en: "IDIOMS & PROVERBS", vi: "THÀNH NGỮ & TỤC NGỮ", group: "VIETNAMESE" },
  { id: "vn_dia_danh", en: "SCENIC SPOTS", vi: "ĐỊA DANH & THẮNG CẢNH", group: "VIETNAMESE" },
  { id: "vn_van_hoc", en: "LITERATURE & ARTS", vi: "VĂN HỌC & NGHỆ THUẬT", group: "VIETNAMESE" },
  { id: "vn_doi_song", en: "DAILY LIFE", vi: "ĐỜI SỐNG HÀNG NGÀY", group: "VIETNAMESE" },
  { id: "vn_the_gioi_tu_nhien", en: "NATURAL WORLD", vi: "THẾ GIỚI TỰ NHIÊN", group: "VIETNAMESE" },
  { id: "vn_phong_tuc", en: "CUSTOMS & TRADITIONS", vi: "PHONG TỤC TẬP QUÁN", group: "VIETNAMESE" },
];

/**
 * Tra cứu tên danh mục song ngữ chuẩn hóa theo ngôn ngữ hiện hành
 */
export function formatCategoryByEdition(rawCategory: string, edition: "VIETNAMESE" | "ENGLISH" = "VIETNAMESE"): string {
  if (!rawCategory) return edition === "ENGLISH" ? "GENERAL KNOWLEDGE" : "TỔNG HỢP";
  const clean = rawCategory.trim().toUpperCase();

  // Tìm trong danh mục chuẩn
  const match = MAGIC_WHEEL_CATEGORIES.find(
    (c) => c.en.toUpperCase() === clean || c.vi.toUpperCase() === clean || c.id.toUpperCase() === clean
  );

  if (match) {
    return edition === "ENGLISH" ? match.en : match.vi;
  }

  // Nếu không khớp từ điển, trả về nguyên bản
  return rawCategory.trim();
}

/**
 * Trả về chuỗi song ngữ: "ENGLISH_NAME / TÊN_VIỆT"
 */
export function getBilingualCategoryLabel(cat: MagicWheelCategoryDef): string {
  return `${cat.en} • ${cat.vi}`;
}
