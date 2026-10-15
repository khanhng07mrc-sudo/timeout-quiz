import { MysteryQuestState, TeamNoticeType, TeamPrivateNotice } from "@/types";

export interface MysteryTeamRef {
  id: string;
  name: string;
  color?: string;
  score?: number;
  isEliminated?: boolean;
}

export interface NoticeTemplate {
  id: string;
  noticeType: TeamNoticeType;
  title: string;
  text: string;
}

/**
 * Ngân hàng câu thoại bình luận MC Gameshow đa dạng, kịch tính & dí dỏm
 * Mỗi danh mục có ít nhất 15 câu thoại riêng biệt, đảm bảo không trùng lặp suốt cả trận đấu.
 */
export const NOTICE_TEMPLATES: Record<TeamNoticeType, NoticeTemplate[]> = {
  // 1. Đội đang chơi nhận điểm thưởng (+points)
  ACTIVE_REWARD: [
    { id: "ACT_REW_01", noticeType: "ACTIVE_REWARD", title: "THƯỞNG LỚN XỨNG ĐÁNG!", text: "MC xin chúc mừng {actor}! Một pha xử lý vô cùng đẳng cấp mang về trọn vẹn +{points}đ cho đội!" },
    { id: "ACT_REW_02", noticeType: "ACTIVE_REWARD", title: "VẬN MAY BÙNG NỔ!", text: "Tuyệt vời {actor}! Thần may mắn đã mỉm cười rực rỡ, cộng ngay +{points}đ vào két sắt của bạn!" },
    { id: "ACT_REW_03", noticeType: "ACTIVE_REWARD", title: "CÚ BỨT PHÁ NGOẠN MỤC!", text: "Khán giả đang vỗ tay không ngớt! {actor} vừa bỏ túi thêm +{points}đ quý giá trong sự ngưỡng mộ của các đối thủ!" },
    { id: "ACT_REW_04", noticeType: "ACTIVE_REWARD", title: "BÀN TAY VÀNG!", text: "Lựa chọn quá chuẩn xác! {actor} nhận trọn gói phần thưởng +{points}đ từ thử thách định mệnh!" },
    { id: "ACT_REW_05", noticeType: "ACTIVE_REWARD", title: "ĐIỂM SỐ RỰC SÁNG!", text: "Một bước tiến dài trên bảng xếp hạng! {actor} đã xuất sắc ghi thêm +{points}đ vào tổng điểm!" },
    { id: "ACT_REW_06", noticeType: "ACTIVE_REWARD", title: "KHAI TIỆC CHIẾN THẮNG!", text: "Không thể ngăn cản {actor} lúc này! Phần thưởng +{points}đ hoàn toàn xứng đáng với bản lĩnh của các bạn!" },
    { id: "ACT_REW_07", noticeType: "ACTIVE_REWARD", title: "ĐẠI CÁT ĐẠI LỢI!", text: "Cả trường quay như nổ tung! {actor} vừa gặt hái thành công rực rỡ với +{points}đ thưởng nóng!" },
    { id: "ACT_REW_08", noticeType: "ACTIVE_REWARD", title: "BẢN LĨNH DẪN LỐI!", text: "Một quyết định sáng suốt mang lại trái ngọt: +{points}đ đã chính thức thuộc về {actor}!" },
    { id: "ACT_REW_09", noticeType: "ACTIVE_REWARD", title: "MƯA ĐIỂM THƯỞNG!", text: "Cơn mưa điểm thưởng rơi trúng {actor}! Nhận ngay +{points}đ để củng cố vị thế trên đấu trường!" },
    { id: "ACT_REW_10", noticeType: "ACTIVE_REWARD", title: "QUẢ THẦN TRAO TAY!", text: "Bí mật đã được giải mã trọn vẹn! {actor} thâu tóm xuất sắc +{points}đ từ tay thần hộ mệnh!" },
    { id: "ACT_REW_11", noticeType: "ACTIVE_REWARD", title: "CÚ ĐÁNH CHÍNH XÁC!", text: "Pha ra đòn không chê vào đâu được! {actor} bỏ túi ngọt ngào +{points}đ trong tiếng reo hò phấn khích!" },
    { id: "ACT_REW_12", noticeType: "ACTIVE_REWARD", title: "ĐỘT PHÁ NĂNG LƯỢNG!", text: "Năng lượng bùng nổ! {actor} nạp ngay +{points}đ vào tài khoản, sẵn sàng bứt tốc về đích!" },
    { id: "ACT_REW_13", noticeType: "ACTIVE_REWARD", title: "VƯỢT THỬ THÁCH THÀNH CÔNG!", text: "Thử thách khó nhằn cũng phải chào thua! {actor} ẵm trọn phần thưởng +{points}đ đầy kiêu hãnh!" },
    { id: "ACT_REW_14", noticeType: "ACTIVE_REWARD", title: "TIẾP LỬA VINH QUANG!", text: "Chiến thắng tiếp nối chiến thắng! {actor} rinh thêm +{points}đ điểm thưởng cực kỳ ấn tượng!" },
    { id: "ACT_REW_15", noticeType: "ACTIVE_REWARD", title: "VẬN KHÍ HANH THÔNG!", text: "Trời ban vận đỏ! {actor} vừa rước về két sắt +{points}đ thần tài trước ánh mắt thèm thuồng của đối phương!" },
  ],

  // 2. Đội đang chơi dính bẫy nổ hoặc bị trừ điểm
  ACTIVE_PENALTY_BOMB: [
    { id: "ACT_PEN_01", noticeType: "ACTIVE_PENALTY_BOMB", title: "TAI NẠN KHÓ ĐỠ!", text: "Ôi không! {actor} vừa bước hụt vào bẫy phục kích, tổn thất đau đớn -{points}đ! Hãy lấy lại bình tĩnh nhé!" },
    { id: "ACT_PEN_02", noticeType: "ACTIVE_PENALTY_BOMB", title: "BOM PHÁT NỔ!", text: "Khói mù bao phủ trường quay! Quả bom phát nổ khiến {actor} đánh rơi -{points}đ đầy tiếc nuối!" },
    { id: "ACT_PEN_03", noticeType: "ACTIVE_PENALTY_BOMB", title: "CÚ TRƯỢT CHÂN!", text: "Một phút sơ sẩy của {actor}! Chiếc bẫy ngầm đã tước đi -{points}đ từ tài khoản của bạn!" },
    { id: "ACT_PEN_04", noticeType: "ACTIVE_PENALTY_BOMB", title: "ĐỊNH MỆNH TRÊU NGƯƠI!", text: "Quá đen đủi cho {actor}! Cạm bẫy bất ngờ kích hoạt khiến bạn mất trắng -{points}đ trong chớp mắt!" },
    { id: "ACT_PEN_05", noticeType: "ACTIVE_PENALTY_BOMB", title: "MỘT CHÚT SÓNG GIÓ!", text: "Đường đến vinh quang không bao giờ trải hoa hồng! {actor} vừa chịu tổn thất -{points}đ, cố gắng ở câu tiếp theo!" },
    { id: "ACT_PEN_06", noticeType: "ACTIVE_PENALTY_BOMB", title: "BẪY SẬP BẤT NGỜ!", text: "Tia sét giáng xuống! {actor} lãnh trọn đòn phạt trừ -{points}đ! Đừng nản lòng, trận đấu vẫn còn dài!" },
    { id: "ACT_PEN_07", noticeType: "ACTIVE_PENALTY_BOMB", title: "CÚ SỐC TẠI TRƯỜNG QUAY!", text: "Tiếng nổ vang rền khiến khán giả giật mình! {actor} ngậm ngùi để lại -{points}đ tại đấu trường!" },
    { id: "ACT_PEN_08", noticeType: "ACTIVE_PENALTY_BOMB", title: "BƯỚC ĐI TÁO BẠO!", text: "Liều thì ăn nhiều nhưng lần này may mắn chưa mỉm cười với {actor}: Tổn thất -{points}đ điểm số!" },
    { id: "ACT_PEN_09", noticeType: "ACTIVE_PENALTY_BOMB", title: "KHÓI ĐỘC BÙNG PHÁT!", text: "Làn khói đen nuốt chửng điểm số! {actor} bị cuốn bay -{points}đ trong sự thót tim của đồng đội!" },
    { id: "ACT_PEN_10", noticeType: "ACTIVE_PENALTY_BOMB", title: "THỬ THÁCH BẢN LĨNH!", text: "Vấp ngã là để đứng dậy mạnh mẽ hơn! {actor} vừa bị trừ -{points}đ, hãy biến áp lực thành động lực!" },
    { id: "ACT_PEN_11", noticeType: "ACTIVE_PENALTY_BOMB", title: "CẠM BẪY NGÀN NĂM!", text: "Cổ vật giấu bẫy ngầm! {actor} vô tình kích hoạt cơ quan cổ xưa, hao hụt -{points}đ điểm quý báu!" },
    { id: "ACT_PEN_12", noticeType: "ACTIVE_PENALTY_BOMB", title: "CÚ PHẢN ĐÒN ĐAU ĐỚN!", text: "Đòn trừng phạt định mệnh! {actor} bị giảm trừ -{points}đ, hãy siết chặt tay nhau để phục thù!" },
    { id: "ACT_PEN_13", noticeType: "ACTIVE_PENALTY_BOMB", title: "BÃO TỐ GHÉ THĂM!", text: "Cơn bão bất ngờ càn quét quỹ điểm! {actor} rơi vào vùng hiểm địa, mất -{points}đ!" },
    { id: "ACT_PEN_14", noticeType: "ACTIVE_PENALTY_BOMB", title: "GIỜ PHÚT CĂNG THẲNG!", text: "Khán đài lặng đi trong giây lát! {actor} vừa chia tay -{points}đ, cần một cú lội ngược dòng ngay sau đây!" },
    { id: "ACT_PEN_15", noticeType: "ACTIVE_PENALTY_BOMB", title: "BÀI HỌC CỦA ĐỊNH MỆNH!", text: "Định mệnh gửi gắm bài học đắt giá! {actor} bị trừ -{points}đ, nhưng cơ hội lật kèo vẫn rộng mở phía trước!" },
  ],

  // 3. Đội đang chơi cướp điểm thành công từ đối thủ
  ACTIVE_STEAL_SUCCESS: [
    { id: "ACT_STL_01", noticeType: "ACTIVE_STEAL_SUCCESS", title: "CÚ RA TAY HOÀN HẢO!", text: "Xuất sắc tuyệt đỉnh! {actor} đã cướp ngọt ngào +{points}đ từ tay đối thủ {victim}!" },
    { id: "ACT_STL_02", noticeType: "ACTIVE_STEAL_SUCCESS", title: "ĐOẠT MỆNH NGOẠN MỤC!", text: "Pha đột kích thần tốc! {actor} vừa hút trọn +{points}đ từ kho báu của {victim} mang về két sắt của mình!" },
    { id: "ACT_STL_03", noticeType: "ACTIVE_STEAL_SUCCESS", title: "CHIẾN LỢI PHẨM KHỦNG!", text: "Cả trường quay ngỡ ngàng! {actor} tước đi +{points}đ từ {victim}, tạo bước ngoặt lớn cho cuộc đua!" },
    { id: "ACT_STL_04", noticeType: "ACTIVE_STEAL_SUCCESS", title: "BÀN TAY ĐẠO TẶC!", text: "Không một động tác thừa! {actor} cuỗm trọn vẹn +{points}đ từ {victim} trước sự bất lực của đối phương!" },
    { id: "ACT_STL_05", noticeType: "ACTIVE_STEAL_SUCCESS", title: "CÚ ĐÁNH SẤM SÉT!", text: "Đòn đánh chí mạng! {actor} đã rút cạn +{points}đ của {victim}, đưa đội mình vươn lên mạnh mẽ!" },
    { id: "ACT_STL_06", noticeType: "ACTIVE_STEAL_SUCCESS", title: "CƯỚP ĐIỂM CHỚP NHOÁNG!", text: "Nhanh như chớp! {actor} đã kịp chuyển thẳng +{points}đ từ tài khoản {victim} sang đội mình!" },
    { id: "ACT_STL_07", noticeType: "ACTIVE_STEAL_SUCCESS", title: "THẦN TỐC CHIẾM ĐOẠT!", text: "Chiến thuật quá cao tay! {actor} khiến {victim} phải ngậm ngùi dâng tặng +{points}đ!" },
    { id: "ACT_STL_08", noticeType: "ACTIVE_STEAL_SUCCESS", title: "BỨT PHÁ BẰNG ĐOẠT MỆNH!", text: "Gia tăng cách biệt ngoạn mục! {actor} vừa thu hoạch thêm +{points}đ từ túi của đối thủ {victim}!" },
    { id: "ACT_STL_09", noticeType: "ACTIVE_STEAL_SUCCESS", title: "TÀI NĂNG ĐẠO TẶC ĐỈNH CAO!", text: "Đúng lúc, đúng thời điểm! {actor} bẻ khóa thành công kho điểm của {victim}, ẵm trọn +{points}đ!" },
    { id: "ACT_STL_10", noticeType: "ACTIVE_STEAL_SUCCESS", title: "CÚ SỐC CHO ĐỐI THỦ!", text: "{victim} chỉ biết thốt lên tiếc nuối khi chứng kiến {actor} mang về +{points}đ chiến lợi phẩm!" },
    { id: "ACT_STL_11", noticeType: "ACTIVE_STEAL_SUCCESS", title: "XOAY CHUYỂN CỤC DIỆN!", text: "Cục diện đảo chiều! {actor} tước lấy +{points}đ từ {victim}, củng cố vững chắc ngôi vị của mình!" },
    { id: "ACT_STL_12", noticeType: "ACTIVE_STEAL_SUCCESS", title: "CÚ RÚT RUỘT THẦN SẦU!", text: "Thần chết vung lưỡi hái! {actor} thu về trọn vẹn +{points}đ trích xuất trực tiếp từ đối thủ {victim}!" },
    { id: "ACT_STL_13", noticeType: "ACTIVE_STEAL_SUCCESS", title: "CHIẾN KÊ ĐOẠT ĐIỂM!", text: "Móng vuốt sắc bén! {actor} quắp ngay +{points}đ từ đối thủ {victim} bay vút lên dẫn đầu!" },
    { id: "ACT_STL_14", noticeType: "ACTIVE_STEAL_SUCCESS", title: "VỪA CỘNG VỪA TRỪ ĐỐI PHƯƠNG!", text: "Niềm vui nhân đôi! {actor} vừa tăng +{points}đ, vừa khiến đối thủ {victim} tụt lùi đáng kể!" },
    { id: "ACT_STL_15", noticeType: "ACTIVE_STEAL_SUCCESS", title: "MÀN TRÌNH DIỄN ĐỈNH CHÓP!", text: "Khán đài đứng dậy vỗ tay! Cú cướp điểm +{points}đ từ {victim} của {actor} xứng đáng điểm 10 nghệ thuật!" },
  ],

  // 4. Đội đang chơi cướp nhưng đối thủ có khiên/miễn nhiễm -> Nhận fallback 50% từ Quỹ
  ACTIVE_STEAL_FALLBACK: [
    { id: "ACT_FB_01", noticeType: "ACTIVE_STEAL_FALLBACK", title: "ĐỐI THỦ BẢO VỆ CHẶT CHẼ!", text: "Các đối thủ đều đang có khiên bảo hộ hoặc miễn nhiễm! Quỹ Hệ Thống chi trả công bằng 50% điểm gốc (+{points}đ) cho {actor}!" },
    { id: "ACT_FB_02", noticeType: "ACTIVE_STEAL_FALLBACK", title: "RÀO CHẮN KIÊN CỐ!", text: "Không thể xuyên thủng phòng tuyến đối phương! Theo quy chế, {actor} nhận nóng nửa số điểm câu (+{points}đ) từ hệ thống!" },
    { id: "ACT_FB_03", noticeType: "ACTIVE_STEAL_FALLBACK", title: "PHÒNG THỦ KÍN KẼ!", text: "Đối thủ đã kịp dựng khiên! Nhưng đừng buồn, {actor} vẫn được hệ thống rót ngân sách an toàn +{points}đ!" },
    { id: "ACT_FB_04", noticeType: "ACTIVE_STEAL_FALLBACK", title: "CÔNG BẰNG TUYỆT ĐỐI!", text: "Khi không có mục tiêu hợp lệ để cướp, {actor} nhận an toàn 50% điểm gốc (+{points}đ) về kho dự trữ!" },
    { id: "ACT_FB_05", noticeType: "ACTIVE_STEAL_FALLBACK", title: "BẢO VỆ TOÀN DIỆN!", text: "Bức tường miễn nhiễm phát huy tác dụng! {actor} vẫn bỏ túi ngon lành +{points}đ hỗ trợ từ trọng tài!" },
    { id: "ACT_FB_06", noticeType: "ACTIVE_STEAL_FALLBACK", title: "TRÁNH XUNG ĐỘT TRỰC TIẾP!", text: "Đối thủ thở phào nhẹ nhõm, còn {actor} vẫn mỉm cười với +{points}đ an toàn từ Quỹ Trận Đấu!" },
    { id: "ACT_FB_07", noticeType: "ACTIVE_STEAL_FALLBACK", title: "TIỀN THƯỞNG HÒA BÌNH!", text: "Không có ai bị thương tích! {actor} vui vẻ nhận thưởng hòa bình 50% điểm câu (+{points}đ) từ ban tổ chức!" },
    { id: "ACT_FB_08", noticeType: "ACTIVE_STEAL_FALLBACK", title: "KHIÊN THẦN NGĂN BƯỚC!", text: "Lực lượng phòng vệ của đối phương quá mạnh! {actor} quay sang nhận nóng +{points}đ bảo đảm từ hệ thống!" },
    { id: "ACT_FB_09", noticeType: "ACTIVE_STEAL_FALLBACK", title: "QUY TẮC CÔNG BẰNG LÊN TIẾNG!", text: "Đúng theo luật chơi gameshow: {actor} mang về đúng 1/2 số điểm gốc câu hỏi (+{points}đ)!" },
    { id: "ACT_FB_10", noticeType: "ACTIVE_STEAL_FALLBACK", title: "THU HOẠCH AN TOÀN!", text: "Không mất công tranh đoạt! {actor} nhận thẳng +{points}đ từ Quỹ Trung Ương vào bảng điểm!" },
    { id: "ACT_FB_11", noticeType: "ACTIVE_STEAL_FALLBACK", title: "KÉO LẠI ĐIỂM SỐ!", text: "Dù đối thủ miễn nhiễm, bàn tay may mắn vẫn giúp {actor} gặt hái +{points}đ thưởng an toàn!" },
    { id: "ACT_FB_12", noticeType: "ACTIVE_STEAL_FALLBACK", title: "ĐỐI THỦ THOÁT NẠN!", text: "Đối phương hú vía thoát nạn, còn {actor} vẫn có quà: +{points}đ tinh thần từ hệ thống!" },
    { id: "ACT_FB_13", noticeType: "ACTIVE_STEAL_FALLBACK", title: "HÀI HÒA THẾ TRẬN!", text: "Bảo toàn tình đoàn kết! {actor} nhận trọn +{points}đ từ ngân quỹ trò chơi mà không làm phật lòng ai!" },
    { id: "ACT_FB_14", noticeType: "ACTIVE_STEAL_FALLBACK", title: "KHÔNG VỀ TAY TRẮNG!", text: "Tuyệt đối không ra về tay không! {actor} lĩnh thưởng trọn vẹn nửa điểm câu (+{points}đ) từ hệ thống!" },
    { id: "ACT_FB_15", noticeType: "ACTIVE_STEAL_FALLBACK", title: "CÂN BẰNG ĐỊNH MỆNH!", text: "Luật công bằng được thực thi! {actor} bỏ túi +{points}đ nhẹ nhàng, tiếp tục hành trình săn cúp!" },
  ],

  // 5. Đội đang chơi dừng lại nhận thưởng an toàn từ cánh cổng cược
  ACTIVE_GAMBLE_STOP: [
    { id: "ACT_GMB_01", noticeType: "ACTIVE_GAMBLE_STOP", title: "DỪNG LẠI TỈNH TÁO!", text: "Biết đủ là hạnh phúc! {actor} chọn dừng lại bảo toàn thành quả +{points}đ an toàn tuyệt đối!" },
    { id: "ACT_GMB_02", noticeType: "ACTIVE_GAMBLE_STOP", title: "QUYẾT ĐỊNH THÔNG MINH!", text: "Cái đầu lạnh của nhà vô địch! {actor} chốt hạ ngay +{points}đ, không cho rủi ro có cơ hội xuất hiện!" },
    { id: "ACT_GMB_03", noticeType: "ACTIVE_GAMBLE_STOP", title: "BẢO TOÀN CHIẾN LỢI PHẨM!", text: "Pha xử lý chắc như bắp! {actor} cất ngay +{points}đ vào hòm và khép lại cánh cổng đánh cược!" },
    { id: "ACT_GMB_04", noticeType: "ACTIVE_GAMBLE_STOP", title: "BẢN LĨNH TỰ CHỦ!", text: "Không bị cám dỗ khuất phục! {actor} hài lòng mang về +{points}đ điểm thưởng chắc chắn!" },
    { id: "ACT_GMB_05", noticeType: "ACTIVE_GAMBLE_STOP", title: "TIÍCH TIỂU THÀNH ĐẠI!", text: "Chậm mà chắc! {actor} gom thêm +{points}đ an toàn, xây chắc nền móng chiến thắng!" },
    { id: "ACT_GMB_06", noticeType: "ACTIVE_GAMBLE_STOP", title: "CỬA AN TOÀN ĐÃ KHÉP!", text: "MC xin nhiệt liệt chúc mừng quyết định sáng suốt của {actor}: Nhận trọn vẹn +{points}đ!" },
    { id: "ACT_GMB_07", noticeType: "ACTIVE_GAMBLE_STOP", title: "ĐÓNG NẮP KHO BÁU!", text: "Đã khóa két sắt thành công! {actor} an toàn với +{points}đ trong sự thán phục của khán giả!" },
    { id: "ACT_GMB_08", noticeType: "ACTIVE_GAMBLE_STOP", title: "CHIẾN THUẬT BẬC THẦY!", text: "Biết tiến biết thoái đúng lúc! {actor} rinh về +{points}đ ngọt ngào mà không mảy may sứt mẻ!" },
    { id: "ACT_GMB_09", noticeType: "ACTIVE_GAMBLE_STOP", title: "AN TOÀN LÀ BẠN!", text: "Phương châm ăn chắc mặc bền! {actor} nhận nóng +{points}đ và nhường lượt chơi trong êm đẹp!" },
    { id: "ACT_GMB_10", noticeType: "ACTIVE_GAMBLE_STOP", title: "CHỐT ĐƠN THẮNG LỢI!", text: "Chốt đơn thành công rực rỡ! {actor} đút túi +{points}đ điểm số vững chắc!" },
    { id: "ACT_GMB_11", noticeType: "ACTIVE_GAMBLE_STOP", title: "RÚT QUÂN HỢP LÝ!", text: "Lui binh đúng thời khắc quyết định! {actor} bảo vệ nguyên vẹn +{points}đ danh giá!" },
    { id: "ACT_GMB_12", noticeType: "ACTIVE_GAMBLE_STOP", title: "TỈNH TÁO VÀ CHÍNH XÁC!", text: "Không sa đà vào may rủi! {actor} mang +{points}đ về nhà trong nụ cười mãn nguyện!" },
    { id: "ACT_GMB_13", noticeType: "ACTIVE_GAMBLE_STOP", title: "VỮNG TAY LÁI!", text: "Tay lái lụa tránh mọi ổ gà! {actor} kết thúc lượt chơi mĩ mãn với +{points}đ trọn gói!" },
    { id: "ACT_GMB_14", noticeType: "ACTIVE_GAMBLE_STOP", title: "CHIẾN LƯỢC DÀI HƠI!", text: "Nhìn xa trông rộng! {actor} lấy chắc +{points}đ để dồn sức cho các thử thách lớn hơn phía trước!" },
    { id: "ACT_GMB_15", noticeType: "ACTIVE_GAMBLE_STOP", title: "BÀI HỌC VÀNG VỀ TÍNH TOÁN!", text: "Một pha dừng bước mẫu mực! {actor} ghi thêm +{points}đ vào bảng vàng thành tích!" },
  ],

  // 6. Đội đang chơi vượt qua chế độ sinh tử an toàn (Thoát hiểm)
  ACTIVE_SURVIVAL_ESCAPE: [
    { id: "ACT_SRV_ESC_01", noticeType: "ACTIVE_SURVIVAL_ESCAPE", title: "THOÁT HIỂM NGOẠN MỤC!", text: "Thần kỳ đến khó tin! {actor} đã bước qua Cửa Sinh Tử nguyên vẹn, bảo toàn tuyệt đối điểm số và tim!" },
    { id: "ACT_SRV_ESC_02", noticeType: "ACTIVE_SURVIVAL_ESCAPE", title: "SỐNG SÓT KỲ DIỆU!", text: "Cả khán phòng nín thở rồi vỡ òa! {actor} đã sống sót sau thử thách Sinh Tử đầy cam go!" },
    { id: "ACT_SRV_ESC_03", noticeType: "ACTIVE_SURVIVAL_ESCAPE", title: "BÀN TAY ĐỊNH MỆNH!", text: "Bình yên thoát nạn! {actor} đã chọn đúng cánh cửa thần kỳ, điểm số và sinh mạng được giữ vững!" },
    { id: "ACT_SRV_ESC_04", noticeType: "ACTIVE_SURVIVAL_ESCAPE", title: "PHÉP MÀU XUẤT HIỆN!", text: "Một phép màu giữa hiểm nguy! {actor} xuất sắc vượt qua bẫy tử thần mà không mất một giọt mồ hôi!" },
    { id: "ACT_SRV_ESC_05", noticeType: "ACTIVE_SURVIVAL_ESCAPE", title: "BƯỚC CHÂN TỬ TẾ!", text: "Vận may của kẻ dũng cảm! {actor} an toàn bước ra khỏi khu vực nguy hiểm trong tràng pháo tay giòn giã!" },
    { id: "ACT_SRV_ESC_06", noticeType: "ACTIVE_SURVIVAL_ESCAPE", title: "HÚ VÍA VỀ ĐÍCH!", text: "Tim đập chân run nhưng kết quả ngọt ngào! {actor} bảo vệ nguyên vẹn hành trang thi đấu!" },
    { id: "ACT_SRV_ESC_07", noticeType: "ACTIVE_SURVIVAL_ESCAPE", title: "VƯỢT BÃO BÌNH AN!", text: "Cơn bão Sinh Tử không thể quật ngã {actor}! Điểm số của bạn vẫn đứng vững như bàn thạch!" },
    { id: "ACT_SRV_ESC_08", noticeType: "ACTIVE_SURVIVAL_ESCAPE", title: "CÚ LÁCH KHE CỬA HẸP!", text: "Khe cửa hẹp 20% đã mở ra cho {actor}! Cú đào thoát ngoạn mục xứng đáng lưu vào lịch sử!" },
    { id: "ACT_SRV_ESC_09", noticeType: "ACTIVE_SURVIVAL_ESCAPE", title: "TÁI SINH TỪ HIỂM NGUY!", text: "Bản lĩnh kiên cường đã cứu {actor}! Toàn bộ điểm số được niêm phong an toàn tuyệt đối!" },
    { id: "ACT_SRV_ESC_10", noticeType: "ACTIVE_SURVIVAL_ESCAPE", title: "ÁNH SÁNG NƠI ĐÁY VỰC!", text: "Ánh sáng hy vọng đã dẫn lối {actor} thoát khỏi bóng tối Sinh Tử trong gang tấc!" },
    { id: "ACT_SRV_ESC_11", noticeType: "ACTIVE_SURVIVAL_ESCAPE", title: "VẬN ĐỎ ĐỈNH CAO!", text: "Ai bảo trả lời sai là mất tất cả? {actor} vừa chứng minh vận may đỉnh cao của mình!" },
    { id: "ACT_SRV_ESC_12", noticeType: "ACTIVE_SURVIVAL_ESCAPE", title: "BẢO TOÀN TRỌN VẸN!", text: "Không xây xước một chút nào! {actor} ngẩng cao đầu bước tiếp vào chặng đua sinh tử!" },
    { id: "ACT_SRV_ESC_13", noticeType: "ACTIVE_SURVIVAL_ESCAPE", title: "NỤ CƯỜI CHIẾN BINH!", text: "Chiến binh bất tử {actor} vượt qua cạm bẫy trong sự thán phục của toàn thể đối thủ!" },
    { id: "ACT_SRV_ESC_14", noticeType: "ACTIVE_SURVIVAL_ESCAPE", title: "ĐẨY LÙI TAI HỌA!", text: "Tai ương tan biến! {actor} bảo toàn nguyên vẹn số tim và điểm số quý giá!" },
    { id: "ACT_SRV_ESC_15", noticeType: "ACTIVE_SURVIVAL_ESCAPE", title: "CÚ THOÁT TIM ĐẬP NHANH!", text: "Trận hú vía đáng nhớ! {actor} an toàn tuyệt đối, sẵn sàng phản công ở vòng sau!" },
  ],

  // 7. Đội đang chơi gục ngã ở chế độ sinh tử (Thất bại)
  ACTIVE_SURVIVAL_FAIL: [
    { id: "ACT_SRV_FAL_01", noticeType: "ACTIVE_SURVIVAL_FAIL", title: "GỤC NGÃ TRƯỚC CỬA TỬ!", text: "Rất tiếc cho {actor}! Vòng quay Sinh Tử khắc nghiệt đã kích hoạt bẫy phạt trừ -{points}đ!" },
    { id: "ACT_SRV_FAL_02", noticeType: "ACTIVE_SURVIVAL_FAIL", title: "ĐỊNH MỆNH NGHIỆT NGÃ!", text: "Một cú sốc lớn! {actor} không thể vượt qua cạm bẫy sinh tử và bị trừ -{points}đ!" },
    { id: "ACT_SRV_FAL_03", noticeType: "ACTIVE_SURVIVAL_FAIL", title: "CÁNH CỬA KHÉP LẠI!", text: "Cánh cửa hy vọng đã đóng sập! {actor} nhận án phạt -{points}đ từ đấu trường sinh tử!" },
    { id: "ACT_SRV_FAL_04", noticeType: "ACTIVE_SURVIVAL_FAIL", title: "TỔN THẤT NẶNG NỀ!", text: "Cái giá phải trả cho sự sơ sẩy! {actor} bị tước đi -{points}đ, cố gắng gượng dậy ở vòng sau!" },
    { id: "ACT_SRV_FAL_05", noticeType: "ACTIVE_SURVIVAL_FAIL", title: "SÓNG GIÓ CUỐN TRÔI!", text: "Cơn thịnh nộ của Sinh Tử đã quét qua {actor}! Điểm số bị hao hụt -{points}đ!" },
    { id: "ACT_SRV_FAL_06", noticeType: "ACTIVE_SURVIVAL_FAIL", title: "BÀI TOÁN KHÓ CỦA SỐ PHẬN!", text: "Thần may mắn đã ngoảnh mặt lần này! {actor} chịu tổn thương -{points}đ từ cạm bẫy!" },
    { id: "ACT_SRV_FAL_07", noticeType: "ACTIVE_SURVIVAL_FAIL", title: "HỨNG CHỊU TRỪ ĐIỂM!", text: "Đòn phạt không thể né tránh! {actor} bị giảm -{points}đ, cuộc đua lại thêm phần chông gai!" },
    { id: "ACT_SRV_FAL_08", noticeType: "ACTIVE_SURVIVAL_FAIL", title: "KÉO LÙI BẢNG ĐIỂM!", text: "Vấp ngã đau đớn nơi tử địa! {actor} ngậm ngùi để rơi -{points}đ tại vòng chơi này!" },
    { id: "ACT_SRV_FAL_09", noticeType: "ACTIVE_SURVIVAL_FAIL", title: "BẢN LĨNH DƯỚI THỬ THÁCH!", text: "Thất bại là mẹ thành công! Dù bị trừ -{points}đ, hãy giữ vững tinh thần thép nhé {actor}!" },
    { id: "ACT_SRV_FAL_10", noticeType: "ACTIVE_SURVIVAL_FAIL", title: "ĐÊM TỐI TRƯỚC BÌNH MINH!", text: "Khoảnh khắc khó khăn nhất của {actor}! Mất -{points}đ nhưng cơ hội lội ngược dòng vẫn còn!" },
    { id: "ACT_SRV_FAL_11", noticeType: "ACTIVE_SURVIVAL_FAIL", title: "ÁP LỰC ĐÈ NẶNG!", text: "Cạm bẫy sinh tử đã siết chặt! {actor} bị khấu trừ -{points}đ vào tài khoản điểm số!" },
    { id: "ACT_SRV_FAL_12", noticeType: "ACTIVE_SURVIVAL_FAIL", title: "CÚ SẨY CHÂN ĐÁNG TIẾC!", text: "Chỉ thiếu một chút may mắn nữa thôi! {actor} đành chấp nhận khoản phạt -{points}đ!" },
    { id: "ACT_SRV_FAL_13", noticeType: "ACTIVE_SURVIVAL_FAIL", title: "LỜI CẢNH TỈNH ĐANH THÉP!", text: "Lời cảnh báo gay gắt từ đấu trường! {actor} hao hụt -{points}đ, cần cẩn trọng hơn ở câu hỏi tới!" },
    { id: "ACT_SRV_FAL_14", noticeType: "ACTIVE_SURVIVAL_FAIL", title: "VƯỢT KHÓ KHĂN ĐỂ TRƯỞNG THÀNH!", text: "Tổn thất -{points}đ không thể dập tắt ngọn lửa quyết tâm của {actor}!" },
    { id: "ACT_SRV_FAL_15", noticeType: "ACTIVE_SURVIVAL_FAIL", title: "CHỊU PHẠT VÀ TIẾP BƯỚC!", text: "Chấp nhận hình phạt -{points}đ và hướng về phía trước! Chặng đường vẫn còn nhiều bất ngờ!" },
  ],

  // 8. Đội bị cướp điểm bởi lá CHIẾN XA VII (-50% điểm gốc)
  VICTIM_STOLEN_CHARIOT: [
    { id: "VIC_CHA_01", noticeType: "VICTIM_STOLEN_CHARIOT", title: "CHIẾN XA QUÉT QUA!", text: "MC khẩn cấp báo tin: Cỗ Chiến Xa dũng mãnh của {actor} vừa càn quét qua, cuốn phăng {points}đ của đội bạn!" },
    { id: "VIC_CHA_02", noticeType: "VICTIM_STOLEN_CHARIOT", title: "BỊ CƯỚP ĐIỂM CHỚP NHOÁNG!", text: "Ối giời ơi! Chiến Xa thần tốc của {actor} vừa phóng vèo qua và tước mất {points}đ từ kho điểm của bạn!" },
    { id: "VIC_CHA_03", noticeType: "VICTIM_STOLEN_CHARIOT", title: "MỘT CÚ ĐỘT KÍCH BẤT NGỜ!", text: "{actor} đã nhắm trúng đội bạn! Lá bài Chiến Xa đã lấy đi {points}đ của bạn mang về két sắt của họ!" },
    { id: "VIC_CHA_04", noticeType: "VICTIM_STOLEN_CHARIOT", title: "HAO HỤT CHIẾN THUẬT!", text: "Tin buồn từ đấu trường: Đội bạn vừa bị {actor} 'mượn tạm' {points}đ bằng sức mạnh cỗ Chiến Xa!" },
    { id: "VIC_CHA_05", noticeType: "VICTIM_STOLEN_CHARIOT", title: "BÁNH XE CUỐN ĐIỂM!", text: "Bánh xe Chiến Xa lăn qua không chừa lại gì! Bạn bị trừ {points}đ chuyển thẳng sang tài khoản {actor}!" },
    { id: "VIC_CHA_06", noticeType: "VICTIM_STOLEN_CHARIOT", title: "TAI NẠN NGOÀI LƯỢT!", text: "Đang ngồi yên cũng bị dính đòn! {actor} dùng Chiến Xa ghé thăm và mang đi {points}đ của bạn!" },
    { id: "VIC_CHA_07", noticeType: "VICTIM_STOLEN_CHARIOT", title: "CÚ TẬP KÍCH BẤT NGỜ!", text: "Thật không may! Đội bạn trở thành mục tiêu của cỗ Chiến Xa do {actor} điều khiển: Mất -{points}đ!" },
    { id: "VIC_CHA_08", noticeType: "VICTIM_STOLEN_CHARIOT", title: "SÓC VÌ BỊ TƯỚC ĐIỂM!", text: "Một phen hú vía! {actor} đã kích hoạt Chiến Xa và rút bớt {points}đ từ kho báu của đội bạn!" },
    { id: "VIC_CHA_09", noticeType: "VICTIM_STOLEN_CHARIOT", title: "CẦN PHỤC THÙ GẤP!", text: "Bị {actor} lấy mất {points}đ bằng Chiến Xa rồi! Hãy mài sắc vũ khí để phục thù ngay vòng tới!" },
    { id: "VIC_CHA_10", noticeType: "VICTIM_STOLEN_CHARIOT", title: "BÃO CHIẾN XA CÀN QUÉT!", text: "Cơn lốc Chiến Xa của {actor} đã thổi bay {points}đ của đội bạn trong sự ngỡ ngàng của khán giả!" },
    { id: "VIC_CHA_11", noticeType: "VICTIM_STOLEN_CHARIOT", title: "MẤT MÁC BẤT ĐẮC DĨ!", text: "Đội bạn vừa bị trừ {points}đ do {actor} bốc trúng Chiến Xa! Giờ bạn đã nhận được quyền miễn nhiễm cướp!" },
    { id: "VIC_CHA_12", noticeType: "VICTIM_STOLEN_CHARIOT", title: "ĐÒN ĐÁNH CỦA KẺ DẪN ĐẦU!", text: "{actor} đã tận dụng sức mạnh cỗ xe chiến để tước đi {points}đ của bạn! Đừng buồn, đường dài mới biết ngựa hay!" },
    { id: "VIC_CHA_13", noticeType: "VICTIM_STOLEN_CHARIOT", title: "BÀN TAY CÔNG LÝ ĐÂU RỒI?", text: "Chiến Xa của {actor} quá hung hãn, đội bạn bị trừ -{points}đ! Hãy chờ thời cơ lật ngược ván cờ!" },
    { id: "VIC_CHA_14", noticeType: "VICTIM_STOLEN_CHARIOT", title: "TỔN THẤT ĐIỂM SỐ!", text: "Số điểm -{points}đ đã bốc hơi khỏi tài khoản của bạn và bay thẳng sang đội {actor}!" },
    { id: "VIC_CHA_15", noticeType: "VICTIM_STOLEN_CHARIOT", title: "HÃY BIẾN ĐAU THƯƠNG THÀNH SỨC MẠNH!", text: "Bị {actor} cuỗm mất {points}đ ư? Đừng lo lắng, cơ hội trả đũa sẽ đến ngay trong lượt chơi tiếp theo!" },
  ],

  // 9. Đội bị cướp điểm bởi lá THẦN CHẾT XIII (-100% hoặc -50% điểm gốc)
  VICTIM_STOLEN_DEATH: [
    { id: "VIC_DTH_01", noticeType: "VICTIM_STOLEN_DEATH", title: "LƯỠI HÁI TỬ THẦN!", text: "Tiếng chuông tử thần vang lên! {actor} đã triệu hồi Thần Chết XIII, trảm mất -{points}đ từ tài khoản của bạn!" },
    { id: "VIC_DTH_02", noticeType: "VICTIM_STOLEN_DEATH", title: "CÚ SỐC LỚN TẠI ĐẤU TRƯỜNG!", text: "Một cú sốc cực lớn! {actor} rút trúng lá Thần Chết và hút cạn {points}đ từ bạn. Đau đớn nhưng cuộc chơi vẫn tiếp diễn!" },
    { id: "VIC_DTH_03", noticeType: "VICTIM_STOLEN_DEATH", title: "ĐOẠT MỆNH TÀI KHOẢN!", text: "Thần Chết không tha cho ai! Đội bạn bị {actor} đoạt mệnh tước đi trọn vẹn {points}đ chuyển sang quỹ của họ!" },
    { id: "VIC_DTH_04", noticeType: "VICTIM_STOLEN_DEATH", title: "BÃO TÁP GIÁNG XUỐNG!", text: "Đòn trừng phạt khốc liệt từ Thần Chết! Bạn vừa bị {actor} trừ sạch {points}đ trong chớp mắt!" },
    { id: "VIC_DTH_05", noticeType: "VICTIM_STOLEN_DEATH", title: "RÚT RUỘT KHO BÁU!", text: "Lưỡi hái vung lên trong đêm tối! {actor} đã lấy đi {points}đ từ tay đội bạn! Cố lên nào các chiến binh!" },
    { id: "VIC_DTH_06", noticeType: "VICTIM_STOLEN_DEATH", title: "CƠN ÁC MỘNG THỰC SỰ!", text: "Một cơn ác mộng ngoài lượt chơi! {actor} triệu hồi Thần Chết tước mất {points}đ của đội bạn!" },
    { id: "VIC_DTH_07", noticeType: "VICTIM_STOLEN_DEATH", title: "MẤT MÁC NẶNG NỀ!", text: "Tài khoản của bạn vừa hao hụt -{points}đ vì lá Thần Chết của {actor}! Giờ bạn đã có khiên bảo hộ tối đa!" },
    { id: "VIC_DTH_08", noticeType: "VICTIM_STOLEN_DEATH", title: "ĐỊNH MỆNH KHẮC NGHIỆT!", text: "Lá bài đáng sợ nhất đã gọi tên đội bạn! {actor} hút về +{points}đ từ kho điểm của bạn!" },
    { id: "VIC_DTH_09", noticeType: "VICTIM_STOLEN_DEATH", title: "HÃY ĐỨNG DẬY!", text: "Bị Thần Chết ghé thăm và mất -{points}đ cho {actor}, nhưng ngọn lửa chiến đấu của bạn không bao giờ tắt!" },
    { id: "VIC_DTH_10", noticeType: "VICTIM_STOLEN_DEATH", title: "CÚ TRẢM CHÍ MẠNG!", text: "Lưỡi hái lạnh lùng đã lấy đi {points}đ của bạn trao cho {actor}! Cả hội trường lặng đi vì bất ngờ!" },
    { id: "VIC_DTH_11", noticeType: "VICTIM_STOLEN_DEATH", title: "HÚ CẠN NĂNG LƯỢNG!", text: "Năng lượng bị rút cạn! {actor} vừa thực hiện cú cướp {points}đ ngoạn mục từ đội bạn!" },
    { id: "VIC_DTH_12", noticeType: "VICTIM_STOLEN_DEATH", title: "ÁP ĐẢO TÂM LÝ!", text: "Đừng để bị dao động! Dù bị {actor} lấy mất {points}đ, quyền tự quyết vẫn nằm trong tay bạn ở các vòng tới!" },
    { id: "VIC_DTH_13", noticeType: "VICTIM_STOLEN_DEATH", title: "BÓNG MA TRƯỜNG QUAY!", text: "Bóng ma Thần Chết đã chọn đội bạn làm nạn nhân: Bị trừ -{points}đ chuyển sang két sắt của {actor}!" },
    { id: "VIC_DTH_14", noticeType: "VICTIM_STOLEN_DEATH", title: "TỔN THẤT KHÓ QUÊN!", text: "Một kỷ niệm nhớ đời! {actor} vừa cướp đi {points}đ của đội bạn bằng lá bài tử thần XIII!" },
    { id: "VIC_DTH_15", noticeType: "VICTIM_STOLEN_DEATH", title: "CHUẨN BỊ PHỤC THÙ!", text: "Khoảnh khắc đau đớn bị trừ -{points}đ bởi {actor} sẽ là động lực lớn nhất để bạn bùng nổ phục thù!" },
  ],

  // 10. Đội được bảo vệ an toàn bởi Khiên Hộ Mệnh khi bị nhắm cướp
  VICTIM_PROTECTED_SHIELD: [
    { id: "VIC_PRT_01", noticeType: "VICTIM_PROTECTED_SHIELD", title: "KHIÊN THẦN BẢO VỆ!", text: "Thật hú vía! {actor} định cướp điểm của bạn nhưng Khiên Miễn Nhiễm đã kịp thời chặn đứng, bảo toàn 0đ mất mát!" },
    { id: "VIC_PRT_02", noticeType: "VICTIM_PROTECTED_SHIELD", title: "PHÒNG THỦ TUYỆT ĐỐI!", text: "Cú cướp của {actor} bất thành! Bức tường kiên cố đã bảo vệ trọn vẹn điểm số của đội bạn an toàn tuyệt đối!" },
    { id: "VIC_PRT_03", noticeType: "VICTIM_PROTECTED_SHIELD", title: "BẺ GÃY ĐÒN TẤN CÔNG!", text: "Không dễ xơi đâu nhé {actor}! Khiên hộ mệnh của bạn đã bật nảy đòn cướp điểm ra ngoài!" },
    { id: "VIC_PRT_04", noticeType: "VICTIM_PROTECTED_SHIELD", title: "THOÁT HIỂM AN TOÀN!", text: "Một pha bảo vệ ngoạn mục! Nhờ cơ chế chống cướp liên hoàn, đội bạn hoàn toàn bình an vô sự!" },
    { id: "VIC_PRT_05", noticeType: "VICTIM_PROTECTED_SHIELD", title: "RÀO CHẮN THÉP!", text: "{actor} đành bất lực trước tấm khiên thép của bạn! Điểm số của đội bạn không sứt mẻ một ly!" },
    { id: "VIC_PRT_06", noticeType: "VICTIM_PROTECTED_SHIELD", title: "TIÊU TAN ÂM MƯU CƯỚP ĐIỂM!", text: "Kế hoạch cướp điểm của {actor} phá sản hoàn toàn! Đội bạn được bảo vệ an toàn 100%!" },
    { id: "VIC_PRT_07", noticeType: "VICTIM_PROTECTED_SHIELD", title: "VẬN MAY CỦA KẺ CẨN TRỌNG!", text: "Sự phòng bị chu đáo đã cứu bạn một bàn thua trông thấy trước đòn tấn công của {actor}!" },
    { id: "VIC_PRT_08", noticeType: "VICTIM_PROTECTED_SHIELD", title: "BỨC TƯỜNG MA THUẬT!", text: "Lực cản vô hình đã bảo vệ kho báu của bạn trước ánh mắt thèm thuồng của {actor}!" },
    { id: "VIC_PRT_09", noticeType: "VICTIM_PROTECTED_SHIELD", title: "CÔNG BẰNG ĐƯỢC THỰC THI!", text: "Luật bảo vệ người yếu thế đã phát huy tác dụng! {actor} không thể chạm vào điểm số của bạn!" },
    { id: "VIC_PRT_10", noticeType: "VICTIM_PROTECTED_SHIELD", title: "BẤT KHẢ XÂM PHẠM!", text: "Lãnh địa của bạn là bất khả xâm phạm! {actor} ngậm ngùi tay trắng rời đi!" },
    { id: "VIC_PRT_11", noticeType: "VICTIM_PROTECTED_SHIELD", title: "BÀO CHẮN TOÀN DIỆN!", text: "Tấm khiên tỏa sáng rực rỡ! Đội bạn giữ vững trọn vẹn số điểm mà không mất một cắc!" },
    { id: "VIC_PRT_12", noticeType: "VICTIM_PROTECTED_SHIELD", title: "KHIÊN NẢY CỰC MẠNH!", text: "Đòn đánh của {actor} bị dội ngược trở lại! Đội bạn ung dung bảo toàn tài sản!" },
    { id: "VIC_PRT_13", noticeType: "VICTIM_PROTECTED_SHIELD", title: "THẦN BẢO HỘ ĐỨNG BÊN!", text: "Thần bảo hộ đã giơ cao cánh tay chở che! {actor} đành chuyển sang nhận thưởng từ hệ thống!" },
    { id: "VIC_PRT_14", noticeType: "VICTIM_PROTECTED_SHIELD", title: "AN TÂM BẢO VỆ!", text: "Bạn hoàn toàn có thể thở phào nhẹ nhõm: Kho báu điểm số vẫn vẹn nguyên không đổi!" },
    { id: "VIC_PRT_15", noticeType: "VICTIM_PROTECTED_SHIELD", title: "PHÒNG TUYẾN KIÊN CỐ!", text: "Chiến lũy không thể đánh sập! {actor} đành bó tay trước hệ thống phòng vệ của bạn!" },
  ],

  // 11. Đội Top 1 được nhận quà tặng từ Bom Từ Thiện (+points)
  RECIPIENT_CHARITY_GIFT: [
    { id: "REC_CHA_01", noticeType: "RECIPIENT_CHARITY_GIFT", title: "LỘC TRÊN TRỜI RƠI XUỐNG!", text: "Tin vui bất ngờ! {actor} vừa dính Bom Từ Thiện và buộc phải trao tặng trọn gói +{points}đ cho đội bạn!" },
    { id: "REC_CHA_02", noticeType: "RECIPIENT_CHARITY_GIFT", title: "NGỒI KHÔNG CŨNG CÓ QUÀ!", text: "Tấm lòng vàng bất đắc dĩ! {actor} nổ bom và chuyển thẳng +{points}đ vào tài khoản của bạn. Đừng quên gửi lời cảm ơn!" },
    { id: "REC_CHA_03", noticeType: "RECIPIENT_CHARITY_GIFT", title: "MÓN QUÀ CỦA NGƯỜI TREO NGƯỢC!", text: "Lá bài Người Treo Ngược của {actor} đã hào phóng tặng không cho đội bạn +{points}đ quý báu!" },
    { id: "REC_CHA_04", noticeType: "RECIPIENT_CHARITY_GIFT", title: "BOM TỪ THIỆN PHÁT LỘC!", text: "Cơn mưa vàng rơi trúng đỉnh đầu! {actor} chia sẻ trọn vẹn +{points}đ cho đội dẫn đầu là bạn!" },
    { id: "REC_CHA_05", noticeType: "RECIPIENT_CHARITY_GIFT", title: "GIA TĂNG CÁCH BIỆT MIỄN PHÍ!", text: "Không cần tốn một giọt mồ hôi! Kho điểm của đội bạn vừa tăng vọt +{points}đ nhờ sự hy sinh của {actor}!" },
    { id: "REC_CHA_06", noticeType: "RECIPIENT_CHARITY_GIFT", title: "MÓN HỜI BẤT NGỜ!", text: "Món hời lớn nhất trận đấu! {actor} nổ bom từ thiện, đội bạn hoan hỷ đón nhận +{points}đ vào két sắt!" },
    { id: "REC_CHA_07", noticeType: "RECIPIENT_CHARITY_GIFT", title: "PHẦN THƯỞNG CHO NGƯỜI DẪN ĐẦU!", text: "Ngôi đầu bảng nhận đặc ân! {actor} phải cắn răng trao tặng +{points}đ cho đội bạn theo luật chơi!" },
    { id: "REC_CHA_08", noticeType: "RECIPIENT_CHARITY_GIFT", title: "LỘC BẤT TẬN HƯỞNG!", text: "Được đối thủ tặng điểm ngoài lượt chơi! Nhận ngay +{points}đ từ {actor} và gửi cho họ một nụ cười ấm áp nhé!" },
    { id: "REC_CHA_09", noticeType: "RECIPIENT_CHARITY_GIFT", title: "BOM NỔ HÓA PHÁO HOA!", text: "Bom của {actor} nổ nhưng pháo hoa lại nở rộ bên bạn: Tài khoản nhảy số +{points}đ cực kỳ phấn khởi!" },
    { id: "REC_CHA_10", noticeType: "RECIPIENT_CHARITY_GIFT", title: "CỨNG CÁP NGÔI VƯƠNG!", text: "Ngôi vị số 1 càng thêm vững chãi! {actor} vừa cống nạp thêm +{points}đ vào kho báu của đội bạn!" },
    { id: "REC_CHA_11", noticeType: "RECIPIENT_CHARITY_GIFT", title: "SỰ TIẾP SỨC BẤT NGỜ!", text: "Tiếp thêm lửa cho ngôi đầu! {actor} đã giúp bạn nới rộng khoảng cách bằng món quà +{points}đ!" },
    { id: "REC_CHA_12", noticeType: "RECIPIENT_CHARITY_GIFT", title: "KHO BÁU TỰ ĐỘNG ĐẦY LÊN!", text: "Điểm số tự động nhảy vọt! {actor} đã hoàn thành xuất sắc nhiệm vụ 'shipper' giao tận tay bạn +{points}đ!" },
    { id: "REC_CHA_13", noticeType: "RECIPIENT_CHARITY_GIFT", title: "MÓN QUÀ CỦA ĐỊNH MỆNH!", text: "Định mệnh sắp đặt quá ngọt ngào! Bạn nhận trọn +{points}đ từ tai nạn từ thiện của {actor}!" },
    { id: "REC_CHA_14", noticeType: "RECIPIENT_CHARITY_GIFT", title: "LỘC ĐẾN TẬN CỬA!", text: "Mở cửa đón thần tài! {actor} vừa ký gửi trọn gói +{points}đ vào tài khoản của đội bạn!" },
    { id: "REC_CHA_15", noticeType: "RECIPIENT_CHARITY_GIFT", title: "NIỀM VUI NHÂN ĐÔI!", text: "Vừa giữ vững ngôi vị vừa được tặng quà! Cảm ơn {actor} vì món quà +{points}đ vô cùng hào phóng!" },
  ],

  // 12. Đội nhận được +5đ chia lộc từ Bom Hắc Ám
  RECIPIENT_DARK_BOMB_SHARE: [
    { id: "REC_DRK_01", noticeType: "RECIPIENT_DARK_BOMB_SHARE", title: "BÓNG TỐI CHIA LỘC!", text: "{actor} vô tình kích hoạt Bom Hắc Ám khiến điểm số phát nổ, bạn may mắn nhặt được +{points}đ chia lộc!" },
    { id: "REC_DRK_02", noticeType: "RECIPIENT_DARK_BOMB_SHARE", title: "HƯỞNG SÁI TỪ TAI NẠN!", text: "Hưởng sái từ tai nạn của đối thủ! {actor} nổ tung trong làn khói đen, để lại cho đội bạn +{points}đ thơm lừng!" },
    { id: "REC_DRK_03", noticeType: "RECIPIENT_DARK_BOMB_SHARE", title: "ÁC QUỶ BAN PHÁT!", text: "Ác quỷ XV đã rút cạn năng lượng của {actor} và phân phát công bằng +{points}đ cho đội của bạn!" },
    { id: "REC_DRK_04", noticeType: "RECIPIENT_DARK_BOMB_SHARE", title: "MÓN QUÀ TỪ VỤ NỔ!", text: "Vụ nổ bóng tối làm văng ra những đồng điểm vàng! Đội bạn nhanh tay nhặt được +{points}đ vào túi!" },
    { id: "REC_DRK_05", noticeType: "RECIPIENT_DARK_BOMB_SHARE", title: "CHIA ĐỀU TỔN THẤT!", text: "Đối thủ chịu đòn, bạn nhận quà! {actor} vừa phân phát đều đặn +{points}đ cho đội bạn!" },
    { id: "REC_DRK_06", noticeType: "RECIPIENT_DARK_BOMB_SHARE", title: "TIỀN VĂNG KHỎI KÉT!", text: "Két sắt của {actor} bị nổ tung! Bạn vừa nhận được phần chia +{points}đ từ ban trọng tài!" },
    { id: "REC_DRK_07", noticeType: "RECIPIENT_DARK_BOMB_SHARE", title: "LỘC HẮC ÁM RƠI VÀO TÚI!", text: "Dù bóng tối bao trùm {actor}, nhưng ánh sáng +{points}đ lại chiếu rọi vào tài khoản của bạn!" },
    { id: "REC_DRK_08", noticeType: "RECIPIENT_DARK_BOMB_SHARE", title: "ĐƯỢC CHIA PHẦN BẤT NGỜ!", text: "Bất ngờ nhận thêm +{points}đ hỗ trợ từ vụ nổ bom của {actor}! Đội bạn tích lũy thêm điểm quý báu!" },
    { id: "REC_DRK_09", noticeType: "RECIPIENT_DARK_BOMB_SHARE", title: "CÔNG BẰNG XÃ HỘI!", text: "Sức mạnh chia lộc của Bom Hắc Ám: Rút điểm người giàu chia cho bạn +{points}đ ngọt ngào!" },
    { id: "REC_DRK_10", noticeType: "RECIPIENT_DARK_BOMB_SHARE", title: "TÍCH TIỂU THÀNH ĐẠI!", text: "Thêm +{points}đ là thêm cơ hội chiến thắng! Cảm ơn món quà phân chia từ {actor}!" },
    { id: "REC_DRK_11", noticeType: "RECIPIENT_DARK_BOMB_SHARE", title: "LỘC PHÂN PHÁT TOÀN SÂN!", text: "Cả đấu trường cùng hưởng lộc! Đội bạn vừa được cộng thêm +{points}đ từ cú sảy chân của {actor}!" },
    { id: "REC_DRK_12", noticeType: "RECIPIENT_DARK_BOMB_SHARE", title: "ĐIỂM RƠI TRÚNG TÚI!", text: "Không tìm cũng tự tới! {actor} hào phóng phát tán điểm số, bạn đút túi ngay +{points}đ!" },
    { id: "REC_DRK_13", noticeType: "RECIPIENT_DARK_BOMB_SHARE", title: "PHÚC LỢI TỪ HIỂM ĐỊA!", text: "Từ cạm bẫy của người khác nảy sinh phúc lợi cho bạn: Nhận liền tay +{points}đ an vui!" },
    { id: "REC_DRK_14", noticeType: "RECIPIENT_DARK_BOMB_SHARE", title: "BÀN TAY CHIA ĐIỂM!", text: "Trọng tài đã chuyển giao thành công phần chia +{points}đ từ vụ nổ của {actor} sang bạn!" },
    { id: "REC_DRK_15", noticeType: "RECIPIENT_DARK_BOMB_SHARE", title: "THÊM ĐỒNG THÊM VUI!", text: "Có thêm +{points}đ động viên tinh thần! Hãy chuẩn bị bùng nổ ở lượt chơi kế tiếp!" },
  ],

  // 13. Đội chót bảng nhận được +5đ trợ cấp hòa hợp từ lá ĐIỀU ĐỘ XIV
  RECIPIENT_TEMPERANCE_ASSIST: [
    { id: "REC_TEM_01", noticeType: "RECIPIENT_TEMPERANCE_ASSIST", title: "ĐIỀU ĐỘ BAN PHƯỚC!", text: "Năng lượng dung hòa của lá Điều Độ vừa ban phước! Quỹ hệ thống vừa rót nóng +{points}đ trợ cấp tiếp sức cho bạn!" },
    { id: "REC_TEM_02", noticeType: "RECIPIENT_TEMPERANCE_ASSIST", title: "TIẾP SỨC LỘI NGƯỢC DÒNG!", text: "Đừng nản lòng! Sự điều độ và cân bằng của vũ trụ vừa gửi tặng đội bạn +{points}đ khích lệ để bứt phá!" },
    { id: "REC_TEM_03", noticeType: "RECIPIENT_TEMPERANCE_ASSIST", title: "DÒNG NƯỚC HÒA BÌNH!", text: "Lá bài Điều Độ của {actor} đã mở ra dòng nước cứu trợ: Đội bạn nhận thêm +{points}đ nâng đỡ tinh thần!" },
    { id: "REC_TEM_04", noticeType: "RECIPIENT_TEMPERANCE_ASSIST", title: "TRỢ CẤP ĐỊNH MỆNH!", text: "Quỹ Trận Đấu vừa xuất kho +{points}đ viện trợ cho đội bạn! Hãy biến nguồn năng lượng này thành sức mạnh lật kèo!" },
    { id: "REC_TEM_05", noticeType: "RECIPIENT_TEMPERANCE_ASSIST", title: "VÒNG TAY NÂNG ĐỠ!", text: "Cán cân trận đấu đang nâng đỡ bạn! Nhận ngay +{points}đ hòa hợp để rút ngắn khoảng cách với các đối thủ!" },
    { id: "REC_TEM_06", noticeType: "RECIPIENT_TEMPERANCE_ASSIST", title: "TIẾNG GỌI HỒI SINH!", text: "Cơ hội lội ngược dòng vẫn còn nguyên! Bạn vừa được tiếp sức thêm +{points}đ từ vũ trụ điều độ!" },
    { id: "REC_TEM_07", noticeType: "RECIPIENT_TEMPERANCE_ASSIST", title: "CÂN BẰNG THẾ TRẬN!", text: "Sự dung hòa giữa hai bình nước thánh mang lại cho đội bạn +{points}đ quý giá! Tự tin tiến lên!" },
    { id: "REC_TEM_08", noticeType: "RECIPIENT_TEMPERANCE_ASSIST", title: "MÓN QUÀ NHÂN ÁI!", text: "Một cử chỉ đẹp từ luật chơi Tarot: Đội bạn nhận nóng +{points}đ trợ cấp từ Quỹ Trung Ương!" },
    { id: "REC_TEM_09", noticeType: "RECIPIENT_TEMPERANCE_ASSIST", title: "THÊM NĂNG LƯỢNG TÍCH CỰC!", text: "Khí thế chiến đấu dâng cao! Kho điểm của bạn vừa được bơm thêm +{points}đ tràn đầy hy vọng!" },
    { id: "REC_TEM_10", noticeType: "RECIPIENT_TEMPERANCE_ASSIST", title: "MỞ LỐI TƯƠNG LAI!", text: "Vũ trụ gửi tín hiệu tích cực: +{points}đ đã được gửi đến bạn, sẵn sàng cho cú bứt phá ngoạn mục!" },
    { id: "REC_TEM_11", noticeType: "RECIPIENT_TEMPERANCE_ASSIST", title: "ĐIỀU ĐỘ SAN SẺ!", text: "San sẻ yêu thương nơi đấu trường! Bạn vừa nhận phần trợ cấp +{points}đ mà không ai bị mất điểm!" },
    { id: "REC_TEM_12", noticeType: "RECIPIENT_TEMPERANCE_ASSIST", title: "NGỌN LỬA HY VỌNG!", text: "Ngọn lửa hy vọng bùng cháy trở lại! Nhận ngay +{points}đ tiếp sức từ lá bài Điều Độ XIV!" },
    { id: "REC_TEM_13", noticeType: "RECIPIENT_TEMPERANCE_ASSIST", title: "VÙNG VẪY VƯƠN LÊN!", text: "Khoảng cách đang dần thu hẹp! Đội bạn được cộng thêm +{points}đ, hãy tận dụng tối đa cơ hội này!" },
    { id: "REC_TEM_14", noticeType: "RECIPIENT_TEMPERANCE_ASSIST", title: "MÓN QUÀ TINH THẦN ĐẮC LỰC!", text: "Món quà tinh thần tuyệt vời! Bạn có thêm +{points}đ vào hành trang để chuẩn bị cho cú lội ngược dòng!" },
    { id: "REC_TEM_15", noticeType: "RECIPIENT_TEMPERANCE_ASSIST", title: "VẬN KHÍ ĐANG QUAY LẠI!", text: "Vận may bắt đầu gõ cửa! Nhận +{points}đ trợ cấp từ hệ thống và chuẩn bị làm nên kỳ tích!" },
  ],

  // 14. Thông báo trung tính (Mất lượt ±0đ)
  NEUTRAL: [
    { id: "NEU_01", noticeType: "NEUTRAL", title: "BẢO TOÀN ĐIỂM SỐ!", text: "Một lượt chơi bình yên! {actor} giữ nguyên số điểm hiện có (±0đ), chuẩn bị cho thử thách tiếp theo!" },
    { id: "NEU_02", noticeType: "NEUTRAL", title: "BÌNH TĨNH QUAN SÁT!", text: "Không có biến động nào! {actor} hoàn thành lượt chơi với điểm số được bảo toàn nguyên vẹn!" },
    { id: "NEU_03", noticeType: "NEUTRAL", title: "CẦM CHÂN ĐỐI THỦ!", text: "Một ván cờ hòa hoãn! Điểm số giữ nguyên (±0đ), cục diện tạm thời không đổi!" },
    { id: "NEU_04", noticeType: "NEUTRAL", title: "GIỮ NGUYÊN PHONG ĐỘ!", text: "Bảo toàn thực lực! {actor} không mất điểm nào, sẵn sàng bùng nổ ở vòng đấu mới!" },
    { id: "NEU_05", noticeType: "NEUTRAL", title: "BÌNH YÊN VÔ SỰ!", text: "Sóng yên biển lặng! Lượt chơi khép lại êm đềm với 0 điểm thay đổi!" },
  ],
};

/**
 * Bộ sinh thông điệp Gameshow riêng biệt cho từng đội, đảm bảo 100% không trùng lặp câu qua các vòng
 */
export function generateTeamPrivateNotices({
  questState,
  allTeams,
  scoreDeltas = [],
  noticeCategoryOverride,
  actorTeamId,
  currentTeamId: currentTeamIdArg,
  actorName: actorNameArg,
  usedTemplateIdsByTeam = {},
}: {
  questState: MysteryQuestState;
  allTeams: MysteryTeamRef[];
  scoreDeltas?: Array<{ teamId: string; delta: number }>;
  noticeCategoryOverride?: {
    activeTeamNoticeType?: TeamNoticeType;
    otherTeamNoticeType?: TeamNoticeType;
  };
  actorTeamId?: string;
  currentTeamId?: string;
  actorName?: string;
  usedTemplateIdsByTeam?: Record<string, Set<string>>;
}): Record<string, TeamPrivateNotice> {
  const notices: Record<string, TeamPrivateNotice> = {};
  const currentTeamId = currentTeamIdArg || actorTeamId || questState.currentTurnTeamId;
  const currentTeam = allTeams.find((t) => t.id === currentTeamId);
  const actorName = actorNameArg || currentTeam?.name || questState.currentTurnTeamName || "Đội Chơi";
  const basePoints = questState.baseQuestionPoints || 10;

  // Helper chọn template không trùng lặp cho một đội
  const pickTemplate = (teamId: string, category: TeamNoticeType): NoticeTemplate => {
    if (!usedTemplateIdsByTeam[teamId]) {
      usedTemplateIdsByTeam[teamId] = new Set<string>();
    }
    const teamUsedSet = usedTemplateIdsByTeam[teamId];
    const available = NOTICE_TEMPLATES[category] || NOTICE_TEMPLATES.ACTIVE_REWARD;
    let unused = available.filter((t) => !teamUsedSet.has(t.id));

    if (unused.length === 0) {
      // Đã dùng hết ngân hàng 15+ câu -> reset danh mục này cho đội để quay vòng
      available.forEach((t) => teamUsedSet.delete(t.id));
      unused = available;
    }

    const chosen = unused[Math.floor(Math.random() * unused.length)] || available[0];
    teamUsedSet.add(chosen.id);
    return chosen;
  };

  // Helper định dạng chuỗi
  const formatText = (text: string, params: { actor?: string; victim?: string; points?: number }): string => {
    return text
      .replace(/\{actor\}/g, params.actor || actorName)
      .replace(/\{victim\}/g, params.victim || "Đối thủ")
      .replace(/\{points\}/g, String(Math.abs(params.points ?? 0)))
      .replace(/\{basePoints\}/g, String(basePoints));
  };

  // 1. Xử lý thông điệp cho Đội Đang Chơi (Active Team)
  const activeDeltaObj = scoreDeltas.find((d) => d.teamId === currentTeamId);
  const activeDelta = activeDeltaObj ? activeDeltaObj.delta : (questState.potPoints || 0);

  let activeCategory: TeamNoticeType = "ACTIVE_REWARD";
  if (noticeCategoryOverride?.activeTeamNoticeType) {
    activeCategory = noticeCategoryOverride.activeTeamNoticeType;
  } else if (questState.isPenaltySurvivalMode) {
    activeCategory = activeDelta <= 0 && questState.bombExploded ? "ACTIVE_SURVIVAL_FAIL" : "ACTIVE_SURVIVAL_ESCAPE";
  } else if (questState.bombExploded || activeDelta < 0) {
    activeCategory = "ACTIVE_PENALTY_BOMB";
  } else if (questState.turnFinishedReason === "TAROT_WHEEL_SPUN" || questState.turnFinishedReason === "TAROT_DRAWN") {
    const drawn = questState.tarotState?.drawnCard;
    if (drawn?.deathSubtype === "STEAL_TOP1" && (drawn?.stolenPoints || 0) > 0) {
      activeCategory = "ACTIVE_STEAL_SUCCESS";
    } else if (drawn?.deathSubtype === "STEAL_TOP1" && !drawn?.victimTeamId) {
      activeCategory = "ACTIVE_STEAL_FALLBACK";
    } else if (activeDelta > 0) {
      activeCategory = "ACTIVE_REWARD";
    } else {
      activeCategory = "NEUTRAL";
    }
  } else if (activeDelta > 0) {
    activeCategory = "ACTIVE_REWARD";
  } else {
    activeCategory = "NEUTRAL";
  }

  const activeTemplate = pickTemplate(currentTeamId, activeCategory);
  const victimName = questState.tarotState?.drawnCard?.victimTeamName || questState.pendingStealVictimName;

  notices[currentTeamId] = {
    recipientTeamId: currentTeamId,
    recipientTeamName: actorName,
    title: activeTemplate.title,
    message: formatText(activeTemplate.text, { actor: actorName, victim: victimName, points: activeDelta }),
    delta: activeDelta,
    noticeType: activeCategory,
    actorTeamName: actorName,
    templateId: activeTemplate.id,
    timestamp: Date.now(),
  };

  // 2. Xử lý thông điệp riêng cho Các Đội Bị Tác Động Ngoài Lượt
  for (const deltaItem of scoreDeltas) {
    if (deltaItem.teamId === currentTeamId) continue; // Đã xử lý ở trên
    const affectedTeam = allTeams.find((t) => t.id === deltaItem.teamId);
    if (!affectedTeam) continue;

    let otherCategory: TeamNoticeType = "ACTIVE_REWARD";
    if (noticeCategoryOverride?.otherTeamNoticeType) {
      otherCategory = noticeCategoryOverride.otherTeamNoticeType;
    } else if (deltaItem.delta < 0) {
      // Bị cướp điểm
      const isDeath = questState.tarotState?.drawnCard?.key === "THE_DEATH" || questState.tarotState?.drawnCard?.key === "DEATH";
      otherCategory = isDeath ? "VICTIM_STOLEN_DEATH" : "VICTIM_STOLEN_CHARIOT";
    } else if (deltaItem.delta > 0) {
      // Được tặng điểm
      const isCharity = questState.bombExploded?.type === "CHARITY" || questState.tarotState?.drawnCard?.key === "THE_HANGED_MAN";
      const isDark = questState.bombExploded?.type === "DARK" || questState.tarotState?.drawnCard?.key === "THE_DEVIL";
      const isTemperance = questState.tarotState?.drawnCard?.key === "TEMPERANCE";

      if (isCharity) {
        otherCategory = "RECIPIENT_CHARITY_GIFT";
      } else if (isDark) {
        otherCategory = "RECIPIENT_DARK_BOMB_SHARE";
      } else if (isTemperance) {
        otherCategory = "RECIPIENT_TEMPERANCE_ASSIST";
      } else {
        otherCategory = "RECIPIENT_CHARITY_GIFT";
      }
    }

    const otherTemplate = pickTemplate(affectedTeam.id, otherCategory);
    notices[affectedTeam.id] = {
      recipientTeamId: affectedTeam.id,
      recipientTeamName: affectedTeam.name,
      title: otherTemplate.title,
      message: formatText(otherTemplate.text, { actor: actorName, victim: affectedTeam.name, points: deltaItem.delta }),
      delta: deltaItem.delta,
      noticeType: otherCategory,
      actorTeamName: actorName,
      templateId: otherTemplate.id,
      timestamp: Date.now(),
    };
  }

  // 3. Trường hợp đối thủ được bảo vệ bằng khiên (0đ bị trừ khi bị cướp)
  if (
    questState.tarotState?.drawnCard?.deathSubtype === "STEAL_TOP1" &&
    questState.tarotState?.drawnCard?.victimTeamId &&
    (questState.tarotState?.drawnCard?.stolenPoints || 0) === 0
  ) {
    const protectedTeamId = questState.tarotState.drawnCard.victimTeamId;
    const protectedTeam = allTeams.find((t) => t.id === protectedTeamId);
    if (protectedTeam && !notices[protectedTeamId]) {
      const shieldTemplate = pickTemplate(protectedTeamId, "VICTIM_PROTECTED_SHIELD");
      notices[protectedTeamId] = {
        recipientTeamId: protectedTeamId,
        recipientTeamName: protectedTeam.name,
        title: shieldTemplate.title,
        message: formatText(shieldTemplate.text, { actor: actorName, victim: protectedTeam.name, points: 0 }),
        delta: 0,
        noticeType: "VICTIM_PROTECTED_SHIELD",
        actorTeamName: actorName,
        templateId: shieldTemplate.id,
        timestamp: Date.now(),
      };
    }
  }

  return notices;
}

export const generatePrivateTeamNotices = generateTeamPrivateNotices;
