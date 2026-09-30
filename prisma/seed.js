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

// prisma/seed.ts
var import_client = require("@prisma/client");
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var prisma = new import_client.PrismaClient();
async function main() {
  console.log("\u{1F331} B\u1EAFt \u0111\u1EA7u n\u1EA1p d\u1EEF li\u1EC7u c\xE2u h\u1ECFi m\u1EABu cho 8 m\xF4n h\u1ECDc...");
  const host = await prisma.user.upsert({
    where: { email: "demo-host@timeoutquiz.com" },
    update: {},
    create: {
      id: "demo-host-id",
      email: "demo-host@timeoutquiz.com",
      name: "Nguy\u1EC5n Gia Kh\xE1nh (Host)",
      role: "ADMIN"
    }
  });
  const manifestPath = import_path.default.join(__dirname, "../public/quiz-banks/index.json");
  const manifest = JSON.parse(import_fs.default.readFileSync(manifestPath, "utf-8"));
  for (const item of manifest) {
    console.log(`\u{1F4DA} \u0110ang t\u1EA1o b\u1ED9 c\xE2u h\u1ECFi: ${item.title}`);
    let bank = await prisma.quizBank.findFirst({
      where: { title: item.title, ownerId: host.id }
    });
    if (!bank) {
      bank = await prisma.quizBank.create({
        data: {
          title: item.title,
          description: `${item.description} (GV: ${item.lecturer})`,
          isPublic: true,
          ownerId: host.id
        }
      });
    }
    const questionsFile = import_path.default.join(__dirname, `../public${item.file}`);
    if (import_fs.default.existsSync(questionsFile)) {
      const questionsData = JSON.parse(import_fs.default.readFileSync(questionsFile, "utf-8"));
      await prisma.answer.deleteMany({
        where: { question: { quizBankId: bank.id } }
      });
      await prisma.question.deleteMany({
        where: { quizBankId: bank.id }
      });
      for (let i = 0; i < questionsData.length; i++) {
        const q = questionsData[i];
        await prisma.question.create({
          data: {
            quizBankId: bank.id,
            type: q.type,
            content: q.content,
            options: q.options || void 0,
            answer: q.answer || null,
            points: q.points || 10,
            timeLimit: q.timeLimit || 30,
            hint: q.hint || null,
            order: i + 1
          }
        });
      }
      console.log(`   \u2705 \u0110\xE3 n\u1EA1p m\u1EDBi ${questionsData.length} c\xE2u h\u1ECFi chu\u1EA9n h\xF3a cho ${item.code}`);
    }
  }
  console.log("\u{1F389} Ho\xE0n t\u1EA5t n\u1EA1p d\u1EEF li\u1EC7u m\u1EABu 8 m\xF4n h\u1ECDc th\xE0nh c\xF4ng!");
}
main().catch((e) => {
  console.error("\u274C L\u1ED7i seed d\u1EEF li\u1EC7u:", e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
