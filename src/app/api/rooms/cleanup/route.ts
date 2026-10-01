import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/security";
import { cleanupStaleRooms, getStaleRoomsStats } from "@/lib/room-cleanup";

export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: "Yêu cầu quyền Quản trị viên (Unauthorized)" }, { status: 401 });
  }

  try {
    const stats = await getStaleRoomsStats();
    return NextResponse.json({ success: true, stats });
  } catch (err) {
    console.error("[GET /api/rooms/cleanup]", err);
    return NextResponse.json({ error: "Lỗi kiểm tra phòng cũ" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: "Yêu cầu quyền Quản trị viên (Unauthorized)" }, { status: 401 });
  }

  try {
    let body = {};
    try {
      body = await req.json();
    } catch {}

    const result = await cleanupStaleRooms(body);
    return NextResponse.json({
      success: true,
      message: `Đã dọn dẹp thành công ${result.deletedCount} phòng cũ.`,
      ...result,
    });
  } catch (err) {
    console.error("[POST /api/rooms/cleanup]", err);
    return NextResponse.json({ error: "Lỗi dọn dẹp phòng cũ" }, { status: 500 });
  }
}
