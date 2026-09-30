import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  const body = await req.json();
  const { title, description, ownerId, isPublic } = body;

  if (!title || !ownerId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const bank = await prisma.quizBank.create({
    data: { title, description, ownerId, isPublic: isPublic ?? false },
  });

  return NextResponse.json({ bank }, { status: 201 });
}
