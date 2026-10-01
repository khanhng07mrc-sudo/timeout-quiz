import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminRequest, sanitizeInput } from "@/lib/security";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const bank = await prisma.quizBank.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { order: "asc" } },
      _count: { select: { questions: true, rooms: true } },
    },
  });

  if (!bank) return NextResponse.json({ error: "Không tìm thấy bộ đề" }, { status: 404 });
  return NextResponse.json({ bank });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: "Yêu cầu quyền Quản trị viên (Unauthorized)" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { title, description, isPublic } = body;

  const bank = await prisma.quizBank.update({
    where: { id },
    data: {
      ...(title && { title: sanitizeInput(title, 100) }),
      ...(description !== undefined && { description: description ? sanitizeInput(description, 300) : null }),
      ...(isPublic !== undefined && { isPublic }),
    },
  });

  return NextResponse.json({ bank });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: "Yêu cầu quyền Quản trị viên (Unauthorized)" }, { status: 401 });
  }

  const { id } = await params;

  const bank = await prisma.quizBank.findUnique({ where: { id } });
  if (!bank) return NextResponse.json({ error: "Không tìm thấy bộ đề" }, { status: 404 });

  await prisma.quizBank.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
