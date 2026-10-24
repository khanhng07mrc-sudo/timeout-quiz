import { prisma } from "@/lib/prisma";
import { MAGIC_WHEEL_PRESET_BANKS, DEFAULT_OFFLINE_BANK } from "@/lib/offline-storage";

/**
 * Đảm bảo bộ đề tồn tại hợp lệ trong cơ sở dữ liệu Prisma trước khi liên kết với Room.
 * Nếu bankId là một bộ đề mẫu (Preset), tự động seed/upsert bản ghi QuizBank và Question
 * với System User đảm bảo để tránh hoàn toàn lỗi Foreign Key Constraint Violation (Room_quizBankId_fkey).
 * 
 * Nếu bankId không tồn tại trong DB và không phải Preset, hàm trả về null một cách an toàn
 * để caller không bao giờ ghi ID rác vào trường quizBankId của Room.
 */
// In-memory cache for verified/seeded quiz bank IDs to eliminate redundant WAN queries
const verifiedBankIds = new Set<string>();

export async function ensureQuizBankExists(bankId: string | null | undefined): Promise<string | null> {
  if (!bankId || typeof bankId !== "string") return null;
  const cleanId = bankId.trim();
  if (!cleanId) return null;
  if (verifiedBankIds.has(cleanId)) return cleanId;

  try {
    const existing = await prisma.quizBank.findUnique({
      where: { id: cleanId },
      include: { questions: { select: { id: true }, take: 1 } },
    });

    // Danh sách toàn bộ các bộ đề mẫu cài sẵn hệ thống (Magic Wheel + Đề Đa Chế Độ)
    const allPresets = [DEFAULT_OFFLINE_BANK, ...MAGIC_WHEEL_PRESET_BANKS];
    const preset = allPresets.find((p) => p.id === cleanId);

    if (existing) {
      // Nếu bank đã có câu hỏi, hoặc không phải là preset -> ID hợp lệ
      if (existing.questions && existing.questions.length > 0) {
        verifiedBankIds.add(existing.id);
        return existing.id;
      }
      if (!preset) {
        verifiedBankIds.add(existing.id);
        return existing.id;
      }
      // Nếu là preset nhưng rỗng câu hỏi trong DB -> xóa để re-seed đầy đủ bên dưới!
      await prisma.quizBank.delete({ where: { id: cleanId } }).catch(() => null);
    }
    if (preset) {
      // Tìm hoặc tạo User System để làm chủ sở hữu bộ đề preset (tránh vi phạm FK QuizBank_ownerId_fkey)
      let owner = await prisma.user.findFirst({
        where: { role: "ADMIN" },
        select: { id: true },
      });
      if (!owner) {
        owner = await prisma.user.findFirst({ select: { id: true } });
      }
      if (!owner) {
        owner = await prisma.user.upsert({
          where: { email: "system@quizorra.com" },
          update: {},
          create: {
            id: "system-preset-owner",
            email: "system@quizorra.com",
            name: "Hệ Thống (System Admin)",
            role: "ADMIN",
          },
          select: { id: true },
        });
      }

      // Làm sạch tiêu đề và mô tả
      const cleanTitle = (preset.title || cleanId)
        .replace(/chiếc nón kỳ diệu/gi, "Vòng Quay Trí Tuệ")
        .replace(/vtv3 huyền thoại/gi, "Văn Hóa & Lịch Sử")
        .replace(/vtv3/gi, "")
        .replace(/\s{2,}/g, " ")
        .trim();
      const cleanDesc = (preset.description || "")
        .replace(/chiếc nón kỳ diệu/gi, "Vòng Quay Trí Tuệ")
        .replace(/vtv3/gi, "")
        .replace(/\s{2,}/g, " ")
        .trim();

      // Upsert bản ghi QuizBank với ID cố định (Zero-bloat, không bao giờ trùng lặp)
      await prisma.quizBank.upsert({
        where: { id: preset.id },
        update: {
          title: cleanTitle,
          description: cleanDesc,
          isPublic: true,
        },
        create: {
          id: preset.id,
          title: cleanTitle,
          description: cleanDesc,
          isPublic: true,
          ownerId: owner.id,
        },
      });

      // Kiểm tra câu hỏi của bộ đề mẫu
      const questionCount = await prisma.question.count({
        where: { quizBankId: preset.id },
      });

      if (questionCount === 0 && preset.questions && preset.questions.length > 0) {
        await prisma.question.createMany({
          data: preset.questions.map((q: any, idx: number) => ({
            id: `${preset.id}_q${idx + 1}`,
            quizBankId: preset.id,
            type: q.type || (preset.id.includes("_mw_") ? "WORD_PUZZLE" : "MC_SINGLE"),
            content: q.content || "",
            answer: q.answer || "",
            hint: q.hint || null,
            points: q.points || 10,
            timeLimit: q.timeLimit || 30,
            order: idx + 1,
            options: q.options || [],
          })),
          skipDuplicates: true,
        });
      }

      // Xác thực lại bản ghi đã tồn tại trong DB trước khi trả về
      const verified = await prisma.quizBank.findUnique({
        where: { id: preset.id },
        select: { id: true },
      });
      if (verified) verifiedBankIds.add(verified.id);
      return verified ? verified.id : null;
    }

    // Không phải preset và không tìm thấy trong DB -> trả về null an toàn
    return null;
  } catch (err) {
    console.error(`[ensureQuizBankExists] Error seeding preset bank ${cleanId}:`, err);
    return null;
  }
}
