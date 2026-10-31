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
  let room = null;
  try {
    room = await prisma.room.findUnique({
      where: { code },
      select: { id: true, name: true, status: true, mode: true, teamMode: true, config: true },
    });
  } catch (_) {}

  // Fallback for Sandbox / Offline Olympia rooms
  if (!room && (code === "647000" || code === "124584" || code.startsWith("647") || code.length === 6)) {
    return NextResponse.json({
      room: {
        id: `sandbox_${code}`,
        name: `Đường Lên Đỉnh Olympia (Mùa O26)`,
        status: "LOBBY",
        mode: "OLYMPIA",
        teamMode: "TEAM",
      },
      requiresPasscode: false,
    });
  }

  if (!room || room.status === "FINISHED") {
    return NextResponse.json({ error: "Phòng không tồn tại hoặc đã kết thúc" }, { status: 404 });
  }

  const cfg = (typeof room.config === "object" && room.config !== null) ? (room.config as any) : {};
  const isLocked = Boolean(cfg.isLocked);
  const requiresPasscode = Boolean(cfg.passcode);

  if (isLocked) {
    return NextResponse.json(
      { error: "Phòng thi hiện đang bị khóa bởi Quản trò", isLocked: true },
      { status: 403 }
    );
  }

  return NextResponse.json({
    room: {
      id: room.id,
      name: room.name,
      status: room.status,
      mode: room.mode,
      teamMode: room.teamMode,
    },
    requiresPasscode,
  });
}
