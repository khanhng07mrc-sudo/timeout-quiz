import { CardType, TeamState, QuestionState, GameMode } from "@/types";
import { computeStealAmount } from "./scoring";

/**
 * Filter power-ups strictly matched to the mechanics and victory conditions of each game mode:
 * - DICE_RACE: Only allows quiz-helping cards (50/50, TIME_PLUS, SKIP). Disallows FREEZE, ATTACK, and score cards.
 * - BUZZ: Allows score boosts, shields, 50/50 and penalty. Disallows FREEZE and ATTACK to preserve fast reflex buzzer tempo.
 * - BOUNCEBACK: Olympia style - allows DOUBLE (Hope Star), SHIELD, 50/50, TIME_PLUS.
 * - GRID_CARO: Allows 50/50, TIME_PLUS, SKIP, DOUBLE, SHIELD. Disallows FREEZE.
 * - ELIMINATION: Allows SHIELD, DOUBLE, SCORE_X2, 50/50, TIME_PLUS, SKIP, STEAL.
 * - TOURNAMENT: 1v1 bracket - allows 50/50, TIME_PLUS, SKIP, DOUBLE, SCORE_X2, SHIELD.
 * - CLASSIC / POWERUP: Full 10 cards enabled.
 * - WAGER: Secret bets - allows 50/50, TIME_PLUS, SKIP, SHIELD.
 */
export const DEFAULT_ALLOWED_POWERUPS_BY_MODE: Record<GameMode, CardType[]> = {
  // DICE_RACE: Nước rút (+2 bước), Bứt phá (+1 bước), Thêm giờ, 50/50, Đổi câu. Cấm thẻ trừ điểm và STEAL.
  DICE_RACE: ["DOUBLE", "SCORE_X2", "TIME_PLUS", "FIFTY_FIFTY", "SKIP"],
  // GRID_CARO: 50/50, Thêm giờ, Đổi câu, Chiếm thành x2, Khiên bảo vệ. Cấm thẻ trừ điểm đối thủ.
  GRID_CARO: ["FIFTY_FIFTY", "TIME_PLUS", "SKIP", "DOUBLE", "SHIELD"],
  // BUZZ: Bấm chuông nhanh -> DOUBLE, SCORE_X2, SHIELD, PENALTY, 50/50. CẤM FREEZE, ATTACK, TIME_PLUS.
  BUZZ: ["DOUBLE", "SCORE_X2", "SHIELD", "PENALTY", "FIFTY_FIFTY"],
  // BOUNCEBACK: Về đích Olympia -> DOUBLE (Ngôi sao hy vọng), SCORE_X2 (Ngôi sao an toàn), SHIELD, 50/50, TIME_PLUS.
  BOUNCEBACK: ["DOUBLE", "SCORE_X2", "SHIELD", "FIFTY_FIFTY", "TIME_PLUS"],
  // ELIMINATION: Sinh tồn -> SHIELD (Khiên sinh tồn), DOUBLE, SCORE_X2, 50/50, TIME_PLUS, SKIP, STEAL. Cấm FREEZE, ATTACK, PENALTY.
  ELIMINATION: ["SHIELD", "DOUBLE", "SCORE_X2", "FIFTY_FIFTY", "TIME_PLUS", "SKIP", "STEAL"],
  // TOURNAMENT: 1v1 đối kháng thuần kỹ năng -> 50/50, TIME_PLUS, SKIP, DOUBLE, SCORE_X2, SHIELD. CẤM FREEZE và STEAL.
  TOURNAMENT: ["FIFTY_FIFTY", "TIME_PLUS", "SKIP", "DOUBLE", "SCORE_X2", "SHIELD"],
  // WAGER: Cược điểm -> 50/50, TIME_PLUS, SKIP, SHIELD (Bảo hiểm cược). CẤM các thẻ triệt hạ (FREEZE, ATTACK, STEAL).
  WAGER: ["FIFTY_FIFTY", "TIME_PLUS", "SKIP", "SHIELD"],
  // CLASSIC / POWERUP: Toàn bộ 10 thẻ.
  CLASSIC: ["FIFTY_FIFTY", "DOUBLE", "FREEZE", "ATTACK", "SKIP", "TIME_PLUS", "SHIELD", "STEAL", "PENALTY", "SCORE_X2"],
  POWERUP: ["FIFTY_FIFTY", "DOUBLE", "FREEZE", "ATTACK", "SKIP", "TIME_PLUS", "SHIELD", "STEAL", "PENALTY", "SCORE_X2"],
};

export function getDefaultAllowedPowerupsForMode(mode: GameMode): CardType[] {
  return DEFAULT_ALLOWED_POWERUPS_BY_MODE[mode] || DEFAULT_ALLOWED_POWERUPS_BY_MODE.CLASSIC;
}

export function isPowerupAllowedForMode(mode: GameMode, cardType: CardType): boolean {
  const allowed = getDefaultAllowedPowerupsForMode(mode);
  return allowed.includes(cardType);
}

export interface PowerupEffect {
  type: CardType;
  description: string;
  descriptionVi: string;
  // Mutations to apply
  mutations: PowerupMutation[];
}

export type PowerupMutation =
  | { kind: "freeze_team"; teamId: string; rounds: number }
  | { kind: "add_time"; seconds: number }
  | { kind: "fifty_fifty"; questionId: string }
  | { kind: "skip_question" }
  | { kind: "add_shield"; teamId: string }
  | { kind: "set_multiplier"; teamId: string; multiplier: number }
  | { kind: "steal_points"; fromTeamId: string; toTeamId: string; amount: number }
  | { kind: "apply_penalty_multiplier"; teamId: string; multiplier: number }
  | { kind: "score_x2"; teamId: string };

export function resolvePowerup({
  cardType,
  usedByTeam,
  targetTeam,
  teams,
  questionState,
  mode,
}: {
  cardType: CardType;
  usedByTeam: TeamState;
  targetTeam?: TeamState;
  teams: TeamState[];
  questionState: QuestionState;
  mode?: GameMode;
}): PowerupEffect {
  switch (cardType) {
    case "FREEZE":
      return {
        type: cardType,
        description: `${targetTeam?.name ?? "Team"} is frozen for 1 round!`,
        descriptionVi: `Đội ${targetTeam?.name ?? ""} bị phong tỏa 1 lượt!`,
        mutations: [{ kind: "freeze_team", teamId: targetTeam!.id, rounds: 1 }],
      };

    case "TIME_PLUS":
      return {
        type: cardType,
        description: "Added 15 seconds!",
        descriptionVi: "Thêm 15 giây!",
        mutations: [{ kind: "add_time", seconds: 15 }],
      };

    case "FIFTY_FIFTY":
      return {
        type: cardType,
        description: "Removed 2 wrong answers!",
        descriptionVi: "Loại bỏ 2 đáp án sai!",
        mutations: [{ kind: "fifty_fifty", questionId: questionState.question.id }],
      };

    case "SKIP":
      return {
        type: cardType,
        description: "Question replaced with a new one!",
        descriptionVi: "Câu hỏi đã được đổi!",
        mutations: [{ kind: "skip_question" }],
      };

    case "SHIELD": {
      let descVi = "Kích hoạt tái sinh! Bảo vệ khỏi bị trừ điểm lần tới.";
      if (mode === "ELIMINATION") {
        descVi = "Khiên sinh tồn: Bảo vệ đội khỏi bị loại trực tiếp ở cuối vòng đấu hiện tại!";
      } else if (mode === "WAGER") {
        descVi = "Bảo hiểm cược: Nếu trả lời sai chỉ bị trừ 50% số điểm cược!";
      }
      return {
        type: cardType,
        description: "Shield activated!",
        descriptionVi: descVi,
        mutations: [{ kind: "add_shield", teamId: usedByTeam.id }],
      };
    }

    case "DOUBLE": {
      let descVi = "Câu đúng tiếp theo được nhân đôi điểm!";
      if (mode === "BOUNCEBACK") {
        descVi = "Ngôi sao hy vọng: Đúng x2 điểm (+200%), Sai bị trừ 100% điểm câu hỏi!";
      } else if (mode === "DICE_RACE") {
        descVi = "Nước rút: +2 bước xúc xắc khi trả lời đúng!";
      } else if (mode === "GRID_CARO") {
        descVi = "Chiếm thành: Ô cờ chiếm được tính thành 2 điểm!";
      }
      return {
        type: cardType,
        description: "Next correct answer is worth double!",
        descriptionVi: descVi,
        mutations: [{ kind: "set_multiplier", teamId: usedByTeam.id, multiplier: 2 }],
      };
    }

    case "SCORE_X2": {
      let descVi = "Đúng x1.5 điểm, sai không bị trừ (bảo toàn điểm)!";
      if (mode === "DICE_RACE") {
        descVi = "Bứt phá: +1 bước xúc xắc khi trả lời đúng!";
      } else if (mode === "BOUNCEBACK") {
        descVi = "Ngôi sao an toàn: Đúng x1.5 điểm, Sai không bị trừ điểm!";
      }
      return {
        type: cardType,
        description: "Correct = x1.5 points, Wrong = 0 penalty!",
        descriptionVi: descVi,
        mutations: [
          { kind: "score_x2", teamId: usedByTeam.id },
        ],
      };
    }

    case "STEAL": {
      const leader = [...teams].sort((a, b) => b.score - a.score)[0];
      if (!leader || leader.id === usedByTeam.id) {
        return {
          type: cardType,
          description: "No team to steal from!",
          descriptionVi: "Không có đội nào để cướp điểm!",
          mutations: [],
        };
      }
      const amount = computeStealAmount(leader.score, usedByTeam.score);
      return {
        type: cardType,
        description: `Stole ${amount} points from ${leader.name}!`,
        descriptionVi: `Cướp ${amount} điểm từ đội ${leader.name}!`,
        mutations: [{ kind: "steal_points", fromTeamId: leader.id, toTeamId: usedByTeam.id, amount }],
      };
    }

    case "ATTACK":
      return {
        type: cardType,
        description: `${targetTeam?.name ?? "Team"} must answer! Wrong = -penalty`,
        descriptionVi: `Đội ${targetTeam?.name ?? ""} phải trả lời! Sai bị trừ điểm!`,
        mutations: [],  // Attack logic handled in game engine
      };

    case "PENALTY":
      return {
        type: cardType,
        description: `${targetTeam?.name ?? "Team"}'s wrong answers penalized x2!`,
        descriptionVi: `Đội ${targetTeam?.name ?? ""} bị phạt đôi khi sai!`,
        mutations: [
          { kind: "apply_penalty_multiplier", teamId: targetTeam!.id, multiplier: 2 },
        ],
      };

    default:
      return { type: cardType, description: "Unknown card", descriptionVi: "Thẻ không xác định", mutations: [] };
  }
}
