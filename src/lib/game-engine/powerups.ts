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
  // BOUNCEBACK: Về đích Olympia -> SCORE_X2 (Ngôi sao an toàn), DOUBLE (Ngôi sao hy vọng), SHIELD (Khiên), FIFTY_FIFTY (50/50), SKIP (Đổi câu), TIME_PLUS.
  // Quy tắc: Không được vừa dùng SHIELD vừa dùng SCORE_X2 trong 1 câu; Toàn bộ thẻ bị khóa ở pha cướp chuông.
  BOUNCEBACK: ["SCORE_X2", "DOUBLE", "FIFTY_FIFTY", "SHIELD", "SKIP", "TIME_PLUS"],
  // BUZZ: Bấm chuông nhanh -> FREEZE (Đóng băng chuông), SCORE_X2, DOUBLE, STEAL, SHIELD, PENALTY, SKIP, TIME_PLUS.
  // CẤM FIFTY_FIFTY vì câu hỏi chung, cấm dùng thẻ SAU KHI đã bấm chuông.
  BUZZ: ["FREEZE", "SCORE_X2", "DOUBLE", "STEAL", "SHIELD", "PENALTY", "SKIP", "TIME_PLUS"],
  // ELIMINATION: Sinh tồn -> SHIELD (Safe pass cứu nguy 1 lần nếu chót bảng vòng hiện tại), DOUBLE, SCORE_X2, FREEZE, SKIP, TIME_PLUS.
  ELIMINATION: ["SHIELD", "DOUBLE", "SCORE_X2", "FREEZE", "SKIP", "TIME_PLUS"],
  // TOURNAMENT: 1v1 đối kháng trực diện -> ATTACK (Ép trả lời 10s), STEAL (Cướp lượt), PENALTY (Gấp đôi phạt), SHIELD (Kháng công), DOUBLE, SCORE_X2, FREEZE, SKIP, TIME_PLUS.
  TOURNAMENT: ["ATTACK", "STEAL", "PENALTY", "SHIELD", "DOUBLE", "SCORE_X2", "FREEZE", "SKIP", "TIME_PLUS"],
  // GRID_CARO: Bàn cờ chiến thuật -> DOUBLE, SCORE_X2, FREEZE, SHIELD, SKIP, TIME_PLUS.
  GRID_CARO: ["DOUBLE", "SCORE_X2", "FREEZE", "SHIELD", "SKIP", "TIME_PLUS"],
  // DICE_RACE: Nước rút (+2 bước), Bứt phá (+1 bước), Thêm giờ, 50/50, Đổi câu.
  DICE_RACE: ["DOUBLE", "SCORE_X2", "TIME_PLUS", "FIFTY_FIFTY", "SKIP"],
  // WAGER: Cược điểm -> FIFTY_FIFTY, SHIELD (Bảo hiểm cược mất 50%), TIME_PLUS, SKIP. CẤM STEAL và FREEZE.
  WAGER: ["FIFTY_FIFTY", "SHIELD", "TIME_PLUS", "SKIP"],
  // CLASSIC: Toàn bộ 10 thẻ.
  CLASSIC: ["FIFTY_FIFTY", "DOUBLE", "FREEZE", "ATTACK", "SKIP", "TIME_PLUS", "SHIELD", "STEAL", "PENALTY", "SCORE_X2"],
};

export function getDefaultAllowedPowerupsForMode(mode: GameMode): CardType[] {
  return DEFAULT_ALLOWED_POWERUPS_BY_MODE[mode] || DEFAULT_ALLOWED_POWERUPS_BY_MODE.CLASSIC;
}

export function isPowerupAllowedForMode(mode: GameMode, cardType: CardType): boolean {
  const allowed = getDefaultAllowedPowerupsForMode(mode);
  return allowed.includes(cardType);
}

export const SHARED_POWERUP_TYPES: CardType[] = ["TIME_PLUS", "SKIP"];

export function isSharedPowerup(cardType: CardType): boolean {
  return SHARED_POWERUP_TYPES.includes(cardType);
}

export function isPrivatePowerup(cardType: CardType): boolean {
  return !SHARED_POWERUP_TYPES.includes(cardType);
}

export const DEFAULT_SHARED_POWERUP_PROBABILITY = 0.10; // 10% low drop rate

/**
 * Distributes power-up cards to teams according to the rules:
 * - Shared power-ups (TIME_PLUS, SKIP) are scarce: at most `sharedQuota` teams in the room get ONE shared card.
 * - Each eligible candidate has a low drop probability (default: 10%), ensuring shared cards remain rare.
 * - Remaining slots for those teams, and ALL slots for other teams, are drawn strictly from private power-ups.
 * - Returns a Map of teamId -> CardType[]
 */
export function distributeCategorizedCardsToTeams(
  teamIds: string[],
  allowedTypes: CardType[],
  cardsPerTeam: number = 2,
  sharedQuota?: number,
  sharedProbability: number = DEFAULT_SHARED_POWERUP_PROBABILITY
): Map<string, CardType[]> {
  const result = new Map<string, CardType[]>();
  if (teamIds.length === 0 || allowedTypes.length === 0 || cardsPerTeam <= 0) {
    return result;
  }

  const sharedAllowed = allowedTypes.filter((t) => isSharedPowerup(t));
  const privateAllowed = allowedTypes.filter((t) => !isSharedPowerup(t));
  const safePrivatePool = privateAllowed.length > 0 ? privateAllowed : allowedTypes;

  // At most sharedQuota teams (default: 1 if <=3 teams, 2 if >=4 teams)
  const effectiveQuota = sharedQuota !== undefined ? sharedQuota : (teamIds.length <= 3 ? 1 : 2);
  const numLuckyCandidates = Math.min(teamIds.length, effectiveQuota);

  // Randomly pick candidate teams without mutating original array
  const shuffledTeams = [...teamIds].sort(() => Math.random() - 0.5);
  const candidateTeams = shuffledTeams.slice(0, numLuckyCandidates);

  // Apply low drop probability to candidates (at most effectiveQuota, each rolls with low probability)
  const luckyTeamIds = new Set<string>();
  const effectiveProb = Math.max(0.01, Math.min(1.0, sharedProbability));
  for (const candidateId of candidateTeams) {
    if (Math.random() < effectiveProb) {
      luckyTeamIds.add(candidateId);
    }
  }

  for (const teamId of teamIds) {
    const cards: CardType[] = [];
    const isLucky = luckyTeamIds.has(teamId) && sharedAllowed.length > 0;

    if (isLucky) {
      const randomShared = sharedAllowed[Math.floor(Math.random() * sharedAllowed.length)];
      cards.push(randomShared);
    }

    while (cards.length < cardsPerTeam) {
      const randomPrivate = safePrivatePool[Math.floor(Math.random() * safePrivatePool.length)];
      cards.push(randomPrivate);
    }

    result.set(teamId, cards);
  }

  return result;
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
