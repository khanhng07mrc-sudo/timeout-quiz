import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminRequest, sanitizeInput } from "@/lib/security";
import { normalizeToThreeLevels } from "@/lib/game-engine/scoring";
import { MAGIC_WHEEL_PRESET_BANKS } from "@/lib/offline-storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const questions = await prisma.question.findMany({
    where: { quizBankId: id },
    orderBy: { order: "asc" },
  });

  if (questions.length === 0) {
    const preset = MAGIC_WHEEL_PRESET_BANKS.find((p) => p.id === id);
    if (preset && preset.questions) {
      return NextResponse.json({ questions: preset.questions });
    }
  }

  return NextResponse.json({ questions });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: "Yêu cầu quyền Quản trị viên (Unauthorized)" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const normalizePoints = (pts: any): 10 | 20 | 30 | 40 => normalizeToThreeLevels(Number(pts) || 10);

  // Support bulk creation (import)
  if (Array.isArray(body)) {
    const created = await prisma.$transaction(
      body.map((q, i) =>
        prisma.question.create({
          data: {
            quizBankId: id,
            type: q.type,
            content: sanitizeInput(q.content, 2000),
            options: q.options ?? undefined,
            pairs: q.pairs ?? undefined,
            answer: q.answer ? sanitizeInput(q.answer, 500) : null,
            points: normalizePoints(q.points),
            timeLimit: Math.min(300, Math.max(5, Number(q.timeLimit) || 30)),
            mediaUrl: q.mediaUrl ? sanitizeInput(q.mediaUrl, 500) : null,
            mediaType: q.mediaType ?? null,
            hint: q.hint ? sanitizeInput(q.hint, 500) : null,
            order: q.order ?? i,
          },
        })
      )
    );
    return NextResponse.json({ questions: created }, { status: 201 });
  }

  // Single question
  const question = await prisma.question.create({
    data: {
      quizBankId: id,
      type: body.type,
      content: sanitizeInput(body.content, 2000),
      options: body.options ?? undefined,
      pairs: body.pairs ?? undefined,
      answer: body.answer ? sanitizeInput(body.answer, 500) : null,
      points: normalizePoints(body.points),
      timeLimit: Math.min(300, Math.max(5, Number(body.timeLimit) || 30)),
      mediaUrl: body.mediaUrl ? sanitizeInput(body.mediaUrl, 500) : null,
      mediaType: body.mediaType ?? null,
      hint: body.hint ? sanitizeInput(body.hint, 500) : null,
      order: body.order ?? 0,
    },
  });

  return NextResponse.json({ question }, { status: 201 });
}
