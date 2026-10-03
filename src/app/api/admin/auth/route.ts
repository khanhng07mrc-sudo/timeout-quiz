import { NextRequest, NextResponse } from "next/server";
import {
  getAdminMasterPassword,
  createAdminToken,
  createUserToken,
  comparePassword,
  verifyAdminRequest,
} from "@/lib/security";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password, email } = body;

    const masterPassword = getAdminMasterPassword();

    // 1. If email is provided, perform user password login
    if (email && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      const user = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      if (!user || !user.password) {
        return NextResponse.json(
          { error: "Email hoặc mật khẩu không chính xác" },
          { status: 401 }
        );
      }

      const isMatch = await comparePassword(password, user.password);
      if (!isMatch) {
        return NextResponse.json(
          { error: "Email hoặc mật khẩu không chính xác" },
          { status: 401 }
        );
      }

      const token = createUserToken(user);
      const response = NextResponse.json({
        success: true,
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        message: "Đăng nhập thành công",
      });

      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      };

      response.cookies.set("auth_token", token, cookieOptions);
      response.cookies.set("admin_token", token, cookieOptions);
      return response;
    }

    // 2. Master Passcode login
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
      user: {
        id: "master-admin",
        name: "Super Admin",
        email: "admin@quizora.io",
        role: "ADMIN",
      },
      message: "Xác thực Quản trị viên thành công",
    });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    };

    response.cookies.set("admin_token", token, cookieOptions);
    response.cookies.set("auth_token", token, cookieOptions);

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
  response.cookies.delete("auth_token");
  return response;
}

