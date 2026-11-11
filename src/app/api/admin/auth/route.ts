import { NextRequest, NextResponse } from "next/server";
import {
  isValidMasterPassword,
  createUserToken,
  comparePassword,
  verifyAdminRequest,
  getAuthCookieOptions,
  DEMO_HOST_IDS,
  DEMO_HOST_EMAILS,
} from "@/lib/security";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password, email } = body;
    const cookieOptions = getAuthCookieOptions(req);
    const isMaster = isValidMasterPassword(password);

    // 1. If email is provided, perform strict user authentication for THAT exact email
    if (email && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      let user = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      if (isMaster) {
        const displayName =
          user?.name ||
          (cleanEmail === "channelngktv@gmail.com"
            ? "Nguyễn Gia Khánh"
            : cleanEmail.split("@")[0] || "Quản trị viên");

        if (!user) {
          user = await prisma.user.create({
            data: { email: cleanEmail, name: displayName, role: "ADMIN", emailVerified: new Date() },
          });
        } else if (user.role !== "ADMIN") {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { role: "ADMIN" },
          });
        }

        const sessionUser = { id: user.id, name: user.name, email: cleanEmail, role: "ADMIN" as const };
        const token = createUserToken(sessionUser);
        const response = NextResponse.json({
          success: true,
          token,
          user: sessionUser,
          message: "Đăng nhập Quản trị viên thành công",
        });

        response.cookies.set("auth_token", token, cookieOptions);
        response.cookies.set("admin_token", token, cookieOptions);
        return response;
      }

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

      response.cookies.set("auth_token", token, cookieOptions);
      response.cookies.set("admin_token", token, cookieOptions);
      return response;
    }

    // 2. Master Passcode login (without explicit email -> primary real admin, never demo-host)
    if (!password || !isMaster) {
      return NextResponse.json(
        { error: "Mật khẩu Quản trị (Admin Passcode) không chính xác" },
        { status: 401 }
      );
    }

    let primaryAdmin = null;
    try {
      primaryAdmin = await prisma.user.findFirst({
        where: {
          role: "ADMIN",
          id: { notIn: DEMO_HOST_IDS },
          email: { notIn: DEMO_HOST_EMAILS },
        },
        orderBy: { createdAt: "asc" },
      });
    } catch {}

    const resolvedAdmin = primaryAdmin
      ? {
          id: primaryAdmin.id,
          name: primaryAdmin.name,
          email: primaryAdmin.email,
          role: "ADMIN" as const,
        }
      : {
          id: "master-admin",
          name: "Nguyễn Gia Khánh",
          email: "channelngktv@gmail.com",
          role: "ADMIN" as const,
        };

    const token = createUserToken(resolvedAdmin);

    const response = NextResponse.json({
      success: true,
      token,
      user: resolvedAdmin,
      message: "Xác thực Quản trị viên thành công",
    });

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

export async function DELETE(req: NextRequest) {
  const response = NextResponse.json({ success: true, message: "Đã đăng xuất phiên quản trị" });
  const expiredOpts = { ...getAuthCookieOptions(req), maxAge: 0 };
  response.cookies.set("admin_token", "", expiredOpts);
  response.cookies.set("auth_token", "", expiredOpts);
  response.cookies.delete("admin_token");
  response.cookies.delete("auth_token");
  return response;
}

