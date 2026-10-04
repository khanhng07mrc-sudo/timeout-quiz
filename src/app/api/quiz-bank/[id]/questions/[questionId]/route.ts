import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminRequest, sanitizeInput } from "@/lib/security";
import { normalizeToThreeLevels } from "@/lib/game-engine/scoring";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  const { questionId } = await params;
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question) return NextResponse.json({ error: "Không tìm thấy câu hỏi" }, { status: 404 });
  return NextResponse.json({ question });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: "Yêu cầu quyền Quản trị viên (Unauthorized)" }, { status: 401 });
  }

  const { questionId } = await params;
  const body = await req.json();

  const question = await prisma.question.update({
    where: { id: questionId },
    data: {
      ...(body.type && { type: body.type }),
      ...(body.content && { content: sanitizeInput(body.content, 2000) }),
      ...(body.options !== undefined && { options: body.options }),
      ...(body.answer !== undefined && { answer: body.answer ? sanitizeInput(body.answer, 500) : null }),
      ...(body.points !== undefined && { points: normalizeToThreeLevels(Number(body.points) || 10) }),
      ...(body.timeLimit !== undefined && { timeLimit: Math.min(300, Math.max(5, Number(body.timeLimit) || 30)) }),
      ...(body.hint !== undefined && { hint: body.hint ? sanitizeInput(body.hint, 500) : null }),
      ...(body.order !== undefined && { order: body.order }),
    },
  });

  return NextResponse.json({ question });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: "Yêu cầu quyền Quản trị viên (Unauthorized)" }, { status: 401 });
  }

  const { questionId } = await params;

  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question) return NextResponse.json({ error: "Không tìm thấy câu hỏi" }, { status: 404 });

  await prisma.question.delete({ where: { id: questionId } });

  return NextResponse.json({ success: true });
}
