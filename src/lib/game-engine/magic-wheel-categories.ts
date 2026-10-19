/**
 * Bilingual Category Database for Magic Wheel (Chiếc Nón Kỳ Diệu & Wheel of Fortune)
 * Comprehensive archive of Classic Categories, Seasons 42-44, and VTV3 Vietnamese categories.
 */

export interface MagicWheelCategoryDef {
  id: string;
  en: string;
  vi: string;
  group: "CLASSIC" | "SEASON_42" | "SEASON_43" | "SEASON_44" | "VIETNAMESE";
  notes?: string;
}

export const MAGIC_WHEEL_CATEGORIES: MagicWheelCategoryDef[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // 1. CLASSIC WHEEL OF FORTUNE CATEGORIES
  // ─────────────────────────────────────────────────────────────────────────────
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
  { id: "stars_and_roles", en: "STARS & ROLES", vi: "CÁC NGÔI SAO & VAI DIỄN", group: "CLASSIC" },
  { id: "thing", en: "THING(S)", vi: "ĐỒ VẬT / SỰ VẬT", group: "CLASSIC" },
  { id: "title", en: "TITLE(S)", vi: "TÊN TÁC PHẨM", group: "CLASSIC" },
  { id: "title_author", en: "TITLE/AUTHOR", vi: "TÁC PHẨM & TÁC GIẢ", group: "CLASSIC" },
  { id: "what_are_you_doing", en: "WHAT ARE YOU DOING?", vi: "BẠN ĐANG LÀM GÌ?", group: "CLASSIC" },
  { id: "what_are_you_wearing", en: "WHAT ARE YOU WEARING?", vi: "TRANG PHỤC CỦA BẠN", group: "CLASSIC" },

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. SEASON 42 CATEGORIES (2024 - 2025)
  // ─────────────────────────────────────────────────────────────────────────────
  { id: "all_aboard", en: "ALL ABOARD!", vi: "LÊN ĐƯỜNG DU NGOẠN!", group: "SEASON_42" },
  { id: "colorful_language", en: "COLORFUL LANGUAGE", vi: "SẮC MÀU NGÔN TỪ", group: "SEASON_42" },
  { id: "food_for_thought", en: "FOOD FOR THOUGHT", vi: "MÓN ĂN SUY NGẪM", group: "SEASON_42" },
  { id: "fun_festivals", en: "FUN FESTIVALS", vi: "LỄ HỘI TƯNG BỪNG", group: "SEASON_42" },
  { id: "happy_hour", en: "HAPPY HOUR", vi: "GIỜ VÀNG THƯ GIÃN", group: "SEASON_42" },
  { id: "just_desserts", en: "JUST DESSERTS", vi: "MÓN TRÁNG MIỆNG NGỌT NGÀO", group: "SEASON_42" },
  { id: "lifes_a_beach", en: "LIFE'S A BEACH", vi: "BIỂN XANH VẪY GỌI", group: "SEASON_42" },
  { id: "on_my_playlist", en: "ON MY PLAYLIST", vi: "GIAI ĐIỆU TRÊN PLAYLIST", group: "SEASON_42" },
  { id: "one_hit_wonder", en: "ONE-HIT WONDER", vi: "BẢN HIT ĐỂ ĐỜI", group: "SEASON_42" },
  { id: "opposites_attract", en: "OPPOSITES ATTRACT", vi: "ĐỐI NGHỊCH HÚT NHAU", group: "SEASON_42" },
  { id: "pet_peeve", en: "PET PEEVE", vi: "THÓI QUEN KHÓ CHỊU", group: "SEASON_42" },
  { id: "resolutions", en: "RESOLUTIONS", vi: "MỤC TIÊU ĐẦU NĂM", group: "SEASON_42" },
  { id: "say_cheese", en: "SAY CHEESE!", vi: "CƯỜI LÊN NÀO!", group: "SEASON_42" },
  { id: "the_next_50_years", en: "THE NEXT 50 YEARS", vi: "50 NĂM TIẾP THEO", group: "SEASON_42" },
  { id: "the_office", en: "THE OFFICE", vi: "CHUYỆN CÔNG SỞ", group: "SEASON_42" },
  { id: "top_40_hits", en: "TOP 40 HITS", vi: "BẢN HIT TOP 40", group: "SEASON_42" },
  { id: "travel_tips", en: "TRAVEL TIPS", vi: "CẨM NANG DU LỊCH", group: "SEASON_42" },
  { id: "weather_report", en: "WEATHER REPORT", vi: "BẢN TIN THỜI TIẾT", group: "SEASON_42" },
  { id: "what_time_is_it", en: "WHAT TIME IS IT?", vi: "BÂY GIỜ LÀ MẤY GIỜ?", group: "SEASON_42" },
  { id: "wordplay", en: "WORDPLAY", vi: "NGHỆ THUẬT CHƠI CHỮ", group: "SEASON_42" },

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. SEASON 43 CATEGORIES (2025 - 2026)
  // ─────────────────────────────────────────────────────────────────────────────
  { id: "a_numbers_game", en: "A NUMBERS GAME", vi: "TRÒ CHƠI CON SỐ", group: "SEASON_43" },
  { id: "abracadabra", en: "ABRACADABRA", vi: "PHÉP THUẬT BIẾN HÓA", group: "SEASON_43" },
  { id: "absurd_bird", en: "ABSURD BIRD", vi: "CHIM CHÓC VUI NHỘN", group: "SEASON_43" },
  { id: "acronym", en: "ACRONYM", vi: "TỪ VIẾT TẮT ĐẶC BIỆT", group: "SEASON_43" },
  { id: "act_your_age", en: "ACT YOUR AGE", vi: "ĐÚNG VỚI LỨA TUỔI", group: "SEASON_43" },
  { id: "americana", en: "AMERICANA", vi: "NÉT ĐẸP VĂN HÓA MỸ", group: "SEASON_43" },
  { id: "back_in_the_day", en: "BACK IN THE DAY", vi: "NGÀY ẤY NĂM XƯA", group: "SEASON_43" },
  { id: "birdbrain", en: "BIRDBRAIN", vi: "ĐẦU ÓC TRÊN MÂY", group: "SEASON_43" },
  { id: "bright_idea", en: "BRIGHT IDEA", vi: "Ý TƯỞNG SÁNG SUỐT", group: "SEASON_43" },
  { id: "body_language", en: "BODY LANGUAGE", vi: "NGÔN NGỮ CƠ THỂ", group: "SEASON_43" },
  { id: "body_temperature", en: "BODY TEMPERATURE", vi: "NHIỆT ĐỘ CƠ THỂ", group: "SEASON_43" },
  { id: "catch_me_if_you_can", en: "CATCH ME IF YOU CAN!", vi: "BẮT TÔI NẾU CÓ THỂ!", group: "SEASON_43" },
  { id: "check_the_calendar", en: "CHECK THE CALENDAR", vi: "XEM LẠI LỊCH TRÌNH", group: "SEASON_43" },
  { id: "chitchat", en: "CHITCHAT", vi: "TÁN GẪU THÂN TÌNH", group: "SEASON_43" },
  { id: "displaced_place", en: "DISPLACED PLACE", vi: "ĐỊA DANH TRÙNG TÊN", group: "SEASON_43" },
  { id: "easy_question", en: "EASY QUESTION", vi: "CÂU HỎI DỄ ỢT", group: "SEASON_43" },
  { id: "famous_beefs", en: "FAMOUS BEEFS", vi: "MÂU THUẪN ĐÌNH ĐÁM", group: "SEASON_43" },
  { id: "famous_duo", en: "FAMOUS DUO", vi: "CẶP ĐÔI NỔI TIẾNG", group: "SEASON_43" },
  { id: "field_trip", en: "FIELD TRIP", vi: "CHUYẾN ĐI THỰC TẾ", group: "SEASON_43" },
  { id: "food_fusion", en: "FOOD FUSION", vi: "ẨM THỰC GIAO THOA", group: "SEASON_43" },
  { id: "fyi", en: "FYI", vi: "THÔNG TIN DÀNH CHO BẠN", group: "SEASON_43" },
  { id: "go_team", en: "GO TEAM!", vi: "TIẾN LÊN TOÀN ĐỘI!", group: "SEASON_43" },
  { id: "guilty_pleasure", en: "GUILTY PLEASURE", vi: "THÚ VUI THẦM KÍN", group: "SEASON_43" },
  { id: "gut_feeling", en: "GUT FEELING", vi: "TRỰC GIÁC MÁCH BẢO", group: "SEASON_43" },
  { id: "happy_new_year", en: "HAPPY NEW YEAR", vi: "CHÚC MỪNG NĂM MỚI", group: "SEASON_43" },
  { id: "household_name", en: "HOUSEHOLD NAME", vi: "CÁI TÊN QUEN THUỘC", group: "SEASON_43" },
  { id: "human_or_animal", en: "HUMAN OR ANIMAL?", vi: "NGƯỜI HAY THÚ?", group: "SEASON_43" },
  { id: "im_puzzled", en: "I'M PUZZLED", vi: "TÔI BĂN KHOĂN QUÁ", group: "SEASON_43" },
  { id: "in_the_water", en: "IN THE WATER", vi: "DƯỚI LÀN NƯỚC XANH", group: "SEASON_43" },
  { id: "lets_play_ball", en: "LET'S PLAY BALL!", vi: "RA SÂN THI ĐẤU NÀO!", group: "SEASON_43" },
  { id: "lions_and_tigers_and", en: "LIONS AND TIGERS AND...", vi: "SƯ TỬ, HỔ VÀ...", group: "SEASON_43" },
  { id: "live_it_up", en: "LIVE IT UP!", vi: "SỐNG HẾT MÌNH!", group: "SEASON_43" },
  { id: "meet_and_greet", en: "MEET & GREET", vi: "GẶP GỠ & GIAO LƯU", group: "SEASON_43" },
  { id: "mixed_message", en: "MIXED MESSAGE", vi: "THÔNG ĐIỆP ĐA CHIỀU", group: "SEASON_43" },
  { id: "most_likely_to", en: "MOST LIKELY TO", vi: "NGƯỜI DỄ CÓ KHẢ NĂNG NHẤT", group: "SEASON_43" },
  { id: "never_have_i_ever", en: "NEVER HAVE I EVER", vi: "TÔI CHƯA BAO GIỜ", group: "SEASON_43" },
  { id: "old_school", en: "OLD SCHOOL", vi: "PHONG CÁCH HOÀI CỔ", group: "SEASON_43" },
  { id: "on_the_course", en: "ON THE COURSE", vi: "TRÊN ĐƯỜNG ĐUA GOLF", group: "SEASON_43" },
  { id: "on_the_court", en: "ON THE COURT", vi: "TRÊN SÂN ĐẤU", group: "SEASON_43" },
  { id: "on_the_dance_floor", en: "ON THE DANCE FLOOR", vi: "TRÊN SÀN KHIÊU VŨ", group: "SEASON_43" },
  { id: "pet_life", en: "PET LIFE", vi: "ĐỜI SỐNG THÚ CƯNG", group: "SEASON_43" },
  { id: "pick_a_card", en: "PICK A CARD, ANY CARD", vi: "CHỌN MỘT LÁ BÀI", group: "SEASON_43" },
  { id: "risky_business", en: "RISKY BUSINESS", vi: "THỬ THÁCH MẠO HIỂM", group: "SEASON_43" },
  { id: "rock_your_body", en: "ROCK YOUR BODY", vi: "KHUẤY ĐỘNG CƠ THỂ", group: "SEASON_43" },
  { id: "shakespeare_said", en: "SHAKESPEARE SAID", vi: "ĐẠI THI HÀO NÓI", group: "SEASON_43" },
  { id: "show_me_a_sign", en: "SHOW ME A SIGN", vi: "HÃY CHO TÔI DẤU HIỆU", group: "SEASON_43" },
  { id: "show_me_the_money", en: "SHOW ME THE MONEY", vi: "TIỀN VỀ TAY AI?", group: "SEASON_43" },
  { id: "small_talk", en: "SMALL TALK", vi: "CHUYỆN TRÒ NGẮN", group: "SEASON_43" },
  { id: "sublime_rhyme", en: "SUBLIME RHYME", vi: "GIAI ĐIỆU TUYỆT HẢO", group: "SEASON_43" },
  { id: "sweet_talk", en: "SWEET TALK", vi: "LỜI ĐƯỜNG MẬT", group: "SEASON_43" },
  { id: "talk_like_a_pirate", en: "TALK LIKE A PIRATE", vi: "NÓI NHƯ CƯỚP BIỂN", group: "SEASON_43" },
  { id: "tech_talk", en: "TECH TALK", vi: "CÔNG NGHỆ SỐ", group: "SEASON_43" },
  { id: "tongue_twister", en: "TONGUE TWISTER", vi: "UỐN LƯỠI THÁCH ĐỐ", group: "SEASON_43" },
  { id: "under_the_tree", en: "UNDER THE TREE", vi: "DƯỚI BÓNG RÂM CÂY", group: "SEASON_43" },
  { id: "up_in_the_air", en: "UP IN THE AIR", vi: "LƠ LỬNG TRÊN KHÔNG", group: "SEASON_43" },
  { id: "wanna_bet", en: "WANNA BET?", vi: "CÁ CƯỢC KHÔNG NÀO?", group: "SEASON_43" },
  { id: "wanna_race", en: "WANNA RACE?", vi: "THI TỐC ĐỘ KHÔNG?", group: "SEASON_43" },
  { id: "what_the_fun", en: "WHAT THE FUN!", vi: "THẬT LÀ VUI VẺ!", group: "SEASON_43" },
  { id: "where_on_earth", en: "WHERE ON EARTH?", vi: "NƠI NÀO TRÊN TRÁI ĐẤT?", group: "SEASON_43" },
  { id: "who_wins", en: "WHO WINS?", vi: "AI SẼ CHIẾN THẮNG?", group: "SEASON_43" },
  { id: "wintertime", en: "WINTERTIME", vi: "MÙA ĐÔNG GIÁ LẠNH", group: "SEASON_43" },
  { id: "working_out", en: "WORKING OUT", vi: "RÈN LUYỆN THỂ CHẤT", group: "SEASON_43" },

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. SEASON 44 CATEGORIES (2026+)
  // ─────────────────────────────────────────────────────────────────────────────
  { id: "all_dressed_up", en: "ALL DRESSED UP", vi: "LÊN ĐỒ LỘNG LẪY", group: "SEASON_44" },
  { id: "heart_to_heart", en: "HEART-TO-HEART", vi: "TÂM TÌNH SÂU LẮNG", group: "SEASON_44" },
  { id: "only_in_la", en: "ONLY IN LA", vi: "CHỈ CÓ Ở LOS ANGELES", group: "SEASON_44" },
  { id: "shout_it_out", en: "SHOUT IT OUT!", vi: "HÔ VANG TÊN NÀO!", group: "SEASON_44" },
  { id: "tv_dinner", en: "TV DINNER", vi: "BỮA TỐI TRƯỚC TIVI", group: "SEASON_44" },
  { id: "wardrobe_mishap", en: "WARDROBE MISHAP", vi: "SỰ CỐ TRANG PHỤC", group: "SEASON_44" },

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. VIETNAMESE TRADITIONAL CATEGORIES (CHIẾC NÓN KỲ DIỆU VTV3)
  // ─────────────────────────────────────────────────────────────────────────────
  { id: "vn_danh_nhan", en: "FAMOUS HISTORICAL FIGURES", vi: "DANH NHÂN & LỊCH SỬ", group: "VIETNAMESE" },
  { id: "vn_am_thuc", en: "VIETNAMESE CUISINE", vi: "ẨM THỰC VIỆT NAM", group: "VIETNAMESE" },
  { id: "vn_thanh_ngu", en: "IDIOMS & PROVERBS", vi: "THÀNH NGỮ & TỤC NGỮ", group: "VIETNAMESE" },
  { id: "vn_dia_danh", en: "SCENIC SPOTS & LANDMARKS", vi: "ĐỊA DANH & THẮNG CẢNH", group: "VIETNAMESE" },
  { id: "vn_van_hoc", en: "LITERATURE & ARTS", vi: "VĂN HỌC & NGHỆ THUẬT", group: "VIETNAMESE" },
  { id: "vn_doi_song", en: "DAILY LIFE & CULTURE", vi: "ĐỜI SỐNG HÀNG NGÀY", group: "VIETNAMESE" },
  { id: "vn_the_gioi_tu_nhien", en: "NATURAL WORLD & WILDLIFE", vi: "THẾ GIỚI TỰ NHIÊN", group: "VIETNAMESE" },
  { id: "vn_phong_tuc", en: "CUSTOMS & FOLKLORE", vi: "PHONG TỤC TẬP QUÁN", group: "VIETNAMESE" },
  { id: "vn_lang_nghe", en: "TRADITIONAL CRAFT VILLAGES", vi: "LÀNG NGHỀ TRUYỀN THỐNG", group: "VIETNAMESE" },
  { id: "vn_ca_dao", en: "FOLK SONGS & POETRY", vi: "CA DAO DÂN CA", group: "VIETNAMESE" },
  { id: "vn_tro_choi", en: "TRADITIONAL FOLK GAMES", vi: "TRÒ CHƠI DÂN GIAN", group: "VIETNAMESE" },
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
 * Trả về chuỗi song ngữ: "ENGLISH_NAME • TÊN_VIỆT"
 */
export function getBilingualCategoryLabel(cat: MagicWheelCategoryDef): string {
  return `${cat.en} • ${cat.vi}`;
}
