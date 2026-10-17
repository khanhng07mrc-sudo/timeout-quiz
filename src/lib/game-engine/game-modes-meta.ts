export interface ModeRulesSummary {
  objective: string;
  mechanism: string;
  tip: string;
}

export const MODE_DISPLAY_NAMES: Record<string, string> = {
  CLASSIC: "Classic",
  BUZZ: "Fast Buzz",
  BOUNCEBACK: "Bounceback",
  ELIMINATION: "Survival",
  TOURNAMENT: "Tournament 1v1",
  MAGIC_WHEEL: "Magic Wheel",
  GRID_CARO: "Grid Caro",
  DICE_RACE: "Dice Race",
  WAGER: "Secret Wager",
  MYSTERY_QUEST: "Mystery Quest",
};

export const MODE_RULES_SUMMARY: Record<string, ModeRulesSummary> = {
  CLASSIC: {
    objective: "Trả lời đồng thời các câu hỏi và tích lũy tổng điểm cao nhất phòng thi.",
    mechanism: "Tất cả các đội cùng nhận câu hỏi và chọn đáp án; điểm số chấm theo độ khó Bloom và tỷ lệ phòng.",
    tip: "Sử dụng Thẻ Bổ Trợ đúng thời điểm (x2, Đổi câu) để bứt phá bảng xếp hạng.",
  },
  BUZZ: {
    objective: "Giành quyền ưu tiên trả lời nhanh nhất ngay khi mở chuông để độc chiếm điểm số.",
    mechanism: "Nhấn chuông cực nhanh; đội bấm trước được trả lời độc quyền, trả lời sai sẽ bị trừ điểm.",
    tip: "Chỉ bấm chuông khi nắm chắc câu trả lời để tránh mất điểm đáng tiếc.",
  },
  BOUNCEBACK: {
    objective: "Tận dụng sai lầm của đối thủ để cướp lượt và thu trọn điểm số quý giá.",
    mechanism: "Đội chính trả lời trước; nếu trả lời sai, chuông phụ 5 giây mở ra cho các đội khác bấm cướp lượt.",
    tip: "Luôn sẵn sàng tư thế bấm cướp chuông ngay khi đội bạn lưỡng lự hoặc trả lời sai.",
  },
  ELIMINATION: {
    objective: "Sinh tồn qua từng chặng đấu khốc liệt và trụ lại đến câu hỏi cuối cùng.",
    mechanism: "Sau mỗi mốc câu hỏi quy định, đội đứng cuối bảng điểm sẽ bị loại trực tiếp khỏi cuộc đua.",
    tip: "Tập trung độ chính xác cao hơn tốc độ ở các vòng đầu để bảo toàn vé đi tiếp.",
  },
  TOURNAMENT: {
    objective: "Đánh bại đối thủ trong nhánh đấu trực tiếp để bước lên bục vinh quang.",
    mechanism: "Chia bảng thi đấu đối đầu 1v1 theo thể thức loại trực tiếp (Tứ kết, Bán kết, Chung kết).",
    tip: "Tận dụng các câu hỏi hệ số cao để tạo cách biệt an toàn trước đối thủ cùng cặp.",
  },
  MAGIC_WHEEL: {
    objective: "Quay nón tri thức, lật mở ô chữ bí mật và tích lũy điểm thưởng cao nhất phòng đấu.",
    mechanism: "Đội đến lượt chốt lực quay nón 24 ô; đoán đúng chữ cái hoặc câu hỏi để nhân điểm và giữ quyền quay tiếp.",
    tip: "Chú ý tần suất chữ cái phổ biến và chủ động Giải ô chữ khi đã nắm chắc đáp án để bảo toàn điểm.",
  },
  GRID_CARO: {
    objective: "Chiếm ô trên bàn cờ ma trận và nối chuỗi K ô liên tiếp ăn thưởng cực đại.",
    mechanism: "Đội trả lời đúng câu hỏi sẽ chiếm ô đã chọn; nối thành hàng ngang/dọc/chéo để kích hoạt combo Caro.",
    tip: "Vừa xây dựng chuỗi ô của đội mình vừa chặn đứng đường kết nối của đối thủ.",
  },
  DICE_RACE: {
    objective: "Đua xúc xắc marathon vượt các ô cạm bẫy để cán đích đầu tiên.",
    mechanism: "Gieo 2 xí ngầu 3D nhận số bước di chuyển; trả lời câu hỏi để kích hoạt ô sự kiện may rủi.",
    tip: "Tính toán khoảng cách an toàn với các ô phạt lùi bước hoặc mất lượt.",
  },
  WAGER: {
    objective: "Cân não bí mật đặt cược số điểm tối đa để nhân bội tài sản.",
    mechanism: "Bí mật cược điểm trước khi công bố nội dung câu hỏi; đúng nhận đủ tiền cược, sai mất sạch.",
    tip: "Quản lý vốn chặt chẽ: Đặt cược lớn ở chủ đề sở trường và cược an toàn ở chủ đề lạ.",
  },
  MYSTERY_QUEST: {
    objective: "Khám phá sân khấu phiêu lưu truyền hình qua các bối cảnh thần bí luân phiên.",
    mechanism: "Thi đấu luân phiên theo lượt; giải đố để lật mở Rương kho báu, Cánh cửa bí mật và Ô số phận.",
    tip: "Đưa ra quyết định Dừng chơi (Cash-out) đúng lúc trước khi chạm phải cạm bẫy chia đôi điểm.",
  },
};

/**
 * Chuẩn hóa tiêu đề phòng thi thanh lịch, không nhồi nhét mã kỹ thuật hay dấu gạch dưới
 */
export function formatRoomTitle(rawTitle: string | undefined, mode?: string): { mainTitle: string; badgeText: string } {
  const modeKey = (mode || "CLASSIC").toUpperCase();
  const cleanModeName = MODE_DISPLAY_NAMES[modeKey] || modeKey;

  if (!rawTitle) {
    return {
      mainTitle: `${cleanModeName} Arena`,
      badgeText: "Phòng Thi Đấu",
    };
  }

  // Nếu là phòng Sandbox
  if (rawTitle.toLowerCase().includes("sandbox")) {
    const teamMatch = rawTitle.match(/(\d+)\s*(?:đội|doi|teams?)/i);
    const teamCount = teamMatch ? `${teamMatch[1]} Đội` : "Đấu Đội";
    return {
      mainTitle: `${cleanModeName} Arena`,
      badgeText: `🧪 Sandbox Studio · ${teamCount}`,
    };
  }

  // Xóa bỏ các mã enum thô kệch nếu có
  let cleaned = rawTitle
    .replace(/MYSTERY_QUEST|GRID_CARO|DICE_RACE|BOUNCEBACK|ELIMINATION|TOURNAMENT|MAGIC_WHEEL/gi, "")
    .replace(/[-_–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned || cleaned.length < 3) {
    cleaned = `${cleanModeName} Arena`;
  }

  return {
    mainTitle: cleaned,
    badgeText: `${cleanModeName} Mode`,
  };
}
