import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyHostOrAdmin, verifyAdminRequest } from "@/lib/security";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const room = await prisma.room.findUnique({
    where: { code },
    include: {
      teams: { include: { players: true, powerupCards: true } },
      players: true,
      powerupCards: { where: { ownerType: "SHARED" } },
      quizBank: { select: { title: true, id: true, _count: { select: { questions: true } } } },
    },
  });

  if (!room) {
    return NextResponse.json({ error: "Không tìm thấy phòng" }, { status: 404 });
  }

  // Never leak hostKey to public clients unless verified Host or Admin
  const isAuthorized = verifyHostOrAdmin(req, room.hostKey);
  const { hostKey, ...safeRoom } = room;

  return NextResponse.json({
    room: isAuthorized ? room : safeRoom,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const room = await prisma.room.findUnique({ where: { code } });
  if (!room) {
    return NextResponse.json({ error: "Không tìm thấy phòng" }, { status: 404 });
  }

  if (!verifyHostOrAdmin(req, room.hostKey)) {
    return NextResponse.json(
      { error: "Yêu cầu quyền Host hoặc Quản trị viên (Forbidden)" },
      { status: 403 }
    );
  }

  const body = await req.json();
  // Prevent overriding critical immutable fields
  const { id: _id, code: _c, hostKey: _hk, hostId: _hid, ...safeUpdates } = body;

  const updatedRoom = await prisma.room.update({
    where: { code },
    data: safeUpdates,
  });

  return NextResponse.json({ room: updatedRoom });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const room = await prisma.room.findUnique({ where: { code } });
  if (!room) {
    return NextResponse.json({ error: "Không tìm thấy phòng" }, { status: 404 });
  }

  if (!verifyHostOrAdmin(req, room.hostKey)) {
    return NextResponse.json(
      { error: "Yêu cầu quyền Host hoặc Quản trị viên (Forbidden)" },
      { status: 403 }
    );
  }

  // 1. Release in-memory timers and state structures
  const globalForSockets = globalThis as unknown as {
    cleanupRoomInMemory?: (roomId: string) => void;
  };
  globalForSockets.cleanupRoomInMemory?.(room.id);

  // 2. Cascade delete handled by Prisma schema
  await prisma.room.delete({ where: { code } });

  return NextResponse.json({ success: true, message: "Đã xóa phòng thành công" });
}
