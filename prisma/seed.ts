import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Bắt đầu nạp dữ liệu câu hỏi mẫu cho 8 môn học...");

  // 1. Tạo User Host mặc định nếu chưa có
  const host = await prisma.user.upsert({
    where: { email: "demo-host@timeoutquiz.com" },
    update: {},
    create: {
      id: "demo-host-id",
      email: "demo-host@timeoutquiz.com",
      name: "Nguyễn Gia Khánh (Host)",
      role: "ADMIN",
    },
  });

  const manifestPath = path.join(__dirname, "../public/quiz-banks/index.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

  for (const item of manifest) {
    console.log(`📚 Đang tạo bộ câu hỏi: ${item.title}`);
    
    // Tìm hoặc tạo QuizBank
    let bank = await prisma.quizBank.findFirst({
      where: { title: item.title, ownerId: host.id },
    });

    if (!bank) {
      bank = await prisma.quizBank.create({
        data: {
          title: item.title,
          description: `${item.description} (GV: ${item.lecturer})`,
          isPublic: true,
          ownerId: host.id,
        },
      });
    }

    // Đọc file câu hỏi
    const questionsFile = path.join(__dirname, `../public${item.file}`);
    if (fs.existsSync(questionsFile)) {
      const questionsData = JSON.parse(fs.readFileSync(questionsFile, "utf-8"));

      for (let i = 0; i < questionsData.length; i++) {
        const q = questionsData[i];
        
        // Kiểm tra xem câu hỏi đã tồn tại chưa
        const existing = await prisma.question.findFirst({
          where: { quizBankId: bank.id, content: q.content },
        });

        if (!existing) {
          await prisma.question.create({
            data: {
              quizBankId: bank.id,
              type: q.type,
              content: q.content,
              options: q.options || undefined,
              answer: q.answer || null,
              points: q.points || 10,
              timeLimit: q.timeLimit || 30,
              hint: q.hint || null,
              order: i + 1,
            },
          });
        }
      }
      console.log(`   ✅ Đã nạp ${questionsData.length} câu hỏi cho ${item.code}`);
    }
  }

  console.log("🎉 Hoàn tất nạp dữ liệu mẫu 8 môn học thành công!");
}

main()
  .catch((e) => {
    console.error("❌ Lỗi seed dữ liệu:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
