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
  | "DRAG_DROP";

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
  | "POWERUP"
  | "ELIMINATION"
  | "TOURNAMENT"
  | "GRID_CARO"
  | "DICE_RACE"
  | "WAGER";
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
  POWERUP: {
    mode: "POWERUP",
    nameVi: "Thẻ Hỗ Trợ (Power-up)",
    emoji: "🃏",
    taglineVi: "Chiến thuật thẻ bài biến hóa",
    summaryVi: "Chế độ kết hợp các thẻ quyền năng đặc biệt: Phong tỏa, Đổi câu, Cướp điểm, Nhân đôi, Tái sinh...",
    mechanicsVi: [
      "Mỗi đội được phát các thẻ hỗ trợ ngẫu nhiên khi vào trận.",
      "Sử dụng thẻ chiến thuật đúng thời điểm để gia tăng lợi thế hoặc kìm chân đối thủ.",
    ],
    scoringVi: [
      "Điểm số kết hợp với hiệu ứng các thẻ bài nhân đôi hoặc trừ phạt.",
    ],
    tipsVi: [
      "Giữ thẻ Tái sinh cho các câu hỏi khó để tránh bị mất điểm!",
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
    nameVi: "Đấu loại trực tiếp 1v1 (Tournament)",
    emoji: "🏆",
    taglineVi: "3 mức điểm 10/20/30 & Nhánh Tứ kết - Bán kết - Chung kết",
    summaryVi: "Giải đấu cây nhánh đối kháng trực tiếp 1v1 với 3 mức điểm 10, 20, 30 điểm phân bổ đều 33%. Hai đội chạm trán nhau trong một số câu hỏi nhất định, đội thắng giành vé vào vòng trong.",
    mechanicsVi: [
      "3 mức điểm cố định: 10, 20, 30 điểm phân bổ đều mỗi mức 33%.",
      "Hệ thống tự động xếp nhánh thi đấu (Tứ kết, Bán kết, Chung kết).",
      "Mỗi trận đấu gồm M câu hỏi (mặc định 3 câu). Chỉ 2 đội trong cặp đấu mới có quyền trả lời và ghi điểm trận.",
      "Các đội chưa đến lượt sẽ theo dõi diễn biến trận đấu trực tiếp trên màn hình.",
      "Đội ghi nhiều điểm hơn sau M câu sẽ bước tiếp vào vòng sau; đội thua bị loại.",
    ],
    scoringVi: [
      "Điểm số trong trận quyết định người chiến thắng của cặp đấu.",
      "Đội chiến thắng trận Chung kết sẽ đăng quang Ngôi Vô Địch 👑.",
    ],
    tipsVi: [
      "Nắm chắc điểm từng câu trong cặp đấu 1v1 vì khoảng cách chỉ 1 câu đúng có thể định đoạt số phận trận đấu!",
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
    taglineVi: "Đua linh vật theo vị trí ô, Khiên bảo vệ & x2 Cơ hội",
    summaryVi: "Chế độ đua cờ linh vật đặc thù xếp hạng thuần tuý theo vị trí đứng trên đường đua hoặc thứ tự cán đích (không dùng điểm số độc lập). Bao gồm ô Khiên bảo vệ và ô x2 Cơ hội gieo thêm lượt.",
    mechanicsVi: [
      "Xếp hạng theo vị trí: Bảng xếp hạng căn cứ theo số thứ tự ô đang đứng (#X) hoặc thứ tự cán đích đầu tiên.",
      "Đổ xí ngầu & Trả lời: Đội đến lượt đổ xí ngầu 1-6 nút. Trả lời ĐÚNG để quân cờ tiến bước; trả lời SAI quân cờ đứng yên.",
      "🛡️ Khiên bảo vệ (Shield): Dừng ở ô Khiên nhận được khiên bảo vệ, giúp vô hiệu hoá bẫy lùi bước hoặc chặn bị đối thủ hoán đổi vị trí.",
      "🎲x2 Cơ hội (Extra Roll): Dừng ở ô x2 Cơ hội được quyền gieo xí ngầu thêm lần thứ 2 trước khi chuyển lượt (hai ô x2 liên tiếp luôn cách nhau ít nhất 7 ô).",
      "🚀 Tăng tốc (+2 bước), 💥 Bẫy (-2 bước, trừ khi có khiên), 🔀 Đổi chỗ với đội dẫn đầu.",
      "Cán đích: Đội đầu tiên tiến tới ô cuối cùng sẽ chiến thắng trận đấu ngay lập tức!",
    ],
    scoringVi: [
      "Xếp hạng dựa trên thứ tự ô trên đường đua (#X / Tổng số ô).",
      "Đội về đích đầu tiên giành chiến thắng tuyệt đối 🏆.",
    ],
    tipsVi: [
      "Nhặt Khiên bảo vệ để an tâm vượt qua các ô Bẫy hiểm trở!",
      "Canh ô x2 Cơ hội để tạo đột phá 2 lần tung xí ngầu liên tiếp.",
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
    tag: "Chiến thuật",
    color: "#8b5cf6",
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
    tag: "Thời gian",
    color: "#ec4899",
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
 * Quy chuẩn thời gian đếm ngược chính xác theo 3 mức điểm chuẩn của Timeout Quiz:
 * - 10 điểm (Nhận biết) -> 15 giây (olympia_15s.mp3)
 * - 20 điểm (Thông hiểu / Vận dụng) -> 20 giây (olympia_20s.ogg)
 * - 30 điểm (Vận dụng cao) -> 30 giây (olympia_30s.mp3)
 */
export function quantizeOlympiaTimeLimit(points: number = 10, _explicitTimeLimit?: number): number {
  if (points <= 10) return 15;
  if (points <= 20) return 20;
  return 30;
}

/**
 * Tính thời gian trả lời sau khi giành chuông (hoặc cướp chuông):
 * - Trắc nghiệm 1 đáp án (MC_SINGLE, TRUE_FALSE): 5s/câu.
 * - Trắc nghiệm nhiều đáp án (MC_MULTI) và tự luận (FILL_BLANK, ESSAY):
 *   + Dễ (points <= 10 hoặc REMEMBER): 10s.
 *   + Trung bình (points 11-20 hoặc APPLY): 15s.
 *   + Khó (points > 20 hoặc ANALYZE): 20s.
 * - Nối cặp (MATCHING) và Kéo thả (DRAG_DROP):
 *   + Dễ: 15s.
 *   + Trung bình: 20s.
 *   + Khó: 25s.
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
  const isHigh = bloom === "ANALYZE" || effPoints >= 30;
  const isMedium = bloom === "APPLY" || effPoints >= 20;

  if (question.type === "MATCHING" || question.type === "DRAG_DROP") {
    if (isHigh) return 25;
    if (isMedium) return 20;
    return 15;
  }

  // MC_MULTI, FILL_BLANK, ESSAY
  if (isHigh) return 20;
  if (isMedium) return 15;
  return 10;
}

/**
 * Tính thời gian tiêu chuẩn cho câu hỏi trả lời trên thiết bị cá nhân hoặc hiển thị phòng:
 * Luôn khóa cứng theo quy chuẩn 3 mức điểm 10/20/30:
 * - 10 điểm -> 15 giây
 * - 20 điểm -> 20 giây
 * - 30 điểm -> 30 giây
 */
export function getStandardQuestionTimeLimit(
  question: { type?: QuestionType; points?: number; timeLimit?: number; bloomLevel?: BloomLevel },
  overridePoints?: number
): number {
  const effPoints = overridePoints !== undefined ? overridePoints : (question.points ?? 10);
  if (effPoints <= 10) return 15;
  if (effPoints <= 20) return 20;
  return 30;
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
  hint?: string;
  order: number;
  bloomLevel?: BloomLevel;
}

// ─── Game Config ──────────────────────────────────────────────────────────────

export interface GameConfig {
  powerupEnabled: boolean;
  powerupOwnerType: "SHARED" | "TEAM";
  powerupCountPerTeam: number;
  powerupCountShared: number;
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
  // Tournament config
  tournamentQuestionsPerMatch?: number;
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
  predictions?: Record<string, string>; // teamId -> predictedWinnerId
  cheers?: { countA: number; countB: number };
}

export interface TournamentState {
  matches: TournamentMatch[];
  currentMatchId?: string;
  questionsPerMatch: number;
  championTeamId?: string;
  championTeamName?: string;
  oracleScores?: Record<string, number>; // teamId -> prediction points (+10 each correct)
  cheers?: { countA: number; countB: number };
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
  gridCaroState?: GridCaroState;
  diceRaceState?: DiceRaceState;
  wagerState?: WagerState;
}

export interface ActiveBoost {
  type: CardType;
  teamId?: string;
  targetTeamId?: string;
  appliedAt: number;
}

export interface QuestionState {
  question: Omit<Question, "answer" | "pairs" | "options"> & {
    options?: Omit<Option, "isCorrect">[];
    visibleOptionIds?: string[]; // after 50/50 applied
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
}

// ─── Socket Events ────────────────────────────────────────────────────────────

export interface JoinResult {
  success: boolean;
  playerId?: string;
  teamId?: string;
  roomState?: RoomState;
  error?: string;
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
  }>;
  teamSummaries?: TeamRevealSummary[];
  roomAccuracy?: number; // Tỷ lệ đúng toàn phòng (0 - 1)
  rarityBonusPercent?: number; // % thưởng hiếm nếu tỷ lệ < 30%
  bloomLevel?: BloomLevel;
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
  message?: string;
}

export interface GamePreparePayload {
  questionIndex: number;
  totalQuestions: number;
  points: number;
  timeLimit: number;
  seconds: number;
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

export interface ServerToClientEvents {
  "room:state": (state: RoomState) => void;
  "game:starting": (payload: GameStartingPayload) => void;
  "game:prepare": (payload: GamePreparePayload) => void;
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
  "game:fifty_fifty:applied": (payload: { teamId: string; hiddenOptionIds: string[] }) => void;
  "game:ended": (payload: GameEndPayload) => void;
  "game:paused": () => void;
  "game:resumed": () => void;
  "player:joined": (player: PlayerState) => void;
  "player:left": (playerId: string) => void;
  "error": (message: string) => void;
  // New Mode Events
  "game:grid:update": (state: GridCaroState) => void;
  "game:grid:caro:celebrate": (payload: { teamId: string; teamName: string; bonusPoints: number }) => void;
  "game:dice:rolled": (payload: { teamId: string; teamName: string; roll: number }) => void;
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
}

export interface ClientToServerEvents {
  "time:sync": (clientTime: number, callback: (result: { clientTime: number; serverTime: number }) => void) => void;
  "room:join": (payload: { code: string; playerName: string; playerId?: string; teamId?: string }, callback: (result: JoinResult) => void) => void;
  "room:leave": () => void;
  "game:answer:submit": (payload: { questionId: string; answer: string | string[] }) => void;
  "game:buzz": () => void;
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
  "admin:sandbox:adjust_score": (payload: { teamId: string; delta?: number; setScore?: number }) => void;
  "admin:submit:answer": (payload: { questionId: string; teamId?: string; playerId?: string; answer: string | string[]; code?: string }) => void;
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
  "admin:wager:skip_timer": () => void;
  "admin:wager:launch_question": () => void;
  "admin:wager:grant_bailout": (payload: { teamId: string }) => void;
  "admin:wager:set_bailout_limit": (payload: { limit: number }) => void;
  "admin:timer:set": (payload: { seconds: number }) => void;
  "admin:timer:stop_early": (payload?: { code?: string }) => void;
  "game:answer:stop_early": (payload: { questionId: string; answer?: string | string[] }) => void;
  "game:answer:finalize": (payload: { questionId: string; answer?: string | string[] }) => void;
  "admin:sandbox:grant:card": (payload: { teamId: string; cardType: CardType }) => void;
  "admin:teams:set_initial_scores": (payload: { defaultScore?: number; teamScores?: Record<string, number>; code?: string }, callback?: (result: { success: boolean; error?: string }) => void) => void;
  "admin:team:update_score": (payload: { teamId: string; score: number; code?: string }, callback?: (result: { success: boolean; error?: string }) => void) => void;
  "admin:room:update_config": (payload: { key: string; value: any; code?: string }) => void;
}

export type NextApiResponseWithSocket = NextApiResponse & {
  socket: Socket & {
    server: NetServer & {
      io?: SocketIOServer<ClientToServerEvents, ServerToClientEvents>;
    };
  };
};
