import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp, checkPinValidationLimit } from "@/lib/rate-limiter";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const ip = getClientIp(req);
  const rateLimit = checkPinValidationLimit(ip);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Thao tác quá nhanh. Vui lòng chờ ${rateLimit.retryAfterSeconds} giây trước khi thử lại.` },
      { status: 429, headers: { "Retry-After": rateLimit.retryAfterSeconds.toString() } }
    );
  }

  const { code } = await params;
  const room = await prisma.room.findUnique({
    where: { code },
    select: { id: true, name: true, status: true, mode: true, teamMode: true },
  });

  if (!room || room.status === "FINISHED") {
    return NextResponse.json({ error: "Phòng không tồn tại hoặc đã kết thúc" }, { status: 404 });
  }

  return NextResponse.json({ room });
}
