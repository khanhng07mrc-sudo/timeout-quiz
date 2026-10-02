import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyAdminRequest,
  getCurrentUserFromRequest,
  sanitizeInput,
} from "@/lib/security";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const user = getCurrentUserFromRequest(req);
  const queryOwnerId = searchParams.get("ownerId");
  const effectiveOwnerId = user?.userId || queryOwnerId;

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

  return NextResponse.json({ banks });
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
        where: { email: user?.email || `${effectiveOwnerId}@brainclash.io` },
        update: {},
        create: {
          id: effectiveOwnerId,
          name: user?.name || "Quiz Creator",
          email: user?.email || `${effectiveOwnerId}@brainclash.io`,
          role: "ADMIN",
        },
      });
    }

    const cleanedTitle = sanitizeInput(title, 100);
    const cleanedDesc = description ? sanitizeInput(description, 300) : null;

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
