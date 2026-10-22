import type { Server as NetServer, Socket } from "net";
import type { NextApiResponse } from "next";
import type { Server as SocketIOServer } from "socket.io";

// ─── Enums ────────────────────────────────────────────────────────────────────

export type QuestionType =
  | "MC_SINGLE"
  | "MC_MULTI"
  | "TRUE_FALSE"
  | "FILL_BLANK"
  | "ESSAY"
  | "MATCHING"
  | "DRAG_DROP"
  | "CLOZE_DROPDOWN"
  | "WORD_PUZZLE";

export interface MatchingPair {
  id: string;
  left: string;
  right: string;
}

export interface ClozeBlankOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface ClozeBlank {
  blankId: number;
  options: ClozeBlankOption[];
}

export type CardType =
  | "FIFTY_FIFTY"
  | "DOUBLE"
  | "FREEZE"
  | "ATTACK"
  | "SKIP"
  | "TIME_PLUS"
  | "SHIELD"
  | "STEAL"
  | "PENALTY"
  | "SCORE_X2";

export type GameMode =
  | "CLASSIC"
  | "BUZZ"
  | "BOUNCEBACK"
  | "ELIMINATION"
  | "TOURNAMENT"
  | "MAGIC_WHEEL"
  | "GRID_CARO"
  | "DICE_RACE"
  | "WAGER"
  | "MYSTERY_QUEST";
export type TeamMode = "INDIVIDUAL" | "TEAM";
export type RoomStatus = "LOBBY" | "PLAYING" | "PAUSED" | "FINISHED";

// ─── Mode Rules Metadata ──────────────────────────────────────────────────────

export interface ModeRuleDetail {
  mode: GameMode;
  nameVi: string;
  emoji: string;
  taglineVi: string;
  summaryVi: string;
  mechanicsVi: string[];
  scoringVi: string[];
  tipsVi: string[];
}

export const MODE_RULES: Record<GameMode, ModeRuleDetail> = {
  CLASSIC: {
    mode: "CLASSIC",
    nameVi: "Truyền thống (Classic)",
    emoji: "⚡",
    taglineVi: "Thang điểm chuẩn Kahoot 1.000 - 2.000đ & Thưởng tốc độ mili-giây",
    summaryVi: "Chế độ thi đấu trắc nghiệm kinh điển với thang điểm chuẩn Kahoot/Wayground: Dễ (1.000đ), Trung bình (1.500đ), Khó (2.000đ). Phân hóa điểm số cực chuẩn theo mili-giây phản xạ (tối đa +50%) + Chuỗi đúng liên tiếp (Streak combo lên tới +50%) + Thưởng độ hiếm phòng (tối đa +45%). Không bao giờ bị hòa điểm!",
    mechanicsVi: [
      "Thang điểm chuẩn Kahoot/Wayground: Câu hỏi phân bổ theo 3 bậc nhận thức: Dễ (1.000 điểm), Trung bình (1.500 điểm), Khó (2.000 điểm).",
      "Thưởng tốc độ phản xạ chuẩn xác theo mili-giây: Càng trả lời nhanh càng nhận thêm điểm thưởng tốc độ (tối đa +50% điểm cơ sở).",
      "Chuỗi đúng liên tiếp (Streak Combo): Đúng 2 câu (+10%), 3 câu (+20%), 4 câu (+30%), 5+ câu (+50%). Trả lời sai đưa chuỗi về 0.",
      "Độ hiếm đáp án (Empirical Rarity): Khi tỷ lệ cả phòng trả lời đúng < 30%, câu hỏi được đánh giá hóc búa và thưởng thêm tối đa +45%.",
      "Câu hỏi Vàng (Gold Rush): Nhân đôi toàn bộ điểm số câu hỏi (x2).",
    ],
    scoringVi: [
      "Điểm cơ sở: Dễ 1.000đ | Trung bình 1.500đ | Khó 2.000đ.",
      "Thưởng tốc độ: Lên tới +50% điểm cơ sở tùy thời gian phản xạ tính theo mili-giây.",
      "Thưởng Streak Combo: +10% đến +50% điểm cơ sở (lên tới +500đ - +1.000đ/câu).",
      "Thưởng độ hiếm: Lên tới +45% khi dưới 30% phòng giải đúng.",
      "Bóc tách điểm chi tiết: Màn hình vinh danh thể hiện rõ Điểm gốc + Thưởng tốc độ + Thưởng chuỗi.",
    ],
    tipsVi: [
      "Nhanh tay bấm đáp án trong những giây đầu tiên để giật trọn +500đ thưởng tốc độ!",
      "Duy trì chuỗi đúng liên tiếp để nhân thêm điểm thưởng chuỗi rực cháy 🔥.",
    ],
  },
  BUZZ: {
    mode: "BUZZ",
    nameVi: "Chuông bấm (Buzz)",
    emoji: "🔔",
    taglineVi: "Tranh quyền trả lời duy nhất - 3 mức điểm 10/20/30",
    summaryVi: "Chế độ chuông bấm cực kỳ kịch tính với 3 mức điểm cố định (10, 20, 30 điểm phân bổ đều ~33%). Đội bấm chuông sớm nhất giành quyền trả lời duy nhất. Quản trò có thể cài đặt mở chuông thủ công hoặc tự động có đếm ngược trễ (tối thiểu 3s).",
    mechanicsVi: [
      "3 mức điểm cố định: 10 điểm (Dễ), 20 điểm (Trung bình), 30 điểm (Khó) phân bổ đều ~33% mỗi mức.",
      "Mở khoá chuông: Admin có thể chọn mở thủ công sau khi đọc xong câu hỏi, hoặc mở tự động có trễ (tối thiểu 3 giây).",
      "Đội bấm chuông nhanh nhất giành quyền trả lời độc quyền.",
      "Các đội bấm chậm hơn sẽ chuyển sang chế độ quan sát.",
    ],
    scoringVi: [
      "Trả lời ĐÚNG: Nhận trọn vẹn điểm câu hỏi (+10, +20, hoặc +30 điểm).",
      "Trả lời SAI: Bị trừ 50% điểm câu hỏi (-5, -10, hoặc -15 điểm).",
    ],
    tipsVi: [
      "Cẩn trọng trước khi bấm chuông vì trả lời sai sẽ bị trừ 50% điểm câu hỏi!",
      "Tận dụng thời gian đếm ngược trễ để suy nghĩ đáp án trước khi chuông mở.",
    ],
  },
  BOUNCEBACK: {
    mode: "BOUNCEBACK",
    nameVi: "Về đích Olympia (Bounceback)",
    emoji: "🎯",
    taglineVi: "Chọn mức điểm 10/20/30 & Chuông cướp lượt 5s",
    summaryVi: "Mô phỏng chân thực phần thi Về đích Đường lên đỉnh Olympia. Đội đến lượt được tự chọn mức điểm câu hỏi (10, 20, hoặc 30 điểm). Nếu đội chính trả lời sai, chuông cướp lượt mở ra trong 5 giây cho các đội còn lại phục kích.",
    mechanicsVi: [
      "Chọn mức điểm: Trước mỗi câu trong lượt, đội chính chọn mức điểm mong muốn: 10, 20, hoặc 30 điểm.",
      "Vòng 1 (Lượt chính): Đội chính trả lời trong thời gian quy định.",
      "Nếu đội chính đúng: Nhận trọn điểm và câu hỏi kết thúc.",
      "Vòng 2 (Cướp lượt 5s): Nếu đội chính trả lời sai, chuông cướp lượt mở ra 5s cho các đội khác bấm giành quyền.",
      "Đội cướp chuông có 15s để đưa ra đáp án lật ngược tình thế.",
    ],
    scoringVi: [
      "Đội chính trả lời đúng: +10, +20, hoặc +30 điểm tương ứng mức đã chọn.",
      "Đội cướp trả lời đúng: Đội cướp nhận trọn điểm (+10/+20/+30), đội chính bị trừ trọn điểm (-10/-20/-30).",
      "Đội cướp trả lời sai: Đội cướp bị trừ 50% điểm (-5/-10/-15), đội chính không bị trừ thêm.",
    ],
    tipsVi: [
      "Cân nhắc chọn mức điểm phù hợp với năng lực của đội để tránh bị đối thủ cướp điểm!",
      "Luôn sẵn sàng bấm chuông cướp lượt ngay khi đội chính trả lời sai.",
    ],
  },
  ELIMINATION: {
    mode: "ELIMINATION",
    nameVi: "Đấu trường Sinh tồn (Elimination)",
    emoji: "💀",
    taglineVi: "Tính điểm đa tiêu chí, Đội Bóng Ma & Vòng Hồi Sinh",
    summaryVi: "Đấu trường sinh tồn khốc liệt. Điểm số tính theo đa tiêu chí (Đúng/Sai + Tốc độ + Chuỗi đúng). Sau mỗi 3 câu hỏi (chặng), đội xếp chót bị loại chuyển thành Đội Bóng Ma (Ghost Team), tiếp tục trả lời để tích lũy thành tích Hồi Sinh. Đội xuất sắc nhất sẽ được Hồi Sinh vào vòng chung kết!",
    mechanicsVi: [
      "Tính điểm đa tiêu chí từng câu: Điểm gốc + Thưởng tốc độ + Thưởng chuỗi đúng (Streak combo).",
      "Chu kỳ loại: Sau mỗi 3 câu hỏi, hệ thống tổng kết và loại 1 đội có thành tích thấp nhất.",
      "Tiêu chí phụ phân định hoà (Tie-breakers): Điểm tổng thấp nhất -> Tỷ lệ trả lời đúng (Accuracy) thấp nhất -> Thời gian phản xạ trung bình chậm nhất.",
      "Đội Bóng Ma (Ghost Team): Đội bị loại tiếp tục trả lời các câu hỏi để tích lũy thành tích hồi sinh (Ghost Stats).",
      "Vòng Hồi Sinh (Ghost Revival): Tại chặng áp chót, Đội Bóng Ma có thành tích cao nhất (Ưu tiên 1: Đạt chuẩn 100% đúng ở 1 chặng; Ưu tiên 2: Tỷ lệ đúng/chuỗi đúng cao nhất) sẽ được HỒI SINH trở lại trận đấu!",
      "Đội sống sót duy nhất sau chặng chung kết sẽ giành chiến thắng chung cuộc!",
    ],
    scoringVi: [
      "Đội sống sót: Nhận trọn vẹn điểm số theo công thức đa tiêu chí (Điểm gốc + Tốc độ + Chuỗi đúng).",
      "Đội bóng ma: Tích lũy số câu đúng và chuỗi đúng để cạnh tranh vé Hồi Sinh (không cộng điểm trực tiếp lên bảng điểm chính).",
      "Đội được Hồi Sinh: Được phục hồi trạng thái thi đấu với mức điểm bằng đội sống sót thấp nhất.",
    ],
    tipsVi: [
      "Dù bị loại sớm, hãy tập trung trả lời đúng 100% ở chặng tiếp theo để nắm chắc tấm vé Hồi Sinh quay trở lại cuộc đua vô địch!",
    ],
  },
  TOURNAMENT: {
    mode: "TOURNAMENT",
    nameVi: "Đấu loại trực tiếp 1v1 (Tournament Speed Duel)",
    emoji: "🏆",
    taglineVi: "Đối kháng tốc độ 1v1, Sudden Death & Đường đua Tiên Tri Khán Giả",
    summaryVi: "Giải đấu cây nhánh đối kháng 1v1 đỉnh cao. Cả 2 đội cùng trả lời đồng thời và nhận điểm theo % thời gian còn lại (đúng càng nhanh điểm càng cao). Khán giả và các đội chưa đến lượt tham gia dự đoán và trả lời thử để tranh cúp Đại Tiên Tri.",
    mechanicsVi: [
      "Đối đầu đồng thời có xét tốc độ: Cả 2 đội cùng quan sát và trả lời câu hỏi trong thời gian đếm ngược.",
      "Tính điểm theo % thời gian còn lại: Đội trả lời đúng nhận từ 50% đến 100% điểm gốc tùy theo tốc độ (trả lời càng nhanh điểm càng cao). Trả lời sai nhận 0 điểm.",
      "Đấu trọn vẹn số câu quy định: Mỗi trận gồm N câu hỏi (mặc định 3 câu). Đội có tổng điểm trận cao hơn sẽ giành vé đi tiếp.",
      "Sudden Death (Bàn thắng vàng): Nếu hòa điểm sau N câu, tự động kích hoạt câu hỏi phụ 1v1 phân định thắng thua ngay.",
      "Vòng Sơ Loại Xếp Hạng (Seeding): Nếu số đội lẻ (3, 5, 6, 7 đội), các đội cùng thi đấu 2 câu khởi động để chọn và xếp hạt giống vào cây nhánh chuẩn.",
      "Đường đua kép Khán Giả: Đội ngồi ngoài được dự đoán đội thắng (+15đ), cổ vũ, và trả lời thử trên điện thoại (+10đ) để đua top 'Đại Tiên Tri'.",
      "Thẻ bổ trợ công bằng (Fair-play): Chỉ cho phép thẻ hỗ trợ bản thân (50/50, TIME_PLUS, SKIP, SCORE_X2); cấm hoàn toàn các thẻ quấy phá đối thủ.",
    ],
    scoringVi: [
      "Điểm trận 1v1: Tính theo % thời gian còn lại [Điểm gốc × (0.5 + 0.5 × t_còn / t_tổng)].",
      "Điểm Tiên Tri (Khán giả): +15đ khi dự đoán đúng đội thắng trận, +10đ khi trả lời thử câu hỏi chính xác.",
      "Đội chiến thắng trận Chung kết đăng quang Ngôi Vô Địch 👑; Khán giả điểm cao nhất nhận Cúp Đại Tiên Tri 🔮.",
    ],
    tipsVi: [
      "Ưu tiên độ chính xác kết hợp tốc độ bấm bài nhanh để tối đa hóa điểm % thời gian trong cặp đấu 1v1!",
    ],
  },
  MAGIC_WHEEL: {
    mode: "MAGIC_WHEEL",
    nameVi: "Magic Wheel (Chiếc Nón Kỳ Diệu)",
    emoji: "🎡",
    taglineVi: "Quay nón 24 ô, Ô chữ bí mật & Tranh giải thưởng lớn",
    summaryVi: "Mô phỏng chân thực gameshow Chiếc nón kỳ diệu truyền hình. Đội đến lượt bấm chốt lực quay chiếc nón 24 ô định mệnh (100 - 2000đ, Mất lượt, Mất điểm, Nhân đôi, Chia đôi, May mắn, Ô Phần thưởng & Bí mật). Đoán đúng chữ cái hoặc câu hỏi để tích lũy điểm và giữ quyền quay tiếp; đội xuất sắc giải mã toàn bộ ô chữ sẽ ẵm trọn giải thưởng vòng thi!",
    mechanicsVi: [
      "Quay nón 24 ô: Đội đến lượt điều chỉnh thanh lực (0-100%) và chốt quay nón nhận điểm hoặc hiệu ứng.",
      "2 Thể thức tùy chọn: Thể thức 'Ô chữ bí mật' (đoán chữ cái trong cụm từ ẩn) hoặc Thể thức 'Quiz Vòng Quay' (trả lời câu hỏi ngân hàng đề).",
      "Quy tắc giữ lượt: Đoán đúng chữ cái hoặc trả lời đúng câu hỏi sẽ tiếp tục giữ lượt quay tiếp; đoán sai hoặc quay vào Mất lượt/Mất điểm sẽ chuyển lượt cho đội kế tiếp.",
      "Ô chữ đa hàng lật số: Hiển thị bảng ô chữ 4 hàng tiêu chuẩn trường quay với hiệu ứng lật mở 3D chân thực.",
      "Ô đặc biệt & Ô đè: Ô Phần thưởng (Vòng 1), Ô Bí mật (Vòng 2 - 50% trúng thưởng nóng 3000đ, 50% Mất điểm), May mắn (tự chọn lật 1 ô chữ bất kỳ).",
      "Bàn phím theo dõi chữ cái: Trực quan hóa toàn bộ 29 chữ cái tiếng Việt đã gọi hoặc còn lại.",
    ],
    scoringVi: [
      "Đoán đúng chữ cái: [Điểm ô nón quay được × Số lượng chữ cái xuất hiện trong từ khóa].",
      "Quay vào Nhân đôi (x2): Nhân 2 lần điểm số tích lũy của vòng nếu đoán đúng chữ cái kế tiếp.",
      "Quay vào Chia đôi (/2): Giảm 50% số điểm tích lũy của vòng.",
      "Quay vào Mất điểm (Bankrupt): Điểm tích lũy vòng hiện tại về 0 và chuyển lượt.",
      "Giải đúng toàn bộ ô chữ: Giữ toàn bộ điểm số của vòng và nhận cúp chiến thắng vòng thi.",
    ],
    tipsVi: [
      "Quan sát kỹ độ dài các từ và các chữ cái phổ biến (như N, H, T, C) trước khi quyết định gọi chữ!",
      "Khi đã chắc chắn về cụm từ bí mật, hãy chủ động 'Giải ô chữ' ngay trong lượt để bảo toàn số điểm, tránh rủi ro quay vào ô Mất điểm!",
    ],
  },
  GRID_CARO: {
    mode: "GRID_CARO",
    nameVi: "Chọn ô & Caro (Grid Caro)",
    emoji: "🏁",
    taglineVi: "3 mức điểm 10/20/30 gắn cứng, đảm bảo luôn có câu hỏi",
    summaryVi: "Bàn cờ ma trận R × C ô số (#1 - #X) gắn cứng 3 mức điểm 10, 20, 30 điểm (Dễ, Trung bình, Khó). Hệ thống chuẩn hoá ngân hàng câu hỏi tự động, đảm bảo luôn có câu hỏi không trùng cho bất kỳ ô nào.",
    mechanicsVi: [
      "3 mức điểm cố định: Các ô trên bàn cờ gắn cứng 10đ (Dễ), 20đ (Trung bình), 30đ (Khó).",
      "Chuẩn hoá câu hỏi tự động: Ngân hàng câu hỏi được chuẩn hoá theo 3 mức điểm, luôn đảm bảo có câu hỏi mới phù hợp cho mọi ô được chọn mà không bị trùng lặp.",
      "Chọn ô thủ công: Quản trò chọn ô từ bảng điều khiển theo yêu cầu của đội tới lượt.",
      "Ô chưa ăn vẫn mở: Nếu đội trả lời SAI, ô đó vẫn mở cho lượt sau.",
      "Tính năng Caro: Đội đầu tiên tạo được K ô liên tiếp (ngang, dọc, chéo) nhận thưởng Caro Bonus.",
    ],
    scoringVi: [
      "Điểm ô: Trả lời đúng nhận trọn điểm số gắn với ô (10đ, 20đ, 30đ).",
      "Trả lời sai: Không bị trừ điểm, ô giữ nguyên trạng thái mở cho lượt sau.",
      "Thưởng Caro Bonus: Thưởng thêm điểm chuỗi khi xếp được hàng Caro.",
    ],
    tipsVi: [
      "Tập trung chọn các ô chiến lược để vừa ghi điểm vừa chặn đường Caro của đối thủ!",
    ],
  },
  DICE_RACE: {
    mode: "DICE_RACE",
    nameVi: "Đua cờ Xí ngầu (Dice Race)",
    emoji: "🎲",
    taglineVi: "Đua marathon 60 - 100 ô, Gieo 2 xí ngầu (2-12 bước) & Ô chức năng cân bằng",
    summaryVi: "Chế độ đua cờ marathon quy mô lớn từ 60 đến 100 ô. Mỗi lượt trả lời đúng được gieo 2 viên xí ngầu (tổng 2 – 12 bước với phân phối Gauss ổn định). Mật độ ô chức năng được kiểm soát chặt chẽ ở mức 15-20%, đảm bảo cuộc đua marathon kịch tính, công bằng và giàu tính kỹ năng.",
    mechanicsVi: [
      "Quy mô marathon 60 - 100 ô: Đường đua dài hơi giúp giảm thiểu may rủi ngắn hạn, tạo điều kiện cho các đội phát huy kiến thức qua nhiều vòng câu hỏi.",
      "Gieo 2 viên xí ngầu (2 – 12 bước): Đi tổng số nút của 2 viên xúc xắc, xác suất tập trung cao nhất ở mức trung bình ~7 bước (phân phối Gauss chuẩn), hạn chế may rủi cực đoan.",
      "Ô chức năng cân bằng (15 - 20%): Các ô chức năng cách nhau tối thiểu 3-4 ô; Vùng an toàn 5 ô đầu và 5 ô cuối tuyệt đối an toàn.",
      "🔀 Ô Vượt mặt (Leapfrog): Chỉ hoán đổi vị trí với đội đứng liền kề phía trước, không gây đảo lộn thế trận vô lý.",
      "🛡️ Khiên bảo vệ (Shield): Vô hiệu hoá bẫy lùi bước hoặc chặn bị đối thủ hoán đổi vị trí.",
      "🎲x2 Cơ hội (Extra Roll): Dừng ở ô x2 Cơ hội được quyền gieo xí ngầu thêm lần thứ 2 trước khi chuyển lượt.",
      "Cán đích: Đội đầu tiên tiến tới hoặc vượt qua ô cuối cùng sẽ chiến thắng trận đấu ngay lập tức 🏆!",
    ],
    scoringVi: [
      "Xếp hạng dựa trên thứ tự ô trên đường đua (#X / Tổng số ô).",
      "Đội cán đích đầu tiên giành chiến thắng tuyệt đối 🏆.",
    ],
    tipsVi: [
      "Kiên trì trả lời đúng các câu hỏi để liên tục được tung 2 viên xúc xắc bứt phá!",
      "Nhặt Khiên bảo vệ để an tâm vượt qua các ô Bẫy hiểm trở!",
    ],
  },
  WAGER: {
    mode: "WAGER",
    nameVi: "Cược điểm Bí mật (Secret Wager)",
    emoji: "💰",
    taglineVi: "Tặng 50đ khởi đầu, Cược bí mật, Trợ cấp hồi sinh & Thắng Knockout",
    summaryVi: "Đấu trí chiến thuật trước mỗi câu hỏi. Mỗi đội được tặng trước 50 điểm khởi đầu. Biết trước chủ đề & độ khó Bloom, các đội bí mật đặt cược số điểm của mình với cơ chế trợ cấp kịch tính.",
    mechanicsVi: [
      "Điểm khởi đầu: Mỗi đội được tặng trước 50 điểm ngay khi bắt đầu vòng thi.",
      "Cược mở màn & 15s nâng cược: Hệ thống đếm 5s mở màn; nếu không ai cược, hệ thống tự gán ngẫu nhiên 1 đội cược 10đ mặc định. Sau đó các đội có 15s để nâng cược.",
      "Chủ động mở câu hỏi: Sau khi chốt phiên cược, câu hỏi chỉ hiện lên khi Quản trò chủ động bấm mở, tránh vội vã.",
      "Cứu trợ Hồi sinh (Bailout): Khi điểm số tụt xuống ≤ 0 trong cuộc chơi, đội được phép kích hoạt trợ cấp để hồi sinh bằng điểm của đội thấp nhất (đang có điểm > 0). Giới hạn tối đa 1 lần dùng/đội.",
      "Điều kiện công bằng & Thắng Knockout: Quyền trợ cấp CHỈ sử dụng được khi còn ít nhất 2 đội có điểm > 0. Nếu chỉ còn duy nhất 1 đội có điểm > 0, đội đó lập tức CHIẾN THẮNG ngay (Knockout Win)!",
    ],
    scoringVi: [
      "Đội cược: Đúng = Nhận trọn vẹn số điểm cược (+W); Sai = Trừ điểm động theo số đội khác giải được: Cả 4 đội cùng sai phạt 0đ; Có đội khác đúng phạt theo đơn vị U = Round(W/2) (Câu 10đ: phạt 1×U; Câu 20đ: phạt tối đa 2×U; Câu 30đ: phạt tối đa 3×U).",
      "Các đội còn lại: Đúng = Nhận cố định 1/2 điểm gốc câu hỏi (+5đ / +10đ / +15đ); Sai = Không bị trừ điểm (0đ).",
      "Trợ cấp (Bailout): Hồi sinh về mức điểm bằng đội thấp nhất còn dương điểm (> 0).",
    ],
    tipsVi: [
      "Đội cược cần tự tin và cân nhắc kỹ mức cược để tối ưu điểm số và tránh bị phạt nếu các đối thủ cùng giải đúng!",
      "Các đội không cược hãy luôn tập trung trả lời đúng để vừa tích lũy điểm thưởng vừa trừng phạt sai lầm của đội cược.",
      "Tận dụng cơ hội Knockout bằng cách cược thông minh để loại dần các đối thủ về ≤ 0 điểm.",
    ],
  },
  MYSTERY_QUEST: {
    mode: "MYSTERY_QUEST",
    nameVi: "Hành Trình Bí Ẩn (Mystery Quest)",
    emoji: "🗝️",
    taglineVi: "Gameshow luân phiên, Background biến hóa & Các Ô số phận bất ngờ (Không dùng Thẻ Bổ Trợ)",
    summaryVi: "Gameshow phiêu lưu truyền hình với cơ chế thi đấu lần lượt từng đội. Mỗi lượt là một bối cảnh sân khấu mới với các mini-game đa dạng (Cánh cửa thần bí, Rương kho báu, Thẻ bài cổ xưa, Cửa sổ radar). Đội chọn ô, vượt qua câu hỏi thử thách để lật mở nội dung phía sau với tác động điểm số cực lớn (+50đ, +100đ, Nhân đôi x2, Chia đôi, Trộm điểm, Thêm lượt) qua các Ô số phận! Do tính chất đặc thù tập trung vào diễn biến sân khấu và may rủi bất ngờ của Ô số phận, Hành Trình Bí Ẩn là mode duy nhất không hỗ trợ Thẻ Bổ Trợ (Power-up).",
    mechanicsVi: [
      "Thi đấu luân phiên theo lượt (Turn-based): Các đội lần lượt bước lên sân khấu chính theo thứ tự công bằng.",
      "Background & Trò chơi biến hóa liên tục: Mỗi lượt đổi mới bối cảnh (Lâu đài, Đảo hải tặc, Rừng ma thuật, Cyber) và kiểu bàn cờ (Cánh cửa, Hòm báu, Thẻ bài, Radar).",
      "Chọn ô & Giải câu hỏi: Đội chọn 1 ô thử thách, vượt qua câu hỏi để lật mở bí mật phía sau.",
      "Hiệu ứng Ô số phận: Các ô phía sau có tác động cực lớn (+50đ, +100đ, Nhân đôi x2, Chia đôi /2, Trộm điểm, Thêm lượt hoặc né Bom).",
      "Đặc thù duy nhất - Không hỗ trợ Power-up: Chế độ duy nhất trong game không dùng Thẻ Bổ Trợ (Power-up), giữ trọn vẹn sự tinh gọn và kịch tính chân thật của gameshow.",
      "Thử thách Sinh Tử khi trả lời sai: Nếu đội chính trả lời sai, đội sẽ bị trừ tim hoặc phải đối mặt với Minigame Sinh Tử (Penalty Wheel / Hiến tế tim) để bảo toàn điểm số!",
    ],
    scoringVi: [
      "Điểm câu hỏi gốc: Dễ 10đ | Trung bình 20đ | Khó 30đ.",
      "Tác động Ô số phận: Điểm thưởng khủng (+50đ, +100đ), Nhân đôi (x2), Chia đôi (/2), Trộm điểm (+20đ từ đội dẫn đầu), Mất điểm, Thêm lượt.",
      "Trả lời đúng: Nhận trọn điểm câu hỏi + toàn bộ phần thưởng ô bí mật.",
      "Trả lời sai: Bị trừ tim thử thách và đối mặt với Vòng quay Sinh tử phạt điểm.",
    ],
    tipsVi: [
      "Cố gắng trả lời đúng câu hỏi thử thách của ô mình đã chọn để nắm bắt cơ hội lật mở kho báu khổng lồ!",
      "Quản lý số tim cẩn thận, cân nhắc giữ điểm an toàn hoặc mạo hiểm để không bị trừ sạch điểm số!",
    ],
  },
};

// ─── Card Metadata ────────────────────────────────────────────────────────────

export interface CardDetail {
  emoji: string;
  name: string;
  nameVi: string;
  summaryVi: string;
  descriptionVi: string;
  description: string;
  detailVi: string;
  correctEffectVi?: string;
  wrongEffectVi?: string;
  requiresTarget: boolean;
  tag: string;
  color: string;
  scope: "PRIVATE" | "GLOBAL";
}

export const CARD_METADATA: Record<CardType, CardDetail> = {
  FIFTY_FIFTY: {
    emoji: "🔀",
    name: "50/50",
    nameVi: "50/50",
    summaryVi: "Bỏ 2 đáp án sai",
    descriptionVi: "Loại bỏ 2 phương án sai",
    description: "Remove 2 wrong answers",
    detailVi: "Hệ thống tự động gạch bỏ ngẫu nhiên 2 phương án sai, giúp tăng xác suất chọn đúng lên 50%.",
    requiresTarget: false,
    tag: "Hỗ trợ",
    color: "#3b82f6",
    scope: "PRIVATE",
  },
  DOUBLE: {
    emoji: "✖️2",
    name: "Double",
    nameVi: "Nhân đôi",
    summaryVi: "Đúng x2 / Sai bị phạt",
    descriptionVi: "Đúng x2 điểm, Sai bị trừ điểm phạt",
    description: "Double points next, penalty on wrong",
    detailVi: "Thẻ cược mạo hiểm: Trả lời ĐÚNG được nhân đôi số điểm (+200%). Nhưng nếu trả lời SAI vẫn bị trừ điểm phạt bình thường!",
    correctEffectVi: "+200% số điểm câu hỏi (x2)",
    wrongEffectVi: "-50% số điểm câu hỏi (Bị phạt)",
    requiresTarget: false,
    tag: "Mạo hiểm",
    color: "#f59e0b",
    scope: "PRIVATE",
  },
  SCORE_X2: {
    emoji: "⭐",
    name: "Score x1.5",
    nameVi: "x1.5 điểm",
    summaryVi: "Đúng x1.5 / Miễn phạt",
    descriptionVi: "Đúng x1.5 điểm, Sai không bị trừ (bảo toàn điểm)",
    description: "Correct=x1.5, Wrong=0 penalty",
    detailVi: "Thẻ an toàn tích lũy: Trả lời ĐÚNG được nhân 1.5 lần số điểm (+150%). Nếu trả lời SAI sẽ được miễn toàn bộ điểm phạt (0 điểm, bảo toàn điểm số).",
    correctEffectVi: "+150% số điểm câu hỏi (x1.5)",
    wrongEffectVi: "0 điểm (Không bị phạt trừ điểm)",
    requiresTarget: false,
    tag: "An toàn",
    color: "#10b981",
    scope: "PRIVATE",
  },
  FREEZE: {
    emoji: "❄️",
    name: "Freeze",
    nameVi: "Phong tỏa",
    summaryVi: "Đóng băng 1 đội đối thủ",
    descriptionVi: "Bỏ qua lượt của đội khác",
    description: "Skip another team's turn",
    detailVi: "Chỉ định 1 đội đối thủ bị đóng băng trong câu này, tước quyền nộp đáp án hoặc quyền bấm chuông của họ.",
    requiresTarget: true,
    tag: "Khống chế",
    color: "#60a5fa",
    scope: "PRIVATE",
  },
  ATTACK: {
    emoji: "⚔️",
    name: "Attack",
    nameVi: "Tấn công",
    summaryVi: "Ép đối thủ trả lời",
    descriptionVi: "Chỉ định đội khác trả lời, sai bị trừ",
    description: "Force team to answer",
    detailVi: "Chỉ định 1 đội đối thủ buộc phải trả lời câu hỏi này. Nếu họ trả lời SAI, họ sẽ bị trừ điểm phạt ngay lập tức!",
    requiresTarget: true,
    tag: "Tấn công",
    color: "#ef4444",
    scope: "PRIVATE",
  },
  SKIP: {
    emoji: "🔄",
    name: "Skip",
    nameVi: "Đổi câu",
    summaryVi: "Đổi câu hỏi sang câu khác",
    descriptionVi: "Đổi câu hỏi sang câu khác",
    description: "Replace question",
    detailVi: "Bỏ qua câu hỏi hiện tại nếu câu quá hóc búa để chuyển sang một câu hỏi khác trong bộ đề mà không bị mất điểm.",
    requiresTarget: false,
    tag: "Dùng chung",
    color: "#8b5cf6",
    scope: "GLOBAL",
  },
  TIME_PLUS: {
    emoji: "⏱️",
    name: "Time+",
    nameVi: "Thêm giờ",
    summaryVi: "+15 giây suy nghĩ",
    descriptionVi: "Thêm 15 giây",
    description: "Add 15 seconds",
    detailVi: "Kéo dài thời gian suy nghĩ thêm 15 giây cho cả đội có thêm cơ hội thảo luận và đưa ra đáp án chính xác.",
    requiresTarget: false,
    tag: "Dùng chung",
    color: "#ec4899",
    scope: "GLOBAL",
  },
  SHIELD: {
    emoji: "🛡️",
    name: "Shield",
    nameVi: "Tái sinh (Khiên)",
    summaryVi: "Miễn trừ điểm phạt 1 lần",
    descriptionVi: "Bảo vệ khỏi bị trừ điểm 1 lần",
    description: "Protect from penalty once",
    detailVi: "Kích hoạt khiên bảo hộ: Nếu câu này trả lời SAI, đội sẽ được miễn trừ 100% điểm phạt (nhận 0 điểm thay vì bị trừ).",
    correctEffectVi: "Tính điểm đúng như bình thường",
    wrongEffectVi: "0 điểm (Miễn trừ phạt)",
    requiresTarget: false,
    tag: "Phòng thủ",
    color: "#06b6d4",
    scope: "PRIVATE",
  },
  STEAL: {
    emoji: "💸",
    name: "Steal",
    nameVi: "Cướp điểm",
    summaryVi: "Cướp điểm đội dẫn đầu",
    descriptionVi: "Cướp điểm của đội dẫn đầu",
    description: "Steal points from leader",
    detailVi: "Cướp một lượng điểm từ đội đang dẫn đầu bảng xếp hạng để cộng trực tiếp vào tổng điểm của đội bạn.",
    requiresTarget: false,
    tag: "Cướp bóc",
    color: "#eab308",
    scope: "PRIVATE",
  },
  PENALTY: {
    emoji: "💥",
    name: "Penalty",
    nameVi: "Phạt đôi",
    summaryVi: "Nhân đôi điểm trừ đối thủ",
    descriptionVi: "Nhân đôi điểm trừ của đội mục tiêu",
    description: "Double penalty for target team",
    detailVi: "Chỉ định 1 đội đối thủ. Nếu đội đó trả lời SAI ở câu này, họ sẽ bị nhân đôi mức điểm phạt (-100% điểm câu hỏi)!",
    requiresTarget: true,
    tag: "Phạt nặng",
    color: "#dc2626",
    scope: "PRIVATE",
  },
};

export type BloomLevel = "REMEMBER" | "APPLY" | "ANALYZE";

export const BLOOM_METADATA: Record<BloomLevel, { labelVi: string; emoji: string; color: string; bg: string }> = {
  REMEMBER: { labelVi: "Nhận biết / Thông hiểu", emoji: "🟢", color: "#22c55e", bg: "rgba(34, 197, 94, 0.15)" },
  APPLY: { labelVi: "Vận dụng", emoji: "🟡", color: "#eab308", bg: "rgba(234, 179, 8, 0.15)" },
  ANALYZE: { labelVi: "Tình huống nâng cao", emoji: "🟣", color: "#a855f7", bg: "rgba(168, 85, 247, 0.15)" },
};

export function getBloomLevelFromPoints(points: number, explicitLevel?: string): BloomLevel {
  if (explicitLevel === "REMEMBER" || explicitLevel === "APPLY" || explicitLevel === "ANALYZE") {
    return explicitLevel;
  }
  if (points >= 30) return "ANALYZE";
  if (points >= 20) return "APPLY";
  return "REMEMBER";
}

/**
 * Quy chuẩn thời gian đếm ngược chính xác theo 4 mức điểm chuẩn của Timeout Quiz:
 * - 10 điểm (Nhận biết) -> 15 giây (olympia_15s.mp3)
 * - 20 điểm (Thông hiểu / Vận dụng) -> 20 giây (olympia_20s.ogg)
 * - 30 điểm (Vận dụng cao) -> 30 giây (olympia_30s.mp3)
 * - 40 điểm (Tính toán phức tạp, đa số liệu) -> 60 giây (olympia_60s.mp3)
 */
export function quantizeOlympiaTimeLimit(points: number = 10, _explicitTimeLimit?: number): number {
  void _explicitTimeLimit;
  if (points <= 10) return 15;
  if (points <= 20) return 20;
  if (points <= 30) return 30;
  return 60;
}

/**
 * Tính thời gian trả lời sau khi giành chuông (hoặc cướp chuông):
 * - Trắc nghiệm 1 đáp án (MC_SINGLE, TRUE_FALSE): 5s/câu.
 * - Trắc nghiệm nhiều đáp án (MC_MULTI) và tự luận (FILL_BLANK, ESSAY):
 *   + Dễ (points <= 10 hoặc REMEMBER): 10s.
 *   + Trung bình (points 11-20 hoặc APPLY): 15s.
 *   + Khó (points 21-30 hoặc ANALYZE): 20s.
 *   + Rất khó (points > 30): 30s.
 * - Nối cặp (MATCHING) và Kéo thả (DRAG_DROP):
 *   + Dễ: 15s.
 *   + Trung bình: 20s.
 *   + Khó (30đ): 25s.
 *   + Rất khó (40đ): 35s.
 */
export function getBuzzedAnswerTimeLimit(
  question: { type: QuestionType; points?: number; bloomLevel?: BloomLevel },
  overridePoints?: number
): number {
  if (question.type === "MC_SINGLE" || question.type === "TRUE_FALSE") {
    return 5;
  }
  const effPoints = overridePoints !== undefined ? overridePoints : (question.points ?? 10);
  const bloom = question.bloomLevel ?? getBloomLevelFromPoints(effPoints);
  const isUltra = effPoints >= 40;
  const isHigh = bloom === "ANALYZE" || effPoints >= 30;
  const isMedium = bloom === "APPLY" || effPoints >= 20;

  if (question.type === "MATCHING" || question.type === "DRAG_DROP") {
    if (isUltra) return 35;
    if (isHigh) return 25;
    if (isMedium) return 20;
    return 15;
  }

  // MC_MULTI, FILL_BLANK, ESSAY
  if (isUltra) return 30;
  if (isHigh) return 20;
  if (isMedium) return 15;
  return 10;
}

/**
 * Tính thời gian tiêu chuẩn cho câu hỏi trả lời trên thiết bị cá nhân hoặc hiển thị phòng:
 * Khóa cứng theo quy chuẩn 4 mức điểm 10/20/30/40:
 * - 10 điểm -> 15 giây
 * - 20 điểm -> 20 giây
 * - 30 điểm -> 30 giây
 * - 40 điểm -> 60 giây (bài toán tính toán phức tạp, đa số liệu)
 */
export function getStandardQuestionTimeLimit(
  question: { type?: QuestionType; points?: number; timeLimit?: number; bloomLevel?: BloomLevel },
  overridePoints?: number
): number {
  const effPoints = overridePoints !== undefined ? overridePoints : (question.points ?? 10);
  if (effPoints <= 10) return 15;
  if (effPoints <= 20) return 20;
  if (effPoints <= 30) return 30;
  return 60;
}


// ─── Question ─────────────────────────────────────────────────────────────────

export interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface MatchPair {
  id: string;
  left: string;
  right: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  content: string;
  options?: Option[];
  answer?: string;
  pairs?: MatchPair[];
  points: number;
  timeLimit: number;
  mediaUrl?: string;
  mediaType?: "image" | "audio" | "video";
  mediaPlaybackMode?: "AFTER_PLAY" | "PARALLEL";
  allowManualGrading?: boolean;
  gradingCriteria?: string;
  clozeBlanks?: ClozeBlank[];
  hint?: string;
  order: number;
  bloomLevel?: BloomLevel;
  // Chiếc Nón Kỳ Diệu / Ô Chữ Liên Kết (Crossword)
  puzzleType?: MagicWheelPuzzleType;
  crosswordWords?: CrosswordWordItem[];
}

// ─── Game Config ──────────────────────────────────────────────────────────────

export interface GameConfig {
  powerupEnabled: boolean;
  powerupOwnerType: "SHARED" | "TEAM";
  powerupCountPerTeam: number;
  powerupCountShared: number;
  maxHandSize?: number;
  sharedPowerupTeamQuota?: number; // Quota for teams allowed to hold shared powerups (TIME_PLUS, SKIP)
  sharedPowerupProbability?: number; // Low probability (0.0 to 1.0) of receiving a shared powerup (default: 0.10, i.e. 10%)
  allowedPowerups: CardType[];
  timeBonusEnabled: boolean;
  penaltyForWrong: boolean;
  penaltyPoints: number;
  maxTeams: number;
  buzzMode: boolean;
  eliminationRounds: number;
  bouncebackQuestionsPerTurn?: number;
  bouncebackCycles?: number;
  answerMethod?: "DEVICE" | "MC";
  eliminationDeepScoring?: boolean;
  eliminationIntervalQuestions?: number;
  eliminationTeamsPerStage?: number;
  eliminationRevivalCount?: number;
  // Tournament config (Archived)
  tournamentQuestionsPerMatch?: number;
  // Magic Wheel config
  magicWheelSubMode?: "WHEEL_QUIZ" | "WORD_PUZZLE";
  magicWheelEdition?: "VIETNAMESE" | "ENGLISH";
  magicWheelEnglishPreset?: "RANDOM_MIX" | "SET_1" | "SET_2" | "SET_3";
  magicWheelBlackoutGuessedLetters?: boolean;
  magicWheelPuzzles?: { roundNumber: number; category: string; secretPhrase: string; clue?: string }[];
  magicWheelRoundsCount?: number;
  // Grid Caro config
  gridRows?: number;
  gridCols?: number;
  gridStreakTargetK?: number;
  gridCaroEnabled?: boolean;
  gridCaroBonusPoints?: number;
  gridPreviewDuration?: number;
  gridRoundsPerTeam?: number;
  gridMaxQuestions?: number;
  manualTimerStart?: boolean;
  // Dice Race config
  diceTrackTotalTiles?: number;
  // Wager config
  wagerTimeSeconds?: number;
  wagerMinAllowance?: number;
  wagerInitialPoints?: number;
  wagerBailoutLimit?: number;
  wagerMultiplierCap?: number;
  wagerRoundsPerTeam?: number;
  // Mystery Quest config
  mysteryQuestTurnsPerTeam?: number;
  // Match question limit
  matchMaxQuestions?: number;
  diceRaceMaxQuestions?: number;
  // Buzz config
  buzzUnlockMode?: "AUTO" | "MANUAL";
  buzzAutoDelay?: number;
  // Answer submission mode & timer start
  answerSubmissionMode?: "SINGLE_SUBMIT" | "ALLOW_CHANGE";
  autoTimerStart?: boolean;
  initialTeamScore?: number;
  questionAllocationStrategy?: "ORIGINAL_POINTS" | "BLOOM_BALANCED";
  // Room security
  passcode?: string;
  isLocked?: boolean;
}

// ─── State ────────────────────────────────────────────────────────────────────

export interface PowerupCard {
  id: string;
  type: CardType;
  ownerType: "SHARED" | "TEAM";
  teamId?: string;
  used: boolean;
}

export interface TeamState {
  id: string;
  name: string;
  color: string;
  avatar?: string;
  score: number;
  isEliminated: boolean;
  frozenRounds: number;
  shieldCount: number;
  cards: PowerupCard[];
  playerCount: number;
  hearts?: number; // Số trái tim phòng thủ trong Mystery Quest (Math.round(turnsPerTeam / 3))
  bailoutsRemaining?: number;
  streak?: number;
  accuracyRatio?: number;
  averageTimeSpent?: number;
  correctAnswersCount?: number;
  totalAnswersCount?: number;
  isSpectator?: boolean;
  isGhost?: boolean;
  ghostStreak?: number;
  ghostRoundAllCorrect?: boolean;
  ghostTotalCorrect?: number;
  ghostTotalAnswered?: number;
  ghostCurrentRoundCorrect?: number;
  eliminationInterval?: number;
  eliminatedAtStage?: number;
  firstGhostStage?: number;
}

export interface PlayerState {
  id: string;
  name: string;
  avatar?: string;
  score: number;
  teamId?: string;
  isHost: boolean;
  isOnline: boolean;
  streak?: number;
  isSpectator?: boolean;
}

// ─── Tournament Mode ─────────────────────────────────────────────────────────

export interface TournamentMatch {
  id: string; // e.g. "R1-M1", "FINAL"
  roundIndex: number;
  roundName: string; // "Tứ kết", "Bán kết", "Chung kết"
  matchIndex: number;
  team1Id?: string;
  team2Id?: string;
  team1Name?: string;
  team2Name?: string;
  team1Color?: string;
  team2Color?: string;
  team1Score: number;
  team2Score: number;
  winnerTeamId?: string;
  status: "UPCOMING" | "IN_PROGRESS" | "COMPLETED";
  currentQuestionInMatch: number;
  totalQuestionsInMatch: number;
  isTieBreaker?: boolean;
  predictions?: Record<string, string>; // teamId -> predictedWinnerId
  cheers?: { countA: number; countB: number };
  recap?: { team1Score: number; team2Score: number; winnerId?: string; winnerName?: string };
}

export interface TournamentState {
  matches: TournamentMatch[];
  currentMatchId?: string;
  questionsPerMatch: number;
  championTeamId?: string;
  championTeamName?: string;
  oracleScores?: Record<string, number>; // teamId -> prediction points (+15 predict, +10 answer)
  cheers?: { countA: number; countB: number };
  isSeedingRound?: boolean;
  seedingTotalQuestions?: number;
  currentSeedingQuestion?: number;
  activeRecapMatchId?: string;
  recapCountdownSeconds?: number;
}

// ─── Magic Wheel Mode (Vòng Quay Tri Thức - Chiếc Nón Kỳ Diệu) ─────────────

export type MagicWheelSectorType =
  | "POINTS"
  | "LOSE_TURN"
  | "BANKRUPT"
  | "DOUBLE"
  | "TRIPLE"
  | "HALF"
  | "EXTRA_TURN"
  | "LUCKY"
  | "FREE_PLAY"
  | "WILD_CARD"
  | "PRIZE"
  | "MYSTERY"
  | "EXPRESS"
  | "JACKPOT"
  | "STEAL_SWAP"
  | "ONE_MILLION"
  | "ONE_MILLION_SANDWICH"
  | "SPECIAL_ENVELOPE"
  | "BONUS_ENVELOPE";

export type MagicWheelRoundStage = "TOSS_UP_1" | "TOSS_UP_2" | "MAIN" | "MAIN_ROUND" | "SPECIAL_FINAL";

export type MagicWheelOperationMode = "SELF_SERVICE" | "HOST_ASSISTED";

export interface MagicWheelSector {
  id: number;
  label: string;
  type: MagicWheelSectorType;
  value?: number;
  color: string;
  textColor: string;
  isOverlay?: boolean;
  overlayType?:
    | "PRIZE"
    | "MYSTERY"
    | "EXPRESS"
    | "JACKPOT"
    | "STEAL_SWAP"
    | "TRIPLE"
    | "WILD_CARD"
    | "FREE_SPIN"
    | "ONE_MILLION"
    | "SPECIAL_ENVELOPE";
  isSandwich?: boolean;
  basePoints?: number;
  mysteryContent?: "PRIZE_3M" | "BANKRUPT";
  envelopePrizePoints?: number;
  envelopeTitle?: string;
}

export type MagicWheelPuzzleType = "STANDARD" | "CROSSWORD";

export interface CrosswordWordItem {
  id: string;
  word: string;                   // Từ khoá (vd: "DANTE", "TƯỢNG HỌC")
  row: number;                    // Hàng bắt đầu (0..3)
  col: number;                    // Cột bắt đầu (0..13)
  direction: "ACROSS" | "DOWN";   // Hướng: Ngang (ACROSS) hoặc Dọc (DOWN)
  clue?: string;                  // Gợi ý tuỳ chọn cho từ
}

export interface MagicWheelPuzzle {
  id: string;
  roundNumber: number; // 1..N (vòng chính), 0/-1 (Toss-up), 99 (Vòng Đặc Biệt)
  stage?: MagicWheelRoundStage;
  mainRoundIndex?: number; // 1, 2, 3, 4... cho các vòng chính
  category: string;    // "Danh nhân", "Địa danh", "Văn học", "Khoa học"
  secretPhrase: string; // "NGUYỄN HUỆ" hoặc danh sách từ liên kết
  clue?: string;        // "Vị anh hùng áo vải cờ đào..."
  clueDisplayMode?: "CATEGORY" | "CLUE"; // Chế độ hiển thị trên màn hình: Chủ đề hay Gợi ý
  revealedIndices: number[]; // Vị trí các ký tự đã được lật mở (hoặc row * 14 + col cho crossword)
  puzzleType?: MagicWheelPuzzleType; // "STANDARD" | "CROSSWORD"
  crosswordWords?: CrosswordWordItem[]; // Danh sách các từ đan xen trong Ô Chữ Liên Kết
}

export interface MagicWheelState {
  subMode: "WHEEL_QUIZ" | "WORD_PUZZLE";
  operationMode?: MagicWheelOperationMode;
  sectors: MagicWheelSector[];
  currentTurnTeamId: string;
  currentTurnTeamName: string;
  currentRound: number;       // Chỉ số trong mảng puzzles (1-based)
  maxRounds: number;          // Tổng số màn chơi trong mảng puzzles
  roundStage?: MagicWheelRoundStage;
  mainRoundNumber?: number;   // Vòng chính thứ mấy (1, 2, 3, 4...)
  totalMainRounds?: number;   // Tổng số vòng chính (max(3, số đội))
  round1StarterTeamId?: string; // Đội chiến thắng Đoán Nhanh 2 đi đầu ở Vòng Chính 1
  mainRound1StarterTeamId?: string;
  mainRoundStarterTeamIds?: Record<number, string>; // Lịch sử các đội mở màn từng Vòng Chính 1..N
  puzzles: MagicWheelPuzzle[];
  currentPuzzle?: MagicWheelPuzzle;
  isSpinning: boolean;
  spinPower: number; // 0 - 100
  targetRotationDegrees: number;
  selectedSectorIndex?: number;
  selectedSector?: MagicWheelSector;
  boardStage?: "EMPTY_56" | "BLANK_PHRASE" | "READY_CLUE"; // Trạng thái hiển thị bảng ô chữ 56 ô
  guessedLetters: string[]; // Các chữ cái đã đoán ("A", "B", "C"...)
  wrongGuessesCount: Record<string, number>; // teamId -> số lỗi liên tiếp
  freeSpinCount: Record<string, number>; // teamId -> số lần có Thêm Lượt
  roundScores: Record<string, number>; // teamId -> điểm tích lũy trong vòng hiện tại
  disqualifiedTeamIdsInRound: string[]; // Các đội bị loại trong vòng do phạm 3 lỗi liên tiếp
  consecutiveWrongGuesses: Record<string, number>; // teamId -> số lần đoán sai liên tiếp (0, 1, 2, 3)
  pendingSpecialAction?:
    | "NONE"
    | "EXTRA_TURN"
    | "DOUBLE"
    | "TRIPLE"
    | "HALF"
    | "POINTS"
    | "LUCKY"
    | "FREE_PLAY"
    | "MYSTERY"
    | "PRIZE"
    | "EXPRESS"
    | "JACKPOT"
    | "STEAL_SWAP"
    | "ONE_MILLION_SANDWICH";
  phase:
    | "SPIN_WAITING"      // Chờ đội đến lượt bấm quay
    | "SPINNING"          // Nón đang xoay
    | "SECTOR_RESULT"     // Nón đã dừng, thông báo kết quả ô quay
    | "ACTION_INPUT"      // Chờ đoán chữ cái / trả lời quiz / giải ô chữ
    | "VOWEL_BUY"         // Bản Anh: Chờ chọn 1 trong 5 nguyên âm (A, E, I, O, U) với 250đ
    | "MYSTERY_CHOICE"    // Chờ quyết định lật ô Bí Mật hay lấy 3000đ vĩnh viễn
    | "REWARD_CHOICE"     // V1: Chờ chọn 1 trong 20 lá thăm bí mật
    | "TRADE_CHOICE"      // V3: Chờ quyết định Đổi hay Không Đổi (Luật Tiếng Việt)
    | "FREE_SPIN_CHOICE"  // Bản Anh: Chờ quyết định dùng Thẻ Free Spin sau khi đoán sai / mất lượt
    | "LUCKY_PICK"        // Chờ người chơi chọn ô lật miễn phí
    | "EXPRESS_CHOICE"    // V4: Chờ chọn Lên Tàu Tốc Độ hay dừng lại
    | "STEAL_SWAP_CHOICE" // V5: Chờ chọn Cướp 50% hay Hoán Đổi Điểm Vòng
    | "TOSS_UP_READY"     // Đoán nhanh: Chờ bắt đầu mở chữ ngẫu nhiên
    | "TOSS_UP_RUNNING"   // Đoán nhanh: Chữ đang hiện ngẫu nhiên 0.75s/chữ
    | "TOSS_UP_REVEALING" // Đoán nhanh: Chữ đang hiện ngẫu nhiên 0.75s/chữ
    | "TOSS_UP_BUZZED"    // Đoán nhanh: Có người bấm chuông đang trả lời
    | "SPECIAL_ORDER_CHOICE" // Vòng Đặc Biệt: Chọn Quay trước hay Giải ô chữ trước
    | "SPECIAL_CHOOSE_ORDER"
    | "SPECIAL_SPIN_WAITING" // Vòng Đặc Biệt: Chờ quay Phong Bì Đặc Biệt
    | "SPECIAL_PICK_LETTERS" // Vòng Đặc Biệt: Chọn K chữ cái đoán trước
    | "SPECIAL_THINKING"
    | "SPECIAL_SOLVING"   // Vòng Đặc Biệt: 30s suy nghĩ + 10s trả lời liên tục
    | "SPECIAL_FINAL_FLOW"
    | "ROUND_RECAP";      // Kết thúc vòng, tổng kết điểm
  mysteryRevealedType?: "PRIZE_CASH" | "BANKRUPT";
  lastActionMessage?: string;
  lastAwardedPoints?: number;
  lastSolveAttemptText?: string;
  activeQuestionId?: string; // Dùng trong thể thức WHEEL_QUIZ
  permanentScores?: Record<string, number>; // Điểm vĩnh viễn bảo toàn mang về chung cuộc
  prizeCash?: Record<string, number>; // Tiền thưởng vĩnh viễn (V2 3M, V3 quà tiền) - không tính vào kết quả xét đội vào vòng đặc biệt
  physicalPrizes?: Record<string, string[]>; // Quà tặng vật chất (Vòng 3: Nồi chiên không dầu, Bộ nồi Inox 5 đáy & Máy xay)
  tieBreakerPending?: boolean; // Cờ chờ Ô Chữ Phụ khi có hòa điểm xét vào Vòng Đặc Biệt
  tiedTeamIds?: string[]; // Danh sách các đội hòa điểm cao nhất cần đấu Ô Chữ Phụ
  teamShields?: Record<string, boolean>; // Khiên bảo hộ chống mất lượt / mất điểm
  round3TradedTeams?: string[]; // V3: Các đội đã chọn Đổi (dừng vòng 3 lấy quà)
  round3ForbiddenSolveTeams?: string[]; // V3: Các đội bị cấm đoán cả ô chữ (phải lật từng chữ đến cuối)
  round3FirstTurnAttempted?: Record<string, boolean>; // V3: Theo dõi đội đã thực hiện lượt quay hợp lệ đầu tiên chưa
  isFreePlayActive?: boolean; // Bản Anh: Đang ở lượt quay Free Play (được gọi nguyên âm miễn phí, 0đ, đoán sai không mất lượt)
  wildCardsCount?: Record<string, number>; // Bản Anh: Số thẻ Wild Card đội đang nắm giữ (đoán thêm phụ âm cùng giá hoặc thêm phụ âm ở Bonus Round)
  mustSpinOnly?: boolean; // Bản Anh: Khi dùng Thẻ Free Spin, bắt buộc phải quay nón ở lượt được thêm, chưa được giải ô chữ ngay
  freeSpinTokenClaimed?: boolean; // Bản Anh: Thẻ Free Spin trên ô $500 đã có người nhặt chưa
  held25kBonusTeams?: Record<string, number>; // V5: Số lần đội đang giữ 25.000 điểm thưởng nóng từ ô kẹp Mất Điểm (mỗi lần dính Mất Điểm sẽ bị thu hồi 1 lần 25.000đ)
  hasMillionPrizeInSpecial?: boolean; // Cờ kích hoạt giải thưởng 1 TỶ ĐỒNG ở Vòng Đặc Biệt
  mustSolveWithTones?: boolean; // Đã lộ hết chữ cái gốc trên bảng, bắt buộc Giải Ô Chữ đúng dấu thanh
  // Toss-up state
  tossUpRevealOrder?: number[];
  tossUpStartTime?: number;
  tossUpWrongTeamIds?: string[];
  tossUpBuzzedTeamId?: string;
  tossUpBuzzedTeamName?: string;
  tossUpAnswerEndsAt?: number;
  // Vòng 4+: Express & Jackpot & Speed-up
  jackpotPool?: number;       // Hũ Kim Cương tích lũy ở Vòng 4
  expressModeActive?: boolean; // Đang trên Chuyến Tàu Tốc Độ (gọi chữ liên hoàn 1000đ/chữ)
  expressTrainActive?: boolean;
  speedUpBellActive?: boolean; // Vòng 6+: Chuông Tăng Tốc (1500đ/chữ không cần quay)
  // Vòng Đặc Biệt (Special Final Round)
  specialFinalTeamId?: string;
  specialFinalTeamName?: string;
  specialOrderMode?: "SPIN_FIRST" | "SOLVE_FIRST";
  specialFinalChoiceOrder?: "SPIN_FIRST" | "SOLVE_FIRST";
  specialEnvelopePrize?: { label: string; value: number };
  specialBonusCompleted?: boolean;
  specialPuzzleCompleted?: boolean;
  specialBonusPoints?: number; // Mệnh giá phong bì quay được (ẩn cho đến khi giải xong)
  specialAllowedLettersCount?: number; // Số chữ cái K được chọn trước
  // BUG-29 FIX: Removed duplicate `specialAllowedLetterCount` (missing 's') - use `specialAllowedLettersCount`
  specialPickedLetters?: string[];     // Các chữ cái đã chọn ở Vòng Đặc Biệt
  // BUG-30 FIX: Removed duplicate `specialSelectedLetters` - use `specialPickedLetters`
  specialThinkEndsAt?: number;
  specialAnswerEndsAt?: number;
  specialSolveEndsAt?: number;         // Timestamp hết 40s (30s suy nghĩ + 10s trả lời)
  specialAttemptLog?: string[];        // Lịch sử các đáp án đã gõ thử trong 40s
  roundEliminatedTeamIds?: string[];   // Các đội bị tước quyền giải ô chữ trong vòng này (do đã dùng 1 lượt giải và đoán sai)
  lastSolveFeedback?: {
    teamId?: string;
    teamName?: string;
    guess?: string;
    attemptText?: string;
    isCorrect: boolean;
    success?: boolean;
    pointsAwarded?: number;
    revealedAnswer?: string;
    correctPhrase?: string;
    eliminatedFromRound?: boolean;
    allTeamsEliminated?: boolean;
    timestamp: number;
  } | null;
  edition?: "VIETNAMESE" | "ENGLISH"; // Phiên bản Tiếng Việt hoặc Tiếng Anh (Wheel of Fortune)
  englishPreset?: "RANDOM_MIX" | "SET_1" | "SET_2" | "SET_3"; // 3 bộ đề tiếng Anh hoặc trộn ngẫu nhiên
  blackoutGuessedLetters?: boolean;   // Admin setting: Có bôi đen/làm mờ chữ cái đã đoán hay không (mặc định: true)
  noMoreConsonants?: boolean;         // Bản Anh: Đã lật hết toàn bộ phụ âm, các ô chữ còn lại đều là nguyên âm (A, E, I, O, U)
  sameLetterBonusAwarded?: boolean;   // Bản Anh: Đã trao thưởng +1.000 điểm cho chữ cái SAME LETTER chưa
  sameLetterChar?: string;           // Phụ âm khởi đầu chung của chủ đề SAME LETTER
  sameLetterBonusEarnedTeamId?: string; // Đội đã nhận thưởng +1.000đ từ chữ cái SAME LETTER
  temporaryDisplayText?: string;      // Admin: Chữ hiển thị thủ công tạm thời trên bảng ô chữ giữa 2 vòng
  temporaryDisplayActive?: boolean;   // Admin: Có đang hiển thị chữ tạm thời hay không
  displayLayoutMode?: "AUTO" | "STACKED" | "FOCUS_WHEEL" | "FOCUS_BOARD"; // Chế độ bố cục Display
}

// ─── Grid Caro Mode ──────────────────────────────────────────────────────────

export interface GridCell {
  id: number; // 1 to X
  row: number;
  col: number;
  points: number;
  difficulty: "DỄ" | "TRUNG BÌNH" | "KHÓ" | "CỰC KHÓ";
  questionId?: string;
  claimedByTeamId?: string;
  claimedByTeamName?: string;
  claimedByTeamColor?: string;
  isCompleted: boolean;
  questionIndex?: number;
  attemptCount: number;
}

export interface SelectedCellInfo {
  cellId: number;
  points: number;
  difficulty: "DỄ" | "TRUNG BÌNH" | "KHÓ" | "CỰC KHÓ";
  teamId?: string;
  teamName: string;
  teamColor?: string;
}

export interface GridCaroState {
  rows: number;
  cols: number;
  totalCells: number;
  cells: GridCell[];
  previewActive: boolean;
  previewRemaining: number;
  currentTurnTeamId?: string;
  currentTurnTeamName?: string;
  selectedCellId?: number;
  selectedCellAnimation?: boolean;
  selectedCellInfo?: SelectedCellInfo;
  questionReady?: boolean;
  autoAdvanceSeconds?: number;
  currentRound: number;
  maxRounds: number;
  turnsCompleted: number;
  maxTurns: number;
  caroEnabled: boolean;
  streakTargetK: number;
  caroAchievedTeams: string[];
  caroBonusPoints: number;
  lastActionMessage?: string;
}

// ─── Dice Race Mode ──────────────────────────────────────────────────────────

export type DiceTileType =
  | "NORMAL"
  | "BOOST"
  | "TRAP"
  | "SHIELD"
  | "SWAP"
  | "EXTRA_ROLL"
  | "TELEPORT"
  | "TELEPORT_EXIT"
  | "FINISH";

export interface DiceTile {
  index: number;
  type: DiceTileType;
  label: string;
  effectValue?: number;
  teleportTargetIndex?: number; // 0-based destination tile index
  portalId?: string; // e.g. "Alpha", "Beta"
}

export interface TeamRaceProgress {
  teamId: string;
  teamName: string;
  teamColor: string;
  avatar?: string;
  position: number;
  hasFinished: boolean;
  finishRank?: number;
  hasShield?: boolean;
  extraRollGranted?: boolean;
}

export interface DiceRaceState {
  totalTiles: number;
  tiles: DiceTile[];
  teamPositions: Record<string, TeamRaceProgress>;
  currentTurnTeamId?: string;
  currentTurnTeamName?: string;
  lastDiceRoll?: number;
  lastDiceValues?: [number, number];
  rollTimestamp?: number;
  isRolling: boolean;
  dicePendingAnswer: boolean;
  canRollDice?: boolean;
  extraRollGranted?: boolean;
  finishLeaderboard: string[];
}

// ─── Secret Wager Mode ───────────────────────────────────────────────────────

export interface WagerHistoryItem {
  order: number;
  teamId: string;
  teamName: string;
  teamColor?: string;
  amount: number;
  timestamp: number;
}

export interface TeamWager {
  teamId: string;
  teamName: string;
  amount: number;
  submitted: boolean;
  order?: number;
  disqualified?: boolean;
}

export interface WagerBailoutQueueItem {
  teamId: string;
  teamName: string;
  teamColor?: string;
  score: number;
  questionIndex: number;
  eliminatedAt?: number;
}

export interface WagerState {
  phase: "WAGER_PERIOD" | "QUESTION_PERIOD" | "REVEAL_PERIOD";
  wagerSubPhase?: "INITIAL_5S" | "MAIN_15S";
  autoAssignedTeamId?: string;
  autoAssignedTeamName?: string;
  autoLaunchCountdown?: number;
  questionReady?: boolean;
  wagerTimeRemaining: number;
  wagerTimeTotal: number;
  minWager: number;
  currentHighestWager: number;
  lastWagerTeamId?: string;
  previousQuestionWagerTeamId?: string;
  wagerHistory: WagerHistoryItem[];
  allowanceMinScore: number;
  initialPoints?: number;
  topicPreview?: string;
  difficultyPreview?: string;
  teamWagers: Record<string, TeamWager>;
  teamBailouts?: Record<string, { remaining: number; max: number }>;
  bailoutQueue?: WagerBailoutQueueItem[];
  currentQuestionBailoutUsed?: boolean;
  maxBetCap?: number;
  wagerMultiplierCap?: number;
  baseQuestionPoints?: number;
  roundIndex?: number;
  totalRounds?: number;
}

// ─── Mystery Quest Mode ──────────────────────────────────────────────────────

export type MysteryTheme = "CASTLE" | "PIRATE" | "FOREST" | "CYBER" | "TEMPLE";

export type MysteryMiniGameType =
  | "MEMORY_PAIRS"     // 1. Lật cặp trùng nhau (Memory Match)
  | "ONE_SHOT_DOORS"    // 2. Chọn 1 trong số ít cửa (Single Pick)
  | "PUSH_YOUR_LUCK"    // 3. Lật liều tích lũy né Bom (1 lớp bài kinh điển)
  | "TAROT_DESTINY"     // 4. Rút Thẻ Bài Tarot Thần Số (8 Ấn Định Mệnh / Vòng Quay)
  // Legacy / Cosmetic aliases:
  | "DOORS"
  | "CHESTS"
  | "TAROT_CARDS"
  | "RADAR_WINDOWS";

export type MysteryPromoPerk =
  | "SHIELD_PROMO"        // 🛡️ Tặng 01 Khiên Chặn Bom!
  | "EXTRA_POT_PROMO"     // 🎁 Quỹ thưởng +5đ!
  | "STEAL_5_PROMO"       // 🗡️ Đánh cắp 5đ từ đội cao điểm nhất!
  | "DOUBLE_PROMO"        // ⚡ Nhân đôi điểm thưởng x2! (Legacy)
  | "PEEK_PROMO"          // 👁️ Mắt Thần Soi Bài!
  | "EXTRA_ATTEMPT_PROMO" // 🔄 Thêm lượt lật / Cơ hội thứ hai!
  | "SAFETY_NET_PROMO"    // 🧲 Két Sắt Bảo Lưu (giữ 50% điểm quỹ nếu dính bom trong Lật Liều)
  | "SUN_MAGNET_PROMO";   // ☀️ Nam Châm Thái Dương (biến 1 ô Kẻ Khờ thành Mặt Trời trong Vòng Quay Tarot)

export type MysteryTileEffectType =
  | "BONUS_POINTS" // +20đ, +50đ, +100đ (Jackpot)
  | "MULTIPLY_X2"  // Nhân đôi tổng điểm hiện tại
  | "DIVIDE_HALF"  // Chia đôi điểm hiện tại (Hiệu ứng Ô số phận)
  | "STEAL_POINTS" // Cướp 20-30đ từ đội cao điểm nhất
  | "LOSE_POINTS"  // Mất 20-30đ
  | "LOSE_POT_POINTS" // Bẫy trừ điểm trong Hũ (-5đ, -10đ) nhưng không nổ bom
  | "FORCE_STOP"   // Buộc dừng: Khóa chốt điểm Hũ hiện tại và kết thúc lượt an toàn
  | "EXTRA_TURN"   // Nhận thêm 1 lượt chọn ô câu tiếp theo
  | "RARE_POWERUP" // Tặng 1 thẻ bài bổ trợ hiếm (Khiên / Đổi câu / 50-50)
  | "SAFE_SHIELD"  // Tặng Khiên bảo vệ
  | "GIFT_POINTS"  // Tặng toàn bộ điểm đang có cho một đội khác
  | "ESCAPE_SAFE"; // Thoát hiểm an toàn trong chế độ Sinh Tử

export type MysteryTileType =
  | "REWARD"
  | "ESCAPE_SAFE" // Ô/Lá thoát hiểm an toàn trong chế độ Sinh Tử
  | "TRAP"         // Thẻ bất lợi nhẹ (-5đ, -10đ Hũ hoặc Buộc dừng)
  | "BOMB_SMOKE"   // 1. Bom Khói (50%): Mất sạch điểm của câu này
  | "BOMB_DARK"    // 2. Bom Hắc Ám (35%): Mất điểm chia đều cho các đội còn lại
  | "BOMB_CHARITY" // 3. Bom Từ Thiện (15%): Mất 50% điểm tặng cho đội cao nhất
  // Backward-compatible aliases:
  | "BOMB_MINOR"
  | "BOMB_MAJOR"
  | "BOMB_DOOM"
  | "BOMB_GIFT";

export interface MysteryTile {
  id: number;
  label: string; // e.g. "Cửa #1", "Rương #1", "Thẻ #1"
  icon: string;
  isOpened: boolean;
  type: MysteryTileType;
  storyTitle: string;
  storyDescription: string;
  effectType: MysteryTileEffectType;
  deltaPoints: number; // e.g. 10, 20, 50, etc.
  cardReward?: CardType;
  pairKey?: string; // Khóa ghép cặp cho MEMORY_PAIRS
  tarotName?: string; // Tên lá bài cho TAROT_DESTINY
  tarotCardKey?: AncientTarotCardKey; // Khóa thẻ Tarot archetype tương ứng
  bombDoorType?: "BOMB_SMOKE" | "BOMB_DARK" | "BOMB_CHARITY"; // Loại bom nếu là ô/cặp bom
  givesShield?: boolean; // Trao khiên bảo vệ
  givesHeart?: boolean; // Hồi phục tim
  stealFraction?: number; // Tỷ lệ cướp điểm (0.5 hoặc 1.0)
  isPeeked?: boolean; // Được soi sáng hiển thị trước bởi Mắt Thần
  peekLabel?: string; // Nhãn chức năng hiển thị hé lộ của Mắt Thần
  peekIcon?: string;  // Icon hiển thị hé lộ của Mắt Thần
}

export type AncientTarotCardKey =
  | "THE_FOOL"
  | "THE_MAGICIAN"
  | "THE_HIGH_PRIESTESS"
  | "THE_EMPRESS"
  | "THE_EMPEROR"
  | "THE_HIEROPHANT"
  | "THE_LOVERS"
  | "THE_CHARIOT"
  | "STRENGTH"
  | "THE_HERMIT"
  | "WHEEL_OF_FORTUNE"
  | "JUSTICE"
  | "THE_HANGED_MAN"
  | "THE_DEATH"
  | "TEMPERANCE"
  | "THE_DEVIL"
  | "THE_TOWER"
  | "THE_STAR"
  | "THE_MOON"
  | "THE_SUN"
  | "JUDGEMENT"
  | "THE_WORLD"
  | "DEATH"
  | "THE_PEACE"
  | "THE_KNIGHT";
export type TarotDeathSubtype = "GIFT" | "STEAL" | "GIFT_TOP1" | "STEAL_TOP1";

export interface AncientTarotDrawnCard {
  key: AncientTarotCardKey;
  nameVi: string;
  nameEn: string;
  icon: string;
  roman: string;
  group: "COMMON" | "MUTATION" | "CRITICAL";
  deathSubtype?: TarotDeathSubtype;
  scoreDelta: number;
  victimTeamId?: string;
  victimTeamName?: string;
  stolenPoints?: number;
  recipientTeamId?: string;
  recipientTeamName?: string;
  giftedPoints?: number;
  darkBombRecipients?: Array<{ teamId: string; teamName: string; points: number }>;
  temperanceBonusRecipients?: Array<{ teamId: string; teamName: string; points: number }>;
  hierophantPenalties?: Array<{ teamId: string; teamName: string; points: number }>;
  allShieldsGranted?: boolean;
  shieldsGrantedTeamIds?: string[];
  heartsHealedTeamIds?: string[];
  brokenShieldTeamId?: string;
  maxHeartsBonusTeamId?: string;
  heartLostTeamId?: string;
  shieldDisabledTeamId?: string;
  immunityGrantedTeamId?: string;
}

export interface TarotWheelSegment {
  index: number;
  key: AncientTarotCardKey;
  nameVi: string;
  nameEn: string;
  icon: string;
  roman: string;
  group: "COMMON" | "MUTATION" | "CRITICAL";
  deathSubtype?: TarotDeathSubtype;
  bgColor: string;
  borderColor: string;
  textColor: string;
  isMagnetized?: boolean;
  isRevealPending?: boolean;
  maskedEffect?: string;
  isShieldTransformed?: boolean;
}

export type TeamNoticeType =
  | "ACTIVE_REWARD"
  | "ACTIVE_PENALTY_BOMB"
  | "ACTIVE_STEAL_SUCCESS"
  | "ACTIVE_STEAL_FALLBACK"
  | "ACTIVE_GAMBLE_STOP"
  | "ACTIVE_SURVIVAL_ESCAPE"
  | "ACTIVE_SURVIVAL_FAIL"
  | "VICTIM_STOLEN_CHARIOT"
  | "VICTIM_STOLEN_DEATH"
  | "VICTIM_PROTECTED_SHIELD"
  | "RECIPIENT_CHARITY_GIFT"
  | "RECIPIENT_DARK_BOMB_SHARE"
  | "RECIPIENT_TEMPERANCE_ASSIST"
  | "NEUTRAL";

export interface TeamPrivateNotice {
  recipientTeamId: string;
  recipientTeamName?: string;
  title: string;
  message: string;
  delta: number;
  noticeType: TeamNoticeType;
  actorTeamName?: string;
  templateId: string;
  timestamp: number;
}

export type TeamRiskTier = "UNDERDOG" | "NEUTRAL" | "DOMINANT";

export interface MysteryQuestState {
  currentTurnTeamId: string;
  currentTurnTeamName: string;
  currentTurnTeamColor: string;
  currentTurnIndex: number; // 0, 1, 2...
  totalTurns: number; // teams.length * turnsPerTeam
  turnsPerTeam: number;
  initialHeartsPerTeam?: number; // Số Tim ban đầu: Math.round(turnsPerTeam / 3)
  teamHearts?: Record<string, number>; // Quản lý số Tim thực tế của từng team (teamId -> hearts)
  teamMaxHearts?: Record<string, number>; // Quản lý giới hạn Tim tối đa của từng team (teamId -> maxHearts)
  currentRound: number; // 1, 2, ...
  theme: MysteryTheme;
  miniGameType: MysteryMiniGameType;
  themeNameVi: string;
  themeBgGradient: string;
  tiles: MysteryTile[];
  phase: "QUESTION_ACTIVE" | "DECISION_CHOICE" | "STEAL_PHASE" | "PUSH_YOUR_LUCK" | "STEAL_TARGET_SELECT" | "TURN_SUMMARY";
  pendingSteal?: {
    stolenPoints: number;
    eligibleTeamIds: string[];
    tileTitle: string;
    tileIcon: string;
    sourceCardKey?: AncientTarotCardKey;
    baseBonusPoints?: number;
    healHeartSelf?: boolean;
    grantShieldSelf?: boolean;
    grantShieldVictim?: boolean;
    breakVictimShield?: boolean;
    isArmorPiercing?: boolean;
    isShieldShatter?: boolean;
  };
  pendingStealVictimId?: string;
  pendingStealVictimName?: string;
  stealBuzzedTeamId?: string;
  stealBuzzedTeamName?: string;
  stealEndsAt?: number;
  stealCountdown?: number;
  baseQuestionPoints?: number;
  decisionMade?: "TAKE_BASE_POINTS" | "PLAY_MINIGAME";
  promoPerk?:
    | MysteryPromoPerk
    | {
        type: MysteryPromoPerk;
        title: string;
        description: string;
        icon: string;
      };
  hasShield?: boolean;
  teamShields?: Record<
    string,
    {
      activeFromTurnIndex: number;
      expiresAfterTurnIndex: number;
      hp?: number;
      maxHp?: number;
      sourceCard?: string;
    }
  >;
  teamImmunities?: Record<string, { activeFromTurnIndex: number; expiresAfterTurnIndex: number; sourceCard?: string }>; // Bùa Miễn Nhiễm Mặt Trăng (The Moon)
  fullHeartSacrificePrompt?: {
    teamId: string;
    teamName: string;
    lostQuestionPoints: number;
    basePenaltyPoints: number;
    heartsToSacrifice: number;
    expiresAt: number;
  };
  currentTeamRiskTier?: TeamRiskTier;
  timesStolenInCycle?: Record<string, number>;
  consecutiveBombsByTeam?: Record<string, number>;
  smokeDebuffByTeam?: Record<string, boolean>; // Quản lý đội nào đang chịu hiệu ứng khói ở lượt kế tiếp
  lastSmokePenaltyApplied?: { teamId: string; points: number }; // Ghi nhận mức phạt khói vừa áp dụng trong lượt
  // Push-your-luck pot & minigame state
  potPoints: number; // Điểm tích lũy trong lượt này
  potMultiplier: number; // Hệ số nhân
  stolenPointsPot?: number; // Điểm cướp được từ đối thủ tích lũy trong hũ
  cardsFlippedCount: number;
  lastFlippedTile?: MysteryTile;
  bombExploded?: {
    type: "SMOKE" | "DARK" | "CHARITY" | "MINOR" | "MAJOR" | "DOOM" | "GIFT";
    title: string;
    description: string;
    penaltyText: string;
    donorTeamId?: string;
    donorTeamName?: string;
    deductedPoints?: number;
    recipientTeamId?: string;
    recipientTeamName?: string;
    giftedPoints?: number;
    recipients?: Array<{
      teamId: string;
      teamName: string;
      points: number;
    }>;
  };
  turnFinishedReason?:
    | "TOOK_BASE_POINTS"
    | "CASH_OUT"
    | "BOMB_HIT"
    | "FORCE_STOP"
    | "QUESTION_FAILED"
    | "ALL_CLEARED"
    | "PAIR_MATCHED"
    | "DOOR_CHOSEN"
    | "TAROT_DRAWN"
    | "TAROT_WHEEL_SPUN"
    | "SURVIVAL_ESCAPE"
    | "SURVIVAL_FAILED"
    | "MAX_ATTEMPTS";
  // Trạng thái Chế độ Sinh Tử (khi trả lời sai)
  isPenaltySurvivalMode?: boolean;
  survivalDilemmaPending?: boolean;
  survivalDilemmaChoice?: "SACRIFICE_HEART" | "RISK_SURVIVAL";
  storyResult?: {
    teamId: string;
    teamName: string;
    teamColor: string;
    rewardText: string;
    scoreDelta: number;
    oldScore: number;
    newScore: number;
  };
  teamNotices?: Record<string, TeamPrivateNotice>;
  // Dữ liệu riêng cho từng biến thể:
  memoryPairsState?: {
    firstFlippedTileId?: number | null;
    secondFlippedTileId?: number | null;
    thirdFlippedTileId?: number | null;
    keptBombTileIds?: number[];
    isBombRescueActive?: boolean;
    activePenaltyPairKey?: string | null;
    attemptsUsed: number;
    maxAttempts: number;
    matchedPairKey?: string | null;
    isMismatchResolving?: boolean;
    round?: 1 | 2;
    promptSecondChance?: boolean;
    faceUpPenaltyTileIds?: number[]; // Các lá phạt/trung lập được lật ngửa cố định trên bàn
    attemptedPairs?: string[]; // Danh sách các cặp ô đã từng lật trong vòng (chống lặp lại cùng 1 nước đi)
    rescueFormedNegativePairs?: Array<{
      pairKey: string;
      formedAtStep: 1 | 2 | 3;
      cardTileIds: number[];
    }>;
  };
  oneShotState?: {
    chosenTileId?: number;
    selectedDoorIds?: number[]; // Cửa đang chọn (4 cửa ở bước 1, 2 cửa ở bước 2)
    discardedDoorIds?: number[]; // Cửa đã bị loại bỏ (có thể dùng để đổi ở bước 3)
    penaltyDoorsCount?: number; // Số lượng cánh cửa trừ điểm
    hasBombDetected?: boolean;  // Backward compat
    phase?:
      | "SELECT_4"
      | "STAGE_1_DECISION"
      | "SELECT_2"
      | "FINAL_DECISION"
      | "SWAP_DOOR"
      | "OPEN_FINAL"
      | "SELECTING"
      | "PENALTY_DECISION"
      | "STAGE_2_PICK"
      | "SCANNED"
      | "RESOLVED";
    radarLight?: "GREEN" | "YELLOW" | "RED"; // Đèn tín hiệu radar: Xanh (0), Vàng (1), Đỏ (>=2)
    radarLightStep1?: "GREEN" | "YELLOW" | "RED";
    revealedSafeDoorIds?: number[];
    chosenFinalDoorId?: number;
    allRevealed?: boolean;
    peekAvailable?: boolean;    // Có đặc quyền Mắt Thần
    peekActivated?: boolean;    // Đã kích hoạt Mắt Thần (tự động khóa cửa trừ gốc)
    hasSwapped?: boolean;       // Đã đổi 1 lá sang lá khác (chỉ 1 lần duy nhất)
    swapRemovedDoorId?: number; // Cửa bỏ ra
    swapAddedDoorId?: number;   // Cửa thay vào
    swappedFromGreen?: boolean; // Đánh dấu đổi cửa từ Đèn Xanh
    forcedOpenDoorId?: number;  // ID cánh cửa bắt buộc phải mở (chính là swapAddedDoorId)
    isBasePointsWithMinusHeart?: boolean; // Rút lui nhận 50% điểm gốc và trừ 1 Tim
    bombDoorType?: "BOMB_SMOKE" | "BOMB_DARK" | "BOMB_CHARITY"; // Loại bom ngẫu nhiên của Cửa Bom
  };
  tarotState?: {
    chosenCardId?: number;
    canRedraw?: boolean;
    hasRedrawn?: boolean;
    prophecyCardId?: number;    // ID lá bài Mắt Thần tiên tri hé lộ trước
    prophecyResolved?: boolean;  // Đã chốt quyết định tiên tri (chọn luôn hay bỏ qua)
    discardedCardId?: number;   // Lá bài đã bị bỏ qua (khóa lại)
    drawnCard?: AncientTarotDrawnCard; // Lá bài cổ xưa được bốc theo thể thức Định Mệnh Chọn Lá
    isDrawn?: boolean; // Đã rút bài hay chưa
    // Tarot Wheel of Destiny
    isWheelSpinning?: boolean;
    wheelPower?: number; // 0 - 100
    startAngle?: number; // starting degree of current spin
    targetAngle?: number; // degree of wheel rotation
    spinDurationMs?: number;
    selectedSegmentIndex?: number;
    landedIndex?: number;
    spinTimeoutSeconds?: number;
    isRevealPending?: boolean; // true after wheel stops, before user reveals
    isGambling?: boolean;
    isGamblingWaitingSpin?: boolean; // Đang ở màn hình Vòng quay chờ canh lực và bấm quay tiếp (Cánh Cổng Đánh Cược)
    gamblingSpinCount?: number;
    isShieldRespin?: boolean; // Khiên thần hấp thụ ô trừ -> được cộng thêm 1 lượt quay mới
    shieldTransformedCardKey?: AncientTarotCardKey; // Lá bài/ô trừ đã bị khiên hấp thụ và biến đổi thành ô cộng điểm
  };
  tarotGambleState?: {
    isGambling: boolean;
    triggerCardKey: AncientTarotCardKey; // THE_STAR or THE_MOON
    spinCount: number; // how many extra spins taken
  };
  peekUsesRemaining?: number;    // Số lượt sử dụng Mắt Thần còn lại (cho PUSH_YOUR_LUCK)
  nextCardPeek?: {
    icon: string;
    storyTitle: string;
    cleanTitle?: string;
    isBomb: boolean;
    deltaPoints?: number;
    effectType?: MysteryTileEffectType;
    type?: MysteryTileType;
    pointBadge?: string;
    storyDescription?: string;
  };
}

export interface RoomState {
  id: string;
  code: string;
  name: string;
  mode: GameMode;
  teamMode: TeamMode;
  status: RoomStatus;
  currentQuestionIndex: number;
  totalQuestions: number;
  teams: TeamState[];
  players: PlayerState[];
  sharedCards: PowerupCard[];
  config: GameConfig;
  tournamentState?: TournamentState;
  magicWheelState?: MagicWheelState;
  gridCaroState?: GridCaroState;
  diceRaceState?: DiceRaceState;
  wagerState?: WagerState;
  mysteryQuestState?: MysteryQuestState;
}

export interface ActiveBoost {
  type: CardType;
  teamId?: string;
  targetTeamId?: string;
  appliedAt: number;
}

export interface QuestionState {
  question: Omit<Question, "answer" | "options"> & {
    options?: Omit<Option, "isCorrect">[];
    visibleOptionIds?: string[]; // after 50/50 applied
    pairs?: MatchPair[];
  };
  timeLimit: number;
  startedAt: number;
  buzzedBy?: string;
  activeBoosts: ActiveBoost[];
  bloomLevel?: BloomLevel;
  primaryTeamId?: string; // For BOUNCEBACK: team answering primarily
  primaryTeamName?: string;
  isStealPhase?: boolean; // For BOUNCEBACK: 5s steal buzz window active
  stealBuzzedTeamId?: string; // Team that buzzed to steal
  stealBuzzedTeamName?: string;
  stealAnsweringActive?: boolean; // When answer timer is counting down for steal team
  buzzAnsweringActive?: boolean; // In BUZZ mode: when answer timer is active for buzzed team
  buzzedTeamId?: string;
  buzzedTeamName?: string;
  answerMethod?: "DEVICE" | "MC";
  tournamentMatchId?: string;
  tournamentTeam1Id?: string;
  tournamentTeam2Id?: string;
  gridCellId?: number;
  diceRollValue?: number;
  wagerPhase?: "WAGER_PERIOD" | "QUESTION_PERIOD" | "REVEAL_PERIOD";
  timerPending?: boolean;
  timerStarted?: boolean;
  isExpired?: boolean;
  buzzUnlocked?: boolean;
  buzzUnlockMode?: "AUTO" | "MANUAL";
  buzzAutoDelaySeconds?: number;
  buzzMultiplier?: number;
  buzzAttemptNumber?: number;
  buzzMaxAttempts?: number;
  buzzWindowActive?: boolean;
  buzzWindowEndsAt?: number;
  buzzDisqualifiedTeamIds?: string[];
  canRollDice?: boolean;
  streakCount?: number;
  speedBonusPercent?: number;
  rarityBonusPercent?: number;
  bouncebackSelectPhase?: boolean;
  selectedPointLevel?: 10 | 20 | 30;
  bouncebackAwaitingJudgment?: "PRIMARY" | "STEAL" | null;
  bouncebackPrimaryAnswer?: string[];
  bouncebackStealAnswer?: string[];
  bouncebackAutoCorrect?: boolean;
  bouncebackAnswerText?: string;
  endsAt?: number;
  serverTime?: number;
  isGoldQuestion?: boolean; // CLASSIC mode: Double Points Question (x2 Base Points)
  answerSubmissionMode?: "SINGLE_SUBMIT" | "ALLOW_CHANGE";
  finalizedActors?: string[];
  totalParticipantsCount?: number;
  hasSharedPowerupUsed?: boolean; // Whether a shared powerup (TIME_PLUS, SKIP) was used in this question
}

// ─── Socket Events ────────────────────────────────────────────────────────────

export interface JoinResult {
  success: boolean;
  playerId?: string;
  teamId?: string;
  roomState?: RoomState;
  error?: string;
  requiresPasscode?: boolean;
}

export interface TeamRevealSummary {
  teamId: string;
  teamName: string;
  teamColor: string;
  totalOnlineMembers: number;
  correctMembers: number;
  pointsAwarded: number;
  speedBonus: number;
  multiplier: number;
  activeCard?: CardType;
  empiricalMultiplier?: number;
  basePoints?: number;
  speedPoints?: number;
  streakPoints?: number;
  rarityPoints?: number;
  streak?: number;
  avgTimeSpent?: number;
  isEliminated?: boolean;
  effectiveDifficulty?: number;
  discrimination?: number;
}

export interface AnswerRevealPayload {
  questionId: string;
  correctAnswer: string | string[];
  correctAnswerText?: string;
  explanation?: string;
  answers: Array<{
    teamId?: string;
    playerId?: string;
    name: string;
    answer: string | string[];
    isCorrect: boolean;
    pointsAwarded: number;
    timeSpent: number;
    basePoints?: number;
    speedPoints?: number;
    streakPoints?: number;
    rarityPoints?: number;
    streak?: number;
    effectiveDifficulty?: number;
    discrimination?: number;
  }>;
  teamSummaries?: TeamRevealSummary[];
  roomAccuracy?: number; // Tỷ lệ đúng toàn phòng (0 - 1)
  rarityBonusPercent?: number; // % thưởng độ khó & phân hóa thực nghiệm
  bloomLevel?: BloomLevel;
  effectiveDifficulty?: number;
  itemDiscrimination?: number;
}

export interface ScoreUpdate {
  teamId?: string;
  playerId?: string;
  score: number;
  delta: number;
}

export interface PowerupUsedPayload {
  cardId: string;
  type: CardType;
  usedByTeamId?: string;
  usedByName: string;
  targetTeamId?: string;
  targetTeamName?: string;
  effect: string;
}

export interface GameEndPayload {
  leaderboard: Array<{
    rank: number;
    teamId?: string;
    playerId?: string;
    name: string;
    score: number;
    correctAnswers: number;
    totalAnswers: number;
  }>;
}

export interface GameStartingPayload {
  seconds: number;
  total?: number;
  endsAt?: number;
  message?: string;
}

export interface GamePreparePayload {
  questionIndex: number;
  totalQuestions: number;
  points: number;
  timeLimit: number;
  seconds: number;
  total?: number;
  endsAt?: number;
  bloomLevel?: BloomLevel;
  primaryTeamName?: string;
}

export interface GameIntermissionPayload {
  nextQuestionIndex: number;
  totalQuestions: number;
  previousQuestionIndex?: number;
  titleVi?: string;
  countdownSeconds?: number;
}

export interface TieBreakerTeam {
  id: string;
  name: string;
  score: number;
  color?: string;
  avatar?: string;
}

export interface TieBreakerEnvelope {
  id: number;
  isChampion: boolean;
  isOpened: boolean;
  pickedByTeamId?: string;
  pickedByTeamName?: string;
}

export interface TieBreakerState {
  roomId: string;
  roomCode: string;
  tiedTeams: TieBreakerTeam[];
  questionIndex: number; // 0, 1, 2 (câu 1, 2, 3)
  maxQuestions: number; // 3
  questions?: any[];
  status: "INTRO" | "QUESTION_ACTIVE" | "BUZZER_LOCKED" | "ANSWER_REVEALED" | "LUCKY_DRAW" | "COMPLETED";
  currentQuestion?: {
    id: string;
    content: string;
    options: Array<{ id: string; text: string }>;
    correctOptionId?: string;
    explanation?: string;
    timeLimit: number;
    endsAt?: number;
  };
  buzzedTeamId?: string;
  buzzedTeamName?: string;
  buzzedPlayerName?: string;
  buzzedAt?: number;
  answeringTimeRemaining?: number;
  attemptedTeamIds: string[];
  luckyDraw?: {
    envelopes: TieBreakerEnvelope[];
    currentTurnTeamId?: string;
    currentTurnTeamName?: string;
    winnerTeamId?: string;
    winnerTeamName?: string;
  };
  championTeamId?: string;
  championTeamName?: string;
}

export interface ServerToClientEvents {
  "room:state": (state: RoomState) => void;
  "game:starting": (payload: GameStartingPayload) => void;
  "game:prepare": (payload: GamePreparePayload) => void;
  "game:prepare:clear": () => void;
  "game:intermission": (payload: GameIntermissionPayload | null) => void;
  "game:question": (question: QuestionState) => void;
  "game:timer": (payload: { remaining: number; total: number; endsAt?: number; serverTime?: number }) => void;
  "game:buzz": (payload: { playerId: string; playerName: string; teamId?: string; teamName?: string; attemptNumber?: number; multiplier?: number }) => void;
  "game:buzz:closed": () => void;
  "game:buzz:answering": (payload: { teamId: string; teamName: string; timeLimit: number; attemptNumber?: number; maxAttempts?: number; multiplier?: number }) => void;
  "game:buzz:wrong_attempt": (payload: { teamId: string; teamName: string; attemptNumber: number; maxAttempts?: number; remainingSeconds: number; canRetry: boolean; disqualifiedTeamIds?: string[] }) => void;
  "game:bounceback:open_steal": (payload: { questionId: string; timeLimit: number }) => void;
  "game:bounceback:steal_buzzed": (payload: { teamId: string; teamName: string; playerId: string; playerName: string; prepSeconds?: number }) => void;
  "game:bounceback:steal_answering": (payload: { teamId: string; teamName: string; timeLimit: number }) => void;
  "game:answer:reveal": (payload: AnswerRevealPayload) => void;
  "game:score:update": (scores: ScoreUpdate[]) => void;
  "game:powerup:used": (payload: PowerupUsedPayload) => void;
  "game:powerup:shared_locked": (payload: { cardType: CardType; usedByTeamId: string; usedByTeamName: string; questionIndex: number }) => void;
  "game:fifty_fifty:applied": (payload: { teamId: string; hiddenOptionIds: string[] }) => void;
  "game:ended": (payload: GameEndPayload) => void;
  "game:tie_breaker:state": (state: TieBreakerState | null) => void;
  "game:paused": () => void;
  "game:resumed": () => void;
  "player:joined": (player: PlayerState) => void;
  "player:left": (playerId: string) => void;
  "error": (message: string) => void;
  // New Mode Events
  "game:grid:update": (state: GridCaroState) => void;
  "game:grid:caro:celebrate": (payload: { teamId: string; teamName: string; bonusPoints: number }) => void;
  "game:dice:rolled": (payload: { teamId: string; teamName: string; roll: number; diceValues?: [number, number] }) => void;
  "game:dice:update": (state: DiceRaceState) => void;
  "game:wager:update": (state: WagerState) => void;
  "game:wager:bailout_granted": (payload: { teamId: string; teamName: string; newScore: number; bailoutsRemaining: number }) => void;
  "game:tournament:update": (state: TournamentState) => void;
  "game:question:clear": () => void;
  "game:timer:started": (payload?: { timeLimit?: number; endsAt?: number; serverTime?: number; questionId?: string }) => void;
  "game:timer:expired": (payload?: { questionId?: string }) => void;
  "game:buzz:unlocked": (payload?: { remainingSeconds?: number; attemptNumber?: number; maxAttempts?: number; multiplier?: number; endsAt?: number }) => void;
  "game:buzz:locked": () => void;
  "game:bounceback:points_selected": (payload: { teamId: string; points: 10 | 20 | 30; timeLimit?: number; endsAt?: number }) => void;
  "game:bounceback:awaiting_judgment": (payload: {
    phase: "PRIMARY" | "STEAL";
    targetTeamId: string;
    targetTeamName: string;
    answer?: string | string[];
    points: number;
    isAutoCorrect?: boolean;
    answerText?: string;
  }) => void;
  "game:answer:ack": (payload: { questionId: string; answer: string | string[]; isUpdate: boolean; success: boolean }) => void;
  "game:answer:received": (payload: { teamId?: string; playerId?: string; playerName: string; teamName?: string; questionId: string; answer?: string | string[]; isUpdate: boolean }) => void;
  "game:answer:applied": (payload: { teamId?: string; playerId?: string; questionId: string; answer: string | string[] }) => void;
  "game:elimination:round": (payload: {
    round?: number;
    cycleQuestions?: number;
    eliminatedTeamId: string;
    eliminatedTeamName: string;
    eliminatedTeams?: { id: string; name: string }[];
    survivingTeamsCount?: number;
    isGameOver?: boolean;
    reason?: string;
  }) => void;
  "game:answer:finalized": (payload: { questionId: string; actorId: string; actorName?: string; finalizedCount: number; totalParticipantsCount: number }) => void;
  "game:early_completed": (payload: { questionId: string; reason: "ALL_SUBMITTED" | "ALL_FINALIZED"; message: string }) => void;
  "tournament:cheer:broadcast": (payload: { matchId: string; targetTeamId: string; emoji: string; countA: number; countB: number; percentA: number; percentB: number }) => void;
  "tournament:oracle:update": (payload: { oracleScores: Record<string, number> }) => void;
  "elimination:revival": (payload: {
    round: number;
    revivedTeamId: string;
    revivedTeamName: string;
    revivedScore: number;
    eliminatedAtStage?: number;
    revivedTeams?: { id: string; name: string; score: number; eliminatedAtStage?: number }[];
  }) => void;
  "admin:question:data": (payload: {
    questionId: string;
    options: any;
    answer: string | string[] | null;
    type: string;
    explanation?: string;
  }) => void;
  // Mystery Quest Events
  "game:mystery:update": (state: MysteryQuestState) => void;
  "game:mystery:card_flipped": (payload: {
    tile: MysteryTile;
    potPoints: number;
    potMultiplier: number;
    isBomb?: boolean;
    bombExploded?: MysteryQuestState["bombExploded"];
    audioTrigger?: "CORRECT" | "WRONG" | "NONE";
  }) => void;
  "game:mystery:cashed_out": (payload: { teamId: string; teamName: string; totalGained: number; newScore: number }) => void;
  "game:mystery:steal_open": (payload: { questionId: string; timeLimit: number }) => void;
  "game:mystery:steal_buzzed": (payload: { teamId: string; teamName: string; timeLimit: number }) => void;
  "game:mystery:full_heart_sacrifice_prompt": (payload: {
    teamId: string;
    teamName: string;
    lostQuestionPoints: number;
    basePenaltyPoints: number;
    heartsToSacrifice: number;
    expiresAt: number;
  }) => void;
  // Magic Wheel Events
  "game:magic_wheel:update": (state: MagicWheelState) => void;
  "game:magic_wheel:spin_started": (payload: { teamId: string; teamName: string; power: number; targetDegrees: number; durationMs?: number }) => void;
  "game:magic_wheel:letter_guessed": (payload: { letter: string; found: boolean; count: number; teamId: string; teamName: string; pointsAwarded: number }) => void;
  "game:magic_wheel:puzzle_solved": (payload: { teamId: string; teamName: string; isCorrect: boolean; secretPhrase: string; roundWonPoints: number }) => void;
  "game:magic_wheel:mystery_result": (payload: { teamId: string; outcome: "PRIZE_CASH" | "BANKRUPT" | "SAFE_POINTS"; points: number }) => void;
  "game:magic_wheel:lucky_picked": (payload: { teamId: string; index: number; letter: string }) => void;
  "game:magic_wheel:no_more_consonants": (payload: { teamId?: string; teamName?: string }) => void;
}

export interface ClientToServerEvents {
  "admin:question:get_data": (payload?: { code?: string }) => void;
  "time:sync": (clientTime: number, callback: (result: { clientTime: number; serverTime: number }) => void) => void;
  "room:join": (payload: { code: string; playerName: string; playerId?: string; teamId?: string; passcode?: string }, callback: (result: JoinResult) => void) => void;
  "admin:room:toggle_lock": (payload: { code: string }) => void;
  "room:leave": () => void;
  "game:answer:submit": (payload: { questionId: string; answer: string | string[]; teamId?: string; playerId?: string; clientAnsweredAt?: number }) => void;
  "game:buzz": (payload?: { clientBuzzedAt?: number }) => void;
  "game:powerup:use": (payload: { cardId: string; targetTeamId?: string }) => void;
  "admin:next": (payload?: { code?: string }) => void;
  "admin:skip:prepare": (payload?: { code?: string }) => void;
  "admin:pause": (payload?: { code?: string }) => void;
  "admin:resume": (payload?: { code?: string }) => void;
  "admin:reveal": (payload?: { code?: string }) => void;
  "admin:score:manual": (payload: { answerId: string; points: number }) => void;
  "admin:shuffle:cards": () => void;
  "admin:lock:cards": (locked: boolean) => void;
  "admin:buzz:clear": () => void;
  "admin:buzz:start_answer": (payload?: { duration?: number }) => void;
  "admin:buzz:unlock": () => void;
  "admin:buzz:judge": (payload: { isCorrect: boolean; code?: string }) => void;
  "admin:bounceback:open_steal": () => void;
  "admin:bounceback:start_steal_answer": (payload?: { duration?: number }) => void;
  "admin:bounceback:select_points": (payload: { points: 10 | 20 | 30 }) => void;
  "admin:bounceback:judge": (payload: { isCorrect: boolean; code?: string }) => void;
  "game:bounceback:select_points": (payload: { points: 10 | 20 | 30 }) => void;
  "admin:sandbox:adjust_score": (payload: { teamId: string; delta?: number; setScore?: number; code?: string }) => void;
  "admin:submit:answer": (payload: { questionId: string; teamId?: string; playerId?: string; answer: string | string[]; code?: string }) => void;
  "admin:answer:override_verdict": (payload: { questionId: string; teamId?: string; playerId?: string; answerId?: string; isCorrect: boolean; code?: string }) => void;
  "admin:join": (code: string, callback?: (result: { success: boolean; roomState?: RoomState; error?: string }) => void) => void;
  "admin:kick:player": (payload: { playerId: string }, callback?: (result: { success: boolean; error?: string }) => void) => void;
  "admin:clean:offline": (callback?: (result: { success: boolean; count?: number; error?: string }) => void) => void;
  "player:select:team": (payload: { teamId: string; playerId?: string }, callback?: (result: { success: boolean; error?: string }) => void) => void;
  "display:join": (code: string) => void;
  // New Mode Client Events
  "game:grid:select": (payload: { cellId: number }) => void;
  "game:dice:roll": () => void;
  "game:wager:submit": (payload: { amount: number }) => void;
  "admin:grid:preview:start": () => void;
  "admin:grid:preview:stop": () => void;
  "admin:grid:select:manual": (payload: { cellId: number }) => void;
  "admin:grid:launch_question": () => void;
  "admin:question:start_timer": (payload?: { code?: string }) => void;
  "admin:grid:advance_now": () => void;
  "admin:dice:roll:manual": () => void;
  "admin:dice:advance_to_board": (payload?: { code?: string }) => void;
  "admin:tournament:advance": () => void;
  "tournament:predict": (payload: { matchId: string; predictedWinnerId: string }) => void;
  "tournament:cheer": (payload: { matchId: string; targetTeamId: string; emoji: string }) => void;
  // Magic Wheel Client Events
  "magic_wheel:spin": (payload: { power: number; teamId?: string }) => void;
  "magic_wheel:guess_letter": (payload: { letter: string; teamId?: string }) => void;
  "magic_wheel:solve_puzzle": (payload: { answer: string; teamId?: string }) => void;
  "magic_wheel:mystery_decide": (payload: { openMystery: boolean }) => void;
  "magic_wheel:lucky_pick": (payload: { index: number }) => void;
  "magic_wheel:reward_select": (payload: {
    cardIndex?: number;
    rewardType?: "POINTS" | "FREE_SPIN" | "JACKPOT_LETTER";
    points?: number;
    cardType?: "POINTS_1500" | "FREE_SPIN" | "SHIELD";
  }) => void;
  "magic_wheel:trade_decide": (payload: { trade: boolean; boxIndex?: number }) => void;
  "magic_wheel:use_free_spin": (payload: { use: boolean; teamId?: string }) => void;
  "magic_wheel:express_decide": (payload: { rideExpress: boolean }) => void;
  "magic_wheel:steal_swap_decide": (payload: { action: "STEAL_50" | "SWAP_LEADER"; targetTeamId?: string }) => void;
  "magic_wheel:toss_up_start": () => void;
  "magic_wheel:toss_up_buzz": (payload?: { teamId?: string }) => void;
  "magic_wheel:toss_up_reveal_tick": (payload?: { index?: number }) => void;
  "magic_wheel:toss_up_skip": () => void;
  "magic_wheel:special_choose_order": (payload: { order: "SPIN_FIRST" | "SOLVE_FIRST" }) => void;
  "magic_wheel:special_pick_letters": (payload: { letters: string[] }) => void;
  "magic_wheel:reveal_all": () => void;
  "magic_wheel:next_round": () => void;
  "magic_wheel:advance_round": () => void;
  "magic_wheel:set_mode": (payload: { mode: MagicWheelOperationMode }) => void;
  "magic_wheel:set_operation_mode": (payload: { mode: MagicWheelOperationMode }) => void;
  "magic_wheel:set_edition": (payload: { edition: "VIETNAMESE" | "ENGLISH"; force?: boolean }) => void;
  "magic_wheel:set_english_preset": (payload: { preset: "RANDOM_MIX" | "SET_1" | "SET_2" | "SET_3" }) => void;
  "magic_wheel:set_blackout_guessed": (payload: { enabled: boolean }) => void;
  "magic_wheel:buy_vowel": (payload: { vowel: string; teamId?: string }) => void;
  "magic_wheel:judge_solve": (payload: { isCorrect?: boolean; correct?: boolean }) => void;
  "magic_wheel:open_board": () => void;
  "magic_wheel:pass_turn": () => void;
  "magic_wheel:quick_reveal": () => void;
  "magic_wheel:override_turn": (payload: { teamId: string }) => void;
  "magic_wheel:set_temporary_text": (payload: { text: string }) => void;
  "magic_wheel:clear_temporary_text": () => void;
  "admin:magic_wheel:set_edition": (payload: { edition: "VIETNAMESE" | "ENGLISH"; force?: boolean }) => void;
  "admin:magic_wheel:set_english_preset": (payload: { preset: "RANDOM_MIX" | "SET_1" | "SET_2" | "SET_3" }) => void;
  "admin:magic_wheel:set_blackout_guessed": (payload: { enabled: boolean }) => void;
  "admin:magic_wheel:buy_vowel": (payload: { vowel: string }) => void;
  "admin:magic_wheel:open_board": () => void;
  "admin:magic_wheel:next_round": () => void;
  "admin:magic_wheel:advance_round": () => void;
  "admin:magic_wheel:spin": (payload?: { power?: number }) => void;
  "admin:magic_wheel:guess_letter": (payload: { letter: string }) => void;
  "admin:magic_wheel:solve_puzzle": (payload: { answer: string }) => void;
  "admin:magic_wheel:use_free_spin": (payload: { use: boolean }) => void;
  "admin:magic_wheel:judge_solve": (payload: { isCorrect: boolean }) => void;
  "admin:magic_wheel:set_mode": (payload: { mode: MagicWheelOperationMode }) => void;
  "admin:magic_wheel:emergency_change_bank": (payload: { quizBankId: string; localBank?: any }) => void;
  "admin:room:change_quiz_bank": (payload: { quizBankId: string | null; localBank?: any }) => void;
  "admin:magic_wheel:override_turn": (payload: { teamId: string }) => void;
  "admin:magic_wheel:pass_turn": () => void;
  "admin:magic_wheel:quick_reveal_letter": () => void;
  "admin:magic_wheel:reveal_all": () => void;
  "admin:magic_wheel:toss_up_skip": () => void;
  "admin:magic_wheel:set_temporary_text": (payload: { text: string }) => void;
  "admin:magic_wheel:clear_temporary_text": () => void;
  "admin:magic_wheel:set_display_layout": (payload: { layout: "AUTO" | "STACKED" | "FOCUS_WHEEL" | "FOCUS_BOARD" }) => void;
  "admin:wager:skip_timer": () => void;
  "admin:wager:launch_question": () => void;
  "admin:wager:grant_bailout": (payload: { teamId: string }) => void;
  "admin:wager:set_bailout_limit": (payload: { limit: number }) => void;
  "admin:timer:set": (payload: { seconds: number; code?: string }) => void;
  "admin:timer:stop_early": (payload?: { code?: string }) => void;
  "game:answer:stop_early": (payload: { questionId: string; answer?: string | string[] }) => void;
  "game:answer:finalize": (payload: { questionId: string; answer?: string | string[]; teamId?: string }) => void;
  "admin:sandbox:grant:card": (payload: { teamId: string; cardType: CardType }) => void;
  "admin:sandbox:set_active_team": (payload: { teamId: string; teamIndex?: number; code?: string }) => void;
  "admin:teams:set_initial_scores": (payload: { defaultScore?: number; teamScores?: Record<string, number>; code?: string }, callback?: (result: { success: boolean; error?: string }) => void) => void;
  "admin:team:update_score": (payload: { teamId: string; score: number; code?: string }, callback?: (result: { success: boolean; error?: string }) => void) => void;
  "admin:room:update_config": (payload: { key: string; value: any; code?: string }) => void;
  // Mystery Quest Client Events
  "game:mystery:choose_action": (payload: { action: "TAKE_BASE_POINTS" | "PLAY_MINIGAME" }) => void;
  "admin:mystery:choose_action": (payload: { action: "TAKE_BASE_POINTS" | "PLAY_MINIGAME"; code?: string }) => void;
  "game:mystery:flip_card": (payload: { tileId: number }) => void;
  "game:mystery:cash_out": () => void;
  "game:mystery:steal_buzz": () => void;
  "admin:mystery:flip_card": (payload: { tileId: number; code?: string }) => void;
  "admin:mystery:cash_out": (payload?: { code?: string }) => void;
  "admin:mystery:steal_buzz": (payload?: { targetTeamId?: string; code?: string }) => void;
  "admin:mystery:advance_turn": (payload?: { code?: string }) => void;
  "admin:mystery:set_minigame_type": (payload: { miniGameType: MysteryMiniGameType; code?: string }) => void;
  "game:mystery:pairs_decision": (payload: { choice: "CASH_OUT" | "PLAY_ROUND_2" }) => void;
  "admin:mystery:pairs_decision": (payload: { choice: "CASH_OUT" | "PLAY_ROUND_2"; code?: string }) => void;
  "game:mystery:doors_decision": (payload: { decision: "SAFE_EXIT" | "RISK_OPEN" | "SWAP_DOOR" | "TAKE_BASE_MINUS_HEART" | "TAKE_100_BASE" | "PROCEED_TO_SELECT_2"; chosenDoorId?: number; swapRemovedDoorId?: number; swapAddedDoorId?: number }) => void;
  "admin:mystery:doors_decision": (payload: { decision: "SAFE_EXIT" | "RISK_OPEN" | "SWAP_DOOR" | "TAKE_BASE_MINUS_HEART" | "TAKE_100_BASE" | "PROCEED_TO_SELECT_2"; chosenDoorId?: number; swapRemovedDoorId?: number; swapAddedDoorId?: number; code?: string }) => void;
  "game:mystery:draw_tarot": () => void;
  "admin:mystery:draw_tarot": (payload?: { code?: string }) => void;
  "game:mystery:spin_tarot_wheel": (payload: { powerPercent: number }) => void;
  "admin:mystery:spin_tarot_wheel": (payload?: { powerPercent?: number; code?: string }) => void;
  "game:mystery:tarot_redraw": () => void;
  "admin:mystery:tarot_redraw": (payload?: { code?: string }) => void;
  "game:mystery:tarot_keep": () => void;
  "admin:mystery:tarot_keep": (payload?: { code?: string }) => void;
  "game:mystery:choose_steal_target": (payload: { targetTeamId: string }) => void;
  "admin:mystery:choose_steal_target": (payload: { targetTeamId: string; code?: string }) => void;
  "game:mystery:use_peek": () => void;
  "admin:mystery:use_peek": (payload?: { code?: string }) => void;
  "game:mystery:tarot_prophecy_decision": (payload: { choice: "KEEP" | "DISCARD" }) => void;
  "admin:mystery:tarot_prophecy_decision": (payload: { choice: "KEEP" | "DISCARD"; code?: string }) => void;
  "admin:mystery:flip_manual": (payload: { tileId: number }) => void;
  "admin:mystery:cash_out_manual": () => void;
  "game:mystery:survival_choice": (payload: { choice: "SACRIFICE_HEART" | "RISK_SURVIVAL" }) => void;
  "admin:mystery:survival_choice": (payload: { choice: "SACRIFICE_HEART" | "RISK_SURVIVAL"; code?: string }) => void;
  "ancient-tarot-reveal": (payload?: { code?: string }) => void;
  "game:mystery:ancient_tarot_reveal": (payload?: { code?: string }) => void;
  "admin:mystery:ancient_tarot_reveal": (payload?: { code?: string }) => void;
  "ancient-tarot-respin": (payload?: { code?: string }) => void;
  "game:mystery:ancient_tarot_respin": (payload?: { code?: string }) => void;
  "admin:mystery:ancient_tarot_respin": (payload?: { code?: string }) => void;
  "ancient-tarot-gamble-prepare": (payload?: { code?: string }) => void;
  "game:mystery:ancient_tarot_gamble_prepare": (payload?: { code?: string }) => void;
  "admin:mystery:ancient_tarot_gamble_prepare": (payload?: { code?: string }) => void;
  "ancient-tarot-gamble-decision": (payload: { spinAgain: boolean; powerPercent?: number; code?: string }) => void;
  "game:mystery:ancient_tarot_gamble_decision": (payload: { spinAgain: boolean; powerPercent?: number; code?: string }) => void;
  "admin:mystery:ancient_tarot_gamble_decision": (payload: { spinAgain: boolean; powerPercent?: number; code?: string }) => void;
  "game:mystery:full_heart_sacrifice_decision": (payload: { acceptSacrifice: boolean }) => void;
  "admin:mystery:full_heart_sacrifice_decision": (payload: { acceptSacrifice: boolean; code?: string }) => void;
  // Tie-Breaker Client Events
  "tie_breaker:buzz": (payload?: { clientBuzzedAt?: number }) => void;
  "tie_breaker:answer": (payload: { optionId: string }) => void;
  "tie_breaker:lucky_pick": (payload: { envelopeId: number }) => void;
  "admin:tie_breaker:advance": (payload?: { code?: string; action?: "NEXT_QUESTION" | "START_LUCKY_DRAW" | "FORCE_CHAMPION"; winnerTeamId?: string }) => void;
}

export type NextApiResponseWithSocket = NextApiResponse & {
  socket: Socket & {
    server: NetServer & {
      io?: SocketIOServer<ClientToServerEvents, ServerToClientEvents>;
    };
  };
};
