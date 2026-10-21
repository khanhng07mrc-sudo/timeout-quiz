import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyHostOrAdmin, verifyAdminRequest } from "@/lib/security";
import { ensureQuizBankExists } from "@/lib/quiz-bank-seeder";

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

  const isSandboxRoom =
    req.headers.get("x-sandbox") === "1" ||
    req.nextUrl.searchParams.get("sandbox") === "1" ||
    room.name?.startsWith("[Sandbox]") ||
    Boolean((room.config as any)?.isSandbox) ||
    room.code?.startsWith("sb_") ||
    code.startsWith("sb_");

  if (!isSandboxRoom && !verifyHostOrAdmin(req, room.hostKey)) {
    return NextResponse.json(
      { error: "Yêu cầu quyền Host hoặc Quản trị viên (Forbidden)" },
      { status: 403 }
    );
  }

  const body = await req.json();
  // Prevent overriding critical immutable fields and non-scalar payload fields
  const { id: _id, code: _c, hostKey: _hk, hostId: _hid, localBank, ...safeUpdates } = body;

  if (safeUpdates.quizBankId !== undefined) {
    if (safeUpdates.quizBankId) {
      const verifiedBankId = await ensureQuizBankExists(safeUpdates.quizBankId);
      if (verifiedBankId) {
        safeUpdates.quizBankId = verifiedBankId;
      } else {
        // Bộ đề không tồn tại trong DB (ví dụ đề Local chỉ lưu ở Client)
        // Đặt quizBankId = null để không vi phạm ràng buộc Foreign Key Room_quizBankId_fkey
        safeUpdates.quizBankId = null;
        if (localBank) {
          const currentConfig = (typeof room.config === "object" && room.config !== null) ? (room.config as any) : {};
          safeUpdates.config = {
            ...currentConfig,
            customQuestions: localBank.questions,
            customBankTitle: localBank.title,
            ...(body.config || {}),
          };
        }
      }
    } else {
      safeUpdates.quizBankId = null;
      if (localBank) {
        const currentConfig = (typeof room.config === "object" && room.config !== null) ? (room.config as any) : {};
        safeUpdates.config = {
          ...currentConfig,
          customQuestions: localBank.questions,
          customBankTitle: localBank.title,
          ...(body.config || {}),
        };
      }
    }
  } else if (localBank) {
    const currentConfig = (typeof room.config === "object" && room.config !== null) ? (room.config as any) : {};
    safeUpdates.config = {
      ...currentConfig,
      customQuestions: localBank.questions,
      customBankTitle: localBank.title,
      ...(body.config || {}),
    };
  }

  // Ensure safeUpdates only contains scalar fields recognized by prisma.room.update
  const allowedRoomFields = new Set([
    "name",
    "quizBankId",
    "mode",
    "teamMode",
    "status",
    "currentQuestion",
    "config",
    "inviteUrl",
  ]);
  const sanitizedData: Record<string, any> = {};
  for (const [key, value] of Object.entries(safeUpdates)) {
    if (allowedRoomFields.has(key)) {
      sanitizedData[key] = value;
    }
  }

  try {
    const updatedRoom = await prisma.room.update({
      where: { code },
      data: sanitizedData,
    });
    return NextResponse.json({ room: updatedRoom });
  } catch (dbErr: any) {
    console.error("[PATCH /api/rooms/[code]] Error updating room:", dbErr);
    // Phòng thủ kép (Defensive retry): Nếu vẫn gặp lỗi P2003 (Foreign key constraint violation)
    // tự động fallback về quizBankId = null để phòng thi luôn hoạt động trơn tru
    if (dbErr?.code === "P2003" && sanitizedData.quizBankId) {
      try {
        console.warn(`[PATCH /api/rooms/[code]] Retrying update with quizBankId: null after P2003`);
        const fallbackRoom = await prisma.room.update({
          where: { code },
          data: { ...sanitizedData, quizBankId: null },
        });
        return NextResponse.json({ room: fallbackRoom });
      } catch (retryErr) {
        console.error("[PATCH /api/rooms/[code]] Fallback retry failed:", retryErr);
      }
    }
    return NextResponse.json(
      { error: "Lỗi khi cập nhật bộ đề hoặc phòng: " + (dbErr?.message || "Lỗi không xác định") },
      { status: 500 }
    );
  }
}

export const PUT = PATCH;

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const room = await prisma.room.findUnique({ where: { code } });
  if (!room) {
    return NextResponse.json({ error: "Không tìm thấy phòng" }, { status: 404 });
  }

  const isSandboxRoom =
    req.headers.get("x-sandbox") === "1" ||
    req.nextUrl.searchParams.get("sandbox") === "1" ||
    room.name?.startsWith("[Sandbox]") ||
    Boolean((room.config as any)?.isSandbox) ||
    room.code?.startsWith("sb_") ||
    code.startsWith("sb_");

  if (!isSandboxRoom && !verifyHostOrAdmin(req, room.hostKey)) {
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
