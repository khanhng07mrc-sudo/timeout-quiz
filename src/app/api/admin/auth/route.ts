import { NextRequest, NextResponse } from "next/server";
import { getAdminMasterPassword, createAdminToken, verifyAdminRequest } from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password } = body;

    const masterPassword = getAdminMasterPassword();

    if (!password || password !== masterPassword) {
      return NextResponse.json(
        { error: "Mật khẩu Quản trị (Admin Passcode) không chính xác" },
        { status: 401 }
      );
    }

    const token = createAdminToken();

    const response = NextResponse.json({
      success: true,
      token,
      message: "Xác thực Quản trị viên thành công",
    });

    // Set secure HTTP-only cookie for 24h
    response.cookies.set({
      name: "admin_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60,
    });

    return response;
  } catch (err) {
    console.error("[POST /api/admin/auth]", err);
    return NextResponse.json({ error: "Lỗi máy chủ nội bộ" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const authenticated = verifyAdminRequest(req);
  return NextResponse.json({ authenticated });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: "Đã đăng xuất phiên quản trị" });
  response.cookies.delete("admin_token");
  return response;
}
