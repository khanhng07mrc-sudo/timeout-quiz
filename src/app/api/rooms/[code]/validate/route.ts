import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const room = await prisma.room.findUnique({
    where: { code },
    select: { id: true, name: true, status: true, mode: true, teamMode: true },
  });

  if (!room || room.status === "FINISHED") {
    return NextResponse.json({ error: "Room not found or ended" }, { status: 404 });
  }

  return NextResponse.json({ room });
}
