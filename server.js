"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_http = require("http");
var import_url = require("url");
var import_next = __toESM(require("next"));

// src/lib/socket-server.ts
var import_socket = require("socket.io");
var io;
function initSocketServer(httpServer) {
  if (io) return io;
  io = new import_socket.Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        callback(null, true);
      },
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ["websocket", "polling"],
    pingTimeout: 2e4,
    pingInterval: 1e4,
    perMessageDeflate: false
  });
  return io;
}

// src/lib/socket-handlers.ts
var import_async_hooks = require("async_hooks");

// src/lib/prisma.ts
var import_client = require("@prisma/client");
var globalForPrisma = globalThis;
var prisma = globalForPrisma.prisma ?? new import_client.PrismaClient({
  log: ["error"]
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// src/types/index.ts
var CARD_METADATA = {
  FIFTY_FIFTY: {
    emoji: "\u{1F500}",
    name: "50/50",
    nameVi: "50/50",
    summaryVi: "B\u1ECF 2 \u0111\xE1p \xE1n sai",
    descriptionVi: "Lo\u1EA1i b\u1ECF 2 ph\u01B0\u01A1ng \xE1n sai",
    description: "Remove 2 wrong answers",
    detailVi: "H\u1EC7 th\u1ED1ng t\u1EF1 \u0111\u1ED9ng g\u1EA1ch b\u1ECF ng\u1EABu nhi\xEAn 2 ph\u01B0\u01A1ng \xE1n sai, gi\xFAp t\u0103ng x\xE1c su\u1EA5t ch\u1ECDn \u0111\xFAng l\xEAn 50%.",
    requiresTarget: false,
    tag: "H\u1ED7 tr\u1EE3",
    color: "#3b82f6",
    scope: "PRIVATE"
  },
  DOUBLE: {
    emoji: "\u2716\uFE0F2",
    name: "Double",
    nameVi: "Nh\xE2n \u0111\xF4i",
    summaryVi: "\u0110\xFAng x2 / Sai b\u1ECB ph\u1EA1t",
    descriptionVi: "\u0110\xFAng x2 \u0111i\u1EC3m, Sai b\u1ECB tr\u1EEB \u0111i\u1EC3m ph\u1EA1t",
    description: "Double points next, penalty on wrong",
    detailVi: "Th\u1EBB c\u01B0\u1EE3c m\u1EA1o hi\u1EC3m: Tr\u1EA3 l\u1EDDi \u0110\xDANG \u0111\u01B0\u1EE3c nh\xE2n \u0111\xF4i s\u1ED1 \u0111i\u1EC3m (+200%). Nh\u01B0ng n\u1EBFu tr\u1EA3 l\u1EDDi SAI v\u1EABn b\u1ECB tr\u1EEB \u0111i\u1EC3m ph\u1EA1t b\xECnh th\u01B0\u1EDDng!",
    correctEffectVi: "+200% s\u1ED1 \u0111i\u1EC3m c\xE2u h\u1ECFi (x2)",
    wrongEffectVi: "-50% s\u1ED1 \u0111i\u1EC3m c\xE2u h\u1ECFi (B\u1ECB ph\u1EA1t)",
    requiresTarget: false,
    tag: "M\u1EA1o hi\u1EC3m",
    color: "#f59e0b",
    scope: "PRIVATE"
  },
  SCORE_X2: {
    emoji: "\u2B50",
    name: "Score x1.5",
    nameVi: "x1.5 \u0111i\u1EC3m",
    summaryVi: "\u0110\xFAng x1.5 / Mi\u1EC5n ph\u1EA1t",
    descriptionVi: "\u0110\xFAng x1.5 \u0111i\u1EC3m, Sai kh\xF4ng b\u1ECB tr\u1EEB (b\u1EA3o to\xE0n \u0111i\u1EC3m)",
    description: "Correct=x1.5, Wrong=0 penalty",
    detailVi: "Th\u1EBB an to\xE0n t\xEDch l\u0169y: Tr\u1EA3 l\u1EDDi \u0110\xDANG \u0111\u01B0\u1EE3c nh\xE2n 1.5 l\u1EA7n s\u1ED1 \u0111i\u1EC3m (+150%). N\u1EBFu tr\u1EA3 l\u1EDDi SAI s\u1EBD \u0111\u01B0\u1EE3c mi\u1EC5n to\xE0n b\u1ED9 \u0111i\u1EC3m ph\u1EA1t (0 \u0111i\u1EC3m, b\u1EA3o to\xE0n \u0111i\u1EC3m s\u1ED1).",
    correctEffectVi: "+150% s\u1ED1 \u0111i\u1EC3m c\xE2u h\u1ECFi (x1.5)",
    wrongEffectVi: "0 \u0111i\u1EC3m (Kh\xF4ng b\u1ECB ph\u1EA1t tr\u1EEB \u0111i\u1EC3m)",
    requiresTarget: false,
    tag: "An to\xE0n",
    color: "#10b981",
    scope: "PRIVATE"
  },
  FREEZE: {
    emoji: "\u2744\uFE0F",
    name: "Freeze",
    nameVi: "Phong t\u1ECFa",
    summaryVi: "\u0110\xF3ng b\u0103ng 1 \u0111\u1ED9i \u0111\u1ED1i th\u1EE7",
    descriptionVi: "B\u1ECF qua l\u01B0\u1EE3t c\u1EE7a \u0111\u1ED9i kh\xE1c",
    description: "Skip another team's turn",
    detailVi: "Ch\u1EC9 \u0111\u1ECBnh 1 \u0111\u1ED9i \u0111\u1ED1i th\u1EE7 b\u1ECB \u0111\xF3ng b\u0103ng trong c\xE2u n\xE0y, t\u01B0\u1EDBc quy\u1EC1n n\u1ED9p \u0111\xE1p \xE1n ho\u1EB7c quy\u1EC1n b\u1EA5m chu\xF4ng c\u1EE7a h\u1ECD.",
    requiresTarget: true,
    tag: "Kh\u1ED1ng ch\u1EBF",
    color: "#60a5fa",
    scope: "PRIVATE"
  },
  ATTACK: {
    emoji: "\u2694\uFE0F",
    name: "Attack",
    nameVi: "T\u1EA5n c\xF4ng",
    summaryVi: "\xC9p \u0111\u1ED1i th\u1EE7 tr\u1EA3 l\u1EDDi",
    descriptionVi: "Ch\u1EC9 \u0111\u1ECBnh \u0111\u1ED9i kh\xE1c tr\u1EA3 l\u1EDDi, sai b\u1ECB tr\u1EEB",
    description: "Force team to answer",
    detailVi: "Ch\u1EC9 \u0111\u1ECBnh 1 \u0111\u1ED9i \u0111\u1ED1i th\u1EE7 bu\u1ED9c ph\u1EA3i tr\u1EA3 l\u1EDDi c\xE2u h\u1ECFi n\xE0y. N\u1EBFu h\u1ECD tr\u1EA3 l\u1EDDi SAI, h\u1ECD s\u1EBD b\u1ECB tr\u1EEB \u0111i\u1EC3m ph\u1EA1t ngay l\u1EADp t\u1EE9c!",
    requiresTarget: true,
    tag: "T\u1EA5n c\xF4ng",
    color: "#ef4444",
    scope: "PRIVATE"
  },
  SKIP: {
    emoji: "\u{1F504}",
    name: "Skip",
    nameVi: "\u0110\u1ED5i c\xE2u",
    summaryVi: "\u0110\u1ED5i c\xE2u h\u1ECFi sang c\xE2u kh\xE1c",
    descriptionVi: "\u0110\u1ED5i c\xE2u h\u1ECFi sang c\xE2u kh\xE1c",
    description: "Replace question",
    detailVi: "B\u1ECF qua c\xE2u h\u1ECFi hi\u1EC7n t\u1EA1i n\u1EBFu c\xE2u qu\xE1 h\xF3c b\xFAa \u0111\u1EC3 chuy\u1EC3n sang m\u1ED9t c\xE2u h\u1ECFi kh\xE1c trong b\u1ED9 \u0111\u1EC1 m\xE0 kh\xF4ng b\u1ECB m\u1EA5t \u0111i\u1EC3m.",
    requiresTarget: false,
    tag: "D\xF9ng chung",
    color: "#8b5cf6",
    scope: "GLOBAL"
  },
  TIME_PLUS: {
    emoji: "\u23F1\uFE0F",
    name: "Time+",
    nameVi: "Th\xEAm gi\u1EDD",
    summaryVi: "+15 gi\xE2y suy ngh\u0129",
    descriptionVi: "Th\xEAm 15 gi\xE2y",
    description: "Add 15 seconds",
    detailVi: "K\xE9o d\xE0i th\u1EDDi gian suy ngh\u0129 th\xEAm 15 gi\xE2y cho c\u1EA3 \u0111\u1ED9i c\xF3 th\xEAm c\u01A1 h\u1ED9i th\u1EA3o lu\u1EADn v\xE0 \u0111\u01B0a ra \u0111\xE1p \xE1n ch\xEDnh x\xE1c.",
    requiresTarget: false,
    tag: "D\xF9ng chung",
    color: "#ec4899",
    scope: "GLOBAL"
  },
  SHIELD: {
    emoji: "\u{1F6E1}\uFE0F",
    name: "Shield",
    nameVi: "T\xE1i sinh (Khi\xEAn)",
    summaryVi: "Mi\u1EC5n tr\u1EEB \u0111i\u1EC3m ph\u1EA1t 1 l\u1EA7n",
    descriptionVi: "B\u1EA3o v\u1EC7 kh\u1ECFi b\u1ECB tr\u1EEB \u0111i\u1EC3m 1 l\u1EA7n",
    description: "Protect from penalty once",
    detailVi: "K\xEDch ho\u1EA1t khi\xEAn b\u1EA3o h\u1ED9: N\u1EBFu c\xE2u n\xE0y tr\u1EA3 l\u1EDDi SAI, \u0111\u1ED9i s\u1EBD \u0111\u01B0\u1EE3c mi\u1EC5n tr\u1EEB 100% \u0111i\u1EC3m ph\u1EA1t (nh\u1EADn 0 \u0111i\u1EC3m thay v\xEC b\u1ECB tr\u1EEB).",
    correctEffectVi: "T\xEDnh \u0111i\u1EC3m \u0111\xFAng nh\u01B0 b\xECnh th\u01B0\u1EDDng",
    wrongEffectVi: "0 \u0111i\u1EC3m (Mi\u1EC5n tr\u1EEB ph\u1EA1t)",
    requiresTarget: false,
    tag: "Ph\xF2ng th\u1EE7",
    color: "#06b6d4",
    scope: "PRIVATE"
  },
  STEAL: {
    emoji: "\u{1F4B8}",
    name: "Steal",
    nameVi: "C\u01B0\u1EDBp \u0111i\u1EC3m",
    summaryVi: "C\u01B0\u1EDBp \u0111i\u1EC3m \u0111\u1ED9i d\u1EABn \u0111\u1EA7u",
    descriptionVi: "C\u01B0\u1EDBp \u0111i\u1EC3m c\u1EE7a \u0111\u1ED9i d\u1EABn \u0111\u1EA7u",
    description: "Steal points from leader",
    detailVi: "C\u01B0\u1EDBp m\u1ED9t l\u01B0\u1EE3ng \u0111i\u1EC3m t\u1EEB \u0111\u1ED9i \u0111ang d\u1EABn \u0111\u1EA7u b\u1EA3ng x\u1EBFp h\u1EA1ng \u0111\u1EC3 c\u1ED9ng tr\u1EF1c ti\u1EBFp v\xE0o t\u1ED5ng \u0111i\u1EC3m c\u1EE7a \u0111\u1ED9i b\u1EA1n.",
    requiresTarget: false,
    tag: "C\u01B0\u1EDBp b\xF3c",
    color: "#eab308",
    scope: "PRIVATE"
  },
  PENALTY: {
    emoji: "\u{1F4A5}",
    name: "Penalty",
    nameVi: "Ph\u1EA1t \u0111\xF4i",
    summaryVi: "Nh\xE2n \u0111\xF4i \u0111i\u1EC3m tr\u1EEB \u0111\u1ED1i th\u1EE7",
    descriptionVi: "Nh\xE2n \u0111\xF4i \u0111i\u1EC3m tr\u1EEB c\u1EE7a \u0111\u1ED9i m\u1EE5c ti\xEAu",
    description: "Double penalty for target team",
    detailVi: "Ch\u1EC9 \u0111\u1ECBnh 1 \u0111\u1ED9i \u0111\u1ED1i th\u1EE7. N\u1EBFu \u0111\u1ED9i \u0111\xF3 tr\u1EA3 l\u1EDDi SAI \u1EDF c\xE2u n\xE0y, h\u1ECD s\u1EBD b\u1ECB nh\xE2n \u0111\xF4i m\u1EE9c \u0111i\u1EC3m ph\u1EA1t (-100% \u0111i\u1EC3m c\xE2u h\u1ECFi)!",
    requiresTarget: true,
    tag: "Ph\u1EA1t n\u1EB7ng",
    color: "#dc2626",
    scope: "PRIVATE"
  }
};
function getBloomLevelFromPoints(points, explicitLevel) {
  if (explicitLevel === "REMEMBER" || explicitLevel === "APPLY" || explicitLevel === "ANALYZE") {
    return explicitLevel;
  }
  if (points >= 30) return "ANALYZE";
  if (points >= 20) return "APPLY";
  return "REMEMBER";
}
function quantizeOlympiaTimeLimit(points = 10, _explicitTimeLimit) {
  void _explicitTimeLimit;
  if (points <= 10) return 15;
  if (points <= 20) return 20;
  if (points <= 30) return 30;
  return 60;
}
function getBuzzedAnswerTimeLimit(question, overridePoints) {
  if (question.type === "MC_SINGLE" || question.type === "TRUE_FALSE") {
    return 5;
  }
  const effPoints = overridePoints !== void 0 ? overridePoints : question.points ?? 10;
  const bloom = question.bloomLevel ?? getBloomLevelFromPoints(effPoints);
  const isUltra = effPoints >= 40;
  const isHigh = bloom === "ANALYZE" || effPoints >= 30;
  const isMedium = bloom === "APPLY" || effPoints >= 20;
  if (question.type === "MATCHING" || question.type === "DRAG_DROP") {
    if (isUltra) return 35;
    if (isHigh) return 25;
    if (isMedium) return 20;
    return 15;
  }
  if (isUltra) return 30;
  if (isHigh) return 20;
  if (isMedium) return 15;
  return 10;
}
function getStandardQuestionTimeLimit(question, overridePoints) {
  const effPoints = overridePoints !== void 0 ? overridePoints : question.points ?? 10;
  if (effPoints <= 10) return 15;
  if (effPoints <= 20) return 20;
  if (effPoints <= 30) return 30;
  return 60;
}

// src/lib/game-engine/scoring.ts
function calculateItemIRTMetrics(params) {
  const { rawPoints, roomAccuracy } = params;
  const total = params.totalParticipants ?? 4;
  let bPrior = 0;
  if (rawPoints <= 10) bPrior = -0.8;
  else if (rawPoints <= 20) bPrior = 0;
  else bPrior = 1;
  const pClamped = Math.max(0.02, Math.min(0.98, roomAccuracy));
  const bEmpirical = Math.max(-2, Math.min(2, Math.log((1 - pClamped) / pClamped)));
  const w = Math.min(0.85, total / (total + 4));
  const bEffective = Number((w * bEmpirical + (1 - w) * bPrior).toFixed(2));
  let discrimination = 0;
  if (params.topHalfTotal && params.topHalfTotal > 0 && params.bottomHalfTotal && params.bottomHalfTotal > 0) {
    const pTop = (params.topHalfCorrect ?? 0) / params.topHalfTotal;
    const pBottom = (params.bottomHalfCorrect ?? 0) / params.bottomHalfTotal;
    discrimination = Number((pTop - pBottom).toFixed(2));
  } else {
    discrimination = Number((Math.max(0, bEffective) * 0.25).toFixed(2));
  }
  let bonusRate = 0;
  if (bEffective > 0) {
    bonusRate += Math.min(0.35, bEffective * 0.2);
  }
  if (discrimination > 0.15) {
    bonusRate += Math.min(0.15, discrimination * 0.2);
  }
  bonusRate = Math.min(0.5, Math.max(0, Number(bonusRate.toFixed(2))));
  return {
    bPrior,
    bEmpirical,
    bEffective,
    discrimination,
    bonusRate
  };
}
function getBasePointsForMode(rawPoints, mode) {
  if (mode === "CLASSIC" || mode === "ELIMINATION") {
    if (rawPoints <= 10) return 1e3;
    if (rawPoints <= 20) return 1500;
    if (rawPoints <= 30) return 2e3;
    return 2500;
  }
  return normalizeToFourLevels(rawPoints);
}
function normalizeToFourLevels(points) {
  if (points <= 10) return 10;
  if (points <= 20) return 20;
  if (points <= 30) return 30;
  return 40;
}
function normalizeToThreeLevels(points) {
  return normalizeToFourLevels(points);
}
function computeDetailedPointsAwarded(ctx) {
  const base = getBasePointsForMode(ctx.basePoints, ctx.mode);
  if (!ctx.isCorrect) {
    if (ctx.mode === "CLASSIC" || ctx.mode === "ELIMINATION") {
      if (!ctx.hasRiskPowerup || ctx.shielded) {
        return { points: 0, basePoints: 0, speedPoints: 0, streakPoints: 0, rarityPoints: 0 };
      }
    } else if (!ctx.config.penaltyForWrong || ctx.shielded) {
      return { points: 0, basePoints: 0, speedPoints: 0, streakPoints: 0, rarityPoints: 0 };
    }
    const penalty = Math.floor(base * 0.5);
    const pm = ctx.penaltyMultiplier ?? 1;
    const finalPenalty = -Math.floor(penalty * pm);
    return { points: finalPenalty, basePoints: finalPenalty, speedPoints: 0, streakPoints: 0, rarityPoints: 0 };
  }
  const isKahootScaleMode = ctx.mode === "CLASSIC" || ctx.mode === "ELIMINATION";
  const multiplier = ctx.multiplier ?? 1;
  let basePoints = 0;
  let speedPoints = 0;
  if (isKahootScaleMode) {
    const totalMs = ctx.timeLimit * 1e3;
    const remainingRatio = Math.max(0, 1 - ctx.timeSpent / totalMs);
    basePoints = Math.round(base * 0.5 * multiplier);
    speedPoints = Math.round(base * 0.5 * remainingRatio * multiplier);
  } else {
    basePoints = Math.round(base * multiplier);
    if (ctx.config.timeBonusEnabled) {
      const totalMs = ctx.timeLimit * 1e3;
      const remainingRatio = Math.max(0, 1 - ctx.timeSpent / totalMs);
      speedPoints = Math.round(base * 0.5 * remainingRatio * multiplier);
    }
  }
  let streakPoints = 0;
  if (ctx.streak && ctx.streak >= 2) {
    let streakRate = 0.1;
    if (ctx.streak === 3) streakRate = 0.2;
    else if (ctx.streak === 4) streakRate = 0.3;
    else if (ctx.streak >= 5) streakRate = 0.5;
    streakPoints = Math.round(base * streakRate * multiplier);
  }
  let rarityPoints = 0;
  let effectiveDifficulty;
  let discrimination;
  if (ctx.mode === "CLASSIC" || ctx.mode === "ELIMINATION") {
    if (ctx.roomAccuracy !== void 0) {
      const irt = calculateItemIRTMetrics({
        rawPoints: ctx.basePoints,
        roomAccuracy: ctx.roomAccuracy,
        totalParticipants: ctx.totalParticipants ?? 4,
        topHalfCorrect: ctx.topHalfCorrect,
        topHalfTotal: ctx.topHalfTotal,
        bottomHalfCorrect: ctx.bottomHalfCorrect,
        bottomHalfTotal: ctx.bottomHalfTotal
      });
      effectiveDifficulty = irt.bEffective;
      discrimination = irt.discrimination;
      if (irt.bonusRate > 0) {
        rarityPoints = Math.round(base * irt.bonusRate * multiplier);
      }
    }
  } else if (ctx.roomAccuracy !== void 0 && ctx.roomAccuracy < 0.3) {
    const rarityDelta = 0.3 - Math.max(0, ctx.roomAccuracy);
    rarityPoints = Math.round(base * rarityDelta * 1.5 * multiplier);
  }
  const points = basePoints + speedPoints + streakPoints + rarityPoints;
  return { points, basePoints, speedPoints, streakPoints, rarityPoints, effectiveDifficulty, discrimination };
}
function computePointsAwarded(ctx) {
  return computeDetailedPointsAwarded(ctx).points;
}
function computeTeamQuestionScore(ctx) {
  const base = getBasePointsForMode(ctx.basePoints, ctx.mode);
  const total = Math.max(1, ctx.totalOnlineMembers);
  const accuracyRatio = Math.min(1, Math.max(0, ctx.correctMembers / total));
  let empiricalMultiplier = 1;
  let rarityBonus = 0;
  let effectiveDifficulty;
  let discrimination;
  if (ctx.mode === "CLASSIC" || ctx.mode === "ELIMINATION") {
    if (ctx.roomAccuracy !== void 0) {
      const irt = calculateItemIRTMetrics({
        rawPoints: ctx.basePoints,
        roomAccuracy: ctx.roomAccuracy,
        totalParticipants: ctx.totalOnlineMembers,
        topHalfCorrect: ctx.topHalfCorrect,
        topHalfTotal: ctx.topHalfTotal,
        bottomHalfCorrect: ctx.bottomHalfCorrect,
        bottomHalfTotal: ctx.bottomHalfTotal
      });
      effectiveDifficulty = irt.bEffective;
      discrimination = irt.discrimination;
      rarityBonus = irt.bonusRate;
      empiricalMultiplier = 1 + irt.bonusRate;
    }
  } else if (ctx.roomAccuracy !== void 0 && ctx.roomAccuracy < 0.3) {
    const rarityDelta = 0.3 - Math.max(0, ctx.roomAccuracy);
    empiricalMultiplier = 1 + rarityDelta * 1.5;
    rarityBonus = rarityDelta * 1.5;
  }
  if (ctx.correctMembers === 0) {
    if (ctx.mode === "CLASSIC" || ctx.mode === "ELIMINATION") {
      if (!ctx.hasRiskPowerup || ctx.shielded) {
        return {
          points: 0,
          basePoints: 0,
          speedPoints: 0,
          streakPoints: 0,
          rarityPoints: 0,
          accuracyRatio: 0,
          speedBonus: 0,
          avgTimeSpent: 0,
          empiricalMultiplier,
          streakBonus: 0,
          effectiveDifficulty,
          discrimination
        };
      }
    } else if (!ctx.config.penaltyForWrong || ctx.shielded) {
      return {
        points: 0,
        basePoints: 0,
        speedPoints: 0,
        streakPoints: 0,
        rarityPoints: 0,
        accuracyRatio: 0,
        speedBonus: 0,
        avgTimeSpent: 0,
        empiricalMultiplier,
        streakBonus: 0,
        effectiveDifficulty,
        discrimination
      };
    }
    const pm = ctx.penaltyMultiplier ?? 1;
    const penalty = -Math.floor(base * 0.5 * pm);
    return {
      points: penalty,
      basePoints: penalty,
      speedPoints: 0,
      streakPoints: 0,
      rarityPoints: 0,
      accuracyRatio: 0,
      speedBonus: 0,
      avgTimeSpent: 0,
      empiricalMultiplier,
      streakBonus: 0,
      effectiveDifficulty,
      discrimination
    };
  }
  const avgTimeSpent = ctx.correctTimes.length > 0 ? ctx.correctTimes.reduce((a, b) => a + b, 0) / ctx.correctTimes.length : ctx.timeLimit * 1e3;
  const isKahootScaleMode = ctx.mode === "CLASSIC" || ctx.mode === "ELIMINATION";
  const remainingRatio = Math.max(0, 1 - avgTimeSpent / (ctx.timeLimit * 1e3));
  const multiplier = ctx.multiplier ?? 1;
  let speedBonus = 0;
  let basePoints = 0;
  let speedPoints = 0;
  if (isKahootScaleMode) {
    speedBonus = remainingRatio * 0.5;
    basePoints = Math.round(base * 0.5 * accuracyRatio * multiplier);
    speedPoints = Math.round(base * 0.5 * remainingRatio * accuracyRatio * multiplier);
  } else {
    if (ctx.config.timeBonusEnabled) {
      speedBonus = remainingRatio * 0.5;
    }
    basePoints = Math.round(base * accuracyRatio * multiplier);
    speedPoints = Math.round(base * speedBonus * accuracyRatio * multiplier);
  }
  let streakBonus = 0;
  if (ctx.streak && ctx.streak >= 2) {
    if (ctx.streak === 2) streakBonus = 0.1;
    else if (ctx.streak === 3) streakBonus = 0.2;
    else if (ctx.streak === 4) streakBonus = 0.3;
    else if (ctx.streak >= 5) streakBonus = 0.5;
  }
  const streakPoints = Math.round(base * streakBonus * accuracyRatio * multiplier);
  const rarityPoints = Math.round(base * rarityBonus * accuracyRatio * multiplier);
  const points = basePoints + speedPoints + streakPoints + rarityPoints;
  return {
    points,
    basePoints,
    speedPoints,
    streakPoints,
    rarityPoints,
    accuracyRatio,
    speedBonus,
    avgTimeSpent,
    empiricalMultiplier,
    streakBonus,
    effectiveDifficulty,
    discrimination
  };
}
function computeStealAmount(leaderScore, stealerScore) {
  const diff = leaderScore - stealerScore;
  if (diff <= 0) return 0;
  return Math.floor(Math.min(diff * 0.2, leaderScore * 0.1, 50));
}

// src/lib/game-engine/dice-race.ts
function generateBalancedDiceTiles(totalTiles = 60, options = { randomize: true }) {
  const count = Math.max(60, Math.min(100, totalTiles || 60));
  const tiles = [];
  const validateLayout = (map) => {
    const indices = Object.keys(map).map((k) => parseInt(k, 10)).sort((a, b) => a - b);
    if (indices.some((idx) => idx <= 4 || idx >= count - 5)) return false;
    for (let i = 0; i < indices.length - 1; i++) {
      if (Math.abs(indices[i] - indices[i + 1]) < 3) return false;
    }
    const boostIndices = indices.filter((idx) => map[idx].type === "BOOST");
    const trapIndices = indices.filter((idx) => map[idx].type === "TRAP");
    const extraRollIndices = indices.filter((idx) => map[idx].type === "EXTRA_ROLL");
    for (const b of boostIndices) {
      for (const t of trapIndices) {
        if (Math.abs(b - t) === 2) return false;
      }
    }
    for (const b of boostIndices) {
      if (map[b + 1] !== void 0) return false;
      if (map[b + 2] !== void 0) return false;
    }
    for (const t of trapIndices) {
      if (map[t - 1] !== void 0) return false;
      if (map[t - 2] !== void 0) return false;
    }
    for (let i = 0; i < extraRollIndices.length; i++) {
      for (let j = i + 1; j < extraRollIndices.length; j++) {
        if (Math.abs(extraRollIndices[i] - extraRollIndices[j]) < 12) return false;
      }
    }
    return true;
  };
  let specialMap = {};
  let generationSuccess = false;
  if (options.randomize !== false) {
    const maxAttempts = 100;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const tempMap = {};
      const reservedNormalIndices = /* @__PURE__ */ new Set();
      const alphaIn = 12 + Math.floor(Math.random() * 5);
      const alphaOut = alphaIn + 5 + Math.floor(Math.random() * 3);
      tempMap[alphaIn] = { type: "TELEPORT", label: "\u{1F300} C\u1ED5ng Kh\xF4ng Gian", portalId: "Alpha", teleportTargetIndex: alphaOut };
      tempMap[alphaOut] = { type: "TELEPORT_EXIT", label: "\u2728 C\u1ED5ng Ra An To\xE0n", portalId: "Alpha" };
      if (count >= 80) {
        const betaIn = alphaOut + 15 + Math.floor(Math.random() * 10);
        const betaOut = betaIn + 5 + Math.floor(Math.random() * 3);
        if (betaIn < count - 15 && betaOut < count - 5 && Math.abs(betaIn - alphaOut) >= 4) {
          tempMap[betaIn] = { type: "TELEPORT", label: "\u{1F300} C\u1ED5ng Beta", portalId: "Beta", teleportTargetIndex: betaOut };
          tempMap[betaOut] = { type: "TELEPORT_EXIT", label: "\u2728 C\u1ED5ng Ra Beta", portalId: "Beta" };
        }
      }
      const pool = [
        { type: "BOOST", label: "\u{1F680} +2 B\u01B0\u1EDBc", effectValue: 2 },
        { type: "BOOST", label: "\u{1F680} +2 B\u01B0\u1EDBc", effectValue: 2 },
        { type: "TRAP", label: "\u{1F4A5} B\u1EABy -2 B\u01B0\u1EDBc", effectValue: -2 },
        { type: "TRAP", label: "\u{1F4A5} B\u1EABy -2 B\u01B0\u1EDBc", effectValue: -2 },
        { type: "SHIELD", label: "\u{1F6E1}\uFE0F Khi\xEAn" },
        { type: "SHIELD", label: "\u{1F6E1}\uFE0F Khi\xEAn" },
        { type: "EXTRA_ROLL", label: "\u{1F3B2} x2 C\u01A1 h\u1ED9i" },
        { type: "EXTRA_ROLL", label: "\u{1F3B2} x2 C\u01A1 h\u1ED9i" },
        { type: "SWAP", label: "\u{1F500} V\u01B0\u1EE3t m\u1EB7t" }
      ];
      if (count >= 80) {
        pool.push(
          { type: "BOOST", label: "\u{1F680} +2 B\u01B0\u1EDBc", effectValue: 2 },
          { type: "TRAP", label: "\u{1F4A5} B\u1EABy -2 B\u01B0\u1EDBc", effectValue: -2 },
          { type: "SWAP", label: "\u{1F500} V\u01B0\u1EE3t m\u1EB7t" }
        );
      }
      if (count >= 100) {
        pool.push({ type: "SHIELD", label: "\u{1F6E1}\uFE0F Khi\xEAn" });
      }
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const candidateSlots = [];
      for (let s = 5; s <= count - 6; s++) {
        candidateSlots.push(s);
      }
      for (let i = candidateSlots.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidateSlots[i], candidateSlots[j]] = [candidateSlots[j], candidateSlots[i]];
      }
      let allPlaced = true;
      for (const item of pool) {
        let placedSlot = null;
        for (const slot of candidateSlots) {
          if (tempMap[slot] !== void 0) continue;
          if (reservedNormalIndices.has(slot)) continue;
          const violatesGap = Object.keys(tempMap).some((k) => Math.abs(parseInt(k, 10) - slot) < 3);
          if (violatesGap) continue;
          if (item.type === "BOOST") {
            const violatesTrapDistance = Object.entries(tempMap).some(
              ([k, v]) => v.type === "TRAP" && Math.abs(parseInt(k, 10) - slot) === 2
            );
            if (violatesTrapDistance) continue;
            if (slot + 2 >= count - 1) continue;
            if (tempMap[slot + 1] !== void 0 || tempMap[slot + 2] !== void 0) continue;
          }
          if (item.type === "TRAP") {
            const violatesBoostDistance = Object.entries(tempMap).some(
              ([k, v]) => v.type === "BOOST" && Math.abs(parseInt(k, 10) - slot) === 2
            );
            if (violatesBoostDistance) continue;
            if (slot - 2 <= 0) continue;
            if (tempMap[slot - 1] !== void 0 || tempMap[slot - 2] !== void 0) continue;
          }
          if (item.type === "EXTRA_ROLL") {
            const violatesExtraRollGap = Object.entries(tempMap).some(
              ([k, v]) => v.type === "EXTRA_ROLL" && Math.abs(parseInt(k, 10) - slot) < 12
            );
            if (violatesExtraRollGap) continue;
          }
          placedSlot = slot;
          break;
        }
        if (placedSlot !== null) {
          tempMap[placedSlot] = {
            type: item.type,
            label: item.label,
            effectValue: item.effectValue
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
  if (!generationSuccess) {
    specialMap = {};
    const scale = (idx) => Math.round(idx / 60 * count);
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
    specialMap[iExtra1] = { type: "EXTRA_ROLL", label: "\u{1F3B2} x2 C\u01A1 h\u1ED9i" };
    specialMap[iBoost1] = { type: "BOOST", label: "\u{1F680} +2 B\u01B0\u1EDBc", effectValue: 2 };
    specialMap[iTeleIn] = {
      type: "TELEPORT",
      label: "\u{1F300} C\u1ED5ng Kh\xF4ng Gian",
      portalId: "Alpha",
      teleportTargetIndex: iTeleOut
    };
    specialMap[iShield1] = { type: "SHIELD", label: "\u{1F6E1}\uFE0F Khi\xEAn" };
    specialMap[iTeleOut] = {
      type: "TELEPORT_EXIT",
      label: "\u2728 C\u1ED5ng Ra An To\xE0n",
      portalId: "Alpha"
    };
    specialMap[iTrap1] = { type: "TRAP", label: "\u{1F4A5} B\u1EABy -2 B\u01B0\u1EDBc", effectValue: -2 };
    specialMap[iSwap] = { type: "SWAP", label: "\u{1F500} V\u01B0\u1EE3t m\u1EB7t" };
    specialMap[iExtra2] = { type: "EXTRA_ROLL", label: "\u{1F3B2} x2 C\u01A1 h\u1ED9i" };
    specialMap[iBoost2] = { type: "BOOST", label: "\u{1F680} +2 B\u01B0\u1EDBc", effectValue: 2 };
    specialMap[iShield2] = { type: "SHIELD", label: "\u{1F6E1}\uFE0F Khi\xEAn" };
    specialMap[iBoost3] = { type: "BOOST", label: "\u{1F680} +2 B\u01B0\u1EDBc", effectValue: 2 };
    specialMap[iTrap2] = { type: "TRAP", label: "\u{1F4A5} B\u1EABy -2 B\u01B0\u1EDBc", effectValue: -2 };
  }
  for (let i = 0; i < count; i++) {
    if (i === 0) {
      tiles.push({ index: 0, type: "NORMAL", label: "Xu\u1EA5t ph\xE1t" });
      continue;
    }
    if (i === count - 1) {
      tiles.push({ index: count - 1, type: "FINISH", label: "V\u1EC1 \u0111\xEDch" });
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
        portalId: spec.portalId
      });
    } else {
      tiles.push({
        index: i,
        type: "NORMAL",
        label: `\xD4 ${i + 1}`
      });
    }
  }
  return tiles;
}
function handleDiceRaceLanding({
  diceState,
  teamId,
  roll
}) {
  const teamProg = diceState.teamPositions[teamId];
  if (!teamProg) {
    return {
      finalPosition: 0,
      grantAnotherRoll: false,
      effectMessage: "",
      hasShield: false,
      teleported: false
    };
  }
  let currentShield = !!teamProg.hasShield;
  const remainingSteps = Math.max(0, diceState.totalTiles - 1 - teamProg.position);
  const actualSteps = Math.min(roll, remainingSteps);
  let newPos = teamProg.position + actualSteps;
  const isDirectFinish = newPos >= diceState.totalTiles - 1;
  let grantAnotherRoll = false;
  let teleported = false;
  let effectMessage = "";
  if (isDirectFinish && actualSteps < roll) {
    effectMessage = `Tung x\xFAc x\u1EAFc \u0111\u01B0\u1EE3c ${roll} n\xFAt! Ch\u1EC9 c\u1EA7n ${actualSteps} b\u01B0\u1EDBc \u0111\u1EC3 c\xE1n \u0111\xEDch \xD4 #${newPos + 1}! \u{1F3C6} CHI\u1EBEN TH\u1EAENG!`;
  } else if (isDirectFinish) {
    effectMessage = `Tung x\xFAc x\u1EAFc \u0111\u01B0\u1EE3c ${roll} n\xFAt! C\xE1n \u0111\xEDch \xD4 #${newPos + 1}! \u{1F3C6} CHI\u1EBEN TH\u1EAENG!`;
  } else {
    effectMessage = `Tung x\xFAc x\u1EAFc \u0111\u01B0\u1EE3c ${roll} n\xFAt! \u0110\u1EBFn \xD4 #${newPos + 1}`;
  }
  let swappedWithTeamId = void 0;
  const landingTile = diceState.tiles[newPos];
  if (!isDirectFinish && landingTile) {
    if (landingTile.type === "TELEPORT" && landingTile.teleportTargetIndex !== void 0) {
      teleported = true;
      const targetPos = Math.min(diceState.totalTiles - 1, Math.max(0, landingTile.teleportTargetIndex));
      effectMessage = `\u{1F300} B\u01B0\u1EDBc v\xE0o C\u1ED5ng Kh\xF4ng Gian ${landingTile.portalId ? `[${landingTile.portalId}]` : ""}! D\u1ECBch chuy\u1EC3n t\u1EE9c th\u1EDDi t\u1EEB \xD4 #${newPos + 1} \u2794 \xD4 #${targetPos + 1}!`;
      newPos = targetPos;
    } else if (landingTile.type === "TELEPORT_EXIT") {
      effectMessage = `\u2728 Ti\u1EBFp \u0111\u1EA5t an to\xE0n t\u1EA1i C\u1ED5ng Ra \xD4 #${newPos + 1}!`;
    } else if (landingTile.type === "BOOST") {
      const boostVal = landingTile.effectValue || 2;
      const afterBoostPos = Math.min(diceState.totalTiles - 1, newPos + boostVal);
      newPos = afterBoostPos;
      effectMessage += ` \u2794 \u{1F680} T\u0103ng t\u1ED1c! Ti\u1EBFn th\xEAm ${boostVal} b\u01B0\u1EDBc \u0111\u1EBFn \xD4 #${newPos + 1}!`;
      const chainedTile = diceState.tiles[newPos];
      if (chainedTile && chainedTile.type === "TRAP") {
        if (currentShield) {
          currentShield = false;
          effectMessage += ` \u2794 \u{1F6E1}\uFE0F Khi\xEAn b\u1EA3o v\u1EC7 \u0111\xE3 h\u1EA5p th\u1EE5 B\u1EABy h\u1EE5t (-2 b\u01B0\u1EDBc)! An to\xE0n t\u1EA1i \xD4 #${newPos + 1}.`;
        } else {
          const trapVal = chainedTile.effectValue || -2;
          newPos = Math.max(0, newPos + trapVal);
          effectMessage += ` \u2794 \u{1F4A5} D\u1EABm ph\u1EA3i B\u1EABy h\u1EE5t! L\xF9i ${Math.abs(trapVal)} b\u01B0\u1EDBc v\u1EC1 \xD4 #${newPos + 1}.`;
        }
      }
    } else if (landingTile.type === "TRAP") {
      if (currentShield) {
        currentShield = false;
        effectMessage += ` \u2794 \u{1F6E1}\uFE0F Khi\xEAn b\u1EA3o v\u1EC7 \u0111\xE3 h\u1EA5p th\u1EE5 B\u1EABy h\u1EE5t (-2 b\u01B0\u1EDBc)! An to\xE0n t\u1EA1i \xD4 #${newPos + 1}.`;
      } else {
        const trapVal = landingTile.effectValue || -2;
        newPos = Math.max(0, newPos + trapVal);
        effectMessage += ` \u2794 \u{1F4A5} D\u1EABm ph\u1EA3i B\u1EABy h\u1EE5t! L\xF9i ${Math.abs(trapVal)} b\u01B0\u1EDBc v\u1EC1 \xD4 #${newPos + 1}.`;
        const recoveredTile = diceState.tiles[newPos];
        if (recoveredTile && recoveredTile.type === "SHIELD") {
          currentShield = true;
          effectMessage += ` \u2794 \u{1F6E1}\uFE0F Nh\u1EB7t \u0111\u01B0\u1EE3c Khi\xEAn b\u1EA3o h\u1ED9 ph\u1EE5c h\u1ED3i!`;
        } else if (recoveredTile && recoveredTile.type === "EXTRA_ROLL") {
          grantAnotherRoll = true;
          effectMessage += ` \u2794 \u{1F3B2} R\u01A1i v\xE0o \xF4 x2 C\u01A1 h\u1ED9i! \u0110\u01B0\u1EE3c tung th\xEAm m\u1ED9t l\u1EA7n n\u1EEFa!`;
        }
      }
    } else if (landingTile.type === "SHIELD") {
      currentShield = true;
      effectMessage += ` \u2794 \u{1F6E1}\uFE0F Nh\u1EADn \u0111\u01B0\u1EE3c Khi\xEAn b\u1EA3o h\u1ED9 th\u1EA7n k\u1EF3!`;
    } else if (landingTile.type === "EXTRA_ROLL") {
      grantAnotherRoll = true;
      effectMessage += ` \u2794 \u{1F3B2} R\u01A1i v\xE0o \xF4 x2 C\u01A1 h\u1ED9i! \u0110\u01B0\u1EE3c tung x\xFAc x\u1EAFc th\xEAm m\u1ED9t l\u1EA7n n\u1EEFa!`;
    } else if (landingTile.type === "SWAP") {
      const teamsAhead = Object.values(diceState.teamPositions).filter((t) => t.teamId !== teamId && t.position > newPos).sort((a, b) => a.position - b.position);
      if (teamsAhead.length > 0) {
        const opp = teamsAhead[0];
        if (opp.hasShield) {
          opp.hasShield = false;
          effectMessage += ` \u2794 \u{1F500} C\u1ED1 v\u01B0\u1EE3t m\u1EB7t \u0111\u1ED5i ch\u1ED7 v\u1EDBi ${opp.teamName} nh\u01B0ng b\u1ECB Khi\xEAn \u0111\u1ED1i th\u1EE7 ch\u1EB7n \u0111\u1EE9ng!`;
        } else {
          const tempPos = opp.position;
          opp.position = newPos;
          newPos = tempPos;
          swappedWithTeamId = opp.teamId;
          effectMessage += ` \u2794 \u{1F500} V\u01B0\u1EE3t m\u1EB7t ngo\u1EA1n m\u1EE5c! Ho\xE1n \u0111\u1ED5i v\u1ECB tr\xED v\u1EDBi ${opp.teamName} \u0111\u1EE9ng li\u1EC1n tr\u01B0\u1EDBc! B\u1EA1n v\u1ECDt l\xEAn \xD4 #${newPos + 1}!`;
        }
      } else {
        const bonusPos = Math.min(diceState.totalTiles - 1, newPos + 2);
        newPos = bonusPos;
        effectMessage += ` \u2794 \u{1F500} \xD4 V\u01B0\u1EE3t m\u1EB7t: B\u1EA1n \u0111ang d\u1EABn \u0111\u1EA7u cu\u1ED9c \u0111ua! T\u0103ng t\u1ED1c th\xEAm +2 b\u01B0\u1EDBc \u0111\u1EBFn \xD4 #${newPos + 1}!`;
      }
    }
  }
  return {
    finalPosition: newPos,
    grantAnotherRoll,
    effectMessage,
    hasShield: currentShield,
    teleported,
    swappedWithTeamId
  };
}

// src/lib/game-engine/mystery-quest.ts
var MYSTERY_THEMES = {
  CASTLE: {
    theme: "CASTLE",
    nameVi: "L\xE2u \u0110\xE0i Ma Thu\u1EADt",
    bgGradient: "from-indigo-950 via-purple-900 to-slate-950",
    accentColor: "#a855f7",
    emoji: "\u{1F3F0}",
    taglineVi: "V\u01B0\u1EE3t qua th\u1EED th\xE1ch ph\xE9p thu\u1EADt, l\u1EADt b\xE0i v\xE0 n\xE9 b\u1EABy n\u1ED5 h\u1EAFc \xE1m"
  },
  PIRATE: {
    theme: "PIRATE",
    nameVi: "\u0110\u1EA3o H\u1EA3i T\u1EB7c & Kho B\xE1u V\xE0ng",
    bgGradient: "from-amber-950 via-yellow-950 to-slate-950",
    accentColor: "#f59e0b",
    emoji: "\u{1F3F4}\u200D\u2620\uFE0F",
    taglineVi: "S\u0103n l\xF9ng kho b\xE1u r\u1EF1c r\u1EE1, \u0111\u1EC1 ph\xF2ng bom thu\u1ED1c s\xFAng gi\u1EA5u k\xEDn"
  },
  FOREST: {
    theme: "FOREST",
    nameVi: "R\u1EEBng Ma Thu\u1EADt & Ti\xEAn T\u1ED9c",
    bgGradient: "from-emerald-950 via-teal-950 to-slate-950",
    accentColor: "#10b981",
    emoji: "\u{1F332}",
    taglineVi: "Thu th\u1EADp m\u1EADt ong v\xE0 qu\u1EA3 th\u1EA7n, coi ch\u1EEBng n\u1EA5m n\u1ED5 \u0111\u1ED9c d\u01B0\u1EE3c"
  },
  CYBER: {
    theme: "CYBER",
    nameVi: "Tr\u1EA1m V\u0169 Tr\u1EE5 T\u01B0\u01A1ng Lai",
    bgGradient: "from-cyan-950 via-blue-950 to-slate-950",
    accentColor: "#06b6d4",
    emoji: "\u{1F680}",
    taglineVi: "Khai th\xE1c l\xF5i n\u0103ng l\u01B0\u1EE3ng l\u01B0\u1EE3ng t\u1EED, n\xE9 tr\xE1nh virus m\xE3 \u0111\u1ED9c n\u1ED5 tung"
  },
  TEMPLE: {
    theme: "TEMPLE",
    nameVi: "\u0110\u1EC1n C\u1ED5 Huy\u1EC1n B\xED",
    bgGradient: "from-amber-950 via-stone-900 to-black",
    accentColor: "#eab308",
    emoji: "\u{1F3DB}\uFE0F",
    taglineVi: "Khai qu\u1EADt c\u1ED5 v\u1EADt kim c\u01B0\u01A1ng, c\u1EA9n th\u1EADn b\u1EABy \u0111\xE1 s\u1EADp ng\xE0n n\u0103m"
  }
};
var THEME_KEYS = ["CASTLE", "PIRATE", "FOREST", "CYBER", "TEMPLE"];
var ALL_MINIGAMES = [
  "PUSH_YOUR_LUCK",
  "MEMORY_PAIRS",
  "ONE_SHOT_DOORS",
  "TAROT_DESTINY"
];
function normalizeMiniGameType(type) {
  if (!type) return "PUSH_YOUR_LUCK";
  if (type === "DOORS" || type === "CHESTS") return "ONE_SHOT_DOORS";
  if (type === "TAROT_CARDS") return "TAROT_DESTINY";
  if (type === "RADAR_WINDOWS") return "PUSH_YOUR_LUCK";
  return type;
}
function getRandomMiniGame(prevMiniGame) {
  const normPrev = prevMiniGame ? normalizeMiniGameType(prevMiniGame) : void 0;
  const candidates = ALL_MINIGAMES.filter((m) => m !== normPrev);
  if (candidates.length === 0) return "PUSH_YOUR_LUCK";
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  return chosen;
}
function roundToMultipleOfFive(points) {
  return Math.round(points / 5) * 5;
}
function evaluateTeamRiskTier({
  team,
  allTeams = [],
  consecutiveBombs = 0,
  currentRound = 1
}) {
  const activeTeams = (allTeams || []).filter((t) => !t.isEliminated);
  if (activeTeams.length <= 1) return "NEUTRAL";
  const myScore = team.score || 0;
  const sorted = [...activeTeams].sort((a, b) => (b.score || 0) - (a.score || 0));
  const top1 = sorted[0];
  const top2 = sorted[1];
  const bottom = sorted[sorted.length - 1];
  if (consecutiveBombs >= 1) {
    return "UNDERDOG";
  }
  if (myScore <= 0 && (top1.score || 0) >= 20) {
    return "UNDERDOG";
  }
  if (team.id === bottom.id && (top1.score || 0) - myScore >= 25) {
    return "UNDERDOG";
  }
  if (currentRound > 1 && team.id === top1.id && top2 && myScore - (top2.score || 0) >= 25) {
    return "DOMINANT";
  }
  return "NEUTRAL";
}
function rollBombTypeForMinigame(mode, teamScore = 0, options) {
  if (teamScore <= 0) return "BOMB_SMOKE";
  const currentRound = options?.currentRound ?? 1;
  const riskTier = options?.riskTier ?? "NEUTRAL";
  if (riskTier === "UNDERDOG") {
    const r2 = Math.random();
    if (r2 < 0.9) return "BOMB_SMOKE";
    return "BOMB_DARK";
  }
  if (currentRound <= 1) {
    const r2 = Math.random();
    if (mode === "MEMORY_PAIRS") {
      return r2 < 0.85 ? "BOMB_SMOKE" : "BOMB_DARK";
    }
    if (mode === "ONE_SHOT_DOORS") {
      return r2 < 0.75 ? "BOMB_SMOKE" : "BOMB_DARK";
    }
    return r2 < 0.6 ? "BOMB_SMOKE" : "BOMB_DARK";
  }
  if (riskTier === "DOMINANT") {
    const r2 = Math.random();
    if (currentRound === 2) {
      if (r2 < 0.4) return "BOMB_SMOKE";
      if (r2 < 0.9) return "BOMB_DARK";
      return "BOMB_CHARITY";
    } else {
      if (r2 < 0.3) return "BOMB_SMOKE";
      if (r2 < 0.8) return "BOMB_DARK";
      return "BOMB_CHARITY";
    }
  }
  const charityChance = currentRound === 2 ? 0.05 : 0.1;
  const r = Math.random();
  if (mode === "MEMORY_PAIRS") {
    if (r < 0.8) return "BOMB_SMOKE";
    if (r < 1 - charityChance) return "BOMB_DARK";
    return "BOMB_CHARITY";
  }
  if (mode === "ONE_SHOT_DOORS") {
    if (r < 0.7) return "BOMB_SMOKE";
    if (r < 1 - charityChance) return "BOMB_DARK";
    return "BOMB_CHARITY";
  }
  if (r < 0.5) return "BOMB_SMOKE";
  if (r < 1 - charityChance) return "BOMB_DARK";
  return "BOMB_CHARITY";
}
function resolveBombOutcome({
  bombType,
  team,
  allTeams = [],
  storyDescription,
  baseQuestionPoints = 20,
  isSurvivalPenalty = false
}) {
  const currentScore = team.score || 0;
  const otherTeams = allTeams.filter((t) => t.id !== team.id && !t.isEliminated);
  if (bombType === "BOMB_SMOKE") {
    if (isSurvivalPenalty) {
      const penalty = Math.min(currentScore, roundToMultipleOfFive(baseQuestionPoints * 0.5));
      const penaltyText3 = `Kh\xF3i m\xF9 bao ph\u1EE7! Ch\u1EBF \u0111\u1ED9 Sinh T\u1EED ph\u1EA1t tr\u1EEB 50% \u0111i\u1EC3m g\u1ED1c c\xE2u h\u1ECFi (-${penalty}\u0111)!`;
      return {
        penalty,
        penaltyText: penaltyText3,
        giftedPoints: 0,
        bombExploded: {
          type: "SMOKE",
          title: "Bom Kh\xF3i \u{1F4A8}",
          description: storyDescription || "Kh\xF3i m\xF9 bao ph\u1EE7! Ch\u1EBF \u0111\u1ED9 Sinh T\u1EED ph\u1EA1t tr\u1EEB 50% \u0111i\u1EC3m g\u1ED1c c\xE2u h\u1ECFi.",
          penaltyText: penaltyText3,
          donorTeamId: team.id,
          donorTeamName: team.name,
          deductedPoints: penalty
        }
      };
    }
    const penaltyText2 = "M\u1EA5t s\u1EA1ch \u0111i\u1EC3m c\u1EE7a c\xE2u n\xE0y. T\u1ED5ng \u0111i\u1EC3m c\u1EE7a \u0111\u1ED9i kh\xF4ng \u0111\u1ED5i.";
    return {
      penalty: 0,
      penaltyText: penaltyText2,
      giftedPoints: 0,
      bombExploded: {
        type: "SMOKE",
        title: "Bom Kh\xF3i \u{1F4A8}",
        description: storyDescription || "Kh\xF3i m\xF9 bao ph\u1EE7! M\u1EA5t to\xE0n b\u1ED9 \u0111i\u1EC3m t\xEDch l\u0169y c\u1EE7a c\xE2u hi\u1EC7n t\u1EA1i.",
        penaltyText: penaltyText2,
        donorTeamId: team.id,
        donorTeamName: team.name,
        deductedPoints: 0
      }
    };
  }
  if (bombType === "BOMB_DARK") {
    if (isSurvivalPenalty) {
      const penalty2 = Math.min(currentScore, baseQuestionPoints);
      const penaltyText3 = penalty2 > 0 ? `N\u0103ng l\u01B0\u1EE3ng b\xF3ng t\u1ED1i nu\u1ED1t ch\u1EEDng! Ch\u1EBF \u0111\u1ED9 Sinh T\u1EED ph\u1EA1t tr\u1EEB 100% \u0111i\u1EC3m g\u1ED1c c\xE2u h\u1ECFi (-${penalty2}\u0111)!` : "\u0110i\u1EC3m hi\u1EC7n t\u1EA1i l\xE0 0 n\xEAn kh\xF4ng b\u1ECB tr\u1EEB \u0111i\u1EC3m.";
      return {
        penalty: penalty2,
        penaltyText: penaltyText3,
        giftedPoints: 0,
        bombExploded: {
          type: "DARK",
          title: "Bom T\u1ED1i \u{1F311}",
          description: storyDescription || "N\u0103ng l\u01B0\u1EE3ng b\xF3ng t\u1ED1i nu\u1ED1t ch\u1EEDng! Ch\u1EBF \u0111\u1ED9 Sinh T\u1EED ph\u1EA1t tr\u1EEB \u0111i\u1EC3m g\u1ED1c c\xE2u h\u1ECFi.",
          penaltyText: penaltyText3,
          donorTeamId: team.id,
          donorTeamName: team.name,
          deductedPoints: penalty2
        }
      };
    }
    let penalty = 0;
    let penaltyText2 = "";
    const darkBombRecipients = [];
    const numOpponents = otherTeams.length;
    const threshold = 5 * numOpponents;
    if (numOpponents === 0) {
      penalty = currentScore > 0 ? Math.min(currentScore, 5) : 0;
      penaltyText2 = penalty > 0 ? `B\u1ECB tr\u1EEB ${penalty} \u0111i\u1EC3m t\u1EEB t\u1ED5ng \u0111i\u1EC3m.` : "\u0110i\u1EC3m hi\u1EC7n t\u1EA1i l\xE0 0 n\xEAn kh\xF4ng b\u1ECB tr\u1EEB \u0111i\u1EC3m.";
    } else if (currentScore < threshold) {
      if (currentScore <= 0) {
        penalty = 0;
        penaltyText2 = "\u0110i\u1EC3m c\u1EE7a b\u1EA1n hi\u1EC7n t\u1EA1i l\xE0 0 n\xEAn kh\xF4ng b\u1ECB tr\u1EEB \u0111i\u1EC3m v\xE0 kh\xF4ng ph\xE2n chia cho \u0111\u1ED1i th\u1EE7.";
      } else {
        const sortedOthers = [...otherTeams].sort((a, b) => {
          const diff = (a.score || 0) - (b.score || 0);
          if (diff !== 0) return diff;
          return Math.random() - 0.5;
        });
        const numTeamsToReceive = Math.min(Math.floor(currentScore / 5), sortedOthers.length);
        for (let i = 0; i < numTeamsToReceive; i++) {
          darkBombRecipients.push({
            teamId: sortedOthers[i].id,
            teamName: sortedOthers[i].name,
            points: 5
          });
        }
        penalty = darkBombRecipients.length * 5;
        const recNames = darkBombRecipients.map((r) => `${r.teamName} (+5\u0111)`).join(", ");
        penaltyText2 = recNames ? `B\u1ECB tr\u1EEB ${penalty} \u0111i\u1EC3m! \u0110\xE3 ph\xE2n ph\xE1t cho \u0111\u1ED9i th\u1EA5p \u0111i\u1EC3m nh\u1EA5t: ${recNames}` : "\u0110i\u1EC3m kh\xF4ng \u0111\u1EE7 5\u0111 \u0111\u1EC3 ph\xE2n chia cho \u0111\u1ED1i th\u1EE7.";
      }
    } else {
      penalty = 5 * numOpponents;
      for (const other of otherTeams) {
        darkBombRecipients.push({
          teamId: other.id,
          teamName: other.name,
          points: 5
        });
      }
      const recNames = darkBombRecipients.map((r) => `${r.teamName} (+5\u0111)`).join(", ");
      penaltyText2 = `B\u1ECB tr\u1EEB ${penalty} \u0111i\u1EC3m! Chia cho c\xE1c \u0111\u1ED1i th\u1EE7 c\xF2n l\u1EA1i: ${recNames}`;
    }
    return {
      penalty,
      penaltyText: penaltyText2,
      giftedPoints: 0,
      darkBombRecipients,
      bombExploded: {
        type: "DARK",
        title: "Bom H\u1EAFc \xC1m \u{1F311}",
        description: storyDescription || "N\u0103ng l\u01B0\u1EE3ng b\xF3ng t\u1ED1i b\xF9ng ph\xE1t! \u0110i\u1EC3m s\u1ED1 c\u1EE7a b\u1EA1n b\u1ECB r\xFAt c\u1EA1n v\xE0 ph\xE2n chia \u0111\u1EC1u cho c\xE1c \u0111\u1ED9i \u0111\u1ED1i th\u1EE7!",
        penaltyText: penaltyText2,
        donorTeamId: team.id,
        donorTeamName: team.name,
        deductedPoints: penalty,
        recipients: darkBombRecipients
      }
    };
  }
  const rawHalf = roundToMultipleOfFive(currentScore * 0.5);
  const rawBaseMultiplier = roundToMultipleOfFive(baseQuestionPoints * 1.5);
  const targetPenalty = Math.min(rawHalf, rawBaseMultiplier);
  const giftedPoints = currentScore > 0 ? Math.min(currentScore, targetPenalty) : 0;
  let recipientTeamId = void 0;
  let recipientTeamName = void 0;
  if (otherTeams.length > 0) {
    const maxScore = Math.max(...otherTeams.map((t) => t.score || 0));
    const topTeams = otherTeams.filter((t) => (t.score || 0) === maxScore);
    const chosen = topTeams[Math.floor(Math.random() * topTeams.length)];
    recipientTeamId = chosen.id;
    recipientTeamName = chosen.name;
  }
  const penaltyReason = rawHalf <= rawBaseMultiplier ? `50% \u0111i\u1EC3m \u0111\u1ED9i (-${giftedPoints}\u0111)` : `1.5 l\u1EA7n \u0111i\u1EC3m g\u1ED1c c\xE2u h\u1ECFi (-${giftedPoints}\u0111)`;
  const penaltyText = recipientTeamName ? `B\u1ECB ph\u1EA1t theo ph\u01B0\u01A1ng \xE1n th\u1EA5p h\u01A1n: ${penaltyReason} v\xE0 chuy\u1EC3n t\u1EB7ng to\xE0n b\u1ED9 cho \u0110\u1ED9i ${recipientTeamName}!` : `B\u1ECB ph\u1EA1t theo ph\u01B0\u01A1ng \xE1n th\u1EA5p h\u01A1n: ${penaltyReason}!`;
  return {
    penalty: giftedPoints,
    penaltyText,
    giftedPoints,
    recipientTeamId,
    recipientTeamName,
    bombExploded: {
      type: "CHARITY",
      title: "Bom T\u1EEB Thi\u1EC7n \u{1F381}",
      description: storyDescription || "L\xF2ng t\u1ED1t b\u1EA5t \u0111\u1EAFc d\u0129! B\u1ECB tr\u1EEB theo m\u1EE9c th\u1EA5p h\u01A1n gi\u1EEFa 50% \u0111i\u1EC3m \u0111\u1ED9i v\xE0 1.5x \u0111i\u1EC3m c\xE2u, chuy\u1EC3n t\u1EB7ng to\xE0n b\u1ED9 cho \u0111\u1ED9i \u0111ang d\u1EABn \u0111\u1EA7u!",
      penaltyText,
      donorTeamId: team.id,
      donorTeamName: team.name,
      deductedPoints: giftedPoints,
      recipientTeamId,
      recipientTeamName,
      giftedPoints
    }
  };
}
function generateMysteryPromoPerk(_basePoints = 10, miniGameType, options) {
  const normType = miniGameType ? normalizeMiniGameType(miniGameType) : "PUSH_YOUR_LUCK";
  const hasOpponentWithScore = Boolean(
    options?.teams && options.teams.some((t) => t.id !== options.currentTeamId && (t.score || 0) > 0)
  );
  let pool = [];
  if (normType === "MEMORY_PAIRS") {
    pool = ["SHIELD_PROMO", "EXTRA_POT_PROMO", "PEEK_PROMO", "EXTRA_ATTEMPT_PROMO"];
    if (hasOpponentWithScore) pool.push("STEAL_5_PROMO");
  } else if (normType === "ONE_SHOT_DOORS") {
    pool = ["SHIELD_PROMO", "EXTRA_POT_PROMO", "PEEK_PROMO"];
    if (hasOpponentWithScore) pool.push("STEAL_5_PROMO");
  } else if (normType === "TAROT_DESTINY") {
    pool = ["SHIELD_PROMO", "EXTRA_POT_PROMO", "SUN_MAGNET_PROMO"];
    if (hasOpponentWithScore) pool.push("STEAL_5_PROMO");
  } else {
    pool = ["SHIELD_PROMO", "EXTRA_POT_PROMO", "PEEK_PROMO", "SAFETY_NET_PROMO"];
    if (hasOpponentWithScore) pool.push("STEAL_5_PROMO");
  }
  return pool[Math.floor(Math.random() * pool.length)];
}
function calculatePromoSteal5({
  activeTeamId,
  allTeams,
  timesStolenInCycle = {},
  teamShields,
  currentTurnIndex = 0
}) {
  const opponents = (allTeams || []).filter(
    (t) => t.id !== activeTeamId && !t.isEliminated && (t.score || 0) > 0
  );
  if (opponents.length === 0) {
    return { stolenPoints: 5, isFromBank: true };
  }
  const eligibleOpponents = opponents.filter((t) => {
    if ((timesStolenInCycle[t.id] ?? 0) >= 2) return false;
    const shield = teamShields?.[t.id];
    if (shield && currentTurnIndex >= shield.activeFromTurnIndex && currentTurnIndex <= shield.expiresAfterTurnIndex) {
      return false;
    }
    return true;
  });
  if (eligibleOpponents.length === 0) {
    return {
      stolenPoints: 5,
      isFromBank: true,
      protectionNote: "C\xE1c \u0111\u1ED1i th\u1EE7 \u0111\u1EC1u \u0111ang \u0111\u01B0\u1EE3c Khi\xEAn Ho\xE0ng \u0110\u1EBF b\u1EA3o v\u1EC7! B\u1EA1n nh\u1EADn +5\u0111 an to\xE0n t\u1EEB H\u1EC7 Th\u1ED1ng."
    };
  }
  const maxScore = Math.max(...eligibleOpponents.map((t) => t.score || 0));
  const topOpponents = eligibleOpponents.filter((t) => (t.score || 0) === maxScore);
  const chosenVictim = topOpponents[Math.floor(Math.random() * topOpponents.length)];
  const stolenPoints = Math.min(5, chosenVictim.score || 0);
  return {
    victimTeamId: chosenVictim.id,
    victimTeamName: chosenVictim.name,
    stolenPoints
  };
}
function getPerkType(promo) {
  if (!promo) return void 0;
  return typeof promo === "string" ? promo : promo.type;
}
function getInitialMemoryPairsState(promo) {
  const perkType = getPerkType(promo);
  return {
    firstFlippedTileId: null,
    secondFlippedTileId: null,
    thirdFlippedTileId: null,
    keptBombTileIds: [],
    faceUpPenaltyTileIds: [],
    isBombRescueActive: false,
    activePenaltyPairKey: null,
    attemptsUsed: 0,
    maxAttempts: perkType === "EXTRA_ATTEMPT_PROMO" ? 6 : 5,
    matchedPairKey: null,
    isMismatchResolving: false,
    round: 1,
    promptSecondChance: false
  };
}
var REWARD_TEMPLATES = {
  CASTLE: [
    { storyTitle: "\u{1F48E} Kho B\xE1u +30\u0111", storyDescription: "Ph\xE1p S\u01B0 truy\u1EC1n d\u1EA1y b\xED k\xEDp: Th\u01B0\u1EDFng n\xF3ng +30 \u0111i\u1EC3m qu\u1EF9!", deltaPoints: 30, effectType: "BONUS_POINTS" },
    { storyTitle: "\u{1F680} Nh\xE2n \u0110\xF4i x2", storyDescription: "\xC1nh s\xE1ng tinh t\xFA soi r\u1ECDi: Nh\xE2n \u0111\xF4i (x2) \u0111i\u1EC3m g\u1ED1c c\xE2u h\u1ECFi v\xE0o qu\u1EF9 th\u01B0\u1EDFng!", deltaPoints: 0, effectType: "MULTIPLY_X2" },
    { storyTitle: "\u{1F3AD} C\u01B0\u1EDBp +20\u0111", storyDescription: "\xC1o t\xE0ng h\xECnh xu\u1EA5t k\xEDch: C\u01B0\u1EDBp th\xEAm 20\u0111 v\xE0o qu\u1EF9 th\u01B0\u1EDFng!", deltaPoints: 20, effectType: "STEAL_POINTS" },
    { storyTitle: "\u{1F6E1}\uFE0F Khi\xEAn +20\u0111", storyDescription: "Nh\u1EB7t \u0111\u01B0\u1EE3c khi\xEAn c\u1ED5 ho\xE0ng gia: Th\u01B0\u1EDFng an to\xE0n +20 \u0111i\u1EC3m qu\u1EF9!", deltaPoints: 20, effectType: "BONUS_POINTS" },
    { storyTitle: "\u{1F4DC} B\xED Truy\u1EC1n +25\u0111", storyDescription: "Gi\u1EA3i m\xE3 cu\u1ED9n gi\u1EA5y th\xF4ng th\xE1i: Th\u01B0\u1EDFng n\xF3ng +25 \u0111i\u1EC3m qu\u1EF9!", deltaPoints: 25, effectType: "BONUS_POINTS" },
    { storyTitle: "\u{1F4B0} Kho V\xE0ng +25\u0111", storyDescription: "M\u1EDF \u0111\xFAng c\u0103n h\u1EA7m ho\xE0ng gia: +25 \u0111i\u1EC3m qu\u1EF9!", deltaPoints: 25, effectType: "BONUS_POINTS" },
    { storyTitle: "\u2728 Pha L\xEA +20\u0111", storyDescription: "N\u0103ng l\u01B0\u1EE3ng d\u1ED3i d\xE0o: +20 \u0111i\u1EC3m qu\u1EF9!", deltaPoints: 20, effectType: "BONUS_POINTS" },
    { storyTitle: "\u{1F451} V\u01B0\u01A1ng Mi\u1EC7n +35\u0111", storyDescription: "T\xECm th\u1EA5y v\u01B0\u01A1ng mi\u1EC7n b\u1EA3o v\u1EADt: +35 \u0111i\u1EC3m qu\u1EF9!", deltaPoints: 35, effectType: "BONUS_POINTS" }
  ],
  PIRATE: [
    { storyTitle: "\u{1F451} Kho B\xE1u +40\u0111", storyDescription: "H\xF2m kim c\u01B0\u01A1ng kh\u1ED5ng l\u1ED3: Th\u01B0\u1EDFng l\u1EDBn +40 \u0111i\u1EC3m qu\u1EF9!", deltaPoints: 40, effectType: "BONUS_POINTS" },
    { storyTitle: "\u2693 Nh\xE2n \u0110\xF4i x2", storyDescription: "V\u1EADn may \u0111\u1EA1i d\u01B0\u01A1ng: Nh\xE2n \u0111\xF4i (x2) \u0111i\u1EC3m g\u1ED1c c\xE2u h\u1ECFi v\xE0o qu\u1EF9 th\u01B0\u1EDFng!", deltaPoints: 0, effectType: "MULTIPLY_X2" },
    { storyTitle: "\u{1F5E1}\uFE0F C\u01B0\u1EDBp +25\u0111", storyDescription: "C\u01B0\u1EDBp b\xF3c khoang thuy\u1EC1n: C\u01B0\u1EDBp 25\u0111 v\xE0o qu\u1EF9 th\u01B0\u1EDFng!", deltaPoints: 25, effectType: "STEAL_POINTS" },
    { storyTitle: "\u{1F99C} Ch\u1EC9 \u0110\u01B0\u1EDDng +25\u0111", storyDescription: "Ch\xFA v\u1EB9t ch\u1EC9 \u0111\u01B0\u1EDDng t\u1EAFt v\xE0o kho b\xE1u: Th\u01B0\u1EDFng l\u1EDBn +25 \u0111i\u1EC3m qu\u1EF9!", deltaPoints: 25, effectType: "BONUS_POINTS" },
    { storyTitle: "\u{1F37B} Th\u01B0\u1EDFng +20\u0111", storyDescription: "Li\xEAn hoan t\u01B0ng b\u1EEBng: +20 \u0111i\u1EC3m qu\u1EF9!", deltaPoints: 20, effectType: "BONUS_POINTS" },
    { storyTitle: "\u{1F9ED} La B\xE0n +25\u0111", storyDescription: "T\xECm th\u1EA5y h\u01B0\u1EDBng gi\xF3 l\xE0nh: +25 \u0111i\u1EC3m qu\u1EF9!", deltaPoints: 25, effectType: "BONUS_POINTS" },
    { storyTitle: "\u{1FA99} Ti\u1EC1n V\xE0ng +30\u0111", storyDescription: "Nh\u1EB7t \u0111\u01B0\u1EE3c t\xFAi v\xE0ng nguy\xEAn v\u1EB9n: +30 \u0111i\u1EC3m qu\u1EF9!", deltaPoints: 30, effectType: "BONUS_POINTS" },
    { storyTitle: "\u{1F6E1}\uFE0F Khi\xEAn +20\u0111", storyDescription: "Nh\u1EB7t \u0111\u01B0\u1EE3c m\u1ED9c g\u1ED7 qu\xFD b\xE1u: Th\u01B0\u1EDFng an to\xE0n +20 \u0111i\u1EC3m qu\u1EF9!", deltaPoints: 20, effectType: "BONUS_POINTS" }
  ],
  FOREST: [
    { storyTitle: "\u{1F31F} Kho B\xE1u +35\u0111", storyDescription: "N\u1EEF Ho\xE0ng Ti\xEAn ban t\u1EB7ng: Th\u01B0\u1EDFng ngay +35 \u0111i\u1EC3m qu\u1EF9!", deltaPoints: 35, effectType: "BONUS_POINTS" },
    { storyTitle: "\u{1F338} Nh\xE2n \u0110\xF4i x2", storyDescription: "Sinh l\u1EF1c tr\xE0n tr\u1EC1: Nh\xE2n \u0111\xF4i (x2) \u0111i\u1EC3m g\u1ED1c c\xE2u h\u1ECFi v\xE0o qu\u1EF9 th\u01B0\u1EDFng!", deltaPoints: 0, effectType: "MULTIPLY_X2" },
    { storyTitle: "\u{1F98A} C\u01B0\u1EDBp +20\u0111", storyDescription: "L\u1EBBn tr\u1ED9m t\xFAi ti\u1EC1n: C\u01B0\u1EDBp 20\u0111 v\xE0o qu\u1EF9 th\u01B0\u1EDFng!", deltaPoints: 20, effectType: "STEAL_POINTS" },
    { storyTitle: "\u{1F33F} Khi\xEAn +20\u0111", storyDescription: "B\xF9a ch\xFA r\u1EEBng xanh h\u1ED9 th\u1EC3: Th\u01B0\u1EDFng an to\xE0n +20 \u0111i\u1EC3m qu\u1EF9!", deltaPoints: 20, effectType: "BONUS_POINTS" },
    { storyTitle: "\u{1F3F9} Th\u01B0\u1EDFng +30\u0111", storyDescription: "B\u1EAFn tr\xFAng h\u1ED3ng t\xE2m kho b\xE1u: Th\u01B0\u1EDFng l\u1EDBn +30 \u0111i\u1EC3m qu\u1EF9!", deltaPoints: 30, effectType: "BONUS_POINTS" },
    { storyTitle: "\u{1F36F} M\u1EADt Ong +25\u0111", storyDescription: "Ng\u1ECDt ng\xE0o n\u0103ng l\u01B0\u1EE3ng: +25 \u0111i\u1EC3m qu\u1EF9!", deltaPoints: 25, effectType: "BONUS_POINTS" },
    { storyTitle: "\u{1F98B} Tinh Linh +20\u0111", storyDescription: "\xC1nh s\xE1ng d\u1EABn l\u1ED1i: +20 \u0111i\u1EC3m qu\u1EF9!", deltaPoints: 20, effectType: "BONUS_POINTS" },
    { storyTitle: "\u{1F48E} L\u1EE5c B\u1EA3o +30\u0111", storyDescription: "Vi\xEAn ng\u1ECDc ng\xE0n n\u0103m: +30 \u0111i\u1EC3m qu\u1EF9!", deltaPoints: 30, effectType: "BONUS_POINTS" }
  ],
  CYBER: [
    { storyTitle: "\u26A1 Si\xEAu Th\u01B0\u1EDFng +40\u0111", storyDescription: "B\xF9ng n\u1ED5 si\xEAu n\u0103ng l\u01B0\u1EE3ng: Th\u01B0\u1EDFng l\u1EDBn +40 \u0111i\u1EC3m qu\u1EF9!", deltaPoints: 40, effectType: "BONUS_POINTS" },
    { storyTitle: "\u{1F680} Nh\xE2n \u0110\xF4i x2", storyDescription: "Gia t\u1ED1c c\u1EF1c \u0111\u1EA1i: Nh\xE2n \u0111\xF4i (x2) \u0111i\u1EC3m g\u1ED1c c\xE2u h\u1ECFi v\xE0o qu\u1EF9 th\u01B0\u1EDFng!", deltaPoints: 0, effectType: "MULTIPLY_X2" },
    { storyTitle: "\u{1F6F0}\uFE0F C\u01B0\u1EDBp +25\u0111", storyDescription: "Chuy\u1EC3n lu\u1ED3ng d\u1EEF li\u1EC7u: C\u01B0\u1EDBp 25\u0111 v\xE0o qu\u1EF9 th\u01B0\u1EDFng!", deltaPoints: 25, effectType: "STEAL_POINTS" },
    { storyTitle: "\u{1F6E1}\uFE0F L\xE1 Ch\u1EAFn +20\u0111", storyDescription: "Tr\u01B0\u1EDDng l\u1EF1c b\u1EA3o v\u1EC7 c\xF4ng ngh\u1EC7: Th\u01B0\u1EDFng an to\xE0n +20 \u0111i\u1EC3m qu\u1EF9!", deltaPoints: 20, effectType: "BONUS_POINTS" },
    { storyTitle: "\u{1F4BE} D\u1EEF Li\u1EC7u +30\u0111", storyDescription: "Gi\u1EA3i m\xE3 d\u1EEF li\u1EC7u t\u1ED1i m\u1EADt: Th\u01B0\u1EDFng n\xF3ng +30 \u0111i\u1EC3m qu\u1EF9!", deltaPoints: 30, effectType: "BONUS_POINTS" },
    { storyTitle: "\u{1F4E1} V\u1EC7 Tinh +25\u0111", storyDescription: "B\u1EAFt tr\u1ECDn lu\u1ED3ng s\xF3ng qu\xFD: +25 \u0111i\u1EC3m qu\u1EF9!", deltaPoints: 25, effectType: "BONUS_POINTS" },
    { storyTitle: "\u{1F50B} N\u0103ng L\u01B0\u1EE3ng +20\u0111", storyDescription: "S\u1EA1c \u0111\u1EA7y pin t\xE0u: +20 \u0111i\u1EC3m qu\u1EF9!", deltaPoints: 20, effectType: "BONUS_POINTS" },
    { storyTitle: "\u{1F916} Si\xEAu Chip +30\u0111", storyDescription: "Thu\u1EADt to\xE1n x\u1EED l\xFD th\u1EA7n t\u1ED1c: +30 \u0111i\u1EC3m qu\u1EF9!", deltaPoints: 30, effectType: "BONUS_POINTS" }
  ],
  TEMPLE: [
    { storyTitle: "\u{1F451} Kho B\xE1u +40\u0111", storyDescription: "Khai m\u1EDF kho b\xE1u l\u0103ng m\u1ED9: Th\u01B0\u1EDFng l\u1EDBn +40 \u0111i\u1EC3m qu\u1EF9!", deltaPoints: 40, effectType: "BONUS_POINTS" },
    { storyTitle: "\u2600\uFE0F Nh\xE2n \u0110\xF4i x2", storyDescription: "Th\u1EA7n M\u1EB7t Tr\u1EDDi ban ph\u01B0\u1EDBc: Nh\xE2n \u0111\xF4i (x2) \u0111i\u1EC3m g\u1ED1c c\xE2u h\u1ECFi v\xE0o qu\u1EF9 th\u01B0\u1EDFng!", deltaPoints: 0, effectType: "MULTIPLY_X2" },
    { storyTitle: "\u{1F40D} C\u01B0\u1EDBp +20\u0111", storyDescription: "B\u1EABy ng\u1EA7m k\xEDch ho\u1EA1t: C\u01B0\u1EDBp 20\u0111 v\xE0o qu\u1EF9 th\u01B0\u1EDFng!", deltaPoints: 20, effectType: "STEAL_POINTS" },
    { storyTitle: "\u{1F3FA} C\u1ED5 V\u1EADt +25\u0111", storyDescription: "C\u1ED5 v\u1EADt nguy\xEAn v\u1EB9n: +25 \u0111i\u1EC3m qu\u1EF9!", deltaPoints: 25, effectType: "BONUS_POINTS" },
    { storyTitle: "\u{1F4DC} M\u1EADt \u0110\u1EA1o +30\u0111", storyDescription: "S\u01A1 \u0111\u1ED3 m\u1EADt \u0111\u1EA1o kim t\u1EF1 th\xE1p: Th\u01B0\u1EDFng l\u1EDBn +30 \u0111i\u1EC3m qu\u1EF9!", deltaPoints: 30, effectType: "BONUS_POINTS" },
    { storyTitle: "\u{1F48E} H\u1ED3ng Ng\u1ECDc +30\u0111", storyDescription: "Vi\xEAn \u0111\xE1 m\u1EAFt th\u1EA7n: +30 \u0111i\u1EC3m qu\u1EF9!", deltaPoints: 30, effectType: "BONUS_POINTS" },
    { storyTitle: "\u{1F6E1}\uFE0F Khi\xEAn +20\u0111", storyDescription: "Khi\xEAn chi\u1EBFn binh Ai C\u1EADp: Th\u01B0\u1EDFng an to\xE0n +20 \u0111i\u1EC3m qu\u1EF9!", deltaPoints: 20, effectType: "BONUS_POINTS" },
    { storyTitle: "\u{1F5DD}\uFE0F Ch\xECa Kh\xF3a +20\u0111", storyDescription: "Ch\xECa kh\xF3a m\u1EDF c\u1EEDa th\xF4ng \u0111\u1EA1o: +20 \u0111i\u1EC3m qu\u1EF9!", deltaPoints: 20, effectType: "BONUS_POINTS" }
  ]
};
function calculateCappedSteal({
  activeTeamId,
  allTeams,
  targetPoints = 20,
  maxCap,
  timesStolenInCycle = {}
}) {
  const effectiveCap = maxCap ?? Math.max(targetPoints, 50);
  const otherTeams = (allTeams || []).filter((t) => t.id !== activeTeamId && !t.isEliminated);
  if (otherTeams.length === 0) {
    return { stolenPoints: Math.min(targetPoints, effectiveCap), isFromBank: true };
  }
  const eligibleVictims = otherTeams.filter((t) => (timesStolenInCycle[t.id] ?? 0) < 2);
  if (eligibleVictims.length === 0) {
    const finalSteal = Math.min(targetPoints, effectiveCap);
    return {
      stolenPoints: finalSteal,
      isFromBank: true,
      protectionNote: "T\u1EA5t c\u1EA3 \u0111\u1ED1i th\u1EE7 \u0111\u1EC1u \u0111ang \u0111\u01B0\u1EE3c Khi\xEAn Mi\u1EC5n Nhi\u1EC5m C\u01B0\u1EDBp b\u1EA3o v\u1EC7! Nh\u1EADn \u0111i\u1EC3m an to\xE0n t\u1EEB Qu\u1EF9 H\u1EC7 Th\u1ED1ng."
    };
  }
  const sorted = [...eligibleVictims].sort((a, b) => (b.score || 0) - (a.score || 0));
  const victim = sorted[0];
  const victimScore = victim.score || 0;
  if (victimScore <= 0) {
    return {
      victimTeamId: victim.id,
      victimTeamName: victim.name,
      stolenPoints: 0
    };
  }
  const halfScore = Math.floor(victimScore * 0.5);
  const allowed = Math.min(targetPoints, effectiveCap, halfScore);
  const baseSteal = Math.max(1, allowed);
  const timesStolen = timesStolenInCycle[victim.id] ?? 0;
  if (timesStolen === 1) {
    const halfSteal = Math.max(5, roundToMultipleOfFive(baseSteal * 0.5));
    const finalSteal = Math.min(baseSteal, halfSteal);
    return {
      victimTeamId: victim.id,
      victimTeamName: victim.name,
      stolenPoints: finalSteal,
      isHalfProtection: true,
      protectionNote: `Khi\xEAn Ch\u1ED1ng V\u1EAFt Ki\u1EC7t: \u0110\u1ED9i ${victim.name} \u0111\xE3 b\u1ECB c\u01B0\u1EDBp l\u1EA7n 2 trong v\xF2ng, ch\u1EC9 b\u1ECB tr\u1EEB 50% (-${finalSteal}\u0111)!`
    };
  }
  return {
    victimTeamId: victim.id,
    victimTeamName: victim.name,
    stolenPoints: baseSteal
  };
}
function getTarotMinigameArchetypePool(basePoints = 20, options) {
  const riskTier = options?.riskTier ?? "NEUTRAL";
  const currentRound = options?.currentRound ?? 1;
  const pBase = basePoints;
  const pSun = basePoints * 2;
  const pMedium = Math.round(basePoints * 1.5);
  const pHalf = roundToMultipleOfFive(basePoints * 0.5);
  const canSteal = currentRound >= 2 && Boolean(
    options?.teams && options?.teams.some((t) => t.id !== options?.currentTeamId && (t.score || 0) >= pHalf)
  );
  const defaultPlus = {
    key: "THE_MAGICIAN",
    nameVi: "Ph\xE1p S\u01B0 Kh\u1EDFi Nguy\xEAn",
    nameEn: "The Magician",
    icon: "\u{1FA84}",
    type: "REWARD",
    effectType: "BONUS_POINTS",
    storyTitle: `\u{1FA84} Ph\xE1p S\u01B0 +${pBase}\u0111`,
    storyDescription: `Ph\xE1p s\u01B0 ban ph\u01B0\u1EDBc: Nh\u1EADn an to\xE0n +${pBase} \u0111i\u1EC3m c\u01A1 b\u1EA3n!`,
    deltaMultiplier: 1,
    deltaPoints: pBase,
    isNegative: false
  };
  const towerPenalty = riskTier === "UNDERDOG" ? 0 : pBase;
  const defaultMinus = {
    key: "THE_TOWER",
    nameVi: "Th\xE1p B\u1EABy S\u1EE5p \u0110\u1ED5",
    nameEn: "The Tower",
    icon: "\u26A1",
    type: "TRAP",
    effectType: "LOSE_POINTS",
    storyTitle: `\u26A1 Th\xE1p B\u1EABy -${towerPenalty}\u0111`,
    storyDescription: riskTier === "UNDERDOG" ? "Th\xE1p s\u1EE5p \u0111\u1ED5 nh\u01B0ng \u0111\u1ED9i y\u1EBFu th\u1EBF \u0111\u01B0\u1EE3c th\u1EA7n h\u1ED9 m\u1EC7nh b\u1EA3o h\u1ED9 (0\u0111 ph\u1EA1t)!" : `D\xEDnh b\u1EABy th\xE1p s\u1EE5p \u0111\u1ED5: Tr\u1EEB -${towerPenalty} \u0111i\u1EC3m c\u01A1 b\u1EA3n!`,
    deltaMultiplier: riskTier === "UNDERDOG" ? 0 : -1,
    deltaPoints: -towerPenalty,
    isNegative: true
  };
  const candidates = [
    // 1. THE_SUN: +2x Base points (Strict 2x ceiling)
    {
      key: "THE_SUN",
      nameVi: "M\u1EB7t Tr\u1EDDi Vinh Quang",
      nameEn: "The Sun",
      icon: "\u2600\uFE0F",
      type: "REWARD",
      effectType: "MULTIPLY_X2",
      storyTitle: `\u2600\uFE0F M\u1EB7t Tr\u1EDDi +${pSun}\u0111`,
      storyDescription: `\xC1nh d\u01B0\u01A1ng r\u1EF1c r\u1EE1: Nh\xE2n \u0111\xF4i \u0111\u1EA1i th\u01B0\u1EDFng x2 \u0111i\u1EC3m g\u1ED1c (+${pSun}\u0111)!`,
      deltaMultiplier: 2,
      deltaPoints: pSun,
      isNegative: false
    },
    // 2. THE_EMPEROR: Shield Protection (+1x base points)
    {
      key: "THE_EMPEROR",
      nameVi: "Ho\xE0ng \u0110\u1EBF Quy\u1EC1n Uy",
      nameEn: "The Emperor",
      icon: "\u{1F6E1}\uFE0F",
      type: "REWARD",
      effectType: "BONUS_POINTS",
      storyTitle: `\u{1F6E1}\uFE0F Khi\xEAn Th\u1EA7n +${pBase}\u0111`,
      storyDescription: `Uy quy\u1EC1n t\u1ED1i th\u01B0\u1EE3ng: Trang b\u1ECB 1 Khi\xEAn Th\u1EA7n ph\xF2ng ng\u1EF1 v\xE0 nh\u1EADn tr\u1ECDn v\u1EB9n +${pBase}\u0111!`,
      deltaMultiplier: 1,
      deltaPoints: pBase,
      isNegative: false,
      givesShield: true
    },
    // 3. STRENGTH: Heart Recovery (+1x base points)
    {
      key: "STRENGTH",
      nameVi: "S\u1EE9c M\u1EA1nh Ph\u1EE5c H\u1ED3i",
      nameEn: "Strength",
      icon: "\u2764\uFE0F",
      type: "REWARD",
      effectType: "BONUS_POINTS",
      storyTitle: `\u2764\uFE0F H\u1ED3i 1 Tim +${pBase}\u0111`,
      storyDescription: `Ngh\u1ECB l\u1EF1c ki\xEAn c\u01B0\u1EDDng: H\u1ED3i ph\u1EE5c 1 Tr\xE1i Tim ph\xF2ng th\u1EE7 v\xE0 nh\u1EADn tr\u1ECDn v\u1EB9n +${pBase}\u0111!`,
      deltaMultiplier: 1,
      deltaPoints: pBase,
      isNegative: false,
      givesHeart: true
    },
    // 4. THE_CHARIOT: Steal 50% base points (or +0.5x if cannot steal)
    {
      key: "THE_CHARIOT",
      nameVi: "C\u1ED7 Xe \u0110o\u1EA1t B\u1EA3o",
      nameEn: "The Chariot",
      icon: "\u{1F5E1}\uFE0F",
      type: "REWARD",
      effectType: canSteal ? "STEAL_POINTS" : "BONUS_POINTS",
      storyTitle: canSteal ? `\u{1F5E1}\uFE0F C\u01B0\u1EDBp 50% (+${pHalf}\u0111)` : `\u{1F5E1}\uFE0F Chi\u1EBFn Xa +${pHalf}\u0111`,
      storyDescription: canSteal ? `\u0110\u1ED9t k\xEDch ch\u1EDBp nho\xE1ng: C\u01B0\u1EDBp 50% \u0111i\u1EC3m c\u01A1 b\u1EA3n (+${pHalf}\u0111) t\u1EEB m\u1ED9t \u0111\u1ED1i th\u1EE7!` : `Chi\u1EBFn xa vi\u1EC5n chinh: Nh\u1EADn an to\xE0n +${pHalf} \u0111i\u1EC3m th\u01B0\u1EDFng!`,
      deltaMultiplier: 0.5,
      deltaPoints: pHalf,
      isNegative: false,
      isSteal: canSteal,
      stealFraction: 0.5
    },
    // 5. THE_DEATH: Steal 100% (or 50% if stolen) or +1x if cannot steal
    {
      key: "THE_DEATH",
      nameVi: "Th\u1EA7n Ch\u1EBFt \u0110o\u1EA1t M\u1EC7nh",
      nameEn: "The Death",
      icon: "\u{1F480}",
      type: "REWARD",
      effectType: canSteal ? "STEAL_POINTS" : "BONUS_POINTS",
      storyTitle: canSteal ? `\u{1F480} \u0110o\u1EA1t M\u1EC7nh +${pBase}\u0111` : `\u{1F480} Ph\xE1n X\xE9t +${pBase}\u0111`,
      storyDescription: canSteal ? `L\u01B0\u1EE1i h\xE1i \u0111\u1ECBnh m\u1EC7nh: \u0110o\u1EA1t l\u1EA5y +${pBase} \u0111i\u1EC3m c\u01A1 b\u1EA3n t\u1EEB \u0111\u1ED1i th\u1EE7 Top 1!` : `Th\u1EA7n Ch\u1EBFt chuy\u1EC3n h\xF3a ph\u01B0\u1EDBc l\xE0nh: Nh\u1EADn an to\xE0n +${pBase} \u0111i\u1EC3m!`,
      deltaMultiplier: 1,
      deltaPoints: pBase,
      isNegative: false,
      isSteal: canSteal,
      stealFraction: 1
    },
    // 6. THE_FOOL: ±0đ Neutral
    {
      key: "THE_FOOL",
      nameVi: "K\u1EBB Kh\u1EDD L\xE3ng Du",
      nameEn: "The Fool",
      icon: "\u{1F0CF}",
      type: "REWARD",
      effectType: "BONUS_POINTS",
      storyTitle: "\u{1F0CF} K\u1EBB Kh\u1EDD \xB10\u0111",
      storyDescription: "V\xF4 th\u01B0\u1EDFng v\xF4 ph\u1EA1t: Gi\u1EEF nguy\xEAn th\u1EBF tr\u1EADn an to\xE0n tuy\u1EC7t \u0111\u1ED1i (\xB10\u0111)!",
      deltaMultiplier: 0,
      deltaPoints: 0,
      isNegative: false
    },
    // 7. WHEEL_OF_FORTUNE: +1.5x Base points
    {
      key: "WHEEL_OF_FORTUNE",
      nameVi: "V\xF2ng Quay \u0110\u1ECBnh M\u1EC7nh",
      nameEn: "Wheel of Fortune",
      icon: "\u{1F3A1}",
      type: "REWARD",
      effectType: "BONUS_POINTS",
      storyTitle: `\u{1F3A1} \u0110\u1ECBnh M\u1EC7nh +${pMedium}\u0111`,
      storyDescription: `B\xE1nh xe lu\xE2n chuy\u1EC3n: Th\u01B0\u1EDFng may m\u1EAFn +1.5x \u0111i\u1EC3m c\u01A1 b\u1EA3n (+${pMedium}\u0111)!`,
      deltaMultiplier: 1.5,
      deltaPoints: pMedium,
      isNegative: false
    },
    // 8. THE_HIGH_PRIESTESS: +1x Base points
    {
      key: "THE_HIGH_PRIESTESS",
      nameVi: "N\u1EEF Tu Tr\xED Tu\u1EC7",
      nameEn: "The High Priestess",
      icon: "\u{1F52E}",
      type: "REWARD",
      effectType: "BONUS_POINTS",
      storyTitle: `\u{1F52E} N\u1EEF Tu +${pBase}\u0111`,
      storyDescription: `Tr\u1EF1c gi\xE1c s\xE1ng su\u1ED1t: Ban ph\u01B0\u1EDBc b\xECnh an nh\u1EADn \u0111\u1EE7 +${pBase} \u0111i\u1EC3m!`,
      deltaMultiplier: 1,
      deltaPoints: pBase,
      isNegative: false
    },
    // 9. TEMPERANCE: +1.5x Base points for active team, +0.5x for all other teams (Dung hợp hài hòa)
    {
      key: "TEMPERANCE",
      nameVi: "Ti\u1EBFt \u0110\u1ED9 H\xE0i H\xF2a",
      nameEn: "Temperance",
      icon: "\u2696\uFE0F",
      type: "REWARD",
      effectType: "BONUS_POINTS",
      storyTitle: `\u2696\uFE0F Ti\u1EBFt \u0110\u1ED9 +${pMedium}\u0111 (C\xE1c \u0111\u1ED9i kh\xE1c +${pHalf}\u0111)`,
      storyDescription: `Dung h\u1EE3p h\xE0i h\xF2a: B\u1EA1n nh\u1EADn +1.5x (+${pMedium}\u0111), \u0111\u1ED3ng th\u1EDDi ban ph\u01B0\u1EDBc chia s\u1EBB +0.5x (+${pHalf}\u0111) cho t\u1EA5t c\u1EA3 c\xE1c \u0111\u1ED1i th\u1EE7!`,
      deltaMultiplier: 1.5,
      deltaPoints: pMedium,
      isNegative: false
    },
    // 10. THE_DEVIL: Dark Bomb (Bom Hắc Ám - trừ chia đều đối thủ)
    {
      key: "THE_DEVIL",
      nameVi: "\xC1c Ma H\u1EAFc \xC1m",
      nameEn: "The Devil",
      icon: "\u{1F311}",
      type: "BOMB_DARK",
      effectType: "LOSE_POINTS",
      storyTitle: `\u{1F311} Bom T\u1ED1i -${pBase}\u0111`,
      storyDescription: `N\u0103ng l\u01B0\u1EE3ng h\u1EAFc \xE1m b\xF9ng ph\xE1t: Ph\u1EA1t tr\u1EEB -${pBase}\u0111 chia \u0111\u1EC1u cho c\xE1c \u0111\u1ED1i th\u1EE7!`,
      deltaMultiplier: -1,
      deltaPoints: -pBase,
      isNegative: true,
      isBomb: true,
      bombType: "BOMB_DARK"
    },
    // 11. THE_HANGED_MAN: Charity Bomb (Bom Từ Thiện - chuyển tặng Top 1)
    {
      key: "THE_HANGED_MAN",
      nameVi: "K\u1EBB Treo Ng\u01B0\u1EE3c",
      nameEn: "The Hanged Man",
      icon: "\u{1F381}",
      type: "BOMB_CHARITY",
      effectType: "LOSE_POINTS",
      storyTitle: "\u{1F381} Bom T\u1EB7ng",
      storyDescription: "Hy sinh b\u1EA5t \u0111\u1EAFc d\u0129: Ph\u1EA1t tr\u1EEB \u0111i\u1EC3m chuy\u1EC3n t\u1EB7ng tr\u1ECDn v\u1EB9n cho Top 1!",
      deltaMultiplier: 0,
      deltaPoints: 0,
      isNegative: true,
      isBomb: true,
      bombType: "BOMB_CHARITY"
    },
    // 12. SMOKE_BOMB: Smoke Bomb (Bom Khói - mất sạch điểm câu này 0đ)
    {
      key: "THE_KNIGHT",
      nameVi: "Hi\u1EC7p S\u0129 Kh\xF3i M\xF9",
      nameEn: "The Knight",
      icon: "\u{1F4A8}",
      type: "BOMB_SMOKE",
      effectType: "LOSE_POT_POINTS",
      storyTitle: "\u{1F4A8} Bom Kh\xF3i 0\u0111",
      storyDescription: "Kh\xF3i m\xF9 bao ph\u1EE7: M\u1EA5t s\u1EA1ch \u0111i\u1EC3m c\xE2u h\u1ECFi hi\u1EC7n t\u1EA1i (0\u0111), b\u1EA3o to\xE0n t\u1ED5ng \u0111i\u1EC3m!",
      deltaMultiplier: 0,
      deltaPoints: 0,
      isNegative: true,
      isBomb: true,
      bombType: "BOMB_SMOKE"
    }
  ];
  return { defaultPlus, defaultMinus, candidates };
}
function generateTarotQuotaArchetypes(basePoints = 20, options) {
  const { defaultPlus, defaultMinus, candidates } = getTarotMinigameArchetypePool(basePoints, options);
  const currentRound = options?.currentRound ?? 1;
  const riskTier = options?.riskTier ?? "NEUTRAL";
  const getCard = (key) => {
    return candidates.find((c) => c.key === key) || candidates[0];
  };
  const slotFool = getCard("THE_FOOL");
  const highMultPool = [getCard("THE_SUN"), getCard("WHEEL_OF_FORTUNE")];
  const slotHigh = highMultPool[Math.floor(Math.random() * highMultPool.length)];
  const supportPool = [getCard("THE_EMPEROR"), getCard("STRENGTH")];
  const slotSupport = supportPool[Math.floor(Math.random() * supportPool.length)];
  let quotaArchetypes;
  if (currentRound <= 1 || riskTier === "UNDERDOG") {
    const slotHazard2 = getCard("THE_KNIGHT");
    const slotSafe1 = getCard("THE_HIGH_PRIESTESS");
    const slotSafe2 = getCard("TEMPERANCE");
    quotaArchetypes = [slotFool, slotHazard2, slotHigh, slotSupport, slotSafe1, slotSafe2];
  } else {
    const slotHazard2 = Math.random() < 0.5 ? getCard("THE_DEVIL") : getCard("THE_HANGED_MAN");
    const slotHazard3 = slotHazard2.key === "THE_DEVIL" ? getCard("THE_HANGED_MAN") : getCard("THE_KNIGHT");
    const stealCard = Math.random() < 0.6 ? getCard("THE_CHARIOT") : getCard("THE_DEATH");
    const slotSteal = stealCard && stealCard.isSteal ? stealCard : Math.random() < 0.5 ? getCard("THE_HIGH_PRIESTESS") : getCard("TEMPERANCE");
    quotaArchetypes = [slotFool, slotHazard2, slotHazard3, slotHigh, slotSupport, slotSteal];
  }
  const allEightArchetypes = [defaultPlus, defaultMinus, ...quotaArchetypes];
  return {
    defaultPlus,
    defaultMinus,
    quotaArchetypes,
    allEightArchetypes
  };
}
function generateMemoryPairsTiles(basePoints = 20, options) {
  const { allEightArchetypes } = generateTarotQuotaArchetypes(basePoints, options);
  const tileItems = [];
  allEightArchetypes.forEach((arch) => {
    const pairKey = `PAIR_${arch.key}`;
    for (let c = 0; c < 2; c++) {
      tileItems.push({
        icon: arch.icon,
        isOpened: false,
        type: arch.type,
        storyTitle: arch.storyTitle,
        storyDescription: arch.storyDescription,
        effectType: arch.effectType,
        deltaPoints: arch.deltaPoints,
        pairKey,
        tarotCardKey: arch.key,
        bombDoorType: arch.bombType,
        givesShield: arch.givesShield,
        givesHeart: arch.givesHeart,
        stealFraction: arch.stealFraction
      });
    }
  });
  const shuffled = [...tileItems].sort(() => Math.random() - 0.5);
  return shuffled.map((item, idx) => ({
    ...item,
    id: idx + 1,
    label: `Th\u1EBB #${idx + 1}`
  }));
}
function generateSurvivalMemoryPairsTiles(basePoints = 20, _options) {
  const pPenalty = basePoints;
  const pSmokePenalty = roundToMultipleOfFive(basePoints * 0.5);
  const pairs = [
    // 1. Cặp Thoát Hiểm An Toàn (🕊️)
    {
      pairKey: "PAIR_ESCAPE",
      icon: "\u{1F54A}\uFE0F",
      type: "ESCAPE_SAFE",
      storyTitle: "\u{1F54A}\uFE0F Tho\xE1t Hi\u1EC3m",
      storyDescription: "K\u1EF3 t\xEDch xu\u1EA5t hi\u1EC7n! Gh\xE9p tr\xFAng c\u1EB7p Tho\xE1t Hi\u1EC3m, b\u1EA3o to\xE0n nguy\xEAn v\u1EB9n \u0111i\u1EC3m s\u1ED1 v\xE0 tim!",
      effectType: "BONUS_POINTS",
      deltaPoints: 0
    },
    // 2. Cặp Chàng Khờ (🃏 The Fool - Safe 0đ)
    {
      pairKey: "PAIR_THE_FOOL",
      icon: "\u{1F0CF}",
      type: "ESCAPE_SAFE",
      storyTitle: "0. Ch\xE0ng Kh\u1EDD (The Fool)",
      storyDescription: "V\xF4 \u01B0u v\xF4 lo! Tho\xE1t n\u1EA1n b\xECnh an v\xF4 s\u1EF1 m\xE0 kh\xF4ng ch\u1ECBu b\u1EA5t k\u1EF3 h\xECnh ph\u1EA1t n\xE0o (\xB10\u0111)!",
      effectType: "BONUS_POINTS",
      deltaPoints: 0,
      tarotCardKey: "THE_FOOL"
    },
    // 3. Cặp Tòa Tháp Sụp Đổ #1 (⚡ -1x)
    {
      pairKey: "PAIR_THE_TOWER_1",
      icon: "\u26A1",
      type: "TRAP",
      storyTitle: `XVI. T\xF2a Th\xE1p (The Tower) -${pPenalty}\u0111`,
      storyDescription: `S\u1EA5m s\xE9t gi\xE1ng xu\u1ED1ng! Gh\xE9p tr\xFAng T\xF2a Th\xE1p: B\u1ECB tr\u1EEB ${pPenalty} \u0111i\u1EC3m (100% \u0111i\u1EC3m g\u1ED1c c\xE2u h\u1ECFi)!`,
      effectType: "LOSE_POINTS",
      deltaPoints: -pPenalty,
      tarotCardKey: "THE_TOWER"
    },
    // 4. Cặp Tòa Tháp Sụp Đổ #2 (⚡ -1x)
    {
      pairKey: "PAIR_THE_TOWER_2",
      icon: "\u26A1",
      type: "TRAP",
      storyTitle: `XVI. T\xF2a Th\xE1p (The Tower) -${pPenalty}\u0111`,
      storyDescription: `C\u1ED9t tr\u1EE5 \u0111\u1ED5 s\u1EADp! Gh\xE9p tr\xFAng T\xF2a Th\xE1p: B\u1ECB tr\u1EEB ${pPenalty} \u0111i\u1EC3m (100% \u0111i\u1EC3m g\u1ED1c c\xE2u h\u1ECFi)!`,
      effectType: "LOSE_POINTS",
      deltaPoints: -pPenalty,
      tarotCardKey: "THE_TOWER"
    },
    // 5. Cặp Bom Khói (💨 -50%)
    {
      pairKey: "PAIR_BOMB_SMOKE",
      icon: "\u{1F4A8}",
      type: "BOMB_SMOKE",
      storyTitle: `\u{1F4A8} Bom Kh\xF3i -${pSmokePenalty}\u0111`,
      storyDescription: `Gh\xE9p tr\xFAng b\u1EABy kh\xF3i m\xF9: Ch\u1EBF \u0111\u1ED9 Sinh T\u1EED ph\u1EA1t tr\u1EEB 50% \u0111i\u1EC3m g\u1ED1c c\xE2u h\u1ECFi (-${pSmokePenalty}\u0111)!`,
      effectType: "LOSE_POINTS",
      deltaPoints: -pSmokePenalty
    },
    // 6. Cặp Bom Tối #1 (🌑 -1x)
    {
      pairKey: "PAIR_BOMB_DARK_1",
      icon: "\u{1F311}",
      type: "BOMB_DARK",
      storyTitle: `\u{1F311} Bom T\u1ED1i -${pPenalty}\u0111`,
      storyDescription: `Gh\xE9p tr\xFAng k\xEDp n\u1ED5 h\u1EAFc \xE1m: Ch\u1EBF \u0111\u1ED9 Sinh T\u1EED ph\u1EA1t tr\u1EEB ${pPenalty} \u0111i\u1EC3m g\u1ED1c c\xE2u h\u1ECFi!`,
      effectType: "LOSE_POINTS",
      deltaPoints: -pPenalty
    },
    // 7. Cặp Bom Tối #2 (🌑 -1x)
    {
      pairKey: "PAIR_BOMB_DARK_2",
      icon: "\u{1F311}",
      type: "BOMB_DARK",
      storyTitle: `\u{1F311} Bom T\u1ED1i -${pPenalty}\u0111`,
      storyDescription: `H\u1ED1 \u0111en n\u0103ng l\u01B0\u1EE3ng! Ch\u1EBF \u0111\u1ED9 Sinh T\u1EED ph\u1EA1t tr\u1EEB ${pPenalty} \u0111i\u1EC3m g\u1ED1c c\xE2u h\u1ECFi!`,
      effectType: "LOSE_POINTS",
      deltaPoints: -pPenalty
    },
    // 8. Cặp Bom Từ Thiện (🎁)
    {
      pairKey: "PAIR_BOMB_CHARITY",
      icon: "\u{1F381}",
      type: "BOMB_CHARITY",
      storyTitle: "\u{1F381} Bom T\u1EB7ng",
      storyDescription: "Gh\xE9p tr\xFAng bom t\u1EEB thi\u1EC7n: Ph\u1EA1t theo m\u1EE9c th\u1EA5p h\u01A1n gi\u1EEFa 50% \u0111i\u1EC3m \u0111\u1ED9i v\xE0 1.5x \u0111i\u1EC3m c\xE2u, chuy\u1EC3n t\u1EB7ng cho Top 1!",
      effectType: "LOSE_POINTS",
      deltaPoints: 0
    }
  ];
  const tileItems = [];
  pairs.forEach((p) => {
    for (let c = 0; c < 2; c++) {
      tileItems.push({
        icon: p.icon,
        isOpened: false,
        type: p.type,
        storyTitle: p.storyTitle,
        storyDescription: p.storyDescription,
        effectType: p.effectType,
        deltaPoints: p.deltaPoints,
        pairKey: p.pairKey,
        tarotCardKey: p.tarotCardKey,
        isPeeked: false
      });
    }
  });
  const shuffled = tileItems.sort(() => Math.random() - 0.5);
  return shuffled.map((item, idx) => ({
    ...item,
    id: idx + 1,
    label: `Th\u1EBB #${idx + 1}`,
    isOpened: false
  }));
}
function generateOneShotDoorsTiles(basePoints = 20, options) {
  const { allEightArchetypes } = generateTarotQuotaArchetypes(basePoints, options);
  const hasPeekPerk = options?.promoPerk && getPerkType(options.promoPerk) === "PEEK_PROMO";
  const shuffled = [...allEightArchetypes].sort(() => Math.random() - 0.5);
  return shuffled.map((arch, idx) => {
    const isPeekedDoor = Boolean(hasPeekPerk && arch.key === "THE_TOWER");
    return {
      id: idx + 1,
      label: `C\u1EEDa #${idx + 1}`,
      icon: arch.icon,
      isOpened: false,
      type: arch.type,
      storyTitle: arch.storyTitle,
      storyDescription: arch.storyDescription,
      effectType: arch.effectType,
      deltaPoints: arch.deltaPoints,
      tarotCardKey: arch.key,
      bombDoorType: arch.bombType,
      givesShield: arch.givesShield,
      givesHeart: arch.givesHeart,
      stealFraction: arch.stealFraction,
      isPeeked: isPeekedDoor,
      peekLabel: isPeekedDoor ? `\u26A1 Th\xE1p B\u1EABy -${Math.abs(arch.deltaPoints)}\u0111` : void 0,
      peekIcon: isPeekedDoor ? "\u26A1" : void 0
    };
  });
}
function generateSurvivalOneShotDoorsTiles(basePoints = 20, _options) {
  const pPenalty = basePoints;
  const pSmokePenalty = roundToMultipleOfFive(basePoints * 0.5);
  const doors = [
    // 1. Cửa Thoát Hiểm An Toàn (🕊️)
    {
      icon: "\u{1F54A}\uFE0F",
      type: "ESCAPE_SAFE",
      storyTitle: "\u{1F54A}\uFE0F Tho\xE1t Hi\u1EC3m",
      storyDescription: "May m\u1EAFn tuy\u1EC7t \u0111\u1EC9nh! B\u1EA1n \u0111\xE3 m\u1EDF \u0111\xFAng C\u1EEDa Tho\xE1t Hi\u1EC3m, b\u1EA3o to\xE0n nguy\xEAn v\u1EB9n \u0111i\u1EC3m s\u1ED1 v\xE0 tim!",
      effectType: "BONUS_POINTS",
      deltaPoints: 0
    },
    // 2. Cửa Chàng Khờ (🃏 The Fool - Safe 0đ)
    {
      icon: "\u{1F0CF}",
      type: "ESCAPE_SAFE",
      storyTitle: "0. Ch\xE0ng Kh\u1EDD (The Fool)",
      storyDescription: "V\xF4 \u01B0u v\xF4 lo! M\u1EDF \u0111\xFAng c\xE1nh c\u1EEDa K\u1EBB Kh\u1EDD, tho\xE1t n\u1EA1n an to\xE0n tuy\u1EC7t \u0111\u1ED1i m\xE0 kh\xF4ng m\u1EA5t \u0111i\u1EC3m hay tim (\xB10\u0111)!",
      effectType: "BONUS_POINTS",
      deltaPoints: 0,
      tarotCardKey: "THE_FOOL"
    },
    // 3. Cửa Tòa Tháp Sụp Đổ #1 (⚡ -1x)
    {
      icon: "\u26A1",
      type: "TRAP",
      storyTitle: `XVI. T\xF2a Th\xE1p (The Tower) -${pPenalty}\u0111`,
      storyDescription: `S\u1EA5m s\xE9t gi\xE1ng xu\u1ED1ng! D\xEDnh b\u1EABy T\xF2a Th\xE1p: B\u1ECB tr\u1EEB ${pPenalty} \u0111i\u1EC3m (100% \u0111i\u1EC3m g\u1ED1c c\xE2u h\u1ECFi)!`,
      effectType: "LOSE_POINTS",
      deltaPoints: -pPenalty,
      isBasePenalty: true,
      tarotCardKey: "THE_TOWER"
    },
    // 4. Cửa Tòa Tháp Sụp Đổ #2 (⚡ -1x)
    {
      icon: "\u26A1",
      type: "TRAP",
      storyTitle: `XVI. T\xF2a Th\xE1p (The Tower) -${pPenalty}\u0111`,
      storyDescription: `C\u1ED9t tr\u1EE5 \u0111\u1ED5 s\u1EADp! D\xEDnh b\u1EABy T\xF2a Th\xE1p: B\u1ECB tr\u1EEB ${pPenalty} \u0111i\u1EC3m (100% \u0111i\u1EC3m g\u1ED1c c\xE2u h\u1ECFi)!`,
      effectType: "LOSE_POINTS",
      deltaPoints: -pPenalty,
      isBasePenalty: true,
      tarotCardKey: "THE_TOWER"
    },
    // 5. Cửa Bom Khói (💨 -50%)
    {
      icon: "\u{1F4A8}",
      type: "BOMB_SMOKE",
      storyTitle: `\u{1F4A8} Bom Kh\xF3i -${pSmokePenalty}\u0111`,
      storyDescription: `Kh\xF3i m\xF9 bao ph\u1EE7: Ch\u1EBF \u0111\u1ED9 Sinh T\u1EED ph\u1EA1t tr\u1EEB 50% \u0111i\u1EC3m g\u1ED1c c\xE2u h\u1ECFi (-${pSmokePenalty}\u0111)!`,
      effectType: "LOSE_POINTS",
      deltaPoints: -pSmokePenalty,
      isBombDoor: true,
      bombDoorType: "BOMB_SMOKE"
    },
    // 6. Cửa Bom Hắc Ám #1 (🌑 -1x)
    {
      icon: "\u{1F311}",
      type: "BOMB_DARK",
      storyTitle: `\u{1F311} Bom T\u1ED1i -${pPenalty}\u0111`,
      storyDescription: `N\u0103ng l\u01B0\u1EE3ng b\xF3ng t\u1ED1i b\xF9ng ph\xE1t! Ch\u1EBF \u0111\u1ED9 Sinh T\u1EED ph\u1EA1t tr\u1EEB ${pPenalty} \u0111i\u1EC3m g\u1ED1c c\xE2u h\u1ECFi!`,
      effectType: "LOSE_POINTS",
      deltaPoints: -pPenalty,
      isBombDoor: true,
      bombDoorType: "BOMB_DARK"
    },
    // 7. Cửa Bom Hắc Ám #2 (🌑 -1x)
    {
      icon: "\u{1F311}",
      type: "BOMB_DARK",
      storyTitle: `\u{1F311} Bom T\u1ED1i -${pPenalty}\u0111`,
      storyDescription: `H\u1ED1 \u0111en n\u0103ng l\u01B0\u1EE3ng! Ch\u1EBF \u0111\u1ED9 Sinh T\u1EED ph\u1EA1t tr\u1EEB ${pPenalty} \u0111i\u1EC3m g\u1ED1c c\xE2u h\u1ECFi!`,
      effectType: "LOSE_POINTS",
      deltaPoints: -pPenalty,
      isBombDoor: true,
      bombDoorType: "BOMB_DARK"
    },
    // 8. Cửa Bom Từ Thiện (🎁)
    {
      icon: "\u{1F381}",
      type: "BOMB_CHARITY",
      storyTitle: "\u{1F381} Bom T\u1EB7ng",
      storyDescription: "L\xF2ng t\u1ED1t b\u1EA5t \u0111\u1EAFc d\u0129: Ph\u1EA1t theo m\u1EE9c th\u1EA5p h\u01A1n gi\u1EEFa 50% \u0111i\u1EC3m \u0111\u1ED9i v\xE0 1.5x \u0111i\u1EC3m c\xE2u, chuy\u1EC3n t\u1EB7ng cho Top 1!",
      effectType: "LOSE_POINTS",
      deltaPoints: 0,
      isBombDoor: true,
      bombDoorType: "BOMB_CHARITY"
    }
  ];
  const shuffled = [...doors].sort(() => Math.random() - 0.5);
  return shuffled.map((d, idx) => ({
    id: idx + 1,
    label: `C\u1EEDa #${idx + 1}`,
    icon: d.icon,
    isOpened: false,
    type: d.type,
    storyTitle: d.storyTitle,
    storyDescription: d.storyDescription,
    effectType: d.effectType,
    deltaPoints: d.deltaPoints,
    tarotCardKey: d.tarotCardKey,
    isBasePenalty: d.isBasePenalty,
    isBombDoor: d.isBombDoor,
    bombDoorType: d.bombDoorType
  }));
}
function generateTarotDestinyTiles(basePoints = 20, options) {
  const riskTier = options?.riskTier ?? "NEUTRAL";
  const pSun = basePoints * 2;
  const pEmperor = Math.round(basePoints * 1.5);
  const pFool = basePoints + 10;
  const pKnight = basePoints;
  const pDeath = riskTier === "UNDERDOG" ? 0 : basePoints;
  const currentRound = options?.currentRound ?? 1;
  const canSteal = currentRound >= 2 && Boolean(
    options?.teams && options?.teams.some((t) => t.id !== options?.currentTeamId && (t.score || 0) >= pKnight)
  );
  const fifthCard = canSteal ? {
    tarotName: "Hi\u1EC7p S\u0129 \u0110\u1EA1o T\u1EB7c (The Knight)",
    icon: "\u{1F5E1}\uFE0F",
    type: "REWARD",
    storyTitle: `\u{1F5E1}\uFE0F C\u01B0\u1EDBp +${pKnight}\u0111`,
    storyDescription: `Thanh g\u01B0\u01A1m c\xF4ng l\xFD: C\u01B0\u1EDBp +${pKnight}\u0111 t\u1EEB m\u1ED9t \u0111\u1ED1i th\u1EE7 \u0111\u1EE7 \u0111i\u1EC1u ki\u1EC7n!`,
    effectType: "STEAL_POINTS",
    deltaPoints: pKnight
  } : {
    tarotName: "Ng\xF4i Sao Hy V\u1ECDng (The Star)",
    icon: "\u2B50",
    type: "REWARD",
    storyTitle: `\u2B50 Ng\xF4i Sao +${pKnight}\u0111`,
    storyDescription: `\xC1nh sao may m\u1EAFn: Nh\u1EADn n\xF3ng +${pKnight} \u0111i\u1EC3m th\u01B0\u1EDFng!`,
    effectType: "BONUS_POINTS",
    deltaPoints: pKnight
  };
  const deathCard = riskTier === "UNDERDOG" ? {
    tarotName: "Th\u1EA7n Ch\u1EBFt (Death)",
    icon: "\u{1F480}",
    type: "BOMB_SMOKE",
    storyTitle: "\u{1F480} Th\u1EA7n Ch\u1EBFt Th\u1EED Th\xE1ch 0\u0111",
    storyDescription: "L\u01B0\u1EE1i h\xE1i \u0111\u1ECBnh m\u1EC7nh tha th\u1EE9 cho \u0111\u1ED9i y\u1EBFu th\u1EBF: Ch\u1EC9 m\u1EA5t \u0111i\u1EC3m t\xEDch l\u0169y c\xE2u hi\u1EC7n t\u1EA1i, t\u1ED5ng \u0111i\u1EC3m kh\xF4ng \u0111\u1ED5i!",
    effectType: "LOSE_POT_POINTS",
    deltaPoints: 0
  } : {
    tarotName: "Th\u1EA7n Ch\u1EBFt (Death)",
    icon: "\u{1F480}",
    type: "BOMB_MAJOR",
    storyTitle: `\u{1F480} Th\u1EA7n Ch\u1EBFt -${pDeath}\u0111`,
    storyDescription: `L\u01B0\u1EE1i h\xE1i \u0111\u1ECBnh m\u1EC7nh: B\u1ECB ph\u1EA1t tr\u1EEB ${pDeath} \u0111i\u1EC3m t\u1EEB t\u1ED5ng \u0111i\u1EC3m!`,
    effectType: "LOSE_POINTS",
    deltaPoints: -pDeath
  };
  const tarotCards = [
    {
      tarotName: "M\u1EB7t Tr\u1EDDi (The Sun)",
      icon: "\u2600\uFE0F",
      type: "REWARD",
      storyTitle: `\u2600\uFE0F M\u1EB7t Tr\u1EDDi +${pSun}\u0111`,
      storyDescription: `\xC1nh d\u01B0\u01A1ng soi r\u1ECDi: Ban t\u1EB7ng +${pSun} \u0111i\u1EC3m th\u01B0\u1EDFng!`,
      effectType: "BONUS_POINTS",
      deltaPoints: pSun
    },
    {
      tarotName: "Ho\xE0ng \u0110\u1EBF (The Emperor)",
      icon: "\u{1F451}",
      type: "REWARD",
      storyTitle: `\u{1F451} Ho\xE0ng \u0110\u1EBF +${pEmperor}\u0111`,
      storyDescription: `V\u01B0\u01A1ng mi\u1EC7n uy quy\u1EC1n: Th\u01B0\u1EDFng n\xF3ng +${pEmperor} \u0111i\u1EC3m danh d\u1EF1!`,
      effectType: "BONUS_POINTS",
      deltaPoints: pEmperor
    },
    {
      tarotName: "K\u1EBB Kh\u1EDD (The Fool)",
      icon: "\u{1F0CF}",
      type: "REWARD",
      storyTitle: `\u{1F0CF} K\u1EBB Kh\u1EDD +${pFool}\u0111`,
      storyDescription: `V\u1EADn may b\u1EA5t ng\u1EDD: \u0110\u1ED9t ph\xE1 n\u0103ng l\u01B0\u1EE3ng (+${pFool}\u0111)!`,
      effectType: "BONUS_POINTS",
      deltaPoints: pFool
    },
    deathCard,
    fifthCard
  ];
  const shuffled = [...tarotCards].sort(() => Math.random() - 0.5);
  return shuffled.map((card, idx) => ({
    id: idx + 1,
    label: `L\xE1 #${idx + 1}`,
    tarotName: card.tarotName,
    icon: card.icon,
    isOpened: false,
    type: card.type,
    storyTitle: card.storyTitle,
    storyDescription: card.storyDescription,
    effectType: card.effectType,
    deltaPoints: card.deltaPoints
  }));
}
function generateNextPushYourLuckCard({
  theme,
  drawIndex,
  basePoints = 10,
  teamScore = 0,
  isDoublePromo = false,
  options
}) {
  const riskTier = options?.riskTier ?? "NEUTRAL";
  const currentRound = options?.currentRound ?? 1;
  let bombChance;
  if (drawIndex <= 1) {
    bombChance = 0;
  } else if (drawIndex <= 5) {
    if (riskTier === "UNDERDOG") {
      bombChance = 0.05;
    } else if (riskTier === "DOMINANT") {
      bombChance = 0.15;
    } else {
      bombChance = 0.1;
    }
  } else {
    const extraDraws = drawIndex - 5;
    if (riskTier === "UNDERDOG") {
      bombChance = Math.min(0.3, 0.15 + extraDraws * 0.03);
    } else if (riskTier === "DOMINANT") {
      bombChance = Math.min(0.65, 0.35 + extraDraws * 0.06);
    } else if (basePoints <= 10) {
      bombChance = Math.min(0.55, 0.3 + extraDraws * 0.05);
    } else if (basePoints <= 20) {
      bombChance = Math.min(0.5, 0.25 + extraDraws * 0.05);
    } else {
      bombChance = Math.min(0.45, 0.2 + extraDraws * 0.04);
    }
  }
  const isBomb = Math.random() < bombChance;
  const id = drawIndex;
  const label = `L\xE1 #${drawIndex}`;
  if (isBomb) {
    if (drawIndex <= 5 || teamScore <= 0) {
      return {
        id,
        label,
        icon: "\u{1F4A8}",
        isOpened: false,
        type: "BOMB_SMOKE",
        storyTitle: "\u{1F4A8} Bom Kh\xF3i 0\u0111",
        storyDescription: "Kh\xF3i m\xF9 bao ph\u1EE7! M\u1EA5t to\xE0n b\u1ED9 \u0111i\u1EC3m t\xEDch l\u0169y c\u1EE7a c\xE2u n\xE0y. T\u1ED5ng \u0111i\u1EC3m t\xE0i kho\u1EA3n \u0111\u01B0\u1EE3c b\u1EA3o to\xE0n!",
        effectType: "LOSE_POINTS",
        deltaPoints: 0
      };
    }
    const bombType = rollBombTypeForMinigame("PUSH_YOUR_LUCK", teamScore, {
      currentRound,
      riskTier
    });
    if (bombType === "BOMB_SMOKE") {
      return {
        id,
        label,
        icon: "\u{1F4A8}",
        isOpened: false,
        type: "BOMB_SMOKE",
        storyTitle: "\u{1F4A8} Bom Kh\xF3i 0\u0111",
        storyDescription: "Kh\xF3i m\xF9 bao ph\u1EE7! M\u1EA5t to\xE0n b\u1ED9 \u0111i\u1EC3m t\xEDch l\u0169y \u1EDF c\xE2u hi\u1EC7n t\u1EA1i (0 \u0111i\u1EC3m nh\u1EADn \u0111\u01B0\u1EE3c). T\u1ED5ng \u0111i\u1EC3m gi\u1EEF nguy\xEAn!",
        effectType: "LOSE_POINTS",
        deltaPoints: 0
      };
    } else if (bombType === "BOMB_DARK") {
      return {
        id,
        label,
        icon: "\u{1F311}",
        isOpened: false,
        type: "BOMB_DARK",
        storyTitle: "\u{1F311} Bom T\u1ED1i",
        storyDescription: "N\u0103ng l\u01B0\u1EE3ng b\xF3ng t\u1ED1i b\xF9ng ph\xE1t! \u0110i\u1EC3m s\u1ED1 c\u1EE7a b\u1EA1n b\u1ECB r\xFAt c\u1EA1n v\xE0 ph\xE2n chia \u0111\u1EC1u cho c\xE1c \u0111\u1ED9i \u0111\u1ED1i th\u1EE7!",
        effectType: "LOSE_POINTS",
        deltaPoints: 0
      };
    } else {
      return {
        id,
        label,
        icon: "\u{1F381}",
        isOpened: false,
        type: "BOMB_CHARITY",
        storyTitle: "\u{1F381} Bom T\u1EB7ng",
        storyDescription: "L\xF2ng t\u1ED1t b\u1EA5t \u0111\u1EAFc d\u0129! B\u1ECB tr\u1EEB theo m\u1EE9c th\u1EA5p h\u01A1n gi\u1EEFa 50% \u0111i\u1EC3m \u0111\u1ED9i v\xE0 1.5x \u0111i\u1EC3m c\xE2u, chuy\u1EC3n t\u1EB7ng to\xE0n b\u1ED9 cho \u0111\u1ED9i \u0111ang d\u1EABn \u0111\u1EA7u!",
        effectType: "GIFT_POINTS",
        deltaPoints: 0
      };
    }
  }
  const themeRewards = REWARD_TEMPLATES[theme] || REWARD_TEMPLATES.CASTLE;
  let template = themeRewards[Math.floor(Math.random() * themeRewards.length)];
  let delta = template.deltaPoints;
  if (template.effectType === "STEAL_POINTS") {
    if (basePoints <= 10) {
      delta = 10;
    } else if (basePoints <= 20) {
      delta = [10, 15, 20][Math.floor(Math.random() * 3)];
    } else if (basePoints <= 30) {
      delta = [15, 20, 25, 30][Math.floor(Math.random() * 4)];
    } else {
      delta = [20, 25, 30, 40][Math.floor(Math.random() * 4)];
    }
    delta = Math.min(delta, basePoints);
  } else if (template.effectType === "BONUS_POINTS") {
    if (basePoints <= 10) {
      delta = [10, 15, 20, 25][Math.floor(Math.random() * 4)];
    } else if (basePoints <= 20) {
      delta = [20, 25, 30, 40][Math.floor(Math.random() * 4)];
    } else if (basePoints <= 30) {
      delta = [30, 35, 45, 60][Math.floor(Math.random() * 4)];
    } else {
      delta = [40, 50, 60, 80][Math.floor(Math.random() * 4)];
    }
  }
  let storyTitle = template.storyTitle;
  if (template.effectType === "BONUS_POINTS" || template.effectType === "STEAL_POINTS") {
    storyTitle = storyTitle.replace(/\+\d+đ/g, `+${delta}\u0111`);
  }
  let storyDescription = template.storyDescription;
  if (template.effectType === "BONUS_POINTS") {
    storyDescription = storyDescription.replace(/\+\d+\s*(điểm|đ)/g, `+${delta} $1`);
  } else if (template.effectType === "STEAL_POINTS") {
    storyDescription = storyDescription.replace(/\b\d+\s*(điểm|đ)/g, `${delta} $1`);
  }
  let effectType = template.effectType;
  if (effectType === "STEAL_POINTS") {
    const currentRound2 = options?.currentRound ?? 1;
    const canSteal = currentRound2 >= 2 && Boolean(
      options?.teams && options?.teams.some((t) => t.id !== options?.currentTeamId && (t.score || 0) >= delta)
    );
    if (!canSteal) {
      effectType = "BONUS_POINTS";
      template = {
        storyTitle: `\u{1F48E} Kho B\xE1u +${delta}\u0111`,
        storyDescription: `M\u1EDF kh\xF3a kho b\xE1u ho\xE0ng kim: Nh\u1EADn an to\xE0n +${delta} \u0111i\u1EC3m v\xE0o qu\u1EF9!`,
        deltaPoints: delta,
        effectType: "BONUS_POINTS"
      };
      storyTitle = template.storyTitle;
      storyDescription = template.storyDescription;
    }
  }
  if (isDoublePromo && Math.random() < 0.35) {
    effectType = "MULTIPLY_X2";
    delta = 0;
    storyTitle = "\u{1F680} Nh\xE2n \u0110\xF4i x2";
  }
  return {
    id,
    label,
    icon: effectType === "MULTIPLY_X2" ? "\u{1F680}" : effectType === "STEAL_POINTS" ? "\u{1F3AD}" : "\u{1F48E}",
    isOpened: false,
    type: "REWARD",
    storyTitle,
    storyDescription,
    effectType,
    deltaPoints: delta
  };
}
function generateSurvivalPushYourLuckCard({
  drawIndex = 1,
  basePoints = 10,
  teamScore: _teamScore = 0,
  options: _options
}) {
  const id = drawIndex;
  const label = `L\xE1 Sinh T\u1EED #${drawIndex}`;
  const pPenalty = basePoints;
  const pSmokePenalty = roundToMultipleOfFive(basePoints * 0.5);
  const rand = Math.random();
  if (rand < 0.125) {
    return {
      id,
      label,
      icon: "\u{1F54A}\uFE0F",
      isOpened: false,
      type: "ESCAPE_SAFE",
      storyTitle: "\u{1F54A}\uFE0F Tho\xE1t Hi\u1EC3m",
      storyDescription: "Th\u1EA7n may m\u1EAFn m\u1EC9m c\u01B0\u1EDDi! R\xFAt tr\xFAng l\xE1 Tho\xE1t Hi\u1EC3m ngo\u1EA1n m\u1EE5c, b\u1EA3o to\xE0n nguy\xEAn v\u1EB9n \u0111i\u1EC3m s\u1ED1 v\xE0 tim!",
      effectType: "BONUS_POINTS",
      deltaPoints: 0
    };
  }
  if (rand < 0.25) {
    return {
      id,
      label,
      icon: "\u{1F0CF}",
      isOpened: false,
      type: "ESCAPE_SAFE",
      storyTitle: "0. Ch\xE0ng Kh\u1EDD (The Fool)",
      storyDescription: "V\xF4 \u01B0u v\xF4 lo! R\xFAt tr\xFAng l\xE1 Ch\xE0ng Kh\u1EDD, tho\xE1t n\u1EA1n an to\xE0n tuy\u1EC7t \u0111\u1ED1i m\xE0 kh\xF4ng m\u1EA5t \u0111i\u1EC3m hay tim (\xB10\u0111)!",
      effectType: "BONUS_POINTS",
      deltaPoints: 0,
      tarotCardKey: "THE_FOOL"
    };
  }
  if (rand < 0.5) {
    return {
      id,
      label,
      icon: "\u26A1",
      isOpened: false,
      type: "TRAP",
      storyTitle: `XVI. T\xF2a Th\xE1p (The Tower) -${pPenalty}\u0111`,
      storyDescription: `S\u1EA5m s\xE9t gi\xE1ng xu\u1ED1ng! R\xFAt ph\u1EA3i T\xF2a Th\xE1p s\u1EE5p \u0111\u1ED5: B\u1ECB tr\u1EEB ${pPenalty} \u0111i\u1EC3m (100% \u0111i\u1EC3m g\u1ED1c c\xE2u h\u1ECFi)!`,
      effectType: "LOSE_POINTS",
      deltaPoints: -pPenalty,
      tarotCardKey: "THE_TOWER"
    };
  }
  if (rand < 0.625) {
    return {
      id,
      label,
      icon: "\u{1F4A8}",
      isOpened: false,
      type: "BOMB_SMOKE",
      storyTitle: `\u{1F4A8} Bom Kh\xF3i -${pSmokePenalty}\u0111`,
      storyDescription: `Kh\xF3i m\xF9 bao ph\u1EE7: Ch\u1EBF \u0111\u1ED9 Sinh T\u1EED ph\u1EA1t tr\u1EEB 50% \u0111i\u1EC3m g\u1ED1c c\xE2u h\u1ECFi (-${pSmokePenalty}\u0111)!`,
      effectType: "LOSE_POINTS",
      deltaPoints: -pSmokePenalty
    };
  }
  if (rand < 0.875) {
    return {
      id,
      label,
      icon: "\u{1F311}",
      isOpened: false,
      type: "BOMB_DARK",
      storyTitle: `\u{1F311} Bom T\u1ED1i -${pPenalty}\u0111`,
      storyDescription: `N\u0103ng l\u01B0\u1EE3ng b\xF3ng t\u1ED1i nu\u1ED1t ch\u1EEDng! Ch\u1EBF \u0111\u1ED9 Sinh T\u1EED ph\u1EA1t tr\u1EEB ${pPenalty} \u0111i\u1EC3m g\u1ED1c c\xE2u h\u1ECFi!`,
      effectType: "LOSE_POINTS",
      deltaPoints: -pPenalty
    };
  }
  return {
    id,
    label,
    icon: "\u{1F381}",
    isOpened: false,
    type: "BOMB_CHARITY",
    storyTitle: "\u{1F381} Bom T\u1EB7ng",
    storyDescription: "L\xF2ng t\u1ED1t b\u1EA5t \u0111\u1EAFc d\u0129: Ph\u1EA1t theo m\u1EE9c th\u1EA5p h\u01A1n gi\u1EEFa 50% \u0111i\u1EC3m \u0111\u1ED9i v\xE0 1.5x \u0111i\u1EC3m c\xE2u, chuy\u1EC3n t\u1EB7ng cho Top 1!",
    effectType: "LOSE_POINTS",
    deltaPoints: 0
  };
}
function generatePushYourLuckTiles(theme, basePoints = 10, teamScore = 0, isDoublePromo = false, options) {
  const firstCard = generateNextPushYourLuckCard({
    theme,
    drawIndex: 1,
    basePoints,
    teamScore,
    isDoublePromo,
    options
  });
  return [firstCard];
}
function generateMysteryStageForTurn({
  turnIndex,
  currentTeam,
  teams,
  turnsPerTeam = 2,
  prevTheme,
  prevMiniGameType,
  forcedMiniGameType,
  baseQuestionPoints,
  initialHeartsPerTeam,
  teamHearts,
  timesStolenInCycle,
  consecutiveBombsByTeam,
  teamShields
}) {
  const computedInitialHearts = initialHeartsPerTeam !== void 0 ? initialHeartsPerTeam : Math.round(turnsPerTeam / 3);
  let resolvedTeamHearts = {};
  if (teamHearts) {
    resolvedTeamHearts = { ...teamHearts };
  } else {
    for (const t of teams) {
      resolvedTeamHearts[t.id] = computedInitialHearts;
    }
  }
  const updatedTeamShields = {};
  let hasActiveShield = false;
  if (teamShields) {
    for (const [tid, s] of Object.entries(teamShields)) {
      const shield = s;
      if (turnIndex <= shield.expiresAfterTurnIndex) {
        updatedTeamShields[tid] = shield;
        if (tid === currentTeam.id && turnIndex >= shield.activeFromTurnIndex) {
          hasActiveShield = true;
        }
      }
    }
  }
  const updatedTimesStolen = { ...timesStolenInCycle || {} };
  updatedTimesStolen[currentTeam.id] = 0;
  const consecutiveBombs = consecutiveBombsByTeam?.[currentTeam.id] ?? 0;
  const currentTeamRiskTier = evaluateTeamRiskTier({
    team: currentTeam,
    allTeams: teams,
    consecutiveBombs
  });
  const availableThemes = prevTheme ? THEME_KEYS.filter((t) => t !== prevTheme) : THEME_KEYS;
  const theme = availableThemes[Math.floor(Math.random() * availableThemes.length)];
  const themeMeta = MYSTERY_THEMES[theme];
  const currentRound = Math.floor(turnIndex / Math.max(1, teams.length)) + 1;
  const roundDefaultPoints = currentRound === 1 ? 10 : currentRound === 2 ? 20 : currentRound === 3 ? 30 : 40;
  const effectiveBasePoints = normalizeToThreeLevels(baseQuestionPoints ?? roundDefaultPoints);
  const miniGameType = forcedMiniGameType ? normalizeMiniGameType(forcedMiniGameType) : getRandomMiniGame(prevMiniGameType);
  const promoPerk = generateMysteryPromoPerk(effectiveBasePoints, miniGameType, {
    teams,
    currentTeamId: currentTeam.id
  });
  const totalTurns = teams.length * turnsPerTeam;
  let tiles = [];
  let memoryPairsState = void 0;
  let oneShotState = void 0;
  let tarotState = void 0;
  const roundOptions = {
    currentRound,
    teams,
    currentTeamId: currentTeam.id,
    riskTier: currentTeamRiskTier
  };
  switch (miniGameType) {
    case "MEMORY_PAIRS":
      tiles = generateMemoryPairsTiles(effectiveBasePoints, roundOptions);
      if (getPerkType(promoPerk) === "PEEK_PROMO") {
        const safeTiles = tiles.filter((t) => t.type === "REWARD" && t.pairKey !== "PAIR_BOMB" && t.pairKey !== "PAIR_TRAP");
        const shuffledSafe = [...safeTiles].sort(() => Math.random() - 0.5);
        if (shuffledSafe.length >= 2) {
          const first = shuffledSafe[0];
          const second = shuffledSafe.find((t) => t.pairKey !== first.pairKey) || shuffledSafe[1];
          first.isPeeked = true;
          first.peekLabel = "AN TO\xC0N";
          first.peekIcon = "\u2728";
          second.isPeeked = true;
          second.peekLabel = "AN TO\xC0N";
          second.peekIcon = "\u2728";
        }
      }
      memoryPairsState = {
        firstFlippedTileId: null,
        secondFlippedTileId: null,
        thirdFlippedTileId: null,
        keptBombTileIds: [],
        faceUpPenaltyTileIds: [],
        isBombRescueActive: false,
        activePenaltyPairKey: null,
        attemptsUsed: 0,
        maxAttempts: getPerkType(promoPerk) === "EXTRA_ATTEMPT_PROMO" ? 6 : 5,
        matchedPairKey: null,
        isMismatchResolving: false,
        round: 1,
        promptSecondChance: false
      };
      break;
    case "ONE_SHOT_DOORS":
      tiles = generateOneShotDoorsTiles(effectiveBasePoints, { ...roundOptions, promoPerk });
      oneShotState = {
        chosenTileId: void 0,
        selectedDoorIds: [],
        discardedDoorIds: [],
        penaltyDoorsCount: void 0,
        hasBombDetected: false,
        phase: "SELECT_4",
        radarLight: void 0,
        radarLightStep1: void 0,
        revealedSafeDoorIds: [],
        chosenFinalDoorId: void 0,
        allRevealed: false,
        peekAvailable: getPerkType(promoPerk) === "PEEK_PROMO",
        peekActivated: getPerkType(promoPerk) === "PEEK_PROMO",
        hasSwapped: false
      };
      break;
    case "TAROT_DESTINY":
      tiles = generateTarotDestinyTiles(effectiveBasePoints, roundOptions);
      tarotState = {
        isWheelSpinning: false,
        isDrawn: false,
        targetAngle: 0
      };
      break;
    case "PUSH_YOUR_LUCK":
    default:
      tiles = generatePushYourLuckTiles(
        theme,
        effectiveBasePoints,
        currentTeam.score || 0,
        false,
        roundOptions
      );
      break;
  }
  const peekUsesRemaining = promoPerk === "PEEK_PROMO" && miniGameType === "PUSH_YOUR_LUCK" ? 1 : 0;
  return {
    currentTurnTeamId: currentTeam.id,
    currentTurnTeamName: currentTeam.name,
    currentTurnTeamColor: currentTeam.color || "#ef4444",
    currentTurnIndex: turnIndex,
    totalTurns,
    turnsPerTeam,
    currentRound,
    theme,
    miniGameType,
    themeNameVi: themeMeta.nameVi,
    themeBgGradient: themeMeta.bgGradient,
    tiles,
    phase: "QUESTION_ACTIVE",
    baseQuestionPoints: effectiveBasePoints,
    promoPerk,
    hasShield: hasActiveShield || getPerkType(promoPerk) === "SHIELD_PROMO",
    teamShields: updatedTeamShields,
    currentTeamRiskTier,
    timesStolenInCycle: updatedTimesStolen,
    consecutiveBombsByTeam: consecutiveBombsByTeam ? { ...consecutiveBombsByTeam } : {},
    potPoints: 0,
    potMultiplier: 1,
    cardsFlippedCount: 0,
    memoryPairsState,
    oneShotState,
    tarotState,
    peekUsesRemaining,
    nextCardPeek: void 0,
    initialHeartsPerTeam: computedInitialHearts,
    teamHearts: resolvedTeamHearts
  };
}
function startSurvivalPenaltyMinigame({
  state,
  team,
  allTeams = []
}) {
  const normType = normalizeMiniGameType(state.miniGameType);
  const basePoints = state.baseQuestionPoints || 10;
  const currentScore = team.score || 0;
  state.isPenaltySurvivalMode = true;
  state.survivalDilemmaPending = false;
  state.phase = "PUSH_YOUR_LUCK";
  state.potPoints = 0;
  state.potMultiplier = 1;
  state.promoPerk = void 0;
  state.hasShield = false;
  state.cardsFlippedCount = 0;
  state.lastFlippedTile = void 0;
  state.bombExploded = void 0;
  state.turnFinishedReason = void 0;
  state.storyResult = void 0;
  switch (normType) {
    case "ONE_SHOT_DOORS": {
      state.tiles = generateSurvivalOneShotDoorsTiles(basePoints, {
        teams: allTeams,
        currentTeamId: team.id
      });
      state.oneShotState = {
        chosenTileId: void 0,
        selectedDoorIds: [],
        discardedDoorIds: [],
        penaltyDoorsCount: void 0,
        hasBombDetected: false,
        radarLight: void 0,
        radarLightStep1: void 0,
        phase: "SELECT_4",
        revealedSafeDoorIds: [],
        chosenFinalDoorId: void 0,
        allRevealed: false,
        peekAvailable: false,
        peekActivated: false,
        hasSwapped: false
      };
      break;
    }
    case "PUSH_YOUR_LUCK": {
      state.tiles = [
        generateSurvivalPushYourLuckCard({
          drawIndex: 1,
          basePoints,
          teamScore: currentScore,
          options: { teams: allTeams, currentTeamId: team.id }
        })
      ];
      break;
    }
    case "MEMORY_PAIRS": {
      state.tiles = generateSurvivalMemoryPairsTiles(basePoints, {
        teams: allTeams,
        currentTeamId: team.id
      });
      state.memoryPairsState = {
        firstFlippedTileId: null,
        secondFlippedTileId: null,
        thirdFlippedTileId: null,
        keptBombTileIds: [],
        faceUpPenaltyTileIds: [],
        isBombRescueActive: false,
        activePenaltyPairKey: null,
        attemptsUsed: 0,
        maxAttempts: 999,
        // Sudden Death: không giới hạn lượt cho tới khi ghép trúng cặp đầu tiên!
        attemptedPairs: [],
        matchedPairKey: null,
        isMismatchResolving: false,
        round: 1,
        promptSecondChance: false
      };
      break;
    }
    case "TAROT_DESTINY": {
      state.tiles = [];
      state.tarotState = {
        isWheelSpinning: false,
        isDrawn: false
      };
      break;
    }
  }
}
function handleFlipCard({
  state,
  tileId,
  team,
  allTeams
}) {
  const normType = normalizeMiniGameType(state.miniGameType);
  const currentRound = state.currentRound || 1;
  const consecutiveBombs = state.consecutiveBombsByTeam?.[team.id] ?? 0;
  const riskTier = evaluateTeamRiskTier({
    team,
    allTeams,
    consecutiveBombs,
    currentRound
  });
  if (normType === "MEMORY_PAIRS") {
    const memState = state.memoryPairsState || {
      firstFlippedTileId: null,
      secondFlippedTileId: null,
      thirdFlippedTileId: null,
      keptBombTileIds: [],
      isBombRescueActive: false,
      activePenaltyPairKey: null,
      attemptsUsed: 0,
      maxAttempts: getPerkType(state.promoPerk) === "EXTRA_ATTEMPT_PROMO" ? 5 : 4,
      matchedPairKey: null,
      isMismatchResolving: false,
      round: 1,
      promptSecondChance: false
    };
    if (memState.isMismatchResolving || memState.promptSecondChance || memState.matchedPairKey || state.phase === "TURN_SUMMARY" || memState.attemptsUsed >= memState.maxAttempts && !memState.isBombRescueActive) {
      return { updatedState: state, isBomb: false, scorePenalty: 0 };
    }
    const numTileId = Number(tileId);
    const tile2 = state.tiles.find((t) => Number(t.id) === numTileId);
    if (!tile2 || tile2.isOpened) {
      return { updatedState: state, isBomb: false, scorePenalty: 0 };
    }
    state.cardsFlippedCount = (state.cardsFlippedCount || 0) + 1;
    if (state.isPenaltySurvivalMode) {
      const isEscapeTile = (t) => Boolean(
        t && (t.pairKey === "PAIR_ESCAPE" || t.pairKey === "PAIR_THE_FOOL" || t.tarotCardKey === "THE_FOOL" || t.type === "ESCAPE_SAFE")
      );
      const executeSurvivalEscape = () => {
        state.tiles.forEach((t) => {
          t.isOpened = true;
        });
        state.potPoints = 0;
        state.phase = "TURN_SUMMARY";
        state.turnFinishedReason = "SURVIVAL_ESCAPE";
        const oldScore = team.score || 0;
        state.storyResult = {
          teamId: team.id,
          teamName: team.name,
          teamColor: team.color || "#10b981",
          rewardText: "\u{1F54A}\uFE0F K\u1EF3 T\xEDch Sinh T\u1EED! B\u1EA1n \u0111\xE3 gh\xE9p th\xE0nh c\xF4ng c\u1EB7p Tho\xE1t Hi\u1EC3m, b\u1EA3o to\xE0n nguy\xEAn v\u1EB9n \u0111i\u1EC3m s\u1ED1 v\xE0 tim!",
          scoreDelta: 0,
          oldScore,
          newScore: oldScore
        };
        return {
          updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
          isBomb: false,
          scorePenalty: 0,
          finalScoreDelta: 0
        };
      };
      const executeSurvivalPenalty = (penaltyKey) => {
        state.tiles.forEach((t) => {
          t.isOpened = true;
        });
        const isTower = penaltyKey?.includes("THE_TOWER") || penaltyKey === "PAIR_TRAP_BASE";
        if (isTower) {
          const basePts = state.baseQuestionPoints || 10;
          const penalty = Math.min(team.score || 0, basePts);
          state.potPoints = 0;
          state.phase = "TURN_SUMMARY";
          state.turnFinishedReason = "SURVIVAL_FAILED";
          const oldScore2 = team.score || 0;
          const newScore2 = Math.max(0, oldScore2 - penalty);
          state.storyResult = {
            teamId: team.id,
            teamName: team.name,
            teamColor: team.color || "#ef4444",
            rewardText: `\u26A1 Gh\xE9p tr\xFAng C\u1EB7p T\xF2a Th\xE1p S\u1EE5p \u0110\u1ED5! Ch\u1EBF \u0111\u1ED9 Sinh T\u1EED ph\u1EA1t tr\u1EEB ${penalty} \u0111i\u1EC3m (100% \u0111i\u1EC3m g\u1ED1c c\xE2u h\u1ECFi)!`,
            scoreDelta: -penalty,
            oldScore: oldScore2,
            newScore: newScore2
          };
          return {
            updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
            isBomb: true,
            scorePenalty: penalty,
            finalScoreDelta: -penalty
          };
        }
        let bombType = "BOMB_DARK";
        if (penaltyKey === "PAIR_BOMB_SMOKE") bombType = "BOMB_SMOKE";
        else if (penaltyKey === "PAIR_BOMB_CHARITY") bombType = "BOMB_CHARITY";
        else if (penaltyKey === "PAIR_BOMB_DARK" || penaltyKey?.startsWith("PAIR_BOMB_DARK")) bombType = "BOMB_DARK";
        const outcome = resolveBombOutcome({
          bombType,
          team,
          allTeams,
          storyDescription: `Gh\xE9p tr\xFAng ${bombType === "BOMB_SMOKE" ? "Bom Kh\xF3i" : bombType === "BOMB_CHARITY" ? "Bom T\u1EB7ng" : "Bom T\u1ED1i"}!`,
          baseQuestionPoints: state.baseQuestionPoints,
          isSurvivalPenalty: true
        });
        state.bombExploded = outcome.bombExploded;
        state.phase = "TURN_SUMMARY";
        state.turnFinishedReason = "SURVIVAL_FAILED";
        state.potPoints = 0;
        const oldScore = team.score || 0;
        const newScore = Math.max(0, oldScore - outcome.penalty);
        state.storyResult = {
          teamId: team.id,
          teamName: team.name,
          teamColor: team.color || "#ef4444",
          rewardText: `\u{1F4A5} ${outcome.bombExploded.title}: ${outcome.penaltyText}`,
          scoreDelta: -outcome.penalty,
          oldScore,
          newScore
        };
        return {
          updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
          isBomb: true,
          scorePenalty: outcome.penalty,
          finalScoreDelta: -outcome.penalty,
          giftedPoints: outcome.giftedPoints,
          recipientTeamId: outcome.recipientTeamId,
          recipientTeamName: outcome.recipientTeamName,
          darkBombRecipients: outcome.darkBombRecipients
        };
      };
      state.tiles = state.tiles.map(
        (t) => Number(t.id) === numTileId ? { ...t, isOpened: true } : t
      );
      state.lastFlippedTile = tile2;
      if (!memState.firstFlippedTileId) {
        memState.firstFlippedTileId = tile2.id;
        state.memoryPairsState = { ...memState };
        return {
          updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
          isBomb: false,
          scorePenalty: 0
        };
      }
      if (Number(memState.firstFlippedTileId) === numTileId) {
        return { updatedState: state, isBomb: false, scorePenalty: 0 };
      }
      memState.secondFlippedTileId = tile2.id;
      const firstTile2 = state.tiles.find((t) => Number(t.id) === Number(memState.firstFlippedTileId));
      const secondTile = tile2;
      memState.attemptsUsed += 1;
      const isMatch2 = Boolean(firstTile2 && secondTile && firstTile2.pairKey === secondTile.pairKey);
      if (isMatch2 && firstTile2) {
        memState.matchedPairKey = firstTile2.pairKey;
        if (isEscapeTile(firstTile2)) {
          return executeSurvivalEscape();
        } else {
          return executeSurvivalPenalty(firstTile2.pairKey || "PAIR_BOMB_DARK");
        }
      }
      memState.isMismatchResolving = true;
      state.memoryPairsState = { ...memState };
      return {
        updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
        isBomb: false,
        scorePenalty: 0,
        shouldResetMismatchedCards: true
      };
    }
    const isPenaltyTile = (t) => {
      if (!t) return false;
      if (t.tarotCardKey === "THE_FOOL" || t.pairKey === "PAIR_THE_FOOL") return false;
      if (t.tarotCardKey === "THE_TOWER" || t.tarotCardKey === "THE_KNIGHT" || t.tarotCardKey === "THE_DEVIL" || t.tarotCardKey === "THE_HANGED_MAN") return true;
      if (t.pairKey?.startsWith("PAIR_BOMB") || t.pairKey?.startsWith("PAIR_TRAP")) return true;
      if (t.pairKey === "PAIR_THE_TOWER" || t.pairKey === "PAIR_THE_KNIGHT" || t.pairKey === "PAIR_THE_DEVIL" || t.pairKey === "PAIR_THE_HANGED_MAN") return true;
      if (t.type !== "REWARD" && t.type !== "ESCAPE_SAFE") return true;
      if (t.deltaPoints && t.deltaPoints < 0) return true;
      return false;
    };
    const isNeutralTile = (t) => {
      if (!t) return false;
      return t.tarotCardKey === "THE_FOOL" || t.pairKey === "PAIR_THE_FOOL" || t.deltaPoints === 0 && t.type === "REWARD";
    };
    const getPenaltyKey = (t) => {
      if (!t) return null;
      if (isPenaltyTile(t)) return t.pairKey || "PAIR_BOMB";
      return null;
    };
    const hasExtraPot2 = getPerkType(state.promoPerk) === "EXTRA_POT_PROMO";
    const extraPotBonus2 = hasExtraPot2 ? 5 : 0;
    const previouslyKeptBombs = memState.keptBombTileIds || [];
    const executePenalty = ({
      penaltyKey,
      cancelOldKey
    }) => {
      memState.isBombRescueActive = false;
      state.memoryPairsState = { ...memState };
      const getPenaltyName = (k) => {
        if (k === "PAIR_THE_KNIGHT" || k === "PAIR_BOMB_SMOKE" || k === "PAIR_TRAP") return "BOM KH\xD3I";
        if (k === "PAIR_THE_TOWER" || k === "PAIR_TRAP_BASE") return "TH\xC1P B\u1EAAY S\u1EE4P \u0110\u1ED4";
        if (k === "PAIR_THE_DEVIL" || k === "PAIR_BOMB_DARK") return "BOM H\u1EAEC \xC1M";
        if (k === "PAIR_THE_HANGED_MAN" || k === "PAIR_BOMB_CHARITY") return "BOM T\u1EEA THI\u1EC6N";
        return "B\u1EAAY PH\u1EA0T";
      };
      const cancelPrefix = cancelOldKey ? `\u26A0\uFE0F \u0110\xC3 H\u1EE6Y B\u1ECE ${getPenaltyName(cancelOldKey)} C\u0168! Th\u1EF1c hi\u1EC7n ph\u1EA1t theo c\u1EB7p m\u1EDBi: ` : "";
      if (state.hasShield) {
        state.hasShield = false;
        memState.activePenaltyPairKey = null;
        memState.keptBombTileIds = [];
        memState.faceUpPenaltyTileIds = [];
        memState.isBombRescueActive = false;
        state.potPoints = 0;
        state.storyResult = {
          teamId: team.id,
          teamName: team.name,
          teamColor: team.color || "#ef4444",
          rewardText: `${cancelPrefix}\u{1F6E1}\uFE0F KHI\xCAN TH\u1EA6N \u0110\xC3 H\u1EA4P TH\u1EE4 B\u1EAAY PH\u1EA0T! C\u1EB7p th\u1EBB b\u1EABy b\u1ECB v\xF4 hi\u1EC7u h\xF3a an to\xE0n (0\u0111 ph\u1EA1t). \u0110\u1ED9i b\u1EA1n \u0111\u01B0\u1EE3c b\u1EA3o to\xE0n \u0111i\u1EC3m s\u1ED1 v\xE0 ti\u1EBFp t\u1EE5c l\u1EADt c\xE1c c\u1EB7p th\u1EBB c\xF2n l\u1EA1i!`,
          scoreDelta: 0,
          oldScore: team.score || 0,
          newScore: team.score || 0
        };
        return {
          updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
          isBomb: false,
          scorePenalty: 0,
          finalScoreDelta: 0
        };
      }
      if (penaltyKey === "PAIR_THE_KNIGHT" || penaltyKey === "PAIR_BOMB_SMOKE" || penaltyKey === "PAIR_TRAP") {
        state.bombExploded = {
          type: "SMOKE",
          title: "\u{1F4A8} BOM KH\xD3I PH\xC1T N\u1ED4!",
          description: "K\xEDch ho\u1EA1t Bom Kh\xF3i: M\u1EA5t to\xE0n b\u1ED9 \u0111i\u1EC3m t\xEDch l\u0169y c\u1EE7a c\xE2u h\u1ECFi n\xE0y (0\u0111), b\u1EA3o to\xE0n t\u1ED5ng \u0111i\u1EC3m!",
          penaltyText: "M\u1EA5t \u0111i\u1EC3m c\xE2u hi\u1EC7n t\u1EA1i, t\u1ED5ng \u0111i\u1EC3m \u0111\u01B0\u1EE3c b\u1EA3o to\xE0n."
        };
        state.phase = "TURN_SUMMARY";
        state.turnFinishedReason = "BOMB_HIT";
        state.potPoints = 0;
        const oldScore = team.score || 0;
        const newScore = oldScore;
        state.storyResult = {
          teamId: team.id,
          teamName: team.name,
          teamColor: team.color || "#ef4444",
          rewardText: `${cancelPrefix}\u{1F4A8} Bom Kh\xF3i k\xEDch ho\u1EA1t! M\u1EA5t to\xE0n b\u1ED9 \u0111i\u1EC3m c\xE2u h\u1ECFi n\xE0y (0\u0111), b\u1EA3o to\xE0n t\u1ED5ng \u0111i\u1EC3m!`,
          scoreDelta: 0,
          oldScore,
          newScore
        };
        return {
          updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
          isBomb: true,
          scorePenalty: 0,
          finalScoreDelta: 0
        };
      } else if (penaltyKey === "PAIR_THE_TOWER" || penaltyKey === "PAIR_TRAP_BASE") {
        const penalty = riskTier === "UNDERDOG" ? 0 : state.baseQuestionPoints || 10;
        state.potPoints = 0;
        state.phase = "TURN_SUMMARY";
        state.turnFinishedReason = "BOMB_HIT";
        const oldScore = team.score || 0;
        const newScore = Math.max(0, oldScore - penalty);
        state.storyResult = {
          teamId: team.id,
          teamName: team.name,
          teamColor: team.color || "#ef4444",
          rewardText: penalty === 0 ? `${cancelPrefix}\u26A1 Gh\xE9p tr\xFAng Th\xE1p B\u1EABy S\u1EE5p \u0110\u1ED5! Nh\u1EDD th\u1EBF tr\u1EADn y\u1EBFu th\u1EBF, th\u1EA7n h\u1ED9 m\u1EC7nh b\u1EA3o h\u1ED9 n\xE9 ph\u1EA1t an to\xE0n (0\u0111)!` : `${cancelPrefix}\u26A1 Gh\xE9p tr\xFAng Th\xE1p B\u1EABy S\u1EE5p \u0110\u1ED5! B\u1ECB ph\u1EA1t tr\u1EEB -${penalty} \u0111i\u1EC3m g\u1ED1c c\xE2u h\u1ECFi!`,
          scoreDelta: -penalty,
          oldScore,
          newScore
        };
        return {
          updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
          isBomb: true,
          scorePenalty: penalty,
          finalScoreDelta: -penalty
        };
      } else {
        let bombType = "BOMB_DARK";
        if (penaltyKey === "PAIR_THE_DEVIL" || penaltyKey === "PAIR_BOMB_DARK") bombType = "BOMB_DARK";
        else if (penaltyKey === "PAIR_THE_HANGED_MAN" || penaltyKey === "PAIR_BOMB_CHARITY") bombType = "BOMB_CHARITY";
        else bombType = rollBombTypeForMinigame("MEMORY_PAIRS", team.score || 0, { currentRound, riskTier });
        const outcome = resolveBombOutcome({
          bombType,
          team,
          allTeams,
          storyDescription: `${cancelPrefix}Gh\xE9p tr\xFAng C\u1EB7p ${getPenaltyName(penaltyKey)}!`,
          baseQuestionPoints: state.baseQuestionPoints,
          isSurvivalPenalty: false
        });
        state.bombExploded = outcome.bombExploded;
        state.phase = "TURN_SUMMARY";
        state.turnFinishedReason = "BOMB_HIT";
        state.potPoints = 0;
        const oldScore = team.score || 0;
        const newScore = Math.max(0, oldScore - outcome.penalty);
        state.storyResult = {
          teamId: team.id,
          teamName: team.name,
          teamColor: team.color || "#ef4444",
          rewardText: `${cancelPrefix}\u{1F4A5} ${outcome.bombExploded.title}: ${outcome.penaltyText}`,
          scoreDelta: -outcome.penalty,
          oldScore,
          newScore
        };
        return {
          updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
          isBomb: true,
          scorePenalty: outcome.penalty,
          finalScoreDelta: -outcome.penalty,
          giftedPoints: outcome.giftedPoints,
          recipientTeamId: outcome.recipientTeamId,
          recipientTeamName: outcome.recipientTeamName,
          darkBombRecipients: outcome.darkBombRecipients
        };
      }
    };
    if (memState.isBombRescueActive && memState.firstFlippedTileId && memState.secondFlippedTileId && !memState.thirdFlippedTileId) {
      if (Number(tile2.id) === Number(memState.firstFlippedTileId) || Number(tile2.id) === Number(memState.secondFlippedTileId)) {
        return { updatedState: state, isBomb: false, scorePenalty: 0 };
      }
      const card1 = state.tiles.find((t) => Number(t.id) === Number(memState.firstFlippedTileId));
      const card2 = state.tiles.find((t) => Number(t.id) === Number(memState.secondFlippedTileId));
      const card3 = tile2;
      memState.thirdFlippedTileId = tile2.id;
      memState.attemptsUsed += 1;
      state.lastFlippedTile = tile2;
      state.tiles = state.tiles.map(
        (t) => Number(t.id) === numTileId || card1 && Number(t.id) === Number(card1.id) || card2 && Number(t.id) === Number(card2.id) ? { ...t, isOpened: true } : { ...t }
      );
      const oldPenaltyKey = memState.activePenaltyPairKey || "PAIR_BOMB";
      const cardsInTurn = [card1, card2, card3].filter(Boolean);
      const penaltyTwinIndex = cardsInTurn.findIndex((c) => c.pairKey === oldPenaltyKey);
      const otherTwoCards = cardsInTurn.filter((_, idx) => idx !== (penaltyTwinIndex !== -1 ? penaltyTwinIndex : 0));
      const [rescueA, rescueB] = otherTwoCards;
      const isRescueMatch = Boolean(rescueA && rescueB && rescueA.pairKey === rescueB.pairKey);
      if (isRescueMatch && rescueA) {
        if (isPenaltyTile(rescueA)) {
          return executePenalty({ penaltyKey: rescueA.pairKey, cancelOldKey: oldPenaltyKey });
        }
        const winCard = rescueA;
        memState.matchedPairKey = winCard.pairKey;
        memState.isBombRescueActive = false;
        state.memoryPairsState = { ...memState };
        if (winCard.givesShield) {
          state.hasShield = true;
          const teamsCount = Math.max(1, allTeams?.length || 2);
          const curTurn = state.currentTurnIndex || 0;
          state.teamShields = {
            ...state.teamShields || {},
            [team.id]: {
              activeFromTurnIndex: curTurn + 1,
              expiresAfterTurnIndex: curTurn + teamsCount,
              sourceCard: "THE_EMPEROR"
            }
          };
        }
        let winCardHeartMaxed = false;
        if (winCard.givesHeart) {
          const heartsRecord = { ...state.teamHearts || {} };
          const maxHearts = state.initialHeartsPerTeam ?? 3;
          const curHearts = heartsRecord[team.id] ?? state.initialHeartsPerTeam ?? 1;
          if (curHearts < maxHearts) {
            heartsRecord[team.id] = curHearts + 1;
            state.teamHearts = heartsRecord;
          } else {
            winCardHeartMaxed = true;
          }
        }
        let temperanceBonusRecipients;
        if (winCard.tarotCardKey === "TEMPERANCE" || winCard.pairKey === "PAIR_TEMPERANCE") {
          const pHalf = roundToMultipleOfFive((state.baseQuestionPoints || 10) * 0.5);
          const otherTeams = (allTeams || []).filter((t) => t.id !== team.id && !t.isEliminated);
          if (otherTeams.length > 0) {
            temperanceBonusRecipients = otherTeams.map((t) => ({
              teamId: t.id,
              teamName: t.name,
              points: pHalf
            }));
          }
        }
        let finalDelta = 0;
        let victimTeamId;
        let victimTeamName;
        let stolenPoints;
        if (winCard.tarotCardKey === "THE_FOOL" || winCard.pairKey === "PAIR_THE_FOOL") {
          finalDelta = 0;
        } else if (winCard.effectType === "STEAL_POINTS") {
          const stealAmount = winCard.deltaPoints || state.baseQuestionPoints || 10;
          const eligibleTeams = (allTeams || []).filter(
            (t) => t.id !== team.id && !t.isEliminated && (t.score || 0) >= stealAmount
          );
          if (eligibleTeams.length > 0) {
            state.phase = "STEAL_TARGET_SELECT";
            state.pendingSteal = {
              stolenPoints: stealAmount,
              eligibleTeamIds: eligibleTeams.map((t) => t.id),
              tileTitle: winCard.storyTitle,
              tileIcon: winCard.icon
            };
            return {
              updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
              isBomb: false,
              scorePenalty: 0,
              finalScoreDelta: 0
            };
          } else {
            finalDelta = stealAmount + extraPotBonus2;
          }
        } else {
          finalDelta = (winCard.deltaPoints || (state.baseQuestionPoints ? state.baseQuestionPoints * 2 : 20)) + extraPotBonus2;
        }
        if (getPerkType(state.promoPerk) === "STEAL_5_PROMO" && allTeams && allTeams.length > 0) {
          const promoSteal = calculatePromoSteal5({
            activeTeamId: team.id,
            allTeams
          });
          if (promoSteal.victimTeamId && promoSteal.stolenPoints > 0) {
            victimTeamId = promoSteal.victimTeamId;
            victimTeamName = promoSteal.victimTeamName;
            stolenPoints = (stolenPoints || 0) + promoSteal.stolenPoints;
            finalDelta += promoSteal.stolenPoints;
          }
        }
        state.phase = "TURN_SUMMARY";
        state.turnFinishedReason = "PAIR_MATCHED";
        state.potPoints = 0;
        const oldScore = team.score || 0;
        const newScore = oldScore + finalDelta;
        const baseReward = finalDelta - extraPotBonus2 - (stolenPoints || 0);
        let rewardText = winCard.tarotCardKey === "THE_FOOL" ? `\u{1F0CF} H\xF3a gi\u1EA3i b\u1EABy th\xE0nh c\xF4ng! Gh\xE9p tr\xFAng c\u1EB7p K\u1EBB Kh\u1EDD, b\u1EA3o to\xE0n th\u1EBF tr\u1EADn an to\xE0n tuy\u1EC7t \u0111\u1ED1i (\xB10\u0111)!` : extraPotBonus2 > 0 ? `\u{1F389} Tho\xE1t hi\u1EC3m ngo\u1EA1n m\u1EE5c! H\xF3a gi\u1EA3i b\u1EABy ph\u1EA1t v\xE0 gh\xE9p ch\xEDnh x\xE1c c\u1EB7p ${winCard.storyTitle}! Nh\u1EADn tr\u1ECDn v\u1EB9n +${baseReward}\u0111 v\xE0 +${extraPotBonus2}\u0111 t\u1EEB Qu\u1EF9 th\u01B0\u1EDFng (T\u1ED5ng +${finalDelta} \u0111i\u1EC3m)!` : `\u{1F389} Tho\xE1t hi\u1EC3m ngo\u1EA1n m\u1EE5c! H\xF3a gi\u1EA3i b\u1EABy ph\u1EA1t v\xE0 gh\xE9p ch\xEDnh x\xE1c c\u1EB7p ${winCard.storyTitle}! Nh\u1EADn tr\u1ECDn v\u1EB9n +${finalDelta} \u0111i\u1EC3m!`;
        if (stolenPoints && victimTeamName) {
          rewardText += ` (\u{1F5E1}\uFE0F \u0110\u1EA1o T\u1EB7c \u0111\xE1nh c\u1EAFp +${stolenPoints}\u0111 t\u1EEB \u0110\u1ED9i ${victimTeamName}!)`;
        }
        if (winCardHeartMaxed) {
          rewardText += ` (\u2764\uFE0F \u0110\xE3 \u0111\u1EA1t t\u1ED1i \u0111a ${state.initialHeartsPerTeam ?? 3} tim - kh\xF4ng h\u1ED3i th\xEAm)`;
        }
        if (temperanceBonusRecipients && temperanceBonusRecipients.length > 0) {
          const pHalf = roundToMultipleOfFive((state.baseQuestionPoints || 10) * 0.5);
          rewardText += ` (\u2696\uFE0F Ti\u1EBFt \u0110\u1ED9 dung h\u1EE3p: Ban ph\u01B0\u1EDBc chia s\u1EBB +${pHalf}\u0111 cho t\u1EA5t c\u1EA3 \u0111\u1ED1i th\u1EE7 c\xF2n l\u1EA1i!)`;
        }
        state.storyResult = {
          teamId: team.id,
          teamName: team.name,
          teamColor: team.color || "#ef4444",
          rewardText,
          scoreDelta: finalDelta,
          oldScore,
          newScore
        };
        return {
          updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
          isBomb: false,
          scorePenalty: 0,
          finalScoreDelta: finalDelta,
          victimTeamId,
          victimTeamName,
          stolenPoints,
          temperanceBonusRecipients
        };
      } else {
        return executePenalty({ penaltyKey: oldPenaltyKey });
      }
    }
    if (!memState.firstFlippedTileId) {
      memState.firstFlippedTileId = tile2.id;
      state.lastFlippedTile = tile2;
      state.tiles = state.tiles.map(
        (t) => Number(t.id) === numTileId ? { ...t, isOpened: true } : { ...t }
      );
      const tilePenaltyKey = getPenaltyKey(tile2);
      if (tilePenaltyKey) {
        memState.keptBombTileIds = Array.from(/* @__PURE__ */ new Set([...previouslyKeptBombs, tile2.id]));
        memState.faceUpPenaltyTileIds = Array.from(/* @__PURE__ */ new Set([...memState.faceUpPenaltyTileIds || [], tile2.id]));
        const matchingPriorBomb = state.tiles.find(
          (t) => previouslyKeptBombs.includes(t.id) && getPenaltyKey(t) === tilePenaltyKey
        );
        if (matchingPriorBomb) {
          memState.isBombRescueActive = true;
          memState.activePenaltyPairKey = tilePenaltyKey;
        }
      } else if (isNeutralTile(tile2)) {
        memState.keptBombTileIds = Array.from(/* @__PURE__ */ new Set([...previouslyKeptBombs, tile2.id]));
        memState.faceUpPenaltyTileIds = Array.from(/* @__PURE__ */ new Set([...memState.faceUpPenaltyTileIds || [], tile2.id]));
      }
      state.memoryPairsState = { ...memState };
      return {
        updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
        isBomb: false,
        scorePenalty: 0
      };
    }
    const firstId = Number(memState.firstFlippedTileId);
    const secondId = numTileId;
    const pairMoveKey = `${Math.min(firstId, secondId)}-${Math.max(firstId, secondId)}`;
    const attemptedPairs = memState.attemptedPairs || [];
    if (attemptedPairs.includes(pairMoveKey)) {
      return { updatedState: state, isBomb: false, scorePenalty: 0 };
    }
    memState.attemptedPairs = [...attemptedPairs, pairMoveKey];
    memState.secondFlippedTileId = tile2.id;
    state.lastFlippedTile = tile2;
    const firstTile = state.tiles.find((t) => Number(t.id) === Number(memState.firstFlippedTileId));
    state.tiles = state.tiles.map(
      (t) => Number(t.id) === numTileId || firstTile && Number(t.id) === Number(firstTile.id) ? { ...t, isOpened: true } : { ...t }
    );
    if (memState.isBombRescueActive) {
      state.memoryPairsState = { ...memState };
      return {
        updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
        isBomb: false,
        scorePenalty: 0
      };
    }
    const firstTilePenaltyKey = getPenaltyKey(firstTile);
    const secondTilePenaltyKey = getPenaltyKey(tile2);
    const handleRound2Failure = () => {
      const basePenalty = state.baseQuestionPoints || 10;
      const heartsRecord = { ...state.teamHearts || {} };
      const currentHearts = heartsRecord[team.id] ?? state.initialHeartsPerTeam ?? 1;
      if (currentHearts > 0) {
        heartsRecord[team.id] = Math.max(0, currentHearts - 1);
        state.teamHearts = heartsRecord;
      }
      const remainingHearts = state.teamHearts?.[team.id] ?? 0;
      state.phase = "TURN_SUMMARY";
      state.turnFinishedReason = "MAX_ATTEMPTS";
      state.potPoints = 0;
      const oldScore = team.score || 0;
      const newScore = Math.max(0, oldScore - basePenalty);
      state.storyResult = {
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color || "#ef4444",
        rewardText: `\u23F1\uFE0F H\u1EBFt c\u1EA3 2 v\xF2ng (10 l\u01B0\u1EE3t) m\xE0 kh\xF4ng gh\xE9p \u0111\u01B0\u1EE3c c\u1EB7p b\xE0i n\xE0o! B\u1ECB ph\u1EA1t tr\u1EEB 100% \u0111i\u1EC3m g\u1ED1c c\xE2u h\u1ECFi (-${basePenalty}\u0111) v\xE0 tr\u1EEB 1 \u2764\uFE0F Tim (C\xF2n ${remainingHearts} \u2764\uFE0F)!`,
        scoreDelta: -basePenalty,
        oldScore,
        newScore
      };
      return {
        updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
        isBomb: true,
        scorePenalty: basePenalty,
        finalScoreDelta: -basePenalty
      };
    };
    if (firstTilePenaltyKey && secondTilePenaltyKey) {
      if (firstTilePenaltyKey === secondTilePenaltyKey) {
        return executePenalty({ penaltyKey: firstTilePenaltyKey });
      } else {
        memState.attemptsUsed += 1;
        memState.keptBombTileIds = Array.from(/* @__PURE__ */ new Set([...previouslyKeptBombs, firstTile.id, tile2.id]));
        memState.faceUpPenaltyTileIds = Array.from(/* @__PURE__ */ new Set([...memState.faceUpPenaltyTileIds || [], firstTile.id, tile2.id]));
        memState.isMismatchResolving = true;
        const isRoundOver = memState.attemptsUsed >= memState.maxAttempts;
        const currentRound2 = memState.round || 1;
        if (isRoundOver) {
          if (currentRound2 === 1) {
            memState.promptSecondChance = true;
            state.memoryPairsState = { ...memState };
            return { updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } }, isBomb: false, scorePenalty: 0, shouldResetMismatchedCards: true };
          } else {
            return handleRound2Failure();
          }
        }
        state.memoryPairsState = { ...memState };
        return { updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } }, isBomb: false, scorePenalty: 0, shouldResetMismatchedCards: true };
      }
    }
    if (secondTilePenaltyKey) {
      memState.keptBombTileIds = Array.from(/* @__PURE__ */ new Set([...previouslyKeptBombs, tile2.id]));
      memState.faceUpPenaltyTileIds = Array.from(/* @__PURE__ */ new Set([...memState.faceUpPenaltyTileIds || [], tile2.id]));
      const matchingPriorBomb = state.tiles.find(
        (t) => previouslyKeptBombs.includes(t.id) && Number(t.id) !== Number(firstTile?.id) && getPenaltyKey(t) === secondTilePenaltyKey
      );
      if (matchingPriorBomb) {
        memState.isBombRescueActive = true;
        memState.activePenaltyPairKey = secondTilePenaltyKey;
        state.memoryPairsState = { ...memState };
        return {
          updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
          isBomb: false,
          scorePenalty: 0
        };
      }
    }
    if (firstTilePenaltyKey || secondTilePenaltyKey || isNeutralTile(firstTile) || isNeutralTile(tile2)) {
      memState.attemptsUsed += 1;
      const penaltyOrNeutralTile = firstTilePenaltyKey || isNeutralTile(firstTile) ? firstTile : tile2;
      memState.keptBombTileIds = Array.from(/* @__PURE__ */ new Set([...previouslyKeptBombs, penaltyOrNeutralTile.id]));
      memState.faceUpPenaltyTileIds = Array.from(/* @__PURE__ */ new Set([...memState.faceUpPenaltyTileIds || [], penaltyOrNeutralTile.id]));
      memState.isMismatchResolving = true;
      const isRoundOver = memState.attemptsUsed >= memState.maxAttempts;
      const currentRound2 = memState.round || 1;
      if (isRoundOver) {
        if (currentRound2 === 1) {
          memState.promptSecondChance = true;
          state.memoryPairsState = { ...memState };
          return { updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } }, isBomb: false, scorePenalty: 0, shouldResetMismatchedCards: true };
        } else {
          return handleRound2Failure();
        }
      }
      state.memoryPairsState = { ...memState };
      return { updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } }, isBomb: false, scorePenalty: 0, shouldResetMismatchedCards: true };
    }
    memState.attemptsUsed += 1;
    const isMatch = Boolean(firstTile && firstTile.pairKey && firstTile.pairKey === tile2.pairKey);
    if (isMatch && firstTile) {
      memState.matchedPairKey = firstTile.pairKey;
      state.memoryPairsState = { ...memState };
      state.tiles = state.tiles.map(
        (t) => t.pairKey === firstTile.pairKey || Number(t.id) === numTileId || Number(t.id) === Number(firstTile.id) ? { ...t, isOpened: true } : { ...t }
      );
      if (firstTile.givesShield) {
        state.hasShield = true;
        const teamsCount = Math.max(1, allTeams?.length || 2);
        const curTurn = state.currentTurnIndex || 0;
        state.teamShields = {
          ...state.teamShields || {},
          [team.id]: {
            activeFromTurnIndex: curTurn + 1,
            expiresAfterTurnIndex: curTurn + teamsCount,
            sourceCard: "THE_EMPEROR"
          }
        };
      }
      let firstTileHeartMaxed = false;
      if (firstTile.givesHeart) {
        const heartsRecord = { ...state.teamHearts || {} };
        const maxHearts = state.initialHeartsPerTeam ?? 3;
        const curHearts = heartsRecord[team.id] ?? state.initialHeartsPerTeam ?? 1;
        if (curHearts < maxHearts) {
          heartsRecord[team.id] = curHearts + 1;
          state.teamHearts = heartsRecord;
        } else {
          firstTileHeartMaxed = true;
        }
      }
      let temperanceBonusRecipients;
      if (firstTile.tarotCardKey === "TEMPERANCE" || firstTile.pairKey === "PAIR_TEMPERANCE") {
        const pHalf = roundToMultipleOfFive((state.baseQuestionPoints || 10) * 0.5);
        const otherTeams = (allTeams || []).filter((t) => t.id !== team.id && !t.isEliminated);
        if (otherTeams.length > 0) {
          temperanceBonusRecipients = otherTeams.map((t) => ({
            teamId: t.id,
            teamName: t.name,
            points: pHalf
          }));
        }
      }
      let victimTeamId;
      let victimTeamName;
      let stolenPoints;
      let finalDelta = 0;
      if (firstTile.tarotCardKey === "THE_FOOL" || firstTile.pairKey === "PAIR_THE_FOOL") {
        finalDelta = 0;
      } else if (firstTile.effectType === "STEAL_POINTS") {
        const stealAmount = firstTile.deltaPoints || state.baseQuestionPoints || 10;
        const eligibleTeams = (allTeams || []).filter(
          (t) => t.id !== team.id && !t.isEliminated && (t.score || 0) >= stealAmount
        );
        if (eligibleTeams.length > 0) {
          state.phase = "STEAL_TARGET_SELECT";
          state.pendingSteal = {
            stolenPoints: stealAmount,
            eligibleTeamIds: eligibleTeams.map((t) => t.id),
            tileTitle: firstTile.storyTitle,
            tileIcon: firstTile.icon
          };
          return {
            updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
            isBomb: false,
            scorePenalty: 0,
            finalScoreDelta: 0
          };
        } else {
          finalDelta = stealAmount + extraPotBonus2;
        }
      } else {
        finalDelta = (firstTile.deltaPoints || (state.baseQuestionPoints ? state.baseQuestionPoints * 2 : 20)) + extraPotBonus2;
      }
      if (getPerkType(state.promoPerk) === "STEAL_5_PROMO" && allTeams && allTeams.length > 0) {
        const promoSteal = calculatePromoSteal5({
          activeTeamId: team.id,
          allTeams
        });
        if (promoSteal.victimTeamId && promoSteal.stolenPoints > 0) {
          victimTeamId = promoSteal.victimTeamId;
          victimTeamName = promoSteal.victimTeamName;
          stolenPoints = (stolenPoints || 0) + promoSteal.stolenPoints;
          finalDelta += promoSteal.stolenPoints;
        }
      }
      state.phase = "TURN_SUMMARY";
      state.turnFinishedReason = "PAIR_MATCHED";
      state.potPoints = 0;
      const oldScore = team.score || 0;
      const newScore = oldScore + finalDelta;
      const baseReward = finalDelta - extraPotBonus2 - (stolenPoints || 0);
      let rewardText = firstTile.tarotCardKey === "THE_FOOL" ? `\u{1F0CF} Gh\xE9p tr\xFAng c\u1EB7p K\u1EBB Kh\u1EDD L\xE3ng Du! Gi\u1EEF nguy\xEAn th\u1EBF tr\u1EADn an to\xE0n tuy\u1EC7t \u0111\u1ED1i (\xB10\u0111)!` : extraPotBonus2 > 0 ? `\u{1F389} Gh\xE9p th\xE0nh c\xF4ng ${firstTile.storyTitle}! Nh\u1EADn tr\u1ECDn v\u1EB9n +${baseReward}\u0111 v\xE0 +${extraPotBonus2}\u0111 t\u1EEB Qu\u1EF9 th\u01B0\u1EDFng (T\u1ED5ng +${finalDelta} \u0111i\u1EC3m)!` : `\u{1F389} Gh\xE9p th\xE0nh c\xF4ng ${firstTile.storyTitle}! Nh\u1EADn tr\u1ECDn v\u1EB9n +${finalDelta} \u0111i\u1EC3m!`;
      if (stolenPoints && victimTeamName) {
        rewardText += ` (\u{1F5E1}\uFE0F \u0110\u1EA1o T\u1EB7c \u0111\xE1nh c\u1EAFp +${stolenPoints}\u0111 t\u1EEB \u0110\u1ED9i ${victimTeamName}!)`;
      }
      if (firstTileHeartMaxed) {
        rewardText += ` (\u2764\uFE0F \u0110\xE3 \u0111\u1EA1t t\u1ED1i \u0111a ${state.initialHeartsPerTeam ?? 3} tim - kh\xF4ng h\u1ED3i th\xEAm)`;
      }
      if (temperanceBonusRecipients && temperanceBonusRecipients.length > 0) {
        const pHalf = roundToMultipleOfFive((state.baseQuestionPoints || 10) * 0.5);
        rewardText += ` (\u2696\uFE0F Ti\u1EBFt \u0110\u1ED9 dung h\u1EE3p: Ban ph\u01B0\u1EDBc chia s\u1EBB +${pHalf}\u0111 cho t\u1EA5t c\u1EA3 \u0111\u1ED1i th\u1EE7 c\xF2n l\u1EA1i!)`;
      }
      state.storyResult = {
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color || "#ef4444",
        rewardText,
        scoreDelta: finalDelta,
        oldScore,
        newScore
      };
      return {
        updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
        isBomb: false,
        scorePenalty: 0,
        finalScoreDelta: finalDelta,
        victimTeamId,
        victimTeamName,
        stolenPoints,
        temperanceBonusRecipients
      };
    } else {
      memState.isMismatchResolving = true;
      const isRoundOver = memState.attemptsUsed >= memState.maxAttempts;
      const currentRound2 = memState.round || 1;
      if (isRoundOver) {
        if (currentRound2 === 1) {
          memState.promptSecondChance = true;
          state.memoryPairsState = { ...memState };
          return { updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } }, isBomb: false, scorePenalty: 0, shouldResetMismatchedCards: true };
        } else {
          return handleRound2Failure();
        }
      }
      state.memoryPairsState = { ...memState };
      return { updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } }, isBomb: false, scorePenalty: 0, shouldResetMismatchedCards: true };
    }
  }
  if (normType === "ONE_SHOT_DOORS") {
    const osState = state.oneShotState || {
      selectedDoorIds: [],
      hasBombDetected: false,
      phase: "SELECTING",
      revealedSafeDoorIds: [],
      chosenFinalDoorId: void 0,
      allRevealed: false
    };
    state.oneShotState = osState;
    if (osState.phase === "RESOLVED") {
      return { updatedState: state, isBomb: false, scorePenalty: 0 };
    }
    const tile2 = state.tiles.find((t) => t.id === tileId);
    if (!tile2) {
      return { updatedState: state, isBomb: false, scorePenalty: 0 };
    }
    if (state.isPenaltySurvivalMode) {
      if (osState.phase === "SELECT_4" || osState.phase === "SELECTING" || !osState.phase) {
        const selected = osState.selectedDoorIds || [];
        if (selected.includes(tileId)) {
          osState.selectedDoorIds = selected.filter((id) => id !== tileId);
          return { updatedState: { ...state }, isBomb: false, scorePenalty: 0 };
        }
        if (selected.length >= 4) {
          return { updatedState: { ...state }, isBomb: false, scorePenalty: 0 };
        }
        selected.push(tileId);
        osState.selectedDoorIds = [...selected];
        if (selected.length < 4) {
          return { updatedState: { ...state }, isBomb: false, scorePenalty: 0 };
        }
        const discarded = state.tiles.filter((t) => !selected.includes(t.id)).map((t) => t.id);
        osState.discardedDoorIds = discarded;
        const chosenTiles = state.tiles.filter((t) => selected.includes(t.id));
        const hasSafe = chosenTiles.some(
          (t) => t.type === "ESCAPE_SAFE" || t.tarotCardKey === "THE_FOOL" || t.pairKey === "THE_FOOL"
        );
        osState.radarLight = hasSafe ? "GREEN" : "RED";
        osState.radarLightStep1 = osState.radarLight;
        osState.phase = "STAGE_2_PICK";
        return { updatedState: { ...state }, isBomb: false, scorePenalty: 0 };
      }
      if (osState.phase === "STAGE_2_PICK") {
        const selected = osState.selectedDoorIds || [];
        if (!selected.includes(tileId)) {
          return { updatedState: state, isBomb: false, scorePenalty: 0 };
        }
        osState.chosenFinalDoorId = tileId;
        osState.phase = "RESOLVED";
        osState.allRevealed = true;
        state.tiles.forEach((t) => {
          t.isOpened = true;
        });
        const isSafe = tile2.type === "ESCAPE_SAFE" || tile2.tarotCardKey === "THE_FOOL" || tile2.pairKey === "THE_FOOL";
        if (isSafe) {
          state.potPoints = 0;
          state.phase = "TURN_SUMMARY";
          state.turnFinishedReason = "SURVIVAL_ESCAPE";
          const oldScore = team.score || 0;
          state.storyResult = {
            teamId: team.id,
            teamName: team.name,
            teamColor: team.color || "#10b981",
            rewardText: "\u{1F54A}\uFE0F May m\u1EAFn tuy\u1EC7t \u0111\u1EC9nh! B\u1EA1n \u0111\xE3 m\u1EDF \u0111\xFAng C\u1EECA AN TO\xC0N, b\u1EA3o to\xE0n nguy\xEAn v\u1EB9n \u0111i\u1EC3m s\u1ED1 v\xE0 tim!",
            scoreDelta: 0,
            oldScore,
            newScore: oldScore
          };
          return { updatedState: { ...state, tiles: [...state.tiles] }, isBomb: false, scorePenalty: 0, finalScoreDelta: 0 };
        }
        const isRandomBomb = tile2.type === "BOMB_MAJOR" || Boolean(tile2.bombDoorType) || tile2.type === "BOMB_SMOKE" || tile2.type === "BOMB_DARK" || tile2.type === "BOMB_CHARITY";
        if (isRandomBomb) {
          const bombType = tile2.bombDoorType || (tile2.type === "BOMB_SMOKE" ? "BOMB_SMOKE" : tile2.type === "BOMB_DARK" ? "BOMB_DARK" : "BOMB_CHARITY");
          const outcome = resolveBombOutcome({
            bombType,
            team,
            allTeams,
            storyDescription: tile2.storyDescription || "M\u1EDF tr\xFAng C\u1EEDa B\u1EABy Bom Sinh T\u1EED!",
            baseQuestionPoints: state.baseQuestionPoints,
            isSurvivalPenalty: true
          });
          state.potPoints = 0;
          state.bombExploded = outcome.bombExploded;
          state.phase = "TURN_SUMMARY";
          state.turnFinishedReason = "SURVIVAL_FAILED";
          const oldScore = team.score || 0;
          const newScore = Math.max(0, oldScore - outcome.penalty);
          state.storyResult = {
            teamId: team.id,
            teamName: team.name,
            teamColor: team.color || "#ef4444",
            rewardText: `\u{1F4A5} ${outcome.bombExploded.title}: ${outcome.penaltyText}`,
            scoreDelta: -outcome.penalty,
            oldScore,
            newScore
          };
          return {
            updatedState: { ...state, tiles: [...state.tiles] },
            isBomb: true,
            scorePenalty: outcome.penalty,
            finalScoreDelta: -outcome.penalty,
            giftedPoints: outcome.giftedPoints,
            recipientTeamId: outcome.recipientTeamId,
            recipientTeamName: outcome.recipientTeamName,
            darkBombRecipients: outcome.darkBombRecipients
          };
        } else {
          const penalty = Math.min(team.score || 0, Math.abs(tile2.deltaPoints || state.baseQuestionPoints || 10));
          state.potPoints = 0;
          state.phase = "TURN_SUMMARY";
          state.turnFinishedReason = "SURVIVAL_FAILED";
          const oldScore = team.score || 0;
          const newScore = Math.max(0, oldScore - penalty);
          state.storyResult = {
            teamId: team.id,
            teamName: team.name,
            teamColor: team.color || "#ef4444",
            rewardText: `\u26A0\uFE0F D\xEDnh C\u1EEDa B\u1EABy Tr\u1EEB \u0110i\u1EC3m G\u1ED1c Sinh T\u1EED! B\u1ECB tr\u1EEB -${penalty} \u0111i\u1EC3m!`,
            scoreDelta: -penalty,
            oldScore,
            newScore
          };
          return {
            updatedState: { ...state, tiles: [...state.tiles] },
            isBomb: true,
            scorePenalty: penalty,
            finalScoreDelta: -penalty
          };
        }
      }
    }
    const isDoorNegative = (t) => {
      if (t.tarotCardKey === "THE_FOOL") return false;
      if (t.tarotCardKey === "THE_TOWER" || t.tarotCardKey === "THE_KNIGHT" || t.tarotCardKey === "THE_DEVIL" || t.tarotCardKey === "THE_HANGED_MAN") return true;
      if (t.type !== "REWARD" && t.type !== "ESCAPE_SAFE") return true;
      if (t.deltaPoints && t.deltaPoints < 0) return true;
      if (t.bombDoorType) return true;
      return false;
    };
    if (osState.phase === "SELECT_4" || osState.phase === "SELECTING" || !osState.phase) {
      if (tile2.isPeeked) {
        return { updatedState: { ...state }, isBomb: false, scorePenalty: 0 };
      }
      const selected = osState.selectedDoorIds || [];
      if (selected.includes(tileId)) {
        osState.selectedDoorIds = selected.filter((id) => id !== tileId);
        return { updatedState: { ...state }, isBomb: false, scorePenalty: 0 };
      }
      selected.push(tileId);
      osState.selectedDoorIds = [...selected];
      if (selected.length < 4) {
        return { updatedState: { ...state }, isBomb: false, scorePenalty: 0 };
      }
      osState.discardedDoorIds = state.tiles.filter((t) => !selected.includes(t.id)).map((t) => t.id);
      const selectedTiles = state.tiles.filter((t) => selected.includes(t.id));
      const penaltyCount = selectedTiles.filter(isDoorNegative).length;
      osState.penaltyDoorsCount = penaltyCount;
      osState.hasBombDetected = penaltyCount > 0;
      osState.radarLightStep1 = penaltyCount === 0 ? "GREEN" : penaltyCount === 1 ? "YELLOW" : "RED";
      osState.phase = "STAGE_1_DECISION";
      return { updatedState: { ...state }, isBomb: false, scorePenalty: 0 };
    }
    if (osState.phase === "SELECT_2") {
      const keptFourDoorIds = state.tiles.filter((t) => !(osState.discardedDoorIds || []).includes(t.id)).map((t) => t.id);
      if (!keptFourDoorIds.includes(tileId)) {
        return { updatedState: { ...state }, isBomb: false, scorePenalty: 0 };
      }
      const selected = osState.selectedDoorIds || [];
      if (selected.includes(tileId)) {
        osState.selectedDoorIds = selected.filter((id) => id !== tileId);
        return { updatedState: { ...state }, isBomb: false, scorePenalty: 0 };
      }
      selected.push(tileId);
      osState.selectedDoorIds = [...selected];
      if (selected.length < 2) {
        return { updatedState: { ...state }, isBomb: false, scorePenalty: 0 };
      }
      const newlyDiscarded = keptFourDoorIds.filter((id) => !selected.includes(id));
      osState.discardedDoorIds = Array.from(/* @__PURE__ */ new Set([...osState.discardedDoorIds || [], ...newlyDiscarded]));
      const finalSelectedTiles = state.tiles.filter((t) => selected.includes(t.id));
      const penaltyCount2 = finalSelectedTiles.filter(isDoorNegative).length;
      osState.penaltyDoorsCount = penaltyCount2;
      osState.hasBombDetected = penaltyCount2 > 0;
      osState.radarLight = penaltyCount2 === 0 ? "GREEN" : penaltyCount2 === 1 ? "YELLOW" : "RED";
      osState.phase = "FINAL_DECISION";
      return { updatedState: { ...state }, isBomb: false, scorePenalty: 0 };
    }
    if (osState.phase === "OPEN_FINAL" || osState.phase === "STAGE_2_PICK" || osState.phase === "SCANNED" || osState.phase === "FINAL_DECISION" && osState.radarLight === "GREEN") {
      const selected = osState.selectedDoorIds || [];
      if (!selected.includes(tileId)) {
        return { updatedState: state, isBomb: false, scorePenalty: 0 };
      }
      osState.chosenFinalDoorId = tileId;
      osState.phase = "RESOLVED";
      osState.allRevealed = true;
      state.tiles.forEach((t) => {
        t.isOpened = true;
      });
      const isNegative = isDoorNegative(tile2);
      if (isNegative) {
        if (state.hasShield && !state.isPenaltySurvivalMode) {
          state.hasShield = false;
          tile2.isOpened = true;
          osState.chosenFinalDoorId = void 0;
          osState.phase = "OPEN_FINAL";
          osState.allRevealed = false;
          osState.selectedDoorIds = (osState.selectedDoorIds || []).filter((id) => id !== tileId);
          state.storyResult = {
            teamId: team.id,
            teamName: team.name,
            teamColor: team.color || "#ef4444",
            rewardText: `\u{1F6E1}\uFE0F KHI\xCAN TH\u1EA6N \u0110\xC3 H\u1EA4P TH\u1EE4 B\u1EAAY PH\u1EA0T! C\u1EEDa b\u1EABy #${tile2.id} \u0111\xE3 b\u1ECB v\xF4 hi\u1EC7u h\xF3a an to\xE0n (0\u0111 ph\u1EA1t). \u0110\u1ED9i b\u1EA1n \u0111\u01B0\u1EE3c b\u1EA3o to\xE0n \u0111i\u1EC3m s\u1ED1 v\xE0 ch\u1ECDn l\u1EA1i c\xE1nh c\u1EEDa c\xF2n l\u1EA1i!`,
            scoreDelta: 0,
            oldScore: team.score || 0,
            newScore: team.score || 0
          };
          return {
            updatedState: { ...state },
            isBomb: false,
            scorePenalty: 0,
            finalScoreDelta: 0
          };
        }
        const isRandomBomb = tile2.type === "BOMB_MAJOR" || Boolean(tile2.bombDoorType) || tile2.tarotCardKey === "THE_DEVIL" || tile2.tarotCardKey === "THE_HANGED_MAN" || tile2.tarotCardKey === "THE_KNIGHT";
        if (isRandomBomb) {
          let bombType = "BOMB_DARK";
          if (tile2.tarotCardKey === "THE_KNIGHT" || tile2.type === "BOMB_SMOKE") bombType = "BOMB_SMOKE";
          else if (tile2.tarotCardKey === "THE_HANGED_MAN" || tile2.type === "BOMB_CHARITY") bombType = "BOMB_CHARITY";
          else if (tile2.tarotCardKey === "THE_DEVIL" || tile2.type === "BOMB_DARK") bombType = "BOMB_DARK";
          else bombType = tile2.bombDoorType || rollBombTypeForMinigame("ONE_SHOT_DOORS", team.score || 0, { currentRound, riskTier });
          const outcome = resolveBombOutcome({
            bombType,
            team,
            allTeams,
            storyDescription: tile2.storyDescription || "M\u1EDF tr\xFAng C\u1EEDa B\u1EABy Bom!",
            baseQuestionPoints: state.baseQuestionPoints,
            isSurvivalPenalty: state.isPenaltySurvivalMode
          });
          state.potPoints = 0;
          state.bombExploded = outcome.bombExploded;
          state.phase = "TURN_SUMMARY";
          state.turnFinishedReason = "BOMB_HIT";
          const oldScore = team.score || 0;
          const newScore = Math.max(0, oldScore - outcome.penalty);
          state.storyResult = {
            teamId: team.id,
            teamName: team.name,
            teamColor: team.color || "#ef4444",
            rewardText: `\u{1F4A5} R\u1EE7i ro b\u1EA5t th\xE0nh! ${outcome.bombExploded.title}: ${outcome.penaltyText}`,
            scoreDelta: -outcome.penalty,
            oldScore,
            newScore
          };
          return {
            updatedState: { ...state },
            isBomb: true,
            scorePenalty: outcome.penalty,
            finalScoreDelta: -outcome.penalty,
            recipientTeamId: outcome.recipientTeamId,
            recipientTeamName: outcome.recipientTeamName,
            giftedPoints: outcome.giftedPoints,
            darkBombRecipients: outcome.darkBombRecipients
          };
        } else {
          const penalty = riskTier === "UNDERDOG" ? 0 : Math.abs(tile2.deltaPoints || state.baseQuestionPoints || 10);
          state.potPoints = 0;
          state.bombExploded = {
            type: penalty === 0 ? "SMOKE" : "MINOR",
            title: tile2.storyTitle,
            description: tile2.storyDescription,
            penaltyText: penalty === 0 ? "May m\u1EAFn n\xE9 ph\u1EA1t! \u0110i\u1EC3m s\u1ED1 \u0111\u01B0\u1EE3c b\u1EA3o to\xE0n nguy\xEAn v\u1EB9n." : `M\u1EDF tr\xFAng C\u1EEDa B\u1EABy Th\xE1p! B\u1ECB tr\u1EEB ${penalty} \u0111i\u1EC3m t\u1EEB t\u1ED5ng \u0111i\u1EC3m.`
          };
          state.phase = "TURN_SUMMARY";
          state.turnFinishedReason = "BOMB_HIT";
          const oldScore = team.score || 0;
          const newScore = Math.max(0, oldScore - penalty);
          state.storyResult = {
            teamId: team.id,
            teamName: team.name,
            teamColor: team.color || "#ef4444",
            rewardText: penalty === 0 ? "\u{1F4A8} M\u1EDF tr\xFAng C\u1EEDa Th\xE1p nh\u01B0ng \u0111\u1ED9i y\u1EBFu th\u1EBF n\xE9 b\u1EABy ph\u1EA1t th\xE0nh c\xF4ng, b\u1EA3o to\xE0n t\u1ED5ng \u0111i\u1EC3m (0\u0111)!" : `\u{1F4A5} M\u1EDF tr\xFAng C\u1EEDa B\u1EABy Th\xE1p! B\u1ECB tr\u1EEB -${penalty} \u0111i\u1EC3m!`,
            scoreDelta: -penalty,
            oldScore,
            newScore
          };
          return {
            updatedState: { ...state },
            isBomb: true,
            scorePenalty: penalty,
            finalScoreDelta: -penalty
          };
        }
      } else {
        if (tile2.givesShield) {
          state.hasShield = true;
          const teamsCount = Math.max(1, allTeams?.length || 2);
          const curTurn = state.currentTurnIndex || 0;
          state.teamShields = {
            ...state.teamShields || {},
            [team.id]: {
              activeFromTurnIndex: curTurn + 1,
              expiresAfterTurnIndex: curTurn + teamsCount,
              sourceCard: "THE_EMPEROR"
            }
          };
        }
        let tileHeartMaxed = false;
        if (tile2.givesHeart) {
          const heartsRecord = { ...state.teamHearts || {} };
          const maxHearts = state.initialHeartsPerTeam ?? 3;
          const curHearts = heartsRecord[team.id] ?? state.initialHeartsPerTeam ?? 1;
          if (curHearts < maxHearts) {
            heartsRecord[team.id] = curHearts + 1;
            state.teamHearts = heartsRecord;
          } else {
            tileHeartMaxed = true;
          }
        }
        let temperanceBonusRecipients;
        if (tile2.tarotCardKey === "TEMPERANCE") {
          const pHalf = roundToMultipleOfFive((state.baseQuestionPoints || 10) * 0.5);
          const otherTeams = (allTeams || []).filter((t) => t.id !== team.id && !t.isEliminated);
          if (otherTeams.length > 0) {
            temperanceBonusRecipients = otherTeams.map((t) => ({
              teamId: t.id,
              teamName: t.name,
              points: pHalf
            }));
          }
        }
        const hasExtraPot2 = getPerkType(state.promoPerk) === "EXTRA_POT_PROMO";
        const extraPotBonus2 = hasExtraPot2 ? 5 : 0;
        const multiplier = state.potMultiplier || 1;
        if (tile2.effectType === "STEAL_POINTS") {
          const stealAmount = tile2.deltaPoints || state.baseQuestionPoints || 10;
          const eligibleTeams = (allTeams || []).filter(
            (t) => t.id !== team.id && !t.isEliminated && (t.score || 0) >= stealAmount
          );
          if (eligibleTeams.length > 0) {
            state.phase = "STEAL_TARGET_SELECT";
            state.pendingSteal = {
              stolenPoints: stealAmount,
              eligibleTeamIds: eligibleTeams.map((t) => t.id),
              tileTitle: tile2.storyTitle,
              tileIcon: tile2.icon
            };
            return {
              updatedState: { ...state },
              isBomb: false,
              scorePenalty: 0,
              finalScoreDelta: extraPotBonus2
            };
          }
        }
        const baseReward = tile2.tarotCardKey === "THE_FOOL" ? 0 : tile2.deltaPoints || state.baseQuestionPoints || 10;
        let finalDelta = tile2.tarotCardKey === "THE_FOOL" ? 0 : baseReward * multiplier + extraPotBonus2;
        let victimTeamId;
        let victimTeamName;
        let stolenPoints;
        if (getPerkType(state.promoPerk) === "STEAL_5_PROMO" && allTeams && allTeams.length > 0) {
          const promoSteal = calculatePromoSteal5({
            activeTeamId: team.id,
            allTeams
          });
          if (promoSteal.victimTeamId && promoSteal.stolenPoints > 0) {
            victimTeamId = promoSteal.victimTeamId;
            victimTeamName = promoSteal.victimTeamName;
            stolenPoints = promoSteal.stolenPoints;
            finalDelta += promoSteal.stolenPoints;
          }
        }
        state.potPoints = 0;
        state.phase = "TURN_SUMMARY";
        state.turnFinishedReason = "DOOR_CHOSEN";
        const oldScore = team.score || 0;
        const newScore = oldScore + finalDelta;
        let rewardText = tile2.tarotCardKey === "THE_FOOL" ? `\u{1F0CF} M\u1EDE C\u1EECA K\u1EBA KH\u1EDC! Gi\u1EEF nguy\xEAn th\u1EBF tr\u1EADn an to\xE0n tuy\u1EC7t \u0111\u1ED1i (\xB10\u0111)!` : extraPotBonus2 > 0 ? `\u{1F389} M\u1EDE C\u1EECA TH\xC0NH C\xD4NG! ${tile2.storyTitle} Nh\u1EADn +${baseReward * multiplier}\u0111 v\xE0 +${extraPotBonus2}\u0111 Qu\u1EF9 th\u01B0\u1EDFng (T\u1ED5ng +${finalDelta} \u0111i\u1EC3m)!` : `\u{1F389} M\u1EDE C\u1EECA TH\xC0NH C\xD4NG! ${tile2.storyTitle} Nh\u1EADn tr\u1ECDn v\u1EB9n +${finalDelta} \u0111i\u1EC3m th\u01B0\u1EDFng!`;
        if (tile2.tarotCardKey === "TEMPERANCE" && temperanceBonusRecipients && temperanceBonusRecipients.length > 0) {
          const pHalf = roundToMultipleOfFive((state.baseQuestionPoints || 10) * 0.5);
          rewardText += ` (\u2696\uFE0F Ti\u1EBFt \u0110\u1ED9 dung h\u1EE3p: Ban ph\u01B0\u1EDBc chia s\u1EBB +${pHalf}\u0111 cho t\u1EA5t c\u1EA3 \u0111\u1ED1i th\u1EE7 c\xF2n l\u1EA1i!)`;
        }
        if (tileHeartMaxed) {
          rewardText += ` (\u2764\uFE0F \u0110\xE3 \u0111\u1EA1t t\u1ED1i \u0111a ${state.initialHeartsPerTeam ?? 3} tim - kh\xF4ng h\u1ED3i th\xEAm)`;
        }
        if (stolenPoints && victimTeamName) {
          rewardText += ` (\u{1F5E1}\uFE0F \u0110\u1EA1o T\u1EB7c \u0111\xE1nh c\u1EAFp +${stolenPoints}\u0111 t\u1EEB \u0110\u1ED9i ${victimTeamName}!)`;
        }
        state.storyResult = {
          teamId: team.id,
          teamName: team.name,
          teamColor: team.color || "#ef4444",
          rewardText,
          scoreDelta: finalDelta,
          oldScore,
          newScore
        };
        return {
          updatedState: { ...state },
          isBomb: false,
          scorePenalty: 0,
          finalScoreDelta: finalDelta,
          victimTeamId,
          victimTeamName,
          stolenPoints,
          temperanceBonusRecipients
        };
      }
    }
    return { updatedState: state, isBomb: false, scorePenalty: 0 };
  }
  if (normType === "TAROT_DESTINY") {
    const tState = state.tarotState || {};
    state.tarotState = tState;
    const tile2 = state.tiles.find((t) => t.id === tileId);
    if (!tile2 || tile2.isOpened || tileId === tState?.discardedCardId || tState?.prophecyCardId && !tState?.prophecyResolved) {
      return { updatedState: state, isBomb: false, scorePenalty: 0 };
    }
    const canRedraw = Boolean(tState.canRedraw && !tState.hasRedrawn);
    if (canRedraw) {
      tile2.isOpened = true;
      tState.chosenCardId = tileId;
      state.lastFlippedTile = tile2;
      return { updatedState: { ...state }, isBomb: false, scorePenalty: 0 };
    }
    tile2.isOpened = true;
    state.tiles.forEach((t) => {
      t.isOpened = true;
    });
    tState.chosenCardId = tileId;
    state.lastFlippedTile = tile2;
    const isBomb = tile2.type !== "REWARD";
    let penalty = 0;
    let finalDelta = 0;
    if (isBomb) {
      if (state.hasShield && !state.isPenaltySurvivalMode) {
        state.hasShield = false;
        tile2.isOpened = true;
        state.storyResult = {
          teamId: team.id,
          teamName: team.name,
          teamColor: team.color || "#ef4444",
          rewardText: `\u{1F6E1}\uFE0F KHI\xCAN TH\u1EA6N \u0110\xC3 \u0110\u1EA8Y L\xD9I TH\u1EA6N CH\u1EBET! L\xE1 b\xE0i #${tile2.id} (${tile2.storyTitle}) \u0111\xE3 b\u1ECB v\xF4 hi\u1EC7u h\xF3a an to\xE0n (0\u0111 ph\u1EA1t). \u0110\u1ED9i b\u1EA1n \u0111\u01B0\u1EE3c b\u1EA3o to\xE0n \u0111i\u1EC3m s\u1ED1 v\xE0 ch\u1ECDn l\u1EA1i 1 l\xE1 b\xE0i kh\xE1c!`,
          scoreDelta: 0,
          oldScore: team.score || 0,
          newScore: team.score || 0
        };
        return {
          updatedState: { ...state },
          isBomb: false,
          scorePenalty: 0,
          finalScoreDelta: 0
        };
      }
      penalty = Math.abs(tile2.deltaPoints || 20);
      state.potPoints = 0;
      state.bombExploded = {
        type: "MAJOR",
        title: tile2.storyTitle,
        description: tile2.storyDescription,
        penaltyText: `Qu\u1EBB b\xE0i Th\u1EA7n Ch\u1EBFt! B\u1ECB ph\u1EA1t tr\u1EEB ${penalty} \u0111i\u1EC3m t\u1EEB t\u1ED5ng \u0111i\u1EC3m.`
      };
      state.phase = "TURN_SUMMARY";
      state.turnFinishedReason = "BOMB_HIT";
      const oldScore = team.score || 0;
      const newScore = Math.max(0, oldScore - penalty);
      state.storyResult = {
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color || "#ef4444",
        rewardText: `\u{1F480} Qu\u1EBB b\xE0i Th\u1EA7n Ch\u1EBFt xu\u1EA5t hi\u1EC7n! B\u1ECB ph\u1EA1t tr\u1EEB ${penalty} \u0111i\u1EC3m!`,
        scoreDelta: -penalty,
        oldScore,
        newScore
      };
      return {
        updatedState: { ...state },
        isBomb: true,
        scorePenalty: penalty,
        finalScoreDelta: -penalty
      };
    } else {
      let victimTeamId;
      let victimTeamName;
      let stolenPoints;
      const hasExtraPot2 = getPerkType(state.promoPerk) === "EXTRA_POT_PROMO";
      const extraPotBonus2 = hasExtraPot2 ? 5 : 0;
      const multiplier = state.potMultiplier || 1;
      if (tile2.effectType === "STEAL_POINTS") {
        const stealAmount = tile2.deltaPoints || state.baseQuestionPoints || 10;
        const eligibleTeams = (allTeams || []).filter(
          (t) => t.id !== team.id && !t.isEliminated && (t.score || 0) >= stealAmount
        );
        if (eligibleTeams.length > 0) {
          state.phase = "STEAL_TARGET_SELECT";
          state.pendingSteal = {
            stolenPoints: stealAmount,
            eligibleTeamIds: eligibleTeams.map((t) => t.id),
            tileTitle: tile2.storyTitle,
            tileIcon: tile2.icon
          };
          return {
            updatedState: { ...state },
            isBomb: false,
            scorePenalty: 0,
            finalScoreDelta: 0
          };
        } else {
          finalDelta = stealAmount * multiplier + extraPotBonus2;
        }
      } else {
        finalDelta = (tile2.deltaPoints || 35) * multiplier + extraPotBonus2;
      }
      if (getPerkType(state.promoPerk) === "STEAL_5_PROMO" && allTeams && allTeams.length > 0) {
        const promoSteal = calculatePromoSteal5({
          activeTeamId: team.id,
          allTeams
        });
        if (promoSteal.victimTeamId && promoSteal.stolenPoints > 0) {
          victimTeamId = promoSteal.victimTeamId;
          victimTeamName = promoSteal.victimTeamName;
          stolenPoints = (stolenPoints || 0) + promoSteal.stolenPoints;
          finalDelta += promoSteal.stolenPoints;
        }
      }
      state.potPoints = 0;
      state.phase = "TURN_SUMMARY";
      state.turnFinishedReason = "TAROT_DRAWN";
      const oldScore = team.score || 0;
      const newScore = oldScore + finalDelta;
      const baseReward = finalDelta - extraPotBonus2 - (stolenPoints || 0);
      let rewardText = extraPotBonus2 > 0 ? `\u{1F52E} ${tile2.storyTitle}! Nh\u1EADn tr\u1ECDn v\u1EB9n +${baseReward}\u0111 v\xE0 +${extraPotBonus2}\u0111 t\u1EEB Qu\u1EF9 th\u01B0\u1EDFng (T\u1ED5ng +${finalDelta} \u0111i\u1EC3m)!` : `\u{1F52E} ${tile2.storyTitle}! Nh\u1EADn tr\u1ECDn v\u1EB9n +${finalDelta} \u0111i\u1EC3m!`;
      if (stolenPoints && victimTeamName) {
        rewardText += ` (\u{1F5E1}\uFE0F \u0110\u1EA1o T\u1EB7c \u0111\xE1nh c\u1EAFp +${stolenPoints}\u0111 t\u1EEB \u0110\u1ED9i ${victimTeamName}!)`;
      }
      state.storyResult = {
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color || "#ef4444",
        rewardText,
        scoreDelta: finalDelta,
        oldScore,
        newScore
      };
      return {
        updatedState: { ...state },
        isBomb: false,
        scorePenalty: 0,
        finalScoreDelta: finalDelta,
        victimTeamId,
        victimTeamName,
        stolenPoints
      };
    }
  }
  let tile = state.tiles.find((t) => t.id === tileId && !t.isOpened);
  if (!tile) {
    tile = state.tiles.find((t) => !t.isOpened);
  }
  if (!tile) {
    tile = generateNextPushYourLuckCard({
      theme: state.theme,
      drawIndex: state.cardsFlippedCount + 1,
      basePoints: state.baseQuestionPoints || 10,
      teamScore: team.score || 0,
      isDoublePromo: false,
      options: {
        currentRound,
        teams: allTeams,
        currentTeamId: team.id,
        riskTier
      }
    });
    state.tiles.push(tile);
  }
  tile.isOpened = true;
  state.lastFlippedTile = tile;
  state.cardsFlippedCount++;
  if (state.isPenaltySurvivalMode) {
    state.potPoints = 0;
    state.phase = "TURN_SUMMARY";
    const oldScore = team.score || 0;
    const isSafe = tile.type === "ESCAPE_SAFE" || tile.tarotCardKey === "THE_FOOL" || tile.pairKey === "THE_FOOL";
    if (isSafe) {
      state.turnFinishedReason = "SURVIVAL_ESCAPE";
      state.storyResult = {
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color || "#10b981",
        rewardText: `\u{1F54A}\uFE0F ${tile.storyTitle}: ${tile.storyDescription || "Tho\xE1t hi\u1EC3m ngo\u1EA1n m\u1EE5c! B\u1EA3o to\xE0n nguy\xEAn v\u1EB9n \u0111i\u1EC3m s\u1ED1 v\xE0 tim!"}`,
        scoreDelta: 0,
        oldScore,
        newScore: oldScore
      };
      return {
        updatedState: { ...state },
        isBomb: false,
        scorePenalty: 0,
        finalScoreDelta: 0
      };
    }
    const isBomb = tile.type === "BOMB_SMOKE" || tile.type === "BOMB_DARK" || tile.type === "BOMB_CHARITY" || tile.type === "BOMB_MINOR" || tile.type === "BOMB_MAJOR";
    if (isBomb) {
      const bombTypeMapped = tile.type === "BOMB_SMOKE" || tile.type === "BOMB_MINOR" ? "BOMB_SMOKE" : tile.type === "BOMB_DARK" || tile.type === "BOMB_DOOM" ? "BOMB_DARK" : "BOMB_CHARITY";
      const bombOutcome = resolveBombOutcome({
        bombType: bombTypeMapped,
        team,
        allTeams,
        storyDescription: tile.storyDescription,
        baseQuestionPoints: state.baseQuestionPoints,
        isSurvivalPenalty: true
      });
      state.bombExploded = bombOutcome.bombExploded;
      state.turnFinishedReason = "SURVIVAL_FAILED";
      const finalDelta = -bombOutcome.penalty;
      const newScore = Math.max(0, oldScore + finalDelta);
      state.storyResult = {
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color || "#ef4444",
        rewardText: `\u{1F4A5} ${tile.storyTitle}: ${bombOutcome.penaltyText}`,
        scoreDelta: finalDelta,
        oldScore,
        newScore
      };
      return {
        updatedState: { ...state },
        isBomb: true,
        scorePenalty: bombOutcome.penalty,
        finalScoreDelta: finalDelta,
        recipientTeamId: bombOutcome.recipientTeamId,
        giftedPoints: bombOutcome.giftedPoints,
        darkBombRecipients: bombOutcome.darkBombRecipients
      };
    } else {
      const penalty = Math.min(team.score || 0, Math.abs(tile.deltaPoints || state.baseQuestionPoints || 10));
      state.turnFinishedReason = "SURVIVAL_FAILED";
      const finalDelta = -penalty;
      const newScore = Math.max(0, oldScore + finalDelta);
      state.storyResult = {
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color || "#ef4444",
        rewardText: `\u26A0\uFE0F ${tile.storyTitle}: D\xEDnh b\u1EABy ph\u1EA1t sinh t\u1EED (-${penalty}\u0111)!`,
        scoreDelta: finalDelta,
        oldScore,
        newScore
      };
      return {
        updatedState: { ...state },
        isBomb: true,
        scorePenalty: penalty,
        finalScoreDelta: finalDelta
      };
    }
  }
  const isBombCard = tile.type === "BOMB_SMOKE" || tile.type === "BOMB_DARK" || tile.type === "BOMB_CHARITY" || tile.type === "BOMB_MINOR" || tile.type === "BOMB_MAJOR" || tile.type === "BOMB_DOOM";
  if (isBombCard) {
    if (state.hasShield) {
      state.hasShield = false;
      tile.isOpened = true;
      state.cardsFlippedCount = (state.cardsFlippedCount || 0) + 1;
      state.lastFlippedTile = tile;
      const nextTopCard2 = generateNextPushYourLuckCard({
        theme: state.theme,
        drawIndex: state.cardsFlippedCount + 1,
        basePoints: state.baseQuestionPoints || 10,
        teamScore: team.score || 0,
        isDoublePromo: false,
        options: {
          currentRound: state.currentRound,
          teams: allTeams,
          currentTeamId: team.id
        }
      });
      state.tiles.push(nextTopCard2);
      state.nextCardPeek = void 0;
      state.storyResult = {
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color || "#ef4444",
        rewardText: `\u{1F6E1}\uFE0F KHI\xCAN TH\u1EA6N \u0110\xC3 H\u1EA4P TH\u1EE4 V\u1EE4 N\u1ED4! Qu\u1EA3 bom L\xE1 #${tile.id} \u0111\xE3 b\u1ECB v\xF4 hi\u1EC7u h\xF3a an to\xE0n! B\u1EA1n b\u1EA3o to\xE0n \u0111\u01B0\u1EE3c qu\u1EF9 ${state.potPoints}\u0111 v\xE0 c\xF3 th\u1EC3 CH\u1ED0T \u0110I\u1EC2M ngay ho\u1EB7c ti\u1EBFp t\u1EE5c l\u1EADt li\u1EC1u!`,
        scoreDelta: 0,
        oldScore: team.score || 0,
        newScore: team.score || 0
      };
      return {
        updatedState: { ...state },
        isBomb: false,
        scorePenalty: 0,
        finalScoreDelta: 0
      };
    }
    const bombTypeMapped = tile.type === "BOMB_SMOKE" || tile.type === "BOMB_MINOR" ? "BOMB_SMOKE" : tile.type === "BOMB_DARK" || tile.type === "BOMB_DOOM" ? "BOMB_DARK" : "BOMB_CHARITY";
    const bombOutcome = resolveBombOutcome({
      bombType: bombTypeMapped,
      team,
      allTeams,
      storyDescription: tile.storyDescription,
      baseQuestionPoints: state.baseQuestionPoints,
      isSurvivalPenalty: state.isPenaltySurvivalMode
    });
    const penalty = bombOutcome.penalty;
    const penaltyText = bombOutcome.penaltyText;
    const recipientTeamId = bombOutcome.recipientTeamId;
    const giftedPoints = bombOutcome.giftedPoints;
    const darkBombRecipients = bombOutcome.darkBombRecipients;
    state.bombExploded = bombOutcome.bombExploded;
    const hasSafetyNet = getPerkType(state.promoPerk) === "SAFETY_NET_PROMO";
    const savedPotPoints = hasSafetyNet && state.potPoints > 0 ? Math.ceil(state.potPoints * 0.5) : 0;
    const finalDelta = savedPotPoints - penalty;
    state.potPoints = 0;
    state.phase = "TURN_SUMMARY";
    state.turnFinishedReason = state.isPenaltySurvivalMode ? "SURVIVAL_FAILED" : "BOMB_HIT";
    if (!state.consecutiveBombsByTeam) state.consecutiveBombsByTeam = {};
    state.consecutiveBombsByTeam[team.id] = (state.consecutiveBombsByTeam[team.id] || 0) + 1;
    const oldScore = team.score || 0;
    const newScore = Math.max(0, oldScore + finalDelta);
    const safetyNetMsg = savedPotPoints > 0 ? ` \u{1F9F2} K\xE9t S\u1EAFt B\u1EA3o L\u01B0u \u0111\xE3 gi\u1EA3i c\u1EE9u: B\u1EA3o l\u01B0u an to\xE0n +${savedPotPoints}\u0111 t\u1EEB Qu\u1EF9 th\u01B0\u1EDFng!` : "";
    state.storyResult = {
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color || "#ef4444",
      rewardText: `\u{1F4A5} ${tile.storyTitle} ${penaltyText}${safetyNetMsg}`,
      scoreDelta: finalDelta,
      oldScore,
      newScore
    };
    return {
      updatedState: { ...state },
      isBomb: true,
      scorePenalty: penalty,
      finalScoreDelta: finalDelta,
      recipientTeamId,
      giftedPoints,
      darkBombRecipients
    };
  }
  const hasExtraPot = getPerkType(state.promoPerk) === "EXTRA_POT_PROMO";
  const extraPotBonus = hasExtraPot ? 5 : 0;
  if (tile.effectType === "MULTIPLY_X2") {
    const basePts = state.baseQuestionPoints || 20;
    state.potMultiplier = 2;
    state.potPoints = basePts * 2 + extraPotBonus;
  } else if (tile.effectType === "STEAL_POINTS") {
    const stealAmount = tile.deltaPoints || state.baseQuestionPoints || 10;
    const eligibleTeams = (allTeams || []).filter(
      (t) => t.id !== team.id && !t.isEliminated && (t.score || 0) >= stealAmount
    );
    if (eligibleTeams.length > 0) {
      state.phase = "STEAL_TARGET_SELECT";
      state.pendingSteal = {
        stolenPoints: stealAmount,
        eligibleTeamIds: eligibleTeams.map((t) => t.id),
        tileTitle: tile.storyTitle,
        tileIcon: tile.icon
      };
      return {
        updatedState: { ...state },
        isBomb: false,
        scorePenalty: 0,
        finalScoreDelta: 0
      };
    } else {
      state.potPoints = (stealAmount + extraPotBonus) * state.potMultiplier;
    }
  } else {
    state.potPoints = ((tile.deltaPoints || state.baseQuestionPoints || 10) + extraPotBonus) * state.potMultiplier;
  }
  const nextTopCard = generateNextPushYourLuckCard({
    theme: state.theme,
    drawIndex: state.cardsFlippedCount + 1,
    basePoints: state.baseQuestionPoints || 10,
    teamScore: team.score || 0,
    isDoublePromo: false,
    options: {
      currentRound: state.currentRound,
      teams: allTeams,
      currentTeamId: team.id
    }
  });
  state.tiles.push(nextTopCard);
  state.nextCardPeek = void 0;
  return {
    updatedState: { ...state },
    isBomb: false,
    scorePenalty: 0
  };
}
function handleCashOut({
  state,
  team,
  allTeams = []
}) {
  let finalScoreDelta = state.potPoints;
  if (!state.consecutiveBombsByTeam) state.consecutiveBombsByTeam = {};
  state.consecutiveBombsByTeam[team.id] = 0;
  let victimTeamId;
  let victimTeamName;
  let stolenPoints;
  let stealProtectionNote;
  if (state.stolenPointsPot && state.stolenPointsPot > 0 && allTeams.length > 0) {
    if (state.pendingStealVictimId) {
      const chosenVictim = allTeams.find((t) => t.id === state.pendingStealVictimId);
      if (chosenVictim && (chosenVictim.score || 0) > 0) {
        victimTeamId = chosenVictim.id;
        victimTeamName = chosenVictim.name;
        stolenPoints = Math.min(state.stolenPointsPot, chosenVictim.score || 0);
      }
    }
    if (!victimTeamId) {
      const stealCalc = calculateCappedSteal({
        activeTeamId: team.id,
        allTeams,
        targetPoints: state.stolenPointsPot,
        maxCap: 25,
        timesStolenInCycle: state.timesStolenInCycle
      });
      if (stealCalc.victimTeamId && stealCalc.stolenPoints > 0) {
        victimTeamId = stealCalc.victimTeamId;
        victimTeamName = stealCalc.victimTeamName;
        stolenPoints = stealCalc.stolenPoints;
        stealProtectionNote = stealCalc.protectionNote;
      }
    }
  }
  let promoStealDetails;
  if (getPerkType(state.promoPerk) === "STEAL_5_PROMO" && allTeams.length > 0) {
    const promoSteal = calculatePromoSteal5({
      activeTeamId: team.id,
      allTeams,
      timesStolenInCycle: state.timesStolenInCycle
    });
    if (promoSteal.victimTeamId && promoSteal.stolenPoints > 0) {
      promoStealDetails = { victimName: promoSteal.victimTeamName, stolen: promoSteal.stolenPoints };
      finalScoreDelta += promoSteal.stolenPoints;
      if (victimTeamId && victimTeamId === promoSteal.victimTeamId) {
        stolenPoints = (stolenPoints || 0) + promoSteal.stolenPoints;
      } else if (!victimTeamId) {
        victimTeamId = promoSteal.victimTeamId;
        victimTeamName = promoSteal.victimTeamName;
        stolenPoints = promoSteal.stolenPoints;
      }
    }
  }
  if (victimTeamId) {
    if (!state.timesStolenInCycle) state.timesStolenInCycle = {};
    state.timesStolenInCycle[victimTeamId] = (state.timesStolenInCycle[victimTeamId] || 0) + 1;
  }
  const oldScore = team.score || 0;
  const newScore = oldScore + finalScoreDelta;
  state.phase = "TURN_SUMMARY";
  state.turnFinishedReason = "CASH_OUT";
  state.potPoints = 0;
  state.stolenPointsPot = 0;
  let rewardText = `\u{1F4B0} B\u1EA3o to\xE0n th\xE0nh c\xF4ng! Nh\u1EADn tr\u1ECDn v\u1EB9n +${finalScoreDelta} \u0111i\u1EC3m!`;
  if (stealProtectionNote) {
    rewardText = `\u{1F4B0} B\u1EA3o to\xE0n th\xE0nh c\xF4ng! Nh\u1EADn +${finalScoreDelta} \u0111i\u1EC3m (${stealProtectionNote})!`;
  } else if (promoStealDetails && promoStealDetails.stolen > 0) {
    rewardText = `\u{1F4B0} B\u1EA3o to\xE0n th\xE0nh c\xF4ng! Nh\u1EADn tr\u1ECDn v\u1EB9n +${finalScoreDelta} \u0111i\u1EC3m (bao g\u1ED3m \u{1F5E1}\uFE0F \u0110\u1EA1o T\u1EB7c \u0111\xE1nh c\u1EAFp ${promoStealDetails.stolen}\u0111 t\u1EEB \u0110\u1ED9i ${promoStealDetails.victimName})!`;
  } else if (victimTeamName && stolenPoints) {
    rewardText = `\u{1F4B0} B\u1EA3o to\xE0n th\xE0nh c\xF4ng! Nh\u1EADn tr\u1ECDn v\u1EB9n +${finalScoreDelta} \u0111i\u1EC3m (\u0111\xE3 c\u01B0\u1EDBp ${stolenPoints}\u0111 t\u1EEB \u0110\u1ED9i ${victimTeamName})!`;
  }
  state.storyResult = {
    teamId: team.id,
    teamName: team.name,
    teamColor: team.color || "#ef4444",
    rewardText,
    scoreDelta: finalScoreDelta,
    oldScore,
    newScore
  };
  return {
    updatedState: { ...state },
    finalScoreDelta,
    victimTeamId,
    victimTeamName,
    stolenPoints
  };
}
function handleMemoryPairsSecondChanceDecision({
  state,
  team,
  allTeams = [],
  choice
}) {
  const memState = state.memoryPairsState;
  if (!memState || !memState.promptSecondChance) {
    return { updatedState: state, finalScoreDelta: 0 };
  }
  if (choice === "CASH_OUT") {
    const heartsRecord = { ...state.teamHearts || {} };
    const currentHearts = heartsRecord[team.id] ?? state.initialHeartsPerTeam ?? 1;
    if (currentHearts > 0) {
      heartsRecord[team.id] = Math.max(0, currentHearts - 1);
      state.teamHearts = heartsRecord;
    }
    const award = roundToMultipleOfFive((state.baseQuestionPoints || 10) * 0.5);
    state.phase = "TURN_SUMMARY";
    state.turnFinishedReason = "PAIR_MATCHED";
    state.potPoints = 0;
    memState.promptSecondChance = false;
    state.memoryPairsState = { ...memState };
    const oldScore = team.score || 0;
    const newScore = oldScore + award;
    const remainingHearts = state.teamHearts?.[team.id] ?? 0;
    state.storyResult = {
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color || "#ef4444",
      rewardText: `\u{1F6E1}\uFE0F D\u1EEBng l\u1EA1i an to\xE0n! Ti\xEAu hao 1 \u2764\uFE0F \u0111\u1EC3 nh\u1EADn 50% \u0111i\u1EC3m c\xE2u h\u1ECFi (+${award}\u0111, C\xF2n ${remainingHearts} \u2764\uFE0F)!`,
      scoreDelta: award,
      oldScore,
      newScore
    };
    return {
      updatedState: { ...state },
      finalScoreDelta: award
    };
  } else {
    const preservedShield = Boolean(state.hasShield);
    memState.round = 2;
    memState.maxAttempts = getPerkType(state.promoPerk) === "EXTRA_ATTEMPT_PROMO" ? 6 : 5;
    memState.attemptsUsed = 0;
    memState.promptSecondChance = false;
    memState.firstFlippedTileId = null;
    memState.secondFlippedTileId = null;
    memState.thirdFlippedTileId = null;
    memState.keptBombTileIds = [];
    memState.faceUpPenaltyTileIds = [];
    memState.attemptedPairs = [];
    memState.isBombRescueActive = false;
    memState.activePenaltyPairKey = null;
    memState.isMismatchResolving = false;
    memState.matchedPairKey = null;
    const basePts = state.baseQuestionPoints || 20;
    const consecutiveBombs = state.consecutiveBombsByTeam?.[team.id] ?? 0;
    const riskTier = evaluateTeamRiskTier({
      team,
      allTeams,
      consecutiveBombs,
      currentRound: 2
    });
    state.tiles = generateMemoryPairsTiles(basePts, {
      currentRound: 2,
      teams: allTeams,
      currentTeamId: team.id,
      riskTier
    });
    state.hasShield = preservedShield;
    state.memoryPairsState = { ...memState };
    return {
      updatedState: { ...state },
      finalScoreDelta: 0
    };
  }
}
function handleChooseStealTarget({
  state,
  targetTeamId,
  allTeams = []
}) {
  const pending = state.pendingSteal;
  const targetTeam = (allTeams || []).find((t) => t.id === targetTeamId);
  const activeTeam = (allTeams || []).find((t) => t.id === state.currentTurnTeamId);
  const rawStolenPoints = pending?.stolenPoints || 20;
  const victimTeamId = targetTeam?.id;
  const victimTeamName = targetTeam?.name || "\u0110\u1ED1i th\u1EE7";
  const hasExtraPot = getPerkType(state.promoPerk) === "EXTRA_POT_PROMO";
  const extraPotBonus = hasExtraPot ? 5 : 0;
  if (!state.timesStolenInCycle) state.timesStolenInCycle = {};
  const timesStolen = victimTeamId ? state.timesStolenInCycle[victimTeamId] || 0 : 0;
  let stolenPoints = rawStolenPoints;
  let isHalfProtected = false;
  const curTurn = state.currentTurnIndex || 0;
  const victimShield = victimTeamId ? state.teamShields?.[victimTeamId] : void 0;
  const isEmperorShieldActive = Boolean(
    victimShield && curTurn >= victimShield.activeFromTurnIndex && curTurn <= victimShield.expiresAfterTurnIndex
  );
  if (isEmperorShieldActive && victimTeamId) {
    if (state.teamShields) {
      delete state.teamShields[victimTeamId];
    }
    stolenPoints = 0;
  } else if (victimTeamId && timesStolen === 1) {
    stolenPoints = Math.max(5, roundToMultipleOfFive(rawStolenPoints * 0.5));
    isHalfProtected = true;
  }
  if (victimTeamId) {
    state.timesStolenInCycle[victimTeamId] = timesStolen + 1;
  }
  const protectionNote = isEmperorShieldActive ? ` (\u{1F6E1}\uFE0F KHI\xCAN HO\xC0NG \u0110\u1EBE: \u0110\u1ED9i ${victimTeamName} \u0111\xE3 k\xEDch ho\u1EA1t Khi\xEAn Th\u1EA7n ch\u1EB7n \u0111\u1EE9ng v\u1EE5 c\u01B0\u1EDBp \u0111i\u1EC3m, 0\u0111 m\u1EA5t m\xE1t!)` : isHalfProtected ? ` (Khi\xEAn Ch\u1ED1ng V\u1EAFt Ki\u1EC7t: \u0110\u1ED9i ${victimTeamName} \u0111\xE3 b\u1ECB c\u01B0\u1EDBp l\u1EA7n 2 trong v\xF2ng, ch\u1EC9 b\u1ECB tr\u1EEB 50%!)` : "";
  if (state.miniGameType === "PUSH_YOUR_LUCK") {
    const totalPotFromSteal = (stolenPoints + extraPotBonus) * state.potMultiplier;
    state.phase = "PUSH_YOUR_LUCK";
    state.pendingSteal = void 0;
    state.potPoints = totalPotFromSteal;
    state.stolenPointsPot = stolenPoints * state.potMultiplier;
    state.pendingStealVictimId = victimTeamId;
    state.pendingStealVictimName = victimTeamName;
    state.storyResult = {
      teamId: state.currentTurnTeamId,
      teamName: state.currentTurnTeamName,
      teamColor: state.currentTurnTeamColor,
      rewardText: extraPotBonus > 0 ? `\u{1F5E1}\uFE0F \u0110\xE3 nh\u1EAFm \u0110\u1ED9i ${victimTeamName}! N\u1EA1p +${stolenPoints}\u0111 c\u01B0\u1EDBp${protectionNote} v\xE0 +${extraPotBonus}\u0111 t\u1EEB Qu\u1EF9 th\u01B0\u1EDFng v\xE0o qu\u1EF9 \u0111i\u1EC3m (T\u1ED5ng +${totalPotFromSteal}\u0111)!` : `\u{1F5E1}\uFE0F \u0110\xE3 nh\u1EAFm \u0110\u1ED9i ${victimTeamName}! N\u1EA1p +${totalPotFromSteal} \u0111i\u1EC3m c\u01B0\u1EDBp${protectionNote} v\xE0o qu\u1EF9 \u0111i\u1EC3m!`,
      scoreDelta: 0,
      oldScore: activeTeam?.score || 0,
      newScore: activeTeam?.score || 0
    };
    return {
      updatedState: { ...state },
      victimTeamId,
      victimTeamName,
      stolenPoints,
      finalScoreDelta: 0
    };
  }
  state.phase = "TURN_SUMMARY";
  state.turnFinishedReason = state.miniGameType === "TAROT_DESTINY" ? "TAROT_DRAWN" : state.miniGameType === "ONE_SHOT_DOORS" ? "DOOR_CHOSEN" : "PAIR_MATCHED";
  state.pendingSteal = void 0;
  state.potPoints = 0;
  const finalScoreDelta = stolenPoints + extraPotBonus;
  const oldScore = activeTeam?.score || 0;
  const newScore = oldScore + finalScoreDelta;
  const rewardText = extraPotBonus > 0 ? `\u{1F5E1}\uFE0F C\u01B0\u1EDBp th\xE0nh c\xF4ng! \u0110\xE3 chuy\u1EC3n +${stolenPoints} \u0111i\u1EC3m t\u1EEB \u0110\u1ED9i ${victimTeamName}${protectionNote} v\xE0 nh\u1EADn th\xEAm +${extraPotBonus}\u0111 t\u1EEB Qu\u1EF9 th\u01B0\u1EDFng (+${finalScoreDelta} \u0111i\u1EC3m cho \u0110\u1ED9i ${state.currentTurnTeamName})!` : `\u{1F5E1}\uFE0F C\u01B0\u1EDBp th\xE0nh c\xF4ng! \u0110\xE3 chuy\u1EC3n +${stolenPoints} \u0111i\u1EC3m t\u1EEB \u0110\u1ED9i ${victimTeamName}${protectionNote} sang \u0110\u1ED9i ${state.currentTurnTeamName}!`;
  state.storyResult = {
    teamId: state.currentTurnTeamId,
    teamName: state.currentTurnTeamName,
    teamColor: state.currentTurnTeamColor,
    rewardText,
    scoreDelta: finalScoreDelta,
    oldScore,
    newScore
  };
  return {
    updatedState: { ...state },
    victimTeamId,
    victimTeamName,
    stolenPoints,
    finalScoreDelta
  };
}
function handleOneShotDoorsDecision({
  state,
  team,
  allTeams = [],
  decision,
  chosenDoorId,
  swapRemovedDoorId,
  swapAddedDoorId
}) {
  const osState = state.oneShotState || {
    selectedDoorIds: [],
    hasBombDetected: false,
    phase: "SELECTING",
    revealedSafeDoorIds: [],
    chosenFinalDoorId: void 0,
    allRevealed: false,
    discardedDoorIds: []
  };
  state.oneShotState = osState;
  const currentRound = state.currentRound || 1;
  const consecutiveBombs = state.consecutiveBombsByTeam?.[team.id] ?? 0;
  const riskTier = evaluateTeamRiskTier({
    team,
    allTeams,
    consecutiveBombs,
    currentRound
  });
  const hasExtraPot = getPerkType(state.promoPerk) === "EXTRA_POT_PROMO";
  const extraPotBonus = hasExtraPot ? 5 : 0;
  const multiplier = state.potMultiplier || 1;
  if (decision === "TAKE_100_BASE") {
    const heartsRecord = { ...state.teamHearts || {} };
    const currentHearts = heartsRecord[team.id] ?? state.initialHeartsPerTeam ?? 1;
    if (currentHearts > 0) {
      heartsRecord[team.id] = Math.max(0, currentHearts - 1);
      state.teamHearts = heartsRecord;
    }
    osState.phase = "RESOLVED";
    osState.allRevealed = true;
    state.tiles.forEach((t) => {
      t.isOpened = true;
    });
    const finalDelta = (state.baseQuestionPoints || 10) + extraPotBonus;
    state.potPoints = 0;
    state.phase = "TURN_SUMMARY";
    state.turnFinishedReason = "TOOK_BASE_POINTS";
    const oldScore = team.score || 0;
    const newScore = oldScore + finalDelta;
    const remainingHearts = state.teamHearts?.[team.id] ?? 0;
    const rewardText = extraPotBonus > 0 ? `\u{1F6E1}\uFE0F Ch\u1ED1t nh\u1EADn an to\xE0n! Ti\xEAu hao 1 \u2764\uFE0F \u0111\u1EC3 nh\u1EADn tr\u1ECDn v\u1EB9n 100% \u0111i\u1EC3m g\u1ED1c (+${state.baseQuestionPoints || 10}\u0111) v\xE0 +${extraPotBonus}\u0111 Qu\u1EF9 th\u01B0\u1EDFng (T\u1ED5ng +${finalDelta} \u0111i\u1EC3m, c\xF2n ${remainingHearts} \u2764\uFE0F)!` : `\u{1F6E1}\uFE0F Ch\u1ED1t nh\u1EADn an to\xE0n! Ti\xEAu hao 1 \u2764\uFE0F \u0111\u1EC3 nh\u1EADn tr\u1ECDn v\u1EB9n 100% \u0111i\u1EC3m g\u1ED1c c\xE2u h\u1ECFi (+${finalDelta} \u0111i\u1EC3m, c\xF2n ${remainingHearts} \u2764\uFE0F)!`;
    state.storyResult = {
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color || "#ef4444",
      rewardText,
      scoreDelta: finalDelta,
      oldScore,
      newScore
    };
    return {
      updatedState: { ...state },
      finalScoreDelta: finalDelta,
      isBomb: false,
      scorePenalty: 0
    };
  }
  if (decision === "PROCEED_TO_SELECT_2") {
    osState.phase = "SELECT_2";
    osState.selectedDoorIds = [];
    return {
      updatedState: { ...state },
      finalScoreDelta: 0,
      isBomb: false,
      scorePenalty: 0
    };
  }
  if (decision === "SWAP_DOOR") {
    if (osState.hasSwapped) {
      return { updatedState: state, finalScoreDelta: 0, isBomb: false, scorePenalty: 0 };
    }
    const currentSelected = [...osState.selectedDoorIds || []];
    const currentDiscarded = [...osState.discardedDoorIds || []];
    if (swapRemovedDoorId && swapAddedDoorId) {
      const newSelected = currentSelected.filter((id) => id !== swapRemovedDoorId).concat(swapAddedDoorId);
      const newDiscarded = currentDiscarded.filter((id) => id !== swapAddedDoorId).concat(swapRemovedDoorId);
      osState.selectedDoorIds = newSelected;
      osState.discardedDoorIds = newDiscarded;
      osState.hasSwapped = true;
      osState.swapRemovedDoorId = swapRemovedDoorId;
      osState.swapAddedDoorId = swapAddedDoorId;
      osState.penaltyDoorsCount = void 0;
      osState.hasBombDetected = false;
      osState.phase = "OPEN_FINAL";
    }
    return {
      updatedState: { ...state },
      finalScoreDelta: 0,
      isBomb: false,
      scorePenalty: 0
    };
  }
  if (decision === "TAKE_BASE_MINUS_HEART" || decision === "SAFE_EXIT") {
    const heartsRecord = { ...state.teamHearts || {} };
    const currentHearts = heartsRecord[team.id] ?? state.initialHeartsPerTeam ?? 1;
    if (currentHearts > 0) {
      heartsRecord[team.id] = Math.max(0, currentHearts - 1);
      state.teamHearts = heartsRecord;
    }
    osState.phase = "RESOLVED";
    osState.allRevealed = true;
    osState.isBasePointsWithMinusHeart = true;
    state.tiles.forEach((t) => {
      t.isOpened = true;
    });
    const halfBase = roundToMultipleOfFive((state.baseQuestionPoints || 10) * 0.5);
    const finalDelta = halfBase + extraPotBonus;
    state.potPoints = 0;
    state.phase = "TURN_SUMMARY";
    state.turnFinishedReason = "TOOK_BASE_POINTS";
    const oldScore = team.score || 0;
    const newScore = oldScore + finalDelta;
    const remainingHearts = state.teamHearts?.[team.id] ?? 0;
    const rewardText = extraPotBonus > 0 ? `\u{1F6E1}\uFE0F R\xFAt lui an to\xE0n! Ch\u1EA5p nh\u1EADn ti\xEAu hao 1 \u2764\uFE0F \u0111\u1EC3 nh\u1EADn 50% \u0111i\u1EC3m g\u1ED1c (+${halfBase}\u0111) v\xE0 +${extraPotBonus}\u0111 Qu\u1EF9 th\u01B0\u1EDFng (T\u1ED5ng +${finalDelta} \u0111i\u1EC3m, c\xF2n ${remainingHearts} \u2764\uFE0F)!` : `\u{1F6E1}\uFE0F R\xFAt lui an to\xE0n! Ch\u1EA5p nh\u1EADn ti\xEAu hao 1 \u2764\uFE0F \u0111\u1EC3 nh\u1EADn 50% \u0111i\u1EC3m g\u1ED1c c\xE2u h\u1ECFi (+${finalDelta} \u0111i\u1EC3m, c\xF2n ${remainingHearts} \u2764\uFE0F)!`;
    state.storyResult = {
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color || "#ef4444",
      rewardText,
      scoreDelta: finalDelta,
      oldScore,
      newScore
    };
    return {
      updatedState: { ...state },
      finalScoreDelta: finalDelta,
      isBomb: false,
      scorePenalty: 0
    };
  }
  if (decision === "RISK_OPEN" && !chosenDoorId && (osState.phase === "FINAL_DECISION" || osState.phase === "PENALTY_DECISION")) {
    osState.phase = "OPEN_FINAL";
    return {
      updatedState: { ...state },
      finalScoreDelta: 0,
      isBomb: false,
      scorePenalty: 0
    };
  }
  const doorIdToOpen = chosenDoorId ?? (osState.selectedDoorIds && osState.selectedDoorIds[0]);
  const chosenTile = state.tiles.find((t) => t.id === doorIdToOpen);
  if (!chosenTile) {
    return { updatedState: state, finalScoreDelta: 0, isBomb: false, scorePenalty: 0 };
  }
  osState.phase = "RESOLVED";
  osState.allRevealed = true;
  osState.chosenFinalDoorId = doorIdToOpen;
  state.tiles.forEach((t) => {
    t.isOpened = true;
  });
  const isDoorNegative = (t) => {
    if (t.tarotCardKey === "THE_FOOL") return false;
    if (t.tarotCardKey === "THE_TOWER" || t.tarotCardKey === "THE_KNIGHT" || t.tarotCardKey === "THE_DEVIL" || t.tarotCardKey === "THE_HANGED_MAN") return true;
    if (t.type !== "REWARD" && t.type !== "ESCAPE_SAFE") return true;
    if (t.deltaPoints && t.deltaPoints < 0) return true;
    if (t.bombDoorType) return true;
    return false;
  };
  const isNegative = isDoorNegative(chosenTile);
  if (isNegative) {
    if (state.hasShield && !state.isPenaltySurvivalMode) {
      state.hasShield = false;
      chosenTile.isOpened = true;
      if (osState.selectedDoorIds) {
        osState.selectedDoorIds = osState.selectedDoorIds.filter((id) => id !== doorIdToOpen);
      }
      osState.chosenFinalDoorId = void 0;
      osState.phase = "OPEN_FINAL";
      osState.allRevealed = false;
      state.tiles.forEach((t) => {
        if (t.id !== doorIdToOpen) t.isOpened = false;
      });
      state.storyResult = {
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color || "#ef4444",
        rewardText: `\u{1F6E1}\uFE0F KHI\xCAN TH\u1EA6N \u0110\xC3 H\u1EA4P TH\u1EE4 B\u1EAAY PH\u1EA0T! C\u1EEDa b\u1EABy #${doorIdToOpen} \u0111\xE3 b\u1ECB v\xF4 hi\u1EC7u h\xF3a an to\xE0n (0\u0111 ph\u1EA1t). \u0110\u1ED9i b\u1EA1n \u0111\u01B0\u1EE3c ch\u1ECDn l\u1EA1i c\xE1nh c\u1EEDa c\xF2n l\u1EA1i!`,
        scoreDelta: 0,
        oldScore: team.score || 0,
        newScore: team.score || 0
      };
      return {
        updatedState: { ...state },
        isBomb: false,
        scorePenalty: 0,
        finalScoreDelta: 0
      };
    }
    const isRandomBomb = chosenTile.type === "BOMB_MAJOR" || Boolean(chosenTile.bombDoorType) || chosenTile.tarotCardKey === "THE_DEVIL" || chosenTile.tarotCardKey === "THE_HANGED_MAN" || chosenTile.tarotCardKey === "THE_KNIGHT";
    if (isRandomBomb) {
      let bombType = "BOMB_DARK";
      if (chosenTile.tarotCardKey === "THE_KNIGHT" || chosenTile.type === "BOMB_SMOKE") bombType = "BOMB_SMOKE";
      else if (chosenTile.tarotCardKey === "THE_HANGED_MAN" || chosenTile.type === "BOMB_CHARITY") bombType = "BOMB_CHARITY";
      else if (chosenTile.tarotCardKey === "THE_DEVIL" || chosenTile.type === "BOMB_DARK") bombType = "BOMB_DARK";
      else bombType = chosenTile.bombDoorType || rollBombTypeForMinigame("ONE_SHOT_DOORS", team.score || 0, { currentRound, riskTier });
      const outcome = resolveBombOutcome({
        bombType,
        team,
        allTeams,
        storyDescription: chosenTile.storyDescription || "M\u1EDF tr\xFAng C\u1EEDa B\u1EABy Bom!",
        baseQuestionPoints: state.baseQuestionPoints,
        isSurvivalPenalty: state.isPenaltySurvivalMode
      });
      state.potPoints = 0;
      state.bombExploded = outcome.bombExploded;
      state.phase = "TURN_SUMMARY";
      state.turnFinishedReason = state.isPenaltySurvivalMode ? "SURVIVAL_FAILED" : "BOMB_HIT";
      const oldScore = team.score || 0;
      const newScore = Math.max(0, oldScore - outcome.penalty);
      state.storyResult = {
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color || "#ef4444",
        rewardText: `\u{1F4A5} R\u1EE7i ro b\u1EA5t th\xE0nh! ${outcome.bombExploded.title}: ${outcome.penaltyText}`,
        scoreDelta: -outcome.penalty,
        oldScore,
        newScore
      };
      return {
        updatedState: { ...state },
        isBomb: true,
        scorePenalty: outcome.penalty,
        finalScoreDelta: -outcome.penalty,
        recipientTeamId: outcome.recipientTeamId,
        recipientTeamName: outcome.recipientTeamName,
        giftedPoints: outcome.giftedPoints,
        darkBombRecipients: outcome.darkBombRecipients
      };
    } else {
      const penalty = riskTier === "UNDERDOG" ? 0 : Math.abs(chosenTile.deltaPoints || state.baseQuestionPoints || 10);
      state.potPoints = 0;
      state.bombExploded = {
        type: penalty === 0 ? "SMOKE" : "MINOR",
        title: chosenTile.storyTitle,
        description: chosenTile.storyDescription,
        penaltyText: penalty === 0 ? "May m\u1EAFn n\xE9 ph\u1EA1t! \u0110i\u1EC3m s\u1ED1 \u0111\u01B0\u1EE3c b\u1EA3o to\xE0n nguy\xEAn v\u1EB9n." : `M\u1EDF tr\xFAng C\u1EEDa B\u1EABy Th\xE1p! B\u1ECB tr\u1EEB ${penalty} \u0111i\u1EC3m t\u1EEB t\u1ED5ng \u0111i\u1EC3m.`
      };
      state.phase = "TURN_SUMMARY";
      state.turnFinishedReason = "BOMB_HIT";
      const oldScore = team.score || 0;
      const newScore = Math.max(0, oldScore - penalty);
      state.storyResult = {
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color || "#ef4444",
        rewardText: penalty === 0 ? "\u{1F4A8} M\u1EDF tr\xFAng C\u1EEDa Th\xE1p nh\u01B0ng \u0111\u1ED9i y\u1EBFu th\u1EBF n\xE9 b\u1EABy ph\u1EA1t th\xE0nh c\xF4ng, b\u1EA3o to\xE0n t\u1ED5ng \u0111i\u1EC3m (0\u0111)!" : `\u{1F4A5} M\u1EDF tr\xFAng C\u1EEDa B\u1EABy Th\xE1p! B\u1ECB tr\u1EEB -${penalty} \u0111i\u1EC3m!`,
        scoreDelta: -penalty,
        oldScore,
        newScore
      };
      return {
        updatedState: { ...state },
        isBomb: true,
        scorePenalty: penalty,
        finalScoreDelta: -penalty
      };
    }
  } else {
    if (chosenTile.givesShield) {
      state.hasShield = true;
      const teamsCount = Math.max(1, allTeams?.length || 2);
      const curTurn = state.currentTurnIndex || 0;
      state.teamShields = {
        ...state.teamShields || {},
        [team.id]: {
          activeFromTurnIndex: curTurn + 1,
          expiresAfterTurnIndex: curTurn + teamsCount,
          sourceCard: "THE_EMPEROR"
        }
      };
    }
    let chosenTileHeartMaxed = false;
    if (chosenTile.givesHeart) {
      const heartsRecord = { ...state.teamHearts || {} };
      const maxHearts = state.initialHeartsPerTeam ?? 3;
      const curHearts = heartsRecord[team.id] ?? state.initialHeartsPerTeam ?? 1;
      if (curHearts < maxHearts) {
        heartsRecord[team.id] = curHearts + 1;
        state.teamHearts = heartsRecord;
      } else {
        chosenTileHeartMaxed = true;
      }
    }
    let temperanceBonusRecipients;
    if (chosenTile.tarotCardKey === "TEMPERANCE") {
      const pHalf = roundToMultipleOfFive((state.baseQuestionPoints || 10) * 0.5);
      const otherTeams = (allTeams || []).filter((t) => t.id !== team.id && !t.isEliminated);
      if (otherTeams.length > 0) {
        temperanceBonusRecipients = otherTeams.map((t) => ({
          teamId: t.id,
          teamName: t.name,
          points: pHalf
        }));
      }
    }
    let victimTeamId;
    let victimTeamName;
    let stolenPoints;
    let finalDelta = 0;
    if (chosenTile.effectType === "STEAL_POINTS") {
      const stealAmount = chosenTile.deltaPoints || state.baseQuestionPoints || 10;
      const eligibleTeams = (allTeams || []).filter(
        (t) => t.id !== team.id && !t.isEliminated && (t.score || 0) >= stealAmount
      );
      if (eligibleTeams.length > 0) {
        state.phase = "STEAL_TARGET_SELECT";
        state.pendingSteal = {
          stolenPoints: stealAmount,
          eligibleTeamIds: eligibleTeams.map((t) => t.id),
          tileTitle: chosenTile.storyTitle,
          tileIcon: chosenTile.icon
        };
        return {
          updatedState: { ...state },
          isBomb: false,
          scorePenalty: 0,
          finalScoreDelta: 0
        };
      } else {
        finalDelta = stealAmount * multiplier + extraPotBonus;
      }
    } else {
      const baseReward = chosenTile.tarotCardKey === "THE_FOOL" ? 0 : chosenTile.deltaPoints ?? (state.baseQuestionPoints || 10);
      finalDelta = chosenTile.tarotCardKey === "THE_FOOL" ? 0 : baseReward * multiplier + extraPotBonus;
    }
    if (getPerkType(state.promoPerk) === "STEAL_5_PROMO" && allTeams && allTeams.length > 0) {
      const promoSteal = calculatePromoSteal5({
        activeTeamId: team.id,
        allTeams
      });
      if (promoSteal.victimTeamId && promoSteal.stolenPoints > 0) {
        victimTeamId = promoSteal.victimTeamId;
        victimTeamName = promoSteal.victimTeamName;
        stolenPoints = (stolenPoints || 0) + promoSteal.stolenPoints;
        finalDelta += promoSteal.stolenPoints;
      }
    }
    state.potPoints = 0;
    state.phase = "TURN_SUMMARY";
    state.turnFinishedReason = "DOOR_CHOSEN";
    const oldScore = team.score || 0;
    const newScore = oldScore + finalDelta;
    let rewardText = chosenTile.tarotCardKey === "THE_FOOL" ? `\u{1F0CF} M\u1EDF tr\xFAng C\u1EEDa K\u1EBB Kh\u1EDD (\xB10\u0111): Th\u1EBF tr\u1EADn \u0111\u01B0\u1EE3c b\u1EA3o to\xE0n an to\xE0n tuy\u1EC7t \u0111\u1ED1i!` : `\u{1F389} \u0110O\xC1N \u0110\xDANG XU\u1EA4T S\u1EAEC! M\u1EDF tr\xFAng c\xE1nh c\u1EEDa an to\xE0n #${chosenTile.id}: Nh\u1EADn tr\u1ECDn v\u1EB9n +${finalDelta} \u0111i\u1EC3m!`;
    if (chosenTile.tarotCardKey === "TEMPERANCE" && temperanceBonusRecipients && temperanceBonusRecipients.length > 0) {
      const pHalf = roundToMultipleOfFive((state.baseQuestionPoints || 10) * 0.5);
      rewardText += ` (\u2696\uFE0F Ti\u1EBFt \u0110\u1ED9 dung h\u1EE3p: Ban ph\u01B0\u1EDBc chia s\u1EBB +${pHalf}\u0111 cho t\u1EA5t c\u1EA3 \u0111\u1ED1i th\u1EE7 c\xF2n l\u1EA1i!)`;
    }
    if (chosenTileHeartMaxed) {
      rewardText += ` (\u2764\uFE0F \u0110\xE3 \u0111\u1EA1t t\u1ED1i \u0111a ${state.initialHeartsPerTeam ?? 3} tim - kh\xF4ng h\u1ED3i th\xEAm)`;
    }
    if (stolenPoints && victimTeamName) {
      rewardText += ` (\u{1F5E1}\uFE0F \u0110\u1EA1o T\u1EB7c \u0111\xE1nh c\u1EAFp +${stolenPoints}\u0111 t\u1EEB \u0110\u1ED9i ${victimTeamName}!)`;
    }
    state.storyResult = {
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color || "#ef4444",
      rewardText,
      scoreDelta: finalDelta,
      oldScore,
      newScore
    };
    return {
      updatedState: { ...state },
      isBomb: false,
      scorePenalty: 0,
      finalScoreDelta: finalDelta,
      victimTeamId,
      victimTeamName,
      stolenPoints,
      temperanceBonusRecipients
    };
  }
}
var MAJOR_ARCANA_WHEEL_SEGMENTS = [
  { index: 0, key: "THE_FOOL", nameVi: "K\u1EBB Kh\u1EDD", nameEn: "The Fool", icon: "\u{1F0CF}", roman: "0", group: "COMMON", bgColor: "#070510", borderColor: "#b45309", textColor: "#fde68a" },
  { index: 1, key: "THE_MAGICIAN", nameVi: "Ph\xE1p S\u01B0", nameEn: "The Magician", icon: "\u{1FA84}", roman: "I", group: "COMMON", bgColor: "#110926", borderColor: "#6d28d9", textColor: "#e0e7ff" },
  { index: 2, key: "THE_HIGH_PRIESTESS", nameVi: "N\u1EEF T\u01B0 T\u1EBF", nameEn: "The High Priestess", icon: "\u{1F319}", roman: "II", group: "COMMON", bgColor: "#0b1124", borderColor: "#4338ca", textColor: "#f5d0fe" },
  { index: 3, key: "THE_EMPRESS", nameVi: "N\u1EEF Ho\xE0ng", nameEn: "The Empress", icon: "\u{1F338}", roman: "III", group: "COMMON", bgColor: "#070510", borderColor: "#b45309", textColor: "#fde68a" },
  { index: 4, key: "THE_EMPEROR", nameVi: "Ho\xE0ng \u0110\u1EBF", nameEn: "The Emperor", icon: "\u{1F451}", roman: "IV", group: "COMMON", bgColor: "#110926", borderColor: "#6d28d9", textColor: "#e0e7ff" },
  { index: 5, key: "THE_HIEROPHANT", nameVi: "Gi\xE1o Ho\xE0ng", nameEn: "The Hierophant", icon: "\u26EA", roman: "V", group: "COMMON", bgColor: "#0b1124", borderColor: "#4338ca", textColor: "#f5d0fe" },
  { index: 6, key: "THE_LOVERS", nameVi: "Ng\u01B0\u1EDDi T\xECnh", nameEn: "The Lovers", icon: "\u{1F49E}", roman: "VI", group: "COMMON", bgColor: "#070510", borderColor: "#b45309", textColor: "#fde68a" },
  { index: 7, key: "THE_CHARIOT", nameVi: "Chi\u1EBFn Xa", nameEn: "The Chariot", icon: "\u{1F3C7}", roman: "VII", group: "CRITICAL", deathSubtype: "STEAL_TOP1", bgColor: "#110926", borderColor: "#6d28d9", textColor: "#e0e7ff" },
  { index: 8, key: "STRENGTH", nameVi: "S\u1EE9c M\u1EA1nh", nameEn: "Strength", icon: "\u{1F4AA}", roman: "VIII", group: "COMMON", bgColor: "#0b1124", borderColor: "#4338ca", textColor: "#f5d0fe" },
  { index: 9, key: "THE_HERMIT", nameVi: "\u1EA8n S\u0129", nameEn: "The Hermit", icon: "\u{1F526}", roman: "IX", group: "COMMON", bgColor: "#070510", borderColor: "#b45309", textColor: "#fde68a" },
  { index: 10, key: "WHEEL_OF_FORTUNE", nameVi: "B\xE1nh Xe V\u1EADn M\u1EC7nh", nameEn: "Wheel of Fortune", icon: "\u{1F3A1}", roman: "X", group: "COMMON", bgColor: "#110926", borderColor: "#6d28d9", textColor: "#e0e7ff" },
  { index: 11, key: "JUSTICE", nameVi: "C\xF4ng L\xFD", nameEn: "Justice", icon: "\u2696\uFE0F", roman: "XI", group: "COMMON", bgColor: "#0b1124", borderColor: "#4338ca", textColor: "#f5d0fe" },
  { index: 12, key: "THE_HANGED_MAN", nameVi: "Ng\u01B0\u1EDDi Treo Ng\u01B0\u1EE3c", nameEn: "The Hanged Man", icon: "\u{1F643}", roman: "XII", group: "CRITICAL", deathSubtype: "GIFT_TOP1", bgColor: "#070510", borderColor: "#b45309", textColor: "#fde68a" },
  { index: 13, key: "THE_DEATH", nameVi: "Th\u1EA7n Ch\u1EBFt", nameEn: "Death", icon: "\u{1F480}", roman: "XIII", group: "CRITICAL", deathSubtype: "STEAL_TOP1", bgColor: "#110926", borderColor: "#6d28d9", textColor: "#e0e7ff" },
  { index: 14, key: "TEMPERANCE", nameVi: "\u0110i\u1EC1u \u0110\u1ED9", nameEn: "Temperance", icon: "\u{1F3FA}", roman: "XIV", group: "COMMON", bgColor: "#0b1124", borderColor: "#4338ca", textColor: "#f5d0fe" },
  { index: 15, key: "THE_DEVIL", nameVi: "\xC1c Qu\u1EF7", nameEn: "The Devil", icon: "\u{1F608}", roman: "XV", group: "MUTATION", bgColor: "#070510", borderColor: "#b45309", textColor: "#fde68a" },
  { index: 16, key: "THE_TOWER", nameVi: "Th\xE1p S\xE9t", nameEn: "The Tower", icon: "\u26A1", roman: "XVI", group: "MUTATION", bgColor: "#110926", borderColor: "#6d28d9", textColor: "#e0e7ff" },
  { index: 17, key: "THE_STAR", nameVi: "Ng\xF4i Sao", nameEn: "The Star", icon: "\u2B50", roman: "XVII", group: "MUTATION", bgColor: "#0b1124", borderColor: "#4338ca", textColor: "#f5d0fe" },
  { index: 18, key: "THE_MOON", nameVi: "M\u1EB7t Tr\u0103ng", nameEn: "The Moon", icon: "\u{1F311}", roman: "XVIII", group: "MUTATION", bgColor: "#070510", borderColor: "#b45309", textColor: "#fde68a" },
  { index: 19, key: "THE_SUN", nameVi: "M\u1EB7t Tr\u1EDDi", nameEn: "The Sun", icon: "\u2600\uFE0F", roman: "XIX", group: "COMMON", bgColor: "#110926", borderColor: "#6d28d9", textColor: "#fde68a" },
  { index: 20, key: "JUDGEMENT", nameVi: "Ph\xE1n Quy\u1EBFt", nameEn: "Judgement", icon: "\u{1F4EF}", roman: "XX", group: "COMMON", bgColor: "#0b1124", borderColor: "#4338ca", textColor: "#e0e7ff" },
  { index: 21, key: "THE_WORLD", nameVi: "Th\u1EBF Gi\u1EDBi", nameEn: "The World", icon: "\u{1F30D}", roman: "XXI", group: "COMMON", bgColor: "#110926", borderColor: "#b45309", textColor: "#f5d0fe" }
];
var TAROT_SURVIVAL_WHEEL_SEGMENTS = [
  { index: 0, key: "THE_PEACE", nameVi: "B\xECnh Y\xEAn Tho\xE1t N\u1EA1n", nameEn: "The Peace", icon: "\u{1F54A}\uFE0F", roman: "XXI", group: "COMMON", bgColor: "#070510", borderColor: "#b45309", textColor: "#fde68a" },
  { index: 1, key: "THE_KNIGHT", nameVi: "Hi\u1EC7p S\u0129 (The Knight)", nameEn: "The Knight", icon: "\u{1F5E1}\uFE0F", roman: "VII", group: "MUTATION", bgColor: "#110926", borderColor: "#6d28d9", textColor: "#e0e7ff" },
  { index: 2, key: "THE_EMPEROR", nameVi: "Ho\xE0ng \u0110\u1EBF (The Emperor)", nameEn: "The Emperor", icon: "\u{1F451}", roman: "IV", group: "MUTATION", bgColor: "#0b1124", borderColor: "#4338ca", textColor: "#f5d0fe" },
  { index: 3, key: "THE_DEATH", nameVi: "Th\u1EA7n Ch\u1EBFt (T\u1EB7ng \u0110i\u1EC3m)", nameEn: "Death", icon: "\u{1F480}", roman: "XIII", group: "CRITICAL", deathSubtype: "GIFT_TOP1", bgColor: "#070510", borderColor: "#b45309", textColor: "#fde68a" },
  { index: 4, key: "THE_FOOL", nameVi: "K\u1EBB Kh\u1EDD (Kh\xF3i \u0110\u1ED9c)", nameEn: "The Fool", icon: "\u{1F0CF}", roman: "0", group: "COMMON", bgColor: "#110926", borderColor: "#6d28d9", textColor: "#e0e7ff" },
  { index: 5, key: "THE_PEACE", nameVi: "B\xECnh Y\xEAn Tho\xE1t N\u1EA1n", nameEn: "The Peace", icon: "\u{1F54A}\uFE0F", roman: "XXI", group: "COMMON", bgColor: "#0b1124", borderColor: "#4338ca", textColor: "#f5d0fe" },
  { index: 6, key: "THE_KNIGHT", nameVi: "Hi\u1EC7p S\u0129 (The Knight)", nameEn: "The Knight", icon: "\u{1F5E1}\uFE0F", roman: "VII", group: "MUTATION", bgColor: "#070510", borderColor: "#b45309", textColor: "#fde68a" },
  { index: 7, key: "THE_EMPEROR", nameVi: "Ho\xE0ng \u0110\u1EBF (The Emperor)", nameEn: "The Emperor", icon: "\u{1F451}", roman: "IV", group: "MUTATION", bgColor: "#110926", borderColor: "#6d28d9", textColor: "#e0e7ff" },
  { index: 8, key: "THE_DEATH", nameVi: "Th\u1EA7n Ch\u1EBFt (T\u1EB7ng \u0110i\u1EC3m)", nameEn: "Death", icon: "\u{1F480}", roman: "XIII", group: "CRITICAL", deathSubtype: "GIFT_TOP1", bgColor: "#0b1124", borderColor: "#4338ca", textColor: "#f5d0fe" },
  { index: 9, key: "THE_FOOL", nameVi: "K\u1EBB Kh\u1EDD (Kh\xF3i \u0110\u1ED9c)", nameEn: "The Fool", icon: "\u{1F0CF}", roman: "0", group: "COMMON", bgColor: "#070510", borderColor: "#b45309", textColor: "#fde68a" },
  { index: 10, key: "THE_PEACE", nameVi: "B\xECnh Y\xEAn Tho\xE1t N\u1EA1n", nameEn: "The Peace", icon: "\u{1F54A}\uFE0F", roman: "XXI", group: "COMMON", bgColor: "#110926", borderColor: "#6d28d9", textColor: "#e0e7ff" },
  { index: 11, key: "THE_KNIGHT", nameVi: "Hi\u1EC7p S\u0129 (The Knight)", nameEn: "The Knight", icon: "\u{1F5E1}\uFE0F", roman: "VII", group: "MUTATION", bgColor: "#0b1124", borderColor: "#4338ca", textColor: "#f5d0fe" },
  { index: 12, key: "THE_EMPEROR", nameVi: "Ho\xE0ng \u0110\u1EBF (The Emperor)", nameEn: "The Emperor", icon: "\u{1F451}", roman: "IV", group: "MUTATION", bgColor: "#070510", borderColor: "#b45309", textColor: "#fde68a" },
  { index: 13, key: "THE_DEATH", nameVi: "Th\u1EA7n Ch\u1EBFt (T\u1EB7ng \u0110i\u1EC3m)", nameEn: "Death", icon: "\u{1F480}", roman: "XIII", group: "CRITICAL", deathSubtype: "GIFT_TOP1", bgColor: "#110926", borderColor: "#6d28d9", textColor: "#e0e7ff" },
  { index: 14, key: "THE_FOOL", nameVi: "K\u1EBB Kh\u1EDD (Kh\xF3i \u0110\u1ED9c)", nameEn: "The Fool", icon: "\u{1F0CF}", roman: "0", group: "COMMON", bgColor: "#0b1124", borderColor: "#4338ca", textColor: "#f5d0fe" },
  { index: 15, key: "THE_PEACE", nameVi: "B\xECnh Y\xEAn Tho\xE1t N\u1EA1n", nameEn: "The Peace", icon: "\u{1F54A}\uFE0F", roman: "XXI", group: "COMMON", bgColor: "#070510", borderColor: "#b45309", textColor: "#fde68a" },
  { index: 16, key: "THE_KNIGHT", nameVi: "Hi\u1EC7p S\u0129 (The Knight)", nameEn: "The Knight", icon: "\u{1F5E1}\uFE0F", roman: "VII", group: "MUTATION", bgColor: "#110926", borderColor: "#6d28d9", textColor: "#e0e7ff" },
  { index: 17, key: "THE_EMPEROR", nameVi: "Ho\xE0ng \u0110\u1EBF (The Emperor)", nameEn: "The Emperor", icon: "\u{1F451}", roman: "IV", group: "MUTATION", bgColor: "#0b1124", borderColor: "#4338ca", textColor: "#f5d0fe" },
  { index: 18, key: "THE_DEATH", nameVi: "Th\u1EA7n Ch\u1EBFt (T\u1EB7ng \u0110i\u1EC3m)", nameEn: "Death", icon: "\u{1F480}", roman: "XIII", group: "CRITICAL", deathSubtype: "GIFT_TOP1", bgColor: "#070510", borderColor: "#b45309", textColor: "#fde68a" },
  { index: 19, key: "THE_FOOL", nameVi: "K\u1EBB Kh\u1EDD (Kh\xF3i \u0110\u1ED9c)", nameEn: "The Fool", icon: "\u{1F0CF}", roman: "0", group: "COMMON", bgColor: "#110926", borderColor: "#6d28d9", textColor: "#e0e7ff" }
];
function getEffectiveTarotWheelSegments(hasSunMagnet = false, isSurvivalMode = false, options) {
  const riskTier = options?.riskTier ?? "NEUTRAL";
  const currentRound = options?.currentRound ?? 1;
  const teamScore = options?.teamScore ?? 0;
  let segments = (isSurvivalMode ? TAROT_SURVIVAL_WHEEL_SEGMENTS : MAJOR_ARCANA_WHEEL_SEGMENTS).map((seg) => {
    if (!isSurvivalMode) {
      if (currentRound <= 1 && (seg.index === 12 || seg.index === 15)) {
        return {
          ...seg,
          maskedEffect: "NEUTRAL"
        };
      }
      if (currentRound === 2 && seg.index === 12 && riskTier !== "DOMINANT") {
        return {
          ...seg,
          maskedEffect: "NEUTRAL"
        };
      }
      if ((riskTier === "UNDERDOG" || teamScore <= 0) && (seg.index === 12 || seg.index === 15)) {
        return {
          ...seg,
          maskedEffect: "NEUTRAL"
        };
      }
      if (riskTier === "DOMINANT" && (seg.index === 7 || seg.index === 13)) {
        return {
          ...seg,
          maskedEffect: "SUN_SMALL"
        };
      }
    }
    return seg;
  });
  if (hasSunMagnet && !isSurvivalMode) {
    segments = segments.map((seg) => {
      if (seg.index === 19) {
        return {
          ...seg,
          nameVi: "M\u1EB7t Tr\u1EDDi (Nam Ch\xE2m)",
          nameEn: "The Sun (Magnet)",
          isMagnetized: true
        };
      }
      return seg;
    });
  }
  if (options?.shieldTransformedCardKey) {
    segments = segments.map((seg) => {
      if (seg.key === options.shieldTransformedCardKey) {
        const cleanName = seg.nameVi.split(" (")[0];
        return {
          ...seg,
          nameVi: `${cleanName} (H\xF3a Gi\u1EA3i \u2728)`,
          icon: "\u2728",
          bgColor: "#064e3b",
          borderColor: "#10b981",
          textColor: "#6ee7b7",
          isShieldTransformed: true,
          maskedEffect: "SUN_SMALL"
        };
      }
      return seg;
    });
  }
  return segments;
}
function calculateTarotWheelSpin({
  powerPercent,
  currentAngle = 0,
  hasSunMagnet = false,
  isSurvivalMode = false,
  options
}) {
  const clampedPower = Math.max(1, Math.min(100, Math.round(powerPercent)));
  const minTurnsAngle = 1.15 * 360;
  const maxExtraAngle = (3 - 1.15) * 360;
  const extraAngle = Math.round((clampedPower - 1) / 99 * maxExtraAngle);
  const jitter = Math.floor(Math.random() * 7) - 3;
  let totalDelta = minTurnsAngle + extraAngle + jitter;
  const segAngle = isSurvivalMode ? 18 : 360 / 22;
  const segCount = isSurvivalMode ? 20 : 22;
  let pointerAngle = (360 - (currentAngle + totalDelta) % 360) % 360;
  const remInSeg = pointerAngle % segAngle;
  if (remInSeg < 2.4) {
    const hasEnoughForceToPushThrough = (clampedPower * 7 + jitter * 13) % 100 > 45;
    if (hasEnoughForceToPushThrough) {
      totalDelta += 3.2;
    } else {
      totalDelta -= 1.8;
    }
  } else if (remInSeg > segAngle - 2.4) {
    const hasEnoughForceToPushThrough = (clampedPower * 11 + jitter * 17) % 100 > 45;
    if (hasEnoughForceToPushThrough) {
      totalDelta += 2.2;
    } else {
      totalDelta -= 3;
    }
  }
  const targetAngle = currentAngle + totalDelta;
  pointerAngle = (360 - targetAngle % 360) % 360;
  const landedIndex = Math.floor(pointerAngle / segAngle) % segCount;
  const effectiveSegments = getEffectiveTarotWheelSegments(hasSunMagnet, isSurvivalMode, options);
  const landedSegment = effectiveSegments[landedIndex];
  const spinDurationMs = Math.round(15e3 + (clampedPower - 1) / 99 * 5e3);
  return {
    targetAngle,
    spinDurationMs,
    landedSegment,
    landedIndex
  };
}
function resolveWheelCardEffect({
  cardKey,
  basePoints,
  team,
  allTeams = [],
  currentRound = 1,
  riskTier = "NEUTRAL",
  isGambleSpin = false,
  isSurvivalMode = false,
  timesStolenInCycle = {},
  shieldTransformedCardKey,
  currentHearts = 1,
  maxHearts = 3
}) {
  const currentScore = team.score || 0;
  const otherTeams = (allTeams || []).filter((t) => t.id !== team.id && !t.isEliminated);
  if (shieldTransformedCardKey && cardKey === shieldTransformedCardKey) {
    const seg2 = (isSurvivalMode ? TAROT_SURVIVAL_WHEEL_SEGMENTS : MAJOR_ARCANA_WHEEL_SEGMENTS).find(
      (s) => s.key === cardKey
    ) || MAJOR_ARCANA_WHEEL_SEGMENTS[0];
    const cleanName = seg2.nameVi.split(" (")[0];
    const scoreDelta = basePoints;
    return {
      drawnCard: {
        key: cardKey,
        nameVi: `${cleanName} (H\xF3a Gi\u1EA3i \u0110i\u1EC1m L\xE0nh \u2728)`,
        nameEn: `${seg2.nameEn} (Blessed)`,
        icon: "\u2728",
        roman: seg2.roman,
        group: "COMMON",
        scoreDelta
      },
      finalScoreDelta: scoreDelta,
      scorePenalty: 0,
      isBomb: false,
      scoreDeltas: [{ teamId: team.id, delta: scoreDelta }],
      rewardText: `\u{1F6E1}\uFE0F\u2728 ${cleanName} (\u0110\xC3 H\xD3A GI\u1EA2I): Nh\u1EDD Khi\xEAn Th\u1EA7n chuy\u1EC3n h\xF3a \xF4 ph\u1EA1t th\xE0nh \u0111i\u1EC1m l\xE0nh! \u0110\u1ED9i b\u1EA1n nh\u1EADn tr\u1ECDn v\u1EB9n +${scoreDelta}\u0111!`
    };
  }
  if (isSurvivalMode) {
    if (cardKey === "THE_PEACE") {
      return {
        drawnCard: {
          key: "THE_PEACE",
          nameVi: "B\xECnh Y\xEAn Tho\xE1t N\u1EA1n",
          nameEn: "The Peace",
          icon: "\u{1F54A}\uFE0F",
          roman: "XXI",
          group: "COMMON",
          scoreDelta: 0
        },
        finalScoreDelta: 0,
        scorePenalty: 0,
        isBomb: false,
        scoreDeltas: [],
        rewardText: `\u{1F54A}\uFE0F B\xCCNH Y\xCAN THO\xC1T N\u1EA0N: May m\u1EAFn th\u1EA7n k\u1EF3! B\u1EA1n \u0111\xE3 s\u1ED1ng s\xF3t qua v\xF2ng quay Sinh T\u1EED v\xE0 b\u1EA3o to\xE0n nguy\xEAn v\u1EB9n s\u1ED1 \u0111i\u1EC3m!`
      };
    }
    if (cardKey === "THE_FOOL") {
      const smokePenalty = Math.min(currentScore, roundToMultipleOfFive(basePoints * 0.5));
      return {
        drawnCard: {
          key: "THE_FOOL",
          nameVi: "K\u1EBB Kh\u1EDD (Kh\xF3i \u0110\u1ED9c Sinh T\u1EED)",
          nameEn: "The Fool",
          icon: "\u{1F0CF}",
          roman: "0",
          group: "COMMON",
          scoreDelta: -smokePenalty
        },
        finalScoreDelta: -smokePenalty,
        scorePenalty: smokePenalty,
        isBomb: true,
        scoreDeltas: smokePenalty > 0 ? [{ teamId: team.id, delta: -smokePenalty }] : [],
        rewardText: `\u{1F0CF} K\u1EBA KH\u1EDC (KH\xD3I \u0110\u1ED8C SINH T\u1EEC): Ch\u1EBF \u0111\u1ED9 Sinh T\u1EED ph\u1EA1t tr\u1EEB 50% \u0111i\u1EC3m g\u1ED1c c\xE2u h\u1ECFi (-${smokePenalty}\u0111)!`
      };
    }
    if (cardKey === "THE_EMPEROR") {
      const darkOutcome = resolveBombOutcome({
        bombType: "BOMB_DARK",
        team,
        allTeams,
        storyDescription: "Ho\xE0ng \u0110\u1EBF uy quy\u1EC1n h\u1EAFc \xE1m! R\xFAt c\u1EA1n \u0111i\u1EC3m s\u1ED1 chia \u0111\u1EC1u cho c\xE1c \u0111\u1ED1i th\u1EE7!",
        baseQuestionPoints: basePoints,
        isSurvivalPenalty: true
      });
      const scoreDeltas = [
        ...darkOutcome.penalty > 0 ? [{ teamId: team.id, delta: -darkOutcome.penalty }] : [],
        ...(darkOutcome.darkBombRecipients || []).map((r) => ({ teamId: r.teamId, delta: r.points }))
      ];
      return {
        drawnCard: {
          key: "THE_EMPEROR",
          nameVi: "Ho\xE0ng \u0110\u1EBF",
          nameEn: "The Emperor",
          icon: "\u{1F451}",
          roman: "IV",
          group: "MUTATION",
          scoreDelta: -darkOutcome.penalty,
          darkBombRecipients: darkOutcome.darkBombRecipients
        },
        finalScoreDelta: -darkOutcome.penalty,
        scorePenalty: darkOutcome.penalty,
        isBomb: true,
        darkBombRecipients: darkOutcome.darkBombRecipients,
        scoreDeltas,
        rewardText: `\u{1F451} HO\xC0NG \u0110\u1EBE: N\u0103ng l\u01B0\u1EE3ng b\xF3ng t\u1ED1i nu\u1ED1t ch\u1EEDng! Tr\u1EEB ${darkOutcome.penalty}\u0111 ph\xE2n chia cho \u0111\u1ED1i th\u1EE7!`
      };
    }
    if (cardKey === "THE_KNIGHT") {
      const halfScore2 = Math.min(currentScore, roundToMultipleOfFive(currentScore * 0.5));
      return {
        drawnCard: {
          key: "THE_KNIGHT",
          nameVi: "Hi\u1EC7p S\u0129",
          nameEn: "The Knight",
          icon: "\u{1F5E1}\uFE0F",
          roman: "VII",
          group: "MUTATION",
          scoreDelta: -halfScore2
        },
        finalScoreDelta: -halfScore2,
        scorePenalty: halfScore2,
        isBomb: true,
        scoreDeltas: halfScore2 > 0 ? [{ teamId: team.id, delta: -halfScore2 }] : [],
        rewardText: `\u{1F5E1}\uFE0F HI\u1EC6P S\u0128: \u0110\u1ECBnh m\u1EC7nh tr\u1EEBng ph\u1EA1t x\xF3a s\u1ED5 1/2 t\u1ED5ng \u0111i\u1EC3m hi\u1EC7n c\xF3 (-${halfScore2}\u0111)!`
      };
    }
    let top1Team = void 0;
    if (otherTeams.length > 0) {
      const maxScore = Math.max(...otherTeams.map((t) => t.score || 0));
      const topCandidates = otherTeams.filter((t) => (t.score || 0) === maxScore);
      top1Team = topCandidates[Math.floor(Math.random() * topCandidates.length)];
    }
    const halfScore = roundToMultipleOfFive(currentScore * 0.5);
    const baseOneAndHalf = roundToMultipleOfFive(basePoints * 1.5);
    const targetPenalty = Math.min(halfScore, baseOneAndHalf);
    const gifted = currentScore > 0 ? Math.min(currentScore, targetPenalty) : 0;
    return {
      drawnCard: {
        key: "THE_DEATH",
        nameVi: "Th\u1EA7n Ch\u1EBFt (T\u1EB7ng \u0110i\u1EC3m)",
        nameEn: "Death",
        icon: "\u{1F480}",
        roman: "XIII",
        group: "CRITICAL",
        deathSubtype: "GIFT_TOP1",
        scoreDelta: -gifted,
        giftedPoints: gifted,
        victimTeamId: top1Team?.id,
        victimTeamName: top1Team?.name
      },
      finalScoreDelta: -gifted,
      scorePenalty: gifted,
      isBomb: gifted > 0,
      victimTeamId: top1Team?.id,
      victimTeamName: top1Team?.name,
      giftedPoints: gifted,
      scoreDeltas: [
        ...gifted > 0 ? [{ teamId: team.id, delta: -gifted }] : [],
        ...top1Team && gifted > 0 ? [{ teamId: top1Team.id, delta: gifted }] : []
      ],
      rewardText: `\u{1F480} TH\u1EA6N CH\u1EBET (HI\u1EBEN T\u1EBE): B\u1ECB ph\u1EA1t (-${gifted}\u0111) chuy\u1EC3n t\u1EB7ng tr\u1ECDn g\xF3i cho Top 1 (${top1Team?.name || "\u0110\u1ED1i th\u1EE7"})!`
    };
  }
  const seg = MAJOR_ARCANA_WHEEL_SEGMENTS.find((s) => s.key === cardKey) || MAJOR_ARCANA_WHEEL_SEGMENTS[0];
  const isNeutral = cardKey === "THE_FOOL" || cardKey === "JUSTICE";
  const isSunSmall = cardKey === "THE_MAGICIAN" || cardKey === "THE_HIGH_PRIESTESS" || cardKey === "THE_HIEROPHANT" || cardKey === "THE_HERMIT" || cardKey === "THE_EMPEROR" || cardKey === "STRENGTH";
  const isSunMedium = cardKey === "THE_EMPRESS" || cardKey === "JUDGEMENT";
  const isSunTemperance = cardKey === "TEMPERANCE";
  const isSunLarge = cardKey === "THE_LOVERS" || cardKey === "THE_SUN" || cardKey === "THE_WORLD";
  const isSunRandom = cardKey === "WHEEL_OF_FORTUNE";
  const isGamble = cardKey === "THE_STAR" || cardKey === "THE_MOON";
  const isSteal2x = cardKey === "THE_CHARIOT" || cardKey === "THE_DEATH" || cardKey === "DEATH";
  const isBombDark = cardKey === "THE_DEVIL";
  const isBombTrap = cardKey === "THE_TOWER" || cardKey === "THE_KNIGHT";
  const isBombCharity = cardKey === "THE_HANGED_MAN";
  let effectiveEffectType = "SUN_SMALL";
  if (isNeutral) {
    effectiveEffectType = "NEUTRAL";
  } else if (isSunSmall) {
    effectiveEffectType = "SUN_SMALL";
  } else if (isSunMedium) {
    effectiveEffectType = "SUN_MEDIUM";
  } else if (isSunTemperance) {
    effectiveEffectType = "SUN_TEMPERANCE";
  } else if (isSunLarge) {
    effectiveEffectType = "SUN_LARGE";
  } else if (isSunRandom) {
    effectiveEffectType = "SUN_RANDOM";
  } else if (isGamble) {
    effectiveEffectType = "GAMBLE";
  } else if (isSteal2x) {
    effectiveEffectType = "STEAL_2X";
  } else if (isBombDark) {
    effectiveEffectType = "BOMB_DARK";
  } else if (isBombTrap) {
    effectiveEffectType = "BOMB_TRAP";
  } else if (isBombCharity) {
    effectiveEffectType = "BOMB_CHARITY";
  } else {
    effectiveEffectType = "SUN_SMALL";
  }
  let dynamicReason = null;
  if (!isGambleSpin) {
    if (currentRound <= 1 && (effectiveEffectType === "BOMB_DARK" || effectiveEffectType === "BOMB_CHARITY")) {
      effectiveEffectType = "NEUTRAL";
      dynamicReason = "ROUND_SEALED";
    } else if (currentRound === 2 && effectiveEffectType === "BOMB_CHARITY" && riskTier !== "DOMINANT") {
      effectiveEffectType = "NEUTRAL";
      dynamicReason = "ROUND_SEALED";
    }
    if ((riskTier === "UNDERDOG" || currentScore <= 0) && (effectiveEffectType === "BOMB_DARK" || effectiveEffectType === "BOMB_CHARITY")) {
      effectiveEffectType = "NEUTRAL";
      dynamicReason = "UNDERDOG_PROTECTED";
    }
    if (riskTier === "DOMINANT" && effectiveEffectType === "STEAL_2X") {
      effectiveEffectType = "SUN_SMALL";
      dynamicReason = "DOMINANT_CAPPED";
    }
  }
  switch (effectiveEffectType) {
    case "NEUTRAL": {
      let rewardText = `\u{1F0CF} ${seg.nameVi} (${seg.nameEn}): \u0110i\u1EC1m t\u0129nh gi\u1EEF m\xECnh! B\u1EA3o to\xE0n nguy\xEAn v\u1EB9n s\u1ED1 \u0111i\u1EC3m (\xB10\u0111).`;
      if (dynamicReason === "ROUND_SEALED") {
        rewardText = `\u{1F6E1}\uFE0F ${seg.nameVi} (${seg.nameEn}): C\xE1n C\xE2n \u0110\u1ECBnh M\u1EC7nh! \u1EA4n ph\u1EA1t \u0111\u01B0\u1EE3c phong \u1EA5n \u0111\u1EA7u tr\u1EADn, tho\xE1t n\u1EA1n b\u1EA3o to\xE0n s\u1ED1 \u0111i\u1EC3m (\xB10\u0111)!`;
      } else if (dynamicReason === "UNDERDOG_PROTECTED") {
        rewardText = `\u{1F6E1}\uFE0F ${seg.nameVi} (${seg.nameEn}): B\u1EA3o H\u1ED9 K\u1EBB Y\u1EBFu! \u0110\u1ECBnh m\u1EC7nh n\u01B0\u01A1ng tay, h\xF3a gi\u1EA3i ki\u1EBFp n\u1EA1n v\xE0 b\u1EA3o to\xE0n s\u1ED1 \u0111i\u1EC3m (\xB10\u0111)!`;
      }
      return {
        drawnCard: {
          key: cardKey,
          nameVi: seg.nameVi,
          nameEn: seg.nameEn,
          icon: seg.icon,
          roman: seg.roman,
          group: "COMMON",
          scoreDelta: 0
        },
        finalScoreDelta: 0,
        scorePenalty: 0,
        isBomb: false,
        scoreDeltas: [],
        rewardText
      };
    }
    case "SUN_SMALL": {
      let rewardText = `\u2728 ${seg.nameVi} (${seg.nameEn}): \u0110i\u1EC1m l\xE0nh soi chi\u1EBFu! Nh\u1EADn tr\u1ECDn v\u1EB9n +${basePoints}\u0111 (x1) an to\xE0n!`;
      if (cardKey === "THE_EMPEROR") {
        rewardText = `\u{1F6E1}\uFE0F ${seg.nameVi} (${seg.nameEn}): Uy quy\u1EC1n Ho\xE0ng \u0110\u1EBF! Nh\u1EADn tr\u1ECDn v\u1EB9n +${basePoints}\u0111 (x1) v\xE0 \u0111\u01B0\u1EE3c k\xEDch ho\u1EA1t Khi\xEAn Th\u1EA7n h\u1ED9 th\u1EC3!`;
      } else if (cardKey === "STRENGTH") {
        const curHearts = currentHearts;
        rewardText = curHearts >= maxHearts ? `\u2764\uFE0F ${seg.nameVi} (${seg.nameEn}): \xDD ch\xED ki\xEAn c\u01B0\u1EDDng! Nh\u1EADn tr\u1ECDn v\u1EB9n +${basePoints}\u0111 (x1) (\u0110\xE3 \u0111\u1EA1t t\u1ED1i \u0111a \u2764\uFE0F ${maxHearts} - kh\xF4ng h\u1ED3i th\xEAm)!` : `\u2764\uFE0F ${seg.nameVi} (${seg.nameEn}): \xDD ch\xED ki\xEAn c\u01B0\u1EDDng! Nh\u1EADn tr\u1ECDn v\u1EB9n +${basePoints}\u0111 (x1) v\xE0 h\u1ED3i ph\u1EE5c th\xEAm 1 Tr\xE1i Tim sinh m\u1EC7nh!`;
      } else if (dynamicReason === "DOMINANT_CAPPED") {
        rewardText = `\u2696\uFE0F ${seg.nameVi}: C\xE1n C\xE2n \u0110\u1ECBnh M\u1EC7nh! \u0110\u1ED9i \u0111ang d\u1EABn \u0111\u1EA7u nh\u1EADn th\u01B0\u1EDFng an to\xE0n +${basePoints}\u0111 thay v\xEC c\u01B0\u1EDBp \u0111i\u1EC3m c\u1EE7a \u0111\u1ED9i y\u1EBFu h\u01A1n!`;
      }
      return {
        drawnCard: {
          key: cardKey,
          nameVi: seg.nameVi,
          nameEn: seg.nameEn,
          icon: seg.icon,
          roman: seg.roman,
          group: "COMMON",
          scoreDelta: basePoints
        },
        finalScoreDelta: basePoints,
        scorePenalty: 0,
        isBomb: false,
        scoreDeltas: [{ teamId: team.id, delta: basePoints }],
        rewardText
      };
    }
    case "SUN_TEMPERANCE": {
      const scoreDelta = roundToMultipleOfFive(basePoints * 1.5);
      const pHalf = roundToMultipleOfFive(basePoints * 0.5);
      const otherRecipients = otherTeams.map((t) => ({ teamId: t.id, teamName: t.name, points: pHalf }));
      const scoreDeltas = [
        { teamId: team.id, delta: scoreDelta },
        ...otherRecipients.map((r) => ({ teamId: r.teamId, delta: r.points }))
      ];
      return {
        drawnCard: {
          key: cardKey,
          nameVi: seg.nameVi,
          nameEn: seg.nameEn,
          icon: seg.icon,
          roman: seg.roman,
          group: "COMMON",
          scoreDelta
        },
        finalScoreDelta: scoreDelta,
        scorePenalty: 0,
        isBomb: false,
        scoreDeltas,
        rewardText: `\u2696\uFE0F ${seg.nameVi} (${seg.nameEn}): Ti\u1EBFt \u0110\u1ED9 dung h\xF2a! \u0110\u1ED9i b\u1EA1n nh\u1EADn tr\u1ECDn v\u1EB9n +${scoreDelta}\u0111 (x1.5), \u0111\u1ED3ng th\u1EDDi s\u1EBB chia ph\u01B0\u1EDBc l\xE0nh +${pHalf}\u0111 (x0.5) cho t\u1EA5t c\u1EA3 \u0111\u1ED1i th\u1EE7!`
      };
    }
    case "SUN_MEDIUM": {
      const scoreDelta = roundToMultipleOfFive(basePoints * 1.5);
      return {
        drawnCard: {
          key: cardKey,
          nameVi: seg.nameVi,
          nameEn: seg.nameEn,
          icon: seg.icon,
          roman: seg.roman,
          group: "COMMON",
          scoreDelta
        },
        finalScoreDelta: scoreDelta,
        scorePenalty: 0,
        isBomb: false,
        scoreDeltas: [{ teamId: team.id, delta: scoreDelta }],
        rewardText: `\u{1F31F} ${seg.nameVi} (${seg.nameEn}): \u0110\u1ECBnh m\u1EC7nh n\xE2ng \u0111\u1EE1! Nh\u1EADn n\xF3ng +${scoreDelta}\u0111 (x1.5)!`
      };
    }
    case "SUN_LARGE": {
      const scoreDelta = basePoints * 2;
      return {
        drawnCard: {
          key: cardKey,
          nameVi: seg.nameVi,
          nameEn: seg.nameEn,
          icon: seg.icon,
          roman: seg.roman,
          group: "COMMON",
          scoreDelta
        },
        finalScoreDelta: scoreDelta,
        scorePenalty: 0,
        isBomb: false,
        scoreDeltas: [{ teamId: team.id, delta: scoreDelta }],
        rewardText: `\u2600\uFE0F ${seg.nameVi} (${seg.nameEn}): \u0110\u1EA1i c\xE1t vinh quang! B\xF9ng n\u1ED5 +${scoreDelta}\u0111 (x2)!`
      };
    }
    case "SUN_RANDOM": {
      const rand = Math.random();
      let mult = 1;
      if (rand < 0.5) {
        mult = 1;
      } else if (rand < 0.85) {
        mult = 1.5;
      } else {
        mult = 2;
      }
      const scoreDelta = mult === 1.5 ? roundToMultipleOfFive(basePoints * 1.5) : basePoints * mult;
      return {
        drawnCard: {
          key: cardKey,
          nameVi: seg.nameVi,
          nameEn: seg.nameEn,
          icon: seg.icon,
          roman: seg.roman,
          group: "COMMON",
          scoreDelta
        },
        finalScoreDelta: scoreDelta,
        scorePenalty: 0,
        isBomb: false,
        scoreDeltas: [{ teamId: team.id, delta: scoreDelta }],
        rewardText: `\u{1F3A1} ${seg.nameVi}: V\u1EADn may xoay v\u1EA7n x${mult}! Nh\u1EADn \u0111\u01B0\u1EE3c +${scoreDelta}\u0111!`
      };
    }
    case "STEAL_2X": {
      const isChariot = cardKey === "THE_CHARIOT";
      const nominalSteal = isChariot ? Math.max(5, roundToMultipleOfFive(basePoints * 0.5)) : basePoints;
      const maxAllowedSteals = isChariot ? 1 : 2;
      const opponentsWithPoints = otherTeams.filter((t) => (t.score || 0) > 0);
      const eligibleOpponents = opponentsWithPoints.filter((t) => (timesStolenInCycle[t.id] ?? 0) < maxAllowedSteals);
      if (eligibleOpponents.length === 0) {
        const fallbackReward = Math.max(5, roundToMultipleOfFive(basePoints * 0.5));
        const rewardReason = isChariot ? `C\xE1c \u0111\u1ED1i th\u1EE7 c\xF3 \u0111i\u1EC3m \u0111\u1EC1u \u0111\xE3 t\u1EEBng b\u1ECB c\u01B0\u1EDBp trong v\xF2ng v\xE0 \u0111\u01B0\u1EE3c mi\u1EC5n nhi\u1EC5m tr\u01B0\u1EDBc Chi\u1EBFn Xa!` : `C\xE1c \u0111\u1ED1i th\u1EE7 c\xF3 \u0111i\u1EC3m \u0111\u1EC1u \u0111ang \u0111\u01B0\u1EE3c Khi\xEAn Mi\u1EC5n Nhi\u1EC5m C\u01B0\u1EDBp b\u1EA3o v\u1EC7!`;
        const rewardText = opponentsWithPoints.length > 0 ? `\u{1F6E1}\uFE0F ${seg.nameVi}: ${rewardReason} T\u1EA5t c\u1EA3 \u0111\u1ED1i th\u1EE7 \u0111\u1EC1u c\xF3 khi\xEAn, H\u1EC7 Th\u1ED1ng ch\u1EC9 tr\u1EE3 c\u1EA5p n\u1EEDa s\u1ED1 \u0111i\u1EC3m g\u1ED1c (+${fallbackReward}\u0111)!` : `\u2728 ${seg.nameVi}: Ch\u01B0a c\xF3 \u0111\u1ED1i th\u1EE7 n\xE0o c\xF3 \u0111i\u1EC3m \u0111\u1EC3 c\u01B0\u1EDBp! H\u1EC7 Th\u1ED1ng ch\u1EC9 tr\u1EE3 c\u1EA5p n\u1EEDa s\u1ED1 \u0111i\u1EC3m g\u1ED1c (+${fallbackReward}\u0111)!`;
        return {
          drawnCard: {
            key: cardKey,
            nameVi: seg.nameVi,
            nameEn: seg.nameEn,
            icon: seg.icon,
            roman: seg.roman,
            group: "COMMON",
            scoreDelta: fallbackReward
          },
          finalScoreDelta: fallbackReward,
          scorePenalty: 0,
          isBomb: false,
          scoreDeltas: [{ teamId: team.id, delta: fallbackReward }],
          rewardText
        };
      }
      const maxScore = Math.max(...eligibleOpponents.map((t) => t.score || 0));
      const topCandidates = eligibleOpponents.filter((t) => (t.score || 0) === maxScore);
      const victim = topCandidates[Math.floor(Math.random() * topCandidates.length)];
      const victimScore = victim.score || 0;
      const timesStolen = timesStolenInCycle[victim.id] ?? 0;
      let targetSteal = nominalSteal;
      let halfNote = "";
      if (!isChariot && timesStolen === 1) {
        targetSteal = Math.max(5, roundToMultipleOfFive(basePoints * 0.5));
        halfNote = ` (\u0110\u1ED9i ${victim.name} \u0111\xE3 b\u1ECB c\u01B0\u1EDBp 1 l\u1EA7n tr\u01B0\u1EDBc \u0111\xF3: Th\u1EA7n Ch\u1EBFt c\u01B0\u1EDBp 50% \u0111i\u1EC3m g\u1ED1c \u1EDF l\u1EA7n 2)`;
      }
      const actualStolen = Math.min(targetSteal, victimScore, nominalSteal);
      const scoreDeltas = [
        { teamId: team.id, delta: actualStolen },
        { teamId: victim.id, delta: -actualStolen }
      ];
      return {
        drawnCard: {
          key: cardKey,
          nameVi: seg.nameVi,
          nameEn: seg.nameEn,
          icon: seg.icon,
          roman: seg.roman,
          group: "CRITICAL",
          deathSubtype: "STEAL_TOP1",
          scoreDelta: actualStolen,
          stolenPoints: actualStolen,
          victimTeamId: victim.id,
          victimTeamName: victim.name
        },
        finalScoreDelta: actualStolen,
        scorePenalty: 0,
        isBomb: false,
        victimTeamId: victim.id,
        victimTeamName: victim.name,
        stolenPoints: actualStolen,
        scoreDeltas,
        rewardText: `\u{1F5E1}\uFE0F ${seg.nameVi} (${seg.nameEn}): \u0110o\u1EA1t m\u1EC7nh c\xF4ng b\u1EB1ng! C\u01B0\u1EDBp +${actualStolen}\u0111 t\u1EEB ${victim.name} (-${actualStolen}\u0111)${halfNote}!`
      };
    }
    case "BOMB_DARK": {
      const darkOutcome = resolveBombOutcome({
        bombType: "BOMB_DARK",
        team,
        allTeams,
        storyDescription: "\xC1c Qu\u1EF7 H\u1EAFc \xC1m r\xFAt \u0111i\u1EC3m c\u1EE7a \u0111\u1ED9i \u0111ang quay chia \u0111\u1EC1u +5\u0111 cho c\xE1c \u0111\u1ED1i th\u1EE7!",
        baseQuestionPoints: basePoints
      });
      const scoreDeltas = [
        ...darkOutcome.penalty > 0 ? [{ teamId: team.id, delta: -darkOutcome.penalty }] : [],
        ...(darkOutcome.darkBombRecipients || []).map((r) => ({ teamId: r.teamId, delta: r.points }))
      ];
      return {
        drawnCard: {
          key: cardKey,
          nameVi: seg.nameVi,
          nameEn: seg.nameEn,
          icon: seg.icon,
          roman: seg.roman,
          group: "MUTATION",
          scoreDelta: -darkOutcome.penalty,
          darkBombRecipients: darkOutcome.darkBombRecipients
        },
        finalScoreDelta: -darkOutcome.penalty,
        scorePenalty: darkOutcome.penalty,
        isBomb: true,
        darkBombRecipients: darkOutcome.darkBombRecipients,
        scoreDeltas,
        rewardText: `\u{1F608} ${seg.nameVi} (Bom H\u1EAFc \xC1m): ${darkOutcome.penaltyText}`
      };
    }
    case "BOMB_TRAP": {
      const penalty = Math.min(currentScore, basePoints);
      return {
        drawnCard: {
          key: cardKey,
          nameVi: seg.nameVi,
          nameEn: seg.nameEn,
          icon: seg.icon,
          roman: seg.roman,
          group: "MUTATION",
          scoreDelta: -penalty
        },
        finalScoreDelta: -penalty,
        scorePenalty: penalty,
        isBomb: true,
        scoreDeltas: penalty > 0 ? [{ teamId: team.id, delta: -penalty }] : [],
        rewardText: penalty > 0 ? `\u26A1 ${seg.nameVi} (B\u1EABy S\u1EADp): T\xF2a th\xE1p s\u1EE5p \u0111\u1ED5! \u0110\u1ED9i b\u1EA1n b\u1ECB ph\u1EA1t tr\u1EEB -${penalty}\u0111 (1x \u0111i\u1EC3m g\u1ED1c c\xE2u h\u1ECFi)!` : `\u26A1 ${seg.nameVi} (B\u1EABy S\u1EADp): T\xF2a th\xE1p s\u1EE5p \u0111\u1ED5! \u0110\u1ED9i b\u1EA1n \u0111ang c\xF3 0\u0111 n\xEAn kh\xF4ng b\u1ECB tr\u1EEB th\xEAm (\xB10\u0111).`
      };
    }
    case "BOMB_CHARITY": {
      const charityOutcome = resolveBombOutcome({
        bombType: "BOMB_CHARITY",
        team,
        allTeams,
        storyDescription: "Ng\u01B0\u1EDDi Treo Ng\u01B0\u1EE3c hy sinh \u0111i\u1EC3m s\u1ED1 chuy\u1EC3n t\u1EB7ng cho \u0111\u1ED1i th\u1EE7 d\u1EABn \u0111\u1EA7u!",
        baseQuestionPoints: basePoints
      });
      const gifted = charityOutcome.giftedPoints || 0;
      const scoreDeltas = [
        ...charityOutcome.penalty > 0 ? [{ teamId: team.id, delta: -charityOutcome.penalty }] : [],
        ...charityOutcome.recipientTeamId && gifted > 0 ? [{ teamId: charityOutcome.recipientTeamId, delta: gifted }] : []
      ];
      return {
        drawnCard: {
          key: cardKey,
          nameVi: seg.nameVi,
          nameEn: seg.nameEn,
          icon: seg.icon,
          roman: seg.roman,
          group: "CRITICAL",
          deathSubtype: "GIFT_TOP1",
          scoreDelta: -charityOutcome.penalty,
          giftedPoints: gifted,
          victimTeamId: charityOutcome.recipientTeamId,
          victimTeamName: charityOutcome.recipientTeamName
        },
        finalScoreDelta: -charityOutcome.penalty,
        scorePenalty: charityOutcome.penalty,
        isBomb: charityOutcome.penalty > 0,
        victimTeamId: charityOutcome.recipientTeamId,
        victimTeamName: charityOutcome.recipientTeamName,
        giftedPoints: gifted,
        scoreDeltas,
        rewardText: `\u{1F643} ${seg.nameVi} (Bom T\u1EEB Thi\u1EC7n): ${charityOutcome.penaltyText}`
      };
    }
    case "GAMBLE": {
      return {
        drawnCard: {
          key: cardKey,
          nameVi: seg.nameVi,
          nameEn: seg.nameEn,
          icon: seg.icon,
          roman: seg.roman,
          group: "MUTATION",
          scoreDelta: basePoints
        },
        finalScoreDelta: basePoints,
        scorePenalty: 0,
        isBomb: false,
        scoreDeltas: [{ teamId: team.id, delta: basePoints }],
        rewardText: `\u2B50 ${seg.nameVi} (${seg.nameEn}): C\xE1nh c\u1ED5ng \u0110\u1ECBnh M\u1EC7nh m\u1EDF ra! B\u1EA1n c\xF3 th\u1EC3 D\u1EEBng L\u1EA1i nh\u1EADn an to\xE0n +${basePoints}\u0111 ho\u1EB7c \u0110\xE1nh C\u01B0\u1EE3c Quay Ti\u1EBFp!`,
        isGambleTrigger: true
      };
    }
  }
}
function handleAncientTarotSpinWheel({
  state,
  team,
  allTeams = [],
  powerPercent
}) {
  const currentAngle = state.tarotState?.targetAngle || 0;
  const isSurvivalMode = !!state.isPenaltySurvivalMode;
  const hasSunMagnet = !isSurvivalMode && getPerkType(state.promoPerk) === "SUN_MAGNET_PROMO";
  const riskTier = evaluateTeamRiskTier({
    team,
    allTeams,
    currentRound: state.currentRound || 1
  });
  const shieldTransformedCardKey = state.tarotState?.shieldTransformedCardKey;
  const { targetAngle, spinDurationMs, landedSegment, landedIndex } = calculateTarotWheelSpin({
    powerPercent,
    currentAngle,
    hasSunMagnet,
    isSurvivalMode,
    options: {
      riskTier,
      currentRound: state.currentRound || 1,
      teamScore: team.score || 0,
      shieldTransformedCardKey
    }
  });
  const basePoints = normalizeToThreeLevels(state.baseQuestionPoints || 10);
  const currentScore = team.score || 0;
  const effectResult = resolveWheelCardEffect({
    cardKey: landedSegment.key,
    basePoints,
    team,
    allTeams,
    currentRound: state.currentRound || 1,
    riskTier,
    isSurvivalMode,
    timesStolenInCycle: state.timesStolenInCycle,
    shieldTransformedCardKey,
    currentHearts: state.teamHearts?.[team.id] ?? state.initialHeartsPerTeam ?? 1,
    maxHearts: state.initialHeartsPerTeam ?? 3
  });
  const { drawnCard, finalScoreDelta, scorePenalty, isBomb, scoreDeltas, rewardText, isGambleTrigger } = effectResult;
  const isNegative = isBomb || scorePenalty > 0 || drawnCard.scoreDelta < 0;
  if (state.hasShield && isNegative && !isSurvivalMode) {
    state.hasShield = false;
    state.potPoints = 0;
    state.phase = "PUSH_YOUR_LUCK";
    state.turnFinishedReason = void 0;
    state.tarotState = {
      ...state.tarotState || {},
      isWheelSpinning: false,
      wheelPower: Math.max(1, Math.min(100, Math.round(powerPercent))),
      startAngle: currentAngle,
      targetAngle,
      spinDurationMs,
      selectedSegmentIndex: landedIndex,
      drawnCard,
      isDrawn: true,
      isRevealPending: true,
      isGambling: false,
      isShieldRespin: true,
      shieldTransformedCardKey: drawnCard.key
      // LƯỢT 2: Toàn bộ ô chung loại/chức năng biến thành ô cộng điểm!
    };
    const oldScore2 = currentScore;
    state.storyResult = {
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color || "#ef4444",
      rewardText: `\u{1F6E1}\uFE0F KHI\xCAN TH\u1EA6N \u0110\xC3 H\u1EA4P TH\u1EE4 \u0110\u1ECANH M\u1EC6NH X\u1EA4U (${drawnCard.nameVi})! \xD4 tr\u1EEB \u0111\xE3 b\u1ECB v\xF4 hi\u1EC7u h\xF3a (0\u0111). \u0110\u1ED9i b\u1EA1n \u0111\u01B0\u1EE3c th\u01B0\u1EDFng th\xEAm 1 l\u01B0\u1EE3t quay m\u1EDBi v\xE0 to\xE0n b\u1ED9 \xF4 lo\u1EA1i n\xE0y tr\xEAn v\xF2ng quay \u0111\u01B0\u1EE3c chuy\u1EC3n h\xF3a th\xE0nh \xF4 c\u1ED9ng \u0111i\u1EC3m!`,
      scoreDelta: 0,
      oldScore: oldScore2,
      newScore: oldScore2
    };
    return {
      updatedState: { ...state },
      finalScoreDelta: 0,
      isBomb: false,
      scorePenalty: 0,
      drawnCard,
      scoreDeltas: [],
      startAngle: currentAngle,
      targetAngle,
      spinDurationMs,
      landedSegment,
      landedIndex,
      isGambleTrigger: false
    };
  }
  if (!isNegative && effectResult.victimTeamId && effectResult.stolenPoints && effectResult.stolenPoints > 0) {
    if (!state.timesStolenInCycle) state.timesStolenInCycle = {};
    state.timesStolenInCycle[effectResult.victimTeamId] = (state.timesStolenInCycle[effectResult.victimTeamId] || 0) + 1;
  }
  let effectiveFinalDelta = finalScoreDelta;
  let effectiveRewardText = rewardText;
  let effectiveScoreDeltas = [...scoreDeltas];
  if (!isNegative && finalScoreDelta > 0 && !isSurvivalMode && getPerkType(state.promoPerk) === "EXTRA_POT_PROMO") {
    effectiveFinalDelta += 5;
    effectiveRewardText += ` (\u{1F381} Qu\u1EF9 th\u01B0\u1EDFng Promo +5\u0111!)`;
    const teamDeltaIdx = effectiveScoreDeltas.findIndex((d) => d.teamId === team.id);
    if (teamDeltaIdx >= 0) {
      effectiveScoreDeltas[teamDeltaIdx] = {
        ...effectiveScoreDeltas[teamDeltaIdx],
        delta: effectiveScoreDeltas[teamDeltaIdx].delta + 5
      };
    } else {
      effectiveScoreDeltas.push({ teamId: team.id, delta: 5 });
    }
  }
  if (drawnCard.key === "THE_EMPEROR" && !isSurvivalMode) {
    state.hasShield = true;
    const teamsCount = Math.max(1, allTeams?.length || 2);
    const curTurn = state.currentTurnIndex || 0;
    state.teamShields = {
      ...state.teamShields || {},
      [team.id]: {
        activeFromTurnIndex: curTurn + 1,
        expiresAfterTurnIndex: curTurn + teamsCount,
        sourceCard: "THE_EMPEROR"
      }
    };
  }
  if (drawnCard.key === "STRENGTH" && !isSurvivalMode) {
    const heartsRecord = { ...state.teamHearts || {} };
    const maxHearts = state.initialHeartsPerTeam ?? 3;
    const curHearts = heartsRecord[team.id] ?? state.initialHeartsPerTeam ?? 1;
    if (curHearts < maxHearts) {
      heartsRecord[team.id] = curHearts + 1;
      state.teamHearts = heartsRecord;
    }
  }
  state.potPoints = 0;
  state.phase = "PUSH_YOUR_LUCK";
  if (!isGambleTrigger) {
    state.turnFinishedReason = isSurvivalMode ? drawnCard.key === "THE_PEACE" ? "SURVIVAL_ESCAPE" : "SURVIVAL_FAILED" : "TAROT_WHEEL_SPUN";
  }
  state.tarotState = {
    ...state.tarotState || {},
    isWheelSpinning: false,
    wheelPower: Math.max(1, Math.min(100, Math.round(powerPercent))),
    startAngle: currentAngle,
    targetAngle,
    spinDurationMs,
    selectedSegmentIndex: landedIndex,
    drawnCard,
    isDrawn: true,
    isRevealPending: true,
    isGambling: Boolean(isGambleTrigger),
    gamblingSpinCount: 0,
    isShieldRespin: false,
    shieldTransformedCardKey: state.tarotState?.shieldTransformedCardKey
  };
  if (isGambleTrigger) {
    state.tarotGambleState = {
      isGambling: true,
      triggerCardKey: drawnCard.key,
      spinCount: 0
    };
  }
  const oldScore = currentScore;
  const newScore = Math.max(0, oldScore + effectiveFinalDelta);
  state.storyResult = {
    teamId: team.id,
    teamName: team.name,
    teamColor: team.color || "#ef4444",
    rewardText: effectiveRewardText,
    scoreDelta: effectiveFinalDelta,
    oldScore,
    newScore
  };
  return {
    updatedState: { ...state },
    finalScoreDelta: effectiveFinalDelta,
    isBomb,
    scorePenalty,
    victimTeamId: effectResult.victimTeamId,
    victimTeamName: effectResult.victimTeamName,
    stolenPoints: effectResult.stolenPoints,
    giftedPoints: effectResult.giftedPoints,
    darkBombRecipients: effectResult.darkBombRecipients,
    drawnCard,
    scoreDeltas: effectiveScoreDeltas,
    startAngle: currentAngle,
    targetAngle,
    spinDurationMs,
    landedSegment,
    landedIndex,
    isGambleTrigger: Boolean(isGambleTrigger)
  };
}
function handleAncientTarotGambleDecision({
  state,
  team,
  allTeams = [],
  spinAgain,
  powerPercent = 50
}) {
  const basePoints = normalizeToThreeLevels(state.baseQuestionPoints || 10);
  const currentScore = team.score || 0;
  if (!spinAgain) {
    const oldScore2 = currentScore;
    const newScore2 = oldScore2 + basePoints;
    state.phase = "TURN_SUMMARY";
    state.turnFinishedReason = "TAROT_WHEEL_SPUN";
    state.tarotGambleState = void 0;
    state.tarotState = {
      ...state.tarotState || {},
      drawnCard: state.tarotState?.drawnCard ? {
        ...state.tarotState.drawnCard,
        scoreDelta: basePoints
      } : void 0,
      isGambling: false,
      isRevealPending: false
    };
    state.storyResult = {
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color || "#ef4444",
      rewardText: `\u{1F6D1} D\u1EEBng l\u1EA1i an to\xE0n! Quy\u1EBFt \u0111\u1ECBnh nh\u1EADn th\u01B0\u1EDFng an to\xE0n th\xE0nh c\xF4ng (+${basePoints}\u0111 - 1x \u0111i\u1EC3m g\u1ED1c c\xE2u h\u1ECFi).`,
      scoreDelta: basePoints,
      oldScore: oldScore2,
      newScore: newScore2
    };
    return {
      updatedState: { ...state },
      scoreDeltas: [{ teamId: team.id, delta: basePoints }],
      finalScoreDelta: basePoints,
      isGambleAgain: false
    };
  }
  const currentAngle = state.tarotState?.targetAngle || 0;
  const riskTier = evaluateTeamRiskTier({
    team,
    allTeams,
    currentRound: state.currentRound || 1
  });
  const hasSunMagnet = getPerkType(state.promoPerk) === "SUN_MAGNET_PROMO";
  const { targetAngle, spinDurationMs, landedSegment, landedIndex } = calculateTarotWheelSpin({
    powerPercent,
    currentAngle,
    hasSunMagnet,
    isSurvivalMode: false,
    options: { riskTier, currentRound: state.currentRound || 1, teamScore: currentScore }
  });
  const nextSpinCount = (state.tarotState?.gamblingSpinCount || 0) + 1;
  const effectResult = resolveWheelCardEffect({
    cardKey: landedSegment.key,
    basePoints,
    team,
    allTeams,
    currentRound: state.currentRound || 1,
    riskTier,
    isGambleSpin: true,
    isSurvivalMode: false,
    timesStolenInCycle: state.timesStolenInCycle,
    currentHearts: state.teamHearts?.[team.id] ?? state.initialHeartsPerTeam ?? 1,
    maxHearts: state.initialHeartsPerTeam ?? 3
  });
  const { drawnCard, finalScoreDelta, isBomb, scorePenalty, scoreDeltas, rewardText, isGambleTrigger } = effectResult;
  const isGambleAgain = Boolean(isGambleTrigger);
  const isNegative = isBomb || scorePenalty > 0 || drawnCard.scoreDelta < 0;
  if (!isNegative && effectResult.victimTeamId && effectResult.stolenPoints && effectResult.stolenPoints > 0) {
    if (!state.timesStolenInCycle) state.timesStolenInCycle = {};
    state.timesStolenInCycle[effectResult.victimTeamId] = (state.timesStolenInCycle[effectResult.victimTeamId] || 0) + 1;
  }
  state.phase = "PUSH_YOUR_LUCK";
  if (!isGambleAgain) {
    state.turnFinishedReason = "TAROT_WHEEL_SPUN";
    state.tarotGambleState = void 0;
  } else {
    state.tarotGambleState = {
      isGambling: true,
      triggerCardKey: drawnCard.key,
      spinCount: nextSpinCount
    };
  }
  state.tarotState = {
    ...state.tarotState || {},
    isWheelSpinning: false,
    wheelPower: Math.round(powerPercent),
    startAngle: currentAngle,
    targetAngle,
    spinDurationMs,
    selectedSegmentIndex: landedIndex,
    drawnCard,
    isDrawn: true,
    isRevealPending: true,
    isGambling: isGambleAgain,
    gamblingSpinCount: nextSpinCount
  };
  const oldScore = currentScore;
  const newScore = Math.max(0, oldScore + finalScoreDelta);
  state.storyResult = {
    teamId: team.id,
    teamName: team.name,
    teamColor: team.color || "#ef4444",
    rewardText,
    scoreDelta: finalScoreDelta,
    oldScore,
    newScore
  };
  return {
    updatedState: { ...state },
    scoreDeltas,
    finalScoreDelta,
    startAngle: currentAngle,
    targetAngle,
    spinDurationMs,
    landedSegment,
    landedIndex,
    drawnCard,
    isGambleAgain
  };
}
function handleTarotRedraw({
  state
}) {
  if (!state.tarotState) return { updatedState: state };
  state.tarotState.hasRedrawn = true;
  state.tarotState.canRedraw = false;
  state.tarotState.chosenCardId = void 0;
  return { updatedState: { ...state } };
}
function handleTarotConfirmKeep({
  state,
  team,
  allTeams = []
}) {
  const chosenId = state.tarotState?.chosenCardId;
  if (!chosenId) return { updatedState: state, finalScoreDelta: 0 };
  if (state.tarotState) {
    state.tarotState.canRedraw = false;
  }
  const tile = state.tiles.find((t) => t.id === chosenId);
  if (tile) tile.isOpened = false;
  return handleFlipCard({
    state,
    tileId: chosenId,
    team,
    allTeams
  });
}
function handlePushYourLuckUsePeek({
  state
}) {
  if (!state.peekUsesRemaining || state.peekUsesRemaining <= 0) {
    return { updatedState: state };
  }
  state.peekUsesRemaining -= 1;
  const topCard = state.tiles.find((t) => !t.isOpened);
  if (topCard) {
    let cleanTitle = (topCard.storyTitle || "").trim();
    if (topCard.icon && cleanTitle.startsWith(topCard.icon)) {
      cleanTitle = cleanTitle.slice(topCard.icon.length).trim();
    }
    cleanTitle = cleanTitle.replace(/^[\p{Extended_Pictographic}\p{Emoji}\uFE0F\u200D\s]+/u, "").trim() || topCard.storyTitle;
    let pointBadge = "";
    const isBomb = topCard.type !== "REWARD" && topCard.type !== "ESCAPE_SAFE";
    if (topCard.type === "REWARD") {
      if (topCard.effectType === "MULTIPLY_X2") {
        pointBadge = "X2 G\u1ED0C";
      } else if (topCard.effectType === "STEAL_POINTS") {
        pointBadge = topCard.deltaPoints ? `C\u01AF\u1EDAP +${topCard.deltaPoints}\u0111` : "C\u01AF\u1EDAP \u0110I\u1EC2M";
      } else if (typeof topCard.deltaPoints === "number" && topCard.deltaPoints > 0) {
        pointBadge = `+${topCard.deltaPoints}\u0111`;
      } else {
        pointBadge = "AN TO\xC0N";
      }
    } else if (topCard.type === "ESCAPE_SAFE") {
      pointBadge = "THO\xC1T HI\u1EC2M";
    } else if (topCard.type === "BOMB_SMOKE") {
      pointBadge = "0\u0111 (M\u1EA4T H\u0168)";
    } else if (topCard.type === "BOMB_DARK") {
      pointBadge = "CHIA \u0110\u1ED0I TH\u1EE6";
    } else if (topCard.type === "BOMB_CHARITY") {
      pointBadge = "T\u1EB6NG TOP 1";
    } else if (topCard.type === "TRAP") {
      pointBadge = typeof topCard.deltaPoints === "number" && topCard.deltaPoints < 0 ? `-${Math.abs(topCard.deltaPoints)}\u0111` : "B\u1EAAY PH\u1EA0T";
    } else {
      pointBadge = typeof topCard.deltaPoints === "number" && topCard.deltaPoints < 0 ? `-${Math.abs(topCard.deltaPoints)}\u0111` : "B\u1EAAY BOM";
    }
    state.nextCardPeek = {
      icon: topCard.icon,
      storyTitle: cleanTitle,
      cleanTitle,
      isBomb,
      deltaPoints: topCard.deltaPoints,
      effectType: topCard.effectType,
      type: topCard.type,
      pointBadge,
      storyDescription: topCard.storyDescription
    };
  }
  return { updatedState: { ...state } };
}
function handleTarotProphecyDecision({
  state,
  team,
  allTeams = [],
  choice
}) {
  const tState = state.tarotState || {};
  state.tarotState = tState;
  if (choice === "KEEP") {
    const targetTileId = tState.prophecyCardId;
    tState.prophecyResolved = true;
    if (targetTileId) {
      const targetTile = state.tiles.find((t) => t.id === targetTileId);
      if (targetTile) targetTile.isOpened = false;
      return handleFlipCard({
        state,
        tileId: targetTileId,
        team,
        allTeams
      });
    }
    return { updatedState: state, finalScoreDelta: 0, isBomb: false, scorePenalty: 0 };
  } else {
    tState.prophecyResolved = true;
    tState.discardedCardId = tState.prophecyCardId;
    return { updatedState: { ...state }, finalScoreDelta: 0, isBomb: false, scorePenalty: 0 };
  }
}
function synchronizeMysteryStageWithQuestionPoints({
  state,
  questionPoints,
  theme,
  teams = []
}) {
  const normPoints = normalizeToThreeLevels(questionPoints);
  const currentTeam = teams.find((t) => t.id === state.currentTurnTeamId) || {
    id: state.currentTurnTeamId,
    name: state.currentTurnTeamName,
    color: state.currentTurnTeamColor,
    score: 0
  };
  state.baseQuestionPoints = normPoints;
  if (state.phase === "DECISION_CHOICE" || state.phase === "PUSH_YOUR_LUCK" && state.cardsFlippedCount === 0) {
    const extraPot = getPerkType(state.promoPerk) === "EXTRA_POT_PROMO" ? 5 : 0;
    state.potPoints = normPoints + extraPot;
  }
  const normType = normalizeMiniGameType(state.miniGameType);
  const roundOptions = {
    currentRound: state.currentRound || 1,
    teams,
    currentTeamId: currentTeam.id
  };
  switch (normType) {
    case "MEMORY_PAIRS": {
      if (state.phase === "QUESTION_ACTIVE" || !state.memoryPairsState?.firstFlippedTileId && state.cardsFlippedCount === 0) {
        state.tiles = generateMemoryPairsTiles(normPoints, roundOptions);
        state.memoryPairsState = getInitialMemoryPairsState(state.promoPerk);
        if (getPerkType(state.promoPerk) === "PEEK_PROMO") {
          const safeTiles = state.tiles.filter(
            (t) => t.type === "REWARD" && t.pairKey !== "PAIR_BOMB" && t.pairKey !== "PAIR_TRAP"
          );
          const shuffledSafe = [...safeTiles].sort(() => Math.random() - 0.5);
          if (shuffledSafe.length >= 2) {
            const first = shuffledSafe[0];
            const second = shuffledSafe.find((t) => t.pairKey !== first.pairKey) || shuffledSafe[1];
            first.isPeeked = true;
            first.peekLabel = "AN TO\xC0N";
            first.peekIcon = "\u2728";
            second.isPeeked = true;
            second.peekLabel = "AN TO\xC0N";
            second.peekIcon = "\u2728";
          }
        }
      }
      break;
    }
    case "ONE_SHOT_DOORS": {
      if (state.phase === "QUESTION_ACTIVE" || state.oneShotState?.phase === "SELECTING" && (!state.oneShotState.selectedDoorIds || state.oneShotState.selectedDoorIds.length === 0)) {
        state.tiles = generateOneShotDoorsTiles(normPoints, { ...roundOptions, promoPerk: state.promoPerk });
        state.oneShotState = {
          chosenTileId: void 0,
          selectedDoorIds: [],
          penaltyDoorsCount: void 0,
          hasBombDetected: false,
          phase: "SELECTING",
          revealedSafeDoorIds: [],
          chosenFinalDoorId: void 0,
          allRevealed: false,
          peekAvailable: getPerkType(state.promoPerk) === "PEEK_PROMO",
          peekActivated: getPerkType(state.promoPerk) === "PEEK_PROMO",
          hasSwapped: false
        };
      }
      break;
    }
    case "TAROT_DESTINY": {
      state.tiles = [];
      if (state.phase === "QUESTION_ACTIVE") {
        state.tarotState = {
          isWheelSpinning: false,
          isDrawn: false,
          targetAngle: 0
        };
      }
      break;
    }
    case "PUSH_YOUR_LUCK":
    default: {
      if (state.phase === "QUESTION_ACTIVE" || state.cardsFlippedCount === 0) {
        state.tiles = generatePushYourLuckTiles(
          theme || state.theme || "PIRATE",
          normPoints,
          currentTeam.score || 0,
          false,
          roundOptions
        );
      }
      break;
    }
  }
  return { ...state };
}

// src/lib/game-engine/mystery-quest-notices.ts
var NOTICE_TEMPLATES = {
  // 1. Đội đang chơi nhận điểm thưởng (+points)
  ACTIVE_REWARD: [
    { id: "ACT_REW_01", noticeType: "ACTIVE_REWARD", title: "TH\u01AF\u1EDENG L\u1EDAN X\u1EE8NG \u0110\xC1NG!", text: "MC xin ch\xFAc m\u1EEBng {actor}! M\u1ED9t pha x\u1EED l\xFD v\xF4 c\xF9ng \u0111\u1EB3ng c\u1EA5p mang v\u1EC1 tr\u1ECDn v\u1EB9n +{points}\u0111 cho \u0111\u1ED9i!" },
    { id: "ACT_REW_02", noticeType: "ACTIVE_REWARD", title: "V\u1EACN MAY B\xD9NG N\u1ED4!", text: "Tuy\u1EC7t v\u1EDDi {actor}! Th\u1EA7n may m\u1EAFn \u0111\xE3 m\u1EC9m c\u01B0\u1EDDi r\u1EF1c r\u1EE1, c\u1ED9ng ngay +{points}\u0111 v\xE0o k\xE9t s\u1EAFt c\u1EE7a b\u1EA1n!" },
    { id: "ACT_REW_03", noticeType: "ACTIVE_REWARD", title: "C\xDA B\u1EE8T PH\xC1 NGO\u1EA0N M\u1EE4C!", text: "Kh\xE1n gi\u1EA3 \u0111ang v\u1ED7 tay kh\xF4ng ng\u1EDBt! {actor} v\u1EEBa b\u1ECF t\xFAi th\xEAm +{points}\u0111 qu\xFD gi\xE1 trong s\u1EF1 ng\u01B0\u1EE1ng m\u1ED9 c\u1EE7a c\xE1c \u0111\u1ED1i th\u1EE7!" },
    { id: "ACT_REW_04", noticeType: "ACTIVE_REWARD", title: "B\xC0N TAY V\xC0NG!", text: "L\u1EF1a ch\u1ECDn qu\xE1 chu\u1EA9n x\xE1c! {actor} nh\u1EADn tr\u1ECDn g\xF3i ph\u1EA7n th\u01B0\u1EDFng +{points}\u0111 t\u1EEB th\u1EED th\xE1ch \u0111\u1ECBnh m\u1EC7nh!" },
    { id: "ACT_REW_05", noticeType: "ACTIVE_REWARD", title: "\u0110I\u1EC2M S\u1ED0 R\u1EF0C S\xC1NG!", text: "M\u1ED9t b\u01B0\u1EDBc ti\u1EBFn d\xE0i tr\xEAn b\u1EA3ng x\u1EBFp h\u1EA1ng! {actor} \u0111\xE3 xu\u1EA5t s\u1EAFc ghi th\xEAm +{points}\u0111 v\xE0o t\u1ED5ng \u0111i\u1EC3m!" },
    { id: "ACT_REW_06", noticeType: "ACTIVE_REWARD", title: "KHAI TI\u1EC6C CHI\u1EBEN TH\u1EAENG!", text: "Kh\xF4ng th\u1EC3 ng\u0103n c\u1EA3n {actor} l\xFAc n\xE0y! Ph\u1EA7n th\u01B0\u1EDFng +{points}\u0111 ho\xE0n to\xE0n x\u1EE9ng \u0111\xE1ng v\u1EDBi b\u1EA3n l\u0129nh c\u1EE7a c\xE1c b\u1EA1n!" },
    { id: "ACT_REW_07", noticeType: "ACTIVE_REWARD", title: "\u0110\u1EA0I C\xC1T \u0110\u1EA0I L\u1EE2I!", text: "C\u1EA3 tr\u01B0\u1EDDng quay nh\u01B0 n\u1ED5 tung! {actor} v\u1EEBa g\u1EB7t h\xE1i th\xE0nh c\xF4ng r\u1EF1c r\u1EE1 v\u1EDBi +{points}\u0111 th\u01B0\u1EDFng n\xF3ng!" },
    { id: "ACT_REW_08", noticeType: "ACTIVE_REWARD", title: "B\u1EA2N L\u0128NH D\u1EAAN L\u1ED0I!", text: "M\u1ED9t quy\u1EBFt \u0111\u1ECBnh s\xE1ng su\u1ED1t mang l\u1EA1i tr\xE1i ng\u1ECDt: +{points}\u0111 \u0111\xE3 ch\xEDnh th\u1EE9c thu\u1ED9c v\u1EC1 {actor}!" },
    { id: "ACT_REW_09", noticeType: "ACTIVE_REWARD", title: "M\u01AFA \u0110I\u1EC2M TH\u01AF\u1EDENG!", text: "C\u01A1n m\u01B0a \u0111i\u1EC3m th\u01B0\u1EDFng r\u01A1i tr\xFAng {actor}! Nh\u1EADn ngay +{points}\u0111 \u0111\u1EC3 c\u1EE7ng c\u1ED1 v\u1ECB th\u1EBF tr\xEAn \u0111\u1EA5u tr\u01B0\u1EDDng!" },
    { id: "ACT_REW_10", noticeType: "ACTIVE_REWARD", title: "QU\u1EA2 TH\u1EA6N TRAO TAY!", text: "B\xED m\u1EADt \u0111\xE3 \u0111\u01B0\u1EE3c gi\u1EA3i m\xE3 tr\u1ECDn v\u1EB9n! {actor} th\xE2u t\xF3m xu\u1EA5t s\u1EAFc +{points}\u0111 t\u1EEB tay th\u1EA7n h\u1ED9 m\u1EC7nh!" },
    { id: "ACT_REW_11", noticeType: "ACTIVE_REWARD", title: "C\xDA \u0110\xC1NH CH\xCDNH X\xC1C!", text: "Pha ra \u0111\xF2n kh\xF4ng ch\xEA v\xE0o \u0111\xE2u \u0111\u01B0\u1EE3c! {actor} b\u1ECF t\xFAi ng\u1ECDt ng\xE0o +{points}\u0111 trong ti\u1EBFng reo h\xF2 ph\u1EA5n kh\xEDch!" },
    { id: "ACT_REW_12", noticeType: "ACTIVE_REWARD", title: "\u0110\u1ED8T PH\xC1 N\u0102NG L\u01AF\u1EE2NG!", text: "N\u0103ng l\u01B0\u1EE3ng b\xF9ng n\u1ED5! {actor} n\u1EA1p ngay +{points}\u0111 v\xE0o t\xE0i kho\u1EA3n, s\u1EB5n s\xE0ng b\u1EE9t t\u1ED1c v\u1EC1 \u0111\xEDch!" },
    { id: "ACT_REW_13", noticeType: "ACTIVE_REWARD", title: "V\u01AF\u1EE2T TH\u1EEC TH\xC1CH TH\xC0NH C\xD4NG!", text: "Th\u1EED th\xE1ch kh\xF3 nh\u1EB1n c\u0169ng ph\u1EA3i ch\xE0o thua! {actor} \u1EB5m tr\u1ECDn ph\u1EA7n th\u01B0\u1EDFng +{points}\u0111 \u0111\u1EA7y ki\xEAu h\xE3nh!" },
    { id: "ACT_REW_14", noticeType: "ACTIVE_REWARD", title: "TI\u1EBEP L\u1EECA VINH QUANG!", text: "Chi\u1EBFn th\u1EAFng ti\u1EBFp n\u1ED1i chi\u1EBFn th\u1EAFng! {actor} rinh th\xEAm +{points}\u0111 \u0111i\u1EC3m th\u01B0\u1EDFng c\u1EF1c k\u1EF3 \u1EA5n t\u01B0\u1EE3ng!" },
    { id: "ACT_REW_15", noticeType: "ACTIVE_REWARD", title: "V\u1EACN KH\xCD HANH TH\xD4NG!", text: "Tr\u1EDDi ban v\u1EADn \u0111\u1ECF! {actor} v\u1EEBa r\u01B0\u1EDBc v\u1EC1 k\xE9t s\u1EAFt +{points}\u0111 th\u1EA7n t\xE0i tr\u01B0\u1EDBc \xE1nh m\u1EAFt th\xE8m thu\u1ED3ng c\u1EE7a \u0111\u1ED1i ph\u01B0\u01A1ng!" }
  ],
  // 2. Đội đang chơi dính bẫy nổ hoặc bị trừ điểm
  ACTIVE_PENALTY_BOMB: [
    { id: "ACT_PEN_01", noticeType: "ACTIVE_PENALTY_BOMB", title: "TAI N\u1EA0N KH\xD3 \u0110\u1EE0!", text: "\xD4i kh\xF4ng! {actor} v\u1EEBa b\u01B0\u1EDBc h\u1EE5t v\xE0o b\u1EABy ph\u1EE5c k\xEDch, t\u1ED5n th\u1EA5t \u0111au \u0111\u1EDBn -{points}\u0111! H\xE3y l\u1EA5y l\u1EA1i b\xECnh t\u0129nh nh\xE9!" },
    { id: "ACT_PEN_02", noticeType: "ACTIVE_PENALTY_BOMB", title: "BOM PH\xC1T N\u1ED4!", text: "Kh\xF3i m\xF9 bao ph\u1EE7 tr\u01B0\u1EDDng quay! Qu\u1EA3 bom ph\xE1t n\u1ED5 khi\u1EBFn {actor} \u0111\xE1nh r\u01A1i -{points}\u0111 \u0111\u1EA7y ti\u1EBFc nu\u1ED1i!" },
    { id: "ACT_PEN_03", noticeType: "ACTIVE_PENALTY_BOMB", title: "C\xDA TR\u01AF\u1EE2T CH\xC2N!", text: "M\u1ED9t ph\xFAt s\u01A1 s\u1EA9y c\u1EE7a {actor}! Chi\u1EBFc b\u1EABy ng\u1EA7m \u0111\xE3 t\u01B0\u1EDBc \u0111i -{points}\u0111 t\u1EEB t\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n!" },
    { id: "ACT_PEN_04", noticeType: "ACTIVE_PENALTY_BOMB", title: "\u0110\u1ECANH M\u1EC6NH TR\xCAU NG\u01AF\u01A0I!", text: "Qu\xE1 \u0111en \u0111\u1EE7i cho {actor}! C\u1EA1m b\u1EABy b\u1EA5t ng\u1EDD k\xEDch ho\u1EA1t khi\u1EBFn b\u1EA1n m\u1EA5t tr\u1EAFng -{points}\u0111 trong ch\u1EDBp m\u1EAFt!" },
    { id: "ACT_PEN_05", noticeType: "ACTIVE_PENALTY_BOMB", title: "M\u1ED8T CH\xDAT S\xD3NG GI\xD3!", text: "\u0110\u01B0\u1EDDng \u0111\u1EBFn vinh quang kh\xF4ng bao gi\u1EDD tr\u1EA3i hoa h\u1ED3ng! {actor} v\u1EEBa ch\u1ECBu t\u1ED5n th\u1EA5t -{points}\u0111, c\u1ED1 g\u1EAFng \u1EDF c\xE2u ti\u1EBFp theo!" },
    { id: "ACT_PEN_06", noticeType: "ACTIVE_PENALTY_BOMB", title: "B\u1EAAY S\u1EACP B\u1EA4T NG\u1EDC!", text: "Tia s\xE9t gi\xE1ng xu\u1ED1ng! {actor} l\xE3nh tr\u1ECDn \u0111\xF2n ph\u1EA1t tr\u1EEB -{points}\u0111! \u0110\u1EEBng n\u1EA3n l\xF2ng, tr\u1EADn \u0111\u1EA5u v\u1EABn c\xF2n d\xE0i!" },
    { id: "ACT_PEN_07", noticeType: "ACTIVE_PENALTY_BOMB", title: "C\xDA S\u1ED0C T\u1EA0I TR\u01AF\u1EDCNG QUAY!", text: "Ti\u1EBFng n\u1ED5 vang r\u1EC1n khi\u1EBFn kh\xE1n gi\u1EA3 gi\u1EADt m\xECnh! {actor} ng\u1EADm ng\xF9i \u0111\u1EC3 l\u1EA1i -{points}\u0111 t\u1EA1i \u0111\u1EA5u tr\u01B0\u1EDDng!" },
    { id: "ACT_PEN_08", noticeType: "ACTIVE_PENALTY_BOMB", title: "B\u01AF\u1EDAC \u0110I T\xC1O B\u1EA0O!", text: "Li\u1EC1u th\xEC \u0103n nhi\u1EC1u nh\u01B0ng l\u1EA7n n\xE0y may m\u1EAFn ch\u01B0a m\u1EC9m c\u01B0\u1EDDi v\u1EDBi {actor}: T\u1ED5n th\u1EA5t -{points}\u0111 \u0111i\u1EC3m s\u1ED1!" },
    { id: "ACT_PEN_09", noticeType: "ACTIVE_PENALTY_BOMB", title: "KH\xD3I \u0110\u1ED8C B\xD9NG PH\xC1T!", text: "L\xE0n kh\xF3i \u0111en nu\u1ED1t ch\u1EEDng \u0111i\u1EC3m s\u1ED1! {actor} b\u1ECB cu\u1ED1n bay -{points}\u0111 trong s\u1EF1 th\xF3t tim c\u1EE7a \u0111\u1ED3ng \u0111\u1ED9i!" },
    { id: "ACT_PEN_10", noticeType: "ACTIVE_PENALTY_BOMB", title: "TH\u1EEC TH\xC1CH B\u1EA2N L\u0128NH!", text: "V\u1EA5p ng\xE3 l\xE0 \u0111\u1EC3 \u0111\u1EE9ng d\u1EADy m\u1EA1nh m\u1EBD h\u01A1n! {actor} v\u1EEBa b\u1ECB tr\u1EEB -{points}\u0111, h\xE3y bi\u1EBFn \xE1p l\u1EF1c th\xE0nh \u0111\u1ED9ng l\u1EF1c!" },
    { id: "ACT_PEN_11", noticeType: "ACTIVE_PENALTY_BOMB", title: "C\u1EA0M B\u1EAAY NG\xC0N N\u0102M!", text: "C\u1ED5 v\u1EADt gi\u1EA5u b\u1EABy ng\u1EA7m! {actor} v\xF4 t\xECnh k\xEDch ho\u1EA1t c\u01A1 quan c\u1ED5 x\u01B0a, hao h\u1EE5t -{points}\u0111 \u0111i\u1EC3m qu\xFD b\xE1u!" },
    { id: "ACT_PEN_12", noticeType: "ACTIVE_PENALTY_BOMB", title: "C\xDA PH\u1EA2N \u0110\xD2N \u0110AU \u0110\u1EDAN!", text: "\u0110\xF2n tr\u1EEBng ph\u1EA1t \u0111\u1ECBnh m\u1EC7nh! {actor} b\u1ECB gi\u1EA3m tr\u1EEB -{points}\u0111, h\xE3y si\u1EBFt ch\u1EB7t tay nhau \u0111\u1EC3 ph\u1EE5c th\xF9!" },
    { id: "ACT_PEN_13", noticeType: "ACTIVE_PENALTY_BOMB", title: "B\xC3O T\u1ED0 GH\xC9 TH\u0102M!", text: "C\u01A1n b\xE3o b\u1EA5t ng\u1EDD c\xE0n qu\xE9t qu\u1EF9 \u0111i\u1EC3m! {actor} r\u01A1i v\xE0o v\xF9ng hi\u1EC3m \u0111\u1ECBa, m\u1EA5t -{points}\u0111!" },
    { id: "ACT_PEN_14", noticeType: "ACTIVE_PENALTY_BOMB", title: "GI\u1EDC PH\xDAT C\u0102NG TH\u1EB2NG!", text: "Kh\xE1n \u0111\xE0i l\u1EB7ng \u0111i trong gi\xE2y l\xE1t! {actor} v\u1EEBa chia tay -{points}\u0111, c\u1EA7n m\u1ED9t c\xFA l\u1ED9i ng\u01B0\u1EE3c d\xF2ng ngay sau \u0111\xE2y!" },
    { id: "ACT_PEN_15", noticeType: "ACTIVE_PENALTY_BOMB", title: "B\xC0I H\u1ECCC C\u1EE6A \u0110\u1ECANH M\u1EC6NH!", text: "\u0110\u1ECBnh m\u1EC7nh g\u1EEDi g\u1EAFm b\xE0i h\u1ECDc \u0111\u1EAFt gi\xE1! {actor} b\u1ECB tr\u1EEB -{points}\u0111, nh\u01B0ng c\u01A1 h\u1ED9i l\u1EADt k\xE8o v\u1EABn r\u1ED9ng m\u1EDF ph\xEDa tr\u01B0\u1EDBc!" }
  ],
  // 3. Đội đang chơi cướp điểm thành công từ đối thủ
  ACTIVE_STEAL_SUCCESS: [
    { id: "ACT_STL_01", noticeType: "ACTIVE_STEAL_SUCCESS", title: "C\xDA RA TAY HO\xC0N H\u1EA2O!", text: "Xu\u1EA5t s\u1EAFc tuy\u1EC7t \u0111\u1EC9nh! {actor} \u0111\xE3 c\u01B0\u1EDBp ng\u1ECDt ng\xE0o +{points}\u0111 t\u1EEB tay \u0111\u1ED1i th\u1EE7 {victim}!" },
    { id: "ACT_STL_02", noticeType: "ACTIVE_STEAL_SUCCESS", title: "\u0110O\u1EA0T M\u1EC6NH NGO\u1EA0N M\u1EE4C!", text: "Pha \u0111\u1ED9t k\xEDch th\u1EA7n t\u1ED1c! {actor} v\u1EEBa h\xFAt tr\u1ECDn +{points}\u0111 t\u1EEB kho b\xE1u c\u1EE7a {victim} mang v\u1EC1 k\xE9t s\u1EAFt c\u1EE7a m\xECnh!" },
    { id: "ACT_STL_03", noticeType: "ACTIVE_STEAL_SUCCESS", title: "CHI\u1EBEN L\u1EE2I PH\u1EA8M KH\u1EE6NG!", text: "C\u1EA3 tr\u01B0\u1EDDng quay ng\u1EE1 ng\xE0ng! {actor} t\u01B0\u1EDBc \u0111i +{points}\u0111 t\u1EEB {victim}, t\u1EA1o b\u01B0\u1EDBc ngo\u1EB7t l\u1EDBn cho cu\u1ED9c \u0111ua!" },
    { id: "ACT_STL_04", noticeType: "ACTIVE_STEAL_SUCCESS", title: "B\xC0N TAY \u0110\u1EA0O T\u1EB6C!", text: "Kh\xF4ng m\u1ED9t \u0111\u1ED9ng t\xE1c th\u1EEBa! {actor} cu\u1ED7m tr\u1ECDn v\u1EB9n +{points}\u0111 t\u1EEB {victim} tr\u01B0\u1EDBc s\u1EF1 b\u1EA5t l\u1EF1c c\u1EE7a \u0111\u1ED1i ph\u01B0\u01A1ng!" },
    { id: "ACT_STL_05", noticeType: "ACTIVE_STEAL_SUCCESS", title: "C\xDA \u0110\xC1NH S\u1EA4M S\xC9T!", text: "\u0110\xF2n \u0111\xE1nh ch\xED m\u1EA1ng! {actor} \u0111\xE3 r\xFAt c\u1EA1n +{points}\u0111 c\u1EE7a {victim}, \u0111\u01B0a \u0111\u1ED9i m\xECnh v\u01B0\u01A1n l\xEAn m\u1EA1nh m\u1EBD!" },
    { id: "ACT_STL_06", noticeType: "ACTIVE_STEAL_SUCCESS", title: "C\u01AF\u1EDAP \u0110I\u1EC2M CH\u1EDAP NHO\xC1NG!", text: "Nhanh nh\u01B0 ch\u1EDBp! {actor} \u0111\xE3 k\u1ECBp chuy\u1EC3n th\u1EB3ng +{points}\u0111 t\u1EEB t\xE0i kho\u1EA3n {victim} sang \u0111\u1ED9i m\xECnh!" },
    { id: "ACT_STL_07", noticeType: "ACTIVE_STEAL_SUCCESS", title: "TH\u1EA6N T\u1ED0C CHI\u1EBEM \u0110O\u1EA0T!", text: "Chi\u1EBFn thu\u1EADt qu\xE1 cao tay! {actor} khi\u1EBFn {victim} ph\u1EA3i ng\u1EADm ng\xF9i d\xE2ng t\u1EB7ng +{points}\u0111!" },
    { id: "ACT_STL_08", noticeType: "ACTIVE_STEAL_SUCCESS", title: "B\u1EE8T PH\xC1 B\u1EB0NG \u0110O\u1EA0T M\u1EC6NH!", text: "Gia t\u0103ng c\xE1ch bi\u1EC7t ngo\u1EA1n m\u1EE5c! {actor} v\u1EEBa thu ho\u1EA1ch th\xEAm +{points}\u0111 t\u1EEB t\xFAi c\u1EE7a \u0111\u1ED1i th\u1EE7 {victim}!" },
    { id: "ACT_STL_09", noticeType: "ACTIVE_STEAL_SUCCESS", title: "T\xC0I N\u0102NG \u0110\u1EA0O T\u1EB6C \u0110\u1EC8NH CAO!", text: "\u0110\xFAng l\xFAc, \u0111\xFAng th\u1EDDi \u0111i\u1EC3m! {actor} b\u1EBB kh\xF3a th\xE0nh c\xF4ng kho \u0111i\u1EC3m c\u1EE7a {victim}, \u1EB5m tr\u1ECDn +{points}\u0111!" },
    { id: "ACT_STL_10", noticeType: "ACTIVE_STEAL_SUCCESS", title: "C\xDA S\u1ED0C CHO \u0110\u1ED0I TH\u1EE6!", text: "{victim} ch\u1EC9 bi\u1EBFt th\u1ED1t l\xEAn ti\u1EBFc nu\u1ED1i khi ch\u1EE9ng ki\u1EBFn {actor} mang v\u1EC1 +{points}\u0111 chi\u1EBFn l\u1EE3i ph\u1EA9m!" },
    { id: "ACT_STL_11", noticeType: "ACTIVE_STEAL_SUCCESS", title: "XOAY CHUY\u1EC2N C\u1EE4C DI\u1EC6N!", text: "C\u1EE5c di\u1EC7n \u0111\u1EA3o chi\u1EC1u! {actor} t\u01B0\u1EDBc l\u1EA5y +{points}\u0111 t\u1EEB {victim}, c\u1EE7ng c\u1ED1 v\u1EEFng ch\u1EAFc ng\xF4i v\u1ECB c\u1EE7a m\xECnh!" },
    { id: "ACT_STL_12", noticeType: "ACTIVE_STEAL_SUCCESS", title: "C\xDA R\xDAT RU\u1ED8T TH\u1EA6N S\u1EA6U!", text: "Th\u1EA7n ch\u1EBFt vung l\u01B0\u1EE1i h\xE1i! {actor} thu v\u1EC1 tr\u1ECDn v\u1EB9n +{points}\u0111 tr\xEDch xu\u1EA5t tr\u1EF1c ti\u1EBFp t\u1EEB \u0111\u1ED1i th\u1EE7 {victim}!" },
    { id: "ACT_STL_13", noticeType: "ACTIVE_STEAL_SUCCESS", title: "CHI\u1EBEN K\xCA \u0110O\u1EA0T \u0110I\u1EC2M!", text: "M\xF3ng vu\u1ED1t s\u1EAFc b\xE9n! {actor} qu\u1EAFp ngay +{points}\u0111 t\u1EEB \u0111\u1ED1i th\u1EE7 {victim} bay v\xFAt l\xEAn d\u1EABn \u0111\u1EA7u!" },
    { id: "ACT_STL_14", noticeType: "ACTIVE_STEAL_SUCCESS", title: "V\u1EEAA C\u1ED8NG V\u1EEAA TR\u1EEA \u0110\u1ED0I PH\u01AF\u01A0NG!", text: "Ni\u1EC1m vui nh\xE2n \u0111\xF4i! {actor} v\u1EEBa t\u0103ng +{points}\u0111, v\u1EEBa khi\u1EBFn \u0111\u1ED1i th\u1EE7 {victim} t\u1EE5t l\xF9i \u0111\xE1ng k\u1EC3!" },
    { id: "ACT_STL_15", noticeType: "ACTIVE_STEAL_SUCCESS", title: "M\xC0N TR\xCCNH DI\u1EC4N \u0110\u1EC8NH CH\xD3P!", text: "Kh\xE1n \u0111\xE0i \u0111\u1EE9ng d\u1EADy v\u1ED7 tay! C\xFA c\u01B0\u1EDBp \u0111i\u1EC3m +{points}\u0111 t\u1EEB {victim} c\u1EE7a {actor} x\u1EE9ng \u0111\xE1ng \u0111i\u1EC3m 10 ngh\u1EC7 thu\u1EADt!" }
  ],
  // 4. Đội đang chơi cướp nhưng đối thủ có khiên/miễn nhiễm -> Nhận fallback 50% từ Quỹ
  ACTIVE_STEAL_FALLBACK: [
    { id: "ACT_FB_01", noticeType: "ACTIVE_STEAL_FALLBACK", title: "\u0110\u1ED0I TH\u1EE6 B\u1EA2O V\u1EC6 CH\u1EB6T CH\u1EBC!", text: "C\xE1c \u0111\u1ED1i th\u1EE7 \u0111\u1EC1u \u0111ang c\xF3 khi\xEAn b\u1EA3o h\u1ED9 ho\u1EB7c mi\u1EC5n nhi\u1EC5m! Qu\u1EF9 H\u1EC7 Th\u1ED1ng chi tr\u1EA3 c\xF4ng b\u1EB1ng 50% \u0111i\u1EC3m g\u1ED1c (+{points}\u0111) cho {actor}!" },
    { id: "ACT_FB_02", noticeType: "ACTIVE_STEAL_FALLBACK", title: "R\xC0O CH\u1EAEN KI\xCAN C\u1ED0!", text: "Kh\xF4ng th\u1EC3 xuy\xEAn th\u1EE7ng ph\xF2ng tuy\u1EBFn \u0111\u1ED1i ph\u01B0\u01A1ng! Theo quy ch\u1EBF, {actor} nh\u1EADn n\xF3ng n\u1EEDa s\u1ED1 \u0111i\u1EC3m c\xE2u (+{points}\u0111) t\u1EEB h\u1EC7 th\u1ED1ng!" },
    { id: "ACT_FB_03", noticeType: "ACTIVE_STEAL_FALLBACK", title: "PH\xD2NG TH\u1EE6 K\xCDN K\u1EBC!", text: "\u0110\u1ED1i th\u1EE7 \u0111\xE3 k\u1ECBp d\u1EF1ng khi\xEAn! Nh\u01B0ng \u0111\u1EEBng bu\u1ED3n, {actor} v\u1EABn \u0111\u01B0\u1EE3c h\u1EC7 th\u1ED1ng r\xF3t ng\xE2n s\xE1ch an to\xE0n +{points}\u0111!" },
    { id: "ACT_FB_04", noticeType: "ACTIVE_STEAL_FALLBACK", title: "C\xD4NG B\u1EB0NG TUY\u1EC6T \u0110\u1ED0I!", text: "Khi kh\xF4ng c\xF3 m\u1EE5c ti\xEAu h\u1EE3p l\u1EC7 \u0111\u1EC3 c\u01B0\u1EDBp, {actor} nh\u1EADn an to\xE0n 50% \u0111i\u1EC3m g\u1ED1c (+{points}\u0111) v\u1EC1 kho d\u1EF1 tr\u1EEF!" },
    { id: "ACT_FB_05", noticeType: "ACTIVE_STEAL_FALLBACK", title: "B\u1EA2O V\u1EC6 TO\xC0N DI\u1EC6N!", text: "B\u1EE9c t\u01B0\u1EDDng mi\u1EC5n nhi\u1EC5m ph\xE1t huy t\xE1c d\u1EE5ng! {actor} v\u1EABn b\u1ECF t\xFAi ngon l\xE0nh +{points}\u0111 h\u1ED7 tr\u1EE3 t\u1EEB tr\u1ECDng t\xE0i!" },
    { id: "ACT_FB_06", noticeType: "ACTIVE_STEAL_FALLBACK", title: "TR\xC1NH XUNG \u0110\u1ED8T TR\u1EF0C TI\u1EBEP!", text: "\u0110\u1ED1i th\u1EE7 th\u1EDF ph\xE0o nh\u1EB9 nh\xF5m, c\xF2n {actor} v\u1EABn m\u1EC9m c\u01B0\u1EDDi v\u1EDBi +{points}\u0111 an to\xE0n t\u1EEB Qu\u1EF9 Tr\u1EADn \u0110\u1EA5u!" },
    { id: "ACT_FB_07", noticeType: "ACTIVE_STEAL_FALLBACK", title: "TI\u1EC0N TH\u01AF\u1EDENG H\xD2A B\xCCNH!", text: "Kh\xF4ng c\xF3 ai b\u1ECB th\u01B0\u01A1ng t\xEDch! {actor} vui v\u1EBB nh\u1EADn th\u01B0\u1EDFng h\xF2a b\xECnh 50% \u0111i\u1EC3m c\xE2u (+{points}\u0111) t\u1EEB ban t\u1ED5 ch\u1EE9c!" },
    { id: "ACT_FB_08", noticeType: "ACTIVE_STEAL_FALLBACK", title: "KHI\xCAN TH\u1EA6N NG\u0102N B\u01AF\u1EDAC!", text: "L\u1EF1c l\u01B0\u1EE3ng ph\xF2ng v\u1EC7 c\u1EE7a \u0111\u1ED1i ph\u01B0\u01A1ng qu\xE1 m\u1EA1nh! {actor} quay sang nh\u1EADn n\xF3ng +{points}\u0111 b\u1EA3o \u0111\u1EA3m t\u1EEB h\u1EC7 th\u1ED1ng!" },
    { id: "ACT_FB_09", noticeType: "ACTIVE_STEAL_FALLBACK", title: "QUY T\u1EAEC C\xD4NG B\u1EB0NG L\xCAN TI\u1EBENG!", text: "\u0110\xFAng theo lu\u1EADt ch\u01A1i gameshow: {actor} mang v\u1EC1 \u0111\xFAng 1/2 s\u1ED1 \u0111i\u1EC3m g\u1ED1c c\xE2u h\u1ECFi (+{points}\u0111)!" },
    { id: "ACT_FB_10", noticeType: "ACTIVE_STEAL_FALLBACK", title: "THU HO\u1EA0CH AN TO\xC0N!", text: "Kh\xF4ng m\u1EA5t c\xF4ng tranh \u0111o\u1EA1t! {actor} nh\u1EADn th\u1EB3ng +{points}\u0111 t\u1EEB Qu\u1EF9 Trung \u01AF\u01A1ng v\xE0o b\u1EA3ng \u0111i\u1EC3m!" },
    { id: "ACT_FB_11", noticeType: "ACTIVE_STEAL_FALLBACK", title: "K\xC9O L\u1EA0I \u0110I\u1EC2M S\u1ED0!", text: "D\xF9 \u0111\u1ED1i th\u1EE7 mi\u1EC5n nhi\u1EC5m, b\xE0n tay may m\u1EAFn v\u1EABn gi\xFAp {actor} g\u1EB7t h\xE1i +{points}\u0111 th\u01B0\u1EDFng an to\xE0n!" },
    { id: "ACT_FB_12", noticeType: "ACTIVE_STEAL_FALLBACK", title: "\u0110\u1ED0I TH\u1EE6 THO\xC1T N\u1EA0N!", text: "\u0110\u1ED1i ph\u01B0\u01A1ng h\xFA v\xEDa tho\xE1t n\u1EA1n, c\xF2n {actor} v\u1EABn c\xF3 qu\xE0: +{points}\u0111 tinh th\u1EA7n t\u1EEB h\u1EC7 th\u1ED1ng!" },
    { id: "ACT_FB_13", noticeType: "ACTIVE_STEAL_FALLBACK", title: "H\xC0I H\xD2A TH\u1EBE TR\u1EACN!", text: "B\u1EA3o to\xE0n t\xECnh \u0111o\xE0n k\u1EBFt! {actor} nh\u1EADn tr\u1ECDn +{points}\u0111 t\u1EEB ng\xE2n qu\u1EF9 tr\xF2 ch\u01A1i m\xE0 kh\xF4ng l\xE0m ph\u1EADt l\xF2ng ai!" },
    { id: "ACT_FB_14", noticeType: "ACTIVE_STEAL_FALLBACK", title: "KH\xD4NG V\u1EC0 TAY TR\u1EAENG!", text: "Tuy\u1EC7t \u0111\u1ED1i kh\xF4ng ra v\u1EC1 tay kh\xF4ng! {actor} l\u0129nh th\u01B0\u1EDFng tr\u1ECDn v\u1EB9n n\u1EEDa \u0111i\u1EC3m c\xE2u (+{points}\u0111) t\u1EEB h\u1EC7 th\u1ED1ng!" },
    { id: "ACT_FB_15", noticeType: "ACTIVE_STEAL_FALLBACK", title: "C\xC2N B\u1EB0NG \u0110\u1ECANH M\u1EC6NH!", text: "Lu\u1EADt c\xF4ng b\u1EB1ng \u0111\u01B0\u1EE3c th\u1EF1c thi! {actor} b\u1ECF t\xFAi +{points}\u0111 nh\u1EB9 nh\xE0ng, ti\u1EBFp t\u1EE5c h\xE0nh tr\xECnh s\u0103n c\xFAp!" }
  ],
  // 5. Đội đang chơi dừng lại nhận thưởng an toàn từ cánh cổng cược
  ACTIVE_GAMBLE_STOP: [
    { id: "ACT_GMB_01", noticeType: "ACTIVE_GAMBLE_STOP", title: "D\u1EEANG L\u1EA0I T\u1EC8NH T\xC1O!", text: "Bi\u1EBFt \u0111\u1EE7 l\xE0 h\u1EA1nh ph\xFAc! {actor} ch\u1ECDn d\u1EEBng l\u1EA1i b\u1EA3o to\xE0n th\xE0nh qu\u1EA3 +{points}\u0111 an to\xE0n tuy\u1EC7t \u0111\u1ED1i!" },
    { id: "ACT_GMB_02", noticeType: "ACTIVE_GAMBLE_STOP", title: "QUY\u1EBET \u0110\u1ECANH TH\xD4NG MINH!", text: "C\xE1i \u0111\u1EA7u l\u1EA1nh c\u1EE7a nh\xE0 v\xF4 \u0111\u1ECBch! {actor} ch\u1ED1t h\u1EA1 ngay +{points}\u0111, kh\xF4ng cho r\u1EE7i ro c\xF3 c\u01A1 h\u1ED9i xu\u1EA5t hi\u1EC7n!" },
    { id: "ACT_GMB_03", noticeType: "ACTIVE_GAMBLE_STOP", title: "B\u1EA2O TO\xC0N CHI\u1EBEN L\u1EE2I PH\u1EA8M!", text: "Pha x\u1EED l\xFD ch\u1EAFc nh\u01B0 b\u1EAFp! {actor} c\u1EA5t ngay +{points}\u0111 v\xE0o h\xF2m v\xE0 kh\xE9p l\u1EA1i c\xE1nh c\u1ED5ng \u0111\xE1nh c\u01B0\u1EE3c!" },
    { id: "ACT_GMB_04", noticeType: "ACTIVE_GAMBLE_STOP", title: "B\u1EA2N L\u0128NH T\u1EF0 CH\u1EE6!", text: "Kh\xF4ng b\u1ECB c\xE1m d\u1ED7 khu\u1EA5t ph\u1EE5c! {actor} h\xE0i l\xF2ng mang v\u1EC1 +{points}\u0111 \u0111i\u1EC3m th\u01B0\u1EDFng ch\u1EAFc ch\u1EAFn!" },
    { id: "ACT_GMB_05", noticeType: "ACTIVE_GAMBLE_STOP", title: "TI\xCDCH TI\u1EC2U TH\xC0NH \u0110\u1EA0I!", text: "Ch\u1EADm m\xE0 ch\u1EAFc! {actor} gom th\xEAm +{points}\u0111 an to\xE0n, x\xE2y ch\u1EAFc n\u1EC1n m\xF3ng chi\u1EBFn th\u1EAFng!" },
    { id: "ACT_GMB_06", noticeType: "ACTIVE_GAMBLE_STOP", title: "C\u1EECA AN TO\xC0N \u0110\xC3 KH\xC9P!", text: "MC xin nhi\u1EC7t li\u1EC7t ch\xFAc m\u1EEBng quy\u1EBFt \u0111\u1ECBnh s\xE1ng su\u1ED1t c\u1EE7a {actor}: Nh\u1EADn tr\u1ECDn v\u1EB9n +{points}\u0111!" },
    { id: "ACT_GMB_07", noticeType: "ACTIVE_GAMBLE_STOP", title: "\u0110\xD3NG N\u1EAEP KHO B\xC1U!", text: "\u0110\xE3 kh\xF3a k\xE9t s\u1EAFt th\xE0nh c\xF4ng! {actor} an to\xE0n v\u1EDBi +{points}\u0111 trong s\u1EF1 th\xE1n ph\u1EE5c c\u1EE7a kh\xE1n gi\u1EA3!" },
    { id: "ACT_GMB_08", noticeType: "ACTIVE_GAMBLE_STOP", title: "CHI\u1EBEN THU\u1EACT B\u1EACC TH\u1EA6Y!", text: "Bi\u1EBFt ti\u1EBFn bi\u1EBFt tho\xE1i \u0111\xFAng l\xFAc! {actor} rinh v\u1EC1 +{points}\u0111 ng\u1ECDt ng\xE0o m\xE0 kh\xF4ng m\u1EA3y may s\u1EE9t m\u1EBB!" },
    { id: "ACT_GMB_09", noticeType: "ACTIVE_GAMBLE_STOP", title: "AN TO\xC0N L\xC0 B\u1EA0N!", text: "Ph\u01B0\u01A1ng ch\xE2m \u0103n ch\u1EAFc m\u1EB7c b\u1EC1n! {actor} nh\u1EADn n\xF3ng +{points}\u0111 v\xE0 nh\u01B0\u1EDDng l\u01B0\u1EE3t ch\u01A1i trong \xEAm \u0111\u1EB9p!" },
    { id: "ACT_GMB_10", noticeType: "ACTIVE_GAMBLE_STOP", title: "CH\u1ED0T \u0110\u01A0N TH\u1EAENG L\u1EE2I!", text: "Ch\u1ED1t \u0111\u01A1n th\xE0nh c\xF4ng r\u1EF1c r\u1EE1! {actor} \u0111\xFAt t\xFAi +{points}\u0111 \u0111i\u1EC3m s\u1ED1 v\u1EEFng ch\u1EAFc!" },
    { id: "ACT_GMB_11", noticeType: "ACTIVE_GAMBLE_STOP", title: "R\xDAT QU\xC2N H\u1EE2P L\xDD!", text: "Lui binh \u0111\xFAng th\u1EDDi kh\u1EAFc quy\u1EBFt \u0111\u1ECBnh! {actor} b\u1EA3o v\u1EC7 nguy\xEAn v\u1EB9n +{points}\u0111 danh gi\xE1!" },
    { id: "ACT_GMB_12", noticeType: "ACTIVE_GAMBLE_STOP", title: "T\u1EC8NH T\xC1O V\xC0 CH\xCDNH X\xC1C!", text: "Kh\xF4ng sa \u0111\xE0 v\xE0o may r\u1EE7i! {actor} mang +{points}\u0111 v\u1EC1 nh\xE0 trong n\u1EE5 c\u01B0\u1EDDi m\xE3n nguy\u1EC7n!" },
    { id: "ACT_GMB_13", noticeType: "ACTIVE_GAMBLE_STOP", title: "V\u1EEENG TAY L\xC1I!", text: "Tay l\xE1i l\u1EE5a tr\xE1nh m\u1ECDi \u1ED5 g\xE0! {actor} k\u1EBFt th\xFAc l\u01B0\u1EE3t ch\u01A1i m\u0129 m\xE3n v\u1EDBi +{points}\u0111 tr\u1ECDn g\xF3i!" },
    { id: "ACT_GMB_14", noticeType: "ACTIVE_GAMBLE_STOP", title: "CHI\u1EBEN L\u01AF\u1EE2C D\xC0I H\u01A0I!", text: "Nh\xECn xa tr\xF4ng r\u1ED9ng! {actor} l\u1EA5y ch\u1EAFc +{points}\u0111 \u0111\u1EC3 d\u1ED3n s\u1EE9c cho c\xE1c th\u1EED th\xE1ch l\u1EDBn h\u01A1n ph\xEDa tr\u01B0\u1EDBc!" },
    { id: "ACT_GMB_15", noticeType: "ACTIVE_GAMBLE_STOP", title: "B\xC0I H\u1ECCC V\xC0NG V\u1EC0 T\xCDNH TO\xC1N!", text: "M\u1ED9t pha d\u1EEBng b\u01B0\u1EDBc m\u1EABu m\u1EF1c! {actor} ghi th\xEAm +{points}\u0111 v\xE0o b\u1EA3ng v\xE0ng th\xE0nh t\xEDch!" }
  ],
  // 6. Đội đang chơi vượt qua chế độ sinh tử an toàn (Thoát hiểm)
  ACTIVE_SURVIVAL_ESCAPE: [
    { id: "ACT_SRV_ESC_01", noticeType: "ACTIVE_SURVIVAL_ESCAPE", title: "THO\xC1T HI\u1EC2M NGO\u1EA0N M\u1EE4C!", text: "Th\u1EA7n k\u1EF3 \u0111\u1EBFn kh\xF3 tin! {actor} \u0111\xE3 b\u01B0\u1EDBc qua C\u1EEDa Sinh T\u1EED nguy\xEAn v\u1EB9n, b\u1EA3o to\xE0n tuy\u1EC7t \u0111\u1ED1i \u0111i\u1EC3m s\u1ED1 v\xE0 tim!" },
    { id: "ACT_SRV_ESC_02", noticeType: "ACTIVE_SURVIVAL_ESCAPE", title: "S\u1ED0NG S\xD3T K\u1EF2 DI\u1EC6U!", text: "C\u1EA3 kh\xE1n ph\xF2ng n\xEDn th\u1EDF r\u1ED3i v\u1EE1 \xF2a! {actor} \u0111\xE3 s\u1ED1ng s\xF3t sau th\u1EED th\xE1ch Sinh T\u1EED \u0111\u1EA7y cam go!" },
    { id: "ACT_SRV_ESC_03", noticeType: "ACTIVE_SURVIVAL_ESCAPE", title: "B\xC0N TAY \u0110\u1ECANH M\u1EC6NH!", text: "B\xECnh y\xEAn tho\xE1t n\u1EA1n! {actor} \u0111\xE3 ch\u1ECDn \u0111\xFAng c\xE1nh c\u1EEDa th\u1EA7n k\u1EF3, \u0111i\u1EC3m s\u1ED1 v\xE0 sinh m\u1EA1ng \u0111\u01B0\u1EE3c gi\u1EEF v\u1EEFng!" },
    { id: "ACT_SRV_ESC_04", noticeType: "ACTIVE_SURVIVAL_ESCAPE", title: "PH\xC9P M\xC0U XU\u1EA4T HI\u1EC6N!", text: "M\u1ED9t ph\xE9p m\xE0u gi\u1EEFa hi\u1EC3m nguy! {actor} xu\u1EA5t s\u1EAFc v\u01B0\u1EE3t qua b\u1EABy t\u1EED th\u1EA7n m\xE0 kh\xF4ng m\u1EA5t m\u1ED9t gi\u1ECDt m\u1ED3 h\xF4i!" },
    { id: "ACT_SRV_ESC_05", noticeType: "ACTIVE_SURVIVAL_ESCAPE", title: "B\u01AF\u1EDAC CH\xC2N T\u1EEC T\u1EBE!", text: "V\u1EADn may c\u1EE7a k\u1EBB d\u0169ng c\u1EA3m! {actor} an to\xE0n b\u01B0\u1EDBc ra kh\u1ECFi khu v\u1EF1c nguy hi\u1EC3m trong tr\xE0ng ph\xE1o tay gi\xF2n gi\xE3!" },
    { id: "ACT_SRV_ESC_06", noticeType: "ACTIVE_SURVIVAL_ESCAPE", title: "H\xDA V\xCDA V\u1EC0 \u0110\xCDCH!", text: "Tim \u0111\u1EADp ch\xE2n run nh\u01B0ng k\u1EBFt qu\u1EA3 ng\u1ECDt ng\xE0o! {actor} b\u1EA3o v\u1EC7 nguy\xEAn v\u1EB9n h\xE0nh trang thi \u0111\u1EA5u!" },
    { id: "ACT_SRV_ESC_07", noticeType: "ACTIVE_SURVIVAL_ESCAPE", title: "V\u01AF\u1EE2T B\xC3O B\xCCNH AN!", text: "C\u01A1n b\xE3o Sinh T\u1EED kh\xF4ng th\u1EC3 qu\u1EADt ng\xE3 {actor}! \u0110i\u1EC3m s\u1ED1 c\u1EE7a b\u1EA1n v\u1EABn \u0111\u1EE9ng v\u1EEFng nh\u01B0 b\xE0n th\u1EA1ch!" },
    { id: "ACT_SRV_ESC_08", noticeType: "ACTIVE_SURVIVAL_ESCAPE", title: "C\xDA L\xC1CH KHE C\u1EECA H\u1EB8P!", text: "Khe c\u1EEDa h\u1EB9p 20% \u0111\xE3 m\u1EDF ra cho {actor}! C\xFA \u0111\xE0o tho\xE1t ngo\u1EA1n m\u1EE5c x\u1EE9ng \u0111\xE1ng l\u01B0u v\xE0o l\u1ECBch s\u1EED!" },
    { id: "ACT_SRV_ESC_09", noticeType: "ACTIVE_SURVIVAL_ESCAPE", title: "T\xC1I SINH T\u1EEA HI\u1EC2M NGUY!", text: "B\u1EA3n l\u0129nh ki\xEAn c\u01B0\u1EDDng \u0111\xE3 c\u1EE9u {actor}! To\xE0n b\u1ED9 \u0111i\u1EC3m s\u1ED1 \u0111\u01B0\u1EE3c ni\xEAm phong an to\xE0n tuy\u1EC7t \u0111\u1ED1i!" },
    { id: "ACT_SRV_ESC_10", noticeType: "ACTIVE_SURVIVAL_ESCAPE", title: "\xC1NH S\xC1NG N\u01A0I \u0110\xC1Y V\u1EF0C!", text: "\xC1nh s\xE1ng hy v\u1ECDng \u0111\xE3 d\u1EABn l\u1ED1i {actor} tho\xE1t kh\u1ECFi b\xF3ng t\u1ED1i Sinh T\u1EED trong gang t\u1EA5c!" },
    { id: "ACT_SRV_ESC_11", noticeType: "ACTIVE_SURVIVAL_ESCAPE", title: "V\u1EACN \u0110\u1ECE \u0110\u1EC8NH CAO!", text: "Ai b\u1EA3o tr\u1EA3 l\u1EDDi sai l\xE0 m\u1EA5t t\u1EA5t c\u1EA3? {actor} v\u1EEBa ch\u1EE9ng minh v\u1EADn may \u0111\u1EC9nh cao c\u1EE7a m\xECnh!" },
    { id: "ACT_SRV_ESC_12", noticeType: "ACTIVE_SURVIVAL_ESCAPE", title: "B\u1EA2O TO\xC0N TR\u1ECCN V\u1EB8N!", text: "Kh\xF4ng x\xE2y x\u01B0\u1EDBc m\u1ED9t ch\xFAt n\xE0o! {actor} ng\u1EA9ng cao \u0111\u1EA7u b\u01B0\u1EDBc ti\u1EBFp v\xE0o ch\u1EB7ng \u0111ua sinh t\u1EED!" },
    { id: "ACT_SRV_ESC_13", noticeType: "ACTIVE_SURVIVAL_ESCAPE", title: "N\u1EE4 C\u01AF\u1EDCI CHI\u1EBEN BINH!", text: "Chi\u1EBFn binh b\u1EA5t t\u1EED {actor} v\u01B0\u1EE3t qua c\u1EA1m b\u1EABy trong s\u1EF1 th\xE1n ph\u1EE5c c\u1EE7a to\xE0n th\u1EC3 \u0111\u1ED1i th\u1EE7!" },
    { id: "ACT_SRV_ESC_14", noticeType: "ACTIVE_SURVIVAL_ESCAPE", title: "\u0110\u1EA8Y L\xD9I TAI H\u1ECCA!", text: "Tai \u01B0\u01A1ng tan bi\u1EBFn! {actor} b\u1EA3o to\xE0n nguy\xEAn v\u1EB9n s\u1ED1 tim v\xE0 \u0111i\u1EC3m s\u1ED1 qu\xFD gi\xE1!" },
    { id: "ACT_SRV_ESC_15", noticeType: "ACTIVE_SURVIVAL_ESCAPE", title: "C\xDA THO\xC1T TIM \u0110\u1EACP NHANH!", text: "Tr\u1EADn h\xFA v\xEDa \u0111\xE1ng nh\u1EDB! {actor} an to\xE0n tuy\u1EC7t \u0111\u1ED1i, s\u1EB5n s\xE0ng ph\u1EA3n c\xF4ng \u1EDF v\xF2ng sau!" }
  ],
  // 7. Đội đang chơi gục ngã ở chế độ sinh tử (Thất bại)
  ACTIVE_SURVIVAL_FAIL: [
    { id: "ACT_SRV_FAL_01", noticeType: "ACTIVE_SURVIVAL_FAIL", title: "G\u1EE4C NG\xC3 TR\u01AF\u1EDAC C\u1EECA T\u1EEC!", text: "R\u1EA5t ti\u1EBFc cho {actor}! V\xF2ng quay Sinh T\u1EED kh\u1EAFc nghi\u1EC7t \u0111\xE3 k\xEDch ho\u1EA1t b\u1EABy ph\u1EA1t tr\u1EEB -{points}\u0111!" },
    { id: "ACT_SRV_FAL_02", noticeType: "ACTIVE_SURVIVAL_FAIL", title: "\u0110\u1ECANH M\u1EC6NH NGHI\u1EC6T NG\xC3!", text: "M\u1ED9t c\xFA s\u1ED1c l\u1EDBn! {actor} kh\xF4ng th\u1EC3 v\u01B0\u1EE3t qua c\u1EA1m b\u1EABy sinh t\u1EED v\xE0 b\u1ECB tr\u1EEB -{points}\u0111!" },
    { id: "ACT_SRV_FAL_03", noticeType: "ACTIVE_SURVIVAL_FAIL", title: "C\xC1NH C\u1EECA KH\xC9P L\u1EA0I!", text: "C\xE1nh c\u1EEDa hy v\u1ECDng \u0111\xE3 \u0111\xF3ng s\u1EADp! {actor} nh\u1EADn \xE1n ph\u1EA1t -{points}\u0111 t\u1EEB \u0111\u1EA5u tr\u01B0\u1EDDng sinh t\u1EED!" },
    { id: "ACT_SRV_FAL_04", noticeType: "ACTIVE_SURVIVAL_FAIL", title: "T\u1ED4N TH\u1EA4T N\u1EB6NG N\u1EC0!", text: "C\xE1i gi\xE1 ph\u1EA3i tr\u1EA3 cho s\u1EF1 s\u01A1 s\u1EA9y! {actor} b\u1ECB t\u01B0\u1EDBc \u0111i -{points}\u0111, c\u1ED1 g\u1EAFng g\u01B0\u1EE3ng d\u1EADy \u1EDF v\xF2ng sau!" },
    { id: "ACT_SRV_FAL_05", noticeType: "ACTIVE_SURVIVAL_FAIL", title: "S\xD3NG GI\xD3 CU\u1ED0N TR\xD4I!", text: "C\u01A1n th\u1ECBnh n\u1ED9 c\u1EE7a Sinh T\u1EED \u0111\xE3 qu\xE9t qua {actor}! \u0110i\u1EC3m s\u1ED1 b\u1ECB hao h\u1EE5t -{points}\u0111!" },
    { id: "ACT_SRV_FAL_06", noticeType: "ACTIVE_SURVIVAL_FAIL", title: "B\xC0I TO\xC1N KH\xD3 C\u1EE6A S\u1ED0 PH\u1EACN!", text: "Th\u1EA7n may m\u1EAFn \u0111\xE3 ngo\u1EA3nh m\u1EB7t l\u1EA7n n\xE0y! {actor} ch\u1ECBu t\u1ED5n th\u01B0\u01A1ng -{points}\u0111 t\u1EEB c\u1EA1m b\u1EABy!" },
    { id: "ACT_SRV_FAL_07", noticeType: "ACTIVE_SURVIVAL_FAIL", title: "H\u1EE8NG CH\u1ECAU TR\u1EEA \u0110I\u1EC2M!", text: "\u0110\xF2n ph\u1EA1t kh\xF4ng th\u1EC3 n\xE9 tr\xE1nh! {actor} b\u1ECB gi\u1EA3m -{points}\u0111, cu\u1ED9c \u0111ua l\u1EA1i th\xEAm ph\u1EA7n ch\xF4ng gai!" },
    { id: "ACT_SRV_FAL_08", noticeType: "ACTIVE_SURVIVAL_FAIL", title: "K\xC9O L\xD9I B\u1EA2NG \u0110I\u1EC2M!", text: "V\u1EA5p ng\xE3 \u0111au \u0111\u1EDBn n\u01A1i t\u1EED \u0111\u1ECBa! {actor} ng\u1EADm ng\xF9i \u0111\u1EC3 r\u01A1i -{points}\u0111 t\u1EA1i v\xF2ng ch\u01A1i n\xE0y!" },
    { id: "ACT_SRV_FAL_09", noticeType: "ACTIVE_SURVIVAL_FAIL", title: "B\u1EA2N L\u0128NH D\u01AF\u1EDAI TH\u1EEC TH\xC1CH!", text: "Th\u1EA5t b\u1EA1i l\xE0 m\u1EB9 th\xE0nh c\xF4ng! D\xF9 b\u1ECB tr\u1EEB -{points}\u0111, h\xE3y gi\u1EEF v\u1EEFng tinh th\u1EA7n th\xE9p nh\xE9 {actor}!" },
    { id: "ACT_SRV_FAL_10", noticeType: "ACTIVE_SURVIVAL_FAIL", title: "\u0110\xCAM T\u1ED0I TR\u01AF\u1EDAC B\xCCNH MINH!", text: "Kho\u1EA3nh kh\u1EAFc kh\xF3 kh\u0103n nh\u1EA5t c\u1EE7a {actor}! M\u1EA5t -{points}\u0111 nh\u01B0ng c\u01A1 h\u1ED9i l\u1ED9i ng\u01B0\u1EE3c d\xF2ng v\u1EABn c\xF2n!" },
    { id: "ACT_SRV_FAL_11", noticeType: "ACTIVE_SURVIVAL_FAIL", title: "\xC1P L\u1EF0C \u0110\xC8 N\u1EB6NG!", text: "C\u1EA1m b\u1EABy sinh t\u1EED \u0111\xE3 si\u1EBFt ch\u1EB7t! {actor} b\u1ECB kh\u1EA5u tr\u1EEB -{points}\u0111 v\xE0o t\xE0i kho\u1EA3n \u0111i\u1EC3m s\u1ED1!" },
    { id: "ACT_SRV_FAL_12", noticeType: "ACTIVE_SURVIVAL_FAIL", title: "C\xDA S\u1EA8Y CH\xC2N \u0110\xC1NG TI\u1EBEC!", text: "Ch\u1EC9 thi\u1EBFu m\u1ED9t ch\xFAt may m\u1EAFn n\u1EEFa th\xF4i! {actor} \u0111\xE0nh ch\u1EA5p nh\u1EADn kho\u1EA3n ph\u1EA1t -{points}\u0111!" },
    { id: "ACT_SRV_FAL_13", noticeType: "ACTIVE_SURVIVAL_FAIL", title: "L\u1EDCI C\u1EA2NH T\u1EC8NH \u0110ANH TH\xC9P!", text: "L\u1EDDi c\u1EA3nh b\xE1o gay g\u1EAFt t\u1EEB \u0111\u1EA5u tr\u01B0\u1EDDng! {actor} hao h\u1EE5t -{points}\u0111, c\u1EA7n c\u1EA9n tr\u1ECDng h\u01A1n \u1EDF c\xE2u h\u1ECFi t\u1EDBi!" },
    { id: "ACT_SRV_FAL_14", noticeType: "ACTIVE_SURVIVAL_FAIL", title: "V\u01AF\u1EE2T KH\xD3 KH\u0102N \u0110\u1EC2 TR\u01AF\u1EDENG TH\xC0NH!", text: "T\u1ED5n th\u1EA5t -{points}\u0111 kh\xF4ng th\u1EC3 d\u1EADp t\u1EAFt ng\u1ECDn l\u1EEDa quy\u1EBFt t\xE2m c\u1EE7a {actor}!" },
    { id: "ACT_SRV_FAL_15", noticeType: "ACTIVE_SURVIVAL_FAIL", title: "CH\u1ECAU PH\u1EA0T V\xC0 TI\u1EBEP B\u01AF\u1EDAC!", text: "Ch\u1EA5p nh\u1EADn h\xECnh ph\u1EA1t -{points}\u0111 v\xE0 h\u01B0\u1EDBng v\u1EC1 ph\xEDa tr\u01B0\u1EDBc! Ch\u1EB7ng \u0111\u01B0\u1EDDng v\u1EABn c\xF2n nhi\u1EC1u b\u1EA5t ng\u1EDD!" }
  ],
  // 8. Đội bị cướp điểm bởi lá CHIẾN XA VII (-50% điểm gốc)
  VICTIM_STOLEN_CHARIOT: [
    { id: "VIC_CHA_01", noticeType: "VICTIM_STOLEN_CHARIOT", title: "CHI\u1EBEN XA QU\xC9T QUA!", text: "MC kh\u1EA9n c\u1EA5p b\xE1o tin: C\u1ED7 Chi\u1EBFn Xa d\u0169ng m\xE3nh c\u1EE7a {actor} v\u1EEBa c\xE0n qu\xE9t qua, cu\u1ED1n ph\u0103ng {points}\u0111 c\u1EE7a \u0111\u1ED9i b\u1EA1n!" },
    { id: "VIC_CHA_02", noticeType: "VICTIM_STOLEN_CHARIOT", title: "B\u1ECA C\u01AF\u1EDAP \u0110I\u1EC2M CH\u1EDAP NHO\xC1NG!", text: "\u1ED0i gi\u1EDDi \u01A1i! Chi\u1EBFn Xa th\u1EA7n t\u1ED1c c\u1EE7a {actor} v\u1EEBa ph\xF3ng v\xE8o qua v\xE0 t\u01B0\u1EDBc m\u1EA5t {points}\u0111 t\u1EEB kho \u0111i\u1EC3m c\u1EE7a b\u1EA1n!" },
    { id: "VIC_CHA_03", noticeType: "VICTIM_STOLEN_CHARIOT", title: "M\u1ED8T C\xDA \u0110\u1ED8T K\xCDCH B\u1EA4T NG\u1EDC!", text: "{actor} \u0111\xE3 nh\u1EAFm tr\xFAng \u0111\u1ED9i b\u1EA1n! L\xE1 b\xE0i Chi\u1EBFn Xa \u0111\xE3 l\u1EA5y \u0111i {points}\u0111 c\u1EE7a b\u1EA1n mang v\u1EC1 k\xE9t s\u1EAFt c\u1EE7a h\u1ECD!" },
    { id: "VIC_CHA_04", noticeType: "VICTIM_STOLEN_CHARIOT", title: "HAO H\u1EE4T CHI\u1EBEN THU\u1EACT!", text: "Tin bu\u1ED3n t\u1EEB \u0111\u1EA5u tr\u01B0\u1EDDng: \u0110\u1ED9i b\u1EA1n v\u1EEBa b\u1ECB {actor} 'm\u01B0\u1EE3n t\u1EA1m' {points}\u0111 b\u1EB1ng s\u1EE9c m\u1EA1nh c\u1ED7 Chi\u1EBFn Xa!" },
    { id: "VIC_CHA_05", noticeType: "VICTIM_STOLEN_CHARIOT", title: "B\xC1NH XE CU\u1ED0N \u0110I\u1EC2M!", text: "B\xE1nh xe Chi\u1EBFn Xa l\u0103n qua kh\xF4ng ch\u1EEBa l\u1EA1i g\xEC! B\u1EA1n b\u1ECB tr\u1EEB {points}\u0111 chuy\u1EC3n th\u1EB3ng sang t\xE0i kho\u1EA3n {actor}!" },
    { id: "VIC_CHA_06", noticeType: "VICTIM_STOLEN_CHARIOT", title: "TAI N\u1EA0N NGO\xC0I L\u01AF\u1EE2T!", text: "\u0110ang ng\u1ED3i y\xEAn c\u0169ng b\u1ECB d\xEDnh \u0111\xF2n! {actor} d\xF9ng Chi\u1EBFn Xa gh\xE9 th\u0103m v\xE0 mang \u0111i {points}\u0111 c\u1EE7a b\u1EA1n!" },
    { id: "VIC_CHA_07", noticeType: "VICTIM_STOLEN_CHARIOT", title: "C\xDA T\u1EACP K\xCDCH B\u1EA4T NG\u1EDC!", text: "Th\u1EADt kh\xF4ng may! \u0110\u1ED9i b\u1EA1n tr\u1EDF th\xE0nh m\u1EE5c ti\xEAu c\u1EE7a c\u1ED7 Chi\u1EBFn Xa do {actor} \u0111i\u1EC1u khi\u1EC3n: M\u1EA5t -{points}\u0111!" },
    { id: "VIC_CHA_08", noticeType: "VICTIM_STOLEN_CHARIOT", title: "S\xD3C V\xCC B\u1ECA T\u01AF\u1EDAC \u0110I\u1EC2M!", text: "M\u1ED9t phen h\xFA v\xEDa! {actor} \u0111\xE3 k\xEDch ho\u1EA1t Chi\u1EBFn Xa v\xE0 r\xFAt b\u1EDBt {points}\u0111 t\u1EEB kho b\xE1u c\u1EE7a \u0111\u1ED9i b\u1EA1n!" },
    { id: "VIC_CHA_09", noticeType: "VICTIM_STOLEN_CHARIOT", title: "C\u1EA6N PH\u1EE4C TH\xD9 G\u1EA4P!", text: "B\u1ECB {actor} l\u1EA5y m\u1EA5t {points}\u0111 b\u1EB1ng Chi\u1EBFn Xa r\u1ED3i! H\xE3y m\xE0i s\u1EAFc v\u0169 kh\xED \u0111\u1EC3 ph\u1EE5c th\xF9 ngay v\xF2ng t\u1EDBi!" },
    { id: "VIC_CHA_10", noticeType: "VICTIM_STOLEN_CHARIOT", title: "B\xC3O CHI\u1EBEN XA C\xC0N QU\xC9T!", text: "C\u01A1n l\u1ED1c Chi\u1EBFn Xa c\u1EE7a {actor} \u0111\xE3 th\u1ED5i bay {points}\u0111 c\u1EE7a \u0111\u1ED9i b\u1EA1n trong s\u1EF1 ng\u1EE1 ng\xE0ng c\u1EE7a kh\xE1n gi\u1EA3!" },
    { id: "VIC_CHA_11", noticeType: "VICTIM_STOLEN_CHARIOT", title: "M\u1EA4T M\xC1C B\u1EA4T \u0110\u1EAEC D\u0128!", text: "\u0110\u1ED9i b\u1EA1n v\u1EEBa b\u1ECB tr\u1EEB {points}\u0111 do {actor} b\u1ED1c tr\xFAng Chi\u1EBFn Xa! Gi\u1EDD b\u1EA1n \u0111\xE3 nh\u1EADn \u0111\u01B0\u1EE3c quy\u1EC1n mi\u1EC5n nhi\u1EC5m c\u01B0\u1EDBp!" },
    { id: "VIC_CHA_12", noticeType: "VICTIM_STOLEN_CHARIOT", title: "\u0110\xD2N \u0110\xC1NH C\u1EE6A K\u1EBA D\u1EAAN \u0110\u1EA6U!", text: "{actor} \u0111\xE3 t\u1EADn d\u1EE5ng s\u1EE9c m\u1EA1nh c\u1ED7 xe chi\u1EBFn \u0111\u1EC3 t\u01B0\u1EDBc \u0111i {points}\u0111 c\u1EE7a b\u1EA1n! \u0110\u1EEBng bu\u1ED3n, \u0111\u01B0\u1EDDng d\xE0i m\u1EDBi bi\u1EBFt ng\u1EF1a hay!" },
    { id: "VIC_CHA_13", noticeType: "VICTIM_STOLEN_CHARIOT", title: "B\xC0N TAY C\xD4NG L\xDD \u0110\xC2U R\u1ED2I?", text: "Chi\u1EBFn Xa c\u1EE7a {actor} qu\xE1 hung h\xE3n, \u0111\u1ED9i b\u1EA1n b\u1ECB tr\u1EEB -{points}\u0111! H\xE3y ch\u1EDD th\u1EDDi c\u01A1 l\u1EADt ng\u01B0\u1EE3c v\xE1n c\u1EDD!" },
    { id: "VIC_CHA_14", noticeType: "VICTIM_STOLEN_CHARIOT", title: "T\u1ED4N TH\u1EA4T \u0110I\u1EC2M S\u1ED0!", text: "S\u1ED1 \u0111i\u1EC3m -{points}\u0111 \u0111\xE3 b\u1ED1c h\u01A1i kh\u1ECFi t\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n v\xE0 bay th\u1EB3ng sang \u0111\u1ED9i {actor}!" },
    { id: "VIC_CHA_15", noticeType: "VICTIM_STOLEN_CHARIOT", title: "H\xC3Y BI\u1EBEN \u0110AU TH\u01AF\u01A0NG TH\xC0NH S\u1EE8C M\u1EA0NH!", text: "B\u1ECB {actor} cu\u1ED7m m\u1EA5t {points}\u0111 \u01B0? \u0110\u1EEBng lo l\u1EAFng, c\u01A1 h\u1ED9i tr\u1EA3 \u0111\u0169a s\u1EBD \u0111\u1EBFn ngay trong l\u01B0\u1EE3t ch\u01A1i ti\u1EBFp theo!" }
  ],
  // 9. Đội bị cướp điểm bởi lá THẦN CHẾT XIII (-100% hoặc -50% điểm gốc)
  VICTIM_STOLEN_DEATH: [
    { id: "VIC_DTH_01", noticeType: "VICTIM_STOLEN_DEATH", title: "L\u01AF\u1EE0I H\xC1I T\u1EEC TH\u1EA6N!", text: "Ti\u1EBFng chu\xF4ng t\u1EED th\u1EA7n vang l\xEAn! {actor} \u0111\xE3 tri\u1EC7u h\u1ED3i Th\u1EA7n Ch\u1EBFt XIII, tr\u1EA3m m\u1EA5t -{points}\u0111 t\u1EEB t\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n!" },
    { id: "VIC_DTH_02", noticeType: "VICTIM_STOLEN_DEATH", title: "C\xDA S\u1ED0C L\u1EDAN T\u1EA0I \u0110\u1EA4U TR\u01AF\u1EDCNG!", text: "M\u1ED9t c\xFA s\u1ED1c c\u1EF1c l\u1EDBn! {actor} r\xFAt tr\xFAng l\xE1 Th\u1EA7n Ch\u1EBFt v\xE0 h\xFAt c\u1EA1n {points}\u0111 t\u1EEB b\u1EA1n. \u0110au \u0111\u1EDBn nh\u01B0ng cu\u1ED9c ch\u01A1i v\u1EABn ti\u1EBFp di\u1EC5n!" },
    { id: "VIC_DTH_03", noticeType: "VICTIM_STOLEN_DEATH", title: "\u0110O\u1EA0T M\u1EC6NH T\xC0I KHO\u1EA2N!", text: "Th\u1EA7n Ch\u1EBFt kh\xF4ng tha cho ai! \u0110\u1ED9i b\u1EA1n b\u1ECB {actor} \u0111o\u1EA1t m\u1EC7nh t\u01B0\u1EDBc \u0111i tr\u1ECDn v\u1EB9n {points}\u0111 chuy\u1EC3n sang qu\u1EF9 c\u1EE7a h\u1ECD!" },
    { id: "VIC_DTH_04", noticeType: "VICTIM_STOLEN_DEATH", title: "B\xC3O T\xC1P GI\xC1NG XU\u1ED0NG!", text: "\u0110\xF2n tr\u1EEBng ph\u1EA1t kh\u1ED1c li\u1EC7t t\u1EEB Th\u1EA7n Ch\u1EBFt! B\u1EA1n v\u1EEBa b\u1ECB {actor} tr\u1EEB s\u1EA1ch {points}\u0111 trong ch\u1EDBp m\u1EAFt!" },
    { id: "VIC_DTH_05", noticeType: "VICTIM_STOLEN_DEATH", title: "R\xDAT RU\u1ED8T KHO B\xC1U!", text: "L\u01B0\u1EE1i h\xE1i vung l\xEAn trong \u0111\xEAm t\u1ED1i! {actor} \u0111\xE3 l\u1EA5y \u0111i {points}\u0111 t\u1EEB tay \u0111\u1ED9i b\u1EA1n! C\u1ED1 l\xEAn n\xE0o c\xE1c chi\u1EBFn binh!" },
    { id: "VIC_DTH_06", noticeType: "VICTIM_STOLEN_DEATH", title: "C\u01A0N \xC1C M\u1ED8NG TH\u1EF0C S\u1EF0!", text: "M\u1ED9t c\u01A1n \xE1c m\u1ED9ng ngo\xE0i l\u01B0\u1EE3t ch\u01A1i! {actor} tri\u1EC7u h\u1ED3i Th\u1EA7n Ch\u1EBFt t\u01B0\u1EDBc m\u1EA5t {points}\u0111 c\u1EE7a \u0111\u1ED9i b\u1EA1n!" },
    { id: "VIC_DTH_07", noticeType: "VICTIM_STOLEN_DEATH", title: "M\u1EA4T M\xC1C N\u1EB6NG N\u1EC0!", text: "T\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n v\u1EEBa hao h\u1EE5t -{points}\u0111 v\xEC l\xE1 Th\u1EA7n Ch\u1EBFt c\u1EE7a {actor}! Gi\u1EDD b\u1EA1n \u0111\xE3 c\xF3 khi\xEAn b\u1EA3o h\u1ED9 t\u1ED1i \u0111a!" },
    { id: "VIC_DTH_08", noticeType: "VICTIM_STOLEN_DEATH", title: "\u0110\u1ECANH M\u1EC6NH KH\u1EAEC NGHI\u1EC6T!", text: "L\xE1 b\xE0i \u0111\xE1ng s\u1EE3 nh\u1EA5t \u0111\xE3 g\u1ECDi t\xEAn \u0111\u1ED9i b\u1EA1n! {actor} h\xFAt v\u1EC1 +{points}\u0111 t\u1EEB kho \u0111i\u1EC3m c\u1EE7a b\u1EA1n!" },
    { id: "VIC_DTH_09", noticeType: "VICTIM_STOLEN_DEATH", title: "H\xC3Y \u0110\u1EE8NG D\u1EACY!", text: "B\u1ECB Th\u1EA7n Ch\u1EBFt gh\xE9 th\u0103m v\xE0 m\u1EA5t -{points}\u0111 cho {actor}, nh\u01B0ng ng\u1ECDn l\u1EEDa chi\u1EBFn \u0111\u1EA5u c\u1EE7a b\u1EA1n kh\xF4ng bao gi\u1EDD t\u1EAFt!" },
    { id: "VIC_DTH_10", noticeType: "VICTIM_STOLEN_DEATH", title: "C\xDA TR\u1EA2M CH\xCD M\u1EA0NG!", text: "L\u01B0\u1EE1i h\xE1i l\u1EA1nh l\xF9ng \u0111\xE3 l\u1EA5y \u0111i {points}\u0111 c\u1EE7a b\u1EA1n trao cho {actor}! C\u1EA3 h\u1ED9i tr\u01B0\u1EDDng l\u1EB7ng \u0111i v\xEC b\u1EA5t ng\u1EDD!" },
    { id: "VIC_DTH_11", noticeType: "VICTIM_STOLEN_DEATH", title: "H\xDA C\u1EA0N N\u0102NG L\u01AF\u1EE2NG!", text: "N\u0103ng l\u01B0\u1EE3ng b\u1ECB r\xFAt c\u1EA1n! {actor} v\u1EEBa th\u1EF1c hi\u1EC7n c\xFA c\u01B0\u1EDBp {points}\u0111 ngo\u1EA1n m\u1EE5c t\u1EEB \u0111\u1ED9i b\u1EA1n!" },
    { id: "VIC_DTH_12", noticeType: "VICTIM_STOLEN_DEATH", title: "\xC1P \u0110\u1EA2O T\xC2M L\xDD!", text: "\u0110\u1EEBng \u0111\u1EC3 b\u1ECB dao \u0111\u1ED9ng! D\xF9 b\u1ECB {actor} l\u1EA5y m\u1EA5t {points}\u0111, quy\u1EC1n t\u1EF1 quy\u1EBFt v\u1EABn n\u1EB1m trong tay b\u1EA1n \u1EDF c\xE1c v\xF2ng t\u1EDBi!" },
    { id: "VIC_DTH_13", noticeType: "VICTIM_STOLEN_DEATH", title: "B\xD3NG MA TR\u01AF\u1EDCNG QUAY!", text: "B\xF3ng ma Th\u1EA7n Ch\u1EBFt \u0111\xE3 ch\u1ECDn \u0111\u1ED9i b\u1EA1n l\xE0m n\u1EA1n nh\xE2n: B\u1ECB tr\u1EEB -{points}\u0111 chuy\u1EC3n sang k\xE9t s\u1EAFt c\u1EE7a {actor}!" },
    { id: "VIC_DTH_14", noticeType: "VICTIM_STOLEN_DEATH", title: "T\u1ED4N TH\u1EA4T KH\xD3 QU\xCAN!", text: "M\u1ED9t k\u1EF7 ni\u1EC7m nh\u1EDB \u0111\u1EDDi! {actor} v\u1EEBa c\u01B0\u1EDBp \u0111i {points}\u0111 c\u1EE7a \u0111\u1ED9i b\u1EA1n b\u1EB1ng l\xE1 b\xE0i t\u1EED th\u1EA7n XIII!" },
    { id: "VIC_DTH_15", noticeType: "VICTIM_STOLEN_DEATH", title: "CHU\u1EA8N B\u1ECA PH\u1EE4C TH\xD9!", text: "Kho\u1EA3nh kh\u1EAFc \u0111au \u0111\u1EDBn b\u1ECB tr\u1EEB -{points}\u0111 b\u1EDFi {actor} s\u1EBD l\xE0 \u0111\u1ED9ng l\u1EF1c l\u1EDBn nh\u1EA5t \u0111\u1EC3 b\u1EA1n b\xF9ng n\u1ED5 ph\u1EE5c th\xF9!" }
  ],
  // 10. Đội được bảo vệ an toàn bởi Khiên Hộ Mệnh khi bị nhắm cướp
  VICTIM_PROTECTED_SHIELD: [
    { id: "VIC_PRT_01", noticeType: "VICTIM_PROTECTED_SHIELD", title: "KHI\xCAN TH\u1EA6N B\u1EA2O V\u1EC6!", text: "Th\u1EADt h\xFA v\xEDa! {actor} \u0111\u1ECBnh c\u01B0\u1EDBp \u0111i\u1EC3m c\u1EE7a b\u1EA1n nh\u01B0ng Khi\xEAn Mi\u1EC5n Nhi\u1EC5m \u0111\xE3 k\u1ECBp th\u1EDDi ch\u1EB7n \u0111\u1EE9ng, b\u1EA3o to\xE0n 0\u0111 m\u1EA5t m\xE1t!" },
    { id: "VIC_PRT_02", noticeType: "VICTIM_PROTECTED_SHIELD", title: "PH\xD2NG TH\u1EE6 TUY\u1EC6T \u0110\u1ED0I!", text: "C\xFA c\u01B0\u1EDBp c\u1EE7a {actor} b\u1EA5t th\xE0nh! B\u1EE9c t\u01B0\u1EDDng ki\xEAn c\u1ED1 \u0111\xE3 b\u1EA3o v\u1EC7 tr\u1ECDn v\u1EB9n \u0111i\u1EC3m s\u1ED1 c\u1EE7a \u0111\u1ED9i b\u1EA1n an to\xE0n tuy\u1EC7t \u0111\u1ED1i!" },
    { id: "VIC_PRT_03", noticeType: "VICTIM_PROTECTED_SHIELD", title: "B\u1EBA G\xC3Y \u0110\xD2N T\u1EA4N C\xD4NG!", text: "Kh\xF4ng d\u1EC5 x\u01A1i \u0111\xE2u nh\xE9 {actor}! Khi\xEAn h\u1ED9 m\u1EC7nh c\u1EE7a b\u1EA1n \u0111\xE3 b\u1EADt n\u1EA3y \u0111\xF2n c\u01B0\u1EDBp \u0111i\u1EC3m ra ngo\xE0i!" },
    { id: "VIC_PRT_04", noticeType: "VICTIM_PROTECTED_SHIELD", title: "THO\xC1T HI\u1EC2M AN TO\xC0N!", text: "M\u1ED9t pha b\u1EA3o v\u1EC7 ngo\u1EA1n m\u1EE5c! Nh\u1EDD c\u01A1 ch\u1EBF ch\u1ED1ng c\u01B0\u1EDBp li\xEAn ho\xE0n, \u0111\u1ED9i b\u1EA1n ho\xE0n to\xE0n b\xECnh an v\xF4 s\u1EF1!" },
    { id: "VIC_PRT_05", noticeType: "VICTIM_PROTECTED_SHIELD", title: "R\xC0O CH\u1EAEN TH\xC9P!", text: "{actor} \u0111\xE0nh b\u1EA5t l\u1EF1c tr\u01B0\u1EDBc t\u1EA5m khi\xEAn th\xE9p c\u1EE7a b\u1EA1n! \u0110i\u1EC3m s\u1ED1 c\u1EE7a \u0111\u1ED9i b\u1EA1n kh\xF4ng s\u1EE9t m\u1EBB m\u1ED9t ly!" },
    { id: "VIC_PRT_06", noticeType: "VICTIM_PROTECTED_SHIELD", title: "TI\xCAU TAN \xC2M M\u01AFU C\u01AF\u1EDAP \u0110I\u1EC2M!", text: "K\u1EBF ho\u1EA1ch c\u01B0\u1EDBp \u0111i\u1EC3m c\u1EE7a {actor} ph\xE1 s\u1EA3n ho\xE0n to\xE0n! \u0110\u1ED9i b\u1EA1n \u0111\u01B0\u1EE3c b\u1EA3o v\u1EC7 an to\xE0n 100%!" },
    { id: "VIC_PRT_07", noticeType: "VICTIM_PROTECTED_SHIELD", title: "V\u1EACN MAY C\u1EE6A K\u1EBA C\u1EA8N TR\u1ECCNG!", text: "S\u1EF1 ph\xF2ng b\u1ECB chu \u0111\xE1o \u0111\xE3 c\u1EE9u b\u1EA1n m\u1ED9t b\xE0n thua tr\xF4ng th\u1EA5y tr\u01B0\u1EDBc \u0111\xF2n t\u1EA5n c\xF4ng c\u1EE7a {actor}!" },
    { id: "VIC_PRT_08", noticeType: "VICTIM_PROTECTED_SHIELD", title: "B\u1EE8C T\u01AF\u1EDCNG MA THU\u1EACT!", text: "L\u1EF1c c\u1EA3n v\xF4 h\xECnh \u0111\xE3 b\u1EA3o v\u1EC7 kho b\xE1u c\u1EE7a b\u1EA1n tr\u01B0\u1EDBc \xE1nh m\u1EAFt th\xE8m thu\u1ED3ng c\u1EE7a {actor}!" },
    { id: "VIC_PRT_09", noticeType: "VICTIM_PROTECTED_SHIELD", title: "C\xD4NG B\u1EB0NG \u0110\u01AF\u1EE2C TH\u1EF0C THI!", text: "Lu\u1EADt b\u1EA3o v\u1EC7 ng\u01B0\u1EDDi y\u1EBFu th\u1EBF \u0111\xE3 ph\xE1t huy t\xE1c d\u1EE5ng! {actor} kh\xF4ng th\u1EC3 ch\u1EA1m v\xE0o \u0111i\u1EC3m s\u1ED1 c\u1EE7a b\u1EA1n!" },
    { id: "VIC_PRT_10", noticeType: "VICTIM_PROTECTED_SHIELD", title: "B\u1EA4T KH\u1EA2 X\xC2M PH\u1EA0M!", text: "L\xE3nh \u0111\u1ECBa c\u1EE7a b\u1EA1n l\xE0 b\u1EA5t kh\u1EA3 x\xE2m ph\u1EA1m! {actor} ng\u1EADm ng\xF9i tay tr\u1EAFng r\u1EDDi \u0111i!" },
    { id: "VIC_PRT_11", noticeType: "VICTIM_PROTECTED_SHIELD", title: "B\xC0O CH\u1EAEN TO\xC0N DI\u1EC6N!", text: "T\u1EA5m khi\xEAn t\u1ECFa s\xE1ng r\u1EF1c r\u1EE1! \u0110\u1ED9i b\u1EA1n gi\u1EEF v\u1EEFng tr\u1ECDn v\u1EB9n s\u1ED1 \u0111i\u1EC3m m\xE0 kh\xF4ng m\u1EA5t m\u1ED9t c\u1EAFc!" },
    { id: "VIC_PRT_12", noticeType: "VICTIM_PROTECTED_SHIELD", title: "KHI\xCAN N\u1EA2Y C\u1EF0C M\u1EA0NH!", text: "\u0110\xF2n \u0111\xE1nh c\u1EE7a {actor} b\u1ECB d\u1ED9i ng\u01B0\u1EE3c tr\u1EDF l\u1EA1i! \u0110\u1ED9i b\u1EA1n ung dung b\u1EA3o to\xE0n t\xE0i s\u1EA3n!" },
    { id: "VIC_PRT_13", noticeType: "VICTIM_PROTECTED_SHIELD", title: "TH\u1EA6N B\u1EA2O H\u1ED8 \u0110\u1EE8NG B\xCAN!", text: "Th\u1EA7n b\u1EA3o h\u1ED9 \u0111\xE3 gi\u01A1 cao c\xE1nh tay ch\u1EDF che! {actor} \u0111\xE0nh chuy\u1EC3n sang nh\u1EADn th\u01B0\u1EDFng t\u1EEB h\u1EC7 th\u1ED1ng!" },
    { id: "VIC_PRT_14", noticeType: "VICTIM_PROTECTED_SHIELD", title: "AN T\xC2M B\u1EA2O V\u1EC6!", text: "B\u1EA1n ho\xE0n to\xE0n c\xF3 th\u1EC3 th\u1EDF ph\xE0o nh\u1EB9 nh\xF5m: Kho b\xE1u \u0111i\u1EC3m s\u1ED1 v\u1EABn v\u1EB9n nguy\xEAn kh\xF4ng \u0111\u1ED5i!" },
    { id: "VIC_PRT_15", noticeType: "VICTIM_PROTECTED_SHIELD", title: "PH\xD2NG TUY\u1EBEN KI\xCAN C\u1ED0!", text: "Chi\u1EBFn l\u0169y kh\xF4ng th\u1EC3 \u0111\xE1nh s\u1EADp! {actor} \u0111\xE0nh b\xF3 tay tr\u01B0\u1EDBc h\u1EC7 th\u1ED1ng ph\xF2ng v\u1EC7 c\u1EE7a b\u1EA1n!" }
  ],
  // 11. Đội Top 1 được nhận quà tặng từ Bom Từ Thiện (+points)
  RECIPIENT_CHARITY_GIFT: [
    { id: "REC_CHA_01", noticeType: "RECIPIENT_CHARITY_GIFT", title: "L\u1ED8C TR\xCAN TR\u1EDCI R\u01A0I XU\u1ED0NG!", text: "Tin vui b\u1EA5t ng\u1EDD! {actor} v\u1EEBa d\xEDnh Bom T\u1EEB Thi\u1EC7n v\xE0 bu\u1ED9c ph\u1EA3i trao t\u1EB7ng tr\u1ECDn g\xF3i +{points}\u0111 cho \u0111\u1ED9i b\u1EA1n!" },
    { id: "REC_CHA_02", noticeType: "RECIPIENT_CHARITY_GIFT", title: "NG\u1ED2I KH\xD4NG C\u0168NG C\xD3 QU\xC0!", text: "T\u1EA5m l\xF2ng v\xE0ng b\u1EA5t \u0111\u1EAFc d\u0129! {actor} n\u1ED5 bom v\xE0 chuy\u1EC3n th\u1EB3ng +{points}\u0111 v\xE0o t\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n. \u0110\u1EEBng qu\xEAn g\u1EEDi l\u1EDDi c\u1EA3m \u01A1n!" },
    { id: "REC_CHA_03", noticeType: "RECIPIENT_CHARITY_GIFT", title: "M\xD3N QU\xC0 C\u1EE6A NG\u01AF\u1EDCI TREO NG\u01AF\u1EE2C!", text: "L\xE1 b\xE0i Ng\u01B0\u1EDDi Treo Ng\u01B0\u1EE3c c\u1EE7a {actor} \u0111\xE3 h\xE0o ph\xF3ng t\u1EB7ng kh\xF4ng cho \u0111\u1ED9i b\u1EA1n +{points}\u0111 qu\xFD b\xE1u!" },
    { id: "REC_CHA_04", noticeType: "RECIPIENT_CHARITY_GIFT", title: "BOM T\u1EEA THI\u1EC6N PH\xC1T L\u1ED8C!", text: "C\u01A1n m\u01B0a v\xE0ng r\u01A1i tr\xFAng \u0111\u1EC9nh \u0111\u1EA7u! {actor} chia s\u1EBB tr\u1ECDn v\u1EB9n +{points}\u0111 cho \u0111\u1ED9i d\u1EABn \u0111\u1EA7u l\xE0 b\u1EA1n!" },
    { id: "REC_CHA_05", noticeType: "RECIPIENT_CHARITY_GIFT", title: "GIA T\u0102NG C\xC1CH BI\u1EC6T MI\u1EC4N PH\xCD!", text: "Kh\xF4ng c\u1EA7n t\u1ED1n m\u1ED9t gi\u1ECDt m\u1ED3 h\xF4i! Kho \u0111i\u1EC3m c\u1EE7a \u0111\u1ED9i b\u1EA1n v\u1EEBa t\u0103ng v\u1ECDt +{points}\u0111 nh\u1EDD s\u1EF1 hy sinh c\u1EE7a {actor}!" },
    { id: "REC_CHA_06", noticeType: "RECIPIENT_CHARITY_GIFT", title: "M\xD3N H\u1EDCI B\u1EA4T NG\u1EDC!", text: "M\xF3n h\u1EDDi l\u1EDBn nh\u1EA5t tr\u1EADn \u0111\u1EA5u! {actor} n\u1ED5 bom t\u1EEB thi\u1EC7n, \u0111\u1ED9i b\u1EA1n hoan h\u1EF7 \u0111\xF3n nh\u1EADn +{points}\u0111 v\xE0o k\xE9t s\u1EAFt!" },
    { id: "REC_CHA_07", noticeType: "RECIPIENT_CHARITY_GIFT", title: "PH\u1EA6N TH\u01AF\u1EDENG CHO NG\u01AF\u1EDCI D\u1EAAN \u0110\u1EA6U!", text: "Ng\xF4i \u0111\u1EA7u b\u1EA3ng nh\u1EADn \u0111\u1EB7c \xE2n! {actor} ph\u1EA3i c\u1EAFn r\u0103ng trao t\u1EB7ng +{points}\u0111 cho \u0111\u1ED9i b\u1EA1n theo lu\u1EADt ch\u01A1i!" },
    { id: "REC_CHA_08", noticeType: "RECIPIENT_CHARITY_GIFT", title: "L\u1ED8C B\u1EA4T T\u1EACN H\u01AF\u1EDENG!", text: "\u0110\u01B0\u1EE3c \u0111\u1ED1i th\u1EE7 t\u1EB7ng \u0111i\u1EC3m ngo\xE0i l\u01B0\u1EE3t ch\u01A1i! Nh\u1EADn ngay +{points}\u0111 t\u1EEB {actor} v\xE0 g\u1EEDi cho h\u1ECD m\u1ED9t n\u1EE5 c\u01B0\u1EDDi \u1EA5m \xE1p nh\xE9!" },
    { id: "REC_CHA_09", noticeType: "RECIPIENT_CHARITY_GIFT", title: "BOM N\u1ED4 H\xD3A PH\xC1O HOA!", text: "Bom c\u1EE7a {actor} n\u1ED5 nh\u01B0ng ph\xE1o hoa l\u1EA1i n\u1EDF r\u1ED9 b\xEAn b\u1EA1n: T\xE0i kho\u1EA3n nh\u1EA3y s\u1ED1 +{points}\u0111 c\u1EF1c k\u1EF3 ph\u1EA5n kh\u1EDFi!" },
    { id: "REC_CHA_10", noticeType: "RECIPIENT_CHARITY_GIFT", title: "C\u1EE8NG C\xC1P NG\xD4I V\u01AF\u01A0NG!", text: "Ng\xF4i v\u1ECB s\u1ED1 1 c\xE0ng th\xEAm v\u1EEFng ch\xE3i! {actor} v\u1EEBa c\u1ED1ng n\u1EA1p th\xEAm +{points}\u0111 v\xE0o kho b\xE1u c\u1EE7a \u0111\u1ED9i b\u1EA1n!" },
    { id: "REC_CHA_11", noticeType: "RECIPIENT_CHARITY_GIFT", title: "S\u1EF0 TI\u1EBEP S\u1EE8C B\u1EA4T NG\u1EDC!", text: "Ti\u1EBFp th\xEAm l\u1EEDa cho ng\xF4i \u0111\u1EA7u! {actor} \u0111\xE3 gi\xFAp b\u1EA1n n\u1EDBi r\u1ED9ng kho\u1EA3ng c\xE1ch b\u1EB1ng m\xF3n qu\xE0 +{points}\u0111!" },
    { id: "REC_CHA_12", noticeType: "RECIPIENT_CHARITY_GIFT", title: "KHO B\xC1U T\u1EF0 \u0110\u1ED8NG \u0110\u1EA6Y L\xCAN!", text: "\u0110i\u1EC3m s\u1ED1 t\u1EF1 \u0111\u1ED9ng nh\u1EA3y v\u1ECDt! {actor} \u0111\xE3 ho\xE0n th\xE0nh xu\u1EA5t s\u1EAFc nhi\u1EC7m v\u1EE5 'shipper' giao t\u1EADn tay b\u1EA1n +{points}\u0111!" },
    { id: "REC_CHA_13", noticeType: "RECIPIENT_CHARITY_GIFT", title: "M\xD3N QU\xC0 C\u1EE6A \u0110\u1ECANH M\u1EC6NH!", text: "\u0110\u1ECBnh m\u1EC7nh s\u1EAFp \u0111\u1EB7t qu\xE1 ng\u1ECDt ng\xE0o! B\u1EA1n nh\u1EADn tr\u1ECDn +{points}\u0111 t\u1EEB tai n\u1EA1n t\u1EEB thi\u1EC7n c\u1EE7a {actor}!" },
    { id: "REC_CHA_14", noticeType: "RECIPIENT_CHARITY_GIFT", title: "L\u1ED8C \u0110\u1EBEN T\u1EACN C\u1EECA!", text: "M\u1EDF c\u1EEDa \u0111\xF3n th\u1EA7n t\xE0i! {actor} v\u1EEBa k\xFD g\u1EEDi tr\u1ECDn g\xF3i +{points}\u0111 v\xE0o t\xE0i kho\u1EA3n c\u1EE7a \u0111\u1ED9i b\u1EA1n!" },
    { id: "REC_CHA_15", noticeType: "RECIPIENT_CHARITY_GIFT", title: "NI\u1EC0M VUI NH\xC2N \u0110\xD4I!", text: "V\u1EEBa gi\u1EEF v\u1EEFng ng\xF4i v\u1ECB v\u1EEBa \u0111\u01B0\u1EE3c t\u1EB7ng qu\xE0! C\u1EA3m \u01A1n {actor} v\xEC m\xF3n qu\xE0 +{points}\u0111 v\xF4 c\xF9ng h\xE0o ph\xF3ng!" }
  ],
  // 12. Đội nhận được +5đ chia lộc từ Bom Hắc Ám
  RECIPIENT_DARK_BOMB_SHARE: [
    { id: "REC_DRK_01", noticeType: "RECIPIENT_DARK_BOMB_SHARE", title: "B\xD3NG T\u1ED0I CHIA L\u1ED8C!", text: "{actor} v\xF4 t\xECnh k\xEDch ho\u1EA1t Bom H\u1EAFc \xC1m khi\u1EBFn \u0111i\u1EC3m s\u1ED1 ph\xE1t n\u1ED5, b\u1EA1n may m\u1EAFn nh\u1EB7t \u0111\u01B0\u1EE3c +{points}\u0111 chia l\u1ED9c!" },
    { id: "REC_DRK_02", noticeType: "RECIPIENT_DARK_BOMB_SHARE", title: "H\u01AF\u1EDENG S\xC1I T\u1EEA TAI N\u1EA0N!", text: "H\u01B0\u1EDFng s\xE1i t\u1EEB tai n\u1EA1n c\u1EE7a \u0111\u1ED1i th\u1EE7! {actor} n\u1ED5 tung trong l\xE0n kh\xF3i \u0111en, \u0111\u1EC3 l\u1EA1i cho \u0111\u1ED9i b\u1EA1n +{points}\u0111 th\u01A1m l\u1EEBng!" },
    { id: "REC_DRK_03", noticeType: "RECIPIENT_DARK_BOMB_SHARE", title: "\xC1C QU\u1EF6 BAN PH\xC1T!", text: "\xC1c qu\u1EF7 XV \u0111\xE3 r\xFAt c\u1EA1n n\u0103ng l\u01B0\u1EE3ng c\u1EE7a {actor} v\xE0 ph\xE2n ph\xE1t c\xF4ng b\u1EB1ng +{points}\u0111 cho \u0111\u1ED9i c\u1EE7a b\u1EA1n!" },
    { id: "REC_DRK_04", noticeType: "RECIPIENT_DARK_BOMB_SHARE", title: "M\xD3N QU\xC0 T\u1EEA V\u1EE4 N\u1ED4!", text: "V\u1EE5 n\u1ED5 b\xF3ng t\u1ED1i l\xE0m v\u0103ng ra nh\u1EEFng \u0111\u1ED3ng \u0111i\u1EC3m v\xE0ng! \u0110\u1ED9i b\u1EA1n nhanh tay nh\u1EB7t \u0111\u01B0\u1EE3c +{points}\u0111 v\xE0o t\xFAi!" },
    { id: "REC_DRK_05", noticeType: "RECIPIENT_DARK_BOMB_SHARE", title: "CHIA \u0110\u1EC0U T\u1ED4N TH\u1EA4T!", text: "\u0110\u1ED1i th\u1EE7 ch\u1ECBu \u0111\xF2n, b\u1EA1n nh\u1EADn qu\xE0! {actor} v\u1EEBa ph\xE2n ph\xE1t \u0111\u1EC1u \u0111\u1EB7n +{points}\u0111 cho \u0111\u1ED9i b\u1EA1n!" },
    { id: "REC_DRK_06", noticeType: "RECIPIENT_DARK_BOMB_SHARE", title: "TI\u1EC0N V\u0102NG KH\u1ECEI K\xC9T!", text: "K\xE9t s\u1EAFt c\u1EE7a {actor} b\u1ECB n\u1ED5 tung! B\u1EA1n v\u1EEBa nh\u1EADn \u0111\u01B0\u1EE3c ph\u1EA7n chia +{points}\u0111 t\u1EEB ban tr\u1ECDng t\xE0i!" },
    { id: "REC_DRK_07", noticeType: "RECIPIENT_DARK_BOMB_SHARE", title: "L\u1ED8C H\u1EAEC \xC1M R\u01A0I V\xC0O T\xDAI!", text: "D\xF9 b\xF3ng t\u1ED1i bao tr\xF9m {actor}, nh\u01B0ng \xE1nh s\xE1ng +{points}\u0111 l\u1EA1i chi\u1EBFu r\u1ECDi v\xE0o t\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n!" },
    { id: "REC_DRK_08", noticeType: "RECIPIENT_DARK_BOMB_SHARE", title: "\u0110\u01AF\u1EE2C CHIA PH\u1EA6N B\u1EA4T NG\u1EDC!", text: "B\u1EA5t ng\u1EDD nh\u1EADn th\xEAm +{points}\u0111 h\u1ED7 tr\u1EE3 t\u1EEB v\u1EE5 n\u1ED5 bom c\u1EE7a {actor}! \u0110\u1ED9i b\u1EA1n t\xEDch l\u0169y th\xEAm \u0111i\u1EC3m qu\xFD b\xE1u!" },
    { id: "REC_DRK_09", noticeType: "RECIPIENT_DARK_BOMB_SHARE", title: "C\xD4NG B\u1EB0NG X\xC3 H\u1ED8I!", text: "S\u1EE9c m\u1EA1nh chia l\u1ED9c c\u1EE7a Bom H\u1EAFc \xC1m: R\xFAt \u0111i\u1EC3m ng\u01B0\u1EDDi gi\xE0u chia cho b\u1EA1n +{points}\u0111 ng\u1ECDt ng\xE0o!" },
    { id: "REC_DRK_10", noticeType: "RECIPIENT_DARK_BOMB_SHARE", title: "T\xCDCH TI\u1EC2U TH\xC0NH \u0110\u1EA0I!", text: "Th\xEAm +{points}\u0111 l\xE0 th\xEAm c\u01A1 h\u1ED9i chi\u1EBFn th\u1EAFng! C\u1EA3m \u01A1n m\xF3n qu\xE0 ph\xE2n chia t\u1EEB {actor}!" },
    { id: "REC_DRK_11", noticeType: "RECIPIENT_DARK_BOMB_SHARE", title: "L\u1ED8C PH\xC2N PH\xC1T TO\xC0N S\xC2N!", text: "C\u1EA3 \u0111\u1EA5u tr\u01B0\u1EDDng c\xF9ng h\u01B0\u1EDFng l\u1ED9c! \u0110\u1ED9i b\u1EA1n v\u1EEBa \u0111\u01B0\u1EE3c c\u1ED9ng th\xEAm +{points}\u0111 t\u1EEB c\xFA s\u1EA3y ch\xE2n c\u1EE7a {actor}!" },
    { id: "REC_DRK_12", noticeType: "RECIPIENT_DARK_BOMB_SHARE", title: "\u0110I\u1EC2M R\u01A0I TR\xDANG T\xDAI!", text: "Kh\xF4ng t\xECm c\u0169ng t\u1EF1 t\u1EDBi! {actor} h\xE0o ph\xF3ng ph\xE1t t\xE1n \u0111i\u1EC3m s\u1ED1, b\u1EA1n \u0111\xFAt t\xFAi ngay +{points}\u0111!" },
    { id: "REC_DRK_13", noticeType: "RECIPIENT_DARK_BOMB_SHARE", title: "PH\xDAC L\u1EE2I T\u1EEA HI\u1EC2M \u0110\u1ECAA!", text: "T\u1EEB c\u1EA1m b\u1EABy c\u1EE7a ng\u01B0\u1EDDi kh\xE1c n\u1EA3y sinh ph\xFAc l\u1EE3i cho b\u1EA1n: Nh\u1EADn li\u1EC1n tay +{points}\u0111 an vui!" },
    { id: "REC_DRK_14", noticeType: "RECIPIENT_DARK_BOMB_SHARE", title: "B\xC0N TAY CHIA \u0110I\u1EC2M!", text: "Tr\u1ECDng t\xE0i \u0111\xE3 chuy\u1EC3n giao th\xE0nh c\xF4ng ph\u1EA7n chia +{points}\u0111 t\u1EEB v\u1EE5 n\u1ED5 c\u1EE7a {actor} sang b\u1EA1n!" },
    { id: "REC_DRK_15", noticeType: "RECIPIENT_DARK_BOMB_SHARE", title: "TH\xCAM \u0110\u1ED2NG TH\xCAM VUI!", text: "C\xF3 th\xEAm +{points}\u0111 \u0111\u1ED9ng vi\xEAn tinh th\u1EA7n! H\xE3y chu\u1EA9n b\u1ECB b\xF9ng n\u1ED5 \u1EDF l\u01B0\u1EE3t ch\u01A1i k\u1EBF ti\u1EBFp!" }
  ],
  // 13. Đội chót bảng nhận được +5đ trợ cấp hòa hợp từ lá ĐIỀU ĐỘ XIV
  RECIPIENT_TEMPERANCE_ASSIST: [
    { id: "REC_TEM_01", noticeType: "RECIPIENT_TEMPERANCE_ASSIST", title: "\u0110I\u1EC0U \u0110\u1ED8 BAN PH\u01AF\u1EDAC!", text: "N\u0103ng l\u01B0\u1EE3ng dung h\xF2a c\u1EE7a l\xE1 \u0110i\u1EC1u \u0110\u1ED9 v\u1EEBa ban ph\u01B0\u1EDBc! Qu\u1EF9 h\u1EC7 th\u1ED1ng v\u1EEBa r\xF3t n\xF3ng +{points}\u0111 tr\u1EE3 c\u1EA5p ti\u1EBFp s\u1EE9c cho b\u1EA1n!" },
    { id: "REC_TEM_02", noticeType: "RECIPIENT_TEMPERANCE_ASSIST", title: "TI\u1EBEP S\u1EE8C L\u1ED8I NG\u01AF\u1EE2C D\xD2NG!", text: "\u0110\u1EEBng n\u1EA3n l\xF2ng! S\u1EF1 \u0111i\u1EC1u \u0111\u1ED9 v\xE0 c\xE2n b\u1EB1ng c\u1EE7a v\u0169 tr\u1EE5 v\u1EEBa g\u1EEDi t\u1EB7ng \u0111\u1ED9i b\u1EA1n +{points}\u0111 kh\xEDch l\u1EC7 \u0111\u1EC3 b\u1EE9t ph\xE1!" },
    { id: "REC_TEM_03", noticeType: "RECIPIENT_TEMPERANCE_ASSIST", title: "D\xD2NG N\u01AF\u1EDAC H\xD2A B\xCCNH!", text: "L\xE1 b\xE0i \u0110i\u1EC1u \u0110\u1ED9 c\u1EE7a {actor} \u0111\xE3 m\u1EDF ra d\xF2ng n\u01B0\u1EDBc c\u1EE9u tr\u1EE3: \u0110\u1ED9i b\u1EA1n nh\u1EADn th\xEAm +{points}\u0111 n\xE2ng \u0111\u1EE1 tinh th\u1EA7n!" },
    { id: "REC_TEM_04", noticeType: "RECIPIENT_TEMPERANCE_ASSIST", title: "TR\u1EE2 C\u1EA4P \u0110\u1ECANH M\u1EC6NH!", text: "Qu\u1EF9 Tr\u1EADn \u0110\u1EA5u v\u1EEBa xu\u1EA5t kho +{points}\u0111 vi\u1EC7n tr\u1EE3 cho \u0111\u1ED9i b\u1EA1n! H\xE3y bi\u1EBFn ngu\u1ED3n n\u0103ng l\u01B0\u1EE3ng n\xE0y th\xE0nh s\u1EE9c m\u1EA1nh l\u1EADt k\xE8o!" },
    { id: "REC_TEM_05", noticeType: "RECIPIENT_TEMPERANCE_ASSIST", title: "V\xD2NG TAY N\xC2NG \u0110\u1EE0!", text: "C\xE1n c\xE2n tr\u1EADn \u0111\u1EA5u \u0111ang n\xE2ng \u0111\u1EE1 b\u1EA1n! Nh\u1EADn ngay +{points}\u0111 h\xF2a h\u1EE3p \u0111\u1EC3 r\xFAt ng\u1EAFn kho\u1EA3ng c\xE1ch v\u1EDBi c\xE1c \u0111\u1ED1i th\u1EE7!" },
    { id: "REC_TEM_06", noticeType: "RECIPIENT_TEMPERANCE_ASSIST", title: "TI\u1EBENG G\u1ECCI H\u1ED2I SINH!", text: "C\u01A1 h\u1ED9i l\u1ED9i ng\u01B0\u1EE3c d\xF2ng v\u1EABn c\xF2n nguy\xEAn! B\u1EA1n v\u1EEBa \u0111\u01B0\u1EE3c ti\u1EBFp s\u1EE9c th\xEAm +{points}\u0111 t\u1EEB v\u0169 tr\u1EE5 \u0111i\u1EC1u \u0111\u1ED9!" },
    { id: "REC_TEM_07", noticeType: "RECIPIENT_TEMPERANCE_ASSIST", title: "C\xC2N B\u1EB0NG TH\u1EBE TR\u1EACN!", text: "S\u1EF1 dung h\xF2a gi\u1EEFa hai b\xECnh n\u01B0\u1EDBc th\xE1nh mang l\u1EA1i cho \u0111\u1ED9i b\u1EA1n +{points}\u0111 qu\xFD gi\xE1! T\u1EF1 tin ti\u1EBFn l\xEAn!" },
    { id: "REC_TEM_08", noticeType: "RECIPIENT_TEMPERANCE_ASSIST", title: "M\xD3N QU\xC0 NH\xC2N \xC1I!", text: "M\u1ED9t c\u1EED ch\u1EC9 \u0111\u1EB9p t\u1EEB lu\u1EADt ch\u01A1i Tarot: \u0110\u1ED9i b\u1EA1n nh\u1EADn n\xF3ng +{points}\u0111 tr\u1EE3 c\u1EA5p t\u1EEB Qu\u1EF9 Trung \u01AF\u01A1ng!" },
    { id: "REC_TEM_09", noticeType: "RECIPIENT_TEMPERANCE_ASSIST", title: "TH\xCAM N\u0102NG L\u01AF\u1EE2NG T\xCDCH C\u1EF0C!", text: "Kh\xED th\u1EBF chi\u1EBFn \u0111\u1EA5u d\xE2ng cao! Kho \u0111i\u1EC3m c\u1EE7a b\u1EA1n v\u1EEBa \u0111\u01B0\u1EE3c b\u01A1m th\xEAm +{points}\u0111 tr\xE0n \u0111\u1EA7y hy v\u1ECDng!" },
    { id: "REC_TEM_10", noticeType: "RECIPIENT_TEMPERANCE_ASSIST", title: "M\u1EDE L\u1ED0I T\u01AF\u01A0NG LAI!", text: "V\u0169 tr\u1EE5 g\u1EEDi t\xEDn hi\u1EC7u t\xEDch c\u1EF1c: +{points}\u0111 \u0111\xE3 \u0111\u01B0\u1EE3c g\u1EEDi \u0111\u1EBFn b\u1EA1n, s\u1EB5n s\xE0ng cho c\xFA b\u1EE9t ph\xE1 ngo\u1EA1n m\u1EE5c!" },
    { id: "REC_TEM_11", noticeType: "RECIPIENT_TEMPERANCE_ASSIST", title: "\u0110I\u1EC0U \u0110\u1ED8 SAN S\u1EBA!", text: "San s\u1EBB y\xEAu th\u01B0\u01A1ng n\u01A1i \u0111\u1EA5u tr\u01B0\u1EDDng! B\u1EA1n v\u1EEBa nh\u1EADn ph\u1EA7n tr\u1EE3 c\u1EA5p +{points}\u0111 m\xE0 kh\xF4ng ai b\u1ECB m\u1EA5t \u0111i\u1EC3m!" },
    { id: "REC_TEM_12", noticeType: "RECIPIENT_TEMPERANCE_ASSIST", title: "NG\u1ECCN L\u1EECA HY V\u1ECCNG!", text: "Ng\u1ECDn l\u1EEDa hy v\u1ECDng b\xF9ng ch\xE1y tr\u1EDF l\u1EA1i! Nh\u1EADn ngay +{points}\u0111 ti\u1EBFp s\u1EE9c t\u1EEB l\xE1 b\xE0i \u0110i\u1EC1u \u0110\u1ED9 XIV!" },
    { id: "REC_TEM_13", noticeType: "RECIPIENT_TEMPERANCE_ASSIST", title: "V\xD9NG V\u1EAAY V\u01AF\u01A0N L\xCAN!", text: "Kho\u1EA3ng c\xE1ch \u0111ang d\u1EA7n thu h\u1EB9p! \u0110\u1ED9i b\u1EA1n \u0111\u01B0\u1EE3c c\u1ED9ng th\xEAm +{points}\u0111, h\xE3y t\u1EADn d\u1EE5ng t\u1ED1i \u0111a c\u01A1 h\u1ED9i n\xE0y!" },
    { id: "REC_TEM_14", noticeType: "RECIPIENT_TEMPERANCE_ASSIST", title: "M\xD3N QU\xC0 TINH TH\u1EA6N \u0110\u1EAEC L\u1EF0C!", text: "M\xF3n qu\xE0 tinh th\u1EA7n tuy\u1EC7t v\u1EDDi! B\u1EA1n c\xF3 th\xEAm +{points}\u0111 v\xE0o h\xE0nh trang \u0111\u1EC3 chu\u1EA9n b\u1ECB cho c\xFA l\u1ED9i ng\u01B0\u1EE3c d\xF2ng!" },
    { id: "REC_TEM_15", noticeType: "RECIPIENT_TEMPERANCE_ASSIST", title: "V\u1EACN KH\xCD \u0110ANG QUAY L\u1EA0I!", text: "V\u1EADn may b\u1EAFt \u0111\u1EA7u g\xF5 c\u1EEDa! Nh\u1EADn +{points}\u0111 tr\u1EE3 c\u1EA5p t\u1EEB h\u1EC7 th\u1ED1ng v\xE0 chu\u1EA9n b\u1ECB l\xE0m n\xEAn k\u1EF3 t\xEDch!" }
  ],
  // 14. Thông báo trung tính (Mất lượt ±0đ)
  NEUTRAL: [
    { id: "NEU_01", noticeType: "NEUTRAL", title: "B\u1EA2O TO\xC0N \u0110I\u1EC2M S\u1ED0!", text: "M\u1ED9t l\u01B0\u1EE3t ch\u01A1i b\xECnh y\xEAn! {actor} gi\u1EEF nguy\xEAn s\u1ED1 \u0111i\u1EC3m hi\u1EC7n c\xF3 (\xB10\u0111), chu\u1EA9n b\u1ECB cho th\u1EED th\xE1ch ti\u1EBFp theo!" },
    { id: "NEU_02", noticeType: "NEUTRAL", title: "B\xCCNH T\u0128NH QUAN S\xC1T!", text: "Kh\xF4ng c\xF3 bi\u1EBFn \u0111\u1ED9ng n\xE0o! {actor} ho\xE0n th\xE0nh l\u01B0\u1EE3t ch\u01A1i v\u1EDBi \u0111i\u1EC3m s\u1ED1 \u0111\u01B0\u1EE3c b\u1EA3o to\xE0n nguy\xEAn v\u1EB9n!" },
    { id: "NEU_03", noticeType: "NEUTRAL", title: "C\u1EA6M CH\xC2N \u0110\u1ED0I TH\u1EE6!", text: "M\u1ED9t v\xE1n c\u1EDD h\xF2a ho\xE3n! \u0110i\u1EC3m s\u1ED1 gi\u1EEF nguy\xEAn (\xB10\u0111), c\u1EE5c di\u1EC7n t\u1EA1m th\u1EDDi kh\xF4ng \u0111\u1ED5i!" },
    { id: "NEU_04", noticeType: "NEUTRAL", title: "GI\u1EEE NGUY\xCAN PHONG \u0110\u1ED8!", text: "B\u1EA3o to\xE0n th\u1EF1c l\u1EF1c! {actor} kh\xF4ng m\u1EA5t \u0111i\u1EC3m n\xE0o, s\u1EB5n s\xE0ng b\xF9ng n\u1ED5 \u1EDF v\xF2ng \u0111\u1EA5u m\u1EDBi!" },
    { id: "NEU_05", noticeType: "NEUTRAL", title: "B\xCCNH Y\xCAN V\xD4 S\u1EF0!", text: "S\xF3ng y\xEAn bi\u1EC3n l\u1EB7ng! L\u01B0\u1EE3t ch\u01A1i kh\xE9p l\u1EA1i \xEAm \u0111\u1EC1m v\u1EDBi 0 \u0111i\u1EC3m thay \u0111\u1ED5i!" }
  ]
};
function generateTeamPrivateNotices({
  questState,
  allTeams,
  scoreDeltas = [],
  noticeCategoryOverride,
  actorTeamId,
  currentTeamId: currentTeamIdArg,
  actorName: actorNameArg,
  usedTemplateIdsByTeam = {}
}) {
  const notices = {};
  const currentTeamId = currentTeamIdArg || actorTeamId || questState.currentTurnTeamId;
  const currentTeam = allTeams.find((t) => t.id === currentTeamId);
  const actorName = actorNameArg || currentTeam?.name || questState.currentTurnTeamName || "\u0110\u1ED9i Ch\u01A1i";
  const basePoints = questState.baseQuestionPoints || 10;
  const pickTemplate = (teamId, category) => {
    if (!usedTemplateIdsByTeam[teamId]) {
      usedTemplateIdsByTeam[teamId] = /* @__PURE__ */ new Set();
    }
    const teamUsedSet = usedTemplateIdsByTeam[teamId];
    const available = NOTICE_TEMPLATES[category] || NOTICE_TEMPLATES.ACTIVE_REWARD;
    let unused = available.filter((t) => !teamUsedSet.has(t.id));
    if (unused.length === 0) {
      available.forEach((t) => teamUsedSet.delete(t.id));
      unused = available;
    }
    const chosen = unused[Math.floor(Math.random() * unused.length)] || available[0];
    teamUsedSet.add(chosen.id);
    return chosen;
  };
  const formatText = (text, params) => {
    return text.replace(/\{actor\}/g, params.actor || actorName).replace(/\{victim\}/g, params.victim || "\u0110\u1ED1i th\u1EE7").replace(/\{points\}/g, String(Math.abs(params.points ?? 0))).replace(/\{basePoints\}/g, String(basePoints));
  };
  const activeDeltaObj = scoreDeltas.find((d) => d.teamId === currentTeamId);
  const activeDelta = activeDeltaObj ? activeDeltaObj.delta : questState.potPoints || 0;
  let activeCategory = "ACTIVE_REWARD";
  if (noticeCategoryOverride?.activeTeamNoticeType) {
    activeCategory = noticeCategoryOverride.activeTeamNoticeType;
  } else if (questState.isPenaltySurvivalMode) {
    activeCategory = activeDelta <= 0 && questState.bombExploded ? "ACTIVE_SURVIVAL_FAIL" : "ACTIVE_SURVIVAL_ESCAPE";
  } else if (questState.bombExploded || activeDelta < 0) {
    activeCategory = "ACTIVE_PENALTY_BOMB";
  } else if (questState.turnFinishedReason === "TAROT_WHEEL_SPUN" || questState.turnFinishedReason === "TAROT_DRAWN") {
    const drawn = questState.tarotState?.drawnCard;
    if (drawn?.deathSubtype === "STEAL_TOP1" && (drawn?.stolenPoints || 0) > 0) {
      activeCategory = "ACTIVE_STEAL_SUCCESS";
    } else if (drawn?.deathSubtype === "STEAL_TOP1" && !drawn?.victimTeamId) {
      activeCategory = "ACTIVE_STEAL_FALLBACK";
    } else if (activeDelta > 0) {
      activeCategory = "ACTIVE_REWARD";
    } else {
      activeCategory = "NEUTRAL";
    }
  } else if (activeDelta > 0) {
    activeCategory = "ACTIVE_REWARD";
  } else {
    activeCategory = "NEUTRAL";
  }
  const activeTemplate = pickTemplate(currentTeamId, activeCategory);
  const victimName = questState.tarotState?.drawnCard?.victimTeamName || questState.pendingStealVictimName;
  notices[currentTeamId] = {
    recipientTeamId: currentTeamId,
    recipientTeamName: actorName,
    title: activeTemplate.title,
    message: formatText(activeTemplate.text, { actor: actorName, victim: victimName, points: activeDelta }),
    delta: activeDelta,
    noticeType: activeCategory,
    actorTeamName: actorName,
    templateId: activeTemplate.id,
    timestamp: Date.now()
  };
  for (const deltaItem of scoreDeltas) {
    if (deltaItem.teamId === currentTeamId) continue;
    const affectedTeam = allTeams.find((t) => t.id === deltaItem.teamId);
    if (!affectedTeam) continue;
    let otherCategory = "ACTIVE_REWARD";
    if (noticeCategoryOverride?.otherTeamNoticeType) {
      otherCategory = noticeCategoryOverride.otherTeamNoticeType;
    } else if (deltaItem.delta < 0) {
      const isDeath = questState.tarotState?.drawnCard?.key === "THE_DEATH" || questState.tarotState?.drawnCard?.key === "DEATH";
      otherCategory = isDeath ? "VICTIM_STOLEN_DEATH" : "VICTIM_STOLEN_CHARIOT";
    } else if (deltaItem.delta > 0) {
      const isCharity = questState.bombExploded?.type === "CHARITY" || questState.tarotState?.drawnCard?.key === "THE_HANGED_MAN";
      const isDark = questState.bombExploded?.type === "DARK" || questState.tarotState?.drawnCard?.key === "THE_DEVIL";
      const isTemperance = questState.tarotState?.drawnCard?.key === "TEMPERANCE";
      if (isCharity) {
        otherCategory = "RECIPIENT_CHARITY_GIFT";
      } else if (isDark) {
        otherCategory = "RECIPIENT_DARK_BOMB_SHARE";
      } else if (isTemperance) {
        otherCategory = "RECIPIENT_TEMPERANCE_ASSIST";
      } else {
        otherCategory = "RECIPIENT_CHARITY_GIFT";
      }
    }
    const otherTemplate = pickTemplate(affectedTeam.id, otherCategory);
    notices[affectedTeam.id] = {
      recipientTeamId: affectedTeam.id,
      recipientTeamName: affectedTeam.name,
      title: otherTemplate.title,
      message: formatText(otherTemplate.text, { actor: actorName, victim: affectedTeam.name, points: deltaItem.delta }),
      delta: deltaItem.delta,
      noticeType: otherCategory,
      actorTeamName: actorName,
      templateId: otherTemplate.id,
      timestamp: Date.now()
    };
  }
  if (questState.tarotState?.drawnCard?.deathSubtype === "STEAL_TOP1" && questState.tarotState?.drawnCard?.victimTeamId && (questState.tarotState?.drawnCard?.stolenPoints || 0) === 0) {
    const protectedTeamId = questState.tarotState.drawnCard.victimTeamId;
    const protectedTeam = allTeams.find((t) => t.id === protectedTeamId);
    if (protectedTeam && !notices[protectedTeamId]) {
      const shieldTemplate = pickTemplate(protectedTeamId, "VICTIM_PROTECTED_SHIELD");
      notices[protectedTeamId] = {
        recipientTeamId: protectedTeamId,
        recipientTeamName: protectedTeam.name,
        title: shieldTemplate.title,
        message: formatText(shieldTemplate.text, { actor: actorName, victim: protectedTeam.name, points: 0 }),
        delta: 0,
        noticeType: "VICTIM_PROTECTED_SHIELD",
        actorTeamName: actorName,
        templateId: shieldTemplate.id,
        timestamp: Date.now()
      };
    }
  }
  return notices;
}
var generatePrivateTeamNotices = generateTeamPrivateNotices;

// src/lib/game-engine/powerups.ts
var DEFAULT_ALLOWED_POWERUPS_BY_MODE = {
  // BOUNCEBACK: Về đích Olympia -> SCORE_X2 (Ngôi sao an toàn), DOUBLE (Ngôi sao hy vọng), SHIELD (Khiên), FIFTY_FIFTY (50/50), SKIP (Đổi câu), TIME_PLUS.
  // Quy tắc: Không được vừa dùng SHIELD vừa dùng SCORE_X2 trong 1 câu; Toàn bộ thẻ bị khóa ở pha cướp chuông.
  BOUNCEBACK: ["SCORE_X2", "DOUBLE", "FIFTY_FIFTY", "SHIELD", "SKIP", "TIME_PLUS"],
  // BUZZ: Bấm chuông nhanh -> FREEZE (Đóng băng chuông), SCORE_X2, DOUBLE, STEAL, SHIELD, PENALTY, SKIP, TIME_PLUS.
  // CẤM FIFTY_FIFTY vì câu hỏi chung, cấm dùng thẻ SAU KHI đã bấm chuông.
  BUZZ: ["FREEZE", "SCORE_X2", "DOUBLE", "STEAL", "SHIELD", "PENALTY", "SKIP", "TIME_PLUS"],
  // ELIMINATION: Sinh tồn -> SHIELD (Safe pass cứu nguy 1 lần nếu chót bảng vòng hiện tại), DOUBLE, SCORE_X2, FREEZE, SKIP, TIME_PLUS.
  ELIMINATION: ["SHIELD", "DOUBLE", "SCORE_X2", "FREEZE", "SKIP", "TIME_PLUS"],
  // TOURNAMENT: 1v1 đối kháng công bằng -> Chỉ cho phép thẻ hỗ trợ bản thân: FIFTY_FIFTY (50/50), TIME_PLUS (+5s), SKIP (Đổi câu), SCORE_X2, DOUBLE (Nhân đôi điểm).
  // Nghiêm cấm các thẻ tấn công quấy phá đối thủ (FREEZE, ATTACK, PENALTY, STEAL).
  TOURNAMENT: ["FIFTY_FIFTY", "TIME_PLUS", "SKIP", "SCORE_X2", "DOUBLE"],
  // GRID_CARO: Bàn cờ chiến thuật -> DOUBLE, SCORE_X2, FREEZE, SHIELD, SKIP, TIME_PLUS.
  GRID_CARO: ["DOUBLE", "SCORE_X2", "FREEZE", "SHIELD", "SKIP", "TIME_PLUS"],
  // DICE_RACE: Nước rút (+2 bước), Bứt phá (+1 bước), Thêm giờ, 50/50, Đổi câu.
  DICE_RACE: ["DOUBLE", "SCORE_X2", "TIME_PLUS", "FIFTY_FIFTY", "SKIP"],
  // WAGER: Cược điểm -> FIFTY_FIFTY, SHIELD (Bảo hiểm cược mất 50%), TIME_PLUS, SKIP. CẤM STEAL và FREEZE.
  WAGER: ["FIFTY_FIFTY", "SHIELD", "TIME_PLUS", "SKIP"],
  // CLASSIC: Toàn bộ 10 thẻ.
  CLASSIC: ["FIFTY_FIFTY", "DOUBLE", "FREEZE", "ATTACK", "SKIP", "TIME_PLUS", "SHIELD", "STEAL", "PENALTY", "SCORE_X2"],
  // MYSTERY_QUEST: Hành trình phiêu lưu - Mode DUY NHẤT không hỗ trợ thẻ bổ trợ (Power-up) do đặc thù sân khấu luân phiên & Ô số phận
  MYSTERY_QUEST: []
};
function getDefaultAllowedPowerupsForMode(mode) {
  if (mode === "MYSTERY_QUEST") return [];
  return DEFAULT_ALLOWED_POWERUPS_BY_MODE[mode] ?? DEFAULT_ALLOWED_POWERUPS_BY_MODE.CLASSIC;
}
function isPowerupAllowedForMode(mode, cardType) {
  if (mode === "MYSTERY_QUEST") return false;
  const allowed = getDefaultAllowedPowerupsForMode(mode);
  return allowed.includes(cardType);
}
var SHARED_POWERUP_TYPES = ["TIME_PLUS", "SKIP"];
function isSharedPowerup(cardType) {
  return SHARED_POWERUP_TYPES.includes(cardType);
}
var DEFAULT_SHARED_POWERUP_PROBABILITY = 0.1;

// src/lib/game-engine/question-allocator.ts
function classifyQuestionDifficulty(q) {
  if (q.bloomLevel === "ANALYZE" || q.points && q.points >= 30) return "HARD";
  if (q.bloomLevel === "APPLY" || q.points && q.points > 10 && q.points <= 20) return "MEDIUM";
  return "EASY";
}
function normalizePointsToLevel(diff) {
  if (diff === "HARD") return 30;
  if (diff === "MEDIUM") return 20;
  return 10;
}
function shuffle(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function getRoundTargetDifficulty(roundIndex, totalRounds) {
  if (totalRounds <= 1) return "MEDIUM";
  if (totalRounds === 2) return roundIndex === 0 ? "EASY" : "HARD";
  const progress = (roundIndex + 0.5) / totalRounds;
  if (progress <= 0.35) return "EASY";
  if (progress <= 0.7) return "MEDIUM";
  return "HARD";
}
function calculateModeDerivedConfig(mode, targetCount, teamsCount = 4, options) {
  const safeTeams = Math.max(1, teamsCount);
  const qCount = Math.max(1, targetCount);
  switch (mode) {
    case "MYSTERY_QUEST": {
      const turnsPerTeam = Math.max(1, Math.floor(qCount / safeTeams));
      const adjustedTotal = turnsPerTeam * safeTeams;
      return {
        matchMaxQuestions: adjustedTotal,
        mysteryQuestTurnsPerTeam: turnsPerTeam,
        roundsOrCycles: turnsPerTeam,
        questionsPerUnit: 1,
        descriptionVi: `T\u1EF1 \u0111\u1ED9ng ph\xE2n b\u1ED5 ${turnsPerTeam} v\xF2ng thi \u0111\u1EA5u (${turnsPerTeam} l\u01B0\u1EE3t cho m\u1ED7i \u0111\u1ED9i \xD7 ${safeTeams} \u0111\u1ED9i = ${adjustedTotal} c\xE2u). C\xE1c \u0111\u1ED9i ch\u01A1i l\u1EA7n l\u01B0\u1EE3t v\u01B0\u1EE3t th\u1EED th\xE1ch v\xE0 l\u1EADt \xF4 s\u1ED1 ph\u1EADn!`
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
        descriptionVi: `T\u1EF1 \u0111\u1ED9ng chia th\xE0nh ${roundsPerTeam} v\xF2ng c\u01B0\u1EE3c \u0111i\u1EC3m b\xED m\u1EADt (${roundsPerTeam} l\u01B0\u1EE3t c\u01B0\u1EE3c/\u0111\u1ED9i \xD7 ${safeTeams} \u0111\u1ED9i = ${adjustedTotal} c\xE2u h\u1ECFi c\xE2n n\xE3o).`
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
        descriptionVi: `T\u1EF1 \u0111\u1ED9ng chia th\xE0nh ${cycles} chu k\u1EF3 V\u1EC1 \u0111\xEDch (${safeTeams} \u0111\u1ED9i \xD7 ${qPerTurn} c\xE2u/l\u01B0\u1EE3t \xD7 ${cycles} chu k\u1EF3 = ${adjustedTotal} c\xE2u). M\u1EDF chu\xF4ng 5s khi \u0111\u1ED9i ch\xEDnh sai.`
      };
    }
    case "ELIMINATION": {
      const stages = options?.eliminationStages || 3;
      const interval = Math.max(2, Math.floor(qCount / stages));
      return {
        matchMaxQuestions: qCount,
        eliminationIntervalQuestions: interval,
        stagesCount: stages,
        descriptionVi: `T\u1EF1 \u0111\u1ED9ng chia th\xE0nh ${stages} ch\u1EB7ng sinh t\u1ED3n. C\u1EE9 sau ${interval} c\xE2u h\u1ECFi, \u0111\u1ED9i x\u1EBFp ch\xF3t s\u1EBD b\u1ECB lo\u1EA1i th\xE0nh \u0110\u1ED9i B\xF3ng Ma tranh v\xE9 H\u1ED3i Sinh.`
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
        descriptionVi: `G\u1EE3i \xFD b\xE0n c\u1EDD ma tr\u1EADn ${rows}\xD7${cols} (${totalCells} \xF4 s\u1ED1) g\u1EAFn c\u1EE9ng 10\u0111/20\u0111/30\u0111, t\u01B0\u01A1ng \u1EE9ng kho\u1EA3ng ${roundsPerTeam} l\u01B0\u1EE3t ch\u1ECDn/\u0111\u1ED9i.`
      };
    }
    case "TOURNAMENT": {
      const questionsPerMatch = options?.tournamentQuestionsPerMatch || Math.max(2, Math.min(5, Math.floor(qCount / 3)));
      return {
        matchMaxQuestions: qCount,
        tournamentQuestionsPerMatch: questionsPerMatch,
        descriptionVi: `T\u1EF1 \u0111\u1ED9ng ph\xE2n b\u1ED5 ${questionsPerMatch} c\xE2u h\u1ECFi cho m\u1ED7i c\u1EB7p \u0111\u1ED1i \u0111\u1EA7u 1v1 tr\xEAn nh\xE1nh \u0111\u1EA5u T\u1EE9 k\u1EBFt - B\xE1n k\u1EBFt - Chung k\u1EBFt.`
      };
    }
    case "DICE_RACE": {
      return {
        matchMaxQuestions: qCount,
        diceRaceMaxQuestions: qCount,
        descriptionVi: `Gi\u1EDBi h\u1EA1n t\u1ED1i \u0111a ${qCount} c\xE2u h\u1ECFi cho cu\u1ED9c \u0111ua marathon (\u0111\u1ED9i c\xE1n \u0111\xEDch tr\u01B0\u1EDBc ho\u1EB7c ti\u1EBFn xa nh\u1EA5t s\u1EBD chi\u1EBFn th\u1EAFng).`
      };
    }
    case "CLASSIC": {
      const goldCount = Math.max(1, Math.round(qCount * 0.2));
      return {
        matchMaxQuestions: qCount,
        goldQuestionsCount: goldCount,
        descriptionVi: `Thi \u0111\u1EA5u ${qCount} c\xE2u h\u1ECFi t\xEDnh \u0111i\u1EC3m chu\u1EA9n Kahoot (g\u1ED3m ${goldCount} C\xE2u h\u1ECFi V\xE0ng x2 \u0111i\u1EC3m \u1EDF ch\u1EB7ng v\u1EC1 \u0111\xEDch ph\xE2n lo\u1EA1i).`
      };
    }
    case "BUZZ": {
      return {
        matchMaxQuestions: qCount,
        descriptionVi: `Thi \u0111\u1EA5u chu\xF4ng b\u1EA5m qua ${qCount} c\xE2u h\u1ECFi v\u1EDBi 3 m\u1EE9c \u0111i\u1EC3m 10/20/30 ph\xE2n b\u1ED5 chu\u1EA9n x\xE1c, \u0111\xFAng nh\u1EADn \u0111i\u1EC3m, sai b\u1ECB tr\u1EEB 50%.`
      };
    }
    default: {
      return {
        matchMaxQuestions: qCount,
        descriptionVi: `Thi \u0111\u1EA5u qua ${qCount} c\xE2u h\u1ECFi \u0111\u01B0\u1EE3c ph\xE2n b\u1ED5 t\u1ED1i \u01B0u theo thang \u0111o Bloom.`
      };
    }
  }
}
function allocateQuestionsForMatch(params) {
  const { questions, mode, targetCount, teamsCount = 4, allocationStrategy = "ORIGINAL_POINTS", options } = params;
  const regularQuestions = questions.filter((q) => !q.isTieBreaker);
  const poolToUse = regularQuestions.length > 0 ? regularQuestions : questions;
  const bankTotal = poolToUse.length;
  const safeTeams = Math.max(1, teamsCount);
  let desiredCount;
  if (targetCount && targetCount > 0) {
    desiredCount = Math.min(bankTotal, targetCount);
  } else {
    desiredCount = bankTotal;
  }
  const derived = calculateModeDerivedConfig(mode, desiredCount, safeTeams, options);
  const effectiveTotal = Math.min(bankTotal, derived.matchMaxQuestions || desiredCount);
  const easyPool = [];
  const medPool = [];
  const hardPool = [];
  for (const q of poolToUse) {
    const diff = classifyQuestionDifficulty(q);
    if (diff === "EASY") easyPool.push(q);
    else if (diff === "MEDIUM") medPool.push(q);
    else hardPool.push(q);
  }
  const shuffledEasy = shuffle(easyPool);
  const shuffledMed = shuffle(medPool);
  const shuffledHard = shuffle(hardPool);
  const isTurnBasedMode = mode === "MYSTERY_QUEST" || mode === "BOUNCEBACK" || mode === "WAGER" || mode === "DICE_RACE";
  let allocatedQuestions = [];
  const pickedIds = /* @__PURE__ */ new Set();
  const drawFromPool = (desiredDiff) => {
    let pool = desiredDiff === "HARD" ? shuffledHard : desiredDiff === "MEDIUM" ? shuffledMed : shuffledEasy;
    while (pool.length > 0) {
      const q = pool.pop();
      if (!pickedIds.has(q.id)) {
        pickedIds.add(q.id);
        return q;
      }
    }
    const fallbackOrder = desiredDiff === "HARD" ? [shuffledMed, shuffledEasy] : desiredDiff === "MEDIUM" ? [shuffledHard, shuffledEasy] : [shuffledMed, shuffledHard];
    for (const fbPool of fallbackOrder) {
      while (fbPool.length > 0) {
        const q = fbPool.pop();
        if (!pickedIds.has(q.id)) {
          pickedIds.add(q.id);
          return q;
        }
      }
    }
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
    }
    const roundAllocatedQuestions = [];
    for (let r = 0; r < roundsCount; r++) {
      const roundDiff = getRoundTargetDifficulty(r, roundsCount);
      const targetPoints = normalizePointsToLevel(roundDiff);
      const targetBloom = roundDiff === "HARD" ? "ANALYZE" : roundDiff === "MEDIUM" ? "APPLY" : "REMEMBER";
      for (let qIdx = 0; qIdx < questionsPerRound; qIdx++) {
        const rawQ = drawFromPool(roundDiff);
        if (!rawQ) break;
        let finalPoints = targetPoints;
        let finalBloom = targetBloom;
        if (allocationStrategy === "ORIGINAL_POINTS") {
          finalPoints = rawQ.points !== void 0 && rawQ.points !== null ? rawQ.points : targetPoints;
          finalBloom = rawQ.bloomLevel || targetBloom;
        }
        roundAllocatedQuestions.push({
          ...rawQ,
          allocatedDiff: roundDiff,
          roundIndex: r + 1,
          points: allocationStrategy === "BLOOM_BALANCED" ? targetPoints : finalPoints,
          bloomLevel: allocationStrategy === "BLOOM_BALANCED" ? targetBloom : finalBloom
        });
      }
    }
    allocatedQuestions = roundAllocatedQuestions;
  } else {
    let targetHard = Math.max(1, Math.round(effectiveTotal * 0.33));
    let targetEasy = Math.max(1, Math.round(effectiveTotal * 0.3));
    let targetMed = effectiveTotal - targetEasy - targetHard;
    if (targetMed < 1 && effectiveTotal >= 3) {
      targetMed = 1;
      targetHard = Math.max(1, effectiveTotal - targetEasy - targetMed);
    }
    const selectedHard = [];
    const selectedMed = [];
    const selectedEasy = [];
    while (selectedHard.length < targetHard) {
      const q = drawFromPool("HARD");
      if (!q) break;
      selectedHard.push({ ...q, allocatedDiff: "HARD" });
    }
    while (selectedEasy.length < targetEasy) {
      const q = drawFromPool("EASY");
      if (!q) break;
      selectedEasy.push({ ...q, allocatedDiff: "EASY" });
    }
    while (selectedMed.length < targetMed) {
      const q = drawFromPool("MEDIUM");
      if (!q) break;
      selectedMed.push({ ...q, allocatedDiff: "MEDIUM" });
    }
    allocatedQuestions = [...selectedEasy, ...selectedMed, ...selectedHard];
  }
  allocatedQuestions = allocatedQuestions.slice(0, effectiveTotal);
  allocatedQuestions = allocatedQuestions.map((q, idx) => {
    const diff = q.allocatedDiff || classifyQuestionDifficulty(q);
    const standardPoints = normalizePointsToLevel(diff);
    const standardBloom = diff === "HARD" ? "ANALYZE" : diff === "MEDIUM" ? "APPLY" : "REMEMBER";
    return {
      ...q,
      order: idx + 1,
      points: allocationStrategy === "BLOOM_BALANCED" ? standardPoints : q.points !== void 0 && q.points !== null ? q.points : standardPoints,
      bloomLevel: allocationStrategy === "BLOOM_BALANCED" ? standardBloom : q.bloomLevel || standardBloom
    };
  });
  const finalEasy = allocatedQuestions.filter((q) => q.points <= 10).length;
  const finalMed = allocatedQuestions.filter((q) => q.points === 20).length;
  const finalHard = allocatedQuestions.filter((q) => q.points >= 30).length;
  const total = allocatedQuestions.length || 1;
  const breakdown = {
    easyCount: finalEasy,
    mediumCount: finalMed,
    hardCount: finalHard,
    easyPercent: Math.round(finalEasy / total * 100),
    mediumPercent: Math.round(finalMed / total * 100),
    hardPercent: Math.round(finalHard / total * 100)
  };
  const modeDetails = {
    mode,
    totalQuestions: allocatedQuestions.length,
    teamsCount: safeTeams,
    descriptionVi: derived.descriptionVi,
    roundsOrCycles: derived.roundsOrCycles,
    questionsPerUnit: derived.questionsPerUnit,
    stagesCount: derived.stagesCount,
    goldQuestionsCount: derived.goldQuestionsCount,
    suggestedGrid: derived.suggestedGrid
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
      diceRaceMaxQuestions: derived.diceRaceMaxQuestions
    }
  };
}

// src/lib/utils.ts
function getTargetTotalQuestions(mode, config, teamsCount, bankTotal) {
  const safeBankTotal = Math.max(1, bankTotal);
  const safeTeamsCount = Math.max(1, teamsCount);
  const maxQ = config?.matchMaxQuestions && config.matchMaxQuestions > 0 ? config.matchMaxQuestions : void 0;
  const effectiveTarget = maxQ ? Math.min(safeBankTotal, maxQ) : safeBankTotal;
  if (mode === "MYSTERY_QUEST") {
    const turnsPerTeam = Math.max(1, Math.floor(effectiveTarget / safeTeamsCount));
    const modeLimit = safeTeamsCount * turnsPerTeam;
    return Math.min(safeBankTotal, modeLimit);
  }
  if (mode === "WAGER") {
    const rounds = Math.max(1, Math.floor(effectiveTarget / safeTeamsCount));
    const modeLimit = safeTeamsCount * rounds;
    return Math.min(safeBankTotal, modeLimit);
  }
  if (mode === "BOUNCEBACK") {
    const qPerTurn = config?.bouncebackQuestionsPerTurn || 1;
    const cycles = Math.max(1, Math.floor(effectiveTarget / (safeTeamsCount * qPerTurn)));
    const modeLimit = safeTeamsCount * cycles * qPerTurn;
    return Math.min(safeBankTotal, modeLimit);
  }
  if (mode === "GRID_CARO") {
    return effectiveTarget;
  }
  if (mode === "DICE_RACE") {
    return effectiveTarget;
  }
  if (mode === "TOURNAMENT") {
    return effectiveTarget;
  }
  return effectiveTarget;
}
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// src/lib/security.ts
var import_crypto = __toESM(require("crypto"));
var import_bcryptjs = __toESM(require("bcryptjs"));
var TOKEN_SECRET = process.env.NEXTAUTH_SECRET || "Quizorra_super_secret_key_2026";
var TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1e3;
var VALID_SECRETS = [
  TOKEN_SECRET,
  "Quizorra_super_secret_key_2026",
  "quizorra_super_secret_key_2026",
  "quizora_super_secret_key_2026",
  "brainclash_super_secret_key_2026"
].filter(Boolean);
function isValidSignature(payloadEncoded, signature) {
  const sigBuffer = Buffer.from(signature);
  for (const secret of VALID_SECRETS) {
    const expectedSignature = import_crypto.default.createHmac("sha256", secret).update(payloadEncoded).digest("base64url");
    const expectedBuffer = Buffer.from(expectedSignature);
    if (sigBuffer.length === expectedBuffer.length && import_crypto.default.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return true;
    }
  }
  return false;
}
function verifyAdminToken(token) {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payloadEncoded, signature] = parts;
  if (!isValidSignature(payloadEncoded, signature)) {
    return false;
  }
  try {
    const payload = JSON.parse(
      Buffer.from(payloadEncoded, "base64url").toString("utf8")
    );
    if (typeof payload.exp !== "number" || Date.now() > payload.exp) return false;
    if (payload.role === "admin" || payload.role === "ADMIN" || payload.role === "USER" || Boolean(payload.userId)) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
function sanitizePlayerName(rawName) {
  if (!rawName || typeof rawName !== "string") return "";
  let cleaned = rawName.replace(/[\u200B-\u200D\uFEFF\u00A0\u200E\u200F\u202A-\u202E]/g, "").replace(/<[^>]*>/g, "").replace(/[\x00-\x1F\x7F]/g, "").replace(/\s+/g, " ").trim();
  if (cleaned.length > 25) {
    cleaned = cleaned.slice(0, 25).trim();
  }
  return cleaned;
}

// src/lib/rate-limiter.ts
var rateLimitStore = /* @__PURE__ */ new Map();
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (record.blockedUntil && record.blockedUntil > now) continue;
      record.timestamps = record.timestamps.filter((t) => now - t < 6e5);
      if (record.timestamps.length === 0 && (!record.blockedUntil || record.blockedUntil <= now)) {
        rateLimitStore.delete(key);
      }
    }
  }, 12e4);
}
function checkRateLimit(key, limit, windowMs, blockDurationMs = windowMs) {
  const now = Date.now();
  let record = rateLimitStore.get(key);
  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }
  if (record.blockedUntil && record.blockedUntil > now) {
    const retryAfterSeconds = Math.ceil((record.blockedUntil - now) / 1e3);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds
    };
  }
  record.timestamps = record.timestamps.filter((t) => now - t < windowMs);
  if (record.timestamps.length >= limit) {
    record.blockedUntil = now + blockDurationMs;
    const retryAfterSeconds = Math.ceil(blockDurationMs / 1e3);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds
    };
  }
  record.timestamps.push(now);
  const remaining = Math.max(0, limit - record.timestamps.length);
  return {
    allowed: true,
    remaining,
    retryAfterSeconds: 0
  };
}
function checkPlayerJoinLimit(identifier) {
  return checkRateLimit(`join:${identifier}`, 60, 1e4, 5e3);
}
function checkActionDebounce(key, cooldownMs = 500) {
  const now = Date.now();
  const record = rateLimitStore.get(`debounce:${key}`);
  if (record && record.timestamps.length > 0) {
    const last = record.timestamps[record.timestamps.length - 1];
    if (now - last < cooldownMs) {
      return false;
    }
  }
  rateLimitStore.set(`debounce:${key}`, { timestamps: [now] });
  return true;
}
var MAX_PLAYERS_PER_ROOM = 100;

// src/lib/topics.ts
var BROAD_TOPICS = [
  "To\xE1n h\u1ECDc & Logic",
  "Khoa h\u1ECDc T\u1EF1 nhi\xEAn",
  "L\u1ECBch s\u1EED & \u0110\u1ECBa l\xFD",
  "V\u0103n h\xF3a - X\xE3 h\u1ED9i",
  "Kinh t\u1EBF & Qu\u1EA3n tr\u1ECB",
  "C\xF4ng ngh\u1EC7 & Tin h\u1ECDc",
  "Ngo\u1EA1i ng\u1EEF",
  "Ki\u1EBFn th\u1EE9c T\u1ED5ng h\u1EE3p"
];
var TOPIC_PATTERNS = [
  {
    topic: "To\xE1n h\u1ECDc & Logic",
    regex: /\b(toán|đại số|hình học|lượng giác|tích phân|đạo hàm|xác suất|thống kê|phương trình|hệ phương trình|tam giác|hình tròn|hình chóp|ma trận|vectơ|giải tích|logarit|dãy số|phép tính|số học|logic|tính toán)\b/i
  },
  {
    topic: "Khoa h\u1ECDc T\u1EF1 nhi\xEAn",
    regex: /\b(vật lý|hoá học|hóa học|sinh học|sinh thái|tế bào|gen|dna|arn|nguyên tử|phân tử|electron|proton|nhiệt độ|áp suất|năng lượng|vận tốc|quang hợp|hô hấp|khí hậu|biến đổi khí hậu|môi trường|hành tinh|vũ trụ|thiên văn|phát thải|carbon|oxi|kim loại|axit|bazơ)\b/i
  },
  {
    topic: "L\u1ECBch s\u1EED & \u0110\u1ECBa l\xFD",
    regex: /\b(lịch sử|địa lý|địa danh|thế kỷ|triều đại|chiến tranh|kháng chiến|cách mạng|khởi nghĩa|hiệp định|vua|hoàng đế|chủ tịch|thủ đô|sông|núi|biển|châu lục|quốc gia|tỉnh thành|dân số|địa hình|di tích|di sản|đô thị|bản đồ)\b/i
  },
  {
    topic: "Kinh t\u1EBF & Qu\u1EA3n tr\u1ECB",
    regex: /\b(kinh tế|quản trị|quản lý|kế toán|tài chính|ngân hàng|tiền tệ|lạm phát|gdp|doanh nghiệp|kinh doanh|chi phí|doanh thu|lợi nhuận|kế hoạch|dự án|kiểm soát|thị trường|thuế|cung cầu|nhân sự|swot|smart|cpm|pert|evm|roi|eva|bsc|fayol)\b/i
  },
  {
    topic: "C\xF4ng ngh\u1EC7 & Tin h\u1ECDc",
    regex: /\b(khoa học dữ liệu|tin học|máy tính|lập trình|phần mềm|thuật toán|trí tuệ nhân tạo|ai|machine learning|cơ sở dữ liệu|database|mạng máy tính|internet|python|java|code|crisp-dm|k-means|hồi quy|ols)\b/i
  },
  {
    topic: "V\u0103n h\xF3a - X\xE3 h\u1ED9i",
    regex: /\b(văn học|tác phẩm|tác giả|nhà thơ|nhà văn|tiểu thuyết|truyện|thơ|ca dao|tục ngữ|âm nhạc|bài hát|nhạc sĩ|hội họa|điện ảnh|phim|nghệ thuật|thể thao|bóng đá|lễ hội|phong tục|tập quán|tôn giáo|xã hội|triết học|đạo đức)\b/i
  },
  {
    topic: "Ngo\u1EA1i ng\u1EEF",
    regex: /\b(tiếng anh|english|ngữ pháp|từ vựng|ngữ âm|idiom|vocabulary|grammar|phát âm|dịch thuật|ngoại ngữ)\b/i
  }
];
function getBroadTopic(params) {
  const { topic, content, bankTitle } = params;
  if (topic && typeof topic === "string" && topic.trim()) {
    const raw = topic.trim().toLowerCase();
    for (const bt of BROAD_TOPICS) {
      if (raw.includes(bt.toLowerCase())) return bt;
    }
    for (const p of TOPIC_PATTERNS) {
      if (p.regex.test(raw)) return p.topic;
    }
  }
  if (bankTitle && typeof bankTitle === "string" && bankTitle.trim()) {
    const rawTitle = bankTitle.trim();
    for (const p of TOPIC_PATTERNS) {
      if (p.regex.test(rawTitle)) return p.topic;
    }
  }
  if (content && typeof content === "string" && content.trim()) {
    const rawContent = content.trim();
    for (const p of TOPIC_PATTERNS) {
      if (p.regex.test(rawContent)) return p.topic;
    }
  }
  return "Ki\u1EBFn th\u1EE9c T\u1ED5ng h\u1EE3p";
}

// src/lib/game-engine/tie-breaker.ts
var roomTieBreakers = /* @__PURE__ */ new Map();
var tieBreakerTimers = /* @__PURE__ */ new Map();
function clearTieBreakerTimer(roomId) {
  const timer = tieBreakerTimers.get(roomId);
  if (timer) {
    clearTimeout(timer);
    tieBreakerTimers.delete(roomId);
  }
}
function cleanupTieBreaker(roomId) {
  clearTieBreakerTimer(roomId);
  roomTieBreakers.delete(roomId);
}
var EMERGENCY_TIE_BREAKER_QUESTIONS = [
  {
    id: "EMERGENCY_TB_1",
    content: "Th\u1EE7 \u0111\xF4 c\u1EE7a qu\u1ED1c gia n\xE0o \u0111\u01B0\u1EE3c m\u1EC7nh danh l\xE0 'Th\xE0nh ph\u1ED1 \xC1nh S\xE1ng'?",
    options: [
      { id: "A", text: "Paris (Ph\xE1p)", isCorrect: true },
      { id: "B", text: "Rome (\xDD)", isCorrect: false },
      { id: "C", text: "Tokyo (Nh\u1EADt B\u1EA3n)", isCorrect: false },
      { id: "D", text: "London (Anh)", isCorrect: false }
    ],
    hint: "Th\xE0nh ph\u1ED1 n\u1ED5i ti\u1EBFng v\u1EDBi th\xE1p Eiffel v\xE0 d\xF2ng s\xF4ng Seine th\u01A1 m\u1ED9ng."
  },
  {
    id: "EMERGENCY_TB_2",
    content: "\u0110\u1EA1i d\u01B0\u01A1ng n\xE0o c\xF3 di\u1EC7n t\xEDch l\u1EDBn nh\u1EA5t tr\xEAn Tr\xE1i \u0110\u1EA5t?",
    options: [
      { id: "A", text: "\u0110\u1EA1i T\xE2y D\u01B0\u01A1ng", isCorrect: false },
      { id: "B", text: "Th\xE1i B\xECnh D\u01B0\u01A1ng", isCorrect: true },
      { id: "C", text: "\u1EA4n \u0110\u1ED9 D\u01B0\u01A1ng", isCorrect: false },
      { id: "D", text: "B\u1EAFc B\u0103ng D\u01B0\u01A1ng", isCorrect: false }
    ],
    hint: "Chi\u1EBFm kho\u1EA3ng m\u1ED9t ph\u1EA7n ba b\u1EC1 m\u1EB7t Tr\xE1i \u0110\u1EA5t."
  },
  {
    id: "EMERGENCY_TB_3",
    content: "B\u1EA3ng tu\u1EA7n ho\xE0n c\xE1c nguy\xEAn t\u1ED1 h\xF3a h\u1ECDc \u0111\u1EA7u ti\xEAn do nh\xE0 khoa h\u1ECDc n\xE0o ph\xE1t minh ra?",
    options: [
      { id: "A", text: "Dmitri Mendeleev", isCorrect: true },
      { id: "B", text: "Marie Curie", isCorrect: false },
      { id: "C", text: "Albert Einstein", isCorrect: false },
      { id: "D", text: "Isaac Newton", isCorrect: false }
    ],
    hint: "Nh\xE0 h\xF3a h\u1ECDc ng\u01B0\u1EDDi Nga sinh n\u0103m 1834."
  }
];
async function checkAndTriggerTieBreakerIfTied({
  io: io2,
  room,
  leaderboard,
  roomQuestions,
  onGameEnd
}) {
  const existingTB = roomTieBreakers.get(room.id);
  if (existingTB && existingTB.status === "COMPLETED") {
    return true;
  }
  if (!leaderboard || leaderboard.length < 2) {
    return true;
  }
  const topScore = leaderboard[0].score;
  const tiedTopTeams = leaderboard.filter((t) => t.score === topScore);
  if (tiedTopTeams.length < 2) {
    return true;
  }
  console.log(`\u2694\uFE0F [TIE-BREAKER] Ph\xE1t hi\u1EC7n h\xF2a \u0111i\u1EC3m Top 1 t\u1EA1i ph\xF2ng ${room.code} (${tiedTopTeams.length} \u0111\u1ED9i: ${tiedTopTeams.map((t) => t.name).join(", ")}, \u0110i\u1EC3m: ${topScore})! B\u1EAFt \u0111\u1EA7u c\xE2u h\u1ECFi ph\u1EE5!`);
  let tieQuestions = [];
  if (roomQuestions && roomQuestions.length > 0) {
    tieQuestions = roomQuestions.filter((q) => Boolean(q.isTieBreaker));
  }
  if (tieQuestions.length === 0 && room.quizBankId) {
    const dbQuestions = await prisma.question.findMany({
      where: { quizBankId: room.quizBankId, isTieBreaker: true },
      orderBy: { order: "asc" }
    });
    if (dbQuestions && dbQuestions.length > 0) {
      tieQuestions = dbQuestions;
    }
  }
  if (tieQuestions.length < 3) {
    const needed = 3 - tieQuestions.length;
    tieQuestions = [...tieQuestions, ...EMERGENCY_TIE_BREAKER_QUESTIONS.slice(0, needed)];
  }
  const tiedTeamsInfo = tiedTopTeams.map((t) => {
    const teamObj = (room.teams || []).find((rt) => rt.id === (t.teamId || t.id));
    return {
      id: t.teamId || t.id || "",
      name: t.name,
      score: t.score,
      color: teamObj?.color || "#f59e0b",
      avatar: teamObj?.avatar || "\u{1F451}"
    };
  });
  const tieState = {
    roomId: room.id,
    roomCode: room.code,
    tiedTeams: tiedTeamsInfo,
    questionIndex: 0,
    maxQuestions: 3,
    status: "INTRO",
    questions: tieQuestions.slice(0, 3),
    attemptedTeamIds: []
  };
  roomTieBreakers.set(room.id, tieState);
  io2.to(`room:${room.code}`).emit("game:tie_breaker:state", tieState);
  clearTieBreakerTimer(room.id);
  const introTimer = setTimeout(() => {
    launchTieBreakerQuestion({ io: io2, roomId: room.id, qIndex: 0, onGameEnd });
  }, 4e3);
  tieBreakerTimers.set(room.id, introTimer);
  return false;
}
function launchTieBreakerQuestion({
  io: io2,
  roomId,
  qIndex,
  onGameEnd
}) {
  clearTieBreakerTimer(roomId);
  const tieState = roomTieBreakers.get(roomId);
  if (!tieState) return;
  if (qIndex >= tieState.maxQuestions) {
    launchTieBreakerLuckyDraw({ io: io2, roomId, onGameEnd });
    return;
  }
  const q = tieState.questions?.[qIndex];
  if (!q) {
    launchTieBreakerLuckyDraw({ io: io2, roomId, onGameEnd });
    return;
  }
  const rawOptions = typeof q.options === "string" ? JSON.parse(q.options) : q.options || [];
  const options = rawOptions.map((opt) => ({
    id: opt.id,
    text: opt.text
  }));
  const correctOpt = rawOptions.find((opt) => opt.isCorrect);
  const correctOptionId = correctOpt ? correctOpt.id : q.answer || "A";
  const timeLimit = 20;
  tieState.questionIndex = qIndex;
  tieState.status = "QUESTION_ACTIVE";
  tieState.buzzedTeamId = void 0;
  tieState.buzzedTeamName = void 0;
  tieState.buzzedPlayerName = void 0;
  tieState.buzzedAt = void 0;
  tieState.attemptedTeamIds = [];
  tieState.currentQuestion = {
    id: q.id || `tie-q-${qIndex + 1}`,
    content: q.content,
    options,
    correctOptionId,
    explanation: q.hint || void 0,
    timeLimit,
    endsAt: Date.now() + timeLimit * 1e3
  };
  roomTieBreakers.set(roomId, tieState);
  io2.to(`room:${tieState.roomCode}`).emit("game:tie_breaker:state", tieState);
  const qTimer = setTimeout(() => {
    handleTieQuestionTimeout({ io: io2, roomId, onGameEnd });
  }, timeLimit * 1e3);
  tieBreakerTimers.set(roomId, qTimer);
}
function handleTieQuestionTimeout({
  io: io2,
  roomId,
  onGameEnd
}) {
  const tieState = roomTieBreakers.get(roomId);
  if (!tieState || tieState.status !== "QUESTION_ACTIVE") return;
  tieState.status = "ANSWER_REVEALED";
  roomTieBreakers.set(roomId, tieState);
  io2.to(`room:${tieState.roomCode}`).emit("game:tie_breaker:state", tieState);
  clearTieBreakerTimer(roomId);
  const nextTimer = setTimeout(() => {
    launchTieBreakerQuestion({ io: io2, roomId, qIndex: tieState.questionIndex + 1, onGameEnd });
  }, 3500);
  tieBreakerTimers.set(roomId, nextTimer);
}
function handleTieBreakerBuzz({
  io: io2,
  roomId,
  teamId,
  teamName,
  playerName,
  onGameEnd
}) {
  const tieState = roomTieBreakers.get(roomId);
  if (!tieState || tieState.status !== "QUESTION_ACTIVE") return false;
  const isTiedTeam = tieState.tiedTeams.some((t) => t.id === teamId);
  if (!isTiedTeam) return false;
  if (tieState.attemptedTeamIds.includes(teamId)) return false;
  clearTieBreakerTimer(roomId);
  const answerDuration = 10;
  tieState.status = "BUZZER_LOCKED";
  tieState.buzzedTeamId = teamId;
  tieState.buzzedTeamName = teamName;
  tieState.buzzedPlayerName = playerName;
  tieState.buzzedAt = Date.now();
  tieState.answeringTimeRemaining = answerDuration;
  roomTieBreakers.set(roomId, tieState);
  io2.to(`room:${tieState.roomCode}`).emit("game:tie_breaker:state", tieState);
  const ansTimer = setTimeout(() => {
    handleTieBreakerAnswer({
      io: io2,
      roomId,
      teamId,
      optionId: "__TIMEOUT__",
      onGameEnd
    });
  }, answerDuration * 1e3);
  tieBreakerTimers.set(roomId, ansTimer);
  return true;
}
function handleTieBreakerAnswer({
  io: io2,
  roomId,
  teamId,
  optionId,
  onGameEnd
}) {
  const tieState = roomTieBreakers.get(roomId);
  if (!tieState || tieState.status !== "BUZZER_LOCKED") return;
  if (tieState.buzzedTeamId !== teamId) return;
  clearTieBreakerTimer(roomId);
  const isCorrect = optionId === tieState.currentQuestion?.correctOptionId;
  if (isCorrect) {
    tieState.status = "COMPLETED";
    tieState.championTeamId = teamId;
    tieState.championTeamName = tieState.buzzedTeamName;
    roomTieBreakers.set(roomId, tieState);
    io2.to(`room:${tieState.roomCode}`).emit("game:tie_breaker:state", tieState);
    const endTimer = setTimeout(async () => {
      await onGameEnd();
    }, 5e3);
    tieBreakerTimers.set(roomId, endTimer);
  } else {
    tieState.attemptedTeamIds.push(teamId);
    const remainingTeams = tieState.tiedTeams.filter((t) => !tieState.attemptedTeamIds.includes(t.id));
    if (remainingTeams.length > 0) {
      const retryDuration = 10;
      tieState.status = "QUESTION_ACTIVE";
      tieState.buzzedTeamId = void 0;
      tieState.buzzedTeamName = void 0;
      tieState.buzzedPlayerName = void 0;
      tieState.buzzedAt = void 0;
      if (tieState.currentQuestion) {
        tieState.currentQuestion.endsAt = Date.now() + retryDuration * 1e3;
      }
      roomTieBreakers.set(roomId, tieState);
      io2.to(`room:${tieState.roomCode}`).emit("game:tie_breaker:state", tieState);
      const retryTimer = setTimeout(() => {
        handleTieQuestionTimeout({ io: io2, roomId, onGameEnd });
      }, retryDuration * 1e3);
      tieBreakerTimers.set(roomId, retryTimer);
    } else {
      tieState.status = "ANSWER_REVEALED";
      roomTieBreakers.set(roomId, tieState);
      io2.to(`room:${tieState.roomCode}`).emit("game:tie_breaker:state", tieState);
      const nextTimer = setTimeout(() => {
        launchTieBreakerQuestion({ io: io2, roomId, qIndex: tieState.questionIndex + 1, onGameEnd });
      }, 3500);
      tieBreakerTimers.set(roomId, nextTimer);
    }
  }
}
function launchTieBreakerLuckyDraw({
  io: io2,
  roomId,
  onGameEnd: _onGameEnd
}) {
  clearTieBreakerTimer(roomId);
  const tieState = roomTieBreakers.get(roomId);
  if (!tieState) return;
  const count = tieState.tiedTeams.length;
  const envelopes = Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    isChampion: false,
    isOpened: false
  }));
  const luckyIndex = Math.floor(Math.random() * count);
  envelopes[luckyIndex].isChampion = true;
  tieState.status = "LUCKY_DRAW";
  tieState.luckyDraw = {
    envelopes,
    currentTurnTeamId: tieState.tiedTeams[0]?.id,
    currentTurnTeamName: tieState.tiedTeams[0]?.name
  };
  roomTieBreakers.set(roomId, tieState);
  io2.to(`room:${tieState.roomCode}`).emit("game:tie_breaker:state", tieState);
}
function handleTieBreakerLuckyPick({
  io: io2,
  roomId,
  teamId,
  envelopeId,
  onGameEnd
}) {
  const tieState = roomTieBreakers.get(roomId);
  if (!tieState || tieState.status !== "LUCKY_DRAW" || !tieState.luckyDraw) return;
  const env = tieState.luckyDraw.envelopes.find((e) => e.id === envelopeId);
  if (!env || env.isOpened) return;
  const team = tieState.tiedTeams.find((t) => t.id === teamId);
  if (!team) return;
  env.isOpened = true;
  env.pickedByTeamId = team.id;
  env.pickedByTeamName = team.name;
  let winnerTeam = team;
  if (!env.isChampion) {
    const otherTeam = tieState.tiedTeams.find((t) => t.id !== teamId);
    if (otherTeam) {
      winnerTeam = otherTeam;
    }
  }
  tieState.luckyDraw.envelopes.forEach((e) => {
    e.isOpened = true;
  });
  tieState.status = "COMPLETED";
  tieState.championTeamId = winnerTeam.id;
  tieState.championTeamName = winnerTeam.name;
  tieState.luckyDraw.winnerTeamId = winnerTeam.id;
  tieState.luckyDraw.winnerTeamName = winnerTeam.name;
  roomTieBreakers.set(roomId, tieState);
  io2.to(`room:${tieState.roomCode}`).emit("game:tie_breaker:state", tieState);
  clearTieBreakerTimer(roomId);
  const endTimer = setTimeout(async () => {
    await onGameEnd();
  }, 5500);
  tieBreakerTimers.set(roomId, endTimer);
}

// src/lib/socket-handlers.ts
var globalIO;
var pendingDisconnects = /* @__PURE__ */ new Map();
var socketPlayerSessions = /* @__PURE__ */ new Map();
var playerSessions = /* @__PURE__ */ new Map();
var roomBuzzArbitration = /* @__PURE__ */ new Map();
var roomBuzzWindowOpenedAt = /* @__PURE__ */ new Map();
var roomStealOpenedAt = /* @__PURE__ */ new Map();
var roomStealEndsAt = /* @__PURE__ */ new Map();
var roomQuestionStartedAt = /* @__PURE__ */ new Map();
var playerSockets = /* @__PURE__ */ new Map();
var adminSockets = /* @__PURE__ */ new Map();
var roomTimers = /* @__PURE__ */ new Map();
var roomRemainingTimes = /* @__PURE__ */ new Map();
var roomTimerEndsAt = /* @__PURE__ */ new Map();
var roomQuestionTeamCards = /* @__PURE__ */ new Map();
var roomFrozenTeams = /* @__PURE__ */ new Map();
var roomFiftyFifty = /* @__PURE__ */ new Map();
var roomQuestionProcessed = /* @__PURE__ */ new Set();
var roomQuestionScoresCache = /* @__PURE__ */ new Map();
var roomSandboxActiveTeam = /* @__PURE__ */ new Map();
var roomPrepareStates = /* @__PURE__ */ new Map();
var roomPrimaryTeams = /* @__PURE__ */ new Map();
var roomStealPhase = /* @__PURE__ */ new Map();
var roomStealBuzzed = /* @__PURE__ */ new Map();
var roomStealTimer = /* @__PURE__ */ new Map();
var roomBuzzFirst = /* @__PURE__ */ new Map();
var roomBuzzUnlocked = /* @__PURE__ */ new Map();
var roomBuzzDelayTimers = /* @__PURE__ */ new Map();
var roomBuzzAttemptOrder = /* @__PURE__ */ new Map();
var roomBuzzWindowTimers = /* @__PURE__ */ new Map();
var roomBuzzWindowEndsAt = /* @__PURE__ */ new Map();
var roomBuzzWindowRemaining = /* @__PURE__ */ new Map();
var roomBuzzDisqualified = /* @__PURE__ */ new Map();
var roomBuzzAnsweringTimers = /* @__PURE__ */ new Map();
var roomTotalActorsCache = /* @__PURE__ */ new Map();
var roomTournaments = /* @__PURE__ */ new Map();
var roomGridCaros = /* @__PURE__ */ new Map();
var roomDiceRaces = /* @__PURE__ */ new Map();
var roomWagers = /* @__PURE__ */ new Map();
var roomMysteryQuests = /* @__PURE__ */ new Map();
var roomTarotPendingScores = /* @__PURE__ */ new Map();
var roomUsedQuestions = /* @__PURE__ */ new Map();
var roomWagerTimers = /* @__PURE__ */ new Map();
var roomWagerAutoLaunchTimers = /* @__PURE__ */ new Map();
var roomGridTimers = /* @__PURE__ */ new Map();
var roomActiveQuestions = /* @__PURE__ */ new Map();
var roomRevealPayloads = /* @__PURE__ */ new Map();
var roomIntermissions = /* @__PURE__ */ new Map();
var roomIntermissionTimers = /* @__PURE__ */ new Map();
var teamStreakMap = /* @__PURE__ */ new Map();
var playerStreakMap = /* @__PURE__ */ new Map();
var roomBouncebackSelectedPoints = /* @__PURE__ */ new Map();
var roomFinalizedActors = /* @__PURE__ */ new Map();
var roomSubmittedActors = /* @__PURE__ */ new Map();
var roomTeamImmunity = /* @__PURE__ */ new Map();
var roomSharedPowerupUsedInQuestion = /* @__PURE__ */ new Map();
var inFlightPowerupCards = /* @__PURE__ */ new Set();
var inFlightAdminActions = /* @__PURE__ */ new Set();
var roomGoldQuestions = /* @__PURE__ */ new Map();
var roomEliminationGhostStats = /* @__PURE__ */ new Map();
function selectGoldQuestions(questions) {
  const goldSet = /* @__PURE__ */ new Set();
  if (questions.length < 7) return goldSet;
  const count = Math.max(1, Math.floor(questions.length * 0.15));
  const highDiffIndices = [];
  const otherIndices = [];
  questions.forEach((q, idx) => {
    const isHigh = q.points === 30 || ["APPLY", "ANALYZE", "EVALUATE", "CREATE"].includes(q.bloomLevel);
    if (isHigh) {
      highDiffIndices.push(idx);
    } else {
      otherIndices.push(idx);
    }
  });
  const candidates = [...highDiffIndices, ...otherIndices.reverse()];
  for (const idx of candidates) {
    if (goldSet.size >= count) break;
    goldSet.add(questions[idx].id);
  }
  return goldSet;
}
async function persistGameStateSnapshot(roomId) {
  try {
    const room = await prisma.room.findUnique({ where: { id: roomId }, select: { config: true } });
    if (!room) return;
    const currentConfig = room.config || {};
    const snapshot = {};
    if (roomGridCaros.has(roomId)) snapshot.gridCaroState = roomGridCaros.get(roomId);
    if (roomDiceRaces.has(roomId)) snapshot.diceRaceState = roomDiceRaces.get(roomId);
    if (roomWagers.has(roomId)) snapshot.wagerState = roomWagers.get(roomId);
    if (roomMysteryQuests.has(roomId)) snapshot.mysteryQuestState = roomMysteryQuests.get(roomId);
    if (roomTournaments.has(roomId)) snapshot.tournamentState = roomTournaments.get(roomId);
    if (roomActiveQuestions.has(roomId)) snapshot.activeQuestion = roomActiveQuestions.get(roomId);
    if (roomUsedQuestions.has(roomId)) {
      snapshot.usedQuestions = Array.from(roomUsedQuestions.get(roomId));
    }
    if (roomEliminationGhostStats.has(roomId)) {
      snapshot.ghostStats = Array.from(roomEliminationGhostStats.get(roomId).entries());
    }
    await prisma.room.update({
      where: { id: roomId },
      data: { config: { ...currentConfig, gameStateSnapshot: snapshot } }
    });
  } catch (err) {
    console.error("[persistGameStateSnapshot] Error:", err);
  }
}
function restoreGameStateSnapshot(room) {
  if (!room) return;
  try {
    const snapshot = room.config?.gameStateSnapshot;
    if (!snapshot) return;
    if (snapshot.gridCaroState && !roomGridCaros.has(room.id)) {
      roomGridCaros.set(room.id, snapshot.gridCaroState);
    }
    if (snapshot.diceRaceState && !roomDiceRaces.has(room.id)) {
      roomDiceRaces.set(room.id, snapshot.diceRaceState);
    }
    if (snapshot.wagerState && !roomWagers.has(room.id)) {
      roomWagers.set(room.id, snapshot.wagerState);
    }
    if (snapshot.mysteryQuestState && !roomMysteryQuests.has(room.id)) {
      roomMysteryQuests.set(room.id, snapshot.mysteryQuestState);
    }
    if (snapshot.tournamentState && !roomTournaments.has(room.id)) {
      roomTournaments.set(room.id, snapshot.tournamentState);
    }
    if (snapshot.activeQuestion && !roomActiveQuestions.has(room.id)) {
      roomActiveQuestions.set(room.id, snapshot.activeQuestion);
    }
    if (Array.isArray(snapshot.usedQuestions) && !roomUsedQuestions.has(room.id)) {
      roomUsedQuestions.set(room.id, new Set(snapshot.usedQuestions));
    }
    if (snapshot.ghostStats && !roomEliminationGhostStats.has(room.id)) {
      if (Array.isArray(snapshot.ghostStats)) {
        roomEliminationGhostStats.set(room.id, new Map(snapshot.ghostStats));
      } else if (typeof snapshot.ghostStats === "object") {
        roomEliminationGhostStats.set(room.id, new Map(Object.entries(snapshot.ghostStats)));
      }
    }
  } catch (err) {
    console.warn("[restoreGameStateSnapshot] Error restoring snapshot:", err);
  }
}
function isSandboxRoomEntity(room) {
  if (!room) return false;
  return Boolean(
    room.name?.includes("Sandbox") || room.name?.startsWith("[Sandbox]") || room.config?.isSandbox || room.code?.startsWith("sb_") || roomSandboxActiveTeam.has(room.id)
  );
}
var teamScoreLocks = /* @__PURE__ */ new Map();
var playerScoreLocks = /* @__PURE__ */ new Map();
var submissionLocks = /* @__PURE__ */ new Map();
async function applyScoreDeltaToTeam(teamId, delta) {
  while (teamScoreLocks.has(teamId)) {
    try {
      await teamScoreLocks.get(teamId);
    } catch {
    }
  }
  let resolveLock;
  const lockPromise = new Promise((res) => {
    resolveLock = res;
  });
  teamScoreLocks.set(teamId, lockPromise);
  try {
    return await prisma.$transaction(async (tx) => {
      const current = await tx.team.findUnique({ where: { id: teamId }, select: { score: true } });
      const oldScore = current?.score ?? 0;
      const newScore = Math.max(0, oldScore + delta);
      const effectiveDelta = newScore - oldScore;
      await tx.team.update({
        where: { id: teamId },
        data: { score: newScore }
      });
      return { oldScore, newScore, effectiveDelta };
    });
  } finally {
    teamScoreLocks.delete(teamId);
    resolveLock();
  }
}
async function applyScoreDeltaToPlayer(playerId, delta) {
  while (playerScoreLocks.has(playerId)) {
    try {
      await playerScoreLocks.get(playerId);
    } catch {
    }
  }
  let resolveLock;
  const lockPromise = new Promise((res) => {
    resolveLock = res;
  });
  playerScoreLocks.set(playerId, lockPromise);
  try {
    return await prisma.$transaction(async (tx) => {
      const current = await tx.player.findUnique({ where: { id: playerId }, select: { score: true } });
      const oldScore = current?.score ?? 0;
      const newScore = Math.max(0, oldScore + delta);
      const effectiveDelta = newScore - oldScore;
      await tx.player.update({
        where: { id: playerId },
        data: { score: newScore }
      });
      return { oldScore, newScore, effectiveDelta };
    });
  } finally {
    playerScoreLocks.delete(playerId);
    resolveLock();
  }
}
function getNextUniqueQuestion(roomId, rawQuestions, preferredIndex, targetPoints) {
  if (!rawQuestions || rawQuestions.length === 0) return null;
  let usedSet = roomUsedQuestions.get(roomId);
  if (!usedSet) {
    usedSet = /* @__PURE__ */ new Set();
    roomUsedQuestions.set(roomId, usedSet);
  }
  if (usedSet.size >= rawQuestions.length) {
    return null;
  }
  if (preferredIndex !== void 0 && preferredIndex >= 0 && preferredIndex < rawQuestions.length) {
    const candidate = rawQuestions[preferredIndex];
    if (candidate && !usedSet.has(candidate.id)) {
      usedSet.add(candidate.id);
      if (targetPoints) {
        candidate.points = targetPoints;
        candidate.bloomLevel = getBloomLevelFromPoints(targetPoints);
      }
      return { question: candidate, index: preferredIndex };
    }
  }
  if (targetPoints) {
    for (let i = 0; i < rawQuestions.length; i++) {
      const candidate = rawQuestions[i];
      if (!usedSet.has(candidate.id)) {
        const normPts = normalizeToThreeLevels(candidate.points || 10);
        if (normPts === targetPoints) {
          usedSet.add(candidate.id);
          candidate.points = targetPoints;
          candidate.bloomLevel = getBloomLevelFromPoints(targetPoints);
          return { question: candidate, index: i };
        }
      }
    }
  }
  for (let i = 0; i < rawQuestions.length; i++) {
    const candidate = rawQuestions[i];
    if (!usedSet.has(candidate.id)) {
      usedSet.add(candidate.id);
      if (targetPoints) {
        candidate.points = targetPoints;
        candidate.bloomLevel = getBloomLevelFromPoints(targetPoints);
      }
      return { question: candidate, index: i };
    }
  }
  return null;
}
function startGridCaroPreview(ioInstance, roomId, roomCode, durationSec = 5) {
  const gridState = roomGridCaros.get(roomId);
  if (!gridState) return;
  const prevTimer = roomGridTimers.get(roomId);
  if (prevTimer) clearInterval(prevTimer);
  gridState.previewActive = true;
  gridState.previewRemaining = durationSec;
  ioInstance.to(`room:${roomCode}`).emit("game:grid:update", gridState);
  let rem = durationSec;
  const pTimer = setInterval(() => {
    rem--;
    gridState.previewRemaining = rem;
    if (rem <= 0) {
      clearInterval(pTimer);
      roomGridTimers.delete(roomId);
      gridState.previewActive = false;
      gridState.previewRemaining = 0;
      ioInstance.to(`room:${roomCode}`).emit("game:grid:update", gridState);
    } else {
      ioInstance.to(`room:${roomCode}`).emit("game:grid:update", gridState);
    }
  }, 1e3);
  roomGridTimers.set(roomId, pTimer);
}
function stopGridCaroPreview(ioInstance, roomId, roomCode) {
  const gTimer = roomGridTimers.get(roomId);
  if (gTimer) {
    clearInterval(gTimer);
    roomGridTimers.delete(roomId);
  }
  const gridState = roomGridCaros.get(roomId);
  if (gridState) {
    gridState.previewActive = false;
    gridState.previewRemaining = 0;
    ioInstance.to(`room:${roomCode}`).emit("game:grid:update", gridState);
  }
}
async function assignDefaultWagerTeamIfNone(roomId, wagerState) {
  if (!wagerState.lastWagerTeamId || !wagerState.wagerHistory || wagerState.wagerHistory.length === 0) {
    const teams = await prisma.team.findMany({ where: { roomId } });
    const activeTeams = teams.filter((t) => !t.isEliminated);
    const prevWagerTeamId = wagerState.previousQuestionWagerTeamId;
    const eligibleTeams = prevWagerTeamId && activeTeams.filter((t) => t.id !== prevWagerTeamId).length > 0 ? activeTeams.filter((t) => t.id !== prevWagerTeamId) : activeTeams;
    const teamsGte10 = eligibleTeams.filter((t) => t.score >= 10);
    let pickedTeam;
    let assignedWager = 10;
    if (teamsGte10.length > 0) {
      pickedTeam = teamsGte10[Math.floor(Math.random() * teamsGte10.length)];
      assignedWager = 10;
    } else {
      const teams5 = eligibleTeams.filter((t) => t.score === 5);
      const pool5 = teams5.length > 0 ? teams5 : eligibleTeams.filter((t) => t.score > 0);
      if (pool5.length > 0) {
        pickedTeam = pool5[Math.floor(Math.random() * pool5.length)];
        assignedWager = Math.min(5, pickedTeam.score > 0 ? pickedTeam.score : 5);
      }
    }
    if (pickedTeam) {
      wagerState.currentHighestWager = assignedWager;
      wagerState.lastWagerTeamId = pickedTeam.id;
      wagerState.autoAssignedTeamId = pickedTeam.id;
      wagerState.autoAssignedTeamName = pickedTeam.name;
      wagerState.wagerHistory = [{
        order: 1,
        teamId: pickedTeam.id,
        teamName: pickedTeam.name,
        teamColor: pickedTeam.color,
        amount: assignedWager,
        timestamp: Date.now()
      }];
      wagerState.teamWagers[pickedTeam.id] = {
        teamId: pickedTeam.id,
        teamName: pickedTeam.name,
        amount: assignedWager,
        submitted: true,
        order: 1
      };
    }
  }
}
async function launchWagerQuestion(ioInstance, roomId, _roomCode) {
  const existingAutoTimer = roomWagerAutoLaunchTimers.get(roomId);
  if (existingAutoTimer) {
    clearTimeout(existingAutoTimer);
    roomWagerAutoLaunchTimers.delete(roomId);
  }
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } }
  });
  if (!room || room.mode !== "WAGER" || room.status !== "PLAYING") return;
  const wagerState = roomWagers.get(room.id);
  if (!wagerState) return;
  const questions = room.quizBank?.questions ?? [];
  const q = questions[room.currentQuestion];
  if (!q) return;
  q.points = normalizeToThreeLevels(q.points || 10);
  wagerState.phase = "QUESTION_PERIOD";
  wagerState.questionReady = true;
  wagerState.autoLaunchCountdown = void 0;
  wagerState.baseQuestionPoints = q.points;
  const mult = wagerState.wagerMultiplierCap ?? 2.5;
  wagerState.maxBetCap = Math.floor(q.points * mult);
  const qKey = `${room.id}:${q.id}`;
  roomQuestionProcessed.delete(qKey);
  roomQuestionScoresCache.delete(qKey);
  let winningTeamName = wagerState.autoAssignedTeamName || "\u0110\u1ED9i c\u01B0\u1EE3c";
  if (wagerState.lastWagerTeamId) {
    const teamObj = await prisma.team.findUnique({ where: { id: wagerState.lastWagerTeamId } });
    if (teamObj) winningTeamName = teamObj.name;
  }
  const answerMethod = room.config?.answerMethod ?? "DEVICE";
  const isDeviceAnswer = answerMethod === "DEVICE";
  const bloomLevel = getBloomLevelFromPoints(q.points);
  const effectiveTimeLimit = isDeviceAnswer ? getStandardQuestionTimeLimit(q) : quantizeOlympiaTimeLimit(q.points, q.timeLimit);
  const questionState = buildQuestionState(q, {
    bloomLevel,
    answerMethod,
    wagerPhase: "QUESTION_PERIOD",
    primaryTeamId: wagerState.lastWagerTeamId,
    primaryTeamName: winningTeamName
  });
  questionState.question.points = q.points;
  questionState.timeLimit = effectiveTimeLimit;
  questionState.question.timeLimit = effectiveTimeLimit;
  const autoTimer = room.config?.autoTimerStart ?? false;
  if (autoTimer) {
    questionState.timerPending = false;
    questionState.timerStarted = true;
    startQuestionTimer(ioInstance, room.code, room.id, q.id, effectiveTimeLimit);
  } else {
    questionState.timerPending = true;
    questionState.timerStarted = false;
  }
  roomActiveQuestions.set(room.id, questionState);
  ioInstance.to(`room:${room.code}`).emit("game:question", questionState);
  ioInstance.to(`room:${room.code}:admin`).emit("admin:question:data", {
    questionId: q.id,
    options: q.options,
    answer: q.answer,
    type: q.type,
    explanation: q.hint || q.explanation
  });
  ioInstance.to(`room:${room.code}`).emit("game:wager:update", wagerState);
}
function scheduleWagerAutoLaunch(ioInstance, roomId, roomCode) {
  const existingAutoTimer = roomWagerAutoLaunchTimers.get(roomId);
  if (existingAutoTimer) {
    clearTimeout(existingAutoTimer);
  }
  const timer = setTimeout(async () => {
    roomWagerAutoLaunchTimers.delete(roomId);
    await launchWagerQuestion(ioInstance, roomId, roomCode);
  }, 2500);
  roomWagerAutoLaunchTimers.set(roomId, timer);
}
function checkCanAnyTeamBet(allTeams, wagerState, nextMinOption) {
  if (wagerState.maxBetCap && nextMinOption > wagerState.maxBetCap) {
    return false;
  }
  return allTeams.some((t) => {
    if (t.isEliminated) return false;
    if (wagerState.previousQuestionWagerTeamId && t.id === wagerState.previousQuestionWagerTeamId) {
      return false;
    }
    if (wagerState.lastWagerTeamId === t.id && wagerState.autoAssignedTeamId !== t.id) {
      return false;
    }
    return t.score >= nextMinOption;
  });
}
async function lockWagerAndScheduleAutoLaunch(ioInstance, roomId, roomCode, wagerState) {
  const existingTimer = roomWagerTimers.get(roomId);
  if (existingTimer) {
    clearInterval(existingTimer);
    clearTimeout(existingTimer);
    roomWagerTimers.delete(roomId);
  }
  await assignDefaultWagerTeamIfNone(roomId, wagerState);
  wagerState.phase = "QUESTION_PERIOD";
  wagerState.questionReady = false;
  wagerState.wagerTimeRemaining = 0;
  ioInstance.to(`room:${roomCode}`).emit("game:wager:update", wagerState);
  scheduleWagerAutoLaunch(ioInstance, roomId, roomCode);
}
function startWager15sCountdown(ioInstance, roomId, roomCode, duration) {
  const existingTimer = roomWagerTimers.get(roomId);
  if (existingTimer) {
    clearInterval(existingTimer);
    clearTimeout(existingTimer);
    roomWagerTimers.delete(roomId);
  }
  const existingAutoLaunch = roomWagerAutoLaunchTimers.get(roomId);
  if (existingAutoLaunch) {
    clearTimeout(existingAutoLaunch);
    roomWagerAutoLaunchTimers.delete(roomId);
  }
  const wagerState = roomWagers.get(roomId);
  if (!wagerState) return;
  const wagerTime = duration && duration > 0 ? duration : 15;
  wagerState.wagerSubPhase = "MAIN_15S";
  wagerState.wagerTimeRemaining = wagerTime;
  wagerState.wagerTimeTotal = wagerTime;
  ioInstance.to(`room:${roomCode}`).emit("game:wager:update", wagerState);
  let wRem = wagerTime;
  const wTimer = setInterval(async () => {
    wRem--;
    wagerState.wagerTimeRemaining = wRem;
    if (wRem <= 0) {
      clearInterval(wTimer);
      roomWagerTimers.delete(roomId);
      await assignDefaultWagerTeamIfNone(roomId, wagerState);
      wagerState.phase = "QUESTION_PERIOD";
      wagerState.questionReady = false;
      wagerState.wagerTimeRemaining = 0;
      ioInstance.to(`room:${roomCode}`).emit("game:wager:update", wagerState);
      scheduleWagerAutoLaunch(ioInstance, roomId, roomCode);
    } else {
      ioInstance.to(`room:${roomCode}`).emit("game:wager:update", wagerState);
    }
  }, 1e3);
  roomWagerTimers.set(roomId, wTimer);
}
function checkGridCaroStreak(cells, rows, cols, teamId, targetK) {
  if (rows < 4 || cols < 4 || targetK < 3) return null;
  const cellMap = /* @__PURE__ */ new Map();
  cells.forEach((c) => {
    cellMap.set(`${c.row},${c.col}`, c);
  });
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c <= cols - targetK; c++) {
      const streakCells = [];
      for (let k = 0; k < targetK; k++) {
        const cell = cellMap.get(`${r},${c + k}`);
        if (cell && cell.isCompleted && cell.claimedByTeamId === teamId) {
          streakCells.push(cell);
        }
      }
      if (streakCells.length === targetK) return streakCells;
    }
  }
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r <= rows - targetK; r++) {
      const streakCells = [];
      for (let k = 0; k < targetK; k++) {
        const cell = cellMap.get(`${r + k},${c}`);
        if (cell && cell.isCompleted && cell.claimedByTeamId === teamId) {
          streakCells.push(cell);
        }
      }
      if (streakCells.length === targetK) return streakCells;
    }
  }
  for (let r = 0; r <= rows - targetK; r++) {
    for (let c = 0; c <= cols - targetK; c++) {
      const streakCells = [];
      for (let k = 0; k < targetK; k++) {
        const cell = cellMap.get(`${r + k},${c + k}`);
        if (cell && cell.isCompleted && cell.claimedByTeamId === teamId) {
          streakCells.push(cell);
        }
      }
      if (streakCells.length === targetK) return streakCells;
    }
  }
  for (let r = 0; r <= rows - targetK; r++) {
    for (let c = targetK - 1; c < cols; c++) {
      const streakCells = [];
      for (let k = 0; k < targetK; k++) {
        const cell = cellMap.get(`${r + k},${c - k}`);
        if (cell && cell.isCompleted && cell.claimedByTeamId === teamId) {
          streakCells.push(cell);
        }
      }
      if (streakCells.length === targetK) return streakCells;
    }
  }
  return null;
}
function buildTournamentMatches(teams, questionsPerMatch) {
  const matches = [];
  const teamCount = teams.length;
  if (teamCount <= 2) {
    matches.push({
      id: "FINAL",
      roundIndex: 0,
      roundName: "Chung k\u1EBFt",
      matchIndex: 0,
      team1Id: teams[0]?.id,
      team1Name: teams[0]?.name,
      team1Color: teams[0]?.color,
      team2Id: teams[1]?.id,
      team2Name: teams[1]?.name,
      team2Color: teams[1]?.color,
      team1Score: 0,
      team2Score: 0,
      status: "IN_PROGRESS",
      currentQuestionInMatch: 0,
      totalQuestionsInMatch: questionsPerMatch
    });
    return matches;
  }
  if (teamCount === 3) {
    matches.push(
      {
        id: "SF-1",
        roundIndex: 0,
        roundName: "B\xE1n k\u1EBFt",
        matchIndex: 0,
        team1Id: teams[1]?.id,
        team1Name: teams[1]?.name,
        team1Color: teams[1]?.color,
        team2Id: teams[2]?.id,
        team2Name: teams[2]?.name,
        team2Color: teams[2]?.color,
        team1Score: 0,
        team2Score: 0,
        status: "IN_PROGRESS",
        currentQuestionInMatch: 0,
        totalQuestionsInMatch: questionsPerMatch
      },
      {
        id: "FINAL",
        roundIndex: 1,
        roundName: "Chung k\u1EBFt",
        matchIndex: 1,
        team1Id: teams[0]?.id,
        team1Name: teams[0]?.name,
        team1Color: teams[0]?.color,
        team1Score: 0,
        team2Score: 0,
        status: "UPCOMING",
        currentQuestionInMatch: 0,
        totalQuestionsInMatch: questionsPerMatch
      }
    );
    return matches;
  }
  if (teamCount === 4) {
    matches.push(
      {
        id: "SF-1",
        roundIndex: 0,
        roundName: "B\xE1n k\u1EBFt 1",
        matchIndex: 0,
        team1Id: teams[0]?.id,
        team1Name: teams[0]?.name,
        team1Color: teams[0]?.color,
        team2Id: teams[3]?.id,
        team2Name: teams[3]?.name,
        team2Color: teams[3]?.color,
        team1Score: 0,
        team2Score: 0,
        status: "IN_PROGRESS",
        currentQuestionInMatch: 0,
        totalQuestionsInMatch: questionsPerMatch
      },
      {
        id: "SF-2",
        roundIndex: 0,
        roundName: "B\xE1n k\u1EBFt 2",
        matchIndex: 1,
        team1Id: teams[1]?.id,
        team1Name: teams[1]?.name,
        team1Color: teams[1]?.color,
        team2Id: teams[2]?.id,
        team2Name: teams[2]?.name,
        team2Color: teams[2]?.color,
        team1Score: 0,
        team2Score: 0,
        status: "UPCOMING",
        currentQuestionInMatch: 0,
        totalQuestionsInMatch: questionsPerMatch
      },
      {
        id: "FINAL",
        roundIndex: 1,
        roundName: "Chung k\u1EBFt",
        matchIndex: 2,
        team1Score: 0,
        team2Score: 0,
        status: "UPCOMING",
        currentQuestionInMatch: 0,
        totalQuestionsInMatch: questionsPerMatch
      }
    );
    return matches;
  }
  if (teamCount === 5) {
    matches.push(
      {
        id: "QF-1",
        roundIndex: 0,
        roundName: "V\xF2ng lo\u1EA1i T\u1EE9 k\u1EBFt",
        matchIndex: 0,
        team1Id: teams[3]?.id,
        team1Name: teams[3]?.name,
        team1Color: teams[3]?.color,
        team2Id: teams[4]?.id,
        team2Name: teams[4]?.name,
        team2Color: teams[4]?.color,
        team1Score: 0,
        team2Score: 0,
        status: "IN_PROGRESS",
        currentQuestionInMatch: 0,
        totalQuestionsInMatch: questionsPerMatch
      },
      {
        id: "SF-1",
        roundIndex: 1,
        roundName: "B\xE1n k\u1EBFt 1",
        matchIndex: 1,
        team1Id: teams[0]?.id,
        team1Name: teams[0]?.name,
        team1Color: teams[0]?.color,
        team1Score: 0,
        team2Score: 0,
        status: "UPCOMING",
        currentQuestionInMatch: 0,
        totalQuestionsInMatch: questionsPerMatch
      },
      {
        id: "SF-2",
        roundIndex: 1,
        roundName: "B\xE1n k\u1EBFt 2",
        matchIndex: 2,
        team1Id: teams[1]?.id,
        team1Name: teams[1]?.name,
        team1Color: teams[1]?.color,
        team2Id: teams[2]?.id,
        team2Name: teams[2]?.name,
        team2Color: teams[2]?.color,
        team1Score: 0,
        team2Score: 0,
        status: "UPCOMING",
        currentQuestionInMatch: 0,
        totalQuestionsInMatch: questionsPerMatch
      },
      {
        id: "FINAL",
        roundIndex: 2,
        roundName: "Chung k\u1EBFt",
        matchIndex: 3,
        team1Score: 0,
        team2Score: 0,
        status: "UPCOMING",
        currentQuestionInMatch: 0,
        totalQuestionsInMatch: questionsPerMatch
      }
    );
    return matches;
  }
  if (teamCount === 6) {
    matches.push(
      {
        id: "QF-1",
        roundIndex: 0,
        roundName: "T\u1EE9 k\u1EBFt 1",
        matchIndex: 0,
        team1Id: teams[2]?.id,
        team1Name: teams[2]?.name,
        team1Color: teams[2]?.color,
        team2Id: teams[5]?.id,
        team2Name: teams[5]?.name,
        team2Color: teams[5]?.color,
        team1Score: 0,
        team2Score: 0,
        status: "IN_PROGRESS",
        currentQuestionInMatch: 0,
        totalQuestionsInMatch: questionsPerMatch
      },
      {
        id: "QF-2",
        roundIndex: 0,
        roundName: "T\u1EE9 k\u1EBFt 2",
        matchIndex: 1,
        team1Id: teams[3]?.id,
        team1Name: teams[3]?.name,
        team1Color: teams[3]?.color,
        team2Id: teams[4]?.id,
        team2Name: teams[4]?.name,
        team2Color: teams[4]?.color,
        team1Score: 0,
        team2Score: 0,
        status: "UPCOMING",
        currentQuestionInMatch: 0,
        totalQuestionsInMatch: questionsPerMatch
      },
      {
        id: "SF-1",
        roundIndex: 1,
        roundName: "B\xE1n k\u1EBFt 1",
        matchIndex: 2,
        team1Id: teams[0]?.id,
        team1Name: teams[0]?.name,
        team1Color: teams[0]?.color,
        team1Score: 0,
        team2Score: 0,
        status: "UPCOMING",
        currentQuestionInMatch: 0,
        totalQuestionsInMatch: questionsPerMatch
      },
      {
        id: "SF-2",
        roundIndex: 1,
        roundName: "B\xE1n k\u1EBFt 2",
        matchIndex: 3,
        team1Id: teams[1]?.id,
        team1Name: teams[1]?.name,
        team1Color: teams[1]?.color,
        team1Score: 0,
        team2Score: 0,
        status: "UPCOMING",
        currentQuestionInMatch: 0,
        totalQuestionsInMatch: questionsPerMatch
      },
      {
        id: "FINAL",
        roundIndex: 2,
        roundName: "Chung k\u1EBFt",
        matchIndex: 4,
        team1Score: 0,
        team2Score: 0,
        status: "UPCOMING",
        currentQuestionInMatch: 0,
        totalQuestionsInMatch: questionsPerMatch
      }
    );
    return matches;
  }
  const isSeven = teamCount === 7;
  const qfCount = isSeven ? 3 : 4;
  for (let i = 0; i < qfCount; i++) {
    const t1 = isSeven ? teams[i + 1] : teams[i * 2];
    const t2 = isSeven ? teams[6 - i] : teams[i * 2 + 1];
    matches.push({
      id: `QF-${i + 1}`,
      roundIndex: 0,
      roundName: `T\u1EE9 k\u1EBFt ${i + 1}`,
      matchIndex: i,
      team1Id: t1?.id,
      team1Name: t1?.name,
      team1Color: t1?.color,
      team2Id: t2?.id,
      team2Name: t2?.name,
      team2Color: t2?.color,
      team1Score: 0,
      team2Score: 0,
      status: i === 0 ? "IN_PROGRESS" : "UPCOMING",
      currentQuestionInMatch: 0,
      totalQuestionsInMatch: questionsPerMatch
    });
  }
  matches.push(
    {
      id: "SF-1",
      roundIndex: 1,
      roundName: "B\xE1n k\u1EBFt 1",
      matchIndex: qfCount,
      team1Id: isSeven ? teams[0]?.id : void 0,
      team1Name: isSeven ? teams[0]?.name : void 0,
      team1Color: isSeven ? teams[0]?.color : void 0,
      team1Score: 0,
      team2Score: 0,
      status: "UPCOMING",
      currentQuestionInMatch: 0,
      totalQuestionsInMatch: questionsPerMatch
    },
    {
      id: "SF-2",
      roundIndex: 1,
      roundName: "B\xE1n k\u1EBFt 2",
      matchIndex: qfCount + 1,
      team1Score: 0,
      team2Score: 0,
      status: "UPCOMING",
      currentQuestionInMatch: 0,
      totalQuestionsInMatch: questionsPerMatch
    },
    {
      id: "FINAL",
      roundIndex: 2,
      roundName: "Chung k\u1EBFt",
      matchIndex: qfCount + 2,
      team1Score: 0,
      team2Score: 0,
      status: "UPCOMING",
      currentQuestionInMatch: 0,
      totalQuestionsInMatch: questionsPerMatch
    }
  );
  return matches;
}
var roomCache = /* @__PURE__ */ new Map();
var roomQuestionsCache = /* @__PURE__ */ new Map();
var roomActiveAnswers = /* @__PURE__ */ new Map();
var roomOriginalQuestions = /* @__PURE__ */ new Map();
var currentSubmissionStorage = new import_async_hooks.AsyncLocalStorage();
var roomPendingSubmissions = /* @__PURE__ */ new Map();
async function waitForPendingSubmissions(roomId, timeoutMs = 1500) {
  const pending = roomPendingSubmissions.get(roomId);
  if (!pending || pending.size === 0) return;
  const currentTask = currentSubmissionStorage.getStore();
  const otherTasks = Array.from(pending).filter((p) => p !== currentTask);
  if (otherTasks.length === 0) return;
  await Promise.race([
    Promise.allSettled(otherTasks),
    new Promise((r) => setTimeout(r, timeoutMs))
  ]);
}
function cleanupRoomInMemory(roomId) {
  try {
    for (const [key, timer] of roomTimers.entries()) {
      if (key === roomId || key.startsWith(`${roomId}:`)) {
        clearInterval(timer);
        roomTimers.delete(key);
      }
    }
    const wagerTimer = roomWagerTimers.get(roomId);
    if (wagerTimer) {
      clearInterval(wagerTimer);
      clearTimeout(wagerTimer);
      roomWagerTimers.delete(roomId);
    }
    const wagerAutoTimer = roomWagerAutoLaunchTimers.get(roomId);
    if (wagerAutoTimer) {
      clearTimeout(wagerAutoTimer);
      roomWagerAutoLaunchTimers.delete(roomId);
    }
    const gridTimer = roomGridTimers.get(roomId);
    if (gridTimer) {
      clearInterval(gridTimer);
      roomGridTimers.delete(roomId);
    }
    for (const [key, timer] of roomStealTimer.entries()) {
      if (key.startsWith(`${roomId}:`)) {
        clearTimeout(timer);
        roomStealTimer.delete(key);
      }
    }
    for (const [key, timer] of roomBuzzDelayTimers.entries()) {
      if (key.startsWith(`${roomId}:`)) {
        clearTimeout(timer);
        roomBuzzDelayTimers.delete(key);
      }
    }
    const prep = roomPrepareStates.get(roomId);
    if (prep?.timer) clearTimeout(prep.timer);
    roomPrepareStates.delete(roomId);
    const interTimer = roomIntermissionTimers.get(roomId);
    if (interTimer) {
      clearTimeout(interTimer);
      roomIntermissionTimers.delete(roomId);
    }
    roomIntermissions.delete(roomId);
    roomActiveQuestions.delete(roomId);
    roomRevealPayloads.delete(roomId);
    roomRemainingTimes.delete(roomId);
    roomTimerEndsAt.delete(roomId);
    roomTournaments.delete(roomId);
    roomGridCaros.delete(roomId);
    roomDiceRaces.delete(roomId);
    roomWagers.delete(roomId);
    roomMysteryQuests.delete(roomId);
    roomTotalActorsCache.delete(roomId);
    roomSharedPowerupUsedInQuestion.delete(roomId);
    roomUsedQuestions.delete(roomId);
    roomCache.delete(roomId);
    roomQuestionsCache.delete(roomId);
    roomGoldQuestions.delete(roomId);
    roomEliminationGhostStats.delete(roomId);
    roomPendingSubmissions.delete(roomId);
    const prefix = `${roomId}:`;
    for (const key of roomQuestionTeamCards.keys()) {
      if (key.startsWith(prefix)) roomQuestionTeamCards.delete(key);
    }
    for (const key of roomFrozenTeams.keys()) {
      if (key.startsWith(prefix)) roomFrozenTeams.delete(key);
    }
    for (const key of roomFiftyFifty.keys()) {
      if (key.startsWith(prefix)) roomFiftyFifty.delete(key);
    }
    for (const key of roomQuestionProcessed) {
      if (key.startsWith(prefix)) roomQuestionProcessed.delete(key);
    }
    for (const key of roomQuestionScoresCache.keys()) {
      if (key.startsWith(prefix)) roomQuestionScoresCache.delete(key);
    }
    roomSandboxActiveTeam.delete(roomId);
    for (const key of roomPrimaryTeams.keys()) {
      if (key.startsWith(prefix)) roomPrimaryTeams.delete(key);
    }
    for (const key of roomStealPhase.keys()) {
      if (key.startsWith(prefix)) roomStealPhase.delete(key);
    }
    for (const key of roomStealBuzzed.keys()) {
      if (key.startsWith(prefix)) roomStealBuzzed.delete(key);
    }
    for (const key of roomBuzzFirst.keys()) {
      if (key.startsWith(prefix)) roomBuzzFirst.delete(key);
    }
    for (const key of roomBuzzUnlocked.keys()) {
      if (key.startsWith(prefix)) roomBuzzUnlocked.delete(key);
    }
    for (const key of roomBuzzAttemptOrder.keys()) {
      if (key.startsWith(prefix)) roomBuzzAttemptOrder.delete(key);
    }
    for (const key of roomBuzzWindowTimers.keys()) {
      if (key.startsWith(prefix)) {
        clearTimeout(roomBuzzWindowTimers.get(key));
        roomBuzzWindowTimers.delete(key);
      }
    }
    for (const key of roomBuzzWindowEndsAt.keys()) {
      if (key.startsWith(prefix)) roomBuzzWindowEndsAt.delete(key);
    }
    for (const key of roomBuzzWindowRemaining.keys()) {
      if (key.startsWith(prefix)) roomBuzzWindowRemaining.delete(key);
    }
    for (const key of roomBuzzDisqualified.keys()) {
      if (key.startsWith(prefix)) roomBuzzDisqualified.delete(key);
    }
    for (const key of roomBuzzAnsweringTimers.keys()) {
      if (key.startsWith(prefix)) {
        clearTimeout(roomBuzzAnsweringTimers.get(key));
        roomBuzzAnsweringTimers.delete(key);
      }
    }
    for (const key of roomBouncebackSelectedPoints.keys()) {
      if (key.startsWith(prefix)) roomBouncebackSelectedPoints.delete(key);
    }
    for (const key of roomFinalizedActors.keys()) {
      if (key.startsWith(prefix)) roomFinalizedActors.delete(key);
    }
    for (const key of roomSubmittedActors.keys()) {
      if (key.startsWith(prefix)) roomSubmittedActors.delete(key);
    }
    for (const key of roomActiveAnswers.keys()) {
      if (key.startsWith(prefix)) roomActiveAnswers.delete(key);
    }
    for (const [key, val] of roomBuzzArbitration.entries()) {
      if (key.startsWith(prefix)) {
        clearTimeout(val.timer);
        roomBuzzArbitration.delete(key);
      }
    }
    for (const key of roomBuzzWindowOpenedAt.keys()) {
      if (key.startsWith(prefix)) roomBuzzWindowOpenedAt.delete(key);
    }
    for (const key of roomStealOpenedAt.keys()) {
      if (key.startsWith(prefix)) roomStealOpenedAt.delete(key);
    }
    for (const key of roomStealEndsAt.keys()) {
      if (key.startsWith(prefix)) roomStealEndsAt.delete(key);
    }
    for (const key of roomTeamImmunity.keys()) {
      if (key.startsWith(prefix)) roomTeamImmunity.delete(key);
    }
    for (const [pId, timer] of pendingDisconnects.entries()) {
      const session = playerSessions.get(pId);
      if (session?.roomId === roomId) {
        clearTimeout(timer);
        pendingDisconnects.delete(pId);
        playerStreakMap.delete(pId);
        if (session.teamId) teamStreakMap.delete(session.teamId);
        playerSessions.delete(pId);
      }
    }
    for (const [sockId, session] of socketPlayerSessions.entries()) {
      if (session.roomId === roomId) {
        playerSockets.delete(sockId);
        socketPlayerSessions.delete(sockId);
      }
    }
    for (const key of inFlightAdminActions) {
      if (key.startsWith(prefix)) inFlightAdminActions.delete(key);
    }
    roomQuestionStartedAt.delete(roomId);
    cleanupTieBreaker(roomId);
  } catch (err) {
    console.error(`[cleanupRoomInMemory] Error clearing room ${roomId}:`, err);
  }
}
var globalForSockets = globalThis;
globalForSockets.cleanupRoomInMemory = cleanupRoomInMemory;
async function getAdminRoom(socket, payloadCode) {
  let roomId = adminSockets.get(socket.id);
  if (roomId && payloadCode) {
    const existingCached = roomCache.get(roomId);
    if (existingCached && existingCached.code !== payloadCode) {
      roomId = void 0;
    }
  }
  if (!roomId && payloadCode) {
    let rByPayload = null;
    try {
      rByPayload = await prisma.room.findUnique({
        where: { code: payloadCode },
        include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } }
      });
    } catch {
      rByPayload = await prisma.room.findUnique({
        where: { code: payloadCode },
        include: { quizBank: true }
      }).catch(() => null);
    }
    if (rByPayload) {
      roomId = rByPayload.id;
      adminSockets.set(socket.id, rByPayload.id);
      socket.join(`room:${payloadCode}`);
      socket.join(`room:${payloadCode}:admin`);
      roomCache.set(rByPayload.id, rByPayload);
      if (rByPayload.quizBank?.questions) {
        roomQuestionsCache.set(rByPayload.id, rByPayload.quizBank.questions);
      }
      restoreGameStateSnapshot(rByPayload);
      return rByPayload;
    }
  }
  if (!roomId) {
    for (const roomName of socket.rooms) {
      if (roomName.startsWith("room:") && roomName.endsWith(":admin")) {
        const extractedCode = roomName.replace("room:", "").replace(":admin", "");
        if (extractedCode) {
          let rByCode = null;
          try {
            rByCode = await prisma.room.findUnique({
              where: { code: extractedCode },
              include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } }
            });
          } catch {
            rByCode = await prisma.room.findUnique({
              where: { code: extractedCode },
              include: { quizBank: true }
            }).catch(() => null);
          }
          if (rByCode) {
            roomId = rByCode.id;
            adminSockets.set(socket.id, rByCode.id);
            roomCache.set(rByCode.id, rByCode);
            if (rByCode.quizBank?.questions) {
              roomQuestionsCache.set(rByCode.id, rByCode.quizBank.questions);
            }
            restoreGameStateSnapshot(rByCode);
            return rByCode;
          }
        }
      }
    }
  }
  if (!roomId) return null;
  const cached = roomCache.get(roomId);
  if (cached && payloadCode && cached.code !== payloadCode) {
    return null;
  }
  if (cached) {
    if (!cached.quizBank?.questions?.length) {
      const qCached = roomQuestionsCache.get(roomId);
      if (qCached && qCached.length > 0) {
        if (!cached.quizBank) cached.quizBank = { questions: qCached };
        else cached.quizBank.questions = qCached;
      } else {
        let r2 = null;
        try {
          r2 = await prisma.room.findUnique({
            where: { id: roomId },
            include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } }
          });
        } catch {
          r2 = await prisma.room.findUnique({
            where: { id: roomId },
            include: { quizBank: true }
          }).catch(() => null);
        }
        if (r2) {
          roomCache.set(roomId, r2);
          if (r2.quizBank?.questions) roomQuestionsCache.set(roomId, r2.quizBank.questions);
          restoreGameStateSnapshot(r2);
          return r2;
        }
      }
    }
    restoreGameStateSnapshot(cached);
    return cached;
  }
  let r = null;
  try {
    r = await prisma.room.findUnique({
      where: { id: roomId },
      include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } }
    });
  } catch {
    r = await prisma.room.findUnique({
      where: { id: roomId },
      include: { quizBank: true }
    }).catch(() => null);
  }
  if (r) {
    roomCache.set(roomId, r);
    if (r.quizBank?.questions) {
      roomQuestionsCache.set(roomId, r.quizBank.questions);
    }
    restoreGameStateSnapshot(r);
  }
  return r;
}
function registerSocketHandlers(io2) {
  globalIO = io2;
  const startStealAnsweringTimer = async (roomId, roomCode, currentQ, customDuration) => {
    const qKey = `${roomId}:${currentQ.id}`;
    const prepKey = `${roomId}:steal_prep`;
    if (roomStealTimer.has(prepKey)) {
      clearTimeout(roomStealTimer.get(prepKey));
      roomStealTimer.delete(prepKey);
    }
    const steal = roomStealBuzzed.get(qKey);
    if (!steal) return;
    const chosenPoints = roomBouncebackSelectedPoints.get(qKey) ?? 20;
    const defaultDuration = getBuzzedAnswerTimeLimit(currentQ, chosenPoints);
    const timeLimit = customDuration && customDuration > 0 ? customDuration : defaultDuration;
    const activeQ = roomActiveQuestions.get(roomId);
    if (activeQ) {
      activeQ.stealAnsweringActive = true;
      activeQ.timeLimit = timeLimit;
      activeQ.startedAt = Date.now();
      activeQ.endsAt = Date.now() + timeLimit * 1e3;
      activeQ.timerPending = false;
      activeQ.timerStarted = true;
      io2.to(`room:${roomCode}`).emit("game:question", activeQ);
    }
    io2.to(`room:${roomCode}`).emit("game:bounceback:steal_answering", {
      teamId: steal.teamId,
      teamName: steal.teamName,
      timeLimit
    });
    io2.to(`room:${roomCode}`).emit("game:timer:started", {
      timeLimit,
      endsAt: Date.now() + timeLimit * 1e3,
      serverTime: Date.now(),
      questionId: currentQ.id
    });
    startQuestionTimer(io2, roomCode, roomId, currentQ.id, timeLimit);
  };
  const resolveBuzzArbitrationWinner = async (roomId, roomCode, questionId, mode, candidates) => {
    if (!candidates || candidates.length === 0) return;
    const qKey = `${roomId}:${questionId}`;
    const openedAt = (mode === "BUZZ" ? roomBuzzWindowOpenedAt.get(qKey) : roomStealOpenedAt.get(qKey)) || Date.now();
    for (const c of candidates) {
      if (typeof c.clientBuzzedAt !== "number" || c.clientBuzzedAt < openedAt - 150 || c.clientBuzzedAt > c.receivedAt + 150) {
        c.clientBuzzedAt = c.receivedAt;
      }
    }
    candidates.sort((a, b) => {
      if (Math.abs(a.clientBuzzedAt - b.clientBuzzedAt) > 25) {
        return a.clientBuzzedAt - b.clientBuzzedAt;
      }
      return a.receivedAt - b.receivedAt;
    });
    const winner = candidates[0];
    if (mode === "BUZZ") {
      if (roomBuzzFirst.has(qKey)) return;
      const attempts = roomBuzzAttemptOrder.get(qKey) || [];
      const attemptNumber = attempts.length + 1;
      const multiplier = attemptNumber === 1 ? 1.5 : attemptNumber === 2 ? 1 : 0.5;
      const buzzInfo = {
        teamId: winner.teamId,
        teamName: winner.teamName,
        playerId: winner.playerId,
        playerName: winner.playerName,
        attemptNumber,
        multiplier
      };
      roomBuzzFirst.set(qKey, buzzInfo);
      attempts.push(buzzInfo);
      roomBuzzAttemptOrder.set(qKey, attempts);
      stopQuestionTimer(roomId);
      const activeQ = roomActiveQuestions.get(roomId);
      const currentQ = activeQ?.question;
      const isDeviceAnswer = activeQ?.answerMethod !== "MC";
      const answerTimeLimit = currentQ ? isDeviceAnswer ? getBuzzedAnswerTimeLimit(currentQ) : 15 : 15;
      const answerEndsAt = Date.now() + answerTimeLimit * 1e3;
      if (activeQ) {
        activeQ.buzzedTeamId = winner.teamId;
        activeQ.buzzedTeamName = winner.teamName;
        activeQ.buzzedBy = winner.playerName;
        activeQ.buzzAnsweringActive = true;
        activeQ.buzzAttemptNumber = attemptNumber;
        activeQ.buzzMaxAttempts = activeQ.buzzMaxAttempts ?? (attempts.length <= 2 ? 2 : 3);
        activeQ.buzzMultiplier = multiplier;
        activeQ.buzzWindowActive = false;
        activeQ.timeLimit = answerTimeLimit;
        activeQ.startedAt = Date.now();
        activeQ.endsAt = answerEndsAt;
        activeQ.timerPending = false;
        activeQ.timerStarted = true;
        io2.to(`room:${roomCode}`).emit("game:question", activeQ);
      }
      io2.to(`room:${roomCode}`).emit("game:buzz", buzzInfo);
      io2.to(`room:${roomCode}`).emit("game:buzz:answering", {
        teamId: winner.teamId,
        teamName: winner.teamName,
        timeLimit: answerTimeLimit,
        attemptNumber,
        maxAttempts: activeQ?.buzzMaxAttempts,
        multiplier
      });
      io2.to(`room:${roomCode}`).emit("game:timer:started", {
        timeLimit: answerTimeLimit,
        endsAt: answerEndsAt,
        serverTime: Date.now(),
        questionId
      });
      startQuestionTimer(io2, roomCode, roomId, questionId, answerTimeLimit);
    } else if (mode === "BOUNCEBACK") {
      if (roomStealBuzzed.has(qKey)) return;
      if (roomStealTimer.has(qKey)) {
        clearTimeout(roomStealTimer.get(qKey));
        roomStealTimer.delete(qKey);
      }
      roomStealPhase.set(qKey, false);
      stopQuestionTimer(roomId);
      const stealInfo = {
        teamId: winner.teamId,
        teamName: winner.teamName,
        playerId: winner.playerId,
        playerName: winner.playerName
      };
      roomStealBuzzed.set(qKey, stealInfo);
      const activeQ = roomActiveQuestions.get(roomId);
      const currentQ = activeQ?.question;
      if (activeQ) {
        activeQ.isStealPhase = false;
        activeQ.stealBuzzedTeamId = stealInfo.teamId;
        activeQ.stealBuzzedTeamName = stealInfo.teamName;
        activeQ.stealAnsweringActive = false;
        activeQ.timerPending = true;
        activeQ.timerStarted = false;
        io2.to(`room:${roomCode}`).emit("game:question", activeQ);
      }
      io2.to(`room:${roomCode}`).emit("game:bounceback:steal_buzzed", {
        ...stealInfo,
        prepSeconds: 3
      });
      const prepKey = `${roomId}:steal_prep`;
      if (roomStealTimer.has(prepKey)) {
        clearTimeout(roomStealTimer.get(prepKey));
      }
      const prepTimeout = setTimeout(async () => {
        roomStealTimer.delete(prepKey);
        const currentActiveQ = roomActiveQuestions.get(roomId);
        if (currentActiveQ && currentActiveQ.stealBuzzedTeamId === stealInfo.teamId && !currentActiveQ.stealAnsweringActive) {
          await startStealAnsweringTimer(roomId, roomCode, currentQ);
        }
      }, 3e3);
      roomStealTimer.set(prepKey, prepTimeout);
    }
  };
  io2.on("connection", (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);
    socket.on("time:sync", (clientTime, callback) => {
      if (typeof callback === "function") {
        callback({ clientTime, serverTime: Date.now() });
      }
    });
    socket.on("room:join", async ({ code, playerName, playerId, teamId, passcode }, callback) => {
      try {
        const isSandbox = Boolean(socket.handshake.query?.sandbox === "1") || Boolean(playerName?.includes("\u{1F916}")) || Boolean(playerName?.includes("(Tester)"));
        if (!isSandbox) {
          if (!playerId) {
            const clientIp = socket.handshake.headers["x-forwarded-for"]?.split(",")[0]?.trim() || socket.handshake.address || socket.id;
            const joinLimit = checkPlayerJoinLimit(clientIp);
            if (!joinLimit.allowed) {
              return callback({ success: false, error: `B\u1EA1n \u0111ang g\u1EEDi y\xEAu c\u1EA7u qu\xE1 nhanh. Vui l\xF2ng th\u1EED l\u1EA1i sau ${joinLimit.retryAfterSeconds}s.` });
            }
          }
        }
        let room = null;
        try {
          room = await prisma.room.findUnique({
            where: { code },
            include: {
              teams: {
                orderBy: { createdAt: "asc" },
                include: { players: true, powerupCards: true }
              },
              players: true,
              powerupCards: { where: { teamId: null } },
              quizBank: { include: { questions: { orderBy: { order: "asc" } } } }
            }
          });
        } catch {
          room = await prisma.room.findUnique({
            where: { code },
            include: {
              teams: {
                orderBy: { createdAt: "asc" },
                include: { players: true, powerupCards: true }
              },
              players: true,
              powerupCards: { where: { teamId: null } },
              quizBank: true
            }
          }).catch(() => null);
        }
        if (!room) {
          return callback({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y ph\xF2ng ch\u01A1i" });
        }
        if (room.status === "FINISHED") {
          return callback({ success: false, error: "Tr\u1EADn \u0111\u1EA5u \u0111\xE3 k\u1EBFt th\xFAc" });
        }
        const roomCfg = typeof room.config === "object" && room.config !== null ? room.config : {};
        const isExistingPlayer = Boolean(playerId && room.players?.some((p) => p.id === playerId));
        if (roomCfg.isLocked && !isSandbox && !isExistingPlayer) {
          return callback({ success: false, error: "Ph\xF2ng thi hi\u1EC7n \u0111ang b\u1ECB kh\xF3a b\u1EDFi Qu\u1EA3n tr\xF2" });
        }
        if (roomCfg.passcode && !isSandbox && !isExistingPlayer) {
          const expectedPass = String(roomCfg.passcode).trim();
          const providedPass = String(socket.handshake.query?.passcode || arguments[0]?.passcode || "").trim();
          if (!providedPass) {
            return callback({ success: false, error: "Vui l\xF2ng nh\u1EADp m\u1EADt kh\u1EA9u ph\xF2ng thi", requiresPasscode: true });
          }
          if (providedPass !== expectedPass) {
            return callback({ success: false, error: "M\u1EADt kh\u1EA9u ph\xF2ng kh\xF4ng ch\xEDnh x\xE1c", requiresPasscode: true });
          }
        }
        if (playerId && pendingDisconnects.has(playerId)) {
          clearTimeout(pendingDisconnects.get(playerId));
          pendingDisconnects.delete(playerId);
        }
        const cleanedName = sanitizePlayerName(playerName || "Th\xED sinh");
        if (!cleanedName || cleanedName.length === 0) {
          return callback({ success: false, error: "T\xEAn ng\u01B0\u1EDDi ch\u01A1i kh\xF4ng h\u1EE3p l\u1EC7 (kh\xF4ng ch\u1EE9a m\xE3 \u0111\u1ED9c ho\u1EB7c r\u1ED7ng)" });
        }
        let player = null;
        if (playerId) {
          const existingById = await prisma.player.findUnique({
            where: { id: playerId }
          });
          if (existingById) {
            if (!isSandbox && existingById.socketId && existingById.socketId !== socket.id) {
              const oldSock = io2.sockets.sockets.get(existingById.socketId);
              if (oldSock && oldSock.connected) {
                oldSock.emit("error", "T\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n \u0111\xE3 \u0111\u01B0\u1EE3c \u0111\u0103ng nh\u1EADp t\u1EEB m\u1ED9t thi\u1EBFt b\u1ECB ho\u1EB7c tab kh\xE1c!");
                oldSock.disconnect(true);
              }
            }
            if (pendingDisconnects.has(existingById.id)) {
              clearTimeout(pendingDisconnects.get(existingById.id));
              pendingDisconnects.delete(existingById.id);
            }
            const finalName = cleanedName && cleanedName !== "Player" && cleanedName !== "Th\xED sinh" ? cleanedName : existingById.name;
            player = await prisma.player.update({
              where: { id: existingById.id },
              data: {
                roomId: room.id,
                name: finalName,
                socketId: socket.id,
                ...teamId ? { teamId } : {}
              }
            });
            await prisma.player.deleteMany({
              where: {
                roomId: room.id,
                name: finalName,
                id: { not: existingById.id },
                socketId: null
              }
            }).catch(() => {
            });
          }
        }
        if (!player) {
          const offlineSameName = await prisma.player.findFirst({
            where: {
              roomId: room.id,
              name: cleanedName,
              socketId: null
            }
          });
          if (offlineSameName) {
            if (pendingDisconnects.has(offlineSameName.id)) {
              clearTimeout(pendingDisconnects.get(offlineSameName.id));
              pendingDisconnects.delete(offlineSameName.id);
            }
            player = await prisma.player.update({
              where: { id: offlineSameName.id },
              data: {
                socketId: socket.id,
                ...teamId ? { teamId } : {}
              }
            });
            await prisma.player.deleteMany({
              where: {
                roomId: room.id,
                name: cleanedName,
                id: { not: offlineSameName.id },
                socketId: null
              }
            }).catch(() => {
            });
          }
        }
        if (!player) {
          if (room.players.length >= MAX_PLAYERS_PER_ROOM) {
            return callback({ success: false, error: `Ph\xF2ng thi \u0111\xE3 \u0111\u1EA1t gi\u1EDBi h\u1EA1n t\u1ED1i \u0111a (${MAX_PLAYERS_PER_ROOM} ng\u01B0\u1EDDi tham gia)` });
          }
          if (room.status === "LOBBY") {
            await prisma.player.deleteMany({
              where: {
                roomId: room.id,
                name: cleanedName,
                socketId: null
              }
            }).catch(() => {
            });
          }
          const newId = playerId && playerId.length > 5 ? playerId : `p_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
          player = await prisma.player.upsert({
            where: { id: newId },
            create: {
              id: newId,
              name: cleanedName,
              socketId: socket.id,
              roomId: room.id,
              teamId: teamId ?? null
            },
            update: {
              roomId: room.id,
              name: cleanedName,
              socketId: socket.id,
              teamId: teamId ?? null
            }
          });
        }
        if (player && pendingDisconnects.has(player.id)) {
          clearTimeout(pendingDisconnects.get(player.id));
          pendingDisconnects.delete(player.id);
        }
        playerSockets.set(socket.id, player.id);
        socket.join(`room:${code}`);
        socket.join(`room:${code}:players`);
        restoreGameStateSnapshot(room);
        const roomState = await buildRoomState(room.id);
        const matchedTeam = roomState.teams.find((t) => t.id === player.teamId);
        const cachedSession = {
          playerId: player.id,
          playerName: player.name,
          roomId: room.id,
          roomCode: code,
          teamId: player.teamId ?? void 0,
          teamName: matchedTeam?.name ?? void 0,
          roomMode: room.mode,
          teamMode: room.teamMode
        };
        socketPlayerSessions.set(socket.id, cachedSession);
        playerSessions.set(player.id, cachedSession);
        io2.to(`room:${code}`).emit("room:state", roomState);
        try {
          const isPreparing = roomPrepareStates.has(room.id);
          const effectiveRoomStatus = roomCache.get(room.id)?.status ?? room.status;
          if (roomIntermissions.has(room.id)) {
            socket.emit("game:intermission", roomIntermissions.get(room.id));
          } else if (effectiveRoomStatus === "PLAYING" && !isPreparing) {
            const isMysteryMinigame = room.mode === "MYSTERY_QUEST" && roomMysteryQuests.has(room.id) && roomMysteryQuests.get(room.id).phase !== "QUESTION_ACTIVE";
            if (isMysteryMinigame) {
              socket.emit("game:question:clear");
            } else if (roomRevealPayloads.has(room.id)) {
              socket.emit("game:answer:reveal", roomRevealPayloads.get(room.id));
            } else if (room.quizBank?.questions) {
              const activeQ = roomActiveQuestions.get(room.id);
              const remaining = roomRemainingTimes.get(`${room.id}:timer`);
              const endsAt = roomTimerEndsAt.get(room.id) || activeQ?.endsAt;
              const isTimerRunning = typeof remaining === "number" && remaining > 0 || Boolean(endsAt && endsAt > Date.now());
              if (activeQ) {
                if (isTimerRunning) {
                  activeQ.timerPending = false;
                  activeQ.timerStarted = true;
                  if (endsAt) activeQ.endsAt = endsAt;
                  activeQ.serverTime = Date.now();
                }
                socket.emit("game:question", activeQ);
                if (isTimerRunning) {
                  const effRemaining = typeof remaining === "number" && remaining > 0 ? remaining : Math.max(1, Math.ceil(((endsAt || Date.now()) - Date.now()) / 1e3));
                  socket.emit("game:timer:started", {
                    timeLimit: activeQ.timeLimit,
                    endsAt,
                    serverTime: Date.now(),
                    questionId: activeQ.question.id
                  });
                  socket.emit("game:timer", {
                    remaining: effRemaining,
                    total: activeQ.timeLimit,
                    endsAt,
                    serverTime: Date.now()
                  });
                }
              } else {
                const currentQuestions = await getRoomQuestions(room.id);
                const currentQ2 = currentQuestions[room.currentQuestion] || room.quizBank.questions[room.currentQuestion];
                if (currentQ2) {
                  const qKey = `${room.id}:${currentQ2.id}`;
                  const primary = roomPrimaryTeams.get(qKey);
                  const stealBuzzed = roomStealBuzzed.get(qKey);
                  const buzzFirst = roomBuzzFirst.get(qKey);
                  const isSteal = roomStealPhase.get(qKey) ?? false;
                  const config = room.config;
                  const mysteryState = roomMysteryQuests.get(room.id);
                  const gridState = roomGridCaros.get(room.id);
                  const diceState = roomDiceRaces.get(room.id);
                  const tournamentState = roomTournaments.get(room.id);
                  const activeMatch = room.mode === "TOURNAMENT" && tournamentState && tournamentState.matches ? tournamentState.matches.find((m) => m.id === tournamentState.currentMatchId || m.status === "IN_PROGRESS") : void 0;
                  const qState = buildQuestionState(currentQ2, {
                    order: room.mode === "MYSTERY_QUEST" && mysteryState ? mysteryState.currentTurnIndex + 1 : currentQ2.order,
                    primaryTeamId: primary?.teamId || (room.mode === "MYSTERY_QUEST" ? mysteryState?.currentTurnTeamId : room.mode === "GRID_CARO" ? gridState?.currentTurnTeamId : room.mode === "DICE_RACE" ? diceState?.currentTurnTeamId : room.mode === "TOURNAMENT" ? activeMatch?.team1Id : void 0),
                    primaryTeamName: primary?.teamName || (room.mode === "MYSTERY_QUEST" ? mysteryState?.currentTurnTeamName : room.mode === "GRID_CARO" ? gridState?.currentTurnTeamName : room.mode === "DICE_RACE" ? diceState?.currentTurnTeamName : room.mode === "TOURNAMENT" && activeMatch ? `${activeMatch.team1Name} vs ${activeMatch.team2Name}` : void 0),
                    tournamentTeam1Id: activeMatch?.team1Id ?? void 0,
                    tournamentTeam2Id: activeMatch?.team2Id ?? void 0,
                    bloomLevel: getBloomLevelFromPoints(currentQ2.points),
                    answerMethod: config?.answerMethod ?? "DEVICE",
                    isStealPhase: isSteal,
                    stealBuzzedTeamId: stealBuzzed?.teamId,
                    stealBuzzedTeamName: stealBuzzed?.teamName,
                    buzzedTeamId: buzzFirst?.teamId,
                    buzzedTeamName: buzzFirst?.teamName,
                    timerPending: !isTimerRunning,
                    timerStarted: isTimerRunning
                  });
                  if (endsAt) {
                    qState.endsAt = endsAt;
                    qState.serverTime = Date.now();
                  }
                  roomActiveQuestions.set(room.id, qState);
                  socket.emit("game:question", qState);
                  if (isTimerRunning) {
                    const effRemaining = typeof remaining === "number" && remaining > 0 ? remaining : Math.max(1, Math.ceil(((endsAt || Date.now()) - Date.now()) / 1e3));
                    socket.emit("game:timer:started", {
                      timeLimit: qState.timeLimit,
                      endsAt,
                      serverTime: Date.now(),
                      questionId: currentQ2.id
                    });
                    socket.emit("game:timer", {
                      remaining: effRemaining,
                      total: qState.timeLimit,
                      endsAt,
                      serverTime: Date.now()
                    });
                  }
                }
              }
            }
            if (roomDiceRaces.has(room.id)) {
              socket.emit("game:dice:update", roomDiceRaces.get(room.id));
            }
            if (roomGridCaros.has(room.id)) {
              socket.emit("game:grid:update", roomGridCaros.get(room.id));
            }
            if (roomWagers.has(room.id)) {
              socket.emit("game:wager:update", roomWagers.get(room.id));
            }
            if (roomTournaments.has(room.id)) {
              socket.emit("game:tournament:update", roomTournaments.get(room.id));
            }
            if (roomMysteryQuests.has(room.id)) {
              socket.emit("game:mystery:update", roomMysteryQuests.get(room.id));
            }
            if (roomTieBreakers.has(room.id)) {
              socket.emit("game:tie_breaker:state", roomTieBreakers.get(room.id));
            }
            const currentQ = roomActiveQuestions.get(room.id)?.question || room.quizBank?.questions?.[room.currentQuestion];
            if (currentQ) {
              const qKey = `${room.id}:${currentQ.id}`;
              if (roomStealPhase.get(qKey)) {
                socket.emit("game:bounceback:open_steal", { questionId: currentQ.id, timeLimit: 5 });
              }
              if (roomStealBuzzed.has(qKey)) {
                socket.emit("game:bounceback:steal_buzzed", roomStealBuzzed.get(qKey));
              }
            }
          }
          if (roomPrepareStates.has(room.id)) {
            const prep = roomPrepareStates.get(room.id);
            const remainingSec = Math.max(1, Math.ceil((prep.targetTimestamp - Date.now()) / 1e3));
            if (prep.type === "STARTING") {
              socket.emit("game:starting", { seconds: remainingSec, endsAt: prep.targetTimestamp, total: 5 });
            } else if (prep.type === "PREPARE" && prep.preparePayload) {
              socket.emit("game:prepare", { ...prep.preparePayload, seconds: remainingSec, endsAt: prep.targetTimestamp, total: prep.preparePayload.total || 3 });
            }
          }
        } catch (recoveryErr) {
          console.warn("[room:join] Non-fatal state recovery error:", recoveryErr);
        }
        callback({ success: true, playerId: player.id, teamId: player.teamId ?? void 0, roomState });
      } catch (err) {
        console.error("[room:join] Error joining room:", err);
        callback({ success: false, error: err?.message ? `L\u1ED7i k\u1EBFt n\u1ED1i m\xE1y ch\u1EE7 (${err.message})` : "L\u1ED7i k\u1EBFt n\u1ED1i m\xE1y ch\u1EE7" });
      }
    });
    socket.on("admin:join", async (arg1, arg2, arg3) => {
      let callback;
      try {
        let code = "";
        let hostKey;
        if (typeof arg1 === "object" && arg1 !== null) {
          code = arg1.code;
          hostKey = arg1.hostKey;
          callback = typeof arg2 === "function" ? arg2 : void 0;
        } else if (typeof arg1 === "string") {
          code = arg1;
          if (typeof arg2 === "string") {
            hostKey = arg2;
            callback = typeof arg3 === "function" ? arg3 : void 0;
          } else if (typeof arg2 === "function") {
            callback = arg2;
          }
        }
        let room = null;
        try {
          room = await prisma.room.findUnique({
            where: { code },
            include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } }
          });
        } catch {
          room = await prisma.room.findUnique({
            where: { code },
            include: { quizBank: true }
          }).catch(() => null);
        }
        if (!room) {
          return callback?.({ success: false, error: "Ph\xF2ng kh\xF4ng t\u1ED3n t\u1EA1i" });
        }
        const rawAuthHeader = socket.handshake.auth?.token || socket.handshake.headers["authorization"];
        const authHeader = typeof rawAuthHeader === "string" ? rawAuthHeader : Array.isArray(rawAuthHeader) ? rawAuthHeader[0] : "";
        const isAdminTokenValid = authHeader ? verifyAdminToken(authHeader.replace("Bearer ", "").trim()) : false;
        const isSandboxQuery = socket.handshake.query?.sandbox === "1";
        const isSandboxRoom = isSandboxRoomEntity(room) || isSandboxQuery;
        const isHostKeyValid = isSandboxRoom || !room.hostKey ? true : hostKey === room.hostKey;
        if (!isAdminTokenValid && !isHostKeyValid) {
          return callback?.({
            success: false,
            error: "Kh\xF3a b\u1EA3o m\u1EADt Host kh\xF4ng h\u1EE3p l\u1EC7. Vui l\xF2ng s\u1EED d\u1EE5ng \u0111\xFAng li\xEAn k\u1EBFt Host ho\u1EB7c nh\u1EADp Master Admin Passcode.",
            requiresAuth: true
          });
        }
        await prisma.player.deleteMany({
          where: {
            roomId: room.id,
            OR: [
              { isHost: true },
              { name: "Host" },
              { name: "Admin Host" }
            ]
          }
        }).catch(() => {
        });
        adminSockets.set(socket.id, room.id);
        socket.join(`room:${code}`);
        socket.join(`room:${code}:admin`);
        restoreGameStateSnapshot(room);
        const roomState = await buildRoomState(room.id);
        io2.to(`room:${code}`).emit("room:state", roomState);
        try {
          const isPreparing = roomPrepareStates.has(room.id);
          const effectiveRoomStatus = roomCache.get(room.id)?.status ?? room.status;
          const isMysteryMinigame = room.mode === "MYSTERY_QUEST" && roomMysteryQuests.has(room.id) && roomMysteryQuests.get(room.id).phase !== "QUESTION_ACTIVE";
          if (effectiveRoomStatus === "LOBBY") {
            socket.emit("game:question:clear");
          } else if (roomIntermissions.has(room.id)) {
            socket.emit("game:intermission", roomIntermissions.get(room.id));
          } else if (isMysteryMinigame) {
            socket.emit("game:question:clear");
          } else if (effectiveRoomStatus === "PLAYING" && room.quizBank?.questions && !isPreparing) {
            const activeQ = roomActiveQuestions.get(room.id);
            const remaining = roomRemainingTimes.get(`${room.id}:timer`);
            const endsAt = roomTimerEndsAt.get(room.id) || activeQ?.endsAt;
            const isTimerRunning = typeof remaining === "number" && remaining > 0 || Boolean(endsAt && endsAt > Date.now());
            if (activeQ) {
              if (isTimerRunning) {
                activeQ.timerPending = false;
                activeQ.timerStarted = true;
                if (endsAt) activeQ.endsAt = endsAt;
                activeQ.serverTime = Date.now();
              }
              socket.emit("game:question", activeQ);
              const rawQ = room.quizBank.questions.find((item) => item.id === activeQ.question.id) || room.quizBank.questions[room.currentQuestion];
              if (rawQ) {
                socket.emit("admin:question:data", {
                  questionId: rawQ.id,
                  options: rawQ.options,
                  answer: rawQ.answer,
                  type: rawQ.type,
                  explanation: rawQ.hint || rawQ.explanation
                });
              }
              if (isTimerRunning) {
                const effRemaining = typeof remaining === "number" && remaining > 0 ? remaining : Math.max(1, Math.ceil(((endsAt || Date.now()) - Date.now()) / 1e3));
                socket.emit("game:timer:started", {
                  timeLimit: activeQ.timeLimit,
                  endsAt,
                  serverTime: Date.now(),
                  questionId: activeQ.question.id
                });
                socket.emit("game:timer", {
                  remaining: effRemaining,
                  total: activeQ.timeLimit,
                  endsAt,
                  serverTime: Date.now()
                });
              }
            } else {
              const currentQuestions = await getRoomQuestions(room.id);
              const currentQ = currentQuestions[room.currentQuestion] || room.quizBank.questions[room.currentQuestion];
              if (currentQ) {
                const qKey = `${room.id}:${currentQ.id}`;
                const primary = roomPrimaryTeams.get(qKey);
                const stealBuzzed = roomStealBuzzed.get(qKey);
                const buzzFirst = roomBuzzFirst.get(qKey);
                const isSteal = roomStealPhase.get(qKey) ?? false;
                const config = room.config;
                const mysteryState = roomMysteryQuests.get(room.id);
                const gridState = roomGridCaros.get(room.id);
                const diceState = roomDiceRaces.get(room.id);
                const tournamentState = roomTournaments.get(room.id);
                const activeMatch = room.mode === "TOURNAMENT" && tournamentState && tournamentState.matches ? tournamentState.matches.find((m) => m.id === tournamentState.currentMatchId || m.status === "IN_PROGRESS") : void 0;
                const qState = buildQuestionState(currentQ, {
                  order: room.mode === "MYSTERY_QUEST" && mysteryState ? mysteryState.currentTurnIndex + 1 : currentQ.order,
                  primaryTeamId: primary?.teamId || (room.mode === "MYSTERY_QUEST" ? mysteryState?.currentTurnTeamId : room.mode === "GRID_CARO" ? gridState?.currentTurnTeamId : room.mode === "DICE_RACE" ? diceState?.currentTurnTeamId : room.mode === "TOURNAMENT" ? activeMatch?.team1Id : void 0),
                  primaryTeamName: primary?.teamName || (room.mode === "MYSTERY_QUEST" ? mysteryState?.currentTurnTeamName : room.mode === "GRID_CARO" ? gridState?.currentTurnTeamName : room.mode === "DICE_RACE" ? diceState?.currentTurnTeamName : room.mode === "TOURNAMENT" && activeMatch ? `${activeMatch.team1Name} vs ${activeMatch.team2Name}` : void 0),
                  tournamentTeam1Id: activeMatch?.team1Id ?? void 0,
                  tournamentTeam2Id: activeMatch?.team2Id ?? void 0,
                  bloomLevel: getBloomLevelFromPoints(currentQ.points),
                  answerMethod: config?.answerMethod ?? "DEVICE",
                  isStealPhase: isSteal,
                  stealBuzzedTeamId: stealBuzzed?.teamId,
                  stealBuzzedTeamName: stealBuzzed?.teamName,
                  buzzedTeamId: buzzFirst?.teamId,
                  buzzedTeamName: buzzFirst?.teamName,
                  timerPending: !isTimerRunning,
                  timerStarted: isTimerRunning
                });
                if (endsAt) {
                  qState.endsAt = endsAt;
                  qState.serverTime = Date.now();
                }
                roomActiveQuestions.set(room.id, qState);
                socket.emit("game:question", qState);
                socket.emit("admin:question:data", {
                  questionId: currentQ.id,
                  options: currentQ.options,
                  answer: currentQ.answer,
                  type: currentQ.type,
                  explanation: currentQ.hint || currentQ.explanation
                });
                if (isTimerRunning) {
                  const effRemaining = typeof remaining === "number" && remaining > 0 ? remaining : Math.max(1, Math.ceil(((endsAt || Date.now()) - Date.now()) / 1e3));
                  socket.emit("game:timer:started", {
                    timeLimit: qState.timeLimit,
                    endsAt,
                    serverTime: Date.now(),
                    questionId: currentQ.id
                  });
                  socket.emit("game:timer", {
                    remaining: effRemaining,
                    total: qState.timeLimit,
                    endsAt,
                    serverTime: Date.now()
                  });
                }
              }
            }
          }
          if (roomPrepareStates.has(room.id)) {
            const prep = roomPrepareStates.get(room.id);
            const remainingSec = Math.max(1, Math.ceil((prep.targetTimestamp - Date.now()) / 1e3));
            if (prep.type === "STARTING") {
              socket.emit("game:starting", { seconds: remainingSec, endsAt: prep.targetTimestamp, total: 5 });
            } else if (prep.type === "PREPARE" && prep.preparePayload) {
              socket.emit("game:prepare", { ...prep.preparePayload, seconds: remainingSec, endsAt: prep.targetTimestamp, total: prep.preparePayload.total || 3 });
            }
          }
          if (roomDiceRaces.has(room.id)) {
            socket.emit("game:dice:update", roomDiceRaces.get(room.id));
          }
          if (roomGridCaros.has(room.id)) {
            socket.emit("game:grid:update", roomGridCaros.get(room.id));
          }
          if (roomWagers.has(room.id)) {
            socket.emit("game:wager:update", roomWagers.get(room.id));
          }
          if (roomTournaments.has(room.id)) {
            socket.emit("game:tournament:update", roomTournaments.get(room.id));
          }
          if (roomMysteryQuests.has(room.id)) {
            socket.emit("game:mystery:update", roomMysteryQuests.get(room.id));
          }
          if (roomTieBreakers.has(room.id)) {
            socket.emit("game:tie_breaker:state", roomTieBreakers.get(room.id));
          }
        } catch (recoveryErr) {
          console.warn("[admin:join] Non-fatal state recovery error:", recoveryErr);
        }
        callback?.({ success: true, hostKey: room.hostKey, roomState });
      } catch (err) {
        console.error("[admin:join] Error joining room:", err);
        callback?.({ success: false, error: err?.message ? `L\u1ED7i k\u1EBFt n\u1ED1i m\xE1y ch\u1EE7 (${err.message})` : "L\u1ED7i k\u1EBFt n\u1ED1i m\xE1y ch\u1EE7" });
      }
    });
    socket.on("player:select:team", async ({ teamId, playerId: clientPlayerId }, callback) => {
      try {
        const playerId = clientPlayerId || playerSockets.get(socket.id);
        if (!playerId) {
          return callback?.({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y th\xF4ng tin th\xED sinh" });
        }
        playerSockets.set(socket.id, playerId);
        const player = await prisma.player.findUnique({
          where: { id: playerId },
          include: { room: true }
        });
        if (!player || !player.room) {
          return callback?.({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y th\xED sinh trong ph\xF2ng n\xE0y" });
        }
        socket.join(`room:${player.room.code}`);
        socket.join(`room:${player.room.code}:players`);
        const team = await prisma.team.findFirst({
          where: { id: teamId, roomId: player.room.id }
        });
        if (!team) {
          return callback?.({ success: false, error: "\u0110\u1ED9i kh\xF4ng t\u1ED3n t\u1EA1i trong ph\xF2ng n\xE0y" });
        }
        await prisma.player.update({
          where: { id: playerId },
          data: {
            teamId,
            socketId: socket.id
          }
        });
        const state = await buildRoomState(player.room.id);
        const sess = socketPlayerSessions.get(socket.id) || playerSessions.get(playerId);
        if (sess) {
          sess.teamId = team.id;
          sess.teamName = team.name;
          socketPlayerSessions.set(socket.id, sess);
          playerSessions.set(playerId, sess);
        } else {
          const newSess = {
            playerId,
            playerName: player.name,
            roomId: player.room.id,
            roomCode: player.room.code,
            teamId: team.id,
            teamName: team.name,
            roomMode: player.room.mode,
            teamMode: player.room.teamMode
          };
          socketPlayerSessions.set(socket.id, newSess);
          playerSessions.set(playerId, newSess);
        }
        io2.to(`room:${player.room.code}`).emit("room:state", state);
        socket.emit("room:state", state);
        callback?.({ success: true });
      } catch (err) {
        console.error("[player:select:team]", err);
        callback?.({ success: false, error: "L\u1ED7i khi ch\u1ECDn \u0111\u1ED9i" });
      }
    });
    socket.on("display:join", async (code) => {
      socket.join(`room:${code}`);
      socket.join(`room:${code}:display`);
      let room = null;
      try {
        room = await prisma.room.findUnique({
          where: { code },
          include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } }
        });
      } catch {
        room = await prisma.room.findUnique({
          where: { code },
          include: { quizBank: true }
        }).catch(() => null);
      }
      if (room) {
        restoreGameStateSnapshot(room);
        const state = await buildRoomState(room.id);
        socket.emit("room:state", state);
        const isPreparing = roomPrepareStates.has(room.id);
        const effectiveRoomStatus = roomCache.get(room.id)?.status ?? room.status;
        if (roomIntermissions.has(room.id)) {
          socket.emit("game:intermission", roomIntermissions.get(room.id));
        } else if (effectiveRoomStatus === "PLAYING" && !isPreparing) {
          if (roomRevealPayloads.has(room.id)) {
            socket.emit("game:answer:reveal", roomRevealPayloads.get(room.id));
          }
          const activeQ = roomActiveQuestions.get(room.id);
          const remaining = roomRemainingTimes.get(`${room.id}:timer`);
          const endsAt = roomTimerEndsAt.get(room.id) || activeQ?.endsAt;
          const isTimerRunning = typeof remaining === "number" && remaining > 0 || Boolean(endsAt && endsAt > Date.now());
          if (activeQ) {
            if (isTimerRunning) {
              activeQ.timerPending = false;
              activeQ.timerStarted = true;
              if (endsAt) activeQ.endsAt = endsAt;
              activeQ.serverTime = Date.now();
            }
            socket.emit("game:question", activeQ);
            if (isTimerRunning) {
              const effRemaining = typeof remaining === "number" && remaining > 0 ? remaining : Math.max(1, Math.ceil(((endsAt || Date.now()) - Date.now()) / 1e3));
              socket.emit("game:timer:started", {
                timeLimit: activeQ.timeLimit,
                endsAt,
                serverTime: Date.now(),
                questionId: activeQ.question.id
              });
              socket.emit("game:timer", {
                remaining: effRemaining,
                total: activeQ.timeLimit,
                endsAt,
                serverTime: Date.now()
              });
            }
          } else {
            const currentQuestions = await getRoomQuestions(room.id);
            const currentQ = currentQuestions[room.currentQuestion] || room.quizBank?.questions?.[room.currentQuestion];
            if (currentQ) {
              const qKey = `${room.id}:${currentQ.id}`;
              const primary = roomPrimaryTeams.get(qKey);
              const stealBuzzed = roomStealBuzzed.get(qKey);
              const buzzFirst = roomBuzzFirst.get(qKey);
              const isSteal = roomStealPhase.get(qKey) ?? false;
              const config = room.config;
              const mysteryState = roomMysteryQuests.get(room.id);
              const gridState = roomGridCaros.get(room.id);
              const diceState = roomDiceRaces.get(room.id);
              const tournamentState = roomTournaments.get(room.id);
              const activeMatch = room.mode === "TOURNAMENT" && tournamentState ? tournamentState.matches.find((m) => m.id === tournamentState.currentMatchId || m.status === "IN_PROGRESS") : void 0;
              const qState = buildQuestionState(currentQ, {
                order: room.mode === "MYSTERY_QUEST" && mysteryState ? mysteryState.currentTurnIndex + 1 : currentQ.order,
                primaryTeamId: primary?.teamId || (room.mode === "MYSTERY_QUEST" ? mysteryState?.currentTurnTeamId : room.mode === "GRID_CARO" ? gridState?.currentTurnTeamId : room.mode === "DICE_RACE" ? diceState?.currentTurnTeamId : room.mode === "TOURNAMENT" ? activeMatch?.team1Id : void 0),
                primaryTeamName: primary?.teamName || (room.mode === "MYSTERY_QUEST" ? mysteryState?.currentTurnTeamName : room.mode === "GRID_CARO" ? gridState?.currentTurnTeamName : room.mode === "DICE_RACE" ? diceState?.currentTurnTeamName : room.mode === "TOURNAMENT" && activeMatch ? `${activeMatch.team1Name} vs ${activeMatch.team2Name}` : void 0),
                tournamentTeam1Id: activeMatch?.team1Id ?? void 0,
                tournamentTeam2Id: activeMatch?.team2Id ?? void 0,
                bloomLevel: getBloomLevelFromPoints(currentQ.points),
                answerMethod: config?.answerMethod ?? "DEVICE",
                isStealPhase: isSteal,
                stealBuzzedTeamId: stealBuzzed?.teamId,
                stealBuzzedTeamName: stealBuzzed?.teamName,
                buzzedTeamId: buzzFirst?.teamId,
                buzzedTeamName: buzzFirst?.teamName,
                timerPending: !isTimerRunning,
                timerStarted: isTimerRunning
              });
              if (endsAt) {
                qState.endsAt = endsAt;
                qState.serverTime = Date.now();
              }
              roomActiveQuestions.set(room.id, qState);
              socket.emit("game:question", qState);
              if (isTimerRunning) {
                const effRemaining = typeof remaining === "number" && remaining > 0 ? remaining : Math.max(1, Math.ceil(((endsAt || Date.now()) - Date.now()) / 1e3));
                socket.emit("game:timer:started", {
                  timeLimit: qState.timeLimit,
                  endsAt,
                  serverTime: Date.now(),
                  questionId: currentQ.id
                });
                socket.emit("game:timer", {
                  remaining: effRemaining,
                  total: qState.timeLimit,
                  endsAt,
                  serverTime: Date.now()
                });
              }
            }
          }
        }
        if (roomMysteryQuests.has(room.id)) {
          socket.emit("game:mystery:update", roomMysteryQuests.get(room.id));
        }
        if (roomDiceRaces.has(room.id)) {
          socket.emit("game:dice:update", roomDiceRaces.get(room.id));
        }
        if (roomGridCaros.has(room.id)) {
          socket.emit("game:grid:update", roomGridCaros.get(room.id));
        }
        if (roomWagers.has(room.id)) {
          socket.emit("game:wager:update", roomWagers.get(room.id));
        }
        if (roomTournaments.has(room.id)) {
          socket.emit("game:tournament:update", roomTournaments.get(room.id));
        }
        if (roomTieBreakers.has(room.id)) {
          socket.emit("game:tie_breaker:state", roomTieBreakers.get(room.id));
        }
        if (roomPrepareStates.has(room.id)) {
          const prep = roomPrepareStates.get(room.id);
          const remainingSec = Math.max(1, Math.ceil((prep.targetTimestamp - Date.now()) / 1e3));
          if (prep.type === "STARTING") {
            socket.emit("game:starting", { seconds: remainingSec, endsAt: prep.targetTimestamp, total: 5 });
          } else if (prep.type === "PREPARE" && prep.preparePayload) {
            socket.emit("game:prepare", { ...prep.preparePayload, seconds: remainingSec, endsAt: prep.targetTimestamp, total: prep.preparePayload.total || 3 });
          }
        }
      }
    });
    socket.on("game:answer:submit", async ({ questionId, answer, teamId, playerId: clientPlayerId, clientAnsweredAt }) => {
      try {
        let playerId = playerSockets.get(socket.id);
        if (!playerId) {
          const dbPlayer = await prisma.player.findFirst({
            where: { socketId: socket.id },
            include: { room: true }
          }).catch(() => null);
          if (dbPlayer) {
            playerId = dbPlayer.id;
            playerSockets.set(socket.id, dbPlayer.id);
          }
        }
        const isSandboxClient = Boolean(
          socket.handshake?.query?.sandbox === "1" || playerId?.startsWith("sb_") || playerId?.startsWith("p_sb_") || clientPlayerId?.startsWith("sb_") || clientPlayerId?.startsWith("p_sb_")
        );
        if (!isSandboxClient && clientPlayerId && playerId && clientPlayerId !== playerId) {
          console.warn(`[Security] G\xF3i tin n\u1ED9p b\xE0i m\u1EA1o danh t\u1EEB socket ${socket.id}: khai ${clientPlayerId}, th\u1EF1c t\u1EBF ${playerId}`);
          return;
        }
        if (!playerId && isSandboxClient && clientPlayerId) {
          playerId = clientPlayerId;
          playerSockets.set(socket.id, clientPlayerId);
        }
        if (!playerId) return;
        let session = socketPlayerSessions.get(socket.id) || playerSessions.get(playerId);
        if (!session || !session.teamId) {
          const player = await prisma.player.findFirst({
            where: {
              OR: [
                { id: playerId },
                { socketId: socket.id },
                ...clientPlayerId ? [{ id: clientPlayerId }] : []
              ]
            },
            include: { room: true, team: true }
          });
          if (!player || !player.room) return;
          session = {
            playerId: player.id,
            playerName: player.name,
            roomId: player.room.id,
            roomCode: player.room.code,
            teamId: player.teamId || void 0,
            teamName: player.team?.name ?? player.name,
            roomMode: player.room.mode,
            teamMode: player.room.teamMode
          };
          socketPlayerSessions.set(socket.id, session);
          playerSessions.set(player.id, session);
        }
        let submissionTeamId = session.teamId;
        if (isSandboxClient && teamId) {
          session.teamId = teamId;
          submissionTeamId = teamId;
          roomSandboxActiveTeam.set(session.roomId, teamId);
        } else if (teamId && submissionTeamId && teamId !== submissionTeamId) {
          console.warn(`[Security] G\xF3i tin n\u1ED9p b\xE0i m\u1EA1o danh \u0111\u1ED9i t\u1EEB socket ${socket.id}: khai team ${teamId}, th\u1EF1c t\u1EBF ${submissionTeamId}`);
          return;
        }
        await processAnswerSubmission({
          io: io2,
          roomId: session.roomId,
          questionId,
          playerId,
          teamId: submissionTeamId,
          answer,
          clientAnsweredAt,
          isAdminOverride: false,
          socket
        });
      } catch (err) {
        console.error("[game:answer:submit] L\u1ED7i x\u1EED l\xFD n\u1ED9p b\xE0i:", err);
      }
    });
    socket.on("admin:submit:answer", async ({ questionId, teamId, playerId, answer, code }) => {
      const room = await getAdminRoom(socket, code);
      if (!room) return;
      const activeQ = roomActiveQuestions.get(room.id);
      const rawQuestions = room.quizBank?.questions ?? [];
      const effectiveQuestionId = questionId || activeQ?.question.id || rawQuestions[room.currentQuestion]?.id;
      if (!effectiveQuestionId) return;
      const qKey = `${room.id}:${effectiveQuestionId}`;
      let effTeamId = teamId;
      let effPlayerId = playerId;
      if (room.mode === "BOUNCEBACK") {
        const steal = roomStealBuzzed.get(qKey);
        const primary = roomPrimaryTeams.get(qKey);
        if (steal) {
          effTeamId = effTeamId || steal.teamId;
          effPlayerId = effPlayerId || steal.playerId;
        } else if (primary) {
          effTeamId = effTeamId || primary.teamId;
        }
      } else if (room.mode === "BUZZ") {
        const buzz = roomBuzzFirst.get(qKey);
        if (buzz) {
          effTeamId = effTeamId || buzz.teamId;
          effPlayerId = effPlayerId || buzz.playerId;
        }
      } else if (room.mode === "GRID_CARO") {
        const gridState = roomGridCaros.get(room.id);
        if (gridState?.currentTurnTeamId) {
          effTeamId = effTeamId || gridState.currentTurnTeamId;
        }
      } else if (room.mode === "DICE_RACE") {
        const diceState = roomDiceRaces.get(room.id);
        if (diceState?.currentTurnTeamId) {
          effTeamId = effTeamId || diceState.currentTurnTeamId;
        }
      } else if (room.mode === "MYSTERY_QUEST") {
        const questState = roomMysteryQuests.get(room.id);
        if (questState?.currentTurnTeamId) {
          effTeamId = effTeamId || questState.currentTurnTeamId;
        }
      }
      if (isSandboxRoomEntity(room) && effTeamId) {
        roomSandboxActiveTeam.set(room.id, effTeamId);
      }
      await processAnswerSubmission({
        io: io2,
        roomId: room.id,
        questionId: effectiveQuestionId,
        playerId: effPlayerId,
        teamId: effTeamId,
        answer,
        isAdminOverride: true,
        socket
      });
    });
    socket.on("game:buzz", async (payload) => {
      if (!checkActionDebounce(socket.id, 150)) return;
      const now = Date.now();
      const clientBuzzedAt = typeof payload?.clientBuzzedAt === "number" ? payload.clientBuzzedAt : now;
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      let session = socketPlayerSessions.get(socket.id) || playerSessions.get(playerId);
      if (!session) {
        const player = await prisma.player.findUnique({
          where: { id: playerId },
          include: { room: true, team: true }
        });
        if (!player?.room || player.room.status !== "PLAYING") return;
        session = {
          playerId: player.id,
          playerName: player.name,
          roomId: player.room.id,
          roomCode: player.room.code,
          teamId: player.teamId ?? void 0,
          teamName: player.team?.name ?? player.name,
          roomMode: player.room.mode,
          teamMode: player.room.teamMode
        };
        socketPlayerSessions.set(socket.id, session);
        playerSessions.set(player.id, session);
      }
      const activeQ = roomActiveQuestions.get(session.roomId);
      if (!activeQ || !activeQ.question?.id) return;
      const questionId = activeQ.question.id;
      const qKey = `${session.roomId}:${questionId}`;
      const mode = session.roomMode;
      if (mode === "BUZZ") {
        const isUnlocked = roomBuzzUnlocked.get(qKey) ?? false;
        if (!isUnlocked) {
          socket.emit("error", "Chu\xF4ng \u0111ang b\u1ECB kh\xF3a! Vui l\xF2ng ch\u1EDD m\u1EDF chu\xF4ng.");
          socket.emit("game:buzz:closed");
          return;
        }
        if (roomBuzzFirst.has(qKey)) {
          socket.emit("error", "\u0110\xE3 c\xF3 \u0111\u1ED9i gi\xE0nh quy\u1EC1n b\u1EA5m chu\xF4ng!");
          socket.emit("game:buzz:closed");
          return;
        }
        const teamId = session.teamId ?? session.playerId;
        const teamName = session.teamName ?? session.playerName;
        const maxAttempts = activeQ.buzzMaxAttempts ?? 3;
        const attempts = roomBuzzAttemptOrder.get(qKey) || [];
        if (attempts.length >= maxAttempts) {
          socket.emit("error", `\u0110\xE3 h\u1EBFt ${maxAttempts} l\u01B0\u1EE3t b\u1EA5m chu\xF4ng cho c\xE2u h\u1ECFi n\xE0y!`);
          socket.emit("game:buzz:closed");
          return;
        }
        const disqSet = roomBuzzDisqualified.get(qKey);
        const alreadyBuzzed = attempts.some((a) => a.teamId === teamId) || Boolean(disqSet && disqSet.has(teamId));
        if (alreadyBuzzed) {
          socket.emit("error", "M\u1ED7i \u0111\u1ED9i ch\u1EC9 \u0111\u01B0\u1EE3c b\u1EA5m chu\xF4ng t\u1ED1i \u0111a 1 l\u1EA7n cho m\u1ED7i c\xE2u h\u1ECFi!");
          socket.emit("game:buzz:closed");
          return;
        }
        roomBuzzUnlocked.set(qKey, false);
        if (roomBuzzWindowTimers.has(qKey)) {
          clearTimeout(roomBuzzWindowTimers.get(qKey));
          roomBuzzWindowTimers.delete(qKey);
        }
        const wEndsAt = roomBuzzWindowEndsAt.get(qKey) || now;
        const remWindowMs = Math.max(0, wEndsAt - now);
        roomBuzzWindowRemaining.set(qKey, remWindowMs);
        const winnerCandidate = {
          teamId,
          teamName,
          playerId: session.playerId,
          playerName: session.playerName,
          clientBuzzedAt,
          receivedAt: now,
          socket,
          mode: "BUZZ"
        };
        await resolveBuzzArbitrationWinner(session.roomId, session.roomCode, questionId, "BUZZ", [winnerCandidate]);
      } else if (mode === "BOUNCEBACK") {
        const isSteal = roomStealPhase.get(qKey) ?? false;
        if (!isSteal) {
          socket.emit("error", "Ch\u01B0a m\u1EDF l\u01B0\u1EE3t c\u01B0\u1EDBp \u0111i\u1EC3m!");
          socket.emit("game:buzz:closed");
          return;
        }
        const primary = roomPrimaryTeams.get(qKey);
        if (session.teamId && primary && session.teamId === primary.teamId) {
          socket.emit("error", "\u0110\u1ED9i c\u1EE7a b\u1EA1n l\xE0 \u0111\u1ED9i tr\u1EA3 l\u1EDDi ch\xEDnh, kh\xF4ng th\u1EC3 c\u01B0\u1EDBp l\u01B0\u1EE3t c\xE2u n\xE0y!");
          socket.emit("game:buzz:closed");
          return;
        }
        if (roomStealBuzzed.has(qKey)) {
          socket.emit("error", "\u0110\xE3 c\xF3 \u0111\u1ED9i c\u01B0\u1EDBp chu\xF4ng tr\u01B0\u1EDBc!");
          socket.emit("game:buzz:closed");
          return;
        }
        const teamId = session.teamId ?? session.playerId;
        const teamName = session.teamName ?? session.playerName;
        if (roomStealTimer.has(qKey)) {
          clearTimeout(roomStealTimer.get(qKey));
          roomStealTimer.delete(qKey);
        }
        roomStealPhase.set(qKey, false);
        const winnerCandidate = {
          teamId,
          teamName,
          playerId: session.playerId,
          playerName: session.playerName,
          clientBuzzedAt,
          receivedAt: now,
          socket,
          mode: "BOUNCEBACK"
        };
        await resolveBuzzArbitrationWinner(session.roomId, session.roomCode, questionId, "BOUNCEBACK", [winnerCandidate]);
      }
    });
    socket.on("admin:buzz:unlock", async () => {
      const room = await getAdminRoom(socket);
      if (!room || room.mode !== "BUZZ") return;
      const questions = await getRoomQuestions(room.id);
      const currentQ = questions[room.currentQuestion];
      if (!currentQ) return;
      const qKey = `${room.id}:${currentQ.id}`;
      if (roomBuzzDelayTimers.has(qKey)) {
        clearTimeout(roomBuzzDelayTimers.get(qKey));
        roomBuzzDelayTimers.delete(qKey);
      }
      roomBuzzWindowRemaining.set(qKey, 5e3);
      await openBuzzWindow(io2, room.id, room.code, currentQ.id, 5e3);
    });
    socket.on("admin:buzz:judge", async ({ isCorrect, code }) => {
      const room = await getAdminRoom(socket, code);
      if (!room || room.mode !== "BUZZ") return;
      const questions = await getRoomQuestions(room.id);
      const currentQ = questions[room.currentQuestion];
      if (!currentQ) return;
      await finalizeBuzzAnswer(io2, room.id, room.code, currentQ.id, isCorrect);
    });
    socket.on("admin:room:toggle_lock", async ({ code } = {}) => {
      const room = await getAdminRoom(socket, code);
      if (!room) return;
      const currentConfig = typeof room.config === "object" && room.config !== null ? room.config : {};
      const newLocked = !Boolean(currentConfig.isLocked);
      const updatedConfig = { ...currentConfig, isLocked: newLocked };
      await prisma.room.update({
        where: { id: room.id },
        data: { config: updatedConfig }
      });
      const refreshedState = await buildRoomState(room.id);
      io2.to(`room:${room.code}`).emit("room:state", refreshedState);
    });
    socket.on("admin:buzz:start_answer", async (payload) => {
      const room = await getAdminRoom(socket);
      if (!room) return;
      const questions = await getRoomQuestions(room.id);
      const currentQ = questions[room.currentQuestion];
      if (!currentQ) return;
      const qKey = `${room.id}:${currentQ.id}`;
      const buzz = roomBuzzFirst.get(qKey);
      if (!buzz) return;
      const isDeviceAnswer = room.config?.answerMethod !== "MC";
      const defaultDuration = isDeviceAnswer ? getBuzzedAnswerTimeLimit(currentQ) : 15;
      const timeLimit = payload?.duration && payload.duration > 0 ? payload.duration : defaultDuration;
      const activeQ = roomActiveQuestions.get(room.id);
      if (activeQ) {
        activeQ.buzzAnsweringActive = true;
        activeQ.timeLimit = timeLimit;
        activeQ.startedAt = Date.now();
        activeQ.endsAt = Date.now() + timeLimit * 1e3;
        activeQ.timerPending = false;
        activeQ.timerStarted = true;
        io2.to(`room:${room.code}`).emit("game:question", activeQ);
      }
      io2.to(`room:${room.code}`).emit("game:buzz:answering", {
        teamId: buzz.teamId,
        teamName: buzz.teamName,
        timeLimit,
        attemptNumber: buzz.attemptNumber,
        maxAttempts: activeQ?.buzzMaxAttempts,
        multiplier: buzz.multiplier
      });
      io2.to(`room:${room.code}`).emit("game:timer:started", {
        timeLimit,
        endsAt: Date.now() + timeLimit * 1e3,
        serverTime: Date.now(),
        questionId: currentQ.id
      });
      startQuestionTimer(io2, room.code, room.id, currentQ.id, timeLimit);
    });
    socket.on("admin:bounceback:open_steal", async () => {
      const room = await getAdminRoom(socket);
      if (!room) return;
      const questions = await getRoomQuestions(room.id);
      const currentQ = questions[room.currentQuestion];
      if (!currentQ) return;
      await openBouncebackStealWindow(io2, room.id, room.code, currentQ.id);
    });
    socket.on("admin:bounceback:judge", async ({ isCorrect, code }) => {
      const room = await getAdminRoom(socket, code);
      if (!room || room.mode !== "BOUNCEBACK") return;
      const rawQuestions = room.quizBank?.questions ?? [];
      const activeQ = roomActiveQuestions.get(room.id);
      const q = (activeQ ? rawQuestions.find((item) => item.id === activeQ.question.id) : null) || rawQuestions[room.currentQuestion];
      if (!q) return;
      const qKey = `${room.id}:${q.id}`;
      if (roomQuestionProcessed.has(qKey)) return;
      const stealInfo = roomStealBuzzed.get(qKey);
      if (stealInfo) {
        await finalizeBouncebackSteal(io2, room.id, room.code, q.id, isCorrect);
      } else {
        await finalizeBouncebackPrimary(io2, room.id, room.code, q.id, isCorrect);
      }
    });
    socket.on("admin:bounceback:start_steal_answer", async (payload) => {
      const room = await getAdminRoom(socket);
      if (!room) return;
      const questions = await getRoomQuestions(room.id);
      const currentQ = questions[room.currentQuestion];
      if (!currentQ) return;
      await startStealAnsweringTimer(room.id, room.code, currentQ, payload?.duration);
    });
    const handleBouncebackPointSelect = async (roomId, points) => {
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } }, teams: true }
      });
      if (!room || room.mode !== "BOUNCEBACK") return;
      const q = room.quizBank?.questions[room.currentQuestion];
      if (!q) return;
      const qKey = `${room.id}:${q.id}`;
      const validPoints = [10, 20, 30].includes(points) ? points : 20;
      const timeLimit = validPoints === 10 ? 15 : validPoints === 20 ? 20 : 30;
      roomBouncebackSelectedPoints.set(qKey, validPoints);
      const activeQ = roomActiveQuestions.get(room.id);
      const primary = roomPrimaryTeams.get(qKey);
      if (activeQ) {
        activeQ.bouncebackSelectPhase = false;
        activeQ.selectedPointLevel = validPoints;
        activeQ.timeLimit = timeLimit;
        activeQ.question.points = validPoints;
        activeQ.question.timeLimit = timeLimit;
        activeQ.timerPending = true;
        activeQ.timerStarted = false;
        activeQ.startedAt = Date.now();
        activeQ.endsAt = void 0;
      }
      io2.to(`room:${room.code}`).emit("game:bounceback:points_selected", {
        teamId: primary?.teamId || "",
        points: validPoints,
        timeLimit
      });
      const teamsCount = await prisma.team.count({ where: { roomId: room.id } }) || 4;
      const totalQuestionsCount = getTargetTotalQuestions(
        room.mode,
        room.config,
        teamsCount,
        room.quizBank?.questions?.length || 1
      );
      const prepEndsAt = Date.now() + 3e3;
      const preparePayload = {
        questionIndex: room.currentQuestion,
        totalQuestions: totalQuestionsCount,
        points: validPoints,
        timeLimit,
        seconds: 3,
        endsAt: prepEndsAt,
        total: 3,
        bloomLevel: getBloomLevelFromPoints(validPoints),
        primaryTeamName: primary?.teamName
      };
      io2.to(`room:${room.code}`).emit("game:prepare", preparePayload);
      const launchQuestionAfterPrepare = () => {
        roomPrepareStates.delete(room.id);
        if (activeQ) {
          activeQ.timerPending = true;
          activeQ.timerStarted = false;
          io2.to(`room:${room.code}`).emit("game:question", activeQ);
        }
      };
      const prepTimer = setTimeout(launchQuestionAfterPrepare, 3e3);
      roomPrepareStates.set(room.id, {
        type: "PREPARE",
        questionIndex: room.currentQuestion,
        totalQuestions: totalQuestionsCount,
        targetTimestamp: prepEndsAt,
        timer: prepTimer,
        skipCallback: launchQuestionAfterPrepare,
        preparePayload
      });
    };
    socket.on("game:bounceback:select_points", async ({ points }) => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({ where: { id: playerId }, include: { room: true } });
      if (!player?.room) return;
      const room = player.room;
      const activeQ = roomActiveQuestions.get(room.id);
      const qId = activeQ?.question?.id;
      const primary = qId ? roomPrimaryTeams.get(`${room.id}:${qId}`) : void 0;
      const expectedPrimaryTeamId = primary?.teamId || activeQ?.primaryTeamId;
      const sess = socketPlayerSessions.get(socket.id) || playerSessions.get(playerId);
      const effectivePlayerTeamId = sess?.teamId || player.teamId;
      if (expectedPrimaryTeamId && effectivePlayerTeamId !== expectedPrimaryTeamId && player.id !== expectedPrimaryTeamId) {
        socket.emit("error", "Hi\u1EC7n \u0111ang l\xE0 l\u01B0\u1EE3t ch\u1ECDn g\xF3i c\xE2u h\u1ECFi c\u1EE7a \u0111\u1ED9i ch\xEDnh!");
        return;
      }
      await handleBouncebackPointSelect(room.id, points);
    });
    socket.on("admin:bounceback:select_points", async ({ points }) => {
      const room = await getAdminRoom(socket);
      if (!room) return;
      await handleBouncebackPointSelect(room.id, points);
    });
    socket.on("game:powerup:use", async ({ cardId, targetTeamId }) => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: { include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } } }, team: true }
      });
      if (!player?.room || !player.team || !player.teamId) return;
      const room = player.room;
      if (room.status !== "PLAYING") return;
      const currentQ = room.quizBank?.questions[room.currentQuestion];
      const qKey = currentQ ? `${room.id}:${currentQ.id}` : "";
      const timerKey = `${room.id}:timer`;
      const curRem = roomRemainingTimes.get(timerKey);
      if (typeof curRem === "number" && curRem <= 5) {
        socket.emit("error", "\u0110\xE3 v\xE0o 5 gi\xE2y \u0111\u1EBFm ng\u01B0\u1EE3c cu\u1ED1i c\xF9ng, th\u1EBB h\u1ED7 tr\u1EE3 \u0111\xE3 b\u1ECB kh\xF3a \u0111\u1EC3 \u0111\u1EA3m b\u1EA3o nh\u1ECBp \u0111\u1ED9 thi \u0111\u1EA5u!");
        return;
      }
      if (room.mode === "MYSTERY_QUEST") {
        socket.emit("error", "Ch\u1EBF \u0111\u1ED9 H\xE0nh Tr\xECnh B\xED \u1EA8n kh\xF4ng h\u1ED7 tr\u1EE3 th\u1EBB b\u1ED5 tr\u1EE3 (Power-up)!");
        return;
      }
      if (room.mode === "BOUNCEBACK" && qKey) {
        if (roomStealPhase.get(qKey) || roomStealBuzzed.has(qKey)) {
          socket.emit("error", "To\xE0n b\u1ED9 th\u1EBB h\u1ED7 tr\u1EE3 (power-up) b\u1ECB v\xF4 hi\u1EC7u ho\xE1 trong l\u01B0\u1EE3t c\u01B0\u1EDBp \u0111i\u1EC3m!");
          return;
        }
        const primary = roomPrimaryTeams.get(qKey);
        if (primary && player.teamId !== primary.teamId) {
          socket.emit("error", "\u1EDE ph\u1EA7n thi V\u1EC1 \u0111\xEDch, ch\u1EC9 \u0111\u1ED9i ch\xEDnh m\u1EDBi \u0111\u01B0\u1EE3c d\xF9ng th\u1EBB h\u1ED7 tr\u1EE3 \u1EDF c\xE2u n\xE0y!");
          return;
        }
        const activeQ = roomActiveQuestions.get(room.id);
        if (activeQ?.timerStarted) {
          socket.emit("error", "\u1EDE ph\u1EA7n thi V\u1EC1 \u0111\xEDch, Ng\xF4i sao hy v\u1ECDng v\xE0 th\u1EBB h\u1ED7 tr\u1EE3 ch\u1EC9 \u0111\u01B0\u1EE3c k\xEDch ho\u1EA1t tr\u01B0\u1EDBc khi b\u1EAFt \u0111\u1EA7u \u0111\u1EBFm ng\u01B0\u1EE3c!");
          return;
        }
      }
      if (room.mode === "BUZZ" && qKey) {
        const activeQ = roomActiveQuestions.get(room.id);
        if (roomBuzzFirst.has(qKey) || activeQ?.buzzedTeamId || activeQ?.timerStarted) {
          socket.emit("error", "Kh\xF4ng th\u1EC3 d\xF9ng th\u1EBB h\u1ED7 tr\u1EE3 sau khi chu\xF4ng \u0111\xE3 b\u1EA5m ho\u1EB7c th\u1EDDi gian tr\u1EA3 l\u1EDDi \u0111\xE3 b\u1EAFt \u0111\u1EA7u!");
          return;
        }
      }
      if (inFlightPowerupCards.has(cardId)) {
        socket.emit("error", "Th\u1EBB n\xE0y \u0111ang \u0111\u01B0\u1EE3c x\u1EED l\xFD, vui l\xF2ng kh\xF4ng b\u1EA5m li\xEAn t\u1EE5c!");
        return;
      }
      inFlightPowerupCards.add(cardId);
      try {
        const card = await prisma.powerupCard.findUnique({ where: { id: cardId } });
        if (!card || card.used) {
          socket.emit("error", "Th\u1EBB n\xE0y \u0111\xE3 \u0111\u01B0\u1EE3c d\xF9ng ho\u1EB7c kh\xF4ng h\u1EE3p l\u1EC7!");
          return;
        }
        if (card.ownerType === "TEAM" && card.teamId !== player.teamId) {
          socket.emit("error", "Th\u1EBB n\xE0y kh\xF4ng thu\u1ED9c v\u1EC1 \u0111\u1ED9i c\u1EE7a b\u1EA1n!");
          return;
        }
        if (room.teamMode === "TEAM" && qKey) {
          let teamCardsMap = roomQuestionTeamCards.get(qKey);
          if (!teamCardsMap) {
            teamCardsMap = /* @__PURE__ */ new Map();
            roomQuestionTeamCards.set(qKey, teamCardsMap);
          }
          const existingCards = teamCardsMap.get(player.teamId) || [];
          if (existingCards.some((c) => c.type === card.type)) {
            socket.emit("error", `\u0110\u1ED9i c\u1EE7a b\u1EA1n \u0111\xE3 k\xEDch ho\u1EA1t th\u1EBB ${CARD_METADATA[card.type]?.nameVi || card.type} \u1EDF c\xE2u h\u1ECFi n\xE0y r\u1ED3i!`);
            return;
          }
          if (card.type === "SHIELD" && existingCards.some((c) => c.type === "SCORE_X2" || c.type === "DOUBLE")) {
            socket.emit("error", "Kh\xF4ng th\u1EC3 v\u1EEBa d\xF9ng Khi\xEAn B\u1EA3o V\u1EC7 v\u1EEBa d\xF9ng Ng\xF4i Sao Hy V\u1ECDng (x2 \u0111i\u1EC3m) trong c\xF9ng m\u1ED9t c\xE2u!");
            return;
          }
          if ((card.type === "SCORE_X2" || card.type === "DOUBLE") && existingCards.some((c) => c.type === "SHIELD")) {
            socket.emit("error", "Kh\xF4ng th\u1EC3 v\u1EEBa d\xF9ng Ng\xF4i Sao Hy V\u1ECDng (x2 \u0111i\u1EC3m) v\u1EEBa d\xF9ng Khi\xEAn B\u1EA3o V\u1EC7 trong c\xF9ng m\u1ED9t c\xE2u!");
            return;
          }
        }
        if (!isPowerupAllowedForMode(room.mode, card.type)) {
          socket.emit("error", `Th\u1EBB ${CARD_METADATA[card.type]?.nameVi || card.type} kh\xF4ng \u0111\u01B0\u1EE3c ph\xE9p s\u1EED d\u1EE5ng trong ch\u1EBF \u0111\u1ED9 ${room.mode}!`);
          return;
        }
        if (isSharedPowerup(card.type)) {
          if (roomSharedPowerupUsedInQuestion.get(room.id)) {
            socket.emit("error", "M\u1ED9t \u0111\u1ED9i kh\xE1c \u0111\xE3 k\xEDch ho\u1EA1t th\u1EBB d\xF9ng chung trong c\xE2u h\u1ECFi n\xE0y r\u1ED3i! M\u1ED7i c\xE2u ch\u1EC9 \u0111\u01B0\u1EE3c d\xF9ng t\u1ED1i \u0111a 1 th\u1EBB d\xF9ng chung.");
            return;
          }
        }
        if (card.type === "SKIP") {
          const questions = room.quizBank?.questions ?? [];
          const nextQ = getNextUniqueQuestion(room.id, questions);
          if (!nextQ) {
            socket.emit("error", "Kh\xF4ng c\xF2n c\xE2u h\u1ECFi d\u1EF1 ph\xF2ng \u0111\u1EC3 \u0111\u1ED5i!");
            return;
          }
        }
        if ((card.type === "ATTACK" || card.type === "FREEZE" || card.type === "PENALTY") && targetTeamId) {
          const immunityKey = `${room.id}:${targetTeamId}`;
          const immuneUntilQ = roomTeamImmunity.get(immunityKey);
          if (immuneUntilQ !== void 0 && immuneUntilQ >= room.currentQuestion) {
            socket.emit("error", "\u0110\u1ED9i n\xE0y v\u1EEBa b\u1ECB t\u1EA5n c\xF4ng v\xE0 \u0111ang \u0111\u01B0\u1EE3c k\xEDch ho\u1EA1t Khi\xEAn mi\u1EC5n nhi\u1EC5m b\u1EA3o h\u1ED9 trong c\xE2u h\u1ECFi n\xE0y!");
            return;
          }
          roomTeamImmunity.set(immunityKey, room.currentQuestion + 1);
        }
        await prisma.powerupCard.update({
          where: { id: cardId },
          data: { used: true, usedAt: /* @__PURE__ */ new Date(), usedByTeamId: player.teamId }
        });
        if (room.teamMode === "TEAM" && qKey) {
          const teamCardsMap = roomQuestionTeamCards.get(qKey);
          const currentList = teamCardsMap.get(player.teamId) || [];
          currentList.push({
            cardId,
            type: card.type,
            usedByPlayerId: player.id,
            usedByPlayerName: player.name,
            teamId: player.teamId,
            targetTeamId,
            appliedAt: Date.now()
          });
          teamCardsMap.set(player.teamId, currentList);
        }
        if (card.type === "FIFTY_FIFTY" && currentQ) {
          const options = currentQ.options;
          if (options && options.length > 2) {
            const wrongOpts = options.filter((o) => !o.isCorrect);
            const shuffledWrong = shuffleArray(wrongOpts).slice(0, 2);
            const hiddenIds = shuffledWrong.map((o) => o.id);
            let fMap = roomFiftyFifty.get(qKey);
            if (!fMap) {
              fMap = /* @__PURE__ */ new Map();
              roomFiftyFifty.set(qKey, fMap);
            }
            fMap.set(player.teamId, hiddenIds);
            io2.to(`room:${room.code}`).emit("game:fifty_fifty:applied", {
              teamId: player.teamId,
              hiddenOptionIds: hiddenIds
            });
          }
        } else if (card.type === "FREEZE" && targetTeamId && qKey) {
          let fSet = roomFrozenTeams.get(qKey);
          if (!fSet) {
            fSet = /* @__PURE__ */ new Set();
            roomFrozenTeams.set(qKey, fSet);
          }
          fSet.add(targetTeamId);
        } else if (card.type === "TIME_PLUS") {
          const tKey = `${room.id}:timer`;
          const curRem2 = roomRemainingTimes.get(tKey);
          if (curRem2 !== void 0) {
            const nextRem = curRem2 + 15;
            roomRemainingTimes.set(tKey, nextRem);
            const curEndsAt = roomTimerEndsAt.get(room.id) ?? Date.now() + curRem2 * 1e3;
            const newEndsAt = curEndsAt + 15e3;
            roomTimerEndsAt.set(room.id, newEndsAt);
            io2.to(`room:${room.code}`).emit("game:timer", {
              remaining: nextRem,
              total: (currentQ?.timeLimit ?? 30) + 15,
              endsAt: newEndsAt,
              serverTime: Date.now()
            });
          }
        } else if (card.type === "STEAL") {
          const teams = await prisma.team.findMany({
            where: { roomId: room.id },
            orderBy: { score: "desc" }
          });
          const leader = teams[0];
          if (leader && leader.id !== player.teamId) {
            const myTeam = teams.find((t) => t.id === player.teamId);
            const amount = computeStealAmount(leader.score, myTeam?.score ?? 0);
            if (amount > 0 && player.teamId) {
              const leaderRes = await applyScoreDeltaToTeam(leader.id, -amount);
              const myRes = await applyScoreDeltaToTeam(player.teamId, amount);
              io2.to(`room:${room.code}`).emit("game:score:update", [
                { teamId: leader.id, score: leaderRes.newScore, delta: leaderRes.effectiveDelta },
                { teamId: player.teamId, score: myRes.newScore, delta: myRes.effectiveDelta }
              ]);
            }
          }
        } else if (card.type === "SKIP") {
          const questions = room.quizBank?.questions ?? [];
          const nextQ = getNextUniqueQuestion(room.id, questions);
          if (nextQ) {
            stopQuestionTimer(room.id);
            roomActiveQuestions.delete(room.id);
            roomRevealPayloads.delete(room.id);
            room.currentQuestion = nextQ.index;
            roomCache.set(room.id, room);
            await prisma.room.update({
              where: { id: room.id },
              data: { currentQuestion: nextQ.index }
            }).catch(console.error);
            await startQuestionPrepareAndLaunch(room, questions, nextQ.index, nextQ.question);
          }
        }
        await prisma.gameLog.create({
          data: {
            roomId: room.id,
            event: "powerup_used",
            payload: { cardId, type: card.type, usedByPlayerName: player.name, usedByTeamId: player.teamId, targetTeamId }
          }
        });
        io2.to(`room:${room.code}`).emit("game:powerup:used", {
          cardId,
          type: card.type,
          usedByTeamId: player.teamId,
          usedByName: `${player.name} (${player.team.name})`,
          targetTeamId,
          targetTeamName: void 0,
          effect: `${CARD_METADATA[card.type]?.nameVi || card.type} \u0111\xE3 \u0111\u01B0\u1EE3c k\xEDch ho\u1EA1t cho to\xE0n \u0111\u1ED9i!`
        });
        if (isSharedPowerup(card.type)) {
          roomSharedPowerupUsedInQuestion.set(room.id, true);
          const activeQ = roomActiveQuestions.get(room.id);
          if (activeQ) {
            activeQ.hasSharedPowerupUsed = true;
          }
          io2.to(`room:${room.code}`).emit("game:powerup:shared_locked", {
            cardType: card.type,
            usedByTeamId: player.teamId,
            usedByTeamName: player.team.name,
            questionIndex: room.currentQuestion
          });
        }
        const state = await buildRoomState(room.id);
        io2.to(`room:${room.code}`).emit("room:state", state);
      } catch (err) {
        console.error("[game:powerup:use] Error:", err);
        socket.emit("error", "L\u1ED7i x\u1EED l\xFD s\u1EED d\u1EE5ng th\u1EBB b\u1ED5 tr\u1EE3!");
        const state = await buildRoomState(player.room.id).catch(() => null);
        if (state) socket.emit("room:state", state);
      } finally {
        inFlightPowerupCards.delete(cardId);
      }
    });
    async function startQuestionPrepareAndLaunch(room, questions, questionIndex, specificQ) {
      stopQuestionTimer(room.id);
      roomRevealPayloads.delete(room.id);
      roomIntermissions.delete(room.id);
      if (roomIntermissionTimers.has(room.id)) {
        clearTimeout(roomIntermissionTimers.get(room.id));
        roomIntermissionTimers.delete(room.id);
      }
      io2.to(`room:${room.code}`).emit("game:intermission", null);
      const existingPrepare = roomPrepareStates.get(room.id);
      if (existingPrepare?.timer) {
        clearTimeout(existingPrepare.timer);
      }
      roomPrepareStates.delete(room.id);
      const existingWagerTimer = roomWagerTimers.get(room.id);
      if (existingWagerTimer) {
        clearInterval(existingWagerTimer);
        clearTimeout(existingWagerTimer);
        roomWagerTimers.delete(room.id);
      }
      const existingWagerAutoTimer = roomWagerAutoLaunchTimers.get(room.id);
      if (existingWagerAutoTimer) {
        clearTimeout(existingWagerAutoTimer);
        roomWagerAutoLaunchTimers.delete(room.id);
      }
      const q = specificQ || questions[questionIndex];
      if (!q) return;
      let usedSet = roomUsedQuestions.get(room.id);
      if (!usedSet) {
        usedSet = /* @__PURE__ */ new Set();
        roomUsedQuestions.set(room.id, usedSet);
      }
      usedSet.add(q.id);
      const qKey = `${room.id}:${q.id}`;
      roomStealPhase.delete(qKey);
      roomStealBuzzed.delete(qKey);
      roomStealOpenedAt.delete(qKey);
      roomStealEndsAt.delete(qKey);
      roomBuzzFirst.delete(qKey);
      roomBuzzUnlocked.delete(qKey);
      roomBuzzWindowOpenedAt.delete(qKey);
      if (roomBuzzArbitration.has(qKey)) {
        clearTimeout(roomBuzzArbitration.get(qKey).timer);
        roomBuzzArbitration.delete(qKey);
      }
      if (roomBuzzDelayTimers.has(qKey)) {
        clearTimeout(roomBuzzDelayTimers.get(qKey));
        roomBuzzDelayTimers.delete(qKey);
      }
      roomQuestionProcessed.delete(qKey);
      roomQuestionScoresCache.delete(qKey);
      roomSharedPowerupUsedInQuestion.delete(room.id);
      let primaryTeamId;
      let primaryTeamName;
      let tournamentMatchId;
      let gridCellId;
      let diceRollValue;
      if (room.mode === "BOUNCEBACK") {
        const teams = await prisma.team.findMany({ where: { roomId: room.id }, orderBy: { createdAt: "asc" } });
        if (teams.length > 0) {
          const config2 = room.config;
          const questionsPerTurn = config2?.bouncebackQuestionsPerTurn || 1;
          const turnIndex = Math.floor(questionIndex / questionsPerTurn) % teams.length;
          const primary = teams[turnIndex];
          primaryTeamId = primary.id;
          primaryTeamName = primary.name;
          roomPrimaryTeams.set(qKey, { teamId: primary.id, teamName: primary.name });
        }
      } else if (room.mode === "TOURNAMENT") {
        const tournament = roomTournaments.get(room.id);
        const currentMatch = tournament?.matches.find((m) => m.id === tournament.currentMatchId);
        if (currentMatch) {
          primaryTeamId = currentMatch.team1Id;
          primaryTeamName = `${currentMatch.team1Name || "?"} vs ${currentMatch.team2Name || "?"}`;
          tournamentMatchId = currentMatch.id;
        }
      } else if (room.mode === "GRID_CARO") {
        const gridState = roomGridCaros.get(room.id);
        if (gridState) {
          primaryTeamId = gridState.currentTurnTeamId;
          primaryTeamName = gridState.currentTurnTeamName;
          gridCellId = gridState.selectedCellId;
        }
      } else if (room.mode === "DICE_RACE") {
        const diceState = roomDiceRaces.get(room.id);
        if (diceState) {
          primaryTeamId = diceState.currentTurnTeamId;
          primaryTeamName = diceState.currentTurnTeamName;
          diceRollValue = diceState.lastDiceRoll;
          diceState.canRollDice = false;
          diceState.dicePendingAnswer = true;
          io2.to(`room:${room.code}`).emit("game:dice:update", diceState);
        }
      } else if (room.mode === "MYSTERY_QUEST") {
        const questState = roomMysteryQuests.get(room.id);
        const round = questState ? questState.currentRound : 1;
        const fallbackPts = round === 1 ? 10 : round === 2 ? 20 : round === 3 ? 30 : 40;
        q.points = normalizeToThreeLevels(q.points || fallbackPts);
        if (questState) {
          primaryTeamId = questState.currentTurnTeamId;
          primaryTeamName = questState.currentTurnTeamName;
          questState.phase = "QUESTION_ACTIVE";
          questState.baseQuestionPoints = q.points;
          questState.cardsFlippedCount = 0;
          questState.potPoints = 0;
          questState.potMultiplier = 1;
          questState.bombExploded = void 0;
          questState.turnFinishedReason = void 0;
          questState.storyResult = void 0;
          questState.lastFlippedTile = void 0;
          questState.decisionMade = void 0;
          questState.pendingSteal = void 0;
          questState.survivalDilemmaPending = false;
          questState.survivalDilemmaChoice = void 0;
          questState.isPenaltySurvivalMode = false;
          questState.memoryPairsState = getInitialMemoryPairsState(questState.promoPerk);
          const teams = await prisma.team.findMany({ where: { roomId: room.id } });
          synchronizeMysteryStageWithQuestionPoints({
            state: questState,
            questionPoints: q.points,
            theme: questState.theme,
            teams
          });
          roomMysteryQuests.set(room.id, questState);
          io2.to(`room:${room.code}`).emit("game:mystery:update", questState);
        }
      }
      const config = room.config;
      let bouncebackSelectPhase = false;
      const chosenPoints = roomBouncebackSelectedPoints.get(qKey);
      if (room.mode === "BOUNCEBACK") {
        if (!chosenPoints) {
          bouncebackSelectPhase = true;
        } else {
          q.points = chosenPoints;
        }
      } else if (room.mode === "MYSTERY_QUEST") {
      } else if (room.mode === "DICE_RACE") {
        const teamsCount = await prisma.team.count({ where: { roomId: room.id } }).catch(() => 4);
        const round = Math.floor((room.currentQuestion || 0) / Math.max(1, teamsCount)) + 1;
        q.points = round === 1 ? 10 : round === 2 ? 20 : 30;
      } else {
        q.points = normalizeToThreeLevels(q.points || 10);
      }
      const bloomLevel = getBloomLevelFromPoints(q.points);
      const launchQuestion = async () => {
        roomPrepareStates.delete(room.id);
        const buzzMode = room.mode === "BUZZ";
        const buzzUnlockMode = config?.autoTimerStart ? config?.buzzUnlockMode ?? "AUTO" : "MANUAL";
        const buzzAutoDelay = Math.max(3, Number(config?.buzzAutoDelay) || 3);
        const buzzUnlocked = !buzzMode;
        roomBuzzUnlocked.set(qKey, buzzUnlocked);
        let buzzMaxAttempts = void 0;
        if (buzzMode) {
          const totalActors = room.teamMode === "TEAM" ? await prisma.team.count({ where: { roomId: room.id } }) : await prisma.player.count({ where: { roomId: room.id } });
          buzzMaxAttempts = totalActors <= 2 ? 2 : 3;
          roomBuzzWindowRemaining.set(qKey, 5e3);
          roomBuzzDisqualified.set(qKey, /* @__PURE__ */ new Set());
          roomBuzzAttemptOrder.set(qKey, []);
          roomBuzzFirst.delete(qKey);
          if (roomBuzzWindowTimers.has(qKey)) {
            clearTimeout(roomBuzzWindowTimers.get(qKey));
            roomBuzzWindowTimers.delete(qKey);
          }
        }
        const mysteryState = roomMysteryQuests.get(room.id);
        const questionOrder = room.mode === "MYSTERY_QUEST" && mysteryState ? mysteryState.currentTurnIndex + 1 : q.order;
        const questionState = buildQuestionState(q, {
          order: questionOrder,
          primaryTeamId,
          primaryTeamName,
          bloomLevel,
          answerMethod: config?.answerMethod ?? "DEVICE",
          tournamentMatchId,
          gridCellId,
          diceRollValue,
          wagerPhase: room.mode === "WAGER" ? "QUESTION_PERIOD" : void 0,
          buzzUnlockMode,
          buzzAutoDelaySeconds: buzzAutoDelay,
          buzzUnlocked,
          canRollDice: false,
          bouncebackSelectPhase,
          selectedPointLevel: chosenPoints,
          streakCount: primaryTeamId ? teamStreakMap.get(primaryTeamId) || 0 : void 0,
          answerSubmissionMode: config?.answerSubmissionMode || "ALLOW_CHANGE"
        });
        if (room.mode === "CLASSIC" && !roomGoldQuestions.has(room.id)) {
          const goldSet = selectGoldQuestions(questions);
          roomGoldQuestions.set(room.id, goldSet);
        }
        questionState.isGoldQuestion = room.mode === "CLASSIC" && Boolean(roomGoldQuestions.get(room.id)?.has(q.id));
        if (buzzMode) {
          questionState.buzzAttemptNumber = 1;
          questionState.buzzMaxAttempts = buzzMaxAttempts;
          questionState.buzzDisqualifiedTeamIds = [];
        }
        const standardTimeLimit = getStandardQuestionTimeLimit(q, chosenPoints);
        questionState.timeLimit = standardTimeLimit;
        questionState.question.timeLimit = standardTimeLimit;
        roomOriginalQuestions.set(qKey, q);
        const isAutoTimer = config?.autoTimerStart === true && !bouncebackSelectPhase;
        if (!isAutoTimer) {
          questionState.timerPending = true;
          questionState.timerStarted = false;
          roomActiveQuestions.set(room.id, questionState);
          io2.to(`room:${room.code}`).emit("game:question", questionState);
        } else {
          if (buzzMode) {
            questionState.timerPending = true;
            questionState.timerStarted = false;
            roomActiveQuestions.set(room.id, questionState);
            io2.to(`room:${room.code}`).emit("game:question", questionState);
            const autoTimer = setTimeout(async () => {
              roomBuzzDelayTimers.delete(qKey);
              await openBuzzWindow(io2, room.id, room.code, q.id);
            }, buzzAutoDelay * 1e3);
            roomBuzzDelayTimers.set(qKey, autoTimer);
          } else {
            const endsAt = Date.now() + standardTimeLimit * 1e3;
            questionState.timerPending = false;
            questionState.timerStarted = true;
            questionState.endsAt = endsAt;
            questionState.serverTime = Date.now();
            roomActiveQuestions.set(room.id, questionState);
            io2.to(`room:${room.code}`).emit("game:question", questionState);
            startQuestionTimer(io2, room.code, room.id, q.id, standardTimeLimit);
          }
        }
        io2.to(`room:${room.code}:admin`).emit("admin:question:data", {
          questionId: q.id,
          options: q.options,
          answer: q.answer,
          type: q.type,
          explanation: q.hint || q.explanation
        });
        persistGameStateSnapshot(room.id).catch(() => {
        });
      };
      if (room.mode === "WAGER") {
        roomActiveQuestions.delete(room.id);
        io2.to(`room:${room.code}`).emit("game:question:clear");
        const teams = await prisma.team.findMany({ where: { roomId: room.id } });
        const initialWagers = {};
        teams.forEach((t) => {
          initialWagers[t.id] = { teamId: t.id, teamName: t.name, amount: 10, submitted: false };
        });
        const prevWagerState = roomWagers.get(room.id);
        const prevWagerTeamId = prevWagerState?.lastWagerTeamId;
        const bailoutMax = config?.wagerBailoutLimit ?? 1;
        const teamBailouts = prevWagerState?.teamBailouts ?? {};
        teams.forEach((t) => {
          if (!teamBailouts[t.id]) {
            teamBailouts[t.id] = { remaining: bailoutMax, max: bailoutMax };
          }
        });
        const teamsCount = Math.max(1, teams.length);
        const wagerRounds = config?.wagerRoundsPerTeam || 2;
        const currentRoundIdx = Math.floor(questionIndex / teamsCount);
        const wagerMultCap = Math.max(1, Math.min(3, Number(config?.wagerMultiplierCap) || 2.5));
        const basePts = q.points || 10;
        const calculatedMaxBetCap = Math.floor(basePts * wagerMultCap);
        const wagerState = {
          phase: "WAGER_PERIOD",
          wagerSubPhase: "INITIAL_5S",
          wagerTimeRemaining: 5,
          wagerTimeTotal: 5,
          minWager: 5,
          currentHighestWager: 0,
          lastWagerTeamId: void 0,
          previousQuestionWagerTeamId: prevWagerTeamId,
          autoAssignedTeamName: void 0,
          questionReady: false,
          wagerHistory: [],
          allowanceMinScore: config?.wagerMinAllowance || 50,
          initialPoints: config?.wagerInitialPoints || 50,
          topicPreview: getBroadTopic({
            topic: q.topic,
            content: q.content,
            bankTitle: room.quizBank?.title || q.quizBank?.title
          }),
          difficultyPreview: bloomLevel,
          teamWagers: initialWagers,
          teamBailouts,
          bailoutQueue: prevWagerState?.bailoutQueue ?? [],
          currentQuestionBailoutUsed: false,
          maxBetCap: calculatedMaxBetCap,
          wagerMultiplierCap: wagerMultCap,
          baseQuestionPoints: basePts,
          roundIndex: currentRoundIdx,
          totalRounds: wagerRounds
        };
        roomWagers.set(room.id, wagerState);
        io2.to(`room:${room.code}`).emit("game:wager:update", wagerState);
        let initRem = 5;
        const initTimer = setInterval(async () => {
          initRem--;
          wagerState.wagerTimeRemaining = initRem;
          if (initRem <= 0) {
            clearInterval(initTimer);
            roomWagerTimers.delete(room.id);
            if (!wagerState.lastWagerTeamId || wagerState.wagerHistory.length === 0) {
              const activeTeams = teams.filter((t) => !t.isEliminated);
              const eligibleTeams = prevWagerTeamId && activeTeams.filter((t) => t.id !== prevWagerTeamId).length > 0 ? activeTeams.filter((t) => t.id !== prevWagerTeamId) : activeTeams;
              const roundRobinIndex = questionIndex % eligibleTeams.length;
              const pickedTeam = eligibleTeams[roundRobinIndex] || activeTeams[0];
              const assignedWager = pickedTeam && pickedTeam.score < 10 ? Math.min(5, pickedTeam.score > 0 ? pickedTeam.score : 5) : 10;
              if (pickedTeam) {
                wagerState.currentHighestWager = assignedWager;
                wagerState.lastWagerTeamId = pickedTeam.id;
                wagerState.autoAssignedTeamId = pickedTeam.id;
                wagerState.autoAssignedTeamName = pickedTeam.name;
                wagerState.wagerHistory = [{
                  order: 1,
                  teamId: pickedTeam.id,
                  teamName: pickedTeam.name,
                  teamColor: pickedTeam.color,
                  amount: assignedWager,
                  timestamp: Date.now()
                }];
                wagerState.teamWagers[pickedTeam.id] = {
                  teamId: pickedTeam.id,
                  teamName: pickedTeam.name,
                  amount: assignedWager,
                  submitted: true,
                  order: 1
                };
              }
            }
            const nextMin = (wagerState.currentHighestWager || 10) + 5;
            const canAnyBet = checkCanAnyTeamBet(teams, wagerState, nextMin);
            if (!canAnyBet) {
              await lockWagerAndScheduleAutoLaunch(io2, room.id, room.code, wagerState);
            } else {
              const wagerDuration = room.config?.wagerTimeSeconds || 15;
              startWager15sCountdown(io2, room.id, room.code, wagerDuration);
            }
          } else {
            io2.to(`room:${room.code}`).emit("game:wager:update", wagerState);
          }
        }, 1e3);
        roomWagerTimers.set(room.id, initTimer);
        return;
      }
      if (room.mode === "BOUNCEBACK" && bouncebackSelectPhase) {
        await launchQuestion();
        return;
      }
      await launchQuestion();
    }
    async function ensureInitialTeamPowerups(roomId, ioInstance) {
      try {
        const room = await prisma.room.findUnique({
          where: { id: roomId },
          include: { teams: { include: { powerupCards: true } } }
        });
        if (!room) return;
        const config = room.config;
        if (room.mode === "MYSTERY_QUEST" || !config?.powerupEnabled) return;
        const allowed = config.allowedPowerups || [
          "FIFTY_FIFTY",
          "DOUBLE",
          "FREEZE",
          "ATTACK",
          "SKIP",
          "TIME_PLUS",
          "SHIELD",
          "STEAL",
          "PENALTY",
          "SCORE_X2"
        ];
        if (allowed.length === 0) return;
        const initialCount = config.powerupCountPerTeam || 2;
        const sharedAllowed = allowed.filter((t) => isSharedPowerup(t));
        const privateAllowed = allowed.filter((t) => !isSharedPowerup(t));
        const safePrivatePool = privateAllowed.length > 0 ? privateAllowed : allowed;
        const sharedQuota = config.sharedPowerupTeamQuota ?? (room.teams.length <= 3 ? 1 : 2);
        const sharedProbability = config.sharedPowerupProbability ?? DEFAULT_SHARED_POWERUP_PROBABILITY;
        const teamsWithShared = new Set(
          room.teams.filter((t) => t.powerupCards.some((c) => !c.used && isSharedPowerup(c.type))).map((t) => t.id)
        );
        const teamsNeedingCards = room.teams.filter((t) => {
          const activeUnused = t.powerupCards.filter((c) => !c.used).length;
          return activeUnused < initialCount;
        });
        const slotsForShared = Math.max(0, sharedQuota - teamsWithShared.size);
        const candidatesForShared = teamsNeedingCards.filter((t) => !teamsWithShared.has(t.id));
        const luckyTeams = /* @__PURE__ */ new Set();
        if (slotsForShared > 0 && sharedAllowed.length > 0 && candidatesForShared.length > 0) {
          const shuffledCandidates = [...candidatesForShared].sort(() => Math.random() - 0.5);
          for (const cand of shuffledCandidates) {
            if (luckyTeams.size >= slotsForShared) break;
            if (Math.random() < sharedProbability) {
              luckyTeams.add(cand.id);
            }
          }
        }
        let addedAny = false;
        for (const team of room.teams) {
          const activeUnused = team.powerupCards.filter((c) => !c.used).length;
          const need = Math.max(0, initialCount - activeUnused);
          if (need <= 0) continue;
          let giveShared = luckyTeams.has(team.id) && sharedAllowed.length > 0;
          for (let i = 0; i < need; i++) {
            let cardTypeToGive;
            if (giveShared) {
              cardTypeToGive = sharedAllowed[Math.floor(Math.random() * sharedAllowed.length)];
              giveShared = false;
            } else {
              cardTypeToGive = safePrivatePool[Math.floor(Math.random() * safePrivatePool.length)];
            }
            await prisma.powerupCard.create({
              data: {
                type: cardTypeToGive,
                ownerType: "TEAM",
                teamId: team.id,
                roomId: room.id
              }
            });
            addedAny = true;
          }
        }
        if (addedAny) {
          const updatedState = await buildRoomState(room.id);
          ioInstance.to(`room:${room.code}`).emit("room:state", updatedState);
        }
      } catch (err) {
        console.error("[ensureInitialTeamPowerups]", err);
      }
    }
    async function replenishTeamPowerups(roomId, ioInstance) {
      try {
        const room = await prisma.room.findUnique({
          where: { id: roomId },
          include: { teams: { include: { powerupCards: true } } }
        });
        if (!room) return;
        const config = room.config;
        if (room.mode === "MYSTERY_QUEST" || !config?.powerupEnabled) return;
        const allowed = config.allowedPowerups || [
          "FIFTY_FIFTY",
          "DOUBLE",
          "FREEZE",
          "ATTACK",
          "SKIP",
          "TIME_PLUS",
          "SHIELD",
          "STEAL",
          "PENALTY",
          "SCORE_X2"
        ];
        if (allowed.length === 0) return;
        const maxHand = config.maxHandSize || 3;
        const sharedQuota = config.sharedPowerupTeamQuota ?? (room.teams.length <= 3 ? 1 : 2);
        const sharedProbability = config.sharedPowerupProbability ?? DEFAULT_SHARED_POWERUP_PROBABILITY;
        const sharedAllowed = allowed.filter((t) => isSharedPowerup(t));
        const privateAllowed = allowed.filter((t) => !isSharedPowerup(t));
        const safePrivatePool = privateAllowed.length > 0 ? privateAllowed : allowed;
        let currentSharedTeamCount = room.teams.filter(
          (t) => !t.isEliminated && t.powerupCards.some((c) => !c.used && isSharedPowerup(c.type))
        ).length;
        let addedAny = false;
        for (const team of room.teams) {
          if (team.isEliminated) continue;
          const activeUnused = team.powerupCards.filter((c) => !c.used).length;
          if (activeUnused < maxHand) {
            const hasShared = team.powerupCards.some((c) => !c.used && isSharedPowerup(c.type));
            let cardTypeToGive;
            if (!hasShared && currentSharedTeamCount < sharedQuota && sharedAllowed.length > 0 && Math.random() < sharedProbability) {
              cardTypeToGive = sharedAllowed[Math.floor(Math.random() * sharedAllowed.length)];
              currentSharedTeamCount++;
            } else {
              cardTypeToGive = safePrivatePool[Math.floor(Math.random() * safePrivatePool.length)];
            }
            await prisma.powerupCard.create({
              data: {
                type: cardTypeToGive,
                ownerType: "TEAM",
                teamId: team.id,
                roomId: room.id
              }
            });
            addedAny = true;
          }
        }
        if (addedAny) {
          const updatedState = await buildRoomState(room.id);
          ioInstance.to(`room:${room.code}`).emit("room:state", updatedState);
        }
      } catch (err) {
        console.error("[replenishTeamPowerups]", err);
      }
    }
    socket.on("admin:next", async (payload) => {
      const room = await getAdminRoom(socket, payload?.code);
      if (!room) {
        console.warn(`[admin:next] Unable to find admin room for socket ${socket.id}, payload:`, payload);
        return;
      }
      const actionKey = `${room.id}:next`;
      if (inFlightAdminActions.has(actionKey)) return;
      inFlightAdminActions.add(actionKey);
      setTimeout(() => inFlightAdminActions.delete(actionKey), 800);
      if (roomPrepareStates.has(room.id)) {
        const prep = roomPrepareStates.get(room.id);
        if (prep) {
          if (prep.timer) clearTimeout(prep.timer);
          roomPrepareStates.delete(room.id);
          if (prep.skipCallback) {
            prep.skipCallback();
            return;
          }
        }
      }
      let questions = room.quizBank?.questions ?? [];
      if (questions.length === 0) {
        questions = await getRoomQuestions(room.id);
        if (room.quizBank) {
          room.quizBank.questions = questions;
        }
      }
      if (questions.length === 0) {
        socket.emit("error", "Ph\xF2ng ch\u01B0a c\xF3 c\xE2u h\u1ECFi n\xE0o! Vui l\xF2ng ch\u1ECDn b\u1ED9 \u0111\u1EC1 c\xE2u h\u1ECFi tr\u01B0\u1EDBc khi b\u1EAFt \u0111\u1EA7u.");
        return;
      }
      if (room.status === "LOBBY") {
        roomUsedQuestions.delete(room.id);
        roomIntermissions.delete(room.id);
        if (roomIntermissionTimers.has(room.id)) {
          clearTimeout(roomIntermissionTimers.get(room.id));
          roomIntermissionTimers.delete(room.id);
        }
        const startEndsAt = Date.now() + 5e3;
        io2.to(`room:${room.code}`).emit("game:starting", { seconds: 5, endsAt: startEndsAt, total: 5 });
        roomPrepareStates.set(room.id, {
          type: "STARTING",
          questionIndex: 0,
          totalQuestions: 0,
          targetTimestamp: startEndsAt
        });
        room.currentQuestion = 0;
        room.status = "PLAYING";
        roomCache.set(room.id, room);
        await prisma.room.update({ where: { id: room.id }, data: { currentQuestion: 0, status: "PLAYING" } }).catch(console.error);
        ensureInitialTeamPowerups(room.id, io2).catch(console.error);
        const teams = await prisma.team.findMany({ where: { roomId: room.id }, orderBy: { createdAt: "asc" } });
        const config2 = room.config;
        const targetQCount = config2?.matchMaxQuestions && config2.matchMaxQuestions > 0 ? config2.matchMaxQuestions : void 0;
        const allocation = allocateQuestionsForMatch({
          questions,
          targetCount: targetQCount,
          mode: room.mode,
          teamsCount: teams.length,
          allocationStrategy: config2?.questionAllocationStrategy || "ORIGINAL_POINTS",
          options: {
            eliminationStages: config2?.eliminationRounds,
            bouncebackQuestionsPerTurn: config2?.bouncebackQuestionsPerTurn,
            tournamentQuestionsPerMatch: config2?.tournamentQuestionsPerMatch
          }
        });
        questions = allocation.allocatedQuestions;
        roomQuestionsCache.set(room.id, questions);
        if (room.quizBank) {
          room.quizBank.questions = questions;
        }
        if (allocation.derivedConfig) {
          Object.assign(config2, allocation.derivedConfig);
          room.config = config2;
          prisma.room.update({ where: { id: room.id }, data: { config: config2 } }).catch(console.error);
        }
        if (room.mode === "CLASSIC") {
          const goldSet = selectGoldQuestions(questions);
          roomGoldQuestions.set(room.id, goldSet);
        } else if (room.mode === "TOURNAMENT") {
          const questionsPerMatch = config2?.tournamentQuestionsPerMatch || 3;
          const matches = buildTournamentMatches(teams, questionsPerMatch);
          roomTournaments.set(room.id, {
            matches,
            currentMatchId: matches[0]?.id,
            questionsPerMatch
          });
        } else if (room.mode === "GRID_CARO") {
          const rows = config2?.gridRows || 4;
          const cols = config2?.gridCols || 4;
          const streakK = config2?.gridStreakTargetK || 3;
          const bonusPts = config2?.gridCaroBonusPoints || 30;
          const totalCells = rows * cols;
          const isCaroEligible = rows >= 4 && cols >= 4;
          const caroEnabled = isCaroEligible && config2?.gridCaroEnabled !== false && questions.length >= totalCells;
          const pointPalette = [10, 20, 30];
          const cells = [];
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const cellId = r * cols + c + 1;
              const pts = pointPalette[(r * cols + c) % pointPalette.length];
              const diff = pts === 10 ? "D\u1EC4" : pts === 20 ? "TRUNG B\xCCNH" : "KH\xD3";
              cells.push({
                id: cellId,
                row: r,
                col: c,
                points: pts,
                difficulty: diff,
                isCompleted: false,
                attemptCount: 0
              });
            }
          }
          const numTeams = Math.max(1, teams.length);
          const configuredRounds = config2?.gridRoundsPerTeam || 3;
          const maxPossibleRounds = Math.max(1, Math.floor(questions.length / numTeams));
          const maxRounds = Math.min(configuredRounds, maxPossibleRounds);
          const maxTurns = maxRounds * numTeams;
          const gridCaroState = {
            rows,
            cols,
            totalCells,
            cells,
            previewActive: false,
            previewRemaining: 0,
            currentTurnTeamId: teams[0]?.id,
            currentTurnTeamName: teams[0]?.name,
            currentRound: 1,
            maxRounds,
            turnsCompleted: 0,
            maxTurns,
            caroEnabled,
            streakTargetK: streakK,
            caroAchievedTeams: [],
            caroBonusPoints: bonusPts
          };
          roomGridCaros.set(room.id, gridCaroState);
        } else if (room.mode === "DICE_RACE") {
          const configuredTiles = config2?.diceTrackTotalTiles || 60;
          const totalTiles = Math.min(100, Math.max(60, configuredTiles));
          const tiles = generateBalancedDiceTiles(totalTiles);
          const teamPositions = {};
          for (const t of teams) {
            await prisma.team.update({
              where: { id: t.id },
              data: { score: 1 }
            }).catch(console.error);
            t.score = 1;
            teamPositions[t.id] = {
              teamId: t.id,
              teamName: t.name,
              teamColor: t.color,
              position: 0,
              hasFinished: false
            };
          }
          roomDiceRaces.set(room.id, {
            totalTiles,
            tiles,
            teamPositions,
            currentTurnTeamId: teams[0]?.id,
            currentTurnTeamName: teams[0]?.name,
            isRolling: false,
            dicePendingAnswer: false,
            finishLeaderboard: []
          });
        } else if (room.mode === "WAGER") {
          const initPoints = Math.max(30, config2?.wagerInitialPoints || 50);
          const bailoutMax = config2?.wagerBailoutLimit ?? 1;
          for (const team of teams) {
            await prisma.team.update({
              where: { id: team.id },
              data: { score: initPoints }
            });
            team.score = initPoints;
          }
          const teamBailouts = {};
          teams.forEach((t) => {
            teamBailouts[t.id] = { remaining: bailoutMax, max: bailoutMax };
          });
          roomWagers.set(room.id, {
            phase: "WAGER_PERIOD",
            wagerTimeRemaining: config2?.wagerTimeSeconds || 15,
            wagerTimeTotal: config2?.wagerTimeSeconds || 15,
            minWager: 5,
            currentHighestWager: 0,
            lastWagerTeamId: void 0,
            wagerHistory: [],
            allowanceMinScore: config2?.wagerMinAllowance || 50,
            initialPoints: initPoints,
            teamWagers: {},
            teamBailouts
          });
        } else if (room.mode === "MYSTERY_QUEST") {
          const turnsPerTeam = config2?.mysteryQuestTurnsPerTeam || 2;
          const fallbackTeam = { id: "t1", name: "\u0110\u1ED9i 1", color: "#ef4444", score: 0 };
          const activeTeams = teams.length > 0 ? teams : [fallbackTeam];
          const questState = generateMysteryStageForTurn({
            turnIndex: 0,
            currentTeam: activeTeams[0],
            teams: activeTeams,
            turnsPerTeam
          });
          roomMysteryQuests.set(room.id, questState);
        } else if (room.mode !== "DICE_RACE" && config2?.initialTeamScore && config2.initialTeamScore > 0) {
          const initScore = Math.max(0, config2.initialTeamScore);
          for (const team of teams) {
            if (team.score === 0) {
              await prisma.team.update({
                where: { id: team.id },
                data: { score: initScore }
              });
              team.score = initScore;
            }
          }
        }
        const updatedState = await buildRoomState(room.id);
        io2.to(`room:${room.code}`).emit("room:state", updatedState);
        if (room.mode === "MYSTERY_QUEST") {
          const questState = roomMysteryQuests.get(room.id);
          if (questState) {
            io2.to(`room:${room.code}`).emit("game:mystery:update", questState);
          }
        }
        if (room.mode === "GRID_CARO") {
          startGridCaroPreview(io2, room.id, room.code, config2?.gridPreviewDuration || 5);
          return;
        }
        if (room.mode === "DICE_RACE") {
          const diceState = roomDiceRaces.get(room.id);
          if (diceState) {
            io2.to(`room:${room.code}`).emit("game:dice:update", diceState);
          }
          return;
        }
        const launchWarmupToFirstQuestion = async () => {
          try {
            roomPrepareStates.delete(room.id);
            const firstRoundTargetPoints = room.mode === "MYSTERY_QUEST" || room.mode === "DICE_RACE" ? 10 : void 0;
            const nextQ2 = getNextUniqueQuestion(room.id, questions, 0, firstRoundTargetPoints);
            if (nextQ2) {
              const currentQIndex = nextQ2.index;
              room.currentQuestion = currentQIndex;
              room.status = "PLAYING";
              roomCache.set(room.id, room);
              await prisma.room.update({
                where: { id: room.id },
                data: { currentQuestion: currentQIndex, status: "PLAYING" }
              }).catch(console.error);
              await startQuestionPrepareAndLaunch(room, questions, nextQ2.index, nextQ2.question);
              const refreshedState = await buildRoomState(room.id);
              io2.to(`room:${room.code}`).emit("room:state", refreshedState);
              if (room.mode === "MYSTERY_QUEST") {
                const questState = roomMysteryQuests.get(room.id);
                if (questState) {
                  io2.to(`room:${room.code}`).emit("game:mystery:update", questState);
                }
              }
            } else {
              console.warn(`[launchWarmupToFirstQuestion] No next question available in room ${room.code}`);
            }
          } catch (err) {
            console.error("[launchWarmupToFirstQuestion] Error:", err);
          }
        };
        const remainingWarmupDelay = Math.max(0, startEndsAt - Date.now());
        const timer = setTimeout(() => {
          launchWarmupToFirstQuestion();
        }, remainingWarmupDelay);
        const targetStartingQuestions = getTargetTotalQuestions(
          room.mode,
          config2,
          teams.length,
          questions.length
        );
        roomPrepareStates.set(room.id, {
          type: "STARTING",
          questionIndex: 0,
          totalQuestions: targetStartingQuestions,
          targetTimestamp: startEndsAt,
          timer,
          skipCallback: launchWarmupToFirstQuestion
        });
        return;
      }
      if (room.mode === "GRID_CARO") {
        stopQuestionTimer(room.id);
        roomActiveQuestions.delete(room.id);
        roomRevealPayloads.delete(room.id);
        io2.to(`room:${room.code}`).emit("game:question:clear");
        await advanceGridToBoard(io2, room.id, room.code);
        return;
      }
      if (room.mode === "MYSTERY_QUEST") {
        stopQuestionTimer(room.id);
        roomActiveQuestions.delete(room.id);
        roomRevealPayloads.delete(room.id);
        io2.to(`room:${room.code}`).emit("game:question:clear");
        const questState = roomMysteryQuests.get(room.id);
        if (questState) {
          await executeMysteryAdvanceTurn(room, questState);
        }
        return;
      }
      if (room.mode === "DICE_RACE") {
        stopQuestionTimer(room.id);
        roomActiveQuestions.delete(room.id);
        roomRevealPayloads.delete(room.id);
        io2.to(`room:${room.code}`).emit("game:question:clear");
        const diceState = roomDiceRaces.get(room.id);
        if (diceState) {
          const allFinished = Object.values(diceState.teamPositions).every((p) => p.hasFinished);
          if (allFinished) {
            const ended = await safelyFinishGame({ io: io2, room, questions });
            if (!ended) return;
            return;
          }
          io2.to(`room:${room.code}`).emit("game:dice:update", diceState);
        }
        return;
      }
      if (roomIntermissions.has(room.id)) {
        if (roomIntermissionTimers.has(room.id)) {
          clearTimeout(roomIntermissionTimers.get(room.id));
          roomIntermissionTimers.delete(room.id);
        }
        const interPayload = roomIntermissions.get(room.id);
        roomIntermissions.delete(room.id);
        io2.to(`room:${room.code}`).emit("game:intermission", null);
        const nextIndex2 = interPayload.nextQuestionIndex;
        room.currentQuestion = nextIndex2;
        room.status = "PLAYING";
        roomCache.set(room.id, room);
        await prisma.room.update({ where: { id: room.id }, data: { currentQuestion: nextIndex2, status: "PLAYING" } }).catch(console.error);
        if (nextIndex2 > 0 && nextIndex2 % 3 === 0) {
          replenishTeamPowerups(room.id, io2).catch(console.error);
        }
        const candidateQ = questions[nextIndex2] || (await getRoomQuestions(room.id))[nextIndex2];
        await startQuestionPrepareAndLaunch(room, questions, nextIndex2, candidateQ);
        return;
      }
      const config = room.config;
      const targetQuestions = getTargetTotalQuestions(
        room.mode,
        config,
        await prisma.team.count({ where: { roomId: room.id } }) || 4,
        questions.length
      );
      const usedCount = roomUsedQuestions.get(room.id)?.size ?? 0;
      if (usedCount >= targetQuestions) {
        stopQuestionTimer(room.id);
        const ended = await safelyFinishGame({ io: io2, room, questions });
        if (!ended) return;
        return;
      }
      const nextQ = getNextUniqueQuestion(room.id, questions);
      if (!nextQ) {
        stopQuestionTimer(room.id);
        const ended = await safelyFinishGame({ io: io2, room, questions });
        if (!ended) return;
        return;
      }
      const nextIndex = nextQ.index;
      stopQuestionTimer(room.id);
      roomActiveQuestions.delete(room.id);
      roomRevealPayloads.delete(room.id);
      const intermissionPayload = {
        nextQuestionIndex: nextIndex,
        totalQuestions: targetQuestions,
        previousQuestionIndex: room.currentQuestion,
        titleVi: `B\u1EA2NG X\u1EBEP H\u1EA0NG SAU C\xC2U #${(room.currentQuestion ?? 0) + 1}`,
        countdownSeconds: 3
      };
      roomIntermissions.set(room.id, intermissionPayload);
      io2.to(`room:${room.code}`).emit("game:intermission", intermissionPayload);
      io2.to(`room:${room.code}`).emit("game:question:clear");
      if (roomIntermissionTimers.has(room.id)) {
        clearTimeout(roomIntermissionTimers.get(room.id));
      }
      const autoTimer = setTimeout(async () => {
        if (!roomIntermissions.has(room.id)) return;
        roomIntermissions.delete(room.id);
        roomIntermissionTimers.delete(room.id);
        io2.to(`room:${room.code}`).emit("game:intermission", null);
        room.currentQuestion = nextIndex;
        room.status = "PLAYING";
        roomCache.set(room.id, room);
        await prisma.room.update({ where: { id: room.id }, data: { currentQuestion: nextIndex, status: "PLAYING" } }).catch(console.error);
        if (nextIndex > 0 && nextIndex % 3 === 0) {
          replenishTeamPowerups(room.id, io2).catch(console.error);
        }
        await startQuestionPrepareAndLaunch(room, questions, nextIndex, nextQ.question);
      }, 3e3);
      roomIntermissionTimers.set(room.id, autoTimer);
    });
    socket.on("admin:skip:prepare", async (payload) => {
      const room = await getAdminRoom(socket, payload?.code);
      if (!room) return;
      if (roomPrepareStates.has(room.id)) {
        const prep = roomPrepareStates.get(room.id);
        if (prep) {
          if (prep.timer) clearTimeout(prep.timer);
          roomPrepareStates.delete(room.id);
          if (prep.skipCallback) {
            prep.skipCallback();
          }
        }
      }
    });
    socket.on("admin:pause", async (payload) => {
      const room = await getAdminRoom(socket, payload?.code);
      if (!room) return;
      const timerKey = `${room.id}:timer`;
      if (roomTimers.has(timerKey)) {
        clearInterval(roomTimers.get(timerKey));
        roomTimers.delete(timerKey);
      }
      roomTimerEndsAt.delete(room.id);
      if (roomPrepareStates.has(room.id)) {
        const prep = roomPrepareStates.get(room.id);
        if (prep) {
          if (prep.timer) {
            clearTimeout(prep.timer);
            prep.timer = void 0;
          }
          prep.remainingMs = Math.max(500, prep.targetTimestamp - Date.now());
        }
      }
      if (roomIntermissionTimers.has(room.id)) {
        clearTimeout(roomIntermissionTimers.get(room.id));
        roomIntermissionTimers.delete(room.id);
      }
      room.status = "PAUSED";
      roomCache.set(room.id, room);
      await prisma.room.update({ where: { id: room.id }, data: { status: "PAUSED" } }).catch(console.error);
      io2.to(`room:${room.code}`).emit("game:paused");
      const state = await buildRoomState(room.id);
      io2.to(`room:${room.code}`).emit("room:state", state);
    });
    socket.on("admin:resume", async (payload) => {
      const room = await getAdminRoom(socket, payload?.code);
      if (!room) return;
      room.status = "PLAYING";
      roomCache.set(room.id, room);
      await prisma.room.update({ where: { id: room.id }, data: { status: "PLAYING" } }).catch(console.error);
      if (roomPrepareStates.has(room.id)) {
        const prep = roomPrepareStates.get(room.id);
        const remainingMs = prep.remainingMs || 3e3;
        prep.targetTimestamp = Date.now() + remainingMs;
        prep.remainingMs = void 0;
        prep.timer = setTimeout(() => {
          if (prep.skipCallback) {
            prep.skipCallback();
          }
        }, remainingMs);
        const remainingSec = Math.max(1, Math.ceil(remainingMs / 1e3));
        if (prep.type === "STARTING") {
          io2.to(`room:${room.code}`).emit("game:starting", { seconds: remainingSec, endsAt: prep.targetTimestamp, total: prep.totalQuestions || 5 });
        } else if (prep.type === "PREPARE" && prep.preparePayload) {
          io2.to(`room:${room.code}`).emit("game:prepare", { ...prep.preparePayload, seconds: remainingSec, endsAt: prep.targetTimestamp });
        }
      } else {
        const timerKey = `${room.id}:timer`;
        const activeQ = roomActiveQuestions.get(room.id);
        const qKey = activeQ ? `${room.id}:${activeQ.question.id}` : null;
        if (activeQ && qKey && !roomQuestionProcessed.has(qKey)) {
          const remainingSec = Math.max(1, roomRemainingTimes.get(timerKey) ?? activeQ.question.timeLimit ?? 15);
          startQuestionTimer(io2, room.code, room.id, activeQ.question.id, remainingSec);
          io2.to(`room:${room.code}`).emit("game:timer:started");
        }
      }
      io2.to(`room:${room.code}`).emit("game:resumed");
      const state = await buildRoomState(room.id);
      io2.to(`room:${room.code}`).emit("room:state", state);
    });
    socket.on("admin:reveal", async (payload) => {
      const room = await getAdminRoom(socket, payload?.code);
      if (!room) {
        console.warn(`[admin:reveal] Unable to find admin room for socket ${socket.id}, payload:`, payload);
        return;
      }
      const activeQ = roomActiveQuestions.get(room.id);
      const rawQuestions = room.quizBank?.questions ?? [];
      const q = (activeQ ? rawQuestions.find((item) => item.id === activeQ.question.id) : null) || rawQuestions[room.currentQuestion];
      if (!q) return;
      stopQuestionTimer(room.id);
      const qKey = `${room.id}:${q.id}`;
      if (room.mode === "BOUNCEBACK") {
        if (roomStealBuzzed.has(qKey)) {
          await finalizeBouncebackSteal(io2, room.id, room.code, q.id);
        } else if (roomPrimaryTeams.has(qKey)) {
          const correct = await finalizeBouncebackPrimary(io2, room.id, room.code, q.id);
          if (!correct) {
            await revealCurrentAnswer(io2, room.id, room.code, q.id);
          }
        } else {
          await revealCurrentAnswer(io2, room.id, room.code, q.id);
        }
      } else if (room.mode === "BUZZ") {
        if (roomBuzzFirst.has(qKey)) {
          await finalizeBuzzAnswer(io2, room.id, room.code, q.id);
        } else {
          await revealCurrentAnswer(io2, room.id, room.code, q.id);
        }
      } else if (room.mode === "TOURNAMENT") {
        await finalizeTournamentQuestion(io2, room.id, room.code, q.id);
      } else if (room.mode === "GRID_CARO") {
        await finalizeGridCaroQuestion(io2, room.id, room.code, q.id);
      } else if (room.mode === "DICE_RACE") {
        await finalizeDiceRaceQuestion(io2, room.id, room.code, q.id);
      } else if (room.mode === "WAGER") {
        await finalizeWagerQuestion(io2, room.id, room.code, q.id);
      } else {
        if (room.teamMode !== "TEAM") {
          await finalizeIndividualScores(io2, room.id, room.code, q.id);
        }
        await revealCurrentAnswer(io2, room.id, room.code, q.id);
      }
    });
    socket.on("admin:score:manual", async ({ answerId, points }) => {
      const room = await getAdminRoom(socket);
      if (!room) return;
      const answer = await prisma.answer.update({
        where: { id: answerId },
        data: { isCorrect: points > 0, pointsAwarded: points }
      });
      if (answer.playerId) {
        const pRes = await applyScoreDeltaToPlayer(answer.playerId, points);
        io2.to(`room:${room.code}`).emit("game:score:update", [
          { playerId: answer.playerId, score: pRes.newScore, delta: pRes.effectiveDelta }
        ]);
      }
      if (answer.teamId) {
        const tRes = await applyScoreDeltaToTeam(answer.teamId, points);
        io2.to(`room:${room.code}`).emit("game:score:update", [
          { teamId: answer.teamId, score: tRes.newScore, delta: tRes.effectiveDelta }
        ]);
      }
    });
    socket.on("admin:answer:override_verdict", async ({
      questionId,
      teamId,
      playerId,
      answerId,
      isCorrect,
      code
    }) => {
      const room = await getAdminRoom(socket, code);
      if (!room) return;
      const qKey = `${room.id}:${questionId}`;
      let answer = answerId ? await prisma.answer.findUnique({ where: { id: answerId } }) : null;
      if (!answer && questionId) {
        answer = await prisma.answer.findFirst({
          where: {
            roomId: room.id,
            questionId,
            ...teamId ? { teamId } : playerId ? { playerId } : {}
          },
          orderBy: { submittedAt: "desc" }
        });
      }
      const dbQuestion = await prisma.question.findUnique({ where: { id: questionId } });
      const rawQ = await getResolvedQuestion(room.id, questionId, dbQuestion) || room.quizBank?.questions?.find((q) => q.id === questionId);
      const basePts = normalizeToThreeLevels(rawQ?.points || 10);
      const prevAwarded = answer?.pointsAwarded ?? 0;
      let newAwarded = isCorrect ? basePts : 0;
      const targetTid = teamId || answer?.teamId;
      const targetPid = playerId || answer?.playerId;
      if (!answer && (targetTid || targetPid)) {
        answer = await prisma.answer.create({
          data: {
            roomId: room.id,
            questionId,
            teamId: targetTid || null,
            playerId: targetPid || null,
            answer: "MC_OVERRIDE",
            isCorrect,
            pointsAwarded: newAwarded,
            timeSpent: 0
          }
        }).catch(() => null);
      }
      if (room.mode === "MYSTERY_QUEST") {
        const questState = roomMysteryQuests.get(room.id);
        if (questState && questState.currentTurnTeamId === targetTid) {
          if (isCorrect) {
            newAwarded = basePts;
            questState.phase = "DECISION_CHOICE";
            questState.baseQuestionPoints = basePts;
            questState.potPoints = basePts;
            questState.potMultiplier = 1;
            questState.turnFinishedReason = void 0;
            questState.storyResult = void 0;
            questState.decisionMade = void 0;
            const allTeams = await prisma.team.findMany({ where: { roomId: room.id } });
            synchronizeMysteryStageWithQuestionPoints({
              state: questState,
              questionPoints: basePts,
              theme: questState.theme,
              teams: allTeams
            });
          } else {
            newAwarded = 0;
            questState.phase = "TURN_SUMMARY";
            questState.turnFinishedReason = "QUESTION_FAILED";
            questState.potPoints = 0;
            questState.decisionMade = void 0;
            questState.storyResult = {
              teamId: questState.currentTurnTeamId,
              teamName: questState.currentTurnTeamName,
              teamColor: questState.currentTurnTeamColor,
              rewardText: "MC can thi\u1EC7p ch\u1EA5m l\u1EA1i: Kh\xF4ng ch\xEDnh x\xE1c. L\u01B0\u1EE3t thi k\u1EBFt th\xFAc v\u1EDBi 0 \u0111i\u1EC3m t\xEDch l\u0169y.",
              scoreDelta: 0,
              oldScore: 0,
              newScore: 0
            };
          }
          roomMysteryQuests.set(room.id, questState);
          io2.to(`room:${room.code}`).emit("game:mystery:update", questState);
        }
      }
      if (room.mode === "GRID_CARO") {
        const gridState = roomGridCaros.get(room.id);
        if (gridState) {
          const cell = gridState.selectedCellId ? gridState.cells.find((c) => c.id === gridState.selectedCellId) : null;
          if (cell && gridState.currentTurnTeamId === targetTid) {
            if (isCorrect && targetTid) {
              cell.isCompleted = true;
              cell.claimedByTeamId = targetTid;
              const tObj = await prisma.team.findUnique({ where: { id: targetTid } });
              cell.claimedByTeamName = tObj?.name;
              cell.claimedByTeamColor = tObj?.color;
              let awardedPoints = cell.points;
              if (gridState.caroEnabled && tObj) {
                const winningStreak = checkGridCaroStreak(
                  gridState.cells,
                  gridState.rows,
                  gridState.cols,
                  targetTid,
                  gridState.streakTargetK
                );
                if (winningStreak && winningStreak.length > 0 && !gridState.caroAchievedTeams.includes(tObj.name)) {
                  const streakPtsSum = winningStreak.reduce((acc, c) => acc + c.points, 0);
                  const avgPts = streakPtsSum / winningStreak.length;
                  const dynamicBonus = Math.max(10, Math.round(avgPts / 5) * 5);
                  gridState.caroAchievedTeams.push(tObj.name);
                  awardedPoints += dynamicBonus;
                  io2.to(`room:${room.code}`).emit("game:grid:caro:celebrate", {
                    teamId: targetTid,
                    teamName: tObj.name,
                    bonusPoints: dynamicBonus
                  });
                }
              }
              newAwarded = awardedPoints;
            } else {
              cell.isCompleted = false;
              cell.claimedByTeamId = void 0;
              cell.claimedByTeamName = void 0;
              cell.claimedByTeamColor = void 0;
              newAwarded = 0;
            }
            roomGridCaros.set(room.id, gridState);
            io2.to(`room:${room.code}`).emit("game:grid:update", gridState);
          }
        }
      }
      if (room.mode === "DICE_RACE") {
        const diceState = roomDiceRaces.get(room.id);
        if (diceState && diceState.currentTurnTeamId === targetTid) {
          diceState.canRollDice = isCorrect;
          diceState.dicePendingAnswer = false;
          newAwarded = 0;
          roomDiceRaces.set(room.id, diceState);
          io2.to(`room:${room.code}`).emit("game:dice:update", diceState);
        }
      }
      if (room.mode === "WAGER") {
        const wagerState = roomWagers.get(room.id);
        if (wagerState && targetTid) {
          const wAmount = wagerState.teamWagers?.[targetTid]?.amount || 10;
          const wagerMult = wagerState.wagerMultiplierCap || 2.5;
          newAwarded = isCorrect ? Math.round(wAmount * wagerMult) : -wAmount;
          io2.to(`room:${room.code}`).emit("game:wager:update", wagerState);
        }
      }
      if (room.mode === "BOUNCEBACK") {
        const primary = roomPrimaryTeams.get(qKey);
        if (primary && primary.teamId === targetTid && isCorrect) {
          roomStealBuzzed.delete(qKey);
          roomStealPhase.delete(qKey);
        }
      }
      if (answer) {
        await prisma.answer.update({
          where: { id: answer.id },
          data: { isCorrect, pointsAwarded: newAwarded }
        }).catch(console.error);
      }
      const netDelta = newAwarded - prevAwarded;
      if (netDelta !== 0 && targetTid) {
        const tRes = await applyScoreDeltaToTeam(targetTid, netDelta);
        io2.to(`room:${room.code}`).emit("game:score:update", [
          { teamId: targetTid, score: tRes.newScore, delta: tRes.effectiveDelta }
        ]);
      } else if (netDelta !== 0 && targetPid) {
        const pRes = await applyScoreDeltaToPlayer(targetPid, netDelta);
        io2.to(`room:${room.code}`).emit("game:score:update", [
          { playerId: targetPid, score: pRes.newScore, delta: pRes.effectiveDelta }
        ]);
      }
      let rev = roomRevealPayloads.get(room.id);
      if (rev && rev.answers) {
        const existingIdx = rev.answers.findIndex(
          (a) => targetTid && a.teamId === targetTid || targetPid && a.playerId === targetPid || answer?.id && a.id === answer.id
        );
        if (existingIdx >= 0) {
          rev.answers[existingIdx].isCorrect = isCorrect;
          rev.answers[existingIdx].pointsAwarded = newAwarded;
        } else {
          const tObj = targetTid ? await prisma.team.findUnique({ where: { id: targetTid } }) : null;
          rev.answers.push({
            id: answer?.id,
            teamId: targetTid || null,
            teamName: tObj?.name || "\u0110\u1ED9i",
            playerId: targetPid || null,
            playerName: tObj?.name || "Th\xED sinh",
            answer: answer?.answer || "(MC duy\u1EC7t \u0111\xFAng)",
            isCorrect,
            pointsAwarded: newAwarded,
            timeSpent: 0
          });
        }
        roomRevealPayloads.set(room.id, rev);
        io2.to(`room:${room.code}`).emit("game:answer:reveal", rev);
      }
      await persistGameStateSnapshot(room.id);
      const refreshedState = await buildRoomState(room.id);
      io2.to(`room:${room.code}`).emit("room:state", refreshedState);
    });
    socket.on("admin:shuffle:cards", async () => {
      const room = await getAdminRoom(socket);
      if (!room) return;
      const state = await buildRoomState(room.id);
      io2.to(`room:${room.code}`).emit("room:state", state);
    });
    socket.on("admin:lock:cards", async (locked) => {
      const room = await getAdminRoom(socket);
      if (!room) return;
      const config = room.config;
      await prisma.room.update({
        where: { id: room.id },
        data: { config: { ...config, cardsLocked: locked } }
      });
      const state = await buildRoomState(room.id);
      io2.to(`room:${room.code}`).emit("room:state", state);
    });
    socket.on("admin:buzz:clear", async () => {
      const room = await getAdminRoom(socket);
      if (!room) return;
      io2.to(`room:${room.code}`).emit("game:buzz:closed");
    });
    socket.on("admin:kick:player", async ({ playerId }, callback) => {
      try {
        const room = await getAdminRoom(socket);
        if (!room) {
          callback?.({ success: false, error: "Kh\xF4ng c\xF3 quy\u1EC1n Admin" });
          return;
        }
        const playerToKick = await prisma.player.findFirst({
          where: { id: playerId, roomId: room.id }
        });
        if (!playerToKick) {
          callback?.({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y ng\u01B0\u1EDDi ch\u01A1i" });
          return;
        }
        await prisma.player.delete({ where: { id: playerId } });
        if (playerToKick.socketId) {
          const clientSock = io2.sockets.sockets.get(playerToKick.socketId);
          if (clientSock) {
            clientSock.emit("error", "B\u1EA1n \u0111\xE3 b\u1ECB ch\u1EE7 ph\xF2ng m\u1EDDi ra kh\u1ECFi ph\xF2ng.");
            clientSock.disconnect(true);
          }
          playerSockets.delete(playerToKick.socketId);
        }
        const state = await buildRoomState(room.id);
        io2.to(`room:${room.code}`).emit("room:state", state);
        callback?.({ success: true });
      } catch (err) {
        console.error("[admin:kick:player]", err);
        callback?.({ success: false, error: "L\u1ED7i khi xo\xE1 ng\u01B0\u1EDDi ch\u01A1i" });
      }
    });
    socket.on("admin:clean:offline", async (callback) => {
      try {
        const room = await getAdminRoom(socket);
        if (!room) {
          callback?.({ success: false, error: "Kh\xF4ng c\xF3 quy\u1EC1n Admin" });
          return;
        }
        const offlineCandidates = await prisma.player.findMany({
          where: {
            roomId: room.id,
            socketId: null,
            isHost: false
          }
        });
        const toDeleteIds = offlineCandidates.filter((p) => !pendingDisconnects.has(p.id)).map((p) => p.id);
        let count = 0;
        if (toDeleteIds.length > 0) {
          const result = await prisma.player.deleteMany({
            where: { id: { in: toDeleteIds } }
          });
          count = result.count;
        }
        const state = await buildRoomState(room.id);
        io2.to(`room:${room.code}`).emit("room:state", state);
        callback?.({ success: true, count });
      } catch (err) {
        console.error("[admin:clean:offline]", err);
        callback?.({ success: false, error: "L\u1ED7i khi d\u1ECDn d\u1EB9p th\xED sinh offline" });
      }
    });
    async function handleGridCellSelect(room, cellId) {
      const gridState = roomGridCaros.get(room.id);
      if (!gridState || gridState.selectedCellId || roomPrepareStates.has(room.id)) {
        if (gridState) io2.to(`room:${room.code}`).emit("game:grid:update", gridState);
        return;
      }
      const cell = gridState.cells.find((c) => c.id === cellId);
      if (!cell || cell.isCompleted) {
        io2.to(`room:${room.code}`).emit("game:grid:update", gridState);
        return;
      }
      const autoAdvanceKey = `${room.id}:auto_advance`;
      if (roomGridTimers.has(autoAdvanceKey)) {
        clearInterval(roomGridTimers.get(autoAdvanceKey));
        roomGridTimers.delete(autoAdvanceKey);
      }
      gridState.autoAdvanceSeconds = void 0;
      gridState.selectedCellId = cellId;
      gridState.selectedCellAnimation = true;
      gridState.questionReady = false;
      const currentTeam = room.teams?.find((t) => t.id === gridState.currentTurnTeamId);
      gridState.selectedCellInfo = {
        cellId: cell.id,
        points: cell.points,
        difficulty: cell.difficulty,
        teamId: gridState.currentTurnTeamId,
        teamName: currentTeam?.name || gridState.currentTurnTeamName || "Th\xED sinh",
        teamColor: currentTeam?.color
      };
      io2.to(`room:${room.code}`).emit("game:grid:update", gridState);
      let usedSet = roomUsedQuestions.get(room.id);
      if (!usedSet) {
        usedSet = /* @__PURE__ */ new Set();
        roomUsedQuestions.set(room.id, usedSet);
      }
      const rawQuestions = room.quizBank?.questions ?? [];
      let targetQ = rawQuestions.find((q) => !usedSet.has(q.id) && normalizeToThreeLevels(q.points) === cell.points);
      if (!targetQ) {
        targetQ = rawQuestions.find((q) => !usedSet.has(q.id));
      }
      if (!targetQ) {
        gridState.selectedCellAnimation = false;
        io2.to(`room:${room.code}`).emit("game:grid:update", gridState);
        const ended = await safelyFinishGame({ io: io2, room, questions: rawQuestions });
        if (!ended) return;
        return;
      }
      usedSet.add(targetQ.id);
      targetQ.points = cell.points;
      cell.questionId = targetQ.id;
      const qIndex = rawQuestions.findIndex((q) => q.id === targetQ.id);
      room.currentQuestion = qIndex >= 0 ? qIndex : 0;
      await prisma.room.update({
        where: { id: room.id },
        data: { currentQuestion: room.currentQuestion }
      }).catch(console.error);
      roomCache.delete(room.id);
      setTimeout(() => {
        gridState.selectedCellAnimation = false;
        io2.to(`room:${room.code}`).emit("game:grid:update", gridState);
      }, 1500);
    }
    socket.on("game:grid:select", async ({ cellId }) => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: { include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } } } }
      });
      if (!player || !player.room || player.room.mode !== "GRID_CARO" || player.room.status !== "PLAYING") return;
      const gridState = roomGridCaros.get(player.room.id);
      if (!gridState) return;
      if (gridState.currentTurnTeamId === player.teamId) {
        await handleGridCellSelect(player.room, cellId);
      } else {
        socket.emit("error", "Ch\u01B0a t\u1EDBi l\u01B0\u1EE3t ch\u1ECDn \xF4 c\u1EE7a \u0111\u1ED9i b\u1EA1n!");
        socket.emit("game:grid:update", gridState);
      }
    });
    async function executeDiceRoll(room, diceState, teamId) {
      const teamProg = diceState.teamPositions[teamId];
      if (!teamProg) return;
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const roll = d1 + d2;
      diceState.lastDiceRoll = roll;
      diceState.lastDiceValues = [d1, d2];
      diceState.rollTimestamp = Date.now();
      const landingResult = handleDiceRaceLanding({ diceState, teamId, roll });
      const newPos = landingResult.finalPosition;
      const grantAnotherRoll = landingResult.grantAnotherRoll;
      teamProg.position = newPos;
      teamProg.hasShield = landingResult.hasShield;
      const newScore = newPos + 1;
      await prisma.team.update({
        where: { id: teamId },
        data: { score: newScore }
      }).catch(console.error);
      io2.to(`room:${room.code}`).emit("game:score:update", [{ teamId, score: newScore, delta: roll }]);
      io2.to(`room:${room.code}`).emit("game:dice:rolled", {
        teamId,
        teamName: teamProg.teamName,
        roll,
        diceValues: [d1, d2]
      });
      if (landingResult.effectMessage) {
        console.log(`[DiceRace] ${teamProg.teamName}: ${landingResult.effectMessage}`);
      }
      if (newPos >= diceState.totalTiles - 1 && !teamProg.hasFinished) {
        teamProg.hasFinished = true;
        if (!diceState.finishLeaderboard.includes(teamProg.teamName)) {
          diceState.finishLeaderboard.push(teamProg.teamName);
        }
        teamProg.finishRank = diceState.finishLeaderboard.length;
        io2.to(`room:${room.code}`).emit("game:dice:update", diceState);
        await prisma.room.update({ where: { id: room.id }, data: { status: "FINISHED", endedAt: /* @__PURE__ */ new Date() } });
        const leaderboard = await buildLeaderboard(room.id);
        io2.to(`room:${room.code}`).emit("game:ended", { leaderboard });
        setTimeout(() => cleanupRoomInMemory(room.id), 5e3);
        return;
      }
      if (grantAnotherRoll) {
        diceState.canRollDice = true;
        diceState.dicePendingAnswer = false;
        diceState.extraRollGranted = true;
        teamProg.extraRollGranted = true;
      } else {
        diceState.extraRollGranted = false;
        teamProg.extraRollGranted = false;
        diceState.dicePendingAnswer = false;
        const teams = await prisma.team.findMany({ where: { roomId: room.id }, orderBy: { createdAt: "asc" } });
        if (teams.length > 0) {
          const curIdx = teams.findIndex((t) => t.id === teamId);
          const nextIdx = (curIdx + 1) % teams.length;
          diceState.currentTurnTeamId = teams[nextIdx].id;
          diceState.currentTurnTeamName = teams[nextIdx].name;
        }
        diceState.canRollDice = false;
      }
      io2.to(`room:${room.code}`).emit("game:dice:update", diceState);
    }
    socket.on("game:dice:roll", async () => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: true }
      });
      if (!player || !player.room || !player.teamId) return;
      const room = player.room;
      if (room.mode !== "DICE_RACE" || room.status !== "PLAYING") return;
      const diceState = roomDiceRaces.get(room.id);
      if (!diceState || !diceState.canRollDice) {
        socket.emit("error", "Ch\u01B0a \u0111\u01B0\u1EE3c ph\xE9p gieo x\xFAc x\u1EAFc ho\u1EB7c b\u1EA1n ch\u01B0a tr\u1EA3 l\u1EDDi \u0111\xFAng c\xE2u h\u1ECFi!");
        if (diceState) socket.emit("game:dice:update", diceState);
        return;
      }
      if (diceState.currentTurnTeamId !== player.teamId) {
        socket.emit("error", "Ch\u01B0a t\u1EDBi l\u01B0\u1EE3t tung x\xFAc x\u1EAFc c\u1EE7a \u0111\u1ED9i b\u1EA1n!");
        socket.emit("game:dice:update", diceState);
        return;
      }
      if (roomActiveQuestions.has(room.id)) {
        roomActiveQuestions.delete(room.id);
        io2.to(`room:${room.code}`).emit("game:question:clear");
        io2.to(`room:${room.code}`).emit("game:dice:update", diceState);
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
      await executeDiceRoll(room, diceState, player.teamId);
    });
    socket.on("game:wager:submit", async ({ amount }) => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: true }
      });
      if (!player || !player.room || !player.teamId) return;
      const room = player.room;
      if (room.mode !== "WAGER" || room.status !== "PLAYING") return;
      const wagerState = roomWagers.get(room.id);
      if (!wagerState || wagerState.phase !== "WAGER_PERIOD") return;
      const team = await prisma.team.findUnique({ where: { id: player.teamId } });
      if (!team) return;
      if (wagerState.previousQuestionWagerTeamId && team.id === wagerState.previousQuestionWagerTeamId) {
        socket.emit("error", "\u0110\u1ED9i b\u1EA1n \u0111\xE3 \u0111\u1EB7t c\u01B0\u1EE3c \u1EDF c\xE2u h\u1ECFi tr\u01B0\u1EDBc! Theo lu\u1EADt c\xF4ng b\u1EB1ng, \u0111\u1ED9i b\u1EA1n t\u1EA1m ngh\u1EC9 c\u01B0\u1EE3c c\xE2u n\xE0y \u0111\u1EC3 nh\u01B0\u1EDDng c\xE1c \u0111\u1ED9i kh\xE1c.");
        socket.emit("game:wager:update", wagerState);
        return;
      }
      const isAutoAssignedFirstBid = wagerState.autoAssignedTeamId === team.id;
      if (wagerState.lastWagerTeamId === team.id && !isAutoAssignedFirstBid) {
        socket.emit("error", "\u0110\u1ED9i b\u1EA1n v\u1EEBa \u0111\u1EB7t c\u01B0\u1EE3c! Kh\xF4ng \u0111\u01B0\u1EE3c c\u01B0\u1EE3c 2 l\u1EA7n li\xEAn ti\u1EBFp, vui l\xF2ng ch\u1EDD \u0111\u1ED9i kh\xE1c c\u01B0\u1EE3c tr\u01B0\u1EDBc.");
        socket.emit("game:wager:update", wagerState);
        return;
      }
      if (amount > team.score) {
        socket.emit("error", `Kh\xF4ng \u0111\u01B0\u1EE3c c\u01B0\u1EE3c s\u1ED1 \u0111i\u1EC3m (${amount}\u0111) v\u01B0\u1EE3t qu\xE1 \u0111i\u1EC3m hi\u1EC7n t\u1EA1i c\u1EE7a \u0111\u1ED9i b\u1EA1n (${team.score}\u0111)!`);
        socket.emit("game:wager:update", wagerState);
        return;
      }
      if (wagerState.maxBetCap && amount > wagerState.maxBetCap) {
        socket.emit("error", `Kh\xF4ng \u0111\u01B0\u1EE3c c\u01B0\u1EE3c s\u1ED1 \u0111i\u1EC3m (${amount}\u0111) v\u01B0\u1EE3t qu\xE1 tr\u1EA7n c\u01B0\u1EE3c t\u1ED1i \u0111a (${wagerState.maxBetCap}\u0111) c\u1EE7a c\xE2u h\u1ECFi n\xE0y!`);
        socket.emit("game:wager:update", wagerState);
        return;
      }
      const currentHighest = wagerState.currentHighestWager || 0;
      const minOption = currentHighest + 5;
      const maxOption = currentHighest + 60;
      const isValidStep = (amount - currentHighest) % 5 === 0;
      if (amount < minOption || amount > maxOption || !isValidStep) {
        socket.emit("error", `M\u1EE9c c\u01B0\u1EE3c kh\xF4ng h\u1EE3p l\u1EC7. Vui l\xF2ng ch\u1ECDn 1 trong 12 \xF4 c\u01B0\u1EE3c t\u1EEB ${minOption}\u0111 \u0111\u1EBFn ${maxOption}\u0111.`);
        socket.emit("game:wager:update", wagerState);
        return;
      }
      if (team.score < minOption) {
        socket.emit("error", `M\u1EE9c c\u01B0\u1EE3c t\u1ED1i thi\u1EC3u (${minOption}\u0111) \u0111\xE3 v\u01B0\u1EE3t qu\xE1 \u0111i\u1EC3m \u0111\u1ED9i b\u1EA1n (${team.score}\u0111). \u0110\u1ED9i b\u1EA1n \u0111\xE3 m\u1EA5t quy\u1EC1n c\u01B0\u1EE3c trong c\xE2u h\u1ECFi n\xE0y!`);
        socket.emit("game:wager:update", wagerState);
        return;
      }
      wagerState.currentHighestWager = amount;
      wagerState.lastWagerTeamId = team.id;
      if (isAutoAssignedFirstBid) {
        wagerState.autoAssignedTeamId = void 0;
      }
      if (!wagerState.wagerHistory) wagerState.wagerHistory = [];
      const order = wagerState.wagerHistory.length + 1;
      wagerState.wagerHistory.push({
        order,
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color,
        amount,
        timestamp: Date.now()
      });
      wagerState.teamWagers[team.id] = {
        teamId: team.id,
        teamName: team.name,
        amount,
        submitted: true,
        order
      };
      const allTeams = await prisma.team.findMany({ where: { roomId: room.id } });
      const nextMinOption = amount + 5;
      allTeams.forEach((t) => {
        if (!wagerState.teamWagers[t.id]?.submitted && t.score < nextMinOption) {
          wagerState.teamWagers[t.id] = {
            teamId: t.id,
            teamName: t.name,
            amount: 0,
            submitted: false,
            disqualified: true
          };
        }
      });
      const canAnyTeamBet = checkCanAnyTeamBet(allTeams, wagerState, nextMinOption);
      if (!canAnyTeamBet) {
        await lockWagerAndScheduleAutoLaunch(io2, room.id, room.code, wagerState);
        return;
      }
      const wasInitial5s = wagerState.wagerSubPhase === "INITIAL_5S";
      if (wasInitial5s) {
        const wagerDuration = room.config?.wagerTimeSeconds || 15;
        startWager15sCountdown(io2, room.id, room.code, wagerDuration);
      } else {
        io2.to(`room:${room.code}`).emit("game:wager:update", wagerState);
      }
    });
    socket.on("admin:grid:preview:start", async () => {
      const room = await getAdminRoom(socket);
      if (!room || room.mode !== "GRID_CARO") return;
      const duration = room.config?.gridPreviewDuration || 5;
      startGridCaroPreview(io2, room.id, room.code, duration);
    });
    socket.on("admin:grid:preview:stop", async () => {
      const room = await getAdminRoom(socket);
      if (!room || room.mode !== "GRID_CARO") return;
      stopGridCaroPreview(io2, room.id, room.code);
    });
    socket.on("admin:grid:select:manual", async ({ cellId }) => {
      const room = await getAdminRoom(socket);
      if (!room || room.mode !== "GRID_CARO" || room.status !== "PLAYING") return;
      await handleGridCellSelect(room, cellId);
    });
    socket.on("admin:grid:launch_question", async () => {
      const room = await getAdminRoom(socket);
      if (!room || room.mode !== "GRID_CARO" || room.status !== "PLAYING") return;
      const gridState = roomGridCaros.get(room.id);
      if (!gridState || !gridState.selectedCellId) return;
      const cell = gridState.cells.find((c) => c.id === gridState.selectedCellId);
      const rawQuestions = room.quizBank?.questions ?? [];
      const q = (cell?.questionId ? rawQuestions.find((item) => item.id === cell.questionId) : null) || rawQuestions[room.currentQuestion];
      if (!q) return;
      const qKey = `${room.id}:${q.id}`;
      roomQuestionProcessed.delete(qKey);
      roomQuestionScoresCache.delete(qKey);
      const qIndex = rawQuestions.findIndex((item) => item.id === q.id);
      if (qIndex >= 0 && room.currentQuestion !== qIndex) {
        room.currentQuestion = qIndex;
        await prisma.room.update({ where: { id: room.id }, data: { currentQuestion: qIndex } }).catch(console.error);
        roomCache.delete(room.id);
      }
      gridState.questionReady = true;
      io2.to(`room:${room.code}`).emit("game:grid:update", gridState);
      const bloomLevel = getBloomLevelFromPoints(q.points);
      const config = room.config;
      const questionState = buildQuestionState(q, {
        primaryTeamId: gridState.currentTurnTeamId,
        primaryTeamName: gridState.currentTurnTeamName,
        bloomLevel,
        answerMethod: config?.answerMethod ?? "DEVICE",
        gridCellId: gridState.selectedCellId
      });
      const isDeviceAnswer = (config?.answerMethod ?? "DEVICE") === "DEVICE";
      const effectiveTimeLimit = isDeviceAnswer ? getStandardQuestionTimeLimit(q, cell?.points) : q.timeLimit || 30;
      questionState.timeLimit = effectiveTimeLimit;
      questionState.question.timeLimit = effectiveTimeLimit;
      questionState.timerPending = true;
      questionState.timerStarted = false;
      roomActiveQuestions.set(room.id, questionState);
      io2.to(`room:${room.code}`).emit("game:question", questionState);
      io2.to(`room:${room.code}:admin`).emit("admin:question:data", {
        questionId: q.id,
        options: q.options,
        answer: q.answer,
        type: q.type,
        explanation: q.hint || q.explanation
      });
    });
    socket.on("admin:question:get_data", async ({ code } = {}) => {
      const room = await getAdminRoom(socket, code);
      if (!room || room.status === "LOBBY") return;
      const activeQ = roomActiveQuestions.get(room.id);
      const rawQuestions = room.quizBank?.questions ?? [];
      const q = (activeQ ? rawQuestions.find((item) => item.id === activeQ.question.id) : null) || rawQuestions[room.currentQuestion];
      if (q) {
        socket.emit("admin:question:data", {
          questionId: q.id,
          options: q.options,
          answer: q.answer,
          type: q.type,
          explanation: q.hint || q.explanation
        });
      }
    });
    socket.on("admin:question:start_timer", async (payload) => {
      const room = await getAdminRoom(socket, payload?.code);
      if (!room || room.status !== "PLAYING") return;
      const activeQ = roomActiveQuestions.get(room.id);
      const rawQuestions = room.quizBank?.questions ?? [];
      const q = (activeQ ? rawQuestions.find((item) => item.id === activeQ.question.id) : null) || rawQuestions[room.currentQuestion];
      if (!q) return;
      if (room.mode === "BOUNCEBACK" && activeQ?.stealBuzzedTeamId) {
        await startStealAnsweringTimer(room.id, room.code, q);
        return;
      }
      if (room.mode === "BUZZ") {
        const qKey = `${room.id}:${q.id}`;
        if (roomBuzzDelayTimers.has(qKey)) {
          clearTimeout(roomBuzzDelayTimers.get(qKey));
          roomBuzzDelayTimers.delete(qKey);
        }
        await openBuzzWindow(io2, room.id, room.code, q.id);
        return;
      }
      const effectiveTimeLimit = getStandardQuestionTimeLimit(q);
      const endsAt = Date.now() + effectiveTimeLimit * 1e3;
      if (activeQ) {
        activeQ.timerPending = false;
        activeQ.timerStarted = true;
        activeQ.startedAt = Date.now();
        activeQ.endsAt = endsAt;
        activeQ.serverTime = Date.now();
        io2.to(`room:${room.code}`).emit("game:question", activeQ);
        persistGameStateSnapshot(room.id).catch(() => {
        });
      }
      io2.to(`room:${room.code}`).emit("game:timer:started", {
        timeLimit: effectiveTimeLimit,
        endsAt,
        serverTime: Date.now(),
        questionId: q.id
      });
      startQuestionTimer(io2, room.code, room.id, q.id, effectiveTimeLimit);
    });
    socket.on("admin:grid:advance_now", async () => {
      const room = await getAdminRoom(socket);
      if (!room || room.mode !== "GRID_CARO") return;
      await advanceGridToBoard(io2, room.id, room.code);
    });
    socket.on("admin:dice:roll:manual", async (payload) => {
      const room = await getAdminRoom(socket, payload?.code);
      if (!room || room.mode !== "DICE_RACE") return;
      const diceState = roomDiceRaces.get(room.id);
      if (!diceState) return;
      const teamId = diceState.currentTurnTeamId;
      if (!teamId) return;
      if (roomActiveQuestions.has(room.id)) {
        roomActiveQuestions.delete(room.id);
        io2.to(`room:${room.code}`).emit("game:question:clear");
        io2.to(`room:${room.code}`).emit("game:dice:update", diceState);
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
      await executeDiceRoll(room, diceState, teamId);
    });
    socket.on("admin:dice:advance_to_board", async (payload) => {
      const room = await getAdminRoom(socket, payload?.code);
      if (!room || room.mode !== "DICE_RACE") return;
      stopQuestionTimer(room.id);
      roomActiveQuestions.delete(room.id);
      roomRevealPayloads.delete(room.id);
      io2.to(`room:${room.code}`).emit("game:question:clear");
      const diceState = roomDiceRaces.get(room.id);
      if (diceState) {
        io2.to(`room:${room.code}`).emit("game:dice:update", diceState);
      }
    });
    const roomMysteryFlipCooldown = /* @__PURE__ */ new Map();
    const roomMysteryTileCooldown = /* @__PURE__ */ new Map();
    const roomMysteryActionQueues = /* @__PURE__ */ new Map();
    const enqueueMysteryAction = (roomId, action) => {
      const prev = roomMysteryActionQueues.get(roomId) || Promise.resolve();
      const next2 = prev.then(action).catch((err) => {
        console.error("[MysteryActionQueue] L\u1ED7i trong room:", roomId, err);
      });
      roomMysteryActionQueues.set(roomId, next2);
      return next2;
    };
    const executeMysteryFlip = async (room, _initialQuestState, team, tileId) => {
      return enqueueMysteryAction(room.id, async () => {
        const questState = roomMysteryQuests.get(room.id);
        if (!questState || questState.phase !== "PUSH_YOUR_LUCK") return;
        const now = Date.now();
        const normMiniType = normalizeMiniGameType(questState?.miniGameType);
        if (normMiniType === "MEMORY_PAIRS") {
          const lastTileFlip = roomMysteryTileCooldown.get(`${room.id}:${tileId}`) || 0;
          if (now - lastTileFlip < 150) {
            return;
          }
          roomMysteryTileCooldown.set(`${room.id}:${tileId}`, now);
        } else if (normMiniType === "ONE_SHOT_DOORS" && (questState?.oneShotState?.phase === "SELECTING" || !questState?.oneShotState?.phase)) {
          const lastTileFlip = roomMysteryTileCooldown.get(`${room.id}:${tileId}`) || 0;
          if (now - lastTileFlip < 80) {
            return;
          }
          roomMysteryTileCooldown.set(`${room.id}:${tileId}`, now);
        } else {
          const lastFlipTime = roomMysteryFlipCooldown.get(room.id) || 0;
          if (now - lastFlipTime < 250) {
            return;
          }
          roomMysteryFlipCooldown.set(room.id, now);
        }
        const allTeams = await prisma.team.findMany({ where: { roomId: room.id } });
        const freshState = roomMysteryQuests.get(room.id) || questState;
        if (!freshState || freshState.phase !== "PUSH_YOUR_LUCK") return;
        const {
          updatedState,
          isBomb,
          scorePenalty,
          finalScoreDelta,
          shouldResetMismatchedCards,
          recipientTeamId,
          giftedPoints,
          darkBombRecipients,
          victimTeamId,
          stolenPoints,
          temperanceBonusRecipients
        } = handleFlipCard({
          state: freshState,
          tileId,
          team,
          allTeams
        });
        roomMysteryQuests.set(room.id, updatedState);
        io2.to(`room:${room.code}`).emit("game:mystery:update", updatedState);
        if (normMiniType === "ONE_SHOT_DOORS" && (updatedState.oneShotState?.phase === "SELECTING" || (updatedState.oneShotState?.selectedDoorIds?.length || 0) < 3)) {
          return;
        }
        if (updatedState.phase === "STEAL_TARGET_SELECT") {
        } else if (victimTeamId && stolenPoints && stolenPoints > 0) {
          const victimDelta = await applyScoreDeltaToTeam(victimTeamId, -stolenPoints);
          const stealerDelta = await applyScoreDeltaToTeam(team.id, finalScoreDelta || stolenPoints);
          io2.to(`room:${room.code}`).emit("game:score:update", [
            { teamId: victimTeamId, score: victimDelta.newScore, delta: victimDelta.effectiveDelta },
            { teamId: team.id, score: stealerDelta.newScore, delta: stealerDelta.effectiveDelta }
          ]);
        } else if (isBomb) {
          if (darkBombRecipients && darkBombRecipients.length > 0) {
            const updates = [];
            if (scorePenalty > 0) {
              const donorDelta = await applyScoreDeltaToTeam(team.id, -scorePenalty);
              updates.push({ teamId: team.id, score: donorDelta.newScore, delta: donorDelta.effectiveDelta });
            }
            for (const rec of darkBombRecipients) {
              if (rec.points > 0) {
                const recDelta = await applyScoreDeltaToTeam(rec.teamId, rec.points);
                updates.push({ teamId: rec.teamId, score: recDelta.newScore, delta: recDelta.effectiveDelta });
              }
            }
            if (updates.length > 0) {
              io2.to(`room:${room.code}`).emit("game:score:update", updates);
            }
          } else if (recipientTeamId && giftedPoints && giftedPoints > 0) {
            const donorDelta = await applyScoreDeltaToTeam(team.id, -giftedPoints);
            const recipientDelta = await applyScoreDeltaToTeam(recipientTeamId, giftedPoints);
            io2.to(`room:${room.code}`).emit("game:score:update", [
              { teamId: team.id, score: donorDelta.newScore, delta: donorDelta.effectiveDelta },
              { teamId: recipientTeamId, score: recipientDelta.newScore, delta: recipientDelta.effectiveDelta }
            ]);
          } else if (scorePenalty > 0) {
            const deltaRes = await applyScoreDeltaToTeam(team.id, -scorePenalty);
            io2.to(`room:${room.code}`).emit("game:score:update", [
              { teamId: team.id, score: deltaRes.newScore, delta: deltaRes.effectiveDelta }
            ]);
          }
        } else if (finalScoreDelta !== void 0 && finalScoreDelta !== 0) {
          const deltaRes = await applyScoreDeltaToTeam(team.id, finalScoreDelta);
          const updates = [
            { teamId: team.id, score: deltaRes.newScore, delta: deltaRes.effectiveDelta }
          ];
          if (temperanceBonusRecipients && temperanceBonusRecipients.length > 0) {
            for (const rec of temperanceBonusRecipients) {
              if (rec.points > 0) {
                const recDelta = await applyScoreDeltaToTeam(rec.teamId, rec.points);
                updates.push({ teamId: rec.teamId, score: recDelta.newScore, delta: recDelta.effectiveDelta });
              }
            }
          }
          io2.to(`room:${room.code}`).emit("game:score:update", updates);
        } else if (updatedState.turnFinishedReason === "ALL_CLEARED") {
          const deltaRes = await applyScoreDeltaToTeam(team.id, updatedState.potPoints);
          io2.to(`room:${room.code}`).emit("game:score:update", [
            { teamId: team.id, score: deltaRes.newScore, delta: deltaRes.effectiveDelta }
          ]);
        }
        if (updatedState.phase === "TURN_SUMMARY" || updatedState.turnFinishedReason) {
          try {
            const allCurrentTeams = await prisma.team.findMany({ where: { roomId: room.id } });
            const notices = generatePrivateTeamNotices({
              questState: updatedState,
              allTeams: allCurrentTeams,
              currentTeamId: team.id,
              actorName: team.name,
              scoreDeltas: [
                ...victimTeamId && stolenPoints ? [{ teamId: victimTeamId, delta: -stolenPoints }, { teamId: team.id, delta: finalScoreDelta || stolenPoints }] : [],
                ...darkBombRecipients ? darkBombRecipients.map((r) => ({ teamId: r.teamId, delta: r.points })) : [],
                ...recipientTeamId && giftedPoints ? [{ teamId: recipientTeamId, delta: giftedPoints }] : [],
                ...scorePenalty > 0 && !darkBombRecipients && !recipientTeamId ? [{ teamId: team.id, delta: -scorePenalty }] : [],
                ...finalScoreDelta !== void 0 && finalScoreDelta !== 0 && !victimTeamId && !isBomb ? [{ teamId: team.id, delta: finalScoreDelta }] : []
              ]
            });
            updatedState.teamNotices = notices;
          } catch (err) {
            console.error("[MysteryQuestNotices] error in executeMysteryFlip:", err);
          }
        }
        const normType = normalizeMiniGameType(updatedState.miniGameType);
        let audioTrigger = "NONE";
        if (normType === "MEMORY_PAIRS") {
          if (updatedState.memoryPairsState?.matchedPairKey) {
            audioTrigger = isBomb ? "WRONG" : "CORRECT";
          } else {
            audioTrigger = "NONE";
          }
        } else if (normType === "ONE_SHOT_DOORS") {
          audioTrigger = updatedState.oneShotState?.phase === "RESOLVED" ? isBomb ? "WRONG" : "CORRECT" : "NONE";
        } else if (normType === "TAROT_DESTINY") {
          audioTrigger = isBomb ? "WRONG" : "CORRECT";
        } else if (normType === "PUSH_YOUR_LUCK") {
          audioTrigger = isBomb ? "WRONG" : "NONE";
        }
        const refreshedState = await buildRoomState(room.id);
        io2.to(`room:${room.code}`).emit("room:state", refreshedState);
        io2.to(`room:${room.code}`).emit("game:mystery:update", updatedState);
        if (updatedState.lastFlippedTile) {
          io2.to(`room:${room.code}`).emit("game:mystery:card_flipped", {
            tile: updatedState.lastFlippedTile,
            potPoints: updatedState.potPoints,
            potMultiplier: updatedState.potMultiplier,
            isBomb,
            bombExploded: updatedState.bombExploded,
            audioTrigger
          });
        }
        if (shouldResetMismatchedCards && updatedState.memoryPairsState) {
          const turnIndexSnapshot = updatedState.currentTurnIndex;
          setTimeout(async () => {
            enqueueMysteryAction(room.id, async () => {
              const cur = roomMysteryQuests.get(room.id);
              if (!cur || !cur.memoryPairsState || cur.currentTurnIndex !== turnIndexSnapshot) return;
              if (!cur.memoryPairsState.isMismatchResolving && !cur.memoryPairsState.promptSecondChance) return;
              if (cur.memoryPairsState.isBombRescueActive) return;
              const { firstFlippedTileId, secondFlippedTileId, keptBombTileIds } = cur.memoryPairsState;
              const keptBombsSet = new Set((keptBombTileIds || []).map(Number));
              cur.tiles = cur.tiles.map((t) => {
                const isTurnTile = Number(t.id) === Number(firstFlippedTileId) || Number(t.id) === Number(secondFlippedTileId);
                if (isTurnTile && !keptBombsSet.has(Number(t.id))) {
                  return { ...t, isOpened: false };
                }
                return { ...t };
              });
              cur.memoryPairsState.firstFlippedTileId = null;
              cur.memoryPairsState.secondFlippedTileId = null;
              cur.memoryPairsState.thirdFlippedTileId = null;
              cur.memoryPairsState.isMismatchResolving = false;
              roomMysteryQuests.set(room.id, cur);
              io2.to(`room:${room.code}`).emit("game:mystery:update", cur);
            });
          }, 1500);
        }
      });
    };
    const executeMysteryCashOut = async (room, questState, team) => {
      const allTeams = await prisma.team.findMany({
        where: { roomId: room.id },
        select: { id: true, name: true, color: true, score: true, isEliminated: true }
      });
      const { updatedState, finalScoreDelta, victimTeamId, stolenPoints } = handleCashOut({
        state: questState,
        team,
        allTeams
      });
      try {
        const notices = generatePrivateTeamNotices({
          questState: updatedState,
          allTeams,
          currentTeamId: team.id,
          actorName: team.name,
          scoreDeltas: [
            ...victimTeamId && stolenPoints ? [{ teamId: victimTeamId, delta: -stolenPoints }, { teamId: team.id, delta: finalScoreDelta || stolenPoints }] : [{ teamId: team.id, delta: finalScoreDelta }]
          ]
        });
        updatedState.teamNotices = notices;
      } catch (err) {
        console.error("[MysteryQuestNotices] error in executeMysteryCashOut:", err);
      }
      roomMysteryQuests.set(room.id, updatedState);
      io2.to(`room:${room.code}`).emit("game:mystery:update", updatedState);
      io2.to(`room:${room.code}`).emit("game:mystery:cashed_out", {
        teamId: team.id,
        teamName: team.name,
        totalGained: finalScoreDelta,
        newScore: (team.score || 0) + finalScoreDelta
      });
      if (victimTeamId && stolenPoints && stolenPoints > 0) {
        Promise.all([
          applyScoreDeltaToTeam(victimTeamId, -stolenPoints),
          applyScoreDeltaToTeam(team.id, finalScoreDelta)
        ]).then(async ([victimDelta, stealerDelta]) => {
          io2.to(`room:${room.code}`).emit("game:score:update", [
            { teamId: victimTeamId, score: victimDelta.newScore, delta: victimDelta.effectiveDelta },
            { teamId: team.id, score: stealerDelta.newScore, delta: stealerDelta.effectiveDelta }
          ]);
          const refreshedState = await buildRoomState(room.id);
          io2.to(`room:${room.code}`).emit("room:state", refreshedState);
        }).catch((err) => {
          console.error("[MysteryCashOut] steal delta error:", err);
        });
      } else if (finalScoreDelta > 0) {
        applyScoreDeltaToTeam(team.id, finalScoreDelta).then(async (deltaRes) => {
          io2.to(`room:${room.code}`).emit("game:score:update", [
            { teamId: team.id, score: deltaRes.newScore, delta: deltaRes.effectiveDelta }
          ]);
          const refreshedState = await buildRoomState(room.id);
          io2.to(`room:${room.code}`).emit("room:state", refreshedState);
        }).catch((err) => {
          console.error("[MysteryCashOut] score delta error:", err);
        });
      } else {
        buildRoomState(room.id).then((refreshedState) => {
          io2.to(`room:${room.code}`).emit("room:state", refreshedState);
        }).catch((err) => {
          console.error("[MysteryCashOut] buildRoomState error:", err);
        });
      }
    };
    const executeMysteryPairsDecision = async (room, questState, team, choice) => {
      const allTeams = await prisma.team.findMany({ where: { roomId: room.id } });
      const { updatedState, finalScoreDelta } = handleMemoryPairsSecondChanceDecision({
        state: questState,
        team,
        allTeams,
        choice
      });
      roomMysteryQuests.set(room.id, updatedState);
      io2.to(`room:${room.code}`).emit("game:mystery:update", updatedState);
      if (finalScoreDelta !== 0) {
        applyScoreDeltaToTeam(team.id, finalScoreDelta).then(async (deltaRes) => {
          io2.to(`room:${room.code}`).emit("game:score:update", [
            { teamId: team.id, score: deltaRes.newScore, delta: deltaRes.effectiveDelta }
          ]);
          const refreshedState = await buildRoomState(room.id);
          io2.to(`room:${room.code}`).emit("room:state", refreshedState);
        }).catch((err) => {
          console.error("[MysteryPairsDecision] score delta error:", err);
        });
      } else {
        buildRoomState(room.id).then((refreshedState) => {
          io2.to(`room:${room.code}`).emit("room:state", refreshedState);
        }).catch((err) => {
          console.error("[MysteryPairsDecision] buildRoomState error:", err);
        });
      }
    };
    const executeMysteryDoorsDecision = async (room, questState, team, decision, chosenDoorId, swapRemovedDoorId, swapAddedDoorId) => {
      const allTeams = await prisma.team.findMany({ where: { roomId: room.id } });
      const {
        updatedState,
        finalScoreDelta,
        victimTeamId,
        stolenPoints,
        recipientTeamId,
        giftedPoints,
        darkBombRecipients,
        temperanceBonusRecipients
      } = handleOneShotDoorsDecision({
        state: questState,
        team,
        allTeams,
        decision,
        chosenDoorId,
        swapRemovedDoorId,
        swapAddedDoorId
      });
      if (updatedState.phase === "TURN_SUMMARY" || updatedState.turnFinishedReason) {
        try {
          const notices = generatePrivateTeamNotices({
            questState: updatedState,
            allTeams,
            currentTeamId: team.id,
            actorName: team.name,
            scoreDeltas: [
              ...victimTeamId && stolenPoints ? [{ teamId: victimTeamId, delta: -stolenPoints }, { teamId: team.id, delta: finalScoreDelta || stolenPoints }] : [],
              ...darkBombRecipients ? darkBombRecipients.map((r) => ({ teamId: r.teamId, delta: r.points })) : [],
              ...recipientTeamId && giftedPoints ? [{ teamId: recipientTeamId, delta: giftedPoints }] : [],
              ...temperanceBonusRecipients ? temperanceBonusRecipients.map((r) => ({ teamId: r.teamId, delta: r.points })) : [],
              ...finalScoreDelta !== void 0 && finalScoreDelta !== 0 && !victimTeamId ? [{ teamId: team.id, delta: finalScoreDelta }] : []
            ]
          });
          updatedState.teamNotices = notices;
        } catch (err) {
          console.error("[MysteryQuestNotices] error in executeMysteryDoorsDecision:", err);
        }
      }
      roomMysteryQuests.set(room.id, updatedState);
      io2.to(`room:${room.code}`).emit("game:mystery:update", updatedState);
      if (victimTeamId && stolenPoints && stolenPoints > 0) {
        Promise.all([
          applyScoreDeltaToTeam(victimTeamId, -stolenPoints),
          applyScoreDeltaToTeam(team.id, finalScoreDelta)
        ]).then(async ([victimDelta, stealerDelta]) => {
          io2.to(`room:${room.code}`).emit("game:score:update", [
            { teamId: victimTeamId, score: victimDelta.newScore, delta: victimDelta.effectiveDelta },
            { teamId: team.id, score: stealerDelta.newScore, delta: stealerDelta.effectiveDelta }
          ]);
          const refreshedState = await buildRoomState(room.id);
          io2.to(`room:${room.code}`).emit("room:state", refreshedState);
        }).catch((err) => {
          console.error("[MysteryDoorsDecision] steal delta error:", err);
        });
      } else if (darkBombRecipients && darkBombRecipients.length > 0) {
        (async () => {
          const updates = [];
          if (finalScoreDelta < 0) {
            const donorDelta = await applyScoreDeltaToTeam(team.id, finalScoreDelta);
            updates.push({ teamId: team.id, score: donorDelta.newScore, delta: donorDelta.effectiveDelta });
          }
          for (const rec of darkBombRecipients) {
            if (rec.points > 0) {
              const recDelta = await applyScoreDeltaToTeam(rec.teamId, rec.points);
              updates.push({ teamId: rec.teamId, score: recDelta.newScore, delta: recDelta.effectiveDelta });
            }
          }
          if (updates.length > 0) {
            io2.to(`room:${room.code}`).emit("game:score:update", updates);
          }
          const refreshedState = await buildRoomState(room.id);
          io2.to(`room:${room.code}`).emit("room:state", refreshedState);
        })().catch(console.error);
      } else if (recipientTeamId && giftedPoints && giftedPoints > 0) {
        Promise.all([
          applyScoreDeltaToTeam(team.id, finalScoreDelta || -giftedPoints),
          applyScoreDeltaToTeam(recipientTeamId, giftedPoints)
        ]).then(async ([donorDelta, recipientDelta]) => {
          io2.to(`room:${room.code}`).emit("game:score:update", [
            { teamId: team.id, score: donorDelta.newScore, delta: donorDelta.effectiveDelta },
            { teamId: recipientTeamId, score: recipientDelta.newScore, delta: recipientDelta.effectiveDelta }
          ]);
          const refreshedState = await buildRoomState(room.id);
          io2.to(`room:${room.code}`).emit("room:state", refreshedState);
        }).catch((err) => {
          console.error("[MysteryDoorsDecision] charity bomb delta error:", err);
        });
      } else if (finalScoreDelta !== 0) {
        (async () => {
          const deltaRes = await applyScoreDeltaToTeam(team.id, finalScoreDelta);
          const updates = [
            { teamId: team.id, score: deltaRes.newScore, delta: deltaRes.effectiveDelta }
          ];
          if (temperanceBonusRecipients && temperanceBonusRecipients.length > 0) {
            for (const rec of temperanceBonusRecipients) {
              if (rec.points > 0) {
                const recDelta = await applyScoreDeltaToTeam(rec.teamId, rec.points);
                updates.push({ teamId: rec.teamId, score: recDelta.newScore, delta: recDelta.effectiveDelta });
              }
            }
          }
          io2.to(`room:${room.code}`).emit("game:score:update", updates);
          const refreshedState = await buildRoomState(room.id);
          io2.to(`room:${room.code}`).emit("room:state", refreshedState);
        })().catch((err) => {
          console.error("[MysteryDoorsDecision] score delta error:", err);
        });
      } else {
        buildRoomState(room.id).then((refreshedState) => {
          io2.to(`room:${room.code}`).emit("room:state", refreshedState);
        }).catch((err) => {
          console.error("[MysteryDoorsDecision] buildRoomState error:", err);
        });
      }
    };
    const executeMysteryTarotRedraw = async (room, questState) => {
      const { updatedState } = handleTarotRedraw({
        state: questState
      });
      roomMysteryQuests.set(room.id, updatedState);
      io2.to(`room:${room.code}`).emit("game:mystery:update", updatedState);
    };
    const executeMysteryTarotKeep = async (room, questState, team) => {
      const teams = await prisma.team.findMany({
        where: { roomId: room.id },
        orderBy: { createdAt: "asc" }
      });
      const { updatedState, finalScoreDelta } = handleTarotConfirmKeep({
        state: questState,
        team,
        allTeams: teams
      });
      roomMysteryQuests.set(room.id, updatedState);
      io2.to(`room:${room.code}`).emit("game:mystery:update", updatedState);
      const delta = finalScoreDelta || 0;
      if (delta !== 0) {
        const newScore = Math.max(0, (team.score || 0) + delta);
        await prisma.team.update({
          where: { id: team.id },
          data: { score: newScore }
        });
        io2.to(`room:${room.code}`).emit("game:score:update", [
          { teamId: team.id, score: newScore, delta }
        ]);
      }
      buildRoomState(room.id).then((rState) => {
        io2.to(`room:${room.code}`).emit("room:state", rState);
      }).catch(console.error);
    };
    const executeMysteryUsePeek = async (room, questState) => {
      const { updatedState } = handlePushYourLuckUsePeek({
        state: questState
      });
      roomMysteryQuests.set(room.id, updatedState);
      io2.to(`room:${room.code}`).emit("game:mystery:update", updatedState);
    };
    const executeMysteryTarotProphecyDecision = async (room, questState, team, choice) => {
      if (choice === "KEEP") {
        const prophecyCardId = questState.tarotState?.prophecyCardId;
        if (prophecyCardId) {
          if (questState.tarotState) {
            questState.tarotState.prophecyResolved = true;
          }
          const tile = questState.tiles.find((t) => t.id === prophecyCardId);
          if (tile) tile.isOpened = false;
          await executeMysteryFlip(room, questState, team, prophecyCardId);
        }
      } else {
        const allTeams = await prisma.team.findMany({ where: { roomId: room.id } });
        const { updatedState } = handleTarotProphecyDecision({
          state: questState,
          team,
          allTeams,
          choice: "DISCARD"
        });
        roomMysteryQuests.set(room.id, updatedState);
        io2.to(`room:${room.code}`).emit("game:mystery:update", updatedState);
        const refreshedState = await buildRoomState(room.id);
        io2.to(`room:${room.code}`).emit("room:state", refreshedState);
      }
    };
    async function executeMysteryAdvanceTurn(room, questState) {
      if (roomTarotPendingScores.has(room.id)) {
        const pendingDeltas = roomTarotPendingScores.get(room.id) || [];
        roomTarotPendingScores.delete(room.id);
        const scoreUpdates = [];
        for (const item of pendingDeltas) {
          if (item.delta !== 0) {
            const deltaRes = await applyScoreDeltaToTeam(item.teamId, item.delta);
            scoreUpdates.push({
              teamId: item.teamId,
              score: deltaRes.newScore,
              delta: deltaRes.effectiveDelta
            });
          }
        }
        if (scoreUpdates.length > 0) {
          io2.to(`room:${room.code}`).emit("game:score:update", scoreUpdates);
        }
      }
      stopQuestionTimer(room.id);
      roomActiveQuestions.delete(room.id);
      roomRevealPayloads.delete(room.id);
      io2.to(`room:${room.code}`).emit("game:question:clear");
      const teams = await prisma.team.findMany({
        where: { roomId: room.id },
        orderBy: { createdAt: "asc" }
      });
      if (teams.length === 0) return;
      const nextTurnIndex = questState.currentTurnIndex + 1;
      if (nextTurnIndex >= questState.totalTurns) {
        const ended = await safelyFinishGame({ io: io2, room, questions: questState.questions });
        if (!ended) return;
        return;
      }
      const nextRound = Math.floor(nextTurnIndex / teams.length) + 1;
      const targetPoints = nextRound === 1 ? 10 : nextRound === 2 ? 20 : 30;
      const nextTeam = teams[nextTurnIndex % teams.length];
      const nextStage = generateMysteryStageForTurn({
        turnIndex: nextTurnIndex,
        currentTeam: nextTeam,
        teams,
        turnsPerTeam: questState.turnsPerTeam,
        prevTheme: questState.theme,
        prevMiniGameType: questState.miniGameType,
        baseQuestionPoints: targetPoints,
        initialHeartsPerTeam: questState.initialHeartsPerTeam,
        teamHearts: questState.teamHearts,
        timesStolenInCycle: questState.timesStolenInCycle,
        consecutiveBombsByTeam: questState.consecutiveBombsByTeam
      });
      nextStage.phase = "QUESTION_ACTIVE";
      roomMysteryQuests.set(room.id, nextStage);
      io2.to(`room:${room.code}`).emit("game:mystery:update", nextStage);
      const updatedState = await buildRoomState(room.id);
      io2.to(`room:${room.code}`).emit("room:state", updatedState);
      const questions = await getRoomQuestions(room.id);
      const nextQ = getNextUniqueQuestion(room.id, questions, void 0, targetPoints);
      if (nextQ) {
        const actualPts = normalizeToThreeLevels(nextQ.question.points || targetPoints);
        if (nextStage.baseQuestionPoints !== actualPts) {
          synchronizeMysteryStageWithQuestionPoints({
            state: nextStage,
            questionPoints: actualPts,
            theme: nextStage.theme,
            teams
          });
          roomMysteryQuests.set(room.id, nextStage);
          io2.to(`room:${room.code}`).emit("game:mystery:update", nextStage);
        }
        room.currentQuestion = nextQ.index;
        room.status = "PLAYING";
        roomCache.set(room.id, room);
        await prisma.room.update({ where: { id: room.id }, data: { currentQuestion: nextQ.index, status: "PLAYING" } }).catch(console.error);
        await startQuestionPrepareAndLaunch(room, questions, nextQ.index, nextQ.question);
      }
    }
    const executeMysteryChooseAction = async (room, questState, action) => {
      await enqueueMysteryAction(room.id, async () => {
        const activeQuest = roomMysteryQuests.get(room.id) || questState;
        if (!activeQuest || activeQuest.phase !== "DECISION_CHOICE") return;
        const team = await prisma.team.findUnique({ where: { id: activeQuest.currentTurnTeamId } });
        if (!team) return;
        const basePts = normalizeToThreeLevels(activeQuest.baseQuestionPoints || 10);
        const teamHearts = activeQuest.teamHearts ? { ...activeQuest.teamHearts } : {};
        const currentHearts = teamHearts[team.id] ?? activeQuest.initialHeartsPerTeam ?? 0;
        let chosenAction = action;
        if (chosenAction === "TAKE_BASE_POINTS") {
          if (currentHearts <= 0) {
            chosenAction = "PLAY_MINIGAME";
          } else {
            teamHearts[team.id] = Math.max(0, currentHearts - 1);
            activeQuest.teamHearts = teamHearts;
            const deltaRes = await applyScoreDeltaToTeam(team.id, basePts);
            io2.to(`room:${room.code}`).emit("game:score:update", [
              { teamId: team.id, score: deltaRes.newScore, delta: deltaRes.effectiveDelta }
            ]);
            activeQuest.phase = "TURN_SUMMARY";
            activeQuest.turnFinishedReason = "TOOK_BASE_POINTS";
            activeQuest.decisionMade = "TAKE_BASE_POINTS";
            activeQuest.potPoints = 0;
            activeQuest.storyResult = {
              teamId: team.id,
              teamName: team.name,
              teamColor: team.color || "#ef4444",
              rewardText: `\u{1F6E1}\uFE0F \u0110\u1ED9i \u0111\xE3 d\xF9ng 1 \u2764\uFE0F \u0111\u1EC3 ch\u1ED1t an to\xE0n +${basePts} \u0111i\u1EC3m t\u1EEB c\xE2u h\u1ECFi! (C\xF2n ${teamHearts[team.id]} \u2764\uFE0F)`,
              scoreDelta: basePts,
              oldScore: team.score || 0,
              newScore: (team.score || 0) + basePts
            };
            try {
              const allTeams = await prisma.team.findMany({ where: { roomId: room.id } });
              const notices = generatePrivateTeamNotices({
                questState: activeQuest,
                allTeams,
                currentTeamId: team.id,
                actorName: team.name,
                scoreDeltas: [{ teamId: team.id, delta: basePts }]
              });
              activeQuest.teamNotices = notices;
            } catch (err) {
              console.error("[MysteryQuestNotices] error in executeMysteryChooseAction:", err);
            }
          }
        }
        if (chosenAction === "PLAY_MINIGAME") {
          activeQuest.decisionMade = "PLAY_MINIGAME";
          activeQuest.cardsFlippedCount = 0;
          let initialPot = basePts;
          if (getPerkType(activeQuest.promoPerk) === "EXTRA_POT_PROMO") {
            initialPot += 5;
          }
          activeQuest.potPoints = initialPot;
          activeQuest.potMultiplier = 1;
          activeQuest.hasShield = getPerkType(activeQuest.promoPerk) === "SHIELD_PROMO";
          activeQuest.phase = "PUSH_YOUR_LUCK";
          if (normalizeMiniGameType(activeQuest.miniGameType) === "MEMORY_PAIRS") {
            activeQuest.memoryPairsState = getInitialMemoryPairsState(activeQuest.promoPerk);
          }
          const allTeams = await prisma.team.findMany({ where: { roomId: room.id } });
          synchronizeMysteryStageWithQuestionPoints({
            state: activeQuest,
            questionPoints: basePts,
            theme: activeQuest.theme,
            teams: allTeams
          });
        }
        roomMysteryQuests.set(room.id, activeQuest);
        io2.to(`room:${room.code}`).emit("game:mystery:update", activeQuest);
        const refreshedState = await buildRoomState(room.id);
        io2.to(`room:${room.code}`).emit("room:state", refreshedState);
      });
    };
    socket.on("game:mystery:choose_action", async ({ action }) => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: true }
      });
      if (!player || !player.room || !player.teamId) return;
      const room = player.room;
      if (room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      if (!questState || questState.phase !== "DECISION_CHOICE") return;
      if (questState.currentTurnTeamId !== player.teamId) {
        socket.emit("error", "Ch\u01B0a \u0111\u1EBFn l\u01B0\u1EE3t l\u1EF1a ch\u1ECDn c\u1EE7a \u0111\u1ED9i b\u1EA1n!");
        return;
      }
      await executeMysteryChooseAction(room, questState, action);
    });
    socket.on("admin:mystery:choose_action", async ({ action, code }) => {
      const room = await getAdminRoom(socket, code);
      if (!room || room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      if (!questState || questState.phase !== "DECISION_CHOICE") return;
      await executeMysteryChooseAction(room, questState, action);
    });
    const executeMysterySurvivalChoice = async (room, questState, choice) => {
      await enqueueMysteryAction(room.id, async () => {
        const activeQuest = roomMysteryQuests.get(room.id) || questState;
        if (!activeQuest || !activeQuest.survivalDilemmaPending) return;
        const team = await prisma.team.findUnique({ where: { id: activeQuest.currentTurnTeamId } });
        if (!team) return;
        const teamHearts = activeQuest.teamHearts ? { ...activeQuest.teamHearts } : {};
        const currentHearts = teamHearts[team.id] ?? activeQuest.initialHeartsPerTeam ?? 0;
        const allTeams = await prisma.team.findMany({ where: { roomId: room.id } });
        const basePts = normalizeToThreeLevels(activeQuest.baseQuestionPoints || 10);
        activeQuest.survivalDilemmaPending = false;
        activeQuest.survivalDilemmaChoice = choice;
        if (choice === "SACRIFICE_HEART") {
          teamHearts[team.id] = 0;
          activeQuest.teamHearts = teamHearts;
          activeQuest.phase = "TURN_SUMMARY";
          activeQuest.turnFinishedReason = "QUESTION_FAILED";
          activeQuest.potPoints = 0;
          activeQuest.storyResult = {
            teamId: team.id,
            teamName: team.name,
            teamColor: team.color || "#ef4444",
            rewardText: `\u{1F494} \u0110\u1ED9i ch\u1EA5p nh\u1EADn \u0111\xE1nh \u0111\u1ED5i to\xE0n b\u1ED9 tim (m\u1EA5t h\u1EBFt \u2764\uFE0F) \u0111\u1EC3 b\u1EA3o to\xE0n nguy\xEAn v\u1EB9n ${team.score || 0} \u0111i\u1EC3m!`,
            scoreDelta: 0,
            oldScore: team.score || 0,
            newScore: team.score || 0
          };
          try {
            const notices = generatePrivateTeamNotices({
              questState: activeQuest,
              allTeams,
              currentTeamId: team.id,
              actorName: team.name,
              scoreDeltas: [{ teamId: team.id, delta: 0 }]
            });
            activeQuest.teamNotices = notices;
          } catch (err) {
            console.error("[MysteryQuestNotices] error in executeMysterySurvivalChoice:", err);
          }
        } else if (choice === "RISK_SURVIVAL") {
          activeQuest.baseQuestionPoints = basePts;
          startSurvivalPenaltyMinigame({
            state: activeQuest,
            team,
            allTeams
          });
        }
        roomMysteryQuests.set(room.id, activeQuest);
        io2.to(`room:${room.code}`).emit("game:mystery:update", activeQuest);
        const refreshedState = await buildRoomState(room.id);
        io2.to(`room:${room.code}`).emit("room:state", refreshedState);
      });
    };
    socket.on("game:mystery:survival_choice", async ({ choice }) => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: true }
      });
      if (!player || !player.room || !player.teamId) return;
      const room = player.room;
      if (room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      if (!questState || !questState.survivalDilemmaPending) return;
      if (questState.currentTurnTeamId !== player.teamId) {
        socket.emit("error", "Ch\u01B0a \u0111\u1EBFn l\u01B0\u1EE3t l\u1EF1a ch\u1ECDn c\u1EE7a \u0111\u1ED9i b\u1EA1n!");
        return;
      }
      await executeMysterySurvivalChoice(room, questState, choice);
    });
    socket.on("admin:mystery:survival_choice", async ({ choice, code }) => {
      const room = await getAdminRoom(socket, code);
      if (!room || room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      if (!questState || !questState.survivalDilemmaPending) return;
      await executeMysterySurvivalChoice(room, questState, choice);
    });
    socket.on("game:mystery:flip_card", async ({ tileId }) => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: true }
      });
      if (!player || !player.room || !player.teamId) return;
      const room = player.room;
      if (room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      if (!questState || questState.phase === "TURN_SUMMARY") return;
      if (questState.currentTurnTeamId !== player.teamId) {
        socket.emit("error", "Ch\u01B0a \u0111\u1EBFn l\u01B0\u1EE3t l\u1EADt b\xE0i c\u1EE7a \u0111\u1ED9i b\u1EA1n!");
        return;
      }
      const team = await prisma.team.findUnique({ where: { id: player.teamId } });
      if (!team) return;
      await executeMysteryFlip(room, questState, team, tileId);
    });
    socket.on("admin:mystery:flip_card", async (payload) => {
      const room = await getAdminRoom(socket, payload?.code);
      if (!room || room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      if (!questState || questState.phase === "TURN_SUMMARY") return;
      const team = await prisma.team.findUnique({ where: { id: questState.currentTurnTeamId } });
      if (!team) return;
      await executeMysteryFlip(room, questState, team, payload.tileId);
    });
    socket.on("game:mystery:cash_out", async () => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: true }
      });
      if (!player || !player.room || !player.teamId) return;
      const room = player.room;
      if (room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      if (!questState || questState.phase !== "PUSH_YOUR_LUCK") return;
      if (questState.currentTurnTeamId !== player.teamId) {
        socket.emit("error", "Ch\u01B0a \u0111\u1EBFn l\u01B0\u1EE3t b\u1EA3o to\xE0n \u0111i\u1EC3m c\u1EE7a \u0111\u1ED9i b\u1EA1n!");
        return;
      }
      const team = await prisma.team.findUnique({ where: { id: player.teamId } });
      if (!team) return;
      await executeMysteryCashOut(room, questState, team);
    });
    socket.on("admin:mystery:cash_out", async (payload) => {
      const room = await getAdminRoom(socket, payload?.code);
      if (!room || room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      if (!questState || questState.phase !== "PUSH_YOUR_LUCK") return;
      const team = await prisma.team.findUnique({ where: { id: questState.currentTurnTeamId } });
      if (!team) return;
      await executeMysteryCashOut(room, questState, team);
    });
    socket.on("game:mystery:pairs_decision", async ({ choice }) => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: true }
      });
      if (!player || !player.room || !player.teamId) return;
      const room = player.room;
      if (room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      if (!questState || !questState.memoryPairsState?.promptSecondChance) return;
      if (questState.currentTurnTeamId !== player.teamId) {
        socket.emit("error", "Ch\u01B0a \u0111\u1EBFn l\u01B0\u1EE3t quy\u1EBFt \u0111\u1ECBnh c\u1EE7a \u0111\u1ED9i b\u1EA1n!");
        return;
      }
      const team = await prisma.team.findUnique({ where: { id: player.teamId } });
      if (!team) return;
      await executeMysteryPairsDecision(room, questState, team, choice);
    });
    socket.on("admin:mystery:pairs_decision", async ({ choice, code }) => {
      const room = await getAdminRoom(socket, code);
      if (!room || room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      if (!questState || !questState.memoryPairsState?.promptSecondChance) return;
      const team = await prisma.team.findUnique({ where: { id: questState.currentTurnTeamId } });
      if (!team) return;
      await executeMysteryPairsDecision(room, questState, team, choice);
    });
    socket.on("game:mystery:doors_decision", async ({ decision, chosenDoorId, swapRemovedDoorId, swapAddedDoorId }) => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: true }
      });
      if (!player || !player.room || !player.teamId) return;
      const room = player.room;
      if (room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      const osPhase = questState?.oneShotState?.phase;
      if (!questState || osPhase !== "STAGE_1_DECISION" && osPhase !== "FINAL_DECISION" && osPhase !== "SWAP_DOOR" && osPhase !== "OPEN_FINAL" && osPhase !== "PENALTY_DECISION" && osPhase !== "SCANNED" && osPhase !== "STAGE_2_PICK") return;
      if (questState.currentTurnTeamId !== player.teamId) {
        socket.emit("error", "Ch\u01B0a \u0111\u1EBFn l\u01B0\u1EE3t quy\u1EBFt \u0111\u1ECBnh c\u1EE7a \u0111\u1ED9i b\u1EA1n!");
        return;
      }
      const team = await prisma.team.findUnique({ where: { id: player.teamId } });
      if (!team) return;
      await executeMysteryDoorsDecision(room, questState, team, decision, chosenDoorId, swapRemovedDoorId, swapAddedDoorId);
    });
    socket.on("admin:mystery:doors_decision", async ({ decision, chosenDoorId, swapRemovedDoorId, swapAddedDoorId, code }) => {
      const room = await getAdminRoom(socket, code);
      if (!room || room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      const osPhase = questState?.oneShotState?.phase;
      if (!questState || osPhase !== "STAGE_1_DECISION" && osPhase !== "FINAL_DECISION" && osPhase !== "SWAP_DOOR" && osPhase !== "OPEN_FINAL" && osPhase !== "PENALTY_DECISION" && osPhase !== "SCANNED" && osPhase !== "STAGE_2_PICK") return;
      const team = await prisma.team.findUnique({ where: { id: questState.currentTurnTeamId } });
      if (!team) return;
      await executeMysteryDoorsDecision(room, questState, team, decision, chosenDoorId, swapRemovedDoorId, swapAddedDoorId);
    });
    socket.on("game:mystery:tarot_redraw", async () => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: true }
      });
      if (!player || !player.room || !player.teamId) return;
      const room = player.room;
      if (room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      if (!questState || !questState.tarotState?.canRedraw) return;
      if (questState.currentTurnTeamId !== player.teamId) {
        socket.emit("error", "Ch\u01B0a \u0111\u1EBFn l\u01B0\u1EE3t quy\u1EBFt \u0111\u1ECBnh c\u1EE7a \u0111\u1ED9i b\u1EA1n!");
        return;
      }
      await executeMysteryTarotRedraw(room, questState);
    });
    socket.on("admin:mystery:tarot_redraw", async ({ code } = {}) => {
      const room = await getAdminRoom(socket, code);
      if (!room || room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      if (!questState || !questState.tarotState?.canRedraw) return;
      await executeMysteryTarotRedraw(room, questState);
    });
    socket.on("game:mystery:tarot_keep", async () => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: true }
      });
      if (!player || !player.room || !player.teamId) return;
      const room = player.room;
      if (room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      if (!questState || !questState.tarotState?.chosenCardId) return;
      if (questState.currentTurnTeamId !== player.teamId) {
        socket.emit("error", "Ch\u01B0a \u0111\u1EBFn l\u01B0\u1EE3t quy\u1EBFt \u0111\u1ECBnh c\u1EE7a \u0111\u1ED9i b\u1EA1n!");
        return;
      }
      const team = await prisma.team.findUnique({ where: { id: player.teamId } });
      if (!team) return;
      await executeMysteryTarotKeep(room, questState, team);
    });
    socket.on("admin:mystery:tarot_keep", async ({ code } = {}) => {
      const room = await getAdminRoom(socket, code);
      if (!room || room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      if (!questState || !questState.tarotState?.chosenCardId) return;
      const team = await prisma.team.findUnique({ where: { id: questState.currentTurnTeamId } });
      if (!team) return;
      await executeMysteryTarotKeep(room, questState, team);
    });
    socket.on("game:mystery:use_peek", async () => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: true }
      });
      if (!player || !player.room || !player.teamId) return;
      const room = player.room;
      if (room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      if (!questState || questState.phase !== "PUSH_YOUR_LUCK") return;
      if (questState.currentTurnTeamId !== player.teamId) {
        socket.emit("error", "Ch\u01B0a \u0111\u1EBFn l\u01B0\u1EE3t d\xF9ng M\u1EAFt Th\u1EA7n c\u1EE7a \u0111\u1ED9i b\u1EA1n!");
        return;
      }
      if ((questState.peekUsesRemaining ?? 0) <= 0) {
        socket.emit("error", "B\u1EA1n \u0111\xE3 h\u1EBFt l\u01B0\u1EE3t s\u1EED d\u1EE5ng M\u1EAFt Th\u1EA7n!");
        return;
      }
      await executeMysteryUsePeek(room, questState);
    });
    socket.on("admin:mystery:use_peek", async ({ code } = {}) => {
      const room = await getAdminRoom(socket, code);
      if (!room || room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      if (!questState || questState.phase !== "PUSH_YOUR_LUCK") return;
      if ((questState.peekUsesRemaining ?? 0) <= 0) return;
      await executeMysteryUsePeek(room, questState);
    });
    socket.on("game:mystery:tarot_prophecy_decision", async ({ choice }) => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: true }
      });
      if (!player || !player.room || !player.teamId) return;
      const room = player.room;
      if (room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      if (!questState || !questState.tarotState?.prophecyCardId || questState.tarotState?.prophecyResolved) return;
      if (questState.currentTurnTeamId !== player.teamId) {
        socket.emit("error", "Ch\u01B0a \u0111\u1EBFn l\u01B0\u1EE3t quy\u1EBFt \u0111\u1ECBnh c\u1EE7a \u0111\u1ED9i b\u1EA1n!");
        return;
      }
      const team = await prisma.team.findUnique({ where: { id: player.teamId } });
      if (!team) return;
      await executeMysteryTarotProphecyDecision(room, questState, team, choice);
    });
    socket.on("admin:mystery:tarot_prophecy_decision", async ({ choice, code }) => {
      const room = await getAdminRoom(socket, code);
      if (!room || room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      if (!questState || !questState.tarotState?.prophecyCardId || questState.tarotState?.prophecyResolved) return;
      const team = await prisma.team.findUnique({ where: { id: questState.currentTurnTeamId } });
      if (!team) return;
      await executeMysteryTarotProphecyDecision(room, questState, team, choice);
    });
    const executeMysterySpinTarotWheel = async (room, questState, teamOrTeamId, powerPercent = 50) => {
      const targetTeamId = typeof teamOrTeamId === "string" ? teamOrTeamId : teamOrTeamId?.id;
      if (!targetTeamId) return;
      if (questState.miniGameType !== "TAROT_DESTINY" || questState.tarotState?.isDrawn && !questState.tarotState?.isShieldRespin || questState.tarotState?.isWheelSpinning) return;
      const rawTeams = await prisma.team.findMany({ where: { roomId: room.id }, orderBy: { createdAt: "asc" } });
      const allTeams = rawTeams.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color || "#ef4444",
        score: t.score || 0
      }));
      const teamRef = allTeams.find((t) => t.id === targetTeamId) || {
        id: targetTeamId,
        name: typeof teamOrTeamId === "object" ? teamOrTeamId?.name || "\u0110\u1ED9i ch\u01A1i" : "\u0110\u1ED9i ch\u01A1i",
        color: typeof teamOrTeamId === "object" ? teamOrTeamId?.color || "#ef4444" : "#ef4444",
        score: typeof teamOrTeamId === "object" ? teamOrTeamId?.score || 0 : 0
      };
      const result = handleAncientTarotSpinWheel({
        state: questState,
        team: teamRef,
        allTeams,
        powerPercent
      });
      if (!result.isGambleTrigger && result.scoreDeltas.length > 0) {
        roomTarotPendingScores.set(room.id, result.scoreDeltas);
      } else {
        roomTarotPendingScores.delete(room.id);
      }
      const spinningState = {
        ...result.updatedState,
        phase: "PUSH_YOUR_LUCK",
        tarotState: {
          ...result.updatedState.tarotState,
          isWheelSpinning: true,
          wheelPower: Math.max(1, Math.min(100, Math.round(powerPercent))),
          startAngle: result.startAngle,
          targetAngle: result.targetAngle,
          spinDurationMs: result.spinDurationMs,
          selectedSegmentIndex: result.landedIndex,
          drawnCard: result.drawnCard,
          isDrawn: false,
          isRevealPending: false
        }
      };
      roomMysteryQuests.set(room.id, spinningState);
      io2.to(`room:${room.code}`).emit("game:mystery:update", spinningState);
      const turnIndexSnapshot = questState.currentTurnIndex;
      const roundSnapshot = questState.currentRound;
      setTimeout(async () => {
        const curQuest = roomMysteryQuests.get(room.id);
        if (!curQuest || curQuest.currentTurnIndex !== turnIndexSnapshot || curQuest.currentRound !== roundSnapshot) return;
        const settledState = {
          ...result.updatedState,
          phase: "PUSH_YOUR_LUCK",
          tarotState: {
            ...result.updatedState.tarotState,
            isWheelSpinning: false,
            wheelPower: Math.max(1, Math.min(100, Math.round(powerPercent))),
            startAngle: result.startAngle,
            targetAngle: result.targetAngle,
            spinDurationMs: result.spinDurationMs,
            selectedSegmentIndex: result.landedIndex,
            drawnCard: result.drawnCard,
            isDrawn: true,
            isRevealPending: true,
            isGambling: Boolean(result.isGambleTrigger)
          }
        };
        roomMysteryQuests.set(room.id, settledState);
        io2.to(`room:${room.code}`).emit("game:mystery:update", settledState);
        const refreshedState = await buildRoomState(room.id);
        io2.to(`room:${room.code}`).emit("room:state", refreshedState);
        setTimeout(async () => {
          const currentQuest = roomMysteryQuests.get(room.id);
          if (currentQuest && currentQuest.tarotState?.isRevealPending) {
            await executeMysteryTarotReveal(room, currentQuest);
          }
        }, 2200);
      }, result.spinDurationMs + 100);
    };
    const executeMysteryTarotReveal = async (room, questState) => {
      if (!questState.tarotState) return;
      if (!questState.tarotState.isRevealPending && questState.phase !== "PUSH_YOUR_LUCK") return;
      const drawnCard = questState.tarotState.drawnCard;
      const isShieldRespin = Boolean(questState.tarotState.isShieldRespin);
      const isGamble = !questState.isPenaltySurvivalMode && (drawnCard?.key === "THE_STAR" || drawnCard?.key === "THE_MOON");
      let pendingDeltas = [];
      if (!isGamble && !isShieldRespin) {
        pendingDeltas = roomTarotPendingScores.get(room.id) || [];
        roomTarotPendingScores.delete(room.id);
        if (pendingDeltas.length === 0 && drawnCard?.scoreDelta && questState.currentTurnTeamId) {
          pendingDeltas = [{ teamId: questState.currentTurnTeamId, delta: drawnCard.scoreDelta }];
        }
        const scoreUpdates = [];
        for (const item of pendingDeltas) {
          if (item.delta !== 0) {
            const deltaRes = await applyScoreDeltaToTeam(item.teamId, item.delta);
            scoreUpdates.push({
              teamId: item.teamId,
              score: deltaRes.newScore,
              delta: deltaRes.effectiveDelta
            });
          }
        }
        if (scoreUpdates.length > 0) {
          io2.to(`room:${room.code}`).emit("game:score:update", scoreUpdates);
        }
      }
      const nextPhase = isGamble || isShieldRespin ? "PUSH_YOUR_LUCK" : "TURN_SUMMARY";
      const nextFinishedReason = isGamble || isShieldRespin ? void 0 : questState.isPenaltySurvivalMode ? drawnCard?.key === "THE_PEACE" ? "SURVIVAL_ESCAPE" : "SURVIVAL_FAILED" : "TAROT_WHEEL_SPUN";
      const revealedState = {
        ...questState,
        phase: nextPhase,
        turnFinishedReason: nextFinishedReason,
        tarotState: {
          ...questState.tarotState,
          isRevealPending: false,
          isGambling: isGamble,
          isShieldRespin,
          shieldTransformedCardKey: questState.tarotState.shieldTransformedCardKey
        },
        ...isGamble ? {
          tarotGambleState: {
            isGambling: true,
            triggerCardKey: drawnCard?.key || "THE_STAR",
            spinCount: questState.tarotGambleState?.spinCount || 0
          }
        } : {
          tarotGambleState: void 0
        }
      };
      if (nextPhase === "TURN_SUMMARY") {
        try {
          const allTeams = await prisma.team.findMany({ where: { roomId: room.id } });
          const actorTeam = allTeams.find((t) => t.id === revealedState.currentTurnTeamId);
          const notices = generatePrivateTeamNotices({
            questState: revealedState,
            allTeams,
            currentTeamId: revealedState.currentTurnTeamId,
            actorName: actorTeam?.name || "\u0110\u1ED9i b\u1EA1n",
            scoreDeltas: pendingDeltas
          });
          revealedState.teamNotices = notices;
        } catch (err) {
          console.error("[MysteryQuestNotices] error in executeMysteryTarotReveal:", err);
        }
      }
      roomMysteryQuests.set(room.id, revealedState);
      io2.to(`room:${room.code}`).emit("game:mystery:update", revealedState);
      const refreshedState = await buildRoomState(room.id);
      io2.to(`room:${room.code}`).emit("room:state", refreshedState);
    };
    const executeMysteryTarotRespin = async (room, questState) => {
      if (!questState.tarotState || !questState.tarotState.isShieldRespin) return;
      const respinState = {
        ...questState,
        phase: "PUSH_YOUR_LUCK",
        turnFinishedReason: void 0,
        tarotState: {
          ...questState.tarotState,
          isDrawn: false,
          isRevealPending: false,
          drawnCard: void 0,
          isWheelSpinning: false,
          shieldTransformedCardKey: questState.tarotState.shieldTransformedCardKey,
          isShieldRespin: false
        }
      };
      roomMysteryQuests.set(room.id, respinState);
      io2.to(`room:${room.code}`).emit("game:mystery:update", respinState);
      const refreshedState = await buildRoomState(room.id);
      io2.to(`room:${room.code}`).emit("room:state", refreshedState);
    };
    const executeMysteryTarotGamblePrepare = async (room, questState) => {
      if (!questState.tarotState || !questState.tarotState.isGambling) return;
      const prepareState = {
        ...questState,
        phase: "PUSH_YOUR_LUCK",
        turnFinishedReason: void 0,
        tarotState: {
          ...questState.tarotState,
          isDrawn: false,
          isRevealPending: false,
          isWheelSpinning: false,
          isGamblingWaitingSpin: true
        }
      };
      roomMysteryQuests.set(room.id, prepareState);
      io2.to(`room:${room.code}`).emit("game:mystery:update", prepareState);
      const refreshedState = await buildRoomState(room.id);
      io2.to(`room:${room.code}`).emit("room:state", refreshedState);
    };
    const executeMysteryTarotGambleDecision = async (room, questState, teamOrTeamId, spinAgain, powerPercent = 50) => {
      const targetTeamId = typeof teamOrTeamId === "string" ? teamOrTeamId : teamOrTeamId?.id;
      if (!targetTeamId) return;
      const rawTeams = await prisma.team.findMany({ where: { roomId: room.id }, orderBy: { createdAt: "asc" } });
      const allTeams = rawTeams.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color || "#ef4444",
        score: t.score || 0
      }));
      const teamRef = allTeams.find((t) => t.id === targetTeamId) || {
        id: targetTeamId,
        name: typeof teamOrTeamId === "object" ? teamOrTeamId?.name || "\u0110\u1ED9i ch\u01A1i" : "\u0110\u1ED9i ch\u01A1i",
        color: typeof teamOrTeamId === "object" ? teamOrTeamId?.color || "#ef4444" : "#ef4444",
        score: typeof teamOrTeamId === "object" ? teamOrTeamId?.score || 0 : 0
      };
      const gambleResult = handleAncientTarotGambleDecision({
        state: questState,
        team: teamRef,
        allTeams,
        spinAgain,
        powerPercent
      });
      if (!spinAgain) {
        roomTarotPendingScores.delete(room.id);
        const scoreUpdates = [];
        for (const item of gambleResult.scoreDeltas || []) {
          if (item.delta !== 0) {
            const deltaRes = await applyScoreDeltaToTeam(item.teamId, item.delta);
            scoreUpdates.push({
              teamId: item.teamId,
              score: deltaRes.newScore,
              delta: deltaRes.effectiveDelta
            });
          }
        }
        if (scoreUpdates.length > 0) {
          io2.to(`room:${room.code}`).emit("game:score:update", scoreUpdates);
        }
        try {
          const notices = generatePrivateTeamNotices({
            questState: gambleResult.updatedState,
            allTeams,
            currentTeamId: targetTeamId,
            actorName: teamRef.name,
            scoreDeltas: gambleResult.scoreDeltas || []
          });
          gambleResult.updatedState.teamNotices = notices;
        } catch (err) {
          console.error("[MysteryQuestNotices] error in executeMysteryTarotGambleDecision:", err);
        }
        roomMysteryQuests.set(room.id, gambleResult.updatedState);
        io2.to(`room:${room.code}`).emit("game:mystery:update", gambleResult.updatedState);
        const refreshedState = await buildRoomState(room.id);
        io2.to(`room:${room.code}`).emit("room:state", refreshedState);
        return;
      }
      if (!gambleResult.isGambleAgain && gambleResult.scoreDeltas.length > 0) {
        roomTarotPendingScores.set(room.id, gambleResult.scoreDeltas);
      } else {
        roomTarotPendingScores.delete(room.id);
      }
      const spinningGambleState = {
        ...gambleResult.updatedState,
        phase: "PUSH_YOUR_LUCK",
        tarotState: {
          ...gambleResult.updatedState.tarotState,
          isWheelSpinning: true,
          wheelPower: Math.max(1, Math.min(100, Math.round(powerPercent))),
          startAngle: gambleResult.startAngle,
          targetAngle: gambleResult.targetAngle,
          spinDurationMs: gambleResult.spinDurationMs,
          selectedSegmentIndex: gambleResult.landedIndex,
          drawnCard: gambleResult.drawnCard,
          isDrawn: false,
          isRevealPending: false,
          isGambling: false,
          isGamblingWaitingSpin: false
        }
      };
      roomMysteryQuests.set(room.id, spinningGambleState);
      io2.to(`room:${room.code}`).emit("game:mystery:update", spinningGambleState);
      const dur = gambleResult.spinDurationMs ?? 2e4;
      const turnIndexSnapshot = questState.currentTurnIndex;
      const roundSnapshot = questState.currentRound;
      setTimeout(async () => {
        const curQuest = roomMysteryQuests.get(room.id);
        if (!curQuest || curQuest.currentTurnIndex !== turnIndexSnapshot || curQuest.currentRound !== roundSnapshot) return;
        const settledGambleState = {
          ...gambleResult.updatedState,
          phase: "PUSH_YOUR_LUCK",
          tarotState: {
            ...gambleResult.updatedState.tarotState,
            isWheelSpinning: false,
            wheelPower: Math.max(1, Math.min(100, Math.round(powerPercent))),
            startAngle: gambleResult.startAngle,
            targetAngle: gambleResult.targetAngle,
            spinDurationMs: gambleResult.spinDurationMs,
            selectedSegmentIndex: gambleResult.landedIndex,
            drawnCard: gambleResult.drawnCard,
            isDrawn: true,
            isRevealPending: true,
            isGambling: Boolean(gambleResult.isGambleAgain),
            isGamblingWaitingSpin: false
          }
        };
        roomMysteryQuests.set(room.id, settledGambleState);
        io2.to(`room:${room.code}`).emit("game:mystery:update", settledGambleState);
        const refreshedState = await buildRoomState(room.id);
        io2.to(`room:${room.code}`).emit("room:state", refreshedState);
        setTimeout(async () => {
          const currentQuest = roomMysteryQuests.get(room.id);
          if (currentQuest && currentQuest.tarotState?.isRevealPending) {
            await executeMysteryTarotReveal(room, currentQuest);
          }
        }, 2200);
      }, dur + 100);
    };
    const executeMysteryDrawTarot = async (room, questState, team) => {
      await executeMysterySpinTarotWheel(room, questState, team, 50);
    };
    socket.on("game:mystery:spin_tarot_wheel", async ({ powerPercent = 50, code } = {}) => {
      const playerId = playerSockets.get(socket.id);
      let room = null;
      let playerTeamId = null;
      if (playerId) {
        const player = await prisma.player.findUnique({
          where: { id: playerId },
          include: { room: true }
        });
        if (player?.room) {
          room = player.room;
          playerTeamId = player.teamId;
        }
      }
      if (!room && code) {
        room = await getAdminRoom(socket, code);
      }
      if (!room || room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      if (!questState || questState.miniGameType !== "TAROT_DESTINY") return;
      if (playerTeamId && !code && questState.currentTurnTeamId !== playerTeamId) {
        socket.emit("error", "Ch\u01B0a \u0111\u1EBFn l\u01B0\u1EE3t quay c\u1EE7a \u0111\u1ED9i b\u1EA1n!");
        return;
      }
      await executeMysterySpinTarotWheel(room, questState, questState.currentTurnTeamId, powerPercent);
    });
    socket.on("admin:mystery:spin_tarot_wheel", async ({ powerPercent = 50, code } = {}) => {
      const room = await getAdminRoom(socket, code);
      if (!room || room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      if (!questState || questState.miniGameType !== "TAROT_DESTINY") return;
      await executeMysterySpinTarotWheel(room, questState, questState.currentTurnTeamId, powerPercent);
    });
    socket.on("ancient-tarot-reveal", async ({ code } = {}) => {
      const playerId = playerSockets.get(socket.id);
      let room = null;
      if (playerId) {
        const player = await prisma.player.findUnique({
          where: { id: playerId },
          include: { room: true }
        });
        if (player?.room) room = player.room;
      }
      if (!room && code) {
        room = await getAdminRoom(socket, code);
      }
      if (!room || room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      if (!questState || questState.miniGameType !== "TAROT_DESTINY") return;
      await executeMysteryTarotReveal(room, questState);
    });
    socket.on("game:mystery:ancient_tarot_reveal", async ({ code } = {}) => {
      const playerId = playerSockets.get(socket.id);
      let room = null;
      if (playerId) {
        const player = await prisma.player.findUnique({
          where: { id: playerId },
          include: { room: true }
        });
        if (player?.room) room = player.room;
      }
      if (!room && code) {
        room = await getAdminRoom(socket, code);
      }
      if (!room || room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      if (!questState || questState.miniGameType !== "TAROT_DESTINY") return;
      await executeMysteryTarotReveal(room, questState);
    });
    socket.on("admin:mystery:ancient_tarot_reveal", async ({ code } = {}) => {
      const room = await getAdminRoom(socket, code);
      if (!room || room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      if (!questState || questState.miniGameType !== "TAROT_DESTINY") return;
      await executeMysteryTarotReveal(room, questState);
    });
    socket.on("ancient-tarot-respin", async ({ code } = {}) => {
      const playerId = playerSockets.get(socket.id);
      let room = null;
      if (playerId) {
        const player = await prisma.player.findUnique({
          where: { id: playerId },
          include: { room: true }
        });
        if (player?.room) room = player.room;
      }
      if (!room && code) {
        room = await getAdminRoom(socket, code);
      }
      if (!room || room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      if (!questState || questState.miniGameType !== "TAROT_DESTINY") return;
      await executeMysteryTarotRespin(room, questState);
    });
    socket.on("game:mystery:ancient_tarot_respin", async ({ code } = {}) => {
      const playerId = playerSockets.get(socket.id);
      let room = null;
      if (playerId) {
        const player = await prisma.player.findUnique({
          where: { id: playerId },
          include: { room: true }
        });
        if (player?.room) room = player.room;
      }
      if (!room && code) {
        room = await getAdminRoom(socket, code);
      }
      if (!room || room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      if (!questState || questState.miniGameType !== "TAROT_DESTINY") return;
      await executeMysteryTarotRespin(room, questState);
    });
    socket.on("admin:mystery:ancient_tarot_respin", async ({ code } = {}) => {
      const room = await getAdminRoom(socket, code);
      if (!room || room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      if (!questState || questState.miniGameType !== "TAROT_DESTINY") return;
      await executeMysteryTarotRespin(room, questState);
    });
    socket.on("ancient-tarot-gamble-prepare", async ({ code } = {}) => {
      const playerId = playerSockets.get(socket.id);
      let room = null;
      if (playerId) {
        const player = await prisma.player.findUnique({
          where: { id: playerId },
          include: { room: true }
        });
        if (player?.room) room = player.room;
      }
      if (!room && code) {
        room = await getAdminRoom(socket, code);
      }
      if (!room || room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      if (!questState || questState.miniGameType !== "TAROT_DESTINY") return;
      await executeMysteryTarotGamblePrepare(room, questState);
    });
    socket.on("game:mystery:ancient_tarot_gamble_prepare", async ({ code } = {}) => {
      const playerId = playerSockets.get(socket.id);
      let room = null;
      if (playerId) {
        const player = await prisma.player.findUnique({
          where: { id: playerId },
          include: { room: true }
        });
        if (player?.room) room = player.room;
      }
      if (!room && code) {
        room = await getAdminRoom(socket, code);
      }
      if (!room || room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      if (!questState || questState.miniGameType !== "TAROT_DESTINY") return;
      await executeMysteryTarotGamblePrepare(room, questState);
    });
    socket.on("admin:mystery:ancient_tarot_gamble_prepare", async ({ code } = {}) => {
      const room = await getAdminRoom(socket, code);
      if (!room || room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      if (!questState || questState.miniGameType !== "TAROT_DESTINY") return;
      await executeMysteryTarotGamblePrepare(room, questState);
    });
    socket.on("ancient-tarot-gamble-decision", async ({ spinAgain = false, powerPercent = 50, code } = {}) => {
      const playerId = playerSockets.get(socket.id);
      let room = null;
      if (playerId) {
        const player = await prisma.player.findUnique({
          where: { id: playerId },
          include: { room: true }
        });
        if (player?.room) room = player.room;
      }
      if (!room && code) {
        room = await getAdminRoom(socket, code);
      }
      if (!room || room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      if (!questState || questState.miniGameType !== "TAROT_DESTINY") return;
      await executeMysteryTarotGambleDecision(room, questState, questState.currentTurnTeamId, spinAgain, powerPercent);
    });
    socket.on("game:mystery:ancient_tarot_gamble_decision", async ({ spinAgain = false, powerPercent = 50, code } = {}) => {
      const playerId = playerSockets.get(socket.id);
      let room = null;
      if (playerId) {
        const player = await prisma.player.findUnique({
          where: { id: playerId },
          include: { room: true }
        });
        if (player?.room) room = player.room;
      }
      if (!room && code) {
        room = await getAdminRoom(socket, code);
      }
      if (!room || room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      if (!questState || questState.miniGameType !== "TAROT_DESTINY") return;
      await executeMysteryTarotGambleDecision(room, questState, questState.currentTurnTeamId, spinAgain, powerPercent);
    });
    socket.on("admin:mystery:ancient_tarot_gamble_decision", async ({ spinAgain = false, powerPercent = 50, code } = {}) => {
      const room = await getAdminRoom(socket, code);
      if (!room || room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      if (!questState || questState.miniGameType !== "TAROT_DESTINY") return;
      await executeMysteryTarotGambleDecision(room, questState, questState.currentTurnTeamId, spinAgain, powerPercent);
    });
    socket.on("game:mystery:draw_tarot", async () => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: true }
      });
      if (!player || !player.room || !player.teamId) return;
      const room = player.room;
      if (room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      if (!questState || questState.miniGameType !== "TAROT_DESTINY") return;
      if (questState.currentTurnTeamId !== player.teamId) {
        socket.emit("error", "Ch\u01B0a \u0111\u1EBFn l\u01B0\u1EE3t r\xFAt b\xE0i c\u1EE7a \u0111\u1ED9i b\u1EA1n!");
        return;
      }
      const team = await prisma.team.findUnique({ where: { id: player.teamId } });
      if (!team) return;
      await executeMysteryDrawTarot(room, questState, team);
    });
    socket.on("admin:mystery:draw_tarot", async ({ code } = {}) => {
      const room = await getAdminRoom(socket, code);
      if (!room || room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      if (!questState || questState.miniGameType !== "TAROT_DESTINY") return;
      const team = await prisma.team.findUnique({ where: { id: questState.currentTurnTeamId } });
      if (!team) return;
      await executeMysteryDrawTarot(room, questState, team);
    });
    socket.on("game:mystery:steal_buzz", async () => {
      if (!checkActionDebounce(socket.id, 150)) return;
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      let session = socketPlayerSessions.get(socket.id) || playerSessions.get(playerId);
      if (!session) {
        const player = await prisma.player.findUnique({
          where: { id: playerId },
          include: { room: true, team: true }
        });
        if (!player || !player.room || !player.teamId) return;
        session = {
          playerId: player.id,
          playerName: player.name,
          roomId: player.room.id,
          roomCode: player.room.code,
          teamId: player.teamId,
          teamName: player.team?.name ?? player.name,
          roomMode: player.room.mode,
          teamMode: player.room.teamMode
        };
        socketPlayerSessions.set(socket.id, session);
        playerSessions.set(player.id, session);
      }
      if (session.roomMode !== "MYSTERY_QUEST" || !session.teamId) return;
      const questState = roomMysteryQuests.get(session.roomId);
      if (!questState || questState.phase !== "STEAL_PHASE" || questState.stealBuzzedTeamId) return;
      if (questState.currentTurnTeamId === session.teamId) return;
      questState.stealBuzzedTeamId = session.teamId;
      questState.stealBuzzedTeamName = session.teamName || "\u0110\u1ED9i c\u01B0\u1EDBp";
      questState.phase = "PUSH_YOUR_LUCK";
      questState.currentTurnTeamId = session.teamId;
      questState.currentTurnTeamName = session.teamName || "\u0110\u1ED9i c\u01B0\u1EDBp";
      questState.potPoints = 15;
      roomMysteryQuests.set(session.roomId, questState);
      io2.to(`room:${session.roomCode}`).emit("game:mystery:update", questState);
      io2.to(`room:${session.roomCode}`).emit("game:mystery:steal_buzzed", {
        teamId: session.teamId,
        teamName: session.teamName || "\u0110\u1ED9i c\u01B0\u1EDBp",
        timeLimit: 15
      });
    });
    socket.on("admin:mystery:steal_buzz", async ({ targetTeamId } = {}) => {
      const room = await getAdminRoom(socket);
      if (!room || room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      if (!questState || questState.phase !== "STEAL_PHASE" || questState.stealBuzzedTeamId) return;
      const teams = await prisma.team.findMany({ where: { roomId: room.id } });
      const otherTeams = teams.filter((t) => t.id !== questState.currentTurnTeamId);
      const team = (targetTeamId ? teams.find((t) => t.id === targetTeamId) : null) || otherTeams[0];
      if (!team) return;
      questState.stealBuzzedTeamId = team.id;
      questState.stealBuzzedTeamName = team.name;
      questState.phase = "PUSH_YOUR_LUCK";
      questState.currentTurnTeamId = team.id;
      questState.currentTurnTeamName = team.name;
      questState.currentTurnTeamColor = team.color;
      questState.potPoints = 15;
      roomMysteryQuests.set(room.id, questState);
      io2.to(`room:${room.code}`).emit("game:mystery:update", questState);
      io2.to(`room:${room.code}`).emit("game:mystery:steal_buzzed", {
        teamId: team.id,
        teamName: team.name,
        timeLimit: 15
      });
    });
    socket.on("admin:mystery:advance_turn", async (payload) => {
      const room = await getAdminRoom(socket, payload?.code);
      if (!room || room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      if (!questState) return;
      await executeMysteryAdvanceTurn(room, questState);
    });
    socket.on("admin:mystery:set_minigame_type", async ({ miniGameType, code }) => {
      const room = await getAdminRoom(socket, code);
      if (!room || room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      if (!questState) return;
      const teams = await prisma.team.findMany({ where: { roomId: room.id }, orderBy: { createdAt: "asc" } });
      const currentTeam = teams.find((t) => t.id === questState.currentTurnTeamId) || teams[0] || { id: "t1", name: "\u0110\u1ED9i 1" };
      const newStage = generateMysteryStageForTurn({
        turnIndex: questState.currentTurnIndex,
        currentTeam,
        teams,
        turnsPerTeam: questState.turnsPerTeam,
        prevTheme: questState.theme,
        forcedMiniGameType: miniGameType,
        baseQuestionPoints: questState.baseQuestionPoints,
        initialHeartsPerTeam: questState.initialHeartsPerTeam,
        teamHearts: questState.teamHearts,
        timesStolenInCycle: questState.timesStolenInCycle,
        consecutiveBombsByTeam: questState.consecutiveBombsByTeam
      });
      newStage.phase = questState.phase;
      newStage.potPoints = questState.potPoints;
      if (questState.promoPerk) newStage.promoPerk = questState.promoPerk;
      if (questState.hasShield !== void 0) newStage.hasShield = questState.hasShield;
      if (questState.teamHearts) newStage.teamHearts = questState.teamHearts;
      if (questState.initialHeartsPerTeam !== void 0) newStage.initialHeartsPerTeam = questState.initialHeartsPerTeam;
      if (questState.timesStolenInCycle) newStage.timesStolenInCycle = questState.timesStolenInCycle;
      if (questState.consecutiveBombsByTeam) newStage.consecutiveBombsByTeam = questState.consecutiveBombsByTeam;
      roomMysteryQuests.set(room.id, newStage);
      io2.to(`room:${room.code}`).emit("game:mystery:update", newStage);
      const refreshedState = await buildRoomState(room.id);
      io2.to(`room:${room.code}`).emit("room:state", refreshedState);
    });
    const executeMysteryChooseStealTarget = async (room, questState, targetTeamId) => {
      const allTeams = await prisma.team.findMany({
        where: { roomId: room.id },
        select: { id: true, name: true, color: true, score: true, isEliminated: true }
      });
      const { updatedState, victimTeamId, stolenPoints, finalScoreDelta } = handleChooseStealTarget({
        state: questState,
        targetTeamId,
        allTeams
      });
      roomMysteryQuests.set(room.id, updatedState);
      io2.to(`room:${room.code}`).emit("game:mystery:update", updatedState);
      if (victimTeamId && stolenPoints > 0 && finalScoreDelta > 0) {
        const victimDelta = await applyScoreDeltaToTeam(victimTeamId, -stolenPoints);
        const stealerDelta = await applyScoreDeltaToTeam(updatedState.currentTurnTeamId, finalScoreDelta);
        io2.to(`room:${room.code}`).emit("game:score:update", [
          { teamId: victimTeamId, score: victimDelta.newScore, delta: victimDelta.effectiveDelta },
          { teamId: updatedState.currentTurnTeamId, score: stealerDelta.newScore, delta: stealerDelta.effectiveDelta }
        ]);
      }
      const refreshedState = await buildRoomState(room.id);
      io2.to(`room:${room.code}`).emit("room:state", refreshedState);
    };
    socket.on("game:mystery:choose_steal_target", async ({ targetTeamId }) => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: true }
      });
      if (!player || !player.room || !player.teamId) return;
      const room = player.room;
      if (room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      if (!questState || questState.phase !== "STEAL_TARGET_SELECT") return;
      if (questState.currentTurnTeamId !== player.teamId) {
        socket.emit("error", "Ch\u01B0a \u0111\u1EBFn l\u01B0\u1EE3t l\u1EF1a ch\u1ECDn c\u1EE7a \u0111\u1ED9i b\u1EA1n!");
        return;
      }
      await executeMysteryChooseStealTarget(room, questState, targetTeamId);
    });
    socket.on("admin:mystery:choose_steal_target", async (payload) => {
      const room = await getAdminRoom(socket, payload?.code);
      if (!room || room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;
      const questState = roomMysteryQuests.get(room.id);
      if (!questState || questState.phase !== "STEAL_TARGET_SELECT") return;
      await executeMysteryChooseStealTarget(room, questState, payload.targetTeamId);
    });
    socket.on("admin:sandbox:adjust_score", async ({ teamId, delta, setScore, code }) => {
      const room = await getAdminRoom(socket, code);
      if (!room) return;
      const team = await prisma.team.findUnique({ where: { id: teamId } });
      if (!team) return;
      let newScore = team.score;
      let effectiveDelta = 0;
      if (typeof setScore === "number") {
        newScore = Math.max(0, setScore);
        effectiveDelta = newScore - team.score;
      } else if (typeof delta === "number") {
        newScore = Math.max(0, team.score + delta);
        effectiveDelta = newScore - team.score;
      }
      await prisma.team.update({
        where: { id: teamId },
        data: { score: newScore }
      });
      io2.to(`room:${room.code}`).emit("game:score:update", [
        { teamId, score: newScore, delta: effectiveDelta }
      ]);
      const updatedState = await buildRoomState(room.id);
      io2.to(`room:${room.code}`).emit("room:state", updatedState);
    });
    socket.on("admin:sandbox:set_active_team", async ({ teamId, teamIndex, code }) => {
      const room = await getAdminRoom(socket, code);
      if (!room) return;
      roomSandboxActiveTeam.set(room.id, teamId);
      console.log(`[admin:sandbox:set_active_team] Room ${room.code} active human team set to ${teamId} (index ${teamIndex})`);
      for (const [, sess] of socketPlayerSessions.entries()) {
        if (sess.roomId === room.id && (sess.playerId.startsWith("sb_") || sess.playerId.startsWith("p_sb_") || sess.playerName.includes("Tester"))) {
          sess.teamId = teamId;
        }
      }
      for (const [, sess] of playerSessions.entries()) {
        if (sess.roomId === room.id && (sess.playerId.startsWith("sb_") || sess.playerId.startsWith("p_sb_") || sess.playerName.includes("Tester"))) {
          sess.teamId = teamId;
        }
      }
      await prisma.player.updateMany({
        where: {
          roomId: room.id,
          isHost: false,
          OR: [
            { name: { contains: "Tester" } },
            { id: { startsWith: "sb_" } },
            { id: { startsWith: "p_sb_" } }
          ]
        },
        data: { teamId }
      }).catch(() => {
      });
      const refState = await buildRoomState(room.id);
      io2.to(`room:${room.code}`).emit("room:state", refState);
    });
    socket.on("admin:teams:set_initial_scores", async ({ defaultScore, teamScores, code }, callback) => {
      try {
        const room = await getAdminRoom(socket, code);
        if (!room) {
          if (callback) callback({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y ph\xF2ng ho\u1EB7c kh\xF4ng c\xF3 quy\u1EC1n Admin" });
          return;
        }
        const scoreUpdates = [];
        const teams = await prisma.team.findMany({ where: { roomId: room.id } });
        for (const t of teams) {
          let targetScore = t.score;
          if (typeof defaultScore === "number") {
            targetScore = Math.max(0, defaultScore);
          }
          if (teamScores && typeof teamScores[t.id] === "number") {
            targetScore = Math.max(0, teamScores[t.id]);
          }
          if (targetScore !== t.score) {
            const effectiveDelta = targetScore - t.score;
            await prisma.team.update({
              where: { id: t.id },
              data: { score: targetScore }
            });
            scoreUpdates.push({ teamId: t.id, score: targetScore, delta: effectiveDelta });
          }
        }
        if (typeof defaultScore === "number") {
          const config = room.config || {};
          await prisma.room.update({
            where: { id: room.id },
            data: { config: { ...config, initialTeamScore: Math.max(0, defaultScore) } }
          });
        }
        if (scoreUpdates.length > 0) {
          io2.to(`room:${room.code}`).emit("game:score:update", scoreUpdates);
        }
        const updatedState = await buildRoomState(room.id);
        io2.to(`room:${room.code}`).emit("room:state", updatedState);
        if (callback) callback({ success: true });
      } catch (err) {
        console.error("[admin:teams:set_initial_scores]", err);
        if (callback) callback({ success: false, error: "L\u1ED7i h\u1EC7 th\u1ED1ng khi c\u1EADp nh\u1EADt \u0111i\u1EC3m" });
      }
    });
    socket.on("admin:team:update_score", async ({ teamId, score, code }, callback) => {
      try {
        const room = await getAdminRoom(socket, code);
        if (!room) {
          if (callback) callback({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y ph\xF2ng ho\u1EB7c kh\xF4ng c\xF3 quy\u1EC1n Admin" });
          return;
        }
        const team = await prisma.team.findUnique({ where: { id: teamId } });
        if (!team || team.roomId !== room.id) {
          if (callback) callback({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y \u0111\u1ED9i trong ph\xF2ng n\xE0y" });
          return;
        }
        const newScore = Math.max(0, score);
        const effectiveDelta = newScore - team.score;
        await prisma.team.update({
          where: { id: teamId },
          data: { score: newScore }
        });
        io2.to(`room:${room.code}`).emit("game:score:update", [
          { teamId, score: newScore, delta: effectiveDelta }
        ]);
        const updatedState = await buildRoomState(room.id);
        io2.to(`room:${room.code}`).emit("room:state", updatedState);
        if (callback) callback({ success: true });
      } catch (err) {
        console.error("[admin:team:update_score]", err);
        if (callback) callback({ success: false, error: "L\u1ED7i h\u1EC7 th\u1ED1ng khi c\u1EADp nh\u1EADt \u0111i\u1EC3m \u0111\u1ED9i" });
      }
    });
    socket.on("admin:tournament:advance", async () => {
      const room = await getAdminRoom(socket);
      if (!room || room.mode !== "TOURNAMENT") return;
      const tournament = roomTournaments.get(room.id);
      if (!tournament) return;
      const nextPending = tournament.matches.find((m) => m.status === "UPCOMING" && m.team1Id && m.team2Id);
      if (nextPending) {
        nextPending.status = "IN_PROGRESS";
        tournament.currentMatchId = nextPending.id;
        tournament.activeRecapMatchId = void 0;
        tournament.recapCountdownSeconds = void 0;
        io2.to(`room:${room.code}`).emit("game:tournament:update", tournament);
      }
    });
    socket.on("tournament:predict", async ({ matchId, predictedWinnerId }) => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: true, team: true }
      });
      if (!player || !player.room || player.room.mode !== "TOURNAMENT") return;
      const tournament = roomTournaments.get(player.room.id);
      if (!tournament) return;
      const match = tournament.matches.find((m) => m.id === matchId);
      if (!match || match.status === "COMPLETED") return;
      const teamId = player.teamId;
      if (!teamId) return;
      if (teamId === match.team1Id || teamId === match.team2Id) return;
      match.predictions = match.predictions || {};
      match.predictions[teamId] = predictedWinnerId;
      io2.to(`room:${player.room.code}`).emit("game:tournament:update", tournament);
    });
    socket.on("tournament:cheer", async ({ matchId, targetTeamId, emoji }) => {
      const playerId = playerSockets.get(socket.id);
      let roomCode;
      let roomId;
      if (playerId) {
        const player = await prisma.player.findUnique({
          where: { id: playerId },
          select: { roomId: true, room: { select: { code: true, mode: true } } }
        });
        if (player?.room?.mode === "TOURNAMENT") {
          roomId = player.roomId;
          roomCode = player.room.code;
        }
      } else {
        roomId = adminSockets.get(socket.id);
        if (roomId) {
          const room = await prisma.room.findUnique({
            where: { id: roomId },
            select: { code: true, mode: true }
          });
          if (room?.mode === "TOURNAMENT") {
            roomCode = room.code;
          }
        }
      }
      if (!roomId || !roomCode) return;
      const tournament = roomTournaments.get(roomId);
      if (!tournament) return;
      const match = tournament.matches.find((m) => m.id === matchId) || tournament.matches.find((m) => m.id === tournament.currentMatchId);
      if (!match) return;
      match.cheers = match.cheers || { countA: 0, countB: 0 };
      if (targetTeamId === match.team1Id) {
        match.cheers.countA = (match.cheers.countA || 0) + 1;
      } else if (targetTeamId === match.team2Id) {
        match.cheers.countB = (match.cheers.countB || 0) + 1;
      }
      tournament.cheers = match.cheers;
      const countA = match.cheers.countA;
      const countB = match.cheers.countB;
      const total = countA + countB;
      const percentA = total > 0 ? Math.round(countA / total * 100) : 50;
      const percentB = 100 - percentA;
      io2.to(`room:${roomCode}`).emit("tournament:cheer:broadcast", {
        matchId: match.id,
        targetTeamId,
        emoji: emoji || "\u{1F525}",
        countA,
        countB,
        percentA,
        percentB
      });
    });
    socket.on("admin:wager:skip_timer", async () => {
      const room = await getAdminRoom(socket);
      if (!room || room.mode !== "WAGER") return;
      const wagerState = roomWagers.get(room.id);
      if (!wagerState || wagerState.phase !== "WAGER_PERIOD") return;
      const wTimer = roomWagerTimers.get(room.id);
      if (wTimer) {
        clearTimeout(wTimer);
        clearInterval(wTimer);
        roomWagerTimers.delete(room.id);
      }
      await assignDefaultWagerTeamIfNone(room.id, wagerState);
      wagerState.phase = "QUESTION_PERIOD";
      wagerState.questionReady = false;
      wagerState.wagerTimeRemaining = 0;
      io2.to(`room:${room.code}`).emit("game:wager:update", wagerState);
      scheduleWagerAutoLaunch(io2, room.id, room.code);
    });
    socket.on("admin:wager:launch_question", async () => {
      const room = await getAdminRoom(socket);
      if (!room || room.mode !== "WAGER" || room.status !== "PLAYING") return;
      await launchWagerQuestion(io2, room.id, room.code);
    });
    socket.on("admin:wager:grant_bailout", async ({ teamId }) => {
      const room = await getAdminRoom(socket);
      if (!room || room.mode !== "WAGER") return;
      const wagerState = roomWagers.get(room.id);
      if (!wagerState) return;
      if (wagerState.currentQuestionBailoutUsed) {
        socket.emit("error", "Ch\u1EC9 c\xF3 th\u1EC3 k\xEDch ho\u1EA1t tr\u1EE3 c\u1EA5p cho 1 \u0111\u1ED9i trong m\u1ED7i c\xE2u h\u1ECFi! Vui l\xF2ng \u0111\u1EE3i c\xE2u ti\u1EBFp theo.");
        return;
      }
      if (!wagerState.bailoutQueue || wagerState.bailoutQueue.length === 0) {
        socket.emit("error", "Hi\u1EC7n kh\xF4ng c\xF3 \u0111\u1ED9i n\xE0o trong h\xE0ng \u0111\u1EE3i tr\u1EE3 c\u1EA5p!");
        return;
      }
      const topQueueItem = wagerState.bailoutQueue[0];
      if (topQueueItem.teamId !== teamId) {
        socket.emit("error", `Ph\u1EA3i \u01B0u ti\xEAn tr\u1EE3 c\u1EA5p theo th\u1EE9 t\u1EF1 r\u1EDDi cu\u1ED9c ch\u01A1i s\u1EDBm h\u01A1n: \u0110\u1ED9i ${topQueueItem.teamName} (r\u1EDDi cu\u1ED9c ch\u01A1i t\u1EA1i c\xE2u ${topQueueItem.questionIndex}) c\u1EA7n \u0111\u01B0\u1EE3c c\u1EE9u tr\u01B0\u1EDBc!`);
        return;
      }
      const team = await prisma.team.findUnique({ where: { id: teamId } });
      if (!team || team.score > 0) return;
      const config = room.config || {};
      const bailoutMax = config?.wagerBailoutLimit ?? 1;
      const bailoutInfo = wagerState.teamBailouts?.[teamId] ?? { remaining: bailoutMax, max: bailoutMax };
      if (bailoutInfo.remaining <= 0) {
        socket.emit("error", "\u0110\u1ED9i n\xE0y \u0111\xE3 h\u1EBFt l\u01B0\u1EE3t tr\u1EE3 c\u1EA5p!");
        return;
      }
      const allTeams = await prisma.team.findMany({ where: { roomId: room.id } });
      const positiveScores = allTeams.filter((t) => t.score > 0).map((t) => t.score);
      if (positiveScores.length < 1) {
        socket.emit("error", "\u0110i\u1EC1u ki\u1EC7n d\xF9ng tr\u1EE3 c\u1EA5p kh\xF4ng th\u1ECFa m\xE3n: C\u1EA7n c\xF2n \xEDt nh\u1EA5t 2 \u0111\u1ED9i c\xF2n s\u1ED1ng (t\xEDnh c\u1EA3 \u0111\u1ED9i nh\u1EADn tr\u1EE3 c\u1EA5p)!");
        return;
      }
      const lowestPositiveScore = Math.min(...positiveScores);
      await prisma.team.update({
        where: { id: teamId },
        data: { score: lowestPositiveScore }
      });
      bailoutInfo.remaining--;
      if (!wagerState.teamBailouts) wagerState.teamBailouts = {};
      wagerState.teamBailouts[teamId] = bailoutInfo;
      wagerState.bailoutQueue.shift();
      wagerState.currentQuestionBailoutUsed = true;
      io2.to(`room:${room.code}`).emit("game:score:update", [
        { teamId, score: lowestPositiveScore, delta: lowestPositiveScore - team.score }
      ]);
      io2.to(`room:${room.code}`).emit("game:wager:bailout_granted", {
        teamId,
        teamName: team.name,
        newScore: lowestPositiveScore,
        bailoutsRemaining: bailoutInfo.remaining
      });
      io2.to(`room:${room.code}`).emit("game:wager:update", wagerState);
    });
    socket.on("admin:wager:set_bailout_limit", async ({ limit }) => {
      const room = await getAdminRoom(socket);
      if (!room || room.mode !== "WAGER") return;
      const newLimit = Math.max(1, Math.min(10, limit));
      const config = room.config || {};
      config.wagerBailoutLimit = newLimit;
      await prisma.room.update({
        where: { id: room.id },
        data: { config }
      });
      const wagerState = roomWagers.get(room.id);
      if (wagerState) {
        if (!wagerState.teamBailouts) wagerState.teamBailouts = {};
        const teams = await prisma.team.findMany({ where: { roomId: room.id } });
        teams.forEach((t) => {
          const cur = wagerState.teamBailouts[t.id];
          if (cur) {
            const used = Math.max(0, cur.max - cur.remaining);
            cur.max = newLimit;
            cur.remaining = Math.max(0, newLimit - used);
          } else {
            wagerState.teamBailouts[t.id] = { remaining: newLimit, max: newLimit };
          }
        });
        io2.to(`room:${room.code}`).emit("game:wager:update", wagerState);
        const roomState = await buildRoomState(room.id);
        io2.to(`room:${room.code}`).emit("room:state", roomState);
      }
    });
    socket.on("admin:room:update_config", async ({ key, value, code }) => {
      const room = await getAdminRoom(socket, code);
      if (!room) return;
      const config = room.config || {};
      config[key] = value;
      if (key === "matchMaxQuestions") {
        const teams = await prisma.team.findMany({ where: { roomId: room.id } });
        const derived = calculateModeDerivedConfig(room.mode, Number(value) || 0, teams.length || 4);
        Object.assign(config, derived);
      }
      await prisma.room.update({
        where: { id: room.id },
        data: { config }
      });
      room.config = config;
      roomCache.set(room.id, room);
      if (key === "wagerMultiplierCap" && room.mode === "WAGER") {
        const wagerState = roomWagers.get(room.id);
        if (wagerState) {
          const rawMult = Number(value) || 2.5;
          const newMult = Math.max(1, Math.min(3, rawMult));
          const basePts = wagerState.baseQuestionPoints || 20;
          wagerState.wagerMultiplierCap = newMult;
          wagerState.maxBetCap = Math.floor(basePts * newMult);
          io2.to(`room:${room.code}`).emit("game:wager:update", wagerState);
        }
      }
      const roomState = await buildRoomState(room.id);
      io2.to(`room:${room.code}`).emit("room:state", roomState);
    });
    socket.on("admin:timer:set", async ({ seconds, code }) => {
      const room = await getAdminRoom(socket, code);
      if (!room) return;
      const key = `${room.id}:timer`;
      if (roomRemainingTimes.has(key)) {
        const newRemaining = Math.max(1, seconds);
        roomRemainingTimes.set(key, newRemaining);
        const newEndsAt = Date.now() + newRemaining * 1e3;
        roomTimerEndsAt.set(room.id, newEndsAt);
        io2.to(`room:${room.code}`).emit("game:timer", {
          remaining: newRemaining,
          total: 30,
          endsAt: newEndsAt,
          serverTime: Date.now()
        });
      }
    });
    socket.on("admin:timer:stop_early", async (payload) => {
      const room = await getAdminRoom(socket, payload?.code);
      if (!room || room.status !== "PLAYING") return;
      const activeQ = roomActiveQuestions.get(room.id);
      const questions = await getRoomQuestions(room.id);
      const q = (activeQ ? questions.find((item) => item.id === activeQ.question.id) || activeQ.question : null) || questions[room.currentQuestion];
      if (q) {
        await finalizeQuestionOnTimeUp(io2, room.id, room.code, q.id);
      }
    });
    socket.on("game:answer:stop_early", async ({ questionId, answer }) => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: true }
      });
      if (!player?.room || player.room.status !== "PLAYING") return;
      if (!player.isHost) {
        return;
      }
      if (answer !== void 0) {
        await processAnswerSubmission({
          io: io2,
          roomId: player.room.id,
          questionId,
          playerId,
          teamId: player.teamId ?? void 0,
          answer,
          isAdminOverride: false,
          socket
        });
      }
      await finalizeQuestionOnTimeUp(io2, player.room.id, player.room.code, questionId);
    });
    socket.on("game:answer:finalize", async ({ questionId, answer, teamId }) => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findFirst({
        where: {
          OR: [
            { id: playerId },
            { socketId: socket.id }
          ]
        },
        include: { room: true, team: true }
      });
      if (!player?.room || player.room.status !== "PLAYING") return;
      const room = player.room;
      const qKey = `${room.id}:${questionId}`;
      const sess = socketPlayerSessions.get(socket.id) || playerSessions.get(playerId);
      let effectiveTeamId = teamId || sess?.teamId || player.teamId;
      if (!effectiveTeamId && (playerId.startsWith("p_sb_") || playerId.startsWith("sb_") || player.name.includes("Tester"))) {
        const activeSb = roomSandboxActiveTeam.get(room.id);
        effectiveTeamId = activeSb || null;
        if (!effectiveTeamId && isSandboxRoomEntity(room)) {
          const match = playerId.match(/_t(\d+)/);
          if (match) {
            const rawIdx = parseInt(match[1], 10);
            const teams = await prisma.team.findMany({ where: { roomId: room.id }, orderBy: { createdAt: "asc" } });
            effectiveTeamId = (rawIdx < teams.length ? teams[rawIdx]?.id : void 0) || (rawIdx >= 1 && rawIdx <= teams.length ? teams[rawIdx - 1]?.id : void 0) || null;
          }
        }
        if (!effectiveTeamId) {
          const firstTeam = await prisma.team.findFirst({ where: { roomId: room.id }, orderBy: { createdAt: "asc" } });
          effectiveTeamId = firstTeam?.id ?? null;
        }
        if (effectiveTeamId) {
          await prisma.player.update({
            where: { id: player.id },
            data: { teamId: effectiveTeamId }
          }).catch(() => {
          });
        }
      }
      const actorId = effectiveTeamId || player.id;
      if (room.mode === "BOUNCEBACK") {
        const stealInfo = roomStealBuzzed.get(qKey);
        const primary = roomPrimaryTeams.get(qKey);
        if (stealInfo) {
          if (effectiveTeamId !== stealInfo.teamId && actorId !== stealInfo.teamId && player.id !== stealInfo.playerId) {
            socket.emit("error", "Ch\u1EC9 \u0111\u1ED9i c\u01B0\u1EDBp chu\xF4ng m\u1EDBi \u0111\u01B0\u1EE3c ch\u1ED1t \u0111\xE1p \xE1n!");
            return;
          }
        } else if (primary) {
          if (effectiveTeamId !== primary.teamId && actorId !== primary.teamId) {
            socket.emit("error", "Hi\u1EC7n \u0111ang l\xE0 l\u01B0\u1EE3t c\u1EE7a \u0111\u1ED9i ch\xEDnh!");
            return;
          }
        }
      } else if (room.mode === "BUZZ") {
        const buzz = roomBuzzFirst.get(qKey);
        if (!buzz || effectiveTeamId !== buzz.teamId && actorId !== buzz.teamId && player.id !== buzz.playerId) {
          socket.emit("error", "Ch\u1EC9 \u0111\u1ED9i b\u1EA5m chu\xF4ng \u0111\u1EA7u ti\xEAn m\u1EDBi \u0111\u01B0\u1EE3c ch\u1ED1t \u0111\xE1p \xE1n!");
          return;
        }
      } else if (room.mode === "GRID_CARO") {
        const gridState = roomGridCaros.get(room.id);
        if (gridState && effectiveTeamId !== gridState.currentTurnTeamId && actorId !== gridState.currentTurnTeamId) {
          socket.emit("error", "Hi\u1EC7n \u0111ang l\xE0 l\u01B0\u1EE3t c\u1EE7a \u0111\u1ED9i kh\xE1c!");
          return;
        }
      } else if (room.mode === "DICE_RACE") {
        const diceState = roomDiceRaces.get(room.id);
        if (diceState && effectiveTeamId !== diceState.currentTurnTeamId && actorId !== diceState.currentTurnTeamId) {
          socket.emit("error", "Hi\u1EC7n \u0111ang l\xE0 l\u01B0\u1EE3t c\u1EE7a \u0111\u1ED9i kh\xE1c!");
          return;
        }
      } else if (room.mode === "MYSTERY_QUEST") {
        const questState = roomMysteryQuests.get(room.id);
        const turnTid = questState?.currentTurnTeamId;
        if (questState && (questState.phase !== "QUESTION_ACTIVE" || effectiveTeamId !== turnTid && actorId !== turnTid)) {
          socket.emit("error", "Hi\u1EC7n \u0111ang l\xE0 l\u01B0\u1EE3t thi \u0111\u1EA5u c\u1EE7a \u0111\u1ED9i kh\xE1c!");
          return;
        }
      }
      if (answer !== void 0) {
        await processAnswerSubmission({
          io: io2,
          roomId: player.room.id,
          questionId,
          playerId,
          teamId: effectiveTeamId ?? void 0,
          answer,
          isAdminOverride: false,
          socket
        });
      } else {
        await waitForPendingSubmissions(room.id);
      }
      let finSet = roomFinalizedActors.get(qKey);
      if (!finSet) {
        finSet = /* @__PURE__ */ new Set();
        roomFinalizedActors.set(qKey, finSet);
      }
      finSet.add(actorId);
      if (effectiveTeamId) finSet.add(effectiveTeamId);
      if (playerId) finSet.add(playerId);
      const activeParticipants = await getActiveParticipantsForQuestion(room, questionId);
      const finalizedCount = activeParticipants.filter((id) => finSet?.has(id)).length;
      const totalParticipantsCount = activeParticipants.length;
      io2.to(`room:${room.code}`).emit("game:answer:finalized", {
        questionId,
        actorId,
        actorName: player.team?.name || player.name,
        finalizedCount,
        totalParticipantsCount
      });
      const hasPendingHumans = await hasUnfinalizedHumanParticipants(room, questionId, finSet);
      if (!hasPendingHumans && totalParticipantsCount > 0 && finalizedCount >= totalParticipantsCount) {
        const isMcMode = room.config?.answerMethod === "MC";
        if (isMcMode) {
          return;
        }
        stopQuestionTimer(room.id);
        const activeQ = roomActiveQuestions.get(room.id);
        io2.to(`room:${room.code}`).emit("game:timer", { remaining: 0, total: activeQ?.timeLimit || 30, endsAt: Date.now(), serverTime: Date.now() });
        io2.to(`room:${room.code}`).emit("game:timer:expired", { questionId });
        if (room.mode === "BOUNCEBACK") {
          const stealInfo = roomStealBuzzed.get(qKey);
          const primary = roomPrimaryTeams.get(qKey);
          const question = await prisma.question.findUnique({ where: { id: questionId } });
          io2.to(`room:${room.code}`).emit("game:early_completed", {
            questionId,
            reason: "ALL_FINALIZED",
            message: "\u0110\u1ED9i thi \u0111\xE3 ch\u1ED1t \u0111\xE1p \xE1n s\u1EDBm!"
          });
          if (stealInfo && (actorId === stealInfo.teamId || actorId === stealInfo.playerId || player.id === stealInfo.playerId || effectiveTeamId === stealInfo.teamId)) {
            const existingAns = await prisma.answer.findFirst({
              where: {
                roomId: room.id,
                questionId,
                OR: [
                  { teamId: stealInfo.teamId },
                  { playerId: stealInfo.playerId },
                  { playerId: player.id }
                ]
              },
              orderBy: { submittedAt: "desc" }
            });
            const ansArr = existingAns?.answer ? Array.isArray(existingAns.answer) ? existingAns.answer.map(String) : [String(existingAns.answer)] : [];
            const { isAutoCorrect, answerText } = evaluateAnswerCorrectness(question, ansArr);
            if (activeQ) {
              activeQ.bouncebackAwaitingJudgment = "STEAL";
              activeQ.bouncebackStealAnswer = ansArr;
              activeQ.bouncebackAutoCorrect = isAutoCorrect;
              activeQ.bouncebackAnswerText = answerText;
              io2.to(`room:${room.code}`).emit("game:question", activeQ);
            }
            const stealPayload = {
              phase: "STEAL",
              targetTeamId: stealInfo.teamId,
              targetTeamName: stealInfo.teamName,
              answer: ansArr,
              points: roomBouncebackSelectedPoints.get(qKey) ?? 20,
              isAutoCorrect,
              answerText
            };
            io2.to(`room:${room.code}`).emit("game:bounceback:awaiting_judgment", stealPayload);
            io2.to(`room:${room.code}:admin`).emit("game:bounceback:awaiting_judgment", stealPayload);
            return;
          } else if (primary && (actorId === primary.teamId || player.id === primary.teamId || effectiveTeamId === primary.teamId || player.teamId === primary.teamId)) {
            const existingAns = await prisma.answer.findFirst({
              where: {
                roomId: room.id,
                questionId,
                OR: [
                  { teamId: primary.teamId },
                  { playerId: player.id }
                ]
              },
              orderBy: { submittedAt: "desc" }
            });
            const ansArr = existingAns?.answer ? Array.isArray(existingAns.answer) ? existingAns.answer.map(String) : [String(existingAns.answer)] : [];
            const { isAutoCorrect, answerText } = evaluateAnswerCorrectness(question, ansArr);
            if (activeQ) {
              activeQ.bouncebackAwaitingJudgment = "PRIMARY";
              activeQ.bouncebackPrimaryAnswer = ansArr;
              activeQ.bouncebackAutoCorrect = isAutoCorrect;
              activeQ.bouncebackAnswerText = answerText;
              io2.to(`room:${room.code}`).emit("game:question", activeQ);
            }
            const primaryPayload = {
              phase: "PRIMARY",
              targetTeamId: primary.teamId,
              targetTeamName: primary.teamName,
              answer: ansArr,
              points: roomBouncebackSelectedPoints.get(qKey) ?? 20,
              isAutoCorrect,
              answerText
            };
            io2.to(`room:${room.code}`).emit("game:bounceback:awaiting_judgment", primaryPayload);
            io2.to(`room:${room.code}:admin`).emit("game:bounceback:awaiting_judgment", primaryPayload);
            return;
          }
        }
        io2.to(`room:${room.code}`).emit("game:early_completed", {
          questionId,
          reason: "ALL_FINALIZED",
          message: "T\u1EA5t c\u1EA3 c\xE1c \u0111\u1ED9i \u0111\xE3 ch\u1ED1t \u0111\xE1p \xE1n! \u0110ang ki\u1EC3m tra k\u1EBFt qu\u1EA3..."
        });
        setTimeout(async () => {
          await finalizeQuestionOnTimeUp(io2, room.id, room.code, questionId);
        }, 2500);
      }
    });
    socket.on("admin:sandbox:grant:card", async ({ teamId, cardType }) => {
      const room = await getAdminRoom(socket);
      if (!room) return;
      if (room.mode === "MYSTERY_QUEST") {
        socket.emit("error", "Ch\u1EBF \u0111\u1ED9 H\xE0nh Tr\xECnh B\xED \u1EA8n kh\xF4ng h\u1ED7 tr\u1EE3 th\u1EBB b\u1ED5 tr\u1EE3 (Power-up)!");
        return;
      }
      if (!isPowerupAllowedForMode(room.mode, cardType)) {
        socket.emit("error", `Th\u1EBB ${cardType} kh\xF4ng \u0111\u01B0\u1EE3c ph\xE9p s\u1EED d\u1EE5ng trong ch\u1EBF \u0111\u1ED9 ${room.mode}!`);
        return;
      }
      await prisma.powerupCard.create({
        data: {
          type: cardType,
          ownerType: "TEAM",
          roomId: room.id,
          teamId,
          used: false
        }
      });
      const state = await buildRoomState(room.id);
      io2.to(`room:${room.code}`).emit("room:state", state);
    });
    socket.on("tie_breaker:buzz", async () => {
      let session = socketPlayerSessions.get(socket.id);
      if (!session) {
        const playerId = playerSockets.get(socket.id);
        if (playerId) {
          const player = await prisma.player.findUnique({
            where: { id: playerId },
            include: { room: true, team: true }
          });
          if (player && player.room && player.teamId) {
            session = {
              playerId: player.id,
              playerName: player.name,
              roomId: player.room.id,
              roomCode: player.room.code,
              teamId: player.teamId,
              teamName: player.team?.name ?? player.name,
              roomMode: player.room.mode,
              teamMode: player.room.teamMode
            };
            socketPlayerSessions.set(socket.id, session);
            playerSessions.set(player.id, session);
          }
        }
      }
      if (!session || !session.teamId) return;
      const currentRoomId = session.roomId;
      handleTieBreakerBuzz({
        io: io2,
        roomId: currentRoomId,
        teamId: session.teamId,
        teamName: session.teamName || "Th\xED sinh",
        playerName: session.playerName || "Th\xED sinh",
        onGameEnd: async () => {
          const room = await prisma.room.findUnique({ where: { id: currentRoomId } });
          if (!room) return;
          room.status = "FINISHED";
          roomCache.set(room.id, room);
          await prisma.room.update({ where: { id: room.id }, data: { status: "FINISHED", endedAt: /* @__PURE__ */ new Date() } }).catch(console.error);
          const leaderboard = await buildLeaderboard(room.id);
          io2.to(`room:${room.code}`).emit("game:ended", { leaderboard });
          setTimeout(() => cleanupRoomInMemory(currentRoomId), 5e3);
        }
      });
    });
    socket.on("tie_breaker:answer", async ({ optionId }) => {
      let session = socketPlayerSessions.get(socket.id);
      if (!session || !session.teamId) return;
      const currentRoomId = session.roomId;
      handleTieBreakerAnswer({
        io: io2,
        roomId: currentRoomId,
        teamId: session.teamId,
        optionId,
        onGameEnd: async () => {
          const room = await prisma.room.findUnique({ where: { id: currentRoomId } });
          if (!room) return;
          room.status = "FINISHED";
          roomCache.set(room.id, room);
          await prisma.room.update({ where: { id: room.id }, data: { status: "FINISHED", endedAt: /* @__PURE__ */ new Date() } }).catch(console.error);
          const leaderboard = await buildLeaderboard(room.id);
          io2.to(`room:${room.code}`).emit("game:ended", { leaderboard });
          setTimeout(() => cleanupRoomInMemory(currentRoomId), 5e3);
        }
      });
    });
    socket.on("tie_breaker:lucky_pick", async ({ envelopeId }) => {
      let session = socketPlayerSessions.get(socket.id);
      if (!session || !session.teamId) return;
      const currentRoomId = session.roomId;
      handleTieBreakerLuckyPick({
        io: io2,
        roomId: currentRoomId,
        teamId: session.teamId,
        envelopeId,
        onGameEnd: async () => {
          const room = await prisma.room.findUnique({ where: { id: currentRoomId } });
          if (!room) return;
          room.status = "FINISHED";
          roomCache.set(room.id, room);
          await prisma.room.update({ where: { id: room.id }, data: { status: "FINISHED", endedAt: /* @__PURE__ */ new Date() } }).catch(console.error);
          const leaderboard = await buildLeaderboard(room.id);
          io2.to(`room:${room.code}`).emit("game:ended", { leaderboard });
          setTimeout(() => cleanupRoomInMemory(currentRoomId), 5e3);
        }
      });
    });
    socket.on("admin:tie_breaker:advance", async (payload) => {
      const room = await getAdminRoom(socket, payload?.code);
      if (!room) return;
      const tieState = roomTieBreakers.get(room.id);
      if (!tieState) return;
      const onGameEnd = async () => {
        room.status = "FINISHED";
        roomCache.set(room.id, room);
        await prisma.room.update({ where: { id: room.id }, data: { status: "FINISHED", endedAt: /* @__PURE__ */ new Date() } }).catch(console.error);
        const leaderboard = await buildLeaderboard(room.id);
        io2.to(`room:${room.code}`).emit("game:ended", { leaderboard });
        setTimeout(() => cleanupRoomInMemory(room.id), 5e3);
      };
      if (payload?.action === "NEXT_QUESTION") {
        launchTieBreakerQuestion({ io: io2, roomId: room.id, qIndex: tieState.questionIndex + 1, onGameEnd });
      } else if (payload?.action === "START_LUCKY_DRAW") {
        launchTieBreakerLuckyDraw({ io: io2, roomId: room.id, onGameEnd });
      } else if (payload?.action === "FORCE_CHAMPION" && payload.winnerTeamId) {
        tieState.status = "COMPLETED";
        tieState.championTeamId = payload.winnerTeamId;
        const championTeam = tieState.tiedTeams.find((t) => t.id === payload.winnerTeamId);
        tieState.championTeamName = championTeam?.name;
        roomTieBreakers.set(room.id, tieState);
        io2.to(`room:${room.code}`).emit("game:tie_breaker:state", tieState);
        setTimeout(async () => {
          await onGameEnd();
        }, 3e3);
      }
    });
    socket.on("disconnect", async () => {
      adminSockets.delete(socket.id);
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      playerSockets.delete(socket.id);
      socketPlayerSessions.delete(socket.id);
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: true }
      });
      if (!player) return;
      if (player.socketId && player.socketId !== socket.id) {
        return;
      }
      let activeSocketId = null;
      for (const [sockId, pId] of playerSockets.entries()) {
        if (pId === playerId && io2.sockets.sockets.has(sockId)) {
          activeSocketId = sockId;
          break;
        }
      }
      if (activeSocketId) {
        await prisma.player.update({
          where: { id: playerId },
          data: { socketId: activeSocketId }
        }).catch(() => {
        });
        return;
      }
      const existingTimer = pendingDisconnects.get(playerId);
      if (existingTimer) clearTimeout(existingTimer);
      const timer = setTimeout(async () => {
        try {
          pendingDisconnects.delete(playerId);
          let reconnectedSocketId = null;
          for (const [sockId, pId] of playerSockets.entries()) {
            if (pId === playerId && io2.sockets.sockets.has(sockId)) {
              reconnectedSocketId = sockId;
              break;
            }
          }
          if (reconnectedSocketId) {
            await prisma.player.update({
              where: { id: playerId },
              data: { socketId: reconnectedSocketId }
            }).catch(() => {
            });
            return;
          }
          await prisma.player.update({
            where: { id: playerId },
            data: { socketId: null }
          }).catch(() => {
          });
          if (player.room) {
            const roomExists = await prisma.room.findUnique({ where: { id: player.room.id }, select: { id: true } });
            if (roomExists) {
              io2.to(`room:${player.room.code}`).emit("player:left", playerId);
              const state = await buildRoomState(player.room.id);
              io2.to(`room:${player.room.code}`).emit("room:state", state);
            }
          }
        } catch (err) {
          console.error(`[pendingDisconnects] Error in grace period callback for player ${playerId}:`, err);
        }
      }, 3e4);
      pendingDisconnects.set(playerId, timer);
    });
  });
}
async function getActiveParticipantsForQuestion(room, questionId) {
  const qKey = `${room.id}:${questionId}`;
  if (room.mode === "BOUNCEBACK") {
    const steal = roomStealBuzzed.get(qKey);
    if (steal) {
      return [steal.teamId || steal.playerId];
    }
    const primary = roomPrimaryTeams.get(qKey);
    return primary ? [primary.teamId] : [];
  }
  if (room.mode === "BUZZ") {
    const buzz = roomBuzzFirst.get(qKey);
    return buzz ? [buzz.teamId || buzz.playerId] : [];
  }
  if (room.mode === "GRID_CARO") {
    const gridState = roomGridCaros.get(room.id);
    return gridState?.currentTurnTeamId ? [gridState.currentTurnTeamId] : [];
  }
  if (room.mode === "DICE_RACE") {
    const diceState = roomDiceRaces.get(room.id);
    return diceState?.currentTurnTeamId ? [diceState.currentTurnTeamId] : [];
  }
  if (room.mode === "MYSTERY_QUEST") {
    const questState = roomMysteryQuests.get(room.id);
    return questState?.currentTurnTeamId ? [questState.currentTurnTeamId] : [];
  }
  if (room.mode === "TOURNAMENT") {
    const tournament = roomTournaments.get(room.id);
    const currentMatch = tournament?.matches.find((m) => m.id === tournament.currentMatchId);
    return [currentMatch?.team1Id, currentMatch?.team2Id].filter(Boolean);
  }
  if (room.teamMode === "TEAM") {
    const whereClause = { roomId: room.id };
    if (room.mode !== "ELIMINATION") {
      whereClause.isEliminated = false;
    }
    const teams = await prisma.team.findMany({
      where: whereClause
    });
    return teams.map((t) => t.id);
  } else {
    const players = await prisma.player.findMany({
      where: { roomId: room.id, isHost: false }
    });
    return players.map((p) => p.id);
  }
}
function isPlayerBot(p) {
  if (!p) return false;
  if (p.id?.startsWith("p_sb_") || p.id?.startsWith("sb_") || p.name?.includes("Tester")) return false;
  if (p.id?.startsWith("bot_")) return true;
  if (p.name?.includes("\u{1F916}")) return true;
  if (p.name?.toLowerCase().startsWith("bot ")) return true;
  return false;
}
function normalizeTextForComparison(text) {
  if (!text) return "";
  return text.toString().normalize("NFC").toLowerCase().trim().replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/[.,!?;:]+$/, "").replace(/\s+/g, " ");
}
function matchFillBlankText(expectedAnswer, submittedAnswer) {
  const normExpected = normalizeTextForComparison(expectedAnswer);
  const normSubmitted = normalizeTextForComparison(submittedAnswer);
  if (!normExpected || !normSubmitted) return false;
  if (normExpected === normSubmitted) return true;
  const variants = expectedAnswer.split(/[/;|]/).flatMap((part) => {
    if (part.includes(",") && !/\d,\d/.test(part)) {
      return part.split(",");
    }
    return [part];
  }).map((v) => normalizeTextForComparison(v)).filter(Boolean);
  if (variants.includes(normSubmitted)) return true;
  const cleanExpNum = Number(normExpected.replace(",", "."));
  const cleanSubNum = Number(normSubmitted.replace(",", "."));
  if (!isNaN(cleanExpNum) && !isNaN(cleanSubNum) && cleanExpNum === cleanSubNum) {
    return true;
  }
  return false;
}
function matchTrueFalseText(expectedTextOrId, submittedTextOrId) {
  const normExp = normalizeTextForComparison(expectedTextOrId);
  const normSub = normalizeTextForComparison(submittedTextOrId);
  if (normExp === normSub) return true;
  const trueTokens = ["true", "\u0111\xFAng", "dung", "t", "d", "1", "yes", "c\xF3", "co"];
  const falseTokens = ["false", "sai", "f", "s", "0", "no", "kh\xF4ng", "khong"];
  const isExpTrue = trueTokens.includes(normExp);
  const isExpFalse = falseTokens.includes(normExp);
  const isSubTrue = trueTokens.includes(normSub);
  const isSubFalse = falseTokens.includes(normSub);
  if (isExpTrue && isSubTrue) return true;
  if (isExpFalse && isSubFalse) return true;
  return false;
}
async function hasUnfinalizedHumanParticipants(room, questionId, finSet) {
  const activeParticipants = await getActiveParticipantsForQuestion(room, questionId);
  if (activeParticipants.length === 0) return false;
  const players = await prisma.player.findMany({
    where: { roomId: room.id, isHost: false },
    include: { team: true }
  });
  const isSandbox = isSandboxRoomEntity(room);
  const sandboxActiveTeamId = isSandbox ? roomSandboxActiveTeam.get(room.id) : void 0;
  for (const partId of activeParticipants) {
    if (isSandbox && sandboxActiveTeamId && partId === sandboxActiveTeamId) {
      if (!finSet.has(partId)) {
        return true;
      }
      continue;
    }
    const teamPlayers = players.filter((p) => p.teamId === partId);
    if (teamPlayers.length > 0) {
      const humanPlayers = teamPlayers.filter((p) => {
        if (isPlayerBot(p)) return false;
        if (isSandbox) {
          return sandboxActiveTeamId === partId || !p.id.startsWith("bot_") && !p.name?.includes("\u{1F916}") && !!p.socketId;
        }
        return !p.id.startsWith("bot_") && !p.name?.includes("\u{1F916}") && !!p.socketId;
      });
      if (humanPlayers.length > 0) {
        const teamFinalized = finSet.has(partId);
        const anyHumanFinalized = humanPlayers.some((hp) => finSet.has(hp.id));
        if (!teamFinalized && !anyHumanFinalized) {
          return true;
        }
      }
    } else {
      const p = players.find((pl) => pl.id === partId);
      if (p && !isPlayerBot(p) && (isSandbox || !!p.socketId)) {
        if (!finSet.has(partId)) {
          return true;
        }
      }
    }
  }
  return false;
}
function evaluateAnswerCorrectness(question, submittedAnswer) {
  if (!question) {
    return { isAutoCorrect: false, answerText: "(Kh\xF4ng c\xF3 c\xE2u h\u1ECFi)" };
  }
  const options = question.options || [];
  const ansArray = Array.isArray(submittedAnswer) ? submittedAnswer : submittedAnswer !== void 0 && submittedAnswer !== null ? [String(submittedAnswer)] : [];
  if (ansArray.length === 0) {
    return { isAutoCorrect: false, answerText: "(Ch\u01B0a ch\u1ECDn \u0111\xE1p \xE1n / H\u1EBFt gi\u1EDD)" };
  }
  const selectedOptions = options.filter(
    (o) => ansArray.some(
      (ans) => ans === o.id || normalizeTextForComparison(ans) === normalizeTextForComparison(o.id) || normalizeTextForComparison(ans) === normalizeTextForComparison(o.text)
    )
  );
  const answerText = selectedOptions.length > 0 ? selectedOptions.map((o) => `${o.text}`).join(", ") : ansArray.join(", ");
  if (question.type === "ESSAY") {
    return { isAutoCorrect: void 0, answerText };
  }
  let isAutoCorrect = false;
  if (question.type === "MC_SINGLE") {
    const correctOption = options.find((o) => o.isCorrect);
    if (correctOption) {
      const normCorrectId = normalizeTextForComparison(correctOption.id);
      const normCorrectText = normalizeTextForComparison(correctOption.text || "");
      isAutoCorrect = ansArray.some((ans) => {
        const normAns = normalizeTextForComparison(ans);
        return normAns === normCorrectId || normAns === normCorrectText || ans === correctOption.id;
      });
    }
  } else if (question.type === "TRUE_FALSE") {
    const correctOption = options.find((o) => o.isCorrect);
    if (correctOption) {
      const normCorrectId = normalizeTextForComparison(correctOption.id);
      const normCorrectText = normalizeTextForComparison(correctOption.text || "");
      isAutoCorrect = ansArray.some((ans) => {
        const normAns = normalizeTextForComparison(ans);
        return normAns === normCorrectId || normAns === normCorrectText || ans === correctOption.id || matchTrueFalseText(correctOption.text || correctOption.id, ans);
      });
    }
  } else if (question.type === "MC_MULTI") {
    const correctOptions = options.filter((o) => o.isCorrect);
    const correctIds = new Set(correctOptions.map((o) => normalizeTextForComparison(o.id)));
    const correctTexts = new Set(correctOptions.map((o) => normalizeTextForComparison(o.text || "")));
    const submittedNormalized = ansArray.map((ans) => normalizeTextForComparison(ans));
    let matchedCount = 0;
    for (const sub of submittedNormalized) {
      if (correctIds.has(sub) || correctTexts.has(sub)) {
        matchedCount++;
      } else {
        matchedCount = -1;
        break;
      }
    }
    isAutoCorrect = matchedCount === correctOptions.length && correctOptions.length === ansArray.length;
  } else if (question.type === "FILL_BLANK") {
    const expected = question.answer || options.find((o) => o.isCorrect)?.text || "";
    const submitted = ansArray[0] || "";
    isAutoCorrect = matchFillBlankText(expected, submitted);
  } else if (question.type === "MATCHING") {
    const rawPairs = question.pairs || [];
    if (rawPairs.length > 0) {
      let subObj = {};
      if (typeof submittedAnswer === "object" && !Array.isArray(submittedAnswer) && submittedAnswer !== null) {
        subObj = submittedAnswer;
      } else if (typeof ansArray[0] === "object" && ansArray[0] !== null && !Array.isArray(ansArray[0])) {
        subObj = ansArray[0];
      } else if (typeof ansArray[0] === "string") {
        try {
          const parsed = JSON.parse(ansArray[0]);
          if (typeof parsed === "object" && !Array.isArray(parsed) && parsed !== null) {
            subObj = parsed;
          }
        } catch {
        }
      } else if (typeof question.rawSubmission === "object") {
        subObj = question.rawSubmission;
      }
      let allMatched = Object.keys(subObj).length >= rawPairs.length;
      for (let i = 0; i < rawPairs.length; i++) {
        const pair = rawPairs[i];
        const pairId = pair.id || `p${i + 1}`;
        const expectedRight = String.fromCharCode(65 + i);
        const userVal = subObj[pairId] || subObj[`L_${i}`] || subObj[String(i)] || subObj[pair.left];
        const isMatch = userVal === pairId || userVal === expectedRight || userVal === pair.right || normalizeTextForComparison(userVal) === normalizeTextForComparison(pair.right);
        if (!isMatch) {
          allMatched = false;
          break;
        }
      }
      isAutoCorrect = allMatched;
    } else {
      isAutoCorrect = false;
    }
  } else if (question.type === "DRAG_DROP") {
    const correctOrder = options.map((o) => o.id);
    let submittedOrder = [];
    if (Array.isArray(submittedAnswer)) {
      submittedOrder = submittedAnswer;
    } else if (Array.isArray(ansArray[0])) {
      submittedOrder = ansArray[0];
    } else if (typeof ansArray[0] === "string" && ansArray[0].startsWith("[")) {
      try {
        const parsed = JSON.parse(ansArray[0]);
        if (Array.isArray(parsed)) submittedOrder = parsed;
      } catch {
        submittedOrder = ansArray;
      }
    } else {
      submittedOrder = ansArray;
    }
    const cleanSubmitted = submittedOrder.map((x) => typeof x === "string" ? x : String(x?.id || x));
    isAutoCorrect = correctOrder.length === cleanSubmitted.length && correctOrder.every((id, idx) => id === cleanSubmitted[idx]);
  } else if (question.type === "CLOZE_DROPDOWN") {
    const blanks = question.clozeBlanks || options || [];
    if (blanks.length > 0) {
      let subMap = {};
      if (typeof submittedAnswer === "object" && !Array.isArray(submittedAnswer) && submittedAnswer !== null) {
        subMap = submittedAnswer;
      } else if (Array.isArray(submittedAnswer)) {
        submittedAnswer.forEach((v, i) => {
          subMap[String(i + 1)] = typeof v === "string" ? v : v?.id;
        });
      } else if (typeof ansArray[0] === "string" && ansArray[0].startsWith("{")) {
        try {
          subMap = JSON.parse(ansArray[0]);
        } catch {
        }
      } else if (typeof ansArray[0] === "string" && ansArray[0].startsWith("[")) {
        try {
          const arr = JSON.parse(ansArray[0]);
          if (Array.isArray(arr)) arr.forEach((v, i) => {
            subMap[String(i + 1)] = typeof v === "string" ? v : v?.id;
          });
        } catch {
        }
      } else {
        ansArray.forEach((v, i) => {
          subMap[String(i + 1)] = v;
        });
      }
      let allCorrect = true;
      for (const blank of blanks) {
        const correctOpt = blank.options?.find((o) => o.isCorrect);
        const userChoice = subMap[String(blank.blankId)] || subMap[blank.blankId];
        if (!correctOpt || userChoice !== correctOpt.id && userChoice !== correctOpt.text) {
          allCorrect = false;
          break;
        }
      }
      isAutoCorrect = allCorrect;
    } else {
      isAutoCorrect = false;
    }
  }
  return { isAutoCorrect, answerText };
}
async function processAnswerSubmission(params) {
  let pendingSet = roomPendingSubmissions.get(params.roomId);
  if (!pendingSet) {
    pendingSet = /* @__PURE__ */ new Set();
    roomPendingSubmissions.set(params.roomId, pendingSet);
  }
  let resolveTask;
  const taskPromise = new Promise((res) => {
    resolveTask = res;
  });
  pendingSet.add(taskPromise);
  try {
    await currentSubmissionStorage.run(taskPromise, async () => {
      await processAnswerSubmissionImpl(params);
    });
  } finally {
    pendingSet.delete(taskPromise);
    resolveTask();
  }
}
async function processAnswerSubmissionImpl({
  io: io2,
  roomId,
  questionId,
  playerId,
  teamId,
  answer,
  clientAnsweredAt,
  isAdminOverride = false,
  socket
}) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { teams: true }
  });
  if (!room || room.status !== "PLAYING") return;
  const question = await getResolvedQuestion(roomId, questionId) || await prisma.question.findUnique({ where: { id: questionId } });
  if (!question) return;
  const qKey = `${room.id}:${questionId}`;
  if (roomQuestionProcessed.has(qKey) && !isAdminOverride) {
    if (socket) {
      socket.emit("error", "C\xE2u h\u1ECFi \u0111\xE3 \u0111\u01B0\u1EE3c c\xF4ng b\u1ED1 k\u1EBFt qu\u1EA3!");
      const reveal = roomRevealPayloads.get(room.id);
      if (reveal) {
        socket.emit("game:answer:reveal", reveal);
      } else {
        socket.emit("game:question:clear");
      }
    }
    return;
  }
  const activeQ = roomActiveQuestions.get(room.id);
  const isSandboxRoom = isSandboxRoomEntity(room) || socket?.handshake?.query?.sandbox === "1";
  if ((activeQ?.timerPending || !activeQ?.timerStarted) && !isAdminOverride) {
    if (socket) {
      socket.emit("error", "Ch\u01B0a \u0111\u1EBFn gi\u1EDD tr\u1EA3 l\u1EDDi! H\u1EC7 th\u1ED1ng ch\u1EC9 cho ph\xE9p ch\u1ECDn khi \u0111\u1ED3ng h\u1ED3 b\u1EAFt \u0111\u1EA7u \u0111\u1EBFm.");
      if (activeQ) socket.emit("game:question", activeQ);
    }
    return;
  }
  const nowArrival = Date.now();
  const endsAtAuthoritative = activeQ?.endsAt || (roomTimerEndsAt.get(room.id) ?? 0);
  if (endsAtAuthoritative > 0 && !isAdminOverride) {
    if (nowArrival > endsAtAuthoritative + 2500) {
      if (socket) {
        socket.emit("error", "\u0110\xE3 h\u1EBFt th\u1EDDi gian tr\u1EA3 l\u1EDDi c\xE2u h\u1ECFi!");
        socket.emit("game:timer", {
          remaining: 0,
          total: activeQ?.question?.timeLimit ?? 15,
          endsAt: endsAtAuthoritative,
          serverTime: Date.now()
        });
      }
      return;
    }
  }
  if (teamId) {
    const frozenSet = roomFrozenTeams.get(qKey);
    if (frozenSet && frozenSet.has(teamId)) {
      if (socket) {
        socket.emit("error", "\u0110\u1ED9i c\u1EE7a b\u1EA1n \u0111ang b\u1ECB \u0111\xF3ng b\u0103ng \u1EDF c\xE2u n\xE0y n\xEAn kh\xF4ng th\u1EC3 n\u1ED9p \u0111\xE1p \xE1n!");
        if (activeQ) socket.emit("game:question", activeQ);
      }
      return;
    }
  }
  const evalResult = evaluateAnswerCorrectness(question, answer);
  const isCorrect = evalResult.isAutoCorrect;
  let effectiveTeamId = teamId;
  if (!effectiveTeamId && playerId) {
    const pRecord = await prisma.player.findFirst({
      where: {
        roomId: room.id,
        OR: [
          { id: playerId },
          { socketId: socket?.id }
        ]
      },
      include: { team: true }
    });
    if (pRecord?.teamId) {
      effectiveTeamId = pRecord.teamId;
      if (socket) {
        const sess = socketPlayerSessions.get(socket.id);
        if (sess) sess.teamId = pRecord.teamId;
      }
    } else if (pRecord?.name?.includes("Tester") || playerId.startsWith("p_sb_") || playerId.startsWith("sb_")) {
      const activeSb = isSandboxRoom ? roomSandboxActiveTeam.get(room.id) : void 0;
      let matchTeamId;
      const match = playerId?.match(/_t(\d+)/);
      if (match && room.teams.length > 0) {
        const rawIdx = parseInt(match[1], 10);
        matchTeamId = (rawIdx < room.teams.length ? room.teams[rawIdx]?.id : void 0) || (rawIdx >= 1 && rawIdx <= room.teams.length ? room.teams[rawIdx - 1]?.id : void 0);
      }
      effectiveTeamId = activeSb || matchTeamId || room.teams[0]?.id;
      if (effectiveTeamId && pRecord?.id) {
        await prisma.player.update({
          where: { id: pRecord.id },
          data: { teamId: effectiveTeamId }
        }).catch(() => {
        });
      }
    }
  }
  if (!effectiveTeamId && room.teamMode === "TEAM" && room.teams.length > 0) {
    const pRecord = await prisma.player.findFirst({
      where: { roomId: room.id, OR: [{ id: playerId }, { socketId: socket?.id }] }
    });
    if (pRecord?.teamId) {
      effectiveTeamId = pRecord.teamId;
    } else if (isSandboxRoom) {
      const activeSb = roomSandboxActiveTeam.get(room.id);
      const match = playerId?.match(/_t(\d+)/);
      if (match) {
        const rawIdx = parseInt(match[1], 10);
        const teamBy0 = rawIdx < room.teams.length ? room.teams[rawIdx]?.id : void 0;
        const teamBy1 = rawIdx >= 1 && rawIdx <= room.teams.length ? room.teams[rawIdx - 1]?.id : void 0;
        effectiveTeamId = activeSb || teamBy0 || teamBy1 || room.teams[0]?.id;
      } else {
        effectiveTeamId = activeSb || room.teams[0]?.id;
      }
    }
  }
  const actorId = effectiveTeamId || playerId;
  if (room.mode === "BOUNCEBACK") {
    const stealInfo = roomStealBuzzed.get(qKey);
    const primary = roomPrimaryTeams.get(qKey);
    if (stealInfo) {
      const isStealActor = effectiveTeamId && effectiveTeamId === stealInfo.teamId || actorId && actorId === stealInfo.teamId || playerId && (playerId === stealInfo.playerId || playerId === stealInfo.teamId);
      if (!isAdminOverride && !isStealActor) {
        if (socket) {
          socket.emit("error", "Ch\u1EC9 \u0111\u1ED9i c\u01B0\u1EDBp chu\xF4ng m\u1EDBi \u0111\u01B0\u1EE3c tr\u1EA3 l\u1EDDi!");
          if (activeQ) socket.emit("game:question", activeQ);
        }
        return;
      }
    } else if (primary) {
      const isPrimaryActor = effectiveTeamId && effectiveTeamId === primary.teamId || actorId && actorId === primary.teamId || playerId && playerId === primary.teamId;
      if (!isAdminOverride && !isPrimaryActor) {
        if (socket) {
          socket.emit("error", "Hi\u1EC7n \u0111ang l\xE0 l\u01B0\u1EE3t c\u1EE7a \u0111\u1ED9i ch\xEDnh!");
          if (activeQ) socket.emit("game:question", activeQ);
        }
        return;
      }
    }
  } else if (room.mode === "BUZZ") {
    const buzz = roomBuzzFirst.get(qKey);
    if (!buzz && !isAdminOverride) {
      if (socket) {
        socket.emit("error", "Ch\u01B0a c\xF3 \u0111\u1ED9i n\xE0o b\u1EA5m chu\xF4ng!");
        if (activeQ) socket.emit("game:question", activeQ);
      }
      return;
    }
    const isBuzzActor = buzz ? effectiveTeamId && effectiveTeamId === buzz.teamId || actorId && actorId === buzz.teamId || playerId && (playerId === buzz.playerId || playerId === buzz.teamId) : false;
    if (!isAdminOverride && !isBuzzActor) {
      if (socket) {
        socket.emit("error", "Ch\u1EC9 \u0111\u1ED9i b\u1EA5m chu\xF4ng \u0111\u1EA7u ti\xEAn m\u1EDBi \u0111\u01B0\u1EE3c tr\u1EA3 l\u1EDDi!");
        if (activeQ) socket.emit("game:question", activeQ);
      }
      return;
    }
  } else if (room.mode === "TOURNAMENT") {
  } else if (room.mode === "GRID_CARO") {
    const gridState = roomGridCaros.get(room.id);
    const isGridActor = gridState && (actorId === gridState.currentTurnTeamId || effectiveTeamId === gridState.currentTurnTeamId);
    if (gridState && !isGridActor && !isAdminOverride) {
      if (socket) {
        socket.emit("error", "Hi\u1EC7n \u0111ang l\xE0 l\u01B0\u1EE3t c\u1EE7a \u0111\u1ED9i kh\xE1c!");
        socket.emit("game:grid:update", gridState);
      }
      return;
    }
  } else if (room.mode === "DICE_RACE") {
    const diceState = roomDiceRaces.get(room.id);
    const isDiceActor = diceState && (actorId === diceState.currentTurnTeamId || effectiveTeamId === diceState.currentTurnTeamId);
    if (diceState && !isDiceActor && !isAdminOverride) {
      if (socket) {
        socket.emit("error", "Hi\u1EC7n \u0111ang l\xE0 l\u01B0\u1EE3t c\u1EE7a \u0111\u1ED9i kh\xE1c!");
        socket.emit("game:dice:update", diceState);
      }
      return;
    }
  } else if (room.mode === "MYSTERY_QUEST") {
    const questState = roomMysteryQuests.get(room.id);
    if (questState && questState.phase !== "QUESTION_ACTIVE" && !isAdminOverride) {
      if (socket) {
        socket.emit("error", "Tr\xF2 ch\u01A1i \u0111ang \u1EDF giai \u0111o\u1EA1n L\u1EADt b\xE0i b\xED \u1EA9n, kh\xF4ng nh\u1EADn \u0111\xE1p \xE1n c\xE2u h\u1ECFi!");
        socket.emit("game:mystery:update", questState);
      }
      return;
    }
    const isMysteryActor = questState && (actorId === questState.currentTurnTeamId || effectiveTeamId === questState.currentTurnTeamId);
    if (questState && !isMysteryActor && !isAdminOverride) {
      if (socket) {
        socket.emit("error", `Hi\u1EC7n \u0111ang l\xE0 l\u01B0\u1EE3t thi \u0111\u1EA5u c\u1EE7a ${questState.currentTurnTeamName}! \u0110\u1ED9i b\u1EA1n vui l\xF2ng ch\xFA \xFD theo d\xF5i.`);
        socket.emit("game:mystery:update", questState);
      }
      return;
    }
  } else if (room.mode === "ELIMINATION" && !isAdminOverride) {
  }
  const now = Date.now();
  let qStartedAt = roomQuestionStartedAt.get(room.id);
  if (!qStartedAt) {
    if (activeQ?.startedAt) {
      qStartedAt = activeQ.startedAt;
    } else if (roomTimerEndsAt.has(room.id) && activeQ?.timeLimit) {
      qStartedAt = roomTimerEndsAt.get(room.id) - activeQ.timeLimit * 1e3;
    } else {
      qStartedAt = now;
    }
  }
  let timeSpent = Math.max(300, now - qStartedAt);
  if (typeof clientAnsweredAt === "number" && clientAnsweredAt >= qStartedAt && clientAnsweredAt <= now + 200) {
    const claimedTime = clientAnsweredAt - qStartedAt;
    if (claimedTime >= 300 && now - clientAnsweredAt <= 2e3) {
      timeSpent = claimedTime;
    }
  }
  const maxAllowedLimitMs = (activeQ?.timeLimit || question?.timeLimit || 30) * 1e3;
  timeSpent = Math.min(timeSpent, maxAllowedLimitMs);
  const targetTeamId = effectiveTeamId;
  const targetPlayerId = playerId;
  const isTeamMode = room.teamMode === "TEAM" || room.mode === "BOUNCEBACK" || room.mode === "BUZZ" || room.mode === "GRID_CARO" || room.mode === "DICE_RACE" || room.mode === "MYSTERY_QUEST" || room.mode === "TOURNAMENT" || room.mode === "WAGER";
  const isTesterPlayer = Boolean(
    playerId?.startsWith("p_sb_") || playerId?.startsWith("sb_") || socket?.handshake?.query?.sandbox === "1" && !playerId?.startsWith("bot_") || isSandboxRoom && !playerId?.startsWith("bot_")
  );
  const isBotSender = !isTesterPlayer && (isPlayerBot({ id: playerId }) || Boolean(socket?.handshake?.query?.sandbox === "1" && playerId?.startsWith("bot_")));
  if (targetTeamId && isBotSender) {
    if (isSandboxRoom && roomSandboxActiveTeam.get(room.id) === targetTeamId) {
      console.log(`[processAnswerSubmission] Ignored bot answer for active sandbox human team ${targetTeamId}`);
      return;
    }
    const teamMembers = await prisma.player.findMany({
      where: { roomId: room.id, teamId: targetTeamId }
    });
    const hasHumanMember = teamMembers.some(
      (m) => !isPlayerBot(m) && (m.socketId || m.name?.includes("Tester") || m.id?.startsWith("p_sb_") || m.id?.startsWith("sb_"))
    );
    if (hasHumanMember) {
      console.log(`[processAnswerSubmission] Ignored bot answer for human-controlled team ${targetTeamId}`);
      return;
    }
  }
  let existingAnswer = null;
  if (isTeamMode && targetTeamId) {
    existingAnswer = await prisma.answer.findFirst({
      where: { roomId: room.id, questionId, teamId: targetTeamId },
      orderBy: { submittedAt: "desc" }
    });
  } else if (targetPlayerId) {
    existingAnswer = await prisma.answer.findFirst({
      where: { roomId: room.id, questionId, playerId: targetPlayerId },
      orderBy: { submittedAt: "desc" }
    });
  }
  if (existingAnswer && targetTeamId && isBotSender) {
    const prevSubWasHuman = existingAnswer.playerId && !isPlayerBot({ id: existingAnswer.playerId });
    if (prevSubWasHuman) {
      console.log(`[processAnswerSubmission] Prevented bot from overwriting human answer for team ${targetTeamId}`);
      return;
    }
  }
  let existingWasBot = false;
  if (existingAnswer?.playerId) {
    if (isPlayerBot({ id: existingAnswer.playerId }) || existingAnswer.playerId.startsWith("bot_")) {
      existingWasBot = true;
    } else {
      const prevPlayer = await prisma.player.findUnique({
        where: { id: existingAnswer.playerId },
        select: { id: true, name: true }
      }).catch(() => null);
      if (prevPlayer && isPlayerBot(prevPlayer)) {
        existingWasBot = true;
      }
    }
  }
  const isHumanOverridingBot = !isBotSender && (existingWasBot || isSandboxRoom && (existingAnswer?.playerId !== targetPlayerId || roomSandboxActiveTeam.get(room.id) === targetTeamId));
  if (isHumanOverridingBot) {
    console.log(`[processAnswerSubmission] Human player/tester overriding prior bot/placeholder answer for team ${targetTeamId || playerId}`);
  }
  const isUpdate = Boolean(existingAnswer);
  const normalizedAnswer = Array.isArray(answer) ? answer : [answer];
  const isBouncebackSteal = room.mode === "BOUNCEBACK" && roomStealBuzzed.has(qKey);
  if (isBouncebackSteal && existingAnswer && !isAdminOverride && !isHumanOverridingBot) {
    if (socket) socket.emit("error", "\u0110\u1ED9i b\u1EA5m chu\xF4ng ch\u1EC9 \u0111\u01B0\u1EE3c ch\u1ECDn 1 \u0111\xE1p \xE1n duy nh\u1EA5t!");
    return;
  }
  const config = room.config;
  const isSingleSubmitMode = config?.answerSubmissionMode === "SINGLE_SUBMIT";
  if (!isBouncebackSteal && isSingleSubmitMode && existingAnswer && !isAdminOverride && !isHumanOverridingBot) {
    const existingVal = Array.isArray(existingAnswer.answer) ? existingAnswer.answer : [existingAnswer.answer];
    const isSameAnswer = JSON.stringify(existingVal) === JSON.stringify(normalizedAnswer);
    if (!isSameAnswer) {
      if (socket) socket.emit("error", "Ch\u1EBF \u0111\u1ED9 n\xE0y ch\u1EC9 cho ph\xE9p ch\u1ECDn 1 l\u1EA7n duy nh\u1EA5t, b\u1EA1n \u0111\xE3 ho\xE0n th\xE0nh c\xE2u h\u1ECFi!");
      return;
    }
  }
  let safePlayerId = null;
  if (targetPlayerId) {
    const pExists = await prisma.player.findUnique({
      where: { id: targetPlayerId },
      select: { id: true }
    }).catch(() => null);
    if (pExists) {
      safePlayerId = pExists.id;
    } else if (socket?.id) {
      const sockPlayer = await prisma.player.findFirst({
        where: { roomId: room.id, socketId: socket.id },
        select: { id: true }
      }).catch(() => null);
      if (sockPlayer) {
        safePlayerId = sockPlayer.id;
      }
    }
  }
  let safeTeamId = null;
  if (targetTeamId) {
    const tExists = await prisma.team.findUnique({
      where: { id: targetTeamId },
      select: { id: true }
    }).catch(() => null);
    if (tExists) {
      safeTeamId = tExists.id;
    }
  }
  const subLockKey = `${room.id}:${questionId}:${safeTeamId || safePlayerId || "unknown"}`;
  while (submissionLocks.has(subLockKey)) {
    try {
      await submissionLocks.get(subLockKey);
    } catch {
    }
  }
  let resolveSubLock;
  const subLockPromise = new Promise((res) => {
    resolveSubLock = res;
  });
  submissionLocks.set(subLockKey, subLockPromise);
  try {
    if (!existingAnswer) {
      if (isTeamMode && safeTeamId) {
        existingAnswer = await prisma.answer.findFirst({
          where: { roomId: room.id, questionId, teamId: safeTeamId },
          orderBy: { submittedAt: "desc" }
        });
      } else if (safePlayerId) {
        existingAnswer = await prisma.answer.findFirst({
          where: { roomId: room.id, questionId, playerId: safePlayerId },
          orderBy: { submittedAt: "desc" }
        });
      }
    }
    if (existingAnswer) {
      await prisma.answer.update({
        where: { id: existingAnswer.id },
        data: {
          answer: normalizedAnswer,
          isCorrect: question.type === "ESSAY" ? null : isCorrect,
          timeSpent: isAdminOverride ? 0 : timeSpent,
          submittedAt: /* @__PURE__ */ new Date(),
          teamId: safeTeamId ?? existingAnswer.teamId,
          playerId: safePlayerId ?? existingAnswer.playerId
        }
      });
      if (safeTeamId) {
        await prisma.answer.deleteMany({
          where: {
            roomId: room.id,
            questionId,
            teamId: safeTeamId,
            id: { not: existingAnswer.id }
          }
        }).catch(() => {
        });
      }
    } else {
      await prisma.answer.create({
        data: {
          roomId: room.id,
          questionId,
          playerId: safePlayerId,
          teamId: safeTeamId,
          answer: normalizedAnswer,
          isCorrect: question.type === "ESSAY" ? null : isCorrect,
          pointsAwarded: 0,
          timeSpent: isAdminOverride ? 0 : timeSpent
        }
      });
    }
  } catch (err) {
    console.error("[processAnswerSubmission] Error persisting answer:", err?.message);
    if (err?.code === "P2003" || err?.message?.includes("foreign key")) {
      try {
        await prisma.answer.create({
          data: {
            roomId: room.id,
            questionId,
            playerId: null,
            teamId: safeTeamId,
            answer: normalizedAnswer,
            isCorrect: question.type === "ESSAY" ? null : isCorrect,
            pointsAwarded: 0,
            timeSpent: isAdminOverride ? 0 : timeSpent
          }
        });
      } catch (innerErr) {
        console.error("[processAnswerSubmission] Fallback create failed:", innerErr);
      }
    }
  } finally {
    submissionLocks.delete(subLockKey);
    resolveSubLock();
  }
  if (socket) {
    socket.emit("game:answer:ack", {
      questionId,
      answer: normalizedAnswer,
      isUpdate,
      success: true
    });
  }
  const cachedRoom = roomCache.get(room.id);
  const playerObj = playerId ? cachedRoom?.players?.find((p) => p.id === playerId) || await prisma.player.findUnique({ where: { id: playerId } }).catch(() => null) : null;
  const teamObj = effectiveTeamId ? cachedRoom?.teams?.find((t) => t.id === effectiveTeamId) || await prisma.team.findUnique({ where: { id: effectiveTeamId } }).catch(() => null) : null;
  const answerReceivedPayload = {
    teamId: effectiveTeamId,
    playerId,
    playerName: playerObj?.name || "Th\xED sinh",
    teamName: teamObj?.name,
    questionId,
    answer: normalizedAnswer,
    isUpdate
  };
  io2.to(`room:${room.code}:admin`).emit("game:answer:received", answerReceivedPayload);
  if (isAdminOverride) {
    io2.to(`room:${room.code}`).emit("game:answer:applied", {
      teamId: effectiveTeamId,
      playerId,
      questionId,
      answer: normalizedAnswer
    });
  }
  if (isBouncebackSteal && !isAdminOverride) {
    stopQuestionTimer(room.id);
    const stealInfo = roomStealBuzzed.get(qKey);
    const activeQ2 = roomActiveQuestions.get(room.id);
    const { isAutoCorrect, answerText } = evaluateAnswerCorrectness(question, normalizedAnswer);
    io2.to(`room:${room.code}`).emit("game:early_completed", {
      questionId,
      reason: "ALL_SUBMITTED",
      message: "\u0110\u1ED9i c\u01B0\u1EDBp chu\xF4ng \u0111\xE3 ch\u1ED1t \u0111\xE1p \xE1n duy nh\u1EA5t!"
    });
    io2.to(`room:${room.code}`).emit("game:timer", { remaining: 0, total: activeQ2?.timeLimit || 30, endsAt: Date.now(), serverTime: Date.now() });
    io2.to(`room:${room.code}`).emit("game:timer:expired", { questionId });
    if (activeQ2) {
      activeQ2.bouncebackAwaitingJudgment = "STEAL";
      activeQ2.bouncebackStealAnswer = normalizedAnswer;
      activeQ2.bouncebackAutoCorrect = isAutoCorrect;
      activeQ2.bouncebackAnswerText = answerText;
      io2.to(`room:${room.code}`).emit("game:question", activeQ2);
    }
    io2.to(`room:${room.code}`).emit("game:bounceback:awaiting_judgment", {
      phase: "STEAL",
      targetTeamId: stealInfo?.teamId || "",
      targetTeamName: stealInfo?.teamName || "",
      answer: normalizedAnswer,
      points: roomBouncebackSelectedPoints.get(qKey) ?? 20,
      isAutoCorrect,
      answerText
    });
    return;
  }
  if (room.mode === "BOUNCEBACK" && !isBouncebackSteal && isSingleSubmitMode && !isAdminOverride) {
    stopQuestionTimer(room.id);
    const primary = roomPrimaryTeams.get(qKey);
    const activeQ2 = roomActiveQuestions.get(room.id);
    const { isAutoCorrect, answerText } = evaluateAnswerCorrectness(question, normalizedAnswer);
    io2.to(`room:${room.code}`).emit("game:early_completed", {
      questionId,
      reason: "ALL_SUBMITTED",
      message: "\u0110\u1ED9i ch\xEDnh \u0111\xE3 ch\u1ED1t \u0111\xE1p \xE1n (1 l\u1EA7n duy nh\u1EA5t)!"
    });
    io2.to(`room:${room.code}`).emit("game:timer", { remaining: 0, total: activeQ2?.timeLimit || 30, endsAt: Date.now(), serverTime: Date.now() });
    io2.to(`room:${room.code}`).emit("game:timer:expired", { questionId });
    if (activeQ2) {
      activeQ2.bouncebackAwaitingJudgment = "PRIMARY";
      activeQ2.bouncebackPrimaryAnswer = normalizedAnswer;
      activeQ2.bouncebackAutoCorrect = isAutoCorrect;
      activeQ2.bouncebackAnswerText = answerText;
      io2.to(`room:${room.code}`).emit("game:question", activeQ2);
    }
    io2.to(`room:${room.code}`).emit("game:bounceback:awaiting_judgment", {
      phase: "PRIMARY",
      targetTeamId: primary?.teamId || "",
      targetTeamName: primary?.teamName || "",
      answer: normalizedAnswer,
      points: roomBouncebackSelectedPoints.get(qKey) ?? 20,
      isAutoCorrect,
      answerText
    });
    return;
  }
  if (room.mode === "BUZZ" && !isAdminOverride) {
    stopQuestionTimer(room.id);
    const { isAutoCorrect } = evaluateAnswerCorrectness(question, normalizedAnswer);
    if (question.type !== "ESSAY") {
      await finalizeBuzzAnswer(io2, room.id, room.code, questionId, isAutoCorrect);
      return;
    }
  }
  const actorKey = targetTeamId || targetPlayerId;
  if (actorKey) {
    let subSet = roomSubmittedActors.get(qKey);
    if (!subSet) {
      subSet = /* @__PURE__ */ new Set();
      roomSubmittedActors.set(qKey, subSet);
    }
    subSet.add(actorKey);
  }
  if (!isAdminOverride) {
    const isMcMode = room.config?.answerMethod === "MC";
    const subBehavior = room.config?.answerSubmissionMode || room.config?.submissionBehavior || "ALLOW_CHANGE";
    if (!isMcMode && subBehavior === "SINGLE_SUBMIT") {
      const activeParticipants = await getActiveParticipantsForQuestion(room, questionId);
      const subSet = roomSubmittedActors.get(qKey) || /* @__PURE__ */ new Set();
      const hasPendingHumans = await hasUnfinalizedHumanParticipants(room, questionId, subSet);
      if (!hasPendingHumans && activeParticipants.length > 0 && activeParticipants.every((id) => subSet.has(id))) {
        stopQuestionTimer(room.id);
        const activeQ2 = roomActiveQuestions.get(room.id);
        io2.to(`room:${room.code}`).emit("game:timer", { remaining: 0, total: activeQ2?.timeLimit || 30, endsAt: Date.now(), serverTime: Date.now() });
        io2.to(`room:${room.code}`).emit("game:timer:expired", { questionId });
        io2.to(`room:${room.code}`).emit("game:early_completed", {
          questionId,
          reason: "ALL_SUBMITTED",
          message: "T\u1EA5t c\u1EA3 c\xE1c \u0111\u1ED9i \u0111\xE3 ho\xE0n th\xE0nh ch\u1ECDn \u0111\xE1p \xE1n! \u0110ang chu\u1EA9n b\u1ECB c\xF4ng b\u1ED1 \u0111\xE1p \xE1n..."
        });
        setTimeout(async () => {
          await finalizeQuestionOnTimeUp(io2, room.id, room.code, questionId);
        }, 2500);
      }
    }
  }
}
async function openBuzzWindow(io2, roomId, roomCode, questionId, customDurationMs) {
  const qKey = `${roomId}:${questionId}`;
  if (roomBuzzWindowTimers.has(qKey)) {
    clearTimeout(roomBuzzWindowTimers.get(qKey));
    roomBuzzWindowTimers.delete(qKey);
  }
  let remainingMs = customDurationMs ?? roomBuzzWindowRemaining.get(qKey);
  if (remainingMs === void 0 || remainingMs <= 100) {
    remainingMs = 5e3;
  }
  roomBuzzWindowRemaining.set(qKey, remainingMs);
  const attempts = roomBuzzAttemptOrder.get(qKey) || [];
  let totalActors = roomTotalActorsCache.get(roomId);
  if (totalActors === void 0) {
    const room = await prisma.room.findUnique({ where: { id: roomId }, select: { teamMode: true } });
    const isTeamMode = room?.teamMode === "TEAM";
    totalActors = isTeamMode ? await prisma.team.count({ where: { roomId } }) : await prisma.player.count({ where: { roomId } });
    roomTotalActorsCache.set(roomId, totalActors);
  }
  const disqSet = roomBuzzDisqualified.get(qKey) || /* @__PURE__ */ new Set();
  const maxAttempts = totalActors <= 2 ? 2 : 3;
  const eligibleCount = Math.max(0, totalActors - disqSet.size);
  if (attempts.length >= maxAttempts || eligibleCount === 0) {
    roomBuzzUnlocked.set(qKey, false);
    const currQ = roomActiveQuestions.get(roomId);
    if (currQ) {
      currQ.buzzUnlocked = false;
      currQ.buzzWindowActive = false;
      io2.to(`room:${roomCode}`).emit("game:question", currQ);
    }
    io2.to(`room:${roomCode}`).emit("game:buzz:closed");
    await revealCurrentAnswer(io2, roomId, roomCode, questionId);
    return;
  }
  const nextAttemptNum = attempts.length + 1;
  const nextMultiplier = nextAttemptNum === 1 ? 1.5 : nextAttemptNum === 2 ? 1 : 0.5;
  roomBuzzUnlocked.set(qKey, true);
  roomBuzzWindowOpenedAt.set(qKey, Date.now());
  const endsAt = Date.now() + remainingMs;
  roomBuzzWindowEndsAt.set(qKey, endsAt);
  const activeQ = roomActiveQuestions.get(roomId);
  if (activeQ) {
    activeQ.buzzUnlocked = true;
    activeQ.buzzWindowActive = true;
    activeQ.buzzWindowEndsAt = endsAt;
    activeQ.buzzAttemptNumber = nextAttemptNum;
    activeQ.buzzMaxAttempts = maxAttempts;
    activeQ.buzzMultiplier = nextMultiplier;
    activeQ.buzzDisqualifiedTeamIds = Array.from(disqSet);
    activeQ.buzzedTeamId = void 0;
    activeQ.buzzedTeamName = void 0;
    activeQ.buzzedBy = void 0;
    activeQ.buzzAnsweringActive = false;
    io2.to(`room:${roomCode}`).emit("game:question", activeQ);
  }
  io2.to(`room:${roomCode}`).emit("game:buzz:unlocked", {
    remainingSeconds: Math.ceil(remainingMs / 1e3),
    attemptNumber: nextAttemptNum,
    maxAttempts,
    multiplier: nextMultiplier,
    endsAt
  });
  const timer = setTimeout(async () => {
    roomBuzzWindowTimers.delete(qKey);
    roomBuzzUnlocked.set(qKey, false);
    roomBuzzWindowRemaining.set(qKey, 0);
    const currQ = roomActiveQuestions.get(roomId);
    if (currQ) {
      currQ.buzzUnlocked = false;
      currQ.buzzWindowActive = false;
      io2.to(`room:${roomCode}`).emit("game:question", currQ);
    }
    io2.to(`room:${roomCode}`).emit("game:buzz:closed");
    await revealCurrentAnswer(io2, roomId, roomCode, questionId);
  }, remainingMs + 350);
  roomBuzzWindowTimers.set(qKey, timer);
}
async function finalizeBuzzAnswer(io2, roomId, roomCode, questionId, overrideIsCorrect) {
  const qKey = `${roomId}:${questionId}`;
  stopQuestionTimer(roomId);
  await waitForPendingSubmissions(roomId);
  const room = await prisma.room.findUnique({ where: { id: roomId }, include: { teams: true } });
  const dbQuestion = await prisma.question.findUnique({ where: { id: questionId } });
  const question = await getResolvedQuestion(roomId, questionId, dbQuestion);
  if (!room || !question) return;
  const buzz = roomBuzzFirst.get(qKey);
  const effTeamId = buzz?.teamId;
  if (!effTeamId) {
    await revealCurrentAnswer(io2, roomId, roomCode, questionId);
    return;
  }
  const existingAns = await prisma.answer.findFirst({
    where: { roomId, questionId, teamId: effTeamId }
  });
  let isCorrect = false;
  if (typeof overrideIsCorrect === "boolean") {
    isCorrect = overrideIsCorrect;
  } else if (existingAns && typeof existingAns.isCorrect === "boolean") {
    isCorrect = existingAns.isCorrect;
  }
  const attemptNum = buzz.attemptNumber || 1;
  const buzzMultiplier = buzz.multiplier || (attemptNum === 1 ? 1.5 : attemptNum === 2 ? 1 : 0.5);
  const teamCardsMap = roomQuestionTeamCards.get(qKey);
  const activeCards = teamCardsMap?.get(effTeamId) || [];
  let cardMultiplier = 1;
  if (activeCards.some((c) => c.type === "DOUBLE" || c.type === "SCORE_X2")) cardMultiplier = 2;
  let points = 0;
  if (isCorrect) {
    points = Math.round(question.points * buzzMultiplier * cardMultiplier);
  } else {
    points = 0;
  }
  if (existingAns) {
    await prisma.answer.update({
      where: { id: existingAns.id },
      data: { pointsAwarded: points, isCorrect }
    });
  } else {
    await prisma.answer.create({
      data: {
        roomId,
        questionId,
        teamId: effTeamId,
        playerId: buzz.playerId,
        answer: [],
        isCorrect,
        pointsAwarded: points,
        timeSpent: 0
      }
    });
  }
  if (isCorrect) {
    roomQuestionProcessed.add(qKey);
    roomBuzzUnlocked.set(qKey, false);
    if (points > 0) {
      const tRes = await applyScoreDeltaToTeam(effTeamId, points);
      io2.to(`room:${roomCode}`).emit("game:score:update", [
        { teamId: effTeamId, score: tRes.newScore, delta: tRes.effectiveDelta }
      ]);
    }
    await revealCurrentAnswer(io2, roomId, roomCode, questionId);
  } else {
    let disqSet = roomBuzzDisqualified.get(qKey);
    if (!disqSet) {
      disqSet = /* @__PURE__ */ new Set();
      roomBuzzDisqualified.set(qKey, disqSet);
    }
    disqSet.add(effTeamId);
    roomBuzzFirst.delete(qKey);
    const attempts = roomBuzzAttemptOrder.get(qKey) || [];
    const isTeamMode = room.teamMode === "TEAM";
    const totalActors = isTeamMode ? await prisma.team.count({ where: { roomId } }) : await prisma.player.count({ where: { roomId } });
    const maxAttempts = totalActors <= 2 ? 2 : 3;
    const eligibleCount = Math.max(0, totalActors - disqSet.size);
    const freshWindowMs = 5e3;
    roomBuzzWindowRemaining.set(qKey, freshWindowMs);
    if (attempts.length < maxAttempts && eligibleCount > 0) {
      io2.to(`room:${roomCode}`).emit("game:buzz:wrong_attempt", {
        teamId: effTeamId,
        teamName: buzz.teamName,
        attemptNumber: attemptNum,
        maxAttempts,
        remainingSeconds: 5,
        canRetry: true,
        disqualifiedTeamIds: Array.from(disqSet)
      });
      await openBuzzWindow(io2, roomId, roomCode, questionId, freshWindowMs);
    } else {
      roomQuestionProcessed.add(qKey);
      roomBuzzUnlocked.set(qKey, false);
      io2.to(`room:${roomCode}`).emit("game:buzz:closed");
      await revealCurrentAnswer(io2, roomId, roomCode, questionId);
    }
  }
}
async function finalizeTournamentQuestion(io2, roomId, roomCode, questionId) {
  await waitForPendingSubmissions(roomId);
  const qKey = `${roomId}:${questionId}`;
  if (roomQuestionProcessed.has(qKey)) return;
  roomQuestionProcessed.add(qKey);
  const tournament = roomTournaments.get(roomId);
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { teams: { include: { players: true } } }
  });
  const dbQuestion = await prisma.question.findUnique({ where: { id: questionId } });
  const question = await getResolvedQuestion(roomId, questionId, dbQuestion);
  if (!tournament || !room || !question) return;
  const currentMatch = tournament.matches.find((m) => m.id === tournament.currentMatchId);
  if (!currentMatch) return;
  const isSandboxRoom = isSandboxRoomEntity(room);
  const t1Ans = currentMatch.team1Id ? await prisma.answer.findFirst({
    where: { roomId, questionId, teamId: currentMatch.team1Id },
    orderBy: { submittedAt: "desc" }
  }) : null;
  const t2Ans = currentMatch.team2Id ? await prisma.answer.findFirst({
    where: { roomId, questionId, teamId: currentMatch.team2Id },
    orderBy: { submittedAt: "desc" }
  }) : null;
  const scoreUpdates = [];
  const team1Obj = room.teams.find((t) => t.id === currentMatch.team1Id);
  const team2Obj = room.teams.find((t) => t.id === currentMatch.team2Id);
  const team1HasHuman = team1Obj?.players?.some((p) => !isPlayerBot(p)) ?? true;
  const team2HasHuman = team2Obj?.players?.some((p) => !isPlayerBot(p)) ?? true;
  const timeLimitSec = question.timeLimit || 20;
  const qStartedAt = roomQuestionStartedAt.get(roomId) || Date.now();
  if (t1Ans && t1Ans.isCorrect && currentMatch.team1Id && (isSandboxRoom || team1HasHuman)) {
    const spentMs = t1Ans.timeSpent || (t1Ans.submittedAt ? t1Ans.submittedAt.getTime() - qStartedAt : 2e3);
    const remainingSec = Math.max(0, (timeLimitSec * 1e3 - spentMs) / 1e3);
    const speedFactor = 0.5 + 0.5 * (remainingSec / timeLimitSec);
    const activeCards1 = roomQuestionTeamCards.get(qKey)?.get(currentMatch.team1Id) || [];
    const mult1 = activeCards1.some((c) => c.type === "SCORE_X2" || c.type === "DOUBLE") ? 2 : 1;
    const earnedPoints = Math.round(question.points * Math.min(1, Math.max(0.5, speedFactor)) * mult1);
    currentMatch.team1Score += earnedPoints;
    const tRes = await applyScoreDeltaToTeam(currentMatch.team1Id, earnedPoints);
    scoreUpdates.push({ teamId: currentMatch.team1Id, score: tRes.newScore, delta: tRes.effectiveDelta });
  }
  if (t2Ans && t2Ans.isCorrect && currentMatch.team2Id && (isSandboxRoom || team2HasHuman)) {
    const spentMs = t2Ans.timeSpent || (t2Ans.submittedAt ? t2Ans.submittedAt.getTime() - qStartedAt : 2e3);
    const remainingSec = Math.max(0, (timeLimitSec * 1e3 - spentMs) / 1e3);
    const speedFactor = 0.5 + 0.5 * (remainingSec / timeLimitSec);
    const activeCards2 = roomQuestionTeamCards.get(qKey)?.get(currentMatch.team2Id) || [];
    const mult2 = activeCards2.some((c) => c.type === "SCORE_X2" || c.type === "DOUBLE") ? 2 : 1;
    const earnedPoints = Math.round(question.points * Math.min(1, Math.max(0.5, speedFactor)) * mult2);
    currentMatch.team2Score += earnedPoints;
    const tRes = await applyScoreDeltaToTeam(currentMatch.team2Id, earnedPoints);
    scoreUpdates.push({ teamId: currentMatch.team2Id, score: tRes.newScore, delta: tRes.effectiveDelta });
  }
  const spectatorAnswers = await prisma.answer.findMany({
    where: {
      roomId,
      questionId,
      teamId: { notIn: [currentMatch.team1Id, currentMatch.team2Id].filter(Boolean) }
    },
    orderBy: { submittedAt: "desc" }
  });
  let oracleUpdated = false;
  tournament.oracleScores = tournament.oracleScores || {};
  for (const sAns of spectatorAnswers) {
    if (sAns.isCorrect && sAns.teamId) {
      tournament.oracleScores[sAns.teamId] = (tournament.oracleScores[sAns.teamId] || 0) + 10;
      oracleUpdated = true;
    }
  }
  currentMatch.currentQuestionInMatch++;
  if (currentMatch.currentQuestionInMatch >= currentMatch.totalQuestionsInMatch) {
    if (currentMatch.team1Score === currentMatch.team2Score && currentMatch.team1Id && currentMatch.team2Id) {
      currentMatch.totalQuestionsInMatch += 1;
      currentMatch.isTieBreaker = true;
    } else {
      currentMatch.status = "COMPLETED";
      currentMatch.isTieBreaker = false;
      const winnerId = currentMatch.team1Score > currentMatch.team2Score ? currentMatch.team1Id : currentMatch.team2Id;
      const winnerName = currentMatch.team1Score > currentMatch.team2Score ? currentMatch.team1Name : currentMatch.team2Name;
      currentMatch.winnerTeamId = winnerId;
      currentMatch.recap = {
        team1Score: currentMatch.team1Score,
        team2Score: currentMatch.team2Score,
        winnerId,
        winnerName: winnerName || "?"
      };
      tournament.activeRecapMatchId = currentMatch.id;
      tournament.recapCountdownSeconds = 8;
      if (currentMatch.id === "FINAL") {
        tournament.championTeamId = winnerId;
        tournament.championTeamName = winnerName;
      } else {
        const nextMatch = tournament.matches.find(
          (m) => m.roundIndex === currentMatch.roundIndex + 1 && (!m.team1Id || !m.team2Id)
        );
        if (nextMatch) {
          if (!nextMatch.team1Id) {
            nextMatch.team1Id = winnerId;
            nextMatch.team1Name = winnerName;
            nextMatch.team1Color = winnerId === currentMatch.team1Id ? currentMatch.team1Color : currentMatch.team2Color;
          } else if (!nextMatch.team2Id) {
            nextMatch.team2Id = winnerId;
            nextMatch.team2Name = winnerName;
            nextMatch.team2Color = winnerId === currentMatch.team1Id ? currentMatch.team1Color : currentMatch.team2Color;
          }
        }
      }
      if (currentMatch.predictions && winnerId) {
        for (const [predTeamId, predWinnerId] of Object.entries(currentMatch.predictions)) {
          if (predWinnerId === winnerId) {
            tournament.oracleScores[predTeamId] = (tournament.oracleScores[predTeamId] || 0) + 15;
            oracleUpdated = true;
          }
        }
      }
    }
  }
  if (oracleUpdated) {
    io2.to(`room:${roomCode}`).emit("tournament:oracle:update", { oracleScores: tournament.oracleScores });
  }
  if (scoreUpdates.length > 0) {
    io2.to(`room:${roomCode}`).emit("game:score:update", scoreUpdates);
  }
  io2.to(`room:${roomCode}`).emit("game:tournament:update", tournament);
  await persistGameStateSnapshot(roomId);
  await revealCurrentAnswer(io2, roomId, roomCode, questionId);
}
async function advanceGridToBoard(io2, roomId, roomCode) {
  const autoAdvanceKey = `${roomId}:auto_advance`;
  if (roomGridTimers.has(autoAdvanceKey)) {
    clearInterval(roomGridTimers.get(autoAdvanceKey));
    roomGridTimers.delete(autoAdvanceKey);
  }
  const gridState = roomGridCaros.get(roomId);
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { teams: { orderBy: { createdAt: "asc" } } }
  });
  if (!gridState || !room) return;
  gridState.autoAdvanceSeconds = void 0;
  gridState.selectedCellId = void 0;
  gridState.selectedCellAnimation = false;
  gridState.selectedCellInfo = void 0;
  gridState.questionReady = false;
  stopQuestionTimer(roomId);
  roomActiveQuestions.delete(roomId);
  roomRevealPayloads.delete(roomId);
  gridState.turnsCompleted = (gridState.turnsCompleted || 0) + 1;
  const numTeams = Math.max(1, room.teams.length);
  gridState.currentRound = Math.min(gridState.maxRounds, Math.floor(gridState.turnsCompleted / numTeams) + 1);
  if (room.teams.length > 0) {
    const curIdx = room.teams.findIndex((t) => t.id === gridState.currentTurnTeamId);
    const nextIdx = (curIdx + 1) % room.teams.length;
    gridState.currentTurnTeamId = room.teams[nextIdx].id;
    gridState.currentTurnTeamName = room.teams[nextIdx].name;
  }
  const isMatchOver = gridState.turnsCompleted >= gridState.maxTurns || gridState.cells.every((c) => c.isCompleted);
  if (isMatchOver) {
    const ended = await safelyFinishGame({ io: io2, room });
    if (!ended) return;
  } else {
    io2.to(`room:${roomCode}`).emit("game:question:clear");
    io2.to(`room:${roomCode}`).emit("game:grid:update", gridState);
  }
}
async function finalizeGridCaroQuestion(io2, roomId, roomCode, questionId) {
  await waitForPendingSubmissions(roomId);
  const qKey = `${roomId}:${questionId}`;
  if (roomQuestionProcessed.has(qKey)) return;
  roomQuestionProcessed.add(qKey);
  const gridState = roomGridCaros.get(roomId);
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { teams: { include: { players: true } } }
  });
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!gridState || !room || !question) return;
  const isSandboxRoom = isSandboxRoomEntity(room);
  const currentTeamId = gridState.currentTurnTeamId;
  const currentTeam = room.teams.find((t) => t.id === currentTeamId);
  const cell = gridState.selectedCellId ? gridState.cells.find((c) => c.id === gridState.selectedCellId) : null;
  const hasHuman = currentTeam?.players?.some((p) => !isPlayerBot(p)) ?? true;
  const scoreUpdates = [];
  if (currentTeam && cell && (isSandboxRoom || hasHuman)) {
    const ans = await prisma.answer.findFirst({
      where: { roomId, questionId, teamId: currentTeam.id },
      orderBy: { submittedAt: "desc" }
    });
    if (ans && ans.isCorrect) {
      cell.isCompleted = true;
      cell.claimedByTeamId = currentTeam.id;
      cell.claimedByTeamName = currentTeam.name;
      cell.claimedByTeamColor = currentTeam.color;
      let awardedPoints = cell.points;
      if (gridState.caroEnabled) {
        const winningStreak = checkGridCaroStreak(
          gridState.cells,
          gridState.rows,
          gridState.cols,
          currentTeam.id,
          gridState.streakTargetK
        );
        if (winningStreak && winningStreak.length > 0 && !gridState.caroAchievedTeams.includes(currentTeam.name)) {
          const streakPtsSum = winningStreak.reduce((acc, c) => acc + c.points, 0);
          const avgPts = streakPtsSum / winningStreak.length;
          const dynamicBonus = Math.max(10, Math.round(avgPts / 5) * 5);
          gridState.caroAchievedTeams.push(currentTeam.name);
          awardedPoints += dynamicBonus;
          io2.to(`room:${roomCode}`).emit("game:grid:caro:celebrate", {
            teamId: currentTeam.id,
            teamName: currentTeam.name,
            bonusPoints: dynamicBonus
          });
        }
      }
      if (ans) {
        await prisma.answer.update({
          where: { id: ans.id },
          data: { pointsAwarded: awardedPoints }
        }).catch(console.error);
      }
      const tRes = await applyScoreDeltaToTeam(currentTeam.id, awardedPoints);
      scoreUpdates.push({ teamId: currentTeam.id, score: tRes.newScore, delta: tRes.effectiveDelta });
    } else {
      cell.isCompleted = false;
      cell.claimedByTeamId = void 0;
      cell.claimedByTeamName = void 0;
      cell.claimedByTeamColor = void 0;
      cell.attemptCount = (cell.attemptCount || 0) + 1;
      cell.questionId = void 0;
    }
  }
  gridState.autoAdvanceSeconds = void 0;
  if (scoreUpdates.length > 0) {
    io2.to(`room:${roomCode}`).emit("game:score:update", scoreUpdates);
  }
  io2.to(`room:${roomCode}`).emit("game:grid:update", gridState);
  await persistGameStateSnapshot(roomId);
  await revealCurrentAnswer(io2, roomId, roomCode, questionId);
}
async function finalizeDiceRaceQuestion(io2, roomId, roomCode, questionId) {
  await waitForPendingSubmissions(roomId);
  const qKey = `${roomId}:${questionId}`;
  if (roomQuestionProcessed.has(qKey)) return;
  roomQuestionProcessed.add(qKey);
  const diceState = roomDiceRaces.get(roomId);
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { teams: { include: { players: true } } }
  });
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!diceState || !room || !question) return;
  const isSandboxRoom = isSandboxRoomEntity(room);
  const currentTeamId = diceState.currentTurnTeamId;
  const currentTeam = room.teams.find((t) => t.id === currentTeamId);
  const hasHuman = currentTeam?.players?.some((p) => !isPlayerBot(p)) ?? true;
  const ans = await prisma.answer.findFirst({
    where: { roomId, questionId, teamId: currentTeamId },
    orderBy: { submittedAt: "desc" }
  });
  const isCorrect = ans?.isCorrect === true && (isSandboxRoom || hasHuman);
  if (isCorrect && currentTeamId) {
    diceState.canRollDice = true;
    diceState.dicePendingAnswer = false;
  } else {
    diceState.dicePendingAnswer = false;
    if (room.teams.length > 0) {
      const curIdx = room.teams.findIndex((t) => t.id === currentTeamId);
      const nextIdx = (curIdx + 1) % room.teams.length;
      diceState.currentTurnTeamId = room.teams[nextIdx].id;
      diceState.currentTurnTeamName = room.teams[nextIdx].name;
    }
    diceState.canRollDice = false;
  }
  io2.to(`room:${roomCode}`).emit("game:dice:update", diceState);
  await persistGameStateSnapshot(roomId);
  await revealCurrentAnswer(io2, roomId, roomCode, questionId);
}
async function finalizeWagerQuestion(io2, roomId, roomCode, questionId) {
  await waitForPendingSubmissions(roomId);
  const qKey = `${roomId}:${questionId}`;
  if (roomQuestionProcessed.has(qKey)) return;
  roomQuestionProcessed.add(qKey);
  const wagerState = roomWagers.get(roomId);
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { teams: { include: { players: true } } }
  });
  const dbQuestion = await prisma.question.findUnique({ where: { id: questionId } });
  const question = await getResolvedQuestion(roomId, questionId, dbQuestion);
  if (!wagerState || !room || !question) return;
  wagerState.phase = "REVEAL_PERIOD";
  const scoreUpdates = [];
  const teamSummaries = [];
  const lastWagerTeamId = wagerState.lastWagerTeamId;
  const wagerAmount = wagerState.currentHighestWager || 10;
  const basePoints = normalizeToThreeLevels(question.points || 10);
  const nonWagerCorrectPoints = Math.max(5, Math.floor(basePoints / 2));
  const teamAnswers = await prisma.answer.findMany({
    where: { roomId, questionId },
    orderBy: { submittedAt: "desc" }
  });
  const answerMap = /* @__PURE__ */ new Map();
  for (const ans of teamAnswers) {
    if (ans.teamId && !answerMap.has(ans.teamId)) {
      answerMap.set(ans.teamId, ans);
    }
  }
  const isSandboxRoom = isSandboxRoomEntity(room);
  let otherCorrectCount = 0;
  for (const team of room.teams) {
    if (team.id !== lastWagerTeamId) {
      const hasHuman = team.players?.some((p) => !isPlayerBot(p)) ?? true;
      if (!isSandboxRoom && !hasHuman) continue;
      const ans = answerMap.get(team.id);
      if (ans?.isCorrect === true) {
        otherCorrectCount++;
      }
    }
  }
  const unitPenalty = Math.max(5, Math.round(wagerAmount / 2 / 5) * 5);
  let wagerPenalty = 0;
  if (otherCorrectCount > 0) {
    const maxPenaltyTeams = basePoints <= 10 ? 1 : basePoints <= 20 ? 2 : 3;
    const effectiveTeams = Math.min(otherCorrectCount, maxPenaltyTeams);
    wagerPenalty = effectiveTeams * unitPenalty;
  }
  for (const team of room.teams) {
    const hasHuman = team.players?.some((p) => !isPlayerBot(p)) ?? true;
    if (!isSandboxRoom && !hasHuman) {
      scoreUpdates.push({ teamId: team.id, score: team.score, delta: 0 });
      teamSummaries.push({
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color,
        totalOnlineMembers: 0,
        correctMembers: 0,
        pointsAwarded: 0,
        speedBonus: 0,
        multiplier: 1
      });
      continue;
    }
    const isCorrect = Boolean(answerMap.get(team.id)?.isCorrect === true);
    let delta = 0;
    if (team.id === lastWagerTeamId) {
      delta = isCorrect ? wagerAmount : -wagerPenalty;
    } else {
      delta = isCorrect ? nonWagerCorrectPoints : 0;
    }
    await prisma.answer.updateMany({
      where: { roomId, questionId, teamId: team.id },
      data: { pointsAwarded: delta }
    }).catch(console.error);
    const tRes = await applyScoreDeltaToTeam(team.id, delta);
    scoreUpdates.push({ teamId: team.id, score: tRes.newScore, delta: tRes.effectiveDelta });
    teamSummaries.push({
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color,
      totalOnlineMembers: 1,
      correctMembers: isCorrect ? 1 : 0,
      pointsAwarded: delta,
      speedBonus: 0,
      multiplier: team.id === lastWagerTeamId ? Number((wagerAmount / basePoints).toFixed(1)) : 1
    });
    if (!wagerState.bailoutQueue) wagerState.bailoutQueue = [];
    const bailoutsRem = wagerState.teamBailouts?.[team.id]?.remaining ?? 1;
    if (tRes.newScore <= 0) {
      if (bailoutsRem > 0 && !wagerState.bailoutQueue.some((item) => item.teamId === team.id)) {
        wagerState.bailoutQueue.push({
          teamId: team.id,
          teamName: team.name,
          teamColor: team.color,
          score: tRes.newScore,
          questionIndex: room.currentQuestion + 1,
          eliminatedAt: Date.now()
        });
      }
    } else {
      wagerState.bailoutQueue = wagerState.bailoutQueue.filter((item) => item.teamId !== team.id);
    }
  }
  if (wagerState.bailoutQueue) {
    wagerState.bailoutQueue.sort(
      (a, b) => a.questionIndex - b.questionIndex || (a.eliminatedAt || 0) - (b.eliminatedAt || 0) || a.score - b.score
    );
  }
  if (scoreUpdates.length > 0) {
    io2.to(`room:${roomCode}`).emit("game:score:update", scoreUpdates);
  }
  io2.to(`room:${roomCode}`).emit("game:wager:update", wagerState);
  await persistGameStateSnapshot(roomId);
  await revealCurrentAnswer(io2, roomId, roomCode, questionId, teamSummaries);
  const updatedTeams = await prisma.team.findMany({ where: { roomId } });
  if (updatedTeams.length > 1) {
    const positiveTeams = updatedTeams.filter((t) => t.score > 0);
    if (positiveTeams.length === 1) {
      wagerState.bailoutQueue = [];
      wagerState.teamBailouts = {};
      io2.to(`room:${roomCode}`).emit("game:wager:update", wagerState);
      await prisma.room.update({
        where: { id: roomId },
        data: { status: "FINISHED", endedAt: /* @__PURE__ */ new Date() }
      });
      const leaderboard = await buildLeaderboard(roomId);
      io2.to(`room:${roomCode}`).emit("game:ended", { leaderboard });
      setTimeout(() => cleanupRoomInMemory(roomId), 5e3);
    }
  }
}
async function openBouncebackStealWindow(io2, roomId, roomCode, questionId) {
  const qKey = `${roomId}:${questionId}`;
  if (roomQuestionProcessed.has(qKey)) return;
  if (roomStealTimer.has(qKey)) {
    clearTimeout(roomStealTimer.get(qKey));
    roomStealTimer.delete(qKey);
  }
  roomStealPhase.set(qKey, true);
  roomStealOpenedAt.set(qKey, Date.now());
  roomStealEndsAt.set(qKey, Date.now() + 5e3);
  const activeQ = roomActiveQuestions.get(roomId);
  if (activeQ) {
    activeQ.isStealPhase = true;
    activeQ.stealBuzzedTeamId = void 0;
    activeQ.stealBuzzedTeamName = void 0;
    activeQ.bouncebackAwaitingJudgment = null;
    io2.to(`room:${roomCode}`).emit("game:question", activeQ);
  }
  const timeLimit = 5;
  io2.to(`room:${roomCode}`).emit("game:bounceback:open_steal", {
    questionId,
    timeLimit
  });
  const timer = setTimeout(async () => {
    roomStealPhase.set(qKey, false);
    roomStealTimer.delete(qKey);
    io2.to(`room:${roomCode}`).emit("game:buzz:closed");
    if (activeQ) {
      activeQ.isStealPhase = false;
      io2.to(`room:${roomCode}`).emit("game:question", activeQ);
    }
    if (!roomStealBuzzed.has(qKey) && !roomQuestionProcessed.has(qKey)) {
      roomQuestionProcessed.add(qKey);
      await revealCurrentAnswer(io2, roomId, roomCode, questionId);
    }
  }, 5350);
  roomStealTimer.set(qKey, timer);
}
async function finalizeBouncebackPrimary(io2, roomId, roomCode, questionId, forceCorrect) {
  await waitForPendingSubmissions(roomId);
  const qKey = `${roomId}:${questionId}`;
  if (roomQuestionProcessed.has(qKey)) return false;
  stopQuestionTimer(roomId);
  const room = await prisma.room.findUnique({ where: { id: roomId }, include: { teams: true } });
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!room || !question) return false;
  const primary = roomPrimaryTeams.get(qKey);
  if (!primary) return false;
  const existingAns = await prisma.answer.findFirst({
    where: { roomId, questionId, teamId: primary.teamId }
  });
  const isCorrect = forceCorrect !== void 0 ? forceCorrect : existingAns?.isCorrect === true;
  const activeQ = roomActiveQuestions.get(roomId);
  if (activeQ) {
    activeQ.bouncebackAwaitingJudgment = null;
  }
  const chosenPoints = roomBouncebackSelectedPoints.get(qKey) ?? 20;
  if (isCorrect) {
    roomQuestionProcessed.add(qKey);
    const teamCardsMap = roomQuestionTeamCards.get(qKey);
    const activeCards = teamCardsMap?.get(primary.teamId) || [];
    let multiplier = 1;
    if (activeCards.some((c) => c.type === "DOUBLE" || c.type === "SCORE_X2")) {
      multiplier = 2;
    }
    const points = Math.floor(chosenPoints * multiplier);
    if (existingAns) {
      await prisma.answer.update({
        where: { id: existingAns.id },
        data: { pointsAwarded: points, isCorrect: true }
      });
    } else {
      await prisma.answer.create({
        data: {
          roomId,
          questionId,
          teamId: primary.teamId,
          answer: [],
          isCorrect: true,
          pointsAwarded: points,
          timeSpent: 0
        }
      });
    }
    const playerToUpdate = await prisma.player.findUnique({ where: { id: primary.teamId } }).catch(() => null);
    if (playerToUpdate) {
      const pRes = await applyScoreDeltaToPlayer(primary.teamId, points);
      io2.to(`room:${roomCode}`).emit("game:score:update", [
        { playerId: primary.teamId, score: pRes.newScore, delta: pRes.effectiveDelta }
      ]);
    } else {
      const tRes = await applyScoreDeltaToTeam(primary.teamId, points);
      io2.to(`room:${roomCode}`).emit("game:score:update", [
        { teamId: primary.teamId, score: tRes.newScore, delta: tRes.effectiveDelta }
      ]);
    }
    await revealCurrentAnswer(io2, roomId, roomCode, questionId);
    return true;
  } else {
    const teamCardsMap = roomQuestionTeamCards.get(qKey);
    const activeCards = teamCardsMap?.get(primary.teamId) || [];
    let hopeStarPenalty = 0;
    if (activeCards.some((c) => c.type === "SHIELD")) {
      hopeStarPenalty = 0;
    } else if (activeCards.some((c) => c.type === "DOUBLE" || c.type === "SCORE_X2")) {
      hopeStarPenalty = chosenPoints;
    }
    if (existingAns) {
      await prisma.answer.update({
        where: { id: existingAns.id },
        data: { pointsAwarded: -hopeStarPenalty, isCorrect: false }
      });
    } else {
      await prisma.answer.create({
        data: {
          roomId,
          questionId,
          teamId: primary.teamId,
          answer: [],
          isCorrect: false,
          pointsAwarded: -hopeStarPenalty,
          timeSpent: 0
        }
      });
    }
    if (hopeStarPenalty > 0) {
      const primaryPlayer = await prisma.player.findUnique({ where: { id: primary.teamId } }).catch(() => null);
      if (primaryPlayer) {
        const pRes = await applyScoreDeltaToPlayer(primary.teamId, -hopeStarPenalty);
        io2.to(`room:${roomCode}`).emit("game:score:update", [
          { playerId: primary.teamId, score: pRes.newScore, delta: pRes.effectiveDelta }
        ]);
      } else {
        const tRes = await applyScoreDeltaToTeam(primary.teamId, -hopeStarPenalty);
        io2.to(`room:${roomCode}`).emit("game:score:update", [
          { teamId: primary.teamId, score: tRes.newScore, delta: tRes.effectiveDelta }
        ]);
      }
    }
    io2.to(`room:${roomCode}`).emit("game:timer", { remaining: 0, total: question.timeLimit });
    await openBouncebackStealWindow(io2, roomId, roomCode, questionId);
    return false;
  }
}
async function finalizeBouncebackSteal(io2, roomId, roomCode, questionId, forceCorrect) {
  await waitForPendingSubmissions(roomId);
  const qKey = `${roomId}:${questionId}`;
  if (roomQuestionProcessed.has(qKey)) return;
  roomQuestionProcessed.add(qKey);
  stopQuestionTimer(roomId);
  const room = await prisma.room.findUnique({ where: { id: roomId }, include: { teams: true } });
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!room || !question) return;
  const stealInfo = roomStealBuzzed.get(qKey);
  if (!stealInfo) {
    await revealCurrentAnswer(io2, roomId, roomCode, questionId);
    return;
  }
  const existingAns = await prisma.answer.findFirst({
    where: { roomId, questionId, teamId: stealInfo.teamId }
  });
  const teamCardsMap = roomQuestionTeamCards.get(qKey);
  const activeCards = teamCardsMap?.get(stealInfo.teamId) || [];
  let multiplier = 1;
  const currentTeamObj = room.teams.find((t) => t.id === stealInfo.teamId);
  let shielded = currentTeamObj ? currentTeamObj.shieldCount > 0 : false;
  if (activeCards.some((c) => c.type === "DOUBLE" || c.type === "SCORE_X2")) multiplier = 2;
  if (activeCards.some((c) => c.type === "SHIELD")) shielded = true;
  const isCorrect = forceCorrect !== void 0 ? forceCorrect : existingAns?.isCorrect === true;
  const chosenPoints = roomBouncebackSelectedPoints.get(qKey) ?? 20;
  let points = 0;
  if (isCorrect) {
    points = Math.floor(chosenPoints * multiplier);
  } else {
    points = shielded ? 0 : -Math.floor(chosenPoints * 0.5);
  }
  if (existingAns) {
    await prisma.answer.update({
      where: { id: existingAns.id },
      data: { pointsAwarded: points, isCorrect }
    });
  } else {
    await prisma.answer.create({
      data: {
        roomId,
        questionId,
        teamId: stealInfo.teamId,
        playerId: stealInfo.playerId,
        answer: [],
        isCorrect,
        pointsAwarded: points,
        timeSpent: 0
      }
    });
  }
  const scoreUpdates = [];
  if (points !== 0) {
    const stealPlayer = await prisma.player.findUnique({ where: { id: stealInfo.teamId } }).catch(() => null);
    if (stealPlayer) {
      const pRes = await applyScoreDeltaToPlayer(stealInfo.teamId, points);
      scoreUpdates.push({ playerId: stealInfo.teamId, score: pRes.newScore, delta: pRes.effectiveDelta });
    } else {
      const tRes = await applyScoreDeltaToTeam(stealInfo.teamId, points);
      scoreUpdates.push({ teamId: stealInfo.teamId, score: tRes.newScore, delta: tRes.effectiveDelta });
    }
  }
  const primary = roomPrimaryTeams.get(qKey);
  const primaryHadDouble = (teamCardsMap?.get(primary?.teamId ?? "") ?? []).some((c) => c.type === "DOUBLE");
  if (isCorrect && primary && primary.teamId !== stealInfo.teamId && !primaryHadDouble) {
    const deductPoints = -chosenPoints;
    const primaryPlayer = await prisma.player.findUnique({ where: { id: primary.teamId } }).catch(() => null);
    if (primaryPlayer) {
      const pRes = await applyScoreDeltaToPlayer(primary.teamId, deductPoints);
      scoreUpdates.push({ playerId: primary.teamId, score: pRes.newScore, delta: pRes.effectiveDelta });
    } else {
      const tRes = await applyScoreDeltaToTeam(primary.teamId, deductPoints);
      scoreUpdates.push({ teamId: primary.teamId, score: tRes.newScore, delta: tRes.effectiveDelta });
    }
  }
  if (scoreUpdates.length > 0) {
    io2.to(`room:${roomCode}`).emit("game:score:update", scoreUpdates);
  }
  const activeQ = roomActiveQuestions.get(roomId);
  if (activeQ) {
    activeQ.bouncebackAwaitingJudgment = null;
    activeQ.isStealPhase = false;
  }
  await revealCurrentAnswer(io2, roomId, roomCode, questionId);
}
async function finalizeIndividualScores(io2, roomId, roomCode, questionId) {
  await waitForPendingSubmissions(roomId);
  const qKey = `${roomId}:${questionId}`;
  if (roomQuestionProcessed.has(qKey)) return;
  roomQuestionProcessed.add(qKey);
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  const dbQuestion = await prisma.question.findUnique({ where: { id: questionId } });
  const question = await getResolvedQuestion(roomId, questionId, dbQuestion);
  if (!room || !question) return;
  const answers = await prisma.answer.findMany({
    where: { roomId, questionId }
  });
  const config = room.config;
  const effectiveConfig = {
    ...config,
    timeBonusEnabled: room.mode === "CLASSIC" || room.mode === "ELIMINATION" ? Boolean(config?.timeBonusEnabled !== false) : false
  };
  const totalAnswers = answers.length;
  const correctAnswersTotal = answers.filter((a) => a.isCorrect === true).length;
  const roomAccuracy = totalAnswers > 0 ? correctAnswersTotal / totalAnswers : 1;
  const allPlayers = await prisma.player.findMany({
    where: { roomId },
    orderBy: { score: "desc" }
  });
  const midPoint = Math.max(1, Math.floor(allPlayers.length / 2));
  const topHalfPlayerIds = new Set(allPlayers.slice(0, midPoint).map((p) => p.id));
  const bottomHalfPlayerIds = new Set(allPlayers.slice(midPoint).map((p) => p.id));
  let topHalfCorrect = 0;
  let topHalfTotal = 0;
  let bottomHalfCorrect = 0;
  let bottomHalfTotal = 0;
  for (const a of answers) {
    if (a.playerId && topHalfPlayerIds.has(a.playerId)) {
      topHalfTotal++;
      if (a.isCorrect) topHalfCorrect++;
    } else if (a.playerId && bottomHalfPlayerIds.has(a.playerId)) {
      bottomHalfTotal++;
      if (a.isCorrect) bottomHalfCorrect++;
    }
  }
  const scoreUpdates = [];
  for (const ans of answers) {
    if (!ans.playerId) continue;
    const isCorrect = ans.isCorrect ?? false;
    let pStreak = playerStreakMap.get(ans.playerId) || 0;
    if (isCorrect) {
      pStreak += 1;
      playerStreakMap.set(ans.playerId, pStreak);
    } else {
      pStreak = 0;
      playerStreakMap.set(ans.playerId, 0);
    }
    const isGold = room.mode === "CLASSIC" && Boolean(roomGoldQuestions.get(room.id)?.has(question.id));
    const effectiveBasePoints = isGold ? question.points * 2 : question.points;
    const qKey2 = `${room.id}:${question.id}`;
    const teamCardsMap = roomQuestionTeamCards.get(qKey2);
    const activeCards = ans.teamId && teamCardsMap?.get(ans.teamId) || [];
    let penaltyMultiplier = 1;
    let isTargetedWithRiskCard = false;
    if (teamCardsMap && ans.teamId) {
      for (const [, otherCards] of teamCardsMap) {
        if (otherCards.some((c) => (c.type === "PENALTY" || c.type === "ATTACK") && c.targetTeamId === ans.teamId)) {
          penaltyMultiplier = 2;
          isTargetedWithRiskCard = true;
        }
      }
    }
    const hasDoubleCard = activeCards.some((c) => c.type === "DOUBLE");
    const hasRiskPowerup = hasDoubleCard || isTargetedWithRiskCard;
    const shielded = activeCards.some((c) => c.type === "SHIELD");
    const points = computePointsAwarded({
      basePoints: effectiveBasePoints,
      timeSpent: ans.timeSpent,
      timeLimit: question.timeLimit,
      isCorrect,
      config: effectiveConfig,
      streak: pStreak,
      roomAccuracy,
      topHalfCorrect,
      topHalfTotal,
      bottomHalfCorrect,
      bottomHalfTotal,
      totalParticipants: totalAnswers || allPlayers.length,
      mode: room.mode,
      hasRiskPowerup,
      shielded,
      penaltyMultiplier
    });
    await prisma.answer.update({
      where: { id: ans.id },
      data: { pointsAwarded: points }
    });
    if (points !== 0) {
      const pRes = await applyScoreDeltaToPlayer(ans.playerId, points);
      scoreUpdates.push({
        playerId: ans.playerId,
        teamId: ans.teamId ?? void 0,
        score: pRes.newScore,
        delta: pRes.effectiveDelta
      });
    }
  }
  if (scoreUpdates.length > 0) {
    io2.to(`room:${roomCode}`).emit("game:score:update", scoreUpdates);
  }
}
async function getRoomQuestions(roomId) {
  if (roomQuestionsCache.has(roomId)) {
    return roomQuestionsCache.get(roomId);
  }
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } }
  });
  const questions = room?.quizBank?.questions ?? [];
  if (questions.length > 0) {
    roomQuestionsCache.set(roomId, questions);
  }
  return questions;
}
async function getResolvedQuestion(roomId, questionId, dbQuestion) {
  const cachedQuestions = await getRoomQuestions(roomId);
  const cachedQ = cachedQuestions.find((item) => item.id === questionId);
  const originalQ = roomOriginalQuestions.get(`${roomId}:${questionId}`);
  const fullQ = cachedQ || originalQ || dbQuestion || await prisma.question.findUnique({ where: { id: questionId } });
  const activeQState = roomActiveQuestions.get(roomId);
  if (!fullQ && activeQState?.question?.id === questionId) {
    return activeQState.question;
  }
  if (!fullQ) return null;
  const activeQ = activeQState?.question?.id === questionId ? activeQState.question : null;
  const res = {
    ...fullQ,
    ...activeQ ? {
      points: activeQ.points ?? fullQ.points,
      timeLimit: activeQ.timeLimit ?? fullQ.timeLimit,
      order: activeQ.order ?? fullQ.order
    } : {},
    options: fullQ.options ?? activeQ?.options,
    answer: fullQ.answer ?? activeQ?.answer,
    pairs: fullQ.pairs ?? activeQ?.pairs
  };
  if (res && res.points) {
    res.points = normalizeToThreeLevels(res.points);
  }
  return res;
}
async function revealCurrentAnswer(io2, roomId, roomCode, questionId, customTeamSummaries) {
  stopQuestionTimer(roomId);
  await waitForPendingSubmissions(roomId);
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  const dbQ = await prisma.question.findUnique({ where: { id: questionId } });
  const q = await getResolvedQuestion(roomId, questionId, dbQ);
  if (!room || !q) return;
  const config = room.config;
  let teamScoresUpdates = [];
  let teamSummaries = customTeamSummaries || [];
  let roomAccuracy;
  let rarityBonusPercent;
  let effectiveDifficulty;
  let itemDiscrimination;
  if ((room.mode === "CLASSIC" || room.mode === "ELIMINATION") && room.teamMode === "TEAM") {
    const res = await resolveQuestionTeamScores(io2, room.id, q.id);
    teamScoresUpdates = res.teamScoresUpdates;
    teamSummaries = res.teamSummaries;
    roomAccuracy = res.roomAccuracy;
    rarityBonusPercent = res.rarityBonusPercent;
    effectiveDifficulty = res.effectiveDifficulty;
    itemDiscrimination = res.itemDiscrimination;
    if (teamScoresUpdates.length > 0) {
      io2.to(`room:${roomCode}`).emit("game:score:update", teamScoresUpdates);
    }
  }
  if (room.mode === "ELIMINATION") {
    const interval = Math.max(1, config?.eliminationIntervalQuestions || 3);
    if ((room.currentQuestion + 1) % interval === 0) {
      let roomGhosts = roomEliminationGhostStats.get(room.id);
      if (roomGhosts) {
        for (const [, ghostStat] of roomGhosts.entries()) {
          if (ghostStat.currentRoundCorrect >= interval) {
            ghostStat.ghostRoundAllCorrect = true;
          }
          ghostStat.currentRoundCorrect = 0;
        }
      }
      if (room.teamMode === "TEAM") {
        const activeTeams = await prisma.team.findMany({
          where: { roomId: room.id, isEliminated: false },
          include: { answers: { where: { roomId: room.id } } }
        });
        if (activeTeams.length > 1) {
          activeTeams.sort((a, b) => {
            if (a.score !== b.score) return a.score - b.score;
            const totalA = a.answers.length || 0;
            const corrA = a.answers.filter((x) => x.isCorrect === true).length;
            const accA = totalA > 0 ? corrA / totalA : 0;
            const totalB = b.answers.length || 0;
            const corrB = b.answers.filter((x) => x.isCorrect === true).length;
            const accB = totalB > 0 ? corrB / totalB : 0;
            if (accA !== accB) return accA - accB;
            const timeA = totalA > 0 ? a.answers.reduce((acc, curr) => acc + curr.timeSpent, 0) / totalA : 999999;
            const timeB = totalB > 0 ? b.answers.reduce((acc, curr) => acc + curr.timeSpent, 0) / totalB : 999999;
            return timeB - timeA;
          });
          const configuredTeamsPerStage = Math.max(1, Math.min(3, config?.eliminationTeamsPerStage || 1));
          const numToEliminate = Math.min(configuredTeamsPerStage, activeTeams.length - 1);
          const teamsToEliminate = activeTeams.slice(0, numToEliminate);
          const currentStageNumber = Math.floor((room.currentQuestion + 1) / interval);
          if (!roomGhosts) {
            roomGhosts = /* @__PURE__ */ new Map();
            roomEliminationGhostStats.set(room.id, roomGhosts);
          }
          for (const toElim of teamsToEliminate) {
            await prisma.team.update({
              where: { id: toElim.id },
              data: { isEliminated: true }
            });
            let elimGhostStat = roomGhosts.get(toElim.id);
            if (!elimGhostStat) {
              elimGhostStat = {
                ghostStreak: 0,
                ghostTotalCorrect: 0,
                ghostTotalAnswered: 0,
                ghostTotalTimeSpent: 0,
                ghostRoundAllCorrect: false,
                currentRoundCorrect: 0,
                eliminatedAtStage: currentStageNumber,
                eliminatedAtQuestion: room.currentQuestion,
                firstGhostStage: currentStageNumber + 1
              };
              roomGhosts.set(toElim.id, elimGhostStat);
            } else {
              elimGhostStat.eliminatedAtStage = currentStageNumber;
              elimGhostStat.eliminatedAtQuestion = room.currentQuestion;
              elimGhostStat.firstGhostStage = currentStageNumber + 1;
            }
          }
          io2.to(`room:${roomCode}`).emit("game:elimination:round", {
            eliminatedTeamId: teamsToEliminate.map((t) => t.id).join(","),
            eliminatedTeamName: teamsToEliminate.map((t) => t.name).join(", "),
            eliminatedTeams: teamsToEliminate.map((t) => ({ id: t.id, name: t.name })),
            reason: `\u0110i\u1EC3m s\u1ED1 th\u1EA5p nh\u1EA5t sau v\xF2ng sinh t\u1ED3n ${currentStageNumber} (${teamsToEliminate.length} \u0111\u1ED9i b\u1ECB lo\u1EA1i)`
          });
          const allQuestions = await getRoomQuestions(room.id);
          const totalStages = Math.floor(allQuestions.length / interval);
          const currentStage = Math.floor((room.currentQuestion + 1) / interval);
          if (totalStages >= 4 && currentStage === totalStages - 1) {
            const eliminatedTeams = await prisma.team.findMany({
              where: { roomId: room.id, isEliminated: true }
            });
            const activeGhostCandidates = eliminatedTeams.filter((t) => {
              const stat = roomGhosts?.get(t.id);
              return Boolean(stat && stat.ghostTotalAnswered > 0);
            });
            const ghostCandidates = activeGhostCandidates.length > 0 ? activeGhostCandidates : eliminatedTeams;
            if (ghostCandidates.length > 0) {
              ghostCandidates.sort((a, b) => {
                const statA = roomGhosts?.get(a.id);
                const statB = roomGhosts?.get(b.id);
                const isPerfectA = Boolean(statA?.ghostRoundAllCorrect);
                const isPerfectB = Boolean(statB?.ghostRoundAllCorrect);
                if (isPerfectA !== isPerfectB) {
                  return isPerfectA ? -1 : 1;
                }
                const accA = statA && statA.ghostTotalAnswered > 0 ? statA.ghostTotalCorrect / statA.ghostTotalAnswered : 0;
                const accB = statB && statB.ghostTotalAnswered > 0 ? statB.ghostTotalCorrect / statB.ghostTotalAnswered : 0;
                if (accA !== accB) return accB - accA;
                const elimA = statA?.eliminatedAtQuestion ?? 999999 - (statA?.ghostTotalAnswered || 0);
                const elimB = statB?.eliminatedAtQuestion ?? 999999 - (statB?.ghostTotalAnswered || 0);
                if (elimA !== elimB) {
                  return elimA - elimB;
                }
                const timeA = statA?.ghostTotalTimeSpent ?? 999999;
                const timeB = statB?.ghostTotalTimeSpent ?? 999999;
                if (timeA !== timeB) {
                  return timeA - timeB;
                }
                const corrA = statA?.ghostTotalCorrect || 0;
                const corrB = statB?.ghostTotalCorrect || 0;
                return corrB - corrA;
              });
              const revivalLimit = Math.max(1, Math.min(3, config?.eliminationRevivalCount || 1));
              const toRevive = ghostCandidates.slice(0, revivalLimit);
              const survivingRemaining = activeTeams.filter((t) => !teamsToEliminate.some((elim) => elim.id === t.id));
              const minSurvivingScore = survivingRemaining.length > 0 ? Math.min(...survivingRemaining.map((t) => t.score)) : 0;
              for (const revived of toRevive) {
                await prisma.team.update({
                  where: { id: revived.id },
                  data: { isEliminated: false, score: minSurvivingScore }
                });
                const statRevived = roomGhosts?.get(revived.id);
                if (statRevived) {
                  statRevived.ghostRoundAllCorrect = false;
                }
              }
              if (toRevive.length > 0) {
                const revivedPayloadList = toRevive.map((r) => ({
                  id: r.id,
                  name: r.name,
                  score: minSurvivingScore,
                  eliminatedAtStage: roomGhosts?.get(r.id)?.eliminatedAtStage
                }));
                io2.to(`room:${roomCode}`).emit("elimination:revival", {
                  round: currentStage,
                  revivedTeamId: toRevive[0].id,
                  revivedTeamName: toRevive.map((r) => r.name).join(", "),
                  revivedScore: minSurvivingScore,
                  eliminatedAtStage: roomGhosts?.get(toRevive[0].id)?.eliminatedAtStage,
                  revivedTeams: revivedPayloadList
                });
              }
            }
          }
          const refreshedState = await buildRoomState(room.id);
          io2.to(`room:${roomCode}`).emit("room:state", refreshedState);
          const finalSurviving = await prisma.team.findMany({
            where: { roomId: room.id, isEliminated: false }
          });
          if (finalSurviving.length === 1) {
            await prisma.room.update({ where: { id: room.id }, data: { status: "FINISHED", endedAt: /* @__PURE__ */ new Date() } });
            const leaderboard = await buildLeaderboard(room.id);
            io2.to(`room:${roomCode}`).emit("game:ended", { leaderboard });
            setTimeout(() => cleanupRoomInMemory(room.id), 5e3);
            return;
          }
        }
      }
    }
  }
  const answers = await prisma.answer.findMany({
    where: { roomId: room.id, questionId: q.id },
    include: { player: true, team: true }
  });
  const options = q.options;
  const correctOptions = options && Array.isArray(options) ? options.filter((o) => o.isCorrect) : [];
  let correctAnswer = [];
  let correctAnswerText = "";
  if (correctOptions.length > 0) {
    correctAnswer = correctOptions.map((o) => o.id);
    const labels = ["A", "B", "C", "D", "E", "F"];
    correctAnswerText = correctOptions.map((o) => {
      const idx = (options || []).findIndex((opt) => opt.id === o.id);
      const prefix = idx >= 0 && idx < labels.length ? `${labels[idx]}. ` : "";
      return `${prefix}${o.text}`;
    }).join(" | ");
  } else if (q.answer) {
    correctAnswer = [q.answer];
    correctAnswerText = q.answer;
  }
  const revealPayload = {
    questionId: q.id,
    correctAnswer: Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer],
    correctAnswerText: correctAnswerText || void 0,
    explanation: q.hint || void 0,
    answers: answers.map((a) => ({
      teamId: a.teamId ?? void 0,
      playerId: a.playerId ?? void 0,
      name: a.player?.name ?? a.team?.name ?? "?",
      answer: a.answer,
      isCorrect: a.isCorrect ?? false,
      pointsAwarded: a.pointsAwarded,
      timeSpent: a.timeSpent
    })),
    teamSummaries: teamSummaries.length > 0 ? teamSummaries : void 0,
    roomAccuracy,
    rarityBonusPercent,
    bloomLevel: getBloomLevelFromPoints(q.points),
    effectiveDifficulty,
    itemDiscrimination
  };
  roomRevealPayloads.set(roomId, revealPayload);
  io2.to(`room:${roomCode}`).emit("game:answer:reveal", revealPayload);
  if (room.mode === "MYSTERY_QUEST") {
    const questState = roomMysteryQuests.get(room.id);
    if (questState) {
      const activeAns = answers.find((a) => a.teamId === questState.currentTurnTeamId);
      const isCorrect = Boolean(activeAns?.isCorrect);
      const basePts = normalizeToThreeLevels(q.points || 10);
      if (activeAns) {
        await prisma.answer.update({
          where: { id: activeAns.id },
          data: { pointsAwarded: isCorrect ? basePts : 0 }
        }).catch(() => {
        });
      }
      if (isCorrect) {
        questState.phase = "DECISION_CHOICE";
        questState.survivalDilemmaPending = false;
        questState.isPenaltySurvivalMode = false;
        questState.baseQuestionPoints = basePts;
        questState.potPoints = basePts;
        questState.potMultiplier = 1;
        questState.turnFinishedReason = void 0;
        questState.storyResult = void 0;
        const allTeams = await prisma.team.findMany({ where: { roomId: room.id } });
        synchronizeMysteryStageWithQuestionPoints({
          state: questState,
          questionPoints: basePts,
          theme: questState.theme,
          teams: allTeams
        });
        roomMysteryQuests.set(room.id, questState);
        io2.to(`room:${roomCode}`).emit("game:mystery:update", questState);
      } else {
        const currentTeam = await prisma.team.findUnique({ where: { id: questState.currentTurnTeamId } });
        const teamHearts = questState.teamHearts ? { ...questState.teamHearts } : {};
        const currentHearts = teamHearts[questState.currentTurnTeamId] ?? questState.initialHeartsPerTeam ?? 0;
        const currentScore = currentTeam?.score || 0;
        const allTeams = await prisma.team.findMany({ where: { roomId: room.id } });
        questState.baseQuestionPoints = basePts;
        questState.potPoints = 0;
        questState.potMultiplier = 1;
        questState.turnFinishedReason = void 0;
        if (currentHearts > 0) {
          questState.phase = "DECISION_CHOICE";
          questState.survivalDilemmaPending = true;
          questState.survivalDilemmaChoice = void 0;
          questState.isPenaltySurvivalMode = false;
        } else {
          questState.survivalDilemmaPending = false;
          startSurvivalPenaltyMinigame({
            state: questState,
            team: currentTeam,
            allTeams
          });
        }
        roomMysteryQuests.set(room.id, questState);
        io2.to(`room:${roomCode}`).emit("game:mystery:update", questState);
        if (questState.phase !== "QUESTION_ACTIVE") {
          stopQuestionTimer(room.id);
          roomActiveQuestions.delete(room.id);
          roomRevealPayloads.delete(room.id);
          io2.to(`room:${roomCode}`).emit("game:question:clear");
        }
      }
      const refreshedState = await buildRoomState(room.id);
      io2.to(`room:${roomCode}`).emit("room:state", refreshedState);
    }
  }
}
function stopQuestionTimer(roomId) {
  const key = `${roomId}:timer`;
  if (roomTimers.has(key)) {
    clearInterval(roomTimers.get(key));
    roomTimers.delete(key);
    roomRemainingTimes.delete(key);
  }
  roomTimerEndsAt.delete(roomId);
}
async function buildRoomState(roomId) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      teams: {
        orderBy: { createdAt: "asc" },
        include: { players: true, powerupCards: true }
      },
      players: true,
      powerupCards: { where: { ownerType: "SHARED" } },
      quizBank: { select: { questions: { select: { id: true } } } }
    }
  });
  if (!room) throw new Error("Room not found");
  const config = room.config;
  const rawValidPlayers = room.players.filter((p) => !p.isHost && p.name !== "Host" && p.name !== "Admin Host");
  const isSandboxRoom = isSandboxRoomEntity(room);
  let validPlayers = rawValidPlayers;
  if (isSandboxRoom) {
    const hasPrimaryTester = rawValidPlayers.some((p) => p.id === `sb_${room.code}_t0` || p.name === "B\u1EA1n (Tester)");
    validPlayers = rawValidPlayers.filter((p) => {
      if (hasPrimaryTester && p.id !== `sb_${room.code}_t0` && (p.name.includes("(Tester)") || p.id.startsWith(`sb_${room.code}_t`))) {
        return false;
      }
      return true;
    });
  }
  validPlayers = validPlayers.filter((p, idx, arr) => arr.findIndex((x) => x.id === p.id) === idx);
  const teams = room.teams.map((t) => {
    const teamPlayers = validPlayers.filter((p) => p.teamId === t.id);
    const ghostStat = roomEliminationGhostStats.get(room.id)?.get(t.id);
    return {
      id: t.id,
      name: t.name,
      color: t.color,
      avatar: t.avatar ?? void 0,
      score: t.score,
      isEliminated: t.isEliminated,
      frozenRounds: t.frozenRounds,
      shieldCount: t.shieldCount,
      cards: t.powerupCards.map((c) => ({
        id: c.id,
        type: c.type,
        ownerType: c.ownerType,
        teamId: c.teamId ?? void 0,
        used: c.used
      })),
      playerCount: teamPlayers.length,
      bailoutsRemaining: roomWagers.get(room.id)?.teamBailouts?.[t.id]?.remaining,
      streak: teamStreakMap.get(t.id) || 0,
      isSpectator: t.isEliminated,
      isGhost: room.mode === "ELIMINATION" && t.isEliminated,
      ghostStreak: ghostStat?.ghostStreak || 0,
      ghostRoundAllCorrect: ghostStat?.ghostRoundAllCorrect || false,
      ghostTotalCorrect: ghostStat?.ghostTotalCorrect || 0,
      ghostTotalAnswered: ghostStat?.ghostTotalAnswered || 0,
      ghostCurrentRoundCorrect: ghostStat?.currentRoundCorrect || 0,
      eliminationInterval: config?.eliminationIntervalQuestions || 3,
      eliminatedAtStage: ghostStat?.eliminatedAtStage,
      firstGhostStage: ghostStat?.firstGhostStage,
      hearts: room.mode === "MYSTERY_QUEST" ? roomMysteryQuests.get(room.id)?.teamHearts?.[t.id] ?? roomMysteryQuests.get(room.id)?.initialHeartsPerTeam ?? 0 : void 0
    };
  });
  const players = validPlayers.map((p) => {
    let isConnected = false;
    if (p.socketId && globalIO?.sockets.sockets.has(p.socketId)) {
      isConnected = true;
    } else if (p.socketId && !globalIO) {
      isConnected = true;
    } else {
      for (const [sockId, pId] of playerSockets.entries()) {
        if (pId === p.id && globalIO?.sockets.sockets.has(sockId)) {
          isConnected = true;
          break;
        }
      }
    }
    const isOnline = isConnected || pendingDisconnects.has(p.id);
    const myTeam = p.teamId ? room.teams.find((t) => t.id === p.teamId) : null;
    const isSpectator = Boolean(myTeam?.isEliminated) || Boolean(p.isSpectator);
    return {
      id: p.id,
      name: p.name,
      avatar: p.avatar ?? void 0,
      score: p.score,
      teamId: p.teamId ?? void 0,
      isHost: false,
      isOnline,
      streak: playerStreakMap.get(p.id) || 0,
      isSpectator
    };
  });
  const sharedCards = room.powerupCards.map((c) => ({
    id: c.id,
    type: c.type,
    ownerType: c.ownerType,
    teamId: void 0,
    used: c.used
  }));
  const cachedRoom = roomCache.get(roomId);
  const effectiveStatus = cachedRoom?.status ?? room.status;
  const effectiveCurrentQuestion = cachedRoom?.currentQuestion ?? room.currentQuestion;
  const mysteryState = roomMysteryQuests.get(room.id);
  const effectiveQuestionIndex = room.mode === "MYSTERY_QUEST" && mysteryState ? mysteryState.currentTurnIndex : effectiveCurrentQuestion;
  return {
    id: room.id,
    code: room.code,
    name: room.name,
    mode: room.mode,
    teamMode: room.teamMode,
    status: effectiveStatus,
    currentQuestionIndex: effectiveQuestionIndex,
    totalQuestions: getTargetTotalQuestions(
      room.mode,
      config,
      teams.length,
      (roomQuestionsCache.get(roomId) || room.quizBank?.questions)?.length || 0
    ),
    teams,
    players,
    sharedCards,
    config,
    tournamentState: roomTournaments.get(room.id),
    gridCaroState: roomGridCaros.get(room.id),
    diceRaceState: roomDiceRaces.get(room.id),
    wagerState: roomWagers.get(room.id),
    mysteryQuestState: roomMysteryQuests.get(room.id)
  };
}
function buildQuestionState(q, extra) {
  const options = q.options;
  const bloomLevel = extra?.bloomLevel ?? getBloomLevelFromPoints(q.points);
  return {
    question: {
      id: q.id,
      type: q.type,
      content: q.content,
      options: options?.map(({ id, text }) => ({ id, text })),
      pairs: q.pairs || q.pairsLeft || void 0,
      timeLimit: q.timeLimit,
      mediaUrl: q.mediaUrl,
      mediaType: q.mediaType,
      hint: q.hint,
      order: extra?.order ?? q.order,
      points: q.points,
      bloomLevel
    },
    timeLimit: q.timeLimit,
    startedAt: Date.now(),
    endsAt: extra?.endsAt,
    serverTime: extra?.serverTime ?? Date.now(),
    timerPending: extra?.timerPending ?? true,
    timerStarted: extra?.timerStarted ?? false,
    activeBoosts: [],
    bloomLevel,
    primaryTeamId: extra?.primaryTeamId,
    primaryTeamName: extra?.primaryTeamName,
    isStealPhase: extra?.isStealPhase,
    stealBuzzedTeamId: extra?.stealBuzzedTeamId,
    stealBuzzedTeamName: extra?.stealBuzzedTeamName,
    stealAnsweringActive: extra?.stealAnsweringActive,
    buzzAnsweringActive: extra?.buzzAnsweringActive,
    buzzedTeamId: extra?.buzzedTeamId,
    buzzedTeamName: extra?.buzzedTeamName,
    answerMethod: extra?.answerMethod,
    tournamentMatchId: extra?.tournamentMatchId,
    tournamentTeam1Id: extra?.tournamentTeam1Id,
    tournamentTeam2Id: extra?.tournamentTeam2Id,
    gridCellId: extra?.gridCellId,
    diceRollValue: extra?.diceRollValue,
    wagerPhase: extra?.wagerPhase,
    buzzUnlocked: extra?.buzzUnlocked,
    buzzUnlockMode: extra?.buzzUnlockMode,
    buzzAutoDelaySeconds: extra?.buzzAutoDelaySeconds,
    canRollDice: extra?.canRollDice,
    bouncebackSelectPhase: extra?.bouncebackSelectPhase,
    selectedPointLevel: extra?.selectedPointLevel,
    streakCount: extra?.streakCount,
    speedBonusPercent: extra?.speedBonusPercent,
    rarityBonusPercent: extra?.rarityBonusPercent,
    answerSubmissionMode: extra?.answerSubmissionMode,
    hasSharedPowerupUsed: extra?.hasSharedPowerupUsed ?? false
  };
}
async function resolveQuestionTeamScores(io2, roomId, questionId) {
  await waitForPendingSubmissions(roomId);
  const qKey = `${roomId}:${questionId}`;
  if (roomQuestionScoresCache.has(qKey)) {
    return roomQuestionScoresCache.get(qKey);
  }
  if (roomQuestionProcessed.has(qKey)) {
    return { teamScoresUpdates: [], teamSummaries: [], roomAccuracy: 1, rarityBonusPercent: 0 };
  }
  roomQuestionProcessed.add(qKey);
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      teams: {
        orderBy: { createdAt: "asc" },
        include: { players: true }
      }
    }
  });
  if (!room || room.teamMode !== "TEAM" || room.mode !== "CLASSIC" && room.mode !== "ELIMINATION") {
    return { teamScoresUpdates: [], teamSummaries: [], roomAccuracy: 1, rarityBonusPercent: 0 };
  }
  const dbQuestion = await prisma.question.findUnique({ where: { id: questionId } });
  const question = await getResolvedQuestion(roomId, questionId, dbQuestion);
  if (!question) {
    return { teamScoresUpdates: [], teamSummaries: [], roomAccuracy: 1, rarityBonusPercent: 0 };
  }
  const answers = await prisma.answer.findMany({
    where: { roomId, questionId },
    include: { player: true, team: true }
  });
  const totalAnswers = answers.length;
  const correctAnswersTotal = answers.filter((a) => a.isCorrect === true).length;
  const roomAccuracy = totalAnswers > 0 ? correctAnswersTotal / totalAnswers : 1;
  const sortedTeams = [...room.teams].sort((a, b) => b.score - a.score);
  const midPoint = Math.max(1, Math.floor(sortedTeams.length / 2));
  const topHalfTeamIds = new Set(sortedTeams.slice(0, midPoint).map((t) => t.id));
  const bottomHalfTeamIds = new Set(sortedTeams.slice(midPoint).map((t) => t.id));
  let topHalfCorrect = 0;
  let topHalfTotal = 0;
  let bottomHalfCorrect = 0;
  let bottomHalfTotal = 0;
  for (const a of answers) {
    if (a.teamId && topHalfTeamIds.has(a.teamId)) {
      topHalfTotal++;
      if (a.isCorrect) topHalfCorrect++;
    } else if (a.teamId && bottomHalfTeamIds.has(a.teamId)) {
      bottomHalfTotal++;
      if (a.isCorrect) bottomHalfCorrect++;
    }
  }
  const irtMetrics = calculateItemIRTMetrics({
    rawPoints: question.points || 10,
    roomAccuracy,
    totalParticipants: totalAnswers || room.teams.length,
    topHalfCorrect,
    topHalfTotal,
    bottomHalfCorrect,
    bottomHalfTotal
  });
  const rarityBonusPercent = room.mode === "CLASSIC" || room.mode === "ELIMINATION" ? Math.round(irtMetrics.bonusRate * 100) : roomAccuracy < 0.3 ? Math.round((0.3 - roomAccuracy) * 1.5 * 100) : 0;
  const teamCardsMap = roomQuestionTeamCards.get(qKey);
  const teamScoresUpdates = [];
  const teamSummaries = [];
  const isSandboxRoom = isSandboxRoomEntity(room);
  for (const team of room.teams) {
    const teamAnswers = answers.filter((a) => a.teamId === team.id).sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    const humanMembers = team.players.filter(
      (p) => !isPlayerBot(p) && !p.id?.startsWith("bot_") && !p.name?.includes("\u{1F916}")
    );
    const hasHuman = humanMembers.length > 0 || team.players.some(
      (p) => p.name?.includes("Tester") || p.id?.startsWith("p_sb_") || p.id?.startsWith("sb_")
    );
    let totalOnline = 1;
    let correctAnswers = [];
    let correctTimes = [];
    if (!isSandboxRoom) {
      if (!hasHuman) {
        teamScoresUpdates.push({ teamId: team.id, score: team.score, delta: 0 });
        teamSummaries.push({
          teamId: team.id,
          teamName: team.name,
          teamColor: team.color,
          totalOnlineMembers: 0,
          correctMembers: 0,
          pointsAwarded: 0,
          speedBonus: 0,
          multiplier: 1,
          streak: 0,
          avgTimeSpent: 0,
          basePoints: 0,
          speedPoints: 0,
          streakPoints: 0,
          rarityPoints: 0
        });
        continue;
      }
      const humanAnswers = teamAnswers.filter(
        (a) => !a.playerId || !isPlayerBot({ id: a.playerId })
      );
      const onlineHumans = humanMembers.filter((hm) => !!hm.socketId);
      totalOnline = Math.max(1, humanAnswers.length > 0 ? humanAnswers.length : onlineHumans.length > 0 ? onlineHumans.length : humanMembers.length);
      correctAnswers = humanAnswers.filter((a) => a.isCorrect === true);
      correctTimes = correctAnswers.map((a) => a.timeSpent).filter((t) => typeof t === "number" && t > 0);
    } else {
      const activeSbTeamId = roomSandboxActiveTeam.get(room.id);
      const isTesterTeam = activeSbTeamId && activeSbTeamId === team.id || hasHuman;
      if (isTesterTeam) {
        const testerAnswers = teamAnswers.filter(
          (a) => !a.playerId || !isPlayerBot({ id: a.playerId }) || a.playerId.startsWith("sb_") || a.playerId.startsWith("p_sb_")
        );
        const repAnswer = testerAnswers.find((a) => a.isCorrect === true) || teamAnswers.find((a) => a.isCorrect === true) || testerAnswers[0] || teamAnswers[0];
        const isRepCorrect = repAnswer?.isCorrect === true;
        totalOnline = 1;
        correctAnswers = isRepCorrect && repAnswer ? [repAnswer] : [];
        correctTimes = isRepCorrect && typeof repAnswer?.timeSpent === "number" ? [repAnswer.timeSpent] : [];
      } else {
        const repAnswer = teamAnswers.find((a) => a.isCorrect === true) || teamAnswers[0];
        const isRepCorrect = repAnswer?.isCorrect === true;
        totalOnline = 1;
        correctAnswers = isRepCorrect && repAnswer ? [repAnswer] : [];
        correctTimes = isRepCorrect && typeof repAnswer?.timeSpent === "number" ? [repAnswer.timeSpent] : [1500];
      }
    }
    let teamStreak = teamStreakMap.get(team.id) || 0;
    if (correctAnswers.length > 0) {
      teamStreak += 1;
      teamStreakMap.set(team.id, teamStreak);
    } else {
      teamStreak = 0;
      teamStreakMap.set(team.id, 0);
    }
    const activeCards = teamCardsMap?.get(team.id) || [];
    let multiplier = 1;
    let shielded = team.shieldCount > 0;
    if (activeCards.some((c) => c.type === "DOUBLE" || c.type === "SCORE_X2")) {
      multiplier = 2;
    }
    if (activeCards.some((c) => c.type === "SHIELD")) {
      shielded = true;
    }
    const isGold = room.mode === "CLASSIC" && Boolean(roomGoldQuestions.get(room.id)?.has(question.id));
    if (isGold) {
      multiplier *= 2;
    }
    if (room.mode === "ELIMINATION" && team.isEliminated) {
      let roomGhosts = roomEliminationGhostStats.get(room.id);
      if (!roomGhosts) {
        roomGhosts = /* @__PURE__ */ new Map();
        roomEliminationGhostStats.set(room.id, roomGhosts);
      }
      let ghostStat = roomGhosts.get(team.id);
      if (!ghostStat) {
        ghostStat = { ghostStreak: 0, ghostTotalCorrect: 0, ghostTotalAnswered: 0, ghostTotalTimeSpent: 0, ghostRoundAllCorrect: false, currentRoundCorrect: 0 };
        roomGhosts.set(team.id, ghostStat);
      }
      if (teamAnswers.length > 0) {
        ghostStat.ghostTotalAnswered++;
        const timeSpentThisQ = teamAnswers[0]?.timeSpent || 0;
        ghostStat.ghostTotalTimeSpent = (ghostStat.ghostTotalTimeSpent || 0) + timeSpentThisQ;
        if (correctAnswers.length > 0) {
          ghostStat.ghostTotalCorrect++;
          ghostStat.ghostStreak++;
          ghostStat.currentRoundCorrect++;
        } else {
          ghostStat.ghostStreak = 0;
        }
      }
    }
    let penaltyMultiplier = 1;
    let isTargetedWithRiskCard = false;
    if (teamCardsMap) {
      for (const [, otherCards] of teamCardsMap) {
        if (otherCards.some((c) => (c.type === "PENALTY" || c.type === "ATTACK") && c.targetTeamId === team.id)) {
          penaltyMultiplier = 2;
          isTargetedWithRiskCard = true;
        }
      }
    }
    const hasDoubleCard = activeCards.some((c) => c.type === "DOUBLE");
    const hasRiskPowerup = hasDoubleCard || isTargetedWithRiskCard;
    const effectiveTeamConfig = {
      ...room.config,
      timeBonusEnabled: room.mode === "CLASSIC" || room.mode === "ELIMINATION" ? Boolean(room.config?.timeBonusEnabled !== false) : false
    };
    const teamScoreRes = computeTeamQuestionScore({
      basePoints: question.points,
      timeLimit: question.timeLimit,
      totalOnlineMembers: totalOnline,
      correctMembers: correctAnswers.length,
      correctTimes,
      config: effectiveTeamConfig,
      multiplier,
      shielded,
      penaltyMultiplier,
      hasRiskPowerup,
      roomAccuracy,
      topHalfCorrect,
      topHalfTotal,
      bottomHalfCorrect,
      bottomHalfTotal,
      streak: teamStreak,
      mode: room.mode
    });
    const teamPoints = teamScoreRes.points;
    const speedBonus = teamScoreRes.speedBonus;
    const empiricalMultiplier = teamScoreRes.empiricalMultiplier;
    if (room.mode === "ELIMINATION" && team.isEliminated) {
      teamSummaries.push({
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color,
        totalOnlineMembers: totalOnline,
        correctMembers: correctAnswers.length,
        pointsAwarded: 0,
        speedBonus: Math.round(speedBonus * 100),
        multiplier,
        activeCard: activeCards[0]?.type,
        empiricalMultiplier,
        basePoints: teamScoreRes.basePoints,
        speedPoints: teamScoreRes.speedPoints,
        streakPoints: teamScoreRes.streakPoints,
        rarityPoints: teamScoreRes.rarityPoints,
        streak: teamStreak,
        avgTimeSpent: teamScoreRes.avgTimeSpent,
        isEliminated: true,
        effectiveDifficulty: teamScoreRes.effectiveDifficulty,
        discrimination: teamScoreRes.discrimination
      });
      continue;
    }
    const tRes = await applyScoreDeltaToTeam(team.id, teamPoints);
    if (teamAnswers.length > 0) {
      await prisma.answer.updateMany({
        where: { roomId, questionId, teamId: team.id },
        data: { pointsAwarded: teamPoints }
      }).catch(console.error);
    }
    teamScoresUpdates.push({
      teamId: team.id,
      score: tRes.newScore,
      delta: tRes.effectiveDelta
    });
    teamSummaries.push({
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color,
      totalOnlineMembers: totalOnline,
      correctMembers: correctAnswers.length,
      pointsAwarded: teamPoints,
      speedBonus: Math.round(speedBonus * 100),
      multiplier,
      activeCard: activeCards[0]?.type,
      empiricalMultiplier,
      basePoints: teamScoreRes.basePoints,
      speedPoints: teamScoreRes.speedPoints,
      streakPoints: teamScoreRes.streakPoints,
      rarityPoints: teamScoreRes.rarityPoints,
      streak: teamStreak,
      avgTimeSpent: teamScoreRes.avgTimeSpent,
      isEliminated: false,
      effectiveDifficulty: teamScoreRes.effectiveDifficulty,
      discrimination: teamScoreRes.discrimination
    });
  }
  const scoreResult = {
    teamScoresUpdates,
    teamSummaries,
    roomAccuracy,
    rarityBonusPercent,
    effectiveDifficulty: irtMetrics.bEffective,
    itemDiscrimination: irtMetrics.discrimination
  };
  roomQuestionScoresCache.set(qKey, scoreResult);
  return scoreResult;
}
async function finalizeQuestionOnTimeUp(io2, roomId, roomCode, questionId) {
  const activeQ = roomActiveQuestions.get(roomId);
  if (activeQ?.question?.id && activeQ.question.id !== questionId) {
    return;
  }
  stopQuestionTimer(roomId);
  await waitForPendingSubmissions(roomId);
  const key = `${roomId}:timer`;
  roomRemainingTimes.set(key, 0);
  roomTimerEndsAt.delete(roomId);
  io2.to(`room:${roomCode}`).emit("game:timer", { remaining: 0, total: 30, endsAt: Date.now(), serverTime: Date.now() });
  io2.to(`room:${roomCode}`).emit("game:timer:expired", { questionId });
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return;
  const qKey = `${roomId}:${questionId}`;
  const isMcMode = room.config?.answerMethod === "MC";
  if (isMcMode) {
    return;
  }
  if (room.mode === "BOUNCEBACK") {
    const stealInfo = roomStealBuzzed.get(qKey);
    const primary = roomPrimaryTeams.get(qKey);
    const activeQ2 = roomActiveQuestions.get(roomId);
    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (stealInfo) {
      const existingAns = await prisma.answer.findFirst({
        where: {
          roomId,
          questionId,
          OR: [
            { teamId: stealInfo.teamId },
            { playerId: stealInfo.playerId }
          ]
        },
        orderBy: { submittedAt: "desc" }
      });
      const ansArr = existingAns?.answer ? Array.isArray(existingAns.answer) ? existingAns.answer.map(String) : [String(existingAns.answer)] : [];
      const { isAutoCorrect, answerText } = evaluateAnswerCorrectness(question, ansArr);
      if (activeQ2) {
        activeQ2.bouncebackAwaitingJudgment = "STEAL";
        activeQ2.bouncebackStealAnswer = ansArr;
        activeQ2.bouncebackAutoCorrect = isAutoCorrect;
        activeQ2.bouncebackAnswerText = answerText;
        io2.to(`room:${roomCode}`).emit("game:question", activeQ2);
      }
      const stealTimeoutPayload = {
        phase: "STEAL",
        targetTeamId: stealInfo.teamId,
        targetTeamName: stealInfo.teamName,
        answer: ansArr,
        points: roomBouncebackSelectedPoints.get(qKey) ?? 20,
        isAutoCorrect,
        answerText
      };
      io2.to(`room:${roomCode}`).emit("game:bounceback:awaiting_judgment", stealTimeoutPayload);
      io2.to(`room:${roomCode}:admin`).emit("game:bounceback:awaiting_judgment", stealTimeoutPayload);
      return;
    } else if (primary) {
      const teamPlayers = await prisma.player.findMany({ where: { roomId, teamId: primary.teamId }, select: { id: true } });
      const teamPlayerIds = teamPlayers.map((p) => p.id);
      const existingAns = await prisma.answer.findFirst({
        where: {
          roomId,
          questionId,
          OR: [
            { teamId: primary.teamId },
            ...teamPlayerIds.length > 0 ? [{ playerId: { in: teamPlayerIds } }] : []
          ]
        },
        orderBy: { submittedAt: "desc" }
      });
      const ansArr = existingAns?.answer ? Array.isArray(existingAns.answer) ? existingAns.answer.map(String) : [String(existingAns.answer)] : [];
      const { isAutoCorrect, answerText } = evaluateAnswerCorrectness(question, ansArr);
      if (activeQ2) {
        activeQ2.bouncebackAwaitingJudgment = "PRIMARY";
        activeQ2.bouncebackPrimaryAnswer = ansArr;
        activeQ2.bouncebackAutoCorrect = isAutoCorrect;
        activeQ2.bouncebackAnswerText = answerText;
        io2.to(`room:${roomCode}`).emit("game:question", activeQ2);
      }
      const primaryTimeoutPayload = {
        phase: "PRIMARY",
        targetTeamId: primary.teamId,
        targetTeamName: primary.teamName,
        answer: ansArr,
        points: roomBouncebackSelectedPoints.get(qKey) ?? 20,
        isAutoCorrect,
        answerText
      };
      io2.to(`room:${roomCode}`).emit("game:bounceback:awaiting_judgment", primaryTimeoutPayload);
      io2.to(`room:${roomCode}:admin`).emit("game:bounceback:awaiting_judgment", primaryTimeoutPayload);
      return;
    }
  } else if (room.mode === "BUZZ") {
    if (roomBuzzFirst.has(qKey)) {
      await finalizeBuzzAnswer(io2, roomId, roomCode, questionId);
    }
  } else if (room.mode === "TOURNAMENT") {
    await finalizeTournamentQuestion(io2, roomId, roomCode, questionId);
  } else if (room.mode === "GRID_CARO") {
    await finalizeGridCaroQuestion(io2, roomId, roomCode, questionId);
  } else if (room.mode === "WAGER") {
    await finalizeWagerQuestion(io2, roomId, roomCode, questionId);
  } else if (room.mode === "DICE_RACE") {
    await finalizeDiceRaceQuestion(io2, roomId, roomCode, questionId);
  } else if (room.mode === "CLASSIC" || room.mode === "ELIMINATION") {
    if (room.teamMode !== "TEAM") {
      await finalizeIndividualScores(io2, roomId, roomCode, questionId);
    }
    await revealCurrentAnswer(io2, roomId, roomCode, questionId);
  } else {
    if (room.teamMode !== "TEAM") {
      await finalizeIndividualScores(io2, roomId, roomCode, questionId);
    }
    await revealCurrentAnswer(io2, roomId, roomCode, questionId);
  }
}
function startQuestionTimer(io2, roomCode, roomId, questionId, timeLimit) {
  stopQuestionTimer(roomId);
  const key = `${roomId}:timer`;
  const endsAt = Date.now() + timeLimit * 1e3;
  roomQuestionStartedAt.set(roomId, Date.now());
  roomTimerEndsAt.set(roomId, endsAt);
  roomRemainingTimes.set(key, timeLimit);
  const activeQ = roomActiveQuestions.get(roomId);
  if (activeQ && activeQ.question?.id === questionId) {
    activeQ.timerPending = false;
    activeQ.timerStarted = true;
    activeQ.endsAt = endsAt;
    activeQ.serverTime = Date.now();
  }
  io2.to(`room:${roomCode}`).emit("game:timer", {
    remaining: timeLimit,
    total: timeLimit,
    endsAt,
    serverTime: Date.now()
  });
  roomTimers.set(key, setInterval(async () => {
    const cur = roomRemainingTimes.get(key) ?? timeLimit;
    const remaining = cur - 1;
    roomRemainingTimes.set(key, remaining);
    io2.to(`room:${roomCode}`).emit("game:timer", {
      remaining: Math.max(0, remaining),
      total: timeLimit,
      endsAt,
      serverTime: Date.now()
    });
    if (remaining <= 0) {
      stopQuestionTimer(roomId);
      await new Promise((r) => setTimeout(r, 350));
      await waitForPendingSubmissions(roomId);
      await finalizeQuestionOnTimeUp(io2, roomId, roomCode, questionId);
    }
  }, 1e3));
}
async function buildLeaderboard(roomId) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      teams: true,
      players: true,
      answers: true
    }
  });
  if (!room) return [];
  const championId = roomTieBreakers.get(roomId)?.championTeamId;
  if (room.mode === "DICE_RACE") {
    const diceState = roomDiceRaces.get(roomId);
    if (diceState) {
      return room.teams.slice().sort((a, b) => {
        if (championId) {
          if (a.id === championId) return -1;
          if (b.id === championId) return 1;
        }
        const progA = diceState.teamPositions[a.id];
        const progB = diceState.teamPositions[b.id];
        if (progA?.hasFinished && progB?.hasFinished) {
          return (progA.finishRank || 999) - (progB.finishRank || 999);
        }
        if (progA?.hasFinished) return -1;
        if (progB?.hasFinished) return 1;
        const posA = progA?.position ?? 0;
        const posB = progB?.position ?? 0;
        if (posB !== posA) return posB - posA;
        const corrA = room.answers.filter((ans) => ans.teamId === a.id && ans.isCorrect).length;
        const corrB = room.answers.filter((ans) => ans.teamId === b.id && ans.isCorrect).length;
        return corrB - corrA;
      }).map((t, i) => {
        const prog = diceState.teamPositions[t.id];
        const pos = prog?.position ?? 0;
        return {
          rank: i + 1,
          teamId: t.id,
          name: t.name,
          score: pos + 1,
          correctAnswers: room.answers.filter((a) => a.teamId === t.id && a.isCorrect).length,
          totalAnswers: room.answers.filter((a) => a.teamId === t.id).length
        };
      });
    }
  }
  if (room.teamMode === "TEAM") {
    return room.teams.slice().sort((a, b) => {
      if (championId) {
        if (a.id === championId && a.score === b.score) return -1;
        if (b.id === championId && a.score === b.score) return 1;
      }
      return b.score - a.score;
    }).map((t, i) => ({
      rank: i + 1,
      teamId: t.id,
      name: t.name,
      score: t.score,
      correctAnswers: room.answers.filter((a) => a.teamId === t.id && a.isCorrect).length,
      totalAnswers: room.answers.filter((a) => a.teamId === t.id).length
    }));
  } else {
    const validPlayers = room.players.filter((p) => !p.isHost && p.name !== "Host" && p.name !== "Admin Host");
    return validPlayers.slice().sort((a, b) => {
      if (championId) {
        if (a.id === championId && a.score === b.score) return -1;
        if (b.id === championId && a.score === b.score) return 1;
      }
      return b.score - a.score;
    }).map((p, i) => ({
      rank: i + 1,
      playerId: p.id,
      name: p.name,
      score: p.score,
      correctAnswers: room.answers.filter((a) => a.playerId === p.id && a.isCorrect).length,
      totalAnswers: room.answers.filter((a) => a.playerId === p.id).length
    }));
  }
}
async function safelyFinishGame({
  io: io2,
  room,
  questions
}) {
  const leaderboard = await buildLeaderboard(room.id);
  const shouldEnd = await checkAndTriggerTieBreakerIfTied({
    io: io2,
    room,
    leaderboard,
    roomQuestions: questions,
    onGameEnd: async () => {
      room.status = "FINISHED";
      roomCache.set(room.id, room);
      await prisma.room.update({
        where: { id: room.id },
        data: { status: "FINISHED", endedAt: /* @__PURE__ */ new Date() }
      }).catch(console.error);
      const finalLb = await buildLeaderboard(room.id);
      io2.to(`room:${room.code}`).emit("game:ended", { leaderboard: finalLb });
      setTimeout(() => cleanupRoomInMemory(room.id), 5e3);
    }
  });
  if (!shouldEnd) {
    return false;
  }
  room.status = "FINISHED";
  roomCache.set(room.id, room);
  await prisma.room.update({
    where: { id: room.id },
    data: { status: "FINISHED", endedAt: /* @__PURE__ */ new Date() }
  }).catch(console.error);
  io2.to(`room:${room.code}`).emit("game:ended", { leaderboard });
  setTimeout(() => cleanupRoomInMemory(room.id), 5e3);
  return true;
}

// src/lib/room-cleanup.ts
async function cleanupStaleRooms(options = {}) {
  const {
    finishedMaxAgeHours = 2,
    sandboxMaxAgeHours = 1,
    lobbyMaxAgeHours = 6,
    playingMaxAgeHours = 12,
    emptyMaxAgeHours = 2,
    forceAllFinished = false,
    forceAllSandbox = false
  } = options;
  const now = /* @__PURE__ */ new Date();
  const finishedCutoff = new Date(now.getTime() - finishedMaxAgeHours * 60 * 60 * 1e3);
  const sandboxCutoff = new Date(now.getTime() - sandboxMaxAgeHours * 60 * 60 * 1e3);
  const lobbyCutoff = new Date(now.getTime() - lobbyMaxAgeHours * 60 * 60 * 1e3);
  const playingCutoff = new Date(now.getTime() - playingMaxAgeHours * 60 * 60 * 1e3);
  const emptyCutoff = new Date(now.getTime() - emptyMaxAgeHours * 60 * 60 * 1e3);
  const orConditions = [
    // 1. Finished rooms older than cutoff
    {
      status: "FINISHED",
      OR: [
        { endedAt: { lte: finishedCutoff } },
        { updatedAt: { lte: finishedCutoff } }
      ]
    },
    // 2. Sandbox rooms older than cutoff
    {
      name: { startsWith: "[Sandbox]" },
      createdAt: { lte: sandboxCutoff }
    },
    // 3. Stale unplayed lobbies
    {
      status: "LOBBY",
      createdAt: { lte: lobbyCutoff }
    },
    // 4. Stale abandoned games
    {
      status: { in: ["PLAYING", "PAUSED"] },
      updatedAt: { lte: playingCutoff }
    },
    // 5. Empty rooms with 0 players
    {
      players: { none: {} },
      createdAt: { lte: emptyCutoff }
    }
  ];
  if (forceAllFinished) {
    orConditions.push({ status: "FINISHED" });
  }
  if (forceAllSandbox) {
    orConditions.push(
      { name: { startsWith: "[Sandbox]" } },
      { code: { startsWith: "sb_" } }
    );
  }
  const staleRooms = await prisma.room.findMany({
    where: {
      OR: orConditions
    },
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      createdAt: true,
      endedAt: true
    }
  });
  if (staleRooms.length === 0) {
    return { deletedCount: 0, roomsDeleted: [] };
  }
  const globalForSockets2 = globalThis;
  const roomsDeleted = [];
  for (const r of staleRooms) {
    try {
      globalForSockets2.cleanupRoomInMemory?.(r.id);
      await prisma.room.delete({
        where: { id: r.id }
      });
      roomsDeleted.push(r);
    } catch (err) {
      console.error(`[room-cleanup] Failed to delete room ${r.code} (${r.id}):`, err);
    }
  }
  return {
    deletedCount: roomsDeleted.length,
    roomsDeleted
  };
}

// server.ts
async function ensureDatabaseSchema() {
  try {
    const modes = [
      "CLASSIC",
      "BUZZ",
      "BOUNCEBACK",
      "ELIMINATION",
      "TOURNAMENT",
      "GRID_CARO",
      "DICE_RACE",
      "WAGER",
      "MYSTERY_QUEST"
    ];
    for (const m of modes) {
      await prisma.$executeRawUnsafe(`ALTER TYPE "GameMode" ADD VALUE IF NOT EXISTS '${m}'`).catch(() => {
      });
    }
    await prisma.$executeRawUnsafe(`ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'CLOZE_DROPDOWN'`).catch(() => {
    });
    await prisma.$executeRawUnsafe(`ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "mediaPlaybackMode" TEXT DEFAULT 'AFTER_PLAY'`).catch(() => {
    });
    await prisma.$executeRawUnsafe(`ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "allowManualGrading" BOOLEAN DEFAULT false`).catch(() => {
    });
    await prisma.$executeRawUnsafe(`ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "gradingCriteria" TEXT`).catch(() => {
    });
    console.log("[DB] GameMode and Question schema verified/synchronized with database.");
  } catch (err) {
    console.warn("[DB] Note on schema sync:", err);
  }
}
process.on("unhandledRejection", (reason, promise) => {
  console.error("[Process Safety] Unhandled Promise Rejection:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("[Process Safety] Uncaught Exception:", error);
});
var dev = process.env.NODE_ENV !== "production";
var hostname = process.env.HOSTNAME || "0.0.0.0";
var port = parseInt(process.env.PORT ?? "3000", 10);
var app = (0, import_next.default)({ dev, hostname, port });
var handle = app.getRequestHandler();
app.prepare().then(async () => {
  await ensureDatabaseSchema();
  const httpServer = (0, import_http.createServer)(async (req, res) => {
    try {
      const parsedUrl = (0, import_url.parse)(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });
  const io2 = initSocketServer(httpServer);
  registerSocketHandlers(io2);
  const CLEANUP_INTERVAL_MS = 15 * 60 * 1e3;
  setTimeout(() => {
    cleanupStaleRooms().then((res) => {
      if (res.deletedCount > 0) {
        console.log(`[Room Cleanup] Initial boot cleanup purged ${res.deletedCount} stale room(s).`);
      }
    }).catch((err) => console.error("[Room Cleanup] Initial error:", err));
    setInterval(() => {
      cleanupStaleRooms().then((res) => {
        if (res.deletedCount > 0) {
          console.log(`[Room Cleanup] Periodic cleanup purged ${res.deletedCount} stale room(s).`);
        }
      }).catch((err) => console.error("[Room Cleanup] Periodic error:", err));
    }, CLEANUP_INTERVAL_MS);
  }, 1e4);
  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Socket.IO server initialized`);
  });
});
