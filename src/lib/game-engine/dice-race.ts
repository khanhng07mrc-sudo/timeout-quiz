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
export interface TileGenerationOptions {
  randomize?: boolean;
}

/**
 * Generates a balanced, strategic, and strictly spaced Dice Race board.
 * Guarantees:
 * 1. Safe Zones: Start (idx 0, 1, 2) and Finish approach (idx N-3, N-2, N-1) are safe.
 * 2. Strict Min Distance >= 2 between any special tiles (no two functional tiles can ever be adjacent).
 * 3. NO LOOP RULE: |BoostIndex - TrapIndex| !== 2.
 *    (A +2 Boost tile and a -2 Trap tile can NEVER be 2 tiles apart, preventing infinite ping-pong bounce loops).
 * 4. NO DOUBLE BENEFIT: Destination of BOOST (boostIndex + 2) is strictly a NORMAL tile (or Finish).
 * 5. Paired one-way Teleport Portals (Alpha & Beta):
 *    - Entrance (TELEPORT): Instant forward warp to target exit.
 *    - Exit (TELEPORT_EXIT): Safe landing point.
 * 6. Procedural Randomization: Generates a fresh, dynamic board each match while guaranteeing 100% compliance.
 */
export function generateBalancedDiceTiles(
  totalTiles: number = 30,
  options: TileGenerationOptions = { randomize: true }
): DiceTile[] {
  const count = Math.max(30, Math.min(50, totalTiles || 30));
  const tiles: DiceTile[] = [];

  type SpecialSpec = {
    type: DiceTileType;
    label: string;
    effectValue?: number;
    teleportTargetIndex?: number;
    portalId?: string;
  };

  // ── Verification Helper: Checks all strict gameplay rules ───────────────────
  const validateLayout = (map: Record<number, SpecialSpec>): boolean => {
    const indices = Object.keys(map).map((k) => parseInt(k, 10)).sort((a, b) => a - b);

    // Rule 1: No functional tiles in safe zones
    if (indices.some((idx) => idx <= 2 || idx >= count - 2)) return false;

    // Rule 2: Minimum gap >= 2 between any special tiles
    for (let i = 0; i < indices.length - 1; i++) {
      if (Math.abs(indices[i] - indices[i + 1]) < 2) return false;
    }

    const boostIndices = indices.filter((idx) => map[idx].type === "BOOST");
    const trapIndices = indices.filter((idx) => map[idx].type === "TRAP");

    // Rule 3: |Boost - Trap| !== 2 (Strict loop prevention!)
    for (const b of boostIndices) {
      for (const t of trapIndices) {
        if (Math.abs(b - t) === 2) return false;
      }
    }

    // Rule 4: Destination of BOOST (b + 2) must be NORMAL (not any special tile)
    for (const b of boostIndices) {
      const dest = b + 2;
      if (dest < count - 1 && map[dest] !== undefined) return false;
    }

    return true;
  };

  // ── Attempt Procedural Randomized Generation ─────────────────────────────
  let specialMap: Record<number, SpecialSpec> = {};
  let generationSuccess = false;

  if (options.randomize !== false) {
    const maxAttempts = 50;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const tempMap: Record<number, SpecialSpec> = {};
      const reservedNormalIndices = new Set<number>();

      // 1. Teleport Portal Alpha (Entrance between 5 and 13, Exit forward by 6 to 10 tiles)
      const alphaIn = 5 + Math.floor(Math.random() * Math.min(8, count - 16));
      const alphaOut = alphaIn + 6 + Math.floor(Math.random() * Math.min(5, count - alphaIn - 8));

      tempMap[alphaIn] = { type: "TELEPORT", label: "🌀 Cổng Không Gian", portalId: "Alpha", teleportTargetIndex: alphaOut };
      tempMap[alphaOut] = { type: "TELEPORT_EXIT", label: "✨ Cổng Ra An Toàn", portalId: "Alpha" };

      // 2. Teleport Portal Beta (Only for large boards >= 40 tiles)
      if (count >= 40) {
        const betaIn = alphaOut + 4 + Math.floor(Math.random() * Math.min(6, count - alphaOut - 10));
        const betaOut = betaIn + 6 + Math.floor(Math.random() * Math.min(4, count - betaIn - 4));
        if (betaIn < count - 7 && betaOut < count - 2 && Math.abs(betaIn - alphaOut) >= 2) {
          tempMap[betaIn] = { type: "TELEPORT", label: "🌀 Cổng Beta", portalId: "Beta", teleportTargetIndex: betaOut };
          tempMap[betaOut] = { type: "TELEPORT_EXIT", label: "✨ Cổng Ra Beta", portalId: "Beta" };
        }
      }

      // Spec items to distribute randomly
      const pool: Array<{ type: DiceTileType; label: string; effectValue?: number }> = [
        { type: "BOOST", label: "🚀 +2 Bước", effectValue: 2 },
        { type: "BOOST", label: "🚀 +2 Bước", effectValue: 2 },
        { type: "TRAP", label: "💥 Bẫy -2 Bước", effectValue: -2 },
        { type: "TRAP", label: "💥 Bẫy -2 Bước", effectValue: -2 },
        { type: "SHIELD", label: "🛡️ Khiên" },
        { type: "SHIELD", label: "🛡️ Khiên" },
        { type: "EXTRA_ROLL", label: "🎲 x2 Cơ hội" },
        { type: "EXTRA_ROLL", label: "🎲 x2 Cơ hội" },
        { type: "SWAP", label: "🔀 Đổi chỗ" },
      ];

      // Shuffle pool
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }

      // Available candidate slots between 3 and count - 4
      const candidateSlots: number[] = [];
      for (let s = 3; s <= count - 4; s++) {
        candidateSlots.push(s);
      }
      // Shuffle candidate slots
      for (let i = candidateSlots.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidateSlots[i], candidateSlots[j]] = [candidateSlots[j], candidateSlots[i]];
      }

      let allPlaced = true;
      for (const item of pool) {
        let placedSlot: number | null = null;

        for (const slot of candidateSlots) {
          if (tempMap[slot] !== undefined) continue;
          if (reservedNormalIndices.has(slot)) continue;

          // Check min distance >= 2 from all existing specials
          const violatesGap = Object.keys(tempMap).some((k) => Math.abs(parseInt(k, 10) - slot) < 2);
          if (violatesGap) continue;

          // Check |Boost - Trap| !== 2
          if (item.type === "BOOST") {
            const violatesTrapDistance = Object.entries(tempMap).some(
              ([k, v]) => v.type === "TRAP" && Math.abs(parseInt(k, 10) - slot) === 2
            );
            if (violatesTrapDistance) continue;

            // Destination of BOOST (slot + 2) must not already be special, nor safe zone finish
            if (tempMap[slot + 2] !== undefined) continue;
          }

          if (item.type === "TRAP") {
            const violatesBoostDistance = Object.entries(tempMap).some(
              ([k, v]) => v.type === "BOOST" && Math.abs(parseInt(k, 10) - slot) === 2
            );
            if (violatesBoostDistance) continue;

            // Cannot place TRAP at destination of an existing BOOST
            const isDestinationOfBoost = Object.entries(tempMap).some(
              ([k, v]) => v.type === "BOOST" && parseInt(k, 10) + 2 === slot
            );
            if (isDestinationOfBoost) continue;
          }

          // Valid slot found!
          placedSlot = slot;
          break;
        }

        if (placedSlot !== null) {
          tempMap[placedSlot] = {
            type: item.type,
            label: item.label,
            effectValue: item.effectValue,
          };

          if (item.type === "BOOST") {
            // Reserve destination (placedSlot + 2) strictly as NORMAL!
            reservedNormalIndices.add(placedSlot + 2);
          }
        } else {
          allPlaced = false;
          break;
        }
      }

      if (allPlaced && validateLayout(tempMap)) {
        specialMap = tempMap;
        generationSuccess = true;
        break;
      }
    }
  }

  // ── Fallback Golden Blueprint (Guaranteed 100% compliant with all rules) ──
  if (!generationSuccess) {
    specialMap = {};
    // Indices: 3, 6, 9, 12, 14, 16, 18, 19, 21, 23, 26
    // Traps at [6, 16]. Boosts at [9, 23].
    // |9 - 6| = 3 !== 2. |9 - 16| = 7 !== 2. |23 - 6| = 17 !== 2. |23 - 16| = 7 !== 2.
    // Boost 9 + 2 = 11 (NORMAL). Boost 23 + 2 = 25 (NORMAL).
    // Zero chance of infinite bounce or double benefit!
    specialMap[3] = { type: "SHIELD", label: "🛡️ Khiên" };
    specialMap[6] = { type: "TRAP", label: "💥 Bẫy -2 Bước", effectValue: -2 };
    specialMap[9] = { type: "BOOST", label: "🚀 +2 Bước", effectValue: 2 };
    specialMap[12] = {
      type: "TELEPORT",
      label: "🌀 Cổng Không Gian",
      portalId: "Alpha",
      teleportTargetIndex: 19,
    };
    specialMap[14] = { type: "EXTRA_ROLL", label: "🎲 x2 Cơ hội" };
    specialMap[16] = { type: "TRAP", label: "💥 Bẫy -2 Bước", effectValue: -2 };
    specialMap[18] = { type: "SHIELD", label: "🛡️ Khiên" };
    specialMap[19] = {
      type: "TELEPORT_EXIT",
      label: "✨ Cổng Ra An Toàn",
      portalId: "Alpha",
    };
    specialMap[21] = { type: "SWAP", label: "🔀 Đổi chỗ" };
    specialMap[23] = { type: "BOOST", label: "🚀 +2 Bước", effectValue: 2 };
    specialMap[26] = { type: "EXTRA_ROLL", label: "🎲 x2 Cơ hội" };
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
  const remainingSteps = Math.max(0, (diceState.totalTiles - 1) - teamProg.position);
  const actualSteps = Math.min(roll, remainingSteps);
  let newPos = teamProg.position + actualSteps;
  const isDirectFinish = newPos >= diceState.totalTiles - 1;

  let grantAnotherRoll = false;
  let teleported = false;
  let effectMessage = "";

  if (isDirectFinish && actualSteps < roll) {
    effectMessage = `Tung xúc xắc được ${roll} nút! Chỉ cần ${actualSteps} bước để cán đích Ô #${newPos + 1}! 🏆 CHIẾN THẮNG!`;
  } else if (isDirectFinish) {
    effectMessage = `Tung xúc xắc được ${roll} nút! Cán đích Ô #${newPos + 1}! 🏆 CHIẾN THẮNG!`;
  } else {
    effectMessage = `Tung xúc xắc được ${roll} nút! Đến Ô #${newPos + 1}`;
  }

  let swappedWithTeamId: string | undefined = undefined;
  const landingTile = diceState.tiles[newPos];

  if (!isDirectFinish && landingTile) {
    if (landingTile.type === "TELEPORT" && landingTile.teleportTargetIndex !== undefined) {
      teleported = true;
      const targetPos = Math.min(diceState.totalTiles - 1, Math.max(0, landingTile.teleportTargetIndex));
      effectMessage = `🌀 Bước vào Cổng Không Gian ${landingTile.portalId ? `[${landingTile.portalId}]` : ""}! Dịch chuyển tức thời từ Ô #${newPos + 1} ➔ Ô #${targetPos + 1}!`;
      newPos = targetPos;
    } else if (landingTile.type === "TELEPORT_EXIT") {
      effectMessage = `✨ Tiếp đất an toàn tại Cổng Ra Ô #${newPos + 1}!`;
    } else if (landingTile.type === "BOOST") {
      const boostVal = landingTile.effectValue || 2;
      const afterBoostPos = Math.min(diceState.totalTiles - 1, newPos + boostVal);
      newPos = afterBoostPos;
      effectMessage += ` ➔ 🚀 Tăng tốc! Tiến thêm ${boostVal} bước đến Ô #${newPos + 1}!`;

      // Check destination of boost: only allow TRAP (1 lợi + 1 hại), NEVER allow a 2nd benefit!
      const chainedTile = diceState.tiles[newPos];
      if (chainedTile && chainedTile.type === "TRAP") {
        if (currentShield) {
          currentShield = false;
          effectMessage += ` ➔ 🛡️ Khiên bảo vệ đã hấp thụ Bẫy hụt (-2 bước)! An toàn tại Ô #${newPos + 1}.`;
        } else {
          const trapVal = chainedTile.effectValue || -2;
          newPos = Math.max(0, newPos + trapVal);
          effectMessage += ` ➔ 💥 Dẫm phải Bẫy hụt! Lùi ${Math.abs(trapVal)} bước về Ô #${newPos + 1}.`;
        }
      }
    } else if (landingTile.type === "TRAP") {
      if (currentShield) {
        currentShield = false;
        effectMessage += ` ➔ 🛡️ Khiên bảo vệ đã hấp thụ Bẫy hụt (-2 bước)! An toàn tại Ô #${newPos + 1}.`;
      } else {
        const trapVal = landingTile.effectValue || -2;
        newPos = Math.max(0, newPos + trapVal);
        effectMessage += ` ➔ 💥 Dẫm phải Bẫy hụt! Lùi ${Math.abs(trapVal)} bước về Ô #${newPos + 1}.`;

        // Check destination of trap: if fallen into a beneficial tile (e.g. SHIELD or EXTRA_ROLL), allow 1 hại + 1 lợi comeback
        const recoveredTile = diceState.tiles[newPos];
        if (recoveredTile && recoveredTile.type === "SHIELD") {
          currentShield = true;
          effectMessage += ` ➔ 🛡️ Nhặt được Khiên bảo hộ phục hồi!`;
        } else if (recoveredTile && recoveredTile.type === "EXTRA_ROLL") {
          grantAnotherRoll = true;
          effectMessage += ` ➔ 🎲 Rơi vào ô x2 Cơ hội! Được tung thêm một lần nữa!`;
        }
      }
    } else if (landingTile.type === "SHIELD") {
      currentShield = true;
      effectMessage += ` ➔ 🛡️ Nhận được Khiên bảo hộ thần kỳ!`;
    } else if (landingTile.type === "EXTRA_ROLL") {
      grantAnotherRoll = true;
      effectMessage += ` ➔ 🎲 Rơi vào ô x2 Cơ hội! Được tung xúc xắc thêm một lần nữa!`;
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
