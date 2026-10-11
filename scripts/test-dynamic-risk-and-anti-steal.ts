import {
  evaluateTeamRiskTier,
  rollBombTypeForMinigame,
  calculateCappedSteal,
  calculatePromoSteal5,
  generateMysteryStageForTurn,
} from "../src/lib/game-engine/mystery-quest";
import { MysteryTeamRef } from "../src/lib/game-engine/mystery-quest";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

console.log("\n========================================================");
console.log("TEST 1: ĐÁNH GIÁ THẾ TRẬN RỦI RO (evaluateTeamRiskTier)");
console.log("========================================================");

const team1: MysteryTeamRef = { id: "t1", name: "Đội Rồng Đỏ", score: 80 };
const team2: MysteryTeamRef = { id: "t2", name: "Đội Hổ Vàng", score: 50 };
const team3: MysteryTeamRef = { id: "t3", name: "Đội Phượng Hoàng", score: 45 };
const team4: MysteryTeamRef = { id: "t4", name: "Đội Rùa Xanh", score: 20 };
const allTeams = [team1, team2, team3, team4];

// Test 1.1: Đội dẫn đầu áp đảo (80đ vs 50đ, cách biệt 30đ >= 25đ)
const tier1 = evaluateTeamRiskTier({ team: team1, allTeams });
assert(tier1 === "DOMINANT", "Đội 1 (80đ) dẫn Đội 2 (50đ) 30 điểm phải là DOMINANT");

// Test 1.2: Đội bét bảng bị dẫn xa (20đ vs 80đ, cách biệt 60đ >= 25đ)
const tier4 = evaluateTeamRiskTier({ team: team4, allTeams });
assert(tier4 === "UNDERDOG", "Đội 4 (20đ) bị dẫn 60 điểm phải là UNDERDOG");

// Test 1.3: Đội ở giữa bám đuổi
const tier2 = evaluateTeamRiskTier({ team: team2, allTeams });
assert(tier2 === "NEUTRAL", "Đội 2 (50đ) ở giữa bảng phải là NEUTRAL");

// Test 1.4: Đội vừa dính bom lượt trước (consecutiveBombs = 1) dù điểm cao
const tier2Bombed = evaluateTeamRiskTier({ team: team2, allTeams, consecutiveBombs: 1 });
assert(tier2Bombed === "UNDERDOG", "Đội vừa dính bom lượt trước (consecutiveBombs=1) phải được bảo hộ UNDERDOG");

console.log("\n========================================================");
console.log("TEST 2: MA TRẬN BOM & QUY TẮC ROUND (rollBombTypeForMinigame)");
console.log("========================================================");

// Test 2.1: Round 1 tỷ lệ Bom Từ Thiện tuyệt đối = 0% ở tất cả các mode
const modes = ["PUSH_YOUR_LUCK", "MEMORY_PAIRS", "ONE_SHOT_DOORS", "TAROT_DESTINY"] as const;
for (const mode of modes) {
  let charityCount = 0;
  for (let i = 0; i < 2000; i++) {
    const bomb = rollBombTypeForMinigame(mode, 50, { currentRound: 1, riskTier: "NEUTRAL" });
    if (bomb === "BOMB_CHARITY") charityCount++;
  }
  assert(charityCount === 0, `Round 1 ở mode ${mode}: Bom Từ Thiện xuất hiện 0 lần / 2000 lượt (0%)`);
}

// Test 2.2: Đội UNDERDOG ở Round 2: Tỷ lệ Bom Khói phải chiếm >= 85%, Bom Từ Thiện = 0%
let underdogSmoke = 0;
let underdogCharity = 0;
for (let i = 0; i < 2000; i++) {
  const bomb = rollBombTypeForMinigame("PUSH_YOUR_LUCK", 50, { currentRound: 2, riskTier: "UNDERDOG" });
  if (bomb === "BOMB_SMOKE") underdogSmoke++;
  if (bomb === "BOMB_CHARITY") underdogCharity++;
}
const smokeRate = (underdogSmoke / 2000) * 100;
assert(underdogCharity === 0, "Đội UNDERDOG: Bom Từ Thiện = 0% tuyệt đối (không bị ép làm từ thiện)");
assert(smokeRate >= 85, `Đội UNDERDOG: Bom Khói đạt ${smokeRate.toFixed(1)}% (chuẩn >= 85%)`);

// Test 2.3: Đội DOMINANT ở Round 3+: Bom Từ Thiện tăng lên để tạo cơ hội lật kèo
let dominantCharity = 0;
for (let i = 0; i < 2000; i++) {
  const bomb = rollBombTypeForMinigame("PUSH_YOUR_LUCK", 80, { currentRound: 3, riskTier: "DOMINANT" });
  if (bomb === "BOMB_CHARITY") dominantCharity++;
}
const dominantCharityRate = (dominantCharity / 2000) * 100;
assert(dominantCharityRate >= 15 && dominantCharityRate <= 25, `Đội DOMINANT Round 3+: Bom Từ Thiện đạt ${dominantCharityRate.toFixed(1)}% (chuẩn 15-25%)`);

console.log("\n========================================================");
console.log("TEST 3: BẢO VỆ CHỐNG CƯỚP ĐIỂM LIÊN HOÀN (Anti-Chain-Steal)");
console.log("========================================================");

// Giả sử Đội 1 (Top 1) có 80 điểm. Đội 2 cướp điểm từ Đội 1 (target 20đ)
const cycleRecord: Record<string, number> = {};

// Lần 1: Bị cướp lần đầu tiên trong chu kỳ -> Chịu 100% (20đ)
const steal1 = calculateCappedSteal({
  activeTeamId: "t2",
  allTeams,
  targetPoints: 20,
  timesStolenInCycle: cycleRecord,
});
assert(steal1.victimTeamId === "t1" && steal1.stolenPoints === 20, "Lần 1 bị cướp: Nạn nhân t1 chịu 100% (20 điểm)");
cycleRecord["t1"] = 1;

// Lần 2: Đội khác (Đội 3) tiếp tục cướp trước khi đến lượt của Đội 1 -> Giảm còn 50% (-10đ)
const steal2 = calculateCappedSteal({
  activeTeamId: "t3",
  allTeams,
  targetPoints: 20,
  timesStolenInCycle: cycleRecord,
});
assert(
  steal2.victimTeamId === "t1" && steal2.stolenPoints === 10 && steal2.isHalfProtection === true,
  "Lần 2 bị cướp: Nạn nhân t1 được bảo vệ giảm 50% (-10 điểm)"
);
cycleRecord["t1"] = 2;

// Lần 3: Đội 4 lại tiếp tục quay vào ô cướp trước lượt của Đội 1
// -> Đội 1 đã bị cướp 2 lần, được MIỄN NHIỄM CƯỚP! Mục tiêu tự động chuyển sang Đội 2 (đội cao điểm kế tiếp)
const steal3 = calculateCappedSteal({
  activeTeamId: "t4",
  allTeams,
  targetPoints: 20,
  timesStolenInCycle: cycleRecord,
});
assert(
  steal3.victimTeamId === "t2" && steal3.stolenPoints === 20,
  "Lần 3: Đội 1 đã đạt giới hạn 2 lần -> Miễn nhiễm cướp! Mục tiêu tự động chuyển sang Đội 2 (50đ)"
);
cycleRecord["t2"] = 1;

// Lần 4: Nếu cả Đội 1 và Đội 2 đều đã bị cướp 2 lần, Đội 3 cũng bị cướp 2 lần (tất cả đều miễn nhiễm)
cycleRecord["t2"] = 2;
cycleRecord["t3"] = 2;
const stealAllImmune = calculateCappedSteal({
  activeTeamId: "t4",
  allTeams,
  targetPoints: 20,
  timesStolenInCycle: cycleRecord,
});
assert(
  stealAllImmune.isFromBank === true && stealAllImmune.stolenPoints === 20,
  "Khi tất cả đối thủ đều đã miễn nhiễm: Kẻ cướp nhận điểm từ Quỹ Hệ Thống mà không trừ ai"
);

console.log("\n========================================================");
console.log("TEST 4: RESET CHU KỲ KHI ĐẾN LƯỢT CHƠI CỦA ĐỘI MÌNH");
console.log("========================================================");

// Khi Đội 1 bước vào lượt chơi kế tiếp của mình
const stageForTeam1 = generateMysteryStageForTurn({
  turnIndex: 4,
  currentTeam: team1,
  teams: allTeams,
  timesStolenInCycle: cycleRecord,
});
assert(
  stageForTeam1.timesStolenInCycle?.["t1"] === 0,
  "Đến lượt chơi kế tiếp của Đội 1: timesStolenInCycle['t1'] được reset về 0 để mở chu kỳ mới"
);
assert(
  stageForTeam1.timesStolenInCycle?.["t2"] === 2,
  "Các đội khác vẫn giữ nguyên trạng thái bị cướp trong chu kỳ của họ"
);

console.log("\n🎉 TẤT CẢ CÁC BÀI TEST UNIT VÀ SIMULATION ĐÃ VƯỢT QUA 100%!");
