import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminRequest, sanitizeInput } from "@/lib/security";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ownerId = searchParams.get("ownerId");

  const banks = await prisma.quizBank.findMany({
    where: ownerId ? { OR: [{ ownerId }, { isPublic: true }] } : { isPublic: true },
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
    const body = await req.json();
    const { title, description, ownerId, isPublic } = body;

    if (!title || !ownerId) {
      return NextResponse.json({ error: "Vui lòng nhập tên bộ đề" }, { status: 400 });
    }

    const cleanedTitle = sanitizeInput(title, 100);
    const cleanedDesc = description ? sanitizeInput(description, 300) : null;

    const bank = await prisma.quizBank.create({
      data: {
        title: cleanedTitle,
        description: cleanedDesc,
        ownerId,
        isPublic: isPublic ?? false,
      },
    });

    return NextResponse.json({ bank }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/quiz-bank]", err);
    return NextResponse.json({ error: "Lỗi tạo bộ câu hỏi" }, { status: 500 });
  }
}
