import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  const { questionId } = await params;
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ question });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  const { questionId } = await params;
  const body = await req.json();

  const question = await prisma.question.update({
    where: { id: questionId },
    data: {
      ...(body.type && { type: body.type }),
      ...(body.content && { content: body.content }),
      ...(body.options !== undefined && { options: body.options }),
      ...(body.answer !== undefined && { answer: body.answer }),
      ...(body.points !== undefined && { points: body.points }),
      ...(body.timeLimit !== undefined && { timeLimit: body.timeLimit }),
      ...(body.hint !== undefined && { hint: body.hint }),
      ...(body.order !== undefined && { order: body.order }),
    },
  });

  return NextResponse.json({ question });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  const { questionId } = await params;

  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.question.delete({ where: { id: questionId } });

  return NextResponse.json({ success: true });
}
