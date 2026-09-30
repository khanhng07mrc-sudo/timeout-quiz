import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

  if (!bank) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ bank });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { title, description, isPublic } = body;

  const bank = await prisma.quizBank.update({
    where: { id },
    data: {
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(isPublic !== undefined && { isPublic }),
    },
  });

  return NextResponse.json({ bank });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const bank = await prisma.quizBank.findUnique({ where: { id } });
  if (!bank) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Cascade delete: questions and room associations via schema
  await prisma.quizBank.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
