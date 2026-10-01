import { DiceRaceState, DiceTile, DiceTileType } from "@/types";

/**
 * Generates a balanced, strategic, and strictly spaced Dice Race board.
 * Guarantees:
 * 1. Safe Zones: Start (idx 0, 1, 2) and Finish approach (idx N-3, N-2, N-1) are safe.
 * 2. Strict Min Distance >= 2 between any special tiles (no two functional tiles can ever be adjacent).
 * 3. Special tile density strictly capped at ~25-35%.
 * 4. Paired one-way Teleport Portals (Alpha & Beta):
 *    - Entrance (TELEPORT): Instant forward warp to target exit.
 *    - Exit (TELEPORT_EXIT): Safe landing point.
 * 5. Fully scalable for any totalTiles count from 30 to 50+.
 */
export function generateBalancedDiceTiles(totalTiles: number = 30): DiceTile[] {
  const count = Math.max(30, Math.min(50, totalTiles || 30));
  const tiles: DiceTile[] = [];

  // Special tile mapping: index -> spec
  const specialMap: Record<number, {
    type: DiceTileType;
    label: string;
    effectValue?: number;
    teleportTargetIndex?: number;
    portalId?: string;
  }> = {};

  if (count === 30) {
    // ── Exact Golden Blueprint for 30 tiles ─────────────────────────────────
    // Indices: 3, 5, 7, 10, 12 (Portal Alpha IN), 15, 17, 19 (Portal Alpha OUT), 22, 24, 26
    // All gaps strictly >= 2.
    specialMap[3] = { type: "SHIELD", label: "🛡️ Khiên" };
    specialMap[5] = { type: "BOOST", label: "🚀 +2 Bước", effectValue: 2 };
    specialMap[7] = { type: "EXTRA_ROLL", label: "🎲 x2 Cơ hội" };
    specialMap[10] = { type: "TRAP", label: "💥 Bẫy -2 Bước", effectValue: -2 };
    specialMap[12] = {
      type: "TELEPORT",
      label: "🌀 Cổng Không Gian",
      portalId: "Alpha",
      teleportTargetIndex: 19, // Ô #13 -> Ô #20
    };
    specialMap[15] = { type: "SHIELD", label: "🛡️ Khiên" };
    specialMap[17] = { type: "SWAP", label: "🔀 Đổi chỗ" };
    specialMap[19] = {
      type: "TELEPORT_EXIT",
      label: "✨ Cổng Ra An Toàn",
      portalId: "Alpha",
    };
    specialMap[22] = { type: "BOOST", label: "🚀 +2 Bước", effectValue: 2 };
    specialMap[24] = { type: "EXTRA_ROLL", label: "🎲 x2 Cơ hội" };
    specialMap[26] = { type: "TRAP", label: "💥 Bẫy -2 Bước", effectValue: -2 };
  } else {
    // ── Dynamic Scalable Blueprint for 31 - 50 tiles ────────────────────────
    const isLarge = count >= 40;

    // Helper to find nearest available index with >= 2 distance from all existing specials
    const findSafeIndex = (preferred: number, minBound = 3, maxBound = count - 4): number | null => {
      const candidates = [
        preferred,
        preferred + 1,
        preferred - 1,
        preferred + 2,
        preferred - 2,
      ].filter((idx) => idx >= minBound && idx <= maxBound);

      for (const cand of candidates) {
        const hasAdjacent = Object.keys(specialMap).some(
          (k) => Math.abs(parseInt(k, 10) - cand) < 2
        );
        if (!hasAdjacent) return cand;
      }
      return null;
    };

    // 1. Teleport Portal Alpha (Always present)
    const alphaInPreferred = Math.round(count * 0.35);
    const alphaOutPreferred = Math.round(count * 0.55);
    const alphaIn = findSafeIndex(alphaInPreferred);
    if (alphaIn !== null) {
      specialMap[alphaIn] = {
        type: "TELEPORT",
        label: "🌀 Cổng Alpha",
        portalId: "Alpha",
      };
    }
    const alphaOut = findSafeIndex(alphaOutPreferred);
    if (alphaOut !== null && alphaIn !== null) {
      specialMap[alphaOut] = {
        type: "TELEPORT_EXIT",
        label: "✨ Ra Cổng Alpha",
        portalId: "Alpha",
      };
      specialMap[alphaIn].teleportTargetIndex = alphaOut;
    }

    // 2. Teleport Portal Beta (For boards with >= 40 tiles)
    if (isLarge) {
      const betaInPreferred = Math.round(count * 0.65);
      const betaOutPreferred = Math.round(count * 0.83);
      const betaIn = findSafeIndex(betaInPreferred);
      if (betaIn !== null) {
        specialMap[betaIn] = {
          type: "TELEPORT",
          label: "🌀 Cổng Beta",
          portalId: "Beta",
        };
      }
      const betaOut = findSafeIndex(betaOutPreferred);
      if (betaOut !== null && betaIn !== null) {
        specialMap[betaOut] = {
          type: "TELEPORT_EXIT",
          label: "✨ Ra Cổng Beta",
          portalId: "Beta",
        };
        specialMap[betaIn].teleportTargetIndex = betaOut;
      }
    }

    // 3. Strategic Other Tiles
    const candidatesList: Array<{
      pct: number;
      type: DiceTileType;
      label: string;
      effectValue?: number;
    }> = [
      { pct: 0.10, type: "SHIELD", label: "🛡️ Khiên" },
      { pct: 0.18, type: "BOOST", label: "🚀 +2 Bước", effectValue: 2 },
      { pct: 0.25, type: "EXTRA_ROLL", label: "🎲 x2 Cơ hội" },
      { pct: 0.44, type: "TRAP", label: "💥 Bẫy -2 Bước", effectValue: -2 },
      { pct: 0.50, type: "SHIELD", label: "🛡️ Khiên" },
      { pct: 0.60, type: "SWAP", label: "🔀 Đổi chỗ" },
      { pct: 0.72, type: "BOOST", label: "🚀 +2 Bước", effectValue: 2 },
      { pct: 0.78, type: "EXTRA_ROLL", label: "🎲 x2 Cơ hội" },
      { pct: 0.88, type: "TRAP", label: "💥 Bẫy -2 Bước", effectValue: -2 },
    ];

    for (const item of candidatesList) {
      const prefIdx = Math.round(count * item.pct);
      const safeIdx = findSafeIndex(prefIdx);
      if (safeIdx !== null) {
        specialMap[safeIdx] = {
          type: item.type,
          label: item.label,
          effectValue: item.effectValue,
        };
      }
    }
  }

  // Build the complete tiles array
  for (let i = 0; i < count; i++) {
    if (i === 0) {
      tiles.push({ index: 0, type: "NORMAL", label: "Xuất phát" });
      continue;
    }
    if (i === count - 1) {
      tiles.push({ index: count - 1, type: "FINISH", label: "Về đích" });
      continue;
    }

    if (specialMap[i]) {
      const spec = specialMap[i];
      tiles.push({
        index: i,
        type: spec.type,
        label: spec.label,
        effectValue: spec.effectValue,
        teleportTargetIndex: spec.teleportTargetIndex,
        portalId: spec.portalId,
      });
    } else {
      tiles.push({
        index: i,
        type: "NORMAL",
        label: `Ô ${i + 1}`,
      });
    }
  }

  return tiles;
}

export interface DiceLandingResult {
  finalPosition: number;
  grantAnotherRoll: boolean;
  effectMessage: string;
  hasShield: boolean;
  teleported: boolean;
  swappedWithTeamId?: string;
}

/**
 * Handles landing effects when a pawn lands on a tile.
 * Includes Teleport, Boost, Trap, Shield, Swap, Extra Roll.
 */
export function handleDiceRaceLanding({
  diceState,
  teamId,
  roll,
}: {
  diceState: DiceRaceState;
  teamId: string;
  roll: number;
}): DiceLandingResult {
  const teamProg = diceState.teamPositions[teamId];
  if (!teamProg) {
    return {
      finalPosition: 0,
      grantAnotherRoll: false,
      effectMessage: "",
      hasShield: false,
      teleported: false,
    };
  }

  let currentShield = !!teamProg.hasShield;
  let newPos = Math.min(diceState.totalTiles - 1, teamProg.position + roll);
  const landingTile = diceState.tiles[newPos];

  let grantAnotherRoll = false;
  let teleported = false;
  let effectMessage = `Tung xúc xắc được ${roll} nút! Đến Ô #${newPos + 1}`;
  let swappedWithTeamId: string | undefined = undefined;

  if (landingTile) {
    if (landingTile.type === "TELEPORT" && landingTile.teleportTargetIndex !== undefined) {
      teleported = true;
      const targetPos = Math.min(diceState.totalTiles - 1, Math.max(0, landingTile.teleportTargetIndex));
      effectMessage = `🌀 Bước vào Cổng Không Gian ${landingTile.portalId ? `[${landingTile.portalId}]` : ""}! Dịch chuyển tức thời từ Ô #${newPos + 1} ➔ Ô #${targetPos + 1}!`;
      newPos = targetPos;
    } else if (landingTile.type === "TELEPORT_EXIT") {
      effectMessage = `✨ Tiếp đất an toàn tại Cổng Ra Ô #${newPos + 1}!`;
    } else if (landingTile.type === "BOOST") {
      const boostVal = landingTile.effectValue || 2;
      newPos = Math.min(diceState.totalTiles - 1, newPos + boostVal);
      effectMessage += ` ➔ 🚀 Tăng tốc! Tiến thêm ${boostVal} bước đến Ô #${newPos + 1}!`;
    } else if (landingTile.type === "TRAP") {
      if (currentShield) {
        currentShield = false;
        effectMessage += ` ➔ 🛡️ Khiên bảo vệ đã hấp thụ Bẫy hụt (-2 bước)! An toàn tại Ô #${newPos + 1}.`;
      } else {
        const trapVal = landingTile.effectValue || -2;
        newPos = Math.max(0, newPos + trapVal);
        effectMessage += ` ➔ 💥 Dẫm phải Bẫy hụt! Lùi ${Math.abs(trapVal)} bước về Ô #${newPos + 1}.`;
      }
    } else if (landingTile.type === "SHIELD") {
      currentShield = true;
      effectMessage += ` ➔ 🛡️ Nhận được Khiên bảo hộ thần kỳ!`;
    } else if (landingTile.type === "EXTRA_ROLL") {
      if (!diceState.extraRollGranted) {
        grantAnotherRoll = true;
        effectMessage += ` ➔ 🎲 Rơi vào ô x2 Cơ hội! Được tung xúc xắc thêm một lần nữa!`;
      }
    } else if (landingTile.type === "SWAP") {
      const otherTeams = Object.values(diceState.teamPositions).filter((t) => t.teamId !== teamId);
      otherTeams.sort((a, b) => b.position - a.position);
      if (otherTeams.length > 0 && otherTeams[0].position > newPos) {
        const opp = otherTeams[0];
        if (opp.hasShield) {
          opp.hasShield = false;
          effectMessage += ` ➔ 🔀 Cố hoán đổi vị trí với ${opp.teamName} nhưng bị Khiên đối thủ chặn đứng!`;
        } else {
          const tempPos = opp.position;
          opp.position = newPos;
          newPos = tempPos;
          swappedWithTeamId = opp.teamId;
          effectMessage += ` ➔ 🔀 Hoán đổi vị trí thần thánh với ${opp.teamName}! Bạn vọt lên Ô #${newPos + 1}!`;
        }
      } else {
        effectMessage += ` ➔ 🔀 Ô Đổi chỗ, nhưng không có đối thủ nào phía trước để hoán đổi.`;
      }
    }
  }

  return {
    finalPosition: newPos,
    grantAnotherRoll,
    effectMessage,
    hasShield: currentShield,
    teleported,
    swappedWithTeamId,
  };
}
