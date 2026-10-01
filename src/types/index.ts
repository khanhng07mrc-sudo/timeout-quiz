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
    taglineVi: "Đua điểm đồng đội tiêu chuẩn",
    summaryVi: "Chế độ thi đấu trắc nghiệm kinh điển. Tất cả các đội cùng trả lời đồng thời từng câu hỏi trong thời gian quy định.",
    mechanicsVi: [
      "Mỗi câu hỏi có giới hạn thời gian (thường 20-30 giây).",
      "Các thành viên trong cùng một đội cùng thảo luận và nộp đáp án trên thiết bị cá nhân hoặc đọc qua MC.",
      "Tất cả đội trả lời đúng đều nhận được điểm số của câu hỏi.",
    ],
    scoringVi: [
      "Điểm cơ bản: Từ 10 đến 30 điểm tuỳ theo cấp độ nhận thức Bloom.",
      "Thưởng tốc độ: Trả lời càng nhanh càng nhận thêm tối đa 50% điểm thưởng thời gian.",
      "Thẻ nhân đôi (x2) và Thẻ hỗ trợ có hiệu lực trực tiếp.",
    ],
    tipsVi: [
      "Nhanh tay nộp đáp án để tối đa hóa điểm tốc độ!",
      "Hãy phối hợp chặt chẽ với đồng đội để tránh trả lời sai.",
    ],
  },
  BUZZ: {
    mode: "BUZZ",
    nameVi: "Chuông bấm (Buzz)",
    emoji: "🔔",
    taglineVi: "Tranh quyền trả lời duy nhất",
    summaryVi: "Chế độ chuông bấm cực kỳ kịch tính. Sau khi câu hỏi hiển thị, đội nào nhấn chuông trước sẽ giành quyền trả lời độc quyền.",
    mechanicsVi: [
      "Sau khi câu hỏi xuất hiện, nút bấm chuông sẽ kích hoạt cho tất cả các đội.",
      "Đội bấm chuông nhanh nhất (tính bằng mili-giây) sẽ được cấp 15 giây độc quyền để chọn đáp án.",
      "Các đội bấm chậm hơn sẽ chuyển sang chế độ quan sát lượt của đối thủ.",
    ],
    scoringVi: [
      "Nếu đội chuông trả lời ĐÚNG: Nhận trọn vẹn 100% điểm câu hỏi.",
      "Nếu đội chuông trả lời SAI: Bị trừ điểm phạt tương ứng (nếu phòng bật phạt điểm).",
    ],
    tipsVi: [
      "Đọc lướt nhanh từ khóa câu hỏi để bấm chuông dứt khoát!",
      "Cẩn trọng vì bấm nhanh mà trả lời sai sẽ bị mất điểm quý giá.",
    ],
  },
  BOUNCEBACK: {
    mode: "BOUNCEBACK",
    nameVi: "Bật nảy & Cướp lượt (Bounceback)",
    emoji: "🎯",
    taglineVi: "Lượt chính luân phiên & Chuông cướp lượt",
    summaryVi: "Mỗi câu hỏi chỉ định 1 đội trả lời chính. Nếu đội chính thất bại, chuông cướp lượt mở ra cho các đội còn lại phục kích.",
    mechanicsVi: [
      "Vòng 1 (Lượt chính): Đội được chỉ định có toàn bộ thời gian quy định để đưa ra đáp án.",
      "Nếu đội chính đúng: Ghi điểm và câu hỏi kết thúc.",
      "Vòng 2 (Cướp lượt): Nếu đội chính trả lời SAI hoặc hết giờ, hệ thống mở chuông cướp lượt trong 5 giây cho các đội khác.",
      "Đội bấm chuông nhanh nhất sẽ có 15 giây để lật ngược thế cờ.",
    ],
    scoringVi: [
      "Đội chính trả lời đúng: +100% điểm câu hỏi.",
      "Đội cướp lượt trả lời đúng: +100% điểm thưởng.",
      "Đội cướp lượt trả lời sai: Bị trừ 50% điểm câu hỏi.",
    ],
    tipsVi: [
      "Tập trung cao độ ngay cả khi không phải lượt của mình để sẵn sàng bấm chuông cướp lượt!",
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
    emoji: "❌",
    taglineVi: "Loại dần đội điểm thấp nhất",
    summaryVi: "Đấu trường khắc nghiệt mô phỏng Battle Royale. Sau mỗi đợt câu hỏi cố định, đội xếp cuối bảng điểm sẽ lập tức bị loại.",
    mechanicsVi: [
      "Cứ sau mỗi chu kỳ (mặc định 3 câu hỏi), hệ thống sẽ tổng kết bảng điểm.",
      "Đội có điểm số thấp nhất sẽ nhận thông báo 'BỊ LOẠI' và chuyển thành khán giả.",
      "Trận đấu tiếp diễn cho đến khi tìm ra đội sống sót duy nhất.",
    ],
    scoringVi: [
      "Tính điểm theo công thức sâu (Bloom + độ hiếm câu hỏi + độ đồng thuận nhóm).",
      "Sai không bị trừ điểm trực tiếp nhưng tụt hạng sẽ dẫn đến việc bị loại.",
    ],
    tipsVi: [
      "Mỗi câu hỏi đều sống còn! Duy trì vị trí an toàn ở nửa trên bảng xếp hạng.",
    ],
  },
  TOURNAMENT: {
    mode: "TOURNAMENT",
    nameVi: "Đấu loại trực tiếp 1v1 (Tournament)",
    emoji: "🏆",
    taglineVi: "Phân nhánh Tứ kết, Bán kết, Chung kết",
    summaryVi: "Giải đấu cây nhánh đối kháng trực tiếp 1v1. Hai đội chạm trán nhau trong một số câu hỏi nhất định, đội thắng giành vé vào vòng trong.",
    mechanicsVi: [
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
    taglineVi: "Lưới 1-X ô, điểm cố định theo ô, chọn thủ công & Caro liên tiếp",
    summaryVi: "Bàn cờ ma trận R × C ô số (#1 - #X) gắn cứng mức điểm và độ khó. Quản trò (Admin) chọn ô thủ công theo lượt các đội, giải mã câu hỏi để đánh dấu chiếm lĩnh ô màu đội mình.",
    mechanicsVi: [
      "Chọn ô thủ công: Quản trò chọn ô từ bảng điều khiển theo yêu cầu của đội tới lượt, tránh xung đột hệ thống.",
      "Điểm số & độ khó gắn cứng: Mỗi ô từ #1 đến #X được hiển thị rõ ràng số thứ tự, mức điểm và huy hiệu độ khó tương ứng.",
      "Ô chưa ăn vẫn mở: Nếu đội trả lời SAI, ô đó vẫn mở (chưa ai chiếm). Lượt sau các đội khác vẫn có thể chọn lại ô đó, hệ thống sẽ bốc một câu hỏi MỚI có cùng độ khó/mức điểm gắn với ô đó.",
      "Giới hạn số vòng chơi: Trận đấu diễn ra trong số vòng quy định (mặc định 3 vòng), các đội không nhất thiết phải lật hết sạch mọi ô.",
      "Tính năng Caro (Tic-Tac-Toe): Kích hoạt khi lưới từ 4×4 trở lên. Đội đầu tiên xếp được K ô liên tiếp (ngang, dọc, chéo) nhận thưởng Caro Bonus.",
    ],
    scoringVi: [
      "Điểm ô: Trả lời đúng nhận trọn điểm số gắn với ô đã chọn (10đ - 30đ).",
      "Trả lời sai: Không bị trừ điểm, ô giữ nguyên trạng thái mở cho lượt sau.",
      "Thưởng Caro Bonus: Trung bình cộng điểm số các ô tạo thành chuỗi liên tiếp.",
    ],
    tipsVi: [
      "Nếu một ô điểm cao bị trả lời sai, hãy nhanh chóng chọn lại ô đó ở lượt sau để gặt hái điểm số!",
      "Tính toán số vòng giới hạn để tối ưu hóa việc chọn ô điểm cao hoặc tạo chuỗi Caro.",
    ],
  },
  DICE_RACE: {
    mode: "DICE_RACE",
    nameVi: "Đua cờ Xí ngầu (Dice Race)",
    emoji: "🎲",
    taglineVi: "Đường đua 30-50 ô, đổ xí ngầu & sự kiện",
    summaryVi: "Đua cờ tỷ phú kết hợp trả lời câu hỏi. Tung xí ngầu 1-6 nút và trả lời đúng để quân cờ linh vật tiến bước vượt chướng ngại vật về đích.",
    mechanicsVi: [
      "Lượt tung xúc xắc: Đội đến lượt bấm đổ xúc xắc 3D ngẫu nhiên từ 1 đến 6 nút.",
      "Giải câu đố: Đội phải trả lời câu hỏi tương ứng với lượt tung.",
      "Tiến bước: Trả lời đúng, quân cờ tiến số bước bằng đúng số nút xúc xắc. Trả lời sai, quân cờ đứng yên tại chỗ.",
      "Ô sự kiện: Dừng chân tại các ô đặc biệt sẽ kích hoạt: Tăng tốc (+2 bước), Bẫy (-2 bước), Ngọc thưởng (+150đ), Hoán đổi vị trí với đội dẫn đầu, hoặc Về đích!",
    ],
    scoringVi: [
      "Điểm thưởng ngọc: +150đ khi dẫm trúng ô Gem.",
      "Thưởng về đích: Đội cán đích Top 1 (+300đ), Top 2 (+200đ), Top 3 (+100đ).",
    ],
    tipsVi: [
      "Đổ xí ngầu may mắn kết hợp trả lời chuẩn xác sẽ giúp bạn bay thẳng về đích!",
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
      "Đội cược cuối cùng: Đúng = Nhận đúng số điểm cược; Sai = Bị trừ đúng số điểm cược.",
      "Các đội còn lại: Đúng = Nhận 1/2 điểm câu hỏi (làm tròn lên số chia hết cho 5 gần nhất); Sai = Không mất điểm (0đ).",
      "Trợ cấp: Hồi sinh về mức điểm bằng đội thấp nhất còn dương điểm (> 0).",
    ],
    tipsVi: [
      "Đội cược cuối gánh rủi ro cao nhất nên hãy cân nhắc kỹ giữa việc giành trọn điểm cược hay giữ an toàn hưởng 1/2 điểm câu hỏi!",
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
  if (points >= 20) return "ANALYZE";
  if (points >= 15) return "APPLY";
  return "REMEMBER";
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
}

export interface PlayerState {
  id: string;
  name: string;
  avatar?: string;
  score: number;
  teamId?: string;
  isHost: boolean;
  isOnline: boolean;
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
}

export interface TournamentState {
  matches: TournamentMatch[];
  currentMatchId?: string;
  questionsPerMatch: number;
  championTeamId?: string;
  championTeamName?: string;
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

export type DiceTileType = "NORMAL" | "BOOST" | "TRAP" | "GEM" | "SWAP" | "FINISH";

export interface DiceTile {
  index: number;
  type: DiceTileType;
  label: string;
  effectValue?: number;
}

export interface TeamRaceProgress {
  teamId: string;
  teamName: string;
  teamColor: string;
  avatar?: string;
  position: number;
  hasFinished: boolean;
  finishRank?: number;
}

export interface DiceRaceState {
  totalTiles: number;
  tiles: DiceTile[];
  teamPositions: Record<string, TeamRaceProgress>;
  currentTurnTeamId?: string;
  currentTurnTeamName?: string;
  lastDiceRoll?: number;
  isRolling: boolean;
  dicePendingAnswer: boolean;
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
}

export interface WagerState {
  phase: "WAGER_PERIOD" | "QUESTION_PERIOD" | "REVEAL_PERIOD";
  wagerSubPhase?: "INITIAL_5S" | "MAIN_15S";
  autoAssignedTeamName?: string;
  questionReady?: boolean;
  wagerTimeRemaining: number;
  wagerTimeTotal: number;
  minWager: number;
  currentHighestWager: number;
  lastWagerTeamId?: string;
  wagerHistory: WagerHistoryItem[];
  allowanceMinScore: number;
  initialPoints?: number;
  topicPreview?: string;
  difficultyPreview?: string;
  teamWagers: Record<string, TeamWager>;
  teamBailouts?: Record<string, { remaining: number; max: number }>;
  bailoutQueue?: WagerBailoutQueueItem[];
  currentQuestionBailoutUsed?: boolean;
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
  gridCellId?: number;
  diceRollValue?: number;
  wagerPhase?: "WAGER_PERIOD" | "QUESTION_PERIOD" | "REVEAL_PERIOD";
  timerPending?: boolean;
  timerStarted?: boolean;
  isExpired?: boolean;
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
}

export interface AnswerRevealPayload {
  questionId: string;
  correctAnswer: string | string[];
  answers: Array<{
    teamId?: string;
    playerId?: string;
    name: string;
    answer: string | string[];
    isCorrect: boolean;
    pointsAwarded: number;
    timeSpent: number;
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

export interface ServerToClientEvents {
  "room:state": (state: RoomState) => void;
  "game:starting": (payload: GameStartingPayload) => void;
  "game:prepare": (payload: GamePreparePayload) => void;
  "game:question": (question: QuestionState) => void;
  "game:timer": (payload: { remaining: number; total: number }) => void;
  "game:buzz": (payload: { playerId: string; playerName: string; teamId?: string; teamName?: string }) => void;
  "game:buzz:closed": () => void;
  "game:buzz:answering": (payload: { teamId: string; teamName: string; timeLimit: number }) => void;
  "game:bounceback:open_steal": (payload: { questionId: string; timeLimit: number }) => void;
  "game:bounceback:steal_buzzed": (payload: { teamId: string; teamName: string; playerId: string; playerName: string }) => void;
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
  "game:timer:started": (payload?: { timeLimit?: number }) => void;
  "game:timer:expired": (payload?: { questionId?: string }) => void;
}

export interface ClientToServerEvents {
  "room:join": (payload: { code: string; playerName: string; playerId?: string; teamId?: string }, callback: (result: JoinResult) => void) => void;
  "room:leave": () => void;
  "game:answer:submit": (payload: { questionId: string; answer: string | string[] }) => void;
  "game:buzz": () => void;
  "game:powerup:use": (payload: { cardId: string; targetTeamId?: string }) => void;
  "admin:next": () => void;
  "admin:skip:prepare": () => void;
  "admin:pause": () => void;
  "admin:resume": () => void;
  "admin:reveal": () => void;
  "admin:score:manual": (payload: { answerId: string; points: number }) => void;
  "admin:shuffle:cards": () => void;
  "admin:lock:cards": (locked: boolean) => void;
  "admin:buzz:clear": () => void;
  "admin:buzz:start_answer": () => void;
  "admin:bounceback:open_steal": () => void;
  "admin:bounceback:start_steal_answer": () => void;
  "admin:submit:answer": (payload: { questionId: string; teamId?: string; playerId?: string; answer: string | string[] }) => void;
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
  "admin:question:start_timer": () => void;
  "admin:grid:advance_now": () => void;
  "admin:dice:roll:manual": () => void;
  "admin:tournament:advance": () => void;
  "admin:wager:skip_timer": () => void;
  "admin:wager:launch_question": () => void;
  "admin:wager:grant_bailout": (payload: { teamId: string }) => void;
  "admin:timer:set": (payload: { seconds: number }) => void;
  "admin:sandbox:grant:card": (payload: { teamId: string; cardType: CardType }) => void;
}

export type NextApiResponseWithSocket = NextApiResponse & {
  socket: Socket & {
    server: NetServer & {
      io?: SocketIOServer<ClientToServerEvents, ServerToClientEvents>;
    };
  };
};
