import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const questions = await prisma.question.findMany({
    where: { quizBankId: id },
    orderBy: { order: "asc" },
  });
  return NextResponse.json({ questions });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  // Support bulk creation (import)
  if (Array.isArray(body)) {
    const created = await prisma.$transaction(
      body.map((q, i) =>
        prisma.question.create({
          data: {
            quizBankId: id,
            type: q.type,
            content: q.content,
            options: q.options ?? undefined,
            answer: q.answer ?? null,
            points: q.points ?? 10,
            timeLimit: q.timeLimit ?? 30,
            mediaUrl: q.mediaUrl ?? null,
            mediaType: q.mediaType ?? null,
            hint: q.hint ?? null,
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
      content: body.content,
      options: body.options ?? undefined,
      answer: body.answer ?? null,
      points: body.points ?? 10,
      timeLimit: body.timeLimit ?? 30,
      mediaUrl: body.mediaUrl ?? null,
      mediaType: body.mediaType ?? null,
      hint: body.hint ?? null,
      order: body.order ?? 0,
    },
  });

  return NextResponse.json({ question }, { status: 201 });
}
