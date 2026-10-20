import { prisma } from "@/lib/prisma";
import { MAGIC_WHEEL_PRESET_BANKS } from "@/lib/offline-storage";

/**
 * Đảm bảo bộ đề tồn tại hợp lệ trong cơ sở dữ liệu Prisma trước khi liên kết với Room.
 * Nếu bankId là một bộ đề mẫu (Preset), tự động seed/upsert bản ghi QuizBank và Question
 * để tránh hoàn toàn lỗi Foreign Key Constraint Violation (403/500).
 */
export async function ensureQuizBankExists(bankId: string | null | undefined): Promise<string | null> {
  if (!bankId || typeof bankId !== "string") return null;
  const cleanId = bankId.trim();
  if (!cleanId) return null;

  try {
    const existing = await prisma.quizBank.findUnique({
      where: { id: cleanId },
      select: { id: true },
    });
    if (existing) return existing.id;

    // Tra cứu trong danh mục bộ đề mẫu cài sẵn
    const preset = MAGIC_WHEEL_PRESET_BANKS.find((p) => p.id === cleanId);
    if (preset) {
      let owner = await prisma.user.findFirst({
        where: { role: "ADMIN" },
        select: { id: true },
      });
      if (!owner) {
        owner = await prisma.user.findFirst({ select: { id: true } });
      }

      // Làm sạch tiêu đề và mô tả: loại bỏ các từ cụ thể thương hiệu/đài truyền hình
      const cleanTitle = preset.title
        .replace(/vtv3 huyền thoại/gi, "Văn Hóa & Lịch Sử")
        .replace(/vtv3/gi, "")
        .replace(/\s{2,}/g, " ")
        .trim();
      const cleanDesc = (preset.description || "")
        .replace(/vtv3/gi, "")
        .replace(/\s{2,}/g, " ")
        .trim();

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
          ownerId: owner?.id || "demo-host-id",
          questions: {
            create: (preset.questions || []).map((q: any, idx: number) => ({
              id: `${preset.id}_q${idx + 1}`,
              type: q.type || "WORD_PUZZLE",
              content: q.content || "",
              answer: q.answer || "",
              hint: q.hint || undefined,
              points: q.points || 10,
              timeLimit: q.timeLimit || 30,
              order: idx + 1,
              options: q.options || [],
            })),
          },
        },
      });
      return preset.id;
    }

    return cleanId;
  } catch (err) {
    console.warn(`[ensureQuizBankExists] Non-fatal seeding warning for bank ${cleanId}:`, err);
    return cleanId;
  }
}
