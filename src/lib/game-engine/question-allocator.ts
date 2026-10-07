import { GameMode, BloomLevel } from "@/types";

export interface QuestionAllocationBreakdown {
  easyCount: number;
  mediumCount: number;
  hardCount: number;
  easyPercent: number;
  mediumPercent: number;
  hardPercent: number;
}

export interface ModeAllocationDetails {
  mode: GameMode;
  totalQuestions: number;
  teamsCount: number;
  descriptionVi: string;
  roundsOrCycles?: number;
  questionsPerUnit?: number;
  stagesCount?: number;
  goldQuestionsCount?: number;
  suggestedGrid?: { rows: number; cols: number; totalCells: number };
}

export interface AllocationResult {
  allocatedQuestions: any[];
  totalQuestions: number;
  breakdown: QuestionAllocationBreakdown;
  modeDetails: ModeAllocationDetails;
  targetCount: number;
  bankTotal: number;
  derivedConfig: {
    matchMaxQuestions: number;
    mysteryQuestTurnsPerTeam?: number;
    wagerRoundsPerTeam?: number;
    bouncebackCycles?: number;
    bouncebackQuestionsPerTurn?: number;
    eliminationIntervalQuestions?: number;
    tournamentQuestionsPerMatch?: number;
    gridMaxQuestions?: number;
    diceRaceMaxQuestions?: number;
  };
}

export interface QuestionAllocationParams {
  questions: any[];
  targetCount?: number; // 0 or undefined = use all available or mode default
  mode: GameMode;
  teamsCount?: number;
  options?: {
    eliminationStages?: number;
    bouncebackQuestionsPerTurn?: number;
    tournamentQuestionsPerMatch?: number;
  };
}

/**
 * Phân loại câu hỏi thành 3 bậc độ khó:
 * - EASY: điểm <= 10 hoặc Bloom REMEMBER
 * - MEDIUM: điểm == 20 hoặc Bloom APPLY
 * - HARD: điểm >= 30 hoặc Bloom ANALYZE
 */
export function classifyQuestionDifficulty(q: any): "EASY" | "MEDIUM" | "HARD" {
  if (q.bloomLevel === "ANALYZE" || (q.points && q.points >= 30)) return "HARD";
  if (q.bloomLevel === "APPLY" || (q.points && q.points > 10 && q.points <= 20)) return "MEDIUM";
  return "EASY";
}

/**
 * Chuẩn hóa điểm câu hỏi về 3 mức chuẩn 10 / 20 / 30
 */
export function normalizePointsToLevel(diff: "EASY" | "MEDIUM" | "HARD"): 10 | 20 | 30 {
  if (diff === "HARD") return 30;
  if (diff === "MEDIUM") return 20;
  return 10;
}

/**
 * Trộn ngẫu nhiên mảng câu hỏi (Fisher-Yates shuffle)
 */
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Tính toán các thông số cấu hình phụ thuộc (derived config) từ số câu hỏi mục tiêu
 */
export function calculateModeDerivedConfig(
  mode: GameMode,
  targetCount: number,
  teamsCount: number = 4,
  options?: {
    eliminationStages?: number;
    bouncebackQuestionsPerTurn?: number;
    tournamentQuestionsPerMatch?: number;
  }
) {
  const safeTeams = Math.max(1, teamsCount);
  const qCount = Math.max(1, targetCount);

  switch (mode) {
    case "MYSTERY_QUEST": {
      // Mỗi đội có ít nhất 1 lượt, tính số lượt/đội = floor(qCount / teams)
      const turnsPerTeam = Math.max(1, Math.floor(qCount / safeTeams));
      const adjustedTotal = turnsPerTeam * safeTeams;
      return {
        matchMaxQuestions: adjustedTotal,
        mysteryQuestTurnsPerTeam: turnsPerTeam,
        roundsOrCycles: turnsPerTeam,
        questionsPerUnit: 1,
        descriptionVi: `Tự động phân bổ ${turnsPerTeam} vòng thi đấu (${turnsPerTeam} lượt cho mỗi đội × ${safeTeams} đội = ${adjustedTotal} câu). Các đội chơi lần lượt vượt thử thách và lật ô số phận!`,
      };
    }
    case "WAGER": {
      const roundsPerTeam = Math.max(1, Math.floor(qCount / safeTeams));
      const adjustedTotal = roundsPerTeam * safeTeams;
      return {
        matchMaxQuestions: adjustedTotal,
        wagerRoundsPerTeam: roundsPerTeam,
        roundsOrCycles: roundsPerTeam,
        questionsPerUnit: 1,
        descriptionVi: `Tự động chia thành ${roundsPerTeam} vòng cược điểm bí mật (${roundsPerTeam} lượt cược/đội × ${safeTeams} đội = ${adjustedTotal} câu hỏi cân não).`,
      };
    }
    case "BOUNCEBACK": {
      const qPerTurn = options?.bouncebackQuestionsPerTurn || 1;
      const cycles = Math.max(1, Math.floor(qCount / (safeTeams * qPerTurn)));
      const adjustedTotal = cycles * safeTeams * qPerTurn;
      return {
        matchMaxQuestions: adjustedTotal,
        bouncebackCycles: cycles,
        bouncebackQuestionsPerTurn: qPerTurn,
        roundsOrCycles: cycles,
        questionsPerUnit: qPerTurn,
        descriptionVi: `Tự động chia thành ${cycles} chu kỳ Về đích (${safeTeams} đội × ${qPerTurn} câu/lượt × ${cycles} chu kỳ = ${adjustedTotal} câu). Mở chuông 5s khi đội chính sai.`,
      };
    }
    case "ELIMINATION": {
      const stages = options?.eliminationStages || 3;
      const interval = Math.max(2, Math.floor(qCount / stages));
      return {
        matchMaxQuestions: qCount,
        eliminationIntervalQuestions: interval,
        stagesCount: stages,
        descriptionVi: `Tự động chia thành ${stages} chặng sinh tồn. Cứ sau ${interval} câu hỏi, đội xếp chót sẽ bị loại thành Đội Bóng Ma tranh vé Hồi Sinh.`,
      };
    }
    case "GRID_CARO": {
      const rows = qCount >= 25 ? 5 : qCount >= 16 ? 4 : 3;
      const cols = rows;
      const totalCells = rows * cols;
      const roundsPerTeam = Math.max(1, Math.floor(qCount / safeTeams));
      return {
        matchMaxQuestions: qCount,
        gridMaxQuestions: qCount,
        gridRoundsPerTeam: roundsPerTeam,
        suggestedGrid: { rows, cols, totalCells },
        descriptionVi: `Gợi ý bàn cờ ma trận ${rows}×${cols} (${totalCells} ô số) gắn cứng 10đ/20đ/30đ, tương ứng khoảng ${roundsPerTeam} lượt chọn/đội.`,
      };
    }
    case "TOURNAMENT": {
      const questionsPerMatch = options?.tournamentQuestionsPerMatch || Math.max(2, Math.min(5, Math.floor(qCount / 3)));
      return {
        matchMaxQuestions: qCount,
        tournamentQuestionsPerMatch: questionsPerMatch,
        descriptionVi: `Tự động phân bổ ${questionsPerMatch} câu hỏi cho mỗi cặp đối đầu 1v1 trên nhánh đấu Tứ kết - Bán kết - Chung kết.`,
      };
    }
    case "DICE_RACE": {
      return {
        matchMaxQuestions: qCount,
        diceRaceMaxQuestions: qCount,
        descriptionVi: `Giới hạn tối đa ${qCount} câu hỏi cho cuộc đua marathon (đội cán đích trước hoặc tiến xa nhất sẽ chiến thắng).`,
      };
    }
    case "CLASSIC": {
      const goldCount = Math.max(1, Math.round(qCount * 0.2));
      return {
        matchMaxQuestions: qCount,
        goldQuestionsCount: goldCount,
        descriptionVi: `Thi đấu ${qCount} câu hỏi tính điểm chuẩn Kahoot (gồm ${goldCount} Câu hỏi Vàng x2 điểm ở chặng về đích phân loại).`,
      };
    }
    case "BUZZ": {
      return {
        matchMaxQuestions: qCount,
        descriptionVi: `Thi đấu chuông bấm qua ${qCount} câu hỏi với 3 mức điểm 10/20/30 phân bổ chuẩn xác, đúng nhận điểm, sai bị trừ 50%.`,
      };
    }
    default: {
      return {
        matchMaxQuestions: qCount,
        descriptionVi: `Thi đấu qua ${qCount} câu hỏi được phân bổ tối ưu theo thang đo Bloom.`,
      };
    }
  }
}

/**
 * Thuật toán phân bổ câu hỏi thông minh (Smart Question Allocation Engine):
 * 1. Phân loại toàn bộ câu hỏi kho đề theo 3 mức Bloom: Dễ (35%), Trung bình (45%), Khó (20%).
 * 2. Lấy mẫu cân đối, tự động bù trừ giữa các bucket nếu kho đề thiếu câu ở 1 mức.
 * 3. Sắp xếp thứ tự thi đấu theo đường cong leo thang (Khởi động -> Tăng tốc -> Về đích)
 *    hoặc phân bổ đồng đều theo lượt (Round-robin) cho các mode thi đấu theo lượt.
 */
export function allocateQuestionsForMatch(params: QuestionAllocationParams): AllocationResult {
  const { questions, mode, targetCount, teamsCount = 4, options } = params;
  const bankTotal = questions.length;
  const safeTeams = Math.max(1, teamsCount);

  // 1. Xác định số câu hỏi mục tiêu
  let desiredCount: number;
  if (targetCount && targetCount > 0) {
    desiredCount = Math.min(bankTotal, targetCount);
  } else {
    // Nếu targetCount = 0 hoặc undefined: Mặc định dùng toàn bộ ngân hàng
    desiredCount = bankTotal;
  }

  // 2. Tính toán derived configuration theo mode
  const derived = calculateModeDerivedConfig(mode, desiredCount, safeTeams, options);
  const effectiveTotal = Math.min(bankTotal, derived.matchMaxQuestions || desiredCount);

  // 3. Phân loại câu hỏi trong kho vào 3 bể (pools)
  const easyPool: any[] = [];
  const medPool: any[] = [];
  const hardPool: any[] = [];

  for (const q of questions) {
    const diff = classifyQuestionDifficulty(q);
    if (diff === "EASY") easyPool.push(q);
    else if (diff === "MEDIUM") medPool.push(q);
    else hardPool.push(q);
  }

  // Trộn các pool để đảm bảo tính ngẫu nhiên, không bị lặp trận giống hệt nhau
  const shuffledEasy = shuffle(easyPool);
  const shuffledMed = shuffle(medPool);
  const shuffledHard = shuffle(hardPool);

  // 4. Tính toán số lượng mục tiêu cho từng mức:
  // Tăng tần suất câu 30đ lên ~33% để chặng thi đấu có tính phân loại và kịch tính cao:
  // Dễ (10đ): ~30%
  // Khó (30đ): ~33% (tần suất câu 30đ dồi dào theo yêu cầu)
  // Trung bình (20đ): phần còn lại (~37%)
  let targetHard = Math.max(1, Math.round(effectiveTotal * 0.33));
  let targetEasy = Math.max(1, Math.round(effectiveTotal * 0.30));
  let targetMed = effectiveTotal - targetEasy - targetHard;

  if (targetMed < 1 && effectiveTotal >= 3) {
    targetMed = 1;
    targetHard = Math.max(1, effectiveTotal - targetEasy - targetMed);
  }

  // 5. Chọn câu hỏi từ các pools với thuật toán nâng cấp và bù trừ thông minh:
  // - Ưu tiên rút các câu đã có sẵn độ khó tương ứng trong kho đề
  // - Nếu kho đề thiếu câu 30đ (thường do ngân hàng câu hỏi ban đầu đặt điểm mặc định 10đ/20đ):
  //   Hệ thống tự động nâng cấp (promote) các câu phù hợp lên mức 30đ (Khó) để đảm bảo đủ tần suất câu 30đ cho trận đấu!
  const selectedHard: any[] = [];
  const selectedMed: any[] = [];
  const selectedEasy: any[] = [];
  const pickedIds = new Set<string>();

  // 5.1 Rút từ pool Khó trước
  while (selectedHard.length < targetHard && shuffledHard.length > 0) {
    const q = shuffledHard.pop()!;
    if (!pickedIds.has(q.id)) {
      pickedIds.add(q.id);
      selectedHard.push({ ...q, allocatedDiff: "HARD", points: 30, bloomLevel: "ANALYZE" });
    }
  }

  // 5.2 Rút từ pool Dễ
  while (selectedEasy.length < targetEasy && shuffledEasy.length > 0) {
    const q = shuffledEasy.pop()!;
    if (!pickedIds.has(q.id)) {
      pickedIds.add(q.id);
      selectedEasy.push({ ...q, allocatedDiff: "EASY", points: 10, bloomLevel: "REMEMBER" });
    }
  }

  // 5.3 Rút từ pool Trung bình
  while (selectedMed.length < targetMed && shuffledMed.length > 0) {
    const q = shuffledMed.pop()!;
    if (!pickedIds.has(q.id)) {
      pickedIds.add(q.id);
      selectedMed.push({ ...q, allocatedDiff: "MEDIUM", points: 20, bloomLevel: "APPLY" });
    }
  }

  // 5.4 Nếu pool Khó còn thiếu chỉ tiêu (do kho đề ít câu 30đ):
  // Rút từ các câu chưa chọn còn lại (ưu tiên từ medPool rồi easyPool) và nâng cấp lên 30đ!
  const remainingCandidates = shuffle(questions.filter((q) => !pickedIds.has(q.id)));
  while (selectedHard.length < targetHard && remainingCandidates.length > 0) {
    const q = remainingCandidates.pop()!;
    pickedIds.add(q.id);
    selectedHard.push({ ...q, allocatedDiff: "HARD", points: 30, bloomLevel: "ANALYZE" });
  }

  // 5.5 Nếu pool Dễ còn thiếu chỉ tiêu:
  while (selectedEasy.length < targetEasy && remainingCandidates.length > 0) {
    const q = remainingCandidates.pop()!;
    pickedIds.add(q.id);
    selectedEasy.push({ ...q, allocatedDiff: "EASY", points: 10, bloomLevel: "REMEMBER" });
  }

  // 5.6 Nếu pool Trung bình còn thiếu chỉ tiêu:
  while (selectedMed.length < targetMed && remainingCandidates.length > 0) {
    const q = remainingCandidates.pop()!;
    pickedIds.add(q.id);
    selectedMed.push({ ...q, allocatedDiff: "MEDIUM", points: 20, bloomLevel: "APPLY" });
  }

  // 5.7 Bù nốt số lượng còn thiếu nếu tổng chưa đủ effectiveTotal
  while (
    selectedHard.length + selectedMed.length + selectedEasy.length < effectiveTotal &&
    remainingCandidates.length > 0
  ) {
    const q = remainingCandidates.pop()!;
    pickedIds.add(q.id);
    if (selectedHard.length <= selectedMed.length) {
      selectedHard.push({ ...q, allocatedDiff: "HARD", points: 30, bloomLevel: "ANALYZE" });
    } else {
      selectedMed.push({ ...q, allocatedDiff: "MEDIUM", points: 20, bloomLevel: "APPLY" });
    }
  }

  // 6. Sắp xếp thứ tự thi đấu tối ưu (Sequencing & Pacing)
  let allocatedQuestions: any[] = [];

  const isTurnBasedMode = mode === "MYSTERY_QUEST" || mode === "BOUNCEBACK" || mode === "WAGER";

  if (isTurnBasedMode && safeTeams > 1) {
    // ĐỐI VỚI CÁC MODE THEO LƯỢT:
    // Phân bổ câu hỏi theo vòng (Round-Robin Equal Difficulty):
    // Các câu hỏi trong cùng 1 vòng có độ khó tương đương để đảm bảo công bằng cho mọi đội!
    // Vòng 1: Toàn câu Dễ. Vòng giữa: Toàn câu Trung bình. Vòng cuối: Toàn câu Khó!
    const allSelected = [...selectedEasy, ...selectedMed, ...selectedHard];
    allSelected.sort((a, b) => {
      const diffScore: Record<string, number> = { EASY: 1, MEDIUM: 2, HARD: 3 };
      return (diffScore[a.allocatedDiff || "EASY"] || 1) - (diffScore[b.allocatedDiff || "EASY"] || 1);
    });

    allocatedQuestions = allSelected;
  } else {
    // ĐỐI VỚI CÁC MODE CÙNG LÀM BÀI / CHUÔNG / ĐUA CỜ:
    // Đường cong độ khó leo thang (Khởi động -> Tăng tốc -> Về đích)
    allocatedQuestions = [...selectedEasy, ...selectedMed, ...selectedHard];
  }

  // Đảm bảo số lượng chính xác
  allocatedQuestions = allocatedQuestions.slice(0, effectiveTotal);

  // Đánh lại số thứ tự (order) và gán điểm số chuẩn xác 10 / 20 / 30
  allocatedQuestions = allocatedQuestions.map((q, idx) => {
    const diff = q.allocatedDiff || classifyQuestionDifficulty(q);
    const normalizedPoints = normalizePointsToLevel(diff);
    return {
      ...q,
      order: idx + 1,
      points: normalizedPoints,
      bloomLevel: diff === "HARD" ? "ANALYZE" : diff === "MEDIUM" ? "APPLY" : "REMEMBER",
    };
  });

  // 7. Thống kê tỷ lệ phân bổ
  const finalEasy = allocatedQuestions.filter((q) => q.points <= 10).length;
  const finalMed = allocatedQuestions.filter((q) => q.points === 20).length;
  const finalHard = allocatedQuestions.filter((q) => q.points >= 30).length;
  const total = allocatedQuestions.length || 1;

  const breakdown: QuestionAllocationBreakdown = {
    easyCount: finalEasy,
    mediumCount: finalMed,
    hardCount: finalHard,
    easyPercent: Math.round((finalEasy / total) * 100),
    mediumPercent: Math.round((finalMed / total) * 100),
    hardPercent: Math.round((finalHard / total) * 100),
  };

  const modeDetails: ModeAllocationDetails = {
    mode,
    totalQuestions: allocatedQuestions.length,
    teamsCount: safeTeams,
    descriptionVi: derived.descriptionVi,
    roundsOrCycles: derived.roundsOrCycles,
    questionsPerUnit: derived.questionsPerUnit,
    stagesCount: derived.stagesCount,
    goldQuestionsCount: derived.goldQuestionsCount,
    suggestedGrid: derived.suggestedGrid,
  };

  return {
    allocatedQuestions,
    totalQuestions: allocatedQuestions.length,
    breakdown,
    modeDetails,
    targetCount: desiredCount,
    bankTotal,
    derivedConfig: {
      matchMaxQuestions: allocatedQuestions.length,
      mysteryQuestTurnsPerTeam: derived.mysteryQuestTurnsPerTeam,
      wagerRoundsPerTeam: derived.wagerRoundsPerTeam,
      bouncebackCycles: derived.bouncebackCycles,
      bouncebackQuestionsPerTurn: derived.bouncebackQuestionsPerTurn,
      eliminationIntervalQuestions: derived.eliminationIntervalQuestions,
      tournamentQuestionsPerMatch: derived.tournamentQuestionsPerMatch,
      gridMaxQuestions: derived.gridMaxQuestions,
      diceRaceMaxQuestions: derived.diceRaceMaxQuestions,
    },
  };
}
