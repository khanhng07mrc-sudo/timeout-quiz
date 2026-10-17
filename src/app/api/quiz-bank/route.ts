import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyAdminRequest,
  getCurrentUserFromRequest,
  sanitizeInput,
} from "@/lib/security";
import { MAGIC_WHEEL_PRESET_BANKS } from "@/lib/offline-storage";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const user = getCurrentUserFromRequest(req);
  const queryOwnerId = searchParams.get("ownerId");
  const effectiveOwnerId = user?.userId || queryOwnerId;

  // Dọn dẹp tự động các bộ đề rác 0 câu hỏi bị tạo trùng lặp do lỗi sync cũ
  try {
    const allBanksWithCounts = await prisma.quizBank.findMany({
      include: { _count: { select: { questions: true } } },
    });
    const titleToNonEmpty = new Map<string, string>();
    for (const b of allBanksWithCounts) {
      if ((b._count?.questions ?? 0) > 0) {
        titleToNonEmpty.set(b.title.trim().toLowerCase(), b.id);
      }
    }
    const ghostBankIdsToDelete: string[] = [];
    const seenEmptyTitles = new Set<string>();

    for (const b of allBanksWithCounts) {
      const qCount = b._count?.questions ?? 0;
      if (qCount === 0) {
        const normTitle = b.title.trim().toLowerCase();
        if (titleToNonEmpty.has(normTitle) && titleToNonEmpty.get(normTitle) !== b.id) {
          ghostBankIdsToDelete.push(b.id);
        } else if (seenEmptyTitles.has(normTitle)) {
          ghostBankIdsToDelete.push(b.id);
        } else {
          seenEmptyTitles.add(normTitle);
        }
      }
    }

    if (ghostBankIdsToDelete.length > 0) {
      await prisma.quizBank.deleteMany({
        where: { id: { in: ghostBankIdsToDelete } },
      });
    }
  } catch (cleanErr) {
    console.warn("[GET /api/quiz-bank] Ghost cleanup error:", cleanErr);
  }

  // Auto-seed preset banks into database for demo-host-id / public if missing
  try {
    const existingPresetCount = await prisma.quizBank.count({
      where: { id: { in: MAGIC_WHEEL_PRESET_BANKS.map((p) => p.id) } },
    });
    if (existingPresetCount < MAGIC_WHEEL_PRESET_BANKS.length) {
      await prisma.user.upsert({
        where: { email: "demo-host@quizorra.com" },
        update: {},
        create: {
          id: "demo-host-id",
          name: "Hệ thống Quizorra",
          email: "demo-host@quizorra.com",
          role: "ADMIN",
        },
      });

      for (const preset of MAGIC_WHEEL_PRESET_BANKS) {
        const found = await prisma.quizBank.findUnique({ where: { id: preset.id } });
        if (!found) {
          await prisma.quizBank.create({
            data: {
              id: preset.id,
              title: preset.title,
              description: preset.description,
              isPublic: true,
              ownerId: "demo-host-id",
              questions: {
                create: (preset.questions || []).map((q: any, i: number) => ({
                  id: q.id,
                  type: q.type || "WORD_PUZZLE",
                  content: q.content,
                  answer: q.answer,
                  hint: q.hint,
                  points: q.points || 20,
                  timeLimit: q.timeLimit || 30,
                  options: q.options,
                  order: i,
                })),
              },
            },
          });
        }
      }
    }
  } catch (seedErr) {
    console.warn("[GET /api/quiz-bank] Auto-seed presets warning:", seedErr);
  }

  const banks = await prisma.quizBank.findMany({
    where: effectiveOwnerId
      ? {
          OR: [
            { ownerId: effectiveOwnerId },
            { isPublic: true },
            { ownerId: "demo-host-id" },
          ],
        }
      : {
          OR: [{ isPublic: true }, { ownerId: "demo-host-id" }],
        },
    include: { _count: { select: { questions: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Ensure all MAGIC_WHEEL_PRESET_BANKS are guaranteed to be present even before DB sync
  const existingIds = new Set(banks.map((b) => b.id));
  const missingPresets = MAGIC_WHEEL_PRESET_BANKS.filter((p) => !existingIds.has(p.id)).map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    isPublic: true,
    ownerId: "demo-host-id",
    createdAt: p.createdAt || new Date().toISOString(),
    isBuiltIn: true,
    _count: { questions: p.questions?.length || 4 },
  }));

  const finalBanks = [
    ...missingPresets,
    ...banks.map((b) => ({
      ...b,
      isBuiltIn: b.id.startsWith("bank_mw_preset") || b.ownerId === "demo-host-id",
    })),
  ];

  return NextResponse.json({ banks: finalBanks });
}

export async function POST(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: "Yêu cầu quyền Quản trị viên (Unauthorized)" }, { status: 401 });
  }

  try {
    const user = getCurrentUserFromRequest(req);
    const body = await req.json();
    const { title, description, isPublic } = body;
    const effectiveOwnerId = user?.userId || body.ownerId || "demo-host-id";

    if (!title) {
      return NextResponse.json({ error: "Vui lòng nhập tên bộ đề" }, { status: 400 });
    }

    // Ensure owner user exists in database to satisfy foreign key
    const existingOwner = await prisma.user.findUnique({ where: { id: effectiveOwnerId } });
    if (!existingOwner) {
      await prisma.user.upsert({
        where: { email: user?.email || `${effectiveOwnerId}@quizorra.com` },
        update: {},
        create: {
          id: effectiveOwnerId,
          name: user?.name || "Quiz Creator",
          email: user?.email || `${effectiveOwnerId}@quizorra.com`,
          role: "ADMIN",
        },
      });
    }

    const cleanedTitle = sanitizeInput(title, 100);
    const cleanedDesc = description ? sanitizeInput(description, 300) : null;

    // Tránh tạo trùng lặp nếu đã có bộ đề cùng tên của cùng owner
    const existingSameTitle = await prisma.quizBank.findFirst({
      where: {
        title: cleanedTitle,
        ownerId: effectiveOwnerId,
      },
      include: { _count: { select: { questions: true } } },
    });
    if (existingSameTitle) {
      return NextResponse.json({ bank: existingSameTitle }, { status: 200 });
    }

    const bank = await prisma.quizBank.create({
      data: {
        title: cleanedTitle,
        description: cleanedDesc,
        ownerId: effectiveOwnerId,
        isPublic: isPublic ?? true,
      },
    });

    return NextResponse.json({ bank }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/quiz-bank]", err);
    return NextResponse.json({ error: "Lỗi tạo bộ câu hỏi" }, { status: 500 });
  }
}
