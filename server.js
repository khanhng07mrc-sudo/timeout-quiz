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
      origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
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
    color: "#3b82f6"
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
    color: "#f59e0b"
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
    color: "#10b981"
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
    color: "#60a5fa"
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
    color: "#ef4444"
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
    tag: "Chi\u1EBFn thu\u1EADt",
    color: "#8b5cf6"
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
    tag: "Th\u1EDDi gian",
    color: "#ec4899"
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
    color: "#06b6d4"
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
    color: "#eab308"
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
    color: "#dc2626"
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
  if (points <= 10) return 15;
  if (points <= 20) return 20;
  return 30;
}
function getBuzzedAnswerTimeLimit(question, overridePoints) {
  if (question.type === "MC_SINGLE" || question.type === "TRUE_FALSE") {
    return 5;
  }
  const effPoints = overridePoints !== void 0 ? overridePoints : question.points ?? 10;
  const bloom = question.bloomLevel ?? getBloomLevelFromPoints(effPoints);
  const isHigh = bloom === "ANALYZE" || effPoints >= 30;
  const isMedium = bloom === "APPLY" || effPoints >= 20;
  if (question.type === "MATCHING" || question.type === "DRAG_DROP") {
    if (isHigh) return 25;
    if (isMedium) return 20;
    return 15;
  }
  if (isHigh) return 20;
  if (isMedium) return 15;
  return 10;
}
function getStandardQuestionTimeLimit(question, overridePoints) {
  const effPoints = overridePoints !== void 0 ? overridePoints : question.points ?? 10;
  if (effPoints <= 10) return 15;
  if (effPoints <= 20) return 20;
  return 30;
}

// src/lib/game-engine/scoring.ts
function normalizeToThreeLevels(points) {
  if (points <= 10) return 10;
  if (points <= 20) return 20;
  return 30;
}
function computePointsAwarded(ctx) {
  if (!ctx.isCorrect) {
    if (!ctx.config.penaltyForWrong) return 0;
    const penalty = Math.floor(ctx.basePoints * 0.5);
    if (ctx.shielded) return 0;
    const pm = ctx.penaltyMultiplier ?? 1;
    return -Math.floor(penalty * pm);
  }
  let score = ctx.basePoints;
  if (ctx.config.timeBonusEnabled) {
    const remainingRatio = Math.max(
      0,
      1 - ctx.timeSpent / (ctx.timeLimit * 1e3)
    );
    const speedBonus = Math.floor(ctx.basePoints * 0.5 * remainingRatio);
    score += speedBonus;
  }
  if (ctx.streak && ctx.streak >= 2) {
    let streakRate = 0.1;
    if (ctx.streak === 3) streakRate = 0.2;
    else if (ctx.streak === 4) streakRate = 0.3;
    else if (ctx.streak >= 5) streakRate = 0.5;
    const streakBonus = Math.floor(ctx.basePoints * streakRate);
    score += streakBonus;
  }
  if (ctx.roomAccuracy !== void 0 && ctx.roomAccuracy < 0.3) {
    const rarityDelta = 0.3 - Math.max(0, ctx.roomAccuracy);
    const rarityBonus = Math.floor(ctx.basePoints * rarityDelta * 1.5);
    score += rarityBonus;
  }
  const multiplier = ctx.multiplier ?? 1;
  return Math.floor(score * multiplier);
}
function computeTeamQuestionScore(ctx) {
  const total = Math.max(1, ctx.totalOnlineMembers);
  const accuracyRatio = Math.min(1, Math.max(0, ctx.correctMembers / total));
  let empiricalMultiplier = 1;
  if (ctx.roomAccuracy !== void 0 && ctx.roomAccuracy < 0.3) {
    const rarityDelta = 0.3 - Math.max(0, ctx.roomAccuracy);
    empiricalMultiplier = 1 + rarityDelta * 1.5;
  }
  if (ctx.correctMembers === 0) {
    if (!ctx.config.penaltyForWrong || ctx.shielded) {
      return { points: 0, accuracyRatio: 0, speedBonus: 0, avgTimeSpent: 0, empiricalMultiplier, streakBonus: 0 };
    }
    const pm = ctx.penaltyMultiplier ?? 1;
    const penalty = Math.floor(ctx.basePoints * 0.5 * pm);
    return { points: -penalty, accuracyRatio: 0, speedBonus: 0, avgTimeSpent: 0, empiricalMultiplier, streakBonus: 0 };
  }
  const avgTimeSpent = ctx.correctTimes.length > 0 ? ctx.correctTimes.reduce((a, b) => a + b, 0) / ctx.correctTimes.length : ctx.timeLimit * 1e3;
  let speedBonus = 0;
  if (ctx.config.timeBonusEnabled) {
    const remainingRatio = Math.max(0, 1 - avgTimeSpent / (ctx.timeLimit * 1e3));
    speedBonus = remainingRatio * 0.5;
  }
  let streakMultiplier = 1;
  let streakBonus = 0;
  if (ctx.streak && ctx.streak >= 2) {
    if (ctx.streak === 2) streakBonus = 0.1;
    else if (ctx.streak === 3) streakBonus = 0.2;
    else if (ctx.streak === 4) streakBonus = 0.3;
    else if (ctx.streak >= 5) streakBonus = 0.5;
    streakMultiplier = 1 + streakBonus;
  }
  const multiplier = ctx.multiplier ?? 1;
  const rawScore = ctx.basePoints * empiricalMultiplier * streakMultiplier * (1 + speedBonus) * accuracyRatio * multiplier;
  const points = Math.floor(rawScore);
  return { points, accuracyRatio, speedBonus, avgTimeSpent, empiricalMultiplier, streakBonus };
}
function computeStealAmount(leaderScore, stealerScore) {
  const diff = leaderScore - stealerScore;
  if (diff <= 0) return 0;
  return Math.floor(Math.min(diff * 0.2, leaderScore * 0.1, 50));
}

// src/lib/game-engine/dice-race.ts
function generateBalancedDiceTiles(totalTiles = 30, options = { randomize: true }) {
  const count = Math.max(30, Math.min(50, totalTiles || 30));
  const tiles = [];
  const validateLayout = (map) => {
    const indices = Object.keys(map).map((k) => parseInt(k, 10)).sort((a, b) => a - b);
    if (indices.some((idx) => idx <= 2 || idx >= count - 2)) return false;
    for (let i = 0; i < indices.length - 1; i++) {
      if (Math.abs(indices[i] - indices[i + 1]) < 2) return false;
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
        if (Math.abs(extraRollIndices[i] - extraRollIndices[j]) < 7) return false;
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
      const alphaIn = 7 + Math.floor(Math.random() * Math.min(4, Math.max(1, count - 20)));
      const alphaOut = alphaIn + 6 + Math.floor(Math.random() * Math.min(3, Math.max(1, count - alphaIn - 8)));
      tempMap[alphaIn] = { type: "TELEPORT", label: "\u{1F300} C\u1ED5ng Kh\xF4ng Gian", portalId: "Alpha", teleportTargetIndex: alphaOut };
      tempMap[alphaOut] = { type: "TELEPORT_EXIT", label: "\u2728 C\u1ED5ng Ra An To\xE0n", portalId: "Alpha" };
      if (count >= 40) {
        const betaIn = alphaOut + 4 + Math.floor(Math.random() * Math.min(6, count - alphaOut - 10));
        const betaOut = betaIn + 6 + Math.floor(Math.random() * Math.min(4, count - betaIn - 4));
        if (betaIn < count - 7 && betaOut < count - 2 && Math.abs(betaIn - alphaOut) >= 2) {
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
        { type: "SWAP", label: "\u{1F500} \u0110\u1ED5i ch\u1ED7" }
      ];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const candidateSlots = [];
      for (let s = 3; s <= count - 4; s++) {
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
          const violatesGap = Object.keys(tempMap).some((k) => Math.abs(parseInt(k, 10) - slot) < 2);
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
              ([k, v]) => v.type === "EXTRA_ROLL" && Math.abs(parseInt(k, 10) - slot) < 7
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
    specialMap[4] = { type: "BOOST", label: "\u{1F680} +2 B\u01B0\u1EDBc", effectValue: 2 };
    specialMap[7] = { type: "BOOST", label: "\u{1F680} +2 B\u01B0\u1EDBc", effectValue: 2 };
    specialMap[10] = {
      type: "TELEPORT",
      label: "\u{1F300} C\u1ED5ng Kh\xF4ng Gian",
      portalId: "Alpha",
      teleportTargetIndex: 17
    };
    specialMap[12] = { type: "EXTRA_ROLL", label: "\u{1F3B2} x2 C\u01A1 h\u1ED9i" };
    specialMap[15] = { type: "TRAP", label: "\u{1F4A5} B\u1EABy -2 B\u01B0\u1EDBc", effectValue: -2 };
    specialMap[17] = {
      type: "TELEPORT_EXIT",
      label: "\u2728 C\u1ED5ng Ra An To\xE0n",
      portalId: "Alpha"
    };
    specialMap[19] = { type: "EXTRA_ROLL", label: "\u{1F3B2} x2 C\u01A1 h\u1ED9i" };
    specialMap[21] = { type: "SWAP", label: "\u{1F500} \u0110\u1ED5i ch\u1ED7" };
    specialMap[23] = { type: "SHIELD", label: "\u{1F6E1}\uFE0F Khi\xEAn" };
    specialMap[26] = { type: "TRAP", label: "\u{1F4A5} B\u1EABy -2 B\u01B0\u1EDBc", effectValue: -2 };
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
      const otherTeams = Object.values(diceState.teamPositions).filter((t) => t.teamId !== teamId);
      otherTeams.sort((a, b) => b.position - a.position);
      if (otherTeams.length > 0 && otherTeams[0].position > newPos) {
        const opp = otherTeams[0];
        if (opp.hasShield) {
          opp.hasShield = false;
          effectMessage += ` \u2794 \u{1F500} C\u1ED1 ho\xE1n \u0111\u1ED5i v\u1ECB tr\xED v\u1EDBi ${opp.teamName} nh\u01B0ng b\u1ECB Khi\xEAn \u0111\u1ED1i th\u1EE7 ch\u1EB7n \u0111\u1EE9ng!`;
        } else {
          const tempPos = opp.position;
          opp.position = newPos;
          newPos = tempPos;
          swappedWithTeamId = opp.teamId;
          effectMessage += ` \u2794 \u{1F500} Ho\xE1n \u0111\u1ED5i v\u1ECB tr\xED th\u1EA7n th\xE1nh v\u1EDBi ${opp.teamName}! B\u1EA1n v\u1ECDt l\xEAn \xD4 #${newPos + 1}!`;
        }
      } else {
        effectMessage += ` \u2794 \u{1F500} \xD4 \u0110\u1ED5i ch\u1ED7, nh\u01B0ng kh\xF4ng c\xF3 \u0111\u1ED1i th\u1EE7 n\xE0o ph\xEDa tr\u01B0\u1EDBc \u0111\u1EC3 ho\xE1n \u0111\u1ED5i.`;
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
  // TOURNAMENT: 1v1 đối kháng trực diện -> ATTACK (Ép trả lời 10s), STEAL (Cướp lượt), PENALTY (Gấp đôi phạt), SHIELD (Kháng công), DOUBLE, SCORE_X2, FREEZE, SKIP, TIME_PLUS.
  TOURNAMENT: ["ATTACK", "STEAL", "PENALTY", "SHIELD", "DOUBLE", "SCORE_X2", "FREEZE", "SKIP", "TIME_PLUS"],
  // GRID_CARO: Bàn cờ chiến thuật -> DOUBLE, SCORE_X2, FREEZE, SHIELD, SKIP, TIME_PLUS.
  GRID_CARO: ["DOUBLE", "SCORE_X2", "FREEZE", "SHIELD", "SKIP", "TIME_PLUS"],
  // DICE_RACE: Nước rút (+2 bước), Bứt phá (+1 bước), Thêm giờ, 50/50, Đổi câu.
  DICE_RACE: ["DOUBLE", "SCORE_X2", "TIME_PLUS", "FIFTY_FIFTY", "SKIP"],
  // WAGER: Cược điểm -> FIFTY_FIFTY, SHIELD (Bảo hiểm cược mất 50%), TIME_PLUS, SKIP. CẤM STEAL và FREEZE.
  WAGER: ["FIFTY_FIFTY", "SHIELD", "TIME_PLUS", "SKIP"],
  // CLASSIC / POWERUP: Toàn bộ 10 thẻ.
  CLASSIC: ["FIFTY_FIFTY", "DOUBLE", "FREEZE", "ATTACK", "SKIP", "TIME_PLUS", "SHIELD", "STEAL", "PENALTY", "SCORE_X2"],
  POWERUP: ["FIFTY_FIFTY", "DOUBLE", "FREEZE", "ATTACK", "SKIP", "TIME_PLUS", "SHIELD", "STEAL", "PENALTY", "SCORE_X2"]
};
function getDefaultAllowedPowerupsForMode(mode) {
  return DEFAULT_ALLOWED_POWERUPS_BY_MODE[mode] || DEFAULT_ALLOWED_POWERUPS_BY_MODE.CLASSIC;
}
function isPowerupAllowedForMode(mode, cardType) {
  const allowed = getDefaultAllowedPowerupsForMode(mode);
  return allowed.includes(cardType);
}

// src/lib/utils.ts
function getTargetTotalQuestions(mode, config, teamsCount, bankTotal) {
  const safeBankTotal = Math.max(1, bankTotal);
  const safeTeamsCount = Math.max(1, teamsCount);
  if (mode === "WAGER") {
    const rounds = config?.wagerRoundsPerTeam || 2;
    return Math.min(safeBankTotal, safeTeamsCount * rounds);
  }
  if (mode === "BOUNCEBACK") {
    const cycles = config?.bouncebackCycles || 1;
    const qPerTurn = config?.bouncebackQuestionsPerTurn || 3;
    return Math.min(safeBankTotal, safeTeamsCount * cycles * qPerTurn);
  }
  if (mode === "GRID_CARO") {
    const rounds = config?.gridRoundsPerTeam;
    if (rounds && rounds > 0) {
      return Math.min(safeBankTotal, safeTeamsCount * rounds);
    }
    if (config?.gridMaxQuestions && config.gridMaxQuestions > 0) {
      return Math.min(safeBankTotal, config.gridMaxQuestions);
    }
    return safeBankTotal;
  }
  if (mode === "DICE_RACE") {
    if (config?.diceRaceMaxQuestions && config.diceRaceMaxQuestions > 0) {
      return Math.min(safeBankTotal, config.diceRaceMaxQuestions);
    }
    return safeBankTotal;
  }
  if (config?.matchMaxQuestions && config.matchMaxQuestions > 0) {
    return Math.min(safeBankTotal, config.matchMaxQuestions);
  }
  return safeBankTotal;
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
    if (payload.role === "admin" || payload.role === "ADMIN" || payload.userId) return true;
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

// src/lib/socket-handlers.ts
var globalIO;
var pendingDisconnects = /* @__PURE__ */ new Map();
var playerSockets = /* @__PURE__ */ new Map();
var adminSockets = /* @__PURE__ */ new Map();
var roomTimers = /* @__PURE__ */ new Map();
var roomRemainingTimes = /* @__PURE__ */ new Map();
var roomTimerEndsAt = /* @__PURE__ */ new Map();
var roomQuestionTeamCards = /* @__PURE__ */ new Map();
var roomFrozenTeams = /* @__PURE__ */ new Map();
var roomFiftyFifty = /* @__PURE__ */ new Map();
var roomQuestionProcessed = /* @__PURE__ */ new Set();
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
var roomTournaments = /* @__PURE__ */ new Map();
var roomGridCaros = /* @__PURE__ */ new Map();
var roomDiceRaces = /* @__PURE__ */ new Map();
var roomWagers = /* @__PURE__ */ new Map();
var roomUsedQuestions = /* @__PURE__ */ new Map();
var roomWagerTimers = /* @__PURE__ */ new Map();
var roomWagerAutoLaunchTimers = /* @__PURE__ */ new Map();
var roomGridTimers = /* @__PURE__ */ new Map();
var roomActiveQuestions = /* @__PURE__ */ new Map();
var roomIntermissions = /* @__PURE__ */ new Map();
var roomIntermissionTimers = /* @__PURE__ */ new Map();
var teamStreakMap = /* @__PURE__ */ new Map();
var playerStreakMap = /* @__PURE__ */ new Map();
var roomBouncebackSelectedPoints = /* @__PURE__ */ new Map();
var roomFinalizedActors = /* @__PURE__ */ new Map();
var roomSubmittedActors = /* @__PURE__ */ new Map();
var roomTeamImmunity = /* @__PURE__ */ new Map();
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
async function applyScoreDeltaToTeam(teamId, delta) {
  const current = await prisma.team.findUnique({ where: { id: teamId }, select: { score: true } });
  const oldScore = current?.score ?? 0;
  const newScore = Math.max(0, oldScore + delta);
  const effectiveDelta = newScore - oldScore;
  await prisma.team.update({
    where: { id: teamId },
    data: { score: newScore }
  });
  return { oldScore, newScore, effectiveDelta };
}
async function applyScoreDeltaToPlayer(playerId, delta) {
  const current = await prisma.player.findUnique({ where: { id: playerId }, select: { score: true } });
  const oldScore = current?.score ?? 0;
  const newScore = Math.max(0, oldScore + delta);
  const effectiveDelta = newScore - oldScore;
  await prisma.player.update({
    where: { id: playerId },
    data: { score: newScore }
  });
  return { oldScore, newScore, effectiveDelta };
}
function getNextUniqueQuestion(roomId, rawQuestions, preferredIndex) {
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
      return { question: candidate, index: preferredIndex };
    }
  }
  for (let i = 0; i < rawQuestions.length; i++) {
    const candidate = rawQuestions[i];
    if (!usedSet.has(candidate.id)) {
      usedSet.add(candidate.id);
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
async function launchWagerQuestion(ioInstance, roomId, roomCode) {
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
  if (teamCount <= 4) {
    matches.push(
      {
        id: "SF-1",
        roundIndex: 0,
        roundName: "B\xE1n k\u1EBFt 1",
        matchIndex: 0,
        team1Id: teams[0]?.id,
        team1Name: teams[0]?.name,
        team1Color: teams[0]?.color,
        team2Id: teams[3]?.id || teams[1]?.id,
        team2Name: teams[3]?.name || teams[1]?.name,
        team2Color: teams[3]?.color || teams[1]?.color,
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
  for (let i = 0; i < 4; i++) {
    const t1 = teams[i * 2];
    const t2 = teams[i * 2 + 1];
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
      matchIndex: 4,
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
      matchIndex: 5,
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
      matchIndex: 6,
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
    roomActiveQuestions.delete(roomId);
    roomRemainingTimes.delete(roomId);
    roomTimerEndsAt.delete(roomId);
    roomPrepareStates.delete(roomId);
    roomTournaments.delete(roomId);
    roomGridCaros.delete(roomId);
    roomDiceRaces.delete(roomId);
    roomWagers.delete(roomId);
    roomUsedQuestions.delete(roomId);
    roomIntermissions.delete(roomId);
    roomCache.delete(roomId);
    roomQuestionsCache.delete(roomId);
    roomGoldQuestions.delete(roomId);
    roomEliminationGhostStats.delete(roomId);
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
  } catch (err) {
    console.error(`[cleanupRoomInMemory] Error clearing room ${roomId}:`, err);
  }
}
var globalForSockets = globalThis;
globalForSockets.cleanupRoomInMemory = cleanupRoomInMemory;
async function getAdminRoom(socket, payloadCode) {
  let roomId = adminSockets.get(socket.id);
  if (!roomId && payloadCode) {
    const rByCode = await prisma.room.findUnique({
      where: { code: payloadCode },
      include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } }
    });
    if (rByCode) {
      roomId = rByCode.id;
      adminSockets.set(socket.id, roomId);
      roomCache.set(roomId, rByCode);
      if (rByCode.quizBank?.questions) {
        roomQuestionsCache.set(roomId, rByCode.quizBank.questions);
      }
      return rByCode;
    }
  }
  if (!roomId) {
    for (const roomName of socket.rooms) {
      if (roomName.startsWith("room:") && roomName.endsWith(":admin")) {
        const extractedCode = roomName.replace("room:", "").replace(":admin", "");
        if (extractedCode) {
          const rByCode = await prisma.room.findUnique({
            where: { code: extractedCode },
            include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } }
          });
          if (rByCode) {
            roomId = rByCode.id;
            adminSockets.set(socket.id, roomId);
            roomCache.set(roomId, rByCode);
            if (rByCode.quizBank?.questions) {
              roomQuestionsCache.set(roomId, rByCode.quizBank.questions);
            }
            return rByCode;
          }
        }
      }
    }
  }
  if (!roomId) return null;
  const cached = roomCache.get(roomId);
  if (cached) {
    if (!cached.quizBank?.questions?.length) {
      const qCached = roomQuestionsCache.get(roomId);
      if (qCached && qCached.length > 0) {
        if (!cached.quizBank) cached.quizBank = { questions: qCached };
        else cached.quizBank.questions = qCached;
      } else {
        const r2 = await prisma.room.findUnique({
          where: { id: roomId },
          include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } }
        });
        if (r2) {
          roomCache.set(roomId, r2);
          if (r2.quizBank?.questions) roomQuestionsCache.set(roomId, r2.quizBank.questions);
          return r2;
        }
      }
    }
    return cached;
  }
  const r = await prisma.room.findUnique({
    where: { id: roomId },
    include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } }
  });
  if (r) {
    roomCache.set(roomId, r);
    if (r.quizBank?.questions) {
      roomQuestionsCache.set(roomId, r.quizBank.questions);
    }
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
  io2.on("connection", (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);
    socket.on("time:sync", (clientTime, callback) => {
      if (typeof callback === "function") {
        callback({ clientTime, serverTime: Date.now() });
      }
    });
    socket.on("room:join", async ({ code, playerName, playerId, teamId }, callback) => {
      try {
        const isSandbox = Boolean(socket.handshake.query?.sandbox === "1") || Boolean(playerName?.includes("\u{1F916}")) || Boolean(playerName?.includes("(Tester)"));
        if (!isSandbox) {
          const clientIp = socket.handshake.headers["x-forwarded-for"]?.split(",")[0]?.trim() || socket.handshake.address || socket.id;
          const joinLimit = checkPlayerJoinLimit(clientIp);
          if (!joinLimit.allowed) {
            return callback({ success: false, error: `B\u1EA1n \u0111ang g\u1EEDi y\xEAu c\u1EA7u qu\xE1 nhanh. Vui l\xF2ng th\u1EED l\u1EA1i sau ${joinLimit.retryAfterSeconds}s.` });
          }
        }
        const room = await prisma.room.findUnique({
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
        if (!room) {
          return callback({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y ph\xF2ng ch\u01A1i" });
        }
        if (room.status === "FINISHED") {
          return callback({ success: false, error: "Tr\u1EADn \u0111\u1EA5u \u0111\xE3 k\u1EBFt th\xFAc" });
        }
        if (playerId && pendingDisconnects.has(playerId)) {
          clearTimeout(pendingDisconnects.get(playerId));
          pendingDisconnects.delete(playerId);
        }
        const cleanedName = sanitizePlayerName(playerName || "Th\xED sinh");
        if (!cleanedName || cleanedName.length === 0) {
          return callback({ success: false, error: "T\xEAn ng\u01B0\u1EDDi ch\u01A1i kh\xF4ng h\u1EE3p l\u1EC7 (kh\xF4ng ch\u1EE9a m\xE3 \u0111\u1ED9c ho\u1EB7c r\u1ED7ng)" });
        }
        if (room.players.length >= MAX_PLAYERS_PER_ROOM && !playerId) {
          return callback({ success: false, error: `Ph\xF2ng thi \u0111\xE3 \u0111\u1EA1t gi\u1EDBi h\u1EA1n t\u1ED1i \u0111a (${MAX_PLAYERS_PER_ROOM} ng\u01B0\u1EDDi tham gia)` });
        }
        let player = null;
        if (playerId) {
          const existingById = await prisma.player.findFirst({
            where: { id: playerId, roomId: room.id }
          });
          if (existingById) {
            if (pendingDisconnects.has(existingById.id)) {
              clearTimeout(pendingDisconnects.get(existingById.id));
              pendingDisconnects.delete(existingById.id);
            }
            const finalName = cleanedName && cleanedName !== "Player" && cleanedName !== "Th\xED sinh" ? cleanedName : existingById.name;
            player = await prisma.player.update({
              where: { id: existingById.id },
              data: {
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
          player = await prisma.player.create({
            data: {
              id: newId,
              name: cleanedName,
              socketId: socket.id,
              roomId: room.id,
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
        const roomState = await buildRoomState(room.id);
        io2.to(`room:${code}`).emit("room:state", roomState);
        const isPreparing = roomPrepareStates.has(room.id);
        if (roomIntermissions.has(room.id)) {
          socket.emit("game:intermission", roomIntermissions.get(room.id));
        } else if (room.status === "PLAYING" && room.quizBank?.questions && !isPreparing) {
          const activeQ = roomActiveQuestions.get(room.id);
          if (activeQ) {
            socket.emit("game:question", activeQ);
            const remaining = roomRemainingTimes.get(`${room.id}:timer`);
            const endsAt = roomTimerEndsAt.get(room.id) || activeQ.endsAt;
            if (activeQ.timerStarted && typeof remaining === "number" && remaining > 0) {
              socket.emit("game:timer", { remaining, total: activeQ.timeLimit, endsAt, serverTime: Date.now() });
            }
          } else {
            const currentQ = room.quizBank.questions[room.currentQuestion];
            if (currentQ) {
              const qKey = `${room.id}:${currentQ.id}`;
              const primary = roomPrimaryTeams.get(qKey);
              const stealBuzzed = roomStealBuzzed.get(qKey);
              const buzzFirst = roomBuzzFirst.get(qKey);
              const isSteal = roomStealPhase.get(qKey) ?? false;
              const config = room.config;
              const qState = buildQuestionState(currentQ, {
                primaryTeamId: primary?.teamId,
                primaryTeamName: primary?.teamName,
                bloomLevel: getBloomLevelFromPoints(currentQ.points),
                answerMethod: config?.answerMethod ?? "DEVICE",
                isStealPhase: isSteal,
                stealBuzzedTeamId: stealBuzzed?.teamId,
                stealBuzzedTeamName: stealBuzzed?.teamName,
                buzzedTeamId: buzzFirst?.teamId,
                buzzedTeamName: buzzFirst?.teamName,
                timerPending: true,
                timerStarted: false
              });
              const timerKey = `${room.id}:timer`;
              const remaining = roomRemainingTimes.get(timerKey);
              const endsAt = roomTimerEndsAt.get(room.id);
              if (endsAt) {
                qState.endsAt = endsAt;
                qState.serverTime = Date.now();
              }
              socket.emit("game:question", qState);
              if (typeof remaining === "number" && remaining > 0) {
                socket.emit("game:timer", { remaining, total: currentQ.timeLimit, endsAt, serverTime: Date.now() });
              }
            }
          }
        }
        if (roomPrepareStates.has(room.id)) {
          const prep = roomPrepareStates.get(room.id);
          const remainingSec = Math.max(1, Math.ceil((prep.targetTimestamp - Date.now()) / 1e3));
          if (prep.type === "STARTING") {
            socket.emit("game:starting", { seconds: remainingSec });
          } else if (prep.type === "PREPARE" && prep.preparePayload) {
            socket.emit("game:prepare", { ...prep.preparePayload, seconds: remainingSec });
          }
        }
        callback({ success: true, playerId: player.id, teamId: player.teamId ?? void 0, roomState });
      } catch (err) {
        console.error("[room:join]", err);
        callback({ success: false, error: "L\u1ED7i k\u1EBFt n\u1ED1i m\xE1y ch\u1EE7" });
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
        const room = await prisma.room.findUnique({
          where: { code },
          include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } }
        });
        if (!room) {
          return callback?.({ success: false, error: "Ph\xF2ng kh\xF4ng t\u1ED3n t\u1EA1i" });
        }
        const authHeader = socket.handshake.auth?.token || socket.handshake.headers["authorization"];
        const isAdminTokenValid = authHeader ? verifyAdminToken(authHeader.replace("Bearer ", "")) : false;
        const isHostKeyValid = room.hostKey ? hostKey === room.hostKey : true;
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
        const roomState = await buildRoomState(room.id);
        io2.to(`room:${code}`).emit("room:state", roomState);
        const isPreparing = roomPrepareStates.has(room.id);
        if (roomIntermissions.has(room.id)) {
          socket.emit("game:intermission", roomIntermissions.get(room.id));
        } else if (room.status === "PLAYING" && room.quizBank?.questions && !isPreparing) {
          const activeQ = roomActiveQuestions.get(room.id);
          if (activeQ) {
            socket.emit("game:question", activeQ);
            const remaining = roomRemainingTimes.get(`${room.id}:timer`);
            const endsAt = roomTimerEndsAt.get(room.id) || activeQ.endsAt;
            if (activeQ.timerStarted && typeof remaining === "number" && remaining > 0) {
              socket.emit("game:timer", { remaining, total: activeQ.timeLimit, endsAt, serverTime: Date.now() });
            }
          } else {
            const currentQ = room.quizBank.questions[room.currentQuestion];
            if (currentQ) {
              const qKey = `${room.id}:${currentQ.id}`;
              const primary = roomPrimaryTeams.get(qKey);
              const stealBuzzed = roomStealBuzzed.get(qKey);
              const buzzFirst = roomBuzzFirst.get(qKey);
              const isSteal = roomStealPhase.get(qKey) ?? false;
              const config = room.config;
              const qState = buildQuestionState(currentQ, {
                primaryTeamId: primary?.teamId,
                primaryTeamName: primary?.teamName,
                bloomLevel: getBloomLevelFromPoints(currentQ.points),
                answerMethod: config?.answerMethod ?? "DEVICE",
                isStealPhase: isSteal,
                stealBuzzedTeamId: stealBuzzed?.teamId,
                stealBuzzedTeamName: stealBuzzed?.teamName,
                buzzedTeamId: buzzFirst?.teamId,
                buzzedTeamName: buzzFirst?.teamName,
                timerPending: true,
                timerStarted: false
              });
              const timerKey = `${room.id}:timer`;
              const remaining = roomRemainingTimes.get(timerKey);
              const endsAt = roomTimerEndsAt.get(room.id);
              if (endsAt) {
                qState.endsAt = endsAt;
                qState.serverTime = Date.now();
              }
              socket.emit("game:question", qState);
              if (typeof remaining === "number" && remaining > 0) {
                socket.emit("game:timer", { remaining, total: currentQ.timeLimit, endsAt, serverTime: Date.now() });
              }
            }
          }
        }
        if (roomPrepareStates.has(room.id)) {
          const prep = roomPrepareStates.get(room.id);
          const remainingSec = Math.max(1, Math.ceil((prep.targetTimestamp - Date.now()) / 1e3));
          if (prep.type === "STARTING") {
            socket.emit("game:starting", { seconds: remainingSec });
          } else if (prep.type === "PREPARE" && prep.preparePayload) {
            socket.emit("game:prepare", { ...prep.preparePayload, seconds: remainingSec });
          }
        }
        callback?.({ success: true, hostKey: room.hostKey, roomState });
      } catch (err) {
        console.error("[admin:join]", err);
        callback?.({ success: false, error: "L\u1ED7i k\u1EBFt n\u1ED1i m\xE1y ch\u1EE7" });
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
      const room = await prisma.room.findUnique({
        where: { code },
        include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } }
      });
      if (room) {
        const state = await buildRoomState(room.id);
        socket.emit("room:state", state);
        const isPreparing = roomPrepareStates.has(room.id);
        if (roomIntermissions.has(room.id)) {
          socket.emit("game:intermission", roomIntermissions.get(room.id));
        } else if (room.status === "PLAYING" && room.quizBank?.questions && !isPreparing) {
          const activeQ = roomActiveQuestions.get(room.id);
          if (activeQ) {
            socket.emit("game:question", activeQ);
            const remaining = roomRemainingTimes.get(`${room.id}:timer`);
            const endsAt = roomTimerEndsAt.get(room.id) || activeQ.endsAt;
            if (activeQ.timerStarted && typeof remaining === "number" && remaining > 0) {
              socket.emit("game:timer", { remaining, total: activeQ.timeLimit, endsAt, serverTime: Date.now() });
            }
          } else {
            const currentQ = room.quizBank.questions[room.currentQuestion];
            if (currentQ) {
              const qKey = `${room.id}:${currentQ.id}`;
              const primary = roomPrimaryTeams.get(qKey);
              const stealBuzzed = roomStealBuzzed.get(qKey);
              const buzzFirst = roomBuzzFirst.get(qKey);
              const isSteal = roomStealPhase.get(qKey) ?? false;
              const config = room.config;
              const qState = buildQuestionState(currentQ, {
                primaryTeamId: primary?.teamId,
                primaryTeamName: primary?.teamName,
                bloomLevel: getBloomLevelFromPoints(currentQ.points),
                answerMethod: config?.answerMethod ?? "DEVICE",
                isStealPhase: isSteal,
                stealBuzzedTeamId: stealBuzzed?.teamId,
                stealBuzzedTeamName: stealBuzzed?.teamName,
                buzzedTeamId: buzzFirst?.teamId,
                buzzedTeamName: buzzFirst?.teamName,
                timerPending: true,
                timerStarted: false
              });
              const timerKey = `${room.id}:timer`;
              const remaining = roomRemainingTimes.get(timerKey);
              const endsAt = roomTimerEndsAt.get(room.id);
              if (endsAt) {
                qState.endsAt = endsAt;
                qState.serverTime = Date.now();
              }
              socket.emit("game:question", qState);
              if (typeof remaining === "number" && remaining > 0) {
                socket.emit("game:timer", { remaining, total: currentQ.timeLimit, endsAt, serverTime: Date.now() });
              }
            }
          }
        }
        if (roomPrepareStates.has(room.id)) {
          const prep = roomPrepareStates.get(room.id);
          const remainingSec = Math.max(1, Math.ceil((prep.targetTimestamp - Date.now()) / 1e3));
          if (prep.type === "STARTING") {
            socket.emit("game:starting", { seconds: remainingSec });
          } else if (prep.type === "PREPARE" && prep.preparePayload) {
            socket.emit("game:prepare", { ...prep.preparePayload, seconds: remainingSec });
          }
        }
      }
    });
    socket.on("game:answer:submit", async ({ questionId, answer }) => {
      if (!checkActionDebounce(socket.id, 200)) return;
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: true, team: true }
      });
      if (!player || !player.room) return;
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
    });
    socket.on("admin:submit:answer", async ({ questionId, teamId, playerId, answer, code }) => {
      const room = await getAdminRoom(socket, code);
      if (!room) return;
      const qKey = `${room.id}:${questionId}`;
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
          effTeamId = gridState.currentTurnTeamId;
        }
      } else if (room.mode === "DICE_RACE") {
        const diceState = roomDiceRaces.get(room.id);
        if (diceState?.currentTurnTeamId) {
          effTeamId = diceState.currentTurnTeamId;
        }
      }
      await processAnswerSubmission({
        io: io2,
        roomId: room.id,
        questionId,
        playerId: effPlayerId,
        teamId: effTeamId,
        answer,
        isAdminOverride: true,
        socket
      });
    });
    socket.on("game:buzz", async () => {
      if (!checkActionDebounce(socket.id, 300)) return;
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: true, team: true }
      });
      if (!player?.room || player.room.status !== "PLAYING") return;
      const room = player.room;
      const questions = await getRoomQuestions(room.id);
      const currentQ = questions[room.currentQuestion];
      if (!currentQ) return;
      const qKey = `${room.id}:${currentQ.id}`;
      if (room.mode === "BUZZ") {
        if (!roomBuzzUnlocked.get(qKey)) {
          socket.emit("error", "Chu\xF4ng \u0111ang b\u1ECB kh\xF3a! Vui l\xF2ng ch\u1EDD m\u1EDF chu\xF4ng.");
          return;
        }
        const teamId = player.teamId ?? player.id;
        const teamName = player.team?.name ?? player.name;
        const totalActors = room.teamMode === "TEAM" ? await prisma.team.count({ where: { roomId: room.id } }) : await prisma.player.count({ where: { roomId: room.id } });
        const maxAttempts = totalActors <= 2 ? 2 : 3;
        const attempts = roomBuzzAttemptOrder.get(qKey) || [];
        if (attempts.length >= maxAttempts) {
          socket.emit("error", `\u0110\xE3 h\u1EBFt ${maxAttempts} l\u01B0\u1EE3t b\u1EA5m chu\xF4ng cho c\xE2u h\u1ECFi n\xE0y!`);
          return;
        }
        const disqSet = roomBuzzDisqualified.get(qKey);
        const alreadyBuzzed = attempts.some((a) => a.teamId === teamId) || Boolean(disqSet && disqSet.has(teamId));
        if (alreadyBuzzed) {
          socket.emit("error", "M\u1ED7i \u0111\u1ED9i ch\u1EC9 \u0111\u01B0\u1EE3c b\u1EA5m chu\xF4ng t\u1ED1i \u0111a 1 l\u1EA7n cho m\u1ED7i c\xE2u h\u1ECFi!");
          return;
        }
        if (roomBuzzFirst.has(qKey)) return;
        roomBuzzUnlocked.set(qKey, false);
        if (roomBuzzWindowTimers.has(qKey)) {
          clearTimeout(roomBuzzWindowTimers.get(qKey));
          roomBuzzWindowTimers.delete(qKey);
        }
        const windowEndsAt = roomBuzzWindowEndsAt.get(qKey) || Date.now();
        const remWindowMs = Math.max(0, windowEndsAt - Date.now());
        roomBuzzWindowRemaining.set(qKey, remWindowMs);
        const attemptNumber = attempts.length + 1;
        const multiplier = attemptNumber === 1 ? 1.5 : attemptNumber === 2 ? 1 : 0.5;
        const buzzInfo = { teamId, teamName, playerId, playerName: player.name, attemptNumber, multiplier };
        roomBuzzFirst.set(qKey, buzzInfo);
        attempts.push(buzzInfo);
        roomBuzzAttemptOrder.set(qKey, attempts);
        stopQuestionTimer(room.id);
        const isDeviceAnswer = room.config?.answerMethod !== "MC";
        const answerTimeLimit = isDeviceAnswer ? getBuzzedAnswerTimeLimit(currentQ) : 15;
        const answerEndsAt = Date.now() + answerTimeLimit * 1e3;
        const activeQ = roomActiveQuestions.get(room.id);
        if (activeQ) {
          activeQ.buzzedTeamId = teamId;
          activeQ.buzzedTeamName = teamName;
          activeQ.buzzedBy = player.name;
          activeQ.buzzAnsweringActive = true;
          activeQ.buzzAttemptNumber = attemptNumber;
          activeQ.buzzMaxAttempts = maxAttempts;
          activeQ.buzzMultiplier = multiplier;
          activeQ.buzzWindowActive = false;
          activeQ.timeLimit = answerTimeLimit;
          activeQ.startedAt = Date.now();
          activeQ.endsAt = answerEndsAt;
          activeQ.timerPending = false;
          activeQ.timerStarted = true;
          io2.to(`room:${room.code}`).emit("game:question", activeQ);
        }
        io2.to(`room:${room.code}`).emit("game:buzz", buzzInfo);
        io2.to(`room:${room.code}`).emit("game:buzz:answering", {
          teamId,
          teamName,
          timeLimit: answerTimeLimit,
          attemptNumber,
          maxAttempts,
          multiplier
        });
        io2.to(`room:${room.code}`).emit("game:timer:started", {
          timeLimit: answerTimeLimit,
          endsAt: answerEndsAt,
          serverTime: Date.now(),
          questionId: currentQ.id
        });
        startQuestionTimer(io2, room.code, room.id, currentQ.id, answerTimeLimit);
      } else if (room.mode === "BOUNCEBACK") {
        if (!roomStealPhase.get(qKey)) return;
        const primary = roomPrimaryTeams.get(qKey);
        if (player.teamId && primary && player.teamId === primary.teamId) {
          socket.emit("error", "\u0110\u1ED9i c\u1EE7a b\u1EA1n l\xE0 \u0111\u1ED9i tr\u1EA3 l\u1EDDi ch\xEDnh, kh\xF4ng th\u1EC3 c\u01B0\u1EDBp l\u01B0\u1EE3t c\xE2u n\xE0y!");
          return;
        }
        if (roomStealBuzzed.has(qKey)) return;
        if (roomStealTimer.has(qKey)) {
          clearTimeout(roomStealTimer.get(qKey));
          roomStealTimer.delete(qKey);
        }
        roomStealPhase.set(qKey, false);
        stopQuestionTimer(room.id);
        const teamId = player.teamId ?? player.id;
        const teamName = player.team?.name ?? player.name;
        const stealInfo = { teamId, teamName, playerId, playerName: player.name };
        roomStealBuzzed.set(qKey, stealInfo);
        const activeQ = roomActiveQuestions.get(room.id);
        if (activeQ) {
          activeQ.isStealPhase = false;
          activeQ.stealBuzzedTeamId = stealInfo.teamId;
          activeQ.stealBuzzedTeamName = stealInfo.teamName;
          activeQ.stealAnsweringActive = false;
          activeQ.timerPending = true;
          activeQ.timerStarted = false;
          io2.to(`room:${room.code}`).emit("game:question", activeQ);
        }
        io2.to(`room:${room.code}`).emit("game:bounceback:steal_buzzed", {
          ...stealInfo,
          prepSeconds: 3
        });
        const prepKey = `${room.id}:steal_prep`;
        if (roomStealTimer.has(prepKey)) {
          clearTimeout(roomStealTimer.get(prepKey));
        }
        const prepTimeout = setTimeout(async () => {
          roomStealTimer.delete(prepKey);
          const currentActiveQ = roomActiveQuestions.get(room.id);
          if (currentActiveQ && currentActiveQ.stealBuzzedTeamId === stealInfo.teamId && !currentActiveQ.stealAnsweringActive) {
            await startStealAnsweringTimer(room.id, room.code, currentQ);
          }
        }, 3e3);
        roomStealTimer.set(prepKey, prepTimeout);
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
      const totalQuestionsCount = room.quizBank?.questions?.length || 1;
      const preparePayload = {
        questionIndex: room.currentQuestion,
        totalQuestions: totalQuestionsCount,
        points: validPoints,
        timeLimit,
        seconds: 3,
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
        targetTimestamp: Date.now() + 3e3,
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
      await handleBouncebackPointSelect(player.room.id, points);
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
        const curRem = roomRemainingTimes.get(tKey);
        if (curRem !== void 0) {
          const nextRem = curRem + 15;
          roomRemainingTimes.set(tKey, nextRem);
          const curEndsAt = roomTimerEndsAt.get(room.id) ?? Date.now() + curRem * 1e3;
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
      const state = await buildRoomState(room.id);
      io2.to(`room:${room.code}`).emit("room:state", state);
    });
    async function startQuestionPrepareAndLaunch(room, questions, questionIndex, specificQ) {
      stopQuestionTimer(room.id);
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
      roomBuzzFirst.delete(qKey);
      roomBuzzUnlocked.delete(qKey);
      if (roomBuzzDelayTimers.has(qKey)) {
        clearTimeout(roomBuzzDelayTimers.get(qKey));
        roomBuzzDelayTimers.delete(qKey);
      }
      roomQuestionProcessed.delete(qKey);
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
        const questionState = buildQuestionState(q, {
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
        const isDeviceAnswer = (config?.answerMethod ?? "DEVICE") === "DEVICE";
        const standardTimeLimit = getStandardQuestionTimeLimit(q, chosenPoints);
        questionState.timeLimit = standardTimeLimit;
        questionState.question.timeLimit = standardTimeLimit;
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
        if (!config?.powerupEnabled) return;
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
        let addedAny = false;
        for (const team of room.teams) {
          const activeUnused = team.powerupCards.filter((c) => !c.used).length;
          const need = Math.max(0, initialCount - activeUnused);
          for (let i = 0; i < need; i++) {
            const randomType = allowed[Math.floor(Math.random() * allowed.length)];
            await prisma.powerupCard.create({
              data: {
                type: randomType,
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
        if (!config?.powerupEnabled) return;
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
        let addedAny = false;
        for (const team of room.teams) {
          if (team.isEliminated) continue;
          const activeUnused = team.powerupCards.filter((c) => !c.used).length;
          if (activeUnused < maxHand) {
            const randomType = allowed[Math.floor(Math.random() * allowed.length)];
            await prisma.powerupCard.create({
              data: {
                type: randomType,
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
        room.currentQuestion = 0;
        room.status = "PLAYING";
        roomCache.set(room.id, room);
        prisma.room.update({ where: { id: room.id }, data: { currentQuestion: 0, status: "PLAYING" } }).catch(console.error);
        ensureInitialTeamPowerups(room.id, io2).catch(console.error);
        const teams = await prisma.team.findMany({ where: { roomId: room.id }, orderBy: { createdAt: "asc" } });
        const config2 = room.config;
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
          const totalTiles = config2?.diceTrackTotalTiles || 30;
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
        const launchWarmupToFirstQuestion = () => {
          roomPrepareStates.delete(room.id);
          const nextQ2 = getNextUniqueQuestion(room.id, questions, 0);
          if (nextQ2) {
            room.currentQuestion = nextQ2.index;
            startQuestionPrepareAndLaunch(room, questions, nextQ2.index, nextQ2.question);
          }
        };
        io2.to(`room:${room.code}`).emit("game:starting", { seconds: 5 });
        const timer = setTimeout(() => {
          launchWarmupToFirstQuestion();
        }, 5e3);
        roomPrepareStates.set(room.id, {
          type: "STARTING",
          questionIndex: 0,
          totalQuestions: questions.length,
          targetTimestamp: Date.now() + 5e3,
          timer,
          skipCallback: launchWarmupToFirstQuestion
        });
        return;
      }
      if (room.mode === "GRID_CARO") {
        await advanceGridToBoard(io2, room.id, room.code);
        return;
      }
      if (room.mode === "DICE_RACE") {
        const diceState = roomDiceRaces.get(room.id);
        if (diceState) {
          const allFinished = Object.values(diceState.teamPositions).every((p) => p.hasFinished);
          if (allFinished) {
            stopQuestionTimer(room.id);
            room.status = "FINISHED";
            roomCache.set(room.id, room);
            prisma.room.update({ where: { id: room.id }, data: { status: "FINISHED", endedAt: /* @__PURE__ */ new Date() } }).catch(console.error);
            const leaderboard = await buildLeaderboard(room.id);
            io2.to(`room:${room.code}`).emit("game:ended", { leaderboard });
            return;
          }
        }
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
        room.status = "FINISHED";
        roomCache.set(room.id, room);
        prisma.room.update({ where: { id: room.id }, data: { status: "FINISHED", endedAt: /* @__PURE__ */ new Date() } }).catch(console.error);
        const leaderboard = await buildLeaderboard(room.id);
        io2.to(`room:${room.code}`).emit("game:ended", { leaderboard });
        return;
      }
      const nextQ = getNextUniqueQuestion(room.id, questions);
      if (!nextQ) {
        stopQuestionTimer(room.id);
        room.status = "FINISHED";
        roomCache.set(room.id, room);
        prisma.room.update({ where: { id: room.id }, data: { status: "FINISHED", endedAt: /* @__PURE__ */ new Date() } }).catch(console.error);
        const leaderboard = await buildLeaderboard(room.id);
        io2.to(`room:${room.code}`).emit("game:ended", { leaderboard });
        return;
      }
      const nextIndex = nextQ.index;
      if (roomIntermissions.has(room.id)) {
        if (roomIntermissionTimers.has(room.id)) {
          clearTimeout(roomIntermissionTimers.get(room.id));
          roomIntermissionTimers.delete(room.id);
        }
        roomIntermissions.delete(room.id);
        io2.to(`room:${room.code}`).emit("game:intermission", null);
        room.currentQuestion = nextIndex;
        room.status = "PLAYING";
        roomCache.set(room.id, room);
        await prisma.room.update({ where: { id: room.id }, data: { currentQuestion: nextIndex, status: "PLAYING" } }).catch(console.error);
        if (nextIndex > 0 && nextIndex % 3 === 0) {
          replenishTeamPowerups(room.id, io2).catch(console.error);
        }
        await startQuestionPrepareAndLaunch(room, questions, nextIndex, nextQ.question);
        return;
      }
      stopQuestionTimer(room.id);
      roomActiveQuestions.delete(room.id);
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
      if (roomPrepareStates.has(room.id)) {
        const prep = roomPrepareStates.get(room.id);
        if (prep?.timer) clearTimeout(prep.timer);
      }
      await prisma.room.update({ where: { id: room.id }, data: { status: "PAUSED" } });
      io2.to(`room:${room.code}`).emit("game:paused");
    });
    socket.on("admin:resume", async (payload) => {
      const room = await getAdminRoom(socket, payload?.code);
      if (!room) return;
      await prisma.room.update({ where: { id: room.id }, data: { status: "PLAYING" } });
      io2.to(`room:${room.code}`).emit("game:resumed");
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
        if (room.teamMode === "TEAM") {
          const res = await resolveQuestionTeamScores(io2, room.id, q.id);
          if (res.teamScoresUpdates.length > 0) {
            io2.to(`room:${room.code}`).emit("game:score:update", res.teamScoresUpdates);
          }
        } else {
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
      if (!gridState || gridState.selectedCellId || roomPrepareStates.has(room.id)) return;
      const cell = gridState.cells.find((c) => c.id === cellId);
      if (!cell || cell.isCompleted) return;
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
        room.status = "FINISHED";
        await prisma.room.update({ where: { id: room.id }, data: { status: "FINISHED", endedAt: /* @__PURE__ */ new Date() } }).catch(console.error);
        const leaderboard = await buildLeaderboard(room.id);
        io2.to(`room:${room.code}`).emit("game:ended", { leaderboard });
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
      }
    });
    async function executeDiceRoll(room, diceState, teamId) {
      const teamProg = diceState.teamPositions[teamId];
      if (!teamProg) return;
      const roll = Math.floor(Math.random() * 6) + 1;
      diceState.lastDiceRoll = roll;
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
        roll
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
        return;
      }
      if (diceState.currentTurnTeamId !== player.teamId) {
        socket.emit("error", "Ch\u01B0a t\u1EDBi l\u01B0\u1EE3t tung x\xFAc x\u1EAFc c\u1EE7a \u0111\u1ED9i b\u1EA1n!");
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
        return;
      }
      const isAutoAssignedFirstBid = wagerState.autoAssignedTeamId === team.id;
      if (wagerState.lastWagerTeamId === team.id && !isAutoAssignedFirstBid) {
        socket.emit("error", "\u0110\u1ED9i b\u1EA1n v\u1EEBa \u0111\u1EB7t c\u01B0\u1EE3c! Kh\xF4ng \u0111\u01B0\u1EE3c c\u01B0\u1EE3c 2 l\u1EA7n li\xEAn ti\u1EBFp, vui l\xF2ng ch\u1EDD \u0111\u1ED9i kh\xE1c c\u01B0\u1EE3c tr\u01B0\u1EDBc.");
        return;
      }
      if (amount > team.score) {
        socket.emit("error", `Kh\xF4ng \u0111\u01B0\u1EE3c c\u01B0\u1EE3c s\u1ED1 \u0111i\u1EC3m (${amount}\u0111) v\u01B0\u1EE3t qu\xE1 \u0111i\u1EC3m hi\u1EC7n t\u1EA1i c\u1EE7a \u0111\u1ED9i b\u1EA1n (${team.score}\u0111)!`);
        return;
      }
      if (wagerState.maxBetCap && amount > wagerState.maxBetCap) {
        socket.emit("error", `Kh\xF4ng \u0111\u01B0\u1EE3c c\u01B0\u1EE3c s\u1ED1 \u0111i\u1EC3m (${amount}\u0111) v\u01B0\u1EE3t qu\xE1 tr\u1EA7n c\u01B0\u1EE3c t\u1ED1i \u0111a (${wagerState.maxBetCap}\u0111) c\u1EE7a c\xE2u h\u1ECFi n\xE0y!`);
        return;
      }
      const currentHighest = wagerState.currentHighestWager || 0;
      const minOption = currentHighest + 5;
      const maxOption = currentHighest + 60;
      const isValidStep = (amount - currentHighest) % 5 === 0;
      if (amount < minOption || amount > maxOption || !isValidStep) {
        socket.emit("error", `M\u1EE9c c\u01B0\u1EE3c kh\xF4ng h\u1EE3p l\u1EC7. Vui l\xF2ng ch\u1ECDn 1 trong 12 \xF4 c\u01B0\u1EE3c t\u1EEB ${minOption}\u0111 \u0111\u1EBFn ${maxOption}\u0111.`);
        return;
      }
      if (team.score < minOption) {
        socket.emit("error", `M\u1EE9c c\u01B0\u1EE3c t\u1ED1i thi\u1EC3u (${minOption}\u0111) \u0111\xE3 v\u01B0\u1EE3t qu\xE1 \u0111i\u1EC3m \u0111\u1ED9i b\u1EA1n (${team.score}\u0111). \u0110\u1ED9i b\u1EA1n \u0111\xE3 m\u1EA5t quy\u1EC1n c\u01B0\u1EE3c trong c\xE2u h\u1ECFi n\xE0y!`);
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
      roomActiveQuestions.delete(room.id);
      io2.to(`room:${room.code}`).emit("game:question:clear");
      const diceState = roomDiceRaces.get(room.id);
      if (diceState) {
        io2.to(`room:${room.code}`).emit("game:dice:update", diceState);
      }
    });
    socket.on("admin:sandbox:adjust_score", async ({ teamId, delta, setScore }) => {
      const room = await getAdminRoom(socket);
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
    socket.on("admin:timer:set", async ({ seconds }) => {
      const room = await getAdminRoom(socket);
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
      const questions = await getRoomQuestions(room.id);
      const q = questions[room.currentQuestion];
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
    socket.on("game:answer:finalize", async ({ questionId, answer }) => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: true, team: true }
      });
      if (!player?.room || player.room.status !== "PLAYING") return;
      const room = player.room;
      const qKey = `${room.id}:${questionId}`;
      let effectiveTeamId = player.teamId;
      if (!effectiveTeamId && (playerId.startsWith("p_sb_") || player.name.includes("Tester"))) {
        const primary = roomPrimaryTeams.get(qKey);
        effectiveTeamId = primary?.teamId ?? null;
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
      if (totalParticipantsCount > 0 && finalizedCount >= totalParticipantsCount) {
        if (room.mode === "BOUNCEBACK") {
          stopQuestionTimer(room.id);
          const stealInfo = roomStealBuzzed.get(qKey);
          const primary = roomPrimaryTeams.get(qKey);
          const activeQ = roomActiveQuestions.get(room.id);
          const question = await prisma.question.findUnique({ where: { id: questionId } });
          io2.to(`room:${room.code}`).emit("game:early_completed", {
            questionId,
            reason: "ALL_FINALIZED",
            message: "\u0110\u1ED9i thi \u0111\xE3 ch\u1ED1t \u0111\xE1p \xE1n s\u1EDBm!"
          });
          io2.to(`room:${room.code}`).emit("game:timer", { remaining: 0, total: activeQ?.timeLimit || 30, endsAt: Date.now(), serverTime: Date.now() });
          io2.to(`room:${room.code}`).emit("game:timer:expired", { questionId });
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
          message: "T\u1EA5t c\u1EA3 ng\u01B0\u1EDDi ch\u01A1i \u0111\xE3 ch\u1ED1t \u0111\xE1p \xE1n!"
        });
        await finalizeQuestionOnTimeUp(io2, room.id, room.code, questionId);
      }
    });
    socket.on("admin:sandbox:grant:card", async ({ teamId, cardType }) => {
      const room = await getAdminRoom(socket);
      if (!room) return;
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
    socket.on("disconnect", async () => {
      adminSockets.delete(socket.id);
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      playerSockets.delete(socket.id);
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
          io2.to(`room:${player.room.code}`).emit("player:left", playerId);
          const state = await buildRoomState(player.room.id);
          io2.to(`room:${player.room.code}`).emit("room:state", state);
        }
      }, 2500);
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
  if (room.mode === "TOURNAMENT") {
    const tournament = roomTournaments.get(room.id);
    const currentMatch = tournament?.matches.find((m) => m.id === tournament.currentMatchId);
    return [currentMatch?.team1Id, currentMatch?.team2Id].filter(Boolean);
  }
  if (room.teamMode === "TEAM") {
    const teams = await prisma.team.findMany({
      where: { roomId: room.id, isEliminated: false }
    });
    return teams.map((t) => t.id);
  } else {
    const players = await prisma.player.findMany({
      where: { roomId: room.id, isHost: false }
    });
    return players.map((p) => p.id);
  }
}
function evaluateAnswerCorrectness(question, submittedAnswer) {
  if (!question) {
    return { isAutoCorrect: false, answerText: "(Kh\xF4ng c\xF3 c\xE2u h\u1ECFi)" };
  }
  const options = question.options || [];
  if (!submittedAnswer || submittedAnswer.length === 0) {
    return { isAutoCorrect: false, answerText: "(Ch\u01B0a ch\u1ECDn \u0111\xE1p \xE1n / H\u1EBFt gi\u1EDD)" };
  }
  const selectedOptions = options.filter((o) => submittedAnswer.includes(o.id));
  const answerText = selectedOptions.length > 0 ? selectedOptions.map((o) => `${o.text}`).join(", ") : submittedAnswer.join(", ");
  let isAutoCorrect = false;
  if (question.type === "MC_SINGLE" || question.type === "TRUE_FALSE") {
    const correctOption = options.find((o) => o.isCorrect);
    isAutoCorrect = correctOption ? submittedAnswer.includes(correctOption.id) : false;
  } else if (question.type === "MC_MULTI") {
    const correctIds = options.filter((o) => o.isCorrect).map((o) => o.id);
    isAutoCorrect = correctIds.length === submittedAnswer.length && correctIds.every((id) => submittedAnswer.includes(id));
  } else if (question.type === "FILL_BLANK") {
    const expected = (question.answer || "").toLowerCase().trim();
    const actual = (submittedAnswer[0] || "").toLowerCase().trim();
    isAutoCorrect = expected === actual;
  }
  return { isAutoCorrect, answerText };
}
async function processAnswerSubmission({
  io: io2,
  roomId,
  questionId,
  playerId,
  teamId,
  answer,
  isAdminOverride = false,
  socket
}) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { teams: true }
  });
  if (!room || room.status !== "PLAYING") return;
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question) return;
  const qKey = `${room.id}:${questionId}`;
  const activeQ = roomActiveQuestions.get(room.id);
  if (activeQ?.timerPending && !isAdminOverride) {
    if (socket) socket.emit("error", "Ch\u01B0a \u0111\u1EBFn gi\u1EDD tr\u1EA3 l\u1EDDi! H\xE3y ch\u1EDD Admin b\u1EA5m B\u1EAFt \u0111\u1EA7u t\xEDnh gi\u1EDD.");
    return;
  }
  if (activeQ?.isExpired && !isAdminOverride) {
    if (socket) socket.emit("error", "\u0110\xE3 h\u1EBFt th\u1EDDi gian tr\u1EA3 l\u1EDDi c\xE2u h\u1ECFi!");
    return;
  }
  if (teamId) {
    const frozenSet = roomFrozenTeams.get(qKey);
    if (frozenSet && frozenSet.has(teamId)) {
      if (socket) socket.emit("error", "\u0110\u1ED9i c\u1EE7a b\u1EA1n \u0111ang b\u1ECB \u0111\xF3ng b\u0103ng \u1EDF c\xE2u n\xE0y n\xEAn kh\xF4ng th\u1EC3 n\u1ED9p \u0111\xE1p \xE1n!");
      return;
    }
  }
  let isCorrect = false;
  const options = question.options;
  if (question.type === "MC_SINGLE" || question.type === "TRUE_FALSE") {
    const correctOption = options?.find((o) => o.isCorrect);
    isCorrect = correctOption?.id === answer;
  } else if (question.type === "MC_MULTI") {
    const correctIds = options?.filter((o) => o.isCorrect).map((o) => o.id) ?? [];
    const submittedIds = Array.isArray(answer) ? answer : [answer];
    isCorrect = correctIds.length === submittedIds.length && correctIds.every((id) => submittedIds.includes(id));
  } else if (question.type === "FILL_BLANK") {
    isCorrect = question.answer?.toLowerCase().trim() === answer.toLowerCase().trim();
  } else if (question.type === "ESSAY") {
    isCorrect = null;
  }
  let effectiveTeamId = teamId;
  if (!effectiveTeamId && playerId) {
    const pRecord = await prisma.player.findUnique({ where: { id: playerId } });
    if (pRecord?.teamId) {
      effectiveTeamId = pRecord.teamId;
    } else if (pRecord?.name?.includes("Tester") || playerId.startsWith("p_sb_")) {
      const primary = roomPrimaryTeams.get(qKey);
      effectiveTeamId = primary?.teamId || room.teams[0]?.id;
      if (effectiveTeamId) {
        await prisma.player.update({
          where: { id: playerId },
          data: { teamId: effectiveTeamId }
        }).catch(() => {
        });
      }
    }
  }
  const actorId = effectiveTeamId || playerId;
  if (room.mode === "BOUNCEBACK") {
    const stealInfo = roomStealBuzzed.get(qKey);
    const primary = roomPrimaryTeams.get(qKey);
    if (stealInfo) {
      const isStealActor = effectiveTeamId && effectiveTeamId === stealInfo.teamId || playerId && (playerId === stealInfo.playerId || playerId === stealInfo.teamId);
      if (!isAdminOverride && !isStealActor) {
        if (socket) socket.emit("error", "Ch\u1EC9 \u0111\u1ED9i c\u01B0\u1EDBp chu\xF4ng m\u1EDBi \u0111\u01B0\u1EE3c tr\u1EA3 l\u1EDDi!");
        return;
      }
    } else if (primary) {
      const isPrimaryActor = effectiveTeamId && effectiveTeamId === primary.teamId || playerId && playerId === primary.teamId;
      if (!isAdminOverride && !isPrimaryActor) {
        if (socket) socket.emit("error", "Hi\u1EC7n \u0111ang l\xE0 l\u01B0\u1EE3t c\u1EE7a \u0111\u1ED9i ch\xEDnh!");
        return;
      }
    }
  } else if (room.mode === "BUZZ") {
    const buzz = roomBuzzFirst.get(qKey);
    if (!buzz && !isAdminOverride) {
      if (socket) socket.emit("error", "Ch\u01B0a c\xF3 \u0111\u1ED9i n\xE0o b\u1EA5m chu\xF4ng!");
      return;
    }
    const isBuzzActor = buzz ? effectiveTeamId && effectiveTeamId === buzz.teamId || playerId && (playerId === buzz.playerId || playerId === buzz.teamId) : false;
    if (!isAdminOverride && !isBuzzActor) {
      if (socket) socket.emit("error", "Ch\u1EC9 \u0111\u1ED9i b\u1EA5m chu\xF4ng \u0111\u1EA7u ti\xEAn m\u1EDBi \u0111\u01B0\u1EE3c tr\u1EA3 l\u1EDDi!");
      return;
    }
  } else if (room.mode === "TOURNAMENT") {
    const tournament = roomTournaments.get(room.id);
    const currentMatch = tournament?.matches.find((m) => m.id === tournament.currentMatchId);
    if (currentMatch && actorId !== currentMatch.team1Id && actorId !== currentMatch.team2Id && !isAdminOverride) {
      if (socket) socket.emit("error", "Ch\u1EC9 2 \u0111\u1ED9i trong tr\u1EADn \u0111\u1ED1i \u0111\u1EA7u hi\u1EC7n t\u1EA1i m\u1EDBi \u0111\u01B0\u1EE3c tr\u1EA3 l\u1EDDi!");
      return;
    }
  } else if (room.mode === "GRID_CARO") {
    const gridState = roomGridCaros.get(room.id);
    if (gridState && actorId !== gridState.currentTurnTeamId && !isAdminOverride) {
      if (socket) socket.emit("error", "Hi\u1EC7n \u0111ang l\xE0 l\u01B0\u1EE3t c\u1EE7a \u0111\u1ED9i kh\xE1c!");
      return;
    }
  } else if (room.mode === "DICE_RACE") {
    const diceState = roomDiceRaces.get(room.id);
    if (diceState && actorId !== diceState.currentTurnTeamId && !isAdminOverride) {
      if (socket) socket.emit("error", "Hi\u1EC7n \u0111ang l\xE0 l\u01B0\u1EE3t c\u1EE7a \u0111\u1ED9i kh\xE1c!");
      return;
    }
  } else if (room.mode === "ELIMINATION" && !isAdminOverride) {
  }
  const timeSpent = Date.now() - (roomTimers.get(`${room.id}:startedAt`) ? parseInt(roomTimers.get(`${room.id}:startedAt`)) : Date.now());
  const targetTeamId = effectiveTeamId;
  const targetPlayerId = playerId;
  let existingAnswer = null;
  if (targetTeamId) {
    existingAnswer = await prisma.answer.findFirst({
      where: { roomId: room.id, questionId, teamId: targetTeamId }
    });
  } else if (targetPlayerId) {
    existingAnswer = await prisma.answer.findFirst({
      where: { roomId: room.id, questionId, playerId: targetPlayerId }
    });
  }
  const isUpdate = Boolean(existingAnswer);
  const normalizedAnswer = Array.isArray(answer) ? answer : [answer];
  const isBouncebackSteal = room.mode === "BOUNCEBACK" && roomStealBuzzed.has(qKey);
  if (isBouncebackSteal && existingAnswer && !isAdminOverride) {
    if (socket) socket.emit("error", "\u0110\u1ED9i b\u1EA5m chu\xF4ng ch\u1EC9 \u0111\u01B0\u1EE3c ch\u1ECDn 1 \u0111\xE1p \xE1n duy nh\u1EA5t!");
    return;
  }
  const config = room.config;
  const isSingleSubmitMode = config?.answerSubmissionMode === "SINGLE_SUBMIT";
  if (!isBouncebackSteal && isSingleSubmitMode && existingAnswer && !isAdminOverride) {
    if (socket) socket.emit("error", "Ch\u1EBF \u0111\u1ED9 n\xE0y ch\u1EC9 cho ph\xE9p ch\u1ECDn 1 l\u1EA7n duy nh\u1EA5t, b\u1EA1n \u0111\xE3 ho\xE0n th\xE0nh c\xE2u h\u1ECFi!");
    return;
  }
  if (existingAnswer) {
    await prisma.answer.update({
      where: { id: existingAnswer.id },
      data: {
        answer: normalizedAnswer,
        isCorrect: question.type === "ESSAY" ? null : isCorrect,
        timeSpent: isAdminOverride ? 0 : timeSpent,
        submittedAt: /* @__PURE__ */ new Date()
      }
    });
  } else {
    await prisma.answer.create({
      data: {
        roomId: room.id,
        questionId,
        playerId: targetPlayerId ?? null,
        teamId: targetTeamId ?? null,
        answer: normalizedAnswer,
        isCorrect: question.type === "ESSAY" ? null : isCorrect,
        pointsAwarded: 0,
        timeSpent: isAdminOverride ? 0 : timeSpent
      }
    });
  }
  if (socket) {
    socket.emit("game:answer:ack", {
      questionId,
      answer: normalizedAnswer,
      isUpdate,
      success: true
    });
  }
  const playerObj = playerId ? await prisma.player.findUnique({ where: { id: playerId } }).catch(() => null) : null;
  const teamObj = effectiveTeamId ? await prisma.team.findUnique({ where: { id: effectiveTeamId } }).catch(() => null) : null;
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
  if (isSingleSubmitMode && !isAdminOverride) {
    const activeParticipants = await getActiveParticipantsForQuestion(room, questionId);
    const subSet = roomSubmittedActors.get(qKey);
    if (activeParticipants.length > 0 && activeParticipants.every((id) => subSet?.has(id))) {
      io2.to(`room:${room.code}`).emit("game:early_completed", {
        questionId,
        reason: "ALL_SUBMITTED",
        message: "T\u1EA5t c\u1EA3 ng\u01B0\u1EDDi ch\u01A1i \u0111\xE3 ho\xE0n th\xE0nh b\xE0i thi!"
      });
      await finalizeQuestionOnTimeUp(io2, room.id, room.code, questionId);
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
  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { teamMode: true } });
  const isTeamMode = room?.teamMode === "TEAM";
  const totalActors = isTeamMode ? await prisma.team.count({ where: { roomId } }) : await prisma.player.count({ where: { roomId } });
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
  }, remainingMs);
  roomBuzzWindowTimers.set(qKey, timer);
}
async function finalizeBuzzAnswer(io2, roomId, roomCode, questionId, overrideIsCorrect) {
  const qKey = `${roomId}:${questionId}`;
  stopQuestionTimer(roomId);
  const room = await prisma.room.findUnique({ where: { id: roomId }, include: { teams: true } });
  const question = await prisma.question.findUnique({ where: { id: questionId } });
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
  const qKey = `${roomId}:${questionId}`;
  if (roomQuestionProcessed.has(qKey)) return;
  roomQuestionProcessed.add(qKey);
  const tournament = roomTournaments.get(roomId);
  const room = await prisma.room.findUnique({ where: { id: roomId }, include: { teams: true } });
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!tournament || !room || !question) return;
  const currentMatch = tournament.matches.find((m) => m.id === tournament.currentMatchId);
  if (!currentMatch) return;
  const t1Ans = currentMatch.team1Id ? await prisma.answer.findFirst({ where: { roomId, questionId, teamId: currentMatch.team1Id } }) : null;
  const t2Ans = currentMatch.team2Id ? await prisma.answer.findFirst({ where: { roomId, questionId, teamId: currentMatch.team2Id } }) : null;
  const scoreUpdates = [];
  if (t1Ans && t1Ans.isCorrect && currentMatch.team1Id) {
    currentMatch.team1Score += question.points;
    const tRes = await applyScoreDeltaToTeam(currentMatch.team1Id, question.points);
    scoreUpdates.push({ teamId: currentMatch.team1Id, score: tRes.newScore, delta: tRes.effectiveDelta });
  }
  if (t2Ans && t2Ans.isCorrect && currentMatch.team2Id) {
    currentMatch.team2Score += question.points;
    const tRes = await applyScoreDeltaToTeam(currentMatch.team2Id, question.points);
    scoreUpdates.push({ teamId: currentMatch.team2Id, score: tRes.newScore, delta: tRes.effectiveDelta });
  }
  currentMatch.currentQuestionInMatch++;
  if (currentMatch.currentQuestionInMatch >= currentMatch.totalQuestionsInMatch) {
    currentMatch.status = "COMPLETED";
    const winnerId = currentMatch.team1Score >= currentMatch.team2Score ? currentMatch.team1Id : currentMatch.team2Id;
    const winnerName = currentMatch.team1Score >= currentMatch.team2Score ? currentMatch.team1Name : currentMatch.team2Name;
    currentMatch.winnerTeamId = winnerId;
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
        } else if (!nextMatch.team2Id) {
          nextMatch.team2Id = winnerId;
          nextMatch.team2Name = winnerName;
        }
      }
      const nextPending = tournament.matches.find((m) => m.status === "UPCOMING" && m.team1Id && m.team2Id);
      if (nextPending) {
        nextPending.status = "IN_PROGRESS";
        tournament.currentMatchId = nextPending.id;
      }
    }
    if (currentMatch.predictions && winnerId) {
      tournament.oracleScores = tournament.oracleScores || {};
      for (const [predTeamId, predWinnerId] of Object.entries(currentMatch.predictions)) {
        if (predWinnerId === winnerId) {
          tournament.oracleScores[predTeamId] = (tournament.oracleScores[predTeamId] || 0) + 10;
        }
      }
      io2.to(`room:${roomCode}`).emit("tournament:oracle:update", { oracleScores: tournament.oracleScores });
    }
  }
  if (scoreUpdates.length > 0) {
    io2.to(`room:${roomCode}`).emit("game:score:update", scoreUpdates);
  }
  io2.to(`room:${roomCode}`).emit("game:tournament:update", tournament);
  await revealCurrentAnswer(io2, roomId, roomCode, questionId);
}
async function advanceGridToBoard(io2, roomId, roomCode) {
  const autoAdvanceKey = `${roomId}:auto_advance`;
  if (roomGridTimers.has(autoAdvanceKey)) {
    clearInterval(roomGridTimers.get(autoAdvanceKey));
    roomGridTimers.delete(autoAdvanceKey);
  }
  const gridState = roomGridCaros.get(roomId);
  const room = await prisma.room.findUnique({ where: { id: roomId }, include: { teams: true } });
  if (!gridState || !room) return;
  gridState.autoAdvanceSeconds = void 0;
  gridState.selectedCellId = void 0;
  gridState.selectedCellAnimation = false;
  gridState.selectedCellInfo = void 0;
  gridState.questionReady = false;
  roomActiveQuestions.delete(roomId);
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
    await prisma.room.update({
      where: { id: roomId },
      data: { status: "FINISHED", endedAt: /* @__PURE__ */ new Date() }
    });
    const leaderboard = await buildLeaderboard(roomId);
    io2.to(`room:${roomCode}`).emit("game:ended", { leaderboard });
  } else {
    io2.to(`room:${roomCode}`).emit("game:question:clear");
    io2.to(`room:${roomCode}`).emit("game:grid:update", gridState);
  }
}
async function finalizeGridCaroQuestion(io2, roomId, roomCode, questionId) {
  const qKey = `${roomId}:${questionId}`;
  if (roomQuestionProcessed.has(qKey)) return;
  roomQuestionProcessed.add(qKey);
  const gridState = roomGridCaros.get(roomId);
  const room = await prisma.room.findUnique({ where: { id: roomId }, include: { teams: true } });
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!gridState || !room || !question) return;
  const currentTeamId = gridState.currentTurnTeamId;
  const currentTeam = room.teams.find((t) => t.id === currentTeamId);
  const cell = gridState.selectedCellId ? gridState.cells.find((c) => c.id === gridState.selectedCellId) : null;
  const scoreUpdates = [];
  if (currentTeam && cell) {
    const ans = await prisma.answer.findFirst({
      where: { roomId, questionId, teamId: currentTeam.id }
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
  await revealCurrentAnswer(io2, roomId, roomCode, questionId);
}
async function finalizeDiceRaceQuestion(io2, roomId, roomCode, questionId) {
  const qKey = `${roomId}:${questionId}`;
  if (roomQuestionProcessed.has(qKey)) return;
  roomQuestionProcessed.add(qKey);
  const diceState = roomDiceRaces.get(roomId);
  const room = await prisma.room.findUnique({ where: { id: roomId }, include: { teams: true } });
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!diceState || !room || !question) return;
  const currentTeamId = diceState.currentTurnTeamId;
  const scoreUpdates = [];
  const ans = await prisma.answer.findFirst({
    where: { roomId, questionId, teamId: currentTeamId }
  });
  const isCorrect = ans?.isCorrect === true;
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
  await revealCurrentAnswer(io2, roomId, roomCode, questionId);
}
async function finalizeWagerQuestion(io2, roomId, roomCode, questionId) {
  const qKey = `${roomId}:${questionId}`;
  if (roomQuestionProcessed.has(qKey)) return;
  roomQuestionProcessed.add(qKey);
  const wagerState = roomWagers.get(roomId);
  const room = await prisma.room.findUnique({ where: { id: roomId }, include: { teams: true } });
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!wagerState || !room || !question) return;
  wagerState.phase = "REVEAL_PERIOD";
  const scoreUpdates = [];
  const teamSummaries = [];
  const lastWagerTeamId = wagerState.lastWagerTeamId;
  const wagerAmount = wagerState.currentHighestWager || 10;
  const basePoints = question.points || 20;
  const nonWagerCorrectPoints = Math.max(5, Math.floor(basePoints / 2));
  const teamAnswers = await prisma.answer.findMany({
    where: { roomId, questionId }
  });
  const answerMap = /* @__PURE__ */ new Map();
  for (const ans of teamAnswers) {
    if (ans.teamId) {
      answerMap.set(ans.teamId, ans);
    }
  }
  let otherCorrectCount = 0;
  for (const team of room.teams) {
    if (team.id !== lastWagerTeamId) {
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
    const ans = answerMap.get(team.id);
    const isCorrect = ans?.isCorrect === true;
    let delta = 0;
    if (team.id === lastWagerTeamId) {
      delta = isCorrect ? wagerAmount : -wagerPenalty;
    } else {
      delta = isCorrect ? nonWagerCorrectPoints : 0;
    }
    if (ans) {
      await prisma.answer.update({
        where: { id: ans.id },
        data: { pointsAwarded: delta }
      }).catch(console.error);
    }
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
  }, 5e3);
  roomStealTimer.set(qKey, timer);
}
async function finalizeBouncebackPrimary(io2, roomId, roomCode, questionId, forceCorrect) {
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
  const qKey = `${roomId}:${questionId}`;
  if (roomQuestionProcessed.has(qKey)) return;
  roomQuestionProcessed.add(qKey);
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  const question = await prisma.question.findUnique({ where: { id: questionId } });
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
    const points = computePointsAwarded({
      basePoints: effectiveBasePoints,
      timeSpent: ans.timeSpent,
      timeLimit: question.timeLimit,
      isCorrect,
      config: effectiveConfig,
      streak: pStreak,
      roomAccuracy
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
async function revealCurrentAnswer(io2, roomId, roomCode, questionId, customTeamSummaries) {
  stopQuestionTimer(roomId);
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  const q = await prisma.question.findUnique({ where: { id: questionId } });
  if (!room || !q) return;
  const config = room.config;
  let teamScoresUpdates = [];
  let teamSummaries = customTeamSummaries || [];
  let roomAccuracy;
  let rarityBonusPercent;
  const isEliminationDeep = room.mode === "ELIMINATION" && (config?.answerMethod ?? "DEVICE") === "DEVICE" && config?.eliminationDeepScoring !== false;
  if ((room.mode === "CLASSIC" || room.mode === "POWERUP" || isEliminationDeep) && room.teamMode === "TEAM") {
    const res = await resolveQuestionTeamScores(io2, room.id, q.id);
    teamScoresUpdates = res.teamScoresUpdates;
    teamSummaries = res.teamSummaries;
    roomAccuracy = res.roomAccuracy;
    rarityBonusPercent = res.rarityBonusPercent;
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
          const toEliminate = activeTeams[0];
          await prisma.team.update({
            where: { id: toEliminate.id },
            data: { isEliminated: true }
          });
          const currentStageNumber = Math.floor((room.currentQuestion + 1) / interval);
          if (!roomGhosts) {
            roomGhosts = /* @__PURE__ */ new Map();
            roomEliminationGhostStats.set(room.id, roomGhosts);
          }
          let elimGhostStat = roomGhosts.get(toEliminate.id);
          if (!elimGhostStat) {
            elimGhostStat = {
              ghostStreak: 0,
              ghostTotalCorrect: 0,
              ghostTotalAnswered: 0,
              ghostRoundAllCorrect: false,
              currentRoundCorrect: 0,
              eliminatedAtStage: currentStageNumber,
              eliminatedAtQuestion: room.currentQuestion
            };
            roomGhosts.set(toEliminate.id, elimGhostStat);
          } else {
            elimGhostStat.eliminatedAtStage = currentStageNumber;
            elimGhostStat.eliminatedAtQuestion = room.currentQuestion;
          }
          io2.to(`room:${roomCode}`).emit("game:elimination:round", {
            eliminatedTeamId: toEliminate.id,
            eliminatedTeamName: toEliminate.name,
            reason: `\u0110i\u1EC3m s\u1ED1 th\u1EA5p nh\u1EA5t sau v\xF2ng sinh t\u1ED3n ${currentStageNumber}`
          });
          const allQuestions = await getRoomQuestions(room.id);
          const totalStages = Math.floor(allQuestions.length / interval);
          const currentStage = Math.floor((room.currentQuestion + 1) / interval);
          if (totalStages >= 4 && currentStage === totalStages - 1) {
            const eliminatedTeams = await prisma.team.findMany({
              where: { roomId: room.id, isEliminated: true }
            });
            const qualifiedGhosts = eliminatedTeams.filter((t) => {
              const stat = roomGhosts?.get(t.id);
              return Boolean(stat && stat.ghostRoundAllCorrect && stat.ghostTotalAnswered > 0);
            });
            if (qualifiedGhosts.length > 0) {
              qualifiedGhosts.sort((a, b) => {
                const statA = roomGhosts.get(a.id);
                const statB = roomGhosts.get(b.id);
                const elimA = statA.eliminatedAtQuestion ?? 999999 - statA.ghostTotalAnswered;
                const elimB = statB.eliminatedAtQuestion ?? 999999 - statB.ghostTotalAnswered;
                if (elimA !== elimB) {
                  return elimA - elimB;
                }
                const accA = statA.ghostTotalAnswered > 0 ? statA.ghostTotalCorrect / statA.ghostTotalAnswered : 0;
                const accB = statB.ghostTotalAnswered > 0 ? statB.ghostTotalCorrect / statB.ghostTotalAnswered : 0;
                if (accA !== accB) return accB - accA;
                return statB.ghostTotalCorrect - statA.ghostTotalCorrect;
              });
              const revived = qualifiedGhosts[0];
              const survivingRemaining = activeTeams.filter((t) => t.id !== toEliminate.id);
              const minSurvivingScore = survivingRemaining.length > 0 ? Math.min(...survivingRemaining.map((t) => t.score)) : 0;
              await prisma.team.update({
                where: { id: revived.id },
                data: { isEliminated: false, score: minSurvivingScore }
              });
              const statRevived = roomGhosts?.get(revived.id);
              if (statRevived) {
                statRevived.ghostRoundAllCorrect = false;
              }
              io2.to(`room:${roomCode}`).emit("elimination:revival", {
                round: currentStage,
                revivedTeamId: revived.id,
                revivedTeamName: revived.name,
                revivedScore: minSurvivingScore,
                eliminatedAtStage: statRevived?.eliminatedAtStage
              });
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
  io2.to(`room:${roomCode}`).emit("game:answer:reveal", {
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
    bloomLevel: getBloomLevelFromPoints(q.points)
  });
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
  const validPlayers = room.players.filter((p) => !p.isHost && p.name !== "Host" && p.name !== "Admin Host");
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
      eliminatedAtStage: ghostStat?.eliminatedAtStage
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
  return {
    id: room.id,
    code: room.code,
    name: room.name,
    mode: room.mode,
    teamMode: room.teamMode,
    status: room.status,
    currentQuestionIndex: room.currentQuestion,
    totalQuestions: room.quizBank?.questions.length ?? 0,
    teams,
    players,
    sharedCards,
    config,
    tournamentState: roomTournaments.get(room.id),
    gridCaroState: roomGridCaros.get(room.id),
    diceRaceState: roomDiceRaces.get(room.id),
    wagerState: roomWagers.get(room.id)
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
      timeLimit: q.timeLimit,
      mediaUrl: q.mediaUrl,
      mediaType: q.mediaType,
      hint: q.hint,
      order: q.order,
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
    answerSubmissionMode: extra?.answerSubmissionMode
  };
}
async function resolveQuestionTeamScores(io2, roomId, questionId) {
  const qKey = `${roomId}:${questionId}`;
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
  if (!room || room.teamMode !== "TEAM" || room.mode !== "CLASSIC" && room.mode !== "ELIMINATION" && room.mode !== "POWERUP") {
    return { teamScoresUpdates: [], teamSummaries: [], roomAccuracy: 1, rarityBonusPercent: 0 };
  }
  const question = await prisma.question.findUnique({ where: { id: questionId } });
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
  const rarityBonusPercent = roomAccuracy < 0.3 ? Math.round((0.3 - roomAccuracy) * 1.5 * 100) : 0;
  const teamCardsMap = roomQuestionTeamCards.get(qKey);
  const teamScoresUpdates = [];
  const teamSummaries = [];
  for (const team of room.teams) {
    const onlineMembers = team.players.filter((p) => !!p.socketId);
    const totalOnline = onlineMembers.length > 0 ? onlineMembers.length : team.players.length || 1;
    const teamAnswers = answers.filter((a) => a.teamId === team.id);
    const correctAnswers = teamAnswers.filter((a) => a.isCorrect === true);
    const correctTimes = correctAnswers.map((a) => a.timeSpent);
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
        ghostStat = { ghostStreak: 0, ghostTotalCorrect: 0, ghostTotalAnswered: 0, ghostRoundAllCorrect: false, currentRoundCorrect: 0 };
        roomGhosts.set(team.id, ghostStat);
      }
      if (teamAnswers.length > 0) {
        ghostStat.ghostTotalAnswered++;
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
    if (teamCardsMap) {
      for (const [, otherCards] of teamCardsMap) {
        if (otherCards.some((c) => c.type === "PENALTY" && c.targetTeamId === team.id)) {
          penaltyMultiplier = 2;
        }
      }
    }
    const effectiveTeamConfig = {
      ...room.config,
      timeBonusEnabled: room.mode === "CLASSIC" || room.mode === "ELIMINATION" || room.mode === "POWERUP" ? Boolean(room.config?.timeBonusEnabled !== false) : false
    };
    const { points: teamPoints, accuracyRatio, speedBonus, empiricalMultiplier } = computeTeamQuestionScore({
      basePoints: question.points,
      timeLimit: question.timeLimit,
      totalOnlineMembers: totalOnline,
      correctMembers: correctAnswers.length,
      correctTimes,
      config: effectiveTeamConfig,
      multiplier,
      shielded,
      penaltyMultiplier,
      roomAccuracy,
      streak: teamStreak
    });
    if (room.mode === "ELIMINATION" && team.isEliminated) {
      teamSummaries.push({
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color,
        totalOnlineMembers: totalOnline,
        correctMembers: correctAnswers.length,
        pointsAwarded: 0,
        speedBonus: 0,
        multiplier,
        activeCard: activeCards[0]?.type,
        empiricalMultiplier
      });
      continue;
    }
    const tRes = await applyScoreDeltaToTeam(team.id, teamPoints);
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
      empiricalMultiplier
    });
  }
  return { teamScoresUpdates, teamSummaries, roomAccuracy, rarityBonusPercent };
}
async function finalizeQuestionOnTimeUp(io2, roomId, roomCode, questionId) {
  stopQuestionTimer(roomId);
  const key = `${roomId}:timer`;
  roomRemainingTimes.set(key, 0);
  roomTimerEndsAt.delete(roomId);
  io2.to(`room:${roomCode}`).emit("game:timer", { remaining: 0, total: 30, endsAt: Date.now(), serverTime: Date.now() });
  io2.to(`room:${roomCode}`).emit("game:timer:expired", { questionId });
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return;
  const qKey = `${roomId}:${questionId}`;
  if (room.mode === "BOUNCEBACK") {
    const stealInfo = roomStealBuzzed.get(qKey);
    const primary = roomPrimaryTeams.get(qKey);
    const activeQ = roomActiveQuestions.get(roomId);
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
      if (activeQ) {
        activeQ.bouncebackAwaitingJudgment = "STEAL";
        activeQ.bouncebackStealAnswer = ansArr;
        activeQ.bouncebackAutoCorrect = isAutoCorrect;
        activeQ.bouncebackAnswerText = answerText;
        io2.to(`room:${roomCode}`).emit("game:question", activeQ);
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
      if (activeQ) {
        activeQ.bouncebackAwaitingJudgment = "PRIMARY";
        activeQ.bouncebackPrimaryAnswer = ansArr;
        activeQ.bouncebackAutoCorrect = isAutoCorrect;
        activeQ.bouncebackAnswerText = answerText;
        io2.to(`room:${roomCode}`).emit("game:question", activeQ);
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
  } else if (room.mode === "GRID_CARO" || room.mode === "WAGER") {
    const activeQ = roomActiveQuestions.get(roomId);
    if (activeQ) {
      activeQ.isExpired = true;
      activeQ.timerStarted = false;
    }
    io2.to(`room:${roomCode}`).emit("game:timer:expired", { questionId });
  } else if (room.mode === "DICE_RACE") {
    await finalizeDiceRaceQuestion(io2, roomId, roomCode, questionId);
  } else if (room.mode === "CLASSIC" || room.mode === "ELIMINATION" || room.mode === "POWERUP") {
    if (room.teamMode === "TEAM") {
      const { teamScoresUpdates } = await resolveQuestionTeamScores(io2, roomId, questionId);
      if (teamScoresUpdates.length > 0) {
        io2.to(`room:${roomCode}`).emit("game:score:update", teamScoresUpdates);
      }
    } else {
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
  roomTimerEndsAt.set(roomId, endsAt);
  roomRemainingTimes.set(key, timeLimit);
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
  if (room.mode === "DICE_RACE") {
    const diceState = roomDiceRaces.get(roomId);
    if (diceState) {
      return room.teams.slice().sort((a, b) => {
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
    return room.teams.sort((a, b) => b.score - a.score).map((t, i) => ({
      rank: i + 1,
      teamId: t.id,
      name: t.name,
      score: t.score,
      correctAnswers: room.answers.filter((a) => a.teamId === t.id && a.isCorrect).length,
      totalAnswers: room.answers.filter((a) => a.teamId === t.id).length
    }));
  } else {
    const validPlayers = room.players.filter((p) => !p.isHost && p.name !== "Host" && p.name !== "Admin Host");
    return validPlayers.sort((a, b) => b.score - a.score).map((p, i) => ({
      rank: i + 1,
      playerId: p.id,
      name: p.name,
      score: p.score,
      correctAnswers: room.answers.filter((a) => a.playerId === p.id && a.isCorrect).length,
      totalAnswers: room.answers.filter((a) => a.playerId === p.id).length
    }));
  }
}

// src/lib/room-cleanup.ts
async function cleanupStaleRooms(options = {}) {
  const {
    finishedMaxAgeHours = 2,
    sandboxMaxAgeHours = 1,
    lobbyMaxAgeHours = 6,
    playingMaxAgeHours = 12,
    emptyMaxAgeHours = 2,
    forceAllFinished = false
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
var dev = process.env.NODE_ENV !== "production";
var hostname = process.env.HOSTNAME || "0.0.0.0";
var port = parseInt(process.env.PORT ?? "3000", 10);
var app = (0, import_next.default)({ dev, hostname, port });
var handle = app.getRequestHandler();
app.prepare().then(() => {
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
