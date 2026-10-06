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
/**
 * Generates a balanced, strategic, and strictly spaced Dice Race marathon board (60 - 100 tiles).
 * Guarantees:
 * 1. Safe Zones: Start (idx 0 to 4) and Finish approach (idx N-5 to N-1) are 100% safe.
 * 2. Strict Min Distance >= 3 between any special tiles (no two functional tiles close together).
 * 3. Special tile density strictly capped at ~15-20%.
 * 4. Paired one-way Teleport Portals (Alpha & Beta, max 5-7 tiles warp).
 * 5. Fully scalable for any totalTiles count from 60 to 100.
 */
export interface TileGenerationOptions {
  randomize?: boolean;
}

export function generateBalancedDiceTiles(
  totalTiles: number = 60,
  options: TileGenerationOptions = { randomize: true }
): DiceTile[] {
  const count = Math.max(60, Math.min(100, totalTiles || 60));
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

    // Rule 1: No functional tiles in safe zones (First 5 tiles and Last 5 tiles are strictly normal)
    if (indices.some((idx) => idx <= 4 || idx >= count - 5)) return false;

    // Rule 2: Minimum gap >= 3 between any special tiles
    for (let i = 0; i < indices.length - 1; i++) {
      if (Math.abs(indices[i] - indices[i + 1]) < 3) return false;
    }

    const boostIndices = indices.filter((idx) => map[idx].type === "BOOST");
    const trapIndices = indices.filter((idx) => map[idx].type === "TRAP");
    const extraRollIndices = indices.filter((idx) => map[idx].type === "EXTRA_ROLL");

    // Rule 3: |Boost - Trap| !== 2 (Strict loop prevention!)
    for (const b of boostIndices) {
      for (const t of trapIndices) {
        if (Math.abs(b - t) === 2) return false;
      }
    }

    // Rule 4: 2 ô sau ô tiến hai bước (+2 BOOST) phải là ô bình thường (b + 1, b + 2)
    for (const b of boostIndices) {
      if (map[b + 1] !== undefined) return false;
      if (map[b + 2] !== undefined) return false;
    }

    // Rule 5: 2 ô trước ô bẫy (-2 TRAP) phải là ô bình thường (t - 1, t - 2)
    for (const t of trapIndices) {
      if (map[t - 1] !== undefined) return false;
      if (map[t - 2] !== undefined) return false;
    }

    // Rule 6: Hai ô x2 cơ hội (EXTRA_ROLL) phải cách nhau ít nhất 12 ô
    for (let i = 0; i < extraRollIndices.length; i++) {
      for (let j = i + 1; j < extraRollIndices.length; j++) {
        if (Math.abs(extraRollIndices[i] - extraRollIndices[j]) < 12) return false;
      }
    }

    return true;
  };

  // ── Attempt Procedural Randomized Generation ─────────────────────────────
  let specialMap: Record<number, SpecialSpec> = {};
  let generationSuccess = false;

  if (options.randomize !== false) {
    const maxAttempts = 100;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const tempMap: Record<number, SpecialSpec> = {};
      const reservedNormalIndices = new Set<number>();

      // 1. Teleport Portal Alpha (Entrance between 12 and 16, Exit forward by 5 to 7 tiles)
      const alphaIn = 12 + Math.floor(Math.random() * 5);
      const alphaOut = alphaIn + 5 + Math.floor(Math.random() * 3);

      tempMap[alphaIn] = { type: "TELEPORT", label: "🌀 Cổng Không Gian", portalId: "Alpha", teleportTargetIndex: alphaOut };
      tempMap[alphaOut] = { type: "TELEPORT_EXIT", label: "✨ Cổng Ra An Toàn", portalId: "Alpha" };

      // 2. Teleport Portal Beta (Only for boards >= 80 tiles)
      if (count >= 80) {
        const betaIn = alphaOut + 15 + Math.floor(Math.random() * 10);
        const betaOut = betaIn + 5 + Math.floor(Math.random() * 3);
        if (betaIn < count - 15 && betaOut < count - 5 && Math.abs(betaIn - alphaOut) >= 4) {
          tempMap[betaIn] = { type: "TELEPORT", label: "🌀 Cổng Beta", portalId: "Beta", teleportTargetIndex: betaOut };
          tempMap[betaOut] = { type: "TELEPORT_EXIT", label: "✨ Cổng Ra Beta", portalId: "Beta" };
        }
      }

      // Spec items to distribute randomly (Strictly 15 - 20% density)
      const pool: Array<{ type: DiceTileType; label: string; effectValue?: number }> = [
        { type: "BOOST", label: "🚀 +2 Bước", effectValue: 2 },
        { type: "BOOST", label: "🚀 +2 Bước", effectValue: 2 },
        { type: "TRAP", label: "💥 Bẫy -2 Bước", effectValue: -2 },
        { type: "TRAP", label: "💥 Bẫy -2 Bước", effectValue: -2 },
        { type: "SHIELD", label: "🛡️ Khiên" },
        { type: "SHIELD", label: "🛡️ Khiên" },
        { type: "EXTRA_ROLL", label: "🎲 x2 Cơ hội" },
        { type: "EXTRA_ROLL", label: "🎲 x2 Cơ hội" },
        { type: "SWAP", label: "🔀 Vượt mặt" },
      ];

      if (count >= 80) {
        pool.push(
          { type: "BOOST", label: "🚀 +2 Bước", effectValue: 2 },
          { type: "TRAP", label: "💥 Bẫy -2 Bước", effectValue: -2 },
          { type: "SWAP", label: "🔀 Vượt mặt" }
        );
      }
      if (count >= 100) {
        pool.push({ type: "SHIELD", label: "🛡️ Khiên" });
      }

      // Shuffle pool
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }

      // Available candidate slots: Safe zones 0..4 (start) and count-5..count-1 (finish) are excluded!
      const candidateSlots: number[] = [];
      for (let s = 5; s <= count - 6; s++) {
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

          // Check min distance >= 3 from all existing specials
          const violatesGap = Object.keys(tempMap).some((k) => Math.abs(parseInt(k, 10) - slot) < 3);
          if (violatesGap) continue;

          // Check |Boost - Trap| !== 2 and 2 normal tiles after Boost
          if (item.type === "BOOST") {
            const violatesTrapDistance = Object.entries(tempMap).some(
              ([k, v]) => v.type === "TRAP" && Math.abs(parseInt(k, 10) - slot) === 2
            );
            if (violatesTrapDistance) continue;

            if (slot + 2 >= count - 1) continue;
            if (tempMap[slot + 1] !== undefined || tempMap[slot + 2] !== undefined) continue;
          }

          // Check 2 normal tiles before Trap
          if (item.type === "TRAP") {
            const violatesBoostDistance = Object.entries(tempMap).some(
              ([k, v]) => v.type === "BOOST" && Math.abs(parseInt(k, 10) - slot) === 2
            );
            if (violatesBoostDistance) continue;

            if (slot - 2 <= 0) continue;
            if (tempMap[slot - 1] !== undefined || tempMap[slot - 2] !== undefined) continue;
          }

          // Check min 12 tiles between two Extra Roll tiles
          if (item.type === "EXTRA_ROLL") {
            const violatesExtraRollGap = Object.entries(tempMap).some(
              ([k, v]) => v.type === "EXTRA_ROLL" && Math.abs(parseInt(k, 10) - slot) < 12
            );
            if (violatesExtraRollGap) continue;
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
            reservedNormalIndices.add(placedSlot + 1);
            reservedNormalIndices.add(placedSlot + 2);
          }
          if (item.type === "TRAP") {
            reservedNormalIndices.add(placedSlot - 1);
            reservedNormalIndices.add(placedSlot - 2);
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

  // ── Fallback Golden Blueprint (Guaranteed 100% compliant with all rules for 60 - 100 tiles) ──
  if (!generationSuccess) {
    specialMap = {};
    // Proportional mapping based on count
    const scale = (idx: number) => Math.round((idx / 60) * count);
    const iExtra1 = scale(8);
    const iBoost1 = scale(11);
    const iTeleIn = scale(14);
    const iShield1 = scale(17);
    const iTeleOut = scale(20);
    const iTrap1 = scale(24);
    const iSwap = scale(28);
    const iExtra2 = scale(32);
    const iBoost2 = scale(36);
    const iShield2 = scale(40);
    const iBoost3 = scale(44);
    const iTrap2 = scale(48);

    specialMap[iExtra1] = { type: "EXTRA_ROLL", label: "🎲 x2 Cơ hội" };
    specialMap[iBoost1] = { type: "BOOST", label: "🚀 +2 Bước", effectValue: 2 };
    specialMap[iTeleIn] = {
      type: "TELEPORT",
      label: "🌀 Cổng Không Gian",
      portalId: "Alpha",
      teleportTargetIndex: iTeleOut,
    };
    specialMap[iShield1] = { type: "SHIELD", label: "🛡️ Khiên" };
    specialMap[iTeleOut] = {
      type: "TELEPORT_EXIT",
      label: "✨ Cổng Ra An Toàn",
      portalId: "Alpha",
    };
    specialMap[iTrap1] = { type: "TRAP", label: "💥 Bẫy -2 Bước", effectValue: -2 };
    specialMap[iSwap] = { type: "SWAP", label: "🔀 Vượt mặt" };
    specialMap[iExtra2] = { type: "EXTRA_ROLL", label: "🎲 x2 Cơ hội" };
    specialMap[iBoost2] = { type: "BOOST", label: "🚀 +2 Bước", effectValue: 2 };
    specialMap[iShield2] = { type: "SHIELD", label: "🛡️ Khiên" };
    specialMap[iBoost3] = { type: "BOOST", label: "🚀 +2 Bước", effectValue: 2 };
    specialMap[iTrap2] = { type: "TRAP", label: "💥 Bẫy -2 Bước", effectValue: -2 };
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
      const teamsAhead = Object.values(diceState.teamPositions)
        .filter((t) => t.teamId !== teamId && t.position > newPos)
        .sort((a, b) => a.position - b.position); // Ascending: smallest position ahead is immediate frontrunner

      if (teamsAhead.length > 0) {
        const opp = teamsAhead[0]; // Đội đứng ngay liền kề phía trước mình!
        if (opp.hasShield) {
          opp.hasShield = false;
          effectMessage += ` ➔ 🔀 Cố vượt mặt đổi chỗ với ${opp.teamName} nhưng bị Khiên đối thủ chặn đứng!`;
        } else {
          const tempPos = opp.position;
          opp.position = newPos;
          newPos = tempPos;
          swappedWithTeamId = opp.teamId;
          effectMessage += ` ➔ 🔀 Vượt mặt ngoạn mục! Hoán đổi vị trí với ${opp.teamName} đứng liền trước! Bạn vọt lên Ô #${newPos + 1}!`;
        }
      } else {
        const bonusPos = Math.min(diceState.totalTiles - 1, newPos + 2);
        newPos = bonusPos;
        effectMessage += ` ➔ 🔀 Ô Vượt mặt: Bạn đang dẫn đầu cuộc đua! Tăng tốc thêm +2 bước đến Ô #${newPos + 1}!`;
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
