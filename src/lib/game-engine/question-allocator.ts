import { GameMode, calculateStandardTimeLimit } from "@/types";

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
  strategy?: AllocationStrategy;
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

export type AllocationStrategy = "ORIGINAL_POINTS" | "BLOOM_BALANCED" | "SHUFFLE_RANDOM";

export interface QuestionAllocationParams {
  questions: any[];
  targetCount?: number; // 0 or undefined = use all available or mode default
  mode: GameMode;
  teamsCount?: number;
  allocationStrategy?: AllocationStrategy;
  options?: {
    customDifficultyDistribution?: {
      easyRounds?: number;
      mediumRounds?: number;
      hardRounds?: number;
      easyCount?: number;
      mediumCount?: number;
      hardCount?: number;
    };
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
 * Xác định độ khó mục tiêu cho từng vòng đấu để đảm bảo đường cong thi đấu:
 * Khởi động (Dễ) -> Tăng tốc (Trung bình) -> Về đích (Khó)
 */
function getRoundTargetDifficulty(roundIndex: number, totalRounds: number): "EASY" | "MEDIUM" | "HARD" {
  if (totalRounds <= 1) return "MEDIUM";
  if (totalRounds === 2) return roundIndex === 0 ? "EASY" : "HARD";
  const progress = (roundIndex + 0.5) / totalRounds;
  if (progress <= 0.35) return "EASY";
  if (progress <= 0.70) return "MEDIUM";
  return "HARD";
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
      const adjustedTotal = roundsPerTeam * safeTeams;
      return {
        matchMaxQuestions: adjustedTotal,
        gridMaxQuestions: adjustedTotal,
        gridRoundsPerTeam: roundsPerTeam,
        roundsOrCycles: roundsPerTeam,
        questionsPerUnit: 1,
        suggestedGrid: { rows, cols, totalCells },
        descriptionVi: `Ma trận ${rows}×${cols} với ${roundsPerTeam} vòng thi đấu (${roundsPerTeam} lượt/đội × ${safeTeams} đội = ${adjustedTotal} câu). Các đội trả lời số câu bằng nhau!`,
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
 * 1. Hỗ trợ 2 chiến lược:
 *    - "ORIGINAL_POINTS": Ưu tiên bảo toàn điểm và cấp độ Bloom gốc trong đề thi.
 *    - "BLOOM_BALANCED": Tự động chuẩn hóa 10đ / 20đ / 30đ theo thang Bloom Gameshow.
 * 2. ĐẶC BIỆT: Đối với các chế độ thi đấu theo lượt (Mystery Quest, Wager, Bounceback, Dice Race),
 *    đảm bảo TUYỆT ĐỐI mỗi đội chơi một độ khó và thang điểm giống nhau ở mỗi vòng đấu!
 * 3. Hỗ trợ kho đề có dư (Surplus): Tự động trộn ngẫu nhiên từ kho để mỗi trận đấu đều mới mẻ,
 *    không bị lặp lại câu hỏi.
 */

/**
 * Thống kê số câu hỏi theo độ khó và tính số vòng tối đa khả dụng theo số đội.
 * Quy tắc: Nếu số câu hỏi của một mức ít hơn số đội (< teams), mức đó bị vô hiệu hóa (disabled).
 */
export function getDifficultyPoolSummary(questions: any[], teamsCount: number) {
  const safeTeams = Math.max(1, teamsCount);
  let easyCount = 0;
  let medCount = 0;
  let hardCount = 0;

  for (const q of questions) {
    if (q.isTieBreaker) continue;
    const diff = classifyQuestionDifficulty(q);
    if (diff === "EASY") easyCount++;
    else if (diff === "MEDIUM") medCount++;
    else hardCount++;
  }

  const maxEasyRounds = Math.floor(easyCount / safeTeams);
  const maxMedRounds = Math.floor(medCount / safeTeams);
  const maxHardRounds = Math.floor(hardCount / safeTeams);

  return {
    safeTeams,
    easy: {
      count: easyCount,
      maxRounds: maxEasyRounds,
      maxQuestions: maxEasyRounds * safeTeams,
      isAllowed: maxEasyRounds > 0,
      disabledReason: maxEasyRounds === 0 ? `Đề chỉ có ${easyCount}/${safeTeams} câu Dễ (không đủ chia cho ${safeTeams} đội)` : undefined,
    },
    medium: {
      count: medCount,
      maxRounds: maxMedRounds,
      maxQuestions: maxMedRounds * safeTeams,
      isAllowed: maxMedRounds > 0,
      disabledReason: maxMedRounds === 0 ? `Đề chỉ có ${medCount}/${safeTeams} câu TB (không đủ chia cho ${safeTeams} đội)` : undefined,
    },
    hard: {
      count: hardCount,
      maxRounds: maxHardRounds,
      maxQuestions: maxHardRounds * safeTeams,
      isAllowed: maxHardRounds > 0,
      disabledReason: maxHardRounds === 0 ? `Đề chỉ có ${hardCount}/${safeTeams} câu Khó (không đủ chia cho ${safeTeams} đội)` : undefined,
    },
  };
}

export function allocateQuestionsForMatch(params: QuestionAllocationParams): AllocationResult {
  const { questions, mode, targetCount, teamsCount = 4, allocationStrategy = "ORIGINAL_POINTS", options } = params;
  // Loại trừ các câu hỏi phụ (Tie-breaker) ra khỏi danh sách câu hỏi phân bổ của trận đấu chính
  const regularQuestions = questions.filter((q) => !q.isTieBreaker);
  const poolToUse = regularQuestions.length > 0 ? regularQuestions : questions;
  const bankTotal = poolToUse.length;
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

  for (const q of poolToUse) {
    const diff = classifyQuestionDifficulty(q);
    if (diff === "EASY") easyPool.push(q);
    else if (diff === "MEDIUM") medPool.push(q);
    else hardPool.push(q);
  }

  // Trộn các pool để đảm bảo tính ngẫu nhiên khi kho đề dư dả (Surplus pools)
  const shuffledEasy = shuffle(easyPool);
  const shuffledMed = shuffle(medPool);
  const shuffledHard = shuffle(hardPool);

  const isTurnBasedMode = mode === "MYSTERY_QUEST" || mode === "BOUNCEBACK" || mode === "WAGER" || mode === "DICE_RACE" || mode === "GRID_CARO";

  let allocatedQuestions: any[] = [];
  const pickedIds = new Set<string>();

  // Hàm phụ trợ rút câu hỏi từ pool tương ứng với cơ chế mượn/bù thông minh
  const drawFromPool = (desiredDiff: "EASY" | "MEDIUM" | "HARD"): any | null => {
    let pool = desiredDiff === "HARD" ? shuffledHard : desiredDiff === "MEDIUM" ? shuffledMed : shuffledEasy;
    while (pool.length > 0) {
      const q = pool.pop()!;
      if (!pickedIds.has(q.id)) {
        pickedIds.add(q.id);
        return q;
      }
    }
    // Nếu pool chính hết câu: mượn từ pool trung gian
    const fallbackOrder = desiredDiff === "HARD"
      ? [shuffledMed, shuffledEasy]
      : desiredDiff === "MEDIUM"
      ? [shuffledHard, shuffledEasy]
      : [shuffledMed, shuffledHard];

    for (const fbPool of fallbackOrder) {
      while (fbPool.length > 0) {
        const q = fbPool.pop()!;
        if (!pickedIds.has(q.id)) {
          pickedIds.add(q.id);
          return q;
        }
      }
    }
    // Fallback cuối cùng từ toàn bộ ứng viên chưa chọn
    const remaining = poolToUse.filter((q) => !pickedIds.has(q.id));
    if (remaining.length > 0) {
      const q = remaining[Math.floor(Math.random() * remaining.length)];
      pickedIds.add(q.id);
      return q;
    }
    return null;
  };

  if (isTurnBasedMode && safeTeams > 1) {
    let questionsPerRound = safeTeams;
    let roundsCount = 1;

    if (mode === "MYSTERY_QUEST") {
      roundsCount = derived.mysteryQuestTurnsPerTeam || Math.max(1, Math.floor(effectiveTotal / safeTeams));
      questionsPerRound = safeTeams;
    } else if (mode === "WAGER") {
      roundsCount = derived.wagerRoundsPerTeam || Math.max(1, Math.floor(effectiveTotal / safeTeams));
      questionsPerRound = safeTeams;
    } else if (mode === "BOUNCEBACK") {
      const qPerTurn = derived.bouncebackQuestionsPerTurn || 1;
      questionsPerRound = safeTeams * qPerTurn;
      roundsCount = derived.bouncebackCycles || Math.max(1, Math.floor(effectiveTotal / questionsPerRound));
    } else if (mode === "DICE_RACE") {
      questionsPerRound = safeTeams;
      roundsCount = Math.max(1, Math.floor(effectiveTotal / safeTeams));
    } else if (mode === "GRID_CARO") {
      questionsPerRound = safeTeams;
      roundsCount = derived.gridRoundsPerTeam || Math.max(1, Math.floor(effectiveTotal / safeTeams));
    }

    // Kiểm tra cấu hình số vòng tùy chỉnh của Host hoặc chiến lược SHUFFLE_RANDOM
    const customDist = options?.customDifficultyDistribution;
    let roundSchedule: Array<"EASY" | "MEDIUM" | "HARD"> = [];

    if (customDist) {
      const maxEasyRounds = Math.floor(easyPool.length / questionsPerRound);
      const maxMedRounds = Math.floor(medPool.length / questionsPerRound);
      const maxHardRounds = Math.floor(hardPool.length / questionsPerRound);

      const reqEasyRounds = customDist.easyRounds ?? Math.floor((customDist.easyCount || 0) / questionsPerRound);
      const reqMedRounds = customDist.mediumRounds ?? Math.floor((customDist.mediumCount || 0) / questionsPerRound);
      const reqHardRounds = customDist.hardRounds ?? Math.floor((customDist.hardCount || 0) / questionsPerRound);

      // Ràng buộc nghiêm ngặt: nếu số câu có sẵn < questionsPerRound thì ép về 0 (khóa, không cho chọn)
      const safeEasyRounds = Math.min(maxEasyRounds, Math.max(0, reqEasyRounds));
      const safeMedRounds = Math.min(maxMedRounds, Math.max(0, reqMedRounds));
      const safeHardRounds = Math.min(maxHardRounds, Math.max(0, reqHardRounds));

      if (safeEasyRounds + safeMedRounds + safeHardRounds > 0) {
        // Xếp theo đúng thứ tự leo thang: Toàn bộ Easy -> Toàn bộ Medium -> Toàn bộ Hard
        for (let i = 0; i < safeEasyRounds; i++) roundSchedule.push("EASY");
        for (let i = 0; i < safeMedRounds; i++) roundSchedule.push("MEDIUM");
        for (let i = 0; i < safeHardRounds; i++) roundSchedule.push("HARD");
      }
    } else if (allocationStrategy === "SHUFFLE_RANDOM") {
      // Chiến lược Trộn Ngẫu Nhiên:
      // Phân chia đều số vòng (roundsCount) cho các mức độ khó có sẵn (>= questionsPerRound).
      // Tuyệt đối không bỏ sót bất kỳ mức độ khó nào có sẵn trong bộ đề!
      const availablePools: Array<{ diff: "EASY" | "MEDIUM" | "HARD"; maxRounds: number }> = [];
      const maxE = Math.floor(easyPool.length / questionsPerRound);
      const maxM = Math.floor(medPool.length / questionsPerRound);
      const maxH = Math.floor(hardPool.length / questionsPerRound);

      if (maxE > 0) availablePools.push({ diff: "EASY", maxRounds: maxE });
      if (maxM > 0) availablePools.push({ diff: "MEDIUM", maxRounds: maxM });
      if (maxH > 0) availablePools.push({ diff: "HARD", maxRounds: maxH });

      if (availablePools.length > 0) {
        const poolAllocatedRounds: Record<string, number> = { EASY: 0, MEDIUM: 0, HARD: 0 };
        let remainingRoundsToAssign = roundsCount;

        // Bước 1: Bảo đảm không bỏ sót mức nào có sẵn (mỗi mức >= 1 vòng nếu roundsCount đủ)
        if (remainingRoundsToAssign >= availablePools.length) {
          for (const p of availablePools) {
            poolAllocatedRounds[p.diff] = 1;
            remainingRoundsToAssign--;
          }
        }

        // Bước 2: Chia đều các vòng còn lại cho các mức có sẵn chưa đạt trần maxRounds
        while (remainingRoundsToAssign > 0) {
          const eligible = availablePools.filter((p) => poolAllocatedRounds[p.diff] < p.maxRounds);
          if (eligible.length === 0) break;
          for (const p of eligible) {
            if (remainingRoundsToAssign <= 0) break;
            poolAllocatedRounds[p.diff]++;
            remainingRoundsToAssign--;
          }
        }

        // Tạo danh sách roundSchedule
        for (const p of availablePools) {
          const count = poolAllocatedRounds[p.diff] || 0;
          for (let i = 0; i < count; i++) {
            roundSchedule.push(p.diff);
          }
        }
      }
    }

    if (roundSchedule.length === 0) {
      for (let r = 0; r < roundsCount; r++) {
        roundSchedule.push(getRoundTargetDifficulty(r, roundsCount));
      }
    }

    const roundAllocatedQuestions: any[] = [];

    for (let r = 0; r < roundSchedule.length; r++) {
      const roundDiff = roundSchedule[r];
      const targetPoints = normalizePointsToLevel(roundDiff);
      const targetBloom = roundDiff === "HARD" ? "ANALYZE" : roundDiff === "MEDIUM" ? "APPLY" : "REMEMBER";

      for (let qIdx = 0; qIdx < questionsPerRound; qIdx++) {
        const rawQ = drawFromPool(roundDiff);
        if (!rawQ) break;

        let finalPoints = targetPoints;
        let finalBloom = targetBloom;

        if (allocationStrategy === "ORIGINAL_POINTS") {
          finalPoints = rawQ.points !== undefined && rawQ.points !== null ? rawQ.points : targetPoints;
          finalBloom = rawQ.bloomLevel || targetBloom;
        }

        roundAllocatedQuestions.push({
          ...rawQ,
          allocatedDiff: roundDiff,
          roundIndex: r + 1,
          points: allocationStrategy === "BLOOM_BALANCED" ? targetPoints : finalPoints,
          bloomLevel: allocationStrategy === "BLOOM_BALANCED" ? targetBloom : finalBloom,
        });
      }
    }

    allocatedQuestions = roundAllocatedQuestions;
  } else {
    // ── ĐỐI VỚI CÁC MODE CÙNG LÀM BÀI / CHUÔNG / ĐUA CỜ (CLASSIC, BUZZ, ELIMINATION...) ──
    // Tất cả các đội cùng trả lời đồng thời ở mỗi câu hỏi, nên tự nhiên có cùng độ khó.
    // Phân bổ theo tỷ lệ Bloom Gameshow: Dễ (~30%) -> Trung bình (~37%) -> Khó (~33%)
    let targetHard = Math.max(1, Math.round(effectiveTotal * 0.33));
    let targetEasy = Math.max(1, Math.round(effectiveTotal * 0.30));
    let targetMed = effectiveTotal - targetEasy - targetHard;

    if (targetMed < 1 && effectiveTotal >= 3) {
      targetMed = 1;
      targetHard = Math.max(1, effectiveTotal - targetEasy - targetMed);
    }

    const selectedHard: any[] = [];
    const selectedMed: any[] = [];
    const selectedEasy: any[] = [];

    // Rút từ pool Khó
    while (selectedHard.length < targetHard) {
      const q = drawFromPool("HARD");
      if (!q) break;
      selectedHard.push({ ...q, allocatedDiff: "HARD" });
    }

    // Rút từ pool Dễ
    while (selectedEasy.length < targetEasy) {
      const q = drawFromPool("EASY");
      if (!q) break;
      selectedEasy.push({ ...q, allocatedDiff: "EASY" });
    }

    // Rút từ pool Trung bình
    while (selectedMed.length < targetMed) {
      const q = drawFromPool("MEDIUM");
      if (!q) break;
      selectedMed.push({ ...q, allocatedDiff: "MEDIUM" });
    }

    // Ghép theo đường cong độ khó leo thang: Dễ -> Trung bình -> Khó
    allocatedQuestions = [...selectedEasy, ...selectedMed, ...selectedHard];
  }

  // Đảm bảo số lượng chính xác không vượt quá effectiveTotal
  allocatedQuestions = allocatedQuestions.slice(0, effectiveTotal);

  // Đánh lại số thứ tự (order) và chuẩn hóa điểm theo chiến lược đã chọn
  allocatedQuestions = allocatedQuestions.map((q, idx) => {
    const diff = q.allocatedDiff || classifyQuestionDifficulty(q);
    const standardPoints = normalizePointsToLevel(diff);
    const standardBloom = diff === "HARD" ? "ANALYZE" : diff === "MEDIUM" ? "APPLY" : "REMEMBER";
    const effPoints = allocationStrategy === "BLOOM_BALANCED"
      ? standardPoints
      : (q.points !== undefined && q.points !== null ? q.points : standardPoints);
    const itemCount = Array.isArray(q.pairs) ? q.pairs.length : (Array.isArray(q.options) ? q.options.length : 4);
    const stdTime = calculateStandardTimeLimit(effPoints, q.type, itemCount);

    return {
      ...q,
      order: idx + 1,
      points: effPoints,
      bloomLevel: allocationStrategy === "BLOOM_BALANCED"
        ? standardBloom
        : (q.bloomLevel || standardBloom),
      timeLimit: q.timeLimit && Number(q.timeLimit) > 0 ? Number(q.timeLimit) : stdTime,
    };
  });

  if (allocationStrategy === "SHUFFLE_RANDOM") {
    allocatedQuestions = shuffle(allocatedQuestions).map((q, idx) => ({ ...q, order: idx + 1 }));
  }

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
    strategy: allocationStrategy,
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
